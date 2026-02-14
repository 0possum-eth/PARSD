#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_ID="${1:-$(date -u +%Y%m%dT%H%M%SZ)}"
OUT_DIR="$REPO_ROOT/docs/arbiter/skill-interplay"
OUT_PATH="$OUT_DIR/$RUN_ID.md"

mkdir -p "$OUT_DIR"

python3 - "$REPO_ROOT" "$OUT_PATH" <<'PY'
import re
import sys
from pathlib import Path
from collections import defaultdict

repo = Path(sys.argv[1])
out_path = Path(sys.argv[2])

skill_files = sorted((repo / "skills").glob("**/SKILL.md"))

skills = []
for fp in skill_files:
    rel = fp.relative_to(repo).as_posix()
    txt = fp.read_text(encoding="utf-8", errors="replace")
    name = fp.parent.name
    desc = ""
    m = re.match(r"^---\n(.*?)\n---\n", txt, re.S)
    body = txt
    if m:
        front = m.group(1)
        body = txt[m.end():]
        for line in front.splitlines():
            if line.startswith("name:"):
                name = line.split(":", 1)[1].strip().strip('"')
            if line.startswith("description:"):
                desc = line.split(":", 1)[1].strip().strip('"')
    skills.append({"name": name, "desc": desc, "path": rel, "body": body})

skill_names = {s["name"] for s in skills}
out_edges = defaultdict(set)
in_edges = defaultdict(set)

for s in skills:
    body = s["body"]
    refs = set()
    refs.update(re.findall(r"superpowers:([a-z0-9][a-z0-9-]+)", body))
    refs.update(re.findall(r"\b(arbiter-[a-z0-9-]+)\b", body))
    refs.update(re.findall(r"\b([a-z][a-z0-9-]{2,})\b", body))
    refs = {r for r in refs if r in skill_names and r != s["name"]}
    for ref in refs:
        out_edges[s["name"]].add(ref)
        in_edges[ref].add(s["name"])

hub_rows = []
for s in skills:
    name = s["name"]
    hub_rows.append((name, len(out_edges[name]), len(in_edges[name])))

hub_rows.sort(key=lambda x: (-x[1]-x[2], x[0]))

total_edges = sum(len(v) for v in out_edges.values())

lines = []
lines.append("# Skill Interplay Map")
lines.append("")
lines.append(f"Generated: {out_path.stem} (UTC)")
lines.append("")
lines.append(f"- Total skills: `{len(skills)}`")
lines.append(f"- Directed interplay edges: `{total_edges}`")
lines.append("")
lines.append("## Inventory")
lines.append("")
lines.append("| Skill | Path | Description |")
lines.append("|---|---|---|")
for s in sorted(skills, key=lambda x: x["name"]):
    desc = s["desc"].replace("|", "\\|")
    lines.append(f"| `{s['name']}` | `{s['path']}` | {desc} |")

lines.append("")
lines.append("## Dependency Hubs")
lines.append("")
lines.append("| Skill | Outgoing refs | Incoming refs |")
lines.append("|---|---:|---:|")
for name, outc, inc in hub_rows:
    lines.append(f"| `{name}` | {outc} | {inc} |")

lines.append("")
lines.append("## Directed Edges")
lines.append("")
lines.append("| From | To |")
lines.append("|---|---|")
for src in sorted(out_edges):
    for dst in sorted(out_edges[src]):
        lines.append(f"| `{src}` | `{dst}` |")

out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(str(out_path))
PY
