// src/components/trip/JoinTripModal.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { joinTripByCode } from '../../services/tripService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (tripId: string) => void;
}

export function JoinTripModal({ visible, onClose, onSuccess }: Props) {
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;

    setIsJoining(true);
    try {
      const trip = await joinTripByCode(code.trim());
      setCode('');
      onSuccess(trip.id);
    } catch (error: any) {
      Alert.alert('Cannot Join', error.message || 'Failed to join trip.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={24} color={Colors.muted} />
          </TouchableOpacity>

          <Text style={styles.title}>Join a Convoy</Text>
          <Text style={styles.subtitle}>Enter the Trip Code shared by the leader.</Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. #ABC123"
            placeholderTextColor={Colors.mediumGray}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            maxLength={8}
          />

          <TouchableOpacity 
            style={[styles.joinBtn, !code.trim() && { opacity: 0.5 }]}
            onPress={handleJoin}
            disabled={!code.trim() || isJoining}
          >
            {isJoining ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.joinBtnText}>Join Trip</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', backgroundColor: Colors.offWhite, borderRadius: 24, padding: 24, alignItems: 'center' },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.black, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.muted, marginBottom: 24, textAlign: 'center' },
  input: { 
    width: '100%', 
    backgroundColor: Colors.white, 
    borderWidth: 1, 
    borderColor: Colors.lightGray, 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 18, 
    fontWeight: '600',
    textAlign: 'center',
    color: Colors.black,
    marginBottom: 24,
    letterSpacing: 2,
  },
  joinBtn: { 
    width: '100%', 
    backgroundColor: Colors.greenBtn, 
    paddingVertical: 16, 
    borderRadius: 14, 
    alignItems: 'center' 
  },
  joinBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});