const HEADINGS = 'h1, h2, h3, h4, h5, h6';
const BLOCK_LEVEL = 'p, div, ul, ol, table, blockquote, pre, picture, h1, h2, h3, h4, h5, h6';

let faqCount = 0;

/**
 * Moves the meaningful child nodes of a cell into a target, wrapping stray
 * text nodes in paragraphs and dropping empty wrappers.
 * @param {Element} cell
 * @param {Element} target
 */
function moveContent(cell, target) {
  [...cell.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent.trim()) return;
      const p = document.createElement('p');
      p.textContent = node.textContent.trim();
      target.append(p);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (!node.textContent.trim() && !node.querySelector('img, picture')) return;
    target.append(node);
  });
}

/**
 * Builds the answer body. A cell of bare text / inline markup (the authored
 * "text<br><br>text" form) is wrapped in a single paragraph so its <br>
 * breaks are kept; block content (paragraphs, lists) is moved as is.
 * @param {Element} cell
 * @returns {HTMLDivElement}
 */
function buildAnswer(cell) {
  const answer = document.createElement('div');
  answer.className = 'faq-answer';
  const hasBlocks = [...cell.children].some((el) => el.matches(BLOCK_LEVEL));
  if (hasBlocks) {
    moveContent(cell, answer);
  } else {
    const p = document.createElement('p');
    p.append(...cell.childNodes);
    // trim leading/trailing breaks left over from authoring
    const isFiller = (n) => n && (n.nodeName === 'BR'
      || (n.nodeType === Node.TEXT_NODE && !n.textContent.trim()));
    while (isFiller(p.firstChild)) p.firstChild.remove();
    while (isFiller(p.lastChild)) p.lastChild.remove();
    answer.append(p);
  }
  return answer;
}

/**
 * Builds the summary label from the question cell, keeping inline markup but
 * unwrapping a single paragraph / heading wrapper.
 * @param {Element} cell
 * @returns {HTMLSpanElement}
 */
function buildQuestion(cell) {
  const span = document.createElement('span');
  span.className = 'faq-question-text';
  const blocks = [...cell.children].filter((el) => el.matches(BLOCK_LEVEL));
  if (blocks.length) {
    blocks.forEach((el, i) => {
      if (i) span.append(' ');
      span.append(...el.childNodes);
    });
  } else {
    span.append(...cell.childNodes);
  }
  span.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
  return span;
}

/**
 * Plain text of an answer for structured data: <br> becomes a line break,
 * paragraphs are separated by blank lines.
 * @param {Element} answer
 * @returns {string}
 */
function answerText(answer) {
  const clone = answer.cloneNode(true);
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  return [...clone.children].map((el) => el.textContent.trim()).filter(Boolean).join('\n\n')
    || clone.textContent.trim();
}

/**
 * Adds FAQPage JSON-LD for this block to document.head (once per block).
 * @param {Element} block
 * @param {{ question: string, answer: string }[]} entries
 */
function addStructuredData(block, entries) {
  if (!entries.length || block.dataset.faqSchema) return;
  faqCount += 1;
  const id = `faq-schema-${faqCount}`;
  block.dataset.faqSchema = id;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.faqSchema = id;
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  });
  document.head.append(script);
}

/**
 * FAQ: intro on the left, accordion of <details>/<summary> items on the right.
 * Content contract:
 *   row 1 (optional): [h3 + p intro] - a single-cell row
 *   rows 2..n:        [question] | [answer (text with <br> breaks, or rich text)]
 * Option "single": only one answer open at a time.
 * Also emits FAQPage JSON-LD into document.head.
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  let intro;

  const cells = (row) => [...row.children].filter((c) => c.textContent.trim() || c.querySelector('img, picture'));
  const first = rows[0];
  if (first && cells(first).length === 1 && (first.querySelector(HEADINGS) || rows.length > 1)) {
    intro = document.createElement('div');
    intro.className = 'faq-intro';
    [...first.children].forEach((cell) => moveContent(cell, intro));
    rows.shift();
    if (!intro.children.length) intro = null;
  }

  const list = document.createElement('div');
  list.className = 'faq-list';
  const entries = [];
  const group = block.classList.contains('single') ? `faq-group-${faqCount + 1}` : '';

  rows.forEach((row) => {
    const [questionCell, ...answerCells] = cells(row);
    if (!questionCell || !answerCells.length) return;

    const details = document.createElement('details');
    details.className = 'faq-item';
    if (group) details.name = group;

    const summary = document.createElement('summary');
    summary.className = 'faq-question';
    const question = buildQuestion(questionCell);
    const chevron = document.createElement('span');
    chevron.className = 'faq-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    summary.append(question, chevron);

    const answer = buildAnswer(answerCells[0]);
    // extra answer cells are appended to the answer
    answerCells.slice(1).forEach((cell) => answer.append(...buildAnswer(cell).childNodes));

    details.append(summary, answer);
    list.append(details);
    entries.push({ question: question.textContent.replace(/\s+/g, ' ').trim(), answer: answerText(answer) });
  });

  const parts = [intro, list.children.length ? list : null].filter(Boolean);
  block.replaceChildren(...parts);
  addStructuredData(block, entries);
}
