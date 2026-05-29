import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { saveSession } from '../storage/storage';

export default function WorkoutSession({ navigation, route }) {
  const { exercises, label } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sessionSets, setSessionSets] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

  const repsInputRef = useRef(null);

  const currentExercise = exercises[currentIndex];
  const currentExerciseSets = sessionSets.filter(s => s.exercise === currentExercise);
  const isLastExercise = currentIndex === exercises.length - 1;

  function saveSet() {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (!weight || !reps || isNaN(w) || isNaN(r) || r <= 0 || w < 0) {
      Alert.alert('Missing info', 'Enter weight and reps before saving a set.');
      return;
    }
    const newSet = {
      exercise: currentExercise,
      weight: w,
      reps: r,
      date: new Date().toISOString(),
    };
    setSessionSets(prev => [...prev, newSet]);
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
      Alert.alert('No sets logged', 'Log at least one set before finishing.');
      return;
    }
    await saveSession(sessionSets);
    setShowSummary(true);
  }

  function confirmAbort() {
    Alert.alert(
      'Abort workout?',
      'Your sets will not be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Abort', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  }

  // ── Summary screen ────────────────────────────────────────────────────────
  if (showSummary) {
    const uniqueExercises = [...new Set(sessionSets.map(s => s.exercise))];
    const totalVolume = sessionSets.reduce((acc, s) => acc + s.weight * s.reps, 0);

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.summaryContent}>
          <Text style={styles.summaryEmoji}>💪</Text>
          <Text style={styles.summaryTitle}>WORKOUT DONE!</Text>
          <Text style={styles.summaryLabel}>{label}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{sessionSets.length}</Text>
              <Text style={styles.statKey}>SETS</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{uniqueExercises.length}</Text>
              <Text style={styles.statKey}>EXERCISES</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Math.round(totalVolume).toLocaleString()}</Text>
              <Text style={styles.statKey}>LBS VOLUME</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>SUMMARY</Text>
          {uniqueExercises.map(ex => {
            const sets = sessionSets.filter(s => s.exercise === ex);
            const best = sets.reduce((a, b) => (a.weight > b.weight ? a : b));
            return (
              <View key={ex} style={styles.summaryExRow}>
                <Text style={styles.summaryExName}>{ex}</Text>
                <Text style={styles.summaryExDetail}>
                  {sets.length} sets · best {best.weight} × {best.reps}
                </Text>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>DONE</Text>
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
          <Text style={styles.finishBtnText}>FINISH</Text>
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
          {/* Exercise name */}
          <Text style={styles.exerciseName}>{currentExercise}</Text>

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
                    {s.weight} × {s.reps}
                  </Text>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                </View>
              ))}
            </View>
          )}

          {/* Inputs */}
          <View style={styles.inputCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WEIGHT (lbs)</Text>
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

          {/* SAVE SET */}
          <TouchableOpacity style={styles.saveSetBtn} onPress={saveSet} activeOpacity={0.8}>
            <Text style={styles.saveSetText}>SAVE SET</Text>
          </TouchableOpacity>

          {/* NEXT EXERCISE */}
          {!isLastExercise && (
            <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.8}>
              <Text style={styles.nextBtnText}>NEXT EXERCISE</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.text} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}

          {/* Exercise navigator dots */}
          <View style={styles.dotsRow}>
            {exercises.map((_, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              const hasSets = sessionSets.some(s => s.exercise === exercises[i]);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dot,
                    active && styles.dotActive,
                    done && hasSets && styles.dotDone,
                  ]}
                  onPress={() => jumpTo(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text
                    style={[
                      styles.dotText,
                      (active || (done && hasSets)) && styles.dotTextDark,
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
    backgroundColor: colors.bg,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topCenter: {
    alignItems: 'center',
  },
  topProgress: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  finishBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  finishBtnText: {
    color: colors.danger,
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
    fontSize: 38,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 22,
    lineHeight: 44,
    letterSpacing: -0.5,
  },

  // Sets log
  setsLog: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  setRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  setNum: {
    width: 52,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  setVal: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },

  // Inputs
  inputCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  inputGroup: {
    flex: 1,
    padding: 18,
  },
  inputDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputField: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
    padding: 0,
    includeFontPadding: false,
  },

  // Buttons
  saveSetBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveSetText: {
    color: '#000',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  nextBtn: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 28,
  },
  nextBtnText: {
    color: colors.text,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  dotText: {
    color: colors.textMuted,
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
    color: colors.text,
    letterSpacing: 2,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 4,
  },
  statKey: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  summaryExRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  summaryExName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryExDetail: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 68,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  doneBtnText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
