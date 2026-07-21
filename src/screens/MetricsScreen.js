import React, { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { lbToKg } from '../lib/units';
import { pingActivity } from '../storage/storage';

// ─── Nutrition defaults ───────────────────────────────────────────────────────
const DEFAULT_NUTR = { calories: 0, protein: 0, carbs: 0, fat: 0, caffeine: 0 };
const DEFAULT_CALORIE_GOAL = 2500;

// ─── IMC helpers ──────────────────────────────────────────────────────────────
function calcBMI(weightKg, heightM) {
  if (!weightKg || !heightM || heightM <= 0) return null;
  return weightKg / (heightM * heightM);
}

function getCategory(bmi) {
  if (bmi < 18.5) return { label: 'Insuffisance pondérale', color: '#60A5FA', icon: '📉' };
  if (bmi < 25)   return { label: 'Normal',                  color: colors.success, icon: '✅' };
  if (bmi < 30)   return { label: 'Surpoids',                color: colors.warning, icon: '⚠️' };
  return               { label: 'Obésité',                   color: colors.danger, icon: '🔴' };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MetricsScreen({ navigation }) {
  // Nutrition state
  const [nutr, setNutr]               = useState({ ...DEFAULT_NUTR });
  const [today, setToday]             = useState(() => new Date().toISOString().slice(0, 10));
  const [calorieGoal, setCalorieGoal] = useState(DEFAULT_CALORIE_GOAL);
  const [weekHistory, setWeekHistory] = useState([]); // 6 jours précédents { day, calories }

  // IMC state
  const [weight,     setWeight]     = useState('');
  const [height,     setHeight]     = useState('');
  const [weightUnit, setWeightUnit] = useState('lbs');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [bmi,        setBmi]        = useState(null);

  // ── Load nutrition on focus ────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    async function load() {
      const todayStr = new Date().toISOString().slice(0, 10);
      const raw = await AsyncStorage.getItem(`@gym_nutrition_${todayStr}`);
      if (raw) {
        setNutr(JSON.parse(raw));
      } else {
        setNutr({ ...DEFAULT_NUTR });
      }
      setToday(todayStr);
      const goal = await AsyncStorage.getItem('@gym_calorie_goal');
      if (goal) setCalorieGoal(parseInt(goal, 10));

      // Historique des 6 jours précédents (aujourd'hui vient de l'état live)
      const prevDays = [];
      for (let i = 6; i >= 1; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        prevDays.push(d.toISOString().slice(0, 10));
      }
      const entries = await AsyncStorage.multiGet(prevDays.map(day => `@gym_nutrition_${day}`));
      setWeekHistory(entries.map(([, rawDay], i) => {
        let calories = 0;
        try { calories = rawDay ? (JSON.parse(rawDay).calories ?? 0) : 0; } catch {}
        return { day: prevDays[i], calories };
      }));
    }
    load();
  }, []));

  // ── Save nutrition on change ───────────────────────────────────────────────
  const nutrPingTimer = useRef(null);
  useEffect(() => {
    if (!today) return;
    AsyncStorage.setItem(`@gym_nutrition_${today}`, JSON.stringify(nutr)).catch(() => {});

    // Signal radar duo — debounce 4 s pour n'envoyer que la valeur finale d'une rafale de +/-
    const hasData = nutr.calories > 0 || nutr.protein > 0 || nutr.carbs > 0 || nutr.fat > 0 || nutr.caffeine > 0;
    if (!hasData) return;
    if (nutrPingTimer.current) clearTimeout(nutrPingTimer.current);
    nutrPingTimer.current = setTimeout(() => {
      pingActivity({
        lastNutritionAt: new Date().toISOString(),
        nutritionDay: today,
        caloriesToday: nutr.calories,
        proteinToday: nutr.protein,
      });
    }, 4000);
  }, [nutr, today]);

  // ── Load IMC from storage on mount ────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('@gym_metrics').then(raw => {
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.weight)     setWeight(saved.weight);
      if (saved.height)     setHeight(saved.height);
      if (saved.weightUnit) setWeightUnit(saved.weightUnit);
      if (saved.heightUnit) setHeightUnit(saved.heightUnit);
    }).catch(() => {});
  }, []);

  // ── Nutrition helpers ──────────────────────────────────────────────────────
  function adjust(key, delta) {
    setNutr(prev => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));
  }

  function resetNutr() {
    setNutr({ ...DEFAULT_NUTR });
  }

  // ── IMC helpers ───────────────────────────────────────────────────────────
  function persistMetrics(w, h, wu, hu) {
    AsyncStorage.setItem('@gym_metrics', JSON.stringify({
      weight: w, height: h, weightUnit: wu, heightUnit: hu,
    })).catch(() => {});
  }

  function calculate() {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) { setBmi(null); return; }
    const weightKg = weightUnit === 'lbs' ? lbToKg(w) : w;
    const heightM  = heightUnit === 'cm'  ? h / 100       : h;
    setBmi(calcBMI(weightKg, heightM));
  }

  function reset() {
    setWeight('');
    setHeight('');
    setBmi(null);
  }

  const category = bmi !== null ? getCategory(bmi) : null;

  // ── Calorie bar ───────────────────────────────────────────────────────────
  const calorieRatio   = Math.min(nutr.calories / calorieGoal, 1);
  const calorieOver    = nutr.calories > calorieGoal;
  const calorieBarColor = calorieOver ? colors.danger : colors.primary;

  // ── Historique 7 jours ────────────────────────────────────────────────────
  const weekBars  = [...weekHistory, { day: today, calories: nutr.calories }];
  const weekScale = Math.max(calorieGoal, ...weekBars.map(b => b.calories), 1);
  const daysWithData = weekBars.filter(b => b.calories > 0);
  const weekAvg = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((sum, b) => sum + b.calories, 0) / daysWithData.length)
    : 0;
  const dayLetter = d => 'DLMMJVS'[new Date(d + 'T00:00:00Z').getUTCDay()];

  // ── Macro grid items ──────────────────────────────────────────────────────
  const macros = [
    { key: 'protein',  label: 'PROTÉINES',  unit: 'g',   delta: 5  },
    { key: 'carbs',    label: 'GLUCIDES',   unit: 'g',   delta: 5  },
    { key: 'fat',      label: 'LIPIDES',    unit: 'g',   delta: 5  },
    { key: 'caffeine', label: 'CAFÉINE',    unit: 'mg',  delta: 25, full: true },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Metrics</Text>
        <Text style={styles.subtitle}>Nutrition & Santé</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Entrée Cardio */}
          <TouchableOpacity
            style={styles.cardioEntryCard}
            onPress={() => navigation.navigate('Cardio')}
            activeOpacity={0.8}
          >
            <View style={styles.cardioEntryIcon}>
              <Ionicons name="heart" size={24} color={colors.primary} />
            </View>
            <View style={styles.cardioEntryTextWrap}>
              <Text style={styles.cardioEntryTitle}>Cardio</Text>
              <Text style={styles.cardioEntrySubtitle}>Suivi & analyses de tes séances cardio</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* ═══════════════════════════════════════════════════════
              SECTION 1 — NUTRITION
          ═══════════════════════════════════════════════════════ */}
          <Text style={styles.sectionTitle}>NUTRITION DU JOUR</Text>

          {/* Calories card */}
          <View style={styles.nutrCard}>
            {/* Calories row */}
            <View style={styles.calorieRow}>
              <Text style={styles.nutrLabel}>CALORIES</Text>
              <Text style={styles.calorieLabel}>
                {nutr.calories} / {calorieGoal} kcal
              </Text>
            </View>

            <View style={styles.nutrBtns}>
              <TouchableOpacity style={styles.nutrBtn} onPress={() => adjust('calories', -50)} activeOpacity={0.75}>
                <Text style={styles.nutrBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.nutrValInput}
                value={String(nutr.calories)}
                onChangeText={v => {
                  const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                  setNutr(prev => ({ ...prev, calories: isNaN(n) ? 0 : n }));
                }}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TouchableOpacity style={styles.nutrBtn} onPress={() => adjust('calories', 50)} activeOpacity={0.75}>
                <Text style={styles.nutrBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View style={styles.calorieBarBg}>
              <View
                style={[
                  styles.calorieBarFill,
                  { width: `${calorieRatio * 100}%`, backgroundColor: calorieBarColor },
                ]}
              />
            </View>
          </View>

          {/* Historique calories — 7 derniers jours */}
          <View style={styles.nutrCard}>
            <View style={styles.calorieRow}>
              <Text style={styles.nutrLabel}>CALORIES — 7 JOURS</Text>
              {weekAvg > 0 && <Text style={styles.calorieLabel}>moy. {weekAvg} kcal</Text>}
            </View>
            <View style={styles.weekRow}>
              {weekBars.map((b, i) => {
                const isCurrentDay = i === weekBars.length - 1;
                const ratio = Math.min(b.calories / weekScale, 1);
                const over  = b.calories > calorieGoal;
                return (
                  <View key={b.day} style={styles.weekCol}>
                    <View
                      style={[
                        styles.weekBar,
                        {
                          height: Math.max(4, ratio * 64),
                          backgroundColor: over
                            ? colors.danger
                            : isCurrentDay
                              ? colors.primary
                              : b.calories > 0
                                ? 'rgba(255,107,0,0.35)'
                                : colors.surfaceElevated,
                        },
                      ]}
                    />
                    <Text style={[styles.weekDay, isCurrentDay && { color: colors.primary }]}>
                      {dayLetter(b.day)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Macros + caffeine grid */}
          <View style={styles.nutrCard}>
            <View style={styles.nutrGrid}>
              {macros.map(item => (
                <View
                  key={item.key}
                  style={[styles.nutrItem, item.full && styles.nutrItemFull]}
                >
                  <Text style={styles.nutrLabel}>{item.label}</Text>
                  <TextInput
                    style={styles.nutrValInput}
                    value={String(nutr[item.key])}
                    onChangeText={v => {
                      const n = parseFloat(v.replace(/[^0-9.]/g, ''));
                      setNutr(prev => ({ ...prev, [item.key]: isNaN(n) ? 0 : n }));
                    }}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.nutrUnit}>{item.unit}</Text>
                  <View style={styles.nutrBtns}>
                    <TouchableOpacity style={styles.nutrBtn} onPress={() => adjust(item.key, -item.delta)} activeOpacity={0.75}>
                      <Text style={styles.nutrBtnText}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nutrBtn} onPress={() => adjust(item.key, item.delta)} activeOpacity={0.75}>
                      <Text style={styles.nutrBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Reset nutrition */}
          <TouchableOpacity style={styles.nutrResetBtn} onPress={resetNutr} activeOpacity={0.7}>
            <Text style={styles.nutrResetText}>RÉINITIALISER LA NUTRITION</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />

          {/* ═══════════════════════════════════════════════════════
              SECTION 2 — CALCULATEUR IMC
          ═══════════════════════════════════════════════════════ */}
          <Text style={styles.sectionTitle}>CALCULATEUR IMC</Text>

          {/* Weight input */}
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>POIDS</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                value={weight}
                onChangeText={v => { setWeight(v); persistMetrics(v, height, weightUnit, heightUnit); }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
                selectTextOnFocus
              />
              <View style={styles.unitToggle}>
                {['lbs', 'kg'].map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitBtn, weightUnit === u && styles.unitBtnActive]}
                    onPress={() => { setWeightUnit(u); persistMetrics(weight, height, u, heightUnit); }}
                  >
                    <Text style={[styles.unitText, weightUnit === u && styles.unitTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Height input */}
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>TAILLE</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                value={height}
                onChangeText={v => { setHeight(v); persistMetrics(weight, v, weightUnit, heightUnit); }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={calculate}
                selectTextOnFocus
              />
              <View style={styles.unitToggle}>
                {['cm', 'm'].map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitBtn, heightUnit === u && styles.unitBtnActive]}
                    onPress={() => { setHeightUnit(u); persistMetrics(weight, height, weightUnit, u); }}
                  >
                    <Text style={[styles.unitText, heightUnit === u && styles.unitTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Calculate button */}
          <TouchableOpacity style={styles.calcBtn} onPress={calculate} activeOpacity={0.8}>
            <Text style={styles.calcBtnText}>CALCULER L'IMC</Text>
          </TouchableOpacity>

          {/* IMC Result */}
          {bmi !== null && category && (
            <View style={[styles.imcCard, { borderColor: category.color }]}>
              <Text style={styles.resultEmoji}>{category.icon}</Text>
              <Text style={[styles.resultBmi, { color: category.color }]}>
                {bmi.toFixed(1)}
              </Text>
              <Text style={styles.resultLabel}>IMC</Text>
              <Text style={[styles.resultCategory, { color: category.color }]}>
                {category.label}
              </Text>

              <View style={styles.scaleRow}>
                {[
                  { label: '< 18.5',    name: 'Insuff.',  color: '#60A5FA' },
                  { label: '18.5–24.9', name: 'Normal',   color: colors.success },
                  { label: '25–29.9',   name: 'Surpoids', color: colors.warning },
                  { label: '≥ 30',      name: 'Obésité',  color: colors.danger },
                ].map(cat => (
                  <View key={cat.name} style={styles.scaleCell}>
                    <View style={[styles.scaleDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.scaleName}>{cat.name}</Text>
                    <Text style={styles.scaleRange}>{cat.label}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.resetBtn} onPress={reset}>
                <Text style={styles.resetText}>RÉINITIALISER</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
    marginBottom: 2,
  },
  subtitle: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  scrollContent: { padding: 22 },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.8,
    marginBottom: 14,
  },

  // ── Entrée Cardio ──────────────────────────────────────────────────────────
  cardioEntryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  cardioEntryIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,107,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardioEntryTextWrap: { flex: 1 },
  cardioEntryTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 2 },
  cardioEntrySubtitle: { fontSize: 12, color: colors.textSecondary },

  // ── Nutrition ──────────────────────────────────────────────────────────────
  nutrCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calorieLabel: { fontSize: 12, fontWeight: '700', color: colors.primary },

  nutrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  nutrItem: {
    width: '47%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  nutrItemFull: { width: '100%' },

  nutrLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  nutrVal:  { fontSize: 32, fontWeight: '900', color: colors.text, marginBottom: 6 },
  nutrValInput: {
    fontSize: 32, fontWeight: '900', color: colors.text, marginBottom: 6,
    textAlign: 'center', minWidth: 80, padding: 0,
  },
  nutrUnit: { fontSize: 10, color: colors.textMuted, marginBottom: 10 },

  nutrBtns: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  nutrBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutrBtnText: { fontSize: 20, fontWeight: '900', color: '#000', lineHeight: 22 },

  calorieBarBg: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  calorieBarFill: { height: 6, borderRadius: 3 },

  // ── Historique 7 jours ─────────────────────────────────────────────────────
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  weekCol: { flex: 1, alignItems: 'center', gap: 6 },
  weekBar: { width: '100%', borderRadius: 5 },
  weekDay: { fontSize: 10, fontWeight: '800', color: colors.textMuted },

  nutrResetBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20 },
  nutrResetText: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.2 },

  // ── IMC inputs ─────────────────────────────────────────────────────────────
  inputBlock: { marginBottom: 20 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputField: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  unitToggle: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  unitBtn:       { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  unitBtnActive: { backgroundColor: colors.primary },
  unitText:      { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  unitTextActive: { color: '#000' },

  calcBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  calcBtnText: { color: '#000', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },

  // ── IMC result ─────────────────────────────────────────────────────────────
  imcCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
  },
  resultEmoji:    { fontSize: 48, marginBottom: 8 },
  resultBmi:      { fontSize: 72, fontWeight: '900', lineHeight: 80 },
  resultLabel:    { fontSize: 14, color: colors.textMuted, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  resultCategory: { fontSize: 22, fontWeight: '800', marginBottom: 28 },

  scaleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  scaleCell:  { alignItems: 'center', minWidth: 70 },
  scaleDot:   { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  scaleName:  { fontSize: 10, fontWeight: '700', color: '#888888', marginBottom: 2 },
  scaleRange: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },

  resetBtn:  { paddingVertical: 10, paddingHorizontal: 24 },
  resetText: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
});
