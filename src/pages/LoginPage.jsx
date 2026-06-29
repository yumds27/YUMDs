import { useState, useEffect } from "react";
import { api } from "../api";

export default function LoginPage({ onLogin, onNavigate }) {
  const [tab, setTab] = useState("login"); // "login" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Show "email verified" banner if redirected from verification link
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("verified") === "1") {
      setMessage("Email verified! You can now log in.");
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);
    try {
      const { token, student } = await api.login({ email, password });
      localStorage.setItem("token", token);
      onLogin(student);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);
    try {
      const { message: msg } = await api.forgotPassword(email);
      setMessage(msg);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-name">YUMD<span>s</span></div>
          <div className="logo-sub">Yarmouk University Medical Resources & Files</div>
        </div>

        {tab === "login" && (
          <>
            <h2>Sign in</h2>
            {message && <p className="auth-success">{message}</p>}
            {error && <p className="auth-error">{error}</p>}
            <form onSubmit={handleLogin}>
              <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
              <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
              <button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
            </form>
            <div className="auth-links">
              <button className="link-btn" onClick={() => { setTab("forgot"); setError(""); setMessage(""); }}>Forgot password?</button>
              <button className="link-btn" onClick={() => onNavigate("signup")}>Create account</button>
            </div>
          </>
        )}

        {tab === "forgot" && (
          <>
            <h2>Reset password</h2>
            {message && <p className="auth-success">{message}</p>}
            {error && <p className="auth-error">{error}</p>}
            <form onSubmit={handleForgot}>
              <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
              <button type="submit" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button>
            </form>
            <div className="auth-links">
              <button className="link-btn" onClick={() => { setTab("login"); setError(""); setMessage(""); }}>Back to sign in</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
