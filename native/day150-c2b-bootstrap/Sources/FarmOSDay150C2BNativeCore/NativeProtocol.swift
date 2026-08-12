import CoreFoundation
import CryptoKit
import Foundation

public enum FarmOSDay150C2BNativeAuthority {
    public static let protocolID = "farmos.day150-c2b-bootstrap-native-protocol.v1"
    public static let protocolRevision = 1
    public static let messageDigestDomain =
        "farmos.day150-c2b-bootstrap-native-protocol.v1:message-body"
    public static let actorReferenceDigestDomain =
        "farmos.day150-c2b-bootstrap-actor-reference.v1:generateduid-install-binding"
    public static let maximumMessageBytes = 8_192
}

public enum NativeProtocolOperation: String, CaseIterable, Sendable {
    case validateBootstrapCeremony = "BROKER_VALIDATE_BOOTSTRAP_CEREMONY_CANDIDATE"
    case validateActorProvenance = "BROKER_VALIDATE_ACTOR_PROVENANCE_CANDIDATE"
    case observeClockProvenance = "BROKER_OBSERVE_CLOCK_PROVENANCE_CANDIDATE"
    case publishRuntimeRecord = "WRITER_PUBLISH_RUNTIME_PROVENANCE_RECORD_CANDIDATE"
    case readSanitizedStatus = "WRITER_READ_SANITIZED_RUNTIME_STATUS_CANDIDATE"
}

public enum NativeProtocolFailure: String, Error, Equatable, Sendable {
    case oversized = "MESSAGE_TOO_LARGE"
    case malformedJSON = "MALFORMED_JSON"
    case invalidEnvelope = "INVALID_ENVELOPE"
    case unknownMessageKind = "UNKNOWN_MESSAGE_KIND"
    case authorityMismatch = "AUTHORITY_MISMATCH"
    case unknownOperation = "UNKNOWN_OPERATION"
    case invalidRequest = "INVALID_REQUEST"
    case invalidResponse = "INVALID_RESPONSE"
    case malformedDigest = "MALFORMED_DIGEST"
    case digestMismatch = "DIGEST_MISMATCH"
}

public struct NativeProtocolCandidate: Equatable, Sendable {
    public let messageKind: String
    public let operation: NativeProtocolOperation
    public let requestReferenceDigest: String
    public let messageDigest: String
    public let nativeAuthenticityEstablished = false
    public let peerAuthenticityEstablished = false
    public let storagePublicationEstablished = false
}

public enum NativeProtocolParseResult: Equatable, Sendable {
    case structurallyValidCandidate(NativeProtocolCandidate)
    case invalid(NativeProtocolFailure)
}

public enum FarmOSCanonicalDigest {
    private static let digestPattern = try! NSRegularExpression(
        pattern: #"^sha256:[a-f0-9]{64}$"#
    )

    public static func isDigest(_ value: Any?) -> Bool {
        guard let string = value as? String else { return false }
        let range = NSRange(string.startIndex..<string.endIndex, in: string)
        return digestPattern.firstMatch(in: string, range: range) != nil
    }

    public static func sha256(domain: String, canonicalValue: String) -> String {
        let bytes = Data("\(domain)\n\(canonicalValue)".utf8)
        let digest = SHA256.hash(data: bytes)
        return "sha256:" + digest.map { String(format: "%02x", $0) }.joined()
    }

    public static func canonicalJSON(_ value: Any) throws -> String {
        if value is NSNull { return "null" }
        if let string = value as? String {
            let data = try JSONSerialization.data(withJSONObject: [string])
            let encoded = String(decoding: data, as: UTF8.self)
            return String(encoded.dropFirst().dropLast())
        }
        if let number = value as? NSNumber {
            if CFGetTypeID(number) == CFBooleanGetTypeID() {
                return number.boolValue ? "true" : "false"
            }
            let decimal = number.decimalValue
            guard decimal.isFinite else { throw NativeProtocolFailure.malformedJSON }
            return NSDecimalNumber(decimal: decimal).stringValue
        }
        if let array = value as? [Any] {
            return "[" + (try array.map(canonicalJSON)).joined(separator: ",") + "]"
        }
        if let object = value as? [String: Any] {
            let members = try object.keys.sorted().map { key in
                let keyJSON = try canonicalJSON(key)
                guard let member = object[key] else { throw NativeProtocolFailure.malformedJSON }
                return "\(keyJSON):\(try canonicalJSON(member))"
            }
            return "{" + members.joined(separator: ",") + "}"
        }
        throw NativeProtocolFailure.malformedJSON
    }
}

public enum NativeProtocolCodec {
    private static let requestKeys: Set<String> = [
        "schema_version", "authority_id", "authority_revision", "message_kind", "operation",
        "request_reference_digest_candidate", "installation_profile_digest_candidate",
        "native_profile_digest_candidate", "protocol_profile_digest_candidate",
        "payload_reference_digest_candidate", "runtime_record_candidate_digest",
    ]
    private static let responseKeys: Set<String> = [
        "schema_version", "authority_id", "authority_revision", "message_kind", "operation",
        "request_reference_digest_candidate", "installation_profile_digest_candidate",
        "native_profile_digest_candidate", "protocol_profile_digest_candidate",
        "response_state", "result_reference_digest_candidate", "sanitized_reason",
    ]
    private static let commonDigestKeys = [
        "request_reference_digest_candidate", "installation_profile_digest_candidate",
        "native_profile_digest_candidate", "protocol_profile_digest_candidate",
    ]

