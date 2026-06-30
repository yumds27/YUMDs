import { useState, useEffect, useRef } from "react";
import Icon from "../components/Icon";

// ── Animated stat counter (triggers on scroll into view) ──────
function StatItem({ value, suffix, label }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const dur = 1600;
      let t0 = null;
      const tick = (ts) => {
        if (!t0) t0 = ts;
        const p = Math.min((ts - t0) / dur, 1);
        setCount(Math.round((1 - Math.pow(1 - p, 3)) * value));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);
  return (
    <div className="lp-stat" ref={ref}>
      <div className="lp-stat-value">{count}{suffix}</div>
      <div className="lp-stat-label">{label}</div>
    </div>
  );
}

// ── Curved SVG wave transition ────────────────────────────────
function Wave({ type = "down" }) {
  return (
    <div className={`lp-wave lp-wave-${type}`} aria-hidden="true">
      <svg viewBox="0 0 1440 54" preserveAspectRatio="none">
        {type === "down"
          ? <path d="M0,27 C360,54 1080,0 1440,27 L1440,54 L0,54 Z" fill="currentColor" />
          : <path d="M0,27 C360,0 1080,54 1440,27 L1440,54 L0,54 Z" fill="currentColor" />
        }
      </svg>
    </div>
  );
}

// ── Medical-themed decorative SVG (hero background) ───────────
function MedicalDecor() {
  return (
    <svg className="lp-medical-decor" viewBox="0 0 1440 600"
      preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* ECG / heartbeat across lower-left */}
      <polyline
        points="0,370 120,370 160,300 188,440 216,300 244,370 380,370 420,340 445,400 470,370 600,370"
        fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* DNA double helix — far left */}
      <path d="M75,60 Q108,120 75,180 Q42,240 75,300 Q108,360 75,420 Q42,480 75,540"
        fill="none" stroke="white" strokeWidth="1.6" />
      <path d="M110,60 Q77,120 110,180 Q143,240 110,300 Q77,360 110,420 Q143,480 110,540"
        fill="none" stroke="white" strokeWidth="1.6" />
      {[120,180,240,300,360,420,480].map((y, i) => (
        <line key={i} x1="77" y1={y} x2="108" y2={y} stroke="white" strokeWidth="1.2" />
      ))}
      {/* Hexagons — top right cluster */}
      <polygon points="1110,75 1145,95 1145,135 1110,155 1075,135 1075,95"
        fill="none" stroke="white" strokeWidth="1.5" />
      <polygon points="1180,35 1215,55 1215,95 1180,115 1145,95 1145,55"
        fill="none" stroke="white" strokeWidth="1" />
      <polygon points="1040,115 1075,135 1075,175 1040,195 1005,175 1005,135"
        fill="none" stroke="white" strokeWidth="1" />
      <polygon points="1180,115 1215,135 1215,175 1180,195 1145,175 1145,135"
        fill="none" stroke="white" strokeWidth="0.8" />
      {/* Molecule — bottom right */}
      <circle cx="1310" cy="430" r="14" fill="none" stroke="white" strokeWidth="1.5" />
      <circle cx="1362" cy="395" r="8" fill="none" stroke="white" strokeWidth="1.5" />
      <circle cx="1258" cy="395" r="8" fill="none" stroke="white" strokeWidth="1.5" />
      <circle cx="1372" cy="468" r="8" fill="none" stroke="white" strokeWidth="1.5" />
      <circle cx="1248" cy="468" r="8" fill="none" stroke="white" strokeWidth="1.5" />
      <line x1="1310" y1="416" x2="1362" y2="403" stroke="white" strokeWidth="1.5" />
      <line x1="1310" y1="416" x2="1258" y2="403" stroke="white" strokeWidth="1.5" />
      <line x1="1310" y1="444" x2="1372" y2="460" stroke="white" strokeWidth="1.5" />
      <line x1="1310" y1="444" x2="1248" y2="460" stroke="white" strokeWidth="1.5" />
      {/* Scattered dots */}
      <circle cx="700" cy="90" r="4" fill="white" />
      <circle cx="755" cy="145" r="3" fill="white" />
      <circle cx="678" cy="175" r="2.5" fill="white" />
      <circle cx="825" cy="70" r="3" fill="white" />
      <circle cx="860" cy="130" r="2" fill="white" />
      <circle cx="780" cy="50" r="2" fill="white" />
      {/* Medical cross — mid-upper */}
      <line x1="390" y1="105" x2="390" y2="150" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="368" y1="128" x2="412" y2="128" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      {/* Second cross */}
      <line x1="1380" y1="140" x2="1380" y2="180" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="1360" y1="160" x2="1400" y2="160" stroke="white" strokeWidth="2" strokeLinecap="round" />
      {/* Stethoscope hint — upper center */}
      <path d="M680,80 C700,80 720,100 720,125 C720,150 700,165 680,165 C660,165 640,150 640,125 C640,100 660,80 680,80"
        fill="none" stroke="white" strokeWidth="1.8" />
      <line x1="680" y1="165" x2="680" y2="210" stroke="white" strokeWidth="1.8" />
      <circle cx="680" cy="222" r="13" fill="none" stroke="white" strokeWidth="1.8" />
    </svg>
  );
}

