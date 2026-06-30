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
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
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
              <div className="mode-choice-desc">Instant feedback after each answer</div>
            </button>
            <button className={`mode-choice${mode === "exam" ? " selected" : ""}`} onClick={() => setMode("exam")}>
              <div className="mode-choice-icon" style={{ background:"#fff7ed", color:"#ea580c" }}><Icon name="clock" size={24} /></div>
              <div className="mode-choice-name">Exam Mode</div>
              <div className="mode-choice-desc">Timed — submit each question to reveal</div>
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
              <Icon name="clock" size={13} /> Count-up timer · {count} question{count !== 1 ? "s" : ""}
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

// ── UWorld-style session ──────────────────────────────────────────────────────
function QuestionSession({ paper, questions, mode, onBack }) {
  const [idx, setIdx]           = useState(0);
  const [answers, setAnswers]   = useState({});
  const [revealed, setRevealed] = useState({});
  const [marked, setMarked]     = useState(new Set());
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const submittingRef           = useRef(false);
  const sessionRecordedRef      = useRef(false);
  const elapsedRef              = useRef(0);
  const handlersRef             = useRef({});

  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  // Timer stops when exam is ended
  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [submitted]);

  const q        = questions[idx];
  const opts     = LETTERS.filter(l => q[`option_${l}`]);
  const selected = answers[q.id];
  const res      = revealed[q.id];
  const isMarked = marked.has(q.id);
  const totalCorrect  = Object.values(revealed).filter(r => r.isCorrect).length;
  const totalAnswered = Object.keys(answers).length;
  const totalRevealed = Object.keys(revealed).length;
  const allRevealed   = totalRevealed >= questions.length;

  function toggleMark() {
    setMarked(m => { const n = new Set(m); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
  }

  async function recordSession(rev) {
    if (sessionRecordedRef.current) return;
    sessionRecordedRef.current = true;
    const score = Object.values(rev).filter(r => r.isCorrect).length;
    try {
      await api.recordPaperSession({
        paper_id: paper.id,
        paper_name: paper.name,
        mode,
        score,
        total: questions.length,
        time_sec: elapsedRef.current,
      });
    } catch {}
  }

  async function handleSelect(letter) {
    if (revealed[q.id] || submitted || submittingRef.current) return;
    if (!opts.includes(letter)) return;
    setAnswers(a => ({ ...a, [q.id]: letter }));
    if (mode === "tutor") {
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const r = await api.checkAnswer(q.id, letter);
        setRevealed(rv => {
          const newRv = { ...rv, [q.id]: r };
          if (Object.keys(newRv).length >= questions.length) recordSession(newRv);
          return newRv;
        });
      } catch {}
      finally { setSubmitting(false); submittingRef.current = false; }
    }
  }

  async function handleSubmitQuestion() {
    const qId  = q.id;
    const ans  = answers[qId];
    if (!ans || revealed[qId] || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const r = await api.checkAnswer(qId, ans);
      setRevealed(rv => ({ ...rv, [qId]: r }));
    } catch {}
    finally { setSubmitting(false); submittingRef.current = false; }
  }

  async function handleEndExam() {
    const pending = questions.filter(q2 => answers[q2.id] && !revealed[q2.id]);
    const newRev  = { ...revealed };
    await Promise.all(pending.map(async q2 => {
      try { newRev[q2.id] = await api.checkAnswer(q2.id, answers[q2.id]); }
      catch { newRev[q2.id] = { correct: null, isCorrect: false, explanation: null }; }
    }));
    for (const q2 of questions) {
      if (!newRev[q2.id]) newRev[q2.id] = { correct: null, isCorrect: false, explanation: null };
    }
    setRevealed(newRev);
    setSubmitted(true);
    await recordSession(newRev);
    setIdx(0);
  }

  // Keep handlers ref fresh for keyboard shortcut listener
  handlersRef.current = { handleSelect, handleSubmitQuestion, toggleMark };

  // Keyboard shortcuts
  useEffect(() => {
    const KEY_L = {
      a:"a", A:"a", "1":"a",
      b:"b", B:"b", "2":"b",
      c:"c", C:"c", "3":"c",
      d:"d", D:"d", "4":"d",
      e:"e", E:"e", "5":"e",
    };
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const key = e.key;
      if (key === "ArrowLeft"  || key === "p" || key === "P") { setIdx(i => Math.max(0, i - 1)); return; }
      if (key === "ArrowRight" || key === "n" || key === "N") { setIdx(i => Math.min(questions.length - 1, i + 1)); return; }
      if (key === "m" || key === "M") { handlersRef.current.toggleMark(); return; }
      const letter = KEY_L[key];
      if (letter) { handlersRef.current.handleSelect(letter); return; }
      if (key === "Enter") handlersRef.current.handleSubmitQuestion();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [questions.length]);

  // ── helpers ──
  function dotCls(i) {
    const q2 = questions[i];
    const r2 = revealed[q2.id];
    const a2 = answers[q2.id];
    let cls = "uw-nav-dot";
    if (r2) cls += r2.isCorrect ? " dot-correct" : " dot-wrong";
    else if (a2) cls += " dot-answered";
    if (marked.has(q2.id)) cls += " dot-marked";
    if (i === idx) cls += " dot-current";
    return cls;
  }

  function choiceCls(l) {
    let cls = "uw-choice";
    const r = revealed[q.id];
    if (r) {
      if (l === r.correct)            cls += " choice-correct";
      else if (l === selected && !r.isCorrect) cls += " choice-wrong";
    } else if (l === selected) {
      cls += " choice-selected";
    }
    return cls;
  }

  const isDisabled = !!(res || submitted);
  const showScore  = submitted || (mode === "tutor" && allRevealed);

  return (
    <div className="uw-session">
      {/* Top bar */}
      <div className="uw-topbar">
        <div className="uw-topbar-left">
          <button className="uw-back-btn" onClick={onBack}><Icon name="arrowLeft" size={14} /></button>
          <span className="uw-paper-name">{paper.name}</span>
          <button className={`uw-mark-btn${isMarked ? " marked" : ""}`} onClick={toggleMark}>
            <Icon name="mark" size={13} />
            <span className="uw-mark-label">{isMarked ? "Marked" : "Mark"}</span>
          </button>
        </div>
        <div className="uw-topbar-right">
          <div className="uw-timer"><Icon name="clock" size={13} />{fmtTime(elapsed)}</div>
          {mode === "exam" && !submitted && (
            <button className="uw-end-btn" onClick={handleEndExam} disabled={submitting}>
              End Exam
            </button>
          )}
          {showScore && (
            <div className="uw-score-badge">
              {totalCorrect}/{questions.length} · {Math.round(totalCorrect / questions.length * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="uw-progress-bar">
        <div className="uw-progress-fill" style={{ width: `${(totalRevealed / questions.length) * 100}%` }} />
      </div>

      {/* Two-column body */}
      <div className="uw-body">
        {/* Left: question navigator */}
        <div className="uw-nav-panel">
          <div className="uw-nav-panel-title">Questions</div>
          <div className="uw-nav-dots">
            {questions.map((_, i) => (
              <button key={i} className={dotCls(i)} onClick={() => setIdx(i)}>{i + 1}</button>
            ))}
          </div>
          <div className="uw-nav-legend">
            <div className="uw-legend-row"><span className="legend-dot dot-correct" /> Correct</div>
            <div className="uw-legend-row"><span className="legend-dot dot-wrong" /> Wrong</div>
            <div className="uw-legend-row"><span className="legend-dot dot-answered" /> Answered</div>
            <div className="uw-legend-row"><span className="legend-dot dot-marked" style={{ outline:"2px solid #f59e0b", outlineOffset:"1px" }} /> Marked</div>
          </div>
        </div>

        {/* Right: question content */}
        <div className="uw-content">
          {/* Score banner */}
          {showScore && (
            <div className="uw-results-banner" style={{ marginBottom:"1.5rem", borderRadius:10 }}>
              <div>
                <div className="uw-results-pct">{Math.round(totalCorrect / questions.length * 100)}%</div>
                <div className="uw-results-label">Score</div>
              </div>
              <div>
                <div className="uw-results-pct" style={{ fontSize:"1.5rem" }}>{totalCorrect}/{questions.length}</div>
                <div className="uw-results-label">Correct</div>
              </div>
              <div>
                <div className="uw-results-pct" style={{ fontSize:"1.5rem" }}>{fmtTime(elapsed)}</div>
                <div className="uw-results-label">Time</div>
              </div>
            </div>
          )}

          {/* Item counter */}
          <div className="uw-item-label">Item {idx + 1} of {questions.length}</div>

          {/* Question stem */}
          <div className="uw-question-stem">{q.body}</div>

          {/* Flat choices */}
          <div className="uw-choices">
            {opts.map(l => (
              <button key={l} className={choiceCls(l)}
                onClick={() => handleSelect(l)}
                disabled={isDisabled}>
                <span className="uw-choice-letter">{l.toUpperCase()}.</span>
                <span className="uw-choice-text">{q[`option_${l}`]}</span>
              </button>
            ))}
          </div>

          {/* Per-question submit (exam mode) */}
          {mode === "exam" && !submitted && answers[q.id] && !revealed[q.id] && (
            <button className="uw-submit-q-btn" onClick={handleSubmitQuestion} disabled={submitting}>
              {submitting ? "Checking…" : "Submit Answer"}
            </button>
          )}

          {/* Status + Explanation */}
          {revealed[q.id] && (() => {
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
                      <div className="uw-explanation-svg" dangerouslySetInnerHTML={{ __html: r.explanation_svg }} />
                    )}
                    {r.explanation_image && (
                      <img className="uw-explanation-image"
                        src={`/api/questions/${q.id}/explanation-image`} alt="Explanation diagram" />
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
          <Icon name="arrowLeft" size={14} /> Prev
        </button>
        <span className="uw-nav-count">{totalAnswered}/{questions.length} answered</span>
        <button className="uw-nav-btn"
          onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))}
          disabled={idx === questions.length - 1}>
          Next <Icon name="arrowLeft" size={14} style={{ transform:"rotate(180deg)" }} />
        </button>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function PastPapers({ student }) {
  const [year, setYear]             = useState(student.current_year ?? student.year ?? 1);
  const [view, setView]             = useState("list");
  const [paper, setPaper]           = useState(null);
  const [allQs, setAllQs]           = useState([]);
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
