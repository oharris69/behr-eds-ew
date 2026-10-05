/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-split. Base: columns. Source: https://www.behr.com/colorfullybehr/
 * Generated: 2026-10-01
 *
 * Source: #ask (SiteOrigin panel row, 2 .panel-grid-cell)
 *   cell 1: .sow-image-container img (AskAColorExpert.jpg)  -> picture
 *   cell 2: .textwidget h2 (span.cursive or em = script word) -> <h2><em>Ask</em> an Expert</h2>
 *           .textwidget p (keep <strong>)                   -> paragraphs
 *           .textwidget p > a.btn                           -> <p><a>CTA</a></p>
 *
 * Output (2 columns, 1 row): [ picture | h2, paragraphs, CTA ]
 */

const KEEP_UPPER = /^(BEHR|BEHR®|DIY|USA|HGTV|COTY|[A-Z]*\d[\w-]*|[IVX]+)$/;
const MINOR = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

/** All-caps source text -> Title Case (CSS uppercases it where the design needs it). */
function titleCase(text, isStart = true) {
  if (!/[A-Z]/.test(text) || /[a-z]/.test(text)) return text;
  let first = isStart;
  return text.replace(/[^\s]+/g, (word) => {
    const core = word.replace(/[^\wÀ-ÿ®&'-]/g, '');
    let out;
    if (KEEP_UPPER.test(core)) out = word;
    else if (!first && MINOR.has(word.toLowerCase())) out = word.toLowerCase();
    else out = word.charAt(0) + word.slice(1).toLowerCase();
    first = false;
    return out;
  });
}

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/** Rebuild a heading: script word (span.cursive or em) -> <em>, rest title-cased. */
function buildHeading(document, source) {
  const h = document.createElement(/^H[1-6]$/.test(source.tagName) ? source.tagName.toLowerCase() : 'h2');
  let started = false;
  source.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const t = node.textContent.replace(/\s+/g, ' ');
      if (!t.trim()) {
        if (started) h.append(document.createTextNode(' '));
        return;
      }
      h.append(document.createTextNode(titleCase(started ? t : t.trimStart(), !started)));
      started = true;
    } else if (node.nodeType === 1) {
      const t = clean(node.textContent);
      if (!t) return;
      if (node.matches('em, i, .cursive') || node.querySelector('em, .cursive')) {
        const em = document.createElement('em');
        em.textContent = t;
        h.append(em);
      } else {
        h.append(document.createTextNode(titleCase(t, !started)));
      }
      started = true;
    }
  });
  if (h.lastChild && h.lastChild.nodeType === 3) h.lastChild.textContent = h.lastChild.textContent.replace(/\s+$/, '');
  return clean(h.textContent) ? h : null;
}

/** Copy a paragraph keeping inline <strong>/<em>/<a>, trimming whitespace. */
function buildParagraph(document, source) {
  const p = document.createElement('p');
  source.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      p.append(document.createTextNode(node.textContent.replace(/\s+/g, ' ')));
    } else if (node.nodeType === 1 && clean(node.textContent)) {
      if (node.matches('strong, b')) {
        const s = document.createElement('strong');
        s.textContent = clean(node.textContent);
        p.append(s);
      } else if (node.matches('em, i')) {
        const e = document.createElement('em');
        e.textContent = clean(node.textContent);
        p.append(e);
      } else if (node.matches('a[href]')) {
        const a = document.createElement('a');
        a.href = node.getAttribute('href');
        a.textContent = clean(node.textContent);
        p.append(a);
      } else {
        p.append(document.createTextNode(node.textContent.replace(/\s+/g, ' ')));
      }
    }
  });
  // trim leading/trailing whitespace text
  if (p.firstChild && p.firstChild.nodeType === 3) p.firstChild.textContent = p.firstChild.textContent.replace(/^\s+/, '');
  if (p.lastChild && p.lastChild.nodeType === 3) p.lastChild.textContent = p.lastChild.textContent.replace(/\s+$/, '');
  return clean(p.textContent) ? p : null;
}

export default function parse(element, { document }) {
  const gridCells = Array.from(element.querySelectorAll(':scope > .panel-grid-cell'));

  // Image side: first cell holding a real image
  const img = element.querySelector('.sow-image-container img, .askLeft img, img.so-widget-image')
    || Array.from(element.querySelectorAll('img')).find((i) => !(i.getAttribute('src') || '').startsWith('data:'));
  let imageCell = '';
  if (img) {
    imageCell = img.closest('picture') || img;
  }

  // Text side: the editor widget (fallback: the grid cell without the image)
  const textRoot = element.querySelector('.askRight .textwidget, .textwidget')
    || gridCells.find((c) => !img || !c.contains(img))
    || element;

  const textCell = [];
  Array.from(textRoot.children).forEach((child) => {
    if (/^H[1-6]$/.test(child.tagName)) {
      const h = buildHeading(document, child);
      if (h) textCell.push(h);
      return;
    }
    if (child.tagName === 'P') {
      const links = child.querySelectorAll('a[href]');
      const linkOnly = links.length === 1 && clean(child.textContent) === clean(links[0].textContent);
      if (linkOnly) {
        const a = document.createElement('a');
        a.href = links[0].getAttribute('href');
        a.textContent = titleCase(clean(links[0].textContent));
        const p = document.createElement('p');
        p.append(a);
        textCell.push(p);
        return;
      }
      const p = buildParagraph(document, child);
      if (p) textCell.push(p);
      return;
    }
    if (child.matches('ul, ol') && clean(child.textContent)) textCell.push(child);
  });

  if (!imageCell && !textCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[imageCell, textCell.length ? textCell : '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-split', cells });
  element.replaceWith(block);
}
