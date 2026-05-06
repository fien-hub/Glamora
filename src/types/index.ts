// User Types
export type UserRole = 'customer' | 'provider' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile extends Profile {
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ProviderProfile extends Profile {
  business_name: string | null;
  years_experience: number | null;
  certifications: string[] | null;
  service_radius_km: number;
  is_verified: boolean;
  verification_date: string | null;
  rating: number;
  total_reviews: number;
  total_bookings: number;
}

// Service Types
export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  created_at: string;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  description: string;
  base_duration_minutes: number;
  created_at: string;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  service_id: string;
  price: number;
  duration_minutes: number;
  description: string | null;
  is_active: boolean;
  custom_service_name?: string | null; // For custom services not in predefined list
  created_at: string;
  updated_at: string;
  service?: Service;
  category?: ServiceCategory;
}

// Booking Types
export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string;
  provider_service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: BookingStatus;
  total_price: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  customer?: CustomerProfile;
  provider?: ProviderProfile;
  provider_service?: ProviderService;
}

// Review Types
export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  customer?: CustomerProfile;
  booking?: Booking;
}

// Payment Types
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  booking_id: string;
  payment_reference?: string;
  legacy_payment_intent_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

// Availability Types
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Availability {
  id: string;
  provider_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

// Portfolio Types
export interface PortfolioItem {
  id: string;
  provider_id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  service_id: string | null;
  created_at: string;
  service?: Service;
}

// Location Types
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface BookingForm {
  provider_service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  notes?: string;
}

export interface ReviewForm {
  rating: number;
  comment: string;
}

// Navigation Types
export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  Main: undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  Search: undefined;
  Bookings: undefined;
  Profile: undefined;
};

export type ProviderTabParamList = {
  Dashboard: undefined;
  Appointments: undefined;
  Services: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  ProviderDetails: { providerId: string };
  ServiceDetails: { serviceId: string };
  BookingForm: { providerServiceId: string };
  BookingConfirmation: { bookingId: string };
};

export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetails: { bookingId: string };
  WriteReview: { bookingId: string };
};

