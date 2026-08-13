import CryptoKit
import Darwin
import Foundation
import LocalAuthentication
import OpenDirectory
import Security
import SystemConfiguration

public enum IntegratedAuthenticationCapability: String, Sendable {
    case available = "AVAILABLE_REPOSITORY_LOCAL_NO_INSTALL"
    case noInteractiveLoginSession = "NO_INTERACTIVE_LOGIN_SESSION"
    case effectiveActorMismatch = "EFFECTIVE_ACTOR_MISMATCH"
    case authenticationUnavailable = "FRESH_AUTHENTICATION_UNAVAILABLE"
    case localDirectoryUnavailable = "LOCAL_DIRECTORY_GENERATEDUID_UNAVAILABLE"
}

public enum IntegratedAuthenticationResult: Sendable {
    case authenticated(actorReferenceDigest: String, authenticationReferenceDigest: String)
    case cancelled
    case rejected
    case malformed
    case timedOut
}

public enum IntegratedAuthenticationFailureFixture: Sendable {
    case userCancelled
    case authenticationFailed
    case malformedResult
}

public struct IntegratedAuthenticationPreflight: Sendable {
    public let capability: IntegratedAuthenticationCapability
    public let mechanismRevision: String
    public let nativeInstallRequired: Bool
    public let rootHelperRequired: Bool
    public let sudoRequired: Bool
    public let launchdMutationRequired: Bool
    public let productionSigningCredentialRequired: Bool
    public let keychainExtractionRequired: Bool
}

public enum NativeIntegratedAuthentication {
    public static let mechanismRevision =
        NativeActorProvenanceSource.authenticationMechanismRevision
    public static let companionSchema = "farmos.day150-c2b-fresh-auth-companion.v1"
    public static let companionOperation = "FRESH_DEVICE_OWNER_AUTHENTICATION"
    public static let companionPurpose = "DAY150_C2B_DISPOSABLE_BOOTSTRAP_REHEARSAL"
    public static let companionExecutable =
        "/private/tmp/FarmOS Fresh Authentication Probe.app/Contents/MacOS/farmos-c2b-fresh-auth-probe"
    public static let qualificationProcessLifetimeSeconds: TimeInterval = 600
    public static let foregroundReadyMarker = "AUTH_APP_FOREGROUND_CONFIRMED"
    public static let evaluationStartMarker = "START_BOUND_AUTH_EVALUATION"
    public static let companionBundleIdentifier = "local.farmos.day150.c2b.fresh-auth-probe"
    public static let signedArtifactSchema =
        "farmos.day150-c2b-final-signed-qualification-artifact.v1"
    public static let signedArtifactDigestDomain = signedArtifactSchema + ":identity"

    private final class BoundedReadState: @unchecked Sendable {
        private let lock = NSLock()
        private var result: Data?
        private var completed = false

        func complete(with data: Data) -> Bool {
            lock.lock()
            defer { lock.unlock() }
            guard !completed else { return false }
            completed = true
            result = data
            return true
        }

        func snapshot() -> Data? {
            lock.lock()
            defer { lock.unlock() }
            return result
        }
    }

    public struct FinalSignedCompanionIdentity: Equatable, Sendable {
        public let executableSHA256: String
        public let infoPlistSHA256: String
        public let bundleIdentifier: String
        public let signingClassification: String
        public let executableOwner: UInt32
        public let executableMode: UInt16
        public let artifactReferenceDigest: String
    }

    private struct VerifiedFinalCompanion {
        let object: ExecutableObjectIdentity
        let finalIdentity: FinalSignedCompanionIdentity
    }

    public struct ExecutableObjectIdentity: Equatable, Sendable {
        public let device: UInt64
        public let inode: UInt64
        public let owner: UInt32
        public let group: UInt32
        public let mode: UInt16
        public let linkCount: UInt16
        public let size: Int64
        public let modifiedSeconds: Int64
        public let modifiedNanoseconds: Int64
        public let changedSeconds: Int64
        public let changedNanoseconds: Int64
        public let artifactDigest: String

