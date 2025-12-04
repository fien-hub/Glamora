import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom storage adapter for Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth helpers
export const authService = {
  signUp: async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'glamora://reset-password',
    });
    return { data, error };
  },

  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },
};

// Database helpers
export const dbService = {
  // Users and Profiles
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  updateProfile: async (userId: string, updates: any) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Service Categories
  getServiceCategories: async () => {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .order('name');
    return { data, error };
  },

  // Services
  getServices: async (categoryId?: string) => {
    let query = supabase
      .from('services')
      .select('*, category:service_categories(*)');
    
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    const { data, error } = await query.order('name');
    return { data, error };
  },

  // Provider Services
  getProviderServices: async (providerId: string) => {
    const { data, error } = await supabase
      .from('provider_services')
      .select(`
        *,
        service:services(*),
        category:services(category:service_categories(*))
      `)
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Providers
  searchProviders: async (filters: {
    serviceId?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  }) => {
    let query = supabase
      .from('provider_profiles')
      .select(`
        *,
        user:users(*),
        provider_services(*, service:services(*))
      `)
      .eq('is_verified', true);

    if (filters.serviceId) {
      query = query.contains('provider_services.service_id', [filters.serviceId]);
    }

    const { data, error } = await query.order('rating', { ascending: false });
    return { data, error };
  },

  getProviderById: async (providerId: string) => {
    const { data, error } = await supabase
      .from('provider_profiles')
      .select(`
        *,
        user:users(*),
        provider_services(*, service:services(*)),
        portfolio:portfolio_items(*),
        reviews(*, customer:customer_profiles(*))
      `)
      .eq('id', providerId)
      .single();
    return { data, error };
  },

  // Bookings
  createBooking: async (booking: any) => {
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking)
      .select()
      .single();
    return { data, error };
  },

  getBookings: async (userId: string, role: 'customer' | 'provider') => {
    try {
      console.log('[getBookings] Starting - userId:', userId, 'role:', role);

      // First, get the profile ID from the user ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError || !profileData) {
        console.error('[getBookings] Error fetching profile:', profileError);
        return { data: null, error: profileError };
      }

      const profileId = profileData.id;
      console.log('[getBookings] Profile ID:', profileId);

      // For customers, customer_profiles.id = profiles.id (same ID)
      // For providers, provider_profiles.id = profiles.id (same ID)
      const field = role === 'customer' ? 'customer_id' : 'provider_id';
      console.log('[getBookings] Querying bookings where', field, '=', profileId);

      // Fetch bookings with simplified select
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer_profiles(id),
          provider_profiles(id, business_name),
          provider_services(id, base_price, duration_minutes, services(id, name, description))
        `)
        .eq(field, profileId)
        .order('scheduled_date', { ascending: false });

      if (error) {
        console.error('[getBookings] Error fetching bookings:', error);
        return { data: null, error };
      }

      console.log('[getBookings] Found', data?.length || 0, 'bookings');
      return { data, error };
    } catch (error: any) {
      console.error('[getBookings] Unexpected error:', error);
      return { data: null, error };
    }
  },

  getBookingById: async (bookingId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customer_profiles(*),
        provider:provider_profiles(*),
        provider_service:provider_services(*, service:services(*)),
        payment:payments(*)
      `)
      .eq('id', bookingId)
      .single();
    return { data, error };
  },

  updateBookingStatus: async (bookingId: string, status: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single();
    return { data, error };
  },

  // Reviews
  createReview: async (review: any) => {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single();
    return { data, error };
  },

  getProviderReviews: async (providerId: string) => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        customer:customer_profiles(*),
        booking:bookings(*)
      `)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Availability
  getProviderAvailability: async (providerId: string) => {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_available', true)
      .order('day_of_week');
    return { data, error };
  },

  // Portfolio
  getProviderPortfolio: async (providerId: string) => {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*, service:services(*)')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });
    return { data, error };
  },
};

export default supabase;

