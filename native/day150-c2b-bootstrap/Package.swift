// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "FarmOSDay150C2BBootstrapNative",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "FarmOSDay150C2BNativeCore", targets: ["FarmOSDay150C2BNativeCore"]),
        .executable(name: "farmos-c2b-ceremony-client", targets: ["FarmOSDay150C2BCeremonyClient"]),
        .executable(name: "farmos-c2b-validator-broker", targets: ["FarmOSDay150C2BValidatorBroker"]),
        .executable(name: "farmos-c2b-writer-worker", targets: ["FarmOSDay150C2BWriterWorker"]),
    ],
    targets: [
        .target(name: "FarmOSDay150C2BNativeCore"),
        .executableTarget(
            name: "FarmOSDay150C2BCeremonyClient",
            dependencies: ["FarmOSDay150C2BNativeCore"]
        ),
        .executableTarget(
            name: "FarmOSDay150C2BValidatorBroker",
            dependencies: ["FarmOSDay150C2BNativeCore"]
        ),
        .executableTarget(
            name: "FarmOSDay150C2BWriterWorker",
            dependencies: ["FarmOSDay150C2BNativeCore"]
        ),
        .executableTarget(
            name: "FarmOSDay150C2BNativeQualification",
            dependencies: ["FarmOSDay150C2BNativeCore"],
            path: "Tests/FarmOSDay150C2BNativeCoreTests"
        ),
    ]
)
