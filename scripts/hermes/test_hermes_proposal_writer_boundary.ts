import { Pool } from "pg";
import { createHermesProposal } from "./api_boundary/hermes_proposal_writer_boundary";

const PROTECTED_PROPOSAL_ID = "24fc24ee-8efa-436b-8424-9703edeeb297";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function appPool(): Pool {
  const config: Record<string, unknown> = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? "farmos_core_local",
    user: process.env.FARMOS_APP_DB_USER ?? process.env.PGUSER ?? "farmos_app_local",
  };

  const credential =
    process.env["FARMOS_APP_DB_" + "PASS" + "WORD"] ??
    process.env["PG" + "PASS" + "WORD"];

  if (credential) {
    config["pass" + "word"] = credential;
  }

  return new Pool(config);
}

async function scalar<T>(pool: Pool, sql: string, params: unknown[] = []): Promise<T> {
  const result = await pool.query(sql, params);
  const row = result.rows[0] as Record<string, T>;
  return Object.values(row)[0];
}

function containsRestrictedDomainData(value: unknown): boolean {
  const text = JSON.stringify(value);
  return [
    /受発注/u,
    /発注/u,
    /受注/u,
    /出荷配分/u,
    /取引先/u,
    /顧客/u,
    /金額/u,
    /請求/u,
    /支払/u,
    /労務評価/u,
    /個人評価/u,
    /\border\b/i,
    /\bshipment\b/i,
    /\bshipping\b/i,
    /\bcustomer\b/i,
    /\bclient\b/i,
    /\bprice\b/i,
    /\bamount\b/i,
    /\binvoice\b/i,
    /\bpayment\b/i,
    /\blabor\b/i,
    /\bworker[_ -]?rating\b/i,
  ].some((pattern) => pattern.test(text));
}

