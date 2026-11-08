// src/components/trip/RoutePreviewMap.tsx
import React, { useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { config } from '../../constants/config';
import { FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons'; // ✅ Added MaterialCommunityIcons
import { useTripDraftStore } from '../../store/useTripDraftStore';
import { LocationPoint, Stopover } from '../../types/trips';
import { Colors } from '../../theme/colors';

interface WeatherPin {
  latitude: number;
  longitude: number;
  temp: number;
  condition: string;
  eta?: string;
}

interface Props {
  onMaximize?: () => void;
  onClose?: () => void; 
  isFullScreen?: boolean; 
  weatherPins?: WeatherPin[];
  startPoint?: LocationPoint | null;
  endPoint?: LocationPoint | null;
  stopovers?: Omit<Stopover, 'id'>[];
  routeGeometry?: any | null;
  showWeatherButton?: boolean;
}

// ✅ Added the same helper from the Weather Along Route page
const getWeatherIcon = (condition: string) => {
  switch (condition) {
    case 'Rain': return 'weather-pouring';
    case 'Clouds': return 'weather-cloudy';
    case 'Clear': return 'weather-sunny';
    default: return 'weather-partly-cloudy';
  }
};

export function RoutePreviewMap({ 
  onMaximize, onClose, isFullScreen = false, weatherPins = [],
  startPoint, endPoint, stopovers, routeGeometry,
  showWeatherButton = false
}: Props) {
  const draft = useTripDraftStore();
  const [showWeather, setShowWeather] = useState(false);

  const activeStart = startPoint !== undefined ? startPoint : draft.meetingPoint;
  const activeEnd = endPoint !== undefined ? endPoint : draft.endPoint;
  const activeStops = stopovers !== undefined ? stopovers : draft.stopovers;
  const rawRoute = routeGeometry !== undefined ? routeGeometry : draft.routeGeometry;

  const activeRoute = useMemo(() => {
    if (!rawRoute) return null;
    let parsed = rawRoute;
    if (typeof rawRoute === 'string') {
      try { parsed = JSON.parse(rawRoute); } catch (e) { return null; }
    }
    if (parsed.type === 'LineString') {
      return { type: 'Feature', properties: {}, geometry: parsed };
    }
    return parsed;
  }, [rawRoute]);

  const bounds = useMemo(() => {
    const coords = [];
    if (activeStart) coords.push([activeStart.location.longitude, activeStart.location.latitude]);
    activeStops?.forEach(s => coords.push([s.location.longitude, s.location.latitude]));
    if (activeEnd) coords.push([activeEnd.location.longitude, activeEnd.location.latitude]);

    if (coords.length === 0) return undefined;
    
    return {
      ne: [Math.max(...coords.map(c => c[0])), Math.max(...coords.map(c => c[1]))],
      sw: [Math.min(...coords.map(c => c[0])), Math.min(...coords.map(c => c[1]))],
      paddingTop: 40, paddingBottom: 40, paddingLeft: 40, paddingRight: 40,
    };
  }, [activeStart, activeEnd, activeStops]);

  return (
    <View style={isFullScreen ? styles.fullScreenContainer : styles.container}>
      <MapboxGL.MapView 
        style={styles.map} 
        styleURL={config.mapStyleUrl} 
        logoEnabled={false} 
        scrollEnabled={isFullScreen} 
        zoomEnabled={isFullScreen}
        pitchEnabled={isFullScreen}
        rotateEnabled={isFullScreen}
        scaleBarEnabled={false}
      >
        {bounds && <MapboxGL.Camera bounds={bounds} animationDuration={0} />}
        
        {/* 1. ROUTE LINE */}
        {activeRoute && (
          <MapboxGL.ShapeSource id="routeSource" shape={activeRoute}>
            <MapboxGL.LineLayer
              id="routeLayer"
              style={{ lineColor: Colors.lineRoute, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* 2. LOCATION PINS */}
        {activeStart && (
          <MapboxGL.PointAnnotation id="start" coordinate={[activeStart.location.longitude, activeStart.location.latitude]}>
            <View style={styles.pinWrapper}><FontAwesome5 name="map-pin" size={28} color={Colors.brightRed}/></View>
          </MapboxGL.PointAnnotation>
        )}
        {activeEnd && (
          <MapboxGL.PointAnnotation id="end" coordinate={[activeEnd.location.longitude, activeEnd.location.latitude]}>
            <View style={styles.pinWrapper}><FontAwesome5 name="map-pin" size={28} color={Colors.brightRed}/></View>
          </MapboxGL.PointAnnotation>
        )}
        {activeStops?.map((stop, i) => (
          <MapboxGL.PointAnnotation key={`stop-${i}`} id={`stop-${i}`} coordinate={[stop.location.longitude, stop.location.latitude]}>
            <View style={styles.pinWrapper}><FontAwesome5 name="map-pin" size={26} color={Colors.brightRed}/></View>
          </MapboxGL.PointAnnotation>
        ))}

        {/* 3. WEATHER PINS */}
        {isFullScreen && showWeather && weatherPins.map((pin, index) => (
          <MapboxGL.PointAnnotation 
            key={`weather-${index}`} 
            id={`weather-${index}`} 
            coordinate={[pin.longitude, pin.latitude]}
            anchor={{ x: 0.5, y: 1.1 }} // ✅ Shifts pin up slightly so it doesn't block the line
          >
            {/* ✅ Clean Card Design */}
            <View style={styles.weatherPin}>
              <MaterialCommunityIcons name={getWeatherIcon(pin.condition) as any} size={20} color={Colors.black} />
              <Text style={styles.pinTemp}>{pin.temp}°C</Text>
              <Text style={styles.pinEta}>{pin.eta || '--:--'}</Text>
            </View>
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {isFullScreen ? (
        <>
          <TouchableOpacity style={[styles.actionBtn, { top: 50, left: 20 }]} onPress={onClose}>
            <Feather name="arrow-left" size={24} color={Colors.black} />
          </TouchableOpacity>
          
          {showWeatherButton && (
            <TouchableOpacity 
              style={[styles.actionBtn, { bottom: 40, right: 20, backgroundColor: showWeather ? Colors.greenBg : Colors.offWhite }]} 
              onPress={() => setShowWeather(!showWeather)}
            >
              <FontAwesome5 name="cloud-sun" size={24} color={showWeather ? Colors.greenBtn : Colors.black} />
            </TouchableOpacity>
          )}
        </>
      ) : (
        onMaximize && (
          <TouchableOpacity style={[styles.actionBtn, { bottom: 12, right: 12 }]} onPress={onMaximize}>
            <Feather name="maximize" size={16} color={Colors.black} />
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.offWhite
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: Colors.offWhite
  }, 
  map: {
    flex: 1
  },
  actionBtn: { 
    position: 'absolute', 
    width: 44, 
    height: 44, 
    backgroundColor: Colors.offWhite, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 5, 
    shadowColor: Colors.black, 
    shadowOpacity: 0.2, 
    shadowRadius: 4 
  },
  pinWrapper: {
    backgroundColor: Colors.offWhite,
    borderRadius: 250,
    padding: 2,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    marginBottom: 24, 
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ✅ UPDATED WEATHER PIN STYLES */
  weatherPin: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginBottom: 10, 
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
});