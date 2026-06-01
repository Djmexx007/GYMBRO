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

const STATUS_STYLE = {
  over:    { bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.3)',    text: '#EF4444' },
  good:    { bg: 'rgba(34,197,94,0.12)',    border: 'rgba(34,197,94,0.3)',    text: '#22C55E' },
  under:   { bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.3)',   text: '#F59E0B' },
  bonus:   { bg: 'rgba(148,163,184,0.08)',  border: 'rgba(148,163,184,0.15)', text: '#64748B' },
};

const GROUP_STATUS_ICON = { good: '✓', over: '!', partial: '~' };
const GROUP_STATUS_COLOR = { good: '#22C55E', over: '#EF4444', partial: '#F59E0B' };

function MuscleAnalysisPanel({ analysis, onGroupPress, onSubMusclePress }) {
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

  // Analyse du groupe sélectionné dans le modal (recalculée à chaque changement de plan)
  const muscleModalGroupData = useMemo(() => {
    if (!muscleModal || !plan) return null;
    const dayExs = plan.days[muscleModal.dayIdx]?.exercises ?? [];
    const analysis = analyzeDayMuscles(dayExs, [muscleModal.groupName]);
    return analysis[muscleModal.groupName] ?? null;
  }, [muscleModal, plan]);

  // Exercices primaires et secondaires pour le sous-muscle sélectionné
  const exercisesForSubMuscle = useMemo(() => {
    if (!subMuscleView) return [];
    const primary = [], secondary = [];
    Object.entries(MUSCLE_GROUPS).forEach(([ex, d]) => {
      if ((d.primary ?? []).includes(subMuscleView))        primary.push(ex);
      else if ((d.secondary ?? []).includes(subMuscleView)) secondary.push(ex);
    });
    const sections = [];
    if (primary.length)   sections.push({ title: `PRIMAIRE — ${primary.length} exercices`,    data: primary });
    if (secondary.length) sections.push({ title: `SECONDAIRE — ${secondary.length} exercices`, data: secondary });
    return sections;
  }, [subMuscleView]);

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

  // ── muscle explorer ────────────────────────────────────────────────────────

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
                onPress={() => { if (!isEditingThis) setExpandedDay(expanded ? null : dayIdx); }}
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

                  {/* ── Groupes musculaires + sous-muscles ── */}
                  <View style={styles.targetSection}>
                    <Text style={styles.targetLabel}>GROUPES MUSCULAIRES</Text>
                    {Object.entries(HIGH_LEVEL_GROUPS).map(([groupName, g]) => {
                      const on = targets.includes(groupName);
                      return (
                        <View key={groupName} style={styles.muscleGroupBlock}>
                          {/* En-tête du groupe — toggle cible */}
                          <TouchableOpacity
                            style={[styles.muscleGroupHdr, on && { borderColor: g.color + '66' }]}
                            onPress={() => toggleTarget(dayIdx, groupName)}
                            activeOpacity={0.75}
                          >
                            <View style={[styles.muscleGroupDot, { backgroundColor: on ? g.color : '#333' }]} />
                            <Text style={styles.muscleGroupIcon}>{g.icon}</Text>
                            <Text style={[styles.muscleGroupName, on && { color: g.color }]}>{groupName}</Text>
                            <Ionicons
                              name={on ? 'checkmark-circle' : 'ellipse-outline'}
                              size={15}
                              color={on ? g.color : '#444'}
                              style={{ marginLeft: 'auto' }}
                            />
                          </TouchableOpacity>
                          {/* Pastilles sous-muscles — clic direct → exercices */}
                          <View style={styles.muscleSubRow}>
                            {g.subMuscles.map(sm => (
                              <TouchableOpacity
                                key={sm}
                                style={[styles.muscleSubChip, { borderColor: g.color + '44' }]}
                                onPress={() => openSubMuscleDetail(sm, dayIdx)}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.muscleSubChipTxt, { color: g.color }]}>{sm}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      );
                    })}
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

                  {/* ── Panneau analyse musculaire ── */}
                  {analysis && (targets.length > 0 || dayData.exercises.length > 0) && (
                    <MuscleAnalysisPanel
                      analysis={analysis}
                      onGroupPress={(name)   => openMuscleDetail(name, dayIdx)}
                      onSubMusclePress={(m)  => openSubMuscleDetail(m, dayIdx)}
                    />
                  )}
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

      {/* ── Muscle Explorer Modal ─────────────────────────────────────────── */}
      <Modal
        visible={!!muscleModal}
        transparent
        animationType="slide"
        onRequestClose={closeMuscleModal}
      >
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={closeMuscleModal} />
        <View style={styles.muscleSheet}>
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.muscleSheetHdr}>
            {subMuscleView ? (
              <TouchableOpacity onPress={() => setSubMuscleView(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 22 }} />
            )}
            <Text style={styles.muscleSheetTitle} numberOfLines={1}>
              {subMuscleView
                ? subMuscleView
                : muscleModal
                  ? `${HIGH_LEVEL_GROUPS[muscleModal.groupName]?.icon}  ${muscleModal.groupName}`
                  : ''}
            </Text>
            <TouchableOpacity onPress={closeMuscleModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {!subMuscleView ? (
            /* ── Vue 1 : sous-muscles du groupe ── */
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.muscleSheetHint}>
                Appuyer sur un sous-muscle pour voir tous ses exercices
              </Text>
              {muscleModal && (muscleModalGroupData?.subDetails ?? []).map(s => {
                const sc = STATUS_STYLE[s.status] ?? STATUS_STYLE.bonus;
                const label = { over: 'Surcharge', good: 'Équilibré', under: 'Insuffisant', none: 'Non travaillé', bonus: 'Actif' }[s.status] ?? '';
                const fmtLoad = n => n % 1 === 0 ? String(n) : n.toFixed(1);
                return (
                  <TouchableOpacity
                    key={s.name}
                    style={styles.subMuscleRow}
                    onPress={() => setSubMuscleView(s.name)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.subMuscleBar, { backgroundColor: sc.border }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subMuscleName}>{s.name}</Text>
                      <Text style={[styles.subMuscleStatusTxt, { color: sc.text }]}>
                        {label}{s.load > 0 ? `  ×${fmtLoad(s.load)}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            /* ── Vue 2 : exercices pour le sous-muscle ── */
            <>
              <Text style={styles.muscleSheetHint}>
                Appuyer sur + pour ajouter à la séance du jour
              </Text>
              <SectionList
                sections={exercisesForSubMuscle}
                keyExtractor={item => item}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                keyboardShouldPersistTaps="handled"
                renderSectionHeader={({ section }) => (
                  <Text style={styles.muscleExSectionHdr}>{section.title}</Text>
                )}
                renderItem={({ item }) => {
                  const inDay = muscleModal
                    ? (plan?.days[muscleModal.dayIdx]?.exercises ?? []).includes(item)
                    : false;
                  return (
                    <View style={styles.muscleExRow}>
                      <Text style={[styles.muscleExName, inDay && styles.muscleExNameAdded]}>
                        {item}
                      </Text>
                      {inDay ? (
                        <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                      ) : (
                        <TouchableOpacity
                          onPress={() => addFromMuscleModal(item)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="add-circle" size={22} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.noResults}>Aucun exercice trouvé</Text>
                }
              />
            </>
          )}
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

  // Groupes musculaires
  targetSection:     { marginBottom: 14 },
  targetLabel:       { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.2, marginBottom: 10 },
  muscleGroupBlock:  { marginBottom: 10 },
  muscleGroupHdr:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: colors.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 6 },
  muscleGroupDot:    { width: 6, height: 6, borderRadius: 3 },
  muscleGroupIcon:   { fontSize: 14 },
  muscleGroupName:   { fontSize: 13, fontWeight: '700', color: colors.textMuted, flex: 1 },
  muscleSubRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 4 },
  muscleSubChip:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, backgroundColor: 'transparent' },
  muscleSubChipTxt:  { fontSize: 11, fontWeight: '600' },

  // Muscle Explorer Modal
  muscleSheet:        { backgroundColor: '#181818', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: 44, borderTopWidth: 1, borderColor: '#2A2A2A', maxHeight: '82%', flex: 0, paddingTop: 12 },
  muscleSheetHdr:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  muscleSheetTitle:   { flex: 1, fontSize: 19, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  muscleSheetHint:    { fontSize: 11, color: '#444', fontStyle: 'italic', marginBottom: 12, marginTop: 2 },
  subMuscleRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  subMuscleBar:       { width: 4, height: 44, borderRadius: 2 },
  subMuscleName:      { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
  subMuscleStatusTxt: { fontSize: 12, fontWeight: '500' },
  muscleExSectionHdr: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.2, paddingTop: 16, paddingBottom: 8 },
  muscleExRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#1E1E1E', gap: 10 },
  muscleExName:       { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  muscleExNameAdded:  { color: '#22C55E' },

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
