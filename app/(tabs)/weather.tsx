// app/(tabs)/weather.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient'; // ✅ Import Gradient

import { useAuth } from '../../src/hooks/useAuth';
import { Trip } from '../../src/types/trips';
import { Colors } from '../../src/theme/colors';
import { config } from '../../src/constants/config';
import { getTrustedTime, isTimeSynced } from '../../src/utils/time';

interface TripWithWeather extends Trip {
  weatherSummary?: {
    temp: number;
    condition: string;
    isAvailable: boolean;
  };
}

const getWeatherIcon = (condition?: string) => {
  switch (condition) {
    case 'Clear': return 'weather-sunny';
    case 'Clouds': return 'weather-cloudy';
    case 'Rain': return 'weather-pouring';
    case 'Drizzle': return 'weather-rainy';
    case 'Thunderstorm': return 'weather-lightning';
    default: return 'weather-partly-cloudy';
  }
};

const getWeatherGradient = (condition?: string) => {
  switch (condition) {
    case 'Clear': return ['#f6f4e4', '#fcf5b8']; // Yellow
    case 'Clouds': return ['#e9f6fc', '#a9c0cb']; // Light Blue
    case 'Rain': return ['#c5e2ef', '#3b99c4']; // Darker Blue
    case 'Thunderstorm': return ['#b1b9e7', '#5a66a1']; // Purple/Blue
    default: return ['#F5F5F5', '#E0E0E0']; // Gray
  }
};

export default function WeatherListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [trips, setTrips] = useState<TripWithWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncReady, setIsSyncReady] = useState(isTimeSynced());

  useEffect(() => {
    if (isSyncReady) return;
    const interval = setInterval(() => {
      if (isTimeSynced()) {
        setIsSyncReady(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isSyncReady]);

  useEffect(() => {
    if (!user?.uid || !isSyncReady) return;

    const db = getFirestore();
    const q = query(collection(db, 'trips'), where('members', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedTrips: TripWithWeather[] = [];
      const now = getTrustedTime();

      snapshot.forEach((doc) => {
        const trip = { id: doc.id, ...doc.data() } as TripWithWeather;
        const tripDate = trip.scheduledAt?.toDate()?.getTime() || 0;
        
        if (tripDate > now || trip.status === 'active') {
          fetchedTrips.push(trip);
        }
      });

      fetchedTrips.sort((a, b) => (a.scheduledAt?.toDate()?.getTime() || 0) - (b.scheduledAt?.toDate()?.getTime() || 0));

      const tripsWithWeather = await Promise.all(fetchedTrips.map(async (trip) => {
        const startDate = trip.scheduledAt?.toDate() || new Date();
        const daysUntil = (startDate.getTime() - getTrustedTime()) / (1000 * 3600 * 24);

        if (daysUntil > 5 || !trip.meetingPoint) {
          return { ...trip, weatherSummary: { isAvailable: false, temp: 0, condition: '' } };
        }

        try {
          const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${trip.meetingPoint.location.latitude}&lon=${trip.meetingPoint.location.longitude}&appid=${config.openWeatherApiKey}&units=metric`);
          const data = await res.json();
          if (data.list && data.list.length > 0) {
            const tripTimeUnix = startDate.getTime() / 1000;
            const closest = data.list.reduce((prev: any, curr: any) => 
              (Math.abs(curr.dt - tripTimeUnix) < Math.abs(prev.dt - tripTimeUnix) ? curr : prev)
            );
            return { 
              ...trip, 
              weatherSummary: { 
                isAvailable: true, 
                temp: Math.round(closest.main.temp), 
                condition: closest.weather[0].main 
              } 
            };
          }
        } catch (e) {}
        return { ...trip, weatherSummary: { isAvailable: false, temp: 0, condition: '' } };
      }));

      setTrips(tripsWithWeather);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, isSyncReady]);

  if (loading || !isSyncReady) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.greenBtn} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Weather</Text>
            <Text style={styles.headerSubtitle}>Your upcoming convoy forecasts</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="cloud-off" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No upcoming trips</Text>
            <Text style={styles.emptySub}>Create a trip to see its weather forecast.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const startDate = item.scheduledAt?.toDate() || new Date();
          const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const gradientColors = getWeatherGradient(item.weatherSummary?.condition);

          return (
            <TouchableOpacity 
              style={styles.cardWrapper} 
              onPress={() => router.push(`/trip/${item.id}/weather`)}
              activeOpacity={0.8}
            >
              
              <LinearGradient colors={gradientColors as [string, string]} style={styles.cardGradient}>
                
                {/* Left Side: Trip Details */}
                <View style={styles.cardLeft}>
                  <Text style={styles.tripTitle}>{item.title}</Text>
                  <Text style={styles.tripDate}>{dateStr} at {item.startTime}</Text>
                  
                  <View style={styles.conditionRow}>
                    <Text style={styles.conditionText}>
                      {item.weatherSummary?.isAvailable ? item.weatherSummary.condition : 'Not yet available'}
                    </Text>
                  </View>
                </View>

                {/* Right Side: Weather Icon & Temp */}
                {item.weatherSummary?.isAvailable ? (
                  <View style={styles.cardRight}>
                    <MaterialCommunityIcons 
                      name={getWeatherIcon(item.weatherSummary.condition) as any} 
                      size={48} 
                      color={Colors.black} 
                      style={{ opacity: 0.8 }}
                    />
                    <Text style={styles.tempText}>{item.weatherSummary.temp}°C</Text>
                  </View>
                ) : (
                  <View style={styles.cardRight}>
                    <Feather name="clock" size={32} color={Colors.muted} />
                  </View>
                )}

              </LinearGradient>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    padding: 20,
    paddingBottom: 100
  },
  header: {
    marginBottom: 24
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.muted,
    fontWeight: '500'
  },
  
  /* ✅ New Card Styles */
  cardWrapper:
  {
      marginBottom: 16,
      width: '100%',
  },

  cardGradient: {  
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 24,
    padding: 20,
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  cardLeft: {
    flex: 1,
  },

  tripTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 6,
  },
  tripDate: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '500',
    marginBottom: 12,
  },
  conditionRow: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.black,
  },
  cardRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  tempText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.black,
    marginTop: 4,
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    marginTop: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
});