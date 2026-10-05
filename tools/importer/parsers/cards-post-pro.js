/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-post-pro. Base: cards (cards-post block, "pro" / "highlight" options).
 * Source: https://www.behr.com/pro/onthejob/  Generated: 2026-10-01
 *
 * Instances:
 *   section.most-recent-blog .single-blog-article        -> "Cards Post (highlight)", 1 row
 *     a.single-blog-article__image img                    -> picture cell (linked to the post)
 *     .single-blog-article__tag                           -> <p>Tag 1, Tag 2</p>
 *     a.single-blog-article__header                       -> <h3><a>title</a></h3>
 *     .single-blog-article__description p (visible excerpt) -> <p>
 *     a.single-blog-article__button                       -> <p><a>Read More</a></p>
 *     .single-blog-article__additional (first copy only)  -> <p>[avatar] Author • date</p>
 *   section.blogs .blogs__block                           -> "Cards Post (pro)"
 *     landing grid: its 9 posts, then every post that only appears in the hidden
 *     #eds-filter-grids > section.blogs[data-featured] grids (dedupe by pathname,
 *     landing order first, then first-seen order). The hidden grids themselves
 *     (also matched by the selector) produce no block and are removed.
 *   section.trends .container > .row:has(.blogs-article) -> "Cards Post (pro)", 2 rows
 *   Pro card (.blogs-article):
 *     a.blogs-article__link href, .blogs-article__image img, .blogs-article__tag,
 *     .blogs-article__header, .blogs-article__author img/p, .blogs-article__date.
 *     The hidden full text (.blogs-article__description.d-none) is dropped.
 * Row: [a > img] | [p tags, h3 > a, (highlight: p excerpt, p > a Read More), p byline].
 * Iteration is keyed on the block-level div.blogs-article / .single-blog-article, never
 * on the a.blogs-article__link wrappers.
 */

const GRIDS = '#eds-filter-grids';

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function link(document, href, content) {
  const a = document.createElement('a');
  a.href = href;
  if (typeof content === 'string') a.textContent = content;
  else if (content) a.append(content);
  return a;
}

function para(document, ...content) {
  const p = document.createElement('p');
  content.forEach((c) => p.append(c));
  return p;
}

function image(document, img) {
  if (!img) return null;
  const src = img.getAttribute('src');
  if (!src || src.startsWith('data:')) return null;
  const out = document.createElement('img');
  out.src = src;
  out.alt = img.getAttribute('alt') || '';
  return out;
}

function pathKey(href) {
  try {
    return new URL(href, 'https://www.behr.com').pathname.replace(/\/+$/, '').toLowerCase();
  } catch (e) {
    return href;
  }
}

/** <p>[avatar] Author • date</p>, or null. */
function byline(document, scope, prefix) {
  const author = scope.querySelector(`.${prefix}__author`);
  const avatar = image(document, author && author.querySelector('img'));
  const nameEl = author && (author.querySelector('p') || author.querySelector('a'));
  let name = '';
  if (nameEl) {
    const copy = nameEl.cloneNode(true);
    copy.querySelectorAll('.sr-only').forEach((s) => s.remove());
    name = clean(copy.textContent);
  }
  const date = clean(scope.querySelector(`.${prefix}__date`)?.textContent);
  const text = [name, date].filter(Boolean).join(' • ');
  if (!text && !avatar) return null;
  const p = document.createElement('p');
  if (avatar) p.append(avatar);
  if (text) p.append(document.createTextNode(avatar ? ` ${text}` : text));
  return p;
}

/** Card row from a .blogs-article (pro). */
function proRow(document, article) {
  const titleLink = article.querySelector('a.blogs-article__link[href]') || article.querySelector('a[href]');
  const href = titleLink && titleLink.getAttribute('href');
  const title = clean(article.querySelector('.blogs-article__header')?.textContent);
  if (!href || !title) return null;

  const img = image(document, article.querySelector('.blogs-article__image img'));
  const text = [];
  const tags = Array.from(article.querySelectorAll('.blogs-article__tag'))
    .map((t) => clean(t.textContent)).filter(Boolean);
  if (tags.length) text.push(para(document, tags.join(', ')));
  const h3 = document.createElement('h3');
  h3.append(link(document, href, title));
  text.push(h3);
  const by = byline(document, article.querySelector('.blogs-article__additional') || article, 'blogs-article');
  if (by) text.push(by);
  return [img ? link(document, href, img) : '', text];
}

