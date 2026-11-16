import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Printer, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { MonthlyRecords } from "@/components/MonthlyRecords";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { classCode, manilaParts, missedPeriod } from "@/lib/periods";
import { TEACHER_NAME_MAX, mergeDuplicateStudents, teacherDisplayName } from "@/lib/classroom";
import { QrSheet } from "./gate";

export const Route = createFileRoute("/teacher")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { userId: data.user.id, email: data.user.email, displayName: teacherDisplayName(data.user.user_metadata) ?? "" };
  },
  head: () => ({
    meta: [
      { title: "Class attendance — Present" },
      { name: "description", content: "Live morning and afternoon attendance for your section." },
      { property: "og:title", content: "Class attendance — Present" },
      { property: "og:description", content: "Teacher dashboard with live roster." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Teacher,
});

function Teacher() {
  const { userId, email, displayName } = Route.useRouteContext();
  const [nameInput, setNameInput] = useState(displayName);
  const [savedName, setSavedName] = useState(displayName);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sectionInput, setSectionInput] = useState("");
  const [showQr, setShowQr] = useState(false);

  const settings = useQuery({
    queryKey: ["settings", userId],
    queryFn: async () => (await supabase.from("teacher_settings").select("section").eq("user_id", userId).maybeSingle()).data,
  });
  const section = settings.data?.section ?? "";
  useEffect(() => setSectionInput(section), [section]);

  const day = manilaParts().day;
  const roster = useQuery({
    queryKey: ["roster", section, day],
    enabled: !!section,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data: students } = await supabase.from("students").select("id,name,section,created_at,parent_name,parent_phone,carrier").order("name");
      const { data: att } = await supabase.from("attendance").select("student_id,period,late,scanned_at,status").eq("day", day);
      return mergeDuplicateStudents((students ?? []).map((s) => ({
        ...s,
        morning: att?.find((a) => a.student_id === s.id && a.period === "morning"),
        afternoon: att?.find((a) => a.student_id === s.id && a.period === "afternoon"),
      })));
    },
  });

  async function saveName() {
    const v = nameInput.trim();
    if (v.length < 2 || v.length > TEACHER_NAME_MAX) { toast.error("Enter your name, e.g. Ms. Reyes"); return; }
    const { error } = await supabase.auth.updateUser({ data: { display_name: v } });
    if (error) { toast.error("Couldn't save your name"); return; }
    setSavedName(v);
    toast.success("Name saved — students see it after they scan");
  }

  async function saveSection() {
    const v = sectionInput.trim();
    if (!v || v.length > 50) { toast.error("Enter your section, e.g. 11-Psalms"); return; }
    const { error } = await supabase.from("teacher_settings").upsert({ user_id: userId, section: v, updated_at: new Date().toISOString() });
    if (error) { toast.error("Couldn't save section"); return; }
    toast.success("Section saved");
    qc.invalidateQueries({ queryKey: ["settings", userId] });
  }

  async function remove(ids: string[], name: string) {
    if (!confirm(`Remove ${name} from your roster? Their phone will need to register again.`)) return;
    const { error } = await supabase.from("students").delete().in("id", ids);
    if (error) { toast.error("Couldn't remove student"); return; }
    qc.invalidateQueries({ queryKey: ["roster"] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const rows = roster.data ?? [];
  const nowMinutes = manilaParts().minutes;
  const missedAM = missedPeriod("morning", nowMinutes);
  const missedPM = missedPeriod("afternoon", nowMinutes);
  const absentAM = rows.filter((r) => r.morning ? r.morning.status === "absent" : missedAM).length;
  const absentPM = rows.filter((r) => r.afternoon ? r.afternoon.status === "absent" : missedPM).length;
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 pb-16 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{savedName || email}</p>
            <h1 className="text-3xl font-bold">{section || "Set your section"}</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-1 h-4 w-4" />Sign out</Button>
        </div>

        <div className="glass mt-6 rounded-3xl p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input value={nameInput} maxLength={TEACHER_NAME_MAX} onChange={(e) => setNameInput(e.target.value)} placeholder="Your name, e.g. Ms. Reyes" aria-label="Your name" />
            <Button onClick={saveName} variant="secondary" className="rounded-xl">Save name</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Students in your section see this name after they scan.</p>
        </div>

        <div className="glass mt-3 flex flex-col gap-3 rounded-3xl p-5 sm:flex-row">
          <Input value={sectionInput} maxLength={50} onChange={(e) => setSectionInput(e.target.value)} placeholder="11-Psalms" />
          <Button onClick={saveSection} className="rounded-xl">Save section</Button>
          <Button variant="secondary" disabled={!section} onClick={() => setShowQr(true)} className="rounded-xl"><Printer className="mr-1 h-4 w-4" />Class QR</Button>
        </div>

        {section && (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat label="Students" value={rows.length} />
              <Stat label="Absent AM" value={absentAM} warn={absentAM > 0} />
              <Stat label="Absent PM" value={absentPM} warn={absentPM > 0} />
            </div>
            <div className="mt-6 space-y-2">
              {roster.isLoading && <p className="text-sm text-muted-foreground">Loading roster…</p>}
              {!roster.isLoading && rows.length === 0 && (
                <p className="glass rounded-2xl p-5 text-sm text-muted-foreground">No students yet. Students appear once they register with section “{section}”.</p>
              )}
              {rows.map((r) => (
                <div key={r.id} className="glass flex items-center gap-3 rounded-2xl p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.parent_name} · {r.parent_phone}{r.carrier ? ` · ${r.carrier}` : ""}</p>
                  </div>
                  <Badge label="AM" row={r.morning} missed={missedAM} fmt={fmt} />
                  <Badge label="PM" row={r.afternoon} missed={missedPM} fmt={fmt} />
                  <Button variant="ghost" size="icon" aria-label={`Remove ${r.name}`} onClick={() => remove(r.ids, r.name)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <MonthlyRecords section={section} userId={userId} />
          </>
        )}
      </main>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">Class QR</DialogTitle>
          <QrSheet value={classCode(section)} title={section} subtitle="Classroom check-in · Present" />
          <Button onClick={() => window.print()} className="no-print"><Printer className="mr-2 h-4 w-4" />Print</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-display text-3xl font-bold ${warn ? "text-warning" : ""}`}>{value}</p>
    </div>
  );
}

function Badge({ label, row, missed, fmt }: { label: string; row: { late: boolean; scanned_at: string; status: string } | undefined; missed: boolean; fmt: (s: string) => string }) {
  const late = row && (row.status === "late" || row.late);
  const cls = !row ? (missed ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground") : row.status === "absent" ? "bg-destructive/15 text-destructive" : late ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary";
  return (
    <span title={row ? fmt(row.scanned_at) : missed ? "No scan · Absent" : "Not scanned yet"} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {label} {row ? (row.status === "absent" ? "Absent" : late ? "Late" : "✓") : missed ? "Absent" : "—"}
    </span>
  );
}
