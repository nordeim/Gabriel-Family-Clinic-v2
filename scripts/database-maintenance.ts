// scripts/database-maintenance.ts
import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

// This script should be run with a service role key
const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMaintenance() {
  console.log("Starting database maintenance script...");

  // 1. VACUUM and ANALYZE frequently updated tables
  console.log("Running VACUUM ANALYZE on critical tables...");
  const tablesToMaintain = ["appointments", "jobs", "user_feedback"];
  for (const table of tablesToMaintain) {
    const { error } = await supabaseAdmin.rpc("vacuum_analyze_table", { table_name: table });
    if (error) console.error(`Failed to VACUUM ANALYZE ${table}:`, error);
  }

  // 2. Archive appointments older than 2 years
  console.log("Archiving old appointments...");
  const { error: archiveError } = await supabaseAdmin.rpc("archive_old_appointments");
  if (archiveError) console.error("Failed to archive old appointments:", archiveError);

  // 3. Clean up old, completed jobs from the job queue
  console.log("Cleaning up old jobs...");
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const { error: jobError } = await supabaseAdmin
    .from("jobs")
    .delete()
    .in("status", ["completed", "failed"])
    .lt("created_at", cutoffDate.toISOString());
  if (jobError) console.error("Failed to clean up old jobs:", jobError);

  console.log("Database maintenance script finished.");
}

runMaintenance().catch(console.error);
