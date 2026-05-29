import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PHOTOS_KEY = '@gym_progress_photos';
const PHOTOS_DIR = (FileSystem.documentDirectory ?? '') + 'progress_photos/';

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

export async function getPhotos() {
  try {
    const raw = await AsyncStorage.getItem(PHOTOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function savePhoto(sourceUri, { note = '', tags = [], weight = null, date = null } = {}) {
  await ensureDir();
  const id = Date.now().toString();
  const dest = PHOTOS_DIR + id + '.jpg';
  await FileSystem.copyAsync({ from: sourceUri, to: dest });

  const photo = {
    id,
    uri: dest,
    date: date ?? new Date().toISOString(),
    note,
    tags,
    weight,
  };

  const existing = await getPhotos();
  const updated = [...existing, photo].sort((a, b) => a.date.localeCompare(b.date));
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(updated));
  return photo;
}

export async function deletePhoto(id) {
  const photos = await getPhotos();
  const photo = photos.find(p => p.id === id);
  if (photo) {
    try { await FileSystem.deleteAsync(photo.uri, { idempotent: true }); } catch {}
  }
  const updated = photos.filter(p => p.id !== id);
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(updated));
}
