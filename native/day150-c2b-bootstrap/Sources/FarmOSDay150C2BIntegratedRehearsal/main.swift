import Darwin
import FarmOSDay150C2BNativeCore
import Foundation

private let installationProfile = IntegratedRehearsalRecordFactory.digest(
    domain: "farmos.day150-c2b-installation-profile.v1",
    value: [
        "purpose": IntegratedRehearsalRecordFactory.purpose,
        "installation": "REPOSITORY_LOCAL_QUALIFICATION_ONLY",
        "native_install": false,
        "canonical_root": false,
    ]
)
private let nativeProfile = IntegratedRehearsalRecordFactory.digest(
    domain: "farmos.day150-c2b-native-profile.v1",
    value: [
        "protocol": FarmOSDay150C2BNativeAuthority.protocolID,
        "record": DisposableStoragePolicy.recordAuthority,
        "storage": "DISPOSABLE_LOCAL_APFS_FENCED_V1",
        "authentication": NativeIntegratedAuthentication.mechanismRevision,
    ]
)

private enum RehearsalFailure: String {
    case invalidArguments = "INVALID_ARGUMENTS"
    case preflight = "AUTHENTICATION_PREFLIGHT_BLOCKED"
    case authentication = "FRESH_AUTHENTICATION_NOT_ACCEPTED"
    case approval = "EXPLICIT_APPROVE_NOT_RECEIVED"
    case entropy = "OS_CSPRNG_FAILURE"
    case clock = "TRUSTED_OS_CLOCK_OBSERVATION_FAILURE"
    case record = "INTEGRATED_RECORD_VALIDATION_FAILURE"
    case storage = "DISPOSABLE_STORAGE_FAILURE"
    case publication = "DISPOSABLE_PUBLICATION_FAILURE"
    case replay = "FRESH_PROCESS_REPLAY_FAILURE"
    case matrix = "INTEGRATED_NEGATIVE_MATRIX_FAILURE"
    case outcomeUnknown = "OUTCOME_UNKNOWN"
}

private func fail(_ reason: RehearsalFailure) -> Never {
    print("classification=BLOCKED_DAY150_C2B_INTEGRATED_REHEARSAL")
    print("sanitized_reason=\(reason.rawValue)")
    exit(EXIT_FAILURE)
}

private func digest(_ character: Character) -> String {
    "sha256:" + String(repeating: String(character), count: 64)
}

private func projection(_ record: DisposableRuntimeRecord) -> [String: Any]? {
    (try? JSONSerialization.jsonObject(with: Data(record.projectionCanonical.utf8))) as? [String: Any]
}

private func sourceBindings(_ record: DisposableRuntimeRecord) -> [String: Any]? {
    (try? JSONSerialization.jsonObject(with: Data(record.sourceBindingsCanonical.utf8)))
        as? [String: Any]
}

private func eventPayload(_ record: DisposableRuntimeRecord) -> [String: Any]? {
    (try? JSONSerialization.jsonObject(with: Data(record.eventPayloadCanonical.utf8)))
        as? [String: Any]
}

private func secondsUntil(_ timestamp: String) -> TimeInterval? {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    guard let deadline = formatter.date(from: timestamp) else { return nil }
    return max(0, deadline.timeIntervalSinceNow)
}

private func addSeconds(_ value: String, _ seconds: TimeInterval) -> String? {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    guard let date = formatter.date(from: value) else { return nil }
    return formatter.string(from: date.addingTimeInterval(seconds))
}

private func injectedObservation(
    _ timestamp: String, lower: UInt64, upper: UInt64, boot: String
) -> NativeTrustedClockObservation {
    NativeTrustedClockObservation(
        osUTC: timestamp, continuousLowerNanoseconds: lower,
        continuousUpperNanoseconds: upper,
        continuousBracketReferenceDigest: IntegratedRehearsalRecordFactory.digest(
            domain: "farmos.day150-c2b-ttl-matrix-bracket.v1",
            value: ["timestamp": timestamp, "lower": lower, "upper": upper, "boot": boot]
        ),
        bootSessionReferenceDigest: boot,
        observationReferenceDigest: IntegratedRehearsalRecordFactory.digest(
            domain: "farmos.day150-c2b-ttl-matrix-observation.v1",
            value: ["timestamp": timestamp, "lower": lower, "upper": upper, "boot": boot]
        )
    )
}

private func copyCapabilityContext(
    _ value: PostGen0NormalCapabilityAuthorityContext,
    epoch: String? = nil, boot: String? = nil, floor: String? = nil,
    headGeneration: UInt64? = nil, headDigest: String? = nil,
    headEventKind: String? = nil,
    actor: String? = nil, challenge: String? = nil, session: String? = nil,
    challengeState: String? = nil, capabilityState: String? = nil,
    capabilityGeneration: UInt64? = nil, capabilityLineage: String? = nil,
    purpose: String? = nil, scope: String? = nil, quarantine: String? = nil,
    publication: String? = nil
) -> PostGen0NormalCapabilityAuthorityContext {
    .init(
        activeEpochReferenceDigest: epoch ?? value.activeEpochReferenceDigest,
        bootSessionReferenceDigest: boot ?? value.bootSessionReferenceDigest,
        durableFloor: floor ?? value.durableFloor,
        currentHeadGeneration: headGeneration ?? value.currentHeadGeneration,
        currentHeadDigest: headDigest ?? value.currentHeadDigest,
        currentHeadEventKind: headEventKind ?? value.currentHeadEventKind,
        actorReferenceDigest: actor ?? value.actorReferenceDigest,
        challengeReferenceDigest: challenge ?? value.challengeReferenceDigest,
        ceremonySessionReferenceDigest: session ?? value.ceremonySessionReferenceDigest,
        challengeState: challengeState ?? value.challengeState,
        capabilityState: capabilityState ?? value.capabilityState,
        capabilityGeneration: capabilityGeneration ?? value.capabilityGeneration,
        capabilityLineageReferenceDigest: capabilityLineage ??
            value.capabilityLineageReferenceDigest,
        purpose: purpose ?? value.purpose, scope: scope ?? value.scope,
        quarantineState: quarantine ?? value.quarantineState,
        publicationOutcome: publication ?? value.publicationOutcome
    )
}

private func runCapabilityTTLMatrix() -> Bool {
    var cases = 0
    func check(_ name: String, _ condition: @autoclosure () -> Bool) -> Bool {
        cases += 1
        let accepted = condition()
        if !accepted { print("ttl_matrix_failure_case=\(cases) name=\(name)") }
        return accepted
    }
    let actor = digest("4"), challenge = digest("5"), session = digest("6")
    let epoch = digest("7"), boot = digest("8"), priorLineage = digest("9")
    let capability = digest("a"), predecessor = digest("b"), issuanceRecord = digest("c")
    let issuedAt = "2026-08-13T00:00:10.000Z"
    let issuance = injectedObservation(issuedAt, lower: 101, upper: 102, boot: boot)
    let preIssue = PostGen0NormalCapabilityAuthorityContext(
        activeEpochReferenceDigest: epoch, bootSessionReferenceDigest: boot,
        durableFloor: "2026-08-13T00:00:09.000Z", currentHeadGeneration: 8,
        currentHeadDigest: predecessor,
        currentHeadEventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        actorReferenceDigest: actor,
        challengeReferenceDigest: challenge, ceremonySessionReferenceDigest: session,
        challengeState: "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
        capabilityState: "CONSUMED_CANDIDATE", capabilityGeneration: 1,
        capabilityLineageReferenceDigest: priorLineage,
        purpose: PostGen0NormalCapabilityTTLPolicy.purpose,
        scope: PostGen0NormalCapabilityTTLPolicy.scope,
        quarantineState: "NOT_QUARANTINED_CANDIDATE",
        publicationOutcome: "KNOWN_SOURCE_CANDIDATE"
    )
    guard let proposed = PostGen0NormalCapabilityTTLPolicy.issue(
        context: preIssue, authenticatedActorReferenceDigest: actor,
        completedChallengeReferenceDigest: challenge,
        completedCeremonySessionReferenceDigest: session,
        capabilityReferenceDigest: capability, proposedCapabilityGeneration: 2,
        issuance: issuance, priorContinuousUpperNanoseconds: 100
    ), proposed.expiresAt == "2026-08-13T00:02:10.000Z",
       let binding = proposed.bindingDurableIssuanceRecord(
        generation: 9, digest: issuanceRecord)
    else { print("ttl_matrix_failure_stage=issuance"); return false }
    let available = PostGen0NormalCapabilityAuthorityContext(
        activeEpochReferenceDigest: epoch, bootSessionReferenceDigest: boot,
        durableFloor: issuedAt, currentHeadGeneration: 9,
        currentHeadDigest: issuanceRecord,
        currentHeadEventKind: "CAPABILITY_ISSUANCE_CANDIDATE",
        actorReferenceDigest: actor,
        challengeReferenceDigest: challenge, ceremonySessionReferenceDigest: session,
        challengeState: "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
        capabilityState: "AVAILABLE_CANDIDATE", capabilityGeneration: 2,
        capabilityLineageReferenceDigest: capability,
        purpose: PostGen0NormalCapabilityTTLPolicy.purpose,
        scope: PostGen0NormalCapabilityTTLPolicy.scope,
        quarantineState: "NOT_QUARANTINED_CANDIDATE",
        publicationOutcome: "KNOWN_SOURCE_CANDIDATE"
    )
    func consume(
        _ context: PostGen0NormalCapabilityAuthorityContext = available,
        at timestamp: String, actor requestedActor: String = actor,
        challenge requestedChallenge: String = challenge,
        session requestedSession: String = session,
        purpose: String = PostGen0NormalCapabilityTTLPolicy.purpose,
        scope: String = PostGen0NormalCapabilityTTLPolicy.scope,
        operation: String = PostGen0NormalCapabilityTTLPolicy.onlyAuthorizedOperation,
        boot observationBoot: String = boot
    ) -> PostGen0NormalCapabilityDecision {
        PostGen0NormalCapabilityTTLPolicy.consume(
            binding: binding, context: context,
            requestedActorReferenceDigest: requestedActor,
            requestedChallengeReferenceDigest: requestedChallenge,
            requestedCeremonySessionReferenceDigest: requestedSession,
            requestedPurpose: purpose, requestedScope: scope,
            requestedOperation: operation,
            observation: injectedObservation(
                timestamp, lower: 103, upper: 104, boot: observationBoot)
        )
    }
    let expiredContext = copyCapabilityContext(
        available, floor: "2026-08-13T00:02:11.000Z", headGeneration: 10,
        headDigest: digest("d"), headEventKind: "CAPABILITY_TERMINALIZATION_CANDIDATE",
        capabilityState: "EXPIRED_CANDIDATE")
    let renewalFromOldAuthentication = PostGen0NormalCapabilityTTLPolicy.issue(
        context: expiredContext, authenticatedActorReferenceDigest: actor,
        completedChallengeReferenceDigest: challenge,
        completedCeremonySessionReferenceDigest: session,
        capabilityReferenceDigest: digest("e"), proposedCapabilityGeneration: 3,
        issuance: injectedObservation(
            "2026-08-13T00:02:12.000Z", lower: 105, upper: 106, boot: boot),
        priorContinuousUpperNanoseconds: 104)
    guard check("consume_at_0", consume(at: issuedAt) == .accepted),
          check("consume_at_60", consume(at: "2026-08-13T00:01:10.000Z") == .accepted),
          check("consume_before_120", consume(at: "2026-08-13T00:02:09.999Z") == .accepted),
          check("consume_after_120", consume(at: "2026-08-13T00:02:10.001Z") == .expired),
          check("no_sliding_extension", !PostGen0NormalCapabilityTTLPolicy.renewalAllowed() &&
            binding.expiresAt == "2026-08-13T00:02:10.000Z" &&
            consume(at: "2026-08-13T00:02:11.000Z") == .expired &&
            renewalFromOldAuthentication == nil),
          check("second_consumption", consume(copyCapabilityContext(
            available, capabilityState: "CONSUMED_CANDIDATE"), at: issuedAt) == .rejected),
          check("wrong_actor", consume(at: issuedAt, actor: digest("d")) == .rejected),
          check("wrong_challenge_lineage", consume(
            at: issuedAt, challenge: digest("d")) == .rejected),
          check("wrong_session_lineage", consume(at: issuedAt, session: digest("d")) == .rejected),
          check("wrong_purpose", consume(at: issuedAt, purpose: "B2") == .rejected),
          check("scope_expansion", consume(at: issuedAt, scope: "*") == .rejected),
          check("wrong_active_epoch", consume(copyCapabilityContext(
            available, epoch: digest("d")), at: issuedAt) == .rejected),
          check("boot_session_mismatch", consume(copyCapabilityContext(
            available, boot: digest("d")), at: issuedAt, boot: digest("d")) == .rejected),
          check("durable_floor_rollback", consume(copyCapabilityContext(
            available, floor: "2026-08-13T00:00:09.000Z"), at: issuedAt) == .rejected),
          check("current_head_mismatch", consume(copyCapabilityContext(
            available, headDigest: digest("d")), at: issuedAt) == .rejected),
          check("outcome_unknown", consume(copyCapabilityContext(
            available, publication: "OUTCOME_UNKNOWN_CANDIDATE"), at: issuedAt) == .rejected),
          check("fresh_process_expired_reconstruction",
            consume(at: "2026-08-13T00:02:11.000Z") == .expired),
          check("cannot_authorize_b2", !PostGen0NormalCapabilityTTLPolicy.authorizes("B2")),
          check("cannot_authorize_docker", !PostGen0NormalCapabilityTTLPolicy.authorizes("DOCKER")),
          check("cannot_authorize_native_filesystem",
            !PostGen0NormalCapabilityTTLPolicy.authorizes("ARBITRARY_NATIVE_FILESYSTEM")),
          check("one_global_provenance_chain", binding.issuancePredecessorGeneration == 8 &&
            binding.durableIssuanceRecordGeneration == 9 &&
            consume(copyCapabilityContext(
                available, headGeneration: 8, headDigest: predecessor), at: issuedAt) == .rejected)
    else { return false }
    print("post_gen0_normal_capability_ttl_matrix_cases=\(cases)")
    print("DAY150_POST_GEN0_NORMAL_CAPABILITY_TTL_POLICY_V1=PASS")
    print("timing_domains_seconds=ceremony:300,evaluation:180,capability:120,authorization:900,attempt_spawn:30")
    return true
}

private func observation(after prior: NativeTrustedClockObservation) -> NativeTrustedClockObservation? {
    for _ in 0..<2_000 {
        guard let value = NativeTrustedClockObserver.observe(
            installationProfileDigest: installationProfile
        ) else { return nil }
        if value.bootSessionReferenceDigest == prior.bootSessionReferenceDigest,
           NativeTrustedClockPolicy.validatePostGenesisCandidate(
            durableFloor: prior.osUTC,
            priorContinuousUpperNanoseconds: prior.continuousUpperNanoseconds,
            expectedBootSessionReferenceDigest: prior.bootSessionReferenceDigest,
            candidate: value
           ) == .accepted { return value }
        usleep(1_000)
    }
    return nil
}

private func strictlyLaterObservation(
    after prior: NativeTrustedClockObservation
) -> NativeTrustedClockObservation? {
    for _ in 0..<2_000 {
        guard let value = NativeTrustedClockObserver.observe(
            installationProfileDigest: installationProfile
        ) else { return nil }
        if value.osUTC > prior.osUTC,
           NativeTrustedClockPolicy.validatePostGenesisCandidate(
            durableFloor: prior.osUTC,
            priorContinuousUpperNanoseconds: prior.continuousUpperNanoseconds,
            expectedBootSessionReferenceDigest: prior.bootSessionReferenceDigest,
            candidate: value
           ) == .accepted { return value }
        usleep(1_000)
    }
    return nil
}

