import { normalizeHex, getColorTheme, luminance } from '../../scripts/color-theme.js';
import { createNavButton, createCounter, wireCarousel } from '../../scripts/carousel.js';
import { isInProject, toggleProjectColor, PROJECTS_CHANGE_EVENT } from '../../scripts/projects.js';

/* the source shows at most six curated palettes */
/* swatch roles, in authored order */
const ROLES = ['main', 'accent1', 'accent2', 'white'];
/* near-white swatches get a hairline border so they don't vanish into the page */
const WHITE_LUMINANCE = 0.87;
const HEADINGS = 'h1, h2, h3, h4, h5, h6';

/* UI strings (not authored) */
const LABELS = {
  carousel: 'Color palettes',
  slides: 'Slides, {total} total',
  slide: '{n} of {total}',
  palette: 'Palette {n}: {colors}',
  view: 'View {name} color details',
  addPalette: 'Add palette to project',
  addedPalette: 'Palette added',
  addPaletteAria: '{label}: palette {n}',
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_PATHS = {
  plus: ['M12 4v16', 'M20 12H4'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
};

const format = (text, values) => text.replace(/\{(\w+)\}/g, (m, key) => values[key] ?? m);

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

/**
 * @param {keyof ICON_PATHS} name
 * @returns {SVGElement} a 24px stroke icon drawn in currentColor
 */
function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('color-palettes-icon');
  ICON_PATHS[name].forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  });
  return svg;
}

/**
 * Parses a color link authored as "CODE|Name|HEX" (link text, else title).
 * @param {HTMLAnchorElement} a
 * @returns {{ code: string, name: string, hex: string }|null}
 */
function parseColorLink(a) {
  const candidates = [a.textContent, a.title];
  for (let i = 0; i < candidates.length; i += 1) {
    const parts = String(candidates[i] || '').split('|').map((p) => p.trim());
    if (parts.length === 3 && parts[0] && parts[1]) {
      const hex = normalizeHex(parts[2]);
      if (hex) return { code: parts[0], name: parts[1], hex };
    }
  }
  return null;
}

/**
 * Builds one swatch: a full-bleed link painted with the color, name + code
 * in the top-left corner. Links that aren't CODE|Name|HEX show their text.
 * @param {HTMLAnchorElement} a
 * @param {number} index position in the palette
 * @returns {{ node: HTMLAnchorElement|HTMLDivElement, color: object|null }}
 */
function buildSwatch(a, index) {
  const color = parseColorLink(a);
  const href = a.getAttribute('href');
  const swatch = el(href ? 'a' : 'div', 'color-palettes-swatch');
  swatch.dataset.role = ROLES[index] || 'extra';
  if (href) {
    swatch.href = href;
    if (a.target) swatch.target = a.target;
  }

  const name = el('span', 'color-palettes-swatch-name');
  if (color) {
    swatch.style.setProperty('--swatch-color', color.hex);
    swatch.classList.add(`color-theme-${getColorTheme(color.hex)}`);
    if (luminance(color.hex) >= WHITE_LUMINANCE) swatch.classList.add('is-white');
    name.textContent = color.name;
    const code = el('span', 'color-palettes-swatch-code');
    code.textContent = color.code;
    swatch.append(name, code);
    if (href) swatch.setAttribute('aria-label', format(LABELS.view, { name: `${color.name} ${color.code}` }));
  } else {
    swatch.classList.add('is-plain');
    name.textContent = a.textContent.trim() || href || '';
    swatch.append(name);
  }
  return { node: swatch, color };
}

/**
 * Builds one palette slide from a row holding a list of color links.
 * @param {Element} row
 * @returns {{ slide: HTMLLIElement, colors: object[] }|null}
 */
function buildPalette(row) {
  const links = [...row.querySelectorAll('a[href]')];
  if (!links.length) return null;
  const slide = el('li', 'color-palettes-slide');
  const palette = el('div', 'color-palettes-palette');
  const colors = [];
  links.forEach((a, i) => {
    const { node, color } = buildSwatch(a, i);
    palette.append(node);
    if (color) colors.push(color);
  });
  palette.dataset.count = String(links.length);
  slide.append(palette);
  return { slide, colors };
}

/**
 * "Add palette to project" pill: saves every color of the active palette,
 * or removes them all once the whole palette is saved. Instances stay in
 * sync through PROJECTS_CHANGE_EVENT.
 * @param {() => { colors: object[], index: number }} getActive
 * @returns {{ button: HTMLButtonElement, sync: () => void }}
 */
