import CryptoKit
import CoreFoundation
import Darwin
import Foundation

public enum DisposableStoragePolicy {
    public static let preferredRoot =
        "/Users/hayate/Library/Application Support/FarmOS/day150-c2b-bootstrap-qualification/r4-storage"
    public static let recordAuthority =
        "farmos.day150-c2b-bootstrap-runtime-provenance-record.v1"
    public static let recordDigestDomain =
        "farmos.day150-c2b-bootstrap-runtime-provenance-record.v1:record-body"
    public static let eventAuthority =
        "farmos.day150-c2b-bootstrap-runtime-provenance-event.v1"
    public static let projectionAuthority =
        "farmos.day150-c2b-bootstrap-runtime-provenance-source-projection.v1"
    public static let maximumRecordBytes = 1_048_576
    public static let expectedFilesystem = "apfs"
}

public struct DisposableRuntimeRecord: Equatable, Sendable {
    public let generation: UInt64
    public let previousGeneration: UInt64?
    public let previousRecordDigest: String?
    public let recordDigest: String
    public let canonicalBytes: Data
    public let sourceBindingsCanonical: String
    public let eventKind: String
    public let projectionInvariantCanonical: String
    public let eventPayloadCanonical: String
    public let projectionCanonical: String
    public let issuedChallengeReference: String?
    public let issuedCapabilityReference: String?
    public let usedRecoverySessionReference: String?

    fileprivate init(
        generation: UInt64,
        previousGeneration: UInt64?,
        previousRecordDigest: String?,
        recordDigest: String,
        canonicalBytes: Data,
        sourceBindingsCanonical: String,
        eventKind: String,
        projectionInvariantCanonical: String,
        eventPayloadCanonical: String,
        projectionCanonical: String,
        issuedChallengeReference: String?,
        issuedCapabilityReference: String?,
        usedRecoverySessionReference: String?
    ) {
        self.generation = generation
        self.previousGeneration = previousGeneration
        self.previousRecordDigest = previousRecordDigest
        self.recordDigest = recordDigest
        self.canonicalBytes = canonicalBytes
        self.sourceBindingsCanonical = sourceBindingsCanonical
        self.eventKind = eventKind
        self.projectionInvariantCanonical = projectionInvariantCanonical
        self.eventPayloadCanonical = eventPayloadCanonical
        self.projectionCanonical = projectionCanonical
        self.issuedChallengeReference = issuedChallengeReference
        self.issuedCapabilityReference = issuedCapabilityReference
        self.usedRecoverySessionReference = usedRecoverySessionReference
    }
}

public enum DisposableRecordValidator {
    private static let envelopeKeys: Set<String> = ["record_body", "record_digest"]
    private static let bodyKeys: Set<String> = [
        "schema_version", "authority_id", "authority_revision", "generation",
        "previous_generation", "previous_record_digest", "source_bindings", "event",
        "projected_source_state_claim",
    ]
    private static let bindingsKeys: Set<String> = [
        "manifest_authority", "manifest_digest", "r2_record_authority",
        "r2_genesis_source_candidate_digest", "r3_actor_source_authority",
        "r3_actor_source_candidate_digest", "r3_clock_source_authority",
        "r3_clock_source_candidate_digest", "installation_profile_digest_candidate",
        "native_profile_digest_candidate", "companion_artifact_reference_digest_candidate",
    ]
    private static let projectionKeys: Set<String> = [
        "schema_version", "discriminator", "bootstrap_candidate_state",
        "actor_candidate_state", "actor_reference_digest_candidate",
        "challenge_candidate_state", "challenge_reference_digest_candidate",
        "challenge_native_session_reference_digest_candidate", "challenge_expires_at_candidate",
        "challenge_freshness_basis", "capability_candidate_state",
        "capability_reference_digest_candidate", "capability_generation_candidate",
        "capability_expires_at_candidate", "capability_freshness_basis",
        "capability_lineage_head_reference_digest_candidate", "clock_candidate_state",
        "epoch_reference_digest_candidate", "monotonic_floor_timestamp_candidate",
        "boot_session_reference_digest_candidate", "quarantine_candidate_state",
        "publication_outcome_candidate",
    ]
    private static let genesisPayloadKeys: Set<String> = [
        "proposal_reference_digest", "proposal_body_candidate", "proposal_target_binding_digest",
        "human_approval_decision_reference_digest", "human_approval_decision_body_candidate",
        "approval_decision_proposal_reference_digest",
        "approval_decision_actor_reference_digest_candidate",
        "approval_decision_challenge_reference_digest_candidate",
        "approval_receipt_reference_digest", "approval_receipt_body_candidate",
        "approval_receipt_proposal_reference_digest", "approval_receipt_decision_reference_digest",
        "approval_receipt_actor_reference_digest_candidate",
        "approval_receipt_challenge_reference_digest_candidate",
        "approval_receipt_capability_reference_digest_candidate",
        "actor_reference_digest_candidate", "native_ceremony_session_reference_digest_candidate",
        "initial_challenge_reference_digest_candidate", "initial_challenge_terminal_state",
        "bootstrap_capability_reference_digest_candidate", "bootstrap_capability_terminal_state",
        "os_utc_observation_reference_digest_candidate",
        "continuous_time_bracket_reference_digest_candidate", "boot_session_reference_digest_candidate",
        "human_time_plausibility_confirmation_reference_digest",
        "proposed_epoch_reference_digest_candidate", "proposed_genesis_timestamp_candidate",
        "proposed_initial_monotonic_floor_timestamp_candidate", "actor_policy_revision",
        "clock_policy_revision", "publication_policy_revision",
    ]
    private static let freshnessKeys: Set<String> = [
        "freshness_basis", "clock_epoch_reference_digest_candidate",
        "prior_monotonic_floor_timestamp_candidate",
        "proposed_monotonic_floor_timestamp_candidate",
        "os_utc_observation_reference_digest_candidate",
        "continuous_time_bracket_reference_digest_candidate",
        "boot_session_reference_digest_candidate",
        "native_recovery_session_reference_digest_candidate",
        "clock_comparison_policy_revision",
    ]

    public static func parse(_ bytes: Data) -> DisposableRuntimeRecord? {
        guard !bytes.isEmpty, bytes.count <= DisposableStoragePolicy.maximumRecordBytes,
              let root = try? JSONSerialization.jsonObject(with: bytes),
              let envelope = root as? [String: Any], Set(envelope.keys) == envelopeKeys,
              let body = envelope["record_body"] as? [String: Any], Set(body.keys) == bodyKeys,
              body["schema_version"] as? String == DisposableStoragePolicy.recordAuthority,
              body["authority_id"] as? String == DisposableStoragePolicy.recordAuthority,
              exactUInt(body["authority_revision"]) == 1,
              let generation = exactUInt(body["generation"]),
              let bindings = body["source_bindings"] as? [String: Any],
              validateBindings(bindings),
              let event = body["event"] as? [String: Any],
              Set(event.keys) == Set(["schema_version", "event_kind", "payload"]),
              event["schema_version"] as? String == DisposableStoragePolicy.eventAuthority,
              let eventKind = event["event_kind"] as? String,
              let payload = event["payload"] as? [String: Any],
              validateEvent(kind: eventKind, payload: payload, bindings: bindings),
              let projection = body["projected_source_state_claim"] as? [String: Any],
              validateProjection(projection, eventKind: eventKind, payload: payload),
              let recordDigest = envelope["record_digest"] as? String,
              FarmOSCanonicalDigest.isDigest(recordDigest),
              let canonicalBody = try? FarmOSCanonicalDigest.canonicalJSON(body),
              FarmOSCanonicalDigest.sha256(
                domain: DisposableStoragePolicy.recordDigestDomain,
                canonicalValue: canonicalBody
              ) == recordDigest
        else { return nil }

        let previousGeneration: UInt64?
        let previousDigest: String?
        if generation == 0 {
            guard body["previous_generation"] is NSNull,
                  body["previous_record_digest"] is NSNull,
                  eventKind == "INTEGRATED_RUNTIME_GENESIS_CANDIDATE"
            else { return nil }
            previousGeneration = nil
            previousDigest = nil
        } else {
            guard let parsedPrevious = exactUInt(body["previous_generation"]),
                  parsedPrevious + 1 == generation,
                  let parsedDigest = body["previous_record_digest"] as? String,
                  FarmOSCanonicalDigest.isDigest(parsedDigest),
                  eventKind != "INTEGRATED_RUNTIME_GENESIS_CANDIDATE"
            else { return nil }
            previousGeneration = parsedPrevious
            previousDigest = parsedDigest
        }
        guard let canonicalEnvelope = try? FarmOSCanonicalDigest.canonicalJSON(envelope),
              Data(canonicalEnvelope.utf8) == bytes,
              let sourceBindingsCanonical = try? FarmOSCanonicalDigest.canonicalJSON(bindings),
              let projectionInvariantCanonical = projectionInvariant(projection),
              let eventPayloadCanonical = try? FarmOSCanonicalDigest.canonicalJSON(payload),
              let projectionCanonical = try? FarmOSCanonicalDigest.canonicalJSON(projection)
        else { return nil }
        let recoveryBinding = payload["cross_epoch_recovery_binding_candidate"] as? [String: Any]
        let bootRecoveryBinding = payload[
            "boot_session_recovery_binding_candidate"] as? [String: Any]
        let usedRecoverySession = eventKind == "CHALLENGE_TERMINALIZATION_CANDIDATE"
            ? recoveryBinding?["recovery_session_reference_digest_candidate"] as? String
            : eventKind == "CHALLENGE_ISSUANCE_CANDIDATE"
                ? bootRecoveryBinding?["recovery_session_reference_digest_candidate"] as? String
                : nil
        return DisposableRuntimeRecord(
            generation: generation,
            previousGeneration: previousGeneration,
            previousRecordDigest: previousDigest,
            recordDigest: recordDigest,
            canonicalBytes: bytes,
            sourceBindingsCanonical: sourceBindingsCanonical,
            eventKind: eventKind,
            projectionInvariantCanonical: projectionInvariantCanonical,
            eventPayloadCanonical: eventPayloadCanonical,
            projectionCanonical: projectionCanonical,
            issuedChallengeReference: eventKind == "CHALLENGE_ISSUANCE_CANDIDATE"
                ? payload["challenge_reference_digest_candidate"] as? String : nil,
            issuedCapabilityReference: eventKind == "CAPABILITY_ISSUANCE_CANDIDATE"
                ? payload["capability_reference_digest_candidate"] as? String : nil,
            usedRecoverySessionReference: usedRecoverySession
        )
    }

