### Sprint 3 Sub-Plan

Objective
- Implement a robust webhook ingestion and processing pipeline: persistent webhook_events schema (if not already present), idempotent processing worker pattern, DLQ handling and replay tooling, provider contract docs, and CI contract tests that validate idempotency and processing semantics.

Success criteria
- webhook_events table and supporting objects are present as an ordered migration and applied in CI.
- Worker design and reference implementation (pseudocode + minimal Node skeleton) perform atomic claim → process → ack semantics and update webhook_events status reliably.
- Dead-lettered events are captured and replayable with an idempotent replay tool that does not cause duplicate side effects.
- Integration contract docs exist for primary providers (Stripe, Twilio/WhatsApp, Daily.co) with signature verification, idempotency guidance, and example payloads.
- CI contract-test workflow exercises: ingest a mock event, process it once successfully, re-send the same event_id and verify no duplicate side effects, then simulate repeated failures to confirm DLQ routing and replay correctness.

Scope and constraints
- Focus on ingestion and worker semantics; do not implement full provider adapters for production in this sprint.
- Use the existing migrations framework and CI patterns from Sprint 1/2.
- Keep external calls outside the critical DB transaction—worker handles processing and calls to other services but uses idempotent handlers and durable state transitions in DB.
- CI tests will use mocked provider payloads and a lightweight processing stub (Node) similar to Sprint 2 booking stub.

Deliverables (exact files/locations)
- migrations/00006_webhook_events.sql (verify exists) or migrations/00012_webhook_events_state_machine.sql (if an enhanced migration needed)
- migrations/00013_webhook_processing_helpers.sql — helper functions, enums, and indexes
- src/workers/webhook_processor_pseudocode.md — detailed pseudocode and sequence diagrams (textual)
- src/workers/webhook_processor_stub.js — minimal Node worker demonstrating claim/process/ack loop for CI
- tools/webhook_replay.sh — operations script to replay dead-letter events idempotently
- docs/integrations/stripe.md, docs/integrations/whatsapp.md, docs/integrations/daily.md, docs/integrations/twilio.md — minimal contract docs with idempotency and signature verification examples
- test/contract/webhook_contract_test.js (or a set of scripts) — contract tests to run in CI
- .github/workflows/webhook_contract_tests.yml — CI workflow for contract tests
- docs/ops/webhook_runbook.md — runbook for handling DLQ, manual replay, visibility, and metrics
- metrics/definitions.md additions — webhook_processing_total, webhook_dead_letter_total, webhook_replay_total

Design principles and chosen patterns
- Persistent state machine: webhook_events.status ENUM { pending, processing, success, failed, dead_letter } and immutable event_id uniqueness per webhook.
- Atomic claim: worker claims an event via an atomic UPDATE ... WHERE status='pending' RETURNING id to avoid double-claiming.
- Idempotency: event_id uniqueness prevents storing duplicate ingestions; event handlers must be idempotent (use idempotency keys for downstream calls and check-for-existence before creating resources).
- Retries & backoff: worker increments attempts and uses exponential backoff; after configurable max_attempts, status transitions to dead_letter.
- Replay: replay tooling re-enqueues or transitions dead_letter -> pending while preserving event_id and ensuring handlers see the same event_id (so idempotency prevents duplicate side effects).
- Observability: emit metrics per event processed, attempts, failures, and replays; log structured traces including event_id, webhook_id, and processing duration.

Detailed tasks and sequence

1) Verify or add migration enhancements
   - If migrations/00006_webhook_events.sql exists from Sprint 1, create a follow-up migration (00013_webhook_processing_helpers.sql) to:
     - Create or ALTER an ENUM webhook_event_status ENUM ('pending','processing','success','failed','dead_letter')
     - Add created_at, last_attempt_at, attempts, processed_at, status enum, error TEXT if missing
     - Add CHECK/unique constraint: UNIQUE(webhook_id, event_id)
     - Create helper functions: webhook.claim_next_event(p_webhook_id UUID) RETURNS webhook_events row (atomic claim using UPDATE ... WHERE status='pending' RETURNING *)
     - Create function webhook.mark_event_result(p_id UUID, p_status webhook_event_status, p_error TEXT) to encapsulate update logic
   - Add indexes on (status, received_at), (webhook_id, status)

