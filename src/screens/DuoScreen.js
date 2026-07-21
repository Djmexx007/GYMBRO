import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, Alert, Vibration, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import {
  getAllUsersLogs, getUserName, clearAllUsersLogs,
  getAllActivity, getSharedPlan, getCloudCardioLogs,
} from '../storage/storage';
import { supabase } from '../lib/supabase';
import { toDisplayWeight } from '../data/muscleGroups';
import { getCardioTypeLabel } from '../data/cardioTypes';
import { formatDuration } from '../lib/cardioUnits';
import { lbToKg } from '../lib/units';

function fmtKg(kg) { return kg >= 1000 ? `${(kg / 1000).toFixed(1)}k` : kg.toFixed(1); }

// ── 1RM ───────────────────────────────────────────────────────────────────────

function est1RM(weight, reps) {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

function computeBests(logs) {
  const map = {};
  logs.forEach(s => {
    const existing = map[s.exercise];
    if (!existing || est1RM(s.weight, s.reps) > est1RM(existing.weight, existing.reps)) {
      map[s.exercise] = s;
    }
  });
  return map;
}

function computeMaxWeights(logs) {
  const map = {};
  logs.forEach(s => {
    if (!map[s.exercise] || s.weight > map[s.exercise].weight) map[s.exercise] = s;
  });
  return map;
}

// ── Nouvelles fonctions de calcul ─────────────────────────────────────────────

function computeWeekVolume(logs) {
  const cutoff = Date.now() - 7 * 86400000;
  return logs
    .filter(s => new Date(s.date).getTime() >= cutoff)
    .reduce((sum, s) => sum + lbToKg(s.weight) * s.reps, 0);
}

function computeStreak(logs) {
  const days = new Set(logs.map(s => s.date.slice(0, 10)));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function daysSinceLastSession(logs) {
  if (!logs.length) return null;
  const latest = Math.max(...logs.map(s => new Date(s.date).getTime()));
  return Math.floor((Date.now() - latest) / 86400000);
}

// Seul ce nom d'utilisateur voit le bouton RADAR et peut ouvrir le panneau
// espion/outils (comparaison insensible à la casse avec le nom local).
const RADAR_OWNER = 'Derek';

// ── Radar helpers ─────────────────────────────────────────────────────────────

function todayKey() { return new Date().toISOString().slice(0, 10); }
function isToday(iso) { return !!iso && iso.slice(0, 10) === todayKey(); }

function timeAgo(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'à l\'instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

function setsToday(logs) { return logs.filter(s => isToday(s.date)).length; }

function last7d(items) {
  const cutoff = Date.now() - 7 * 86400000;
  return items.filter(x => new Date(x.date).getTime() >= cutoff);
}

function sessionDays7d(logs) { return new Set(last7d(logs).map(s => s.date.slice(0, 10))).size; }

// ── Outils (panneau) ──────────────────────────────────────────────────────────

async function resetSharedPlan() {
  await supabase.from('shared_plans').upsert({
    id: 'main', plan: {}, updated_by: 'reset', updated_at: new Date().toISOString(),
  });
  return '🗑️ Plan partagé réinitialisé sur les deux appareils.';
}

async function testSupabaseConnection() {
  try {
    const t = Date.now();
    const { error } = await supabase.from('workout_logs').select('user_name').limit(1);
    const ms = Date.now() - t;
    if (error) return `❌ Erreur : ${error.message}`;
    return `✅ Supabase opérationnel — réponse en ${ms} ms.`;
  } catch (e) {
    return `❌ Hors ligne ou erreur réseau : ${e.message}`;
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DuoScreen() {
  const [myName,   setMyName]   = useState('');
  const [allBests, setAllBests] = useState({});
  const [allLogs,  setAllLogs]  = useState({});
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Radar panel (ex-dev panel)
  const tapCount  = useRef(0);
  const tapTimer  = useRef(null);
  const [devVisible, setDevVisible] = useState(false);
  const [devLog,     setDevLog]     = useState('');
  const [spyLoading, setSpyLoading] = useState(false);
  const [spyData,    setSpyData]    = useState(null); // { activity, planMeta, myCardio, rivalCardio }
  const lastLoadRef = useRef(null);

  // ── Data ───────────────────────────────────────────────────────────────────

  async function load() {
    const now = Date.now();
    if (lastLoadRef.current && now - lastLoadRef.current < 30 * 1000) return;
    setLoading(true);
    const name = await getUserName();
    setMyName(name ?? 'Moi');
    const byUser = await getAllUsersLogs();
    setAllLogs(byUser);
    const bests = {};
    Object.keys(byUser).forEach(u => { bests[u] = computeBests(byUser[u]); });
    setAllBests(bests);
    lastLoadRef.current = Date.now();
    setLoading(false);
  }

  useFocusEffect(useCallback(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  async function handleRefresh() {
    setRefreshing(true);
    lastLoadRef.current = null;
    await load();
    setRefreshing(false);
  }

  // ── Radar panel ────────────────────────────────────────────────────────────

  async function fetchSpyData() {
    setSpyLoading(true);
    try {
      const [activity, planMeta, myCardio, rivalCardio] = await Promise.all([
        getAllActivity(),
        getSharedPlan(),
        myName ? getCloudCardioLogs(myName) : null,
        rival ? getCloudCardioLogs(rival) : null,
      ]);
      setSpyData({
        activity,
        planMeta,
        myCardio: myCardio ?? [],
        rivalCardio: rivalCardio ?? [],
      });
    } finally {
      setSpyLoading(false);
    }
  }

  const isRadarOwner = (myName ?? '').trim().toLowerCase() === RADAR_OWNER.toLowerCase();

  function openSpyPanel() {
    if (!isRadarOwner) return;
    setDevLog('');
    setDevVisible(true);
    fetchSpyData();
  }

  function handleTitleTap() {
    if (!isRadarOwner) return;
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      Vibration.vibrate(80);
      openSpyPanel();
      return;
    }
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
  }

  async function runDev(label, fn) {
    setDevLog('⏳ En cours…');
    try {
      const result = await fn();
      Vibration.vibrate([0, 40, 60, 40]);
      setDevLog(result ?? `✅ ${label} terminé.`);
    } catch (e) {
      setDevLog(`❌ Erreur : ${e.message}`);
    }
  }

  // ── Duo logic ──────────────────────────────────────────────────────────────

  const users      = Object.keys(allBests);
  const otherUsers = users.filter(u => u !== myName);
  const myBests    = allBests[myName] ?? {};
  const rival      = otherUsers[0] ?? null;
  const rivalBests = rival ? allBests[rival] : {};

  const myLogs     = allLogs[myName] ?? [];
  const rivalLogs  = rival ? (allLogs[rival] ?? []) : [];

  const myPRs    = computeMaxWeights(myLogs);
  const rivalPRs = rival ? computeMaxWeights(rivalLogs) : {};

  const myWeekVol     = computeWeekVolume(myLogs);
  const rivalWeekVol  = computeWeekVolume(rivalLogs);
  const myStreak      = computeStreak(myLogs);
  const rivalStreak   = computeStreak(rivalLogs);
  const myLastDays    = daysSinceLastSession(myLogs);
  const rivalLastDays = daysSinceLastSession(rivalLogs);

  const sharedExercises = rival ? Object.keys(myBests).filter(ex => rivalBests[ex]) : [];

  let myWins = 0, rivalWins = 0;
  sharedExercises.forEach(ex => {
    const myW = myPRs[ex]?.weight ?? 0;
    const rvW = rivalPRs[ex]?.weight ?? 0;
    if (myW >= rvW) myWins++;
    else rivalWins++;
  });

  const myTotalPR  = sharedExercises.reduce((sum, ex) => sum + lbToKg(toDisplayWeight(ex, myPRs[ex]?.weight ?? 0)), 0);
  const rvTotalPR  = sharedExercises.reduce((sum, ex) => sum + lbToKg(toDisplayWeight(ex, rivalPRs[ex]?.weight ?? 0)), 0);
  const totalGames = myWins + rivalWins;
  const myWinPct   = totalGames > 0 ? Math.round((myWins   / totalGames) * 100) : 0;
  const rvWinPct   = totalGames > 0 ? Math.round((rivalWins / totalGames) * 100) : 0;

  const overallMsg =
    !rival                       ? null :
    sharedExercises.length === 0 ? 'Pas encore de données communes' :
    myWins > rivalWins            ? `${myName} domine 💪` :
    rivalWins > myWins            ? `${rival} domine 💪` :
    'Match nul 🤝';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleTitleTap} activeOpacity={1}>
            <Text style={styles.title}>DUO</Text>
          </TouchableOpacity>
          {isRadarOwner && (
            <TouchableOpacity style={styles.spyBtn} onPress={openSpyPanel} activeOpacity={0.75}>
              <Text style={styles.spyBtnEmoji}>🕵️</Text>
              <Text style={styles.spyBtnTxt}>RADAR</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>
          {rival ? `${myName} vs ${rival}` : 'En attente du coéquipier…'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Chargement du cloud…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {!rival ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={64} color="#484848" />
              <Text style={styles.emptyTitle}>En attente</Text>
              <Text style={styles.emptyText}>
                Ton coéquipier doit ouvrir l'app et enregistrer une séance pour apparaître ici.
              </Text>
            </View>
          ) : (
            <>
              {/* ── Bloc Compétition ─────────────────────────────────────── */}

              {/* Section A — Volume semaine */}
              <View style={styles.compCard}>
                <View style={styles.compHeader}>
                  <Ionicons name="barbell-outline" size={14} color="#484848" />
                  <Text style={styles.compTitle}>VOLUME SEMAINE</Text>
                </View>
                <View style={styles.compRow}>
                  <View style={styles.compCol}>
                    <Text style={[styles.compVal, myWeekVol >= rivalWeekVol && styles.compValWin]}>
                      {fmtKg(myWeekVol)}
                    </Text>
                    <Text style={styles.compUnit}>KG TOTAL</Text>
                    <Text style={styles.compName}>{myName.toUpperCase()}</Text>
                    {myWeekVol >= rivalWeekVol && myWeekVol > 0 && (
                      <View style={styles.winnerBadge}>
                        <Text style={styles.winnerText}>LEADER</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.compDivider} />
                  <View style={styles.compCol}>
                    <Text style={[styles.compVal, rivalWeekVol > myWeekVol && styles.compValWin]}>
                      {fmtKg(rivalWeekVol)}
                    </Text>
                    <Text style={styles.compUnit}>KG TOTAL</Text>
                    <Text style={styles.compName}>{rival.toUpperCase()}</Text>
                    {rivalWeekVol > myWeekVol && (
                      <View style={styles.winnerBadge}>
                        <Text style={styles.winnerText}>LEADER</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Section B — Streak */}
              <View style={styles.compCard}>
                <View style={styles.compHeader}>
                  <Text style={{ fontSize: 14 }}>🔥</Text>
                  <Text style={styles.compTitle}>STREAK</Text>
                </View>
                <View style={styles.compRow}>
                  <View style={styles.compCol}>
                    <Text style={[styles.compVal, myStreak >= rivalStreak && myStreak > 0 && styles.compValWin]}>
                      {myStreak}
                    </Text>
                    <Text style={styles.compUnit}>JOUR{myStreak !== 1 ? 'S' : ''} CONSÉCUTIF{myStreak !== 1 ? 'S' : ''}</Text>
                    <Text style={styles.compName}>{myName.toUpperCase()}</Text>
                    {myStreak > rivalStreak && myStreak > 0 && (
                      <View style={styles.winnerBadge}>
                        <Text style={styles.winnerText}>EN FEU</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.compDivider} />
                  <View style={styles.compCol}>
                    <Text style={[styles.compVal, rivalStreak > myStreak && styles.compValWin]}>
                      {rivalStreak}
                    </Text>
                    <Text style={styles.compUnit}>JOUR{rivalStreak !== 1 ? 'S' : ''} CONSÉCUTIF{rivalStreak !== 1 ? 'S' : ''}</Text>
                    <Text style={styles.compName}>{rival.toUpperCase()}</Text>
                    {rivalStreak > myStreak && rivalStreak > 0 && (
                      <View style={styles.winnerBadge}>
                        <Text style={styles.winnerText}>EN FEU</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Section C — Dernière séance */}
              <View style={[styles.compCard, { marginBottom: 20 }]}>
                <View style={styles.compHeader}>
                  <Ionicons name="time-outline" size={14} color="#484848" />
                  <Text style={styles.compTitle}>DERNIÈRE SÉANCE</Text>
                </View>
                <View style={styles.compRow}>
                  <View style={styles.compCol}>
                    <Text style={[
                      styles.compVal,
                      myLastDays !== null && (rivalLastDays === null || myLastDays <= rivalLastDays) && styles.compValWin,
                    ]}>
                      {myLastDays === null ? '—' : myLastDays === 0 ? 'Auj.' : `J-${myLastDays}`}
                    </Text>
                    <Text style={styles.compUnit}>
                      {myLastDays === null ? 'PAS DE DONNÉES' : myLastDays === 0 ? 'AUJOURD\'HUI' : `IL Y A ${myLastDays} JOUR${myLastDays !== 1 ? 'S' : ''}`}
                    </Text>
                    <Text style={styles.compName}>{myName.toUpperCase()}</Text>
                  </View>
                  <View style={styles.compDivider} />
                  <View style={styles.compCol}>
                    <Text style={[
                      styles.compVal,
                      rivalLastDays !== null && (myLastDays === null || rivalLastDays <= myLastDays) && styles.compValWin,
                    ]}>
                      {rivalLastDays === null ? '—' : rivalLastDays === 0 ? 'Auj.' : `J-${rivalLastDays}`}
                    </Text>
                    <Text style={styles.compUnit}>
                      {rivalLastDays === null ? 'PAS DE DONNÉES' : rivalLastDays === 0 ? 'AUJOURD\'HUI' : `IL Y A ${rivalLastDays} JOUR${rivalLastDays !== 1 ? 'S' : ''}`}
                    </Text>
                    <Text style={styles.compName}>{rival.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {/* ── Scoreboard ────────────────────────────────────────────── */}
              {sharedExercises.length > 0 && (
                <View style={styles.scoreboard}>
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreName}>{myName.toUpperCase()}</Text>
                    <Text style={[styles.scoreNum, myWins >= rivalWins && styles.scoreNumWin]}>{myWins}</Text>
                    <Text style={[styles.scoreWinPct, myWins >= rivalWins && { color: colors.primary }]}>{myWinPct}%</Text>
                    <Text style={styles.scoreTotalPR}>{fmtKg(myTotalPR)} kg</Text>
                  </View>
                  <View style={styles.scoreMiddle}>
                    <Text style={styles.scoreVS}>EX. GAGNÉS</Text>
                    <Text style={styles.overallMsg}>{overallMsg}</Text>
                    <Text style={[styles.scoreVS, { marginTop: 4 }]}>PR TOTAL</Text>
                  </View>
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreName}>{rival.toUpperCase()}</Text>
                    <Text style={[styles.scoreNum, rivalWins > myWins && styles.scoreNumWin]}>{rivalWins}</Text>
                    <Text style={[styles.scoreWinPct, rivalWins > myWins && { color: colors.primary }]}>{rvWinPct}%</Text>
                    <Text style={styles.scoreTotalPR}>{fmtKg(rvTotalPR)} kg</Text>
                  </View>
                </View>
              )}

              {/* ── Exercise cards ────────────────────────────────────────── */}
              {sharedExercises.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>Pas encore de données communes</Text>
                  <Text style={styles.emptyText}>Faites les mêmes exercices pour vous comparer.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionLabel}>RECORDS PERSONNELS — PR</Text>
                  {sharedExercises.map(ex => {
                    const mePR = myPRs[ex]  ?? myBests[ex];
                    const rvPR = rivalPRs[ex] ?? rivalBests[ex];
                    const myW  = lbToKg(toDisplayWeight(ex, mePR?.weight ?? 0));
                    const rvW  = lbToKg(toDisplayWeight(ex, rvPR?.weight ?? 0));
                    const iWin = myW >= rvW;
                    const gap  = Math.abs(myW - rvW);
                    return (
                      <View key={ex} style={styles.compareCard}>
                        <View style={styles.compareCardHead}>
                          <Text style={styles.compareEx}>{ex}</Text>
                          {gap > 0 && (
                            <View style={styles.gapBadge}>
                              <Text style={styles.gapTxt}>Écart {gap.toFixed(1)} kg</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.compareRow}>
                          <View style={[styles.compareBox, iWin && styles.compareBoxWin]}>
                            {iWin && <Text style={styles.trophyTxt}>🏆</Text>}
                            <Text style={styles.compareName}>{myName.toUpperCase()}</Text>
                            <Text style={styles.compareMain}>{myW.toFixed(1)} kg</Text>
                            <Text style={styles.compareReps}>× {mePR?.reps ?? '—'} reps</Text>
                            {iWin && <View style={styles.winChip}><Text style={styles.winChipText}>LEADER</Text></View>}
                          </View>
                          <View style={[styles.compareBox, !iWin && styles.compareBoxWin]}>
                            {!iWin && <Text style={styles.trophyTxt}>🏆</Text>}
                            <Text style={styles.compareName}>{rival.toUpperCase()}</Text>
                            <Text style={styles.compareMain}>{rvW.toFixed(1)} kg</Text>
                            <Text style={styles.compareReps}>× {rvPR?.reps ?? '—'} reps</Text>
                            {!iWin && <View style={styles.winChip}><Text style={styles.winChipText}>LEADER</Text></View>}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              {/* ── Exercices en attente — moi seulement ─────────────────── */}
              {(() => {
                const myOnly = Object.keys(myBests).filter(ex => !rivalBests[ex]);
                if (myOnly.length === 0) return null;
                return (
                  <View style={styles.pendingSection}>
                    <Text style={styles.sectionLabel}>EN ATTENTE DE {rival.toUpperCase()}</Text>
                    {myOnly.map(ex => (
                      <View key={ex} style={styles.pendingRow}>
                        <Text style={styles.pendingEx}>{ex}</Text>
                        <Text style={styles.pendingVal}>Toi : {lbToKg(toDisplayWeight(ex, myBests[ex].weight)).toFixed(1)} kg × {myBests[ex].reps}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}

              {/* ── Exercices en attente — rival seulement ───────────────── */}
              {(() => {
                const rivalOnly = Object.keys(rivalBests).filter(ex => !myBests[ex]);
                if (rivalOnly.length === 0) return null;
                return (
                  <View style={styles.pendingSection}>
                    <Text style={styles.sectionLabel}>EN ATTENTE DE TOI</Text>
                    {rivalOnly.map(ex => (
                      <View key={ex} style={styles.pendingRow}>
                        <Text style={styles.pendingEx}>{ex}</Text>
                        <Text style={styles.pendingVal}>{rival} : {lbToKg(toDisplayWeight(ex, rivalBests[ex].weight)).toFixed(1)} kg × {rivalBests[ex].reps}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Radar Duo (panneau espion) ─────────────────────────────────────── */}
      <Modal visible={devVisible} transparent animationType="slide" onRequestClose={() => setDevVisible(false)}>
        <View style={styles.devOverlay}>
          <View style={styles.devPanel}>
            <View style={styles.devHandle} />
            <View style={styles.spyHdrRow}>
              <Text style={styles.devTitle}>🕵️ Radar Duo</Text>
              <TouchableOpacity onPress={fetchSpyData} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                {spyLoading
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="refresh" size={19} color={colors.textMuted} />
                }
              </TouchableOpacity>
            </View>

            {devLog ? <Text style={styles.devLog}>{devLog}</Text> : null}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {!rival ? (
                <Text style={styles.spyEmpty}>
                  Aucun partenaire détecté — il doit enregistrer au moins une séance pour apparaître sur le radar.
                </Text>
              ) : (() => {
                const act          = spyData?.activity?.[rival] ?? null;
                const rivalCardio  = spyData?.rivalCardio ?? [];
                const cardioToday  = rivalCardio.filter(c => isToday(c.date));
                const lastCardio   = rivalCardio[0] ?? null; // trié desc côté cloud
                const rivalSetsNow = setsToday(rivalLogs);
                const nutrToday    = !!act && act.nutritionDay === todayKey();
                const photoToday   = isToday(act?.lastPhotoAt);
                const seenToday    = isToday(act?.lastSeenAt);
                const planMeta     = spyData?.planMeta ?? null;
                const noData       = 'Aucune donnée (son app est à jour ?)';

                const anyToday = rivalSetsNow > 0 || cardioToday.length > 0 || nutrToday || photoToday;
                const verdict = anyToday
                  ? `✅ ${rival} est actif aujourd'hui — rien à signaler.`
                  : seenToday
                    ? `😴 ${rival} a ouvert l'app aujourd'hui… mais n'a encore rien loggé.`
                    : `👀 Aucun signe de vie de ${rival} aujourd'hui.`;

                return (
                  <>
                    <View style={[styles.verdictCard, anyToday ? styles.verdictOk : styles.verdictKo]}>
                      <Text style={styles.verdictTxt}>{verdict}</Text>
                    </View>

                    <Text style={styles.devCat}>AUJOURD'HUI — {rival.toUpperCase()}</Text>

                    <SpyRow icon="barbell-outline" label="Muscu" ok={rivalSetsNow > 0}
                      value={rivalSetsNow > 0
                        ? `${rivalSetsNow} sets ✓`
                        : rivalLastDays != null ? `Rien · dernière il y a ${rivalLastDays} j` : 'Jamais loggé'}
                    />
                    <SpyRow icon="heart-outline" label="Cardio" ok={cardioToday.length > 0}
                      value={cardioToday.length > 0
                        ? cardioToday.map(c => `${formatDuration(c.durationSec)} ${getCardioTypeLabel(c.type)}`).join(' + ') + ' ✓'
                        : lastCardio ? `Rien · dernier ${timeAgo(lastCardio.date)}` : 'Jamais loggé'}
                    />
                    <SpyRow icon="restaurant-outline" label="Nutrition" ok={nutrToday}
                      value={!act
                        ? noData
                        : nutrToday
                          ? `${act.caloriesToday ?? 0} kcal${act.proteinToday ? ` · ${act.proteinToday} g prot` : ''} ✓`
                          : act.lastNutritionAt ? `Rien · dernier log ${timeAgo(act.lastNutritionAt)}` : 'Jamais loggé'}
                    />
                    <SpyRow icon="camera-outline" label="Photo" ok={photoToday}
                      value={!act
                        ? noData
                        : act.lastPhotoAt
                          ? photoToday ? 'Nouvelle photo aujourd\'hui ✓' : `Dernière ${timeAgo(act.lastPhotoAt)}`
                          : 'Jamais'}
                    />
                    <SpyRow icon="eye-outline" label="App ouverte" ok={seenToday}
                      value={act?.lastSeenAt ? timeAgo(act.lastSeenAt) : noData}
                    />
                    <SpyRow icon="calendar-outline" label="Plan partagé"
                      ok={!!planMeta && planMeta.updatedBy === rival && isToday(planMeta.updatedAt)}
                      value={planMeta
                        ? `Modifié par ${planMeta.updatedBy} · ${timeAgo(planMeta.updatedAt)}`
                        : 'Aucun plan sync'}
                    />

                    <Text style={styles.devCat}>CETTE SEMAINE — TOI vs {rival.toUpperCase()}</Text>
                    <VsRow label="Séances muscu" a={sessionDays7d(myLogs)} b={sessionDays7d(rivalLogs)} />
                    <VsRow label="Sets totaux"   a={last7d(myLogs).length} b={last7d(rivalLogs).length} />
                    <VsRow label="Cardios"       a={last7d(spyData?.myCardio ?? []).length} b={last7d(rivalCardio).length} />
                  </>
                );
              })()}

              <Text style={styles.devCat}>OUTILS</Text>

              <DevBtn
                icon="🔌"
                label="Test connexion Supabase"
                sub="Vérifie la latence et l'état de la base de données"
                onPress={() => runDev('Ping', testSupabaseConnection)}
              />

              <Text style={styles.devCat}>DANGER ZONE</Text>

              <DevBtn
                icon="🗑️"
                label="Reset plan partagé"
                sub="Remet le plan partagé à zéro (local + cloud)"
                danger
                onPress={() => runDev('ResetPlan', resetSharedPlan)}
              />
              <DevBtn
                icon="☢️"
                label="Nuclear Reset"
                sub="Supprime toutes les données locales et cloud — irréversible"
                danger
                onPress={() => runDev('Nuclear', () => new Promise(resolve => {
                  Alert.alert(
                    'Nuclear Reset',
                    'Supprimer TOUTES les données (local + cloud) ?\n\nCette action est irréversible.',
                    [
                      { text: 'Annuler', style: 'cancel', onPress: () => resolve('Annulé.') },
                      { text: 'Tout supprimer', style: 'destructive', onPress: async () => {
                        await clearAllUsersLogs();
                        resolve('Données effacées — local et cloud.');
                      }},
                    ],
                    { cancelable: true, onDismiss: () => resolve('Annulé.') }
                  );
                }))}
              />

            </ScrollView>

            <TouchableOpacity style={styles.devClose} onPress={() => setDevVisible(false)}>
              <Text style={styles.devCloseTxt}>FERMER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DevBtn({ icon, label, sub, onPress, danger }) {
  return (
    <TouchableOpacity
      style={[styles.devBtn, danger && styles.devBtnDanger]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.devBtnIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.devBtnLabel, danger && { color: colors.danger }]}>{label}</Text>
        <Text style={styles.devBtnSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color="#333" />
    </TouchableOpacity>
  );
}

// Ligne du radar : icône + catégorie + statut (vert = fait aujourd'hui)
function SpyRow({ icon, label, value, ok }) {
  return (
    <View style={styles.spyRow}>
      <View style={[styles.spyIconWrap, ok && styles.spyIconOk]}>
        <Ionicons name={icon} size={15} color={ok ? colors.success : colors.textMuted} />
      </View>
      <Text style={styles.spyLabel}>{label}</Text>
      <Text style={[styles.spyValue, ok && { color: colors.success }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// Ligne de comparaison hebdo : moi | libellé | lui
function VsRow({ label, a, b }) {
  return (
    <View style={styles.vsRow}>
      <Text style={[styles.vsVal, a > b && styles.vsValWin]}>{a}</Text>
      <Text style={styles.vsLabel}>{label}</Text>
      <Text style={[styles.vsVal, b > a && styles.vsValWin]}>{b}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 38, fontWeight: '900', color: colors.text, letterSpacing: -1, marginBottom: 2 },
  subtitle: { fontSize: 13, color: colors.primary, fontWeight: '600', letterSpacing: 0.3 },
  spyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surfaceElevated, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.border,
  },
  spyBtnEmoji: { fontSize: 14 },
  spyBtnTxt: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1 },

  // Competition block
  compCard: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, marginBottom: 14, overflow: 'hidden' },
  compHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceElevated },
  compTitle: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5 },
  compRow: { flexDirection: 'row', padding: 16, gap: 12 },
  compCol: { flex: 1, alignItems: 'center', gap: 4 },
  compVal: { fontSize: 28, fontWeight: '900', color: colors.text },
  compValWin: { color: colors.primary },
  compName: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  compUnit: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  compDivider: { width: 1, backgroundColor: colors.surfaceElevated, alignSelf: 'stretch' },
  winnerBadge: { backgroundColor: 'rgba(255,107,0,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  winnerText: { fontSize: 9, fontWeight: '900', color: colors.primary, letterSpacing: 1 },

  // Scoreboard
  scoreboard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: 'hidden' },
  scoreCol: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  scoreMiddle: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.surfaceElevated },
  scoreName: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.2, marginBottom: 8 },
  scoreNum: { fontSize: 52, fontWeight: '900', color: colors.text },
  scoreNumWin: { color: colors.primary },
  scoreVS: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  overallMsg: { color: colors.text, fontSize: 10, fontWeight: '700', textAlign: 'center', maxWidth: 72, lineHeight: 14 },

  // Exercise cards
  sectionLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 10, marginTop: 4 },
  compareCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  compareEx: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  compareRow: { flexDirection: 'row', gap: 10 },
  compareBox: { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  compareBoxWin: { borderColor: colors.primary, backgroundColor: 'rgba(255,107,0,0.06)' },
  compareName: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 6 },
  compareMain: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 2 },
  compare1RM: { fontSize: 11, color: colors.textSecondary, marginBottom: 8 },
  winChip: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  winChipText: { color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },

  // Empty & pending
  empty: { alignItems: 'center', paddingTop: 80, gap: 14 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: 24 },
  pendingSection: { marginTop: 6, backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  pendingRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceElevated },
  pendingEx: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  pendingVal: { color: colors.textSecondary, fontSize: 12 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },

  // Dev panel
  devOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  devPanel:    { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, borderTopWidth: 1, borderColor: colors.surfaceElevated, maxHeight: '88%' },
  devHandle:   { width: 36, height: 4, backgroundColor: '#2a2a2a', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  devTitle:    { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12, letterSpacing: 0.3 },
  devLog:      { fontSize: 13, color: '#4ade80', marginBottom: 10, fontWeight: '600', lineHeight: 19, backgroundColor: '#0d1a0d', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1a3a1a' },
  devCat:      { fontSize: 9, fontWeight: '800', color: '#333', letterSpacing: 2, marginTop: 16, marginBottom: 6, textTransform: 'uppercase' },
  devBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 6, gap: 12, borderWidth: 1, borderColor: '#1e1e1e' },
  devBtnDanger:{ borderColor: '#2a0000', backgroundColor: '#130000' },
  devBtnIcon:  { fontSize: 20, width: 28, textAlign: 'center' },
  devBtnLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  devBtnSub:   { color: '#444', fontSize: 11, lineHeight: 15 },
  devClose:    { marginTop: 14, alignItems: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#1e1e1e', backgroundColor: '#111' },
  devCloseTxt: { color: '#333', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },

  // Radar Duo
  spyHdrRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  spyEmpty:    { fontSize: 13, color: colors.textSecondary, lineHeight: 20, paddingVertical: 18, textAlign: 'center' },
  verdictCard: { borderRadius: 14, padding: 14, marginBottom: 4, borderWidth: 1 },
  verdictOk:   { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.35)' },
  verdictKo:   { backgroundColor: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.3)' },
  verdictTxt:  { fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 19 },
  spyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111', borderRadius: 12, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#1e1e1e',
  },
  spyIconWrap: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  spyIconOk: { backgroundColor: 'rgba(34,197,94,0.12)' },
  spyLabel:  { width: 84, fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  spyValue:  { flex: 1, fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'right' },
  vsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    marginBottom: 6, borderWidth: 1, borderColor: '#1e1e1e',
  },
  vsVal:    { width: 44, fontSize: 18, fontWeight: '900', color: colors.textMuted, textAlign: 'center' },
  vsValWin: { color: colors.primary },
  vsLabel:  { flex: 1, fontSize: 12, fontWeight: '700', color: colors.textSecondary, textAlign: 'center', letterSpacing: 0.5 },

  // Enhanced scoreboard
  scoreWinPct:  { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 2 },
  scoreTotalPR: { fontSize: 10, color: colors.textMuted, marginTop: 4, fontWeight: '600' },

  // PR comparison cards
  compareCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  gapBadge:        { backgroundColor: colors.surfaceElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  gapTxt:          { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  trophyTxt:       { fontSize: 16, marginBottom: 4 },
  compareReps:     { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
});
