# Day20 Future Operations Design Notes

## Purpose

This document records future operation design constraints discovered before Day20 completion.

These constraints are not implemented in Day20.

Day20 remains limited to crop cycle provenance detail CLI work.

## 1. Order / shipment information access policy

Order intake, shipment allocation, customer preferences, prices, outbound replies, and source messages must be visible only to owner/admin level users.

Workers and part-time workers should receive task instructions only.

Worker-facing views should not expose:

- customer names
- order quantities
- prices
- customer-specific preferences
- raw inbound messages
- outbound reply contents
- shipment allocation decision details

Order and shipment data must be transformed into operational instructions before being shown to workers.

## 2. Role-based AI daily reports

AI daily reports must be generated according to recipient role.

Owner/admin reports may include:

- unconfirmed orders
- FAX / email / Instagram order candidates
- shipment allocation risks
- transport constraints
- reply-needed items
- customer-specific issues
- price / quantity / allocation details

Worker / part-time reports may include:

- today's field work
- crop
- field
- harvest target
- packaging instruction
- work warnings
- weather or safety notes necessary for work

Worker reports must not include customer-specific order or price information.

## 3. Shipment decision session concurrency

Future shipment allocation workflows need a shipment_decision_session concept.

The same shipment decision session should be edited by only one user at a time.

Future implementation candidates:

- lease lock
- locked_by
- locked_at
- lock_expires_at
- version
- confirmed_at
- confirmed_by
- transaction lock
- activity log

Confirmation must be idempotent.

Outbound replies must not be sent twice.

Shipment quantities must not be double-confirmed.

## 4. Hermes Safety Contract

Hermes may propose:

- designs
- policies
- schema candidates
- workflow improvements
- documentation drafts
- ADR candidates

Hermes must not:

- run migrations
- change access policies directly
- write to app schema
- send notifications directly
- reply to customers directly
- confirm orders
- confirm shipments
- expose admin-only information to worker reports
- add notification recipients
- change permissions
- use secrets
- use SSH private keys

Hermes proposals must remain as design_proposal / policy_proposal until human approval.

Human approval is required before ADR adoption or implementation.

## 5. Future schema candidates

Order intake and shipment allocation should be separated from crop cycle provenance work.

Future candidates:

- shipment_decision_sessions
- inbound_orders
- shipment_allocation_plans
- role-based daily report policy
- admin-only order visibility policy
- shipment decision lock / versioning

These are future Day24+ candidates, not Day20 implementation targets.

## 6. Implementation status

Not implemented in Day20.

No DB schema was created for order intake, shipment allocation, role-based reports, or Hermes policy execution.

These notes are future constraints for later design days.