2) Worker pseudocode and reference stub
   - Produce src/workers/webhook_processor_pseudocode.md with:
     - startup flow (poll interval, concurrency, shard assignment if multiple workers)
     - claim pattern (UPDATE ... WHERE id = candidate AND status='pending' RETURNING ...)
     - processing flow: validate signature, validate payload schema, call idempotent handler for event type, mark success or failure, handle transient vs permanent errors
     - retry/backoff algorithm: jittered exponential backoff; attempts++ on failure; on attempts > MAX move to dead_letter and record error
     - idempotency guidance for handlers (use event_id as unique key in business tables; use UPSERT patterns)
   - Implement src/workers/webhook_processor_stub.js:
     - Minimal Node worker that:
       - Connects to DB
       - Periodically queries for pending events and claims one via a single UPDATE ... RETURNING
       - Validates signature using configured secret (mocked in CI)
       - Calls a handler that, for tests, writes marker rows into a test table (e.g., webhook_side_effects) using UPSERT on (provider,event_id) to simulate idempotent side effect
       - Updates webhook_events status to success or failed accordingly
     - Configurable environment variables: WORKER_POLL_INTERVAL_MS, MAX_ATTEMPTS, DB_URL

3) DLQ and replay tooling
   - Create tools/webhook_replay.sh which:
     - Accepts filters (webhook_id, cutoff_date, event_id)
     - Safely moves rows from dead_letter -> pending (or inserts a new pending copy with same event_id if business prefers) while recording an audit log entry in audit.audit_logs for replay action
     - Optionally supports replay with idempotency_key override
   - Add docs/ops/webhook_runbook.md for operators:
     - How to inspect DLQ (SQL queries)
     - How to replay specific events via tools/webhook_replay.sh
     - How to handle poison messages (schema mismatch or permanently-invalid signatures)

