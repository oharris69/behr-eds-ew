/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import filterChipsParser from './parsers/filter-chips.js';
import cardsPostProParser from './parsers/cards-post-pro.js';
import fiftyFiftyProductsParser from './parsers/fifty-fifty-products.js';

// TRANSFORMER IMPORTS
import behrProCleanupTransformer from './transformers/behr-pro-cleanup.js';
import behrCleanupTransformer from './transformers/behr-cleanup.js';
import behrSectionsTransformer from './transformers/behr-sections.js';

// PARSER REGISTRY (filter-chips runs before cards-post: template order)
const parsers = {
  'carousel-hero': carouselHeroParser,
  'filter-chips': filterChipsParser,
  'cards-post': cardsPostProParser,
  'fifty-fifty': fiftyFiftyProductsParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: "pro",
  description: "On the Job with BEHR Pro blog landing: hero carousel, audience filter chips, highlighted latest post, filterable post grid with Load More, Trends posts, Shop BEHR Products",
  urls: [
    "https://www.behr.com/pro/onthejob/"
  ],
  blocks: [
    {
      name: "carousel-hero",
      instances: [
        "section.hero-swiper"
      ]
    },
    {
      name: "filter-chips",
      instances: [
        "section.filter"
      ]
    },
    {
      name: "cards-post",
      instances: [
        "section.most-recent-blog .single-blog-article",
        "section.blogs .blogs__block",
        "section.trends .container > .row:has(.blogs-article)"
      ]
    },
    {
      name: "fifty-fifty",
      instances: [
        "section.shop .shop__products"
      ]
    }
  ],
  sections: [
    {
      id: "1",
      name: "hero",
      selector: [
        "section.hero-swiper"
      ],
      style: null,
      blocks: [
        "carousel-hero"
      ],
      defaultContent: []
    },
    {
      id: "2",
      name: "audience-filter",
      selector: [
        "section.filter"
      ],
      style: null,
      blocks: [
        "filter-chips"
      ],
      defaultContent: []
    },
    {
      id: "3",
      name: "latest-post",
      selector: [
        "section.most-recent-blog"
      ],
      style: "light",
      blocks: [
        "cards-post"
      ],
      defaultContent: []
    },
    {
      id: "4",
      name: "post-grid",
      selector: [
        "section.blogs"
      ],
      style: null,
      blocks: [
        "cards-post"
      ],
      defaultContent: []
    },
    {
      id: "5",
      name: "trends",
      selector: [
        "section.trends"
      ],
      style: null,
      blocks: [
        "cards-post"
      ],
      defaultContent: [
        "section.trends .trends__header",
        "section.trends .d-sm-block > a.trends__link"
      ]
    },
    {
      id: "6",
      name: "shop",
      selector: [
        "section.shop"
      ],
      style: "centered",
      blocks: [
        "fifty-fifty"
      ],
      defaultContent: [
        "section.shop .shop__header",
        "section.shop .shop__description",
        "section.shop .shop__publisher"
      ]
    }
  ]
};

// TRANSFORMER REGISTRY - pro cleanup first (keeps #eds-filter-grids for the parsers until afterTransform)
const transformers = [
  behrProCleanupTransformer,
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
    const title = document.querySelector('title')?.textContent?.replace(/\s*[-|]\s*Professional painting blog\s*$/i, '').replace(/\s*\|\s*Behr\s*$/i, '').trim()
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
