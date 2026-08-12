import Foundation

let status = [
    "canonical_ledger_write_performed": false,
    "classification": "WRITER_SOURCE_TARGET_NOT_INSTALLED_OR_PRIVILEGE_DROPPED",
] as [String: Any]
let data = try JSONSerialization.data(withJSONObject: status, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
