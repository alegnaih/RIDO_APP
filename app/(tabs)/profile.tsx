// app/(tabs)/profile.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/hooks/useAuth';
import { Colors } from '../../src/theme/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const userName = user?.name || 'RIDO User';
  const displayId = user?.displayId || 'N/A';
  const userPhone = user?.phone || '';

  // ✅ Local state for images (Replace with Firebase Storage URLs later)
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [headerUri, setHeaderUri] = useState<string | null>(null);

  // ✅ Image Picker Function
  const pickImage = async (type: 'avatar' | 'header') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'avatar') setAvatarUri(result.assets[0].uri);
      if (type === 'header') setHeaderUri(result.assets[0].uri);
    }
  };

  const handleAvatarPress = () => {
    Alert.alert('Profile Picture', 'Choose an option', [
      { text: 'Select New Picture', onPress: () => pickImage('avatar') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleHeaderPress = () => {
    Alert.alert('Header Picture', 'Choose an option', [
      { text: 'Select New Picture', onPress: () => pickImage('header') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── Header & Avatar ── */}
        <View style={styles.headerContainer}>
          {/* ✅ Clickable Header */}
          <TouchableOpacity activeOpacity={0.9} onPress={handleHeaderPress} style={StyleSheet.absoluteFill}>
            <Image 
              source={headerUri ? { uri: headerUri } : require('../../assets/bottom-bg.png')} 
              style={styles.headerImage} 
              resizeMode="cover" 
            />
            <View style={styles.editBadge}>
              <Feather name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          
          {/* ✅ Clickable Avatar */}
          <View style={styles.avatarWrapper}>
            <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarCircle}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <FontAwesome5 name="user-alt" size={40} color={Colors.offWhite} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── User Info ── */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.displayIdBadge}>
            <Text style={styles.displayIdText}>ID: {displayId}</Text>
          </View>
        </View>

        <View style={styles.menuContainer}>
          {/* ✅ Phone Verification Section */}
          <View style={styles.phoneSection}>
            <View style={styles.phoneHeader}>
              <Feather name="phone" size={20} color={userPhone ? Colors.greenBtn : Colors.errorRed} />
              <Text style={styles.phoneTitle}>Phone Number</Text>
            </View>
            
            {userPhone ? (
              <View style={styles.verifiedRow}>
                <Text style={styles.phoneText}>{userPhone}</Text>
                <View style={styles.verifiedBadge}>
                  <Feather name="check-circle" size={12} color="#FFF" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.phoneWarning}>No verified number linked. Required for offline SMS.</Text>
                <TouchableOpacity 
                  style={styles.verifyButton}
                  onPress={() => router.push({ pathname: '/(auth)/phone-verify', params: { flow: 'profile' } })}
                >
                  <Text style={styles.verifyButtonText}>Verify Number Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Menu Items */}
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
    </View>
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
  headerContainer: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  editBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 20,
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
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
  displayIdBadge: {
    backgroundColor: Colors.greenBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  displayIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.greenBtn,
    letterSpacing: 1,
  },
  
  /* Phone Section Styles */
  phoneSection: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  phoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
    marginLeft: 8,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneText: {
    fontSize: 15,
    color: Colors.black,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.greenBtn,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedText: {
    color:  Colors.white,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  phoneWarning: {
    fontSize: 13,
    color: Colors.errorRed,
    marginBottom: 12,
  },
  verifyButton: {
    backgroundColor: Colors.greenBtn,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
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
});