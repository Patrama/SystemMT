/**
 * 📋 WORKFLOW TASK MANAGEMENT ENGINE
 */

async function refreshTasks() {
  try {
    const storedSession = localStorage.getItem("enterprise_session");
    if (!storedSession) return;

    // Securely pull tasks using an identity-bound POST payload
    const response = await fetch(
      `${window.APP_CONFIG.vercelGatewayUrl}/api/tasks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: state.user.name }),
      },
    );

    if (!response.ok) throw new Error("Task collection gateway error.");
    const result = await response.json();
    state.tasks = result.tasks || [];
  } catch (e) {
    console.error("Task synchronization pipeline failed:", e);
    state.tasks = [];
  }
}

function createTasksComponent() {
  const container = document.createElement("div");
  container.style.width = "100%";

  // 1. Clean User Header (Keeps username clean, teams move to specific cards)
  const header = document.createElement("h3");
  header.style.cssText =
    "margin-bottom: 20px; font-size: 16px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;";
  header.innerHTML = `<span>👤 ${state.user.name}</span>`;
  container.appendChild(header);

  // 2. Filter out completed tasks completely on the frontend if marked "TRUE" or "Done" in spreadsheet
  const activeTasks = state.tasks.filter((task) => {
    const doneVal = (task["Done"] || task["done"] || "").trim().toLowerCase();
    return doneVal !== "true" && doneVal !== "yes" && doneVal !== "checked";
  });

  // 3. Fallback check for zero active items
  if (activeTasks.length === 0) {
    const noTasksMsg = document.createElement("p");
    noTasksMsg.style.cssText =
      "text-align:center; margin-top:30px; color: var(--text-secondary);";
    noTasksMsg.innerText = "No current tasks assigned to your scope.";
    container.appendChild(noTasksMsg);
    return container;
  }

  // 4. Render Active Tasks Loop
  activeTasks.forEach((task, index) => {
    const card = document.createElement("div");
    card.className = "task-card";
    const taskKey = `${task["Client Name"] || "Client"}_${index}`;

    if (state.collapsedTasks[taskKey] === undefined) {
      state.collapsedTasks[taskKey] = false;
    }
    const isCollapsed = state.collapsedTasks[taskKey];

    // 🔍 Parse dynamic card-level team assignment
    let teamString = "";
    const rawTeam = task["Team"] || task["team"] || "";
    if (rawTeam) {
      const totalTeamList = rawTeam.split(",").map((name) => name.trim());
      const otherMembers = totalTeamList.filter(
        (name) => name.toLowerCase() !== state.user.name.toLowerCase(),
      );
      if (otherMembers.length > 0) {
        teamString = ` <span style="font-size: 12px; color: #8a99ad; font-weight: 500; text-transform: none; opacity: 0.8;"># ${otherMembers.join(" - ")}</span>`;
      }
    }

    // 📅 Format Date context layout (Placed right beneath Client Name)
    const dateValue = task["Date"] || task["date"] || "";
    const dateLayout = dateValue
      ? `<div style="font-size: 12px; color: #8a99ad; margin-top: 2px; font-weight: 500;">📅 ${dateValue}</div>`
      : "";

    // ⏳ Handle dynamic Hours override vs Important Note content logic
    const hoursValue = task["Hours"] || task["hours"] || "";
    let noteTitle = "⚠️ IMPORTANT NOTE";
    let noteContent = task["Note"] || "No explicit warnings attached.";

    if (hoursValue) {
      noteTitle = "⚠️ REQUESTED HOURS";
      noteContent = `${hoursValue} Hours`;
    }

    const cardHeader = document.createElement("div");
    cardHeader.className = "task-header-row";
    cardHeader.style.cursor = "pointer";

    // Reconstruct title layout with custom task-level subheaders
    const titleArea = document.createElement("div");
    titleArea.className = "task-title-area";
    titleArea.style.width = "100%";
    titleArea.innerHTML = `
            <div class="task-inline-row" style="display: flex; justify-content: space-between; align-items: baseline; width: 100%;">
                <div>
                  <span style="font-weight: 600; font-size: 16px;">🏠 ${task["Client Name"] || "N/A"}</span>
                  ${dateLayout}
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                  <span style="font-weight: 500; opacity: 0.7; font-size: 14px;">🎯 ${task["Task"] || "N/A"}</span>
                  <div>${teamString}</div>
                </div>
            </div>
        `;
    cardHeader.appendChild(titleArea);

    // Click handler to toggle layout visibility states
    cardHeader.onclick = () => {
      state.collapsedTasks[taskKey] = !state.collapsedTasks[taskKey];
      localStorage.setItem(
        `collapsed_tasks_${state.user.name}`,
        JSON.stringify(state.collapsedTasks),
      );
      renderView();
    };

    card.appendChild(cardHeader);

    // 🔗 Outbound Absolute Route Validator for Messaging Redirects
    let contactUrl = task["Client Contact Person"] || "#";
    if (
      contactUrl !== "#" &&
      !contactUrl.startsWith("http://") &&
      !contactUrl.startsWith("https://")
    ) {
      contactUrl = `https://${contactUrl}`;
    }

    const cardBody = document.createElement("div");
    cardBody.className = "task-body-content";
    cardBody.style.display = isCollapsed ? "none" : "block";
    cardBody.innerHTML = `
            <div class="important-note-container">
                <div class="note-title">${noteTitle}</div>
                <div class="note-content">${noteContent}</div>
            </div>
            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                <a href="${contactUrl}" target="_blank" class="action-btn" style="flex: 1; padding: 10px; font-size: 13px;">📞 Contact</a>
                <a href="${task["Location"] || "#"}" target="_blank" class="action-btn" style="flex: 1; padding: 10px; font-size: 13px; background-color: var(--border-color); color: var(--text-primary);">📍 Location</a>
            </div>
            <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
                <label style="font-weight:600; font-size:13px; color: var(--text-secondary);">Upload Verification (Max: ${task["MaxPhotos"] || 1}):</label>
                <input type="file" id="proof-input-${index}" accept="image/*,video/*" style="width:100%;">
                <textarea id="proof-note-${index}" placeholder="Write completion parameters or validation remarks here..." style="width:100%; height:70px; padding:10px; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-color); border-radius:8px; resize:none; font-size:13px; outline:none; font-family:inherit;"></textarea>
                <button id="btn-upload-${index}" class="action-btn" style="background-color:var(--success); padding: 12px; font-size: 14px;">Submit Verification</button>
            </div>
        `;

    card.appendChild(cardBody);
    cardBody.querySelector(`#btn-upload-${index}`).onclick = () => {
      uploadWorkProof(index, task["Client Name"]);
    };

    container.appendChild(card);
  });

  return container;
}
// ... the rest of the state.tasks.forEach loop stays exactly the same ...

async function uploadWorkProof(index, clientName) {
  const fileInput = document.getElementById(`proof-input-${index}`);
  const notes = document.getElementById(`proof-note-${index}`).value;

  if (!fileInput || !fileInput.files[0]) {
    alert("Please load an element signature prior to transmission submission.");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onloadend = async () => {
    try {
      const payload = {
        action: "uploadProof",
        userName: state.user.name,
        clientName: clientName,
        employeeNotes: notes,
        fileData: reader.result,
      };

      const response = await fetch(
        `${window.APP_CONFIG.vercelGatewayUrl}/api/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        alert(
          "Upload verification signature passed to gateway processing center.",
        );
      } else {
        alert("Gateway validation reject pipeline executed.");
      }
    } catch (err) {
      console.error(err);
      alert("Network routing sync fault.");
    }
  };
  reader.readAsDataURL(file);
}
