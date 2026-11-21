// app/(auth)/phone-verify.tsx
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { AuthTextField } from '../../src/components/auth/AuthTextField';
import { RoadButton } from '../../src/components/ui/RoadButton';
import { isValidPhoneNumber, normalizePhoneNumber } from '../../src/utils/phone';
import { Colors } from '../../src/theme/colors';

const VERIFICATION_CODE_LENGTH = 6;

export default function PhoneVerifyScreen() {
  const router = useRouter();

  const { phone: paramPhone, flow } = useLocalSearchParams<{ phone?: string; flow?: string }>();
 const isLinkFlow = flow === 'signup' || flow === 'link' || flow === 'profile';

  const { requestPhoneCode, confirmPhoneCode, linkPhone, error, clearError, isLoading } = useAuth();

  const [isCodeStep, setIsCodeStep] = useState(false);
  const [phone, setPhone] = useState(paramPhone ? normalizePhoneNumber(paramPhone) : '');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [timer, setTimer] = useState(60);
  const inputRef = useRef<TextInput>(null);

  const hasAutoSentRef = useRef(false);

  // Auto-send on first mount if we came here with a phone (signup flow)
  useEffect(() => {
    if (paramPhone && !hasAutoSentRef.current) {
      hasAutoSentRef.current = true;
      handleSendCode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramPhone]);

  // Resend timer
  useEffect(() => {
    if (isCodeStep && timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [isCodeStep, timer]);

const handleSendCode = async (isResend = false) => {
  if (isLoading) return;

  if (isResend && timer > 0) return;

  if (!isValidPhoneNumber(phone)) {
    setFormError('Enter a valid mobile number, for example 09171234567.');
    return;
  }

  setFormError(null);
  if (error) clearError();

  const id = await requestPhoneCode(normalizePhoneNumber(phone));

  if (id) {
    setVerificationId(id);
    setIsCodeStep(true);
    setTimer(60);

    if (!isResend) {
      setCode('');
    }
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
    if (error) clearError();

    if (isLinkFlow) {
      // ✅ LINK the phone to the already-created email/password account.
      const success = await linkPhone(verificationId, code, normalizePhoneNumber(phone));
      if (success) {
        router.replace('/(tabs)/map');
      }
    } else {
      // Existing phone-login flow
      const success = await confirmPhoneCode(verificationId, code, false);
      if (success) {
        router.replace('/(tabs)/map');
      }
    }
  };

  const handleChangeNumber = () => {
    setIsCodeStep(false);
    setVerificationId(null);
    setCode('');
    setTimer(60);
    setFormError(null);
    if (error) clearError();
  };

  const handleBackOrSkip = () => {
    if (isLinkFlow) {
      // Account is already created; they can verify later from settings.
      router.replace('/(tabs)/map');
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Verify Code</Text>
        <Text style={styles.subtitle}>
          Please enter the code we just sent to{'\n'}
          <Text style={{ fontWeight: '600' }}>
            {isCodeStep ? normalizePhoneNumber(phone) : 'your phone number'}
          </Text>
        </Text>

        {/* ✅ Phone entry (visible only when not in code step) */}
        {!isCodeStep && (
          <View style={styles.phoneInputWrap}>
            <AuthTextField
              value={phone}
              onChangeText={(val) => {
                setPhone(val);
                if (formError) setFormError(null);
                if (error) clearError();
              }}
              placeholder="Mobile number (e.g. 09171234567)"
              leftIcon="phone"
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>
        )}

        {/* OTP boxes */}
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

        {!!(formError ?? error) && <Text style={styles.error}>{String(formError ?? error)}</Text>}

        {/* Resend / change number */}
        {isCodeStep && (
          <View style={styles.resendWrap}>
            <Text style={styles.resendText}>Didn't receive OTP?</Text>
            {timer > 0 ? (
              <Text style={styles.timerText}> Resend code ({timer}s)</Text>
            ) : (
              <TouchableOpacity onPress={() => handleSendCode(true)} disabled={isLoading}>
                <Text style={styles.resendLink}> Resend code</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isCodeStep && isLinkFlow && (
          <TouchableOpacity onPress={handleChangeNumber} style={styles.changeNumberInline} disabled={isLoading}>
            <Text style={styles.changeNumberText}>Use a different number</Text>
          </TouchableOpacity>
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
              onPress={() => handleSendCode(false)}
              loading={isLoading}
              disabled={!phone}
            />
          )}
        </View>

        <TouchableOpacity style={styles.changeNumber} onPress={handleBackOrSkip}>
          <Text style={styles.changeNumberText}>
            {isLinkFlow ? 'Skip for now' : 'Back'}
          </Text>
        </TouchableOpacity>
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
    paddingTop: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },

  phoneInputWrap: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
  },

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

  error: {
    color: Colors.errorRed,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },

  resendWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resendText: {
    fontSize: 14,
    color: Colors.black,
  },
  timerText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 14,
    color: '#4285F4',
    fontWeight: '600',
  },

  changeNumberInline: {
    marginBottom: 24,
    padding: 6,
  },
  changeNumberText: {
    color: '#4285F4',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  buttonWrap: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
  },
  changeNumber: {
    padding: 10,
  },
});