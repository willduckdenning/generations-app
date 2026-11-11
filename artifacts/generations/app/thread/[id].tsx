import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoViewer } from '@/components/PhotoViewer';
import { AudioNote, EmptyState, Notice, PermissionNotice, RecordingBar, SampleTag, useVoiceRecorder, webBottom } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { GROUP_THREAD, Message, ME, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { confirmAction } from '@/lib/confirm';
import { deleteMedia, haptic, pickPhoto, timeAgo } from '@/lib/media';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { messages, profile, memberById, sendMessage, deleteMessage } = useFamily();
  const [text, setText] = useState('');
  const [denied, setDenied] = useState<{ what: string; canAskAgain: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const isGroup = id === GROUP_THREAD;
  const member = !isGroup && id ? memberById(id) : undefined;
  const rec = useVoiceRecorder((uri, durationMs) => sendMessage(id!, { kind: 'audio', uri, durationMs }));

  const data = useMemo(() => messages.filter((m) => m.threadId === id).slice().reverse(), [messages, id]);
  const title = isGroup ? profile?.circleName ?? 'Family' : member?.name ?? 'Conversation';

  const send = () => {
    const t = text.trim();
    if (!t || !id) return;
    sendMessage(id, { kind: 'text', text: t });
    setText('');
    haptic.tap();
  };
  const photo = async (src: 'camera' | 'library') => {
    setError(null);
    const r = await pickPhoto(src);
    if (r.status === 'ok' && id) { sendMessage(id, { kind: 'photo', uri: r.uri }); haptic.success(); setDenied(null); }
    else if (r.status === 'denied') setDenied({ what: src === 'camera' ? 'camera' : 'photo library', canAskAgain: r.canAskAgain });
    else if (r.status === 'error') setError(r.message);
  };
  const remove = (m: Message) => confirmAction('Delete message?', 'It will be removed from this device.', 'Delete', () => { deleteMessage(m.id); deleteMedia(m.uri); });

  if (!isGroup && !member) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Stack.Screen options={{ title: 'Conversation' }} />
        <EmptyState icon="user-x" title="Conversation not found" body="This family member is no longer on this device." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title, headerRight: () => (
        <Pressable
          onPress={() => router.push({ pathname: '/call/[id]', params: { id: id! } })}
          accessibilityRole="button" accessibilityLabel={`Start a demo call with ${isGroup ? 'your family' : title}`}
          testID="start-demo-call"
          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Feather name="phone" size={20} color={c.primary} />
        </Pressable>
      ) }} />
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={{ flex: 1 }}>
        <FlatList
          data={data}
          inverted={data.length > 0}
          keyExtractor={(m) => m.id}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="message-square" title="Say hello" body={`Start the ${isGroup ? 'family group' : 'conversation'} with a note, a photo or your voice. This is a local demo; nothing is delivered to other phones yet.`} />}
          renderItem={({ item }) => {
            const mine = item.authorId === ME;
            const author = memberById(item.authorId);
            return (
              <Animated.View entering={FadeInUp.duration(250)} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                {!mine && isGroup ? (
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginLeft: 6, marginBottom: 3 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: c.mutedForeground }}>{author?.name}</Text>
                  </View>
                ) : null}
                <Pressable onLongPress={mine ? () => remove(item) : undefined} accessibilityHint={mine ? 'Long press to delete' : undefined}
                  style={[styles.bubble, mine ? { backgroundColor: c.primary, borderBottomRightRadius: 6 } : { backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderBottomLeftRadius: 6 }]}>
                  {item.kind === 'text' ? <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22, color: mine ? c.primaryForeground : c.foreground }}>{item.text}</Text> : null}
                  {item.kind === 'photo' && item.uri ? (
                    <Pressable onPress={() => setViewer(item.uri!)} accessibilityLabel="Open photo">
                      <Image source={{ uri: item.uri }} style={{ width: 220, height: 220, borderRadius: 14 }} contentFit="cover" />
                    </Pressable>
                  ) : null}
                  {item.kind === 'audio' && item.uri ? <AudioNote uri={item.uri} durationMs={item.durationMs} onDark={mine} /> : null}
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 3, marginHorizontal: 6 }}>
                  {item.sample ? <SampleTag /> : null}
                  <Text style={{ fontFamily: fonts.body, fontSize: 11, color: c.mutedForeground }}>{mine ? 'Local demo · ' : ''}{timeAgo(item.createdAt)}</Text>
                  {mine ? <Pressable onPress={() => remove(item)} hitSlop={8} accessibilityLabel="Delete message"><Feather name="trash-2" size={12} color={c.mutedForeground} /></Pressable> : null}
                </View>
              </Animated.View>
            );
          }}
        />
        <View style={[styles.composer, { borderTopColor: c.border, backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 10) + webBottom }]}>
          {denied ? <PermissionNotice what={denied.what} canAskAgain={denied.canAskAgain} onClose={() => setDenied(null)} /> : null}
          {rec.state === 'denied' || rec.state === 'blocked' ? <PermissionNotice what="microphone" canAskAgain={rec.state === 'denied'} onClose={rec.clear} /> : null}
          {error || rec.state === 'error' ? <Notice text={error ?? rec.error ?? 'Something went wrong.'} onClose={() => { setError(null); rec.clear(); }} /> : null}
          {rec.state === 'recording' ? (
            <RecordingBar elapsed={rec.elapsed} onStop={() => rec.stop(true)} onCancel={() => rec.stop(false)} />
          ) : (
            <View style={styles.row}>
              <Pressable onPress={() => photo('camera')} style={[styles.icon, { backgroundColor: c.goldSoft }]} accessibilityLabel="Send a photo from camera" testID="thread-camera">
                <Feather name="camera" size={20} color={c.secondaryForeground} />
              </Pressable>
              <Pressable onPress={() => photo('library')} style={[styles.icon, { backgroundColor: c.goldSoft }]} accessibilityLabel="Send a photo from library" testID="thread-library">
                <Feather name="image" size={20} color={c.secondaryForeground} />
              </Pressable>
                <TextInput value={text} onChangeText={setText} placeholder="Message in this demo" placeholderTextColor={c.mutedForeground} multiline maxLength={1000}
                style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.foreground }]} accessibilityLabel="Message" testID="thread-input" />
              {text.trim() ? (
                <Pressable onPress={send} style={[styles.icon, { backgroundColor: c.primary }]} accessibilityLabel="Send message" testID="thread-send">
                  <Feather name="arrow-up" size={22} color={c.primaryForeground} />
                </Pressable>
              ) : (
                <Pressable onPress={rec.start} style={[styles.icon, { backgroundColor: c.terracottaSoft }]} accessibilityLabel="Record a voice note" testID="thread-mic">
                  <Feather name="mic" size={20} color={c.terracotta} />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      <PhotoViewer uri={viewer} onClose={() => setViewer(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  composer: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontFamily: fonts.bodySemi, fontSize: 16 },
});
