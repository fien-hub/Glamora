import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Animation values for each tab
  const pillWidth = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))
  ).current;

  useEffect(() => {
    // Animate pill expansion for active tab
    pillWidth.forEach((anim, index) => {
      const isActive = index === state.index;

      Animated.spring(anim, {
        toValue: isActive ? 1 : 0,
        useNativeDriver: false,
        damping: 18,
        stiffness: 200,
      }).start();
    });
  }, [state.index]);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

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
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Get icon name from options
          const iconName = options.tabBarIcon
            ? (options.tabBarIcon as any)({ focused: isFocused, color: '', size: 24 })?.props?.name
            : 'home';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <Animated.View
                style={[
                  styles.tabContent,
                  isFocused && styles.tabContentActive,
                  {
                    backgroundColor: pillWidth[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['transparent', colors.primarySubtle],
                    }),
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? colors.primaryDarker : colors.textLight}
                />
                {/* Label - only visible when active, positioned beside icon */}
                {isFocused && (
                  <Animated.Text
                    style={[
                      styles.tabLabel,
                      {
                        opacity: pillWidth[index],
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {typeof label === 'string' ? label : route.name}
                  </Animated.Text>
                )}
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
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.xxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
  },
  tabContentActive: {
    paddingHorizontal: spacing.md,
  },
  tabLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.primaryDarker,
    marginLeft: spacing.xs,
  },
});