    public static func qualificationRecord(
        generation: UInt64,
        previousDigest: String?,
        discriminator: String
    ) -> Data {
        let bindings = qualificationBindings(marker: discriminator)
        let event: [String: Any]
        let projection: [String: Any]
        if generation == 0 {
            (event, projection) = qualificationGenesis(bindings: bindings)
        } else {
            event = [
                "schema_version": DisposableStoragePolicy.eventAuthority,
                "event_kind": "RUNTIME_QUARANTINE_ENTERED_CANDIDATE",
                "payload": [
                    "reason": "PUBLICATION_OUTCOME_UNKNOWN_CANDIDATE",
                    "evidence_reference_digest_candidate": discriminator,
                    "outcome": "OUTCOME_UNKNOWN_CANDIDATE",
                    "automatic_retry": false,
                    "automatic_cleanup": false,
                ],
            ]
            projection = qualificationProjection(
                quarantine: "QUARANTINE_REQUIRED_CANDIDATE",
                publication: "OUTCOME_UNKNOWN_CANDIDATE"
            )
        }
        let body: [String: Any] = [
            "schema_version": DisposableStoragePolicy.recordAuthority,
            "authority_id": DisposableStoragePolicy.recordAuthority,
            "authority_revision": 1,
            "generation": NSNumber(value: generation),
            "previous_generation": generation == 0 ? NSNull() : NSNumber(value: generation - 1),
            "previous_record_digest": previousDigest as Any? ?? NSNull(),
            "source_bindings": bindings,
            "event": event,
            "projected_source_state_claim": projection,
        ]
        let canonicalBody = try! FarmOSCanonicalDigest.canonicalJSON(body)
        let digest = FarmOSCanonicalDigest.sha256(
            domain: DisposableStoragePolicy.recordDigestDomain,
            canonicalValue: canonicalBody
        )
        let envelope: [String: Any] = ["record_body": body, "record_digest": digest]
        return Data(try! FarmOSCanonicalDigest.canonicalJSON(envelope).utf8)
    }

    private static func exactUInt(_ value: Any?) -> UInt64? {
        guard let number = value as? NSNumber,
              CFGetTypeID(number) != CFBooleanGetTypeID(),
              number.doubleValue.isFinite,
              number.doubleValue >= 0,
              number.doubleValue.rounded(.towardZero) == number.doubleValue,
              number.doubleValue <= 9_007_199_254_740_991
        else { return nil }
        return number.uint64Value
    }

    private static func digest(_ value: Any?) -> String? {
        guard let value = value as? String, FarmOSCanonicalDigest.isDigest(value) else {
            return nil
        }
        return value
    }

    private static func validateBindings(_ value: [String: Any]) -> Bool {
        Set(value.keys) == bindingsKeys &&
        value["manifest_authority"] as? String == "farmos.day150-c2b-bootstrap-manifest.v1" &&
        value["manifest_digest"] as? String ==
            "sha256:a332368cbdca6461e11f538085a8bea3bfbd63f20cc0066302412d309e9e11be" &&
        value["r2_record_authority"] as? String ==
            "farmos.day150-c2b-bootstrap-ledger-record.v1" &&
        value["r2_genesis_source_candidate_digest"] as? String ==
            "sha256:98e57a4f41639b64e1b992e3e6ccf56c3f0b625916ded4d2b2c4fc56760376f4" &&
        value["r3_actor_source_authority"] as? String ==
            "farmos.day150-c2b-bootstrap-actor-intent-source.v1" &&
        digest(value["r3_actor_source_candidate_digest"]) != nil &&
        value["r3_clock_source_authority"] as? String ==
            "farmos.day150-c2b-bootstrap-clock-intent-source.v1" &&
        digest(value["r3_clock_source_candidate_digest"]) != nil &&
        digest(value["installation_profile_digest_candidate"]) != nil &&
        digest(value["native_profile_digest_candidate"]) != nil &&
        digest(value["companion_artifact_reference_digest_candidate"]) != nil
    }

