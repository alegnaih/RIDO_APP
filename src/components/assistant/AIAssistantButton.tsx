import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { generateTravelResponse } from '../../api/ai';
import { ChatMessage, GeoPoint } from '../../types';
import * as Speech from 'expo-speech';
import { config } from '../../constants/config';

interface AIAssistantButtonProps {
  userLocation?: GeoPoint | null;
}

export function AIAssistantButton({ userLocation }: AIAssistantButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'RIDO Assistant: How can I help with your convoy ride? Ask for nearby gas stations, eateries, or safety tips.',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (modalVisible) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [modalVisible, messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isResponding) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: inputText.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsResponding(true);

    try {
      const response = await generateTravelResponse(
        updatedMessages,
        userLocation?.latitude,
        userLocation?.longitude,
      );

      const aiMessage: ChatMessage = {
        role: 'model',
        text: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (Platform.OS !== 'web') {
        Speech.speak(response, { rate: 0.9 });
      }
    } catch {
      const errorMessage: ChatMessage = {
        role: 'model',
        text: 'RIDO Assistant: I could not reach the AI service. Check your API key and connection.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsResponding(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        hitSlop={12}
      >
       
        <Text style={styles.fabLabel}>Ask AI</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>RIDO Travel Assistant</Text>
                {userLocation && (
                  <Text style={styles.locationText}>
                    lat: {userLocation.latitude.toFixed(4)}, lon: {userLocation.longitude.toFixed(4)}
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    setMessages([
                      {
                        role: 'model',
                        text: 'RIDO Assistant: How can I help with your convoy ride? Ask for nearby gas stations, eateries, or safety tips.',
                        timestamp: Date.now(),
                      },
                    ]);
                    setInputText('');
                  }}
                  hitSlop={12}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                ref={flatListRef as any}
                data={messages}
                keyExtractor={(item, index) => `${item.timestamp}-${index}`}
                renderItem={renderMessage}
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                showsVerticalScrollIndicator={false}
              />

              <KeyboardAvoidingView
                style={styles.inputContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask about nearby POIs, road conditions..."
                  placeholderTextColor={Colors.mediumGray}
                  multiline
                  maxLength={500}
                  autoFocus={false}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!inputText.trim() || isResponding) && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || isResponding}
                  hitSlop={8}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 16,
    top: '50%',
    marginTop: -56,
    backgroundColor: Colors.overlay,
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
    minWidth: 56,
    alignItems: 'center',
    borderColor: Colors.border,
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 24,
  },
  fabLabel: {
    fontSize: 10,
    color: Colors.offWhite,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    flex: 1,
    //backgroundColor: Colors.darkGreen,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 40,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.offWhite,
  },
  locationText: {
    fontSize: 11,
    color: Colors.mediumGray,
  },
  closeButton: {
    fontSize: 20,
    color: Colors.mediumGray,
    fontWeight: '600',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: Colors.lightGreen,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: Colors.darkGreen,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    color: Colors.offWhite,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.offWhite,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    backgroundColor: Colors.lightGreen,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: Colors.darkGreen,
    fontSize: 14,
    fontWeight: '700',
  },
});
