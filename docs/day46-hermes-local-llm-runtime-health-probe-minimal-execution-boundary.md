# Day46: Hermes Local LLM Runtime Health Probe Minimal Execution Boundary

## 目的

Day46では、Day45の `dry_run_contract_only` health check boundary を維持したまま、Hermes local LLM runtime に対する最小到達性確認だけを許可する。

これは Hermes が local LLM に業務 prompt を送る実装ではない。
これは Ollama / LM Studio / OpenAI互換API の generate/chat/completions endpoint を呼ぶ実装ではない。
これは chat 履歴保存、proposal生成、proposal apply、DB書き込みを行う実装ではない。

Day46で許可するのは、明示的に設定された safe health endpoint に対する GET または HEAD の最小HTTP到達性確認だけである。

## Day46で許可すること

- safe config key name の表示
- runtime provider type の表示
- timeout policy の表示
- fallback policy の表示
- `HERMES_LOCAL_LLM_HEALTH_ENDPOINT` の設定有無による最小到達性判定
- HTTP method: GET または HEAD のみ
- request body なし
- response body 非表示
- status code 由来の到達可否の丸め込み
- local runtime が未設定・未到達・timeout・error の場合は mock fallback を維持

## Day46で禁止すること

- 業務 prompt 送信
- Hermes相談本文の送信
- 提案レビュー本文の送信
- restricted-domain data の送信
- chat履歴保存
- proposal生成
- proposal apply
- app schema write
- ai.proposal_inbox write
- audit apply event write
- POST / PUT / PATCH / DELETE
- Server Action
- Form Action
- request body
- response body表示
- endpoint実値表示
- model実値表示
- credential実値表示
- OpenAI SDK
- Claude SDK
- Gemini SDK
- external API call
- embeddings生成
- vector DB write
- Qdrant write
- MinIO write

## 禁止endpoint

Day46では以下の inference endpoint を明示的に禁止する。

- `/api/generate`
- `/api/chat`
- `/v1/chat/completions`
- `/v1/completions`
- `/chat/completions`
- `/completions`

これらの path が `HERMES_LOCAL_LLM_HEALTH_ENDPOINT` または入力 endpoint に含まれる場合、health probe は `blocked` を返す。

## 許可するhealth endpoint候補

Day46では以下のみを safe health endpoint として扱う。

- `/`
- `/health`
- `/api/tags`
- `/v1/models`

ただし、`/api/tags` や `/v1/models` を使う場合でも、response body は読まない・保存しない・表示しない。

## 出力方針

Day46の health probe boundary は以下のような安全metadataだけを返す。

- `health_probe_mode = minimal_runtime_reachability_probe`
- `runtime = local_llm`
- `configured_provider = local_llm_probe`
- `endpoint_config_key = HERMES_LOCAL_LLM_HEALTH_ENDPOINT`
- `model_config_key = HERMES_LOCAL_LLM_MODEL`
- `endpoint_value_exposed = false`
- `model_value_exposed = false`
- `credentials_required = false`
- `credentials_exposed = false`
- `runtime_reachable = reachable | unreachable | not_configured | blocked | timeout | error`
- `runtime_call_allowed = true_for_health_probe_only`
- `prompt_sent = false`
- `request_body_sent = false`
- `response_body_exposed = false`
- `fallback_provider = mock`
- `writes_performed = false`
- `chat_history_write_allowed = false`
- `ai_proposal_write_allowed = false`
- `proposal_apply_allowed = false`
- `llm_runtime_executed = false`
- `local_model_called = false`
- `local_runtime_generate_http_called = false`
- `prompt_sent_to_model = false`
- `tokens_used = 0`

## Day45 boundaryとの関係

Day45の `hermes_local_llm_runtime_health_check_boundary` は変更しない。
Day45は dry-run contract only。
Day46は minimal runtime reachability probe。

この2つは別境界として維持する。

## adapter switchとの関係

`hermes_llm_adapter_switch_boundary` は、local provider が要求された場合に Day45 health check status と Day46 health probe status を参照できる。

ただし、Day46でも `selected_provider = mock` を維持する。
local providerは推論実行不可。
adapter resultは返さない。
fallback metadataのみ返す。

## Day47以降

Day47以降で local model prompt smoke test を検討する場合でも、Day46 health probe boundaryとは別境界にする。

Day47で検討できるのは、非業務・固定文の smoke prompt のみである。
業務データ、restricted-domain data、Hermes本番相談本文、proposal本文、chat履歴保存、proposal生成、proposal apply、DB書き込みは引き続き禁止する。
