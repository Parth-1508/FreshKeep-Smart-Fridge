import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications'; 

// Contexts
import { ThemeProvider } from './src/context/ThemeContext';
import { InventoryProvider } from './src/context/InventoryContext';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import AddItemScreen from './src/screens/AddItemScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import RecipesScreen from './src/screens/RecipesScreen';
import LoginScreen from './src/screens/LoginScreen';
import EditItemScreen from './src/screens/EditItemScreen';
import PairMagnetScreen from './src/screens/PairMagnetScreen';
import AssistantScreen from './src/screens/AssistantScreen';

// ── CONFIGURE NOTIFICATIONS ────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Add Item') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'Kira') iconName = focused ? 'mic' : 'mic-outline';
          else if (route.name === 'Recipes') iconName = focused ? 'restaurant' : 'restaurant-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4a7c59',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      {/* ── RESTORED ORIGINAL TABS ── */}
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Add Item" component={AddItemScreen} />
      <Tab.Screen name="Kira" component={AssistantScreen} />
      <Tab.Screen name="Recipes" component={RecipesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    // ── ASK FOR NOTIFICATION PERMISSION ON STARTUP ──
    async function setupNotifications() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions denied.');
      }
    }
    setupNotifications();

    AsyncStorage.getItem('onboardingDone').then(done => {
      if (done === 'true') {
        setInitialRoute('MainApp');
      }
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f2ec' }}>
        <ActivityIndicator size="large" color="#4a7c59" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <InventoryProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="MainApp" component={MainTabs} />
            <Stack.Screen name="Inventory" component={InventoryScreen} />
            <Stack.Screen name="EditItem" component={EditItemScreen} options={{ presentation: 'modal' }} />
            {/* ── MAGNET SCREEN STAYS HIDDEN AS A MODAL HERE ── */}
            <Stack.Screen name="PairMagnet" component={PairMagnetScreen} options={{ presentation: 'modal' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </InventoryProvider>
    </ThemeProvider>
  );
}