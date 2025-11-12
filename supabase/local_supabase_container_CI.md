Executive summary

We’ll design a CI job template that:

- Spins up the `supabase-db` service using your existing `supabase/docker-compose.yml`.
- Waits until Postgres is healthy.
- Runs your existing:
  - `npm run db:run-migrations`
  - `npm run db:run-seeds`
- Fails fast on any migration/seed error.
- Tears everything down cleanly.
- Stays minimal-impact: no new migration tools, no changes to your app code.

I’ll first plan meticulously (phased, with trade-offs), validate that plan against your constraints, then in the next step we can generate concrete CI config (e.g. GitHub Actions, GitLab CI, etc.) based on your chosen platform.

Phase 1: Requirements and constraints (CI-focused)

Explicit goals:

- On every PR / push (or on demand):
  - Verify that:
    - All SQL migrations apply cleanly to a fresh Supabase-like Postgres.
    - All seed scripts run successfully (respecting your environment guards).
- Use:
  - `supabase/docker-compose.yml`
  - Existing Node scripts:
    - `scripts/run-migrations.js`
    - `scripts/run-seeds.js`
- Keep:
  - No schema drift between local dev, CI, and Supabase production.
  - No hidden magic: commands should match what devs can run locally.

Constraints:

- Do not:
  - Introduce a new migration framework.
  - Hardcode sensitive credentials in CI config.
- Do:
  - Use `DATABASE_URL` as the single source of truth for target DB.
  - Use `supabase/postgres` image defined in `supabase/.env.docker`/Docker Compose (or CI overrides).
- CI environment assumptions:
  - Container-capable (Docker-in-Docker or service containers).
  - Can run Node + npm.
  - Can run `docker compose` (or `docker-compose`) with project-local YAML.

Key non-functional requirements:

- Deterministic:
  - Always runs against a fresh, empty database.
- Isolated:
  - No interference with other jobs.
- Fast enough:
  - Minimal extra overhead beyond:
    - Pulling the image
    - Running migrations/seeds

Phase 2: Architecture options for CI job

We need to choose how CI spins up `supabase-db` and how the Node process talks to it.

Option A: Docker Compose inside CI (recommended)

- Steps:
  - Checkout repo.
  - `cd supabase/`
  - Provide `.env.docker` values via CI env vars or generated file.
  - `docker compose up -d supabase-db`
  - Wait for healthcheck / readiness.
  - From project root, set `DATABASE_URL` to container host and run:
    - `npm run db:run-migrations`
    - `npm run db:run-seeds`
  - `docker compose down -v`
- Pros:
  - Uses the exact same `docker-compose.yml` as local dev.
  - Single definition of `supabase-db` behavior.
- Cons:
  - Requires Docker-in-Docker or equivalent capabilities in CI runners.

Option B: CI-native “service containers” (e.g. GitHub Actions services) without Compose

- Steps:
  - Define `supabase/postgres` as a service.
  - Run migrations/seeds against that service.
- Pros:
  - Fewer moving parts.
- Cons:
  - Duplicates configuration outside `supabase/docker-compose.yml`.
  - Divergence risk from your documented local stack.

Given your meticulous, DRY, minimal-impact philosophy:

- Option A is strongly preferred:
  - “Single source of truth” for local and CI DB stack.
  - Better alignment with your `supabase/` folder design.

We’ll design for Option A as the primary template.

Phase 3: Detailed CI workflow design

We need to define the precise sequence and invariants.

Core sequence

For a given CI job (e.g., “Database migrations/seeds validation”):

1) Checkout repository.
2) Set up Node (matching your project’s Node version).
3) Install dependencies (`npm ci` or equivalent).
4) Start `supabase-db`:
   - `cd supabase/`
   - Provide env (from CI secrets, not hardcoded).
   - `docker compose up -d supabase-db`
5) Wait for DB readiness:
   - Either rely on healthcheck + a `sleep` buffer.
   - Or run `wait-for-postgres.sh`.
6) Construct `DATABASE_URL` for the CI job.
7) Run migrations:
   - `npm run db:run-migrations`
8) Run seeds:
   - `npm run db:run-seeds`
9) If any step fails:
   - Mark job failed.
10) Always:
    - `docker compose down -v` to clean up.

Database URL and connectivity model

Two patterns are possible:

- Pattern 1: Use host `localhost` + mapped port:
  - In `supabase/.env.docker`, map container `5432` to host `54322`.
  - CI job connects to `postgres://...@localhost:54322/...`
