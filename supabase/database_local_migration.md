# Apply final fix: remove generated columns from 005 to satisfy immutability rules
python - << 'PY'
from pathlib import Path

path = Path("database/migrations/005_scheduling_tables.sql")
sql = path.read_text()

before = """    -- Generated columns used for immutable overlap checking in the exclusion constraint.
    -- This keeps the index expression immutable and avoids relying on non-immutable functions.
    appointment_start_at TIMESTAMPTZ GENERATED ALWAYS AS
        ((appointment_date + appointment_time)::timestamptz) STORED,
    appointment_end_at TIMESTAMPTZ GENERATED ALWAYS AS
        ((appointment_date + appointment_time + (duration_minutes || ' minutes')::interval)::timestamptz) STORED,
"""
sql_new = sql.replace(before, "")

if sql_new == sql:
    print("Note: Generated column block not found or already removed; leaving file as-is.")
else:
    path.write_text(sql_new)
    print("Removed generated columns from 005_scheduling_tables.sql")

PY

# Reset DB cleanly and rerun full migrations + seeds
cd supabase && \
docker compose --env-file .env.docker down -v && \
docker compose --env-file .env.docker up -d supabase-db && \
echo "Waiting for supabase-db-local to become healthy..." && \
for i in {1..40}; do \
  STATUS=$(docker inspect -f '{{.State.Health.Status}}' supabase-db-local 2>/dev/null || echo "unknown"); \
  echo "Check #$i: status=$STATUS"; \
  if [ "$STATUS" = "healthy" ]; then \
    echo "Postgres is healthy."; \
    break; \
  fi; \
  if [ "$STATUS" = "unhealthy" ]; then \
    echo "Postgres reported unhealthy. Logs:"; \
    docker logs supabase-db-local || true; \
    exit 1; \
  fi; \
  sleep 3; \
done && \
cd .. && \
export DATABASE_URL="postgres://postgres:local_dev_password_change_me@localhost:54322/postgres" && \
echo "Using clean DATABASE_URL=$DATABASE_URL" && \
echo "Ensuring supabase_admin exists..." && \
PGPASSWORD="local_dev_password_change_me" psql "postgres://postgres@localhost:54322/postgres" -v ON_ERROR_STOP=1 << 'SQL'
DO $block$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin
      LOGIN
      SUPERUSER
      CREATEDB
      CREATEROLE
      REPLICATION
      BYPASSRLS
      PASSWORD 'local_dev_password_change_me';
  END IF;
END;
$block$;
SQL && \
echo "Running migrations on clean DB..." && \
npm run db:run-migrations && \
echo "Running seeds on clean DB..." && \
npm run db:run-seeds
