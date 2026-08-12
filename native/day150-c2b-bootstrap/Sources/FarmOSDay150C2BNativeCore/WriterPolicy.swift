import Foundation

public enum WriterPrivilegeDropStep: String, CaseIterable, Sendable {
    case closeUnrelatedFileDescriptors = "CLOSE_UNRELATED_FILE_DESCRIPTORS"
    case removeSupplementaryGroups = "REMOVE_SUPPLEMENTARY_GROUPS"
    case setGroupIdentity = "SETGID_DEDICATED_WRITER"
    case setUserIdentity = "SETUID_DEDICATED_WRITER"
    case verifyRootRegainImpossible = "VERIFY_ROOT_REGAIN_IMPOSSIBLE"
    case changeWorkingDirectoryToRoot = "CHDIR_ROOT"
    case setRestrictiveUmask = "UMASK_0077"
    case installNetworkDenial = "DENY_NETWORK"
    case installExecDenial = "DENY_EXEC"
    case acceptBoundedLedgerOperation = "ACCEPT_BOUNDED_LEDGER_OPERATION"
}

public enum WriterPolicyFailure: String, Equatable, Sendable {
    case sequenceMismatch = "PRIVILEGE_DROP_SEQUENCE_MISMATCH"
    case rootRegainNotRejected = "ROOT_REGAIN_NOT_REJECTED"
    case unsupportedOperation = "UNSUPPORTED_WRITER_OPERATION"
}

public struct WriterQualificationPlan: Equatable, Sendable {
    public let steps: [WriterPrivilegeDropStep]
    public let rootRegainProbeRejected: Bool
    public let workingDirectory = "/"
    public let umask = "0077"
    public let supplementaryGroupsRetained = false
    public let networkAllowed = false
    public let execAllowed = false

    public init(steps: [WriterPrivilegeDropStep], rootRegainProbeRejected: Bool) {
        self.steps = steps
        self.rootRegainProbeRejected = rootRegainProbeRejected
    }
}

public enum NativeWriterPolicy {
    public static let requiredSequence = WriterPrivilegeDropStep.allCases
    public static let allowedOperations: Set<NativeProtocolOperation> = [
        .publishRuntimeRecord,
        .readSanitizedStatus,
    ]

    public static func validate(
        plan: WriterQualificationPlan,
        operation: NativeProtocolOperation
    ) -> WriterPolicyFailure? {
        guard plan.steps == requiredSequence else { return .sequenceMismatch }
        guard plan.rootRegainProbeRejected else { return .rootRegainNotRejected }
        guard allowedOperations.contains(operation) else { return .unsupportedOperation }
        return nil
    }

    public static let livePrivilegeDropPerformed = false
    public static let canonicalLedgerWritePerformed = false
    public static let installedWriterIdentityEstablished = false
}
