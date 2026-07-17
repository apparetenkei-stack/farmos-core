# Authorized real-data Daily Brief persistence

## Purpose

Day123後半は、4-source read-only実データからDaily Briefを明示的に生成し、既存のserver-owned persistence command、atomic repository transaction、persisted latest selector、authenticated latest-displayへ接続するone-shot境界を定義する。通常のreal-data smoke runnerは引き続きread-onlyであり、保存処理を持たない。

## Repository identity gate

pilot latest/latest-displayとone-shot runnerは同じproduction repository bundle factoryを使用し、固定された`ai.daily_farm_brief_records`と`ai.daily_farm_brief_persistence_commands`、同一のvalidated connection configurationを共有する。read capabilityは既存config gateで有効化され、write capabilityは追加のserver-only write enable gateがない限りdeny-by-defaultである。

新境界はFarmOS Core ownership、persisted record contract、records/command receipt relation、shared connection source、shared factory token、read/write capabilityをfactory内部のWeakMap evidenceから算出する。callerは`matched`を注入できない。全項目が一致しない場合、またはwrite capabilityがdisabledの場合、transaction callは0である。fixture-only testでは同一in-memory repositoryをwrite/readに使い、insert、reused、conflict、rollback、read-after-write、latest selector、administrator/general_staff latest-displayを検証する。

## Authorization and date

実行はdefault disabledで、server environmentのenable flagとexact confirmationの両方を要求する。対象日は`2026-07-17`（Asia/Tokyo）に固定し、server-owned canonical generated timestampの日付が一致しなければexternal read前に停止する。request ID、execution ID、command ID、record ID、idempotency keyはserver-ownedで、client inputからrole、scope、count、DB target、timestampを受け取らない。

Dry-runはsource status、freshness、source/input/selected/attention counts、relation validation、repository identity、persistence enable状態だけを出力し、writeしない。raw records、raw references、persistence identifiers、principal、DB名、connection情報、credentialは出力しない。

## Read-after-write and dashboard handoff

許可済みrepository bundleでは既存command builderとwrite serviceを一度だけ呼び、retryしない。保存後は同じread repositoryを一度だけ読み、Day112 latest selectorのcurrent sourceをadministratorとgeneral_staffのauthenticated latest-displayへ再利用する。administratorはsafe aggregateを確認でき、general_staffの4 countと2 booleanは全て`null`を維持する。source状態warningはsafe displayに残り、raw snapshot/fact/referenceは公開しない。

営農アプリ業務DB、work records、inventory、fields、crop cyclesへのwrite、Proposal保存、model execution、migration、RLS変更は行わない。production bundleはparameterized transaction adapterまで定義するが、actual persistenceはwrite enable、one-shot confirmation、日付gateが揃う別承認まで実行しない。

## Rollback and idempotency

同一execution/payloadはserver-owned idempotency keyによりreusedとなる。異なるpayloadの同一key/source executionはrejectする。transaction failureはrepository contractによりrollbackされ、read-after-writeまたはlatest-display検証失敗はsuccessとして報告しない。コードのrollbackは本変更ファイルをrevertすることであり、DB rollbackはatomic transaction内だけで行う。
