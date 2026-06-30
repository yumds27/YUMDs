import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let ready = false;
function init() {
  if (!ready) { pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl; ready = true; }
}

// Extract text from a PDF File, preserving line structure via Y-coordinate grouping.
export async function extractPdfText(file) {
  init();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let out = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const { items } = await page.getTextContent();
    const lineMap = new Map();
    for (const it of items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x: it.transform[4], t: it.str });
    }
    [...lineMap.keys()].sort((a, b) => b - a).forEach(y => {
      const line = lineMap.get(y).sort((a, b) => a.x - b.x).map(i => i.t).join("").trim();
      if (line) out += line + "\n";
    });
    out += "\n";
  }
  return out;
}

// ── Past-papers MCQ parser ────────────────────────────────────────────────────
// Returns [{ body, option_a, option_b, option_c, option_d, option_e, correct, explanation }]
export function parseQuestionsFromText(rawText) {
  const text = rawText.replace(/\r\n|\r/g, "\n").replace(/ /g, " ");
  const segs = [];
  // Match question starters: "1.", "1)", "Q1.", "Q1)", "Question 1."
  const re = /(?:^|\n)[ \t]*(?:Q(?:uestion)?\.?\s*)?(\d+)[.)]\s+/g;
  let m, prevEnd = 0, prevNum = 0;
  while ((m = re.exec(text)) !== null) {
    if (prevEnd) segs.push({ num: prevNum, content: text.slice(prevEnd, m.index) });
    prevNum = +m[1];
    prevEnd = m.index + m[0].length;
  }
  if (prevEnd) segs.push({ num: prevNum, content: text.slice(prevEnd) });
  return segs.map(s => parseOneQ(s.content)).filter(q => q?.body && q.option_a && q.option_b);
}

function parseOneQ(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const opts = { a: "", b: "", c: "", d: "", e: "" };
  let bodyLines = [], explLines = [], correct = "a", lastOpt = null, phase = "body";

  for (const line of lines) {
    // Choice: A. / A) / (A) / a.
    const optM = line.match(/^[(]?([A-Ea-e])[.)]\s+(.+)/);
    if (optM) {
      phase = "choices"; lastOpt = optM[1].toLowerCase();
      opts[lastOpt] = optM[2].trim(); continue;
    }
    // Answer indicator
    const ansM = line.match(/^(?:answer|correct(?:\s+answer)?|ans)[:\s.]+([A-Ea-e])/i);
    if (ansM) { correct = ansM[1].toLowerCase(); phase = "after"; lastOpt = null; continue; }
    // Explanation indicator
    const explM = line.match(/^(?:explanation|rationale|reason|discussion)[:\s]*(.*)/i);
    if (explM) { phase = "expl"; if (explM[1]) explLines.push(explM[1]); lastOpt = null; continue; }

    if (phase === "body") bodyLines.push(line);
    else if (phase === "choices" && lastOpt) opts[lastOpt] += " " + line;
    else if (phase === "expl") explLines.push(line);
  }

  return {
    body:        bodyLines.join(" ").trim(),
    option_a:    opts.a.trim(),
    option_b:    opts.b.trim(),
    option_c:    opts.c.trim(),
    option_d:    opts.d.trim(),
    option_e:    opts.e.trim() || null,
    correct,
    explanation: explLines.join(" ").trim() || null,
  };
}

// ── Flashcard parsers ─────────────────────────────────────────────────────────
// Returns [{ front, back }]
export function parseFlashcardsFromText(text) {
  const t = text.replace(/\r\n|\r/g, "\n").replace(/ /g, " ");

  // Anki format: front::back
  if (t.includes("::")) {
    const cards = t.split("\n")
      .filter(l => l.includes("::"))
      .map(l => { const i = l.indexOf("::"); return { front: l.slice(0, i).trim(), back: l.slice(i + 2).trim() }; })
      .filter(c => c.front && c.back);
    if (cards.length) return cards;
  }

  // Q: / A: pairs
  {
    const cards = []; let front = null;
    for (const line of t.split("\n")) {
      const tr = line.trim();
      const qm = tr.match(/^(?:Q|Question|Front)[:\s]+(.+)/i);
      const am = tr.match(/^(?:A|Answer|Back)[:\s]+(.+)/i);
      if (qm) { if (front) cards.push({ front, back: "" }); front = qm[1].trim(); }
      else if (am && front !== null) { cards.push({ front, back: am[1].trim() }); front = null; }
    }
    const valid = cards.filter(c => c.front && c.back);
    if (valid.length) return valid;
  }

  // Blank-line-separated paragraph pairs
  {
    const cards = t.split(/\n{2,}/).map(b => {
      const ls = b.trim().split("\n").map(l => l.trim()).filter(Boolean);
      return ls.length >= 2 ? { front: ls[0], back: ls.slice(1).join(" ") } : null;
    }).filter(Boolean);
    if (cards.length) return cards;
  }

  return [];
}

export function parseFlashcardsFromCsv(text) {
  return text.split("\n").filter(Boolean).map(row => {
    const cols = []; let inQ = false, cur = "";
    for (const ch of row) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { cols.push(cur); cur = ""; }
      else cur += ch;
    }
    cols.push(cur);
    return cols.length >= 2 ? { front: cols[0].trim(), back: cols[1].trim() } : null;
  }).filter(c => c?.front && c?.back);
}
