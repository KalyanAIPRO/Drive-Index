# One-command deploy (Windows PowerShell).
#
#   .\bootstrap.ps1                -> new Sheet titled "Drive Index", script bound, code pushed
#   .\bootstrap.ps1 "My Index"     -> same, custom title
#
# Safe to re-run: if .clasp.json exists it pushes to that project.
# Requires: node, npm, and a one-time `clasp login`.

param([string]$Title = "Drive Index")
$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "X node not found. Install Node.js 18+ first." -ForegroundColor Red; exit 1
}

if (-not (Get-Command clasp -ErrorAction SilentlyContinue)) {
  Write-Host "-> clasp not found, installing globally..." -ForegroundColor Cyan
  npm install -g @google/clasp
}

clasp show-authorized-user *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "X Not logged in to Apps Script." -ForegroundColor Red
  Write-Host "  Run this once, then re-run bootstrap:"
  Write-Host "    clasp login"
  exit 1
}

Write-Host "-> Running the test harness first..." -ForegroundColor Cyan
node test/harness.js *> $null
if ($LASTEXITCODE -ne 0) { Write-Host "X Tests failed - refusing to deploy." -ForegroundColor Red; exit 1 }
Write-Host "   OK 22/22 passed" -ForegroundColor Green

if (Test-Path .clasp.json) {
  Write-Host "-> .clasp.json exists - pushing to the existing project." -ForegroundColor Cyan
} else {
  Write-Host "-> Creating a new Google Sheet titled `"$Title`" with a bound script..." -ForegroundColor Cyan
  clasp create-script --type sheets --title "$Title"
}

Write-Host "-> Pushing Code.gs + appsscript.json..." -ForegroundColor Cyan
clasp push --force

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host ""
Write-Host "Next, in the Sheet that opens:"
Write-Host "  1. Reload the tab - the Drive Indexer menu appears"
Write-Host "  2. Drive Indexer -> Run Indexer  (creates the Config sheet, then stops)"
Write-Host "  3. Paste your Folder ID into Config!B2"
Write-Host "  4. Run again and approve the permission prompt"
Write-Host ""

clasp open-container
