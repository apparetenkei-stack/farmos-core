# Crop Planning & Workforce Governance Foundation

## Business Outcome and SOT Map

FarmOS Core owns proposal candidates, policy, knowledge, decision basis, review audit, findings, and execution trace. The farming app remains SOT for fields, crop cycles, work records, approved crop plans, workforce participation/employment, role/skill/capability assignments, inventory/resource usage, and actual deliveries/applications. Sales/Commerce remains SOT for products, orders, customers, prices, costs, margins, and allocations. Core stores none of those business facts.

`Crop Plan` is future intent; `Crop Cycle` is an actual planting unit; `Work Record` is an actual performed activity. A proposal candidate is not an approved plan, and neither is an actual. Core cannot overwrite cycles or work records.

Supplier coordination keeps contact, draft, proposed/approved allocation, scheduled delivery, actual delivery, and actual application distinct. Proposed, approved, scheduled, delivered, and applied quantities are distinct.

## Crop, supplier, workforce, capability, and scope model

Proposal, Approved Plan, and Actual are separate states: a proposal is a candidate, an approved plan is farming-app-owned after human approval, and an actual is a farming-app-recorded fact. Supplier coordination distinguishes contact, coordination draft, proposed/approved allocation, scheduled delivery, actual delivery, and actual application; quantity states are likewise separate.

Participation/employment status, business roles, skills/certifications, capability, scope, validity, and assignments are separate. Lifecycle names are conceptual external-SOT transition categories, not database enums. Every lifecycle transition requires human approval, rechecks capability, is audited, forbids self action and business writes; exit/suspension/executive transition/revocation require session-revocation handling. Rehire never restores prior capability automatically.

The registry defines capability metadata only; it does not assign it. Scope is typed (`farm`, `team`, `crop`, `crop_plan`, `crop_cycle`, `field`, `supplier`, `sales_channel`, `all`) and has validity. Unknown references, sources, scopes, capabilities, versions, keys, or invalid timestamps fail closed.

Sales capabilities are intentionally non-transitive: summary is not detail; detail is not customer identity; price is not cost; cost is not margin; allocation approval is not external-change approval. No sales data is read.

## Sales information and AI actions

AI may create L1 crop, workforce, supplier, capability, and sales-allocation proposal candidates only. It cannot approve, assign capability, change employment state, finalize plans, grant sales access, or execute externally. Day136 may add individually governed L2/L3 commands; Day146 farming-app UI must consume farming-app SOT through typed references.

Known limitations: farming-app schema, roles and RLS are not inspected; conceptual states are not production enums; real capability assignment, sales data, crop-plan persistence, and workforce persistence are unconnected. Rollback is removal of this additive contract commit; no business data exists to compensate.
