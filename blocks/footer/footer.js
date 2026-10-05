/**
 * Fetches the footer fragment. /content/footer.plain.html is served by the local
 * dev server; /footer.plain.html is the fragment on DA/EDS preview and live.
 * @returns {Promise<Document|null>} parsed fragment
 */
async function fetchFooter() {
  let resp = window.location.pathname.startsWith('/content/')
    ? await fetch('/content/footer.plain.html') : null;
  if (!resp?.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
  // fragment image paths are relative to the fragment itself
  doc.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), resp.url).href;
  });
  return doc;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  });
  children.flat().forEach((c) => { if (c) node.append(c); });
  return node;
}

// single-color SVGs painted with currentcolor through a CSS mask
function maskIcon(src) {
  const span = el('span', { class: 'icon', 'aria-hidden': 'true' });
  span.style.setProperty('--icon-url', `url('${src}')`);
  return span;
}

function codeIcon(name) {
  return maskIcon(`${window.hlx.codeBasePath}/icons/${name}.svg`);
}

const text = (node) => (node?.textContent || '').trim();
const onlyStrong = (p) => p?.tagName === 'P' && p.querySelector('strong') && text(p) === text(p.querySelector('strong'));
const onlyEm = (p) => p?.tagName === 'P' && p.querySelector('em') && text(p) === text(p.querySelector('em'));

/* ---------- subscribe band ---------- */

/**
 * Subscribe content: h2 + paragraph (inline band), h3 + paragraph (sheet intro),
 * list of field labels (trailing * = required), strong = button label, em = success message.
 */
function parseSubscribe(section) {
  const kids = [...section.children];
  const h2 = kids.find((n) => n.tagName === 'H2');
  const h3 = kids.find((n) => n.tagName === 'H3');
  const after = (h) => (h && h.nextElementSibling?.tagName === 'P' ? h.nextElementSibling : null);
  const fields = [...(section.querySelector('ul')?.querySelectorAll('li') || [])].map((li) => {
    const label = text(li);
    return { label: label.replace(/\*$/, '').trim(), placeholder: label, required: label.endsWith('*') };
  });
  return {
    heading: text(h2),
    body: after(h2),
    sheetHeading: text(h3),
    sheetBody: after(h3),
    fields,
    submit: text(kids.find(onlyStrong)) || 'Subscribe',
    success: text(kids.find(onlyEm)),
  };
}

const FIELD_TYPES = { email: 'email' };
const fieldName = (label) => label.toLowerCase().replace(/[^a-z0-9]+(.)?/g, (m, c) => (c ? c.toUpperCase() : ''));

function validateField(input) {
  const { value } = input;
  let ok = !input.required || value.trim() !== '';
  if (ok && input.type === 'email' && value) ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (ok && /zip/i.test(input.name) && value) ok = /^\d{5}$/.test(value.trim());
  const wrap = input.closest('.footer-field');
  wrap.classList.toggle('is-error', !ok);
  input.setAttribute('aria-invalid', String(!ok));
  wrap.querySelector('.footer-field-error').textContent = ok ? '' : input.dataset.error;
  return ok;
}

function buildField({ label, placeholder, required }, idPrefix) {
  const name = fieldName(label);
  const id = `${idPrefix}-${name}`;
  const input = el('input', {
    id, name, placeholder, type: /email/i.test(label) ? FIELD_TYPES.email : 'text', autocomplete: /email/i.test(label) ? 'email' : 'on',
  });
  if (/zip/i.test(label)) input.setAttribute('inputmode', 'numeric');
  input.required = required;
  input.dataset.error = /email/i.test(label) ? `Please enter a valid ${label.toLowerCase()}` : `Please enter your ${label.toLowerCase()}`;
  input.addEventListener('blur', () => { if (input.value) validateField(input); });
  return el(
    'div',
    { class: 'footer-field' },
    el('label', { class: 'footer-field-label', for: id }, label),
    input,
    el('p', { class: 'footer-field-error', role: 'alert' }),
  );
}

async function submitSubscription(data) {
  // the subscription service endpoint is site configuration, not footer content
  const endpoint = document.querySelector('meta[name="subscribe-endpoint"]')?.content;
  if (!endpoint) throw new Error('Subscriptions are not available right now. Please try again later.');
  const resp = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error('Something went wrong. Please try again.');
}

