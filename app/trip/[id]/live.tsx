
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../src/theme/colors';

export default function SharedLiveMapScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Feather
        name="map"
        size={64}
        color={Colors.darkGreen}
      />

      <Text style={styles.title}>
        Shared Live Map Route
      </Text>

      <Text style={styles.subtitle}>
        Real-time convoy tracking and shared rider
        locations are currently under development.
      </Text>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>
          Back to Trip Details
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.black,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: Colors.darkGreen,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
