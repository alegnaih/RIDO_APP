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
  query,
  where,
  getDocs,
  deleteDoc,
  runTransaction,
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


export async function joinTripByCode(
  shareCode: string
): Promise<Trip> {
  const user = getAuth().currentUser;

  if (!user) {
    throw new Error('You must be logged in to join a trip.');
  }

  const db = getFirestore();

  const q = query(
    tripsRef,
    where('shareCode', '==', shareCode.toUpperCase())
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error(
      'Invalid trip code. Please check and try again.'
    );
  }

  const tripDoc = snapshot.docs[0];
  const tripRef = doc(db, 'trips', tripDoc.id);

  // Preserve RIDO's existing six-hour schedule clash rule.
  // This is a preliminary check. It is not an atomic
  // guarantee across multiple different trip documents.
  const initialTrip = tripDoc.data() as Trip;

  if (initialTrip.scheduledAt) {
    const userTripsQuery = query(
      tripsRef,
      where('members', 'array-contains', user.uid)
    );

    const userTripsSnapshot = await getDocs(userTripsQuery);
    const newTripTime =
      initialTrip.scheduledAt.toDate().getTime();

    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

    for (const existingDoc of userTripsSnapshot.docs) {
      if (existingDoc.id === tripDoc.id) continue;

      const existingTrip = existingDoc.data() as Trip;

      if (
        existingTrip.status === 'completed' ||
        existingTrip.status === 'cancelled'
      ) {
        continue;
      }

      if (existingTrip.scheduledAt) {
        const existingTripTime =
          existingTrip.scheduledAt.toDate().getTime();

        if (
          Math.abs(newTripTime - existingTripTime) <
          SIX_HOURS_MS
        ) {
          throw new Error('SCHEDULE_CLASH');
        }
      }
    }
  }

  // Membership checks and updates happen atomically.
  return runTransaction(db, async (transaction) => {
    const tripSnapshot = await transaction.get(tripRef);

    if (!tripSnapshot.exists()) {
      throw new Error('This trip no longer exists.');
    }

    const tripData = tripSnapshot.data() as Trip;

    const members: string[] = Array.isArray(tripData.members)
      ? tripData.members
      : [];

    if (members.includes(user.uid)) {
      throw new Error(
        'You are already a member of this trip.'
      );
    }

    if (
      tripData.status === 'completed' ||
      tripData.status === 'cancelled'
    ) {
      throw new Error('This trip is already closed.');
    }

    if (tripData.scheduledAt) {
      const scheduledDate =
        tripData.scheduledAt.toDate();

      const diffMins =
        (scheduledDate.getTime() -
          getTrustedDate().getTime()) / 60000;

      if (diffMins <= 0) {
        throw new Error(
          'Unfortunately, the trip has already ended.'
        );
      }

      if (diffMins <= 15) {
        throw new Error(
          'Unfortunately, the trip is officially closed. The cut-off time is 15 minutes before departure.'
        );
      }
    }

    const maxMembers =
      typeof tripData.maxMembers === 'number'
        ? tripData.maxMembers
        : 150;

    if (members.length >= maxMembers) {
      throw new Error('This trip is already full.');
    }

    const updatedMembers = [...members, user.uid];

    transaction.update(tripRef, {
      members: updatedMembers,
      memberCount: updatedMembers.length,
      updatedAt: serverTimestamp(),
    });

    return {
      ...tripData,
      id: tripDoc.id,
      members: updatedMembers,
      memberCount: updatedMembers.length,
    };
  });
}

export async function deleteTrip(tripId: string): Promise<void> {
  const db = getFirestore();
  await deleteDoc(doc(db, 'trips', tripId));
}


export async function leaveTrip(
  tripId: string,
  userId: string
): Promise<void> {
  const authUser = getAuth().currentUser;

  if (!authUser || authUser.uid !== userId) {
    throw new Error(
      'You can only leave a trip using your own account.'
    );
  }

  const db = getFirestore();
  const tripRef = doc(db, 'trips', tripId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(tripRef);

    if (!snapshot.exists()) {
      throw new Error('Trip not found.');
    }

    const tripData = snapshot.data() as Trip;
    const members: string[] = Array.isArray(tripData.members)
      ? tripData.members
      : [];

    if (!members.includes(userId)) {
      throw new Error(
        'You are no longer a member of this trip.'
      );
    }

    // A leader must transfer leadership first.
    if (tripData.createdBy === userId) {
      throw new Error(
        'Transfer leadership to another member before leaving.'
      );
    }

    const updatedMembers = members.filter(
      (memberId) => memberId !== userId
    );

    transaction.update(tripRef, {
      members: updatedMembers,
      memberCount: updatedMembers.length,
      updatedAt: serverTimestamp(),
    });
  });
}



export async function transferLeadership(
  tripId: string,
  newLeaderId: string,
  newLeaderName: string
): Promise<void> {
  const authUser = getAuth().currentUser;

  if (!authUser) {
    throw new Error(
      'You must be logged in to transfer leadership.'
    );
  }

  const db = getFirestore();
  const tripRef = doc(db, 'trips', tripId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(tripRef);

    if (!snapshot.exists()) {
      throw new Error('Trip not found.');
    }

    const tripData = snapshot.data() as Trip;
    const members: string[] = Array.isArray(tripData.members)
      ? tripData.members
      : [];

    if (tripData.createdBy !== authUser.uid) {
      throw new Error(
        'Only the current leader can transfer leadership.'
      );
    }

    if (newLeaderId === authUser.uid) {
      throw new Error(
        'Select another member as the new leader.'
      );
    }

    if (!members.includes(newLeaderId)) {
      throw new Error(
        'The selected rider is no longer a trip member.'
      );
    }

    transaction.update(tripRef, {
      createdBy: newLeaderId,
      createdByName: newLeaderName,
      memberCount: members.length,
      updatedAt: serverTimestamp(),
    });
  });
}
