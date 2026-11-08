import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, GestureResponderEvent, Image} from 'react-native';
import { Colors } from '../../theme/colors';

interface GoogleSigninButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  loading?: boolean;
}

export function GoogleSigninButton({ onPress, loading }: GoogleSigninButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
      style={styles.button}
      hitSlop={12}
    >
      <Image style={styles.googleIcon}source ={require('../../../assets/google-g-icon.png')} resizeMode="contain" />
      <Text style={styles.text}>{loading ? 'Signing in…' : 'Continue with Google'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightSurface,
    borderColor: Colors.darkGreen,
    borderWidth: 1,
    borderRadius: 10,
    height: 41,
    gap: 8,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  text: {
    color: Colors.black,
    fontWeight: '600',
    fontSize: 15,
  },
});
