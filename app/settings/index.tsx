import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { Colors } from '../../src/theme/colors';

export default function SettingsScreen() 
{
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Fallbacks in case the user data isn't fully loaded
  const userName = user?.name || 'RIDO User';
  const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member';
  const convoyName = 'Sons of Luzon Pilipinas'; // Hardcoded for now, can be replaced with user data later
  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };
  return (   
  <ScrollView contentContainerStyle={styles.content}>
 
    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/profile')}> 
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="chevron-left" size={30} color={Colors.black} style={styles.headerIcon} />
          <Text style={styles.headerText}> Settings</Text>
        </View>
      </View>
    </TouchableOpacity>

    <View style={styles.menuContainer}>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/edit-prof')}> 
            <View style={styles.menuLeft}>
              <Feather name="user" size={20} color={Colors.black} style={styles.menuIcon} />
                <View style={styles.textContainer}> 
                  <Text style={styles.menuName}>Edit Profile </Text> 
                  <Text style={styles.menuText}> Update name, photo, and phone number</Text>
                </View>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.black} />
           </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/edit-prof')}> 
            <View style={styles.menuLeft}>
              <Feather name="map-pin" size={20} color={Colors.black} style={styles.menuIcon} />
                <View style={styles.textContainer}> 
                  <Text style={styles.menuName}>Privacy & Location</Text> 
                  <Text style={styles.menuText}>Edit privacy and share location during rides</Text>
                </View>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.black} />
           </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/edit-prof')}> 
            <View style={styles.menuLeft}>
              <Feather name="bell" size={20} color={Colors.black} style={styles.menuIcon} />
                <View style={styles.textContainer}> 
                  <Text style={styles.menuName}>Notifications</Text> 
                  <Text style={styles.menuText}>SOS, Stray, and Ride alerts</Text>
                </View>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.black} />
           </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/edit-prof')}> 
            <View style={styles.menuLeft}>
              <Feather name="sun" size={20} color={Colors.black} style={styles.menuIcon} />
                <View style={styles.textContainer}> 
                  <Text style={styles.menuName}>Appearance</Text> 
                  <Text style={styles.menuText}>Dark Mode, Light Mode</Text>
                </View>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.black} />
           </TouchableOpacity>
  
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/edit-prof')}> 
            <View style={styles.menuLeft}>
              <Feather name="lock" size={20} color={Colors.black} style={styles.menuIcon} />
                <View style={styles.textContainer}> 
                  <Text style={styles.menuName}>Change Password</Text> 
                  <Text style={styles.menuText}>Secure your account</Text>
                </View>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.black} />
           </TouchableOpacity>

    </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Feather name="log-out" size={18} color={Colors.errorRed} style={styles.menuIcon} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

    </ScrollView>
    
  );
  
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  content: {
    paddingBottom: 120, // Extra padding so the floating tab bar doesn't cover the logout button
  },
  
  header:
  {
    flex:1,
  },

  headerLeft:
  {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 100,
    marginTop: 60,
    marginLeft:10,
  },

  headerIcon:
  {
    
  },

   headerText:
  {
    fontSize: 20,
  },


  /* Menu Items */
  menuContainer: {
    paddingHorizontal: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.lightSurface,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 24,
    textAlign: 'center',
    marginRight: 12,
  },

  textContainer:
  {
    flexDirection: 'column',
  },
  menuName:{
    fontSize: 14,
    fontWeight:'600',
    color: Colors.black,
  },
  menuText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.black,
  },

  /* Logout */
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#FFEAEA', // Light red background
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.errorRed,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.errorRed,
  },
});