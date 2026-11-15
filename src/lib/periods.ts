export type Period = "morning" | "afternoon";

export const GATE_CODE = "PRESENT://school-gate/v1";
export const classCode = (section: string) => `PRESENT://class/v1/${encodeURIComponent(section.trim())}`;

/** Parse a scanned QR. Returns null when it isn't a Present code. */
export function parseCode(raw: string): { kind: "gate" } | { kind: "class"; section: string } | null {
  const t = raw.trim();
  if (t === GATE_CODE) return { kind: "gate" };
  const m = t.match(/^PRESENT:\/\/class\/v1\/(.+)$/);
  if (m) return { kind: "class", section: decodeURIComponent(m[1] ?? "") };
  return null;
}

// Minutes after midnight, Manila time.
const MORNING_START = 4 * 60; // 4:00 AM
const MORNING_ON_TIME = 7 * 60; // present through 7:00 AM
const AFTERNOON_START = 11 * 60 + 30; // 11:30 AM
const AFTERNOON_ON_TIME = 12 * 60 + 35; // present through 12:35 PM

// "late" stays in the type only so older saved records still display.
export type AttendanceStatus = "present" | "late" | "absent";

export function periodAt(minutes: number): { period: Period; late: boolean; status: AttendanceStatus } | null {
  if (!Number.isFinite(minutes) || minutes < MORNING_START || minutes >= 24 * 60) return null;
  const period = minutes < AFTERNOON_START ? "morning" : "afternoon";
  const presentEnd = period === "morning" ? MORNING_ON_TIME : AFTERNOON_ON_TIME;
  const status: AttendanceStatus = minutes <= presentEnd ? "present" : "absent";
  return { period, late: false, status };
}

export function manilaParts(date = new Date()) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value])) as {
    year: string; month: string; day: string; hour: string; minute: string; weekday: string;
  };
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
    weekday: p.weekday as string,
  };
}

export function manilaLabel(date = new Date()) {
  const { weekday } = manilaParts(date);
  const time = date.toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
  return `${weekday} · ${time}`;
}
