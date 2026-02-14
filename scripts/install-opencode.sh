#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OPENCODE_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-${HOME}/.config/opencode}"
SKILLS_DIR="${OPENCODE_CONFIG_DIR}/skills"
PLUGINS_DIR="${OPENCODE_CONFIG_DIR}/plugins"
WORKSPACE_PATH="${1:-}"

mkdir -p "${SKILLS_DIR}" "${PLUGINS_DIR}"

if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude '.DS_Store' "${PKG_ROOT}/skills/" "${SKILLS_DIR}/"
else
  cp -R "${PKG_ROOT}/skills/." "${SKILLS_DIR}/"
fi

echo "[opencode] Skills installed to ${SKILLS_DIR}"

PLUGIN_PATH="${PLUGINS_DIR}/arbiter-os.js"
if [[ -f "${PLUGIN_PATH}" ]]; then
  BACKUP_PATH="${PLUGIN_PATH}.bak.$(date +%Y%m%d%H%M%S)"
  cp "${PLUGIN_PATH}" "${BACKUP_PATH}"
  echo "[opencode] Existing plugin backed up to ${BACKUP_PATH}"
fi
cp "${PKG_ROOT}/resonant-features/source/.opencode/plugins/arbiter-os.js" "${PLUGIN_PATH}"
echo "[opencode] Arbiter plugin installed to ${PLUGIN_PATH}"

if [[ -n "${WORKSPACE_PATH}" ]]; then
  if [[ ! -d "${WORKSPACE_PATH}" ]]; then
    echo "[opencode] ERROR: workspace path not found: ${WORKSPACE_PATH}" >&2
    exit 1
  fi
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --exclude '.DS_Store' "${PKG_ROOT}/resonant-features/source/" "${WORKSPACE_PATH}/"
  else
    cp -R "${PKG_ROOT}/resonant-features/source/." "${WORKSPACE_PATH}/"
  fi
  echo "[opencode] Resonant runtime files installed to ${WORKSPACE_PATH}"
fi

if [[ -z "${WORKSPACE_PATH}" ]]; then
  echo "[opencode] WARNING: no workspace path provided; plugin will run in fallback mode until runtime files are installed."
fi

echo "[opencode] Restart OpenCode to load skills/plugins"
