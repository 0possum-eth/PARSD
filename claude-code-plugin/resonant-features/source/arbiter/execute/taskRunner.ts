import { buildTaskPacket } from "./taskPacket";
import { executeTaskStrategy } from "./executeTaskStrategy";
import { emitReceipt } from "../receipts/emitReceipt";
import { runElectrician } from "../phases/electrician";
import { runOracle } from "../phases/oracle";
import { runUxCoordinator } from "../phases/uxCoordinator";
import { verifySpec } from "../verify/specVerifier";
import { verifyQuality } from "../verify/qualityVerifier";
import type { TaskCompletionPacket, VerificationPacket } from "../contracts/packets";
import type { ReceiptPayload, ResonantGuardrailEventReceipt } from "../receipts/types";
import { normalizeStrategyCommands, type StrategyCommand, type TaskPacket } from "./taskPacket";
import { validateTaskCompletionPacket, validateVerificationPacket } from "../resonant/logician";
import { assertShieldSafe } from "../resonant/shield";
import { WatchdogError, runWithWatchdog } from "../resonant/watchdog";

export type TaskExecutionResult =
  | { type: "TASK_DONE" }
  | { type: "HALT_AND_ASK"; reason: string };

type TaskRecord = {
  id?: string;
  query?: string;
  noop?: boolean;
  requiresIntegrationCheck?: boolean;
  uxSensitive?: boolean;
  requiresOracleReview?: boolean;
  strategyCommands?: StrategyCommand[];
};

export type RunTaskDependencies = {
  buildTaskPacket: (task: TaskRecord) => Promise<TaskPacket>;
  executeTaskStrategy: (packet: TaskPacket) => Promise<TaskCompletionPacket>;
  verifySpec: (packet: TaskPacket, completionPacket: TaskCompletionPacket) => Promise<VerificationPacket>;
  verifyQuality: (packet: TaskPacket, completionPacket: TaskCompletionPacket) => Promise<VerificationPacket>;
  runElectrician: (packet: TaskPacket) => Promise<void>;
  runUxCoordinator: (packet: TaskPacket) => Promise<void>;
  runOracle: (packet: TaskPacket) => Promise<void>;
  emitReceipt: (receipt: ReceiptPayload) => Promise<void>;
};

const defaultRunTaskDependencies: RunTaskDependencies = {
  buildTaskPacket,
  executeTaskStrategy,
  verifySpec,
  verifyQuality,
  runElectrician,
  runUxCoordinator,
  runOracle,
  emitReceipt
};

const normalizeTaskRecord = (task: Record<string, unknown>): TaskRecord => ({
  id: typeof task.id === "string" ? task.id : undefined,
  query: typeof task.query === "string" ? task.query : undefined,
  noop: task.noop === true,
  requiresIntegrationCheck: task.requiresIntegrationCheck === true,
  uxSensitive: task.uxSensitive === true,
  requiresOracleReview: task.requiresOracleReview === true,
  strategyCommands: normalizeStrategyCommands(task.strategyCommands)
});

const toParanoiaReason = (error: unknown): string => {
  if (error instanceof Error && error.message.startsWith("PARANOIA_MODE_BLOCKED:")) {
    return error.message;
  }
  return "PARANOIA_MODE_BLOCKED:UNKNOWN";
};

const extractReasonCode = (reason: string, prefix: string): string => {
  const marker = `${prefix}:`;
  if (!reason.startsWith(marker)) {
    return "UNKNOWN";
  }
  const code = reason.slice(marker.length).trim();
  return code.length > 0 ? code : "UNKNOWN";
};

const toWatchdogReason = (error: unknown, phase: string): { reason: string; reasonCode: string } | null => {
  if (!(error instanceof WatchdogError)) {
    return null;
  }
  if (error.code === "WATCHDOG_RESTART_FAILED") {
    return { reason: `WATCHDOG_RESTART_FAILED:${phase}`, reasonCode: "WATCHDOG_RESTART_FAILED" };
  }
  return { reason: `WATCHDOG_TIMEOUT:${phase}`, reasonCode: "WATCHDOG_TIMEOUT" };
};

