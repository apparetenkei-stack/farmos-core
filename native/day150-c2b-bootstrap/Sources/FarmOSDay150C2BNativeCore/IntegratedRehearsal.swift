import Darwin
import CryptoKit
import Foundation
import Security

public struct NativeTrustedClockObservation: Sendable {
    public let osUTC: String
    public let continuousLowerNanoseconds: UInt64
    public let continuousUpperNanoseconds: UInt64
    public let continuousBracketReferenceDigest: String
    public let bootSessionReferenceDigest: String
    public let observationReferenceDigest: String

    public init(
        osUTC: String,
        continuousLowerNanoseconds: UInt64,
        continuousUpperNanoseconds: UInt64,
        continuousBracketReferenceDigest: String,
        bootSessionReferenceDigest: String,
        observationReferenceDigest: String
    ) {
        self.osUTC = osUTC
        self.continuousLowerNanoseconds = continuousLowerNanoseconds
        self.continuousUpperNanoseconds = continuousUpperNanoseconds
        self.continuousBracketReferenceDigest = continuousBracketReferenceDigest
        self.bootSessionReferenceDigest = bootSessionReferenceDigest
        self.observationReferenceDigest = observationReferenceDigest
    }
}

public enum NativeTrustedClockObserver {
    public static func observe(installationProfileDigest: String) -> NativeTrustedClockObservation? {
        guard FarmOSCanonicalDigest.isDigest(installationProfileDigest) else { return nil }
        let lower = continuousNanoseconds()
        var realtime = timespec()
        guard clock_gettime(CLOCK_REALTIME, &realtime) == 0,
              let boot = bootSessionReference(installationProfileDigest: installationProfileDigest)
        else { return nil }
        let upper = continuousNanoseconds()
        guard lower <= upper,
              let osUTC = utcString(seconds: realtime.tv_sec, nanoseconds: realtime.tv_nsec)
        else { return nil }
        let bracketBody: [String: Any] = [
            "continuous_lower_nanoseconds": NSNumber(value: lower),
            "continuous_upper_nanoseconds": NSNumber(value: upper),
            "boot_session_reference_digest": boot,
        ]
        guard let bracketCanonical = try? FarmOSCanonicalDigest.canonicalJSON(bracketBody) else {
            return nil
        }
        let bracket = FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-c2b-continuous-time-bracket.v1",
            canonicalValue: bracketCanonical
        )
        let observationBody: [String: Any] = [
            "os_utc": osUTC,
            "continuous_time_bracket_reference_digest": bracket,
            "boot_session_reference_digest": boot,
            "clock_source": "CLOCK_REALTIME_AND_MACH_CONTINUOUS_TIME",
        ]
        guard let observationCanonical = try? FarmOSCanonicalDigest.canonicalJSON(observationBody) else {
            return nil
        }
        return NativeTrustedClockObservation(
            osUTC: osUTC,
            continuousLowerNanoseconds: lower,
            continuousUpperNanoseconds: upper,
            continuousBracketReferenceDigest: bracket,
            bootSessionReferenceDigest: boot,
            observationReferenceDigest: FarmOSCanonicalDigest.sha256(
                domain: "farmos.day150-c2b-os-clock-observation.v1",
                canonicalValue: observationCanonical
            )
        )
    }

    private static func continuousNanoseconds() -> UInt64 {
        var timebase = mach_timebase_info_data_t()
        mach_timebase_info(&timebase)
        let ticks = mach_continuous_time()
        let product = ticks.multipliedFullWidth(by: UInt64(timebase.numer))
        let divided = UInt64(timebase.denom).dividingFullWidth(product)
        return divided.quotient
    }

    private static func bootSessionReference(installationProfileDigest: String) -> String? {
        var boot = timeval()
        var size = MemoryLayout<timeval>.size
        guard sysctlbyname("kern.boottime", &boot, &size, nil, 0) == 0,
              size == MemoryLayout<timeval>.size,
              let canonical = try? FarmOSCanonicalDigest.canonicalJSON([
                "boot_seconds": NSNumber(value: boot.tv_sec),
                "boot_microseconds": NSNumber(value: boot.tv_usec),
                "installation_profile_digest": installationProfileDigest,
              ])
        else { return nil }
        return FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-c2b-boot-session.v1",
            canonicalValue: canonical
        )
    }

    private static func utcString(seconds: Int, nanoseconds: Int) -> String? {
        guard seconds >= 0, nanoseconds >= 0, nanoseconds < 1_000_000_000 else { return nil }
        let date = Date(timeIntervalSince1970: TimeInterval(seconds))
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return formatter.string(from: date) + String(format: ".%03dZ", nanoseconds / 1_000_000)
    }
}

public enum TrustedClockCandidateDecision: String, Sendable {
    case accepted = "NON_REGRESSING_TRUSTED_OBSERVATION"
    case rollback = "CLOCK_ROLLBACK_REJECTED"
    case forwardPoison = "CLOCK_FORWARD_POISON_REJECTED"
    case malformed = "MALFORMED_CLOCK_EVIDENCE_REJECTED"
}

public enum NativeTrustedClockPolicy {
    public static func validateGenesisCandidate(
        _ candidate: NativeTrustedClockObservation
    ) -> TrustedClockCandidateDecision {
        guard parse(candidate.osUTC) != nil,
              candidate.continuousLowerNanoseconds <= candidate.continuousUpperNanoseconds,
              FarmOSCanonicalDigest.isDigest(candidate.continuousBracketReferenceDigest),
              FarmOSCanonicalDigest.isDigest(candidate.bootSessionReferenceDigest),
              FarmOSCanonicalDigest.isDigest(candidate.observationReferenceDigest)
        else { return .malformed }
        return .accepted
    }

    public static func validatePostGenesisCandidate(
        durableFloor: String,
        priorContinuousUpperNanoseconds: UInt64,
        expectedBootSessionReferenceDigest: String,
        candidate: NativeTrustedClockObservation,
        maximumForwardSkewSeconds: TimeInterval = 300
    ) -> TrustedClockCandidateDecision {
        guard let floorDate = parse(durableFloor), let candidateDate = parse(candidate.osUTC),
              FarmOSCanonicalDigest.isDigest(expectedBootSessionReferenceDigest),
              candidate.bootSessionReferenceDigest == expectedBootSessionReferenceDigest,
              FarmOSCanonicalDigest.isDigest(candidate.continuousBracketReferenceDigest),
              FarmOSCanonicalDigest.isDigest(candidate.observationReferenceDigest),
              candidate.continuousLowerNanoseconds <= candidate.continuousUpperNanoseconds,
              candidate.continuousLowerNanoseconds >= priorContinuousUpperNanoseconds,
              maximumForwardSkewSeconds > 0
        else { return .malformed }
        if candidateDate < floorDate { return .rollback }
        let continuousElapsed = TimeInterval(
            candidate.continuousUpperNanoseconds - priorContinuousUpperNanoseconds
        ) / 1_000_000_000
        if candidateDate.timeIntervalSince(floorDate) > continuousElapsed + maximumForwardSkewSeconds {
            return .forwardPoison
        }
        return .accepted
    }

    private static func parse(_ value: String) -> Date? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        return formatter.date(from: value)
    }
}

public enum PostGen0InteractiveAuthTimingDecision: Equatable, Sendable {
    case acceptable
    case expired
    case rejected
}

public struct PostGen0NormalCapabilityBinding: Equatable, Sendable {
    public let authority: String
    public let authorityRevision: UInt64
    public let actorReferenceDigest: String
    public let challengeReferenceDigest: String
    public let ceremonySessionReferenceDigest: String
    public let purpose: String
    public let scope: String
    public let capabilityReferenceDigest: String
    public let capabilityGeneration: UInt64
    public let previousCapabilityLineageReferenceDigest: String
    public let activeEpochReferenceDigest: String
    public let bootSessionReferenceDigest: String
    public let issuancePredecessorGeneration: UInt64
    public let issuancePredecessorDigest: String
    public let issuanceDurableFloor: String
    public let issuedAt: String
    public let expiresAt: String
    public let issuanceObservationReferenceDigest: String
    public let issuanceContinuousUpperNanoseconds: UInt64
    public let durableIssuanceRecordGeneration: UInt64?
    public let durableIssuanceRecordDigest: String?

    public func bindingDurableIssuanceRecord(
        generation: UInt64, digest: String
    ) -> PostGen0NormalCapabilityBinding? {
        guard durableIssuanceRecordGeneration == nil, durableIssuanceRecordDigest == nil,
              generation == issuancePredecessorGeneration + 1,
              FarmOSCanonicalDigest.isDigest(digest)
        else { return nil }
        return .init(
            authority: authority, authorityRevision: authorityRevision,
            actorReferenceDigest: actorReferenceDigest,
            challengeReferenceDigest: challengeReferenceDigest,
            ceremonySessionReferenceDigest: ceremonySessionReferenceDigest,
            purpose: purpose, scope: scope,
            capabilityReferenceDigest: capabilityReferenceDigest,
            capabilityGeneration: capabilityGeneration,
            previousCapabilityLineageReferenceDigest:
                previousCapabilityLineageReferenceDigest,
            activeEpochReferenceDigest: activeEpochReferenceDigest,
            bootSessionReferenceDigest: bootSessionReferenceDigest,
            issuancePredecessorGeneration: issuancePredecessorGeneration,
            issuancePredecessorDigest: issuancePredecessorDigest,
            issuanceDurableFloor: issuanceDurableFloor,
            issuedAt: issuedAt, expiresAt: expiresAt,
            issuanceObservationReferenceDigest: issuanceObservationReferenceDigest,
            issuanceContinuousUpperNanoseconds: issuanceContinuousUpperNanoseconds,
            durableIssuanceRecordGeneration: generation,
            durableIssuanceRecordDigest: digest
        )
    }
}

