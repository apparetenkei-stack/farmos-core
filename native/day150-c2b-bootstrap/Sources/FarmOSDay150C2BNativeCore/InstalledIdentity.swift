import CryptoKit
import Darwin
import Foundation
import Security

public enum InstalledIdentityFailure: String, Error, Equatable, Sendable {
    case adoptionRecordInvalid = "ADOPTION_RECORD_INVALID"
    case executablePathMismatch = "EXECUTABLE_PATH_MISMATCH"
    case symbolicLink = "SYMLINK_REJECTED"
    case metadataMismatch = "OWNER_GROUP_MODE_DEVICE_OR_LINK_MISMATCH"
    case digestMismatch = "EXECUTABLE_DIGEST_MISMATCH"
    case signatureInvalid = "CODESIGN_DESIGNATED_REQUIREMENT_INVALID"
    case bundleIdentityMismatch = "BUNDLE_IDENTITY_MISMATCH"
    case objectIdentityMismatch = "OPEN_OBJECT_PATH_IDENTITY_MISMATCH"
}

public struct InstalledExecutableExpectation: Equatable, Sendable {
    public let executablePath: String
    public let executableSHA256: String
    public let signingIdentifier: String
    public let adoptionProfileDigest: String
    public let expectedUID: uid_t
    public let expectedGID: gid_t
    public let expectedMode: mode_t
}

public struct InstalledBrokerIdentityCapability: Sendable {
    let identityDigest: String
    let adoptionProfileDigest: String

    init(identityDigest: String, adoptionProfileDigest: String) {
        self.identityDigest = identityDigest
        self.adoptionProfileDigest = adoptionProfileDigest
    }
}

public enum NativeInstalledIdentitySource {
    public static let brokerPath =
        "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1/bin/farmos-c2b-validator-broker"
    public static let adoptionRecordPath =
        "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1/profile/installation-adoption.json"

    public static func loadBrokerExpectation() -> Result<InstalledExecutableExpectation,
        InstalledIdentityFailure> {
        var metadata = stat()
        guard lstat(adoptionRecordPath, &metadata) == 0,
              (metadata.st_mode & S_IFMT) == S_IFREG, metadata.st_nlink == 1,
              metadata.st_uid == 0, metadata.st_gid == 0,
              metadata.st_mode & 0o777 == 0o444
        else { return .failure(.adoptionRecordInvalid) }
        do {
            let bytes = try Data(contentsOf: URL(fileURLWithPath: adoptionRecordPath),
                                 options: [.mappedIfSafe, .uncached])
            guard bytes.count <= 32_768,
                  let root = try JSONSerialization.jsonObject(with: bytes) as? [String: Any],
                  Set(root.keys) == ["schema_version", "attempt_id", "principal_name",
                                     "account_api", "numeric_identity", "installed_set_digest",
                                     "apfs_device_identity_digest", "launch_configuration_digest",
                                     "profile_digest", "journal_digest", "canonical_root",
                                     "validator_broker", "writer_worker", "authority_committed"],
                  root["schema_version"] as? String ==
                    "farmos.day150-c2b-installation-adoption-record.v1",
                  root["principal_name"] as? String == "farmos_c2b_bootstrap",
                  root["account_api"] as? String ==
                    "OPENDIRECTORY_ODSESSION_LOCAL_NODE_ODRECORD_USER_AND_GROUP",
                  root["canonical_root"] as? String ==
                    "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1",
                  root["authority_committed"] as? Bool == true,
                  let profileDigest = root["profile_digest"] as? String,
                  FarmOSCanonicalDigest.isDigest(profileDigest),
                  ["installed_set_digest", "apfs_device_identity_digest",
                   "launch_configuration_digest", "journal_digest"].allSatisfy({ key in
                      guard let value = root[key] as? String else { return false }
                      return FarmOSCanonicalDigest.isDigest(value)
                  }),
                  let numericIdentity = root["numeric_identity"] as? [String: Any],
                  Set(numericIdentity.keys) == ["uid", "gid"],
                  let uidNumber = numericIdentity["uid"] as? NSNumber,
                  let gidNumber = numericIdentity["gid"] as? NSNumber,
                  (200...499).contains(uidNumber.intValue),
                  (200...499).contains(gidNumber.intValue),
                  let broker = root["validator_broker"] as? [String: Any],
                  Set(broker.keys) == ["path", "sha256", "signing_identifier", "owner_uid",
                                       "owner_gid", "mode"],
                  broker["path"] as? String == brokerPath,
                  broker["mode"] as? String == "0555",
                  (broker["owner_uid"] as? NSNumber)?.intValue == 0,
                  (broker["owner_gid"] as? NSNumber)?.intValue == 0,
                  let digest = broker["sha256"] as? String,
                  FarmOSCanonicalDigest.isDigest(digest),
                  let signingIdentifier = broker["signing_identifier"] as? String,
                  signingIdentifier == "org.farmos.day150.c2b-bootstrap.validator-broker"
            else { return .failure(.adoptionRecordInvalid) }
            return .success(.init(executablePath: brokerPath, executableSHA256: digest,
                signingIdentifier: signingIdentifier, adoptionProfileDigest: profileDigest,
                expectedUID: 0, expectedGID: 0,
                expectedMode: 0o555))
        } catch { return .failure(.adoptionRecordInvalid) }
    }

