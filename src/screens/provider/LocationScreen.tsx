import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Ionicons } from '../../utils/icons';

// Lazy-load expo-location so a missing native module never crashes the navigation stack
let _Location: typeof import('expo-location') | null = null;
function getLocation(): typeof import('expo-location') | null {
  if (_Location !== null) return _Location;
  try {
    _Location = require('expo-location') as typeof import('expo-location');
    return _Location;
  } catch (e) {
    console.warn('[LocationScreen] expo-location unavailable:', e);
    return null;
  }
}

export default function LocationScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Location fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [serviceRadius, setServiceRadius] = useState('10');

  useEffect(() => {
    if (user?.id) {
      fetchLocationData();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchLocationData = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);

      // Get profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      if (!profile) return;
      setProfileId(profile.id);

      // Get provider profile with location data
      const { data: providerProfile, error } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('id', profile.id)
        .single();

      // PGRST116 = no row yet — that's fine, just show empty fields
      if (error && error.code !== 'PGRST116') throw error;

      if (providerProfile) {
        setAddress(providerProfile.address || '');
        setCity(providerProfile.city || '');
        setState(providerProfile.state || '');
        setZipCode(providerProfile.zip_code || '');
        setLatitude(providerProfile.latitude?.toString() || '');
        setLongitude(providerProfile.longitude?.toString() || '');
        setServiceRadius(providerProfile.service_radius_km?.toString() || '10');
      }
    } catch (error) {
      console.error('Error fetching location data:', error);
      Alert.alert('Error', 'Failed to load location data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!address.trim()) {
      Alert.alert('Validation Error', 'Please enter your business address');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Validation Error', 'Please enter your city');
      return;
    }
    if (!state.trim()) {
      Alert.alert('Validation Error', 'Please enter your state');
      return;
    }
    if (!zipCode.trim()) {
      Alert.alert('Validation Error', 'Please enter your zip code');
      return;
    }

    const radiusNum = parseInt(serviceRadius);
    if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 100) {
      Alert.alert('Validation Error', 'Service radius must be between 1 and 100 km');
      return;
    }

    try {
      setSaving(true);

      const updateData: any = {
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zip_code: zipCode.trim(),
        service_radius_km: radiusNum,
      };

      // Add coordinates if provided
      if (latitude.trim() && longitude.trim()) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          updateData.latitude = lat;
          updateData.longitude = lng;
        }
      }

      const { error } = await supabase
        .from('provider_profiles')
        .update(updateData)
        .eq('id', profileId);

      if (error) throw error;

      Alert.alert('Success', 'Location settings saved successfully');
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert('Error', 'Failed to save location settings');
    } finally {
      setSaving(false);
    }
  };

  const handleGeocodeAddress = async () => {
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
    Alert.alert(
      'Geocode Address',
      'To get coordinates for your address, you can:\n\n1. Use Google Maps to find your location\n2. Long-press on your location\n3. Copy the coordinates\n4. Paste them in the fields below',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Google Maps',
          onPress: () => {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
            Linking.openURL(url);
          },
        },
      ]
    );
  };

  const handleViewOnMap = () => {
    if (!latitude || !longitude) {
      Alert.alert('No Coordinates', 'Please add coordinates first');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      const Location = getLocation();
      if (!Location) {
        Alert.alert('Unavailable', 'Location services are not available on this device.');
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use this feature. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;

      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));

      // Reverse geocode to fill address fields
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (place) {
        if (place.street && place.streetNumber) {
          setAddress(`${place.streetNumber} ${place.street}`);
        } else if (place.street) {
          setAddress(place.street);
        }
        if (place.city) setCity(place.city);
        if (place.region) setState(place.region);
        if (place.postalCode) setZipCode(place.postalCode);
      }
    } catch (err) {
      console.error('[LocationScreen] useCurrentLocation error:', err);
      Alert.alert('Error', 'Could not retrieve your location. Please try again.');
    } finally {
      setLocating(false);
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
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Address</Text>
        <Text style={styles.sectionDescription}>
          Set your business location to help customers find you
        </Text>

        <TouchableOpacity
          style={[styles.currentLocationBtn, locating && styles.currentLocationBtnDisabled]}
          onPress={handleUseCurrentLocation}
          disabled={locating}
          activeOpacity={0.8}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={18} color={colors.white} />
          )}
          <Text style={styles.currentLocationBtnText}>
            {locating ? 'Getting location…' : 'Use Current Location'}
          </Text>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Street Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Main Street"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              placeholder="New York"
              value={city}
              onChangeText={setCity}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.md }]}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={styles.input}
              placeholder="NY"
              value={state}
              onChangeText={setState}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Zip Code *</Text>
          <TextInput
            style={styles.input}
            placeholder="10001"
            value={zipCode}
            onChangeText={setZipCode}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coordinates (Optional)</Text>
        <Text style={styles.sectionDescription}>
          Add precise coordinates for better location accuracy
        </Text>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={styles.input}
              placeholder="40.7128"
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.md }]}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={styles.input}
              placeholder="-74.0060"
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGeocodeAddress}>
            <Text style={styles.secondaryButtonText}>📍 Find Coordinates</Text>
          </TouchableOpacity>

          {latitude && longitude && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleViewOnMap}>
              <Text style={styles.secondaryButtonText}>🗺️ View on Map</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Area</Text>
        <Text style={styles.sectionDescription}>
          Set how far you're willing to travel for appointments
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service Radius (km) *</Text>
          <TextInput
            style={styles.input}
            placeholder="10"
            value={serviceRadius}
            onChangeText={setServiceRadius}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.hint}>
            You will receive booking requests within {serviceRadius || '0'} km of your business location
          </Text>
        </View>

        <View style={styles.radiusInfo}>
          <Text style={styles.radiusInfoTitle}>📏 Distance Reference:</Text>
          <Text style={styles.radiusInfoText}>• 5 km ≈ 3 miles (neighborhood)</Text>
          <Text style={styles.radiusInfoText}>• 10 km ≈ 6 miles (small city)</Text>
          <Text style={styles.radiusInfoText}>• 25 km ≈ 15 miles (large city)</Text>
          <Text style={styles.radiusInfoText}>• 50 km ≈ 31 miles (metro area)</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Location Settings</Text>
          )}
        </TouchableOpacity>
      </View>
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
  section: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  currentLocationBtnDisabled: {
    opacity: 0.5,
  },
  currentLocationBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.white,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
  },
  radiusInfo: {
    backgroundColor: colors.primary + '08',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  radiusInfoTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  radiusInfoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.black,
  },
});

