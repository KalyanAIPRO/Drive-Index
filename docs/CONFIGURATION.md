# Configuration reference

Every setting lives in the **`Config`** sheet. Labels sit in column `A`, editable
values in column `B`, guidance in column `C`. The script reads `B2:B8` only —
adding rows below row 8 is safe, but **do not reorder rows 2–8**, because the
script reads them by cell address, not by label.

---

## `B2` — Folder ID *(required)*

The ID of the folder to index.

```
https://drive.google.com/drive/folders/1AbC2dEfGhIjK3LmNoPqRsTuV?usp=sharing
                                       └────────── ID ───────────┘
```

Paste the ID only — not the full URL, and not the `?usp=` query string.

The run aborts with a clear alert if this is blank or still holds the placeholder
text. An invalid or inaccessible ID is caught and reported with Drive's own error
message.

**Shared drives:** works, provided your account can open the folder. The script
runs as whoever authorised it, so it sees exactly what that account sees.

---

## `B3` — Output Sheet Name

Default `File Index`. Created automatically if it does not exist.

⚠️ **The target tab is cleared on every run** (`clearContents` + `clearFormats`).
Never point this at a sheet holding your own work. Keep analysis in a *separate*
tab that references the index, so a re-run cannot destroy it.

---

## `B4` — Sort By

| Value | Order |
|---|---|
| `Name` | A→Z, locale-aware |
| `Type` | A→Z by derived file type |
| `Last Modified` | Newest first |
| `Size` | Largest first |

Matching is exact and case-sensitive. An unrecognised value leaves the rows in
Drive's own traversal order — no error is raised. The `#` column is renumbered
*after* sorting, so it always matches the visible order.

---

## `B5` — Include Subfolders

| Value | Behaviour |
|---|---|
| `FALSE` *(default)* | Top-level folder only |
| `TRUE` | Recurses into every nested subfolder |

**Use a real boolean** — insert a checkbox (**Insert → Tick box**) or type `TRUE`
so Sheets stores it as a boolean.

> **Trap:** the script tests this value for truthiness. If the cell holds the
> *text string* `"FALSE"`, JavaScript treats it as `true` and recursion switches
> on silently. A checkbox makes this impossible.

Recursion depth is unbounded. On a deep estate, expect the run to be slow — see
the limitations table in the README.

---

## `B6` / `B7` — Header Background / Font Colour

Hex strings, e.g. `#4285F4` and `#FFFFFF`. Applied to the header row only.
Blank falls back to the defaults.

Keep the pair legible: a dark background needs a light font. Nothing validates
contrast, so a dark-on-dark combination will render an invisible header.

---

## `B8` — Link Button Label

Text shown in every `Drive Link` cell — e.g. `Open File`, `View`, `📄 Open`.
Blank falls back to `Open File`.

⚠️ Do not include a double quote (`"`). The label is interpolated into a
`=HYPERLINK("url","label")` formula, so a quote terminates the string early and
the cell shows a formula parse error.

---

## Menu reference

| Item | Action |
|---|---|
| ▶️ Run Indexer | Reads `Config`, scans the folder, rewrites the output tab |
| ⚙️ Reset Config Sheet | Restores all defaults. Does **not** touch the index tab |
| ❓ How to use | In-sheet help dialog |

If the menu is missing, reload the spreadsheet — `onOpen` runs on load.

---

## Suggested pattern: don't analyse in the index tab

Because the output tab is wiped each run, build analysis in its own tab:

```
='File Index'!A:G          → pull the index
=COUNTIF('File Index'!C:C,"PDF")
=FILTER('File Index'!B:F,'File Index'!F:F<DATE(2026,1,1))
```

That way a refresh updates your analysis instead of deleting it.
