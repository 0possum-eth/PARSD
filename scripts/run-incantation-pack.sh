#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_ID="${1:-$(date -u +%Y%m%dT%H%M%SZ)}"
SWARM_RUN_ID="${2:-$(ls -1t "$REPO_ROOT/docs/arbiter/swarm-runs" 2>/dev/null | head -n1)}"
TIMEOUT_SEC="${TIMEOUT_SEC:-90}"
SANDBOX_MODE="${SANDBOX_MODE:-workspace-write}"

if [[ -z "${SWARM_RUN_ID:-}" ]]; then
  echo "No swarm run found. Run scripts/run-arbiter-swarm.sh first."
  exit 2
fi

SWARM_DIR="$REPO_ROOT/docs/arbiter/swarm-runs/$SWARM_RUN_ID"
RUN_DIR="$REPO_ROOT/docs/arbiter/incantations/$RUN_ID"
mkdir -p "$RUN_DIR/prompts" "$RUN_DIR/outputs" "$RUN_DIR/logs"
MANIFEST="$RUN_DIR/manifest.tsv"

if [[ ! -f "$SWARM_DIR/manifest.tsv" ]]; then
  echo "Swarm manifest missing: $SWARM_DIR/manifest.tsv"
  exit 2
fi

echo -e "idx\tid\tprompt\toutput\tlog\tsession_id\texit_code\ttimed_out\tduration_sec" >"$MANIFEST"

FACTS_FILE="$RUN_DIR/swarm-facts.txt"
{
  echo "swarm_run_id=$SWARM_RUN_ID"
  awk -F '\t' 'NR>1 {c++; if($3=="skill") s++; if($3=="flow") f++; if($10!=0) bad++; d[$12]++} END {printf("rows=%d\nskills=%d\nflows=%d\nfailures=%d\n", c+0, s+0, f+0, bad+0); for (k in d) printf("decision_%s=%d\n", k, d[k]); }' "$SWARM_DIR/manifest.tsv" | sort
  echo "top_long_runs:"
  awk -F '\t' 'NR>1 {print $13"\t"$4"\t"$12}' "$SWARM_DIR/manifest.tsv" | sort -nr | head -n 6
} > "$FACTS_FILE"

run_with_timeout() {
  local timeout="$1"
  local stdin_file="$2"
  shift
  shift
  local timed_out=0
  local rc=0

  if [[ -n "$stdin_file" ]]; then
    "$@" < "$stdin_file" &
  else
    "$@" &
  fi
  local pid=$!
  local start="$(date +%s)"

  while kill -0 "$pid" 2>/dev/null; do
    local now="$(date +%s)"
    if (( now - start >= timeout )); then
      timed_out=1
      kill -TERM "$pid" 2>/dev/null || true
      sleep 2
      kill -KILL "$pid" 2>/dev/null || true
      break
    fi
    sleep 1
  done

  set +e
  wait "$pid" 2>/dev/null
  rc=$?
  set -e
  if (( timed_out == 1 )); then
    return 124
  fi
  return "$rc"
}

run_case() {
  local idx="$1"
  local id="$2"
  local prompt="$RUN_DIR/prompts/$id.prompt.md"
  local output="$RUN_DIR/outputs/$id.output.txt"
  local log="$RUN_DIR/logs/$id.log.txt"
  local start end duration exit_code timed_out session_id

  start="$(date +%s)"
  exit_code=0
  timed_out=0

  if run_with_timeout "$TIMEOUT_SEC" "$prompt" codex exec --ephemeral --sandbox "$SANDBOX_MODE" -C "$REPO_ROOT" --output-last-message "$output" - > "$log" 2>&1; then
    exit_code=0
  else
    exit_code=$?
  fi
  if [[ "$exit_code" -eq 124 ]]; then
    timed_out=1
  fi

  end="$(date +%s)"
  duration=$((end - start))
  session_id="$(rg -n 'session id:' "$log" | sed -E 's/.*session id: //' | head -n1 || true)"

  echo -e "${idx}\t${id}\t${prompt}\t${output}\t${log}\t${session_id}\t${exit_code}\t${timed_out}\t${duration}" >> "$MANIFEST"
  echo "[$idx][$id] exit=$exit_code timeout=$timed_out duration=${duration}s"
}

