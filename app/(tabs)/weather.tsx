// app/(tabs)/weather.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../src/hooks/useAuth';
import { Trip } from '../../src/types/trips';
import { Colors } from '../../src/theme/colors';
import { config } from '../../src/constants/config';

interface TripWithWeather extends Trip {
  weatherSummary?: {
    temp: number;
    condition: string;
    isAvailable: boolean;
  };
}

export default function WeatherListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [trips, setTrips] = useState<TripWithWeather[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestore();
    const q = query(collection(db, 'trips'), where('members', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedTrips: TripWithWeather[] = [];
      const now = new Date().getTime();

      snapshot.forEach((doc) => {
        const trip = { id: doc.id, ...doc.data() } as TripWithWeather;
        const tripDate = trip.scheduledAt?.toDate()?.getTime() || 0;
        
        // Only show trips that haven't happened yet
        if (tripDate > now || trip.status === 'active') {
          fetchedTrips.push(trip);
        }
      });

      // Sort upcoming first
      fetchedTrips.sort((a, b) => (a.scheduledAt?.toDate()?.getTime() || 0) - (b.scheduledAt?.toDate()?.getTime() || 0));

      // Fetch weather for each trip
      const tripsWithWeather = await Promise.all(fetchedTrips.map(async (trip) => {
        const startDate = trip.scheduledAt?.toDate() || new Date();
        const daysUntil = (startDate.getTime() - Date.now()) / (1000 * 3600 * 24);

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
  }, [user?.uid]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.greenBtn} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        ListHeaderComponent={
          <View style={styles.header}>
              <Text style={styles.pillTitleText}>Weather</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No upcoming trips to show weather for.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const startDate = item.scheduledAt?.toDate() || new Date();
          const dateStr = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          
          // Choose background based on weather (mock images, replace with local assets)
          const bgImage = item.weatherSummary?.condition === 'Rain' 
            ? 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=600&auto=format&fit=crop' // Rain
            : 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?q=80&w=600&auto=format&fit=crop'; // Sunny

          return (
            <TouchableOpacity 
              style={styles.card} 
                onPress={() => router.push({
                pathname: '/trip/[id]/weather',
                params: { id: item.id }
              })}
              activeOpacity={0.9}
            >
              <ImageBackground source={{ uri: bgImage }} style={styles.cardBg} imageStyle={{ borderRadius: 20 }}>
                <View style={styles.cardOverlay}>
                  <View style={styles.cardTop}>
                    <Text style={styles.tripTitle}>{item.title}</Text>
                  </View>
                  <View style={styles.cardBottom}>
                    <View>
                      <Text style={styles.tripRoute}>Route Weather</Text>
                      <Text style={styles.tripDate}>{dateStr} {item.startTime}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.tripRoute}>Overview</Text>
                      <Text style={styles.weatherSummary}>
                        {!item.weatherSummary?.isAvailable ? 'Not yet available' : item.weatherSummary.condition}
                      </Text>
                    </View>
                  </View>
                </View>
              </ImageBackground>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  pillTitle: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20
  },
  pillTitleText: {
    color: Colors.black,
    fontSize: 28,
    fontWeight: '600'
  },
  card: {
    height: 100,
    marginBottom: 16
  },
  cardBg: {
    width: '100%',
    height: '100%'
  },
  cardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between'
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  tripTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700'
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  tripRoute: {
    color: '#DDD',
    fontSize: 11,
    marginBottom: 4
  },
  tripDate: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '500'
  },
  weatherSummary: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700'
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40
  },
  emptyText: {
    color: Colors.muted,
    fontSize: 14
  },
});