// ── Data ─────────────────────────────────────────────────────
const STATS = [
  { value: 500,  suffix: "+", label: "Study Files"  },
  { value: 12,   suffix: "",  label: "Departments"  },
  { value: 4,    suffix: "",  label: "Study Tools"  },
  { value: 200,  suffix: "+", label: "Past Papers"  },
];

const FEATURES = [
  {
    id: "library",    icon: "library",    label: "Library",
    desc: "Browse lecture notes, PDFs, and study materials organized by year, subject, and topic. Mark files complete to track your progress.",
    cls: "card-blue",
  },
  {
    id: "past-papers", icon: "papers",   label: "Past Papers",
    desc: "Practice with past exams in UWorld-style Tutor or timed Exam mode. Per-question feedback with detailed explanations.",
    cls: "card-red",
  },
  {
    id: "flashcards",  icon: "flashcards", label: "Flashcards",
    desc: "SM-2 spaced repetition flashcard decks for lasting retention. Rate difficulty and the algorithm adapts to you.",
    cls: "card-green",
  },
  {
    id: "ai-tutor",   icon: "aiTutor",   label: "AI Tutor",
    desc: "Personalized AI-powered study assistant to answer questions, generate concept diagrams, and guide your revision.",
    cls: "card-purple",
  },
];

const PREVIEW_ITEMS = [
  {
    id: "past-papers", icon: "papers",    cls: "card-red",
    subtitle: "UWorld-style practice",   title: "Question Bank",
    desc: "Two-column layout with navigator panel, per-question submit, timed exam mode, and AI-generated SVG diagram explanations.",
  },
  {
    id: "library",    icon: "library",   cls: "card-blue",
    subtitle: "Every resource, organized", title: "Smart Library",
    desc: "Grid or list view, completion checkboxes, file downloads, organized by year, subject, and topic with progress tracking.",
  },
  {
    id: "flashcards", icon: "flashcards", cls: "card-green",
    subtitle: "Evidence-based learning", title: "Spaced Repetition",
    desc: "Flip cards with SM-2 scheduling. Rate difficulty 1–4 and the system schedules your next review at the perfect interval.",
  },
  {
    id: "progress",   icon: "progress",   cls: "card-amber",
    subtitle: "Track your growth",       title: "Progress Analytics",
    desc: "Session history, score trends, full per-question review of past exams, and re-practice for incorrect or marked questions.",
  },
];

const DEPARTMENTS = [
  { name: "Anatomy",           init: "An", color: "#2563eb" },
  { name: "Biochemistry",      init: "Bc", color: "#16a34a" },
  { name: "Physiology",        init: "Ph", color: "#7c3aed" },
  { name: "Pathology",         init: "Pa", color: "#dc2626" },
  { name: "Pharmacology",      init: "Pk", color: "#d97706" },
  { name: "Microbiology",      init: "Mb", color: "#0891b2" },
  { name: "Internal Medicine", init: "IM", color: "#162040" },
  { name: "Surgery",           init: "Su", color: "#b91c1c" },
  { name: "Pediatrics",        init: "Pe", color: "#059669" },
  { name: "Gynecology",        init: "Gy", color: "#db2777" },
  { name: "Psychiatry",        init: "Ps", color: "#6d28d9" },
  { name: "Community Med.",    init: "CM", color: "#0284c7" },
];

const WHY_ITEMS = [
  {
    icon: "aiTutor", cls: "card-purple", title: "AI Powered",
    desc: "AI-generated explanations, SVG diagrams for complex concepts, and a study assistant available whenever you need it.",
  },
  {
    icon: "library", cls: "card-blue", title: "Comprehensive Resources",
    desc: "Everything from Year 1 to Year 6 — lecture notes, past papers, flashcard decks, and more, all in one searchable place.",
  },
  {
    icon: "award", cls: "card-green", title: "Built for Medical Students",
    desc: "Designed for Yarmouk University's curriculum, with UWorld-style exam practice, spaced repetition, and detailed analytics.",
  },
];

