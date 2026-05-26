import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '../utils/icons';
import { borderRadius, spacing } from '../constants/theme';

// Icon map per route name
const ROUTE_ICONS: Record<string, { active: any; inactive: any }> = {
  Home:     { active: 'home',       inactive: 'home-outline' },
  Search:   { active: 'search',   inactive: 'search-outline' },
  Bookings: { active: 'calendar', inactive: 'calendar-outline' },
  Appointments: { active: 'calendar', inactive: 'calendar-outline' },
  Services: { active: 'list', inactive: 'list-outline' },
  Messages: { active: 'chatbubble', inactive: 'chatbubble-outline' },
  Profile:  { active: 'person',     inactive: 'person-outline' },
};

const NAV_BG        = '#1C1C1E';   // near-black bar
const ACTIVE_BG     = '#FFFFFF';   // white bubble for active tab
const ACTIVE_ICON   = '#1C1C1E';   // dark icon on white bubble
const INACTIVE_ICON = '#9E9E9E';   // muted icon for inactive

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const scaleAnims = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0.85))
  ).current;

  useEffect(() => {
    scaleAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === state.index ? 1 : 0.85,
        useNativeDriver: true,
        damping: 15,
        stiffness: 220,
      }).start();
    });
  }, [state.index]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const icons = ROUTE_ICONS[route.name] ?? ROUTE_ICONS.Home;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              activeOpacity={0.75}
            >
              <Animated.View
                style={[
                  styles.iconWrapper,
                  isFocused && styles.iconWrapperActive,
                  { transform: [{ scale: scaleAnims[index] }] },
                ]}
              >
                <Ionicons
                  name={isFocused ? icons.active : icons.inactive}
                  size={24}
                  color={isFocused ? ACTIVE_ICON : INACTIVE_ICON}
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NAV_BG,
    borderRadius: borderRadius.round,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    width: '84%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 14,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: ACTIVE_BG,
  },
});