    public static func parse(_ data: Data) -> NativeProtocolParseResult {
        guard data.count <= FarmOSDay150C2BNativeAuthority.maximumMessageBytes else {
            return .invalid(.oversized)
        }
        let root: Any
        do {
            root = try JSONSerialization.jsonObject(with: data, options: [])
        } catch {
            return .invalid(.malformedJSON)
        }
        guard let envelope = root as? [String: Any],
              Set(envelope.keys) == ["message_body", "message_digest"],
              let body = envelope["message_body"] as? [String: Any]
        else { return .invalid(.invalidEnvelope) }

        guard let kind = body["message_kind"] as? String,
              kind == "BOUNDED_REQUEST_CANDIDATE" || kind == "BOUNDED_RESPONSE_CANDIDATE"
        else { return .invalid(.unknownMessageKind) }
        let requiredKeys = kind == "BOUNDED_REQUEST_CANDIDATE" ? requestKeys : responseKeys
        guard Set(body.keys) == requiredKeys,
              body["schema_version"] as? String == FarmOSDay150C2BNativeAuthority.protocolID,
              body["authority_id"] as? String == FarmOSDay150C2BNativeAuthority.protocolID,
              exactInteger(body["authority_revision"], equals: FarmOSDay150C2BNativeAuthority.protocolRevision)
        else { return .invalid(.authorityMismatch) }
        guard let operationRaw = body["operation"] as? String,
              let operation = NativeProtocolOperation(rawValue: operationRaw)
        else { return .invalid(.unknownOperation) }
        guard commonDigestKeys.allSatisfy({ FarmOSCanonicalDigest.isDigest(body[$0]) }) else {
            return .invalid(kind == "BOUNDED_REQUEST_CANDIDATE" ? .invalidRequest : .invalidResponse)
        }

        if kind == "BOUNDED_REQUEST_CANDIDATE" {
            guard FarmOSCanonicalDigest.isDigest(body["payload_reference_digest_candidate"]) else {
                return .invalid(.invalidRequest)
            }
            if operation == .publishRuntimeRecord {
                guard FarmOSCanonicalDigest.isDigest(body["runtime_record_candidate_digest"]) else {
                    return .invalid(.invalidRequest)
                }
            } else if !(body["runtime_record_candidate_digest"] is NSNull) {
                return .invalid(.invalidRequest)
            }
        } else {
            guard validateResponse(body) else { return .invalid(.invalidResponse) }
        }

        guard let suppliedDigest = envelope["message_digest"] as? String,
              FarmOSCanonicalDigest.isDigest(suppliedDigest)
        else { return .invalid(.malformedDigest) }
        let expectedDigest: String
        do {
            expectedDigest = FarmOSCanonicalDigest.sha256(
                domain: FarmOSDay150C2BNativeAuthority.messageDigestDomain,
                canonicalValue: try FarmOSCanonicalDigest.canonicalJSON(body)
            )
        } catch {
            return .invalid(.malformedJSON)
        }
        guard suppliedDigest == expectedDigest else { return .invalid(.digestMismatch) }
        return .structurallyValidCandidate(NativeProtocolCandidate(
            messageKind: kind,
            operation: operation,
            requestReferenceDigest: body["request_reference_digest_candidate"] as! String,
            messageDigest: expectedDigest
        ))
    }

    public static func qualificationEnvelope(body: [String: Any]) throws -> Data {
        let digest = FarmOSCanonicalDigest.sha256(
            domain: FarmOSDay150C2BNativeAuthority.messageDigestDomain,
            canonicalValue: try FarmOSCanonicalDigest.canonicalJSON(body)
        )
        return try JSONSerialization.data(
            withJSONObject: ["message_body": body, "message_digest": digest],
            options: [.sortedKeys]
        )
    }

    private static func exactInteger(_ value: Any?, equals expected: Int) -> Bool {
        guard let number = value as? NSNumber,
              CFGetTypeID(number) != CFBooleanGetTypeID()
        else { return false }
        return number.intValue == expected && number.doubleValue == Double(expected)
    }

    private static func validateResponse(_ body: [String: Any]) -> Bool {
        guard let state = body["response_state"] as? String else { return false }
        switch state {
        case "ACK_CANDIDATE_NOT_RUNTIME_EVIDENCE":
            return FarmOSCanonicalDigest.isDigest(body["result_reference_digest_candidate"])
                && body["sanitized_reason"] is NSNull
        case "REJECTED_CANDIDATE":
            return body["result_reference_digest_candidate"] is NSNull
                && ["INVALID_REQUEST", "POLICY_REJECTED"].contains(body["sanitized_reason"] as? String)
        case "OUTCOME_UNKNOWN_CANDIDATE":
            return body["result_reference_digest_candidate"] is NSNull
                && body["sanitized_reason"] as? String == "OUTCOME_UNKNOWN"
        default:
            return false
        }
    }
}
