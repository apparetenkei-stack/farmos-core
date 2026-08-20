import Darwin
import Foundation

public protocol WriterPrivilegeSyscallPort: AnyObject {
    func closeUnrelatedFileDescriptors() -> Bool
    func removeSupplementaryGroups() -> Bool
    func setDedicatedGroup(_ gid: gid_t) -> Bool
    func setDedicatedUser(_ uid: uid_t) -> Bool
    func verifyRootRegainRejected() -> Bool
    func changeWorkingDirectoryToRoot() -> Bool
    func setUmask0077() -> Bool
    func installNetworkDenial() -> Bool
    func installGenericExecDenial() -> Bool
    func acceptBoundedLedgerOperation() -> Bool
}

public enum WriterPrivilegeRuntimeFailure: String, Error, Equatable, Sendable {
    case invalidIdentity = "INVALID_DEDICATED_IDENTITY"
    case closeFileDescriptors = "CLOSE_UNRELATED_FDS_FAILED"
    case supplementaryGroups = "REMOVE_SUPPLEMENTARY_GROUPS_FAILED"
    case setGroup = "SETGID_FAILED"
    case setUser = "SETUID_FAILED"
    case rootRegain = "ROOT_REGAIN_NOT_REJECTED"
    case workingDirectory = "CHDIR_ROOT_FAILED"
    case umask = "UMASK_0077_FAILED"
    case networkDenial = "NETWORK_DENIAL_FAILED"
    case execDenial = "EXEC_DENIAL_FAILED"
    case boundedOperation = "BOUNDED_OPERATION_REJECTED"
}

public enum WriterPrivilegeRuntime {
    public static func execute(
        port: WriterPrivilegeSyscallPort,
        dedicatedUID: uid_t,
        dedicatedGID: gid_t
    ) -> WriterPrivilegeRuntimeFailure? {
        guard dedicatedUID >= 200, dedicatedGID >= 200,
              dedicatedUID <= 499, dedicatedGID <= 499
        else { return .invalidIdentity }
        guard port.closeUnrelatedFileDescriptors() else { return .closeFileDescriptors }
        guard port.removeSupplementaryGroups() else { return .supplementaryGroups }
        guard port.setDedicatedGroup(dedicatedGID) else { return .setGroup }
        guard port.setDedicatedUser(dedicatedUID) else { return .setUser }
        guard port.verifyRootRegainRejected() else { return .rootRegain }
        guard port.changeWorkingDirectoryToRoot() else { return .workingDirectory }
        guard port.setUmask0077() else { return .umask }
        guard port.installNetworkDenial() else { return .networkDenial }
        guard port.installGenericExecDenial() else { return .execDenial }
        guard port.acceptBoundedLedgerOperation() else { return .boundedOperation }
        return nil
    }
}

@_silgen_name("sandbox_init")
private func farmOSSandboxInit(
    _ profile: UnsafePointer<CChar>,
    _ flags: UInt64,
    _ errorBuffer: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>?
) -> Int32

@_silgen_name("sandbox_free_error")
private func farmOSSandboxFreeError(_ errorBuffer: UnsafeMutablePointer<CChar>)

public final class DarwinWriterPrivilegeSyscallPort: WriterPrivilegeSyscallPort {
    private let retainedFileDescriptors: Set<Int32>
    private let boundedOperation: () -> Bool
    private var denialSandboxInstalled = false

    public init(retainedFileDescriptors: Set<Int32>, boundedOperation: @escaping () -> Bool) {
        self.retainedFileDescriptors = retainedFileDescriptors.union([STDIN_FILENO, STDOUT_FILENO,
                                                                      STDERR_FILENO])
        self.boundedOperation = boundedOperation
    }

    public func closeUnrelatedFileDescriptors() -> Bool {
        let maximum = getdtablesize()
        guard maximum > 0 else { return false }
        for descriptor in 0..<maximum where !retainedFileDescriptors.contains(descriptor) {
            if close(descriptor) != 0 && errno != EBADF { return false }
        }
        return true
    }

    public func removeSupplementaryGroups() -> Bool { setgroups(0, nil) == 0 }
    public func setDedicatedGroup(_ gid: gid_t) -> Bool { setgid(gid) == 0 }
    public func setDedicatedUser(_ uid: uid_t) -> Bool { setuid(uid) == 0 }
    public func verifyRootRegainRejected() -> Bool {
        errno = 0
        return setuid(0) == -1 && errno == EPERM && geteuid() != 0 && getuid() != 0
    }
    public func changeWorkingDirectoryToRoot() -> Bool { chdir("/") == 0 }
    public func setUmask0077() -> Bool { _ = umask(0o077); return true }

    private func installSandbox(_ profile: String) -> Bool {
        var errorBuffer: UnsafeMutablePointer<CChar>?
        let result = profile.withCString { farmOSSandboxInit($0, 0, &errorBuffer) }
        if let errorBuffer { farmOSSandboxFreeError(errorBuffer) }
        return result == 0
    }

    public func installNetworkDenial() -> Bool {
        guard !denialSandboxInstalled,
              installSandbox("(version 1)(allow default)(deny network*)(deny process-exec*)")
        else { return false }
        denialSandboxInstalled = true
        return true
    }
    public func installGenericExecDenial() -> Bool {
        denialSandboxInstalled
    }
    public func acceptBoundedLedgerOperation() -> Bool { boundedOperation() }
}
