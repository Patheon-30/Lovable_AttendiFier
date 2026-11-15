import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { manilaParts, parseCode, periodAt } from "./periods";
import { detectCarrier, normalizePhone } from "./phone";
import { classmatesOf, escapeLike, sameSection, teacherNames } from "./classroom";

const tokenSchema = z.string().min(20).max(100);

export const registerStudent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      token: tokenSchema,
      name: z.string().trim().min(2).max(100),
      section: z.string().trim().min(1).max(50),
      parentName: z.string().trim().min(2).max(100),
      parentPhone: z.string().max(30),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.parentPhone);
    if (!phone) throw new Error("Enter a valid PH mobile number");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("students").upsert(
      { device_token: data.token, name: data.name, section: data.section, parent_name: data.parentName, parent_phone: phone, carrier: detectCarrier(phone) },
      { onConflict: "device_token" },
    );
    if (error) throw new Error("Could not save registration");
    return { ok: true };
  });

async function loadStudent(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("students").select("id,name,section").eq("device_token", token).maybeSingle();
  return { supabaseAdmin, student: data };
}

export const getStudentStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin, student } = await loadStudent(data.token);
    if (!student) return { student: null, morning: null, afternoon: null };
    const { day } = manilaParts();
    const { data: rows } = await supabaseAdmin.from("attendance").select("period,scanned_at,late,status").eq("student_id", student.id).eq("day", day);
    const find = (p: string) => rows?.find((r) => r.period === p) ?? null;
    return { student: { name: student.name, section: student.section }, morning: find("morning"), afternoon: find("afternoon") };
  });

export const recordScan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tokenSchema, code: z.string().max(300) }).parse(d))
  .handler(async ({ data }) => {
    const code = parseCode(data.code);
    if (!code) return { result: "invalid" as const };
    const { supabaseAdmin, student } = await loadStudent(data.token);
    if (!student) return { result: "unregistered" as const };
    if (code.kind === "class" && code.section.toLowerCase() !== student.section.trim().toLowerCase())
      return { result: "wrong_section" as const, section: code.section };
    const { day, minutes } = manilaParts();
    const slot = periodAt(minutes);
    if (!slot) return { result: "closed" as const };
    const { error } = await supabaseAdmin.from("attendance").insert({ student_id: student.id, day, period: slot.period, late: slot.late, status: slot.status });
    if (error?.code === "23505") return { result: "cooldown" as const, period: slot.period };
    if (error) throw new Error("Could not save attendance");
    const { data: full } = await supabaseAdmin.from("students").select("parent_name,parent_phone").eq("id", student.id).maybeSingle();
    let smsSent = false;
    if (full) {
      const { parentAttendanceMessage, sendSms } = await import("./sms.server");
      const time = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
      smsSent = await sendSms(
        full.parent_phone,
        parentAttendanceMessage({
          studentName: student.name,
          section: student.section,
          period: slot.period,
          time,
          status: slot.status,
        }),
      );
    }
    return { result: "saved" as const, period: slot.period, late: slot.late, status: slot.status, smsSent };
  });

// Students see their section's classmates and teachers only after checking in today. Names only.
export const getClassroom = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin, student } = await loadStudent(data.token);
    if (!student) return { result: "unregistered" as const };
    const { day } = manilaParts();
    const { data: today } = await supabaseAdmin.from("attendance").select("period,status").eq("student_id", student.id).eq("day", day);
    if (!today?.length) return { result: "not_scanned" as const };
    const pattern = `%${escapeLike(student.section.trim())}%`;
    const [{ data: peers, error: peersError }, { data: settings, error: settingsError }] = await Promise.all([
      supabaseAdmin.from("students").select("id,name,section").ilike("section", pattern).limit(1000),
      supabaseAdmin.from("teacher_settings").select("user_id,section").ilike("section", pattern).limit(50),
    ]);
    if (peersError || settingsError) throw new Error("Could not load your class");
    const teacherIds = (settings ?? []).filter((t) => sameSection(t.section, student.section)).map((t) => t.user_id);
    const metas = await Promise.all(
      teacherIds.map(async (id) => (await supabaseAdmin.auth.admin.getUserById(id)).data.user?.user_metadata ?? null),
    );
    return {
      result: "ok" as const,
      section: student.section.trim(),
      checkedIn: today.map((r) => ({ period: r.period, status: r.status })),
      teachers: teacherNames(metas),
      classmates: classmatesOf(student, peers ?? []),
    };
  });
