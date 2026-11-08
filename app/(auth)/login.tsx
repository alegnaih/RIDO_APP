import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { AuthTextField } from '../../src/components/auth/AuthTextField';
import { AuthDivider } from '../../src/components/auth/AuthDivider';
import { AuthLink } from '../../src/components/auth/AuthLink';
import { RoadButton } from '../../src/components/ui/RoadButton';
import { GoogleSigninButton } from '../../src/components/auth/GoogleSigninButton';
import { Colors } from '../../src/theme/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, error, clearError, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const clearMessages = () => {
    if (formError) setFormError(null);
    if (error) clearError();
  };

  const handleLogin = async () => {
    clearMessages();
    const value = email.trim();

    // ✅ 1. Validate FIRST
    if (!value.includes('@')) {
      setFormError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setFormError('Enter your password.');
      return;
    }

    // ✅ 2. Call API ONCE
    const success = await signInWithEmail(value, password);
    
    // ✅ 3. Redirect on success
    if (success) {
      router.replace('/(tabs)/map');
    }
  };

  const handleGoogle = async () => {
    clearMessages();
    
    // ✅ 1. Call API ONCE
    const success = await signInWithGoogle();
    
    // ✅ 2. Redirect on success
    if (success) {
      router.replace('/(tabs)/map');
    }
  };

  const canSubmit = Boolean(email.trim()) && Boolean(password) && !isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / header */}
        <View style={styles.logoWrap}>
          <Image style={styles.logo} source={require('../../assets/icon.png')} />
        </View>

        {/* Log In / Sign Up segmented tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, styles.tabActive]}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityState={{ selected: true }}
          >
            <Text style={[styles.tabText, styles.tabTextActive]}>Log In</Text>
          </Pressable>

          <Pressable
            style={styles.tab}
            onPress={() => router.push('/(auth)/signup')}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityState={{ selected: false }}
          >
            <Text style={styles.tabText}>Sign Up</Text>
          </Pressable>
        </View>

        {/* Fields */}
        <View style={styles.fieldWrap}>
          <AuthTextField
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              clearMessages();
            }}
            placeholder="Email"
            leftIcon="email"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            editable={!isLoading}
          />
        </View>

        <View style={styles.fieldWrap}>
          <AuthTextField
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              clearMessages();
            }}
            placeholder="Password"
            leftIcon="lock"
            isPassword
            autoComplete="current-password"
            textContentType="password"
            editable={!isLoading}
          />
        </View>

        {/* Forget Password? */}
        <View style={styles.forgotWrap}>
          <AuthLink
            label="Forget Password?"
            onPress={() => router.push('/(auth)/forget-pw')}
          />
        </View>

        {(formError ?? error) ? (
          <Text style={styles.error}>{formError ?? error}</Text>
        ) : null}

        <View style={styles.buttonWrap}>
          <RoadButton
            title={'Continue'}
            onPress={handleLogin}
            disabled={!canSubmit}
            loading={isLoading}
          />
        </View>

        <AuthDivider label="or" />

        {/* Google */}
        <View style={styles.buttonWrap}>
          <GoogleSigninButton onPress={handleGoogle} loading={isLoading} />
        </View>

        <View style={styles.bgWrap}>
          <Image style={styles.bgImage} source={require('../../assets/bottom-bg.png')} resizeMode="cover" />
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
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 330,
    marginBottom: 24,
    gap: 12,
  },
  tab: {
    flex: 1,
    width: 156,
    height: 39,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: Colors.darkGreen,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
  },
  tabTextActive: {
    color: Colors.white,
  },
  fieldWrap: {
    alignSelf: 'center',
    width: 328,
    height: 41,
    justifyContent: 'center',
    marginBottom: 12,
  },
  forgotWrap: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 327,
    alignItems: 'flex-end',
    marginTop: 2,
    marginBottom: 12,
  },
  error: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 327,
    marginBottom: 12,
    fontSize: 12,
    color: Colors.errorRed,
  },
  buttonWrap: {
    alignSelf: 'center',
    width: 327,
    height: 40.7,
    marginBottom: 10,
  },
  bgWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 226,
    zIndex: -1,
  },
  bgImage: {
    width: 412,
    height: 226,
  },
});