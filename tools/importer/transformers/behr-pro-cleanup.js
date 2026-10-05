/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: On the Job with BEHR Pro (WordPress, theme "behr") cleanup and default-content shaping.
 *
 * Template "pro" (https://www.behr.com/pro/onthejob/). Guarded: a no-op unless the On the Job
 * markup is present (section.hero-swiper + section.blogs, or wp-content/themes/behr assets), so
 * the behr.com homepage and ColorfullyBEHR blog imports are unaffected.
 *
 * Selectors verified in tools/importer/bd-snapshots/www.behr.com/pro/onthejob.html and
 * migration-work/cleaned.html:
 *   <div class="cc-revoke ..."> / <div class="cc-window ... cc-banner">  cookie banner  (line 97)
 *   <div class="cmp-loader f-cc-loader">  cookie consent loader          (line 101)
 *   <div class="loader-wrapper"> page loader                             (line 105)
 *   <header class="header hidden">  Back to BEHR Pro bar, form.header__search, .header__find,
 *     a.header__logo, .header__menu, a.header__button (Contact a Pro Rep)  (lines 117-180)
 *   <div class="header__dropdown d-flex d-md-none">  mobile menu          (line 182)
 *   section.hero-swiper  KEPT (carousel-hero parser)                     (line 192)
 *     .swiper-slide-duplicate (loop clones), .swiper-notification,
 *     .hero-swiper__pagination (bullets)                                 (lines 556, 574, 576)
 *   section.filter  KEPT (filter-chips parser)                           (line 580)
 *     > .d-sm-none.d-block  mobile duplicate chips (+ .filter__slide-icon arrows) (line 604)
 *   section.most-recent-blog  KEPT (cards-post parser)                   (line 635)
 *     .single-blog-article__additional.d-sm-none  mobile duplicate author/date (line 653)
 *   section.blogs  KEPT (cards-post parser); .blogs__load-more JS control (line 1826)
 *   section.trends                                                         (line 1832)
 *     .trends__header -> <h2>; .d-sm-block > a.trends__link -> <p><a>See All Posts</a></p>;
 *     .row.d-sm-none  mobile duplicate "See All Posts"                     (line 2066)
 *   section.shop  .shop__header -> <h2>, .shop__description -> <p>, .shop__publisher -> <p><img></p>
 *     .shop__products KEPT (fifty-fifty parser)                          (line 2076)
 *   <footer class="footer">  dark On the Job footer (quick links, questions, newsletter, legal) (line 2130)
 *   <div id="liteRegModal" class="liteRegMoal modal">  newsletter subscribe/unsubscribe modal (line 2178)
 *   tracking: iframes, img pixels (pixel.logtrackback.com, lciapi.ninthdecimal.com, pages03.net) (2324, 2344)
 *   <div id="eds-filter-grids" hidden>  audience grids for the cards-post parser:
 *     KEPT in beforeTransform, removed in afterTransform                 (line 2345)
 * reCAPTCHA (.grecaptcha-badge) and ChatHUE (#color-coach-overlay, #color-coach-reopen-button)
 * are the same site-wide widgets verified in behr-blog-cleanup.js / behr-cleanup.js.
 *
 * ORDERING: [behrProCleanup, behrCleanup, behrSections]. Section elements (section.hero-swiper,
 * .filter, .most-recent-blog, .blogs, .trends, .shop) are never removed, so behr-sections can
 * place its breaks in beforeTransform. The first section.blogs in document order is the real grid
 * (the hidden audience grids are appended after the footer).
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };
const MARKER = 'data-behr-pro';

function isOnTheJob(element) {
  if (element.hasAttribute && element.hasAttribute(MARKER)) return true;
  if (element.querySelector('section.hero-swiper') && element.querySelector('section.blogs')) return true;
  return !!element.querySelector('img[src*="wp-content/themes/behr/"], #eds-filter-grids > section.blogs');
}

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function replaceWithText(doc, el, tag) {
  const node = doc.createElement(tag);
  node.textContent = cleanText(el.textContent);
  el.replaceWith(node);
  return node;
}

const CHROME = [
  // cookie consent + loaders
  '.cc-revoke',
  '.cc-window',
  '.cmp-loader',
  '.loader-wrapper',
  // On the Job header + mobile menu
  'header.header',
  '.header__dropdown',
  // dark On the Job footer + newsletter modal
  'footer.footer',
  '#liteRegModal',
  // widgets
  '.grecaptcha-badge',
  '#color-coach-overlay',
  '#color-coach-reopen-button',
  // tracking
  'img[src*="pixel.logtrackback.com"]',
  'img[src*="ninthdecimal.com"]',
  'img[src*="pages03.net"]',
  'iframe',
  'script',
  'style',
  'noscript',
  'link',
  // responsive duplicates and JS controls
  'section.filter .d-sm-none',
  'section.filter .filter__slide-icon',
  'section.most-recent-blog .single-blog-article__additional.d-sm-none',
  'section.trends .d-sm-none',
  'section.hero-swiper .swiper-slide-duplicate',
  'section.hero-swiper .swiper-notification',
  'section.hero-swiper .hero-swiper__pagination',
  '.blogs__load-more',
];

export default function transform(hookName, element, payload) {
  if (!isOnTheJob(element)) return;
  const doc = element.ownerDocument || document;

  if (hookName === TransformHook.beforeTransform) {
    element.setAttribute(MARKER, '');
    WebImporter.DOMUtils.remove(element, CHROME);

    // Trends: heading + desktop "See All Posts" link (arrow icon dropped)
    element.querySelectorAll('section.trends .trends__header').forEach((el) => replaceWithText(doc, el, 'h2'));
    element.querySelectorAll('section.trends .d-sm-block > a.trends__link').forEach((a) => {
      const link = doc.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = cleanText(a.textContent);
      const p = doc.createElement('p');
      p.append(link);
      a.replaceWith(p);
    });

    // Shop BEHR Products: heading, description (keeps <b>), Home Depot logo
    element.querySelectorAll('section.shop .shop__header').forEach((el) => replaceWithText(doc, el, 'h2'));
    element.querySelectorAll('section.shop .shop__description').forEach((el) => {
      const p = doc.createElement('p');
      [...el.childNodes].forEach((n) => {
        if (n.nodeType === 3) n.textContent = n.textContent.replace(/\s+/g, ' ');
        p.append(n);
      });
      if (p.firstChild && p.firstChild.nodeType === 3) p.firstChild.textContent = p.firstChild.textContent.trimStart();
      if (p.lastChild && p.lastChild.nodeType === 3) p.lastChild.textContent = p.lastChild.textContent.trimEnd();
      el.replaceWith(p);
    });
    element.querySelectorAll('section.shop .shop__publisher').forEach((el) => {
      const media = el.querySelector('picture') || el.querySelector('img');
      if (!media) { el.remove(); return; }
      const p = doc.createElement('p');
      p.append(media);
      el.replaceWith(p);
    });
  }

  if (hookName === TransformHook.afterTransform) {
    // Audience grids already consumed by the cards-post parser; any chrome that survived parsing
    WebImporter.DOMUtils.remove(element, ['#eds-filter-grids', ...CHROME]);

    // Empty paragraphs, then empty layout divs (deepest first so nested wrappers collapse)
    element.querySelectorAll('p').forEach((p) => {
      if (!cleanText(p.textContent) && !p.querySelector('img, picture, video, a, br')) p.remove();
    });
    [...element.querySelectorAll('div')].reverse().forEach((div) => {
      if (!cleanText(div.textContent) && !div.querySelector('img, picture, video, table, hr, a')) div.remove();
    });

    element.removeAttribute(MARKER);
  }
}