4) Provider contract docs
   - For each provider (Stripe, Twilio/WhatsApp, Daily.co), add docs/integrations/*.md including:
     - Example webhook payload with event_id, timestamp, signature header, and minimal required fields for this app
     - Required idempotency semantics and recommended idempotency_key usage on outgoing calls
     - Signature verification snippet (pseudo-code) and expected header names
     - Suggested retry/backoff strategy and maximum delivery attempts
   - Provide sample payloads and mock signatures used in CI contract tests

5) Contract tests (CI)
   - Implement test/contract/webhook_contract_test.js or a set of scripts that:
     - Apply migrations
     - Seed a webhook registration row (if integrations table exists)
     - Post a mock signed event payload to ingestion endpoint (or directly insert into webhook_events to simulate provider push) with event_id = 'ev-1'
     - Start the worker stub (node src/workers/webhook_processor_stub.js) in background
     - Wait for processing and assert:
       - webhook_events row transitions to success and side-effect row exists once
     - Re-send same event_id (simulate provider resending) and assert:
       - No duplicate side-effect created (side-effect upsert preserves single row)
     - Create a faulty handler scenario (handler throws) repeated until attempts > MAX -> assert status = dead_letter and webhook_dead_letter_total incremented
     - Run tools/webhook_replay.sh on the dead-letter and assert successful reprocessing (side-effect re-created if necessary) and status updates
   - Tests will use a small local HTTP ingestion stub (test/ci/webhook_ingest_stub.js) that validates incoming signature and writes to webhook_events table (or the test can directly insert into DB to reduce complexity)

6) CI workflow: .github/workflows/webhook_contract_tests.yml
   - Trigger: workflow_dispatch and on PR label 'run-webhook-contracts'
   - Steps:
     - Checkout, start Postgres service
     - Apply migrations
     - Start ingestion stub and worker stub
     - Run contract tests (node test/contract/webhook_contract_test.js)
     - Fail if any assertion fails
   - Upload artifacts: webhook_events dump, side_effects dump, worker logs

7) Metrics and observability
   - Add metrics/definitions.md additions:
     - webhook_processing_total (labels: webhook_id, provider, result)
     - webhook_dead_letter_total (labels: webhook_id, provider, reason)
     - webhook_replay_total (labels: webhook_id, operator)
   - Instrument worker stub to emit simple Prometheus counters or log structured metrics (CI will assert counters via logs)

Validation checklist (must pass before Sprint 3 completion)
- [ ] Enhanced webhook migrations applied successfully in CI dry-run.
- [ ] Worker stub claims and processes events atomically (demonstrated in contract tests).
- [ ] Re-sending same event_id does not create duplicate side-effects (idempotent guarantee).
- [ ] Faulty events transition to dead_letter after configured attempts and remain there until replayed.
- [ ] Replay tool successfully re-enqueues or re-processes dead letters idempotently and audit logging records the operator action.
- [ ] Integration docs for Stripe/Twilio/Daily present signature verification and idempotency guidance.
- [ ] Metrics recorded and visible in CI logs for processed, dead-lettered, and replayed events.
- [ ] CI workflow webhooks contract tests pass on PR or on-demand runs.

Rollback and mitigation plan
- All migrations are additive; in case of regression:
  - Stop worker processes (feature flag or systemctl/docker stop).
  - Do not auto-delete dead-letter rows; they are read-only until operator chooses to replay.
  - If a buggy handler caused corruption, run replay on a staging copy and validate before replaying in prod; use audit logs to detect affected business rows and apply compensating transactions.
  - For critical incidents, revert application changes, stop workers, and restore DB snapshot as last resort.

Estimated effort and timeline
- Day 1: Create migration enhancements (00013) and helper functions; update migrations manifest.
- Day 2: Produce worker pseudocode and implement src/workers/webhook_processor_stub.js; add side_effects test table in migration or test harness.
- Day 3: Create tools/webhook_replay.sh and docs/integrations/*.md.
- Day 4: Implement contract tests (test/contract/webhook_contract_test.js) and iterate.
- Day 5: Create CI workflow .github/workflows/webhook_contract_tests.yml, run, fix issues, document runbook and metrics.
- Buffer: 1–2 days for review and adjustments.

Total: ~6–7 dev days.

Risks and mitigations
- Risk: Worker concurrency causing duplicate processing if claim pattern is wrong.
  - Mitigation: Use atomic UPDATE ... WHERE status='pending' RETURNING id; avoid separate SELECT+UPDATE patterns.
- Risk: Replay tool causing duplicates if it inserts new rows rather than reusing existing event_id uniqueness.
  - Mitigation: Replay should either reset status to pending for existing event_id rows or insert a new pending row only if UNIQUE not violated; always preserve original event_id.
- Risk: Contract tests flakiness due to timing; e.g., worker lag.
  - Mitigation: Use bounded wait loops with reasonable timeouts and retry assertions in tests; run multiple times in CI to confirm stability.
- Risk: Sensitive test secrets used in CI.
  - Mitigation: Use mock signatures and test-only secrets stored in CI secrets; never reuse production secrets.

Acceptance criteria and handoff
- On successful CI runs, produce a PR that:
  - Adds migration(s) and manifest update.
  - Adds worker stub and replay tooling.
  - Adds docs and integration contracts.
  - Adds webhook contract tests and CI workflow.
- Require DB owner approval and a runbook review prior to merging.
- Schedule a staging run where the real worker implementation is exercised with fake provider webhooks and monitor metrics.

---

### Sprint 3 — Delivered artifacts (webhook processing state machine, worker stub, DLQ replay tooling, contract tests, CI workflow, docs, metrics)

Below are the concrete artifacts for Sprint 3. Place each file at the exact repository path shown. These implement a durable webhook_events processing state machine, a minimal idempotent worker stub for CI and local testing, an operations replay tool for dead-lettered events, provider integration contract docs, contract tests that validate idempotency and DLQ behavior, and a CI workflow to run those contract tests.

---

## 1) Migration: migrations/00013_webhook_processing_helpers.sql

Path: migrations/00013_webhook_processing_helpers.sql

```sql
-- 00013 - webhook processing helpers: status enum, helper functions, indexes
-- Ensure webhook_events table exists (created previously in 00006)
-- Add explicit status enum and supporting columns if missing

DO $$
BEGIN
  -- Create enum type if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_event_status') THEN
    CREATE TYPE webhook_event_status AS ENUM ('pending','processing','success','failed','dead_letter');
  END IF;
END$$;

-- Add status column as enum if not present
ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS status webhook_event_status DEFAULT 'pending';

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS error TEXT;

-- Ensure uniqueness constraint exists
ALTER TABLE webhook_events
  ADD CONSTRAINT IF NOT EXISTS webhook_unique_event UNIQUE (webhook_id, event_id);

-- Indexes for processing
CREATE INDEX IF NOT EXISTS idx_webhook_events_pending ON webhook_events(status, received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_status ON webhook_events(webhook_id, status);

-- Create helper function to atomically claim next event for a webhook (or any)
CREATE OR REPLACE FUNCTION webhook.claim_next_event(p_webhook_id UUID DEFAULT NULL)
RETURNS TABLE(id UUID, webhook_id UUID, event_id TEXT, payload JSONB, signature TEXT) AS $$
DECLARE
  v_row webhook_events%ROWTYPE;
BEGIN
  -- Try to claim a pending event optionally scoped to webhook_id
  IF p_webhook_id IS NULL THEN
    UPDATE webhook_events
      SET status = 'processing', last_attempt_at = now(), attempts = attempts + 1
     WHERE id = (
       SELECT id FROM webhook_events
        WHERE status = 'pending'
        ORDER BY received_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
     )
    RETURNING * INTO v_row;
  ELSE
    UPDATE webhook_events
      SET status = 'processing', last_attempt_at = now(), attempts = attempts + 1
     WHERE id = (
       SELECT id FROM webhook_events
        WHERE status = 'pending' AND webhook_id = p_webhook_id
        ORDER BY received_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
     )
    RETURNING * INTO v_row;
  END IF;

  IF FOUND THEN
    RETURN QUERY SELECT v_row.id, v_row.webhook_id, v_row.event_id, v_row.payload, v_row.signature;
  END IF;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to mark result
CREATE OR REPLACE FUNCTION webhook.mark_event_result(p_id UUID, p_status webhook_event_status, p_error TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE webhook_events
    SET status = p_status,
        error = p_error,
        processed_at = CASE WHEN p_status = 'success' THEN now() ELSE processed_at END,
        last_attempt_at = now()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Notes:
- SECURITY DEFINER functions should run under restricted DB role in prod and require careful access control. CI uses superuser ephemeral DB.

---

## 2) Worker pseudocode and reference stub

### 2.1 Pseudocode: src/workers/webhook_processor_pseudocode.md

Path: src/workers/webhook_processor_pseudocode.md

```md
# Webhook Processor Pseudocode and Design

Overview
- Worker repeatedly claims pending webhook_events and processes them idempotently.
- Claiming uses webhook.claim_next_event() which atomically updates status to 'processing' and returns event row.
- Processing handlers must be idempotent using event_id as the canonical dedup key for downstream side effects.

Main loop (high-level)
1. Poll: call webhook.claim_next_event(NULL) to get next available event (or pass webhook_id to shard work).
2. If no event, sleep POLL_INTERVAL_MS and continue.
3. Validate signature and basic payload schema. If validation fails permanently:
   - call webhook.mark_event_result(event.id, 'dead_letter', 'signature_invalid') and log.
   - continue.
4. Execute handler for event type:
   - Acquire business-level idempotency (e.g., UPSERT into side_effects table keyed by provider+event_id).
   - Use idempotency in downstream provider calls (e.g., outbound notifications) by supplying idempotency-key headers or storing unique keys.
5. On success:
   - webhook.mark_event_result(event.id, 'success', NULL)
   - emit metric webhook_processing_total{provider, webhook_id, result="success"}
6. On transient failure:
   - If attempts < MAX_ATTEMPTS: set status back to 'pending' or keep 'processing' and rely on claim function to update attempts on re-claim; prefer setting to 'pending' with exponential backoff enforced by delaying re-queue.
   - If attempts >= MAX_ATTEMPTS: webhook.mark_event_result(event.id, 'dead_letter', 'max_attempts_exceeded')
   - emit metric webhook_processing_total{result="error"} or webhook_dead_letter_total when dead-lettered.

Idempotency handler pattern
- Before creating a side-effect (e.g., create_payment, create_appointment_flag), run:
  INSERT INTO webhook_side_effects (provider, event_id, created_at, payload)
    VALUES (...)
  ON CONFLICT (provider, event_id) DO NOTHING;
- If the INSERT reports a row was inserted (RETURNING), perform side-effect actions and record external references (external_id) with the same uniqueness guard.
- If INSERT reports no row inserted, treat as idempotent no-op.

Claims and concurrency
- Use database-level claim (UPDATE ... WHERE status='pending' ... RETURNING) to avoid race conditions.
- Use SKIP LOCKED or per-row claim to let multiple workers run concurrently.

Metrics & logging
- Metrics: webhook_processing_total, webhook_dead_letter_total, webhook_replay_total
- Log structured messages including event_id, webhook_id, attempts, duration, error (if any).

Operator actions (DLQ replay)
- Use tools/webhook_replay.sh to move dead_letter -> pending for targeted event_ids or webhook_id ranges.
- Ensure replay preserves original event_id so handlers remain idempotent.

Security
- Validate incoming signatures using configured provider secrets and recorded verification algorithms.
- Limit worker DB role privileges to only necessary operations on webhook_events and side-effect tables.

Backoff strategy
- Exponential backoff samples: 1st retry = 2s, 2nd = 5s, 3rd = 15s, 4th = 60s, cap at 5 attempts then DLQ.
```

---

### 2.2 Worker stub: src/workers/webhook_processor_stub.js

Path: src/workers/webhook_processor_stub.js

```js
/**
 * Minimal webhook processing worker stub for CI/local testing.
 * - Claims events via webhook.claim_next_event()
 * - Simulates signature validation (mock secret)
 * - Performs idempotent side-effect by upserting into webhook_side_effects
 * - Marks events success/failed/dead_letter via webhook.mark_event_result
 *
 * ENV:
 *  DATABASE_URL - Postgres connection string
 *  POLL_INTERVAL_MS - polling interval (default 1000)
 *  MAX_ATTEMPTS - max attempts before dead_letter (default 5)
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '1000', 10);
const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS || '5', 10);

const client = new Client({ connectionString: DATABASE_URL });

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function claimEvent() {
  const res = await client.query('SELECT * FROM webhook.claim_next_event(NULL)');
  return res.rows[0] || null;
}

async function markResult(id, status, error = null) {
  await client.query('SELECT webhook.mark_event_result($1::uuid, $2::webhook_event_status, $3::text)', [id, status, error]);
}

async function upsertSideEffect(provider, eventId, payload) {
  // ensure idempotent side-effect marker
  const q = `
    INSERT INTO webhook_side_effects (id, provider, event_id, payload, created_at)
    VALUES (gen_random_uuid(), $1, $2, $3::jsonb, now())
    ON CONFLICT (provider, event_id) DO NOTHING
    RETURNING id;
  `;
  const r = await client.query(q, [provider, eventId, JSON.stringify(payload)]);
  return r.rows[0] ? true : false;
}

async function processEvent(ev) {
  const { id, webhook_id, event_id, payload } = ev;
  const provider = 'mock-provider';
  try {
    // Simulate signature validation - in CI we accept all
    const validSignature = true; // Expand to real check if needed
    if (!validSignature) {
      await markResult(id, 'dead_letter', 'signature_invalid');
      console.log(`Event ${event_id} dead-lettered: signature invalid`);
      return;
    }

    // idempotent side-effect
    const didInsert = await upsertSideEffect(provider, event_id, payload);
    if (didInsert) {
      // Simulate downstream call success (e.g., update external system)
      await markResult(id, 'success', null);
      console.log(`Event ${event_id} processed successfully (inserted side effect).`);
    } else {
      // Already processed before (idempotent)
      await markResult(id, 'success', null);
      console.log(`Event ${event_id} already processed; marked success idempotently.`);
    }
  } catch (err) {
    console.error('Processing error for event', event_id, err);
    // examine attempts and decide
    const attemptsRes = await client.query('SELECT attempts FROM webhook_events WHERE id = $1', [id]);
    const attempts = (attemptsRes.rows[0] && attemptsRes.rows[0].attempts) || 0;
    if (attempts >= MAX_ATTEMPTS) {
      await markResult(id, 'dead_letter', err.message);
      console.log(`Event ${event_id} moved to dead_letter after ${attempts} attempts.`);
    } else {
      // set back to pending to retry later
      await client.query('UPDATE webhook_events SET status = $1 WHERE id = $2', ['pending', id]);
      console.log(`Event ${event_id} set back to pending for retry.`);
    }
  }
}

async function main() {
  await client.connect();
  console.log('Webhook worker stub started.');
  // ensure side effect table exists for idempotency test
  await client.query(`
    CREATE TABLE IF NOT EXISTS webhook_side_effects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (provider, event_id)
    );
  `);

  while (true) {
    try {
      const ev = await claimEvent();
      if (!ev) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      await processEvent(ev);
    } catch (err) {
      console.error('Worker main loop error', err);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

main().catch((e) => {
  console.error('Fatal worker error', e);
  process.exit(1);
});
```

Notes:
- The worker stub is intentionally minimal and safe for CI/local testing. Replace signature validation and side-effect operations with production implementations later.

---

## 3) DLQ replay tooling: tools/webhook_replay.sh

Path: tools/webhook_replay.sh

```bash
#!/usr/bin/env bash
# tools/webhook_replay.sh
#
# Replay dead-lettered webhook events back into processing.
# Usage:
#   ./tools/webhook_replay.sh --webhook-id <uuid> --limit 100
#   ./tools/webhook_replay.sh --event-id <event-id>
# Requires: psql in PATH and DATABASE_URL env var pointing to target DB
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 [--webhook-id UUID] [--event-id EVENT_ID] [--limit N] [--dry-run]
Options:
  --webhook-id UUID   Replay dead letters for a specific webhook_id
  --event-id ID       Replay a specific event_id
  --limit N           Limit number of rows to replay (default 100)
  --dry-run           Print actions but do not modify DB
EOF
  exit 1
}

WEBHOOK_ID=""
EVENT_ID=""
LIMIT=100
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --webhook-id) WEBHOOK_ID="$2"; shift 2;;
    --event-id) EVENT_ID="$2"; shift 2;;
    --limit) LIMIT="$2"; shift 2;;
    --dry-run) DRY_RUN=1; shift 1;;
    *) echo "Unknown arg: $1"; usage;;
  esac
done

if [[ -z "$WEBHOOK_ID" && -z "$EVENT_ID" ]]; then
  echo "Either --webhook-id or --event-id must be provided"
  usage
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Please set DATABASE_URL env var to target DB"
  exit 2
fi

# Query dead-letter rows
if [[ -n "$EVENT_ID" ]]; then
  SQL="SELECT id, webhook_id, event_id, status, attempts, error FROM webhook_events WHERE event_id = '$EVENT_ID' AND status = 'dead_letter' LIMIT $LIMIT;"
else
  SQL="SELECT id, webhook_id, event_id, status, attempts, error FROM webhook_events WHERE webhook_id = '$WEBHOOK_ID' AND status = 'dead_letter' ORDER BY received_at LIMIT $LIMIT;"
fi

echo "Found dead-letter rows:"
psql "$DATABASE_URL" -c "$SQL"

if [[ $DRY_RUN -eq 1 ]]; then
  echo "Dry run mode - exiting without changes"
  exit 0
fi

# Replay by setting status back to pending and increment replay audit
REPLAY_SQL="WITH dl AS (
  SELECT id
  FROM webhook_events
  WHERE status = 'dead_letter'
  ${WEBHOOK_ID:+AND webhook_id = '$WEBHOOK_ID'}
  ${EVENT_ID:+AND event_id = '$EVENT_ID'}
  ORDER BY received_at
  LIMIT $LIMIT
)
UPDATE webhook_events
SET status = 'pending',
    attempts = 0,
    last_attempt_at = NULL,
    error = NULL
FROM dl
WHERE webhook_events.id = dl.id
RETURNING webhook_events.id, webhook_events.webhook_id, webhook_events.event_id;"

echo "Replaying events:"
psql "$DATABASE_URL" -c "$REPLAY_SQL"

# Insert audit log entry for the replay action (if audit schema exists)
AUDIT_SQL="INSERT INTO audit.audit_logs(table_name, operation, row_data, changed_by, clinic_id)
VALUES ('webhook_events', 'replay', jsonb_build_object('webhook_id', coalesce('$WEBHOOK_ID', ''), 'event_id', coalesce('$EVENT_ID', ''), 'note', 'operator replay executed'), current_setting('app.current_user_id', true)::UUID, current_setting('app.current_clinic_id', true)::UUID);"

# Attempt audit insert but do not fail if audit schema missing
psql "$DATABASE_URL" -c "$AUDIT_SQL" || true

echo "Replay complete."
```

Notes:
- The script resets attempts and status to pending so workers will re-process. Ensure operator invokes with correct context (app.current_user_id set for audit if needed).

---

## 4) Provider contract docs (minimal)

### 4.1 docs/integrations/stripe.md

Path: docs/integrations/stripe.md

```md
# Stripe Webhook Integration (contract notes)

Headers
- Stripe sends `Stripe-Signature` header containing timestamp and v1 signature.
- Validate using the webhook signing secret via HMAC SHA-256 as per Stripe docs.

Event id
- Use `event.id` (e.g., `evt_1Hxxxx`) as canonical event_id persisted into webhook_events for deduplication.

Idempotency
- For outgoing calls to Stripe (e.g., refunds), use Stripe's Idempotency-Key header with a stable key derived from your internal id (e.g., `booking:{appointment_id}`).

Recommended retry policy
- Treat 4xx from provider as permanent (dead-letter?) — but validation failures should dead-letter locally.
- For transient 5xx, retry with exponential backoff and move to DLQ after configured attempts.

Example minimal payload
```json
{
  "id": "evt_12345",
  "type": "payment_intent.succeeded",
  "data": { "object": { "id": "pi_12345", "amount": 1000 } }
}
```
```

---

### 4.2 docs/integrations/whatsapp.md

Path: docs/integrations/whatsapp.md

```md
# WhatsApp / Twilio-like Webhook Integration

Headers
- Provider supplies a signature header (name varies) to validate payload integrity.
- Verify using provider secret and recommended algorithm (HMAC).

Event id
- Use provider's message/event id as `event_id` for deduplication.

Idempotency
- Ensure outgoing replies are idempotent by storing outbound message id mapped to event_id and preventing duplicates.

Example payload (simplified)
```json
{
  "event_id": "msg_abc123",
  "from": "+65xxxxxxx",
  "to": "+65yyyyyyy",
  "text": "User message content"
}
```
```

---

### 4.3 docs/integrations/daily.md

Path: docs/integrations/daily.md

```md
# Daily.co Webhook Notes (Telemedicine)

Event id
- Use `event.id` or session identifiers returned by Daily as canonical event_id.

Signature
- Daily may provide verification headers; use them to validate.

Idempotency
- Use event_id to guard creation of meeting records or recording artifacts.

Example event
```json
{
  "id": "dly_ev_123",
  "type": "participant_joined",
  "data": { "participant_id": "pt_1", "session_id": "sess_123" }
}
```
```

---

## 5) Contract test harness and scripts

### 5.1 test/contract/webhook_contract_test.js

Path: test/contract/webhook_contract_test.js

```js
/**
 * Contract test that:
 *  - Inserts a mock webhook_events row with event_id 'evt-1'
 *  - Starts worker stub and waits for processing
 *  - Re-inserts same event_id (simulate resend) and asserts no duplicate side-effect
 *  - Inserts a failing event (handler throws) to verify dead-lettering
 *  - Uses tools/webhook_replay.sh to replay dead-letter and check reprocessing
 *
 * Run: node test/contract/webhook_contract_test.js
 */
