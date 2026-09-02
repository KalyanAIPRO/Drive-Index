# Deploying — how "plug and play" actually works

## The short answer

**No. Apps Script cannot pull from GitHub.** There is no "import from Git" anywhere in the
Apps Script editor, no repository URL field, and no way to point a Google Sheet at this repo
and have it run. Google has never shipped that.

The bridge is always **`clasp`** — Google's official Apps Script CLI. It reads local files and
writes them into a script project over the Apps Script API. GitHub is where the code *lives*;
clasp is what *moves* it.

So "plug and play" means different things depending on who is plugging it in. Pick the route
that matches the person.

| Route | For | Clicks / commands | GitHub involved? |
|---|---|---|---|
| **1. Copyable Sheet template** | Buyers, colleagues, non-technical users | **1 click** | No |
| **2. `bootstrap` script** | You, deploying to a new Sheet | **1 command** | Yes (clone) |
| **3. GitHub Actions** | Continuous deploy on every commit | 0 (automatic) | Yes |
| **4. Marketplace add-on** | A real product with paying installs | 1 install | No |

---

## Route 1 — Copyable Sheet template *(the genuinely plug-and-play one)*

This is what you give a customer. They never see GitHub, clasp, or a line of code.

1. Deploy once yourself (Route 2).
2. In that Sheet, fill in the `Config` defaults you want shipped, and delete any real Folder ID.
3. Copy the Sheet's URL and replace the trailing `/edit...` with **`/copy`**:

   ```
   https://docs.google.com/spreadsheets/d/FILE_ID/copy
   ```

4. Share that link. Anyone who opens it gets **"Make a copy"** — their own Sheet, with the
   bound script already inside it.

**What the recipient does:** click, then `📁 Drive Indexer → ▶️ Run Indexer`, paste a Folder ID,
approve the permission prompt once. That's it.

**Caveats worth knowing before you sell this:**

- Set the source Sheet's sharing to **Anyone with the link → Viewer**, or `/copy` fails for them.
- They get a **snapshot**. Fix a bug and existing copies keep the old code — there is no update
  channel. That is the core limitation of template distribution, and the reason Route 4 exists.
- Each copy is bound to *their* Google account and runs with *their* Drive permissions. You
  never gain access to their files, and they never gain access to yours.
- The script is fully readable and editable by whoever holds the copy. `LICENSE` is your only
  protection here, not obscurity.

---

## Route 2 — One command, from this repo

```bash
git clone https://github.com/KalyanAIPRO/Drive-Index.git
cd Drive-Index
clasp login            # once per machine
./bootstrap.sh "Drive Index"
```

Windows PowerShell:

```powershell
.\bootstrap.ps1 "Drive Index"
```

`bootstrap` will:

1. install `clasp` if missing, and check you are logged in;
2. **run the test harness and refuse to deploy if it fails**;
3. create a **new Google Sheet with the script already bound** (`clasp create-script --type sheets`);
4. push `Code.gs` + `appsscript.json`;
5. open the Sheet.

Re-running is safe — if `.clasp.json` already exists it pushes to that project instead of
creating another Sheet.

> **Why `.claspignore` matters.** Without it `clasp push` uploads every `.js`/`.json` in the
> repo, including `test/harness.js` — which uses `require()`/`module` and would land in the
> Apps Script project as a broken file. The allowlist restricts the push to `Code.gs` and
> `appsscript.json`. Do not delete it.

### Attaching to a Sheet you already have

```bash
cp .clasp.json.example .clasp.json
```

Put that Sheet's **script ID** in it (Sheet → Extensions → Apps Script → Project Settings →
Script ID), then `clasp push --force`.

---

## Route 3 — GitHub Actions (continuous deploy)

`.github/workflows/deploy.yml` runs the harness on every push and PR, and on `main` pushes the
code to Apps Script automatically.

Two repository secrets are required (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `CLASPRC_JSON` | Entire contents of your local `~/.clasprc.json` (after `clasp login`) |
| `SCRIPT_ID` | Script ID of the target bound project |

⚠️ **Read this before enabling.**

- `~/.clasprc.json` contains a **live OAuth refresh token for your Google account**. Treat it
  like a password. Anyone who obtains it can act on your Drive as you.
- **Never commit it.** `.gitignore` already excludes `.clasprc.json`, and the workflow writes it
  at runtime from the secret.
- The deploy job is gated on `github.event_name != 'pull_request'`, so a fork's PR can never
  reach the secrets. Do not loosen that condition.
- The job targets an `apps-script` environment — add a required reviewer there if you want a
  manual approval gate before anything touches the live script.
- **While this repository is public, prefer Route 2.** Public repos make secret handling
  higher-stakes for no benefit here, since only you deploy. Enable Actions after you flip the
  repo to private.
- Revoke at any time: <https://myaccount.google.com/permissions> → Apps Script → Remove access,
  then `clasp login` again.

---

## Route 4 — Google Workspace Marketplace add-on

The only route that gives you **installs you can update and charge for**.

- Users install from the Marketplace; your fix reaches everyone on the next load.
- Requires a Google Cloud project, an OAuth consent screen, **OAuth verification review**
  (Drive scopes are restricted, so expect a security assessment), a published privacy policy
  and terms URL.
- Start from the checklist in [`PRIVACY.md`](PRIVACY.md), and pin `oauthScopes` before you submit.
- Budget weeks, not days, for verification.

---

## Which to use

- **Selling or sharing it →** Route 1. One click, no explanation needed.
- **Your own redeploys →** Route 2. One command, tests gate it.
- **Team repo, frequent changes →** Route 3, once the repo is private.
- **A real product with recurring revenue →** Route 4.

## Reminder

For a **bound** script there is no separate "deploy" step — reloading the Sheet picks up the
pushed code, because the menu is built by `onOpen`. `push ≠ deploy` only applies to web apps
and add-ons, where a new *version* must be published for users to see a change.
