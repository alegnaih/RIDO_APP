// app/(tabs)/my-trips.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../src/hooks/useAuth';
import { Trip } from '../../src/types/trips';
import { Colors } from '../../src/theme/colors';

export default function MyTripsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setTrips([]);
      setLoading(false);
      return;
    }

    const db = getFirestore();
    
    // ✅ Fetch all trips where the user is in the 'members' array
    const q = query(
      collection(db, 'trips'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTrips: Trip[] = [];
      snapshot.forEach((doc) => {
        fetchedTrips.push({ id: doc.id, ...doc.data() } as Trip);
      });

      // Sort by scheduled date (Newest first)
      fetchedTrips.sort((a, b) => {
        const dateA = a.scheduledAt?.toDate()?.getTime() || 0;
        const dateB = b.scheduledAt?.toDate()?.getTime() || 0;
        return dateB - dateA;
      });

      setTrips(fetchedTrips);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching trips:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleCreateTrip = () => {
    router.push('/create-trip');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.darkGreen} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Trips</Text>
          <TouchableOpacity style={styles.addBtn} onPress={handleCreateTrip}>
            <Feather name="plus" size={20} color={Colors.lightSurface} />
          </TouchableOpacity>
        </View>

        {/* Empty State */}
        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="map" size={48} color={Colors.muted} />
            <Text style={styles.emptyText}>No trips yet</Text>
            <Text style={styles.emptySub}>Create a trip to start riding with your convoy.</Text>
            <TouchableOpacity style={styles.createBtn} onPress={handleCreateTrip}>
              <Text style={styles.createBtnText}>Create Trip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Trips List */
          <View style={styles.tripList}>
            {trips.map((trip) => {
              const startDate = trip.scheduledAt?.toDate() || new Date();
              const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const isLeader = trip.createdBy === user?.uid;

              return (
                <TouchableOpacity 
                  key={trip.id} 
                  style={styles.tripCard}
                  onPress={() => router.push(`/trip/${trip.id}`)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.tripTitle}>{trip.title}</Text>
                    <Text style={styles.codeText}>#{trip.shareCode}</Text>
                  </View>
                  
                  <View style={styles.cardDetails}>
                    <Text style={styles.detailText}>
                      <Feather name="calendar" size={12} /> {dateStr} at {trip.startTime}
                    </Text>
                    <Text style={styles.detailText}>
                      <Feather name="users" size={12} /> {trip.memberCount || 1} Members
                    </Text>
                  </View>
                  
                  <View style={styles.cardFooter}>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleText}>{isLeader ? 'LEADER' : 'MEMBER'}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={Colors.muted} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:Colors.offWhite,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
  },
  content: {
    padding: 20,
    paddingBottom: 120, // Ensures the last card isn't hidden behind the floating tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.black,
  },
  addBtn: {
    backgroundColor: Colors.darkGreen,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  /* Empty State */
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.muted,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  createBtn: {
    backgroundColor: Colors.darkGreen,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 24,
  },
  createBtnText: {
    color: Colors.offWhite,
    fontWeight: '700',
    fontSize: 16,
  },

  /* Trip Card */
  tripList: {
    gap: 16,
  },
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
    flex: 1,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.darkGreen,
    backgroundColor: Colors.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardDetails: {
    gap: 6,
    marginBottom: 16,
  },
  detailText: {
    fontSize: 13,
    color: Colors.muted,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: 12,
  },
  roleBadge: {
    backgroundColor: Colors.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 25,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.darkGreen,
  },
});