    private static func validateEvent(
        kind: String, payload: [String: Any], bindings: [String: Any]
    ) -> Bool {
        switch kind {
        case "INTEGRATED_RUNTIME_GENESIS_CANDIDATE":
            return validateGenesis(payload: payload, bindings: bindings)
        case "CHALLENGE_ISSUANCE_CANDIDATE":
            let base = freshnessKeys.union([
                "challenge_reference_digest_candidate", "actor_reference_digest_candidate",
                "native_ceremony_session_reference_digest_candidate", "expires_at_candidate",
                "issued_at_candidate", "scope",
            ])
            let recovery = payload["boot_session_recovery_binding_candidate"] as? [String: Any]
            let keysValid = Set(payload.keys) == base ||
                Set(payload.keys) == base.union(["boot_session_recovery_binding_candidate"])
            let timeValid = recovery == nil
                ? timestamp(payload["issued_at_candidate"]) && timestamp(payload["expires_at_candidate"]) &&
                    (payload["issued_at_candidate"] as? String)! <
                        (payload["expires_at_candidate"] as? String)!
                : payload["issued_at_candidate"] is NSNull &&
                    payload["expires_at_candidate"] is NSNull &&
                    BootSessionRecoveryCapabilityPolicy.bindingIsStructurallyValid(
                        recovery, stage: "RECOVERY_CHALLENGE_ISSUANCE_CANDIDATE")
            return keysValid && digests(payload, [
                "challenge_reference_digest_candidate", "actor_reference_digest_candidate",
                "native_ceremony_session_reference_digest_candidate",
            ]) && timeValid &&
            payload["scope"] as? String == "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION" &&
            validateFreshness(payload)
        case "CHALLENGE_TERMINALIZATION_CANDIDATE":
            let normalKeys = freshnessKeys.union([
                "challenge_reference_digest_candidate", "terminal_state",
                "terminal_reference_digest_candidate", "observed_at_candidate",
                "native_ceremony_session_reference_digest_candidate",
            ])
            let crossEpoch = payload["cross_epoch_recovery_binding_candidate"] as? [String: Any]
            let recovery = payload["boot_session_recovery_binding_candidate"] as? [String: Any]
            let keysValid = Set(payload.keys) == normalKeys ||
                Set(payload.keys) == normalKeys.union(["cross_epoch_recovery_binding_candidate"]) ||
                Set(payload.keys) == normalKeys.union(["boot_session_recovery_binding_candidate"])
            let special = payload["terminal_state"] as? String ==
                "BOOT_SESSION_INVALIDATED_CANDIDATE"
            return keysValid && digests(payload, [
                "challenge_reference_digest_candidate", "terminal_reference_digest_candidate",
                "native_ceremony_session_reference_digest_candidate",
            ]) && Set(["CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
                   "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
                   "CONSUMED_APPROVAL_FAILURE_CANDIDATE",
                   "ABANDONED_CANDIDATE", "EXPIRED_CANDIDATE", "OUTCOME_UNKNOWN_CANDIDATE",
                   "BOOT_SESSION_INVALIDATED_CANDIDATE"]
                ).contains(payload["terminal_state"] as? String ?? "") &&
            validateFreshness(payload) && (special
                ? payload["observed_at_candidate"] is NSNull &&
                    CrossEpochChallengeRecoveryPolicy.bindingIsStructurallyValid(crossEpoch)
                : crossEpoch == nil && (recovery == nil
                    ? timestamp(payload["observed_at_candidate"])
                    : payload["observed_at_candidate"] is NSNull &&
                        payload["terminal_state"] as? String ==
                            "CONSUMED_APPROVAL_SUCCESS_CANDIDATE" &&
                        BootSessionRecoveryCapabilityPolicy.bindingIsStructurallyValid(
                            recovery, stage: "RECOVERY_CHALLENGE_TERMINALIZATION_CANDIDATE")))
        case "CAPABILITY_ISSUANCE_CANDIDATE":
            let base = freshnessKeys.union([
                "capability_reference_digest_candidate", "actor_reference_digest_candidate",
                "challenge_reference_digest_candidate",
                "native_ceremony_session_reference_digest_candidate", "capability_generation",
                "previous_capability_or_revocation_reference_digest_candidate",
                "expires_at_candidate", "issued_at_candidate", "scope", "one_shot",
            ])
            let recovery = payload["boot_session_recovery_binding_candidate"] as? [String: Any]
            let keysValid = Set(payload.keys) == base ||
                Set(payload.keys) == base.union(["boot_session_recovery_binding_candidate"])
            let timeValid = recovery == nil
                ? timestamp(payload["issued_at_candidate"]) && timestamp(payload["expires_at_candidate"]) &&
                    exactNormalCapabilityLifetime(
                        issuedAt: payload["issued_at_candidate"],
                        expiresAt: payload["expires_at_candidate"])
                : payload["issued_at_candidate"] is NSNull &&
                    payload["expires_at_candidate"] is NSNull &&
                    BootSessionRecoveryCapabilityPolicy.bindingIsStructurallyValid(
                        recovery, stage: "RECOVERY_CAPABILITY_ISSUANCE_CANDIDATE")
            return keysValid && digests(payload, [
                "capability_reference_digest_candidate", "actor_reference_digest_candidate",
                "challenge_reference_digest_candidate",
                "native_ceremony_session_reference_digest_candidate",
                "previous_capability_or_revocation_reference_digest_candidate",
            ]) && exactUInt(payload["capability_generation"]) != nil && timeValid &&
            payload["scope"] as? String == "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION" &&
            payload["one_shot"] as? Bool == true && validateFreshness(payload)
        case "CAPABILITY_TERMINALIZATION_CANDIDATE":
            return Set(payload.keys) == freshnessKeys.union([
                "capability_reference_digest_candidate", "terminal_state",
                "terminal_reference_digest_candidate", "observed_at_candidate",
                "native_ceremony_session_reference_digest_candidate",
            ]) && digests(payload, [
                "capability_reference_digest_candidate", "terminal_reference_digest_candidate",
                "native_ceremony_session_reference_digest_candidate",
            ]) && Set(["CONSUMED_CANDIDATE", "EXPIRED_CANDIDATE", "REVOKED_CANDIDATE",
                   "REPLACED_CANDIDATE", "OUTCOME_UNKNOWN_CANDIDATE"]
                ).contains(payload["terminal_state"] as? String ?? "") &&
            timestamp(payload["observed_at_candidate"]) && validateFreshness(payload)
        case "CLOCK_FLOOR_ADVANCEMENT_CANDIDATE":
            return Set(payload.keys) == Set([
                "epoch_reference_digest_candidate", "prior_floor_timestamp_candidate",
                "proposed_floor_timestamp_candidate", "os_utc_observation_reference_digest_candidate",
                "continuous_time_bracket_reference_digest_candidate",
                "boot_session_reference_digest_candidate", "comparison_policy_revision",
            ]) && digests(payload, [
                "epoch_reference_digest_candidate", "os_utc_observation_reference_digest_candidate",
                "continuous_time_bracket_reference_digest_candidate",
                "boot_session_reference_digest_candidate",
            ]) && timestamp(payload["prior_floor_timestamp_candidate"]) &&
            timestamp(payload["proposed_floor_timestamp_candidate"]) &&
            (payload["prior_floor_timestamp_candidate"] as? String)! <
                (payload["proposed_floor_timestamp_candidate"] as? String)! &&
            exactUInt(payload["comparison_policy_revision"]) == 1
        case "CLOCK_EPOCH_SUPERSESSION_CANDIDATE":
            return Set(payload.keys) == Set([
                "previous_epoch_reference_digest_candidate",
                "proposed_new_epoch_reference_digest_candidate",
                "recovery_actor_reference_digest_candidate",
                "recovery_capability_reference_digest_candidate",
                "proposed_corrected_genesis_timestamp_candidate",
                "proposed_new_floor_timestamp_candidate",
                "affected_record_policy_reference_digest_candidate",
                "os_utc_observation_reference_digest_candidate",
                "continuous_time_bracket_reference_digest_candidate",
                "boot_session_reference_digest_candidate",
            ]) && digests(payload, [
                "previous_epoch_reference_digest_candidate",
                "proposed_new_epoch_reference_digest_candidate",
                "recovery_actor_reference_digest_candidate",
                "recovery_capability_reference_digest_candidate",
                "affected_record_policy_reference_digest_candidate",
                "os_utc_observation_reference_digest_candidate",
                "continuous_time_bracket_reference_digest_candidate",
                "boot_session_reference_digest_candidate",
            ]) && payload["previous_epoch_reference_digest_candidate"] as? String !=
                payload["proposed_new_epoch_reference_digest_candidate"] as? String &&
                timestamp(payload["proposed_corrected_genesis_timestamp_candidate"]) &&
                timestamp(payload["proposed_new_floor_timestamp_candidate"])
        case "RUNTIME_QUARANTINE_ENTERED_CANDIDATE":
            return Set(payload.keys) == Set([
                "reason", "evidence_reference_digest_candidate", "outcome",
                "automatic_retry", "automatic_cleanup",
            ]) && payload["reason"] as? String == "PUBLICATION_OUTCOME_UNKNOWN_CANDIDATE" &&
            digest(payload["evidence_reference_digest_candidate"]) != nil &&
            payload["outcome"] as? String == "OUTCOME_UNKNOWN_CANDIDATE" &&
            payload["automatic_retry"] as? Bool == false &&
            payload["automatic_cleanup"] as? Bool == false
        default:
            return false
        }
    }

    private static func digests(_ payload: [String: Any], _ keys: [String]) -> Bool {
        keys.allSatisfy { digest(payload[$0]) != nil }
    }

    private static func timestamp(_ value: Any?) -> Bool {
        guard let value = value as? String else { return false }
        let pattern = #"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]{3}Z$"#
        return value.range(of: pattern, options: .regularExpression) != nil
    }

    private static func exactNormalCapabilityLifetime(
        issuedAt: Any?, expiresAt: Any?
    ) -> Bool {
        guard let issuedAt = issuedAt as? String, let expiresAt = expiresAt as? String else {
            return false
        }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        guard let issued = formatter.date(from: issuedAt),
              let expiry = formatter.date(from: expiresAt)
        else { return false }
        return expiry.timeIntervalSince(issued) ==
            PostGen0NormalCapabilityTTLPolicy.lifetimeSeconds
    }

    private static func validateFreshness(_ payload: [String: Any]) -> Bool {
        if payload["freshness_basis"] as? String ==
            "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE" {
            return digest(payload["native_recovery_session_reference_digest_candidate"]) != nil &&
                payload["clock_epoch_reference_digest_candidate"] is NSNull &&
                payload["prior_monotonic_floor_timestamp_candidate"] is NSNull &&
                payload["proposed_monotonic_floor_timestamp_candidate"] is NSNull &&
                payload["os_utc_observation_reference_digest_candidate"] is NSNull &&
                payload["continuous_time_bracket_reference_digest_candidate"] is NSNull &&
                payload["boot_session_reference_digest_candidate"] is NSNull &&
                exactUInt(payload["clock_comparison_policy_revision"]) == 1
        }
        guard payload["freshness_basis"] as? String == "ACTIVE_TRUSTED_CLOCK_CANDIDATE",
              digests(payload, [
                "clock_epoch_reference_digest_candidate",
                "os_utc_observation_reference_digest_candidate",
                "continuous_time_bracket_reference_digest_candidate",
                "boot_session_reference_digest_candidate",
              ]), timestamp(payload["prior_monotonic_floor_timestamp_candidate"]),
              timestamp(payload["proposed_monotonic_floor_timestamp_candidate"]),
              payload["native_recovery_session_reference_digest_candidate"] is NSNull,
              exactUInt(payload["clock_comparison_policy_revision"]) == 1,
              let prior = payload["prior_monotonic_floor_timestamp_candidate"] as? String,
              let proposed = payload["proposed_monotonic_floor_timestamp_candidate"] as? String,
              prior < proposed
        else { return false }
        return true
    }

