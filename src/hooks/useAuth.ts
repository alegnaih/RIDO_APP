import { useCallback } from 'react';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { getFirebaseAuth } from '../api/firebase';
import { fetchRiderProfile } from '../api/profile';
import {
  confirmPhoneCode as confirmPhoneCodeRequest,
  registerWithEmailPassword,
  requestPhoneVerificationCode,
  signInWithEmailPassword,
  signInWithGoogleAccount,
  signOutOfAllProviders,
  sendPasswordResetEmail,
} from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { getAuthErrorMessage } from '../utils/errors';

/** If Firebase never reports an auth state, stop blocking the splash screen. */
const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000;

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const error = useAuthStore((state) => state.error);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const clearError = useAuthStore((state) => state.clearError);
  const updateUser = useAuthStore((state) => state.updateUser);
  const reset = useAuthStore((state) => state.reset);

  /** Subscribes to Firebase auth and mirrors it into the store. Returns the unsubscribe. */
  const initialize = useCallback(() => {
    setLoading(true);

    let hasResolved = false;

    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        // Never leave the rider stuck on the splash screen.
        setLoading(false);
      }
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      hasResolved = true;
      clearTimeout(timeoutId);

      
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const signedInUser = firebaseUser;

        const fallback = {
            uid: signedInUser.uid,
            name: signedInUser.displayName ?? '',
            email: signedInUser.email ?? '',
            phone: signedInUser.phoneNumber ?? '',
            role: 'member' as const,
            isOnline: true,
            lastSeen: Date.now(),
          };
      
        try {
          const riderProfile = await fetchRiderProfile(signedInUser.uid);
          setUser(riderProfile ?? fallback);
          setLoading(false);
        }

      catch (caught) {
        setError(getAuthErrorMessage(caught, 'Could not load your rider profile.'));
        setUser(fallback);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [setUser, setLoading, setError]);

  /** Runs an auth call with shared loading/error handling. Resolves `true` on success. */
  const runAuthAction = useCallback(
    async (action: () => Promise<void>, fallbackMessage: string): Promise<boolean> => {
      setLoading(true);
      clearError();

      try {
        await action();
        return true;
      } catch (caught) {
        setError(getAuthErrorMessage(caught, fallbackMessage));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, setError],
  );

  const signInWithEmail = useCallback(
    (email: string, password: string) =>
      runAuthAction(() => signInWithEmailPassword(email, password), 'Failed to sign in.'),
    [runAuthAction],
  );

  const signUpWithEmail = useCallback(
    (name: string, email: string, password: string, phone: string) =>
      runAuthAction(
        () => registerWithEmailPassword({ name, email, password, phone }),
        'Failed to create your account.',
      ),
    [runAuthAction],
  );

  const signInWithGoogle = useCallback(
    () => runAuthAction(signInWithGoogleAccount, 'Failed to sign in with Google.'),
    [runAuthAction],
  );

  /** Sends the SMS code. Resolves the verification id, or `null` if sending failed. */
  const requestPhoneCode = useCallback(
    async (phoneNumber: string): Promise<string | null> => {
      setLoading(true);
      clearError();

      try {
        return await requestPhoneVerificationCode(phoneNumber);
      } catch (caught) {
        setError(getAuthErrorMessage(caught, 'Could not send the verification code.'));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, setError],
  );

  const confirmPhoneCode = useCallback(
    (verificationId: string, code: string) =>
      runAuthAction(
        () => confirmPhoneCodeRequest(verificationId, code),
        'Failed to verify that code.',
      ),
    [runAuthAction],
  );

    const requestPasswordReset = useCallback(
    (email: string) =>
      runAuthAction(
        () => sendPasswordResetEmail(email),
        'Failed to send password reset email.'
      ),
    [runAuthAction],
  );

  const signOut = useCallback(async () => {
    setLoading(true);

    try {
      await signOutOfAllProviders();
      reset();
    } catch (caught) {
      setError(getAuthErrorMessage(caught, 'Could not sign out. Try again.'));
      setLoading(false);
    }
  }, [reset, setLoading, setError]);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    initialize,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    requestPhoneCode,
    confirmPhoneCode,
    requestPasswordReset,
    signOut,
    clearError,
    updateUser,
  };
}
