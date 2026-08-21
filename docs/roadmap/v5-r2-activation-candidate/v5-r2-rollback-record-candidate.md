# v5.0 R2 docs-only rollback record candidate

Status: `CANDIDATE / NOT_EXECUTED`.

## Exact baseline and boundary

- Pre-activation Git baseline: `a5fff660001487850ba8ed143d1b0d1cf6a1c5c0`.
- The proposed activation must be one docs/authority/evidence-only commit whose parent is the exact baseline above.
- No `src/`, runtime code, SQL, migration, credential, business data, database, production state or external operation is in scope.
- Existing untracked and unrelated paths are not part of activation or rollback.

## Exact rollback outcome

After an activation commit exists, create a normal Git revert of that single activation commit and obtain the same review and human approval required for the activation authority transition. The revert must restore:

```text
canonical_v5_route_b_r2: ACTIVE -> CANDIDATE_R2 / NOT_ACTIVE
v4_0_legacy_authority: SUPERSEDED_LEGACY -> ACTIVE_LEGACY / CONTENT_VERIFIED / MUTATION_FROZEN
current_position: VERIFIED -> the pre-activation candidate state recorded at a5fff660001487850ba8ed143d1b0d1cf6a1c5c0
```

The rollback target is the exact tree authority at `a5fff660001487850ba8ed143d1b0d1cf6a1c5c0`. The rollback does not rewrite Day150 history, remove evidence, reset, clean, force-push, mutate runtime, or undo any later business operation. If later commits depend on the activation, use a reviewed supersession/correction commit instead of rewriting history.

No rollback command is executed by this readiness task.
