import FarmOSDay150C2BNativeCore
import Foundation

let input = FileHandle.standardInput.readDataToEndOfFile()
let result: [String: Any]
switch NativeInstalledIdentitySource.loadBrokerExpectation() {
case let .failure(failure):
    result = ["classification": "BROKER_REJECTED", "reason": failure.rawValue,
              "ledger_write_authority": false]
case let .success(expectation):
    switch NativeInstalledIdentitySource.verifyCurrentBroker(expectation: expectation) {
    case let .failure(failure):
        result = ["classification": "BROKER_REJECTED", "reason": failure.rawValue,
                  "ledger_write_authority": false]
    case let .success(installedIdentity):
        switch NativeBrokerSource.validateInstalledPeer(identity: installedIdentity,
                                                        requestData: input) {
        case let .boundedDispatchCandidate(operation):
            result = ["classification": "BOUNDED_DISPATCH_ACCEPTED_NOT_LEDGER_WRITE",
                "operation": operation.rawValue, "ledger_write_authority": false]
        case let .rejected(failure):
            result = ["classification": "BROKER_REJECTED", "reason": failure.rawValue,
                "ledger_write_authority": false]
        }
    }
}
let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
