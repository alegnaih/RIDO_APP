import React, {useRef, useState }from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity } from 'react-native';
import { useLocation } from '../../src/hooks/useLocation';
import { RoadButton } from '../../src/components/ui/RoadButton';
import { UpcomingRidesCard } from '../../src/components/trip/UpcomingRidesCard';
import { AIAssistantButton } from '../../src/components/assistant/AIAssistantButton';
import { FleetMapView } from '../../src/components/map/FleetMapView';
import { Colors } from '../../src/theme/colors';
import {useAuth } from '../../src/hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import {CreateTripScreen} from "../../src/components/trip/CreateTripScreen";
import {useRouter} from 'expo-router';
import {JoinTripModal} from "../../src/components/trip/JoinTripModal";

export default function MapScreen() {
  const { currentCoords } = useLocation();
  const {signOut} = useAuth();
  const insets = useSafeAreaInsets ();
  const router = useRouter();

  const mapRef = useRef<any>(null);
  const [liveLocation, setLiveLocation] = useState<[number, number] | null>(null);
  //const [isCreateTripOpen, setIsCreateTripOpen] = useState(false); // New state

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const handleCreateTrip = () => {
    router.push('/create-trip');
  };


  const handleJoinTrip = () => {
      setIsJoinModalOpen(true);
  };
  
   const handleRecenter = () => {
    // If we have a live location, tell the map to fly there
    if (liveLocation && mapRef.current) {
      mapRef.current.recenter(liveLocation);
    }
    };

  
  return (
    <View style={styles.container}> 

      <FleetMapView style={styles.map} ref={mapRef} onUserLocationUpdate={setLiveLocation}/>

     <View style={[styles.topOverlay, { top: insets.top +10}]}>
        <UpcomingRidesCard />
      </View>

    {/* <View style={styles.aiButtonWrap}> */}
        <AIAssistantButton userLocation={currentCoords} />
     {/* </View> } */ }

      <TouchableOpacity 
        style={[styles.recenterButton, { bottom: 280 }]} // Positioned above Create/Join
        onPress={handleRecenter}>
        <Feather name="crosshair" size={24} color={Colors.darkGreen} />
      </TouchableOpacity>

      <View style={styles.bottomOverlay}>
        <RoadButton
          title="Create Trip"
          onPress={handleCreateTrip}
          style={styles.actionButton}
        />
        <RoadButton
          title="Join Trip"
          onPress={handleJoinTrip}
          // variant="secondary"
          style={styles.actionButton}
        />
      </View>

      <JoinTripModal 
        visible={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={(tripId) => {
          setIsJoinModalOpen(false);
          router.push(`/trip/${tripId}`); // Take them straight to the Trip Details page
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: 
  {
    flex: 1,
    backgroundColor: Colors.lightSurface,
  },
  map: 
  {
    ...StyleSheet.absoluteFillObject,
  },

  text: 
  { 
    fontSize: 18, 
    color: Colors.black,
    marginBottom: 20 
  },

  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  // paddingTop: 56,
    paddingHorizontal: 16,
    zIndex:10,
  },

  aiButtonWrap:
  {
    //position:'absolute',
    //bottom:150,
    //right:16,
   // zIndex: 20
  },

    recenterButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    backgroundColor: Colors.offWhite,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    // Drop shadow
    elevation: 5,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },


  bottomOverlay: {
    position: 'absolute',
    bottom:135,
    left:16,
    right:16,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 12,
    zIndex: 10,
  },

  actionButton: 
  {
    flex:1,
    minHeight: 56,
    color: Colors.darkGreen,
    backgroundColor: Colors.lightSurface,
    borderRadius: 50,
    borderWidth:2,
    borderColor:Colors.darkGreen,
  },

}); 
