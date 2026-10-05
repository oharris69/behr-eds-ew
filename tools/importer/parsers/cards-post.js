/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-post. Base: cards. Source: https://www.behr.com/colorfullybehr/
 * Generated: 2026-10-01
 *
 * Instances:
 *   #news .postGrid -> "Cards Post": one row per .postSingle
 *     .postCategory (h5)   -> <p>category</p>
 *     .postTitle a         -> <h3><a>title</a></h3>
 *     .postDesc p          -> <p>excerpt</p>
 *     .postBtn a           -> <p><a>Read more</a></p>
 *     .postImage a > img   -> picture cell (link kept)
 *     .postDate            -> <p>date</p>
 *     (.postShare / .postComment dropped)
 *   #info -> "Cards Post (feature)": one row per .panel-grid-cell, each holding
 *     an h2 label (span.cursive or em = script word) + one .postFeature .postSingle
 *
 * Iteration is keyed on block-level div wrappers (.postSingle / .panel-grid-cell),
 * never on anchors. Output: 2 columns [picture | text].
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

function para(document, content) {
  const p = document.createElement('p');
  if (typeof content === 'string') p.textContent = content;
  else p.append(content);
  return p;
}

function link(document, href, text) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  return a;
}

/** Rebuild a label heading: script word (span.cursive or em) -> <em>, rest title-cased. */
function buildLabel(document, source) {
  const h2 = document.createElement('h2');
  let started = false;
  source.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const t = node.textContent.replace(/\s+/g, ' ');
      if (!t.trim()) {
        if (started) h2.append(document.createTextNode(' '));
        return;
      }
      h2.append(document.createTextNode(titleCase(started ? t : t.trimStart(), !started)));
      started = true;
    } else if (node.nodeType === 1) {
      const t = clean(node.textContent);
      if (!t) return;
      const isScript = node.matches('em, i, .cursive') || node.querySelector('em, .cursive');
      if (isScript) {
        const em = document.createElement('em');
        em.textContent = t;
        h2.append(em);
      } else {
        h2.append(document.createTextNode(titleCase(t, !started)));
      }
      started = true;
    }
  });
  h2.innerHTML = h2.innerHTML.replace(/\s+$/, '');
  return clean(h2.textContent) ? h2 : null;
}

function buildCard(document, post, { feature, labelSource }) {
  const titleLink = post.querySelector('.postTitle a[href], h3 a[href], h2 a[href]');
  const href = titleLink && titleLink.getAttribute('href');

  // Image cell: keep the image link to the post
  const img = post.querySelector('.postImage img, img:not([src^="data:"])');
  let imageCell = '';
  if (img) {
    const imgLink = img.closest('a[href]');
    const pictureEl = img.closest('picture') || img;
    const a = document.createElement('a');
    a.href = (imgLink && imgLink.getAttribute('href')) || href || '';
    if (a.getAttribute('href')) {
      a.append(pictureEl);
      imageCell = a;
    } else {
      imageCell = pictureEl;
    }
  }

  const text = [];
  if (feature) {
    const label = labelSource && buildLabel(document, labelSource);
    if (label) text.push(label);
  } else {
    const category = post.querySelector('.postCategory');
    if (category && clean(category.textContent)) text.push(para(document, clean(category.textContent)));
  }

  if (titleLink && clean(titleLink.textContent)) {
    const h3 = document.createElement('h3');
    h3.append(link(document, href, clean(titleLink.textContent)));
    text.push(h3);
  }

  const excerpts = Array.from(post.querySelectorAll('.postDesc p')).filter((p) => clean(p.textContent));
  if (excerpts.length) excerpts.forEach((p) => text.push(para(document, clean(p.textContent))));
  else {
    const desc = post.querySelector('.postDesc');
    if (desc && clean(desc.textContent)) text.push(para(document, clean(desc.textContent)));
  }

  const btn = post.querySelector('.postBtn a[href], a.btn[href]');
  if (btn && clean(btn.textContent)) {
    // Feature cards render the CTA as a button ("Read More"); default cards keep the inline "Read more"
    const label = clean(btn.textContent);
    const btnText = feature ? label.replace(/\b[a-z]/g, (c) => c.toUpperCase()) : titleCase(label);
    text.push(para(document, link(document, btn.getAttribute('href'), btnText)));
  }

  if (!feature) {
    const date = post.querySelector('.postDate, time');
    if (date && clean(date.textContent)) text.push(para(document, clean(date.textContent)));
  }

  if (!imageCell && !text.length) return null;
  return [imageCell, text.length ? text : ''];
}

export default function parse(element, { document }) {
  const feature = element.id === 'info' || !!element.closest('#info')
    || !!element.querySelector('.postFeature');

  const cells = [];

  if (feature) {
    // One card per panel cell: h2 label + its .postFeature post
    let panels = Array.from(element.querySelectorAll(':scope > .panel-grid-cell'));
    if (!panels.length) panels = Array.from(element.querySelectorAll('.textwidget'));
    panels.forEach((panel) => {
      const post = panel.querySelector('.postFeature .postSingle, .postSingle');
      if (!post) return;
      const labelSource = Array.from(panel.querySelectorAll('h1, h2, h4'))
        .find((h) => !post.contains(h) && clean(h.textContent));
      const row = buildCard(document, post, { feature: true, labelSource });
      if (row) cells.push(row);
    });
  } else {
    let posts = Array.from(element.querySelectorAll(':scope > .postSingle'));
    if (!posts.length) posts = Array.from(element.querySelectorAll('.postSingle'));
    posts.forEach((post) => {
      const row = buildCard(document, post, { feature: false });
      if (row) cells.push(row);
    });
  }

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'cards-post',
    variants: feature ? ['feature'] : [],
    cells,
  });
  element.replaceWith(block);
}