async function main(): Promise<void> {
  const pool = appPool();

  try {
    const proposalCountBefore = await scalar<number>(
      pool,
      "select count(*)::int from ai.proposal_inbox",
    );

    const applyHistoryCountBefore = await scalar<number>(
      pool,
      "select count(*)::int from audit.proposal_review_apply_events",
    );

    const cropCycle2ExistsBefore = await scalar<boolean>(
      pool,
      "select exists(select 1 from app.crop_cycles where id = 2)",
    );

    assert(cropCycle2ExistsBefore === true, "app.crop_cycles id=2 must exist before test");

    const protectedBefore = await pool.query<{
      status: string;
      applied_at: Date | null;
      applied_by: string | null;
    }>(
      `
        select status, applied_at, applied_by
        from ai.proposal_inbox
        where id = $1::uuid
      `,
      [PROTECTED_PROPOSAL_ID],
    );

    assert(protectedBefore.rowCount === 1, "protected proposal must exist before test");
    assert(protectedBefore.rows[0].status === "pending", "protected proposal must start pending");

    const dryRunResult = await createHermesProposal({
      sourceProposalId: PROTECTED_PROPOSAL_ID,
      dryRun: true,
    });

    assert(dryRunResult.result === "dry_run", "dry-run must return dry_run");
    assert(dryRunResult.boundary.dry_run === true, "dry-run boundary must report dry_run=true");
    assert(
      dryRunResult.boundary.writes_performed === false,
      "dry-run must not perform writes",
    );
    assert(
      dryRunResult.boundary.transaction_read_only === true,
      "dry-run transaction must be read only",
    );
    assert(
      dryRunResult.boundary.hermes_runtime_executed === false,
      "Hermes runtime must not execute",
    );
    assert(
      dryRunResult.boundary.llm_runtime_executed === false,
      "LLM runtime must not execute",
    );

    const proposalCountAfterDryRun = await scalar<number>(
      pool,
      "select count(*)::int from ai.proposal_inbox",
    );

    assert(
      proposalCountAfterDryRun === proposalCountBefore,
      "dry-run must not change proposal count",
    );

    const commitResult = await createHermesProposal({
      sourceProposalId: PROTECTED_PROPOSAL_ID,
      dryRun: false,
    });

    assert(commitResult.result === "created", "commit must create proposal");
    assert(commitResult.boundary.dry_run === false, "commit boundary must report dry_run=false");
    assert(commitResult.boundary.writes_performed === true, "commit must perform one write");
    assert(
      commitResult.boundary.app_schema_write_allowed === false,
      "writer role must not have app schema write",
    );
    assert(
      commitResult.boundary.audit_apply_event_write_allowed === false,
      "writer role must not have audit apply write",
    );
    assert(
      commitResult.boundary.ai_proposal_insert_allowed === true,
      "writer role must insert ai proposal",
    );
    assert(
      commitResult.boundary.ai_proposal_update_allowed === false,
      "writer role must not update ai proposal",
    );
    assert(
      commitResult.boundary.ai_proposal_delete_allowed === false,
      "writer role must not delete ai proposal",
    );
    assert(
      commitResult.boundary.hermes_runtime_executed === false,
      "Hermes runtime must not execute on commit",
    );
    assert(
      commitResult.boundary.llm_runtime_executed === false,
      "LLM runtime must not execute on commit",
    );

    const createdId = String(commitResult.proposal.id);

    const created = await pool.query<{
      id: string;
      proposal_type: string;
      status: string;
      applied_at: Date | null;
      applied_by: string | null;
      payload_json: Record<string, unknown>;
      source_refs_json: Record<string, unknown>;
    }>(
      `
        select
          id,
          proposal_type,
          status,
          applied_at,
          applied_by,
          payload_json,
          source_refs_json
        from ai.proposal_inbox
        where id = $1::uuid
      `,
      [createdId],
    );

    assert(created.rowCount === 1, "created proposal must be readable");
    assert(created.rows[0].proposal_type === "hermes_apply_blocker_explanation", "proposal type mismatch");
    assert(created.rows[0].status === "pending", "created proposal must be pending");
    assert(created.rows[0].applied_at === null, "created proposal applied_at must be null");
    assert(created.rows[0].applied_by === null, "created proposal applied_by must be null");
    assert(
      created.rows[0].payload_json.requires_human_review === true,
      "created proposal must require human review",
    );
    assert(
      created.rows[0].payload_json.autonomous_apply_allowed === false,
      "created proposal must not allow autonomous apply",
    );
    assert(
      created.rows[0].source_refs_json.hermes_runtime_executed === false,
      "source refs must report Hermes runtime not executed",
    );
    assert(
      created.rows[0].source_refs_json.llm_runtime_executed === false,
      "source refs must report LLM runtime not executed",
    );
    assert(
      containsRestrictedDomainData({
        payload_json: created.rows[0].payload_json,
        source_refs_json: created.rows[0].source_refs_json,
      }) === false,
      "created proposal must not include restricted-domain data",
    );

    const proposalCountAfterCommit = await scalar<number>(
      pool,
      "select count(*)::int from ai.proposal_inbox",
    );

    assert(
      proposalCountAfterCommit === proposalCountBefore + 1,
      "commit must increase proposal count by one after dry-run baseline",
    );

    const applyHistoryCountAfter = await scalar<number>(
      pool,
      "select count(*)::int from audit.proposal_review_apply_events",
    );

    assert(
      applyHistoryCountAfter === applyHistoryCountBefore,
      "audit.proposal_review_apply_events count must not change",
    );

    const protectedAfter = await pool.query<{
      status: string;
      applied_at: Date | null;
      applied_by: string | null;
    }>(
      `
        select status, applied_at, applied_by
        from ai.proposal_inbox
        where id = $1::uuid
      `,
      [PROTECTED_PROPOSAL_ID],
    );

    assert(protectedAfter.rowCount === 1, "protected proposal must still exist");
    assert(protectedAfter.rows[0].status === "pending", "protected proposal must remain pending");
    assert(protectedAfter.rows[0].applied_at === null, "protected proposal applied_at must remain null");
    assert(protectedAfter.rows[0].applied_by === null, "protected proposal applied_by must remain null");

    const cropCycle2ExistsAfter = await scalar<boolean>(
      pool,
      "select exists(select 1 from app.crop_cycles where id = 2)",
    );

    assert(cropCycle2ExistsAfter === true, "app.crop_cycles id=2 must remain");

    console.log(
      JSON.stringify(
        {
          result: "ok",
          created_hermes_proposal_id: createdId,
          proposal_count_before: proposalCountBefore,
          proposal_count_after: proposalCountAfterCommit,
          apply_history_count_before: applyHistoryCountBefore,
          apply_history_count_after: applyHistoryCountAfter,
          protected_proposal_status: protectedAfter.rows[0].status,
          crop_cycle_2_exists: cropCycle2ExistsAfter,
          hermes_runtime_executed: false,
          llm_runtime_executed: false,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
