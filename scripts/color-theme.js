/*
 * Paint color helpers for color detail pages.
 * The page color comes from page metadata (rgbhex, color-code, color-name, lrv, color-r/g/b).
 */
import { getMetadata } from './aem.js';

/**
 * @param {string} value e.g. "565344", "#565344" or "#abc"
 * @returns {string|null} "#rrggbb" or null when the value isn't a hex color
 */
export function normalizeHex(value) {
  const hex = String(value || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) return `#${hex.split('').map((c) => c + c).join('')}`.toLowerCase();
  if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex}`.toLowerCase();
  return null;
}

/**
 * WCAG relative luminance of a "#rrggbb" color.
 * @param {string} hex
 * @returns {number} 0 (black) to 1 (white)
 */
export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Text theme with the better contrast on the given background.
 * @param {string} hex
 * @returns {'dark'|'light'} 'dark' = the background is dark, use light text
 */
export function getColorTheme(hex) {
  const l = luminance(hex);
  // contrast with white vs. contrast with black
  return (1.05 / (l + 0.05)) >= ((l + 0.05) / 0.05) ? 'dark' : 'light';
}

/**
 * @returns {{ hex: string, theme: 'dark'|'light', code: string, name: string,
 *   lrv: string, rgb: number[]|null }|null} the page's paint color, or null
 */
export function getPageColor() {
  const hex = normalizeHex(getMetadata('rgbhex'));
  if (!hex) return null;
  const rgb = ['color-r', 'color-g', 'color-b'].map((k) => getMetadata(k));
  return {
    hex,
    theme: getColorTheme(hex),
    code: getMetadata('color-code'),
    name: getMetadata('color-name'),
    lrv: getMetadata('lrv'),
    rgb: rgb.every((v) => v !== '') ? rgb.map(Number)
      : [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
  };
}

/**
 * Paints an element with the page color: sets --page-color and a
 * `color-theme-dark|light` class so CSS can pick readable text.
 * @param {Element} el
 * @returns {boolean} true when a page color was applied
 */
export function applyPageColor(el) {
  const color = getPageColor();
  if (!color) return false;
  el.style.setProperty('--page-color', color.hex);
  el.classList.add(`color-theme-${color.theme}`);
  return true;
}
