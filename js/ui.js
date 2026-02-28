/* ============================================================
   ui.js — Shared UI helpers:
           page navigation, tab switching, ring animation,
           verdict badge rendering, source badge updates
   ============================================================ */

const CIRC = 339.3; // SVG circle circumference (r=54)

/** Show a named page and scroll to top */
export function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  window.scrollTo(0, 0);
}

/**
 * Navigate to home page then scroll to a section.
 * Works from any page.
 */
export function scrollToSection(sectionId) {
  // If we're not on home, switch there first
  const homePage = document.getElementById('page-home');
  if (!homePage.classList.contains('active')) {
    showPage('home');
    // Wait for paint then scroll
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  } else {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}

/** Open a legal/info modal by id */
export function openModal(id) {
  const el = document.getElementById(`modal-${id}`);
  if (el) {
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

/** Close all modals */
export function closeModal() {
  document.querySelectorAll('.vx-modal').forEach(m => m.classList.remove('active'));
  document.body.style.overflow = '';
}

/** Switch between 'image' and 'text' analyzer tabs */
export function switchMode(mode) {
  ['image', 'text'].forEach(key => {
    document.getElementById(`tab-${key}`).classList.toggle('active', key === mode);
    document.getElementById(`tab-content-${key}`).classList.toggle('active', key === mode);
  });
}

/**
 * Animate a ring gauge from 0 → targetPct.
 * @param {string} fillId   - id of the <circle class="ring-fill"> element
 * @param {string} pctId    - id of the percentage text element
 * @param {number} target   - 0–100
 * @param {string} [color]  - optional CSS color override
 */
export function animateRing(fillId, pctId, target, color) {
  const fill  = document.getElementById(fillId);
  const pctEl = document.getElementById(pctId);
  if (!fill || !pctEl) return;

  if (color) {
    fill.style.stroke = color;
    pctEl.style.color = color;
  }

  let current = 0;
  const iv = setInterval(() => {
    current = Math.min(current + 2, target);
    fill.style.strokeDashoffset = CIRC - (CIRC * current / 100);
    pctEl.textContent = current + '%';
    if (current >= target) clearInterval(iv);
  }, 18);
}

/** Reset a ring to empty */
export function resetRing(fillId, pctId) {
  const fill  = document.getElementById(fillId);
  const pctEl = document.getElementById(pctId);
  if (fill)  fill.style.strokeDashoffset = CIRC;
  if (pctEl) pctEl.textContent = '0%';
}

/**
 * Apply verdict badge class and text to an element.
 * @param {string} elId   - DOM element id
 * @param {number} aiPct  - 0–100 AI probability
 */
export function renderVerdictBadge(elId, aiPct) {
  const el = document.getElementById(elId);
  if (!el) return;

  if (aiPct >= 65) {
    el.className = 'score-verdict verdict-low';
    el.textContent = '✕ Likely AI Generated';
  } else if (aiPct >= 40) {
    el.className = 'score-verdict verdict-med';
    el.textContent = '⚠ Partially AI Generated';
  } else {
    el.className = 'score-verdict verdict-high';
    el.textContent = '✓ Likely Human Written';
  }
}

/**
 * Render verdict badge for image authenticity score.
 * @param {string} elId        - verdict element id
 * @param {string} descId      - description element id
 * @param {number} score       - authenticity 0–100
 * @param {string} [label]     - optional Groq-provided label
 * @param {string} [desc]      - optional Groq description
 */
export function renderImgVerdictBadge(elId, descId, score, label, desc) {
  const vEl = document.getElementById(elId);
  const dEl = document.getElementById(descId);

  let cls, icon, defaultDesc;
  if (score >= 75) {
    cls = 'verdict-high'; icon = '✓';
    defaultDesc = 'This image exhibits strong markers of authenticity. No significant AI-generation signatures detected.';
  } else if (score >= 45) {
    cls = 'verdict-med'; icon = '⚠';
    defaultDesc = 'Some indicators of possible manipulation detected. Manual review recommended.';
  } else {
    cls = 'verdict-low'; icon = '✕';
    defaultDesc = 'Strong AI-generation or manipulation signatures found. This image may not be authentic.';
  }

  if (vEl) {
    vEl.className = `score-verdict ${cls}`;
    vEl.textContent = `${icon} ${label || (score >= 75 ? 'High Authenticity' : score >= 45 ? 'Medium Authenticity' : 'Low Authenticity')}`;
  }

  if (dEl) dEl.textContent = desc || defaultDesc;
}

/**
 * Update the Groq / Demo Mode source badge on a score card.
 * @param {string} badgeId - element id
 * @param {'groq'|'fallback'|'demo'} mode
 */
export function setSourceBadge(badgeId, mode) {
  const el = document.getElementById(badgeId);
  if (!el) return;
  el.textContent = mode === 'groq' ? 'Groq AI' : mode === 'fallback' ? 'Fallback' : 'Demo Mode';
}

/** Animate an array of attribute bar fills */
export function animateAttrBars(containerId, attrs) {
  const list = document.getElementById(containerId);
  if (!list) return;
  list.innerHTML = '';

  attrs.forEach((a, i) => {
    const pc = a.score >= 70 ? 'var(--green)' : a.score >= 45 ? 'var(--amber)' : 'var(--red)';
    const d  = document.createElement('div');
    d.className = 'attr-item';
    d.innerHTML = `
      <div class="attr-top">
        <span class="attr-name">${a.name}</span>
        <span class="attr-pct" style="color:${pc}">${a.score}%</span>
      </div>
      <div class="attr-bar-bg">
        <div class="attr-bar-fill" id="ib${i}" style="background:${pc}"></div>
      </div>`;
    list.appendChild(d);
    setTimeout(() => {
      const bar = document.getElementById(`ib${i}`);
      if (bar) bar.style.width = a.score + '%';
    }, 80 + i * 120);
  });
}

/** Show or hide a card by id */
export function showCard(id, visible = true) {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? '' : 'none';
}
