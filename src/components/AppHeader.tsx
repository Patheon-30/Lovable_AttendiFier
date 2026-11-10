import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { manilaLabel } from "@/lib/periods";

export function AppHeader({ step, total = 3 }: { step?: number; total?: number }) {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () => setNow(manilaLabel());
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);
  return (
    <header className="no-print mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 pt-5">
      <Link to="/" className="flex items-center gap-3">
        <span className="glow grid h-10 w-10 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">P</span>
        <span className="leading-tight">
          <span className="block font-display font-semibold">Present</span>
          <span className="block text-xs text-muted-foreground">Attendance</span>
        </span>
      </Link>
      <div className="flex items-center gap-3">
        {step !== undefined && (
          <div className="hidden items-center gap-1 sm:flex" aria-label={`Step ${step} of ${total}`}>
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i < step ? "w-6 bg-primary" : "w-3 bg-muted"}`} />
            ))}
          </div>
        )}
        <span className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium tabular-nums">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          {now || "Manila"}
        </span>
      </div>
    </header>
  );
}