prompt_preamble() {
  cat <<PREAMBLE
You are running a bounded analysis subagent.
Hard limits:
- Max output length: 220 words.
- Use at most 3 shell commands.
- Do not scan the whole repository.
- Do not run package managers or tests ('npm', 'pnpm', 'yarn', 'npx', 'pytest', 'vitest', 'jest').
- Use only these artifacts unless absolutely required:
  - $SWARM_DIR/manifest.tsv
  - $SWARM_DIR/summary.md
  - $SWARM_DIR/outputs/
  - $SWARM_DIR/logs/
Facts:
$(cat "$FACTS_FILE")
PREAMBLE
}

cat > "$RUN_DIR/prompts/skeptic-auditor.prompt.md" <<PROMPT
$(prompt_preamble)
Role: skeptic-auditor
Find top 5 false-confidence risks in the swarm methodology.
Output EXACT YAML:
role: skeptic-auditor
top_false_confidence_risks:
  - "..."
  - "..."
  - "..."
  - "..."
  - "..."
highest_risk: "..."
recommended_countertest: "..."
PROMPT

cat > "$RUN_DIR/prompts/dependency-necromancer.prompt.md" <<PROMPT
$(prompt_preamble)
Role: dependency-necromancer
Map unresolved dependency clusters and resurrection order.
Output EXACT YAML:
role: dependency-necromancer
missing_module_clusters:
  - cluster: "..."
    examples:
      - "..."
      - "..."
    blast_radius: "low|med|high"
resurrection_order:
  - "..."
  - "..."
  - "..."
first_file_to_patch: "..."
PROMPT

cat > "$RUN_DIR/prompts/ledger-forensics.prompt.md" <<PROMPT
$(prompt_preamble)
Role: ledger-forensics
Decide lifecycle readiness for full receipt-gated execution.
Output EXACT YAML:
role: ledger-forensics
lifecycle_runnable_now: yes|no|partial
evidence_present:
  - "..."
missing_critical_artifacts:
  - "..."
first_unblock_action: "..."
PROMPT

cat > "$RUN_DIR/prompts/dao-war-game.prompt.md" <<PROMPT
$(prompt_preamble)
Role: dao-war-game
Simulate speed-vs-safety board conflict and produce final vote payload.
Output EXACT YAML:
role: dao-war-game
vote_result: speed_wins|safety_wins|split
compromise_terms:
  - "..."
  - "..."
  - "..."
board_message:
  from: "arbiter"
  type: "vote"
  to: "all"
  content: "..."
PROMPT

cat > "$RUN_DIR/prompts/latency-optimizer.prompt.md" <<PROMPT
$(prompt_preamble)
Role: latency-optimizer
Propose safe speedups that preserve gate order.
Output EXACT YAML:
role: latency-optimizer
safe_speedups:
  - "..."
  - "..."
  - "..."
never_optimize_this:
  - "..."
  - "..."
expected_time_savings: "..."
PROMPT

cat > "$RUN_DIR/prompts/paranoia-red-team.prompt.md" <<PROMPT
$(prompt_preamble)
Role: paranoia-red-team
Provide 3 realistic injection attacks and shield responses.
Output EXACT YAML:
role: paranoia-red-team
attacks:
  - attack: "..."
    expected_shield_response: "..."
  - attack: "..."
    expected_shield_response: "..."
  - attack: "..."
    expected_shield_response: "..."
most_dangerous_attack: "..."
PROMPT

cat > "$RUN_DIR/prompts/tool-fallback-alchemist.prompt.md" <<PROMPT
$(prompt_preamble)
Role: tool-fallback-alchemist
Propose fallbacks when browser/screenshot deps are unstable.
Output EXACT YAML:
role: tool-fallback-alchemist
fallbacks:
  - when: "..."
    use: "..."
    tradeoff: "..."
  - when: "..."
    use: "..."
    tradeoff: "..."
  - when: "..."
    use: "..."
    tradeoff: "..."
priority_fallback: "..."
PROMPT

cat > "$RUN_DIR/prompts/meta-conductor.prompt.md" <<PROMPT
$(prompt_preamble)
Role: meta-conductor
Design next 3 highest-value experiments.
Output EXACT YAML:
role: meta-conductor
next_experiments:
  - name: "..."
    why: "..."
    success_signal: "..."
  - name: "..."
    why: "..."
    success_signal: "..."
  - name: "..."
    why: "..."
    success_signal: "..."
PROMPT

run_case 1 skeptic-auditor
run_case 2 dependency-necromancer
run_case 3 ledger-forensics
run_case 4 dao-war-game
run_case 5 latency-optimizer
run_case 6 paranoia-red-team
run_case 7 tool-fallback-alchemist
run_case 8 meta-conductor

echo "Incantation run complete: $RUN_DIR"
