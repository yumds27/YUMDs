import { useState, useEffect } from "react";
import { api } from "./api";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import ContentBrowser from "./pages/ContentBrowser";
import PastPapers from "./pages/PastPapers";
import Flashcards from "./pages/Flashcards";
import AdminPanel from "./pages/admin/AdminPanel";
import Progress from "./pages/Progress";
import Icon from "./components/Icon";
import { toggleTheme } from "./lib/theme";
import "./App.css";

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  function toggle() { const d = toggleTheme() === "dark"; setDark(d); }
  return (
    <button className="theme-toggle-btn" onClick={toggle}>
      <Icon name={dark ? "sun" : "moon"} size={14} />
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}

const isAdmin = window.location.pathname.startsWith("/admin");

function getInitialPage() {
  const path = window.location.pathname;
  if (path === "/signup") return "signup";
  if (path === "/reset-password") return "reset-password";
  return "login";
}

const NAV = [
  { id: "home",        icon: "home",       label: "Home" },
  { id: "library",     icon: "library",    label: "Library" },
  { id: "past-papers", icon: "papers",     label: "Past Papers" },
  { id: "flashcards",  icon: "flashcards", label: "Flashcards" },
  { id: "about",       icon: "award",      label: "About" },
  { id: "progress",    icon: "progress",   label: "Progress" },
  { id: "ai-tutor",    icon: "aiTutor",    label: "AI Tutor", badge: "Soon" },
];

function StudentApp() {
  const [student, setStudent]       = useState(null);
  const [page, setPage]             = useState(getInitialPage);
  const [activeNav, setActiveNav]   = useState("home");
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setAuthLoading(false); return; }
    api.me()
      .then(({ student: s }) => setStudent(s))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setAuthLoading(false));
  }, []);

  function handleLogin(s) { setStudent(s); window.history.pushState({}, "", "/"); }
  function handleLogout() { localStorage.removeItem("token"); setStudent(null); setPage("login"); window.history.pushState({}, "", "/login"); }

  function navigate(id) {
    setActiveNav(id);
    setSidebarOpen(false);
  }

  if (authLoading) return (
    <div className="auth-page"><div style={{ color: "#64748b", fontSize: ".9rem" }}>Loading…</div></div>
  );

  if (!student) {
    if (page === "signup") return <SignupPage onNavigate={setPage} />;
    return <LoginPage onLogin={handleLogin} onNavigate={setPage} />;
  }

  const initials = student.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const activeItem = NAV.find(n => n.id === activeNav);

  return (
    <div className="shell">
      {/* Sidebar backdrop */}
      <div
        className={`sidebar-backdrop${sidebarOpen ? " visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-logo">
          <div className="sidebar-building-icon">
            <Icon name="building" size={52} />
          </div>
          <div className="logo-name">YUMD<span>s</span></div>
          <div className="logo-sub">Yarmouk University Medical Resources &amp; Files</div>
        </div>

        <div className="sidebar-section-title">Study</div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button key={item.id}
              className={`nav-item${activeNav === item.id ? " active" : ""}`}
              onClick={() => navigate(item.id)}>
              <Icon name={item.icon} size={16} className="nav-icon" />
              {item.label}
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{student.name}</div>
              <div className="user-year">Year {student.current_year ?? student.year}</div>
            </div>
          </div>
          <button className="sign-out-btn" onClick={handleLogout}>
            <Icon name="signOut" size={13} /> Sign out
          </button>
          <ThemeToggle />
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
            <Icon name="menu" size={20} />
          </button>
          <span className="topbar-title">{activeNav === "home" ? "" : activeItem?.label}</span>
          <div className="topbar-actions" />
        </div>

        <div className="page-content">
          {activeNav === "home" ? (
            <LandingPage onNavigate={navigate} />
          ) : activeNav === "library" ? (
            <ContentBrowser student={student} />
          ) : activeNav === "past-papers" ? (
            <PastPapers student={student} />
          ) : activeNav === "flashcards" ? (
            <Flashcards />
          ) : activeNav === "about" ? (
            <AboutPage />
          ) : activeNav === "progress" ? (
            <Progress student={student} onNavigate={navigate} />
          ) : (
            <div className="coming-soon">
              <div className="cs-icon"><Icon name={activeItem?.icon} size={48} /></div>
              <h3>{activeItem?.label} — Coming Soon</h3>
              <p>This feature is under development and will be available soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return isAdmin ? <AdminPanel /> : <StudentApp />;
}
