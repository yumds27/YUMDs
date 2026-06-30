import { useState, useEffect, useRef, useMemo } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

const LETTERS = ["a", "b", "c", "d", "e"];

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(s) {
  if (!s && s !== 0) return "—";
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

// ── Read-only review of a completed session ───────────────────────────────────
function ReviewSession({ session, answers: rawAnswers, onBack }) {
  const [idx, setIdx] = useState(0);
  const handlersRef = useRef({});

  const questions = useMemo(() => (rawAnswers ?? []).map(a => ({
    id: a.question_id, body: a.body,
    option_a: a.option_a, option_b: a.option_b,
    option_c: a.option_c, option_d: a.option_d,
    option_e: a.option_e || "",
  })), [rawAnswers]);

  const answersMap = useMemo(() => {
    const m = {};
    (rawAnswers ?? []).forEach(a => { if (a.chosen) m[a.question_id] = a.chosen; });
    return m;
  }, [rawAnswers]);

  const revealedMap = useMemo(() => {
    const m = {};
    (rawAnswers ?? []).forEach(a => {
      m[a.question_id] = {
        correct: a.correct, isCorrect: !!a.is_correct,
        explanation: a.explanation, explanation_image: a.explanation_image,
        explanation_svg: a.explanation_svg,
      };
    });
    return m;
  }, [rawAnswers]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const { setIdx: si, len } = handlersRef.current;
      if (e.key === "ArrowLeft"  || e.key === "p" || e.key === "P") si(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight" || e.key === "n" || e.key === "N") si(i => Math.min(len - 1, i + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!rawAnswers?.length) {
    return (
      <div className="uw-session">
        <div className="uw-topbar">
          <div className="uw-topbar-left">
            <button className="uw-back-btn" onClick={onBack}><Icon name="arrowLeft" size={14} /></button>
            <span className="uw-paper-name">{session.paper_name}</span>
          </div>
        </div>
        <div className="uw-body">
          <div className="uw-content" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ textAlign:"center", color:"var(--muted)", maxWidth:360 }}>
              <Icon name="clock" size={36} />
              <p style={{ marginTop:".75rem", fontWeight:600, fontSize:"1rem" }}>Detailed review not available</p>
              <p style={{ fontSize:".85rem", marginTop:".4rem" }}>Full review is available for sessions completed after the latest update.</p>
              <button className="btn-primary" style={{ marginTop:"1.25rem" }} onClick={onBack}>Back</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  handlersRef.current = { setIdx, len: questions.length };
  const q = questions[idx];
  const opts = LETTERS.filter(l => q[`option_${l}`]);
  const selected = answersMap[q.id];
  const res = revealedMap[q.id];
  const totalCorrect = (rawAnswers ?? []).filter(a => a.is_correct).length;

  function dotCls(i) {
    const q2 = questions[i];
    const r2 = revealedMap[q2.id];
    let cls = "uw-nav-dot";
    if (r2) cls += r2.isCorrect ? " dot-correct" : " dot-wrong";
    if (i === idx) cls += " dot-current";
    return cls;
  }
  function choiceCls(l) {
    let cls = "uw-choice";
    if (l === res?.correct) cls += " choice-correct";
    else if (l === selected && !res?.isCorrect) cls += " choice-wrong";
    return cls;
  }

  return (
    <div className="uw-session">
      <div className="uw-topbar">
        <div className="uw-topbar-left">
          <button className="uw-back-btn" onClick={onBack}><Icon name="arrowLeft" size={14} /></button>
          <span className="uw-paper-name">{session.paper_name} — Review</span>
        </div>
        <div className="uw-topbar-right">
          <div className="uw-score-badge">{totalCorrect}/{questions.length} · {Math.round(totalCorrect / questions.length * 100)}%</div>
        </div>
      </div>
      <div className="uw-progress-bar"><div className="uw-progress-fill" style={{ width:"100%", background:"#22c55e" }} /></div>
      <div className="uw-body">
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
          </div>
        </div>
        <div className="uw-content">
          <div className="uw-item-label">Item {idx + 1} of {questions.length}</div>
          <div className="uw-question-stem">{q.body}</div>
          <div className="uw-choices">
            {opts.map(l => (
              <div key={l} className={choiceCls(l)} style={{ cursor: "default" }}>
                <span className="uw-choice-letter">{l.toUpperCase()}.</span>
                <span className="uw-choice-text">{q[`option_${l}`]}</span>
              </div>
            ))}
          </div>
          <div className={`uw-status-bar${res?.isCorrect ? " correct" : " wrong"}`}>
            <div className="uw-status-left">
              <Icon name={res?.isCorrect ? "check" : "close"} size={15} />
              {res?.isCorrect ? "Correct" : `Incorrect${res?.correct ? ` — Correct answer: ${res.correct.toUpperCase()}` : ""}`}
            </div>
          </div>
          {(res?.explanation || res?.explanation_image || res?.explanation_svg) && (
            <div className="uw-explanation">
              <div className="uw-explanation-title">Explanation</div>
              {res.explanation_svg && <div className="uw-explanation-svg" dangerouslySetInnerHTML={{ __html: res.explanation_svg }} />}
              {res.explanation_image && <img className="uw-explanation-image" src={`/api/questions/${q.id}/explanation-image`} alt="Explanation" />}
              {res.explanation && <div className="uw-explanation-text">{res.explanation}</div>}
            </div>
          )}
        </div>
      </div>
      <div className="uw-bottombar">
        <button className="uw-nav-btn" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>
          <Icon name="arrowLeft" size={14} /> Prev
        </button>
        <span className="uw-nav-count">{idx + 1} / {questions.length}</span>
        <button className="uw-nav-btn" onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))} disabled={idx === questions.length - 1}>
          Next <Icon name="arrowLeft" size={14} style={{ transform: "rotate(180deg)" }} />
        </button>
      </div>
    </div>
  );
}

