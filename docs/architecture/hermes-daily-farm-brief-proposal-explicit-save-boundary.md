# Daily Brief Proposal explicit save boundary

Day126前半は、Day125の安全な`work_log_follow_up` candidateを人間レビュー待ちProposalとして保存する前の、fixture-only境界を定義する。HTTP route、実DB repository、audit write、Applyは実装しない。

## 契約

requestは`hermes.daily_farm_brief.proposal_explicit_save_request.v1`のexact DTOであり、candidate ID、duplicate signature、`save_for_human_review`という明示確認、canonicalな要求時刻だけを受け取る。actorはbrowser inputではなくserver dependencyであり、既存actor parserを通過した`administrator`、`authorization_verified=true`、空の`allowed_scope_keys`だけを許可する。`future_explicit_save_eligible`は認可ではない。

境界はDay125 candidate parserを再実行し、candidateのstale状態、参照一致、要求時刻におけるexpiryを再検証する。browserはrole、scope、proposal type、target、risk、本文を指定できない。

公開保存入口は`executeHermesDailyFarmBriefProposalExplicitSave`だけであり、raw request、server-owned actor、candidateから内部で必ずprepareを実行する。検証済みとcallerが主張する`ReadyResult`だけを受け取る公開保存関数は提供しない。prepareがrejectedならrepositoryを一度も呼ばず、その時点の`explicit_save_requested`と`candidate_revalidated`をpersistence resultへ保持する。

readyの場合もrepository直前にcandidate parserとstrict proposal record parserを再実行する。candidate duplicate signatureからsemantic idempotency keyを再計算し、prepare result、save preview、payload、source refsの4箇所がすべて一致した場合だけlookupへ進む。runtime中の改ざんやmirror不一致はrepository access前にfail-closedとなる。TypeScriptの型だけを認証・認可境界として信頼しない。

semantic idempotency keyは、record schema、boundary、proposal type、candidate duplicate signatureを固定順・length-prefixedでcanonical化したSHA-256である。actor principalや要求時刻には依存しない。repository lookupはstatusで絞らず、すべてのstatusの既存recordをduplicateとして扱う。

## 保存対象と安全性

生成するstrict recordは将来`ai.proposal_inbox`へ渡す形だが、Day126前半ではfake repositoryだけを使う。targetは個別work-log recordではなく、Day125のbrowser-safeなdisplay scope単位のfollow-upである。raw work-log ID、field ID、principal、role、allowed scope keyを保持・公開しない。個別record targetingはserver-owned opaque referenceを導入する将来の別境界で扱う。

保存後も`proposal_apply_ready=false`、`proposal_apply_performed=false`であり、人間レビューなしにApplyできない。repository orchestrationはlookupを1回、未存在時のinsertを1回だけ行い、UPDATE、DELETE、retry、audit write、app DB writeを行わない。

## Roadmap handoff

## Day126後半: isolated PostgreSQL

後半は明示された既存の隔離test databaseだけを対象に、`ai.proposal_inbox`へINSERT-onlyで接続する。専用environment targetが欠損または既知の隔離DB名と一致しない場合はDBへ接続せずdeniedとなる。production接続、暗黙の`farmos_core_local` fallback、migration、role/privilege変更は行わない。

公開execute boundaryがauthentication、administrator gate、explicit confirmation、candidate再検証を内部で完了した後だけrepositoryへ進む。DB sessionでは既存の最小権限roleを`SET LOCAL ROLE`で使用し、current database、read-write transaction、relation、INSERT権限、UPDATE/DELETE非権限、app/audit INSERT非権限を検証する。roleの作成・変更・grantは行わない。

duplicate lookupは`source_refs_json->>'idempotency_key'`だけを条件にし、statusで絞らない。INSERT transactionは同じsemantic idempotency keyから得た`hashtextextended`を使うadvisory transaction lockで直列化し、lock取得後にexistingを再確認する。したがってunique indexやmigrationなしでも同一keyの並行INSERTを1件へ集約する。固定parameterized SQL以外をrepository callerから受け取らない。

atomic INSERT結果の`inserted=true`では返却summary IDと要求record IDの一致を必須とする。`inserted=false`は既存recordの再利用を意味するため、同一deterministic UUIDでの再実行と異なる新規UUIDでの再実行をどちらも許可する。readinessに加え、read-only findとread-write insertの各transactionでもlocal socketを再確認する。

repositoryは`findExistingByIdempotencyKey`と`insertProposal`だけを実装し、UPDATE/DELETE、app/audit write、Proposal Apply、review decision、model、retryを提供しない。E2E fixtureは削除せず、deterministic keyを再利用してrerunnable/idempotentにする。Day127 handoffは保存済みProposalのlist/detail readである。

## Day130: Production explicit save

Productionの正式保存入口はserver-only package runnerとProduction adapterである。browserやAPI requestからDB接続情報、role、target、任意のProposal payloadを受け取らない。runnerはPilot identity provider、request authentication helper、authenticated actor parserを順に通し、administratorだけを許可する。candidateは既存candidate boundaryで生成し、保存時には既存explicit-save boundaryが再検証する。

```text
candidate generation
  -> explicit save (administrator + two gates + one candidate)
  -> Proposal Review
  -> Proposal Apply (separate human-approved boundary)
```

これらはそれぞれ別の状態遷移である。

- Proposal生成 ≠ Proposal保存
- Proposal保存 ≠ Review
- Review ≠ Apply

