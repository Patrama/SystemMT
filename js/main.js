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
  viewport.innerHTML = "";

  if (state.currentView !== "login") {
    viewport.appendChild(createNavbarComponent());
  }

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

function createNavbarComponent() {
  const nav = document.createElement("nav");
  nav.className = "navbar";

  const leftGroup = document.createElement("div");
  leftGroup.className = "nav-buttons";

  const taskTab = document.createElement("button");
  taskTab.className =
    state.currentView === "tasks" ? "nav-btn active" : "nav-btn";
  taskTab.innerHTML = "📋 Tasks";
  taskTab.onclick = () => {
    state.currentView = "tasks";
    renderView();
  };

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
