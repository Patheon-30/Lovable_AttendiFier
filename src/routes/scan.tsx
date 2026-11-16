import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Fingerprint, LogOut, Sun, Sunrise, Timer, Users } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { clearDeviceToken, getDeviceToken } from "@/lib/device";
import { addFingerprint, fingerprintError, fingerprintRequired, getSavedFingerprint, recentlyUnlocked, verifyFingerprint } from "@/lib/biometric";
import { cameraGate, type CameraGate } from "@/lib/camera-gate";
import { getStudentStatus, recordScan } from "@/lib/student.functions";

export const Route = createFileRoute("/scan")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Scan to check in — Present" },
      { name: "description", content: "Point your camera at the school QR to record attendance." },
      { property: "og:title", content: "Scan to check in — Present" },
      { property: "og:description", content: "Fast QR check-in for morning and afternoon periods." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Scan,
});

type Status = Awaited<ReturnType<typeof getStudentStatus>>;
type Msg = { tone: "ok" | "warn" | "err"; text: string } | null;

function Scan() {
  const navigate = useNavigate();
  const token = getDeviceToken();
  const [status, setStatus] = useState<Status | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [scanning, setScanning] = useState(false);
  const [gate, setGate] = useState<CameraGate | null>(null);
  const [fingerBusy, setFingerBusy] = useState(false);
  const busy = useRef(false);
  const scanner = useRef<{ stop: () => Promise<void>; isScanning: boolean } | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    const s = await getStudentStatus({ data: { token } }).catch(() => null);
    if (!s) return toast.error("Couldn't load your status — check your connection.");
    if (!s.student) return navigate({ to: "/register", replace: true });
    setStatus(s);
  }, [token, navigate]);

  useEffect(() => {
    if (!token) navigate({ to: "/register", replace: true });
    else refresh();
    // New students add a fingerprint before scanning; after that it unlocks the camera.
    fingerprintRequired().then((supported) =>
      setGate(cameraGate({ supported, token, saved: getSavedFingerprint(), recentlyUnlocked: recentlyUnlocked() })),
    );
  }, [token, navigate, refresh]);

  async function setupFingerprint() {
    if (!token || !status?.student) return;
    setFingerBusy(true);
    try {
      await addFingerprint(token, status.student.name);
      toast.success("Fingerprint added — it unlocks the camera from now on");
      setGate("open");
    } catch (e) {
      if (e instanceof Error && e.name === "NotSupportedError") {
        toast.error("This phone can't save a fingerprint — you can scan without it");
        setGate("open");
      } else toast.error(fingerprintError(e));
    } finally {
      setFingerBusy(false);
    }
  }

  async function unlockCamera() {
    setFingerBusy(true);
    try {
      await verifyFingerprint();
      setGate("open");
      await start();
    } catch (e) {
      toast.error(fingerprintError(e));
    } finally {
      setFingerBusy(false);
    }
  }

  const stop = useCallback(async () => {
    if (scanner.current?.isScanning) await scanner.current.stop().catch(() => {});
    setScanning(false);
  }, []);

  async function signOut() {
    if (!confirm("Log out on this phone? You'll register again to scan.")) return;
    await stop();
    clearDeviceToken();
    navigate({ to: "/", replace: true });
  }

  useEffect(() => () => void stop(), [stop]);

  async function onCode(text: string) {
    if (busy.current || !token) return;
    busy.current = true;
    try {
      const r = await recordScan({ data: { token, code: text } });
      if (r.result === "saved") {
        setMsg({ tone: r.status === "present" ? "ok" : "warn", text: `Attendance saved · ${r.status} · ${r.smsSent ? "text is on its way to your parent" : "parent text couldn't be sent right now"}` });
        if (navigator.vibrate) navigator.vibrate(120);
        await stop();
        setTimeout(() => navigate({ to: "/classroom" }), 1500);
      } else if (r.result === "cooldown") {
        setMsg({ tone: "warn", text: `You've already checked in for the ${r.period} today.` });
        await stop();
        setTimeout(() => navigate({ to: "/classroom" }), 1500);
      } else if (r.result === "closed") setMsg({ tone: "warn", text: "Check-in is closed right now." });
      else if (r.result === "wrong_section") setMsg({ tone: "err", text: `This QR is for ${r.section}, not your section.` });
      else if (r.result === "invalid") setMsg({ tone: "err", text: "That's not a Present QR code." });
      else navigate({ to: "/register" });
    } catch {
      setMsg({ tone: "err", text: "Couldn't save — check your connection and try again." });
    } finally {
      setTimeout(() => (busy.current = false), 1500);
    }
  }

  async function start() {
    setMsg(null);
    const { Html5Qrcode } = await import("html5-qrcode");
    const s = new Html5Qrcode("qr-reader", { verbose: false });
    scanner.current = s;
    try {
      await s.start({ facingMode: "environment" }, { fps: 12, aspectRatio: 1 }, onCode, () => {});
      setScanning(true);
    } catch {
      setMsg({ tone: "err", text: "Camera access was blocked. Allow the camera and try again." });
    }
  }

  const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }) : "");

  return (
    <div className="min-h-screen">
      <AppHeader step={3} />
      <main className="mx-auto max-w-lg px-5 pb-16 pt-8">
        <p className="text-sm text-muted-foreground">{status?.student ? `${status.student.section}` : "Loading…"}</p>
        <h1 className="text-3xl font-bold">Hi, {status?.student?.name.split(" ")[0] ?? "there"}</h1>

        {gate === "setup" && (
          <div className="glass mt-6 flex items-start gap-4 rounded-2xl border-primary/40 p-5">
            <Fingerprint className="h-8 w-8 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-semibold">Add your fingerprint to start scanning</p>
              <p className="mt-1 text-sm text-muted-foreground">You only do this once on this phone. After that, your fingerprint unlocks the camera.</p>
              <Button size="sm" onClick={setupFingerprint} disabled={fingerBusy || !status?.student} className="glow mt-3 rounded-xl">
                {fingerBusy ? "Waiting for fingerprint…" : "Add fingerprint"}
              </Button>
            </div>
          </div>
        )}

        <div className="glass relative mt-6 aspect-square overflow-hidden rounded-3xl">
          <div id="qr-reader" className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
          {!scanning && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              {gate === "open" ? (
                <div>
                  <p className="text-sm text-muted-foreground">Point at the gate or classroom QR</p>
                  <Button onClick={start} className="glow mt-4 h-12 rounded-xl px-8 text-base font-semibold">Start scanning</Button>
                </div>
              ) : gate === "unlock" ? (
                <div>
                  <Fingerprint className="mx-auto h-10 w-10 text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">Use your fingerprint to open the camera</p>
                  <Button onClick={unlockCamera} disabled={fingerBusy} className="glow mt-4 h-12 rounded-xl px-8 text-base font-semibold">
                    {fingerBusy ? "Waiting for fingerprint…" : "Unlock camera"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{gate === "setup" ? "Add your fingerprint above to unlock the camera" : "Getting the camera ready…"}</p>
              )}
            </div>
          )}
          <div className="pointer-events-none absolute inset-[18%]">
            {["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl"].map((c) => (
              <span key={c} className={`absolute h-10 w-10 border-primary ${c}`} />
            ))}
            {scanning && <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse bg-primary shadow-[0_0_20px_var(--primary)]" />}
          </div>
        </div>
        {scanning && <Button variant="secondary" onClick={stop} className="mt-3 w-full rounded-xl">Stop camera</Button>}

        {msg && (
          <div role="status" className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 text-sm ${msg.tone === "ok" ? "border-primary/40 bg-primary/10 text-primary" : msg.tone === "warn" ? "border-warning/40 bg-warning/10 text-warning" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
            {msg.tone === "ok" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : msg.tone === "warn" ? <Timer className="h-5 w-5 shrink-0" /> : <Clock className="h-5 w-5 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <PeriodCard Icon={Sunrise} label="Morning" range="Present 4:00–7:00 AM · Late until 9:00 · Absent after 9:00 AM · Time out 7:05 AM" row={status?.morning} time={time} />
          <PeriodCard Icon={Sun} label="Afternoon" range="Present 11:30 AM–12:35 PM · Late until 2:35 PM · Absent after 2:35 PM · Time out 12:40 PM" row={status?.afternoon} time={time} />
        </div>

        {(status?.morning || status?.afternoon) && (
          <Button variant="secondary" onClick={() => navigate({ to: "/classroom" })} className="mt-6 w-full rounded-xl">
            <Users className="mr-1 h-4 w-4" />See my class
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={signOut} className="mt-6 text-muted-foreground">
          <LogOut className="mr-1 h-4 w-4" />Log out on this phone
        </Button>
      </main>
    </div>
  );
}

function PeriodCard({ Icon, label, range, row, time }: { Icon: typeof Sun; label: string; range: string; row: { scanned_at: string; late: boolean; status: string } | null | undefined; time: (s?: string) => string }) {
  return (
    <div className={`glass rounded-2xl p-4 ${row ? "border-primary/40" : ""}`}>
      <Icon className={`h-5 w-5 ${row ? "text-primary" : "text-muted-foreground"}`} />
      <p className="mt-3 font-display font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{range}</p>
      <p className={`mt-3 text-sm font-semibold ${row ? "text-primary" : "text-muted-foreground"}`}>
        {row ? `${row.status} · ${time(row.scanned_at)}` : "Waiting"}
      </p>
    </div>
  );
}
