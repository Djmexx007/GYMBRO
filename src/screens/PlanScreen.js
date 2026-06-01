import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  SectionList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { supabase } from '../lib/supabase';
import {
  getActivePlan, saveActivePlan,
  getSoloPlanByType, saveSoloPlanByType,
  getExerciseLibrary, saveExerciseLibrary,
  getPlanMode, setPlanMode as savePlanMode,
  getSharedPlan, saveSharedPlan,
  getUserName,
  getFavorites, toggleFavorite,
} from '../storage/storage';
import { PPL_PLAN, ARNOLD_PLAN, CUSTOM_PLAN } from '../data/defaultPlans';
import { HIGH_LEVEL_GROUPS, MUSCLE_GROUPS, analyzeDayMuscles } from '../data/muscleGroups';
import WorkoutGeneratorModal from './WorkoutGeneratorModal';
import { exportPlanToExcel } from '../lib/exportPlan';

const DAYS_SHORT = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const DAYS_FULL  = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const TODAY      = new Date().getDay();

const PLAN_TYPES = [
  { key: 'ppl',    label: 'Push\nPull\nLegs', icon: '💪' },
  { key: 'arnold', label: 'Arnold\nSplit',     icon: '🏆' },
  { key: 'custom', label: 'Custom\nSplit',     icon: '✏️' },
];

const TEMPLATES = { ppl: PPL_PLAN, arnold: ARNOLD_PLAN, custom: CUSTOM_PLAN };

function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)); }

// Status biomécanique d'un muscle selon sa charge pondérée
function muscleStatus(load) {
  if (load === 0)   return { label: 'Absent',        color: '#3A3A3A', dot: '#333' };
  if (load < 1.0)   return { label: 'Sous-entraîné', color: colors.warning, dot: colors.warning };
  if (load < 2.0)   return { label: 'Optimal',       color: colors.success, dot: colors.success };
  return              { label: 'Surentraîné',          color: colors.danger,  dot: colors.danger  };
}

