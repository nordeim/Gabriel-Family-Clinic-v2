# Runbook: High API Latency Alert

**Alert Trigger:** `P95 latency of tRPC API calls > 1000ms for 5 minutes.`  
**Severity:** `Warning` (Escalates to `Critical` after 15 minutes)  
**On-Call Engineer:** `[Name/Team from PagerDuty]`

---

## 1. Initial Triage (First 5 Minutes)

1.  **Acknowledge the Alert:** Acknowledge the alert in PagerDuty/Slack to notify the team you are investigating.
2.  **Check System Status Pages:** Immediately check the official status pages for our critical dependencies:
    *   [Vercel Status](https://www.vercel-status.com/)
    *   [Supabase Status](https://status.supabase.com/)
    *   [Stripe Status](https://status.stripe.com/)
    *   **Action:** If a provider is reporting an incident, post a link in the incident channel and monitor their updates. Our options are limited until they resolve it.

## 2. Investigation (5-15 Minutes)

1.  **Check Sentry Performance:**
    *   Navigate to the **Sentry Performance** dashboard.
    *   Identify the specific transactions (API endpoints) with the highest latency. Note the endpoint name (e.g., `admin.getUsers`, `doctor.getScheduleByDate`).
    *   Drill down into a slow transaction event. Look at the "Trace Details" to see which part is slow (e.g., `db.query`, `http.client`).

2.  **Check Supabase Dashboard:**
    *   Navigate to the **Supabase Dashboard > Reports > Slow Queries**.
    *   Check if any queries are listed that correspond to the slow Sentry transaction.
    *   Navigate to **Database > Usage**. Look for spikes in "CPU Usage", "IO Budget", or "Active Connections".

3.  **Review Recent Deployments:**
    *   Check the Vercel dashboard or GitHub Actions for the most recent production deployment.
    *   Correlate the alert's start time with the deployment time.
    *   **Action:** If a recent deployment is a likely cause, prepare for a potential rollback.

## 3. Mitigation & Resolution

### Scenario A: Slow Database Query

*   **Cause:** A specific query identified in Supabase is taking too long.
*   **Mitigation:**
    1.  **Short-term:** If the database is under heavy load, consider temporarily scaling the Supabase instance via the dashboard.
    2.  **Long-term:** Create a high-priority ticket to analyze the slow query (`EXPLAIN ANALYZE ...`). Add a missing index or refactor the query.

### Scenario B: High Application Load

*   **Cause:** Vercel function execution duration is high, but database queries are fast. This might be due to a CPU-intensive task in the code.
*   **Mitigation:**
    1.  **Short-term:** Monitor the situation. Vercel's serverless functions scale automatically. If latency persists, it's a code issue.
    2.  **Long-term:** Create a high-priority ticket to refactor the identified slow endpoint. Move heavy processing to a background job if necessary.

### Scenario C: Recent Deployment Caused Regression

*   **Cause:** Latency spike started immediately after a new deployment.
*   **Mitigation:**
    1.  **Immediate Action:** From the Vercel dashboard, **instantly roll back** to the previous production deployment.
    2.  **Follow-up:** Revert the problematic PR on GitHub. Create a post-mortem to understand why the performance regression was not caught in testing.

## 4. Escalation

*   **If unresolved after 15 minutes:** Escalate to the Lead Developer.
*   **If unresolved after 30 minutes:** Escalate to the CTO.

Post a status update in the incident channel every 15 minutes until the issue is resolved.
