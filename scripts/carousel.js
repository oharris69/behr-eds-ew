/**
 * Shared scroll-snap carousel behaviour (same interaction model as the
 * image-cards block): a native horizontally scrolling track with round
 * prev/next buttons, a "01/03" counter and keyboard support.
 *
 * Blocks own their markup and CSS; this module only wires behaviour.
 */

const pad = (n) => String(n).padStart(2, '0');

/**
 * Creates a round prev/next control.
 * @param {string} className base class, e.g. "simple-cards-nav"
 * @param {'prev'|'next'} dir
 * @returns {HTMLButtonElement}
 */
export function createNavButton(className, dir) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${className} ${className}-${dir}`;
  button.setAttribute('aria-label', dir === 'prev' ? 'Previous slide' : 'Next slide');
  return button;
}

/**
 * Creates the live "01/03" counter: a visual span (aria-hidden) and a
 * screen-reader span ("Slide 1 of 3").
 * @param {string} className counter class; the sr span gets `${className}-sr`
 * @returns {HTMLParagraphElement}
 */
export function createCounter(className) {
  const counter = document.createElement('p');
  counter.className = className;
  counter.setAttribute('aria-live', 'polite');
  counter.setAttribute('aria-atomic', 'true');
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  const sr = document.createElement('span');
  sr.className = `${className}-sr`;
  counter.append(visual, sr);
  return counter;
}

/**
 * Wires prev/next buttons, the counter and keyboard support to a native
 * scroll-snap track whose direct children are the slides.
 * @param {HTMLElement} track scroll container
 * @param {HTMLButtonElement} prev
 * @param {HTMLButtonElement} next
 * @param {HTMLElement} counter element built by createCounter()
 */
export function wireCarousel(track, prev, next, counter) {
  const slides = [...track.children];
  const total = slides.length;
  const [visual, sr] = counter.children;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const step = () => {
    if (total < 2) return track.clientWidth;
    return slides[1].offsetLeft - slides[0].offsetLeft;
  };
  // index of the slide snapped at the start of the track
  const position = () => {
    const index = Math.round(track.scrollLeft / (step() || 1));
    return Math.max(0, Math.min(total - 1, index));
  };
  // counter index: the last slide once the track cannot scroll any further
  const current = () => {
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    return atEnd && track.scrollLeft > 0 ? total - 1 : position();
  };

  let lastIndex = -1;
  const update = () => {
    const index = current();
    const maxScroll = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= maxScroll - 2;
    if (index === lastIndex) return;
    lastIndex = index;
    visual.textContent = `${pad(index + 1)}/${pad(total)}`;
    sr.textContent = `Slide ${index + 1} of ${total}`;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
  };

  const goTo = (index) => {
    const target = slides[Math.max(0, Math.min(total - 1, index))];
    if (!target) return;
    track.scrollTo({
      left: target.offsetLeft - slides[0].offsetLeft,
      behavior: reduced.matches ? 'auto' : 'smooth',
    });
  };

  prev.addEventListener('click', () => goTo(position() - 1));
  next.addEventListener('click', () => goTo(position() + 1));

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  }, { passive: true });

  // arrow keys move between slides (focus follows) when a slide or the track has focus
  track.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const focused = slides.findIndex((s) => s.contains(document.activeElement));
    const from = focused >= 0 ? focused : position();
    let to = from;
    if (e.key === 'ArrowLeft') to = from - 1;
    if (e.key === 'ArrowRight') to = from + 1;
    if (e.key === 'Home') to = 0;
    if (e.key === 'End') to = total - 1;
    to = Math.max(0, Math.min(total - 1, to));
    e.preventDefault();
    const link = slides[to].querySelector('a');
    if (focused >= 0 && link) link.focus({ preventScroll: true });
    goTo(to);
  });

  // a focused slide scrolled out of view (tabbing) is brought back into view
  track.addEventListener('focusin', (e) => {
    const index = slides.findIndex((s) => s.contains(e.target));
    if (index < 0) return;
    const slide = slides[index];
    const left = slide.offsetLeft - slides[0].offsetLeft;
    const visible = left >= track.scrollLeft - 1
      && left + slide.offsetWidth <= track.scrollLeft + track.clientWidth + 1;
    if (!visible) goTo(index);
  });

  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(track);
  update();
}
