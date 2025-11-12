/**
 * tests/server/appointment-router.test.ts
 *
 * Vitest-based unit tests for appointment.router:
 * - requestBookingPublic
 * - getAvailableSlots
 * - requestBooking
 *
 * These tests:
 * - Use createCallerFactory on appointmentRouter.
 * - Mock AppointmentService to assert delegation and error mapping.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";

import { appointmentRouter } from "../../src/lib/trpc/routers/appointment.router";
import { createTRPCRouter, createCallerFactory } from "../../src/server/api/trpc";
import { AppointmentService } from "../../src/services/appointment-service";

// Create a caller factory for isolated router testing
const t = createTRPCRouter;
const createCaller = createCallerFactory(appointmentRouter);

// Mock AppointmentService methods
vi.mock("../../src/services/appointment-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/services/appointment-service")>();
  return {
    ...actual,
    AppointmentService: {
      ...actual.AppointmentService,
      createPublicBookingRequest: vi.fn(),
      getAvailableSlots: vi.fn(),
      requestBookingForAuthenticatedUser: vi.fn(),
    },
  };
});

const mocked = () => {
  const mod = require("../../src/services/appointment-service") as typeof import("../../src/services/appointment-service");
  return mod.AppointmentService as unknown as {
    createPublicBookingRequest: ReturnType<typeof vi.fn>;
    getAvailableSlots: ReturnType<typeof vi.fn>;
    requestBookingForAuthenticatedUser: ReturnType<typeof vi.fn>;
  };
};

describe("appointment.router", () => {
  beforeEach(() => {
    const m = mocked();
    m.createPublicBookingRequest.mockReset();
    m.getAvailableSlots.mockReset();
    m.requestBookingForAuthenticatedUser.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("requestBookingPublic", () => {
    it("delegates to AppointmentService.createPublicBookingRequest on valid input", async () => {
      const m = mocked();
      m.createPublicBookingRequest.mockResolvedValueOnce({
        status: "pending",
        message: "ok",
      });

      const caller = createCaller({
        headers: new Headers(),
      } as any);

      const input = {
        name: "John Doe",
        phone: "+6599999999",
        reason: "General checkup",
        preferredTime: "Tomorrow AM",
        contactPreference: "whatsapp" as const,
      };

      const result = await caller.requestBookingPublic(input);

      expect(m.createPublicBookingRequest).toHaveBeenCalledTimes(1);
      expect(m.createPublicBookingRequest).toHaveBeenCalledWith(input);
      expect(result.status).toBe("pending");
    });

    it("throws TRPCError on invalid input", async () => {
      const caller = createCaller({
        headers: new Headers(),
      } as any);

      await expect(
        // invalid payload: missing required fields like reason/preferredTime/contactPreference
        caller.requestBookingPublic({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name: "" as any,
          phone: "" as any,
          // force shape to compile but be semantically invalid for Zod
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          reason: "" as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          preferredTime: "" as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contactPreference: "whatsapp" as any,
        }),
      ).rejects.toBeInstanceOf(TRPCError);
    });
  });

  describe("getAvailableSlots", () => {
    it("delegates to AppointmentService.getAvailableSlots", async () => {
      const m = mocked();
      m.getAvailableSlots.mockResolvedValueOnce([{ id: "slot-1" }]);

      const caller = createCaller({
        headers: new Headers(),
      } as any);

      const input = {
        clinicId: "11111111-1111-1111-1111-111111111111",
      };

      const result = await caller.getAvailableSlots(input);

      expect(m.getAvailableSlots).toHaveBeenCalledTimes(1);
      expect(m.getAvailableSlots).toHaveBeenCalledWith(input);
      expect(result).toEqual([{ id: "slot-1" }]);
    });
  });

  describe("requestBooking", () => {
    const baseInput = {
      clinicId: "11111111-1111-1111-1111-111111111111",
      slotId: "22222222-2222-2222-2222-222222222222",
      visitReason: "Follow-up",
      idempotencyKey: "idem-123",
    };

    it("rejects when session user is missing", async () => {
      const caller = createCaller({
        headers: new Headers(),
        session: null,
      } as any);

      await expect(
        caller.requestBooking(baseInput),
      ).rejects.toBeInstanceOf(TRPCError);
    });

    it("delegates to AppointmentService.requestBookingForAuthenticatedUser with session user", async () => {
      const m = mocked();
      m.requestBookingForAuthenticatedUser.mockResolvedValueOnce({
        status: "success",
        message: "ok",
        appointmentId: "appt-1",
      });

      const caller = createCaller({
        headers: new Headers(),
        session: {
          user: { id: "user-123" },
        },
      } as any);

      const result = await caller.requestBooking(baseInput);

      expect(m.requestBookingForAuthenticatedUser).toHaveBeenCalledTimes(1);
      expect(m.requestBookingForAuthenticatedUser).toHaveBeenCalledWith({
        userId: "user-123",
        ...baseInput,
      });
      expect(result.status).toBe("success");
      expect(result.appointmentId).toBe("appt-1");
    });
  });
});