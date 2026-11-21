// #app/_layout.tsx
import { getAuth } from '@react-native-firebase/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; 
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MapboxGL from '@rnmapbox/maps';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/hooks/useAuth';
import { config } from '../src/constants/config';
import {syncServerTime } from '../src/utils/time';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import { LogBox } from 'react-native';

// Ignore all log notifications (temporary for development)
LogBox.ignoreAllLogs();
SplashScreen.preventAutoHideAsync().catch(() => {});

// Set once for the whole process — no component needs to repeat this.
const rawToken = config.mapboxAccessToken || process.env.mapboxAccessToken;
const token = rawToken?.trim()

if (token) 
{
  MapboxGL.setAccessToken(token);
} else {
  console.warn("MAPBOX TOKEN IS MISSING! Check your .env file.");
}


export default function RootLayout() {
  const { initialize } = useAuth();
  useEffect(() => {
    syncServerTime(); 
  }, []);

  useEffect(() => initialize(), [initialize]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ThemeProvider>
        <BottomSheetModalProvider> 
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="index" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />

          <Stack.Screen name="settings/index" />
          <Stack.Screen name="settings/logout-confirm" 
          options={{headerShown: false, animation: 'slide_from_right'}} />
          <Stack.Screen name="create-trip" 
            options={{presentation: 'fullScreenModal',animation: 'slide_from_bottom' }} 
          />
        </Stack>
        </BottomSheetModalProvider>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
