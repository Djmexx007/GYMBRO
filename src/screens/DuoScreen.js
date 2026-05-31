import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, Alert, Vibration, DevSettings, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getAllUsersLogs, getUserName, saveSession, clearAllUsersLogs, insertRawCloud } from '../storage/storage';
import { supabase } from '../lib/supabase';
import { WORKOUT_SPLIT } from '../data/workoutPlan';
import { FRIEND_BESTS } from '../data/mockDuo';

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

// ── Nouvelles fonctions de calcul ─────────────────────────────────────────────

function computeWeekVolume(logs) {
  const cutoff = Date.now() - 7 * 86400000;
  return logs
    .filter(s => new Date(s.date).getTime() >= cutoff)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);
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
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function seedFakeHistory() {
  const sets = [];
  const now = Date.now();
  for (let weekAgo = 0; weekAgo < 3; weekAgo++) {
    for (let day = 0; day <= 6; day++) {
      const workout = WORKOUT_SPLIT[day];
      const daysBack = weekAgo * 7 + (6 - day);
      const date = new Date(now - daysBack * 86400000).toISOString();
      workout.exercises.forEach(exercise => {
        const base = rand(65, 225);
        for (let s = 0; s < rand(3, 5); s++) {
          sets.push({ exercise, weight: base + rand(-10, 10), reps: rand(5, 12), date });
        }
      });
    }
  }
  await saveSession(sets);
  return `✅ ${sets.length} sets générés sur 3 semaines. T'as l'air d'un vrai athlète maintenant.`;
}

async function becomeGoat() {
  const prs = [
    { exercise: 'Bench Press',       weight: 405,  reps: 1 },
    { exercise: 'Squat',             weight: 900,  reps: 1 },
    { exercise: 'Deadlift',          weight: 1000, reps: 1 },
    { exercise: 'Barbell Row',       weight: 500,  reps: 5 },
    { exercise: 'Pull-ups',          weight: 0,    reps: 50 },
    { exercise: 'Biceps Curl',       weight: 200,  reps: 20 },
    { exercise: 'Lateral Raises',    weight: 100,  reps: 30 },
    { exercise: 'Shoulder Press',    weight: 350,  reps: 5 },
    { exercise: 'Leg Press',         weight: 2000, reps: 20 },
    { exercise: 'Triceps Pushdown',  weight: 300,  reps: 25 },
  ].map(s => ({ ...s, date: new Date().toISOString() }));
  await saveSession(prs);
  return '🐐 Félicitations. Tu es officiellement plus fort que Dieu. Zach peut aller se rhabiller.';
}

async function zachIsAFraud() {
  const sets = Object.entries(FRIEND_BESTS).map(([exercise, { weight, reps }]) => ({
    exercise, weight: weight + 1, reps,
    date: new Date().toISOString(),
  }));
  await saveSession(sets);
  return `🕵️ Fraude exposée. Tu bats Zach sur ${sets.length} exercices. Enquête terminée.`;
}

async function testProgressChart() {
  const now = Date.now();
  const exercises = [
    { name: 'Bench Press',    base: 80,  reps: 5 },
    { name: 'Squat',          base: 100, reps: 5 },
    { name: 'Deadlift',       base: 120, reps: 3 },
    { name: 'Shoulder Press', base: 55,  reps: 8 },
  ];
  const weeks = [
    { weeksAgo: 10, mult: 0.65 },
    { weeksAgo: 8,  mult: 0.73 },
    { weeksAgo: 6,  mult: 0.82 },
    { weeksAgo: 4,  mult: 0.89 },
    { weeksAgo: 2,  mult: 0.95 },
    { weeksAgo: 0,  mult: 1.00 },
  ];
  const sets = [];
  weeks.forEach(({ weeksAgo, mult }) => {
    const date = new Date(now - weeksAgo * 7 * 86400000).toISOString();
    exercises.forEach(({ name, base, reps }) => {
      const w = Math.round(base * mult / 2.5) * 2.5;
      for (let s = 0; s < 3; s++) sets.push({ exercise: name, weight: w, reps, date });
    });
  });
  await saveSession(sets);
  return `📈 ${sets.length} sets sur 6 semaines avec progression claire. Va voir l'onglet Progress !`;
}

