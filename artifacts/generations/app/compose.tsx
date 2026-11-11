import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AudioNote, Notice, PermissionNotice, PressScale, RecordingBar, useVoiceRecorder, webBottom } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { deleteMedia, haptic, pickPhoto } from '@/lib/media';

type Attachment = { kind: 'photo'; uri: string } | { kind: 'audio'; uri: string; durationMs: number } | null;

export default function Compose() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { addPost } = useFamily();
  const [text, setText] = useState('');
  const [att, setAtt] = useState<Attachment>(null);
  const [denied, setDenied] = useState<{ what: string; canAskAgain: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rec = useVoiceRecorder((uri, durationMs) => setAtt({ kind: 'audio', uri, durationMs }));
  const posted = useRef(false);
  const attRef = useRef<Attachment>(null);
  attRef.current = att;

  // Clean up an unshared attachment file if the user backs out.
  useEffect(() => () => { if (!posted.current && attRef.current) deleteMedia(attRef.current.uri); }, []);

  const photo = async (src: 'camera' | 'library') => {
    setError(null);
    const r = await pickPhoto(src);
    if (r.status === 'ok') { if (att) deleteMedia(att.uri); setAtt({ kind: 'photo', uri: r.uri }); setDenied(null); }
    else if (r.status === 'denied') setDenied({ what: src === 'camera' ? 'camera' : 'photo library', canAskAgain: r.canAskAgain });
    else if (r.status === 'error') setError(r.message);
  };

  const canPost = !!att || text.trim().length > 0;
  const post = () => {
    if (!canPost) return;
    posted.current = true;
    if (att?.kind === 'photo') addPost({ kind: 'photo', uri: att.uri, text: text.trim() || undefined });
    else if (att?.kind === 'audio') addPost({ kind: 'audio', uri: att.uri, durationMs: att.durationMs, text: text.trim() || undefined });
    else addPost({ kind: 'text', text: text.trim() });
    haptic.success();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + webBottom + 30 }} keyboardShouldPersistTaps="handled" bottomOffset={20}>
        <TextInput value={text} onChangeText={setText} autoFocus={mode === 'text'} multiline maxLength={2000}
          placeholder={att ? 'Add a caption (optional)' : 'What happened today?'} placeholderTextColor={c.mutedForeground}
          style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.foreground }]} accessibilityLabel="Post text" testID="compose-input" />

        {att?.kind === 'photo' ? (
          <View>
            <Image source={{ uri: att.uri }} style={styles.preview} contentFit="cover" />
            <Pressable onPress={() => { deleteMedia(att.uri); setAtt(null); }} style={[styles.remove, { backgroundColor: c.card }]} accessibilityLabel="Remove photo"><Feather name="x" size={18} color={c.foreground} /></Pressable>
          </View>
        ) : null}
        {att?.kind === 'audio' ? (
          <View style={[styles.audioBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={{ flex: 1 }}><AudioNote uri={att.uri} durationMs={att.durationMs} /></View>
            <Pressable onPress={() => { deleteMedia(att.uri); setAtt(null); }} hitSlop={8} accessibilityLabel="Remove voice note"><Feather name="trash-2" size={18} color={c.mutedForeground} /></Pressable>
          </View>
        ) : null}

        {denied ? <PermissionNotice what={denied.what} canAskAgain={denied.canAskAgain} onClose={() => setDenied(null)} /> : null}
        {rec.state === 'denied' || rec.state === 'blocked' ? <PermissionNotice what="microphone" canAskAgain={rec.state === 'denied'} onClose={rec.clear} /> : null}
        {error || rec.state === 'error' ? <Notice text={error ?? rec.error ?? 'Something went wrong.'} onClose={() => { setError(null); rec.clear(); }} /> : null}

        {rec.state === 'recording' ? (
          <RecordingBar elapsed={rec.elapsed} onStop={() => rec.stop(true)} onCancel={() => rec.stop(false)} />
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {([
              { k: 'camera', label: 'Camera', icon: 'camera', on: () => photo('camera') },
              { k: 'library', label: 'Library', icon: 'image', on: () => photo('library') },
              { k: 'mic', label: att?.kind === 'audio' ? 'Re-record' : 'Voice', icon: 'mic', on: () => { if (att) deleteMedia(att.uri); setAtt(null); rec.start(); } },
            ] as const).map((b) => (
              <PressScale key={b.k} onPress={b.on} style={[styles.tool, { backgroundColor: b.k === 'mic' ? c.terracottaSoft : c.goldSoft, borderColor: mode === (b.k === 'mic' ? 'audio' : b.k === 'camera' ? 'photo' : '') ? c.primary : 'transparent' }]} testID={`compose-${b.k}`} accessibilityRole="button">
                <Feather name={b.icon} size={22} color={b.k === 'mic' ? c.terracotta : c.secondaryForeground} />
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 14, color: c.foreground }}>{b.label}</Text>
              </PressScale>
            ))}
          </View>
        )}

        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: c.mutedForeground }}>Saved to the family feed on this device. It is not sent to anyone else yet.</Text>

        <PressScale disabled={!canPost || rec.state === 'recording'} onPress={post} style={[styles.post, { backgroundColor: c.primary }]} testID="compose-post" accessibilityRole="button">
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 18, color: c.primaryForeground }}>Share to feed</Text>
        </PressScale>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 130, borderWidth: 1.5, borderRadius: 20, padding: 16, fontFamily: fonts.bodySemi, fontSize: 18, textAlignVertical: 'top' },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 20 },
  remove: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  audioBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, borderWidth: 1 },
  tool: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 78, borderRadius: 20, borderWidth: 2 },
  post: { minHeight: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
