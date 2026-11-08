import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { RoadCard } from '../../src/components/ui/RoadCard';

export default function WeatherScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkpoint Weather</Text>
     
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    padding: 16,
    paddingTop: 56,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.darkGreen,
    marginBottom: 16,
    textAlign: 'center',
  },

});
