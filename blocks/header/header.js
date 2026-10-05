import { toClassName } from '../../scripts/aem.js';

// Source header switches between mobile and desktop layouts at 1024px.
const isDesktop = window.matchMedia('(width >= 1024px)');

/**
 * Fetches the nav fragment. /content/nav.plain.html is served by the local
 * dev server; /nav.plain.html is the fragment on DA/EDS preview and live.
 * @returns {Promise<Document|null>} parsed fragment
 */
async function fetchNav() {
  // the local dev server serves imported content under /content; DA/EDS serves it at the root
  let resp = window.location.pathname.startsWith('/content/')
    ? await fetch('/content/nav.plain.html') : null;
  if (!resp?.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
  // fragment image paths are relative to the fragment itself
  doc.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), resp.url).href;
  });
  return doc;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  });
  children.flat().forEach((c) => { if (c) node.append(c); });
  return node;
}

// Text label that reserves its semi-bold width (see ::before in CSS) so hover never shifts layout.
function textLabel(text) {
  return el('span', { class: 'nav-label', 'data-text': text }, text);
}

// Icons are single-color SVGs painted with currentcolor through a CSS mask.
function icon(name) {
  const span = el('span', { class: `icon icon-${name}`, 'aria-hidden': 'true' });
  span.style.setProperty('--icon-url', `url('${window.hlx.codeBasePath}/icons/${name}.svg')`);
  return span;
}

/**
 * Splits a container's children into groups, each starting at a heading.
 * @param {Element} section fragment section
 * @param {string} tag heading tag that starts a group
 * @returns {{ heading: Element, nodes: Element[] }[]}
 */
function groupBy(section, tag) {
  const groups = [];
  [...section.children].forEach((child) => {
    if (child.tagName === tag.toUpperCase()) groups.push({ heading: child, nodes: [] });
    else if (groups.length) groups[groups.length - 1].nodes.push(child);
  });
  return groups;
}

const onlyLink = (p) => p?.tagName === 'P' && p.children.length === 1
  && p.firstElementChild.tagName === 'A' && p.textContent.trim() === p.firstElementChild.textContent.trim();
const onlyImage = (p) => p?.tagName === 'P' && p.querySelector('img') && !p.textContent.trim();

/* ---------- megamenu panel ---------- */

function buildLinkSection(heading, nodes) {
  const section = el('div', { class: 'nav-link-section' });
  section.append(el('p', { class: 'nav-link-section-title' }, heading.textContent.trim()));
  const desc = nodes.find((n) => n.tagName === 'P' && !onlyLink(n));
  section.append(el('p', { class: 'nav-link-section-desc' }, desc ? desc.textContent.trim() : ''));
  const list = el('ul', { class: 'nav-link-list' });
  nodes.filter((n) => n.tagName === 'UL').forEach((ul) => {
    ul.querySelectorAll(':scope > li').forEach((li) => {
      const a = li.querySelector('a');
      if (!a) return;
      const link = el('a', { class: 'nav-link', href: a.getAttribute('href') });
      const swatch = a.querySelector('img');
      if (swatch) {
        swatch.className = 'nav-link-swatch';
        swatch.width = 16;
        swatch.height = 16;
        link.append(swatch);
      }
      link.append(textLabel(a.textContent.trim()));
      list.append(el('li', {}, link));
    });
  });
  section.append(list);
  return section;
}

/**
 * Feature cards: image paragraph, h5 title, description, link paragraph.
 * @param {Element[]} nodes nodes after the last link section
 */
