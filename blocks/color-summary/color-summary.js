import { getMetadata } from '../../scripts/aem.js';
import { applyPageColor, getPageColor } from '../../scripts/color-theme.js';
import { isInProject, toggleProjectColor, PROJECTS_CHANGE_EVENT } from '../../scripts/projects.js';
import { loadFragment } from '../fragment/fragment.js';

/* UI strings and fragment paths (not authored per page) */
const LABELS = {
  whatYoullLove: "What you'll love",
  colorInfo: 'Color information',
  whyBehr: 'Why Behr paint?',
  lrv: 'LRV',
  lrvTitle: 'Light Reflectance Value',
  lrvDescription: 'LRV (Light Reflectance Value) indicates how much light a color reflects, on a scale of 0 (black) to 100 (white).',
  rgb: 'RGB',
  rgbDescription: 'RGB (Red, Green, Blue) is a digital formula that defines colors on screens and ensures accurate color matching for online design, mockups, and branding.',
  hex: 'HEX',
  hexDescription: 'A hex is a six-character color code like #RRGGBB that defines colors precisely by combining red, green, and blue values.',
  red: 'R',
  green: 'G',
  blue: 'B',
  moreInfo: 'More information about',
  addToProject: 'Add to project',
  addedToProject: 'Added to project',
};
const WHAT_YOULL_LOVE_FRAGMENT = '/fragments/color-details/premium-color-detail/color-summary-what-youll-love';
const WHY_BEHR_FRAGMENT = '/fragments/color-details/why-behr-paint';
const DESKTOP = '(width >= 1024px)';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_PATHS = {
  plus: ['M12 4v16', 'M20 12H4'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  chevron: ['M5.6 9.6l6.4 6.4 6.4-6.4'],
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
  svg.classList.add('color-summary-icon', `color-summary-icon-${name}`);
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

/**
 * @param {string} name icon file name in /icons
 * @returns {string}
 */
const iconUrl = (name) => `${window.hlx?.codeBasePath || ''}/icons/${name}.svg`;

/**
 * Icon drawn as a currentcolor mask so it follows the block's light/dark theme.
 * @param {string} src
 * @param {string} className
 * @returns {HTMLElement}
 */
function maskIcon(src, className) {
  const span = el('span', `color-summary-mask ${className}`);
  span.setAttribute('aria-hidden', 'true');
  span.style.setProperty('--color-summary-mask', `url("${src}")`);
  return span;
}

/**
 * Re-renders an authored `:name:` icon span (white-stroke SVG) as a themed mask.
 * @param {Element} span
 * @returns {HTMLElement|null}
 */
function themedIcon(span) {
  const name = [...span.classList].find((c) => c.startsWith('icon-'))?.slice(5);
  const src = span.querySelector('img')?.src || (name && iconUrl(name));
  return src ? maskIcon(src, 'color-summary-feature-icon') : null;
}

const HOVER_CLOSE_DELAY = 150;
const openTips = new Set();
let tipCount = 0;

/**
 * Info tooltip: [icon?] [label] [info button] with a card that overlays the row.
 * Hover / keyboard focus previews the card, click / tap pins it (the button turns into a
 * close icon), and Escape, an outside click or moving focus away closes it.
 * @param {object} options
 * @param {HTMLElement} options.label trigger label (moved into the tooltip)
 * @param {HTMLElement|null} [options.icon] decorative trigger icon
 * @param {string} options.title card title
 * @param {{ title: string, text: Node[], icon?: HTMLElement|null }[]} options.items
 * @returns {HTMLElement}
 */
function buildTooltip({
  label, icon: leadIcon = null, title, items,
}) {
  tipCount += 1;
  const tip = el('div', 'color-summary-tip');
  if (leadIcon) tip.classList.add('color-summary-tip-has-icon');
  tip.dataset.state = 'closed';
  tip.dataset.pinned = 'false';

  const card = el('div', 'color-summary-tip-card');
  card.id = `color-summary-tip-${tipCount}`;
  card.setAttribute('role', 'tooltip');
  const list = el('div', 'color-summary-tip-items');
  items.forEach((item) => {
    const row = el('div', 'color-summary-tip-item');
    const text = el('div', 'color-summary-tip-text');
    text.append(...item.text);
    row.append(...[item.icon, el('p', 'color-summary-tip-item-title', item.title), text]
      .filter(Boolean));
    list.append(row);
  });
  const body = el('div', 'color-summary-tip-body');
  body.append(list);
  card.append(el('p', 'color-summary-tip-title', title), body);

  const toggle = el('button', 'color-summary-tip-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-describedby', card.id);
  toggle.setAttribute('aria-label', `${LABELS.moreInfo} ${label.textContent.trim()}`);
  toggle.append(
    maskIcon(iconUrl('info'), 'color-summary-tip-info'),
    maskIcon(iconUrl('close'), 'color-summary-tip-close'),
  );

  let closeTimer;
  const setPinned = (pinned) => { tip.dataset.pinned = String(pinned); };
  const isPinned = () => tip.dataset.pinned === 'true';
  /* eslint-disable no-use-before-define */
  const onKeydown = (e) => { if (e.key === 'Escape') close(); };
  const onPointerdown = (e) => { if (!tip.contains(e.target)) close(); };
  /* eslint-enable no-use-before-define */

  function close() {
    clearTimeout(closeTimer);
    setPinned(false);
    if (tip.dataset.state !== 'open') return;
    tip.dataset.state = 'closed';
    toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('pointerdown', onPointerdown);
    openTips.delete(close);
  }

  function open(pinned) {
    clearTimeout(closeTimer);
    setPinned(pinned);
    if (tip.dataset.state === 'open') return;
    openTips.forEach((closeOther) => closeOther());
    tip.dataset.state = 'open';
    toggle.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('pointerdown', onPointerdown);
    openTips.add(close);
  }

  toggle.addEventListener('click', () => (isPinned() ? close() : open(true)));
  toggle.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') open(isPinned());
  });
  toggle.addEventListener('focus', () => {
    if (toggle.matches(':focus-visible')) open(isPinned());
  });
  tip.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  tip.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse' || isPinned() || toggle.matches(':focus-visible')) return;
    closeTimer = setTimeout(close, HOVER_CLOSE_DELAY);
  });
  tip.addEventListener('focusout', (e) => {
    if (!tip.contains(e.relatedTarget)) close();
  });

  leadIcon?.classList.add('color-summary-tip-icon');
  tip.append(...[leadIcon, label, toggle, card].filter(Boolean));
  return tip;
}