const { Client } = require('pg');
const { spawn } = require('child_process');
const assert = require('assert').strict;

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const client = new Client({ connectionString: DATABASE_URL });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function startWorker() {
  const proc = spawn('node', ['src/workers/webhook_processor_stub.js'], { stdio: 'inherit', env: process.env });
  return proc;
}

async function insertEvent(eventId, payload = {}) {
  const res = await client.query(
    `INSERT INTO webhook_events (webhook_id, event_id, payload, status, received_at) VALUES ($1::uuid, $2::text, $3::jsonb, 'pending', now())
     ON CONFLICT (webhook_id, event_id) DO NOTHING
     RETURNING id;`, ['00000000-0000-0000-0000-000000000001', eventId, payload]
  );
  return res.rows[0] ? res.rows[0].id : null;
}

async function countSideEffects(eventId) {
  const r = await client.query('SELECT count(*) AS cnt FROM webhook_side_effects WHERE event_id = $1', [eventId]);
  return parseInt(r.rows[0].cnt, 10);
}

async function getEventStatus(eventId) {
  const r = await client.query('SELECT status, attempts, error FROM webhook_events WHERE event_id = $1', [eventId]);
  return r.rows[0];
}

async function main() {
  await client.connect();

  // Ensure schema present
  await client.query('SELECT 1');

  // start worker
  console.log('Starting worker stub...');
  const workerProc = await startWorker();
  await sleep(1000);

  // Insert event1
  console.log('Inserting event evt-1');
  await insertEvent('evt-1', { foo: 'bar' });

  // Wait for processing (poll)
  for (let i = 0; i < 20; i++) {
    const cnt = await countSideEffects('evt-1');
    if (cnt >= 1) break;
    await sleep(500);
  }
  let cnt1 = await countSideEffects('evt-1');
  console.log('Side-effect count for evt-1:', cnt1);
  assert(cnt1 === 1, 'Expected exactly 1 side-effect for evt-1');

  // Simulate provider resend of same event_id
  console.log('Re-inserting same event_id to simulate resend (should not create duplicate)');
  await insertEvent('evt-1', { foo: 'bar' });
  await sleep(1000);
  let cnt2 = await countSideEffects('evt-1');
  console.log('Side-effect count after resend:', cnt2);
  assert(cnt2 === 1, 'Idempotency violated: duplicate side-effect detected');

  // Insert failing event by making processing throw (simulate by using special payload)
  console.log('Inserting event that will fail handler: evt-fail');
  await insertEvent('evt-fail', { fail: true });

  // Wait until status = dead_letter
  let status = null;
  for (let i = 0; i < 30; i++) {
    status = await getEventStatus('evt-fail');
    if (status && status.status === 'dead_letter') break;
    await sleep(1000);
  }
  console.log('evt-fail status:', status);
  assert(status && status.status === 'dead_letter', 'Expected evt-fail to be dead_letter');

  // Replay dead-letter via tools/webhook_replay.sh
  console.log('Replaying dead-lettered evt-fail...');
  const replay = spawn('bash', ['tools/webhook_replay.sh', '--event-id', 'evt-fail'], { stdio: 'inherit', env: process.env });
  await new Promise((resolve) => replay.on('close', resolve));
  // Wait for worker to reprocess
  for (let i = 0; i < 20; i++) {
    const cnt = await countSideEffects('evt-fail');
    if (cnt >= 1) break;
    await sleep(500);
  }
  const cntFail = await countSideEffects('evt-fail');
  console.log('Side-effect count for evt-fail after replay:', cntFail);
  assert(cntFail === 1, 'Replay did not produce expected side-effect');

  // Cleanup: stop worker
  workerProc.kill('SIGTERM');

  console.log('Contract tests passed.');
  await client.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Contract test failed', err);
  try { await client.end(); } catch (e) {}
  process.exit(2);
});
```

Notes:
- The test expects worker stub to interpret payload `{ fail: true }` as a transient failure to trigger retries. The worker stub can be adapted to throw for such a payload. Currently the stub treats all payloads as success; for this test you may add a conditional in the stub to throw on payload.fail === true. I will add that change next.

---

### 5) Slight worker stub update for failing event behavior

Add this snippet inside processEvent() in src/workers/webhook_processor_stub.js (replace or augment behavior):

```js
    // Simulate a failing handler when payload.fail === true (for contract test)
    if (payload && payload.fail) {
      throw new Error('simulated handler error (test)');
    }
