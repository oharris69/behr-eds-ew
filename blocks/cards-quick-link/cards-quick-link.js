import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Cards Quick Link: a vertical list of whole-row links.
 * Content contract, per row: one cell with a thumbnail picture, one cell with
 * an eyebrow paragraph, a heading and a link. The link's href is promoted to
 * the whole row; the link element itself is removed (no nested anchors).
 * Cells may be authored in any order or omitted.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-quick-link-item';

    const body = document.createElement('div');
    body.className = 'cards-quick-link-body';
    const media = document.createElement('div');
    media.className = 'cards-quick-link-image';

    [...row.children].forEach((cell) => {
      const picture = cell.querySelector('picture');
      if (picture && !cell.textContent.trim()) {
        if (!media.children.length) media.append(picture);
      } else {
        while (cell.firstChild) body.append(cell.firstChild);
      }
    });

    // promote the first link to the whole row
    const link = body.querySelector('a[href]');
    let card;
    if (link) {
      card = document.createElement('a');
      card.href = link.href;
      if (link.target) card.target = link.target;
      if (link.rel) card.rel = link.rel;
      const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
      const linkText = link.textContent.trim();
      if (linkText && (!heading || linkText !== heading.textContent.trim())) {
        card.title = link.title || linkText;
      }
      const holder = link.closest('p, li');
      if (holder && body.contains(holder) && holder.textContent.trim() === linkText) {
        holder.remove();
      } else {
        link.replaceWith(...link.childNodes);
      }
    } else {
      card = document.createElement('div');
    }
    card.className = 'cards-quick-link-card';

    body.querySelectorAll('p').forEach((p) => {
      if (!p.textContent.trim() && !p.children.length) p.remove();
    });

    const firstP = body.firstElementChild;
    if (firstP && firstP.tagName === 'P' && firstP.nextElementSibling?.matches('h1, h2, h3, h4, h5, h6')) {
      firstP.classList.add('cards-quick-link-eyebrow');
    }

    if (body.children.length || body.textContent.trim()) card.append(body);
    if (media.children.length) card.append(media);

    const arrow = document.createElement('span');
    arrow.className = 'cards-quick-link-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    card.append(arrow);

    li.append(card);
    ul.append(li);
  });

  ul.querySelectorAll('.cards-quick-link-image picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '600' }]));
  });

  block.replaceChildren(ul);
}
