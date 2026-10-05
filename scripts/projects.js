/*
 * My Projects: colors the visitor saved with an "Add to project" button.
 * Stored locally (no account); every change is broadcast as a `projects:change`
 * event on window so the header and other blocks can stay in sync.
 */

const STORAGE_KEY = 'behr-project-colors';
export const PROJECTS_CHANGE_EVENT = 'projects:change';

/**
 * @typedef {{ code: string, name?: string, hex?: string }} ProjectColor
 */

/**
 * @returns {ProjectColor[]} the saved colors, oldest first
 */
export function getProjectColors() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((c) => c && c.code) : [];
  } catch {
    return [];
  }
}

const sameCode = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();

/**
 * @param {string} code color code, e.g. T27-01
 * @returns {boolean}
 */
export function isInProject(code) {
  return getProjectColors().some((c) => sameCode(c.code, code));
}

function save(colors) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // storage unavailable (private mode / quota): keep the in-page state only
  }
  window.dispatchEvent(new CustomEvent(PROJECTS_CHANGE_EVENT, { detail: { colors } }));
}

/**
 * Adds the color if it isn't saved yet, removes it otherwise.
 * @param {ProjectColor} color
 * @returns {boolean} true when the color is now saved
 */
export function toggleProjectColor(color) {
  if (!color || !color.code) return false;
  const colors = getProjectColors();
  const index = colors.findIndex((c) => sameCode(c.code, color.code));
  if (index >= 0) colors.splice(index, 1);
  else colors.push({ code: color.code, name: color.name, hex: color.hex });
  save(colors);
  return index < 0;
}
