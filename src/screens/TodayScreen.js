import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getTodayWorkout } from '../data/workoutPlan';
import { getActivePlan, getSharedPlan, getTodaySource, setTodaySource } from '../storage/storage';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function TodayScreen({ navigation }) {
  const [today,       setToday]       = useState(null);
  const [source,      setSource]      = useState('mine'); // 'mine' | 'shared'
  const [sharedPlan,  setSharedPlan]  = useState(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const dayName = DAYS[new Date().getDay()];
  const dayIdx  = new Date().getDay();

  useFocusEffect(useCallback(() => {
    async function loadAll() {
      const [plan, src, cloud] = await Promise.all([
        getActivePlan(),
        getTodaySource(),
        getSharedPlan(),
      ]);

      const cloudPlan = cloud?.plan ?? null;
      setSharedPlan(cloudPlan);
      setSource(src);

      const effectivePlan = (src === 'shared' && cloudPlan) ? cloudPlan : plan;
      applyPlan(effectivePlan);
    }

    function applyPlan(plan) {
      if (plan?.days?.[dayIdx]) {
        setToday(plan.days[dayIdx]);
      } else {
        setToday(getTodayWorkout());
      }
    }

    loadAll();
  }, []));

  async function switchSource(newSrc) {
    if (newSrc === source) return;
    setSource(newSrc);
    await setTodaySource(newSrc);

    if (newSrc === 'shared') {
      setLoadingSync(true);
      const cloudResult = await getSharedPlan();
      setLoadingSync(false);
      const cloud = cloudResult?.plan ?? null;
      setSharedPlan(cloud);
      if (cloud?.days?.[dayIdx]) {
        setToday(cloud.days[dayIdx]);
      } else {
        // No shared plan yet — fall back to local
        const plan = await getActivePlan();
        if (plan?.days?.[dayIdx]) setToday(plan.days[dayIdx]);
        else setToday(getTodayWorkout());
      }
    } else {
      const plan = await getActivePlan();
      if (plan?.days?.[dayIdx]) setToday(plan.days[dayIdx]);
      else setToday(getTodayWorkout());
    }
  }

  if (!today) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const isRest = today.exercises.length === 0;
  const isShared = source === 'shared';
  const sharedAvailable = !!sharedPlan;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.dayLabel}>{dayName.toUpperCase()}</Text>
        <Text style={styles.title}>Séance du jour</Text>
        <View style={styles.musclesRow}>
          {today.label ? (
            <View style={styles.muscleChip}>
              <Text style={styles.muscleText}>{today.label}</Text>
            </View>
          ) : null}
          {(today.muscles ?? []).map(m => (
            <View key={m} style={styles.muscleChip}>
              <Text style={styles.muscleText}>{m}</Text>
            </View>
          ))}
        </View>

        {/* Source toggle */}
        <View style={styles.sourceRow}>
          <TouchableOpacity
            style={[styles.sourceBtn, !isShared && styles.sourceBtnActive]}
            onPress={() => switchSource('mine')}
            activeOpacity={0.75}
          >
            <Ionicons name="phone-portrait-outline" size={13} color={!isShared ? '#000' : colors.textMuted} />
            <Text style={[styles.sourceBtnText, !isShared && styles.sourceBtnTextActive]}>Mon plan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sourceBtn, isShared && styles.sourceBtnActiveSync]}
            onPress={() => switchSource('shared')}
            activeOpacity={0.75}
          >
            {loadingSync
              ? <ActivityIndicator size="small" color={isShared ? '#000' : colors.primary} />
              : <Ionicons name="people-outline" size={13} color={isShared ? '#000' : sharedAvailable ? '#00b4d8' : colors.textMuted} />
            }
            <Text style={[styles.sourceBtnText, isShared && styles.sourceBtnTextActive]}>
              Plan partagé
            </Text>
          </TouchableOpacity>
        </View>

        {isShared && !sharedAvailable && (
          <Text style={styles.noSharedHint}>
            Aucun plan sync — active Plan Sync dans l'onglet Plan.
          </Text>
        )}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {isRest ? (
          <View style={styles.restContainer}>
            <Text style={styles.restEmoji}>😴</Text>
            <Text style={styles.restTitle}>Jour de repos</Text>
            <Text style={styles.restSub}>Profite — les muscles poussent au repos.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>EXERCICES DU JOUR</Text>
            {today.exercises.map((ex, i) => (
              <View key={i} style={styles.exerciseRow}>
                <View style={styles.numCircle}>
                  <Text style={styles.numText}>{i + 1}</Text>
                </View>
                <Text style={styles.exerciseName}>{ex}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startBtn, isRest && styles.startBtnDisabled]}
          activeOpacity={isRest ? 1 : 0.8}
          onPress={() => !isRest && navigation.navigate('WorkoutSession', { exercises: today.exercises, label: today.label })}
        >
          <Ionicons name={isRest ? 'bed-outline' : 'play'} size={22} color={isRest ? colors.textMuted : '#000'} style={styles.startIcon} />
          <Text style={[styles.startText, isRest && styles.startTextDisabled]}>
            {isRest ? 'REPOS' : 'COMMENCER'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  dayLabel: { fontSize: 12, fontWeight: '800', color: '#FF6B00', letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 38, fontWeight: '900', color: '#FFFFFF', marginBottom: 12, letterSpacing: -1 },
  musclesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  muscleChip: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#242424',
  },
  muscleText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Source toggle
  sourceRow: { flexDirection: 'row', gap: 8 },
  sourceBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 18,
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#242424',
  },
  sourceBtnActive:     { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  sourceBtnActiveSync: { backgroundColor: '#00b4d8', borderColor: '#00b4d8' },
  sourceBtnText:       { fontSize: 12, fontWeight: '700', color: '#484848' },
  sourceBtnTextActive: { color: '#000' },
  noSharedHint: {
    marginTop: 8, fontSize: 11, color: '#484848',
    fontStyle: 'italic', textAlign: 'center',
  },

  list: { flex: 1 },
  listContent: { padding: 22, paddingBottom: 12 },
  sectionLabel: { color: '#484848', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 14 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 22,
    padding: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#242424',
  },
  numCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  numText: { color: '#999999', fontSize: 13, fontWeight: '700' },
  exerciseName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  footer: {
    padding: 22,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#242424',
  },
  startBtn: {
    backgroundColor: '#FF6B00',
    borderRadius: 20,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  startIcon: { marginRight: 10 },
  startText: { color: '#000', fontSize: 19, fontWeight: '900', letterSpacing: 1.5 },
  startBtnDisabled: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#242424', shadowOpacity: 0 },
  startTextDisabled: { color: '#484848' },
  restContainer: { alignItems: 'center', paddingTop: 72, gap: 16 },
  restEmoji: { fontSize: 72 },
  restTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  restSub: { fontSize: 15, color: '#999999', textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 },
});
