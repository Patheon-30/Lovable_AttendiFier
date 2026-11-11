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

/** Sends an SMS through the user's SMSGate Android phone. Never throws. */
export async function sendSms(phone: string, text: string): Promise<boolean> {
  const base = (process.env["SMSGATE_SERVER_URL"] || "https://api.sms-gate.app").replace(/\/+$/, "");
  const token = process.env["SMSGATE_TOKEN"];
  const user = process.env["SMSGATE_USERNAME"];
  const pass = process.env["SMSGATE_PASSWORD"];
  const auth = token ? `Bearer ${token}` : user && pass ? `Basic ${btoa(`${user}:${pass}`)}` : null;
  if (!auth) {
    console.error("[sms] SMSGate credentials are not configured");
    return false;
  }
  try {
    const res = await fetch(`${base}/3rdparty/v1/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ textMessage: { text }, phoneNumbers: [phone] }),
    });
    if (!res.ok) console.error("[sms] SMSGate error", res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error("[sms] SMSGate request failed", e);
    return false;
  }
}
