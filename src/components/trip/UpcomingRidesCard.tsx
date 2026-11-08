import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { RoadCard } from '../ui/RoadCard';

interface UpcomingRidesCardProps {
  style?: ViewStyle;
}

export function UpcomingRidesCard({ style }: UpcomingRidesCardProps) {
  const [ride] = React.useState<{
    id: string;
    name: string;
    date: string;
    time: string;
    destination: string;
    riders: number;
  } | null>(null);

  return (
    <TouchableOpacity
      style={[styles.cardWrapper, style]}
      hitSlop={8}
      onPress={() => {
        // Navigate to ride details (Phase 2)
      }}
    >
      <RoadCard title="UPCOMING RIDE">
        {ride ? (
          <View style={styles.rideContent}>
            <Text style={styles.rideName}>{ride.name}</Text>
            <View style={styles.rideDetails}>
              <Text style={styles.rideDate}>{ride.date} • {ride.time}</Text>
              <Text style={styles.rideDestination}>→ {ride.destination}</Text>
              <Text style={styles.rideRiders}>{ride.riders} riders</Text>
            </View>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No upcoming rides yet</Text>
            <Text style={styles.placeholderSubtext}>Create a trip to get started</Text>
          </View>
        )}
      </RoadCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
  },
  rideContent: {
    gap: 6,
  },
  rideName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.offWhite,
  },
  rideDetails: {
    gap: 4,
  },
  rideDate: {
    fontSize: 14,
    color: Colors.mediumGray,
  },
  rideDestination: {
    fontSize: 14,
    color: Colors.offWhite,
    fontWeight: '500',
  },
  rideRiders: {
    fontSize: 12,
    color: Colors.mediumGray,
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  placeholderText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.mediumGray,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: Colors.mediumGray,
    marginTop: 4,
    opacity: 0.7,
  },
});
