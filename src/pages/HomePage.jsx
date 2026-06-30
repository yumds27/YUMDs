import { useState, useEffect } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const FEATURES = [
  {
    id: "library",
    icon: "library",
    title: "Library",
    desc: "Browse lecture notes, slides and files organised by subject and topic.",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    id: "past-papers",
    icon: "papers",
    title: "Past Papers",
    desc: "Practice with real exam MCQs, get instant feedback and track your score.",
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    id: "flashcards",
    icon: "flashcards",
    title: "Flashcards",
    desc: "Review cards with spaced repetition — the smartest way to retain knowledge.",
    color: "#0891b2",
    bg: "#ecfeff",
  },
];

export default function HomePage({ student, onNavigate }) {
  const [dueCount, setDueCount] = useState(null);

  useEffect(() => {
    api.getDecks()
      .then(({ decks }) => {
        const total = decks.reduce((sum, d) => sum + (d.due_count ?? 0) + (d.new_count ?? 0), 0);
        setDueCount(total);
      })
      .catch(() => {});
  }, []);

  const name      = student.name?.split(" ")[0] ?? "Student";
  const year      = student.current_year ?? student.year;

  return (
    <div className="home-page">
      <div className="home-welcome">
        <div className="home-greeting">{greeting()}, {name}</div>
        <div className="home-sub">Year {year} · Yarmouk University Medical Student</div>
      </div>

      {dueCount > 0 && (
        <div className="home-banner" onClick={() => onNavigate("flashcards")} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onNavigate("flashcards")}>
          <Icon name="flashcards" size={18} />
          <span>You have <strong>{dueCount} flashcard{dueCount !== 1 ? "s" : ""}</strong> due for review today</span>
          <span className="home-banner-arrow">Study now</span>
        </div>
      )}

      <div className="home-cards">
        {FEATURES.map(f => (
          <button
            key={f.id}
            className="home-card"
            onClick={() => onNavigate(f.id)}
            style={{ "--card-color": f.color, "--card-bg": f.bg }}
          >
            <div className="home-card-icon">
              <Icon name={f.icon} size={28} />
            </div>
            <div className="home-card-body">
              <div className="home-card-title">{f.title}</div>
              <div className="home-card-desc">{f.desc}</div>
            </div>
            <div className="home-card-arrow">
              <Icon name="arrowLeft" size={16} style={{ transform: "rotate(180deg)" }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
