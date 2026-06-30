import { useState, useEffect } from "react";
import { api } from "./api";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ContentBrowser from "./pages/ContentBrowser";
import PastPapers from "./pages/PastPapers";
import AdminPanel from "./pages/admin/AdminPanel";
import Icon from "./components/Icon";
import "./App.css";

const isAdmin = window.location.pathname.startsWith("/admin");

function getInitialPage() {
  const path = window.location.pathname;
  if (path === "/signup") return "signup";
  if (path === "/reset-password") return "reset-password";
  return "login";
}

const NAV = [
  { id: "library",     icon: "library",    label: "Library" },
  { id: "past-papers", icon: "papers",     label: "Past Papers",  badge: "Soon" },
  { id: "flashcards",  icon: "flashcards", label: "Flashcards",   badge: "Soon" },
  { id: "ai-tutor",    icon: "aiTutor",    label: "AI Tutor",     badge: "Soon" },
];

function StudentApp() {
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
    <div className="auth-page"><div style={{ color: "#64748b", fontSize: ".9rem" }}>Loading…</div></div>
  );

  if (!student) {
    if (page === "signup") return <SignupPage onNavigate={navigate} />;
    return <LoginPage onLogin={handleLogin} onNavigate={navigate} />;
  }

  const initials = student.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const activeItem = NAV.find(n => n.id === activeNav);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="YUMDs" className="sidebar-logo-img" onError={e => e.target.style.display="none"} />
          <div className="logo-name">YUMD<span>s</span></div>
          <div className="logo-sub">Yarmouk University Medical Resources & Files</div>
        </div>

        <div className="sidebar-section-title">Study</div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button key={item.id}
              className={`nav-item${activeNav === item.id ? " active" : ""}`}
              onClick={() => setActiveNav(item.id)}>
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
        </div>
      </aside>

      <div className="main">
        {activeNav === "library" ? (
          <>
            <div className="topbar"><span className="topbar-title">Library</span></div>
            <div className="page-content"><ContentBrowser student={student} /></div>
          </>
        ) : activeNav === "past-papers" ? (
          <>
            <div className="topbar"><span className="topbar-title">Past Papers</span></div>
            <div className="page-content"><PastPapers student={student} /></div>
          </>
        ) : (
          <>
            <div className="topbar"><span className="topbar-title">{activeItem?.label}</span></div>
            <div className="page-content">
              <div className="coming-soon">
                <div className="cs-icon"><Icon name={activeItem?.icon} size={48} /></div>
                <h3>{activeItem?.label} — Coming Soon</h3>
                <p>This feature is under development and will be available soon.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return isAdmin ? <AdminPanel /> : <StudentApp />;
}
