const OPEN_LAYER_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
].join(', ');

const OVERLAY_SELECTOR = '[data-lovable-overlay="true"]';

function hasOpenBlockingLayer() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector(OPEN_LAYER_SELECTOR));
}

export function recoverOverlayState() {
  if (typeof document === 'undefined' || hasOpenBlockingLayer()) {
    return;
  }

  const { body } = document;

  body.style.removeProperty('pointer-events');
  body.style.removeProperty('overflow');
  body.style.removeProperty('padding-right');
  body.removeAttribute('data-scroll-locked');

  document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR).forEach((overlay) => {
    const portalRoot = overlay.closest('[data-radix-portal]') ?? overlay.parentElement;
    const hasOpenDialog = portalRoot?.querySelector(OPEN_LAYER_SELECTOR);

    if (!hasOpenDialog) {
      overlay.remove();
    }
  });
}

export function scheduleOverlayRecovery() {
  if (typeof window === 'undefined') return;

  const run = () => recoverOverlayState();

  window.requestAnimationFrame(run);
  window.setTimeout(run, 0);
  window.setTimeout(run, 150);
}