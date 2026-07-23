# Day136 Contract Matrix

| Kind | Risk | Reviewer capability | Approval | Command | Business write | External side effect |
|---|---|---|---:|---:|---:|---:|
| safe_metadata | l1_proposal_write | review_farm_metadata | required | forbidden | forbidden | forbidden |
| confirmation_task | l1_proposal_write | review_operational_proposal | required | forbidden | forbidden | forbidden |
| administrative_memo | l1_proposal_write | review_administrative_memo | required | forbidden | forbidden | forbidden |
| crop_plan_review_request | l1_proposal_write | review_crop_plan | required | forbidden | forbidden | forbidden |

Statuses: `candidate`, `validation_failed`, `review_ready`, `expired`, `superseded`, `rejected`. Approval and execution states are excluded.
