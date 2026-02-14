#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_ID="${1:-$(date -u +%Y%m%dT%H%M%SZ)}"
TIMEOUT_SEC="${TIMEOUT_SEC:-240}"
SANDBOX_MODE="${SANDBOX_MODE:-workspace-write}"
PARALLEL_ROLES="${PARALLEL_ROLES:-4}"

RUN_DIR="$REPO_ROOT/docs/arbiter/ultra-dao-sessions/$RUN_ID"
PROMPTS_DIR="$RUN_DIR/prompts"
OUTPUTS_DIR="$RUN_DIR/outputs"
LOGS_DIR="$RUN_DIR/logs"
ROWS_DIR="$RUN_DIR/rows"
MANIFEST="$RUN_DIR/manifest.tsv"
SUMMARY="$RUN_DIR/summary.md"
PLAY_BY_PLAY="$RUN_DIR/play-by-play.md"
EVIDENCE_PATHS="$RUN_DIR/evidence-paths.txt"

mkdir -p "$PROMPTS_DIR" "$OUTPUTS_DIR" "$LOGS_DIR" "$ROWS_DIR"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI not found in PATH"
  exit 2
fi

echo -e "idx\tphase\trole\tprompt_path\toutput_path\tlog_path\tsession_id\texit_code\ttimed_out\thighlight\tduration_sec" > "$MANIFEST"

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
  local start
  start="$(date +%s)"

  while kill -0 "$pid" 2>/dev/null; do
    local now
    now="$(date +%s)"
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

extract_highlight() {
  local output_path="$1"
  if [[ ! -s "$output_path" ]]; then
    echo ""
    return
  fi

  rg -n '^(decision|preferred_tool|vote_tool|winner_tool|winner_from_role|phase):' "$output_path" \
    | sed -E 's/^[0-9]+://' \
    | head -n 1 \
    || true
}

write_row() {
  local idx="$1"
  local phase="$2"
  local role="$3"
  local prompt_path="$4"
  local output_path="$5"
  local log_path="$6"
  local session_id="$7"
  local exit_code="$8"
  local timed_out="$9"
  local highlight="${10}"
  local duration="${11}"

  echo -e "${idx}\t${phase}\t${role}\t${prompt_path}\t${output_path}\t${log_path}\t${session_id}\t${exit_code}\t${timed_out}\t${highlight}\t${duration}" > "$ROWS_DIR/${idx}.tsv"
}

run_case() {
  local idx="$1"
  local phase="$2"
  local role="$3"
  local prompt_path="$4"
  local output_path="$5"
  local log_path="$6"

  local start end duration exit_code timed_out session_id highlight
  start="$(date +%s)"
  exit_code=0
  timed_out=0

  if run_with_timeout "$TIMEOUT_SEC" "$prompt_path" codex exec --ephemeral --sandbox "$SANDBOX_MODE" -C "$REPO_ROOT" --output-last-message "$output_path" - > "$log_path" 2>&1; then
    exit_code=0
  else
    exit_code=$?
  fi
  if [[ "$exit_code" -eq 124 ]]; then
    timed_out=1
  fi

  end="$(date +%s)"
  duration=$((end - start))
  session_id="$(rg -n 'session id:' "$log_path" | sed -E 's/.*session id: //' | head -n1 || true)"
  highlight="$(extract_highlight "$output_path")"

  write_row "$idx" "$phase" "$role" "$prompt_path" "$output_path" "$log_path" "$session_id" "$exit_code" "$timed_out" "$highlight" "$duration"
  echo "[$idx][$phase][$role] exit=$exit_code timeout=$timed_out duration=${duration}s highlight=${highlight:-NA}"
}

wait_for_slot() {
  local limit="$1"
  while true; do
    local count
    count="$(jobs -pr | wc -l | tr -d ' ')"
    if (( count < limit )); then
      break
    fi
    sleep 0.2
  done
}

build_evidence_paths() {
  cat > "$EVIDENCE_PATHS" <<EOF
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/20260214T062702Z
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T2
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T3
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T4
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T5
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/incantations/20260214T065548Z
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/incantations/incant-deep-20260214T4
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/incantations/incant-deep-20260214T5
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/incantations/incant-timeout-smoke2-20260214T4
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/ARBITER_HYBRID_DAO_SCOUT_MAX_EFFORT_REPORT_2026-02-14.md
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/ARBITER_SWARM_DEEP_UPGRADE_REPORT_2026-02-14.md
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/skill-interplay/deep-upgrade-20260214T5.md
/Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/_dao/board.jsonl
EOF
}

