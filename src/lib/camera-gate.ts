// Decides what a student must do before the scanner camera opens.
// "setup": add a fingerprint first (required on phones that support it).
// "unlock": confirm the saved fingerprint to open the camera.
// "open": camera may start (no fingerprint reader, or just confirmed).
export type CameraGate = "setup" | "unlock" | "open";

export function cameraGate(o: {
  supported: boolean;
  token: string | null;
  saved: { token: string } | null;
  recentlyUnlocked: boolean;
}): CameraGate {
  if (!o.supported) return "open";
  if (!o.saved || o.saved.token !== o.token) return "setup";
  return o.recentlyUnlocked ? "open" : "unlock";
}
