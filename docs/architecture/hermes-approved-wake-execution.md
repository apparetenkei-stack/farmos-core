# Hermes Approved Wake Execution Gateway

## Business Value

Day103はDay102 wake requestを直接実行せず、2分以内の明示operator approval、Redis atomic reservation、server-side target解決を通した1回限りのexecution gatewayを定義する。

## Approval and execution policy

`hermes.wake.execution.approval.v1` はrequest/routing/Worker ID、operator、server-owned timestampだけを持ち、network targetを含めない。approval expiryは2分かwake request expiryの早い方である。`hermes.wake.execution.policy.v1` はapproval必須、RTX限定、`udp_wol`、port 9、requestごとのexecution上限1、自動実行禁止を固定する。

Approval保存はcallerのrequest objectを受け取らず、Redis上のcanonical wake requestを再取得・完全検証して照合する。同一approvalの再保存は保存済みcanonical recordを返し、recordを上書きせずTTLも延長しない。

## Eligibility and target resolver

requested、未期限切れ、RTX、target Workerあり、RTX専用capability、未実行のrequestと、IDが完全一致する未期限切れapprovalだけを許可する。server environmentのWorker IDとrequest targetを照合し、MAC、broadcast、portはruntime内だけで使用する。値をRedis、execution record、summary、logへ保存しない。

## Packet and sender

magic packetはFF 6byteと正規化MAC 6byteの16反復、合計102byteである。real adapterはNode UDP4 socketでconfigured address/portへ1 packetだけ送信し、retry、scan、複数送信を行わずsocketを閉じる。unit/preview/checkと通常Redis smokeはFake senderだけを使う。real runnerは永続設定だけでは実行できず、実行ごとの `--confirm-wake-send=SEND_ONE_WAKE_PACKET` とcanonical request/approvalを必須とする。

## Atomic reservation and result

Lua reservationはwake request、approval、status、ID、既存executionを検証し、request absolute expiry以下でreserved executionを保存する。既存executionは `wake_execution_duplicate`。送信成功はexecutionをsent、bytesを102、requestをacknowledgedへ更新する。失敗はexecutionをfailedと固定error codeへ更新し、requestはrequestedのまま維持する。自動再送しない。

## Redis and network separation

`hermes.wake.execution.v1` はexecution/request/approval/routing/Worker ID、transport、status、timestamps、固定error、byte数だけを保存する。network target、credentials、prompt、message、model情報、内部例外を保存しない。Redis停止はfail-closedである。

## Existing and next boundaries

Day102はwake request生成・duplicate・cooldownまでで、Day103はapproved executionだけを追加する。Worker registry、Router、Recoveryは変更しない。Day104はheartbeat復帰と実際の起動確認を扱い、Day103は起動成功そのものを判定しない。

## Rollback

`wake_runtime`、Day103 test/preview/smoke、package scripts、本書とDay103文書追記、Day102 status validatorの4状態対応だけを取り除く。DB、API、Worker、Router、Recoveryのrollbackは不要である。
