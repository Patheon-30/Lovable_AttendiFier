import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PracticeEntry } from "@/components/PracticeEntry";
import { matchesPracticeEntry } from "@/lib/practice";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Teacher sign in — Present" },
      { name: "description", content: "Teachers sign in to see live class attendance." },
      { property: "og:title", content: "Teacher sign in — Present" },
      { property: "og:description", content: "Sign in or create a teacher account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});

const schema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(8).max(72) });

function Auth() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => data.user && navigate({ to: "/teacher", replace: true }));
  }, [navigate]);

  async function handle(mode: "in" | "up", e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (mode === "in" && await matchesPracticeEntry(String(fd.get("email")), String(fd.get("password")))) {
      await navigate({ to: "/practice" });
      return;
    }
    const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error("Enter a valid email and a password of 8+ characters"); return; }
    setBusy(true);
    const { email, password } = parsed.data;
    const { data, error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/teacher` } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data.session) navigate({ to: "/teacher" });
    else setSent(true);
  }

  const form = (mode: "in" | "up") => (
    <form method="post" onSubmit={(e) => handle(mode, e)} className="space-y-4 pt-4">
      <div className="space-y-2"><Label htmlFor={`email-${mode}`}>{mode === "in" ? "Email or username" : "Email"}</Label><Input id={`email-${mode}`} name="email" type={mode === "in" ? "text" : "email"} autoComplete="username" placeholder="teacher@school.edu.ph" /></div>
      <div className="space-y-2"><Label>Password</Label><Input name="password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>
      <Button disabled={busy} className="glow h-12 w-full rounded-xl font-semibold">{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
    </form>
  );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 pb-16 pt-10">
        <h1 className="text-3xl font-bold">Teacher portal</h1>
        <div className="glass mt-6 rounded-3xl p-6">
          {sent ? (
            <p className="text-sm">Check your email to confirm your account, then sign in.</p>
          ) : (
            <Tabs defaultValue="in">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="in">Sign in</TabsTrigger><TabsTrigger value="up">Register</TabsTrigger></TabsList>
              <TabsContent value="in">{form("in")}</TabsContent>
              <TabsContent value="up">{form("up")}</TabsContent>
            </Tabs>
          )}
        </div>
        <Button variant="ghost" className="mt-4" onClick={() => setPracticeOpen(true)}>Practice entry</Button>
      </main>
      <PracticeEntry open={practiceOpen} onOpenChange={setPracticeOpen} />
    </div>
  );
}