        public init(
            device: UInt64, inode: UInt64, owner: UInt32, group: UInt32,
            mode: UInt16, linkCount: UInt16, size: Int64,
            modifiedSeconds: Int64, modifiedNanoseconds: Int64,
            changedSeconds: Int64, changedNanoseconds: Int64, artifactDigest: String
        ) {
            self.device = device; self.inode = inode; self.owner = owner; self.group = group
            self.mode = mode; self.linkCount = linkCount; self.size = size
            self.modifiedSeconds = modifiedSeconds
            self.modifiedNanoseconds = modifiedNanoseconds
            self.changedSeconds = changedSeconds; self.changedNanoseconds = changedNanoseconds
            self.artifactDigest = artifactDigest
        }
    }

    public static func preflight() -> IntegratedAuthenticationPreflight {
        let capability = preflightCapability()
        return IntegratedAuthenticationPreflight(
            capability: capability,
            mechanismRevision: mechanismRevision,
            nativeInstallRequired: false,
            rootHelperRequired: false,
            sudoRequired: false,
            launchdMutationRequired: false,
            productionSigningCredentialRequired: false,
            keychainExtractionRequired: false
        )
    }

    public static func authenticate(
        installationProfileDigest: String,
        challengeReferenceDigest: String,
        ceremonySessionReferenceDigest: String,
        expectedFinalSignedArtifactReferenceDigest: String,
        evaluationStart: () -> TimeInterval?
    ) async -> IntegratedAuthenticationResult {
        guard preflightCapability() == .available,
              FarmOSCanonicalDigest.isDigest(installationProfileDigest),
              FarmOSCanonicalDigest.isDigest(challengeReferenceDigest),
              FarmOSCanonicalDigest.isDigest(ceremonySessionReferenceDigest),
              FarmOSCanonicalDigest.isDigest(expectedFinalSignedArtifactReferenceDigest)
        else { return .malformed }

        guard let verified = verifiedFinalCompanion(),
              verified.finalIdentity.artifactReferenceDigest ==
                expectedFinalSignedArtifactReferenceDigest
        else { return .rejected }
        let artifact = verified.finalIdentity.artifactReferenceDigest
        var request: [String: Any] = [
            "schema_revision": companionSchema,
            "operation": companionOperation,
            "mechanism_revision": mechanismRevision,
            "purpose": companionPurpose,
            "installation_profile_digest": installationProfileDigest,
            "ceremony_session_reference_digest": ceremonySessionReferenceDigest,
            "challenge_reference_digest": challengeReferenceDigest,
            "companion_artifact_reference_digest": artifact,
        ]
        guard let requestCanonical = try? FarmOSCanonicalDigest.canonicalJSON(request) else {
            return .malformed
        }
        let requestReference = FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-c2b-fresh-auth-request.v1", canonicalValue: requestCanonical
        )
        request["request_reference_digest"] = requestReference
        guard let requestBytes = try? JSONSerialization.data(withJSONObject: request),
              requestBytes.count <= 4_096 else { return .malformed }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: companionExecutable)
        process.arguments = ["--integrated-auth"]
        let input = Pipe()
        let output = Pipe()
        process.standardInput = input
        process.standardOutput = output
        process.standardError = FileHandle.nullDevice
        let completion = DispatchSemaphore(value: 0)
        process.terminationHandler = { _ in completion.signal() }
        var processLifetimeStart: TimeInterval?
        do {
            try process.run()
            processLifetimeStart = ProcessInfo.processInfo.systemUptime
            guard mappedExecutableIdentity(
                pid: process.processIdentifier, artifact: verified.object.artifactDigest
            ) == verified.object else {
                _ = terminateBoundedly(process, completion: completion)
                return .rejected
            }
            var framedRequest = requestBytes
            framedRequest.append(UInt8(ascii: "\n"))
            try input.fileHandleForWriting.write(contentsOf: framedRequest)
        } catch {
            _ = terminateBoundedly(process, completion: completion)
            return .rejected
        }
        guard let processLifetimeStart,
              let foreground = readAvailableDataBoundedly(
                output.fileHandleForReading,
                timeout: remainingProcessLifetime(since: processLifetimeStart)
              )
        else {
            _ = terminateBoundedly(process, completion: completion)
            return .timedOut
        }
        guard String(data: foreground, encoding: .utf8) == foregroundReadyMarker + "\n",
              let authorityWait = evaluationStart(), authorityWait > 0,
              authorityWait <= PostGen0InteractiveAuthTimingPolicy.evaluationMaximumSeconds
        else {
            _ = terminateBoundedly(process, completion: completion)
            return .rejected
        }
        let startBinding = FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-c2b-auth-evaluation-start.v1",
            canonicalValue: requestReference
        )
        do {
            try input.fileHandleForWriting.write(contentsOf:
                Data("\(evaluationStartMarker) \(startBinding)\n".utf8))
            try input.fileHandleForWriting.close()
        } catch {
            _ = terminateBoundedly(process, completion: completion)
            return .rejected
        }
        let boundedWait = min(authorityWait, remainingProcessLifetime(since: processLifetimeStart))
        guard boundedWait > 0 else {
            _ = terminateBoundedly(process, completion: completion)
            return .timedOut
        }
        guard waitForCompletion(completion, timeout: boundedWait)
        else {
            _ = terminateBoundedly(process, completion: completion)
            return .timedOut
        }
        let bytes = output.fileHandleForReading.readDataToEndOfFile()
        guard bytes.count <= 4_096, bytes.first == UInt8(ascii: "{"), bytes.last == UInt8(ascii: "}"),
              let response = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
              Set(response.keys) == Set([
                "schema_revision", "operation", "mechanism_revision", "status",
                "request_reference_digest", "ceremony_session_reference_digest",
                "challenge_reference_digest", "actor_reference_digest",
                "authentication_reference_digest", "result_reference_digest",
              ]),
              response["schema_revision"] as? String == companionSchema,
              response["operation"] as? String == companionOperation,
              response["mechanism_revision"] as? String == mechanismRevision,
              response["status"] as? String == "AUTH_SUCCEEDED_BOUND",
              response["request_reference_digest"] as? String == requestReference,
              response["ceremony_session_reference_digest"] as? String ==
                ceremonySessionReferenceDigest,
              response["challenge_reference_digest"] as? String == challengeReferenceDigest,
              let actor = response["actor_reference_digest"] as? String,
              let authentication = response["authentication_reference_digest"] as? String,
              let result = response["result_reference_digest"] as? String,
              FarmOSCanonicalDigest.isDigest(actor), FarmOSCanonicalDigest.isDigest(authentication),
              FarmOSCanonicalDigest.isDigest(result), process.terminationStatus == 0
        else {
            if let response = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
               response["status"] as? String == "AUTH_CANCELLED" { return .cancelled }
            return .rejected
        }
        var resultBody = response
        resultBody.removeValue(forKey: "result_reference_digest")
        guard let resultCanonical = try? FarmOSCanonicalDigest.canonicalJSON(resultBody),
              result == FarmOSCanonicalDigest.sha256(
                domain: "farmos.day150-c2b-fresh-auth-result.v1",
                canonicalValue: resultCanonical
              ),
              currentActorReference(
                installationProfileDigest: installationProfileDigest,
                authenticationReferenceDigest: authentication
              ) == actor
        else { return .rejected }
        return .authenticated(
            actorReferenceDigest: actor,
            authenticationReferenceDigest: authentication
        )
    }

    public static func companionRequestIsValid(_ requestBytes: Data) -> Bool {
        guard requestBytes.count <= 4_096,
              requestBytes.first == UInt8(ascii: "{"), requestBytes.last == UInt8(ascii: "}"),
              let request = try? JSONSerialization.jsonObject(with: requestBytes) as? [String: Any],
              Set(request.keys) == Set([
                "schema_revision", "operation", "mechanism_revision", "purpose",
                "installation_profile_digest", "ceremony_session_reference_digest",
                "challenge_reference_digest", "companion_artifact_reference_digest",
                "request_reference_digest",
              ]),
              request["schema_revision"] as? String == companionSchema,
              request["operation"] as? String == companionOperation,
              request["mechanism_revision"] as? String == mechanismRevision,
              request["purpose"] as? String == companionPurpose,
              let artifact = request["companion_artifact_reference_digest"] as? String,
              FarmOSCanonicalDigest.isDigest(artifact),
              let requestReference = request["request_reference_digest"] as? String
        else { return false }
        var body = request
        body.removeValue(forKey: "request_reference_digest")
        guard let canonical = try? FarmOSCanonicalDigest.canonicalJSON(body) else { return false }
        return requestReference == FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-c2b-fresh-auth-request.v1", canonicalValue: canonical
        )
    }

    public static func companionRequestMatchesCurrentSignedArtifact(_ requestBytes: Data) -> Bool {
        guard companionRequestIsValid(requestBytes),
              let request = try? JSONSerialization.jsonObject(with: requestBytes) as? [String: Any],
              let requested = request["companion_artifact_reference_digest"] as? String,
              let verified = verifiedFinalCompanion(),
              mappedExecutableIdentity(
                pid: getpid(), artifact: verified.object.artifactDigest
              ) == verified.object
        else { return false }
        return requested == verified.finalIdentity.artifactReferenceDigest
    }

    public static func finalizedCompanionIdentity() -> FinalSignedCompanionIdentity? {
        verifiedFinalCompanion()?.finalIdentity
    }

    public static func currentProcessSignedArtifactAgrees(expected: String) -> Bool {
        guard FarmOSCanonicalDigest.isDigest(expected),
              let verified = verifiedFinalCompanion(),
              mappedExecutableIdentity(
                pid: getpid(), artifact: verified.object.artifactDigest
              ) == verified.object
        else { return false }
        return verified.finalIdentity.artifactReferenceDigest == expected
    }

    private static func currentActorReference(
        installationProfileDigest: String,
        authenticationReferenceDigest: String
    ) -> String? {
        guard preflightCapability() == .available,
              let generatedUID = transientGeneratedUIDForEffectiveLoginActor()
        else { return nil }
        let candidate = ActorAuthenticationResultCandidate(
            mechanismRevision: mechanismRevision,
            authorizationResultReferenceDigest: authenticationReferenceDigest,
            interactive: true,
            acceptedByNativeBoundary: true
        )
        guard case let .structurallyValidReferenceCandidate(actor) =
            NativeActorProvenanceSource.deriveReferenceCandidate(
                authentication: candidate,
                generatedUIDTransient: generatedUID,
                installationProfileDigest: installationProfileDigest
            )
        else { return nil }
        return actor
    }

    public static func executableIdentityMatches(
        verified: ExecutableObjectIdentity, mapped: ExecutableObjectIdentity
    ) -> Bool { verified == mapped }

    public static func companionArtifactIsPinned(
        verified: ExecutableObjectIdentity, expectedDigest: String
    ) -> Bool {
        FarmOSCanonicalDigest.isDigest(expectedDigest) &&
            verified.artifactDigest == expectedDigest
    }

    public static func finalArtifactAgreement(
        expected: String, parent: String, companion: String
    ) -> Bool {
        FarmOSCanonicalDigest.isDigest(expected) && expected == parent && parent == companion
    }

    private static func verifiedFinalCompanion() -> VerifiedFinalCompanion? {
        let root = open("/private/tmp", O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC)
        guard root >= 0 else { return nil }
        defer { close(root) }
        var rootMetadata = stat()
        var rootFilesystem = statfs()
        guard fstat(root, &rootMetadata) == 0, fstatfs(root, &rootFilesystem) == 0,
              (rootFilesystem.f_flags & UInt32(MNT_LOCAL)) != 0
        else { return nil }
        let expectedDevice = rootMetadata.st_dev
        var current = root
        var owned: [Int32] = []
        defer { for fd in owned.reversed() { close(fd) } }
        var contentsFD: Int32 = -1
        for component in ["FarmOS Fresh Authentication Probe.app", "Contents", "MacOS"] {
            let next = openat(current, component, O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC)
            guard next >= 0, safeDirectory(fd: next, expectedDevice: expectedDevice) else {
                return nil
            }
            owned.append(next); current = next
            if component == "Contents" { contentsFD = next }
        }
        guard contentsFD >= 0,
              let bundle = verifiedBundleIdentity(
                contentsFD: contentsFD, expectedDevice: expectedDevice
              ), bundle.identifier == companionBundleIdentifier,
              finalBundleSignatureIsValid()
        else { return nil }
        let fd = openat(current, "farmos-c2b-fresh-auth-probe", O_RDONLY | O_NOFOLLOW | O_CLOEXEC)
        guard fd >= 0 else { return nil }
        defer { close(fd) }
        var metadata = stat()
        guard fstat(fd, &metadata) == 0,
              (metadata.st_mode & S_IFMT) == S_IFREG,
              (metadata.st_mode & 0o022) == 0,
              metadata.st_uid == geteuid(), metadata.st_nlink == 1,
              metadata.st_dev == expectedDevice,
              let data = try? FileHandle(fileDescriptor: dup(fd), closeOnDealloc: true)
                .readToEnd(), !data.isEmpty
        else { return nil }
        let digest = "sha256:" + SHA256.hash(data: data)
            .map { String(format: "%02x", $0) }.joined()
        let object = identity(metadata: metadata, artifact: digest)
        let signingClassification = "AD_HOC_VALID"
        let body: [String: Any] = [
            "schema_version": signedArtifactSchema,
            "finalization_state": "FINAL_SIGNED_QUALIFICATION_ARTIFACT",
            "executable_sha256": digest,
            "executable_file_type": "REGULAR_EXECUTABLE",
            "executable_owner": NSNumber(value: metadata.st_uid),
            "executable_mode": NSNumber(value: metadata.st_mode & 0o7777),
            "bundle_identifier": bundle.identifier,
            "info_plist_sha256": bundle.infoPlistSHA256,
            "signing_classification": signingClassification,
        ]
        guard let canonical = try? FarmOSCanonicalDigest.canonicalJSON(body) else { return nil }
        return VerifiedFinalCompanion(
            object: object,
            finalIdentity: FinalSignedCompanionIdentity(
                executableSHA256: digest, infoPlistSHA256: bundle.infoPlistSHA256,
                bundleIdentifier: bundle.identifier,
                signingClassification: signingClassification,
                executableOwner: metadata.st_uid,
                executableMode: UInt16(metadata.st_mode & 0o7777),
                artifactReferenceDigest: FarmOSCanonicalDigest.sha256(
                    domain: signedArtifactDigestDomain, canonicalValue: canonical
                )
            )
        )
    }

    private static func verifiedBundleIdentity(
        contentsFD: Int32, expectedDevice: dev_t
    ) -> (identifier: String, infoPlistSHA256: String)? {
        let fd = openat(contentsFD, "Info.plist", O_RDONLY | O_NOFOLLOW | O_CLOEXEC)
        guard fd >= 0 else { return nil }
        defer { close(fd) }
        var metadata = stat()
        guard fstat(fd, &metadata) == 0, (metadata.st_mode & S_IFMT) == S_IFREG,
              (metadata.st_mode & 0o022) == 0, metadata.st_uid == geteuid(),
              metadata.st_nlink == 1, metadata.st_dev == expectedDevice,
              let bytes = try? FileHandle(fileDescriptor: dup(fd), closeOnDealloc: true).readToEnd(),
              let plist = try? PropertyListSerialization.propertyList(
                from: bytes, options: [], format: nil
              ) as? [String: Any],
              plist["CFBundleExecutable"] as? String == "farmos-c2b-fresh-auth-probe",
              plist["CFBundlePackageType"] as? String == "APPL",
              let identifier = plist["CFBundleIdentifier"] as? String
        else { return nil }
        let plistDigest = "sha256:" + SHA256.hash(data: bytes)
            .map { String(format: "%02x", $0) }.joined()
        return (identifier, plistDigest)
    }

    private static func finalBundleSignatureIsValid() -> Bool {
        let appURL = URL(fileURLWithPath:
            "/private/tmp/FarmOS Fresh Authentication Probe.app") as CFURL
        var code: SecStaticCode?
        guard SecStaticCodeCreateWithPath(appURL, [], &code) == errSecSuccess,
              let code,
              SecStaticCodeCheckValidity(
                code,
                SecCSFlags(rawValue: UInt32(kSecCSCheckAllArchitectures | kSecCSStrictValidate)),
                nil
              ) == errSecSuccess
        else { return false }
        var information: CFDictionary?
        guard SecCodeCopySigningInformation(code, SecCSFlags(rawValue: kSecCSSigningInformation),
                                             &information) == errSecSuccess,
              let values = information as? [String: Any],
              values[kSecCodeInfoIdentifier as String] as? String == companionBundleIdentifier
        else { return false }
        let certificates = values[kSecCodeInfoCertificates as String] as? [Any]
        return certificates == nil || certificates?.isEmpty == true
    }

    private static func safeDirectory(fd: Int32, expectedDevice: dev_t) -> Bool {
        var metadata = stat()
        return fstat(fd, &metadata) == 0 && (metadata.st_mode & S_IFMT) == S_IFDIR &&
            (metadata.st_mode & 0o022) == 0 && metadata.st_uid == geteuid() &&
            metadata.st_dev == expectedDevice
    }

    private static func identity(metadata: stat, artifact: String) -> ExecutableObjectIdentity {
        ExecutableObjectIdentity(
            device: UInt64(metadata.st_dev), inode: metadata.st_ino,
            owner: metadata.st_uid, group: metadata.st_gid,
            mode: UInt16(metadata.st_mode), linkCount: UInt16(metadata.st_nlink),
            size: metadata.st_size, modifiedSeconds: Int64(metadata.st_mtimespec.tv_sec),
            modifiedNanoseconds: Int64(metadata.st_mtimespec.tv_nsec),
            changedSeconds: Int64(metadata.st_ctimespec.tv_sec),
            changedNanoseconds: Int64(metadata.st_ctimespec.tv_nsec), artifactDigest: artifact
        )
    }

    private static func mappedExecutableIdentity(pid: pid_t, artifact: String)
        -> ExecutableObjectIdentity? {
        var address: UInt64 = 0
        let size = MemoryLayout<proc_regionwithpathinfo>.size
        for _ in 0..<512 {
            var info = proc_regionwithpathinfo()
            let count = withUnsafeMutablePointer(to: &info) {
                proc_pidinfo(pid, PROC_PIDREGIONPATHINFO, address, $0, Int32(size))
            }
            guard count == size else { return nil }
            let region = info.prp_prinfo
            let vnode = info.prp_vip.vip_vi.vi_stat
            if (region.pri_protection & UInt32(VM_PROT_EXECUTE)) != 0 {
                let mapped = ExecutableObjectIdentity(
                    device: UInt64(vnode.vst_dev), inode: vnode.vst_ino,
                    owner: vnode.vst_uid, group: vnode.vst_gid,
                    mode: vnode.vst_mode, linkCount: vnode.vst_nlink, size: vnode.vst_size,
                    modifiedSeconds: vnode.vst_mtime,
                    modifiedNanoseconds: vnode.vst_mtimensec,
                    changedSeconds: vnode.vst_ctime, changedNanoseconds: vnode.vst_ctimensec,
                    artifactDigest: artifact
                )
                if mapped.inode != 0 && mapped.owner == geteuid() { return mapped }
            }
            let next = region.pri_address + region.pri_size
            guard next > address else { return nil }
            address = next
        }
        return nil
    }

    private static func waitForCompletion(
        _ completion: DispatchSemaphore, timeout: TimeInterval
    ) -> Bool {
        guard timeout > 0 else { return false }
        return completion.wait(timeout: .now() + timeout) == .success
    }

    private static func remainingProcessLifetime(since start: TimeInterval) -> TimeInterval {
        max(0, qualificationProcessLifetimeSeconds -
            (ProcessInfo.processInfo.systemUptime - start))
    }

    package static func readAvailableDataBoundedly(
        _ handle: FileHandle, timeout: TimeInterval
    ) -> Data? {
        guard timeout > 0 else { return nil }
        let ready = DispatchSemaphore(value: 0)
        let state = BoundedReadState()
        handle.readabilityHandler = { readable in
            let data = readable.availableData
            if state.complete(with: data) { ready.signal() }
        }
        let completed = ready.wait(timeout: .now() + timeout) == .success
        handle.readabilityHandler = nil
        return completed ? state.snapshot() : nil
    }

    @discardableResult
    package static func terminateBoundedly(
        _ process: Process, completion: DispatchSemaphore
    ) -> Bool {
        guard process.isRunning else { return true }
        process.terminate()
        if waitForCompletion(completion, timeout: 1) { return true }
        guard process.isRunning else { return true }
        _ = kill(process.processIdentifier, SIGKILL)
        return waitForCompletion(completion, timeout: 1) || !process.isRunning
    }

    public static func classifyFailureFixture(
        _ fixture: IntegratedAuthenticationFailureFixture
    ) -> IntegratedAuthenticationResult {
        switch fixture {
        case .userCancelled: return .cancelled
        case .authenticationFailed: return .rejected
        case .malformedResult: return .malformed
        }
    }

    private static func preflightCapability() -> IntegratedAuthenticationCapability {
        guard geteuid() != 0,
              let console = SCDynamicStoreCopyConsoleUser(nil, nil, nil),
              CFStringGetLength(console) > 0,
              CFStringCompare(console, "loginwindow" as CFString, []) != .compareEqualTo,
              consoleActorMatchesEffectiveUID()
        else { return .noInteractiveLoginSession }
        let context = LAContext()
        context.touchIDAuthenticationAllowableReuseDuration = 0
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            return .authenticationUnavailable
        }
        guard transientGeneratedUIDForEffectiveLoginActor() != nil else {
            return .localDirectoryUnavailable
        }
        return .available
    }

    private static func consoleActorMatchesEffectiveUID() -> Bool {
        var uid: uid_t = 0
        var gid: gid_t = 0
        guard SCDynamicStoreCopyConsoleUser(nil, &uid, &gid) != nil else { return false }
        return uid == geteuid() && uid != 0
    }

    private static func transientGeneratedUIDForEffectiveLoginActor() -> String? {
        do {
            let node = try ODNode(session: ODSession.default(), type: UInt32(kODNodeTypeLocalNodes))
            let query = try ODQuery(
                node: node,
                forRecordTypes: kODRecordTypeUsers,
                attribute: kODAttributeTypeUniqueID,
                matchType: UInt32(kODMatchEqualTo),
                queryValues: String(geteuid()),
                returnAttributes: kODAttributeTypeGUID,
                maximumResults: 2
            )
            guard let records = try query.resultsAllowingPartial(false) as? [ODRecord],
                  records.count == 1,
                  let values = try records[0].values(forAttribute: kODAttributeTypeGUID) as? [String],
                  values.count == 1
            else { return nil }
            return values[0].uppercased()
        } catch {
            return nil
        }
    }
}

