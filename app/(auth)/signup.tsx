import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Image, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { AuthScreen } from '../../src/components/auth/AuthScreen';
import { AuthTextField } from '../../src/components/auth/AuthTextField';
import { AuthDivider } from '../../src/components/auth/AuthDivider';
import { AuthLink } from '../../src/components/auth/AuthLink';
import { RoadButton } from '../../src/components/ui/RoadButton';
import { GoogleSigninButton } from '../../src/components/auth/GoogleSigninButton';
import { isValidPhoneNumber, normalizePhoneNumber } from '../../src/utils/phone';
import { Colors } from '../../src/theme/colors';
import { useLocalSearchParams } from 'expo-router';


const MINIMUM_PASSWORD_LENGTH = 6;

export default function SignupScreen() {
  const router = useRouter();
  const { verifiedPhone } = useLocalSearchParams<{ verifiedPhone?: string }>();
  const { signUpWithEmail, signInWithGoogle, error, clearError, isLoading, isAuthenticated } =
    useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);


  useEffect(() => {
  if (verifiedPhone) {
    setPhone(verifiedPhone);
    setIsPhoneVerified(true);
  }
  }, [verifiedPhone]);

  const clearMessages = () => {
    if (formError) {
      setFormError(null);
    }
    if (error) {
      clearError();
    }
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    clearMessages();
    if (val !== verifiedPhone) {
      setIsPhoneVerified(false);
    }
  };

  const validate = (): string | null => {
    if (!name.trim()) {
      return 'Enter your full name.';
    }
    if (!email.includes('@')) {
      return 'Enter a valid email address.';
    }
    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      return `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`;
    }

    if (password !== confirmPassword){ return 'Passwords do not match.';}

    if (!isValidPhoneNumber(phone)) {
     return 'Enter a valid mobile number, for example 09171234567.';
    }

    if (!isPhoneVerified) return 'Please verify your phone number first.';

    return null;
  };


  const handleSignUp = async () => {
    const validationMessage = validate();

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setFormError(null);
    // await signUpWithEmail(name.trim(), email.trim(), password, normalizePhoneNumber(phone), );
    // Assuming signUpWithEmail returns true on success (based on your useAuth code)
    const success = await signUpWithEmail(name.trim(), email.trim(), password, normalizePhoneNumber(phone));
    
    if (success) {
      router.replace('/(tabs)/map');
    }
  };

  const handleGoogle = async () => {
    clearMessages();
    const success = await signInWithGoogle();
    if (success) {
      router.replace('/(tabs)/map');
    }
  };

  const canSubmit =
    Boolean(name.trim()) && Boolean(email.trim()) && Boolean(password) && Boolean(confirmPassword) 
     && Boolean(phone) && isPhoneVerified && !isLoading;

  return (
    <KeyboardAvoidingView style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <ScrollView
        contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}>
        
        {/* Logo & Header */}
        <View style={styles.logoWrap}>
          <Image style={styles.logo} source={require('../../assets/icon.png')} resizeMode="contain" />
          <Text style={styles.subtitle}>Join the crew start riding with RIDO.</Text>
        </View>

      <View style={styles.form}>
        <AuthTextField
          value={name}
          onChangeText={(value) => {
            setName(value);
            clearMessages();
          }}
          placeholder="Full name"
          leftIcon="user"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          editable={!isLoading}
        />

        <AuthTextField
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            clearMessages();
          }}
          placeholder="Email"
          leftIcon='email'
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!isLoading}
        />

        <AuthTextField
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearMessages();
          }}
          placeholder={`Password (min ${MINIMUM_PASSWORD_LENGTH} characters)`}
          leftIcon="lock"
          isPassword
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!isLoading}
        />

        <AuthTextField
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            clearMessages();
          }}
          placeholder="Confirm password"
          leftIcon="lock"
          isPassword
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!isLoading}
        />

        <AuthTextField
          value={phone}
          onChangeText={handlePhoneChange}
          placeholder="Mobile number (e.g. 09171234567)"
          leftIcon='phone'
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          editable={!isLoading && !isPhoneVerified}
        />
        
          {/* Send Code Button */}
          {!isPhoneVerified ? 
          (
            <Text style={styles.verify}>
              Verify your phone number first to continue. 
              We’ll send you a verification code via SMS.{' '}
        
              <Text style={[styles.verifyLink, (!phone || isLoading) && { opacity: 0.5 }]}
                onPress={() => {
                if (phone && !isLoading) 
                  {
                    router.push({pathname: '/(auth)/phone-verify',
                      params: { phone: phone, flow: 'signup' }
                    });
                  }
                }}>Send Code</Text>{' '}
            </Text>
          ) : (
            <Text style={{ color: 'green', fontSize: 12, marginTop: 8, marginBottom: 16, textAlign: 'right', fontWeight: '600' }}>
              ✓ Phone Verified
            </Text>
          )}

          {formError ? <Text style={styles.error}>{formError}</Text> : error}
          
        </View>

      <RoadButton
        title="Create Account"
        onPress={handleSignUp}
        disabled={!canSubmit}
        loading={isLoading}
      />

         <View style={styles.dividerWrap}>
          <AuthDivider label="or" />
        </View>
        
        <View style={styles.googleWrap}>
          <GoogleSigninButton onPress={handleGoogle} loading={isLoading} />
        </View>

        {/* Footer Link */}
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

  /* Header */
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

  verify: 
  {
    marginBottom: 18,
  },
  
  verifyText:
  {
    fontSize: 13,
    color: Colors.black,
  },
  verifyLink:
  {
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
    height:40.7,
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
