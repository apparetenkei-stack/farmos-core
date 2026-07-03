# Day13 Projection Candidate Review / Approval Foundation

## Purpose

Day13 builds the human review and approval foundation for `knowledge.projection_candidates`.

This Day is intentionally scoped as approximately 2 hours of work.

Day12 created a Projection Candidate from verified facts.

The Projection Candidate is not business data.
It is an intermediate candidate before any write to the `app` schema.

Day13 does not write to:

- app.crop_cycles
- app.work_records
- app.shipments
- app.fields
- app.members

## Meaning of approve

In Day13, approve means:

> This Projection Candidate is approved by a human as a future app projection candidate.

It does not mean that the candidate has been inserted into `app.crop_cycles`.

## Meaning of reject

In Day13, reject means:

> This Projection Candidate is excluded from future app projection.

## Reviewed state

`reviewed=true` and `status=reviewed` mean the candidate was reviewed and approved as a candidate.

## Rejected state

`rejected=true` and `status=rejected` mean the candidate was rejected and must not be applied to app data.

## Core principles

- Raw First / No Destructive Import
- Human in the Loop
- Proposal First / Human Approval
- AI Agent Isolation
- Security First

## Explicit non-goals

Day13 does not:

- call external APIs
- call LLMs
- insert Qdrant embeddings
- install OpenClaw
- install Hermes
- write to app.crop_cycles
- write to app.work_records
- write to app.shipments
- modify source document originals
- overwrite document_extractions.extracted_text
- overwrite extracted_facts fact values
- overwrite projection_candidates.candidate_payload
- overwrite projection_candidates.supporting_extracted_fact_ids

## Day12 starting point

Day12 created one Projection Candidate:

- id: 1
- candidate_type: crop_cycle_candidate
- target_schema: app
- target_table: crop_cycles
- supporting_extracted_fact_ids: {4,5}
- status: draft
- reviewed: false
- rejected: false
- generated_by: verified_facts_projection_candidate_worker_v1

## Day13 target state

Projection Candidate id=1 should become:

- status: reviewed
- reviewed: true
- reviewed_by: hayate
- reviewed_by_role: owner_operator
- rejected: false
- approved_for_app_projection: true
- approved_by: hayate

The candidate payload and supporting fact IDs must remain unchanged.

## Day14 handoff candidate

Recommended Day14:

Approved Projection Read Model / App Apply Planning Foundation

Purpose:

- read `approved_for_app_projection=true` candidates
- create an app apply plan
- identify missing fields before app insertion
- still avoid direct app writes