public enum NativeBoundedEntropy {
    public static func freshReference(
        domain: String,
        binding: [String: Any]
    ) -> String? {
        guard !domain.isEmpty,
              let canonicalBinding = try? FarmOSCanonicalDigest.canonicalJSON(binding)
        else { return nil }
        var secret = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, secret.count, &secret) == errSecSuccess else {
            return nil
        }
        defer { secret.resetBytes(in: secret.indices) }
        let secretDigest = SHA256.hash(data: Data(secret))
            .map { String(format: "%02x", $0) }.joined()
        return FarmOSCanonicalDigest.sha256(
            domain: domain,
            canonicalValue: canonicalBinding + "\n" + secretDigest
        )
    }
}

public final class NativeOneShotSecret: @unchecked Sendable {
    private var material: [UInt8]?
    private var reference: String?
    private var consumed = false

    public init?() {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            return nil
        }
        material = bytes
    }

    deinit {
        if var bytes = material { bytes.resetBytes(in: bytes.indices) }
    }

    public func bind(domain: String, exactBinding: [String: Any]) -> String? {
        guard reference == nil, !consumed, var bytes = material,
              let binding = try? FarmOSCanonicalDigest.canonicalJSON(exactBinding)
        else { return nil }
        let materialDigest = SHA256.hash(data: Data(bytes))
            .map { String(format: "%02x", $0) }.joined()
        bytes.resetBytes(in: bytes.indices)
        material = nil
        let result = FarmOSCanonicalDigest.sha256(
            domain: domain,
            canonicalValue: binding + "\n" + materialDigest
        )
        reference = result
        return result
    }

    public func consume(exactReference: String) -> Bool {
        guard !consumed, reference == exactReference else { return false }
        consumed = true
        return true
    }

    public var terminallyConsumed: Bool { consumed }
}
