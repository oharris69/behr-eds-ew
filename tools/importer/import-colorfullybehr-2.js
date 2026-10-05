/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsRelatedParser from './parsers/cards-related.js';
import fragmentParser from './parsers/fragment.js';

// TRANSFORMER IMPORTS
import behrBlogCleanupTransformer from './transformers/behr-blog-cleanup.js';
import behrCleanupTransformer from './transformers/behr-cleanup.js';
import behrSectionsTransformer from './transformers/behr-sections.js';

// PARSER REGISTRY
const parsers = {
  'cards-related': cardsRelatedParser,
  fragment: fragmentParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'colorfullybehr-2',
  description: 'ColorfullyBEHR blog article: category eyebrow, title and byline, long-form body with captioned images and Q&A, tags, Picks for you related posts, shared sidebar',
  urls: [
    'https://www.behr.com/colorfullybehr/behr-announces-2027-color-of-the-year-grounded/',
  ],
  blocks: [
    {
      name: 'cards-related',
      instances: ['.singleRelated .postGrid.postRelated'],
    },
    {
      name: 'fragment',
      instances: ['#secondary.widget-area'],
    },
  ],
  sections: [
    {
      id: '1',
      name: 'article-header',
      selector: ['article.post > h5.postCategory'],
      style: null,
      blocks: [],
      defaultContent: ['article.post > h5.postCategory', 'article.post > header.entry-header h1', 'article.post > div.singleInfo'],
    },
    {
      id: '2',
      name: 'article-body',
      selector: ['article.post > div.entry-content'],
      style: null,
      blocks: [],
      defaultContent: ['article.post > div.entry-content'],
    },
    {
      id: '3',
      name: 'post-tags',
      selector: ['article.post > footer.entry-footer .singleTags'],
      style: 'tags',
      blocks: [],
      defaultContent: ['article.post > footer.entry-footer .singleTags'],
    },
    {
      id: '4',
      name: 'related-posts',
      selector: ['#primary div.singleRelated'],
      style: null,
      blocks: ['cards-related'],
      defaultContent: ['.singleRelated .linedTitle h2'],
    },
    {
      id: '5',
      name: 'sidebar',
      selector: ['#secondary.widget-area'],
      style: 'sidebar',
      blocks: ['fragment'],
      defaultContent: [],
    },
  ],
};

// TRANSFORMER REGISTRY - blog cleanup must run before behr-cleanup (which drops all <header>/<footer>)
const transformers = [
  behrBlogCleanupTransformer,
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

    // 5. WebImporter built-in rules; page metadata carries the blog-post template
    const title = document.querySelector('title')?.textContent?.replace(/\s*\|\s*Behr\s*$/i, '').trim()
      || document.querySelector('h1')?.textContent?.trim();
    const description = document.querySelector('meta[name="description"]')?.content
      || document.querySelector('meta[property="og:description"]')?.content;
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    const meta = { Title: title, template: 'blog-post' };
    if (description) meta.Description = description;
    if (ogImage) {
      const img = document.createElement('img');
      img.src = ogImage;
      meta.Image = img;
    }
    main.appendChild(document.createElement('hr'));
    main.appendChild(WebImporter.Blocks.getMetadataBlock(document, meta));
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
