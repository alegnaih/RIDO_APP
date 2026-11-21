// src/hooks/useAuth.ts
import { useCallback } from 'react';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { getFirebaseAuth } from '../api/firebase';
import { fetchRiderProfile } from '../api/profile';
import {
  confirmPhoneCode as confirmPhoneCodeRequest,
  linkPhoneToCurrentUser,
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
          phone: signedInUser.phoneNumber?? '',
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
  async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    clearError();

    try {
      await signInWithEmailPassword(email, password);

      // Firebase authentication succeeded.
      // Wait for the auth listener to populate the Zustand user.
      const userIsReady = useAuthStore.getState().isAuthenticated;

      if (!userIsReady) {
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            unsubscribe();
            reject(new Error('Timed out waiting for rider profile.'));
          }, 10000);

          const unsubscribe = useAuthStore.subscribe((state) => {
            if (state.isAuthenticated) {
              clearTimeout(timeoutId);
              unsubscribe();
              resolve();
            }
          });

          // Recheck after subscribing to avoid missing an update.
          if (useAuthStore.getState().isAuthenticated) {
            clearTimeout(timeoutId);
            unsubscribe();
            resolve();
          }
        });
      }

      return true;
    } catch (caught) {
      setError(
        getAuthErrorMessage(caught, 'Failed to sign in.')
      );
      return false;
    } finally {
      setLoading(false);
    }
  },
  [setLoading, clearError, setError],
);


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

  const signInWithGoogle = useCallback(
    async (forceLink: boolean = false): Promise<boolean | 'LINK_PROMPT'> => {
      setLoading(true);
      clearError();
      try {
        const displayId = await signInWithGoogleAccount(forceLink);
        if (displayId) {
          updateUser({ displayId });
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

  // ✅ NEW: links phone to the currently signed-in user (signup flow)
  const linkPhone = useCallback(
    async (verificationId: string, code: string, phoneNumber: string): Promise<boolean> => {
      setLoading(true);
      clearError();
      try {
        await linkPhoneToCurrentUser(verificationId, code, phoneNumber);
        const auth = getFirebaseAuth();
        updateUser({ phone: auth.currentUser?.phoneNumber ?? '' });
        return true;
      } catch (caught: any) {
        if (caught?.code === 'auth/credential-already-in-use') {
          setError(
            'This phone number is already linked to another account. Please use a different number.'
          );
        } else if (caught?.code === 'auth/provider-already-linked') {
          setError('This account already has a phone number linked.');
        } else {
          setError(getAuthErrorMessage(caught, 'Failed to verify that code.'));
        }
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
    linkPhone, // ✅ NEW
    requestPasswordReset,
    signOut,
    clearError,
    updateUser,
    signOutGoogle,
  };
}