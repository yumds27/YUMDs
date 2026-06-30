import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

const LETTERS = ["a", "b", "c", "d", "e"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function groupBySubject(papers) {
  const map = new Map();
  for (const p of papers) {
    const key = p.subject_name || "General";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return [...map.entries()];
}

function fmtTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

// ── Papers list ───────────────────────────────────────────────────────────────
function PapersList({ year, setYear, onSelect }) {
  const [papers, setPapers]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getPapers(year).then(d => setPapers(d.papers)).finally(() => setLoading(false));
  }, [year]);

  const groups = groupBySubject(papers);

  return (
    <div className="browser-card">
      <div className="browser-card-header">
        <h2>Past Papers</h2>
        <div className="year-tabs">
          {[1,2,3,4,5,6].map(y => (
            <button key={y} className={`year-tab${year === y ? " active" : ""}`} onClick={() => setYear(y)}>
              Year {y}
            </button>
          ))}
        </div>
      </div>
      <div className="pp-list-body">
        {loading && <div className="col-empty" style={{ padding:"2rem" }}>Loading…</div>}
        {!loading && papers.length === 0 && (
          <div className="col-empty" style={{ padding:"2.5rem", textAlign:"center" }}>No past papers for Year {year} yet.</div>
        )}
        {groups.map(([subject, subs]) => (
          <div key={subject} className="pp-subject-group">
            <div className="pp-subject-header">
              <span className="pp-subject-name">{subject}</span>
              <span className="pp-subject-count">{subs.length} paper{subs.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="pp-papers-list">
              {subs.map(p => (
                <button key={p.id} className="pp-paper-row" onClick={() => onSelect(p)}>
                  <div className="pp-paper-icon"><Icon name="papers" size={18} /></div>
                  <div className="pp-paper-info">
                    <div className="pp-paper-name">{p.name}</div>
                    <div className="pp-paper-qcount">{p.question_count} question{p.question_count !== 1 ? "s" : ""}</div>
                  </div>
                  <Icon name="arrowLeft" size={15} style={{ transform:"rotate(180deg)", color:"var(--muted)" }} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mode selection ────────────────────────────────────────────────────────────
function ModeSelect({ paper, allQuestions, onStart, onBack }) {
  const [mode, setMode]   = useState("tutor");
  const max               = Math.min(allQuestions.length, 40);
  const [count, setCount] = useState(Math.min(max, 20));
  const timeMins          = count;

  return (
    <div className="mode-select">
      <button className="btn-ghost mode-back-btn" onClick={onBack}>
        <Icon name="arrowLeft" size={15} /> Back to papers
      </button>
      <div className="mode-select-card">
        <div className="mode-paper-meta">
          {paper.subject_name && <span className="mode-subject-badge">{paper.subject_name}</span>}
          <h2 className="mode-paper-name">{paper.name}</h2>
          <p className="mode-paper-avail">{allQuestions.length} question{allQuestions.length !== 1 ? "s" : ""} available</p>
        </div>
        <div className="mode-section">
          <p className="mode-section-label">Study mode</p>
          <div className="mode-choice-row">
            <button className={`mode-choice${mode === "tutor" ? " selected" : ""}`} onClick={() => setMode("tutor")}>
              <div className="mode-choice-icon" style={{ background:"#eff6ff", color:"#2563eb" }}><Icon name="check" size={24} /></div>
              <div className="mode-choice-name">Tutor Mode</div>
              <div className="mode-choice-desc">Instant feedback after each answer, with explanations</div>
            </button>
            <button className={`mode-choice${mode === "exam" ? " selected" : ""}`} onClick={() => setMode("exam")}>
              <div className="mode-choice-icon" style={{ background:"#fff7ed", color:"#ea580c" }}><Icon name="clock" size={24} /></div>
              <div className="mode-choice-name">Exam Mode</div>
              <div className="mode-choice-desc">Timed count-up, no hints — submit at the end to see results</div>
            </button>
          </div>
        </div>
        <div className="mode-section">
          <p className="mode-section-label">
            Questions {max < allQuestions.length && <span className="mode-max-note">(max 40)</span>}
          </p>
          <div className="mode-count-wrap">
            <input type="range" min={1} max={max} value={count}
              onChange={e => setCount(+e.target.value)} className="mode-slider" />
            <span className="mode-count-num">{count}</span>
          </div>
          {mode === "exam" && (
            <div className="mode-time-note">
              <Icon name="clock" size={13} />
              Count-up timer · {count} question{count !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <button className="btn-primary mode-start-btn"
          onClick={() => onStart(mode, shuffle(allQuestions).slice(0, count))}
          disabled={allQuestions.length === 0}>
          Start {mode === "exam" ? "Exam" : "Session"}
        </button>
      </div>
    </div>
  );
}

// ── UWorld-style single-question session ──────────────────────────────────────
function QuestionSession({ paper, questions, mode, onBack }) {
  const [idx, setIdx]           = useState(0);
  const [answers, setAnswers]   = useState({});
  const [revealed, setRevealed] = useState({});
  const [marked, setMarked]     = useState(new Set());
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMap, setShowMap]   = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const submittingRef           = useRef(false);

  // Count-up timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const q        = questions[idx];
  const opts     = LETTERS.filter(l => q[`option_${l}`]);
  const selected = answers[q.id];
  const res      = revealed[q.id];
  const isMarked = marked.has(q.id);
  const reviewMode = mode === "exam" && submitted;

  function toggleMark() {
    setMarked(m => { const n = new Set(m); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
  }

  async function handleSelect(letter) {
    if (reviewMode || (mode === "tutor" && res) || (mode === "exam" && submitted)) return;
    setAnswers(a => ({ ...a, [q.id]: letter }));
    if (mode === "tutor") {
      try {
        const r = await api.checkAnswer(q.id, letter);
        setRevealed(rv => ({ ...rv, [q.id]: r }));
      } catch {}
    }
  }

  async function handleSubmit() {
    if (submittingRef.current || submitted) return;
    submittingRef.current = true;
    setSubmitting(true);
    const nr = {};
    await Promise.all(questions.map(async q => {
      const chosen = answers[q.id];
      if (!chosen) { nr[q.id] = { correct: null, isCorrect: false, explanation: null }; return; }
      try { nr[q.id] = await api.checkAnswer(q.id, chosen); }
      catch { nr[q.id] = { correct: null, isCorrect: false, explanation: null }; }
    }));
    setRevealed(nr);
    setSubmitted(true);
    setSubmitting(false);
    submittingRef.current = false;
    setIdx(0);
  }

  const totalAnswered = Object.keys(answers).length;
  const totalCorrect  = Object.values(revealed).filter(r => r.isCorrect).length;
  const progress      = (idx + 1) / questions.length;

  return (
    <div className="uw-session">
      {/* Top bar */}
      <div className="uw-topbar">
        <div className="uw-topbar-left">
          <button className="uw-back-btn" onClick={onBack}><Icon name="arrowLeft" size={14} /></button>
          <div className="uw-item-count">
            <span className="uw-item-n">Item {idx + 1}</span>
            <span className="uw-item-of">of {questions.length}</span>
          </div>
          <button className={`uw-mark-btn${isMarked ? " marked" : ""}`} onClick={toggleMark}>
            <Icon name="mark" size={13} />
            {isMarked ? "Marked" : "Mark"}
          </button>
        </div>
        <div className="uw-topbar-right">
          <div className="uw-timer"><Icon name="clock" size={13} />{fmtTime(elapsed)}</div>
          {mode === "exam" && !submitted && (
            <button className="uw-submit-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Checking…" : "Submit"}
            </button>
          )}
          {reviewMode && (
            <div className="uw-score-badge">
              {totalCorrect}/{questions.length} · {Math.round(totalCorrect / questions.length * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="uw-progress-bar">
        <div className="uw-progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Scrollable question */}
      <div className="uw-scroll">
        <div className="uw-question-area">
          <div className="uw-question-stem">{q.body}</div>

          <div className="uw-options">
            {opts.map(l => {
              let cls = "uw-option";
              if (res || reviewMode) {
                const r = revealed[q.id];
                if (r?.correct && l === r.correct)       cls += " uw-opt-correct";
                else if (l === selected && r && !r.isCorrect) cls += " uw-opt-wrong";
              } else if (l === selected) {
                cls += " uw-opt-selected";
              }
              const radioFilled = cls.includes("uw-opt-correct") || cls.includes("uw-opt-wrong") || cls.includes("uw-opt-selected");
              return (
                <button key={l} className={cls}
                  onClick={() => handleSelect(l)}
                  disabled={!!(res || reviewMode || (mode === "exam" && submitted))}>
                  <div className="uw-opt-radio">
                    {radioFilled && <div style={{ width:8, height:8, borderRadius:"50%", background:"currentColor" }} />}
                  </div>
                  <span className="uw-opt-letter">{l.toUpperCase()}.</span>
                  <span className="uw-opt-text">{q[`option_${l}`]}</span>
                </button>
              );
            })}
          </div>

          {/* Status + Explanation (tutor after answer, or review mode) */}
          {(res || reviewMode) && revealed[q.id] && (() => {
            const r = revealed[q.id];
            return (
              <>
                <div className={`uw-status-bar${r.isCorrect ? " correct" : " wrong"}`}>
                  <div className="uw-status-left">
                    <Icon name={r.isCorrect ? "check" : "close"} size={15} />
                    {r.isCorrect
                      ? "Correct"
                      : `Incorrect${r.correct ? ` — Correct answer: ${r.correct.toUpperCase()}` : ""}`}
                  </div>
                </div>

                {(r.explanation || r.explanation_image || r.explanation_svg) && (
                  <div className="uw-explanation">
                    <div className="uw-explanation-title">Explanation</div>
                    {r.explanation_svg && (
                      <div className="uw-explanation-svg"
                        dangerouslySetInnerHTML={{ __html: r.explanation_svg }} />
                    )}
                    {r.explanation_image && (
                      <img className="uw-explanation-image"
                        src={`/api/questions/${q.id}/explanation-image`}
                        alt="Explanation diagram" />
                    )}
                    {r.explanation && (
                      <div className="uw-explanation-text">{r.explanation}</div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="uw-bottombar">
        <button className="uw-nav-btn"
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}>
          <Icon name="arrowLeft" size={14} /> Previous
        </button>

        <button className="uw-qmap-btn" onClick={() => setShowMap(true)}>
          {totalAnswered}/{questions.length} answered
        </button>

        <button className="uw-nav-btn"
          onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))}
          disabled={idx === questions.length - 1}>
          Next <Icon name="arrowLeft" size={14} style={{ transform:"rotate(180deg)" }} />
        </button>
      </div>

      {/* Question map */}
      {showMap && (
        <div className="uw-map-overlay" onClick={() => setShowMap(false)}>
          <div className="uw-map-panel" onClick={e => e.stopPropagation()}>
            <div className="uw-map-header">Question Navigator</div>
            <div className="uw-map-grid">
              {questions.map((q2, i) => {
                const r2  = revealed[q2.id];
                const ans = answers[q2.id];
                let cls   = "uw-map-dot";
                if (r2)       cls += r2.isCorrect ? " dot-correct" : " dot-wrong";
                else if (ans) cls += " dot-answered";
                if (marked.has(q2.id)) cls += " dot-marked";
                if (i === idx)         cls += " dot-current";
                return (
                  <button key={q2.id} className={cls}
                    onClick={() => { setIdx(i); setShowMap(false); }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="uw-map-legend">
              <span className="legend-dot dot-correct" /> Correct &nbsp;
              <span className="legend-dot dot-wrong" /> Wrong &nbsp;
              <span className="legend-dot dot-answered" /> Answered &nbsp;
              <span className="legend-dot" /> Unanswered &nbsp;
              <span className="legend-dot dot-marked" /> Marked
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function PastPapers({ student }) {
  const [year, setYear]     = useState(student.current_year ?? student.year ?? 1);
  const [view, setView]     = useState("list");
  const [paper, setPaper]   = useState(null);
  const [allQs, setAllQs]   = useState([]);
  const [sessionQs, setSessionQs]   = useState([]);
  const [sessionMode, setSessionMode] = useState("tutor");
  const [loadingQs, setLoadingQs]   = useState(false);

  function handleSelectPaper(p) {
    setPaper(p); setView("mode"); setLoadingQs(true);
    api.getPaperQuestions(p.id).then(d => setAllQs(d.questions)).finally(() => setLoadingQs(false));
  }

  function handleStartSession(mode, qs) {
    setSessionMode(mode); setSessionQs(qs); setView("session");
  }

  function handleBack() { setView("list"); setPaper(null); setAllQs([]); setSessionQs([]); }

  if (view === "session") {
    return <QuestionSession paper={paper} questions={sessionQs} mode={sessionMode}
      onBack={() => setView("mode")} />;
  }

  if (view === "mode") {
    return loadingQs
      ? <div className="col-empty" style={{ padding:"3rem", textAlign:"center" }}>Loading questions…</div>
      : <ModeSelect paper={paper} allQuestions={allQs} onStart={handleStartSession} onBack={handleBack} />;
  }

  return <PapersList year={year} setYear={setYear} onSelect={handleSelectPaper} />;
}
