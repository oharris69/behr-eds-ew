import { getMetadata } from '../../scripts/aem.js';
import { getPageColor } from '../../scripts/color-theme.js';
import { isInProject, toggleProjectColor, PROJECTS_CHANGE_EVENT } from '../../scripts/projects.js';

/* UI strings (not authored) */
const LABELS = {
  gallery: 'Gallery',
  slides: 'Slides, {total} total',
  slide: '{n} of {total}',
  thumbnails: 'Slide navigation',
  thumbnail: 'Show slide {n}',
  addToProject: 'Add to project',
  addedToProject: 'Added to project',
  /* accessible names start with the visible label, then the color */
  projectColor: '{label}: {color}',
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_PATHS = {
  plus: ['M12 4v16', 'M20 12H4'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
};

/**
 * @param {keyof ICON_PATHS} name
 * @returns {SVGElement} a 24px stroke icon drawn in currentColor
 */
function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('gallery-icon');
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
 * @returns {HTMLElement}
 */
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

const format = (text, values) => text.replace(/\{(\w+)\}/g, (m, key) => values[key] ?? m);

/**
 * Reads the authored focal point (`data-title="data-focal:x,y"`) as an object-position.
 * @param {HTMLImageElement|null} img
 */
function applyFocalPoint(img) {
  const raw = img?.dataset.title || img?.getAttribute('title') || '';
  const match = raw.match(/data-focal:\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (match) img.style.objectPosition = `${match[1]}% ${match[2]}%`;
}

/**
 * The page color the "Add to project" button saves.
 * @returns {{ code: string, name: string, hex?: string }|null}
 */
function projectColor() {
  const page = getPageColor();
  const code = page?.code || getMetadata('color-code');
  if (!code) return null;
  return { code, name: page?.name || getMetadata('color-name'), hex: page?.hex };
}

/**
 * "Add to project" pill that adds/removes the page color from My Projects.
 * Every instance stays in sync through PROJECTS_CHANGE_EVENT.
 * @param {{ code: string, name: string, hex?: string }} color
 * @param {string} label authored button text
 * @returns {HTMLButtonElement}
 */
function buildProjectButton(color, label) {
  const button = el('button', 'button primary gallery-project');
  button.type = 'button';
  const colorLabel = [color.name, color.code].filter(Boolean).join(' ');

  const sync = () => {
    const saved = isInProject(color.code);
    const text = saved ? LABELS.addedToProject : label;
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', colorLabel ? format(LABELS.projectColor, { label: text, color: colorLabel }) : text);
    const span = el('span', 'gallery-project-label');
    span.textContent = text;
    button.replaceChildren(span, icon(saved ? 'check' : 'plus'));
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
 * Splits the intro cell into heading, copy and the CTA label.
 * @param {Element|null} cell
 */
function readIntro(cell) {
  const intro = { heading: null, copy: [], ctaLabel: '' };
  if (!cell) return intro;
  intro.heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
  [...cell.querySelectorAll('p')].forEach((p) => {
    const link = p.querySelector('a');
    if (link && p.textContent.trim() === link.textContent.trim()) {
      if (!intro.ctaLabel) intro.ctaLabel = link.textContent.replace(/:[a-z][a-z0-9-]*:/g, '').trim();
      return;
    }
    if (p.textContent.trim()) intro.copy.push(p);
  });
  return intro;
}

/**
 * Scroll-snap slider: thumbnails jump to a slide, the active thumbnail follows the track.
 * @param {HTMLElement} track
 * @param {HTMLButtonElement[]} thumbs
 */
function wireSlider(track, thumbs) {
  const slides = [...track.children];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = -1;

  const setActive = (index) => {
    if (index === active) return;
    active = index;
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('is-active', i === index);
      thumb.setAttribute('aria-current', String(i === index));
    });
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
      // off-screen slides stay out of the reading order
      slide.setAttribute('aria-hidden', String(i !== index));
    });
  };

  const position = () => {
    const width = track.clientWidth || 1;
    return Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / width)));
  };

  const goTo = (index) => {
    const target = slides[Math.max(0, Math.min(slides.length - 1, index))];
    if (!target) return;
    track.scrollTo({ left: target.offsetLeft - slides[0].offsetLeft, behavior: reduced.matches ? 'auto' : 'smooth' });
    setActive(slides.indexOf(target));
  };

  thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => goTo(i)));

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      setActive(position());
    });
  }, { passive: true });

  track.addEventListener('keydown', (e) => {
    const keys = {
      ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: slides.length - 1,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    goTo(keys[e.key]);
  });

  setActive(0);
}

