import { doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import { RiderProfile, UserRole } from '../types';

const USERS_COLLECTION = 'users';

/**
 * A Firestore document is untyped at runtime, and older documents predate
 * fields added later, so every value is read as `unknown` and narrowed.
 */
interface StoredRiderProfile {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  bloodType?: unknown;
  role?: unknown;
  emergencyContact?: unknown;
}

/** The subset of a profile a rider can change. Written with `merge` so it never clobbers other fields. */
export type RiderProfileUpdate = Partial<
  Pick<RiderProfile, 'name' | 'email' | 'phone' | 'bloodType' | 'emergencyContact' | 'role'>
>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asRole(value: unknown): UserRole {
  return value === 'leader' || value === 'sweeper' || value === 'member' ? value : 'member';
}

function asEmergencyContact(value: unknown): RiderProfile['emergencyContact'] {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const candidate = value as { name?: unknown; phone?: unknown };
  if (typeof candidate.name !== 'string' || typeof candidate.phone !== 'string') {
    return undefined;
  }

  return { name: candidate.name, phone: candidate.phone };
}

/** Reads the rider's profile document, or `null` if they have never completed registration. */
export async function fetchRiderProfile(uid: string): Promise<RiderProfile | null> {
  const snapshot = await getDoc(doc(getFirebaseFirestore(), USERS_COLLECTION, uid));

  if (!snapshot.exists()) {
    return null;
  }

  const stored = snapshot.data() as StoredRiderProfile;

  return {
    uid,
    name: asString(stored.name),
    email: asString(stored.email),
    phone: asString(stored.phone),
    bloodType: asString(stored.bloodType) || undefined,
    emergencyContact: asEmergencyContact(stored.emergencyContact),
    role: asRole(stored.role),
    isOnline: true,
    lastSeen: Date.now(),
  };
}

/**
 * Writes profile fields without replacing the document.
 * `merge: true` is essential — signup writes name/phone/role, and later edits
 * (blood type, emergency contact) must not wipe those out.
 */
export async function saveRiderProfile(uid: string, updates: RiderProfileUpdate): Promise<void> {
  await setDoc(
    doc(getFirebaseFirestore(), USERS_COLLECTION, uid),
    { uid, ...updates },
    { merge: true },
  );
}
