/**
 * types/db.ts
 *
 * Minimal DB-facing types for critical tables used in application logic.
 * These interfaces are aligned with the current SQL migrations and intentionally
 * scoped to the fields actually consumed in code, to reduce accidental schema drift.
 *
 * Guidelines:
 * - Keep this file in sync with database/migrations.
 * - Always use `import type` when consuming these types to satisfy ESLint.
 * - These types describe the shape of records as used in application logic, not
 *   necessarily every column in the underlying tables.
 */

export interface PaymentRecord {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  payment_number: string;
  receipt_number: string;
  payment_date: string; // ISO date (YYYY-MM-DD)
  payment_method: string;
  payment_gateway: string | null;
  subtotal: number;
  chas_subsidy_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
  payment_intent_id?: string | null;
  transaction_reference?: string | null;
}

export interface TelemedicineSessionRecord {
  id: string;
  appointment_id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  room_url: string;
  room_name?: string | null;
  session_token: string;
  scheduled_start: string; // ISO timestamp
  scheduled_end: string; // ISO timestamp
}

export interface UserFeedbackRecord {
  id: string;
  user_id: string;
  rating?: number | null;
  feedback_text?: string | null;
  page_url: string;
  user_agent: string;
  created_at?: string; // ISO timestamp
}

export interface JobRecord {
  id: number | string;
  queue: string;
  payload: unknown;
  status: string;
  attempts: number;
  run_at: string; // ISO timestamp
  last_error?: string | null;
}