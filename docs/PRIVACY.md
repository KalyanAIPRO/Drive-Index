# Data handling & privacy

What this script touches, what it does not, and what you must document if you
publish it to the Google Workspace Marketplace.

---

## What it reads

Per file in the scanned folder, via `DriveApp`:

- File name
- MIME type
- Drive URL
- Last-updated timestamp
- Size in bytes
- Containing folder name (to build the breadcrumb path)

**It never reads file contents.** Metadata only.

## What it writes

Only to the active spreadsheet:

- The `Config` sheet (create / reset)
- The output tab named in `Config!B3` (cleared and rewritten each run)

**Nothing is written to Drive.** No file is moved, renamed, edited, shared or
deleted.

## Where data goes

Nowhere. There is no `UrlFetchApp` call, no external endpoint, no analytics, no
telemetry, no third-party library, no logging service. Execution stays inside
the user's own Google account, and the output stays in their own spreadsheet.

Zero runtime dependencies.

---

## Pinning OAuth scopes

The shipped `appsscript.json` has **no** `oauthScopes` array, so Apps Script
infers scopes from the APIs used. This is deliberate — an explicit allowlist
that omits a needed scope **fails silently**: the service throws internally, the
feature never works, and no error reaches the user.

To pin the minimum set — do this before a Marketplace submission, then **test
every menu item** — add:

```json
{
  "timeZone": "Asia/Kolkata",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/script.container.ui"
  ]
}
```

Verify after pinning:

1. Menu appears on reload → `script.container.ui` is fine.
2. `▶️ Run Indexer` indexes a folder → `drive.readonly` is fine.
3. `⚙️ Reset Config Sheet` works → `spreadsheets.currentonly` is fine.

If `DriveApp` raises a permission error, `drive.readonly` is insufficient for
your usage and you must widen to `https://www.googleapis.com/auth/drive`. That
is a broader grant — say so plainly in your privacy policy if you do.

---

## Confidentiality of the output

The index itself can be sensitive even though no file content is copied: a list
of file *names* can disclose client names, deal code names, salaries or matters.

- Treat a generated index with the same care as the folder it describes.
- Do not commit generated indexes to source control — `.gitignore` already
  excludes `*.xlsx`, `*.csv` and `/private/`.
- Share the output Sheet no more widely than the source folder.

---

## Marketplace checklist

If you publish this as a paid or free add-on:

- [ ] Pin `oauthScopes` to the minimum that actually works (above)
- [ ] Publish a public privacy policy and terms URL
- [ ] Complete OAuth verification — restricted Drive scopes trigger review
- [ ] State plainly that only metadata is accessed, and that nothing leaves the account
- [ ] Confirm no analytics or telemetry is added by any future dependency
- [ ] Provide a support contact that is not a work address
