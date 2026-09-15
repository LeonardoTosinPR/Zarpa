import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title?: string;
  showMenu?: boolean;
  showProfile?: boolean;
  onMenuPress?: () => void;
  onProfilePress?: () => void;
}

export function Header({
  showMenu = true,
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
              <Ionicons name="menu-outline" size={26} color={COLORS.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center: Brand Logo */}
        <View style={styles.centerContainer}>
          <View style={styles.brandRow}>
            <View style={styles.miniLogoBadge}>
              <Ionicons name="flash" size={14} color={COLORS.primary} />
            </View>
            <Text style={styles.brandTitle}>Zarpa</Text>
          </View>
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
                <Ionicons name="person" size={16} color={COLORS.primary} />
              </View>
              {user?.role && (
                <View
                  style={[
                    styles.roleDot,
                    user.role === 'admin'
                      ? styles.adminDot
                      : user.role === 'courier'
                      ? styles.courierDot
                      : styles.clientDot,
                  ]}
                />
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  miniLogoBadge: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
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
    backgroundColor: COLORS.purple,
  },
  clientDot: {
    backgroundColor: COLORS.primary,
  },
  courierDot: {
    backgroundColor: COLORS.accent,
  },
});