// ── Component ─────────────────────────────────────────────────
export default function LandingPage({ onNavigate }) {
  return (
    <div className="landing-v2">

      {/* ════════════════ HERO ════════════════ */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <div className="lp-hero-gradient" />
          <img src="/logo.png" className="lp-hero-illustration" alt="" aria-hidden="true" />
          <MedicalDecor />
        </div>
        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <Icon name="award" size={12} />
            Yarmouk University Medical Platform
          </div>
          <h1 className="lp-hero-title">YUMDs</h1>
          <p className="lp-hero-subtitle">Yarmouk University Medical Resources &amp; Files</p>
          <p className="lp-hero-tagline">
            Everything you need to excel in medical school — organized, searchable, and always available.
          </p>
          <div className="lp-hero-ctas">
            <button className="lp-cta-primary" onClick={() => onNavigate("library")}>
              <Icon name="library" size={16} /> Browse Resources
            </button>
            <button className="lp-cta-secondary" onClick={() => onNavigate("past-papers")}>
              <Icon name="papers" size={16} /> Start Practicing
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════ STATS ════════════════ */}
      <section className="lp-stats">
        <div className="lp-inner lp-stats-inner">
          {STATS.map(s => <StatItem key={s.label} {...s} />)}
        </div>
      </section>

      <Wave type="down" />

      {/* ════════════════ FEATURES ════════════════ */}
      <section className="lp-section lp-section-alt">
        <div className="lp-inner">
          <div className="lp-section-header">
            <div className="lp-section-label">Platform Features</div>
            <h2 className="lp-section-title">Everything you need to study smarter</h2>
            <p className="lp-section-sub">Four purpose-built tools designed to work together and maximize your learning efficiency.</p>
          </div>
          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <button key={f.id} className={`lp-feature-card ${f.cls}`}
                style={{ animationDelay: `${i * 0.08}s` }}
                onClick={() => onNavigate(f.id)}>
                <div className="lp-feature-icon"><Icon name={f.icon} size={28} /></div>
                <div className="lp-feature-label">{f.label}</div>
                <div className="lp-feature-desc">{f.desc}</div>
                <div className="lp-feature-arrow">
                  <Icon name="arrowLeft" size={13} style={{ transform: "rotate(180deg)" }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Wave type="up" />

      {/* ════════════════ PLATFORM PREVIEW ════════════════ */}
      <section className="lp-section">
        <div className="lp-inner">
          <div className="lp-section-header">
            <div className="lp-section-label">What's Inside</div>
            <h2 className="lp-section-title">A complete medical study platform</h2>
            <p className="lp-section-sub">Each module is purpose-built, then connected so your progress flows across the whole platform.</p>
          </div>
          <div className="lp-preview-grid">
            {PREVIEW_ITEMS.map((item, i) => (
              <button key={item.id} className={`lp-preview-card ${item.cls}`}
                style={{ animationDelay: `${i * 0.07}s` }}
                onClick={() => onNavigate(item.id)}>
                <div className="lp-preview-icon-wrap">
                  <div className="lp-preview-icon"><Icon name={item.icon} size={22} /></div>
                </div>
                <div className="lp-preview-body">
                  <div className="lp-preview-subtitle">{item.subtitle}</div>
                  <div className="lp-preview-title">{item.title}</div>
                  <div className="lp-preview-desc">{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Wave type="down" />

      {/* ════════════════ DEPARTMENTS ════════════════ */}
      <section className="lp-section lp-section-alt">
        <div className="lp-inner">
          <div className="lp-section-header">
            <div className="lp-section-label">Browse by Department</div>
            <h2 className="lp-section-title">All departments, all years</h2>
            <p className="lp-section-sub">Jump directly to your subject — notes, past papers, and flashcard decks, all organized by department.</p>
          </div>
          <div className="lp-dept-grid">
            {DEPARTMENTS.map(d => (
              <button key={d.name} className="lp-dept-card" onClick={() => onNavigate("library")}>
                <div className="lp-dept-initial" style={{ background: d.color + "1a", color: d.color }}>
                  {d.init}
                </div>
                <div className="lp-dept-name">{d.name}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Wave type="up" />

      {/* ════════════════ WHY YUMDS ════════════════ */}
      <section className="lp-section">
        <div className="lp-inner">
          <div className="lp-section-header">
            <div className="lp-section-label">Why YUMDs</div>
            <h2 className="lp-section-title">Built for your success</h2>
            <p className="lp-section-sub">YUMDs is more than a resource repository — it's a complete learning ecosystem tailored for Yarmouk medical students.</p>
          </div>
          <div className="lp-why-grid">
            {WHY_ITEMS.map(w => (
              <div key={w.title} className={`lp-why-card ${w.cls}`}>
                <div className="lp-why-icon"><Icon name={w.icon} size={26} /></div>
                <div className="lp-why-title">{w.title}</div>
                <div className="lp-why-desc">{w.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <div className="lp-footer">
        <p>© {new Date().getFullYear()} YUMDs · Yarmouk University Medical Resources &amp; Files</p>
      </div>

    </div>
  );
}
