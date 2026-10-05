import { createOptimizedPicture } from '../../scripts/aem.js';

const HEADINGS = 'h1, h2, h3, h4, h5, h6';

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
 * Picks the post title among the card headings: the first heading holding a
 * link, else the last heading (a label heading always precedes the title).
 * @param {Element[]} headings
 * @returns {Element|undefined}
 */
function pickTitle(headings) {
  return headings.find((h) => h.querySelector('a[href]')) || headings[headings.length - 1];
}

/**
 * Splits a card's text into eyebrow / label / title / excerpt / cta / date by
 * position and shape (never by text), adding semantic classes.
 * "pro" / "highlight" options (rich): the last paragraph after the title is
 * the byline ("[avatar] Author • date"), even when it is the only one.
 * @param {Element} body
 * @param {boolean} feature
 * @param {{ rich?: boolean, highlight?: boolean }} [opts]
 * @returns {{ title: Element|undefined, cta: Element|undefined, date: Element|undefined,
 *   byline: Element|undefined }}
 */
function classifyBody(body, feature, opts = {}) {
  const { rich = false, highlight = false } = opts;
  let headings = [...body.children].filter((el) => el.matches(HEADINGS));

  // no heading authored: when there are several link-only paragraphs, the
  // first is the title link and a later one is the CTA
  if (!headings.length) {
    const linkOnly = [...body.children].filter(isLinkOnly);
    if (linkOnly.length > 1) {
      const h3 = document.createElement('h3');
      h3.append(...linkOnly[0].childNodes);
      linkOnly[0].replaceWith(h3);
      headings = [h3];
    }
  }

  const title = pickTitle(headings);
  if (title) title.classList.add('cards-post-card-title');

  const children = [...body.children];
  const titleIndex = title ? children.indexOf(title) : -1;
  let cta;
  const after = [];

  children.forEach((el, i) => {
    if (el === title) return;
    if (i < titleIndex) {
      // before the title: a heading is a label, a paragraph is the eyebrow
      el.classList.add(el.matches(HEADINGS) ? 'cards-post-card-label' : 'cards-post-card-eyebrow');
      return;
    }
    if (!cta && isLinkOnly(el)) {
      cta = el;
      return;
    }
    after.push(el);
  });

  // date: the last plain paragraph, when it follows the CTA (or, with no CTA,
  // when it is a short trailing line after an excerpt)
  let date;
  let byline;
  const last = after[after.length - 1];
  if (rich) {
    // byline: the last paragraph after the title (avatar + "Author • date");
    // with several trailing paragraphs, a long plain one is still an excerpt
    if (last && last.tagName === 'P' && last.textContent.trim()) {
      const shaped = last.querySelector('picture') || /[•·|]/.test(last.textContent);
      if (shaped || after.length === 1 || last.textContent.trim().length <= 60) byline = last;
    }
  } else if (last && last.tagName === 'P' && !last.querySelector('a, picture')) {
    const afterCta = cta && children.indexOf(last) > children.indexOf(cta);
    const shortTrailer = !cta && after.length > 1 && last.textContent.trim().length <= 40;
    if (!feature && (afterCta || shortTrailer)) date = last;
    if (last.querySelector('time')) date = last;
  }

  after.forEach((el) => {
    if (el === date || el === byline) return;
    if (el.tagName === 'P' && !el.querySelector('picture')) el.classList.add('cards-post-card-excerpt');
  });

  if (cta) {
    cta.classList.add('cards-post-card-cta');
    const a = cta.querySelector('a');
    if ((feature || highlight) && !a.classList.contains('button')) {
      cta.classList.add('button-wrapper');
      a.classList.add('button', 'primary');
    }
  }
  if (date) date.classList.add('cards-post-card-date');

  // label headings: wrap the leading <em> word as a script accent hook
  body.querySelectorAll('.cards-post-card-label em').forEach((em) => em.classList.add('cards-post-card-script'));

  return {
    title, cta, date, byline,
  };
}

