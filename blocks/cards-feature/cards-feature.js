import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Cards Feature: stacked full-bleed panels.
 * Content contract, per row: one cell holding a background picture, one cell
 * holding heading / description / CTA. Cells may come in any order; a row
 * with no picture renders as a text-only panel, a row with no text renders
 * as an image-only panel.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-feature-card';

    const bg = document.createElement('div');
    bg.className = 'cards-feature-card-image';
    const body = document.createElement('div');
    body.className = 'cards-feature-card-body';

    [...row.children].forEach((cell) => {
      const pictures = cell.querySelectorAll('picture');
      const text = cell.textContent.trim();
      if (pictures.length && !text) {
        // image-only cell: only the first picture is used as the background
        if (!bg.children.length) bg.append(pictures[0]);
      } else {
        while (cell.firstChild) body.append(cell.firstChild);
      }
    });

    // a picture authored inside the text cell becomes the background if none exists
    if (!bg.children.length) {
      const stray = body.querySelector('picture');
      if (stray) {
        const holder = stray.parentElement;
        bg.append(stray);
        const emptyHolder = !holder.textContent.trim() && !holder.children.length;
        if (holder !== body && emptyHolder) holder.remove();
      }
    }

    if (bg.children.length) {
      li.append(bg);
      li.classList.add('cards-feature-card-has-image');
    }
    // a paragraph holding nothing but one link is the panel CTA (pill button)
    [...body.children].forEach((el) => {
      const link = el.querySelector('a');
      if (el.tagName === 'P' && link && el.querySelectorAll('a').length === 1
        && el.textContent.trim() === link.textContent.trim()) {
        el.classList.add('cards-feature-card-cta');
      }
    });

    if (body.textContent.trim() || body.children.length) {
      const inner = document.createElement('div');
      inner.className = 'cards-feature-card-inner';
      inner.append(body);
      li.append(inner);
    }
    if (li.children.length) ul.append(li);
  });

  ul.querySelectorAll('.cards-feature-card-image picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '750' },
    ]));
  });

  block.replaceChildren(ul);
}
