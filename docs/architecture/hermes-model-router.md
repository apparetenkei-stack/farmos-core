# Hermes Model Router Boundary

## Business Value

Day100は、server-sideで明示されたtask classとDay99 Worker summaryを照合し、安全で説明可能なrouting decisionを純粋関数として生成する。Worker claim、Queue更新、model実行は行わない。

## Task class and capability mapping

`hermes.router.requirement.v1` は7つのtask classを同名のWorker capabilityへ固定mappingする。lightweight chat、structured summary、classification、read-only context analysisはMac mini優先、heavy reasoning、large context、GPU inferenceはRTX優先である。

Task classはserver policyの明示入力だけから作り、prompt、message、文字数、model名、ブラウザ入力から推測しない。

## Preferred worker type

軽量4 taskはMac miniを優先し、同じcapabilityを持つready RTXへのfallbackを許可する。重量3 taskはRTXを優先し、Mac miniへ暗黙fallbackしない。

## Eligibility and effective readiness

候補はready、unhealthyでない、runtime available、not draining、capacityあり、capability一致、heartbeatがfreshである必要がある。Day99のeffective readiness評価をclaim予定時刻で再実行し、保存readinessだけを信用しない。

Worker summaryはTypeScript型だけを信用せず、Worker ID/type、health、readiness、capability allowlistと重複、boolean fields、ISO heartbeat、capacity/current job整合性をruntime検証する。不正recordは `worker_record_invalid` でfail-closedとし、ranking、fallback、selected workerへ渡さない。不正recordしかない場合は `no_ready_worker / no_valid_worker_available` を返す。

除外理由はoffline、not-ready、draining、unhealthy、runtime unavailable、capacity full、capability unavailable、record invalidの固定コードで表す。

## Capacity

`active_job_count < max_concurrency` のWorkerだけを候補にする。Routerはcapacityを参照するだけで、reservation、current job更新、claim、releaseを行わない。

## Candidate ranking

選定順はpreferred type一致、capacity比率の低さ、active countの少なさ、heartbeatの新しさ、worker ID昇順である。random選択は使わず、同じ入力は同じWorkerを選ぶ。

## Fallback

Mac mini優先taskでpreferred候補がなく、policyがfallbackを許可し、必要capabilityを持つready RTXがいる場合だけfallbackする。使用時は `fallback_worker_selected` を返す。重量taskのfallbackはDay100では禁止する。

## Failure classification

- capability保有Workerが0: `capability_unavailable`
- capability保有Workerが全てcapacity full: `no_capacity`
- capability保有Workerがoffline/not-ready/draining: `no_ready_worker`
- fallback禁止typeしか候補がない: `routing_not_allowed`

## Routing decision and safe summary

`hermes.router.decision.v1` はserver-owned decision IDと時刻、requirement、選択Worker ID/type/capability/capacity、候補数、fallback、固定reason code、安全フラグを持つ。safe summaryは表示に必要な同項目だけを返す。

prompt、message、conversation、Redis URL、credentials、hostname、IP、model endpoint/path、内部例外を保持しない。具体的なmodel profileとprovider選択は後続境界で扱う。

## Day99 Worker boundary

入力はDay99の安全なWorker registry summary相当フィールドだけである。Worker registry、heartbeat、capacity reservation、atomic claim、claim conflict、result contractは変更しない。Routerからclaim関数を呼ばない。

## Day101 retry and cancellation boundary

Day100はretry、cancel、claim release、capacity解放を行わない。Day101はrouting decisionとは別にtimeout/retry/cancel policyとatomic recovery storeを追加した。Routerのdecision、ranking、fallbackに副作用は追加していない。

## Day102 WOL and RTX startup boundary

Day100はoffline RTXを起動せず、network起動、remote接続、GPU検出を行わない。Day102はRTX必須taskの `no_ready_worker` decisionだけを読み取り、required capabilityを持つRTX集合を再検証して別のatomic storeへwake requestを保存する。capable ready Workerと `no_ready_worker` の矛盾はfail-closed、heartbeat staleは古いcapacityより優先する。Router schemaと副作用なし契約は変更せず、`no_capacity` はstartupへ変換しない。decision canonical replayはrequest有効期間内だけで、失効後のcooldown中は同一decisionも拒否する。

## Rollback

Router runtime、unit test、preview、package scripts、Day100文書追記だけを取り除く。Worker、Queue、Job、API、DB、RLS、Proposal、Applyのrollbackは不要である。
