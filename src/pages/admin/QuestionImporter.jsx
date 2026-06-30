import { useState, useRef } from "react";
import { extractPdfText, parseQuestionsFromText } from "../../lib/pdfParser";
import { api } from "../../api";
import Icon from "../../components/Icon";

const LETTERS = ["a", "b", "c", "d", "e"];

function QPreviewItem({ q, idx, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="imp-item">
      <div className="imp-item-head" onClick={() => setOpen(o => !o)}>
        <span className="imp-num">Q{idx + 1}</span>
        <span className="imp-preview">{q.body.slice(0, 70)}{q.body.length > 70 ? "…" : ""}</span>
        <span className="imp-correct-badge">{q.correct?.toUpperCase()}</span>
        <button className="adm-icon-btn" onClick={e => { e.stopPropagation(); onRemove(idx); }}>
          <Icon name="trash" size={12} />
        </button>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={13} />
      </div>
      {open && (
        <div className="imp-item-detail">
          <textarea className="adm-input" value={q.body} rows={2}
            onChange={e => onChange(idx, "body", e.target.value)} placeholder="Question text…" />
          {LETTERS.map(l => (
            (l !== "e" || q.option_e) ? (
              <div key={l} className="imp-opt-row">
                <button type="button"
                  className={`imp-opt-btn${q.correct === l ? " active" : ""}`}
                  onClick={() => onChange(idx, "correct", l)}
                  title="Mark as correct answer"
                >{l.toUpperCase()}</button>
                <input className="adm-input" value={q[`option_${l}`] ?? ""}
                  onChange={e => onChange(idx, `option_${l}`, e.target.value)}
                  placeholder={`Option ${l.toUpperCase()}`} />
              </div>
            ) : null
          ))}
          {q.explanation !== null && (
            <textarea className="adm-input" value={q.explanation ?? ""} rows={2}
              onChange={e => onChange(idx, "explanation", e.target.value)}
              placeholder="Explanation (optional)…" />
          )}
        </div>
      )}
    </div>
  );
}

export default function QuestionImporter({ paperId, onDone, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [parsing,   setParsing]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [err,       setErr]       = useState("");
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true); setErr(""); setQuestions([]);
    try {
      const text   = await extractPdfText(file);
      const parsed = parseQuestionsFromText(text);
      if (!parsed.length)
        setErr("No questions detected. The PDF may be scanned/image-only or in an unsupported format.");
      else
        setQuestions(parsed);
    } catch (ex) { setErr("Failed to read PDF: " + ex.message); }
    finally { setParsing(false); }
  }

  function update(idx, field, val) {
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  }
  function remove(idx) { setQuestions(qs => qs.filter((_, i) => i !== idx)); }

  async function doImport() {
    setImporting(true); setErr("");
    try {
      const res = await api.adminImportQuestions(paperId, { questions });
      onDone(res.count);
    } catch (ex) { setErr(ex.message); setImporting(false); }
  }

  return (
    <div className="imp-overlay">
      <div className="imp-modal">
        <div className="imp-modal-head">
          <h3>Import Questions from PDF</h3>
          <button className="adm-icon-btn" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>

        {err && <div className="form-error" style={{ margin: "0 0 .75rem" }}>{err}</div>}

        {!questions.length ? (
          <div className="imp-drop-zone">
            <Icon name="filePdf" size={36} />
            <p>Upload a PDF with MCQ questions</p>
            <small>Numbered questions (1. / Q1.) with A–E choices. Answer and Explanation lines are auto-detected.</small>
            <button className="adm-btn adm-btn-primary" onClick={() => fileRef.current.click()} disabled={parsing}>
              {parsing ? "Parsing…" : "Choose PDF"}
            </button>
          </div>
        ) : (
          <>
            <div className="imp-toolbar">
              <span>{questions.length} question{questions.length !== 1 ? "s" : ""} detected — click to expand &amp; edit</span>
              <button className="adm-btn adm-btn-ghost" onClick={() => { setQuestions([]); fileRef.current.value = ""; }}>
                <Icon name="rotate" size={12} /> Different file
              </button>
            </div>
            <div className="imp-list">
              {questions.map((q, i) => (
                <QPreviewItem key={i} q={q} idx={i} onChange={update} onRemove={remove} />
              ))}
            </div>
            <div className="imp-footer">
              <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="adm-btn adm-btn-primary" onClick={doImport}
                disabled={importing || !questions.length}>
                {importing ? "Importing…" : `Import ${questions.length} question${questions.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        )}

        <input ref={fileRef} type="file" accept="application/pdf,.pdf"
          style={{ display: "none" }} onChange={handleFile} />
      </div>
    </div>
  );
}
