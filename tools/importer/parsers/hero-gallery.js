/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-gallery. Base: hero. Source: https://www.behr.com/
 * Generated: 2026-09-30
 *
 * Source: .homepage-hero.block — already EDS-shaped: 13 direct child rows,
 * row 1 holds h1.homepage-hero__heading + p.homepage-hero__description +
 * p.button-container > a.button; rows 2..13 hold one <picture> each.
 *
 * Output (1 column):
 *   Row 1: [ H1, description paragraph(s), CTA link(s) ]
 *   Rows 2..n: [ picture ]  (one picture per row)
 */
export default function parse(element, { document }) {
  // --- Text content (heading, description, CTA) ---
  const heading = element.querySelector('h1, .homepage-hero__heading, h2');

  // Description: paragraphs with text that are not CTA holders and do not contain pictures
  const descriptions = Array.from(element.querySelectorAll('p')).filter((p) => (
    !p.matches('.button-container')
    && !p.querySelector('a, picture, img')
    && p.textContent.trim()
  ));

  // CTAs: links outside of image rows
  const ctas = Array.from(element.querySelectorAll('a[href]')).filter((a) => !a.querySelector('picture, img'));

  // --- Gallery images: every picture (or bare img) not inside the text row ---
  const images = [];
  element.querySelectorAll('picture').forEach((pic) => images.push(pic));
  element.querySelectorAll('img').forEach((img) => {
    if (!img.closest('picture')) images.push(img);
  });

  if (!heading && !descriptions.length && !ctas.length && !images.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  const contentCell = [];
  if (heading) contentCell.push(heading);
  contentCell.push(...descriptions);
  ctas.forEach((a) => {
    // Normalize CTA: plain link with its visible text, wrapped in a paragraph
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = a.textContent.trim();
    const p = document.createElement('p');
    p.append(link);
    contentCell.push(p);
  });
  if (contentCell.length) cells.push([contentCell]);

  images.forEach((img) => cells.push([img]));

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-gallery', cells });
  element.replaceWith(block);
}
