import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, StyleSheet, Animated, Easing, Dimensions, Vibration,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TodayScreen    from './src/screens/TodayScreen';
import WorkoutSession from './src/screens/WorkoutSession';
import ProgressScreen from './src/screens/ProgressScreen';
import DuoScreen      from './src/screens/DuoScreen';
import PlanScreen     from './src/screens/PlanScreen';
import MetricsScreen  from './src/screens/MetricsScreen';
import PhotosScreen   from './src/screens/PhotosScreen';
import IdentityScreen from './src/screens/IdentityScreen';
import { colors } from './src/theme';
import { supabase } from './src/lib/supabase';
import { addConfettiListener } from './src/lib/confettiEvents';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Confetti components ───────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#FF6B00','#FFD700','#FF4081','#00E676','#40C4FF','#E040FB','#FFFFFF','#FF6E40'];
const PARTICLE_COUNT  = 70;

function ConfettiParticle({ startX, color, size, isRect, duration, delay, swayAmp }) {
  const y       = useRef(new Animated.Value(0)).current;
  const sway    = useRef(new Animated.Value(0)).current;
  const spin    = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y,    { toValue: SH + 60, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.loop(Animated.sequence([
          Animated.timing(sway, { toValue:  swayAmp, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(sway, { toValue: -swayAmp, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        ])),
        Animated.timing(spin, { toValue: 1, duration, useNativeDriver: true, easing: Easing.linear }),
      ]),
    ]).start();

    const fadeAt = delay + duration * 0.75;
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: duration * 0.25, useNativeDriver: true }).start();
    }, fadeAt);
    return () => clearTimeout(t);
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });
  return (
    <Animated.View style={{
      position: 'absolute', top: -20, left: startX,
      width: size, height: isRect ? size * 0.45 : size,
      backgroundColor: color,
      borderRadius: isRect ? 2 : size / 2,
      opacity,
      transform: [{ translateY: y }, { translateX: sway }, { rotate }],
    }} />
  );
}

function ConfettiBlast({ blastKey }) {
  const particles = useMemo(() => Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    startX:   Math.random() * SW,
    color:    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size:     Math.random() * 10 + 7,
    isRect:   Math.random() > 0.4,
    duration: Math.random() * 1800 + 2200,
    delay:    Math.random() * 600,
    swayAmp:  Math.random() * 50 + 20,
  })), [blastKey]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => <ConfettiParticle key={p.id} {...p} />)}
    </View>
  );
}

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

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 6 },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Today"    component={TodayStack} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Duo"      component={DuoScreen} />
      <Tab.Screen name="Plan"     component={PlanScreen} />
      <Tab.Screen name="Metrics"  component={MetricsScreen} />
      <Tab.Screen name="Photos"   component={PhotosScreen} />
    </Tab.Navigator>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [ready,    setReady]    = useState(false);
  const [userName, setUserName] = useState(null);

  // ── Global confetti state (rendu au-dessus de toute navigation) ──────────────
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [blastKey,        setBlastKey]        = useState(0);
  const confettiTimer  = useRef(null);
  const lastConfettiAt = useRef(null);
  const confettiReady  = useRef(false);

  function triggerConfetti() {
    if (confettiTimer.current) clearTimeout(confettiTimer.current);
    setBlastKey(k => k + 1);
    setConfettiVisible(true);
    Vibration.vibrate([0, 50, 100, 50, 100, 200]);
    confettiTimer.current = setTimeout(() => setConfettiVisible(false), 4500);
  }

  // Écoute les triggers locaux depuis DuoScreen
  useEffect(() => {
    return addConfettiListener(triggerConfetti);
  }, []);

  // Poll Supabase toutes les 2s — détecte les confettis des autres téléphones
  useEffect(() => {
    async function poll() {
      try {
        const { data } = await supabase
          .from('shared_plans')
          .select('updated_at')
          .eq('id', 'confetti')
          .maybeSingle();

        const ts = data?.updated_at ?? null;
        if (!confettiReady.current) {
          lastConfettiAt.current = ts;
          confettiReady.current  = true;
          return;
        }
        if (ts && ts !== lastConfettiAt.current) {
          lastConfettiAt.current = ts;
          triggerConfetti();
        }
      } catch {}
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('@gym_user_name').then(name => {
      setUserName(name);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!userName ? (
        <IdentityScreen onDone={name => setUserName(name)} />
      ) : (
        <NavigationContainer>
          <MainTabs />
        </NavigationContainer>
      )}

      {/* Confetti global — au-dessus de toute navigation, fonctionne sur iOS et Android */}
      {confettiVisible && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          <ConfettiBlast blastKey={blastKey} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
