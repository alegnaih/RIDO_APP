import { GeoPoint } from '../types';

const EARTH_RADIUS_METERS = 6371000;
const METERS_PER_KILOMETER = 1000;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two coordinates, in metres.
 * Accurate enough for convoy spacing and stray-corridor checks at touring speeds.
 */
export function haversineDistanceMeters(from: GeoPoint, to: GeoPoint): number {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/** Formats a distance for display, switching to kilometres past 1 km. */
export function formatDistance(meters: number): string {
  if (meters < METERS_PER_KILOMETER) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / METERS_PER_KILOMETER).toFixed(1)} km`;
}

/** Trims a coordinate pair to the 6 decimal places shown in the UI. */
export function formatCoordinates(point: GeoPoint): string {
  return `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;
}
