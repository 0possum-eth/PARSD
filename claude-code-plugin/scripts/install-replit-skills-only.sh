#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TARGET_REPO="${1:-}"

if [[ -z "${TARGET_REPO}" ]]; then
  echo "Usage: $(basename "$0") /path/to/replit/repo" >&2
  exit 1
fi

if [[ ! -d "${TARGET_REPO}" ]]; then
  echo "ERROR: target repo not found: ${TARGET_REPO}" >&2
  exit 1
fi

mkdir -p "${TARGET_REPO}/.agents/skills"

if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude '.DS_Store' "${PKG_ROOT}/skills/" "${TARGET_REPO}/.agents/skills/"
else
  cp -R "${PKG_ROOT}/skills/." "${TARGET_REPO}/.agents/skills/"
fi

echo "[replit] Skills-only install complete: ${TARGET_REPO}/.agents/skills"
echo "[replit] Runtime M1-M5 automation is not installed in Replit skills-only mode."