private func resumedObservation(durableFloor: String, expectedBoot: String)
    -> NativeTrustedClockObservation? {
    for _ in 0..<2_000 {
        guard let value = NativeTrustedClockObserver.observe(
            installationProfileDigest: installationProfile
        ) else { return nil }
        if NativeTrustedClockPolicy.validatePostGenesisCandidate(
            durableFloor: durableFloor, priorContinuousUpperNanoseconds: 0,
            expectedBootSessionReferenceDigest: expectedBoot, candidate: value
        ) == .accepted { return value }
        usleep(1_000)
    }
    return nil
}

private func freshness(
    priorFloor: String,
    observation: NativeTrustedClockObservation,
    epoch: String,
    boot: String
) -> [String: Any] {
    [
        "freshness_basis": "ACTIVE_TRUSTED_CLOCK_CANDIDATE",
        "clock_epoch_reference_digest_candidate": epoch,
        "prior_monotonic_floor_timestamp_candidate": priorFloor,
        "proposed_monotonic_floor_timestamp_candidate": observation.osUTC,
        "os_utc_observation_reference_digest_candidate": observation.observationReferenceDigest,
        "continuous_time_bracket_reference_digest_candidate":
            observation.continuousBracketReferenceDigest,
        "boot_session_reference_digest_candidate": boot,
        "native_recovery_session_reference_digest_candidate": NSNull(),
        "clock_comparison_policy_revision": 1,
    ]
}

private func parse(_ bytes: Data?) -> DisposableRuntimeRecord? {
    guard let bytes else { return nil }
    return DisposableRecordValidator.parse(bytes)
}

private func canonicalBody(_ body: [String: Any], domain: String) -> IntegratedCanonicalBody? {
    guard let canonical = try? FarmOSCanonicalDigest.canonicalJSON(body) else { return nil }
    return IntegratedCanonicalBody(
        body: body, canonical: canonical,
        referenceDigest: FarmOSCanonicalDigest.sha256(domain: domain, canonicalValue: canonical)
    )
}

private func nextRecord(
    previous: DisposableRuntimeRecord,
    eventKind: String,
    payload: [String: Any],
    projection: [String: Any],
    bindings: [String: Any]
) -> DisposableRuntimeRecord? {
    parse(IntegratedRehearsalRecordFactory.record(
        generation: previous.generation + 1, previous: previous, bindings: bindings,
        eventKind: eventKind, payload: payload, projection: projection
    ))
}

private func makeFixtureGenesis() -> DisposableRuntimeRecord? {
    let observation = NativeTrustedClockObservation(
        osUTC: "2026-08-12T00:00:00.000Z",
        continuousLowerNanoseconds: 1,
        continuousUpperNanoseconds: 2,
        continuousBracketReferenceDigest: digest("1"),
        bootSessionReferenceDigest: digest("2"),
        observationReferenceDigest: digest("3")
    )
    let bindings = IntegratedRehearsalRecordFactory.sourceBindings(
        installationProfileDigest: installationProfile, nativeProfileDigest: nativeProfile,
        liveActorProvenanceDigest: digest("a"), liveClockProvenanceDigest: digest("b"),
        companionArtifactDigest: digest("f")
    )
    guard let proposal = IntegratedRehearsalRecordFactory.proposal(
        bindings: bindings, actorReference: digest("4"), ceremonySessionReference: digest("5"),
        challengeReference: digest("6"), observation: observation,
        plausibilityConfirmationReference: digest("8")
    ), let decision = IntegratedRehearsalRecordFactory.approve(
        proposal: proposal, actorReference: digest("4"), challengeReference: digest("6")
    ), let receipt = IntegratedRehearsalRecordFactory.receipt(
        proposal: proposal, decision: decision, actorReference: digest("4"),
        challengeReference: digest("6"), capabilityReference: digest("7")
    ) else { return nil }
    return parse(IntegratedRehearsalRecordFactory.genesis(
        bindings: bindings,
        actorReference: digest("4"), ceremonySessionReference: digest("5"),
        challengeReference: digest("6"), capabilityReference: digest("7"),
        observation: observation, plausibilityConfirmationReference: digest("8"),
        epochReference: digest("9"), approvalLineage: .init(
            proposal: proposal, decision: decision, receipt: receipt
        )
    ))
}

