import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, GestureResponderEvent } from 'react-native';
import { Colors } from '../../theme/colors';

interface RoadButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}

export function RoadButton({ title, onPress, disabled, loading, variant = 'primary', style }: RoadButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        style,
      ]}
      hitSlop={12}
    >
      {loading ? (
        <Text style={[styles.text, isPrimary ? styles.primaryText : styles.secondaryText]}>Loading…</Text>
      ) : (
        <Text style={[styles.text, isPrimary ? styles.primaryText : styles.secondaryText, disabled && { opacity: 0.5 }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: Colors.darkGreen,
  },
  secondary: {
    backgroundColor: Colors.lightGreen,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  primaryText: {
    color: Colors.black,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryText: {
  //  color: Colors.offWhite,
    fontWeight: '700',
    fontSize: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