    private static func validateGenesis(
        payload: [String: Any], bindings: [String: Any]
    ) -> Bool {
        guard Set(payload.keys) == genesisPayloadKeys,
              let proposal = payload["proposal_body_candidate"] as? [String: Any],
              let decision = payload["human_approval_decision_body_candidate"] as? [String: Any],
              let receipt = payload["approval_receipt_body_candidate"] as? [String: Any],
              Set(proposal.keys) == Set([
                "schema_version", "purpose", "target_binding_digest",
                "actor_reference_digest_candidate", "challenge_reference_digest_candidate",
                "native_ceremony_session_reference_digest_candidate",
                "os_utc_observation_reference_digest_candidate",
                "human_time_plausibility_confirmation_reference_digest",
                "actor_policy_revision", "clock_policy_revision",
                "publication_policy_revision", "companion_artifact_reference_digest_candidate",
              ]),
              Set(decision.keys) == Set([
                "schema_version", "decision", "proposal_reference_digest",
                "actor_reference_digest_candidate", "challenge_reference_digest_candidate",
                "authentication_mechanism_revision",
              ]),
              Set(receipt.keys) == Set([
                "schema_version", "proposal_reference_digest",
                "approval_decision_reference_digest", "actor_reference_digest_candidate",
                "challenge_reference_digest_candidate", "challenge_terminal_state",
                "capability_reference_digest_candidate", "capability_terminal_state",
              ]),
              proposal["schema_version"] as? String ==
                "farmos.day150-c2b-bootstrap-runtime-genesis-proposal.v1",
              proposal["purpose"] as? String ==
                "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION",
              decision["schema_version"] as? String ==
                "farmos.day150-c2b-bootstrap-runtime-genesis-approval-decision.v1",
              decision["decision"] as? String == "APPROVE",
              exactUInt(decision["authentication_mechanism_revision"]) == 1,
              receipt["schema_version"] as? String ==
                "farmos.day150-c2b-bootstrap-runtime-genesis-approval-receipt.v1",
              exactUInt(proposal["actor_policy_revision"]) == 1,
              exactUInt(proposal["clock_policy_revision"]) == 1,
              exactUInt(proposal["publication_policy_revision"]) == 1,
              proposal["companion_artifact_reference_digest_candidate"] as? String ==
                bindings["companion_artifact_reference_digest_candidate"] as? String,
              proposal["actor_policy_revision"] as? NSNumber ==
                payload["actor_policy_revision"] as? NSNumber,
              proposal["clock_policy_revision"] as? NSNumber ==
                payload["clock_policy_revision"] as? NSNumber,
              proposal["publication_policy_revision"] as? NSNumber ==
                payload["publication_policy_revision"] as? NSNumber,
              receipt["challenge_terminal_state"] as? String ==
                "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
              receipt["capability_terminal_state"] as? String == "CONSUMED_CANDIDATE",
              exactUInt(payload["actor_policy_revision"]) == 1,
              exactUInt(payload["clock_policy_revision"]) == 1,
              exactUInt(payload["publication_policy_revision"]) == 1,
              payload["initial_challenge_terminal_state"] as? String ==
                "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
              payload["bootstrap_capability_terminal_state"] as? String == "CONSUMED_CANDIDATE",
              let genesisTime = payload["proposed_genesis_timestamp_candidate"] as? String,
              timestamp(genesisTime),
              payload["proposed_initial_monotonic_floor_timestamp_candidate"] as? String == genesisTime,
              let bindingJSON = try? FarmOSCanonicalDigest.canonicalJSON(bindings),
              let target = digest(payload["proposal_target_binding_digest"]),
              target == FarmOSCanonicalDigest.sha256(
                domain: "farmos.day150-c2b-bootstrap-runtime-provenance-record.v1:source-bindings",
                canonicalValue: bindingJSON
              ), proposal["target_binding_digest"] as? String == target,
              let proposalJSON = try? FarmOSCanonicalDigest.canonicalJSON(proposal),
              let proposalReference = digest(payload["proposal_reference_digest"]),
              proposalReference == FarmOSCanonicalDigest.sha256(
                domain: "farmos.day150-c2b-bootstrap-runtime-genesis-proposal.v1:body",
                canonicalValue: proposalJSON
              ),
              let decisionJSON = try? FarmOSCanonicalDigest.canonicalJSON(decision),
              let decisionReference = digest(payload["human_approval_decision_reference_digest"]),
              decisionReference == FarmOSCanonicalDigest.sha256(
                domain: "farmos.day150-c2b-bootstrap-runtime-genesis-approval-decision.v1:body",
                canonicalValue: decisionJSON
              ),
              let receiptJSON = try? FarmOSCanonicalDigest.canonicalJSON(receipt),
              let receiptReference = digest(payload["approval_receipt_reference_digest"]),
              receiptReference == FarmOSCanonicalDigest.sha256(
                domain: "farmos.day150-c2b-bootstrap-runtime-genesis-approval-receipt.v1:body",
                canonicalValue: receiptJSON
              )
        else { return false }
        let actor = payload["actor_reference_digest_candidate"] as? String
        let challenge = payload["initial_challenge_reference_digest_candidate"] as? String
        let capability = payload["bootstrap_capability_reference_digest_candidate"] as? String
        let session = payload["native_ceremony_session_reference_digest_candidate"] as? String
        let observation = payload["os_utc_observation_reference_digest_candidate"] as? String
        let confirmation = payload["human_time_plausibility_confirmation_reference_digest"] as? String
        let allDigestKeys = genesisPayloadKeys.filter {
            $0.hasSuffix("digest") || $0.hasSuffix("digest_candidate")
        }
        guard allDigestKeys.allSatisfy({ digest(payload[$0]) != nil }),
              [proposalReference, decisionReference, receiptReference].count ==
                Set([proposalReference, decisionReference, receiptReference]).count
        else { return false }
        return proposal["actor_reference_digest_candidate"] as? String == actor &&
            proposal["challenge_reference_digest_candidate"] as? String == challenge &&
            proposal["native_ceremony_session_reference_digest_candidate"] as? String == session &&
            proposal["os_utc_observation_reference_digest_candidate"] as? String == observation &&
            proposal["human_time_plausibility_confirmation_reference_digest"] as? String == confirmation &&
            decision["proposal_reference_digest"] as? String == proposalReference &&
            decision["actor_reference_digest_candidate"] as? String == actor &&
            decision["challenge_reference_digest_candidate"] as? String == challenge &&
            receipt["proposal_reference_digest"] as? String == proposalReference &&
            receipt["approval_decision_reference_digest"] as? String == decisionReference &&
            receipt["actor_reference_digest_candidate"] as? String == actor &&
            receipt["challenge_reference_digest_candidate"] as? String == challenge &&
            receipt["capability_reference_digest_candidate"] as? String == capability &&
            payload["approval_decision_proposal_reference_digest"] as? String == proposalReference &&
            payload["approval_decision_actor_reference_digest_candidate"] as? String == actor &&
            payload["approval_decision_challenge_reference_digest_candidate"] as? String == challenge &&
            payload["approval_receipt_proposal_reference_digest"] as? String == proposalReference &&
            payload["approval_receipt_decision_reference_digest"] as? String == decisionReference &&
            payload["approval_receipt_actor_reference_digest_candidate"] as? String == actor &&
            payload["approval_receipt_challenge_reference_digest_candidate"] as? String == challenge &&
            payload["approval_receipt_capability_reference_digest_candidate"] as? String == capability
    }

