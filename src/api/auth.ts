// src/api/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  PhoneAuthProvider,
  getAuth,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  confirmPasswordReset,
  ActionCodeSettings,
  updateProfile,
  fetchSignInMethodsForEmail, 
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getFirebaseAuth } from './firebase';
import { fetchRiderProfile, RiderProfileUpdate, saveRiderProfile } from './profile';
import { config } from '../constants/config';
import { generateUniqueDisplayId } from '../utils/generateDisplayId';

export interface RegistrationInput {
  name: string;
  email: string;
  password: string;
  phone: string;
}

let isGoogleSigninConfigured = false;

function ensureGoogleSigninConfigured(): void {
  if (isGoogleSigninConfigured) return;
  GoogleSignin.configure({ webClientId: config.googleWebClientId });
  isGoogleSigninConfigured = true;
}

// ✅ Email Login doesn't create a new ID, so it doesn't need to return anything
export async function signInWithEmailPassword(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function registerWithEmailPassword(input: RegistrationInput): Promise<string> {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    input.email,
    input.password,
  );

  await updateProfile(credential.user, { displayName: input.name });
  const displayId = await generateUniqueDisplayId();

  await saveRiderProfile(credential.user.uid, {
    name: input.name,
    email: input.email,
    phone: input.phone,
    displayId: displayId,
  });
  
  return displayId; // ✅ Return it to update local state instantly
}

export async function signInWithGoogleAccount(forceLink: boolean = false): Promise<string> {
  ensureGoogleSigninConfigured();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (response.type !== 'success') {
    throw new Error('Google sign-in was cancelled.');
  }

  const { idToken, user: googleUser } = response.data;
  if (!idToken) throw new Error('Google did not return an ID token.');

  const email = googleUser.email;

  // ✅ Check if the email exists as a password account
  if (!forceLink && email) {
    try {
      const methods = await fetchSignInMethodsForEmail(getFirebaseAuth(), email);
      if (methods.length > 0) {
        throw new Error('ACCOUNT_ALREADY_EXISTS');
      }
    } catch (e: any) {
      if (e.message === 'ACCOUNT_ALREADY_EXISTS') throw e; 
      console.warn("Could not fetch sign-in methods:", e);
    }
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(getFirebaseAuth(), credential);
  const firebaseUser = userCredential.user;
  
  const existingProfile = await fetchRiderProfile(firebaseUser.uid);
  let displayId = existingProfile?.displayId || '';

  // ✅ If it's a brand new user, generate an ID. If it's a legacy user missing an ID, generate one too.
  if (!existingProfile || !displayId) {
    displayId = await generateUniqueDisplayId();
    await saveRiderProfile(firebaseUser.uid, {
      name: firebaseUser.displayName ?? googleUser.name ?? '',
      email: firebaseUser.email ?? googleUser.email ?? '',
      phone: firebaseUser.phoneNumber ?? '',
      displayId: displayId,
    });
  }

  return displayId; // ✅ Return it to update local state instantly
}

export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.warn("Failed to sign out of Google locally:", error);
  }
}

export async function requestPhoneVerificationCode(phoneNumber: string): Promise<string> {
  const confirmation = await signInWithPhoneNumber(getFirebaseAuth(), phoneNumber);
  return confirmation.verificationId;
}

export async function confirmPhoneCode(verificationId: string, code: string, skipFirestoreSave = false): Promise<string> {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const userCredential = await signInWithCredential(getFirebaseAuth(), credential);
  const firebaseUser = userCredential.user;

  if (skipFirestoreSave) 
  {
    return ''; 
  }

  const existingProfile = await fetchRiderProfile(firebaseUser.uid);
  let displayId = existingProfile?.displayId || '';
  
  // ✅ Same logic for phone users
  if (!existingProfile || !displayId) {
    displayId = await generateUniqueDisplayId();
    await saveRiderProfile(firebaseUser.uid, {
      name: firebaseUser.displayName ?? '',
      email: firebaseUser.email ?? '',
      phone: firebaseUser.phoneNumber ?? '',
      displayId: displayId,
    });
  }

  return displayId; // ✅ Return it
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    await firebaseSendPasswordResetEmail(getFirebaseAuth(), email);
  } catch (error) {
    throw error; 
  }
}

export async function signOutOfAllProviders(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
  try {
    await GoogleSignin.signOut();
  } catch {}
}