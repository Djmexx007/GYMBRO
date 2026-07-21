import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Path, Polyline, Circle,
  LinearGradient, Defs, Stop,
  Text as SvgText, Line as SvgLine,
} from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getCloudLogs, getLogs, getUserName, deleteExerciseLogs } from '../storage/storage';
import { toDisplayWeight } from '../data/muscleGroups';
import { lbToKg, kgToLb } from '../lib/units';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', year: '2-digit' });
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
}

function lb2kg(lb) { return lbToKg(parseFloat(lb)).toFixed(1); }
function kg2lb(kg) { return kgToLb(parseFloat(kg)).toFixed(1); }

// ── Stats ─────────────────────────────────────────────────────────────────────

function computeExerciseStats(sets) {
  const byDay = {};
  sets.forEach(s => {
    const day = s.date.slice(0, 10);
    if (!byDay[day] || s.weight > byDay[day].weight) byDay[day] = s;
  });
  const days      = Object.keys(byDay).sort();
  const firstDay  = days[0];
  const lastDay   = days[days.length - 1];
  const firstBest = byDay[firstDay];
  const lastBest  = byDay[lastDay];
  const pr        = sets.reduce((a, b) => a.weight >= b.weight ? a : b);
  const delta     = lastBest.weight - firstBest.weight;
  const deltaPct  = firstBest.weight > 0 ? (delta / firstBest.weight) * 100 : 0;

  let trend = 'neutral';
  if (days.length >= 2) {
    const lw = byDay[days[days.length - 1]].weight;
    const pw = byDay[days[days.length - 2]].weight;
    trend = lw > pw ? 'up' : lw < pw ? 'down' : 'neutral';
  }

  return {
    firstBest, lastBest, pr, delta, deltaPct,
    chartData: days.map(d => ({ date: d, weight: byDay[d].weight })),
    trend, totalSets: sets.length, sessions: days.length,
    firstDate: firstDay, lastDate: lastDay,
  };
}

function computeProgressData(logs) {
  const byWeek = {};
  logs.forEach(s => {
    const d   = new Date(s.date);
    const key = `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, '0')}`;
    if (!byWeek[key]) byWeek[key] = {};
    const est = s.weight * (1 + s.reps / 30);
    if (!byWeek[key][s.exercise] || est > byWeek[key][s.exercise])
      byWeek[key][s.exercise] = est;
  });
  return Object.keys(byWeek).sort().map(k => ({
    key: k,
    score: Object.values(byWeek[k]).reduce((a, b) => a + b, 0),
  }));
}

// ── Exercise line chart (SVG) ─────────────────────────────────────────────────

