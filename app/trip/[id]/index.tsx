// app/trip/[id]/index.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import * as turf from '@turf/turf';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchRiderProfile } from '../../../src/api/profile'; 
import { Trip } from '../../../src/types/trips';
import { useAuth } from '../../../src/hooks/useAuth';
import { useTripDraftStore } from '../../../src/store/useTripDraftStore';
import { RoutePreviewMap } from '../../../src/components/trip/RoutePreviewMap';
import { CountdownTimer } from '../../../src/components/trip/CountDownTimer';
import { updateTrip, leaveTrip, transferLeadership } from '../../../src/services/tripService';
import { Colors } from '../../../src/theme/colors';
import { config } from '../../../src/constants/config';
import { getTrustedTime } from '../../../src/utils/time';

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

  // Member Leave Flow State
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  // ✅ Leader Leave Flow State
  const [leaveStep, setLeaveStep] = useState<'none' | 'prompt' | 'select_member' | 'confirm' | 'success'>('none');
  const [selectedMember, setSelectedMember] = useState<{ uid: string, name: string } | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [localLeaderOverride, setLocalLeaderOverride] = useState<boolean | null>(null);

  // UI Toggles
  const [isRouteVisible, setIsRouteVisible] = useState(true);
  const [isMembersVisible, setIsMembersVisible] = useState(true);
  const [showMaximizedMap, setShowMaximizedMap] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

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

  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  const isLeader = localLeaderOverride !== null ? localLeaderOverride : (trip?.createdBy === user?.uid);

  const otherMembers = useMemo(() => {
    if (!trip || !trip.members) return [];
    return trip.members
      .filter(uid => uid !== user?.uid)
      .map(uid => ({
        uid,
        name: memberNames[uid] || 'Loading...'
      }));
  }, [trip?.members, memberNames, user?.uid]);

  const isLocked = useMemo(() => {
    if (!trip) return true;
    if (trip.status === 'completed' || trip.status === 'cancelled') return true;
    if (!trip.scheduledAt) return false;
    
    const scheduledTime = trip.scheduledAt.toDate().getTime();
    const now = getTrustedTime(); 
    const gracePeriodMs = 12 * 60 * 60 * 1000; 
    
    return now > (scheduledTime + gracePeriodMs);
  }, [trip]);

  const canEdit = isLeader && !isLocked;

  // 1. Fetch Trip Data
  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(getFirestore(), 'trips', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Trip;
        setTrip({ ...data, id: docSnap.id });
        
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

  // 2. Fetch Member Names
  useEffect(() => {
    const fetchMemberNames = async () => {
      if (!trip || !trip.members || trip.members.length === 0) return;
      
      const newNames: Record<string, string> = { ...memberNames };
      let hasChanges = false;

      for (const uid of trip.members) {
        if (!newNames[uid]) {
          try {
            const profile = await fetchRiderProfile(uid);
            if (profile && profile.name) {
              newNames[uid] = profile.name;
              hasChanges = true;
            } else {
              newNames[uid] = 'Rider'; 
              hasChanges = true;
            }
          } catch (error) {
            console.error("Failed to fetch member name:", error);
          }
        }
      }

      if (hasChanges) {
        setMemberNames(newNames);
      }
    };

    fetchMemberNames();
  }, [trip?.members]);

  // 3. Fetch Weather
  useEffect(() => {
    if (!trip || !config.openWeatherApiKey || !trip.scheduledAt) return;

    const startDate = trip.scheduledAt.toDate() || new Date();
    const daysUntilTrip = (startDate.getTime() - getTrustedTime()) / (1000 * 3600 * 24);
    
    if (daysUntilTrip > 5) {
      setIsWeatherAvailable(false);
      return;
    }

    setIsWeatherAvailable(true);
    setWeatherPins([]);
    const tempRouteWeather: Record<string, any> = {};

    const durations = (trip as any).routeLegDurations || [];

    const fetchWeather = async (lat: number, lng: number, key: string, cumulativeDurationSec: number, isIntermediate = false) => {
      try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${config.openWeatherApiKey}&units=metric`);
        const data = await res.json();
        
        if (!data.list || !data.list.length) return;

        const etaTime = new Date(startDate.getTime() + (cumulativeDurationSec * 1000));
        const etaString = etaTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
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

    let cumulativeSecs = 0;
    if (trip.meetingPoint) {
      fetchWeather(trip.meetingPoint.location.latitude, trip.meetingPoint.location.longitude, 'start', 0);
    }

    trip.stopovers?.forEach((stop, i) => {
      cumulativeSecs += (durations[i] || 0); 
      fetchWeather(stop.location.latitude, stop.location.longitude, `stop-${i}`, cumulativeSecs);
    });

    if (trip.endPoint) {
      cumulativeSecs += (durations[trip.stopovers?.length || 0] || 0);
      fetchWeather(trip.endPoint.location.latitude, trip.endPoint.location.longitude, 'end', cumulativeSecs);
    }

    const totalDistanceKm = parseFloat((trip as any).totalDistance?.replace('km', '') || '0');
    if (totalDistanceKm >= 45 && (trip as any).routeGeometry) {
      try {
        const parsedGeom = typeof (trip as any).routeGeometry === 'string' ? JSON.parse((trip as any).routeGeometry) : (trip as any).routeGeometry;
        const routeLength = turf.length(parsedGeom.geometry, { units: 'kilometers' });
        
        const totalDurationSecs = durations.reduce((a: number, b: number) => a + b, 0);
        const avgSpeedKmPerSec = totalDurationSecs > 0 ? routeLength / totalDurationSecs : 0;

        for (let i = 20; i < routeLength; i += 20) {
          const point = turf.along(parsedGeom.geometry, i, { units: 'kilometers' });
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
      await updateTrip(id, { title: editTitle, scheduledAt: editDate, startTime: editStartTime });
      setIsEditingDetails(false);
    } catch { Alert.alert("Error", "Failed to update details."); }
  };

  const saveDescription = async () => {
    if (!trip || !id) return;
    try {
      await updateTrip(id, { description: editDesc });
      setIsEditingDesc(false);
    } catch { Alert.alert("Error", "Failed to update description."); }
  };

  const saveStrayThreshold = async () => {
    if (!trip || !id) return;
    try {
      await updateTrip(id, { strayThreshold: editStray });
      setIsEditingStray(false);
    } catch { Alert.alert("Error", "Failed to update distance."); }
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

  // --- LEAVE FLOW HANDLERS ---
  const handleLeavePress = () => {
    if (isLeader) {
      setLeaveStep('prompt');
    } else {
      setIsLeaveModalVisible(true);
    }
  };

  const handleTransferConfirm = async () => {
    if (!selectedMember || !trip) return;
    setIsTransferring(true);
    try {
      await transferLeadership(trip.id, selectedMember.uid, selectedMember.name);
      setLocalLeaderOverride(false); 
      setLeaveStep('success');
    } catch (error) {
      console.error("Transfer failed", error);
      Alert.alert("Error", "Failed to transfer leadership.");
      setLeaveStep('select_member');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleLeaveNow = async () => {
    if (!trip || !user?.uid) return;
    setIsLeaving(true);
    try {
      await leaveTrip(trip.id, user.uid);
      setLeaveStep('none');
      setIsLeaveModalVisible(false);
      router.replace({
        pathname: '/trip-left',
        params: { title: trip.title }
      });
      } catch (error) {
        console.error('Failed to leave trip', error);

        Alert.alert(
          'Unable to Leave Trip',
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.'
        );
      } finally {
        setIsLeaving(false);
      }
  };

  const handleContinueAsMember = () => {
    setLeaveStep('none');
    setSelectedMember(null);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.darkGreen} /></View>;
  if (!trip) return <View style={styles.center}><Text>Trip not found.</Text></View>;

  const startDate = trip.scheduledAt?.toDate() || new Date();
  const dateStr = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const durationSecs = trip.routeLegDurations?.reduce((a: number, b: number) => a + b, 0) || 0;
  const durationMs = durationSecs * 1000;
  //const bufferMs = 60 * 60 * 1000; // 1 hour
  const endDate = new Date(startDate.getTime() + durationMs);

  const leaderName = (trip.createdByName && trip.createdByName !== 'Rider' && trip.createdByName !== 'Leader')
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
          
          {/* ✅ Three dots menu for Leader Leave */}
          <TouchableOpacity onPress={() => setIsMenuVisible(true)}>
            <Feather name="more-vertical" size={24} color={Colors.black} />
          </TouchableOpacity>
        </View>

       <CountdownTimer targetDate={startDate} endDate={endDate} status={trip.status} />

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

            {canEdit && (
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
            onPress={() => canEdit && setIsEditingDesc(true)}
            disabled={!canEdit}
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
          {canEdit && (
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
              {canEdit && (
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
             {trip.members?.filter(uid => uid !== trip.createdBy).map((uid) => (
               <View key={uid} style={styles.memberItem}>
                 <Feather name="user" size={16} color={Colors.black} />
                 <Text style={styles.memberName}>
                   {memberNames[uid] || 'Loading...'} 
                 </Text>
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
        {isLeader ? (
          canEdit ? (
            <TouchableOpacity style={styles.startBtn} onPress={() => router.push(`/trip/${trip.id}/live`)}>
              <Feather name="play" size={16} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.startText}>START TRIP NOW</Text>
            </TouchableOpacity>
          ) : null
        ) : (
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeavePress}>
            <Text style={styles.leaveText}>Leave Trip</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.returnBtn} onPress={() => router.replace('/(tabs)/my-trips')}>
          <Text style={styles.returnText}>Return Home</Text>
        </TouchableOpacity>
      </View>

      {/* ========================================= */}
      {/* 🔴 MEMBER LEAVE CONFIRMATION MODAL */}
      {/* ========================================= */}
      <Modal visible={isLeaveModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Feather name="log-out" size={40} color={Colors.darkGreen} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Are you sure you want to leave this trip?</Text>
            <Text style={styles.modalSubtitle}>You can rejoin with the trip code.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsLeaveModalVisible(false)}>
                <Text style={styles.modalCancelText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleLeaveNow} disabled={isLeaving}>
                {isLeaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalConfirmText}>Yes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================= */}
      {/* 🟢 LEADER LEAVE FLOW MODALS */}
      {/* ========================================= */}

      {/* 1. Transfer Leadership Prompt */}
      <Modal visible={leaveStep === 'prompt'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.leaderModalContent}>
            <MaterialCommunityIcons name="crown-outline" size={48} color={Colors.darkGreen} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Please transfer the leadership before leaving.</Text>
            <Text style={styles.modalSubtitle}>You must pick a new leader first.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setLeaveStep('none')}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => setLeaveStep('select_member')}>
                <Text style={styles.modalConfirmText}>Proceed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Select Member List (Bottom Sheet) */}
      <Modal visible={leaveStep === 'select_member'} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setLeaveStep('prompt')}>
                <Feather name="arrow-left" size={24} color={Colors.black} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Transfer Leadership</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <Text style={styles.sheetSubtitle}>Choose who will lead this trip</Text>

            <FlatList
              data={otherMembers}
              keyExtractor={(item) => item.uid}
              renderItem={({ item, index }) => (
                <TouchableOpacity 
                  style={styles.memberRow}
                  onPress={() => {
                    setSelectedMember(item);
                    setLeaveStep('confirm');
                  }}
                >
                  <View style={styles.memberNumber}>
                    <Text style={styles.memberNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.memberNameText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: Colors.muted, marginTop: 20 }}>
                  No other members to transfer to.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* 3. Confirm Transfer */}
      <Modal visible={leaveStep === 'confirm'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.leaderModalContent}>
            <Feather name="repeat" size={48} color={Colors.darkGreen} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Transfer to {selectedMember?.name}?</Text>
            <Text style={styles.modalSubtitle}>They will become the trip leader.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setLeaveStep('select_member')}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleTransferConfirm} disabled={isTransferring}>
                {isTransferring ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalConfirmText}>Yes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Transfer Success */}
      <Modal visible={leaveStep === 'success'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.leaderModalContent}>
            <Feather name="check-circle" size={48} color={Colors.darkGreen} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Successful transfer Leadership</Text>
            <Text style={styles.modalSubtitle}>{selectedMember?.name} is now a leader</Text>
            
            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={handleContinueAsMember}>
                <Text style={styles.modalCancelText}>Continue as Member</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleLeaveNow} disabled={isLeaving}>
                {isLeaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalConfirmText}>Leave Now</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

            {/* Three-Dots Dropdown Menu */}
      <Modal visible={isMenuVisible} transparent animationType="fade">
        {/* Tapping the transparent background closes the menu */}
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'transparent' }} 
          activeOpacity={1} 
          onPress={() => setIsMenuVisible(false)}
        >
          <View style={[styles.dropdownMenu, { top: insets.top + 40, right: 20 }]}>
            <TouchableOpacity 
              style={styles.dropdownItem} 
              onPress={() => {
                setIsMenuVisible(false); // Close menu
                handleLeavePress();      // Trigger the leave flow
              }}
            >
              <Feather name="log-out" size={18} color={Colors.errorRed} />
              <Text style={styles.dropdownItemText}>Leave Trip</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.muted,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.black,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.greenBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenBtn,
  },
  subText: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1,
  },
  descPlaceholder: {
    borderWidth: 1,
    borderColor: Colors.muted,
    borderRadius: 10,
    padding: 14,
    minHeight: 60,
  },
  descPlaceholderText: {
    color: Colors.muted,
    fontStyle: 'italic',
    fontSize: 14,
  },
  descText:
  {

  },
  descInput: {
    borderWidth: 1,
    borderColor: Colors.greenBtn,
    borderRadius: 10,
    padding: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: Colors.offWhite,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  doneBtnText: {
    color: Colors.greenBtn,
    fontWeight: '600',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  editText: {
    color: Colors.greenBtn,
    fontSize: 14,
    fontWeight: '600',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.backgroundOverlay,
    padding: 8,
    borderRadius: 8,
  },
  dateBtnText: {
    fontSize: 13,
    color: Colors.black,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  routeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeList: {
    backgroundColor: Colors.backgroundOverlay,
    borderRadius: 15,
    padding: 16,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  locName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
  locAddress: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },
  distanceText: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '500',
  },
  weatherText: {
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
  weatherWarning: {
    fontSize: 12,
    color: Colors.muted,
    fontStyle: 'italic',
    marginBottom: 12,
    textAlign: 'center',
  },
  sliderSection: {
    marginTop: 24,
    marginBottom: 8,
  },
  sliderContainer: {
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
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenBtn,
    backgroundColor: Colors.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sliderHint: {
    fontSize: 12,
    color: Colors.muted,
    fontStyle: 'italic',
    marginTop: 8,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  membersBox: {
    backgroundColor: Colors.backgroundOverlay,
    borderRadius: 15,
    padding: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberName: {
    fontSize: 14,
    color: Colors.black,
    marginLeft: 8,
    fontWeight: '500',
  },
  leaderBadge: {
    backgroundColor: Colors.greenBg,
    color: Colors.darkGreen,
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  footer: {
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
    borderTopColor: Colors.border,
  },
  leaveBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.errorRed,
    backgroundColor: Colors.offWhite,
  },
  leaveText: {
    color: Colors.errorRed,
    fontWeight: '600',
    fontSize: 15,
  },
  returnBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.black,
    backgroundColor: Colors.offWhite,
  },
  returnText: {
    color: Colors.black,
    fontWeight: '600',
    fontSize: 15,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: Colors.greenBtn,
  },
  startText: {
    color: Colors.offWhite,
    fontWeight: '700',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: Colors.offWhite,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  leaderModalContent: {
    width: '85%',
    backgroundColor: Colors.offWhite,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: Colors.greenBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: Colors.offWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.black,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: Colors.muted,
    marginBottom: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF0E6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  memberNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.darkGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberNumberText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  memberNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
  },
    dropdownMenu: {
    position: 'absolute',
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 150,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.errorRed,
  },
});