/**
 * Accepts a site path or a full URL and returns the path loadFragment expects.
 * @param {string} value
 * @returns {string|null}
 */
function toFragmentPath(value) {
  const raw = (value || '').trim();
  if (!raw) return null;
  try {
    return new URL(raw, window.location.origin).pathname.replace(/\.(plain\.)?html$/, '');
  } catch {
    return null;
  }
}

/**
 * @param {string} path
 * @returns {Promise<Element[]>} the fragment's default content elements
 */
async function fragmentContent(path) {
  try {
    const fragment = await loadFragment(path);
    if (!fragment) return [];
    return [...fragment.querySelectorAll(':scope > .section > div')]
      .flatMap((wrapper) => [...wrapper.children]);
  } catch {
    return [];
  }
}

/**
 * Column with an h3 title.
 * @param {string} modifier
 * @param {string} title
 * @returns {{ col: HTMLElement, heading: HTMLElement }}
 */
function buildColumn(modifier, title) {
  const col = el('div', `color-summary-col color-summary-${modifier}`);
  const heading = el('h3', 'color-summary-col-title', title);
  col.append(heading);
  return { col, heading };
}

/**
 * One "What you'll love" item. Authored as `:icon: Label` with an optional nested list
 * whose items become the info tooltip text (icon and nested list are both optional).
 * @param {Element} source li, p or cell
 * @returns {HTMLElement|null}
 */
