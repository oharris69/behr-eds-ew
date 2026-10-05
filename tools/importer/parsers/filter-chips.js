/* eslint-disable */
/* global WebImporter */
/**
 * Parser for filter-chips. Base: filter-chips (custom). Source: https://www.behr.com/pro/onthejob/
 * Generated: 2026-10-01
 *
 * Source: section.filter
 *   .filter__header                                   -> row 1: <p>Featured Content:</p>
 *   desktop row (.container.d-sm-block .filter__filters; the d-sm-none mobile copy is ignored)
 *     a.filter__single-filter                         -> one row per chip
 * Chip row: [<p><a href="?featured=slug">Label</a></p>] | [<ul> of post links]
 *   "All" links to the page without ?featured and has no list (= show everything).
 *   Post lists come from the hidden snapshot grids
 *   #eds-filter-grids > section.blogs[data-featured="slug"] .blogs-article > a.blogs-article__link
 *   with an embedded fallback (same data as migration-work/pro-filters.json) when a
 *   transformer has already removed those grids.
 * Iteration is keyed on the chip anchors (siblings with distinct hrefs, never nested).
 */

const ORIGIN = 'https://www.behr.com';

// Snapshot of #eds-filter-grids (== migration-work/pro-filters.json), used only when
// the hidden grids are missing from the DOM.
const FALLBACK = {
  'architects-designers': [
    ['/pro/onthejob/blog/2027-color-of-the-year-grounded/', '2027 Color of the Year: Grounded'],
    ['/pro/onthejob/blog/how-color-transformed-stone-petal-salon-into-a-desert-inspired-retreat/', 'How Color Transformed Stone Petal Salon into a Desert-Inspired Retreat'],
    ['/pro/onthejob/blog/2026-exterior-stain-color-of-the-year-2/', '2026 Exterior Stain Color of the Year: Taupe'],
    ['/pro/onthejob/blog/painting-cabinets/', 'Pro Tips for Painting Cabinets'],
    ['/pro/onthejob/blog/designing-in-color/', 'Designing in Color'],
    ['/pro/onthejob/blog/dark-paint-color-trends/', 'Dark Paint Color Trends'],
    ['/pro/onthejob/blog/tips-from-reps/', 'Insider Tips From Behr Pro Reps'],
    ['/pro/onthejob/blog/2026-color-of-the-year-hidden-gem/', '2026 Color of the Year: Hidden Gem'],
    ['/pro/onthejob/blog/2026-commercial-color-forecast/', 'BEHR® 2026 Commercial Color Forecast'],
  ],
  'painting-contractors': [
    ['/pro/onthejob/blog/2027-color-of-the-year-grounded/', '2027 Color of the Year: Grounded'],
    ['/pro/onthejob/blog/difficult-paint-substrates/', 'Dealing with Difficult Substrates'],
    ['/pro/onthejob/blog/painting-contractor-referrals/', 'How Painting Contractors Build Reputation'],
    ['/pro/onthejob/blog/2026-exterior-stain-color-of-the-year-2/', '2026 Exterior Stain Color of the Year: Taupe'],
    ['/pro/onthejob/blog/common-commercial-paint-problems/', 'Common Commercial Paint Problems'],
    ['/pro/onthejob/blog/painting-older-homes/', 'Solving Paint Problems with Older Homes'],
    ['/pro/onthejob/blog/painting-cabinets/', 'Pro Tips for Painting Cabinets'],
    ['/pro/onthejob/blog/when-to-use-primer-guide-for-pros/', 'To Prime or Not to Prime'],
    ['/pro/onthejob/blog/dark-paint-color-trends/', 'Dark Paint Color Trends'],
  ],
  'property-facility': [
    ['/pro/onthejob/blog/2027-color-of-the-year-grounded/', '2027 Color of the Year: Grounded'],
    ['/pro/onthejob/blog/difficult-paint-substrates/', 'Dealing with Difficult Substrates'],
    ['/pro/onthejob/blog/painting-contractor-referrals/', 'How Painting Contractors Build Reputation'],
    ['/pro/onthejob/blog/2026-exterior-stain-color-of-the-year-2/', '2026 Exterior Stain Color of the Year: Taupe'],
    ['/pro/onthejob/blog/common-commercial-paint-problems/', 'Common Commercial Paint Problems'],
    ['/pro/onthejob/blog/painting-older-homes/', 'Solving Paint Problems with Older Homes'],
    ['/pro/onthejob/blog/tips-from-reps/', 'Insider Tips From Behr Pro Reps'],
    ['/pro/onthejob/blog/2026-color-of-the-year-hidden-gem/', '2026 Color of the Year: Hidden Gem'],
    ['/pro/onthejob/blog/paint-sheen-differences/', 'Paint Sheen Differences'],
  ],
  'x-most-popular': [
    ['/pro/onthejob/blog/2027-color-of-the-year-grounded/', '2027 Color of the Year: Grounded'],
    ['/pro/onthejob/blog/painting-contractor-referrals/', 'How Painting Contractors Build Reputation'],
    ['/pro/onthejob/blog/common-commercial-paint-problems/', 'Common Commercial Paint Problems'],
    ['/pro/onthejob/blog/painting-older-homes/', 'Solving Paint Problems with Older Homes'],
    ['/pro/onthejob/blog/designing-in-color/', 'Designing in Color'],
    ['/pro/onthejob/blog/2026-color-of-the-year-hidden-gem/', '2026 Color of the Year: Hidden Gem'],
    ['/pro/onthejob/blog/2026-commercial-color-forecast/', 'BEHR® 2026 Commercial Color Forecast'],
    ['/pro/onthejob/blog/2025-color-of-the-year-rumors/', '2025 Color of the Year: Rumors'],
    ['/pro/onthejob/blog/ceiling-painting-tips/', 'Pro Tips for Painting Ceilings'],
  ],
};

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function link(document, href, text) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  return a;
}

