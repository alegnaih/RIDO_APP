import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Colors } from '../../theme/colors'; // Adjust path as needed

interface CustomNoticeProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  buttonText?: string;
  onButtonPress?: () => void;
}

export function CustomNotice({
  isVisible,
  onClose,
  title = "Notice",
  message,
  buttonText = "Okay",
  onButtonPress
}: CustomNoticeProps) {
  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          
          {/* Replace with your actual icon component/image */}
          <Image 
            source={require('../../../assets/icon.png')} // Placeholder for your calendar icon
            style={{ width: 40, height: 40, marginBottom: 16, tintColor: Colors.darkGreen }} 
            resizeMode="contain"
          />
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity 
            style={styles.button} 
            onPress={onButtonPress || onClose}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>

          {/* Optional: Small 'X' or tap-outside to close if needed */}
          {onButtonPress && (
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.darkGreen, // The green from your screenshot
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
  },
  cancelText: {
    color: '#999',
    fontSize: 14,
  }
});