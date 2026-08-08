import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
  type FarmOsStableChangesPage,
} from "./farm_os_operational_memory_contract";
import {
  FARM_OS_PROJECTION_FIRST_INSTALLATION_TIMEZONE,
  parseFarmOsProjectionFirstInstallationBinding,
} from "./farm_os_projection_first_installation_binding";
import {
  FarmOsStableChangesPersistenceError,
  parseFarmOsStableChangesScope,
  validateFarmOsStableChangesPageForScope,
  type FarmOsStableChangesCheckpoint,
  type FarmOsStableChangesPersistenceRepository,
  type FarmOsStableChangesScope,
} from "./farm_os_stable_changes_persistence";

export const FARM_OS_STABLE_CHANGES_HTTP_ENDPOINT =
  "/api/farmos-core/work-record-stable-changes" as const;
export const FARM_OS_STABLE_CHANGES_HTTP_CAPABILITY =
  "stable_changes_read" as const;
export const FARM_OS_STABLE_CHANGES_HTTP_MAX_RESPONSE_BYTES = 256 * 1024;
export const FARM_OS_STABLE_CHANGES_HTTP_DEFAULT_TIMEOUT_MS = 8_000;
export const FARM_OS_STABLE_CHANGES_HTTP_MAX_RETRIES = 2;
export const FARM_OS_STABLE_CHANGES_HTTP_DEFAULT_MAX_PAGES = 10;
export const FARM_OS_STABLE_CHANGES_HTTP_DEFAULT_MAX_CHANGES = 1_000;

export const FARM_OS_STABLE_CHANGES_HTTP_ENV = Object.freeze({
  base_url: "FARMOS_STABLE_CHANGES_HTTP_BASE_URL",
  bearer: "FARMOS_STABLE_CHANGES_HTTP_BEARER",
  contract_version: "FARMOS_STABLE_CHANGES_CONTRACT_VERSION",
  from_business_date: "FARMOS_STABLE_CHANGES_FROM_BUSINESS_DATE",
  to_business_date: "FARMOS_STABLE_CHANGES_TO_BUSINESS_DATE",
  page_size: "FARMOS_STABLE_CHANGES_PAGE_SIZE",
  timeout_ms: "FARMOS_STABLE_CHANGES_TIMEOUT_MS",
});

export type FarmOsStableChangesHttpConsumerErrorCode =
  | "CONFIGURATION_ERROR"
  | "TRANSPORT_UNAVAILABLE"
  | "NON_RETRYABLE_HTTP"
  | "CONTRACT_INVALID"
  | "CHECKPOINT_CONFLICT"
  | "PERSISTENCE_UNAVAILABLE"
  | "COMMIT_OUTCOME_UNKNOWN";

export class FarmOsStableChangesHttpConsumerError extends Error {
  constructor(readonly code: FarmOsStableChangesHttpConsumerErrorCode) {
    super(code);
    this.name = "FarmOsStableChangesHttpConsumerError";
  }
}

export type FarmOsStableChangesHttpConsumerConfig = Readonly<{
  base_url: string;
  bearer: string;
  timeout_ms: number;
  scope: FarmOsStableChangesScope;
}>;

export type FarmOsStableChangesHttpObservation = Readonly<{
  contract_version: typeof FARM_OS_STABLE_CHANGES_CONTRACT_ID;
  status_class: "2xx" | "3xx" | "4xx" | "5xx" | "network";
  latency_ms: number;
  page_count: number;
  change_count: number;
  accepted_count: number;
  duplicate_count: number;
  has_more: boolean | null;
  retry_count: number;
  checkpoint_generation: string;
}>;

export type FarmOsStableChangesHttpConsumerResult = Readonly<{
  result: "complete" | "partial_bounded_completion";
  page_count: number;
  change_count: number;
  accepted_count: number;
  duplicate_count: number;
  retry_count: number;
  checkpoint_generation: string;
  has_more: boolean;
  downstream_snapshot_write_performed: false;
  candidate_generation_performed: false;
  projection_generation_performed: false;
  promotion_performed: false;
  active_write_performed: false;
  app_writeback_performed: false;
}>;

