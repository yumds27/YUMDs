import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

const LETTERS = ["a", "b", "c", "d", "e"];

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── Papers list (grouped by subject) ─────────────────────────────────────────
function PapersList({ year, setYear, onSelect }) {
  const [papers, setPapers]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getPapers(year)
      .then(d => setPapers(d.papers))
      .finally(() => setLoading(false));
  }, [year]);

  const groups = groupBySubject(papers);

  return (
    <div>
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
          {loading && <div className="col-empty" style={{ padding: "2rem" }}>Loading…</div>}
          {!loading && papers.length === 0 && (
            <div className="col-empty" style={{ padding: "2.5rem", textAlign: "center" }}>
              No past papers for Year {year} yet.
            </div>
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
                    <div className="pp-paper-icon">
                      <Icon name="papers" size={18} />
                    </div>
                    <div className="pp-paper-info">
                      <div className="pp-paper-name">{p.name}</div>
                      <div className="pp-paper-qcount">{p.question_count} question{p.question_count !== 1 ? "s" : ""}</div>
                    </div>
                    <Icon name="arrowLeft" size={15} className="pp-paper-arrow" style={{ transform: "rotate(180deg)" }} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mode selection ────────────────────────────────────────────────────────────
function ModeSelect({ paper, allQuestions, onStart, onBack }) {
  const [mode, setMode]   = useState("tutor");
  const max               = Math.min(allQuestions.length, 40);
  const [count, setCount] = useState(Math.min(max, 20));

  const timeMins = count; // 1 min per question

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
              <div className="mode-choice-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                <Icon name="check" size={24} />
              </div>
              <div className="mode-choice-name">Tutor Mode</div>
              <div className="mode-choice-desc">Instant feedback after each answer, with explanations</div>
            </button>
            <button className={`mode-choice${mode === "exam" ? " selected" : ""}`} onClick={() => setMode("exam")}>
              <div className="mode-choice-icon" style={{ background: "#fff7ed", color: "#ea580c" }}>
                <Icon name="clock" size={24} />
              </div>
              <div className="mode-choice-name">Exam Mode</div>
              <div className="mode-choice-desc">Timed, no hints — submit at the end to see results</div>
            </button>
          </div>
        </div>

        <div className="mode-section">
          <p className="mode-section-label">
            Questions
            {max < allQuestions.length && <span className="mode-max-note"> (max 40)</span>}
          </p>
          <div className="mode-count-wrap">
            <input
              type="range" min={1} max={max} value={count}
              onChange={e => setCount(+e.target.value)}
              className="mode-slider"
            />
            <span className="mode-count-num">{count}</span>
          </div>
          {mode === "exam" && (
            <div className="mode-time-note">
              <Icon name="clock" size={13} />
              Time limit: {timeMins} minute{timeMins !== 1 ? "s" : ""} &nbsp;·&nbsp; {count} × 1 min/question
            </div>
          )}
        </div>

        <button
          className="btn-primary mode-start-btn"
          onClick={() => onStart(mode, shuffle(allQuestions).slice(0, count))}
          disabled={allQuestions.length === 0}
        >
          Start {mode === "exam" ? "Exam" : "Session"}
        </button>
      </div>
    </div>
  );
}

// ── Exam / Tutor session ──────────────────────────────────────────────────────
function Session({ paper, questions, mode, onDone, onBack }) {
  // answers: { qId: letter }
  const [answers,  setAnswers]  = useState({});
  // revealed: { qId: { correct, explanation, isCorrect } } — tutor only during session, exam only after submit
  const [revealed, setRevealed] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Always call the hook unconditionally; pass Infinity for tutor mode so it never fires
  const totalSec = mode === "exam" ? questions.length * 60 : Infinity;
  const timerRaw = useCountdownInner(totalSec, () => {
    if (!submittingRef.current) doSubmit();
  });
  const timer = mode === "exam" ? timerRaw : null;

  // Tutor mode: check answer immediately on click
  async function selectAnswerTutor(qId, letter) {
    if (revealed[qId]) return;
    setAnswers(a => ({ ...a, [qId]: letter }));
    try {
      const res = await api.checkAnswer(qId, letter);
      setRevealed(r => ({ ...r, [qId]: res }));
    } catch { /* ignore */ }
  }

  // Exam mode: just record locally
  function selectAnswerExam(qId, letter) {
    if (submitted) return;
    setAnswers(a => ({ ...a, [qId]: letter }));
  }

  async function doSubmit() {
    if (submittingRef.current || submitted) return;
    submittingRef.current = true;
    setSubmitting(true);
    const newRevealed = {};
    await Promise.all(questions.map(async q => {
      const chosen = answers[q.id];
      if (!chosen) { newRevealed[q.id] = { correct: null, isCorrect: false, explanation: null }; return; }
      try {
        const res = await api.checkAnswer(q.id, chosen);
        newRevealed[q.id] = res;
      } catch { newRevealed[q.id] = { correct: null, isCorrect: false, explanation: null }; }
    }));
    setRevealed(newRevealed);
    setSubmitted(true);
    setSubmitting(false);
    submittingRef.current = false;
  }

  const answeredCount = Object.keys(answers).length;
  const correctCount  = Object.values(revealed).filter(r => r.isCorrect).length;
  const allAnswered   = answeredCount === questions.length;

  // After exam submission → show results
  if (mode === "exam" && submitted) {
    return (
      <ExamResults
        paper={paper}
        questions={questions}
        answers={answers}
        revealed={revealed}
        correctCount={correctCount}
        onRetry={() => onDone()}
        onBack={onBack}
      />
    );
  }

  const selectFn = mode === "tutor" ? selectAnswerTutor : selectAnswerExam;

  return (
    <div className="session-wrap">
      {/* Header */}
      <div className="session-header">
        <button className="btn-ghost session-back-btn" onClick={onBack}>
          <Icon name="arrowLeft" size={15} />
        </button>
        <div className="session-title">{paper.name}</div>
        <div className="session-meta">
          {mode === "exam" && timer && (
            <div className={`session-timer${timer.urgent ? " urgent" : ""}`}>
              <Icon name="clock" size={14} />
              {timer.fmt}
            </div>
          )}
          <div className="session-progress">{answeredCount}/{questions.length}</div>
        </div>
        {mode === "exam" && !submitted && (
          <button
            className="btn-primary"
            onClick={doSubmit}
            disabled={submitting}
            style={{ fontSize: ".8rem", padding: ".35rem .9rem" }}
          >
            {submitting ? "Checking…" : "Submit"}
          </button>
        )}
      </div>

      {mode === "exam" && timer && (
        <div className="session-timer-bar">
          <div
            className={`session-timer-fill${timer.urgent ? " urgent" : ""}`}
            style={{ width: `${timer.pct * 100}%` }}
          />
        </div>
      )}

      {/* Question list */}
      <div className="session-questions">
        {questions.map((q, i) => {
          const res      = revealed[q.id];
          const selected = answers[q.id];
          const opts     = LETTERS.filter(l => q[`option_${l}`]);
          const cardCls  = res ? (res.isCorrect ? " q-correct" : " q-wrong") : "";

          return (
            <div key={q.id} className={`question-card${cardCls}`} id={`q-${q.id}`}>
              <div className="question-num">Question {i + 1}</div>
              <div className="question-body">{q.body}</div>
              <div className="question-options">
                {opts.map(l => {
                  let cls = "option";
                  if (res) {
                    if (l === res.correct)    cls += " opt-correct";
                    else if (l === selected)  cls += " opt-wrong";
                  } else if (l === selected)  cls += " opt-selected";
                  return (
                    <button
                      key={l} className={cls}
                      onClick={() => selectFn(q.id, l)}
                      disabled={!!(res || (mode === "exam" && submitted))}
                    >
                      <span className="opt-letter">{l.toUpperCase()}</span>
                      {q[`option_${l}`]}
                    </button>
                  );
                })}
              </div>
              {/* Tutor mode: show explanation immediately */}
              {mode === "tutor" && res?.explanation && (
                <div className="question-explanation">
                  <strong>Explanation:</strong> {res.explanation}
                </div>
              )}
              {/* Tutor mode: show correct answer indicator */}
              {mode === "tutor" && res && !res.isCorrect && res.correct && (
                <div className="question-correct-hint">
                  Correct answer: <strong>{res.correct.toUpperCase()}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Exam mode bottom submit */}
      {mode === "exam" && !submitted && (
        <div className="session-footer">
          <span style={{ fontSize: ".85rem", color: "var(--muted)" }}>
            {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? "s" : ""} remaining
          </span>
          <button className="btn-primary" onClick={doSubmit} disabled={submitting}>
            {submitting ? "Checking answers…" : `Submit${!allAnswered ? " anyway" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}

// Inner hook (must be called unconditionally so it's always called, but only used when mode===exam)
function useCountdownInner(totalSec, onExpire) {
  const [left, setLeft] = useState(totalSec);
  const fired = useRef(false);

  useEffect(() => {
    if (totalSec === Infinity) return;
    if (left <= 0) {
      if (!fired.current) { fired.current = true; onExpire(); }
      return;
    }
    const id = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left, totalSec]);

  return { left, fmt: fmtTime(left), pct: Math.max(0, left / totalSec), urgent: left <= 60 };
}

// ── Results page ──────────────────────────────────────────────────────────────
function ExamResults({ paper, questions, answers, revealed, correctCount, onRetry, onBack }) {
  const pct = Math.round((correctCount / questions.length) * 100);
  const color = pct >= 70 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="exam-results">
      <div className="results-card">
        <div className="results-score" style={{ color }}>{pct}%</div>
        <div className="results-label">{correctCount} / {questions.length} correct</div>
        <div className="results-actions">
          <button className="btn-primary" onClick={onRetry}>Try again</button>
          <button className="btn-secondary" onClick={onBack}>Back to papers</button>
        </div>
        <div className="results-review">
          {questions.map((q, i) => {
            const res = revealed[q.id];
            return (
              <div key={q.id} className={`review-item ${res?.isCorrect ? "review-correct" : "review-wrong"}`}>
                <div className="review-q"><strong>Q{i + 1}.</strong> {q.body}</div>
                <div className="review-answer">
                  Your answer: <strong>{answers[q.id]?.toUpperCase() ?? "—"}</strong>
                  {" · "}Correct: <strong>{res?.correct?.toUpperCase() ?? "?"}</strong>
                </div>
                {res?.explanation && <div className="review-explanation">{res.explanation}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function PastPapers({ student }) {
  const [year, setYear]       = useState(student.current_year ?? student.year ?? 1);
  const [view, setView]       = useState("list");  // list | mode | session | results
  const [paper, setPaper]     = useState(null);
  const [allQs, setAllQs]     = useState([]);
  const [sessionQs, setSessionQs] = useState([]);
  const [sessionMode, setSessionMode] = useState("tutor");
  const [loadingQs, setLoadingQs] = useState(false);

  function handleSelectPaper(p) {
    setPaper(p);
    setView("mode");
    setLoadingQs(true);
    api.getPaperQuestions(p.id)
      .then(d => setAllQs(d.questions))
      .finally(() => setLoadingQs(false));
  }

  function handleStartSession(mode, qs) {
    setSessionMode(mode);
    setSessionQs(qs);
    setView("session");
  }

  function handleBack() {
    setView("list");
    setPaper(null);
    setAllQs([]);
    setSessionQs([]);
  }

  if (view === "session") {
    return (
      <Session
        paper={paper}
        questions={sessionQs}
        mode={sessionMode}
        onDone={() => setView("mode")}
        onBack={() => setView("mode")}
      />
    );
  }

  if (view === "mode") {
    return loadingQs
      ? <div className="col-empty" style={{ padding: "3rem", textAlign: "center" }}>Loading questions…</div>
      : <ModeSelect paper={paper} allQuestions={allQs} onStart={handleStartSession} onBack={handleBack} />;
  }

  return <PapersList year={year} setYear={y => { setYear(y); }} onSelect={handleSelectPaper} />;
}
