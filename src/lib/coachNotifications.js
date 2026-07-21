// Coach fantôme — notifications LOCALES programmées d'avance (les push distants
// ne marchent pas dans Expo Go). Fonctionnement : le téléphone CIBLE lit sa
// config coach_config à l'ouverture de l'app, annule toutes ses notifs
// coach-* puis replanifie les 7 prochains jours à l'heure configurée. Le jour
// où une séance est terminée, WorkoutSession annule la notif du jour — la
// notification n'arrive donc que les jours sans entraînement.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getUserName, getCoachConfig, getLogs } from '../storage/storage';

const CHANNEL_ID = 'coach';
const ID_PREFIX = 'coach-';

// Clé de jour LOCALE (les notifications sonnent en heure locale, contrairement
// aux clés UTC utilisées pour les logs).
function localDayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function cancelAllCoachNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => n.identifier?.startsWith(ID_PREFIX))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

// À appeler à chaque ouverture de l'app. Sans config ciblant cet utilisateur,
// ne demande jamais la permission (l'autre téléphone ne voit aucun prompt).
export async function syncCoachNotifications() {
  try {
    const name = await getUserName();
    if (!name) return;
    const cfg = await getCoachConfig(name);

    if (!cfg || !cfg.enabled) {
      // Config absente ou désactivée → purge silencieuse des rappels existants
      await cancelAllCoachNotifications().catch(() => {});
      return;
    }

    const perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Rappels d\'entraînement',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    await cancelAllCoachNotifications();

    const logs = await getLogs();
    const todayUTC = new Date().toISOString().slice(0, 10);
    const trainedToday = logs.some(s => s.date.slice(0, 10) === todayUTC);

    for (let i = 0; i < 7; i++) {
      const fireAt = new Date();
      fireAt.setDate(fireAt.getDate() + i);
      fireAt.setHours(cfg.hour, cfg.minute, 0, 0);
      if (fireAt.getTime() <= Date.now()) continue;   // heure déjà passée
      if (i === 0 && trainedToday) continue;          // séance déjà faite aujourd'hui

      await Notifications.scheduleNotificationAsync({
        identifier: ID_PREFIX + localDayKey(fireAt),
        content: { title: cfg.title, body: cfg.message, sound: 'default' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes?.DATE ?? 'date',
          date: fireAt,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch {}
}

// Appelée quand une séance est terminée : le rappel du jour devient inutile.
export async function cancelTodayCoachNotification() {
  try {
    await Notifications.cancelScheduledNotificationAsync(ID_PREFIX + localDayKey(new Date()));
  } catch {}
}
