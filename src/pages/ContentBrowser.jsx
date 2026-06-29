import { useState, useEffect } from "react";
import { api } from "../api";

const BASE = import.meta.env.VITE_API_BASE ?? "https://api.yarmoukmds.com";

function fileIconClass(contentType) {
  if (contentType?.includes("pdf")) return "pdf";
  if (contentType?.includes("image")) return "img";
  return "misc";
}
function fileEmoji(contentType) {
  if (contentType?.includes("pdf"))   return "📄";
  if (contentType?.includes("image")) return "🖼️";
  if (contentType?.includes("video")) return "🎬";
  return "📎";
}
function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ContentBrowser({ student }) {
  const [year, setYear] = useState(student.current_year ?? student.year ?? 1);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedSubject(null); setSelectedTopic(null); setTopics([]); setFiles([]);
    setLoading(true);
    api.getSubjects(year)
      .then(d => setSubjects(d.subjects))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [year]);

  function selectSubject(s) {
    setSelectedSubject(s); setSelectedTopic(null); setFiles([]);
    api.getTopics(s.id).then(d => setTopics(d.topics)).catch(e => setError(e.message));
  }

  function selectTopic(t) {
    setSelectedTopic(t);
    api.getFiles(t.id).then(d => setFiles(d.files)).catch(e => setError(e.message));
  }

  async function openFile(file) {
    try {
      const { url } = await api.getFileUrl(file.id);
      window.open(`${BASE}${url}`, "_blank");
    } catch (e) { setError(e.message); }
  }

  return (
    <>
      {error && <div className="auth-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      <div className="browser-card">
        <div className="browser-card-header">
          <h2>Study Materials</h2>
          <div className="year-tabs">
            {[1,2,3,4,5,6].map(y => (
              <button key={y} className={`year-tab${year === y ? " active" : ""}`} onClick={() => setYear(y)}>
                Year {y}
              </button>
            ))}
          </div>
        </div>

        <div className="browser-cols">
          {/* Subjects */}
          <div className="browser-col">
            <div className="col-title">Subjects</div>
            {loading ? <div className="col-empty">Loading…</div>
              : subjects.length === 0 ? <div className="col-empty">No subjects for Year {year} yet.</div>
              : subjects.map(s => (
                <button key={s.id}
                  className={`browser-item${selectedSubject?.id === s.id ? " selected" : ""}`}
                  onClick={() => selectSubject(s)}>
                  {s.name}
                </button>
              ))}
          </div>

          {/* Topics */}
          <div className="browser-col">
            <div className="col-title">Topics</div>
            {!selectedSubject ? <div className="col-empty">Select a subject →</div>
              : topics.length === 0 ? <div className="col-empty">No topics yet.</div>
              : topics.map(t => (
                <button key={t.id}
                  className={`browser-item${selectedTopic?.id === t.id ? " selected" : ""}`}
                  onClick={() => selectTopic(t)}>
                  {t.name}
                </button>
              ))}
          </div>

          {/* Files */}
          <div className="browser-col">
            <div className="col-title">Files</div>
            {!selectedTopic ? <div className="col-empty">Select a topic →</div>
              : files.length === 0 ? <div className="col-empty">No files yet.</div>
              : files.map(f => (
                <button key={f.id} className="browser-item" onClick={() => openFile(f)}>
                  <div className={`file-icon-wrap ${fileIconClass(f.content_type)}`}>
                    {fileEmoji(f.content_type)}
                  </div>
                  <div className="file-meta">
                    <div className="file-name">{f.name}</div>
                    {f.size_bytes && <div className="file-size">{fmtSize(f.size_bytes)}</div>}
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