public struct PostGen0NormalCapabilityAuthorityContext: Equatable, Sendable {
    public let activeEpochReferenceDigest: String
    public let bootSessionReferenceDigest: String
    public let durableFloor: String
    public let currentHeadGeneration: UInt64
    public let currentHeadDigest: String
    public let currentHeadEventKind: String
    public let actorReferenceDigest: String
    public let challengeReferenceDigest: String
    public let ceremonySessionReferenceDigest: String
    public let challengeState: String
    public let capabilityState: String
    public let capabilityGeneration: UInt64
    public let capabilityLineageReferenceDigest: String
    public let purpose: String
    public let scope: String
    public let quarantineState: String
    public let publicationOutcome: String

    public init(
        activeEpochReferenceDigest: String, bootSessionReferenceDigest: String,
        durableFloor: String, currentHeadGeneration: UInt64, currentHeadDigest: String,
        currentHeadEventKind: String,
        actorReferenceDigest: String, challengeReferenceDigest: String,
        ceremonySessionReferenceDigest: String, challengeState: String,
        capabilityState: String, capabilityGeneration: UInt64,
        capabilityLineageReferenceDigest: String, purpose: String, scope: String,
        quarantineState: String, publicationOutcome: String
    ) {
        self.activeEpochReferenceDigest = activeEpochReferenceDigest
        self.bootSessionReferenceDigest = bootSessionReferenceDigest
        self.durableFloor = durableFloor
        self.currentHeadGeneration = currentHeadGeneration
        self.currentHeadDigest = currentHeadDigest
        self.currentHeadEventKind = currentHeadEventKind
        self.actorReferenceDigest = actorReferenceDigest
        self.challengeReferenceDigest = challengeReferenceDigest
        self.ceremonySessionReferenceDigest = ceremonySessionReferenceDigest
        self.challengeState = challengeState
        self.capabilityState = capabilityState
        self.capabilityGeneration = capabilityGeneration
        self.capabilityLineageReferenceDigest = capabilityLineageReferenceDigest
        self.purpose = purpose
        self.scope = scope
        self.quarantineState = quarantineState
        self.publicationOutcome = publicationOutcome
    }
}

public enum PostGen0NormalCapabilityDecision: String, Equatable, Sendable {
    case accepted = "ACCEPT"
    case expired = "EXPIRED"
    case rejected = "REJECT"
}

public enum PostGen0NormalCapabilityTTLPolicy {
    public static let authority = "DAY150_POST_GEN0_NORMAL_CAPABILITY_TTL_POLICY_V1"
    public static let revision: UInt64 = 1
    public static let lifetimeSeconds: TimeInterval = 120
    public static let purpose = "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION"
    public static let scope = "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION"
    public static let onlyAuthorizedOperation = "CAPABILITY_TERMINALIZATION_CANDIDATE"

    public static func issue(
        context: PostGen0NormalCapabilityAuthorityContext,
        authenticatedActorReferenceDigest: String,
        completedChallengeReferenceDigest: String,
        completedCeremonySessionReferenceDigest: String,
        capabilityReferenceDigest: String,
        proposedCapabilityGeneration: UInt64,
        issuance: NativeTrustedClockObservation,
        priorContinuousUpperNanoseconds: UInt64
    ) -> PostGen0NormalCapabilityBinding? {
        guard context.challengeState == "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
              context.currentHeadEventKind == "CHALLENGE_TERMINALIZATION_CANDIDATE",
              context.capabilityState != "AVAILABLE_CANDIDATE",
              context.quarantineState == "NOT_QUARANTINED_CANDIDATE",
              context.publicationOutcome == "KNOWN_SOURCE_CANDIDATE",
              context.purpose == purpose, context.scope == scope,
              context.actorReferenceDigest == authenticatedActorReferenceDigest,
              context.challengeReferenceDigest == completedChallengeReferenceDigest,
              context.ceremonySessionReferenceDigest ==
                completedCeremonySessionReferenceDigest,
              proposedCapabilityGeneration == context.capabilityGeneration + 1,
              FarmOSCanonicalDigest.isDigest(capabilityReferenceDigest),
              digests([
                context.activeEpochReferenceDigest, context.bootSessionReferenceDigest,
                context.currentHeadDigest, context.actorReferenceDigest,
                context.challengeReferenceDigest, context.ceremonySessionReferenceDigest,
                context.capabilityLineageReferenceDigest,
              ]),
              NativeTrustedClockPolicy.validatePostGenesisCandidate(
                durableFloor: context.durableFloor,
                priorContinuousUpperNanoseconds: priorContinuousUpperNanoseconds,
                expectedBootSessionReferenceDigest: context.bootSessionReferenceDigest,
                candidate: issuance
              ) == .accepted,
              let expiry = adding(lifetimeSeconds, to: issuance.osUTC)
        else { return nil }
        return .init(
            authority: authority, authorityRevision: revision,
            actorReferenceDigest: context.actorReferenceDigest,
            challengeReferenceDigest: context.challengeReferenceDigest,
            ceremonySessionReferenceDigest: context.ceremonySessionReferenceDigest,
            purpose: purpose, scope: scope,
            capabilityReferenceDigest: capabilityReferenceDigest,
            capabilityGeneration: proposedCapabilityGeneration,
            previousCapabilityLineageReferenceDigest:
                context.capabilityLineageReferenceDigest,
            activeEpochReferenceDigest: context.activeEpochReferenceDigest,
            bootSessionReferenceDigest: context.bootSessionReferenceDigest,
            issuancePredecessorGeneration: context.currentHeadGeneration,
            issuancePredecessorDigest: context.currentHeadDigest,
            issuanceDurableFloor: context.durableFloor,
            issuedAt: issuance.osUTC, expiresAt: expiry,
            issuanceObservationReferenceDigest: issuance.observationReferenceDigest,
            issuanceContinuousUpperNanoseconds: issuance.continuousUpperNanoseconds,
            durableIssuanceRecordGeneration: nil, durableIssuanceRecordDigest: nil
        )
    }

    public static func consume(
        binding: PostGen0NormalCapabilityBinding,
        context: PostGen0NormalCapabilityAuthorityContext,
        requestedActorReferenceDigest: String,
        requestedChallengeReferenceDigest: String,
        requestedCeremonySessionReferenceDigest: String,
        requestedPurpose: String,
        requestedScope: String,
        requestedOperation: String,
        observation: NativeTrustedClockObservation
    ) -> PostGen0NormalCapabilityDecision {
        guard binding.authority == authority, binding.authorityRevision == revision,
              let issuanceGeneration = binding.durableIssuanceRecordGeneration,
              let issuanceDigest = binding.durableIssuanceRecordDigest,
              context.currentHeadGeneration == issuanceGeneration,
              context.currentHeadDigest == issuanceDigest,
              context.currentHeadEventKind == "CAPABILITY_ISSUANCE_CANDIDATE",
              context.durableFloor == binding.issuedAt,
              context.activeEpochReferenceDigest == binding.activeEpochReferenceDigest,
              context.bootSessionReferenceDigest == binding.bootSessionReferenceDigest,
              context.actorReferenceDigest == binding.actorReferenceDigest,
              context.challengeReferenceDigest == binding.challengeReferenceDigest,
              context.ceremonySessionReferenceDigest == binding.ceremonySessionReferenceDigest,
              context.capabilityState == "AVAILABLE_CANDIDATE",
              context.capabilityGeneration == binding.capabilityGeneration,
              context.capabilityLineageReferenceDigest ==
                binding.capabilityReferenceDigest,
              context.challengeState == "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
              context.quarantineState == "NOT_QUARANTINED_CANDIDATE",
              context.publicationOutcome == "KNOWN_SOURCE_CANDIDATE",
              requestedActorReferenceDigest == binding.actorReferenceDigest,
              requestedChallengeReferenceDigest == binding.challengeReferenceDigest,
              requestedCeremonySessionReferenceDigest ==
                binding.ceremonySessionReferenceDigest,
              requestedPurpose == binding.purpose, requestedScope == binding.scope,
              requestedOperation == onlyAuthorizedOperation,
              NativeTrustedClockPolicy.validatePostGenesisCandidate(
                durableFloor: binding.issuedAt,
                priorContinuousUpperNanoseconds:
                    binding.issuanceContinuousUpperNanoseconds,
                expectedBootSessionReferenceDigest: binding.bootSessionReferenceDigest,
                candidate: observation
              ) == .accepted,
              let observed = parse(observation.osUTC), let expiry = parse(binding.expiresAt)
        else { return .rejected }
        return observed > expiry ? .expired : .accepted
    }

    public static func authorizes(_ operation: String) -> Bool {
        operation == onlyAuthorizedOperation
    }

    public static func renewalAllowed() -> Bool { false }

    private static func digests(_ values: [String]) -> Bool {
        values.allSatisfy(FarmOSCanonicalDigest.isDigest)
    }

    private static func adding(_ seconds: TimeInterval, to value: String) -> String? {
        guard let date = parse(value) else { return nil }
        return formatter.string(from: date.addingTimeInterval(seconds))
    }

    private static func parse(_ value: String) -> Date? { formatter.date(from: value) }

    private static var formatter: DateFormatter {
        let value = DateFormatter()
        value.locale = Locale(identifier: "en_US_POSIX")
        value.calendar = Calendar(identifier: .gregorian)
        value.timeZone = TimeZone(secondsFromGMT: 0)
        value.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        return value
    }
}

