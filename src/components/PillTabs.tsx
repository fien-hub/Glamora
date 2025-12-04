import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface PillTab {
  id: string;
  label: string;
}

interface PillTabsProps {
  tabs: (string | PillTab)[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  scrollable?: boolean;
}

export default function PillTabs({ tabs, activeTab, onTabChange, scrollable = false }: PillTabsProps) {
  // Normalize tabs to always be objects
  const normalizedTabs = tabs.map(tab =>
    typeof tab === 'string' ? { id: tab, label: tab } : tab
  );

  // Create animated values for each tab
  const scaleValuesRef = useRef<Animated.Value[]>([]);

  // Initialize or update scale values when tabs change
  if (scaleValuesRef.current.length !== normalizedTabs.length) {
    scaleValuesRef.current = normalizedTabs.map(() => new Animated.Value(1));
  }

  useEffect(() => {
    // Animate scales when active tab changes
    normalizedTabs.forEach((tab, index) => {
      const isActive = tab.id === activeTab;
      if (scaleValuesRef.current[index]) {
        Animated.spring(scaleValuesRef.current[index], {
          toValue: isActive ? 1.05 : 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 300,
        }).start();
      }
    });
  }, [activeTab, normalizedTabs.length]);

  const content = (
    <>
      {normalizedTabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        const scaleValue = scaleValuesRef.current[index];

        return (
          <Animated.View
            key={tab.id}
            style={scaleValue ? {
              transform: [{ scale: scaleValue }],
            } : undefined}
          >
            <TouchableOpacity
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        style={styles.container}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scrollContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border, // Light grey border for inactive state
  },
  tabActive: {
    backgroundColor: colors.softPink, // Soft pink/salmon for tab buttons
    borderColor: colors.softPink,
    borderWidth: 0, // No border for active state
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text, // Dark text for inactive state
  },
  tabTextActive: {
    color: colors.black, // Pure black for active text on pink background
    fontWeight: fontWeight.bold,
  },
});

