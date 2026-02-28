/* ============================================================
   textAnalyzer.js — Text AI detection:
                     local pattern scoring, Groq integration,
                     sentence highlights, breakdown table
   ============================================================ */

import { callGroq, TEXT_SYSTEM } from './groq.js';
import {
  animateRing, resetRing, renderVerdictBadge,
  showCard, setSourceBadge
} from './ui.js';

/* ── Sample texts ── */
export const SAMPLES = {
  ai: `Artificial intelligence has fundamentally transformed the way we approach complex problem-solving in modern society. The integration of machine learning algorithms into various domains has yielded unprecedented levels of efficiency and accuracy. It is important to note that these technological advancements present both opportunities and challenges for stakeholders across multiple sectors. Furthermore, the implications of widespread AI adoption extend beyond mere operational improvements, encompassing broader societal considerations that must be carefully evaluated. In conclusion, a comprehensive understanding of AI capabilities and limitations is essential for informed decision-making in the current technological landscape.`,
  human: `I remember the first time I tried to explain the internet to my grandmother. She looked at me like I was describing magic, and honestly, maybe I was. We take it for granted now — the fact that you can pull a tiny slab of glass from your pocket and immediately know the answer to basically any question. But there's something weird and kind of sad about that too, right? Like, we've outsourced our curiosity. When's the last time you wondered about something for more than thirty seconds before Googling it?`,
  mixed: `Climate change represents one of the most pressing challenges of our time, requiring immediate action from governments, corporations, and individuals alike. The scientific consensus on anthropogenic warming is unambiguous at this point. But I'll be honest — reading the reports doesn't always make me want to act. It makes me feel small, like what's my reusable bag going to do against a million coal plants? There's a gap between knowing something is true and feeling like your response to it matters. Addressing this psychological barrier is crucial for fostering meaningful behavioral change at scale.`,
};

export function loadSample(type) {
  document.getElementById('textInput').value = SAMPLES[type];
  onTextInput();
}

/* ── Input handling ── */

export function onTextInput() {
  const v = document.getElementById('textInput').value.trim();
  const w = v ? v.split(/\s+/).length : 0;
  const s = v ? tokenize(v).length : 0;
  document.getElementById('wordCount').textContent =
    `${w} word${w !== 1 ? 's' : ''} · ${s} sentence${s !== 1 ? 's' : ''}`;
  document.getElementById('textAnalyzeBtn').disabled = v.length < 20;
  if (!v) resetTextResults();
}

export function clearTextInput() {
  document.getElementById('textInput').value = '';
  onTextInput();
  resetTextResults();
}

export function resetTextResults() {
  showCard('textScoreOuter',          false);
  showCard('textHighlightSection',    false);
  showCard('textResultsPlaceholder',  true);
  showCard('textReasoningCard',       false);
  resetRing('textRingFill',  'textRingPct');
  resetRing('humanRingFill', 'humanRingPct');
}

/* ── Analysis orchestration ── */

export async function runTextAnalysis() {
  const v = document.getElementById('textInput').value.trim();
  if (v.length < 20) return;

  const btn = document.getElementById('textAnalyzeBtn');
  btn.classList.add('loading');
  resetTextResults();

  let groqResult = null;

  // always tag as Groq; backend will proxy using our secret key
  setSourceBadge('textSourceBadge', 'groq');
  const truncated = v.length > 3000 ? v.substring(0, 3000) + '...' : v;
  groqResult = await callGroq(TEXT_SYSTEM, `Analyze this text for AI generation:\n\n${truncated}`);

  btn.classList.remove('loading');

  if (groqResult) {
    _showGroqResults(groqResult, v);
  } else {
    setSourceBadge('textSourceBadge', 'fallback');
    _showLocalResults(v);
  }
}

/* ── Local pattern scorer ── */

/** Split text into sentences */
export function tokenize(txt) {
  return txt
    .match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g)
    ?.map(s => s.trim())
    .filter(s => s.length > 3) || [];
}

