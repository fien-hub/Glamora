import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '../../utils/icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import AnimatedCard from '../../components/AnimatedCard';

interface CreateOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  screen: string;
}

export default function CreateScreen() {
  const navigation = useNavigation();
  useScreenTracking('Provider Create');

  const createOptions: CreateOption[] = [
    {
      id: 'post',
      title: 'Create Post',
      description: 'Share your work and showcase your portfolio',
      icon: 'images',
      color: colors.primary,
      screen: 'Portfolio',
    },
  ];

  const handleOptionPress = (option: CreateOption) => {
    (navigation as any).navigate(option.screen);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Post</Text>
        <Text style={styles.subtitle}>Share your work and grow your business</Text>
      </View>

      <View style={styles.optionsContainer}>
        {createOptions.map((option) => (
          <AnimatedCard
            key={option.id}
            style={styles.optionCard}
            onPress={() => handleOptionPress(option)}
          >
            <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
              <Ionicons name={option.icon} size={32} color={option.color} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </AnimatedCard>
        ))}
      </View>

      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => (navigation as any).navigate('Services')}
        >
          <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
          <Text style={styles.quickActionText}>Manage Services</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => (navigation as any).navigate('Availability')}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.secondary} />
          <Text style={styles.quickActionText}>Manage Availability</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => (navigation as any).navigate('Earnings')}
        >
          <Ionicons name="cash-outline" size={20} color={colors.success} />
          <Text style={styles.quickActionText}>View Earnings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => (navigation as any).navigate('Reviews')}
        >
          <Ionicons name="star-outline" size={20} color={colors.warning} />
          <Text style={styles.quickActionText}>View Reviews</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  optionsContainer: {
    padding: spacing.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  quickActionsSection: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.md,
    fontWeight: fontWeight.medium,
  },
});

