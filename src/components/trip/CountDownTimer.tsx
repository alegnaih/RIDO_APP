// src/components/trip/CountdownTimer.tsx
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { getTrustedTime } from '../../utils/time';

interface CountdownTimerProps {
  targetDate: Date;
  endDate?: Date; // ✅ Added endDate
  status?: string; 
}

export function CountdownTimer({ targetDate, endDate, status }:  CountdownTimerProps) {
  const [now, setNow] = useState(getTrustedTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(getTrustedTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startTime = targetDate.getTime();
  // Fallback to +2 hours if endDate is somehow missing
  const calculatedEndTime = endDate ? endDate.getTime() : startTime + (2 * 60 * 60 * 1000);

  // 1. If the end time + buffer has passed
  if (now >= calculatedEndTime) {
    return <Text style={styles.statusEndedText}>Convoy Trip Ended</Text>;
  }

  // 2. If it's currently ongoing (Started, but hasn't ended yet)
  if (now >= startTime && now < calculatedEndTime) {
    return <Text style={styles.statusOngoingText}>Convoy Ongoing</Text>;
  }

  // 3. Otherwise, show the countdown
  const timeLeft = startTime - now;
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Convoy Starts in</Text>
      <View style={styles.timerBox}>
        <Text style={styles.timeText}>
          {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 16,
  },
  label: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: Colors.black,
  },
  timerBox: { 
    backgroundColor: Colors.greenBg, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 25,
  },
  timeText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.greenBtn,
  },
  statusEndedText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: Colors.danger, 
    marginBottom: 16,
  },
  statusOngoingText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.greenBtn, // Green text for ongoing
    marginBottom: 16,
  },
});