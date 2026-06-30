import { useState } from "react";
import AdminLoginPage from "./AdminLoginPage";
import ContentManager from "./ContentManager";
import StudentManager from "./StudentManager";
import Icon from "../../components/Icon";

const NAV = [
  { id: "content",  icon: "content",  label: "Content" },
  { id: "students", icon: "students", label: "Students" },
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
              <Icon name={item.icon} size={16} className="nav-icon" />
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
          <button className="sign-out-btn" onClick={handleLogout}>
            <Icon name="signOut" size={13} /> Sign out
          </button>
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
