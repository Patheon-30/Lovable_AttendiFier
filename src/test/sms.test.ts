import { describe, expect, it } from "vitest";
import { isLocalNetworkUrl, smsGateAuth, smsGateMessagesUrl } from "@/lib/sms.server";

describe("SMSGate connection", () => {
  it("uses the SMSGate cloud server when no address is set", () => {
    expect(smsGateMessagesUrl(undefined)).toBe("https://api.sms-gate.app/3rdparty/v1/messages");
    expect(smsGateMessagesUrl("  ")).toBe("https://api.sms-gate.app/3rdparty/v1/messages");
  });

  it("accepts a server address copied with or without the API path", () => {
    expect(smsGateMessagesUrl("https://api.sms-gate.app/3rdparty/v1/")).toBe("https://api.sms-gate.app/3rdparty/v1/messages");
    expect(smsGateMessagesUrl("https://api.sms-gate.app/3rdparty/v1/message")).toBe("https://api.sms-gate.app/3rdparty/v1/messages");
    expect(smsGateMessagesUrl("sms.example.com/api")).toBe("https://sms.example.com/api/3rdparty/v1/messages");
  });

  it("flags home Wi-Fi addresses that the internet can't reach", () => {
    expect(isLocalNetworkUrl("http://192.168.1.5:8080/3rdparty/v1/messages")).toBe(true);
    expect(isLocalNetworkUrl("https://api.sms-gate.app/3rdparty/v1/messages")).toBe(false);
  });

  it("ignores stray spaces around a pasted username and password", () => {
    expect(smsGateAuth({ SMSGATE_USERNAME: " ABC ", SMSGATE_PASSWORD: "xyz\n" })).toBe(`Basic ${btoa("ABC:xyz")}`);
    expect(smsGateAuth({})).toBeNull();
  });
});
