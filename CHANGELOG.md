# Changelog

All notable changes to Drive Index. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [Semantic Versioning](https://semver.org/).

## [1.0.1] — 2026-09-02

### Fixed
- **`Sort By = Size` sorted by Last Modified instead of size.** The comparator
  read row index `5` (the last-modified date) rather than `6` (size in KB).
  Because JavaScript coerces `Date` subtraction to a number, it produced a
  plausible-looking but wrong order with no error.
- **`Sort By = Last Modified` did not sort at all.** The comparator read row
  index `4` (the folder-path string) and passed it to `new Date()`, yielding
  `NaN` for every comparison. The rows silently stayed in Drive's own traversal
  order.

Both were off-by-one against the row shape built in `collectFiles()`
(`0=#  1=Name  2=Type  3=Link  4=Folder Path  5=Last Modified  6=Size`). Two of
the four advertised sort modes were therefore broken. Column indices are now
commented at the sort site.

### Added
- `test/harness.js` — a local behavioural harness. Apps Script cannot run
  offline, so it stubs `DriveApp`/`SpreadsheetApp`, loads the real `Code.gs`, and
  exercises it against a synthetic folder tree: 22 assertions covering guard
  clauses, recursion and breadcrumbs, all four sort modes, renumbering, MIME
  type derivation, idempotency and formula shape. It also pins the four known
  defects so a future fix flips observed behaviour rather than changing it
  silently. Run with `node test/harness.js`.

---

## [1.0.0] — 2026-09-02

First released version.

### Added
- `📁 Drive Indexer` custom menu: Run Indexer · Reset Config Sheet · How to use.
- Config-sheet control panel (`Config!B2:B8`) — folder, output tab, sort order,
  recursion, header colours, link label. No code edit needed to change behaviour.
- Recursive folder scan with breadcrumb `Folder Path`.
- Four sort modes: Name, Type, Last Modified, Size. Row numbering applied after
  sorting so `#` matches the visible order.
- Clickable `HYPERLINK` per row with a configurable label.
- Formatted output: frozen header, coloured header band, zebra striping,
  auto-sized columns.
- Guard clauses for a blank/placeholder Folder ID and for an invalid or
  inaccessible folder, each surfacing an actionable alert.
- Idempotent runs — the output tab is cleared and rewritten, never appended.
- Documentation: `README.md`, `docs/CONFIGURATION.md`, `docs/PRIVACY.md`.
- Proprietary licence plus commercial licensing tiers.

### Known limitations
Carried openly rather than left to be discovered — see the README table.
- Per-row `setFormula` / `setBackground` writes (~2 API calls per file) slow
  sharply past a few hundred files and can hit the 6-minute execution limit.
- No continuation/resume, so a timed-out run restarts from scratch.
- `Include Subfolders` must be a real boolean; the text `"FALSE"` is truthy.
- `getSize()` returns `0` for native Google Docs/Sheets/Slides.
- Shortcuts are indexed as shortcuts, not resolved to their targets.
- A `"` in the link label breaks the formula.
- Sharing/permission status is not reported.

---

## Planned

### [1.1.0] — performance
- Batch writes: one `setFormulas()` and one `setBackgrounds()` call.
- Continuation token + `PropertiesService` checkpoint to survive the execution
  limit and resume.
- Coerce `Include Subfolders` so a text value cannot enable recursion.

### [1.2.0] — coverage
- Resolve shortcuts to their targets.
- Show `—` instead of `0` for native file sizes.
- Sharing and permission columns.

### [1.3.0] — process
- Expected-vs-actual gap check: declare required documents, get a missing list.
- Scheduled refresh with an added/removed change log.
