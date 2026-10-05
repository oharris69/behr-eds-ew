/* eslint-disable */
/* global WebImporter */

// Exports the shared ColorfullyBEHR sidebar (WordPress #secondary widget area) as a
// fragment document. Run against any blog article; the article imports reference it
// through the Fragment block (/colorfullybehr/fragments/sidebar).
import buildSidebarFragment from './fragments/behr-blog-sidebar.js';

const SIDEBAR_FRAGMENT_PATH = '/colorfullybehr/fragments/sidebar';

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const sidebar = document.querySelector('#secondary.widget-area');
    const fragment = sidebar ? buildSidebarFragment(sidebar, document) : document.createElement('div');
    WebImporter.rules.adjustImageUrls(fragment, url, params.originalURL);
    return [{
      element: fragment,
      path: SIDEBAR_FRAGMENT_PATH,
      report: { title: 'ColorfullyBEHR sidebar fragment', template: 'colorfullybehr-sidebar', blocks: [] },
    }];
  },
};
