import { useState, useEffect } from "react";
import { api } from "./api";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ContentBrowser from "./pages/ContentBrowser";
import "./App.css";

function getInitialPage() {
  const path = window.location.pathname;
  if (path === "/signup") return "signup";
  if (path === "/reset-password") return "reset-password";
  return "login";
}

const NAV = [
  { id: "library",     icon: "📚", label: "Library" },
  { id: "past-papers", icon: "📝", label: "Past Papers",  badge: "Soon" },
  { id: "flashcards",  icon: "🃏", label: "Flashcards",   badge: "Soon" },
  { id: "ai-tutor",    icon: "🤖", label: "AI Tutor",     badge: "Soon" },
];

export default function App() {
  const [student, setStudent] = useState(null);
  const [page, setPage] = useState(getInitialPage);
  const [activeNav, setActiveNav] = useState("library");
  const [authLoading, setAuthLoading] = useState(true);

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
  function navigate(p) { setPage(p); window.history.pushState({}, "", `/${p}`); }

  if (authLoading) return (
    <div className="auth-page">
      <div style={{ color: "#64748b", fontSize: ".9rem" }}>Loading…</div>
    </div>
  );

  if (!student) {
    if (page === "signup") return <SignupPage onNavigate={navigate} />;
    return <LoginPage onLogin={handleLogin} onNavigate={navigate} />;
  }

  const initials = student.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-name">YUMD<span>s</span></div>
          <div className="logo-sub">Yarmouk University<br />Medical Resources & Files</div>
        </div>

        <div className="sidebar-section-title">Study</div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item${activeNav === item.id ? " active" : ""}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
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
          <button className="sign-out-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <div className="main">
        {activeNav === "library" && (
          <>
            <div className="topbar">
              <span className="topbar-title">Library</span>
            </div>
            <div className="page-content">
              <ContentBrowser student={student} />
            </div>
          </>
        )}
        {activeNav !== "library" && (
          <>
            <div className="topbar">
              <span className="topbar-title">{NAV.find(n => n.id === activeNav)?.label}</span>
            </div>
            <div className="page-content">
              <div className="coming-soon">
                <div className="cs-icon">{NAV.find(n => n.id === activeNav)?.icon}</div>
                <h3>{NAV.find(n => n.id === activeNav)?.label} — Coming Soon</h3>
                <p>This feature is currently under development and will be available soon.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
