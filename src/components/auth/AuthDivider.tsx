import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';

interface AuthDividerProps {
  label?: string;
}

/** Horizontal rule with a centred label, used to separate sign-in options. */
export function AuthDivider({ label = 'or' }: AuthDividerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  label: {
    color: Colors.mediumGray,
    fontSize: 14,
    paddingHorizontal: 16,
  },
});
