/* eslint-disable */
/* global WebImporter */

/**
 * Parser for a paragraph that only holds a link to a fragment (<p><a href="/fragments/x">…</a></p>),
 * which Edge Delivery source sites auto-block into a fragment. Our project has no fragment
 * auto-blocking, so it becomes an explicit Fragment block pointing at the same path.
 */
export default function parse(element, { document }) {
  const a = element.querySelector('a[href]');
  if (!a) return;
  const href = new URL(a.getAttribute('href'), 'https://www.behr.com').pathname;
  const link = document.createElement('a');
  link.href = href;
  link.textContent = href;
  const block = WebImporter.Blocks.createBlock(document, { name: 'Fragment', cells: [[link]] });
  element.replaceWith(block);
}
