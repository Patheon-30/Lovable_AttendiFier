// Pure helpers for the student "My class" view. Only names leave the server.

export const TEACHER_NAME_MAX = 80;

export const sameSection = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Escapes LIKE wildcards so a section name is matched literally. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

type StudentRow = { id: string; name: string; section: string };

export type Classmate = { name: string; isYou: boolean };

export function classmatesOf(me: StudentRow, rows: StudentRow[]): Classmate[] {
  return rows
    .filter((r) => sameSection(r.section, me.section))
    .map((r) => ({ name: r.name.trim(), isYou: r.id === me.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
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
