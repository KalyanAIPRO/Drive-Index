#!/usr/bin/env bash
#
# One-command deploy.
#
#   ./bootstrap.sh                 -> new Sheet titled "Drive Index", script bound, code pushed
#   ./bootstrap.sh "My Index"      -> same, custom title
#
# If .clasp.json already exists it pushes to THAT project instead of creating a
# new one, so re-running is safe.
#
# Requires: node, npm, and a one-time `clasp login`.
set -euo pipefail

TITLE="${1:-Drive Index}"

command -v node >/dev/null 2>&1 || { echo "✖ node not found. Install Node.js 18+ first."; exit 1; }

if ! command -v clasp >/dev/null 2>&1; then
  echo "→ clasp not found, installing globally…"
  npm install -g @google/clasp
fi

if ! clasp show-authorized-user >/dev/null 2>&1; then
  echo "✖ Not logged in to Apps Script."
  echo "  Run this once, then re-run bootstrap:"
  echo "    clasp login"
  exit 1
fi

echo "→ Running the test harness first…"
node test/harness.js >/dev/null || { echo "✖ Tests failed — refusing to deploy."; exit 1; }
echo "  ✓ 22/22 passed"

if [ -f .clasp.json ]; then
  echo "→ .clasp.json exists — pushing to the existing project."
else
  echo "→ Creating a new Google Sheet titled \"$TITLE\" with a bound script…"
  clasp create-script --type sheets --title "$TITLE"
fi

echo "→ Pushing Code.gs + appsscript.json…"
clasp push --force

echo
echo "✓ Done."
echo
echo "Next, in the Sheet that opens:"
echo "  1. Reload the tab — the 📁 Drive Indexer menu appears"
echo "  2. 📁 Drive Indexer → ▶️ Run Indexer  (creates the Config sheet, then stops)"
echo "  3. Paste your Folder ID into Config!B2"
echo "  4. Run again and approve the permission prompt"
echo

clasp open-container || echo "(open the Sheet from Drive — clasp could not launch a browser)"