function buildSubscribe(model) {
  const band = el('div', { class: 'footer-subscribe' });
  const inner = el('div', { class: 'footer-container footer-subscribe-inner' });
  const textCol = el('div', { class: 'footer-subscribe-text' }, el('h2', { class: 'footer-subscribe-heading' }, model.heading));
  if (model.body) textCol.append(el('div', { class: 'footer-subscribe-body' }, model.body));

  const emailField = model.fields.find((f) => /email/i.test(f.label)) || { label: 'Email Address', placeholder: 'Email Address*', required: true };
  const inlineField = buildField({ ...emailField, placeholder: emailField.label }, 'footer-inline');
  inlineField.classList.add('footer-field-inline');
  const form = el(
    'form',
    { class: 'footer-subscribe-form', novalidate: '' },
    inlineField,
    el('button', { type: 'submit', class: 'footer-button footer-subscribe-submit' }, model.submit),
  );
  inner.append(textCol, form);
  band.append(inner);

  // side sheet with the full sign-up form
  const sheet = el('div', {
    class: 'footer-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': model.submit, hidden: '',
  });
  const panel = el('div', { class: 'footer-sheet-panel' });
  const close = el('button', { type: 'button', class: 'footer-sheet-close', 'aria-label': 'Close' }, codeIcon('close'));
  panel.append(el('div', { class: 'footer-sheet-header' }, el('p', { class: 'footer-sheet-title' }, model.submit), close));
  const sheetForm = el('form', { class: 'footer-sheet-form', novalidate: '' });
  const intro = el('div', { class: 'footer-sheet-text' }, el('h2', { class: 'footer-sheet-heading' }, model.sheetHeading));
  if (model.sheetBody) intro.append(el('div', { class: 'footer-sheet-body' }, model.sheetBody.cloneNode(true)));
  const fields = el('div', { class: 'footer-sheet-fields' }, ...model.fields.map((f) => buildField(f, 'footer-sheet')));
  const error = el('p', { class: 'footer-sheet-error', role: 'alert', hidden: '' });
  const sheetSubmit = el('button', { type: 'submit', class: 'footer-button footer-sheet-submit' }, model.submit);
  sheetForm.append(intro, fields, error, sheetSubmit);
  const success = el('div', { class: 'footer-sheet-success', hidden: '' }, el('p', {}, model.success));
  panel.append(el('div', { class: 'footer-sheet-content' }, sheetForm, success));
  sheet.append(el('div', { class: 'footer-sheet-backdrop' }), panel);

  const inlineInput = inlineField.querySelector('input');
  const sheetInputs = [...fields.querySelectorAll('input')];
  const closeSheet = () => {
    sheet.hidden = true;
    document.body.classList.remove('footer-sheet-open');
    form.inert = false;
    sheetForm.hidden = false;
    success.hidden = true;
    error.hidden = true;
    sheetSubmit.disabled = false;
    form.querySelector('button').focus();
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateField(inlineInput)) return;
    const sheetEmail = sheetInputs.find((i) => i.type === 'email');
    if (sheetEmail) sheetEmail.value = inlineInput.value;
    form.inert = true;
    sheet.hidden = false;
    document.body.classList.add('footer-sheet-open');
    close.focus();
  });
  sheetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const valid = sheetInputs.map(validateField).every(Boolean);
    if (!valid) {
      sheetForm.querySelector('.is-error input')?.focus();
      return;
    }
    sheetSubmit.disabled = true;
    error.hidden = true;
    try {
      const data = Object.fromEntries(sheetInputs.map((i) => [i.name, i.value.trim()]));
      await submitSubscription(data);
      sheetForm.hidden = true;
      success.hidden = false;
    } catch (err) {
      sheetSubmit.disabled = false;
      error.textContent = err.message;
      error.hidden = false;
    }
  });
  close.addEventListener('click', closeSheet);
  sheet.querySelector('.footer-sheet-backdrop').addEventListener('click', closeSheet);
  sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  return [band, sheet];
}

/* ---------- link columns ---------- */

function buildNav(section) {
  const nav = el('nav', { class: 'footer-nav', 'aria-label': 'Footer' });
  let group = null;
  [...section.children].forEach((n) => {
    if (onlyStrong(n)) {
      group = el('div', { class: 'footer-nav-group' }, el('p', { class: 'footer-nav-title' }, text(n)));
      nav.append(group);
    } else if (n.tagName === 'UL' && group) {
      const list = el('ul', { class: 'footer-nav-list' });
      n.querySelectorAll('li > a').forEach((a) => {
        a.className = 'footer-link footer-nav-link';
        list.append(el('li', {}, a));
      });
      group.append(list);
    }
  });
  return nav;
}

/* ---------- copyright, legal links, social ---------- */