private func runMatrix() -> Bool {
    var cases = 0
    func check(_ condition: @autoclosure () -> Bool) -> Bool {
        cases += 1
        let accepted = condition()
        if !accepted { print("matrix_failure_case=\(cases)") }
        return accepted
    }
    let preflight = NativeIntegratedAuthentication.preflight()
    guard check(!preflight.nativeInstallRequired), check(!preflight.rootHelperRequired),
          check(!preflight.sudoRequired), check(!preflight.launchdMutationRequired),
          check(!preflight.productionSigningCredentialRequired),
          check(!preflight.keychainExtractionRequired)
    else { return false }

    guard let firstSecret = NativeOneShotSecret(), let secondSecret = NativeOneShotSecret(),
          let first = firstSecret.bind(domain: "matrix.challenge", exactBinding: ["actor": digest("a")]),
          let second = secondSecret.bind(domain: "matrix.challenge", exactBinding: ["actor": digest("a")])
    else { return false }
    guard check(first != second), check(firstSecret.consume(exactReference: first)),
          check(!firstSecret.consume(exactReference: first)),
          check(!secondSecret.consume(exactReference: first)),
          check(secondSecret.consume(exactReference: second))
    else { return false }

    guard let genesis = makeFixtureGenesis(), let base = projection(genesis) else {
        print("matrix_failure_stage=fixture_genesis")
        return false
    }
    guard check(genesis.generation == 0), check(genesis.eventKind == "INTEGRATED_RUNTIME_GENESIS_CANDIDATE"),
          check(base["actor_candidate_state"] as? String == "ESTABLISHMENT_CANDIDATE_PRESENT"),
          check(base["clock_candidate_state"] as? String == "ESTABLISHMENT_CANDIDATE_PRESENT")
    else { print("matrix_failure_stage=challenge_issue"); return false }
    let bindings = IntegratedRehearsalRecordFactory.sourceBindings(
        installationProfileDigest: installationProfile, nativeProfileDigest: nativeProfile,
        liveActorProvenanceDigest: digest("a"), liveClockProvenanceDigest: digest("b"),
        companionArtifactDigest: digest("f")
    )
    let fixtureObservation = NativeTrustedClockObservation(
        osUTC: "2026-08-12T00:00:00.000Z", continuousLowerNanoseconds: 1,
        continuousUpperNanoseconds: 2, continuousBracketReferenceDigest: digest("1"),
        bootSessionReferenceDigest: digest("2"), observationReferenceDigest: digest("3")
    )
    guard let fixtureProposal = IntegratedRehearsalRecordFactory.proposal(
        bindings: bindings, actorReference: digest("4"), ceremonySessionReference: digest("5"),
        challengeReference: digest("6"), observation: fixtureObservation,
        plausibilityConfirmationReference: digest("8")
    ), let fixtureDecision = IntegratedRehearsalRecordFactory.approve(
        proposal: fixtureProposal, actorReference: digest("4"), challengeReference: digest("6")
    ), let fixtureReceipt = IntegratedRehearsalRecordFactory.receipt(
        proposal: fixtureProposal, decision: fixtureDecision, actorReference: digest("4"),
        challengeReference: digest("6"), capabilityReference: digest("7")
    ) else { return false }
    func rejectedGenesis(
        _ proposal: IntegratedCanonicalBody = fixtureProposal,
        _ decision: IntegratedCanonicalBody = fixtureDecision,
        _ receipt: IntegratedCanonicalBody = fixtureReceipt
    ) -> Bool {
        IntegratedRehearsalRecordFactory.genesis(
            bindings: bindings, actorReference: digest("4"), ceremonySessionReference: digest("5"),
            challengeReference: digest("6"), capabilityReference: digest("7"),
            observation: fixtureObservation, plausibilityConfirmationReference: digest("8"),
            epochReference: digest("9"), approvalLineage: .init(
                proposal: proposal, decision: decision, receipt: receipt
            )
        ) == nil
    }
    let proposalDomain = "farmos.day150-c2b-bootstrap-runtime-genesis-proposal.v1:body"
    for (field, value) in [
        ("actor_reference_digest_candidate", digest("f") as Any),
        ("challenge_reference_digest_candidate", digest("f") as Any),
        ("os_utc_observation_reference_digest_candidate", digest("f") as Any),
        ("target_binding_digest", digest("f") as Any),
        ("clock_policy_revision", 2 as Any),
        ("purpose", "SAME_SUMMARY_DIFFERENT_PROPOSAL" as Any),
        ("unexpected_field", "FORBIDDEN" as Any),
    ] {
        var body = fixtureProposal.body; body[field] = value
        guard let mutated = canonicalBody(body, domain: proposalDomain),
              check(rejectedGenesis(mutated)) else { return false }
    }
    var alternateProposalBody = fixtureProposal.body
    alternateProposalBody["actor_policy_revision"] = 2
    guard let alternateProposal = canonicalBody(alternateProposalBody, domain: proposalDomain),
          let rebuiltDecision = IntegratedRehearsalRecordFactory.approve(
            proposal: alternateProposal, actorReference: digest("4"), challengeReference: digest("6")
          ), let rebuiltReceipt = IntegratedRehearsalRecordFactory.receipt(
            proposal: alternateProposal, decision: rebuiltDecision, actorReference: digest("4"),
            challengeReference: digest("6"), capabilityReference: digest("7")
          ), check(rejectedGenesis(alternateProposal, rebuiltDecision, rebuiltReceipt))
    else { return false }
    let decisionDomain =
        "farmos.day150-c2b-bootstrap-runtime-genesis-approval-decision.v1:body"
    for (field, value) in [
        ("proposal_reference_digest", digest("f") as Any),
        ("actor_reference_digest_candidate", digest("f") as Any),
        ("challenge_reference_digest_candidate", digest("f") as Any),
        ("decision", "REJECT" as Any),
    ] {
        var body = fixtureDecision.body; body[field] = value
        guard let mutated = canonicalBody(body, domain: decisionDomain),
              check(rejectedGenesis(fixtureProposal, mutated, fixtureReceipt)) else { return false }
    }
    let receiptDomain = "farmos.day150-c2b-bootstrap-runtime-genesis-approval-receipt.v1:body"
    for (field, value) in [
        ("proposal_reference_digest", digest("f") as Any),
        ("approval_decision_reference_digest", digest("f") as Any),
        ("actor_reference_digest_candidate", digest("f") as Any),
        ("challenge_reference_digest_candidate", digest("f") as Any),
        ("capability_reference_digest_candidate", digest("f") as Any),
    ] {
        var body = fixtureReceipt.body; body[field] = value
        guard let mutated = canonicalBody(body, domain: receiptDomain),
              check(rejectedGenesis(fixtureProposal, fixtureDecision, mutated)) else { return false }
    }
    guard check(!IntegratedRehearsalRecordFactory.liveBindingsExcludeFixtureInstances(bindings))
    else { return false }
    let liveBindings = IntegratedRehearsalRecordFactory.sourceBindings(
        installationProfileDigest: installationProfile, nativeProfileDigest: nativeProfile,
        liveActorProvenanceDigest: IntegratedRehearsalRecordFactory.liveActorProvenanceDigest(
            actorReference: digest("4"), challengeReference: digest("6"),
            proposedValidFrom: "2026-08-12T00:00:00.000Z",
            proposedExpiresAt: "2026-08-12T00:15:00.000Z"),
        liveClockProvenanceDigest: IntegratedRehearsalRecordFactory.liveClockProvenanceDigest(
            observation: fixtureObservation, epochReference: digest("9"),
            installationProfileDigest: installationProfile, actorReference: digest("4"),
            capabilityReference: digest("7")), companionArtifactDigest: digest("e")
    )
    guard check(IntegratedRehearsalRecordFactory.liveBindingsExcludeFixtureInstances(liveBindings)),
          check(NativeIntegratedAuthentication.qualificationProcessLifetimeSeconds == 600)
    else { return false }
    func executable(_ inode: UInt64 = 2, device: UInt64 = 1,
                    owner: UInt32 = 3, mode: UInt16 = 0o100755,
                    links: UInt16 = 1, size: Int64 = 5, artifact: String = digest("a"))
        -> NativeIntegratedAuthentication.ExecutableObjectIdentity {
        .init(device: device, inode: inode, owner: owner, group: 4, mode: mode,
              linkCount: links, size: size, modifiedSeconds: 6, modifiedNanoseconds: 7,
              changedSeconds: 8, changedNanoseconds: 9, artifactDigest: artifact)
    }
    let verifiedExecutable = executable()
    guard check(NativeIntegratedAuthentication.executableIdentityMatches(
        verified: verifiedExecutable, mapped: verifiedExecutable
    )), check(NativeIntegratedAuthentication.companionArtifactIsPinned(
        verified: verifiedExecutable, expectedDigest: digest("a")
    )), check(!NativeIntegratedAuthentication.companionArtifactIsPinned(
        verified: verifiedExecutable, expectedDigest: digest("f")
    )), check(NativeIntegratedAuthentication.finalArtifactAgreement(
        expected: digest("e"), parent: digest("e"), companion: digest("e")
    )), check(!NativeIntegratedAuthentication.finalArtifactAgreement(
        expected: digest("e"), parent: digest("a"), companion: digest("e")
    )), check(!NativeIntegratedAuthentication.finalArtifactAgreement(
        expected: digest("e"), parent: digest("e"), companion: digest("f")
    )) else { return false }
    for mutation in [executable(9), executable(device: 9), executable(owner: 9),
                     executable(mode: 0o100777),
                     executable(links: 2), executable(size: 99), executable(artifact: digest("f"))] {
        guard check(!NativeIntegratedAuthentication.executableIdentityMatches(
            verified: verifiedExecutable, mapped: mutation
        )) else { return false }
    }

    func timingObservation(
        _ utc: String, _ lower: UInt64, _ upper: UInt64,
        boot: String = digest("2"), reference: String = digest("3")
    ) -> NativeTrustedClockObservation {
        .init(
            osUTC: utc, continuousLowerNanoseconds: lower,
            continuousUpperNanoseconds: upper,
            continuousBracketReferenceDigest: digest("1"),
            bootSessionReferenceDigest: boot, observationReferenceDigest: reference
        )
    }
    let timingIssue = timingObservation(
        "2026-08-12T00:00:01.000Z", 1_000_000_000, 1_000_000_001
    )
    let timingStart = timingObservation(
        "2026-08-12T00:00:10.000Z", 10_000_000_000, 10_000_000_001
    )
    guard let timingExpiry = PostGen0InteractiveAuthTimingPolicy.challengeDeadline(
        issuance: timingIssue, durableFloor: "2026-08-12T00:00:00.000Z",
        priorContinuousUpperNanoseconds: 2,
        expectedBootSessionReferenceDigest: digest("2")
    ), check(timingExpiry == "2026-08-12T00:05:01.000Z"),
          let timingEvaluation = PostGen0InteractiveAuthTimingPolicy.beginEvaluation(
            issuance: timingIssue, challengeExpiry: timingExpiry, start: timingStart,
            exactBindingValid: true, applicationForegroundConfirmed: true
          ), check(timingEvaluation.evaluationDeadline == "2026-08-12T00:03:10.000Z"),
          check(timingEvaluation.effectiveDeadline == "2026-08-12T00:03:10.000Z"),
          check(PostGen0InteractiveAuthTimingPolicy.consumeResult(
            evaluation: timingEvaluation,
            result: timingObservation(
                "2026-08-12T00:01:45.000Z", 105_000_000_000, 105_000_000_001
            ), exactBindingValid: true
          ) == .acceptable),
          check(PostGen0InteractiveAuthTimingPolicy.consumeResult(
            evaluation: timingEvaluation,
            result: timingObservation(
                "2026-08-12T00:03:09.999Z", 189_999_000_000, 189_999_000_001
            ), exactBindingValid: true
          ) == .acceptable),
          check(PostGen0InteractiveAuthTimingPolicy.consumeResult(
            evaluation: timingEvaluation,
            result: timingObservation(
                "2026-08-12T00:03:10.001Z", 190_001_000_000, 190_001_000_001
            ), exactBindingValid: true
          ) == .expired),
          check(PostGen0InteractiveAuthTimingPolicy.consumeResult(
            evaluation: timingEvaluation,
            result: timingObservation(
                "2026-08-12T00:05:02.000Z", 302_000_000_000, 302_000_000_001
            ), exactBindingValid: true
          ) == .expired),
          check(PostGen0InteractiveAuthTimingPolicy.beginEvaluation(
            issuance: timingIssue, challengeExpiry: timingExpiry,
            start: timingObservation(
                "2026-08-12T00:05:01.001Z", 301_001_000_000, 301_001_000_001
            ), exactBindingValid: true, applicationForegroundConfirmed: true
          ) == nil),
          check(PostGen0InteractiveAuthTimingPolicy.beginEvaluation(
            issuance: timingIssue, challengeExpiry: "2026-08-12T00:00:31.000Z",
            start: timingStart, exactBindingValid: true,
            applicationForegroundConfirmed: true
          ) == nil),
          check(!PostGen0InteractiveAuthTimingPolicy.historicalChallengeMayBeExtended()),
          check(PostGen0InteractiveAuthTimingPolicy.beginEvaluation(
            issuance: timingIssue, challengeExpiry: timingExpiry, start: timingStart,
            exactBindingValid: false, applicationForegroundConfirmed: true
          ) == nil),
          check(PostGen0InteractiveAuthTimingPolicy.beginEvaluation(
            issuance: timingIssue, challengeExpiry: timingExpiry,
            start: timingObservation(
                "2026-08-12T00:00:10.000Z", 10_000_000_000, 10_000_000_001,
                boot: digest("f")
            ), exactBindingValid: true, applicationForegroundConfirmed: true
          ) == nil),
          check(PostGen0InteractiveAuthTimingPolicy.challengeDeadline(
            issuance: timingIssue, durableFloor: "2026-08-12T00:00:02.000Z",
            priorContinuousUpperNanoseconds: 2,
            expectedBootSessionReferenceDigest: digest("2")
          ) == nil),
          check(PostGen0InteractiveAuthTimingPolicy.beginEvaluation(
            issuance: timingIssue, challengeExpiry: timingExpiry,
            start: timingObservation(
                "2026-08-12T00:00:00.999Z", 10_000_000_000, 10_000_000_001
            ), exactBindingValid: true, applicationForegroundConfirmed: true
          ) == nil)
    else { return false }

    let issueTime = "2026-08-12T00:00:01.000Z"
    let expiry = "2026-08-12T00:00:10.000Z"
    var issuedProjection = base
    issuedProjection["challenge_candidate_state"] = "OUTSTANDING_CANDIDATE"
    issuedProjection["challenge_reference_digest_candidate"] = digest("a")
    issuedProjection["challenge_native_session_reference_digest_candidate"] = digest("b")
    issuedProjection["challenge_expires_at_candidate"] = expiry
    issuedProjection["challenge_freshness_basis"] = "ACTIVE_TRUSTED_CLOCK_CANDIDATE"
    issuedProjection["monotonic_floor_timestamp_candidate"] = issueTime
    var issuePayload: [String: Any] = [
        "challenge_reference_digest_candidate": digest("a"),
        "actor_reference_digest_candidate": digest("4"),
        "native_ceremony_session_reference_digest_candidate": digest("b"),
        "expires_at_candidate": expiry, "issued_at_candidate": issueTime,
        "scope": IntegratedRehearsalRecordFactory.purpose,
    ]
    issuePayload.merge([
        "freshness_basis": "ACTIVE_TRUSTED_CLOCK_CANDIDATE",
        "clock_epoch_reference_digest_candidate": digest("9"),
        "prior_monotonic_floor_timestamp_candidate": "2026-08-12T00:00:00.000Z",
        "proposed_monotonic_floor_timestamp_candidate": issueTime,
        "os_utc_observation_reference_digest_candidate": digest("c"),
        "continuous_time_bracket_reference_digest_candidate": digest("d"),
        "boot_session_reference_digest_candidate": digest("2"),
        "native_recovery_session_reference_digest_candidate": NSNull(),
        "clock_comparison_policy_revision": 1,
    ]) { _, new in new }
    guard let issued = nextRecord(previous: genesis, eventKind: "CHALLENGE_ISSUANCE_CANDIDATE",
                                  payload: issuePayload, projection: issuedProjection, bindings: bindings),
          check(DisposableRecordValidator.transitionIsValid(previous: genesis, current: issued))
    else { return false }

    var wrongActor = issuePayload
    wrongActor["actor_reference_digest_candidate"] = digest("f")
    guard let wrongActorRecord = nextRecord(
        previous: genesis, eventKind: "CHALLENGE_ISSUANCE_CANDIDATE", payload: wrongActor,
        projection: issuedProjection, bindings: bindings
    ), check(!DisposableRecordValidator.transitionIsValid(previous: genesis, current: wrongActorRecord))
    else { return false }
    var wrongEpoch = issuePayload
    wrongEpoch["clock_epoch_reference_digest_candidate"] = digest("f")
    guard let wrongEpochRecord = nextRecord(
        previous: genesis, eventKind: "CHALLENGE_ISSUANCE_CANDIDATE", payload: wrongEpoch,
        projection: issuedProjection, bindings: bindings
    ), check(!DisposableRecordValidator.transitionIsValid(previous: genesis, current: wrongEpochRecord))
    else { return false }
    var staleFloor = issuePayload
    staleFloor["prior_monotonic_floor_timestamp_candidate"] = "2026-08-11T23:59:59.000Z"
    guard let staleFloorRecord = nextRecord(
        previous: genesis, eventKind: "CHALLENGE_ISSUANCE_CANDIDATE", payload: staleFloor,
        projection: issuedProjection, bindings: bindings
    ), check(!DisposableRecordValidator.transitionIsValid(previous: genesis, current: staleFloorRecord))
    else { return false }

    let terminalTime = "2026-08-12T00:00:02.000Z"
    var terminalProjection = issuedProjection
    terminalProjection["challenge_candidate_state"] =
        "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE"
    terminalProjection["monotonic_floor_timestamp_candidate"] = terminalTime
    let terminalPayload: [String: Any] = [
        "challenge_reference_digest_candidate": digest("a"),
        "terminal_state": "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
        "terminal_reference_digest_candidate": digest("e"),
        "observed_at_candidate": terminalTime,
        "native_ceremony_session_reference_digest_candidate": digest("b"),
        "freshness_basis": "ACTIVE_TRUSTED_CLOCK_CANDIDATE",
        "clock_epoch_reference_digest_candidate": digest("9"),
        "prior_monotonic_floor_timestamp_candidate": issueTime,
        "proposed_monotonic_floor_timestamp_candidate": terminalTime,
        "os_utc_observation_reference_digest_candidate": digest("c"),
        "continuous_time_bracket_reference_digest_candidate": digest("d"),
        "boot_session_reference_digest_candidate": digest("2"),
        "native_recovery_session_reference_digest_candidate": NSNull(),
        "clock_comparison_policy_revision": 1,
    ]
    guard let terminal = nextRecord(
        previous: issued, eventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        payload: terminalPayload, projection: terminalProjection, bindings: bindings
    ), check(DisposableRecordValidator.transitionIsValid(previous: issued, current: terminal))
    else { return false }
    var approvalOnlyPayload = terminalPayload
    approvalOnlyPayload["terminal_state"] = "CONSUMED_APPROVAL_SUCCESS_CANDIDATE"
    var approvalOnlyProjection = terminalProjection
    approvalOnlyProjection["challenge_candidate_state"] = "CONSUMED_APPROVAL_SUCCESS_CANDIDATE"
    guard let approvalOnlyTerminal = nextRecord(
        previous: issued, eventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        payload: approvalOnlyPayload, projection: approvalOnlyProjection, bindings: bindings
    ), check(DisposableRecordValidator.transitionIsValid(
        previous: issued, current: approvalOnlyTerminal
    )) else { return false }
    var wrongChallenge = terminalPayload
    wrongChallenge["challenge_reference_digest_candidate"] = digest("f")
    guard let wrongChallengeRecord = nextRecord(
        previous: issued, eventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        payload: wrongChallenge, projection: terminalProjection, bindings: bindings
    ), check(!DisposableRecordValidator.transitionIsValid(previous: issued, current: wrongChallengeRecord))
    else { return false }
    var wrongSession = terminalPayload
    wrongSession["native_ceremony_session_reference_digest_candidate"] = digest("f")
    guard let wrongSessionRecord = nextRecord(
        previous: issued, eventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        payload: wrongSession, projection: terminalProjection, bindings: bindings
    ), check(!DisposableRecordValidator.transitionIsValid(previous: issued, current: wrongSessionRecord))
    else { return false }

    let recoverySession = digest("8")
    guard check(CrossEpochChallengeRecoveryPolicy.amendmentDigest ==
        "sha256:0a7522b8de0841a3e7bb549fd1d6beadd67efb4fd053e0a9f52d963a35d01be4")
    else { return false }
    let recoveryBinding: [String: Any] = [
        "amendment_authority": CrossEpochChallengeRecoveryPolicy.authority,
        "amendment_revision": 1,
        "amendment_digest": CrossEpochChallengeRecoveryPolicy.amendmentDigest,
        "expected_head_generation": NSNumber(value: issued.generation),
        "expected_head_digest": issued.recordDigest,
        "old_epoch_reference_digest_candidate": digest("9"),
        "old_boot_session_reference_digest_candidate": digest("2"),
        "current_boot_session_reference_digest_candidate": digest("f"),
        "recovery_session_reference_digest_candidate": recoverySession,
        "recovery_freshness_reference_digest_candidate": digest("7"),
        "terminal_reason": CrossEpochChallengeRecoveryPolicy.terminalReason,
    ]
    let crossEpochPayload: [String: Any] = [
        "challenge_reference_digest_candidate": digest("a"),
        "terminal_state": CrossEpochChallengeRecoveryPolicy.terminalState,
        "terminal_reference_digest_candidate": digest("6"),
        "observed_at_candidate": NSNull(),
        "native_ceremony_session_reference_digest_candidate": digest("b"),
        "cross_epoch_recovery_binding_candidate": recoveryBinding,
        "freshness_basis": "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
        "clock_epoch_reference_digest_candidate": NSNull(),
        "prior_monotonic_floor_timestamp_candidate": NSNull(),
        "proposed_monotonic_floor_timestamp_candidate": NSNull(),
        "os_utc_observation_reference_digest_candidate": NSNull(),
        "continuous_time_bracket_reference_digest_candidate": NSNull(),
        "boot_session_reference_digest_candidate": NSNull(),
        "native_recovery_session_reference_digest_candidate": recoverySession,
        "clock_comparison_policy_revision": 1,
    ]
    var crossEpochProjection = issuedProjection
    crossEpochProjection["challenge_candidate_state"] =
        CrossEpochChallengeRecoveryPolicy.terminalState
    guard let crossEpochRecord = nextRecord(
        previous: issued, eventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        payload: crossEpochPayload, projection: crossEpochProjection, bindings: bindings
    ), check(DisposableRecordValidator.transitionIsValid(
        previous: issued, current: crossEpochRecord
    )), check(projection(crossEpochRecord)?["monotonic_floor_timestamp_candidate"] as? String ==
        issueTime), check(projection(crossEpochRecord)?["capability_candidate_state"] as? String ==
        "CONSUMED_CANDIDATE") else {
        print("matrix_failure_stage=cross_epoch_valid")
        return false
    }
    func rejectedCrossEpoch(_ mutate: (inout [String: Any], inout [String: Any]) -> Void) -> Bool {
        var payload = crossEpochPayload
        var binding = recoveryBinding
        mutate(&payload, &binding)
        payload["cross_epoch_recovery_binding_candidate"] = binding
        guard let candidate = nextRecord(
            previous: issued, eventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
            payload: payload, projection: crossEpochProjection, bindings: bindings
        ) else { return true }
        return !DisposableRecordValidator.transitionIsValid(previous: issued, current: candidate)
    }
    guard check(rejectedCrossEpoch { _, value in
        value["current_boot_session_reference_digest_candidate"] = digest("2")
    }), check(rejectedCrossEpoch { _, value in
        value["expected_head_digest"] = digest("0")
    }), check(rejectedCrossEpoch { value, _ in
        value["challenge_reference_digest_candidate"] = digest("0")
    }), check(rejectedCrossEpoch { value, _ in
        value["native_ceremony_session_reference_digest_candidate"] = digest("0")
    }), check(rejectedCrossEpoch { value, _ in
        value["native_recovery_session_reference_digest_candidate"] = NSNull()
    }), check(rejectedCrossEpoch { value, _ in
        value["freshness_basis"] = "ACTIVE_TRUSTED_CLOCK_CANDIDATE"
    }), check(!CrossEpochChallengeRecoveryPolicy.confirmedBootSessionChange(
        historicalBootSessionReference: digest("2"), currentObservation: fixtureObservation
    )) else {
        print("matrix_failure_stage=cross_epoch_negative")
        return false
    }

    let recoveryChallenge = digest("1")
    let recoveryCeremonySession = digest("3")
    let recoveryFreshnessReference = digest("4")
    func bootRecoveryBinding(
        stage: String, head: DisposableRuntimeRecord,
        terminalReference: Any = NSNull(), capabilityReference: Any = NSNull()
    ) -> [String: Any] {
        [
            "amendment_authority": BootSessionRecoveryCapabilityPolicy.authority,
            "amendment_revision": 1,
            "amendment_digest": BootSessionRecoveryCapabilityPolicy.amendmentDigest,
            "recovery_stage": stage,
            "expected_head_generation": NSNumber(value: head.generation),
            "expected_head_digest": head.recordDigest,
            "gen2_record_digest_candidate": crossEpochRecord.recordDigest,
            "gen2_terminal_reference_digest_candidate": digest("6"),
            "historical_challenge_reference_digest_candidate": digest("a"),
            "historical_session_reference_digest_candidate": digest("b"),
            "old_epoch_reference_digest_candidate": digest("9"),
            "old_boot_session_reference_digest_candidate": digest("2"),
            "current_boot_session_reference_digest_candidate": digest("f"),
            "recovery_purpose": BootSessionRecoveryCapabilityPolicy.purpose,
            "recovery_policy_revision": 1,
            "recovery_challenge_reference_digest_candidate": recoveryChallenge,
            "recovery_challenge_terminal_reference_digest_candidate": terminalReference,
            "recovery_capability_reference_digest_candidate": capabilityReference,
            "recovery_session_reference_digest_candidate": recoveryCeremonySession,
            "recovery_freshness_reference_digest_candidate": recoveryFreshnessReference,
        ]
    }
    let recoveryMutationFreshness: [String: Any] = [
        "freshness_basis": "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
        "clock_epoch_reference_digest_candidate": NSNull(),
        "prior_monotonic_floor_timestamp_candidate": NSNull(),
        "proposed_monotonic_floor_timestamp_candidate": NSNull(),
        "os_utc_observation_reference_digest_candidate": NSNull(),
        "continuous_time_bracket_reference_digest_candidate": NSNull(),
        "boot_session_reference_digest_candidate": NSNull(),
        "native_recovery_session_reference_digest_candidate": recoveryCeremonySession,
        "clock_comparison_policy_revision": 1,
    ]
    var recoveryChallengePayload: [String: Any] = [
        "challenge_reference_digest_candidate": recoveryChallenge,
        "actor_reference_digest_candidate": digest("4"),
        "native_ceremony_session_reference_digest_candidate": recoveryCeremonySession,
        "expires_at_candidate": NSNull(), "issued_at_candidate": NSNull(),
        "scope": IntegratedRehearsalRecordFactory.purpose,
        "boot_session_recovery_binding_candidate": bootRecoveryBinding(
            stage: "RECOVERY_CHALLENGE_ISSUANCE_CANDIDATE", head: crossEpochRecord),
    ]
    recoveryChallengePayload.merge(recoveryMutationFreshness) { _, new in new }
    var recoveryChallengeProjection = crossEpochProjection
    recoveryChallengeProjection["challenge_candidate_state"] = "OUTSTANDING_CANDIDATE"
    recoveryChallengeProjection["challenge_reference_digest_candidate"] = recoveryChallenge
    recoveryChallengeProjection["challenge_native_session_reference_digest_candidate"] =
        recoveryCeremonySession
    recoveryChallengeProjection["challenge_expires_at_candidate"] = NSNull()
    recoveryChallengeProjection["challenge_freshness_basis"] =
        "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE"
    guard check(FarmOSCanonicalDigest.isDigest(
        BootSessionRecoveryCapabilityPolicy.amendmentDigest)),
          let recoveryChallengeRecord = nextRecord(
            previous: crossEpochRecord, eventKind: "CHALLENGE_ISSUANCE_CANDIDATE",
            payload: recoveryChallengePayload, projection: recoveryChallengeProjection,
            bindings: bindings),
          check(DisposableRecordValidator.transitionIsValid(
            previous: crossEpochRecord, current: recoveryChallengeRecord))
    else { print("matrix_failure_stage=boot_recovery_challenge"); return false }
    func rejectedRecoveryChallenge(_ mutate: (inout [String: Any]) -> Void) -> Bool {
        var value = recoveryChallengePayload
        mutate(&value)
        guard let candidate = nextRecord(
            previous: crossEpochRecord, eventKind: "CHALLENGE_ISSUANCE_CANDIDATE",
            payload: value, projection: recoveryChallengeProjection, bindings: bindings
        ) else { return true }
        return !DisposableRecordValidator.transitionIsValid(
            previous: crossEpochRecord, current: candidate)
    }
    guard check(rejectedRecoveryChallenge { value in
        var binding = value["boot_session_recovery_binding_candidate"] as! [String: Any]
        binding["expected_head_digest"] = digest("0")
        value["boot_session_recovery_binding_candidate"] = binding
    }), check(rejectedRecoveryChallenge { value in
        var binding = value["boot_session_recovery_binding_candidate"] as! [String: Any]
        binding["historical_challenge_reference_digest_candidate"] = digest("0")
        value["boot_session_recovery_binding_candidate"] = binding
    }), check(rejectedRecoveryChallenge { value in
        var binding = value["boot_session_recovery_binding_candidate"] as! [String: Any]
        binding["historical_session_reference_digest_candidate"] = digest("0")
        value["boot_session_recovery_binding_candidate"] = binding
    }), check(rejectedRecoveryChallenge { value in
        var binding = value["boot_session_recovery_binding_candidate"] as! [String: Any]
        binding["old_epoch_reference_digest_candidate"] = digest("0")
        value["boot_session_recovery_binding_candidate"] = binding
    }), check(rejectedRecoveryChallenge { value in
        var binding = value["boot_session_recovery_binding_candidate"] as! [String: Any]
        binding["current_boot_session_reference_digest_candidate"] = digest("2")
        value["boot_session_recovery_binding_candidate"] = binding
    }), check(rejectedRecoveryChallenge { value in
        var binding = value["boot_session_recovery_binding_candidate"] as! [String: Any]
        binding["recovery_purpose"] = "NORMAL_CHALLENGE_ISSUANCE"
        value["boot_session_recovery_binding_candidate"] = binding
    }), check(rejectedRecoveryChallenge { value in
        value["native_recovery_session_reference_digest_candidate"] = NSNull()
    }) else { print("matrix_failure_stage=boot_recovery_challenge_negative"); return false }

    var recoveryTerminalPayload: [String: Any] = [
        "challenge_reference_digest_candidate": recoveryChallenge,
        "terminal_state": "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
        "terminal_reference_digest_candidate": digest("5"),
        "observed_at_candidate": NSNull(),
        "native_ceremony_session_reference_digest_candidate": recoveryCeremonySession,
        "boot_session_recovery_binding_candidate": bootRecoveryBinding(
            stage: "RECOVERY_CHALLENGE_TERMINALIZATION_CANDIDATE",
            head: recoveryChallengeRecord, terminalReference: digest("5")),
    ]
    recoveryTerminalPayload.merge(recoveryMutationFreshness) { _, new in new }
    var recoveryTerminalProjection = recoveryChallengeProjection
    recoveryTerminalProjection["challenge_candidate_state"] =
        "CONSUMED_APPROVAL_SUCCESS_CANDIDATE"
    guard let recoveryTerminalRecord = nextRecord(
        previous: recoveryChallengeRecord, eventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        payload: recoveryTerminalPayload, projection: recoveryTerminalProjection, bindings: bindings
    ), check(DisposableRecordValidator.transitionIsValid(
        previous: recoveryChallengeRecord, current: recoveryTerminalRecord))
    else { print("matrix_failure_stage=boot_recovery_terminal"); return false }

    let recoveryCapability = digest("d")
    var recoveryCapabilityPayload: [String: Any] = [
        "capability_reference_digest_candidate": recoveryCapability,
        "actor_reference_digest_candidate": digest("4"),
        "challenge_reference_digest_candidate": recoveryChallenge,
        "native_ceremony_session_reference_digest_candidate": recoveryCeremonySession,
        "capability_generation": 1,
        "previous_capability_or_revocation_reference_digest_candidate": digest("7"),
        "expires_at_candidate": NSNull(), "issued_at_candidate": NSNull(),
        "scope": IntegratedRehearsalRecordFactory.purpose, "one_shot": true,
        "boot_session_recovery_binding_candidate": bootRecoveryBinding(
            stage: "RECOVERY_CAPABILITY_ISSUANCE_CANDIDATE",
            head: recoveryTerminalRecord, terminalReference: digest("5"),
            capabilityReference: recoveryCapability),
    ]
    recoveryCapabilityPayload.merge(recoveryMutationFreshness) { _, new in new }
    var recoveryCapabilityProjection = recoveryTerminalProjection
    recoveryCapabilityProjection["capability_candidate_state"] = "AVAILABLE_CANDIDATE"
    recoveryCapabilityProjection["capability_reference_digest_candidate"] = recoveryCapability
    recoveryCapabilityProjection["capability_generation_candidate"] = 1
    recoveryCapabilityProjection["capability_expires_at_candidate"] = NSNull()
    recoveryCapabilityProjection["capability_freshness_basis"] =
        "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE"
    recoveryCapabilityProjection["capability_lineage_head_reference_digest_candidate"] =
        recoveryCapability
    guard let recoveryCapabilityRecord = nextRecord(
        previous: recoveryTerminalRecord, eventKind: "CAPABILITY_ISSUANCE_CANDIDATE",
        payload: recoveryCapabilityPayload, projection: recoveryCapabilityProjection,
        bindings: bindings), check(DisposableRecordValidator.transitionIsValid(
            previous: recoveryTerminalRecord, current: recoveryCapabilityRecord))
    else { print("matrix_failure_stage=boot_recovery_capability"); return false }

    let newEpoch = digest("e")
    let supersessionPayload: [String: Any] = [
        "previous_epoch_reference_digest_candidate": digest("9"),
        "proposed_new_epoch_reference_digest_candidate": newEpoch,
        "recovery_actor_reference_digest_candidate": digest("4"),
        "recovery_capability_reference_digest_candidate": recoveryCapability,
        "proposed_corrected_genesis_timestamp_candidate": issueTime,
        "proposed_new_floor_timestamp_candidate": issueTime,
        "affected_record_policy_reference_digest_candidate": digest("6"),
        "os_utc_observation_reference_digest_candidate": digest("7"),
        "continuous_time_bracket_reference_digest_candidate": digest("8"),
        "boot_session_reference_digest_candidate": digest("f"),
    ]
    var supersessionProjection = recoveryCapabilityProjection
    supersessionProjection["epoch_reference_digest_candidate"] = newEpoch
    supersessionProjection["monotonic_floor_timestamp_candidate"] = issueTime
    supersessionProjection["boot_session_reference_digest_candidate"] = digest("f")
    supersessionProjection["capability_candidate_state"] = "CONSUMED_CANDIDATE"
    guard let supersessionRecord = nextRecord(
        previous: recoveryCapabilityRecord, eventKind: "CLOCK_EPOCH_SUPERSESSION_CANDIDATE",
        payload: supersessionPayload, projection: supersessionProjection, bindings: bindings
    ), check(DisposableRecordValidator.transitionIsValid(
        previous: recoveryCapabilityRecord, current: supersessionRecord)),
          check(projection(supersessionRecord)?["epoch_reference_digest_candidate"] as? String ==
            newEpoch), check(projection(supersessionRecord)?["capability_candidate_state"] as? String ==
            "CONSUMED_CANDIDATE")
    else { print("matrix_failure_stage=boot_recovery_supersession"); return false }
    var wrongPurposeCapability = recoveryCapabilityPayload
    var wrongPurposeBinding = wrongPurposeCapability[
        "boot_session_recovery_binding_candidate"] as! [String: Any]
    wrongPurposeBinding["recovery_purpose"] = "B2"
    wrongPurposeCapability["boot_session_recovery_binding_candidate"] = wrongPurposeBinding
    let reusedSupersessionRecord = nextRecord(
        previous: supersessionRecord, eventKind: "CLOCK_EPOCH_SUPERSESSION_CANDIDATE",
        payload: supersessionPayload, projection: supersessionProjection, bindings: bindings)
    guard check(nextRecord(
        previous: recoveryTerminalRecord, eventKind: "CAPABILITY_ISSUANCE_CANDIDATE",
        payload: wrongPurposeCapability, projection: recoveryCapabilityProjection,
        bindings: bindings) == nil), check(reusedSupersessionRecord != nil &&
            !DisposableRecordValidator.transitionIsValid(
                previous: supersessionRecord, current: reusedSupersessionRecord!))
    else { return false }

    var expiredPayload = terminalPayload
    expiredPayload["terminal_state"] = "EXPIRED_CANDIDATE"
    expiredPayload["observed_at_candidate"] = "2026-08-12T00:00:11.000Z"
    expiredPayload["proposed_monotonic_floor_timestamp_candidate"] = "2026-08-12T00:00:11.000Z"
    var expiredProjection = issuedProjection
    expiredProjection["challenge_candidate_state"] = "EXPIRED_CANDIDATE"
    expiredProjection["monotonic_floor_timestamp_candidate"] = "2026-08-12T00:00:11.000Z"
    guard let expired = nextRecord(
        previous: issued, eventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        payload: expiredPayload, projection: expiredProjection, bindings: bindings
    ), check(DisposableRecordValidator.transitionIsValid(previous: issued, current: expired))
    else { return false }

    let capabilityTime = "2026-08-12T00:00:03.000Z"
    let capabilityExpiry = "2026-08-12T00:02:03.000Z"
    var capabilityProjection = terminalProjection
    capabilityProjection["capability_candidate_state"] = "AVAILABLE_CANDIDATE"
    capabilityProjection["capability_reference_digest_candidate"] = digest("c")
    capabilityProjection["capability_generation_candidate"] = 1
    capabilityProjection["capability_expires_at_candidate"] = capabilityExpiry
    capabilityProjection["capability_freshness_basis"] = "ACTIVE_TRUSTED_CLOCK_CANDIDATE"
    capabilityProjection["capability_lineage_head_reference_digest_candidate"] = digest("c")
    capabilityProjection["monotonic_floor_timestamp_candidate"] = capabilityTime
    let capabilityPayload: [String: Any] = [
        "capability_reference_digest_candidate": digest("c"),
        "actor_reference_digest_candidate": digest("4"),
        "challenge_reference_digest_candidate": digest("a"),
        "native_ceremony_session_reference_digest_candidate": digest("b"),
        "capability_generation": 1,
        "previous_capability_or_revocation_reference_digest_candidate": digest("7"),
        "expires_at_candidate": capabilityExpiry, "issued_at_candidate": capabilityTime,
        "scope": IntegratedRehearsalRecordFactory.purpose, "one_shot": true,
        "freshness_basis": "ACTIVE_TRUSTED_CLOCK_CANDIDATE",
        "clock_epoch_reference_digest_candidate": digest("9"),
        "prior_monotonic_floor_timestamp_candidate": terminalTime,
        "proposed_monotonic_floor_timestamp_candidate": capabilityTime,
        "os_utc_observation_reference_digest_candidate": digest("c"),
        "continuous_time_bracket_reference_digest_candidate": digest("d"),
        "boot_session_reference_digest_candidate": digest("2"),
        "native_recovery_session_reference_digest_candidate": NSNull(),
        "clock_comparison_policy_revision": 1,
    ]
    guard let capability = nextRecord(
        previous: terminal, eventKind: "CAPABILITY_ISSUANCE_CANDIDATE",
        payload: capabilityPayload, projection: capabilityProjection, bindings: bindings
    ), check(DisposableRecordValidator.transitionIsValid(previous: terminal, current: capability))
    else { return false }
    guard let approvalOnlyCapability = nextRecord(
        previous: approvalOnlyTerminal, eventKind: "CAPABILITY_ISSUANCE_CANDIDATE",
        payload: capabilityPayload, projection: capabilityProjection, bindings: bindings
    ), check(!DisposableRecordValidator.transitionIsValid(
        previous: approvalOnlyTerminal, current: approvalOnlyCapability
    )) else { return false }
    var reusedGeneration = capabilityPayload
    reusedGeneration["capability_generation"] = 0
    guard let reusedGenerationRecord = nextRecord(
        previous: terminal, eventKind: "CAPABILITY_ISSUANCE_CANDIDATE",
        payload: reusedGeneration, projection: capabilityProjection, bindings: bindings
    ), check(!DisposableRecordValidator.transitionIsValid(previous: terminal, current: reusedGenerationRecord))
    else { return false }
    var expiredChallengeCapability = capabilityPayload
    expiredChallengeCapability["prior_monotonic_floor_timestamp_candidate"] =
        "2026-08-12T00:00:11.000Z"
    expiredChallengeCapability["proposed_monotonic_floor_timestamp_candidate"] =
        "2026-08-12T00:00:12.000Z"
    expiredChallengeCapability["issued_at_candidate"] = "2026-08-12T00:00:12.000Z"
    expiredChallengeCapability["expires_at_candidate"] = "2026-08-12T00:02:12.000Z"
    guard let expiredChallengeCapabilityRecord = nextRecord(
        previous: expired, eventKind: "CAPABILITY_ISSUANCE_CANDIDATE",
        payload: expiredChallengeCapability, projection: capabilityProjection, bindings: bindings
    ), check(!DisposableRecordValidator.transitionIsValid(
        previous: expired, current: expiredChallengeCapabilityRecord
    )) else { return false }

    let malformedAuth = ActorAuthenticationResultCandidate(
        mechanismRevision: "wrong", authorizationResultReferenceDigest: digest("a"),
        interactive: true, acceptedByNativeBoundary: true
    )
    guard check(NativeActorProvenanceSource.deriveReferenceCandidate(
        authentication: malformedAuth,
        generatedUIDTransient: "00000000-0000-0000-0000-000000000001",
        installationProfileDigest: installationProfile
    ) == .rejected(.mechanismMismatch)) else { return false }
    let forgedAuth = ActorAuthenticationResultCandidate(
        mechanismRevision: NativeActorProvenanceSource.authenticationMechanismRevision,
        authorizationResultReferenceDigest: digest("a"), interactive: false,
        acceptedByNativeBoundary: true
    )
    guard check(NativeActorProvenanceSource.deriveReferenceCandidate(
        authentication: forgedAuth,
        generatedUIDTransient: "00000000-0000-0000-0000-000000000001",
        installationProfileDigest: installationProfile
    ) == .rejected(.authenticationRejected)) else { return false }
    let validAuth = ActorAuthenticationResultCandidate(
        mechanismRevision: NativeActorProvenanceSource.authenticationMechanismRevision,
        authorizationResultReferenceDigest: digest("a"), interactive: true,
        acceptedByNativeBoundary: true
    )
    guard check(NativeActorProvenanceSource.deriveReferenceCandidate(
        authentication: validAuth, generatedUIDTransient: "malformed",
        installationProfileDigest: installationProfile
    ) == .rejected(.emptyGeneratedUID)) else { return false }
    if case .cancelled = NativeIntegratedAuthentication.classifyFailureFixture(.userCancelled) {
        guard check(true) else { return false }
    } else { return false }
    if case .rejected = NativeIntegratedAuthentication.classifyFailureFixture(.authenticationFailed) {
        guard check(true) else { return false }
    } else { return false }
    if case .malformed = NativeIntegratedAuthentication.classifyFailureFixture(.malformedResult) {
        guard check(true) else { return false }
    } else { return false }

    guard let observed = NativeTrustedClockObserver.observe(installationProfileDigest: installationProfile),
          check(observed.continuousLowerNanoseconds <= observed.continuousUpperNanoseconds),
          check(FarmOSCanonicalDigest.isDigest(observed.bootSessionReferenceDigest)),
          check(NativeClockProvenanceSource.rejectCallerTimestamp() ==
                .rejected(.callerTimestampNotAuthority))
    else { return false }
    let reversed = ClockObservationFixture(
        osUTC: "2026-08-12T00:00:00.000Z", continuousLowerNanoseconds: 2,
        continuousUpperNanoseconds: 1, bootSessionReferenceDigest: digest("2")
    )
    guard check(NativeClockProvenanceSource.validateInjectedFixture(
        reversed, expectedBootSessionReferenceDigest: digest("2")
    ) == .rejected(.malformedContinuousBracket)) else { return false }
    let wrongBoot = ClockObservationFixture(
        osUTC: "2026-08-12T00:00:00.000Z", continuousLowerNanoseconds: 1,
        continuousUpperNanoseconds: 2, bootSessionReferenceDigest: digest("f")
    )
    guard check(NativeClockProvenanceSource.validateInjectedFixture(
        wrongBoot, expectedBootSessionReferenceDigest: digest("2")
    ) == .rejected(.bootSessionMismatch)) else { return false }
    let rollback = NativeTrustedClockObservation(
        osUTC: "2026-08-11T23:59:59.000Z", continuousLowerNanoseconds: 3,
        continuousUpperNanoseconds: 4, continuousBracketReferenceDigest: digest("1"),
        bootSessionReferenceDigest: digest("2"), observationReferenceDigest: digest("3")
    )
    guard check(NativeTrustedClockPolicy.validatePostGenesisCandidate(
        durableFloor: "2026-08-12T00:00:00.000Z", priorContinuousUpperNanoseconds: 2,
        expectedBootSessionReferenceDigest: digest("2"),
        candidate: rollback
    ) == .rollback) else { return false }
    guard check(NativeTrustedClockPolicy.validateGenesisCandidate(rollback) == .accepted)
    else { return false }
    let malformedGenesisClock = NativeTrustedClockObservation(
        osUTC: "2026-08-12T00:00:00.000Z", continuousLowerNanoseconds: 4,
        continuousUpperNanoseconds: 3, continuousBracketReferenceDigest: digest("1"),
        bootSessionReferenceDigest: digest("2"), observationReferenceDigest: digest("3")
    )
    guard check(NativeTrustedClockPolicy.validateGenesisCandidate(malformedGenesisClock) == .malformed)
    else { return false }
    let poison = NativeTrustedClockObservation(
        osUTC: "2026-08-13T00:00:00.000Z", continuousLowerNanoseconds: 3,
        continuousUpperNanoseconds: 4, continuousBracketReferenceDigest: digest("1"),
        bootSessionReferenceDigest: digest("2"), observationReferenceDigest: digest("3")
    )
    guard check(NativeTrustedClockPolicy.validatePostGenesisCandidate(
        durableFloor: "2026-08-12T00:00:00.000Z", priorContinuousUpperNanoseconds: 2,
        expectedBootSessionReferenceDigest: digest("2"),
        candidate: poison
    ) == .forwardPoison) else { return false }
    let bootMismatch = NativeTrustedClockObservation(
        osUTC: "2026-08-12T00:00:01.000Z", continuousLowerNanoseconds: 3,
        continuousUpperNanoseconds: 4, continuousBracketReferenceDigest: digest("1"),
        bootSessionReferenceDigest: digest("f"), observationReferenceDigest: digest("3")
    )
    guard check(NativeTrustedClockPolicy.validatePostGenesisCandidate(
        durableFloor: "2026-08-12T00:00:00.000Z", priorContinuousUpperNanoseconds: 2,
        expectedBootSessionReferenceDigest: digest("2"), candidate: bootMismatch
    ) == .malformed) else { return false }
    print("integrated_matrix_cases=\(cases)")
    print("INTEGRATED_ACTOR_CHALLENGE_CAPABILITY_CLOCK_MATRIX=PASS")
    print("canonical_root_operations=0 native_install_operations=0 b2_operations=0")
    return true
}

