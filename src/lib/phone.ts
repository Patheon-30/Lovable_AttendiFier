export type Carrier = "Globe/TM" | "Smart/TNT/Sun" | "DITO" | "GOMO";

const PREFIXES: Record<Carrier, string[]> = {
  "Globe/TM": ["817","904","905","906","915","916","917","926","927","935","936","937","945","953","954","955","956","965","966","967","975","977","978","979","995","996","997"],
  "Smart/TNT/Sun": ["813","907","908","909","910","911","912","913","914","918","919","920","921","922","923","924","925","928","929","930","931","932","933","934","938","939","940","941","942","943","944","946","947","948","949","950","951","961","963","968","969","970","981","989","998","999"],
  DITO: ["895","896","897","898","991","992","993","994"],
  GOMO: ["976"],
};

/** Returns the 10 national digits (starting with 9 or 8), possibly partial. */
export function nationalDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("63")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

export function detectCarrier(input: string): Carrier | null {
  const p = nationalDigits(input).slice(0, 3);
  if (p.length < 3) return null;
  for (const [c, list] of Object.entries(PREFIXES)) if (list.includes(p)) return c as Carrier;
  return null;
}

/** Display format: 0917 123 4567 */
export function formatPhone(input: string): string {
  const d = nationalDigits(input);
  if (!d) return "";
  const s = "0" + d;
  return [s.slice(0, 4), s.slice(4, 7), s.slice(7, 11)].filter(Boolean).join(" ");
}

/** +639171234567, or null if incomplete */
export function normalizePhone(input: string): string | null {
  const d = nationalDigits(input);
  return d.length === 10 && d.startsWith("9") ? `+63${d}` : null;
}