function buildFeature(source) {
  const nested = [...source.querySelectorAll(':scope > ul, :scope > ol')];
  const tipText = nested
    .flatMap((list) => [...list.querySelectorAll(':scope > li')])
    .filter((item) => item.textContent.trim())
    .map((item) => {
      const p = el('p');
      p.append(...item.childNodes);
      return p;
    });
  nested.forEach((list) => list.remove());

  const iconSpan = source.querySelector(':scope > .icon');
  const featureIcon = iconSpan ? themedIcon(iconSpan) : null;
  iconSpan?.remove();

  const label = el('span', 'color-summary-feature-label');
  label.append(...source.childNodes);
  const first = label.firstChild;
  const last = label.lastChild;
  if (first?.nodeType === Node.TEXT_NODE) first.textContent = first.textContent.trimStart();
  if (last?.nodeType === Node.TEXT_NODE) last.textContent = last.textContent.trimEnd();
  if (!label.textContent.trim() && !label.querySelector('img, picture')) return null;

  const li = el('li', 'color-summary-feature');
  if (tipText.length) {
    const itemIcon = featureIcon?.cloneNode(true);
    itemIcon?.classList.add('color-summary-tip-item-icon');
    li.append(buildTooltip({
      label,
      icon: featureIcon,
      title: LABELS.whatYoullLove,
      items: [{ icon: itemIcon, title: label.textContent.trim(), text: tipText }],
    }));
  } else {
    li.append(...[featureIcon, label].filter(Boolean));
  }
  return li;
}

/**
 * "What you'll love": authored items first, then the shared fragment items.
 * @param {Element[]} authoredRows rows after the statement row
 * @returns {Promise<HTMLElement>}
 */
async function buildFeatures(authoredRows) {
  const { col } = buildColumn('features', LABELS.whatYoullLove);
  const list = el('ul', 'color-summary-features-list');

  const addItem = (source) => {
    const li = buildFeature(source);
    if (li) list.append(li);
  };

  authoredRows.forEach((row) => {
    // top-level items only: nested lists hold tooltip text
    const items = [...row.querySelectorAll('li')].filter((li) => !li.parentElement.closest('li'));
    if (items.length) items.forEach(addItem);
    else {
      row.querySelectorAll(':scope > div').forEach((cell) => {
        const paras = cell.querySelectorAll('p');
        if (paras.length) paras.forEach(addItem);
        else addItem(cell);
      });
    }
  });

  const common = await fragmentContent(WHAT_YOULL_LOVE_FRAGMENT);
  common.forEach((node) => {
    const items = node.matches('ul, ol') ? node.querySelectorAll(':scope > li') : [];
    if (items.length) items.forEach(addItem);
    else if (node.matches('p')) addItem(node);
  });

  if (list.children.length) col.append(list);
  return col;
}

/**
 * "Color information": LRV, RGB and HEX of the page color.
 * @param {ReturnType<typeof getPageColor>} color
 * @returns {HTMLElement|null}
 */
function buildColorInfo(color) {
  if (!color) return null;
  const { col, heading } = buildColumn('info', LABELS.colorInfo);
  col.prepend(buildTooltip({
    label: heading,
    title: LABELS.colorInfo,
    items: [
      [LABELS.lrv, LABELS.lrvDescription],
      [LABELS.rgb, LABELS.rgbDescription],
      [LABELS.hex, LABELS.hexDescription],
    ].map(([title, text]) => ({ title, text: [el('p', '', text)] })),
  }));
  const data = el('dl', 'color-summary-data');

  const addRow = (modifier, pairs) => {
    const row = el('div', `color-summary-data-row color-summary-data-${modifier}`);
    pairs.forEach(([term, value, title]) => {
      const dt = el('dt');
      if (title) {
        const abbr = el('abbr', '', term);
        abbr.title = title;
        dt.append(abbr);
      } else dt.textContent = term;
      row.append(dt, el('dd', '', String(value)));
    });
    data.append(row);
  };

  if (color.lrv) addRow('lrv', [[LABELS.lrv, color.lrv, LABELS.lrvTitle]]);
  if (color.rgb) {
    const [r, g, b] = color.rgb;
    addRow('rgb', [[LABELS.red, r], [LABELS.green, g], [LABELS.blue, b]]);
    data.lastElementChild.setAttribute('aria-label', LABELS.rgb);
  }
  addRow('hex', [[LABELS.hex, color.hex.replace('#', '').toUpperCase()]]);

  col.append(data);
  return col;
}

