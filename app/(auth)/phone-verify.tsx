import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter,useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { AuthScreen } from '../../src/components/auth/AuthScreen';
import { AuthTextField } from '../../src/components/auth/AuthTextField';
import { AuthLink } from '../../src/components/auth/AuthLink';
import { RoadButton } from '../../src/components/ui/RoadButton';
import { isValidPhoneNumber, normalizePhoneNumber } from '../../src/utils/phone';
import {Colors} from '../../src/theme/colors';

const VERIFICATION_CODE_LENGTH = 6;

export default function PhoneVerifyScreen() {
  const router = useRouter();

  const { phone: paramPhone, flow } = useLocalSearchParams<{ phone?: string; flow?: string }>();

  const { requestPhoneCode, confirmPhoneCode, signOut, error, clearError, isLoading, isAuthenticated} =
    useAuth();

  const [isCodeStep, setIsCodeStep] = useState(false);
  const [phone, setPhone] = useState(paramPhone ? normalizePhoneNumber(paramPhone) : '');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

    // Timer for resend
  const [timer, setTimer] = useState(60);
  const inputRef = useRef<TextInput>(null);

  const [isParamsReady, setIsParamsReady] = useState(false);
  useEffect(() => {
      if (flow !== undefined) {
        setIsParamsReady(true);
      }
    }, [flow]);

  // If they came from Signup, automatically send the code
  useEffect(() => {
    if (paramPhone && !isCodeStep) {
      handleSendCode();
    }
  }, [paramPhone]);


 /* useEffect(() => {
    // Only redirect if params are loaded, authenticated, and NOT in signup flow
    if (isParamsReady && isAuthenticated && flow !== 'signup') {
      router.replace('/(tabs)/map');
    }
  }, [isParamsReady, isAuthenticated, flow, router]); */

  useEffect(() => {
    // Params are loaded on mount. We just set ready to true.
    setIsParamsReady(true);
  }, []);


  useEffect(() => {
    if (isCodeStep && timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [isCodeStep, timer]);


  const handleSendCode = async () => {
    if (!isValidPhoneNumber(phone)) {
      setFormError('Enter a valid mobile number, for example 09171234567.');
      return;
    }

    setFormError(null);
    const id = await requestPhoneCode(normalizePhoneNumber(phone));

    if (id) {
      setVerificationId(id);
      setIsCodeStep(true);
      setTimer(60);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationId) {
      setFormError('Request a new code and try again.');
      return;
    }

    if (code.length < VERIFICATION_CODE_LENGTH) {
      setFormError(`Enter the ${VERIFICATION_CODE_LENGTH}-digit code from the SMS.`);
      return;
    }

    setFormError(null);

    const success = await confirmPhoneCode(verificationId, code);

     if (success) {
      if (flow === 'signup') {
        // Firebase signs the user in automatically. We must sign them out 
        // so they can finish creating their Email/Password account.
        await signOut();
        // Go back to signup with the verified phone number
          router.replace(`/(auth)/signup?verifiedPhone=${encodeURIComponent(phone)}`);
       
      } else {
        // ✅ It's a normal login, go straight to the Map!
        router.replace('/(tabs)/map');
      }
    }
  };


 return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        <Text style={styles.title}>Verify Code</Text>
        <Text style={styles.subtitle}>
          Please enter the code we just sent to{'\n'}
          <Text style={{ fontWeight: '600' }}>{isCodeStep ? normalizePhoneNumber(phone) : 'your phone number'}</Text>
        </Text>

        {/* Custom OTP Boxes */}
        {isCodeStep && (
          <View style={styles.otpContainer}>
            {[...Array(VERIFICATION_CODE_LENGTH)].map((_, index) => {
              const char = code[index] || '';
              return (
                <View key={index} style={[styles.otpBox, char ? styles.otpBoxFilled : {}]}>
                  <Text style={styles.otpText}>{char}</Text>
                </View>
              );
            })}
            
            {/* Hidden TextInput that actually captures the typing */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={(val) => {
                setCode(val.replace(/\D/g, ''));
                if (formError) setFormError(null);
              }}
              keyboardType="number-pad"
              maxLength={VERIFICATION_CODE_LENGTH}
              autoFocus
              editable={!isLoading}
            />
          </View>
        )}

        {(formError ?? error) && <Text style={styles.error}>{formError ?? error}</Text>}

        {/* Resend Code / Timer */}
        {isCodeStep && (
          <View style={styles.resendWrap}>
            <Text style={styles.resendText}>Didn't receive OTP?</Text>
            {timer > 0 ? (
              <Text style={styles.timerText}> Resend code ({timer}s)</Text>
            ) : (
              <TouchableOpacity onPress={handleSendCode} disabled={isLoading}>
                <Text style={styles.resendLink}> Resend code</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.buttonWrap}>
          {isCodeStep ? (
            <RoadButton 
              title="Verify" 
              onPress={handleVerifyCode} 
              loading={isLoading} 
              disabled={code.length < VERIFICATION_CODE_LENGTH} 
            />
          ) : (
            <RoadButton 
              title="Send Code" 
              onPress={handleSendCode} 
              loading={isLoading} 
              disabled={!phone} 
            />
          )}
        </View>

        <TouchableOpacity style={styles.changeNumber} onPress={() => router.back()}>
          <Text style={styles.changeNumberText}>Back</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.offWhite },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: Colors.black, marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
    position: 'relative',
  },
  otpBox: {
    width: 45,
    height: 50,
    backgroundColor: '#EAEAEA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    backgroundColor: '#D9D9D9',
  },
  otpText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.black,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
    zIndex: 10, // Makes sure taps go to the input
  },

  error: { color: Colors.errorRed, fontSize: 13, textAlign: 'center', marginBottom: 16 },
  
  resendWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  resendText: { fontSize: 14, color: Colors.black },
  timerText: { fontSize: 14, color: '#999', fontWeight: '500' },
  resendLink: { fontSize: 14, color: '#4285F4', fontWeight: '600' }, // Blue link

  buttonWrap: { width: '100%', maxWidth: 320, marginBottom: 16 },
  changeNumber: { padding: 10 },
  changeNumberText: { color: '#666', fontSize: 14, textDecorationLine: 'underline' },
});