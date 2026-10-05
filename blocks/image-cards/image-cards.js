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
 * Reads an authored focal point ("data-focal:x,y" in title / data-title).
 * @param {HTMLImageElement} img
 * @returns {string|null} CSS object-position value
 */
function focalPoint(img) {
  const raw = `${img.dataset.title || ''} ${img.title || ''}`;
  const match = raw.match(/data-focal:\s*([\d.]+)\s*,\s*([\d.]+)/);
  return match ? `${match[1]}% ${match[2]}%` : null;
}

/**
 * Builds one slide from a row: [picture] | [h4 + p + p > a explore link].
 * The explore link makes the whole card clickable; cells are detected by
 * content, so swapped or merged cells still work.
 * @param {Element} row
 * @returns {HTMLLIElement|null}
 */
function buildSlide(row) {
  const content = document.createElement('div');
  [...row.children].forEach((cell) => moveContent(cell, content));
  if (!content.children.length) return null;

  let picture = content.querySelector('picture');
  let imageLink;
  if (picture) {
    imageLink = picture.closest('a[href]');
    const holder = picture.closest('p, a');
    picture.remove();
    if (holder && !holder.textContent.trim() && !holder.querySelector('picture')) holder.remove();
  }
  content.querySelectorAll('picture').forEach((pic) => {
    const holder = pic.closest('p');
    if (holder && !holder.textContent.trim()) holder.remove();
    else pic.remove();
  });

  const title = content.querySelector(HEADINGS);
  // the card link: the last link-only paragraph, else the title's own link
  const linkParas = [...content.children].filter(isLinkOnly);
  const linkPara = linkParas[linkParas.length - 1];
  const source = (linkPara && linkPara.querySelector('a'))
    || (title && title.querySelector('a[href]'))
    || imageLink;
  if (!picture && !title && !source) return null;

  const li = document.createElement('li');
  li.className = 'image-cards-slide';

  const card = document.createElement(source ? 'a' : 'div');
  card.className = 'image-cards-card';
  if (source) {
    card.href = source.href;
    if (source.target) card.target = source.target;
    if (source.rel) card.rel = source.rel;
    if (source.title && source.title !== source.textContent) card.title = source.title;
    linkPara?.remove();
    // a nested link inside the title would be invalid inside the card link
    title?.querySelectorAll('a').forEach((a) => a.replaceWith(...a.childNodes));
    content.querySelectorAll('a').forEach((a) => a.replaceWith(...a.childNodes));
  }

  if (picture) {
    const img = picture.querySelector('img');
    if (img) {
      const position = focalPoint(img);
      picture = createOptimizedPicture(img.src, img.alt, false, [
        { media: '(min-width: 768px)', width: '900' },
        { width: '750' },
      ]);
      if (position) picture.querySelector('img').style.objectPosition = position;
    }
    picture.classList.add('image-cards-card-image');
    card.append(picture);
  }

  const body = document.createElement('div');
  body.className = 'image-cards-card-content';
  if (title) title.classList.add('image-cards-card-title');
  body.append(...content.children);
  body.querySelectorAll(':scope > p').forEach((p) => p.classList.add('image-cards-card-text'));
  if (body.children.length) card.append(body);

  if (source) {
    const arrow = document.createElement('span');
    arrow.className = 'image-cards-card-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    card.append(arrow);
  }

  li.append(card);
  return li;
}

/**
 * Creates a round prev/next control.
 * @param {'prev'|'next'} dir
 * @returns {HTMLButtonElement}
 */
function navButton(dir) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `image-cards-nav image-cards-nav-${dir}`;
  button.setAttribute('aria-label', dir === 'prev' ? 'Previous slide' : 'Next slide');
  return button;
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * Wires prev/next buttons, the "01/09" counter and keyboard support to a
 * native scroll-snap track.
 * @param {HTMLElement} track
 * @param {HTMLButtonElement} prev
 * @param {HTMLButtonElement} next
 * @param {HTMLElement} counter
 */