private func runPreflight() -> Never {
    let result = NativeIntegratedAuthentication.preflight()
    print("interactive_auth_preflight=\(result.capability.rawValue)")
    print("mechanism_revision=\(result.mechanismRevision)")
    print("native_install_required=0 root_helper_required=0 sudo_required=0")
    print("launchd_mutation_required=0 production_signing_credential_required=0")
    print("keychain_extraction_required=0")
    exit(result.capability == .available ? EXIT_SUCCESS : EXIT_FAILURE)
}

private func runFinalArtifactInspection() -> Never {
    guard let identity = NativeIntegratedAuthentication.finalizedCompanionIdentity() else {
        print("final_signed_artifact=REJECTED")
        exit(EXIT_FAILURE)
    }
    print("final_signed_artifact=ACCEPTABLE_ARTIFACT_BINDING_CANDIDATE")
    print("final_signed_executable_sha256=\(identity.executableSHA256)")
    print("final_artifact_reference_digest=\(identity.artifactReferenceDigest)")
    print("bundle_identifier=\(identity.bundleIdentifier)")
    print("signing_classification=\(identity.signingClassification)")
    print("executable_owner=\(identity.executableOwner)")
    print("executable_mode=\(String(identity.executableMode, radix: 8))")
    exit(EXIT_SUCCESS)
}

