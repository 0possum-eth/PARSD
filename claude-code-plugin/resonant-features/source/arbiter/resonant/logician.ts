import {
  computeExecutionDigest,
  EXECUTION_DIGEST_PATTERN,
  MAX_EXECUTION_OUTPUT_SUMMARY_CHARS
} from "../contracts/packets";

type LogicianResult =
  | { ok: true }
  | {
      ok: false;
      reasonCode:
        | "PACKET_NOT_OBJECT"
        | "TASK_ID_MISMATCH"
        | "EXECUTION_MISSING"
        | "EXECUTION_RECORD_INVALID"
        | "EXECUTION_DIGEST_INVALID"
        | "TESTS_INVALID"
        | "FILES_CHANGED_INVALID"
        | "VERIFICATION_PACKET_INVALID";
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validateExecutionRecord = (value: unknown): LogicianResult => {
  if (!isRecord(value)) {
    return { ok: false, reasonCode: "EXECUTION_RECORD_INVALID" };
  }

  const outputSummary = typeof value.outputSummary === "string" ? value.outputSummary : "";
  const outputDigest = typeof value.outputDigest === "string" ? value.outputDigest : "";

  if (
    !isNonEmptyString(value.command) ||
    !Number.isInteger(value.exitCode) ||
    (value.exitCode as number) !== 0 ||
    !isNonEmptyString(outputSummary) ||
    outputSummary.trim().length > MAX_EXECUTION_OUTPUT_SUMMARY_CHARS
  ) {
    return { ok: false, reasonCode: "EXECUTION_RECORD_INVALID" };
  }

  if (!EXECUTION_DIGEST_PATTERN.test(outputDigest) || computeExecutionDigest(outputSummary) !== outputDigest) {
    return { ok: false, reasonCode: "EXECUTION_DIGEST_INVALID" };
  }

  return { ok: true };
};

const isValidStringArray = (value: unknown) =>
  Array.isArray(value) && value.every((item) => isNonEmptyString(item));

export const validateTaskCompletionPacket = (packet: unknown, expectedTaskId: string): LogicianResult => {
  if (!isRecord(packet)) {
    return { ok: false, reasonCode: "PACKET_NOT_OBJECT" };
  }

  if (!isNonEmptyString(packet.taskId) || packet.taskId !== expectedTaskId) {
    return { ok: false, reasonCode: "TASK_ID_MISMATCH" };
  }

  if (!Array.isArray(packet.execution) || packet.execution.length === 0) {
    return { ok: false, reasonCode: "EXECUTION_MISSING" };
  }

  for (const record of packet.execution) {
    const result = validateExecutionRecord(record);
    if (!result.ok) {
      return result;
    }
  }

  if (packet.tests !== undefined && !isValidStringArray(packet.tests)) {
    return { ok: false, reasonCode: "TESTS_INVALID" };
  }

  if (packet.files_changed !== undefined && !isValidStringArray(packet.files_changed)) {
    return { ok: false, reasonCode: "FILES_CHANGED_INVALID" };
  }

  return { ok: true };
};

export const validateVerificationPacket = (packet: unknown, expectedTaskId: string): LogicianResult => {
  if (!isRecord(packet)) {
    return { ok: false, reasonCode: "VERIFICATION_PACKET_INVALID" };
  }

  if (!isNonEmptyString(packet.taskId) || packet.taskId !== expectedTaskId) {
    return { ok: false, reasonCode: "TASK_ID_MISMATCH" };
  }

  if (typeof packet.passed !== "boolean") {
    return { ok: false, reasonCode: "VERIFICATION_PACKET_INVALID" };
  }

  return { ok: true };
};

export type { LogicianResult };