function buildCards(nodes) {
  const cards = [];
  let card = null;
  nodes.forEach((n) => {
    if (onlyImage(n)) {
      card = { img: n.querySelector('img') };
      cards.push(card);
    } else if (card && n.tagName === 'H5') card.title = n.textContent.trim();
    else if (card && onlyLink(n)) card.link = n.querySelector('a');
    else if (card && n.tagName === 'P') card.desc = n.textContent.trim();
  });
  const wrap = el('div', { class: 'nav-cards' });
  cards.forEach(({
    img, title, desc, link,
  }) => {
    img.loading = 'lazy';
    const a = el(
      'a',
      { class: 'nav-card', href: link ? link.getAttribute('href') : '#' },
      el('div', { class: 'nav-card-media' }, img),
      el(
        'div',
        { class: 'nav-card-body' },
        title ? el('p', { class: 'nav-card-title' }, el('span', {}, title)) : null,
        // keeps the link's text content "Title Description" rather than "TitleDescription"
        title && desc ? document.createTextNode(' ') : null,
        desc ? el('p', { class: 'nav-card-desc' }, desc) : null,
      ),
    );
    wrap.append(a);
  });
  return wrap;
}

/**
 * Megamenu content: h3 headline, optional CTA link, h4 link sections, h5 cards.
 * @param {Element[]} nodes section content after the h2 trigger label
 */
function buildMegamenu(nodes) {
  const container = el('div', { class: 'nav-panel-grid' });
  const intro = el('div', { class: 'nav-intro' });
  const headline = nodes.find((n) => n.tagName === 'H3');
  if (headline) intro.append(el('h2', { class: 'nav-intro-headline' }, headline.textContent.trim()));
  const firstH4 = nodes.findIndex((n) => n.tagName === 'H4');
  const introNodes = firstH4 < 0 ? nodes : nodes.slice(0, firstH4);
  const cta = introNodes.find(onlyLink);
  if (cta) {
    const a = cta.querySelector('a');
    intro.append(el(
      'a',
      { class: 'nav-cta', href: a.getAttribute('href') },
      el('span', {}, a.textContent.trim()),
      icon('arrow-right'),
    ));
  }
  container.append(intro);

  const holder = el('div');
  nodes.forEach((n) => holder.append(n.cloneNode(true)));
  const groups = groupBy(holder, 'h4');
  const sections = el('div', { class: 'nav-link-sections' });
  const cardNodes = [];
  groups.forEach(({ heading, nodes: groupNodes }) => {
    // card content trails the last link list inside the final group
    const lastList = groupNodes.map((n) => n.tagName).lastIndexOf('UL');
    sections.append(buildLinkSection(heading, groupNodes.slice(0, lastList + 1)));
    cardNodes.push(...groupNodes.slice(lastList + 1));
  });
  if (!groups.length) {
    cardNodes.push(...[...holder.children].filter((n) => n.tagName !== 'H3' && !introNodes.includes(n)));
  }
  container.append(sections);
  container.append(buildCards(cardNodes));
  return container;
}

/* ---------- search panel ---------- */

function buildSearch(nodes) {
  const container = el('div', { class: 'nav-panel-grid' });
  const search = el('div', { class: 'nav-search' });
  const form = el('form', { class: 'nav-search-form', action: '/search', role: 'search' });
  const label = el('label', { class: 'nav-search-label', for: 'nav-search-input' }, 'Search');
  const input = el('input', {
    type: 'search', id: 'nav-search-input', name: 'q', placeholder: 'Search', autocomplete: 'off',
  });
  form.append(icon('search'), label, input);
  search.append(form);

  const lists = el('div', { class: 'nav-search-lists' });
  let current = null;
  nodes.forEach((n) => {
    if (n.tagName === 'P' && !onlyLink(n) && n.nextElementSibling?.tagName === 'UL') {
      current = el('div', { class: 'nav-search-group' }, el('p', { class: 'nav-search-group-title' }, n.textContent.trim()));
      lists.append(current);
    } else if (n.tagName === 'UL' && current) {
      const variant = lists.children.length === 1 ? 'featured' : 'actions';
      const ul = el('ul', { class: `nav-search-list nav-search-list-${variant}` });
      n.querySelectorAll('li > a').forEach((a) => {
        const link = el('a', { href: a.getAttribute('href') }, el('span', {}, a.textContent.trim()));
        if (variant === 'featured') link.prepend(icon('search'));
        else link.append(icon('arrow-right'));
        ul.append(el('li', {}, link));
      });
      current.append(ul);
    }
  });
  search.append(lists);

  // "no results" help block (shown only when a search has no matches)
  const help = el('div', { class: 'nav-search-help', hidden: '' });
  const h3 = nodes.find((n) => n.tagName === 'H3');
  if (h3) {
    help.append(el('p', { class: 'nav-search-help-title' }, h3.textContent.trim()));
    let next = nodes[nodes.indexOf(h3) + 1];
    while (next && next.tagName === 'P') {
      if (onlyLink(next)) {
        const a = next.querySelector('a');
        help.append(el('a', { class: 'nav-cta', href: a.getAttribute('href') }, el('span', {}, a.textContent.trim())));
      } else help.append(el('p', {}, next.textContent.trim()));
      next = nodes[nodes.indexOf(next) + 1];
    }
  }
  search.append(help);
  container.append(search);
  return container;
}

