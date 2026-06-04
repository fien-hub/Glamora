import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '../utils/icons';
import { colors } from '../constants/theme';
import CurvedHeader from '../components/CurvedHeader';
import HomeHeader from '../components/HomeHeader';
import FloatingTabBar from '../components/FloatingTabBar';

import HomeScreen from '../screens/customer/HomeScreen';
import SearchScreen from '../screens/customer/SearchScreen';
import GuestPromptScreen from '../screens/auth/GuestPromptScreen';

const Tab = createBottomTabNavigator();

export default function GuestTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Bookings') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={String(iconName)} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: true,
        header: ({ route, navigation }) => {
          if (route.name === 'Home') {
            return (
              <HomeHeader
                onSearchPress={() => navigation.navigate('Search')}
                onFilterPress={() => navigation.navigate('Search')}
                onLocationPress={() => navigation.navigate('Profile')}
              />
            );
          }

          let title = 'Find Services';
          if (route.name === 'Bookings') title = 'My Bookings';
          else if (route.name === 'Messages') title = 'Messages';
          else if (route.name === 'Profile') title = 'My Profile';

          return <CurvedHeader title={title} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        initialParams={{ guestBrowse: true }}
        options={{ tabBarLabel: 'Find Services' }}
      />
      <Tab.Screen
        name="Bookings"
        component={GuestPromptScreen}
        initialParams={{
          title: 'Create an account to manage bookings',
          description: 'You can browse services as a guest. Sign in to book, reschedule, and track appointments.',
        }}
      />
      <Tab.Screen
        name="Messages"
        component={GuestPromptScreen}
        initialParams={{
          title: 'Create an account to message providers',
          description: 'Sign in to chat with providers and get support for your bookings.',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={GuestPromptScreen}
        initialParams={{
          title: 'Create an account to personalize your profile',
          description: 'Sign in to save favorites, add profile photo, and manage your account settings.',
        }}
      />
    </Tab.Navigator>
  );
}
