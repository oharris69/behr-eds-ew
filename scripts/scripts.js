import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
  readBlockConfig,
  toCamelCase,
  toClassName,
} from './aem.js';

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    createHTML: (input, type, sink) => {
      let processedInput = input;
      if (/srcdoc\s*=/i.test(processedInput)) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
        processedInput = doc.body.innerHTML;
      }
      if (sink.includes('createContextualFragment') || sink.includes('Document write')) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('script').forEach((el) => el.remove());
        processedInput = doc.body.innerHTML;
      }
      return processedInput;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Applies section-metadata tables to their sections: `style` becomes section
 * classes, other keys become data attributes. Runs after decorateSections.
 * @param {Element} main The main element
 */
function decorateSectionMetadata(main) {
  main.querySelectorAll(':scope > .section').forEach((section) => {
    const sectionMeta = section.querySelector(':scope > div > .section-metadata');
    if (!sectionMeta) return;
    const meta = readBlockConfig(sectionMeta);
    Object.keys(meta).forEach((key) => {
      if (key === 'style') {
        String(meta.style).split(',')
          .map((style) => toClassName(style.trim()))
          .filter((style) => style)
          .forEach((style) => section.classList.add(style));
      } else {
        section.dataset[toCamelCase(key)] = meta[key];
      }
    });
    sectionMeta.parentElement.remove();
  });
}

/**
 * Turns authored `:icon-name:` shorthand into icon spans. The Edge Delivery pipeline does
 * this when it renders a page; content served as-is (local preview, some fragments) still
 * has the text form.
 * @param {Element} main The main element
 */
function decorateIconShorthand(main) {
  const pattern = /:([a-z][a-z0-9-]*):/g;
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.textContent.includes(':')
      && !node.parentElement.closest('pre, code, script, style')
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const parts = node.textContent.split(pattern);
    if (parts.length === 1) return;
    // split() alternates text and captured icon names
    node.replaceWith(...parts.map((part, i) => {
      if (i % 2 === 0) return part;
      const span = document.createElement('span');
      span.className = `icon icon-${part}`;
      return span;
    }).filter((part) => part !== ''));
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIconShorthand(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateSectionMetadata(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
const GENERIC_LINK_TEXT = /^(read|learn|see|view|discover|find out|explore) more$|^more$|^click here$|^here$/i;

/**
 * Gives generic links ("Read more", "See More", …) the context of their nearest heading as
 * visually hidden text, e.g. "Read more: Living Room Paint Colors", so screen readers and
 * search engines can tell them apart. Runs once blocks are decorated.
 * @param {Element} main The main element
 */
function describeGenericLinks(main) {
  const headingText = (h) => {
    const clone = h.cloneNode(true);
    clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    return clone.textContent.replace(/\s+/g, ' ').trim();
  };
  main.querySelectorAll('a[href]').forEach((link) => {
    if (link.hasAttribute('aria-label') || link.querySelector('.visually-hidden')) return;
    if (!GENERIC_LINK_TEXT.test(link.textContent.trim())) return;
    // closest container (card, block, section) holding a heading; prefer the one before the link
    for (let node = link.parentElement; node && node !== main; node = node.parentElement) {
      const headings = [...node.querySelectorAll('h1, h2, h3, h4, h5, h6')]
        .filter((h) => !h.contains(link) && headingText(h));
      if (headings.length) {
        const before = headings
          // eslint-disable-next-line no-bitwise
          .filter((h) => h.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING);
        const heading = before.length ? before[before.length - 1] : headings[0];
        const hidden = document.createElement('span');
        hidden.className = 'visually-hidden';
        hidden.textContent = `: ${headingText(heading)}`;
        link.append(hidden);
        return;
      }
      if (node.classList.contains('section')) return;
    }
  });
}

// hosts that are this site (Behr pages not migrated yet still live on www.behr.com)
const SITE_HOSTS = ['www.behr.com', 'behr.com'];

/**
 * Opens links to other sites in a new tab, as on behr.com, and tells screen reader users.
 * @param {Element} root container to decorate
 */
function decorateExternalLinks(root) {
  if (!root) return;
  root.querySelectorAll('a[href]').forEach((link) => {
    let url;
    try {
      url = new URL(link.href);
    } catch (e) {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || link.hasAttribute('target')) return;
    if (url.hostname === window.location.hostname || SITE_HOSTS.includes(url.hostname)) return;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (!link.hasAttribute('aria-label')) {
      const note = document.createElement('span');
      note.className = 'visually-hidden';
      note.textContent = ' (opens in a new tab)';
      link.append(note);
    }
  });
}

async function loadLazy(doc) {
  loadHeader(doc.querySelector('body > header'));

  const main = doc.querySelector('main');
  await loadSections(main);
  describeGenericLinks(main);
  decorateExternalLinks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  const footer = doc.querySelector('body > footer');
  loadFooter(footer).then(() => decorateExternalLinks(footer));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  import('./consent-check.js');
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
