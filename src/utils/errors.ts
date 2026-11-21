/**
 * Turns anything that was thrown into a human-readable string.
 * React Native and Firebase both reject with non-Error values in places,
 * so `error.message` alone is not safe to read.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallback;
}

/** Firebase error codes that riders are likely to hit, rewritten in plain language. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/missing-email': 'Enter your email address.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account already exists with that email.',
  'auth/weak-password': 'Choose a password with at least 6 characters.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many  verification attempts. Please try again later',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for the app yet.',
  'auth/invalid-phone-number': 'That phone number is not valid.',
  'auth/invalid-verification-code': 'That verification code is incorrect.',
  'auth/invalid-verification-id': 'The verification session expired. Request a new code.',
  'auth/code-expired': 'That code has expired. Request a new one.',
  'auth/missing-verification-code': 'Enter the verification code.',
  'auth/quota-exceeded': 'SMS quota reached. Try again later.',
  'auth/credential-already-in-use': 'This phone number is already linked to another account.',
  'auth/provider-already-linked': 'This account already has a phone number linked.',
};

/** Reads the `code` field Firebase attaches to its errors. */
function getErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') {
      return code;
    }
  }
  return null;
}

/**
 * Maps a Firebase auth failure to a message a rider can act on.
 * Falls back to the raw message, then to the supplied default.
 */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const code = getErrorCode(error);

  // Check if we have a friendly message in our dictionary
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }

  //  If it's an unknown Firebase error, try to get the raw message
  // (This strips the "Firebase: Error (auth/...)" wrapper if possible)
  const rawMessage = getErrorMessage(error, fallback);
  if (rawMessage.includes('Firebase: ')) {
    return rawMessage.replace('Firebase: ', '').replace(/ \(auth.*\)\.?/, '');
  }

  
  return fallback;
}