function ExerciseLineChart({ data, trend, pr }) {
  const [containerW, setContainerW] = useState(0);
  // hook must be above early return — guard with containerW logic below instead
  if (!data || data.length < 2) return null;

  const CHART_H   = 72;
  const PAD_X     = 8;
  const lineColor = trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.primary;
  const gradId    = `exGrad${trend}`;

  const visible = data.slice(-12);
  const weights = visible.map(d => d.weight);
  const minW    = Math.min(...weights);
  const maxW    = Math.max(...weights);
  const range   = maxW - minW || 1;
  const prDate  = pr && pr.date ? pr.date.slice(0, 10) : null;
  const prIdx   = prDate ? visible.findIndex(d => d.date === prDate) : -1;

  const pts = containerW > 0 ? visible.map((d, i) => {
    const n = visible.length;
    const uw = containerW - PAD_X * 2;
    return {
      x: PAD_X + (n === 1 ? uw / 2 : (i / (n - 1)) * uw),
      y: CHART_H - ((d.weight - minW) / range) * (CHART_H - 12) - 4,
      weight: d.weight,
      date: d.date,
    };
  }) : [];

  const polyPts  = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = pts.length >= 2
    ? `M ${pts[0].x} ${CHART_H} L ${pts.map(p => `${p.x} ${p.y}`).join(' L ')} L ${pts[pts.length-1].x} ${CHART_H} Z`
    : '';

  const firstPt = pts.length >= 2 ? pts[0] : null;
  const lastPt  = pts.length >= 2 ? pts[pts.length - 1] : null;
  const prPt    = prIdx >= 0 && prIdx < pts.length ? pts[prIdx] : null;

  return (
    <View onLayout={e => setContainerW(e.nativeEvent.layout.width)} style={{ width: '100%' }}>
      {containerW > 0 ? (
        <Svg width={containerW} height={CHART_H + 26}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity="0.2" />
              <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {areaPath !== '' ? <Path d={areaPath} fill={`url(#${gradId})`} /> : null}

          {pts.length >= 2 ? (
            <Polyline
              points={polyPts}
              stroke={lineColor}
              strokeWidth={1.8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {pts.map((p, i) => (
            i !== prIdx
              ? <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={lineColor} opacity={0.75} />
              : null
          ))}

          {prPt ? <Circle cx={prPt.x} cy={prPt.y} r={5} fill="#FFD700" stroke="#fff" strokeWidth={1.5} /> : null}
          {prPt ? (
            <SvgText x={prPt.x} y={prPt.y - 9} fontSize={7} fill="#FFD700" fontWeight="bold" textAnchor="middle">
              {'PR'}
            </SvgText>
          ) : null}

          {lastPt ? <Circle cx={lastPt.x} cy={lastPt.y} r={3.5} fill={lineColor} stroke="#0a0a0a" strokeWidth={1} /> : null}
          {lastPt ? (
            <SvgText x={lastPt.x} y={CHART_H + 13} fontSize={8} fill={lineColor} fontWeight="bold" textAnchor="end">
              {`${lastPt.weight} lb`}
            </SvgText>
          ) : null}
          {lastPt ? (
            <SvgText x={lastPt.x} y={CHART_H + 24} fontSize={7} fill={colors.textMuted} textAnchor="end">
              {lastPt.date ? lastPt.date.slice(5, 10).replace('-', '/') : ''}
            </SvgText>
          ) : null}

          {firstPt ? (
            <SvgText x={firstPt.x} y={CHART_H + 13} fontSize={8} fill={colors.textMuted} textAnchor="start">
              {`${firstPt.weight} lb`}
            </SvgText>
          ) : null}
          {firstPt ? (
            <SvgText x={firstPt.x} y={CHART_H + 24} fontSize={7} fill={colors.textMuted} textAnchor="start">
              {firstPt.date ? firstPt.date.slice(5, 10).replace('-', '/') : ''}
            </SvgText>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

// ── Global weekly progress chart (SVG) ────────────────────────────────────────

function WeeklyProgressChart({ data }) {
  const { width: screenW } = useWindowDimensions(); // hook MUST be before any return
  if (!data || data.length < 2) return null;
  // screenW minus content padding (16×2) minus card padding (18×2)
  const CHART_W = screenW - 68;
  const CHART_H = 90;
  const PAD_X   = 8;

  const visible = data.slice(-16);
  const scores  = visible.map(d => d.score);
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores);
  const range = maxS - minS || 1;
  const first = data[0].score;
  const last  = data[data.length - 1].score;
  const pct   = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const isUp  = pct >= 0;

  const n   = visible.length;
  const pts = visible.map((d, i) => ({
    x: PAD_X + (n === 1 ? (CHART_W - PAD_X * 2) / 2 : (i / (n - 1)) * (CHART_W - PAD_X * 2)),
    y: CHART_H - ((d.score - minS) / range) * (CHART_H - 12) - 4,
    ...d,
  }));

  const polyPts  = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = pts.length >= 2
    ? `M ${pts[0].x} ${CHART_H} L ${pts.map(p => `${p.x} ${p.y}`).join(' L ')} L ${pts[pts.length - 1].x} ${CHART_H} Z`
    : '';

  return (
    <View style={chartSt.card}>
      <View style={chartSt.topRow}>
        <View>
          <Text style={chartSt.title}>FORCE GLOBALE</Text>
          <Text style={chartSt.sub}>{data.length} sem. de données</Text>
        </View>
        <View style={[chartSt.badge, { backgroundColor: isUp ? colors.successBg : colors.dangerBg }]}>
          <Text style={[chartSt.badgeTxt, { color: isUp ? colors.success : colors.danger }]}>
            {isUp ? '+' : ''}{pct}%
          </Text>
        </View>
      </View>

      <Svg width={CHART_W} height={CHART_H + 18} style={{ marginBottom: 14 }}>
        <Defs>
          <LinearGradient id="weekGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.28" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {[0.25, 0.5, 0.75].map((frac, i) => (
          <SvgLine
            key={i}
            x1={PAD_X}
            y1={Math.round(CHART_H * frac)}
            x2={CHART_W - PAD_X}
            y2={Math.round(CHART_H * frac)}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}

        {areaPath !== '' ? <Path d={areaPath} fill="url(#weekGrad)" /> : null}

        {pts.length >= 2 ? (
          <Polyline
            points={polyPts}
            stroke={colors.primary}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {pts.map((p, i) => {
          const isLast  = i === pts.length - 1;
          const isFirst = i === 0;
          if (isLast)  return <Circle key={i} cx={p.x} cy={p.y} r={5}   fill={colors.primary} stroke="#fff" strokeWidth={1.5} />;
          if (isFirst) return <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={colors.warning} opacity={0.8} />;
          return             <Circle key={i} cx={p.x} cy={p.y} r={2}   fill={colors.primary} opacity={0.4} />;
        })}

        {pts.length >= 2 ? (
          <SvgText x={pts[0].x} y={CHART_H + 14} fontSize={9} fill={colors.textMuted} textAnchor="start">
            {pts[0].key ? `S${pts[0].key.split('-W')[1]}` : ''}
          </SvgText>
        ) : null}
        {pts.length >= 2 ? (
          <SvgText x={pts[pts.length - 1].x} y={CHART_H + 14} fontSize={9} fill={colors.primary} fontWeight="bold" textAnchor="end">
            {pts[pts.length - 1].key ? `S${pts[pts.length - 1].key.split('-W')[1]}` : ''}
          </SvgText>
        ) : null}
      </Svg>

      <View style={chartSt.footer}>
        <View>
          <Text style={chartSt.footLbl}>DÉBUT</Text>
          <Text style={chartSt.footVal}>{Math.round(first)} pts</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={chartSt.footLbl}>MAINTENANT</Text>
          <Text style={[chartSt.footVal, { color: colors.primary }]}>{Math.round(last)} pts</Text>
        </View>
      </View>
    </View>
  );
}

const chartSt = StyleSheet.create({
  card:    { backgroundColor: colors.surface, borderRadius: 22, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  topRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  title:   { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5 },
  sub:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  badge:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  badgeTxt:{ fontSize: 16, fontWeight: '900' },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
  footLbl: { fontSize: 9, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  footVal: { fontSize: 20, fontWeight: '900', color: colors.text },
});

// ── Weight converter modal ─────────────────────────────────────────────────────

const QUICK_LBS = [45, 90, 100, 135, 155, 185, 205, 225, 275, 315, 365, 405];

function WeightConverter({ visible, onClose }) {
  const [mode,  setMode]  = useState('lb');
  const [input, setInput] = useState('');

  const converted = (() => {
    const n = parseFloat(input);
    if (!input || isNaN(n)) return '';
    return mode === 'lb' ? `${lb2kg(n)} kg` : `${kg2lb(n)} lb`;
  })();

  function swap() { setMode(m => m === 'lb' ? 'kg' : 'lb'); setInput(''); }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={convSt.overlay} activeOpacity={1} onPress={onClose} />
        <View style={convSt.sheet}>
          <View style={convSt.handle} />
          <Text style={convSt.title}>CONVERTISSEUR</Text>
          <Text style={convSt.sub}>Conversion de poids instantanée</Text>

          <View style={convSt.inputRow}>
            <View style={convSt.box}>
              <Text style={convSt.unitLbl}>{mode === 'lb' ? 'LB' : 'KG'}</Text>
              <TextInput
                style={convSt.input}
                value={input}
                onChangeText={setInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>
            <TouchableOpacity style={convSt.swapBtn} onPress={swap}>
              <Ionicons name="swap-horizontal" size={22} color={colors.primary} />
            </TouchableOpacity>
            <View style={[convSt.box, convSt.resultBox]}>
              <Text style={convSt.unitLbl}>{mode === 'lb' ? 'KG' : 'LB'}</Text>
              <Text style={convSt.result}>{converted || '—'}</Text>
            </View>
          </View>

          <Text style={convSt.refTitle}>RÉFÉRENCE RAPIDE</Text>
          <View style={convSt.grid}>
            {QUICK_LBS.map(lb => (
              <TouchableOpacity key={lb} style={convSt.chip}
                onPress={() => { setMode('lb'); setInput(String(lb)); }}>
                <Text style={convSt.chipMain}>{lb} lb</Text>
                <Text style={convSt.chipSub}>{lb2kg(lb)} kg</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={convSt.closeBtn} onPress={onClose}>
            <Text style={convSt.closeTxt}>FERMER</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const convSt = StyleSheet.create({
  overlay:   { flex: 1 },
  sheet:     { backgroundColor: '#0d0d0d', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: colors.border },
  handle:    { width: 36, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:     { fontSize: 14, fontWeight: '900', color: colors.text, letterSpacing: 2, marginBottom: 4 },
  sub:       { fontSize: 12, color: colors.textSecondary, marginBottom: 22 },
  inputRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  box:       { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  resultBox: { borderColor: colors.primary, backgroundColor: 'rgba(255,107,0,0.06)' },
  unitLbl:   { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 6 },
  input:     { fontSize: 28, fontWeight: '900', color: colors.text },
  result:    { fontSize: 28, fontWeight: '900', color: colors.primary },
  swapBtn:   { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  refTitle:  { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5, marginBottom: 10 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  chip:      { backgroundColor: colors.surfaceElevated, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  chipMain:  { fontSize: 13, fontWeight: '700', color: colors.text },
  chipSub:   { fontSize: 9, color: colors.textMuted, marginTop: 1 },
  closeBtn:  { alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  closeTxt:  { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5 },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const [stats,         setStats]         = useState({});
  const [progressData,  setProgressData]  = useState([]);
  const [refreshing,    setRefreshing]    = useState(false);
  const [isCloud,       setIsCloud]       = useState(false);
  const [showConverter, setShowConverter] = useState(false);

  async function load() {
    const name = await getUserName();
    let logs = null;
    if (name) logs = await getCloudLogs(name);
    const usedCloud = !!(logs && logs.length > 0);
    if (!usedCloud) logs = await getLogs();
    setIsCloud(usedCloud);

    const allLogs = logs ?? [];
    setProgressData(computeProgressData(allLogs));

    const map = {};
    allLogs.forEach(s => {
      if (!map[s.exercise]) map[s.exercise] = [];
      map[s.exercise].push(s);
    });
    const result = {};
    Object.keys(map).forEach(ex => {
      const sets = map[ex].map(s => ({ ...s, weight: toDisplayWeight(ex, s.weight) }));
      result[ex] = computeExerciseStats(sets);
    });
    setStats(result);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmDelete(name) {
    Alert.alert(
      'Supprimer cet exercice ?',
      `Tous les sets de « ${name} » seront effacés définitivement (local + cloud).`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteExerciseLogs(name); await load(); } },
      ]
    );
  }

  const exercises = Object.keys(stats).sort();

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <View style={st.headerTop}>
          <Text style={st.title}>Progress</Text>
          <View style={st.headerRight}>
            {isCloud && (
              <View style={st.cloudBadge}>
                <Ionicons name="cloud" size={11} color={colors.primary} />
                <Text style={st.cloudTxt}>SYNC</Text>
              </View>
            )}
            <TouchableOpacity style={st.converterBtn} onPress={() => setShowConverter(true)}>
              <Ionicons name="swap-horizontal" size={15} color={colors.primary} />
              <Text style={st.converterTxt}>KG/LB</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={st.subtitle}>
          {exercises.length > 0
            ? `${exercises.length} exercice${exercises.length > 1 ? 's' : ''} enregistré${exercises.length > 1 ? 's' : ''}`
            : 'Aucune donnée'}
        </Text>
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <WeeklyProgressChart data={progressData} />

        {exercises.length === 0 ? (
          <View style={st.empty}>
            <Ionicons name="barbell-outline" size={64} color={colors.textMuted} />
            <Text style={st.emptyTitle}>Aucune donnée</Text>
            <Text style={st.emptyText}>Complète une séance pour voir ta progression ici.</Text>
          </View>
        ) : (
          exercises.map(ex => {
            const s      = stats[ex];
            const isUp   = s.delta > 0;
            const isDown = s.delta < 0;
            const trendIcon  = s.trend === 'up' ? 'trending-up' : s.trend === 'down' ? 'trending-down' : 'remove';
            const trendColor = s.trend === 'up' ? colors.success : s.trend === 'down' ? colors.danger : colors.textMuted;

            return (
              <View key={ex} style={st.card}>
                {/* Card header */}
                <View style={st.cardHead}>
                  <Text style={st.exName}>{ex}</Text>
                  <View style={st.cardHeadRight}>
                    <Ionicons name={trendIcon} size={17} color={trendColor} />
                    <TouchableOpacity onPress={() => confirmDelete(ex)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* First vs last */}
                <View style={st.compRow}>
                  <View style={st.compBox}>
                    <Text style={st.compLbl}>DÉBUT</Text>
                    <Text style={st.compWeight}>{s.firstBest.weight}</Text>
                    <Text style={st.compUnit}>lb</Text>
                    <Text style={st.compDate}>{formatDate(s.firstDate)}</Text>
                  </View>

                  <View style={st.deltaBox}>
                    <View style={[st.deltaBadge, {
                      backgroundColor: isUp ? colors.successBg : isDown ? colors.dangerBg : colors.surfaceElevated,
                    }]}>
                      <Text style={[st.deltaAmt, { color: isUp ? colors.success : isDown ? colors.danger : colors.textMuted }]}>
                        {isUp ? '+' : ''}{s.delta} lb
                      </Text>
                      <Text style={[st.deltaPct, { color: isUp ? colors.success : isDown ? colors.danger : colors.textMuted }]}>
                        {isUp ? '+' : ''}{s.deltaPct.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  <View style={st.compBox}>
                    <Text style={st.compLbl}>ACTUEL</Text>
                    <Text style={[st.compWeight, { color: colors.primary }]}>{s.lastBest.weight}</Text>
                    <Text style={st.compUnit}>lb</Text>
                    <Text style={st.compDate}>{formatDate(s.lastDate)}</Text>
                  </View>
                </View>

                {/* Exercise line chart */}
                {s.chartData.length >= 2 && (
                  <View style={st.chartWrap}>
                    <ExerciseLineChart data={s.chartData} trend={s.trend} pr={s.pr} />
                  </View>
                )}

                {/* Footer */}
                <View style={st.footer}>
                  <View style={st.footerCell}>
                    <Text style={st.footerVal}>{s.sessions}</Text>
                    <Text style={st.footerKey}>SÉANCES</Text>
                  </View>
                  <View style={st.footerDiv} />
                  <View style={st.footerCell}>
                    <Text style={st.footerVal}>{s.totalSets}</Text>
                    <Text style={st.footerKey}>SETS TOTAL</Text>
                  </View>
                  <View style={st.footerDiv} />
                  <View style={st.footerCell}>
                    <Text style={[st.footerVal, { color: '#FFD700' }]}>{s.pr.weight}</Text>
                    <Text style={st.footerKey}>PR LB</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <WeightConverter visible={showConverter} onClose={() => setShowConverter(false)} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  header:       { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title:        { fontSize: 38, fontWeight: '900', color: colors.text, letterSpacing: -1 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cloudBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceElevated, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  cloudTxt:     { fontSize: 9, fontWeight: '800', color: colors.primary, letterSpacing: 0.8 },
  converterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surfaceElevated, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  converterTxt: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.8 },
  subtitle:     { fontSize: 13, color: colors.textSecondary },
  scroll:       { flex: 1 },
  content:      { padding: 16, paddingBottom: 28 },

  empty:     { alignItems: 'center', paddingTop: 96, gap: 18 },
  emptyTitle:{ fontSize: 22, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 },

  card:        { backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardHead:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardHeadRight:{ flexDirection: 'row', alignItems: 'center', gap: 12 },
  exName:      { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },

  compRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  compBox:     { flex: 1, alignItems: 'center' },
  compLbl:     { fontSize: 8, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  compWeight:  { fontSize: 26, fontWeight: '900', color: colors.text, lineHeight: 28 },
  compUnit:    { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginBottom: 2 },
  compDate:    { fontSize: 10, color: colors.textMuted },
  deltaBox:    { flex: 1.2, alignItems: 'center' },
  deltaBadge:  { alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  deltaAmt:    { fontSize: 14, fontWeight: '900' },
  deltaPct:    { fontSize: 11, fontWeight: '700' },

  chartWrap:   { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingTop: 12, paddingBottom: 6, marginBottom: 10 },

  footer:     { flexDirection: 'row', alignItems: 'center' },
  footerCell: { flex: 1, alignItems: 'center' },
  footerVal:  { fontSize: 17, fontWeight: '900', color: colors.text, marginBottom: 2 },
  footerKey:  { fontSize: 8, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 },
  footerDiv:  { width: 1, height: 28, backgroundColor: colors.border },
});
