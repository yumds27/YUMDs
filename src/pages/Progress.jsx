import { useState, useEffect } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

function fmtDate(s) {
  return new Date(s).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}
function fmtTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}m ${String(sec).padStart(2,"0")}s`;
}

export default function Progress() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    api.getProgressSessions()
      .then(d => setSessions(d.sessions))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="col-empty" style={{ padding:"3rem" }}>Loading…</div>;
  if (error)   return <div className="auth-error">{error}</div>;

  const total       = sessions.length;
  const avgScore    = total ? Math.round(sessions.reduce((a, s) => a + (s.score / s.total * 100), 0) / total) : 0;
  const bestScore   = total ? Math.max(...sessions.map(s => Math.round(s.score / s.total * 100))) : 0;
  const totalQs     = sessions.reduce((a, s) => a + s.total, 0);
  const correctQs   = sessions.reduce((a, s) => a + s.score, 0);

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Sessions</div>
          <div className="stat-value">{total}</div>
          <div className="stat-sub">Total attempts</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Score</div>
          <div className="stat-value">{total ? `${avgScore}%` : "—"}</div>
          <div className="stat-sub">Across all sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Best Score</div>
          <div className="stat-value">{total ? `${bestScore}%` : "—"}</div>
          <div className="stat-sub">Personal best</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Questions</div>
          <div className="stat-value">{correctQs}/{totalQs}</div>
          <div className="stat-sub">Correct answers</div>
        </div>
      </div>

      <div className="browser-card">
        <div className="browser-card-header">
          <h2>Exam Attempts</h2>
          <span style={{ fontSize:".8rem", color:"var(--muted)" }}>{total} session{total !== 1 ? "s" : ""}</span>
        </div>
        {sessions.length === 0 ? (
          <div style={{ padding:"3rem", textAlign:"center" }}>
            <div style={{ marginBottom:".75rem", opacity:.4 }}><Icon name="papers" size={48} /></div>
            <p style={{ color:"var(--muted)", fontSize:".9rem" }}>No sessions yet — start a past paper to track your progress.</p>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Paper</th>
                  <th>Mode</th>
                  <th>Score</th>
                  <th>Questions</th>
                  <th>Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => {
                  const pct = Math.round(s.score / s.total * 100);
                  const scoreColor = pct >= 70 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight:500 }}>{s.paper_name || `Paper #${s.paper_id}`}</td>
                      <td>
                        <span className={`adm-badge ${s.mode === "exam" ? "adm-badge-green" : "adm-badge-gray"}`}>
                          {s.mode}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight:700, color: scoreColor }}>{pct}%</span>
                      </td>
                      <td className="adm-muted">{s.score}/{s.total}</td>
                      <td className="adm-muted">{fmtTime(s.time_sec)}</td>
                      <td className="adm-muted">{fmtDate(s.completed_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
