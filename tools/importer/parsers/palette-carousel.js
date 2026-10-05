/* eslint-disable */
/* global WebImporter */
import edsBlockParser from './eds-block.js';
import { colorLink } from './color-palettes.js';

/**
 * Parser for palette-carousel ("More like …") on Edge Delivery color detail pages.
 * The source authors only the intro row; similar / lighter / darker colors come from Behr's
 * color API at runtime (see migration-work/tools/color-api-snapshot.js and the
 * #eds-color-api store). Authored here as one row per palette: [label] | [list of
 * "CODE|Name|HEX" color links]; empty palettes are left out.
 */
const PALETTES = [['similar', 'Similar'], ['lighter', 'Lighter'], ['darker', 'Darker']];

export default function parse(element, { document, ...rest }) {
  let data = {};
  try {
    data = JSON.parse(document.getElementById('eds-color-api')?.textContent || '{}');
  } catch (e) {
    data = {};
  }
  if (!element.querySelector('a[href]')) {
    PALETTES.forEach(([key, label]) => {
      // Behr shows at most 6 colors per palette tab
      const colors = (data[key] || []).slice(0, 6);
      if (!colors.length) return;
      const row = document.createElement('div');
      const labelCell = document.createElement('div');
      labelCell.textContent = label;
      const listCell = document.createElement('div');
      const ul = document.createElement('ul');
      colors.forEach((color) => {
        const li = document.createElement('li');
        li.append(colorLink(document, color));
        ul.append(li);
      });
      listCell.append(ul);
      row.append(labelCell, listCell);
      element.append(row);
    });
  }
  edsBlockParser(element, { document, ...rest });
}
