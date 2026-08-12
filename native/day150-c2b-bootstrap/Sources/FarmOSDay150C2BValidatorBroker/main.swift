import Foundation

let status = [
    "classification": "BROKER_SOURCE_TARGET_NOT_INSTALLED_OR_PRIVILEGED",
    "ledger_write_authority": false,
] as [String: Any]
let data = try JSONSerialization.data(withJSONObject: status, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
