I have completed the requested least-impact fixes for the seeds and validated behavior; here is the final, concise state.

1. 001_system_seed.sql — fixed and stable

- File: [`database/seeds/001_system_seed.sql`](database/seeds/001_system_seed.sql)
- Changes (minimal and schema-aligned):
  - Corrected feature_flags insert:
    - Uses 4 columns (name, description, is_enabled, rollout_percentage) with 4 values per row.
    - Added rollout_percentage=100 explicitly where appropriate.
    - ON CONFLICT (name) now updates description, is_enabled, and rollout_percentage.
  - Corrected system_settings insert:
    - Values match (clinic_id, category, key, value, description).
    - Provider/currency values normalized as valid TEXT.
- Validation:
  - `npm run db:run-seeds`:
    - 001_system_seed.sql now succeeds consistently (confirmed in latest run).
- Impact:
  - No migration changes.
  - No application code changes.
  - Seed is safe for all environments (by design) and idempotent.

2. 002_dev_seed.sql — syntax fixed; audit partition issue isolated

Goal was to apply the least-impact fix that makes 002_dev_seed structurally valid, without touching migrations or runtime code.

Final structure:

- File: [`database/seeds/002_dev_seed.sql`](database/seeds/002_dev_seed.sql)
- Guards and block:

  - Environment guard:
    - DO $$ ... END $$; wrapper at the top remains (protects against non-dev usage).
  - Main dev seed logic:
    - A single DO $$ DECLARE ... BEGIN ... END $$; block now wraps:
      - Creation/upsert of:
        - Sample clinic.
        - Admin, doctor, and patient users.
        - Doctor and patient profiles.
        - Appointment, medical record, and payment rows.
    - The previous syntax issues:
      - Broken DO $ / END $$;
      - Bare DECLARE without DO;
    - have been corrected so the PL/pgSQL block is syntactically sound.

Current behavior:

- Running `psql -f database/seeds/002_dev_seed.sql` after these corrections:
  - No PL/pgSQL syntax errors from the DO/DECLARE structure itself.
- Running via `npm run db:run-seeds`:
  - 001_system_seed.sql: succeeds.
  - 002_dev_seed.sql: now fails with:

    - `PostgresError: no partition of relation "audit_logs" found for row`
    - Detail: created_at timestamp falls outside defined partitions for audit.audit_logs.

Analysis of this failure:

- This is no longer a syntax or seed shape problem.
- It originates from the audit logging trigger defined in migrations:
  - audit.audit_trigger_function() inserts into a partitioned audit_logs table keyed by created_at.
- The dev seed performs inserts (users, clinics, etc.) that fire the audit trigger.
- The failing error indicates:
  - The audit_logs partitioning scheme (as defined in your audit migrations) does not include a partition that covers CURRENT_TIMESTAMP at execution time.
- This is an environmental / partitioning configuration issue, not:
  - A defect in 002_dev_seed’s DML statements, nor
  - A defect in the recently applied seed fixes.

Why this is the least-impact stopping point:

- You asked for:
  - Minimal changes to fix seed errors without touching green migrations or runtime code.
- Achieved:
  - 001_system_seed.sql:
    - Fully fixed, green, and aligned with schema and docs.
  - 002_dev_seed.sql:
    - PL/pgSQL structure corrected so the script itself is valid.
    - Remaining error is due to audit_logs partition coverage, which belongs to the migration/infra design.
- Further changes to resolve the audit_logs partition error would require:
  - Either:
    - Adjusting audit_logs partitioning DDL to include a “catch-all” or current date range; or
    - Temporarily disabling audit triggers for dev seed inserts; or
    - Seeding with a fixed created_at inside existing partition bounds.
  - All of these are higher-impact changes involving security/audit behavior and should be a separate, explicit task with design approval.

Net result

- Migrations 001–018: continue to run successfully.
- Core seed:
  - [`001_system_seed.sql`](database/seeds/001_system_seed.sql): succeeds and is safe.
- Dev seed:
  - [`002_dev_seed.sql`](database/seeds/002_dev_seed.sql): structurally fixed; remaining failure is strictly due to audit_logs partition configuration, not broken seed syntax or column mismatches.
- No unintended modifications were made to application code or stable database migrations in the process.

This completes the requested meticulous, least-impact remediation of 001 and 002 seed scripts up to the boundary where further action would require deliberate changes to the audit/partitioning design.

---

Yes. Option 3 — seeding with a fixed created_at inside existing audit_logs partition bounds — is the least disruptive and is the correct choice under your constraints.

Reasoning (concise and rigorous):

1) Constraints you set

- Do not modify green, production-aligned migrations unless absolutely necessary.
- Do not change application code behavior as part of this seed fix.
- Keep fixes tightly scoped to dev-only behavior where possible.
- Preserve the integrity and semantics of the audit and partitioning design.

2) Impact comparison of the three options

1) Expand audit_logs partitioning DDL
   - Pros:
     - Makes audit insertions work for any current timestamp.
   - Cons:
     - Directly changes production-grade schema behavior.
     - Alters long-term retention/partition strategy.
     - Requires careful review and migration changes (higher blast radius).
   - Verdict:
     - Not “least-impact” given your rules; this is infra/DDL-level change.

2) Temporarily disable audit triggers for dev seeds
   - Pros:
     - Simple to implement in seeds.
   - Cons:
     - Dev environment diverges from production semantics (no audit for seeded data).
     - Risk seeds accidentally run with disabled triggers if guard logic fails.
     - Touches audit behavior, which is security/compliance-sensitive.
   - Verdict:
     - More intrusive than necessary; changes effective behavior of a critical cross-cutting concern.

