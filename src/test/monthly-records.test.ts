import { describe, expect, it } from "vitest";
import { buildMonthlyWorkbook, completedTimeOut, type MonthlyRecord } from "@/lib/monthly-records";
import ExcelJS from "exceljs";

function row(period: string, scheduled: string): MonthlyRecord {
  return { id: "1", source_attendance_id: "2", student_id: "3", student_name: "Test Student", section: "Test", day: "2026-10-31", period, status: "present", time_in: "2026-10-30T22:00:00Z", scheduled_time_out: scheduled };
}

describe("automatic time-outs", () => {
  it("morning is completed at 7:31 AM Manila, not earlier", () => {
    const record = row("morning", "2026-10-30T23:31:00Z");
    expect(completedTimeOut(record, new Date("2026-10-30T23:30:00Z"))).toBeNull();
    expect(completedTimeOut(record, new Date("2026-10-30T23:31:00Z"))).toBe(record.scheduled_time_out);
  });
  it("afternoon is completed at 12:51 PM Manila, not earlier", () => {
    const record = row("afternoon", "2026-10-31T04:51:00Z");
    expect(completedTimeOut(record, new Date("2026-10-31T04:50:00Z"))).toBeNull();
    expect(completedTimeOut(record, new Date("2026-10-31T04:51:00Z"))).toBe(record.scheduled_time_out);
  });
  it("leaves historical scans without time-out evidence blank", () => {
    const record = { ...row("morning", "2026-10-30T23:31:00Z"), scheduled_time_out: null };
    expect(completedTimeOut(record, new Date("2026-11-01T00:00:00Z"))).toBeNull();
  });
});

describe("monthly Excel compilation", () => {
  it("creates one sheet per month and preserves saved status and time-outs", async () => {
    const october = row("morning", "2026-10-30T23:31:00Z");
    const november = { ...row("afternoon", "2026-11-01T04:51:00Z"), id: "4", day: "2026-11-01", status: "late", time_in: "2026-11-01T04:40:00Z" };
    const blob = await buildMonthlyWorkbook([november, october], "Test", new Date("2026-11-01T04:50:00Z"));
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error("Missing workbook bytes"));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["2026-10", "2026-11"]);
    const octoberSheet = workbook.getWorksheet("2026-10");
    const novemberSheet = workbook.getWorksheet("2026-11");
    expect(octoberSheet?.getCell("E5").value).toBe("present");
    expect(octoberSheet?.getCell("G5").value).toBe("7:31 AM");
    expect(novemberSheet?.getCell("E5").value).toBe("late");
    expect(novemberSheet?.getCell("F5").value).toBe("12:40 PM");
    expect(novemberSheet?.getCell("G5").value).toBeNull();
  });
});