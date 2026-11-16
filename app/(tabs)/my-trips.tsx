// app/(tabs)/my-trips.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SectionList, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../src/hooks/useAuth';
import { Trip } from '../../src/types/trips';
import { Colors } from '../../src/theme/colors';
import { getTrustedTime, isTimeSynced } from '../../src/utils/time';
import { deleteTrip } from '../../src/services/tripService';

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
  const [isSyncReady, setIsSyncReady] = useState(isTimeSynced());

  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isSyncReady) return;
    const interval = setInterval(() => {
      if (isTimeSynced()) {
        setIsSyncReady(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isSyncReady]);

  useEffect(() => {
    if (!user?.uid) return;
    if (!isSyncReady) return; 

    const db = getFirestore();
    const q = query(collection(db, 'trips'), where('members', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ongoing: Trip[] = [];
      const upcoming: Trip[] = [];
      const completed: Trip[] = [];
      const now = getTrustedTime();

      snapshot.forEach((doc) => {
        const trip = { id: doc.id, ...doc.data() } as Trip;
        const tripDate = trip.scheduledAt?.toDate()?.getTime() || 0;

        if (trip.status === 'active') {
          ongoing.push(trip);
        } else if (trip.status === 'completed' || trip.status === 'cancelled') {
          completed.push(trip);
        } else if (trip.status === 'planned' || !trip.status) {
          if (tripDate < now) completed.push(trip);
          else upcoming.push(trip);
        }
      });

      ongoing.sort((a, b) => (a.scheduledAt?.toDate()?.getTime() || 0) - (b.scheduledAt?.toDate()?.getTime() || 0));
      upcoming.sort((a, b) => (a.scheduledAt?.toDate()?.getTime() || 0) - (b.scheduledAt?.toDate()?.getTime() || 0));
      completed.sort((a, b) => (b.scheduledAt?.toDate()?.getTime() || 0) - (a.scheduledAt?.toDate()?.getTime() || 0));

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
  }, [user?.uid, isSyncReady]);

  const handleDeleteConfirm = async () => {
    if (!tripToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTrip(tripToDelete.id);
      setTripToDelete(null);
      router.push({
        pathname: '/trip-deleted',
        params: { title: tripToDelete.title }
      });
    } catch (error) {
      console.error("Failed to delete trip", error);
      setIsDeleting(false);
    }
  };

  const handleCreateTrip = () => {
    router.push('/create-trip');
  };

  if (loading || !isSyncReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.darkGreen} />
      </View>
    );
  }

  const isEmpty = sections.length === 0;

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        stickySectionHeadersEnabled={false}
        
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Trips</Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleCreateTrip}>
              <Feather name="plus" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        }

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

        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}

        renderItem={({ item: trip }) => {
          const startDate = trip.scheduledAt?.toDate() || new Date();
          const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const isLeader = trip.createdBy === user?.uid;
          
          const canDelete = isLeader && trip.status === 'planned' && startDate.getTime() > getTrustedTime();

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
                 <View style={[styles.roleBadge, isLeader && styles.roleBadgeLeader]}>
                  <Text style={styles.roleText}>{isLeader ? 'LEADER' : 'MEMBER'}</Text>
              </View>

                <View style={styles.rightActions}>
                  {trip.status === 'active' && (
                    <View style={styles.activeBadge}>
                      <View style={styles.activeDot} />
                      <Text style={styles.activeText}>Active</Text>
                    </View>
                  )}
                  
                  {canDelete && (
                    <TouchableOpacity 
                      style={styles.deleteBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setTripToDelete(trip);
                      }}
                    >
                      <Feather name="trash-2" size={18} color={Colors.errorRed} />
                    </TouchableOpacity>
                  )}

                  <Feather name="chevron-right" size={20} color="#999" />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={!!tripToDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="delete-outline" size={40} color={Colors.darkGreen} style={{ marginBottom: 12 }} />
            
            <Text style={styles.modalTitle}>Are you sure you want to leave this trip?</Text>
            <Text style={styles.modalSubtitle}>
              You cannot recover this, and all members will be notified that you have cancelled this trip.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setTripToDelete(null)}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>No</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalDeleteBtn} 
                onPress={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 12,
  },
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
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    backgroundColor: Colors.lightGreen,
    color:Colors.black,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

   roleBadgeLeader: {
    backgroundColor: Colors.greenBtn, // Darker green for leaders
  },
  
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: Colors.offWhite,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.muted,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: Colors.greenBtn,
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});