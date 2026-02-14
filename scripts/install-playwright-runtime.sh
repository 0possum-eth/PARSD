#!/usr/bin/env bash
set -euo pipefail

if ! command -v npx >/dev/null 2>&1; then
  echo "NPX_MISSING"
  exit 2
fi

echo "Installing Playwright browser runtime (chromium + chrome channel)..."

set +e
npx --yes playwright@latest install chromium
CHROMIUM_RC=$?

npx --yes playwright@latest install chrome
CHROME_RC=$?
set -e

echo "CHROMIUM_INSTALL_RC=$CHROMIUM_RC"
echo "CHROME_INSTALL_RC=$CHROME_RC"

CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROMIUM_APP_BIN="/Applications/Chromium.app/Contents/MacOS/Chromium"

if [[ -x "$CHROME_BIN" ]]; then
  echo "CHROME_BINARY_PRESENT=1"
else
  echo "CHROME_BINARY_PRESENT=0"
fi

if [[ -x "$CHROMIUM_APP_BIN" ]]; then
  echo "CHROMIUM_APP_BINARY_PRESENT=1"
else
  echo "CHROMIUM_APP_BINARY_PRESENT=0"
fi

set +e
npx --yes playwright@latest --version
PW_VERSION_RC=$?
set -e

echo "PLAYWRIGHT_VERSION_RC=$PW_VERSION_RC"

if [[ $CHROMIUM_RC -ne 0 && $CHROME_RC -ne 0 ]]; then
  echo "PLAYWRIGHT_RUNTIME_INSTALL_FAILED"
  exit 1
fi

echo "PLAYWRIGHT_RUNTIME_INSTALL_DONE"
