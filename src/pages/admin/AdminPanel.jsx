import { useState } from "react";
import AdminLoginPage from "./AdminLoginPage";
import ContentManager from "./ContentManager";
import StudentManager from "./StudentManager";

const NAV = [
  { id: "content",  icon: "📚", label: "Content" },
  { id: "students", icon: "👥", label: "Students" },
];

export default function AdminPanel() {
  const [admin, setAdmin] = useState(() => {
    const t = localStorage.getItem("admin_token");
    if (!t) return null;
    try { return JSON.parse(atob(t.split(".")[0])); } catch { return null; }
  });
  const [activeNav, setActiveNav] = useState("content");

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setAdmin(null);
  }

  if (!admin) return <AdminLoginPage onLogin={setAdmin} />;

  const initials = admin.email?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-name">YUMD<span>s</span></div>
          <div className="logo-sub">Admin Panel</div>
        </div>

        <div className="sidebar-section-title">Manage</div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button key={item.id}
              className={`nav-item${activeNav === item.id ? " active" : ""}`}
              onClick={() => setActiveNav(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{admin.email}</div>
              <div className="user-year">Administrator</div>
            </div>
          </div>
          <button className="sign-out-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{NAV.find(n => n.id === activeNav)?.label}</span>
        </div>
        <div className="page-content">
          {activeNav === "content"  && <ContentManager />}
          {activeNav === "students" && <StudentManager />}
        </div>
      </div>
    </div>
  );
}
