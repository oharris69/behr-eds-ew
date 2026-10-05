/* eslint-disable */
/* global WebImporter */
import edsBlockParser from './eds-block.js';

/**
 * Parser for color-summary on Edge Delivery color detail pages.
 * The source fills "What you'll love" with the collections the color belongs to, resolved at
 * runtime by a color service. migration-work/tools/color-collections-snapshot.js stores them in
 * the snapshot as <div id="eds-color-collections" hidden>[{name, icon, tooltip}]</div>; they
 * are authored here as a list in the block's second row (the block shows authored items
 * before the shared "What you'll love" fragment).
 */
export default function parse(element, { document, ...rest }) {
  const store = document.getElementById('eds-color-collections');
  let items = [];
  try {
    items = JSON.parse(store ? store.textContent : '[]');
  } catch (e) {
    items = [];
  }
  if (store) store.remove();

  if (items.length && !element.querySelector(':scope > div:nth-child(n+2) li')) {
    const ul = document.createElement('ul');
    items.forEach(({ name }) => {
      const li = document.createElement('li');
      li.textContent = name;
      ul.append(li);
    });
    // second row, first cell: reuse the source's empty row when present
    let row = element.children[1];
    if (!row) {
      row = document.createElement('div');
      row.append(document.createElement('div'));
      element.append(row);
    }
    const cell = row.firstElementChild || row.appendChild(document.createElement('div'));
    cell.replaceChildren(ul);
  }

  edsBlockParser(element, { document, ...rest });
}
