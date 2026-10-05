/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-quick-link. Base: cards. Source: https://www.behr.com/
 * Generated: 2026-09-30
 *
 * Source: .quick-link-list.block > ul.quick-link-list__items > li.quick-link-list__item (x3)
 *   each li > a.quick-link-list__card[href] wrapping:
 *     p.quick-link-list__card-eyebrow  -> eyebrow
 *     h2.quick-link-list__card-headline -> title
 *     picture.quick-link-list__card-image -> thumbnail
 *
 * Iteration is keyed on the block-level <li> wrappers, NOT the card anchors:
 * the anchors wrap block content and html2md preprocessing can merge adjacent
 * inline siblings. The href is read off the card anchor and re-emitted as an
 * explicit link in the text cell (the block promotes it to the whole row).
 *
 * Output (2 columns), one row per item:
 *   [ thumbnail picture | eyebrow paragraph, H2, link ]
 */
export default function parse(element, { document }) {
  let items = Array.from(element.querySelectorAll('li.quick-link-list__item'));
  if (!items.length) items = Array.from(element.querySelectorAll(':scope > ul > li'));
  if (!items.length) {
    // Fallback: inner content wrappers, paired per card
    items = Array.from(element.querySelectorAll('.quick-link-list__card-content-wrap'))
      .map((wrap) => wrap.parentElement);
  }

  const cells = [];

  items.forEach((item) => {
    const picture = item.querySelector('picture') || item.querySelector('img');
    const heading = item.querySelector('h1, h2, h3, h4, h5, h6');
    const eyebrow = item.querySelector('.quick-link-list__card-eyebrow')
      || Array.from(item.querySelectorAll('p')).find((p) => p.textContent.trim() && !p.querySelector('picture, img'));

    const anchor = item.matches('a[href]') ? item : (item.querySelector('a[href]') || item.closest('a[href]'));
    const href = anchor ? anchor.getAttribute('href') : null;

    if (!picture && !heading && !eyebrow && !href) return;

    const textCell = [];
    if (eyebrow) {
      const p = document.createElement('p');
      p.textContent = eyebrow.textContent.trim();
      textCell.push(p);
    }
    if (heading) {
      const h = document.createElement(heading.tagName.toLowerCase());
      h.textContent = heading.textContent.trim();
      textCell.push(h);
    }
    if (href) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = (heading && heading.textContent.trim()) || (eyebrow && eyebrow.textContent.trim()) || href;
      const p = document.createElement('p');
      p.append(link);
      textCell.push(p);
    }

    cells.push([picture || '', textCell.length ? textCell : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-quick-link', cells });
  element.replaceWith(block);
}