public enum CrossEpochChallengeRecoveryPolicy {
    public static let authority =
        "farmos.day150-c2b-cross-epoch-challenge-recovery-amendment.v1"
    public static let revision: UInt64 = 1
    public static let terminalState = "BOOT_SESSION_INVALIDATED_CANDIDATE"
    public static let terminalReason = "BOOT_SESSION_CHANGE"
    public static let amendmentDigest = FarmOSCanonicalDigest.sha256(
        domain: authority + ":policy",
        canonicalValue: try! FarmOSCanonicalDigest.canonicalJSON([
            "authority_id": authority, "authority_revision": 1,
            "terminal_state": terminalState, "reason": terminalReason,
            "scope": "CROSS_EPOCH_TERMINALIZATION_ONLY",
        ])
    )
    private static let keys: Set<String> = [
        "amendment_authority", "amendment_revision", "amendment_digest",
        "expected_head_generation", "expected_head_digest",
        "old_epoch_reference_digest_candidate", "old_boot_session_reference_digest_candidate",
        "current_boot_session_reference_digest_candidate",
        "recovery_session_reference_digest_candidate",
        "recovery_freshness_reference_digest_candidate", "terminal_reason",
    ]

    public static func bindingIsStructurallyValid(_ value: [String: Any]?) -> Bool {
        guard let value, Set(value.keys) == keys,
              value["amendment_authority"] as? String == authority,
              (value["amendment_revision"] as? NSNumber)?.uint64Value == revision,
              value["amendment_digest"] as? String == amendmentDigest,
              (value["expected_head_generation"] as? NSNumber)?.uint64Value != nil,
              value["terminal_reason"] as? String == terminalReason,
              FarmOSCanonicalDigest.isDigest(value["expected_head_digest"] as? String ?? ""),
              FarmOSCanonicalDigest.isDigest(
                value["old_epoch_reference_digest_candidate"] as? String ?? ""),
              let oldBoot = value["old_boot_session_reference_digest_candidate"] as? String,
              let currentBoot = value["current_boot_session_reference_digest_candidate"] as? String,
              FarmOSCanonicalDigest.isDigest(oldBoot), FarmOSCanonicalDigest.isDigest(currentBoot),
              oldBoot != currentBoot,
              FarmOSCanonicalDigest.isDigest(
                value["recovery_session_reference_digest_candidate"] as? String ?? ""),
              FarmOSCanonicalDigest.isDigest(
                value["recovery_freshness_reference_digest_candidate"] as? String ?? "")
        else { return false }
        return true
    }

    public static func confirmedBootSessionChange(
        historicalBootSessionReference: String,
        currentObservation: NativeTrustedClockObservation
    ) -> Bool {
        FarmOSCanonicalDigest.isDigest(historicalBootSessionReference) &&
            NativeTrustedClockPolicy.validateGenesisCandidate(currentObservation) == .accepted &&
            historicalBootSessionReference != currentObservation.bootSessionReferenceDigest
    }
}

public enum BootSessionRecoveryCapabilityPolicy {
    public static let authority =
        "farmos.day150-c2b-boot-session-recovery-capability-amendment.v1"
    public static let revision: UInt64 = 1
    public static let purpose = "CLOCK_EPOCH_SUPERSESSION_CANDIDATE"
    public static let amendmentDigest = FarmOSCanonicalDigest.sha256(
        domain: authority + ":policy",
        canonicalValue: try! FarmOSCanonicalDigest.canonicalJSON([
            "authority_id": authority, "authority_revision": 1,
            "eligible_terminal_state": CrossEpochChallengeRecoveryPolicy.terminalState,
            "recovery_purpose": purpose, "scope": "RECOVERY_ELIGIBILITY_ONLY",
        ])
    )
    private static let keys: Set<String> = [
        "amendment_authority", "amendment_revision", "amendment_digest", "recovery_stage",
        "expected_head_generation", "expected_head_digest", "gen2_record_digest_candidate",
        "gen2_terminal_reference_digest_candidate",
        "historical_challenge_reference_digest_candidate",
        "historical_session_reference_digest_candidate", "old_epoch_reference_digest_candidate",
        "old_boot_session_reference_digest_candidate",
        "current_boot_session_reference_digest_candidate", "recovery_purpose",
        "recovery_policy_revision", "recovery_challenge_reference_digest_candidate",
        "recovery_challenge_terminal_reference_digest_candidate",
        "recovery_capability_reference_digest_candidate",
        "recovery_session_reference_digest_candidate",
        "recovery_freshness_reference_digest_candidate",
    ]

    public static func bindingIsStructurallyValid(
        _ value: [String: Any]?, stage: String
    ) -> Bool {
        guard let value, Set(value.keys) == keys,
              value["amendment_authority"] as? String == authority,
              (value["amendment_revision"] as? NSNumber)?.uint64Value == revision,
              value["amendment_digest"] as? String == amendmentDigest,
              value["recovery_stage"] as? String == stage,
              (value["expected_head_generation"] as? NSNumber)?.uint64Value != nil,
              value["recovery_purpose"] as? String == purpose,
              (value["recovery_policy_revision"] as? NSNumber)?.uint64Value == 1,
              digests(value, ["expected_head_digest", "gen2_record_digest_candidate",
                "gen2_terminal_reference_digest_candidate",
                "historical_challenge_reference_digest_candidate",
                "historical_session_reference_digest_candidate",
                "old_epoch_reference_digest_candidate", "old_boot_session_reference_digest_candidate",
                "current_boot_session_reference_digest_candidate",
                "recovery_challenge_reference_digest_candidate",
                "recovery_session_reference_digest_candidate",
                "recovery_freshness_reference_digest_candidate"]),
              value["old_boot_session_reference_digest_candidate"] as? String !=
                value["current_boot_session_reference_digest_candidate"] as? String
        else { return false }
        let terminal = value["recovery_challenge_terminal_reference_digest_candidate"]
        let capability = value["recovery_capability_reference_digest_candidate"]
        switch stage {
        case "RECOVERY_CHALLENGE_ISSUANCE_CANDIDATE":
            return terminal is NSNull && capability is NSNull
        case "RECOVERY_CHALLENGE_TERMINALIZATION_CANDIDATE":
            return FarmOSCanonicalDigest.isDigest(terminal as? String ?? "") && capability is NSNull
        case "RECOVERY_CAPABILITY_ISSUANCE_CANDIDATE":
            return FarmOSCanonicalDigest.isDigest(terminal as? String ?? "") &&
                FarmOSCanonicalDigest.isDigest(capability as? String ?? "")
        default: return false
        }
    }

    public static func lineageMatches(_ current: [String: Any], _ prior: [String: Any]) -> Bool {
        let stable = ["amendment_authority", "amendment_revision", "amendment_digest",
            "gen2_record_digest_candidate", "gen2_terminal_reference_digest_candidate",
            "historical_challenge_reference_digest_candidate",
            "historical_session_reference_digest_candidate", "old_epoch_reference_digest_candidate",
            "old_boot_session_reference_digest_candidate",
            "current_boot_session_reference_digest_candidate", "recovery_purpose",
            "recovery_policy_revision", "recovery_challenge_reference_digest_candidate",
            "recovery_session_reference_digest_candidate",
            "recovery_freshness_reference_digest_candidate"]
        return stable.allSatisfy { canonical(current[$0]) == canonical(prior[$0]) }
    }

    private static func digests(_ value: [String: Any], _ keys: [String]) -> Bool {
        keys.allSatisfy { FarmOSCanonicalDigest.isDigest(value[$0] as? String ?? "") }
    }

    private static func canonical(_ value: Any?) -> String? {
        guard let value else { return nil }
        return try? FarmOSCanonicalDigest.canonicalJSON(value)
    }
}

public struct PostGen0InteractiveAuthEvaluation: Equatable, Sendable {
    public let challengeIssuedAt: String
    public let ceremonyDeadline: String
    public let evaluationStartedAt: String
    public let evaluationDeadline: String
    public let effectiveDeadline: String
    public let evaluationStartContinuousUpperNanoseconds: UInt64
    public let bootSessionReferenceDigest: String
}

public enum PostGen0InteractiveAuthTimingPolicy {
    public static let authority = "DAY150_POST_GEN0_INTERACTIVE_AUTH_TIMING_POLICY_V1"
    public static let ceremonyMaximumSeconds: TimeInterval = 300
    public static let evaluationMaximumSeconds: TimeInterval = 180

    public static func challengeDeadline(
        issuance: NativeTrustedClockObservation,
        durableFloor: String,
        priorContinuousUpperNanoseconds: UInt64,
        expectedBootSessionReferenceDigest: String
    ) -> String? {
        guard NativeTrustedClockPolicy.validatePostGenesisCandidate(
            durableFloor: durableFloor,
            priorContinuousUpperNanoseconds: priorContinuousUpperNanoseconds,
            expectedBootSessionReferenceDigest: expectedBootSessionReferenceDigest,
            candidate: issuance
        ) == .accepted else { return nil }
        return adding(ceremonyMaximumSeconds, to: issuance.osUTC)
    }

