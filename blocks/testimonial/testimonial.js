import { toClassName, createOptimizedPicture } from '../../scripts/aem.js';
import { applyPageColor, getPageColor } from '../../scripts/color-theme.js';

/**
 * Reads the key/value rows into { key: valueCell }. A row with a single cell
 * (key missing) is kept by shape: a picture is the avatar, text the quote.
 * @param {Element} block
 * @returns {Object<string, Element>}
 */
function readConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      const key = toClassName(cells[0].textContent);
      if (key && !config[key]) [, config[key]] = cells;
    } else if (cells.length === 1) {
      const [cell] = cells;
      if (cell.querySelector('picture, img')) {
        if (!config['attributor-image']) config['attributor-image'] = cell;
      } else if (cell.textContent.trim() && !config.description) {
        config.description = cell;
      }
    }
  });
  return config;
}

/**
 * @param {Element|undefined} cell
 * @returns {string}
 */
const text = (cell) => (cell ? cell.textContent.trim() : '');

/**
 * @param {string} tag
 * @param {string} className
 * @param {string} [content]
 * @returns {HTMLElement}
 */
function el(tag, className, content) {
  const node = document.createElement(tag);
  node.className = className;
  if (content) node.textContent = content;
  return node;
}

/**
 * Testimonial: a quote on the page color. Left: eyebrow + the page color's
 * name and code (page metadata). Right: big quote + attributor avatar, name
 * and description. Rows are key/value pairs; any of them may be missing.
 * @param {Element} block
 */
export default function decorate(block) {
  const config = readConfig(block);
  const color = getPageColor();
  if (!applyPageColor(block)) block.classList.add('testimonial-no-color');

  block.textContent = '';

  // left column: eyebrow + color name / code
  const info = el('div', 'testimonial-color');
  const eyebrow = text(config.eyebrow);
  if (eyebrow) info.append(el('p', 'testimonial-eyebrow', eyebrow));
  if (color && color.name) info.append(el('p', 'testimonial-color-name', color.name));
  if (color && color.code) info.append(el('p', 'testimonial-color-code', color.code));

  // right column: quote + attribution
  const content = el('figure', 'testimonial-content');
  const { description } = config;
  if (description && description.textContent.trim()) {
    const blockquote = el('blockquote', 'testimonial-quote');
    if (description.querySelector('p')) blockquote.append(...description.childNodes);
    else {
      const p = document.createElement('p');
      p.append(...description.childNodes);
      blockquote.append(p);
    }
    content.append(blockquote);
  }

  const name = text(config['attributor-name']);
  const role = text(config['attributor-description']);
  const img = config['attributor-image'] && config['attributor-image'].querySelector('img');
  if (name || role || img) {
    const attribution = el('figcaption', 'testimonial-attribution');
    if (img) {
      const avatar = el('div', 'testimonial-avatar');
      avatar.append(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '160' }]));
      attribution.append(avatar);
    }
    const who = el('p', 'testimonial-attributor');
    if (name) who.append(el('span', 'testimonial-attributor-name', name));
    if (role) who.append(el('span', 'testimonial-attributor-description', role));
    if (who.childElementCount) attribution.append(who);
    content.append(attribution);
  }

  if (info.childElementCount) block.append(info);
  if (content.childElementCount) block.append(content);
}
