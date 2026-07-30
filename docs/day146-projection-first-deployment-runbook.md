# Day146 Projection-first Deployment Runbook

## Status and scope

```yaml
status: ACTIVE
scope: FarmOS Core Mac Projection-first Hermes LaunchAgent
launchd_label: jp.apparetenkei.farmos-hermes-slack
```

This runbook records the bounded same-label LaunchAgent replacement and
rollback procedure proven during Day146. It must not be used to change a
Secret, database, Slack allowlist, business record, Candidate, Proposal, or
active Projection.

## Operational issue

```yaml
launchd_quiescence:
  issue:
    immediate_same_label_bootstrap_after_bootout: may_fail_with_error_5
  observed:
    old_process_exit_delay: approximately_5_seconds
  maximum_wait_seconds: 10
```

An immediate bootstrap can race with removal of the old service registration
and process. Plist lint and executable validation do not prove that the old
label has quiesced.

## Preconditions

- Confirm the Repository and approved deployment identity are at the expected
  commits.
- Confirm the active label is unique, loaded, and running.
- Back up the active plist outside the Repository and record its checksum.
- Validate the candidate plist, wrapper owner and mode, syntax, and Secret
  literal scan.
- Record the old Runtime PID internally without publishing it.
- Do not place the candidate plist at the active path before quiescence.

## Required replacement sequence

1. Boot out the current label while the original plist remains active.
2. For at most 10 seconds, check both:
   - the service is absent from the launchd namespace; and
   - the old PID no longer exists.
3. Stop if both conditions do not become true within the bound.
4. Only after quiescence, copy the validated candidate plist to the active
   path.
5. Re-run plist lint and the semantic and Secret scans.
6. Bootstrap the label once.
7. For at most 10 seconds, require loaded, running, PID present, no abnormal
   exit, and no restart loop.
8. Do not add `kickstart` or an uncontrolled retry.

```yaml
required_sequence:
  - bootout current label
  - confirm service absent from launchd namespace
  - confirm old PID exited
  - bounded wait maximum 10 seconds
  - apply new plist
  - bootstrap once
```

## Prohibited operations

```yaml
prohibited:
  - immediate bootstrap without quiescence
  - unlimited polling
  - repeated kickstart
  - uncontrolled restart loops
  - Secret output or duplication
  - database or schema write
  - Slack message impersonation
```

## Rollback

If bootstrap, startup, or the read-only local probe fails:

1. Boot out the failed candidate Runtime if it was registered.
2. Wait up to 10 seconds for both label and PID quiescence.
3. Restore the backed-up original plist.
4. Remove the new wrapper only when rollback requires it.
5. Bootstrap the original plist once.
6. Verify that the original Runtime is loaded, running, and has a PID.
7. Stop without another candidate retry.

```yaml
rollback:
  database_change: 0
  repository_change: 0
  secret_change: 0
  repeated_retry: prohibited
```

## Evidence boundary

Log and report only fixed event names, fixed error categories, booleans, and
counts. Do not output query text, actor, workspace or channel identifiers,
installation or farm-scope values, credentials, tokens, database URLs, raw
errors, Projection bodies, source bodies, or model reasoning.