async function trollZach() {
  const shameful = [
    { exercise: 'Bench Press',    weight: 5,   reps: 1 },
    { exercise: 'Squat',          weight: 5,   reps: 1 },
    { exercise: 'Deadlift',       weight: 10,  reps: 1 },
    { exercise: 'Biceps Curl',    weight: 2.5, reps: 3 },
    { exercise: 'Pull-ups',       weight: 0,   reps: 1 },
    { exercise: 'Lateral Raises', weight: 2.5, reps: 2 },
    { exercise: 'Shoulder Press', weight: 5,   reps: 1 },
    { exercise: 'Leg Press',      weight: 10,  reps: 1 },
  ].map(s => ({ ...s, date: new Date().toISOString() }));
  await insertRawCloud(shameful, 'Zach');
  return '🤡 Upload complété. Zach vient de soulever 5 lbs au bench. Historiquement pathétique.';
}

async function resetSharedPlan() {
  await supabase.from('shared_plans').upsert({
    id: 'main', plan: {}, updated_by: 'reset', updated_at: new Date().toISOString(),
  });
  return '🗑️ Plan partagé réinitialisé. Repartez de zéro sur les deux téléphones.';
}

const FORTUNES = [
  '🔮 Tu vas PR aujourd\'hui. Les planètes sont alignées avec tes biceps.',
  '🔮 Quelqu\'un te regarde soulever. Impressionne-les ou rentre chez toi.',
  '🔮 Le miroir ment. Tu es encore plus impressionnant que ça.',
  '🔮 Skip leg day = mauvais karma pendant 7 générations. Tu as été prévenu.',
  '🔮 Un jour tu seras plus fort qu\'aujourd\'hui. Ce jour c\'est dans 45 minutes.',
  '🔮 Ta whey est périmée depuis 2026. L\'odeur c\'est normal, continue.',
  '🔮 Zach a mangé une poutine hier soir. C\'est ton moment.',
  '🔮 Le gars qui te regarde faire du squat est jaloux. Écrase-le.',
  '🔮 37.3% de chance de PR ce soir. Les 62.7% restants sont pour les faibles.',
  '🔮 Arrête de lire ta fortune et va t\'entraîner. Maintenant.',
  '🔮 Ton prochain PR arrive. Il attend que tu arrêtes de procrastiner.',
  '🔮 La douleur d\'aujourd\'hui est la force de demain. Ou juste de la douleur.',
];

const CAPTIONS = [
  '"No days off 🔥 #gains #grind #blessed #noedit (filtre Valencia)"',
  '"Mon seul rival c\'est celui d\'hier 💪 #fitness #lifestyle #growth"',
  '"Les excuses c\'est pour les gens qui skip leg day. #nodaysoff #hardwork"',
  '"Si c\'était facile tout le monde le ferait. Mais tout le monde skip. #elite"',
  '"Dormez pendant que je travaille 😤 #alphamindset #4am #hustle"',
  '"Mon pré-workout c\'est la douleur de ne pas être à mon niveau. 🧠💥"',
  '"Pump check obligatoire avant de conduire. Risque de distraction. ⚠️💪"',
  '"365 jours par an. Sauf le jour où j\'ai skip. On en parle pas. #consistency"',
];

const EXCUSES_ZACH = [
  'Il avait mal au poignet depuis 3 semaines.',
  'Il avait oublié ses écouteurs à la maison.',
  'Le banc était mouillé (de sueur à lui).',
  'Il avait pas assez dormi (10h c\'était pas assez).',
  'Il digérait encore sa dernière séance (de il y a 8 jours).',
  'La salle sentait bizarre ce jour-là.',
  'La gravité était particulièrement forte ce matin.',
  'Son miroir lui renvoyait des ondes négatives.',
];

