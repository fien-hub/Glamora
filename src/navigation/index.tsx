import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { HeaderBackButton } from '@react-navigation/elements';
import { useAuth } from '../contexts/AuthContext';
import { animation, colors } from '../constants/theme';
import { navigationRef } from './RootNavigation';

// Onboarding Screens
import SplashScreen from '../screens/onboarding/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import PersonalizationScreen from '../screens/onboarding/PersonalizationScreen';
import AppRatingScreen from '../screens/onboarding/AppRatingScreen';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import AccountVerificationScreen from '../screens/auth/AccountVerificationScreen';
import TwoFactorVerificationScreen from '../screens/auth/TwoFactorVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// Main App Screens
import CustomerTabNavigator from './CustomerTabNavigator';
import ProviderTabNavigator from './ProviderTabNavigator';
import AdminTabNavigator from './AdminTabNavigator';

// Additional Screens
import ChatScreen from '../screens/shared/ChatScreen';
import ChangePasswordScreen from '../screens/shared/ChangePasswordScreen';
import PhoneVerificationScreen from '../screens/shared/PhoneVerificationScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import LoyaltyScreen from '../screens/customer/LoyaltyScreen';
import FavoritesScreen from '../screens/customer/FavoritesScreen';
import SavedPostsScreen from '../screens/customer/SavedPostsScreen';
import PaymentHistoryScreen from '../screens/customer/PaymentHistoryScreen';
import PaymentMethodsScreen from '../screens/customer/PaymentMethodsScreen';
import CustomerNotificationSettingsScreen from '../screens/customer/NotificationSettingsScreen';
import HelpSupportScreen from '../screens/customer/HelpSupportScreen';
import ProviderPortfolioScreen from '../screens/customer/ProviderPortfolioScreen';
import ProviderReviewsScreen from '../screens/customer/ProviderReviewsScreen';
import PostDetailScreen from '../screens/customer/PostDetailScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import BookingFlowScreen from '../screens/customer/BookingFlowScreen';
import ServiceProvidersScreen from '../screens/customer/ServiceProvidersScreen';
import PortfolioScreen from '../screens/provider/PortfolioScreen';
import SearchScreen from '../screens/customer/SearchScreen';
import ProviderOnboardingScreen from '../screens/provider/ProviderOnboardingScreen';
import EditProfileScreen from '../screens/provider/EditProfileScreen';
import CustomerEditProfileScreen from '../screens/customer/EditProfileScreen';
import AvailabilityScreen from '../screens/provider/AvailabilityScreen';
import EarningsScreen from '../screens/provider/EarningsScreen';
import ReviewsScreen from '../screens/provider/ReviewsScreen';
import AnalyticsScreen from '../screens/provider/AnalyticsScreen';
import CustomersScreen from '../screens/provider/CustomersScreen';
import LocationScreen from '../screens/provider/LocationScreen';
import AddEditServiceScreen from '../screens/provider/AddEditServiceScreen';
import ServiceSelectionScreen from '../screens/provider/ServiceSelectionScreen';
import NotificationSettingsScreen from '../screens/provider/NotificationSettingsScreen';
import BusinessSettingsScreen from '../screens/provider/BusinessSettingsScreen';
import TravelSettingsScreen from '../screens/provider/TravelSettingsScreen';
import VerificationScreen from '../screens/provider/VerificationScreen';
import KYCVerificationScreen from '../screens/provider/KYCVerificationScreen';
import MyCustomerBookingsScreen from '../screens/provider/MyCustomerBookingsScreen';
import SecuritySettingsScreen from '../screens/SecuritySettingsScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import CreatePostScreen from '../screens/provider/CreatePostScreen';
import ProviderHelpSupportScreen from '../screens/provider/HelpSupportScreen';
import { recordStartupCheckpoint } from '../utils/startupDiagnostics';

const Stack = createStackNavigator();

