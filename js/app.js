/**
 * 🧠 ENTERPRISE PORTAL FRONTEND ENGINE (js/app.js)
 */

const state = {
  user: null,
  tasks: [],
  currentView: "login",
  collapsedTasks: {}, // Track structural visibility states: { taskKey: boolean }
};

// 1️⃣ Update the initialization wrapper to handle async loading sequences cleanly
document.addEventListener("DOMContentLoaded", async () => {
  initThemeManager();
  await checkLoginPersistence(); // 🔒 Wait until the session validation and task fetches are done
  renderView(); // 🎨 Render the UI only when data is fully present
});

/**
 * 🔒 Session Authorization Storage Pipelines (Fixed Async Lifecycle)
 */
async function checkLoginPersistence() {
  const config = window.APP_CONFIG;
  const storedSession = localStorage.getItem("enterprise_session");

  if (!storedSession) return;

  try {
    const session = JSON.parse(storedSession);
    const now = Date.now();
    let isValid = false;

    if (config.persistenceStrategy === "daily") {
      const sessionDate = new Date(session.timestamp).toDateString();
      const currentDate = new Date(now).toDateString();
      isValid = sessionDate === currentDate;
    } else if (config.persistenceStrategy === "duration") {
      isValid = now - session.timestamp < config.persistenceDurationMs;
    }

    if (isValid) {
      state.user = session.user;
      state.currentView = "tasks";

      // Restore structural task checkbox states safely
      const storedCollapse = localStorage.getItem(
        `collapsed_tasks_${state.user.name}`,
      );
      if (storedCollapse) {
        try {
          state.collapsedTasks = JSON.parse(storedCollapse);
        } catch (e) {
          state.collapsedTasks = {};
        }
      }

      // 🌟 Await the data sync stream before letting the app render
      await refreshTasks();
    } else {
      localStorage.removeItem("enterprise_session");
    }
  } catch (e) {
    console.error("Persistence validation layer crash.", e);
    localStorage.removeItem("enterprise_session");
  }
}

function saveSession(userData, token) {
  const sessionPayload = {
    user: userData,
    token: token,
    timestamp: Date.now(),
  };
  localStorage.setItem("enterprise_session", JSON.stringify(sessionPayload));
}

/**
 * 🎨 Theme Engine Configuration & Listener Setup
 */
function initThemeManager() {
  const config = window.APP_CONFIG;
  const currentTheme =
    localStorage.getItem("app_theme") ||
    (config ? config.defaultTheme : "dark");

  const targetTheme =
    currentTheme === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : currentTheme;

  document.documentElement.setAttribute("data-theme", targetTheme);

  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    toggleBtn.innerText =
      targetTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";

    toggleBtn.onclick = () => {
      const activeTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = activeTheme === "dark" ? "light" : "dark";

      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("app_theme", newTheme);
      toggleBtn.innerText =
        newTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
    };
  }

  if (config && config.defaultTheme === "auto") {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (localStorage.getItem("app_theme") === "auto") {
          document.documentElement.setAttribute(
            "data-theme",
            e.matches ? "dark" : "light",
          );
        }
      });
  }
}

/**
 * 🗺️ Core Single-Page Routing Matrix
 */
function renderView() {
  const viewport = document.getElementById("app-viewport");
  if (!viewport) return;
  viewport.innerHTML = ""; // Wipe container boundaries cleanly

  // Top Level Navigation Bar Layout injection (Omitted on Login Frame)
  if (state.currentView !== "login") {
    viewport.appendChild(createNavbarComponent());
  }

  // Main View Component Router Switch
  switch (state.currentView) {
    case "login":
      viewport.appendChild(createLoginComponent());
      break;
    case "tasks":
      viewport.appendChild(createTasksComponent());
      break;
    case "absence":
      viewport.appendChild(createAbsenceComponent());
      break;
  }
}

/**
 * 🛠️ Component Factory: Application Navigation Shell with Active Page Highlighting
 */