/* ---------- side sheet (My Projects) ---------- */

function buildSheet(label, nodes) {
  const sheet = el('div', {
    class: 'nav-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': label, hidden: '',
  });
  const panel = el('div', { class: 'nav-sheet-panel' });
  const close = el('button', { type: 'button', class: 'nav-sheet-close', 'aria-label': 'Close' }, icon('close'));
  panel.append(el('div', { class: 'nav-sheet-header' }, el('p', { class: 'nav-sheet-title' }, label), close));
  const body = el('div', { class: 'nav-sheet-body' });
  nodes.forEach((n) => {
    if (n.tagName === 'H3') body.append(el('p', { class: 'nav-sheet-heading' }, n.textContent.trim()));
    else if (onlyLink(n)) {
      const a = n.querySelector('a');
      body.append(el('a', { class: 'nav-sheet-empty', href: a.getAttribute('href') }, el('span', {}, a.textContent.trim()), icon('plus')));
    } else body.append(n.cloneNode(true));
  });
  panel.append(body);
  sheet.append(el('div', { class: 'nav-sheet-backdrop' }), panel);
  return sheet;
}

/* ---------- utility bar ---------- */

function buildUtility(section) {
  const bar = el('div', { class: 'nav-utility' });
  const inner = el('div', { class: 'nav-container nav-utility-inner' });
  const lists = [...section.querySelectorAll(':scope > ul')];
  const linksList = lists.find((ul) => !ul.querySelector('img'));
  const localeList = lists.find((ul) => ul.querySelector('img'));

  if (localeList) {
    const locale = el('div', { class: 'nav-locale' });
    const labelP = localeList.previousElementSibling;
    const entries = [...localeList.querySelectorAll(':scope > li')];
    const current = entries.find((li) => li.querySelector('a')?.getAttribute('href') === '/') || entries[0];
    const currentFlag = current.querySelector('img').cloneNode();
    const currentLabel = current.querySelector('a').textContent.trim();
    const trigger = el(
      'button',
      {
        type: 'button',
        class: 'nav-locale-trigger',
        'aria-expanded': 'false',
        'aria-controls': 'nav-locale-list',
        'aria-label': `Select ${labelP?.textContent.trim().toLowerCase() || 'language'}: ${currentLabel}`,
      },
      currentFlag,
      textLabel(currentLabel),
      icon('chevron-down'),
    );
    const list = el('ul', { class: 'nav-locale-list', id: 'nav-locale-list' });
    entries.forEach((li) => {
      const a = li.querySelector('a');
      const link = el('a', { href: a.getAttribute('href') }, li.querySelector('img'), textLabel(a.textContent.trim()));
      if (li === current) link.setAttribute('aria-current', 'page');
      list.append(el('li', {}, link));
    });
    locale.append(trigger, list);
    inner.append(locale);
  }
  if (linksList) {
    linksList.className = 'nav-utility-links';
    linksList.querySelectorAll('a').forEach((a) => a.replaceChildren(textLabel(a.textContent.trim())));
    inner.append(linksList);
  }
  bar.append(inner);
  return bar;
}

