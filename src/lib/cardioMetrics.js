// Calculs cardio purs (pas de React, pas de storage) — le contrat de ce fichier
// est de ne JAMAIS renvoyer une métrique inventée : toute fonction renvoie `null`
// (ou un objet partiel explicite, ex. unclassifiedCount) quand les données
// nécessaires manquent, plutôt qu'une valeur calculée à partir de zéro/NaN.

import { paceFromSpeed } from './cardioUnits';

// ── Dérivation par séance ──────────────────────────────────────────────────────

// Comble avgSpeedKmh/avgPaceMinKm manquants à partir de durée+distance, sans
// jamais écraser une valeur déjà saisie (ex. console de tapis roulant).
export function deriveSessionMetrics(session) {
  const out = { ...session };
  if (out.avgSpeedKmh == null && out.durationSec > 0 && out.distanceKm != null) {
    out.avgSpeedKmh = out.distanceKm / (out.durationSec / 3600);
  }
  if (out.avgPaceMinKm == null && out.avgSpeedKmh != null) {
    out.avgPaceMinKm = paceFromSpeed(out.avgSpeedKmh);
  }
  return out;
}

// ── Profil cardio (VO2max / zones FC) ──────────────────────────────────────────

// Formule de Tanaka. Renvoie l'override manuel s'il existe, sinon l'estimation
// par l'âge, sinon null.
export function estimateMaxHr(age, manualOverride) {
  if (manualOverride != null && isFinite(manualOverride) && manualOverride > 0) return manualOverride;
  if (age != null && isFinite(age) && age > 0) return 208 - 0.7 * age;
  return null;
}

// Uth–Sørensen–Overgaard–Pedersen (estimation non-exercice, à partir de FCmax/FCrepos).
export function estimateVO2max({ restingHr, maxHr } = {}) {
  if (!restingHr || restingHr <= 0 || !maxHr || maxHr <= 0) return null;
  return { value: 15.3 * (maxHr / restingHr), formula: '15.3 × (FCmax / FCrepos)' };
}

// 5 zones standard en % de FCmax. Renvoie null si FC moyenne ou FCmax manquante.
export function classifyHrZone(avgHr, maxHr) {
  if (!avgHr || !maxHr || maxHr <= 0) return null;
  const pct = (avgHr / maxHr) * 100;
  if (pct < 60) return 'Z1';
  if (pct < 70) return 'Z2';
  if (pct < 80) return 'Z3';
  if (pct < 90) return 'Z4';
  return 'Z5';
}

// Approximation : classe chaque séance entière dans une zone selon sa FC
// moyenne (pas de trace FC continue disponible), cumule les durées par zone.
// Renvoie null seulement si FCmax inconnue ou si AUCUNE séance n'a de FC —
// sinon renvoie un objet partiel avec unclassifiedCount > 0 pour affichage.
export function computeZoneDurations(sessions, maxHr) {
  if (!maxHr || maxHr <= 0) return null;
  const zones = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
  let classifiedCount = 0;
  sessions.forEach(s => {
    const zone = classifyHrZone(s.avgHr, maxHr);
    if (zone) {
      zones[zone] += s.durationSec ?? 0;
      classifiedCount += 1;
    }
  });
  if (classifiedCount === 0) return null;
  return {
    zones,
    totalClassifiedSec: Object.values(zones).reduce((a, b) => a + b, 0),
    totalSessions: sessions.length,
    classifiedCount,
    unclassifiedCount: sessions.length - classifiedCount,
  };
}