function createNavbarComponent() {
  const nav = document.createElement("nav");
  nav.className = "navbar";

  const leftGroup = document.createElement("div");
  leftGroup.className = "nav-buttons";

  // 📋 Tasks Tab Setup
  const taskTab = document.createElement("button");
  taskTab.className =
    state.currentView === "tasks" ? "nav-btn active" : "nav-btn";
  taskTab.innerHTML = "📋 Tasks";
  taskTab.onclick = () => {
    state.currentView = "tasks";
    renderView();
  };

  // ⏳ Attendance Tab Setup
  const absenceTab = document.createElement("button");
  absenceTab.className =
    state.currentView === "absence" ? "nav-btn active" : "nav-btn";
  absenceTab.innerHTML = "⏳ Attendance";
  absenceTab.onclick = () => {
    state.currentView = "absence";
    renderView();
  };

  leftGroup.appendChild(taskTab);
  leftGroup.appendChild(absenceTab);

  // 💡 Theme Switcher Button
  const themeBtn = document.createElement("button");
  const currentActiveTheme =
    document.documentElement.getAttribute("data-theme");
  themeBtn.innerText = currentActiveTheme === "dark" ? "☀️ Light" : "🌙 Dark";
  themeBtn.className = "theme-toggle-btn";

  themeBtn.onclick = () => {
    const activeTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = activeTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("app_theme", newTheme);
    themeBtn.innerText = newTheme === "dark" ? "☀️ Light" : "🌙 Dark";
  };

  nav.appendChild(leftGroup);
  nav.appendChild(themeBtn);
  return nav;
}

/**
 * 🔒 Component Factory: Secure Access Login Screen
 */
