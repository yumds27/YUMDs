import Icon from "../components/Icon";

const CARDS = [
  {
    id: "past-papers",
    icon: "papers",
    label: "Past Papers",
    desc: "Practice with previous exam questions and answers",
    bg: "#fef2f2",
    color: "#dc2626",
    darkBg: "rgba(220,38,38,.15)",
    darkColor: "#f87171",
  },
  {
    id: "library",
    icon: "library",
    label: "Library",
    desc: "Browse all study materials, notes and resources",
    bg: "#eff6ff",
    color: "#2563eb",
    darkBg: "rgba(59,130,246,.15)",
    darkColor: "#93c5fd",
    featured: true,
  },
  {
    id: "flashcards",
    icon: "flashcards",
    label: "Flashcards",
    desc: "Spaced repetition for lasting memorization",
    bg: "#f0fdf4",
    color: "#16a34a",
    darkBg: "rgba(22,163,74,.15)",
    darkColor: "#4ade80",
  },
];

export default function LandingPage({ onNavigate }) {
  const dark = document.documentElement.classList.contains("dark");

  return (
    <div className="landing">
      <div className="landing-hero">
        <div className="landing-icon">
          <img src="/Yarmouk.jpg" alt="Yarmouk University" />
        </div>
        <div className="landing-brand">
          <h1 className="landing-title">YUMD<span>s</span></h1>
          <p className="landing-tagline">Yarmouk University Medical Resources &amp; Files</p>
        </div>
      </div>

      <div className="landing-cards">
        {CARDS.map((card, i) => (
          <button
            key={card.id}
            className={`landing-card${card.featured ? " landing-card--featured" : ""}`}
            style={{ animationDelay: `${0.55 + i * 0.1}s` }}
            onClick={() => onNavigate(card.id)}
          >
            <div
              className="landing-card-icon"
              style={{ background: dark ? card.darkBg : card.bg, color: dark ? card.darkColor : card.color }}
            >
              <Icon name={card.icon} size={card.featured ? 36 : 30} />
            </div>
            <div className="landing-card-title">{card.label}</div>
            <div className="landing-card-desc">{card.desc}</div>
            <div className="landing-card-arrow">
              <Icon name="arrowLeft" size={14} style={{ transform: "rotate(180deg)" }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