// ── Tutor-mode session for practising wrong or marked questions ───────────────
function PracticeSession({ paper, questions, onBack }) {
  const [idx, setIdx]           = useState(0);
  const [answers, setAnswers]   = useState({});
  const [revealed, setRevealed] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const handlersRef   = useRef({});

  const q        = questions[idx];
  const opts     = LETTERS.filter(l => q[`option_${l}`]);
  const selected = answers[q.id];
  const res      = revealed[q.id];
  const totalCorrect  = Object.values(revealed).filter(r => r.isCorrect).length;
  const totalRevealed = Object.keys(revealed).length;
  const allDone = totalRevealed >= questions.length;

  async function handleSelect(letter) {
    if (revealed[q.id] || submittingRef.current) return;
    if (!opts.includes(letter)) return;
    setAnswers(a => ({ ...a, [q.id]: letter }));
    submittingRef.current = true; setSubmitting(true);
    try {
      const r = await api.checkAnswer(q.id, letter);
      setRevealed(rv => ({ ...rv, [q.id]: r }));
    } catch {}
    finally { setSubmitting(false); submittingRef.current = false; }
  }

  handlersRef.current = { handleSelect };

  useEffect(() => {
    const KEY_L = { a:"a",A:"a","1":"a",b:"b",B:"b","2":"b",c:"c",C:"c","3":"c",d:"d",D:"d","4":"d",e:"e",E:"e","5":"e" };
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft"  || e.key === "p" || e.key === "P") { setIdx(i => Math.max(0, i - 1)); return; }
      if (e.key === "ArrowRight" || e.key === "n" || e.key === "N") { setIdx(i => Math.min(questions.length - 1, i + 1)); return; }
      const letter = KEY_L[e.key];
      if (letter) handlersRef.current.handleSelect(letter);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [questions.length]);

  function dotCls(i) {
    const q2 = questions[i];
    const r2 = revealed[q2.id];
    const a2 = answers[q2.id];
    let cls = "uw-nav-dot";
    if (r2) cls += r2.isCorrect ? " dot-correct" : " dot-wrong";
    else if (a2) cls += " dot-answered";
    if (i === idx) cls += " dot-current";
    return cls;
  }
  function choiceCls(l) {
    let cls = "uw-choice";
    if (res) {
      if (l === res.correct) cls += " choice-correct";
      else if (l === selected && !res.isCorrect) cls += " choice-wrong";
    } else if (l === selected) cls += " choice-selected";
    return cls;
  }

  return (
    <div className="uw-session">
      <div className="uw-topbar">
        <div className="uw-topbar-left">
          <button className="uw-back-btn" onClick={onBack}><Icon name="arrowLeft" size={14} /></button>
          <span className="uw-paper-name">Practice · {paper.name}</span>
        </div>
        <div className="uw-topbar-right">
          {allDone && (
            <div className="uw-score-badge">{totalCorrect}/{questions.length} · {Math.round(totalCorrect / questions.length * 100)}%</div>
          )}
        </div>
      </div>
      <div className="uw-progress-bar">
        <div className="uw-progress-fill" style={{ width: `${(totalRevealed / questions.length) * 100}%` }} />
      </div>
      <div className="uw-body">
        <div className="uw-nav-panel">
          <div className="uw-nav-panel-title">Questions</div>
          <div className="uw-nav-dots">
            {questions.map((_, i) => <button key={i} className={dotCls(i)} onClick={() => setIdx(i)}>{i + 1}</button>)}
          </div>
          <div className="uw-nav-legend">
            <div className="uw-legend-row"><span className="legend-dot dot-correct" /> Correct</div>
            <div className="uw-legend-row"><span className="legend-dot dot-wrong" /> Wrong</div>
            <div className="uw-legend-row"><span className="legend-dot dot-answered" /> Answered</div>
          </div>
        </div>
        <div className="uw-content">
          {allDone && (
            <div className="uw-results-banner" style={{ marginBottom: "1.5rem", borderRadius: 10 }}>
              <div>
                <div className="uw-results-pct">{Math.round(totalCorrect / questions.length * 100)}%</div>
                <div className="uw-results-label">Score</div>
              </div>
              <div>
                <div className="uw-results-pct" style={{ fontSize: "1.5rem" }}>{totalCorrect}/{questions.length}</div>
                <div className="uw-results-label">Correct</div>
              </div>
              <button className="uw-end-btn" style={{ background: "var(--navy)", marginLeft: "auto" }} onClick={onBack}>Done</button>
            </div>
          )}
          <div className="uw-item-label">Item {idx + 1} of {questions.length}</div>
          <div className="uw-question-stem">{q.body}</div>
          <div className="uw-choices">
            {opts.map(l => (
              <button key={l} className={choiceCls(l)} onClick={() => handleSelect(l)} disabled={!!res || submitting}>
                <span className="uw-choice-letter">{l.toUpperCase()}.</span>
                <span className="uw-choice-text">{q[`option_${l}`]}</span>
              </button>
            ))}
          </div>
          {res && (
            <>
              <div className={`uw-status-bar${res.isCorrect ? " correct" : " wrong"}`}>
                <div className="uw-status-left">
                  <Icon name={res.isCorrect ? "check" : "close"} size={15} />
                  {res.isCorrect ? "Correct" : `Incorrect${res.correct ? ` — Correct answer: ${res.correct.toUpperCase()}` : ""}`}
                </div>
              </div>
              {(res.explanation || res.explanation_image || res.explanation_svg) && (
                <div className="uw-explanation">
                  <div className="uw-explanation-title">Explanation</div>
                  {res.explanation_svg && <div className="uw-explanation-svg" dangerouslySetInnerHTML={{ __html: res.explanation_svg }} />}
                  {res.explanation_image && <img className="uw-explanation-image" src={`/api/questions/${q.id}/explanation-image`} alt="" />}
                  {res.explanation && <div className="uw-explanation-text">{res.explanation}</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="uw-bottombar">
        <button className="uw-nav-btn" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>
          <Icon name="arrowLeft" size={14} /> Prev
        </button>
        <span className="uw-nav-count">{Object.keys(answers).length}/{questions.length} answered</span>
        <button className="uw-nav-btn" onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))} disabled={idx === questions.length - 1}>
          Next <Icon name="arrowLeft" size={14} style={{ transform: "rotate(180deg)" }} />
        </button>
      </div>
    </div>
  );
}

// ── Main progress page ────────────────────────────────────────────────────────
export default function Progress({ onNavigate }) {
  const [view, setView]                 = useState("list");
  const [sessions, setSessions]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [fileProgress, setFileProgress] = useState([]);

  useEffect(() => {
    api.getProgressSessions()
      .then(d => setSessions(d.sessions))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
    api.getFileProgress()
      .then(d => setFileProgress(d.files))
      .catch(() => {});
  }, []);

  async function openReview(session) {
    setLoadingDetail(true);
    try {
      const d = await api.getSessionDetail(session.id);
      setSessionDetail({ ...d, _mode: "review" });
      setView("detail");
    } catch (e) { alert(e.message); }
    finally { setLoadingDetail(false); }
  }

  async function openPractice(session, type) {
    setLoadingDetail(true);
    try {
      const d = await api.getSessionDetail(session.id);
      let practiceAnswers;
      if (type === "incorrect") {
        practiceAnswers = (d.answers || []).filter(a => !a.is_correct && a.chosen);
      } else {
        let markedIds = [];
        try { markedIds = JSON.parse(session.marked_ids || "[]"); } catch {}
        practiceAnswers = (d.answers || []).filter(a => markedIds.includes(a.question_id));
      }
      if (!practiceAnswers.length) { alert("No questions found for this selection."); return; }
      const questions = practiceAnswers.map(a => ({
        id: a.question_id, body: a.body,
        option_a: a.option_a, option_b: a.option_b,
        option_c: a.option_c, option_d: a.option_d,
        option_e: a.option_e || "",
      }));
      setSessionDetail({ session, questions, _mode: type });
      setView("detail");
    } catch (e) { alert(e.message); }
    finally { setLoadingDetail(false); }
  }

  // ── Sub-views ──
  if (view === "detail" && sessionDetail) {
    if (sessionDetail._mode === "review") {
      return <ReviewSession session={sessionDetail.session} answers={sessionDetail.answers} onBack={() => setView("list")} />;
    }
    return (
      <PracticeSession
        paper={{ id: sessionDetail.session.paper_id, name: sessionDetail.session.paper_name }}
        questions={sessionDetail.questions}
        onBack={() => setView("list")}
      />
    );
  }

  if (loading) return <div className="col-empty" style={{ padding: "3rem" }}>Loading…</div>;
  if (error)   return <div className="auth-error">{error}</div>;

  const total     = sessions.length;
  const avgScore  = total ? Math.round(sessions.reduce((a, s) => a + (s.score / s.total * 100), 0) / total) : 0;
  const bestScore = total ? Math.max(...sessions.map(s => Math.round(s.score / s.total * 100))) : 0;
  const totalQs   = sessions.reduce((a, s) => a + s.total, 0);
  const correctQs = sessions.reduce((a, s) => a + s.score, 0);

  // Group file progress by subject
  const filesBySubject = useMemo(() => {
    const map = new Map();
    fileProgress.forEach(f => {
      const k = f.subject_name || "General";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(f);
    });
    return [...map.entries()];
  }, [fileProgress]);

  return (
    <div>
      {loadingDetail && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"var(--surface)", borderRadius:12, padding:"1.25rem 2rem", fontWeight:600 }}>Loading…</div>
        </div>
      )}

      {/* ── Stats overview ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Sessions</div>
          <div className="stat-value">{total}</div>
          <div className="stat-sub">Total attempts</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Score</div>
          <div className="stat-value">{total ? `${avgScore}%` : "—"}</div>
          <div className="stat-sub">Across all sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Best Score</div>
          <div className="stat-value">{total ? `${bestScore}%` : "—"}</div>
          <div className="stat-sub">Personal best</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Questions</div>
          <div className="stat-value">{correctQs}/{totalQs}</div>
          <div className="stat-sub">Correct answers</div>
        </div>
      </div>

      {/* ── Session cards ── */}
      {sessions.length === 0 ? (
        <div className="browser-card">
          <div style={{ padding:"3rem", textAlign:"center" }}>
            <div style={{ opacity:.35, marginBottom:".75rem" }}><Icon name="papers" size={48} /></div>
            <p style={{ color:"var(--muted)", fontSize:".9rem" }}>No sessions yet — start a past paper to track your progress.</p>
            {onNavigate && (
              <button className="btn-primary" style={{ marginTop:"1rem" }} onClick={() => onNavigate("past-papers")}>
                Browse Past Papers
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="progress-grid">
          {sessions.map(s => {
            const pct = Math.round(s.score / s.total * 100);
            const barColor = pct >= 70 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
            const wrongCount = s.total - s.score;
            let markedCount = 0;
            try { markedCount = JSON.parse(s.marked_ids || "[]").length; } catch {}

            return (
              <div key={s.id} className="prog-card">
                <div className="prog-card-header">
                  <div className="prog-card-title">{s.paper_name || `Paper #${s.paper_id}`}</div>
                  <div className="prog-card-meta">
                    <span className={`adm-badge ${s.mode === "exam" ? "adm-badge-green" : "adm-badge-gray"}`}>{s.mode}</span>
                    <span style={{ fontSize:".75rem", color:"var(--muted)" }}>{fmtDate(s.completed_at)}</span>
                    <span style={{ fontSize:".75rem", color:"var(--muted)" }}>{fmtTime(s.time_sec)}</span>
                  </div>
                </div>

                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:".3rem" }}>
                    <span style={{ fontSize:".75rem", color:"var(--muted)", fontWeight:600 }}>Success Rate</span>
                    <span style={{ fontSize:".8rem", fontWeight:800, color: barColor }}>{pct}%</span>
                  </div>
                  <div className="prog-card-bar">
                    <div className="prog-card-bar-fill" style={{ width:`${pct}%`, background: barColor }} />
                  </div>
                </div>

                <div className="prog-card-stats">
                  <div className="prog-stat correct"><Icon name="check" size={12} /> {s.score}</div>
                  <div className="prog-stat wrong"><Icon name="close" size={12} /> {wrongCount}</div>
                  {markedCount > 0 && (
                    <div className="prog-stat marked"><Icon name="mark" size={12} /> {markedCount}</div>
                  )}
                </div>

                <div className="prog-card-actions">
                  <button className="prog-action-btn prog-action-review" onClick={() => openReview(s)}>
                    <Icon name="papers" size={12} /> Review
                  </button>
                  <button className="prog-action-btn prog-action-retake" onClick={() => onNavigate?.("past-papers")}>
                    <Icon name="rotate" size={12} /> Retake
                  </button>
                  {wrongCount > 0 && (
                    <button className="prog-action-btn prog-action-incorrect" onClick={() => openPractice(s, "incorrect")}>
                      <Icon name="close" size={12} /> Practice Incorrect
                    </button>
                  )}
                  {markedCount > 0 && (
                    <button className="prog-action-btn prog-action-marked" onClick={() => openPractice(s, "marked")}>
                      <Icon name="mark" size={12} /> Practice Marked
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Files & lectures progress ── */}
      <div className="browser-card" style={{ marginTop:"1.5rem" }}>
        <div className="browser-card-header">
          <h2>Files &amp; Lectures</h2>
          <span style={{ fontSize:".8rem", color:"var(--muted)" }}>{fileProgress.length} completed</span>
        </div>
        {fileProgress.length === 0 ? (
          <div style={{ padding:"2.5rem", textAlign:"center" }}>
            <div style={{ opacity:.35, marginBottom:".75rem" }}><Icon name="library" size={40} /></div>
            <p style={{ color:"var(--muted)", fontSize:".85rem" }}>No files marked as complete yet — check off files in the Library.</p>
            {onNavigate && (
              <button className="btn-ghost" style={{ marginTop:".75rem" }} onClick={() => onNavigate("library")}>
                Go to Library
              </button>
            )}
          </div>
        ) : (
          <div style={{ padding:".5rem 0 .75rem" }}>
            {filesBySubject.map(([subject, files]) => (
              <div key={subject} className="prog-file-group">
                <div className="prog-file-group-title">{subject}</div>
                {files.map(f => (
                  <div key={f.file_id} className="prog-file-row">
                    <span className="prog-file-check"><Icon name="check" size={10} /></span>
                    <div className="prog-file-info">
                      <span className="prog-file-name">{f.file_name}</span>
                      {f.topic_name && <span className="prog-file-topic">{f.topic_name}</span>}
                    </div>
                    <span className="prog-file-date">{fmtDate(f.completed_at)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
