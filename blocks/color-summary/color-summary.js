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
  rgb: 'RGB',
  hex: 'HEX',
  red: 'R',
  green: 'G',
  blue: 'B',
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
 * "What you'll love": authored items first, then the shared fragment items.
 * @param {Element[]} authoredRows rows after the statement row
 * @returns {Promise<HTMLElement>}
 */
async function buildFeatures(authoredRows) {
  const { col } = buildColumn('features', LABELS.whatYoullLove);
  const list = el('ul', 'color-summary-features-list');

  const addItem = (source) => {
    const li = el('li', 'color-summary-feature');
    li.append(...source.childNodes);
    if (li.textContent.trim() || li.querySelector('img, picture')) list.append(li);
  };

  authoredRows.forEach((row) => {
    const items = row.querySelectorAll('li');
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
  const { col } = buildColumn('info', LABELS.colorInfo);
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
