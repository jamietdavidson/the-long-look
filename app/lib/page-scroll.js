/** @type {HTMLElement | null} */
let scrollTarget = null;

const TARGET_CHANGE_EVENT = 'pagescroll:targetchange';
const SCROLL_EVENT = 'pagescroll';

/** @returns {HTMLElement | null} */
function resolveScrollTarget() {
  if (scrollTarget) {
    return scrollTarget;
  }

  const viewport = document.querySelector('[data-overlayscrollbars-viewport]');

  return viewport instanceof HTMLElement ? viewport : null;
}

/** @param {HTMLElement} element */
export function registerPageScrollTarget(element) {
  scrollTarget = element;
  window.dispatchEvent(new CustomEvent(TARGET_CHANGE_EVENT));
  notifyPageScroll();
}

export function unregisterPageScrollTarget() {
  scrollTarget = null;
  window.dispatchEvent(new CustomEvent(TARGET_CHANGE_EVENT));
}

export function getPageScrollTop() {
  const target = resolveScrollTarget();

  if (target) {
    return target.scrollTop;
  }

  return window.scrollY;
}

function notifyPageScroll() {
  window.dispatchEvent(new CustomEvent(SCROLL_EVENT));
}

export function syncPageScroll() {
  notifyPageScroll();
}

/** @param {() => void} listener */
export function subscribePageScroll(listener) {
  /** @type {HTMLElement | null} */
  let attachedTarget = null;

  const attachTargetListener = () => {
    const target = resolveScrollTarget();

    if (target && target !== attachedTarget) {
      attachedTarget?.removeEventListener('scroll', listener);
      attachedTarget = target;
      attachedTarget.addEventListener('scroll', listener, {passive: true});
      listener();
    }

    if (!target && attachedTarget) {
      attachedTarget.removeEventListener('scroll', listener);
      attachedTarget = null;
      listener();
    }
  };

  window.addEventListener('scroll', listener, {passive: true});
  window.addEventListener(SCROLL_EVENT, listener);
  window.addEventListener(TARGET_CHANGE_EVENT, attachTargetListener);
  attachTargetListener();
  listener();

  return () => {
    window.removeEventListener('scroll', listener);
    window.removeEventListener(SCROLL_EVENT, listener);
    window.removeEventListener(TARGET_CHANGE_EVENT, attachTargetListener);
    attachedTarget?.removeEventListener('scroll', listener);
  };
}
