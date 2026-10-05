/* eslint-disable */
/* global WebImporter */

// Fragments from a source that is itself an Edge Delivery site (e.g. /fragments/color-details/*).
// Snapshot: tools/importer/bd-snapshots/<host>/<path>.html = the authored .plain.html wrapped in a
// document, so the content is already in its authored form. Sections and any block tables are kept
// as-is; the document is a fragment, so no page metadata block is added.

import edsBlockParser from './parsers/eds-block.js';

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.querySelector('main') || document.body;

    // blocks inside the fragment keep their authored table
    [...main.querySelectorAll(':scope > div > div[class]')].forEach((block) => {
      edsBlockParser(block, { document, url, params });
    });

    // sections: the authored <div>s become section breaks
    const sections = [...main.children].filter((el) => el.tagName === 'DIV');
    sections.slice(1).forEach((section) => section.before(document.createElement('hr')));
    sections.forEach((section) => section.replaceWith(...section.childNodes));

    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const path = WebImporter.FileUtils.sanitizePath(new URL(params.originalURL).pathname.replace(/\.html?$/, ''));
    return [{
      element: main,
      path,
      report: { title: path, template: 'eds-fragment', blocks: [] },
    }];
  },
};