/* ---------- mobile drawer (built from the rendered desktop panels) ---------- */

function drawerPanel(id, { title, back } = {}) {
  const panel = el('div', { class: 'nav-drawer-panel', id, hidden: '' });
  const head = el('div', { class: 'nav-drawer-header' });
  if (back) head.append(el('button', { type: 'button', class: 'nav-drawer-back', 'aria-label': 'Go back' }, icon('arrow-left')));
  if (title) head.append(el('p', { class: 'nav-drawer-title' }, title));
  head.append(el('button', { type: 'button', class: 'nav-drawer-close', 'aria-label': 'Close menu' }, icon('close')));
  const content = el('div', { class: 'nav-drawer-content' });
  panel.append(head, content);
  return { panel, content };
}

// Level 3: one link section (description + links, or color tiles when links carry swatches)
function buildDrawerSection(section, title, id) {
  const { panel, content } = drawerPanel(id, { title, back: true });
  const desc = section.querySelector('.nav-link-section-desc')?.textContent.trim();
  if (desc) content.append(el('p', { class: 'nav-drawer-desc' }, desc));
  const links = [...section.querySelectorAll('.nav-link')];
  const tiles = links.some((a) => a.querySelector('img'));
  const list = el('ul', { class: tiles ? 'nav-drawer-tiles' : 'nav-drawer-links' });
  links.forEach((a) => {
    const text = a.textContent.trim();
    const link = el('a', { href: a.getAttribute('href') });
    if (tiles) {
      const swatch = a.querySelector('img')?.cloneNode();
      if (swatch) {
        swatch.className = 'nav-drawer-tile-swatch';
        swatch.loading = 'eager';
        // light label on dark swatches, sampled from the swatch itself
        swatch.addEventListener('load', () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(swatch, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            if ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5) link.classList.add('is-dark');
          } catch (e) { /* cross-origin swatch: keep default label color */ }
        }, { once: true });
        link.append(swatch);
      }
      link.className = 'nav-drawer-tile';
      link.append(el('span', { class: 'nav-drawer-tile-label' }, text));
    } else {
      link.className = 'nav-drawer-link';
      link.append(text);
    }
    list.append(el('li', {}, link));
  });
  content.append(list);
  return panel;
}

// Level 2: one megamenu (headline, CTA, section rows, feature cards)
function buildDrawerCategory(desktopPanel, title, id) {
  const { panel, content } = drawerPanel(id, { title, back: true });
  const intro = el('div', { class: 'nav-drawer-intro' });
  const headline = desktopPanel.querySelector('.nav-intro-headline');
  if (headline) intro.append(el('p', { class: 'nav-drawer-headline' }, headline.textContent.trim()));
  const cta = desktopPanel.querySelector('.nav-cta');
  if (cta) {
    intro.append(el(
      'a',
      { class: 'nav-cta nav-drawer-cta', href: cta.getAttribute('href') },
      el('span', {}, cta.textContent.trim()),
      icon('arrow-right'),
    ));
  }
  content.append(intro);

  const rows = el('ul', { class: 'nav-drawer-sections' });
  const subpanels = [];
  desktopPanel.querySelectorAll('.nav-link-section').forEach((section, i) => {
    const sectionTitle = section.querySelector('.nav-link-section-title').textContent.trim();
    const subId = `${id}-${i}`;
    rows.append(el('li', {}, el(
      'button',
      { type: 'button', class: 'nav-drawer-section', 'data-target': subId },
      el('span', {}, sectionTitle),
      icon('arrow-right'),
    )));
    subpanels.push(buildDrawerSection(section, sectionTitle, subId));
  });
  content.append(rows);

  const cards = el('div', { class: 'nav-drawer-cards' });
  desktopPanel.querySelectorAll('.nav-card').forEach((card) => {
    const img = card.querySelector('img')?.cloneNode();
    const cardTitle = card.querySelector('.nav-card-title')?.textContent.trim() || '';
    cards.append(el(
      'a',
      { class: 'nav-drawer-card', href: card.getAttribute('href') },
      el('div', { class: 'nav-drawer-card-media' }, img),
      el(
        'div',
        { class: 'nav-drawer-card-footer' },
        el('span', { class: 'nav-drawer-card-title' }, cardTitle),
        el('span', { class: 'nav-drawer-card-arrow' }, icon('arrow-right')),
      ),
    ));
  });
  content.append(cards);
  return [panel, ...subpanels];
}

