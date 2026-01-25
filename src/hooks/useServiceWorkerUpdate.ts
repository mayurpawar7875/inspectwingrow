import { useState, useEffect, useCallback } from 'react';

interface ServiceWorkerUpdateState {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function useServiceWorkerUpdate() {
  const [state, setState] = useState<ServiceWorkerUpdateState>({
    isUpdateAvailable: false,
    isUpdating: false,
    registration: null,
  });

  useEffect(() => {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const handleServiceWorker = async () => {
      try {
        // Get the current registration
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
          return;
        }

        // Check if there's a waiting service worker
        if (registration.waiting) {
          setState(prev => ({
            ...prev,
            isUpdateAvailable: true,
            registration,
          }));
        }

        // Listen for new service workers
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is installed and waiting
              setState(prev => ({
                ...prev,
                isUpdateAvailable: true,
                registration,
              }));
            }
          });
        });

        // Listen for controller change (when new SW takes over)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        // Check for updates periodically (every 60 seconds)
        const interval = setInterval(() => {
          registration.update().catch(console.error);
        }, 60 * 1000);

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Service worker error:', error);
      }
    };

    handleServiceWorker();
  }, []);

  const applyUpdate = useCallback(() => {
    if (!state.registration?.waiting) {
      return;
    }

    setState(prev => ({ ...prev, isUpdating: true }));

    // Tell the waiting service worker to skip waiting
    state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [state.registration]);

  const dismissUpdate = useCallback(() => {
    setState(prev => ({ ...prev, isUpdateAvailable: false }));
  }, []);

  return {
    isUpdateAvailable: state.isUpdateAvailable,
    isUpdating: state.isUpdating,
    applyUpdate,
    dismissUpdate,
  };
}
