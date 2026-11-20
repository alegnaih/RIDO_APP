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
  linkWithCredential, // ✅ NEW: links a credential to the currently signed-in user
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

  try {
    await updateProfile(credential.user, { displayName: input.name });
    const displayId = await generateUniqueDisplayId();

    await saveRiderProfile(credential.user.uid, {
      name: input.name,
      email: input.email,
      phone: input.phone,
      displayId: displayId,
    });

    return displayId;
  } catch (error) {
    // 🔥 ROLLBACK: Permanently delete the Auth user if Firestore fails
    try {
      await credential.user.delete();
    } catch (deleteError) {
      console.error('Failed to rollback Auth user:', deleteError);
    }
    throw error; 
  }
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

  if (!forceLink && email) {
    try {
      const methods = await fetchSignInMethodsForEmail(getFirebaseAuth(), email);
      // ✅ Safety check: methods can be null in newer Firebase versions
      if (methods && methods.length > 0) {
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

  try {
    const existingProfile = await fetchRiderProfile(firebaseUser.uid);
    let displayId = existingProfile?.displayId || '';

    if (!existingProfile || !displayId) {
      displayId = await generateUniqueDisplayId();
      await saveRiderProfile(firebaseUser.uid, {
        name: firebaseUser.displayName ?? googleUser.name ?? '',
        email: firebaseUser.email ?? googleUser.email ?? '',
        phone: firebaseUser.phoneNumber ?? '',
        displayId: displayId,
      });
    }

    return displayId;
  } catch (error) {
    // 🔥 ROLLBACK: Permanently delete the Auth user if Firestore fails
    try {
      await firebaseUser.delete();
    } catch (deleteError) {
      console.error('Failed to rollback Google user:', deleteError);
    }
    throw error;
  }
}


export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.warn("Failed to sign out of Google locally:", error);
  }
}

/**
 * Sends the SMS OTP for a phone number.
 * NOTE: This does NOT sign the user in — it only returns the verificationId.
 * Safe to call while the user is already signed in (e.g. right after signup).
 */
export async function requestPhoneVerificationCode(phoneNumber: string): Promise<string> {
  const confirmation = await signInWithPhoneNumber(getFirebaseAuth(), phoneNumber);
  return confirmation.verificationId;
}

/**
 * Sign-in flow (existing users logging in with phone).
 * Signs the user in as the phone account.
 */
export async function confirmPhoneCode(verificationId: string, code: string, skipFirestoreSave = false): Promise<string> {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const userCredential = await signInWithCredential(getFirebaseAuth(), credential);
  const firebaseUser = userCredential.user;

  if (skipFirestoreSave) {
    return '';
  }

  const existingProfile = await fetchRiderProfile(firebaseUser.uid);
  let displayId = existingProfile?.displayId || '';

  if (!existingProfile || !displayId) {
    displayId = await generateUniqueDisplayId();
    await saveRiderProfile(firebaseUser.uid, {
      name: firebaseUser.displayName ?? '',
      email: firebaseUser.email ?? '',
      phone: firebaseUser.phoneNumber ?? '',
      displayId: displayId,
    });
  }

  return displayId;
}

/** Signup flow — links the phone credential to the CURRENTLY signed-in
 * email/password user. Same UID, no new Firestore doc.
 *
 * Throws `auth/credential-already-in-use` if the phone belongs to another account,
 * and `auth/provider-already-linked` if this account already has a phone.
 */
export async function linkPhoneToCurrentUser(verificationId: string, code: string, phoneNumber: string): Promise<void> {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You need to be signed in to link a phone number.');
  }

  const credential = PhoneAuthProvider.credential(verificationId, code);
  const result = await linkWithCredential(currentUser, credential);
  
  await result.user.reload();

  // ✅ Use the passed phoneNumber, or fallback to the result.user's phoneNumber
  const finalPhone = result.user.phoneNumber || phoneNumber;

  const existing = await fetchRiderProfile(currentUser.uid);
  
  await saveRiderProfile(currentUser.uid, {
    name: existing?.name || result.user.displayName || 'RIDO User',
    email: existing?.email || result.user.email || '',
    phone: finalPhone, // ✅ Always saves the verified number
    displayId: existing?.displayId || '', 
  });
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