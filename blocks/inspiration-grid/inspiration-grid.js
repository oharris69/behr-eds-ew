import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

const DEFAULT_SOURCE = '/inspiration/cards/query-index.json';
const DEFAULT_TAGS = '/docs/library/tagging.json';
const PAGE_SIZE = 12;
/* tag namespaces shown first in the filter tray; any others follow in data order */
const GROUP_ORDER = ['project-area', 'style', 'mood', 'color'];
/* swatch colors for the "color" family chips */
const COLOR_FAMILY_DOTS = {
  whites: '#fff',
  grays: '#9b9b98',
  blacks: '#000',
  neutrals: '#d6cbb8',
  reds: '#b3362f',
  oranges: '#dc7a3b',
  yellows: '#f0cd57',
  greens: '#66875a',
  blues: '#3e6aa3',
  purples: '#76589f',
  browns: '#7a5536',
  pinks: '#e4a3b1',
  cools: '#7ea7c4',
  warms: '#df9f6b',
};
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

let instance = 0;

/**
 * Creates an element with attributes and children.
 * @param {string} tag
 * @param {Object<string, string>} [attrs]
 * @param {...(Node|string|null)} children
 * @returns {HTMLElement}
 */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value);
  });
  children.forEach((child) => {
    if (child !== null && child !== undefined) node.append(child);
  });
  return node;
}

/**
 * Reads a config value as a single trimmed string (cells with several
 * paragraphs or links come back from readBlockConfig as arrays).
 * @param {string|string[]|undefined} value
 * @returns {string}
 */
function configString(value) {
  if (Array.isArray(value)) return value.join(',').trim();
  return (value || '').trim();
}

/**
 * Index columns holding lists can arrive as arrays, JSON array strings or
 * comma-separated strings.
 * @param {*} value
 * @returns {string[]}
 */
function toList(value) {
  if (Array.isArray(value)) return value.map((v) => `${v}`.trim()).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  const text = value.trim();
  if (text.startsWith('[')) {
    try {
      return toList(JSON.parse(text));
    } catch { /* fall through to comma split */ }
  }
  return text.split(',').map((v) => v.trim()).filter(Boolean);
}

/** @param {string} tag @returns {string} the tag namespace ("project-area") */
const namespaceOf = (tag) => (tag.includes('/') ? tag.slice(0, tag.indexOf('/')) : '');

/** @param {string} slug @returns {string} "kids-room" -> "Kids Room" */
const titleCase = (slug) => slug.split(/[-_/]/).filter(Boolean)
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/**
 * Normalises a query-index row into a card model.
 * @param {Object} row
 * @param {string} base index URL used to resolve relative image paths
 * @returns {Object|null}
 */
function normalizeCard(row, base) {
  if (!row || typeof row.path !== 'string' || !row.path.trim()) return null;
  const colors = toList(row.color).map((entry) => {
    const [code = '', name = '', hex = ''] = entry.split('|').map((part) => part.trim());
    return { code, name: name || code, hex: /^[0-9a-f]{3,8}$/i.test(hex) ? `#${hex}` : '' };
  }).filter((c) => c.name || c.hex);
  const priority = Number.parseFloat(row.priority);
  const lastModified = Number(row.lastModified);
  let image = '';
  if (row.image) {
    try {
      image = new URL(row.image, base).href;
    } catch { image = ''; }
  }
  return {
    path: row.path.trim(),
    headline: (row.headline || row.title || '').replace(/\s*\|\s*Behr\s*$/i, '').trim(),
    description: (row.description || '').replace(/\u200b/g, '').trim(),
    image,
    imageAlt: row['image-alt'] || '',
    tags: toList(row.tags),
    priority: Number.isFinite(priority) ? priority : Infinity,
    lastModified: Number.isFinite(lastModified) ? lastModified : 0,
    colors,
  };
}

/** Sorts by priority (ascending, unset last) then lastModified (newest first). */
function sortCards(cards) {
  return [...cards].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority < b.priority ? -1 : 1;
    return b.lastModified - a.lastModified;
  });
}

