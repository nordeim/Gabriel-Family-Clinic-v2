Of course. The project is now entering its final, and in many ways, most important phase: the transition from development to live operations. Phase 10, "Post-Launch Support," is about ensuring the platform's long-term health, stability, and responsiveness to user needs. This is where our meticulous planning pays dividends.

My approach for this sub-plan will be to create the tools, scripts, and documentation necessary for proactive monitoring, efficient bug fixing, and structured feedback collection. This phase is less about building new features and more about building the operational backbone that will sustain the platform. I have thoroughly reviewed the `Master_Execution_Plan` for Phase 10 and will ensure this plan provides the final, crucial pieces for a mature, operational system.

Here is the comprehensive sub-plan for implementing Phase 10.

---

### **Comprehensive Sub-Plan: Phase 10 - Post-Launch Support**

**Objective:** To establish the necessary tools and processes for effective post-launch monitoring, maintenance, and user feedback collection. This includes creating automated health checks, incident response runbooks, a user feedback widget, performance monitoring reports, and scripts for routine database maintenance.

#### **Guiding Principles for Implementation**

1.  **Proactive Monitoring:** We will not wait for users to report problems. Automated health checks and performance baselines will alert us to issues before they impact the user experience.
2.  **Structured Incident Response:** When an issue does occur, our response should be swift, systematic, and well-documented. We will create runbooks to guide the on-call team.
3.  **Closing the Feedback Loop:** We will make it effortless for users to provide feedback directly within the application and establish a process for analyzing and acting on that feedback.
4.  **Automated Maintenance:** Routine tasks like database maintenance and security scans will be automated to ensure the long-term health and security of the platform without manual intervention.

---

### **Execution Plan: Sequential File Creation & Task Execution**

This phase focuses on creating scripts, documentation, and small, targeted UI components for operational support.

#### **Part 1: Proactive Monitoring & Alerting**

**Objective:** To build an automated system that constantly monitors the health of our platform and alerts the team to any degradation.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `@/pages/api/health.ts` | An enhanced, comprehensive health check API endpoint. This will be the single source of truth for our platform's operational status, to be pinged by our uptime monitor. | `[ ]` Create the API route.<br>`[ ]` Implement a `checkDatabase` function that performs a simple query (e.g., `SELECT 1`).<br>`[ ]` Implement a `checkThirdPartyServices` function that makes lightweight test calls to Stripe and Twilio APIs.<br>`[ ]` Aggregate the results into a single JSON response with an overall status and a breakdown for each service.<br>`[ ]` Return a `503 Service Unavailable` status if a critical dependency (like the database) is down. |
| `docs/monitoring/runbooks/high-api-latency.md`| A detailed runbook for the on-call engineer to follow when alerted about high API latency. | `[ ]` Define the alert condition (e.g., "p95 latency > 1000ms for 5 minutes").<br>`[ ]` List step-by-step investigation procedures: check Vercel, check Supabase for slow queries, review recent deployments.<br>`[ ]` Provide quick mitigation steps (e.g., restart services, check for infrastructure issues).<br>`[ ]` Define a clear escalation path (who to contact if the issue is not resolved). |
| `docs/monitoring/runbooks/database-connection-failure.md`| A runbook for responding to a database connectivity alert. | `[ ]` Define the alert condition.<br>`[ ]` List investigation steps: check Supabase status page, check connection pool utilization, review for recent schema changes.<br>`[ ]` Provide mitigation steps, including how to contact Supabase support. |
| **Alerting Setup** | (Task) Configure our monitoring tools to send alerts based on the health checks and runbooks. | `[ ]` Set up an UptimeRobot or Better Uptime monitor to ping `/api/health` every 5 minutes.<br>`[ ]` Configure the monitor to send an alert to a dedicated Slack channel and the on-call email if the endpoint returns a non-200 status or fails to respond.<br>`[ ]` In Sentry, create alert rules for spikes in error rates or performance degradation (Apdex score). |

#### **Part 2: User Feedback Collection**

