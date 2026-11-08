// src/components/trip/CountdownTimer.tsx
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

export function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState(targetDate.getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(targetDate.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft <= 0) {
    return <Text style={styles.started}>Convoy Started!</Text>;
  }

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
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  label: { fontSize: 18, fontWeight: '700', color: Colors.black },
  timerBox: { backgroundColor: Colors.greenBg, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25 },
  timeText: { fontSize: 16, fontWeight: '600', color: Colors.greenBtn },
  started: { fontSize: 18, fontWeight: '700', color: Colors.danger, marginBottom: 16 },
});