import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';

interface RoadCardProps {
  title?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function RoadCard({ title, children, style }: RoadCardProps) {
  return (
    <View style={[styles.card, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.overlay,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.offWhite,
    marginBottom: 8,
  },
});
