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
import { geocodeAddress, getCurrentLocation } from '../../services/location';
import { Ionicons } from '../../utils/icons';
import FadeInView from '../../components/animations/FadeInView';
import SlideUpView from '../../components/animations/SlideUpView';

interface ProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  locationAddress: string;
  locationCity: string;
  locationState: string;
  locationZipCode: string;
}

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    locationAddress: '',
    locationCity: '',
    locationState: '',
    locationZipCode: '',
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, bio')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Get customer profile
      const { data: customerProfile, error: customerError } = await supabase
        .from('customer_profiles')
        .select('location_address, location_city, location_state, location_zip_code')
        .eq('id', profile.id)
        .single();

      if (customerError) throw customerError;

      setProfileData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        locationAddress: customerProfile.location_address || '',
        locationCity: customerProfile.location_city || '',
        locationState: customerProfile.location_state || '',
        locationZipCode: customerProfile.location_zip_code || '',
      });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        // getCurrentLocation already shows an appropriate alert (permission denied,
        // open settings, etc). Just return quietly so the user can enter manually.
        return;
      }
      const { reverseGeocode } = await import('../../services/location');
      const addressData = await reverseGeocode(location);
      if (addressData) {
        setProfileData((prev) => ({
          ...prev,
          locationAddress: addressData.street,
          locationCity: addressData.city,
          locationState: addressData.state,
          locationZipCode: addressData.zipCode,
        }));
        Alert.alert('Success', 'Location filled from your current position');
      }
    } catch (error) {
      console.error('Error using current location:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    // Validate required fields
    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      Alert.alert('Validation Error', 'First name and last name are required');
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

      if (profileIdError) throw profileIdError;

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

      // Update customer profile
      const { error: customerError } = await supabase
        .from('customer_profiles')
        .update({
          location_address: profileData.locationAddress.trim() || null,
          location_city: profileData.locationCity.trim() || null,
          location_state: profileData.locationState.trim() || null,
          location_zip_code: profileData.locationZipCode.trim() || null,
        })
        .eq('id', profile.id);

      if (customerError) throw customerError;

      // Geocode the text address and persist coordinates so distance-based
      // features work even when live GPS permission is denied.
      const addressParts = [
        profileData.locationAddress.trim(),
        profileData.locationCity.trim(),
        profileData.locationState.trim(),
      ].filter(Boolean);
      if (addressParts.length > 0) {
        try {
          const coords = await geocodeAddress(addressParts.join(', '));
          if (coords) {
            await supabase
              .from('customer_profiles')
              .update({ latitude: coords.latitude, longitude: coords.longitude })
              .eq('id', profile.id);
          }
        } catch {
          // Geocoding is best-effort; don't block the save.
        }
      }

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
              placeholder="Enter your phone number"
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
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{profileData.bio.length}/500</Text>
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>

          <TouchableOpacity
            style={[styles.locationButton, loadingLocation && styles.locationButtonDisabled]}
            onPress={handleUseCurrentLocation}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <>
                <ActivityIndicator color={colors.white} size="small" style={{ marginRight: 8 }} />
                <Text style={styles.locationButtonText}>Locating...</Text>
              </>
            ) : (
              <>
                <Ionicons name="locate" size={18} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.locationButtonText}>Use Current Location</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.orText}>Or enter manually</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={profileData.locationAddress}
              onChangeText={(text) => setProfileData({ ...profileData, locationAddress: text })}
              placeholder="Enter your street address"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={profileData.locationCity}
              onChangeText={(text) => setProfileData({ ...profileData, locationCity: text })}
              placeholder="Enter your city"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={profileData.locationState}
                onChangeText={(text) => setProfileData({ ...profileData, locationState: text })}
                placeholder="State"
                placeholderTextColor={colors.textSecondary}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
              <Text style={styles.label}>ZIP Code</Text>
              <TextInput
                style={styles.input}
                value={profileData.locationZipCode}
                onChangeText={(text) => setProfileData({ ...profileData, locationZipCode: text })}
                placeholder="ZIP"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
          </View>
        </View>

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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.medium,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  orText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
});
