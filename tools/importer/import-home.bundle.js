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

  // tools/importer/import-home.js
  var import_home_exports = {};
  __export(import_home_exports, {
    default: () => import_home_default
  });

  // tools/importer/parsers/hero-gallery.js
  function parse(element, { document: document2 }) {
    const heading = element.querySelector("h1, .homepage-hero__heading, h2");
    const descriptions = Array.from(element.querySelectorAll("p")).filter((p) => !p.matches(".button-container") && !p.querySelector("a, picture, img") && p.textContent.trim());
    const ctas = Array.from(element.querySelectorAll("a[href]")).filter((a) => !a.querySelector("picture, img"));
    const images = [];
    element.querySelectorAll("picture").forEach((pic) => images.push(pic));
    element.querySelectorAll("img").forEach((img) => {
      if (!img.closest("picture")) images.push(img);
    });
    if (!heading && !descriptions.length && !ctas.length && !images.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    const contentCell = [];
    if (heading) contentCell.push(heading);
    contentCell.push(...descriptions);
    ctas.forEach((a) => {
      const link = document2.createElement("a");
      link.href = a.getAttribute("href");
      link.textContent = a.textContent.trim();
      const p = document2.createElement("p");
      p.append(link);
      contentCell.push(p);
    });
    if (contentCell.length) cells.push([contentCell]);
    images.forEach((img) => cells.push([img]));
    const block = WebImporter.Blocks.createBlock(document2, { name: "hero-gallery", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-feature.js
  function parse2(element, { document: document2 }) {
    let slides = Array.from(element.querySelectorAll(".feature__slide"));
    if (!slides.length) {
      slides = Array.from(element.querySelectorAll(":scope > section > div, :scope > div"));
    }
    const cells = [];
    slides.forEach((slide) => {
      const picture = slide.querySelector(".feature__slide-bg picture") || slide.querySelector("picture") || slide.querySelector("img");
      const heading = slide.querySelector("h1, h2, h3, h4, h5, h6");
      const descriptions = Array.from(slide.querySelectorAll("p")).filter((p) => p.textContent.trim() && !p.querySelector("a, picture, img"));
      const ctas = Array.from(slide.querySelectorAll("a[href]")).filter((a) => a.textContent.trim());
      if (!picture && !heading && !descriptions.length && !ctas.length) return;
      const textCell = [];
      if (heading) textCell.push(heading);
      textCell.push(...descriptions);
      ctas.forEach((a) => {
        const link = document2.createElement("a");
        link.href = a.getAttribute("href");
        link.textContent = a.textContent.trim();
        const p = document2.createElement("p");
        p.append(link);
        textCell.push(p);
      });
      cells.push([picture || "", textCell.length ? textCell : ""]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-feature", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-quick-link.js
  function parse3(element, { document: document2 }) {
    let items = Array.from(element.querySelectorAll("li.quick-link-list__item"));
    if (!items.length) items = Array.from(element.querySelectorAll(":scope > ul > li"));
    if (!items.length) {
      items = Array.from(element.querySelectorAll(".quick-link-list__card-content-wrap")).map((wrap) => wrap.parentElement);
    }
    const cells = [];
    items.forEach((item) => {
      const picture = item.querySelector("picture") || item.querySelector("img");
      const heading = item.querySelector("h1, h2, h3, h4, h5, h6");
      const eyebrow = item.querySelector(".quick-link-list__card-eyebrow") || Array.from(item.querySelectorAll("p")).find((p) => p.textContent.trim() && !p.querySelector("picture, img"));
      const anchor = item.matches("a[href]") ? item : item.querySelector("a[href]") || item.closest("a[href]");
      const href = anchor ? anchor.getAttribute("href") : null;
      if (!picture && !heading && !eyebrow && !href) return;
      const textCell = [];
      if (eyebrow) {
        const p = document2.createElement("p");
        p.textContent = eyebrow.textContent.trim();
        textCell.push(p);
      }
      if (heading) {
        const h = document2.createElement(heading.tagName.toLowerCase());
        h.textContent = heading.textContent.trim();
        textCell.push(h);
      }
      if (href) {
        const link = document2.createElement("a");
        link.href = href;
        link.textContent = heading && heading.textContent.trim() || eyebrow && eyebrow.textContent.trim() || href;
        const p = document2.createElement("p");
        p.append(link);
        textCell.push(p);
      }
      cells.push([picture || "", textCell.length ? textCell : ""]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-quick-link", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/behr-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
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
    if (hookName === TransformHook.afterTransform) {
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
  function transform2(hookName, element, payload) {
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

  // tools/importer/import-home.js
  var parsers = {
    "hero-gallery": parse,
    "cards-feature": parse2,
    "cards-quick-link": parse3
  };
  var PAGE_TEMPLATE = {
    name: "home",
    description: "Behr homepage: color-of-the-year hero with image gallery, stacked feature panels, statement quote, and quick-link list",
    urls: [
      "https://www.behr.com/"
    ],
    blocks: [
      {
        name: "hero-gallery",
        instances: [".homepage-hero.block"]
      },
      {
        name: "cards-feature",
        instances: [".feature.block"]
      },
      {
        name: "cards-quick-link",
        instances: [".quick-link-list.block"]
      }
    ],
    sections: [
      {
        id: "1",
        name: "hero",
        selector: [".section.homepage-hero-container"],
        style: null,
        blocks: ["hero-gallery"],
        defaultContent: []
      },
      {
        id: "2",
        name: "feature-panels",
        selector: [".section.feature-container"],
        style: null,
        blocks: ["cards-feature"],
        defaultContent: []
      },
      {
        id: "3",
        name: "statement",
        selector: [".section.statement-container"],
        style: "statement",
        blocks: [],
        defaultContent: [".statement.block h2"]
      },
      {
        id: "4",
        name: "quick-links",
        selector: [".section.quick-link-list-container"],
        style: null,
        blocks: ["cards-quick-link"],
        defaultContent: []
      }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
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
  var import_home_default = {
    transform: (payload) => {
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
      const hr = document2.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document2);
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
  return __toCommonJS(import_home_exports);
})();
