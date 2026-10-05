/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-hero. Base: carousel. Source: https://www.behr.com/pro/onthejob/
 * Generated: 2026-10-01
 *
 * Source: section.hero-swiper (Swiper). One row per real slide:
 *   .swiper-slide.hero-swiper__slide (not .swiper-slide-duplicate; deduped by data-swiper-slide-index)
 *     .hero-swiper__slide-image > img (or its background-image)   -> picture cell
 *     .hero-swiper__slide-header  (styled div)                     -> <h1> (slide 1) / <h2>
 *     .hero-swiper__slide-description                              -> <p>
 *     a.hero-swiper__slide-button                                  -> <p><a>CTA</a></p>
 * Output "Carousel Hero": [picture] | [heading, p, p > a]. Iteration keyed on slide divs.
 */

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/** URL from an inline `background-image: url(...)`, or ''. */
function bgUrl(el) {
  if (!el) return '';
  const style = el.getAttribute('style') || '';
  const m = style.match(/background-image\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
  return m ? m[1] : '';
}

function slideImage(document, slide) {
  const holder = slide.querySelector('.hero-swiper__slide-image, [class*="slide-image"]') || slide;
  const img = holder.querySelector('img[src]:not([src^="data:"])')
    || slide.querySelector('img[src]:not([src^="data:"])');
  const src = (img && img.getAttribute('src')) || bgUrl(holder) || bgUrl(slide);
  if (!src) return '';
  const out = document.createElement('img');
  out.src = src;
  out.alt = (img && img.getAttribute('alt')) || '';
  return out;
}

export default function parse(element, { document }) {
  let slides = Array.from(element.querySelectorAll('.swiper-slide.hero-swiper__slide, .hero-swiper__slide'));
  if (!slides.length) slides = Array.from(element.querySelectorAll('.swiper-slide'));

  // drop Swiper loop clones; keep the first slide per data-swiper-slide-index
  const seen = new Set();
  slides = slides.filter((slide) => {
    if (slide.classList.contains('swiper-slide-duplicate')) return false;
    const key = slide.getAttribute('data-swiper-slide-index');
    if (key === null) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // source order is the slide index order
  slides.sort((a, b) => {
    const ia = parseInt(a.getAttribute('data-swiper-slide-index'), 10);
    const ib = parseInt(b.getAttribute('data-swiper-slide-index'), 10);
    return Number.isNaN(ia) || Number.isNaN(ib) ? 0 : ia - ib;
  });

  const cells = [];
  slides.forEach((slide) => {
    const image = slideImage(document, slide);
    const title = clean(slide.querySelector('.hero-swiper__slide-header, [class*="slide-header"], h1, h2, h3')?.textContent);
    const desc = clean(slide.querySelector('.hero-swiper__slide-description, [class*="slide-description"]')?.textContent);
    const btn = slide.querySelector('a.hero-swiper__slide-button[href], .hero-swiper__slide-inner a[href]');

    const text = [];
    if (title) {
      const h = document.createElement(cells.length === 0 ? 'h1' : 'h2');
      h.textContent = title;
      text.push(h);
    }
    if (desc) {
      const p = document.createElement('p');
      p.textContent = desc;
      text.push(p);
    }
    if (btn && clean(btn.textContent)) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = btn.getAttribute('href');
      a.textContent = clean(btn.textContent);
      p.append(a);
      text.push(p);
    }
    if (!image && !text.length) return;
    cells.push([image || '', text.length ? text : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}