runnerは既定でdiagnoseとなり、enablementとsource-fixed confirmationの2条件が不足する場合はDBへ接続せずdeniedとなる。2条件が揃っても`--apply`が唯一の追加引数でなければINSERTしない。入力はexact schemaのcandidate 1件だけで、配列や未知key、expired candidate、Apply済みcandidate、review列が設定されたcandidateを拒否する。confirmation値、credential、actor ID、Proposal IDはsafe JSONへ含めない。

Production adapterはProposal Reviewの正式database target parserを再利用する一方、Review runtimeとは別のINSERT専用runtime materialを要求する。接続後はtarget、runtime role、relation contractと最小権限をread-only transactionで確認する。保存mutationは固定parameterized INSERTを含む単一transactionで、semantic idempotency keyのadvisory lock、既存確認、exact response parse、postconditionがすべて成立した場合だけcommitする。失敗はrollbackし、retryは行わない。

Production経路はProposal tableへのINSERT以外を提供せず、UPDATE、DELETE、Review POST、Proposal Apply、app/Sales業務row write、audit write、role/permission変更を行わない。fixture apply runnerやfixture identifierをProduction runnerへ流用しない。

### Dedicated Production writer provisioning

Production explicit-save writerはReview runtimeと分離したsource-fixed LOGIN roleである。Provisioningはserver-onlyのdiagnose runnerとapply runnerだけを入口とし、browser route、Review POST、Proposal Apply、Proposal保存runnerからroleや権限を変更できない。

diagnoseはadministrator認証とProduction Review database targetを再利用し、`BEGIN READ ONLY`でcatalog contractを検査して必ずrollbackする。applyは別のenablementとsource-fixed confirmation、exact `--apply`引数、process environmentで渡すcredentialがすべて揃う場合だけ実行できる。credentialはparameter bindでtransaction-local settingへ渡し、SQL source、標準出力、result evidenceへ含めない。

apply transactionは固定writer roleを`LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION`で作成し、対象DB CONNECT、ai schema USAGE、`ai.proposal_inbox` SELECT/INSERTだけを付与する。同一transaction内のpostconditionが、UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER、schema CREATE、他relation、audit、app/Sales write、ownership、membershipの不存在を確認した場合だけcommitする。PostgreSQL 17では非superuserの`CREATEROLE` principalがroleを作成すると、bootstrap grantorによるcreator membershipが自動作成され、そのprincipal自身では除去できない。このためrole作成を伴うapply executorは明示的なbootstrap administrator connectionだけを受理し、writer runtime自身にはsuperuser属性もmembershipも残さない。既存roleがexact contractならread-only相当のrollbackで`already_applied`、不一致なら変更せずfail-closedとする。

ProvisioningはProposal rowをINSERTせず、Review decisionやProposal Applyも実行しない。isolated PostgreSQL testだけがfixture role/privilegeを作成し、Production targetやProduction credentialを使用しない。

### 隔離DB fixture bootstrap

Day114の隔離DBにはDaily Brief persistence relationは存在するが、Day126が必要とするProposal fixtureは元々含まれていない。専用bootstrapはproduction migrationではなく、明示targetが`farmos_core_day114_test`である場合だけ利用できるtest fixtureである。既存roleだけを使用し、roleやcredentialを新設・変更しない。

bootstrapが作成するのはDay3互換の`ai.proposal_inbox`とprotected Proposalだけである。Day17/Day35のApply基盤、app/audit relation、knowledge dependencyは作成も要求もしない。runtime roleにはai schema USAGEとProposal inbox SELECT/INSERTだけを許可し、UPDATE/DELETE/TRUNCATEとai schema CREATEを拒否する。repository側のapp/audit write privilege確認は、relationが存在しない場合もfalseとなる`pg_catalog.pg_class`/`pg_namespace`由来OIDを使用する。

DDLは、preflightでai schema ownerまたはai schema CREATE権限を確認した接続userのまま実行する。fixture bootstrap管理接続のsuperuser/BYPASSRLS属性は拒否条件にせず、runtime Proposal writerとは責務を分離する。一方、runtime roleはnon-superuserかつnon-BYPASSRLSを必須とする。固定owner roleへの`SET ROLE`、table owner変更、schema owner変更、CREATE権限の追加は行わない。`fixture_ready`はrelation存在だけでは成立せず、exact 19 columns、primary key、status/risk/confidence constraints、table owner OIDとai schema owner OIDの一致、protected rowのpending/unapplied状態、runtime最小権限、PUBLIC非公開をすべてcatalogと明示role privilege関数で検証する。接続userのrole名・superuser属性・BYPASSRLS属性はsafe resultへ返さない。

Day81互換のdeterministic protected Proposalを`ON CONFLICT DO NOTHING`で1件だけ用意する。これは利用者のexplicit saveではなく、E2E前後で既存Proposalのpending/unapplied状態が変化しないことを検証するbootstrap dataである。fixtureはrerunnableで、preflightと別の`HERMES_DAY126_FIXTURE_APPLY_ENABLED=true`が揃うまでschema writeを行わない。適用後にのみPostgres readinessとE2Eへ進み、Day127ではProposal list/detail readへhandoffする。

- Day126後半: 隔離された`ai.proposal_inbox` INSERT E2E
- Day127: Proposal一覧・詳細read
- Day128: 人間review decision
- Day129: 統合E2E
