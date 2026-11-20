import { getFirebaseFirestore } from '../api/firebase';
import { collection, query, where, getDocs } from '@react-native-firebase/firestore';

export function generateDisplayId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoids confusing characters
  let result = 'RIDER-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateUniqueDisplayId(): Promise<string> {
  let isUnique = false;
  let newId = '';

  while (!isUnique) {
    newId = generateDisplayId();
    
    // Use your getFirebaseFirestore wrapper instead of getFirestore()
    const q = query(collection(getFirebaseFirestore(), 'users'), where('displayId', '==', newId));
    const snapshot = await getDocs(q);
    
    // Safety check to prevent "forEach of null" or "empty of null" errors
    if (!snapshot) {
      isUnique = true; // Fallback if snapshot is null
    } else if (snapshot.empty) {
      isUnique = true;
    }
  }
  return newId;
}