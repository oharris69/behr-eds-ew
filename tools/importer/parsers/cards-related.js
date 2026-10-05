/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-related. Base: cards.
 * Source: https://www.behr.com/colorfullybehr/behr-announces-2027-color-of-the-year-grounded/
 * Generated: 2026-10-01
 *
 * Source: .singleRelated .postGrid.postRelated > div.postSingle (x3)
 *   .postBody .postImage a > img -> linked image
 *   .postBody h3.postTitle a      -> title link
 *
 * Output (2 columns), one row per post:
 *   [ linked image (a > img) | h3 > a (trimmed title) ]
 */
export default function parse(element, { document }) {
  // Iterate block-level wrappers (div.postSingle), never the anchors.
  let items = Array.from(element.querySelectorAll(':scope > .postSingle'));
  if (!items.length) items = Array.from(element.querySelectorAll('.postSingle'));
  if (!items.length) items = Array.from(element.querySelectorAll('.postBody'));

  const cells = [];

  items.forEach((item) => {
    const img = item.querySelector('.postImage img') || item.querySelector('img');
    const titleLinkSrc = item.querySelector('.postTitle a')
      || item.querySelector('h1 a, h2 a, h3 a, h4 a, h5 a, h6 a');
    const titleSrc = item.querySelector('.postTitle')
      || item.querySelector('h1, h2, h3, h4, h5, h6');

    const titleText = ((titleLinkSrc || titleSrc)?.textContent || '').replace(/\s+/g, ' ').trim();
    const href = titleLinkSrc?.getAttribute('href')
      || img?.closest('a')?.getAttribute('href')
      || '';

    if (!img && !titleText) return;

    // Image cell: keep the link around the image.
    let imageCell = '';
    if (img) {
      const imgLink = img.closest('a');
      const linkHref = imgLink?.getAttribute('href') || href;
      if (linkHref) {
        const a = document.createElement('a');
        a.setAttribute('href', linkHref);
        a.append(img);
        imageCell = a;
      } else {
        imageCell = img;
      }
    }

    // Text cell: h3 containing the title link, whitespace trimmed.
    let textCell = '';
    if (titleText) {
      const h3 = document.createElement('h3');
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = titleText;
        h3.append(a);
      } else {
        h3.textContent = titleText;
      }
      textCell = h3;
    }

    cells.push([imageCell, textCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-related', cells });
  element.replaceWith(block);
}
