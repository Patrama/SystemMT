/**
 * 🛰️ ENTERPRISE GATEWAY SYSTEM (Google Apps Script: Web App API)
 * Handles secure authentication, task filtering, verification uploading, and check-ins.
 *
 * @format
 */

// Target folder ID in Google Drive where work proof uploads will be organized
const DRIVE_FOLDER_ID = "1bIXyQq2moZPW09BU57uhdi9hGK9Mj9bq";

function doPost(e) {
  let requestData;
  try {
    requestData = JSON.parse(e.postData.contents);
  } catch (err) {
    return convertToOutput({
      success: false,
      message: "Invalid payload formatting.",
    });
  }

  const action = requestData.action;

  // Route incoming request vectors
  if (action === "login") {
    return handleLogin(requestData.userId, requestData.pin);
  } else if (action === "fetchTasks") {
    return handleFetchTasks(requestData.username, requestData.userTeam);
  } else if (action === "uploadProof") {
    return handleUploadProof(requestData);
  } else if (action === "checkInOrOut") {
    return handleAttendance(requestData);
  }

  return convertToOutput({
    success: false,
    message: "Action vector unrecognized.",
  });
}

/**
 * 🔑 Authenticate users and check the Login box (Column E)
 */
function handleLogin(userId, pin) {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users") ||
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("users");

  if (!sheet)
    return convertToOutput({ success: false, message: "Users sheet missing." });

  const data = sheet.getDataRange().getValues();

  // Loop through rows (i = 1 skips header row)
  for (let i = 1; i < data.length; i++) {
    const rowUserId = String(data[i][0] || "").trim();
    const rowPin = String(data[i][1] || "").trim();

    if (!rowUserId) continue; // Skip blank rows

    if (rowUserId === String(userId).trim() && rowPin === String(pin).trim()) {
      const rowIndex = i + 1; // Apps Script row numbers start at 1

      // 🟢 Set Column E (5th Column: 'Login') to TRUE
      sheet.getRange(rowIndex, 5).setValue(true);

      // Force Google Sheets to save changes immediately
      SpreadsheetApp.flush();

      return convertToOutput({
        success: true,
        user: {
          id: data[i][0],
          name: data[i][2],
          bypass: data[i][3], // Column D
          loginStatus: true,
        },
      });
    }
  }

  return convertToOutput({ success: false, message: "Invalid credentials." });
}

/**
 * 📋 Fetches and filters Tasks based on explicit user mentions and team hierarchies
 */
function handleFetchTasks(userName, userTeam) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tasks");
  if (!sheet) return convertToOutput({ success: true, tasks: [] });

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const filteredTasks = [];

  for (let i = 1; i < data.length; i++) {
    const taskRow = data[i];
    const assignedTarget = String(taskRow[0]).trim(); // Assumes first column dictates assignments

    // Check-in filter validation rules
    if (
      assignedTarget === userName ||
      assignedTarget === userTeam ||
      assignedTarget === "All"
    ) {
      let taskObj = {};
      headers.forEach((header, index) => {
        taskObj[header] = taskRow[index];
      });
      filteredTasks.push(taskObj);
    }
  }

  return convertToOutput({ success: true, tasks: filteredTasks });
}

/**
 * 📤 Processes image/video proof uploads and automatically names files based on client configurations
 */
function handleUploadProof(data) {
  try {
    const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    let fileUrl = "No File Attached";

    if (data.fileData && data.fileData.includes(",")) {
      // Decode base64 asset streams passed from mobile container viewport
      const contentType = data.fileData.match(/data:(.*);base64,/)[1];
      const base64Data = data.fileData.split(",")[1];
      const blob = Utilities.newBlob(
        Utilities.base64Decode(base64Data),
        contentType,
      );

      // Naming pattern schema match: [Client Name]_[Timestamp].[extension]
      const fileExt = contentType.split("/")[1] || "jpeg";
      const generatedFileName = `${data.clientName.replace(/\s+/g, "_")}_${Date.now()}.${fileExt}`;
      blob.setName(generatedFileName);

      const uploadedFile = parentFolder.createFile(blob);
      uploadedFile.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW,
      );
      fileUrl = uploadedFile.getUrl();

      // Generate explicit sidecar metadata log file pairing inside the exact same directory
      const metaFileName = `${generatedFileName}_details.txt`;
      const metaContent = `Uploader: ${data.userName}\nClient: ${data.clientName}\nNotes: ${data.employeeNotes}\nTimestamp: ${new Date().toISOString()}`;
      parentFolder.createFile(metaFileName, metaContent);
    }

    // Append history directly to your logging sheet tab
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet =
      ss.getSheetByName("ProofLogs") || ss.insertSheet("ProofLogs");
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow([
        "Timestamp",
        "User",
        "Client Name",
        "Notes",
        "File Link",
      ]);
    }
    logSheet.appendRow([
      new Date(),
      data.userName,
      data.clientName,
      data.employeeNotes,
      fileUrl,
    ]);

    return convertToOutput({
      success: true,
      fileUrl: fileUrl,
      message: "Proof uploaded successfully.",
    });
  } catch (error) {
    return convertToOutput({
      success: false,
      message: "Upload operation failure: " + error.toString(),
    });
  }
}

