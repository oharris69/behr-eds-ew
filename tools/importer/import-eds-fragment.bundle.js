/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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

  // tools/importer/import-eds-fragment.js
  var import_eds_fragment_exports = {};
  __export(import_eds_fragment_exports, {
    default: () => import_eds_fragment_default
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

  // tools/importer/import-eds-fragment.js
  var import_eds_fragment_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.querySelector("main") || document.body;
      const STYLE_BY_BLOCK = { "color-collection": "light", "fifty-fifty": "light", "image-cards": "light" };
      const styles = /* @__PURE__ */ new Map();
      [...main.children].filter((el) => el.tagName === "DIV").forEach((section) => {
        const block = [...section.querySelectorAll(":scope > div[class]")].find((el) => STYLE_BY_BLOCK[el.classList[0]]);
        if (block) styles.set(section, STYLE_BY_BLOCK[block.classList[0]]);
      });
      [...main.querySelectorAll(":scope > div > div[class]")].forEach((block) => {
        parse(block, { document, url, params });
      });
      styles.forEach((style, section) => {
        section.append(WebImporter.Blocks.createBlock(document, { name: "Section Metadata", cells: { style } }));
      });
      const sections = [...main.children].filter((el) => el.tagName === "DIV");
      sections.slice(1).forEach((section) => section.before(document.createElement("hr")));
      sections.forEach((section) => section.replaceWith(...section.childNodes));
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(new URL(params.originalURL).pathname.replace(/\.html?$/, ""));
      return [{
        element: main,
        path,
        report: { title: path, template: "eds-fragment", blocks: [] }
      }];
    }
  };
  return __toCommonJS(import_eds_fragment_exports);
})();
