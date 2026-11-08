// src/components/trip/TripCodeModal.tsx
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard'; // Make sure to run: npx expo install expo-clipboard
import { Feather } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  tripCode: string;
  onClose: () => void;
}

export function TripCodeModal({ visible, tripCode, onClose }: Props) {
  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(tripCode);
    // Optional: Add a toast here if you have a toast library
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Trip Created!</Text>
          <Text style={styles.subtitle}>Send the code so people can join.</Text>

          <TouchableOpacity style={styles.codeBox} onPress={copyToClipboard} activeOpacity={0.7}>
            <Text style={styles.codeText}>#{tripCode}</Text>
            <Feather name="copy" size={24} color="#D1D1D1" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', backgroundColor: '#5B7558', borderRadius: 24, padding: 32, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 8, fontStyle: 'italic' },
  subtitle: { fontSize: 14, color: '#FFF', marginBottom: 24, textAlign: 'center' },
  codeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A6347', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, marginBottom: 24, width: '100%', justifyContent: 'space-between' },
  codeText: { fontSize: 28, fontWeight: '800', color: '#FFF', letterSpacing: 2 },
  doneBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  doneText: { color: '#FFF', fontSize: 16, textDecorationLine: 'underline' },
});