    public static func beginEvaluation(
        issuance: NativeTrustedClockObservation,
        challengeExpiry: String,
        start: NativeTrustedClockObservation,
        exactBindingValid: Bool,
        applicationForegroundConfirmed: Bool
    ) -> PostGen0InteractiveAuthEvaluation? {
        guard exactBindingValid, applicationForegroundConfirmed,
              challengeExpiry == adding(ceremonyMaximumSeconds, to: issuance.osUTC),
              NativeTrustedClockPolicy.validatePostGenesisCandidate(
                durableFloor: issuance.osUTC,
                priorContinuousUpperNanoseconds: issuance.continuousUpperNanoseconds,
                expectedBootSessionReferenceDigest: issuance.bootSessionReferenceDigest,
                candidate: start
              ) == .accepted,
              let evaluationDeadline = adding(evaluationMaximumSeconds, to: start.osUTC),
              compare(start.osUTC, challengeExpiry) == .orderedAscending
        else { return nil }
        let effective = compare(challengeExpiry, evaluationDeadline) == .orderedAscending
            ? challengeExpiry : evaluationDeadline
        return PostGen0InteractiveAuthEvaluation(
            challengeIssuedAt: issuance.osUTC,
            ceremonyDeadline: challengeExpiry,
            evaluationStartedAt: start.osUTC,
            evaluationDeadline: evaluationDeadline,
            effectiveDeadline: effective,
            evaluationStartContinuousUpperNanoseconds: start.continuousUpperNanoseconds,
            bootSessionReferenceDigest: issuance.bootSessionReferenceDigest
        )
    }

    public static func consumeResult(
        evaluation: PostGen0InteractiveAuthEvaluation,
        result: NativeTrustedClockObservation,
        exactBindingValid: Bool
    ) -> PostGen0InteractiveAuthTimingDecision {
        guard exactBindingValid,
              NativeTrustedClockPolicy.validatePostGenesisCandidate(
                durableFloor: evaluation.challengeIssuedAt,
                priorContinuousUpperNanoseconds:
                    evaluation.evaluationStartContinuousUpperNanoseconds,
                expectedBootSessionReferenceDigest: evaluation.bootSessionReferenceDigest,
                candidate: result
              ) == .accepted
        else { return .rejected }
        return compare(result.osUTC, evaluation.effectiveDeadline) == .orderedDescending
            ? .expired : .acceptable
    }

    public static func historicalChallengeMayBeExtended() -> Bool { false }

    public static func boundedAuthenticationWaitSeconds(
        evaluation: PostGen0InteractiveAuthEvaluation
    ) -> TimeInterval? {
        guard let start = parse(evaluation.evaluationStartedAt),
              let deadline = parse(evaluation.effectiveDeadline) else { return nil }
        let value = deadline.timeIntervalSince(start)
        return value > 0 && value <= evaluationMaximumSeconds ? value : nil
    }

    private static func adding(_ seconds: TimeInterval, to value: String) -> String? {
        guard let date = parse(value) else { return nil }
        return format(date.addingTimeInterval(seconds))
    }

    private static func compare(_ lhs: String, _ rhs: String) -> ComparisonResult? {
        guard let left = parse(lhs), let right = parse(rhs) else { return nil }
        return left.compare(right)
    }

    private static func parse(_ value: String) -> Date? {
        formatter.date(from: value)
    }

    private static func format(_ value: Date) -> String { formatter.string(from: value) }

    private static var formatter: DateFormatter {
        let value = DateFormatter()
        value.locale = Locale(identifier: "en_US_POSIX")
        value.calendar = Calendar(identifier: .gregorian)
        value.timeZone = TimeZone(secondsFromGMT: 0)
        value.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        return value
    }
}

public struct IntegratedCanonicalBody {
    public let body: [String: Any]
    public let canonical: String
    public let referenceDigest: String

    public init(body: [String: Any], canonical: String, referenceDigest: String) {
        self.body = body; self.canonical = canonical; self.referenceDigest = referenceDigest
    }
}

public struct IntegratedGenesisApprovalLineage {
    public let proposal: IntegratedCanonicalBody
    public let decision: IntegratedCanonicalBody
    public let receipt: IntegratedCanonicalBody

    public init(
        proposal: IntegratedCanonicalBody, decision: IntegratedCanonicalBody,
        receipt: IntegratedCanonicalBody
    ) {
        self.proposal = proposal; self.decision = decision; self.receipt = receipt
    }
}

public enum IntegratedRehearsalRecordFactory {
    public static let purpose = "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION"

    public static func sourceBindings(
        installationProfileDigest: String,
        nativeProfileDigest: String,
        liveActorProvenanceDigest: String,
        liveClockProvenanceDigest: String,
        companionArtifactDigest: String
    ) -> [String: Any] {
        [
            "manifest_authority": "farmos.day150-c2b-bootstrap-manifest.v1",
            "manifest_digest":
                "sha256:a332368cbdca6461e11f538085a8bea3bfbd63f20cc0066302412d309e9e11be",
            "r2_record_authority": "farmos.day150-c2b-bootstrap-ledger-record.v1",
            "r2_genesis_source_candidate_digest":
                "sha256:98e57a4f41639b64e1b992e3e6ccf56c3f0b625916ded4d2b2c4fc56760376f4",
            "r3_actor_source_authority": "farmos.day150-c2b-bootstrap-actor-intent-source.v1",
            "r3_actor_source_candidate_digest": liveActorProvenanceDigest,
            "r3_clock_source_authority": "farmos.day150-c2b-bootstrap-clock-intent-source.v1",
            "r3_clock_source_candidate_digest": liveClockProvenanceDigest,
            "installation_profile_digest_candidate": installationProfileDigest,
            "native_profile_digest_candidate": nativeProfileDigest,
            "companion_artifact_reference_digest_candidate": companionArtifactDigest,
        ]
    }

    public static func liveBindingsExcludeFixtureInstances(_ bindings: [String: Any]) -> Bool {
        let fixtureInstances = Set([
            "sha256:" + String(repeating: "a", count: 64),
            "sha256:" + String(repeating: "b", count: 64),
        ])
        guard let actor = bindings["r3_actor_source_candidate_digest"] as? String,
              let clock = bindings["r3_clock_source_candidate_digest"] as? String
        else { return false }
        return FarmOSCanonicalDigest.isDigest(actor) && FarmOSCanonicalDigest.isDigest(clock) &&
            !fixtureInstances.contains(actor) && !fixtureInstances.contains(clock)
    }

    public static func liveActorProvenanceDigest(
        actorReference: String, challengeReference: String,
        proposedValidFrom: String, proposedExpiresAt: String
    ) -> String {
        digest(domain: "farmos.day150-c2b-bootstrap-actor-intent-source.v1:candidate-body", value: [
            "schema_version": "farmos.day150-c2b-bootstrap-actor-intent-source.v1",
            "authority_id": "farmos.day150-c2b-bootstrap-actor-intent-source.v1",
            "authority_revision": 1,
            "source_discriminator": "ACTOR_AUTHORIZATION_INTENT_SOURCE_CANDIDATE",
            "candidate_kind": "DAY150_PHASE_C2B_BOOTSTRAP_AUTHORIZATION_INTENT",
            "bootstrap_manifest_digest":
                "sha256:a332368cbdca6461e11f538085a8bea3bfbd63f20cc0066302412d309e9e11be",
            "expected_r2_source_base_generation": 0,
            "expected_r2_source_base_head_digest":
                "sha256:98e57a4f41639b64e1b992e3e6ccf56c3f0b625916ded4d2b2c4fc56760376f4",
            "purpose": purpose,
            "requested_capability_scope":
                "EXECUTE_DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION",
            "actor_reference_digest_candidate": actorReference,
            "challenge_reference_digest_candidate": challengeReference,
            "authentication_mechanism_revision": 1,
            "proposed_capability_generation": 0,
            "previous_capability_or_revocation_digest_candidate": NSNull(),
            "proposed_valid_from": proposedValidFrom,
            "proposed_expires_at": proposedExpiresAt,
        ])
    }

    public static func liveClockProvenanceDigest(
        observation: NativeTrustedClockObservation, epochReference: String,
        installationProfileDigest: String, actorReference: String,
        capabilityReference: String
    ) -> String {
        digest(domain: "farmos.day150-c2b-bootstrap-clock-intent-source.v1:candidate-body", value: [
            "schema_version": "farmos.day150-c2b-bootstrap-clock-intent-source.v1",
            "authority_id": "farmos.day150-c2b-bootstrap-clock-intent-source.v1",
            "authority_revision": 1,
            "source_discriminator": "CLOCK_TRANSITION_INTENT_SOURCE_CANDIDATE",
            "intent_kind": "CLOCK_GENESIS_INTENT",
            "bootstrap_manifest_digest":
                "sha256:a332368cbdca6461e11f538085a8bea3bfbd63f20cc0066302412d309e9e11be",
            "installation_identity_digest_candidate": installationProfileDigest,
            "expected_r2_source_base_generation": 0,
            "expected_r2_source_base_head_digest":
                "sha256:98e57a4f41639b64e1b992e3e6ccf56c3f0b625916ded4d2b2c4fc56760376f4",
            "policy_revision": 1,
            "actor_reference_digest_candidate": actorReference,
            "capability_reference_digest_candidate": capabilityReference,
            "proposed_epoch_reference_digest_candidate": epochReference,
            "proposed_genesis_timestamp": observation.osUTC,
        ])
    }

