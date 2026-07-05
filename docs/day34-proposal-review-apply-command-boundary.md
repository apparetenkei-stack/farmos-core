# Day34 Proposal Review Apply Command Boundary

## Purpose

Day34 adds a CLI-only apply command boundary for proposal review apply plans.

This boundary uses the Day33 apply plan preview boundary as its required first gate. It only allows proposals whose preview result is `preview` and whose preview operation is one of:

- `insert_candidate`
- `no_op_candidate`

`update_candidate` is intentionally blocked in Day34 and left for a later Day.

## Scope

Day34 is not a UI apply day.

Day34 does not add:

- apply UI
- button elements
- form elements
- Server Actions
- POST/PUT/PATCH route handlers

## Execution policy

The command is intended to be run by a local administrator through CLI, using `farmos_local_admin`.

The normal UI read role, `farmos_app_local`, remains read-only for app and ai tables.

## Dry-run and commit

Without `--commit`, the command runs as a dry-run and performs no writes.

With `--commit`, the command can do only the following:

- for `insert_candidate`: insert one row into `app.crop_cycles`
- for `no_op_candidate`: insert no app row
- for both successful commit cases: update `ai.proposal_inbox.applied_by` and `ai.proposal_inbox.applied_at`

The proposal `status` is not changed in Day34.

## Insert mapping

For `insert_candidate`, the command inserts into `app.crop_cycles`:

- `season_year = 2026`
- `crop`
- `variety`
- `field_name`
- `sowing_date_text`
- `transplant_date_text`
- `source_apply_plan_id = payload_json.source_apply_plan_id`
- `source_extracted_fact_ids = '{}'
- `created_by = appliedBy`
- `created_by_role = appliedByRole`
- `archived = false`

`season_year`, `source_apply_plan_id`, and `created_by` are included because the actual `app.crop_cycles` schema requires them as NOT NULL columns. Day34 does not add an app schema migration. The command requires `payload_json.source_apply_plan_id` for `insert_candidate`, and the Day34 test creates a dedicated local fixture apply plan row before applying the proposal.

Day34 intentionally does not attach detailed provenance to the inserted app row. That can be hardened later.

## No-op mapping

For `no_op_candidate`, the command performs no app schema write.

The proposal apply marker is still updated on commit because the candidate already matches app truth and should not remain repeatedly applicable.

## Blocked operations

Day34 blocks:

- proposals that Day33 preview does not classify as `preview`
- `update_candidate`
- missing or invalid candidate data
- proposals already marked applied
- non-`app.crop_cycles` targets
- stale insert previews that now have an exact app match

## Important protected proposal

The existing target proposal remains protected:

`24fc24ee-8efa-436b-8424-9703edeeb297`

Day34 tests must not approve, reject, revise, apply, or otherwise mutate that proposal.

## Added files

- `scripts/app/api_boundary/proposal_review_apply_command_boundary.ts`
- `scripts/app/apply_proposal_review_apply_plan_command.ts`
- `scripts/app/test_proposal_review_apply_command_boundary.ts`

## Added package scripts

- `apply-proposal-review-apply-plan-command`
- `test-proposal-review-apply-command-boundary`

## Future Hermes routing note

Hermes must not call LLM runtimes directly from UI routes.

Future task routing should use a dedicated Hermes Router layer:

- `small_model`: low-risk summaries, short Q&A, notification drafts
- `large_model`: code, schema design, cross-domain analysis, low-confidence tasks
- `human_review`: writes, proposal approval, money/order/shipping/labor/customer data

This routing layer must remain separate from proposal apply execution.

Proposal apply execution stays behind explicit apply boundaries. Day34 keeps apply execution CLI-only and does not introduce UI-triggered apply, Server Actions, or POST/PUT/PATCH/DELETE routes.
