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

  // tools/importer/import-inspiration.js
  var import_inspiration_exports = {};
  __export(import_inspiration_exports, {
    default: () => import_inspiration_default
  });

  // tools/importer/parsers/eds-block.js
  function parse(element, { document: document2 }) {
    const [name, ...options] = [...element.classList];
    const title = name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const blockName = options.length ? `${title} (${options.join(", ")})` : title;
    element.querySelectorAll("span.icon").forEach((span) => {
      const iconClass = [...span.classList].find((c) => c.startsWith("icon-"));
      span.replaceWith(document2.createTextNode(iconClass ? `:${iconClass.slice(5)}:` : ""));
    });
    const cells = [...element.children].map((row) => [...row.children].map((cell) => {
      const nodes = [...cell.childNodes].filter((n) => n.nodeType !== 3 || n.textContent.trim());
      if (nodes.length === 0) return "";
      if (nodes.length === 1 && nodes[0].nodeType === 3) return nodes[0].textContent.trim();
      const frag = document2.createElement("div");
      nodes.forEach((n) => frag.append(n));
      return frag.childNodes.length === 1 ? frag.firstChild : [...frag.childNodes];
    }));
    const block = WebImporter.Blocks.createBlock(document2, { name: blockName, cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/simple-hero.js
  function parse2(element, context) {
    element.className = "hero-spotlight dark";
    parse(element, context);
  }

  // tools/importer/parsers/fragment-link.js
  function parse3(element, { document: document2 }) {
    const a = element.querySelector("a[href]");
    if (!a) return;
    const href = new URL(a.getAttribute("href"), "https://www.behr.com").pathname;
    const link = document2.createElement("a");
    link.href = href;
    link.textContent = href;
    const block = WebImporter.Blocks.createBlock(document2, { name: "Fragment", cells: [[link]] });
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

  // tools/importer/import-inspiration.js
  var parsers = {
    // the source is an Edge Delivery site: block tables are kept as authored
    "hero-spotlight": parse2,
    "inspiration-grid": parse,
    fragment: parse3
  };
  var COLOR_META = ["template"];
  var PAGE_TEMPLATE = {
    name: "inspiration",
    description: "Inspiration landing (target of the /inspiration/designer-stories redirect): dark-box hero, filterable inspiration card grid, shared tools fragment",
    urls: [
      "https://www.behr.com/inspiration/"
    ],
    blocks: [
      {
        name: "hero-spotlight",
        instances: [
          "main > div > div.simple-hero"
        ]
      },
      {
        name: "inspiration-grid",
        instances: [
          "main > div > div.inspiration-grid"
        ]
      },
      {
        name: "fragment",
        instances: [
          'main > div > p:has(> a[href^="/fragments/"]:only-child)'
        ]
      }
    ],
    sections: [
      {
        id: "1",
        name: "hero",
        selector: [
          "main > div:has(> div.simple-hero)"
        ],
        style: null,
        blocks: [
          "hero-spotlight"
        ],
        defaultContent: []
      },
      {
        id: "2",
        name: "inspiration-grid",
        selector: [
          "main > div:has(> div.inspiration-grid)"
        ],
        style: null,
        blocks: [
          "inspiration-grid"
        ],
        defaultContent: []
      },
      {
        id: "3",
        name: "tools",
        selector: [
          'main > div:has(> p > a[href^="/fragments/"])'
        ],
        style: null,
        blocks: [
          "fragment"
        ],
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
  var import_inspiration_default = {
    transform: (payload) => {
      var _a, _b, _c, _d;
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
      const title = (_b = (_a = document2.querySelector("title")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.replace(/\s*\|\s*Behr\s*$/i, "").trim();
      const description = (_c = document2.querySelector('meta[name="description"]')) == null ? void 0 : _c.content;
      const ogImage = (_d = document2.querySelector('meta[property="og:image"]')) == null ? void 0 : _d.content;
      const meta = { Title: title };
      if (description) meta.Description = description;
      if (ogImage) {
        const img = document2.createElement("img");
        img.src = ogImage;
        meta.Image = img;
      }
      COLOR_META.forEach((key) => {
        var _a2;
        const value = (_a2 = document2.querySelector(`meta[name="${key}"]`)) == null ? void 0 : _a2.content;
        if (value) meta[key] = value;
      });
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
  return __toCommonJS(import_inspiration_exports);
})();
