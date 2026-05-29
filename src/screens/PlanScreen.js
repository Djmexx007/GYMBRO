import React, { useState, useCallback, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
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

  const savedRef    = useRef(null);
  const userNameRef = useRef('');

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
        const cloudPlan = await getSharedPlan();
        setSyncing(false);
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
              const cloudPlan = await getSharedPlan();
              setSyncing(false);
              if (cloudPlan) {
                const copy = deepCopy(cloudPlan);
                savedRef.current = JSON.stringify(copy);
                savePlanByType(copy.type, copy);
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
          <Text style={styles.title}>Plan</Text>
          <Text style={styles.subtitle}>
            {plan.name} · {isSync ? '🤝 sync' : '🔒 solo'} · sauvegarde auto
          </Text>
        </View>
        {isSync && (
          <TouchableOpacity style={styles.copyBtn} onPress={copyToSolo} activeOpacity={0.8}>
            <Ionicons name="copy-outline" size={15} color={colors.textMuted} />
            <Text style={styles.copyBtnTxt}>Copier en Solo</Text>
          </TouchableOpacity>
        )}
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
                  {dayData.exercises.length === 0 ? (
                    <Text style={styles.emptyDay}>Aucun exercice — repos ou ajoutes-en</Text>
                  ) : (
                    dayData.exercises.map((ex, exIdx) => (
                      <View key={exIdx} style={styles.exRow}>
                        <View style={styles.exNum}><Text style={styles.exNumTxt}>{exIdx + 1}</Text></View>
                        <Text style={styles.exName}>{ex}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
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
  exName:   { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, paddingBottom: 4 },
  addExTxt: { color: colors.primary, fontSize: 14, fontWeight: '600' },

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
