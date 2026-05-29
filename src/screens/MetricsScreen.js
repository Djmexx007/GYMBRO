import React, { useState } from 'react';
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
import { colors } from '../theme';

function calcBMI(weightKg, heightM) {
  if (!weightKg || !heightM || heightM <= 0) return null;
  return weightKg / (heightM * heightM);
}

function getCategory(bmi) {
  if (bmi < 18.5) return { label: 'Insuffisance pondérale', color: '#60A5FA', icon: '📉' };
  if (bmi < 25)  return { label: 'Normal',                   color: '#22C55E', icon: '✅' };
  if (bmi < 30)  return { label: 'Surpoids',                 color: '#F59E0B', icon: '⚠️' };
  return              { label: 'Obésité',                    color: '#EF4444', icon: '🔴' };
}

export default function MetricsScreen() {
  const [weight,     setWeight]     = useState('');
  const [height,     setHeight]     = useState('');
  const [weightUnit, setWeightUnit] = useState('lbs'); // 'lbs' | 'kg'
  const [heightUnit, setHeightUnit] = useState('cm');  // 'cm'  | 'm'
  const [bmi,        setBmi]        = useState(null);

  function calculate() {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) { setBmi(null); return; }

    const weightKg = weightUnit === 'lbs' ? w * 0.453592 : w;
    const heightM  = heightUnit === 'cm'  ? h / 100       : h;

    setBmi(calcBMI(weightKg, heightM));
  }

  function reset() {
    setWeight('');
    setHeight('');
    setBmi(null);
  }

  const category = bmi !== null ? getCategory(bmi) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Metrics</Text>
        <Text style={styles.subtitle}>Calculateur IMC</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Weight input */}
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>POIDS</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                value={weight}
                onChangeText={setWeight}
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
                    onPress={() => setWeightUnit(u)}
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
                onChangeText={setHeight}
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
                    onPress={() => setHeightUnit(u)}
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

          {/* Result */}
          {bmi !== null && category && (
            <View style={[styles.resultCard, { borderColor: category.color }]}>
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
                  { label: '< 18.5', name: 'Insuff.', color: '#60A5FA' },
                  { label: '18.5–24.9', name: 'Normal', color: '#22C55E' },
                  { label: '25–29.9', name: 'Surpoids', color: '#F59E0B' },
                  { label: '≥ 30', name: 'Obésité', color: '#EF4444' },
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

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 22, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title:    { fontSize: 34, fontWeight: '900', color: colors.text, marginBottom: 2, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  scrollContent: { padding: 22 },

  // Inputs
  inputBlock: { marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5, marginBottom: 10 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputField: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 20, paddingVertical: 18,
    fontSize: 36, fontWeight: '800', color: colors.text, textAlign: 'center',
  },
  unitToggle: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  unitBtn: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  unitBtnActive: { backgroundColor: colors.primary },
  unitText:       { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  unitTextActive: { color: '#000' },

  // Calculate
  calcBtn: {
    backgroundColor: colors.primary, borderRadius: 18,
    height: 68, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  calcBtnText: { color: '#000', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },

  // Result
  resultCard: {
    backgroundColor: colors.surface, borderRadius: 20, borderWidth: 2,
    padding: 24, alignItems: 'center',
  },
  resultEmoji:    { fontSize: 48, marginBottom: 8 },
  resultBmi:      { fontSize: 72, fontWeight: '900', lineHeight: 80 },
  resultLabel:    { fontSize: 14, color: colors.textMuted, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  resultCategory: { fontSize: 22, fontWeight: '800', marginBottom: 28 },

  scaleRow: { flexDirection: 'row', gap: 6, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' },
  scaleCell: { alignItems: 'center', minWidth: 70 },
  scaleDot:  { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  scaleName: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 2 },
  scaleRange: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },

  resetBtn:  { paddingVertical: 10, paddingHorizontal: 24 },
  resetText: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
});
