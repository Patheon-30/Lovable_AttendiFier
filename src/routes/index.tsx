import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSavedFingerprint, loginWithFingerprint, fingerprintError } from "@/lib/biometric";
import { ArrowRight, Fingerprint, GraduationCap, ScanLine } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { getDeviceToken } from "@/lib/device";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Present — Who's checking in today?" },
      { name: "description", content: "Students scan the gate QR to check in; parents get a text. Teachers see their class live." },
      { property: "og:title", content: "Present — School attendance check-in" },
      { property: "og:description", content: "Scan the QR, your parent gets a text. Teachers see class attendance live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    setSaved(getSavedFingerprint()?.name ?? null);
    if (getDeviceToken()) navigate({ to: "/scan", replace: true });
  }, [navigate]);

  const cards = [
    { n: "01", to: "/register" as const, title: "Student", body: "Register and scan the QR — your parent gets a text", Icon: ScanLine },
    { n: "02", to: "/auth" as const, title: "Teacher", body: "Sign in to see your class attendance", Icon: GraduationCap },
  ];
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 pb-16 pt-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Good day</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Who's checking in today?</h1>
        {saved && (
          <Button
            className="glow mt-8 h-14 w-full rounded-2xl text-base font-semibold"
            onClick={async () => {
              try { await loginWithFingerprint(); navigate({ to: "/scan" }); }
              catch (e) { toast.error(fingerprintError(e)); }
            }}
          >
            <Fingerprint className="mr-2 h-5 w-5" />Log in as {saved} with fingerprint
          </Button>
        )}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {cards.map(({ n, to, title, body, Icon }) => (
            <Link key={n} to={to} className="glass group relative overflow-hidden rounded-3xl p-6 transition hover:-translate-y-0.5 hover:border-primary/40">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm text-muted-foreground">{n}</span>
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mt-10 text-2xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              <ArrowRight className="mt-6 h-5 w-5 text-primary transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
        <Link to="/gate" className="mt-8 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">
          Open gate kiosk QR →
        </Link>
      </main>
    </div>
  );
}