function createLoginComponent() {
  const card = document.createElement("div");
  card.className = "task-card";
  card.style.cssText = "margin-top: 15vh; padding: 24px;";

  card.innerHTML = `
        <h2 style="text-align:center; margin-bottom:20px; letter-spacing:0.5px;">System Authentication</h2>
        <div style="margin-bottom:14px;">
            <label style="display:block; margin-bottom:6px; font-weight:600; font-size:14px; color:var(--text-secondary);">User ID</label>
            <input type="text" id="login-uid" style="width:100%; padding:12px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); border-radius:8px; outline:none; font-size:15px;">
        </div>
        <div style="margin-bottom:24px;">
            <label style="display:block; margin-bottom:6px; font-weight:600; font-size:14px; color:var(--text-secondary);">Security PIN</label>
            <input type="password" id="login-pin" inputmode="numeric" pattern="[0-9]*" style="width:100%; padding:12px; border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); border-radius:8px; outline:none; font-size:15px; letter-spacing:4px;">
        </div>
        <button id="btn-login" class="action-btn" style="width:100%; padding:12px; font-size:15px;">Sign In</button>
        <p id="login-err" style="color:var(--warning); text-align:center; margin-top:14px; font-weight:600; font-size:13px; display:none;"></p>
    `;

  card.querySelector("#btn-login").onclick = async () => {
    const userId = card.querySelector("#login-uid").value.trim();
    const pin = card.querySelector("#login-pin").value.trim();
    const errText = card.querySelector("#login-err");

    errText.style.display = "none";

    if (!userId || !pin) {
      errText.innerText = "User ID and PIN cannot be blank.";
      errText.style.display = "block";
      return;
    }

    try {
      card.querySelector("#btn-login").disabled = true;
      errText.innerText = "Authenticating securely...";
      errText.style.display = "block";
      errText.style.color = "var(--text-secondary)";

      // Secure login dispatch through Vercel
      const response = await fetch(
        `${window.APP_CONFIG.vercelGatewayUrl}/api/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, pin }),
        },
      );

      const result = await response.json();

      if (response.ok && result.success) {
        state.user = result.user;
        saveSession(result.user, result.token);
        state.currentView = "tasks";

        const storedCollapse = localStorage.getItem(
          `collapsed_tasks_${state.user.name}`,
        );
        state.collapsedTasks = storedCollapse ? JSON.parse(storedCollapse) : {};

        await refreshTasks();
        renderView();
      } else {
        card.querySelector("#btn-login").disabled = false;
        errText.innerText = result.error || "Authentication failed.";
        errText.style.color = "var(--warning)";
        errText.style.display = "block";
      }
    } catch (err) {
      card.querySelector("#btn-login").disabled = false;
      errText.innerText = "Failed to establish a link to the logic gateway.";
      errText.style.color = "var(--warning)";
      errText.style.display = "block";
      console.error(err);
    }
  };

  return card;
}

/**
 * 📋 Component Factory: Dynamic Collapsible Task Grid View
 */
function createTasksComponent() {
  const container = document.createElement("div");
  container.style.width = "100%";

  const header = document.createElement("h3");
  header.innerText = `👤 ${state.user.name} (${state.user.team})`;
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

    const checkboxLabel = document.createElement("span");
    checkboxLabel.innerText = "Proof";

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

    checkboxWrap.appendChild(checkboxLabel);
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

/**
 * ⏳ Component Factory: Secure Geo-Bound Attendance Logging System
 */
function createAbsenceComponent() {
  const card = document.createElement("div");
  card.className = "task-card";
  card.style.padding = "24px";

  card.innerHTML = `
        <h2 style="text-align:center; margin-bottom:12px; font-size: 20px;">Office Check-In System</h2>
        <p id="geo-status" style="text-align:center; font-weight:600; margin-bottom:24px; color:var(--warning); font-size:13px; line-height: 1.4;">Verifying structural presence signatures...</p>
        <button id="btn-checkin" class="action-btn" style="width:100%; padding:14px; font-size:15px; margin-bottom:12px; background-color:var(--success);" disabled>Check In (Arrival)</button>
        <button id="btn-checkout" class="action-btn" style="width:100%; padding:14px; font-size:15px; background-color:var(--border-color); color: var(--text-primary);" disabled>Check Out (Departure)</button>
    `;

  const btnIn = card.querySelector("#btn-checkin");
  const btnOut = card.querySelector("#btn-checkout");
  const statusText = card.querySelector("#geo-status");

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distance = calculateHaversineDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          window.APP_CONFIG.officeLocation.latitude,
          window.APP_CONFIG.officeLocation.longitude,
        );

        if (distance <= window.APP_CONFIG.officeLocation.radiusMeters) {
          statusText.innerText =
            "Location Authorized ✅ Inside Office Perimeter.";
          statusText.style.color = "var(--success)";
          btnIn.disabled = false;
          btnOut.disabled = false;
        } else {
          statusText.innerText = `Access Denied ❌ Out of Bounds. Distance: ${distance.toFixed(1)}m from office anchor point.`;
          statusText.style.color = "var(--warning)";
        }
      },
      (err) => {
        statusText.innerText =
          "Hardware GPS Query Error. Lock execution barred.";
      },
      { enableHighAccuracy: true },
    );
  } else {
    statusText.innerText =
      "Geofencing Core modules unavailable on this architecture.";
  }

  btnIn.onclick = () => submitAttendance("in");
  btnOut.onclick = () => submitAttendance("out");

  return card;
}

/**
 * 🧮 Mathematical Engine: Haversine Geo-Distance Verification
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * ☁️ Data Sync Pipelines: Fetch tasks through the Vercel secure logic hub proxy
 */
async function refreshTasks() {
  try {
    const storedSession = localStorage.getItem("enterprise_session");
    if (!storedSession) return;
    const { token } = JSON.parse(storedSession);

    // Fetch task arrays proxied from Vercel securely
    const response = await fetch(
      `${window.APP_CONFIG.vercelGatewayUrl}/api/tasks`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) throw new Error("Task collection network breach.");
    const result = await response.json();
    state.tasks = result.tasks || [];
  } catch (e) {
    console.error(
      "Task synchronizer runtime failure. Reverting to empty array.",
      e,
    );
    state.tasks = [];
  }
}

/**
 * 📤 Data Sync Pipelines: Proxy payload streams to Vercel
 */
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

/**
 * 📤 Data Sync Pipelines: Submit attendance operations via backend endpoint proxy
 */
async function submitAttendance(type) {
  const now = new Date();
  try {
    const payload = {
      action: "checkInOrOut",
      type: type,
      userName: state.user.name,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
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
        `Attendance protocol [Check-${type.toUpperCase()}] executed cleanly.`,
      );
    } else {
      alert("Attendance state parsing rejection fault.");
    }
  } catch (err) {
    console.error(err);
    alert("Gateway processing transmission break.");
  }
}
