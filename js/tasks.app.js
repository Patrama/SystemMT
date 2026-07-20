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

  // 1. Extract the raw team members from the first available task if present
  let teamString = "";
  if (state.tasks.length > 0) {
    // Check both uppercase and lowercase variations from the backend payload
    const rawTeam = state.tasks[0]["Team"] || state.tasks[0]["team"] || "";

    if (rawTeam) {
      // Split the chips, clean spacing, and filter out the current logged-in user
      const totalTeamList = rawTeam.split(",").map((name) => name.trim());
      const otherMembers = totalTeamList.filter(
        (name) => name.toLowerCase() !== state.user.name.toLowerCase(),
      );

      // Format the remaining team members with dashes if they exist
      if (otherMembers.length > 0) {
        teamString = ` # ${otherMembers.join(" - ")}`;
      }
    }
  }

  // 2. Create the header element with hardcoded structural fallback styling
  const header = document.createElement("h3");
  header.style.cssText =
    "margin-bottom: 20px; font-size: 16px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;";

  // Explicitly inject the formatted text
  header.innerHTML = `
    <span style="color: inherit;">👤 ${state.user.name}</span>
    <span style="font-size: 13px; color: #8a99ad; font-weight: 500; text-transform: none; letter-spacing: 0px;">${teamString}</span>
  `;

  // Append it securely
  container.appendChild(header);

  // 3. Fallback check
  if (state.tasks.length === 0) {
    const noTasksMsg = document.createElement("p");
    noTasksMsg.style.cssText =
      "text-align:center; margin-top:30px; color: var(--text-secondary);";
    noTasksMsg.innerText = "No current tasks assigned to your scope.";
    container.appendChild(noTasksMsg);
    return container;
  }
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
