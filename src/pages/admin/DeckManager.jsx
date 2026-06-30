import { useState, useEffect } from "react";
import { api } from "../../api";
import Icon from "../../components/Icon";

// ── Card editor panel ─────────────────────────────────────────────────────────

function CardForm({ deckId, card, onSave, onCancel }) {
  const [front, setFront] = useState(card?.front ?? "");
  const [back,  setBack]  = useState(card?.back  ?? "");
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      if (card?.id) { await api.adminUpdateCard(card.id, { front, back }); onSave({ ...card, front, back }); }
      else          { const r = await api.adminCreateCard(deckId, { front, back }); onSave({ id: r.id, front, back }); }
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <form className="card-form" onSubmit={submit}>
      {err && <div className="form-error">{err}</div>}
      <label>Front (question / term)
        <textarea value={front} onChange={e => setFront(e.target.value)} rows={3} required />
      </label>
      <label>Back (answer / definition)
        <textarea value={back} onChange={e => setBack(e.target.value)} rows={3} required />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : card?.id ? "Save" : "Add card"}</button>
        <button type="button" className="btn-ghost"  onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ── Cards panel for a single deck ─────────────────────────────────────────────

function CardsPanel({ deck, onBack }) {
  const [cards, setCards]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [err,     setErr]     = useState("");

  useEffect(() => {
    api.adminListCards(deck.id)
      .then(d => setCards(d.cards))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [deck.id]);

  async function del(card) {
    if (!confirm(`Delete card "${card.front.slice(0, 40)}…"?`)) return;
    try {
      await api.adminDeleteCard(card.id);
      setCards(c => c.filter(x => x.id !== card.id));
    } catch (e) { setErr(e.message); }
  }

  function handleSaved(card) {
    if (editing) {
      setCards(c => c.map(x => x.id === card.id ? card : x));
      setEditing(null);
    } else {
      setCards(c => [...c, card]);
      setAdding(false);
    }
  }

  return (
    <div className="cards-panel">
      <div className="panel-header">
        <button className="btn-ghost icon-btn" onClick={onBack}>
          <Icon name="arrowLeft" size={15} /> Back to decks
        </button>
        <h2>{deck.title}</h2>
        <button className="btn-primary icon-btn" onClick={() => { setAdding(true); setEditing(null); }}>
          <Icon name="plus" size={14} /> Add card
        </button>
      </div>

      {err && <div className="form-error">{err}</div>}

      {adding && (
        <CardForm deckId={deck.id} onSave={handleSaved} onCancel={() => setAdding(false)} />
      )}

      {loading ? <div className="loading-text">Loading…</div> : (
        <div className="cards-list">
          {cards.length === 0 && !adding && (
            <div className="empty-hint">No cards yet. Add your first card above.</div>
          )}
          {cards.map(card => (
            <div key={card.id} className="card-row">
              {editing?.id === card.id ? (
                <CardForm deckId={deck.id} card={card} onSave={handleSaved} onCancel={() => setEditing(null)} />
              ) : (
                <>
                  <div className="card-sides">
                    <div className="card-side front">{card.front}</div>
                    <div className="card-side-sep" />
                    <div className="card-side back">{card.back}</div>
                  </div>
                  <div className="card-actions">
                    <button className="icon-btn" title="Edit" onClick={() => { setEditing(card); setAdding(false); }}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button className="icon-btn danger" title="Delete" onClick={() => del(card)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Deck form ─────────────────────────────────────────────────────────────────

function DeckForm({ deck, onSave, onCancel }) {
  const [title, setTitle] = useState(deck?.title ?? "");
  const [desc,  setDesc]  = useState(deck?.description ?? "");
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      if (deck?.id) { await api.adminUpdateDeck(deck.id, { title, description: desc }); onSave({ ...deck, title, description: desc }); }
      else          { const r = await api.adminCreateDeck({ title, description: desc }); onSave({ id: r.id, title, description: desc, card_count: 0 }); }
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <form className="deck-form" onSubmit={submit}>
      {err && <div className="form-error">{err}</div>}
      <label>Deck title<input value={title} onChange={e => setTitle(e.target.value)} required /></label>
      <label>Description (optional)<input value={desc} onChange={e => setDesc(e.target.value)} /></label>
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : deck?.id ? "Save" : "Create deck"}</button>
        <button type="button" className="btn-ghost"  onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ── Root: deck list ───────────────────────────────────────────────────────────

export default function DeckManager() {
  const [decks,   setDecks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [err,     setErr]     = useState("");

  useEffect(() => {
    api.adminListDecks()
      .then(d => setDecks(d.decks))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function del(deck) {
    if (!confirm(`Delete deck "${deck.title}" and all its cards?`)) return;
    try {
      await api.adminDeleteDeck(deck.id);
      setDecks(d => d.filter(x => x.id !== deck.id));
    } catch (e) { setErr(e.message); }
  }

  function handleSaved(deck) {
    if (editing) {
      setDecks(d => d.map(x => x.id === deck.id ? { ...x, ...deck } : x));
      setEditing(null);
    } else {
      setDecks(d => [...d, deck]);
      setAdding(false);
    }
  }

  if (viewing) return <CardsPanel deck={viewing} onBack={() => setViewing(null)} />;

  return (
    <div className="deck-manager">
      <div className="section-header">
        <h2>Flashcard Decks</h2>
        <button className="btn-primary icon-btn" onClick={() => { setAdding(true); setEditing(null); }}>
          <Icon name="plus" size={14} /> New deck
        </button>
      </div>

      {err && <div className="form-error">{err}</div>}

      {adding && (
        <DeckForm onSave={handleSaved} onCancel={() => setAdding(false)} />
      )}

      {loading ? <div className="loading-text">Loading…</div> : (
        <div className="deck-list">
          {decks.length === 0 && !adding && (
            <div className="empty-hint">No decks yet.</div>
          )}
          {decks.map(deck => (
            <div key={deck.id} className="deck-row">
              {editing?.id === deck.id ? (
                <DeckForm deck={deck} onSave={handleSaved} onCancel={() => setEditing(null)} />
              ) : (
                <>
                  <div className="deck-row-info" onClick={() => setViewing(deck)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && setViewing(deck)}>
                    <div className="deck-row-title">{deck.title}</div>
                    {deck.description && <div className="deck-row-desc">{deck.description}</div>}
                    <div className="deck-row-count">{deck.card_count} card{deck.card_count !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="deck-row-actions">
                    <button className="icon-btn" title="Edit deck" onClick={() => { setEditing(deck); setAdding(false); }}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button className="icon-btn danger" title="Delete deck" onClick={() => del(deck)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
