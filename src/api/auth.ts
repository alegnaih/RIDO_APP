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
  // verifyPasswordResetEmail,
  confirmPasswordReset,
  ActionCodeSettings,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getFirebaseAuth } from './firebase';
import { fetchRiderProfile, RiderProfileUpdate, saveRiderProfile } from './profile';
import { config } from '../constants/config';

export interface RegistrationInput {
  name: string;
  email: string;
  password: string;
  phone: string;
}

let isGoogleSigninConfigured = false;

/** `GoogleSignin.configure` only needs to run once per process. */
function ensureGoogleSigninConfigured(): void {
  if (isGoogleSigninConfigured) {
    return;
  }

  GoogleSignin.configure({ webClientId: config.googleWebClientId });
  isGoogleSigninConfigured = true;
}

/**
 * Creates the rider's Firestore profile if they do not have one yet.
 * Google and phone sign-in can both produce accounts that never went through
 * the signup form, so the profile document has to be backfilled on first sight.
 */
async function ensureRiderProfile(uid: string, seed: RiderProfileUpdate): Promise<void> {
  const existing = await fetchRiderProfile(uid);

  if (existing) {
    return;
  }

  await saveRiderProfile(uid, { role: 'member', ...seed });
}

export async function signInWithEmailPassword(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function registerWithEmailPassword(input: RegistrationInput): Promise<void> {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    input.email,
    input.password,
  );

  await saveRiderProfile(credential.user.uid, {
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: 'member',
  });
}

export async function signInWithGoogleAccount(): Promise<void> {
  ensureGoogleSigninConfigured();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();

  if (response.type !== 'success') {
    throw new Error('Google sign-in was cancelled.');
  }

  const { idToken, user: googleUser } = response.data;

  if (!idToken) {
    throw new Error('Google did not return an ID token.');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(getFirebaseAuth(), credential);
  const firebaseUser = userCredential.user;

  await ensureRiderProfile(firebaseUser.uid, {
    name: firebaseUser.displayName ?? googleUser.name ?? '',
    email: firebaseUser.email ?? googleUser.email ?? '',
    phone: firebaseUser.phoneNumber ?? '',
  });
}

/**
 * Sends an SMS code and returns the verification id needed to confirm it.
 * The modern `signInWithPhoneNumber` API is used instead of the legacy
 * `verifyPhoneNumber` listener, which can resolve more than once.
 */
export async function requestPhoneVerificationCode(phoneNumber: string): Promise<string> {
  const confirmation = await signInWithPhoneNumber(getFirebaseAuth(), phoneNumber);
  return confirmation.verificationId;
}

export async function confirmPhoneCode(verificationId: string, code: string): Promise<void> {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const userCredential = await signInWithCredential(getFirebaseAuth(), credential);
  const firebaseUser = userCredential.user;

  await ensureRiderProfile(firebaseUser.uid, {
    name: firebaseUser.displayName ?? '',
    email: firebaseUser.email ?? '',
    phone: firebaseUser.phoneNumber ?? '',
  });
}

 // Sends a password reset email via Firebase.
 
export async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    await firebaseSendPasswordResetEmail(getFirebaseAuth(), email);
  } catch (error) {
    throw error; 
  }
}

/**
 * Signs out of Firebase and clears any Google session.A
 * Firebase sign-out runs first and is the one that must succeed; clearing the
 * Google session is best-effort cleanup and must not block a rider from leaving.
 */
export async function signOutOfAllProviders(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());

  try {
    await GoogleSignin.signOut();
  } catch {
    // No active Google session to clear — nothing to do.
  }
}