    public static func proposal(
        bindings: [String: Any], actorReference: String,
        ceremonySessionReference: String, challengeReference: String,
        observation: NativeTrustedClockObservation,
        plausibilityConfirmationReference: String
    ) -> IntegratedCanonicalBody? {
        let body: [String: Any] = [
            "schema_version": "farmos.day150-c2b-bootstrap-runtime-genesis-proposal.v1",
            "purpose": purpose,
            "target_binding_digest": digest(
                domain: "farmos.day150-c2b-bootstrap-runtime-provenance-record.v1:source-bindings",
                value: bindings
            ),
            "actor_reference_digest_candidate": actorReference,
            "challenge_reference_digest_candidate": challengeReference,
            "native_ceremony_session_reference_digest_candidate": ceremonySessionReference,
            "os_utc_observation_reference_digest_candidate": observation.observationReferenceDigest,
            "human_time_plausibility_confirmation_reference_digest":
                plausibilityConfirmationReference,
            "actor_policy_revision": 1, "clock_policy_revision": 1,
            "publication_policy_revision": 1,
            "companion_artifact_reference_digest_candidate":
                bindings["companion_artifact_reference_digest_candidate"]!,
        ]
        return canonicalBody(
            body, domain: "farmos.day150-c2b-bootstrap-runtime-genesis-proposal.v1:body"
        )
    }

    public static func approve(
        proposal: IntegratedCanonicalBody, actorReference: String,
        challengeReference: String
    ) -> IntegratedCanonicalBody? {
        canonicalBody([
            "schema_version": "farmos.day150-c2b-bootstrap-runtime-genesis-approval-decision.v1",
            "decision": "APPROVE",
            "proposal_reference_digest": proposal.referenceDigest,
            "actor_reference_digest_candidate": actorReference,
            "challenge_reference_digest_candidate": challengeReference,
            "authentication_mechanism_revision": 1,
        ], domain: "farmos.day150-c2b-bootstrap-runtime-genesis-approval-decision.v1:body")
    }

    public static func receipt(
        proposal: IntegratedCanonicalBody, decision: IntegratedCanonicalBody,
        actorReference: String, challengeReference: String, capabilityReference: String
    ) -> IntegratedCanonicalBody? {
        canonicalBody([
            "schema_version": "farmos.day150-c2b-bootstrap-runtime-genesis-approval-receipt.v1",
            "proposal_reference_digest": proposal.referenceDigest,
            "approval_decision_reference_digest": decision.referenceDigest,
            "actor_reference_digest_candidate": actorReference,
            "challenge_reference_digest_candidate": challengeReference,
            "challenge_terminal_state": "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
            "capability_reference_digest_candidate": capabilityReference,
            "capability_terminal_state": "CONSUMED_CANDIDATE",
        ], domain: "farmos.day150-c2b-bootstrap-runtime-genesis-approval-receipt.v1:body")
    }

    public static func genesis(
        bindings: [String: Any],
        actorReference: String,
        ceremonySessionReference: String,
        challengeReference: String,
        capabilityReference: String,
        observation: NativeTrustedClockObservation,
        plausibilityConfirmationReference: String,
        epochReference: String,
        approvalLineage: IntegratedGenesisApprovalLineage
    ) -> Data? {
        let target = digest(
            domain: "farmos.day150-c2b-bootstrap-runtime-provenance-record.v1:source-bindings",
            value: bindings
        )
        let proposal = approvalLineage.proposal
        let decision = approvalLineage.decision
        let receipt = approvalLineage.receipt
        guard let expectedProposal = Self.proposal(
                bindings: bindings, actorReference: actorReference,
                ceremonySessionReference: ceremonySessionReference,
                challengeReference: challengeReference, observation: observation,
                plausibilityConfirmationReference: plausibilityConfirmationReference),
              let expectedDecision = Self.approve(
                proposal: expectedProposal, actorReference: actorReference,
                challengeReference: challengeReference),
              let expectedReceipt = Self.receipt(
                proposal: expectedProposal, decision: expectedDecision,
                actorReference: actorReference, challengeReference: challengeReference,
                capabilityReference: capabilityReference),
              proposal.canonical == expectedProposal.canonical,
              proposal.referenceDigest == expectedProposal.referenceDigest,
              decision.canonical == expectedDecision.canonical,
              decision.referenceDigest == expectedDecision.referenceDigest,
              receipt.canonical == expectedReceipt.canonical,
              receipt.referenceDigest == expectedReceipt.referenceDigest,
              proposal.body["target_binding_digest"] as? String == target,
              proposal.body["actor_reference_digest_candidate"] as? String == actorReference,
              proposal.body["challenge_reference_digest_candidate"] as? String == challengeReference,
              proposal.body["os_utc_observation_reference_digest_candidate"] as? String ==
                observation.observationReferenceDigest,
              proposal.body["human_time_plausibility_confirmation_reference_digest"] as? String ==
                plausibilityConfirmationReference,
              decision.body["proposal_reference_digest"] as? String == proposal.referenceDigest,
              receipt.body["proposal_reference_digest"] as? String == proposal.referenceDigest,
              receipt.body["approval_decision_reference_digest"] as? String ==
                decision.referenceDigest,
              receipt.body["capability_reference_digest_candidate"] as? String == capabilityReference
        else { return nil }
        let payload: [String: Any] = [
            "proposal_reference_digest": proposal.referenceDigest,
            "proposal_body_candidate": proposal.body,
            "proposal_target_binding_digest": target,
            "human_approval_decision_reference_digest": decision.referenceDigest,
            "human_approval_decision_body_candidate": decision.body,
            "approval_decision_proposal_reference_digest": proposal.referenceDigest,
            "approval_decision_actor_reference_digest_candidate": actorReference,
            "approval_decision_challenge_reference_digest_candidate": challengeReference,
            "approval_receipt_reference_digest": receipt.referenceDigest,
            "approval_receipt_body_candidate": receipt.body,
            "approval_receipt_proposal_reference_digest": proposal.referenceDigest,
            "approval_receipt_decision_reference_digest": decision.referenceDigest,
            "approval_receipt_actor_reference_digest_candidate": actorReference,
            "approval_receipt_challenge_reference_digest_candidate": challengeReference,
            "approval_receipt_capability_reference_digest_candidate": capabilityReference,
            "actor_reference_digest_candidate": actorReference,
            "native_ceremony_session_reference_digest_candidate": ceremonySessionReference,
            "initial_challenge_reference_digest_candidate": challengeReference,
            "initial_challenge_terminal_state": "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
            "bootstrap_capability_reference_digest_candidate": capabilityReference,
            "bootstrap_capability_terminal_state": "CONSUMED_CANDIDATE",
            "os_utc_observation_reference_digest_candidate": observation.observationReferenceDigest,
            "continuous_time_bracket_reference_digest_candidate":
                observation.continuousBracketReferenceDigest,
            "boot_session_reference_digest_candidate": observation.bootSessionReferenceDigest,
            "human_time_plausibility_confirmation_reference_digest":
                plausibilityConfirmationReference,
            "proposed_epoch_reference_digest_candidate": epochReference,
            "proposed_genesis_timestamp_candidate": observation.osUTC,
            "proposed_initial_monotonic_floor_timestamp_candidate": observation.osUTC,
            "actor_policy_revision": 1, "clock_policy_revision": 1,
            "publication_policy_revision": 1,
        ]
        let projection = projection(
            actor: actorReference, challenge: challengeReference,
            session: ceremonySessionReference, challengeState: "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
            challengeExpiry: NSNull(), challengeFreshness: "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
            capability: capabilityReference, capabilityState: "CONSUMED_CANDIDATE",
            capabilityGeneration: 0, capabilityExpiry: NSNull(),
            capabilityFreshness: "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
            capabilityLineage: capabilityReference, epoch: epochReference,
            floor: observation.osUTC, boot: observation.bootSessionReferenceDigest
        )
        return record(generation: 0, previous: nil, bindings: bindings,
                      eventKind: "INTEGRATED_RUNTIME_GENESIS_CANDIDATE",
                      payload: payload, projection: projection)
    }

    public static func record(
        generation: UInt64,
        previous: DisposableRuntimeRecord?,
        bindings: [String: Any],
        eventKind: String,
        payload: [String: Any],
        projection: [String: Any]
    ) -> Data? {
        guard generation == (previous == nil ? 0 : previous!.generation + 1) else { return nil }
        let body: [String: Any] = [
            "schema_version": DisposableStoragePolicy.recordAuthority,
            "authority_id": DisposableStoragePolicy.recordAuthority,
            "authority_revision": 1,
            "generation": NSNumber(value: generation),
            "previous_generation": previous.map { NSNumber(value: $0.generation) } ?? NSNull(),
            "previous_record_digest": previous?.recordDigest ?? NSNull(),
            "source_bindings": bindings,
            "event": ["schema_version": DisposableStoragePolicy.eventAuthority,
                      "event_kind": eventKind, "payload": payload],
            "projected_source_state_claim": projection,
        ]
        guard let canonicalBody = try? FarmOSCanonicalDigest.canonicalJSON(body) else { return nil }
        let envelope: [String: Any] = [
            "record_body": body,
            "record_digest": FarmOSCanonicalDigest.sha256(
                domain: DisposableStoragePolicy.recordDigestDomain, canonicalValue: canonicalBody
            ),
        ]
        guard let canonical = try? FarmOSCanonicalDigest.canonicalJSON(envelope) else { return nil }
        return Data(canonical.utf8)
    }

