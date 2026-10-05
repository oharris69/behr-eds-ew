import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Returns the first href that points to the post, preferring the title link.
 * @param {Element} body
 * @param {Element} media
 * @returns {string}
 */
function findHref(body, media) {
  const titleLink = body.querySelector('h1 a, h2 a, h3 a, h4 a, h5 a, h6 a')
    || body.querySelector('a[href]');
  if (titleLink) return titleLink.href;
  const mediaLink = media.querySelector('a[href]');
  return mediaLink ? mediaLink.href : '';
}

/**
 * Cards Related: "Picks for you" related-post cards.
 * Content contract, per row: [linked image] | [h3 > a title].
 * Cells may be omitted, swapped, or merged into one cell. If the image is
 * not linked, it is linked to the title's href. A bare URL paragraph left
 * next to the image (how some authoring tools express a linked image) is
 * consumed as the image link.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-related-card';

    const media = document.createElement('div');
    media.className = 'cards-related-card-image';
    const body = document.createElement('div');
    body.className = 'cards-related-card-body';

    [...row.children].forEach((cell) => {
      const picture = cell.querySelector('picture');
      if (picture && !media.children.length) {
        // keep the picture (and its wrapping link, if any) as the card media
        const link = picture.closest('a');
        media.append(link && cell.contains(link) ? link : picture);
        // a link-only paragraph in the image cell is the image link
        const bare = [...cell.querySelectorAll('a[href]')]
          .find((a) => !a.querySelector('picture')
            && a.parentElement.tagName === 'P'
            && a.parentElement.textContent.trim() === a.textContent.trim()
            && /^(https?:\/\/|\/)\S*$/.test(a.textContent.trim()));
        if (bare && !media.querySelector('a')) {
          media.dataset.href = bare.href;
          bare.parentElement.remove();
        }
      }
      // whatever text content remains belongs to the card body
      [...cell.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return;
        if (node.nodeType === Node.ELEMENT_NODE
          && !node.textContent.trim() && !node.querySelector('img, picture')) return;
        body.append(node);
      });
    });

    // ensure the image is a link to the post
    if (media.children.length && !media.querySelector('a')) {
      const href = media.dataset.href || findHref(body, media);
      if (href) {
        const a = document.createElement('a');
        a.href = href;
        a.tabIndex = -1;
        a.setAttribute('aria-hidden', 'true');
        a.append(...media.childNodes);
        media.append(a);
      }
    }
    delete media.dataset.href;

    // promote plain-text or link-only titles to an h3 so cards are consistent
    if (body.children.length && !body.querySelector('h1, h2, h3, h4, h5, h6')) {
      const first = body.firstElementChild;
      if (first && first.tagName === 'P') {
        const h3 = document.createElement('h3');
        h3.append(...first.childNodes);
        first.replaceWith(h3);
      }
    }
    body.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => h.classList.add('cards-related-card-title'));

    if (media.children.length) li.append(media);
    if (body.textContent.trim()) li.append(body);
    if (li.children.length) ul.append(li);
  });

  ul.querySelectorAll('.cards-related-card-image picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });

  block.replaceChildren(ul);
}
