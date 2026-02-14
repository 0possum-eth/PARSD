import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type SsotDocTemplate = {
  id: string;
  title: string;
  version: string;
  keywords: string[];
  roles: string[];
  body: string;
};

type SsotDoc = Omit<SsotDocTemplate, "body"> & {
  body: string;
};

type SsotSealedDoc = {
  schemaVersion: "arbiter.ssot.doc.v1";
  id: string;
  title: string;
  version: string;
  keywords: string[];
  roles: string[];
  salt: string;
  iv: string;
  authTag: string;
  cipherText: string;
  sha256: string;
};

type SsotManifestDoc = {
  id: string;
  title: string;
  version: string;
  keywords: string[];
  roles: string[];
  fileName: string;
  readableFileName: string;
  sha256: string;
};

type SsotManifest = {
  schemaVersion: "arbiter.ssot.protected.v1";
  createdAt: string;
  updatedAt: string;
  password: {
    salt: string;
    hash: string;
  };
  docs: SsotManifestDoc[];
};

type SsotPaths = {
  root: string;
  manifestPath: string;
  passwordPath: string;
};

type ApplySsotOptions = {
  cwd?: string;
  role?: string;
  password?: string;
  maxDocs?: number;
};

type ApplySsotResult = {
  scannedText: string;
  injectedDocIds: string[];
  purgedDuplicateCount: number;
};

type BuildTaskPacketSsotOptions = {
  cwd?: string;
  role?: string;
  query?: string;
  password?: string;
  maxDocs?: number;
};

const DEFAULT_MAX_DOCS = 3;
const SSOT_MARKER_PATTERN = /\[SSOT:([a-z0-9._-]+)@([^\]]+)\]/i;
const SSOT_DOC_FILE_EXT = ".ssot.json";
const SSOT_READABLE_FILE_EXT = ".ssot.md";

const DEFAULT_SSOT_DOCS: SsotDocTemplate[] = [
  {
    id: "arbiter-core",
    title: "Arbiter Core Operating Invariants",
    version: "2026.02.14",
    keywords: ["arbiter", "run-epic", "epic", "task", "workflow", "autopilot", "orchestration"],
    roles: ["arbiter", "executor", "scout", "ux-coordinator", "oracle", "verifier-spec", "verifier-quality"],
    body: [
      "Immutable rules:",
      "1. Use run-epic as canonical orchestration entrypoint.",
      "2. Enforce receipt-gated progression: executor + required verifier evidence before task_done.",
      "3. Ledger and derived views remain source-of-truth for state transitions."
    ].join("\n")
  },
  {
    id: "ledger-first",
    title: "Ledger-First State and Evidence Contract",
    version: "2026.02.14",
    keywords: ["ledger", "receipt", "evidence", "audit", "continuity", "verification", "state"],
    roles: ["arbiter", "executor", "oracle", "verifier-spec", "verifier-quality", "ledger-keeper"],
    body: [
      "Immutable rules:",
      "1. All critical execution and verification events must emit typed receipts.",
      "2. Claims of completion are invalid without ledger continuity and verifier evidence.",
      "3. Ledger-keeper owns writes to ledger/view paths; all other roles are read-only there."
    ].join("\n")
  },
  {
    id: "dao-governance",
    title: "DAO Coordination and Role Routing Contract",
    version: "2026.02.14",
    keywords: ["dao", "board", "roster", "assignment", "subagent", "role", "governance"],
    roles: ["arbiter", "scout", "executor", "ux-coordinator", "oracle", "verifier-spec", "verifier-quality"],
    body: [
      "Immutable rules:",
      "1. DAO mode routes work via roster, board, assignments, and wiring catalogs.",
      "2. Role turns should keep boundaries explicit: scout -> arbiter -> executor -> verifiers -> ledger.",
      "3. UX and integration checks are mandatory when task flags require them."
    ].join("\n")
  },
  {
    id: "resonant-guardrails",
    title: "Resonant Runtime Guardrails",
    version: "2026.02.14",
    keywords: ["resonant", "logician", "watchdog", "paranoia", "shield", "compression", "memory"],
    roles: ["arbiter", "executor", "oracle", "verifier-spec", "verifier-quality"],
    body: [
      "Immutable rules:",
      "1. Logician validates structured packets before acceptance.",
      "2. Watchdog detects timeout/loop behavior and retries within bounded restart policy.",
      "3. Shield treats external input as untrusted and blocks injection/exfiltration patterns."
    ].join("\n")
  }
];

