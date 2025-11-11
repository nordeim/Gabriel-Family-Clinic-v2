/**
 * scripts/run-migrations.js
 *
 * Minimal migration runner compatible with the existing database/migrations/*.sql files.
 * This script:
 * - Reads all .sql files in database/migrations
 * - Sorts them lexicographically (e.g. 001_*, 002_* ...)
 * - Executes each file in order against DATABASE_URL
 *
 * Requirements:
 * - DATABASE_URL must be set in environment (.env.local / .env)
 *
 * Notes:
 * - This intentionally stays simple and environment-agnostic.
 * - Uses the `postgres` client from npm (already in dependencies).
 */

import fs from "fs";
import path from "path";
import process from "process";
import postgres from "postgres";

const MIGRATIONS_DIR = path.join(process.cwd(), "database", "migrations");

async function run() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    // eslint-disable-next-line no-console
    console.error("DATABASE_URL is not set. Please configure your .env.local/.env.");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
  });

  try {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      // eslint-disable-next-line no-console
      console.log("No migration files found in", MIGRATIONS_DIR);
      await sql.end();
      process.exit(0);
    }

    // eslint-disable-next-line no-console
    console.log("Running migrations from", MIGRATIONS_DIR);
    for (const file of files) {
      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sqlText = fs.readFileSync(fullPath, "utf8");

      // eslint-disable-next-line no-console
      console.log(`\n=== Running migration: ${file} ===`);
      try {
        await sql.unsafe(sqlText);
        // eslint-disable-next-line no-console
        console.log(`=== Migration succeeded: ${file} ===`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`=== Migration failed: ${file} ===`);
        // eslint-disable-next-line no-console
        console.error(error);
        await sql.end();
        process.exit(1);
      }
    }

    await sql.end();
    // eslint-disable-next-line no-console
    console.log("\nAll migrations executed successfully.");
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Migration runner error:", error);
    try {
      await sql.end();
      // eslint-disable-next-line no-empty
    } catch {}
    process.exit(1);
  }
}

run();