import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/hooks/useAuth';
import { Colors } from '../src/theme';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = 'rido_has_seen_onboarding';

const PAGES = [
  {
    id: '1',
    title: 'Plan Your Routes',
    description: 'Create routes, set destinations, and\ntravel with confidence.',
    // Replace with your real image later
    image: require('../assets/onboarding_first.jpeg'),
  },
  {
    id: '2',
    title: 'Create a Convoy',
    description: 'Invite and manage your riding\ngroup easily.',
    image: require('../assets/onboarding_second.png'),
  },
  {
    id: '3',
    title: 'Stay Connected',
    description: 'Track your entire convoy in real-time\nand never ride alone.',
    image: require('../assets/onboarding_third.png'),
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const goNext = async () => {
    if (currentIndex < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      return;
    }

    // Last page → finish onboarding
    if (dontShowAgain) {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    }

    if (isAuthenticated) {
      router.replace('/(tabs)/map');
    } else {
      router.replace('/(auth)/login');
    }
  };

  const renderItem = ({ item }: { item: (typeof PAGES)[0] }) => (
    <View style={styles.page}>
      <Image source={item.image} style={styles.image} resizeMode="cover" />

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={PAGES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Don't show again (only on last page) */}
      {currentIndex === PAGES.length - 1 && (
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setDontShowAgain(!dontShowAgain)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
            {dontShowAgain && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Don't show again</Text>
        </TouchableOpacity>
      )}

      {/* Next / Get Started button */}
      <TouchableOpacity style={styles.button} onPress={goNext} activeOpacity={0.85}>
        <Text style={styles.buttonText}>
          {currentIndex === PAGES.length - 1 ? 'GET STARTED' : 'NEXT'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  page: {
    width,
    alignItems: 'center',
    paddingTop: height * 0.12,
    paddingHorizontal: 32,
  },
  image: {
    width: 307,
    height: 315,
    borderRadius: 30,
    backgroundColor: Colors.lightGray,
  },
  title: {
    marginTop: 40,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.black,
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.black,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: Colors.darkGreen,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.lightGray,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: Colors.darkGreen,
  },
  checkmark: {
    color: Colors.offWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 15,
    color: Colors.black,
  },
  button: {
    marginHorizontal: 36,
    marginTop: 28,
    marginBottom: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.offWhite,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});