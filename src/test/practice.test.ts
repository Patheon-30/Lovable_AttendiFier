import { describe, expect, it } from "vitest";
import { initialPractice, practiceScan, readPractice, PRACTICE_KEY } from "@/lib/practice";

describe("isolated practice rules", () => {
  it("permits repeated practice scans at any time, including 10:06 PM Manila", () => {
    const first = practiceScan(initialPractice, initialPractice.code, "2026-10-25T14:06:00Z");
    expect(first?.scans.length).toBe(1);
    if (!first) throw new Error("Expected practice scan");
    expect(practiceScan(first, first.code, "2026-10-25T14:06:00Z")?.scans.length).toBe(2);
  });
  it("keeps edited QR codes, settings and practice records after reloading stored data", () => {
    const state = { ...initialPractice, section: "Test class B", code: "test-qr-edited", studentName: "Practice B" };
    const scanned = practiceScan(state, "test-qr-edited", "2026-10-25T14:06:00Z");
    expect(readPractice(JSON.stringify(scanned))).toEqual({ ...state, scans: [{ name: "Practice B", period: "morning", at: "2026-10-25T14:06:00Z" }] });
    expect(PRACTICE_KEY).not.toBe("present.device_token");
  });
  it("accepts only the edited practice code", () => {
    expect(practiceScan({ ...initialPractice, code: "new-code" }, initialPractice.code, "2026-10-25T14:06:00Z")).toBeNull();
  });
});