/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: behr.com site-wide cleanup.
 *
 * behr.com is itself an Edge Delivery site, so the source DOM contains decorated
 * EDS markup (header/footer blocks, .section containers, chat widget).
 * All selectors verified in migration-work/cleaned.html:
 *   <header class="header-wrapper"> ... <div class="header block">   (line 2)
 *   <footer class="footer-wrapper"> ... <div class="footer block">   (line 462)
 *   <div id="color-coach-overlay"> (ChatHUE chat iframe overlay)      (line 472)
 *   <div id="color-coach-reopen-button"> ("Hi, I'm ChatHUE!")         (line 477)
 *   bare <iframe> elements belonging to the chat widget               (lines 470, 474)
 *   <div class="section"> empty trailing section in main              (line 459)
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // ChatHUE chat widget (overlay + reopen button) - non-authorable
    WebImporter.DOMUtils.remove(element, [
      '#color-coach-overlay',
      '#color-coach-reopen-button',
    ]);

    // Empty trailing EDS section (<div class="section"> with no content).
    // Only remove sections with no text and no media so authored sections are never touched.
    element.querySelectorAll('.section').forEach((section) => {
      const hasText = section.textContent.trim().length > 0;
      const hasMedia = section.querySelector('img, picture, video, iframe, table');
      if (!hasText && !hasMedia) section.remove();
    });
  }

  if (hookName === TransformHook.afterTransform) {
    // Global chrome: header and footer (EDS header/footer blocks and wrappers)
    WebImporter.DOMUtils.remove(element, [
      'header',
      'footer',
      '.header-wrapper',
      '.footer-wrapper',
      'iframe',
      'noscript',
      'link',
    ]);
  }
}