// AI-writing signal patterns
const AI_PATTERNS = [
  /\bit is (important|essential|crucial|worth noting|noteworthy)\b/i,
  /\bfurthermore\b/i,
  /\bin conclusion\b/i,
  /\bin summary\b/i,
  /\bcomprehensive (understanding|approach|framework|analysis)\b/i,
  /\bstakeholders\b/i,
  /\bfundamentally\b/i,
  /\bunprecedented\b/i,
  /\bencompass(ing)?\b/i,
  /\bimplications\b/i,
  /\blandscape\b/i,
  /\bleverage\b/i,
  /\bmitigate\b/i,
  /\bproactive(ly)?\b/i,
  /\bsynerg/i,
  /\bhave yielded\b/i,
  /\bmust be carefully\b/i,
  /\boptimal(ly)?\b/i,
  /\brobust\b/i,
  /\bdelve\b/i,
  /\btailored\b/i,
  /\bseamless(ly)?\b/i,
  /\bin today's (world|society|landscape)\b/i,
  /\bit is (clear|evident|apparent) that\b/i,
  /\bplays? a (crucial|vital|key|important) role\b/i,
];

// Human-writing signal patterns
const HUMAN_PATTERNS = [
  /\bI (remember|think|feel|can't|don't|was|tried|ll|mean|guess)\b/i,
  /\bhonestly\b/i,
  /\bkind of\b/i,
  /right\?/i,
  /\bweird\b/i,
  /\bmaybe\b/i,
  /\bactually\b/i,
  /like,/i,
  /\bgonna\b/i,
  /\bbasically\b/i,
  /'t\b/,
  /\bI'll\b/i,
  /\bwe've\b/i,
  /\bdoesn't\b/i,
  /\bcan't\b/i,
  /\bI'm\b/i,
  /\bI'd\b/i,
  /\btbh\b/i,
  /\bngl\b/i,
  /\bsorta\b/i,
  /\bkinda\b/i,
  /\byou know\b/i,
  /\bI mean\b/i,
];

/**
 * Score a single sentence for AI vs human probability.
 * Returns { ai: 0–1, human: 0–1 }
 */
export function scoreS(sentence) {
  let ai = 0, human = 0;
  AI_PATTERNS.forEach(p    => { if (p.test(sentence)) ai++; });
  HUMAN_PATTERNS.forEach(p => { if (p.test(sentence)) human++; });

  // Length heuristic: uniform medium-length sentences lean AI
  const words = sentence.split(/\s+/).length;
  if (words >= 18 && words <= 32) ai    += 0.5;
  if (words < 8  || words > 45)   human += 0.3;

  const tot = ai + human;
  if (tot === 0) {
    const p = 0.28 + Math.random() * 0.44;
    return { ai: p, human: 1 - p };
  }

  const raw   = ai / tot;
  const noise = (Math.random() - 0.5) * 0.12;
  const f     = Math.min(0.97, Math.max(0.03, raw + noise));
  return { ai: f, human: 1 - f };
}

/** Classify a 0–1 AI probability into 'ai' | 'human' | 'mixed' */
export function classify(aiP) {
  if (aiP >= 0.62) return 'ai';
  if (aiP <= 0.40) return 'human';
  return 'mixed';
}

/* ── Render helpers ── */

function _showGroqResults(data, originalTxt) {
  showCard('textResultsPlaceholder', false);
  showCard('textScoreOuter', true);

  const aiOverall = Math.max(0, Math.min(100, data.ai_probability  || 50));
  const huOverall = 100 - aiOverall;

  const aiCol = aiOverall >= 65 ? 'var(--red)' : aiOverall >= 40 ? 'var(--amber)' : 'var(--green)';
  animateRing('textRingFill',  'textRingPct',  aiOverall, aiCol);
  animateRing('humanRingFill', 'humanRingPct', huOverall);

  renderVerdictBadge('textVerdict', aiOverall);

  // Use Groq sentence data if provided, otherwise fall back to local scorer
  let scored;
  if (data.sentences?.length) {
    scored = data.sentences.map(s => ({
      text:  s.text,
      ai:    s.classification === 'ai'    ? s.confidence / 100
           : s.classification === 'human' ? 1 - s.confidence / 100 : 0.5,
      human: s.classification === 'human' ? s.confidence / 100
           : s.classification === 'ai'    ? 1 - s.confidence / 100 : 0.5,
    }));
  } else {
    scored = tokenize(originalTxt).map(s => ({ text: s, ...scoreS(s) }));
  }

  _renderBreakdownBars(scored);
  _renderHighlights(scored);

  if (data.reasoning) {
    showCard('textReasoningCard', true);
    document.getElementById('textReasoningBody').textContent = data.reasoning;
  }
}

