import AppKit
import CryptoKit
import Darwin
import FarmOSDay150C2BNativeCore
import LocalAuthentication
import OpenDirectory
import SystemConfiguration

@MainActor
private final class FreshAuthProbeDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    private var window: NSWindow?
    private var context: LAContext?
    private var evaluationStarted = false
    private var mode: Mode?

    private enum Mode {
        case probe
        case integrated(request: Data)
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        if CommandLine.arguments == [CommandLine.arguments[0], "--probe-only"] {
            mode = .probe
        } else if CommandLine.arguments == [CommandLine.arguments[0], "--integrated-auth"],
                  let requestLine = readLine(strippingNewline: true),
                  let request = requestLine.data(using: .utf8),
                  NativeIntegratedAuthentication.companionRequestIsValid(request),
                  NativeIntegratedAuthentication.companionRequestMatchesCurrentSignedArtifact(
                    request
                  ) {
            mode = .integrated(request: request)
        } else {
            finish("AUTH_FAILED", status: EXIT_FAILURE)
        }

        NSApp.setActivationPolicy(.regular)
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 480, height: 180),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "FarmOS Fresh Authentication Probe"
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.contentView = NSTextField(wrappingLabelWithString:
            "Qualification-only probe. Complete or cancel the macOS authentication prompt. No Gen0, challenge, capability, ledger, database, or network operation will run."
        )
        window.center()
        window.makeKeyAndOrderFront(nil)
        self.window = window
        NSApp.activate(ignoringOtherApps: true)
        NSRunningApplication.current.activate(options: [.activateAllWindows])
        DispatchQueue.main.async { [weak self] in self?.startEvaluationIfReady() }
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        startEvaluationIfReady()
    }

    private func startEvaluationIfReady() {
        guard !evaluationStarted, NSApp.isActive, window?.isVisible == true else { return }
        evaluationStarted = true
        printBounded(NativeIntegratedAuthentication.foregroundReadyMarker)

        if case let .integrated(request) = mode {
            guard let requestObject = try? JSONSerialization.jsonObject(with: request)
                    as? [String: Any],
                  let requestReference = requestObject["request_reference_digest"] as? String,
                  let command = readLine(strippingNewline: true),
                  command == NativeIntegratedAuthentication.evaluationStartMarker + " " +
                    FarmOSCanonicalDigest.sha256(
                        domain: "farmos.day150-c2b-auth-evaluation-start.v1",
                        canonicalValue: requestReference
                    )
            else { finish("AUTH_FAILED", status: EXIT_FAILURE) }
        }

        let context = LAContext()
        context.touchIDAuthenticationAllowableReuseDuration = 0
        context.localizedCancelTitle = "Cancel"
        self.context = context
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            finish("AUTH_FAILED", status: EXIT_FAILURE)
        }

        if case .probe = mode { printBounded("AUTH_EVALUATION_REQUESTED") }
        context.evaluatePolicy(
            .deviceOwnerAuthentication,
            localizedReason: "verify fresh human authentication for a disposable FarmOS qualification probe"
        ) { [weak self] success, error in
            Task { @MainActor in
                guard let self else { return }
                if success {
                    switch self.mode {
                    case .probe:
                        self.finish("AUTH_SUCCEEDED_PROBE_ONLY", status: EXIT_SUCCESS)
                    case let .integrated(request):
                        guard let response = self.acceptedResponse(request: request)
                        else { self.finish("AUTH_FAILED", status: EXIT_FAILURE) }
                        self.finish(response, status: EXIT_SUCCESS)
                    case nil:
                        self.finish("AUTH_FAILED", status: EXIT_FAILURE)
                    }
                }
                if let code = (error as? LAError)?.code,
                   code == .userCancel || code == .appCancel || code == .systemCancel {
                    self.finish("AUTH_CANCELLED", status: EXIT_FAILURE)
                }
                self.finish("AUTH_FAILED", status: EXIT_FAILURE)
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func windowWillClose(_ notification: Notification) {
        finish("AUTH_CANCELLED", status: EXIT_FAILURE)
    }

    private func printBounded(_ value: String) {
        print(value)
        fflush(stdout)
    }

    private func finish(_ value: String, status: Int32) -> Never {
        context?.invalidate()
        context = nil
        printBounded(value)
        exit(status)
    }

    private func finish(_ value: Data, status: Int32) -> Never {
        context?.invalidate()
        context = nil
        try? FileHandle.standardOutput.write(contentsOf: value)
        exit(status)
    }

    private func acceptedResponse(request bytes: Data) -> Data? {
        guard consoleActorMatchesEffectiveUID(),
              let request = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
              let installation = request["installation_profile_digest"] as? String,
              let challenge = request["challenge_reference_digest"] as? String,
              let ceremony = request["ceremony_session_reference_digest"] as? String,
              let artifact = request["companion_artifact_reference_digest"] as? String,
              let requestReference = request["request_reference_digest"] as? String,
              let generatedUID = transientGeneratedUID()
        else { return nil }
        defer { _ = generatedUID.utf8.count }
        let authentication = FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-c2b-fresh-authentication-result.v1",
            canonicalValue: try! FarmOSCanonicalDigest.canonicalJSON([
                "mechanism_revision": NativeIntegratedAuthentication.mechanismRevision,
                "interactive": true, "accepted_by_native_boundary": true,
                "challenge_reference_digest": challenge,
                "ceremony_session_reference_digest": ceremony,
                "installation_profile_digest": installation,
                "companion_artifact_reference_digest": artifact,
                "request_reference_digest": requestReference,
            ])
        )
        let candidate = ActorAuthenticationResultCandidate(
            mechanismRevision: NativeIntegratedAuthentication.mechanismRevision,
            authorizationResultReferenceDigest: authentication,
            interactive: true, acceptedByNativeBoundary: true
        )
        guard case let .structurallyValidReferenceCandidate(actor) =
            NativeActorProvenanceSource.deriveReferenceCandidate(
                authentication: candidate, generatedUIDTransient: generatedUID,
                installationProfileDigest: installation
            )
        else { return nil }
        var response: [String: Any] = [
            "schema_revision": NativeIntegratedAuthentication.companionSchema,
            "operation": NativeIntegratedAuthentication.companionOperation,
            "mechanism_revision": NativeIntegratedAuthentication.mechanismRevision,
            "status": "AUTH_SUCCEEDED_BOUND",
            "request_reference_digest": requestReference,
            "ceremony_session_reference_digest": ceremony,
            "challenge_reference_digest": challenge,
            "actor_reference_digest": actor,
            "authentication_reference_digest": authentication,
        ]
        guard let canonical = try? FarmOSCanonicalDigest.canonicalJSON(response) else { return nil }
        response["result_reference_digest"] = FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-c2b-fresh-auth-result.v1", canonicalValue: canonical
        )
        return try? JSONSerialization.data(withJSONObject: response)
    }

    private func consoleActorMatchesEffectiveUID() -> Bool {
        var uid: uid_t = 0
        var gid: gid_t = 0
        return SCDynamicStoreCopyConsoleUser(nil, &uid, &gid) != nil &&
            uid == geteuid() && uid != 0
    }

    private func transientGeneratedUID() -> String? {
        do {
            let node = try ODNode(session: ODSession.default(), type: UInt32(kODNodeTypeLocalNodes))
            let query = try ODQuery(
                node: node, forRecordTypes: kODRecordTypeUsers,
                attribute: kODAttributeTypeUniqueID, matchType: UInt32(kODMatchEqualTo),
                queryValues: String(geteuid()), returnAttributes: kODAttributeTypeGUID,
                maximumResults: 2
            )
            guard let records = try query.resultsAllowingPartial(false) as? [ODRecord],
                  records.count == 1,
                  let values = try records[0].values(forAttribute: kODAttributeTypeGUID)
                    as? [String], values.count == 1
            else { return nil }
            return values[0].uppercased()
        } catch { return nil }
    }
}

@main
@MainActor
private enum FreshAuthProbeMain {
    static func main() {
        if CommandLine.arguments.count == 3 &&
            CommandLine.arguments[1] == "--artifact-self-check" {
            let agreed = NativeIntegratedAuthentication.currentProcessSignedArtifactAgrees(
                expected: CommandLine.arguments[2]
            )
            print(agreed ? "FINAL_SIGNED_ARTIFACT_IDENTITY_AGREEMENT" :
                "INSTALLATION_OR_ARTIFACT_BINDING_MISMATCH")
            exit(agreed ? EXIT_SUCCESS : EXIT_FAILURE)
        }
        let application = NSApplication.shared
        let delegate = FreshAuthProbeDelegate()
        application.delegate = delegate
        application.run()
        withExtendedLifetime(delegate) {}
    }
}
