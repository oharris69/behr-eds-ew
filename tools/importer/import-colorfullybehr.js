/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroSpotlightParser from './parsers/hero-spotlight.js';
import cardsPostParser from './parsers/cards-post.js';
import columnsSplitParser from './parsers/columns-split.js';

// TRANSFORMER IMPORTS
import behrBlogCleanupTransformer from './transformers/behr-blog-cleanup.js';
import behrCleanupTransformer from './transformers/behr-cleanup.js';
import behrSectionsTransformer from './transformers/behr-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-spotlight': heroSpotlightParser,
  'cards-post': cardsPostParser,
  'columns-split': columnsSplitParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: "colorfullybehr",
  description: "ColorfullyBEHR blog landing: spotlight hero, Today's Must-Reads post cards with a more link, Ask an Expert image/text split, Color of the Year / Color Spotlight feature cards",
  urls: [
    "https://www.behr.com/colorfullybehr/"
  ],
  blocks: [
    {
      name: "hero-spotlight",
      instances: [
        "#banner #smartslider3-2"
      ]
    },
    {
      name: "cards-post",
      instances: [
        "#news .postGrid",
        "#info"
      ]
    },
    {
      name: "columns-split",
      instances: [
        "#ask"
      ]
    }
  ],
  sections: [
    {
      id: "1",
      name: "spotlight-hero",
      selector: [
        "#banner"
      ],
      style: null,
      blocks: [
        "hero-spotlight"
      ],
      defaultContent: []
    },
    {
      id: "2",
      name: "must-reads",
      selector: [
        "#news"
      ],
      style: "light, centered",
      blocks: [
        "cards-post"
      ],
      defaultContent: [
        "#news .textwidget > h2",
        "#news .textwidget > p:has(> a.btn)"
      ]
    },
    {
      id: "3",
      name: "ask-an-expert",
      selector: [
        "#ask"
      ],
      style: null,
      blocks: [
        "columns-split"
      ],
      defaultContent: []
    },
    {
      id: "4",
      name: "feature-cards",
      selector: [
        "#info"
      ],
      style: "light",
      blocks: [
        "cards-post"
      ],
      defaultContent: []
    }
  ]
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

    // 5. WebImporter built-in rules + page metadata
    const title = document.querySelector('title')?.textContent?.replace(/\s*\|\s*Behr\s*$/i, '').trim()
      || document.querySelector('h1')?.textContent?.trim();
    const description = document.querySelector('meta[name="description"]')?.content
      || document.querySelector('meta[property="og:description"]')?.content;
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    const meta = { Title: title };
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

    // 6. Sanitized path; a folder URL (/colorfullybehr/) is that folder's index page
    const { pathname } = new URL(params.originalURL);
    const rawPath = pathname.endsWith('/') ? `${pathname}index` : pathname.replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath);

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
