import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { addFingerprint, fingerprintAvailable, forgetFingerprint, fingerprintError } from "@/lib/biometric";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { detectCarrier, formatPhone, normalizePhone } from "@/lib/phone";
import { createDeviceToken, getDeviceToken } from "@/lib/device";
import { registerStudent } from "@/lib/student.functions";
import { PracticeEntry } from "@/components/PracticeEntry";
import { PRACTICE_ENTRY } from "@/lib/practice";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — Present" },
      { name: "description", content: "Set up this phone once: student name, section and parent's number." },
      { property: "og:title", content: "Student registration — Present" },
      { property: "og:description", content: "One-time device setup, no password needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", section: "", parentName: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [canFinger, setCanFinger] = useState(false);
  const [useFinger, setUseFinger] = useState(false);
  useEffect(() => { fingerprintAvailable().then(setCanFinger); }, []);
  const carrier = detectCarrier(f.phone);
  const normalized = normalizePhone(f.phone);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim() === PRACTICE_ENTRY) { setPracticeOpen(true); return; }
    if (f.name.trim().length < 2 || !f.section.trim() || f.parentName.trim().length < 2) { toast.error("Please fill in every field"); return; }
    if (!normalized) { toast.error("Enter a complete PH mobile number, e.g. 0917 123 4567"); return; }
    setBusy(true);
    try {
      const token = getDeviceToken() ?? createDeviceToken();
      await registerStudent({ data: { token, name: f.name, section: f.section, parentName: f.parentName, parentPhone: normalized } });
      if (useFinger) {
        try { await addFingerprint(token, f.name.trim()); toast.success("Fingerprint added"); }
        catch (e) { toast.error(fingerprintError(e)); }
      } else forgetFingerprint();
      toast.success("You're all set");
      navigate({ to: "/scan" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader step={2} />
      <main className="mx-auto max-w-lg px-5 pb-16 pt-10">
        <h1 className="text-3xl font-bold">Set up this phone</h1>
        <p className="mt-2 text-sm text-muted-foreground">One time only — no password needed.</p>
        <form onSubmit={submit} className="glass mt-8 space-y-5 rounded-3xl p-6">
          <Field label="Student name"><Input maxLength={100} placeholder="Juan Dela Cruz" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Section" hint="Your teacher sees you once this matches their section">
            <Input maxLength={50} placeholder="11-Psalms" value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} />
          </Field>
          <Field label="Parent / Guardian name"><Input maxLength={100} placeholder="Maria Dela Cruz" value={f.parentName} onChange={(e) => setF({ ...f, parentName: e.target.value })} /></Field>
          <Field label="Parent phone" hint={normalized ? `Texts go to ${normalized}` : "Philippine mobile number"}>
            <div className="relative">
              <Input inputMode="tel" placeholder="0917 123 4567" value={f.phone} onChange={(e) => setF({ ...f, phone: formatPhone(e.target.value) })} className="pr-32" />
              {carrier && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">{carrier}</span>
              )}
            </div>
          </Field>
          {canFinger && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm">
              <input type="checkbox" checked={useFinger} onChange={(e) => setUseFinger(e.target.checked)} className="h-4 w-4 accent-primary" />
              <Fingerprint className="h-5 w-5 text-primary" />
              <span>Add fingerprint <span className="block text-xs text-muted-foreground">Log back in on this phone with your fingerprint</span></span>
            </label>
          )}
          <Button type="submit" disabled={busy} className="glow h-12 w-full rounded-xl text-base font-semibold">
            {busy ? "Saving…" : "Save & start scanning"}
          </Button>
        </form>
        <Button variant="ghost" className="mt-4" onClick={() => setPracticeOpen(true)}>Practice entry</Button>
      </main>
      <PracticeEntry open={practiceOpen} onOpenChange={setPracticeOpen} />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
