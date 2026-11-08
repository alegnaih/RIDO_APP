// src/services/tripService.ts
import {
  addDoc,
  collection,
  getDoc,
  getFirestore,
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { Trip, LocationPoint, Stopover } from '../types/trips'; 
import { generateShareCode } from '../utils/shareCode';

const tripsRef = collection(getFirestore(), 'trips');

export interface CreateTripPayload {
  title: string;
  scheduledAt: Date | null;
  startTime?: string;
  meetingPoint: LocationPoint;
  endPoint: LocationPoint;
  stopovers: Omit<Stopover, 'id'>[];
  strayThreshold: number;
  description?: string | null;      
  routeGeometry?: any | null;      
  totalDistance?: string | null;   
  routeLegDistances?: string[] | null;
  routeLegDurations?: number[] | null;
  creatorName?: string | null; 
}

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const shareCode = generateShareCode();
  const now = serverTimestamp();

  const stopovers: Stopover[] = payload.stopovers.map((s, idx) => ({
    id: `${Date.now()}-${idx}`,
    name: s.name,
    location: s.location,
    order: idx,
    isFromSearch: s.isFromSearch ?? false,
  }));

  
  const docRef = await addDoc(tripsRef, {
    shareCode,
    title: payload.title.trim(),
    description: payload.description || '',
    createdBy: user.uid,
    createdByName: payload.creatorName || user.displayName || 'Leader', // ✅ Use it here
    createdAt: now,
    updatedAt: now,
    status: 'planned',
    scheduledAt: payload.scheduledAt
      ? Timestamp.fromDate(payload.scheduledAt)
      : null,
    startTime: payload.startTime || null,
    meetingPoint: payload.meetingPoint,
    startPoint: payload.meetingPoint,          
    endPoint: payload.endPoint,
    stopovers,
    members: [user.uid],
    memberCount: 1,
    maxMembers: 20,
    isPublic: true,
    strayThreshold: payload.strayThreshold || 50,
    routeGeometry: payload.routeGeometry ? JSON.stringify(payload.routeGeometry) : null,
    totalDistance: payload.totalDistance || null, 
    routeLegDistances: payload.routeLegDistances || [],
    routeLegDurations: payload.routeLegDurations || [],
  });

  const inviteLink = `https://rido.app/join/${shareCode}`;
  await updateDoc(docRef, { inviteLink });

  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() } as Trip;
}

export async function updateTrip(tripId: string, updates: Record<string, any>): Promise<void> {
  const db = getFirestore();
  await updateDoc(doc(db, 'trips', tripId), {
    ...updates,
    updatedAt: serverTimestamp(), // Use serverTimestamp for consistency
  });
}