type Environment = Readonly<Record<string, string | undefined>>;
type FetchPageResult = Readonly<{
  page: FarmOsStableChangesPage;
  retry_count: number;
  latency_ms: number;
}>;

function configurationError(): never {
  throw new FarmOsStableChangesHttpConsumerError("CONFIGURATION_ERROR");
}

function parseInteger(
  value: string | undefined,
  minimum: number,
  maximum: number,
  fallback?: number,
): number | null {
  if ((value === undefined || value === "") && fallback !== undefined) {
    return fallback;
  }
  if (typeof value !== "string" || !/^[0-9]+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function parseBaseUrl(value: string | undefined): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const parsed = new URL(value.trim());
    const isLiteralLoopback = parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "[::1]" || parsed.hostname === "::1";
    if ((parsed.protocol !== "https:" &&
        !(parsed.protocol === "http:" && isLiteralLoopback)) ||
      parsed.username !== "" || parsed.password !== "" ||
      parsed.search !== "" || parsed.hash !== "" ||
      (parsed.pathname !== "" && parsed.pathname !== "/")) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

class FarmOsStableChangesHttpStreamTransportError extends Error {}

export function loadFarmOsStableChangesHttpConsumerConfig(
  environment: Environment,
): FarmOsStableChangesHttpConsumerConfig {
  const binding = parseFarmOsProjectionFirstInstallationBinding({
    installation_id: environment.FARMOS_INSTALLATION_ID,
    farm_scope: environment.FARMOS_AUTHORIZED_FARM_SCOPE,
    timezone: environment.FARMOS_BUSINESS_TIMEZONE,
  });
  const pageSize = parseInteger(
    environment[FARM_OS_STABLE_CHANGES_HTTP_ENV.page_size], 1, 100,
  );
  const timeoutMs = parseInteger(
    environment[FARM_OS_STABLE_CHANGES_HTTP_ENV.timeout_ms],
    50,
    FARM_OS_STABLE_CHANGES_HTTP_DEFAULT_TIMEOUT_MS,
    FARM_OS_STABLE_CHANGES_HTTP_DEFAULT_TIMEOUT_MS,
  );
  const baseUrl = parseBaseUrl(
    environment[FARM_OS_STABLE_CHANGES_HTTP_ENV.base_url],
  );
  const bearer = environment[FARM_OS_STABLE_CHANGES_HTTP_ENV.bearer]?.trim();
  const scope = parseFarmOsStableChangesScope({
    contract_version:
      environment[FARM_OS_STABLE_CHANGES_HTTP_ENV.contract_version],
    installation_id: binding?.installation_id,
    farm_id: binding?.farm_scope,
    from_business_date:
      environment[FARM_OS_STABLE_CHANGES_HTTP_ENV.from_business_date],
    to_business_date:
      environment[FARM_OS_STABLE_CHANGES_HTTP_ENV.to_business_date],
    page_size: pageSize,
  });
  if (binding === null ||
    binding.timezone !== FARM_OS_PROJECTION_FIRST_INSTALLATION_TIMEZONE ||
    baseUrl === null || bearer === undefined || bearer.length < 16 ||
    bearer.length > 4_096 || /[\r\n]/u.test(bearer) ||
    timeoutMs === null || scope === null) return configurationError();
  return Object.freeze({ base_url: baseUrl, bearer, timeout_ms: timeoutMs, scope });
}

function statusClass(status: number): "2xx" | "3xx" | "4xx" | "5xx" {
  return status >= 500 ? "5xx" : status >= 400 ? "4xx" :
    status >= 300 ? "3xx" : "2xx";
}

function retryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function retryAfterMs(value: string | null, nowMs: number): number | null {
  if (value === null) return null;
  if (/^[0-9]+$/u.test(value)) {
    return Math.min(Number(value) * 1_000, 8_000);
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(0, parsed - nowMs), 8_000) : null;
}

async function boundedBody(response: Response): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared !== null && (/^[0-9]+$/u.test(declared) === false ||
    Number(declared) > FARM_OS_STABLE_CHANGES_HTTP_MAX_RESPONSE_BYTES)) {
    await response.body?.cancel().catch(() => undefined);
    throw new FarmOsStableChangesHttpConsumerError("CONTRACT_INVALID");
  }
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let text = "";
  while (true) {
    let item: ReadableStreamReadResult<Uint8Array>;
    try {
      item = await reader.read();
    } catch {
      await reader.cancel().catch(() => undefined);
      throw new FarmOsStableChangesHttpStreamTransportError();
    }
    if (item.done) break;
    total += item.value.byteLength;
    if (total > FARM_OS_STABLE_CHANGES_HTTP_MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new FarmOsStableChangesHttpConsumerError("CONTRACT_INVALID");
    }
    try {
      text += decoder.decode(item.value, { stream: true });
    } catch {
      await reader.cancel().catch(() => undefined);
      throw new FarmOsStableChangesHttpConsumerError("CONTRACT_INVALID");
    }
  }
  try {
    text += decoder.decode();
    return text;
  } catch {
    await reader.cancel().catch(() => undefined);
    throw new FarmOsStableChangesHttpConsumerError("CONTRACT_INVALID");
  }
}

