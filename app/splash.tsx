import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Image, Dimensions, View, Text, TouchableOpacity } from 'react-native';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../src/hooks/useAuth';
import { Colors } from '../src/theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

/** Keeps the brand mark on screen long enough to register, without delaying real work. */
const { width, height } = Dimensions.get('window');
const MINIMUM_SPLASH_DURATION_MS = 3000;
const ONBOARDING_KEY = 'rido_has_seen_onboarding';

export default function Splash() {
  const { isLoading, isAuthenticated } = useAuth();
  const [hasMinimumElapsed, setHasMinimumElapsed] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setHasMinimumElapsed(true), MINIMUM_SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      AsyncStorage.getItem('rido_has_seen_onboarding').then((value) => {
        setHasSeenOnboarding(value === 'true');
      });
  }, []);

  useEffect(() => {
    if (isImageReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isImageReady]);

  // `isLoading` clears as soon as Firebase reports state, or after the watchdog
  // in useAuth fires, so this screen can never hang.
  const isReadyToRoute = !isLoading && hasMinimumElapsed;
  
  const canRedirect =
  !isLoading && hasMinimumElapsed && isImageReady && hasSeenOnboarding !== null;

  if (!canRedirect) {
    return (
      <View style={styles.container}>
        <Image
          source={require('../assets/splash-bg.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
          onLoadEnd={() => setIsImageReady(true)}
        />
        <ActivityIndicator size="large" color={Colors.darkGreen} style={styles.spinner} />
      </View>
    );
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/map" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
 
}

const styles = StyleSheet.create
({
  container: 
  {
    flex: 1,
    backgroundColor: Colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backgroundImage: 
  {
    position: 'absolute', 
    top: 0,
    left: 0,
    width: width,
    height: height,       
  },

  textContainer: 
  {

    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    width:330,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center', 
    backgroundColor: Colors.darkGreen,
    marginTop: 10,
  }, 

  text: 
  {
    color: Colors.offWhite, 
    fontSize: 20,
    fontWeight: 'bold',
  },

  spinner: 
  {
    marginTop: 40,
  },
});
