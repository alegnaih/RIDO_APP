// app/(tabs)/my-trips.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../src/hooks/useAuth';
import { Trip } from '../../src/types/trips';
import { Colors } from '../../src/theme/colors';

interface TripSection {
  title: string;
  data: Trip[];
}

export default function MyTripsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [sections, setSections] = useState<TripSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setSections([]);
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const q = query(collection(db, 'trips'), where('members', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ongoing: Trip[] = [];
      const upcoming: Trip[] = [];
      const completed: Trip[] = [];
      const now = new Date().getTime();

      snapshot.forEach((doc) => {
        const trip = { id: doc.id, ...doc.data() } as Trip;
        const tripDate = trip.scheduledAt?.toDate()?.getTime() || 0;

        if (trip.status === 'active') {
          ongoing.push(trip);
        } else if (trip.status === 'completed' || trip.status === 'cancelled') {
          completed.push(trip);
        } else if (trip.status === 'planned') {
          // If it's planned but the date has passed, you can choose to put it in completed or upcoming.
          // We'll keep it in upcoming for now unless the user explicitly ended it.
          upcoming.push(trip);
        }
      });

      // ✅ Sort Ongoing: Just by date
      ongoing.sort((a, b) => (a.scheduledAt?.toDate()?.getTime() || 0) - (b.scheduledAt?.toDate()?.getTime() || 0));

      // ✅ Sort Upcoming: Closest date first (Ascending)
      upcoming.sort((a, b) => (a.scheduledAt?.toDate()?.getTime() || 0) - (b.scheduledAt?.toDate()?.getTime() || 0));

      // ✅ Sort Completed: Most recent first (Descending)
      completed.sort((a, b) => (b.scheduledAt?.toDate()?.getTime() || 0) - (a.scheduledAt?.toDate()?.getTime() || 0));

      // Build sections, only adding them if they have data
      const newSections: TripSection[] = [];
      if (ongoing.length > 0) newSections.push({ title: 'Ongoing', data: ongoing });
      if (upcoming.length > 0) newSections.push({ title: 'Upcoming', data: upcoming });
      if (completed.length > 0) newSections.push({ title: 'Completed', data: completed });

      setSections(newSections);
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

  const isEmpty = sections.length === 0;

  return (
    <View style={styles.container}>
      {/* ✅ Use SectionList instead of ScrollView */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        stickySectionHeadersEnabled={false}
        
        // Header (Title + Add Button)
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Trips</Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleCreateTrip}>
              <Feather name="plus" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        }

        // Empty State
        ListEmptyComponent={
          isEmpty ? (
            <View style={styles.emptyState}>
              <Feather name="map" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No trips yet</Text>
              <Text style={styles.emptySub}>Create a trip to start riding with your convoy.</Text>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreateTrip}>
                <Text style={styles.createBtnText}>Create Trip</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }

        // Section Header (e.g., "ONGOING", "UPCOMING", "COMPLETED")
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}

        // Individual Trip Card
        renderItem={({ item: trip }) => {
          const startDate = trip.scheduledAt?.toDate() || new Date();
          const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const isLeader = trip.createdBy === user?.uid;

          return (
            <TouchableOpacity 
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
                
                {/* Show a status indicator if it's ongoing */}
                {trip.status === 'active' && (
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>Active</Text>
                  </View>
                )}
                
                <Feather name="chevron-right" size={20} color="#999" />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
  },
  content: {
    padding: 20,
    paddingBottom: 120, 
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
    backgroundColor: Colors.greenBtn,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  /* Section Headers */
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 12,
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  createBtn: {
    backgroundColor: Colors.greenBtn,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 24,
  },
  createBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },

  /* Trip Card */
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 12,
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
    color: Colors.greenBtn,
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
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  roleBadge: {
    backgroundColor: '#A5C3B5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  
  /* Active Status Badge */
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
    marginRight: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.greenBtn,
    marginRight: 6,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.greenBtn,
  },
});