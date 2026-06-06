import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, Alert, Vibration, DevSettings, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getAllUsersLogs, getUserName, getLogs, getCloudLogs, saveSession, clearAllUsersLogs } from '../storage/storage';
import { supabase } from '../lib/supabase';
import { WORKOUT_SPLIT } from '../data/workoutPlan';

// ── Conversion lb → kg ────────────────────────────────────────────────────────

const LB_TO_KG = 0.453592;
function lbToKg(lb) { return lb * LB_TO_KG; }
function fmtKg(kg)  { return kg >= 1000 ? `${(kg / 1000).toFixed(1)}k` : kg.toFixed(1); }

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

// ── Dev helpers ───────────────────────────────────────────────────────────────

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function seedFakeHistory() {
  const sets = [];
  const now = Date.now();
  for (let weekAgo = 0; weekAgo < 3; weekAgo++) {
    for (let day = 0; day <= 6; day++) {
      const workout = WORKOUT_SPLIT[day];
      const daysBack = weekAgo * 7 + (6 - day);
      const date = new Date(now - daysBack * 86400000).toISOString();
      workout.exercises.forEach(exercise => {
        const base = rand(65, 185);
        for (let s = 0; s < rand(3, 5); s++) {
          sets.push({ exercise, weight: base + rand(-10, 10), reps: rand(5, 12), date });
        }
      });
    }
  }
  await saveSession(sets);
  return `✅ ${sets.length} sets générés sur 3 semaines (7j × 3 sem.).`;
}

async function seedProgressionData() {
  const now = Date.now();
  const exercises = [
    { name: 'Bench Press',    base: 135, reps: 5 },
    { name: 'Squat',          base: 185, reps: 5 },
    { name: 'Deadlift',       base: 225, reps: 3 },
    { name: 'Shoulder Press', base: 95,  reps: 8 },
    { name: 'Barbell Row',    base: 135, reps: 8 },
    { name: 'Pull-ups',       base: 0,   reps: 10 },
  ];
  const sets = [];
  for (let w = 0; w < 10; w++) {
    const mult = 0.72 + (w / 10) * 0.28;
    const date = new Date(now - (10 - w) * 7 * 86400000).toISOString();
    exercises.forEach(({ name, base, reps }) => {
      const weight = base > 0 ? Math.round((base * mult) / 2.5) * 2.5 : 0;
      for (let s = 0; s < 4; s++) sets.push({ exercise: name, weight, reps, date });
    });
  }
  await saveSession(sets);
  return `📈 ${sets.length} sets sur 10 semaines — progression linéaire claire.`;
}

async function resetSharedPlan() {
  await supabase.from('shared_plans').upsert({
    id: 'main', plan: {}, updated_by: 'reset', updated_at: new Date().toISOString(),
  });
  return '🗑️ Plan partagé réinitialisé sur les deux appareils.';
}

