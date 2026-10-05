import { normalizeHex } from '../../scripts/color-theme.js';
import {
  toggleProjectColor, isInProject, PROJECTS_CHANGE_EVENT,
} from '../../scripts/projects.js';

const LABELS = {
  rooms: 'Rooms',
  colors: 'Colors',
  surfaces: 'Surfaces',
  selected: 'Selected color',
  noSelection: 'Select a color chip',
  addToProject: 'Add to project',
  addedToProject: 'Added to project',
  clear: 'Clear colors',
  cleared: 'Colors cleared',
  unpainted: 'unpainted',
  selectFirst: 'Select a color chip first',
};

// a mask pixel counts as part of a surface above this alpha (0-255)
const ALPHA_THRESHOLD = 64;
// hit maps are sampled at this width (enough for tap precision, cheap to build)
const HIT_MAP_WIDTH = 480;

let idCounter = 0;
const uid = (prefix) => {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
};

/**
 * @param {string} tag
 * @param {Object<string, string>} [attrs]
 * @param {...(Node|string)} children
 * @returns {HTMLElement}
 */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
  });
  node.append(...children);
  return node;
}

/**
 * Parses a color link authored as "CODE|Name|HEX" (link text, else title).
 * @param {HTMLAnchorElement} a
 * @returns {{ code: string, name: string, hex: string, href: string }|null}
 */
function parseColorLink(a) {
  const candidates = [a.textContent, a.title];
  for (let i = 0; i < candidates.length; i += 1) {
    const parts = String(candidates[i] || '').split('|').map((p) => p.trim());
    if (parts.length === 3 && parts[0] && parts[1]) {
      const hex = normalizeHex(parts[2]);
      if (hex) {
        return {
          code: parts[0], name: parts[1], hex, href: a.getAttribute('href'),
        };
      }
    }
  }
  return null;
}

const sameCode = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();

/**
 * @param {Element|undefined} img
 * @returns {string} absolute image URL (authored src, format preserved)
 */
const imgUrl = (img) => (img && img.getAttribute('src') ? new URL(img.getAttribute('src'), window.location.href).href : '');

/**
 * @param {string} alt
 * @returns {boolean} true when an alt text is just a file name (e.g. "base.png")
 */
const isFileName = (alt) => /^[\w-]+\.(png|jpe?g|webp|avif|gif)$/i.test(String(alt).trim());

/**
 * Splits the authored rows by shape: room rows (a picture outside the first
 * cell), the color row (links, no picture) and text rows (everything else).
 * @param {Element} block
 */
function parseRows(block) {
  const rooms = [];
  const textRows = [];
  let colors = [];
  let defaultCode = '';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const hasPicture = cells.slice(1).some((c) => c.querySelector('img'));
    if (hasPicture) {
      const [label, baseCell, surfaceCell, gelCell] = cells;
      const baseImg = (baseCell && baseCell.querySelector('img'))
        || cells.slice(1).map((c) => c.querySelector('img')).find((i) => i && !i.closest('li'));
      const surfaces = [...row.querySelectorAll('li')]
        .map((li, i) => {
          const mask = li.querySelector('img');
          if (!mask) return null;
          const nameEl = [...li.querySelectorAll('p')].find((p) => !p.querySelector('img') && p.textContent.trim());
          const name = (nameEl ? nameEl.textContent : [...li.childNodes]
            .filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join(' ')).trim();
          return { name: name || `Surface ${i + 1}`, mask: imgUrl(mask) };
        })
        .filter(Boolean);
      const gelImg = gelCell && gelCell !== surfaceCell ? gelCell.querySelector('img') : null;
      const iconSpan = label && label.querySelector('.icon');
      const iconName = iconSpan ? [...iconSpan.classList].find((c) => c.startsWith('icon-')) : '';
      rooms.push({
        name: (label && label.textContent.trim()) || `Room ${rooms.length + 1}`,
        icon: iconName ? iconName.substring(5) : '',
        base: baseImg ? baseImg.closest('picture') || baseImg : null,
        baseImg,
        surfaces,
        gel: imgUrl(gelImg),
      });
      return;
    }
    const links = [...row.querySelectorAll('a[href]')];
    const parsed = links.map(parseColorLink).filter(Boolean);
    if (parsed.length && !colors.length) {
      // first cell: the palette; second cell: the default color
      const [paletteCell, defaultCell] = cells;
      colors = [...paletteCell.querySelectorAll('a[href]')].map(parseColorLink).filter(Boolean);
      const defaultLink = defaultCell && defaultCell.querySelector('a[href]');
      const def = defaultLink ? parseColorLink(defaultLink) : null;
      if (!colors.length) colors = parsed;
      if (def) {
        defaultCode = def.code;
        if (!colors.some((c) => sameCode(c.code, def.code))) colors.unshift(def);
      }
      return;
    }
    if (row.textContent.trim()) textRows.push(row);
  });

  return {
    rooms, colors, defaultCode, textRows,
  };
}

