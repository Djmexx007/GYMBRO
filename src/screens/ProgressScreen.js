import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getCloudLogs, getLogs, getUserName, deleteExerciseLogs } from '../storage/storage';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
}

function computeProgressData(logs) {
  const byWeek = {};
  logs.forEach(s => {
    const d = new Date(s.date);
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

function StrengthChart({ data }) {
  if (!data || data.length < 2) return null;
  const visible = data.slice(-16);
  const scores = visible.map(d => d.score);
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores);
  const range = maxS - minS || 1;
  const first = data[0].score;
  const last  = data[data.length - 1].score;
  const pct   = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const isUp  = pct >= 0;

  return (
    <View style={chartStyles.card}>
      <View style={chartStyles.topRow}>
        <Text style={chartStyles.cardTitle}>PROGRESSION DE FORCE</Text>
        <View style={[chartStyles.pctBadge, { backgroundColor: isUp ? '#0D2818' : '#2D0D0D' }]}>
          <Text style={[chartStyles.pctTxt, { color: isUp ? colors.success : colors.danger }]}>
            {isUp ? '+' : ''}{pct}%
          </Text>
        </View>
      </View>

      <View style={chartStyles.barsArea}>
        {visible.map((d, i) => {
          const isFirst = i === 0 && data.length <= 16;
          const isLast  = i === visible.length - 1;
          const h = 14 + ((d.score - minS) / range) * 86;
          const barColor = isLast ? colors.primary : isFirst ? colors.warning : '#2a2a2a';
          const opacity  = isFirst || isLast ? 1 : 0.45 + (i / visible.length) * 0.55;
          return (
            <View key={d.key} style={chartStyles.barCol}>
              <View style={[chartStyles.bar, { height: h, backgroundColor: barColor, opacity }]} />
              {(isFirst || isLast) && (
                <Text style={[chartStyles.barLbl, isLast && { color: colors.primary }]}>
                  {isFirst ? 'DÉBUT' : 'NOW'}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={chartStyles.statsRow}>
        <View style={chartStyles.statBox}>
          <Text style={chartStyles.statLbl}>DÉBUT</Text>
          <Text style={chartStyles.statVal}>{Math.round(first)} pts</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} style={{ marginTop: 2 }} />
        <View style={[chartStyles.statBox, { alignItems: 'flex-end' }]}>
          <Text style={chartStyles.statLbl}>MAINTENANT</Text>
          <Text style={[chartStyles.statVal, { color: colors.primary }]}>{Math.round(last)} pts</Text>
        </View>
      </View>
    </View>
  );
}

function computeStats(sets) {
  const best = sets.reduce((a, b) => {
    const a1rm = a.weight * (1 + a.reps / 30);
    const b1rm = b.weight * (1 + b.reps / 30);
    return a1rm >= b1rm ? a : b;
  });

  const byDay = {};
  sets.forEach(s => {
    const day = s.date.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(s);
  });
  const days = Object.keys(byDay).sort((a, b) => b.localeCompare(a));
  const lastBest = byDay[days[0]].reduce((a, b) => (a.weight >= b.weight ? a : b));

  let trend = 'neutral';
  if (days.length >= 2) {
    const lastMax = Math.max(...byDay[days[0]].map(s => s.weight));
    const prevMax = Math.max(...byDay[days[1]].map(s => s.weight));
    trend = lastMax > prevMax ? 'up' : lastMax < prevMax ? 'down' : 'neutral';
  }

  return { best, lastBest, lastDate: days[0], trend, totalSets: sets.length, sessions: days.length };
}

export default function ProgressScreen() {
  const [stats, setStats] = useState({});
  const [progressData, setProgressData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setLocalUserName] = useState('');
  const [isCloud, setIsCloud] = useState(false);

  async function load() {
    const name = await getUserName();
    setLocalUserName(name ?? '');

    let logs = null;
    if (name) logs = await getCloudLogs(name);
    if (!logs || logs.length === 0) logs = await getLogs();
    setIsCloud(!!name);

    const allLogs = logs ?? [];
    setProgressData(computeProgressData(allLogs));

    const map = {};
    allLogs.forEach(s => {
      if (!map[s.exercise]) map[s.exercise] = [];
      map[s.exercise].push(s);
    });
    const result = {};
    Object.keys(map).forEach(ex => { result[ex] = computeStats(map[ex]); });
    setStats(result);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmDelete(exerciseName) {
    Alert.alert(
      'Supprimer cet exercice ?',
      `Tous les sets de « ${exerciseName} » seront effacés définitivement (local + cloud).`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive', onPress: async () => {
            await deleteExerciseLogs(exerciseName);
            await load();
          },
        },
      ]
    );
  }

  const exercises = Object.keys(stats).sort();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <View style={styles.headerRow}>
          <Text style={styles.subtitle}>
            {exercises.length > 0 ? `${exercises.length} exercices` : 'Aucune donnée'}
          </Text>
          {isCloud && (
            <View style={styles.cloudBadge}>
              <Ionicons name="cloud" size={11} color={colors.primary} />
              <Text style={styles.cloudText}>SYNC</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={colors.primary} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <StrengthChart data={progressData} />
        {exercises.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucune donnée</Text>
            <Text style={styles.emptyText}>
              Complète une séance pour voir ta progression ici.
            </Text>
          </View>
        ) : (
          exercises.map(ex => {
            const s = stats[ex];
            const trendIcon = s.trend === 'up' ? 'trending-up' : s.trend === 'down' ? 'trending-down' : 'remove';
            const trendColor = s.trend === 'up' ? colors.success : s.trend === 'down' ? colors.danger : colors.textMuted;
            const trendBg = s.trend === 'up' ? '#0D2818' : s.trend === 'down' ? '#2D0D0D' : colors.surfaceElevated;

            return (
              <View key={ex} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.exName}>{ex}</Text>
                  <View style={styles.cardHeaderRight}>
                    <View style={[styles.trendBadge, { backgroundColor: trendBg }]}>
                      <Ionicons name={trendIcon} size={16} color={trendColor} />
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmDelete(ex)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={17} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.statsGrid}>
                  {[
                    { val: s.best.weight, key: 'BEST LBS' },
                    { val: s.best.reps, key: 'BEST REPS' },
                    { val: s.totalSets, key: 'SETS' },
                    { val: s.sessions, key: 'SÉANCES' },
                  ].map(({ val, key }) => (
                    <View key={key} style={styles.statCell}>
                      <Text style={styles.statVal}>{val}</Text>
                      <Text style={styles.statKey}>{key}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.lastText}>
                    Dernière : {s.lastBest.weight} × {s.lastBest.reps}
                  </Text>
                  <Text style={styles.dateText}>{formatDate(s.lastDate)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  title: { fontSize: 34, fontWeight: '900', color: colors.text, marginBottom: 4, letterSpacing: -0.5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cloudText: { fontSize: 9, fontWeight: '800', color: colors.primary, letterSpacing: 0.8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exName: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },
  trendBadge: { padding: 6, borderRadius: 8 },
  deleteBtn: { padding: 4 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCell: { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', color: colors.primary, marginBottom: 2 },
  statKey: { fontSize: 8, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, textAlign: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastText: { color: colors.textSecondary, fontSize: 13 },
  dateText: { color: colors.textMuted, fontSize: 12 },
});

const chartStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  cardTitle: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pctTxt: { fontSize: 14, fontWeight: '900' },
  barsArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 3,
    marginBottom: 14,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', borderRadius: 4 },
  barLbl: { fontSize: 7, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  statBox: { gap: 2 },
  statLbl: { fontSize: 9, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  statVal: { fontSize: 18, fontWeight: '900', color: colors.text },
});
