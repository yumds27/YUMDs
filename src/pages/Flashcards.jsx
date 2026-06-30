import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

// ── Deck list ─────────────────────────────────────────────────────────────────

function DeckList({ onStudy }) {
  const [decks, setDecks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    api.getDecks()
      .then(d => setDecks(d.decks))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="fc-loading">Loading decks…</div>;
  if (error)   return <div className="fc-error">{error}</div>;
  if (!decks.length) return (
    <div className="fc-empty">
      <Icon name="flashcards" size={48} />
      <p>No flashcard decks yet. Ask your admin to create some!</p>
    </div>
  );

  return (
    <div className="fc-deck-grid">
      {decks.map(deck => {
        const studyable = (deck.due_count ?? 0) + (deck.new_count ?? 0);
        return (
          <div key={deck.id} className="fc-deck-card">
            <div className="fc-deck-title">{deck.title}</div>
            {deck.description && <div className="fc-deck-desc">{deck.description}</div>}
            <div className="fc-deck-meta">
              <span className="fc-meta-pill total">{deck.card_count} cards</span>
              {deck.due_count > 0  && <span className="fc-meta-pill due">{deck.due_count} due</span>}
              {deck.new_count > 0  && <span className="fc-meta-pill new">{deck.new_count} new</span>}
            </div>
            <button
              className="fc-study-btn"
              onClick={() => onStudy(deck)}
              disabled={studyable === 0}
            >
              {studyable === 0 ? "All caught up" : `Study ${studyable} card${studyable !== 1 ? "s" : ""}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Study session ─────────────────────────────────────────────────────────────

const RATINGS = [
  { value: 1, label: "Again",  cls: "again",  hint: "< 1 day" },
  { value: 2, label: "Hard",   cls: "hard",   hint: "< 2 days" },
  { value: 3, label: "Good",   cls: "good",   hint: "varies" },
  { value: 4, label: "Easy",   cls: "easy",   hint: "long" },
];

function StudySession({ deck, onBack }) {
  const [cards, setCards]         = useState([]);
  const [idx, setIdx]             = useState(0);
  const [flipped, setFlipped]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [results, setResults]     = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getStudyCards(deck.id)
      .then(d => setCards(d.cards))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [deck.id]);

  const handleRate = useCallback(async (rating) => {
    if (submitting) return;
    const card = cards[idx];
    setSubmitting(true);
    try {
      const { interval_days } = await api.reviewCard(card.id, rating);
      setResults(r => [...r, { card, rating, interval_days }]);
      setIdx(i => i + 1);
      setFlipped(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [cards, idx, submitting]);

  if (loading) return <div className="fc-loading">Loading cards…</div>;
  if (error)   return <div className="fc-error">{error}</div>;

  const done = idx >= cards.length;

  if (done) {
    const byRating = [1, 2, 3, 4].map(r => results.filter(x => x.rating === r).length);
    return (
      <div className="fc-results">
        <button className="fc-back-btn" onClick={onBack}>
          <Icon name="arrowLeft" size={16} /> Back to decks
        </button>
        <div className="fc-results-card">
          <div className="fc-results-icon"><Icon name="check" size={36} /></div>
          <h2>Session complete</h2>
          <p className="fc-results-sub">{results.length} card{results.length !== 1 ? "s" : ""} reviewed</p>
          <div className="fc-results-bars">
            <div className="fc-result-row again"><span>Again</span><span>{byRating[0]}</span></div>
            <div className="fc-result-row hard"><span>Hard</span><span>{byRating[1]}</span></div>
            <div className="fc-result-row good"><span>Good</span><span>{byRating[2]}</span></div>
            <div className="fc-result-row easy"><span>Easy</span><span>{byRating[3]}</span></div>
          </div>
          <button className="fc-study-btn" onClick={onBack}>Back to decks</button>
        </div>
      </div>
    );
  }

  const card     = cards[idx];
  const progress = ((idx) / cards.length) * 100;

  return (
    <div className="fc-session">
      <div className="fc-session-header">
        <button className="fc-back-btn" onClick={onBack}>
          <Icon name="arrowLeft" size={16} /> {deck.title}
        </button>
        <span className="fc-session-count">{idx + 1} / {cards.length}</span>
      </div>

      <div className="fc-progress-bar">
        <div className="fc-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className={`fc-card-wrap${flipped ? " flipped" : ""}`} onClick={() => !flipped && setFlipped(true)}>
        <div className="fc-card">
          <div className="fc-card-face fc-front">
            <div className="fc-card-label">Question</div>
            <div className="fc-card-text">{card.front}</div>
            {!flipped && (
              <div className="fc-tap-hint">
                <Icon name="rotate" size={14} /> Tap to reveal
              </div>
            )}
          </div>
          <div className="fc-card-face fc-back">
            <div className="fc-card-label">Answer</div>
            <div className="fc-card-text">{card.back}</div>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="fc-rating-row">
          {RATINGS.map(r => (
            <button
              key={r.value}
              className={`fc-rate-btn ${r.cls}`}
              onClick={() => handleRate(r.value)}
              disabled={submitting}
            >
              <span className="fc-rate-label">{r.label}</span>
              <span className="fc-rate-hint">{r.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function Flashcards() {
  const [studying, setStudying] = useState(null);

  if (studying) return <StudySession deck={studying} onBack={() => setStudying(null)} />;
  return <DeckList onStudy={setStudying} />;
}
