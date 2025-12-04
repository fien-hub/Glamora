import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import CurvedHeader from '../components/CurvedHeader';
import FloatingTabBar from '../components/FloatingTabBar';

// Provider Screens
import ProviderHomeScreen from '../screens/provider/ProviderHomeScreen';
import AppointmentsScreen from '../screens/provider/AppointmentsScreen';
import ServicesScreen from '../screens/provider/ServicesScreen';
import MessagesScreen from '../screens/provider/MessagesScreen';
import ProfileScreen from '../screens/provider/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function ProviderTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Services') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: true,
        header: ({ route }) => {
          let title = 'Home';
          if (route.name === 'Appointments') title = 'Appointments';
          else if (route.name === 'Services') title = 'My Services';
          else if (route.name === 'Messages') title = 'Messages';
          else if (route.name === 'Profile') title = 'My Profile';

          return <CurvedHeader title={title} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={ProviderHomeScreen}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
      />
      <Tab.Screen
        name="Services"
        component={ServicesScreen}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}

