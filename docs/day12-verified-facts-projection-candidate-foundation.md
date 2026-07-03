# Day12 - Verified Facts Projection Candidate Foundation

## Purpose

Day12 builds the foundation for creating projection candidates from human-reviewed extracted facts.

This Day is scoped as approximately two hours of work.

Day11 created reviewed extracted facts. Day12 uses only `verified=true` facts to create an intermediate candidate before any write to the `app` schema.

## Important Boundary

Projection Candidates are not business truth.

They are intermediate candidates before writing to tables such as:

- app.crop_cycles
- app.work_records
- app.shipments
- app.fields
- app.members

Day12 does not write to any app schema table.

## Why only verified facts are used

Only `verified=true` facts are used because they were reviewed by a human operator.

Rejected facts are not used because they were explicitly excluded.

Unreviewed facts are not used because they have not passed Human in the Loop review.

## Principles

- Raw First / No Destructive Import
- Human in the Loop
- Proposal First / Human Approval
- AI Agent Isolation
- Security First

## Day12 does not do

- No external API calls
- No LLM calls
- No Qdrant embedding insertion
- No OpenClaw installation
- No Hermes installation
- No writes to app.crop_cycles
- No writes to app.work_records
- No writes to app.shipments
- No overwrite of source_documents
- No overwrite of document_extractions
- No overwrite of extracted_facts fact values

## Created in Day12

- knowledge.projection_candidates
- create_projection_candidates_from_verified_facts.ts
- package script: create-projection-candidates

## Day13 Candidate

Recommended Day13:

Projection Candidate Review / Approval Foundation

Goal:

- Review projection_candidates
- Approve or reject projection candidates
- Still avoid direct app schema writes
