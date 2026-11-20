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
  arrayUnion,
  arrayRemove,
  increment,
  query,
  where,
  getDocs,
  deleteDoc,
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { Trip, LocationPoint, Stopover } from '../types/trips'; 
import { generateShareCode } from '../utils/shareCode';
import { getTrustedDate } from '../utils/time';

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
    createdByName: payload.creatorName || user.displayName || 'Leader',
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
    maxMembers: 150,
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
    updatedAt: serverTimestamp(),
  });
}

export async function joinTripByCode(shareCode: string): Promise<Trip> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('You must be logged in to join a trip.');
  
  const q = query(tripsRef, where('shareCode', '==', shareCode.toUpperCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Invalid trip code. Please check and try again.');
  }

  const tripDoc = snapshot.docs[0];
  const tripData = tripDoc.data() as Trip;

  if (tripData.scheduledAt) {
    const scheduledDate = tripData.scheduledAt.toDate();
    const now = getTrustedDate();
    
    const diffMs = scheduledDate.getTime() - now.getTime();
    const diffMins = diffMs / (1000 * 60);

    if (diffMins <= 0) {
      throw new Error('Unfortunately, the trip has already ended.');
    }
    if (diffMins <= 15) {
      throw new Error('Unfortunately, the trip is officially closed. The cut-off time is 15 minutes before departure.');
    }
  }

  if (tripData.memberCount >= tripData.maxMembers) {
    throw new Error('This trip is already full.');
  }

  if (tripData.members.includes(user.uid)) {
    throw new Error('You are already a member of this trip.');
  }

  if (tripData.scheduledAt) {
    const userTripsQuery = query(tripsRef, where('members', 'array-contains', user.uid));
    const userTripsSnapshot = await getDocs(userTripsQuery);
    
    const newTripTime = tripData.scheduledAt.toDate().getTime();
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000; 

    for (const doc of userTripsSnapshot.docs) {
      if (doc.id === tripDoc.id) continue; 
      
      const existingTrip = doc.data() as Trip;
      if (existingTrip.status === 'completed' || existingTrip.status === 'cancelled') continue;

      if (existingTrip.scheduledAt) {
        const existingTripTime = existingTrip.scheduledAt.toDate().getTime();
        const timeDifference = Math.abs(newTripTime - existingTripTime);

        if (timeDifference < SIX_HOURS_MS) {
          throw new Error('SCHEDULE_CLASH');
        }
      }
    }
  }

  await updateDoc(doc(getFirestore(), 'trips', tripDoc.id), {
    members: arrayUnion(user.uid),
    memberCount: increment(1),
  });

  return { ...tripData, id: tripDoc.id };
}

export async function deleteTrip(tripId: string): Promise<void> {
  const db = getFirestore();
  await deleteDoc(doc(db, 'trips', tripId));
}

export async function leaveTrip(tripId: string, userId: string): Promise<void> {
  const db = getFirestore();
  const tripRef = doc(db, 'trips', tripId);

  await updateDoc(tripRef, {
    members: arrayRemove(userId),
    memberCount: increment(-1),
  });
}

// ✅ NEW: Transfer Leadership
export async function transferLeadership(tripId: string, newLeaderId: string, newLeaderName: string): Promise<void> {
  const db = getFirestore();
  const tripRef = doc(db, 'trips', tripId);

  await updateDoc(tripRef, {
    createdBy: newLeaderId,
    createdByName: newLeaderName,
    updatedAt: serverTimestamp(),
  });
}