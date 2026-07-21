import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, Vibration,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TodayScreen           from './src/screens/TodayScreen';
import WorkoutSession        from './src/screens/WorkoutSession';
import ProgressScreen        from './src/screens/ProgressScreen';
import DuoScreen             from './src/screens/DuoScreen';
import PlanScreen            from './src/screens/PlanScreen';
import MetricsScreen         from './src/screens/MetricsScreen';
import CardioScreen          from './src/screens/CardioScreen';
import PhotosScreen          from './src/screens/PhotosScreen';
import IdentityScreen        from './src/screens/IdentityScreen';
import WorkoutGeneratorModal from './src/screens/WorkoutGeneratorModal';
import { pingActivity } from './src/storage/storage';
import { colors } from './src/theme';

// ── Navigation ────────────────────────────────────────────────────────────────

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Today:    'barbell',
  Progress: 'trending-up',
  Duo:      'people',
  Plan:     'calendar',
  Metrics:  'scale',
  Photos:   'camera',
};

function TodayStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TodayHome" component={TodayScreen} />
      <Stack.Screen
        name="WorkoutSession"
        component={WorkoutSession}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}

function MetricsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MetricsHome" component={MetricsScreen} />
      <Stack.Screen
        name="Cardio"
        component={CardioScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const planTapCount = useRef(0);
  const planTapTimer = useRef(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingTop: 8,
            paddingBottom: insets.bottom || 8,
            height: 60 + (insets.bottom || 0),
          },
          tabBarActiveTintColor:   colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2, paddingBottom: 4 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS[route.name]} size={22} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Today"    component={TodayStack} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Duo"      component={DuoScreen} />
        <Tab.Screen
          name="Plan"
          component={PlanScreen}
          listeners={{
            tabPress: () => {
              planTapCount.current += 1;
              if (planTapTimer.current) clearTimeout(planTapTimer.current);
              if (planTapCount.current >= 3) {
                planTapCount.current = 0;
                Vibration.vibrate(80);
                setShowGenerator(true);
              }
              planTapTimer.current = setTimeout(() => { planTapCount.current = 0; }, 800);
            },
          }}
        />
        <Tab.Screen name="Metrics"  component={MetricsStack} />
        <Tab.Screen name="Photos"   component={PhotosScreen} />
      </Tab.Navigator>

      <WorkoutGeneratorModal visible={showGenerator} onClose={() => setShowGenerator(false)} />
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [ready,    setReady]    = useState(false);
  const [userName, setUserName] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('@gym_user_name').then(name => {
      setUserName(name);
      setReady(true);
      if (name) pingActivity({ lastSeenAt: new Date().toISOString() }); // radar duo
    });
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!userName ? (
        <IdentityScreen onDone={name => { setUserName(name); pingActivity({ lastSeenAt: new Date().toISOString() }); }} />
      ) : (
        <NavigationContainer>
          <MainTabs />
        </NavigationContainer>
      )}

    </SafeAreaProvider>
  );
}
