const OPEN_LAYER_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[data-state="open"][data-radix-popper-content-wrapper]',
].join(', ');

function hasOpenBlockingLayer() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector(OPEN_LAYER_SELECTOR));
}

export function recoverOverlayState() {
  if (typeof document === 'undefined' || hasOpenBlockingLayer()) {
    return;
  }

  const { body, documentElement } = document;

  body.style.removeProperty('pointer-events');
  body.style.removeProperty('overflow');
  body.style.removeProperty('padding-right');
  body.removeAttribute('data-scroll-locked');
  // Some Radix versions also set aria-hidden on body siblings
  body.removeAttribute('aria-hidden');

  documentElement.style.removeProperty('overflow');
  documentElement.style.removeProperty('pointer-events');
}

export function scheduleOverlayRecovery() {
  if (typeof window === 'undefined') return;

  const run = () => recoverOverlayState();

  window.requestAnimationFrame(run);
  window.setTimeout(run, 0);
  window.setTimeout(run, 150);
  window.setTimeout(run, 500);
  window.setTimeout(run, 1200);
}

let observerInstalled = false;

/**
 * Watches the <body> for stuck pointer-events:none / data-scroll-locked
 * attributes and clears them whenever no Radix dialog is actually open.
 * This protects against the "dimmed unresponsive screen after login" bug
 * where a portal lock survives an unmount.
 */
export function installOverlayWatchdog() {
  if (typeof document === 'undefined' || observerInstalled) return;
  observerInstalled = true;

  const observer = new MutationObserver(() => {
    const body = document.body;
    if (!body) return;
    const locked =
      body.hasAttribute('data-scroll-locked') ||
      body.style.pointerEvents === 'none' ||
      body.style.overflow === 'hidden';
    if (locked && !hasOpenBlockingLayer()) {
      recoverOverlayState();
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style', 'data-scroll-locked', 'aria-hidden'],
  });
}
