import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title?: string;
  showMenu?: boolean;
  showProfile?: boolean;
  onMenuPress?: () => void;
  onProfilePress?: () => void;
}

export function Header({
  showMenu = false,
  showProfile = true,
  onMenuPress,
  onProfilePress,
}: HeaderProps) {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Left: Menu Icon */}
        <View style={styles.leftContainer}>
          {showMenu && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onMenuPress}
              activeOpacity={0.7}
              testID="header-menu-button"
            >
              <Text style={styles.menuIcon}>≡</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Center: Brand Logo */}
        <View style={styles.centerContainer}>
          <Text style={styles.brandTitle}>Zarpa</Text>
        </View>

        {/* Right: Profile Avatar / Role Badge */}
        <View style={styles.rightContainer}>
          {showProfile && (
            <TouchableOpacity
              style={styles.profileButton}
              onPress={onProfilePress}
              activeOpacity={0.7}
              testID="header-profile-button"
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'Z'}
                </Text>
              </View>
              {user?.role && (
                <View style={[
                  styles.roleDot,
                  user.role === 'admin' ? styles.adminDot : user.role === 'courier' ? styles.courierDot : styles.clientDot
                ]} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  leftContainer: {
    width: 44,
    alignItems: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    width: 44,
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  menuIcon: {
    fontSize: 26,
    color: COLORS.primary,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  profileButton: {
    position: 'relative',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  roleDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  adminDot: {
    backgroundColor: '#8B5CF6',
  },
  clientDot: {
    backgroundColor: COLORS.primary,
  },
  courierDot: {
    backgroundColor: COLORS.accent,
  },
});
