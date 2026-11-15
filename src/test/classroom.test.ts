import { describe, it, expect } from "vitest";
import { classmatesOf, escapeLike, mergeDuplicateStudents, studentKey, teacherNames } from "@/lib/classroom";

const me = { id: "1", name: "Juan Dela Cruz", section: "11-Psalms" };

describe("student class view", () => {
  it("lists only students from the same section, ignoring case and spaces", () => {
    const rows = [
      me,
      { id: "2", name: "Ana Reyes", section: " 11-psalms " },
      { id: "3", name: "Ben Cruz", section: "12-Proverbs" },
    ];
    expect(classmatesOf(me, rows).map((c) => c.name)).toEqual(["Ana Reyes", "Juan Dela Cruz"]);
  });

  it("marks the scanning student as you", () => {
    expect(classmatesOf(me, [me]).find((c) => c.isYou)?.name).toBe("Juan Dela Cruz");
  });

  it("shares names only, never parent details", () => {
    const row = { ...me, parent_name: "Maria", parent_phone: "+639171234567" };
    expect(Object.keys(classmatesOf(me, [row])[0] ?? {}).sort()).toEqual(["isYou", "name"]);
  });

  it("shows each teacher's chosen name and skips teachers without one", () => {
    expect(teacherNames([{ display_name: " Ms. Reyes " }, {}, { display_name: "" }, null, { display_name: "Mr. Santos" }])).toEqual(["Mr. Santos", "Ms. Reyes"]);
  });

  it("matches section names literally", () => {
    expect(escapeLike("11_A%")).toBe("11\\_A\\%");
  });
});

describe("no duplicate students in a section", () => {
  it("treats the same name in the same section as one student, ignoring case and spaces", () => {
    expect(studentKey("Harry Potter", "Section A")).toBe(studentKey("  harry   POTTER ", "section a "));
  });

  it("keeps the same name in different sections as different students", () => {
    expect(studentKey("Harry Potter", "Section A")).not.toBe(studentKey("Harry Potter", "Section B"));
  });

  it("shows Harry Potter of Section A once on the teacher's roster after he registers twice", () => {
    const rows = [
      { id: "1", name: "Harry Potter", section: "Section A", created_at: "2026-11-01T00:00:00Z", morning: { scanned_at: "2026-11-15T21:00:00Z" } },
      { id: "2", name: "harry potter", section: "Section A", created_at: "2026-11-10T00:00:00Z", afternoon: { scanned_at: "2026-11-16T04:00:00Z" } },
      { id: "3", name: "Harry Potter", section: "Section B", created_at: "2026-11-10T00:00:00Z" },
    ];
    const merged = mergeDuplicateStudents(rows);
    expect(merged).toHaveLength(2);
    const a = merged.find((r) => r.section === "Section A");
    expect(a?.ids).toEqual(["1", "2"]);
    expect(a?.morning?.scanned_at).toBe("2026-11-15T21:00:00Z");
    expect(a?.afternoon?.scanned_at).toBe("2026-11-16T04:00:00Z");
  });

  it("shows a re-registered classmate once in the class view", () => {
    const rows = [me, { id: "9", name: "juan dela cruz", section: "11-Psalms" }, { id: "2", name: "Ana Reyes", section: "11-Psalms" }];
    expect(classmatesOf(me, rows).map((c) => c.name)).toEqual(["Ana Reyes", "Juan Dela Cruz"]);
  });
});
