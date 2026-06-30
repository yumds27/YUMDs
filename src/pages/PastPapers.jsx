import { useState, useEffect } from "react";
import { api } from "../api";

const LETTERS = ["a", "b", "c", "d", "e"];

function ExamView({ paper, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});   // { questionId: 'a'|'b'|... }
  const [revealed, setRevealed] = useState({}); // { questionId: { correct, explanation, isCorrect } }
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    api.getPaperQuestions(paper.id)
      .then(d => setQuestions(d.questions))
      .finally(() => setLoading(false));
  }, [paper.id]);

  async function selectAnswer(qId, letter) {
    if (revealed[qId]) return; // already answered
    setAnswers(a => ({ ...a, [qId]: letter }));
    const result = await api.checkAnswer(qId, letter);
    setRevealed(r => ({ ...r, [qId]: result }));
  }

  function finish() { setFinished(true); }

  const answeredCount = Object.keys(revealed).length;
  const correctCount  = Object.values(revealed).filter(r => r.isCorrect).length;

  if (loading) return <div className="exam-loading">Loading questions…</div>;

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="exam-results">
        <div className="results-card">
          <div className="results-score" style={{ color: pct >= 60 ? "#16a34a" : "#dc2626" }}>{pct}%</div>
          <div className="results-label">{correctCount} / {questions.length} correct</div>
          <div className="results-actions">
            <button className="btn-primary" onClick={() => { setFinished(false); setAnswers({}); setRevealed({}); }}>Retry</button>
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
                    {" · "}Correct: <strong>{res?.correct?.toUpperCase()}</strong>
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

  return (
    <div className="exam-view">
      <div className="exam-topbar">
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <div className="exam-title">{paper.name}</div>
        <div className="exam-progress">{answeredCount} / {questions.length}</div>
        {answeredCount === questions.length && (
          <button className="btn-primary" onClick={finish}>Finish & Review</button>
        )}
      </div>

      <div className="exam-questions">
        {questions.map((q, i) => {
          const res = revealed[q.id];
          const selected = answers[q.id];
          const opts = LETTERS.filter(l => q[`option_${l}`]);
          return (
            <div key={q.id} className={`question-card${res ? (res.isCorrect ? " q-correct" : " q-wrong") : ""}`}>
              <div className="question-num">Question {i + 1}</div>
              <div className="question-body">{q.body}</div>
              <div className="question-options">
                {opts.map(l => {
                  let cls = "option";
                  if (res) {
                    if (l === res.correct) cls += " opt-correct";
                    else if (l === selected) cls += " opt-wrong";
                  } else if (l === selected) {
                    cls += " opt-selected";
                  }
                  return (
                    <button key={l} className={cls} onClick={() => selectAnswer(q.id, l)} disabled={!!res}>
                      <span className="opt-letter">{l.toUpperCase()}</span>
                      {q[`option_${l}`]}
                    </button>
                  );
                })}
              </div>
              {res?.explanation && (
                <div className="question-explanation">
                  <strong>Explanation:</strong> {res.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PastPapers({ student }) {
  const [year, setYear] = useState(student.current_year ?? student.year ?? 1);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);

  useEffect(() => {
    setSelectedPaper(null);
    setLoading(true);
    api.getPapers(year)
      .then(d => setPapers(d.papers))
      .finally(() => setLoading(false));
  }, [year]);

  if (selectedPaper) return <ExamView paper={selectedPaper} onBack={() => setSelectedPaper(null)} />;

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

        <div style={{ padding: "1rem" }}>
          {loading && <div className="col-empty">Loading…</div>}
          {!loading && papers.length === 0 && (
            <div className="col-empty" style={{ padding: "2rem", textAlign: "center" }}>
              No past papers for Year {year} yet.
            </div>
          )}
          <div className="papers-grid">
            {papers.map(p => (
              <button key={p.id} className="paper-card" onClick={() => setSelectedPaper(p)}>
                <div className="paper-name">{p.name}</div>
                {p.subject_name && <div className="paper-subject">{p.subject_name}</div>}
                <div className="paper-count">{p.question_count} questions</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
