import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';

interface AuthLinkProps {
  label: string;
  onPress: () => void;
}

/** Accent-coloured text link used for navigation between the auth screens. */
export function AuthLink({ label, onPress }: AuthLinkProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.button}
      hitSlop={12}
      activeOpacity={0.7}
      accessibilityRole="link"
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    minHeight: 48,
  },
  label: {
    color: Colors.accentGreen,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
