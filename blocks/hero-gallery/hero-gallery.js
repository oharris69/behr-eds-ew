import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Hero Gallery
 * Content contract (rows are authored in any order, cells may be omitted/added):
 * - Text row(s): any row containing non-image content (heading, description, CTA).
 * - Image rows: rows whose only content is one or more pictures; each picture
 *   becomes one gallery tile.
 * @param {Element} block
 */
export default function decorate(block) {
  const content = document.createElement('div');
  content.className = 'hero-gallery-content';

  const gallery = document.createElement('ul');
  gallery.className = 'hero-gallery-images';

  [...block.children].forEach((row) => {
    const pictures = [...row.querySelectorAll('picture')];
    const hasText = [...row.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, ul, ol')]
      .some((el) => !el.querySelector('picture') && el.textContent.trim());

    if (!hasText && pictures.length) {
      pictures.forEach((picture) => {
        const img = picture.querySelector('img');
        const li = document.createElement('li');
        li.className = 'hero-gallery-image';
        li.append(img
          ? createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 900px)', width: '600' }, { width: '400' }])
          : picture);
        gallery.append(li);
      });
      return;
    }

    // text row: flatten cells into the content column, keep any inline pictures
    [...row.children].forEach((cell) => {
      while (cell.firstChild) content.append(cell.firstChild);
    });
  });

  // first gallery image is likely above the fold; don't lazy-load it
  const firstImg = gallery.querySelector('img');
  if (firstImg) {
    firstImg.loading = 'eager';
    firstImg.fetchPriority = 'high';
  }

  const children = [];
  if (content.childNodes.length) children.push(content);
  if (gallery.children.length) {
    children.push(gallery);
    block.classList.add(gallery.children.length > 1 ? 'hero-gallery-multi' : 'hero-gallery-single');
  }
  block.replaceChildren(...children);
}
