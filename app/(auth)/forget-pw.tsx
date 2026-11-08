import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { AuthTextField } from '../../src/components/auth/AuthTextField';
import { RoadButton } from '../../src/components/ui/RoadButton';
import { Colors } from '../../src/theme/colors';
import { useAuth } from '../../src/hooks/useAuth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  
  // Get the new email reset function from useAuth
  const { requestPasswordReset, isLoading, error, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false); // Toggles between the two UI states

  const handleSendResetLink = async () => {
    if (!email.trim() || !email.includes('@')) return;

    clearError();
    
    // Call the Firebase email reset function
    const success = await requestPasswordReset(email.trim());
    
    // If it succeeded, switch to the "Check Your Email" screen
    if (success) {
      setIsSent(true);
    }
  };

  // ─────────────────────────────────────────────────────────
  // STATE 2: CHECK YOUR EMAIL UI
  // ─────────────────────────────────────────────────────────
  if (isSent) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={Colors.black} />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <Image style={styles.logo} source={require('../../assets/icon.png')} resizeMode="contain" />
          </View>

          {/* Big Email Icon with Checkmark */}
          <View style={styles.successIconWrap}>
            <Feather name="mail" size={64} color={Colors.black} />
            <View style={styles.checkBadge}>
              <Feather name="check" size={16} color={Colors.white} />
            </View>
          </View>

          <Text style={styles.title}>Check Your Email</Text>
          
          <Text style={styles.subtitle}>
            We'll sent a password reset link to your email address{'\n\n'}
            If it doesn't appear within a few minutes, check your spam folder
          </Text>

          <View style={styles.buttonWrap}>
            <RoadButton 
              title="Back to Log in" 
              onPress={() => router.replace('/(auth)/login')} 
              loading={false} 
              disabled={false} 
            />
          </View>

          <View style={styles.bgWrap}>
            <Image style={styles.bgImage} source={require('../../assets/bottom-bg.png')} resizeMode="cover" />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────
  // STATE 1: FORGOT PASSWORD (INPUT) UI
  // ─────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* Header */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={Colors.black} />
        </TouchableOpacity>

        <View style={styles.logoWrap}>
          <Image style={styles.logo} source={require('../../assets/icon.png')} resizeMode="contain" />
        </View>

        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your registered email addresses. We'll send you a password reset link
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <AuthTextField
            value={email}
            onChangeText={(val) => { setEmail(val); if (error) clearError(); }}
            placeholder="Email"
            leftIcon="email"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.buttonWrap}>
          <RoadButton 
            title="Send Reset Link" 
            onPress={handleSendResetLink} 
            loading={isLoading} 
            disabled={!email.includes('@') || isLoading} 
          />
        </View>

        <TouchableOpacity style={styles.backToLogin} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.backToLoginText}>Back to Log In</Text>
        </TouchableOpacity>

        {/* Bottom Background Image */}
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
    paddingTop: 40, 
    paddingBottom: 40 
  },
  backButton: { 
    marginBottom: 20, 
    alignSelf: 'flex-start' 
  },
  logoWrap: { 
    alignItems: 'center', 
    marginBottom: 24 
  },
  logo: { 
    width: 120, 
    height: 120 
  },
  title: { 
    fontSize: 20,
    fontWeight: '600', 
    color: Colors.black,
    textAlign: 'center', 
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 13, 
    color: Colors.black, 
    textAlign: 'center', 
    marginBottom: 24, 
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  form: { 
    width: '100%',
    maxWidth: 327, 
    alignSelf: 'center',
    marginBottom: 10,
  },
  buttonWrap: {
    alignSelf: 'center',
    width: 327,
    height: 40.7,
    marginBottom: 10,
  },
  error: { 
    color: Colors.errorRed, 
    fontSize: 12, 
    textAlign: 'center', 
    marginBottom: 12 
  },
  backToLogin: {
    marginTop: 24, 
    alignSelf: 'center' 
  },
  backToLoginText: {
    fontSize: 13, 
    color: Colors.black, 
    fontWeight: '500' 
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
    width: '100%',
    height: '100%',
  },
  
  /* Success Screen Specific Styles */
  successIconWrap: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 24,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: Colors.black,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.offWhite,
  },
});