import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PhotoViewer } from '@/components/PhotoViewer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState, Notice, PermissionNotice, PressScale, webBottom } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { ME, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { confirmAction } from '@/lib/confirm';
import { deleteMedia, haptic, pickPhoto } from '@/lib/media';

interface Item { id: string; uri: string; caption?: string; source: 'post' | 'message'; mine: boolean; createdAt: number }

export default function PhotosScreen() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { posts, messages, addPost, deletePost, deleteMessage } = useFamily();
  const [open, setOpen] = useState<Item | null>(null);
  const [denied, setDenied] = useState<{ canAskAgain: boolean; what: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo<Item[]>(() => [
    ...posts.filter((p) => p.kind === 'photo' && p.uri).map((p) => ({ id: p.id, uri: p.uri!, caption: p.text, source: 'post' as const, mine: p.authorId === ME, createdAt: p.createdAt })),
    ...messages.filter((m) => m.kind === 'photo' && m.uri).map((m) => ({ id: m.id, uri: m.uri!, source: 'message' as const, mine: m.authorId === ME, createdAt: m.createdAt })),
  ].sort((a, b) => b.createdAt - a.createdAt), [posts, messages]);

  const size = (Math.min(width, 700) - 16 * 2 - 8 * 2) / 3;

  const add = async (src: 'camera' | 'library') => {
    setError(null);
    const r = await pickPhoto(src);
    if (r.status === 'ok') { addPost({ kind: 'photo', uri: r.uri }); haptic.success(); setDenied(null); }
    else if (r.status === 'denied') setDenied({ canAskAgain: r.canAskAgain, what: src === 'camera' ? 'camera' : 'photo library' });
    else if (r.status === 'error') setError(r.message);
  };

  const remove = () => {
    if (!open) return;
    const it = open;
    confirmAction('Delete photo?', 'It will be removed from this device.', 'Delete', () => {
      if (it.source === 'post') deletePost(it.id); else deleteMessage(it.id);
      deleteMedia(it.uri);
      setOpen(null);
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader eyebrow={`${items.length} kept`} title="Memories" />
      <FlatList
        data={items}
        key="grid3"
        numColumns={3}
        keyExtractor={(i) => i.id}
        columnWrapperStyle={{ gap: 8 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 120 + webBottom }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PressScale onPress={() => add('camera')} style={[styles.btn, { backgroundColor: c.primary }]} testID="photos-camera" accessibilityRole="button">
                <Feather name="camera" size={18} color={c.accent} />
                <Text style={{ fontFamily: fonts.bodyBlack, color: c.primaryForeground, fontSize: 15 }}>Camera</Text>
              </PressScale>
              <PressScale onPress={() => add('library')} style={[styles.btn, { backgroundColor: c.goldSoft }]} testID="photos-library" accessibilityRole="button">
                <Feather name="image" size={18} color={c.secondaryForeground} />
                <Text style={{ fontFamily: fonts.bodyBlack, color: c.secondaryForeground, fontSize: 15 }}>From library</Text>
              </PressScale>
            </View>
            {denied ? <PermissionNotice what={denied.what} canAskAgain={denied.canAskAgain} onClose={() => setDenied(null)} /> : null}
            {error ? <Notice text={error} onClose={() => setError(null)} /> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState icon="camera" title="No memories yet" body="Photos you share in the feed or in messages gather here, like a shoebox of family snapshots." />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeIn.delay(Math.min(index, 12) * 30)}>
            <Pressable onPress={() => setOpen(item)} accessibilityLabel="Open photo">
              <Image source={{ uri: item.uri }} style={{ width: size, height: size, borderRadius: index % 5 === 0 ? 22 : 12, backgroundColor: c.muted }} contentFit="cover" transition={200} />
            </Pressable>
          </Animated.View>
        )}
      />
      <PhotoViewer uri={open?.uri ?? null} caption={open?.caption} onClose={() => setOpen(null)} onDelete={open?.mine ? remove : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderRadius: 16 },
});
