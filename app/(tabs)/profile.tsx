import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { Colors } from '../../src/theme/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Fallbacks in case the user data isn't fully loaded
  const userName = user?.name || 'RIDO User';
  const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member';
  const convoyName = 'Sons of Luzon Pilipinas'; // Hardcoded for now, can be replaced with user data later

  return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── Header & Avatar ── */}
        <View style={styles.headerContainer}>
          <Image 
            source={require('../../assets/bottom-bg.png')} 
            style={styles.headerImage} 
            resizeMode="cover" 
          />
          
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <FontAwesome5 name="user-alt" size={40} color={Colors.offWhite} />
            </View>
          </View>
        </View>

        {/* ── User Info ── */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.roleContainer}>
            <Text style={styles.userRole}>{userRole}</Text>
            <View style={styles.dotSeparator} />
            <Text style={styles.convoyName}>{convoyName}</Text>
          </View>
        </View>

        {/* ── Menu Items ── */}
        <View style={styles.menuContainer}>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/convoy')}>
            <View style={styles.menuLeft}>
              <FontAwesome5 name="motorcycle" size={20} color={Colors.darkGreen} style={styles.menuIcon} />
              <Text style={styles.menuText}>My Convoy</Text>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')}>
            <View style={styles.menuLeft}>
              <Feather name="settings" size={20} color={Colors.darkGreen} style={styles.menuIcon} />
              <Text style={styles.menuText}>Settings</Text>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.muted} />
          </TouchableOpacity>

          {/* Support & Legal Group */}
          <View style={styles.supportGroup}>
            <View style={styles.supportHeader}>
              <Feather name="tool" size={20} color={Colors.darkGreen} style={styles.menuIcon} />
              <Text style={styles.menuText}>Support & Legal</Text>
            </View>
            
            <TouchableOpacity style={styles.subMenuItem} onPress={() => router.push('/contact')}>
              <View style={styles.menuLeft}>
                <Feather name="headphones" size={18} color={Colors.black} style={styles.subMenuIcon} />
                <Text style={styles.subMenuText}>Contact Us</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.subMenuItem} onPress={() => router.push('/terms')}>
              <View style={styles.menuLeft}>
                <Feather name="file-text" size={18} color={Colors.black} style={styles.subMenuIcon} />
                <Text style={styles.subMenuText}>Terms of Service</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.subMenuItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/privacy')}>
              <View style={styles.menuLeft}>
                <Feather name="shield" size={18} color={Colors.black} style={styles.subMenuIcon} />
                <Text style={styles.subMenuText}>Privacy Policy</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.muted} />
            </TouchableOpacity>
          </View>

        </View>
   
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  content: {
    paddingBottom: 120, 
  },
  
  /* Header */
  headerContainer: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  avatarWrapper: {
    marginBottom: -50, 
    zIndex: 10,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#5A6B8C', 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.offWhite,
  },

  /* User Info */
  userInfo: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 24,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userRole: {
    fontSize: 13,
    color: Colors.black,
    fontWeight: '500',
  },
  dotSeparator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.black,
    marginHorizontal: 8,
  },
  convoyName: {
    fontSize: 13,
    color: Colors.black,
  },

  /* Menu Items */
  menuContainer: {
    paddingHorizontal: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
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
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.black,
  },

  /* Support & Legal Group */
  supportGroup: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  subMenuIcon: {
    width: 20,
    textAlign: 'center',
    marginRight: 10,
  },
  subMenuText: {
    fontSize: 13,
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
    backgroundColor: Colors.lightRed, 
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