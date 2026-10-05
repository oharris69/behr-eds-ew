/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-spotlight. Base: hero. Source: https://www.behr.com/colorfullybehr/
 * Generated: 2026-10-01
 *
 * Source: #banner #smartslider3-2 (Smart Slider 3, one slide)
 *   .n2-ss-slide-background-image picture > img  -> banner image (fallbacks:
 *        data-desktop / data-src / data-hash attrs, inline background-image)
 *   first .n2-ss-text layer without a <p> ("SPOTLIGHT") -> eyebrow
 *   .n2-ss-text p (lines split by <br>)          -> h1 title
 *   .n2-ss-button-container a                    -> CTA
 * Ignored: the slide title note (.n2-ss-slide--focus) and the decorative
 * reddishLine image layer.
 *
 * Output (1 column):
 *   row 1: [ banner picture ]
 *   row 2: [ <p>eyebrow</p>, <h1>line<br>line<br>line</h1>, <p><a>CTA</a></p> ]
 */

const KEEP_UPPER = /^(BEHR|BEHR®|DIY|USA|HGTV|COTY|[A-Z]*\d[\w-]*|[IVX]+)$/;
const MINOR = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

/** All-caps source text -> Title Case (CSS uppercases it again where the design needs it). */
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

function findBannerImage(element, document) {
  // 1. Real <img> inside the slide background (current Smart Slider markup)
  const bg = element.querySelector('.n2-ss-slide-background-image, .n2-ss-slide-background');
  let img = bg && bg.querySelector('img');
  if (img && img.getAttribute('src') && !img.getAttribute('src').startsWith('data:')) {
    const picture = img.closest('picture') || img;
    if (!img.getAttribute('alt') && bg.getAttribute('data-alt')) img.setAttribute('alt', bg.getAttribute('data-alt'));
    return picture;
  }
  // 2. Data attributes / inline background-image (lazy or older Smart Slider)
  const holders = [bg, ...element.querySelectorAll('[data-desktop], [data-src], [style*="background-image"]')].filter(Boolean);
  for (const holder of holders) {
    let src = holder.getAttribute('data-desktop') || holder.getAttribute('data-src') || '';
    if (!src) {
      const m = (holder.getAttribute('style') || '').match(/background-image:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
      if (m) src = m[1];
    }
    if (src && !src.startsWith('data:')) {
      img = document.createElement('img');
      img.src = src;
      img.alt = holder.getAttribute('data-alt') || '';
      return img;
    }
  }
  return null;
}

export default function parse(element, { document }) {
  const picture = findBannerImage(element, document);

  const layers = Array.from(element.querySelectorAll('.n2-ss-layers-container .n2-ss-item-content.n2-ss-text, .n2-ss-layers-container .n2-ss-text'))
    .filter((el, i, arr) => arr.indexOf(el) === i && !arr.some((o) => o !== el && o.contains(el)));

  // Eyebrow: a text layer with no paragraph inside (e.g. "SPOTLIGHT")
  const eyebrowLayer = layers.find((el) => !el.querySelector('p') && clean(el.textContent));
  // Title: the text layer holding a paragraph (lines separated by <br>)
  const titleSource = (layers.find((el) => el.querySelector('p')) || element).querySelector('p, h1, h2, h3');

  const contentCell = [];

  if (eyebrowLayer) {
    const p = document.createElement('p');
    p.textContent = titleCase(clean(eyebrowLayer.textContent));
    contentCell.push(p);
  }

  if (titleSource) {
    const lines = titleSource.innerHTML
      .split(/<br\s*\/?>/i)
      .map((html) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return clean(tmp.textContent);
      })
      .filter(Boolean);
    if (lines.length) {
      const h1 = document.createElement('h1');
      lines.forEach((line, i) => {
        if (i) h1.append(document.createElement('br'));
        h1.append(document.createTextNode(titleCase(line)));
      });
      contentCell.push(h1);
    }
  }

  const ctaSource = element.querySelector('.n2-ss-button-container a[href]')
    || Array.from(element.querySelectorAll('.n2-ss-layers-container a[href]')).find((a) => clean(a.textContent));
  if (ctaSource) {
    const a = document.createElement('a');
    a.href = ctaSource.getAttribute('href');
    a.textContent = titleCase(clean(ctaSource.textContent));
    const p = document.createElement('p');
    p.append(a);
    contentCell.push(p);
  }

  if (!picture && !contentCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  if (picture) cells.push([picture]);
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-spotlight', cells });
  element.replaceWith(block);
}
