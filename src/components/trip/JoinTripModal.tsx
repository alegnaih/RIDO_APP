// src/components/trip/JoinTripModal.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, 
  ActivityIndicator,KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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
  
  // ✅ State to hold the error message
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!code.trim()) return;

    setIsJoining(true);
    try {
      const trip = await joinTripByCode(code.trim());
      setCode('');
      onSuccess(trip.id);
    } catch (error: any) {
      
      // ✅ Handle the specific Schedule Clash error
      if (error.message === 'SCHEDULE_CLASH') {
        setErrorMessage(
          'The trip you are joining overlaps with a trip you already have scheduled. You cannot join a new trip within 6 hours of an existing one.'
        );
      } else {
        // Handle other errors (invalid code, already joined, etc.)
        setErrorMessage(error.message || 'Failed to join trip.');
      }

    } finally {
      setIsJoining(false);
    }
  };

  const handleErrorClose = () => {
    setErrorMessage(null);
    setCode(''); // Clear the input
    onClose();   // Close the whole join flow and return to map
  };

  return (
    <>
      {/* 1. The Main Join Modal */}
    {/* 1. The Main Join Modal */}
      <Modal
        visible={visible && !errorMessage}
        transparent
        animationType="fade">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.overlay}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
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
        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ✅ 2. The Styled Error Popup Modal */}
      <Modal visible={!!errorMessage} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons 
              name="calendar-alert" 
              size={48} 
              color={Colors.darkGreen} 
              style={{ marginBottom: 16 }} 
            />
            
            <Text style={styles.errorTitle}>Notice</Text>
            <Text style={styles.errorSubtitle}>{errorMessage}</Text>

            <TouchableOpacity style={styles.okayBtn} onPress={handleErrorClose}>
              <Text style={styles.okayBtnText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexGrow:1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '85%',
    backgroundColor: Colors.offWhite,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center'
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: Colors.muted,
    marginBottom: 24,
    textAlign: 'center'
  },
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
  joinBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700'
  },

  /* ✅ Styles for the Error Popup */
  errorContainer: {
    width: '85%',
    backgroundColor: Colors.offWhite,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center'
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.black,
    textAlign: 'center',
    marginBottom: 12
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20
  },
  okayBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: Colors.greenBtn,
    alignItems: 'center'
  },
  okayBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF'
  }
});