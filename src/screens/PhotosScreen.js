import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  Image, TextInput, ScrollView, Alert, Dimensions,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getPhotos, savePhoto, deletePhoto } from '../storage/photoStorage';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;

const COLORS = {
  bg:              '#080808',
  surface:         '#111111',
  surfaceElevated: '#1A1A1A',
  border:          '#242424',
  primary:         '#FF6B00',
  text:            '#FFFFFF',
  textSecondary:   '#999999',
  textMuted:       '#484848',
  success:         '#22C55E',
  danger:          '#EF4444',
};

const PRESET_TAGS = ['Bulk', 'Cut', 'Maintenance', 'Lean Bulk', 'Force', 'Cardio'];

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtLong(iso) {
  return new Date(iso).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}
function fmtShort(iso) {
  return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
}
function daysBetween(a, b) {
  return Math.round(Math.abs(new Date(b) - new Date(a)) / 86400000);
}
function groupByMonth(photos) {
  const g = {};
  photos.forEach(p => {
    const k = p.date.slice(0, 7);
    if (!g[k]) g[k] = [];
    g[k].push(p);
  });
  return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
}

// ── sub-components ────────────────────────────────────────────────────────────

function TagChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tagOption, active && styles.tagOptionOn]}
      onPress={onPress}
    >
      <Text style={[styles.tagOptionTxt, active && styles.tagOptionTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

function BaPicker({ label, photo, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.baPicker, photo && styles.baPickerFilled]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {photo ? (
        <>
          <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={styles.baDateBadge}>
            <Text style={styles.baDateTxt}>{fmtShort(photo.date)}</Text>
          </View>
        </>
      ) : (
        <View style={styles.baEmpty}>
          <Ionicons name="image-outline" size={36} color={COLORS.textMuted} />
          <Text style={styles.baLabel}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function PhotosScreen() {
  const [photos,     setPhotos]     = useState([]);
  const [tab,        setTab]        = useState('gallery'); // 'gallery'|'compare'|'timeline'
  const [filterTag,  setFilterTag]  = useState(null);

  // viewer
  const [viewerOn,   setViewerOn]   = useState(false);
  const [viewerIdx,  setViewerIdx]  = useState(0);
  const viewerRef = useRef(null);

  // add modal
  const [sourceOn,   setSourceOn]   = useState(false);
  const [addOn,      setAddOn]      = useState(false);
  const [pendingUri, setPendingUri] = useState(null);
  const [addNote,    setAddNote]    = useState('');
  const [addTags,    setAddTags]    = useState([]);
  const [addWeight,  setAddWeight]  = useState('');
  const [customTag,  setCustomTag]  = useState('');

  // compare
  const [beforePh,   setBeforePh]   = useState(null);
  const [afterPh,    setAfterPh]    = useState(null);
  const [pickingFor, setPickingFor] = useState(null); // 'before'|'after'

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setPhotos(await getPhotos());
  }

  // ── camera / library ───────────────────────────────────────────────────────

  async function pickCamera() {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status === 'denied' && !perm.canAskAgain) {
        Alert.alert('Permission refusée', 'Va dans les Réglages › Applications › Gym Duo Tracker pour activer la caméra.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [3, 4] });
      if (!res.canceled) openAdd(res.assets[0].uri);
    } catch {
      Alert.alert('Caméra indisponible', 'La caméra n\'est pas accessible ici. Utilise la galerie à la place.');
    }
  }

  async function pickLibrary() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Accès Photos refusé', 'Va dans Réglages › Expo Go › Photos et choisis "Toutes les photos".');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsMultipleSelection: true,
      });
      if (!res.canceled) {
        if (res.assets.length === 1) {
          // Single: open crop then add modal
          openAdd(res.assets[0].uri);
        } else {
          // Multiple: save all directly
          for (const asset of res.assets) {
            await savePhoto(asset.uri, { note: '', tags: [], weight: null });
          }
          load();
        }
      }
    } catch (e) {
      Alert.alert('Erreur galerie', e?.message ?? 'Impossible d\'ouvrir la galerie.');
    }
  }

  function openAdd(uri) {
    setPendingUri(uri); setAddNote(''); setAddTags([]); setAddWeight(''); setCustomTag('');
    setAddOn(true);
  }

  async function confirmAdd() {
    if (!pendingUri) return;
    const tags = customTag.trim() ? [...addTags, customTag.trim()] : addTags;
    await savePhoto(pendingUri, { note: addNote.trim(), tags, weight: addWeight ? parseFloat(addWeight) : null });
    setAddOn(false); setPendingUri(null);
    load();
  }

  // ── delete ─────────────────────────────────────────────────────────────────

  function confirmDelete(photo) {
    Alert.alert('Supprimer la photo ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await deletePhoto(photo.id);
        setViewerOn(false);
        load();
      }},
    ]);
  }

  // ── viewer ─────────────────────────────────────────────────────────────────

  const viewerPhotos = tab === 'gallery'
    ? (filterTag ? photos.filter(p => p.tags?.includes(filterTag)) : photos)
    : photos;

  function openViewer(idx) { setViewerIdx(idx); setViewerOn(true); }

  // ── derived ────────────────────────────────────────────────────────────────

  const filtered = filterTag ? photos.filter(p => p.tags?.includes(filterTag)) : photos;
  const allTags  = [...new Set(photos.flatMap(p => p.tags ?? []))];

  // ── gallery ────────────────────────────────────────────────────────────────

  function Gallery() {
    if (filtered.length === 0) return (
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="camera-outline" size={52} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyTitle}>
          {photos.length === 0 ? 'Aucune photo' : 'Aucun résultat'}
        </Text>
        <Text style={styles.emptyTxt}>
          {photos.length === 0
            ? 'Prends ta première photo de progression\npour suivre ta transformation.'
            : 'Aucune photo ne correspond à ce filtre.\nEssaies-en un autre.'}
        </Text>
        {photos.length === 0 && (
          <TouchableOpacity style={styles.emptyCta} onPress={() => setSourceOn(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.emptyCtaTxt}>Ajouter une photo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
    return (
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const idx = filtered.indexOf(item);
          return (
            <TouchableOpacity style={styles.photoCard} onPress={() => openViewer(idx)} activeOpacity={0.88}>
              <Image source={{ uri: item.uri }} style={styles.photoThumb} resizeMode="cover" />
              {/* Date overlay bottom */}
              <View style={styles.photoOverlay}>
                <Text style={styles.photoDate}>{fmtShort(item.date)}</Text>
                {item.tags?.length > 0 && (
                  <Text style={styles.photoTagTxt} numberOfLines={1}>{item.tags[0]}</Text>
                )}
              </View>
              {/* Weight chip top-right */}
              {item.weight ? (
                <View style={styles.wChip}>
                  <Text style={styles.wChipTxt}>{item.weight} lbs</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    );
  }

  // ── timeline ───────────────────────────────────────────────────────────────

  function Timeline() {
    if (photos.length === 0) return (
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="time-outline" size={52} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyTitle}>Frise vide</Text>
        <Text style={styles.emptyTxt}>Ta frise chronologique apparaîtra ici\naprès ta première photo.</Text>
        <TouchableOpacity style={styles.emptyCta} onPress={() => setSourceOn(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.emptyCtaTxt}>Ajouter une photo</Text>
        </TouchableOpacity>
      </View>
    );
    const groups = groupByMonth(photos);
    return (
      <ScrollView contentContainerStyle={styles.tlContent} showsVerticalScrollIndicator={false}>
        {groups.map(([key, gPhotos]) => {
          const label = new Date(key + '-01').toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
          return (
            <View key={key}>
              <View style={styles.monthRow}>
                <View style={styles.monthLine} />
                <Text style={styles.monthLbl}>{label.toUpperCase()}</Text>
                <View style={styles.monthLine} />
              </View>
              {gPhotos.map(photo => {
                const idx = photos.indexOf(photo);
                return (
                  <TouchableOpacity key={photo.id} style={styles.tlCard} onPress={() => openViewer(idx)} activeOpacity={0.85}>
                    <Image source={{ uri: photo.uri }} style={styles.tlImg} resizeMode="cover" />
                    <View style={styles.tlInfo}>
                      <Text style={styles.tlDate}>{fmtLong(photo.date)}</Text>
                      {photo.note ? <Text style={styles.tlNote}>{photo.note}</Text> : null}
                      {photo.weight ? <Text style={styles.tlWeight}>{photo.weight} lbs</Text> : null}
                      {photo.tags?.length > 0 && (
                        <View style={styles.tlTagRow}>
                          {photo.tags.map(t => (
                            <View key={t} style={styles.tlTag}><Text style={styles.tlTagTxt}>{t}</Text></View>
                          ))}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    );
  }

  // ── compare ────────────────────────────────────────────────────────────────

  function Compare() {
    const diff  = beforePh && afterPh ? daysBetween(beforePh.date, afterPh.date) : null;
    const wDiff = beforePh?.weight && afterPh?.weight ? (afterPh.weight - beforePh.weight) : null;
    return (
      <ScrollView contentContainerStyle={styles.cmpContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.cmpHint}>Sélectionne deux photos pour les comparer côte à côte.</Text>
        <View style={styles.baRow}>
          <BaPicker label="AVANT" photo={beforePh} onPress={() => setPickingFor('before')} />
          <View style={styles.baDivider} />
          <BaPicker label="APRÈS" photo={afterPh}  onPress={() => setPickingFor('after')} />
        </View>
        {beforePh && afterPh && (
          <View style={styles.diffCard}>
            <View style={styles.diffRow}>
              <View style={styles.diffCol}>
                <Text style={styles.diffLbl}>AVANT</Text>
                <Text style={styles.diffDate}>{fmtLong(beforePh.date)}</Text>
                {beforePh.weight ? <Text style={styles.diffW}>{beforePh.weight} lbs</Text> : null}
              </View>
              <View style={styles.diffMid}>
                <Ionicons name="arrow-forward" size={22} color={COLORS.primary} />
                <Text style={styles.diffDays}>{diff} jours</Text>
              </View>
              <View style={styles.diffCol}>
                <Text style={styles.diffLbl}>APRÈS</Text>
                <Text style={styles.diffDate}>{fmtLong(afterPh.date)}</Text>
                {afterPh.weight ? <Text style={styles.diffW}>{afterPh.weight} lbs</Text> : null}
              </View>
            </View>
            {wDiff !== null && (
              <View style={styles.wDiffSection}>
                <Text style={[styles.wDiffVal, { color: wDiff >= 0 ? COLORS.success : COLORS.danger }]}>
                  {wDiff >= 0 ? '+' : ''}{wDiff.toFixed(1)} lbs
                </Text>
                <Text style={styles.wDiffSub}>variation de poids</Text>
              </View>
            )}
          </View>
        )}
        {(!beforePh || !afterPh) && (
          <View style={styles.cmpEmptyHint}>
            <Ionicons name="git-compare-outline" size={40} color={COLORS.textMuted} style={{ marginBottom: 10 }} />
            <Text style={styles.cmpEmptyTxt}>
              Touche l'un des cadres ci-dessus pour choisir une photo.
            </Text>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    );
  }

  // ── modals ─────────────────────────────────────────────────────────────────

  // Full-screen viewer
  const ViewerModal = () => {
    const photo = viewerPhotos[viewerIdx];
    if (!photo) return null;
    return (
      <Modal visible={viewerOn} transparent={false} animationType="fade" statusBarTranslucent>
        <View style={styles.viewerBg}>
          <SafeAreaView edges={['top']} style={styles.viewerTop}>
            <TouchableOpacity style={styles.viewerBtn} onPress={() => setViewerOn(false)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.viewerCount}>{viewerIdx + 1} / {viewerPhotos.length}</Text>
            <TouchableOpacity style={styles.viewerBtn} onPress={() => confirmDelete(photo)}>
              <Ionicons name="trash-outline" size={21} color={COLORS.danger} />
            </TouchableOpacity>
          </SafeAreaView>

          <FlatList
            ref={viewerRef}
            data={viewerPhotos}
            keyExtractor={p => p.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIdx}
            getItemLayout={(_, i) => ({ length: SW, offset: SW * i, index: i })}
            onMomentumScrollEnd={e => setViewerIdx(Math.round(e.nativeEvent.contentOffset.x / SW))}
            renderItem={({ item: p }) => (
              <ScrollView
                style={{ width: SW }}
                contentContainerStyle={styles.viewerImgWrap}
                maximumZoomScale={5}
                minimumZoomScale={1}
                centerContent
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Image source={{ uri: p.uri }} style={{ width: SW, height: SW * 1.35 }} resizeMode="contain" />
              </ScrollView>
            )}
          />

          <SafeAreaView edges={['bottom']} style={styles.viewerBottom}>
            <Text style={styles.viewerDate}>{fmtLong(photo.date)}</Text>
            {photo.note ? <Text style={styles.viewerNote}>{photo.note}</Text> : null}
            <View style={styles.viewerChips}>
              {photo.weight ? (
                <View style={styles.vChip}>
                  <Ionicons name="barbell-outline" size={11} color={COLORS.primary} />
                  <Text style={styles.vChipTxt}>{photo.weight} lbs</Text>
                </View>
              ) : null}
              {(photo.tags ?? []).map(t => (
                <View key={t} style={styles.vChip}><Text style={styles.vChipTxt}>{t}</Text></View>
              ))}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  };

  // Source picker (camera vs library)
  const SourceModal = () => (
    <Modal visible={sourceOn} transparent animationType="slide" onRequestClose={() => setSourceOn(false)}>
      <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setSourceOn(false)} />
      <View style={styles.srcSheet}>
        <View style={styles.handle} />
        <Text style={styles.srcTitle}>Ajouter une photo</Text>
        <TouchableOpacity
          style={styles.srcBtn}
          onPress={() => { setSourceOn(false); setTimeout(pickCamera, 600); }}
          activeOpacity={0.82}
        >
          <View style={styles.srcBtnIcon}>
            <Ionicons name="camera-outline" size={26} color={COLORS.primary} />
          </View>
          <Text style={styles.srcBtnTxt}>Prendre une photo</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.srcBtn}
          onPress={() => { setSourceOn(false); setTimeout(pickLibrary, 600); }}
          activeOpacity={0.82}
        >
          <View style={styles.srcBtnIcon}>
            <Ionicons name="images-outline" size={26} color={COLORS.primary} />
          </View>
          <Text style={styles.srcBtnTxt}>Choisir depuis la galerie</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelRow} onPress={() => setSourceOn(false)}>
          <Text style={styles.cancelTxt}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  // Before/after photo picker
  const PickerModal = () => (
    <Modal visible={pickingFor !== null} transparent animationType="slide" onRequestClose={() => setPickingFor(null)}>
      <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setPickingFor(null)} />
      <View style={styles.pickerSheet}>
        <View style={styles.handle} />
        <Text style={styles.pickerTitle}>{pickingFor === 'before' ? 'Photo AVANT' : 'Photo APRÈS'}</Text>
        {photos.length === 0 ? (
          <Text style={styles.pickerEmpty}>Aucune photo — ajoutes-en d'abord.</Text>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={p => p.id}
            numColumns={3}
            columnWrapperStyle={{ gap: 6 }}
            contentContainerStyle={{ gap: 6, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerCard}
                onPress={() => {
                  if (pickingFor === 'before') setBeforePh(item);
                  else setAfterPh(item);
                  setPickingFor(null);
                }}
              >
                <Image source={{ uri: item.uri }} style={styles.pickerThumb} resizeMode="cover" />
                <Text style={styles.pickerDate} numberOfLines={1}>{fmtShort(item.date)}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Photos</Text>
          <Text style={styles.subtitle}>
            {photos.length > 0
              ? `${photos.length} photo${photos.length > 1 ? 's' : ''} · Journal privé`
              : 'Journal privé'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addFab} onPress={() => setSourceOn(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* tab bar */}
      <View style={styles.tabBarWrap}>
        <View style={styles.tabBar}>
          {[
            { key: 'gallery',  label: 'Galerie',    icon: 'grid-outline'        },
            { key: 'compare',  label: 'Avant-Après', icon: 'git-compare-outline' },
            { key: 'timeline', label: 'Frise',       icon: 'time-outline'        },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnOn]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.75}
            >
              <Ionicons name={t.icon} size={14} color={tab === t.key ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* tag filter strip (gallery only) */}
      {tab === 'gallery' && allTags.length > 0 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow} style={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, !filterTag && styles.filterChipOn]}
            onPress={() => setFilterTag(null)}
          >
            <Text style={[styles.filterTxt, !filterTag && styles.filterTxtOn]}>Tout</Text>
          </TouchableOpacity>
          {allTags.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.filterChip, filterTag === t && styles.filterChipOn]}
              onPress={() => setFilterTag(filterTag === t ? null : t)}
            >
              <Text style={[styles.filterTxt, filterTag === t && styles.filterTxtOn]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* content */}
      <View style={{ flex: 1 }}>
        {tab === 'gallery'  && <Gallery />}
        {tab === 'compare'  && <Compare />}
        {tab === 'timeline' && <Timeline />}
      </View>

      <ViewerModal />
      <SourceModal />

      {/* Add photo form — inline pour éviter remount à chaque frappe clavier */}
      <Modal visible={addOn} transparent animationType="slide" onRequestClose={() => setAddOn(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setAddOn(false)} />
          <View style={styles.addSheet}>
            <View style={styles.handle} />
            <Text style={styles.addTitle}>Nouvelle photo</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {pendingUri ? (
                <Image source={{ uri: pendingUri }} style={styles.addPreview} resizeMode="cover" />
              ) : null}

              <Text style={styles.addLbl}>NOTE</Text>
              <TextInput
                style={styles.addInput}
                value={addNote}
                onChangeText={setAddNote}
                placeholder="ex: Début du bulk, semaine 4…"
                placeholderTextColor={COLORS.textMuted}
                multiline
              />

              <Text style={styles.addLbl}>TAGS</Text>
              <View style={styles.tagPicker}>
                {PRESET_TAGS.map(t => (
                  <TagChip
                    key={t} label={t}
                    active={addTags.includes(t)}
                    onPress={() => setAddTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                  />
                ))}
              </View>
              <TextInput
                style={[styles.addInput, { marginTop: 8 }]}
                value={customTag}
                onChangeText={setCustomTag}
                placeholder="Tag personnalisé…"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.addLbl}>POIDS (optionnel, lbs)</Text>
              <TextInput
                style={styles.addInput}
                value={addWeight}
                onChangeText={setAddWeight}
                placeholder="ex: 185"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={confirmAdd}>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveBtnTxt}>SAUVEGARDER</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PickerModal />
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 38, fontWeight: '900', color: COLORS.text, letterSpacing: -1,
  },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  addFab: {
    width: 50, height: 50, borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },

  // tab bar
  tabBarWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  tabBar: {
    flexDirection: 'row', gap: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 6,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: 'transparent',
  },
  tabBtnOn: {
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderColor: COLORS.primary,
  },
  tabTxt:   { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  tabTxtOn: { color: COLORS.primary },

  // filter
  filterScroll: { maxHeight: 44 },
  filterRow:    { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingBottom: 8 },
  filterChip:   {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterTxt:    { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTxtOn:  { color: '#fff' },

  // gallery
  gridContent: { padding: 16, paddingTop: 12, paddingBottom: 24 },
  photoCard: {
    width: CARD_W, borderRadius: 18, overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  photoThumb: { width: CARD_W, height: CARD_W * 1.28 },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 10, paddingVertical: 8,
    gap: 2,
  },
  photoDate:   { fontSize: 12, fontWeight: '700', color: '#fff' },
  photoTagTxt: { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  wChip: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.70)',
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  wChipTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // empty
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 90, height: 90, borderRadius: 26,
    backgroundColor: 'rgba(255,107,0,0.10)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  emptyTxt:   { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingHorizontal: 22, paddingVertical: 13, marginTop: 6,
  },
  emptyCtaTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // timeline
  tlContent: { padding: 16 },
  monthRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  monthLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  monthLbl:  { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.5 },
  tlCard: {
    backgroundColor: COLORS.surface, borderRadius: 18, overflow: 'hidden',
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  tlImg:    { width: '100%', height: (SW - 32) * 0.62 },
  tlInfo:   { padding: 14, gap: 4 },
  tlDate:   { fontSize: 14, fontWeight: '700', color: COLORS.text },
  tlNote:   { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  tlWeight: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  tlTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tlTag:    {
    backgroundColor: COLORS.surfaceElevated, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.border,
  },
  tlTagTxt: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },

  // compare
  cmpContent:   { padding: 16 },
  cmpHint:      { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 14, lineHeight: 18 },
  cmpEmptyHint: { alignItems: 'center', marginTop: 24, paddingHorizontal: 24 },
  cmpEmptyTxt:  { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  baRow:        { flexDirection: 'row', gap: 4, height: SW * 0.78 },
  baPicker:     { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed' },
  baPickerFilled: { borderStyle: 'solid', borderColor: COLORS.primary },
  baEmpty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.surface },
  baLabel:      { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1 },
  baDateBadge:  {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.78)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  baDateTxt:    { fontSize: 11, fontWeight: '700', color: '#fff' },
  baDivider:    { width: 3, backgroundColor: COLORS.primary, borderRadius: 2 },
  diffCard:     {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 18,
    marginTop: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  diffRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  diffCol:      { flex: 1, gap: 4 },
  diffLbl:      { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1 },
  diffDate:     { fontSize: 12, fontWeight: '600', color: COLORS.text },
  diffW:        { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  diffMid:      { alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  diffDays:     { fontSize: 11, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  wDiffSection: { marginTop: 14, alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  wDiffVal:     { fontSize: 28, fontWeight: '900' },
  wDiffSub:     { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // viewer
  viewerBg:     { flex: 1, backgroundColor: '#000' },
  viewerTop:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
  },
  viewerBtn:    { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  viewerCount:  { fontSize: 13, fontWeight: '700', color: '#fff' },
  viewerImgWrap: { alignItems: 'center', justifyContent: 'center', minHeight: SH * 0.55 },
  viewerBottom: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderTopWidth: 1, borderTopColor: '#2a2a2a',
  },
  viewerDate:   { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  viewerNote:   { fontSize: 13, color: '#bbb', lineHeight: 18, marginBottom: 8 },
  viewerChips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  vChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1a1a1a', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#333',
  },
  vChipTxt: { fontSize: 11, fontWeight: '600', color: COLORS.primary },

  // modal shared
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)' },
  handle:  { width: 36, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },

  // source picker
  srcSheet: {
    backgroundColor: '#0F0F0F',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22, paddingBottom: 44,
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  srcTitle:  { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16, paddingLeft: 2 },
  srcBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    height: 64,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 10,
  },
  srcBtnIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  srcBtnTxt: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cancelRow: { padding: 16, alignItems: 'center' },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },

  // add form
  addSheet: {
    backgroundColor: '#0F0F0F',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22, paddingBottom: 44,
    borderTopWidth: 1, borderColor: COLORS.border,
    maxHeight: '92%',
  },
  addTitle:   { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  addPreview: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16 },
  addLbl:     {
    fontSize: 10, fontWeight: '800', color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: 8, marginTop: 14,
  },
  addInput: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.text,
  },
  tagPicker:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagOption:      {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  tagOptionOn:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tagOptionTxt:   { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tagOptionTxtOn: { color: '#fff' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 16, height: 54, marginTop: 18,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnTxt: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  // before/after picker modal
  pickerSheet: {
    backgroundColor: '#0F0F0F',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22, paddingBottom: 40,
    borderTopWidth: 1, borderColor: COLORS.border,
    maxHeight: '70%',
  },
  pickerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  pickerEmpty: { color: COLORS.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  pickerCard:  { flex: 1 / 3 },
  pickerThumb: { width: '100%', aspectRatio: 0.8, borderRadius: 10 },
  pickerDate:  { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', marginTop: 3 },
});
