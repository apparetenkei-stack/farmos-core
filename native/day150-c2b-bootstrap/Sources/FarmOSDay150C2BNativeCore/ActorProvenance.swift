import Foundation

public struct ActorAuthenticationResultCandidate: Equatable, Sendable {
    public let mechanismRevision: String
    public let authorizationResultReferenceDigest: String
    public let interactive: Bool
    public let acceptedByNativeBoundary: Bool

    public init(
        mechanismRevision: String,
        authorizationResultReferenceDigest: String,
        interactive: Bool,
        acceptedByNativeBoundary: Bool
    ) {
        self.mechanismRevision = mechanismRevision
        self.authorizationResultReferenceDigest = authorizationResultReferenceDigest
        self.interactive = interactive
        self.acceptedByNativeBoundary = acceptedByNativeBoundary
    }
}

public enum ActorProvenanceFailure: String, Equatable, Sendable {
    case authenticationRejected = "AUTHENTICATION_RESULT_REJECTED"
    case mechanismMismatch = "AUTHENTICATION_MECHANISM_MISMATCH"
    case malformedAuthorizationReference = "MALFORMED_AUTHORIZATION_REFERENCE"
    case malformedInstallationBinding = "MALFORMED_INSTALLATION_BINDING"
    case emptyGeneratedUID = "EMPTY_GENERATED_UID"
}

public enum ActorProvenanceResult: Equatable, Sendable {
    case structurallyValidReferenceCandidate(String)
    case rejected(ActorProvenanceFailure)
}

public enum NativeActorProvenanceSource {
    public static let authenticationMechanismRevision =
        "farmos.day150-c2b-macos-interactive-authentication.v1"
    private static let generatedUIDPattern = try! NSRegularExpression(
        pattern: #"^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$"#
    )

    public static func deriveReferenceCandidate(
        authentication: ActorAuthenticationResultCandidate,
        generatedUIDTransient: String,
        installationProfileDigest: String
    ) -> ActorProvenanceResult {
        guard authentication.interactive && authentication.acceptedByNativeBoundary else {
            return .rejected(.authenticationRejected)
        }
        guard authentication.mechanismRevision == authenticationMechanismRevision else {
            return .rejected(.mechanismMismatch)
        }
        guard FarmOSCanonicalDigest.isDigest(authentication.authorizationResultReferenceDigest) else {
            return .rejected(.malformedAuthorizationReference)
        }
        guard FarmOSCanonicalDigest.isDigest(installationProfileDigest) else {
            return .rejected(.malformedInstallationBinding)
        }
        let generatedUIDRange = NSRange(
            generatedUIDTransient.startIndex..<generatedUIDTransient.endIndex,
            in: generatedUIDTransient
        )
        guard generatedUIDPattern.firstMatch(
            in: generatedUIDTransient,
            range: generatedUIDRange
        ) != nil else {
            return .rejected(.emptyGeneratedUID)
        }
        let canonical: String
        do {
            canonical = try FarmOSCanonicalDigest.canonicalJSON([
                "generated_uid_transient": generatedUIDTransient,
                "installation_profile_digest": installationProfileDigest,
            ])
        } catch {
            return .rejected(.emptyGeneratedUID)
        }
        return .structurallyValidReferenceCandidate(FarmOSCanonicalDigest.sha256(
            domain: FarmOSDay150C2BNativeAuthority.actorReferenceDigestDomain,
            canonicalValue: canonical
        ))
    }

    public static let rawGeneratedUIDPersisted = false
    public static let usernamePersisted = false
    public static let authenticationBlobPersisted = false
    public static let actorEstablished = false
}
