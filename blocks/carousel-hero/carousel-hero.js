import { createOptimizedPicture } from '../../scripts/aem.js';

const HEADINGS = 'h1, h2, h3, h4, h5, h6';
const AUTOPLAY_MS = 5000;

/**
 * True when a paragraph holds exactly one link and no other text.
 * @param {Element} el
 * @returns {boolean}
 */
function isLinkOnly(el) {
  if (el.tagName !== 'P') return false;
  const links = el.querySelectorAll('a[href]');
  return links.length === 1 && !el.querySelector('picture')
    && el.textContent.trim() === links[0].textContent.trim();
}

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
    if (!node.textContent.trim() && !node.querySelector('img, picture') && node.tagName !== 'PICTURE') return;
    target.append(node);
  });
}

/**
 * Builds one slide from a row: [picture] | [heading, text, CTA link].
 * Cells are detected by content, so swapped, merged or missing cells work.
 * @param {Element} row
 * @param {number} index
 * @returns {HTMLLIElement|null}
 */
function buildSlide(row, index) {
  const content = document.createElement('div');
  [...row.children].forEach((cell) => moveContent(cell, content));
  if (!content.children.length) return null;

  const li = document.createElement('li');
  li.className = 'carousel-hero-slide';

  const picture = content.querySelector('picture');
  if (picture) {
    const media = document.createElement('div');
    media.className = 'carousel-hero-image';
    const holder = picture.parentElement;
    const img = picture.querySelector('img');
    // slide 1 is the LCP candidate: eager + high priority, the rest lazy
    const optimized = img
      ? createOptimizedPicture(img.src, img.alt, index === 0, [
        { media: '(min-width: 1024px)', width: '2000' },
        { media: '(min-width: 768px)', width: '1200' },
        { width: '750' },
      ])
      : picture;
    if (index === 0) optimized.querySelector('img')?.setAttribute('fetchpriority', 'high');
    media.append(optimized);
    picture.remove();
    if (holder !== content && !holder.textContent.trim() && !holder.querySelector('picture')) holder.remove();
    li.append(media);
  }
  // one image per slide
  content.querySelectorAll('picture').forEach((pic) => {
    const holder = pic.closest('p');
    if (holder && !holder.textContent.trim()) holder.remove();
    else pic.remove();
  });

  if (content.textContent.trim()) {
    const title = content.querySelector(HEADINGS);
    if (title) title.classList.add('carousel-hero-title');
    const ctas = [...content.children].filter(isLinkOnly);
    content.querySelectorAll(':scope > p').forEach((p) => {
      if (!ctas.includes(p)) p.classList.add('carousel-hero-text');
    });
    ctas.forEach((p, i) => {
      const a = p.querySelector('a');
      p.className = 'button-wrapper carousel-hero-cta';
      a.classList.add('button');
      if (!a.matches('.primary, .secondary, .accent')) a.classList.add(i === 0 ? 'primary' : 'secondary');
    });

    const inner = document.createElement('div');
    inner.className = 'carousel-hero-inner';
    const box = document.createElement('div');
    box.className = 'carousel-hero-content';
    box.append(...content.children);
    inner.append(box);
    li.append(inner);
  }
  return li;
}

/**
 * Wires dots, autoplay and keyboard support to the scroll-snap track.
 * Autoplay (5s, looping) pauses while the carousel is hovered or focused,
 * stops for good after any user interaction or the pause button, and never
 * starts under prefers-reduced-motion.
 * @param {Element} block
 * @param {HTMLElement} track
 * @param {HTMLButtonElement[]} dots
 * @param {HTMLButtonElement} toggle
 */
