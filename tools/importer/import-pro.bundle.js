/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-pro.js
  var import_pro_exports = {};
  __export(import_pro_exports, {
    default: () => import_pro_default
  });

  // tools/importer/parsers/carousel-hero.js
  function clean(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function bgUrl(el) {
    if (!el) return "";
    const style = el.getAttribute("style") || "";
    const m = style.match(/background-image\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    return m ? m[1] : "";
  }
  function slideImage(document2, slide) {
    const holder = slide.querySelector('.hero-swiper__slide-image, [class*="slide-image"]') || slide;
    const img = holder.querySelector('img[src]:not([src^="data:"])') || slide.querySelector('img[src]:not([src^="data:"])');
    const src = img && img.getAttribute("src") || bgUrl(holder) || bgUrl(slide);
    if (!src) return "";
    const out = document2.createElement("img");
    out.src = src;
    out.alt = img && img.getAttribute("alt") || "";
    return out;
  }
  function parse(element, { document: document2 }) {
    let slides = Array.from(element.querySelectorAll(".swiper-slide.hero-swiper__slide, .hero-swiper__slide"));
    if (!slides.length) slides = Array.from(element.querySelectorAll(".swiper-slide"));
    const seen = /* @__PURE__ */ new Set();
    slides = slides.filter((slide) => {
      if (slide.classList.contains("swiper-slide-duplicate")) return false;
      const key = slide.getAttribute("data-swiper-slide-index");
      if (key === null) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    slides.sort((a, b) => {
      const ia = parseInt(a.getAttribute("data-swiper-slide-index"), 10);
      const ib = parseInt(b.getAttribute("data-swiper-slide-index"), 10);
      return Number.isNaN(ia) || Number.isNaN(ib) ? 0 : ia - ib;
    });
    const cells = [];
    slides.forEach((slide) => {
      var _a, _b;
      const image2 = slideImage(document2, slide);
      const title = clean((_a = slide.querySelector('.hero-swiper__slide-header, [class*="slide-header"], h1, h2, h3')) == null ? void 0 : _a.textContent);
      const desc = clean((_b = slide.querySelector('.hero-swiper__slide-description, [class*="slide-description"]')) == null ? void 0 : _b.textContent);
      const btn = slide.querySelector("a.hero-swiper__slide-button[href], .hero-swiper__slide-inner a[href]");
      const text = [];
      if (title) {
        const h = document2.createElement(cells.length === 0 ? "h1" : "h2");
        h.textContent = title;
        text.push(h);
      }
      if (desc) {
        const p = document2.createElement("p");
        p.textContent = desc;
        text.push(p);
      }
      if (btn && clean(btn.textContent)) {
        const p = document2.createElement("p");
        const a = document2.createElement("a");
        a.href = btn.getAttribute("href");
        a.textContent = clean(btn.textContent);
        p.append(a);
        text.push(p);
      }
      if (!image2 && !text.length) return;
      cells.push([image2 || "", text.length ? text : ""]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "carousel-hero", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/filter-chips.js
  var ORIGIN = "https://www.behr.com";
  var FALLBACK = {
    "architects-designers": [
      ["/pro/onthejob/blog/2027-color-of-the-year-grounded/", "2027 Color of the Year: Grounded"],
      ["/pro/onthejob/blog/how-color-transformed-stone-petal-salon-into-a-desert-inspired-retreat/", "How Color Transformed Stone Petal Salon into a Desert-Inspired Retreat"],
      ["/pro/onthejob/blog/2026-exterior-stain-color-of-the-year-2/", "2026 Exterior Stain Color of the Year: Taupe"],
      ["/pro/onthejob/blog/painting-cabinets/", "Pro Tips for Painting Cabinets"],
      ["/pro/onthejob/blog/designing-in-color/", "Designing in Color"],
      ["/pro/onthejob/blog/dark-paint-color-trends/", "Dark Paint Color Trends"],
      ["/pro/onthejob/blog/tips-from-reps/", "Insider Tips From Behr Pro Reps"],
      ["/pro/onthejob/blog/2026-color-of-the-year-hidden-gem/", "2026 Color of the Year: Hidden Gem"],
      ["/pro/onthejob/blog/2026-commercial-color-forecast/", "BEHR\xAE 2026 Commercial Color Forecast"]
    ],
    "painting-contractors": [
      ["/pro/onthejob/blog/2027-color-of-the-year-grounded/", "2027 Color of the Year: Grounded"],
      ["/pro/onthejob/blog/difficult-paint-substrates/", "Dealing with Difficult Substrates"],
      ["/pro/onthejob/blog/painting-contractor-referrals/", "How Painting Contractors Build Reputation"],
      ["/pro/onthejob/blog/2026-exterior-stain-color-of-the-year-2/", "2026 Exterior Stain Color of the Year: Taupe"],
      ["/pro/onthejob/blog/common-commercial-paint-problems/", "Common Commercial Paint Problems"],
      ["/pro/onthejob/blog/painting-older-homes/", "Solving Paint Problems with Older Homes"],
      ["/pro/onthejob/blog/painting-cabinets/", "Pro Tips for Painting Cabinets"],
      ["/pro/onthejob/blog/when-to-use-primer-guide-for-pros/", "To Prime or Not to Prime"],
      ["/pro/onthejob/blog/dark-paint-color-trends/", "Dark Paint Color Trends"]
    ],
    "property-facility": [
      ["/pro/onthejob/blog/2027-color-of-the-year-grounded/", "2027 Color of the Year: Grounded"],
      ["/pro/onthejob/blog/difficult-paint-substrates/", "Dealing with Difficult Substrates"],
      ["/pro/onthejob/blog/painting-contractor-referrals/", "How Painting Contractors Build Reputation"],
      ["/pro/onthejob/blog/2026-exterior-stain-color-of-the-year-2/", "2026 Exterior Stain Color of the Year: Taupe"],
      ["/pro/onthejob/blog/common-commercial-paint-problems/", "Common Commercial Paint Problems"],
      ["/pro/onthejob/blog/painting-older-homes/", "Solving Paint Problems with Older Homes"],
      ["/pro/onthejob/blog/tips-from-reps/", "Insider Tips From Behr Pro Reps"],
      ["/pro/onthejob/blog/2026-color-of-the-year-hidden-gem/", "2026 Color of the Year: Hidden Gem"],
      ["/pro/onthejob/blog/paint-sheen-differences/", "Paint Sheen Differences"]
    ],
    "x-most-popular": [
      ["/pro/onthejob/blog/2027-color-of-the-year-grounded/", "2027 Color of the Year: Grounded"],
      ["/pro/onthejob/blog/painting-contractor-referrals/", "How Painting Contractors Build Reputation"],
      ["/pro/onthejob/blog/common-commercial-paint-problems/", "Common Commercial Paint Problems"],
      ["/pro/onthejob/blog/painting-older-homes/", "Solving Paint Problems with Older Homes"],
      ["/pro/onthejob/blog/designing-in-color/", "Designing in Color"],
      ["/pro/onthejob/blog/2026-color-of-the-year-hidden-gem/", "2026 Color of the Year: Hidden Gem"],
      ["/pro/onthejob/blog/2026-commercial-color-forecast/", "BEHR\xAE 2026 Commercial Color Forecast"],
      ["/pro/onthejob/blog/2025-color-of-the-year-rumors/", "2025 Color of the Year: Rumors"],
      ["/pro/onthejob/blog/ceiling-painting-tips/", "Pro Tips for Painting Ceilings"]
    ]
  };
  function clean2(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function link(document2, href, text) {
    const a = document2.createElement("a");
    a.href = href;
    a.textContent = text;
    return a;
  }
  function chipSlug(chip) {
    const href = chip.getAttribute("href") || "";
    try {
      const v = new URL(href, ORIGIN).searchParams.get("featured");
      if (v) return v;
    } catch (e) {
    }
    return chip.getAttribute("value") || "";
  }
  function withoutParam(href) {
    try {
      const url = new URL(href, ORIGIN);
      url.searchParams.delete("featured");
      return url.toString();
    } catch (e) {
      return href.replace(/[?&]featured=[^&#]*/, "");
    }
  }
  function postsFor(document2, slug) {
    const grid = Array.from(document2.querySelectorAll("#eds-filter-grids section.blogs[data-featured], section.blogs[data-featured]")).find((s) => s.getAttribute("data-featured") === slug);
    if (grid) {
      const seen = /* @__PURE__ */ new Set();
      const posts = [];
      grid.querySelectorAll(".blogs-article > a.blogs-article__link[href], .blogs-article a.blogs-article__link[href]").forEach((a) => {
        var _a;
        const href = a.getAttribute("href");
        if (seen.has(href)) return;
        seen.add(href);
        const title = clean2((_a = a.querySelector(".blogs-article__header")) == null ? void 0 : _a.textContent) || clean2(a.textContent);
        posts.push([href, title]);
      });
      if (posts.length) return posts;
    }
    return (FALLBACK[slug] || []).map(([path, title]) => [`${ORIGIN}${path}`, title]);
  }
  function parse2(element, { document: document2 }) {
    var _a;
    const row = element.querySelector(".d-sm-block .filter__filters") || Array.from(element.querySelectorAll(".filter__filters")).find((f) => !f.closest(".d-sm-none")) || element.querySelector(".filter__filters");
    const chips = row ? Array.from(row.querySelectorAll('a.filter__single-filter, a[href*="featured="]')) : [];
    if (!chips.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    const label = clean2((_a = element.querySelector(".filter__header")) == null ? void 0 : _a.textContent);
    if (label) {
      const p = document2.createElement("p");
      p.textContent = label;
      cells.push([p]);
    }
    chips.forEach((chip) => {
      const text = clean2(chip.textContent);
      if (!text) return;
      const slug = chipSlug(chip);
      const href = chip.getAttribute("href") || "";
      const isAll = !slug || slug.toLowerCase() === "all";
      const p = document2.createElement("p");
      p.append(link(document2, isAll ? withoutParam(href) : href, text));
      if (isAll) {
        cells.push([p, ""]);
        return;
      }
      const ul = document2.createElement("ul");
      postsFor(document2, slug).forEach(([postHref, title]) => {
        const li = document2.createElement("li");
        li.append(link(document2, postHref, title || postHref));
        ul.append(li);
      });
      cells.push([p, ul.children.length ? ul : ""]);
    });
    const block = WebImporter.Blocks.createBlock(document2, { name: "filter-chips", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-post-pro.js
  var GRIDS = "#eds-filter-grids";
  function clean3(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function link2(document2, href, content) {
    const a = document2.createElement("a");
    a.href = href;
    if (typeof content === "string") a.textContent = content;
    else if (content) a.append(content);
    return a;
  }
  function para(document2, ...content) {
    const p = document2.createElement("p");
    content.forEach((c) => p.append(c));
    return p;
  }
  function image(document2, img) {
    if (!img) return null;
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) return null;
    const out = document2.createElement("img");
    out.src = src;
    out.alt = img.getAttribute("alt") || "";
    return out;
  }
  function pathKey(href) {
    try {
      return new URL(href, "https://www.behr.com").pathname.replace(/\/+$/, "").toLowerCase();
    } catch (e) {
      return href;
    }
  }
  function byline(document2, scope, prefix) {
    var _a;
    const author = scope.querySelector(`.${prefix}__author`);
    const avatar = image(document2, author && author.querySelector("img"));
    const nameEl = author && (author.querySelector("p") || author.querySelector("a"));
    let name = "";
    if (nameEl) {
      const copy = nameEl.cloneNode(true);
      copy.querySelectorAll(".sr-only").forEach((s) => s.remove());
      name = clean3(copy.textContent);
    }
    const date = clean3((_a = scope.querySelector(`.${prefix}__date`)) == null ? void 0 : _a.textContent);
    const text = [name, date].filter(Boolean).join(" \u2022 ");
    if (!text && !avatar) return null;
    const p = document2.createElement("p");
    if (avatar) p.append(avatar);
    if (text) p.append(document2.createTextNode(avatar ? ` ${text}` : text));
    return p;
  }
  function proRow(document2, article) {
    var _a;
    const titleLink = article.querySelector("a.blogs-article__link[href]") || article.querySelector("a[href]");
    const href = titleLink && titleLink.getAttribute("href");
    const title = clean3((_a = article.querySelector(".blogs-article__header")) == null ? void 0 : _a.textContent);
    if (!href || !title) return null;
    const img = image(document2, article.querySelector(".blogs-article__image img"));
    const text = [];
    const tags = Array.from(article.querySelectorAll(".blogs-article__tag")).map((t) => clean3(t.textContent)).filter(Boolean);
    if (tags.length) text.push(para(document2, tags.join(", ")));
    const h3 = document2.createElement("h3");
    h3.append(link2(document2, href, title));
    text.push(h3);
    const by = byline(document2, article.querySelector(".blogs-article__additional") || article, "blogs-article");
    if (by) text.push(by);
    return [img ? link2(document2, href, img) : "", text];
  }
  function highlightRow(document2, article) {
    var _a;
    const header = article.querySelector("a.single-blog-article__header[href]");
    const href = header && header.getAttribute("href") || ((_a = article.querySelector('a.single-blog-article__image[href], a[href*="/blog/"]')) == null ? void 0 : _a.getAttribute("href"));
    const title = clean3(header == null ? void 0 : header.textContent);
    if (!href || !title) return null;
    const img = image(document2, article.querySelector(".single-blog-article__image img") || article.querySelector("img:not(.single-blog-article__author img)"));
    const text = [];
    const tags = Array.from(article.querySelectorAll(".single-blog-article__tag")).map((t) => clean3(t.textContent)).filter(Boolean);
    if (tags.length) text.push(para(document2, tags.join(", ")));
    const h3 = document2.createElement("h3");
    h3.append(link2(document2, href, title));
    text.push(h3);
    const desc = article.querySelector(".single-blog-article__description");
    if (desc) {
      const ps = Array.from(desc.querySelectorAll("p")).map((p) => clean3(p.textContent)).filter(Boolean);
      if (ps.length) ps.forEach((t) => text.push(para(document2, t)));
      else {
        const copy = desc.cloneNode(true);
        copy.querySelectorAll(".sr-only").forEach((s) => s.remove());
        if (clean3(copy.textContent)) text.push(para(document2, clean3(copy.textContent)));
      }
    }
    const btn = article.querySelector("a.single-blog-article__button[href]");
    if (btn && clean3(btn.textContent)) text.push(para(document2, link2(document2, btn.getAttribute("href"), clean3(btn.textContent))));
    const additional = article.querySelector(".single-blog-article__additional.d-sm-flex") || article.querySelector(".single-blog-article__additional");
    const by = additional && byline(document2, additional, "single-blog-article");
    if (by) text.push(by);
    return [img ? link2(document2, href, img) : "", text];
  }
  function articlesIn(scope) {
    return Array.from(scope.querySelectorAll(".blogs-article")).filter((a) => !a.parentElement.closest(".blogs-article"));
  }
  function dropHiddenGrid(element) {
    const grids = element.closest(GRIDS);
    const section = element.closest("section.blogs") || element;
    section.remove();
    if (grids && !grids.querySelector(".blogs-article")) grids.remove();
  }
  function parse3(element, { document: document2 }) {
    if (element.closest(GRIDS) || element.closest("section.blogs[data-featured]")) {
      dropHiddenGrid(element);
      return;
    }
    const highlight = element.matches(".single-blog-article") || !!element.querySelector(":scope .single-blog-article");
    const cells = [];
    if (highlight) {
      const article = element.matches(".single-blog-article") ? element : element.querySelector(".single-blog-article");
      const row = highlightRow(document2, article);
      if (row) cells.push(row);
    } else {
      const seen = /* @__PURE__ */ new Set();
      const add = (article) => {
        var _a;
        const href = (_a = article.querySelector("a.blogs-article__link[href]")) == null ? void 0 : _a.getAttribute("href");
        if (!href) return;
        const key = pathKey(href);
        if (seen.has(key)) return;
        const row = proRow(document2, article);
        if (!row) return;
        seen.add(key);
        cells.push(row);
      };
      articlesIn(element).forEach(add);
      const landing = element.matches(".blogs__block") && !!element.closest("section.blogs");
      if (landing) {
        document2.querySelectorAll(`${GRIDS} section.blogs[data-featured]`).forEach((grid) => {
          articlesIn(grid).forEach(add);
        });
      }
    }
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, {
      name: "cards-post",
      variants: [highlight ? "highlight" : "pro"],
      cells
    });
    element.replaceWith(block);
  }

  // tools/importer/parsers/fifty-fifty-products.js
  function clean4(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function parse4(element, { document: document2 }) {
    let products = Array.from(element.querySelectorAll(".shop__product"));
    if (!products.length) products = Array.from(element.querySelectorAll(":scope > .row > div"));
    const cells = [];
    products.forEach((product) => {
      const btn = product.querySelector("a.shop__product-button[href], a.button[href], a[href]");
      const src = product.querySelector(".shop__product-image img, img");
      let ctaCell = "";
      if (btn && clean4(btn.textContent)) {
        const p = document2.createElement("p");
        const a = document2.createElement("a");
        a.href = btn.getAttribute("href");
        a.textContent = clean4(btn.textContent);
        p.append(a);
        ctaCell = p;
      }
      let imageCell = "";
      const srcUrl = src && src.getAttribute("src");
      if (srcUrl && !srcUrl.startsWith("data:")) {
        const img = document2.createElement("img");
        img.src = srcUrl;
        img.alt = src.getAttribute("alt") || "";
        imageCell = img;
      }
      if (!ctaCell && !imageCell) return;
      cells.push([ctaCell, imageCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, {
      name: "fifty-fifty",
      variants: ["products"],
      cells
    });
    element.replaceWith(block);
  }

  // tools/importer/transformers/behr-pro-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  var MARKER = "data-behr-pro";
  function isOnTheJob(element) {
    if (element.hasAttribute && element.hasAttribute(MARKER)) return true;
    if (element.querySelector("section.hero-swiper") && element.querySelector("section.blogs")) return true;
    return !!element.querySelector('img[src*="wp-content/themes/behr/"], #eds-filter-grids > section.blogs');
  }
  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function replaceWithText(doc, el, tag) {
    const node = doc.createElement(tag);
    node.textContent = cleanText(el.textContent);
    el.replaceWith(node);
    return node;
  }
  var CHROME = [
    // cookie consent + loaders
    ".cc-revoke",
    ".cc-window",
    ".cmp-loader",
    ".loader-wrapper",
    // On the Job header + mobile menu
    "header.header",
    ".header__dropdown",
    // dark On the Job footer + newsletter modal
    "footer.footer",
    "#liteRegModal",
    // widgets
    ".grecaptcha-badge",
    "#color-coach-overlay",
    "#color-coach-reopen-button",
    // tracking
    'img[src*="pixel.logtrackback.com"]',
    'img[src*="ninthdecimal.com"]',
    'img[src*="pages03.net"]',
    "iframe",
    "script",
    "style",
    "noscript",
    "link",
    // responsive duplicates and JS controls
    "section.filter .d-sm-none",
    "section.filter .filter__slide-icon",
    "section.most-recent-blog .single-blog-article__additional.d-sm-none",
    "section.trends .d-sm-none",
    "section.hero-swiper .swiper-slide-duplicate",
    "section.hero-swiper .swiper-notification",
    "section.hero-swiper .hero-swiper__pagination",
    ".blogs__load-more"
  ];
  function transform(hookName, element, payload) {
    if (!isOnTheJob(element)) return;
    const doc = element.ownerDocument || document;
    if (hookName === TransformHook.beforeTransform) {
      element.setAttribute(MARKER, "");
      WebImporter.DOMUtils.remove(element, CHROME);
      element.querySelectorAll("section.trends .trends__header").forEach((el) => replaceWithText(doc, el, "h2"));
      element.querySelectorAll("section.trends .d-sm-block > a.trends__link").forEach((a) => {
        const link3 = doc.createElement("a");
        link3.href = a.getAttribute("href");
        link3.textContent = cleanText(a.textContent);
        const p = doc.createElement("p");
        p.append(link3);
        a.replaceWith(p);
      });
      element.querySelectorAll("section.shop .shop__header").forEach((el) => replaceWithText(doc, el, "h2"));
      element.querySelectorAll("section.shop .shop__description").forEach((el) => {
        const p = doc.createElement("p");
        [...el.childNodes].forEach((n) => {
          if (n.nodeType === 3) n.textContent = n.textContent.replace(/\s+/g, " ");
          p.append(n);
        });
        if (p.firstChild && p.firstChild.nodeType === 3) p.firstChild.textContent = p.firstChild.textContent.trimStart();
        if (p.lastChild && p.lastChild.nodeType === 3) p.lastChild.textContent = p.lastChild.textContent.trimEnd();
        el.replaceWith(p);
      });
      element.querySelectorAll("section.shop .shop__publisher").forEach((el) => {
        const media = el.querySelector("picture") || el.querySelector("img");
        if (!media) {
          el.remove();
          return;
        }
        const p = doc.createElement("p");
        p.append(media);
        el.replaceWith(p);
      });
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, ["#eds-filter-grids", ...CHROME]);
      element.querySelectorAll("p").forEach((p) => {
        if (!cleanText(p.textContent) && !p.querySelector("img, picture, video, a, br")) p.remove();
      });
      [...element.querySelectorAll("div")].reverse().forEach((div) => {
        if (!cleanText(div.textContent) && !div.querySelector("img, picture, video, table, hr, a")) div.remove();
      });
      element.removeAttribute(MARKER);
    }
  }

  // tools/importer/transformers/behr-cleanup.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform2(hookName, element, payload) {
    if (hookName === TransformHook2.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#color-coach-overlay",
        "#color-coach-reopen-button"
      ]);
      element.querySelectorAll(".section").forEach((section) => {
        const hasText = section.textContent.trim().length > 0;
        const hasMedia = section.querySelector("img, picture, video, iframe, table");
        if (!hasText && !hasMedia) section.remove();
      });
    }
    if (hookName === TransformHook2.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header",
        "footer",
        ".header-wrapper",
        ".footer-wrapper",
        "iframe",
        "noscript",
        "link"
      ]);
    }
  }

  // tools/importer/transformers/behr-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function querySection(root, selectors) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
      if (!sel) continue;
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function transform3(hookName, element, payload) {
    const sections = payload && payload.template && payload.template.sections || [];
    if (sections.length < 2) return;
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (i === 0 && !section.style) continue;
        const sectionEl = querySection(element, section.selector);
        if (!sectionEl) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || querySection(element, section.selector);
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // tools/importer/import-pro.js
  var parsers = {
    "carousel-hero": parse,
    "filter-chips": parse2,
    "cards-post": parse3,
    "fifty-fifty": parse4
  };
  var PAGE_TEMPLATE = {
    name: "pro",
    description: "On the Job with BEHR Pro blog landing: hero carousel, audience filter chips, highlighted latest post, filterable post grid with Load More, Trends posts, Shop BEHR Products",
    urls: [
      "https://www.behr.com/pro/onthejob/"
    ],
    blocks: [
      {
        name: "carousel-hero",
        instances: [
          "section.hero-swiper"
        ]
      },
      {
        name: "filter-chips",
        instances: [
          "section.filter"
        ]
      },
      {
        name: "cards-post",
        instances: [
          "section.most-recent-blog .single-blog-article",
          "section.blogs .blogs__block",
          "section.trends .container > .row:has(.blogs-article)"
        ]
      },
      {
        name: "fifty-fifty",
        instances: [
          "section.shop .shop__products"
        ]
      }
    ],
    sections: [
      {
        id: "1",
        name: "hero",
        selector: [
          "section.hero-swiper"
        ],
        style: null,
        blocks: [
          "carousel-hero"
        ],
        defaultContent: []
      },
      {
        id: "2",
        name: "audience-filter",
        selector: [
          "section.filter"
        ],
        style: null,
        blocks: [
          "filter-chips"
        ],
        defaultContent: []
      },
      {
        id: "3",
        name: "latest-post",
        selector: [
          "section.most-recent-blog"
        ],
        style: "light",
        blocks: [
          "cards-post"
        ],
        defaultContent: []
      },
      {
        id: "4",
        name: "post-grid",
        selector: [
          "section.blogs"
        ],
        style: null,
        blocks: [
          "cards-post"
        ],
        defaultContent: []
      },
      {
        id: "5",
        name: "trends",
        selector: [
          "section.trends"
        ],
        style: null,
        blocks: [
          "cards-post"
        ],
        defaultContent: [
          "section.trends .trends__header",
          "section.trends .d-sm-block > a.trends__link"
        ]
      },
      {
        id: "6",
        name: "shop",
        selector: [
          "section.shop"
        ],
        style: "centered",
        blocks: [
          "fifty-fifty"
        ],
        defaultContent: [
          "section.shop .shop__header",
          "section.shop .shop__description",
          "section.shop .shop__publisher"
        ]
      }
    ]
  };
  var transformers = [
    transform,
    transform2,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform3] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_pro_default = {
    transform: (payload) => {
      var _a, _b, _c, _d, _e, _f, _g;
      const { document: document2, url, params } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const title = ((_b = (_a = document2.querySelector("title")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.replace(/\s*[-|]\s*Professional painting blog\s*$/i, "").replace(/\s*\|\s*Behr\s*$/i, "").trim()) || ((_d = (_c = document2.querySelector("h1")) == null ? void 0 : _c.textContent) == null ? void 0 : _d.trim());
      const description = ((_e = document2.querySelector('meta[name="description"]')) == null ? void 0 : _e.content) || ((_f = document2.querySelector('meta[property="og:description"]')) == null ? void 0 : _f.content);
      const ogImage = (_g = document2.querySelector('meta[property="og:image"]')) == null ? void 0 : _g.content;
      const meta = { Title: title };
      if (description) meta.Description = description;
      if (ogImage) {
        const img = document2.createElement("img");
        img.src = ogImage;
        meta.Image = img;
      }
      main.appendChild(document2.createElement("hr"));
      main.appendChild(WebImporter.Blocks.getMetadataBlock(document2, meta));
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const { pathname } = new URL(params.originalURL);
      const rawPath = pathname.endsWith("/") ? `${pathname}index` : pathname.replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_pro_exports);
})();
