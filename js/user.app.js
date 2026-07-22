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
    localStorage.getItem("app_theme") || config.defaultTheme || "light";
  const resolvedTheme =
    currentTheme === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : currentTheme;

  document.documentElement.setAttribute("data-theme", resolvedTheme);

  if (!window.__themePreferenceListenerBound) {
    window.__themePreferenceListenerBound = true;
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        const themePreference =
          localStorage.getItem("app_theme") || config.defaultTheme || "light";
        if (themePreference !== "auto") return;
        document.documentElement.setAttribute(
          "data-theme",
          window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light",
        );
      });
  }
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
        loginButton.disabled = false;
        userIdInput.disabled = false;
        pinInput.disabled = false;
        errText.innerText = result.error || "Authentication failed.";
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