/**
 * Builds the intro (heading + description) and the instruction from text rows.
 * @param {Element[]} textRows
 * @returns {{ intro: HTMLElement, instruction: HTMLElement|null }}
 */
function buildText(textRows) {
  const intro = el('div', { class: 'ctv-intro' });
  const paragraphs = [];
  textRows.forEach((row) => {
    [...row.children].forEach((cell) => {
      if (!cell.textContent.trim()) return;
      if (!intro.querySelector('h1, h2, h3, h4, h5, h6') && cell.querySelector('h1, h2, h3, h4, h5, h6')) {
        intro.append(...cell.childNodes);
        return;
      }
      if (cell.querySelector('p')) paragraphs.push(...cell.querySelectorAll(':scope > *'));
      else paragraphs.push(el('p', {}, ...cell.childNodes));
    });
  });
  const instruction = paragraphs.length > 1 ? paragraphs.pop() : null;
  if (instruction) instruction.classList.add('ctv-instruction');
  paragraphs.forEach((p) => {
    p.classList.add('ctv-description');
    intro.append(p);
  });
  return { intro, instruction };
}

/**
 * Loads an image and samples its alpha channel into a small hit map.
 * @param {string} url
 * @returns {Promise<{ width: number, height: number, w: number, h: number,
 *   alpha: Uint8ClampedArray }|null>} null when the image can't be read
 */
