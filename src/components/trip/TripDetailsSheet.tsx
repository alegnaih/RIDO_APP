// src/components/trip/TripDetailsSheet.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../theme/colors';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface Props {
  title: string;
  setTitle: (v: string) => void;
  date: Date | null;
  setDate: (d: Date | null) => void;
  startTime: string;
  setStartTime: (t: string) => void;
  onNext: () => void;
  onClose: () => void;
}

export function TripDetailsSheet({
  title, setTitle, date, setDate, startTime, setStartTime, onNext, onClose,
}: Props) {

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formattedDate = date 
    ? date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) 
    : '';

  // Handle Date Selection
  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    
    if (event.type === 'set') {
      const dateToUse = selectedDate || new Date();
      const newDate = new Date(dateToUse);
        if (date) {
        newDate.setHours(date.getHours());
        newDate.setMinutes(date.getMinutes());
      }
      setDate(newDate);
    }
  };

  // Handle Time Selection
  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    
    if (selectedTime) {
      const timeToUse = selectedTime || new Date();
    
      const newDate = date ? new Date(date) : new Date();
      newDate.setHours(timeToUse.getHours());
      newDate.setMinutes(timeToUse.getMinutes());
      newDate.setSeconds(0);
      setDate(newDate);
    }
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Trip</Text>

        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="x" size={24} color={Colors.black} />
        </TouchableOpacity>
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>Leader</Text>
      </View>

      <Text style={styles.label}>Trip Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Elyu Trip"
        placeholderTextColor={Colors.mediumGray}
        value={title}
        onChangeText={setTitle}
      />

      <View style={styles.row}>
        {/* ── DATE PICKER BUTTON ── */}
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity 
            style={styles.inputContainer} 
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, !date && styles.placeholderText]}>
              {formattedDate || 'mm-dd-yyyy'}
            </Text>
            <Feather name="calendar" size={16} color={Colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={{ width: 12 }} />

        {/* ── TIME PICKER BUTTON ── */}
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Start Time</Text>
          <TouchableOpacity 
            style={styles.inputContainer} 
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, !startTime && styles.placeholderText]}>
              {startTime || '00:00 AM/PM'}
            </Text>
            <Feather name="clock" size={16} color={Colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Render the Pickers conditionally */}
      {showDatePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}

      <TouchableOpacity style={styles.primaryBtn} onPress={onNext}>
        <Text style={styles.primaryBtnText}>Set Locations</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.offWhite,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 36,
    overflow: 'hidden',
    position: 'relative',
  },
  innerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.black,
  },
  close: {
    fontSize: 20,
    color: Colors.muted,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.greenBtn,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 18,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    color: Colors.muted,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    color: Colors.black,
  },
  inputContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: Colors.black,
  },
  placeholderText: {
    color: Colors.mediumGray,
  },
  row: {
    flexDirection: 'row',
  },
  primaryBtn: {
    backgroundColor: Colors.greenBtn,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});