# Day150.5-E Production Runtime Activation Contract

## Authority boundary

The Core process selects exactly one server-owned runtime environment through
`FARMOS_CORE_RUNTIME_ENVIRONMENT`. Only `staging` and `production` are valid.
Missing or unknown selection blocks before manifest files are read. Request
headers, hostnames, browser values, database endpoints, and fallback values do
not participate in selection.

Each environment has an immutable manifest identity and Core Memory profile.
The external manifest pin, observed identity, listener, database, resource
fingerprint, credential class, Keychain metadata, and PostgreSQL major must all
match the selected profile. There is no reciprocal fallback.

## Production startup

The canonical LaunchAgent label remains `com.apparetenkei.farmos-core`. Its
tracked template binds the approved Production materialization under
`~/Library/Application Support/FarmOS/production/e5/` and an exact clean
release worktree. The wrapper retrieves the dedicated Production Core Memory
readonly credential from macOS Keychain without printing it. Existing Active
Projection authentication remains owned by the pre-existing server credential
authority; only the four required variables are forwarded to the new process.

Production App Business credentials are not injected. Runtime configuration
records that connection authority as `NOT_INJECTED`.

## Release and activation

1. Require canonical main and feature publication at one exact commit.
2. Create a detached clean Git worktree beneath the existing `core-web`
   release root at that exact commit.
3. Install from the locked dependency graph and build in that worktree.
4. Materialize the approved manifest, external pin, observed identity, and
   runtime config with directory mode `0700` and file mode `0600`.
5. Run offline selector, manifest, pin, Core Memory config, Keychain startup,
   plist, and local readonly database checks before restarting.
6. Capture the current plist and hashes, then perform one bounded same-label
   LaunchAgent replacement using the Day146 quiescence sequence.

No Tailscale, Staging, App Business database, Vercel, App repository, schema,
RLS, credential, or Slack mutation is part of this contract.

## Rollback

On the first failed health, identity, readonly, authentication, or handshake
gate, boot out only the candidate Production label, restore the captured
previous Production plist and release authority, bootstrap it once, and require
`127.0.0.1:3000` health. Do not perform an in-place repair loop.
