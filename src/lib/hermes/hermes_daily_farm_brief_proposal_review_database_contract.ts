export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS = {
  enabled: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENABLED",
  host: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_HOST",
  port: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_PORT",
  database: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_NAME",
  user: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_USER",
  credential: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_PASSWORD",
  ssl: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_SSL_MODE",
  connect: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_CONNECT_TIMEOUT_MS",
  statement: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_STATEMENT_TIMEOUT_MS",
  lock: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_LOCK_TIMEOUT_MS",
} as const;

export type HermesDailyFarmBriefProposalReviewDatabaseConfig = {
  schema_version: "hermes.daily_farm_brief.proposal_review_database_config.v1";
  enabled: true;
  host_present: true;
  port: number;
  database_name: string;
  user_present: true;
  ssl_mode: "disable" | "require" | "verify-full";
  connect_timeout_ms: number;
  statement_timeout_ms: number;
  lock_timeout_ms: number;
  application_name: "farmos-core-hermes-proposal-review";
  retry_count: 0;
};

export type HermesDailyFarmBriefProposalReviewDatabaseTarget = {
  host: string;
  port: number;
  databaseName: string;
};

const DATABASE_NAME = /^[a-z][a-z0-9_]{0,62}$/u;
const FORBIDDEN_DATABASE_NAMES = new Set([
  "postgres",
  "farmos_core_restore_test",
  "farmos_core_day114_test",
]);

function boundedInteger(value: string | undefined, minimum: number, maximum: number): number | null {
  if (value === undefined || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export function parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): HermesDailyFarmBriefProposalReviewDatabaseConfig | null {
  const keys = HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS;
  const host = environment[keys.host];
  const databaseName = environment[keys.database];
  const user = environment[keys.user];
  const credential = environment[keys.credential];
  const port = boundedInteger(environment[keys.port], 1, 65_535);
  const connectTimeout = boundedInteger(environment[keys.connect], 100, 10_000);
  const statementTimeout = boundedInteger(environment[keys.statement], 100, 30_000);
  const lockTimeout = boundedInteger(environment[keys.lock], 100, 5_000);
  const sslMode = environment[keys.ssl];
  if (
    environment[keys.enabled] !== "true" || !host || !databaseName || !user || !credential ||
    port === null || connectTimeout === null || statementTimeout === null || lockTimeout === null ||
    !DATABASE_NAME.test(databaseName) || FORBIDDEN_DATABASE_NAMES.has(databaseName) ||
    !["disable", "require", "verify-full"].includes(sslMode ?? "") ||
    (sslMode === "disable" && host !== "127.0.0.1" && host !== "localhost")
  ) return null;
  return {
    schema_version: "hermes.daily_farm_brief.proposal_review_database_config.v1",
    enabled: true,
    host_present: true,
    port,
    database_name: databaseName,
    user_present: true,
    ssl_mode: sslMode as "disable" | "require" | "verify-full",
    connect_timeout_ms: connectTimeout,
    statement_timeout_ms: statementTimeout,
    lock_timeout_ms: lockTimeout,
    application_name: "farmos-core-hermes-proposal-review",
    retry_count: 0,
  };
}

export function proposalReviewDatabaseTarget(
  environment: Readonly<Record<string, string | undefined>>,
  config: HermesDailyFarmBriefProposalReviewDatabaseConfig,
): HermesDailyFarmBriefProposalReviewDatabaseTarget | null {
  const host = environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.host];
  return host ? { host, port: config.port, databaseName: config.database_name } : null;
}
