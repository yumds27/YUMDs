import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import Icon from "../../components/Icon";
import QuestionImporter from "./QuestionImporter";

const LETTERS = ["a", "b", "c", "d", "e"];
const EMPTY_Q = { body: "", option_a: "", option_b: "", option_c: "", option_d: "", option_e: "", correct: "a", explanation: "" };

function ConfirmDelete({ label, onConfirm, onCancel }) {
  return (
    <div className="adm-confirm">
      <span>Delete "{label}"?</span>
      <button className="adm-btn adm-btn-danger" onClick={onConfirm}>Delete</button>
      <button className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
    </div>
  );
}

function QuestionForm({ paperId, question, onSave, onCancel }) {
  const [form, setForm]         = useState(question ?? { ...EMPTY_Q, paper_id: paperId });
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [svgPreview, setSvgPreview] = useState(question?.explanation_svg ?? null);
  const [imgKey, setImgKey]     = useState(question?.explanation_image ?? null);
  const imgRef = useRef(null);
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (question?.id) {
        await api.updateQuestion(question.id, form);
        onSave({ ...question, ...form });
      } else {
        const res = await api.createQuestion({ ...form, paper_id: paperId });
        onSave({ ...form, id: res.id, paper_id: paperId });
      }
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !question?.id) return;
    setUploading(true);
    try {
      await api.adminUploadExplanationImage(question.id, file);
      setImgKey(`q${question.id}`);
    } catch (err) { alert(err.message); }
    finally { setUploading(false); }
  }

  async function handleGenerateSvg() {
    if (!question?.id) return;
    setGenerating(true);
    try {
      const res = await api.adminGenerateSvg(question.id);
      setSvgPreview(res.svg);
    } catch (err) { alert(err.message); }
    finally { setGenerating(false); }
  }

  return (
    <form className="q-form" onSubmit={handleSubmit}>
      <div className="q-form-field">
        <label className="q-label">Question</label>
        <textarea className="q-textarea" value={form.body} onChange={set("body")} required rows={3} placeholder="Question text…" />
      </div>
      {LETTERS.slice(0, 4).map(l => (
        <div key={l} className="q-form-row">
          <label className="q-label">Option {l.toUpperCase()}</label>
          <input className="adm-input" value={form[`option_${l}`]} onChange={set(`option_${l}`)} required placeholder={`Option ${l.toUpperCase()}…`} />
        </div>
      ))}
      <div className="q-form-row">
        <label className="q-label">Option E <span style={{ color:"#94a3b8" }}>(optional)</span></label>
        <input className="adm-input" value={form.option_e ?? ""} onChange={set("option_e")} placeholder="Option E (leave blank if not needed)…" />
      </div>
      <div className="q-form-row">
        <label className="q-label">Correct answer</label>
        <select className="adm-input" value={form.correct} onChange={set("correct")} style={{ width: "auto" }}>
          {LETTERS.filter(l => l === "e" ? form.option_e : true).map(l => (
            <option key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>
      </div>
      <div className="q-form-field">
        <label className="q-label">Explanation <span style={{ color:"#94a3b8" }}>(optional)</span></label>
        <textarea className="q-textarea" value={form.explanation ?? ""} onChange={set("explanation")} rows={3} placeholder="Explain the correct answer…" />
      </div>

      {/* Explanation image */}
      {question?.id && (
        <div className="q-form-field">
          <label className="q-label">Explanation image <span style={{ color:"#94a3b8" }}>(optional)</span></label>
          <div style={{ display:"flex", gap:".5rem", alignItems:"center" }}>
            <input ref={imgRef} type="file" accept="image/*" style={{ display:"none" }}
              onChange={handleImageUpload} />
            <button className="adm-btn adm-btn-ghost" type="button"
              onClick={() => imgRef.current?.click()} disabled={uploading}>
              <Icon name="image" size={13} /> {uploading ? "Uploading…" : imgKey ? "Replace image" : "Upload image"}
            </button>
            {imgKey && <span style={{ fontSize:".78rem", color:"var(--muted)" }}>Image uploaded</span>}
          </div>
        </div>
      )}

      {/* SVG generation */}
      {question?.id && (
        <div className="q-form-field">
          <label className="q-label">Diagram <span style={{ color:"#94a3b8" }}>(AI-generated SVG)</span></label>
          <button className="adm-btn adm-btn-ghost" type="button"
            onClick={handleGenerateSvg} disabled={generating || !form.explanation}>
            <Icon name="sparkle" size={13} /> {generating ? "Generating…" : svgPreview ? "Regenerate diagram" : "Generate diagram"}
          </button>
          {svgPreview && (
            <div style={{ marginTop:".75rem", border:"1px solid var(--border)", borderRadius:8, padding:".75rem", background:"var(--surface-alt)" }}
              dangerouslySetInnerHTML={{ __html: svgPreview }} />
          )}
        </div>
      )}

      <div className="q-form-actions">
        <button className="adm-btn adm-btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : question?.id ? "Update" : "Add question"}</button>
        <button className="adm-btn adm-btn-ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function QuestionsPanel({ paper, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    api.adminGetQuestions(paper.id)
      .then(d => setQuestions(d.questions))
      .finally(() => setLoading(false));
  }, [paper.id]);

  async function handleDelete() {
    try { await api.deleteQuestion(confirmDel.id); setQuestions(p => p.filter(q => q.id !== confirmDel.id)); }
    catch (e) { alert(e.message); }
    setConfirmDel(null);
  }

  return (
    <div>
      {importing && (
        <QuestionImporter
          paperId={paper.id}
          onDone={count => {
            setImporting(false);
            api.adminGetQuestions(paper.id)
              .then(d => setQuestions(d.questions))
              .catch(() => {});
          }}
          onClose={() => setImporting(false)}
        />
      )}
      <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"1.25rem" }}>
        <button className="btn-secondary" onClick={onBack}>← Back to papers</button>
        <h2 style={{ flex:1, fontSize:"1rem", fontWeight:600 }}>{paper.name}</h2>
        <span style={{ color:"#64748b", fontSize:".875rem" }}>{questions.length} questions</span>
        <button className="adm-btn adm-btn-ghost" onClick={() => setImporting(true)}>
          <Icon name="upload" size={13} /> Import PDF
        </button>
      </div>

      <div className="browser-card">
        {loading ? <div className="col-empty" style={{ padding:"2rem" }}>Loading…</div> : (
          <>
            {questions.map((q, i) => (
              <div key={q.id} className="q-row">
                {editing?.id === q.id ? (
                  <QuestionForm paperId={paper.id} question={q}
                    onSave={updated => { setQuestions(p => p.map(x => x.id === q.id ? updated : x)); setEditing(null); }}
                    onCancel={() => setEditing(null)} />
                ) : confirmDel?.id === q.id ? (
                  <div style={{ padding:".75rem 1rem" }}>
                    <ConfirmDelete label={`Q${i+1}`} onConfirm={handleDelete} onCancel={() => setConfirmDel(null)} />
                  </div>
                ) : (
                  <div className="q-row-inner">
                    <div className="q-num">Q{i + 1}</div>
                    <div className="q-body">{q.body}</div>
                    <div className="q-correct-badge">{q.correct?.toUpperCase()}</div>
                    <button className="adm-icon-btn" onClick={() => setEditing(q)}><Icon name="edit" size={14} /></button>
                    <button className="adm-icon-btn" onClick={() => setConfirmDel(q)}><Icon name="trash" size={14} /></button>
                  </div>
                )}
              </div>
            ))}

            {adding ? (
              <div style={{ padding:"1rem", borderTop:"1px solid #e2e8f0" }}>
                <QuestionForm paperId={paper.id} question={null}
                  onSave={q => { setQuestions(p => [...p, q]); setAdding(false); }}
                  onCancel={() => setAdding(false)} />
              </div>
            ) : (
              <div style={{ padding:".75rem 1rem", borderTop:"1px solid #e2e8f0" }}>
                <button className="adm-btn adm-btn-primary" onClick={() => setAdding(true)}>+ Add question</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PaperManager() {
  const [year, setYear] = useState(1);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newPaper, setNewPaper] = useState("");
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [editingPaper, setEditingPaper] = useState(null);
  const [error, setError] = useState("");

  async function loadPapers(y) {
    setLoading(true);
    try { const d = await api.getPapers(y); setPapers(d.papers); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { loadPapers(year); }, [year]);

  async function addPaper(e) {
    e.preventDefault();
    if (!newPaper.trim()) return;
    try {
      const p = await api.createPaper({ name: newPaper.trim(), year });
      setPapers(prev => [...prev, { ...p, question_count: 0 }]);
      setNewPaper("");
    } catch (e) { setError(e.message); }
  }

  async function savePaperEdit(e) {
    e.preventDefault();
    try {
      await api.updatePaper(editingPaper.id, { name: editingPaper.name, display_order: editingPaper.display_order ?? 0 });
      setPapers(p => p.map(x => x.id === editingPaper.id ? { ...x, name: editingPaper.name } : x));
      setEditingPaper(null);
    } catch (e) { setError(e.message); }
  }

  async function handleDelete() {
    try { await api.deletePaper(confirmDel.id); setPapers(p => p.filter(x => x.id !== confirmDel.id)); }
    catch (e) { setError(e.message); }
    setConfirmDel(null);
  }

  if (selectedPaper) return <QuestionsPanel paper={selectedPaper} onBack={() => { setSelectedPaper(null); loadPapers(year); }} />;

  return (
    <div>
      {error && (
        <div className="auth-error" style={{ marginBottom:"1rem", display:"flex", alignItems:"center" }}>
          <span style={{ flex:1 }}>{error}</span>
          <button className="adm-icon-btn" onClick={() => setError("")}><Icon name="close" size={14} /></button>
        </div>
      )}

      <div className="browser-card">
        <div className="browser-card-header">
          <h2>Past Papers</h2>
          <div className="year-tabs">
            {[1,2,3,4,5,6].map(y => (
              <button key={y} className={`year-tab${year === y ? " active" : ""}`} onClick={() => setYear(y)}>Year {y}</button>
            ))}
          </div>
        </div>

        {loading ? <div className="col-empty" style={{ padding:"2rem" }}>Loading…</div> : (
          <>
            <div className="papers-list">
              {papers.map(p => (
                <div key={p.id} className="adm-paper-row">
                  {editingPaper?.id === p.id ? (
                    <form className="adm-inline-form" style={{ flex:1 }} onSubmit={savePaperEdit}>
                      <input className="adm-input" value={editingPaper.name} autoFocus
                        onChange={e => setEditingPaper(x => ({ ...x, name: e.target.value }))} />
                      <button className="adm-btn adm-btn-primary" type="submit">Save</button>
                      <button className="adm-btn adm-btn-ghost" type="button" onClick={() => setEditingPaper(null)}><Icon name="close" size={12} /></button>
                    </form>
                  ) : confirmDel?.id === p.id ? (
                    <div style={{ flex:1 }}>
                      <ConfirmDelete label={p.name} onConfirm={handleDelete} onCancel={() => setConfirmDel(null)} />
                    </div>
                  ) : (
                    <>
                      <button className="adm-paper-name" onClick={() => setSelectedPaper(p)}>{p.name}</button>
                      <span className="adm-paper-count">{p.question_count} Qs</span>
                      <button className="adm-icon-btn" onClick={() => setEditingPaper(p)}><Icon name="edit" size={14} /></button>
                      <button className="adm-icon-btn" onClick={() => setConfirmDel(p)}><Icon name="trash" size={14} /></button>
                    </>
                  )}
                </div>
              ))}
              {papers.length === 0 && <div className="col-empty" style={{ padding:"1.5rem 1rem" }}>No papers for Year {year} yet.</div>}
            </div>
            <form className="adm-add-form" onSubmit={addPaper}>
              <input className="adm-input" placeholder="New paper name…" value={newPaper} onChange={e => setNewPaper(e.target.value)} />
              <button className="adm-btn adm-btn-primary" type="submit" disabled={!newPaper.trim()}>Add</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