function buildHitMap(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (new URL(url).origin !== window.location.origin) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const w = Math.min(HIT_MAP_WIDTH, width);
        const h = Math.max(1, Math.round((height * w) / width));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const alpha = new Uint8ClampedArray(w * h);
        for (let i = 0; i < alpha.length; i += 1) alpha[i] = data[i * 4 + 3];
        resolve({
          width, height, w, h, alpha,
        });
      } catch {
        resolve(null); // cross-origin without CORS: no hit testing, buttons still work
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Color trends visualizer: room tabs, a stage layering the room photo, one
 * paint layer per surface (solid color clipped by the surface's alpha mask)
 * and a shading overlay, palette chips, and "Add to project" / "Clear colors".
 * Pick a chip, then tap a surface on the photo (or its button) to paint it.
 * @param {Element} block
 */
export default function decorate(block) {
  const {
    rooms, colors, defaultCode, textRows,
  } = parseRows(block);
  const { intro, instruction } = buildText(textRows);
  const defaultColor = colors.find((c) => sameCode(c.code, defaultCode)) || null;

  const state = {
    active: 0,
    selected: defaultColor,
    // per room: surface index -> color; rooms start unpainted with the default color selected
    painted: rooms.map(() => new Map()),
    visible: false,
  };

  const live = el('p', { class: 'ctv-live', 'aria-live': 'polite' });
  let announceTimer;
  const announce = (message) => {
    clearTimeout(announceTimer);
    live.textContent = '';
    announceTimer = setTimeout(() => { live.textContent = message; }, 100);
  };

  /* room tabs + panels */
  const tablist = el('div', { class: 'ctv-tabs', role: 'tablist', 'aria-label': LABELS.rooms });
  const panels = rooms.map((room, r) => {
    const tabId = uid('ctv-tab');
    const panelId = uid('ctv-panel');
    const tab = el('button', {
      type: 'button',
      class: 'ctv-tab',
      role: 'tab',
      id: tabId,
      'aria-controls': panelId,
      'aria-selected': 'false',
      tabindex: '-1',
    });
    if (room.icon) {
      const icon = el('span', { class: 'ctv-tab-icon', 'aria-hidden': 'true' });
      icon.style.setProperty('--icon', `url("${window.hlx?.codeBasePath || ''}/icons/${room.icon}.svg")`);
      tab.append(icon);
    }
    tab.append(el('span', { class: 'ctv-tab-label' }, room.name));
    tablist.append(tab);

    const stage = el('div', { class: 'ctv-stage' });
    if (room.base) {
      room.base.classList.add('ctv-base');
      if (room.baseImg) {
        room.baseImg.loading = 'lazy';
        if (!room.baseImg.alt || isFileName(room.baseImg.alt)) room.baseImg.alt = room.name;
      }
      stage.append(room.base);
    }
    const layers = room.surfaces.map(() => {
      const layer = el('div', { class: 'ctv-layer', 'aria-hidden': 'true' });
      stage.append(layer);
      return layer;
    });
    let gel = null;
    if (room.gel) {
      gel = el('img', {
        class: 'ctv-gel', alt: '', 'aria-hidden': 'true', loading: 'lazy', decoding: 'async',
      });
      stage.append(gel);
    }

    const surfaceGroup = el('div', { class: 'ctv-surfaces', role: 'group', 'aria-label': `${room.name}: ${LABELS.surfaces}` });
    const buttons = room.surfaces.map((surface, s) => {
      const status = el('span', { class: 'ctv-visually-hidden' });
      const button = el(
        'button',
        { type: 'button', class: 'ctv-surface' },
        el('span', { class: 'ctv-surface-swatch', 'aria-hidden': 'true' }),
        el('span', { class: 'ctv-surface-name' }, surface.name),
        status,
      );
      button.addEventListener('click', () => {
        // eslint-disable-next-line no-use-before-define
        paint(r, s);
      });
      surfaceGroup.append(button);
      return { button, status };
    });

    const panel = el('div', {
      class: 'ctv-panel', role: 'tabpanel', id: panelId, 'aria-labelledby': tabId, hidden: '',
    }, stage);
    if (room.surfaces.length) panel.append(surfaceGroup);

    return {
      tab, panel, stage, layers, gel, buttons, loaded: false, hitMaps: null,
    };
  });

  /** Sets mask/gel sources for a room (deferred until it's shown near the viewport). */
  const loadRoom = (r) => {
    const p = panels[r];
    if (!p || p.loaded) return;
    p.loaded = true;
    rooms[r].surfaces.forEach((surface, s) => {
      if (!surface.mask) return;
      p.layers[s].style.setProperty('--mask', `url("${surface.mask}")`);
      p.layers[s].dataset.masked = '';
    });
    if (p.gel) p.gel.src = rooms[r].gel;
    p.hitMaps = Promise.all(rooms[r].surfaces.map((s) => buildHitMap(s.mask)));
  };

  /** Reflects a room's paint state on its layers and surface buttons. */
  const renderRoom = (r) => {
    const p = panels[r];
    rooms[r].surfaces.forEach((surface, s) => {
      const color = state.painted[r].get(s);
      const layer = p.layers[s];
      const { button, status } = p.buttons[s];
      if (color) {
        layer.style.setProperty('--paint', color.hex);
        layer.dataset.painted = '';
        button.style.setProperty('--paint', color.hex);
        button.dataset.painted = '';
        status.textContent = `, ${color.name}`;
      } else {
        layer.style.removeProperty('--paint');
        delete layer.dataset.painted;
        button.style.removeProperty('--paint');
        delete button.dataset.painted;
        status.textContent = `, ${LABELS.unpainted}`;
      }
    });
  };

  /* palette chips */
  const chipGroup = el('div', { class: 'ctv-chips', role: 'group', 'aria-label': LABELS.colors });
  const chips = colors.map((color) => {
    const chip = el('button', {
      type: 'button',
      class: 'ctv-chip',
      'aria-pressed': 'false',
      'aria-label': `${color.name} ${color.code}`,
      title: `${color.name} ${color.code}`,
    });
    chip.style.setProperty('--chip-color', color.hex);
    chipGroup.append(chip);
    return chip;
  });

  /* selection panel */
  const selectedSwatch = el('span', { class: 'ctv-selected-swatch', 'aria-hidden': 'true' });
  const selectedName = el('span', { class: 'ctv-selected-name' });
  const selectedCode = el('span', { class: 'ctv-selected-code' });
  const selectedInfo = el(
    'p',
    { class: 'ctv-selected', 'aria-live': 'polite' },
    el('span', { class: 'ctv-visually-hidden' }, `${LABELS.selected}: `),
    selectedSwatch,
    el('span', { class: 'ctv-selected-text' }, selectedName, selectedCode),
  );
  const addIcon = el('span', { class: 'ctv-add-icon', 'aria-hidden': 'true' });
  addIcon.style.setProperty('--icon', `url("${window.hlx?.codeBasePath || ''}/icons/plus.svg")`);
  const addLabel = el('span', {}, LABELS.addToProject);
  const addButton = el('button', { type: 'button', class: 'button primary ctv-add', 'aria-pressed': 'false' }, addLabel, addIcon);
  const clearButton = el('button', { type: 'button', class: 'button secondary ctv-clear' }, LABELS.clear);
  const selection = el(
    'div',
    { class: 'ctv-selection' },
    selectedInfo,
    el('div', { class: 'ctv-actions' }, addButton, clearButton),
  );

  const renderSelection = () => {
    const color = state.selected;
    chips.forEach((chip, i) => chip.setAttribute('aria-pressed', String(colors[i] === color)));
    block.classList.toggle('ctv-has-selection', !!color);
    if (color) {
      selectedSwatch.style.setProperty('--chip-color', color.hex);
      selectedName.textContent = color.name;
      selectedCode.textContent = color.code;
      const saved = isInProject(color.code);
      addButton.disabled = false;
      addButton.setAttribute('aria-pressed', String(saved));
      addLabel.textContent = saved ? LABELS.addedToProject : LABELS.addToProject;
    } else {
      selectedSwatch.style.removeProperty('--chip-color');
      selectedName.textContent = LABELS.noSelection;
      selectedCode.textContent = '';
      addButton.disabled = true;
      addButton.setAttribute('aria-pressed', 'false');
      addLabel.textContent = LABELS.addToProject;
    }
  };

  /* actions */
  function paint(r, s) {
    if (!state.selected) {
      announce(LABELS.selectFirst);
      return;
    }
    state.painted[r].set(s, state.selected);
    renderRoom(r);
    announce(`${rooms[r].surfaces[s].name}: ${state.selected.name}`);
  }

  const activate = (r, focus = false) => {
    if (!panels[r]) return;
    state.active = r;
    panels.forEach((p, i) => {
      const on = i === r;
      p.tab.setAttribute('aria-selected', String(on));
      p.tab.tabIndex = on ? 0 : -1;
      p.panel.hidden = !on;
    });
    if (state.visible) loadRoom(r);
    if (focus) panels[r].tab.focus();
  };

  chips.forEach((chip, i) => chip.addEventListener('click', () => {
    state.selected = colors[i];
    renderSelection();
  }));

  addButton.addEventListener('click', () => {
    const color = state.selected;
    if (!color) return;
    toggleProjectColor({ code: color.code, name: color.name, hex: color.hex });
  });
  window.addEventListener(PROJECTS_CHANGE_EVENT, renderSelection);
  window.addEventListener('storage', renderSelection);

  clearButton.addEventListener('click', () => {
    if (!panels.length) return;
    state.painted[state.active].clear();
    renderRoom(state.active);
    announce(LABELS.cleared);
  });

  tablist.addEventListener('keydown', (e) => {
    const keys = {
      ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1,
    };
    let next;
    if (e.key in keys) next = (state.active + keys[e.key] + panels.length) % panels.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = panels.length - 1;
    else return;
    e.preventDefault();
    activate(next, true);
  });

  panels.forEach((p, r) => {
    p.tab.addEventListener('click', () => activate(r));

    // tap a surface on the photo: hit-test the masks' alpha, topmost first
    p.stage.addEventListener('click', async (e) => {
      if (!p.hitMaps) return;
      const maps = await p.hitMaps;
      const rect = p.stage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (let s = maps.length - 1; s >= 0; s -= 1) {
        const map = maps[s];
        if (map) {
          // masks are drawn object-fit: cover, centered
          const scale = Math.max(rect.width / map.width, rect.height / map.height);
          const ix = (x - (rect.width - map.width * scale) / 2) / scale;
          const iy = (y - (rect.height - map.height * scale) / 2) / scale;
          const mx = Math.floor((ix * map.w) / map.width);
          const my = Math.floor((iy * map.h) / map.height);
          if (mx >= 0 && my >= 0 && mx < map.w && my < map.h
            && map.alpha[my * map.w + mx] > ALPHA_THRESHOLD) {
            paint(r, s);
            return;
          }
        }
      }
    });
  });

  /* assemble */
  const stageArea = el('div', { class: 'ctv-stage-area' });
  if (panels.length > 1) stageArea.append(tablist);
  panels.forEach((p) => stageArea.append(p.panel));
  if (instruction) stageArea.append(instruction);
  if (chips.length) stageArea.append(chipGroup);

  block.textContent = '';
  if (intro.childElementCount) block.append(intro);
  block.append(stageArea);
  if (chips.length) block.append(selection);
  block.append(live);

  panels.forEach((p, r) => renderRoom(r));
  renderSelection();
  activate(0);

  // defer the room masks/overlays until the visualizer approaches the viewport
  const reveal = () => {
    state.visible = true;
    loadRoom(state.active);
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        reveal();
      }
    }, { rootMargin: '300px' });
    observer.observe(block);
  } else {
    reveal();
  }
}
