import { z } from "zod";
import type { Period } from "./periods";

export const PRACTICE_KEY = "present.practice.v1";
export const PRACTICE_ENTRY = "AttendiFier";
const schema = z.object({
  section: z.string().max(50),
  code: z.string().min(1).max(300),
  studentName: z.string().max(100),
  period: z.enum(["morning", "afternoon"]),
  scans: z.array(z.object({ name: z.string(), period: z.enum(["morning", "afternoon"]), at: z.string() })).max(200),
});
export type PracticeState = z.infer<typeof schema>;
export const initialPractice: PracticeState = {
  section: "Practice class", code: "PRESENT://practice/v1/Practice", studentName: "Practice student", period: "morning", scans: [],
};
export function readPractice(raw: string | null): PracticeState {
  try { const result = schema.safeParse(JSON.parse(raw ?? "null")); return result.success ? result.data : { ...initialPractice, scans: [] }; }
  catch { return { ...initialPractice, scans: [] }; }
}

// Public demo selector, NOT authentication or a grant of privileges.
export async function matchesPracticeEntry(username: string, password: string): Promise<boolean> {
  if (username.trim() !== PRACTICE_ENTRY) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex === "cb9b36b102080fdd528586959f259535502519291b06d3ddfe76c8a74cecd638";
}

export function practiceScan(state: PracticeState, code: string, at: string): PracticeState | null {
  if (code.trim() !== state.code.trim()) return null;
  return { ...state, scans: [{ name: state.studentName, period: state.period as Period, at }, ...state.scans].slice(0, 200) };
}