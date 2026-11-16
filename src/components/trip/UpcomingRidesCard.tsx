// src/components/trip/UpcomingRidesCard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { Trip } from '../../types/trips';
import { Colors } from '../../theme/colors';
import { getTrustedTime } from '../../utils/time';
import { BlurView}  from 'expo-blur';

export function UpcomingRidesCard() {
  const router = useRouter();
  const { user } = useAuth();
  const [upcomingTrip, setUpcomingTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const db = getFirestore();
    const q = query(
      collection(db, 'trips'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = getTrustedTime();
      const validUpcomingTrips: Trip[] = [];

      snapshot.forEach((doc) => {
        const trip = { id: doc.id, ...doc.data() } as Trip;
        const tripDate = trip.scheduledAt?.toDate()?.getTime() || 0;

        // Only include trips that are planned and haven't started yet
        if (trip.status === 'planned' && tripDate > now) {
          validUpcomingTrips.push(trip);
        }
      });

      // Sort by closest date first
      validUpcomingTrips.sort((a, b) => {
        const dateA = a.scheduledAt?.toDate()?.getTime() || 0;
        const dateB = b.scheduledAt?.toDate()?.getTime() || 0;
        return dateA - dateB;
      });

      // Take the very first one (the most upcoming)
      setUpcomingTrip(validUpcomingTrips[0] || null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Colors.greenBtn} />
      </View>
    );
  }

  return (
 <BlurView intensity={90} tint="light" style={styles.container}>      {/* Header Row */}
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming Rides</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/my-trips')}>
          <Text style={styles.viewAllText}>View all</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Most upcoming ride</Text>

      {/* Trip Details or Empty State */}
      {upcomingTrip ? (
        <TouchableOpacity 
          style={styles.tripRow}
          onPress={() => router.push(`/trip/${upcomingTrip.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.iconCircle}>
            <FontAwesome5 name="motorcycle" size={20} color={Colors.black} />
          </View>
          
          <View style={styles.tripInfo}>
            <Text style={styles.tripName} numberOfLines={1}>{upcomingTrip.title}</Text>
            <Text style={styles.tripDate}>
              {upcomingTrip.scheduledAt?.toDate().toLocaleDateString('en-US', { 
                month: 'long', day: 'numeric', year: 'numeric' 
              })} {upcomingTrip.startTime}
            </Text>
          </View>

          <Feather name="chevron-right" size={24} color={Colors.muted} />
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>No upcoming rides yet</Text>
        </View>
      )}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
  //  backgroundColor:'rgba(222, 245, 213, 0.58)' ,
    overflow:'hidden',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(180, 177, 177, 0.46)',
    padding: 16,
   //  shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.1,
    // shadowRadius: 8,
    // elevation: 4,
    minHeight: 120,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkGreen,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.black,
  },
  subtitle: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.black,
    marginBottom: 16,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.77)',
    borderRadius: 15,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  //  backgroundColor: Colors.transparent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 2,
  },
  tripDate: {
    fontSize: 13,
    color: Colors.black,
  },
  emptyRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.black,
    fontStyle: 'italic',
  }
});