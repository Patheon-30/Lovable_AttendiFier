import { describe, it, expect } from "vitest";
import { detectCarrier, normalizePhone, formatPhone } from "@/lib/phone";
import { periodAt, parseCode, GATE_CODE, manilaParts } from "@/lib/periods";

describe("phone", () => {
  it("detects Globe 917", () => expect(detectCarrier("09171234567")).toBe("Globe/TM"));
  it("detects Smart 918", () => expect(detectCarrier("+63 918 000 0000")).toBe("Smart/TNT/Sun"));
  it("detects DITO 991", () => expect(detectCarrier("0991")).toBe("DITO"));
  it("detects GOMO 976", () => expect(detectCarrier("0976")).toBe("GOMO"));
  it("normalizes to +63", () => expect(normalizePhone("0917 123 4567")).toBe("+639171234567"));
  it("rejects incomplete", () => expect(normalizePhone("0917123")).toBeNull());
  it("formats", () => expect(formatPhone("639171234567")).toBe("0917 123 4567"));
});

describe("periods", () => {
  it("3:59 AM closed", () => expect(periodAt(239)).toBeNull());
  it("4:00–7:15 AM is present", () => { for (const minute of [240, 435]) expect(periodAt(minute)).toEqual({ period: "morning", late: false, status: "present" }); });
  it("7:16–7:30 AM is late", () => { for (const minute of [436, 450]) expect(periodAt(minute)?.status).toBe("late"); });
  it("7:31–11:35 AM is absent", () => { for (const minute of [451, 695]) expect(periodAt(minute)).toEqual({ period: "morning", late: false, status: "absent" }); });
  it("11:36 AM–12:35 PM is present", () => { for (const minute of [696, 755]) expect(periodAt(minute)).toEqual({ period: "afternoon", late: false, status: "present" }); });
  it("after 12:35–12:50 PM is late", () => { for (const minute of [756, 770]) expect(periodAt(minute)?.status).toBe("late"); });
  it("12:51 onward is absent", () => { for (const minute of [771, 1439]) expect(periodAt(minute)).toEqual({ period: "afternoon", late: false, status: "absent" }); });
  it("parses gate code", () => expect(parseCode(GATE_CODE)).toEqual({ kind: "gate" }));
  it("Manila is UTC+8", () => expect(manilaParts(new Date("2026-10-12T05:26:00Z")).minutes).toBe(13 * 60 + 26));
});
