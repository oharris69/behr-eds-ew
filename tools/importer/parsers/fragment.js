/* eslint-disable */
/* global WebImporter */
/**
 * Parser for fragment. Base: fragment (custom, no library convention).
 * Source: https://www.behr.com/colorfullybehr/behr-announces-2027-color-of-the-year-grounded/
 * Generated: 2026-10-01
 *
 * Source: aside#secondary.widget-area — the blog sidebar shared by all
 * ColorfullyBEHR posts. Its content is exported as a separate fragment
 * document (/colorfullybehr/fragments/sidebar) by the import script, so
 * nothing from the sidebar is kept inline here.
 *
 * Output (1 column, 1 row):
 *   [ link to /colorfullybehr/fragments/sidebar ]
 */
const FRAGMENT_PATH = '/colorfullybehr/fragments/sidebar';

export default function parse(element, { document }) {
  const a = document.createElement('a');
  a.setAttribute('href', FRAGMENT_PATH);
  a.textContent = FRAGMENT_PATH;

  const cells = [[a]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'fragment', cells });
  element.replaceWith(block);
}
