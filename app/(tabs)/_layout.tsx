import { Tabs } from 'expo-router';
import { Colors, DarkTheme } from '../../src/theme/colors';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { config } from '../../src/constants/config';

// console.log("🔥 MAPBOX TOKEN CHECK:", config.mapboxAccessToken);

export default function TabLayout() 
{
  const insets = useSafeAreaInsets();
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  
  return (
    <Tabs
      screenOptions={() => ({
        headerShown: false,
    
        tabBarActiveTintColor: Colors.white,
        tabBarInactiveTintColor: Colors.lightGreen,

        tabBarLabelStyle: {fontSize:11, fontWeight: '600', marginBottom: 6,},

        tabBarStyle:{ position: 'absolute', bottom: insets.bottom + 16, 
                      left:24, right: 24, height: 65, borderRadius:32,
                      backgroundColor:Colors.darkGreen, elevation:8,
                      shadowColor: Colors.black, shadowOffset: {width:0, height:4},
                      shadowOpacity:0.15, shadowRadius: 8, borderTopWidth:0,
                      paddingBottom:0, paddingTop: 8},
      })}
    >  
      <Tabs.Screen name="map" options={{ title: 'Map', 
                  tabBarIcon: ({color}) => <FontAwesome5 name="map-marked" size={22} color={color} /> }} />
      <Tabs.Screen name="my-trips" options={{ title: 'My Trips', 
                  tabBarIcon: ({color}) => <FontAwesome5 name="calendar" size={22} color={color} /> }} />
      <Tabs.Screen name="weather" options={{ title: 'Weather', 
                  tabBarIcon: ({color}) => <FontAwesome5 name="cloud-sun" size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', 
                  tabBarIcon: ({color}) => <FontAwesome5 name="user-alt" size={22} color={color} /> }} />
     
    </Tabs>
  );
}

/*function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const tabs = [
    { key: 'map', label: 'Map' },
    { key: 'weather', label: 'Weather' },
    { key: 'profile', label: 'Profile' },
  ];

  return (
    <View style={styles.tabBarContainer}>
      {tabs.map((tab) => {
        const isFocused = state.index === tabs.findIndex((t) => t.key === tab.key);
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: tab.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(tab.key as never);
          }
        };
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.tabButton, isFocused && styles.tabButtonActive]}
            hitSlop={12}
          >
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{tab.label}</Text>
            {isFocused && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
} 

const styles = StyleSheet.create
({

  tabBarContainer: 
  {
    
  },

  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 8, 
  },
  tabButtonActive: {
   // borderRadius: 12,
   // marginHorizontal: 4,
  },
  tabLabel: {
    //fontSize: 12,
  //  fontWeight: '600',
    //color: Colors.mediumGray,
  },
  tabLabelActive: 
  {
    color: Colors.offWhite,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 24,
    height: 3,
    backgroundColor: Colors.darkGreen,
    borderRadius: 2,
  },
  tabBar: 
  {
    display: 'none',
  }, 

}); */