function mapPersistenceError(error: unknown): FarmOsStableChangesHttpConsumerError {
  if (error instanceof FarmOsStableChangesHttpConsumerError) return error;
  if (error instanceof FarmOsStableChangesPersistenceError) {
    if (error.code === "CHECKPOINT_CONFLICT") {
      return new FarmOsStableChangesHttpConsumerError("CHECKPOINT_CONFLICT");
    }
    if (error.code === "COMMIT_OUTCOME_UNKNOWN") {
      return new FarmOsStableChangesHttpConsumerError("COMMIT_OUTCOME_UNKNOWN");
    }
    if (error.code === "INGRESS_CONTRACT_INVALID" ||
      error.code === "ORDERING_REGRESSION" || error.code === "DEDUPE_CONFLICT") {
      return new FarmOsStableChangesHttpConsumerError("CONTRACT_INVALID");
    }
  }
  return new FarmOsStableChangesHttpConsumerError("PERSISTENCE_UNAVAILABLE");
}

export class FarmOsStableChangesHttpConsumer {
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly now: () => number;
  private readonly observedAt: () => string;
  private readonly onObservation?: (value: FarmOsStableChangesHttpObservation) => void;
  private readonly maxPages: number;
  private readonly maxChanges: number;

  constructor(private readonly input: {
    config: FarmOsStableChangesHttpConsumerConfig;
    repository: FarmOsStableChangesPersistenceRepository;
    fetchImpl?: typeof fetch;
    sleep?: (milliseconds: number) => Promise<void>;
    now?: () => number;
    observedAt?: () => string;
    onObservation?: (value: FarmOsStableChangesHttpObservation) => void;
    limits?: { max_pages: number; max_changes: number };
  }) {
    if (Object.keys(input.config).length !== 4 ||
      parseBaseUrl(input.config.base_url) !== input.config.base_url ||
      input.config.bearer.length < 16 || input.config.bearer.length > 4_096 ||
      /[\r\n]/u.test(input.config.bearer) ||
      !Number.isSafeInteger(input.config.timeout_ms) ||
      input.config.timeout_ms < 50 ||
      input.config.timeout_ms > FARM_OS_STABLE_CHANGES_HTTP_DEFAULT_TIMEOUT_MS ||
      parseFarmOsStableChangesScope(input.config.scope) === null ||
      (input.limits !== undefined &&
        (!Number.isSafeInteger(input.limits.max_pages) ||
          input.limits.max_pages < 1 ||
          input.limits.max_pages > FARM_OS_STABLE_CHANGES_HTTP_DEFAULT_MAX_PAGES ||
          !Number.isSafeInteger(input.limits.max_changes) ||
          input.limits.max_changes < 1 ||
          input.limits.max_changes > FARM_OS_STABLE_CHANGES_HTTP_DEFAULT_MAX_CHANGES))) {
      configurationError();
    }
    this.fetchImpl = input.fetchImpl ?? fetch;
    this.sleep = input.sleep ?? (async (milliseconds) =>
      await new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.now = input.now ?? Date.now;
    this.observedAt = input.observedAt ?? (() => new Date().toISOString());
    this.onObservation = input.onObservation;
    this.maxPages = input.limits?.max_pages ??
      FARM_OS_STABLE_CHANGES_HTTP_DEFAULT_MAX_PAGES;
    this.maxChanges = input.limits?.max_changes ??
      FARM_OS_STABLE_CHANGES_HTTP_DEFAULT_MAX_CHANGES;
  }

  private observe(value: FarmOsStableChangesHttpObservation): void {
    try {
      this.onObservation?.(value);
    } catch {
      // Observability is best-effort and must not alter persistence control flow.
    }
  }

  private async fetchPage(
    checkpoint: FarmOsStableChangesCheckpoint,
    pageCount: number,
  ): Promise<FetchPageResult> {
    const url = new URL(FARM_OS_STABLE_CHANGES_HTTP_ENDPOINT,
      this.input.config.base_url);
    const scope = this.input.config.scope;
    url.searchParams.set("contract_version", scope.contract_version);
    url.searchParams.set("from_business_date", scope.from_business_date);
    url.searchParams.set("to_business_date", scope.to_business_date);
    if (checkpoint.cursor !== null) url.searchParams.set("cursor", checkpoint.cursor);
    url.searchParams.set("limit", String(scope.page_size));
    let retries = 0;
    let started = this.now();
    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.input.config.timeout_ms);
      let response: Response;
      try {
        started = this.now();
        response = await this.fetchImpl(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.input.config.bearer}`,
            "X-FarmOS-Capability": FARM_OS_STABLE_CHANGES_HTTP_CAPABILITY,
            "X-FarmOS-Installation-Id": scope.installation_id,
            "X-Farm-Id": scope.farm_id,
          },
          cache: "no-store",
          redirect: "manual",
          signal: controller.signal,
        });
      } catch {
        clearTimeout(timeout);
        this.observe({
          contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
          status_class: "network", latency_ms: Math.max(0, this.now() - started),
          page_count: pageCount, change_count: 0, accepted_count: 0,
          duplicate_count: 0, has_more: null, retry_count: retries,
          checkpoint_generation: checkpoint.generation,
        });
        if (retries >= FARM_OS_STABLE_CHANGES_HTTP_MAX_RETRIES) {
          throw new FarmOsStableChangesHttpConsumerError("TRANSPORT_UNAVAILABLE");
        }
        await this.sleep(retries === 0 ? 250 : 1_000);
        retries += 1;
        continue;
      }
      const latency = Math.max(0, this.now() - started);
      if (response.redirected ||
        (response.status >= 300 && response.status < 400)) {
        clearTimeout(timeout);
        await response.body?.cancel().catch(() => undefined);
        throw new FarmOsStableChangesHttpConsumerError("NON_RETRYABLE_HTTP");
      }
      if (!response.ok) {
        clearTimeout(timeout);
        await response.body?.cancel().catch(() => undefined);
        this.observe({
          contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
          status_class: statusClass(response.status), latency_ms: latency,
          page_count: pageCount, change_count: 0, accepted_count: 0,
          duplicate_count: 0, has_more: null, retry_count: retries,
          checkpoint_generation: checkpoint.generation,
        });
        if (!retryable(response.status)) {
          throw new FarmOsStableChangesHttpConsumerError("NON_RETRYABLE_HTTP");
        }
        if (retries >= FARM_OS_STABLE_CHANGES_HTTP_MAX_RETRIES) {
          throw new FarmOsStableChangesHttpConsumerError("TRANSPORT_UNAVAILABLE");
        }
        const delay = retryAfterMs(response.headers.get("retry-after"), this.now()) ??
          (retries === 0 ? 250 : 1_000);
        await this.sleep(delay);
        retries += 1;
        continue;
      }
      let raw: unknown;
      try {
        const body = await boundedBody(response);
        clearTimeout(timeout);
        raw = JSON.parse(body);
      } catch (error) {
        clearTimeout(timeout);
        if (controller.signal.aborted ||
          error instanceof FarmOsStableChangesHttpStreamTransportError) {
          this.observe({
            contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
            status_class: "network",
            latency_ms: Math.max(0, this.now() - started),
            page_count: pageCount, change_count: 0, accepted_count: 0,
            duplicate_count: 0, has_more: null, retry_count: retries,
            checkpoint_generation: checkpoint.generation,
          });
          if (retries >= FARM_OS_STABLE_CHANGES_HTTP_MAX_RETRIES) {
            throw new FarmOsStableChangesHttpConsumerError(
              "TRANSPORT_UNAVAILABLE",
            );
          }
          await this.sleep(retries === 0 ? 250 : 1_000);
          retries += 1;
          continue;
        }
        if (error instanceof FarmOsStableChangesHttpConsumerError) throw error;
        throw new FarmOsStableChangesHttpConsumerError("CONTRACT_INVALID");
      }
      let page: FarmOsStableChangesPage;
      try {
        page = validateFarmOsStableChangesPageForScope({
          scope,
          page: raw,
          lower_bound: checkpoint.last_source_updated_at === null ? null : {
            source_updated_at: checkpoint.last_source_updated_at,
            change_sequence: checkpoint.last_change_sequence!,
          },
        });
      } catch {
        throw new FarmOsStableChangesHttpConsumerError("CONTRACT_INVALID");
      }
      return { page, retry_count: retries, latency_ms: latency };
    }
  }

  async run(): Promise<FarmOsStableChangesHttpConsumerResult> {
    let pages = 0;
    let changes = 0;
    let accepted = 0;
    let duplicates = 0;
    let retries = 0;
    let checkpoint: FarmOsStableChangesCheckpoint;
    try {
      checkpoint = await this.input.repository.loadCheckpoint(this.input.config.scope);
    } catch (error) {
      throw mapPersistenceError(error);
    }
    while (true) {
      const fetched = await this.fetchPage(checkpoint, pages);
      retries += fetched.retry_count;
      if (changes + fetched.page.changes.length > this.maxChanges) {
        return this.result("partial_bounded_completion", pages, changes,
          accepted, duplicates, retries, checkpoint, true);
      }
      let committed;
      try {
        committed = await this.input.repository.commitPage({
          scope: this.input.config.scope,
          expectedGeneration: checkpoint.generation,
          requestCursor: checkpoint.cursor,
          validatedPage: fetched.page,
          observedAt: this.observedAt(),
        });
      } catch (error) {
        throw mapPersistenceError(error);
      }
      checkpoint = committed.checkpoint;
      pages += 1;
      changes += fetched.page.changes.length;
      accepted += checkpoint.last_accepted_count ?? 0;
      duplicates += checkpoint.last_duplicate_count ?? 0;
      this.observe({
        contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
        status_class: "2xx", latency_ms: fetched.latency_ms,
        page_count: pages, change_count: changes, accepted_count: accepted,
        duplicate_count: duplicates, has_more: fetched.page.has_more,
        retry_count: retries, checkpoint_generation: checkpoint.generation,
      });
      if (!fetched.page.has_more) {
        return this.result("complete", pages, changes, accepted, duplicates,
          retries, checkpoint, false);
      }
      if (pages >= this.maxPages || changes >= this.maxChanges) {
        return this.result("partial_bounded_completion", pages, changes,
          accepted, duplicates, retries, checkpoint, true);
      }
      try {
        checkpoint = await this.input.repository.loadCheckpoint(
          this.input.config.scope,
        );
      } catch (error) {
        throw mapPersistenceError(error);
      }
    }
  }

  private result(
    result: "complete" | "partial_bounded_completion",
    pageCount: number,
    changeCount: number,
    acceptedCount: number,
    duplicateCount: number,
    retryCount: number,
    checkpoint: FarmOsStableChangesCheckpoint,
    hasMore: boolean,
  ): FarmOsStableChangesHttpConsumerResult {
    return Object.freeze({
      result, page_count: pageCount, change_count: changeCount,
      accepted_count: acceptedCount, duplicate_count: duplicateCount,
      retry_count: retryCount, checkpoint_generation: checkpoint.generation,
      has_more: hasMore, downstream_snapshot_write_performed: false,
      candidate_generation_performed: false,
      projection_generation_performed: false, promotion_performed: false,
      active_write_performed: false, app_writeback_performed: false,
    });
  }
}
