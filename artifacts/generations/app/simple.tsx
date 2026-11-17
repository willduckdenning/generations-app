import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoViewer } from '@/components/PhotoViewer';
import { EmptyState, Notice, OnDevicePill, PermissionNotice, PostCard, PressScale, webBottom, webTop } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { GROUP_THREAD, Post, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { confirmAction } from '@/lib/confirm';
import { deleteMedia, haptic, pickPhoto } from '@/lib/media';

export default function SimpleHome() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { profile, posts, addPost, deletePost } = useFamily();
  const list = useRef<FlatList<Post>>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [denied, setDenied] = useState<{ canAskAgain: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);

  const takePicture = async () => {
    setError(null);
    const r = await pickPhoto('camera');
    if (r.status === 'ok') { setPending(r.uri); setDenied(null); }
    else if (r.status === 'denied') setDenied({ canAskAgain: r.canAskAgain });
    else if (r.status === 'error') setError(r.message);
  };
  const share = () => {
    if (!pending) return;
    addPost({ kind: 'photo', uri: pending, text: caption.trim() || undefined });
    haptic.success();
    setPending(null); setCaption('');
    list.current?.scrollToOffset({ offset: 0, animated: true });
  };
  const onDelete = (p: Post) => confirmAction('Delete this?', 'It will be removed from this device.', 'Delete', () => { deletePost(p.id); deleteMedia(p.uri); });

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { paddingTop: insets.top + webTop + 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image source={require('@/assets/images/icon.png')} style={{ width: 48, height: 48, borderRadius: 14 }} accessibilityIgnoresInvertColors />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 28, color: c.foreground }} numberOfLines={1}>Hello, {profile?.name}</Text>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: c.mutedForeground }} numberOfLines={1}>{profile?.circleName}</Text>
          </View>
          <Pressable onPress={() => router.push({ pathname: '/call/[id]', params: { id: GROUP_THREAD } })} style={[styles.settings, { backgroundColor: c.accent }]} accessibilityRole="button" accessibilityLabel="Call family" testID="simple-call">
            <Feather name="phone" size={22} color={c.accentForeground} />
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} style={[styles.settings, { backgroundColor: c.muted }]} accessibilityRole="button" accessibilityLabel="Settings" testID="simple-settings">
            <Feather name="settings" size={22} color={c.foreground} />
          </Pressable>
        </View>
        <OnDevicePill large />
      </View>

      <FlatList
        ref={list}
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 18, gap: 18, paddingBottom: 200 + insets.bottom + webBottom }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {denied ? <PermissionNotice what="camera" canAskAgain={denied.canAskAgain} onClose={() => setDenied(null)} /> : null}
            {error ? <Notice text={error} onClose={() => setError(null)} /> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState icon="image" title="Nothing here yet" body="Tap Take a Picture below to share a moment with the family." />}
        renderItem={({ item, index }) => <PostCard post={item} simple index={index} onDelete={onDelete} onOpenPhoto={setViewer} />}
      />

      <View style={[styles.dock, { paddingBottom: insets.bottom + webBottom + 14, backgroundColor: c.background, borderTopColor: c.border }]}>
        <PressScale onPress={() => list.current?.scrollToOffset({ offset: 0, animated: true })} style={[styles.big, { backgroundColor: c.goldSoft }]} accessibilityRole="button" accessibilityLabel="Main Home" testID="simple-home">
          <Feather name="home" size={34} color={c.secondaryForeground} />
          <Text style={[styles.bigText, { color: c.secondaryForeground }]}>Home</Text>
        </PressScale>
        <PressScale onPress={takePicture} style={[styles.big, { backgroundColor: c.primary }]} accessibilityRole="button" accessibilityLabel="Take a Picture" testID="simple-camera">
          <Feather name="camera" size={34} color={c.accent} />
          <Text style={[styles.bigText, { color: c.primaryForeground }]}>Take a Picture</Text>
        </PressScale>
      </View>

      {pending ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(34,48,31,0.55)' }]}>
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View entering={FadeInUp.springify().damping(18)} style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + webBottom + 20 }]}>
              <Text style={{ fontFamily: fonts.display, fontSize: 28, color: c.foreground }}>Share this picture?</Text>
              <Image source={{ uri: pending }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 20 }} contentFit="cover" />
              <TextInput value={caption} onChangeText={setCaption} placeholder="Add a few words (optional)" placeholderTextColor={c.mutedForeground}
                style={[styles.caption, { borderColor: c.border, color: c.foreground, backgroundColor: c.card }]} accessibilityLabel="Caption" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <PressScale onPress={() => { deleteMedia(pending); setPending(null); setCaption(''); }} style={[styles.sheetBtn, { backgroundColor: c.muted }]} accessibilityRole="button">
                  <Text style={[styles.sheetBtnText, { color: c.foreground }]}>Not now</Text>
                </PressScale>
                <PressScale onPress={share} style={[styles.sheetBtn, { backgroundColor: c.primary }]} accessibilityRole="button" testID="simple-share">
                  <Text style={[styles.sheetBtnText, { color: c.primaryForeground }]}>Share</Text>
                </PressScale>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      ) : null}
      <PhotoViewer uri={viewer} onClose={() => setViewer(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 10, gap: 12 },
  settings: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1 },
  big: { flex: 1, minHeight: 112, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 8 },
  bigText: { fontFamily: fonts.bodyBlack, fontSize: 21 },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22, gap: 16 },
  caption: { borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 16, minHeight: 60, fontFamily: fonts.bodySemi, fontSize: 20 },
  sheetBtn: { flex: 1, minHeight: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { fontFamily: fonts.bodyBlack, fontSize: 21 },
});
