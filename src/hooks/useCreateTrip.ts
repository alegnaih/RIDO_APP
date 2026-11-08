// src/hooks/useCreateTrip.ts
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LocationPoint, Stopover } from '../types/trips';
import { useTripDraftStore } from '../store/useTripDraftStore';

export type SheetMode = 'details' | 'locations';

// ✅ FIXED: Renamed function to useCreateTrip
export function useCreateTrip(initialMode: SheetMode = 'details') {
  const router = useRouter();
  const draft = useTripDraftStore();

  // ✅ FIXED: Use initialMode here so it starts on locations if requested
  const [sheetMode, setSheetMode] = useState<SheetMode>(initialMode);
  const [loading, setLoading] = useState(false);

  // Details (read from Zustand)
  const title = draft.title;
  const setTitle = (val: string) => draft.setDetails(val, draft.date, draft.startTime);
  
  const date = draft.date;
  const setDate = (val: Date | null)   => 
  { let timeString = draft.startTime;
    if (val) {
      timeString = val.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    draft.setDetails(draft.title, val, draft.startTime);
  };

  const startTime = draft.startTime;
  const setStartTime = (val: string) => draft.setDetails(draft.title, draft.date, val);

  // Locations (Local State for fast map updates)
  const [meetingPoint, setMeetingPoint] = useState<LocationPoint | null>(draft.meetingPoint);
  const [endPoint, setEndPoint] = useState<LocationPoint | null>(draft.endPoint);
  const [stopovers, setStopovers] = useState<Omit<Stopover, 'id'>[]>(draft.stopovers);

  const [activeField, setActiveField] = useState<'meeting' | 'destination' | 'stopover' | null>(null);
  const [activeStopoverIndex, setActiveStopoverIndex] = useState<number | null>(null);

  const goToLocations = () => {
    if (!title.trim()) {
      Alert.alert('Missing name', 'Please enter a trip name first');
      return;
    }
    if (!date || !startTime) {
      Alert.alert('Missing schedule', 'Please select a date and start time for your trip');
      return;
    }
    setSheetMode('locations');
  };

  const addEmptyStopover = () => {
    const newIndex = stopovers.length;
    setStopovers((prev) => [
      ...prev, 
      { name: '', location: { latitude: 0, longitude: 0 }, order: newIndex, isFromSearch: false }
    ]);
    setActiveField('stopover');
    setActiveStopoverIndex(newIndex); 
  };

  const updateStopover = (point: LocationPoint) => {
    if (activeStopoverIndex === null) return;
    setStopovers((prev) => {
      const newStops = [...prev];
      newStops[activeStopoverIndex] = { ...point, order: activeStopoverIndex };
      return newStops;
    });
    setActiveField(null);
    setActiveStopoverIndex(null);
  };

  const editStopover = (index: number) => {
    setActiveStopoverIndex(index);
    setActiveField('stopover');
  };

  const addStopover = (point: LocationPoint) => {
    setStopovers((prev) => [...prev, { ...point, order: prev.length }]);
  };

  const removeStopover = (index: number) => {
    setStopovers((prev) => prev.filter((_, i) => i !== index));
  };

  const moveLocation = (fromIndex: number, toIndex: number) => {
    const currentRoute = [
      meetingPoint || { name: '', location: { latitude: 0, longitude: 0 } }, 
      ...stopovers, 
      endPoint || { name: '', location: { latitude: 0, longitude: 0 } }
    ];
    
    if (toIndex < 0 || toIndex >= currentRoute.length) return;

    const newRoute = [...currentRoute];
    const [moved] = newRoute.splice(fromIndex, 1);
    newRoute.splice(toIndex, 0, moved);

    setMeetingPoint(newRoute[0].name ? newRoute[0] : null);
    setEndPoint(newRoute[newRoute.length - 1].name ? newRoute[newRoute.length - 1] : null);
    setStopovers(newRoute.slice(1, -1).map((item, idx) => ({ ...item, order: idx })));
  };

  const handleCreate = useCallback(() => {
    if (!meetingPoint || !endPoint) {
      Alert.alert('Missing locations', 'Start/Meeting Point and Destination are required');
      return;
    }
    
    // ✅ Save the final locations to Zustand so the Confirmation page can read them
    draft.setLocations(meetingPoint, stopovers, endPoint);
    
    // ✅ Navigate to Confirmation Page (NO Firebase creation here anymore)
    router.push('/trip-confirm');
  }, [meetingPoint, stopovers, endPoint, draft, router]); 

  return {
    sheetMode, setSheetMode,
    loading,
    title, setTitle,
    date, setDate,
    startTime, setStartTime,
    meetingPoint, setMeetingPoint,
    endPoint, setEndPoint,
    stopovers, setStopovers,
    activeField, setActiveField,
    activeStopoverIndex,
    goToLocations,
    addEmptyStopover,
    updateStopover,  
    editStopover,   
    addStopover,
    removeStopover,
    handleCreate,
    moveLocation,
  };
}