private func publish(
    _ record: DisposableRuntimeRecord,
    ledger: DisposableAPFSLedger,
    expected: DisposableRuntimeRecord?
) -> Bool {
    ledger.publish(
        bytes: record.canonicalBytes,
        expectedGeneration: expected?.generation,
        expectedHeadDigest: expected?.recordDigest
    ) == .committed
}

private let preservedRunName = "run-cf9e65f9ad8766b7"
private let preservedGen0Digest =
    "sha256:772cba3c705fe96f1ae60f09024f7efcf90145c24088f97cd227ac33b75d24f4"
private let preservedGen1Digest =
    "sha256:6e534e745da85b6fbdf1240d78d2c602092e58e6e29f33336917c478fbed7523"
private let preservedGen2Digest =
    "sha256:b312d099647fe31b4d4c2af860eed8a09c705e3250af879ab07bce507a0c2fcc"
private let preservedGen8Digest =
    "sha256:d78722bcac4afc73a393907a62698b42973c46ae1f3e3e1665fc4a7cf57bdac8"
private let preservedActiveEpoch =
    "sha256:ca73f7cc00622852b16ec2fb01268ac48ec5b49795caa7d0be268246c3e51f78"
private let preservedGen0CompanionArtifactDigest =
    "sha256:7b50424c3d85f614f831853e5cf8db522b1f63f22444a1d8ecc35e4f5885a7d8"

private func terminalPayload(
    challenge: String, session: String, terminalState: String, reason: String,
    priorFloor: String, observation: NativeTrustedClockObservation,
    epoch: String, boot: String, artifact: String,
    authenticationReference: String? = nil
) -> [String: Any] {
    var payload: [String: Any] = [
        "challenge_reference_digest_candidate": challenge,
        "terminal_state": terminalState,
        "terminal_reference_digest_candidate": IntegratedRehearsalRecordFactory.digest(
            domain: "farmos.day150-c2b-challenge-terminalization.v1",
            value: [
                "challenge": challenge, "session": session, "state": terminalState,
                "reason": reason, "observed_at": observation.osUTC,
                "companion_artifact_reference_digest": artifact,
                "authentication_reference_digest":
                    (authenticationReference as Any?) ?? NSNull(),
            ]
        ),
        "observed_at_candidate": observation.osUTC,
        "native_ceremony_session_reference_digest_candidate": session,
    ]
    payload.merge(freshness(
        priorFloor: priorFloor, observation: observation, epoch: epoch, boot: boot
    )) { _, new in new }
    return payload
}

private func runResumedReadback(name: String) -> Never {
    guard let run = IntegratedDisposableRun.reopen(name: name),
          let ledger = try? DisposableAPFSLedger(
            openQualificationRunDirectoryAt: run.parentFD, name: run.runName
          ), let head = try? ledger.trustedQualificationReadback(),
          head.records == 5, head.generation == 4,
          let record0 = ledger.trustedQualificationRecord(generation: 0),
          let record1 = ledger.trustedQualificationRecord(generation: 1),
          record0.recordDigest == preservedGen0Digest,
          record1.recordDigest == preservedGen1Digest,
          let record4 = ledger.trustedQualificationRecord(generation: 4),
          let status = projection(record4),
          status["challenge_candidate_state"] as? String != "OUTSTANDING_CANDIDATE",
          (status["capability_generation_candidate"] as? NSNumber)?.uint64Value == 0
    else { fail(.replay) }
    print("restart_replay=TRUSTED_DISPOSABLE_READBACK_PASS")
    print("preserved_gen0=PASS preserved_gen1=PASS reconstructed_generation=4")
    print("one_global_provenance_chain=PASS")
    exit(EXIT_SUCCESS)
}

private func inspectPreservedRun() -> Never {
    let reconciled = IntegratedDisposableRun.reopen(name: preservedRunName)
    print("global_reconciliation=\(reconciled == nil ? "REJECTED" : "PASS")")
    let parent = open(
        DisposableStoragePolicy.preferredRoot,
        O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC
    )
    guard parent >= 0 else { fail(.storage) }
    defer { close(parent) }
    guard let ledger = try? DisposableAPFSLedger(
        openQualificationRunDirectoryAt: parent, name: preservedRunName
    ) else { fail(.storage) }
    do {
        let head = try ledger.trustedQualificationReadback()
        print("trusted_readback=PASS records=\(head.records) generation=\(String(describing: head.generation))")
        print("head_digest=\(head.digest ?? "null")")
        for generation in 0..<head.records {
            guard let record = ledger.trustedQualificationRecord(generation: generation)
            else { fail(.replay) }
            print("generation_\(generation)=\(record.recordDigest) event=\(record.eventKind)")
        }
        if let generation = head.generation,
           let record = ledger.trustedQualificationRecord(generation: generation),
           let state = projection(record),
           let floor = state["monotonic_floor_timestamp_candidate"] as? String,
           let boot = state["boot_session_reference_digest_candidate"] as? String,
           let current = NativeTrustedClockObserver.observe(
                installationProfileDigest: installationProfile
           ) {
            let decision = NativeTrustedClockPolicy.validatePostGenesisCandidate(
                durableFloor: floor, priorContinuousUpperNanoseconds: 0,
                expectedBootSessionReferenceDigest: boot, candidate: current
            )
            print("current_boot_matches=\(current.bootSessionReferenceDigest == boot ? 1 : 0)")
            print("resume_clock_decision=\(String(describing: decision))")
        }
        exit(EXIT_SUCCESS)
    } catch {
        print("trusted_readback=REJECTED error=\(String(describing: error))")
        exit(EXIT_FAILURE)
    }
}