    public static func verifyCurrentBroker(
        expectation: InstalledExecutableExpectation
    ) -> Result<InstalledBrokerIdentityCapability, InstalledIdentityFailure> {
        guard expectation.executablePath == brokerPath,
              Bundle.main.executableURL?.path == brokerPath
        else { return .failure(.executablePathMismatch) }
        var pathMetadata = stat()
        guard lstat(brokerPath, &pathMetadata) == 0 else { return .failure(.metadataMismatch) }
        if (pathMetadata.st_mode & S_IFMT) == S_IFLNK { return .failure(.symbolicLink) }
        guard (pathMetadata.st_mode & S_IFMT) == S_IFREG, pathMetadata.st_nlink == 1,
              pathMetadata.st_uid == expectation.expectedUID,
              pathMetadata.st_gid == expectation.expectedGID,
              pathMetadata.st_mode & 0o777 == expectation.expectedMode
        else { return .failure(.metadataMismatch) }
        let descriptor = open(brokerPath, O_RDONLY | O_NOFOLLOW | O_CLOEXEC)
        guard descriptor >= 0 else { return .failure(.metadataMismatch) }
        defer { close(descriptor) }
        var openedMetadata = stat()
        guard fstat(descriptor, &openedMetadata) == 0,
              openedMetadata.st_dev == pathMetadata.st_dev,
              openedMetadata.st_ino == pathMetadata.st_ino
        else { return .failure(.objectIdentityMismatch) }
        let handle = FileHandle(fileDescriptor: descriptor, closeOnDealloc: false)
        guard let data = try? handle.readToEnd(), data.count <= 64 * 1_048_576 else {
            return .failure(.digestMismatch)
        }
        let digest = "sha256:" + SHA256.hash(data: data).map {
            String(format: "%02x", $0)
        }.joined()
        guard digest == expectation.executableSHA256 else { return .failure(.digestMismatch) }
        var runningCode: SecCode?
        guard SecCodeCopySelf([], &runningCode) == errSecSuccess,
              let runningCode,
              SecCodeCheckValidity(runningCode, [], nil) == errSecSuccess
        else { return .failure(.signatureInvalid) }
        var runningStaticCode: SecStaticCode?
        guard SecCodeCopyStaticCode(runningCode, [], &runningStaticCode) == errSecSuccess,
              let runningStaticCode
        else { return .failure(.signatureInvalid) }
        var signingInfo: CFDictionary?
        guard SecCodeCopySigningInformation(runningStaticCode,
                                             SecCSFlags(rawValue: kSecCSSigningInformation),
                                             &signingInfo) == errSecSuccess,
              let info = signingInfo as? [String: Any],
              info[kSecCodeInfoIdentifier as String] as? String == expectation.signingIdentifier
        else { return .failure(.bundleIdentityMismatch) }
        var finalMetadata = stat()
        guard lstat(brokerPath, &finalMetadata) == 0,
              finalMetadata.st_dev == openedMetadata.st_dev,
              finalMetadata.st_ino == openedMetadata.st_ino
        else { return .failure(.objectIdentityMismatch) }
        let identityDigest = FarmOSCanonicalDigest.sha256(
            domain: "farmos.day150-installed-broker-identity.v1",
            canonicalValue: "\(digest)\n\(expectation.adoptionProfileDigest)\n\(pathMetadata.st_dev):\(pathMetadata.st_ino)"
        )
        return .success(.init(identityDigest: identityDigest,
                              adoptionProfileDigest: expectation.adoptionProfileDigest))
    }
}
