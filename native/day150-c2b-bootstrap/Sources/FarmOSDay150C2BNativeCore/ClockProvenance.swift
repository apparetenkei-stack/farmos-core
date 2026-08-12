import Foundation

public struct ClockObservationFixture: Equatable, Sendable {
    public let osUTC: String
    public let continuousLowerNanoseconds: UInt64
    public let continuousUpperNanoseconds: UInt64
    public let bootSessionReferenceDigest: String

    public init(
        osUTC: String,
        continuousLowerNanoseconds: UInt64,
        continuousUpperNanoseconds: UInt64,
        bootSessionReferenceDigest: String
    ) {
        self.osUTC = osUTC
        self.continuousLowerNanoseconds = continuousLowerNanoseconds
        self.continuousUpperNanoseconds = continuousUpperNanoseconds
        self.bootSessionReferenceDigest = bootSessionReferenceDigest
    }
}

public enum ClockProvenanceFailure: String, Equatable, Sendable {
    case callerTimestampNotAuthority = "CALLER_TIMESTAMP_NOT_AUTHORITY"
    case malformedTimestamp = "MALFORMED_OS_UTC_FIXTURE"
    case malformedContinuousBracket = "MALFORMED_CONTINUOUS_BRACKET"
    case malformedBootSession = "MALFORMED_BOOT_SESSION_REFERENCE"
    case bootSessionMismatch = "BOOT_SESSION_MISMATCH"
}

public enum ClockProvenanceResult: Equatable, Sendable {
    case structurallyValidObservationCandidate(ClockObservationFixture)
    case rejected(ClockProvenanceFailure)
}

public enum NativeClockProvenanceSource {
    private static let timestampPattern = try! NSRegularExpression(
        pattern: #"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]{3}Z$"#
    )

    public static func validateInjectedFixture(
        _ fixture: ClockObservationFixture,
        expectedBootSessionReferenceDigest: String
    ) -> ClockProvenanceResult {
        let range = NSRange(fixture.osUTC.startIndex..<fixture.osUTC.endIndex, in: fixture.osUTC)
        guard timestampPattern.firstMatch(in: fixture.osUTC, range: range) != nil else {
            return .rejected(.malformedTimestamp)
        }
        guard fixture.continuousLowerNanoseconds <= fixture.continuousUpperNanoseconds else {
            return .rejected(.malformedContinuousBracket)
        }
        guard FarmOSCanonicalDigest.isDigest(fixture.bootSessionReferenceDigest) else {
            return .rejected(.malformedBootSession)
        }
        guard fixture.bootSessionReferenceDigest == expectedBootSessionReferenceDigest else {
            return .rejected(.bootSessionMismatch)
        }
        return .structurallyValidObservationCandidate(fixture)
    }

    public static func rejectCallerTimestamp() -> ClockProvenanceResult {
        .rejected(.callerTimestampNotAuthority)
    }

    public static let hostClockObservedForAuthority = false
    public static let trustedClockEstablished = false
    public static let epochActivated = false
    public static let durableFloorPublished = false
}
