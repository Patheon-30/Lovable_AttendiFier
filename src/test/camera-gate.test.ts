import { describe, it, expect } from "vitest";
import { cameraGate } from "@/lib/camera-gate";

const base = { supported: true, token: "tok", saved: { token: "tok" }, recentlyUnlocked: false };

describe("fingerprint before scanning", () => {
  it("a student with no fingerprint must add one before the camera opens", () =>
    expect(cameraGate({ ...base, saved: null })).toBe("setup"));
  it("a fingerprint saved for another registration must be added again", () =>
    expect(cameraGate({ ...base, saved: { token: "old" } })).toBe("setup"));
  it("a saved fingerprint unlocks the camera", () => expect(cameraGate(base)).toBe("unlock"));
  it("a just-confirmed fingerprint opens the camera without asking twice", () =>
    expect(cameraGate({ ...base, recentlyUnlocked: true })).toBe("open"));
  it("phones without a fingerprint reader can still scan", () =>
    expect(cameraGate({ ...base, supported: false, saved: null })).toBe("open"));
});
