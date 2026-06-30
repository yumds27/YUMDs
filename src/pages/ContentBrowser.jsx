import { useState, useEffect } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

const BASE = import.meta.env.VITE_API_BASE ?? "https://api.yarmoukmds.com";

function fileIcon(ct) {
  if (ct?.includes("pdf"))   return "filePdf";
  if (ct?.includes("image")) return "fileImage";
  return "file";
}
function fileIconCls(ct) {
  if (ct?.includes("pdf"))   return "pdf";
  if (ct?.includes("image")) return "img";
  return "misc";
}
function fmtSize(b) {
  if (!b) return "";
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// ── Subject card ──────────────────────────────────────────────

function SubjectCard({ subject, onClick }) {
  const initial = subject.name?.[0]?.toUpperCase() ?? "?";
  return (
    <button className="subject-card" onClick={onClick}>
      <div className="subject-card-icon">
        {subject.icon_key
          ? <img src={`${BASE}/api/content/subject-icons/${subject.id}`} alt={subject.name} onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
          : null
        }
        <span className="subject-card-initial" style={subject.icon_key ? { display: "none" } : {}}>{initial}</span>
      </div>
      <div className="subject-card-name">{subject.name}</div>
    </button>
  );
}

// ── Files view (after picking a subject) ─────────────────────

function SubjectFilesView({ subject, onBack }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    api.getSubjectFiles(subject.id)
      .then(d => setCategories(d.categories))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [subject.id]);

  async function openFile(file) {
    try {
      const { url } = await api.getFileUrl(file.id);
      window.open(`${BASE}${url}`, "_blank");
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="subject-files">
      <div className="subject-files-header">
        <button className="fc-back-btn" onClick={onBack}>
          <Icon name="arrowLeft" size={16} /> Back
        </button>
        <h2 className="subject-files-title">{subject.name}</h2>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {loading ? (
        <div className="fc-loading">Loading…</div>
      ) : categories.length === 0 ? (
        <div className="fc-empty">
          <Icon name="library" size={40} />
          <p>No files uploaded for this subject yet.</p>
        </div>
      ) : (
        <div className="sf-categories">
          {categories.map(cat => (
            <div key={cat.id} className="sf-category">
              <div className="sf-category-name">{cat.name}</div>
              <div className="sf-file-list">
                {cat.files.map(f => (
                  <button key={f.id} className="sf-file-row" onClick={() => openFile(f)}>
                    <div className={`file-icon-wrap ${fileIconCls(f.content_type)}`}>
                      <Icon name={fileIcon(f.content_type)} size={16} />
                    </div>
                    <div className="file-meta">
                      <div className="file-name">{f.name}</div>
                      {f.size_bytes && <div className="file-size">{fmtSize(f.size_bytes)}</div>}
                    </div>
                    <Icon name="arrowLeft" size={13} className="sf-row-arrow" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────

export default function ContentBrowser({ student }) {
  const [year, setYear]             = useState(student.current_year ?? student.year ?? 1);
  const [subjects, setSubjects]     = useState([]);
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    setSelected(null); setLoading(true); setError("");
    api.getSubjects(year)
      .then(d => setSubjects(d.subjects))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [year]);

  if (selected) {
    return <SubjectFilesView subject={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="subject-browser">
      <div className="subject-year-header">
        <span className="subject-year-label">Year</span>
        <div className="year-tabs">
          {[1,2,3,4,5,6].map(y => (
            <button key={y} className={`year-tab${year === y ? " active" : ""}`} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="auth-error" style={{ margin: "0 1.5rem 1rem" }}>{error}</div>}

      {loading ? (
        <div className="fc-loading">Loading subjects…</div>
      ) : subjects.length === 0 ? (
        <div className="fc-empty">
          <Icon name="library" size={40} />
          <p>No subjects added for Year {year} yet.</p>
        </div>
      ) : (
        <div className="subject-grid">
          {subjects.map(s => (
            <SubjectCard key={s.id} subject={s} onClick={() => setSelected(s)} />
          ))}
        </div>
      )}
    </div>
  );
}