    public static func projection(
        actor: String, challenge: String, session: String, challengeState: String,
        challengeExpiry: Any, challengeFreshness: String,
        capability: String, capabilityState: String, capabilityGeneration: UInt64,
        capabilityExpiry: Any, capabilityFreshness: String, capabilityLineage: String,
        epoch: String, floor: String, boot: String,
        quarantine: String = "NOT_QUARANTINED_CANDIDATE",
        publication: String = "KNOWN_SOURCE_CANDIDATE"
    ) -> [String: Any] {
        [
            "schema_version": DisposableStoragePolicy.projectionAuthority,
            "discriminator": "SOURCE_PROJECTION_ONLY",
            "bootstrap_candidate_state": "INITIALIZED_CANDIDATE",
            "actor_candidate_state": "ESTABLISHMENT_CANDIDATE_PRESENT",
            "actor_reference_digest_candidate": actor,
            "challenge_candidate_state": challengeState,
            "challenge_reference_digest_candidate": challenge,
            "challenge_native_session_reference_digest_candidate": session,
            "challenge_expires_at_candidate": challengeExpiry,
            "challenge_freshness_basis": challengeFreshness,
            "capability_candidate_state": capabilityState,
            "capability_reference_digest_candidate": capability,
            "capability_generation_candidate": NSNumber(value: capabilityGeneration),
            "capability_expires_at_candidate": capabilityExpiry,
            "capability_freshness_basis": capabilityFreshness,
            "capability_lineage_head_reference_digest_candidate": capabilityLineage,
            "clock_candidate_state": "ESTABLISHMENT_CANDIDATE_PRESENT",
            "epoch_reference_digest_candidate": epoch,
            "monotonic_floor_timestamp_candidate": floor,
            "boot_session_reference_digest_candidate": boot,
            "quarantine_candidate_state": quarantine,
            "publication_outcome_candidate": publication,
        ]
    }

    public static func digest(domain: String, value: Any) -> String {
        FarmOSCanonicalDigest.sha256(
            domain: domain,
            canonicalValue: try! FarmOSCanonicalDigest.canonicalJSON(value)
        )
    }

    private static func canonicalBody(_ body: [String: Any], domain: String)
        -> IntegratedCanonicalBody? {
        guard let canonical = try? FarmOSCanonicalDigest.canonicalJSON(body) else { return nil }
        return IntegratedCanonicalBody(
            body: body, canonical: canonical,
            referenceDigest: FarmOSCanonicalDigest.sha256(
                domain: domain, canonicalValue: canonical
            )
        )
    }
}

