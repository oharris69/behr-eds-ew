const PARAM = 'featured';
const EVENT = 'filter-chips:change';
const CARD = '.cards-post-card';

/**
 * Normalises a link to a comparable path: no origin, no trailing slash,
 * lowercase.
 * @param {string} href
 * @returns {string}
 */
function toPath(href) {
  try {
    const { pathname } = new URL(href, window.location.href);
    return pathname.replace(/\/+$/, '').toLowerCase() || '/';
  } catch {
    return '';
  }
}

/**
 * Turns a chip label into a URL slug ("Painting Contractors" -> painting-contractors).
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return text.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Finds the post grid to filter: the first .cards-post.pro block after this
 * block in document order, else the first .cards-post after it. (A featured
 * "highlight" post usually sits between the chips and the grid and must not
 * be filtered.)
 * @param {Element} block
 * @returns {Element|undefined}
 */
function findTarget(block) {
  const root = block.closest('main') || document;
  const following = [...root.querySelectorAll('.cards-post')]
    // eslint-disable-next-line no-bitwise
    .filter((el) => block.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  return following.find((el) => el.classList.contains('pro')) || following[0];
}

/**
 * The post link of a card: its title link, else its first link.
 * @param {Element} card
 * @returns {string}
 */
function cardPath(card) {
  const a = card.querySelector('.cards-post-card-title a[href]') || card.querySelector('a[href]');
  return a ? toPath(a.href) : '';
}

/**
 * Parses a chip row: [label (optionally a ?featured=slug link)] | [optional ul of post links].
 * @param {Element} row
 * @returns {{ label: string, slug: string, paths: Set<string>|null }|null}
 */
function parseChip(row) {
  const cells = [...row.children];
  const listCell = cells.find((cell) => cell.querySelector('ul, ol'));
  const labelCell = cells.find((cell) => cell !== listCell && cell.textContent.trim())
    || (listCell && listCell.querySelector(':scope > :not(ul, ol)'))
    || null;
  if (!labelCell) return null;

  // label: first heading/paragraph text outside of any list
  const labelSource = labelCell.querySelector(':scope > :not(ul, ol)') || labelCell;
  const label = labelSource.textContent.replace(/\s+/g, ' ').trim();
  if (!label) return null;

  const link = labelSource.querySelector('a[href]');
  let slug = '';
  if (link) {
    try {
      slug = new URL(link.href, window.location.href).searchParams.get(PARAM) || '';
    } catch { /* fall back to the label */ }
  }
  slug = slugify(slug || label);

  let paths = null;
  const list = listCell && listCell.querySelector('ul, ol');
  if (list) {
    paths = new Set([...list.querySelectorAll('a[href]')].map((a) => toPath(a.href)).filter(Boolean));
  }
  return { label, slug, paths };
}

/**
 * Filter Chips: a "Featured Content:" label and a row of pill chips that
 * filter the next cards-post block on the page. A chip shows the cards whose
 * post link (compared by pathname) is in the chip's list; a chip without a
 * list shows everything. The choice is kept in ?featured=slug
 * (history.replaceState, no reload).
 *
 * Contract with cards-post: non-matching card <li>s get `hidden` and
 * `data-filtered-out`; the cards-post block receives a `filter-chips:change`
 * event (detail: { slug, paths }) and carries `data-filter` with the active
 * slug. cards-post may be decorated before or after this block.
 *
 * Content contract:
 *   row 1 (optional): [label p, e.g. "Featured Content:"] - a single-cell row without a list
 *   rows 2..n:        [chip label, optionally a link with ?featured=slug]
 *                     | [optional ul of post links; no list = show all]
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  let labelText = '';
  const first = rows[0];
  // a leading single-cell row without list or link is the label, unless it
  // is a bare "All" chip (author omitted the label row)
  if (first && first.children.length < 2 && !first.querySelector('ul, ol, a[href]')) {
    const text = first.textContent.replace(/\s+/g, ' ').trim();
    if (slugify(text) !== 'all') {
      labelText = text;
      rows.shift();
    }
  }

  const chips = rows.map(parseChip).filter(Boolean);
  if (!chips.length) {
    block.replaceChildren();
    return;
  }
  // the default chip is the first one without a list ("All"), else the first one
  const fallback = chips.find((c) => !c.paths) || chips[0];

  const uid = `filter-chips-${Math.random().toString(36).slice(2, 8)}`;
  const parts = [];
  if (labelText) {
    const label = document.createElement('p');
    label.className = 'filter-chips-label';
    label.id = `${uid}-label`;
    label.textContent = labelText;
    parts.push(label);
  }

  const group = document.createElement('div');
  group.className = 'filter-chips-list';
  group.setAttribute('role', 'group');
  if (labelText) group.setAttribute('aria-labelledby', `${uid}-label`);
  else group.setAttribute('aria-label', 'Filter posts');

  const buttons = chips.map((chip) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-chips-chip';
    button.textContent = chip.label;
    button.dataset.slug = chip.slug;
    button.setAttribute('aria-pressed', 'false');
    group.append(button);
    return button;
  });
  parts.push(group);

  // announces how many posts match after a change
  const status = document.createElement('p');
  status.className = 'filter-chips-status';
  status.setAttribute('role', 'status');
  parts.push(status);

  block.replaceChildren(...parts);

  const target = findTarget(block);
  let active = fallback;

  const apply = (announce) => {
    if (!target) return;
    const cards = [...target.querySelectorAll(CARD)];
    let shown = 0;
    cards.forEach((card) => {
      const match = !active.paths || active.paths.has(cardPath(card));
      card.hidden = !match;
      if (match) {
        card.removeAttribute('data-filtered-out');
        shown += 1;
      } else card.dataset.filteredOut = '';
    });
    target.dataset.filter = active.slug;
    target.dispatchEvent(new CustomEvent(EVENT, {
      detail: { slug: active.slug, paths: active.paths ? [...active.paths] : null },
    }));
    if (announce && cards.length) {
      status.textContent = `${shown} ${shown === 1 ? 'post' : 'posts'} shown`;
    }
  };

  const select = (chip, { announce = false, push = false } = {}) => {
    active = chip;
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(chips[i] === chip)));
    if (push) {
      const url = new URL(window.location.href);
      if (chip === fallback) url.searchParams.delete(PARAM);
      else url.searchParams.set(PARAM, chip.slug);
      window.history.replaceState(window.history.state, '', url);
    }
    apply(announce);
  };

  buttons.forEach((button, i) => button.addEventListener('click', () => {
    if (chips[i] !== active) select(chips[i], { announce: true, push: true });
  }));

  const param = new URLSearchParams(window.location.search).get(PARAM);
  const fromUrl = param && chips.find((c) => c.slug === slugify(param));
  select(fromUrl || fallback);

  // cards-post decorated later (or re-rendered): filter its cards once they exist
  if (target && typeof MutationObserver !== 'undefined') {
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      queueMicrotask(() => {
        pending = false;
        const cards = [...target.querySelectorAll(CARD)];
        const stale = cards.some((card) => {
          const match = !active.paths || active.paths.has(cardPath(card));
          return card.hidden === match;
        });
        if (stale) apply(false);
      });
    }).observe(target, { childList: true, subtree: true });
  }
}
