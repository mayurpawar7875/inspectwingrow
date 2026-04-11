const OPEN_LAYER_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
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

  documentElement.style.removeProperty('overflow');
  documentElement.style.removeProperty('pointer-events');
}

export function scheduleOverlayRecovery() {
  if (typeof window === 'undefined') return;

  const run = () => recoverOverlayState();

  window.requestAnimationFrame(run);
  window.setTimeout(run, 0);
  window.setTimeout(run, 150);
}