    private static func validateProjection(
        _ value: [String: Any], eventKind: String, payload: [String: Any]
    ) -> Bool {
        guard Set(value.keys) == projectionKeys,
              value["schema_version"] as? String == DisposableStoragePolicy.projectionAuthority,
              value["discriminator"] as? String == "SOURCE_PROJECTION_ONLY",
              value["bootstrap_candidate_state"] as? String == "INITIALIZED_CANDIDATE",
              value["actor_candidate_state"] as? String == "ESTABLISHMENT_CANDIDATE_PRESENT",
              digest(value["actor_reference_digest_candidate"]) != nil,
              Set(["OUTSTANDING_CANDIDATE", "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
               "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
               "CONSUMED_APPROVAL_FAILURE_CANDIDATE", "ABANDONED_CANDIDATE",
               "EXPIRED_CANDIDATE", "OUTCOME_UNKNOWN_CANDIDATE",
               "BOOT_SESSION_INVALIDATED_CANDIDATE"])
                .contains(value["challenge_candidate_state"] as? String ?? ""),
              digest(value["challenge_reference_digest_candidate"]) != nil,
              digest(value["challenge_native_session_reference_digest_candidate"]) != nil,
              value["challenge_expires_at_candidate"] is NSNull ||
                timestamp(value["challenge_expires_at_candidate"]),
              Set(["ACTIVE_TRUSTED_CLOCK_CANDIDATE", "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE"])
                .contains(value["challenge_freshness_basis"] as? String ?? ""),
              Set(["AVAILABLE_CANDIDATE", "CONSUMED_CANDIDATE", "EXPIRED_CANDIDATE",
               "REVOKED_CANDIDATE", "REPLACED_CANDIDATE", "OUTCOME_UNKNOWN_CANDIDATE"]
                ).contains(value["capability_candidate_state"] as? String ?? ""),
              digest(value["capability_reference_digest_candidate"]) != nil,
              exactUInt(value["capability_generation_candidate"]) != nil,
              value["capability_expires_at_candidate"] is NSNull ||
                timestamp(value["capability_expires_at_candidate"]),
              Set(["ACTIVE_TRUSTED_CLOCK_CANDIDATE", "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE"])
                .contains(value["capability_freshness_basis"] as? String ?? ""),
              digest(value["capability_lineage_head_reference_digest_candidate"]) != nil,
              value["clock_candidate_state"] as? String == "ESTABLISHMENT_CANDIDATE_PRESENT",
              digest(value["epoch_reference_digest_candidate"]) != nil,
              timestamp(value["monotonic_floor_timestamp_candidate"]),
              digest(value["boot_session_reference_digest_candidate"]) != nil,
              Set(["NOT_QUARANTINED_CANDIDATE", "QUARANTINE_REQUIRED_CANDIDATE"])
                .contains(value["quarantine_candidate_state"] as? String ?? ""),
              Set(["KNOWN_SOURCE_CANDIDATE", "OUTCOME_UNKNOWN_CANDIDATE"])
                .contains(value["publication_outcome_candidate"] as? String ?? "")
        else { return false }
        if eventKind == "INTEGRATED_RUNTIME_GENESIS_CANDIDATE" {
            return value["quarantine_candidate_state"] as? String == "NOT_QUARANTINED_CANDIDATE" &&
                value["publication_outcome_candidate"] as? String == "KNOWN_SOURCE_CANDIDATE" &&
                value["actor_reference_digest_candidate"] as? String ==
                    payload["actor_reference_digest_candidate"] as? String &&
                value["challenge_reference_digest_candidate"] as? String ==
                    payload["initial_challenge_reference_digest_candidate"] as? String &&
                value["challenge_native_session_reference_digest_candidate"] as? String ==
                    payload["native_ceremony_session_reference_digest_candidate"] as? String &&
                value["capability_reference_digest_candidate"] as? String ==
                    payload["bootstrap_capability_reference_digest_candidate"] as? String &&
                value["capability_lineage_head_reference_digest_candidate"] as? String ==
                    payload["bootstrap_capability_reference_digest_candidate"] as? String &&
                value["epoch_reference_digest_candidate"] as? String ==
                    payload["proposed_epoch_reference_digest_candidate"] as? String &&
                value["monotonic_floor_timestamp_candidate"] as? String ==
                    payload["proposed_initial_monotonic_floor_timestamp_candidate"] as? String &&
                value["boot_session_reference_digest_candidate"] as? String ==
                    payload["boot_session_reference_digest_candidate"] as? String
        }
        if eventKind == "RUNTIME_QUARANTINE_ENTERED_CANDIDATE" {
            return value["quarantine_candidate_state"] as? String ==
                "QUARANTINE_REQUIRED_CANDIDATE" &&
                value["publication_outcome_candidate"] as? String == "OUTCOME_UNKNOWN_CANDIDATE"
        }
        return true
    }

    private static func projectionInvariant(_ value: [String: Any]) -> String? {
        var invariant = value
        invariant.removeValue(forKey: "quarantine_candidate_state")
        invariant.removeValue(forKey: "publication_outcome_candidate")
        return try? FarmOSCanonicalDigest.canonicalJSON(invariant)
    }

    private static func qualificationBindings(marker: String) -> [String: Any] {
        [
            "manifest_authority": "farmos.day150-c2b-bootstrap-manifest.v1",
            "manifest_digest":
                "sha256:a332368cbdca6461e11f538085a8bea3bfbd63f20cc0066302412d309e9e11be",
            "r2_record_authority": "farmos.day150-c2b-bootstrap-ledger-record.v1",
            "r2_genesis_source_candidate_digest":
                "sha256:98e57a4f41639b64e1b992e3e6ccf56c3f0b625916ded4d2b2c4fc56760376f4",
            "r3_actor_source_authority": "farmos.day150-c2b-bootstrap-actor-intent-source.v1",
            "r3_actor_source_candidate_digest": "sha256:" + String(repeating: "a", count: 64),
            "r3_clock_source_authority": "farmos.day150-c2b-bootstrap-clock-intent-source.v1",
            "r3_clock_source_candidate_digest": "sha256:" + String(repeating: "b", count: 64),
            "installation_profile_digest_candidate": "sha256:" + String(repeating: "c", count: 64),
            "native_profile_digest_candidate": "sha256:" + String(repeating: "d", count: 64),
            "companion_artifact_reference_digest_candidate":
                "sha256:" + String(repeating: "f", count: 64),
        ]
    }

