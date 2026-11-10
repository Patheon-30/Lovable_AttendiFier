import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { manilaParts } from "@/lib/periods";
import { buildMonthlyWorkbook, completedTimeOut, displayTime, downloadWorkbook, type MonthlyRecord } from "@/lib/monthly-records";

export function MonthlyRecords({ section, userId }: { section: string; userId: string }) {
  const [month, setMonth] = useState(manilaParts().day.slice(0, 7));
  const [prepared, setPrepared] = useState<Blob | null>(null);
  const [exportError, setExportError] = useState(false);
  const records = useQuery({
    queryKey: ["monthly-records", userId, section],
    refetchInterval: 60_000,
    queryFn: async () => {
      const all: MonthlyRecord[] = [];
      for (let start = 0; ; start += 1000) {
        const { data, error } = await supabase.from("monthly_attendance").select("*").eq("section", section).order("day", { ascending: false }).order("id").range(start, start + 999);
        if (error) throw error;
        all.push(...data);
        if (data.length < 1000) return all;
      }
    },
  });
  useEffect(() => {
    let active = true;
    setPrepared(null);
    setExportError(false);
    if (records.data?.length) {
      buildMonthlyWorkbook(records.data, section).then((blob) => { if (active) setPrepared(blob); }).catch(() => { if (active) setExportError(true); });
    }
    return () => { active = false; };
  }, [records.data, section]);
  const rows = (records.data ?? []).filter((row) => row.day.startsWith(month));
  const months = new Set((records.data ?? []).map((row) => row.day.slice(0, 7))).size;
  return (
    <section className="mt-10 border-t border-border pt-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><CalendarDays className="h-5 w-5 text-primary" />Monthly records</h2>
        <Button disabled={!prepared || records.isError} onClick={() => {
          if (!prepared) return;
          downloadWorkbook(prepared, `Present-monthly-${section.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`);
          toast.success("Excel file downloaded");
        }}><Download className="mr-2 h-4 w-4" />Compile all months · Excel</Button>
      </div>
      <div className="my-5 flex flex-wrap items-center gap-3">
        <label htmlFor="record-month" className="text-sm">Month</label>
        <Input id="record-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-44" />
        <span className="text-sm text-muted-foreground">{rows.length} scans · {months} saved months</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Automatic time out: 7:31 AM / 12:51 PM · Not a verified departure. No scan does not confirm absence.</p>
      {records.isPending ? <p role="status">Loading monthly records…</p> : records.isError ? <p role="alert" className="text-destructive">Couldn’t load monthly records. <Button variant="ghost" onClick={() => records.refetch()}>Retry</Button></p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No recorded scans for this month.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground"><tr>{["Student", "Date", "Period", "Status", "Time in", "Auto time out"].map((label) => <th key={label} className="whitespace-nowrap px-3 py-3 font-medium">{label}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border/50">
              <td className="min-w-36 px-3 py-3 font-medium">{row.student_name}</td><td className="whitespace-nowrap px-3 py-3">{row.day}</td><td className="px-3 py-3 capitalize">{row.period}</td>
              <td className={`px-3 py-3 capitalize ${row.status === "absent" ? "text-destructive" : row.status === "late" ? "text-warning" : "text-primary"}`}>{row.status}</td>
              <td className="whitespace-nowrap px-3 py-3">{displayTime(row.time_in)}</td><td className="whitespace-nowrap px-3 py-3">{completedTimeOut(row) ? displayTime(row.scheduled_time_out) : row.scheduled_time_out ? "Pending" : "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      {exportError && <p role="alert" className="mt-3 text-sm text-destructive">Excel preparation failed. Refresh to try again.</p>}
    </section>
  );
}