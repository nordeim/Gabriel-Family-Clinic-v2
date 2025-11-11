/**
 * scripts/run-seeds.js
 *
 * Purpose:
 * - Initialize a Supabase (or any Postgres) database with the seed SQL files
 *   under database/seeds/, after migrations have been applied.
 *
 * Design:
 * - Uses the same DATABASE_URL as scripts/run-migrations.js.
 * - Executes all .sql files in database/seeds lexicographically in a single
 *   Postgres session for predictable ordering.
 * - Safe for Supabase:
 *     - DATABASE_URL should point to your Supabase project's primary database.
 *     - Seed scripts are already annotated (001_system_seed: safe/production;
 *       002_dev_seed: guarded to only run in dev/test via app.environment).
 *
 * Usage:
 *   NODE_ENV=development \
 *   DATABASE_URL="postgres://user:pass@host:5432/postgres" \
 *   node -r dotenv/config scripts/run-seeds.js
 *
 * Or via npm:
 *   npm run db:run-seeds
 *
 * Requirements:
 * - DATABASE_URL must be set (see .env.example / .env.local).
 * - Seed SQL files must be valid and idempotent where appropriate.
 *
 * Meticulous behavior:
 * - Fails fast if DATABASE_URL is missing.
 * - Logs each executed seed file.
 * - Stops on first error to avoid partial/ambiguous initialization.
 */

import fs from "fs";
import path from "path";
import process from "process";
import postgres from "postgres";

const SEEDS_DIR = path.join(process.cwd(), "database", "seeds");

async function run() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    // eslint-disable-next-line no-console
    console.error(
      "[run-seeds] DATABASE_URL is not set. Configure your .env.local/.env before running seeds."
    );
    process.exit(1);
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
  });

  try {
    if (!fs.existsSync(SEEDS_DIR)) {
      // eslint-disable-next-line no-console
      console.log("[run-seeds] No seeds directory found at", SEEDS_DIR);
      await sql.end();
      process.exit(0);
    }

    const files = fs
      .readdirSync(SEEDS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      // eslint-disable-next-line no-console
      console.log("[run-seeds] No seed files found in", SEEDS_DIR);
      await sql.end();
      process.exit(0);
    }

    // eslint-disable-next-line no-console
    console.log("[run-seeds] Running seed files from", SEEDS_DIR);

    for (const file of files) {
      const fullPath = path.join(SEEDS_DIR, file);
      const sqlText = fs.readFileSync(fullPath, "utf8");

      // eslint-disable-next-line no-console
      console.log(`\n=== Running seed: ${file} ===`);

      try {
        await sql.unsafe(sqlText);
        // eslint-disable-next-line no-console
        console.log(`=== Seed succeeded: ${file} ===`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`=== Seed failed: ${file} ===`);
        // eslint-disable-next-line no-console
        console.error(error);
        await sql.end();
        process.exit(1);
      }
    }

    await sql.end();
    // eslint-disable-next-line no-console
    console.log("\n[run-seeds] All seeds executed successfully.");
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[run-seeds] Runner error:", error);
    try {
      await sql.end();
      // eslint-disable-next-line no-empty
    } catch {}
    process.exit(1);
  }
}

run();