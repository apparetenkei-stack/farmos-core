import FarmOSDay150C2BNativeCore
import Foundation

// The real privilege-drop path is WriterPrivilegeRuntime. This source target cannot obtain
// UID/GID or a bounded ledger descriptor from argv/environment; only the installed broker's
// private dispatch may construct the Darwin syscall port in future activation.
let result: [String: Any] = [
    "classification": "WRITER_REJECTED",
    "reason": "TRUSTED_PRIVATE_BROKER_DISPATCH_REQUIRED",
    "canonical_ledger_write_performed": false,
]
let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
