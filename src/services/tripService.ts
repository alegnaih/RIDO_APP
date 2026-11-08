// src/services/tripService.ts
import {addDoc, collection, getDoc, getFirestore, serverTimestamp, Timestamp, updateDoc, doc,
arrayUnion, increment, query, where, getDocs} from '@react-native-firebase/firestore';
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

export async function joinTripByCode(shareCode: string): Promise<Trip> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('You must be logged in to join a trip.');
   // 1. Find the trip with this share code
  const q = query(tripsRef, where('shareCode', '==', shareCode.toUpperCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Invalid trip code. Please check and try again.');
  }

  const tripDoc = snapshot.docs[0];
  const tripData = tripDoc.data() as Trip;

  // 2. Check if the user is already a member
  if (tripData.members.includes(user.uid)) {
    throw new Error('You are already a member of this trip.');
  }

  // 3. Add the user to the members array and increment the count
  await updateDoc(doc(getFirestore(), 'trips', tripDoc.id), {
    members: arrayUnion(user.uid),
    memberCount: increment(1),
  });

  return { ...tripData, id: tripDoc.id };
}