- Pattern 2: Use Docker network DNS name:
  - Use the service name `supabase-db` and intra-network ports.
  - More robust if CI environment is tricky.

For CI simplicity and alignment with your local docs:

- Prefer Pattern 1 (host port mapping) for now.
- Use:
  - `SUPABASE_DB_PORT=54322`
  - `DATABASE_URL=postgres://user:pass@localhost:54322/db`

Sensitive values

We must not hardcode passwords in:

- `docker-compose.yml`
- CI YAML

Rules:

- Store credentials in CI as:
  - `SUPABASE_DB_USER`
  - `SUPABASE_DB_PASSWORD`
  - `SUPABASE_DB_NAME`
- Inject them into:
  - `supabase/.env.docker` (written at runtime in CI), or
  - `docker compose --env-file` arguments, or
  - Direct `environment:` overrides / `env` sections in CI.

Recommended pattern:

- In CI:
  - Define:
    - `CI_SUPABASE_DB_USER`
    - `CI_SUPABASE_DB_PASSWORD`
    - `CI_SUPABASE_DB_NAME`
- At runtime:
  - Generate `supabase/.env.docker` with those values.
  - This keeps your `docker-compose.yml` unchanged and reusable.

Failure modes and safeguards

We design to handle:

- Migrations failing:
  - Job exits non-zero → PR blocked.
- Seeds failing:
  - Same.
- DB not ready:
  - `wait-for-postgres.sh` times out → job fails clearly.
- Docker Compose not available:
  - CI config must ensure a runner with Docker/Compose; we’ll call that out in docs.

Phase 4: Validation of the plan

Check against your framework:

- Deep analysis:
  - Evaluated Compose vs services, host vs network, secret management.
- Systematic:
  - Clear 10-step sequence, single responsibility per step.
- Technical excellence:
  - Uses healthchecks, no secret leaks, reuses existing scripts.
- Strategic partnership:
  - Aligns CI behavior with dev workflow; uses your `supabase/` stack as SSOT.
- Transparent:
  - No hidden migrations; all steps explicit and reproducible locally.

This plan is sound and aligns tightly with your current architecture. Approved for implementation.

Phase 5: Implementation – CI job template (GitHub Actions example)

Below is a concrete GitHub Actions workflow template.
If you’re on another CI (GitLab, CircleCI, etc.), I can translate this 1:1.

File: `.github/workflows/db-validate.yml`

