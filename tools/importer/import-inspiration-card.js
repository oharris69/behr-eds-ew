/* eslint-disable */
/* global WebImporter */

// Inspiration card pages (/inspiration/cards/<area>/<card>), listed in the /inspiration/ grid.
// The source is an Edge Delivery site: the snapshot is the authored .plain.html wrapped in the
// source <head> (see migration-work/tools/eds-snapshot.js), so the inspiration-card block table
// is kept as authored. The card's tags (article:tag) become the "Tags" metadata the
// inspiration-cards index reads.

// PARSER IMPORTS
import edsBlockParser from './parsers/eds-block.js';

// TRANSFORMER IMPORTS
import behrCleanupTransformer from './transformers/behr-cleanup.js';

const parsers = {
  'inspiration-card': edsBlockParser,
};

const PAGE_TEMPLATE = {
  name: 'inspiration-card',
  blocks: [
    { name: 'inspiration-card', instances: ['main > div > div.inspiration-card'] },
  ],
};

const transformers = [behrCleanupTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
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

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      try {
        parsers[block.name](block.element, { document, url, params });
      } catch (e) {
        console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
      }
    });

    executeTransformers('afterTransform', main, payload);

    // page metadata; keys that drive code or the index are lowercase
    const head = (sel) => document.querySelector(sel)?.getAttribute('content');
    const meta = {
      Title: document.querySelector('title')?.textContent?.replace(/\s*\|\s*Behr\s*$/i, '').trim(),
    };
    const description = head('meta[name="description"]');
    if (description) meta.Description = description.replace(/​/g, '').trim();
    const ogImage = head('meta[property="og:image"]');
    if (ogImage) {
      const img = document.createElement('img');
      img.src = ogImage;
      img.alt = head('meta[property="og:image:alt"]') || '';
      meta.Image = img;
    }
    const tags = [...document.querySelectorAll('meta[property="article:tag"]')].map((m) => m.getAttribute('content'));
    if (tags.length) meta.tags = tags.join(', ');
    ['template', 'robots', 'priority'].forEach((key) => {
      const value = head(`meta[name="${key}"]`);
      if (value) meta[key] = value;
    });
    main.appendChild(document.createElement('hr'));
    main.appendChild(WebImporter.Blocks.getMetadataBlock(document, meta));
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const path = WebImporter.FileUtils.sanitizePath(new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html?$/, ''));
    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
