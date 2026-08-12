import Darwin
import CryptoKit
import Foundation
import FarmOSDay150C2BNativeCore

private func expect(
    _ condition: Bool,
    _ message: String = "qualification assertion failed",
    file: StaticString = #filePath,
    line: UInt = #line
) {
    if !condition {
        FileHandle.standardError.write(Data("FAIL \(file):\(line): \(message)\n".utf8))
        exit(EXIT_FAILURE)
    }
}

private func fail(
    _ message: String,
    file: StaticString = #filePath,
    line: UInt = #line
) {
    expect(false, message, file: file, line: line)
}

private let digestA = "sha256:" + String(repeating: "a", count: 64)
private let digestB = "sha256:" + String(repeating: "b", count: 64)
private let digestC = "sha256:" + String(repeating: "c", count: 64)
private let digestD = "sha256:" + String(repeating: "d", count: 64)

private func requestBody(
    operation: String = NativeProtocolOperation.validateBootstrapCeremony.rawValue
) -> [String: Any] {
    [
        "schema_version": FarmOSDay150C2BNativeAuthority.protocolID,
        "authority_id": FarmOSDay150C2BNativeAuthority.protocolID,
        "authority_revision": 1,
        "message_kind": "BOUNDED_REQUEST_CANDIDATE",
        "operation": operation,
        "request_reference_digest_candidate": digestA,
        "installation_profile_digest_candidate": digestB,
        "native_profile_digest_candidate": digestC,
        "protocol_profile_digest_candidate": digestD,
        "payload_reference_digest_candidate": digestA,
        "runtime_record_candidate_digest": NSNull(),
    ]
}

private func envelope(_ body: [String: Any]) throws -> Data {
    try NativeProtocolCodec.qualificationEnvelope(body: body)
}

