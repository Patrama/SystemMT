/**
 * 🔒 AUTHENTICATION, SESSION PERSISTENCE & LOGOUT ENGINE
 *
 * @format
 */

// Validates a stored session without blocking first paint.
// Returns true when the session is still valid and state has been restored.
async function checkLoginPersistence() {
  const config = window.APP_CONFIG;
  const storedSession = localStorage.getItem("enterprise_session");

  if (!storedSession) return false;

  try {
    const session = JSON.parse(storedSession);

    if (!session || !session.user || !session.user.id) {
      localStorage.removeItem("enterprise_session");
      return false;
    }

    const res = await fetch(`${config.vercelGatewayUrl}/api/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.user.id }),
    });
    const result = await res.json();

    if (result.isLoggedIn) {
      // Restore user state (prefer response user object, fallback to cached session user)
      state.user = result.user || session.user;
      state.currentView = "tasks";

      // Restore collapsed task preferences
      const storedCollapse = localStorage.getItem(
        `collapsed_tasks_${state.user.name}`,
      );
      state.collapsedTasks = storedCollapse ? JSON.parse(storedCollapse) : {};

      // Load cached tasks instantly, then refresh from server
      const cached = loadCachedTasks();
      if (cached) state.tasks = cached;

      // 🟢 Force UI re-render and background sync
      if (typeof renderView === "function") renderView();
      if (typeof refreshTasks === "function") {
        refreshTasks().then(() => {
          if (
            state.currentView === "tasks" &&
            typeof renderView === "function"
          ) {
            renderView();
          }
        });
      }

      return true;
    } else {
      localStorage.removeItem("enterprise_session");
      return false;
    }
  } catch (e) {
    console.error("Persistence validation layer crash.", e);
    localStorage.removeItem("enterprise_session");
  }
  return false;
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
 * 🔄 Periodic session status validator
 */
async function verifySessionActive() {
  if (!state.user || !state.user.id) return;

  try {
    const response = await fetch(
      `${window.APP_CONFIG.vercelGatewayUrl}/api/session`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: state.user.id }),
      },
    );

    const result = await response.json();

    // 🔴 If 'Login' is unchecked or FALSE in Google Sheets, wipe session and force logout
    if (!result.isLoggedIn) {
      alert("Your session has been terminated by an administrator.");
      localStorage.removeItem("enterprise_session");
      window.location.reload();
    }
  } catch (err) {
    console.warn("Session check heartbeat missed:", err);
  }
}

// Check every 10 seconds while the app is active
setInterval(verifySessionActive, 10000);

/**
 * 🚪 Handles explicit user logout.
 */
async function logout() {
  const config = window.APP_CONFIG;

  if (!config || config.enableLogout === false) return;

  if (state.user && state.user.id) {
    try {
      await fetch(`${config.vercelGatewayUrl}/api/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: state.user.id }),
      });
    } catch (err) {
      console.warn("Logout gateway notification skipped:", err);
    }
  }

  localStorage.removeItem("enterprise_session");
  try {
    sessionStorage.removeItem("tasks_cache");
  } catch (e) {
    /* no-op */
  }
  state.user = null;
  state.tasks = [];
  state.currentView = "login";
  renderView();
}

function createLoginComponent() {
  const card = document.createElement("div");
  card.className = "task-card page-card auth-card";

  card.innerHTML = `
      <div class="section-header section-header--center">
            <h2 class="page-title">System Authentication</h2>
            <p class="page-copy">Use your assigned user ID and security PIN to continue.</p>
        </div>
        <div class="form-stack">
            <div class="field-group">
                <label class="field-label" for="login-uid">User ID</label>
                <input class="field-input" type="text" id="login-uid" autocomplete="username" autocapitalize="none" spellcheck="false" />
            </div>
            <div class="field-group">
                <label class="field-label" for="login-pin">Security PIN</label>
                <input class="field-input" type="password" id="login-pin" inputmode="numeric" pattern="[0-9]*" autocomplete="current-password" />
            </div>
            <button id="btn-login" class="action-btn" type="button">Sign In</button>
            <p id="login-err" class="status-text" role="status" aria-live="polite" style="display:none;"></p>
        </div>
    `;

  const loginButton = card.querySelector("#btn-login");
  const userIdInput = card.querySelector("#login-uid");
  const pinInput = card.querySelector("#login-pin");
  const errText = card.querySelector("#login-err");

  loginButton.onclick = async () => {
    const userId = userIdInput.value.trim();
    const pin = pinInput.value.trim();

    errText.style.display = "none";

    if (!userId || !pin) {
      errText.innerText = "User ID and PIN cannot be blank.";
      errText.style.display = "block";
      return;
    }

    try {
      loginButton.disabled = true;
      userIdInput.disabled = true;
      pinInput.disabled = true;
      errText.innerText = "Authenticating securely...";
      errText.style.display = "block";
      errText.style.color = "var(--text-secondary)";

      const response = await fetch(
        `${window.APP_CONFIG.vercelGatewayUrl}/api/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "login", userId, pin }),
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

        const cached = loadCachedTasks();
        if (cached) state.tasks = cached;
        renderView();
        refreshTasks().then(() => {
          if (state.currentView === "tasks") renderView();
        });
      } else {
        loginButton.disabled = false;
        userIdInput.disabled = false;
        pinInput.disabled = false;
        errText.innerText =
          result.message || result.error || "Authentication failed.";
        errText.style.color = "var(--warning)";
        errText.style.display = "block";
      }
    } catch (err) {
      loginButton.disabled = false;
      userIdInput.disabled = false;
      pinInput.disabled = false;
      errText.innerText = "Failed to establish a link to the logic gateway.";
      errText.style.color = "var(--warning)";
      errText.style.display = "block";
      console.error(err);
    }
  };

  return card;
}
