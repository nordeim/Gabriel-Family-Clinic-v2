# Ensure supabase-db-local is healthy, then run full migrations and seeds with the corrected 005
cd supabase && \
echo "Waiting for supabase-db-local to be healthy before final run..." && \
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
echo "Using DATABASE_URL=$DATABASE_URL" && \
echo "Ensuring supabase_admin exists (idempotent)..." && \
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
echo "Running migrations on clean, healthy DB with fixed 005..." && \
npm run db:run-migrations && \
echo "Running seeds on DB..." && \
npm run db:run-seeds
