/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: ColorfullyBEHR (WordPress blog) cleanup and default-content shaping.
 *
 * Runs only on WordPress blog markup (guarded on #page.site / article.post). On any other
 * page (e.g. the EDS-based behr.com homepage) it is a no-op.
 *
 * Selectors verified in migration-work/cleaned.html (ColorfullyBEHR 2027 COTY post):
 *   <div class="cc-revoke ..."> / <div class="cc-window ... cc-banner">  cookie banner  (lines 2-3)
 *   <a class="skip-link screen-reader-text">                               (line 51)
 *   <header id="masthead" class="site-header main sticky">                 (line 52)
 *   <h5 class="postCategory">                                              (line 178)
 *   <header class="entry-header"> > <h1 class="entry-title">               (line 180)
 *   <div class="singleInfo"> > .singleInfoLeft (.postAuthor, .postDate)    (lines 183-187)
 *                            > .singleInfoRight.shareCircle (AddToAny)     (line 188)
 *   <div class="entry-content">                                            (line 226)
 *     figure.wp-block-image > img + figcaption.wp-element-caption
 *     p > strong (bold one-line subheads)
 *     div.schema-faq.wp-block-yoast-faq-block > div.schema-faq-section
 *       > strong.schema-faq-question + p.schema-faq-answer
 *   <footer class="entry-footer"> > .singleFtShare.shareCircle + .singleTags (lines 350-401)
 *   <div id="comments" class="comments-area"> (incl. #respond, #commentform) (line 405)
 *   <aside id="secondary" class="widget-area">  KEPT (fragment parser)     (line 510)
 *   <footer id="colophon" class="site-footer">                             (line 779)
 *   <div class="wprm-wrapper"> (WP Responsive Menu, mobile menu)           (line 903)
 *   <div id="addtoany"> (AddToAny share modal / overlay)                   (line 960)
 *   <div class="grecaptcha-badge"> (reCAPTCHA)                             (line 1019)
 * ChatHUE widget ids (#color-coach-overlay, #color-coach-reopen-button) are the same
 * site-wide widget verified on the behr.com homepage DOM (see behr-cleanup.js).
 *
 * LANDING PAGE (https://www.behr.com/colorfullybehr/, SiteOrigin page builder). Detected by
 * #page.site .entry-content > .panel-layout. Landing-only rules never run on articles, so the
 * article output is unchanged. Selectors verified in migration-work/cleaned.html (landing) and
 * tools/importer/bd-snapshots/www.behr.com/colorfullybehr.html:
 *   <div class="cmp-loader f-cc-loader">  cookie consent loader             (line 42)
 *   <div id="banner"> > #smartslider3-2 (Smart Slider 3)  KEPT (hero-spotlight parser) (line 168)
 *     .n2-ss-slide--focus  "Color of the Year - Slide 1" a11y slide title  (line 194)
 *     .n2-ss-slider-4 > img[src^="data:image/svg"]  slider size placeholder (line 192)
 *     img#n2-ss-5item2 (reddishLine.jpg, 66x2, alt "Image is not available") (line 209)
 *     ss3-loader, .n2_clear                                                (lines 244, 248)
 *   #news / #ask / #info  KEPT (cards-post, columns-split parsers)         (lines 265, 472, 508)
 *     .postInfo > .postShare (AddToAny .addtoany_shortcode) + .postComment  (lines 294, 329)
 *     h2 > span.cursive  -> h2 > em  (script-word convention)              (lines 272, 492, 516, 549)
 *     <p>\t</p> / <p></p> empty paragraphs in #featured                    (lines 550, 570)
 *   <div id="pg-6-3"> > #gallery  empty Instagram (snapwidget) row          (line 580)
 *
 * ORDERING: list this transformer BEFORE behr-cleanup.js and behr-sections.js, i.e.
 *   [behrBlogCleanup, behrCleanup, behrSections]
 * behr-cleanup.js removes every <header>/<footer> in afterTransform, so this transformer
 * must unwrap header.entry-header (h1) and footer.entry-footer (tags) first. footer.entry-footer
 * is only unwrapped in afterTransform because section 3's selector
 * ("article.post > footer.entry-footer .singleTags") must still match when behr-sections
 * inserts its breaks in beforeTransform.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

function isWordPressBlog(element) {
  return !!element.querySelector('#page.site article.post, article.post > div.entry-content');
}

// Blog landing page (SiteOrigin page builder rows #news, #ask, #info ...)
function isWordPressLanding(element) {
  return !!element.querySelector('#page.site .entry-content > .panel-layout');
}

// Landing content roots: the hero slider band and the page-builder content
const LANDING_ROOTS = '#banner, #front .entry-content';

function cleanupLandingBefore(doc, element) {
  WebImporter.DOMUtils.remove(element, [
    '.cmp-loader', // cookie consent loader
    '#banner .n2-ss-slide--focus', // Smart Slider a11y slide title "Color of the Year - Slide 1"
    '#banner .n2-ss-slider-4 > img[src^="data:image/svg"]', // slider aspect-ratio placeholder
    '#banner img[src*="reddishLine"]', // decorative red rule (live/snapshot src)
    '#banner .n2-ss-item-image-content img[alt="Image is not available"]', // same rule, localized src
    '#banner ss3-loader',
    '#banner .n2_clear',
    '.postInfo .postShare', // per-card AddToAny share icons
    '.postInfo .postComment', // per-card comment count
    '#pg-6-3', // empty Instagram (snapwidget) row, wrapper of #gallery
    '#gallery',
  ]);

  // Smart Slider keeps inactive/duplicate slides in the DOM; the hero has 1 slide, keep the active one
  element.querySelectorAll('#banner .n2-ss-slider').forEach((slider) => {
    if (!slider.querySelector('.n2-ss-slide.n2-ss-slide-active')) return;
    slider.querySelectorAll('.n2-ss-slide:not(.n2-ss-slide-active)').forEach((s) => s.remove());
  });

  element.querySelectorAll(LANDING_ROOTS).forEach((root) => {
    // Script-word headings: <h2><span class="cursive">Ask</span> AN EXPERT</h2> -> <h2><em>Ask</em> AN EXPERT</h2>
    root.querySelectorAll('h1 span.cursive, h2 span.cursive, h3 span.cursive, h4 span.cursive, h5 span.cursive, h6 span.cursive')
      .forEach((span) => {
        const em = doc.createElement('em');
        em.textContent = cleanText(span.textContent);
        span.replaceWith(em);
      });
    // Empty paragraphs (<p>\t</p>, <p></p>)
    root.querySelectorAll('p').forEach((p) => {
      if (!cleanText(p.textContent) && !p.querySelector('img, picture, video, iframe, a')) p.remove();
    });
  });

  // Default content around the post grid: all-caps source text in title case, and the
  // standalone "MORE MUST-READS" link authored as a primary (bold) button
  element.querySelectorAll('#news .textwidget > h2, #news .textwidget > p > a.btn').forEach((el) => {
    [...el.childNodes].filter((n) => n.nodeType === 3).forEach((n) => { n.textContent = titleCase(n.textContent); });
  });
  element.querySelectorAll('#news .textwidget > p > a.btn').forEach((a) => {
    const strong = doc.createElement('strong');
    a.replaceWith(strong);
    strong.append(a);
  });
}

// "MORE MUST-READS" -> "More Must-Reads"; mixed-case text is left as authored
function titleCase(text) {
  if (text !== text.toUpperCase()) return text;
  return text.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, sep, c) => sep + c.toUpperCase());
}

function unwrap(el) {
  if (!el || !el.parentNode) return;
  while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
  el.remove();
}

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

// Bold one-line paragraph: <p><strong>Text</strong></p> with no other text, no links/media.
function getBoldSubheadText(p) {
  const meaningful = [...p.childNodes].filter((n) => !(n.nodeType === 3 && !n.textContent.trim()));
  if (meaningful.length !== 1) return null;
  const only = meaningful[0];
  if (only.nodeType !== 1 || !['STRONG', 'B'].includes(only.tagName)) return null;
  if (only.querySelector('a, img, picture, br')) return null;
  const text = cleanText(only.textContent);
  if (!text || text.length > 120) return null;
  return text;
}

function convertSubheadings(document, content) {
  // Per authoring analysis 2.1: top-level subheads ("Where to Use Grounded Throughout the Home",
  // "Using Grounded on Home Exteriors") -> h2; room subheads ("Dining Rooms", "Kitchen Cabinetry",
  // "Bedrooms and Bathrooms") -> h3. The WP source has no level information, so the first subhead
  // and any subhead of 4+ words become h2; short (1-3 word) subheads become h3.
  let seenH2 = false;
  content.querySelectorAll(':scope > p').forEach((p) => {
    const text = getBoldSubheadText(p);
    if (!text) return;
    const words = text.split(' ').length;
    const level = (!seenH2 || words >= 4) ? 'h2' : 'h3';
    if (level === 'h2') seenH2 = true;
    const heading = document.createElement(level);
    heading.textContent = text;
    p.replaceWith(heading);
  });
}

function convertFigures(document, content) {
  // figure.wp-block-image > img + figcaption -> img followed by <p><em>caption</em></p>
  content.querySelectorAll('figure.wp-block-image').forEach((figure) => {
    const media = figure.querySelector('picture') || figure.querySelector('img');
    const caption = figure.querySelector('figcaption');
    const nodes = [];
    if (media) {
      const imgP = document.createElement('p');
      imgP.append(media);
      nodes.push(imgP);
    }
    if (caption && cleanText(caption.textContent)) {
      caption.querySelectorAll('strong, b').forEach((s) => unwrap(s));
      // drop leading/trailing <br> (seen in figcaption "<br>wall: Grounded")
      while (caption.firstChild && (caption.firstChild.nodeName === 'BR'
        || (caption.firstChild.nodeType === 3 && !caption.firstChild.textContent.trim()))) {
        caption.firstChild.remove();
      }
      while (caption.lastChild && (caption.lastChild.nodeName === 'BR'
        || (caption.lastChild.nodeType === 3 && !caption.lastChild.textContent.trim()))) {
        caption.lastChild.remove();
      }
      const em = document.createElement('em');
      while (caption.firstChild) em.append(caption.firstChild);
      const capP = document.createElement('p');
      capP.append(em);
      nodes.push(capP);
    }
    if (nodes.length) figure.replaceWith(...nodes);
    else figure.remove();
  });
}

function convertFaq(document, content) {
  // Per authoring analysis 2.2: each question -> <h3>Q: ...</h3>, answer -> <p>A: ...</p>
  content.querySelectorAll('div.schema-faq').forEach((faq) => {
    const nodes = [];
    faq.querySelectorAll('div.schema-faq-section').forEach((item) => {
      const q = item.querySelector('.schema-faq-question');
      const a = item.querySelector('.schema-faq-answer');
      if (q && cleanText(q.textContent)) {
        const h3 = document.createElement('h3');
        h3.textContent = cleanText(q.textContent);
        nodes.push(h3);
      }
      if (a) {
        a.removeAttribute('class');
        nodes.push(a);
      }
    });
    if (nodes.length) faq.replaceWith(...nodes);
    else faq.remove();
  });
}

function removeEmptyParagraphs(content) {
  content.querySelectorAll('p').forEach((p) => {
    if (!cleanText(p.textContent) && !p.querySelector('img, picture, video, iframe')) p.remove();
  });
}

export default function transform(hookName, element, payload) {
  const isLanding = isWordPressLanding(element);
  if (!isWordPressBlog(element) && !isLanding) return;
  const doc = element.ownerDocument || document; // importer document (fallback: global)

  if (hookName === TransformHook.beforeTransform && isLanding) cleanupLandingBefore(doc, element);

  if (hookName === TransformHook.beforeTransform) {
    // Non-authorable chrome, widgets and plugin overlays
    WebImporter.DOMUtils.remove(element, [
      '.cc-revoke', // cookie banner "Cookie Policy" tab
      '.cc-window', // cookie consent banner
      '.skip-link',
      '#masthead', // site header
      '#colophon', // site footer
      '.wprm-wrapper', // WP Responsive Menu (mobile menu)
      '#mg-wprm-wrap',
      '#wprmenu_bar',
      '#addtoany', // AddToAny share modal / overlay
      '.grecaptcha-badge', // reCAPTCHA badge
      '#color-coach-overlay', // ChatHUE widget
      '#color-coach-reopen-button',
      '.singleInfoRight.shareCircle', // byline share icons
      '.singleFtShare', // "SHARE THIS POST" footer share bar
      '#comments', // comments area + comment form
      'script',
      'style',
      'noscript',
      'link',
    ]);

    // Byline: "by Kayla Kratz" + "August 26, 2026" -> <p>by Kayla Kratz | August 26, 2026</p>
    element.querySelectorAll('article.post div.singleInfo').forEach((info) => {
      const author = cleanText(info.querySelector('.postAuthor')?.textContent);
      const date = cleanText(info.querySelector('.postDate')?.textContent);
      const text = [author, date].filter(Boolean).join(' | ');
      if (text) {
        const p = doc.createElement('p');
        p.textContent = text;
        info.replaceWith(p);
      } else {
        info.remove();
      }
    });

    // Title wrapper: keep the h1, drop the <header> wrapper (behr-cleanup removes all <header>)
    element.querySelectorAll('article.post > header.entry-header').forEach(unwrap);

    // Article body default content
    element.querySelectorAll('article.post > div.entry-content').forEach((content) => {
      convertFigures(doc, content);
      convertSubheadings(doc, content);
      convertFaq(doc, content);
      removeEmptyParagraphs(content);
    });
  }

  if (hookName === TransformHook.afterTransform) {
    // Category eyebrow h5 -> paragraph (CSS styles it as the red uppercase eyebrow)
    element.querySelectorAll('article.post > h5.postCategory').forEach((h5) => {
      const p = doc.createElement('p');
      p.textContent = cleanText(h5.textContent);
      h5.replaceWith(p);
    });

    // Tags footer: keep the tag list (and any section-break <hr> placed inside), drop the wrapper
    element.querySelectorAll('article.post > footer.entry-footer').forEach(unwrap);

    // Remaining iframes are third-party utility frames (AddToAny, reCAPTCHA); keep embeds in the body
    element.querySelectorAll('iframe').forEach((iframe) => {
      if (!iframe.closest('.entry-content')) iframe.remove();
    });

    // Any leftover WP chrome that survived parsing
    WebImporter.DOMUtils.remove(element, ['#masthead', '#colophon', '.wprm-wrapper', '#addtoany', '.grecaptcha-badge']);
  }
}
