import { getApp, setReactNativeAsyncStorage } from '@react-native-firebase/app';
import { getAuth, sendPasswordResetEmail} from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../constants/config';

// Lets Firebase persist its own state through the same storage the app uses.
setReactNativeAsyncStorage(AsyncStorage);

/**
 * Auth instance for the default Firebase app.
 * Created lazily so importing a module never initialises native Firebase state.
 */
export function getFirebaseAuth() 
{
  return getAuth(getApp());

}

/**
 * Firestore instance for the default Firebase app.
 * Created lazily so importing a module never initialises native Firebase state.
 */
export function getFirebaseFirestore() {
  return getFirestore(getApp());
}

