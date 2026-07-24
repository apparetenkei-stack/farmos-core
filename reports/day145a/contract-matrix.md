# Day145-A Contract Matrix

| Boundary | Core output | Authoritative state | Guard |
|---|---|---|---|
| Work Plan | `draft`, `review_ready` | farming-app confirmed plan | human review and `edit_work_plan` |
| Assignment | candidate only | farming-app staff assignment | human review and `assign_staff` |
| Command | draft only | executed command/result | production Gateway disconnected |
| Timeout | `outcome_unknown` | authoritative re-fetch | no new idempotency key |
| Observer | Finding candidate | approved Policy/Skill | no auto-adoption |
