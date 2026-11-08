import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, FlatList, Platform, Keyboard } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../../constants/config';
import { useCreateTrip } from '../../hooks/useCreateTrip';
import { useDebounce } from '../../hooks/useDebounce';
import { generateSessionToken } from '../../utils/searchSession';
import { TripDetailsSheet } from './TripDetailsSheet';
import { SetLocationsSheet } from './SetLocationsSheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTripDraftStore } from '../../store/useTripDraftStore';
import { Colors } from '../../theme/colors'; // ✅ Imported Colors

interface CreateTripScreenProps {
  onClose: () => void;
}

export function CreateTripScreen({ onClose }: CreateTripScreenProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  const trip = useCreateTrip(mode === 'locations' ? 'locations' : 'details');
  const draft = useTripDraftStore();
  
  // Location & Map State
  const [hasPermission, setHasPermission] = useState(false);
  const [initialCoords, setInitialCoords] = useState<[number, number]>([127.9842, 19.5999]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [sessionToken, setSessionToken] = useState(generateSessionToken());
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Request Location Permission on Mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        try {
          const location = await Location.getCurrentPositionAsync({});
          setInitialCoords([location.coords.longitude, location.coords.latitude]);
        } catch (error) {
          console.warn("Could not get location, using default.");
        }
      }
    })();
  }, []);

  // Fetch Suggestions from Search Box API
  useEffect(() => {
    if (debouncedSearch.length < 3 || searchQuery.length === 0) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const [userLng, userLat] = initialCoords;
        const response = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/suggest?` +
          `q=${encodeURIComponent(debouncedSearch)}` +
          `&access_token=${config.mapboxAccessToken}` +
          `&session_token=${sessionToken}` +
          `&proximity=${userLng},${userLat}` +
          `&country=ph` +
          `&language=en` +
          `&limit=8` +
          `&types=poi,address,place`
        );
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (error) {
        console.error("Suggest error:", error);
      }
    };

    fetchSuggestions();
  }, [debouncedSearch, initialCoords, sessionToken]);

  useEffect(() => {
    if (draft.meetingPoint) {
      cameraRef.current?.setCamera({
        centerCoordinate: [draft.meetingPoint.location.longitude, draft.meetingPoint.location.latitude],
        zoomLevel: 12,
        animationDuration: 1000,
      });
    }
  }, []);

  // Retrieve Coordinates on Selection
  const handleSelectSuggestion = async (suggestion: any) => {
    setSearchQuery('');
    setSuggestions([]);
    Keyboard.dismiss(); 

    try {
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?` +
        `access_token=${config.mapboxAccessToken}` +
        `&session_token=${sessionToken}`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.geometry.coordinates;
        
        const point = {
          name: suggestion.name,
          address: suggestion.place_formatted, 
          location: { latitude, longitude },
          isFromSearch: true,
        };

        if (trip.activeField === 'meeting') trip.setMeetingPoint(point);
        else if (trip.activeField === 'destination') trip.setEndPoint(point);
        else if (trip.activeField === 'stopover') trip.updateStopover(point); 

        // Move camera to the selected location
        cameraRef.current?.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: 14,
          animationDuration: 1000,
        });
      }
    } catch (error) {
      console.error("Retrieve error:", error);
    } finally {
      // Reset session and UI
      setSessionToken(generateSessionToken());
    }
  };

  // Handle Map Tap for Manual Pinning
  const handleMapPress = (feature: any) => {
    console.log("🗺️ Map Tapped. Active Field is:", trip.activeField); 
    const [longitude, latitude] = feature.geometry.coordinates;
    const point = {
      name: `Pinned (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      address: 'Custom pinned location',
      location: { latitude, longitude },
      isFromSearch: false,
    };
    
    if (trip.activeField === 'meeting') trip.setMeetingPoint(point);
    else if (trip.activeField === 'destination') trip.setEndPoint(point);
    else if (trip.activeField === 'stopover') trip.updateStopover(point);  
  };

  return (
    <View style={styles.container}>
      {/* Full Screen Map */}
      <MapboxGL.MapView
        style={styles.map}
        styleURL={config.mapStyleUrl}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        zoomEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        onPress={handleMapPress}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={initialCoords}
          zoomLevel={14}
          animationMode="flyTo"
          animationDuration={600}
        />

        {hasPermission && (
          <MapboxGL.UserLocation visible={true} showsUserHeadingIndicator={true} />
        )}

        {/* Markers */}
        {trip.meetingPoint && (
          <MapboxGL.PointAnnotation
            id="meeting"
            coordinate={[trip.meetingPoint.location.longitude, trip.meetingPoint.location.latitude]}
          >
            {/* ✅ Colors.greenBtn */}
            <View style={[styles.marker, { backgroundColor: Colors.greenBtn }]} />
          </MapboxGL.PointAnnotation>
        )}

        {trip.endPoint && (
          <MapboxGL.PointAnnotation
            id="destination"
            coordinate={[trip.endPoint.location.longitude, trip.endPoint.location.latitude]}
          >
            {/* ✅ Colors.danger */}
            <View style={[styles.marker, { backgroundColor: Colors.danger }]} />
          </MapboxGL.PointAnnotation>
        )}

        {trip.stopovers.map((stop, i) => (
          <MapboxGL.PointAnnotation
            key={`stop-${i}`}
            id={`stop-${i}`}
            coordinate={[stop.location.longitude, stop.location.latitude]}
          >
            {/* ✅ Colors.warning */}
            <View style={[styles.marker, { backgroundColor: Colors.warning }]} />
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {/* Search Bar Overlay */}
      <View style={[styles.searchContainer, { top: insets.top + 12, zIndex: 100 }]}>
        <View style={styles.inputWrapper}>
          {/* ✅ Colors.muted */}
          <Ionicons name="search" size={18} color={Colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search location or pin on map"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.mediumGray}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSuggestions([]); }}>
              {/* ✅ Colors.mediumGray */}
              <Ionicons name="close-circle" size={18} color={Colors.mediumGray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown */}
        {suggestions.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.mapbox_id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectSuggestion(item)}>
                  {/* ✅ Colors.greenBtn */}
                  <Ionicons name="location-outline" size={16} color={Colors.greenBtn} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.resultText} numberOfLines={1}>{item.name}</Text>
                    {item.place_formatted && (
                      <Text style={styles.resultSubtext} numberOfLines={1}>{item.place_formatted}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}
      </View>

      {/* Bottom Sheets */}
      <View style={styles.sheetContainer} pointerEvents='box-none'>
        {trip.sheetMode === 'details' ? (
          <TripDetailsSheet
            title={trip.title}
            setTitle={trip.setTitle}
            date={trip.date}
            setDate={trip.setDate}
            startTime={trip.startTime}
            setStartTime={trip.setStartTime}
            onNext={trip.goToLocations}
            onClose={onClose}
          />
        ) : (
          <SetLocationsSheet
            meetingPoint={trip.meetingPoint}
            endPoint={trip.endPoint}
            stopovers={trip.stopovers}
            onSelectMeeting={() => trip.setActiveField('meeting')}
            onSelectDestination={() => trip.setActiveField('destination')}
            onAddStopover={trip.addEmptyStopover}
            onSelectStopover={trip.editStopover}
            onClearMeeting={() => trip.setMeetingPoint(null)}
            onClearDestination={() => trip.setEndPoint(null)}
            onRemoveStopover={trip.removeStopover}
            onMoveLocation={trip.moveLocation} 
            onBack={() => {
              if (mode === 'locations') {
                router.back(); // Goes back to trip-confirm or trip/[id]
              } else {
                trip.setSheetMode('details'); // Goes back to the Details sheet
              }
            }}
            onCreate={trip.handleCreate}
            loading={trip.loading}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: Colors.black,
  },
  resultsContainer: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginTop: 8,
    maxHeight: 250,
    elevation: 5,
    shadowColor: Colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  resultText: {
    fontSize: 14,
    color: Colors.black,
    fontWeight: '500',
  },
  resultSubtext: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    maxHeight: '50%',
    justifyContent: 'flex-end',
  },
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.white,
  },
});