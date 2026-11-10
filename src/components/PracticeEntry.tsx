import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { matchesPracticeEntry } from "@/lib/practice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function PracticeEntry({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogTitle>Practice entry</DialogTitle>
      <DialogDescription>Browser-only practice · no live records or parent texts</DialogDescription>
      <form method="post" className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        try {
          if (await matchesPracticeEntry(String(data.get("username")), String(data.get("password")))) {
            onOpenChange(false);
            await navigate({ to: "/practice" });
          } else setError("Practice entry not recognized.");
        } catch { setError("Could not open practice. Try again."); }
        finally { setBusy(false); }
      }}>
        <div className="space-y-2"><Label htmlFor="practice-username">Username</Label><Input id="practice-username" name="username" defaultValue="AttendiFier" autoComplete="off" /></div>
        <div className="space-y-2"><Label htmlFor="practice-password">Password</Label><Input id="practice-password" name="password" type="password" autoComplete="off" /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy} type="submit" className="w-full">{busy ? "Opening…" : "Open practice"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}