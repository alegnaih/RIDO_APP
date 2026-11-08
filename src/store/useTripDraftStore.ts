// src/store/useTripDraftStore.ts
import { create } from 'zustand';
import { LocationPoint, Stopover } from '../types/trips';

interface TripDraft {
  // Core Details
  title: string;
  date: Date | null;
  startTime: string;
  description: string;
  strayThreshold: number;
  editingTripId: string | null;
  
  // Locations
  meetingPoint: LocationPoint | null;
  endPoint: LocationPoint | null;
  stopovers: Omit<Stopover, 'id'>[];
  
  // ✅ Calculated Route Data
  routeGeometry: any | null;
  routeLegDistances: string[];
  routeLegDurations: number[];
  totalDistance: string | null;

  // Actions
  setEditingTripId: (id: string | null) => void; 
  setDetails: (title: string, date: Date | null, startTime: string) => void;
  setDescription: (desc: string) => void;
  setStrayThreshold: (val: number) => void;
  setLocations: (meeting: LocationPoint, stops: Omit<Stopover, 'id'>[], end: LocationPoint) => void; 
  setRouteData: (geometry: any, distances: string[], total: string, durations: number[]) => void; 
  resetDraft: () => void; // ✅ ADDED THIS LINE
}

const initialState = {
  editingTripId: null,
  title: '',
  date: null,
  startTime: '',
  description: '',
  meetingPoint: null,
  endPoint: null,
  strayThreshold: 50,
  stopovers: [],
  routeGeometry: null,
  routeLegDistances: [],
  routeLegDurations: [],
  totalDistance: null,
};

export const useTripDraftStore = create<TripDraft>((set) => ({
  ...initialState,
  setEditingTripId: (editingTripId) => set({ editingTripId }),
  setDetails: (title, date, startTime) => set({ title, date, startTime }),
  setDescription: (description) => set({ description }),
  setStrayThreshold: (strayThreshold) => set({ strayThreshold }), 
  setLocations: (meetingPoint, stopovers, endPoint) => set({ meetingPoint, stopovers, endPoint }),
  setRouteData: (routeGeometry, routeLegDistances, totalDistance, routeLegDurations) => set({ routeGeometry, routeLegDistances, totalDistance, routeLegDurations }),
  
  resetDraft: () => set(initialState), // ✅ ADDED THIS LINE
}));