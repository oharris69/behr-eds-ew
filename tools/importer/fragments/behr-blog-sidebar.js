/* eslint-disable */
/**
 * Builds the shared sidebar fragment document from the WordPress widget area:
 * one section per widget (title + content), separated by section breaks.
 * @param {Element} sidebar - cloned #secondary element
 * @param {Document} document
 * @returns {Element} fragment root
 */
export default function buildSidebarFragment(sidebar, document) {
  const root = document.createElement('div');
  const widgets = [...sidebar.querySelectorAll(':scope > section.widget, :scope > .widget')];
  widgets.forEach((widget, i) => {
    if (i > 0) root.append(document.createElement('hr'));
    const title = widget.querySelector('.widget-title');
    if (title) {
      const h2 = document.createElement('h2');
      h2.textContent = title.textContent.trim();
      root.append(h2);
      title.remove();
    }
    // drop commented-out legacy markup, empty paragraphs and layout-only spans
    const walker = document.createTreeWalker(widget, 128 /* NodeFilter.SHOW_COMMENT */);
    const comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((c) => c.remove());
    widget.querySelectorAll('p').forEach((p) => {
      if (!p.textContent.trim() && !p.querySelector('img, a')) p.remove();
    });
    // promo post cards: title link then image link
    widget.querySelectorAll('.postSingle').forEach((post) => {
      const card = document.createElement('div');
      const link = post.querySelector('.postTitle a');
      const img = post.querySelector('.postImage img');
      if (img) {
        const p = document.createElement('p');
        const a = document.createElement('a');
        a.href = link ? link.href : post.querySelector('.postImage a')?.href || '';
        a.append(img);
        p.append(a);
        card.append(p);
      }
      if (link) {
        const h3 = document.createElement('h3');
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.textContent.trim();
        h3.append(a);
        card.append(h3);
      }
      post.replaceWith(...card.childNodes);
    });
    // trending list: category label + nested links stay as a nested list
    // Pinterest feed: keep each pin as an image link
    widget.querySelectorAll('.pins-feed-item').forEach((pin) => {
      const a = pin.querySelector('a');
      const img = pin.querySelector('img');
      const li = document.createElement('li');
      if (a && img) {
        const link = document.createElement('a');
        link.href = a.href;
        link.append(img);
        li.append(link);
      }
      pin.replaceWith(li);
    });
    root.append(...widget.querySelectorAll(':scope > *'));
  });
  return root;
}

