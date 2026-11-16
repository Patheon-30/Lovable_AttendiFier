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
const LATE_GRACE = 2 * 60; // late for 2 hours after the present limit, then absent

export type AttendanceStatus = "present" | "late" | "absent";

/** Last minute (Manila) a scan still counts as late; after this the period is absent. */
export const lateUntil = (period: Period) => (period === "morning" ? MORNING_ON_TIME : AFTERNOON_ON_TIME) + LATE_GRACE;

export function periodAt(minutes: number): { period: Period; late: boolean; status: AttendanceStatus } | null {
  if (!Number.isFinite(minutes) || minutes < MORNING_START || minutes >= 24 * 60) return null;
  const period = minutes < AFTERNOON_START ? "morning" : "afternoon";
  const presentEnd = period === "morning" ? MORNING_ON_TIME : AFTERNOON_ON_TIME;
  const status: AttendanceStatus = minutes <= presentEnd ? "present" : minutes <= lateUntil(period) ? "late" : "absent";
  return { period, late: status === "late", status };
}

/** A student with no scan for this period is absent once the late window has passed. */
export const missedPeriod = (period: Period, minutes: number) => minutes > lateUntil(period);

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
