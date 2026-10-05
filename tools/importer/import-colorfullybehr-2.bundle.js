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

  // tools/importer/import-colorfullybehr-2.js
  var import_colorfullybehr_2_exports = {};
  __export(import_colorfullybehr_2_exports, {
    default: () => import_colorfullybehr_2_default
  });

  // tools/importer/parsers/cards-related.js
  function parse(element, { document: document2 }) {
    let items = Array.from(element.querySelectorAll(":scope > .postSingle"));
    if (!items.length) items = Array.from(element.querySelectorAll(".postSingle"));
    if (!items.length) items = Array.from(element.querySelectorAll(".postBody"));
    const cells = [];
    items.forEach((item) => {
      var _a, _b;
      const img = item.querySelector(".postImage img") || item.querySelector("img");
      const titleLinkSrc = item.querySelector(".postTitle a") || item.querySelector("h1 a, h2 a, h3 a, h4 a, h5 a, h6 a");
      const titleSrc = item.querySelector(".postTitle") || item.querySelector("h1, h2, h3, h4, h5, h6");
      const titleText = (((_a = titleLinkSrc || titleSrc) == null ? void 0 : _a.textContent) || "").replace(/\s+/g, " ").trim();
      const href = (titleLinkSrc == null ? void 0 : titleLinkSrc.getAttribute("href")) || ((_b = img == null ? void 0 : img.closest("a")) == null ? void 0 : _b.getAttribute("href")) || "";
      if (!img && !titleText) return;
      let imageCell = "";
      if (img) {
        const imgLink = img.closest("a");
        const linkHref = (imgLink == null ? void 0 : imgLink.getAttribute("href")) || href;
        if (linkHref) {
          const a = document2.createElement("a");
          a.setAttribute("href", linkHref);
          a.append(img);
          imageCell = a;
        } else {
          imageCell = img;
        }
      }
      let textCell = "";
      if (titleText) {
        const h3 = document2.createElement("h3");
        if (href) {
          const a = document2.createElement("a");
          a.setAttribute("href", href);
          a.textContent = titleText;
          h3.append(a);
        } else {
          h3.textContent = titleText;
        }
        textCell = h3;
      }
      cells.push([imageCell, textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-related", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/fragment.js
  var FRAGMENT_PATH = "/colorfullybehr/fragments/sidebar";
  function parse2(element, { document: document2 }) {
    const a = document2.createElement("a");
    a.setAttribute("href", FRAGMENT_PATH);
    a.textContent = FRAGMENT_PATH;
    const cells = [[a]];
    const block = WebImporter.Blocks.createBlock(document2, { name: "fragment", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/behr-blog-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function isWordPressBlog(element) {
    return !!element.querySelector("#page.site article.post, article.post > div.entry-content");
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
    if (!isWordPressBlog(element)) return;
    const doc = element.ownerDocument || document;
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

  // tools/importer/import-colorfullybehr-2.js
  var parsers = {
    "cards-related": parse,
    fragment: parse2
  };
  var PAGE_TEMPLATE = {
    name: "colorfullybehr-2",
    description: "ColorfullyBEHR blog article: category eyebrow, title and byline, long-form body with captioned images and Q&A, tags, Picks for you related posts, shared sidebar",
    urls: [
      "https://www.behr.com/colorfullybehr/behr-announces-2027-color-of-the-year-grounded/"
    ],
    blocks: [
      {
        name: "cards-related",
        instances: [".singleRelated .postGrid.postRelated"]
      },
      {
        name: "fragment",
        instances: ["#secondary.widget-area"]
      }
    ],
    sections: [
      {
        id: "1",
        name: "article-header",
        selector: ["article.post > h5.postCategory"],
        style: null,
        blocks: [],
        defaultContent: ["article.post > h5.postCategory", "article.post > header.entry-header h1", "article.post > div.singleInfo"]
      },
      {
        id: "2",
        name: "article-body",
        selector: ["article.post > div.entry-content"],
        style: null,
        blocks: [],
        defaultContent: ["article.post > div.entry-content"]
      },
      {
        id: "3",
        name: "post-tags",
        selector: ["article.post > footer.entry-footer .singleTags"],
        style: "tags",
        blocks: [],
        defaultContent: ["article.post > footer.entry-footer .singleTags"]
      },
      {
        id: "4",
        name: "related-posts",
        selector: ["#primary div.singleRelated"],
        style: null,
        blocks: ["cards-related"],
        defaultContent: [".singleRelated .linedTitle h2"]
      },
      {
        id: "5",
        name: "sidebar",
        selector: ["#secondary.widget-area"],
        style: "sidebar",
        blocks: ["fragment"],
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
  var import_colorfullybehr_2_default = {
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
      const meta = { Title: title, template: "blog-post" };
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
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
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
  return __toCommonJS(import_colorfullybehr_2_exports);
})();
