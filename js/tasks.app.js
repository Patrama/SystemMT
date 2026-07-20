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

  // 👤 Clean header context: team configuration removed per structural guidelines
  const header = document.createElement("h3");
  header.innerText = `👤 ${state.user.name}`;
  header.style.cssText =
    "margin-bottom: 20px; font-size: 16px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;";
  container.appendChild(header);

  if (state.tasks.length === 0) {
    container.innerHTML += `<p style="text-align:center; margin-top:30px; color:var(--text-secondary);">No current tasks assigned to your scope.</p>`;
    return container;
  }

  state.tasks.forEach((task, index) => {
    const card = document.createElement("div");
    card.className = "task-card";
    const taskKey = `${task["Client Name"] || "Client"}_${index}`;

    if (state.collapsedTasks[taskKey] === undefined) {
      state.collapsedTasks[taskKey] = false;
    }
    const isCollapsed = state.collapsedTasks[taskKey];

    const cardHeader = document.createElement("div");
    cardHeader.className = "task-header-row";

    const titleArea = document.createElement("div");
    titleArea.className = "task-title-area";
    titleArea.innerHTML = `
            <div class="task-inline-row">
                <span>🏢 ${task["Client Name"] || "N/A"}</span>
                <span style="font-weight: 500; opacity: 0.7; font-size: 14px;">🎯 ${task["Task"] || "N/A"}</span>
            </div>
        `;
    cardHeader.appendChild(titleArea);

    const checkboxWrap = document.createElement("div");
    checkboxWrap.className = "proof-checkbox-wrap";
    checkboxWrap.innerHTML = `<span>Proof</span>`;

    const checkboxInput = document.createElement("input");
    checkboxInput.type = "checkbox";
    checkboxInput.id = `chk-${taskKey}`;
    checkboxInput.checked = isCollapsed;
    checkboxInput.onchange = (e) => {
      state.collapsedTasks[taskKey] = e.target.checked;
      localStorage.setItem(
        `collapsed_tasks_${state.user.name}`,
        JSON.stringify(state.collapsedTasks),
      );
      renderView();
    };

    checkboxWrap.appendChild(checkboxInput);
    cardHeader.appendChild(checkboxWrap);

    cardHeader.onclick = (e) => {
      if (
        e.target.closest(".proof-checkbox-wrap") ||
        e.target.type === "checkbox"
      )
        return;
      state.collapsedTasks[taskKey] = !state.collapsedTasks[taskKey];
      renderView();
    };

    card.appendChild(cardHeader);

    const cardBody = document.createElement("div");
    cardBody.className = "task-body-content";
    cardBody.style.display = isCollapsed ? "none" : "block";
    cardBody.innerHTML = `
            <div class="important-note-container">
                <div class="note-title">⚠️ Important Note</div>
                <div class="note-content">${task["Note"] || "No explicit warnings attached."}</div>
            </div>
            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                <a href="${task["Client Contact Person"]}" target="_blank" class="action-btn" style="flex: 1; padding: 10px; font-size: 13px;">📞 Contact</a>
                <a href="${task["Location"]}" target="_blank" class="action-btn" style="flex: 1; padding: 10px; font-size: 13px; background-color: var(--border-color); color: var(--text-primary);">📍 Location</a>
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
