import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const DAYS_SHORT = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

// days = [{ label, exercises, targetMuscles? }]  (index 0–6, index = day of week)
export async function exportPlanToExcel({ planName = 'Mon Plan', planType = '', userName = '', mode = 'solo', days = [] }) {
  try {
    const wb = XLSX.utils.book_new();

    // ── Feuille 1 : Résumé ──────────────────────────────────────────────────
    const modeLabel = mode === 'sync' ? 'Sync (partagé)' : 'Solo (local)';
    const typeLabel = planType === 'ppl' ? 'PPL — Push / Pull / Legs'
                    : planType === 'arnold' ? 'Arnold Split'
                    : planType === 'custom' ? 'Custom Split'
                    : planType || planName;

    const summaryRows = [
      ['GYM DUO TRACKER — PROGRAMME D\'ENTRAÎNEMENT'],
      [],
      ['Plan',         typeLabel],
      ['Athlète',      userName || '—'],
      ['Mode',         modeLabel],
      ['Exporté le',   new Date().toLocaleDateString('fr-CA')],
      [],
      ['RÉCAPITULATIF DES JOURS'],
      ['JOUR', 'FOCUS', 'MUSCLES CIBLÉS', 'NB EXERCICES'],
    ];

    days.forEach((day, idx) => {
      const dayShort   = DAYS_SHORT[idx] ?? `J${idx + 1}`;
      const focus      = day.label || dayShort;
      const muscles    = (day.targetMuscles ?? []).join(' · ') || '—';
      const nbEx       = (day.exercises ?? []).length;
      summaryRows.push([dayShort, focus, nbEx === 0 ? 'Repos' : muscles, nbEx === 0 ? '—' : nbEx]);
    });

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    summaryWs['!cols'] = [{ wch: 8 }, { wch: 24 }, { wch: 36 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Programme');

    // ── Feuilles par jour ───────────────────────────────────────────────────
    days.forEach((day, idx) => {
      const dayShort   = DAYS_SHORT[idx] ?? `J${idx + 1}`;
      const dayLabel   = day.label || dayShort;
      const exercises  = day.exercises ?? [];
      const targets    = (day.targetMuscles ?? []).join(' · ');
      const isRest     = exercises.length === 0;

      const rows = [
        [`${dayShort} — ${dayLabel.toUpperCase()}`],
        [targets ? `Muscles ciblés : ${targets}` : isRest ? 'Jour de repos' : 'Aucun groupe ciblé'],
        [],
        ['#', 'EXERCICE', 'SETS', 'REPS', 'POIDS (lbs)', 'NOTES'],
      ];

      if (isRest) {
        rows.push(['', 'Repos / Récupération active', '', '', '', '']);
      } else {
        exercises.forEach((ex, i) => {
          rows.push([i + 1, ex, '', '', '', '']);
        });
        // 3 lignes vides pour ajouter des notes libres
        rows.push([], [], []);
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 4 }, { wch: 32 }, { wch: 7 }, { wch: 12 }, { wch: 13 }, { wch: 28 }];

      // Nom de l'onglet : "LUN — Push" tronqué à 31 chars (limite Excel)
      const sheetName = `${dayShort} — ${dayLabel}`.replace(/[:\\\/?*\[\]]/g, '').slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // ── Écriture et partage ─────────────────────────────────────────────────
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileName = `programme_${(planName || 'gym').replace(/\s+/g, '_').toLowerCase()}.xlsx`;
    const uri = FileSystem.cacheDirectory + fileName;
    await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exporter le programme',
      });
    } else {
      Alert.alert('Export', `Fichier sauvegardé :\n${uri}`);
    }
  } catch (e) {
    Alert.alert('Erreur export', e?.message ?? 'Impossible d\'exporter le fichier.');
  }
}