// Niveau d'effort d'une séance : combine %FCmax et proximité du record d'allure
// pour ce type de cardio. Renvoie null si aucune des deux données n'est dispo.
export function computeEffortLevel(session, ctx = {}) {
  const { maxHr, bestPaceMinKm } = ctx;
  let hrScore = null;
  let paceScore = null;
  if (session.avgHr != null && maxHr) {
    hrScore = Math.min(100, (session.avgHr / maxHr) * 100);
  }
  if (session.avgPaceMinKm != null && bestPaceMinKm != null && bestPaceMinKm > 0) {
    paceScore = Math.min(100, (bestPaceMinKm / session.avgPaceMinKm) * 100);
  }
  const scores = [hrScore, paceScore].filter(s => s != null);
  if (scores.length === 0) return null;
  const score = scores.reduce((a, b) => a + b, 0) / scores.length;
  let label;
  if (score < 50) label = 'Faible';
  else if (score < 70) label = 'Modéré';
  else if (score < 85) label = 'Élevé';
  else label = 'Maximal';
  return { label, score: Math.round(score) };
}

// ── Records personnels ─────────────────────────────────────────────────────────

function prFromField(sessions, field, { invert = false, pick } = {}) {
  const candidates = sessions
    .map(s => ({ session: s, value: pick ? pick(s) : s[field] }))
    .filter(c => c.value != null && isFinite(c.value));
  if (candidates.length === 0) return null;
  const best = candidates.reduce((a, b) => ((invert ? b.value < a.value : b.value > a.value) ? b : a));
  return { value: best.value, date: best.session.date, type: best.session.type };
}

// Chaque PR est indépendant — null si ce champ précis n'a jamais été loggé,
// même si d'autres champs de la même séance le sont.
export function computePRs(sessions) {
  return {
    longestDistance: prFromField(sessions, 'distanceKm'),
    bestSpeed:        prFromField(sessions, 'maxSpeedKmh', { pick: s => s.maxSpeedKmh ?? s.avgSpeedKmh }),
    bestPace:         prFromField(sessions, 'avgPaceMinKm', { invert: true }),
    longestDuration:  prFromField(sessions, 'durationSec'),
    highestIncline:   prFromField(sessions, 'maxInclinePct', { pick: s => s.maxInclinePct ?? s.avgInclinePct }),
  };
}

// ── Tendances / évolution ──────────────────────────────────────────────────────

// Généralisation de computeExerciseStats (ProgressScreen.js) à un champ cardio
// arbitraire. `invert: true` pour l'allure (une baisse = progrès → flèche verte).
// Renvoie null si moins de 2 jours distincts ont ce champ renseigné.
export function computeTrend(sessions, metricKey, { invert = false } = {}) {
  const valid = sessions.filter(s => s[metricKey] != null && isFinite(s[metricKey]));
  if (valid.length < 2) return null;

  const byDay = {};
  valid.forEach(s => {
    const day = s.date.slice(0, 10);
    const v = s[metricKey];
    if (!byDay[day] || (invert ? v < byDay[day].value : v > byDay[day].value)) {
      byDay[day] = { date: s.date, value: v };
    }
  });
  const days = Object.keys(byDay).sort();
  if (days.length < 2) return null;

  const firstBest = byDay[days[0]];
  const lastBest  = byDay[days[days.length - 1]];
  const allValues = valid.map(s => s[metricKey]);
  const prValue   = invert ? Math.min(...allValues) : Math.max(...allValues);
  const prSession = valid.find(s => s[metricKey] === prValue);
  const delta     = lastBest.value - firstBest.value;
  const deltaPct  = firstBest.value !== 0 ? (delta / firstBest.value) * 100 : 0;

  const lw = byDay[days[days.length - 1]].value;
  const pw = byDay[days[days.length - 2]].value;
  const trend = lw === pw ? 'neutral' : (invert ? lw < pw : lw > pw) ? 'up' : 'down';

  return {
    chartData: days.map(d => ({ date: d, value: byDay[d].value })),
    firstBest, lastBest, delta, deltaPct, trend,
    pr: { value: prValue, date: prSession?.date ?? null },
    totalSessions: valid.length,
    daysCount: days.length,
  };
}

// ── Regroupement ────────────────────────────────────────────────────────────────

export function groupSessionsByType(sessions) {
  const groups = {};
  sessions.forEach(s => {
    if (!groups[s.type]) groups[s.type] = [];
    groups[s.type].push(s);
  });
  return groups;
}
