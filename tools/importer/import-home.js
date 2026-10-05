/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroGalleryParser from './parsers/hero-gallery.js';
import cardsFeatureParser from './parsers/cards-feature.js';
import cardsQuickLinkParser from './parsers/cards-quick-link.js';

// TRANSFORMER IMPORTS
import behrCleanupTransformer from './transformers/behr-cleanup.js';
import behrSectionsTransformer from './transformers/behr-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-gallery': heroGalleryParser,
  'cards-feature': cardsFeatureParser,
  'cards-quick-link': cardsQuickLinkParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'home',
  description: 'Behr homepage: color-of-the-year hero with image gallery, stacked feature panels, statement quote, and quick-link list',
  urls: [
    'https://www.behr.com/',
  ],
  blocks: [
    {
      name: 'hero-gallery',
      instances: ['.homepage-hero.block'],
    },
    {
      name: 'cards-feature',
      instances: ['.feature.block'],
    },
    {
      name: 'cards-quick-link',
      instances: ['.quick-link-list.block'],
    },
  ],
  sections: [
    {
      id: '1',
      name: 'hero',
      selector: ['.section.homepage-hero-container'],
      style: null,
      blocks: ['hero-gallery'],
      defaultContent: [],
    },
    {
      id: '2',
      name: 'feature-panels',
      selector: ['.section.feature-container'],
      style: null,
      blocks: ['cards-feature'],
      defaultContent: [],
    },
    {
      id: '3',
      name: 'statement',
      selector: ['.section.statement-container'],
      style: 'statement',
      blocks: [],
      defaultContent: ['.statement.block h2'],
    },
    {
      id: '4',
      name: 'quick-links',
      selector: ['.section.quick-link-list-container'],
      style: null,
      blocks: ['cards-quick-link'],
      defaultContent: [],
    },
  ],
};

// TRANSFORMER REGISTRY - cleanup first, then section breaks/metadata
const transformers = [
  behrCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [behrSectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. Initial cleanup + section breaks
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block (skip elements already replaced by a prior parser)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Final cleanup + section metadata
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path; root URL maps to /index
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
