import { normalizeHex, getColorTheme, luminance } from '../../scripts/color-theme.js';
import { createNavButton, createCounter, wireCarousel } from '../../scripts/carousel.js';

/* the source shows at most six colors per palette */
/* near-white cards get a hairline border so they don't vanish into the page */
const WHITE_LUMINANCE = 0.87;
const HEADINGS = 'h1, h2, h3, h4, h5, h6';

/* UI strings (not authored) */
const LABELS = {
  tablist: 'Color palette',
  palette: 'Colors',
  slides: 'Slides, {total} total',
  slide: '{n} of {total}',
  view: 'View {name} color details',
};

const format = (text, values) => text.replace(/\{(\w+)\}/g, (m, key) => values[key] ?? m);

let instance = 0;

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
 * Builds one color card slide; links that aren't CODE|Name|HEX show their text.
 * @param {HTMLAnchorElement} a
 * @returns {HTMLLIElement}
 */
function buildCard(a) {
  const li = el('li', 'palette-carousel-slide');
  const color = parseColorLink(a);
  const href = a.getAttribute('href');
  const card = el(href ? 'a' : 'div', 'palette-carousel-card');
  if (href) {
    card.href = href;
    if (a.target) card.target = a.target;
  }
  const name = el('span', 'palette-carousel-card-name');
  if (color) {
    card.style.setProperty('--card-color', color.hex);
    card.classList.add(`color-theme-${getColorTheme(color.hex)}`);
    if (luminance(color.hex) >= WHITE_LUMINANCE) card.classList.add('is-white');
    name.textContent = color.name;
    const code = el('span', 'palette-carousel-card-code');
    code.textContent = color.code;
    card.append(name, code);
    if (href) card.setAttribute('aria-label', format(LABELS.view, { name: `${color.name} ${color.code}` }));
  } else {
    card.classList.add('is-plain');
    name.textContent = a.textContent.trim() || href || '';
    card.append(name);
  }
  li.append(card);
  return li;
}

/**
 * Splits a palette row into its label and color links. The label is the
 * first cell without links ("Similar", "Lighter", "Darker").
 * @param {Element} row
 * @returns {{ label: string, links: HTMLAnchorElement[] }|null}
 */
function readPalette(row) {
  const cells = [...row.children];
  const links = [...row.querySelectorAll('a[href]')];
  if (!links.length) return null;
  const labelCell = cells.find((cell) => !cell.querySelector('a[href]') && cell.textContent.trim());
  const label = labelCell ? labelCell.textContent.replace(/\s+/g, ' ').trim() : '';
  return { label, links };
}

/**
 * Builds one palette panel: a track of color cards (2-up grid below 1024px,
 * scroll-snap carousel above) with prev/next and a counter.
 * @param {{ label: string, links: HTMLAnchorElement[] }} palette
 * @param {string} carouselLabel
 * @returns {HTMLDivElement}
 */
function buildPanel(palette, carouselLabel) {
  const panel = el('div', 'palette-carousel-panel');
  const total = palette.links.length;

  const carousel = el('div', 'palette-carousel-carousel');
  carousel.setAttribute('role', 'group');
  carousel.setAttribute('aria-roledescription', 'carousel');
  carousel.setAttribute('aria-label', [carouselLabel, palette.label].filter(Boolean).join(': '));

  const track = el('ul', 'palette-carousel-track');
  track.setAttribute('aria-label', format(LABELS.slides, { total }));
  palette.links.forEach((a, i) => {
    const slide = buildCard(a);
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', format(LABELS.slide, { n: i + 1, total }));
    track.append(slide);
  });
  if (!track.querySelector('a')) track.tabIndex = 0;
  carousel.append(track);

  if (total > 1) {
    const controls = el('div', 'palette-carousel-controls');
    const prev = createNavButton('palette-carousel-nav', 'prev');
    const next = createNavButton('palette-carousel-nav', 'next');
    const counter = createCounter('palette-carousel-counter');
    controls.append(prev, next, counter);
    carousel.append(controls);
    wireCarousel(track, prev, next, counter);
  }
  panel.append(carousel);
  return panel;
}