async function getUserInfo() {
  const name = await getUserName();
  if (!name) return '⚠️ Aucun utilisateur connecté (mode local).';
  const local = await getLogs();
  const cloud = await getCloudLogs(name);
  const lastDate = local.length > 0
    ? new Date(Math.max(...local.map(s => new Date(s.date).getTime()))).toLocaleDateString('fr-CA')
    : '—';
  let cloudUsers = '?';
  try {
    const { data } = await supabase.from('workout_logs').select('user_name').limit(500);
    if (data) {
      cloudUsers = [...new Set(data.map(r => r.user_name).filter(Boolean))].join(', ') || '(aucun)';
    }
  } catch {}
  return (
    `👤 Utilisateur : ${name}\n` +
    `📱 Logs locaux : ${local.length}\n` +
    `☁️  Logs cloud : ${cloud?.length ?? '?'}\n` +
    `📅 Dernière séance : ${lastDate}\n` +
    `👥 Utilisateurs cloud : ${cloudUsers}`
  );
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

  // Dev panel
  const tapCount  = useRef(0);
  const tapTimer  = useRef(null);
  const [devVisible, setDevVisible] = useState(false);
  const [devLog,     setDevLog]     = useState('');
  const channelRef  = useRef(null);
  const lastLoadRef = useRef(null);

  // ── Reload channel ────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel('gym-reload-v1');
    ch.on('broadcast', { event: 'reload' }, () => {
      setTimeout(() => { try { DevSettings.reload(); } catch {} }, 800);
    }).subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, []);

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

  // ── Dev panel ──────────────────────────────────────────────────────────────

  function handleTitleTap() {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 7) {
      tapCount.current = 0;
      Vibration.vibrate(80);
      setDevLog('');
      setDevVisible(true);
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

  async function fireReloadAll() {
    try {
      await channelRef.current?.send({ type: 'broadcast', event: 'reload', payload: {} });
    } catch {}
    setTimeout(() => { try { DevSettings.reload(); } catch {} }, 800);
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

  const myTotalPR  = sharedExercises.reduce((sum, ex) => sum + lbToKg(myPRs[ex]?.weight ?? 0), 0);
  const rvTotalPR  = sharedExercises.reduce((sum, ex) => sum + lbToKg(rivalPRs[ex]?.weight ?? 0), 0);
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
        <TouchableOpacity onPress={handleTitleTap} activeOpacity={1}>
          <Text style={styles.title}>DUO</Text>
        </TouchableOpacity>
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
              tintColor="#FF6B00"
              colors={['#FF6B00']}
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
                    <Text style={[styles.scoreWinPct, myWins >= rivalWins && { color: '#FF6B00' }]}>{myWinPct}%</Text>
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
                    <Text style={[styles.scoreWinPct, rivalWins > myWins && { color: '#FF6B00' }]}>{rvWinPct}%</Text>
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
                    const myW  = lbToKg(mePR?.weight ?? 0);
                    const rvW  = lbToKg(rvPR?.weight ?? 0);
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
                        <Text style={styles.pendingVal}>Toi : {lbToKg(myBests[ex].weight).toFixed(1)} kg × {myBests[ex].reps}</Text>
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
                        <Text style={styles.pendingVal}>{rival} : {lbToKg(rivalBests[ex].weight).toFixed(1)} kg × {rivalBests[ex].reps}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Dev Panel ──────────────────────────────────────────────────────── */}
      <Modal visible={devVisible} transparent animationType="slide">
        <View style={styles.devOverlay}>
          <View style={styles.devPanel}>
            <View style={styles.devHandle} />
            <Text style={styles.devTitle}>🛠️ Dev Panel</Text>

            {devLog ? <Text style={styles.devLog}>{devLog}</Text> : null}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={styles.devCat}>DONNÉES DE TEST</Text>

              <DevBtn
                icon="📊"
                label="Seed 3 semaines d'historique"
                sub="~250 sets répartis sur 7 jours × 3 semaines"
                onPress={() => runDev('Seed', seedFakeHistory)}
              />
              <DevBtn
                icon="📈"
                label="Seed progression sur 10 semaines"
                sub="Progression linéaire pour tester les graphiques"
                onPress={() => runDev('Progression', seedProgressionData)}
              />

              <Text style={styles.devCat}>DIAGNOSTIC</Text>

              <DevBtn
                icon="👤"
                label="Infos utilisateur"
                sub="Nom, nb de logs locaux et cloud, utilisateurs actifs"
                onPress={() => runDev('Info', getUserInfo)}
              />
              <DevBtn
                icon="🔌"
                label="Test connexion Supabase"
                sub="Vérifie la latence et l'état de la base de données"
                onPress={() => runDev('Ping', testSupabaseConnection)}
              />

              <Text style={styles.devCat}>SYNCHRONISATION</Text>

              <DevBtn
                icon="🔄"
                label="Reload tous les appareils"
                sub="Envoie un signal de rechargement via Supabase Realtime"
                onPress={() => runDev('Reload', async () => {
                  await fireReloadAll();
                  return '🔄 Signal envoyé — rechargement en cours sur tous les appareils.';
                })}
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
        <Text style={[styles.devBtnLabel, danger && { color: '#EF4444' }]}>{label}</Text>
        <Text style={styles.devBtnSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color="#333" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#242424' },
  title: { fontSize: 38, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1, marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#FF6B00', fontWeight: '600', letterSpacing: 0.3 },

  // Competition block
  compCard: { backgroundColor: '#111111', borderRadius: 22, borderWidth: 1, borderColor: '#242424', marginBottom: 14, overflow: 'hidden' },
  compHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  compTitle: { fontSize: 10, fontWeight: '800', color: '#484848', letterSpacing: 1.5 },
  compRow: { flexDirection: 'row', padding: 16, gap: 12 },
  compCol: { flex: 1, alignItems: 'center', gap: 4 },
  compVal: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  compValWin: { color: '#FF6B00' },
  compName: { fontSize: 9, fontWeight: '800', color: '#484848', letterSpacing: 1 },
  compUnit: { fontSize: 10, color: '#484848', fontWeight: '600' },
  compDivider: { width: 1, backgroundColor: '#1a1a1a', alignSelf: 'stretch' },
  winnerBadge: { backgroundColor: 'rgba(255,107,0,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  winnerText: { fontSize: 9, fontWeight: '900', color: '#FF6B00', letterSpacing: 1 },

  // Scoreboard
  scoreboard: { flexDirection: 'row', backgroundColor: '#111111', borderRadius: 22, borderWidth: 1, borderColor: '#242424', marginBottom: 16, overflow: 'hidden' },
  scoreCol: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  scoreMiddle: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#1a1a1a' },
  scoreName: { fontSize: 10, fontWeight: '800', color: '#484848', letterSpacing: 1.2, marginBottom: 8 },
  scoreNum: { fontSize: 52, fontWeight: '900', color: '#FFFFFF' },
  scoreNumWin: { color: '#FF6B00' },
  scoreVS: { color: '#484848', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  overallMsg: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', textAlign: 'center', maxWidth: 72, lineHeight: 14 },

  // Exercise cards
  sectionLabel: { color: '#484848', fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 10, marginTop: 4 },
  compareCard: { backgroundColor: '#111111', borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#242424' },
  compareEx: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  compareRow: { flexDirection: 'row', gap: 10 },
  compareBox: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#242424' },
  compareBoxWin: { borderColor: '#FF6B00', backgroundColor: 'rgba(255,107,0,0.06)' },
  compareName: { fontSize: 9, fontWeight: '800', color: '#484848', letterSpacing: 1, marginBottom: 6 },
  compareMain: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  compare1RM: { fontSize: 11, color: '#999999', marginBottom: 8 },
  winChip: { alignSelf: 'flex-start', backgroundColor: '#FF6B00', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  winChipText: { color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },

  // Empty & pending
  empty: { alignItems: 'center', paddingTop: 80, gap: 14 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  emptyText: { fontSize: 14, color: '#999999', textAlign: 'center', lineHeight: 21, paddingHorizontal: 24 },
  pendingSection: { marginTop: 6, backgroundColor: '#111111', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#242424', marginBottom: 10 },
  pendingRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  pendingEx: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  pendingVal: { color: '#999999', fontSize: 12 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: '#999999', fontSize: 14 },

  // Dev panel
  devOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  devPanel:    { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, borderTopWidth: 1, borderColor: '#1a1a1a', maxHeight: '88%' },
  devHandle:   { width: 36, height: 4, backgroundColor: '#2a2a2a', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  devTitle:    { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 12, letterSpacing: 0.3 },
  devLog:      { fontSize: 13, color: '#4ade80', marginBottom: 10, fontWeight: '600', lineHeight: 19, backgroundColor: '#0d1a0d', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1a3a1a' },
  devCat:      { fontSize: 9, fontWeight: '800', color: '#333', letterSpacing: 2, marginTop: 16, marginBottom: 6, textTransform: 'uppercase' },
  devBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 6, gap: 12, borderWidth: 1, borderColor: '#1e1e1e' },
  devBtnDanger:{ borderColor: '#2a0000', backgroundColor: '#130000' },
  devBtnIcon:  { fontSize: 20, width: 28, textAlign: 'center' },
  devBtnLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  devBtnSub:   { color: '#444', fontSize: 11, lineHeight: 15 },
  devClose:    { marginTop: 14, alignItems: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#1e1e1e', backgroundColor: '#111' },
  devCloseTxt: { color: '#333', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },

  // Enhanced scoreboard
  scoreWinPct:  { fontSize: 13, fontWeight: '700', color: '#484848', marginTop: 2 },
  scoreTotalPR: { fontSize: 10, color: '#484848', marginTop: 4, fontWeight: '600' },

  // PR comparison cards
  compareCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  gapBadge:        { backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#242424' },
  gapTxt:          { fontSize: 10, color: '#999999', fontWeight: '600' },
  trophyTxt:       { fontSize: 16, marginBottom: 4 },
  compareReps:     { fontSize: 12, color: '#484848', marginBottom: 8 },
});
