import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import Icon from "../../components/Icon";

function Spinner() { return <span style={{ color: "#64748b", fontSize: ".8rem" }}>Loading…</span>; }

function ConfirmDelete({ label, onConfirm, onCancel }) {
  return (
    <div className="adm-confirm">
      <span>Delete "{label}"?</span>
      <button className="adm-btn adm-btn-danger" onClick={onConfirm}>Delete</button>
      <button className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
    </div>
  );
}

function fileIcon(contentType) {
  if (contentType?.includes("pdf"))   return "filePdf";
  if (contentType?.includes("image")) return "fileImage";
  return "file";
}
function fileIconClass(contentType) {
  if (contentType?.includes("pdf"))   return "pdf";
  if (contentType?.includes("image")) return "img";
  return "misc";
}

export default function ContentManager() {
  const [year, setYear] = useState(1);
  const [subjects, setSubjects] = useState([]);
  const [selSubject, setSelSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selTopic, setSelTopic] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState({ subjects: false, topics: false, files: false });
  const [newSubject, setNewSubject] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  function setLoad(key, val) { setLoading(l => ({ ...l, [key]: val })); }

  async function loadSubjects(y) {
    setLoad("subjects", true); setSelSubject(null); setTopics([]); setSelTopic(null); setFiles([]);
    try { const d = await api.getSubjects(y); setSubjects(d.subjects); }
    catch (e) { setError(e.message); } finally { setLoad("subjects", false); }
  }

  async function loadTopics(s) {
    setSelSubject(s); setSelTopic(null); setFiles([]);
    setLoad("topics", true);
    try { const d = await api.getTopics(s.id); setTopics(d.topics); }
    catch (e) { setError(e.message); } finally { setLoad("topics", false); }
  }

  async function loadFiles(t) {
    setSelTopic(t); setLoad("files", true);
    try { const d = await api.getFiles(t.id); setFiles(d.files); }
    catch (e) { setError(e.message); } finally { setLoad("files", false); }
  }

  useEffect(() => { loadSubjects(year); }, [year]);

  async function addSubject(e) {
    e.preventDefault();
    if (!newSubject.trim()) return;
    try {
      const s = await api.createSubject({ name: newSubject.trim(), year });
      setSubjects(prev => [...prev, s]);
      setNewSubject("");
    } catch (e) { setError(e.message); }
  }

  async function saveSubjectEdit(e) {
    e.preventDefault();
    try {
      await api.updateSubject(editingSubject.id, { name: editingSubject.name, display_order: editingSubject.display_order ?? 0 });
      setSubjects(prev => prev.map(s => s.id === editingSubject.id ? { ...s, name: editingSubject.name } : s));
      setEditingSubject(null);
    } catch (e) { setError(e.message); }
  }

  async function addTopic(e) {
    e.preventDefault();
    if (!newTopic.trim() || !selSubject) return;
    try {
      const t = await api.createTopic({ name: newTopic.trim(), subject_id: selSubject.id });
      setTopics(prev => [...prev, t]);
      setNewTopic("");
    } catch (e) { setError(e.message); }
  }

  async function saveTopicEdit(e) {
    e.preventDefault();
    try {
      await api.updateTopic(editingTopic.id, { name: editingTopic.name, display_order: editingTopic.display_order ?? 0 });
      setTopics(prev => prev.map(t => t.id === editingTopic.id ? { ...t, name: editingTopic.name } : t));
      setEditingTopic(null);
    } catch (e) { setError(e.message); }
  }

  async function handleDelete() {
    const { type, id } = confirmDel;
    try {
      if (type === "subject") { await api.deleteSubject(id); setSubjects(p => p.filter(s => s.id !== id)); if (selSubject?.id === id) { setSelSubject(null); setTopics([]); setSelTopic(null); setFiles([]); } }
      if (type === "topic")   { await api.deleteTopic(id);   setTopics(p => p.filter(t => t.id !== id));   if (selTopic?.id === id) { setSelTopic(null); setFiles([]); } }
      if (type === "file")    { await api.deleteFile(id);    setFiles(p => p.filter(f => f.id !== id)); }
    } catch (e) { setError(e.message); }
    setConfirmDel(null);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !selTopic) return;
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("topic_id", selTopic.id);
      fd.append("file", file);
      const f = await api.uploadFile(fd);
      setFiles(prev => [...prev, { id: f.id, name: f.name, content_type: file.type, size_bytes: file.size }]);
    } catch (e) { setError(e.message); }
    finally { setUploading(false); fileInputRef.current.value = ""; }
  }

  const fmtSize = (b) => !b ? "" : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div>
      {error && (
        <div className="auth-error" style={{ marginBottom: "1rem", display: "flex", alignItems: "center" }}>
          <span style={{ flex: 1 }}>{error}</span>
          <button className="adm-icon-btn" onClick={() => setError("")}><Icon name="close" size={14} /></button>
        </div>
      )}

      <div className="browser-card">
        <div className="browser-card-header">
          <h2>Content Manager</h2>
          <div className="year-tabs">
            {[1,2,3,4,5,6].map(y => (
              <button key={y} className={`year-tab${year === y ? " active" : ""}`} onClick={() => setYear(y)}>Year {y}</button>
            ))}
          </div>
        </div>

        <div className="browser-cols">
          {/* Subjects */}
          <div className="browser-col">
            <div className="col-title">Subjects</div>
            {loading.subjects ? <div className="col-empty"><Spinner /></div> : (
              <>
                {subjects.map(s => (
                  <div key={s.id} className={`browser-item adm-row${selSubject?.id === s.id ? " selected" : ""}`} onClick={() => loadTopics(s)}>
                    {editingSubject?.id === s.id ? (
                      <form className="adm-inline-form" onSubmit={saveSubjectEdit} onClick={e => e.stopPropagation()}>
                        <input className="adm-input" value={editingSubject.name} autoFocus onChange={e => setEditingSubject(p => ({ ...p, name: e.target.value }))} />
                        <button className="adm-btn adm-btn-primary" type="submit">Save</button>
                        <button className="adm-btn adm-btn-ghost" type="button" onClick={() => setEditingSubject(null)}><Icon name="close" size={12} /></button>
                      </form>
                    ) : confirmDel?.type === "subject" && confirmDel.id === s.id ? (
                      <ConfirmDelete label={s.name} onConfirm={handleDelete} onCancel={() => setConfirmDel(null)} />
                    ) : (
                      <>
                        <span className="adm-item-name">{s.name}</span>
                        <span className="adm-actions">
                          <button className="adm-icon-btn" title="Edit" onClick={e => { e.stopPropagation(); setEditingSubject(s); }}><Icon name="edit" size={14} /></button>
                          <button className="adm-icon-btn" title="Delete" onClick={e => { e.stopPropagation(); setConfirmDel({ type: "subject", id: s.id, name: s.name }); }}><Icon name="trash" size={14} /></button>
                        </span>
                      </>
                    )}
                  </div>
                ))}
                <form className="adm-add-form" onSubmit={addSubject}>
                  <input className="adm-input" placeholder="New subject…" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                  <button className="adm-btn adm-btn-primary" type="submit" disabled={!newSubject.trim()}>Add</button>
                </form>
              </>
            )}
          </div>

          {/* Topics */}
          <div className="browser-col">
            <div className="col-title">Topics</div>
            {!selSubject ? <div className="col-empty">Select a subject first</div> : loading.topics ? <div className="col-empty"><Spinner /></div> : (
              <>
                {topics.map(t => (
                  <div key={t.id} className={`browser-item adm-row${selTopic?.id === t.id ? " selected" : ""}`} onClick={() => loadFiles(t)}>
                    {editingTopic?.id === t.id ? (
                      <form className="adm-inline-form" onSubmit={saveTopicEdit} onClick={e => e.stopPropagation()}>
                        <input className="adm-input" value={editingTopic.name} autoFocus onChange={e => setEditingTopic(p => ({ ...p, name: e.target.value }))} />
                        <button className="adm-btn adm-btn-primary" type="submit">Save</button>
                        <button className="adm-btn adm-btn-ghost" type="button" onClick={() => setEditingTopic(null)}><Icon name="close" size={12} /></button>
                      </form>
                    ) : confirmDel?.type === "topic" && confirmDel.id === t.id ? (
                      <ConfirmDelete label={t.name} onConfirm={handleDelete} onCancel={() => setConfirmDel(null)} />
                    ) : (
                      <>
                        <span className="adm-item-name">{t.name}</span>
                        <span className="adm-actions">
                          <button className="adm-icon-btn" onClick={e => { e.stopPropagation(); setEditingTopic(t); }}><Icon name="edit" size={14} /></button>
                          <button className="adm-icon-btn" onClick={e => { e.stopPropagation(); setConfirmDel({ type: "topic", id: t.id, name: t.name }); }}><Icon name="trash" size={14} /></button>
                        </span>
                      </>
                    )}
                  </div>
                ))}
                <form className="adm-add-form" onSubmit={addTopic}>
                  <input className="adm-input" placeholder="New topic…" value={newTopic} onChange={e => setNewTopic(e.target.value)} />
                  <button className="adm-btn adm-btn-primary" type="submit" disabled={!newTopic.trim()}>Add</button>
                </form>
              </>
            )}
          </div>

          {/* Files */}
          <div className="browser-col">
            <div className="col-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Files</span>
              {selTopic && (
                <label className="adm-upload-btn">
                  <Icon name="upload" size={13} /> {uploading ? "Uploading…" : "Upload"}
                  <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleUpload} disabled={uploading} />
                </label>
              )}
            </div>
            {!selTopic ? <div className="col-empty">Select a topic first</div> : loading.files ? <div className="col-empty"><Spinner /></div> : (
              <>
                {files.length === 0 && <div className="col-empty">No files yet. Upload one above.</div>}
                {files.map(f => (
                  confirmDel?.type === "file" && confirmDel.id === f.id ? (
                    <div key={f.id} className="browser-item">
                      <ConfirmDelete label={f.name} onConfirm={handleDelete} onCancel={() => setConfirmDel(null)} />
                    </div>
                  ) : (
                    <div key={f.id} className="browser-item adm-row">
                      <div className={`file-icon-wrap ${fileIconClass(f.content_type)}`}>
                        <Icon name={fileIcon(f.content_type)} size={16} />
                      </div>
                      <div className="file-meta">
                        <div className="file-name">{f.name}</div>
                        {f.size_bytes && <div className="file-size">{fmtSize(f.size_bytes)}</div>}
                      </div>
                      <button className="adm-icon-btn" onClick={() => setConfirmDel({ type: "file", id: f.id, name: f.name })}><Icon name="trash" size={14} /></button>
                    </div>
                  )
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