/**
 * AND across tag namespaces, OR within one namespace.
 * @param {Object} card
 * @param {string[]} tags selected tag keys
 * @returns {boolean}
 */
function matches(card, tags) {
  if (!tags.length) return true;
  const groups = new Map();
  tags.forEach((tag) => {
    const ns = namespaceOf(tag);
    if (!groups.has(ns)) groups.set(ns, []);
    groups.get(ns).push(tag);
  });
  return [...groups.values()].every((group) => group.some((tag) => card.tags.includes(tag)));
}

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${url}: HTTP ${resp.status}`);
  return resp.json();
}

/**
 * Loads the tag sheet into key -> label. Failures fall back to slug labels.
 * @param {string} url
 * @returns {Promise<Map<string, string>>}
 */
async function loadTagLabels(url) {
  const labels = new Map();
  try {
    const json = await fetchJson(url);
    const rows = Array.isArray(json) ? json : json.data || [];
    rows.forEach((row) => {
      const key = `${row.key || ''}`.trim();
      const value = `${row.value || ''}`.trim();
      if (key && value) labels.set(key, value);
      // a namespace without its own row can still take its label from "comments"
      const ns = namespaceOf(key);
      const comment = `${row.comments || ''}`.trim();
      if (ns && comment && !labels.has(`${ns}#group`)) labels.set(`${ns}#group`, comment);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('inspiration-grid: tag labels unavailable', error);
  }
  return labels;
}

/**
 * Derives the filter groups from the cards' tags (prefiltered namespaces are
 * fixed by the author and not offered again).
 * @param {Object[]} cards
 * @param {Map<string, string>} labels
 * @param {string[]} prefilters
 * @returns {{ ns: string, label: string, options: { tag: string, label: string }[] }[]}
 */