function buildBottom(section) {
  const bottom = el('div', { class: 'footer-bottom' });
  const copyright = [...section.children].find(onlyStrong);
  if (copyright) {
    const value = text(copyright).replace('{{year}}', new Date().getFullYear());
    bottom.append(el('p', { class: 'footer-copyright' }, value));
  }
  const legalP = [...section.querySelectorAll(':scope > p')].find((p) => p !== copyright && p.querySelector('a'));
  if (legalP) {
    const legal = el('ul', { class: 'footer-legal' });
    legalP.querySelectorAll('a').forEach((a) => {
      a.className = 'footer-link footer-link-underlined footer-legal-link';
      // an in-page (#) link is the consent-preferences control: a button that opens
      // the consent manager (OneTrust) when it is installed on the site
      if (a.getAttribute('href')?.startsWith('#')) {
        const button = el('button', { type: 'button', class: a.className }, text(a));
        button.addEventListener('click', () => window.OneTrust?.ToggleInfoDisplay?.());
        legal.append(el('li', {}, button));
        return;
      }
      legal.append(el('li', {}, a));
    });
    bottom.append(legal);
  }
  const socialList = section.querySelector(':scope > ul');
  if (socialList) {
    const social = el('ul', { class: 'footer-social', 'aria-label': 'Social media' });
    socialList.querySelectorAll('li > a').forEach((a) => {
      const img = a.querySelector('img');
      const name = img?.alt || a.title;
      const link = el('a', {
        class: 'footer-social-link', href: a.getAttribute('href'), target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${name} (opens in new tab)`,
      });
      if (a.title) link.title = a.title;
      if (img) link.append(maskIcon(img.src));
      social.append(el('li', {}, link));
    });
    bottom.append(social);
  }
  return bottom;
}

/* ---------- logo + locale ---------- */

function buildBrand(section) {
  const brand = el('div', { class: 'footer-brand' });
  const lists = [...section.querySelectorAll(':scope > ul')];
  const localeList = lists.find((ul) => ul.querySelector('img'));
  if (localeList) {
    const labelP = localeList.previousElementSibling;
    const entries = [...localeList.querySelectorAll(':scope > li')];
    const current = entries.find((li) => li.querySelector('a')?.getAttribute('href') === '/') || entries[0];
    const currentLabel = text(current.querySelector('a'));
    const locale = el('div', { class: 'footer-locale' });
    const trigger = el(
      'button',
      {
        type: 'button',
        class: 'footer-locale-trigger',
        'aria-expanded': 'false',
        'aria-controls': 'footer-locale-list',
        'aria-label': `Select ${text(labelP).toLowerCase() || 'language'}: ${currentLabel}`,
      },
      current.querySelector('img').cloneNode(),
      el('span', {}, currentLabel),
      codeIcon('chevron-down'),
    );
    const list = el('ul', { class: 'footer-locale-list', id: 'footer-locale-list' });
    entries.forEach((li) => {
      const a = li.querySelector('a');
      const link = el('a', { href: a.getAttribute('href') }, li.querySelector('img'), el('span', {}, text(a)));
      if (li === current) link.setAttribute('aria-current', 'page');
      list.append(el('li', {}, link));
    });
    trigger.addEventListener('click', () => {
      trigger.setAttribute('aria-expanded', trigger.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    });
    document.addEventListener('click', (e) => { if (!locale.contains(e.target)) trigger.setAttribute('aria-expanded', 'false'); });
    locale.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      }
    });
    locale.append(trigger, list);
    brand.append(locale);
  }
  const logoLink = section.querySelector(':scope > p > a');
  if (logoLink) {
    const img = logoLink.querySelector('img');
    const a = el('a', { class: 'footer-logo', href: logoLink.getAttribute('href'), 'aria-label': img?.alt || 'Home' });
    if (img) {
      img.alt = '';
      a.append(img);
    }
    brand.append(a);
  }
  return brand;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const doc = await fetchFooter();
  if (!doc) return;
  // skip empty sections (e.g. the one left behind by a page metadata block)
  const [subscribe, links, legal, brandSection] = [...doc.body.querySelectorAll(':scope > div')]
    .filter((section) => section.children.length);
  block.textContent = '';

  if (subscribe) block.append(...buildSubscribe(parseSubscribe(subscribe)));
  const content = el('div', { class: 'footer-container footer-content' });
  if (links) content.append(buildNav(links), el('hr', { class: 'footer-separator' }));
  if (legal) content.append(buildBottom(legal), el('hr', { class: 'footer-separator' }));
  if (brandSection) content.append(buildBrand(brandSection));
  block.append(content);
}
