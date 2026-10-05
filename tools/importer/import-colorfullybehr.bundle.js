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

  // tools/importer/import-colorfullybehr.js
  var import_colorfullybehr_exports = {};
  __export(import_colorfullybehr_exports, {
    default: () => import_colorfullybehr_default
  });

  // tools/importer/parsers/hero-spotlight.js
  var KEEP_UPPER = /^(BEHR|BEHR®|DIY|USA|HGTV|COTY|[A-Z]*\d[\w-]*|[IVX]+)$/;
  var MINOR = /* @__PURE__ */ new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);
  function titleCase(text, isStart = true) {
    if (!/[A-Z]/.test(text) || /[a-z]/.test(text)) return text;
    let first = isStart;
    return text.replace(/[^\s]+/g, (word) => {
      const core = word.replace(/[^\wÀ-ÿ®&'-]/g, "");
      let out;
      if (KEEP_UPPER.test(core)) out = word;
      else if (!first && MINOR.has(word.toLowerCase())) out = word.toLowerCase();
      else out = word.charAt(0) + word.slice(1).toLowerCase();
      first = false;
      return out;
    });
  }
  function clean(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function findBannerImage(element, document2) {
    const bg = element.querySelector(".n2-ss-slide-background-image, .n2-ss-slide-background");
    let img = bg && bg.querySelector("img");
    if (img && img.getAttribute("src") && !img.getAttribute("src").startsWith("data:")) {
      const picture = img.closest("picture") || img;
      if (!img.getAttribute("alt") && bg.getAttribute("data-alt")) img.setAttribute("alt", bg.getAttribute("data-alt"));
      return picture;
    }
    const holders = [bg, ...element.querySelectorAll('[data-desktop], [data-src], [style*="background-image"]')].filter(Boolean);
    for (const holder of holders) {
      let src = holder.getAttribute("data-desktop") || holder.getAttribute("data-src") || "";
      if (!src) {
        const m = (holder.getAttribute("style") || "").match(/background-image:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
        if (m) src = m[1];
      }
      if (src && !src.startsWith("data:")) {
        img = document2.createElement("img");
        img.src = src;
        img.alt = holder.getAttribute("data-alt") || "";
        return img;
      }
    }
    return null;
  }
  function parse(element, { document: document2 }) {
    const picture = findBannerImage(element, document2);
    const layers = Array.from(element.querySelectorAll(".n2-ss-layers-container .n2-ss-item-content.n2-ss-text, .n2-ss-layers-container .n2-ss-text")).filter((el, i, arr) => arr.indexOf(el) === i && !arr.some((o) => o !== el && o.contains(el)));
    const eyebrowLayer = layers.find((el) => !el.querySelector("p") && clean(el.textContent));
    const titleSource = (layers.find((el) => el.querySelector("p")) || element).querySelector("p, h1, h2, h3");
    const contentCell = [];
    if (eyebrowLayer) {
      const p = document2.createElement("p");
      p.textContent = titleCase(clean(eyebrowLayer.textContent));
      contentCell.push(p);
    }
    if (titleSource) {
      const lines = titleSource.innerHTML.split(/<br\s*\/?>/i).map((html) => {
        const tmp = document2.createElement("div");
        tmp.innerHTML = html;
        return clean(tmp.textContent);
      }).filter(Boolean);
      if (lines.length) {
        const h1 = document2.createElement("h1");
        lines.forEach((line, i) => {
          if (i) h1.append(document2.createElement("br"));
          h1.append(document2.createTextNode(titleCase(line)));
        });
        contentCell.push(h1);
      }
    }
    const ctaSource = element.querySelector(".n2-ss-button-container a[href]") || Array.from(element.querySelectorAll(".n2-ss-layers-container a[href]")).find((a) => clean(a.textContent));
    if (ctaSource) {
      const a = document2.createElement("a");
      a.href = ctaSource.getAttribute("href");
      a.textContent = titleCase(clean(ctaSource.textContent));
      const p = document2.createElement("p");
      p.append(a);
      contentCell.push(p);
    }
    if (!picture && !contentCell.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (picture) cells.push([picture]);
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document2, { name: "hero-spotlight", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-post.js
  var KEEP_UPPER2 = /^(BEHR|BEHR®|DIY|USA|HGTV|COTY|[A-Z]*\d[\w-]*|[IVX]+)$/;
  var MINOR2 = /* @__PURE__ */ new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);
  function titleCase2(text, isStart = true) {
    if (!/[A-Z]/.test(text) || /[a-z]/.test(text)) return text;
    let first = isStart;
    return text.replace(/[^\s]+/g, (word) => {
      const core = word.replace(/[^\wÀ-ÿ®&'-]/g, "");
      let out;
      if (KEEP_UPPER2.test(core)) out = word;
      else if (!first && MINOR2.has(word.toLowerCase())) out = word.toLowerCase();
      else out = word.charAt(0) + word.slice(1).toLowerCase();
      first = false;
      return out;
    });
  }
  function clean2(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function para(document2, content) {
    const p = document2.createElement("p");
    if (typeof content === "string") p.textContent = content;
    else p.append(content);
    return p;
  }
  function link(document2, href, text) {
    const a = document2.createElement("a");
    a.href = href;
    a.textContent = text;
    return a;
  }
  function buildLabel(document2, source) {
    const h2 = document2.createElement("h2");
    let started = false;
    source.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        const t = node.textContent.replace(/\s+/g, " ");
        if (!t.trim()) {
          if (started) h2.append(document2.createTextNode(" "));
          return;
        }
        h2.append(document2.createTextNode(titleCase2(started ? t : t.trimStart(), !started)));
        started = true;
      } else if (node.nodeType === 1) {
        const t = clean2(node.textContent);
        if (!t) return;
        const isScript = node.matches("em, i, .cursive") || node.querySelector("em, .cursive");
        if (isScript) {
          const em = document2.createElement("em");
          em.textContent = t;
          h2.append(em);
        } else {
          h2.append(document2.createTextNode(titleCase2(t, !started)));
        }
        started = true;
      }
    });
    h2.innerHTML = h2.innerHTML.replace(/\s+$/, "");
    return clean2(h2.textContent) ? h2 : null;
  }
  function buildCard(document2, post, { feature, labelSource }) {
    const titleLink = post.querySelector(".postTitle a[href], h3 a[href], h2 a[href]");
    const href = titleLink && titleLink.getAttribute("href");
    const img = post.querySelector('.postImage img, img:not([src^="data:"])');
    let imageCell = "";
    if (img) {
      const imgLink = img.closest("a[href]");
      const pictureEl = img.closest("picture") || img;
      const a = document2.createElement("a");
      a.href = imgLink && imgLink.getAttribute("href") || href || "";
      if (a.getAttribute("href")) {
        a.append(pictureEl);
        imageCell = a;
      } else {
        imageCell = pictureEl;
      }
    }
    const text = [];
    if (feature) {
      const label = labelSource && buildLabel(document2, labelSource);
      if (label) text.push(label);
    } else {
      const category = post.querySelector(".postCategory");
      if (category && clean2(category.textContent)) text.push(para(document2, clean2(category.textContent)));
    }
    if (titleLink && clean2(titleLink.textContent)) {
      const h3 = document2.createElement("h3");
      h3.append(link(document2, href, clean2(titleLink.textContent)));
      text.push(h3);
    }
    const excerpts = Array.from(post.querySelectorAll(".postDesc p")).filter((p) => clean2(p.textContent));
    if (excerpts.length) excerpts.forEach((p) => text.push(para(document2, clean2(p.textContent))));
    else {
      const desc = post.querySelector(".postDesc");
      if (desc && clean2(desc.textContent)) text.push(para(document2, clean2(desc.textContent)));
    }
    const btn = post.querySelector(".postBtn a[href], a.btn[href]");
    if (btn && clean2(btn.textContent)) {
      const label = clean2(btn.textContent);
      const btnText = feature ? label.replace(/\b[a-z]/g, (c) => c.toUpperCase()) : titleCase2(label);
      text.push(para(document2, link(document2, btn.getAttribute("href"), btnText)));
    }
    if (!feature) {
      const date = post.querySelector(".postDate, time");
      if (date && clean2(date.textContent)) text.push(para(document2, clean2(date.textContent)));
    }
    if (!imageCell && !text.length) return null;
    return [imageCell, text.length ? text : ""];
  }
  function parse2(element, { document: document2 }) {
    const feature = element.id === "info" || !!element.closest("#info") || !!element.querySelector(".postFeature");
    const cells = [];
    if (feature) {
      let panels = Array.from(element.querySelectorAll(":scope > .panel-grid-cell"));
      if (!panels.length) panels = Array.from(element.querySelectorAll(".textwidget"));
      panels.forEach((panel) => {
        const post = panel.querySelector(".postFeature .postSingle, .postSingle");
        if (!post) return;
        const labelSource = Array.from(panel.querySelectorAll("h1, h2, h4")).find((h) => !post.contains(h) && clean2(h.textContent));
        const row = buildCard(document2, post, { feature: true, labelSource });
        if (row) cells.push(row);
      });
    } else {
      let posts = Array.from(element.querySelectorAll(":scope > .postSingle"));
      if (!posts.length) posts = Array.from(element.querySelectorAll(".postSingle"));
      posts.forEach((post) => {
        const row = buildCard(document2, post, { feature: false });
        if (row) cells.push(row);
      });
    }
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, {
      name: "cards-post",
      variants: feature ? ["feature"] : [],
      cells
    });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-split.js
  var KEEP_UPPER3 = /^(BEHR|BEHR®|DIY|USA|HGTV|COTY|[A-Z]*\d[\w-]*|[IVX]+)$/;
  var MINOR3 = /* @__PURE__ */ new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);
  function titleCase3(text, isStart = true) {
    if (!/[A-Z]/.test(text) || /[a-z]/.test(text)) return text;
    let first = isStart;
    return text.replace(/[^\s]+/g, (word) => {
      const core = word.replace(/[^\wÀ-ÿ®&'-]/g, "");
      let out;
      if (KEEP_UPPER3.test(core)) out = word;
      else if (!first && MINOR3.has(word.toLowerCase())) out = word.toLowerCase();
      else out = word.charAt(0) + word.slice(1).toLowerCase();
      first = false;
      return out;
    });
  }
  function clean3(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function buildHeading(document2, source) {
    const h = document2.createElement(/^H[1-6]$/.test(source.tagName) ? source.tagName.toLowerCase() : "h2");
    let started = false;
    source.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        const t = node.textContent.replace(/\s+/g, " ");
        if (!t.trim()) {
          if (started) h.append(document2.createTextNode(" "));
          return;
        }
        h.append(document2.createTextNode(titleCase3(started ? t : t.trimStart(), !started)));
        started = true;
      } else if (node.nodeType === 1) {
        const t = clean3(node.textContent);
        if (!t) return;
        if (node.matches("em, i, .cursive") || node.querySelector("em, .cursive")) {
          const em = document2.createElement("em");
          em.textContent = t;
          h.append(em);
        } else {
          h.append(document2.createTextNode(titleCase3(t, !started)));
        }
        started = true;
      }
    });
    if (h.lastChild && h.lastChild.nodeType === 3) h.lastChild.textContent = h.lastChild.textContent.replace(/\s+$/, "");
    return clean3(h.textContent) ? h : null;
  }
  function buildParagraph(document2, source) {
    const p = document2.createElement("p");
    source.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        p.append(document2.createTextNode(node.textContent.replace(/\s+/g, " ")));
      } else if (node.nodeType === 1 && clean3(node.textContent)) {
        if (node.matches("strong, b")) {
          const s = document2.createElement("strong");
          s.textContent = clean3(node.textContent);
          p.append(s);
        } else if (node.matches("em, i")) {
          const e = document2.createElement("em");
          e.textContent = clean3(node.textContent);
          p.append(e);
        } else if (node.matches("a[href]")) {
          const a = document2.createElement("a");
          a.href = node.getAttribute("href");
          a.textContent = clean3(node.textContent);
          p.append(a);
        } else {
          p.append(document2.createTextNode(node.textContent.replace(/\s+/g, " ")));
        }
      }
    });
    if (p.firstChild && p.firstChild.nodeType === 3) p.firstChild.textContent = p.firstChild.textContent.replace(/^\s+/, "");
    if (p.lastChild && p.lastChild.nodeType === 3) p.lastChild.textContent = p.lastChild.textContent.replace(/\s+$/, "");
    return clean3(p.textContent) ? p : null;
  }
  function parse3(element, { document: document2 }) {
    const gridCells = Array.from(element.querySelectorAll(":scope > .panel-grid-cell"));
    const img = element.querySelector(".sow-image-container img, .askLeft img, img.so-widget-image") || Array.from(element.querySelectorAll("img")).find((i) => !(i.getAttribute("src") || "").startsWith("data:"));
    let imageCell = "";
    if (img) {
      imageCell = img.closest("picture") || img;
    }
    const textRoot = element.querySelector(".askRight .textwidget, .textwidget") || gridCells.find((c) => !img || !c.contains(img)) || element;
    const textCell = [];
    Array.from(textRoot.children).forEach((child) => {
      if (/^H[1-6]$/.test(child.tagName)) {
        const h = buildHeading(document2, child);
        if (h) textCell.push(h);
        return;
      }
      if (child.tagName === "P") {
        const links = child.querySelectorAll("a[href]");
        const linkOnly = links.length === 1 && clean3(child.textContent) === clean3(links[0].textContent);
        if (linkOnly) {
          const a = document2.createElement("a");
          a.href = links[0].getAttribute("href");
          a.textContent = titleCase3(clean3(links[0].textContent));
          const p2 = document2.createElement("p");
          p2.append(a);
          textCell.push(p2);
          return;
        }
        const p = buildParagraph(document2, child);
        if (p) textCell.push(p);
        return;
      }
      if (child.matches("ul, ol") && clean3(child.textContent)) textCell.push(child);
    });
    if (!imageCell && !textCell.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [[imageCell, textCell.length ? textCell : ""]];
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns-split", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/behr-blog-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function isWordPressBlog(element) {
    return !!element.querySelector("#page.site article.post, article.post > div.entry-content");
  }
  function isWordPressLanding(element) {
    return !!element.querySelector("#page.site .entry-content > .panel-layout");
  }
  var LANDING_ROOTS = "#banner, #front .entry-content";
  function cleanupLandingBefore(doc, element) {
    WebImporter.DOMUtils.remove(element, [
      ".cmp-loader",
      // cookie consent loader
      "#banner .n2-ss-slide--focus",
      // Smart Slider a11y slide title "Color of the Year - Slide 1"
      '#banner .n2-ss-slider-4 > img[src^="data:image/svg"]',
      // slider aspect-ratio placeholder
      '#banner img[src*="reddishLine"]',
      // decorative red rule (live/snapshot src)
      '#banner .n2-ss-item-image-content img[alt="Image is not available"]',
      // same rule, localized src
      "#banner ss3-loader",
      "#banner .n2_clear",
      ".postInfo .postShare",
      // per-card AddToAny share icons
      ".postInfo .postComment",
      // per-card comment count
      "#pg-6-3",
      // empty Instagram (snapwidget) row, wrapper of #gallery
      "#gallery"
    ]);
    element.querySelectorAll("#banner .n2-ss-slider").forEach((slider) => {
      if (!slider.querySelector(".n2-ss-slide.n2-ss-slide-active")) return;
      slider.querySelectorAll(".n2-ss-slide:not(.n2-ss-slide-active)").forEach((s) => s.remove());
    });
    element.querySelectorAll(LANDING_ROOTS).forEach((root) => {
      root.querySelectorAll("h1 span.cursive, h2 span.cursive, h3 span.cursive, h4 span.cursive, h5 span.cursive, h6 span.cursive").forEach((span) => {
        const em = doc.createElement("em");
        em.textContent = cleanText(span.textContent);
        span.replaceWith(em);
      });
      root.querySelectorAll("p").forEach((p) => {
        if (!cleanText(p.textContent) && !p.querySelector("img, picture, video, iframe, a")) p.remove();
      });
    });
    element.querySelectorAll("#news .textwidget > h2, #news .textwidget > p > a.btn").forEach((el) => {
      [...el.childNodes].filter((n) => n.nodeType === 3).forEach((n) => {
        n.textContent = titleCase4(n.textContent);
      });
    });
    element.querySelectorAll("#news .textwidget > p > a.btn").forEach((a) => {
      const strong = doc.createElement("strong");
      a.replaceWith(strong);
      strong.append(a);
    });
  }
  function titleCase4(text) {
    if (text !== text.toUpperCase()) return text;
    return text.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, sep, c) => sep + c.toUpperCase());
  }
  function unwrap(el) {
    if (!el || !el.parentNode) return;
    while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
    el.remove();
  }
  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }
  function getBoldSubheadText(p) {
    const meaningful = [...p.childNodes].filter((n) => !(n.nodeType === 3 && !n.textContent.trim()));
    if (meaningful.length !== 1) return null;
    const only = meaningful[0];
    if (only.nodeType !== 1 || !["STRONG", "B"].includes(only.tagName)) return null;
    if (only.querySelector("a, img, picture, br")) return null;
    const text = cleanText(only.textContent);
    if (!text || text.length > 120) return null;
    return text;
  }
  function convertSubheadings(document2, content) {
    let seenH2 = false;
    content.querySelectorAll(":scope > p").forEach((p) => {
      const text = getBoldSubheadText(p);
      if (!text) return;
      const words = text.split(" ").length;
      const level = !seenH2 || words >= 4 ? "h2" : "h3";
      if (level === "h2") seenH2 = true;
      const heading = document2.createElement(level);
      heading.textContent = text;
      p.replaceWith(heading);
    });
  }
  function convertFigures(document2, content) {
    content.querySelectorAll("figure.wp-block-image").forEach((figure) => {
      const media = figure.querySelector("picture") || figure.querySelector("img");
      const caption = figure.querySelector("figcaption");
      const nodes = [];
      if (media) {
        const imgP = document2.createElement("p");
        imgP.append(media);
        nodes.push(imgP);
      }
      if (caption && cleanText(caption.textContent)) {
        caption.querySelectorAll("strong, b").forEach((s) => unwrap(s));
        while (caption.firstChild && (caption.firstChild.nodeName === "BR" || caption.firstChild.nodeType === 3 && !caption.firstChild.textContent.trim())) {
          caption.firstChild.remove();
        }
        while (caption.lastChild && (caption.lastChild.nodeName === "BR" || caption.lastChild.nodeType === 3 && !caption.lastChild.textContent.trim())) {
          caption.lastChild.remove();
        }
        const em = document2.createElement("em");
        while (caption.firstChild) em.append(caption.firstChild);
        const capP = document2.createElement("p");
        capP.append(em);
        nodes.push(capP);
      }
      if (nodes.length) figure.replaceWith(...nodes);
      else figure.remove();
    });
  }
  function convertFaq(document2, content) {
    content.querySelectorAll("div.schema-faq").forEach((faq) => {
      const nodes = [];
      faq.querySelectorAll("div.schema-faq-section").forEach((item) => {
        const q = item.querySelector(".schema-faq-question");
        const a = item.querySelector(".schema-faq-answer");
        if (q && cleanText(q.textContent)) {
          const h3 = document2.createElement("h3");
          h3.textContent = cleanText(q.textContent);
          nodes.push(h3);
        }
        if (a) {
          a.removeAttribute("class");
          nodes.push(a);
        }
      });
      if (nodes.length) faq.replaceWith(...nodes);
      else faq.remove();
    });
  }
  function removeEmptyParagraphs(content) {
    content.querySelectorAll("p").forEach((p) => {
      if (!cleanText(p.textContent) && !p.querySelector("img, picture, video, iframe")) p.remove();
    });
  }
  function transform(hookName, element, payload) {
    const isLanding = isWordPressLanding(element);
    if (!isWordPressBlog(element) && !isLanding) return;
    const doc = element.ownerDocument || document;
    if (hookName === TransformHook.beforeTransform && isLanding) cleanupLandingBefore(doc, element);
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        ".cc-revoke",
        // cookie banner "Cookie Policy" tab
        ".cc-window",
        // cookie consent banner
        ".skip-link",
        "#masthead",
        // site header
        "#colophon",
        // site footer
        ".wprm-wrapper",
        // WP Responsive Menu (mobile menu)
        "#mg-wprm-wrap",
        "#wprmenu_bar",
        "#addtoany",
        // AddToAny share modal / overlay
        ".grecaptcha-badge",
        // reCAPTCHA badge
        "#color-coach-overlay",
        // ChatHUE widget
        "#color-coach-reopen-button",
        ".singleInfoRight.shareCircle",
        // byline share icons
        ".singleFtShare",
        // "SHARE THIS POST" footer share bar
        "#comments",
        // comments area + comment form
        "script",
        "style",
        "noscript",
        "link"
      ]);
      element.querySelectorAll("article.post div.singleInfo").forEach((info) => {
        var _a, _b;
        const author = cleanText((_a = info.querySelector(".postAuthor")) == null ? void 0 : _a.textContent);
        const date = cleanText((_b = info.querySelector(".postDate")) == null ? void 0 : _b.textContent);
        const text = [author, date].filter(Boolean).join(" | ");
        if (text) {
          const p = doc.createElement("p");
          p.textContent = text;
          info.replaceWith(p);
        } else {
          info.remove();
        }
      });
      element.querySelectorAll("article.post > header.entry-header").forEach(unwrap);
      element.querySelectorAll("article.post > div.entry-content").forEach((content) => {
        convertFigures(doc, content);
        convertSubheadings(doc, content);
        convertFaq(doc, content);
        removeEmptyParagraphs(content);
      });
    }
    if (hookName === TransformHook.afterTransform) {
      element.querySelectorAll("article.post > h5.postCategory").forEach((h5) => {
        const p = doc.createElement("p");
        p.textContent = cleanText(h5.textContent);
        h5.replaceWith(p);
      });
      element.querySelectorAll("article.post > footer.entry-footer").forEach(unwrap);
      element.querySelectorAll("iframe").forEach((iframe) => {
        if (!iframe.closest(".entry-content")) iframe.remove();
      });
      WebImporter.DOMUtils.remove(element, ["#masthead", "#colophon", ".wprm-wrapper", "#addtoany", ".grecaptcha-badge"]);
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

  // tools/importer/import-colorfullybehr.js
  var parsers = {
    "hero-spotlight": parse,
    "cards-post": parse2,
    "columns-split": parse3
  };
  var PAGE_TEMPLATE = {
    name: "colorfullybehr",
    description: "ColorfullyBEHR blog landing: spotlight hero, Today's Must-Reads post cards with a more link, Ask an Expert image/text split, Color of the Year / Color Spotlight feature cards",
    urls: [
      "https://www.behr.com/colorfullybehr/"
    ],
    blocks: [
      {
        name: "hero-spotlight",
        instances: [
          "#banner #smartslider3-2"
        ]
      },
      {
        name: "cards-post",
        instances: [
          "#news .postGrid",
          "#info"
        ]
      },
      {
        name: "columns-split",
        instances: [
          "#ask"
        ]
      }
    ],
    sections: [
      {
        id: "1",
        name: "spotlight-hero",
        selector: [
          "#banner"
        ],
        style: null,
        blocks: [
          "hero-spotlight"
        ],
        defaultContent: []
      },
      {
        id: "2",
        name: "must-reads",
        selector: [
          "#news"
        ],
        style: "light, centered",
        blocks: [
          "cards-post"
        ],
        defaultContent: [
          "#news .textwidget > h2",
          "#news .textwidget > p:has(> a.btn)"
        ]
      },
      {
        id: "3",
        name: "ask-an-expert",
        selector: [
          "#ask"
        ],
        style: null,
        blocks: [
          "columns-split"
        ],
        defaultContent: []
      },
      {
        id: "4",
        name: "feature-cards",
        selector: [
          "#info"
        ],
        style: "light",
        blocks: [
          "cards-post"
        ],
        defaultContent: []
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
  var import_colorfullybehr_default = {
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
      const title = ((_b = (_a = document2.querySelector("title")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.replace(/\s*\|\s*Behr\s*$/i, "").trim()) || ((_d = (_c = document2.querySelector("h1")) == null ? void 0 : _c.textContent) == null ? void 0 : _d.trim());
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
  return __toCommonJS(import_colorfullybehr_exports);
})();
