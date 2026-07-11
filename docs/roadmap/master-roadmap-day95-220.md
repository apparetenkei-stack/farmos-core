# FarmOS Core Master Roadmap

## North Star

Agricultural Knowledge OS を構築し、農場全体の知識、方針、提案、承認、実行結果を安全につなぐ。

FarmOS Core は Proposal、Knowledge、Policy、Audit、AI 推論、RAG、予測、提案を担う。営農アプリが保持する作業、圃場、作期、人員、資材、在庫などの業務事実を代替しない。

## Milestones

- Day120: 農園主向け AI 参謀
- Day130: Proposal 運用
- Day145: 承認後 Apply
- Day160: 現場中核業務
- Day180: 生産・販売統合参謀
- Day200: Brand / Content
- Day220: 統合安定稼働

## Production AI Runtime Platform

Day96〜105 は Production AI Runtime Platform フェーズとする。運用 AI リクエストの共通契約を起点に、後続の Queue、Worker、監視、Model Router を安全境界ごとに段階導入する。

このフェーズでも Proposal First、Human in the Loop、fail-closed、業務 DB への AI 直接 write 禁止を維持する。各段階は独立して rollback 可能であり、未接続、未取得、失敗、権限なしを同一状態として扱わない。

Day97では、Redis接続前の独立した `hermes.job.v1` Job Envelope、status遷移、payload分離、固定TTLを確定する。実Queue接続とjob persistenceはDay98の別境界とする。

Day98では `hermes.job.v1` を維持したまま、Redis primitiveによる `hermes.queue.v1`、重複抑止、dequeue、status、retry count保持、dead-letter隔離、TTL、停止時fail-closedを確定する。常駐WorkerとAI実行はDay99以降の別境界とする。

Day99では `hermes.worker.v1`、Mac mini/RTX capability、health/readiness、heartbeat、Redis Worker registry、job claim/resultを確定する。常駐Worker、AI/model実行、WOL、SSH、GPU検出、worker routingは実装しない。
