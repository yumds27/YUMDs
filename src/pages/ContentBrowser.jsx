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

// ── Shared: view-toggle pill ──────────────────────────────────
function ViewToggle({ mode, onChange }) {
  return (
    <div className="view-toggle">
      <button className={`view-toggle-btn${mode === "grid" ? " active" : ""}`} onClick={() => onChange("grid")} title="Grid view">
        <Icon name="viewGrid" size={14} />
      </button>
      <button className={`view-toggle-btn${mode === "list" ? " active" : ""}`} onClick={() => onChange("list")} title="List view">
        <Icon name="viewList" size={14} />
      </button>
    </div>
  );
}

// ── Subject card (grid) ───────────────────────────────────────
function SubjectIcon({ subject, size = 52 }) {
  const initial = subject.name?.[0]?.toUpperCase() ?? "?";
  return subject.icon_key ? (
    <img
      src={`${BASE}/api/content/subject-icons/${subject.id}`}
      alt={subject.name}
      style={{ width: size, height: size, objectFit: "cover", borderRadius: 10 }}
      onError={e => {
        e.target.style.display = "none";
        e.target.nextSibling.style.display = "flex";
      }}
    />
  ) : (
    <span className="subject-card-initial">{initial}</span>
  );
}

function SubjectCard({ subject, onClick }) {
  return (
    <button className="subject-card" onClick={onClick}>
      <div className="subject-card-icon">
        <SubjectIcon subject={subject} size={52} />
      </div>
      <div className="subject-card-name">{subject.name}</div>
    </button>
  );
}

function SubjectRow({ subject, onClick }) {
  return (
    <button className="subject-list-row" onClick={onClick}>
      <div className="subject-list-icon">
        <SubjectIcon subject={subject} size={40} />
      </div>
      <div className="subject-list-name">{subject.name}</div>
      <Icon name="arrowLeft" size={14} style={{ transform: "rotate(180deg)", color: "var(--muted)", flexShrink: 0 }} />
    </button>
  );
}

// ── Files view (after picking a subject) ─────────────────────
function SubjectFilesView({ subject, completedFiles, onToggle, onBack }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [collapsed, setCollapsed]   = useState({});
  const [viewMode, setViewMode]     = useState(() => localStorage.getItem("file-view") ?? "list");

  function toggleCat(id) { setCollapsed(p => ({ ...p, [id]: !p[id] })); }
  function changeView(m) { setViewMode(m); localStorage.setItem("file-view", m); }

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
        <ViewToggle mode={viewMode} onChange={changeView} />
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
              <button className="sf-category-header" onClick={() => toggleCat(cat.id)}>
                <span className="sf-category-name">{cat.name}</span>
                <span className="sf-category-count">{cat.files.length} file{cat.files.length !== 1 ? "s" : ""}</span>
                <Icon name={collapsed[cat.id] ? "chevronDown" : "chevronUp"} size={14} />
              </button>

              {!collapsed[cat.id] && (
                viewMode === "grid" ? (
                  <div className="sf-file-grid">
                    {cat.files.map(f => {
                      const done = completedFiles.has(f.id);
                      return (
                        <div key={f.id} className="sf-file-card">
                          <button
                            className={`sf-check-btn sf-check-abs${done ? " done" : ""}`}
                            onClick={() => onToggle(f.id)}
                            title={done ? "Mark as incomplete" : "Mark as complete"}
                          >
                            {done && <Icon name="check" size={9} />}
                          </button>
                          <button className="sf-file-card-body" onClick={() => openFile(f)}>
                            <div className={`file-icon-wrap file-icon-lg ${fileIconCls(f.content_type)}`}>
                              <Icon name={fileIcon(f.content_type)} size={26} />
                            </div>
                            <div className="sf-file-card-name">{f.name}</div>
                            {f.size_bytes && <div className="sf-file-card-size">{fmtSize(f.size_bytes)}</div>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="sf-file-list">
                    {cat.files.map(f => {
                      const done = completedFiles.has(f.id);
                      return (
                        <div key={f.id} className="sf-file-row">
                          <button
                            className={`sf-check-btn${done ? " done" : ""}`}
                            onClick={() => onToggle(f.id)}
                            title={done ? "Mark as incomplete" : "Mark as complete"}
                          >
                            {done && <Icon name="check" size={10} />}
                          </button>
                          <button className="sf-file-btn" onClick={() => openFile(f)}>
                            <div className={`file-icon-wrap ${fileIconCls(f.content_type)}`}>
                              <Icon name={fileIcon(f.content_type)} size={16} />
                            </div>
                            <div className="file-meta">
                              <div className="file-name">{f.name}</div>
                              {f.size_bytes && <div className="file-size">{fmtSize(f.size_bytes)}</div>}
                            </div>
                            <Icon name="arrowLeft" size={13} className="sf-row-arrow" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────
export default function ContentBrowser({ student }) {
  const [year, setYear]                = useState(student.current_year ?? student.year ?? 1);
  const [subjects, setSubjects]        = useState([]);
  const [selected, setSelected]        = useState(null);
  const [loading, setLoading]          = useState(false);
  const [error, setError]              = useState("");
  const [completedFiles, setCompleted] = useState(new Set());
  const [viewMode, setViewMode]        = useState(() => localStorage.getItem("subject-view") ?? "grid");

  useEffect(() => {
    setSelected(null); setLoading(true); setError("");
    api.getSubjects(year)
      .then(d => setSubjects(d.subjects))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => {
    api.getFileProgress()
      .then(d => setCompleted(new Set(d.files.map(f => f.file_id))))
      .catch(() => {});
  }, []);

  async function handleToggle(fileId) {
    const nowDone = !completedFiles.has(fileId);
    setCompleted(prev => {
      const next = new Set(prev);
      nowDone ? next.add(fileId) : next.delete(fileId);
      return next;
    });
    try {
      await api.markFileComplete(fileId, nowDone);
    } catch {
      setCompleted(prev => {
        const next = new Set(prev);
        nowDone ? next.delete(fileId) : next.add(fileId);
        return next;
      });
    }
  }

  function changeView(m) { setViewMode(m); localStorage.setItem("subject-view", m); }

  if (selected) {
    return (
      <SubjectFilesView
        subject={selected}
        completedFiles={completedFiles}
        onToggle={handleToggle}
        onBack={() => setSelected(null)}
      />
    );
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
        <ViewToggle mode={viewMode} onChange={changeView} />
      </div>

      {error && <div className="auth-error" style={{ margin: "0 1.5rem 1rem" }}>{error}</div>}

      {loading ? (
        <div className="fc-loading">Loading subjects…</div>
      ) : subjects.length === 0 ? (
        <div className="fc-empty">
          <Icon name="library" size={40} />
          <p>No subjects added for Year {year} yet.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="subject-grid">
          {subjects.map(s => (
            <SubjectCard key={s.id} subject={s} onClick={() => setSelected(s)} />
          ))}
        </div>
      ) : (
        <div className="subject-list">
          {subjects.map(s => (
            <SubjectRow key={s.id} subject={s} onClick={() => setSelected(s)} />
          ))}
        </div>
      )}
    </div>
  );
}
