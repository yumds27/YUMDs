import { useState, useEffect } from "react";
import { api } from "./api";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ContentBrowser from "./pages/ContentBrowser";
import "./App.css";

// Determine initial page from URL path
function getInitialPage() {
  const path = window.location.pathname;
  if (path === "/signup") return "signup";
  if (path === "/reset-password") return "reset-password";
  return "login";
}

export default function App() {
  const [student, setStudent] = useState(null);
  const [page, setPage] = useState(getInitialPage);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setAuthLoading(false); return; }
    api.me().then(({ student: s }) => setStudent(s)).catch(() => localStorage.removeItem("token")).finally(() => setAuthLoading(false));
  }, []);

  function handleLogin(s) { setStudent(s); setPage("login"); window.history.pushState({}, "", "/"); }
  function handleLogout() { localStorage.removeItem("token"); setStudent(null); setPage("login"); window.history.pushState({}, "", "/login"); }
  function navigate(p) { setPage(p); window.history.pushState({}, "", `/${p}`); }

  if (authLoading) return <div className="auth-page"><div className="auth-card"><p>Loading…</p></div></div>;

  if (student) return (
    <div className="dashboard">
      <header className="dashboard-header">
        <span className="dashboard-title">YarmoukMDS</span>
        <span>Welcome, {student.name} · Year {student.year}</span>
        <button onClick={handleLogout}>Sign out</button>
      </header>
      <main>
        <ContentBrowser student={student} />
      </main>
    </div>
  );

  if (page === "signup") return <SignupPage onNavigate={navigate} />;
  return <LoginPage onLogin={handleLogin} onNavigate={navigate} />;
}
