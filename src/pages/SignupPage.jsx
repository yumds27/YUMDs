import { useState } from "react";
import { api } from "../api";

export default function SignupPage({ onNavigate }) {
  const [form, setForm] = useState({ email: "", password: "", name: "", year: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.signup({ ...form, year: Number(form.year) });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  if (success) return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-name">YUMD<span>s</span></div>
          <div className="logo-sub">Yarmouk University Medical Resources & Files</div>
        </div>
        <h2>Check your email</h2>
        <p>We sent a verification link to <strong>{form.email}</strong>. Click it to activate your account, then sign in.</p>
        <div className="auth-links">
          <button className="link-btn" onClick={() => onNavigate("login")}>Go to sign in</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-name">YUMD<span>s</span></div>
          <div className="logo-sub">Yarmouk University Medical Resources & Files</div>
        </div>
        <h2>Create account</h2>
        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>Full name<input type="text" value={form.name} onChange={set("name")} required autoComplete="name" /></label>
          <label>Email<input type="email" value={form.email} onChange={set("email")} required autoComplete="email" /></label>
          <label>Password<input type="password" value={form.password} onChange={set("password")} required autoComplete="new-password" minLength={8} /></label>
          <label>Year
            <select value={form.year} onChange={set("year")} required>
              <option value="">Select your year</option>
              {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </label>
          <button type="submit" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
        </form>
        <div className="auth-links">
          <button className="link-btn" onClick={() => onNavigate("login")}>Already have an account? Sign in</button>
        </div>
      </div>
    </div>
  );
}
