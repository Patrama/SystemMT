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

  // Route incoming request vectors cleanly
  if (action === "checkSession") {
    return handleCheckSession(requestData.userId);
  } else if (action === "login") {
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
 * 🔑 Authenticate users and set the Login checkbox (Column E / 5th Column) to TRUE
 */
function handleLogin(userId, pin) {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users") ||
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("users");

  if (!sheet)
    return convertToOutput({ success: false, message: "Users sheet missing." });

  // Fetch all values from sheet
  const data = sheet.getDataRange().getValues();

  const targetUserId = String(userId || "")
    .trim()
    .toLowerCase();
  const targetPin = String(pin || "").trim();

  // Loop through rows (i = 1 skips header row)
  for (let i = 1; i < data.length; i++) {
    const rowUserId = String(data[i][0] || "")
      .trim()
      .toLowerCase();
    const rowPin = String(data[i][1] || "").trim();

    // Skip empty User ID rows
    if (!rowUserId) continue;

    // Case-insensitive match on UserID and exact match on PIN
    if (rowUserId === targetUserId && rowPin === targetPin) {
      const rowIndex = i + 1; // Google Sheets row numbers start at 1

      // 🟢 Force write TRUE directly into Column E (5th Column)
      const targetCell = sheet.getRange(rowIndex, 5);
      targetCell.setValue(true);

      // Force immediate engine write-through
      SpreadsheetApp.flush();

      return convertToOutput({
        success: true,
        user: {
          id: data[i][0],
          name: data[i][2],
          bypass: Boolean(data[i][3]), // Column D (Bypass)
          loginStatus: true,
        },
      });
    }
  }

  return convertToOutput({ success: false, message: "Invalid credentials." });
}

/**
 * 🔍 Validates if the user's Login checkbox (Column E) is still checked
 */
function handleCheckSession(userId) {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users") ||
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("users");

  if (!sheet) return convertToOutput({ isLoggedIn: false });

  const data = sheet.getDataRange().getValues();
  const targetUserId = String(userId || "")
    .trim()
    .toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const rowUserId = String(data[i][0] || "")
      .trim()
      .toLowerCase();
    if (rowUserId === targetUserId) {
      // Column E (Index 4) contains the Login status boolean
      const isLoginChecked = Boolean(data[i][4]);
      return convertToOutput({ isLoggedIn: isLoginChecked });
    }
  }

  return convertToOutput({ isLoggedIn: false });
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
 * Fixes single-row date matching using getDisplayValues() and enforces GMT+7 rules.
 */
function handleAttendance(data) {
  try {
    const userName = String(data.userName || "").trim();
    if (!userName) {
      return convertToOutput({
        success: false,
        message: "User identity missing from payload.",
      });
    }

    // 🔒 RATE LIMITING: Enforce a 10-second minimum gap between requests per user
    const scriptProps = PropertiesService.getScriptProperties();
    const rateLimitKey = "LAST_ATTENDANCE_" + userName.toUpperCase();
    const lastTimestamp = scriptProps.getProperty(rateLimitKey);
    const nowTimestamp = Date.now();

    if (lastTimestamp && nowTimestamp - parseInt(lastTimestamp, 10) < 10000) {
      const remainingSecs = Math.ceil(
        (10000 - (nowTimestamp - parseInt(lastTimestamp, 10))) / 1000,
      );
      return convertToOutput({
        success: false,
        message: `Rate limit active. Please wait ${remainingSecs} second(s) before retrying.`,
      });
    }

    // Update rate-limit lock
    scriptProps.setProperty(rateLimitKey, nowTimestamp.toString());

    // 🕒 Calculate current Date & Time in GMT+7
    const todayGMT7Str = Utilities.formatDate(
      new Date(),
      "GMT+7",
      "dd/MM/yyyy",
    );
    const timeGMT7Str = Utilities.formatDate(
      new Date(),
      "GMT+7",
      "hh:mm a", // Formats cleanly like "12:05 AM" to match your sheet
    );

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet =
      ss.getSheetByName("Absence") ||
      ss.getSheetByName("AttendanceLogs") ||
      ss.insertSheet("Absence");

    // Initialize headers if empty (Column A: Name, B: Date, C: In Time, D: Out Time)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Name", "Date", "In Time", "Out Time"]);
    }

    // 🔑 FIX: Use getDisplayValues() so dates are returned as visible strings ("04/08/2026")
    const rows = sheet.getDataRange().getDisplayValues();
    let existingRowIndex = -1;
    let existingInTime = "";
    let existingOutTime = "";

    // 🔍 Scan backward for matching User Name and Today's Date
    for (let i = rows.length - 1; i >= 1; i--) {
      const rowName = String(rows[i][0]).trim();
      const rowDate = String(rows[i][1]).trim();

      if (
        rowName.toLowerCase() === userName.toLowerCase() &&
        rowDate === todayGMT7Str
      ) {
        existingRowIndex = i + 1; // Google Sheets row (1-indexed)
        existingInTime = String(rows[i][2] || "").trim();
        existingOutTime = String(rows[i][3] || "").trim();
        break;
      }
    }

    // 🚦 Execute Rules
    if (data.type === "in") {
      // Rule: Already checked in today
      if (existingRowIndex !== -1 && existingInTime !== "") {
        return convertToOutput({
          success: false,
          message: "You're already checked in today.",
        });
      }

      if (existingRowIndex !== -1) {
        sheet.getRange(existingRowIndex, 3).setValue(timeGMT7Str);
      } else {
        sheet.appendRow([userName, todayGMT7Str, timeGMT7Str, ""]);
      }

      return convertToOutput({
        success: true,
        message: `Check-in recorded cleanly at ${timeGMT7Str} ✅`,
      });
    } else if (data.type === "out") {
      // Rule: Trying to check out without checking in first
      if (existingRowIndex === -1 || existingInTime === "") {
        return convertToOutput({
          success: false,
          message: "You must check in first before checking out.",
        });
      }

      // Rule: Already checked out today
      if (existingOutTime !== "") {
        return convertToOutput({
          success: false,
          message: "You already checked out today.",
        });
      }

      // 🎯 Updates Column D (Out Time) on the SAME row as Check-In!
      sheet.getRange(existingRowIndex, 4).setValue(timeGMT7Str);

      return convertToOutput({
        success: true,
        message: `Check-out recorded cleanly at ${timeGMT7Str} ✅`,
      });
    }

    return convertToOutput({
      success: false,
      message: "Unrecognized attendance type specified.",
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
