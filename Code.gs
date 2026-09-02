/**
 * Drive Index — index any Google Drive folder into a formatted spreadsheet.
 *
 * Container-bound Google Apps Script. All behaviour is driven by the "Config"
 * sheet; no code edit is required to change folder, sort order, colours or
 * labels. See README.md and docs/CONFIGURATION.md.
 *
 * Copyright (c) 2026 Kalyan Vamsi Modepalli. All rights reserved.
 * Licensed under the terms in LICENSE. Commercial use requires a separate
 * licence — see COMMERCIAL-LICENSE.md.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📁 Drive Indexer")
    .addItem("▶️ Run Indexer", "indexDriveFolder")
    .addItem("⚙️ Reset Config Sheet", "resetConfig")
    .addSeparator()
    .addItem("❓ How to use", "showHelp")
    .addToUi();
}

// ── Main Function ─────────────────────────────────────────────
function indexDriveFolder() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get or create Config sheet
  var configSheet = ss.getSheetByName("Config");
  if (!configSheet) {
    configSheet = ss.insertSheet("Config");
    setupConfigSheet(configSheet);
    SpreadsheetApp.getUi().alert("⚙️ Config sheet created!\n\nFill in the settings in the 'Config' sheet, then run again.");
    return;
  }

  // Read config values
  var FOLDER_ID          = configSheet.getRange("B2").getValue().toString().trim();
  var OUTPUT_SHEET       = configSheet.getRange("B3").getValue().toString().trim();
  var SORT_BY            = configSheet.getRange("B4").getValue().toString().trim();
  var INCLUDE_SUBFOLDERS = configSheet.getRange("B5").getValue();
  var HEADER_COLOR       = configSheet.getRange("B6").getValue().toString().trim();
  var HEADER_FONT        = configSheet.getRange("B7").getValue().toString().trim();
  var LINK_LABEL         = configSheet.getRange("B8").getValue().toString().trim();

  // Validate Folder ID
  if (!FOLDER_ID || FOLDER_ID === "Paste your Google Drive Folder ID here") {
    SpreadsheetApp.getUi().alert("❌ Please paste your Folder ID in cell B2 of the Config sheet.");
    return;
  }

  // Get or create output sheet
  var sheet = ss.getSheetByName(OUTPUT_SHEET);
  if (!sheet) sheet = ss.insertSheet(OUTPUT_SHEET);
  sheet.clearContents();
  sheet.clearFormats();

  // Fetch folder
  var folder;
  try {
    folder = DriveApp.getFolderById(FOLDER_ID);
  } catch(e) {
    SpreadsheetApp.getUi().alert("❌ Invalid Folder ID. Please check cell B2.\n\n" + e.message);
    return;
  }

  // Collect files
  var data = [];
  collectFiles(folder, data, INCLUDE_SUBFOLDERS, "");

  // Sort
  if (SORT_BY === "Name")          data.sort(function(a,b){ return a[1].localeCompare(b[1]); });
  else if (SORT_BY === "Type")     data.sort(function(a,b){ return a[2].localeCompare(b[2]); });
  else if (SORT_BY === "Last Modified") data.sort(function(a,b){ return new Date(b[4]) - new Date(a[4]); });
  else if (SORT_BY === "Size")     data.sort(function(a,b){ return b[5] - a[5]; });

  // Re-number after sort
  for (var i = 0; i < data.length; i++) data[i][0] = i + 1;

  // Write headers
  var headers = ["#", "File Name", "File Type", "Drive Link", "Folder Path", "Last Modified", "Size (KB)"];
  sheet.appendRow(headers);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground(HEADER_COLOR || "#4285F4");
  headerRange.setFontColor(HEADER_FONT || "#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(11);

  // Write data
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }

  // Make links clickable
  var label = LINK_LABEL || "Open File";
  for (var r = 0; r < data.length; r++) {
    var url = data[r][3];
    sheet.getRange(r + 2, 4).setFormula('=HYPERLINK("' + url + '","' + label + '")');
  }

  // Formatting
  sheet.setFrozenRows(1);
  for (var col = 1; col <= headers.length; col++) sheet.autoResizeColumn(col);

  // Alternate row colors
  for (var row = 2; row <= data.length + 1; row++) {
    sheet.getRange(row, 1, 1, headers.length).setBackground(row % 2 === 0 ? "#F8F9FA" : "#FFFFFF");
  }

  SpreadsheetApp.getUi().alert("✅ Done! Indexed " + data.length + " files from:\n📁 " + folder.getName());
}

// ── Collect Files ─────────────────────────────────────────────
function collectFiles(folder, data, includeSubfolders, path) {
  var files = folder.getFiles();
  var folderPath = path === "" ? folder.getName() : path + " / " + folder.getName();

  while (files.hasNext()) {
    var file = files.next();
    var type = file.getMimeType().split("/").pop().split(".").pop().toUpperCase();
    data.push([
      0,
      file.getName(),
      type,
      file.getUrl(),
      folderPath,
      file.getLastUpdated(),
      Math.round(file.getSize() / 1024)
    ]);
  }

  if (includeSubfolders) {
    var subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      collectFiles(subfolders.next(), data, true, folderPath);
    }
  }
}

// ── Setup Config Sheet ────────────────────────────────────────
function setupConfigSheet(sheet) {
  sheet.clearContents();
  sheet.clearFormats();

  var config = [
    ["SETTING",            "VALUE",                                   "NOTES"],
    ["Folder ID",          "Paste your Google Drive Folder ID here",  "From URL: drive.google.com/drive/folders/FOLDER_ID"],
    ["Output Sheet Name",  "File Index",                              "Sheet name where results will be written"],
    ["Sort By",            "Name",                                    "Options: Name | Type | Last Modified | Size"],
    ["Include Subfolders", false,                                      "TRUE = include subfolders | FALSE = top folder only"],
    ["Header Background",  "#4285F4",                                 "Hex color for header background"],
    ["Header Font Color",  "#FFFFFF",                                 "Hex color for header text"],
    ["Link Button Label",  "Open File",                               "Text shown in the Drive Link column"],
  ];

  sheet.getRange(1, 1, config.length, 3).setValues(config);

  // Header row styling
  var topRow = sheet.getRange(1, 1, 1, 3);
  topRow.setBackground("#34A853");
  topRow.setFontColor("#FFFFFF");
  topRow.setFontWeight("bold");

  // Label column
  sheet.getRange(2, 1, config.length - 1, 1)
    .setFontWeight("bold")
    .setBackground("#F1F3F4");

  // Value column
  sheet.getRange(2, 2, config.length - 1, 1)
    .setBackground("#FFFDE7")
    .setFontWeight("bold");

  // Notes column
  sheet.getRange(2, 3, config.length - 1, 1)
    .setFontColor("#888888")
    .setFontStyle("italic");

  // Auto-resize columns
  sheet.autoResizeColumn(1);
  sheet.autoResizeColumn(2);
  sheet.autoResizeColumn(3);
  sheet.setFrozenRows(1);
}

// ── Reset Config ──────────────────────────────────────────────
function resetConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName("Config");
  if (!configSheet) configSheet = ss.insertSheet("Config");
  setupConfigSheet(configSheet);
  SpreadsheetApp.getUi().alert("✅ Config sheet has been reset to defaults.");
}

// ── Help ──────────────────────────────────────────────────────
function showHelp() {
  SpreadsheetApp.getUi().alert(
    "📖 HOW TO USE\n\n" +
    "1. Go to the 'Config' sheet\n" +
    "2. Paste your Folder ID in cell B2\n" +
    "   (Get it from the folder URL after /folders/)\n" +
    "3. Adjust other settings if needed\n" +
    "4. Use  📁 Drive Indexer → ▶️ Run Indexer\n" +
    "   OR click the green Run button on the Config sheet\n\n" +
    "⚙️ SETTINGS\n" +
    "• Output Sheet Name – where results appear\n" +
    "• Sort By – Name / Type / Last Modified / Size\n" +
    "• Include Subfolders – TRUE scans nested folders\n\n" +
    "🔗 Folder ID example:\n" +
    "drive.google.com/drive/folders/THIS_IS_YOUR_ID"
  );
}