extension DisposableRecordValidator {
    public static func transitionIsValid(
        previous: DisposableRuntimeRecord,
        current: DisposableRuntimeRecord
    ) -> Bool {
        guard let prior = object(previous.projectionCanonical),
              let payload = object(current.eventPayloadCanonical),
              let claimed = object(current.projectionCanonical)
        else { return false }
        var expected = prior
        switch current.eventKind {
        case "CHALLENGE_ISSUANCE_CANDIDATE":
            if let recovery = payload["boot_session_recovery_binding_candidate"] as? [String: Any] {
                guard previous.eventKind == "CHALLENGE_TERMINALIZATION_CANDIDATE",
                      let predecessor = object(previous.eventPayloadCanonical),
                      let condition = predecessor["cross_epoch_recovery_binding_candidate"]
                        as? [String: Any],
                      BootSessionRecoveryCapabilityPolicy.bindingIsStructurallyValid(
                        recovery, stage: "RECOVERY_CHALLENGE_ISSUANCE_CANDIDATE"),
                      prior["challenge_candidate_state"] as? String ==
                        CrossEpochChallengeRecoveryPolicy.terminalState,
                      prior["capability_candidate_state"] as? String != "AVAILABLE_CANDIDATE",
                      prior["quarantine_candidate_state"] as? String ==
                        "NOT_QUARANTINED_CANDIDATE",
                      recovery["expected_head_generation"] as? NSNumber ==
                        NSNumber(value: previous.generation),
                      recovery["expected_head_digest"] as? String == previous.recordDigest,
                      recovery["gen2_record_digest_candidate"] as? String == previous.recordDigest,
                      recovery["gen2_terminal_reference_digest_candidate"] as? String ==
                        predecessor["terminal_reference_digest_candidate"] as? String,
                      recovery["historical_challenge_reference_digest_candidate"] as? String ==
                        predecessor["challenge_reference_digest_candidate"] as? String,
                      recovery["historical_session_reference_digest_candidate"] as? String ==
                        predecessor["native_ceremony_session_reference_digest_candidate"] as? String,
                      recovery["old_epoch_reference_digest_candidate"] as? String ==
                        prior["epoch_reference_digest_candidate"] as? String,
                      recovery["old_boot_session_reference_digest_candidate"] as? String ==
                        prior["boot_session_reference_digest_candidate"] as? String,
                      recovery["current_boot_session_reference_digest_candidate"] as? String ==
                        condition["current_boot_session_reference_digest_candidate"] as? String,
                      recovery["recovery_session_reference_digest_candidate"] as? String !=
                        condition["recovery_session_reference_digest_candidate"] as? String,
                      payload["challenge_reference_digest_candidate"] as? String ==
                        recovery["recovery_challenge_reference_digest_candidate"] as? String,
                      payload["native_ceremony_session_reference_digest_candidate"] as? String ==
                        recovery["recovery_session_reference_digest_candidate"] as? String,
                      payload["native_recovery_session_reference_digest_candidate"] as? String ==
                        recovery["recovery_session_reference_digest_candidate"] as? String
                else { return false }
                expected["challenge_candidate_state"] = "OUTSTANDING_CANDIDATE"
                expected["challenge_reference_digest_candidate"] =
                    payload["challenge_reference_digest_candidate"]
                expected["challenge_native_session_reference_digest_candidate"] =
                    payload["native_ceremony_session_reference_digest_candidate"]
                expected["challenge_expires_at_candidate"] = NSNull()
                expected["challenge_freshness_basis"] =
                    "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE"
                break
            }
            guard freshness(payload, prior),
                  prior["challenge_candidate_state"] as? String != "OUTSTANDING_CANDIDATE",
                  prior["challenge_candidate_state"] as? String !=
                    CrossEpochChallengeRecoveryPolicy.terminalState,
                  prior["capability_candidate_state"] as? String != "AVAILABLE_CANDIDATE",
                  payload["actor_reference_digest_candidate"] as? String ==
                    prior["actor_reference_digest_candidate"] as? String,
                  payload["issued_at_candidate"] as? String ==
                    payload["proposed_monotonic_floor_timestamp_candidate"] as? String
            else { return false }
            expected["challenge_candidate_state"] = "OUTSTANDING_CANDIDATE"
            expected["challenge_reference_digest_candidate"] =
                payload["challenge_reference_digest_candidate"]
            expected["challenge_native_session_reference_digest_candidate"] =
                payload["native_ceremony_session_reference_digest_candidate"]
            expected["challenge_expires_at_candidate"] = payload["expires_at_candidate"]
            expected["challenge_freshness_basis"] = payload["freshness_basis"]
            expected["monotonic_floor_timestamp_candidate"] =
                payload["proposed_monotonic_floor_timestamp_candidate"]
        case "CHALLENGE_TERMINALIZATION_CANDIDATE":
            if let recovery = payload["boot_session_recovery_binding_candidate"] as? [String: Any] {
                guard previous.eventKind == "CHALLENGE_ISSUANCE_CANDIDATE",
                      let predecessor = object(previous.eventPayloadCanonical),
                      let priorBinding = predecessor["boot_session_recovery_binding_candidate"]
                        as? [String: Any],
                      BootSessionRecoveryCapabilityPolicy.bindingIsStructurallyValid(
                        recovery, stage: "RECOVERY_CHALLENGE_TERMINALIZATION_CANDIDATE"),
                      BootSessionRecoveryCapabilityPolicy.lineageMatches(recovery, priorBinding),
                      recovery["expected_head_generation"] as? NSNumber ==
                        NSNumber(value: previous.generation),
                      recovery["expected_head_digest"] as? String == previous.recordDigest,
                      prior["challenge_candidate_state"] as? String == "OUTSTANDING_CANDIDATE",
                      payload["terminal_state"] as? String ==
                        "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
                      payload["challenge_reference_digest_candidate"] as? String ==
                        recovery["recovery_challenge_reference_digest_candidate"] as? String,
                      payload["native_ceremony_session_reference_digest_candidate"] as? String ==
                        recovery["recovery_session_reference_digest_candidate"] as? String,
                      payload["native_recovery_session_reference_digest_candidate"] as? String ==
                        recovery["recovery_session_reference_digest_candidate"] as? String
                else { return false }
                expected["challenge_candidate_state"] =
                    "CONSUMED_APPROVAL_SUCCESS_CANDIDATE"
                break
            }
            if payload["terminal_state"] as? String ==
                CrossEpochChallengeRecoveryPolicy.terminalState {
                guard let binding = payload["cross_epoch_recovery_binding_candidate"]
                        as? [String: Any],
                      CrossEpochChallengeRecoveryPolicy.bindingIsStructurallyValid(binding),
                      prior["challenge_candidate_state"] as? String == "OUTSTANDING_CANDIDATE",
                      prior["challenge_freshness_basis"] as? String ==
                        "ACTIVE_TRUSTED_CLOCK_CANDIDATE",
                      prior["quarantine_candidate_state"] as? String ==
                        "NOT_QUARANTINED_CANDIDATE",
                      prior["publication_outcome_candidate"] as? String ==
                        "KNOWN_SOURCE_CANDIDATE",
                      payload["challenge_reference_digest_candidate"] as? String ==
                        prior["challenge_reference_digest_candidate"] as? String,
                      payload["native_ceremony_session_reference_digest_candidate"] as? String ==
                        prior["challenge_native_session_reference_digest_candidate"] as? String,
                      payload["freshness_basis"] as? String ==
                        "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
                      payload["observed_at_candidate"] is NSNull,
                      binding["expected_head_generation"] as? NSNumber ==
                        NSNumber(value: previous.generation),
                      binding["expected_head_digest"] as? String == previous.recordDigest,
                      binding["old_epoch_reference_digest_candidate"] as? String ==
                        prior["epoch_reference_digest_candidate"] as? String,
                      binding["old_boot_session_reference_digest_candidate"] as? String ==
                        prior["boot_session_reference_digest_candidate"] as? String,
                      binding["recovery_session_reference_digest_candidate"] as? String ==
                        payload["native_recovery_session_reference_digest_candidate"] as? String
                else { return false }
                expected["challenge_candidate_state"] =
                    CrossEpochChallengeRecoveryPolicy.terminalState
                break
            }
            guard payload["cross_epoch_recovery_binding_candidate"] == nil else { return false }
            guard previous.eventKind == "CHALLENGE_ISSUANCE_CANDIDATE",
                  freshness(payload, prior),
                  prior["challenge_candidate_state"] as? String == "OUTSTANDING_CANDIDATE",
                  payload["challenge_reference_digest_candidate"] as? String ==
                    prior["challenge_reference_digest_candidate"] as? String,
                  payload["native_ceremony_session_reference_digest_candidate"] as? String ==
                    prior["challenge_native_session_reference_digest_candidate"] as? String,
                  payload["observed_at_candidate"] as? String ==
                    payload["proposed_monotonic_floor_timestamp_candidate"] as? String,
                  withinExpiry(payload["observed_at_candidate"], prior["challenge_expires_at_candidate"],
                               terminal: payload["terminal_state"])
            else { return false }
            expected["challenge_candidate_state"] = payload["terminal_state"]
            expected["monotonic_floor_timestamp_candidate"] =
                payload["proposed_monotonic_floor_timestamp_candidate"]
        case "CAPABILITY_ISSUANCE_CANDIDATE":
            if let recovery = payload["boot_session_recovery_binding_candidate"] as? [String: Any] {
                guard previous.eventKind == "CHALLENGE_TERMINALIZATION_CANDIDATE",
                      let predecessor = object(previous.eventPayloadCanonical),
                      let priorBinding = predecessor["boot_session_recovery_binding_candidate"]
                        as? [String: Any],
                      BootSessionRecoveryCapabilityPolicy.bindingIsStructurallyValid(
                        recovery, stage: "RECOVERY_CAPABILITY_ISSUANCE_CANDIDATE"),
                      BootSessionRecoveryCapabilityPolicy.lineageMatches(recovery, priorBinding),
                      recovery["expected_head_generation"] as? NSNumber ==
                        NSNumber(value: previous.generation),
                      recovery["expected_head_digest"] as? String == previous.recordDigest,
                      recovery["recovery_challenge_terminal_reference_digest_candidate"] as? String ==
                        priorBinding["recovery_challenge_terminal_reference_digest_candidate"] as? String,
                      prior["challenge_candidate_state"] as? String ==
                        "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
                      prior["capability_candidate_state"] as? String != "AVAILABLE_CANDIDATE",
                      payload["challenge_reference_digest_candidate"] as? String ==
                        recovery["recovery_challenge_reference_digest_candidate"] as? String,
                      payload["capability_reference_digest_candidate"] as? String ==
                        recovery["recovery_capability_reference_digest_candidate"] as? String,
                      payload["native_ceremony_session_reference_digest_candidate"] as? String ==
                        recovery["recovery_session_reference_digest_candidate"] as? String,
                      payload["native_recovery_session_reference_digest_candidate"] as? String ==
                        recovery["recovery_session_reference_digest_candidate"] as? String,
                      payload["actor_reference_digest_candidate"] as? String ==
                        prior["actor_reference_digest_candidate"] as? String,
                      payload["previous_capability_or_revocation_reference_digest_candidate"] as? String ==
                        prior["capability_lineage_head_reference_digest_candidate"] as? String,
                      exact(payload["capability_generation"]) ==
                        (exact(prior["capability_generation_candidate"]) ?? UInt64.max) &+ 1
                else { return false }
                expected["capability_candidate_state"] = "AVAILABLE_CANDIDATE"
                expected["capability_reference_digest_candidate"] =
                    payload["capability_reference_digest_candidate"]
                expected["capability_generation_candidate"] = payload["capability_generation"]
                expected["capability_expires_at_candidate"] = NSNull()
                expected["capability_freshness_basis"] =
                    "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE"
                expected["capability_lineage_head_reference_digest_candidate"] =
                    payload["capability_reference_digest_candidate"]
                break
            }
            guard previous.eventKind == "CHALLENGE_TERMINALIZATION_CANDIDATE",
                  freshness(payload, prior),
                  prior["challenge_candidate_state"] as? String ==
                    "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
                  payload["challenge_reference_digest_candidate"] as? String ==
                    prior["challenge_reference_digest_candidate"] as? String,
                  payload["native_ceremony_session_reference_digest_candidate"] as? String ==
                    prior["challenge_native_session_reference_digest_candidate"] as? String,
                  payload["actor_reference_digest_candidate"] as? String ==
                    prior["actor_reference_digest_candidate"] as? String,
                  payload["previous_capability_or_revocation_reference_digest_candidate"] as? String ==
                    prior["capability_lineage_head_reference_digest_candidate"] as? String,
                  exact(payload["capability_generation"]) ==
                    (exact(prior["capability_generation_candidate"]) ?? UInt64.max) &+ 1,
                  prior["capability_candidate_state"] as? String != "AVAILABLE_CANDIDATE",
                  payload["issued_at_candidate"] as? String ==
                    payload["proposed_monotonic_floor_timestamp_candidate"] as? String
            else { return false }
            expected["capability_candidate_state"] = "AVAILABLE_CANDIDATE"
            expected["capability_reference_digest_candidate"] =
                payload["capability_reference_digest_candidate"]
            expected["capability_generation_candidate"] = payload["capability_generation"]
            expected["capability_expires_at_candidate"] = payload["expires_at_candidate"]
            expected["capability_freshness_basis"] = payload["freshness_basis"]
            expected["capability_lineage_head_reference_digest_candidate"] =
                payload["capability_reference_digest_candidate"]
            expected["monotonic_floor_timestamp_candidate"] =
                payload["proposed_monotonic_floor_timestamp_candidate"]
        case "CAPABILITY_TERMINALIZATION_CANDIDATE":
            guard freshness(payload, prior),
                  prior["capability_candidate_state"] as? String == "AVAILABLE_CANDIDATE",
                  payload["capability_reference_digest_candidate"] as? String ==
                    prior["capability_reference_digest_candidate"] as? String,
                  payload["native_ceremony_session_reference_digest_candidate"] as? String ==
                    prior["challenge_native_session_reference_digest_candidate"] as? String,
                  payload["observed_at_candidate"] as? String ==
                    payload["proposed_monotonic_floor_timestamp_candidate"] as? String,
                  withinCapabilityExpiry(
                    payload["observed_at_candidate"],
                    prior["capability_expires_at_candidate"],
                    terminal: payload["terminal_state"])
            else { return false }
            expected["capability_candidate_state"] = payload["terminal_state"]
            expected["monotonic_floor_timestamp_candidate"] =
                payload["proposed_monotonic_floor_timestamp_candidate"]
        case "CLOCK_FLOOR_ADVANCEMENT_CANDIDATE":
            guard prior["challenge_candidate_state"] as? String !=
                    CrossEpochChallengeRecoveryPolicy.terminalState,
                  payload["epoch_reference_digest_candidate"] as? String ==
                    prior["epoch_reference_digest_candidate"] as? String,
                  payload["prior_floor_timestamp_candidate"] as? String ==
                    prior["monotonic_floor_timestamp_candidate"] as? String,
                  payload["boot_session_reference_digest_candidate"] as? String ==
                    prior["boot_session_reference_digest_candidate"] as? String
            else { return false }
            expected["monotonic_floor_timestamp_candidate"] =
                payload["proposed_floor_timestamp_candidate"]
        case "CLOCK_EPOCH_SUPERSESSION_CANDIDATE":
            guard previous.eventKind == "CAPABILITY_ISSUANCE_CANDIDATE",
                  let predecessor = object(previous.eventPayloadCanonical),
                  let recovery = predecessor["boot_session_recovery_binding_candidate"]
                    as? [String: Any],
                  BootSessionRecoveryCapabilityPolicy.bindingIsStructurallyValid(
                    recovery, stage: "RECOVERY_CAPABILITY_ISSUANCE_CANDIDATE"),
                  recovery["recovery_purpose"] as? String ==
                    BootSessionRecoveryCapabilityPolicy.purpose,
                  recovery["recovery_capability_reference_digest_candidate"] as? String ==
                    payload["recovery_capability_reference_digest_candidate"] as? String,
                  recovery["old_epoch_reference_digest_candidate"] as? String ==
                    payload["previous_epoch_reference_digest_candidate"] as? String,
                  recovery["current_boot_session_reference_digest_candidate"] as? String ==
                    payload["boot_session_reference_digest_candidate"] as? String,
                  prior["epoch_reference_digest_candidate"] as? String ==
                    payload["previous_epoch_reference_digest_candidate"] as? String,
                  prior["capability_candidate_state"] as? String == "AVAILABLE_CANDIDATE",
                  prior["capability_freshness_basis"] as? String ==
                    "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
                  prior["capability_reference_digest_candidate"] as? String ==
                    payload["recovery_capability_reference_digest_candidate"] as? String,
                  prior["actor_reference_digest_candidate"] as? String ==
                    payload["recovery_actor_reference_digest_candidate"] as? String
            else { return false }
            expected["clock_candidate_state"] = "ESTABLISHMENT_CANDIDATE_PRESENT"
            expected["epoch_reference_digest_candidate"] =
                payload["proposed_new_epoch_reference_digest_candidate"]
            expected["monotonic_floor_timestamp_candidate"] =
                payload["proposed_new_floor_timestamp_candidate"]
            expected["boot_session_reference_digest_candidate"] =
                payload["boot_session_reference_digest_candidate"]
            expected["capability_candidate_state"] = "CONSUMED_CANDIDATE"
            expected["quarantine_candidate_state"] = "NOT_QUARANTINED_CANDIDATE"
            expected["publication_outcome_candidate"] = "KNOWN_SOURCE_CANDIDATE"
        case "RUNTIME_QUARANTINE_ENTERED_CANDIDATE":
            expected["quarantine_candidate_state"] = "QUARANTINE_REQUIRED_CANDIDATE"
            expected["publication_outcome_candidate"] = "OUTCOME_UNKNOWN_CANDIDATE"
        default:
            return false
        }
        guard let canonical = try? FarmOSCanonicalDigest.canonicalJSON(expected),
              let claimedCanonical = try? FarmOSCanonicalDigest.canonicalJSON(claimed)
        else { return false }
        return canonical == claimedCanonical
    }