function wire(block, track, dots, toggle) {
  const slides = [...track.children];
  const total = slides.length;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = -1;

  const setActive = (index) => {
    if (index === current) return;
    current = index;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle('is-active', active);
      // off-screen slides are taken out of the tab order and the a11y tree
      slide.inert = !active;
    });
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };

  // while a programmatic scroll runs, intermediate slides must not steal the
  // active state; released when the target is reached (or after a timeout)
  let pending = null;
  let pendingTimer;
  const release = () => {
    pending = null;
    clearTimeout(pendingTimer);
  };

  const goTo = (index, smooth = true) => {
    const i = ((index % total) + total) % total;
    pending = i;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(release, 2000);
    track.scrollTo({
      left: slides[i].offsetLeft - slides[0].offsetLeft,
      behavior: smooth && !reduced.matches ? 'smooth' : 'auto',
    });
    setActive(i);
  };

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const index = Math.max(0, Math.min(
        total - 1,
        Math.round(track.scrollLeft / (track.clientWidth || 1)),
      ));
      if (pending !== null) {
        if (index !== pending) return;
        release();
      }
      setActive(index);
    });
  }, { passive: true });

  // autoplay
  let timer;
  let stopped = reduced.matches;
  let hovered = false;
  let focused = false;
  const updateToggle = () => {
    toggle.setAttribute('aria-label', stopped ? 'Play slideshow' : 'Pause slideshow');
    toggle.classList.toggle('is-paused', stopped);
  };
  const schedule = () => {
    clearTimeout(timer);
    if (stopped || hovered || focused || document.hidden) return;
    timer = setTimeout(() => {
      goTo(current + 1);
      schedule();
    }, AUTOPLAY_MS);
  };
  const stop = () => {
    stopped = true;
    release();
    clearTimeout(timer);
    updateToggle();
  };

  toggle.addEventListener('click', () => {
    stopped = !stopped;
    updateToggle();
    // the toggle has focus now; play resumes without waiting for blur
    if (!stopped) {
      focused = false;
      schedule();
    } else clearTimeout(timer);
  });
  block.addEventListener('mouseenter', () => { hovered = true; schedule(); });
  block.addEventListener('mouseleave', () => { hovered = false; schedule(); });
  block.addEventListener('focusin', (e) => {
    if (e.target === toggle) return;
    focused = true;
    schedule();
  });
  block.addEventListener('focusout', (e) => {
    if (block.contains(e.relatedTarget) && e.relatedTarget !== toggle) return;
    focused = false;
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); });

  // any direct interaction stops autoplay: a horizontal swipe / trackpad
  // scroll on the track (vertical page scrolling over the hero does not count)
  track.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) stop();
  }, { passive: true });
  let touch;
  track.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touch = t ? { x: t.clientX, y: t.clientY } : null;
  }, { passive: true });
  track.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!touch || !t) return;
    const dx = Math.abs(t.clientX - touch.x);
    if (dx > 10 && dx > Math.abs(t.clientY - touch.y)) {
      touch = null;
      stop();
    }
  }, { passive: true });
  track.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) stop();
  });

  dots.forEach((dot, i) => dot.addEventListener('click', () => {
    stop();
    goTo(i);
  }));

  // arrow keys on the dots move between slides (roving focus)
  dots.forEach((dot, i) => dot.addEventListener('keydown', (e) => {
    const keys = {
      ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: total - 1,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    stop();
    const to = ((keys[e.key] % total) + total) % total;
    dots[to].focus();
    goTo(to);
  }));

  // keep the snapped slide aligned when the viewport resizes
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (current >= 0) track.scrollLeft = slides[current].offsetLeft - slides[0].offsetLeft;
    }).observe(track);
  }

  setActive(0);
  updateToggle();
  schedule();
}

/**
 * Carousel Hero: full-width rotating hero slides (photo with a dark gradient,
 * heading, text and a pill CTA on the left), dot pagination and autoplay.
 * Content contract: one row per slide
 *   [picture] | [heading (h1 on slide 1, h2 on the others), p text, p > a CTA]
 * Cells may be swapped, merged or omitted.
 * @param {Element} block
 */
export default function decorate(block) {
  const track = document.createElement('ul');
  track.className = 'carousel-hero-track';
  [...block.children].forEach((row) => {
    const slide = buildSlide(row, track.children.length);
    if (slide) track.append(slide);
  });

  const total = track.children.length;
  if (!total) {
    block.replaceChildren();
    return;
  }

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', 'Featured stories');

  [...track.children].forEach((slide, i) => {
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} of ${total}`);
    slide.id = `${block.dataset.blockName || 'carousel-hero'}-slide-${i + 1}`;
  });

  const parts = [track];
  if (total > 1) {
    const controls = document.createElement('div');
    controls.className = 'carousel-hero-controls';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'carousel-hero-toggle';

    const nav = document.createElement('div');
    nav.className = 'carousel-hero-dots';
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', 'Choose slide');
    const dots = [...track.children].map((slide, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-hero-dot';
      dot.setAttribute('aria-label', `Show slide ${i + 1} of ${total}`);
      dot.setAttribute('aria-controls', slide.id);
      nav.append(dot);
      return dot;
    });

    controls.append(toggle, nav);
    parts.push(controls);
    block.replaceChildren(...parts);
    wire(block, track, dots, toggle);
    return;
  }

  block.replaceChildren(...parts);
}
