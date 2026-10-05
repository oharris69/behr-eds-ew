import { getColorTheme, normalizeHex } from '../../scripts/color-theme.js';
import { isInProject, toggleProjectColor, PROJECTS_CHANGE_EVENT } from '../../scripts/projects.js';

/* UI strings (not authored) */
const LABELS = {
  discover: 'Discover',
  discoverColor: 'Discover {color}',
  visualize: 'Visualize',
  visualizeColor: 'Visualize {color}',
  addToProject: 'Add to project',
  addedToProject: 'Added to project',
  projectColor: '{label}: {color}',
  open: '{color}, show options',
  close: 'Close {color} options',
};

/* the color visualizer lives on behr.com (same target as the color-visualizer block) */
const VISUALIZER_URL = 'https://www.behr.com/colors/paint/visualizer-landing';
const DESKTOP = '(width >= 1024px)'; /* breakpoint-exception: Behr desktop layout */
/* fraction of each card's scroll range the previous card stays fully visible */
const CARD_BUFFER = 0.3;
/* scroll distance (px) after which an open swatch closes on mobile */
const SWATCH_CLOSE_SCROLL = 30;

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_PATHS = {
  plus: ['M12 4v16', 'M20 12H4'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  eye: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', 'M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z'],
};

let uid = 0;

/**
 * @param {keyof ICON_PATHS} name
 * @returns {SVGElement} a 24px stroke icon drawn in currentColor
 */
function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('bento-grid-icon');
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

const format = (text, values) => text.replace(/\{(\w+)\}/g, (m, key) => values[key] ?? m);

/**
 * Reads the authored focal point (`data-title="data-focal:x,y"`) as an object-position.
 * @param {HTMLImageElement|null} img
 */
function applyFocalPoint(img) {
  if (!img) return;
  const raw = img.dataset.title || img.getAttribute('title') || '';
  const match = raw.match(/data-focal:\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (match) img.style.objectPosition = `${match[1]}% ${match[2]}%`;
  if (/data-focal:/.test(img.getAttribute('title') || '')) img.removeAttribute('title');
}

/**
 * Parses an authored "CODE|Name|HEX" color link.
 * @param {HTMLAnchorElement} link
 * @returns {{ code: string, name: string, hex: string, href: string }|null}
 */
function parseColorLink(link) {
  const raw = [link.textContent, link.title].find((t) => t && t.includes('|')) || link.textContent || '';
  const [code = '', name = '', hex = ''] = raw.split('|').map((part) => part.trim());
  if (!code && !name) return null;
  return {
    code,
    name: name || code,
    hex: normalizeHex(hex) || '#f0f0ec',
    href: link.getAttribute('href') || '',
  };
}

/**
 * Linear blend of two "#rrggbb" colors.
 * @param {string} from
 * @param {string} to
 * @param {number} t 0..1
 * @returns {string} rgb() color
 */
function blend(from, to, t) {
  const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = channels(from);
  const b = channels(to);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(' ')})`;
}

/**
 * "Add to project" pill bound to My Projects (kept in sync across instances).
 * @param {{ code: string, name: string, hex: string }} color
 * @param {string} className extra classes
 * @returns {HTMLButtonElement}
 */
function buildProjectButton(color, className) {
  const button = el('button', `button ${className}`);
  button.type = 'button';
  const colorLabel = [color.name, color.code].filter(Boolean).join(' ');
  const sync = () => {
    const saved = isInProject(color.code);
    const text = saved ? LABELS.addedToProject : LABELS.addToProject;
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', format(LABELS.projectColor, { label: text, color: colorLabel }));
    button.replaceChildren(el('span', 'bento-grid-project-label', text), icon(saved ? 'check' : 'plus'));
  };
  button.addEventListener('click', () => {
    toggleProjectColor({ code: color.code, name: color.name, hex: color.hex });
    sync();
  });
  window.addEventListener(PROJECTS_CHANGE_EVENT, sync);
  sync();
  return button;
}

/**
 * @param {string} href
 * @param {string} className
 * @param {string} text
 * @param {string} label accessible name
 * @returns {HTMLAnchorElement}
 */
function linkButton(href, className, text, label) {
  const a = el('a', `button ${className}`);
  a.href = href;
  a.setAttribute('aria-label', label);
  a.append(el('span', 'bento-grid-button-label', text));
  return a;
}

/**
 * One card: room picture, centered color swatch (opens a CTA panel on mobile)
 * and Discover / Add to project CTAs that fade in on the active card (desktop).
 * @param {{ code: string, name: string, hex: string, href: string }} color
 * @param {HTMLPictureElement|null} picture
 */
function buildCard(color, picture) {
  uid += 1;
  const id = `bento-grid-${uid}`;
  const theme = getColorTheme(color.hex);
  const visualize = new URL(VISUALIZER_URL);
  visualize.searchParams.set('colorCode', color.code);

  const card = el('div', 'bento-grid-card');
  card.style.setProperty('--bento-grid-card-color', color.hex);

  const media = el('div', 'bento-grid-image');
  if (picture) {
    applyFocalPoint(picture.querySelector('img'));
    media.append(picture);
  }

  const swatch = el('div', `bento-grid-swatch color-theme-${theme}`);
  swatch.dataset.state = 'closed';

  // desktop: the swatch opens the visualizer (a mouse shortcut;
  // the CTAs below carry the keyboard path)
  const swatchLink = el('a', 'bento-grid-swatch-link');
  swatchLink.href = visualize.href;
  swatchLink.tabIndex = -1;
  swatchLink.setAttribute('aria-hidden', 'true');

  // mobile: the swatch is a disclosure for the CTA panel
  const trigger = el('button', 'bento-grid-trigger');
  trigger.type = 'button';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', `${id}-panel`);
  trigger.setAttribute('aria-label', format(LABELS.open, { color: color.name }));

  const header = el('div', 'bento-grid-swatch-header');
  const text = el('div', 'bento-grid-swatch-text');
  text.append(el('p', 'bento-grid-swatch-name', color.name), el('p', 'bento-grid-swatch-code', color.code));
  const close = el('button', 'bento-grid-close');
  close.type = 'button';
  close.setAttribute('aria-label', format(LABELS.close, { color: color.name }));
  close.append(icon('close'));
  header.append(text, close);

  const panel = el('div', 'bento-grid-panel');
  panel.id = `${id}-panel`;
  panel.inert = true;
  const panelRow = el('div', 'bento-grid-panel-row');
  if (color.href) {
    panelRow.append(linkButton(color.href, 'secondary', LABELS.discover, format(LABELS.discoverColor, { color: color.name })));
  }
  const visualizeLink = linkButton(visualize.href, 'secondary', LABELS.visualize, format(LABELS.visualizeColor, { color: color.name }));
  visualizeLink.append(icon('eye'));
  panelRow.append(visualizeLink);
  panel.append(panelRow);
  if (color.code) panel.append(buildProjectButton(color, 'primary bento-grid-panel-project'));

  swatch.append(swatchLink, trigger, header, panel);

  const ctas = el('div', 'bento-grid-ctas');
  if (color.href) {
    ctas.append(linkButton(color.href, 'secondary bento-grid-discover', LABELS.discover, format(LABELS.discoverColor, { color: color.name })));
  }
  if (color.code) ctas.append(buildProjectButton(color, 'primary bento-grid-project'));

  card.append(media, el('div', 'bento-grid-gradient'), swatch, ctas);

  const setOpen = (open) => {
    swatch.dataset.state = open ? 'open' : 'closed';
    card.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    panel.inert = !open;
  };

  return {
    card, color, theme, trigger, close, setOpen, isOpen: () => swatch.dataset.state === 'open',
  };
}

/**
 * Bento grid: row 1 = heading; rows 2+ = [ul with one "CODE|Name|HEX" color link] | [room picture].
 * Desktop: flex accordion, the hovered/focused card grows and tints the block.
 * Mobile / tablet: cards stack on scroll inside a sticky viewport; the background blends.
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const heading = rows.map((row) => row.querySelector('h1, h2, h3, h4, h5, h6')).find(Boolean);

  const cards = rows
    .map((row) => {
      const link = [...row.querySelectorAll('a')].find((a) => a.textContent.includes('|') || a.title.includes('|'))
        || row.querySelector('a');
      const color = link && parseColorLink(link);
      if (!color) return null;
      return buildCard(color, row.querySelector('picture'));
    })
    .filter(Boolean);

  const inner = el('div', 'bento-grid-inner');
  if (heading) {
    const headingWrap = el('div', 'bento-grid-heading');
    heading.classList.add('bento-grid-title');
    headingWrap.append(heading);
    inner.append(headingWrap);
  }
  const list = el('div', 'bento-grid-cards');
  cards.forEach(({ card }) => list.append(card));
  inner.append(list);
  block.replaceChildren(inner);
  if (!cards.length) return;

  // first card is the likely LCP on desktop
  const firstImg = cards[0].card.querySelector('img');
  if (firstImg) {
    firstImg.loading = 'eager';
    firstImg.fetchPriority = 'high';
  }

  const desktop = window.matchMedia(DESKTOP);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = -1;
  let theme = '';

  const setTheme = (next) => {
    if (next === theme) return;
    block.classList.remove(`color-theme-${theme}`);
    theme = next;
    block.classList.add(`color-theme-${theme}`);
  };

  const setActive = (index, tint = true) => {
    if (index !== active) {
      active = index;
      cards.forEach(({ card }, i) => card.toggleAttribute('data-active', i === index));
    }
    if (tint) {
      block.style.setProperty('--bento-grid-bg', cards[index].color.hex);
      setTheme(cards[index].theme);
    }
  };

  const closeAll = (except) => cards.forEach((c) => {
    if (c !== except && c.isOpen()) c.setOpen(false);
  });

  // ---- mobile / tablet: scroll-driven stacking ----
  let stack = null;
  let openScrollY = null;

  const measure = () => {
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 0;
    const viewH = window.innerHeight;
    const perCard = viewH * 0.55;
    const dwell = viewH * 0.5;
    block.style.height = `${Math.round(viewH + (cards.length - 1) * perCard + dwell)}px`;
    // where the sticky viewport pins: block top + its top padding, under the fixed header
    const offset = (parseFloat(getComputedStyle(block).paddingTop) || 0) - navH;
    stack = { offset, perCard };
  };

  // content above (images, fragments) can still move the block, so read its position live
  const stackStart = () => block.getBoundingClientRect().top + window.scrollY + stack.offset;

  const render = () => {
    if (!stack) return;
    const { scrollY } = window;
    if (openScrollY !== null && Math.abs(scrollY - openScrollY) > SWATCH_CLOSE_SCROLL) {
      closeAll();
      openScrollY = null;
    }
    const raw = (scrollY - stackStart()) / stack.perCard;
    const progress = Math.max(0, Math.min(cards.length - 1, raw));
    const from = Math.min(Math.floor(progress), cards.length - 1);
    const local = progress - from;
    const eased = Math.max(0, Math.min(1, (local - CARD_BUFFER) / (1 - CARD_BUFFER)));
    cards.forEach(({ card }, i) => {
      let y = 100;
      if (i <= from) y = 0;
      else if (i === from + 1) y = (1 - eased) * 100;
      card.style.transform = `translateY(${y}%)`;
      card.toggleAttribute('data-stacked', i <= from || (i === from + 1 && eased >= 1));
    });
    const to = Math.min(from + 1, cards.length - 1);
    block.style.setProperty('--bento-grid-bg', blend(cards[from].color.hex, cards[to].color.hex, eased));
    const current = eased >= 0.5 ? to : from;
    setActive(current, false);
    setTheme(cards[current].theme);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      render();
    });
  };
  const onResize = () => {
    if (!block.classList.contains('is-stacking')) return;
    measure();
    render();
  };

  const startStacking = () => {
    block.classList.add('is-stacking');
    cards.forEach(({ card }, i) => { card.style.zIndex = String(i + 1); });
    requestAnimationFrame(() => {
      measure();
      render();
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
  };

  const stopStacking = () => {
    block.classList.remove('is-stacking');
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    block.style.removeProperty('height');
    stack = null;
    cards.forEach(({ card }) => {
      card.style.removeProperty('transform');
      card.style.removeProperty('z-index');
      card.removeAttribute('data-stacked');
    });
  };

  // a keyboard user tabbing into a card scrolls the stack so that card is fully landed
  const scrollToCard = (index) => {
    if (!stack) return;
    const top = stackStart() + index * stack.perCard;
    if (Math.abs(window.scrollY - top) < 5) return;
    window.scrollTo({ top, behavior: reduced.matches ? 'auto' : 'smooth' });
  };

  // ---- interactions ----
  cards.forEach((c, i) => {
    c.card.addEventListener('mouseenter', () => { if (desktop.matches) setActive(i); });
    c.card.addEventListener('focusin', () => {
      if (desktop.matches) setActive(i);
      else if (block.classList.contains('is-stacking')) scrollToCard(i);
    });
    c.trigger.addEventListener('click', () => {
      closeAll(c);
      c.setOpen(true);
      if (block.classList.contains('is-stacking')) {
        scrollToCard(i);
        // let the snap scroll settle before scroll-to-close starts counting
        setTimeout(() => { openScrollY = window.scrollY; }, 600);
      }
      c.close.focus({ preventScroll: true });
    });
    c.close.addEventListener('click', () => {
      c.setOpen(false);
      openScrollY = null;
      c.trigger.focus({ preventScroll: true });
    });
    c.card.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !c.isOpen()) return;
      c.setOpen(false);
      c.trigger.focus({ preventScroll: true });
    });
  });

  const applyMode = () => {
    closeAll();
    if (desktop.matches || reduced.matches) {
      stopStacking();
      setActive(Math.max(active, 0));
    } else {
      startStacking();
    }
  };
  desktop.addEventListener('change', applyMode);
  reduced.addEventListener('change', applyMode);
  setActive(0);
  applyMode();

  // desktop entrance: fade the grid in once it scrolls into view
  if (!reduced.matches && 'IntersectionObserver' in window) {
    block.classList.add('is-revealing');
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      block.classList.add('is-in-view');
      observer.disconnect();
    }, { threshold: 0.15 });
    observer.observe(block);
  }
}
