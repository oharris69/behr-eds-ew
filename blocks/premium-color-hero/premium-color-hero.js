import { getMetadata } from '../../scripts/aem.js';
import { applyPageColor, getPageColor } from '../../scripts/color-theme.js';
import { isInProject, toggleProjectColor, PROJECTS_CHANGE_EVENT } from '../../scripts/projects.js';

/* UI strings (not authored) */
const LABELS = {
  addToProject: 'Add {color} to project',
  removeFromProject: 'Remove {color} from project',
  playVideo: 'Play background video',
  pauseVideo: 'Pause background video',
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_PATHS = {
  plus: ['M12 4v16', 'M20 12H4'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  play: ['M8 5.5v13l10.5-6.5z'],
  pause: ['M9 5.5v13', 'M15 5.5v13'],
};
const VIDEO_LINK = /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i;

/**
 * @param {keyof ICON_PATHS} name
 * @returns {SVGElement} a 24px stroke icon drawn in currentColor
 */
function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('premium-color-hero-icon', `premium-color-hero-icon-${name}`);
  ICON_PATHS[name].forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  });
  return svg;
}

/**
 * Reads the authored focal point (`data-title="data-focal:x,y"`) as an object-position.
 * @param {HTMLImageElement} img
 */
function applyFocalPoint(img) {
  const match = (img.dataset.title || '').match(/data-focal:\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (match) img.style.objectPosition = `${match[1]}% ${match[2]}%`;
}

/**
 * Poster picture + optional background video with a play/pause toggle.
 * The video source is only attached after the page has loaded (keeps the poster as LCP),
 * and never autoplays when the visitor prefers reduced motion.
 * @param {HTMLPictureElement|null} picture
 * @param {string|null} videoSrc
 * @returns {HTMLElement}
 */
function buildMedia(picture, videoSrc) {
  const media = document.createElement('div');
  media.className = 'premium-color-hero-media';

  const img = picture?.querySelector('img');
  if (img) {
    img.loading = 'eager';
    img.fetchPriority = 'high';
    applyFocalPoint(img);
    media.append(picture);
  }
  if (!videoSrc) return media;

  const video = document.createElement('video');
  video.className = 'premium-color-hero-video';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.tabIndex = -1;
  if (img?.style.objectPosition) video.style.objectPosition = img.style.objectPosition;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'premium-color-hero-video-toggle';

  const setPlaying = (playing) => {
    media.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-label', playing ? LABELS.pauseVideo : LABELS.playVideo);
    toggle.replaceChildren(icon(playing ? 'pause' : 'play'));
  };
  setPlaying(false);

  const attachSource = () => {
    if (video.querySelector('source')) return;
    const source = document.createElement('source');
    source.src = videoSrc;
    source.type = 'video/mp4';
    video.append(source);
    video.load();
  };
  const play = () => {
    attachSource();
    video.play().catch(() => setPlaying(false));
  };

  video.addEventListener('playing', () => setPlaying(true));
  video.addEventListener('pause', () => setPlaying(false));
  video.addEventListener('error', () => {
    media.classList.add('video-error');
    toggle.remove();
  }, true);
  toggle.addEventListener('click', () => {
    if (video.paused) play();
    else video.pause();
  });

  media.append(video, toggle);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the background video is a full-quality original (~17 MB): decoding it blocks the main
  // thread on phone-class CPUs and costs mobile data, so phones and data-saver visitors get
  // the poster and the play button instead of autoplay
  const saveData = navigator.connection?.saveData;
  const largeScreen = window.matchMedia('(width >= 768px)').matches;
  if (!reducedMotion && !saveData && largeScreen) {
    const autoplay = () => (window.requestIdleCallback
      ? window.requestIdleCallback(play, { timeout: 2000 }) : setTimeout(play, 0));
    if (document.readyState === 'complete') autoplay();
    else window.addEventListener('load', autoplay, { once: true });
  }
  return media;
}

/**
 * Round "+" button that adds/removes the page color from My Projects.
 * @param {{ code: string, name: string, hex?: string }} color
 * @returns {HTMLButtonElement}
 */
function buildProjectButton(color) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'premium-color-hero-project';
  const colorLabel = [color.name, color.code].filter(Boolean).join(' ');

  const sync = () => {
    const saved = isInProject(color.code);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', (saved ? LABELS.removeFromProject : LABELS.addToProject).replace('{color}', colorLabel));
    button.replaceChildren(icon(saved ? 'check' : 'plus'));
  };
  button.addEventListener('click', () => {
    toggleProjectColor(color);
    sync();
  });
  window.addEventListener(PROJECTS_CHANGE_EVENT, sync);
  sync();
  return button;
}

/**
 * Premium color hero: rows = [poster picture + MP4 link] / [h1 color name] / [optional eyebrow].
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const pageColor = getPageColor();
  const color = {
    code: pageColor?.code || getMetadata('color-code'),
    name: pageColor?.name || getMetadata('color-name'),
    hex: pageColor?.hex,
  };
  applyPageColor(block);

  // locate content by shape, not position: authors may omit or add rows
  const picture = block.querySelector('picture');
  const videoLink = [...block.querySelectorAll('a[href]')].find((a) => VIDEO_LINK.test(a.href));
  const heading = block.querySelector('h1') || block.querySelector('h2, h3, h4, h5, h6');
  const textRows = [...block.children].filter((row) => !row.contains(picture)
    && !row.contains(videoLink) && !row.contains(heading) && row.textContent.trim());

  let title = heading;
  if (title && title.tagName !== 'H1') {
    const h1 = document.createElement('h1');
    h1.id = title.id;
    h1.append(...title.childNodes);
    title = h1;
  }
  if (!title && color.name) {
    title = document.createElement('h1');
    title.textContent = color.name;
  }

  const media = buildMedia(picture, videoLink?.href || null);

  const bar = document.createElement('div');
  bar.className = 'premium-color-hero-bar';
  const text = document.createElement('div');
  text.className = 'premium-color-hero-text';

  textRows.forEach((row) => {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'premium-color-hero-eyebrow';
    eyebrow.textContent = row.textContent.trim();
    text.append(eyebrow);
  });
  if (title) {
    title.classList.add('premium-color-hero-title');
    text.append(title);
  }
  if (color.code) {
    const code = document.createElement('p');
    code.className = 'premium-color-hero-code';
    code.textContent = color.code;
    text.append(code);
  }

  const cta = document.createElement('div');
  cta.className = 'premium-color-hero-cta';
  if (color.code) cta.append(buildProjectButton(color));

  // overlay option: the title group sits over the media, the bar keeps name + code
  if (block.classList.contains('overlay') && title) {
    text.classList.add('premium-color-hero-overlay');
    media.append(text);
    const summary = document.createElement('div');
    summary.className = 'premium-color-hero-text';
    summary.setAttribute('aria-hidden', 'true');
    summary.innerHTML = '<p class="premium-color-hero-name"></p><p class="premium-color-hero-code"></p>';
    summary.firstElementChild.textContent = title.textContent;
    summary.lastElementChild.textContent = color.code || '';
    bar.append(cta, summary);
  } else {
    bar.append(cta, text);
  }

  block.replaceChildren(media, bar);
}
