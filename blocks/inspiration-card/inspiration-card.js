import { normalizeHex, getColorTheme } from '../../scripts/color-theme.js';
import { isInProject, toggleProjectColor, PROJECTS_CHANGE_EVENT } from '../../scripts/projects.js';

/* UI strings (not authored) */
const LABELS = {
  addPalette: 'Add palette to project',
  paletteAdded: 'Palette added',
  viewColor: 'View {name} color',
  viewColorFor: 'View {name} color for {placement}',
  paletteSaved: 'Palette added to your project',
  paletteRemoved: 'Palette removed from your project',
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_PATHS = {
  plus: ['M12 4v16', 'M20 12H4'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
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
  svg.classList.add('inspiration-card-icon');
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
 * Color code from a color detail URL, e.g. /colors/color-detail/n200-3 -> N200-3.
 * @param {string} href
 * @returns {string}
 */
function codeFromHref(href) {
  try {
    const { pathname } = new URL(href, window.location.href);
    if (!/\/color-detail\//.test(pathname)) return '';
    const slug = pathname.split('/').filter(Boolean).pop() || '';
    return slug.toUpperCase();
  } catch {
    return '';
  }
}

/**
 * Parses one authored color item: a link "CODE|Name|HEX" (text, else title) + placement text.
 * Falls back to the link text when the link is not in that form.
 * @param {HTMLLIElement} li
 * @returns {{ code: string, name: string, hex: string|null, placement: string,
 *   href: string }|null}
 */
function parseColorItem(li) {
  const a = li.querySelector('a[href]');
  const text = li.textContent.replace(/\s+/g, ' ').trim();
  if (!a && !text) return null;

  let color = null;
  if (a) {
    [a.textContent, a.title].some((candidate) => {
      const parts = String(candidate || '').split('|').map((p) => p.trim());
      if (parts.length !== 3 || !parts[0] || !parts[1]) return false;
      color = { code: parts[0], name: parts[1], hex: normalizeHex(parts[2]) };
      return true;
    });
  }

  const linkText = a ? a.textContent.replace(/\s+/g, ' ').trim() : '';
  const placement = (a ? text.replace(linkText, '') : '').trim();
  if (!color) {
    color = {
      code: a ? codeFromHref(a.getAttribute('href')) : '',
      name: linkText || text,
      hex: null,
    };
  }
  return { ...color, placement, href: a ? a.getAttribute('href') : '' };
}

/**
 * @param {ReturnType<typeof parseColorItem>} color
 * @returns {HTMLLIElement}
 */
function buildColorRow(color) {
  const li = el('li', 'inspiration-card-color');
  const row = el(color.href ? 'a' : 'div', 'inspiration-card-color-row');
  if (color.href) {
    row.href = color.href;
    row.setAttribute('aria-label', (color.placement ? LABELS.viewColorFor : LABELS.viewColor)
      .replace('{name}', color.name)
      .replace('{placement}', color.placement));
  }

  const swatch = el('span', 'inspiration-card-swatch');
  swatch.setAttribute('aria-hidden', 'true');
  if (color.hex) {
    swatch.style.setProperty('--swatch-color', color.hex);
    swatch.classList.add(`color-theme-${getColorTheme(color.hex)}`);
  } else {
    swatch.classList.add('inspiration-card-swatch-empty');
  }

  const text = el('span', 'inspiration-card-color-text');
  text.append(el('span', 'inspiration-card-color-name', color.name));
  if (color.placement) text.append(el('span', 'inspiration-card-color-placement', color.placement));

  row.append(swatch, text);
  li.append(row);
  return li;
}

/**
 * "Add palette to project" pill: adds every color of the card; when all are saved,
 * a click removes them again. Stays in sync with My Projects via PROJECTS_CHANGE_EVENT.
 * @param {{ code: string, name: string, hex: string|null }[]} colors
 * @returns {HTMLDivElement}
 */
function buildPaletteButton(colors) {
  const wrapper = el('div', 'inspiration-card-actions');
  const button = el('button', 'button primary inspiration-card-palette');
  button.type = 'button';
  const live = el('span', 'inspiration-card-live');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');

  const allSaved = () => colors.every((c) => isInProject(c.code));
  const sync = () => {
    const saved = allSaved();
    button.setAttribute('aria-pressed', String(saved));
    button.replaceChildren(
      el('span', 'inspiration-card-palette-label', saved ? LABELS.paletteAdded : LABELS.addPalette),
      icon(saved ? 'check' : 'plus'),
    );
  };

  button.addEventListener('click', () => {
    const removing = allSaved();
    colors.forEach((c) => {
      // toggle only the colors that need to change state
      if (isInProject(c.code) === removing) {
        toggleProjectColor({ code: c.code, name: c.name, hex: c.hex || undefined });
      }
    });
    sync();
    live.textContent = removing ? LABELS.paletteRemoved : LABELS.paletteSaved;
  });
  window.addEventListener(PROJECTS_CHANGE_EVENT, sync);
  sync();

  wrapper.append(button, live);
  return wrapper;
}

/**
 * Inspiration card: row 1 = [h1 + description]; row 2 = [room picture | list of colors].
 * Rows and cells are located by content, so missing/extra cells don't break the layout.
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const picture = block.querySelector('picture');
  const list = block.querySelector('ul, ol');

  // text: everything that isn't the picture or the color list
  const content = el('div', 'inspiration-card-content');
  const intro = el('div', 'inspiration-card-intro');
  cells.forEach((cell) => {
    if (picture && cell.contains(picture)) return;
    if (list && cell.contains(list)) return;
    [...cell.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return;
      intro.append(node);
    });
  });
  const heading = intro.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) heading.classList.add('inspiration-card-title');
  intro.querySelectorAll('p').forEach((p) => {
    if (!p.textContent.replace(/[\s\u200b]/g, '') && !p.querySelector('img, a')) p.remove();
    else if (!p.classList.contains('button-wrapper')) p.classList.add('inspiration-card-description');
  });
  if (intro.children.length) content.append(intro);

  // colors
  const colors = list
    ? [...list.querySelectorAll(':scope > li')].map(parseColorItem).filter(Boolean)
    : [];
  if (colors.length) {
    const colorList = el('ul', 'inspiration-card-colors');
    colors.forEach((color) => colorList.append(buildColorRow(color)));
    content.append(colorList);
    const projectColors = colors.filter((c) => c.code);
    if (projectColors.length) content.append(buildPaletteButton(projectColors));
  }

  // media: the room photo is the LCP image
  const media = el('div', 'inspiration-card-media');
  if (picture) {
    const img = picture.querySelector('img');
    if (img) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
    media.append(picture);
  }

  // content first in reading order; CSS shows the photo first on small screens
  block.replaceChildren(...[content, media].filter((part) => part.children.length));
  if (!picture) block.classList.add('inspiration-card-no-media');
}
