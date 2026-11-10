// Fingerprint quick log-in for students, kept on this phone only.
// The phone's fingerprint reader (WebAuthn platform authenticator) unlocks a
// saved device token; nothing about the fingerprint ever leaves the phone.
import { DEVICE_KEY } from "./device";

export const BIOMETRIC_KEY = "present.biometric.v1";

type Saved = { credentialId: string; token: string; name: string };

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export function getSavedFingerprint(): Saved | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(BIOMETRIC_KEY) ?? "null"); } catch { return null; }
}

export function forgetFingerprint() {
  localStorage.removeItem(BIOMETRIC_KEY);
}

export async function fingerprintAvailable() {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  // Some phones under-report support, so offer it whenever the browser has WebAuthn.
  return true;
}

export async function addFingerprint(token: string, name: string) {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Present", id: window.location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name, displayName: name },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Fingerprint was not added");
  const saved: Saved = { credentialId: b64(cred.rawId), token, name };
  localStorage.setItem(BIOMETRIC_KEY, JSON.stringify(saved));
}

export async function loginWithFingerprint() {
  const saved = getSavedFingerprint();
  if (!saved) throw new Error("No fingerprint saved on this phone");
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: window.location.hostname,
      allowCredentials: [{ type: "public-key", id: unb64(saved.credentialId) }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  if (!res) throw new Error("Fingerprint not recognized");
  localStorage.setItem(DEVICE_KEY, saved.token);
  return saved;
}

export function fingerprintError(err: unknown) {
  const name = err instanceof Error ? err.name : "";
  if (typeof window !== "undefined" && window.self !== window.top)
    return "Fingerprint can't open inside the preview — open the app in its own browser tab";
  if (name === "NotAllowedError") return "Fingerprint was cancelled or timed out — try again";
  if (name === "SecurityError") return "Fingerprint needs the app opened on its secure (https) web address";
  if (name === "NotSupportedError") return "This phone's browser doesn't support fingerprint log-in";
  return err instanceof Error ? err.message : "Fingerprint didn't work";
}
