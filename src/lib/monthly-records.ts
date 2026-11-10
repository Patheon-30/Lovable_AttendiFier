import type { Tables } from "@/integrations/supabase/types";

export type MonthlyRecord = Tables<"monthly_attendance">;

export function displayTime(timestamp: string | null) {
  return timestamp ? new Date(timestamp).toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit",
  }) : "—";
}

export function completedTimeOut(row: MonthlyRecord, now = new Date()) {
  return row.scheduled_time_out && new Date(row.scheduled_time_out) <= now ? row.scheduled_time_out : null;
}

export async function buildMonthlyWorkbook(records: MonthlyRecord[], section: string, now = new Date()) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Present";
  const months = [...new Set(records.map((row) => row.day.slice(0, 7)))].sort();
  for (const month of months) {
    const sheet = workbook.addWorksheet(month);
    sheet.addRow(["Present — Monthly attendance", section, month]);
    sheet.addRow(["Manila time · Automatic time-outs are scheduled cutoffs, not verified departures."]);
    sheet.addRow(["Historical records without a scheduled time-out remain blank. No scan is not proof of absence."]);
    sheet.addRow(["Student", "Section", "Date", "Period", "Status", "Time in", "Automatic time out"]);
    const monthly = records.filter((row) => row.day.startsWith(month)).sort((a, b) => a.day.localeCompare(b.day) || a.student_name.localeCompare(b.student_name) || b.period.localeCompare(a.period));
    for (const row of monthly) {
      sheet.addRow([row.student_name, row.section, row.day, row.period, row.status,
        displayTime(row.time_in), completedTimeOut(row, now) ? displayTime(row.scheduled_time_out) : null]);
    }
    const end = sheet.rowCount;
    sheet.addRow([]);
    for (const status of ["present", "late", "absent"]) {
      sheet.addRow([`${status[0]?.toUpperCase()}${status.slice(1)} scans`, {
        formula: `COUNTIF(E5:E${end},"${status}")`,
        result: monthly.filter((row) => row.status === status).length,
      }]);
    }
    sheet.columns.forEach((column, index) => { column.width = [30, 22, 16, 16, 16, 18, 24][index] ?? 20; });
    sheet.eachRow((row) => { row.font = { name: "Arial", size: 11 }; row.alignment = { vertical: "middle" }; row.height = 22; });
    sheet.getRow(1).font = { name: "Arial", size: 15, bold: true };
    sheet.getRow(4).font = { name: "Arial", size: 11, bold: true };
    sheet.views = [{ state: "frozen", ySplit: 4 }];
    sheet.autoFilter = { from: "A4", to: `G${end}` };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadWorkbook(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}