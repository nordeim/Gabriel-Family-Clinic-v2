-- database/migrations/013_booking_transaction.sql

-- ============================================================================
-- Phase 2: Migration 013 - Booking Transaction Logic
-- Description: Implements the concurrency-safe booking stored procedure
--              and idempotency table from Sprint 2 plan.
-- ============================================================================

SET search_path TO booking, clinic, public;

-- 1. Create the `booking_requests` table for idempotency and tracking.
CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key TEXT NOT NULL,
  user_id UUID REFERENCES clinic.users(id), -- user who made the request
  clinic_id UUID NOT NULL REFERENCES clinic.clinics(id),
  slot_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | success | failed
  result JSONB,
  error TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (idempotency_key, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(status, created_at);


-- 2. Create the `create_booking` stored procedure.
CREATE OR REPLACE FUNCTION booking.create_booking(
  p_idempotency_key TEXT,
  p_user_id UUID,
  p_clinic_id UUID,
  p_slot_id UUID,
  p_patient_id UUID,
  p_visit_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  br RECORD;
  slot RECORD;
  doctor RECORD;
  clinic_code TEXT;
  new_appointment_id UUID;
  new_appointment_number TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Idempotency Check: Look for an existing booking request with this key.
  SELECT * INTO br FROM booking_requests
  WHERE idempotency_key = p_idempotency_key AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF FOUND THEN
    IF br.status = 'success' THEN
      RETURN jsonb_build_object('status', 'success', 'idempotent', true, 'result', br.result);
    ELSIF br.status IN ('processing', 'pending') THEN
      RETURN jsonb_build_object('status', 'conflict', 'code', 'in_progress', 'message', 'Booking is already in progress.');
    END IF;
    -- If status was 'failed', we allow a re-attempt by continuing.
    UPDATE booking_requests SET attempts = br.attempts + 1, updated_at = v_now WHERE id = br.id;
  ELSE
    -- No existing request, create one and mark it as 'processing'.
    INSERT INTO booking_requests (idempotency_key, user_id, clinic_id, slot_id, patient_id, status)
    VALUES (p_idempotency_key, p_user_id, p_clinic_id, p_slot_id, p_patient_id, 'processing')
    RETURNING * INTO br;
  END IF;

  -- 2. Atomically claim the appointment slot.
  -- SELECT ... FOR UPDATE locks the row, preventing any other transaction from modifying it.
  SELECT * INTO slot FROM clinic.appointment_slots WHERE id = p_slot_id AND clinic_id = p_clinic_id FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE booking_requests SET status = 'failed', error = 'slot_not_found' WHERE id = br.id;
    RETURN jsonb_build_object('status', 'error', 'code', 'slot_not_found', 'message', 'Appointment slot does not exist.');
  END IF;

  IF slot.is_available = false OR slot.appointment_id IS NOT NULL THEN
    UPDATE booking_requests SET status = 'failed', error = 'slot_unavailable' WHERE id = br.id;
    RETURN jsonb_build_object('status', 'conflict', 'code', 'slot_unavailable', 'message', 'Appointment slot is already booked.');
  END IF;

  -- 3. Perform the booking inside the transaction.
  SELECT d.* INTO doctor FROM clinic.doctors d WHERE d.id = slot.doctor_id;
  SELECT c.code INTO clinic_code FROM clinic.clinics c WHERE c.id = p_clinic_id;
  new_appointment_number := clinic.generate_appointment_number(clinic_code);

  INSERT INTO clinic.appointments (
    clinic_id, patient_id, doctor_id, appointment_number,
    appointment_date, appointment_time, duration_minutes,
    appointment_type, visit_reason, status, booked_by
  ) VALUES (
    p_clinic_id, p_patient_id, slot.doctor_id, new_appointment_number,
    slot.slot_date, slot.slot_time, slot.duration_minutes,
    'scheduled', p_visit_reason, 'scheduled', p_user_id
  ) RETURNING id INTO new_appointment_id;

  -- 4. Mark the slot as unavailable and link it to the new appointment.
  UPDATE clinic.appointment_slots
  SET is_available = false, appointment_id = new_appointment_id, updated_at = v_now
  WHERE id = p_slot_id;

  -- 5. Finalize the booking request as 'success'.
  UPDATE booking_requests
  SET status = 'success',
      result = jsonb_build_object('appointment_id', new_appointment_id, 'appointment_number', new_appointment_number),
      updated_at = v_now
  WHERE id = br.id;

  -- 6. Return the successful result.
  RETURN jsonb_build_object('status', 'success', 'idempotent', false, 'result', result);

EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, rollback is automatic. Mark the request as 'failed'.
    IF br.id IS NOT NULL THEN
      UPDATE booking_requests SET status = 'failed', error = SQLERRM WHERE id = br.id;
    END IF;
    RAISE; -- Re-raise the original error
END;
$$;
