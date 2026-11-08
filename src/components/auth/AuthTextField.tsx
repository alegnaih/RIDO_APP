// src/components/auth/AuthTextField.tsx
import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

interface AuthTextFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  isPassword?: boolean;
  maxLength?: number;
  editable?: boolean;
  leftIcon?: 'email' | 'lock' | 'user' | 'phone';
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
}

export function AuthTextField({
  value,
  onChangeText,
  placeholder,
  isPassword = false,
  maxLength,
  editable = true,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  textContentType,
  leftIcon,
}: AuthTextFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <View style={styles.wrapper}>
      {leftIcon === 'email' && <Feather name="mail" size={18} color="#999" style={styles.leftIcon} />}
      {leftIcon === 'lock' && <Feather name="lock" size={18} color="#999" style={styles.leftIcon} />}
      {leftIcon === 'user' && <Feather name="user" size={18} color="#999" style={styles.leftIcon} />}
      {leftIcon === 'phone' && <Feather name="phone" size={18} color="#999" style={styles.leftIcon} />}

      <TextInput
        style={[styles.input, isPassword && styles.passwordInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.mediumGray}
        secureTextEntry={isPassword && !isRevealed}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        textContentType={textContentType}
        maxLength={maxLength}
        editable={editable}
        autoCorrect={false}
      />

      {isPassword ? (
        <TouchableOpacity
          onPress={() => setIsRevealed((previous) => !previous)}
          style={styles.toggle}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel={isRevealed ? 'Hide password' : 'Show password'}
        >
          <Text style={styles.toggleText}>{isRevealed ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightSurface,
    borderColor: Colors.darkGreen,
    borderWidth: 1,
    borderRadius: 10,
    height: 41,
    paddingHorizontal: 12,
  },
  leftIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
    opacity: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontSize: 16,
  },
  passwordInput: {
    paddingRight: 72,
  },
  toggle: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  toggleText: {
    color: Colors.darkGreen,
    fontSize: 14,
    fontWeight: '600',
  },
});