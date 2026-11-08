// src/components/trip/SetLocationsSheet.tsx
import React, {useState} from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import { LocationInput } from './LocationInput';
import { LocationPoint, Stopover } from '../../types/trips';
import { getDirections } from '../../services/directionService';
import { updateTrip } from '../../services/tripService'; // ✅ Import updateTrip
import { useTripDraftStore } from '../../store/useTripDraftStore';
import { Colors } from '../../theme/colors';

// ... (Interface Props remains the same)
interface Props {
  meetingPoint: LocationPoint | null;
  endPoint: LocationPoint | null;
  stopovers: Omit<Stopover, 'id'>[];
  onSelectMeeting: () => void;
  onSelectDestination: () => void;
  onAddStopover: () => void;
  onSelectStopover: (index: number) => void; 
  onClearMeeting: () => void;
  onClearDestination: () => void;
  onRemoveStopover: (index: number) => void;
  onMoveLocation: (fromIndex: number, toIndex: number) => void;
  onBack: () => void;
  onCreate: () => void;
  loading: boolean;
}

export function SetLocationsSheet({
  meetingPoint,
  endPoint,
  stopovers,
  onSelectMeeting,
  onSelectDestination,
  onAddStopover,
  onSelectStopover,
  onClearMeeting,
  onClearDestination,
  onRemoveStopover,
  onMoveLocation,
  onBack,
  onCreate,
  loading,
}: Props) {
  const router = useRouter()
  const setLocations = useTripDraftStore((state) => state.setLocations);
  const setRouteData = useTripDraftStore((state) => state.setRouteData);
  const draft = useTripDraftStore(); // ✅ Get the full draft to access editingTripId
  
  const [isRouting, setIsRouting] = useState(false);

  // ✅ Check if we are in edit mode
  const isEditing = !!draft.editingTripId;

  const canCreate = !!meetingPoint && !!endPoint;
  const totalItems = stopovers.length + 2;
  const destinationIndex = totalItems - 1;

  const handleProceedToConfirmation = async () => {
    if (!meetingPoint || !endPoint) return;
    
    setIsRouting(true);

    try {
      // 1. Combine all points in order
      const orderedPoints = [meetingPoint, ...stopovers, endPoint];
      
      // 2. Fetch actual driving route from Mapbox
      const routeData = await getDirections(orderedPoints);

      if (isEditing) {
        // ✅ EDIT MODE: Save directly to Firebase and go back
        await updateTrip(draft.editingTripId!, {
          meetingPoint,
          endPoint,
          stopovers,
          routeGeometry: routeData?.geometry ? JSON.stringify(routeData.geometry) : null,
          routeLegDistances: routeData?.legDistances || [],
          totalDistance: routeData?.totalDistance || null,
        });
        
        const tripId = draft.editingTripId;
        draft.setEditingTripId(null); // Clear editing state
        router.replace(`/trip/${tripId}`); // Go back to details page
      } else {
        // ✅ CREATE MODE: Save to Zustand and go to Confirmation
        setLocations(meetingPoint, stopovers, endPoint);
        if (routeData) {
          setRouteData(routeData.geometry, routeData.legDistances, routeData.totalDistance, routeData.legDurations);
        }
        router.push('/trip-confirm'); 
      }

    } catch (error) {
      console.error("Failed to get route:", error);
    } finally {
      setIsRouting(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.handleBar} />

      <View style={styles.header}>
        <Text style={styles.title}>Set Locations</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
      style={{ flexShrink: 1 }} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always" 
      >
        <View style={styles.stopoverRow}>
          <View style={{ flex: 1 }}>
            <LocationInput
              label="Start/Meeting Point"
              value={meetingPoint?.name}
              placeholder="e.g., Robinsons Place"
              onPress={onSelectMeeting}
              onClear={onClearMeeting}
            />
          </View>
          <View style={styles.reorderColumn}>
            <TouchableOpacity 
              style={styles.reorderBtn} 
              disabled={stopovers.length === 0} 
              onPress={() => onMoveLocation(0, 1)}
            >
              <Feather name="chevron-down" size={20} color={stopovers.length === 0 ? Colors.muted : Colors.greenBtn} />
            </TouchableOpacity>
          </View>
        </View>

        {stopovers.map((stop, index) => (
          <View key={index} style={styles.stopoverRow}>
            <View style={{ flex: 1 }}>
              <LocationInput
                label={`Stopover ${String(index + 1).padStart(2, '0')}`}
                value={stop.name}
                placeholder="Tap to set location"
                onPress={() => onSelectStopover(index)}
                onClear={() => onRemoveStopover(index)}
              />
            </View>
            <View style={styles.reorderColumn}>
              <TouchableOpacity style={styles.reorderBtn} onPress={() => onMoveLocation(index + 1, index)}>
                <Feather name="chevron-up" size={20} color= {Colors.greenBtn} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.reorderBtn} onPress={() => onMoveLocation(index + 1, index + 2)}>
                <Feather name="chevron-down" size={20} color={Colors.greenBtn} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.stopoverRow}>
          <View style={{ flex: 1 }}>
            <LocationInput
              label="Destination"
              value={endPoint?.name}
              placeholder="e.g., Robinsons Place"
              onPress={onSelectDestination}
              onClear={onClearDestination}
            />
          </View>
          <View style={styles.reorderColumn}>
            <TouchableOpacity 
              style={styles.reorderBtn} 
              disabled={stopovers.length === 0}
              onPress={() => onMoveLocation(destinationIndex, destinationIndex - 1)}
            >
              <Feather name="chevron-up" size={20} color={stopovers.length === 0 ? Colors.muted : Colors.greenBtn} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.addStopBtn} onPress={onAddStopover}>
          <Text style={styles.addStopText}>+ Add Stopover</Text>
        </TouchableOpacity>

      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createBtn, (!canCreate|| isRouting) && styles.createBtnDisabled]}
          onPress={handleProceedToConfirmation}
          disabled={!canCreate || isRouting}
        >
         {isRouting ? (
            <ActivityIndicator color= {Colors.white} />
          ) : (
            /* ✅ CHANGE BUTTON TEXT BASED ON MODE */
            <Text style={styles.createBtnText}>
              {isEditing ? 'Confirm' : 'Create Trip'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.offWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexShrink: 1,
   // maxHeight: '70%',
    justifyContent: 'flex-end',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: Colors.muted,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: Colors.black 
  },
  back: {  
    fontSize: 15, 
     color: Colors.greenBtn,
     fontWeight: '600' 
    },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stopoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reorderColumn: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 14,
  },
  reorderBtn: {
    padding: 4,
  },
  addStopBtn: {
    borderWidth: 1.5,
    borderColor: Colors.greenBtn,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  addStopText: { 
    color: Colors.darkGreen, 
    fontWeight: '600', 
    fontSize: 15 
  },
  emptyState: {
    backgroundColor:Colors.white,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: Colors.muted, 
  },
  emptySub: { 
    fontSize: 13, 
    color: Colors.muted, 
    marginTop: 4, 
    textAlign: 'center' 
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24, 
    backgroundColor: Colors.offWhite,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  createBtn: {
    backgroundColor: Colors.greenBtn,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    height:56,
    justifyContent:'center',
  },
  createBtnDisabled: { 
    backgroundColor: Colors.lightGray 
  },
  createBtnText: { 
    color: Colors.white, 
    fontSize: 16, 
    fontWeight: '700' },
});