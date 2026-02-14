#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CODEX_HOME="${CODEX_HOME:-${HOME}/.codex}"
SKILLS_DIR="${CODEX_HOME}/skills"
WORKSPACE_PATH="${1:-}"

mkdir -p "${SKILLS_DIR}"

if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude '.DS_Store' "${PKG_ROOT}/skills/" "${SKILLS_DIR}/"
else
  cp -R "${PKG_ROOT}/skills/." "${SKILLS_DIR}/"
fi

echo "[codex] Skills installed to ${SKILLS_DIR}"

if [[ -n "${WORKSPACE_PATH}" ]]; then
  if [[ ! -d "${WORKSPACE_PATH}" ]]; then
    echo "[codex] ERROR: workspace path not found: ${WORKSPACE_PATH}" >&2
    exit 1
  fi
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --exclude '.DS_Store' "${PKG_ROOT}/resonant-features/source/" "${WORKSPACE_PATH}/"
  else
    cp -R "${PKG_ROOT}/resonant-features/source/." "${WORKSPACE_PATH}/"
  fi
  echo "[codex] Resonant runtime files installed to ${WORKSPACE_PATH}"
fi

echo "[codex] Done"
