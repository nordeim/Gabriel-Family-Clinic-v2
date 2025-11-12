/**
 * tests/server/admin-router.test.ts
 *
 * Vitest-based unit tests for admin.router:
 * - listPublicBookingRequests
 * - updatePublicBookingRequestStatus
 * - linkPublicBookingRequestToAppointment
 * - getUsers
 * - getDashboardMetrics
 *
 * These tests:
 * - Use createCallerFactory(adminRouter).
 * - Mock admin/non-admin context to assert adminProcedure enforcement.
 * - Mock Supabase admin client used by admin router to verify queries.
 *
 * NOTE:
 * - Assumes adminRouter uses "@/lib/supabase/admin" / createSupabaseAdminClient under the hood.
 * - If adminRouter implementation changes, adjust the Supabase mocks accordingly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";

import { adminRouter } from "../../lib/trpc/routers/admin.router";
import { createCallerFactory } from "../../src/server/api/trpc";

// Supabase mock wiring
const supabaseMock = {
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
  limitMock: vi.fn(),
};

vi.mock("../../lib/supabase/admin", () => {
  const from = (table: string) => {
    supabaseMock.fromMock(table);
    return {
      select: (columns: string) => {
        supabaseMock.selectMock(columns);
        return {
          eq: (col: string, val: unknown) => {
            supabaseMock.eqMock(col, val);
            return {
              limit: (n: number) => {
                supabaseMock.limitMock(n);
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
          limit: (n: number) => {
            supabaseMock.limitMock(n);
            return Promise.resolve({ data: [], error: null });
          },
        };
      },
      update: (values: Record<string, unknown>) => {
        supabaseMock.updateMock(values);
        return {
          eq: (col: string, val: unknown) => {
            supabaseMock.eqMock(col, val);
            return Promise.resolve({ data: [], error: null });
          },
        };
      },
    };
  };

  return {
    createSupabaseAdminClient: () => ({
      from,
    }),
  };
});

// Create a caller factory for adminRouter
const createCaller = createCallerFactory(adminRouter);

// Helper to build contexts
function createAdminCtx() {
  return {
    headers: new Headers(),
    // Satisfy adminProcedure: user with admin/superadmin role
    session: {
      user: {
        id: "admin-1",
        role: "admin",
      },
    },
  } as any;
}

function createNonAdminCtx() {
  return {
    headers: new Headers(),
    session: {
      user: {
        id: "user-1",
        role: "patient",
      },
    },
  } as any;
}

describe("admin.router", () => {
  beforeEach(() => {
    Object.values(supabaseMock).forEach((fn) => fn.mockReset());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("access control via adminProcedure", () => {
    it("rejects non-admin users", async () => {
      const caller = createCaller(createNonAdminCtx());

      // Any admin-only procedure should fail; use one as a representative
      await expect(
        caller.listPublicBookingRequests({ limit: 10 }),
      ).rejects.toBeInstanceOf(TRPCError);
    });

    it("allows admin users", async () => {
      const caller = createCaller(createAdminCtx());

      // Should not throw; underlying Supabase is mocked to return empty data
      await expect(
        caller.listPublicBookingRequests({ limit: 10 }),
      ).resolves.toBeDefined();
    });
  });

  describe("listPublicBookingRequests", () => {
    it("applies limit and optional status filter", async () => {
      const caller = createCaller(createAdminCtx());

      await caller.listPublicBookingRequests({
        limit: 25,
        status: "new",
      });

      // We assert that:
      // - from() was called with booking.public_booking_requests
      // - select() was used (columns opaque to test)
      // - eq() / limit() were invoked according to filter parameters.
      expect(supabaseMock.fromMock).toHaveBeenCalledWith(
        "booking.public_booking_requests",
      );
      expect(supabaseMock.selectMock).toHaveBeenCalled();
      expect(supabaseMock.limitMock).toHaveBeenCalledWith(25);
    });
  });

  describe("updatePublicBookingRequestStatus", () => {
    it("updates the status of a booking request", async () => {
      const caller = createCaller(createAdminCtx());

      await caller.updatePublicBookingRequestStatus({
        id: "lead-123",
        status: "contacted",
      });

      expect(supabaseMock.fromMock).toHaveBeenCalled();
      expect(supabaseMock.updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: "contacted" }),
      );
      expect(supabaseMock.eqMock).toHaveBeenCalledWith("id", "lead-123");
    });
  });

  describe("linkPublicBookingRequestToAppointment", () => {
    it("links a lead to an appointment and marks as confirmed", async () => {
      const caller = createCaller(createAdminCtx());

      await caller.linkPublicBookingRequestToAppointment({
        id: "lead-456",
        appointmentId: "appt-999",
      });

      expect(supabaseMock.fromMock).toHaveBeenCalled();
      expect(supabaseMock.updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          appointment_id: "appt-999",
          status: "confirmed",
        }),
      );
      expect(supabaseMock.eqMock).toHaveBeenCalledWith("id", "lead-456");
    });
  });

  describe("getUsers stub", () => {
    it("returns an array (currently stubbed empty)", async () => {
      const caller = createCaller(createAdminCtx());

      const users = await caller.getUsers();

      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe("getDashboardMetrics stub", () => {
    it("returns zeroed metrics object", async () => {
      const caller = createCaller(createAdminCtx());

      const metrics = await caller.getDashboardMetrics();

      expect(metrics).toEqual({
        totalPatients: 0,
        totalAppointmentsToday: 0,
        pendingLeads: 0,
        completedAppointmentsThisWeek: 0,
      });
    });
  });
});