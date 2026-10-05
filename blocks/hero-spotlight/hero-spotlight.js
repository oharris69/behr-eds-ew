import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Returns true when a paragraph holds exactly one link and nothing else.
 * @param {Element} el
 * @returns {boolean}
 */
function isLinkOnly(el) {
  if (el.tagName !== 'P') return false;
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && !el.querySelector('picture')
    && el.textContent.trim() === links[0].textContent.trim();
}

/**
 * Hero Spotlight: banner image with a translucent text box on the left.
 * Content contract: row 1 picture; row 2 eyebrow <p>, heading (h1, may
 * contain <br>), CTA link paragraph. Rows/cells may be merged, swapped or
 * omitted: the first picture anywhere is the banner, everything else is
 * box content. Eyebrow = a non-link paragraph before the heading; CTA =
 * link-only paragraphs.
 * @param {Element} block
 */
export default function decorate(block) {
  const media = document.createElement('div');
  media.className = 'hero-spotlight-image';
  const content = document.createElement('div');
  content.className = 'hero-spotlight-content';

  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      const picture = cell.querySelector('picture');
      if (picture && !media.children.length) {
        const holder = picture.parentElement;
        media.append(picture);
        const empty = !holder.textContent.trim() && !holder.children.length;
        if (holder !== cell && empty) holder.remove();
      }
      [...cell.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return;
        if (node.nodeType === Node.ELEMENT_NODE
          && !node.textContent.trim() && !node.querySelector('img, picture')) return;
        content.append(node);
      });
    });
  });

  // a bare text node (author typed straight into the cell) becomes a paragraph
  [...content.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const p = document.createElement('p');
      p.textContent = node.textContent.trim();
      node.replaceWith(p);
    }
  });

  let heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  // no heading authored: promote the most prominent non-link paragraph
  if (!heading) {
    const candidates = [...content.children].filter((el) => el.tagName === 'P' && !isLinkOnly(el));
    const promote = candidates.length > 1 ? candidates[1] : candidates[0];
    if (promote) {
      heading = document.createElement('h1');
      heading.append(...promote.childNodes);
      promote.replaceWith(heading);
    }
  }
  if (heading) heading.classList.add('hero-spotlight-title');

  let seenHeading = false;
  [...content.children].forEach((el) => {
    if (el === heading) {
      seenHeading = true;
      return;
    }
    if (isLinkOnly(el)) {
      el.classList.add('hero-spotlight-cta');
      const a = el.querySelector('a');
      // already buttonized by decorateButtons (strong/em): keep author's choice
      if (!a.classList.contains('button')) a.classList.add('button', 'primary');
      el.classList.add('button-wrapper');
      return;
    }
    if (!seenHeading && el.tagName === 'P') el.classList.add('hero-spotlight-eyebrow');
  });
  // a stray picture inside the text box is not part of this design
  content.querySelectorAll('picture').forEach((pic) => {
    const holder = pic.parentElement;
    pic.remove();
    const empty = !holder.textContent.trim() && !holder.children.length;
    if (holder !== content && empty) holder.remove();
  });

  // banner is above the fold: eager-load it as the LCP image
  const img = media.querySelector('img');
  if (img) {
    media.querySelector('picture').replaceWith(createOptimizedPicture(img.src, img.alt, true, [
      { media: '(min-width: 1024px)', width: '2000' },
      { media: '(min-width: 768px)', width: '1200' },
      { width: '750' },
    ]));
    const optimized = media.querySelector('img');
    optimized.fetchPriority = 'high';
  }

  const children = [];
  if (media.children.length) {
    children.push(media);
    block.classList.add('hero-spotlight-has-image');
  }
  if (content.children.length) {
    const inner = document.createElement('div');
    inner.className = 'hero-spotlight-inner';
    inner.append(content);
    children.push(inner);
  }
  block.replaceChildren(...children);
}
