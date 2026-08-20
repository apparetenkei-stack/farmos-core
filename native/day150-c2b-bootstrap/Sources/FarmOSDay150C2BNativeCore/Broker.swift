import Foundation

public struct BrokerPeerCandidate: Equatable, Sendable {
    public let transportClass: String
    public let auditTokenDigestCandidate: String
    public let peerValidationRevision: String

    public init(
        transportClass: String,
        auditTokenDigestCandidate: String,
        peerValidationRevision: String
    ) {
        self.transportClass = transportClass
        self.auditTokenDigestCandidate = auditTokenDigestCandidate
        self.peerValidationRevision = peerValidationRevision
    }
}

public enum BrokerCandidateFailure: String, Equatable, Sendable {
    case malformedPeer = "MALFORMED_PEER_CANDIDATE"
    case malformedRequest = "MALFORMED_REQUEST_CANDIDATE"
    case unsupportedOperation = "UNSUPPORTED_BROKER_OPERATION"
}

public enum BrokerCandidateDecision: Equatable, Sendable {
    case boundedDispatchCandidate(operation: NativeProtocolOperation)
    case rejected(BrokerCandidateFailure)
}

public enum NativeBrokerSource {
    private static let brokerOperations: Set<NativeProtocolOperation> = [
        .validateBootstrapCeremony,
        .validateActorProvenance,
        .observeClockProvenance,
    ]

    public static func validate(
        peer: BrokerPeerCandidate,
        requestData: Data
    ) -> BrokerCandidateDecision {
        guard peer.transportClass == "PRIVATE_LOCAL_BOUNDED_CHANNEL_CANDIDATE",
              FarmOSCanonicalDigest.isDigest(peer.auditTokenDigestCandidate),
              peer.peerValidationRevision == "farmos.day150-c2b-native-peer-validation.v1"
        else { return .rejected(.malformedPeer) }
        guard case let .structurallyValidCandidate(request) = NativeProtocolCodec.parse(requestData),
              request.messageKind == "BOUNDED_REQUEST_CANDIDATE"
        else { return .rejected(.malformedRequest) }
        guard brokerOperations.contains(request.operation) else {
            return .rejected(.unsupportedOperation)
        }
        return .boundedDispatchCandidate(operation: request.operation)
    }

    public static func validateInstalledPeer(
        identity: InstalledBrokerIdentityCapability,
        requestData: Data
    ) -> BrokerCandidateDecision {
        guard FarmOSCanonicalDigest.isDigest(identity.identityDigest),
              FarmOSCanonicalDigest.isDigest(identity.adoptionProfileDigest)
        else { return .rejected(.malformedPeer) }
        guard case let .structurallyValidCandidate(request) = NativeProtocolCodec.parse(requestData),
              request.messageKind == "BOUNDED_REQUEST_CANDIDATE"
        else { return .rejected(.malformedRequest) }
        guard brokerOperations.contains(request.operation) else {
            return .rejected(.unsupportedOperation)
        }
        return .boundedDispatchCandidate(operation: request.operation)
    }

    public static let ledgerWriteAuthority = false
    public static let shellAuthority = false
    public static let dockerAuthority = false
    public static let databaseAuthority = false
    public static let networkAuthority = false
    public static let runtimeActivationEstablished = false
}
