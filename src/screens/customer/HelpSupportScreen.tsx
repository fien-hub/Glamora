import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I book a service?',
    answer: 'Browse services on the Home screen, select a provider, choose a service, pick a date and time, and complete the payment to confirm your booking.',
  },
  {
    question: 'Can I cancel or reschedule my booking?',
    answer: 'Yes! Go to My Bookings, select your booking, and tap "Reschedule" or "Cancel". Cancellation policies may apply depending on timing.',
  },
  {
    question: 'How do I add a payment method?',
    answer: 'Go to Profile > Payment Methods > Add Payment Method. Enter your card details securely through Stripe. Your first card is automatically set as default.',
  },
  {
    question: 'What if I have an issue with my booking?',
    answer: 'You can report an issue from the booking details screen. Our support team will review and respond within 24 hours.',
  },
  {
    question: 'How do refunds work?',
    answer: 'Refunds are processed based on the cancellation policy. Go to Payment History, select the payment, and request a refund if eligible. Refunds typically take 5-10 business days.',
  },
  {
    question: 'How do I contact my provider?',
    answer: 'Open your booking details and tap "Message Provider" to start a conversation. You can also call them directly from the booking screen.',
  },
  {
    question: 'Are my payment details secure?',
    answer: 'Yes! All payment information is encrypted and processed securely through Stripe. We never store your full card details on our servers.',
  },
  {
    question: 'How do I change my notification settings?',
    answer: 'Go to Profile > Notification Settings to customize which notifications you receive and set quiet hours.',
  },
];

export default function HelpSupportScreen({ navigation }: any) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@glamora.com?subject=Help Request');
  };

  const handlePhone = () => {
    Alert.alert(
      'Call Support',
      'Would you like to call our support team?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL('tel:+1234567890') },
      ]
    );
  };

  const handleChat = () => {
    Alert.alert('Live Chat', 'Live chat feature coming soon! For now, please email us at support@glamora.com');
  };

  const handleTerms = () => {
    Linking.openURL('https://glamora.com/terms');
  };

  const handlePrivacy = () => {
    Linking.openURL('https://glamora.com/privacy');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          
          <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
            <View style={styles.contactIconContainer}>
              <Ionicons name="mail-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactDescription}>support@glamora.com</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handlePhone}>
            <View style={styles.contactIconContainer}>
              <Ionicons name="call-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Phone Support</Text>
              <Text style={styles.contactDescription}>+1 (234) 567-890</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleChat}>
            <View style={styles.contactIconContainer}>
              <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Live Chat</Text>
              <Text style={styles.contactDescription}>Chat with our team</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
              {expandedIndex === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>

          <TouchableOpacity style={styles.linkItem} onPress={handleTerms}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={styles.linkText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkItem} onPress={handlePrivacy}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Glamora v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2024 Glamora. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 40,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  contactDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  faqItem: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  faqAnswer: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 20,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.md,
  },
  appInfo: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  appInfoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});

