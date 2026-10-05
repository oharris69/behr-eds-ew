/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import edsBlockParser from './parsers/eds-block.js';
import colorCollectionParser from './parsers/color-collection.js';
import colorSummaryParser from './parsers/color-summary.js';
import colorPalettesParser from './parsers/color-palettes.js';
import paletteCarouselParser from './parsers/palette-carousel.js';
import fragmentLinkParser from './parsers/fragment-link.js';

// TRANSFORMER IMPORTS
import behrCleanupTransformer from './transformers/behr-cleanup.js';
import edsSectionsTransformer from './transformers/eds-sections.js';

// PARSER REGISTRY
const parsers = {
  // the source is an Edge Delivery site: its block tables are kept as authored
  'premium-color-hero': edsBlockParser,
  'color-summary': colorSummaryParser,
  'room-carousel': edsBlockParser,
  'color-collection': colorCollectionParser,
  'color-trends-visualizer': edsBlockParser,
  'fifty-fifty': edsBlockParser,
  testimonial: edsBlockParser,
  'image-cards': edsBlockParser,
  faq: edsBlockParser,
  // premium pages with more modules (e.g. Whisper White HDC-MD-08)
  'color-palettes': colorPalettesParser,
  gallery: edsBlockParser,
  'palette-carousel': paletteCarouselParser,
  'color-visualizer': edsBlockParser,
  'bento-grid': edsBlockParser,
  fragment: fragmentLinkParser,
};

// Source page metadata carried over (color detail data used by the color blocks)
const COLOR_META = [
  'template', 'color-code', 'color-name', 'rgbhex', 'color-family',
  'color-r', 'color-g', 'color-b', 'lrv', 'premium-color', 'color-detail-description-fragment',
];

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
// sections: every authored main > div is a section (eds-sections transformer)
const PAGE_TEMPLATE = {
  name: "color-detail",
  description: "Premium color detail pages (e.g. Grounded T27-01, Whisper White HDC-MD-08): video hero with color bar, color summary, room carousel, palettes, visualizer, gallery, sample/product CTAs, testimonial, carousels, FAQ, shared fragments",
  urls: [
    "https://www.behr.com/colors/color-detail/t27-01",
    "https://www.behr.com/colors/color-detail/hdc-md-08"
  ],
  blocks: [
    {
      name: "premium-color-hero",
      instances: [
        "main > div > div.premium-color-hero"
      ]
    },
    {
      name: "color-summary",
      instances: [
        "main > div > div.color-summary"
      ]
    },
    {
      name: "room-carousel",
      instances: [
        "main > div > div.room-carousel"
      ]
    },
    {
      name: "color-collection",
      instances: [
        "main > div > div.color-collection"
      ]
    },
    {
      name: "color-trends-visualizer",
      instances: [
        "main > div > div.color-trends-visualizer"
      ]
    },
    {
      name: "color-palettes",
      instances: [
        "main > div > div.color-palettes"
      ]
    },
    {
      name: "gallery",
      instances: [
        "main > div > div.gallery"
      ]
    },
    {
      name: "fifty-fifty",
      instances: [
        "main > div > div.fifty-fifty"
      ]
    },
    {
      name: "testimonial",
      instances: [
        "main > div > div.testimonial"
      ]
    },
    {
      name: "image-cards",
      instances: [
        "main > div > div.image-cards"
      ]
    },
    {
      name: "palette-carousel",
      instances: [
        "main > div > div.palette-carousel"
      ]
    },
    {
      name: "faq",
      instances: [
        "main > div > div.faq"
      ]
    },
    {
      name: "color-visualizer",
      instances: [
        "main > div > div.color-visualizer"
      ]
    },
    {
      name: "bento-grid",
      instances: [
        "main > div > div.bento-grid"
      ]
    },
    {
      name: "fragment",
      instances: [
        "main > div > p:has(> a[href*=\"/fragments/\"]:only-child)"
      ]
    }
  ]
};

// TRANSFORMER REGISTRY
const transformers = [
  behrCleanupTransformer,
  edsSectionsTransformer,
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

    // 5. WebImporter built-in rules + page metadata.
    // Color keys drive block code (getMetadata), so they are written in lowercase.
    const title = document.querySelector('title')?.textContent?.replace(/\s*\|\s*Behr\s*$/i, '').trim();
    const description = document.querySelector('meta[name="description"]')?.content;
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    const meta = { Title: title };
    if (description) meta.Description = description;
    if (ogImage) {
      const img = document.createElement('img');
      img.src = ogImage;
      meta.Image = img;
    }
    COLOR_META.forEach((key) => {
      const value = document.querySelector(`meta[name="${key}"]`)?.content;
      if (value) meta[key] = value;
    });
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