function wireCarousel(track, prev, next, counter) {
  const slides = [...track.children];
  const total = slides.length;
  const visual = counter.querySelector('[aria-hidden]');
  const sr = counter.querySelector('.image-cards-sr');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const step = () => {
    if (total < 2) return track.clientWidth;
    return slides[1].offsetLeft - slides[0].offsetLeft;
  };
  // index of the card snapped at the start of the track
  const position = () => {
    const index = Math.round(track.scrollLeft / (step() || 1));
    return Math.max(0, Math.min(total - 1, index));
  };
  // counter index: the last card once the track cannot scroll any further
  const current = () => {
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    return atEnd && track.scrollLeft > 0 ? total - 1 : position();
  };

  let lastIndex = -1;
  const update = () => {
    const index = current();
    const maxScroll = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= maxScroll - 2;
    if (index === lastIndex) return;
    lastIndex = index;
    visual.textContent = `${pad(index + 1)}/${pad(total)}`;
    sr.textContent = `Slide ${index + 1} of ${total}`;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
  };

  const goTo = (index) => {
    const target = slides[Math.max(0, Math.min(total - 1, index))];
    if (!target) return;
    track.scrollTo({
      left: target.offsetLeft - slides[0].offsetLeft,
      behavior: reduced.matches ? 'auto' : 'smooth',
    });
  };

  prev.addEventListener('click', () => goTo(position() - 1));
  next.addEventListener('click', () => goTo(position() + 1));

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  }, { passive: true });

  // arrow keys move between cards (focus follows) when a card or the track has focus
  track.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const focused = slides.findIndex((s) => s.contains(document.activeElement));
    const from = focused >= 0 ? focused : position();
    let to = from;
    if (e.key === 'ArrowLeft') to = from - 1;
    if (e.key === 'ArrowRight') to = from + 1;
    if (e.key === 'Home') to = 0;
    if (e.key === 'End') to = total - 1;
    to = Math.max(0, Math.min(total - 1, to));
    e.preventDefault();
    const link = slides[to].querySelector('a');
    if (focused >= 0 && link) link.focus({ preventScroll: true });
    goTo(to);
  });

  // a focused card scrolled out of view (tabbing) is brought back into view
  track.addEventListener('focusin', (e) => {
    const index = slides.findIndex((s) => s.contains(e.target));
    if (index < 0) return;
    const slide = slides[index];
    const left = slide.offsetLeft - slides[0].offsetLeft;
    const visible = left >= track.scrollLeft - 1
      && left + slide.offsetWidth <= track.scrollLeft + track.clientWidth + 1;
    if (!visible) goTo(index);
  });

  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(track);
  update();
}

/**
 * Image Cards: intro on the left, a horizontal scroll-snap carousel of tall
 * image cards on the right, with prev/next buttons and a "01/09" counter.
 * Content contract:
 *   row 1 (optional): [h3 + p intro] - a single-cell row without a picture
 *   rows 2..n:        [picture] | [h4 + p + p > a explore link]
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  let intro;

  const first = rows[0];
  if (first && !first.querySelector('picture') && !first.querySelector(':scope > div + div')) {
    intro = document.createElement('div');
    intro.className = 'image-cards-intro';
    [...first.children].forEach((cell) => moveContent(cell, intro));
    rows.shift();
    if (!intro.children.length) intro = null;
  }

  const track = document.createElement('ul');
  track.className = 'image-cards-track';
  rows.forEach((row) => {
    const slide = buildSlide(row);
    if (slide) track.append(slide);
  });

  const parts = [];
  if (intro) parts.push(intro);

  if (track.children.length) {
    const total = track.children.length;
    const heading = intro?.querySelector(HEADINGS);
    const label = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : 'Image cards';

    const carousel = document.createElement('div');
    carousel.className = 'image-cards-carousel';
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
      controls.className = 'image-cards-controls';
      const prev = navButton('prev');
      const next = navButton('next');
      const counter = document.createElement('p');
      counter.className = 'image-cards-counter';
      counter.setAttribute('aria-live', 'polite');
      counter.setAttribute('aria-atomic', 'true');
      const visual = document.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      const sr = document.createElement('span');
      sr.className = 'image-cards-sr';
      counter.append(visual, sr);
      controls.append(prev, next, counter);
      carousel.append(controls);
      wireCarousel(track, prev, next, counter);
    }
    parts.push(carousel);
  }

  block.replaceChildren(...parts);
}
