import { getMetadata } from '../../scripts/aem.js';
import { applyPageColor } from '../../scripts/color-theme.js';

/* Behr's visualizer is not migrated: always link to www.behr.com (Behr site config) */
const VISUALIZER_ORIGIN = 'https://www.behr.com';
const VISUALIZER_PATH = '/colors/paint/visualizer-landing';
const VISUALIZER_COLOR_PARAM = 'colorCode';

/* UI strings (not authored) */
const LABELS = {
  cta: 'Use the visualizer',
  /* accessible name keeps the visible label (label in name) and adds the color */
  ctaColor: '{label} for {color}',
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Eye icon of Behr's "Use the visualizer" button, drawn in currentColor.
 * @returns {SVGElement}
 */
function visualizeIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('color-visualizer-icon');
  const eye = document.createElementNS(SVG_NS, 'path');
  eye.setAttribute('d', 'M12 5C6.56 5 3 11.52 3 11.52S6.58 18.04 12 18.04 21 11.52 21 11.52 17.45 5 12 5Z');
  const pupil = document.createElementNS(SVG_NS, 'circle');
  pupil.setAttribute('cx', '12');
  pupil.setAttribute('cy', '11.52');
  pupil.setAttribute('r', '2.32');
  svg.append(eye, pupil);
  return svg;
}

/**
 * @param {string} [colorCode]
 * @returns {string} the Behr visualizer URL, pre-selecting the color when known
 */
export function buildVisualizerUrl(colorCode) {
  const url = new URL(VISUALIZER_PATH, VISUALIZER_ORIGIN);
  if (colorCode) url.searchParams.set(VISUALIZER_COLOR_PARAM, colorCode);
  return url.href;
}

/**
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const picture = block.querySelector('picture');
  const pictureRow = picture ? rows.find((row) => row.contains(picture)) : null;
  const textRow = rows.find((row) => row !== pictureRow && row.textContent.trim()) || null;

  applyPageColor(block);
  const colorCode = getMetadata('color-code').trim();
  const colorName = getMetadata('color-name').trim();

  // text column: heading, description, CTA
  const content = document.createElement('div');
  content.className = 'color-visualizer-content';
  const text = document.createElement('div');
  text.className = 'color-visualizer-text';

  let label = LABELS.cta;
  if (textRow) {
    const cells = [...textRow.querySelectorAll(':scope > div')];
    const nodes = (cells.length ? cells : [textRow]).flatMap((cell) => [...cell.children]);
    nodes.forEach((node) => {
      // an authored link only overrides the CTA label; the href is always built from the color
      const link = node.matches('p') && node.querySelector('a');
      if (link && node.textContent.trim() === link.textContent.trim()) {
        label = link.textContent.trim() || label;
        return;
      }
      if (node.matches('h1, h2, h3, h4, h5, h6')) node.classList.add('color-visualizer-title');
      text.append(node);
    });
  }
  if (text.children.length) content.append(text);

  const cta = document.createElement('a');
  cta.className = 'button primary color-visualizer-cta';
  cta.href = buildVisualizerUrl(colorCode);
  if (colorName) {
    cta.setAttribute('aria-label', LABELS.ctaColor.replace('{label}', label).replace('{color}', colorName));
  }
  const ctaLabel = document.createElement('span');
  ctaLabel.textContent = label;
  cta.append(ctaLabel, visualizeIcon());
  const ctaWrapper = document.createElement('p');
  ctaWrapper.className = 'button-wrapper color-visualizer-actions';
  ctaWrapper.append(cta);
  content.append(ctaWrapper);

  const children = [content];
  if (picture) {
    const media = document.createElement('div');
    media.className = 'color-visualizer-media';
    const img = picture.querySelector('img');
    if (img) {
      img.loading = 'lazy';
      if (!img.hasAttribute('alt')) img.alt = '';
    }
    media.append(picture);
    children.push(media);
  } else {
    block.classList.add('color-visualizer-no-media');
  }

  block.replaceChildren(...children);
}