/**
 * Splits a "Tag 1, Tag 2" eyebrow into tag pills (linked tags stay links).
 * @param {Element} eyebrow
 */
function buildTags(eyebrow) {
  const links = [...eyebrow.querySelectorAll('a[href]')];
  const tags = links.length
    ? links
    : eyebrow.textContent.split(',').map((t) => t.trim()).filter(Boolean);
  if (!tags.length) return;
  eyebrow.classList.add('cards-post-card-tags');
  eyebrow.replaceChildren(...tags.map((tag) => {
    const el = typeof tag === 'string' ? document.createElement('span') : tag;
    if (typeof tag === 'string') el.textContent = tag;
    el.classList.add('cards-post-card-tag');
    return el;
  }));
}

/**
 * Marks up a byline "[avatar] Author • 1 month ago": the avatar picture and,
 * when the separator sits at the top level, author / date spans.
 * @param {Element} byline
 */
function buildByline(byline) {
  byline.classList.add('cards-post-card-byline');
  byline.querySelectorAll('picture').forEach((pic, i) => {
    if (i === 0) pic.classList.add('cards-post-card-avatar');
    else pic.remove();
  });
  const nodes = [...byline.childNodes];
  const sepIndex = nodes.findIndex((n) => n.nodeType === Node.TEXT_NODE && /[•·|]/.test(n.textContent));
  if (sepIndex < 0) return;
  const sepNode = nodes[sepIndex];
  const [beforeText, ...rest] = sepNode.textContent.split(/[•·|]/);
  const author = document.createElement('span');
  author.className = 'cards-post-card-author';
  const date = document.createElement('span');
  date.className = 'cards-post-card-date';
  nodes.slice(0, sepIndex).forEach((n) => {
    if (!(n.nodeType === Node.ELEMENT_NODE && n.matches('picture.cards-post-card-avatar'))) author.append(n);
  });
  if (beforeText.trim()) author.append(beforeText.trimEnd());
  const afterText = rest.join(' ').trimStart();
  if (afterText) date.append(afterText);
  date.append(...nodes.slice(sepIndex + 1));
  sepNode.remove();
  // trim whitespace left at the edges of the author span
  const lead = author.firstChild;
  if (lead?.nodeType === Node.TEXT_NODE) lead.textContent = lead.textContent.trimStart();
  [author, date].forEach((span) => {
    if (span.textContent.trim() || span.children.length) byline.append(span);
  });
}

const PAGE_SIZE = 9;

/**
 * "pro" option: shows the first 9 visible cards and a Load More button that
 * reveals 9 more per click. Cards hidden by filter-chips (data-filtered-out)
 * are skipped; a `filter-chips:change` event resets to the first 9.
 * @param {Element} block
 * @param {HTMLUListElement} ul
 * @returns {HTMLDivElement}
 */
function setupLoadMore(block, ul) {
  let limit = PAGE_SIZE;
  const more = document.createElement('div');
  more.className = 'cards-post-more';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button secondary';
  button.textContent = 'Load More';
  more.append(button);

  const visibleCards = () => [...ul.children].filter((li) => !li.hasAttribute('data-filtered-out'));
  const render = () => {
    const visible = visibleCards();
    [...ul.children].forEach((li) => {
      const i = visible.indexOf(li);
      li.classList.toggle('cards-post-card-paged-out', i >= limit);
    });
    more.hidden = visible.length <= limit;
  };

  button.addEventListener('click', () => {
    const start = limit;
    limit += PAGE_SIZE;
    render();
    // move focus to the first newly revealed post
    const first = visibleCards()[start];
    const link = first && (first.querySelector('.cards-post-card-title a[href]') || first.querySelector('a[href]:not([tabindex="-1"])'));
    if (link) link.focus();
  });
  block.addEventListener('filter-chips:change', () => {
    limit = PAGE_SIZE;
    render();
  });
  render();
  return more;
}

