/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: sections for pages whose source is itself an Edge Delivery site.
 * The snapshot (migration-work/tools/eds-snapshot.js) is the authored .plain.html, so every
 * `main > div` already is a section: a break goes before each one. Sections holding a block
 * that sits on a light band on behr.com get Section Metadata `style: light` (the source
 * blocks paint that band themselves; ours use the section style).
 * Also removes the data stores the snapshot tools add for parsers (#eds-color-collections,
 * #eds-color-api) once parsing is done.
 */
const STYLE_BY_BLOCK = {
  'color-collection': 'light',
  'fifty-fifty': 'light',
  'image-cards': 'light',
};
const MARKER = 'data-eds-section-style';
const STORES = ['#eds-color-collections', '#eds-color-api'];

function styleFor(section) {
  const block = [...section.querySelectorAll(':scope > div[class]')]
    .find((el) => STYLE_BY_BLOCK[el.classList[0]]);
  return block ? STYLE_BY_BLOCK[block.classList[0]] : null;
}

export default function transform(hookName, element, payload) {
  const main = element.querySelector('main') || element;

  if (hookName === 'beforeTransform') {
    const sections = [...main.children].filter((el) => el.tagName === 'DIV' && !el.id.startsWith('eds-'));
    // an empty trailing <div> in the authored source is not a section
    const empty = (el) => !el.textContent.trim() && !el.querySelector('img, picture, video, iframe');
    sections.filter(empty).forEach((el) => el.remove());
    const authored = sections.filter((el) => el.isConnected);
    authored.forEach((section, i) => {
      const style = styleFor(section);
      if (i === 0 && !style) return; // first section: no break, no metadata
      const hr = document.createElement('hr');
      if (style) hr.setAttribute(MARKER, style);
      section.before(hr);
    });
  }

  if (hookName === 'afterTransform') {
    main.querySelectorAll(`hr[${MARKER}]`).forEach((hr, i) => {
      const metadata = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: hr.getAttribute(MARKER) },
      });
      hr.after(metadata);
      hr.removeAttribute(MARKER);
      // a styled first section has no break before it
      if (!hr.previousElementSibling) hr.remove();
    });
    STORES.forEach((sel) => main.querySelectorAll(sel).forEach((el) => el.remove()));
  }
}
