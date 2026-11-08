// app/trip/[id]/weather.tsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import MapboxGL from '@rnmapbox/maps';
import BottomSheet, { BottomSheetScrollView, BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, FlatList } from 'react-native-gesture-handler'; 
import * as turf from '@turf/turf'; 

import { Trip } from '../../../src/types/trips';
import { Colors } from '../../../src/theme/colors';
import { config } from '../../../src/constants/config';

const getWeatherIcon = (condition: string) => {
  switch (condition) {
    case 'Rain': return 'weather-pouring';
    case 'Clouds': return 'weather-cloudy';
    case 'Clear': return 'weather-sunny';
    default: return 'weather-partly-cloudy';
  }
};

export default function WeatherDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [weatherPins, setWeatherPins] = useState<any[]>([]); 
  const [timelinePins, setTimelinePins] = useState<any[]>([]); 
  const [weatherAvailable, setWeatherAvailable] = useState(true);

  const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
  const [allPointForecasts, setAllPointForecasts] = useState<any[][]>([]);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '70%'], []);

  // 1. Fetch Trip Data
  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(getFirestore(), 'trips', id), (docSnap) => {
      if (docSnap.exists()) setTrip({ id: docSnap.id, ...docSnap.data() } as Trip);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // 2. Parse Route Geometry
  const parsedRoute = useMemo(() => {
    if (!trip?.routeGeometry) return null;
    try {
      const geom = typeof trip.routeGeometry === 'string' ? JSON.parse(trip.routeGeometry) : trip.routeGeometry;
      return geom;
    } catch { return null; }
  }, [trip?.routeGeometry]);

  // 3. Calculate Total Drive Time
  const totalDriveTimeString = useMemo(() => {
    if (!trip || !(trip as any).routeLegDurations) return '--';
    
    const totalSeconds = (trip as any).routeLegDurations.reduce((acc: number, curr: number) => acc + curr, 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.round((totalSeconds % 3600) / 60);

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [trip]);

  // 4. Fetch Weather & Calculate ETAs
  useEffect(() => {
    if (!trip || !trip.scheduledAt || !trip.meetingPoint) return;

    const fetchAllWeather = async () => {
      const startDate = trip.scheduledAt!.toDate();
      const daysUntil = (startDate.getTime() - Date.now()) / (1000 * 3600 * 24);
      
      if (daysUntil > 5) {
        setWeatherAvailable(false);
        return;
      }

      const mainPoints = [];
      if (trip.meetingPoint) mainPoints.push({ name: trip.meetingPoint.name, type: 'Start', address: trip.meetingPoint.address, location: trip.meetingPoint.location });
      trip.stopovers?.forEach((s, i) => mainPoints.push({ name: s.name, type: `Stopover ${i + 1}`, address: s.address, location: s.location }));
      if (trip.endPoint) mainPoints.push({ name: trip.endPoint.name, type: 'Destination', address: trip.endPoint.address, location: trip.endPoint.location });

      const forecasts: any[][] = [];
      const mapPins: any[] = [];
      const tPins: any[] = [];
      let cumulativeMins = 0;

      // Fetch weather for Main Route Points
      for (let i = 0; i < mainPoints.length; i++) {
        const point = mainPoints[i];
        
        const durationSecs = (trip as any).routeLegDurations?.[i - 1] || 0;
        if (i > 0) cumulativeMins += Math.round(durationSecs / 60);
        
        const etaDate = new Date(startDate.getTime() + cumulativeMins * 60000);
        const etaString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        try {
          const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${point.location.latitude}&lon=${point.location.longitude}&appid=${config.openWeatherApiKey}&units=metric`);
          const data = await res.json();
          
          if (data.list) {
            const targetDay = startDate.toDateString();
            const dayForecast = data.list.filter((item: any) => new Date(item.dt * 1000).toDateString() === targetDay);
            
            let closestForecast = dayForecast[0] || data.list[0];
            if (dayForecast.length > 0) {
              const etaUnix = etaDate.getTime() / 1000;
              closestForecast = dayForecast.reduce((prev: any, curr: any) => 
                Math.abs(curr.dt - etaUnix) < Math.abs(prev.dt - etaUnix) ? curr : prev
              );
            }

            // ✅ REVERTED: Push the whole day, exactly as before
            forecasts.push(dayForecast.length > 0 ? dayForecast : data.list.slice(0, 8));

            const pinData = {
              latitude: point.location.latitude,
              longitude: point.location.longitude,
              temp: Math.round(closestForecast.main.temp),
              condition: closestForecast.weather[0].main,
              eta: etaString,
              arrivalDate: etaDate
            };

            mapPins.push(pinData);
            tPins.push(pinData);
          }
        } catch (e) { 
          console.error(e); 
          forecasts.push([]); 
          const fallbackPin = { latitude: point.location.latitude, longitude: point.location.longitude, temp: 0, condition: 'Clear', eta: etaString, arrivalDate: etaDate };
          mapPins.push(fallbackPin);
          tPins.push(fallbackPin);
        }
      }

      // ✅ Midpoint Logic (Only adds to mapPins, NOT timelinePins)
      const totalDistanceKm = parseFloat((trip as any).totalDistance?.replace('km', '') || '0');
      if (totalDistanceKm >= 45 && parsedRoute) {
        try {
          const routeLength = turf.length(parsedRoute.geometry, { units: 'kilometers' });
          
          const totalDurationSecs = (trip as any).routeLegDurations?.reduce((a: number, b: number) => a + b, 0) || 0;
          const avgSpeedKmPerSec = totalDurationSecs > 0 ? routeLength / totalDurationSecs : 0;

          for (let i = 20; i < routeLength; i += 20) {
            const point = turf.along(parsedRoute.geometry, i, { units: 'kilometers' });
            const midpointDurationSecs = avgSpeedKmPerSec > 0 ? i / avgSpeedKmPerSec : 0;
            const etaDate = new Date(startDate.getTime() + midpointDurationSecs * 1000);
            const etaString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${point.geometry.coordinates[1]}&lon=${point.geometry.coordinates[0]}&appid=${config.openWeatherApiKey}&units=metric`);
            const data = await res.json();
            
            if (data.list) {
              const targetDay = startDate.toDateString();
              const dayForecast = data.list.filter((item: any) => new Date(item.dt * 1000).toDateString() === targetDay);
              
              let closestForecast = dayForecast[0] || data.list[0];
              if (dayForecast.length > 0) {
                const etaUnix = etaDate.getTime() / 1000;
                closestForecast = dayForecast.reduce((prev: any, curr: any) => 
                  Math.abs(curr.dt - etaUnix) < Math.abs(prev.dt - etaUnix) ? curr : prev
                );
              }

              mapPins.push({
                latitude: point.geometry.coordinates[1],
                longitude: point.geometry.coordinates[0],
                temp: Math.round(closestForecast.main.temp),
                condition: closestForecast.weather[0].main,
                eta: etaString,
                isMidpoint: true
              });
            }
          }
        } catch (e) { console.log("Error adding midpoint pins:", e); }
      }

      setAllPointForecasts(forecasts);
      setWeatherPins(mapPins); 
      setTimelinePins(tPins);  
    };

    fetchAllWeather();
  }, [trip, parsedRoute]);

  const renderHandle = useCallback((props: BottomSheetHandleProps) => (
    <View style={styles.handleContainer}>
      <View style={styles.handleBar} />
    </View>
  ), []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.greenBtn} /></View>;
  if (!trip) return <View style={styles.center}><Text>Trip not found.</Text></View>;

  const startWeather = allPointForecasts[0]?.[0];

  return (
    <View style={styles.container}>
      <MapboxGL.MapView style={styles.map} styleURL={config.mapStyleUrl} logoEnabled={false} scaleBarEnabled={false}>
        <MapboxGL.Camera 
          bounds={{
            ne: [Math.max(trip.meetingPoint!.location.longitude, trip.endPoint!.location.longitude), Math.max(trip.meetingPoint!.location.latitude, trip.endPoint!.location.latitude)],
            sw: [Math.min(trip.meetingPoint!.location.longitude, trip.endPoint!.location.longitude), Math.min(trip.meetingPoint!.location.latitude, trip.endPoint!.location.latitude)],
            paddingTop: 100, paddingBottom: 400, paddingLeft: 50, paddingRight: 50
          }}
        />

        {parsedRoute && (
          <MapboxGL.ShapeSource id="routeSource" shape={parsedRoute}>
            <MapboxGL.LineLayer id="routeLayer" style={{ lineColor: '#5A3EE5', lineWidth: 5 }} />
          </MapboxGL.ShapeSource>
        )}

        {weatherPins.map((pin, index) => (
          <MapboxGL.PointAnnotation key={`pin-${index}`} id={`pin-${index}`} coordinate={[pin.longitude, pin.latitude]}>
            <View style={styles.weatherPin}>
              <MaterialCommunityIcons name={getWeatherIcon(pin.condition) as any} size={20} color={Colors.black} />
              <Text style={styles.pinTemp}>{pin.temp}°C</Text>
              <Text style={styles.pinEta}>{pin.eta}</Text>
            </View>
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 16 }]} onPress={() => router.back()}>
        <Feather name="chevron-left" size={24} color={Colors.black} />
      </TouchableOpacity>
      
      <View style={[styles.pillTitle, { top: insets.top + 16 }]}>
        <Text style={styles.pillTitleText}>Weather Along Route</Text>
      </View>

      <View style={[styles.floatingSummaryBar, { top: insets.top + 75 }]}>
        <View style={styles.summaryItem}>
          <FontAwesome name="motorcycle" size={20} color={Colors.black} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>{(trip as any)?.totalDistance || '-- km'}</Text>
          </View>
        </View>
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons name="clock-outline" size={20} color={Colors.black} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.summaryLabel}>Drive time</Text>
            <Text style={styles.summaryValue}>{totalDriveTimeString}</Text>
          </View>
        </View>
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons name="weather-partly-cloudy" size={20} color={Colors.black} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.summaryLabel}>Overview</Text>
            <Text style={styles.summaryValue}>{startWeather?.weather[0].main || 'Sunny'}</Text>
          </View>
        </View>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={0} 
        snapPoints={snapPoints}
        handleComponent={renderHandle}
        backgroundStyle={{ backgroundColor: Colors.offWhite, borderRadius: 24 }}
        enablePanDownToClose={false}
        enableOverDrag={false}
        enableDynamicSizing={false}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          
          {!weatherAvailable ? (
            <Text style={styles.noDataText}>Weather info will be available within 5 days of the trip.</Text>
          ) : (
            <>
              <View style={styles.sectionHeaderRow}>
                <Feather name="map-pin" size={16} color={Colors.black} />
                <Text style={styles.sectionTitle}>Trip Timeline</Text>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingVertical: 10, paddingRight: 20 }}
              >
                {timelinePins.map((pin, index) => {
                  const pointWeather = allPointForecasts[index]?.[0]; 
                  const distance = (trip as any).routeLegDistances?.[index];
                  const durationSecs = (trip as any).routeLegDurations?.[index];
                  const durationMins = durationSecs ? Math.round(durationSecs / 60) : null;
                  const isSelected = selectedLocationIndex === index;

                  return (
                    <React.Fragment key={index}>
                      <TouchableOpacity 
                        onPress={() => setSelectedLocationIndex(index)}
                        style={[styles.timelineCard, isSelected && { borderColor: Colors.greenBtn, borderWidth: 2 }]}
                      >
                        <View style={styles.timelineHeader}>
                          <Text style={styles.timelineLoc} numberOfLines={1}>
                            {index === 0 ? trip.meetingPoint?.name : index === timelinePins.length - 1 ? trip.endPoint?.name : trip.stopovers?.[index - 1]?.name || 'Stop'}
                          </Text>
                          <View style={[styles.startBadge, isSelected && { backgroundColor: Colors.greenBtn }]}>
                            <Text style={[styles.startBadgeText, isSelected && { color: Colors.white }]}>
                              {index === 0 ? 'Start' : index === timelinePins.length - 1 ? 'End' : `Stop ${index}`}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.timelineWeatherRow}>
                          <MaterialCommunityIcons name={getWeatherIcon(pointWeather?.weather[0].main) as any} size={32} color={Colors.black} />
                          <Text style={styles.timelineTemp}>{pointWeather ? Math.round(pointWeather.main.temp) : '--'}°C</Text>
                        </View>
                        <Text style={styles.timelineCond}>{pointWeather?.weather[0].main || '--'}</Text>
                        
                        <View style={[styles.timeBox, isSelected && { backgroundColor: Colors.greenBg }]}>
                          <Text style={[styles.timeText, isSelected && { color: Colors.darkGreen }]}>
                            {pin.eta || '--:--'}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {index < timelinePins.length - 1 && (
                        <View style={styles.midArrow}>
                          <View style={styles.routeInfo}>
                            <Text style={styles.routeInfoText}>{durationMins ? `${durationMins} min` : '--'}</Text>
                            <Text style={styles.routeInfoSub}>{distance || '--'}</Text>
                          </View>
                          <MaterialCommunityIcons name="motorbike" size={24} color={Colors.greenBtn} />
                        </View>
                      )}
                    </React.Fragment>
                  );
                })}
              </ScrollView>

              <View style={styles.sectionHeaderRow}>
                <Feather name="clock" size={16} color={Colors.black} />
                <Text style={styles.sectionTitle}>
                  Hourly Forecast ({selectedLocationIndex === 0 ? trip.meetingPoint?.name : selectedLocationIndex === timelinePins.length - 1 ? trip.endPoint?.name : trip.stopovers?.[selectedLocationIndex - 1]?.name})
                </Text>
              </View>
              
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true} 
                data={allPointForecasts[selectedLocationIndex] || []}
                keyExtractor={(item) => item.dt.toString()}
                contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
                renderItem={({ item }) => {
                  const date = new Date(item.dt * 1000);
                  return (
                    <View style={styles.hourlyCard}>
                      <Text style={styles.hourlyTime}>{date.toLocaleDateString([], { weekday: 'short' })}</Text>
                      <Text style={styles.hourlyTime}>{date.toLocaleDateString([], { day: 'numeric', month: 'short' })}</Text>
                      <MaterialCommunityIcons 
                        name={getWeatherIcon(item.weather[0].main) as any} 
                        size={28} 
                        color={Colors.warning} 
                        style={{ marginVertical: 12 }}
                      />
                      <Text style={styles.hourlyTemp}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      <Text style={styles.hourlyTemp}>{Math.round(item.main.temp)}°C</Text>
                    </View>
                  );
                }}
              />

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Travel Conditions ({selectedLocationIndex === 0 ? 'Start' : `Stop ${selectedLocationIndex}`})</Text>
              </View>
              
              <View style={styles.conditionsGrid}>
                <View style={styles.conditionCard}>
                  <MaterialCommunityIcons name="weather-windy" size={28} color={Colors.success} />
                  <Text style={styles.conditionTitle}>Wind</Text>
                  <Text style={styles.conditionValue}>{allPointForecasts[selectedLocationIndex]?.[0]?.wind.speed ? Math.round(allPointForecasts[selectedLocationIndex][0].wind.speed * 3.6) : '--'} km/h</Text>
                </View>
                <View style={styles.conditionCard}>
                  <MaterialCommunityIcons name="weather-rainy" size={28} color="#4A90E2" />
                  <Text style={styles.conditionTitle}>Rain Risk</Text>
                  <Text style={styles.conditionValue}>{allPointForecasts[selectedLocationIndex]?.[0] ? Math.round((allPointForecasts[selectedLocationIndex][0].pop || 0) * 100) : '--'}%</Text>
                </View>
                <View style={styles.conditionCard}>
                  <MaterialCommunityIcons name="eye-outline" size={28} color="#50E3C2" />
                  <Text style={styles.conditionTitle}>Visibility</Text>
                  <Text style={styles.conditionValue}>{allPointForecasts[selectedLocationIndex]?.[0]?.visibility ? (allPointForecasts[selectedLocationIndex][0].visibility / 1000).toFixed(1) : '--'} km</Text>
                </View>
                <View style={styles.conditionCard}>
                  <MaterialCommunityIcons name="thermometer" size={28} color={Colors.warning} />
                  <Text style={styles.conditionTitle}>Comfort</Text>
                  <Text style={styles.conditionValue}>{allPointForecasts[selectedLocationIndex]?.[0]?.main.feels_like ? Math.round(allPointForecasts[selectedLocationIndex][0].main.feels_like) : '--'}°C</Text>
                </View>
              </View>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
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
  map: {
    flex: 1
  },

  /* Header Elements */
  headerOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    zIndex: 10
  },
  pillTitle: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: Colors.darkGreen,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 4,
    zIndex: 10
  },
  pillTitleText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14
  },

  /* Map Pins */
  weatherPin: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginBottom: 10
  },
  pinTemp: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.black
  },
  pinEta: {
    fontSize: 10,
    color: Colors.muted,
    marginTop: 2
  },

  /* Bottom Sheet */
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#B0B0B0',
    borderRadius: 3
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 100
  },

  /* Floating Summary Bar */
  floatingSummaryBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 10
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.muted,
    marginBottom: 2
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.black
  },

  /* Section Headers */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.black
  },

  /* Trip Timeline */
  timelineCard: {
    width: 150,
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    elevation: 2
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  timelineLoc: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.black,
    flex: 1
  },
  startBadge: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  startBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.muted
  },
  timelineWeatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4
  },
  timelineTemp: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.black
  },
  timelineCond: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 12
  },
  timeBox: {
    backgroundColor: '#FAFAFA',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.greenBtn
  },
  midArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  routeInfo: {
    alignItems: 'center',
    marginBottom: 4
  },
  routeInfoText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.black
  },
  routeInfoSub: {
    fontSize: 9,
    color: Colors.muted
  },

  /* Hourly Forecast */
  hourlyCard: {
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.lightGray,
    minWidth: 75
  },
  hourlyTime: {
    fontSize: 11,
    color: Colors.muted,
    marginBottom: 2
  },
  hourlyTemp: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.black,
    marginTop: 4
  },

  /* Travel Conditions */
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8
  },
  conditionCard: {
    width: '48%',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.lightGray
  },
  conditionTitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 8,
    marginBottom: 4
  },
  conditionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.black
  },
  
  noDataText: {
    fontSize: 13,
    color: Colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20
  },
});