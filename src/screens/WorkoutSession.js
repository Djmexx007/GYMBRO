import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { saveSession, getLogs, getCloudLogs, getUserName } from '../storage/storage';
import { getPrimary, getSecondary, isDumbbellExercise, toDisplayWeight, toStoredWeight } from '../data/muscleGroups';

const DRAFT_KEY = '@gym_session_draft';

// exercise → { last: meilleure série du jour le plus récent, best: poids max all-time (stocké) }
function computeHistory(logs) {
  const last = {};
  const best = {};
  const latestDay = {};
  logs.forEach(s => {
    if (best[s.exercise] == null || s.weight > best[s.exercise]) best[s.exercise] = s.weight;
    const day = s.date.slice(0, 10);
    const cur = latestDay[s.exercise];
    if (!cur || day > cur.day || (day === cur.day && s.weight > cur.set.weight)) {
      latestDay[s.exercise] = { day, set: s };
    }
  });
  Object.keys(latestDay).forEach(ex => { last[ex] = latestDay[ex].set; });
  return { last, best };
}

function fmtRest(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function fmtShortDate(iso) {
  return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
}

export default function WorkoutSession({ navigation, route }) {
  const { exercises, label } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sessionSets, setSessionSets] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [lastPerf, setLastPerf] = useState({});     // exercise → dernière série connue
  const [bestWeights, setBestWeights] = useState({}); // exercise → poids max all-time (stocké)
  const [lastSetAt, setLastSetAt] = useState(null);   // chrono de repos
  const [now, setNow] = useState(Date.now());

  const repsInputRef = useRef(null);

  // Historique — alimente « Dernière fois » et la détection de PR
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let logs = null;
      try {
        const name = await getUserName();
        if (name) logs = await getCloudLogs(name);
      } catch {}
      if (!logs || logs.length === 0) logs = await getLogs();
      if (cancelled || !logs || logs.length === 0) return;
      const { last, best } = computeHistory(logs);
      setLastPerf(last);
      setBestWeights(best);
    })();
    return () => { cancelled = true; };
  }, []);

  // Tick du chrono de repos
  useEffect(() => {
    if (!lastSetAt || showSummary) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lastSetAt, showSummary]);

  const restSec = lastSetAt ? Math.max(0, Math.floor((now - lastSetAt) / 1000)) : null;

  // Draft recovery — si l'app a fermé pendant une séance, proposer de reprendre
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then(raw => {
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft?.sets?.length) return;
      Alert.alert(
        '💪 Séance non terminée',
        `${draft.sets.length} set${draft.sets.length > 1 ? 's' : ''} enregistré${draft.sets.length > 1 ? 's' : ''} avant la fermeture. Reprendre ?`,
        [
          { text: 'Ignorer', style: 'cancel', onPress: () => AsyncStorage.removeItem(DRAFT_KEY) },
          { text: 'Reprendre', onPress: () => setSessionSets(draft.sets) },
        ]
      );
    }).catch(() => {});
  }, []);

  const currentExercise = exercises[currentIndex];
  const currentExerciseSets = sessionSets.filter(s => s.exercise === currentExercise);
  const isLastExercise = currentIndex === exercises.length - 1;

  function saveSet() {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (!weight || !reps || isNaN(w) || isNaN(r) || r <= 0 || w < 0) {
      Alert.alert('Infos manquantes', 'Entre le poids et les reps avant de valider le set.');
      return;
    }
    const stored = toStoredWeight(currentExercise, w);
    const prevBest = bestWeights[currentExercise];
    const isPr = prevBest != null && stored > prevBest;
    const newSet = {
      exercise: currentExercise,
      weight: stored,
      reps: r,
      date: new Date().toISOString(),
      ...(isPr ? { isPr: true } : {}),
    };
    if (isPr) {
      Vibration.vibrate([0, 60, 80, 60]);
      setBestWeights(prev => ({ ...prev, [currentExercise]: stored }));
    }
    setSessionSets(prev => {
      const next = [...prev, newSet];
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ sets: next })).catch(() => {});
      return next;
    });
    setLastSetAt(Date.now());
    setReps('');
    repsInputRef.current?.focus();
  }

  function goNext() {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setWeight('');
      setReps('');
    }
  }

  function jumpTo(index) {
    setCurrentIndex(index);
    setWeight('');
    setReps('');
  }

  async function finishWorkout() {
    if (sessionSets.length === 0) {
      Alert.alert('Aucun set enregistré', 'Valide au moins un set avant de terminer.');
      return;
    }
    // isPr est un état d'affichage local — on ne le persiste pas
    await saveSession(sessionSets.map(({ isPr, ...s }) => s));
    await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    setShowSummary(true);
  }

  function confirmAbort() {
    Alert.alert(
      'Abandonner la séance ?',
      'Tes sets ne seront pas sauvegardés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Abandonner',
          style: 'destructive',
          onPress: () => {
            AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
            navigation.goBack();
          },
        },
      ]
    );
  }

  // ── Summary screen ────────────────────────────────────────────────────────
  if (showSummary) {
    const uniqueExercises = [...new Set(sessionSets.map(s => s.exercise))];
    const totalVolume = sessionSets.reduce((acc, s) => acc + s.weight * s.reps, 0);
    const prCount = sessionSets.filter(s => s.isPr).length;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.summaryContent}>
          <Text style={styles.summaryEmoji}>{prCount > 0 ? '🏆' : '💪'}</Text>
          <Text style={styles.summaryTitle}>SÉANCE TERMINÉE !</Text>
          <Text style={styles.summaryLabel}>
            {label}{prCount > 0 ? ` · ${prCount} PR 🏆` : ''}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{sessionSets.length}</Text>
              <Text style={styles.statKey}>SETS</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{uniqueExercises.length}</Text>
              <Text style={styles.statKey}>EXERCICES</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Math.round(totalVolume).toLocaleString()}</Text>
              <Text style={styles.statKey}>VOLUME LBS</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>RÉSUMÉ</Text>
          {uniqueExercises.map(ex => {
            const sets = sessionSets.filter(s => s.exercise === ex);
            const best = sets.reduce((a, b) => (a.weight > b.weight ? a : b));
            const hasPr = sets.some(s => s.isPr);
            return (
              <View key={ex} style={styles.summaryExRow}>
                <Text style={styles.summaryExName}>{ex}{hasPr ? ' 🏆' : ''}</Text>
                <Text style={styles.summaryExDetail}>
                  {sets.length} sets · meilleur {toDisplayWeight(ex, best.weight)} × {best.reps}
                </Text>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>TERMINÉ</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Active session ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={confirmAbort} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.topProgress}>
            {currentIndex + 1} / {exercises.length}
          </Text>
          <Text style={styles.topLabel}>{label}</Text>
        </View>
        <TouchableOpacity style={styles.finishBtn} onPress={finishWorkout} activeOpacity={0.8}>
          <Text style={styles.finishBtnText}>TERMINER</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sessionContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Exercise name + muscles */}
          <Text style={styles.exerciseName}>{currentExercise}</Text>
          {(() => {
            const primaries = getPrimary(currentExercise);
            const secondaries = getSecondary(currentExercise);
            if (!primaries.length && !secondaries.length) return null;
            return (
              <View style={styles.muscleRow}>
                {primaries.map(m => (
                  <View key={m} style={styles.musclePrimary}>
                    <Text style={styles.musclePrimaryText}>{m}</Text>
                  </View>
                ))}
                {secondaries.map(m => (
                  <View key={m} style={styles.muscleSecondary}>
                    <Text style={styles.muscleSecondaryText}>{m}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* Dernière performance connue — tap pour préremplir le poids */}
          {lastPerf[currentExercise] && (
            <TouchableOpacity
              style={styles.lastPerfChip}
              onPress={() => setWeight(String(toDisplayWeight(currentExercise, lastPerf[currentExercise].weight)))}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.lastPerfTxt}>
                Dernière fois : {toDisplayWeight(currentExercise, lastPerf[currentExercise].weight)} × {lastPerf[currentExercise].reps}
                {'  ·  '}{fmtShortDate(lastPerf[currentExercise].date)}
              </Text>
            </TouchableOpacity>
          )}

          {/* Live set log */}
          {currentExerciseSets.length > 0 && (
            <View style={styles.setsLog}>
              {currentExerciseSets.map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.setRow,
                    i < currentExerciseSets.length - 1 && styles.setRowBorder,
                  ]}
                >
                  <Text style={styles.setNum}>SET {i + 1}</Text>
                  <Text style={styles.setVal}>
                    {toDisplayWeight(s.exercise, s.weight)} × {s.reps}
                  </Text>
                  {s.isPr && <Text style={styles.setPr}>🏆</Text>}
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                </View>
              ))}
            </View>
          )}

          {/* Inputs */}
          <View style={styles.inputCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isDumbbellExercise(currentExercise) ? 'POIDS PAR HALTÈRE (lbs)' : 'POIDS (lbs)'}
              </Text>
              <TextInput
                style={styles.inputField}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
                onSubmitEditing={() => repsInputRef.current?.focus()}
                selectTextOnFocus
              />
            </View>
            <View style={styles.inputDivider} />
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>REPS</Text>
              <TextInput
                ref={repsInputRef}
                style={styles.inputField}
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={saveSet}
                selectTextOnFocus
              />
            </View>
          </View>

          {/* VALIDER LE SET */}
          <TouchableOpacity style={styles.saveSetBtn} onPress={saveSet} activeOpacity={0.8}>
            <Text style={styles.saveSetText}>VALIDER LE SET</Text>
          </TouchableOpacity>

          {/* Chrono de repos — temps écoulé depuis le dernier set */}
          {restSec != null && (
            <View style={styles.restRow}>
              <Ionicons name="timer-outline" size={15} color={colors.primary} />
              <Text style={styles.restTxt}>Repos : {fmtRest(restSec)}</Text>
            </View>
          )}

          {/* EXERCICE SUIVANT */}
          {!isLastExercise && (
            <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.8}>
              <Text style={styles.nextBtnText}>EXERCICE SUIVANT</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.text} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}

          {/* Exercise navigator dots */}
          <View style={styles.dotsRow}>
            {exercises.map((_, i) => {
              const active = i === currentIndex;
              const hasSets = sessionSets.some(s => s.exercise === exercises[i]);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dot,
                    active && styles.dotActive,
                    !active && hasSets && styles.dotDone,
                  ]}
                  onPress={() => jumpTo(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text
                    style={[
                      styles.dotText,
                      (active || hasSets) && styles.dotTextDark,
                    ]}
                  >
                    {i + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  topCenter: {
    alignItems: 'center',
  },
  topProgress: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topLabel: {
    color: '#999999',
    fontSize: 11,
    marginTop: 1,
  },
  finishBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  finishBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Session content
  sessionContent: {
    padding: 22,
    paddingBottom: 40,
  },
  exerciseName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 10,
    lineHeight: 50,
    letterSpacing: -1,
  },
  muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 },
  musclePrimary: {
    backgroundColor: 'rgba(255,107,0,0.10)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,107,0,0.25)',
    paddingHorizontal: 9, paddingVertical: 3,
  },
  musclePrimaryText: { fontSize: 10, fontWeight: '700', color: '#FF8C00', letterSpacing: 0.2 },
  muscleSecondary: {
    backgroundColor: '#1A1A1A', borderRadius: 10,
    borderWidth: 1, borderColor: '#242424',
    paddingHorizontal: 9, paddingVertical: 3,
  },
  muscleSecondaryText: { fontSize: 10, fontWeight: '600', color: '#484848' },

  // Dernière performance
  lastPerfChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242424',
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },
  lastPerfTxt: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '600',
  },

  // Chrono de repos
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  restTxt: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },

  // Sets log
  setsLog: {
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingHorizontal: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#242424',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  setRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  setNum: {
    width: 52,
    color: '#484848',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  setVal: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  setPr: {
    fontSize: 14,
    marginRight: 8,
  },

  // Inputs
  inputCard: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#242424',
    overflow: 'hidden',
  },
  inputGroup: {
    flex: 1,
    padding: 18,
  },
  inputDivider: {
    width: 1,
    backgroundColor: '#242424',
    marginVertical: 14,
  },
  inputLabel: {
    color: '#484848',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputField: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    padding: 0,
    includeFontPadding: false,
  },

  // Buttons
  saveSetBtn: {
    backgroundColor: '#FF6B00',
    borderRadius: 22,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  saveSetText: {
    color: '#000',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
  },
  nextBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#242424',
    marginBottom: 28,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Exercise nav dots
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#242424',
  },
  dotActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  dotDone: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  dotText: {
    color: '#484848',
    fontSize: 13,
    fontWeight: '700',
  },
  dotTextDark: {
    color: '#000',
  },

  // Summary
  summaryContent: {
    padding: 24,
    alignItems: 'center',
  },
  summaryEmoji: {
    fontSize: 72,
    marginTop: 16,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#999999',
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 28,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242424',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FF6B00',
    marginBottom: 4,
  },
  statKey: {
    fontSize: 9,
    fontWeight: '700',
    color: '#484848',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  sectionLabel: {
    color: '#484848',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  summaryExRow: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#242424',
    width: '100%',
  },
  summaryExName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryExDetail: {
    color: '#999999',
    fontSize: 13,
  },
  doneBtn: {
    backgroundColor: '#FF6B00',
    borderRadius: 22,
    height: 80,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  doneBtnText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
