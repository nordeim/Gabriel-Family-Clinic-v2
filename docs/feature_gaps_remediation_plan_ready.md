Master remediation plan has been saved as the authoritative guide for execution.

- Plan location:
  - [`docs/master_remediation_plan.md`](docs/master_remediation_plan.md:1)

- Contents:
  - Clearly defined phases:
    - Phase 1: Real booking pipeline via booking.create_booking.
    - Phase 2: Identity and profile alignment.
    - Phase 3: Payments and CHAS integration.
    - Phase 4: Telemedicine sessions integration.
    - Phase 5: Feedback, health screening, notifications, jobs.
    - Phase 6: RLS, audit, config/feature flags hardening.
  - For each phase:
    - Explicit goals aligned with the database schema and Project Architecture Document.
    - File-by-file change descriptions.
    - Concrete checklists per file for validation after edits.
  - Execution principles:
    - Small, independent phases.
    - No schema changes unless critical.
    - Validate each file against its checklist plus type-check/lint after modifications.

This plan is now staged and stable, and will be used as the single source of truth to drive meticulous, systematic implementation in subsequent steps, with each change validated against its corresponding checklist and the underlying schema-contract.
