import FarmOSDay150C2BNativeCore
import Foundation

// Build-qualified source target only. Future transport activation is separately authorized.
let status = [
    "authority": FarmOSDay150C2BNativeAuthority.protocolID,
    "classification": "SOURCE_TARGET_NOT_INSTALLED_OR_ACTIVE",
]
let data = try JSONSerialization.data(withJSONObject: status, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
