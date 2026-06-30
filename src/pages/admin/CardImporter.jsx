import { useState, useRef } from "react";
import { extractPdfText, parseFlashcardsFromText, parseFlashcardsFromCsv } from "../../lib/pdfParser";
import { api } from "../../api";
import Icon from "../../components/Icon";

function CardPreviewItem({ card, idx, onChange, onRemove }) {
  return (
    <div className="imp-card-item">
      <span className="imp-num">{idx + 1}</span>
      <div className="imp-card-sides">
        <input className="adm-input" value={card.front} placeholder="Front…"
          onChange={e => onChange(idx, "front", e.target.value)} />
        <input className="adm-input" value={card.back} placeholder="Back…"
          onChange={e => onChange(idx, "back", e.target.value)} />
      </div>
      <button className="adm-icon-btn" onClick={() => onRemove(idx)}>
        <Icon name="trash" size={12} />
      </button>
    </div>
  );
}

export default function CardImporter({ deckId, onDone, onClose }) {
  const [cards,     setCards]     = useState([]);
  const [parsing,   setParsing]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [err,       setErr]       = useState("");
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true); setErr(""); setCards([]);
    try {
      let parsed = [];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        parsed = parseFlashcardsFromCsv(await file.text());
      } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        parsed = parseFlashcardsFromText(await extractPdfText(file));
      } else {
        parsed = parseFlashcardsFromText(await file.text());
      }
      if (!parsed.length)
        setErr("No cards detected. Check the format guide below and try again.");
      else
        setCards(parsed);
    } catch (ex) { setErr("Failed to read file: " + ex.message); }
    finally { setParsing(false); }
  }

  function update(idx, field, val) {
    setCards(cs => cs.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  }
  function remove(idx) { setCards(cs => cs.filter((_, i) => i !== idx)); }

  async function doImport() {
    setImporting(true); setErr("");
    try {
      const res = await api.adminImportCards(deckId, { cards });
      onDone(res.count);
    } catch (ex) { setErr(ex.message); setImporting(false); }
  }

  return (
    <div className="imp-overlay">
      <div className="imp-modal">
        <div className="imp-modal-head">
          <h3>Import Flashcards from File</h3>
          <button className="adm-icon-btn" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>

        {err && <div className="form-error" style={{ margin: "0 0 .75rem" }}>{err}</div>}

        {!cards.length ? (
          <div className="imp-drop-zone">
            <Icon name="upload" size={36} />
            <p>Upload a file with flashcard content</p>
            <div className="imp-formats">
              <div className="imp-format-row"><strong>CSV</strong> <span>front, back (one per row)</span></div>
              <div className="imp-format-row"><strong>TXT / PDF</strong> <span>front::back (Anki format)</span></div>
              <div className="imp-format-row"><strong>TXT / PDF</strong> <span>Q: … / A: … pairs</span></div>
              <div className="imp-format-row"><strong>TXT / PDF</strong> <span>blank-line-separated blocks</span></div>
            </div>
            <button className="adm-btn adm-btn-primary" onClick={() => fileRef.current.click()} disabled={parsing}>
              {parsing ? "Parsing…" : "Choose file"}
            </button>
          </div>
        ) : (
          <>
            <div className="imp-toolbar">
              <span>{cards.length} card{cards.length !== 1 ? "s" : ""} found</span>
              <button className="adm-btn adm-btn-ghost" onClick={() => { setCards([]); fileRef.current.value = ""; }}>
                <Icon name="rotate" size={12} /> Different file
              </button>
            </div>
            <div className="imp-list">
              {cards.map((c, i) => (
                <CardPreviewItem key={i} card={c} idx={i} onChange={update} onRemove={remove} />
              ))}
            </div>
            <div className="imp-footer">
              <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="adm-btn adm-btn-primary" onClick={doImport}
                disabled={importing || !cards.length}>
                {importing ? "Importing…" : `Import ${cards.length} card${cards.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        )}

        <input ref={fileRef} type="file"
          accept="application/pdf,.pdf,text/plain,.txt,text/csv,.csv"
          style={{ display: "none" }} onChange={handleFile} />
      </div>
    </div>
  );
}