/**
 * "Why Behr paint?": fragment copy, an accordion below the desktop breakpoint.
 * @param {HTMLElement} block
 * @returns {Promise<HTMLElement|null>}
 */
async function buildWhyBehr(block) {
  const path = toFragmentPath(getMetadata('color-detail-description-fragment')) || WHY_BEHR_FRAGMENT;
  const content = await fragmentContent(path);
  if (!content.length) return null;

  const { col, heading } = buildColumn('why', '');
  const panelId = `color-summary-why-${[...document.querySelectorAll('.color-summary')].indexOf(block)}`;
  const toggle = el('button', 'color-summary-why-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', panelId);
  toggle.append(el('span', '', LABELS.whyBehr), icon('chevron'));
  heading.append(toggle);

  const panel = el('div', 'color-summary-why-panel');
  panel.id = panelId;
  panel.append(...content);
  col.append(panel);

  const desktop = window.matchMedia(DESKTOP);
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  };
  const onBreakpoint = () => {
    toggle.disabled = desktop.matches;
    setOpen(desktop.matches);
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  desktop.addEventListener('change', onBreakpoint);
  onBreakpoint();
  return col;
}

/**
 * "Add to project" pill bound to My Projects.
 * @param {ReturnType<typeof getPageColor>} pageColor
 * @returns {HTMLElement|null}
 */
function buildCta(pageColor) {
  const color = {
    code: pageColor?.code || getMetadata('color-code'),
    name: pageColor?.name || getMetadata('color-name'),
    hex: pageColor?.hex,
  };
  if (!color.code) return null;

  const wrapper = el('div', 'color-summary-cta');
  const button = el('button', 'button color-summary-project');
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
  wrapper.append(button);
  return wrapper;
}

/**
 * Color summary: rows = [eyebrow p + h2 statement] / [optional "What you'll love" items].
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const pageColor = getPageColor();
  applyPageColor(block);

  const rows = [...block.children];
  const statementRow = rows.find((row) => row.querySelector('h1, h2, h3, h4, h5, h6'))
    || rows.find((row) => row.textContent.trim());
  const otherRows = rows.filter((row) => row !== statementRow && row.textContent.trim());

  const headline = el('div', 'color-summary-headline');
  if (statementRow) {
    const heading = statementRow.querySelector('h1, h2, h3, h4, h5, h6');
    let beforeHeading = Boolean(heading);
    statementRow.querySelectorAll(':scope > div').forEach((cell) => {
      [...cell.children].forEach((child) => {
        if (child === heading) {
          child.classList.add('color-summary-statement');
          beforeHeading = false;
        } else if (beforeHeading) child.classList.add('color-summary-eyebrow');
        headline.append(child);
      });
    });
    if (heading && heading.tagName !== 'H2') {
      const h2 = el('h2', 'color-summary-statement');
      h2.id = heading.id;
      h2.append(...heading.childNodes);
      heading.replaceWith(h2);
    }
  }

  const [features, why] = await Promise.all([buildFeatures(otherRows), buildWhyBehr(block)]);
  const columns = el('div', 'color-summary-columns');
  columns.append(...[features, buildColorInfo(pageColor), why].filter(Boolean));

  const parts = [columns, buildCta(pageColor)].filter(Boolean);
  if (headline.children.length) parts.unshift(headline);
  block.replaceChildren(...parts);
}