function buildGroups(cards, labels, prefilters) {
  const locked = new Set(prefilters.map(namespaceOf));
  const byNs = new Map();
  cards.forEach((card) => card.tags.forEach((tag) => {
    const ns = namespaceOf(tag);
    if (!ns || locked.has(ns) || tag === `${ns}/`) return;
    if (!byNs.has(ns)) byNs.set(ns, new Set());
    byNs.get(ns).add(tag);
  }));
  const order = [...GROUP_ORDER.filter((ns) => byNs.has(ns)),
    ...[...byNs.keys()].filter((ns) => !GROUP_ORDER.includes(ns))];
  return order.map((ns) => ({
    ns,
    label: labels.get(ns) || labels.get(`${ns}#group`) || titleCase(ns),
    options: [...byNs.get(ns)]
      .map((tag) => ({ tag, label: labels.get(tag) || titleCase(tag.slice(ns.length + 1)) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }));
}

/** Inline "filters" (sliders) icon. */
function filterIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('inspiration-grid-filter-icon');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M1 4h7M12 4h3M1 12h3M8 12h7M10 2.25a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5ZM6 10.25a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.25');
  path.setAttribute('stroke-linecap', 'round');
  svg.append(path);
  return svg;
}

/**
 * Builds a "Filter" control button with an active-count badge.
 * @param {string} controlsId id of the tray it opens
 * @returns {HTMLButtonElement}
 */
function filterButton(controlsId) {
  return el(
    'button',
    {
      type: 'button',
      class: 'inspiration-grid-filter-button',
      'aria-haspopup': 'dialog',
      'aria-controls': controlsId,
    },
    filterIcon(),
    el('span', { class: 'inspiration-grid-filter-label' }, 'Filter'),
    el('span', { class: 'inspiration-grid-filter-badge', 'aria-hidden': 'true', hidden: '' }),
    el('span', { class: 'inspiration-grid-sr inspiration-grid-filter-sr' }),
  );
}

/**
 * Renders one card: image, headline, description and color swatches; the
 * whole card links to the inspiration page.
 * @param {Object} card
 * @returns {HTMLLIElement}
 */
function renderCard(card) {
  const link = el('a', { class: 'inspiration-grid-card', href: card.path });
  const media = el('div', { class: 'inspiration-grid-card-media' });
  if (card.image) {
    const picture = createOptimizedPicture(card.image, card.imageAlt, false, [
      { media: '(min-width: 1024px)', width: '750' },
      { width: '600' },
    ]);
    picture.querySelector('img')?.setAttribute('decoding', 'async');
    media.append(picture);
  }
  link.append(media);

  const body = el('div', { class: 'inspiration-grid-card-body' });
  if (card.headline) body.append(el('h3', { class: 'inspiration-grid-card-title' }, card.headline));
  if (card.description) body.append(el('p', { class: 'inspiration-grid-card-text' }, card.description));

  if (card.colors.length) {
    const swatches = el('ul', { class: 'inspiration-grid-swatches', 'aria-label': 'Colors in this room' });
    card.colors.forEach((color) => {
      const label = color.code && color.code !== color.name ? `${color.name} ${color.code}` : color.name;
      const swatch = el(
        'li',
        { class: 'inspiration-grid-swatch', 'data-name': color.name },
        el('span', { class: 'inspiration-grid-sr' }, label),
      );
      if (color.hex) swatch.style.setProperty('--inspiration-grid-swatch', color.hex);
      swatches.append(swatch);
    });
    body.append(swatches);
  }
  link.append(body);
  return el('li', { class: 'inspiration-grid-item' }, link);
}

/**
 * Inspiration Grid: filterable, data-driven grid of inspiration cards.
 * Content contract (key/value rows):
 *   sticky-title | Inspiration
 *   prefilters   | comma-separated tag keys (may be empty)
 *   source       | index URL (optional, default /inspiration/cards/query-index.json)
 *   tags         | tag sheet URL (optional, default /docs/library/tagging.json)
 * @param {Element} block
 */
export default function decorate(block) {
  const config = readBlockConfig(block);
  const title = configString(config['sticky-title']) || 'Inspiration';
  const prefilters = configString(config.prefilters).split(',').map((t) => t.trim()).filter(Boolean);
  const sourceUrl = configString(config.source) || DEFAULT_SOURCE;
  const tagsUrl = configString(config.tags) || DEFAULT_TAGS;

  instance += 1;
  const trayId = `inspiration-grid-tray-${instance}`;
  const trayTitleId = `${trayId}-title`;

  /* ---------- static shell ---------- */
  const heading = el('h2', { class: 'inspiration-grid-sr' }, title);
  const count = el('p', {
    class: 'inspiration-grid-count', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true',
  });
  const controlsButton = filterButton(trayId);
  const controls = el('div', { class: 'inspiration-grid-controls' }, count, controlsButton);

  const stickyButton = filterButton(trayId);
  const sticky = el(
    'div',
    { class: 'inspiration-grid-sticky', 'aria-hidden': 'true', inert: '' },
    el('div', { class: 'inspiration-grid-sticky-inner' }, el('p', { class: 'inspiration-grid-sticky-title' }, title), stickyButton),
  );

  const list = el('ul', { class: 'inspiration-grid-list' });
  const message = el('p', { class: 'inspiration-grid-message', hidden: '' });
  const moreButton = el('button', { type: 'button', class: 'button secondary inspiration-grid-more-button' }, 'Load more');
  const more = el('div', { class: 'inspiration-grid-more', hidden: '' }, moreButton);
  const skeleton = el('ul', { class: 'inspiration-grid-list inspiration-grid-skeleton', 'aria-hidden': 'true' });
  for (let i = 0; i < 6; i += 1) skeleton.append(el('li', { class: 'inspiration-grid-skeleton-card' }));

  /* ---------- filter tray (modal dialog) ---------- */
  const tray = el('dialog', { class: 'inspiration-grid-tray', id: trayId, 'aria-labelledby': trayTitleId });
  const closeButton = el('button', { type: 'button', class: 'inspiration-grid-tray-close', 'aria-label': 'Close filters' });
  const trayBody = el('div', { class: 'inspiration-grid-tray-body' });
  const clearButton = el('button', { type: 'button', class: 'button secondary inspiration-grid-tray-clear' }, 'Clear All');
  const applyButton = el('button', { type: 'button', class: 'button primary inspiration-grid-tray-apply' }, 'View results');
  tray.append(el(
    'div',
    { class: 'inspiration-grid-tray-panel' },
    el('div', { class: 'inspiration-grid-tray-header' }, el('h2', { class: 'inspiration-grid-tray-title', id: trayTitleId }, 'Filters'), closeButton),
    trayBody,
    el('div', { class: 'inspiration-grid-tray-footer' }, clearButton, applyButton),
  ));

  block.replaceChildren(heading, sticky, controls, skeleton, list, message, more, tray);
  controls.hidden = true;

  /* ---------- state ---------- */
  let cards = [];
  let groups = [];
  let active = [];
  let draft = [];
  let visible = PAGE_SIZE;
  let opener = controlsButton;

  const filtered = (tags) => cards.filter((card) => matches(card, tags));

  const updateBadges = () => {
    const n = active.length;
    [controlsButton, stickyButton].forEach((button) => {
      const badge = button.querySelector('.inspiration-grid-filter-badge');
      badge.textContent = n;
      badge.hidden = n === 0;
      button.querySelector('.inspiration-grid-filter-sr').textContent = n ? `, ${n} active` : '';
    });
  };

  const showMessage = (text) => {
    message.textContent = text;
    message.hidden = !text;
  };

  const render = (focusFrom = -1) => {
    const results = filtered(active);
    const shown = results.slice(0, visible);
    list.replaceChildren(...shown.map(renderCard));
    list.hidden = !shown.length;
    more.hidden = shown.length >= results.length;
    count.textContent = results.length
      ? `Displaying ${shown.length} of ${results.length} results` : '';
    showMessage(results.length ? '' : 'No results match your current filters');
    updateBadges();
    if (focusFrom >= 0) list.children[focusFrom]?.querySelector('a')?.focus();
  };

  /* ---------- tray ---------- */
  const updateTray = () => {
    trayBody.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      const tag = input.value;
      input.checked = draft.includes(tag);
      // cross-filtered count: the other groups' picks narrow it, this group's do not
      const others = draft.filter((t) => namespaceOf(t) !== namespaceOf(tag));
      const n = filtered(others).filter((card) => card.tags.includes(tag)).length;
      const option = input.closest('.inspiration-grid-option');
      option.querySelector('.inspiration-grid-option-count').textContent = `(${n})`;
      input.disabled = n <= 0 && !input.checked;
      option.classList.toggle('is-disabled', input.disabled);
    });
    const n = filtered(draft).length;
    applyButton.textContent = `View ${n} result${n === 1 ? '' : 's'}`;
    clearButton.disabled = draft.length === 0;
  };

  const buildTray = () => {
    trayBody.replaceChildren(...groups.map((group) => {
      const fieldset = el(
        'fieldset',
        { class: 'inspiration-grid-group', 'data-group': group.ns },
        el('legend', { class: 'inspiration-grid-group-title' }, group.label),
      );
      const options = el('div', { class: 'inspiration-grid-options' });
      group.options.forEach((option) => {
        const input = el('input', { type: 'checkbox', value: option.tag, class: 'inspiration-grid-option-input' });
        const label = el(
          'label',
          { class: 'inspiration-grid-option' },
          input,
          el('span', { class: 'inspiration-grid-option-label' }, option.label),
          el('span', { class: 'inspiration-grid-option-count' }),
        );
        if (group.ns === 'color') {
          const dot = COLOR_FAMILY_DOTS[option.tag.slice(6)];
          if (dot) {
            const swatch = el('span', { class: 'inspiration-grid-option-dot', 'aria-hidden': 'true' });
            swatch.style.setProperty('--inspiration-grid-swatch', dot);
            label.insertBefore(swatch, label.children[1]);
          }
        }
        options.append(label);
      });
      fieldset.append(options);
      return fieldset;
    }));
    if (!groups.length) trayBody.append(el('p', { class: 'inspiration-grid-tray-empty' }, 'No filters available.'));
  };

  trayBody.addEventListener('change', (e) => {
    const input = e.target.closest('input[type="checkbox"]');
    if (!input) return;
    draft = input.checked ? [...draft, input.value] : draft.filter((t) => t !== input.value);
    updateTray();
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let closeTimer;

  const closeTray = () => {
    if (!tray.open) return;
    tray.classList.remove('is-open');
    document.body.style.removeProperty('overflow');
    const finish = () => {
      clearTimeout(closeTimer);
      if (!tray.open) return;
      tray.close();
      const stickyShown = sticky.classList.contains('is-visible');
      const target = opener === stickyButton && !stickyShown ? controlsButton : opener;
      target.focus({ preventScroll: true });
    };
    if (reduced.matches) finish();
    else closeTimer = setTimeout(finish, 300);
  };

  const openTray = (from) => {
    if (tray.open) return;
    opener = from;
    draft = [...active];
    updateTray();
    clearTimeout(closeTimer);
    tray.showModal();
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => tray.classList.add('is-open'));
    closeButton.focus();
  };

  controlsButton.addEventListener('click', () => openTray(controlsButton));
  stickyButton.addEventListener('click', () => openTray(stickyButton));
  closeButton.addEventListener('click', closeTray);
  clearButton.addEventListener('click', () => {
    draft = [];
    updateTray();
  });
  applyButton.addEventListener('click', () => {
    active = [...draft];
    visible = PAGE_SIZE;
    render();
    closeTray();
    // bring the top of the results back into view after filtering from far down
    const header = document.querySelector('header');
    const offset = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    if (controls.getBoundingClientRect().top < offset) {
      const top = controls.getBoundingClientRect().top + window.scrollY - offset - 16;
      window.scrollTo({ top, behavior: reduced.matches ? 'auto' : 'smooth' });
    }
  });
  // Escape: discard the draft and close with the same animation
  tray.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeTray();
  });
  // click on the backdrop (outside the panel) closes the tray
  tray.addEventListener('click', (e) => {
    if (e.target === tray) closeTray();
  });
  // keep Tab focus cycling inside the tray
  tray.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const items = [...tray.querySelectorAll(FOCUSABLE)]
      .filter((node) => node.getClientRects().length > 0);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  moreButton.addEventListener('click', () => {
    const from = visible;
    visible += PAGE_SIZE;
    render(from);
  });

  /* ---------- sticky header: shown once the controls bar scrolls away ---------- */
  const header = document.querySelector('header');
  let ticking = false;
  const updateSticky = () => {
    ticking = false;
    if (controls.hidden) return;
    const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    const passed = controls.getBoundingClientRect().bottom < headerBottom;
    // hide again once only the block's bottom padding / last row edge is left on screen
    const end = block.getBoundingClientRect().bottom
      - parseFloat(getComputedStyle(block).paddingBottom || 0);
    const show = passed && end > headerBottom + sticky.offsetHeight + 80;
    sticky.style.setProperty('--inspiration-grid-sticky-top', `${headerBottom}px`);
    if (show === sticky.classList.contains('is-visible')) return;
    sticky.classList.toggle('is-visible', show);
    sticky.toggleAttribute('inert', !show);
    sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
  };
  const requestSticky = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateSticky);
  };
  window.addEventListener('scroll', requestSticky, { passive: true });
  window.addEventListener('resize', requestSticky, { passive: true });
  header?.addEventListener('transitionend', requestSticky);

  /* ---------- data (not awaited: the section shows the skeleton meanwhile) ---------- */
  const load = async () => {
    try {
      const base = new URL(sourceUrl, window.location.href).href;
      const [json, labels] = await Promise.all([fetchJson(base), loadTagLabels(tagsUrl)]);
      const rows = Array.isArray(json) ? json : json.data || [];
      const all = rows.map((row) => normalizeCard(row, base)).filter(Boolean);
      cards = sortCards(all.filter((card) => matches(card, prefilters)));
      groups = buildGroups(cards, labels, prefilters);
      buildTray();
      skeleton.remove();
      controls.hidden = false;
      render();
      requestSticky();
    } catch (error) {
    // eslint-disable-next-line no-console
      console.error('inspiration-grid: index unavailable', error);
      skeleton.remove();
      list.hidden = true;
      controls.hidden = true;
      block.classList.add('is-error');
      showMessage('Inspiration ideas can’t be loaded right now. Please try again later.');
    }
  };
  load();
}