// ── MuscleAnalysisPanel supprimé — remplacé par MuscleDetailModal interactif
function _unused_MuscleAnalysisPanel({ analysis, onGroupPress, onSubMusclePress }) {
  const targeted = Object.entries(analysis).filter(([, g]) => g.isTargeted);
  const bonus    = Object.entries(analysis).filter(([, g]) => !g.isTargeted && g.hasAnyHit);

  if (targeted.length === 0 && bonus.length === 0) return null;

  return (
    <View style={apStyles.panel}>
      <Text style={apStyles.sep}>ANALYSE MUSCULAIRE</Text>

      {targeted.map(([name, g]) => {
        const visibleSubs = g.subDetails.filter(s => s.status !== 'none');
        const icon   = GROUP_STATUS_ICON[g.groupStatus];
        const iColor = GROUP_STATUS_COLOR[g.groupStatus];
        return (
          <View key={name} style={apStyles.group}>
            <TouchableOpacity
              style={apStyles.groupHdr}
              onPress={() => onGroupPress?.(name)}
              activeOpacity={0.7}
            >
              <Text style={apStyles.groupName}>{g.icon} {name}</Text>
              <View style={apStyles.groupHdrRight}>
                {icon && <Text style={[apStyles.groupStatus, { color: iColor }]}>{icon}</Text>}
                <Ionicons name="chevron-forward" size={13} color="#484848" style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
            <View style={apStyles.subRow}>
              {g.subDetails.map(s => {
                if (s.status === 'none') return null;
                const cs = STATUS_STYLE[s.status];
                return (
                  <TouchableOpacity
                    key={s.name}
                    style={[apStyles.subChip, { backgroundColor: cs.bg, borderColor: cs.border }]}
                    onPress={() => onSubMusclePress?.(s.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={[apStyles.subChipTxt, { color: cs.text }]}>
                      {s.shortName}{s.load > 0 ? ` ×${s.load % 1 === 0 ? s.load : s.load.toFixed(1)}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {visibleSubs.length === 0 && g.subDetails.map(s => (
                <TouchableOpacity
                  key={s.name}
                  style={[apStyles.subChip, { backgroundColor: STATUS_STYLE.under.bg, borderColor: STATUS_STYLE.under.border }]}
                  onPress={() => onSubMusclePress?.(s.name)}
                  activeOpacity={0.7}
                >
                  <Text style={[apStyles.subChipTxt, { color: STATUS_STYLE.under.text }]}>{s.shortName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {bonus.length > 0 && (
        <>
          <Text style={[apStyles.sep, { marginTop: 6 }]}>AUSSI SOLLICITÉ</Text>
          <View style={apStyles.bonusRow}>
            {bonus.map(([name, g]) => {
              const total = g.subDetails.reduce((acc, s) => acc + s.load, 0);
              return (
                <TouchableOpacity
                  key={name}
                  style={apStyles.bonusChip}
                  onPress={() => onGroupPress?.(name)}
                  activeOpacity={0.7}
                >
                  <Text style={apStyles.bonusChipTxt}>{g.icon} {name} ×{total % 1 === 0 ? total : total.toFixed(1)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const apStyles = StyleSheet.create({
  panel:      { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#242424' },
  sep:        { fontSize: 10, fontWeight: '800', color: '#484848', letterSpacing: 1.2, marginBottom: 10 },
  group:      { marginBottom: 12 },
  groupHdr:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  groupHdrRight:{ flexDirection: 'row', alignItems: 'center' },
  groupName:  { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  groupStatus:{ fontSize: 13, fontWeight: '900' },
  subRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subChip:    { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  subChipTxt: { fontSize: 10, fontWeight: '700' },
  bonusRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bonusChip:  { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#1A1A1A' },
  bonusChipTxt:{ fontSize: 10, fontWeight: '600', color: '#484848' },
});

export default function PlanScreen() {
  const [plan,        setPlan]        = useState(null);
  const [library,     setLibrary]     = useState([]);
  const [favorites,   setFavorites]   = useState([]);
  const [planMode,    setPlanMode]    = useState('solo');
  const [syncing,     setSyncing]     = useState(false);
  const [expandedDay, setExpandedDay] = useState(TODAY);
  const [addModal,    setAddModal]    = useState(false);
  const [addingToDay, setAddingToDay] = useState(null);
  const [search,      setSearch]      = useState('');
  const [editingDay,  setEditingDay]  = useState(null);
  const [editLabel,   setEditLabel]   = useState('');

  const [clipboard,     setClipboard]     = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [muscleModal,   setMuscleModal]   = useState(null); // { groupName, dayIdx }
  const [subMuscleView, setSubMuscleView] = useState(null); // sous-muscle sélectionné
  const [expandedGroup, setExpandedGroup] = useState(null); // "dayIdx::groupName"

  // Charge actuelle du sous-muscle dans la séance
  const subMuscleLoad = useMemo(() => {
    if (!subMuscleView || !muscleModal) return 0;
    const dayExs = plan?.days[muscleModal.dayIdx]?.exercises ?? [];
    return muscleCounts(dayExs).get(subMuscleView) ?? 0;
  }, [subMuscleView, muscleModal, plan]);

  // Exercices du plan qui travaillent ce sous-muscle (avec niveau de contribution)
  const dayExerciseContributions = useMemo(() => {
    if (!subMuscleView || !muscleModal) return [];
    const dayExs = plan?.days[muscleModal.dayIdx]?.exercises ?? [];
    return dayExs.map(ex => {
      const d = MUSCLE_GROUPS[ex];
      if (!d) return null;
      if ((d.primary ?? []).includes(subMuscleView))        return { name: ex, level: 'PRIMARY',   c: 1.00 };
      if ((d.secondary ?? []).includes(subMuscleView))      return { name: ex, level: 'SEC',        c: 0.50 };
      if ((d.stabilisateur ?? []).includes(subMuscleView))  return { name: ex, level: 'STAB',       c: 0.25 };
      return null;
    }).filter(Boolean);
  }, [subMuscleView, muscleModal, plan]);

  // Exercices recommandés (muscle en primary, pas encore dans le plan)
  const recommendedExercises = useMemo(() => {
    if (!subMuscleView || !muscleModal) return [];
    const dayExs = new Set(plan?.days[muscleModal.dayIdx]?.exercises ?? []);
    return Object.entries(MUSCLE_GROUPS)
      .filter(([ex, d]) => (d.primary ?? []).includes(subMuscleView) && !dayExs.has(ex))
      .map(([ex]) => ex)
      .slice(0, 8);
  }, [subMuscleView, muscleModal, plan]);

  // kept for backward compat
  const muscleModalGroupData = null;
  const exercisesForSubMuscle = [];

  const savedRef       = useRef(null);
  const userNameRef    = useRef('');
  const pollRef        = useRef(null);
  const lastSyncAt     = useRef(null);
  const titleTapCount  = useRef(0);
  const titleTapTimer  = useRef(null);

  // Polling sync 15s
  useEffect(() => {
    if (planMode !== 'sync') { if (pollRef.current) clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.from('shared_plans').select('plan, updated_at, updated_by').eq('id', 'main').single();
        if (!data?.plan || !data.updated_at) return;
        if (data.updated_at === lastSyncAt.current) return;
        if (data.updated_by === userNameRef.current) return;
        lastSyncAt.current = data.updated_at;
        setPlan(data.plan);
      } catch {}
    }, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [planMode]);

  function copyDay(dayIdx) { setClipboard([...(plan.days[dayIdx]?.exercises ?? [])]); }
  function pasteDay(dayIdx) {
    if (!clipboard) return;
    const next = deepCopy(plan);
    next.days[dayIdx].exercises = [...clipboard];
    setPlan(next);
  }

  function toggleTarget(dayIdx, groupName) {
    const next = deepCopy(plan);
    const day  = next.days[dayIdx];
    if (!day.targetMuscles) day.targetMuscles = [];
    const idx = day.targetMuscles.indexOf(groupName);
    if (idx === -1) day.targetMuscles.push(groupName);
    else day.targetMuscles.splice(idx, 1);
    setPlan(next);
  }

  function handleExport() {
    if (!plan) return;
    exportPlanToExcel({
      planName: plan.name,
      planType: plan.type,
      userName: userNameRef.current,
      mode:     planMode,
      days:     plan.days,
    });
  }

  useFocusEffect(useCallback(() => {
    async function load() {
      const [p, lib, mode, name, favs] = await Promise.all([
        getActivePlan(), getExerciseLibrary(), getPlanMode(), getUserName(), getFavorites(),
      ]);
      userNameRef.current = name ?? '';
      setPlanMode(mode);
      setFavorites(favs);

      let activePlan;
      if (mode === 'sync') {
        setSyncing(true);
        const cloudResult = await getSharedPlan();
        setSyncing(false);
        const cloudPlan = cloudResult?.plan ?? null;
        // Sync ne se rabat jamais sur le plan Solo — template par défaut si cloud vide
        activePlan = cloudPlan ?? deepCopy(PPL_PLAN);
      } else {
        // Solo : clés séparées, jamais touchées par le mode Sync
        const baseplan = p ?? PPL_PLAN;
        const savedForType = await getSoloPlanByType(baseplan.type);
        activePlan = savedForType ?? deepCopy(TEMPLATES[baseplan.type] ?? PPL_PLAN);
      }

      const copy = deepCopy(activePlan);
      savedRef.current = JSON.stringify(copy);
      setPlan(copy);
      setLibrary(lib);
    }
    load();
  }, []));

  // Auto-save — Solo et Sync écrivent dans des stockages complètement séparés
  useEffect(() => {
    if (!plan) return;
    const current = JSON.stringify(plan);
    if (savedRef.current === current) return;
    savedRef.current = current;
    if (planMode === 'sync') {
      // Sync → cloud uniquement, ne touche jamais au stockage Solo
      saveSharedPlan(plan, userNameRef.current);
    } else {
      // Solo → stockage Solo uniquement, ne touche jamais au cloud
      saveSoloPlanByType(plan.type, plan);
      saveActivePlan(plan); // garde une trace du dernier type sélectionné
    }
  }, [plan, planMode]);

  // ── mode switch ────────────────────────────────────────────────────────────

  async function switchMode(newMode) {
    if (newMode === planMode) return;

    if (newMode === 'sync') {
      Alert.alert(
        'Activer Plan Sync ? 🤝',
        'Ton plan sera partagé avec ton coéquipier. Le plan du cloud (s\'il existe) sera chargé.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Activer Sync', onPress: async () => {
              await savePlanMode('sync');
              setPlanMode('sync');
              setSyncing(true);
              const cloudResult = await getSharedPlan();
              setSyncing(false);
              const cloudPlan = cloudResult?.plan ?? null;
              if (cloudPlan) {
                const copy = deepCopy(cloudPlan);
                savedRef.current = JSON.stringify(copy);
                setPlan(copy);
              } else if (plan) {
                saveSharedPlan(plan, userNameRef.current);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Passer en Plan Solo ? 🔒',
        'Ton plan sera uniquement sur ce téléphone. Le plan partagé reste intact dans le cloud.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Solo', onPress: async () => {
              await savePlanMode('solo');
              setPlanMode('solo');
              // Charger le plan Solo — complètement indépendant du plan Sync
              const p = await getActivePlan();
              const type = p?.type ?? 'ppl';
              const soloSaved = await getSoloPlanByType(type);
              const soloPlan = soloSaved ?? deepCopy(TEMPLATES[type] ?? PPL_PLAN);
              const copy = deepCopy(soloPlan);
              savedRef.current = JSON.stringify(copy);
              setPlan(copy);
            },
          },
        ]
      );
    }
  }

  // ── copy plan ──────────────────────────────────────────────────────────────

  function copyToSolo() {
    if (!plan) return;
    Alert.alert(
      'Copier en Solo 🔒',
      `Crée une copie privée de « ${plan.name} » sur ce téléphone uniquement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Copier', onPress: async () => {
            const copy = deepCopy(plan);
            copy.name = plan.name + ' (Copie)';
            await savePlanMode('solo');
            setPlanMode('solo');
            savedRef.current = null; // force save
            setPlan(copy);
          },
        },
      ]
    );
  }

  // ── plan type ──────────────────────────────────────────────────────────────

  function selectType(newType) {
    if (plan?.type === newType) return;
    Alert.alert(
      'Changer de plan ?',
      'Tes modifications sont sauvegardées — tu pourras revenir sans perdre tes changements.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Changer', onPress: async () => {
            if (planMode === 'sync') {
              // En Sync : ne touche pas au stockage Solo, change juste le type affiché localement
              setPlan(deepCopy(TEMPLATES[newType]));
            } else {
              // En Solo : sauvegarde le type actuel, charge le type cible
              if (plan) saveSoloPlanByType(plan.type, plan);
              const saved = await getSoloPlanByType(newType);
              setPlan(saved ?? deepCopy(TEMPLATES[newType]));
            }
          },
        },
      ]
    );
  }

  // ── exercises ──────────────────────────────────────────────────────────────

  function removeExercise(dayIdx, exIdx) {
    const next = deepCopy(plan);
    next.days[dayIdx].exercises.splice(exIdx, 1);
    setPlan(next);
  }

  function openAdd(dayIdx) {
    setAddingToDay(dayIdx);
    setSearch('');
    setAddModal(true);
  }

  function addToDay(exercise) {
    const next = deepCopy(plan);
    if (!next.days[addingToDay].exercises.includes(exercise)) {
      next.days[addingToDay].exercises.push(exercise);
      setPlan(next);
    }
    setAddModal(false);
  }

  async function createAndAdd(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    let updatedLib = library;
    if (!library.includes(trimmed)) {
      updatedLib = [...library, trimmed];
      setLibrary(updatedLib);
      await saveExerciseLibrary(updatedLib);
    }
    addToDay(trimmed);
  }

  async function handleToggleFavorite(ex) {
    const next = await toggleFavorite(ex);
    setFavorites(next);
  }

  // ── accordion + muscle explorer ───────────────────────────────────────────

  function handleExpandDay(dayIdx) {
    if (editingDay === dayIdx) return;
    const newExpanded = expandedDay === dayIdx ? null : dayIdx;
    setExpandedDay(newExpanded);
    setExpandedGroup(null);
    if (newExpanded === null) return;
    // Auto-sélectionner tous les groupes si la journée n'en a aucun de ciblé
    const day = plan?.days[newExpanded];
    if (day && (!day.targetMuscles || day.targetMuscles.length === 0)) {
      const next = deepCopy(plan);
      next.days[newExpanded].targetMuscles = Object.keys(HIGH_LEVEL_GROUPS);
      setPlan(next);
    }
  }

  function openMuscleDetail(groupName, dayIdx) {
    setSubMuscleView(null);
    setMuscleModal({ groupName, dayIdx });
  }

  function closeMuscleModal() {
    setMuscleModal(null);
    setSubMuscleView(null);
  }

  function openSubMuscleDetail(muscleName, dayIdx) {
    const groupName = Object.entries(HIGH_LEVEL_GROUPS)
      .find(([, g]) => g.subMuscles.includes(muscleName))?.[0];
    if (!groupName) return;
    setMuscleModal({ groupName, dayIdx });
    setSubMuscleView(muscleName);
  }

  function addFromMuscleModal(exercise) {
    if (!muscleModal) return;
    const next = deepCopy(plan);
    const day  = next.days[muscleModal.dayIdx];
    if (!day.exercises.includes(exercise)) {
      day.exercises.push(exercise);
      setPlan(next);
    }
  }

  // ── day label editing ──────────────────────────────────────────────────────

  function startEditLabel(dayIdx) {
    setEditLabel(plan.days[dayIdx].label || DAYS_FULL[dayIdx]);
    setEditingDay(dayIdx);
  }

  function commitLabel(dayIdx) {
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== plan.days[dayIdx].label) {
      const next = deepCopy(plan);
      next.days[dayIdx].label = trimmed;
      setPlan(next);
    }
    setEditingDay(null);
  }

  // ── exercise picker data ───────────────────────────────────────────────────

  const currentDayExercises = addingToDay !== null ? (plan?.days[addingToDay]?.exercises ?? []) : [];

  const filtered = library.filter(ex =>
    ex.toLowerCase().includes(search.toLowerCase()) &&
    !currentDayExercises.includes(ex)
  );

  const favMatches  = filtered.filter(ex => favorites.includes(ex));
  const restMatches = filtered.filter(ex => !favorites.includes(ex));

  const sections = [
    ...(favMatches.length > 0  ? [{ title: '⭐ FAVORIS', data: favMatches }]  : []),
    ...(restMatches.length > 0 ? [{ title: 'BIBLIOTHÈQUE', data: restMatches }] : []),
  ];

  const showCreate = search.trim().length > 0 &&
    !library.some(ex => ex.toLowerCase() === search.trim().toLowerCase()) &&
    !currentDayExercises.includes(search.trim());

  if (!plan) return null;

  const isSync = planMode === 'sync';

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => {
            titleTapCount.current += 1;
            if (titleTapTimer.current) clearTimeout(titleTapTimer.current);
            if (titleTapCount.current >= 3) { titleTapCount.current = 0; Vibration.vibrate(80); setShowGenerator(true); }
            titleTapTimer.current = setTimeout(() => { titleTapCount.current = 0; }, 800);
          }}>
            <Text style={styles.title}>Plan</Text>
          </TouchableOpacity>
          <Text style={styles.subtitle}>
            {plan.name} · {isSync ? '🤝 sync' : '🔒 solo'} · sauvegarde auto
          </Text>
        </View>
        <View style={styles.headerActions}>
          {isSync && (
            <TouchableOpacity style={styles.copyBtn} onPress={copyToSolo} activeOpacity={0.8}>
              <Ionicons name="copy-outline" size={15} color={colors.textMuted} />
              <Text style={styles.copyBtnTxt}>Copier en Solo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.copyBtn} onPress={handleExport} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={15} color={colors.textMuted} />
            <Text style={styles.copyBtnTxt}>Exporter</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Solo / Sync toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, !isSync && styles.modeBtnSolo]}
            onPress={() => switchMode('solo')}
            activeOpacity={0.75}
          >
            <Ionicons name="lock-closed-outline" size={15} color={!isSync ? '#000' : colors.textMuted} />
            <Text style={[styles.modeBtnTxt, !isSync && styles.modeBtnTxtOn]}>Plan Solo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, isSync && styles.modeBtnSync]}
            onPress={() => switchMode('sync')}
            activeOpacity={0.75}
          >
            {syncing
              ? <ActivityIndicator size="small" color={isSync ? '#000' : '#00b4d8'} />
              : <Ionicons name="cloud-outline" size={15} color={isSync ? '#000' : '#00b4d8'} />
            }
            <Text style={[styles.modeBtnTxt, isSync && styles.modeBtnTxtOn]}>Plan Sync</Text>
          </TouchableOpacity>
        </View>

        {isSync && (
          <View style={styles.syncBanner}>
            <Ionicons name="people-outline" size={13} color={colors.primary} />
            <Text style={styles.syncBannerTxt}>
              Plan partagé — chaque modif se synchronise instantanément avec ton coéquipier.
            </Text>
          </View>
        )}

        {/* Split type selector */}
        <View style={styles.typeRow}>
          {PLAN_TYPES.map(pt => {
            const active = plan.type === pt.key;
            return (
              <TouchableOpacity
                key={pt.key}
                style={[styles.typeCard, active && styles.typeCardActive]}
                onPress={() => selectType(pt.key)}
                activeOpacity={0.75}
              >
                <Text style={styles.typeIcon}>{pt.icon}</Text>
                <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{pt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Day cards */}
        {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
          const dayData  = plan.days[dayIdx];
          const expanded = expandedDay === dayIdx;
          const isToday  = dayIdx === TODAY;
          const count    = dayData.exercises.length;
          const isEditingThis = editingDay === dayIdx;

          const targets  = dayData.targetMuscles ?? [];
          const analysis = expanded ? analyzeDayMuscles(dayData.exercises, targets) : null;

          return (
            <View key={dayIdx} style={[styles.dayCard, isToday && styles.dayCardToday]}>
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={() => { if (!isEditingThis) handleExpandDay(dayIdx); }}
                activeOpacity={0.75}
              >
                <View style={styles.dayHeaderLeft}>
                  <View style={[styles.dayBadge, isToday && styles.dayBadgeToday]}>
                    <Text style={[styles.dayBadgeTxt, isToday && styles.dayBadgeTxtToday]}>
                      {DAYS_SHORT[dayIdx]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {isEditingThis ? (
                      <TextInput
                        value={editLabel}
                        onChangeText={setEditLabel}
                        onBlur={() => commitLabel(dayIdx)}
                        onSubmitEditing={() => commitLabel(dayIdx)}
                        autoFocus
                        returnKeyType="done"
                        style={styles.dayLabelInput}
                        selectTextOnFocus
                      />
                    ) : (
                      <View style={styles.dayLabelRow}>
                        <Text style={styles.dayLabel}>{dayData.label || DAYS_FULL[dayIdx]}</Text>
                        {expanded && (
                          <TouchableOpacity
                            onPress={() => startEditLabel(dayIdx)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="pencil-outline" size={13} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    {!expanded && !isEditingThis && (
                      <Text style={styles.dayCount}>
                        {count > 0 ? `${count} exercice${count > 1 ? 's' : ''}` : 'Repos'}
                      </Text>
                    )}
                  </View>
                </View>
                {!isEditingThis && (
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>

              {expanded && !isEditingThis && (
                <View style={styles.exList}>

                  {/* ── Muscles ciblés — layout horizontal ── */}
                  <View style={styles.hMuscle}>
                    <Text style={styles.hMuscleTitle}>MUSCLES CIBLÉS</Text>

                    {/* Rangée 1 : groupes */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6, paddingBottom: 10 }}
                    >
                      {Object.entries(HIGH_LEVEL_GROUPS).map(([groupName, g]) => {
                        const on     = targets.includes(groupName);
                        const expKey = `${dayIdx}::${groupName}`;
                        const isOpen = expandedGroup === expKey;
                        return (
                          <TouchableOpacity
                            key={groupName}
                            style={[styles.hGroupChip, on && styles.hGroupChipOn, isOpen && styles.hGroupChipOpen]}
                            onPress={() => {
                              setExpandedGroup(isOpen ? null : expKey);
                              if (!on) toggleTarget(dayIdx, groupName);
                            }}
                            onLongPress={() => toggleTarget(dayIdx, groupName)}
                            delayLongPress={400}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.hGroupName, on && styles.hGroupNameOn]}>
                              {groupName}
                            </Text>
                            {on && <View style={styles.hGroupDot} />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Rangée 2 : sous-muscles du groupe ouvert */}
                    {expandedGroup?.startsWith(`${dayIdx}::`) && (() => {
                      const gName = expandedGroup.slice(expandedGroup.indexOf('::') + 2);
                      const gData = HIGH_LEVEL_GROUPS[gName];
                      const on    = targets.includes(gName);
                      if (!gData) return null;
                      return (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
                        >
                          {gData.subMuscles.map(sm => (
                            <TouchableOpacity
                              key={sm}
                              style={[styles.hSubChip, on && styles.hSubChipOn]}
                              onPress={() => openSubMuscleDetail(sm, dayIdx)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.hSubTxt, on && styles.hSubTxtOn]}>{sm}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      );
                    })()}
                  </View>

                  {/* ── Liste d'exercices ── */}
                  {dayData.exercises.length === 0 ? (
                    <Text style={styles.emptyDay}>Aucun exercice — repos ou ajoutes-en</Text>
                  ) : (
                    dayData.exercises.map((ex, exIdx) => (
                      <View key={exIdx} style={styles.exRow}>
                        <View style={styles.exNum}><Text style={styles.exNumTxt}>{exIdx + 1}</Text></View>
                        <Text style={[styles.exName, { flex: 1 }]}>{ex}</Text>
                        {favorites.includes(ex) && (
                          <Ionicons name="star" size={13} color={colors.primary} />
                        )}
                        <TouchableOpacity
                          onPress={() => removeExercise(dayIdx, exIdx)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}

                  <TouchableOpacity style={styles.addExBtn} onPress={() => openAdd(dayIdx)}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.addExTxt}>Ajouter un exercice</Text>
                  </TouchableOpacity>

                  {/* Analyse désormais accessible via les pastilles sous-muscles */}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Add Exercise Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setAddModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Ajouter un exercice</Text>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher ou créer…"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="done"
            />

            <SectionList
              sections={sections}
              keyExtractor={item => item}
              style={{ maxHeight: 340 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <Text style={styles.sectionHeader}>{section.title}</Text>
              )}
              renderItem={({ item }) => (
                <View style={styles.libRow}>
                  <TouchableOpacity onPress={() => addToDay(item)} style={{ flex: 1 }}>
                    <Text style={styles.libEx}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleToggleFavorite(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ marginRight: 8 }}
                  >
                    <Ionicons
                      name={favorites.includes(item) ? 'star' : 'star-outline'}
                      size={18}
                      color={favorites.includes(item) ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => addToDay(item)}>
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                search.trim().length === 0 ? null : (
                  <Text style={styles.noResults}>Aucun résultat pour « {search} »</Text>
                )
              }
              ListFooterComponent={
                showCreate ? (
                  <TouchableOpacity style={styles.createRow} onPress={() => createAndAdd(search)}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.createTxt}>Créer « {search.trim()} »</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <WorkoutGeneratorModal visible={showGenerator} onClose={() => setShowGenerator(false)} />

      {/* ── Muscle Detail Modal ───────────────────────────────────────────── */}
      <Modal
        visible={!!muscleModal && !!subMuscleView}
        transparent
        animationType="slide"
        onRequestClose={closeMuscleModal}
      >
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={closeMuscleModal} />
        <View style={styles.detailSheet}>
          <View style={styles.detailHandle} />

          {/* Header */}
          <View style={styles.detailHdr}>
            <Text style={styles.detailTitle} numberOfLines={1}>{subMuscleView ?? ''}</Text>
            <TouchableOpacity onPress={closeMuscleModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* ── Volume + statut ── */}
            {(() => {
              const st   = muscleStatus(subMuscleLoad);
              const pct  = Math.min(subMuscleLoad / 2.0, 1);
              const fmt  = n => n % 1 === 0 ? String(n) : n.toFixed(1);
              return (
                <View style={styles.volumeCard}>
                  <View style={styles.volumeRow}>
                    <Text style={styles.volumeValue}>{fmt(subMuscleLoad)}</Text>
                    <View style={[styles.statusBadge, { borderColor: st.dot }]}>
                      <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
                      <Text style={[styles.statusLabel, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                  <View style={styles.gaugeTrack}>
                    <View style={[styles.gaugeFill, { width: `${pct * 100}%`, backgroundColor: st.dot }]} />
                  </View>
                  <View style={styles.gaugeLabels}>
                    <Text style={styles.gaugeHint}>Absent</Text>
                    <Text style={styles.gaugeHint}>Optimal  1.0 – 2.0</Text>
                    <Text style={styles.gaugeHint}>Surcharge</Text>
                  </View>
                </View>
              );
            })()}

            {/* ── Exercices dans la séance ── */}
            {dayExerciseContributions.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>DANS CETTE SÉANCE</Text>
                {dayExerciseContributions.map(item => (
                  <View key={item.name} style={styles.detailExRow}>
                    <Text style={styles.detailExName}>{item.name}</Text>
                    <View style={styles.detailContrib}>
                      <Text style={[
                        styles.detailLevel,
                        item.level === 'PRIMARY' && { color: colors.primary },
                      ]}>
                        {item.level}
                      </Text>
                      <Text style={styles.detailC}>+{item.c}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── Exercices recommandés ── */}
            {recommendedExercises.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>EXERCICES RECOMMANDÉS</Text>
                {recommendedExercises.map(ex => (
                  <View key={ex} style={styles.detailExRow}>
                    <Text style={styles.detailExName}>{ex}</Text>
                    <TouchableOpacity
                      onPress={() => addFromMuscleModal(ex)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={styles.addBtn}>
                        <Ionicons name="add" size={14} color="#000" />
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  headerActions: { alignItems: 'flex-end', gap: 6, marginTop: 8 },
  title:       { fontSize: 34, fontWeight: '900', color: colors.text, marginBottom: 2, letterSpacing: -0.5 },
  subtitle:    { fontSize: 13, color: colors.primary, fontWeight: '600' },
  copyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  copyBtnTxt:  { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  scroll:      { flex: 1 },
  scrollContent: { padding: 16 },

  // Mode toggle
  modeRow:        { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeBtnSolo:    { backgroundColor: colors.primary, borderColor: colors.primary },
  modeBtnSync:    { backgroundColor: '#00b4d8', borderColor: '#00b4d8' },
  modeBtnTxt:     { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  modeBtnTxtOn:   { color: '#000' },

  syncBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#001a24', borderRadius: 10, borderWidth: 1, borderColor: '#00b4d8', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  syncBannerTxt: { flex: 1, color: colors.primary, fontSize: 12, fontWeight: '500', lineHeight: 17 },

  // Type selector
  typeRow:      { flexDirection: 'row', gap: 8, marginBottom: 20 },
  typeCard:     { flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  typeCardActive: { borderColor: colors.primary, backgroundColor: '#140E00' },
  typeIcon:     { fontSize: 24, marginBottom: 6 },
  typeLabel:    { fontSize: 10, fontWeight: '800', color: colors.textMuted, textAlign: 'center', letterSpacing: 0.3 },
  typeLabelActive: { color: colors.primary },

  // Day card
  dayCard:      { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8, overflow: 'hidden' },
  dayCardToday: { borderColor: colors.primary },
  dayHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  dayHeaderLeft:{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dayBadge:     { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  dayBadgeToday:{ backgroundColor: colors.primary },
  dayBadgeTxt:  { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },
  dayBadgeTxtToday: { color: '#000' },
  dayLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayLabel:     { fontSize: 16, fontWeight: '700', color: colors.text },
  dayLabelInput:{ fontSize: 16, fontWeight: '700', color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 2, minWidth: 100 },
  dayCount:     { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Exercise list
  exList:   { paddingHorizontal: 14, paddingBottom: 14 },
  emptyDay: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 10, fontStyle: 'italic' },
  exRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  exNum:    { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  exNumTxt: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  exName:   { fontSize: 15, fontWeight: '600', color: colors.text },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, paddingBottom: 4 },
  addExTxt: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  // Muscles ciblés horizontal
  hMuscle:          { marginTop: 16, borderTopWidth: 1, borderTopColor: '#1C1C1C', paddingTop: 14 },
  hMuscleTitle:     { fontSize: 10, fontWeight: '700', color: '#3A3A3A', letterSpacing: 1.4, marginBottom: 10 },
  hGroupChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#1E1E1E', flexDirection: 'row', alignItems: 'center', gap: 5 },
  hGroupChipOn:     { borderColor: colors.primary + '55', backgroundColor: colors.primaryGlow },
  hGroupChipOpen:   { borderColor: colors.primary },
  hGroupName:       { fontSize: 13, fontWeight: '600', color: '#3A3A3A' },
  hGroupNameOn:     { color: colors.primary },
  hGroupDot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  hSubChip:         { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#1E1E1E' },
  hSubChipOn:       { borderColor: colors.primary + '55', backgroundColor: colors.primaryGlow },
  hSubTxt:          { fontSize: 12, fontWeight: '500', color: '#444' },
  hSubTxtOn:        { color: colors.primary },

  // Muscle Detail Modal
  detailSheet:      { backgroundColor: '#0D0D0D', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingBottom: 44, borderTopWidth: 1, borderColor: '#1A1A1A', maxHeight: '85%', flex: 0, paddingTop: 12 },
  detailHandle:     { width: 32, height: 3, backgroundColor: '#2A2A2A', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  detailHdr:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  detailTitle:      { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5, flex: 1 },
  volumeCard:       { marginBottom: 26 },
  volumeRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  volumeValue:      { fontSize: 42, fontWeight: '900', color: colors.text, letterSpacing: -2 },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  statusDot:        { width: 6, height: 6, borderRadius: 3 },
  statusLabel:      { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  gaugeTrack:       { height: 3, backgroundColor: '#1A1A1A', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  gaugeFill:        { height: 3, borderRadius: 2 },
  gaugeLabels:      { flexDirection: 'row', justifyContent: 'space-between' },
  gaugeHint:        { fontSize: 10, color: '#2A2A2A', fontWeight: '500' },
  detailSection:    { marginBottom: 22 },
  detailSectionTitle:{ fontSize: 10, fontWeight: '700', color: '#3A3A3A', letterSpacing: 1.4, marginBottom: 10 },
  detailExRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#111' },
  detailExName:     { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  detailContrib:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLevel:      { fontSize: 11, fontWeight: '700', color: '#3A3A3A', letterSpacing: 0.5 },
  detailC:          { fontSize: 12, fontWeight: '700', color: '#3A3A3A', width: 30, textAlign: 'right' },
  addBtn:           { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalBg:    { flex: 1 },
  modalSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: '#333', maxHeight: '78%' },
  modalHandle:{ width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
  searchInput:{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, marginBottom: 10 },
  sectionHeader: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.2, paddingVertical: 8 },
  libRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  libEx:      { fontSize: 15, color: colors.text, fontWeight: '500' },
  noResults:  { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', paddingVertical: 16, textAlign: 'center' },
  createRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13 },
  createTxt:  { fontSize: 14, color: colors.primary, fontWeight: '600' },
});
