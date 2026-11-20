// app/(auth)/signup.tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useAuthDraftStore } from '../../src/store/useAuthDraftStore';
import { AuthTextField } from '../../src/components/auth/AuthTextField';
import { AuthDivider } from '../../src/components/auth/AuthDivider';
import { RoadButton } from '../../src/components/ui/RoadButton';
import { GoogleSigninButton } from '../../src/components/auth/GoogleSigninButton';
import { isValidPhoneNumber, normalizePhoneNumber } from '../../src/utils/phone';
import { Colors } from '../../src/theme/colors';

const MINIMUM_PASSWORD_LENGTH = 6;

export default function SignupScreen() {
  const router = useRouter();

  const { signUpWithEmail, signInWithGoogle, signOutGoogle, error, clearError, isLoading } = useAuth();

  const draft = useAuthDraftStore();
  const [formError, setFormError] = useState<string | null>(null);

  const clearMessages = () => {
    if (formError) setFormError(null);
    if (error) clearError();
  };

  const validate = (): string | null => {
    if (!draft.name.trim()) return 'Enter your full name.';

    const email = draft.email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Enter a valid email address.';
    }

    if (email.endsWith('.con') || email.endsWith('.cmo') || email.endsWith('.cpm')) {
      return 'Did you mean .com? Please check your email domain.';
    }

    const badDomains = ['gail.com', 'gamil.com', 'gmaill.com', 'yahoo.con', 'hotmail.con', 'outlook.con'];
    if (badDomains.some((domain) => email.includes(domain))) {
      return 'Please check your email spelling.';
    }

    if (draft.password.length < MINIMUM_PASSWORD_LENGTH) {
      return `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`;
    }
    if (draft.password !== draft.confirmPassword) {
      return 'Passwords do not match.';
    }

    // ✅ In the new flow the phone is verified AFTER account creation,
    // so we only validate that it's a well-formed number here.
    if (!isValidPhoneNumber(draft.phone)) {
      return 'Enter a valid mobile number, for example 09171234567.';
    }

    return null;
  };

  const handleSignUp = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setFormError(null);
    const phone = normalizePhoneNumber(draft.phone);
    const success = await signUpWithEmail(
      draft.name.trim(),
      draft.email.trim(),
      draft.password,
      phone,
    );

    if (success) {
      draft.reset();
      // ✅ Account created — now verify the phone (which links it to this account)
      router.replace({
        pathname: '/(auth)/phone-verify',
        params: { phone, flow: 'signup' },
      });
    }
  };

  const handleGoogle = async () => {
    clearMessages();
    const result = await signInWithGoogle();

    if (result === 'LINK_PROMPT') {
      Alert.alert(
        'Account Exists',
        'This email is already registered with a password. Do you want to log in instead?',
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: async () => {
              await signOutGoogle();
            },
          },
          {
            text: 'Yes',
            onPress: async () => {
              const success = await signInWithGoogle(true);
              if (success) {
                draft.reset();
                router.replace('/(tabs)/map');
              }
            },
          },
        ],
      );
    } else if (result === true) {
      draft.reset();
      router.replace('/(tabs)/map');
    }
  };

  const canSubmit =
    Boolean(draft.name.trim()) &&
    Boolean(draft.email.trim()) &&
    Boolean(draft.password) &&
    Boolean(draft.confirmPassword) &&
    Boolean(draft.phone) &&
    !isLoading;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <Image style={styles.logo} source={require('../../assets/icon.png')} resizeMode="contain" />
          <Text style={styles.subtitle}>Join the crew start riding with RIDO.</Text>
        </View>

        <View style={styles.form}>
          <AuthTextField
            value={draft.name}
            onChangeText={(val) => { draft.setField('name', val); clearMessages(); }}
            placeholder="Full name"
            leftIcon="user"
            autoCapitalize="words"
            editable={!isLoading}
          />

          <AuthTextField
            value={draft.email}
            onChangeText={(val) => { draft.setField('email', val); clearMessages(); }}
            placeholder="Email"
            leftIcon="email"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />

          <AuthTextField
            value={draft.password}
            onChangeText={(val) => { draft.setField('password', val); clearMessages(); }}
            placeholder={`Password (min ${MINIMUM_PASSWORD_LENGTH} characters)`}
            leftIcon="lock"
            isPassword
            editable={!isLoading}
          />

          <AuthTextField
            value={draft.confirmPassword}
            onChangeText={(val) => { draft.setField('confirmPassword', val); clearMessages(); }}
            placeholder="Confirm password"
            leftIcon="lock"
            isPassword
            editable={!isLoading}
          />

          <AuthTextField
            value={draft.phone}
            onChangeText={(val) => { draft.setField('phone', val); clearMessages(); }}
            placeholder="Mobile number (e.g. 09171234567)"
            leftIcon="phone"
            keyboardType="phone-pad"
            editable={!isLoading}
          />

          <Text style={styles.verify}>
            We’ll send a verification code to this number after you create your account.
          </Text>

          {formError && <Text style={styles.error}>{formError}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <RoadButton title="Create Account" onPress={handleSignUp} disabled={!canSubmit} loading={isLoading} />

        <View style={styles.dividerWrap}><AuthDivider label="or" /></View>

        <View style={styles.googleWrap}>
          <GoogleSigninButton onPress={handleGoogle} loading={isLoading} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 193,
    height: 152,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.black,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    gap: 10,
  },
  verify: {
    fontSize: 12,
    color: Colors.black,
    opacity: 0.7,
    marginBottom: 18,
  },
  error: {
    color: Colors.errorRed,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  dividerWrap: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
  },
  googleWrap: {
    alignSelf: 'center',
    width: 327,
    height: 40.7,
    marginBottom: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: Colors.black,
  },
  footerLink: {
    fontSize: 13,
    color: '#4285F4',
    fontWeight: '600',
  },
});