// Analytics pures du Radar Duo (pas de React, pas de storage).
// Convention de dates : clés de jour en UTC (iso.slice(0,10)), comme partout
// dans l'app ; les heures locales ne servent que pour usualHour.

export function todayKeyUTC() { return new Date().toISOString().slice(0, 10); }

// Détail de la séance du jour : par exercice → sets, meilleure série, volume.
// Renvoie null si rien de loggé aujourd'hui.
export function sessionDetailToday(logs) {
  const today = todayKeyUTC();
  const todays = logs.filter(s => s.date.slice(0, 10) === today);
  if (todays.length === 0) return null;
  const byEx = {};
  todays.forEach(s => {
    if (!byEx[s.exercise]) byEx[s.exercise] = { exercise: s.exercise, sets: 0, best: null, volume: 0 };
    const e = byEx[s.exercise];
    e.sets += 1;
    e.volume += s.weight * s.reps;
    if (!e.best || s.weight > e.best.weight) e.best = { weight: s.weight, reps: s.reps };
  });
  return {
    exercises: Object.values(byEx),
    totalSets: todays.length,
    totalVolume: todays.reduce((a, s) => a + s.weight * s.reps, 0),
  };
}

// Durée estimée de la séance du jour (premier set → dernier set), en minutes.
// Null si moins de 2 sets aujourd'hui.
export function sessionDurationToday(logs) {
  const today = todayKeyUTC();
  const times = logs.filter(s => s.date.slice(0, 10) === today).map(s => new Date(s.date).getTime());
  if (times.length < 2) return null;
  return Math.round((Math.max(...times) - Math.min(...times)) / 60000);
}

// PRs des N derniers jours : exercices dont le meilleur poids récent dépasse le
// meilleur all-time d'AVANT la fenêtre (exige donc un historique antérieur —
// un exercice tout neuf n'est pas un "PR battu").
export function recentPRs(logs, days = 7) {
  const cutoff = Date.now() - days * 86400000;
  const bestBefore = {};
  const bestRecent = {};
  logs.forEach(s => {
    if (new Date(s.date).getTime() < cutoff) {
      if (bestBefore[s.exercise] == null || s.weight > bestBefore[s.exercise]) bestBefore[s.exercise] = s.weight;
    } else if (!bestRecent[s.exercise] || s.weight > bestRecent[s.exercise].weight) {
      bestRecent[s.exercise] = { weight: s.weight, reps: s.reps, date: s.date };
    }
  });
  return Object.entries(bestRecent)
    .filter(([ex, r]) => bestBefore[ex] != null && r.weight > bestBefore[ex])
    .map(([ex, r]) => ({ exercise: ex, weight: r.weight, reps: r.reps, date: r.date, prevBest: bestBefore[ex] }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Exercices où `challenger` a loggé récemment un poids qui dépasse le meilleur
// all-time de `defender` — le système d'alerte "il t'a dépassé".
export function overtakes(challengerLogs, defenderLogs, days = 7) {
  const cutoff = Date.now() - days * 86400000;
  const defenderMax = {};
  defenderLogs.forEach(s => {
    if (defenderMax[s.exercise] == null || s.weight > defenderMax[s.exercise]) defenderMax[s.exercise] = s.weight;
  });
  const recentMax = {};
  challengerLogs.forEach(s => {
    if (new Date(s.date).getTime() >= cutoff &&
        (recentMax[s.exercise] == null || s.weight > recentMax[s.exercise])) {
      recentMax[s.exercise] = s.weight;
    }
  });
  return Object.entries(recentMax)
    .filter(([ex, w]) => defenderMax[ex] != null && w > defenderMax[ex])
    .map(([ex, w]) => ({ exercise: ex, weight: w, defenderBest: defenderMax[ex] }));
}

// Heure locale habituelle de début de séance (moyenne circulaire sur 24 h du
// premier set de chaque jour). Null si moins de minSessions jours de données.
export function usualHour(logs, minSessions = 5) {
  const firstOfDay = {};
  logs.forEach(s => {
    const day = s.date.slice(0, 10);
    const t = new Date(s.date).getTime();
    if (!firstOfDay[day] || t < firstOfDay[day]) firstOfDay[day] = t;
  });
  const starts = Object.values(firstOfDay);
  if (starts.length < minSessions) return null;
  let x = 0, y = 0;
  starts.forEach(t => {
    const local = new Date(t);
    const angle = ((local.getHours() + local.getMinutes() / 60) / 24) * 2 * Math.PI;
    x += Math.cos(angle);
    y += Math.sin(angle);
  });
  let h = (Math.atan2(y / starts.length, x / starts.length) / (2 * Math.PI)) * 24;
  if (h < 0) h += 24;
  return { hour: Math.floor(h), minute: Math.round((h % 1) * 60) % 60, sessions: starts.length };
}

// Calendrier de présence : `days` entrées (plus ancien → aujourd'hui),
// { day, active } — un jour est actif s'il contient au moins un set.
export function presenceCalendar(logs, days = 30) {
  const activeDays = new Set(logs.map(s => s.date.slice(0, 10)));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ day: key, active: activeDays.has(key) });
  }
  return out;
}

// Jours du plan (exercices > 0) déjà passés cette semaine (dim → hier) sans
// aucun set loggé ce jour-là. Null si pas de plan.
export function missedPlanDays(plan, logs, referenceDate = new Date()) {
  if (!plan?.days) return null;
  const trained = new Set(logs.map(s => s.date.slice(0, 10)));
  const todayIdx = referenceDate.getDay();
  const missed = [];
  for (let i = 0; i < todayIdx; i++) {
    const day = plan.days[i];
    if (!day || (day.exercises ?? []).length === 0) continue;
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - (todayIdx - i));
    if (!trained.has(d.toISOString().slice(0, 10))) missed.push({ dayIdx: i, label: day.label || `Jour ${i}` });
  }
  return missed;
}
