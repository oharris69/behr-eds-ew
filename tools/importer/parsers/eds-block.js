/* eslint-disable */
/* global WebImporter */

/**
 * Parser for blocks on a source page that is itself an Edge Delivery site.
 * Source: tools/importer/bd-snapshots/<host>/<path>.html (authored .plain.html wrapped in a document),
 * where every block is <div class="name option ..."> with one <div> per row and one <div> per cell.
 * The authored table is rebuilt as-is (same name, options, rows and cells), so block code can
 * decorate the source content model directly.
 *
 * - options become the block-name suffix: <div class="room-carousel premium"> -> "Room Carousel (premium)"
 * - <span class="icon icon-bedroom"> becomes the authorable :bedroom: icon shorthand
 * - empty trailing rows are kept: some blocks use positional rows (e.g. an empty third hero row)
 */
export default function parse(element, { document }) {
  const [name, ...options] = [...element.classList];
  const title = name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const blockName = options.length ? `${title} (${options.join(', ')})` : title;

  element.querySelectorAll('span.icon').forEach((span) => {
    const iconClass = [...span.classList].find((c) => c.startsWith('icon-'));
    span.replaceWith(document.createTextNode(iconClass ? `:${iconClass.slice(5)}:` : ''));
  });

  const cells = [...element.children].map((row) => [...row.children].map((cell) => {
    // single-child cells are passed as the element; mixed content as a fragment
    const nodes = [...cell.childNodes].filter((n) => n.nodeType !== 3 || n.textContent.trim());
    if (nodes.length === 0) return '';
    if (nodes.length === 1 && nodes[0].nodeType === 3) return nodes[0].textContent.trim();
    const frag = document.createElement('div');
    nodes.forEach((n) => frag.append(n));
    return frag.childNodes.length === 1 ? frag.firstChild : [...frag.childNodes];
  }));

  const block = WebImporter.Blocks.createBlock(document, { name: blockName, cells });
  element.replaceWith(block);
}
