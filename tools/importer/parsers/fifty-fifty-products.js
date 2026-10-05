/* eslint-disable */
/* global WebImporter */
/**
 * Parser for fifty-fifty-products. Base: fifty-fifty (custom, "products" option).
 * Source: https://www.behr.com/pro/onthejob/  Generated: 2026-10-01
 *
 * Source: section.shop .shop__products
 *   .shop__product                         -> one row per product
 *     a.shop__product-button               -> <p><a href>Buy Interior Paint</a></p>
 *     .shop__product-image img             -> picture cell
 * Output "Fifty Fifty (products)": [<p><a>CTA</a></p>] | [picture]
 * (the section header / description / Home Depot logo stay default content).
 * Iteration is keyed on the block-level div.shop__product wrappers.
 */

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  let products = Array.from(element.querySelectorAll('.shop__product'));
  if (!products.length) products = Array.from(element.querySelectorAll(':scope > .row > div'));

  const cells = [];
  products.forEach((product) => {
    const btn = product.querySelector('a.shop__product-button[href], a.button[href], a[href]');
    const src = product.querySelector('.shop__product-image img, img');

    let ctaCell = '';
    if (btn && clean(btn.textContent)) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = btn.getAttribute('href');
      a.textContent = clean(btn.textContent);
      p.append(a);
      ctaCell = p;
    }

    let imageCell = '';
    const srcUrl = src && src.getAttribute('src');
    if (srcUrl && !srcUrl.startsWith('data:')) {
      const img = document.createElement('img');
      img.src = srcUrl;
      img.alt = src.getAttribute('alt') || '';
      imageCell = img;
    }

    if (!ctaCell && !imageCell) return;
    cells.push([ctaCell, imageCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'fifty-fifty',
    variants: ['products'],
    cells,
  });
  element.replaceWith(block);
}