write_submission_prompt() {
  local role="$1"
  local prompt_path="$2"

  cat > "$prompt_path" <<PROMPT
You are role: $role
Mode: arbiter hybrid scouting oracle librarian ux-delight ULTRA DAO retrospective.

Mission:
Deeply analyze T1-T5 swarm and incantation outputs, logs, manifests, and reports.
You must produce improvements plus exactly one tool proposal that could unlock emergent capability.

Evidence roots (priority):
$(cat "$EVIDENCE_PATHS")

Mandatory context to include in your analysis:
Remaining Gaps
1. Toolchain-capability remains vulnerable to long trajectories and output bloat.
2. Compression path still does not generate compressed artifacts under current fixture.
3. Oracle/trust closure artifacts still need completion for end-to-end lifecycle readiness.

Recommended Next Steps
1. Add a host-side toolchain preflight script and use subagents only for policy interpretation.
2. Add deterministic M2 compression fixture data to guarantee compressed output and rehydration proof.
3. Add strict receipt schema gate for ORACLE_REVIEWED and trust confirmation before coordinator continue.

Rules:
- Use at most 6 shell commands.
- Focus only on listed evidence roots.
- Do not modify files.
- Keep response under 520 words.

Output EXACT YAML:
role: "$role"
phase: submission
findings:
  - id: "F1"
    severity: high|med|low
    detail: "..."
  - id: "F2"
    severity: high|med|low
    detail: "..."
  - id: "F3"
    severity: high|med|low
    detail: "..."
  - id: "F4"
    severity: high|med|low
    detail: "..."
  - id: "F5"
    severity: high|med|low
    detail: "..."
improvements:
  - "..."
  - "..."
  - "..."
proposed_tool:
  name: "..."
  category: "..."
  why_now: "..."
  emergent_capability: "..."
  integration_steps:
    - "..."
    - "..."
    - "..."
  risks:
    - "..."
    - "..."
  first_prototype: "..."
confidence: 0.00-1.00
PROMPT
}

write_critique_prompt() {
  local role="$1"
  local prompt_path="$2"
  local submissions_block
  submissions_block="$(ls -1 "$OUTPUTS_DIR"/submission-*.output.txt 2>/dev/null | sed 's/^/- /' || true)"

  cat > "$prompt_path" <<PROMPT
You are role: $role
Phase: critique

Review all submission files and score each proposed tool.

Submission files:
$submissions_block

Rules:
- Use at most 4 shell commands.
- Do not modify files.
- Keep response under 420 words.

Output EXACT YAML:
role: "$role"
phase: critique
tool_scores:
  - tool: "..."
    score: 0-10
    reason: "..."
  - tool: "..."
    score: 0-10
    reason: "..."
  - tool: "..."
    score: 0-10
    reason: "..."
  - tool: "..."
    score: 0-10
    reason: "..."
steer_notes:
  - "..."
  - "..."
preferred_tool:
  name: "..."
  reason: "..."
PROMPT
}

write_vote_prompt() {
  local role="$1"
  local prompt_path="$2"
  local submissions_block critiques_block
  submissions_block="$(ls -1 "$OUTPUTS_DIR"/submission-*.output.txt 2>/dev/null | sed 's/^/- /' || true)"
  critiques_block="$(ls -1 "$OUTPUTS_DIR"/critique-*.output.txt 2>/dev/null | sed 's/^/- /' || true)"

  cat > "$prompt_path" <<PROMPT
You are role: $role
Phase: vote

Vote for exactly one tool from the submissions.

Submission files:
$submissions_block

Critique files:
$critiques_block

Rules:
- Use at most 3 shell commands.
- Do not modify files.
- Keep response under 260 words.

Output EXACT YAML:
role: "$role"
phase: vote
vote_tool: "..."
vote_reason: "..."
confidence: 0.00-1.00
PROMPT
}

write_verdict_prompt() {
  local prompt_path="$1"
  local submissions_block critiques_block votes_block
  submissions_block="$(ls -1 "$OUTPUTS_DIR"/submission-*.output.txt 2>/dev/null | sed 's/^/- /' || true)"
  critiques_block="$(ls -1 "$OUTPUTS_DIR"/critique-*.output.txt 2>/dev/null | sed 's/^/- /' || true)"
  votes_block="$(ls -1 "$OUTPUTS_DIR"/vote-*.output.txt 2>/dev/null | sed 's/^/- /' || true)"

  cat > "$prompt_path" <<PROMPT
You are role: arbiter-coordinator
Phase: verdict

You must choose exactly one winning tool submission after reading all submissions, critiques, and votes.
If there is a vote tie, break tie using: higher average critique score, then lower integration risk.

Submission files:
$submissions_block

Critique files:
$critiques_block

Vote files:
$votes_block

Rules:
- Use at most 4 shell commands.
- Do not modify files.
- Keep response under 380 words.

Output EXACT YAML:
role: coordinator
phase: verdict
winner_tool: "..."
winner_from_role: "..."
vote_tally:
  - tool: "..."
    votes: 0
  - tool: "..."
    votes: 0
  - tool: "..."
    votes: 0
  - tool: "..."
    votes: 0
justification:
  - "..."
  - "..."
next_move:
  - "..."
  - "..."
PROMPT
}

