
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../src/hooks/useAuth';
import { Colors } from '../../src/theme/colors';

export default function LogoutConfirmationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { signOut, error, clearError } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    clearError();

    try {
      const success = await signOut();

      if (success) {
        router.replace('/(auth)/login');
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCancel = () => {
    if (isLoggingOut) return;
    clearError();
    router.back();
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 55,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.message}>
        Are you sure you want to log out of your account?
      </Text>

      {!!error && (
        <Text style={styles.error}>{error}</Text>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.logoutButton,
            isLoggingOut && styles.disabledButton,
          ]}
          onPress={handleConfirmLogout}
          disabled={isLoggingOut}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          {isLoggingOut ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.logoutText}>Log Out</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={isLoggingOut}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    alignItems: 'center',
    paddingHorizontal: 28,
  },

  logo: {
    width: 280,
    height: 205,
  },

  message: {
    maxWidth: 275,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    color: Colors.black,
    textAlign: 'center',
    marginTop: 10,
  },

  buttonContainer: {
    width: '100%',
    maxWidth: 280,
    marginTop: 45,
    gap: 22,
  },

  logoutButton: {
    height: 48,
    backgroundColor: Colors.darkGreen,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoutText: {
    fontSize: 19,
    fontWeight: '500',
    color: Colors.white,
  },

  cancelButton: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cancelText: {
    fontSize: 19,
    fontWeight: '500',
    color: Colors.darkGreen,
  },

  disabledButton: {
    opacity: 0.6,
  },

  error: {
    color: Colors.errorRed,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
});
