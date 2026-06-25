import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { DEFAULT_LIBRARY } from '../data/defaultPlans';

const LOGS_KEY        = '@gym_duo_logs';
const USER_KEY        = '@gym_user_name';
const PLAN_KEY        = '@gym_active_plan';
const LIBRARY_KEY     = '@gym_exercise_library';
const PLAN_MODE_KEY   = '@gym_plan_mode';    // 'solo' | 'sync'
const TODAY_SRC_KEY   = '@gym_today_source'; // 'mine' | 'shared'
const FAVORITES_KEY   = '@gym_favorites';    // string[] — private, never synced

// Each plan type gets its own key so switching types never wipes modifications
function planTypeKey(type) { return `@gym_plan_type_${type}`; }

// ── Identity ──────────────────────────────────────────────────────────────────
export async function getUserName() {
  return await AsyncStorage.getItem(USER_KEY);
}

export async function setUserName(name) {
  await AsyncStorage.setItem(USER_KEY, name.trim());
}

// ── Local fallback ────────────────────────────────────────────────────────────
export async function getLogs() {
  try {
    const raw = await AsyncStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalLogs(sets) {
  const existing = await getLogs();
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify([...existing, ...sets]));
}

// ── Cloud ─────────────────────────────────────────────────────────────────────

async function uploadSession(sets, userName) {
  const rows = sets.map(s => ({
    user_name: userName,
    exercise: s.exercise,
    weight: s.weight,
    reps: s.reps,
    logged_at: s.date,
  }));
  await supabase.from('workout_logs').insert(rows);
}

export async function getCloudLogs(userName) {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('exercise, weight, reps, logged_at')
      .eq('user_name', userName)
      .order('logged_at', { ascending: false });

    if (error || !data) return null;
    return data.map(r => ({ exercise: r.exercise, weight: r.weight, reps: r.reps, date: r.logged_at }));
  } catch {
    return null;
  }
}

export async function getAllUsersLogs() {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('user_name, exercise, weight, reps, logged_at')
      .order('logged_at', { ascending: false })
      .limit(1000);

    if (error || !data) return {};

    const byUser = {};
    data.forEach(r => {
      if (!byUser[r.user_name]) byUser[r.user_name] = [];
      byUser[r.user_name].push({ exercise: r.exercise, weight: r.weight, reps: r.reps, date: r.logged_at });
    });
    return byUser;
  } catch {
    return {};
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function saveSession(sets) {
  try {
    await saveLocalLogs(sets);
    const userName = await getUserName();
    if (userName) uploadSession(sets, userName).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export async function clearAllLogs() {
  try {
    await AsyncStorage.removeItem(LOGS_KEY);
    const userName = await getUserName();
    if (userName) {
      await supabase.from('workout_logs').delete().eq('user_name', userName);
    }
  } catch {}
}

// Wipe ALL users from Supabase — fetches all usernames first to handle RLS
export async function clearAllUsersLogs() {
  try {
    await AsyncStorage.removeItem(LOGS_KEY);

    // Fetch all distinct user names, then delete each one's rows
    const { data } = await supabase
      .from('workout_logs')
      .select('user_name')
      .limit(200);

    if (data && data.length > 0) {
      const names = [...new Set(data.map(r => r.user_name).filter(Boolean))];
      await Promise.all(
        names.map(name => supabase.from('workout_logs').delete().eq('user_name', name))
      );
    }

    // Fallback broad delete for tables with no RLS
    await supabase.from('workout_logs').delete().not('user_name', 'is', null);
  } catch {}
}

export async function deleteExerciseLogs(exerciseName) {
  try {
    const existing = await getLogs();
    const filtered = existing.filter(s => s.exercise !== exerciseName);
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(filtered));

    const userName = await getUserName();
    if (userName) {
      await supabase.from('workout_logs')
        .delete()
        .eq('user_name', userName)
        .eq('exercise', exerciseName);
    }
  } catch {}
}

// ── Plan & Exercise Library ───────────────────────────────────────────────────

export async function getActivePlan() {
  try {
    const raw = await AsyncStorage.getItem(PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveActivePlan(plan) {
  await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

// Per-type plan storage (legacy — ne plus utiliser directement)
export async function getPlanByType(type) {
  try {
    const raw = await AsyncStorage.getItem(planTypeKey(type));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function savePlanByType(type, plan) {
  try {
    await AsyncStorage.setItem(planTypeKey(type), JSON.stringify(plan));
  } catch {}
}

// ── Solo plan storage (totalement séparé du Sync) ────────────────────────────
// Clés différentes pour que Solo et Sync ne se contaminent jamais

function soloPlanKey(type) { return `@gym_solo_plan_${type}`; }

export async function getSoloPlanByType(type) {
  try {
    const raw = await AsyncStorage.getItem(soloPlanKey(type));
    // Migration : si pas de clé solo, essaie l'ancienne clé (première utilisation)
    if (!raw) {
      const legacy = await AsyncStorage.getItem(planTypeKey(type));
      return legacy ? JSON.parse(legacy) : null;
    }
    return JSON.parse(raw);
  } catch { return null; }
}

export async function saveSoloPlanByType(type, plan) {
  try {
    await AsyncStorage.setItem(soloPlanKey(type), JSON.stringify(plan));
  } catch {}
}

export async function getExerciseLibrary() {
  try {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [...DEFAULT_LIBRARY];
  } catch { return [...DEFAULT_LIBRARY]; }
}

export async function saveExerciseLibrary(exercises) {
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(exercises));
}

// ── Plan Mode (solo / sync) ───────────────────────────────────────────────────

export async function getPlanMode() {
  try { return (await AsyncStorage.getItem(PLAN_MODE_KEY)) ?? 'solo'; } catch { return 'solo'; }
}

export async function setPlanMode(mode) {
  await AsyncStorage.setItem(PLAN_MODE_KEY, mode);
}

// ── Today Source (mine / shared) ─────────────────────────────────────────────

export async function getTodaySource() {
  try { return (await AsyncStorage.getItem(TODAY_SRC_KEY)) ?? 'mine'; } catch { return 'mine'; }
}

export async function setTodaySource(source) {
  await AsyncStorage.setItem(TODAY_SRC_KEY, source);
}

// ── Shared Plan (Supabase) ────────────────────────────────────────────────────

export async function getSharedPlan() {
  try {
    const { data, error } = await supabase
      .from('shared_plans')
      .select('plan, updated_at, updated_by')
      .eq('id', 'main')
      .single();
    if (error || !data || !data.plan || Object.keys(data.plan).length === 0) return null;
    return { plan: data.plan, updatedAt: data.updated_at, updatedBy: data.updated_by };
  } catch { return null; }
}

export async function saveSharedPlan(plan, userName) {
  try {
    await supabase.from('shared_plans').upsert({
      id: 'main',
      plan,
      updated_by: userName ?? 'anonymous',
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

// ── Favorites (private, local only) ──────────────────────────────────────────

export async function getFavorites() {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function toggleFavorite(exerciseName) {
  const favs = await getFavorites();
  const next = favs.includes(exerciseName)
    ? favs.filter(f => f !== exerciseName)
    : [...favs, exerciseName];
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}
