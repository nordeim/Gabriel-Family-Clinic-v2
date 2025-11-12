/**
 * AppointmentService unit tests (Vitest)
 *
 * These tests validate:
 * - createPublicBookingRequest: persistence + error handling
 * - requestBookingForAuthenticatedUser: RPC wiring + error mapping
 *
 * This suite uses Vitest, which is now installed in the repo.
 * It relies on module mocking for "@/lib/supabase/admin".
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ZodError } from "zod";

import {
  AppointmentService,
  BookingError,
  SlotNotFoundError,
  SlotUnavailableError,
  BookingInProgressError,
} from "../../src/services/appointment-service";

// Local type for strongly-typed mocks
type SupabaseMock = {
  fromMock: ReturnType<typeof vi.fn>;
  insertMock: ReturnType<typeof vi.fn>;
  selectMock: ReturnType<typeof vi.fn>;
  eqMock: ReturnType<typeof vi.fn>;
  limitMock: ReturnType<typeof vi.fn>;
  maybeSingleMock: ReturnType<typeof vi.fn>;
  rpcMock: ReturnType<typeof vi.fn>;
};

const supabaseMock: SupabaseMock = {
  fromMock: vi.fn(),
  insertMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  limitMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  rpcMock: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => {
  const from = (table: string) => ({
    insert: supabaseMock.insertMock,
    select: supabaseMock.selectMock.mockReturnThis(),
    eq: supabaseMock.eqMock.mockReturnThis(),
    limit: supabaseMock.limitMock.mockReturnThis(),
    maybeSingle: supabaseMock.maybeSingleMock,
  });

  return {
    createSupabaseAdminClient: () => ({
      from,
      rpc: supabaseMock.rpcMock,
    }),
  };
});

describe("createPublicBookingRequest", () => {
  const validInput = {
    name: "John Doe",
    phone: "+6599999999",
    reason: "General checkup",
    preferredTime: "Any weekday morning",
    contactPreference: "whatsapp" as const,
    idempotencyKey: "test-key-123",
  };

  beforeEach(() => {
    Object.values(supabaseMock).forEach((fn) => fn.mockReset());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("persists a public booking lead and returns pending status", async () => {
    supabaseMock.insertMock.mockResolvedValueOnce({ error: null });

    const result = await AppointmentService.createPublicBookingRequest(
      validInput,
    );

    expect(supabaseMock.insertMock).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("pending");
    expect(result.message.toLowerCase()).toContain("received your request");
  });

  it("returns failed status when insert encounters an error", async () => {
    supabaseMock.insertMock.mockResolvedValueOnce({
      error: { message: "db down" },
    });

    const result = await AppointmentService.createPublicBookingRequest(
      validInput,
    );

    expect(result.status).toBe("failed");
    expect(result.message.toLowerCase()).toContain("please try again");
  });

  it("throws ZodError for invalid input", async () => {
    const invalid = { ...validInput, phone: "" };

    await expect(
      // invalid shape should be rejected by Zod validation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      AppointmentService.createPublicBookingRequest(invalid as any),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe("requestBookingForAuthenticatedUser", () => {
  const baseInput = {
    userId: "user-123",
    clinicId: "clinic-123",
    slotId: "slot-123",
    visitReason: "Headache and dizziness",
    idempotencyKey: "idem-123",
  };

  beforeEach(() => {
    Object.values(supabaseMock).forEach((fn) => fn.mockReset());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls booking.create_booking and returns success on happy path", async () => {
    supabaseMock.rpcMock.mockResolvedValueOnce({
      data: {
        status: "success",
        idempotent: false,
        result: {
          appointment_id: "appt-1",
          appointment_number: "A001",
        },
      },
      error: null,
    });

    const result = await AppointmentService.requestBookingForAuthenticatedUser({
      ...baseInput,
      patientId: "patient-1",
    });

    expect(supabaseMock.rpcMock).toHaveBeenCalledWith("booking.create_booking", {
      p_idempotency_key: baseInput.idempotencyKey,
      p_user_id: baseInput.userId,
      p_clinic_id: baseInput.clinicId,
      p_slot_id: baseInput.slotId,
      p_patient_id: "patient-1",
      p_visit_reason: baseInput.visitReason,
    });
    expect(result.status).toBe("success");
    expect(result.appointmentId).toBe("appt-1");
    expect(result.appointmentNumber).toBe("A001");
  });

  it("maps slot_not_found code to SlotNotFoundError", async () => {
    supabaseMock.rpcMock.mockResolvedValueOnce({
      data: { status: "error", code: "slot_not_found" },
      error: null,
    });

    await expect(
      AppointmentService.requestBookingForAuthenticatedUser({
        ...baseInput,
        patientId: "patient-1",
      }),
    ).rejects.toBeInstanceOf(SlotNotFoundError);
  });

  it("maps slot_unavailable code to SlotUnavailableError", async () => {
    supabaseMock.rpcMock.mockResolvedValueOnce({
      data: { status: "conflict", code: "slot_unavailable" },
      error: null,
    });

    await expect(
      AppointmentService.requestBookingForAuthenticatedUser({
        ...baseInput,
        patientId: "patient-1",
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it("maps in_progress code to BookingInProgressError", async () => {
    supabaseMock.rpcMock.mockResolvedValueOnce({
      data: { status: "conflict", code: "in_progress" },
      error: null,
    });

    await expect(
      AppointmentService.requestBookingForAuthenticatedUser({
        ...baseInput,
        patientId: "patient-1",
      }),
    ).rejects.toBeInstanceOf(BookingInProgressError);
  });

  it("maps unknown error shapes to BookingError", async () => {
    supabaseMock.rpcMock.mockResolvedValueOnce({
      data: { status: "error", code: "weird" },
      error: null,
    });

    await expect(
      AppointmentService.requestBookingForAuthenticatedUser({
        ...baseInput,
        patientId: "patient-1",
      }),
    ).rejects.toBeInstanceOf(BookingError);
  });

  it("throws BookingError when RPC returns error", async () => {
    supabaseMock.rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc failure" },
    });

    await expect(
      AppointmentService.requestBookingForAuthenticatedUser({
        ...baseInput,
        patientId: "patient-1",
      }),
    ).rejects.toBeInstanceOf(BookingError);
  });
});