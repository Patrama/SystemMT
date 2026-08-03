/**
 * 🎨 USER EXPERIENCE & THEME MANAGEMENT
 *
 * @format
 */

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
