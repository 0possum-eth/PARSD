import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const WORKSPACE_KEYS = new Set([
  "directory",
  "cwd",
  "workspace",
  "workspacePath",
  "projectRoot",
  "root"
]);

const moduleCache = new Map();
let warnedFallback = false;

const warnFallback = (message) => {
  if (warnedFallback) {
    return;
  }
  warnedFallback = true;
  // eslint-disable-next-line no-console
  console.warn(`[arbiter-os] ${message}`);
};

const normalizeDocPath = (docPath) => docPath.trim().replace(/\\/g, "/");

const toMountedDoc = (value) => {
  if (typeof value === "string") {
    return { path: value };
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const pathValue = [value.packPath, value.path, value.docPath, value.doc, value.contextDoc].find(
    (item) => typeof item === "string"
  );
  if (typeof pathValue !== "string") {
    return null;
  }
  const sourcePath = [value.sourcePath, value.sourceDocPath].find(
    (item) => typeof item === "string"
  );
  return typeof sourcePath === "string" ? { path: pathValue, sourcePath } : { path: pathValue };
};

const extractMountedDocs = (input) => {
  const args = input?.args;
  if (!args) return [];
  const docs = [];
  const singleValues = [args.doc, args.docPath, args.contextDoc];
  for (const value of singleValues) {
    const doc = toMountedDoc(value);
    if (doc) docs.push(doc);
  }
  if (Array.isArray(args.docs)) docs.push(...args.docs.map((item) => toMountedDoc(item)).filter(Boolean));
  if (Array.isArray(args.docPaths)) {
    docs.push(...args.docPaths.map((item) => toMountedDoc(item)).filter(Boolean));
  }
  if (Array.isArray(args.mountedDocs)) {
    docs.push(...args.mountedDocs.map((item) => toMountedDoc(item)).filter(Boolean));
  }
  if (Array.isArray(args.contextDocs)) {
    docs.push(...args.contextDocs.map((item) => toMountedDoc(item)).filter(Boolean));
  }
  if (Array.isArray(args.mounts)) {
    docs.push(...args.mounts.map((item) => toMountedDoc(item)).filter(Boolean));
  }
  return docs;
};

const isPathLike = (value) =>
  typeof value === "string" &&
  value.startsWith("/") &&
  !value.includes("\n") &&
  value.length > 1;

const collectWorkspaceHints = (value, out, depth = 0) => {
  if (depth > 5 || value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    if (isPathLike(value)) {
      out.add(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectWorkspaceHints(item, out, depth + 1);
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (WORKSPACE_KEYS.has(key) && isPathLike(nested)) {
      out.add(nested);
    }
    collectWorkspaceHints(nested, out, depth + 1);
  }
};

const resolveWorkspaceRoots = (hintInput) => {
  const roots = new Set();
  const envCandidates = [
    process.env.ARBITER_WORKSPACE_PATH,
    process.env.OPENCODE_WORKSPACE,
    process.env.PWD,
    process.cwd()
  ];
  for (const candidate of envCandidates) {
    if (isPathLike(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      roots.add(candidate);
    }
  }

  const hints = new Set();
  collectWorkspaceHints(hintInput, hints);
  for (const candidate of hints) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      roots.add(candidate);
    }
  }

  return [...roots];
};

const importFromWorkspace = async (workspaceRoot, relPath) => {
  const candidates = [
    path.join(workspaceRoot, relPath),
    path.join(workspaceRoot, `${relPath}.ts`),
    path.join(workspaceRoot, `${relPath}.js`),
    path.join(workspaceRoot, relPath, "index.ts"),
    path.join(workspaceRoot, relPath, "index.js")
  ];

  let lastError;
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }
    try {
      return await import(pathToFileURL(candidate).href);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error(`MODULE_NOT_FOUND:${relPath}`);
};

const fallbackDeps = {
  workspaceRoot: process.cwd(),
  loadedCount: 0,
  getRoleFromEnv: () => "",
  evaluateRolePolicy: () => ({ allowed: true }),
  extractToolTargets: () => [],
  isTrusted: async () => true,
  classifyBrick: (targetPath) =>
    /(^|\/)(reference|knowledge)(\/|$)/i.test(String(targetPath)) ? "knowledge" : "behavior",
  canMountForExecution: (_targetPath, trusted) => trusted === true,
  buildCompactionSummary: async () => "memory summary unavailable",
  runM2Agent: async () => ({
    ingestedCount: 0,
    compressedAddedCount: 0,
    rawZoneCount: 0,
    compressedZoneCount: 0,
    rawZoneTokenEstimate: 0
  }),
  assertShieldSafe: () => {},
  applySsotSystemTransform: async () => {}
};

const loadFunction = async (workspaceRoot, relPath, exportName, fallbackFn) => {
  try {
    const mod = await importFromWorkspace(workspaceRoot, relPath);
    const fn = mod?.[exportName];
    if (typeof fn === "function") {
      return { fn, loaded: true };
    }
  } catch {
    // Fall through to fallback.
  }
  return { fn: fallbackFn, loaded: false };
};

const loadDepsForWorkspace = async (workspaceRoot) => {
  const [
    roleContext,
    rolePolicy,
    toolTargets,
    trustCommands,
    trustPolicyClassify,
    trustPolicyMount,
    compactSummary,
    m2Agent,
    shield,
    ssot
  ] = await Promise.all([
    loadFunction(workspaceRoot, "arbiter/policy/roleContext", "getRoleFromEnv", fallbackDeps.getRoleFromEnv),
    loadFunction(workspaceRoot, "arbiter/policy/rolePolicy", "evaluateRolePolicy", fallbackDeps.evaluateRolePolicy),
    loadFunction(workspaceRoot, "arbiter/policy/toolTargets", "extractToolTargets", fallbackDeps.extractToolTargets),
    loadFunction(workspaceRoot, "arbiter/trust/commands", "isTrusted", fallbackDeps.isTrusted),
    loadFunction(workspaceRoot, "arbiter/trust/policy", "classifyBrick", fallbackDeps.classifyBrick),
    loadFunction(workspaceRoot, "arbiter/trust/policy", "canMountForExecution", fallbackDeps.canMountForExecution),
    loadFunction(
      workspaceRoot,
      "arbiter/memory/compactSummary",
      "buildCompactionSummary",
      fallbackDeps.buildCompactionSummary
    ),
    loadFunction(workspaceRoot, "arbiter/memory/m2Agent", "runM2Agent", fallbackDeps.runM2Agent),
    loadFunction(workspaceRoot, "arbiter/resonant/shield", "assertShieldSafe", fallbackDeps.assertShieldSafe),
    loadFunction(
      workspaceRoot,
      "arbiter/resonant/ssot",
      "applySsotSystemTransform",
      fallbackDeps.applySsotSystemTransform
    )
  ]);

  const loadedCount = [
    roleContext,
    rolePolicy,
    toolTargets,
    trustCommands,
    trustPolicyClassify,
    trustPolicyMount,
    compactSummary,
    m2Agent,
    shield,
    ssot
  ].filter((item) => item.loaded).length;

  return {
    workspaceRoot,
    loadedCount,
    getRoleFromEnv: roleContext.fn,
    evaluateRolePolicy: rolePolicy.fn,
    extractToolTargets: toolTargets.fn,
    isTrusted: trustCommands.fn,
    classifyBrick: trustPolicyClassify.fn,
    canMountForExecution: trustPolicyMount.fn,
    buildCompactionSummary: compactSummary.fn,
    runM2Agent: m2Agent.fn,
    assertShieldSafe: shield.fn,
    applySsotSystemTransform: ssot.fn
  };
};

const resolveDeps = async (hintInput) => {
  const roots = resolveWorkspaceRoots(hintInput);
  if (roots.length === 0) {
    warnFallback("no workspace roots discovered; running fallback no-op guardrails");
    return fallbackDeps;
  }

  const loaded = [];
  for (const root of roots) {
    if (!moduleCache.has(root)) {
      moduleCache.set(root, loadDepsForWorkspace(root));
    }
    loaded.push(await moduleCache.get(root));
  }

  loaded.sort((left, right) => right.loadedCount - left.loadedCount);
  const best = loaded[0];
  if (!best || best.loadedCount === 0) {
    warnFallback("workspace modules not found; running fallback no-op guardrails");
    return {
      ...fallbackDeps,
      workspaceRoot: roots[0]
    };
  }
  return best;
};

const isEpicIncomplete = (workspaceRoot) => {
  const prdPath = path.join(workspaceRoot || process.cwd(), "docs", "arbiter", "prd.json");
  if (!fs.existsSync(prdPath)) return false;
  try {
    const raw = fs.readFileSync(prdPath, "utf8");
    const state = JSON.parse(raw);
    const epics = Array.isArray(state.epics) ? state.epics : [];
    if (!state.activeEpicId) return false;
    const active = epics.find((epic) => epic.id === state.activeEpicId);
    return active && active.done !== true;
  } catch {
    return true;
  }
};

const runM2WithFallback = async (deps) => {
  try {
    return await deps.runM2Agent({ cwd: deps.workspaceRoot });
  } catch {
    return deps.runM2Agent();
  }
};

const runSummaryWithFallback = async (deps) => {
  try {
    return await deps.buildCompactionSummary({
      now: process.env.ARBITER_MEMORY_POLICY_NOW,
      cwd: deps.workspaceRoot
    });
  } catch {
    return deps.buildCompactionSummary({
      now: process.env.ARBITER_MEMORY_POLICY_NOW
    });
  }
};

export const ArbiterOsPlugin = async () => ({
  "experimental.chat.system.transform": async (input, output) => {
    (output.system ||= []).push(
      "You are running Arbiter OS. Use run-epic as the canonical entrypoint."
    );

    const deps = await resolveDeps(input);
    try {
      await deps.applySsotSystemTransform(input, output, {
        role: deps.getRoleFromEnv(),
        cwd: deps.workspaceRoot
      });
    } catch {
      // Keep transforms resilient even if SSoT storage or decrypt fails.
    }
  },
  "tool.execute.before": async (input) => {
    const deps = await resolveDeps(input);

    try {
      deps.assertShieldSafe({
        toolName: input?.name,
        args: input?.args
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("PARANOIA_MODE_BLOCKED:")) {
        throw new Error(`Paranoia mode blocked: ${error.message.slice("PARANOIA_MODE_BLOCKED:".length)}`);
      }
      throw error;
    }

    let targets = [];
    let targetExtractionError;
    try {
      targets = deps.extractToolTargets(input?.name, input?.args);
    } catch (error) {
      targetExtractionError = error instanceof Error ? error.message : "Target extraction failed";
    }
    const role = deps.getRoleFromEnv();
    const roleDecision = deps.evaluateRolePolicy({
      role,
      toolName: input?.name,
      targets,
      targetExtractionError
    });
    if (!roleDecision.allowed) {
      throw new Error(roleDecision.reason || "Role policy denied tool execution");
    }

    const mountedDocs = extractMountedDocs(input);
    if (mountedDocs.length > 0) {
      const blocked = [];
      for (const mountedDoc of mountedDocs) {
        const policyPath = normalizeDocPath(mountedDoc.sourcePath ?? mountedDoc.path);
        const trusted = await deps.isTrusted(policyPath);
        const brickType = deps.classifyBrick(policyPath);
        const allowed =
          brickType === "knowledge" ? true : deps.canMountForExecution(policyPath, trusted);
        if (!allowed) {
          blocked.push(mountedDoc.path);
        }
      }
      if (blocked.length > 0) {
        throw new Error(`Untrusted docs mounted: ${blocked.join(", ")}`);
      }
    }
  },
  "experimental.session.compacting": async (input) => {
    const deps = await resolveDeps(input);

    return {
      summary: await (async () => {
        let m2Summary = "";
        try {
          const m2 = await runM2WithFallback(deps);
          m2Summary = ` | m2 raw:${m2.rawZoneCount} compressed:${m2.compressedZoneCount} ingested:${m2.ingestedCount}`;
        } catch (error) {
          const detail = error instanceof Error ? error.message : "unknown m2 error";
          m2Summary = ` | m2 error:${detail}`;
        }

        const memorySummary = await runSummaryWithFallback(deps);
        return `${memorySummary}${m2Summary}`;
      })()
    };
  },
  stop: async (input) => {
    const deps = await resolveDeps(input);
    if (isEpicIncomplete(deps.workspaceRoot)) {
      throw new Error("Epic incomplete: cannot stop");
    }
    return { reason: "Arbiter OS stop hook enabled" };
  }
});
