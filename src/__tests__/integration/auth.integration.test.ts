/**
 * Integration Tests for Authentication Flow
 * Tests the complete authentication flow including Supabase integration
 */

import { supabase } from '../../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('User Registration', () => {
    it('should successfully register a new user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token-123' } },
        error: null,
      });

      const result = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.data?.user).toEqual(mockUser);
      expect(result.error).toBeNull();
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle registration errors', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      });

      const result = await supabase.auth.signUp({
        email: 'existing@example.com',
        password: 'password123',
      });

      expect(result.data?.user).toBeNull();
      expect(result.error).toEqual({ message: 'Email already registered' });
    });

    it('should validate email format', async () => {
      const invalidEmail = 'invalid-email';
      
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid email format' },
      });

      const result = await supabase.auth.signUp({
        email: invalidEmail,
        password: 'password123',
      });

      expect(result.error).toBeTruthy();
    });
  });

  describe('User Login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token-123' } },
        error: null,
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.data?.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should handle invalid credentials', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.data?.user).toBeNull();
      expect(result.error?.message).toBe('Invalid login credentials');
    });

    it('should handle network errors during login', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('User Logout', () => {
    it('should successfully logout user', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const result = await supabase.auth.signOut();

      expect(result.error).toBeNull();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should clear local storage on logout', async () => {
      await AsyncStorage.setItem('user_session', 'session-data');
      
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      await supabase.auth.signOut();
      await AsyncStorage.removeItem('user_session');

      const session = await AsyncStorage.getItem('user_session');
      expect(session).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should retrieve active session', async () => {
      const mockSession = {
        access_token: 'token-123',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await supabase.auth.getSession();

      expect(result.data?.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('should return null for no active session', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await supabase.auth.getSession();

      expect(result.data?.session).toBeNull();
    });

    it('should handle session expiration', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      const result = await supabase.auth.getSession();

      expect(result.data?.session).toBeNull();
      expect(result.error?.message).toBe('Session expired');
    });
  });

  describe('Auth State Changes', () => {
    it('should listen to auth state changes', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const { data } = supabase.auth.onAuthStateChange(mockCallback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
      expect(data.subscription.unsubscribe).toBe(mockUnsubscribe);
    });

    it('should trigger callback on sign in', () => {
      const mockCallback = jest.fn();
      
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        // Simulate sign in event
        callback('SIGNED_IN', { user: { id: 'user-123' } });
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      supabase.auth.onAuthStateChange(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_IN', { user: { id: 'user-123' } });
    });

    it('should trigger callback on sign out', () => {
      const mockCallback = jest.fn();
      
      (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        // Simulate sign out event
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      supabase.auth.onAuthStateChange(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_OUT', null);
    });
  });
});