    private static func qualificationGenesis(
        bindings: [String: Any]
    ) -> (event: [String: Any], projection: [String: Any]) {
        let d: (Character) -> String = { "sha256:" + String(repeating: String($0), count: 64) }
        let target = FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-c2b-bootstrap-runtime-provenance-record.v1:source-bindings",
            canonicalValue: try! FarmOSCanonicalDigest.canonicalJSON(bindings)
        )
        let proposal: [String: Any] = [
            "schema_version": "farmos.day150-c2b-bootstrap-runtime-genesis-proposal.v1",
            "purpose": "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION",
            "target_binding_digest": target, "actor_reference_digest_candidate": d("4"),
            "challenge_reference_digest_candidate": d("6"),
            "native_ceremony_session_reference_digest_candidate": d("5"),
            "os_utc_observation_reference_digest_candidate": d("8"),
            "human_time_plausibility_confirmation_reference_digest": d("9"),
            "actor_policy_revision": 1, "clock_policy_revision": 1,
            "publication_policy_revision": 1,
            "companion_artifact_reference_digest_candidate": d("f"),
        ]
        let proposalReference = FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-c2b-bootstrap-runtime-genesis-proposal.v1:body",
            canonicalValue: try! FarmOSCanonicalDigest.canonicalJSON(proposal)
        )
        let decision: [String: Any] = [
            "schema_version": "farmos.day150-c2b-bootstrap-runtime-genesis-approval-decision.v1",
            "decision": "APPROVE", "proposal_reference_digest": proposalReference,
            "actor_reference_digest_candidate": d("4"),
            "challenge_reference_digest_candidate": d("6"),
            "authentication_mechanism_revision": 1,
        ]
        let decisionReference = FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-c2b-bootstrap-runtime-genesis-approval-decision.v1:body",
            canonicalValue: try! FarmOSCanonicalDigest.canonicalJSON(decision)
        )
        let receipt: [String: Any] = [
            "schema_version": "farmos.day150-c2b-bootstrap-runtime-genesis-approval-receipt.v1",
            "proposal_reference_digest": proposalReference,
            "approval_decision_reference_digest": decisionReference,
            "actor_reference_digest_candidate": d("4"),
            "challenge_reference_digest_candidate": d("6"),
            "challenge_terminal_state": "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
            "capability_reference_digest_candidate": d("7"),
            "capability_terminal_state": "CONSUMED_CANDIDATE",
        ]
        let receiptReference = FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-c2b-bootstrap-runtime-genesis-approval-receipt.v1:body",
            canonicalValue: try! FarmOSCanonicalDigest.canonicalJSON(receipt)
        )
        let payload: [String: Any] = [
            "proposal_reference_digest": proposalReference, "proposal_body_candidate": proposal,
            "proposal_target_binding_digest": target,
            "human_approval_decision_reference_digest": decisionReference,
            "human_approval_decision_body_candidate": decision,
            "approval_decision_proposal_reference_digest": proposalReference,
            "approval_decision_actor_reference_digest_candidate": d("4"),
            "approval_decision_challenge_reference_digest_candidate": d("6"),
            "approval_receipt_reference_digest": receiptReference,
            "approval_receipt_body_candidate": receipt,
            "approval_receipt_proposal_reference_digest": proposalReference,
            "approval_receipt_decision_reference_digest": decisionReference,
            "approval_receipt_actor_reference_digest_candidate": d("4"),
            "approval_receipt_challenge_reference_digest_candidate": d("6"),
            "approval_receipt_capability_reference_digest_candidate": d("7"),
            "actor_reference_digest_candidate": d("4"),
            "native_ceremony_session_reference_digest_candidate": d("5"),
            "initial_challenge_reference_digest_candidate": d("6"),
            "initial_challenge_terminal_state": "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
            "bootstrap_capability_reference_digest_candidate": d("7"),
            "bootstrap_capability_terminal_state": "CONSUMED_CANDIDATE",
            "os_utc_observation_reference_digest_candidate": d("8"),
            "continuous_time_bracket_reference_digest_candidate": d("a"),
            "boot_session_reference_digest_candidate": d("b"),
            "human_time_plausibility_confirmation_reference_digest": d("9"),
            "proposed_epoch_reference_digest_candidate": d("e"),
            "proposed_genesis_timestamp_candidate": "2026-08-12T00:00:00.000Z",
            "proposed_initial_monotonic_floor_timestamp_candidate": "2026-08-12T00:00:00.000Z",
            "actor_policy_revision": 1, "clock_policy_revision": 1,
            "publication_policy_revision": 1,
        ]
        return ([
            "schema_version": DisposableStoragePolicy.eventAuthority,
            "event_kind": "INTEGRATED_RUNTIME_GENESIS_CANDIDATE", "payload": payload,
        ], qualificationProjection(
            quarantine: "NOT_QUARANTINED_CANDIDATE", publication: "KNOWN_SOURCE_CANDIDATE"
        ))
    }

    private static func qualificationProjection(
        quarantine: String, publication: String
    ) -> [String: Any] {
        let d: (Character) -> String = { "sha256:" + String(repeating: String($0), count: 64) }
        return [
            "schema_version": DisposableStoragePolicy.projectionAuthority,
            "discriminator": "SOURCE_PROJECTION_ONLY",
            "bootstrap_candidate_state": "INITIALIZED_CANDIDATE",
            "actor_candidate_state": "ESTABLISHMENT_CANDIDATE_PRESENT",
            "actor_reference_digest_candidate": d("4"),
            "challenge_candidate_state": "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
            "challenge_reference_digest_candidate": d("6"),
            "challenge_native_session_reference_digest_candidate": d("5"),
            "challenge_expires_at_candidate": NSNull(),
            "challenge_freshness_basis": "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
            "capability_candidate_state": "CONSUMED_CANDIDATE",
            "capability_reference_digest_candidate": d("7"),
            "capability_generation_candidate": 0,
            "capability_expires_at_candidate": NSNull(),
            "capability_freshness_basis": "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
            "capability_lineage_head_reference_digest_candidate": d("7"),
            "clock_candidate_state": "ESTABLISHMENT_CANDIDATE_PRESENT",
            "epoch_reference_digest_candidate": d("e"),
            "monotonic_floor_timestamp_candidate": "2026-08-12T00:00:00.000Z",
            "boot_session_reference_digest_candidate": d("b"),
            "quarantine_candidate_state": quarantine,
            "publication_outcome_candidate": publication,
        ]
    }
}

public enum DisposablePublicationResult: String, Sendable {
    case committed = "QUALIFICATION_COMMITTED"
    case casConflict = "QUALIFICATION_CAS_CONFLICT"
    case alreadyPresent = "QUALIFICATION_ALREADY_PRESENT_AFTER_TRUSTED_READBACK"
    case rejected = "QUALIFICATION_REJECTED"
    case quarantined = "QUALIFICATION_QUARANTINED"
    case outcomeUnknown = "QUALIFICATION_OUTCOME_UNKNOWN"
}

public enum DisposableFaultPoint: String, CaseIterable, Sendable {
    case beforeTempCreation
    case afterTempCreation
    case afterWriteBeforeFileDurability
    case afterFileDurabilityBeforePublication
    case afterPublicationBeforeDirectoryDurability
    case afterDirectoryDurabilityBeforeReadback
    case afterReadbackBeforeAcknowledgement
    case callerLossAfterPublication
}

public enum DirectoryDurabilityProbeStatus: String, Sendable {
    case success = "SUCCESS"
    case unsupported = "UNSUPPORTED"
    case invalidDescriptor = "INVALID_DESCRIPTOR"
    case ioFailure = "IO_FAILURE"
    case otherFailure = "OTHER_FAILURE"
}

public struct DirectoryDurabilityProbeEvidence: Sendable {
    public let filesystemType: String
    public let fsyncStatus: DirectoryDurabilityProbeStatus
    public let fullFsyncStatus: DirectoryDurabilityProbeStatus
    public let selectedPrimitive: String?
}

public enum DirectoryDurabilityProbe {
    public static func run(directoryFD: Int32) -> DirectoryDurabilityProbeEvidence {
        var info = statfs()
        let filesystem = fstatfs(directoryFD, &info) == 0
            ? withUnsafePointer(to: &info.f_fstypename) {
                $0.withMemoryRebound(to: CChar.self, capacity: Int(MFSNAMELEN)) {
                    String(cString: $0)
                }
            }
            : "UNKNOWN"
        errno = 0
        let fsyncStatus = classify(result: fsync(directoryFD), error: errno)
        errno = 0
        let fullStatus = classify(result: fcntl(directoryFD, F_FULLFSYNC), error: errno)
        return DirectoryDurabilityProbeEvidence(
            filesystemType: filesystem,
            fsyncStatus: fsyncStatus,
            fullFsyncStatus: fullStatus,
            selectedPrimitive: fullStatus == .success ? "F_FULLFSYNC_DIRECTORY" : nil
        )
    }

    private static func classify(result: Int32, error: Int32) -> DirectoryDurabilityProbeStatus {
        if result == 0 { return .success }
        switch error {
        case ENOTSUP, EOPNOTSUPP: return .unsupported
        case EBADF, EINVAL: return .invalidDescriptor
        case EIO: return .ioFailure
        default: return .otherFailure
        }
    }
}

public struct DisposableChainHead: Equatable, Sendable {
    public let generation: UInt64?
    public let digest: String?
    public let records: UInt64
    public let sourceBindingsCanonical: String?
    public let projectionInvariantCanonical: String?
    public let terminal: Bool

    public init(
        generation: UInt64?, digest: String?, records: UInt64,
        sourceBindingsCanonical: String? = nil,
        projectionInvariantCanonical: String? = nil,
        terminal: Bool = false
    ) {
        self.generation = generation
        self.digest = digest
        self.records = records
        self.sourceBindingsCanonical = sourceBindingsCanonical
        self.projectionInvariantCanonical = projectionInvariantCanonical
        self.terminal = terminal
    }
}

public final class DisposableAPFSLedger: @unchecked Sendable {
    private let rootFD: Int32
    private let expectedUID: uid_t
    private let expectedGID: gid_t
    private let rootDevice: UInt64
    private var explicitlyReconciledAttempts: [UInt64: String] = [:]

    public init(openQualificationRunDirectoryAt parentFD: Int32, name: String) throws {
        guard Self.isRunName(name) else { throw DarwinStorageValidationFailure.invalidRoot }
        let fd = openat(parentFD, name, DarwinStoragePolicy.directoryOpenFlags)
        guard fd >= 0 else { throw DarwinStorageValidationFailure.invalidRoot }
        rootFD = fd
        expectedUID = getuid()
        expectedGID = getgid()
        var metadata = stat()
        guard fstat(fd, &metadata) == 0 else {
            close(fd); throw DarwinStorageValidationFailure.invalidRoot
        }
        rootDevice = UInt64(metadata.st_dev)
        let object = Self.object(from: metadata)
        guard DarwinStorageSource.validate(
            object: object, expectedKind: .directory, expectedUID: expectedUID,
            expectedGID: expectedGID, expectedMode: DarwinStoragePolicy.rootMode,
            expectedDevice: rootDevice
        ) == nil, try Self.filesystemType(fd: fd) == DisposableStoragePolicy.expectedFilesystem
        else {
            close(fd); throw DarwinStorageValidationFailure.nonLocalAPFS
        }
    }

    deinit { close(rootFD) }

