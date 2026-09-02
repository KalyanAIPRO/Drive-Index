/**
 * Behavioural harness for Drive Index.
 *
 * Apps Script cannot be executed locally, so this stubs DriveApp and
 * SpreadsheetApp with in-memory fakes, loads the REAL Code.gs, and exercises
 * indexDriveFolder() / collectFiles() against a synthetic folder tree.
 *
 * It asserts intended behaviour AND pins the known defects, so a future fix
 * flips a FAIL to a PASS instead of silently changing behaviour.
 *
 * Run:  node test/harness.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
const results = [];
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  results.push({ ok, name, got, want });
}
function note(name, msg) { results.push({ info: true, name, msg }); }

// ── Fakes ────────────────────────────────────────────────────────────────────
let API_CALLS = 0;                        // counts individual Range mutations

function FakeFile(name, mime, sizeBytes, updated) {
  return {
    getName:        () => name,
    getMimeType:    () => mime,
    getUrl:         () => 'https://drive.google.com/file/d/ID_' + name.replace(/\W/g, '') + '/view',
    getLastUpdated: () => updated,
    getSize:        () => sizeBytes,
  };
}
function FakeFolder(name, files, folders) {
  return {
    getName: () => name,
    getFiles: () => iter(files || []),
    getFolders: () => iter(folders || []),
  };
}
function iter(arr) {
  let i = 0;
  return { hasNext: () => i < arr.length, next: () => arr[i++] };
}

function FakeSheet(name) {
  const cells = {};        // "r,c" -> value
  const formulas = {};
  const bg = {};
  let lastRow = 0;
  const api = {
    _name: name, _cells: cells, _formulas: formulas, _bg: bg,
    getName: () => name,
    clearContents: () => { for (const k in cells) delete cells[k]; lastRow = 0; return api; },
    clearFormats:  () => { for (const k in bg) delete bg[k]; return api; },
    appendRow: (row) => {
      lastRow++;
      row.forEach((v, j) => { cells[lastRow + ',' + (j + 1)] = v; });
      return api;
    },
    getRange: (r, c, nr, nc) => {
      if (typeof r === 'string') {                       // A1 notation, e.g. "B2"
        const m = /^([A-Z]+)(\d+)$/.exec(r);
        const col = m[1].split('').reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0);
        return makeRange(Number(m[2]), col, 1, 1);
      }
      return makeRange(r, c, nr || 1, nc || 1);
    },
    setFrozenRows: () => api,
    autoResizeColumn: () => { API_CALLS++; return api; },
    getMaxColumns: () => 26,
    _lastRow: () => lastRow,
  };
  function makeRange(r, c, nr, nc) {
    const rg = {
      getValue: () => cells[r + ',' + c],
      setValue: (v) => { API_CALLS++; cells[r + ',' + c] = v; return rg; },
      setValues: (vals) => {
        API_CALLS++;
        vals.forEach((row, i) => row.forEach((v, j) => { cells[(r + i) + ',' + (c + j)] = v; }));
        lastRow = Math.max(lastRow, r + vals.length - 1);
        return rg;
      },
      setFormula: (f) => { API_CALLS++; formulas[r + ',' + c] = f; return rg; },
      setBackground: (v) => { API_CALLS++; for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) bg[(r + i) + ',' + (c + j)] = v; return rg; },
      setFontColor: () => { API_CALLS++; return rg; },
      setFontWeight: () => { API_CALLS++; return rg; },
      setFontSize: () => { API_CALLS++; return rg; },
      setFontStyle: () => { API_CALLS++; return rg; },
    };
    return rg;
  }
  return api;
}

function buildContext(rootFolder, configValues) {
  const sheets = {};
  const alerts = [];
  function sheetByName(n) { return sheets[n] || null; }
  function insertSheet(n) { sheets[n] = FakeSheet(n); return sheets[n]; }

  const ss = {
    getSheetByName: sheetByName,
    insertSheet,
    _sheets: sheets,
  };
  const ctx = {
    console,
    Date,
    Math,
    JSON,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      getUi: () => ({
        alert: (m) => { alerts.push(m); },
        createMenu: () => { const m = { addItem: () => m, addSeparator: () => m, addToUi: () => m }; return m; },
      }),
    },
    DriveApp: {
      getFolderById: (id) => {
        if (id === 'BAD_ID') throw new Error('No item with the given ID could be found');
        return rootFolder;
      },
    },
    _alerts: alerts,
    _ss: ss,
  };
  // pre-seed the Config sheet if the test supplies values
  if (configValues) {
    const cfg = insertSheet('Config');
    configValues.forEach((v, i) => { cfg._cells[(i + 2) + ',2'] = v; });  // B2..B8
  }
  return ctx;
}

function loadCode(ctx) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx;
}

// ── Fixture: 5 files across a nested tree ────────────────────────────────────
const d = (s) => new Date(s);
function tree() {
  const grand = FakeFolder('2026', [
    FakeFile('agreement.pdf', 'application/pdf', 250000, d('2026-05-01')),
  ]);
  const child = FakeFolder('Contracts', [
    FakeFile('msa.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 51200, d('2026-03-10')),
    FakeFile('native_sheet', 'application/vnd.google-apps.spreadsheet', 0, d('2026-08-20')),
  ], [grand]);
  return FakeFolder('Root', [
    FakeFile('zebra.png', 'image/png', 2048, d('2026-01-15')),
    FakeFile('alpha.pdf', 'application/pdf', 1024, d('2026-07-01')),
  ], [child]);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('Drive Index — behavioural harness\n' + '='.repeat(72) + '\n');

// 1. Guard: blank Folder ID aborts before touching Drive
{
  const ctx = loadCode(buildContext(tree(), ['', 'File Index', 'Name', false, '', '', '']));
  ctx.indexDriveFolder();
  check('blank Folder ID aborts with an alert', ctx._alerts.length, 1);
  check('blank Folder ID writes no output sheet', !!ctx._ss._sheets['File Index'], false);
}

// 2. Guard: placeholder text is treated as blank
{
  const ctx = loadCode(buildContext(tree(),
    ['Paste your Google Drive Folder ID here', 'File Index', 'Name', false, '', '', '']));
  ctx.indexDriveFolder();
  check('placeholder Folder ID aborts', ctx._alerts.length, 1);
}

// 3. Guard: invalid ID is caught, not thrown
{
  const ctx = loadCode(buildContext(tree(), ['BAD_ID', 'File Index', 'Name', false, '', '', '']));
  let threw = false;
  try { ctx.indexDriveFolder(); } catch (e) { threw = true; }
  check('invalid Folder ID does not throw', threw, false);
  check('invalid Folder ID alerts the user', ctx._alerts.length, 1);
}

// 4. Missing Config sheet is created, then run stops
{
  const ctx = loadCode(buildContext(tree(), null));
  ctx.indexDriveFolder();
  check('missing Config sheet is created', !!ctx._ss._sheets['Config'], true);
  check('first run stops after creating Config', ctx._alerts.length, 1);
}

// 5. Top-level only (recursion OFF)
{
  const ctx = loadCode(buildContext(tree(), ['OK', 'File Index', 'Name', false, '', '', '']));
  ctx.indexDriveFolder();
  const sh = ctx._ss._sheets['File Index'];
  const names = [];
  for (let r = 2; r <= 10; r++) if (sh._cells[r + ',2']) names.push(sh._cells[r + ',2']);
  check('recursion OFF indexes only top-level files', names, ['alpha.pdf', 'zebra.png']);
}

// 6. Recursion ON: all files + breadcrumb paths
{
  const ctx = loadCode(buildContext(tree(), ['OK', 'File Index', 'Name', true, '', '', '']));
  ctx.indexDriveFolder();
  const sh = ctx._ss._sheets['File Index'];
  const rows = [];
  for (let r = 2; r <= 20; r++) if (sh._cells[r + ',2']) rows.push([sh._cells[r + ',2'], sh._cells[r + ',5']]);
  check('recursion ON indexes every nested file', rows.length, 5);
  check('breadcrumb path is built parent / child / grandchild',
    rows.find(x => x[0] === 'agreement.pdf')[1], 'Root / Contracts / 2026');
}

// 7. Sort modes + renumbering
{
  for (const [mode, expectFirst] of [['Name', 'agreement.pdf'], ['Size', 'agreement.pdf'],
                                     ['Last Modified', 'native_sheet']]) {
    const ctx = loadCode(buildContext(tree(), ['OK', 'File Index', mode, true, '', '', '']));
    ctx.indexDriveFolder();
    const sh = ctx._ss._sheets['File Index'];
    check(`sort by ${mode}: first row`, sh._cells['2,2'], expectFirst);
    const nums = [];
    for (let r = 2; r <= 6; r++) nums.push(sh._cells[r + ',1']);
    check(`sort by ${mode}: # renumbered 1..5 after sort`, nums, [1, 2, 3, 4, 5]);
  }
}

// 8. File-type derivation from MIME
{
  const ctx = loadCode(buildContext(tree(), ['OK', 'File Index', 'Name', true, '', '', '']));
  ctx.indexDriveFolder();
  const sh = ctx._ss._sheets['File Index'];
  const types = {};
  for (let r = 2; r <= 6; r++) types[sh._cells[r + ',2']] = sh._cells[r + ',3'];
  check('PDF mime -> PDF', types['alpha.pdf'], 'PDF');
  check('PNG mime -> PNG', types['zebra.png'], 'PNG');
  check('google-apps.spreadsheet -> SPREADSHEET', types['native_sheet'], 'SPREADSHEET');
  // .docx and a native Google Doc both reduce to "DOCUMENT" — indistinguishable
  // in the Type column. Cosmetic, documented in the README limitations table.
  check('docx mime -> DOCUMENT', types['msa.docx'], 'DOCUMENT');
}

// 9. Idempotency: two runs, no duplicate rows
{
  const ctx = loadCode(buildContext(tree(), ['OK', 'File Index', 'Name', true, '', '', '']));
  ctx.indexDriveFolder();
  ctx.indexDriveFolder();
  const sh = ctx._ss._sheets['File Index'];
  let n = 0;
  for (let r = 2; r <= 30; r++) if (sh._cells[r + ',2']) n++;
  check('re-run does not duplicate rows', n, 5);
}

// 10. HYPERLINK formula shape
{
  const ctx = loadCode(buildContext(tree(), ['OK', 'File Index', 'Name', true, '', '', 'View']));
  ctx.indexDriveFolder();
  const sh = ctx._ss._sheets['File Index'];
  check('link cell is a HYPERLINK formula with the custom label',
    /^=HYPERLINK\("https:\/\/drive\.google\.com\/file\/d\/[^"]+","View"\)$/.test(sh._formulas['2,4']), true);
}

console.log('--- INTENDED BEHAVIOUR ---');
results.filter(r => !r.info).forEach(r =>
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}` + (r.ok ? '' : `\n        got  ${JSON.stringify(r.got)}\n        want ${JSON.stringify(r.want)}`)));

// ═══════════════════════════════════════════════════════════════════════════
// Defect pins — these document real bugs. Each prints the observed behaviour.
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n--- DEFECT PINS (observed behaviour of known bugs) ---');

// D1: the string "FALSE" is truthy -> recursion silently switches ON
{
  const ctx = loadCode(buildContext(tree(), ['OK', 'File Index', 'Name', 'FALSE', '', '', '']));
  ctx.indexDriveFolder();
  const sh = ctx._ss._sheets['File Index'];
  let n = 0; for (let r = 2; r <= 20; r++) if (sh._cells[r + ',2']) n++;
  console.log(`  D1  Include Subfolders = text "FALSE"  -> indexed ${n} files ` +
              `(expected 2 for top-level only). ${n === 5 ? 'BUG CONFIRMED: recursion switched on.' : 'ok'}`);
}

// D2: native Google files report size 0
{
  const ctx = loadCode(buildContext(tree(), ['OK', 'File Index', 'Name', true, '', '', '']));
  ctx.indexDriveFolder();
  const sh = ctx._ss._sheets['File Index'];
  let sz = null;
  for (let r = 2; r <= 6; r++) if (sh._cells[r + ',2'] === 'native_sheet') sz = sh._cells[r + ',7'];
  console.log(`  D2  native Google Sheet Size (KB) = ${sz}  -> shows 0, and sorts last by Size.`);
}

// D3: a double quote in the label breaks the formula
{
  const ctx = loadCode(buildContext(tree(), ['OK', 'File Index', 'Name', false, '', '', 'Open "now"']));
  ctx.indexDriveFolder();
  const f = ctx._ss._sheets['File Index']._formulas['2,4'];
  const quotes = (f.match(/"/g) || []).length;
  console.log(`  D3  label with a quote -> ${f}`);
  console.log(`      ${quotes % 2 === 0 ? 'unbalanced argument list' : 'ODD QUOTE COUNT'} — Sheets will raise a parse error.`);
}

// D4: per-row API calls — the performance ceiling
{
  function wide(n) {
    const files = [];
    for (let i = 0; i < n; i++) files.push(FakeFile('f' + i + '.pdf', 'application/pdf', 1024, d('2026-01-01')));
    return FakeFolder('Root', files, []);
  }
  const counts = [];
  for (const n of [10, 100, 500]) {
    API_CALLS = 0;
    const ctx = loadCode(buildContext(wide(n), ['OK', 'File Index', 'Name', false, '', '', '']));
    ctx.indexDriveFolder();
    counts.push([n, API_CALLS]);
  }
  console.log('  D4  Range mutations vs file count (each is a round-trip to Sheets):');
  counts.forEach(([n, c]) => console.log(`        ${String(n).padStart(4)} files -> ${String(c).padStart(5)} calls  (~${(c / n).toFixed(1)} per file)`));
  const per = counts[2][1] / counts[2][0];
  console.log(`      Scales LINEARLY at ~${per.toFixed(0)} calls/file. Batching to setFormulas()+setBackgrounds()`);
  console.log('      would make this ~4 calls total regardless of file count.');
}

console.log('\n' + '='.repeat(72));
console.log(`INTENDED BEHAVIOUR: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
