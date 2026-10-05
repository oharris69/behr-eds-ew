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

  // tools/importer/import-colorfullybehr-sidebar.js
  var import_colorfullybehr_sidebar_exports = {};
  __export(import_colorfullybehr_sidebar_exports, {
    default: () => import_colorfullybehr_sidebar_default
  });

  // tools/importer/fragments/behr-blog-sidebar.js
  function buildSidebarFragment(sidebar, document) {
    const root = document.createElement("div");
    const widgets = [...sidebar.querySelectorAll(":scope > section.widget, :scope > .widget")];
    widgets.forEach((widget, i) => {
      if (i > 0) root.append(document.createElement("hr"));
      const title = widget.querySelector(".widget-title");
      if (title) {
        const h2 = document.createElement("h2");
        h2.textContent = title.textContent.trim();
        root.append(h2);
        title.remove();
      }
      const walker = document.createTreeWalker(
        widget,
        128
        /* NodeFilter.SHOW_COMMENT */
      );
      const comments = [];
      while (walker.nextNode()) comments.push(walker.currentNode);
      comments.forEach((c) => c.remove());
      widget.querySelectorAll("p").forEach((p) => {
        if (!p.textContent.trim() && !p.querySelector("img, a")) p.remove();
      });
      widget.querySelectorAll(".postSingle").forEach((post) => {
        var _a;
        const card = document.createElement("div");
        const link = post.querySelector(".postTitle a");
        const img = post.querySelector(".postImage img");
        if (img) {
          const p = document.createElement("p");
          const a = document.createElement("a");
          a.href = link ? link.href : ((_a = post.querySelector(".postImage a")) == null ? void 0 : _a.href) || "";
          a.append(img);
          p.append(a);
          card.append(p);
        }
        if (link) {
          const h3 = document.createElement("h3");
          const a = document.createElement("a");
          a.href = link.href;
          a.textContent = link.textContent.trim();
          h3.append(a);
          card.append(h3);
        }
        post.replaceWith(...card.childNodes);
      });
      widget.querySelectorAll(".pins-feed-item").forEach((pin) => {
        const a = pin.querySelector("a");
        const img = pin.querySelector("img");
        const li = document.createElement("li");
        if (a && img) {
          const link = document.createElement("a");
          link.href = a.href;
          link.append(img);
          li.append(link);
        }
        pin.replaceWith(li);
      });
      root.append(...widget.querySelectorAll(":scope > *"));
    });
    return root;
  }

  // tools/importer/import-colorfullybehr-sidebar.js
  var SIDEBAR_FRAGMENT_PATH = "/colorfullybehr/fragments/sidebar";
  var import_colorfullybehr_sidebar_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const sidebar = document.querySelector("#secondary.widget-area");
      const fragment = sidebar ? buildSidebarFragment(sidebar, document) : document.createElement("div");
      WebImporter.rules.adjustImageUrls(fragment, url, params.originalURL);
      return [{
        element: fragment,
        path: SIDEBAR_FRAGMENT_PATH,
        report: { title: "ColorfullyBEHR sidebar fragment", template: "colorfullybehr-sidebar", blocks: [] }
      }];
    }
  };
  return __toCommonJS(import_colorfullybehr_sidebar_exports);
})();