export default function Navigation() {
  const { user, userRole, needsOnboarding, needsVerification, loading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [roleResolutionExpired, setRoleResolutionExpired] = useState(false);

  useEffect(() => {
    // Hard timeout: if AsyncStorage doesn't respond within 3 s, unblock the
    // navigator rather than staying frozen on the splash screen.
    const storageTimeout = setTimeout(() => {
      setHasSeenOnboarding((prev) => {
        if (prev === null) {
          recordStartupCheckpoint('Navigation.asyncStorageTimeout', 'warn');
          return false;
        }
        return prev;
      });
    }, 3000);

    AsyncStorage.getItem('hasSeenOnboarding')
      .then((val) => {
        clearTimeout(storageTimeout);
        setHasSeenOnboarding(val === 'true');
      })
      .catch(() => {
        clearTimeout(storageTimeout);
        setHasSeenOnboarding(false);
      });

    return () => clearTimeout(storageTimeout);
  }, []);

  useEffect(() => {
    if (!user || userRole) {
      setRoleResolutionExpired(false);
      return;
    }

    const timeout = setTimeout(() => {
      setRoleResolutionExpired(true);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [user, userRole]);

  // Wait until we know whether onboarding has been seen (quick local read)
  const initialUnauthRoute = hasSeenOnboarding === null ? null : hasSeenOnboarding ? 'RoleSelection' : 'Onboarding';

  useEffect(() => {
    recordStartupCheckpoint('Navigation.state', 'ok', {
      loading,
      hasUser: !!user,
      userRole: userRole ?? 'none',
      initialUnauthRoute: initialUnauthRoute ?? 'pending',
      roleResolutionExpired,
    });
  }, [loading, user, userRole, initialUnauthRoute, roleResolutionExpired]);

  const linking = {
    prefixes: ['glamora://', 'https://glamora.app'],
    config: {
      screens: {
        ResetPassword: 'reset-password',
        Login: 'login',
        Signup: 'signup',
      },
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          ...TransitionPresets.SlideFromRightIOS,
          transitionSpec: {
            open: {
              animation: 'spring',
              config: {
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              },
            },
            close: {
              animation: 'spring',
              config: {
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              },
            },
          },
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
                opacity: current.progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.5, 1],
                }),
              },
            };
          },
        }}
      >
        {initialUnauthRoute === null ? (
          // AsyncStorage onboarding flag is still loading.
          // Splash is first so the animation plays immediately. All destination
          // routes are registered here so Splash.replace() works even before
          // initialUnauthRoute resolves.
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : !user ? (
          // Not logged in - always start on Splash so the animation plays, then
          // Splash navigates to the correct destination.
          // Splash is first in both branches so React Navigation preserves the
          // mounted instance when initialUnauthRoute transitions null → !user.
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="Personalization" component={PersonalizationScreen} />
            <Stack.Screen
              name="TwoFactorVerification"
              component={TwoFactorVerificationScreen}
              options={{ headerShown: true, title: 'Verify Identity' }}
            />
            <Stack.Screen
              name="AppRating"
              component={AppRatingScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
          </>
        ) : user && !userRole && !roleResolutionExpired ? (
          // A session exists, but role hydration has not completed yet.
          // Render a safe unauth flow instead of Splash to prevent startup deadlocks.
          <>
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : user && !userRole ? (
          // If role resolution failed, recover to the unauthenticated flow instead of
          // leaving the navigator with no active screen.
          <>
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : user && needsVerification ? (
          // Verification required before any onboarding/main flow.
          // Include post-verification destinations so navigation.reset() works
          // immediately after the user verifies (before the tree re-renders).
          // Also include all customer navigation targets so that if needsVerification
          // is re-set to true by a background auth-refresh (while email_verified=false
          // in DB), the user can still navigate to PostDetail, Favorites, Booking, etc.
          // without being silently blocked.
          <>
            <Stack.Screen
              name="AccountVerification"
              component={AccountVerificationScreen}
              options={{ headerShown: true, title: 'Verify Your Account' }}
            />
            <Stack.Screen name="CustomerMain" component={CustomerTabNavigator} />
            <Stack.Screen name="ProviderMain" component={ProviderTabNavigator} />
            <Stack.Screen name="Personalization" component={PersonalizationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ProviderOnboarding" component={ProviderOnboardingScreen} options={{ headerShown: true, title: 'Complete Your Profile' }} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen
              name="AppRating"
              component={AppRatingScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            {/* Customer destination screens — needed so navigation works even when
                needsVerification is temporarily re-set by a background auth refresh */}
            <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ headerShown: false, ...TransitionPresets.ModalSlideFromBottomIOS }} />
            <Stack.Screen name="Booking" component={BookingFlowScreen} options={{ headerShown: false, ...TransitionPresets.ModalSlideFromBottomIOS }} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ headerShown: true, title: 'My Favorites' }} />
            <Stack.Screen name="SavedPosts" component={SavedPostsScreen} options={{ headerShown: true, title: 'Saved Posts', ...TransitionPresets.SlideFromRightIOS }} />
            <Stack.Screen name="EditProfile" component={CustomerEditProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: true, title: 'Change Password' }} />
            <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} options={{ headerShown: true, title: 'Security Settings' }} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ headerShown: true, title: 'Payment Methods' }} />
            <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ headerShown: true, title: 'Payment History' }} />
            <Stack.Screen name="NotificationSettings" component={CustomerNotificationSettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Loyalty" component={LoyaltyScreen} options={{ headerShown: true, title: 'Rewards & Promos' }} />
            <Stack.Screen name="ProviderPortfolio" component={ProviderPortfolioScreen} options={{ headerShown: true, title: 'Portfolio', ...TransitionPresets.ModalSlideFromBottomIOS }} />
            <Stack.Screen name="ProviderReviews" component={ProviderReviewsScreen} options={{ headerShown: true, title: 'Reviews' }} />
            <Stack.Screen name="ServiceProviders" component={ServiceProvidersScreen} options={{ headerShown: true, title: 'Choose Provider', ...TransitionPresets.SlideFromRightIOS }} />
            <Stack.Screen name="BookingLegacy" component={BookingScreen} options={{ headerShown: true, title: 'Book Service', ...TransitionPresets.ModalSlideFromBottomIOS }} />
          </>
        ) : user && needsOnboarding && userRole === 'customer' ? (
          // Customer needs onboarding
          <>
            <Stack.Screen
              name="Personalization"
              component={PersonalizationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AppRating"
              component={AppRatingScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
          </>
        ) : user && needsOnboarding && userRole === 'provider' ? (
          // Provider needs onboarding
          <>
            <Stack.Screen
              name="ProviderOnboarding"
              component={ProviderOnboardingScreen}
              options={{ headerShown: true, title: 'Complete Your Profile' }}
            />
            <Stack.Screen
              name="KYCVerification"
              component={VerificationScreen}
              options={{ headerShown: true, title: 'KYC Documents' }}
            />
            <Stack.Screen
              name="AppRating"
              component={AppRatingScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
          </>
        ) : userRole === 'customer' ? (
          // Customer screens
          <>
            <Stack.Screen name="CustomerMain" component={CustomerTabNavigator} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AccountVerification"
              component={AccountVerificationScreen}
              options={{ headerShown: true, title: 'Verify Your Account' }}
            />
            <Stack.Screen
              name="Loyalty"
              component={LoyaltyScreen}
              options={{ headerShown: true, title: 'Rewards & Promos' }}
            />
            <Stack.Screen
              name="Favorites"
              component={FavoritesScreen}
              options={{ headerShown: true, title: 'My Favorites' }}
            />
            <Stack.Screen
              name="SavedPosts"
              component={SavedPostsScreen}
              options={{
                headerShown: true,
                title: 'Saved Posts',
                ...TransitionPresets.SlideFromRightIOS,
              }}
            />
            <Stack.Screen
              name="ProviderPortfolio"
              component={ProviderPortfolioScreen}
              options={{
                headerShown: true,
                title: 'Portfolio',
                ...TransitionPresets.ModalSlideFromBottomIOS,
              }}
            />
            <Stack.Screen
              name="ProviderReviews"
              component={ProviderReviewsScreen}
              options={({ route }) => ({
                headerShown: true,
                title: (route.params as any)?.providerName ? `${(route.params as any).providerName} Reviews` : 'Reviews',
              })}
            />
            <Stack.Screen
              name="PostDetail"
              component={PostDetailScreen}
              options={{
                headerShown: false,
                ...TransitionPresets.ModalSlideFromBottomIOS,
              }}
            />
            <Stack.Screen
              name="Booking"
              component={BookingFlowScreen}
              options={{
                headerShown: false,
                ...TransitionPresets.ModalSlideFromBottomIOS,
              }}
            />
            <Stack.Screen
              name="BookingLegacy"
              component={BookingScreen}
              options={{
                headerShown: true,
                title: 'Book Service',
                ...TransitionPresets.ModalSlideFromBottomIOS,
              }}
            />
            <Stack.Screen
              name="ServiceProviders"
              component={ServiceProvidersScreen}
              options={{
                headerShown: true,
                title: 'Choose Provider',
                ...TransitionPresets.SlideFromRightIOS,
              }}
            />
            <Stack.Screen
              name="SecuritySettings"
              component={SecuritySettingsScreen}
              options={{ headerShown: true, title: 'Security Settings' }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: true, title: 'Change Password' }}
            />
            <Stack.Screen
              name="PhoneVerification"
              component={PhoneVerificationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditProfile"
              component={CustomerEditProfileScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Edit Profile',
                headerBackTitleVisible: false,
                headerLeft: (props) => (
                  <HeaderBackButton
                    {...props}
                    onPress={() => {
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      } else {
                        navigation.navigate('CustomerMain' as never);
                      }
                    }}
                  />
                ),
              })}
            />
            <Stack.Screen
              name="PaymentHistory"
              component={PaymentHistoryScreen}
              options={{ headerShown: true, title: 'Payment History' }}
            />
            <Stack.Screen
              name="PaymentMethods"
              component={PaymentMethodsScreen}
              options={{ headerShown: true, title: 'Payment Methods' }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={CustomerNotificationSettingsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="HelpSupport"
              component={HelpSupportScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AccountSettings"
              component={AccountSettingsScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : userRole === 'provider' ? (
          // Provider screens
          <>
            <Stack.Screen name="ProviderMain" component={ProviderTabNavigator} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AccountVerification"
              component={AccountVerificationScreen}
              options={{ headerShown: true, title: 'Verify Your Account' }}
            />
            <Stack.Screen
              name="Portfolio"
              component={PortfolioScreen}
              options={{ headerShown: true, title: 'My Portfolio' }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Edit Profile',
                headerBackTitleVisible: false,
                headerLeft: (props) => (
                  <HeaderBackButton
                    {...props}
                    onPress={() => {
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      } else {
                        navigation.navigate('ProviderMain' as never);
                      }
                    }}
                  />
                ),
              })}
            />
            <Stack.Screen
              name="Availability"
              component={AvailabilityScreen}
              options={{ headerShown: true, title: 'Manage Availability' }}
            />
            <Stack.Screen
              name="Earnings"
              component={EarningsScreen}
              options={{ headerShown: true, title: 'Earnings & Payouts' }}
            />
            <Stack.Screen
              name="Reviews"
              component={ReviewsScreen}
              options={{ headerShown: true, title: 'Reviews' }}
            />
            <Stack.Screen
              name="Analytics"
              component={AnalyticsScreen}
              options={{ headerShown: true, title: 'Analytics' }}
            />
            <Stack.Screen
              name="Customers"
              component={CustomersScreen}
              options={{ headerShown: true, title: 'Customers' }}
            />
            <Stack.Screen
              name="Location"
              component={LocationScreen}
              options={{ headerShown: true, title: 'Location & Service Area' }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ headerShown: true, title: 'Notification Settings' }}
            />
            <Stack.Screen
              name="BusinessSettings"
              component={BusinessSettingsScreen}
              options={{ headerShown: true, title: 'Business Settings' }}
            />
            <Stack.Screen
              name="TravelSettings"
              component={TravelSettingsScreen}
              options={{ headerShown: true, title: 'Travel & Distance Settings' }}
            />
            <Stack.Screen
              name="Verification"
              component={VerificationScreen}
              options={{ headerShown: true, title: 'KYC Documents' }}
            />
            <Stack.Screen
              name="KYCVerification"
              component={VerificationScreen}
              options={{ headerShown: true, title: 'KYC Documents' }}
            />
            <Stack.Screen
              name="ProviderOnboarding"
              component={ProviderOnboardingScreen}
              options={{ headerShown: true, title: 'Complete Your Profile' }}
            />
            <Stack.Screen
              name="SecuritySettings"
              component={SecuritySettingsScreen}
              options={{ headerShown: true, title: 'Security Settings' }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: true, title: 'Change Password' }}
            />
            <Stack.Screen
              name="PhoneVerification"
              component={PhoneVerificationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AccountSettings"
              component={AccountSettingsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ServiceSelection"
              component={ServiceSelectionScreen}
              options={{
                headerShown: true,
                title: 'Choose a Service',
                ...TransitionPresets.SlideFromRightIOS,
              }}
            />
            <Stack.Screen
              name="AddEditService"
              component={AddEditServiceScreen}
              options={{
                headerShown: true,
                title: 'Add Service',
                ...TransitionPresets.SlideFromRightIOS,
              }}
            />
            {/* Add shared screens that providers can access from feed */}
            <Stack.Screen
              name="ProviderPortfolio"
              component={ProviderPortfolioScreen}
              options={{
                headerShown: true,
                title: 'Portfolio',
                ...TransitionPresets.ModalSlideFromBottomIOS,
              }}
            />
            <Stack.Screen
              name="ProviderReviews"
              component={ProviderReviewsScreen}
              options={({ route }) => ({
                headerShown: true,
                title: (route.params as any)?.providerName ? `${(route.params as any).providerName} Reviews` : 'Reviews',
              })}
            />
            <Stack.Screen
              name="PostDetail"
              component={PostDetailScreen}
              options={{
                headerShown: false,
                ...TransitionPresets.ModalSlideFromBottomIOS,
              }}
            />
            <Stack.Screen
              name="Booking"
              component={BookingFlowScreen}
              options={{
                headerShown: false,
                ...TransitionPresets.ModalSlideFromBottomIOS,
              }}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              initialParams={{ disableHeaderOffset: true }}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Find Services',
                headerBackTitleVisible: false,
                headerLeft: (props) => (
                  <HeaderBackButton
                    {...props}
                    onPress={() => {
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      } else {
                        navigation.navigate('ProviderMain' as never);
                      }
                    }}
                  />
                ),
                ...TransitionPresets.SlideFromRightIOS,
              })}
            />
            <Stack.Screen
              name="MyCustomerBookings"
              component={MyCustomerBookingsScreen}
              options={{
                headerShown: false,
                ...TransitionPresets.SlideFromRightIOS,
              }}
            />
            <Stack.Screen
              name="CreatePost"
              component={CreatePostScreen}
              options={{
                headerShown: false,
                ...TransitionPresets.ModalSlideFromBottomIOS,
              }}
            />
            <Stack.Screen
              name="HelpSupport"
              component={ProviderHelpSupportScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : userRole === 'admin' ? (
          // Admin screens
          <>
            <Stack.Screen name="AdminMain" component={AdminTabNavigator} />
          </>
        ) : (
          // Fallback - show welcome if role is not set
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

