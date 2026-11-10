export const DEVICE_KEY = "present.device_token";

export const getDeviceToken = () => (typeof window === "undefined" ? null : localStorage.getItem(DEVICE_KEY));

export function createDeviceToken() {
  const t = crypto.randomUUID() + "-" + crypto.randomUUID().slice(0, 8);
  localStorage.setItem(DEVICE_KEY, t);
  return t;
}

export function clearDeviceToken() {
  localStorage.removeItem(DEVICE_KEY);
}