```

This ensures contract test's failing event transitions to dead_letter after MAX_ATTEMPTS.

---

## 6) CI workflow: .github/workflows/webhook_contract_tests.yml

Path: .github/workflows/webhook_contract_tests.yml

```yaml
name: Webhook Contract Tests

on:
  workflow_dispatch:
  pull_request:
    types: [labeled]

jobs:
  webhook-contracts:
    if: github.event_name == 'workflow_dispatch' || contains(github.event.pull_request.labels.*.name, 'run-webhook-contracts')
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd="pg_isready -U postgres"
          --health-interval=5s
          --health-timeout=5s
          --health-retries=5
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/postgres
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Wait for Postgres
        run: |
          until pg_isready -h localhost -p 5432 -U postgres; do echo "waiting for postgres"; sleep 1; done

      - name: Apply migrations
        run: |
          for f in migrations/*.sql; do echo "Applying $f"; psql $DATABASE_URL -f "$f"; done

      - name: Install Node deps
        run: |
          npm ci || true

      - name: Start worker stub
        run: |
          node src/workers/webhook_processor_stub.js &> worker.log &
          sleep 2
          tail -n +1 worker.log || true

      - name: Run contract tests
        run: |
          node test/contract/webhook_contract_test.js

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: webhook-logs
          path: worker.log
```

Notes:
- Trigger the workflow via workflow_dispatch or by adding label `run-webhook-contracts` to a PR to avoid running on every PR by default.

---

## 7) Ops runbook: docs/ops/webhook_runbook.md

Path: docs/ops/webhook_runbook.md

```md
# Webhook Processing Runbook

Key tables
- webhook_events: ingestion and processing state machine
- webhook_side_effects: idempotent marker for downstream side-effects

Common operations
- Inspect pending events:
  SELECT id,event_id,status,attempts,received_at FROM webhook_events WHERE status = 'pending' ORDER BY received_at LIMIT 100;
- Inspect dead-letter queue:
  SELECT id,event_id,webhook_id,error,attempts,received_at FROM webhook_events WHERE status = 'dead_letter' ORDER BY received_at;

Replay dead letters
- Use tools/webhook_replay.sh with appropriate filters:
  ./tools/webhook_replay.sh --event-id evt-123
  ./tools/webhook_replay.sh --webhook-id <uuid> --limit 50

Handling poison messages
- Identify the error in webhook_events.error
- If schema mismatch or permanently invalid payload/signature: mark as dead_letter (already done), and consider manual remediation or discard.
- For transient failures: replay after root cause resolved.

Monitoring & alerts
- Monitor webhook_processing_total rate and webhook_dead_letter_total.
- Alert if dead-letter rate increases beyond threshold or if backlog > X after Y minutes.

Security
- Verify signature verification logic and rotate provider secrets as needed.
- Audit all replay actions using audit.audit_logs which records operator replay actions (tools/webhook_replay.sh inserts an audit row).

Operator guidance for production replay
1. Verify root cause fixed (e.g., downstream API issues, schema fix).
2. Run replay on a small subset (single event or small limit).
3. Observe worker logs and side_effects to ensure idempotent processing.
4. If replay succeeds, escalate and replay in larger batches.

Notes
- Prefer reprocessing in staging before mass replays in production.
- Keep a pre-replay snapshot or ensure audit trail exists to track changes caused by replays.
```

---

## 8) Metrics definitions additions: metrics/definitions.md (append)

Path: metrics/definitions.md (append)

```md
# Webhook metrics (additional)

- webhook_processing_total (counter)
  - Labels: webhook_id, provider, result (success|error)
  - Description: total number of processed webhook events

- webhook_dead_letter_total (counter)
  - Labels: webhook_id, provider, reason
  - Description: total number of events moved to dead-letter

- webhook_replay_total (counter)
  - Labels: webhook_id, operator
  - Description: total number of DLQ replay actions executed
```

---

## Validation notes and how to run tests locally

1. Start Postgres (docker):
   - docker run --rm -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
2. Apply migrations up to 00013:
   - psql $DATABASE_URL -f migrations/00001_create_extensions.sql ... -f migrations/00013_webhook_processing_helpers.sql
3. Start worker stub:
   - node src/workers/webhook_processor_stub.js &
4. Run contract test:
   - node test/contract/webhook_contract_test.js
5. Expected results:
   - Contract test prints "Contract tests passed."
   - No duplicate side_effects for repeated event_id.
   - Dead-lettered event gets replayed successfully and produces side-effect.

CI expectations
- .github/workflows/webhook_contract_tests.yml runs the contract test with ephemeral Postgres and uploads worker logs.

---

## Final notes, security reminders, and next steps

- SECURITY DEFINER functions in migrations (webhook.claim_next_event, webhook.mark_event_result) must be audited and restricted in production. Create a minimal DB role for worker functions and restrict privileges to only necessary tables.
- Worker stub is intentionally minimal. Replace with robust worker implementation using job queue, concurrency controls, observability hooks, and secrets management for signature verification in production.
- Contract tests are designed to run in an isolated ephemeral environment; avoid using production secrets or live provider endpoints in CI.
- After Sprint 3, recommended next activities:
  - Replace stub worker with production worker using real signature verification and structured handlers.
  - Add monitoring dashboards and alerts for webhook metrics.
  - Conduct a staging run with simulated provider traffic and larger volume to validate scaling.