private func runResume(expectedFinalSignedArtifactReferenceDigest: String) async -> Never {
    guard FarmOSCanonicalDigest.isDigest(expectedFinalSignedArtifactReferenceDigest),
          let identity = NativeIntegratedAuthentication.finalizedCompanionIdentity(),
          identity.artifactReferenceDigest == expectedFinalSignedArtifactReferenceDigest,
          let run = IntegratedDisposableRun.reopen(name: preservedRunName),
          let ledger = try? DisposableAPFSLedger(
            openQualificationRunDirectoryAt: run.parentFD, name: run.runName
          ), let head = try? ledger.trustedQualificationReadback(),
          head.generation == 1, head.records == 2, head.digest == preservedGen1Digest,
          ledger.explicitlyReconcileQualificationHead(
            expectedGeneration: 1, expectedDigest: preservedGen1Digest
          ), let gen0 = ledger.trustedQualificationRecord(generation: 0),
          let gen1 = ledger.trustedQualificationRecord(generation: 1),
          gen0.recordDigest == preservedGen0Digest,
          gen1.recordDigest == preservedGen1Digest,
          gen1.previousGeneration == 0,
          gen1.previousRecordDigest == preservedGen0Digest,
          gen1.eventKind == "CHALLENGE_ISSUANCE_CANDIDATE",
          let bindings = sourceBindings(gen1),
          let gen0State = projection(gen0), let gen1State = projection(gen1),
          gen1State["challenge_candidate_state"] as? String == "OUTSTANDING_CANDIDATE",
          gen1State["challenge_freshness_basis"] as? String ==
            "ACTIVE_TRUSTED_CLOCK_CANDIDATE",
          gen1State["capability_candidate_state"] as? String == "CONSUMED_CANDIDATE",
          gen1State["quarantine_candidate_state"] as? String ==
            "NOT_QUARANTINED_CANDIDATE",
          let gen0Boot = gen0State["boot_session_reference_digest_candidate"] as? String,
          let gen1Boot = gen1State["boot_session_reference_digest_candidate"] as? String,
          gen0Boot == gen1Boot,
          let oldEpoch = gen1State["epoch_reference_digest_candidate"] as? String,
          let oldChallenge = gen1State["challenge_reference_digest_candidate"] as? String,
          let oldSession = gen1State[
            "challenge_native_session_reference_digest_candidate"] as? String,
          let durableFloor = gen1State["monotonic_floor_timestamp_candidate"] as? String,
          let current = NativeTrustedClockObserver.observe(
            installationProfileDigest: installationProfile
          ), NativeTrustedClockPolicy.validateGenesisCandidate(current) == .accepted
    else {
        print("BLOCKED_CLOCK_PROVENANCE_EVIDENCE_MISMATCH")
        exit(EXIT_FAILURE)
    }
    guard current.bootSessionReferenceDigest != gen1Boot else {
        print("classification=NO_BOOT_SESSION_CHANGE")
        exit(EXIT_FAILURE)
    }

    print("CONFIRMED_BOOT_SESSION_CHANGE")
    print("generation=1 head_digest=\(preservedGen1Digest)")
    print("old_epoch_reference_digest=\(oldEpoch)")
    print("durable_floor=\(durableFloor)")
    print("stored_boot_session_reference_digest=\(gen1Boot)")
    print("current_boot_session_reference_digest=\(current.bootSessionReferenceDigest)")
    print("current_os_utc=\(current.osUTC)")
    print("current_continuous_bracket_reference_digest=\(current.continuousBracketReferenceDigest)")
    print("complete_gen0_to_gen1_replay=PASS")
    guard CrossEpochChallengeRecoveryPolicy.confirmedBootSessionChange(
        historicalBootSessionReference: gen1Boot, currentObservation: current
    ), let recoverySecret = NativeOneShotSecret(),
          let recoverySession = recoverySecret.bind(
            domain: "farmos.day150-c2b-cross-epoch-recovery-session.v1",
            exactBinding: [
                "generation": 1, "head_digest": preservedGen1Digest,
                "old_epoch_reference_digest": oldEpoch,
                "old_boot_session_reference_digest": gen1Boot,
                "current_boot_session_reference_digest": current.bootSessionReferenceDigest,
                "os_utc_observation_reference_digest": current.observationReferenceDigest,
                "continuous_time_bracket_reference_digest":
                    current.continuousBracketReferenceDigest,
                "amendment_digest": CrossEpochChallengeRecoveryPolicy.amendmentDigest,
            ]
          )
    else { fail(.clock) }
    let recoveryFreshness = IntegratedRehearsalRecordFactory.digest(
        domain: "farmos.day150-c2b-cross-epoch-recovery-freshness.v1",
        value: [
            "recovery_session_reference_digest": recoverySession,
            "current_boot_session_reference_digest": current.bootSessionReferenceDigest,
            "os_utc_observation_reference_digest": current.observationReferenceDigest,
            "continuous_time_bracket_reference_digest":
                current.continuousBracketReferenceDigest,
            "expected_head_digest": preservedGen1Digest,
        ]
    )
    let binding: [String: Any] = [
        "amendment_authority": CrossEpochChallengeRecoveryPolicy.authority,
        "amendment_revision": NSNumber(value: CrossEpochChallengeRecoveryPolicy.revision),
        "amendment_digest": CrossEpochChallengeRecoveryPolicy.amendmentDigest,
        "expected_head_generation": 1, "expected_head_digest": preservedGen1Digest,
        "old_epoch_reference_digest_candidate": oldEpoch,
        "old_boot_session_reference_digest_candidate": gen1Boot,
        "current_boot_session_reference_digest_candidate": current.bootSessionReferenceDigest,
        "recovery_session_reference_digest_candidate": recoverySession,
        "recovery_freshness_reference_digest_candidate": recoveryFreshness,
        "terminal_reason": CrossEpochChallengeRecoveryPolicy.terminalReason,
    ]
    let payload: [String: Any] = [
        "challenge_reference_digest_candidate": oldChallenge,
        "terminal_state": CrossEpochChallengeRecoveryPolicy.terminalState,
        "terminal_reference_digest_candidate": IntegratedRehearsalRecordFactory.digest(
            domain: "farmos.day150-c2b-cross-epoch-challenge-terminal.v1",
            value: binding.merging([
                "challenge_reference_digest": oldChallenge,
                "native_ceremony_session_reference_digest": oldSession,
            ]) { _, new in new }
        ),
        "observed_at_candidate": NSNull(),
        "native_ceremony_session_reference_digest_candidate": oldSession,
        "cross_epoch_recovery_binding_candidate": binding,
        "freshness_basis": "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
        "clock_epoch_reference_digest_candidate": NSNull(),
        "prior_monotonic_floor_timestamp_candidate": NSNull(),
        "proposed_monotonic_floor_timestamp_candidate": NSNull(),
        "os_utc_observation_reference_digest_candidate": NSNull(),
        "continuous_time_bracket_reference_digest_candidate": NSNull(),
        "boot_session_reference_digest_candidate": NSNull(),
        "native_recovery_session_reference_digest_candidate": recoverySession,
        "clock_comparison_policy_revision": 1,
    ]
    var gen2State = gen1State
    gen2State["challenge_candidate_state"] = CrossEpochChallengeRecoveryPolicy.terminalState
    guard let gen2 = nextRecord(
        previous: gen1, eventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        payload: payload, projection: gen2State, bindings: bindings
    ), recoverySecret.consume(exactReference: recoverySession)
    else { fail(.record) }
    let publication = ledger.publish(
        bytes: gen2.canonicalBytes, expectedGeneration: 1,
        expectedHeadDigest: preservedGen1Digest
    )
    guard publication == .committed else {
        if publication == .outcomeUnknown { fail(.outcomeUnknown) }
        fail(.publication)
    }
    guard let readback = try? ledger.trustedQualificationReadback(),
          readback.records == 3, readback.generation == 2,
          readback.digest == gen2.recordDigest,
          ledger.trustedQualificationRecord(generation: 0)?.recordDigest == preservedGen0Digest,
          ledger.trustedQualificationRecord(generation: 1)?.recordDigest == preservedGen1Digest,
          ledger.trustedQualificationRecord(generation: 2)?.recordDigest == gen2.recordDigest
    else { fail(.outcomeUnknown) }
    print("CROSS_EPOCH_CHALLENGE_TERMINALIZATION=PASS")
    print("generation=2 state=\(CrossEpochChallengeRecoveryPolicy.terminalState)")
    print("head_digest=\(gen2.recordDigest)")
    print("ordinary_trusted_floor_advanced=0 old_challenge_consumable=0")
    print("REVISE_DAY150_C2B_EPOCH_RECOVERY_CAPABILITY_CONTRACT")
    print("recovery_challenge_issued=0 authentication_ui_launched=0 automatic_retry=0")
    exit(EXIT_FAILURE)
}

