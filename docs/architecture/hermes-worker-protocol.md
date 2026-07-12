# Hermes Worker Protocol Boundary

## Business Value

Day99は、Mac miniとRTX workerが将来同じQueue契約へ安全に参加するための `hermes.worker.v1` を定義する。capability、health、readiness、heartbeat、registry、job claim/resultをAI実行前に固定する。

## Worker types and capabilities

Worker typeは `mac_mini` と `rtx` である。capabilityはserver-sideの明示allowlistだけから設定し、model名、prompt、hardware検出から推測しない。

Mac mini既定候補はlightweight chat、structured summary、classification、read-only context analysis。RTX既定候補はheavy reasoning、large context、GPU inferenceである。既定候補は実routingや実行許可を意味しない。

## Health and readiness

Healthは `healthy / degraded / unhealthy / unknown`、readinessは `ready / not_ready / draining / offline` として分離する。runtime unavailableはnot-ready、draining指定はdraining、heartbeatが45秒以上staleならofflineである。

claim時は保存済みreadinessを信用せず、claim時刻でheartbeatを再評価する。offline、not-ready、draining、unhealthy、runtime unavailableはclaimできない。

## Capacity

Advertisementは `current_job_id`、`active_job_count`、`max_concurrency` を持つ。Day99既定はnull、0、1である。countは非負整数、maxは1以上、activeはmax以下とし、activeが0ならcurrent jobはnull、1以上ならjob IDを必須とする。heartbeatで明示更新でき、capacity full workerはclaimを拒否する。

## Heartbeat

通知間隔は15秒、timeoutは45秒。heartbeatはhealth、runtime availability、draining、last heartbeatをserver-owned recordへ反映する。常駐heartbeat processはDay99に含めない。

## Worker registry

Redis keyは `farmos:hermes:worker:<worker_id>` と `farmos:hermes:workers`。register、re-register、heartbeat、status、listを提供する。record TTLは90秒で、45秒以降のoffline状態を観測できる猶予を持つ。再heartbeatでTTLを更新する。

Redis recordは `hermes.worker.registry.v1` wrapperでAdvertisement、heartbeat count、last registered/updated時刻、安全フラグを分離する。初回countは0、heartbeatごとに1増える。再登録では元のregistered-atとcountを維持する。worker typeとcapabilityはDay99ではimmutableで、変更再登録をfail-closedで拒否する。

Registry disabledまたはRedis停止時は固定error codeでfail-closedとし、接続情報や内部例外を返さない。Secret、credentials、model名、promptを保存しない。

## Job claim contract

`hermes.worker.claim.v1` はprocessing/running jobとready worker、明示required capabilityから純粋に生成する。claim ID、request/job/worker ID、capability、timestampだけを持ち、Workerやmodelを実行しない。

claim recordは `farmos:hermes:claim:<job_id>` に `SET NX EX`で保存し、同一または別workerによる二重claimを原子的に拒否する。TTLはjobの残存TTL以下であり、競合時にJob TTLを変更しない。

claim成功時はWorker registryをownershipの正として、`current_job_id`をclaimed job、`active_job_count`を1増加、registry updated時刻をclaim時刻へ更新する。claim record作成とcapacity reservationは同じLua operationで原子的に行い、片側だけを残さない。同一Workerによる異なるjobの同時claimはcapacity fullで拒否する。

Day99はcapacity reservationまでを担当し、claim release、完了時のcapacity解放、Queue完了更新はDay100以降の別境界とする。

## Job result contract

`hermes.worker.result.v1` はclaimに対応するsucceeded/failed metadataの形を定義する。Day99ではdry-run契約のみで、出力保存、Queue完了更新、AI実行、DB/Proposal/Audit writeを行わない。

## Day98 boundary

Day98 Queue実装と公開APIは変更しない。RegistryはQueueとは別key空間であり、job claim/resultは純粋境界としてQueue recordを参照するだけである。

## Day100 boundary

Worker capabilityはDay100 Model Routerの入力候補になるが、Day99はprovider/model選択、Mac mini/RTX振り分け、GPU検出を実装しない。

Day100 Routerが利用できるsummaryはworker type、明示capability、effective readiness、health、runtime availability、draining、`active_job_count / max_concurrency`、current job、heartbeat時刻である。Secret、model名、prompt、接続情報は含めない。

Day100ではこのsummaryを純粋入力として固定task policy、eligibility、capacity、決定的ranking、軽量taskだけのfallback、failure分類を持つ `hermes.router.decision.v1` を追加した。RouterはWorker claimやregistry更新を行わない。

## Day101 recovery boundary

Day101はretry schedule/cancel時にDay99 claimを削除し、対象jobを保持するWorkerだけを原子的に解放する。active countは0未満にせず、別jobのcapacityを変更しない。Worker signalやmodel interruptは行わない。

## Day102 RTX startup request boundary

Day102はDay99の安全なWorker summaryを読み取り、RTXのoffline/not-ready/runtime-unavailable/missingを分類してwake request候補にする。registry、heartbeat、claim、capacityは変更せず、unhealthy、draining、capacity fullを起動対象にしない。

## Day103 approved wake execution

Day103はapproved wake requestを実行するが、Worker registry、heartbeat、claim、capacityを変更せず、起動復帰確認はDay104へ分離する。

## Smoke cleanup

smoke testは一意なDay99 prefixにMac mini/RTXの2 recordとworker setだけを作成し、その3 keyだけをcleanupする。広範な削除は行わない。

## Rollback

Worker runtime、unit/preview/smoke runner、package scripts、architecture文書とroadmap追記を取り除く。Day98 Queue、API、DB、RLS、Proposal、Applyのrollbackは不要である。