export async function runTask(
  task: Record<string, unknown>,
  dependencies: Partial<RunTaskDependencies> = {}
): Promise<TaskExecutionResult> {
  const runtimeTask = normalizeTaskRecord(task);

  const deps: RunTaskDependencies = {
    ...defaultRunTaskDependencies,
    ...dependencies
  };
  const emitGuardrailEvent = async (
    event: Omit<ResonantGuardrailEventReceipt, "type"> & { taskId?: string }
  ): Promise<void> => {
    await deps.emitReceipt({
      type: "RESONANT_GUARDRAIL_EVENT",
      ...event,
      taskId: event.taskId ?? runtimeTask.id
    });
  };

  try {
    assertShieldSafe(task);
  } catch (error) {
    const reason = toParanoiaReason(error);
    await emitGuardrailEvent({
      module: "shield",
      stage: "task_input",
      outcome: "blocked",
      reasonCode: extractReasonCode(reason, "PARANOIA_MODE_BLOCKED"),
      detail: reason
    });
    return { type: "HALT_AND_ASK", reason };
  }

  if (runtimeTask.noop === true) {
    return { type: "TASK_DONE" };
  }

  let packet: TaskPacket;
  try {
    packet = await runWithWatchdog("build-task-packet", () => deps.buildTaskPacket(runtimeTask), {
      onRestart: async ({ attempt, error }) => {
        await emitGuardrailEvent({
          module: "watchdog",
          stage: "build_task_packet",
          outcome: "restart",
          reasonCode: error.code,
          detail: error.message,
          attempt
        });
      }
    });
  } catch (error) {
    const watchdogReason = toWatchdogReason(error, "BUILD_TASK_PACKET");
    if (watchdogReason) {
      await emitGuardrailEvent({
        module: "watchdog",
        stage: "build_task_packet",
        outcome: watchdogReason.reasonCode === "WATCHDOG_TIMEOUT" ? "timeout" : "failed",
        reasonCode: watchdogReason.reasonCode,
        detail: watchdogReason.reason
      });
      return { type: "HALT_AND_ASK", reason: watchdogReason.reason };
    }
    const message = error instanceof Error ? error.message.trim() : "packet build error";
    const detail = message.length > 60 ? `${message.slice(0, 60)}...` : message;
    return { type: "HALT_AND_ASK", reason: `TASK_PACKET_BUILD_FAILED: ${detail}` };
  }
  if (packet.taskId === "UNKNOWN_TASK") {
    return { type: "HALT_AND_ASK", reason: "TASK_ID_MISSING" };
  }

  if (packet.citations.length === 0) {
    return { type: "HALT_AND_ASK", reason: "CONTEXT_PACK_REQUIRED" };
  }

  try {
    assertShieldSafe({
      taskId: packet.taskId,
      query: packet.query,
      contextPack: packet.contextPack,
      citations: packet.citations,
      strategyCommands: packet.strategyCommands
    });
  } catch (error) {
    const reason = toParanoiaReason(error);
    await emitGuardrailEvent({
      module: "shield",
      stage: "context_packet",
      outcome: "blocked",
      reasonCode: extractReasonCode(reason, "PARANOIA_MODE_BLOCKED"),
      detail: reason,
      taskId: packet.taskId
    });
    return { type: "HALT_AND_ASK", reason };
  }

  let completionPacket: TaskCompletionPacket;
  try {
    completionPacket = await runWithWatchdog("execute-task-strategy", () => deps.executeTaskStrategy(packet), {
      onRestart: async ({ attempt, error }) => {
        await emitGuardrailEvent({
          module: "watchdog",
          stage: "strategy_execution",
          outcome: "restart",
          reasonCode: error.code,
          detail: error.message,
          taskId: packet.taskId,
          attempt
        });
      }
    });
  } catch (error) {
    const watchdogReason = toWatchdogReason(error, "STRATEGY_EXECUTION");
    if (watchdogReason) {
      await emitGuardrailEvent({
        module: "watchdog",
        stage: "strategy_execution",
        outcome: watchdogReason.reasonCode === "WATCHDOG_TIMEOUT" ? "timeout" : "failed",
        reasonCode: watchdogReason.reasonCode,
        detail: watchdogReason.reason,
        taskId: packet.taskId
      });
      return { type: "HALT_AND_ASK", reason: watchdogReason.reason };
    }
    const message = error instanceof Error ? error.message.trim() : "strategy error";
    const detail = message.length > 60 ? `${message.slice(0, 60)}...` : message;
    return { type: "HALT_AND_ASK", reason: `TASK_STRATEGY_FAILED: ${detail}` };
  }

  const completionValidation = validateTaskCompletionPacket(completionPacket, packet.taskId);
  if (!completionValidation.ok) {
    await emitGuardrailEvent({
      module: "logician",
      stage: "executor_packet",
      outcome: "rejected",
      reasonCode: completionValidation.reasonCode,
      taskId: packet.taskId
    });
    return {
      type: "HALT_AND_ASK",
      reason: `LOGICIAN_EXECUTOR_PACKET_INVALID:${completionValidation.reasonCode}`
    };
  }

  await deps.emitReceipt({
    type: "EXECUTOR_COMPLETED",
    taskId: packet.taskId,
    packet: completionPacket
  });

  let specPacket: VerificationPacket;
  try {
    specPacket = await runWithWatchdog("verify-spec", () => deps.verifySpec(packet, completionPacket), {
      onRestart: async ({ attempt, error }) => {
        await emitGuardrailEvent({
          module: "watchdog",
          stage: "verify_spec",
          outcome: "restart",
          reasonCode: error.code,
          detail: error.message,
          taskId: packet.taskId,
          attempt
        });
      }
    });
  } catch (error) {
    const watchdogReason = toWatchdogReason(error, "VERIFY_SPEC");
    if (watchdogReason) {
      await emitGuardrailEvent({
        module: "watchdog",
        stage: "verify_spec",
        outcome: watchdogReason.reasonCode === "WATCHDOG_TIMEOUT" ? "timeout" : "failed",
        reasonCode: watchdogReason.reasonCode,
        detail: watchdogReason.reason,
        taskId: packet.taskId
      });
      return { type: "HALT_AND_ASK", reason: watchdogReason.reason };
    }
    const message = error instanceof Error ? error.message.trim() : "spec verifier error";
    const detail = message.length > 60 ? `${message.slice(0, 60)}...` : message;
    return { type: "HALT_AND_ASK", reason: `SPEC_VERIFICATION_FAILED: ${detail}` };
  }

  const specValidation = validateVerificationPacket(specPacket, packet.taskId);
  if (!specValidation.ok) {
    await emitGuardrailEvent({
      module: "logician",
      stage: "spec_packet",
      outcome: "rejected",
      reasonCode: specValidation.reasonCode,
      taskId: packet.taskId
    });
    if (specValidation.reasonCode === "TASK_ID_MISMATCH") {
      return {
        type: "HALT_AND_ASK",
        reason: "SPEC_VERIFICATION_FAILED"
      };
    }
    return {
      type: "HALT_AND_ASK",
      reason: `LOGICIAN_VERIFIER_PACKET_INVALID:${specValidation.reasonCode}`
    };
  }

  await deps.emitReceipt({
    type: "VERIFIER_SPEC",
    taskId: packet.taskId,
    passed: specPacket.passed,
    packet: specPacket
  });
  if (specPacket.taskId !== packet.taskId || specPacket.passed !== true) {
    return {
      type: "HALT_AND_ASK",
      reason: "SPEC_VERIFICATION_FAILED"
    };
  }

  let qualityPacket: VerificationPacket;
  try {
    qualityPacket = await runWithWatchdog("verify-quality", () => deps.verifyQuality(packet, completionPacket), {
      onRestart: async ({ attempt, error }) => {
        await emitGuardrailEvent({
          module: "watchdog",
          stage: "verify_quality",
          outcome: "restart",
          reasonCode: error.code,
          detail: error.message,
          taskId: packet.taskId,
          attempt
        });
      }
    });
  } catch (error) {
    const watchdogReason = toWatchdogReason(error, "VERIFY_QUALITY");
    if (watchdogReason) {
      await emitGuardrailEvent({
        module: "watchdog",
        stage: "verify_quality",
        outcome: watchdogReason.reasonCode === "WATCHDOG_TIMEOUT" ? "timeout" : "failed",
        reasonCode: watchdogReason.reasonCode,
        detail: watchdogReason.reason,
        taskId: packet.taskId
      });
      return { type: "HALT_AND_ASK", reason: watchdogReason.reason };
    }
    const message = error instanceof Error ? error.message.trim() : "quality verifier error";
    const detail = message.length > 60 ? `${message.slice(0, 60)}...` : message;
    return { type: "HALT_AND_ASK", reason: `QUALITY_VERIFICATION_FAILED: ${detail}` };
  }

  const qualityValidation = validateVerificationPacket(qualityPacket, packet.taskId);
  if (!qualityValidation.ok) {
    await emitGuardrailEvent({
      module: "logician",
      stage: "quality_packet",
      outcome: "rejected",
      reasonCode: qualityValidation.reasonCode,
      taskId: packet.taskId
    });
    if (qualityValidation.reasonCode === "TASK_ID_MISMATCH") {
      return {
        type: "HALT_AND_ASK",
        reason: "QUALITY_VERIFICATION_FAILED"
      };
    }
    return {
      type: "HALT_AND_ASK",
      reason: `LOGICIAN_VERIFIER_PACKET_INVALID:${qualityValidation.reasonCode}`
    };
  }

  await deps.emitReceipt({
    type: "VERIFIER_QUALITY",
    taskId: packet.taskId,
    passed: qualityPacket.passed,
    packet: qualityPacket
  });
  if (qualityPacket.taskId !== packet.taskId || qualityPacket.passed !== true) {
    return {
      type: "HALT_AND_ASK",
      reason: "QUALITY_VERIFICATION_FAILED"
    };
  }

  if (runtimeTask.requiresIntegrationCheck === true) {
    try {
      await runWithWatchdog("run-electrician", () => deps.runElectrician(packet), {
        onRestart: async ({ attempt, error }) => {
          await emitGuardrailEvent({
            module: "watchdog",
            stage: "integration_check",
            outcome: "restart",
            reasonCode: error.code,
            detail: error.message,
            taskId: packet.taskId,
            attempt
          });
        }
      });
    } catch (error) {
      const watchdogReason = toWatchdogReason(error, "INTEGRATION_CHECK");
      if (watchdogReason) {
        await emitGuardrailEvent({
          module: "watchdog",
          stage: "integration_check",
          outcome: watchdogReason.reasonCode === "WATCHDOG_TIMEOUT" ? "timeout" : "failed",
          reasonCode: watchdogReason.reasonCode,
          detail: watchdogReason.reason,
          taskId: packet.taskId
        });
        return { type: "HALT_AND_ASK", reason: watchdogReason.reason };
      }
      const message = error instanceof Error ? error.message.trim() : "integration check error";
      const detail = message.length > 60 ? `${message.slice(0, 60)}...` : message;
      return { type: "HALT_AND_ASK", reason: `INTEGRATION_CHECK_FAILED: ${detail}` };
    }
  }

  if (runtimeTask.uxSensitive === true) {
    try {
      await runWithWatchdog("run-ux-coordinator", () => deps.runUxCoordinator(packet), {
        onRestart: async ({ attempt, error }) => {
          await emitGuardrailEvent({
            module: "watchdog",
            stage: "ux_simulation",
            outcome: "restart",
            reasonCode: error.code,
            detail: error.message,
            taskId: packet.taskId,
            attempt
          });
        }
      });
    } catch (error) {
      const watchdogReason = toWatchdogReason(error, "UX_SIMULATION");
      if (watchdogReason) {
        await emitGuardrailEvent({
          module: "watchdog",
          stage: "ux_simulation",
          outcome: watchdogReason.reasonCode === "WATCHDOG_TIMEOUT" ? "timeout" : "failed",
          reasonCode: watchdogReason.reasonCode,
          detail: watchdogReason.reason,
          taskId: packet.taskId
        });
        return { type: "HALT_AND_ASK", reason: watchdogReason.reason };
      }
      const message = error instanceof Error ? error.message.trim() : "ux simulation error";
      const detail = message.length > 60 ? `${message.slice(0, 60)}...` : message;
      return { type: "HALT_AND_ASK", reason: `UX_SIMULATION_FAILED: ${detail}` };
    }
  }

  if (runtimeTask.requiresOracleReview === true) {
    try {
      await runWithWatchdog("run-oracle", () => deps.runOracle(packet), {
        onRestart: async ({ attempt, error }) => {
          await emitGuardrailEvent({
            module: "watchdog",
            stage: "oracle_review",
            outcome: "restart",
            reasonCode: error.code,
            detail: error.message,
            taskId: packet.taskId,
            attempt
          });
        }
      });
    } catch (error) {
      const watchdogReason = toWatchdogReason(error, "ORACLE_REVIEW");
      if (watchdogReason) {
        await emitGuardrailEvent({
          module: "watchdog",
          stage: "oracle_review",
          outcome: watchdogReason.reasonCode === "WATCHDOG_TIMEOUT" ? "timeout" : "failed",
          reasonCode: watchdogReason.reasonCode,
          detail: watchdogReason.reason,
          taskId: packet.taskId
        });
        return { type: "HALT_AND_ASK", reason: watchdogReason.reason };
      }
      const message = error instanceof Error ? error.message.trim() : "oracle review error";
      const detail = message.length > 60 ? `${message.slice(0, 60)}...` : message;
      return { type: "HALT_AND_ASK", reason: `ORACLE_REVIEW_FAILED: ${detail}` };
    }
  }

  return { type: "TASK_DONE" };
}