private func runGen2Recovery(expectedFinalSignedArtifactReferenceDigest: String) async -> Never {
    guard FarmOSCanonicalDigest.isDigest(expectedFinalSignedArtifactReferenceDigest),
          let identity = NativeIntegratedAuthentication.finalizedCompanionIdentity(),
          identity.artifactReferenceDigest == expectedFinalSignedArtifactReferenceDigest,
          let run = IntegratedDisposableRun.reopen(name: preservedRunName),
          let ledger = try? DisposableAPFSLedger(
            openQualificationRunDirectoryAt: run.parentFD, name: run.runName),
          let head = try? ledger.trustedQualificationReadback(),
          head.records == 3, head.generation == 2, head.digest == preservedGen2Digest,
          ledger.explicitlyReconcileQualificationHead(
            expectedGeneration: 2, expectedDigest: preservedGen2Digest),
          let gen0 = ledger.trustedQualificationRecord(generation: 0),
          let gen1 = ledger.trustedQualificationRecord(generation: 1),
          let gen2 = ledger.trustedQualificationRecord(generation: 2),
          gen0.recordDigest == preservedGen0Digest, gen1.recordDigest == preservedGen1Digest,
          gen2.recordDigest == preservedGen2Digest,
          gen2.eventKind == "CHALLENGE_TERMINALIZATION_CANDIDATE",
          let gen2Payload = eventPayload(gen2), let gen2State = projection(gen2),
          let condition = gen2Payload["cross_epoch_recovery_binding_candidate"] as? [String: Any],
          CrossEpochChallengeRecoveryPolicy.bindingIsStructurallyValid(condition),
          gen2State["challenge_candidate_state"] as? String ==
            CrossEpochChallengeRecoveryPolicy.terminalState,
          gen2State["publication_outcome_candidate"] as? String == "KNOWN_SOURCE_CANDIDATE",
          gen2State["quarantine_candidate_state"] as? String == "NOT_QUARANTINED_CANDIDATE",
          let bindings = sourceBindings(gen2),
          let actor = gen2State["actor_reference_digest_candidate"] as? String,
          let oldEpoch = gen2State["epoch_reference_digest_candidate"] as? String,
          let oldBoot = gen2State["boot_session_reference_digest_candidate"] as? String,
          let oldChallenge = condition[
            "old_epoch_reference_digest_candidate"] as? String,
          oldChallenge == oldEpoch,
          let historicalChallenge = gen2Payload[
            "challenge_reference_digest_candidate"] as? String,
          let historicalSession = gen2Payload[
            "native_ceremony_session_reference_digest_candidate"] as? String,
          let terminalReference = gen2Payload[
            "terminal_reference_digest_candidate"] as? String,
          let currentBoot = condition[
            "current_boot_session_reference_digest_candidate"] as? String,
          currentBoot != oldBoot,
          let current = NativeTrustedClockObserver.observe(
            installationProfileDigest: installationProfile),
          NativeTrustedClockPolicy.validateGenesisCandidate(current) == .accepted,
          current.bootSessionReferenceDigest == currentBoot,
          let recoverySessionSecret = NativeOneShotSecret(),
          let recoverySession = recoverySessionSecret.bind(
            domain: "farmos.day150-c2b-boot-session-recovery-session.v1",
            exactBinding: [
                "generation": 2, "head_digest": preservedGen2Digest,
                "gen2_terminal_reference_digest": terminalReference,
                "old_epoch_reference_digest": oldEpoch,
                "old_boot_session_reference_digest": oldBoot,
                "current_boot_session_reference_digest": currentBoot,
                "os_utc_observation_reference_digest": current.observationReferenceDigest,
                "continuous_time_bracket_reference_digest":
                    current.continuousBracketReferenceDigest,
                "purpose": BootSessionRecoveryCapabilityPolicy.purpose,
                "policy_digest": BootSessionRecoveryCapabilityPolicy.amendmentDigest,
            ]),
          recoverySession != condition["recovery_session_reference_digest_candidate"] as? String
    else {
        print("RECOVERY_CAPABILITY_ELIGIBILITY=REJECTED")
        fail(.replay)
    }

    func append(_ record: DisposableRuntimeRecord, after previous: DisposableRuntimeRecord) {
        let result = ledger.publish(
            bytes: record.canonicalBytes, expectedGeneration: previous.generation,
            expectedHeadDigest: previous.recordDigest)
        if result == .outcomeUnknown { fail(.outcomeUnknown) }
        guard result == .committed,
              let readback = try? ledger.trustedQualificationReadback(),
              readback.records == Int(record.generation + 1),
              readback.generation == record.generation,
              readback.digest == record.recordDigest,
              ledger.trustedQualificationRecord(generation: 0)?.recordDigest ==
                preservedGen0Digest,
              ledger.trustedQualificationRecord(generation: 1)?.recordDigest ==
                preservedGen1Digest,
              ledger.trustedQualificationRecord(generation: 2)?.recordDigest ==
                preservedGen2Digest,
              ledger.trustedQualificationRecord(generation: record.generation)?.recordDigest ==
                record.recordDigest
        else { fail(.publication) }
    }

    let recoveryFreshness = IntegratedRehearsalRecordFactory.digest(
        domain: "farmos.day150-c2b-boot-session-recovery-freshness.v1",
        value: [
            "recovery_session_reference_digest": recoverySession,
            "expected_head_digest": preservedGen2Digest,
            "current_boot_session_reference_digest": currentBoot,
            "os_utc_observation_reference_digest": current.observationReferenceDigest,
            "continuous_time_bracket_reference_digest":
                current.continuousBracketReferenceDigest,
            "recovery_policy_revision": 1,
        ])
    let recoveryChallenge = IntegratedRehearsalRecordFactory.digest(
        domain: "farmos.day150-c2b-recovery-challenge.v1",
        value: [
            "session": recoverySession, "head": preservedGen2Digest,
            "purpose": BootSessionRecoveryCapabilityPolicy.purpose,
            "freshness": recoveryFreshness,
        ])
    func recoveryBinding(
        stage: String, head: DisposableRuntimeRecord,
        challengeTerminal: Any = NSNull(), capability: Any = NSNull()
    ) -> [String: Any] {
        [
            "amendment_authority": BootSessionRecoveryCapabilityPolicy.authority,
            "amendment_revision": 1,
            "amendment_digest": BootSessionRecoveryCapabilityPolicy.amendmentDigest,
            "recovery_stage": stage,
            "expected_head_generation": NSNumber(value: head.generation),
            "expected_head_digest": head.recordDigest,
            "gen2_record_digest_candidate": preservedGen2Digest,
            "gen2_terminal_reference_digest_candidate": terminalReference,
            "historical_challenge_reference_digest_candidate": historicalChallenge,
            "historical_session_reference_digest_candidate": historicalSession,
            "old_epoch_reference_digest_candidate": oldEpoch,
            "old_boot_session_reference_digest_candidate": oldBoot,
            "current_boot_session_reference_digest_candidate": currentBoot,
            "recovery_purpose": BootSessionRecoveryCapabilityPolicy.purpose,
            "recovery_policy_revision": 1,
            "recovery_challenge_reference_digest_candidate": recoveryChallenge,
            "recovery_challenge_terminal_reference_digest_candidate": challengeTerminal,
            "recovery_capability_reference_digest_candidate": capability,
            "recovery_session_reference_digest_candidate": recoverySession,
            "recovery_freshness_reference_digest_candidate": recoveryFreshness,
        ]
    }
    let recoveryMutationFreshness: [String: Any] = [
        "freshness_basis": "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
        "clock_epoch_reference_digest_candidate": NSNull(),
        "prior_monotonic_floor_timestamp_candidate": NSNull(),
        "proposed_monotonic_floor_timestamp_candidate": NSNull(),
        "os_utc_observation_reference_digest_candidate": NSNull(),
        "continuous_time_bracket_reference_digest_candidate": NSNull(),
        "boot_session_reference_digest_candidate": NSNull(),
        "native_recovery_session_reference_digest_candidate": recoverySession,
        "clock_comparison_policy_revision": 1,
    ]
    var challengePayload: [String: Any] = [
        "challenge_reference_digest_candidate": recoveryChallenge,
        "actor_reference_digest_candidate": actor,
        "native_ceremony_session_reference_digest_candidate": recoverySession,
        "expires_at_candidate": NSNull(), "issued_at_candidate": NSNull(),
        "scope": IntegratedRehearsalRecordFactory.purpose,
        "boot_session_recovery_binding_candidate": recoveryBinding(
            stage: "RECOVERY_CHALLENGE_ISSUANCE_CANDIDATE", head: gen2),
    ]
    challengePayload.merge(recoveryMutationFreshness) { _, new in new }
    var gen3State = gen2State
    gen3State["challenge_candidate_state"] = "OUTSTANDING_CANDIDATE"
    gen3State["challenge_reference_digest_candidate"] = recoveryChallenge
    gen3State["challenge_native_session_reference_digest_candidate"] = recoverySession
    gen3State["challenge_expires_at_candidate"] = NSNull()
    gen3State["challenge_freshness_basis"] = "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE"
    guard let gen3 = nextRecord(
        previous: gen2, eventKind: "CHALLENGE_ISSUANCE_CANDIDATE",
        payload: challengePayload, projection: gen3State, bindings: bindings),
          DisposableRecordValidator.transitionIsValid(previous: gen2, current: gen3)
    else { fail(.record) }
    append(gen3, after: gen2)

    let recoveryChallengeTerminal = IntegratedRehearsalRecordFactory.digest(
        domain: "farmos.day150-c2b-recovery-challenge-terminal.v1",
        value: ["challenge": recoveryChallenge, "session": recoverySession,
                "head": gen3.recordDigest, "decision": "APPROVE"])
    var recoveryTerminalPayload: [String: Any] = [
        "challenge_reference_digest_candidate": recoveryChallenge,
        "terminal_state": "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
        "terminal_reference_digest_candidate": recoveryChallengeTerminal,
        "observed_at_candidate": NSNull(),
        "native_ceremony_session_reference_digest_candidate": recoverySession,
        "boot_session_recovery_binding_candidate": recoveryBinding(
            stage: "RECOVERY_CHALLENGE_TERMINALIZATION_CANDIDATE", head: gen3,
            challengeTerminal: recoveryChallengeTerminal),
    ]
    recoveryTerminalPayload.merge(recoveryMutationFreshness) { _, new in new }
    var gen4State = gen3State
    gen4State["challenge_candidate_state"] = "CONSUMED_APPROVAL_SUCCESS_CANDIDATE"
    guard let gen4 = nextRecord(
        previous: gen3, eventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        payload: recoveryTerminalPayload, projection: gen4State, bindings: bindings),
          DisposableRecordValidator.transitionIsValid(previous: gen3, current: gen4),
          recoverySessionSecret.consume(exactReference: recoverySession),
          let recoveryCapabilitySecret = NativeOneShotSecret(),
          let recoveryCapability = recoveryCapabilitySecret.bind(
            domain: "farmos.day150-c2b-recovery-capability.v1",
            exactBinding: [
                "challenge": recoveryChallenge, "terminal": recoveryChallengeTerminal,
                "session": recoverySession, "head": gen4.recordDigest,
                "old_epoch": oldEpoch, "current_boot": currentBoot,
                "purpose": BootSessionRecoveryCapabilityPolicy.purpose,
                "one_shot": true,
            ])
    else { fail(.record) }
    append(gen4, after: gen3)

    var capabilityPayload: [String: Any] = [
        "capability_reference_digest_candidate": recoveryCapability,
        "actor_reference_digest_candidate": actor,
        "challenge_reference_digest_candidate": recoveryChallenge,
        "native_ceremony_session_reference_digest_candidate": recoverySession,
        "capability_generation": 1,
        "previous_capability_or_revocation_reference_digest_candidate":
            gen4State["capability_lineage_head_reference_digest_candidate"]!,
        "expires_at_candidate": NSNull(), "issued_at_candidate": NSNull(),
        "scope": IntegratedRehearsalRecordFactory.purpose, "one_shot": true,
        "boot_session_recovery_binding_candidate": recoveryBinding(
            stage: "RECOVERY_CAPABILITY_ISSUANCE_CANDIDATE", head: gen4,
            challengeTerminal: recoveryChallengeTerminal, capability: recoveryCapability),
    ]
    capabilityPayload.merge(recoveryMutationFreshness) { _, new in new }
    var gen5State = gen4State
    gen5State["capability_candidate_state"] = "AVAILABLE_CANDIDATE"
    gen5State["capability_reference_digest_candidate"] = recoveryCapability
    gen5State["capability_generation_candidate"] = 1
    gen5State["capability_expires_at_candidate"] = NSNull()
    gen5State["capability_freshness_basis"] = "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE"
    gen5State["capability_lineage_head_reference_digest_candidate"] = recoveryCapability
    guard let gen5 = nextRecord(
        previous: gen4, eventKind: "CAPABILITY_ISSUANCE_CANDIDATE",
        payload: capabilityPayload, projection: gen5State, bindings: bindings),
          DisposableRecordValidator.transitionIsValid(previous: gen4, current: gen5)
    else { fail(.record) }
    append(gen5, after: gen4)

    let newEpoch = IntegratedRehearsalRecordFactory.digest(
        domain: "farmos.day150-c2b-clock-epoch-supersession.v1",
        value: [
            "superseded_epoch": oldEpoch, "current_boot": currentBoot,
            "recovery_challenge": recoveryChallenge,
            "recovery_capability": recoveryCapability,
            "recovery_session": recoverySession, "head": gen5.recordDigest,
            "os_observation": current.observationReferenceDigest,
            "continuous_bracket": current.continuousBracketReferenceDigest,
            "clock_policy_revision": 1,
        ])
    let affectedPolicy = IntegratedRehearsalRecordFactory.digest(
        domain: "farmos.day150-c2b-superseded-epoch-affected-record-policy.v1",
        value: ["old_epoch": oldEpoch, "through_generation": 5,
                "gen2_condition": preservedGen2Digest])
    let supersessionPayload: [String: Any] = [
        "previous_epoch_reference_digest_candidate": oldEpoch,
        "proposed_new_epoch_reference_digest_candidate": newEpoch,
        "recovery_actor_reference_digest_candidate": actor,
        "recovery_capability_reference_digest_candidate": recoveryCapability,
        "proposed_corrected_genesis_timestamp_candidate": current.osUTC,
        "proposed_new_floor_timestamp_candidate": current.osUTC,
        "affected_record_policy_reference_digest_candidate": affectedPolicy,
        "os_utc_observation_reference_digest_candidate": current.observationReferenceDigest,
        "continuous_time_bracket_reference_digest_candidate":
            current.continuousBracketReferenceDigest,
        "boot_session_reference_digest_candidate": currentBoot,
    ]
    var gen6State = gen5State
    gen6State["epoch_reference_digest_candidate"] = newEpoch
    gen6State["monotonic_floor_timestamp_candidate"] = current.osUTC
    gen6State["boot_session_reference_digest_candidate"] = currentBoot
    gen6State["capability_candidate_state"] = "CONSUMED_CANDIDATE"
    gen6State["quarantine_candidate_state"] = "NOT_QUARANTINED_CANDIDATE"
    guard let gen6 = nextRecord(
        previous: gen5, eventKind: "CLOCK_EPOCH_SUPERSESSION_CANDIDATE",
        payload: supersessionPayload, projection: gen6State, bindings: bindings),
          DisposableRecordValidator.transitionIsValid(previous: gen5, current: gen6),
          recoveryCapabilitySecret.consume(exactReference: recoveryCapability)
    else { fail(.record) }
    append(gen6, after: gen5)
    print("BOOT_SESSION_RECOVERY_AND_EPOCH_SUPERSESSION=PASS")
    print("generation=6 head_digest=\(gen6.recordDigest) new_epoch=\(newEpoch)")

    guard let issuance = observation(after: current),
          let challengeExpiry = PostGen0InteractiveAuthTimingPolicy.challengeDeadline(
            issuance: issuance, durableFloor: current.osUTC,
            priorContinuousUpperNanoseconds: current.continuousUpperNanoseconds,
            expectedBootSessionReferenceDigest: currentBoot),
          let authSessionSecret = NativeOneShotSecret(),
          let authSession = authSessionSecret.bind(
            domain: "farmos.day150-c2b-post-gen0-auth-session.v1",
            exactBinding: ["head": gen6.recordDigest, "epoch": newEpoch,
                           "boot": currentBoot, "actor": actor,
                           "timing_policy": PostGen0InteractiveAuthTimingPolicy.authority]),
          let authChallengeSecret = NativeOneShotSecret(),
          let authChallenge = authChallengeSecret.bind(
            domain: "farmos.day150-c2b-post-gen0-auth-challenge.v1",
            exactBinding: ["session": authSession, "head": gen6.recordDigest,
                           "issued_at": issuance.osUTC, "expires_at": challengeExpiry,
                           "artifact": expectedFinalSignedArtifactReferenceDigest])
    else { fail(.clock) }
    var authChallengePayload: [String: Any] = [
        "challenge_reference_digest_candidate": authChallenge,
        "actor_reference_digest_candidate": actor,
        "native_ceremony_session_reference_digest_candidate": authSession,
        "expires_at_candidate": challengeExpiry, "issued_at_candidate": issuance.osUTC,
        "scope": IntegratedRehearsalRecordFactory.purpose,
    ]
    authChallengePayload.merge(freshness(
        priorFloor: current.osUTC, observation: issuance, epoch: newEpoch, boot: currentBoot
    )) { _, new in new }
    var gen7State = gen6State
    gen7State["challenge_candidate_state"] = "OUTSTANDING_CANDIDATE"
    gen7State["challenge_reference_digest_candidate"] = authChallenge
    gen7State["challenge_native_session_reference_digest_candidate"] = authSession
    gen7State["challenge_expires_at_candidate"] = challengeExpiry
    gen7State["challenge_freshness_basis"] = "ACTIVE_TRUSTED_CLOCK_CANDIDATE"
    gen7State["monotonic_floor_timestamp_candidate"] = issuance.osUTC
    guard let gen7 = nextRecord(
        previous: gen6, eventKind: "CHALLENGE_ISSUANCE_CANDIDATE",
        payload: authChallengePayload, projection: gen7State, bindings: bindings),
          DisposableRecordValidator.transitionIsValid(previous: gen6, current: gen7)
    else { fail(.record) }
    append(gen7, after: gen6)

    var evaluation: PostGen0InteractiveAuthEvaluation?
    let authResult = await NativeIntegratedAuthentication.authenticate(
        installationProfileDigest: installationProfile,
        challengeReferenceDigest: authChallenge,
        ceremonySessionReferenceDigest: authSession,
        expectedFinalSignedArtifactReferenceDigest: expectedFinalSignedArtifactReferenceDigest
    ) {
        guard let start = observation(after: issuance),
              let begun = PostGen0InteractiveAuthTimingPolicy.beginEvaluation(
                issuance: issuance, challengeExpiry: challengeExpiry, start: start,
                exactBindingValid: true, applicationForegroundConfirmed: true),
              let wait = secondsUntil(begun.effectiveDeadline), wait > 0
        else { return nil }
        evaluation = begun
        return min(wait, PostGen0InteractiveAuthTimingPolicy.evaluationMaximumSeconds)
    }
    guard let resultObservation = observation(after: issuance) else { fail(.clock) }
    let terminalState: String
    let reason: String
    var authenticationReference: String?
    switch authResult {
    case let .authenticated(authenticatedActor, reference):
        guard authenticatedActor == actor, let evaluation,
              PostGen0InteractiveAuthTimingPolicy.consumeResult(
                evaluation: evaluation, result: resultObservation,
                exactBindingValid: true) == .acceptable
        else { terminalState = "ABANDONED_CANDIDATE"; reason = "AUTH_RESULT_REJECTED"; break }
        terminalState = "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE"
        reason = "FRESH_AUTHENTICATION_ACCEPTED"
        authenticationReference = reference
    case .cancelled:
        terminalState = "ABANDONED_CANDIDATE"; reason = "AUTHENTICATION_CANCELLED"
    case .timedOut:
        terminalState = "ABANDONED_CANDIDATE"; reason = "AUTHENTICATION_EVALUATION_TIMEOUT"
    case .rejected:
        terminalState = "ABANDONED_CANDIDATE"; reason = "AUTHENTICATION_REJECTED"
    case .malformed:
        terminalState = "ABANDONED_CANDIDATE"; reason = "AUTHENTICATION_UNAVAILABLE_OR_MALFORMED"
    }
    let authTerminalPayload = terminalPayload(
        challenge: authChallenge, session: authSession, terminalState: terminalState,
        reason: reason, priorFloor: issuance.osUTC, observation: resultObservation,
        epoch: newEpoch, boot: currentBoot,
        artifact: expectedFinalSignedArtifactReferenceDigest,
        authenticationReference: authenticationReference)
    var gen8State = gen7State
    gen8State["challenge_candidate_state"] = terminalState
    gen8State["monotonic_floor_timestamp_candidate"] = resultObservation.osUTC
    guard let gen8 = nextRecord(
        previous: gen7, eventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        payload: authTerminalPayload, projection: gen8State, bindings: bindings),
          DisposableRecordValidator.transitionIsValid(previous: gen7, current: gen8),
          authSessionSecret.consume(exactReference: authSession),
          authChallengeSecret.consume(exactReference: authChallenge)
    else { fail(.record) }
    append(gen8, after: gen7)
    print("fresh_auth_attempts=1 automatic_retry=0 terminal_state=\(terminalState)")
    if terminalState == "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE" {
        print("DAY150_POST_GEN0_CAPABILITY_TTL_AUTHORITY_REQUIRED")
    } else {
        print("classification=BLOCKED_DAY150_C2B_INTEGRATED_REHEARSAL")
        print("sanitized_reason=\(reason)")
    }
    exit(EXIT_FAILURE)
}
private func runRestartReadback(name: String) -> Never {
    guard let run = IntegratedDisposableRun.reopen(name: name),
          let ledger = try? DisposableAPFSLedger(
            openQualificationRunDirectoryAt: run.parentFD, name: run.runName
          ),
          let head = try? ledger.trustedQualificationReadback(),
          head.records == 5, head.generation == 4,
          let canonical = head.projectionInvariantCanonical,
          let status = (try? JSONSerialization.jsonObject(with: Data(canonical.utf8))) as? [String: Any],
          status["actor_candidate_state"] as? String == "ESTABLISHMENT_CANDIDATE_PRESENT",
          status["clock_candidate_state"] as? String == "ESTABLISHMENT_CANDIDATE_PRESENT",
          status["challenge_candidate_state"] as? String ==
            "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
          status["capability_candidate_state"] as? String == "CONSUMED_CANDIDATE",
          (status["capability_generation_candidate"] as? NSNumber)?.uint64Value == 1
    else { fail(.replay) }
    print("restart_replay=TRUSTED_DISPOSABLE_READBACK_PASS")
    print("reconstructed_records=5 reconstructed_generation=4")
    print("process_memory_authority=0 raw_identity_reconstructed=0")
    exit(EXIT_SUCCESS)
}

