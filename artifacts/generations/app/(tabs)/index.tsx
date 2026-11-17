import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PhotoViewer } from '@/components/PhotoViewer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState, Notice, PostCard, PressScale, SkeletonFeed, webBottom } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { GROUP_THREAD, ME, Post, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { confirmAction } from '@/lib/confirm';
import { deleteMedia } from '@/lib/media';

export default function FeedScreen() {
  const c = useColors();
  const { ready, profile, posts, deletePost, saveError } = useFamily();
  const [viewer, setViewer] = useState<string | null>(null);
  const mine = posts.filter((p) => p.authorId === ME).length;
  const onDelete = (p: Post) => confirmAction('Delete post?', 'This removes it from this device.', 'Delete', () => { deletePost(p.id); deleteMedia(p.uri); });
  const greeting = profile?.role === 'grandchild' ? `${mine} moment${mine === 1 ? '' : 's'} shared` : 'Today at home';

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader eyebrow={profile?.circleName} title={greeting} right={
        <Pressable onPress={() => router.push({ pathname: '/call/[id]', params: { id: GROUP_THREAD } })} accessibilityRole="button" accessibilityLabel="Call family" testID="home-call"
          style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent }}>
          <Feather name="phone" size={21} color={c.accentForeground} />
        </Pressable>
      } />
      {!ready ? <SkeletonFeed /> : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: 120 + webBottom }}
          ListHeaderComponent={
            <View style={{ gap: 12, marginBottom: 2 }}>
              {saveError ? <Notice text={`Could not save: ${saveError}`} /> : null}
              <View style={styles.quickRow}>
                {([
                  { k: 'text', label: 'Write', icon: 'edit-3' },
                  { k: 'photo', label: 'Photo', icon: 'camera' },
                  { k: 'audio', label: 'Voice', icon: 'mic' },
                ] as const).map((q, i) => (
                  <PressScale key={q.k} onPress={() => router.push({ pathname: '/compose', params: { mode: q.k } })} testID={`compose-${q.k}`}
                    style={[styles.quick, { backgroundColor: i === 0 ? c.primary : i === 1 ? c.goldSoft : c.terracottaSoft }]} accessibilityRole="button" accessibilityLabel={`New ${q.label} post`}>
                    <Feather name={q.icon} size={20} color={i === 0 ? c.accent : i === 1 ? c.secondaryForeground : c.terracotta} />
                    <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: i === 0 ? c.primaryForeground : c.foreground }}>{q.label}</Text>
                  </PressScale>
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="coffee" title="The living room is quiet" body="Share a note, a photo or your voice. It will sit here on this device for you to look back on." />}
          renderItem={({ item, index }) => <PostCard post={item} index={index} onDelete={onDelete} onOpenPhoto={setViewer} />}
        />
      )}
      <PhotoViewer uri={viewer} onClose={() => setViewer(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', gap: 10 },
  quick: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54, borderRadius: 18 },
});