**Objective:** To embed a simple, non-intrusive feedback mechanism within the application.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `database/migrations/018_feedback_table.sql` | A new database migration to create a table for storing user feedback. | `[ ]` Create a `user_feedback` table with columns: `id`, `user_id`, `rating` (1-5), `feedback_text`, `page_url`, `user_agent`, `created_at`. |
| `@/lib/trpc/routers/feedback.router.ts` | A new tRPC router for submitting feedback. | `[ ]` Create a new `router`.<br>`[ ]` Implement a `submitFeedback` `protectedProcedure` that takes rating, text, and page URL as input.<br>`[ ]` The procedure will save the feedback to the new `user_feedback` table along with the authenticated `user_id`. |
| `@/components/feedback/FeedbackWidget.tsx` | A floating widget that allows users to open a feedback form. | `[ ]` Create a floating action button (FAB) fixed to the bottom-right of the screen.<br>`[ ]` Clicking the button opens a Mantine Modal or Drawer.<br>`[ ]` The modal will contain a simple form with a star rating component and a textarea.<br>`[ ]` On submit, it will call the `api.feedback.submitFeedback.useMutation` and show a success message. |
| `@/pages/_app.tsx` | (Update) Render the `FeedbackWidget` globally so it appears on every page. | `[ ]` Wrap the `<Layout>` component with a fragment or div.<br>`[ ]` Render the `<FeedbackWidget />` alongside the `<Layout>`, but outside of it, so it can be positioned globally. |

#### **Part 3: Performance Monitoring & Reporting**

**Objective:** To establish a baseline for performance and create a process for ongoing monitoring.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `docs/monitoring/performance-baseline.md` | A markdown document to record the initial performance metrics immediately after launch. This will be our benchmark for all future optimizations. | `[ ]` Create sections for Core Web Vitals (LCP, FID, CLS), API Performance (p95 latency for key endpoints), and Database Performance.<br>`[ ]` Run Lighthouse, WebPageTest, and `k6` load tests against the production environment and record the initial results. |
| `scripts/performance-report.ts` | A script that can be run weekly (manually or via cron) to gather key performance metrics and generate a summary. | `[ ]` Use the Google PageSpeed Insights API to fetch Core Web Vitals data.<br>`[ ]` Use the Sentry API to fetch API latency data and error rates.<br>`[ ]` Format the data into a markdown report that compares the current week's metrics to the established baseline. |

#### **Part 4: Routine Maintenance**

**Objective:** To automate essential maintenance tasks to ensure the platform remains healthy and secure over time.

| File Path | Description | Checklist |
| :--- | :--- | :--- |
| `scripts/database-maintenance.ts` | A script to perform routine PostgreSQL maintenance tasks. This will be run as a scheduled cron job. | `[ ]` Implement a `runMaintenance` function.<br>`[ ]` Include a step to run `VACUUM ANALYZE` on frequently updated tables like `appointments` and `jobs`.<br>`[ ]` Add logic to archive old data (e.g., move appointments older than 2 years from the primary table to the `archive.appointments` table).<br>`[ ]` Add logic to clean up old, completed jobs from the `jobs` table. |
| `scripts/dependency-update.sh` | A shell script to help automate the process of checking for and updating package dependencies. | `[ ]` Use `npm outdated` to list outdated packages.<br>`[ ]` Use `npm update` to safely update minor and patch versions.<br>`[ ]` Include a step to run `npx snyk test` after updating to check for new vulnerabilities. |
| `.github/workflows/scheduled-maintenance.yml` | A new GitHub Actions workflow to run our maintenance scripts on a schedule. | `[ ]` Set up a cron schedule to run weekly (e.g., every Sunday at 3 AM SGT).<br>`[ ]` Add a job to run the database maintenance script.<br>`[ ]` Add a job to run a security scan (`npx snyk test`) and send an alert if new vulnerabilities are found. |

---

### **Validation and Approval**

I have validated this sub-plan against all project requirements for Phase 10.

*   **Completeness:** The plan covers all specified deliverables for post-launch support: monitoring, bug/feedback handling, performance reporting, and maintenance.
*   **Architectural Integrity:** The plan builds upon our existing infrastructure. The health check is a natural extension of our API, the feedback system uses our tRPC layer, and the maintenance tasks are automated through our CI/CD platform (GitHub Actions).
*   **Operational Maturity:** This plan moves the project from a "development" mindset to an "operations" mindset. The creation of runbooks, automated health checks, and scheduled maintenance scripts are hallmarks of a mature, production-ready system.
*   **Feasibility:** The tasks are well-defined and utilize a mix of custom scripts and industry-standard tools. The plan is highly achievable and will provide immense value in ensuring the long-term stability and success of the platform.

This plan provides the final layer of operational tooling and process required to confidently launch and maintain the Gabriel Family Clinic platform.

I await your approval to proceed with the implementation of this final plan.
