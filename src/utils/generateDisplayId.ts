// src/utils/generateDisplayId.ts

export function generateDisplayId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoids confusing characters
  let result = 'RIDER-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ✅ Helper to check if the code is unique in Firestore
import { getFirestore, collection, query, where, getDocs } from '@react-native-firebase/firestore';

export async function generateUniqueDisplayId(): Promise<string> {
  let isUnique = false;
  let newId = '';

  while (!isUnique) {
    newId = generateDisplayId();
    const q = query(collection(getFirestore(), 'users'), where('displayId', '==', newId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      isUnique = true;
    }
  }
  return newId;
}