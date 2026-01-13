/**
 * Enhanced GPS helper for PWA compatibility on Android
 * Handles permission requests and provides better error messages
 */

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GPSError {
  code: number;
  message: string;
  userFriendlyMessage: string;
}

/**
 * Check if geolocation is available
 */
export const isGeolocationAvailable = (): boolean => {
  return 'geolocation' in navigator;
};

/**
 * Check if we're in a secure context (required for geolocation)
 */
export const isSecureContext = (): boolean => {
  return window.isSecureContext === true;
};

/**
 * Check and request location permission explicitly
 * This helps with Android WebView/PWA issues
 */
export const checkLocationPermission = async (): Promise<PermissionState | null> => {
  if (!('permissions' in navigator)) {
    console.log('Permissions API not supported');
    return null;
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    console.log('Geolocation permission status:', result.state);
    return result.state;
  } catch (error) {
    console.error('Error checking permission:', error);
    return null;
  }
};

/**
 * Get GPS position with enhanced error handling for Android PWA
 */
export const getGPSPosition = async (options?: {
  timeout?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
}): Promise<GPSPosition> => {
  const {
    timeout = 15000,
    maximumAge = 0,
    enableHighAccuracy = true,
  } = options || {};

  // Check if geolocation is available
  if (!isGeolocationAvailable()) {
    throw {
      code: 0,
      message: 'Geolocation not supported',
      userFriendlyMessage: 'Your device does not support GPS location. Please use a device with GPS capability.',
    } as GPSError;
  }

  // Check secure context
  if (!isSecureContext()) {
    throw {
      code: 0,
      message: 'Insecure context',
      userFriendlyMessage: 'GPS requires a secure connection (HTTPS). Please access the app via HTTPS.',
    } as GPSError;
  }

  // Check permission status first
  const permissionState = await checkLocationPermission();
  if (permissionState === 'denied') {
    throw {
      code: 1,
      message: 'Permission denied',
      userFriendlyMessage: 'Location permission was denied. Please enable location access in your browser/app settings and refresh the page.',
    } as GPSError;
  }

  return new Promise((resolve, reject) => {
    // First try with high accuracy
    const attemptLocation = (highAccuracy: boolean, isRetry: boolean = false) => {
      console.log(`Attempting GPS capture (highAccuracy: ${highAccuracy}, retry: ${isRetry})`);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('GPS captured successfully:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.error('GPS error:', error.code, error.message);
          
          // If high accuracy failed and this is not a retry, try without high accuracy
          if (highAccuracy && !isRetry && error.code === error.TIMEOUT) {
            console.log('Retrying with lower accuracy...');
            attemptLocation(false, true);
            return;
          }

          let userFriendlyMessage = 'Unable to get your location. Please try again.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              userFriendlyMessage = 'Location permission denied. Please follow these steps:\n\n' +
                '📱 Android: Go to Settings → Apps → [Browser/App Name] → Permissions → Location → Allow\n\n' +
                '🍎 iOS: Go to Settings → Privacy → Location Services → [Browser/App Name] → While Using\n\n' +
                'After enabling, please refresh this page.';
              break;
            case error.POSITION_UNAVAILABLE:
              userFriendlyMessage = 'Location information unavailable. Please:\n' +
                '1. Ensure GPS/Location is turned ON in your device settings\n' +
                '2. Move to an area with better GPS signal\n' +
                '3. Try again in a few moments';
              break;
            case error.TIMEOUT:
              userFriendlyMessage = 'Location request timed out. Please:\n' +
                '1. Ensure GPS is enabled on your device\n' +
                '2. Move to an open area for better signal\n' +
                '3. Check if Location/GPS is on in quick settings\n' +
                '4. Try again';
              break;
          }

          reject({
            code: error.code,
            message: error.message,
            userFriendlyMessage,
          } as GPSError);
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeout,
          maximumAge: maximumAge,
        }
      );
    };

    attemptLocation(enableHighAccuracy);
  });
};

/**
 * Watch position with enhanced error handling
 */
export const watchGPSPosition = (
  onSuccess: (position: GPSPosition) => void,
  onError: (error: GPSError) => void,
  options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }
): number | null => {
  if (!isGeolocationAvailable()) {
    onError({
      code: 0,
      message: 'Geolocation not supported',
      userFriendlyMessage: 'Your device does not support GPS location.',
    });
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    (error) => {
      let userFriendlyMessage = 'Unable to track location.';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          userFriendlyMessage = 'Location permission denied. Please enable in settings.';
          break;
        case error.POSITION_UNAVAILABLE:
          userFriendlyMessage = 'Location unavailable. Please enable GPS.';
          break;
        case error.TIMEOUT:
          userFriendlyMessage = 'Location request timed out.';
          break;
      }
      onError({
        code: error.code,
        message: error.message,
        userFriendlyMessage,
      });
    },
    {
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 10000,
      maximumAge: options?.maximumAge ?? 0,
    }
  );
};

/**
 * Clear watch
 */
export const clearGPSWatch = (watchId: number): void => {
  navigator.geolocation.clearWatch(watchId);
};
