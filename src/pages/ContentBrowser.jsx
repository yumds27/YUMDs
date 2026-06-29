import { useState, useEffect } from "react";
import { api } from "../api";

const BASE = import.meta.env.VITE_API_BASE ?? "https://api.yarmoukmds.com";

export default function ContentBrowser({ student }) {
  const [year, setYear] = useState(student.year ?? 1);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedSubject(null);
    setSelectedTopic(null);
    setTopics([]);
    setFiles([]);
    setLoading(true);
    api.getSubjects(year)
      .then(d => setSubjects(d.subjects))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [year]);

  function selectSubject(s) {
    setSelectedSubject(s);
    setSelectedTopic(null);
    setFiles([]);
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
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="content-browser">
      <div className="year-tabs">
        {[1,2,3,4,5,6].map(y => (
          <button key={y} className={`year-tab${year === y ? " active" : ""}`} onClick={() => setYear(y)}>
            Year {y}
          </button>
        ))}
      </div>

      {error && <div className="auth-error" style={{margin:"1rem"}}>{error}</div>}

      <div className="browser-grid">
        <div className="browser-col">
          <h3 className="col-title">Subjects</h3>
          {loading ? <p className="col-empty">Loading…</p> : subjects.length === 0 ? (
            <p className="col-empty">No subjects yet.</p>
          ) : subjects.map(s => (
            <button key={s.id} className={`browser-item${selectedSubject?.id === s.id ? " selected" : ""}`}
              onClick={() => selectSubject(s)}>{s.name}</button>
          ))}
        </div>

        <div className="browser-col">
          <h3 className="col-title">Topics</h3>
          {!selectedSubject ? <p className="col-empty">← Select a subject</p>
            : topics.length === 0 ? <p className="col-empty">No topics yet.</p>
            : topics.map(t => (
              <button key={t.id} className={`browser-item${selectedTopic?.id === t.id ? " selected" : ""}`}
                onClick={() => selectTopic(t)}>{t.name}</button>
            ))}
        </div>

        <div className="browser-col">
          <h3 className="col-title">Files</h3>
          {!selectedTopic ? <p className="col-empty">← Select a topic</p>
            : files.length === 0 ? <p className="col-empty">No files yet.</p>
            : files.map(f => (
              <button key={f.id} className="browser-item file-item" onClick={() => openFile(f)}>
                <span className="file-icon">📄</span>
                <span className="file-name">{f.name}</span>
                {f.size_bytes && <span className="file-size">{(f.size_bytes / 1024 / 1024).toFixed(1)} MB</span>}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
