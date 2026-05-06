import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import CurvedHeader from '../components/CurvedHeader';
import HomeHeader from '../components/HomeHeader';
import FloatingTabBar from '../components/FloatingTabBar';

// Customer Screens
import HomeScreen from '../screens/customer/HomeScreen';
import SearchScreen from '../screens/customer/SearchScreen';
import BookingsScreen from '../screens/customer/BookingsScreen';
import MessagesScreen from '../screens/customer/MessagesScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function CustomerTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

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

          return <Ionicons name={iconName} size={size} color={color} />;
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
                onLocationPress={() => {
                  const parentNavigation = navigation.getParent();
                  if (parentNavigation) {
                    (parentNavigation as any).navigate('EditProfile');
                  } else {
                    navigation.navigate('Profile');
                  }
                }}
              />
            );
          }

          let title = 'Discover';
          if (route.name === 'Search') title = 'Find Services';
          else if (route.name === 'Bookings') title = 'My Bookings';
          else if (route.name === 'Messages') title = 'Messages';
          else if (route.name === 'Profile') title = 'My Profile';

          return <CurvedHeader title={title} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Find Services',
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
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

