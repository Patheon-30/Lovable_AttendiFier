import { describe, it, expect } from "vitest";
import { detectCarrier, normalizePhone, formatPhone } from "@/lib/phone";
import { periodAt, parseCode, GATE_CODE, manilaParts, missedPeriod } from "@/lib/periods";

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
  it("4:00–7:00 AM is present", () => { for (const minute of [240, 420]) expect(periodAt(minute)).toEqual({ period: "morning", late: false, status: "present" }); });
  it("7:01–9:00 AM is late for morning", () => { for (const minute of [421, 480, 540]) expect(periodAt(minute)).toEqual({ period: "morning", late: true, status: "late" }); });
  it("9:01–11:29 AM is absent for morning", () => { for (const minute of [541, 600, 689]) expect(periodAt(minute)).toEqual({ period: "morning", late: false, status: "absent" }); });
  it("11:30 AM–12:35 PM is present for afternoon", () => { for (const minute of [690, 755]) expect(periodAt(minute)).toEqual({ period: "afternoon", late: false, status: "present" }); });
  it("12:36–2:35 PM is late for afternoon", () => { for (const minute of [756, 800, 875]) expect(periodAt(minute)).toEqual({ period: "afternoon", late: true, status: "late" }); });
  it("2:36 PM onward is absent for afternoon", () => { for (const minute of [876, 1000, 1439]) expect(periodAt(minute)).toEqual({ period: "afternoon", late: false, status: "absent" }); });
  it("no scan counts as absent only after 9:00 AM / 2:35 PM", () => {
    expect(missedPeriod("morning", 540)).toBe(false);
    expect(missedPeriod("morning", 541)).toBe(true);
    expect(missedPeriod("afternoon", 875)).toBe(false);
    expect(missedPeriod("afternoon", 876)).toBe(true);
  });
  it("parses gate code", () => expect(parseCode(GATE_CODE)).toEqual({ kind: "gate" }));
  it("Manila is UTC+8", () => expect(manilaParts(new Date("2026-10-12T05:26:00Z")).minutes).toBe(13 * 60 + 26));
});
