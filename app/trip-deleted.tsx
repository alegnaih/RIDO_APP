// app/trip-deleted.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../src/theme/colors';

export default function TripDeletedScreen() {
  const router = useRouter();
  const { title } = useLocalSearchParams<{ title?: string }>();

  return (
    <Pressable 
      style={styles.container} 
      onPress={() => router.replace('/(tabs)/my-trips')}
    >
      <MaterialCommunityIcons name="delete-outline" size={80} color={Colors.darkGreen} />
      
      <Text style={styles.title}>
        You have cancelled and deleted {title || 'the trip'}
      </Text>
      
      <Text style={styles.subtitle}>Tap anywhere to continue</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.black,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.muted,
  },
});