/**
 * Builds the mobile drawer: level 1 menu, one level 2 panel per megamenu,
 * one level 3 panel per link section, and a search panel.
 */
function buildDrawer(nav, utility, panels) {
  const drawer = el('div', {
    class: 'nav-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu', 'data-state': 'closed', hidden: '',
  });
  drawer.append(el('div', { class: 'nav-drawer-backdrop' }));

  const { panel: root, content } = drawerPanel('nav-drawer-root');
  const list = el('ul', { class: 'nav-drawer-categories' });
  const extra = [];
  nav.querySelectorAll('.nav-sections > li > .nav-item').forEach((item) => {
    const text = item.textContent.trim();
    if (item.tagName === 'A') {
      list.append(el('li', {}, el('a', { class: 'nav-drawer-category', href: item.getAttribute('href') }, textLabel(text))));
      return;
    }
    const desktopPanel = panels.get(item.dataset.panel);
    if (!desktopPanel) return;
    const id = `nav-drawer-${item.dataset.panel}`;
    list.append(el('li', {}, el(
      'button',
      { type: 'button', class: 'nav-drawer-category', 'data-target': id },
      textLabel(text),
      icon('arrow-right'),
    )));
    extra.push(...buildDrawerCategory(desktopPanel, text, id));
  });
  content.append(list);

  // locale selector (expands inline) and utility links pinned to the bottom
  const footer = el('div', { class: 'nav-drawer-footer' });
  const locale = utility.querySelector('.nav-locale')?.cloneNode(true);
  if (locale) {
    locale.classList.add('nav-locale-inline');
    locale.querySelector('.nav-locale-trigger').setAttribute('aria-controls', 'nav-locale-list-drawer');
    locale.querySelector('.nav-locale-list').id = 'nav-locale-list-drawer';
    footer.append(locale);
  }
  const links = utility.querySelector('.nav-utility-links')?.cloneNode(true);
  if (links) {
    links.className = 'nav-drawer-utility';
    footer.append(links);
  }
  content.append(footer);

  // search drawer reuses the desktop search content
  const searchSource = [...panels.values()].find((p) => p.querySelector('.nav-search'));
  if (searchSource) {
    const { panel: searchPanel, content: searchContent } = drawerPanel('nav-drawer-search');
    const search = searchSource.querySelector('.nav-search').cloneNode(true);
    search.querySelector('input').id = 'nav-search-input-drawer';
    search.querySelector('label').setAttribute('for', 'nav-search-input-drawer');
    searchContent.append(search);
    extra.push(searchPanel);
  }

  drawer.append(root, ...extra);
  return drawer;
}

