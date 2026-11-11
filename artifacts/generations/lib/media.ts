import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Linking, Platform } from 'react-native';

export const haptic = {
  tap: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  firm: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
  success: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  warn: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
};

const MEDIA_PREFIX = 'gen-';
const WEB_MAX_BYTES = 1.5 * 1024 * 1024;

/**
 * Make a media file durable. Native: copy into the app's document directory.
 * Web: convert the temporary blob URL into a data URL so it survives reload.
 * Throws a readable Error on failure; never returns a temporary URI silently.
 */
export async function persistMedia(uri: string, ext: string): Promise<string> {
  if (Platform.OS === 'web') {
    if (uri.startsWith('data:')) {
      if (uri.length * 0.75 > WEB_MAX_BYTES) throw new Error('This file is too large to keep in the browser (limit about 1.5 MB).');
      return uri;
    }
    let blob: Blob;
    try {
      blob = await (await fetch(uri)).blob();
    } catch {
      throw new Error('Could not read this file in the browser.');
    }
    if (blob.size > WEB_MAX_BYTES) throw new Error('This file is too large to keep in the browser (limit about 1.5 MB). Try a smaller photo or shorter note.');
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => (typeof r.result === 'string' ? resolve(r.result) : reject(new Error('Could not convert this file.')));
      r.onerror = () => reject(new Error('Could not convert this file.'));
      r.readAsDataURL(blob);
    });
  }
  try {
    const src = new File(uri);
    const dest = new File(Paths.document, `${MEDIA_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`);
    src.copy(dest);
    if (!dest.exists) throw new Error('missing');
    return dest.uri;
  } catch {
    throw new Error('Could not save this file on your device. Check free storage and try again.');
  }
}

/** Delete every app-owned media file (gen-*) in the document directory. Returns failure count. */
export function deleteAllAppMedia(): number {
  if (Platform.OS === 'web') return 0;
  let failed = 0;
  try {
    for (const entry of new Directory(Paths.document).list()) {
      if (entry instanceof File && entry.name.startsWith(MEDIA_PREFIX)) {
        try { entry.delete(); } catch { failed += 1; }
      }
    }
  } catch {
    failed += 1;
  }
  return failed;
}

export function deleteMedia(uri?: string) {
  if (!uri || Platform.OS === 'web') return;
  try {
    if (uri.startsWith(Paths.document.uri)) {
      const f = new File(uri);
      if (f.exists) f.delete();
    }
  } catch {
    // Non-fatal: file may already be gone.
  }
}

export type PickResult =
  | { status: 'ok'; uri: string }
  | { status: 'cancelled' }
  | { status: 'denied'; canAskAgain: boolean; source: 'camera' | 'library' }
  | { status: 'error'; message: string };

export async function pickPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  try {
    if (source === 'camera' && Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { status: 'denied', canAskAgain: perm.canAskAgain, source };
    }
    if (source === 'library' && Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return { status: 'denied', canAskAgain: perm.canAskAgain, source };
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]) return { status: 'cancelled' };
    return { status: 'ok', uri: await persistMedia(res.assets[0].uri, 'jpg') };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Could not open the photo picker.' };
  }
}

export const openSettings = () => { Linking.openSettings().catch(() => {}); };

export function timeAgo(ts: number) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(ts).toLocaleDateString();
}

export const fmtDuration = (ms = 0) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