/**
 * Cards Post: blog post teaser cards.
 * Content contract, per row: [picture (optionally linked)] | [text].
 * Default text: category eyebrow <p>, <h3><a>title</a></h3>, excerpt <p>,
 * link-only "read more" <p>, date <p> (last).
 * "feature" option text: <h2> label (leading <em> = script word),
 * <h3><a>title</a></h3>, excerpt <p>, link-only CTA <p>.
 * Any part may be omitted; cells may be swapped or merged. An unlinked image
 * is linked to the title's href.
 * @param {Element} block
 */
export default function decorate(block) {
  const feature = block.classList.contains('feature');
  const pro = block.classList.contains('pro');
  const highlight = block.classList.contains('highlight');
  // pro / highlight: image first, tag pills, byline with avatar
  const rich = pro || highlight;
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-post-card';

    const media = document.createElement('div');
    media.className = 'cards-post-card-image';
    const body = document.createElement('div');
    body.className = 'cards-post-card-body';

    [...row.children].forEach((cell) => {
      const picture = rich
        // the card image is a picture standing alone, never the byline avatar
        ? [...cell.querySelectorAll('picture')].find((pic) => {
          const holder = pic.closest('p');
          return !holder || holder.textContent.trim() === '';
        })
        : cell.querySelector('picture');
      if (picture && !media.children.length) {
        const link = picture.closest('a');
        const node = link && cell.contains(link) ? link : picture;
        const holder = node.parentElement;
        media.append(node);
        const empty = !holder.textContent.trim() && !holder.children.length;
        if (holder !== cell && empty) holder.remove();
      }
      [...cell.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (!node.textContent.trim()) return;
          const p = document.createElement('p');
          p.textContent = node.textContent.trim();
          body.append(p);
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (!node.textContent.trim() && !node.querySelector('img, picture')) return;
        body.append(node);
      });
    });

    // only one image per card; drop extra pictures from the text
    // (pro / highlight keep a picture inside a text line: the byline avatar)
    body.querySelectorAll('picture').forEach((pic) => {
      const holder = pic.closest('p') || pic;
      if (holder.textContent.trim()) {
        if (!rich) pic.remove();
      } else holder.remove();
    });

    const {
      title, cta, date, byline,
    } = classifyBody(body, feature, { rich, highlight });
    if (rich) {
      body.querySelectorAll('picture').forEach((pic) => {
        if (!byline || !byline.contains(pic)) pic.remove();
      });
      const eyebrow = body.querySelector('.cards-post-card-eyebrow');
      if (eyebrow) buildTags(eyebrow);
      if (byline) {
        buildByline(byline);
        // highlight: byline sits above the Read More button
        if (cta) body.append(byline, cta);
      }
    }

    // link the image to the post when the author did not
    if (media.children.length && !media.querySelector('a')) {
      const source = (title && title.querySelector('a[href]')) || (cta && cta.querySelector('a[href]'));
      if (source) {
        const a = document.createElement('a');
        a.href = source.href;
        a.tabIndex = -1;
        a.setAttribute('aria-hidden', 'true');
        a.append(...media.childNodes);
        media.append(a);
      }
    }

    if (rich) {
      if (media.children.length) li.append(media);
      if (body.children.length) li.append(body);
    } else {
      if (body.children.length) li.append(body);
      if (media.children.length) li.append(media);
    }
    if (date) {
      const meta = document.createElement('div');
      meta.className = 'cards-post-card-meta';
      meta.append(date);
      li.append(meta);
    }
    if (li.children.length) ul.append(li);
  });

  ul.querySelectorAll('.cards-post-card-image picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [
      { media: '(min-width: 768px)', width: '600' },
      { width: '750' },
    ]));
  });

  ul.querySelectorAll('.cards-post-card-avatar > img').forEach((img) => {
    const pic = createOptimizedPicture(img.src, img.alt, false, [{ width: '96' }]);
    pic.classList.add('cards-post-card-avatar');
    img.closest('picture').replaceWith(pic);
  });

  if (pro && ul.children.length > PAGE_SIZE) {
    block.replaceChildren(ul, setupLoadMore(block, ul));
    return;
  }
  block.replaceChildren(ul);
}
