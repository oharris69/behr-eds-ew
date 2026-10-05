/* eslint-disable */
/* global WebImporter */
import edsBlockParser from './eds-block.js';

/**
 * Parser for color-collection on Edge Delivery source pages.
 * The source block lists colors through a data-feed link (color codes only) resolved at runtime
 * by an internal color service. Our block is authored statically: row 2 is a list of
 * "CODE|Name|HEX" color links. Names and hex values come from the palette list of the
 * color-trends-visualizer on the same page (last row, first cell), which uses that format.
 * If no palette list exists on the page, the feed link is kept so the content isn't lost.
 */
export default function parse(element, { document, ...rest }) {
  const palette = document.querySelector('.color-trends-visualizer > div:last-child > div:first-child ul');
  const feedLink = [...element.querySelectorAll('a[href]')]
    .find((a) => /color-data|brochure/.test(a.getAttribute('href')));

  if (palette && feedLink) {
    const row = feedLink.closest('.color-collection > div');
    const cell = row ? row.firstElementChild : null;
    if (cell) cell.replaceChildren(palette.cloneNode(true));
  }

  edsBlockParser(element, { document, ...rest });
}
