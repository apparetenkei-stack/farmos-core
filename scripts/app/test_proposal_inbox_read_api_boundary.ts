import {
  listProposalInboxReadModel,
  showProposalInboxReadModel,
  type ProposalInboxReadBoundary,
} from "./api_boundary/proposal_inbox_read_api_boundary.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertReadBoundary(boundary: ProposalInboxReadBoundary): void {
  assert(
    boundary.mode === "proposal_inbox_read_only_api_boundary",
    "unexpected read boundary mode",
  );
  assert(boundary.db_user === "farmos_app_local", `unexpected db_user: ${boundary.db_user}`);
  assert(boundary.transaction_read_only === true, "transaction_read_only must be true");
  assert(boundary.writes_performed === false, "writes_performed must be false");
  assert(boundary.app_schema_write_allowed === false, "app_schema_write_allowed must be false");
}

async function main(): Promise<void> {
  const listResult = await listProposalInboxReadModel();

  console.log(
    JSON.stringify(
      {
        test: "listProposalInboxReadModel",
        result: listResult.result,
        proposal_count: listResult.result === "ok" ? listResult.proposals.length : null,
        read_boundary: listResult.result === "ok" ? listResult.read_boundary : undefined,
        error: listResult.result === "error" ? listResult.error : undefined,
      },
      null,
      2,
    ),
  );

  assert(listResult.result === "ok", "list result must be ok");
  assertReadBoundary(listResult.read_boundary);

  if (listResult.proposals.length > 0) {
    const firstProposalId = listResult.proposals[0].id;
    const detailResult = await showProposalInboxReadModel({ proposalId: firstProposalId });

    console.log(
      JSON.stringify(
        {
          test: "showProposalInboxReadModel existing proposal",
          proposal_id: firstProposalId,
          result: detailResult.result,
          read_boundary: detailResult.result === "ok" ? detailResult.read_boundary : undefined,
        },
        null,
        2,
      ),
    );

    assert(detailResult.result === "ok", "existing proposal detail result must be ok");
    assertReadBoundary(detailResult.read_boundary);
  } else {
    console.log(
      JSON.stringify(
        {
          test: "showProposalInboxReadModel existing proposal",
          result: "skipped_empty_state",
        },
        null,
        2,
      ),
    );
  }

  const missingUuid = "00000000-0000-0000-0000-000000000000";
  const notFoundResult = await showProposalInboxReadModel({ proposalId: missingUuid });

  console.log(
    JSON.stringify(
      {
        test: "showProposalInboxReadModel missing proposal",
        proposal_id: missingUuid,
        result: notFoundResult.result,
        read_boundary: notFoundResult.result === "not_found" ? notFoundResult.read_boundary : undefined,
      },
      null,
      2,
    ),
  );

  assert(notFoundResult.result === "not_found", "missing valid UUID must be not_found");
  assertReadBoundary(notFoundResult.read_boundary);

  const badRequestResult = await showProposalInboxReadModel({ proposalId: "999999" });

  console.log(
    JSON.stringify(
      {
        test: "showProposalInboxReadModel bad request",
        proposal_id: "999999",
        result: badRequestResult.result,
        error: badRequestResult.result === "bad_request" ? badRequestResult.error : undefined,
      },
      null,
      2,
    ),
  );

  assert(badRequestResult.result === "bad_request", "non-UUID proposalId must be bad_request");

  console.log("proposal inbox read-only boundary tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
