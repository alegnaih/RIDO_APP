// src/components/map/MapStyleSelector.tsx
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image, Modal } from 'react-native'; 
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMapStore, MAP_STYLES } from '../../store/useMapStore';
import { Colors } from '../../theme/colors';
import { config } from '../../constants/config';

interface Props {
  style?: any;
}

export function MapStyleSelector({ style }: Props) {
  const { styleIndex, setStyleIndex } = useMapStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <TouchableOpacity 
        style={[styles.floatingBtn, style]} 
        onPress={() => setIsOpen(true)} 
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="layers-outline" size={24} color={Colors.black} />
      </TouchableOpacity>

      {/* Standard Modal acting as a Bottom Sheet */}
      <Modal visible={isOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          {/* Tap outside to close */}
          <TouchableOpacity style={styles.modalDismissArea} onPress={() => setIsOpen(false)} />
          
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.handleContainer} 
              onPress={() => setIsOpen(false)}
            >
              <MaterialCommunityIcons name="chevron-down" size={32} color={Colors.black} />
            </TouchableOpacity>
            
            <Text style={styles.sheetTitle}>Map Type</Text>
            
            <View style={styles.optionsRow}>
              {MAP_STYLES.map((mapStyle, index) => (
                <TouchableOpacity 
                  key={mapStyle.name}
                  style={styles.optionWrapper}
                  onPress={() => {
                    setStyleIndex(index);
                    setIsOpen(false); 
                  }}
                >
                  <View style={[
                    styles.imageContainer, 
                    styleIndex === index && styles.imageContainerActive
                  ]}>
                    <Image 
                      source={{ 
                        uri: `https://api.mapbox.com/styles/v1/mapbox/${mapStyle.previewId}/static/121.0,14.5,11,0/150x150?access_token=${config.mapboxAccessToken}`
                      }} 
                      style={styles.previewImage} 
                    />
                  </View>
                  <Text style={[
                    styles.optionText,
                    styleIndex === index && styles.optionTextActive
                  ]}>
                    {mapStyle.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingBtn: {
    position: 'absolute',
    width: 48,
    height: 48,
    backgroundColor: Colors.offWhite,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 5,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'flex-end', 
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: Colors.offWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: 250,
  },
  
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 24,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionWrapper: {
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#EAEAEA',
  },
  imageContainerActive: {
    borderColor: Colors.greenBtn,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
  },
  optionTextActive: {
    fontWeight: '700',
    color: Colors.black,
  }
});