function buildProjectButton(getActive) {
  const button = el('button', 'button primary color-palettes-project');
  button.type = 'button';

  const sync = () => {
    const { colors, index } = getActive();
    const saved = colors.length > 0 && colors.every((c) => isInProject(c.code));
    const text = saved ? LABELS.addedPalette : LABELS.addPalette;
    button.disabled = !colors.length;
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', format(LABELS.addPaletteAria, { label: text, n: index + 1 }));
    const label = el('span', 'color-palettes-project-label');
    label.textContent = text;
    button.replaceChildren(label, icon(saved ? 'check' : 'plus'));
  };

  button.addEventListener('click', () => {
    const { colors } = getActive();
    const saved = colors.every((c) => isInProject(c.code));
    colors.forEach((c) => {
      if (saved || !isInProject(c.code)) toggleProjectColor(c);
    });
    sync();
  });
  window.addEventListener(PROJECTS_CHANGE_EVENT, sync);
  return { button, sync };
}

/**
 * Color Palettes: intro (+ "Add palette to project") beside a carousel of
 * curated four-color palettes with prev/next and a "01/06" counter.
 * Content contract:
 *   row 1 (optional): [heading + paragraph intro]
 *   rows 2..n:        [ul of links "CODE|Name|HEX": main, accent 1, accent 2, trim white]
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];

  let intro = null;
  const first = rows[0];
  if (first && !first.querySelector('li a[href]')) {
    rows.shift();
    if (first.textContent.trim()) {
      intro = el('div', 'color-palettes-intro');
      [...first.children].forEach((cell) => {
        [...cell.childNodes].forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            if (!node.textContent.trim()) return;
            const p = el('p');
            p.textContent = node.textContent.trim();
            intro.append(p);
          } else if (node.nodeType === Node.ELEMENT_NODE && node.textContent.trim()) {
            intro.append(node);
          }
        });
      });
      intro.querySelector(HEADINGS)?.classList.add('color-palettes-title');
    }
  }

  // every authored palette shows (the importer authors the source's 6)
  const palettes = rows.map(buildPalette).filter(Boolean);
  const parts = [];

  if (!palettes.length) {
    if (intro) parts.push(intro);
    block.replaceChildren(...parts);
    return;
  }

  const total = palettes.length;
  const heading = intro?.querySelector(HEADINGS);
  const label = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : LABELS.carousel;

  const track = el('ul', 'color-palettes-track');
  track.setAttribute('aria-label', format(LABELS.slides, { total }));
  palettes.forEach(({ slide, colors }, i) => {
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', colors.length
      ? format(LABELS.palette, { n: i + 1, colors: colors.map((c) => c.name).join(', ') })
      : format(LABELS.slide, { n: i + 1, total }));
    track.append(slide);
  });
  if (!track.querySelector('a')) track.tabIndex = 0;

  const carousel = el('div', 'color-palettes-carousel');
  carousel.setAttribute('role', 'region');
  carousel.setAttribute('aria-roledescription', 'carousel');
  carousel.setAttribute('aria-label', label);
  const viewport = el('div', 'color-palettes-viewport');
  viewport.append(track);
  carousel.append(viewport);

  // the palette the "Add palette to project" buttons act on
  let activeIndex = 0;
  const getActive = () => ({ colors: palettes[activeIndex]?.colors || [], index: activeIndex });
  const hasColors = palettes.some((p) => p.colors.length);
  const projectButtons = hasColors
    ? [buildProjectButton(getActive), buildProjectButton(getActive)]
    : [];
  const syncAll = () => projectButtons.forEach((b) => b.sync());

  if (total > 1) {
    const controls = el('div', 'color-palettes-controls');
    const prev = createNavButton('color-palettes-nav', 'prev');
    const next = createNavButton('color-palettes-nav', 'next');
    const counter = createCounter('color-palettes-counter');
    controls.append(prev, next, counter);
    carousel.append(controls);
    wireCarousel(track, prev, next, counter);

    // follow the slide the carousel marks active
    const slides = [...track.children];
    const observer = new MutationObserver(() => {
      const index = slides.findIndex((s) => s.classList.contains('is-active'));
      if (index >= 0 && index !== activeIndex) {
        activeIndex = index;
        syncAll();
      }
    });
    slides.forEach((s) => observer.observe(s, { attributes: true, attributeFilter: ['class'] }));
  }
  syncAll();

  if (intro) {
    if (projectButtons[0]) {
      const cta = el('p', 'color-palettes-cta color-palettes-cta-desktop');
      cta.append(projectButtons[0].button);
      intro.append(cta);
    }
    parts.push(intro);
  }
  if (projectButtons[1]) {
    const cta = el('p', 'color-palettes-cta color-palettes-cta-mobile');
    cta.append(projectButtons[1].button);
    carousel.append(cta);
    // without an intro the single CTA lives under the carousel at every width
    if (!intro) cta.classList.add('is-only');
  }
  parts.push(carousel);
  block.replaceChildren(...parts);
}
