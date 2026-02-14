#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

read_skill() {
  local p="$1"
  if [[ -f "$p" ]]; then
    cat "$p"
  fi
}

using_superpowers_content="$(read_skill "${PLUGIN_ROOT}/skills/using-superpowers/SKILL.md")"
using_arbiter_content="$(read_skill "${PLUGIN_ROOT}/skills/using-arbiter-os/SKILL.md")"

escape_for_json() {
  local input="$1"
  local output=""
  local i char
  for (( i=0; i<${#input}; i++ )); do
    char="${input:$i:1}"
    case "$char" in
      $'\\') output+='\\' ;;
      '"') output+='\\"' ;;
      $'\n') output+='\\n' ;;
      $'\r') output+='\\r' ;;
      $'\t') output+='\\t' ;;
      *) output+="$char" ;;
    esac
  done
  printf '%s' "$output"
}

super_escaped="$(escape_for_json "$using_superpowers_content")"
arbiter_escaped="$(escape_for_json "$using_arbiter_content")"

cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<EXTREMELY_IMPORTANT>\\nYou are running the A.R.S.D standalone plugin package.\\n\\nPrimary rules:\\n- Use skills first for orchestration\\n- Keep Arbiter ledger-first state transitions\\n- Resonant M1-M5 guardrails are part of this package\\n\\nusing-superpowers skill:\\n${super_escaped}\\n\\nusing-arbiter-os skill:\\n${arbiter_escaped}\\n</EXTREMELY_IMPORTANT>"
  }
}
JSON
