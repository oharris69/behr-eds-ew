import { toClassName } from '../../scripts/aem.js';
import { normalizeHex, getColorTheme } from '../../scripts/color-theme.js';

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
 * Builds one swatch card for a color link (or a plain link card when the
 * text isn't in code|name|hex form).
 * @param {HTMLAnchorElement} a
 * @returns {HTMLLIElement}
 */
function buildSwatch(a) {
  const li = document.createElement('li');
  li.className = 'color-collection-item';
  const color = parseColorLink(a);
  const link = document.createElement('a');
  link.href = a.getAttribute('href');
  link.className = 'color-collection-swatch';

  if (!color) {
    li.classList.add('color-collection-item-plain');
    link.textContent = a.textContent.trim() || link.href;
    li.append(link);
    return li;
  }

  link.style.setProperty('--swatch-color', color.hex);
  link.classList.add(`color-theme-${getColorTheme(color.hex)}`);
  link.title = `${color.name} ${color.code}`;
  link.dataset.code = color.code;
  const name = document.createElement('span');
  name.className = 'color-collection-name';
  name.textContent = color.name;
  const code = document.createElement('span');
  code.className = 'color-collection-code';
  code.textContent = color.code;
  link.append(name, code);
  li.append(link);
  return li;
}

/**
 * Color collection: a heading row and a row with a list of color links
 * ("CODE|Name|HEX") rendered as a grid of linked paint swatches.
 * @param {Element} block
 */
export default function decorate(block) {
  // section-metadata "id" (e.g. trends) makes the section an anchor target
  const section = block.closest('.section');
  if (section && section.dataset.id && !section.id) section.id = toClassName(section.dataset.id);

  const rows = [...block.children];
  const header = document.createElement('div');
  header.className = 'color-collection-header';
  const links = [];

  rows.forEach((row) => {
    const rowLinks = [...row.querySelectorAll('a[href]')];
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      // heading row: keep all of its content (heading and any intro text)
      [...row.children].forEach((cell) => header.append(...cell.childNodes));
    } else if (rowLinks.length) {
      links.push(...rowLinks);
    } else if (row.textContent.trim()) {
      [...row.children].forEach((cell) => {
        if (!cell.textContent.trim()) return;
        if (cell.querySelector('p')) header.append(...cell.childNodes);
        else {
          const p = document.createElement('p');
          p.append(...cell.childNodes);
          header.append(p);
        }
      });
    }
  });

  block.textContent = '';
  if (header.textContent.trim()) block.append(header);
  if (!links.length) return;

  const list = document.createElement('ul');
  list.className = 'color-collection-list';
  const colorCount = links.filter((a) => parseColorLink(a)).length;
  if (!colorCount) list.classList.add('color-collection-list-plain');
  links.forEach((a) => list.append(buildSwatch(a)));
  block.append(list);
}
