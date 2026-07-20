/**
 * 🔒 AUTHENTICATION & SESSION PERSISTENCE ENGINE
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

      const storedCollapse = localStorage.getItem(
        `collapsed_tasks_${state.user.name}`,
      );
      state.collapsedTasks = storedCollapse ? JSON.parse(storedCollapse) : {};

      // Await data alignment before render
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
}

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
