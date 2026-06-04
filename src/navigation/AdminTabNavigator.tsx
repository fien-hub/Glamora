import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '../utils/icons';
import { colors, spacing } from '../constants/theme';
import CurvedHeader, { TOTAL_HEADER_HEIGHT } from '../components/CurvedHeader';
import FloatingTabBar, { FLOATING_TAB_BAR_TOTAL_HEIGHT } from '../components/FloatingTabBar';

// Screens
import AdminDashboardScreen from '../screens/admin/DashboardScreen';
import AdminProfileScreen from '../screens/admin/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'stats-chart';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: true,
        sceneStyle: {
          paddingBottom: FLOATING_TAB_BAR_TOTAL_HEIGHT + spacing.sm,
        },
        header: () => {
          let title = 'Dashboard';
          if (route.name === 'Profile') title = 'Admin Profile';

          return <CurvedHeader title={title} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={AdminProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