const ROLE_BASE_DOC_IDS: Record<string, string[]> = {
  arbiter: ["arbiter-core", "dao-governance"],
  scout: ["arbiter-core", "dao-governance"],
  executor: ["arbiter-core", "ledger-first"],
  "ux-coordinator": ["arbiter-core", "dao-governance"],
  oracle: ["ledger-first", "resonant-guardrails"],
  "verifier-spec": ["ledger-first", "resonant-guardrails"],
  "verifier-quality": ["ledger-first", "resonant-guardrails"],
  "ledger-keeper": ["ledger-first"]
};

const normalizeRole = (role?: string) => (typeof role === "string" ? role.trim().toLowerCase() : "");

const resolveSsotPaths = (cwd: string): SsotPaths => {
  const root = path.join(cwd, "docs", "arbiter", "_ssot", "protected");
  return {
    root,
    manifestPath: path.join(root, "manifest.json"),
    passwordPath: path.join(root, ".ssot-password")
  };
};

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

const ensureDir = async (targetPath: string) => {
  await fs.promises.mkdir(targetPath, { recursive: true, mode: 0o700 });
};

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const versionParts = (value: string) => value.split(/[^0-9]+/).filter(Boolean).map((item) => Number.parseInt(item, 10));

const compareVersion = (left: string, right: string) => {
  const a = versionParts(left);
  const b = versionParts(right);
  if (a.length > 0 || b.length > 0) {
    const maxLength = Math.max(a.length, b.length);
    for (let index = 0; index < maxLength; index += 1) {
      const av = a[index] ?? 0;
      const bv = b[index] ?? 0;
      if (av !== bv) {
        return av - bv;
      }
    }
    return 0;
  }
  return left.localeCompare(right);
};

const toBufferHex = (value: Buffer) => value.toString("hex");

const passwordHash = (password: string, saltHex: string) => {
  const key = scryptSync(password, Buffer.from(saltHex, "hex"), 32);
  return key.toString("hex");
};

const deriveContentKey = (password: string, saltHex: string) =>
  scryptSync(password, Buffer.from(saltHex, "hex"), 32);

const encryptDocBody = (body: string, password: string) => {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveContentKey(password, toBufferHex(salt));
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    salt: toBufferHex(salt),
    iv: toBufferHex(iv),
    authTag: toBufferHex(authTag),
    cipherText: encrypted.toString("base64"),
    sha256: sha256(body)
  };
};

const decryptDocBody = (sealed: SsotSealedDoc, password: string) => {
  const key = deriveContentKey(password, sealed.salt);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "hex"));
  decipher.setAuthTag(Buffer.from(sealed.authTag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(sealed.cipherText, "base64")),
    decipher.final()
  ]);
  const body = decrypted.toString("utf8");
  if (sha256(body) !== sealed.sha256) {
    throw new Error(`SSOT_INTEGRITY_MISMATCH:${sealed.id}`);
  }
  return body;
};

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