private func invalid(_ data: Data) -> NativeProtocolFailure? {
    guard case let .invalid(reason) = NativeProtocolCodec.parse(data) else { return nil }
    return reason
}

    func testProtocolValid() throws {
    let parsed = NativeProtocolCodec.parse(try envelope(requestBody()))
    guard case let .structurallyValidCandidate(candidate) = parsed else {
        fail("valid request rejected")
        return
    }
    expect(candidate.operation == .validateBootstrapCeremony)
    expect(candidate.nativeAuthenticityEstablished == false)
    expect(candidate.peerAuthenticityEstablished == false)
    expect(candidate.storagePublicationEstablished == false)
    // Fixed cross-language vector produced by the R4-1 TypeScript canonical JSON/domain contract.
    expect(candidate.messageDigest
        == "sha256:8c39211bc2d22b3e4616cab0a694386b91986c0b96f327bfff857e12162491bb")
}

    func testProtocolResponse() throws {
    var body = requestBody()
    body["message_kind"] = "BOUNDED_RESPONSE_CANDIDATE"
    body.removeValue(forKey: "payload_reference_digest_candidate")
    body.removeValue(forKey: "runtime_record_candidate_digest")
    body["response_state"] = "REJECTED_CANDIDATE"
    body["result_reference_digest_candidate"] = NSNull()
    body["sanitized_reason"] = "POLICY_REJECTED"
    expect(try {
        if case .structurallyValidCandidate = NativeProtocolCodec.parse(try envelope(body)) { return true }
        return false
    }())
}

    func testProtocolRejectsUnknowns() throws {
    expect(invalid(try envelope(requestBody(operation: "toString"))) == .unknownOperation)
    expect(invalid(try envelope(requestBody(operation: "constructor"))) == .unknownOperation)
    expect(invalid(try envelope(requestBody(operation: "__proto__"))) == .unknownOperation)
    var extra = requestBody(); extra["argv"] = ["/bin/sh"]
    expect(invalid(try envelope(extra)) == .authorityMismatch)
    var path = requestBody(); path["path"] = "/tmp/anything"
    expect(invalid(try envelope(path)) == .authorityMismatch)
    var environment = requestBody(); environment["environment"] = ["TOKEN": "secret"]
    expect(invalid(try envelope(environment)) == .authorityMismatch)
    let malformed = Data(#"{"message_body":[]}"#.utf8)
    expect(invalid(malformed) == .invalidEnvelope)
}

    func testProtocolVocabularyBounded() {
    let joined = NativeProtocolOperation.allCases.map(\.rawValue).joined(separator: " ")
    for forbidden in ["SHELL", "COMMAND", "ARGV", "PATH", "FILESYSTEM", "KEYCHAIN",
                      "DOCKER", "DATABASE", "NETWORK", "GENERIC_AUTHENTICATION"] {
        expect(!joined.contains(forbidden))
    }
}

    func testBrokerBoundaries() throws {
    let validPeer = BrokerPeerCandidate(
        transportClass: "PRIVATE_LOCAL_BOUNDED_CHANNEL_CANDIDATE",
        auditTokenDigestCandidate: digestA,
        peerValidationRevision: "farmos.day150-c2b-native-peer-validation.v1"
    )
    let forged = BrokerPeerCandidate(
        transportClass: "CALLER_ASSERTED_ROOT",
        auditTokenDigestCandidate: digestA,
        peerValidationRevision: "farmos.day150-c2b-native-peer-validation.v1"
    )
    expect(NativeBrokerSource.validate(peer: forged, requestData: try envelope(requestBody()))
        == .rejected(.malformedPeer))
    expect(NativeBrokerSource.validate(peer: validPeer, requestData: Data("{}".utf8))
        == .rejected(.malformedRequest))
    var publish = requestBody(operation: NativeProtocolOperation.publishRuntimeRecord.rawValue)
    publish["runtime_record_candidate_digest"] = digestB
    expect(NativeBrokerSource.validate(peer: validPeer, requestData: try envelope(publish))
        == .rejected(.unsupportedOperation))
    expect(!NativeBrokerSource.ledgerWriteAuthority)
    expect(!NativeBrokerSource.shellAuthority)
    expect(!NativeBrokerSource.dockerAuthority)
    expect(!NativeBrokerSource.databaseAuthority)
    expect(!NativeBrokerSource.networkAuthority)
}

    func testWriterPolicy() {
    let good = WriterQualificationPlan(
        steps: NativeWriterPolicy.requiredSequence,
        rootRegainProbeRejected: true
    )
    expect(NativeWriterPolicy.validate(plan: good, operation: .publishRuntimeRecord) == nil)
    expect(!good.supplementaryGroupsRetained)
    expect(good.workingDirectory == "/")
    expect(good.umask == "0077")
    expect(!good.networkAllowed && !good.execAllowed)
    let wrongOrder = WriterQualificationPlan(
        steps: NativeWriterPolicy.requiredSequence.reversed(),
        rootRegainProbeRejected: true
    )
    expect(NativeWriterPolicy.validate(plan: wrongOrder, operation: .publishRuntimeRecord)
        == .sequenceMismatch)
    let canRegainRoot = WriterQualificationPlan(
        steps: NativeWriterPolicy.requiredSequence,
        rootRegainProbeRejected: false
    )
    expect(NativeWriterPolicy.validate(plan: canRegainRoot, operation: .publishRuntimeRecord)
        == .rootRegainNotRejected)
    expect(NativeWriterPolicy.validate(plan: good, operation: .validateActorProvenance)
        == .unsupportedOperation)
    expect(!NativeWriterPolicy.livePrivilegeDropPerformed)
    expect(!NativeWriterPolicy.canonicalLedgerWritePerformed)
}

    func testStoragePolicy() {
    let file = DarwinStorageObjectCandidate(
        kind: .regularFile, ownerUID: 501, ownerGID: 501, mode: 0o600, device: 12, linkCount: 1
    )
    expect(DarwinStorageSource.validate(
        object: file, expectedKind: .regularFile, expectedUID: 501, expectedGID: 501,
        expectedMode: 0o600, expectedDevice: 12
    ) == nil)
    let symlink = DarwinStorageObjectCandidate(
        kind: .symbolicLink, ownerUID: 501, ownerGID: 501, mode: 0o600, device: 12, linkCount: 1
    )
    expect(DarwinStorageSource.validate(
        object: symlink, expectedKind: .regularFile, expectedUID: 501, expectedGID: 501,
        expectedMode: 0o600, expectedDevice: 12
    ) == .symbolicLink)
    expect(DarwinStorageSource.validate(
        object: .init(kind: .directory, ownerUID: 501, ownerGID: 501, mode: 0o600,
                      device: 12, linkCount: 1),
        expectedKind: .regularFile, expectedUID: 501, expectedGID: 501,
        expectedMode: 0o600, expectedDevice: 12
    ) == .wrongType)
    expect(DarwinStorageSource.validate(
        object: .init(kind: .directory, ownerUID: 501, ownerGID: 501, mode: 0o700,
                      device: 12, linkCount: 4),
        expectedKind: .directory, expectedUID: 501, expectedGID: 501,
        expectedMode: 0o700, expectedDevice: 12
    ) == nil)
    expect(DarwinStorageSource.validate(
        object: .init(kind: .regularFile, ownerUID: 501, ownerGID: 501, mode: 0o600,
                      device: 13, linkCount: 1),
        expectedKind: .regularFile, expectedUID: 501, expectedGID: 501,
        expectedMode: 0o600, expectedDevice: 12
    ) == .deviceMismatch)
    expect(DarwinStorageSource.validate(
        object: .init(kind: .regularFile, ownerUID: 501, ownerGID: 501, mode: 0o600,
                      device: 12, linkCount: 2),
        expectedKind: .regularFile, expectedUID: 501, expectedGID: 501,
        expectedMode: 0o600, expectedDevice: 12
    ) == .linkCountMismatch)
    expect(DarwinStorageSource.validate(
        object: .init(kind: .regularFile, ownerUID: 0, ownerGID: 0, mode: 0o600,
                      device: 12, linkCount: 1),
        expectedKind: .regularFile, expectedUID: 501, expectedGID: 501,
        expectedMode: 0o600, expectedDevice: 12
    ) == .ownerMismatch)
    expect(DarwinStorageSource.validate(
        object: .init(kind: .regularFile, ownerUID: 501, ownerGID: 501, mode: 0o644,
                      device: 12, linkCount: 1),
        expectedKind: .regularFile, expectedUID: 501, expectedGID: 501,
        expectedMode: 0o600, expectedDevice: 12
    ) == .modeMismatch)
    expect(DarwinStorageSource.classifyNoReplace(errno: EEXIST) == .noReplaceCollision)
    expect(DarwinStorageSource.classifyDurability(success: false) == .durabilityFailure)
    expect(DarwinStorageSource.classifyReadback(matches: false) == .readbackMismatch)
    expect(!DarwinStorageSource.canonicalRootTouched)
    expect(!DarwinStorageSource.runtimePublicationPerformed)
    expect((DarwinStoragePolicy.directoryOpenFlags & O_NOFOLLOW) != 0)
    expect((DarwinStoragePolicy.temporaryCreateFlags & O_EXCL) != 0)
    expect((DarwinStoragePolicy.temporaryCreateFlags & O_NOFOLLOW) != 0)
    expect(DarwinStoragePolicy.fullDurabilityCommand == F_FULLFSYNC)
    expect(DarwinStoragePolicy.noReplaceRenameFlag == RENAME_EXCL)
}

    func testActorProvenance() {
    let authentication = ActorAuthenticationResultCandidate(
        mechanismRevision: NativeActorProvenanceSource.authenticationMechanismRevision,
        authorizationResultReferenceDigest: digestA,
        interactive: true,
        acceptedByNativeBoundary: true
    )
    let result = NativeActorProvenanceSource.deriveReferenceCandidate(
        authentication: authentication,
        generatedUIDTransient: "00000000-0000-0000-0000-000000000001".uppercased(),
        installationProfileDigest: digestB
    )
    guard case let .structurallyValidReferenceCandidate(reference) = result else {
        fail("actor reference candidate rejected")
        return
    }
    expect(FarmOSCanonicalDigest.isDigest(reference))
    expect(!reference.contains("00000000"))
    expect(!NativeActorProvenanceSource.rawGeneratedUIDPersisted)
    expect(!NativeActorProvenanceSource.usernamePersisted)
    expect(!NativeActorProvenanceSource.authenticationBlobPersisted)
    expect(!NativeActorProvenanceSource.actorEstablished)
    let forgedAuthentication = ActorAuthenticationResultCandidate(
        mechanismRevision: NativeActorProvenanceSource.authenticationMechanismRevision,
        authorizationResultReferenceDigest: digestA,
        interactive: false,
        acceptedByNativeBoundary: true
    )
    expect(NativeActorProvenanceSource.deriveReferenceCandidate(
        authentication: forgedAuthentication,
        generatedUIDTransient: "00000000-0000-0000-0000-000000000002",
        installationProfileDigest: digestB
    ) == .rejected(.authenticationRejected))
    expect(NativeActorProvenanceSource.deriveReferenceCandidate(
        authentication: authentication, generatedUIDTransient: "forged",
        installationProfileDigest: digestB
    ) == .rejected(.emptyGeneratedUID))
    expect(NativeActorProvenanceSource.deriveReferenceCandidate(
        authentication: authentication,
        generatedUIDTransient: "00000000-0000-0000-0000-00000000000g",
        installationProfileDigest: digestB
    ) == .rejected(.emptyGeneratedUID))
}

    func testClockProvenance() {
    let fixture = ClockObservationFixture(
        osUTC: "2026-08-12T12:34:56.789Z",
        continuousLowerNanoseconds: 100,
        continuousUpperNanoseconds: 110,
        bootSessionReferenceDigest: digestA
    )
    expect(NativeClockProvenanceSource.validateInjectedFixture(
        fixture, expectedBootSessionReferenceDigest: digestA
    ) == .structurallyValidObservationCandidate(fixture))
    expect(NativeClockProvenanceSource.validateInjectedFixture(
        fixture, expectedBootSessionReferenceDigest: digestB
    ) == .rejected(.bootSessionMismatch))
    let malformedTime = ClockObservationFixture(
        osUTC: "caller supplied", continuousLowerNanoseconds: 100,
        continuousUpperNanoseconds: 110, bootSessionReferenceDigest: digestA
    )
    expect(NativeClockProvenanceSource.validateInjectedFixture(
        malformedTime, expectedBootSessionReferenceDigest: digestA
    ) == .rejected(.malformedTimestamp))
    let reversedBracket = ClockObservationFixture(
        osUTC: "2026-08-12T12:34:56.789Z", continuousLowerNanoseconds: 111,
        continuousUpperNanoseconds: 110, bootSessionReferenceDigest: digestA
    )
    expect(NativeClockProvenanceSource.validateInjectedFixture(
        reversedBracket, expectedBootSessionReferenceDigest: digestA
    ) == .rejected(.malformedContinuousBracket))
    expect(NativeClockProvenanceSource.rejectCallerTimestamp()
        == .rejected(.callerTimestampNotAuthority))
    expect(!NativeClockProvenanceSource.hostClockObservedForAuthority)
    expect(!NativeClockProvenanceSource.trustedClockEstablished)
    expect(!NativeClockProvenanceSource.epochActivated)
    expect(!NativeClockProvenanceSource.durableFloorPublished)
}

    func testPrivacyAndNegativeAuthority() throws {
    let sourceRoot = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("Sources")
    let names = [
        "FarmOSDay150C2BNativeCore/NativeProtocol.swift",
        "FarmOSDay150C2BNativeCore/Broker.swift",
        "FarmOSDay150C2BNativeCore/WriterPolicy.swift",
        "FarmOSDay150C2BNativeCore/DarwinStorage.swift",
        "FarmOSDay150C2BNativeCore/ActorProvenance.swift",
        "FarmOSDay150C2BNativeCore/ClockProvenance.swift",
    ]
    let source = try names.map {
        try String(contentsOf: sourceRoot.appendingPathComponent($0), encoding: .utf8)
    }.joined(separator: "\n")
    for forbidden in ["password", "bearer_token", "registry_credential", "database_credential",
                      "raw_username", "raw_generated_uid_persisted_value", "auth_blob_payload",
                      "stderr_payload", "stack_trace_payload", "connection_string", "dsn_value"] {
        expect(!source.lowercased().contains(forbidden))
    }
    expect(!NativeBrokerSource.runtimeActivationEstablished)
    expect(!NativeWriterPolicy.installedWriterIdentityEstablished)
    expect(!NativeWriterPolicy.canonicalLedgerWritePerformed)
    expect(!NativeActorProvenanceSource.actorEstablished)
    expect(!NativeClockProvenanceSource.trustedClockEstablished)
}

private func runSourceQualification() throws {
    try testProtocolValid()
    try testProtocolResponse()
    try testProtocolRejectsUnknowns()
    testProtocolVocabularyBounded()
    try testBrokerBoundaries()
    testWriterPolicy()
    testStoragePolicy()
    testActorProvenance()
    testClockProvenance()
    try testPrivacyAndNegativeAuthority()
    FileHandle.standardOutput.write(Data("R4-2 native qualification PASS: 10 groups\n".utf8))
}

private enum DisposableQualificationFailure: Error {
    case invalidArguments
    case unsafeRoot
    case unexpectedPreexistingState
    case syscall(String)
    case assertion(String)
}

private final class DisposableQualificationRoot {
    let baseFD: Int32
    private var ownedRuns: [String] = []
    private var preservedRuns: Set<String>
    private var nextRun: UInt64 = 1

    init(preservedRunNames: Set<String>) throws {
        preservedRuns = preservedRunNames
        let root = DisposableStoragePolicy.preferredRoot
        expect(root != DarwinStoragePolicy.canonicalLedgerRoot)
        expect(!root.hasPrefix("/tmp/") && !root.contains("/docker/"))
        let manager = FileManager.default
        if !manager.fileExists(atPath: root) {
            try manager.createDirectory(
                atPath: root,
                withIntermediateDirectories: true,
                attributes: [.posixPermissions: 0o700]
            )
        }
        baseFD = try Self.openVerifiedRoot()
        guard try directoryEntryNames(fd: baseFD) == preservedRunNames else {
            close(baseFD); throw DisposableQualificationFailure.unexpectedPreexistingState
        }
        var fs = statfs()
        guard fstatfs(baseFD, &fs) == 0 else {
            close(baseFD); throw DisposableQualificationFailure.syscall("fstatfs")
        }
        let type = withUnsafePointer(to: &fs.f_fstypename) {
            $0.withMemoryRebound(to: CChar.self, capacity: Int(MFSNAMELEN)) { String(cString: $0) }
        }
        guard type == "apfs", (fs.f_flags & UInt32(MNT_LOCAL)) != 0 else {
            close(baseFD); throw DisposableQualificationFailure.unsafeRoot
        }
        let generations = preservedRunNames.compactMap { name -> UInt64? in
            guard name.hasPrefix("run-") else { return nil }
            return UInt64(name.dropFirst(4), radix: 16)
        }
        guard generations.count == preservedRunNames.count else {
            close(baseFD); throw DisposableQualificationFailure.unsafeRoot
        }
        nextRun = (generations.max() ?? 0) + 1
    }

    deinit { close(baseFD) }

    static func openVerifiedRoot() throws -> Int32 {
        let chain: [(name: String, owner: uid_t, mode: mode_t?)] = [
            ("Users", 0, nil), ("hayate", getuid(), nil), ("Library", getuid(), nil),
            ("Application Support", getuid(), nil), ("FarmOS", getuid(), nil),
            ("day150-c2b-bootstrap-qualification", getuid(), nil),
            ("r4-storage", getuid(), 0o700),
        ]
        var current = open("/", DarwinStoragePolicy.directoryOpenFlags)
        guard current >= 0 else { throw DisposableQualificationFailure.unsafeRoot }
        var expectedDevice: dev_t?
        for component in chain {
            let next = openat(current, component.name, DarwinStoragePolicy.directoryOpenFlags)
            guard next >= 0 else {
                close(current); throw DisposableQualificationFailure.unsafeRoot
            }
            var metadata = stat()
            guard fstat(next, &metadata) == 0,
                  (metadata.st_mode & S_IFMT) == S_IFDIR,
                  metadata.st_uid == component.owner,
                  (metadata.st_mode & 0o022) == 0,
                  component.mode == nil || (metadata.st_mode & 0o7777) == component.mode
            else {
                close(next); close(current)
                throw DisposableQualificationFailure.unsafeRoot
            }
            if let device = expectedDevice {
                guard metadata.st_dev == device else {
                    close(next); close(current)
                    throw DisposableQualificationFailure.unsafeRoot
                }
            } else {
                expectedDevice = metadata.st_dev
            }
            close(current)
            current = next
        }
        return current
    }

    func makeRun() throws -> String {
        let name = String(format: "run-%016llx", nextRun)
        nextRun += 1
        guard mkdirat(baseFD, name, 0o700) == 0 else {
            throw DisposableQualificationFailure.syscall("mkdirat run")
        }
        ownedRuns.append(name)
        return name
    }

    func openRun(_ name: String) throws -> Int32 {
        let fd = openat(baseFD, name, DarwinStoragePolicy.directoryOpenFlags)
        guard fd >= 0 else { throw DisposableQualificationFailure.syscall("openat run") }
        return fd
    }

    func preserveRun(_ name: String) throws {
        guard let index = ownedRuns.firstIndex(of: name) else {
            throw DisposableQualificationFailure.assertion("preserve unowned run")
        }
        ownedRuns.remove(at: index)
        preservedRuns.insert(name)
    }

    func cleanOwnedRunsAfterRecordedResults() throws {
        for run in ownedRuns {
            let runFD = try openRun(run)
            let duplicate = dup(runFD)
            guard duplicate >= 0, let directory = fdopendir(duplicate) else {
                if duplicate >= 0 { close(duplicate) }
                close(runFD)
                throw DisposableQualificationFailure.syscall("fdopendir cleanup")
            }
            rewinddir(directory)
            var names: [String] = []
            while let entry = readdir(directory) {
                let name = withUnsafePointer(to: &entry.pointee.d_name) {
                    $0.withMemoryRebound(to: CChar.self, capacity: Int(MAXNAMLEN) + 1) {
                        String(cString: $0)
                    }
                }
                if name != "." && name != ".." { names.append(name) }
            }
            closedir(directory)
            for name in names {
                guard unlinkat(runFD, name, 0) == 0 else {
                    close(runFD)
                    throw DisposableQualificationFailure.syscall("unlinkat cleanup")
                }
            }
            close(runFD)
            guard unlinkat(baseFD, run, AT_REMOVEDIR) == 0 else {
                throw DisposableQualificationFailure.syscall("unlinkat run cleanup")
            }
        }
        ownedRuns.removeAll()
        let duplicate = dup(baseFD)
        guard duplicate >= 0, let directory = fdopendir(duplicate) else {
            if duplicate >= 0 { close(duplicate) }
            throw DisposableQualificationFailure.syscall("fdopendir root check")
        }
        rewinddir(directory)
        var remaining = Set<String>()
        while let entry = readdir(directory) {
            let name = withUnsafePointer(to: &entry.pointee.d_name) {
                $0.withMemoryRebound(to: CChar.self, capacity: Int(MAXNAMLEN) + 1) {
                    String(cString: $0)
                }
            }
            if name != "." && name != ".." { remaining.insert(name) }
        }
        closedir(directory)
        guard remaining == preservedRuns else {
            throw DisposableQualificationFailure.unexpectedPreexistingState
        }
    }
}

private func require(_ condition: Bool, _ message: String) throws {
    if !condition { throw DisposableQualificationFailure.assertion(message) }
}

private func makeRecord(
    generation: UInt64,
    previousDigest: String?,
    marker: Character
) throws -> DisposableRuntimeRecord {
    let markerDigest = "sha256:" + String(repeating: String(marker), count: 64)
    let bytes = DisposableRecordValidator.qualificationRecord(
        generation: generation,
        previousDigest: previousDigest,
        discriminator: markerDigest
    )
    guard let record = DisposableRecordValidator.parse(bytes) else {
        throw DisposableQualificationFailure.assertion("fixture record validation")
    }
    return record
}

private func mutateAndReseal(
    _ bytes: Data,
    mutation: (inout [String: Any]) throws -> Void
) throws -> Data {
    guard var envelope = try JSONSerialization.jsonObject(with: bytes) as? [String: Any],
          var body = envelope["record_body"] as? [String: Any]
    else { throw DisposableQualificationFailure.assertion("fixture envelope") }
    try mutation(&body)
    let canonicalBody = try FarmOSCanonicalDigest.canonicalJSON(body)
    envelope["record_body"] = body
    envelope["record_digest"] = FarmOSCanonicalDigest.sha256(
        domain: DisposableStoragePolicy.recordDigestDomain,
        canonicalValue: canonicalBody
    )
    return Data(try FarmOSCanonicalDigest.canonicalJSON(envelope).utf8)
}

private func writeFixture(
    runFD: Int32,
    name: String,
    bytes: Data,
    mode: mode_t = 0o600
) throws {
    let fd = openat(runFD, name, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, mode)
    guard fd >= 0 else { throw DisposableQualificationFailure.syscall("fixture openat") }
    defer { close(fd) }
    let wrote = bytes.withUnsafeBytes { raw -> Bool in
        guard let base = raw.baseAddress else { return false }
        return Darwin.write(fd, base, raw.count) == raw.count
    }
    guard wrote else { throw DisposableQualificationFailure.syscall("fixture write") }
}

private func readAll(fd: Int32) throws -> Data {
    var result = Data()
    var buffer = [UInt8](repeating: 0, count: 16_384)
    while true {
        let count = Darwin.read(fd, &buffer, buffer.count)
        if count == 0 { return result }
        guard count > 0, result.count + count <= DisposableStoragePolicy.maximumRecordBytes else {
            throw DisposableQualificationFailure.syscall("bounded read")
        }
        result.append(contentsOf: buffer.prefix(count))
    }
}

private func directoryEntryNames(fd: Int32) throws -> Set<String> {
    let duplicate = dup(fd)
    guard duplicate >= 0, let directory = fdopendir(duplicate) else {
        if duplicate >= 0 { close(duplicate) }
        throw DisposableQualificationFailure.syscall("fdopendir")
    }
    defer { closedir(directory) }
    rewinddir(directory)
    var names = Set<String>()
    while let entry = readdir(directory) {
        let name = withUnsafePointer(to: &entry.pointee.d_name) {
            $0.withMemoryRebound(to: CChar.self, capacity: Int(MAXNAMLEN) + 1) {
                String(cString: $0)
            }
        }
        if name != "." && name != ".." { names.insert(name) }
    }
    return names
}

private func reconcilePreservedRun(
    root: DisposableQualificationRoot,
    run: String,
    expectedFileSHA256: String,
    expectedRecordDigest: String
) throws {
    guard run.range(of: #"^run-[a-f0-9]{16}$"#, options: .regularExpression) != nil,
          expectedFileSHA256.range(of: #"^[a-f0-9]{64}$"#, options: .regularExpression) != nil,
          FarmOSCanonicalDigest.isDigest(expectedRecordDigest)
    else { throw DisposableQualificationFailure.invalidArguments }
    let runFD = try root.openRun(run)
    defer { close(runFD) }
    var runMetadata = stat()
    var rootMetadata = stat()
    guard fstat(runFD, &runMetadata) == 0, fstat(root.baseFD, &rootMetadata) == 0,
          (runMetadata.st_mode & S_IFMT) == S_IFDIR,
          (runMetadata.st_mode & 0o7777) == 0o700,
          runMetadata.st_uid == getuid(), runMetadata.st_gid == getgid(),
          runMetadata.st_dev == rootMetadata.st_dev
    else { throw DisposableQualificationFailure.unsafeRoot }
    let recordName = DisposableAPFSLedger.recordName(0)
    guard try directoryEntryNames(fd: runFD) == Set([recordName]) else {
        throw DisposableQualificationFailure.assertion("preserved record entry mismatch")
    }
    var recordMetadata = stat()
    guard fstatat(runFD, recordName, &recordMetadata, AT_SYMLINK_NOFOLLOW) == 0,
          (recordMetadata.st_mode & S_IFMT) == S_IFREG,
          (recordMetadata.st_mode & 0o7777) == 0o600,
          recordMetadata.st_uid == getuid(), recordMetadata.st_gid == getgid(),
          recordMetadata.st_nlink == 1,
          recordMetadata.st_dev == runMetadata.st_dev
    else { throw DisposableQualificationFailure.unsafeRoot }
    let recordFD = openat(runFD, recordName, O_RDONLY | O_NOFOLLOW | O_CLOEXEC)
    guard recordFD >= 0 else { throw DisposableQualificationFailure.syscall("reconcile openat") }
    let bytes = try readAll(fd: recordFD)
    close(recordFD)
    let fileSHA = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
    let currentRecord = DisposableRecordValidator.parse(bytes)
    let historicalRecord = parseHistoricalQualificationRecord(bytes)
    guard fileSHA == expectedFileSHA256,
          let identity = currentRecord.map({
            (digest: $0.recordDigest, generation: $0.generation,
             previousGeneration: $0.previousGeneration,
             previousDigest: $0.previousRecordDigest)
          }) ?? historicalRecord,
          identity.digest == expectedRecordDigest,
          identity.generation == 0,
          identity.previousGeneration == nil,
          identity.previousDigest == nil
    else { throw DisposableQualificationFailure.assertion("preserved record mismatch") }
    // Record-only historical evidence is validated solely by this immutable,
    // harness-owned one-record compatibility seam. Runtime replay requires a
    // generation-specific durable fence for every record.
    print("preserved_run=\(run)")
    print("ORIGINAL_CALLER_OUTCOME=QUALIFICATION_OUTCOME_UNKNOWN")
    print("TRUSTED_READBACK_CLASSIFICATION=QUALIFICATION_ALREADY_PRESENT_AFTER_TRUSTED_READBACK")
    print("preserved_evidence_mutated=0")
}

private func parseHistoricalQualificationRecord(_ bytes: Data) -> (
    digest: String, generation: UInt64, previousGeneration: UInt64?, previousDigest: String?
)? {
    let fileSHA = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
    let adoptedEvidenceSHA256: Set<String> = [
        "504f5250c632a71931fc774e53e8c182ad0de699c157f92f58934976ec3caab5",
        "80ed14c479a57de7eda58062b4cd4fabf0fe4ef61b4b7485cb98cccaa3f9e709",
        "dbacef45b59a2d7cd67a6c3097e00eb0f1ba049eeb38bae57a823f37c2be4a71",
        "b41de45897d1116e38be4d01232c8f803faefe10f1b1afc27118813540fa9503",
        "f2e354738750478630ded6e63587abaece8e1e489c2cbad9a7eade89272f53b7",
        "e45717a6db559434a40c0b61290b6d17d81d083b49168c782dd71879674066bd",
        "f7e98dc592bbcd4da04ef5e448db5167aa0770b77bde1898ce8305bafb2566e0",
        "a5a803785299e27c13903d3f6377ccd94c41d856c437fed9077b2cef079c5771",
        "25da0437ce5c9111ec308a44bd2a66a97f27fe182f7242a76179da1a12a1dccb",
    ]
    guard adoptedEvidenceSHA256.contains(fileSHA),
          let root = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
          Set(root.keys) == Set(["record_body", "record_digest"]),
          let body = root["record_body"] as? [String: Any],
          Set(body.keys) == Set([
            "schema_version", "authority_id", "authority_revision", "generation",
            "previous_generation", "previous_record_digest", "source_bindings", "event",
            "projected_source_state_claim",
          ]),
          body["schema_version"] as? String == DisposableStoragePolicy.recordAuthority,
          body["authority_id"] as? String == DisposableStoragePolicy.recordAuthority,
          (body["authority_revision"] as? NSNumber)?.uint64Value == 1,
          (body["generation"] as? NSNumber)?.uint64Value == 0,
          body["previous_generation"] is NSNull,
          body["previous_record_digest"] is NSNull,
          let event = body["event"] as? [String: Any],
          Set(event.keys) == Set(["schema_version", "event_kind", "payload"]),
          event["schema_version"] as? String == DisposableStoragePolicy.eventAuthority,
          event["event_kind"] as? String == "INTEGRATED_RUNTIME_GENESIS_CANDIDATE",
          event["payload"] is [String: Any],
          let projection = body["projected_source_state_claim"] as? [String: Any],
          projection["schema_version"] as? String == DisposableStoragePolicy.projectionAuthority,
          projection["discriminator"] as? String == "SOURCE_PROJECTION_ONLY",
          let digest = root["record_digest"] as? String,
          FarmOSCanonicalDigest.isDigest(digest),
          let bodyJSON = try? FarmOSCanonicalDigest.canonicalJSON(body),
          FarmOSCanonicalDigest.sha256(
            domain: DisposableStoragePolicy.recordDigestDomain, canonicalValue: bodyJSON
          ) == digest,
          let envelopeJSON = try? FarmOSCanonicalDigest.canonicalJSON(root),
          Data(envelopeJSON.utf8) == bytes
    else { return nil }
    return (digest, 0, nil, nil)
}

private func reconcilePreservedOrphan(
    root: DisposableQualificationRoot,
    run: String,
    tempName: String,
    expectedFileSHA256: String
) throws {
    guard run.range(of: #"^run-[a-f0-9]{16}$"#, options: .regularExpression) != nil,
          tempName.range(
            of: #"^temp-[0-9]{20}-[0-9]+\.tmp$"#, options: .regularExpression
          ) != nil,
          expectedFileSHA256.range(of: #"^[a-f0-9]{64}$"#, options: .regularExpression) != nil
    else { throw DisposableQualificationFailure.invalidArguments }
    let runFD = try root.openRun(run)
    defer { close(runFD) }
    var runMetadata = stat()
    var rootMetadata = stat()
    var tempMetadata = stat()
    guard fstat(runFD, &runMetadata) == 0, fstat(root.baseFD, &rootMetadata) == 0,
          (runMetadata.st_mode & S_IFMT) == S_IFDIR,
          (runMetadata.st_mode & 0o7777) == 0o700,
          runMetadata.st_uid == getuid(), runMetadata.st_gid == getgid(),
          runMetadata.st_dev == rootMetadata.st_dev,
          try directoryEntryNames(fd: runFD) == Set([tempName]),
          fstatat(runFD, tempName, &tempMetadata, AT_SYMLINK_NOFOLLOW) == 0,
          (tempMetadata.st_mode & S_IFMT) == S_IFREG,
          (tempMetadata.st_mode & 0o7777) == 0o600,
          tempMetadata.st_uid == getuid(), tempMetadata.st_gid == getgid(),
          tempMetadata.st_nlink == 1, tempMetadata.st_dev == runMetadata.st_dev
    else { throw DisposableQualificationFailure.unsafeRoot }
    let fd = openat(runFD, tempName, O_RDONLY | O_NOFOLLOW | O_CLOEXEC)
    guard fd >= 0 else { throw DisposableQualificationFailure.syscall("orphan openat") }
    let bytes = try readAll(fd: fd)
    close(fd)
    let fileSHA = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
    guard fileSHA == expectedFileSHA256 else {
        throw DisposableQualificationFailure.assertion("preserved orphan mismatch")
    }
    print("preserved_run=\(run)")
    print("PRESERVED_CLASSIFICATION=PREPUBLICATION_ORPHAN_EVIDENCE")
    print("preserved_evidence_mutated=0")
}

private func reconcilePreservedAmbiguous(
    root: DisposableQualificationRoot,
    run: String,
    classification: String,
    expectedManifestSHA256: String
) throws {
    guard run.range(of: #"^run-[a-f0-9]{16}$"#, options: .regularExpression) != nil,
          ["PENDING_ONLY", "PENDING_TEMP", "PENDING_RECORD",
           "PENDING_RECORD_MISMATCH", "PENDING_CHAIN",
           "PENDING_PARTIAL_CHAIN", "MISSING_FENCE_CHAIN",
           "FIXTURE_MANIFEST"].contains(classification),
          expectedManifestSHA256.range(of: #"^[a-f0-9]{64}$"#, options: .regularExpression) != nil
    else { throw DisposableQualificationFailure.invalidArguments }
    let runFD = try root.openRun(run)
    defer { close(runFD) }
    var runMetadata = stat()
    var rootMetadata = stat()
    guard fstat(runFD, &runMetadata) == 0, fstat(root.baseFD, &rootMetadata) == 0,
          (runMetadata.st_mode & S_IFMT) == S_IFDIR,
          (runMetadata.st_mode & 0o7777) == 0o700,
          runMetadata.st_uid == getuid(), runMetadata.st_gid == getgid(),
          runMetadata.st_dev == rootMetadata.st_dev
    else {
        throw DisposableQualificationFailure.unsafeRoot
    }
    let names = try directoryEntryNames(fd: runFD)
    let pendingNames = names.filter {
        $0 == "mutation-pending.json" ||
        $0.range(of: #"^mutation-pending-[0-9]{20}\.json$"#,
                 options: .regularExpression) != nil
    }
    guard classification == "FIXTURE_MANIFEST" || !pendingNames.isEmpty else {
        throw DisposableQualificationFailure.assertion("ambiguous pending entry mismatch")
    }
    let otherNames = names.subtracting(pendingNames)
    guard (classification == "FIXTURE_MANIFEST" ||
           classification == "PENDING_ONLY" && pendingNames.count == 1 && otherNames.isEmpty ||
           classification == "PENDING_TEMP" && otherNames.count == 1 &&
             otherNames.allSatisfy({ $0.range(of: #"^temp-[0-9]{20}-[0-9]+\.tmp$"#,
                                                options: .regularExpression) != nil }) ||
           ["PENDING_RECORD", "PENDING_RECORD_MISMATCH"].contains(classification) &&
             pendingNames.count == 1 &&
             otherNames.count == 1 &&
             otherNames.allSatisfy({ $0.range(of: #"^record-[0-9]{20}\.json$"#,
                                                options: .regularExpression) != nil }) ||
           classification == "PENDING_CHAIN" && pendingNames.count >= 2 &&
             otherNames.count == pendingNames.count &&
             otherNames.allSatisfy({ $0.range(of: #"^record-[0-9]{20}\.json$"#,
                                                options: .regularExpression) != nil }) ||
           classification == "PENDING_PARTIAL_CHAIN" && pendingNames.count >= 2 &&
             !otherNames.isEmpty && otherNames.count < pendingNames.count &&
             otherNames.allSatisfy({ $0.range(of: #"^record-[0-9]{20}\.json$"#,
                                                options: .regularExpression) != nil }) ||
           classification == "MISSING_FENCE_CHAIN" && !pendingNames.isEmpty &&
             otherNames.count > pendingNames.count &&
             otherNames.allSatisfy({ $0.range(of: #"^record-[0-9]{20}\.json$"#,
                                                options: .regularExpression) != nil }))
    else { throw DisposableQualificationFailure.assertion("ambiguous entry set mismatch") }
    var manifest = ""
    var pendingDigest: String?
    var recordDigest: String?
    var pendingChain: [UInt64: String] = [:]
    var recordChain: [UInt64: String] = [:]
    for name in names.sorted() {
        var metadata = stat()
        guard fstatat(runFD, name, &metadata, AT_SYMLINK_NOFOLLOW) == 0,
              (metadata.st_mode & S_IFMT) == S_IFREG,
              (metadata.st_mode & 0o7777) == 0o600,
              metadata.st_uid == getuid(), metadata.st_gid == getgid(),
              metadata.st_nlink == 1, metadata.st_dev == runMetadata.st_dev
        else { throw DisposableQualificationFailure.unsafeRoot }
        let fd = openat(runFD, name, O_RDONLY | O_NOFOLLOW | O_CLOEXEC)
        guard fd >= 0 else { throw DisposableQualificationFailure.syscall("ambiguous openat") }
        let bytes = try readAll(fd: fd); close(fd)
        let sha = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
        manifest += "\(name):\(sha)\n"
        if pendingNames.contains(name) {
            guard let value = String(data: bytes, encoding: .utf8),
                  FarmOSCanonicalDigest.isDigest(value) else {
                throw DisposableQualificationFailure.assertion("pending digest malformed")
            }
            pendingDigest = value
            if ["PENDING_CHAIN", "PENDING_PARTIAL_CHAIN", "MISSING_FENCE_CHAIN"]
                .contains(classification) {
                guard let generation = UInt64(
                    name.dropFirst("mutation-pending-".count).dropLast(".json".count)
                ) else { throw DisposableQualificationFailure.assertion("pending generation") }
                pendingChain[generation] = value
            }
        } else if ["PENDING_RECORD", "PENDING_RECORD_MISMATCH"].contains(classification) {
            recordDigest = DisposableRecordValidator.parse(bytes)?.recordDigest ??
                parseHistoricalQualificationRecord(bytes)?.digest
        } else if ["PENDING_CHAIN", "PENDING_PARTIAL_CHAIN", "MISSING_FENCE_CHAIN"]
                    .contains(classification),
                  let record = DisposableRecordValidator.parse(bytes),
                  let generation = UInt64(
                    name.dropFirst("record-".count).dropLast(".json".count)
                  ) {
            recordChain[generation] = record.recordDigest
        } else if !bytes.isEmpty, let record = DisposableRecordValidator.parse(bytes) {
            recordDigest = record.recordDigest
        }
    }
    let manifestSHA = SHA256.hash(data: Data(manifest.utf8))
        .map { String(format: "%02x", $0) }.joined()
    guard manifestSHA == expectedManifestSHA256,
          classification != "PENDING_RECORD" || pendingDigest == recordDigest,
          classification != "PENDING_RECORD_MISMATCH" || pendingDigest != recordDigest,
          classification != "PENDING_TEMP" || recordDigest == nil || pendingDigest == recordDigest,
          classification != "PENDING_CHAIN" || pendingChain == recordChain,
          classification != "PENDING_PARTIAL_CHAIN" ||
            recordChain.allSatisfy({ pendingChain[$0.key] == $0.value }),
          classification != "MISSING_FENCE_CHAIN" ||
            pendingChain.allSatisfy({ recordChain[$0.key] == $0.value })
    else { throw DisposableQualificationFailure.assertion("ambiguous manifest mismatch") }
    print("preserved_run=\(run)")
    print("PRESERVED_CLASSIFICATION=\(classification)")
    print("preserved_evidence_mutated=0")
}

private func childResultCode(_ result: DisposablePublicationResult) -> Int32 {
    switch result {
    case .committed: return 10
    case .casConflict: return 11
    case .alreadyPresent: return 12
    case .rejected: return 13
    case .quarantined: return 14
    case .outcomeUnknown: return 15
    }
}

private func storageChildArguments(
    run: String,
    candidate: DisposableRuntimeRecord,
    marker: Character,
    expectedGeneration: UInt64?,
    expectedDigest: String?,
    fault: DisposableFaultPoint?
) -> [String] {
    [
        "--storage-child", run, String(candidate.generation),
        candidate.previousRecordDigest ?? "-", String(marker),
        expectedGeneration.map(String.init) ?? "-", expectedDigest ?? "-",
        fault?.rawValue ?? "-",
    ]
}

private func launchStorageChild(arguments: [String]) throws -> Process {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
    process.arguments = arguments
    process.environment = [:]
    process.standardOutput = FileHandle.nullDevice
    process.standardError = FileHandle.nullDevice
    try process.run()
    return process
}

private func concurrentPublish(
    root: DisposableQualificationRoot,
    run: String,
    first: DisposableRuntimeRecord,
    second: DisposableRuntimeRecord,
    firstMarker: Character,
    secondMarker: Character,
    expectedGeneration: UInt64?,
    expectedDigest: String?
) throws -> [Int32] {
    let children = try zip([first, second], [firstMarker, secondMarker]).map { candidate, marker in
        try launchStorageChild(arguments: storageChildArguments(
            run: run, candidate: candidate, marker: marker,
            expectedGeneration: expectedGeneration, expectedDigest: expectedDigest, fault: nil
        ))
    }
    var codes: [Int32] = []
    for process in children {
        process.waitUntilExit()
        guard process.terminationReason == .exit else {
            throw DisposableQualificationFailure.syscall("child termination")
        }
        codes.append(process.terminationStatus)
    }
    return codes
}

private func crashAt(
    root: DisposableQualificationRoot,
    run: String,
    candidate: DisposableRuntimeRecord,
    marker: Character,
    point: DisposableFaultPoint
) throws {
    let process = try launchStorageChild(arguments: storageChildArguments(
        run: run, candidate: candidate, marker: marker,
        expectedGeneration: nil, expectedDigest: nil, fault: point
    ))
    process.waitUntilExit()
    guard process.terminationReason == .exit, process.terminationStatus == 70 else {
        throw DisposableQualificationFailure.assertion("fault child did not stop at \(point.rawValue)")
    }
}

private func runStorageChild() -> Never {
    let args = CommandLine.arguments
    guard args.count == 9,
          args[1] == "--storage-child",
          args[2].range(of: #"^run-[a-f0-9]{16}$"#, options: .regularExpression) != nil,
          let generation = UInt64(args[3]),
          args[4] == "-" || FarmOSCanonicalDigest.isDigest(args[4]),
          args[5].range(of: #"^[a-f0-9]$"#, options: .regularExpression) != nil,
          args[6] == "-" || UInt64(args[6]) != nil,
          args[7] == "-" || FarmOSCanonicalDigest.isDigest(args[7]),
          args[8] == "-" || DisposableFaultPoint(rawValue: args[8]) != nil
    else { _exit(98) }
    guard let baseFD = try? DisposableQualificationRoot.openVerifiedRoot() else { _exit(99) }
    defer { close(baseFD) }
    do {
        let candidate = try makeRecord(
            generation: generation,
            previousDigest: args[4] == "-" ? nil : args[4],
            marker: Character(args[5])
        )
        let ledger = try DisposableAPFSLedger(
            openQualificationRunDirectoryAt: baseFD,
            name: args[2]
        )
        if let expectedGeneration = args[6] == "-" ? nil : UInt64(args[6]),
           let expectedDigest = args[7] == "-" ? nil : Optional(args[7]),
           !ledger.explicitlyReconcileQualificationHead(
                expectedGeneration: expectedGeneration, expectedDigest: expectedDigest
           ) {
            _exit(99)
        }
        let selectedFault = args[8] == "-" ? nil : DisposableFaultPoint(rawValue: args[8])
        let result = ledger.publish(
            bytes: candidate.canonicalBytes,
            expectedGeneration: args[6] == "-" ? nil : UInt64(args[6]),
            expectedHeadDigest: args[7] == "-" ? nil : args[7],
            fault: selectedFault.map { point in
                { observed in if observed == point { _exit(70) } }
            }
        )
        _exit(childResultCode(result))
    } catch { _exit(99) }
}

private func runDisposableStorageQualification() throws {
    let args = CommandLine.arguments
    guard args.count >= 6, args[1] == "--disposable-storage",
          (args.count - 2).isMultiple(of: 4) else {
        throw DisposableQualificationFailure.invalidArguments
    }
    enum PreservedEvidence {
        case record(run: String, fileSHA: String, recordDigest: String)
        case orphan(run: String, tempName: String, fileSHA: String)
        case ambiguous(run: String, classification: String, manifestSHA: String)

        var run: String {
            switch self {
            case let .record(run, _, _), let .orphan(run, _, _),
                 let .ambiguous(run, _, _): return run
            }
        }
    }
    var preserved: [PreservedEvidence] = []
    var index = 2
    while index < args.count {
        switch args[index] {
        case "--preserved-record":
            preserved.append(.record(
                run: args[index + 1], fileSHA: args[index + 2],
                recordDigest: args[index + 3]
            ))
        case "--preserved-orphan":
            preserved.append(.orphan(
                run: args[index + 1], tempName: args[index + 2],
                fileSHA: args[index + 3]
            ))
        case "--preserved-ambiguous":
            preserved.append(.ambiguous(
                run: args[index + 1], classification: args[index + 2],
                manifestSHA: args[index + 3]
            ))
        default:
            throw DisposableQualificationFailure.invalidArguments
        }
        index += 4
    }
    let root = try DisposableQualificationRoot(
        preservedRunNames: Set(preserved.map(\.run))
    )
    var recordedResults: [String] = []

    for evidence in preserved {
        switch evidence {
        case let .record(run, fileSHA, recordDigest):
            try reconcilePreservedRun(
                root: root, run: run, expectedFileSHA256: fileSHA,
                expectedRecordDigest: recordDigest
            )
        case let .orphan(run, tempName, fileSHA):
            try reconcilePreservedOrphan(
                root: root, run: run, tempName: tempName,
                expectedFileSHA256: fileSHA
            )
        case let .ambiguous(run, classification, manifestSHA):
            try reconcilePreservedAmbiguous(
                root: root, run: run, classification: classification,
                expectedManifestSHA256: manifestSHA
            )
        }
    }

    let probeRun = try root.makeRun()
    let probeFD = try root.openRun(probeRun)
    let probe = DirectoryDurabilityProbe.run(directoryFD: probeFD)
    close(probeFD)
    print("directory_fsync=\(probe.fsyncStatus.rawValue)")
    print("directory_f_fullfsync=\(probe.fullFsyncStatus.rawValue)")
    print("directory_filesystem=\(probe.filesystemType)")
    guard probe.filesystemType == "apfs",
          probe.fullFsyncStatus == .success,
          probe.selectedPrimitive == "F_FULLFSYNC_DIRECTORY"
    else { throw DisposableQualificationFailure.assertion("directory durability unsupported") }
    recordedResults.append("directory-durability-probe")

    let baseRun = try root.makeRun()
    let baseLedger = try DisposableAPFSLedger(openQualificationRunDirectoryAt: root.baseFD, name: baseRun)
    let genesis = try makeRecord(generation: 0, previousDigest: nil, marker: "a")
    let forgedNested = try mutateAndReseal(genesis.canonicalBytes) { body in
        guard var event = body["event"] as? [String: Any],
              var payload = event["payload"] as? [String: Any],
              var decision = payload["human_approval_decision_body_candidate"] as? [String: Any]
        else { throw DisposableQualificationFailure.assertion("nested fixture") }
        decision["decision"] = "DENY"
        payload["human_approval_decision_body_candidate"] = decision
        event["payload"] = payload
        body["event"] = event
    }
    try require(DisposableRecordValidator.parse(forgedNested) == nil,
                "nested R4-1 forgery accepted")
    let forgedFlat = try mutateAndReseal(genesis.canonicalBytes) { body in
        guard var event = body["event"] as? [String: Any],
              var payload = event["payload"] as? [String: Any]
        else { throw DisposableQualificationFailure.assertion("flat fixture") }
        payload["approval_decision_actor_reference_digest_candidate"] =
            "sha256:" + String(repeating: "0", count: 64)
        event["payload"] = payload
        body["event"] = event
    }
    try require(DisposableRecordValidator.parse(forgedFlat) == nil,
                "flattened approval lineage forgery accepted")
    let selfConsistentAlternate = try mutateAndReseal(genesis.canonicalBytes) { body in
        guard var event = body["event"] as? [String: Any],
              var payload = event["payload"] as? [String: Any],
              var projection = body["projected_source_state_claim"] as? [String: Any]
        else { throw DisposableQualificationFailure.assertion("alternate fixture") }
        let alternate = "sha256:" + String(repeating: "0", count: 64)
        payload["actor_reference_digest_candidate"] = alternate
        projection["actor_reference_digest_candidate"] = alternate
        event["payload"] = payload
        body["event"] = event
        body["projected_source_state_claim"] = projection
    }
    try require(DisposableRecordValidator.parse(selfConsistentAlternate) == nil,
                "self-consistent alternate Gen0 accepted")
    try require(baseLedger.publish(
        bytes: forgedNested, expectedGeneration: nil, expectedHeadDigest: nil
    ) == .rejected, "storage overrode R4-1 parser rejection")
    recordedResults.append("r4-1-independent-revalidation")
    let genesisResult = baseLedger.publish(
        bytes: genesis.canonicalBytes, expectedGeneration: nil, expectedHeadDigest: nil
    )
    try require(genesisResult == .committed, "genesis commit \(genesisResult.rawValue)")
    let replayed = try baseLedger.replay()
    try require(replayed.generation == 0 && replayed.digest == genesis.recordDigest &&
                replayed.records == 1,
                "genesis replay")
    let baseReadbackLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: baseRun
    )
    try require(baseReadbackLedger.publish(
        bytes: genesis.canonicalBytes, expectedGeneration: nil, expectedHeadDigest: nil
    ) == .alreadyPresent, "no replace trusted readback")
    let generationOne = try makeRecord(
        generation: 1, previousDigest: genesis.recordDigest, marker: "b"
    )
    try require(baseLedger.publish(
        bytes: generationOne.canonicalBytes,
        expectedGeneration: nil,
        expectedHeadDigest: nil
    ) == .casConflict, "stale CAS")
    recordedResults.append("real-publication")

    let bindingSwitch = try mutateAndReseal(generationOne.canonicalBytes) { body in
        guard var bindings = body["source_bindings"] as? [String: Any]
        else { throw DisposableQualificationFailure.assertion("binding fixture") }
        bindings["native_profile_digest_candidate"] =
            "sha256:" + String(repeating: "0", count: 64)
        body["source_bindings"] = bindings
    }
    try require(baseLedger.publish(
        bytes: bindingSwitch, expectedGeneration: 0, expectedHeadDigest: genesis.recordDigest
    ) == .rejected, "source binding switch accepted")
    recordedResults.append("source-binding-continuity")

    let projectionSwitch = try mutateAndReseal(generationOne.canonicalBytes) { body in
        guard var projection = body["projected_source_state_claim"] as? [String: Any]
        else { throw DisposableQualificationFailure.assertion("projection fixture") }
        projection["actor_reference_digest_candidate"] =
            "sha256:" + String(repeating: "0", count: 64)
        body["projected_source_state_claim"] = projection
    }
    try require(baseLedger.publish(
        bytes: projectionSwitch, expectedGeneration: 0,
        expectedHeadDigest: genesis.recordDigest
    ) == .rejected, "projection switch reached publication")

    let terminalRun = try root.makeRun()
    let terminalLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: terminalRun
    )
    let terminalGenesis = try makeRecord(generation: 0, previousDigest: nil, marker: "1")
    try require(terminalLedger.publish(
        bytes: terminalGenesis.canonicalBytes, expectedGeneration: nil,
        expectedHeadDigest: nil
    ) == .committed, "terminal genesis")
    let terminalOne = try makeRecord(
        generation: 1, previousDigest: terminalGenesis.recordDigest, marker: "2"
    )
    try require(terminalLedger.publish(
        bytes: terminalOne.canonicalBytes, expectedGeneration: 0,
        expectedHeadDigest: terminalGenesis.recordDigest
    ) == .committed, "terminal event")
    let terminalTwo = try makeRecord(
        generation: 2, previousDigest: terminalOne.recordDigest, marker: "3"
    )
    try require(terminalLedger.publish(
        bytes: terminalTwo.canonicalBytes, expectedGeneration: 1,
        expectedHeadDigest: terminalOne.recordDigest
    ) == .rejected, "repeated terminal transition accepted")
    recordedResults.append("terminal-transition")

    let hostileCollisionRun = try root.makeRun()
    let hostileFD = try root.openRun(hostileCollisionRun); defer { close(hostileFD) }
    try writeFixture(
        runFD: hostileFD, name: DisposableAPFSLedger.recordName(0),
        bytes: genesis.canonicalBytes
    )
    try writeFixture(runFD: hostileFD, name: "unexpected", bytes: Data("x".utf8))
    let hostileLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: hostileCollisionRun
    )
    try require(hostileLedger.publish(
        bytes: genesis.canonicalBytes, expectedGeneration: nil, expectedHeadDigest: nil
    ) == .quarantined, "collision bypassed full-chain replay")
    recordedResults.append("hostile-collision-replay")

    let stalePendingRun = try root.makeRun()
    let stalePendingLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: stalePendingRun
    )
    let staleGenesis = try makeRecord(generation: 0, previousDigest: nil, marker: "4")
    try require(stalePendingLedger.publish(
        bytes: staleGenesis.canonicalBytes, expectedGeneration: nil, expectedHeadDigest: nil
    ) == .committed, "stale pending seed")
    let staleFD = try root.openRun(stalePendingRun); defer { close(staleFD) }
    try writeFixture(
        runFD: staleFD, name: DisposableAPFSLedger.pendingAttemptName(1),
        bytes: Data(("sha256:" + String(repeating: "0", count: 64)).utf8)
    )
    try require(try stalePendingLedger.explicitlyReclassifyAfterTrustedReadback(exact: staleGenesis)
        == .outcomeUnknown, "stale head recognized for different pending attempt")
    try root.preserveRun(stalePendingRun)
    recordedResults.append("pending-attempt-binding")

    let cleanFailureRun = try root.makeRun()
    let cleanFailureLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: cleanFailureRun
    )
    let cleanFailureRecord = try makeRecord(generation: 0, previousDigest: nil, marker: "5")
    try require(cleanFailureLedger.publish(
        bytes: cleanFailureRecord.canonicalBytes, expectedGeneration: nil,
        expectedHeadDigest: nil, simulateTempOpenFailure: true
    ) == .outcomeUnknown, "fenced temp-open failure classification")
    do {
        _ = try cleanFailureLedger.replay()
        throw DisposableQualificationFailure.assertion("fenced failure replayed cleanly")
    } catch DarwinStorageValidationFailure.outcomeUnknown {}
    try root.preserveRun(cleanFailureRun)
    let unknownCleanupRun = try root.makeRun()
    let unknownCleanupLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: unknownCleanupRun
    )
    let unknownCleanupRecord = try makeRecord(generation: 0, previousDigest: nil, marker: "6")
    try require(unknownCleanupLedger.publish(
        bytes: unknownCleanupRecord.canonicalBytes, expectedGeneration: nil,
        expectedHeadDigest: nil, simulateTempOpenFailure: true,
        simulateCleanupFailure: true
    ) == .outcomeUnknown, "cleanup failure not unknown")
    try root.preserveRun(unknownCleanupRun)
    let partialCleanupRun = try root.makeRun()
    let partialCleanupLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: partialCleanupRun
    )
    let partialCleanupRecord = try makeRecord(generation: 0, previousDigest: nil, marker: "7")
    try require(partialCleanupLedger.publish(
        bytes: partialCleanupRecord.canonicalBytes, expectedGeneration: nil,
        expectedHeadDigest: nil, simulatePostUnlinkDirectorySyncFailure: true
    ) == .outcomeUnknown, "post-unlink sync failure not unknown")
    let partialReopen = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: partialCleanupRun
    )
    let partialNext = try makeRecord(
        generation: 1, previousDigest: partialCleanupRecord.recordDigest, marker: "8"
    )
    try require(partialReopen.publish(
        bytes: partialNext.canonicalBytes, expectedGeneration: 0,
        expectedHeadDigest: partialCleanupRecord.recordDigest
    ) == .outcomeUnknown, "restored fence did not block fresh N+1")
    try root.preserveRun(partialCleanupRun)
    let renameFailureRun = try root.makeRun()
    let renameFailureLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: renameFailureRun
    )
    let renameFailureRecord = try makeRecord(generation: 0, previousDigest: nil, marker: "9")
    try require(renameFailureLedger.publish(
        bytes: renameFailureRecord.canonicalBytes, expectedGeneration: nil,
        expectedHeadDigest: nil, simulateRenameFailure: true
    ) == .outcomeUnknown, "rename failure reported known rejection")
    try root.preserveRun(renameFailureRun)
    recordedResults.append("cleanup-failure-classification")

    let sameRun = try root.makeRun()
    let sameLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: sameRun
    )
    let sameGenesis = try makeRecord(generation: 0, previousDigest: nil, marker: "c")
    try require(sameLedger.publish(
        bytes: sameGenesis.canonicalBytes, expectedGeneration: nil, expectedHeadDigest: nil
    ) == .committed, "same concurrency seed")
    let sameNext = try makeRecord(
        generation: 1, previousDigest: sameGenesis.recordDigest, marker: "c"
    )
    let sameCodes = try concurrentPublish(
        root: root, run: sameRun, first: sameNext, second: sameNext,
        firstMarker: "c", secondMarker: "c",
        expectedGeneration: 0, expectedDigest: sameGenesis.recordDigest
    )
    try require(sameCodes.sorted() == [10, 12], "same candidate concurrency")
    let sameHead = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: sameRun
    ).trustedQualificationReadback()
    try require(sameHead.records == 2 && sameHead.digest == sameNext.recordDigest,
                "same candidate one winner")
    recordedResults.append("same-candidate-cas")

    let divergentRun = try root.makeRun()
    let divergentLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: divergentRun
    )
    let divergentGenesis = try makeRecord(generation: 0, previousDigest: nil, marker: "d")
    try require(divergentLedger.publish(
        bytes: divergentGenesis.canonicalBytes, expectedGeneration: nil,
        expectedHeadDigest: nil
    ) == .committed, "divergent concurrency seed")
    let divergentA = try makeRecord(
        generation: 1, previousDigest: divergentGenesis.recordDigest, marker: "d"
    )
    let divergentB = try makeRecord(
        generation: 1, previousDigest: divergentGenesis.recordDigest, marker: "e"
    )
    let divergentCodes = try concurrentPublish(
        root: root, run: divergentRun, first: divergentA, second: divergentB,
        firstMarker: "d", secondMarker: "e",
        expectedGeneration: 0, expectedDigest: divergentGenesis.recordDigest
    )
    try require(divergentCodes.sorted() == [10, 11], "divergent CAS")
    try require(try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: divergentRun
    ).trustedQualificationReadback().records == 2, "divergent one winner")
    recordedResults.append("divergent-cas")

    let missingAllFenceRun = try root.makeRun()
    let missingAllFenceFD = try root.openRun(missingAllFenceRun)
    try writeFixture(
        runFD: missingAllFenceFD, name: DisposableAPFSLedger.recordName(0),
        bytes: genesis.canonicalBytes
    )
    close(missingAllFenceFD)
    let missingAllFenceLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: missingAllFenceRun
    )
    let missingAllFenceNext = try makeRecord(
        generation: 1, previousDigest: genesis.recordDigest, marker: "f"
    )
    try require(missingAllFenceLedger.publish(
        bytes: missingAllFenceNext.canonicalBytes, expectedGeneration: 0,
        expectedHeadDigest: genesis.recordDigest
    ) == .outcomeUnknown, "all fences removed allowed fresh N+1")

    let missingMiddleFenceRun = try root.makeRun()
    let missingMiddleFenceFD = try root.openRun(missingMiddleFenceRun)
    try writeFixture(
        runFD: missingMiddleFenceFD, name: DisposableAPFSLedger.recordName(0),
        bytes: sameGenesis.canonicalBytes
    )
    try writeFixture(
        runFD: missingMiddleFenceFD, name: DisposableAPFSLedger.pendingAttemptName(0),
        bytes: Data(sameGenesis.recordDigest.utf8)
    )
    try writeFixture(
        runFD: missingMiddleFenceFD, name: DisposableAPFSLedger.recordName(1),
        bytes: sameNext.canonicalBytes
    )
    close(missingMiddleFenceFD)
    let missingMiddleFenceLedger = try DisposableAPFSLedger(
        openQualificationRunDirectoryAt: root.baseFD, name: missingMiddleFenceRun
    )
    let missingMiddleFenceNext = try makeRecord(
        generation: 2, previousDigest: sameNext.recordDigest, marker: "f"
    )
    try require(missingMiddleFenceLedger.publish(
        bytes: missingMiddleFenceNext.canonicalBytes, expectedGeneration: 1,
        expectedHeadDigest: sameNext.recordDigest
    ) == .outcomeUnknown, "middle fence removed allowed fresh N+1")
    try root.preserveRun(missingAllFenceRun)
    try root.preserveRun(missingMiddleFenceRun)
    recordedResults.append("fence-coverage-deletion")

    for (index, point) in DisposableFaultPoint.allCases.enumerated() {
        let run = try root.makeRun()
        let candidate = try makeRecord(
            generation: 0, previousDigest: nil,
            marker: Character(String(format: "%x", index + 1))
        )
        let marker = Character(String(format: "%x", index + 1))
        try crashAt(root: root, run: run, candidate: candidate, marker: marker, point: point)
        let ledger = try DisposableAPFSLedger(
            openQualificationRunDirectoryAt: root.baseFD, name: run
        )
        switch point {
        case .beforeTempCreation:
            do {
                _ = try ledger.replay()
                throw DisposableQualificationFailure.assertion("pending attempt not durable")
            } catch DarwinStorageValidationFailure.outcomeUnknown {}
            try root.preserveRun(run)
        case .afterTempCreation, .afterWriteBeforeFileDurability,
             .afterFileDurabilityBeforePublication:
            do {
                _ = try ledger.replay()
                throw DisposableQualificationFailure.assertion("orphan accepted")
            } catch DarwinStorageValidationFailure.outcomeUnknown {}
            try root.preserveRun(run)
        case .afterPublicationBeforeDirectoryDurability,
             .afterDirectoryDurabilityBeforeReadback,
             .afterReadbackBeforeAcknowledgement,
             .callerLossAfterPublication:
            try require(try ledger.explicitlyReclassifyAfterTrustedReadback(exact: candidate)
                == .alreadyPresent, "trusted readback recognition")
            let nextCandidate = try makeRecord(
                generation: 1, previousDigest: candidate.recordDigest, marker: "f"
            )
            let reopened = try DisposableAPFSLedger(
                openQualificationRunDirectoryAt: root.baseFD, name: run
            )
            try require(reopened.publish(
                bytes: nextCandidate.canonicalBytes,
                expectedGeneration: 0,
                expectedHeadDigest: candidate.recordDigest
            ) == .outcomeUnknown, "fresh-process unknown did not block N+1")
            try root.preserveRun(run)
        }
        recordedResults.append("crash-\(point.rawValue)")
    }

    let malformedRun = try root.makeRun()
    let malformedFD = try root.openRun(malformedRun); defer { close(malformedFD) }
    try writeFixture(
        runFD: malformedFD,
        name: DisposableAPFSLedger.recordName(0),
        bytes: Data("truncated".utf8)
    )
    do {
        _ = try DisposableAPFSLedger(
            openQualificationRunDirectoryAt: root.baseFD, name: malformedRun
        ).replay()
        throw DisposableQualificationFailure.assertion("malformed accepted")
    } catch DarwinStorageValidationFailure.malformedRecord {}
    recordedResults.append("malformed")

    let unexpectedRun = try root.makeRun()
    let unexpectedFD = try root.openRun(unexpectedRun); defer { close(unexpectedFD) }
    try writeFixture(runFD: unexpectedFD, name: "unexpected", bytes: Data("x".utf8))
    do {
        _ = try DisposableAPFSLedger(
            openQualificationRunDirectoryAt: root.baseFD, name: unexpectedRun
        ).replay()
        throw DisposableQualificationFailure.assertion("unexpected accepted")
    } catch DarwinStorageValidationFailure.unexpectedEntry {}
    recordedResults.append("unexpected")

    let missingRun = try root.makeRun()
    let missingFD = try root.openRun(missingRun); defer { close(missingFD) }
    let missingRecord = try makeRecord(generation: 1, previousDigest: digestA, marker: "f")
    try writeFixture(
        runFD: missingFD,
        name: DisposableAPFSLedger.recordName(1),
        bytes: missingRecord.canonicalBytes
    )
    do {
        _ = try DisposableAPFSLedger(
            openQualificationRunDirectoryAt: root.baseFD, name: missingRun
        ).replay()
        throw DisposableQualificationFailure.assertion("missing generation accepted")
    } catch DarwinStorageValidationFailure.corruptChain {}
    recordedResults.append("missing")

    let symlinkRun = try root.makeRun()
    let symlinkFD = try root.openRun(symlinkRun); defer { close(symlinkFD) }
    try require(symlinkat("nonexistent", symlinkFD, DisposableAPFSLedger.recordName(0)) == 0,
                "symlink fixture")
    do {
        _ = try DisposableAPFSLedger(
            openQualificationRunDirectoryAt: root.baseFD, name: symlinkRun
        ).replay()
        throw DisposableQualificationFailure.assertion("symlink accepted")
    } catch DarwinStorageValidationFailure.malformedRecord {}
    recordedResults.append("symlink")

    let hardlinkRun = try root.makeRun()
    let hardlinkFD = try root.openRun(hardlinkRun); defer { close(hardlinkFD) }
    let hardlinkPeerRun = try root.makeRun()
    let hardlinkPeerFD = try root.openRun(hardlinkPeerRun); defer { close(hardlinkPeerFD) }
    try writeFixture(
        runFD: hardlinkFD, name: DisposableAPFSLedger.recordName(0),
        bytes: genesis.canonicalBytes
    )
    try require(linkat(
        hardlinkFD, DisposableAPFSLedger.recordName(0), hardlinkPeerFD, "peer-link", 0
    ) == 0, "hardlink fixture")
    do {
        _ = try DisposableAPFSLedger(
            openQualificationRunDirectoryAt: root.baseFD, name: hardlinkRun
        ).replay()
        throw DisposableQualificationFailure.assertion("hardlink accepted")
    } catch DarwinStorageValidationFailure.malformedRecord {}
    recordedResults.append("hardlink")

    let modeRun = try root.makeRun()
    let modeFD = try root.openRun(modeRun); defer { close(modeFD) }
    try writeFixture(
        runFD: modeFD, name: DisposableAPFSLedger.recordName(0),
        bytes: genesis.canonicalBytes, mode: 0o644
    )
    do {
        _ = try DisposableAPFSLedger(
            openQualificationRunDirectoryAt: root.baseFD, name: modeRun
        ).replay()
        throw DisposableQualificationFailure.assertion("wrong mode accepted")
    } catch DarwinStorageValidationFailure.malformedRecord {}
    recordedResults.append("mode")

    let corruptRun = try root.makeRun()
    let corruptFD = try root.openRun(corruptRun); defer { close(corruptFD) }
    var corruptBytes = genesis.canonicalBytes
    corruptBytes[corruptBytes.index(before: corruptBytes.endIndex)] = UInt8(ascii: " ")
    try writeFixture(
        runFD: corruptFD, name: DisposableAPFSLedger.recordName(0), bytes: corruptBytes
    )
    do {
        _ = try DisposableAPFSLedger(
            openQualificationRunDirectoryAt: root.baseFD, name: corruptRun
        ).replay()
        throw DisposableQualificationFailure.assertion("corrupt record accepted")
    } catch DarwinStorageValidationFailure.malformedRecord {}
    recordedResults.append("corrupt")

    try require(recordedResults.count == 26, "qualification result count")
    try root.cleanOwnedRunsAfterRecordedResults()
    print("R4-3 disposable APFS qualification PASS: \(recordedResults.count) groups")
    print("canonical_root_operations=0 native_install_operations=0 automatic_retry=0")
}

if CommandLine.arguments.count > 1 && CommandLine.arguments[1] == "--storage-child" {
    runStorageChild()
}

do {
    try runSourceQualification()
    if CommandLine.arguments.count > 1 {
        try runDisposableStorageQualification()
    }
} catch {
    FileHandle.standardError.write(Data(
        "R4 native qualification FAIL: \(String(describing: error))\n".utf8
    ))
    exit(EXIT_FAILURE)
}