build_evidence_paths

roles=("hybrid-scout" "oracle" "librarian" "ux-delight")
idx=0

# Phase 1: submissions in parallel.
for role in "${roles[@]}"; do
  idx=$((idx + 1))
  prompt_path="$PROMPTS_DIR/submission-${role}.prompt.md"
  output_path="$OUTPUTS_DIR/submission-${role}.output.txt"
  log_path="$LOGS_DIR/submission-${role}.log.txt"
  write_submission_prompt "$role" "$prompt_path"
  wait_for_slot "$PARALLEL_ROLES"
  run_case "$idx" "submission" "$role" "$prompt_path" "$output_path" "$log_path" &
done
wait

# Phase 2: critiques in parallel.
for role in "${roles[@]}"; do
  idx=$((idx + 1))
  prompt_path="$PROMPTS_DIR/critique-${role}.prompt.md"
  output_path="$OUTPUTS_DIR/critique-${role}.output.txt"
  log_path="$LOGS_DIR/critique-${role}.log.txt"
  write_critique_prompt "$role" "$prompt_path"
  wait_for_slot "$PARALLEL_ROLES"
  run_case "$idx" "critique" "$role" "$prompt_path" "$output_path" "$log_path" &
done
wait

# Phase 3: votes in parallel.
for role in "${roles[@]}"; do
  idx=$((idx + 1))
  prompt_path="$PROMPTS_DIR/vote-${role}.prompt.md"
  output_path="$OUTPUTS_DIR/vote-${role}.output.txt"
  log_path="$LOGS_DIR/vote-${role}.log.txt"
  write_vote_prompt "$role" "$prompt_path"
  wait_for_slot "$PARALLEL_ROLES"
  run_case "$idx" "vote" "$role" "$prompt_path" "$output_path" "$log_path" &
done
wait

# Phase 4: coordinator verdict.
idx=$((idx + 1))
vprompt="$PROMPTS_DIR/verdict-coordinator.prompt.md"
voutput="$OUTPUTS_DIR/verdict-coordinator.output.txt"
vlog="$LOGS_DIR/verdict-coordinator.log.txt"
write_verdict_prompt "$vprompt"
run_case "$idx" "verdict" "arbiter-coordinator" "$vprompt" "$voutput" "$vlog"

# Build manifest.
for row in $(ls "$ROWS_DIR"/*.tsv 2>/dev/null | sort -V); do
  cat "$row" >> "$MANIFEST"
done

total_runs="$(awk 'NR>1{c++} END{print c+0}' "$MANIFEST")"
bad_runs="$(awk -F '\t' 'NR>1 && $8 != 0 {c++} END{print c+0}' "$MANIFEST")"
timeout_runs="$(awk -F '\t' 'NR>1 && $9 == 1 {c++} END{print c+0}' "$MANIFEST")"

winner_tool="$(rg -n '^winner_tool:' "$voutput" | sed -E 's/^[0-9]+:winner_tool:[[:space:]]*//' | head -n1 || true)"
winner_role="$(rg -n '^winner_from_role:' "$voutput" | sed -E 's/^[0-9]+:winner_from_role:[[:space:]]*//' | head -n1 || true)"

{
  echo "# ULTRA DAO Retro Summary"
  echo
  echo "- Run ID: $RUN_ID"
  echo "- Total subagents: $total_runs"
  echo "- Non-zero exits: $bad_runs"
  echo "- Timed out: $timeout_runs"
  echo "- Winner tool: ${winner_tool:-unknown}"
  echo "- Winner from role: ${winner_role:-unknown}"
  echo
  echo "## Key Paths"
  echo
  echo "- Manifest: $MANIFEST"
  echo "- Play-by-play: $PLAY_BY_PLAY"
  echo "- Verdict output: $voutput"
  echo "- Evidence roots list: $EVIDENCE_PATHS"
} > "$SUMMARY"

{
  echo "# ULTRA DAO Play-by-Play"
  echo
  echo "- Run ID: $RUN_ID"
  echo
  echo "| Idx | Phase | Role | Exit | Timeout | Highlight | Duration (s) |"
  echo "|---:|---|---|---:|---:|---|---:|"
  awk -F '\t' 'NR>1 {printf("| %s | %s | %s | %s | %s | %s | %s |\n", $1,$2,$3,$8,$9,($10==""?"(none)":$10),$11)}' "$MANIFEST"
} > "$PLAY_BY_PLAY"

echo "ULTRA_DAO_RETRO_COMPLETE $RUN_DIR"
