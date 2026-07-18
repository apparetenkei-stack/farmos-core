# Daily Brief Proposal review read boundary

Day127は、Day126で`ai.proposal_inbox`へ明示保存されたDaily Brief Proposalを、人間の管理者が確認するためのread-only境界を定義する。

## Scope

Day127が提供するのは、Daily Brief Proposalの一覧・詳細用safe projection、administrator-only認可、safe opaque reference、status・risk・作成日時・期限状態の表示、Day126 payloadのstrict schema validation、unknown schemaのfail-closedだけである。

Day127ではapprove、reject、request revision、review note write、review actor/timestamp write、status update、Apply、app/audit database write、Proposal INSERT/UPDATE/DELETEを実装しない。

## Existing Proposal UI separation

既存の`/proposals`と`/proposals/[proposalId]`は、raw UUID、review event、Apply Readiness、Apply Plan Preview、Apply History、raw payloadなどを扱う開発・監査用UIである。Day127の管理者向け安全表示では既存UIを公開境界として再利用せず、専用safe projectionを介し、既存review/apply commandをimportしない。

## Authentication and authorization

既存の`HermesDailyFarmBriefAuthenticatedActorContext`を再利用する。閲覧条件は次のとおりで、browserからrole、principal、scopeを指定させない。一般スタッフは一覧・詳細とも閲覧不可とする。

```text
role = administrator
authorization_verified = true
allowed_scope_keys = []
```

## Safe reference

DB UUIDは一覧、詳細、URL、safe JSONへ公開しない。Day126のserver-owned semantic idempotency keyをDay127 boundary名と共にSHA-256で再ハッシュし、先頭24文字を`daily_brief_proposal_<24 hex>`として使用する。元のidempotency key、candidate ID、duplicate signatureも公開せず、migrationを必要としない。

## Strict row recognition

Daily Brief Proposalとして認識するには、少なくとも次が一致しなければならない。row、payload、source refsはexact key validationを行い、unknown key/schema/status/risk、mirror不一致はfail closedとする。

```text
proposal_type = work_log_follow_up
payload_json.schema_version = hermes.daily_farm_brief.proposal_inbox_record.v1
payload_json.boundary = day126_daily_farm_brief_explicit_save
source_refs_json.source = daily_farm_brief_attention
source_refs_json.boundary = day126_daily_farm_brief_explicit_save
```

## Safe projections

一覧にはsafe proposal reference、proposal type、status、risk、title、summary、created/expires at、expiry state、source kind、human review required、apply performed stateだけを公開する。

詳細にはそれらに加え、body、reason、safe target display、work type label、basis、before、after、source business date/version、apply readiness falseを公開する。

DB UUID、principal、model内部名、raw payload、raw source refsは公開しない。

## Expiry

Day127はProposal statusを更新しない。`expires_at <= requested_at`の場合、projection上の`expiry_state`を`expired`とする。DB statusの自動更新は行わない。

## Safety

```text
database write = 0
Proposal INSERT/UPDATE/DELETE/Apply = 0
app/audit write = 0
model execution = 0
retry = 0
raw identifier/principal exposure = 0
production operation = 0
```

## Day127 next step

pure/static境界の後、隔離DB専用read-only repositoryを追加する。repository interfaceにはlist/detail readだけを定義し、insert、update、delete、approve、reject、apply methodを持たせない。

Day128へ渡す責務はapprove、reject、request revision、review note、review actor/timestamp、append-only review decision auditである。
