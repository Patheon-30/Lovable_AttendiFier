import { describe, it, expect } from "vitest";
import { classmatesOf, escapeLike, teacherNames } from "@/lib/classroom";

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