function setupDrawer(block, drawer, hamburger, searchButton) {
  const stack = [];
  const panelById = (id) => drawer.querySelector(`#${id}`);
  const DURATION = 250;

  const show = (panel) => {
    panel.hidden = false;
    // next frame so the slide-in transition runs
    requestAnimationFrame(() => requestAnimationFrame(() => { panel.dataset.open = 'true'; }));
    stack.push(panel);
  };
  const open = (id) => {
    drawer.hidden = false;
    document.body.classList.add('nav-drawer-open');
    requestAnimationFrame(() => { drawer.dataset.state = 'open'; });
    show(panelById(id));
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Close menu');
    // the search drawer focuses its input; menus focus the close button
    setTimeout(() => {
      const top = stack[stack.length - 1];
      (top?.querySelector('input') || top?.querySelector('.nav-drawer-close'))?.focus();
    }, DURATION);
  };
  const back = () => {
    const top = stack.pop();
    if (!top) return;
    delete top.dataset.open;
    setTimeout(() => { top.hidden = true; }, DURATION);
    stack[stack.length - 1]?.querySelector('.nav-drawer-back, .nav-drawer-close')?.focus();
  };
  const close = () => {
    if (drawer.hidden) return;
    const panels = stack.splice(0);
    panels.forEach((p) => delete p.dataset.open);
    drawer.dataset.state = 'closed';
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open menu');
    setTimeout(() => {
      panels.forEach((p) => { p.hidden = true; });
      drawer.hidden = true;
      document.body.classList.remove('nav-drawer-open');
    }, DURATION);
  };

  hamburger.addEventListener('click', () => open('nav-drawer-root'));
  searchButton?.addEventListener('click', (e) => {
    if (isDesktop.matches) return;
    e.stopImmediatePropagation();
    open('nav-drawer-search');
  });
  drawer.addEventListener('click', (e) => {
    const target = e.target.closest('[data-target]');
    if (target) show(panelById(target.dataset.target));
    else if (e.target.closest('.nav-drawer-back')) back();
    else if (e.target.closest('.nav-drawer-close, .nav-drawer-backdrop')) {
      close();
      hamburger.focus();
    }
  });
  drawer.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    close();
    hamburger.focus();
  });
  return close;
}

/* ---------- behavior ---------- */

function setupScrollState(header) {
  let lastY = window.scrollY;
  let lastDirection = null;
  let downDistance = 0;
  let state = 'default';
  const setState = (next) => {
    if (next === state) return;
    state = next;
    header.dataset.scrollState = next;
    // keep the current logo during the slide-out
    if (next !== 'hidden') header.dataset.logoState = next;
  };
  header.dataset.scrollState = state;
  header.dataset.logoState = state;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      // freeze while a panel or sheet is open
      const panelOpen = header.querySelector('.nav-dropdown[data-state="open"]');
      if (panelOpen || document.body.matches('.nav-sheet-open, .nav-drawer-open')) return;
      const first = document.querySelector('main > .section');
      const pastThreshold = first
        ? first.getBoundingClientRect().bottom <= 0
        : window.scrollY > window.innerHeight * 0.7;
      const y = window.scrollY;
      const delta = y - lastY;
      if (delta > 0 && lastDirection !== 'down') { downDistance = 0; lastDirection = 'down'; }
      if (delta < 0 && lastDirection !== 'up') { downDistance = 0; lastDirection = 'up'; }
      if (delta > 0) downDistance += delta;
      if (!pastThreshold) setState('default');
      else if (delta < 0) setState('slim');
      else if (delta > 0 && state === 'default') setState('hidden');
      else if (delta > 0 && state === 'slim' && downDistance >= 100) setState('hidden');
      lastY = y;
    });
  }, { passive: true });
}

/**
 * Wires the shared dropdown. Only the active panel is attached to the DOM.
 * @param {Element} nav nav element
 * @param {Map<string, Element>} panels panel elements keyed by id
 */