/**
 * Activates a tab and shows its panel.
 * @param {HTMLButtonElement[]} tabs
 * @param {HTMLElement[]} panels
 * @param {number} index
 * @param {HTMLElement} control segmented control (positions the pill)
 */
function selectTab(tabs, panels, index, control) {
  tabs.forEach((tab, i) => {
    const active = i === index;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    panels[i].hidden = !active;
  });
  const tab = tabs[index];
  control.style.setProperty('--pill-x', `${tab.offsetLeft}px`);
  control.style.setProperty('--pill-width', `${tab.offsetWidth}px`);
}

/**
 * Builds the Similar / Lighter / Darker segmented control (ARIA tabs).
 * @param {{ label: string }[]} palettes
 * @param {HTMLElement[]} panels
 * @returns {HTMLDivElement}
 */
function buildTabs(palettes, panels) {
  const control = el('div', 'palette-carousel-tabs');
  control.setAttribute('role', 'tablist');
  control.setAttribute('aria-label', LABELS.tablist);
  const pill = el('span', 'palette-carousel-pill');
  pill.setAttribute('aria-hidden', 'true');
  control.append(pill);

  const tabs = palettes.map((palette, i) => {
    const tab = el('button', 'palette-carousel-tab');
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.id = `${panels[i].id}-tab`;
    tab.setAttribute('aria-controls', panels[i].id);
    tab.textContent = palette.label || `${LABELS.palette} ${i + 1}`;
    panels[i].setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => selectTab(tabs, panels, i, control));
    control.append(tab);
    return tab;
  });

  control.addEventListener('keydown', (e) => {
    const from = tabs.indexOf(document.activeElement);
    if (from < 0) return;
    let to = from;
    if (e.key === 'ArrowRight') to = (from + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') to = (from - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = tabs.length - 1;
    else return;
    e.preventDefault();
    tabs[to].focus();
    selectTab(tabs, panels, to, control);
  });

  const reposition = () => {
    const index = Math.max(0, tabs.findIndex((t) => t.classList.contains('is-active')));
    selectTab(tabs, panels, index, control);
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(reposition).observe(control);
  selectTab(tabs, panels, 0, control);
  return control;
}

/**
 * Palette Carousel: intro + a Similar / Lighter / Darker segmented control
 * switching a carousel of color cards.
 * Content contract:
 *   row 1 (optional): [heading + paragraph intro]
 *   rows 2..n:        [palette label] | [ul of links "CODE|Name|HEX"]
 * @param {Element} block
 */
export default function decorate(block) {
  instance += 1;
  const rows = [...block.children];

  let intro = null;
  const first = rows[0];
  if (first && !first.querySelector('a[href]')) {
    rows.shift();
    if (first.textContent.trim()) {
      intro = el('div', 'palette-carousel-intro');
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
      intro.querySelector(HEADINGS)?.classList.add('palette-carousel-title');
    }
  }

  const palettes = rows.map(readPalette).filter(Boolean);
  const heading = intro?.querySelector(HEADINGS);
  const carouselLabel = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : '';

  const header = el('div', 'palette-carousel-header');
  if (intro) header.append(intro);

  const content = el('div', 'palette-carousel-content');
  const panels = palettes.map((palette, i) => {
    const panel = buildPanel(palette, carouselLabel);
    panel.id = `palette-carousel-${instance}-panel-${i + 1}`;
    panel.setAttribute('role', 'tabpanel');
    panel.tabIndex = -1;
    content.append(panel);
    return panel;
  });

  const parts = [];
  // like the source, the control shows even when only one palette is authored
  if (palettes.length) {
    const control = el('div', 'palette-carousel-control');
    control.append(buildTabs(palettes, panels));
    header.append(control);
  }
  if (header.children.length) parts.push(header);
  if (panels.length) parts.push(content);
  block.replaceChildren(...parts);
}
