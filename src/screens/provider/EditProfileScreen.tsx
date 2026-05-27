import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { trackProfileEdited } from '../../utils/analytics';
import { Ionicons } from '../../utils/icons';

interface ProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  businessName: string;
  yearsExperience: string;
  certifications: string;
  serviceRadius: string;
}

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    businessName: '',
    yearsExperience: '',
    certifications: '',
    serviceRadius: '',
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      // Fetch base profile with ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, bio')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      if (!profileData) { setLoading(false); return; }

      // Fetch provider profile using profile ID
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select('business_name, years_experience, certifications, service_radius_km')
        .eq('id', profileData.id)
        .single();

      // PGRST116 = no provider_profiles row yet — proceed with empty fields
      if (providerError && providerError.code !== 'PGRST116') throw providerError;

      setProfileData({
        firstName: profileData?.first_name || '',
        lastName: profileData?.last_name || '',
        phone: profileData?.phone || '',
        bio: profileData?.bio || '',
        businessName: providerData?.business_name || '',
        yearsExperience: providerData?.years_experience?.toString() || '',
        certifications: providerData?.certifications?.join(', ') || '',
        serviceRadius: providerData?.service_radius_km?.toString() || '',
      });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    if (!profileData.businessName.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    setSaving(true);
    try {
      // Get profile ID
      const { data: profile, error: profileIdError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileIdError && profileIdError.code !== 'PGRST116') throw profileIdError;
      if (!profile) throw new Error('Profile not found');

      // Update base profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.firstName.trim(),
          last_name: profileData.lastName.trim(),
          phone: profileData.phone.trim() || null,
          bio: profileData.bio.trim() || null,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update provider profile
      const certificationsArray = profileData.certifications
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const { error: providerError } = await supabase
        .from('provider_profiles')
        .update({
          business_name: profileData.businessName.trim(),
          years_experience: parseInt(profileData.yearsExperience) || 0,
          certifications: certificationsArray,
          service_radius_km: parseInt(profileData.serviceRadius) || 10,
        })
        .eq('id', profile.id);

      if (providerError) throw providerError;

      // Track profile edit
      trackProfileEdited();

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={profileData.firstName}
              onChangeText={(text) => setProfileData({ ...profileData, firstName: text })}
              placeholder="Enter your first name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={profileData.lastName}
              onChangeText={(text) => setProfileData({ ...profileData, lastName: text })}
              placeholder="Enter your last name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={profileData.phone}
              onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profileData.bio}
              onChangeText={(text) => setProfileData({ ...profileData, bio: text })}
              placeholder="Tell customers about yourself..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Business Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={profileData.businessName}
              onChangeText={(text) => setProfileData({ ...profileData, businessName: text })}
              placeholder="Your business name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Years of Experience</Text>
            <TextInput
              style={styles.input}
              value={profileData.yearsExperience}
              onChangeText={(text) => setProfileData({ ...profileData, yearsExperience: text })}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Certifications</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profileData.certifications}
              onChangeText={(text) => setProfileData({ ...profileData, certifications: text })}
              placeholder="Enter certifications separated by commas"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.helperText}>Separate multiple certifications with commas</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Radius (km)</Text>
            <TextInput
              style={styles.input}
              value={profileData.serviceRadius}
              onChangeText={(text) => setProfileData({ ...profileData, serviceRadius: text })}
              placeholder="10"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>How far are you willing to travel for appointments?</Text>
          </View>
        </View>

        {/* Location Section */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => (navigation as any).navigate('Location')}
          activeOpacity={0.75}
        >
          <View style={styles.navRowLeft}>
            <View style={styles.navRowIcon}>
              <Ionicons name="location" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.navRowTitle}>Location & Service Area</Text>
              <Text style={styles.navRowSub}>Edit your address and travel distance</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.backgroundGray,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  navRow: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  navRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F4E8E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRowTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  navRowSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

