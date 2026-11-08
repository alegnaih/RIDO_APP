import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => 
({
  ...config,
  name: 'RIDO',
  slug: 'rido',
  version: '1.0.0',
  orientation: 'portrait',
  "icon": "./assets/logo.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#FAF8F3"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.rido.app",
      "googleServicesFile": "./GoogleService-Info.plist",
      "infoPlist": {
        "NSCameraUsageDescription": "RIDO needs your camera to capture checkpoint arrival photos for convoy verification.",
        "NSLocationWhenInUseUsageDescription": "RIDO uses your location to show your position on the shared convoy map and detect route deviations.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "RIDO needs background location to provide stray-corridor alerts and convoy safety checks even when the app is not in the foreground.",
        "NSLocationAlwaysUsageDescription": "Background location keeps convoy coordination active during long motorcycle tours.",
        "NSMicrophoneUsageDescription": "Required for speech synthesis playback during hands-free navigation alerts.",
        "NSSpeechSynthesizerUsageDescription": "RIDO speaks route guidance and safety alerts so you can keep your eyes on the road.",
        "NSPhotoLibraryAddUsageDescription": "RIDO saves checkpoint photos to your photo library.",
        "NSPhotoLibraryUsageDescription": "RIDO accesses your photo library to let you select check-in images.",
        "UIBackgroundModes": [
          "location",
          "processing",
          "audio"
        ],
        "UIViewControllerBasedStatusBarAppearance": false
      }
    },
    "android": {
      "googleServicesFile": "./google-services.json",
      "adaptiveIcon": {
        "foregroundImage": "./assets/logo.png",
        "backgroundColor": "#FAF8F3"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "package": "com.rido.app",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.INTERNET",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.SEND_SMS",
        "android.permission.RECEIVE_SMS",
        "android.permission.READ_SMS",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.RECORD_AUDIO"
      ]
    },
    "web": {
      "favicon": "./assets/icon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      "expo-task-manager",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "RIDO uses your location for convoy tracking and route deviation alerts.",
          "locationAlwaysPermission": "Background location keeps convoy coordination active during tours.",
          "locationWhenInUsePermission": "RIDO uses your location to show your position on the shared convoy map."
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "RIDO needs your camera to capture checkpoint arrival photos.",
          "microphonePermission": "Required for speech synthesis during navigation alerts."
        }
      ],
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#FAF8F3",
          "image": "./assets/icon.png",
          "imageWidth": 1
        }
      ],
      "expo-image-picker",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-google-signin/google-signin",

      [
        "@rnmapbox/maps",
        {
          "styleURL": "mapbox://styles/mapbox/streets-v12"
        }
      ],
      [
        './plugins/withMapbox',
        {
          downloadsToken: process.env.MAPBOX_DOWNLOADS_TOKEN,
        },
      ],
    

    ],
    "extra": {
      "mapboxAccessToken": process.env.mapboxAccessToken,
      "openWeatherApiKey": process.env.openWeatherApiKey,
      "geminiApiKey": process.env.geminiApiKey,
      "firebaseDatabaseUrl": process.env.firebaseDatabaseUrl,
      "googleWebClientId":process.env.googleWebClientId,
      "devMenuEnabled": process.env.devMenuEnabled,
      "router": {},
      "eas": {
        "projectId": "58ab5747-7795-4bf9-86f1-2c39709b2f38"
      }
    }
  });