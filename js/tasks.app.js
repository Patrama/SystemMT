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
  container.className = "content-stack";

  const header = document.createElement("div");
  header.className = "section-header";
  const headerCopy = document.createElement("div");

  const headerTitle = document.createElement("h2");
  headerTitle.className = "page-title";
  headerTitle.textContent = `👤 ${state.user.name}`;

  const headerDescription = document.createElement("p");
  headerDescription.className = "page-copy";
  headerDescription.textContent = "Active task queue assigned to your scope.";

  headerCopy.appendChild(headerTitle);
  headerCopy.appendChild(headerDescription);
  header.appendChild(headerCopy);
  container.appendChild(header);

  const activeTasks = state.tasks.filter((task) => {
    const doneVal = (task["Done"] || task["done"] || "").trim().toLowerCase();
    return doneVal !== "true" && doneVal !== "yes" && doneVal !== "checked";
  });

  if (activeTasks.length === 0) {
    const noTasksMsg = document.createElement("div");
    noTasksMsg.className = "empty-state";
    noTasksMsg.textContent = "No current tasks assigned to your scope.";
    container.appendChild(noTasksMsg);
    return container;
  }

  const fragment = document.createDocumentFragment();

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
        teamString = otherMembers.join(" · ");
      }
    }

    const dateValue = task["Date"] || task["date"] || "";
    const hoursValue = task["Hours"] || task["hours"] || "";
    const noteTitle = hoursValue ? `⚠️ ${hoursValue}` : "⚠️ IMPORTANT NOTE";
    const noteContent = task["Note"] || "No explicit warnings attached.";

    const cardHeader = document.createElement("div");
    cardHeader.className = "task-header-row";

    const titleArea = document.createElement("div");
    titleArea.className = "task-title-area";

    const titleRow = document.createElement("div");
    titleRow.className = "task-inline-row";

    const leftColumn = document.createElement("div");
    leftColumn.className = "task-header-primary";

    const clientName = document.createElement("span");
    clientName.className = "task-client";
    clientName.textContent = `🏠 ${task["Client Name"] || "N/A"}`;
    leftColumn.appendChild(clientName);

    const taskName = document.createElement("span");
    taskName.className = "task-subtitle";
    taskName.textContent = `🎯 ${task["Task"] || "N/A"}`;
    leftColumn.appendChild(taskName);

    const rightColumn = document.createElement("div");
    rightColumn.className = "task-header-secondary";

    if (teamString) {
      const teamLine = document.createElement("span");
      teamLine.className = "task-chip";
      teamLine.textContent = `# ${teamString}`;
      rightColumn.appendChild(teamLine);
    }

    if (dateValue) {
      const dateLine = document.createElement("span");
      dateLine.className = "task-meta";
      dateLine.textContent = `📅 ${dateValue}`;
      rightColumn.appendChild(dateLine);
    }

    const collapseIndicator = document.createElement("span");
    collapseIndicator.className = "task-toggle-indicator";
    collapseIndicator.setAttribute("aria-hidden", "true");
    collapseIndicator.textContent = isCollapsed ? "▸" : "▾";

    titleRow.appendChild(leftColumn);
    titleRow.appendChild(rightColumn);
    titleArea.appendChild(titleRow);
    cardHeader.appendChild(titleArea);
    cardHeader.appendChild(collapseIndicator);

    if (isCollapsed) {
      card.classList.add("is-collapsed");
    }

    cardHeader.onclick = () => {
      state.collapsedTasks[taskKey] = !state.collapsedTasks[taskKey];
      localStorage.setItem(
        `collapsed_tasks_${state.user.name}`,
        JSON.stringify(state.collapsedTasks),
      );
      renderView();
    };

    card.appendChild(cardHeader);

    const contactUrl = normalizeUrl(task["Client Contact Person"]);
    const locationUrl = normalizeUrl(task["Location"]);

    const cardBody = document.createElement("div");
    cardBody.className = "task-body-content";
    cardBody.style.display = isCollapsed ? "none" : "block";

    const noteContainer = document.createElement("div");
    noteContainer.className = "important-note-container";

    const noteTitleNode = document.createElement("div");
    noteTitleNode.className = "note-title";
    noteTitleNode.textContent = noteTitle;

    const noteContentNode = document.createElement("div");
    noteContentNode.className = "note-content";
    noteContentNode.textContent = noteContent;

    noteContainer.appendChild(noteTitleNode);
    noteContainer.appendChild(noteContentNode);

    const linkRow = document.createElement("div");
    linkRow.className = "form-grid";

    const contactLink = document.createElement("a");
    contactLink.href = contactUrl;
    contactLink.target = "_blank";
    contactLink.rel = "noreferrer";
    contactLink.className = "action-btn";
    contactLink.textContent = "📞 Contact";

    const locationLink = document.createElement("a");
    locationLink.href = locationUrl;
    locationLink.target = "_blank";
    locationLink.rel = "noreferrer";
    locationLink.className = "action-btn secondary";
    locationLink.textContent = "📍 Location";

    linkRow.appendChild(contactLink);
    linkRow.appendChild(locationLink);

    const proofStack = document.createElement("div");
    proofStack.className = "form-stack";

    const proofLabel = document.createElement("label");
    proofLabel.className = "field-label";
    proofLabel.textContent = `Upload Verification (Max: ${task["MaxPhotos"] || 1})`;

    const fileInput = document.createElement("input");
    fileInput.className = "field-input";
    fileInput.type = "file";
    fileInput.accept = "image/*,video/*";

    const noteInput = document.createElement("textarea");
    noteInput.className = "field-textarea";
    noteInput.placeholder =
      "Write completion parameters or validation remarks here...";

    const uploadButton = document.createElement("button");
    uploadButton.className = "action-btn";
    uploadButton.type = "button";
    uploadButton.textContent = "Submit Verification";

    proofStack.appendChild(proofLabel);
    proofStack.appendChild(fileInput);
    proofStack.appendChild(noteInput);
    proofStack.appendChild(uploadButton);

    cardBody.appendChild(noteContainer);
    cardBody.appendChild(linkRow);
    cardBody.appendChild(proofStack);

    card.appendChild(cardBody);
    uploadButton.onclick = () => {
      uploadWorkProof({
        clientName: task["Client Name"],
        fileInput,
        noteInput,
        uploadButton,
      });
    };

    fragment.appendChild(card);
  });

  container.appendChild(fragment);

  return container;
}

function normalizeUrl(value) {
  const urlValue = (value || "").trim();
  if (!urlValue || urlValue === "#") return "#";
  if (/^https?:\/\//i.test(urlValue)) return urlValue;
  return `https://${urlValue}`;
}

async function uploadWorkProof({
  clientName,
  fileInput,
  noteInput,
  uploadButton,
}) {
  const notes = noteInput.value.trim();

  if (!fileInput || !fileInput.files[0]) {
    alert("Please load an element signature prior to transmission submission.");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();
  uploadButton.disabled = true;

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
        `${window.APP_CONFIG.vercelGatewayUrl}/api/upload`,
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
    } finally {
      uploadButton.disabled = false;
    }
  };
  reader.readAsDataURL(file);
}
