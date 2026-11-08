// src/services/directionService.ts
import { config } from '../constants/config';
import { LocationPoint } from '../types/trips';

export interface RouteData {
  geometry: any; // GeoJSON LineString
  legDistances: string[]; // e.g., ["5.1km", "3.6km"]
  legDurations: number[]; 
  totalDistance: string;
  totalDuration: number; // in seconds
}

export async function getDirections(points: LocationPoint[]): Promise<RouteData | null> {
  if (points.length < 2) return null;

  // Format coordinates as "lng,lat;lng,lat;..."
  const coordsString = points
    .map((p) => `${p.location.longitude},${p.location.latitude}`)
    .join(';');

  // profile: mapbox/driving (optimized for cars/motorcycles)
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&overview=full&access_token=${config.mapboxAccessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn('No route found');
      return null;
    }

    const route = data.routes[0];

    //  Extract both durations and distances for each leg
    const legDurations = route.legs.map((leg: any) => leg.duration);
    const legDistances = route.legs.map((leg: any) => {
      const km = leg.distance / 1000;
      return `${km.toFixed(1)}km`;
    });

    const routeFeature = {
      type: 'Feature',
      properties: {},
      geometry: route.geometry,
    };

    return {
      geometry: routeFeature,
      legDistances,
      legDurations, //
      totalDistance: `${(route.distance / 1000).toFixed(1)}km`,
      totalDuration: route.duration,
    };
  } catch (error) {
    console.error('Error fetching directions:', error);
    return null;
  }
}