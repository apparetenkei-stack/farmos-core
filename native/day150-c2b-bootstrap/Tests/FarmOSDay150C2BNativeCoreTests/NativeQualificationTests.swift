import Darwin
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

do {
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
} catch {
    fail("unexpected test error")
}

FileHandle.standardOutput.write(Data("R4-2 native qualification PASS: 10 groups\n".utf8))
