import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Returns true when a paragraph holds exactly one link and nothing else.
 * @param {Element} el
 * @returns {boolean}
 */
function isLinkOnly(el) {
  if (el.tagName !== 'P') return false;
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && !el.querySelector('picture')
    && el.textContent.trim() === links[0].textContent.trim();
}

/**
 * Columns Split: edge-to-edge image beside a tinted text panel.
 * Content contract: 1 row, 2 cells [picture] | [h2 (leading <em> word),
 * paragraphs, CTA link]. Cells may be swapped (the image side follows the
 * authored order), merged into one cell, or omitted. Extra rows are each
 * rendered as their own split.
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children].map((row) => {
    const media = document.createElement('div');
    media.className = 'columns-split-image';
    const panel = document.createElement('div');
    panel.className = 'columns-split-panel';
    const body = document.createElement('div');
    body.className = 'columns-split-body';
    panel.append(body);

    let imageFirst = true;
    let seenText = false;
    [...row.children].forEach((cell) => {
      const picture = cell.querySelector('picture');
      if (picture && !media.children.length) {
        if (seenText) imageFirst = false;
        const holder = picture.parentElement;
        media.append(picture);
        const empty = !holder.textContent.trim() && !holder.children.length;
        if (holder !== cell && empty) holder.remove();
      }
      [...cell.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (!node.textContent.trim()) return;
          const p = document.createElement('p');
          p.textContent = node.textContent.trim();
          body.append(p);
          seenText = true;
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (!node.textContent.trim() && !node.querySelector('img, picture')) return;
        body.append(node);
        seenText = true;
      });
    });

    const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      heading.classList.add('columns-split-title');
      heading.querySelectorAll('em').forEach((em) => em.classList.add('columns-split-script'));
    }
    [...body.children].forEach((el) => {
      if (!isLinkOnly(el)) return;
      el.classList.add('columns-split-cta');
      const a = el.querySelector('a');
      if (!a.classList.contains('button')) {
        el.classList.add('button-wrapper');
        a.classList.add('button', 'primary');
      }
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'columns-split-row';
    if (!imageFirst) wrapper.classList.add('columns-split-image-end');
    if (media.children.length) wrapper.append(media);
    else wrapper.classList.add('columns-split-no-image');
    if (body.children.length) wrapper.append(panel);
    return wrapper.children.length ? wrapper : null;
  }).filter(Boolean);

  rows.forEach((row) => {
    row.querySelectorAll('.columns-split-image picture > img').forEach((img) => {
      img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [
        { media: '(min-width: 768px)', width: '1200' },
        { width: '750' },
      ]));
    });
  });

  block.replaceChildren(...rows);
}