    public func explicitlyReclassifyAfterTrustedReadback(
        exact record: DisposableRuntimeRecord
    ) throws -> DisposablePublicationResult {
        guard (try? readPendingDigest(generation: record.generation)) == record.recordDigest else {
            return .outcomeUnknown
        }
        var allowed = explicitlyReconciledAttempts
        allowed[record.generation] = record.recordDigest
        guard let head = try? replayRecords(allowedPendingAttempts: allowed) else {
            return .outcomeUnknown
        }
        if head.generation == record.generation, head.digest == record.recordDigest {
            explicitlyReconciledAttempts[record.generation] = record.recordDigest
            return .alreadyPresent
        }
        return .outcomeUnknown
    }

    public func replay() throws -> DisposableChainHead {
        try replayRecords(allowedPendingAttempts: explicitlyReconciledAttempts)
    }

    public func trustedQualificationReadback() throws -> DisposableChainHead {
        try replayRecords(allowedPendingAttempts: [:], allowAllPendingForReadback: true)
    }

    public func explicitlyReconcileQualificationHead(
        expectedGeneration: UInt64, expectedDigest: String
    ) -> Bool {
        guard let head = try? trustedQualificationReadback(),
              head.generation == expectedGeneration, head.digest == expectedDigest else {
            return false
        }
        var generation: UInt64 = 0
        while generation <= expectedGeneration {
            guard let record = try? readRecord(name: Self.recordName(generation)),
                  (try? readPendingDigest(generation: generation)) == record.recordDigest else {
                return false
            }
            explicitlyReconciledAttempts[generation] = record.recordDigest
            generation += 1
        }
        return true
    }

    public func trustedQualificationRecord(generation: UInt64) -> DisposableRuntimeRecord? {
        guard let head = try? trustedQualificationReadback(),
              generation < head.records else { return nil }
        return try? readRecord(name: Self.recordName(generation))
    }

    private func replayRecords(
        allowedPendingAttempts: [UInt64: String],
        allowAllPendingForReadback: Bool = false
    ) throws -> DisposableChainHead {
        let entries = try entryNames()
        if entries.contains(where: { Self.isTempName($0) }) {
            throw DarwinStorageValidationFailure.outcomeUnknown
        }
        let pendingEntries = entries.filter(Self.isPendingAttemptName)
        let recordEntries = entries.filter(Self.isRecordName)
        guard entries.allSatisfy({ Self.isRecordName($0) || Self.isPendingAttemptName($0) }) else {
            throw DarwinStorageValidationFailure.unexpectedEntry
        }
        var previous: DisposableRuntimeRecord?
        var sourceBindingsCanonical: String?
        var projectionInvariantCanonical: String?
        var terminal = false
        var issuedChallenges = Set<String>()
        var issuedCapabilities = Set<String>()
        var usedRecoverySessions = Set<String>()
        var expectedGeneration: UInt64 = 0
        while expectedGeneration < UInt64(recordEntries.count) {
            let name = Self.recordName(expectedGeneration)
            guard recordEntries.contains(name) else {
                throw DarwinStorageValidationFailure.corruptChain
            }
            let current = try readRecord(name: name)
            guard current.generation == expectedGeneration,
                  current.previousGeneration == previous?.generation,
                  current.previousRecordDigest == previous?.recordDigest,
                  sourceBindingsCanonical == nil ||
                    current.sourceBindingsCanonical == sourceBindingsCanonical,
                  !terminal,
                  previous == nil || DisposableRecordValidator.transitionIsValid(
                    previous: previous!, current: current
                  ),
                  current.issuedChallengeReference == nil ||
                    !issuedChallenges.contains(current.issuedChallengeReference!),
                  current.issuedCapabilityReference == nil ||
                    !issuedCapabilities.contains(current.issuedCapabilityReference!),
                  current.usedRecoverySessionReference == nil ||
                    !usedRecoverySessions.contains(current.usedRecoverySessionReference!)
            else { throw DarwinStorageValidationFailure.corruptChain }
            sourceBindingsCanonical = current.sourceBindingsCanonical
            projectionInvariantCanonical = current.projectionInvariantCanonical
            terminal = current.eventKind == "RUNTIME_QUARANTINE_ENTERED_CANDIDATE"
            if let challenge = current.issuedChallengeReference { issuedChallenges.insert(challenge) }
            if let capability = current.issuedCapabilityReference { issuedCapabilities.insert(capability) }
            if let recovery = current.usedRecoverySessionReference { usedRecoverySessions.insert(recovery) }
            previous = current
            expectedGeneration += 1
        }
        guard pendingEntries.count == recordEntries.count else {
            throw DarwinStorageValidationFailure.outcomeUnknown
        }
        for pendingName in pendingEntries {
            guard let generation = Self.pendingAttemptGeneration(pendingName),
                  let record = generation < UInt64(recordEntries.count)
                    ? try? readRecord(name: Self.recordName(generation)) : nil,
                  try readPendingDigest(generation: generation) == record.recordDigest,
                  allowAllPendingForReadback ||
                    allowedPendingAttempts[generation] == record.recordDigest
            else { throw DarwinStorageValidationFailure.outcomeUnknown }
        }
        var coveredGeneration: UInt64 = 0
        while coveredGeneration < UInt64(recordEntries.count) {
            guard pendingEntries.contains(Self.pendingAttemptName(coveredGeneration)) else {
                throw DarwinStorageValidationFailure.outcomeUnknown
            }
            coveredGeneration += 1
        }
        return DisposableChainHead(
            generation: previous?.generation,
            digest: previous?.recordDigest,
            records: UInt64(recordEntries.count),
            sourceBindingsCanonical: sourceBindingsCanonical,
            projectionInvariantCanonical: projectionInvariantCanonical,
            terminal: terminal
        )
    }

    public func publish(
        bytes: Data,
        expectedGeneration: UInt64?,
        expectedHeadDigest: String?,
        fault: ((DisposableFaultPoint) -> Void)? = nil,
        simulateTempOpenFailure: Bool = false,
        simulateCleanupFailure: Bool = false,
        simulatePostUnlinkDirectorySyncFailure: Bool = false,
        simulateRenameFailure: Bool = false
    ) -> DisposablePublicationResult {
        guard let candidate = DisposableRecordValidator.parse(bytes) else { return .rejected }
        guard flock(rootFD, LOCK_EX) == 0 else { return .rejected }
        defer { flock(rootFD, LOCK_UN) }
        let head: DisposableChainHead
        do { head = try replay() }
        catch DarwinStorageValidationFailure.outcomeUnknown {
            guard let observed = try? replayRecords(
                allowedPendingAttempts: [:], allowAllPendingForReadback: true
            ) else { return .outcomeUnknown }
            if observed.generation == candidate.generation,
               observed.digest == candidate.recordDigest { return .alreadyPresent }
            if observed.generation == expectedGeneration,
               observed.digest == expectedHeadDigest { return .outcomeUnknown }
            return .casConflict
        }
        catch { return .quarantined }
        guard head.generation == expectedGeneration, head.digest == expectedHeadDigest else {
            return head.generation == candidate.generation && head.digest == candidate.recordDigest
                ? .alreadyPresent : .casConflict
        }
        let expectedNext = (head.generation ?? UInt64.max) &+ 1
        let predecessor = head.generation.flatMap {
            try? readRecord(name: Self.recordName($0))
        }
        guard candidate.generation == expectedNext,
              candidate.previousGeneration == head.generation,
              candidate.previousRecordDigest == head.digest,
              (head.sourceBindingsCanonical == nil ||
                candidate.sourceBindingsCanonical == head.sourceBindingsCanonical),
              !head.terminal,
              (head.records == 0 || candidate.eventKind != "INTEGRATED_RUNTIME_GENESIS_CANDIDATE"),
              predecessor == nil || DisposableRecordValidator.transitionIsValid(
                previous: predecessor!, current: candidate
              ),
              !issuedReferenceAlreadyExists(candidate, records: head.records)
        else { return .rejected }

        let pendingName = Self.pendingAttemptName(candidate.generation)
        let pendingFD = openat(
            rootFD, pendingName, DarwinStoragePolicy.temporaryCreateFlags,
            mode_t(DarwinStoragePolicy.recordMode)
        )
        guard pendingFD >= 0 else { return errno == EEXIST ? .outcomeUnknown : .rejected }
        let pendingBytes = Data(candidate.recordDigest.utf8)
        let pendingValid = validateOpenRecord(fd: pendingFD) &&
            Self.writeAll(fd: pendingFD, data: pendingBytes) &&
            fcntl(pendingFD, F_FULLFSYNC) == 0
        let pendingClosed = close(pendingFD) == 0
        guard pendingValid, pendingClosed, fcntl(rootFD, F_FULLFSYNC) == 0 else {
            return .outcomeUnknown
        }

        fault?(.beforeTempCreation)
        let tempName = Self.tempName(candidate.generation, pid: getpid())
        let finalName = Self.recordName(candidate.generation)
        let tempFD: Int32
        if simulateTempOpenFailure {
            errno = EIO
            tempFD = -1
        } else {
            tempFD = openat(
                rootFD, tempName, DarwinStoragePolicy.temporaryCreateFlags,
                mode_t(DarwinStoragePolicy.recordMode)
            )
        }
        guard tempFD >= 0 else {
            return .outcomeUnknown
        }
        defer {
            close(tempFD)
        }
        fault?(.afterTempCreation)
        guard validateOpenRecord(fd: tempFD) else {
            return .outcomeUnknown
        }
        guard Self.writeAll(fd: tempFD, data: candidate.canonicalBytes) else {
            return .outcomeUnknown
        }
        fault?(.afterWriteBeforeFileDurability)
        guard fcntl(tempFD, F_FULLFSYNC) == 0 else {
            return .outcomeUnknown
        }
        fault?(.afterFileDurabilityBeforePublication)
        let renameResult: Int32
        if simulateRenameFailure { errno = EIO; renameResult = -1 }
        else {
            renameResult = renameatx_np(
                rootFD, tempName, rootFD, finalName, UInt32(RENAME_EXCL)
            )
        }
        guard renameResult == 0 else {
            return .outcomeUnknown
        }
        fault?(.afterPublicationBeforeDirectoryDurability)
        guard fcntl(rootFD, F_FULLFSYNC) == 0 else {
            return .outcomeUnknown
        }
        fault?(.afterDirectoryDurabilityBeforeReadback)
        var finalReadbackAllowlist = explicitlyReconciledAttempts
        finalReadbackAllowlist[candidate.generation] = candidate.recordDigest
        guard let readback = try? readRecord(name: finalName), readback == candidate,
              let finalHead = try? replayRecords(
                allowedPendingAttempts: finalReadbackAllowlist
              ),
              finalHead.generation == candidate.generation,
              finalHead.digest == candidate.recordDigest
        else { return .outcomeUnknown }
        fault?(.afterReadbackBeforeAcknowledgement)
        fault?(.callerLossAfterPublication)
        guard !simulateCleanupFailure && !simulatePostUnlinkDirectorySyncFailure else {
            return .outcomeUnknown
        }
        explicitlyReconciledAttempts[candidate.generation] = candidate.recordDigest
        return .committed
    }

