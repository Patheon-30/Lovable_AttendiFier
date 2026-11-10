import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FlaskConical, LogOut, ScanLine, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initialPractice, PRACTICE_KEY, practiceScan, readPractice, type PracticeState } from "@/lib/practice";

export const Route = createFileRoute("/practice")({
  head: () => ({ meta: [
    { title: "AttendiFier practice — Present" },
    { name: "description", content: "Separate QR code and attendance settings practice, without live records or SMS." },
    { property: "og:title", content: "AttendiFier practice — Present" },
    { property: "og:description", content: "Personal browser-only attendance practice." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }), component: Practice,
});

function Practice() {
  const navigate = useNavigate();
  const [state, setState] = useState<PracticeState>(initialPractice);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [message, setMessage] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const scanner = useRef<{ stop: () => Promise<void>; isScanning: boolean } | null>(null);
  const current = useRef(state);
  const lastScan = useRef(0);
  current.current = state;

  useEffect(() => {
    try { setState(readPractice(localStorage.getItem(PRACTICE_KEY))); } catch { setStorageError(true); }
    setReady(true);
    return () => { if (scanner.current?.isScanning) void scanner.current.stop().catch(() => {}); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(PRACTICE_KEY, JSON.stringify(state)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state, ready]);

  function scan(code: string) {
    const next = practiceScan(current.current, code, new Date().toISOString());
    if (!next) { setMessage("That code does not match the practice QR."); return; }
    setState(next);
    setMessage("Practice check-in saved · no text sent");
  }
  async function stopCamera() {
    if (scanner.current?.isScanning) await scanner.current.stop().catch(() => {});
    setCameraActive(false);
  }
  async function startCamera() {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const reader = new Html5Qrcode("practice-camera", { verbose: false });
      scanner.current = reader;
      await reader.start({ facingMode: "environment" }, { fps: 10, aspectRatio: 1 }, (code) => {
        // Camera frame debounce only; repeated manual check-ins remain unlimited.
        if (Date.now() - lastScan.current < 1500) return;
        lastScan.current = Date.now();
        scan(code);
      }, () => {});
      setCameraActive(true);
    } catch { setMessage("Camera unavailable. You can still check in using the practice QR."); }
  }

  return <div className="min-h-screen"><AppHeader />
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-8">
      <div className="flex items-start justify-between gap-4">
        <div><p className="flex items-center gap-2 text-sm text-primary"><FlaskConical className="h-4 w-4" />Practice only</p><h1 className="mt-2 text-3xl font-bold">AttendiFier</h1></div>
        <Button variant="ghost" onClick={async () => { await stopCamera(); await navigate({ to: "/" }); }}><LogOut className="mr-2 h-4 w-4" />Exit</Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Saved on this browser only · no live records · no parent texts</p>
      {storageError && <p role="alert" className="mt-3 text-sm text-destructive">Browser storage is unavailable. Changes will not survive closing this page.</p>}
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Practice settings</h2>
          <div className="space-y-2"><Label htmlFor="test-section">Section</Label><Input id="test-section" maxLength={50} value={state.section} onChange={(e) => setState({ ...state, section: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="test-student">Student name</Label><Input id="test-student" maxLength={100} value={state.studentName} onChange={(e) => setState({ ...state, studentName: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="test-code">QR code value</Label><Input id="test-code" maxLength={300} value={state.code} onChange={(e) => setState({ ...state, code: e.target.value })} /></div>
          <Tabs value={state.period} onValueChange={(period) => { if (period === "morning" || period === "afternoon") setState({ ...state, period }); }}><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="morning">Morning</TabsTrigger><TabsTrigger value="afternoon">Afternoon</TabsTrigger></TabsList></Tabs>
          <p className="text-sm text-primary">All hours · unlimited check-ins</p>
          <Button disabled={!ready || !state.code.trim()} onClick={() => scan(state.code)} className="w-full"><ScanLine className="mr-2 h-4 w-4" />Check in with practice QR</Button>
        </section>
        <section>
          <h2 className="text-lg font-semibold">{state.section || "Practice QR"}</h2>
          <div className="mt-4 aspect-square rounded-lg bg-paper p-6"><QRCodeSVG value={state.code || "PRESENT://practice"} size={600} level="H" className="h-full w-full" /></div>
        </section>
      </div>
      <section className="mt-8 space-y-3 border-t pt-6">
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); scan(codeInput); }}>
          <Input aria-label="Scanned practice code" placeholder="Scanned practice code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} className="min-w-0 flex-1" />
          <Button type="submit" disabled={!ready}>Check code</Button>
          <Button variant="secondary" type="button" onClick={cameraActive ? stopCamera : startCamera}>{cameraActive ? "Stop camera" : "Scan camera"}</Button>
        </form>
        <div id="practice-camera" className={cameraActive ? "mx-auto aspect-square max-w-sm overflow-hidden rounded-lg" : ""} />
        {message && <p role="status" className="text-sm text-primary">{message}</p>}
      </section>
      <section className="mt-8 border-t pt-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Practice check-ins ({state.scans.length})</h2><Button variant="ghost" aria-label="Clear practice check-ins" onClick={() => { setState({ ...state, scans: [] }); setMessage(""); }}><Trash2 className="h-4 w-4" /></Button></div>
        {state.scans.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No practice check-ins yet</p>}
        <ul className="mt-4 divide-y">{state.scans.map((row, i) => <li key={`${row.at}-${i}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-semibold">{row.name || "Practice student"}</span><span className="text-muted-foreground">{row.period} · {new Date(row.at).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" })}</span></li>)}</ul>
      </section>
    </main>
  </div>;
}