function _showLocalResults(txt) {
  const sents  = tokenize(txt);
  if (!sents.length) return;

  const scored    = sents.map(s => ({ text: s, ...scoreS(s) }));
  const avgAi     = scored.reduce((a, s) => a + s.ai, 0) / scored.length;
  const aiOverall = Math.round(avgAi * 100);
  const huOverall = 100 - aiOverall;

  showCard('textResultsPlaceholder', false);
  showCard('textScoreOuter', true);

  const aiCol = aiOverall >= 65 ? 'var(--red)' : aiOverall >= 40 ? 'var(--amber)' : 'var(--green)';
  animateRing('textRingFill',  'textRingPct',  aiOverall, aiCol);
  animateRing('humanRingFill', 'humanRingPct', huOverall);
  renderVerdictBadge('textVerdict', aiOverall);

  _renderBreakdownBars(scored);
  _renderHighlights(scored);
}

function _renderBreakdownBars(scored) {
  const total  = scored.length;
  if (!total) return;

  const aiCnt  = scored.filter(s => classify(s.ai) === 'ai').length;
  const huCnt  = scored.filter(s => classify(s.ai) === 'human').length;
  const aiPct  = Math.round(aiCnt / total * 100);
  const huPct  = Math.round(huCnt / total * 100);
  const mxPct  = 100 - aiPct - huPct;

  document.getElementById('confAiPct').textContent    = aiPct + '%';
  document.getElementById('confHumanPct').textContent = huPct + '%';
  document.getElementById('confMixedPct').textContent = mxPct + '%';

  setTimeout(() => {
    document.getElementById('confAiBar').style.width    = aiPct + '%';
    document.getElementById('confHumanBar').style.width = huPct + '%';
    document.getElementById('confMixedBar').style.width = mxPct + '%';
  }, 300);
}

function _renderHighlights(scored) {
  showCard('textHighlightSection', true);

  // Inline sentence highlight
  document.getElementById('highlightBody').innerHTML = scored.map(s => {
    const cls = classify(s.ai);
    const tip = `${cls === 'ai' ? 'AI Generated' : cls === 'human' ? 'Human Written' : 'Uncertain'} — ${Math.round(s.ai * 100)}% AI probability`;
    return `<span class="s-${cls}" title="${tip}">${s.text} </span>`;
  }).join('');

  // Breakdown table rows
  document.getElementById('breakdownBody').innerHTML = scored.map((s, i) => {
    const cls  = classify(s.ai);
    const lbl  = cls === 'ai' ? 'AI Generated' : cls === 'human' ? 'Human Written' : 'Uncertain';
    const conf = cls === 'ai'    ? Math.round(s.ai    * 100)
               : cls === 'human' ? Math.round(s.human * 100)
               : Math.round((1 - Math.abs(s.ai - 0.5) * 2) * 100);
    const col  = cls === 'ai' ? 'var(--red)' : cls === 'human' ? 'var(--green)' : 'var(--amber)';
    const preview = s.text.length > 60 ? s.text.substring(0, 57) + '…' : s.text;
    return `<tr>
      <td style="color:var(--text3);font-family:var(--mono);font-size:11px">${i + 1}</td>
      <td class="td-sent">${preview}</td>
      <td><span class="badge badge-${cls}">${lbl}</span></td>
      <td style="font-family:var(--mono);font-size:12px;color:${col}">${conf}%</td>
    </tr>`;
  }).join('');
}
