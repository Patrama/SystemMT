/**
 * 🗺️ MATRIX INTERFACE VIEW ROUTER & LIFE CYCLE INITIALIZER
 */

document.addEventListener("DOMContentLoaded", async () => {
  initThemeManager();
  await checkLoginPersistence();
  renderView();
});

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
  renderView();
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
  button.textContent = resolvedTheme === "dark" ? "☀️ Light" : "🌙 Dark";
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

  nav.appendChild(leftGroup);
  nav.appendChild(themeBtn);
  return nav;
}
