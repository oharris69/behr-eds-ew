/* eslint-disable */
/* global WebImporter */
import edsBlockParser from './eds-block.js';

/**
 * Parser for the Edge Delivery source block simple-hero (row 1 picture; row 2 h1 + p).
 * It has the same content model as our hero-spotlight, so it is authored as
 * "Hero Spotlight (dark)": the black text box variant.
 */
export default function parse(element, context) {
  element.className = 'hero-spotlight dark';
  edsBlockParser(element, context);
}
