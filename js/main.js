/**
 * 🗺️ MATRIX INTERFACE VIEW ROUTER & LIFE CYCLE INITIALIZER
 *
 * @format
 */

document.addEventListener("DOMContentLoaded", async () => {
  initThemeManager();
  // Render the correct shell immediately (login or cached-session tasks view)
  // without blocking first paint on the network round-trip.
  renderInitialView();
  // Then synchronize task data in the background and refresh when resolved.
  const hadValidSession = await checkLoginPersistence();
  if (hadValidSession) {
    await refreshTasks();
    if (state.currentView === "tasks") renderView();
  } else if (state.currentView === "tasks") {
    // Stored session existed but is expired/invalid — fall back to login.
    state.currentView = "login";
    renderView();
  }
});

function renderInitialView() {
  // Session persisted? Jump straight to the tasks shell with a sync placeholder.
  const storedSession = localStorage.getItem("enterprise_session");
  if (storedSession) {
    try {
      const session = JSON.parse(storedSession);
      state.user = session.user;
      state.currentView = "tasks";
      const storedCollapse = localStorage.getItem(
        `collapsed_tasks_${state.user.name}`,
      );
      state.collapsedTasks = storedCollapse ? JSON.parse(storedCollapse) : {};
      // Render tasks from the sessionStorage cache instantly (if present),
      // otherwise show the loading placeholder and let the fetch fill it in.
      const cached = loadCachedTasks();
      if (cached) {
        state.tasks = cached;
        renderView();
      } else {
        const viewport = document.getElementById("app-viewport");
        if (viewport) {
          viewport.replaceChildren(
            (() => {
              const el = document.createElement("div");
              el.className = "loading-state";
              el.textContent = "Synchronizing task queue...";
              return el;
            })(),
          );
        }
      }
      return;
    } catch (e) {
      localStorage.removeItem("enterprise_session");
    }
  }
  renderView();
}

function renderView() {
  const viewport = document.getElementById("app-viewport");
  if (!viewport) return;
  const nextChildren = [];

  if (state.currentView !== "login") {
    nextChildren.push(createNavbarComponent());
  }

  switch (state.currentView) {
    case "login":
      nextChildren.push(createLoginComponent());
      break;
    case "tasks":
      nextChildren.push(createTasksComponent());
      break;
    case "absence":
      nextChildren.push(createAbsenceComponent());
      break;
    default:
      nextChildren.push(createLoginComponent());
      break;
  }

  viewport.replaceChildren(...nextChildren);
}

function setCurrentView(nextView) {
  if (state.currentView === nextView) return;
  state.currentView = nextView;
  // Cross-view transitions always rebuild the viewport.
  if (nextView !== "tasks") {
    renderView();
    return;
  }
  // Entering tasks: render the cached queue instantly, then sync in background.
  const cached = loadCachedTasks();
  if (cached) state.tasks = cached;
  renderView();
  refreshTasks().then(() => {
    if (state.currentView === "tasks") renderView();
  });
}

function createNavButton(label, viewName, icon) {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    state.currentView === viewName ? "nav-btn active" : "nav-btn";
  button.textContent = `${icon} ${label}`;
  button.onclick = () => setCurrentView(viewName);
  return button;
}

function setTheme(theme) {
  const resolvedTheme =
    theme === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  document.documentElement.setAttribute("data-theme", resolvedTheme);
  localStorage.setItem("app_theme", theme);
  return resolvedTheme;
}

function refreshThemeToggleLabel(button) {
  if (!button) return;
  const storedTheme =
    localStorage.getItem("app_theme") || window.APP_CONFIG.defaultTheme;
  const resolvedTheme =
    storedTheme === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : storedTheme;
  button.textContent =
    resolvedTheme === "dark"
      ? `☀️ Hallo - ${state.user.name}`
      : `🌙 Hallo - ${state.user.name}`;
}

function createNavbarComponent() {
  const nav = document.createElement("nav");
  nav.className = "navbar";

  const leftGroup = document.createElement("div");
  leftGroup.className = "nav-buttons";

  leftGroup.appendChild(createNavButton("Tasks", "tasks", "📋"));
  leftGroup.appendChild(createNavButton("Attendance", "absence", "⏳"));

  const themeBtn = document.createElement("button");
  themeBtn.className = "theme-toggle-btn";
  themeBtn.type = "button";
  refreshThemeToggleLabel(themeBtn);

  themeBtn.onclick = () => {
    const activeTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = activeTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    refreshThemeToggleLabel(themeBtn);
  };

  const navRight = document.createElement("div");
  navRight.className = "nav-buttons";
  navRight.appendChild(themeBtn);

  // 🚪 Optional logout button — only rendered when enabled in APP_CONFIG.
  if (window.APP_CONFIG.enableLogout === true) {
    const logoutBtn = document.createElement("button");
    logoutBtn.className = "nav-btn";
    logoutBtn.type = "button";
    logoutBtn.textContent = "🚪 Logout";
    logoutBtn.onclick = () => logout();
    navRight.appendChild(logoutBtn);
  }

  nav.appendChild(leftGroup);
  nav.appendChild(navRight);
  return nav;
}
