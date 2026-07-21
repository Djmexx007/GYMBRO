// Tracker GPS en direct (style Strava) — marche / course / vélo.
// Fonctionne dans Expo Go : suivi de position en avant-plan uniquement, donc
// l'écran est gardé allumé (expo-keep-awake) et on avertit que fermer l'app
// interrompt le suivi. À la fin, la séance est sauvée via saveCardioSession et
// alimente automatiquement les stats Cardio existantes (et le cloud).

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { colors } from '../theme';
import { saveCardioSession } from '../storage/storage';
import { deriveSessionMetrics } from '../lib/cardioMetrics';
import { formatDuration, formatPace, paceFromSpeed } from '../lib/cardioUnits';

const LIVE_TYPES = [
  { key: 'walking', label: 'Marche', icon: 'footsteps' },
  { key: 'running', label: 'Course', icon: 'walk' },
  { key: 'cycling', label: 'Vélo',   icon: 'bicycle' },
];

// Distance en mètres entre deux coordonnées (haversine)
function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function LiveCardioScreen({ navigation }) {
  useKeepAwake(); // l'écran ne doit pas s'éteindre pendant le suivi

  const [phase, setPhase]         = useState('setup'); // 'setup' | 'tracking' | 'done'
  const [type, setType]           = useState('walking');
  const [starting, setStarting]   = useState(false);
  const [paused, setPaused]       = useState(false);
  const [elapsedSec, setElapsed]  = useState(0);   // temps en mouvement (pause exclue)
  const [distanceM, setDistanceM] = useState(0);
  const [curSpeed, setCurSpeed]   = useState(null); // km/h
  const [maxSpeed, setMaxSpeed]   = useState(0);
  const [accuracy, setAccuracy]   = useState(null);
  const [savedSession, setSaved]  = useState(null);

  const watchRef     = useRef(null);
  const timerRef     = useRef(null);
  const pausedRef    = useRef(false);
  const lastPointRef = useRef(null);

  useEffect(() => {
    return () => { // nettoyage à la fermeture de l'écran
      if (watchRef.current) watchRef.current.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startTracking() {
    setStarting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'GPS requis',
          'Autorise la localisation pour suivre ta vitesse et ta distance en direct.'
        );
        return;
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 3,
        },
        loc => {
          const { latitude, longitude, speed, accuracy: acc } = loc.coords;
          setAccuracy(acc ?? null);
          if (pausedRef.current) { lastPointRef.current = null; return; }
          if (acc != null && acc > 35) return; // point GPS trop imprécis — ignoré

          const kmh = speed != null && speed >= 0 ? speed * 3.6 : null;
          if (kmh != null) {
            setCurSpeed(kmh);
            setMaxSpeed(m => Math.max(m, kmh));
          }

          const prev = lastPointRef.current;
          if (prev) {
            const d  = haversineM(prev.latitude, prev.longitude, latitude, longitude);
            const dt = (loc.timestamp - prev.timestamp) / 1000;
            // filtre anti-téléportation : > 15 m/s soutenu = artefact GPS
            if (d >= 2 && (dt <= 0 || d / dt < 15)) setDistanceM(x => x + d);
          }
          lastPointRef.current = { latitude, longitude, timestamp: loc.timestamp };
        }
      );

      timerRef.current = setInterval(() => {
        if (!pausedRef.current) setElapsed(e => e + 1);
      }, 1000);

      setPhase('tracking');
    } catch (e) {
      Alert.alert('GPS indisponible', e?.message ?? 'Impossible de démarrer le suivi.');
    } finally {
      setStarting(false);
    }
  }

  function togglePause() {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    if (pausedRef.current) setCurSpeed(null);
  }

  function stopSensors() {
    if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function finishActivity() {
    if (elapsedSec < 15 || distanceM < 20) {
      Alert.alert(
        'Activité trop courte',
        'Presque rien à enregistrer. Abandonner cette activité ?',
        [
          { text: 'Continuer', style: 'cancel' },
          { text: 'Abandonner', style: 'destructive', onPress: () => { stopSensors(); navigation.goBack(); } },
        ]
      );
      return;
    }
    stopSensors();
    const km = distanceM / 1000;
    const session = deriveSessionMetrics({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      date: new Date().toISOString(),
      durationSec: elapsedSec,
      distanceKm: Math.round(km * 100) / 100,
      avgSpeedKmh: null, // dérivée de durée+distance par deriveSessionMetrics
      maxSpeedKmh: maxSpeed > 0 ? Math.round(maxSpeed * 10) / 10 : null,
      avgPaceMinKm: null,
      avgInclinePct: null,
      maxInclinePct: null,
      calories: null,
      avgHr: null,
      maxHr: null,
      notes: 'GPS',
    });
    await saveCardioSession(session);
    setSaved(session);
    setPhase('done');
  }

  function confirmQuit() {
    if (phase !== 'tracking') { navigation.goBack(); return; }
    Alert.alert('Arrêter le suivi ?', 'L\'activité en cours ne sera pas enregistrée.', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => { stopSensors(); navigation.goBack(); } },
    ]);
  }

  const km       = distanceM / 1000;
  const avgSpeed = elapsedSec > 0 && km > 0 ? km / (elapsedSec / 3600) : null;
  const livePace = curSpeed && curSpeed > 0.5 ? paceFromSpeed(curSpeed) : null;
  const gpsOk    = accuracy != null && accuracy <= 25;

  // ── Écran résumé ───────────────────────────────────────────────────────────
  if (phase === 'done' && savedSession) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.doneWrap}>
          <Text style={st.doneEmoji}>🏁</Text>
          <Text style={st.doneTitle}>ACTIVITÉ ENREGISTRÉE</Text>
          <Text style={st.doneSub}>{LIVE_TYPES.find(t => t.key === savedSession.type)?.label ?? savedSession.type}</Text>

          <View style={st.statGrid}>
            <View style={st.statCell}>
              <Text style={st.statVal}>{formatDuration(savedSession.durationSec)}</Text>
              <Text style={st.statKey}>DURÉE</Text>
            </View>
            <View style={st.statCell}>
              <Text style={st.statVal}>{savedSession.distanceKm?.toFixed(2)} km</Text>
              <Text style={st.statKey}>DISTANCE</Text>
            </View>
            <View style={st.statCell}>
              <Text style={st.statVal}>{savedSession.avgSpeedKmh ? `${savedSession.avgSpeedKmh.toFixed(1)}` : '—'}</Text>
              <Text style={st.statKey}>KM/H MOY.</Text>
            </View>
            <View style={st.statCell}>
              <Text style={st.statVal}>{savedSession.avgPaceMinKm ? formatPace(savedSession.avgPaceMinKm) : '—'}</Text>
              <Text style={st.statKey}>ALLURE</Text>
            </View>
          </View>

          <TouchableOpacity style={st.mainBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={st.mainBtnTxt}>TERMINÉ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Écran setup ────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.topBar}>
          <TouchableOpacity onPress={confirmQuit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={26} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={st.topTitle}>Activité GPS</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={st.setupWrap}>
          <Text style={st.setupLbl}>TYPE D'ACTIVITÉ</Text>
          <View style={st.typeRow}>
            {LIVE_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[st.typeCard, type === t.key && st.typeCardOn]}
                onPress={() => setType(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={t.icon} size={28} color={type === t.key ? '#000' : colors.textMuted} />
                <Text style={[st.typeTxt, type === t.key && st.typeTxtOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={st.hintCard}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={st.hintTxt}>
              Garde l'app ouverte et l'écran allumé pendant l'activité — le GPS s'arrête si l'app est fermée.
              L'écran restera allumé automatiquement.
            </Text>
          </View>

          <TouchableOpacity style={st.mainBtn} onPress={startTracking} disabled={starting} activeOpacity={0.85}>
            {starting
              ? <ActivityIndicator color="#000" />
              : (
                <>
                  <Ionicons name="play" size={22} color="#000" style={{ marginRight: 8 }} />
                  <Text style={st.mainBtnTxt}>DÉMARRER</Text>
                </>
              )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Écran tracking ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={st.container}>
      <View style={st.topBar}>
        <TouchableOpacity onPress={confirmQuit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={[st.gpsChip, { borderColor: gpsOk ? colors.success : colors.warning }]}>
          <View style={[st.gpsDot, { backgroundColor: gpsOk ? colors.success : colors.warning }]} />
          <Text style={[st.gpsTxt, { color: gpsOk ? colors.success : colors.warning }]}>
            {accuracy == null ? 'GPS…' : gpsOk ? 'GPS OK' : `GPS ±${Math.round(accuracy)} m`}
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <View style={st.liveWrap}>
        <Text style={st.liveType}>
          {LIVE_TYPES.find(t => t.key === type)?.label.toUpperCase()}{paused ? ' · EN PAUSE' : ''}
        </Text>
        <Text style={[st.liveTimer, paused && { color: colors.textMuted }]}>
          {formatDuration(elapsedSec)}
        </Text>

        <View style={st.liveGrid}>
          <View style={st.liveCell}>
            <Text style={st.liveVal}>{km.toFixed(2)}</Text>
            <Text style={st.liveKey}>KM</Text>
          </View>
          <View style={st.liveCell}>
            <Text style={st.liveVal}>{curSpeed != null ? curSpeed.toFixed(1) : '—'}</Text>
            <Text style={st.liveKey}>KM/H</Text>
          </View>
          <View style={st.liveCell}>
            <Text style={st.liveVal}>{avgSpeed ? avgSpeed.toFixed(1) : '—'}</Text>
            <Text style={st.liveKey}>KM/H MOY.</Text>
          </View>
          <View style={st.liveCell}>
            <Text style={st.liveVal}>{livePace ? formatPace(livePace).replace(' /km', '') : '—'}</Text>
            <Text style={st.liveKey}>ALLURE /KM</Text>
          </View>
        </View>
      </View>

      <View style={st.controls}>
        <TouchableOpacity style={st.pauseBtn} onPress={togglePause} activeOpacity={0.85}>
          <Ionicons name={paused ? 'play' : 'pause'} size={26} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={st.finishBtn} onPress={finishActivity} activeOpacity={0.85}>
          <Ionicons name="flag" size={20} color="#000" style={{ marginRight: 8 }} />
          <Text style={st.finishTxt}>TERMINER</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: colors.text },

  // Setup
  setupWrap: { flex: 1, padding: 22, justifyContent: 'center' },
  setupLbl: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5, marginBottom: 14 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  typeCard: {
    flex: 1, alignItems: 'center', gap: 8, paddingVertical: 22,
    backgroundColor: colors.surface, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border,
  },
  typeCardOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeTxt: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  typeTxtOn: { color: '#000' },
  hintCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 26,
  },
  hintTxt: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  mainBtn: {
    flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 20, height: 66,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 9,
  },
  mainBtnTxt: { color: '#000', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },

  // Live
  liveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  liveType: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 2, marginBottom: 8 },
  liveTimer: {
    fontSize: 76, fontWeight: '900', color: colors.text, letterSpacing: -2,
    fontVariant: ['tabular-nums'], marginBottom: 26,
  },
  liveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  liveCell: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 20,
    paddingVertical: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  liveVal: { fontSize: 30, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  liveKey: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginTop: 4 },

  gpsChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5,
  },
  gpsDot: { width: 7, height: 7, borderRadius: 4 },
  gpsTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  controls: { flexDirection: 'row', gap: 12, padding: 22, paddingBottom: 26 },
  pauseBtn: {
    width: 66, height: 66, borderRadius: 20, backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  finishBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  finishTxt: { color: '#000', fontSize: 17, fontWeight: '900', letterSpacing: 1.5 },

  // Done
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  doneEmoji: { fontSize: 64, marginBottom: 12 },
  doneTitle: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: 1, marginBottom: 4 },
  doneSub: { fontSize: 14, color: colors.textSecondary, marginBottom: 28 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', marginBottom: 28 },
  statCell: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 18,
    paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  statVal: { fontSize: 22, fontWeight: '900', color: colors.primary },
  statKey: { fontSize: 9, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginTop: 4 },
});