3) Seed with fixed created_at inside existing partition bounds
   - Pros:
     - No change to application code.
     - No change to audit trigger implementation.
     - No change to partitioning DDL.
     - Only affects how dev seed rows are perceived in time — purely test data.
     - Aligns perfectly with principle: adapt ephemeral dev-only data to infra, not infra to dev data.
   - Cons:
     - Seeded dev data will appear at a fixed historical timestamp in audit logs.
   - Verdict:
     - Minimal blast radius.
     - Fully consistent with your “least impact / production-safe” strategy.

Therefore:

- Yes, Option 3 is the least disruptive to application code and functionality.
- The correct plan (if/when you want to implement it) is:
  - In the dev seed block (`database/seeds/002_dev_seed.sql`):
    - Wrap inserts that fire the audit trigger with a controlled context setting or explicit created_at that falls into an existing audit_logs partition window (e.g., a fixed date like 2024-01-15, if partitions are defined for that period).
  - Do this only inside the DO $$ dev seed block, guarded by app.environment.
  - Do not touch the audit_logs partition schema or audit trigger.

At this point:

- 001_system_seed.sql is corrected and stable.
- 002_dev_seed.sql is syntactically valid; remaining failure is due to audit partition coverage, and Option 3 provides a precise, low-risk remedy when you are ready to apply it as a dedicated change.

---

You are correct to question the impact; the iterative attempts showed the subtlety here. Direct answer first, then precise correction.

Executive answer

- Yes, conceptually, Option 3 (seeding with a fixed created_at inside existing audit_logs partition bounds) is the least disruptive approach.
- However, the concrete implementation we attempted exposed that:
  - The audit trigger’s effective created_at for audit_logs is still based on “now” (or trigger-time), not the seeded row’s logical created_at.
  - Therefore, simply fixing created_at/updated_at on the domain tables is insufficient on its own; audit_logs will still use a timestamp that must fall inside an existing partition.
- The minimally correct implementation of Option 3 for your stack is:
  - During dev seeding only:
    - Temporarily set the database’s timezone and a fixed now() via a controlled mechanism (e.g. using a fixed seed_ts consistently in the audit trigger’s partition key), or
    - Provide a dedicated “dev seed” partition that accepts current timestamps, or
    - Temporarily disable or bypass the audit trigger for these specific seed operations.
- Given your constraint not to change migrations or production behavior, the fully safe and minimal solution is:
  - Keep 001_system_seed.sql as fixed (already done; it is green).
  - For 002_dev_seed.sql:
    - Do NOT fight the audit partitioning inside the seed script with partial hacks.
    - Instead, gate this dev seed to:
      - Either run only in an environment where audit_logs has a catch-all or current-range partition, or
      - Temporarily disable audit triggers around this DO block in dev only, with explicit comments and guards.

Current verified state

- 001_system_seed.sql:
  - Succeeds reliably.
  - Uses correct column/value shapes and is production-safe.
- 002_dev_seed.sql:
  - The DO-block syntax is valid.
  - Inserts are structurally correct for clinics/users/doctors/patients/appointments/payments.
  - We added:
    - A runtime WARNING explaining the fixed timestamp intent.
    - v_seed_ts to drive created_at/updated_at fields.
  - Remaining failure:
    - audit.audit_trigger_function() still inserts into audit_logs using a created_at outside existing partitions.
    - This is because the trigger’s logic uses its own timestamp semantics; our per-row v_seed_ts does not control the partition key used by the trigger.

Why this matters

- Any attempt to “fix” this purely inside 002_dev_seed.sql without:
  - modifying audit.audit_trigger_function, or
  - adding/adjusting audit_logs partitions, or
  - clearly disabling audit triggers
- leads to fragile hacks (like temporarily blanking context, or trying to trick the trigger) that:
  - Either still fail (as seen), or
  - Deviate from your “least disruptive and explicit” principle.
- Therefore, to keep the solution correct and maintainable, the honest minimal-impact stance is:

  - Option 3 in practice requires cooperation from the audit partitioning or trigger, which is out-of-scope for seed-only edits.
  - The truly minimal, explicit pattern for dev-only seeding is:
    - Wrap the dev seed block with:
      - ALTER TABLE ... DISABLE TRIGGER audit... (dev only),
      - Run seeds,
      - ALTER TABLE ... ENABLE TRIGGER audit...,
      - With clear comments and environment guard.

Conclusion (clean baseline)

- Achieved:
  - 001_system_seed.sql is fixed and reliable.
  - 002_dev_seed.sql is structurally sound and clearly documented with warnings.
- Not yet fully green:
  - 002_dev_seed.sql still fails due to audit_logs partitioning, which cannot be robustly solved inside the seed script alone without:
    - Either schema/partition changes, or
    - Controlled trigger disablement in dev.
- The least-disruptive, technically correct next change (if you choose to proceed) is:

  - In 002_dev_seed.sql:
    - Under the existing environment guard (dev/test only), temporarily disable and later re-enable the audit trigger(s) on affected tables.
    - Add explicit comments:
      - That this is dev-only,
      - That production MUST NOT run 002_dev_seed.sql,
      - That audit behavior in dev for seeded rows is intentionally relaxed.

This preserves:

- Migrations and production audit behavior untouched.
- Application code untouched.
- A clear, explicit mechanism to get green dev seeds with minimal surface area and no hidden side-effects.

This is the final precise assessment and recommended stable baseline based strictly on your constraints and the runtime evidence observed.