/** Card row from a .single-blog-article (highlight). */
function highlightRow(document, article) {
  const header = article.querySelector('a.single-blog-article__header[href]');
  const href = (header && header.getAttribute('href'))
    || article.querySelector('a.single-blog-article__image[href], a[href*="/blog/"]')?.getAttribute('href');
  const title = clean(header?.textContent);
  if (!href || !title) return null;

  const img = image(document, article.querySelector('.single-blog-article__image img')
    || article.querySelector('img:not(.single-blog-article__author img)'));
  const text = [];
  const tags = Array.from(article.querySelectorAll('.single-blog-article__tag'))
    .map((t) => clean(t.textContent)).filter(Boolean);
  if (tags.length) text.push(para(document, tags.join(', ')));
  const h3 = document.createElement('h3');
  h3.append(link(document, href, title));
  text.push(h3);

  const desc = article.querySelector('.single-blog-article__description');
  if (desc) {
    const ps = Array.from(desc.querySelectorAll('p')).map((p) => clean(p.textContent)).filter(Boolean);
    if (ps.length) ps.forEach((t) => text.push(para(document, t)));
    else {
      const copy = desc.cloneNode(true);
      copy.querySelectorAll('.sr-only').forEach((s) => s.remove());
      if (clean(copy.textContent)) text.push(para(document, clean(copy.textContent)));
    }
  }

  const btn = article.querySelector('a.single-blog-article__button[href]');
  if (btn && clean(btn.textContent)) text.push(para(document, link(document, btn.getAttribute('href'), clean(btn.textContent))));

  // author/date is duplicated (mobile d-sm-none + desktop d-sm-flex); use one copy
  const additional = article.querySelector('.single-blog-article__additional.d-sm-flex')
    || article.querySelector('.single-blog-article__additional');
  const by = additional && byline(document, additional, 'single-blog-article');
  if (by) text.push(by);
  return [img ? link(document, href, img) : '', text];
}

function articlesIn(scope) {
  return Array.from(scope.querySelectorAll('.blogs-article'))
    .filter((a) => !a.parentElement.closest('.blogs-article'));
}

/** Removes a hidden filter grid and, once empty, the grids container. */
function dropHiddenGrid(element) {
  const grids = element.closest(GRIDS);
  const section = element.closest('section.blogs') || element;
  section.remove();
  if (grids && !grids.querySelector('.blogs-article')) grids.remove();
}

export default function parse(element, { document }) {
  // hidden per-filter grids: data only (consumed by the landing grid and filter-chips)
  if (element.closest(GRIDS) || element.closest('section.blogs[data-featured]')) {
    dropHiddenGrid(element);
    return;
  }

  const highlight = element.matches('.single-blog-article') || !!element.querySelector(':scope .single-blog-article');
  const cells = [];

  if (highlight) {
    const article = element.matches('.single-blog-article') ? element : element.querySelector('.single-blog-article');
    const row = highlightRow(document, article);
    if (row) cells.push(row);
  } else {
    const seen = new Set();
    const add = (article) => {
      const href = article.querySelector('a.blogs-article__link[href]')?.getAttribute('href');
      if (!href) return;
      const key = pathKey(href);
      if (seen.has(key)) return;
      const row = proRow(document, article);
      if (!row) return;
      seen.add(key);
      cells.push(row);
    };
    articlesIn(element).forEach(add);

    // landing grid: append posts that only appear in the hidden filter grids
    const landing = element.matches('.blogs__block') && !!element.closest('section.blogs');
    if (landing) {
      document.querySelectorAll(`${GRIDS} section.blogs[data-featured]`).forEach((grid) => {
        articlesIn(grid).forEach(add);
      });
    }
  }

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'cards-post',
    variants: [highlight ? 'highlight' : 'pro'],
    cells,
  });
  element.replaceWith(block);
}
