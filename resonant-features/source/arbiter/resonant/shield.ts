type ShieldReasonCode =
  | "PROMPT_INJECTION_PATTERN"
  | "DATA_EXFIL_PATTERN"
  | "PATH_TRAVERSAL_PATTERN"
  | "COMMAND_INJECTION_PATTERN";

type ShieldMatch = {
  reasonCode: ShieldReasonCode;
  path: string;
  snippet: string;
};

type ShieldVerdict = {
  blocked: boolean;
  reasonCode?: ShieldReasonCode;
  matches: ShieldMatch[];
};

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?\b/i,
  /\boverride\s+(?:the\s+)?(?:system|safety|developer)\s+instructions?\b/i,
  /\breveal\s+(?:the\s+)?system\s+prompt\b/i,
  /\bdisclose\s+(?:the\s+)?(?:hidden|internal)\s+(?:system|developer)\s+(?:prompt|message)s?\b/i
];

const DATA_EXFIL_PATTERNS: RegExp[] = [
  /\b(?:exfiltrate|leak|steal|dump|upload|send)\b.{0,64}\b(?:api[_\s-]?keys?|secrets?|tokens?|passwords?|private\s+keys?|ssh\s+keys?|\.env)\b/i,
  /\b(?:api[_\s-]?keys?|secrets?|tokens?|passwords?|private\s+keys?|ssh\s+keys?|\.env)\b.{0,64}\b(?:exfiltrate|leak|steal|dump|upload|send)\b/i
];

const PATH_TRAVERSAL_PATTERN = /(?:\.\.\/|\.\.\\)/;
const COMMAND_INJECTION_PATTERN = /(?:`[^`]+`|\$\([^)]+\)|;\s*(?:curl|wget|nc|bash|sh)\b)/i;

const SNIPPET_LIMIT = 160;

const toSnippet = (value: string) =>
  value.length <= SNIPPET_LIMIT ? value : `${value.slice(0, SNIPPET_LIMIT - 3)}...`;

const walkStrings = (
  value: unknown,
  path: string,
  out: Array<{ path: string; value: string }>,
  depth: number
) => {
  if (depth > 8) {
    return;
  }
  if (typeof value === "string") {
    out.push({ path, value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, `${path}[${index}]`, out, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    walkStrings(nested, `${path}.${key}`, out, depth + 1);
  }
};

const findMatch = (path: string, value: string): ShieldMatch | null => {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return {
        reasonCode: "PROMPT_INJECTION_PATTERN",
        path,
        snippet: toSnippet(value)
      };
    }
  }

  for (const pattern of DATA_EXFIL_PATTERNS) {
    if (pattern.test(value)) {
      return {
        reasonCode: "DATA_EXFIL_PATTERN",
        path,
        snippet: toSnippet(value)
      };
    }
  }

  if (PATH_TRAVERSAL_PATTERN.test(value)) {
    return {
      reasonCode: "PATH_TRAVERSAL_PATTERN",
      path,
      snippet: toSnippet(value)
    };
  }

  if (COMMAND_INJECTION_PATTERN.test(value)) {
    return {
      reasonCode: "COMMAND_INJECTION_PATTERN",
      path,
      snippet: toSnippet(value)
    };
  }

  return null;
};

export const scanUntrustedInput = (input: unknown): ShieldVerdict => {
  const strings: Array<{ path: string; value: string }> = [];
  walkStrings(input, "$", strings, 0);

  const matches: ShieldMatch[] = [];
  for (const entry of strings) {
    const match = findMatch(entry.path, entry.value);
    if (match) {
      matches.push(match);
    }
  }

  if (matches.length === 0) {
    return {
      blocked: false,
      matches
    };
  }

  return {
    blocked: true,
    reasonCode: matches[0].reasonCode,
    matches
  };
};

export const assertShieldSafe = (input: unknown): void => {
  const verdict = scanUntrustedInput(input);
  if (!verdict.blocked || !verdict.reasonCode) {
    return;
  }
  throw new Error(`PARANOIA_MODE_BLOCKED:${verdict.reasonCode}`);
};

export type { ShieldReasonCode, ShieldMatch, ShieldVerdict };