    private func issuedReferenceAlreadyExists(
        _ candidate: DisposableRuntimeRecord,
        records: UInt64
    ) -> Bool {
        guard candidate.issuedChallengeReference != nil || candidate.issuedCapabilityReference != nil
        else { return false }
        var generation: UInt64 = 0
        while generation < records {
            guard let prior = try? readRecord(name: Self.recordName(generation)) else { return true }
            if prior.issuedChallengeReference == candidate.issuedChallengeReference &&
                candidate.issuedChallengeReference != nil { return true }
            if prior.issuedCapabilityReference == candidate.issuedCapabilityReference &&
                candidate.issuedCapabilityReference != nil { return true }
            generation += 1
        }
        return false
    }

    private func readRecord(name: String) throws -> DisposableRuntimeRecord {
        let fd = openat(rootFD, name, O_RDONLY | O_NOFOLLOW | O_CLOEXEC)
        guard fd >= 0 else { throw DarwinStorageValidationFailure.malformedRecord }
        defer { close(fd) }
        guard validateOpenRecord(fd: fd) else {
            throw DarwinStorageValidationFailure.malformedRecord
        }
        var bytes = Data()
        var buffer = [UInt8](repeating: 0, count: 16_384)
        while true {
            let count = read(fd, &buffer, buffer.count)
            if count == 0 { break }
            guard count > 0, bytes.count + count <= DisposableStoragePolicy.maximumRecordBytes else {
                throw DarwinStorageValidationFailure.malformedRecord
            }
            bytes.append(contentsOf: buffer.prefix(count))
        }
        guard let record = DisposableRecordValidator.parse(bytes) else {
            throw DarwinStorageValidationFailure.malformedRecord
        }
        return record
    }

    private func readPendingDigest(generation: UInt64) throws -> String {
        let fd = openat(
            rootFD, Self.pendingAttemptName(generation), O_RDONLY | O_NOFOLLOW | O_CLOEXEC
        )
        guard fd >= 0 else { throw DarwinStorageValidationFailure.outcomeUnknown }
        defer { close(fd) }
        guard validateOpenRecord(fd: fd) else { throw DarwinStorageValidationFailure.outcomeUnknown }
        var bytes = Data()
        var buffer = [UInt8](repeating: 0, count: 128)
        while true {
            let count = read(fd, &buffer, buffer.count)
            if count == 0 { break }
            guard count > 0, bytes.count + count <= 71 else {
                throw DarwinStorageValidationFailure.outcomeUnknown
            }
            bytes.append(contentsOf: buffer.prefix(count))
        }
        guard let value = String(data: bytes, encoding: .utf8),
              FarmOSCanonicalDigest.isDigest(value) else {
            throw DarwinStorageValidationFailure.outcomeUnknown
        }
        return value
    }

    private func validateOpenRecord(fd: Int32) -> Bool {
        var metadata = stat()
        guard fstat(fd, &metadata) == 0 else { return false }
        return DarwinStorageSource.validate(
            object: Self.object(from: metadata), expectedKind: .regularFile,
            expectedUID: expectedUID, expectedGID: expectedGID,
            expectedMode: DarwinStoragePolicy.recordMode, expectedDevice: rootDevice
        ) == nil
    }

    private func entryNames() throws -> Set<String> {
        let duplicate = dup(rootFD)
        guard duplicate >= 0, let directory = fdopendir(duplicate) else {
            if duplicate >= 0 { close(duplicate) }
            throw DarwinStorageValidationFailure.invalidRoot
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

    private static func object(from value: stat) -> DarwinStorageObjectCandidate {
        let kind: DarwinStorageObjectCandidate.Kind
        switch value.st_mode & S_IFMT {
        case S_IFDIR: kind = .directory
        case S_IFREG: kind = .regularFile
        case S_IFLNK: kind = .symbolicLink
        default: kind = .other
        }
        return .init(
            kind: kind, ownerUID: value.st_uid, ownerGID: value.st_gid,
            mode: UInt16(value.st_mode & 0o7777), device: UInt64(value.st_dev),
            linkCount: UInt64(value.st_nlink)
        )
    }

    private static func filesystemType(fd: Int32) throws -> String {
        var info = statfs()
        guard fstatfs(fd, &info) == 0 else { throw DarwinStorageValidationFailure.nonLocalAPFS }
        let type = withUnsafePointer(to: &info.f_fstypename) {
            $0.withMemoryRebound(to: CChar.self, capacity: Int(MFSNAMELEN)) { String(cString: $0) }
        }
        guard (info.f_flags & UInt32(MNT_LOCAL)) != 0 else {
            throw DarwinStorageValidationFailure.nonLocalAPFS
        }
        return type
    }

    public static func recordName(_ generation: UInt64) -> String {
        String(format: "record-%020llu.json", generation)
    }
    public static func pendingAttemptName(_ generation: UInt64) -> String {
        String(format: "mutation-pending-%020llu.json", generation)
    }
    private static func tempName(_ generation: UInt64, pid: pid_t) -> String {
        String(format: "temp-%020llu-%d.tmp", generation, pid)
    }
    private static func isRunName(_ value: String) -> Bool {
        value.range(of: #"^run-[a-f0-9]{16}$"#, options: .regularExpression) != nil
    }
    private static func isRecordName(_ value: String) -> Bool {
        value.range(of: #"^record-[0-9]{20}\.json$"#, options: .regularExpression) != nil
    }
    private static func isPendingAttemptName(_ value: String) -> Bool {
        value.range(of: #"^mutation-pending-[0-9]{20}\.json$"#,
                    options: .regularExpression) != nil
    }
    private static func pendingAttemptGeneration(_ value: String) -> UInt64? {
        guard isPendingAttemptName(value) else { return nil }
        return UInt64(value.dropFirst("mutation-pending-".count).dropLast(".json".count))
    }
    private static func isTempName(_ value: String) -> Bool {
        value.range(of: #"^temp-[0-9]{20}-[0-9]+\.tmp(\.collision)?$"#,
                    options: .regularExpression) != nil
    }
    private static func writeAll(fd: Int32, data: Data) -> Bool {
        data.withUnsafeBytes { raw in
            guard let base = raw.baseAddress else { return false }
            var offset = 0
            while offset < raw.count {
                let count = Darwin.write(fd, base.advanced(by: offset), raw.count - offset)
                if count <= 0 { return false }
                offset += count
            }
            return true
        }
    }
}