/**
 * Gallery: row 1 = intro (heading, copy, "Add to project" link);
 * rows 2+ = [picture] | [optional caption].
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const introRow = rows.find((row) => !row.querySelector('picture'));
  const intro = readIntro(introRow?.firstElementChild);
  const slidesData = rows
    .filter((row) => row !== introRow)
    .map((row) => {
      const picture = row.querySelector('picture');
      const captionCell = [...row.children].find((cell) => !cell.querySelector('picture'));
      return { picture, caption: captionCell?.textContent.trim() || '' };
    })
    .filter((slide) => slide.picture);

  const label = intro.heading?.textContent.trim() || LABELS.gallery;

  // editorial column
  const editorial = el('div', 'gallery-editorial');
  if (intro.heading) {
    intro.heading.classList.add('gallery-title');
    editorial.append(intro.heading);
  }
  intro.copy.forEach((p) => {
    p.classList.add('gallery-copy');
    editorial.append(p);
  });

  // "Add to project": inline on desktop, full-width bar below the slider on smaller screens
  const color = projectColor();
  const ctaLabel = intro.ctaLabel || LABELS.addToProject;
  let ctaBar = null;
  if (color && introRow?.querySelector('a')) {
    const desktop = el('div', 'gallery-cta-desktop');
    desktop.append(buildProjectButton(color, ctaLabel));
    editorial.append(desktop);
    ctaBar = el('div', 'gallery-cta-bar');
    ctaBar.append(buildProjectButton(color, ctaLabel));
  }

  // slider
  const carousel = el('div', 'gallery-carousel');
  carousel.setAttribute('role', 'group');
  carousel.setAttribute('aria-roledescription', 'carousel');
  carousel.setAttribute('aria-label', label);

  const viewport = el('div', 'gallery-viewport');
  const track = el('ul', 'gallery-track');
  track.tabIndex = 0;
  track.setAttribute('aria-label', format(LABELS.slides, { total: slidesData.length }));
  const thumbs = el('div', 'gallery-thumbs');
  thumbs.setAttribute('role', 'group');
  thumbs.setAttribute('aria-label', LABELS.thumbnails);

  const thumbButtons = slidesData.map(({ picture, caption }, i) => {
    const img = picture.querySelector('img');
    applyFocalPoint(img);
    if (img) {
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.removeAttribute('title');
    }

    const slide = el('li', 'gallery-slide');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', format(LABELS.slide, { n: i + 1, total: slidesData.length }));
    const media = el('div', 'gallery-image');
    media.append(picture);
    slide.append(media);
    if (caption) {
      const handle = el('span', 'gallery-caption');
      handle.textContent = caption;
      slide.append(handle);
    }
    track.append(slide);

    const thumb = el('button', 'gallery-thumb');
    thumb.type = 'button';
    thumb.setAttribute('aria-label', format(LABELS.thumbnail, { n: i + 1 }));
    const thumbPicture = picture.cloneNode(true);
    const thumbImg = thumbPicture.querySelector('img');
    if (thumbImg) {
      thumbImg.alt = '';
      thumbImg.loading = 'lazy';
    }
    thumb.append(thumbPicture);
    thumbs.append(thumb);
    return thumb;
  });

  viewport.append(track);
  carousel.append(viewport);
  if (thumbButtons.length > 1) carousel.append(thumbs);

  const grid = el('div', 'gallery-grid');
  grid.append(editorial, carousel);
  block.replaceChildren(grid);
  if (ctaBar) block.append(ctaBar);
  if (!slidesData.length) carousel.remove();

  if (slidesData.length) wireSlider(track, thumbButtons);
}
