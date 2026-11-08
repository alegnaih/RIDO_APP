//app/trip/[id].tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import * as turf from '@turf/turf';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Trip } from '../../src/types/trips';
import { useAuth } from '../../src/hooks/useAuth';
import { useTripDraftStore } from '../../src/store/useTripDraftStore';
import { RoutePreviewMap } from '../../src/components/trip/RoutePreviewMap';
import { CountdownTimer } from '../../src/components/trip/CountDownTimer';
import { updateTrip } from '../../src/services/tripService';
import { Colors } from '../../src/theme/colors';
import { config } from '../../src/constants/config';

// ✅ 1. Added Weather Icon Helper
const getWeatherIcon = (condition: string) => {
  switch (condition) {
    case 'Rain': return '🌧️';
    case 'Clouds': return '☁️';
    case 'Clear': return '☀️';
    case 'Drizzle': return '🌦️';
    case 'Thunderstorm': return '⛈️';
    case 'Snow': return '❄️';
    default: return '⛅';
  }
};

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const draft = useTripDraftStore();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  // UI Toggles
  const [isRouteVisible, setIsRouteVisible] = useState(true);
  const [isMembersVisible, setIsMembersVisible] = useState(true);
  const [showMaximizedMap, setShowMaximizedMap] = useState(false);

  // --- Edit States ---
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isEditingStray, setIsEditingStray] = useState(false);

  // Edit Values
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStray, setEditStray] = useState(50);

  // Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Weather
  const [weatherPins, setWeatherPins] = useState<any[]>([]);
  const [routeWeather, setRouteWeather] = useState<Record<string, any>>({});
  const [isWeatherAvailable, setIsWeatherAvailable] = useState(true);

  const isLeader = trip?.createdBy === user?.uid;

  // 1. Fetch Trip Data
  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(getFirestore(), 'trips', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Trip;
        setTrip({ ...data, id: docSnap.id });
        
        // Initialize edit states
        setEditTitle(data.title || '');
        setEditDate(data.scheduledAt?.toDate() || null);
        setEditStartTime(data.startTime || '');
        setEditDesc(data.description || '');
        setEditStray(data.strayThreshold || 50);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // 2. Fetch Weather
  useEffect(() => {
    if (!trip || !config.openWeatherApiKey || !trip.scheduledAt) return;

    const startDate = trip.scheduledAt.toDate() || new Date();
    const daysUntilTrip = (startDate.getTime() - Date.now()) / (1000 * 3600 * 24);
    
    if (daysUntilTrip > 5) {
      setIsWeatherAvailable(false);
      return;
    }

    setIsWeatherAvailable(true);
    setWeatherPins([]);
    const tempRouteWeather: Record<string, any> = {};

    // ✅ 2. Get actual durations from Firebase
    const durations = (trip as any).routeLegDurations || [];

    const fetchWeather = async (lat: number, lng: number, key: string, cumulativeDurationSec: number, isIntermediate = false) => {
      try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${config.openWeatherApiKey}&units=metric`);
        const data = await res.json();
        
        if (!data.list || !data.list.length) return;

        // ✅ 3. Accurate ETA Calculation based on cumulative durations
        const etaTime = new Date(startDate.getTime() + (cumulativeDurationSec * 1000));
        const etaString = etaTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
      //  console.log(`📍 Pin: ${key} | Cumulative Secs: ${cumulativeDurationSec} | ETA: ${etaString}`); // ✅ Debug log
        
        const etaTimeUnix = etaTime.getTime() / 1000;
        const closestForecast = data.list.reduce((prev: any, curr: any) => {
          return (Math.abs(curr.dt - etaTimeUnix) < Math.abs(prev.dt - etaTimeUnix) ? curr : prev);
        });
        
        const rainChance = Math.round((closestForecast.pop || 0) * 100);
        
        const weatherItem = {
          latitude: lat, longitude: lng,
          temp: Math.round(closestForecast.main.temp),
          condition: closestForecast.weather[0].main,
          rainChance: rainChance,
          eta: etaString,
          isIntermediate
        };

        tempRouteWeather[key] = weatherItem;
        setRouteWeather({ ...tempRouteWeather });
        setWeatherPins(prev => [...prev, weatherItem]);
      } catch (err) {
        console.error("Weather fetch error", err);
      }
    };

    // 1. Fetch Start Location (0 seconds elapsed)
    let cumulativeSecs = 0;
    if (trip.meetingPoint) {
      fetchWeather(trip.meetingPoint.location.latitude, trip.meetingPoint.location.longitude, 'start', 0);
    }

    // 2. Fetch Stopovers and Destination (Domino effect)
    trip.stopovers?.forEach((stop, i) => {
      cumulativeSecs += (durations[i] || 0); 
      fetchWeather(stop.location.latitude, stop.location.longitude, `stop-${i}`, cumulativeSecs);
    });

    if (trip.endPoint) {
      cumulativeSecs += (durations[trip.stopovers?.length || 0] || 0);
      fetchWeather(trip.endPoint.location.latitude, trip.endPoint.location.longitude, 'end', cumulativeSecs);
    }

    // 3. Midpoint Logic (If >= 45km)
    const totalDistanceKm = parseFloat((trip as any).totalDistance?.replace('km', '') || '0');
    if (totalDistanceKm >= 45 && (trip as any).routeGeometry) {
      try {
        const parsedGeom = typeof (trip as any).routeGeometry === 'string' ? JSON.parse((trip as any).routeGeometry) : (trip as any).routeGeometry;
        const routeLength = turf.length(parsedGeom.geometry, { units: 'kilometers' });
        
        // Calculate average speed (km per second) to estimate midpoint time
        const totalDurationSecs = durations.reduce((a: number, b: number) => a + b, 0);
        const avgSpeedKmPerSec = totalDurationSecs > 0 ? routeLength / totalDurationSecs : 0;

        for (let i = 20; i < routeLength; i += 20) {
          const point = turf.along(parsedGeom.geometry, i, { units: 'kilometers' });
          // Estimate cumulative time for the midpoint based on distance covered
          const midpointDurationSecs = avgSpeedKmPerSec > 0 ? i / avgSpeedKmPerSec : 0;
          fetchWeather(point.geometry.coordinates[1], point.geometry.coordinates[0], `mid-${i}`, midpointDurationSecs, true);
        }
      } catch (e) { console.log("Error parsing geometry for weather midpoints", e) }
    }
  }, [trip?.id, trip?.scheduledAt]);

  // --- Save Handlers ---
  const saveDetails = async () => {
    if (!trip || !id) return;
    try {
      await updateTrip(id, {
        title: editTitle,
        scheduledAt: editDate,
        startTime: editStartTime,
      });
      setIsEditingDetails(false);
    } catch {
      Alert.alert("Error", "Failed to update details.");
    }
  };

  const saveDescription = async () => {
    if (!trip || !id) return;
    try {
      await updateTrip(id, { description: editDesc });
      setIsEditingDesc(false);
    } catch {
      Alert.alert("Error", "Failed to update description.");
    }
  };

  const saveStrayThreshold = async () => {
    if (!trip || !id) return;
    try {
      await updateTrip(id, { strayThreshold: editStray });
      setIsEditingStray(false);
    } catch {
      Alert.alert("Error", "Failed to update distance.");
    }
  };

  const handleEditRoute = () => {
    if (!trip) return;
    
    draft.setEditingTripId(trip.id);
    draft.setDetails(trip.title, trip.scheduledAt?.toDate() || null, trip.startTime || '');
    draft.setDescription((trip as any).description || '');
    draft.setStrayThreshold((trip as any).strayThreshold || 50);

    const mappedStops = (trip.stopovers || []).map(s => ({
      name: s.name,
      location: s.location,
      order: s.order,
      isFromSearch: s.isFromSearch
    }));
    
    draft.setLocations(trip.meetingPoint, mappedStops, trip.endPoint);
    draft.setRouteData((trip as any).routeGeometry, (trip as any).routeLegDistances, (trip as any).totalDistance, (trip as any).routeLegDurations);

    router.push({ pathname: '/create-trip', params: { mode: 'locations' } });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.darkGreen} /></View>;
  if (!trip) return <View style={styles.center}><Text>Trip not found.</Text></View>;

  const startDate = trip.scheduledAt?.toDate() || new Date();
  const dateStr = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const leaderName = trip.createdByName && trip.createdByName !== 'Rider' 
    ? trip.createdByName 
    : (user?.name || user?.email?.split('@')[0] || 'Leader');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/my-trips')}>
            <Feather name="arrow-left" size={24} color={Colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <CountdownTimer targetDate={startDate} />

        {/* Map Preview */}
        <RoutePreviewMap 
          startPoint={trip.meetingPoint}
          endPoint={trip.endPoint}
          stopovers={trip.stopovers}
          routeGeometry={(trip as any).routeGeometry}
          weatherPins={weatherPins} 
          onMaximize={() => setShowMaximizedMap(true)} 
        />

        {/* Ride Details */}
        <View style={styles.detailsHeader}>
          {isEditingDetails ? (
            <TextInput
              style={[styles.title, { borderBottomWidth: 1, borderColor: Colors.greenBtn, paddingBottom: 4, flex: 1 }]}
              value={editTitle}
              onChangeText={setEditTitle}
            />
          ) : (
            <Text style={styles.title}>{trip.title}</Text>
          )}
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity style={styles.codeBadge} onPress={() => Clipboard.setStringAsync(trip.shareCode)}>
              <Text style={styles.codeText}>#{trip.shareCode}</Text>
              <Feather name="copy" size={14} color={Colors.greenBtn} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            {isLeader && (
              <TouchableOpacity onPress={() => isEditingDetails ? saveDetails() : setIsEditingDetails(true)}>
                <Text style={styles.editText}>{isEditingDetails ? 'Save' : 'Edit'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <Text style={styles.subText}><Feather name="user" size={14} /> Hosted by {isLeader ? 'You' : leaderName}</Text>
        
        {isEditingDetails ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Feather name="calendar" size={14} color={Colors.black} />
              <Text style={styles.dateBtnText}>{editDate ? editDate.toLocaleDateString() : 'Set Date'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTimePicker(true)}>
              <Feather name="clock" size={14} color={Colors.black} />
              <Text style={styles.dateBtnText}>{editStartTime || 'Set Time'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.subText}><Feather name="clock" size={14} /> {dateStr} at {trip.startTime}</Text>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={editDate || new Date()}
            mode="date" minimumDate={new Date()}
            onChange={(e, d) => { setShowDatePicker(false); if (d) setEditDate(d); }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={editDate || new Date()} mode="time"
            onChange={(e, d) => {
              setShowTimePicker(false);
              if (d) {
                const newDate = editDate ? new Date(editDate) : new Date();
                newDate.setHours(d.getHours());
                newDate.setMinutes(d.getMinutes());
                newDate.setSeconds(0);
                
                setEditDate(newDate);
                setEditStartTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
              }
            }}
          />
        )}

        {/* Description */}
        <Text style={styles.sectionLabel}>DESCRIPTION</Text>
        {isEditingDesc ? (
          <View>
            <TextInput
              style={styles.descInput} multiline
              placeholder="Add a description..."
              value={editDesc} onChangeText={setEditDesc} autoFocus
            />
            <TouchableOpacity style={styles.doneBtn} onPress={saveDescription}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.descPlaceholder} 
            onPress={() => isLeader && setIsEditingDesc(true)}
            disabled={!isLeader}
          >
            <Text style={editDesc ? styles.descText : styles.descPlaceholderText}>
              {editDesc || 'No description provided.'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Route Section */}
        <View style={styles.routeHeader}>
          <TouchableOpacity style={styles.routeTitleContainer} onPress={() => setIsRouteVisible(!isRouteVisible)}>
            <Feather name={isRouteVisible ? "chevron-up" : "chevron-down"} size={18} color={Colors.black} />
            <Text style={styles.sectionLabel}>ROUTE</Text>
          </TouchableOpacity>
          {isLeader && (
            <TouchableOpacity onPress={handleEditRoute}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {isRouteVisible && (
          <View style={styles.routeList}>
            {!isWeatherAvailable && (
              <Text style={styles.weatherWarning}>
                Weather info will be available within 5 days of the trip.
              </Text>
            )}

            {/* Start */}
            <View style={styles.routeItem}>
              <View style={[styles.dot, { backgroundColor: Colors.greenBtn }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locName}>{trip.meetingPoint?.name}</Text>
                {trip.meetingPoint?.address && <Text style={styles.locAddress}>{trip.meetingPoint.address}</Text>}
              </View>
              {isWeatherAvailable && routeWeather['start'] && (
                <View style={styles.rightInfo}>
                  <Text style={styles.weatherText}>
                    {getWeatherIcon(routeWeather['start'].condition)} {routeWeather['start'].temp}°C | {routeWeather['start'].rainChance}% Rain
                  </Text>
                </View>
              )}
            </View>

            {/* Stopovers */}
            {trip.stopovers?.map((stop, index) => (
              <View key={index} style={styles.routeItem}>
                <View style={[styles.dot, { backgroundColor: Colors.muted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locName}>{stop.name}</Text>
                  {stop.address && <Text style={styles.locAddress}>{stop.address}</Text>}
                </View>
                <View style={styles.rightInfo}>
                  <Text style={styles.distanceText}>{(trip as any).routeLegDistances?.[index] || ''}</Text>
                  {isWeatherAvailable && routeWeather[`stop-${index}`] && (
                    <>
                      <Text style={styles.bullet}> • </Text>
                      <Text style={styles.weatherText}>
                        {getWeatherIcon(routeWeather[`stop-${index}`].condition)} {routeWeather[`stop-${index}`].temp}°C | {routeWeather[`stop-${index}`].rainChance}% Rain
                      </Text>
                    </>
                  )}
                </View>
              </View>
            ))}

            {/* Destination */}
            <View style={styles.routeItem}>
              <View style={[styles.dot, { backgroundColor: Colors.brightRed }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locName}>{trip.endPoint?.name}</Text>
                {trip.endPoint?.address && <Text style={styles.locAddress}>{trip.endPoint.address}</Text>}
              </View>
              <View style={styles.rightInfo}>
                <Text style={styles.distanceText}>{(trip as any).routeLegDistances?.[(trip.stopovers?.length || 0)] || ''}</Text>
                {isWeatherAvailable && routeWeather['end'] && (
                  <>
                    <Text style={styles.bullet}> • </Text>
                    <Text style={styles.weatherText}>
                      {getWeatherIcon(routeWeather['end'].condition)} {routeWeather['end'].temp}°C | {routeWeather['end'].rainChance}% Rain
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Stray Alert Configuration */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sectionLabel}>STRAY ALERT THRESHOLD</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Text style={styles.sliderValue}>{editStray} meters</Text>
              {isLeader && (
                <TouchableOpacity onPress={() => isEditingStray ? saveStrayThreshold() : setIsEditingStray(true)}>
                  <Text style={styles.editText}>{isEditingStray ? 'Save' : 'Edit'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
           <View style={styles.sliderContainer}>
            {isEditingStray ? (
              <View style={{ width: '100%' }}>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={20} maximumValue={100} step={10}
                  value={editStray} 
                  onValueChange={setEditStray}
                  minimumTrackTintColor={Colors.greenBtn} 
                  maximumTrackTintColor="#D1D1D1" 
                  thumbTintColor={Colors.greenBtn}
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabelText}>20m</Text>
                  <Text style={[styles.sliderLabelText, { fontWeight: '700', color: Colors.greenBtn }]}>50m (Default)</Text>
                  <Text style={styles.sliderLabelText}>100m</Text>
                </View>
              </View>
            ) : (
              <View style={styles.solidTrackWrapper}>
                <View style={styles.solidTrackBg} />
                <View 
                  style={[
                    styles.solidTrackFill, 
                    { width: `${((editStray - 20) / 80) * 100}%` } 
                  ]} 
                />
                <View 
                  style={[
                    styles.solidTrackThumb, 
                    { left: `${((editStray - 20) / 80) * 100}%` }
                  ]} 
                />
              </View>
            )}
          </View>
          <Text style={styles.sliderHint}>
            Leader and riders will be alerted if someone deviates more than {editStray}m.
          </Text>
        </View>

        {/* Members Section */}
        <View style={styles.membersHeader}>
          <TouchableOpacity style={styles.routeTitleContainer} onPress={() => setIsMembersVisible(!isMembersVisible)}>
            <Feather name={isMembersVisible ? "chevron-up" : "chevron-down"} size={18} color={Colors.black} />
            <Text style={styles.sectionLabel}>MEMBERS ({trip.members?.length || 1})</Text>
          </TouchableOpacity>
        </View>
        
        {isMembersVisible && (
          <View style={styles.membersBox}>
            <View style={styles.memberItem}>
              <Feather name="user" size={16} color={Colors.black} />
              <Text style={styles.memberName}>
                {leaderName} {isLeader && '(You)'} 
                <Text style={styles.leaderBadge}> LEADER</Text>
              </Text>
            </View>
            {trip.members?.filter(uid => uid !== trip.createdBy).map((uid, index) => (
               <View key={uid} style={styles.memberItem}>
                 <Feather name="user" size={16} color={Colors.black} />
                 <Text style={styles.memberName}>Member {index + 1}</Text>
               </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Full Screen Map Modal */}
      <Modal visible={showMaximizedMap} animationType="slide">
        <View style={{ flex: 1 }}>
          <RoutePreviewMap 
            isFullScreen={true} 
            startPoint={trip.meetingPoint}
            endPoint={trip.endPoint}
            stopovers={trip.stopovers}
            routeGeometry={(trip as any).routeGeometry}
            weatherPins={weatherPins}
            onClose={() => setShowMaximizedMap(false)} 
            showWeatherButton={true} 
          />
        </View>
      </Modal>

      {/* Footer Buttons */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.returnBtn} onPress={() => router.replace('/(tabs)/my-trips')}>
          <Text style={styles.returnText}>Return Home</Text>
        </TouchableOpacity>
        
        {isLeader && (
          <TouchableOpacity style={styles.startBtn} onPress={() => router.push(`/trip/${trip.id}/live`)}>
            <Feather name="play" size={16} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.startText}>START TRIP NOW</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: 
  { 
    flex: 1, 
    backgroundColor: Colors.offWhite 
  },
  center: 
  { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  content: 
  { 
    padding: 20, 
    paddingBottom: 120 
  },
  header: 
  { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  headerTitle: 
  { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.muted 
  },
  titleRow: 
  { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginTop: 20 
  },
  title: 
  { 
    fontSize: 24, 
    fontWeight: '700', 
    color: Colors.black 
  },
  codeBadge: 
  { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.greenBg, 
    paddingHorizontal: 12,
    paddingVertical: 6, 
    borderRadius: 20 
  },
  codeText: 
  { 
    fontSize: 14, 
    fontWeight: '700', 
    color: Colors.greenBtn 
  },
  subText: 
  { 
    fontSize: 13, 
    color: Colors.muted, 
    marginTop: 8 
  },
  sectionLabel: 
  { 
    fontSize: 12, 
    fontWeight: '700', 
    color: Colors.muted, 
    letterSpacing: 1 
  },
  descBox: 
  { 
    borderWidth: 1, 
    borderColor: Colors.muted, 
    borderRadius: 12, 
    padding: 14, 
    minHeight: 60, 
    marginTop: 8 
  },
  descText: 
  { 
    color: Colors.black, 
    fontSize: 14 
  },
  descPlaceholder: 
  { 
    borderWidth: 1, 
    borderColor: Colors.muted, 
    borderRadius: 10, 
    padding: 14, 
    minHeight: 60 
  },
  descPlaceholderText: 
  { 
    color: Colors.muted, 
    fontStyle: 'italic', 
    fontSize: 14 
  },
  descInput: 
  { 
    borderWidth: 1, 
    borderColor: Colors.greenBtn, 
    borderRadius: 10, 
    padding: 14, 
    minHeight: 80, 
    textAlignVertical: 'top', 
    backgroundColor: Colors.offWhite 
  },
  doneBtn: 
  { 
    alignSelf: 'flex-end', 
    marginTop: 8 
  },
  doneBtnText: 
  { 
    color: Colors.greenBtn, 
    fontWeight: '600' 
  },
  detailsHeader: 
  { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 20 
  },
  editText: 
  { 
    color: Colors.greenBtn, 
    fontSize: 14, 
    fontWeight: '600' 
  },
  dateBtn: 
  { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: Colors.backgroundOverlay, 
    padding: 8, 
    borderRadius: 8 
  },
  dateBtnText: 
  { 
    fontSize: 13, 
    color: Colors.black , 
  },
  routeHeader: 
  { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 24, 
    marginBottom: 10 
  },
  routeTitleContainer: 
  { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  routeList: 
  { 
    backgroundColor: Colors.backgroundOverlay, 
    borderRadius: 15, 
    padding: 16 
  },
  routeItem: 
  { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 16 
  },
  dot: 
  { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginTop: 4, 
    marginRight: 12 
  },
  locName: 
  { 
    fontSize: 14, 
    fontWeight: '600', 
    color: Colors.black 
  },
  locAddress: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },
  distanceText: 
  { 
    fontSize: 12, 
    color: Colors.muted, 
    fontWeight: '500', 
  },
  weatherText: 
  { 
    fontSize: 12, 
    color: Colors.muted, 
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  bullet: {
    fontSize: 12,
    color: Colors.muted,
    marginHorizontal: 4,
  },
  weatherWarning: 
  { 
    fontSize: 12, 
    color: Colors.muted, 
    fontStyle: 'italic', 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  sliderSection: 
  { 
    marginTop: 24, 
    marginBottom: 8 
  },
  sliderContainer: 
  { 
    marginTop: 8, 
    backgroundColor: Colors.backgroundOverlay, 
    borderRadius: 15, 
    maxHeight: 50,              
    justifyContent: 'center', 
    paddingHorizontal: 10,    
    overflow: 'hidden',
  },
  

  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderLabelText: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '500',
  },

  solidTrackWrapper: {
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  solidTrackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.backgroundOverlay,
    borderRadius: 2,
  },
  solidTrackFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    backgroundColor: Colors.greenBtn,
    borderRadius: 2,
  },
  solidTrackThumb: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 8,
    backgroundColor: Colors.greenBtn,
    marginLeft: -8, 
    top: 5,
  },
  
  sliderHeader: 
  { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  sliderValue: 
  { 
    fontSize: 14, 
    fontWeight: '700', 
    color:  Colors.greenBtn,
    backgroundColor: Colors.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  sliderHint: 
  { 
    fontSize: 12, 
    color: Colors.muted, 
    fontStyle: 'italic', 
    marginTop: 8 
  },
  membersHeader: 
  { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 24, 
    marginBottom: 10 
  },
  membersBox: 
  { 
    backgroundColor: Colors.backgroundOverlay, 
    borderRadius: 15, 
    padding: 16 
  },
  memberItem: 
  { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  memberName: 
  { 
    fontSize: 14, 
    color: Colors.black, 
    marginLeft: 8,
    fontWeight: '500' 
  },
  leaderBadge: 
  { 
    backgroundColor: Colors.greenBg, 
    color: Colors.darkGreen, 
    fontSize: 10, 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    borderRadius: 12, 
    overflow: 'hidden' 
  },
  saveBtn: 
  { 
    backgroundColor:  Colors.greenBtn, 
    borderRadius: 14, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginTop: 24 
  },
  saveBtnText: 
  { 
    color: Colors.offWhite, 
    fontSize: 16, 
    fontWeight: '700' 
  },
  footer: 
  { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 12, 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    backgroundColor: Colors.offWhite, 
    borderTopWidth: 1, 
    borderTopColor: Colors.border 
  },
  returnBtn: 
  { 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: Colors.black, 
    backgroundColor: Colors.offWhite 
  },
  returnText: 
  { 
    color: Colors.black, 
    fontWeight: '600', 
    fontSize: 15 
  },
  startBtn: 
  { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 24, 
    backgroundColor: Colors.greenBtn
  },
  startText: 
  { 
    color: Colors.offWhite, 
    fontWeight: '700', 
    fontSize: 15 
  },
});