    private static func object(_ canonical: String) -> [String: Any]? {
        (try? JSONSerialization.jsonObject(with: Data(canonical.utf8))) as? [String: Any]
    }

    private static func exact(_ value: Any?) -> UInt64? {
        guard let number = value as? NSNumber,
              number.doubleValue >= 0,
              number.doubleValue.rounded(.towardZero) == number.doubleValue,
              number.doubleValue <= 9_007_199_254_740_991
        else { return nil }
        return number.uint64Value
    }

    private static func freshness(_ payload: [String: Any], _ prior: [String: Any]) -> Bool {
        guard payload["freshness_basis"] as? String == "ACTIVE_TRUSTED_CLOCK_CANDIDATE",
              payload["clock_epoch_reference_digest_candidate"] as? String ==
                prior["epoch_reference_digest_candidate"] as? String,
              payload["prior_monotonic_floor_timestamp_candidate"] as? String ==
                prior["monotonic_floor_timestamp_candidate"] as? String,
              payload["boot_session_reference_digest_candidate"] as? String ==
                prior["boot_session_reference_digest_candidate"] as? String,
              let old = prior["monotonic_floor_timestamp_candidate"] as? String,
              let next = payload["proposed_monotonic_floor_timestamp_candidate"] as? String,
              old < next
        else { return false }
        return true
    }

    private static func withinExpiry(_ observed: Any?, _ expiry: Any?, terminal: Any?) -> Bool {
        guard let observed = observed as? String, let expiry = expiry as? String,
              let terminal = terminal as? String else { return false }
        return terminal == "EXPIRED_CANDIDATE" ? observed >= expiry : observed <= expiry
    }

    private static func withinCapabilityExpiry(
        _ observed: Any?, _ expiry: Any?, terminal: Any?
    ) -> Bool {
        guard let observed = observed as? String, let expiry = expiry as? String,
              let terminal = terminal as? String else { return false }
        return terminal == "EXPIRED_CANDIDATE" ? observed > expiry : observed <= expiry
    }
}

public final class IntegratedDisposableRun: @unchecked Sendable {
    public let parentFD: Int32
    public let runName: String
    public let preservedEvidenceManifestDigest: String
    public let preservedRunCount: Int

    private init(parentFD: Int32, runName: String, manifest: String, count: Int) {
        self.parentFD = parentFD
        self.runName = runName
        preservedEvidenceManifestDigest = manifest
        preservedRunCount = count
    }

    deinit { close(parentFD) }

    public static func createNew() -> IntegratedDisposableRun? {
        guard DisposableStoragePolicy.preferredRoot != DarwinStoragePolicy.canonicalLedgerRoot else {
            return nil
        }
        let parent = open(
            DisposableStoragePolicy.preferredRoot,
            O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC
        )
        guard parent >= 0, verifiedParent(parent),
              let reconciliation = exactReadOnlyReconciliation(parent)
        else {
            if parent >= 0 { close(parent) }
            return nil
        }
        for _ in 0..<16 {
            var random = [UInt8](repeating: 0, count: 8)
            guard SecRandomCopyBytes(kSecRandomDefault, random.count, &random) == errSecSuccess else {
                close(parent); return nil
            }
            let name = "run-" + random.map { String(format: "%02x", $0) }.joined()
            guard mkdirat(parent, name, 0o700) == 0 else {
                if errno == EEXIST { continue }
                close(parent); return nil
            }
            guard fcntl(parent, F_FULLFSYNC) == 0 else {
                close(parent); return nil
            }
            return IntegratedDisposableRun(
                parentFD: parent, runName: name,
                manifest: reconciliation.digest, count: reconciliation.count
            )
        }
        close(parent)
        return nil
    }

    public static func reopen(name: String) -> IntegratedDisposableRun? {
        guard name.range(of: #"^run-[a-f0-9]{16}$"#, options: .regularExpression) != nil else {
            return nil
        }
        let parent = open(
            DisposableStoragePolicy.preferredRoot,
            O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC
        )
        guard parent >= 0, verifiedParent(parent),
              let reconciliation = exactReadOnlyReconciliation(parent),
              reconciliation.names.contains(name)
        else {
            if parent >= 0 { close(parent) }
            return nil
        }
        return IntegratedDisposableRun(
            parentFD: parent, runName: name,
            manifest: reconciliation.digest, count: reconciliation.count - 1
        )
    }

    private static func verifiedParent(_ fd: Int32) -> Bool {
        var metadata = stat()
        var fs = statfs()
        guard fstat(fd, &metadata) == 0, fstatfs(fd, &fs) == 0,
              (metadata.st_mode & S_IFMT) == S_IFDIR,
              (metadata.st_mode & 0o7777) == 0o700,
              metadata.st_uid == getuid(), metadata.st_gid == getgid(),
              (fs.f_flags & UInt32(MNT_LOCAL)) != 0
        else { return false }
        let type = withUnsafePointer(to: &fs.f_fstypename) {
            $0.withMemoryRebound(to: CChar.self, capacity: Int(MFSNAMELEN)) {
                String(cString: $0)
            }
        }
        return type == DisposableStoragePolicy.expectedFilesystem
    }

    private static func exactReadOnlyReconciliation(
        _ fd: Int32
    ) -> (digest: String, count: Int, names: Set<String>)? {
        let duplicate = dup(fd)
        guard duplicate >= 0, let directory = fdopendir(duplicate) else {
            if duplicate >= 0 { close(duplicate) }
            return nil
        }
        defer { closedir(directory) }
        var names = Set<String>()
        while let entry = readdir(directory) {
            let name = withUnsafePointer(to: &entry.pointee.d_name) {
                $0.withMemoryRebound(to: CChar.self, capacity: Int(MAXNAMLEN) + 1) {
                    String(cString: $0)
                }
            }
            if name != "." && name != ".." { names.insert(name) }
        }
        guard names.allSatisfy({
            $0.range(of: #"^run-[a-f0-9]{16}$"#, options: .regularExpression) != nil
        }) else { return nil }
        var manifest = ""
        for name in names.sorted() {
            let runFD = openat(fd, name, O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC)
            guard runFD >= 0, let digest = exactRunManifest(runFD) else {
                if runFD >= 0 { close(runFD) }
                return nil
            }
            close(runFD)
            manifest += "\(name):\(digest)\n"
        }
        return (
            FarmOSCanonicalDigest.sha256(
                domain: "farmos.day150-c2b-preserved-disposable-manifest.v1",
                canonicalValue: manifest
            ),
            names.count,
            names
        )
    }

    private static func exactRunManifest(_ runFD: Int32) -> String? {
        let duplicate = dup(runFD)
        guard duplicate >= 0, let directory = fdopendir(duplicate) else {
            if duplicate >= 0 { close(duplicate) }
            return nil
        }
        defer { closedir(directory) }
        var names = Set<String>()
        while let entry = readdir(directory) {
            let name = withUnsafePointer(to: &entry.pointee.d_name) {
                $0.withMemoryRebound(to: CChar.self, capacity: Int(MAXNAMLEN) + 1) {
                    String(cString: $0)
                }
            }
            if name != "." && name != ".." { names.insert(name) }
        }
        var manifest = ""
        for name in names.sorted() {
            var metadata = stat()
            guard fstatat(runFD, name, &metadata, AT_SYMLINK_NOFOLLOW) == 0,
                  (metadata.st_mode & S_IFMT) == S_IFREG,
                  metadata.st_uid == getuid(), metadata.st_gid == getgid(),
                  metadata.st_nlink == 1,
                  (metadata.st_mode & 0o7777) == 0o600
            else { return nil }
            let file = openat(runFD, name, O_RDONLY | O_NOFOLLOW | O_CLOEXEC)
            guard file >= 0 else { return nil }
            var data = Data()
            var buffer = [UInt8](repeating: 0, count: 16_384)
            while data.count <= DisposableStoragePolicy.maximumRecordBytes {
                let count = read(file, &buffer, buffer.count)
                if count == 0 { break }
                guard count > 0 else { close(file); return nil }
                data.append(contentsOf: buffer.prefix(count))
            }
            close(file)
            guard data.count <= DisposableStoragePolicy.maximumRecordBytes else { return nil }
            let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
            manifest += "\(name):\(digest)\n"
        }
        return SHA256.hash(data: Data(manifest.utf8))
            .map { String(format: "%02x", $0) }.joined()
    }
}
