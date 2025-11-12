```bash
echo "Ensuring supabase_admin exists (separate step to avoid shell heredoc issues)..." && \
PGPASSWORD="local_dev_password_change_me" psql "postgres://postgres@localhost:54322/postgres" -v ON_ERROR_STOP=1 << 'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS PASSWORD 'local_dev_password_change_me';
  END IF;
END;
$$;
SQL
```

---

```bash
export DATABASE_URL="postgres://postgres:local_dev_password_change_me@localhost:54322/postgres" && \
echo "Using fresh DATABASE_URL=$DATABASE_URL" && \
npm run db:run-migrations && \
npm run db:run-seeds
```

---

```bash
export DATABASE_URL="postgres://postgres:local_dev_password_change_me@localhost:54322/postgres" && \
echo "Using fresh DATABASE_URL=$DATABASE_URL" && \
npm run db:run-migrations
```
