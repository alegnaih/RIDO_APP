import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { GeoPoint } from '../types';
import { config } from '../constants/config';
import { getErrorMessage } from '../utils/errors';

export interface UseLocationResult {
  currentCoords: GeoPoint | null;
  permissionGranted: boolean;
  error: string | null;
  isLoading: boolean;
}

function toGeoPoint(position: Location.LocationObject): GeoPoint {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

/**
 * Tracks the rider's own position for the convoy map.
 *
 * Foreground permission only. Background ("always") access is deliberately not
 * requested here — iOS will not grant it without a separate escalation step, and
 * Android 11+ sends the rider straight to Settings, so it belongs behind the
 * moment they actually join a trip.
 */
export function useLocation(): UseLocationResult {
  const [currentCoords, setCurrentCoords] = useState<GeoPoint | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isCancelled = false;

    const startTracking = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (isCancelled) {
          return;
        }

        if (permission.status !== 'granted') {
          setPermissionGranted(false);
          setError('Location is off. Turn it on to see yourself on the convoy map.');
          return;
        }

        setPermissionGranted(true);

        // A single balanced fix paints the map quickly; the watcher then keeps it current.
        const initialPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isCancelled) {
          return;
        }

        setCurrentCoords(toGeoPoint(initialPosition));

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: config.locationThrottleMeters,
          },
          (nextPosition) => {
            if (!isCancelled) {
              setCurrentCoords(toGeoPoint(nextPosition));
            }
          },
        );
      } catch (caught) {
        if (!isCancelled) {
          setError(getErrorMessage(caught, 'Could not read your location.'));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void startTracking();

    return () => {
      isCancelled = true;
      subscription?.remove();
    };
  }, []);

  return {
    currentCoords,
    permissionGranted,
    error,
    isLoading,
  };
}
