import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { AuthTextField } from '../../src/components/auth/AuthTextField';
import { AuthDivider } from '../../src/components/auth/AuthDivider';
import { AuthLink } from '../../src/components/auth/AuthLink';
import { RoadButton } from '../../src/components/ui/RoadButton';
import { GoogleSigninButton } from '../../src/components/auth/GoogleSigninButton';
import { Colors } from '../../src/theme/colors';

/* function getDigits(v: string) {
  return v.replace(/\D/g, '');
} 

function looksLikePhone(v: string): boolean {
  const trimmed = v.trim();
  if (!trimmed) return false;
  if (!/^\+?[\d\s\-()]+$/.test(trimmed)) return false;
  const d = getDigits(trimmed);
  return d.length >= 7 && d.length <= 15;
} 

function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
} */

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, error, clearError, isLoading, isAuthenticated } =
    useAuth();

  const [email, setemail ] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fires for every sign-in method, including the ones that complete without
  // this screen calling anything (Google, phone, restored session).
 useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/map');
    }
  }, [isAuthenticated, router]); 

  // const isPhoneMode = looksLikePhone(email);

  const clearMessages = () => {
    if (formError) {setFormError(null);}
    if (error) {clearError();}
  };

  const handleLogin = async () => 
    {
    clearMessages();
    const value = email.trim();
  
   /*if (!value) 
    {
      setFormError('Enter your email address.');
      return;
    }

    if (isPhoneMode) {
      router.push(`/(auth)/phone-verify?phone=${encodeURIComponent(value)}`);
      return;
    } */

    if (!value.includes('@')) 
    {
      setFormError('Enter a valid email address.');
      return;
    }

    if (!password)
    {
      setFormError('Enter your password.');
        return;
    }

    await signInWithEmail(value, password);

    /*const success = await signInWithEmail(value, password);
    if (success) router.replace('/(tabs)/map'); */
  };

  const handleGoogle = async () => {
    clearMessages();
    clearMessages();
    await signInWithGoogle();
   // if (success) router.replace('/(tabs)/map');
  };

  const canSubmit = Boolean(email.trim()) && Boolean(password) && !isLoading;
  const message = formError ?? error;

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
        {/* ── Logo / header (was the two <Image /> blocks in the design) ── */}
        <View style={styles.logoWrap}>
          <Image style={styles.logo} source={require('../../assets/icon.png')} />
        </View>

        {/* ── Log In / Sign Up segmented tabs ── */}
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

        {/* ── Fields ── */}
        <View style={styles.fieldWrap}>
          <AuthTextField
            value={email}
            onChangeText={(value) => {
              setemail(value);
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

        {/* ── Forget Password? (right aligned, 11px in the design) ── */}
       
          <View style={styles.forgotWrap}>
            <AuthLink
              label="Forget Password?"
              onPress={() => router.push('/(auth)/forget-pw')}
            />
          </View>

        {(formError ?? error) ? (
          <Text style={styles.error}>{formError ?? error}</Text>) : null} 

        <View style={styles.buttonWrap}>
          <RoadButton
            title={'Continue'}
            onPress={handleLogin}
            disabled={!canSubmit}
            loading={isLoading}
          />
        </View>
        
        {/* ── Primary action ── */}
  
        <AuthDivider label="or" />

        {/* ── Google ── */}
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

  /* Header */
  logoWrap: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 193,
    height: 152,
   // resizeMode: 'contain',
  },

  /* Tabs — 156x39, radius 9 */
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
    // fontFamily: Poppins_600SemiBold,
  },
  tabTextActive: {
    color: Colors.white,
  },

  /* Fields — 327x41, radius 10 */
  fieldWrap: {
    alignSelf: 'center',
    width: 328,
    height: 41,
    justifyContent: 'center',
    
    marginBottom: 12,
    color: Colors.black,
  },

  /* Forget Password? — 11px, right aligned */
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

  /* Primary button — 330x44, radius 10 */
  buttonWrap: 
  {
    alignSelf: 'center',
    width: 327,
    height:40.7,
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

  bgImage: 
  {
    width: 412,
    height: 226,
  },
});
