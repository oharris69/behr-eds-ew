import { getMetadata } from '../../scripts/aem.js';
import { applyPageColor, getPageColor } from '../../scripts/color-theme.js';
import { isInProject, toggleProjectColor, PROJECTS_CHANGE_EVENT } from '../../scripts/projects.js';

/* UI strings (not authored) */
const LABELS = {
  gallery: 'Room gallery',
  slide: 'Slide {n} of {total}',
  previous: 'Previous room',
  next: 'Next room',
  addToProject: 'Add to project',
  addedToProject: 'Added to project',
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_PATHS = {
  plus: ['M12 4v16', 'M20 12H4'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  prev: ['M14.4 18.4L8 12l6.4-6.4'],
  next: ['M9.6 5.6L16 12l-6.4 6.4'],
};

/**
 * @param {keyof ICON_PATHS} name
 * @returns {SVGElement}
 */
function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('room-carousel-icon');
  ICON_PATHS[name].forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  });
  return svg;
}

/**
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * "Add to project" pill bound to My Projects.
 * @param {{ code: string, name: string, hex?: string }} color
 * @returns {HTMLButtonElement}
 */
function buildProjectButton(color) {
  const button = el('button', 'button room-carousel-project');
  button.type = 'button';
  const sync = () => {
    const saved = isInProject(color.code);
    button.setAttribute('aria-pressed', String(saved));
    button.replaceChildren(
      el('span', '', saved ? LABELS.addedToProject : LABELS.addToProject),
      icon(saved ? 'check' : 'plus'),
    );
  };
  button.addEventListener('click', () => {
    toggleProjectColor(color);
    sync();
  });
  window.addEventListener(PROJECTS_CHANGE_EVENT, sync);
  sync();
  return button;
}

/**
 * Room carousel: row 1 = intro (heading + copy), rows 2..n = [room picture | room name].
 * The intro is detected as the first row without a picture, so slides survive its removal.
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const pageColor = getPageColor();
  applyPageColor(block);
  const color = {
    code: pageColor?.code || getMetadata('color-code'),
    name: pageColor?.name || getMetadata('color-name'),
    hex: pageColor?.hex,
  };

  const rows = [...block.children];
  const slideRows = rows.filter((row) => row.querySelector('picture'));
  const introRow = rows.find((row) => !row.querySelector('picture') && row.textContent.trim());

  // intro
  const intro = el('div', 'room-carousel-intro');
  if (introRow) {
    introRow.querySelectorAll(':scope > div').forEach((cell) => intro.append(...cell.childNodes));
  }
  const heading = intro.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) heading.classList.add('room-carousel-title');

  // slides
  const slides = slideRows.map((row) => {
    const picture = row.querySelector('picture');
    const nameCell = [...row.children]
      .find((cell) => !cell.contains(picture) && cell.textContent.trim());
    return {
      picture,
      name: nameCell ? nameCell.textContent.trim() : '',
    };
  });

  const region = el('section', 'room-carousel-viewer');
  region.setAttribute('aria-roledescription', 'carousel');
  region.setAttribute('aria-label', heading?.textContent.trim() || LABELS.gallery);

  const track = el('div', 'room-carousel-track');
  track.tabIndex = 0;
  track.setAttribute('role', 'group');
  track.setAttribute('aria-label', LABELS.gallery);
  slides.forEach((slide, i) => {
    const li = el('div', 'room-carousel-slide');
    li.setAttribute('role', 'group');
    li.setAttribute('aria-roledescription', 'slide');
    li.setAttribute(
      'aria-label',
      [LABELS.slide.replace('{n}', i + 1).replace('{total}', slides.length), slide.name].filter(Boolean).join(': '),
    );
    const img = slide.picture.querySelector('img');
    if (img) {
      img.loading = i === 0 ? 'eager' : 'lazy';
      const focal = (img.dataset.title || '').match(/data-focal:\s*([\d.]+)\s*,\s*([\d.]+)/);
      if (focal) img.style.objectPosition = `${focal[1]}% ${focal[2]}%`;
    }
    li.append(slide.picture);
    track.append(li);
  });

  const controls = el('div', 'room-carousel-controls');
  const nav = el('div', 'room-carousel-nav');
  const prev = el('button', 'room-carousel-prev');
  const next = el('button', 'room-carousel-next');
  [[prev, LABELS.previous, 'prev'], [next, LABELS.next, 'next']].forEach(([btn, label, name]) => {
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.append(icon(name));
    nav.append(btn);
  });
  const status = el('p', 'room-carousel-status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const roomName = el('span', 'room-carousel-name');
  const counter = el('span', 'room-carousel-counter');
  status.append(roomName, counter);
  controls.append(nav, status);

  let current = -1;
  const show = (index) => {
    if (index === current || !slides.length) return;
    current = index;
    roomName.textContent = slides[index].name;
    counter.textContent = `${pad(index + 1)}/${pad(slides.length)}`;
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    [...track.children].forEach((li, i) => li.classList.toggle('is-active', i === index));
  };
  // while a button/key scroll animates, scroll positions in between must not reset the slide
  let pending = null;
  let pendingTimer;
  const clearPending = () => {
    pending = null;
    clearTimeout(pendingTimer);
  };
  const goTo = (index) => {
    const target = Math.max(0, Math.min(slides.length - 1, index));
    const li = track.children[target];
    if (!li) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    pending = target;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(clearPending, 1500);
    track.scrollTo({ left: li.offsetLeft - track.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
    show(target);
  };
  ['pointerdown', 'touchstart', 'wheel'].forEach((type) => {
    track.addEventListener(type, clearPending, { passive: true });
  });

  prev.addEventListener('click', () => goTo(current - 1));
  next.addEventListener('click', () => goTo(current + 1));
  track.addEventListener('keydown', (e) => {
    const keys = {
      ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1,
    };
    if (e.key in keys) {
      e.preventDefault();
      goTo(keys[e.key]);
    }
  });
  // swipes / trackpad scrolls update the current slide once the snap settles
  let scrollTimer;
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const index = Math.round(track.scrollLeft / (track.clientWidth || 1));
      if (pending !== null) {
        if (index !== pending) return;
        clearPending();
      }
      show(index);
    }, 80);
  }, { passive: true });

  region.append(track);
  if (slides.length > 1) region.append(controls);
  else if (slides.length === 1) {
    nav.remove();
    region.append(controls);
  }
  show(0);

  if (color.code) {
    const ctaDesktop = el('div', 'room-carousel-cta room-carousel-cta-desktop');
    ctaDesktop.append(buildProjectButton(color));
    const ctaMobile = el('div', 'room-carousel-cta room-carousel-cta-mobile');
    ctaMobile.append(buildProjectButton(color));
    intro.append(ctaDesktop);
    region.append(ctaMobile);
  }

  const parts = [];
  if (intro.children.length) parts.push(intro);
  if (slides.length) parts.push(region);
  block.replaceChildren(...parts);
}
