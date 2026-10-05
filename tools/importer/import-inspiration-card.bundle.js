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

  // tools/importer/import-inspiration-card.js
  var import_inspiration_card_exports = {};
  __export(import_inspiration_card_exports, {
    default: () => import_inspiration_card_default
  });

  // tools/importer/parsers/eds-block.js
  function parse(element, { document }) {
    const [name, ...options] = [...element.classList];
    const title = name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const blockName = options.length ? `${title} (${options.join(", ")})` : title;
    element.querySelectorAll("span.icon").forEach((span) => {
      const iconClass = [...span.classList].find((c) => c.startsWith("icon-"));
      span.replaceWith(document.createTextNode(iconClass ? `:${iconClass.slice(5)}:` : ""));
    });
    const cells = [...element.children].map((row) => [...row.children].map((cell) => {
      const nodes = [...cell.childNodes].filter((n) => n.nodeType !== 3 || n.textContent.trim());
      if (nodes.length === 0) return "";
      if (nodes.length === 1 && nodes[0].nodeType === 3) return nodes[0].textContent.trim();
      const frag = document.createElement("div");
      nodes.forEach((n) => frag.append(n));
      return frag.childNodes.length === 1 ? frag.firstChild : [...frag.childNodes];
    }));
    const block = WebImporter.Blocks.createBlock(document, { name: blockName, cells });
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

  // tools/importer/import-inspiration-card.js
  var parsers = {
    "inspiration-card": parse
  };
  var PAGE_TEMPLATE = {
    name: "inspiration-card",
    blocks: [
      { name: "inspiration-card", instances: ["main > div > div.inspiration-card"] }
    ]
  };
  var transformers = [transform];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        elements.forEach((element) => pageBlocks.push({ name: blockDef.name, selector, element }));
      });
    });
    return pageBlocks;
  }
  var import_inspiration_card_default = {
    transform: (payload) => {
      var _a, _b;
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        try {
          parsers[block.name](block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const head = (sel) => {
        var _a2;
        return (_a2 = document.querySelector(sel)) == null ? void 0 : _a2.getAttribute("content");
      };
      const meta = {
        Title: (_b = (_a = document.querySelector("title")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.replace(/\s*\|\s*Behr\s*$/i, "").trim()
      };
      const description = head('meta[name="description"]');
      if (description) meta.Description = description.replace(/​/g, "").trim();
      const ogImage = head('meta[property="og:image"]');
      if (ogImage) {
        const img = document.createElement("img");
        img.src = ogImage;
        img.alt = head('meta[property="og:image:alt"]') || "";
        meta.Image = img;
      }
      const tags = [...document.querySelectorAll('meta[property="article:tag"]')].map((m) => m.getAttribute("content"));
      if (tags.length) meta.tags = tags.join(", ");
      ["template", "robots", "priority"].forEach((key) => {
        const value = head(`meta[name="${key}"]`);
        if (value) meta[key] = value;
      });
      main.appendChild(document.createElement("hr"));
      main.appendChild(WebImporter.Blocks.getMetadataBlock(document, meta));
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, ""));
      return [{
        element: main,
        path,
        report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) }
      }];
    }
  };
  return __toCommonJS(import_inspiration_card_exports);
})();