/** Slug of a chip: its ?featured= value, else its value attribute. */
function chipSlug(chip) {
  const href = chip.getAttribute('href') || '';
  try {
    const v = new URL(href, ORIGIN).searchParams.get('featured');
    if (v) return v;
  } catch (e) { /* ignore */ }
  return chip.getAttribute('value') || '';
}

/** Chip href without the ?featured parameter (for "All"). */
function withoutParam(href) {
  try {
    const url = new URL(href, ORIGIN);
    url.searchParams.delete('featured');
    return url.toString();
  } catch (e) {
    return href.replace(/[?&]featured=[^&#]*/, '');
  }
}

/** [[href, title], ...] for the posts a filter shows. */
function postsFor(document, slug) {
  const grid = Array.from(document.querySelectorAll('#eds-filter-grids section.blogs[data-featured], section.blogs[data-featured]'))
    .find((s) => s.getAttribute('data-featured') === slug);
  if (grid) {
    const seen = new Set();
    const posts = [];
    grid.querySelectorAll('.blogs-article > a.blogs-article__link[href], .blogs-article a.blogs-article__link[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (seen.has(href)) return;
      seen.add(href);
      const title = clean(a.querySelector('.blogs-article__header')?.textContent) || clean(a.textContent);
      posts.push([href, title]);
    });
    if (posts.length) return posts;
  }
  return (FALLBACK[slug] || []).map(([path, title]) => [`${ORIGIN}${path}`, title]);
}

export default function parse(element, { document }) {
  // desktop chip row; the mobile copy (.d-sm-none) duplicates it
  const row = element.querySelector('.d-sm-block .filter__filters')
    || Array.from(element.querySelectorAll('.filter__filters')).find((f) => !f.closest('.d-sm-none'))
    || element.querySelector('.filter__filters');
  const chips = row
    ? Array.from(row.querySelectorAll('a.filter__single-filter, a[href*="featured="]'))
    : [];

  if (!chips.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  const label = clean(element.querySelector('.filter__header')?.textContent);
  if (label) {
    const p = document.createElement('p');
    p.textContent = label;
    cells.push([p]);
  }

  chips.forEach((chip) => {
    const text = clean(chip.textContent);
    if (!text) return;
    const slug = chipSlug(chip);
    const href = chip.getAttribute('href') || '';
    const isAll = !slug || slug.toLowerCase() === 'all';

    const p = document.createElement('p');
    p.append(link(document, isAll ? withoutParam(href) : href, text));

    if (isAll) {
      cells.push([p, '']);
      return;
    }
    const ul = document.createElement('ul');
    postsFor(document, slug).forEach(([postHref, title]) => {
      const li = document.createElement('li');
      li.append(link(document, postHref, title || postHref));
      ul.append(li);
    });
    cells.push([p, ul.children.length ? ul : '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'filter-chips', cells });
  element.replaceWith(block);
}
