import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  student: vi.fn(),
  from: vi.fn(),
  sendSms: vi.fn(),
  minutes: 480,
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ inputValidator: () => ({ handler: (fn: unknown) => fn }) }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock("@/lib/sms.server", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/sms.server")>(),
  sendSms: mocks.sendSms,
}));
vi.mock("@/lib/periods", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/periods")>(),
  manilaParts: () => ({ day: "2026-10-25", minutes: mocks.minutes }),
}));

import { recordScan } from "@/lib/student.functions";
import { GATE_CODE } from "@/lib/periods";
import { parentAttendanceMessage } from "@/lib/sms.server";

describe("live attendance restrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.minutes = 480;
    mocks.student.mockResolvedValue({ data: { id: "student-1", name: "Test", section: "11-Psalms" } });
    mocks.from.mockImplementation((table: string) => table === "attendance"
      ? { insert: mocks.insert }
      : { select: () => ({ eq: () => ({ maybeSingle: mocks.student }) }) });
  });

  it("allows only one check-in per period and never resends a parent text for a duplicate", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "23505" } });
    const result = await recordScan({ data: { token: "test-device-token-123456789", code: GATE_CODE } });
    expect(result).toEqual({ result: "cooldown", period: "morning" });
    expect(mocks.insert).toHaveBeenCalledWith({ student_id: "student-1", day: "2026-10-25", period: "morning", late: false, status: "absent" });
    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(mocks.student).toHaveBeenCalledTimes(1);
  });

  it("does not save or send texts before 4:00 AM Manila", async () => {
    mocks.minutes = 239;
    expect(await recordScan({ data: { token: "test-device-token-123456789", code: GATE_CODE } })).toEqual({ result: "closed" });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.sendSms).not.toHaveBeenCalled();
  });

  it("uses the new parent arrival message with the student's details", () => {
    expect(parentAttendanceMessage({
      studentName: "Juan Dela Cruz",
      section: "Grade 11 - Psalms",
      period: "morning",
      time: "7:00 AM",
      status: "present",
    })).toBe(
      "Good morning! I would like to inform you that your child Juan Dela Cruz from Grade 11 - Psalms has safely arrived at school today at 7:00 AM. He/She is now in the classroom and marked present. Thank you for ensuring his/her timely arrival.",
    );
  });
});
