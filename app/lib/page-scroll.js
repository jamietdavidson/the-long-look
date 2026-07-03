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
  if (scrollTarget === element) {
    return;
  }

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

/**
 * @param {{behavior?: ScrollBehavior}} [options]
 * @returns {Promise<void>}
 */
export function scrollPageToTop({behavior = 'smooth'} = {}) {
  return new Promise((resolve) => {
    if (getPageScrollTop() === 0) {
      resolve();
      return;
    }

    const target = resolveScrollTarget();

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      target?.removeEventListener('scrollend', finish);
      window.removeEventListener('scrollend', finish);
      window.clearTimeout(timer);
      resolve();
    };

    const timer = window.setTimeout(finish, behavior === 'smooth' ? 500 : 0);

    if (target) {
      target.addEventListener('scrollend', finish, {once: true});
      target.scrollTo({top: 0, left: 0, behavior});
      return;
    }

    window.addEventListener('scrollend', finish, {once: true});
    window.scrollTo({top: 0, left: 0, behavior});
  });
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
