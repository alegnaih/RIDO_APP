// src/hooks/useAuth.ts
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
  signOutGoogle,
} from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { getAuthErrorMessage } from '../utils/errors';

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

  const initialize = useCallback(() => {
    setLoading(true);
    let hasResolved = false;

    const timeoutId = setTimeout(() => {
      if (!hasResolved) setLoading(false);
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
        setUser({
          ...fallback,
          ...riderProfile,
          name: riderProfile?.name || signedInUser.displayName || signedInUser.email?.split('@')[0] || '',
        });
        setLoading(false);
      } catch (caught) {
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

  // ✅ Updated to capture displayId and update store immediately
  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string, phone: string) => {
      setLoading(true);
      clearError();
      try {
        const displayId = await registerWithEmailPassword({ name, email, password, phone });
        updateUser({ name, displayId }); 
        return true;
      } catch (caught) {
        setError(getAuthErrorMessage(caught, 'Failed to create your account.'));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [updateUser, setLoading, clearError, setError],
  );

  // ✅ Updated to capture displayId
  const signInWithGoogle = useCallback(
    async (forceLink: boolean = false): Promise<boolean | 'LINK_PROMPT'> => {
      setLoading(true);
      clearError();
      try {
        const displayId = await signInWithGoogleAccount(forceLink);
        if (displayId) {
          updateUser({ displayId }); // ✅ Update immediately
        }
        return true;
      } catch (caught: any) {
        if (caught.message === 'ACCOUNT_ALREADY_EXISTS') {
          return 'LINK_PROMPT';
        }
        setError(getAuthErrorMessage(caught, 'Failed to sign in with Google.'));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, setError, updateUser],
  );

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

  // ✅ Updated to capture displayId
  const confirmPhoneCode = useCallback(
    async (verificationId: string, code: string, skipFirestoreSave = false) => {
      setLoading(true);
      clearError();
      try {
        const displayId = await confirmPhoneCodeRequest(verificationId, code, skipFirestoreSave);
        if (displayId) {
          updateUser({ displayId }); 
        }
        return true;
      } catch (caught) {
        setError(getAuthErrorMessage(caught, 'Failed to verify that code.'));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [updateUser, setLoading, clearError, setError],
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
    signOutGoogle,
  };
}