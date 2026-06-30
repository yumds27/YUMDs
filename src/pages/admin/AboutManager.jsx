import { useState, useEffect } from "react";
import { api } from "../../api";
import Icon from "../../components/Icon";

export default function AboutManager() {
  const [title, setTitle]   = useState("");
  const [body,  setBody]    = useState("");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    api.adminGetAbout()
      .then(d => { setTitle(d.title || ""); setBody(d.body || ""); })
      .catch(e => setError(e.message));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setSaved(false); setError("");
    try {
      await api.adminUpdateAbout({ title, body });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="about-manager">
      <div className="browser-card">
        <div className="browser-card-header">
          <h2>About Page</h2>
          <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>Displayed publicly to all students</span>
        </div>
        <form onSubmit={handleSave} className="about-form">
          {error && (
            <div className="auth-error" style={{ margin: "1rem 1rem 0" }}>
              {error}
              <button type="button" className="adm-icon-btn" style={{ marginLeft: "auto" }} onClick={() => setError("")}>
                <Icon name="close" size={13} />
              </button>
            </div>
          )}
          {saved && (
            <div className="auth-success" style={{ margin: "1rem 1rem 0", display: "flex", alignItems: "center", gap: ".5rem" }}>
              <Icon name="check" size={14} /> Saved successfully
            </div>
          )}
          <div className="about-form-body">
            <label className="about-form-label">
              Page title
              <input
                className="adm-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="About YUMDs"
              />
            </label>
            <label className="about-form-label">
              Content
              <span style={{ fontSize: ".75rem", color: "var(--muted)", fontWeight: 400 }}>
                {" "}— Each line becomes a paragraph. Blank line = spacing.
              </span>
              <textarea
                className="q-textarea about-textarea"
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={14}
                placeholder={"Write about YUMDs, the platform's purpose, the team, contact info…\n\nEach new line is a new paragraph."}
              />
            </label>
          </div>
          <div className="about-form-footer">
            <button className="adm-btn adm-btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>

      {/* Live preview */}
      {(title || body) && (
        <div className="browser-card" style={{ marginTop: "1.5rem" }}>
          <div className="browser-card-header"><h2 style={{ fontSize: ".85rem" }}>Preview</h2></div>
          <div style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--navy)", marginBottom: ".75rem" }}>{title || "About YUMDs"}</h3>
            <div className="about-body">
              {(body || "").split("\n").map((line, i) =>
                line.trim() ? <p key={i}>{line}</p> : <br key={i} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
