import Constants from 'expo-constants';

interface ExpoExtra {
  mapboxAccessToken: string;
  openWeatherApiKey: string;
  geminiApiKey: string;
  firebaseDatabaseUrl: string;
  googleWebClientId: string;
  devMenuEnabled: boolean;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<ExpoExtra>;

export const config = {
  mapboxAccessToken: extra.mapboxAccessToken ?? '',
  openWeatherApiKey: extra.openWeatherApiKey ?? '',
  geminiApiKey: extra.geminiApiKey ?? '',
  firebaseDatabaseUrl: extra.firebaseDatabaseUrl ?? '',
  googleWebClientId: extra.googleWebClientId ?? '',
  devMenuEnabled: extra.devMenuEnabled ?? false,

  // Geospatial thresholds
  corridorWidthMeters: 50,
  locationThrottleMeters: 5,
  locationBroadcastIntervalMs: 3000,
  sosPressDurationMs: 3000,

  // Mapbox
  mapStyleUrl: "mapbox://styles/mapbox/streets-v11",

  // Trip code
  tripCodeLength: 6,
  tripCodeCharset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
} as const;

//test
//console.log(" Environment Check:", config.googleWebClientId, config.mapboxAccessToken);

export type Config = typeof config;
