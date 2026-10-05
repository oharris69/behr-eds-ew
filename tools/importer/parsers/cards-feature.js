/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-feature. Base: cards. Source: https://www.behr.com/
 * Generated: 2026-09-30
 *
 * Source: .feature.block > section.feature__carousel > div.feature__slide (x3)
 *   .feature__slide-bg picture            -> background image
 *   .feature__product-info h2             -> title
 *   .feature__description (p)             -> description
 *   .feature__product-group a.feature__cta -> CTA
 *
 * Output (2 columns), one row per slide:
 *   [ background picture | H2, paragraph, CTA link ]
 */
export default function parse(element, { document }) {
  // Iterate block-level slide wrappers (div, not anchors) — safe iteration key.
  let slides = Array.from(element.querySelectorAll('.feature__slide'));
  if (!slides.length) {
    // Fallback: any direct slide-like children of the carousel
    slides = Array.from(element.querySelectorAll(':scope > section > div, :scope > div'));
  }

  const cells = [];

  slides.forEach((slide) => {
    const picture = slide.querySelector('.feature__slide-bg picture')
      || slide.querySelector('picture')
      || slide.querySelector('img');

    const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
    const descriptions = Array.from(slide.querySelectorAll('p')).filter((p) => (
      p.textContent.trim() && !p.querySelector('a, picture, img')
    ));
    const ctas = Array.from(slide.querySelectorAll('a[href]')).filter((a) => a.textContent.trim());

    if (!picture && !heading && !descriptions.length && !ctas.length) return;

    const textCell = [];
    if (heading) textCell.push(heading);
    textCell.push(...descriptions);
    ctas.forEach((a) => {
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = a.textContent.trim();
      const p = document.createElement('p');
      p.append(link);
      textCell.push(p);
    });

    cells.push([picture || '', textCell.length ? textCell : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
  element.replaceWith(block);
}
