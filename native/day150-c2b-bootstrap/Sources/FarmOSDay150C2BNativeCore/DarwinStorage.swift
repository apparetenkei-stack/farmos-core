import Darwin
import Foundation

public enum DarwinStoragePolicy {
    public static let canonicalLedgerRoot =
        "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1"
    public static let rootMode: UInt16 = 0o700
    public static let recordMode: UInt16 = 0o600
    public static let requiredLinkCount: UInt64 = 1
    public static let directoryOpenFlags = O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC
    public static let temporaryCreateFlags = O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC
    public static let fullDurabilityCommand = F_FULLFSYNC
    public static let noReplaceRenameFlag = RENAME_EXCL
}

public enum DarwinStoragePrimitive: String, CaseIterable, Sendable {
    case verifyControlledParents = "VERIFY_CONTROLLED_PARENTS"
    case openTrustedRootNoFollow = "OPEN_TRUSTED_ROOT_DIRFD_NOFOLLOW"
    case verifyRootOwnerModeDevice = "VERIFY_ROOT_OWNER_MODE_DEVICE"
    case verifyGenesisToHead = "VERIFY_GENESIS_TO_HEAD"
    case createExclusiveTemporary = "OPENAT_EXCLUSIVE_TEMPORARY"
    case verifyTemporaryMetadata = "VERIFY_TEMP_METADATA"
    case writeBoundedCanonicalBytes = "WRITE_BOUNDED_CANONICAL_BYTES"
    case fullFileDurability = "F_FULLFSYNC_FILE"
    case atomicNoReplacePublication = "RENAMEATX_NP_RENAME_EXCL"
    case parentDirectoryDurability = "FSYNC_PARENT_DIRECTORY"
    case finalDirFDReadback = "FINAL_DIRFD_RELATIVE_REOPEN_READBACK"
    case replayGenesisToHead = "REPLAY_GENESIS_TO_HEAD"
}

public struct DarwinStorageObjectCandidate: Equatable, Sendable {
    public enum Kind: String, Sendable { case directory, regularFile, symbolicLink, other }
    public let kind: Kind
    public let ownerUID: UInt32
    public let ownerGID: UInt32
    public let mode: UInt16
    public let device: UInt64
    public let linkCount: UInt64

    public init(
        kind: Kind,
        ownerUID: UInt32,
        ownerGID: UInt32,
        mode: UInt16,
        device: UInt64,
        linkCount: UInt64
    ) {
        self.kind = kind
        self.ownerUID = ownerUID
        self.ownerGID = ownerGID
        self.mode = mode
        self.device = device
        self.linkCount = linkCount
    }
}

public enum DarwinStorageValidationFailure: String, Equatable, Sendable {
    case symbolicLink = "SYMLINK_REJECTED"
    case wrongType = "WRONG_FILE_TYPE"
    case deviceMismatch = "DEVICE_MISMATCH"
    case linkCountMismatch = "LINK_COUNT_MISMATCH"
    case ownerMismatch = "OWNER_MISMATCH"
    case modeMismatch = "MODE_MISMATCH"
    case noReplaceCollision = "NO_REPLACE_COLLISION"
    case durabilityFailure = "DURABILITY_FAILURE"
    case readbackMismatch = "REOPEN_READBACK_MISMATCH"
    case unsupportedPrimitive = "UNSUPPORTED_DARWIN_PRIMITIVE"
}

public enum DarwinStorageSource {
    public static let publicationPlan = DarwinStoragePrimitive.allCases

    public static func validate(
        object: DarwinStorageObjectCandidate,
        expectedKind: DarwinStorageObjectCandidate.Kind,
        expectedUID: UInt32,
        expectedGID: UInt32,
        expectedMode: UInt16,
        expectedDevice: UInt64
    ) -> DarwinStorageValidationFailure? {
        if object.kind == .symbolicLink { return .symbolicLink }
        if object.kind != expectedKind { return .wrongType }
        if object.device != expectedDevice { return .deviceMismatch }
        if expectedKind == .regularFile && object.linkCount != DarwinStoragePolicy.requiredLinkCount {
            return .linkCountMismatch
        }
        if object.ownerUID != expectedUID || object.ownerGID != expectedGID { return .ownerMismatch }
        if object.mode != expectedMode { return .modeMismatch }
        return nil
    }

    public static func classifyNoReplace(errno value: Int32) -> DarwinStorageValidationFailure {
        value == EEXIST ? .noReplaceCollision : .unsupportedPrimitive
    }

    public static func classifyDurability(success: Bool) -> DarwinStorageValidationFailure? {
        success ? nil : .durabilityFailure
    }

    public static func classifyReadback(matches: Bool) -> DarwinStorageValidationFailure? {
        matches ? nil : .readbackMismatch
    }

    public static let canonicalRootTouched = false
    public static let runtimePublicationPerformed = false
}
