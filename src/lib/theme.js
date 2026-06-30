const KEY = "yumd-theme";

export function getTheme() {
  const stored = localStorage.getItem(KEY);
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function toggleTheme() {
  const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem(KEY, next);
  applyTheme(next);
  return next;
}

export function initTheme() {
  applyTheme(getTheme());
}
