import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  applySsotSystemTransform,
  buildSsotAppendixForTaskPacket
} from "../ssot";

test("applySsotSystemTransform bootstraps protected SSoT docs and injects keyword-matched context", async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "arbiter-ssot-"));

  try {
    const output = { system: ["baseline"] as string[] };
    const result = await applySsotSystemTransform(
      {
        message: {
          role: "user",
          content: "Need a ledger receipt evidence audit for this run"
        }
      },
      output,
      {
        cwd: tempDir,
        role: "arbiter",
        password: "test-ssot-password"
      }
    );

    assert.ok(result.injectedDocIds.length >= 1);
    assert.match(output.system.join("\n"), /\[SSOT:ledger-first@/i);

    const protectedRoot = path.join(tempDir, "docs", "arbiter", "_ssot", "protected");
    const manifestPath = path.join(protectedRoot, "manifest.json");
    assert.ok(fs.existsSync(manifestPath));

    const files = await fs.promises.readdir(protectedRoot);
    assert.ok(files.some((file) => file.endsWith(".ssot.json")));
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

test("applySsotSystemTransform purges duplicate SSoT versions before injecting latest", async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "arbiter-ssot-dedupe-"));

  try {
    const output = {
      system: [
        "baseline",
        "[SSOT:ledger-first@2026.01.01]\nold-ssot-a\n[/SSOT]",
        "[SSOT:ledger-first@2026.01.15]\nold-ssot-b\n[/SSOT]"
      ] as string[]
    };

    await applySsotSystemTransform(
      {
        messages: [
          {
            role: "user",
            content: "Check ledger continuity and receipts"
          }
        ]
      },
      output,
      {
        cwd: tempDir,
        role: "arbiter",
        password: "test-ssot-password"
      }
    );

    const rendered = output.system.join("\n");
    const matches = rendered.match(/\[SSOT:ledger-first@/g) ?? [];
    assert.equal(matches.length, 1);
    assert.doesNotMatch(rendered, /\[SSOT:ledger-first@2026\.01\.01\]/);
    assert.doesNotMatch(rendered, /\[SSOT:ledger-first@2026\.01\.15\]/);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

test("buildSsotAppendixForTaskPacket injects role-aware SSoT context for verifier roles", async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "arbiter-ssot-packet-"));

  try {
    const appendix = await buildSsotAppendixForTaskPacket({
      cwd: tempDir,
      role: "verifier-spec",
      query: "",
      password: "test-ssot-password"
    });

    assert.match(appendix, /## SSoT Injection/i);
    assert.match(appendix, /\[SSOT:ledger-first@/i);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});
