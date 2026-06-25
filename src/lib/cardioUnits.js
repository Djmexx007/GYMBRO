// Formatage cardio — km / km/h / min par km uniquement pour l'instant, isolé
// ici pour pouvoir ajouter mi/mph plus tard sans toucher les écrans.

export function paceFromSpeed(kmh) {
  if (!kmh || kmh <= 0) return null;
  return 60 / kmh;
}

export function speedFromPace(minPerKm) {
  if (!minPerKm || minPerKm <= 0) return null;
  return 60 / minPerKm;
}

export function formatPace(minPerKm) {
  if (minPerKm == null || !isFinite(minPerKm) || minPerKm <= 0) return '—';
  const totalSec = Math.round(minPerKm * 60);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')} /km`;
}

export function formatDuration(seconds) {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return '—';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatSpeed(kmh) {
  if (kmh == null || !isFinite(kmh) || kmh <= 0) return '—';
  return `${kmh.toFixed(1)} km/h`;
}

export function formatDistance(km) {
  if (km == null || !isFinite(km) || km < 0) return '—';
  return `${km.toFixed(2)} km`;
}

export function formatIncline(pct) {
  if (pct == null || !isFinite(pct)) return '—';
  return `${pct.toFixed(1)}%`;
}
