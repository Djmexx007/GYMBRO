import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getExerciseLibrary } from '../storage/storage';
import { DEFAULT_LIBRARY } from '../data/defaultPlans';
import { exportPlanToExcel } from '../lib/exportPlan';

// ── Exercise pools by goal ─────────────────────────────────────────────────────

const POOLS = {
  chest:     ['Bench Press', 'Incline Dumbbell Press', 'Cable Fly', 'Dips', 'Pec Deck', 'Incline Barbell Press'],
  back:      ['Barbell Row', 'Pull-ups', 'Lat Pulldown', 'Seated Cable Row', 'Face Pulls', 'Deadlift'],
  legs:      ['Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curl', 'Leg Extension', 'Calf Raises', 'Bulgarian Split Squat'],
  shoulders: ['Shoulder Press', 'Lateral Raises', 'Front Raises', 'Rear Delt Fly', 'Arnold Press'],
  biceps:    ['Biceps Curl', 'Hammer Curl', 'Preacher Curl', 'Incline Dumbbell Curl'],
  triceps:   ['Triceps Pushdown', 'Skull Crushers', 'Overhead Triceps Extension', 'Close Grip Bench'],
  core:      ['Plank', 'Ab Wheel', 'Hanging Leg Raise', 'Cable Crunch', 'Russian Twists'],
};

const DUMBBELL_POOLS = {
  chest:     ['Flat Dumbbell Press', 'Incline Dumbbell Press', 'Dumbbell Fly', 'Push-ups'],
  back:      ['Dumbbell Row', 'Pull-ups', 'Australian Pull-ups', 'Face Pulls'],
  legs:      ['Goblet Squat', 'Romanian Deadlift', 'Bulgarian Split Squat', 'Walking Lunges', 'Calf Raises'],
  shoulders: ['Dumbbell Shoulder Press', 'Lateral Raises', 'Front Raises', 'Rear Delt Fly'],
  biceps:    ['Biceps Curl', 'Hammer Curl', 'Concentration Curl'],
  triceps:   ['Overhead Triceps Extension', 'Triceps Kickback', 'Diamond Push-ups'],
  core:      ['Plank', 'Ab Wheel', 'Russian Twists', 'Dead Bug'],
};

const BARBELL_POOLS = {
  chest:     ['Bench Press', 'Incline Barbell Press', 'Close Grip Bench'],
  back:      ['Barbell Row', 'Deadlift', 'Pendlay Row', 'Rack Pulls'],
  legs:      ['Squat', 'Front Squat', 'Romanian Deadlift', 'Good Mornings'],
  shoulders: ['Shoulder Press', 'Upright Row', 'Shrugs'],
  biceps:    ['Barbell Curl', 'Reverse Curl'],
  triceps:   ['Skull Crushers', 'Close Grip Bench'],
  core:      ['Ab Wheel', 'Plank', 'Hanging Leg Raise'],
};

// ── Sets/reps by goal ──────────────────────────────────────────────────────────

