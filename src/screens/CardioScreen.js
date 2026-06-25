import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import Svg, { Path, Polyline, Circle, LinearGradient, Defs, Stop, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import {
  getCardioLogs, getCloudCardioLogs, saveCardioSession, deleteCardioSession,
  getCardioProfile, saveCardioProfile, getUserName,
} from '../storage/storage';
import { CARDIO_TYPES, isInclineCapable, getCardioTypeLabel, getCardioTypeIcon } from '../data/cardioTypes';
import {
  deriveSessionMetrics, estimateMaxHr, estimateVO2max, computePRs, computeTrend,
  computeZoneDurations, computeEffortLevel, groupSessionsByType,
} from '../lib/cardioMetrics';
import { paceFromSpeed, formatPace, formatDuration, formatSpeed, formatDistance, formatIncline } from '../lib/cardioUnits';

// ── Helpers locaux (agrégation hebdo / série) ──────────────────────────────────

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
}
function weekKeyOf(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, '0')}`;
}

// Volume hebdo (minutes d'entraînement cumulées) — proxy de "progression d'endurance".
function computeWeeklyVolume(sessions) {
  if (sessions.length === 0) return null;
  const byWeek = {};
  sessions.forEach(s => {
    const key = weekKeyOf(s.date);
    byWeek[key] = (byWeek[key] ?? 0) + (s.durationSec ?? 0) / 60;
  });
  const weeks = Object.keys(byWeek).sort();
  if (weeks.length < 2) return null;
  return weeks.map(k => ({ date: k, value: Math.round(byWeek[k]) }));
}

// Série de semaines consécutives (avec ≥1 séance) ancrée sur la séance la plus récente.
function computeStreak(sessions) {
  if (sessions.length === 0) return null;
  const weekKeys = new Set(sessions.map(s => weekKeyOf(s.date)));
  const latest = sessions.reduce((a, b) => (new Date(b.date) > new Date(a.date) ? b : a));
  const cursor = new Date(latest.date);
  let streak = 0;
  while (weekKeys.has(weekKeyOf(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return { weeks: streak };
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
}

// ── Graphique générique (SVG) — adapté de ExerciseLineChart (ProgressScreen.js) ─

function CardioLineChart({ data, trend, pr, formatValue }) {
  const [containerW, setContainerW] = useState(0);
  if (!data || data.length < 2) return null;

  const CHART_H   = 72;
  const PAD_X     = 8;
  const lineColor = trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.primary;
  const gradId    = `cardioGrad${trend}${Math.round(Math.random() * 1e6)}`;

  const visible = data.slice(-12);
  const values  = visible.map(d => d.value);
  const minV    = Math.min(...values);
  const maxV    = Math.max(...values);
  const range   = maxV - minV || 1;
  const prDate  = pr && pr.date ? pr.date.slice(0, 10) : null;
  const prIdx   = prDate ? visible.findIndex(d => d.date === prDate) : -1;

  const pts = containerW > 0 ? visible.map((d, i) => {
    const n  = visible.length;
    const uw = containerW - PAD_X * 2;
    return {
      x: PAD_X + (n === 1 ? uw / 2 : (i / (n - 1)) * uw),
      y: CHART_H - ((d.value - minV) / range) * (CHART_H - 12) - 4,
      value: d.value,
      date: d.date,
    };
  }) : [];

  const polyPts  = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = pts.length >= 2
    ? `M ${pts[0].x} ${CHART_H} L ${pts.map(p => `${p.x} ${p.y}`).join(' L ')} L ${pts[pts.length - 1].x} ${CHART_H} Z`
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
            <Polyline points={polyPts} stroke={lineColor} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}

          {pts.map((p, i) => (
            i !== prIdx ? <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={lineColor} opacity={0.75} /> : null
          ))}

          {prPt ? <Circle cx={prPt.x} cy={prPt.y} r={5} fill="#FFD700" stroke="#fff" strokeWidth={1.5} /> : null}
          {prPt ? (
            <SvgText x={prPt.x} y={prPt.y - 9} fontSize={7} fill="#FFD700" fontWeight="bold" textAnchor="middle">PR</SvgText>
          ) : null}

          {lastPt ? <Circle cx={lastPt.x} cy={lastPt.y} r={3.5} fill={lineColor} stroke="#0a0a0a" strokeWidth={1} /> : null}
          {lastPt ? (
            <SvgText x={lastPt.x} y={CHART_H + 13} fontSize={8} fill={lineColor} fontWeight="bold" textAnchor="end">
              {formatValue(lastPt.value)}
            </SvgText>
          ) : null}
          {lastPt ? (
            <SvgText x={lastPt.x} y={CHART_H + 24} fontSize={7} fill={colors.textMuted} textAnchor="end">
              {lastPt.date ? lastPt.date.slice(5, 10).replace('-', '/') : ''}
            </SvgText>
          ) : null}

          {firstPt ? (
            <SvgText x={firstPt.x} y={CHART_H + 13} fontSize={8} fill={colors.textMuted} textAnchor="start">
              {formatValue(firstPt.value)}
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

// ── Carte "non disponible" — jamais de valeur inventée ─────────────────────────

function UnavailableCard({ title, reason }) {
  return (
    <View style={st.card}>
      <View style={st.unavailableRow}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
        <Text style={st.cardTitle}>{title}</Text>
      </View>
      <Text style={st.unavailableReason}>{reason}</Text>
    </View>
  );
}

// ── Carte de tendance générique ─────────────────────────────────────────────────

function TrendCard({ title, trendData, formatValue, unit, unavailableReason }) {
  if (!trendData) return <UnavailableCard title={title} reason={unavailableReason} />;
  const isUp   = trendData.trend === 'up';
  const isDown = trendData.trend === 'down';
  return (
    <View style={st.card}>
      <Text style={st.cardTitle}>{title}</Text>
      <View style={st.compRow}>
        <View style={st.compBox}>
          <Text style={st.compLbl}>DÉBUT</Text>
          <Text style={st.compVal}>{formatValue(trendData.firstBest.value)}</Text>
        </View>
        <View style={[st.deltaBadge, { backgroundColor: isUp ? colors.successBg : isDown ? colors.dangerBg : colors.surfaceElevated }]}>
          <Text style={[st.deltaTxt, { color: isUp ? colors.success : isDown ? colors.danger : colors.textMuted }]}>
            {isUp ? '↑' : isDown ? '↓' : '–'}
          </Text>
        </View>
        <View style={st.compBox}>
          <Text style={st.compLbl}>ACTUEL</Text>
          <Text style={[st.compVal, { color: colors.primary }]}>{formatValue(trendData.lastBest.value)}</Text>
        </View>
      </View>
      <CardioLineChart data={trendData.chartData} trend={trendData.trend} pr={trendData.pr} formatValue={formatValue} />
    </View>
  );
}

// ── Écran ────────────────────────────────────────────────────────────────────────

export default function CardioScreen({ navigation }) {
  const [sessions, setSessions]     = useState([]);
  const [profile, setProfile]       = useState({ age: null, restingHr: null, maxHrOverride: null });
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState(null); // null = tous les types

  const [showForm, setShowForm]       = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Formulaire de log
  const [formType, setFormType]       = useState('running');
  const [formMin, setFormMin]         = useState('');
  const [formSec, setFormSec]         = useState('');
  const [formDistance, setFormDistance] = useState('');
  const [manualSpeed, setManualSpeed] = useState(false);
  const [formAvgSpeed, setFormAvgSpeed] = useState('');
  const [formMaxSpeed, setFormMaxSpeed] = useState('');
  const [formAvgIncline, setFormAvgIncline] = useState('');
  const [formMaxIncline, setFormMaxIncline] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formAvgHr, setFormAvgHr]     = useState('');
  const [formMaxHr, setFormMaxHr]     = useState('');
  const [formNotes, setFormNotes]     = useState('');

  // Formulaire de profil
  const [profAge, setProfAge]         = useState('');
  const [profRestingHr, setProfRestingHr] = useState('');
  const [profMaxHr, setProfMaxHr]     = useState('');

  async function load() {
    const name = await getUserName();
    let raw = null;
    if (name) raw = await getCloudCardioLogs(name);
    if (!raw || raw.length === 0) raw = await getCardioLogs();
    setSessions((raw ?? []).map(deriveSessionMetrics));
    setProfile(await getCardioProfile());
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // ── Calculs dérivés ──────────────────────────────────────────────────────────

  const filtered = useMemo(
    () => (typeFilter ? sessions.filter(s => s.type === typeFilter) : sessions),
    [sessions, typeFilter]
  );
  const typesWithData = useMemo(() => {
    const g = groupSessionsByType(sessions);
    return CARDIO_TYPES.filter(t => g[t.key]?.length > 0);
  }, [sessions]);

  const maxHr = useMemo(() => estimateMaxHr(profile.age, profile.maxHrOverride), [profile]);
  const vo2max = useMemo(() => estimateVO2max({ restingHr: profile.restingHr, maxHr }), [profile, maxHr]);
  const prs = useMemo(() => computePRs(filtered), [filtered]);
  const zones = useMemo(() => computeZoneDurations(filtered, maxHr), [filtered, maxHr]);
  const streak = useMemo(() => computeStreak(sessions), [sessions]);
  const weeklyVolume = useMemo(() => computeWeeklyVolume(filtered), [filtered]);

  const distanceTrend = useMemo(() => computeTrend(filtered, 'distanceKm'), [filtered]);
  const durationTrend = useMemo(() => computeTrend(filtered, 'durationSec'), [filtered]);
  const speedTrend    = useMemo(() => computeTrend(filtered, 'avgSpeedKmh'), [filtered]);
  const paceTrend     = useMemo(() => computeTrend(filtered, 'avgPaceMinKm', { invert: true }), [filtered]);
  const inclineTrend  = useMemo(() => computeTrend(filtered, 'avgInclinePct'), [filtered]);

  const recentWithEffort = useMemo(() => {
    return [...filtered]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8)
      .map(s => ({ session: s, effort: computeEffortLevel(s, { maxHr, bestPaceMinKm: prs.bestPace?.value }) }));
  }, [filtered, maxHr, prs]);

  // ── Live preview (formulaire) ────────────────────────────────────────────────

  const liveDurationSec = (parseInt(formMin, 10) || 0) * 60 + (parseInt(formSec, 10) || 0);
  const liveDistance    = formDistance ? parseFloat(formDistance) : null;
  const liveSpeed = manualSpeed
    ? (formAvgSpeed ? parseFloat(formAvgSpeed) : null)
    : (liveDurationSec > 0 && liveDistance ? liveDistance / (liveDurationSec / 3600) : null);
  const livePace = liveSpeed ? paceFromSpeed(liveSpeed) : null;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function resetForm() {
    setFormType('running'); setFormMin(''); setFormSec(''); setFormDistance('');
    setManualSpeed(false); setFormAvgSpeed(''); setFormMaxSpeed('');
    setFormAvgIncline(''); setFormMaxIncline(''); setFormCalories('');
    setFormAvgHr(''); setFormMaxHr(''); setFormNotes(''); setAdvancedOpen(false);
  }

  async function handleSaveSession() {
    if (liveDurationSec <= 0) {
      Alert.alert('Durée manquante', 'Entre au moins une durée pour cette séance.');
      return;
    }
    const inclineOk = isInclineCapable(formType);
    const session = deriveSessionMetrics({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: formType,
      date: new Date().toISOString(),
      durationSec: liveDurationSec,
      distanceKm: liveDistance && liveDistance > 0 ? liveDistance : null,
      avgSpeedKmh: manualSpeed && formAvgSpeed ? parseFloat(formAvgSpeed) : null,
      maxSpeedKmh: formMaxSpeed ? parseFloat(formMaxSpeed) : null,
      avgPaceMinKm: null,
      avgInclinePct: inclineOk && formAvgIncline ? parseFloat(formAvgIncline) : null,
      maxInclinePct: inclineOk && formMaxIncline ? parseFloat(formMaxIncline) : null,
      calories: formCalories ? parseFloat(formCalories) : null,
      avgHr: formAvgHr ? parseInt(formAvgHr, 10) : null,
      maxHr: formMaxHr ? parseInt(formMaxHr, 10) : null,
      notes: formNotes.trim() || null,
    });
    await saveCardioSession(session);
    resetForm();
    setShowForm(false);
    load();
  }

  function confirmDeleteSession(session) {
    Alert.alert(
      'Supprimer cette séance ?',
      `${getCardioTypeLabel(session.type)} du ${formatDate(session.date)} sera définitivement supprimée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteCardioSession(session.id); load(); } },
      ]
    );
  }

  async function handleSaveProfile() {
    await saveCardioProfile({
      age: profAge ? parseFloat(profAge) : null,
      restingHr: profRestingHr ? parseFloat(profRestingHr) : null,
      maxHrOverride: profMaxHr ? parseFloat(profMaxHr) : null,
    });
    setShowProfile(false);
    load();
  }

  function openProfile() {
    setProfAge(profile.age != null ? String(profile.age) : '');
    setProfRestingHr(profile.restingHr != null ? String(profile.restingHr) : '');
    setProfMaxHr(profile.maxHrOverride != null ? String(profile.maxHrOverride) : '');
    setShowProfile(true);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Cardio</Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <TouchableOpacity onPress={openProfile} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowForm(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtre par type */}
      {typesWithData.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterScroll} contentContainerStyle={st.filterRow}>
          <TouchableOpacity
            style={[st.filterChip, typeFilter === null && st.filterChipOn]}
            onPress={() => setTypeFilter(null)}
          >
            <Text style={[st.filterChipTxt, typeFilter === null && st.filterChipTxtOn]}>Tout</Text>
          </TouchableOpacity>
          {typesWithData.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[st.filterChip, typeFilter === t.key && st.filterChipOn]}
              onPress={() => setTypeFilter(t.key)}
            >
              <Ionicons name={t.icon} size={13} color={typeFilter === t.key ? '#000' : colors.textMuted} />
              <Text style={[st.filterChipTxt, typeFilter === t.key && st.filterChipTxtOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {sessions.length === 0 ? (
          <View style={st.empty}>
            <Ionicons name="heart-outline" size={64} color={colors.textMuted} />
            <Text style={st.emptyTitle}>Aucune séance cardio</Text>
            <Text style={st.emptyText}>Log ta première séance avec le bouton + en haut pour démarrer le suivi.</Text>
          </View>
        ) : (
          <>
            {/* Records personnels */}
            <Text style={st.sectionLabel}>RECORDS PERSONNELS</Text>
            <View style={st.prGrid}>
              <PrCell label="DISTANCE" pr={prs.longestDistance} format={v => formatDistance(v)} />
              <PrCell label="VITESSE"  pr={prs.bestSpeed}       format={v => formatSpeed(v)} />
              <PrCell label="ALLURE"   pr={prs.bestPace}        format={v => formatPace(v)} />
              <PrCell label="DURÉE"    pr={prs.longestDuration} format={v => formatDuration(v)} />
              <PrCell label="INCLINAISON" pr={prs.highestIncline} format={v => formatIncline(v)} />
            </View>

            {/* Volume / constance */}
            <View style={st.statsRow}>
              <View style={st.statBox}>
                <Text style={st.statValue}>{filtered.length}</Text>
                <Text style={st.statKey}>SÉANCES</Text>
              </View>
              <View style={st.statBox}>
                <Text style={st.statValue}>{streak ? streak.weeks : '—'}</Text>
                <Text style={st.statKey}>SEM. CONSÉCUTIVES</Text>
              </View>
              <View style={st.statBox}>
                <Text style={st.statValue}>{vo2max ? vo2max.value.toFixed(1) : '—'}</Text>
                <Text style={st.statKey}>VO2MAX EST.</Text>
              </View>
            </View>

            {/* Progression d'endurance */}
            {weeklyVolume ? (
              <View style={st.card}>
                <Text style={st.cardTitle}>Progression d'endurance (volume hebdo)</Text>
                <CardioLineChart
                  data={weeklyVolume}
                  trend="neutral"
                  pr={null}
                  formatValue={v => `${v} min`}
                />
              </View>
            ) : (
              <UnavailableCard title="Progression d'endurance" reason="Logge au moins 2 semaines différentes avec une séance pour voir ta progression." />
            )}

            {/* Évolutions */}
            <Text style={st.sectionLabel}>ÉVOLUTION</Text>
            <TrendCard title="Distance" trendData={distanceTrend} formatValue={formatDistance}
              unavailableReason="Logge la distance sur au moins 2 séances de ce type pour voir l'évolution." />
            <TrendCard title="Durée" trendData={durationTrend} formatValue={formatDuration}
              unavailableReason="Logge au moins 2 séances de ce type pour voir l'évolution de la durée." />
            <TrendCard title="Vitesse moyenne" trendData={speedTrend} formatValue={formatSpeed}
              unavailableReason="Logge la durée et la distance sur au moins 2 séances pour calculer la vitesse." />
            <TrendCard title="Allure moyenne" trendData={paceTrend} formatValue={formatPace}
              unavailableReason="Logge la durée et la distance sur au moins 2 séances pour calculer l'allure." />
            <TrendCard title="Inclinaison moyenne" trendData={inclineTrend} formatValue={formatIncline}
              unavailableReason="Logge l'inclinaison sur au moins 2 séances de ce type pour voir l'évolution." />

            {/* VO2max */}
            <Text style={st.sectionLabel}>ANALYSE CARDIOVASCULAIRE</Text>
            {vo2max ? (
              <View style={st.card}>
                <Text style={st.cardTitle}>VO2max estimé</Text>
                <Text style={st.bigValue}>{vo2max.value.toFixed(1)}<Text style={st.bigUnit}> ml/kg/min</Text></Text>
                <Text style={st.formulaHint}>Estimation ({vo2max.formula}) — pas une mesure de laboratoire.</Text>
              </View>
            ) : (
              <UnavailableCard title="VO2max" reason="Renseigne ta FC repos et ton âge (ou ta FC max) dans le profil cardio ⚙️ pour débloquer cette estimation." />
            )}

            {/* Zones FC */}
            {zones ? (
              <View style={st.card}>
                <Text style={st.cardTitle}>Temps par zone de FC</Text>
                {['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map(z => {
                  const sec = zones.zones[z];
                  const pct = zones.totalClassifiedSec > 0 ? (sec / zones.totalClassifiedSec) * 100 : 0;
                  return (
                    <View key={z} style={st.zoneRow}>
                      <Text style={st.zoneLabel}>{z}</Text>
                      <View style={st.zoneTrack}>
                        <View style={[st.zoneFill, { width: `${pct}%`, backgroundColor: ZONE_COLORS[z] }]} />
                      </View>
                      <Text style={st.zoneVal}>{formatDuration(sec)}</Text>
                    </View>
                  );
                })}
                {zones.unclassifiedCount > 0 && (
                  <Text style={st.formulaHint}>
                    {zones.classifiedCount}/{zones.totalSessions} séances avec FC renseignée — estimation basée sur la FC moyenne par séance, pas une trace continue.
                  </Text>
                )}
              </View>
            ) : (
              <UnavailableCard title="Zones de fréquence cardiaque" reason="Renseigne ta FC max (profil ⚙️) et la FC moyenne d'au moins une séance pour débloquer les zones." />
            )}

            {/* Séances récentes + effort */}
            <Text style={st.sectionLabel}>SÉANCES RÉCENTES</Text>
            {recentWithEffort.map(({ session, effort }) => (
              <View key={session.id} style={st.sessionRow}>
                <View style={st.sessionIconWrap}>
                  <Ionicons name={getCardioTypeIcon(session.type)} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.sessionType}>{getCardioTypeLabel(session.type)}</Text>
                  <Text style={st.sessionDetail}>
                    {formatDate(session.date)} · {formatDuration(session.durationSec)}
                    {session.distanceKm ? ` · ${formatDistance(session.distanceKm)}` : ''}
                  </Text>
                </View>
                {effort && (
                  <View style={[st.effortBadge, { backgroundColor: EFFORT_COLORS[effort.label] + '22' }]}>
                    <Text style={[st.effortTxt, { color: EFFORT_COLORS[effort.label] }]}>{effort.label}</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => confirmDeleteSession(session)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ── Modale : profil cardio ── */}
      <Modal visible={showProfile} transparent animationType="slide" onRequestClose={() => setShowProfile(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={st.modalBg} activeOpacity={1} onPress={() => setShowProfile(false)} />
          <View style={st.sheet}>
            <View style={st.sheetHandle} />
            <Text style={st.sheetTitle}>Profil cardio</Text>
            <Text style={st.sheetSub}>Utilisé pour estimer ton VO2max et tes zones de fréquence cardiaque.</Text>

            <Text style={st.inputLbl}>ÂGE</Text>
            <TextInput style={st.input} value={profAge} onChangeText={setProfAge} keyboardType="number-pad" placeholder="ex: 28" placeholderTextColor={colors.textMuted} />

            <Text style={st.inputLbl}>FC REPOS (bpm)</Text>
            <TextInput style={st.input} value={profRestingHr} onChangeText={setProfRestingHr} keyboardType="number-pad" placeholder="ex: 58" placeholderTextColor={colors.textMuted} />

            <Text style={st.inputLbl}>FC MAX (bpm) — optionnel, sinon estimée depuis l'âge</Text>
            <TextInput style={st.input} value={profMaxHr} onChangeText={setProfMaxHr} keyboardType="number-pad" placeholder="ex: 188" placeholderTextColor={colors.textMuted} />

            <TouchableOpacity style={st.saveBtn} onPress={handleSaveProfile} activeOpacity={0.85}>
              <Text style={st.saveBtnTxt}>ENREGISTRER</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modale : log de séance ── */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={st.modalBg} activeOpacity={1} onPress={() => setShowForm(false)} />
          <View style={[st.sheet, { maxHeight: '88%' }]}>
            <View style={st.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={st.sheetTitle}>Nouvelle séance</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CARDIO_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.key}
                      style={[st.filterChip, formType === t.key && st.filterChipOn]}
                      onPress={() => setFormType(t.key)}
                    >
                      <Ionicons name={t.icon} size={13} color={formType === t.key ? '#000' : colors.textMuted} />
                      <Text style={[st.filterChipTxt, formType === t.key && st.filterChipTxtOn]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={st.inputLbl}>MINUTES</Text>
                  <TextInput style={st.input} value={formMin} onChangeText={setFormMin} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted} selectTextOnFocus />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.inputLbl}>SECONDES</Text>
                  <TextInput style={st.input} value={formSec} onChangeText={setFormSec} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted} selectTextOnFocus />
                </View>
              </View>

              <Text style={st.inputLbl}>DISTANCE (km)</Text>
              <TextInput style={st.input} value={formDistance} onChangeText={setFormDistance} keyboardType="decimal-pad" placeholder="ex: 5.2" placeholderTextColor={colors.textMuted} selectTextOnFocus />

              {(liveSpeed || livePace) && (
                <View style={st.livePreview}>
                  <Text style={st.livePreviewTxt}>
                    → {liveSpeed ? formatSpeed(liveSpeed) : '—'} · {livePace ? formatPace(livePace) : '—'}
                  </Text>
                  <TouchableOpacity onPress={() => setManualSpeed(m => !m)}>
                    <Ionicons name="pencil" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
              {manualSpeed && (
                <>
                  <Text style={st.inputLbl}>VITESSE MOYENNE MANUELLE (km/h)</Text>
                  <TextInput style={st.input} value={formAvgSpeed} onChangeText={setFormAvgSpeed} keyboardType="decimal-pad" placeholder="ex: 9.6" placeholderTextColor={colors.textMuted} selectTextOnFocus />
                </>
              )}

              <TouchableOpacity style={st.advToggle} onPress={() => setAdvancedOpen(o => !o)}>
                <Text style={st.advToggleTxt}>Plus de détails</Text>
                <Ionicons name={advancedOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </TouchableOpacity>

              {advancedOpen && (
                <View>
                  <Text style={st.inputLbl}>VITESSE MAX (km/h)</Text>
                  <TextInput style={st.input} value={formMaxSpeed} onChangeText={setFormMaxSpeed} keyboardType="decimal-pad" placeholder="optionnel" placeholderTextColor={colors.textMuted} selectTextOnFocus />

                  {isInclineCapable(formType) && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.inputLbl}>INCLINAISON MOY. (%)</Text>
                        <TextInput style={st.input} value={formAvgIncline} onChangeText={setFormAvgIncline} keyboardType="decimal-pad" placeholder="optionnel" placeholderTextColor={colors.textMuted} selectTextOnFocus />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.inputLbl}>INCLINAISON MAX (%)</Text>
                        <TextInput style={st.input} value={formMaxIncline} onChangeText={setFormMaxIncline} keyboardType="decimal-pad" placeholder="optionnel" placeholderTextColor={colors.textMuted} selectTextOnFocus />
                      </View>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.inputLbl}>FC MOY. (bpm)</Text>
                      <TextInput style={st.input} value={formAvgHr} onChangeText={setFormAvgHr} keyboardType="number-pad" placeholder="optionnel" placeholderTextColor={colors.textMuted} selectTextOnFocus />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.inputLbl}>FC MAX (bpm)</Text>
                      <TextInput style={st.input} value={formMaxHr} onChangeText={setFormMaxHr} keyboardType="number-pad" placeholder="optionnel" placeholderTextColor={colors.textMuted} selectTextOnFocus />
                    </View>
                  </View>

                  <Text style={st.inputLbl}>CALORIES</Text>
                  <TextInput style={st.input} value={formCalories} onChangeText={setFormCalories} keyboardType="number-pad" placeholder="optionnel" placeholderTextColor={colors.textMuted} selectTextOnFocus />

                  <Text style={st.inputLbl}>NOTES</Text>
                  <TextInput
                    style={[st.input, { height: 70, textAlignVertical: 'top' }]}
                    value={formNotes} onChangeText={setFormNotes}
                    placeholder="optionnel" placeholderTextColor={colors.textMuted} multiline
                  />
                </View>
              )}

              <TouchableOpacity style={st.saveBtn} onPress={handleSaveSession} activeOpacity={0.85}>
                <Text style={st.saveBtnTxt}>ENREGISTRER LA SÉANCE</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function PrCell({ label, pr, format }) {
  return (
    <View style={st.prCell}>
      <Text style={st.prLabel}>{label}</Text>
      <Text style={st.prValue}>{pr ? format(pr.value) : '—'}</Text>
      {pr && <Text style={st.prDate}>{formatDate(pr.date)}</Text>}
    </View>
  );
}

const ZONE_COLORS = { Z1: colors.textMuted, Z2: colors.success, Z3: colors.warning, Z4: '#FB923C', Z5: colors.danger };
const EFFORT_COLORS = { 'Faible': colors.textMuted, 'Modéré': colors.success, 'Élevé': colors.warning, 'Maximal': colors.danger };

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },

  filterScroll: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipTxt: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterChipTxtOn: { color: '#000' },

  content: { padding: 16, paddingBottom: 40 },

  empty: { alignItems: 'center', paddingTop: 96, gap: 18 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 },

  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, marginTop: 6 },

  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },

  unavailableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  unavailableReason: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  compRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 },
  compBox: { alignItems: 'center', minWidth: 70 },
  compLbl: { fontSize: 8, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  compVal: { fontSize: 18, fontWeight: '900', color: colors.text },
  deltaBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  deltaTxt: { fontSize: 14, fontWeight: '900' },

  prGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  prCell: {
    flexBasis: '31%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 16,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  prLabel: { fontSize: 8, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 6 },
  prValue: { fontSize: 15, fontWeight: '900', color: colors.text },
  prDate: { fontSize: 9, color: colors.textMuted, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: colors.surface, borderRadius: 18, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.primary, marginBottom: 4 },
  statKey: { fontSize: 8, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.6, textAlign: 'center' },

  bigValue: { fontSize: 34, fontWeight: '900', color: colors.primary, marginBottom: 4 },
  bigUnit: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  formulaHint: { fontSize: 11, color: colors.textMuted, marginTop: 8, lineHeight: 16 },

  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  zoneLabel: { width: 20, fontSize: 11, fontWeight: '800', color: colors.textMuted },
  zoneTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceElevated, overflow: 'hidden' },
  zoneFill: { height: 8, borderRadius: 4 },
  zoneVal: { width: 52, fontSize: 11, color: colors.textMuted, textAlign: 'right' },

  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  sessionIconWrap: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,107,0,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  sessionType: { fontSize: 14, fontWeight: '700', color: colors.text },
  sessionDetail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  effortBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  effortTxt: { fontSize: 10, fontWeight: '800' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 22, paddingBottom: 36, borderTopWidth: 1, borderColor: colors.border,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  sheetSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 18 },

  inputLbl: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
  },

  livePreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
  livePreviewTxt: { fontSize: 13, fontWeight: '700', color: colors.primary },

  advToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 8 },
  advToggleTxt: { fontSize: 12, fontWeight: '700', color: colors.textMuted },

  saveBtn: { backgroundColor: colors.primary, borderRadius: 18, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnTxt: { fontSize: 14, fontWeight: '900', color: '#000', letterSpacing: 1 },
});
