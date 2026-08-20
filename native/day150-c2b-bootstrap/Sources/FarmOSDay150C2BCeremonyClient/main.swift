import FarmOSDay150C2BNativeCore
import Foundation

let input = FileHandle.standardInput.readDataToEndOfFile()
let result: [String: Any]
switch NativeProtocolCodec.parse(input) {
case let .structurallyValidCandidate(candidate):
    result = [
        "authority": FarmOSDay150C2BNativeAuthority.protocolID,
        "classification": "BOUNDED_REQUEST_ACCEPTED_NOT_RUNTIME_AUTHORITY",
        "operation": candidate.operation.rawValue,
        "request_reference_digest": candidate.requestReferenceDigest,
        "ledger_write_authority": false,
    ]
case let .invalid(failure):
    result = ["classification": "REQUEST_REJECTED", "reason": failure.rawValue]
}
let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