const writeJson = async (filePath: string, value: unknown) => {
  await fs.promises.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const resolvePassword = async (paths: SsotPaths, explicitPassword?: string) => {
  const envPassword = typeof process.env.ARBITER_SSOT_PASSWORD === "string"
    ? process.env.ARBITER_SSOT_PASSWORD.trim()
    : "";
  const preferred = typeof explicitPassword === "string" ? explicitPassword.trim() : "";
  const selected = preferred || envPassword;
  if (selected.length > 0) {
    return selected;
  }

  try {
    const existing = await fs.promises.readFile(paths.passwordPath, "utf8");
    const normalized = existing.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const generated = randomBytes(24).toString("hex");
  await fs.promises.writeFile(paths.passwordPath, `${generated}\n`, { encoding: "utf8", mode: 0o600 });
  return generated;
};

const buildSealedDocPath = (paths: SsotPaths, id: string) => path.join(paths.root, `${id}${SSOT_DOC_FILE_EXT}`);

const ensureSsotStore = async (cwd: string, explicitPassword?: string): Promise<{ manifest: SsotManifest; password: string }> => {
  const paths = resolveSsotPaths(cwd);
  await ensureDir(paths.root);
  const password = await resolvePassword(paths, explicitPassword);
  const nowIso = new Date().toISOString();

  let manifest = await readJson<SsotManifest>(paths.manifestPath);
  if (!manifest) {
    const salt = randomBytes(16).toString("hex");
    manifest = {
      schemaVersion: "arbiter.ssot.protected.v1",
      createdAt: nowIso,
      updatedAt: nowIso,
      password: {
        salt,
        hash: passwordHash(password, salt)
      },
      docs: []
    };
  }

  if (manifest.schemaVersion !== "arbiter.ssot.protected.v1") {
    throw new Error("SSOT_MANIFEST_SCHEMA_UNSUPPORTED");
  }

  const expectedHash = passwordHash(password, manifest.password.salt);
  const rotatePassword = expectedHash !== manifest.password.hash;
  if (rotatePassword) {
    const nextSalt = randomBytes(16).toString("hex");
    manifest.password = {
      salt: nextSalt,
      hash: passwordHash(password, nextSalt)
    };
  }

  const docs: SsotManifestDoc[] = [];
  for (const template of DEFAULT_SSOT_DOCS) {
    const fileName = `${template.id}${SSOT_DOC_FILE_EXT}`;
    const readableFileName = `${template.id}${SSOT_READABLE_FILE_EXT}`;
    const docPath = path.join(paths.root, fileName);
    const readablePath = path.join(paths.root, readableFileName);
    const existing = await readJson<SsotSealedDoc>(docPath);
    const expectedBodyHash = sha256(template.body);
    const needsWrite =
      rotatePassword ||
      !existing ||
      existing.schemaVersion !== "arbiter.ssot.doc.v1" ||
      existing.version !== template.version ||
      existing.sha256 !== expectedBodyHash;

    if (needsWrite) {
      const encrypted = encryptDocBody(template.body, password);
      const sealed: SsotSealedDoc = {
        schemaVersion: "arbiter.ssot.doc.v1",
        id: template.id,
        title: template.title,
        version: template.version,
        keywords: template.keywords,
        roles: template.roles,
        ...encrypted
      };
      await writeJson(docPath, sealed);
    }

    const readableContent = [
      `# ${template.title}`,
      `ssot_id: ${template.id}`,
      `version: ${template.version}`,
      `keywords: ${template.keywords.join(", ")}`,
      `roles: ${template.roles.join(", ")}`,
      "",
      "This readable copy is governed by the protected SSoT manifest password gate.",
      "",
      template.body
    ].join("\n");
    await fs.promises.writeFile(readablePath, `${readableContent}\n`, { encoding: "utf8", mode: 0o600 });

    docs.push({
      id: template.id,
      title: template.title,
      version: template.version,
      keywords: template.keywords,
      roles: template.roles,
      fileName,
      readableFileName,
      sha256: expectedBodyHash
    });
  }

  manifest.docs = docs.sort((left, right) => left.id.localeCompare(right.id));
  manifest.updatedAt = nowIso;
  await writeJson(paths.manifestPath, manifest);
  return { manifest, password };
};

const readSsotDocs = async (cwd: string, password?: string): Promise<SsotDoc[]> => {
  const { manifest, password: resolvedPassword } = await ensureSsotStore(cwd, password);
  const paths = resolveSsotPaths(cwd);
  const docs: SsotDoc[] = [];

  for (const manifestDoc of manifest.docs) {
    const docPath = path.join(paths.root, manifestDoc.fileName);
    const sealed = await readJson<SsotSealedDoc>(docPath);
    if (!sealed || sealed.schemaVersion !== "arbiter.ssot.doc.v1") {
      continue;
    }
    const body = decryptDocBody(sealed, resolvedPassword);
    docs.push({
      id: sealed.id,
      title: sealed.title,
      version: sealed.version,
      keywords: [...sealed.keywords],
      roles: [...sealed.roles],
      body
    });
  }

  return docs.sort((left, right) => left.id.localeCompare(right.id));
};

const pickUserMessageStrings = (input: unknown): string[] => {
  if (!input || typeof input !== "object") {
    return [];
  }
  const record = input as Record<string, unknown>;
  const values: string[] = [];

  const fromMessage = (value: unknown) => {
    if (typeof value === "string") {
      const normalized = normalizeText(value);
      if (normalized.length > 0) {
        values.push(normalized);
      }
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    const row = value as Record<string, unknown>;
    const role = typeof row.role === "string" ? row.role.trim().toLowerCase() : "";
    if (role && role !== "user" && role !== "human" && role !== "requester") {
      return;
    }
    for (const key of ["content", "text", "message", "prompt", "query"]) {
      const candidate = row[key];
      if (typeof candidate === "string") {
        const normalized = normalizeText(candidate);
        if (normalized.length > 0) {
          values.push(normalized);
        }
      }
    }
  };

  for (const key of ["message", "prompt", "text", "query", "input", "userInput", "latestUserMessage"]) {
    const candidate = record[key];
    fromMessage(candidate);
  }

  const messageCollections: unknown[] = [];
  for (const key of ["messages", "chatHistory", "history", "conversation"]) {
    messageCollections.push(record[key]);
  }
  for (const collection of messageCollections) {
    if (!Array.isArray(collection)) {
      continue;
    }
    for (const row of collection) {
      fromMessage(row);
    }
  }

  return [...new Set(values)];
};

const scoreDocForInput = (doc: SsotDoc, text: string, normalizedRole: string): number => {
  const lowered = text.toLowerCase();
  let score = 0;
  for (const keyword of doc.keywords) {
    if (lowered.includes(keyword.toLowerCase())) {
      score += 2;
    }
  }
  if (normalizedRole.length > 0 && doc.roles.map((role) => role.toLowerCase()).includes(normalizedRole)) {
    score += 1;
  }
  return score;
};

const selectRelevantDocs = (
  docs: SsotDoc[],
  text: string,
  normalizedRole: string,
  maxDocs: number
): SsotDoc[] => {
  const baseIds = ROLE_BASE_DOC_IDS[normalizedRole] ?? [];
  const scored = docs
    .map((doc) => ({
      doc,
      score: scoreDocForInput(doc, text, normalizedRole),
      roleBase: baseIds.includes(doc.id)
    }))
    .filter((row) => row.score > 0 || row.roleBase)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      if (left.roleBase !== right.roleBase) {
        return left.roleBase ? -1 : 1;
      }
      return left.doc.id.localeCompare(right.doc.id);
    })
    .slice(0, Math.max(1, maxDocs));

  return scored.map((item) => item.doc);
};

const renderDoc = (doc: SsotDoc) => [
  `[SSOT:${doc.id}@${doc.version}]`,
  `# ${doc.title}`,
  doc.body,
  "[/SSOT]"
].join("\n");

const findMarker = (entry: string) => {
  const match = entry.match(SSOT_MARKER_PATTERN);
  if (!match) {
    return null;
  }
  return {
    id: match[1].toLowerCase(),
    version: match[2].trim()
  };
};

const dedupeExistingSsotEntries = (system: string[]) => {
  const latestById = new Map<string, { version: string; index: number }>();
  for (let index = 0; index < system.length; index += 1) {
    const marker = findMarker(system[index]);
    if (!marker) {
      continue;
    }
    const existing = latestById.get(marker.id);
    if (!existing || compareVersion(marker.version, existing.version) >= 0) {
      latestById.set(marker.id, { version: marker.version, index });
    }
  }

  let purged = 0;
  const deduped: string[] = [];
  for (let index = 0; index < system.length; index += 1) {
    const row = system[index];
    const marker = findMarker(row);
    if (!marker) {
      deduped.push(row);
      continue;
    }
    const latest = latestById.get(marker.id);
    if (latest && latest.index === index) {
      deduped.push(row);
    } else {
      purged += 1;
    }
  }
  return { deduped, purged };
};

const stripInjectedIds = (system: string[], ids: Set<string>) => {
  let purged = 0;
  const kept: string[] = [];
  for (const row of system) {
    const marker = findMarker(row);
    if (marker && ids.has(marker.id)) {
      purged += 1;
      continue;
    }
    kept.push(row);
  }
  return { kept, purged };
};

const applyDocsToSystem = (system: string[], docs: SsotDoc[]) => {
  if (docs.length === 0) {
    return { nextSystem: system, purged: 0 };
  }
  const ids = new Set(docs.map((doc) => doc.id));
  const stripped = stripInjectedIds(system, ids);
  const injected = docs.map((doc) => renderDoc(doc));
  return {
    nextSystem: [...stripped.kept, ...injected],
    purged: stripped.purged
  };
};

export async function applySsotSystemTransform(
  input: unknown,
  output: { system?: string[] },
  options: ApplySsotOptions = {}
): Promise<ApplySsotResult> {
  const cwd = options.cwd ?? process.cwd();
  const role = normalizeRole(options.role);
  const maxDocs = options.maxDocs ?? DEFAULT_MAX_DOCS;
  const system = Array.isArray(output.system) ? output.system : [];
  const dedupeResult = dedupeExistingSsotEntries(system);
  const userText = pickUserMessageStrings(input).join(" ");
  const docs = await readSsotDocs(cwd, options.password);
  const selected = selectRelevantDocs(docs, userText, role, maxDocs);
  const applied = applyDocsToSystem(dedupeResult.deduped, selected);

  output.system = applied.nextSystem;
  return {
    scannedText: userText,
    injectedDocIds: selected.map((doc) => doc.id),
    purgedDuplicateCount: dedupeResult.purged + applied.purged
  };
}

export async function buildSsotAppendixForTaskPacket(
  options: BuildTaskPacketSsotOptions = {}
): Promise<string> {
  const cwd = options.cwd ?? process.cwd();
  const role = normalizeRole(options.role);
  const query = typeof options.query === "string" ? options.query : "";
  const docs = await readSsotDocs(cwd, options.password);
  const selected = selectRelevantDocs(docs, query, role, options.maxDocs ?? DEFAULT_MAX_DOCS);
  if (selected.length === 0) {
    return "";
  }

  return ["## SSoT Injection", ...selected.map((doc) => renderDoc(doc))].join("\n\n");
}

export type { ApplySsotOptions, ApplySsotResult, BuildTaskPacketSsotOptions };
