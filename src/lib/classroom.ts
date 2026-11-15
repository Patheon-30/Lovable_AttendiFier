// Pure helpers for the student "My class" view. Only names leave the server.

export const TEACHER_NAME_MAX = 80;

export const sameSection = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** One student per name per section: case and extra spaces don't make a new student. */
export const studentKey = (name: string, section: string) =>
  `${name.trim().replace(/\s+/g, " ").toLowerCase()}|${section.trim().replace(/\s+/g, " ").toLowerCase()}`;

/** Escapes LIKE wildcards so a section name is matched literally. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

type StudentRow = { id: string; name: string; section: string };

export type Classmate = { name: string; isYou: boolean };

export function classmatesOf(me: StudentRow, rows: StudentRow[]): Classmate[] {
  const byKey = new Map<string, Classmate>();
  for (const r of rows) {
    if (!sameSection(r.section, me.section)) continue;
    const key = studentKey(r.name, r.section);
    const isYou = r.id === me.id || key === studentKey(me.name, me.section);
    const prev = byKey.get(key);
    if (!prev) byKey.set(key, { name: r.name.trim().replace(/\s+/g, " "), isYou });
    else if (isYou) prev.isYou = true;
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Reads the name a teacher chose to show students from their account details. */
export function teacherDisplayName(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null;
  const raw = (meta as Record<string, unknown>)["display_name"];
  if (typeof raw !== "string") return null;
  const name = raw.trim().slice(0, TEACHER_NAME_MAX);
  return name.length >= 2 ? name : null;
}

export function teacherNames(metas: unknown[]): string[] {
  const names = metas.map(teacherDisplayName).filter((n): n is string => !!n);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

type Scan = { scanned_at: string };
type RosterRow = { id: string; name: string; section: string; created_at?: string; morning?: Scan | undefined; afternoon?: Scan | undefined };

/**
 * Folds students with the same name in the same section into one roster row.
 * Keeps the earliest check-in per period and remembers every record id so removing removes them all.
 */
export function mergeDuplicateStudents<R extends RosterRow>(rows: R[]): (R & { ids: string[] })[] {
  const earliest = (a: R["morning"], b: R["morning"]) => (!a ? b : !b ? a : a.scanned_at <= b.scanned_at ? a : b);
  const byKey = new Map<string, R & { ids: string[] }>();
  const sorted = [...rows].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  for (const r of sorted) {
    const key = studentKey(r.name, r.section);
    const prev = byKey.get(key);
    if (!prev) { byKey.set(key, { ...r, ids: [r.id] }); continue; }
    prev.ids.push(r.id);
    prev.morning = earliest(prev.morning, r.morning) as R["morning"];
    prev.afternoon = earliest(prev.afternoon, r.afternoon) as R["afternoon"];
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}
