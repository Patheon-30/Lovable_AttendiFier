import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { GATE_CODE } from "@/lib/periods";

export const Route = createFileRoute("/gate")({
  head: () => ({
    meta: [
      { title: "Gate kiosk QR — Present" },
      { name: "description", content: "Printable school gate QR code for student check-in." },
      { property: "og:title", content: "Gate kiosk QR — Present" },
      { property: "og:description", content: "Display or print the school gate check-in code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Gate,
});

function Gate() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto flex max-w-xl flex-col items-center px-5 pb-16 pt-10 text-center">
        <QrSheet value={GATE_CODE} title="Scan to check in" subtitle="School gate · Present" />
        <Button onClick={() => window.print()} className="no-print glow mt-6 h-12 rounded-xl px-8"><Printer className="mr-2 h-4 w-4" />Print</Button>
      </main>
    </div>
  );
}

export function QrSheet({ value, title, subtitle }: { value: string; title: string; subtitle: string }) {
  return (
    <div className="print-sheet glass w-full rounded-3xl p-8">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-1 text-muted-foreground">{subtitle}</p>
      <div className="mx-auto mt-8 w-full max-w-sm rounded-2xl bg-paper p-5">
        <QRCodeSVG value={value} size={1024} level="H" marginSize={0} className="h-auto w-full" bgColor="#ffffff" fgColor="#0b1220" />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Open Present on your phone → Start scanning</p>
    </div>
  );
}