private func runPostGen0NormalCapability() -> Never {
    guard runCapabilityTTLMatrix(),
          let run = IntegratedDisposableRun.reopen(name: preservedRunName),
          let ledger = try? DisposableAPFSLedger(
            openQualificationRunDirectoryAt: run.parentFD, name: run.runName),
          let head = try? ledger.trustedQualificationReadback(),
          head.records == 9, head.generation == 8, head.digest == preservedGen8Digest,
          ledger.explicitlyReconcileQualificationHead(
            expectedGeneration: 8, expectedDigest: preservedGen8Digest),
          let gen0 = ledger.trustedQualificationRecord(generation: 0),
          let gen1 = ledger.trustedQualificationRecord(generation: 1),
          let gen2 = ledger.trustedQualificationRecord(generation: 2),
          let gen7 = ledger.trustedQualificationRecord(generation: 7),
          let gen8 = ledger.trustedQualificationRecord(generation: 8),
          gen0.recordDigest == preservedGen0Digest,
          gen1.recordDigest == preservedGen1Digest,
          gen2.recordDigest == preservedGen2Digest,
          gen8.recordDigest == preservedGen8Digest,
          gen7.eventKind == "CHALLENGE_ISSUANCE_CANDIDATE",
          gen8.eventKind == "CHALLENGE_TERMINALIZATION_CANDIDATE",
          let bindings = sourceBindings(gen8), let state8 = projection(gen8),
          let event8 = eventPayload(gen8),
          state8["epoch_reference_digest_candidate"] as? String == preservedActiveEpoch,
          state8["challenge_candidate_state"] as? String ==
            "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
          state8["capability_candidate_state"] as? String == "CONSUMED_CANDIDATE",
          (state8["capability_generation_candidate"] as? NSNumber)?.uint64Value == 1,
          state8["quarantine_candidate_state"] as? String ==
            "NOT_QUARANTINED_CANDIDATE",
          state8["publication_outcome_candidate"] as? String == "KNOWN_SOURCE_CANDIDATE",
          let actor = state8["actor_reference_digest_candidate"] as? String,
          let challenge = state8["challenge_reference_digest_candidate"] as? String,
          let session = state8[
            "challenge_native_session_reference_digest_candidate"] as? String,
          event8["challenge_reference_digest_candidate"] as? String == challenge,
          event8["native_ceremony_session_reference_digest_candidate"] as? String == session,
          event8["terminal_state"] as? String ==
            "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
          let boot = state8["boot_session_reference_digest_candidate"] as? String,
          let floor8 = state8["monotonic_floor_timestamp_candidate"] as? String,
          let priorLineage = state8[
            "capability_lineage_head_reference_digest_candidate"] as? String,
          let issuance = resumedObservation(durableFloor: floor8, expectedBoot: boot),
          issuance.osUTC > floor8,
          let expiry = addSeconds(
            issuance.osUTC, PostGen0NormalCapabilityTTLPolicy.lifetimeSeconds),
          let secret = NativeOneShotSecret(),
          let capabilityReference = secret.bind(
            domain: "farmos.day150-c2b-post-gen0-normal-capability.v1",
            exactBinding: [
                "authority": PostGen0NormalCapabilityTTLPolicy.authority,
                "head_generation": 8, "head_digest": preservedGen8Digest,
                "active_epoch": preservedActiveEpoch, "boot_session": boot,
                "durable_floor": floor8, "actor": actor, "challenge": challenge,
                "session": session, "purpose": PostGen0NormalCapabilityTTLPolicy.purpose,
                "scope": PostGen0NormalCapabilityTTLPolicy.scope,
                "capability_generation": 2, "issued_at": issuance.osUTC,
                "expires_at": expiry,
                "issuance_observation": issuance.observationReferenceDigest,
            ])
    else {
        print("BLOCKED_DAY150_POST_GEN0_CAPABILITY_BASELINE_MISMATCH")
        exit(EXIT_FAILURE)
    }
    let before0 = gen0.canonicalBytes, before1 = gen1.canonicalBytes, before2 = gen2.canonicalBytes
    let preIssueContext = PostGen0NormalCapabilityAuthorityContext(
        activeEpochReferenceDigest: preservedActiveEpoch,
        bootSessionReferenceDigest: boot, durableFloor: floor8,
        currentHeadGeneration: 8, currentHeadDigest: preservedGen8Digest,
        currentHeadEventKind: "CHALLENGE_TERMINALIZATION_CANDIDATE",
        actorReferenceDigest: actor, challengeReferenceDigest: challenge,
        ceremonySessionReferenceDigest: session,
        challengeState: "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
        capabilityState: "CONSUMED_CANDIDATE", capabilityGeneration: 1,
        capabilityLineageReferenceDigest: priorLineage,
        purpose: PostGen0NormalCapabilityTTLPolicy.purpose,
        scope: PostGen0NormalCapabilityTTLPolicy.scope,
        quarantineState: "NOT_QUARANTINED_CANDIDATE",
        publicationOutcome: "KNOWN_SOURCE_CANDIDATE")
    guard let proposedBinding = PostGen0NormalCapabilityTTLPolicy.issue(
        context: preIssueContext, authenticatedActorReferenceDigest: actor,
        completedChallengeReferenceDigest: challenge,
        completedCeremonySessionReferenceDigest: session,
        capabilityReferenceDigest: capabilityReference, proposedCapabilityGeneration: 2,
        issuance: issuance, priorContinuousUpperNanoseconds: 0)
    else { fail(.clock) }
    var issuancePayload: [String: Any] = [
        "capability_reference_digest_candidate": capabilityReference,
        "actor_reference_digest_candidate": actor,
        "challenge_reference_digest_candidate": challenge,
        "native_ceremony_session_reference_digest_candidate": session,
        "capability_generation": 2,
        "previous_capability_or_revocation_reference_digest_candidate": priorLineage,
        "expires_at_candidate": proposedBinding.expiresAt,
        "issued_at_candidate": proposedBinding.issuedAt,
        "scope": PostGen0NormalCapabilityTTLPolicy.scope, "one_shot": true,
    ]
    issuancePayload.merge(freshness(
        priorFloor: floor8, observation: issuance,
        epoch: preservedActiveEpoch, boot: boot)) { _, new in new }
    var state9 = state8
    state9["capability_candidate_state"] = "AVAILABLE_CANDIDATE"
    state9["capability_reference_digest_candidate"] = capabilityReference
    state9["capability_generation_candidate"] = 2
    state9["capability_expires_at_candidate"] = proposedBinding.expiresAt
    state9["capability_freshness_basis"] = "ACTIVE_TRUSTED_CLOCK_CANDIDATE"
    state9["capability_lineage_head_reference_digest_candidate"] = capabilityReference
    state9["monotonic_floor_timestamp_candidate"] = issuance.osUTC
    guard let gen9 = nextRecord(
        previous: gen8, eventKind: "CAPABILITY_ISSUANCE_CANDIDATE",
        payload: issuancePayload, projection: state9, bindings: bindings),
          DisposableRecordValidator.transitionIsValid(previous: gen8, current: gen9),
          ledger.publish(bytes: gen9.canonicalBytes, expectedGeneration: 8,
            expectedHeadDigest: preservedGen8Digest) == .committed,
          let readback9 = try? ledger.trustedQualificationReadback(),
          readback9.records == 10, readback9.generation == 9,
          readback9.digest == gen9.recordDigest,
          let durableBinding = proposedBinding.bindingDurableIssuanceRecord(
            generation: 9, digest: gen9.recordDigest),
          let consumption = strictlyLaterObservation(after: issuance)
    else { fail(.outcomeUnknown) }
    let availableContext = PostGen0NormalCapabilityAuthorityContext(
        activeEpochReferenceDigest: preservedActiveEpoch,
        bootSessionReferenceDigest: boot, durableFloor: issuance.osUTC,
        currentHeadGeneration: 9, currentHeadDigest: gen9.recordDigest,
        currentHeadEventKind: "CAPABILITY_ISSUANCE_CANDIDATE",
        actorReferenceDigest: actor, challengeReferenceDigest: challenge,
        ceremonySessionReferenceDigest: session,
        challengeState: "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE",
        capabilityState: "AVAILABLE_CANDIDATE", capabilityGeneration: 2,
        capabilityLineageReferenceDigest: capabilityReference,
        purpose: PostGen0NormalCapabilityTTLPolicy.purpose,
        scope: PostGen0NormalCapabilityTTLPolicy.scope,
        quarantineState: "NOT_QUARANTINED_CANDIDATE",
        publicationOutcome: "KNOWN_SOURCE_CANDIDATE")
    guard PostGen0NormalCapabilityTTLPolicy.consume(
        binding: durableBinding, context: availableContext,
        requestedActorReferenceDigest: actor,
        requestedChallengeReferenceDigest: challenge,
        requestedCeremonySessionReferenceDigest: session,
        requestedPurpose: PostGen0NormalCapabilityTTLPolicy.purpose,
        requestedScope: PostGen0NormalCapabilityTTLPolicy.scope,
        requestedOperation: PostGen0NormalCapabilityTTLPolicy.onlyAuthorizedOperation,
        observation: consumption) == .accepted
    else { fail(.clock) }
    let terminalReference = IntegratedRehearsalRecordFactory.digest(
        domain: "farmos.day150-c2b-normal-capability-terminalization.v1",
        value: [
            "capability": capabilityReference, "actor": actor,
            "challenge": challenge, "session": session,
            "purpose": PostGen0NormalCapabilityTTLPolicy.purpose,
            "scope": PostGen0NormalCapabilityTTLPolicy.scope,
            "issuance_record": gen9.recordDigest,
            "consumption_observation": consumption.observationReferenceDigest,
            "terminal_state": "CONSUMED_CANDIDATE",
        ])
    var terminalPayload: [String: Any] = [
        "capability_reference_digest_candidate": capabilityReference,
        "terminal_state": "CONSUMED_CANDIDATE",
        "terminal_reference_digest_candidate": terminalReference,
        "observed_at_candidate": consumption.osUTC,
        "native_ceremony_session_reference_digest_candidate": session,
    ]
    terminalPayload.merge(freshness(
        priorFloor: issuance.osUTC, observation: consumption,
        epoch: preservedActiveEpoch, boot: boot)) { _, new in new }
    var state10 = state9
    state10["capability_candidate_state"] = "CONSUMED_CANDIDATE"
    state10["monotonic_floor_timestamp_candidate"] = consumption.osUTC
    guard let gen10 = nextRecord(
        previous: gen9, eventKind: "CAPABILITY_TERMINALIZATION_CANDIDATE",
        payload: terminalPayload, projection: state10, bindings: bindings),
          DisposableRecordValidator.transitionIsValid(previous: gen9, current: gen10),
          ledger.publish(bytes: gen10.canonicalBytes, expectedGeneration: 9,
            expectedHeadDigest: gen9.recordDigest) == .committed,
          secret.consume(exactReference: capabilityReference),
          let final = try? ledger.trustedQualificationReadback(),
          final.records == 11, final.generation == 10, final.digest == gen10.recordDigest,
          ledger.trustedQualificationRecord(generation: 0)?.canonicalBytes == before0,
          ledger.trustedQualificationRecord(generation: 1)?.canonicalBytes == before1,
          ledger.trustedQualificationRecord(generation: 2)?.canonicalBytes == before2,
          let finalRecord = ledger.trustedQualificationRecord(generation: 10),
          let finalState = projection(finalRecord),
          finalState["capability_candidate_state"] as? String == "CONSUMED_CANDIDATE",
          (finalState["capability_generation_candidate"] as? NSNumber)?.uint64Value == 2,
          finalState["epoch_reference_digest_candidate"] as? String == preservedActiveEpoch,
          finalState["boot_session_reference_digest_candidate"] as? String == boot,
          finalState["publication_outcome_candidate"] as? String == "KNOWN_SOURCE_CANDIDATE"
    else { fail(.outcomeUnknown) }
    print("normal_capability_issuance=PASS generation=9 head_digest=\(gen9.recordDigest)")
    print("normal_capability_consumption=PASS generation=10 head_digest=\(gen10.recordDigest)")
    print("normal_capability_one_shot=TERMINAL replay_authority=0 automatic_retry=0")
    print("actor_binding=PASS trusted_floor_advancement=PASS historical_gen0_gen1_gen2=UNCHANGED")
    print("active_epoch=\(preservedActiveEpoch) boot_session_unchanged=1")
    print("one_global_provenance_chain=PASS canonical_gen0_created=0 b2_authorized=0 docker_operations=0")
    exit(EXIT_SUCCESS)
}

private func runPostCapabilityReadback() -> Never {
    guard let run = IntegratedDisposableRun.reopen(name: preservedRunName),
          let ledger = try? DisposableAPFSLedger(
            openQualificationRunDirectoryAt: run.parentFD, name: run.runName),
          let head = try? ledger.trustedQualificationReadback(),
          head.records == 11, head.generation == 10, let digest = head.digest,
          let record = ledger.trustedQualificationRecord(generation: 10),
          record.recordDigest == digest,
          record.eventKind == "CAPABILITY_TERMINALIZATION_CANDIDATE",
          let state = projection(record),
          state["capability_candidate_state"] as? String == "CONSUMED_CANDIDATE",
          (state["capability_generation_candidate"] as? NSNumber)?.uint64Value == 2,
          state["epoch_reference_digest_candidate"] as? String == preservedActiveEpoch,
          state["publication_outcome_candidate"] as? String == "KNOWN_SOURCE_CANDIDATE",
          state["quarantine_candidate_state"] as? String ==
            "NOT_QUARANTINED_CANDIDATE",
          ledger.trustedQualificationRecord(generation: 0)?.recordDigest == preservedGen0Digest,
          ledger.trustedQualificationRecord(generation: 1)?.recordDigest == preservedGen1Digest,
          ledger.trustedQualificationRecord(generation: 2)?.recordDigest == preservedGen2Digest,
          ledger.trustedQualificationRecord(generation: 8)?.recordDigest == preservedGen8Digest
    else { fail(.replay) }
    print("fresh_process_gen0_to_gen10_replay=PASS")
    print("generation=10 head_digest=\(digest) records=11")
    print("normal_capability_state=CONSUMED_CANDIDATE second_use=REJECT")
    print("outcome_unknown=0 quarantine=0 process_memory_authority=0")
    print("privacy_validation=PASS bounded_status_projection=PASS")
    exit(EXIT_SUCCESS)
}

private func runLive(expectedFinalSignedArtifactReferenceDigest: String) async -> Never {
    _ = expectedFinalSignedArtifactReferenceDigest
    print("classification=BLOCKED_DAY150_C2B_INTEGRATED_REHEARSAL")
    print("sanitized_reason=PRESERVED_GEN0_RESUME_REQUIRED")
    print("new_gen0_approval_required=0")
    exit(EXIT_FAILURE)
}
let arguments = CommandLine.arguments
if arguments.count == 2 && arguments[1] == "--preflight" { runPreflight() }
if arguments.count == 2 && arguments[1] == "--inspect-final-companion" {
    runFinalArtifactInspection()
}
if arguments.count == 2 && arguments[1] == "--matrix" {
    exit(runMatrix() ? EXIT_SUCCESS : EXIT_FAILURE)
}
if arguments.count == 2 && arguments[1] == "--ttl-matrix" {
    exit(runCapabilityTTLMatrix() ? EXIT_SUCCESS : EXIT_FAILURE)
}
if arguments.count == 2 && arguments[1] == "--inspect-preserved-run" {
    inspectPreservedRun()
}
if arguments.count == 2 && arguments[1] == "--resume-preserved-gen8" {
    runPostGen0NormalCapability()
}
if arguments.count == 2 && arguments[1] == "--post-capability-readback" {
    runPostCapabilityReadback()
}
if arguments.count == 3 && arguments[1] == "--restart-readback" {
    runRestartReadback(name: arguments[2])
}
if arguments.count == 3 && arguments[1] == "--resumed-readback" {
    runResumedReadback(name: arguments[2])
}
if arguments.count == 3 && arguments[1] == "--resume-preserved-gen1" {
    await runResume(expectedFinalSignedArtifactReferenceDigest: arguments[2])
}
if arguments.count == 3 && arguments[1] == "--resume-preserved-gen2" {
    await runGen2Recovery(expectedFinalSignedArtifactReferenceDigest: arguments[2])
}
if arguments.count == 3 && arguments[1] == "--live" {
    await runLive(expectedFinalSignedArtifactReferenceDigest: arguments[2])
}
fail(.invalidArguments)
