import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, GraduationCap, ScanLine, Users } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { getDeviceToken } from "@/lib/device";
import { getClassroom } from "@/lib/student.functions";

export const Route = createFileRoute("/classroom")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My class — Present" },
      { name: "description", content: "After checking in, see your classmates and teachers for your section." },
      { property: "og:title", content: "My class — Present" },
      { property: "og:description", content: "Your section's classmates and teachers, shown after you check in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Classroom,
});

type Data = Awaited<ReturnType<typeof getClassroom>>;

function Classroom() {
  const navigate = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = getDeviceToken();
    if (!token) { navigate({ to: "/register", replace: true }); return; }
    getClassroom({ data: { token } })
      .then((r) => (r.result === "unregistered" ? navigate({ to: "/register", replace: true }) : setData(r)))
      .catch(() => setFailed(true));
  }, [navigate]);

  const backToScan = (
    <Button variant="secondary" onClick={() => navigate({ to: "/scan" })} className="mt-6 w-full rounded-xl">
      <ScanLine className="mr-1 h-4 w-4" />Back to scanner
    </Button>
  );

  if (failed || data?.result === "not_scanned") {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-lg px-5 pb-16 pt-8">
          <h1 className="text-3xl font-bold">My class</h1>
          <p className="glass mt-6 rounded-2xl p-5 text-sm text-muted-foreground">
            {failed ? "Couldn't load your class — check your connection and try again." : "Scan the gate or classroom QR first. Your class appears once you've checked in today."}
          </p>
          {backToScan}
        </main>
      </div>
    );
  }

  if (!data || data.result !== "ok") {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-lg px-5 pb-16 pt-8"><p className="text-sm text-muted-foreground">Loading your class…</p></main>
      </div>
    );
  }

  const latest = data.checkedIn[data.checkedIn.length - 1];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-lg px-5 pb-16 pt-8">
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>You're checked in{latest ? ` · ${latest.period} · ${latest.status}` : ""}</span>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">Your section</p>
        <h1 className="text-3xl font-bold">{data.section}</h1>

        <section className="glass mt-6 rounded-3xl p-5">
          <h2 className="flex items-center gap-2 font-display font-semibold">
            <GraduationCap className="h-5 w-5 text-primary" />
            {data.teachers.length === 1 ? "Teacher" : "Teachers"}
          </h2>
          {data.teachers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Your teacher hasn't added their name yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.teachers.map((t) => (
                <li key={t} className="rounded-xl bg-primary/10 px-3 py-2 font-semibold">{t}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass mt-4 rounded-3xl p-5">
          <h2 className="flex items-center justify-between gap-2 font-display font-semibold">
            <span className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Classmates</span>
            <span className="text-sm font-normal text-muted-foreground tabular-nums">{data.classmates.length}</span>
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {data.classmates.map((c, i) => (
              <li key={`${c.name}-${i}`} className="flex items-center gap-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted font-display text-sm font-semibold">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                {c.isYou && <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">You</span>}
              </li>
            ))}
          </ul>
        </section>

        {backToScan}
      </main>
    </div>
  );
}