const SAIYAN_LEVELS = [
  { level: 'Chiot de gym', color: '#888' },
  { level: 'Guerrier de Monday', color: '#aaa' },
  { level: 'Saiyaman niveau 0.5', color: '#f59e0b' },
  { level: 'Super Saiyan Bronze', color: '#d97706' },
  { level: 'Super Saiyan Silver', color: '#9ca3af' },
  { level: 'Super Saiyan Gold ✨', color: '#FFD700' },
  { level: 'Ultra Instinct 🌟', color: '#60a5fa' },
  { level: 'BEAST MODE ABSOLU 🔥', color: '#FF6B00' },
];

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
  const [devVisible,  setDevVisible]  = useState(false);
  const [devLog,      setDevLog]      = useState('');
  const [devExtra,    setDevExtra]    = useState('');
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
      setDevLog(''); setDevExtra('');
      setDevVisible(true);
      return;
    }
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
  }

  async function runDev(label, fn) {
    setDevLog('⏳ En cours…'); setDevExtra('');
    try {
      const result = await fn();
      Vibration.vibrate([0, 40, 60, 40]);
      setDevLog(result ?? `✅ ${label} done!`);
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

  const myWeekVol     = computeWeekVolume(myLogs);
  const rivalWeekVol  = computeWeekVolume(rivalLogs);
  const myStreak      = computeStreak(myLogs);
  const rivalStreak   = computeStreak(rivalLogs);
  const myLastDays    = daysSinceLastSession(myLogs);
  const rivalLastDays = daysSinceLastSession(rivalLogs);

  const sharedExercises = rival ? Object.keys(myBests).filter(ex => rivalBests[ex]) : [];

  let myWins = 0, rivalWins = 0;
  sharedExercises.forEach(ex => {
    const my = myBests[ex], rv = rivalBests[ex];
    if (est1RM(my.weight, my.reps) >= est1RM(rv.weight, rv.reps)) myWins++;
    else rivalWins++;
  });

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
                      {myWeekVol >= 1000
                        ? `${(myWeekVol / 1000).toFixed(1)}k`
                        : String(Math.round(myWeekVol))}
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
                      {rivalWeekVol >= 1000
                        ? `${(rivalWeekVol / 1000).toFixed(1)}k`
                        : String(Math.round(rivalWeekVol))}
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
                  </View>
                  <View style={styles.scoreMiddle}>
                    <Text style={styles.scoreVS}>VS</Text>
                    <Text style={styles.overallMsg}>{overallMsg}</Text>
                  </View>
                  <View style={styles.scoreCol}>
                    <Text style={styles.scoreName}>{rival.toUpperCase()}</Text>
                    <Text style={[styles.scoreNum, rivalWins > myWins && styles.scoreNumWin]}>{rivalWins}</Text>
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
                  <Text style={styles.sectionLabel}>COMPARATIF PAR EXERCICE</Text>
                  {sharedExercises.map(ex => {
                    const me = myBests[ex], rv = rivalBests[ex];
                    const my1RM = est1RM(me.weight, me.reps);
                    const rv1RM = est1RM(rv.weight, rv.reps);
                    const iWin  = my1RM >= rv1RM;
                    return (
                      <View key={ex} style={styles.compareCard}>
                        <Text style={styles.compareEx}>{ex}</Text>
                        <View style={styles.compareRow}>
                          <View style={[styles.compareBox, iWin && styles.compareBoxWin]}>
                            <Text style={styles.compareName}>{myName.toUpperCase()}</Text>
                            <Text style={styles.compareMain}>{me.weight} × {me.reps}</Text>
                            <Text style={styles.compare1RM}>{Math.round(my1RM)} est. 1RM</Text>
                            {iWin && <View style={styles.winChip}><Text style={styles.winChipText}>PLUS FORT</Text></View>}
                          </View>
                          <View style={[styles.compareBox, !iWin && styles.compareBoxWin]}>
                            <Text style={styles.compareName}>{rival.toUpperCase()}</Text>
                            <Text style={styles.compareMain}>{rv.weight} × {rv.reps}</Text>
                            <Text style={styles.compare1RM}>{Math.round(rv1RM)} est. 1RM</Text>
                            {!iWin && <View style={styles.winChip}><Text style={styles.winChipText}>PLUS FORT</Text></View>}
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
                        <Text style={styles.pendingVal}>Toi : {myBests[ex].weight} × {myBests[ex].reps}</Text>
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
                        <Text style={styles.pendingVal}>{rival} : {rivalBests[ex].weight} × {rivalBests[ex].reps}</Text>
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
            <View style={styles.devTitleRow}>
              <Text style={styles.devTitle}>🛠️ DEV PANEL</Text>
              <Text style={styles.devSubtitle}>zone secrète · accès interdit aux normies 🤫</Text>
            </View>

            {devLog   ? <Text style={styles.devLog}>{devLog}</Text>   : null}
            {devExtra ? <Text style={styles.devExtra}>{devExtra}</Text> : null}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={styles.devCat}>💪 ENTRAÎNEMENT</Text>

              <DevBtn color="#1a3a1a" icon="📅" label="Seed 3 semaines d'historique"
                sub="Peuple Progress + Duo avec de vraies données"
                onPress={() => runDev('Seed', seedFakeHistory)} />

              <DevBtn color="#0a2a1a" icon="📈" label="Test graphique de progression"
                sub="6 semaines avec montée claire — vérifie que le chart marche"
                onPress={() => runDev('Chart', testProgressChart)} />

              <DevBtn color="#3a1a00" icon="🐐" label="Devenir the GOAT"
                sub="405 bench · 900 squat · 1000 deadlift · légendaire"
                onPress={() => runDev('GOAT', becomeGoat, true)} />

              <DevBtn color="#1a001a" icon="🕵️" label="Zach est un fraud"
                sub="Bats chacun de ses lifts exactement par 1 lb"
                onPress={() => runDev('Fraud', zachIsAFraud)} />

              <DevBtn color="#2a0a2a" icon="🤡" label="Troll Zach dans le cloud"
                sub="Upload ses PRs : 5 lbs bench 1 rep. RIP Zach."
                onPress={() => runDev('Troll', trollZach, true)} />

              <DevBtn color="#001a3a" icon="💊" label="Calcule ton niveau Saiyan"
                sub="Évalue ton potentiel génétique objectivement"
                onPress={() => runDev('Saiyan', async () => {
                  const lvl = pick(SAIYAN_LEVELS);
                  setDevExtra(`Niveau : ${lvl.level}`);
                  return `🧬 Analyse génétique complète.\nRésultat : ${lvl.level}\nFiabilité : ${rand(87, 99)}% · Méthode : NASA + intuition`;
                })} />

              <Text style={styles.devCat}>🎭 SOCIAL & INUTILE</Text>


              <DevBtn color="#0a0a2a" icon="🔮" label="Fortune du jour"
                sub="La vérité sur ton prochain entraînement"
                onPress={() => runDev('Fortune', async () => pick(FORTUNES))} />

              <DevBtn color="#1a1a00" icon="🎵" label="Caption Instagram cringe"
                sub="Pour ton prochain post motivationnel #nodaysoff"
                onPress={() => runDev('Caption', async () => pick(CAPTIONS))} />

              <DevBtn color="#2a0020" icon="😅" label="Excuse de Zach du jour"
                sub="Pourquoi il a pas pu s'entraîner cette semaine"
                onPress={() => runDev('Excuse', async () => {
                  const ex = pick(EXCUSES_ZACH);
                  return `📋 Rapport officiel :\n"${ex}"\n\n— Service d'Investigation des Excuses de Gym`;
                })} />

              <Text style={styles.devCat}>📊 ANALYTICS ABSURDES</Text>

              <DevBtn color="#003a1a" icon="🍕" label="Pizzas brûlées cette semaine"
                sub="Ton vrai ROI calorique en pepperoni"
                onPress={() => runDev('Pizzas', async () => {
                  const n = rand(3, 47);
                  const recom = Math.ceil(n * 0.6);
                  return `🍕 Calories brûlées ≈ ${n} pizzas entières.\nRecommandation scientifique : mange-en ${recom} ce soir pour maintenir le déficit.`;
                })} />

              <DevBtn color="#1a0a00" icon="💸" label="ROI de ton abonnement salle"
                sub="T'as payé combien par séance ce mois ?"
                onPress={() => runDev('ROI', async () => {
                  const s = rand(6, 24);
                  const roi = (29.99 / s).toFixed(2);
                  const verdict = s > 15 ? '✅ Rentable.' : s > 8 ? '⚠️ Bof.' : '❌ Honteux.';
                  return `💸 ${s} séances ce mois = ${roi}$/séance.\n${verdict}\nZach : ${rand(1, 3)} séances = ${(29.99 / rand(1, 3)).toFixed(2)}$/séance. 💀`;
                })} />

              <DevBtn color="#00001a" icon="🧮" label="Calcule ta force absolue"
                sub="Ton total powerlifting estimé en kg"
                onPress={() => runDev('Force', async () => {
                  const total = rand(280, 950);
                  const percentile = rand(60, 99);
                  return `🏋️ Total estimé : ${total} kg\nTop ${100 - percentile}% mondial · ${percentile}e percentile\nZach est probablement top ${rand(1, 15)}% du bas.`;
                })} />

              <DevBtn color="#1a001a" icon="🎲" label="Programme de séance random absurde"
                sub="Un workout généré par l'IA (très bad IA)"
                onPress={() => runDev('Random', async () => {
                  const weird = [
                    `${rand(100, 999)} jumping jacks sans s'arrêter`,
                    `${rand(50, 200)} burpees en pensant à Zach`,
                    `Tenir un squat ${rand(5, 20)} minutes en fixant quelqu'un`,
                    `${rand(10, 50)} tours de salle en courant (pas en marchant)`,
                    `${rand(3, 8)} séries de "rien" pour le mental`,
                    `Regarder quelqu'un faire du leg press et juger`,
                    `${rand(20, 100)} pompes ou excuses (selon l'humeur)`,
                  ];
                  const selected = weird.sort(() => Math.random() - 0.5).slice(0, 4);
                  return `🎲 Programme du jour :\n${selected.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\nDurée estimée : ${rand(25, 90)} min`;
                })} />

              <Text style={styles.devCat}>⚙️ TECHNIQUE</Text>

              <DevBtn color="#002a2a" icon="🔄" label="Force reload tous les phones"
                sub="Recharge l'app sur tous les appareils connectés"
                onPress={() => runDev('Reload', async () => {
                  await fireReloadAll();
                  return '🔄 Signal envoyé. L\'app redémarre sur tous les téléphones.';
                })} />

              <Text style={styles.devCat}>☢️ DANGER ZONE</Text>

              <DevBtn color="#1a1000" icon="🗑️" label="Reset plan partagé"
                sub="Remet le plan partagé à zéro sur les deux téléphones"
                onPress={() => runDev('ResetPlan', resetSharedPlan)} />

              <DevBtn color="#3a0000" icon="☢️" label="Nuclear Reset — TOUT effacer"
                sub="Supprime TOI + ZACH du cloud. Irréversible à jamais."
                onPress={() => runDev('Nuclear', () => new Promise(resolve => {
                  Alert.alert(
                    '☢️ Nuclear Reset',
                    'Supprimer TOUT l\'historique — toi ET Zach — pour toujours ?\n\nIl n\'y a pas de retour en arrière.',
                    [
                      { text: 'Annuler', style: 'cancel', onPress: () => resolve('Annulé. Sage décision.') },
                      { text: '💣 TOUT DÉTRUIRE', style: 'destructive', onPress: async () => {
                        await clearAllUsersLogs();
                        resolve('☢️ Effacé. Toi + Zach = zéro. Repartez de zéro. Bonne chance.');
                      }},
                    ],
                    { cancelable: true, onDismiss: () => resolve('Annulé.') }
                  );
                }))} />

            </ScrollView>

            <TouchableOpacity style={styles.devClose} onPress={() => setDevVisible(false)}>
              <Text style={styles.devCloseTxt}>FERMER LE PANNEAU SECRET</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DevBtn({ color, icon, label, sub, onPress }) {
  return (
    <TouchableOpacity style={[styles.devBtn, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.devBtnIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.devBtnLabel}>{label}</Text>
        <Text style={styles.devBtnSub}>{sub}</Text>
      </View>
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
  devOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'flex-end' },
  devPanel:    { backgroundColor: '#0d0d0d', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#222', maxHeight: '93%' },
  devTitleRow: { marginBottom: 12 },
  devTitle:    { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 2 },
  devSubtitle: { fontSize: 11, color: '#484848', letterSpacing: 0.5 },
  devLog:      { fontSize: 13, color: '#4ade80', marginBottom: 8, fontWeight: '600', lineHeight: 20, backgroundColor: '#0a1a0a', borderRadius: 10, padding: 10 },
  devExtra:    { fontSize: 14, color: '#a78bfa', marginBottom: 10, fontWeight: '700', fontStyle: 'italic' },
  devCat:      { fontSize: 10, fontWeight: '800', color: '#444', letterSpacing: 2, marginTop: 14, marginBottom: 8, textTransform: 'uppercase' },
  devBtn:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 13, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: '#1a1a1a' },
  devBtnIcon:  { fontSize: 26, width: 32, textAlign: 'center' },
  devBtnLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  devBtnSub:   { color: '#555', fontSize: 11 },
  devClose:    { marginTop: 12, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#222', backgroundColor: '#111' },
  devCloseTxt: { color: '#444', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
});