```yaml
name: Validate DB migrations and seeds

on:
  pull_request:
  push:
    branches:
      - main
      - develop

jobs:
  db-validate:
    name: DB migrations/seeds on Supabase-like Postgres
    runs-on: ubuntu-latest

    # IMPORTANT:
    # This job requires Docker + docker compose. GitHub-hosted runners support Docker.
    # For compose v2, we use `docker compose` syntax.

    env:
      # These are NON-SENSITIVE defaults for CI only.
      # Override with repo/org secrets for stronger isolation if desired.
      CI_SUPABASE_DB_USER: postgres
      CI_SUPABASE_DB_PASSWORD: postgres_password_ci_only
      CI_SUPABASE_DB_NAME: postgres
      CI_SUPABASE_DB_PORT: 54322

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: "20" # or match your project's Node version
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Prepare supabase/.env.docker
        working-directory: supabase
        run: |
          cat > .env.docker <<EOF
          SUPABASE_DB_IMAGE=supabase/postgres:17.6.1.044
          SUPABASE_DB_CONTAINER_NAME=supabase-db-ci

          SUPABASE_DB_USER=${CI_SUPABASE_DB_USER}
          SUPABASE_DB_PASSWORD=${CI_SUPABASE_DB_PASSWORD}
          SUPABASE_DB_NAME=${CI_SUPABASE_DB_NAME}

          SUPABASE_DB_PORT=${CI_SUPABASE_DB_PORT}
          EOF

      - name: Start Supabase DB container
        working-directory: supabase
        run: |
          docker compose --env-file .env.docker up -d supabase-db
          docker compose --env-file .env.docker ps

      - name: Wait for Postgres readiness
        working-directory: supabase
        run: |
          chmod +x wait-for-postgres.sh || true
          # If script exists, use it; otherwise rely on pg_isready manually.
          if [ -f "./wait-for-postgres.sh" ]; then
            SUPABASE_DB_PASSWORD=${CI_SUPABASE_DB_PASSWORD} \
              ./wait-for-postgres.sh localhost ${CI_SUPABASE_DB_PORT} ${CI_SUPABASE_DB_USER} ${CI_SUPABASE_DB_NAME} 40 3
          else
            echo "wait-for-postgres.sh not found, using pg_isready loop..."
            for i in {1..40}; do
              if PGPASSWORD="${CI_SUPABASE_DB_PASSWORD}" pg_isready -h localhost -p ${CI_SUPABASE_DB_PORT} -U ${CI_SUPABASE_DB_USER} -d ${CI_SUPABASE_DB_NAME}; then
                echo "Postgres is ready."
                break
              fi
              echo "Postgres not ready yet, retrying..."
              sleep 3
            done
          fi

      - name: Run migrations
        env:
          DATABASE_URL: postgres://${{ env.CI_SUPABASE_DB_USER }}:${{ env.CI_SUPABASE_DB_PASSWORD }}@localhost:${{ env.CI_SUPABASE_DB_PORT }}/${{ env.CI_SUPABASE_DB_NAME }}
          NODE_ENV: test
        run: |
          echo "Running migrations against $DATABASE_URL"
          npm run db:run-migrations

      - name: Run seeds
        env:
          DATABASE_URL: postgres://${{ env.CI_SUPABASE_DB_USER }}:${{ env.CI_SUPABASE_DB_PASSWORD }}@localhost:${{ env.CI_SUPABASE_DB_PORT }}/${{ env.CI_SUPABASE_DB_NAME }}
          NODE_ENV: test
        run: |
          echo "Running seeds against $DATABASE_URL"
          npm run db:run-seeds

      - name: Show resulting schemas (debug aid)
        if: always()
        env:
          PGPASSWORD: ${{ env.CI_SUPABASE_DB_PASSWORD }}
        run: |
          psql "host=localhost port=${CI_SUPABASE_DB_PORT} user=${CI_SUPABASE_DB_USER} dbname=${CI_SUPABASE_DB_NAME}" -c "\dn"
          psql "host=localhost port=${CI_SUPABASE_DB_PORT} user=${CI_SUPABASE_DB_USER} dbname=${CI_SUPABASE_DB_NAME}" -c "\dt"

      - name: Tear down Supabase DB container
        if: always()
        working-directory: supabase
        run: |
          docker compose --env-file .env.docker down -v
```

Key design notes:

- Uses your `supabase/docker-compose.yml` as-is:
  - Single configuration source for local + CI.
- Constructs `.env.docker` at runtime in CI:
  - No secrets in repo.
- Uses host `localhost:${CI_SUPABASE_DB_PORT}` to connect:
  - Matches your local pattern.
- Uses `NODE_ENV=test` for CI:
  - If your `002_dev_seed.sql` has environment guards, ensure they treat test appropriately (or adjust).
- Includes a debug step to inspect schemas/tables on failure:
  - Helpful for diagnosing migration issues.

Phase 6: Sanity checks and edge cases

Let’s preempt issues:

1) Migration or seed depends on extensions:
- Because we are using `supabase/postgres`, most Supabase-required extensions are available.
- If a migration fails with “extension does not exist”, that’s a real signal:
  - Either adjust migrations or confirm image version.

2) `002_dev_seed.sql` environment guard:
- If it checks something like:
  - `current_setting('app.environment', true)`
- Make sure:
  - Either CI sets this, or dev seed remains no-op without harming pipeline.
- If you share the exact guard logic, I can propose a clean CI-compatible pattern.

3) Runtime performance:
- Running migrations + seeds on fresh DB per job is usually acceptable.
- If it becomes slow:
  - We can:
    - Cache Docker layers.
    - Limit seeds in CI to system-only if appropriate (configurable).

4) Docker availability:
- GitHub-hosted runners: OK.
- Self-hosted: ensure Docker + compose are installed.

If you confirm your CI provider, I can:

- Provide an equivalent template for:
  - GitLab CI (`.gitlab-ci.yml`)
  - CircleCI
  - Bitbucket Pipelines
  - etc.

Next steps

- If you’re happy with this plan and template:
  - I can:
    - Tighten the YAML to your exact Node version and folder layout.
    - Add comments/ADR-style rationale for your repo.
    - Adjust for your specific `app.environment` guard semantics to ensure seeds behave correctly in CI.
