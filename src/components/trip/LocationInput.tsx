// src/components/trip/LocationInput.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

interface Props {
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
  onClear?: () => void;
}

export function LocationInput({ label, value, placeholder, onPress, onClear }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name="location-outline" size={18} color={Colors.muted} />
        <Text style={[styles.text, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        {onClear && (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={18} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, color: Colors.muted, marginBottom: 6, fontWeight: '500' },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  text: { flex: 1, fontSize: 15, color: Colors.black },
  placeholder: { color: Colors.muted },
});