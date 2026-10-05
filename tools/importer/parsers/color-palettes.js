/* eslint-disable */
/* global WebImporter */
import edsBlockParser from './eds-block.js';

/**
 * Parser for color-palettes ("Perfect palettes") on Edge Delivery color detail pages.
 * The source authors only the intro row; the palettes come from Behr's color API at runtime.
 * migration-work/tools/color-api-snapshot.js stores them in the snapshot as
 * <div id="eds-color-api" hidden>{ palettes: [[{code,name,hex}, …]] }</div> (roles in order:
 * main, accent 1, accent 2, trim white). Each palette is authored as its own row: a list of
 * "CODE|Name|HEX" color links. The store is removed by the eds-sections transformer.
 */
const colorLink = (document, { code, name, hex }) => {
  const a = document.createElement('a');
  a.href = `/colors/color-detail/${code.toLowerCase()}`;
  a.textContent = `${code}|${name}|${hex}`;
  return a;
};

export default function parse(element, { document, ...rest }) {
  let data = {};
  try {
    data = JSON.parse(document.getElementById('eds-color-api')?.textContent || '{}');
  } catch (e) {
    data = {};
  }
  // Behr shows at most 6 palettes; author the same 6 so what's authored is what shows
  const palettes = (data.palettes || []).slice(0, 6);
  // only fill when the author hasn't listed palettes already
  if (palettes.length && !element.querySelector('a[href]')) {
    palettes.forEach((palette) => {
      const row = document.createElement('div');
      const cell = document.createElement('div');
      const ul = document.createElement('ul');
      palette.forEach((color) => {
        const li = document.createElement('li');
        li.append(colorLink(document, color));
        ul.append(li);
      });
      cell.append(ul);
      row.append(cell);
      element.append(row);
    });
  }
  edsBlockParser(element, { document, ...rest });
}

export { colorLink };
