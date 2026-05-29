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

      setSharedPlan(cloud);
      setSource(src);

      const effectivePlan = (src === 'shared' && cloud) ? cloud : plan;
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
      const cloud = await getSharedPlan();
      setLoadingSync(false);
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

  if (!today) return null;

  const isRest = today.exercises.length === 0;
  const isShared = source === 'shared';
  const sharedAvailable = !!sharedPlan;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.dayLabel}>{dayName.toUpperCase()}</Text>
        <Text style={styles.title}>Today's Workout</Text>
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
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayLabel: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, fontWeight: '900', color: colors.text, marginBottom: 10, letterSpacing: -0.5 },
  musclesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  muscleChip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleText: { color: colors.text, fontSize: 13, fontWeight: '600' },

  // Source toggle
  sourceRow: { flexDirection: 'row', gap: 8 },
  sourceBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  sourceBtnActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  sourceBtnActiveSync: { backgroundColor: '#00b4d8', borderColor: '#00b4d8' },
  sourceBtnText:       { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  sourceBtnTextActive: { color: '#000' },
  noSharedHint: {
    marginTop: 8, fontSize: 11, color: colors.textMuted,
    fontStyle: 'italic', textAlign: 'center',
  },

  list: { flex: 1 },
  listContent: { padding: 22, paddingBottom: 12 },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 14 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  numCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  numText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  exerciseName: { color: colors.text, fontSize: 18, fontWeight: '600' },
  footer: {
    padding: 22,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startIcon: { marginRight: 10 },
  startText: { color: '#000', fontSize: 19, fontWeight: '900', letterSpacing: 1.5 },
  startBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  startTextDisabled: { color: colors.textMuted },
  restContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  restEmoji: { fontSize: 64 },
  restTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  restSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
