import { createOptimizedPicture } from '../../scripts/aem.js';

const HEADINGS = 'h1, h2, h3, h4, h5, h6';

/**
 * True when a paragraph holds exactly one link and no other text.
 * @param {Element} el
 * @returns {boolean}
 */
function isLinkOnly(el) {
  if (el.tagName !== 'P') return false;
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && !el.querySelector('picture')
    && el.textContent.trim() === links[0].textContent.trim();
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
    if (!node.textContent.trim() && !node.querySelector('img, picture') && node.tagName !== 'PICTURE') return;
    target.append(node);
  });
}

/**
 * Builds one card from a row: [h4 + CTA link paragraph(s)] | [picture],
 * with cells detected by content rather than position.
 * @param {Element} row
 * @returns {HTMLLIElement|null}
 */
function buildCard(row) {
  const content = document.createElement('div');
  [...row.children].forEach((cell) => moveContent(cell, content));
  if (!content.children.length) return null;

  const li = document.createElement('li');
  li.className = 'fifty-fifty-card';

  // image: first picture in the row (bare or wrapped in a paragraph/link)
  const picture = content.querySelector('picture');
  let media;
  if (picture) {
    media = document.createElement('div');
    media.className = 'fifty-fifty-card-image';
    const holder = picture.closest('p');
    media.append(picture.closest('a') || picture);
    if (holder && !holder.textContent.trim() && !holder.querySelector('picture')) holder.remove();
  }
  // only one image per card
  content.querySelectorAll('picture').forEach((pic) => {
    const holder = pic.closest('p');
    if (holder && !holder.textContent.trim()) holder.remove();
    else pic.remove();
  });

  const title = content.querySelector(HEADINGS);
  if (title) title.classList.add('fifty-fifty-card-title');

  const ctas = [...content.children].filter(isLinkOnly);
  const body = [...content.children].filter((el) => el !== title && !ctas.includes(el));

  if (title) li.append(title);
  if (body.length) {
    const text = document.createElement('div');
    text.className = 'fifty-fifty-card-body';
    text.append(...body);
    li.append(text);
  }
  if (media) li.append(media);
  if (ctas.length) {
    const actions = document.createElement('div');
    actions.className = 'fifty-fifty-card-actions';
    ctas.forEach((p, i) => {
      const a = p.querySelector('a');
      // CTA links are authored as plain links; render them as pill buttons
      // (first = primary, others = secondary) unless already buttonized
      p.className = 'button-wrapper';
      a.classList.add('button');
      if (!a.matches('.primary, .secondary, .accent')) a.classList.add(i === 0 ? 'primary' : 'secondary');
      actions.append(p);
    });
    li.append(actions);
  }
  return li.children.length ? li : null;
}

/**
 * Fifty-Fifty: an intro (heading + text) followed by equal side-by-side cards.
 * Content contract:
 *   row 1 (optional): [h3 + p intro] - a row without a picture
 *   rows 2..n:        [h4 + p > a CTA (+ more CTAs)] | [picture]
 * Cells may be swapped, merged or omitted.
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  let intro;

  const first = rows[0];
  if (first && !first.querySelector('picture') && !first.querySelector(':scope > div + div')) {
    intro = document.createElement('div');
    intro.className = 'fifty-fifty-intro';
    [...first.children].forEach((cell) => moveContent(cell, intro));
    rows.shift();
    if (!intro.children.length) intro = null;
  }

  const ul = document.createElement('ul');
  ul.className = 'fifty-fifty-cards';
  rows.forEach((row) => {
    const card = buildCard(row);
    if (card) ul.append(card);
  });

  ul.querySelectorAll('.fifty-fifty-card-image picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [
      { media: '(min-width: 768px)', width: '900' },
      { width: '750' },
    ]));
  });

  block.replaceChildren(...[intro, ul.children.length ? ul : null].filter(Boolean));
}
