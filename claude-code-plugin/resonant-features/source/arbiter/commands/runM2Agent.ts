import { runM2Agent } from "../memory/m2Agent";

type RunM2AgentOptions = {
  rawTokenBudget?: number;
};

export async function runM2AgentCommand(options: RunM2AgentOptions = {}) {
  return runM2Agent({
    rawTokenBudget: options.rawTokenBudget
  });
}
