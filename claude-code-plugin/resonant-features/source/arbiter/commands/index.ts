import { runEpic } from "./runEpic";
import { approveBrick } from "./approveBrick";
import { mountDoc } from "./mountDoc";
import { listBricks } from "./listBricks";
import { arbiterStatus } from "./status";
import { workflowMode } from "./workflowMode";
import { runEpicWithSupervisor } from "./runEpicSupervised";
import { runM2AgentCommand } from "./runM2Agent";

export const arbiterCommands = {
  "arbiter-status": arbiterStatus,
  "run-m2-agent": runM2AgentCommand,
  "run-epic": runEpic,
  "run-epic-supervised": runEpicWithSupervisor,
  "approve-brick": approveBrick,
  "mount-doc": mountDoc,
  "list-bricks": listBricks,
  "workflow-mode": workflowMode
};