function setupDropdown(nav, panels) {
  const dropdown = nav.querySelector('.nav-dropdown');
  const panelWrap = dropdown.querySelector('.nav-dropdown-panel');
  const triggers = [...nav.querySelectorAll('[data-panel]')];
  let closeTimer;

  const close = () => {
    dropdown.dataset.state = 'closed';
    triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
  };
  const open = (trigger) => {
    clearTimeout(closeTimer);
    triggers.forEach((t) => t.setAttribute('aria-expanded', t === trigger ? 'true' : 'false'));
    const panel = panels.get(trigger.dataset.panel);
    if (panel && panel.parentElement !== panelWrap) panelWrap.replaceChildren(panel);
    panelWrap.dataset.mode = trigger.dataset.mode;
    dropdown.dataset.state = 'open';
  };

  triggers.forEach((trigger) => {
    if (trigger.dataset.mode === 'megamenu') {
      trigger.addEventListener('mouseenter', () => { if (isDesktop.matches) open(trigger); });
    }
    trigger.addEventListener('click', () => {
      // below the desktop breakpoint search opens in the mobile drawer instead
      if (!isDesktop.matches) return;
      if (trigger.getAttribute('aria-expanded') === 'true') close();
      else open(trigger);
    });
  });

  // hover-out: leaving the bar + panel closes a hover-opened megamenu
  const bar = nav.querySelector('.nav-bar');
  const scheduleClose = () => {
    if (panelWrap.dataset.mode !== 'megamenu') return;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, 150);
  };
  [bar, panelWrap].forEach((zone) => {
    zone.addEventListener('mouseleave', scheduleClose);
    zone.addEventListener('mouseenter', () => clearTimeout(closeTimer));
  });
  // non-trigger items in the bar close a hover-opened megamenu
  nav.querySelectorAll('.nav-bar a, .nav-tools button:not([data-panel])').forEach((item) => {
    item.addEventListener('mouseenter', () => { if (panelWrap.dataset.mode === 'megamenu') close(); });
  });
  dropdown.querySelector('.nav-overlay').addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dropdown.dataset.state === 'open') {
      const active = triggers.find((t) => t.getAttribute('aria-expanded') === 'true');
      close();
      active?.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (dropdown.dataset.state === 'open' && !nav.contains(e.target)) close();
  });
  return close;
}

