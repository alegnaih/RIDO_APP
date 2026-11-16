// app/(auth)/signup.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Image, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native'; // ✅ Added Alert
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useAuthDraftStore } from '../../src/store/useAuthDraftStore';
import { AuthTextField } from '../../src/components/auth/AuthTextField';
import { AuthDivider } from '../../src/components/auth/AuthDivider';
import { AuthLink } from '../../src/components/auth/AuthLink';
import { RoadButton } from '../../src/components/ui/RoadButton';
import { GoogleSigninButton } from '../../src/components/auth/GoogleSigninButton';
import { isValidPhoneNumber, normalizePhoneNumber } from '../../src/utils/phone';
import { Colors } from '../../src/theme/colors';

const MINIMUM_PASSWORD_LENGTH = 6;

export default function SignupScreen() {
  const router = useRouter();
  const { verifiedPhone } = useLocalSearchParams<{ verifiedPhone?: string }>();
  
  const { signUpWithEmail, signInWithGoogle, signOutGoogle, error, clearError, isLoading, isAuthenticated } = useAuth();
  
  const draft = useAuthDraftStore();
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (verifiedPhone) {
      draft.setField('phone', verifiedPhone);
      draft.setField('isPhoneVerified', true);
    }
  }, [verifiedPhone]);

  const clearMessages = () => {
    if (formError) setFormError(null);
    if (error) clearError();
  };

  const handlePhoneChange = (val: string) => {
    draft.setField('phone', val);
    clearMessages();
    if (val !== verifiedPhone) {
      draft.setField('isPhoneVerified', false);
    }
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
    if (badDomains.some(domain => email.includes(domain))) {
      return 'Please check your email spelling.';
    }

    if (draft.password.length < MINIMUM_PASSWORD_LENGTH) {
      return `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`;
    }
    if (draft.password !== draft.confirmPassword) {
      return 'Passwords do not match.';
    }
    
    if (!isValidPhoneNumber(draft.phone)) {
      return 'Enter a valid mobile number, for example 09171234567.';
    }
    if (!draft.isPhoneVerified) {
      return 'Please verify your phone number first.';
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
    const success = await signUpWithEmail(
      draft.name.trim(), 
      draft.email.trim(), 
      draft.password, 
      normalizePhoneNumber(draft.phone)
    );
    
    if (success) {
      draft.reset();
      router.replace('/(tabs)/map');
    }
  };

  // ✅ Updated with the Alert Prompt
  const handleGoogle = async () => {
    clearMessages();
    const result = await signInWithGoogle();

    if (result === 'LINK_PROMPT') {
      Alert.alert(
        "Account Exists",
        "This email is already registered with a password. Do you want to log in instead?",
        [
          { text: "No", style: "cancel", onPress: async () => {
              await signOutGoogle();
            }},
          { 
            text: "Yes", 
            onPress: async () => {
              const success = await signInWithGoogle(true);
              if (success) {
                draft.reset();
                router.replace('/(tabs)/map');
              }
            } 
          }
        ]
      );
    } else if (result === true) {
      draft.reset();
      router.replace('/(tabs)/map');
    }
  };

  const canSubmit =
    Boolean(draft.name.trim()) && Boolean(draft.email.trim()) && Boolean(draft.password) && 
    Boolean(draft.confirmPassword) && Boolean(draft.phone) && draft.isPhoneVerified && !isLoading;

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
            leftIcon='email'
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
            onChangeText={handlePhoneChange}
            placeholder="Mobile number (e.g. 09171234567)"
            leftIcon='phone'
            keyboardType="phone-pad"
            editable={!isLoading && !draft.isPhoneVerified}
          />
          
          {!draft.isPhoneVerified ? (
            <Text style={styles.verify}>
              Verify your phone number first to continue. We’ll send you a verification code via SMS.{' '}
              <Text 
                style={[styles.verifyLink, (!draft.phone || isLoading) && { opacity: 0.5 }]}
                onPress={() => {
                  if (draft.phone && !isLoading) {
                    router.push({
                      pathname: '/(auth)/phone-verify',
                      params: { phone: draft.phone, flow: 'signup' }
                    });
                  }
                }}
              >
                Send Code
              </Text>
            </Text>
          ) : (
            <Text style={styles.verifyText}>✓ Phone Verified</Text>
          )}

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
    backgroundColor: Colors.offWhite
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
    marginBottom: 18,
  },
  verifyText: {
    fontSize: 13,
    color: Colors.darkGreen,
  },
  verifyLink: {
    color: '#4285F4',
    fontWeight: '600',
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