/**
 * ⏳ Appends validation data matrix structures into attendance logs
 */
function handleAttendance(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // 1. Fetch or create the Absence sheet
    const sheet =
      ss.getSheetByName("Absence") ||
      ss.getSheetByName("AttendanceLogs") ||
      ss.insertSheet("Absence");

    // 2. Set up headers if empty (Column A: Name, B: Date, C: In Time, D: Out Time)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Name", "Date", "In Time", "Out Time"]);
    }

    const userName = String(data.userName || "").trim();
    const dateStr = String(data.date || "").trim();
    const timeStr = String(data.time || "").trim();

    if (data.type === "in") {
      // Check if user already has an IN entry today
      const rows = sheet.getDataRange().getValues();
      let rowFound = false;

      for (let i = rows.length - 1; i >= 1; i--) {
        const rowName = String(rows[i][0]).trim();
        const rowDate = String(rows[i][1]).trim();

        if (
          rowName.toLowerCase() === userName.toLowerCase() &&
          rowDate === dateStr
        ) {
          // Update existing row's "In Time" (Column C / Index 3)
          sheet.getRange(i + 1, 3).setValue(timeStr);
          rowFound = true;
          break;
        }
      }

      // If no entry exists for today, append new row [Name, Date, In Time, Out Time]
      if (!rowFound) {
        sheet.appendRow([userName, dateStr, timeStr, ""]);
      }
    } else if (data.type === "out") {
      // Scan backward to find the active entry for today
      const rows = sheet.getDataRange().getValues();
      let logged = false;

      for (let i = rows.length - 1; i >= 1; i--) {
        const rowName = String(rows[i][0]).trim();
        const rowDate = String(rows[i][1]).trim();

        // Match Name and Date
        if (
          rowName.toLowerCase() === userName.toLowerCase() &&
          rowDate === dateStr
        ) {
          // Update "Out Time" in Column D (Index 4 in Google Sheets 1-based index)
          sheet.getRange(i + 1, 4).setValue(timeStr);
          logged = true;
          break;
        }
      }

      // Fallback: If no matching check-in entry was found today, append a new checkout row
      if (!logged) {
        sheet.appendRow([userName, dateStr, "", timeStr]);
      }
    }

    return convertToOutput({
      success: true,
      message: "Attendance registered clean ✅",
    });
  } catch (error) {
    return convertToOutput({
      success: false,
      message: "Logging engine error: " + error.toString(),
    });
  }
}

/**
 * Automatically unchecks the Bypass checkbox after a given duration
 */
function onEdit(e) {
  const sheet = e.range.getSheet();

  // Ensure edit happens in the USERS sheet
  if (sheet.getName() !== "USERS") return;

  const col = e.range.getColumn();
  const row = e.range.getRow();

  // Assuming 'Bypass' is column D or column 4 (adjust if needed)
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const bypassColIndex = headers.indexOf("Bypass") + 1;

  if (col === bypassColIndex && row > 1) {
    const isChecked = e.value === "TRUE";

    if (isChecked) {
      // Get duration (default 1 min = 60000ms)
      const durationMs = 60000;

      // Create a timed execution to uncheck the cell
      ScriptApp.newTrigger("autoResetBypass")
        .timeBased()
        .after(durationMs)
        .create();

      // Store cell coordinate in ScriptProperties so trigger knows which cell to uncheck
      PropertiesService.getScriptProperties().setProperty("RESET_ROW", row);
      PropertiesService.getScriptProperties().setProperty(
        "RESET_COL",
        bypassColIndex,
      );
    }
  }
}

/**
 * Triggered function that clears the checkbox
 */
function autoResetBypass() {
  const props = PropertiesService.getScriptProperties();
  const row = props.getProperty("RESET_ROW");
  const col = props.getProperty("RESET_COL");

  if (row && col) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("USERS");
    sheet.getRange(parseInt(row), parseInt(col)).setValue(false);
  }

  // Clean up all existing autoResetBypass triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "autoResetBypass") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

/**
 * 🛠️ Utility system output constructor formatting execution payloads to bypass CORS bounds safely
 */
function convertToOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// Global fallback handler routing framework checks
function doGet(e) {
  return ContentService.createTextOutput(
    "System Active. Serverless API Endpoint is online.",
  );
}