function setupLocale(root) {
  const triggers = [...root.querySelectorAll('.nav-locale-trigger')];
  const close = () => triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      trigger.setAttribute('aria-expanded', trigger.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    });
  });
  document.addEventListener('click', (e) => {
    triggers.forEach((t) => { if (!t.parentElement.contains(e.target)) t.setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  return close;
}

function setupSheet(button, sheet) {
  const close = () => {
    sheet.hidden = true;
    document.body.classList.remove('nav-sheet-open');
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  };
  button.addEventListener('click', () => {
    sheet.hidden = false;
    document.body.classList.add('nav-sheet-open');
    button.setAttribute('aria-expanded', 'true');
    sheet.querySelector('.nav-sheet-close').focus();
  });
  sheet.querySelector('.nav-sheet-close').addEventListener('click', close);
  sheet.querySelector('.nav-sheet-backdrop').addEventListener('click', close);
  sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const doc = await fetchNav();
  if (!doc) return;
  // skip empty sections (e.g. the one left behind by a page metadata block)
  const sections = [...doc.body.querySelectorAll(':scope > div')]
    .filter((section) => section.children.length);
  if (sections.length < 2) return;
  const [utilitySection, brandSection, ...rest] = sections;
  const toolsSection = rest.pop();

  block.textContent = '';
  const nav = el('nav', { id: 'nav', 'aria-label': 'Main navigation' });
  // utility bar sits above the main navigation landmark, as on the source
  const utility = buildUtility(utilitySection);

  // main bar: brand, nav items, tools
  const bar = el('div', { class: 'nav-bar' });
  const barInner = el('div', { class: 'nav-container nav-bar-inner' });
  const brandLink = brandSection.querySelector('a');
  const brand = el('div', { class: 'nav-brand' });
  if (brandLink) {
    const logo = brandLink.querySelector('img');
    const a = el('a', { href: brandLink.getAttribute('href'), 'aria-label': logo?.alt || 'Home' });
    if (logo) {
      logo.alt = '';
      logo.width = 96;
      logo.height = 24;
      const slim = logo.cloneNode();
      logo.className = 'nav-logo-default';
      slim.className = 'nav-logo-slim';
      a.append(logo, slim);
    }
    brand.append(a);
  }

  const dropdown = el('div', { class: 'nav-dropdown', 'data-state': 'closed' });
  const panelWrap = el('div', { class: 'nav-dropdown-panel' });
  dropdown.append(el('div', { class: 'nav-overlay' }), panelWrap);

  const panels = new Map();
  const items = el('ul', { class: 'nav-sections' });
  rest.forEach((section) => {
    groupBy(section, 'h2').forEach(({ heading, nodes }) => {
      const text = heading.textContent.trim();
      const link = heading.querySelector('a');
      if (link) {
        items.append(el('li', {}, el('a', { class: 'nav-item', href: link.getAttribute('href') }, textLabel(text))));
        return;
      }
      const id = `nav-panel-${toClassName(text)}`;
      items.append(el('li', {}, el('button', {
        type: 'button', class: 'nav-item', 'aria-expanded': 'false', 'aria-controls': id, 'data-panel': id, 'data-mode': 'megamenu',
      }, textLabel(text))));
      const panel = el('div', { class: 'nav-panel', id });
      panel.append(buildMegamenu(nodes));
      panels.set(id, panel);
    });
  });

  // tools: each h2 in the last section is an icon button named after its label;
  // tools with link lists open the search dropdown, others open a side sheet
  const tools = el('ul', { class: 'nav-tools' });
  const sheets = [];
  groupBy(toolsSection, 'h2').forEach(({ heading, nodes }) => {
    const label = heading.textContent.trim();
    const name = toClassName(label);
    const id = `nav-panel-${name}`;
    const button = el('button', {
      type: 'button', class: 'nav-tool', 'aria-label': label, 'aria-expanded': 'false',
    }, icon(name));
    if (nodes.some((n) => n.tagName === 'UL')) {
      button.dataset.panel = id;
      button.dataset.mode = 'search';
      button.setAttribute('aria-controls', id);
      const panel = el('div', { class: 'nav-panel', id });
      panel.append(buildSearch(nodes));
      panels.set(id, panel);
    } else {
      const sheet = buildSheet(label, nodes);
      sheets.push([button, sheet]);
    }
    tools.append(el('li', {}, button));
  });

  // hamburger opens the mobile drawer (hidden at desktop widths)
  const hamburger = el('button', {
    type: 'button', class: 'nav-tool nav-hamburger', 'aria-label': 'Open menu', 'aria-expanded': 'false', 'aria-controls': 'nav-drawer',
  }, icon('menu'));
  tools.append(el('li', { class: 'nav-hamburger-item' }, hamburger));

  barInner.append(brand, items, tools);
  bar.append(barInner);
  nav.append(bar, dropdown);

  // keyboard skip link to the page content
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'main';
  const skip = el('a', { class: 'nav-skip-link', href: `#${main?.id || 'main'}` }, 'Skip to main content');
  skip.addEventListener('click', () => {
    main?.setAttribute('tabindex', '-1');
    main?.focus();
  });
  block.append(skip, utility, nav);
  sheets.forEach(([button, sheet]) => {
    block.append(sheet);
    setupSheet(button, sheet);
  });

  const drawer = buildDrawer(nav, utility, panels);
  drawer.id = 'nav-drawer';
  block.append(drawer);

  const header = block.closest('header') || block;
  const closeDropdown = setupDropdown(nav, panels);
  const closeLocale = setupLocale(block);
  const closeDrawer = setupDrawer(block, drawer, hamburger, tools.querySelector('[data-mode="search"]'));
  setupScrollState(header);

  // crossing the desktop breakpoint resets open panels and drawers
  isDesktop.addEventListener('change', () => {
    closeDropdown();
    closeLocale();
    closeDrawer();
  });
}
