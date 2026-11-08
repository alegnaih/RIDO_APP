import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { StyleProp, StyleSheet, ViewStyle, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { config } from '../../constants/config';
import { GeoPoint } from '../../types';


//export function FleetMapView({ centerCoordinate, style }: FleetMapViewProps) {
  export const FleetMapView = forwardRef(({ style, onUserLocationUpdate }: any, ref) => 
  {
  const [hasPermission, setHasPermission] = useState(false);
  const [initialCoords, setInitialCoords] = useState<[number, number]>([127.9842, 19.5999]);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  
    // Expose the setCamera function to the parent via ref
  useImperativeHandle(ref, () => ({
    recenter: (coords: [number, number]) => {
      cameraRef.current?.setCamera({
        centerCoordinate: coords,
        zoomLevel: 14,
        animationDuration: 1000,
      });
    }
  }));

     useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        // Fetch the user's location ONCE to set the initial camera
        try{
          const location = await Location.getCurrentPositionAsync({});
          setInitialCoords([location.coords.longitude, location.coords.latitude]);
        } catch (error) {
            console.warn("Could not get location, using default.");
          }
       }
     })();
  }, []);

  //const mapRef = useRef<MapboxGL.MapView>(null);

  /* const cameraTarget: [number, number] | undefined = centerCoordinate
    ? [centerCoordinate.longitude, centerCoordinate.latitude]
    : undefined; */

  return (
    <View style={style}>
    <MapboxGL.MapView
      style={styles.map}
      ref={mapRef}
     styleURL={config.mapStyleUrl}
    //  styleURL="mapbox://styles/mapbox/streets-v11" 
      logoEnabled={false}
      attributionEnabled={false}
      scaleBarEnabled={false}

      //compassEnabled={true}
      //compassViewMargins={{x:16, y: 650}}
      //compassViewPosition={3}

      zoomEnabled={true}
      scrollEnabled
      pitchEnabled={true}
      rotateEnabled={true}

    >
      {hasPermission && (<MapboxGL.UserLocation visible ={true} showsUserHeadingIndicator={true} 
       onUpdate={(location) => {
              if (onUserLocationUpdate) {
                onUserLocationUpdate([location.coords.longitude, location.coords.latitude]);
              }
            }}
      /> )}

      {/* <MapboxGL.UserLocation visible showsUserHeadingIndicator minDisplacement={5} /> */}

      <MapboxGL.Camera
        ref={cameraRef}
        centerCoordinate={initialCoords}
        zoomLevel={14}
        animationMode="flyTo"
        animationDuration={600}
      />
    </MapboxGL.MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  map:{
    flex:1,
  }
})
