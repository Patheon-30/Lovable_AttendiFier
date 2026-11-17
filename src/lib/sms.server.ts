export function parentAttendanceMessage({
  studentName,
  section,
  period,
  time,
  status,
}: {
  studentName: string;
  section: string;
  period: "morning" | "afternoon";
  time: string;
  status: string;
}): string {
  const greeting = period === "morning" ? "Good morning" : "Good afternoon";
  return `${greeting}! I would like to inform you that your child ${studentName} from ${section} has safely arrived at school today at ${time}. He/She is now in the classroom and marked ${status}. Thank you for ensuring his/her timely arrival.`;
}

const CLOUD_URL = "https://api.sms-gate.app";

/** Builds the SMSGate send URL from a server address typed in any common form. */
export function smsGateMessagesUrl(serverUrl?: string): string {
  let base = (serverUrl ?? "").trim() || CLOUD_URL;
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  base = base.replace(/\/+$/, "").replace(/\/(message|messages)$/i, "").replace(/\/3rdparty\/v1$/i, "");
  return `${base}/3rdparty/v1/messages`;
}

/** Phone "Local server" addresses (home Wi-Fi) can't be reached from the internet. */
export function isLocalNetworkUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(host);
  } catch {
    return false;
  }
}

export function smsGateAuth(env: Record<string, string | undefined>): string | null {
  const token = env["SMSGATE_TOKEN"]?.trim();
  const user = env["SMSGATE_USERNAME"]?.trim();
  const pass = env["SMSGATE_PASSWORD"]?.trim();
  if (token) return `Bearer ${token}`;
  if (user && pass) return `Basic ${btoa(`${user}:${pass}`)}`;
  return null;
}

/** Sends an SMS through the user's SMSGate Android phone. Never throws. */
export async function sendSms(phone: string, text: string): Promise<boolean> {
  const url = smsGateMessagesUrl(process.env["SMSGATE_SERVER_URL"]);
  const auth = smsGateAuth(process.env);
  if (!auth) {
    console.error("[sms] SMSGate credentials are not configured");
    return false;
  }
  if (isLocalNetworkUrl(url)) {
    console.error("[sms] SMSGATE_SERVER_URL points to a local Wi-Fi address; use the SMSGate Cloud server instead");
    return false;
  }
  const request = () =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "AttendiFier/1.3",
        Authorization: auth,
      },
      body: JSON.stringify({ textMessage: { text }, phoneNumbers: [phone] }),
    });
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await request();
      if (res.ok) return true;
      const body = (await res.text()).slice(0, 300);
      if (res.status === 401) console.error("[sms] SMSGate rejected the username/password (401)", body);
      else console.error("[sms] SMSGate error", res.status, body);
      if (res.status < 500) return false;
    } catch (e) {
      console.error("[sms] SMSGate request failed", e);
    }
  }
  return false;
}
