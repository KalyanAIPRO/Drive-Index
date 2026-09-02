<div align="center">

# 📁 Drive Index

**Turn any Google Drive folder into a clean, clickable, sortable spreadsheet index — in one click.**

Config-driven Google Apps Script. Point it at a folder, press Run, get a formatted
inventory of every file with a live link, folder path, type, size and last-modified date.
No code editing to change behaviour.

`Google Apps Script` · `Google Sheets` · `Google Drive API` · `Zero dependencies`

</div>

---

## Why this exists

Document estates sprawl. Contracts, certificates, invoices and reports end up spread
across hundreds of nested Drive folders, and the only way to answer *"do we actually
have that file?"* is to click through the tree.

Drive Index flattens the whole estate into one spreadsheet you can filter, sort,
`Ctrl+F`, pivot and share — and because the output is a normal Sheet, you can layer
your own formulas on top: expected-vs-actual gap checks, ownership columns, ageing on
`Last Modified`, whatever the process needs.

---

## Features

| | Feature |
|---|---|
| ⚙️ | **Config sheet is the control panel.** Folder, output tab, sort order, header colours and link label are all cells — no code edit to change behaviour |
| 🔗 | **Live `HYPERLINK` per row** with a custom button label, so the index is navigable, not just a listing |
| 🗂 | **Optional recursive scan** with a readable breadcrumb path (`Parent / Child / Grandchild`) |
| ↕️ | **Four sort modes** — Name, Type, Last Modified, Size — applied before row numbering, so `#` always matches what you see |
| 🎨 | **Formatted output** — frozen header, bold coloured header band, zebra striping, auto-sized columns |
| 🧭 | **Custom menu + in-app help**, so a non-technical user never opens the script editor |
| ♻️ | **Idempotent.** Re-running clears and rewrites the output tab — no duplicate rows, no stale leftovers |
| 🔒 | **Read-only against Drive.** Lists metadata; never moves, edits or deletes a file |

---

## Output columns

| Column | Content |
|---|---|
| `#` | Sequence number, renumbered after sorting |
| `File Name` | Drive file name |
| `File Type` | Derived from MIME type (`PDF`, `SPREADSHEET`, `DOCUMENT`, `PNG`…) |
| `Drive Link` | Clickable `HYPERLINK` with your chosen label |
| `Folder Path` | Breadcrumb from the root folder scanned |
| `Last Modified` | Drive's last-updated timestamp |
| `Size (KB)` | Rounded from bytes |

---

## Install

### Option A — copy/paste (no tooling)

1. Create or open a Google Sheet.
2. **Extensions → Apps Script.** This binds the script to that Sheet — do **not** create a standalone script; the code assumes it is bound.
3. Paste [`Code.gs`](Code.gs) over the default `Code.gs` and save.
4. Reload the Sheet. A **📁 Drive Indexer** menu appears.
5. **📁 Drive Indexer → ▶️ Run Indexer.** The first run creates the `Config` sheet and stops.
6. Fill in `Config` (see below), then run again. Approve the permission prompt once.

### Option B — `clasp`

```bash
npm install -g @google/clasp && clasp login
```

```bash
cp .clasp.json.example .clasp.json   # then put your scriptId in it
clasp push --force
```

`.clasp.json` is gitignored on purpose — a `scriptId` identifies your own Apps Script project.

---

## Configuration

All settings live in the **`Config`** sheet, column `B`. Full reference: [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md).

| Cell | Setting | Default | Notes |
|---|---|---|---|
| `B2` | Folder ID | *(blank)* | From the folder URL after `/folders/` |
| `B3` | Output Sheet Name | `File Index` | Created if missing |
| `B4` | Sort By | `Name` | `Name` · `Type` · `Last Modified` · `Size` |
| `B5` | Include Subfolders | `FALSE` | **Use a checkbox or real boolean** — see limitations |
| `B6` | Header Background | `#4285F4` | Hex |
| `B7` | Header Font Colour | `#FFFFFF` | Hex |
| `B8` | Link Button Label | `Open File` | Avoid `"` — see limitations |

**Finding the Folder ID**

```
https://drive.google.com/drive/folders/1AbC2dEfGhIjK3LmNoPqRsTuV
                                       └────────── this ──────────┘
```

**📁 Drive Indexer → ⚙️ Reset Config Sheet** restores defaults without touching your index.

---

## Permissions

The manifest deliberately does **not** pin an `oauthScopes` allowlist, so Apps Script
infers the scopes it needs. This is the safe default: in a bound script, an explicit
allowlist that misses a scope **fails silently** — the service throws internally and the
feature simply never works, with no error surfaced.

Scopes requested on first run:

| Scope | Why |
|---|---|
| `.../auth/spreadsheets.currentonly` | Read `Config`, write the index tab |
| `.../auth/drive.readonly` *(or `drive`)* | Enumerate the folder and read file metadata |
| `.../auth/script.container.ui` | Custom menu and alert dialogs |

To pin these explicitly — recommended before any Marketplace submission — see
[`docs/PRIVACY.md`](docs/PRIVACY.md), and **test every menu item afterwards**.

---

## Known limitations

Documented honestly rather than discovered by a user.

| # | Limitation | Impact | Fix |
|---|---|---|---|
| 1 | **Per-row API calls.** Links are written one `setFormula` at a time and zebra striping one `setBackground` per row — roughly 2 calls per file | Slows sharply past a few hundred files and can hit the 6-minute execution limit | Batch into one `setFormulas()` and one `setBackgrounds()` call |
| 2 | **No resume.** A folder large enough to time out must be re-run from scratch | Very large estates cannot complete | Continuation token + `PropertiesService` checkpoint |
| 3 | `Include Subfolders` must be a **real** boolean | The *text* `"FALSE"` is truthy in JavaScript, so a typed word silently enables recursion | Use a checkbox, or coerce the value in code |
| 4 | `getSize()` returns `0` for native Docs/Sheets/Slides | `Size (KB)` shows `0`; sorting by Size ranks them last | Show `—` for native types |
| 5 | **Shortcuts are indexed as shortcuts**, not resolved to their targets | Duplicate-looking or misleading rows | Resolve via the Advanced Drive Service |
| 6 | A `"` in the Link Button Label breaks the formula | Row shows a formula parse error | Escape the label |
| 7 | Permissions are not reported | The index shows what exists, not who can see it | Add a sharing-status column |

Item 1 is the one that matters commercially — fix it before selling this to anyone with
a large Drive. Ask and I'll batch it.

---

## Roadmap

- Batched writes and a continuation-token resume for large estates (limitations 1–2)
- Expected-vs-actual gap checking: declare the documents a folder *should* contain, get a missing list
- Sharing and permission columns
- Scheduled refresh via a time-driven trigger, with a change log of added/removed files
- Google Workspace Marketplace packaging

---

## Licence

**Proprietary — all rights reserved.** See [`LICENSE`](LICENSE).

This is not open source. No rights are granted by default, and cloning the repository
does not grant any. Evaluation, commercial, consulting and white-label licences are
available — see [`COMMERCIAL-LICENSE.md`](COMMERCIAL-LICENSE.md) for tiers and terms.

The licence documents are engineering templates, not legal advice. Have a lawyer review
them before taking payment.

---

<div align="center">
<sub>© 2026 Kalyan Vamsi Modepalli · FCA · CMA</sub>
</div>