const SCHEME = {
  force:        { sets: '5', reps: '3–5',   rest: '3–5 min' },
  hypertrophie: { sets: '4', reps: '8–12',  rest: '60–90 s' },
  endurance:    { sets: '3', reps: '15–20', rest: '30–45 s' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function getPools(equipment) {
  if (equipment === 'dumbbells') return DUMBBELL_POOLS;
  if (equipment === 'barbell')   return BARBELL_POOLS;
  return POOLS;
}

// ── Plan generation logic ──────────────────────────────────────────────────────

function generatePlan(days, goal, equipment) {
  const pools = getPools(equipment);
  const scheme = SCHEME[goal];

  if (days === 3) {
    // Full body 3x/week
    return ['Lundi', 'Mercredi', 'Vendredi'].map(label => ({
      label,
      exercises: [
        ...pickN(pools.chest, 1),
        ...pickN(pools.back, 2),
        ...pickN(pools.legs, 2),
        ...pickN(pools.shoulders, 1),
        ...pickN(pools.biceps, 1),
        ...pickN(pools.triceps, 1),
        ...pickN(pools.core, 1),
      ],
      scheme,
    }));
  }

  if (days === 4) {
    // Upper / Lower split
    return [
      {
        label: 'Lundi — Upper A',
        exercises: [...pickN(pools.chest, 2), ...pickN(pools.back, 2), ...pickN(pools.shoulders, 1), ...pickN(pools.biceps, 1), ...pickN(pools.triceps, 1)],
        scheme,
      },
      {
        label: 'Mardi — Lower A',
        exercises: [...pickN(pools.legs, 4), ...pickN(pools.core, 2)],
        scheme,
      },
      {
        label: 'Jeudi — Upper B',
        exercises: [...pickN(pools.chest, 2), ...pickN(pools.back, 2), ...pickN(pools.shoulders, 2), ...pickN(pools.biceps, 1), ...pickN(pools.triceps, 1)],
        scheme,
      },
      {
        label: 'Vendredi — Lower B',
        exercises: [...pickN(pools.legs, 4), ...pickN(pools.core, 2)],
        scheme,
      },
    ];
  }

  if (days === 5) {
    // PPL + Upper + Lower
    return [
      {
        label: 'Lundi — Push',
        exercises: [...pickN(pools.chest, 3), ...pickN(pools.shoulders, 2), ...pickN(pools.triceps, 2)],
        scheme,
      },
      {
        label: 'Mardi — Pull',
        exercises: [...pickN(pools.back, 3), ...pickN(pools.biceps, 2)],
        scheme,
      },
      {
        label: 'Mercredi — Legs',
        exercises: [...pickN(pools.legs, 4), ...pickN(pools.core, 2)],
        scheme,
      },
      {
        label: 'Jeudi — Upper',
        exercises: [...pickN(pools.chest, 2), ...pickN(pools.back, 2), ...pickN(pools.shoulders, 1), ...pickN(pools.biceps, 1), ...pickN(pools.triceps, 1)],
        scheme,
      },
      {
        label: 'Vendredi — Lower',
        exercises: [...pickN(pools.legs, 4), ...pickN(pools.core, 1)],
        scheme,
      },
    ];
  }

  // 6 days — PPL x2
  return [
    {
      label: 'Lundi — Push A',
      exercises: [...pickN(pools.chest, 3), ...pickN(pools.shoulders, 2), ...pickN(pools.triceps, 2)],
      scheme,
    },
    {
      label: 'Mardi — Pull A',
      exercises: [...pickN(pools.back, 4), ...pickN(pools.biceps, 2)],
      scheme,
    },
    {
      label: 'Mercredi — Legs A',
      exercises: [...pickN(pools.legs, 4), ...pickN(pools.core, 2)],
      scheme,
    },
    {
      label: 'Jeudi — Push B',
      exercises: [...pickN(pools.chest, 3), ...pickN(pools.shoulders, 2), ...pickN(pools.triceps, 2)],
      scheme,
    },
    {
      label: 'Vendredi — Pull B',
      exercises: [...pickN(pools.back, 4), ...pickN(pools.biceps, 2)],
      scheme,
    },
    {
      label: 'Samedi — Legs B',
      exercises: [...pickN(pools.legs, 4), ...pickN(pools.core, 2)],
      scheme,
    },
  ];
}

// ── Excel export ───────────────────────────────────────────────────────────────


// ── Component ──────────────────────────────────────────────────────────────────

const EMPTY_DAY = (n) => ({ label: `Jour ${n}`, exercises: [], input: '' });

export default function WorkoutGeneratorModal({ visible, onClose }) {
  // Mode
  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'

  // Auto state
  const [days,      setDays]      = useState(4);
  const [goal,      setGoal]      = useState('hypertrophie');
  const [equipment, setEquipment] = useState('full');
  const [generated, setGenerated] = useState(null);

  // Manual state
  const [manualDays, setManualDays] = useState([EMPTY_DAY(1)]);

  // Library & suggestions state (manual mode)
  const [library, setLibrary] = useState([...DEFAULT_LIBRARY]);
  const [suggestions, setSuggestions] = useState({}); // { dayIndex: string[] }

  const [exporting, setExporting] = useState(false);

  // Load exercise library when modal opens
  useEffect(() => {
    if (!visible) return;
    getExerciseLibrary().then(lib => {
      // Merge DEFAULT_LIBRARY + custom library, without duplicates
      const all = [...new Set([...DEFAULT_LIBRARY, ...lib])].sort();
      setLibrary(all);
    }).catch(() => {});
  }, [visible]);

  function generate() {
    setGenerated(generatePlan(days, goal, equipment));
  }

  // ── Manual helpers ────────────────────────────────────────────────────────

  function addManualDay() {
    setManualDays(prev => [...prev, EMPTY_DAY(prev.length + 1)]);
  }

  function removeManualDay(i) {
    setManualDays(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateDayLabel(i, label) {
    setManualDays(prev => prev.map((d, idx) => idx === i ? { ...d, label } : d));
  }

  function updateDayInput(i, text) {
    setManualDays(prev => prev.map((d, idx) => idx === i ? { ...d, input: text } : d));
  }

  function addExerciseToDay(i) {
    setManualDays(prev => prev.map((d, idx) => {
      if (idx !== i) return d;
      const trimmed = d.input.trim();
      if (!trimmed || d.exercises.includes(trimmed)) return { ...d, input: '' };
      return { ...d, exercises: [...d.exercises, trimmed], input: '' };
    }));
  }

  function removeExerciseFromDay(dayIdx, exIdx) {
    setManualDays(prev => prev.map((d, idx) =>
      idx === dayIdx ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIdx) } : d
    ));
  }

  // ── Suggestion helpers ────────────────────────────────────────────────────

  function onExInputChange(dayIdx, text) {
    updateDayInput(dayIdx, text);
    if (text.length < 2) {
      setSuggestions(prev => ({ ...prev, [dayIdx]: [] }));
      return;
    }
    const q = text.toLowerCase();
    const matches = library.filter(ex => ex.toLowerCase().includes(q)).slice(0, 6);
    setSuggestions(prev => ({ ...prev, [dayIdx]: matches }));
  }

  function selectSuggestion(dayIdx, ex) {
    // Add the exercise to the day
    setManualDays(prev => prev.map((d, idx) => {
      if (idx !== dayIdx) return d;
      if (d.exercises.includes(ex)) return { ...d, input: '' };
      return { ...d, exercises: [...d.exercises, ex], input: '' };
    }));
    setSuggestions(prev => ({ ...prev, [dayIdx]: [] }));
  }

  function createCustomExercise(dayIdx) {
    addExerciseToDay(dayIdx); // existing function
    setSuggestions(prev => ({ ...prev, [dayIdx]: [] }));
  }

  // ── Export ────────────────────────────────────────────────────────────────

  async function handleExport() {
    const planToExport = mode === 'auto' ? generated : manualDays.map(d => ({
      label: d.label,
      exercises: d.exercises,
      scheme: null,
    }));
    if (!planToExport?.length) return;
    const goalLabel  = goal === 'force' ? 'Force' : goal === 'hypertrophie' ? 'Hypertrophie' : 'Endurance';
    const equipLabel = equipment === 'full' ? 'Salle complète' : equipment === 'dumbbells' ? 'Haltères' : 'Barre';
    setExporting(true);
    await exportPlanToExcel({
      planName: `Programme ${goalLabel}`,
      planType: `${goalLabel} · ${equipLabel}`,
      userName: '',
      mode:     'solo',
      days:     planToExport,
    });
    setExporting(false);
  }

  function handleClose() {
    setGenerated(null);
    onClose();
  }

  const canExportManual = manualDays.some(d => d.exercises.length > 0);
  const canExportAuto   = !!generated;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Programme</Text>
            <Text style={styles.subtitle}>🔒 Fonctionnalité secrète</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'auto' && styles.modeBtnActive]}
            onPress={() => setMode('auto')} activeOpacity={0.8}
          >
            <Ionicons name="flash" size={14} color={mode === 'auto' ? '#000' : '#484848'} />
            <Text style={[styles.modeBtnTxt, mode === 'auto' && styles.modeBtnTxtActive]}>Générer auto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
            onPress={() => setMode('manual')} activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={14} color={mode === 'manual' ? '#000' : '#484848'} />
            <Text style={[styles.modeBtnTxt, mode === 'manual' && styles.modeBtnTxtActive]}>Créer manuellement</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ══════════════════════════════ AUTO MODE ══════════════════════════════ */}
          {mode === 'auto' && (
            <>
              <Text style={styles.sectionLabel}>JOURS PAR SEMAINE</Text>
              <View style={styles.optionRow}>
                {[3, 4, 5, 6].map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.optionBtn, days === d && styles.optionBtnActive]}
                    onPress={() => { setDays(d); setGenerated(null); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.optionText, days === d && styles.optionTextActive]}>{d}J</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>OBJECTIF</Text>
              <View style={styles.goalRow}>
                {[
                  { key: 'force',        label: '💪 Force',        sub: '3–5 reps' },
                  { key: 'hypertrophie', label: '🔥 Hypertrophie', sub: '8–12 reps' },
                  { key: 'endurance',    label: '⚡ Endurance',    sub: '15–20 reps' },
                ].map(g => (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.goalBtn, goal === g.key && styles.goalBtnActive]}
                    onPress={() => { setGoal(g.key); setGenerated(null); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.goalLabel, goal === g.key && styles.goalLabelActive]}>{g.label}</Text>
                    <Text style={styles.goalSub}>{g.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>ÉQUIPEMENT</Text>
              <View style={styles.equipRow}>
                {[
                  { key: 'full',      label: '🏋️ Salle complète' },
                  { key: 'dumbbells', label: '🥊 Haltères' },
                  { key: 'barbell',   label: '🔩 Barre seulement' },
                ].map(e => (
                  <TouchableOpacity
                    key={e.key}
                    style={[styles.equipBtn, equipment === e.key && styles.equipBtnActive]}
                    onPress={() => { setEquipment(e.key); setGenerated(null); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.equipText, equipment === e.key && styles.equipTextActive]}>{e.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.generateBtn} onPress={generate} activeOpacity={0.85}>
                <Ionicons name="flash" size={20} color="#000" />
                <Text style={styles.generateBtnText}>GÉNÉRER LE PROGRAMME</Text>
              </TouchableOpacity>

              {generated && (
                <View style={styles.planSection}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planTitle}>Programme généré ✓</Text>
                    <TouchableOpacity
                      style={[styles.exportBtn, exporting && { opacity: 0.6 }]}
                      onPress={handleExport} disabled={exporting} activeOpacity={0.8}
                    >
                      {exporting
                        ? <ActivityIndicator size="small" color="#000" />
                        : <><Ionicons name="download-outline" size={16} color="#000" /><Text style={styles.exportBtnText}>EXCEL</Text></>
                      }
                    </TouchableOpacity>
                  </View>

                  {generated.map((day, i) => (
                    <View key={i} style={styles.dayCard}>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      <Text style={styles.dayScheme}>{day.scheme.sets} × {day.scheme.reps} · repos {day.scheme.rest}</Text>
                      {day.exercises.map((ex, j) => (
                        <View key={j} style={styles.exRow}>
                          <View style={styles.exNum}><Text style={styles.exNumText}>{j + 1}</Text></View>
                          <Text style={styles.exName}>{ex}</Text>
                        </View>
                      ))}
                    </View>
                  ))}

                  <TouchableOpacity style={styles.regenBtn} onPress={generate} activeOpacity={0.75}>
                    <Ionicons name="refresh" size={16} color={colors.primary} />
                    <Text style={styles.regenText}>Regénérer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* ══════════════════════════════ MANUAL MODE ════════════════════════════ */}
          {mode === 'manual' && (
            <>
              <Text style={styles.sectionLabel}>TON PROGRAMME PERSONNALISÉ</Text>

              {manualDays.map((day, i) => (
                <View key={i} style={styles.dayCard}>
                  {/* Day header: editable label + delete */}
                  <View style={styles.manualDayHeader}>
                    <TextInput
                      style={styles.manualDayLabel}
                      value={day.label}
                      onChangeText={v => updateDayLabel(i, v)}
                      placeholder="Nom de la journée…"
                      placeholderTextColor="#484848"
                      selectTextOnFocus
                    />
                    {manualDays.length > 1 && (
                      <TouchableOpacity onPress={() => removeManualDay(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Exercise list */}
                  {day.exercises.map((ex, j) => (
                    <View key={j} style={styles.exRow}>
                      <View style={styles.exNum}><Text style={styles.exNumText}>{j + 1}</Text></View>
                      <Text style={styles.exName}>{ex}</Text>
                      <TouchableOpacity onPress={() => removeExerciseFromDay(i, j)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color="#484848" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Add exercise input + suggestions */}
                  <View style={styles.exInputRow}>
                    <TextInput
                      style={styles.exInput}
                      value={day.input}
                      onChangeText={v => onExInputChange(i, v)}
                      placeholder="Chercher ou ajouter un exercice…"
                      placeholderTextColor="#484848"
                      onSubmitEditing={() => createCustomExercise(i)}
                      returnKeyType="done"
                    />
                    <TouchableOpacity style={styles.exAddBtn} onPress={() => createCustomExercise(i)} activeOpacity={0.8}>
                      <Ionicons name="add" size={18} color="#000" />
                    </TouchableOpacity>
                  </View>

                  {/* Suggestions dropdown */}
                  {(suggestions[i] ?? []).length > 0 && (
                    <View style={styles.suggestionList}>
                      {(suggestions[i]).map((ex, si) => (
                        <TouchableOpacity
                          key={si}
                          style={[styles.suggestionItem, si < suggestions[i].length - 1 && styles.suggestionBorder]}
                          onPress={() => selectSuggestion(i, ex)}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.suggestionText}>{ex}</Text>
                          <Ionicons name="add-circle-outline" size={16} color="#484848" />
                        </TouchableOpacity>
                      ))}
                      {/* Create if no exact match */}
                      {day.input.trim().length >= 2 && !library.some(ex => ex.toLowerCase() === day.input.trim().toLowerCase()) && (
                        <TouchableOpacity
                          style={styles.createSuggestion}
                          onPress={() => createCustomExercise(i)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="add" size={14} color="#FF6B00" />
                          <Text style={styles.createSuggestionText}>Créer « {day.input.trim()} »</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))}

              {/* Add day button */}
              <TouchableOpacity style={styles.addDayBtn} onPress={addManualDay} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={18} color="#FF6B00" />
                <Text style={styles.addDayTxt}>Ajouter une journée</Text>
              </TouchableOpacity>

              {/* Export button */}
              {canExportManual && (
                <TouchableOpacity
                  style={[styles.generateBtn, { marginTop: 16 }, exporting && { opacity: 0.6 }]}
                  onPress={handleExport} disabled={exporting} activeOpacity={0.85}
                >
                  {exporting
                    ? <ActivityIndicator size="small" color="#000" />
                    : <><Ionicons name="download-outline" size={20} color="#000" /><Text style={styles.generateBtnText}>TÉLÉCHARGER EN EXCEL</Text></>
                  }
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18,
    borderBottomWidth: 1, borderBottomColor: '#242424',
  },
  title:    { fontSize: 34, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  subtitle: { fontSize: 12, color: '#484848', fontWeight: '600', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  content:  { padding: 20 },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#484848', letterSpacing: 1.8, marginBottom: 10, marginTop: 20 },

  // Days
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: {
    flex: 1, height: 52, borderRadius: 14, backgroundColor: '#111111',
    borderWidth: 1, borderColor: '#242424', alignItems: 'center', justifyContent: 'center',
  },
  optionBtnActive: { backgroundColor: 'rgba(255,107,0,0.12)', borderColor: '#FF6B00' },
  optionText: { fontSize: 16, fontWeight: '800', color: '#484848' },
  optionTextActive: { color: '#FF6B00' },

  // Goal
  goalRow: { gap: 10 },
  goalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111111', borderRadius: 16, borderWidth: 1, borderColor: '#242424',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  goalBtnActive: { backgroundColor: 'rgba(255,107,0,0.1)', borderColor: '#FF6B00' },
  goalLabel: { fontSize: 15, fontWeight: '700', color: '#484848' },
  goalLabelActive: { color: '#FFFFFF' },
  goalSub: { fontSize: 12, color: '#484848' },

  // Equipment
  equipRow: { gap: 8 },
  equipBtn: {
    backgroundColor: '#111111', borderRadius: 14, borderWidth: 1, borderColor: '#242424',
    paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center',
  },
  equipBtnActive: { backgroundColor: 'rgba(255,107,0,0.1)', borderColor: '#FF6B00' },
  equipText: { fontSize: 14, fontWeight: '700', color: '#484848' },
  equipTextActive: { color: '#FF6B00' },

  // Generate
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FF6B00', borderRadius: 18, height: 58, marginTop: 28,
    shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  generateBtnText: { fontSize: 15, fontWeight: '900', color: '#000', letterSpacing: 1.2 },

  // Plan display
  planSection: { marginTop: 28 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  planTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FF6B00', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
  },
  exportBtnText: { fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 0.8 },

  dayCard: {
    backgroundColor: '#111111', borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#242424',
  },
  dayLabel:  { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  dayScheme: { fontSize: 11, color: '#FF6B00', fontWeight: '600', marginBottom: 12 },
  exRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  exNum:     { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  exNumText: { fontSize: 10, fontWeight: '800', color: '#484848' },
  exName:    { fontSize: 14, fontWeight: '600', color: '#999999', flex: 1 },

  regenBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 14 },
  regenText: { fontSize: 13, fontWeight: '700', color: '#FF6B00' },

  // Mode toggle
  modeToggle: { flexDirection: 'row', marginHorizontal: 20, marginTop: 14, gap: 10 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 42, borderRadius: 14, backgroundColor: '#111111', borderWidth: 1, borderColor: '#242424',
  },
  modeBtnActive: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  modeBtnTxt: { fontSize: 13, fontWeight: '700', color: '#484848' },
  modeBtnTxtActive: { color: '#000' },

  // Manual mode
  manualDayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  manualDayLabel: {
    flex: 1, fontSize: 16, fontWeight: '800', color: '#FFFFFF',
    padding: 0, marginRight: 10,
  },
  exInputRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  exInput: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#242424',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#FFFFFF',
  },
  exAddBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#FF6B00',
    alignItems: 'center', justifyContent: 'center',
  },
  addDayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,107,0,0.3)',
    backgroundColor: 'rgba(255,107,0,0.06)', marginTop: 4,
  },
  addDayTxt: { fontSize: 14, fontWeight: '700', color: '#FF6B00' },

  // Suggestions
  suggestionList: {
    backgroundColor: '#0F0F0F', borderRadius: 14, borderWidth: 1, borderColor: '#242424',
    marginTop: -2, marginBottom: 8, overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  suggestionText: { fontSize: 14, color: '#FFFFFF', fontWeight: '500', flex: 1 },
  createSuggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#1A1A1A',
    backgroundColor: 'rgba(255,107,0,0.04)',
  },
  createSuggestionText: { fontSize: 13, color: '#FF6B00', fontWeight: '600' },
});
