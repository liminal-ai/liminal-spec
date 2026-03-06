import type { CommandExecutor } from "../types";

export interface SmsSendResult {
  sent: boolean;
  sid?: string;
  reason: string;
}

export interface EscalationSmsPayload {
  runId: string;
  phaseId: string;
  attempt: number;
  summary: string;
  resumeCommand: string;
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function buildBody(payload: EscalationSmsPayload): string {
  return [
    `Liminal Orchestrator escalation`,
    `run=${payload.runId}`,
    `phase=${payload.phaseId} attempt=${payload.attempt}`,
    `${payload.summary}`,
    `Resume: ${payload.resumeCommand}`,
  ].join("\n");
}

function parseTwilioSid(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as { sid?: string };
    return parsed.sid;
  } catch {
    return undefined;
  }
}

export async function sendEscalationSms(
  payload: EscalationSmsPayload,
  executor: CommandExecutor
): Promise<SmsSendResult> {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_FROM");
  const to = env("ESCALATION_TO");

  if (!accountSid || !authToken || !from || !to) {
    return {
      sent: false,
      reason:
        "Twilio SMS not configured (need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, ESCALATION_TO).",
    };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = buildBody(payload);

  const data = new URLSearchParams({
    To: to,
    From: from,
    Body: body,
  }).toString();

  const command = [
    "curl -sS -u",
    `'${accountSid}:${authToken}'`,
    "-H 'Content-Type: application/x-www-form-urlencoded'",
    "-X POST",
    `'${endpoint}'`,
    "--data",
    `'${data.replace(/'/g, "'%5C''")}'`,
  ].join(" ");

  const result = await executor.run(command, process.cwd());

  if (result.exitCode !== 0) {
    return {
      sent: false,
      reason: `Twilio curl failed: ${result.stderr.trim() || result.stdout.trim()}`,
    };
  }

  const sid = parseTwilioSid(result.stdout);
  if (!sid) {
    return {
      sent: false,
      reason: `Twilio response missing sid: ${result.stdout.slice(0, 300)}`,
    };
  }

  return {
    sent: true,
    sid,
    reason: "SMS sent via Twilio",
  };
}
