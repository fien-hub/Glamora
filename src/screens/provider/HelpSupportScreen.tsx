import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '../../utils/icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I get bookings?',
    answer: 'Make sure your profile is complete and your services are active. Customers can find and book you from the app.',
  },
  {
    question: 'How do I get paid?',
    answer: 'Connect your bank account in Account Settings. Payouts are processed automatically after each completed booking.',
  },
  {
    question: 'How do I contact support?',
    answer: 'Email us at fientum@icloud.com or use the "Contact Support" button below.',
  },
  {
    question: 'How do I update my services?',
    answer: 'Go to Services, tap the service you want to edit, and update the details. You can also add or remove services at any time.',
  },
  {
    question: 'How do I handle cancellations?',
    answer: 'You can cancel bookings from the Bookings screen. Please communicate with your customer and review the cancellation policy.',
  },
];

export default function HelpSupportScreen({ navigation }: any) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };


  const handleContactSupport = () => {
    Linking.openURL('mailto:fientum@icloud.com').catch(() => {
      Alert.alert('Error', 'Unable to open email client.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}> 
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
        </View>
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      {faqs.map((faq, idx) => (
        <View key={idx} style={styles.faqItem}>
          <TouchableOpacity onPress={() => toggleFAQ(idx)} style={styles.faqHeader}>
            <Text style={styles.faqQuestion}>{faq.question}</Text>
            <Ionicons name={expandedIndex === idx ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
          </TouchableOpacity>
          {expandedIndex === idx && (
            <Text style={styles.faqAnswer}>{faq.answer}</Text>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
        <Ionicons name="mail-outline" size={20} color={colors.white} />
        <Text style={styles.contactButtonText}>Contact Support</Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    margin: spacing.md,
  },
  faqItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    ...shadows.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  faqAnswer: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    margin: spacing.md,
    padding: spacing.md,
  },
  contactButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.sm,
  },
});
