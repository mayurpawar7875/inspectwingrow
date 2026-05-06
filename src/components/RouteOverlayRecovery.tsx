import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scheduleOverlayRecovery, installOverlayWatchdog } from '@/lib/overlayRecovery';

/**
 * Clears any stuck Radix portal body styles (pointer-events:none,
 * overflow:hidden, data-scroll-locked) on every route change. Prevents the
 * "dimmed unresponsive screen" bug some users see after login redirects.
 */
export function RouteOverlayRecovery() {
  const location = useLocation();

  useEffect(() => {
    installOverlayWatchdog();
  }, []);

  useEffect(() => {
    scheduleOverlayRecovery();
  }, [location.pathname]);

  return null;
}
