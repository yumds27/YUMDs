import { useState, useEffect } from "react";
import { api } from "../../api";

function fmt(ts) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

export default function StudentManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getStudents()
      .then(d => setStudents(d.students))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {error && <div className="auth-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      <div className="browser-card">
        <div className="browser-card-header">
          <h2>Students <span style={{ color:"#64748b", fontWeight:400, fontSize:".9rem" }}>({students.length})</span></h2>
          <input className="adm-search" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="col-empty" style={{ padding:"2rem" }}>Loading…</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Year</th>
                  <th>Verified</th>
                  <th>Subscription</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td className="adm-muted">{s.email}</td>
                    <td>Year {s.current_year}</td>
                    <td>{s.email_verified ? <span className="adm-badge adm-badge-green">Yes</span> : <span className="adm-badge adm-badge-gray">No</span>}</td>
                    <td>
                      {s.sub_status === "active"
                        ? <span className="adm-badge adm-badge-green">Active</span>
                        : <span className="adm-badge adm-badge-gray">Inactive</span>}
                    </td>
                    <td className="adm-muted">{fmt(s.created_at)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="adm-muted" style={{textAlign:"center",padding:"2rem"}}>No students found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
