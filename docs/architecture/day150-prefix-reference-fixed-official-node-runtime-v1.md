# Day 150 fixed official Node runtime v1

Status: `FUTURE_UNASSIGNED_DEFENSE_IN_DEPTH / NON_GATING / NOT_DAY150_CLOSURE_AUTHORITY`.

The Product Owner's Day150 Gate17 minimal-scope decision supersedes this candidate as a closure
prerequisite. Nothing in this document is imported into the active V10 proposal, plan, source
closure, or readiness gates. The source material is retained only for possible future review; it
does not authorize installation and does not add a twenty-third Day150 gate.

This is a source-only, proposal-first Model A contract. Acquisition occurred only in a non-authoritative private temporary directory. The contract creates no final directory, runs no privileged command, adopts no runtime, and changes no business data, schema, RLS, migration, or execution authorization.

The proposed source is `node-v24.18.0-darwin-arm64.tar.gz`, archive SHA-256 `e1a97e14c99c803e96c7339403282ea05a499c32f8d83defe9ef5ec66f979ed1`. The release-list SHA-256 is `3927bab574a00ca0560c9583fe19655ba19603a1c5851414e4325d34ac50e469`; detached verification is GOOD RSA/SHA256 from active official release key `C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C`. Release-key provenance is pinned to commit `b28073028e6d6855cfb53bf7fa0137599c01f967`, signer-key SHA-256 `84b1ca614406f341cb86e72920f5a64687a13ab67ab84038bcf2abba97898a84`, and active pubring SHA-256 `8e6f89521a0694e445f42decd022f48369c634f1b5bcb5975135b69c88629ae8`.

The exact target is `/Library/Application Support/FarmOS/qualification/day150-prefix-reference/fixed-runtime/v1/runtime/bin/node`. Its observed requirements are Node `v24.18.0`, arm64 thin Mach-O, SHA-256 `ee6fb0e015284d83a91e8ec5213f43a157f8a392b58555301682892ba928c04a`, size 120965360, TeamIdentifier `HX7739G8FX`, hardened runtime, no `LC_RPATH`, and only CoreFoundation, Security, libc++, and libSystem Apple dependencies. There are no fixed dylibs besides node.

The exact tree contains `runtime/bin/node`, `application/day150-prefix-reference-sealed-execution-bundle-v1.mjs`, and `authority/fixed-runtime-profile-v1.json`. Directories are `root:wheel` 0755, node is 0555, and bundle/manifest are 0444. Every entry rejects symlinks, unexpected hardlinks, writable ACLs, group/world writability, and UID 501-writable ancestors. Acquisition temporary paths are always untrusted. The clean environment admits only exact locale/path/temp and Day150 attestation values; it rejects HOME, Node/tsx loader, DYLD, instrumentation, and shell injection authority. Homebrew and Codex fallbacks are prohibited.

The source contract fixes the 16 ordered administrator-install steps and permits only bounded pre-adoption compensation: remove only paths proven newly created by this attempt; never remove a pre-existing or unverified path. Administrator installation requires its own explicit human authorization; it does not require, create, replace, or modify the exhausted historical V8 authorization or the consumed terminal V9 authorization. Any later execution revision using this optional runtime would require a separate Product Owner decision and must bind both the fixed runtime-profile digest and bundle digest.

The sealed bundle candidate is 897877 bytes with SHA-256 `a6bcd13f4b6adb6b3acb7eb115828d4d8d4dd35417b1f580039c8701670aa3ab`, build-input digest `7263b7e9faf1910b05b92e7542f9f6559ce2bca1195a3fe14f9e66a8c283b8f7`, and build-configuration digest `65f224b110bf65285cad11b860e90bd277c51ed24160984ae64f6bc624a16ce9`. Its PostgreSQL package closure and runtime data are embedded; runtime tsx and runtime application `node_modules` resolution are absent. The domain-separated combined source-candidate runtime-profile digest is `b8b1191c12f6c7b5c03157504bba21771fe09786837b62b4ed85412ce2d66228` and must match the administrator proposal.

Both an installed readback and a compensated pre-adoption outcome require an audit-receipt digest. This preserves an auditable terminal record while leaving adoption incomplete; no AI or runtime process gains authority to write confirmed business data.
