import { createNavButton, createCounter, wireCarousel } from '../../scripts/carousel.js';

const HEADINGS = 'h1, h2, h3, h4, h5, h6';
const COLORS = ['black', 'slate-teal', 'green'];
const DEFAULT_COLOR = 'black';

/**
 * True when a paragraph holds exactly one link and no other text.
 * @param {Element} el
 * @returns {boolean}
 */
function isLinkOnly(el) {
  if (el.tagName !== 'P') return false;
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && el.textContent.trim() === links[0].textContent.trim();
}

/**
 * A color cell holds a single plain word token ("black", "slate-teal",
 * "Slate Teal") and no headings, links or media.
 * @param {Element} cell
 * @returns {boolean}
 */
function isColorCell(cell) {
  if (cell.querySelector(`${HEADINGS}, a, picture, img`)) return false;
  const text = cell.textContent.trim();
  return /^[a-z][a-z0-9 _-]{0,30}$/i.test(text);
}

/**
 * Normalises an authored color token; unknown tokens fall back to black.
 * @param {string} raw
 * @returns {string}
 */
function colorToken(raw) {
  const token = (raw || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  return COLORS.includes(token) ? token : DEFAULT_COLOR;
}

/**
 * Moves the meaningful child nodes of a cell into a target, wrapping stray
 * text nodes in paragraphs and dropping empty wrappers.
 * @param {Element} cell
 * @param {Element} target
 */
function moveContent(cell, target) {
  [...cell.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent.trim()) return;
      const p = document.createElement('p');
      p.textContent = node.textContent.trim();
      target.append(p);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (!node.textContent.trim() && !node.querySelector('img, picture')) return;
    target.append(node);
  });
}

/**
 * Builds one slide from a row: [color token] | [h3 + p + p > a].
 * Cells are detected by content, so a missing color cell (defaults to
 * black) or swapped cells still work. The link makes the whole card
 * clickable.
 * @param {Element} row
 * @returns {HTMLLIElement|null}
 */
function buildSlide(row) {
  const cells = [...row.children];
  const colorCell = cells.find((cell) => isColorCell(cell) && cells.length > 1);
  const content = document.createElement('div');
  cells.filter((cell) => cell !== colorCell).forEach((cell) => moveContent(cell, content));
  // pictures are not part of this design
  content.querySelectorAll('picture, img').forEach((media) => {
    const holder = media.closest('p');
    if (holder && !holder.textContent.trim()) holder.remove();
    else media.remove();
  });
  if (!content.textContent.trim()) return null;

  const title = content.querySelector(HEADINGS);
  const linkParas = [...content.children].filter(isLinkOnly);
  const linkPara = linkParas[linkParas.length - 1];
  const source = linkPara?.querySelector('a') || title?.querySelector('a[href]')
    || content.querySelector('a[href]');

  const li = document.createElement('li');
  li.className = 'simple-cards-slide';

  const card = document.createElement(source ? 'a' : 'div');
  card.className = 'simple-cards-card';
  card.dataset.color = colorToken(colorCell?.textContent);
  if (source) {
    card.href = source.href;
    if (source.target) card.target = source.target;
    if (source.rel) card.rel = source.rel;
    linkPara?.remove();
    // nested links would be invalid inside the card link
    content.querySelectorAll('a').forEach((a) => a.replaceWith(...a.childNodes));
  }

  const body = document.createElement('div');
  body.className = 'simple-cards-card-content';
  if (title) title.classList.add('simple-cards-card-title');
  body.append(...content.children);
  body.querySelectorAll(':scope > p').forEach((p) => p.classList.add('simple-cards-card-text'));
  card.append(body);

  if (source) {
    const arrow = document.createElement('span');
    arrow.className = 'simple-cards-card-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    card.append(arrow);
  }

  li.append(card);
  return li;
}

/**
 * Simple Cards: intro on the left, a horizontal scroll-snap carousel of
 * tall solid-color cards on the right, with prev/next and a "01/03" counter.
 * Content contract:
 *   row 1 (optional): [h2 + p intro]
 *   rows 2..n:        [color token: black | slate-teal | green] | [h3 + p + p > a]
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  let intro;

  const first = rows[0];
  const firstIsCard = first && [...first.children].length > 1
    && [...first.children].some(isColorCell);
  if (first && !firstIsCard
    && (first.querySelector('h1, h2') || !first.querySelector('a[href]'))) {
    intro = document.createElement('div');
    intro.className = 'simple-cards-intro';
    [...first.children].forEach((cell) => moveContent(cell, intro));
    intro.querySelector(HEADINGS)?.classList.add('simple-cards-intro-title');
    rows.shift();
    if (!intro.children.length) intro = null;
  }

  const track = document.createElement('ul');
  track.className = 'simple-cards-track';
  rows.forEach((row) => {
    const slide = buildSlide(row);
    if (slide) track.append(slide);
  });

  const parts = [];
  if (intro) parts.push(intro);

  if (track.children.length) {
    const total = track.children.length;
    const heading = intro?.querySelector(HEADINGS);
    const label = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : 'Cards';

    const carousel = document.createElement('div');
    carousel.className = 'simple-cards-carousel';
    carousel.setAttribute('role', 'region');
    carousel.setAttribute('aria-roledescription', 'carousel');
    carousel.setAttribute('aria-label', label);

    track.setAttribute('aria-label', `Slides, ${total} total`);
    [...track.children].forEach((slide, i) => {
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} of ${total}`);
    });
    // the scroll container must be keyboard reachable when no card is a link
    if (!track.querySelector('a')) track.tabIndex = 0;
    carousel.append(track);

    if (total > 1) {
      const controls = document.createElement('div');
      controls.className = 'simple-cards-controls';
      const prev = createNavButton('simple-cards-nav', 'prev');
      const next = createNavButton('simple-cards-nav', 'next');
      const counter = createCounter('simple-cards-counter');
      controls.append(prev, next, counter);
      carousel.append(controls);
      wireCarousel(track, prev, next, counter);
    }
    parts.push(carousel);
  }

  block.replaceChildren(...parts);
}
