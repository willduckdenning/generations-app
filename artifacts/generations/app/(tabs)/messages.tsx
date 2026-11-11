import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Avatar, EmptyState, PressScale, SampleTag, webBottom } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { ME, roleLabel, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { timeAgo } from '@/lib/media';

export default function MessagesScreen() {
  const c = useColors();
  const { threads, messages, profile, memberById, members } = useFamily();

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader eyebrow="Conversations" title="Messages" />
      <FlatList
        data={threads}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 120 + webBottom }}
        ListFooterComponent={members.length === 0 ? (
          <EmptyState icon="users" title="Just you for now" body="Individual conversations appear for family members on this device. Family sync and invites are not available yet." />
        ) : (
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: c.mutedForeground, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 }}>
            Messages are saved on this device only and are not delivered to anyone yet.
          </Text>
        )}
        renderItem={({ item }) => {
          const msgs = messages.filter((m) => m.threadId === item.id);
          const last = msgs[msgs.length - 1];
          const group = item.kind === 'group';
          const member = item.memberId ? memberById(item.memberId) : undefined;
          const preview = last ? `${last.authorId === ME ? 'You: ' : ''}${last.kind === 'photo' ? 'Photo' : last.kind === 'audio' ? 'Voice note' : last.text}` : 'No messages yet';
          return (
            <PressScale onPress={() => router.push({ pathname: '/thread/[id]', params: { id: item.id } })} scaleTo={0.98} testID={`thread-${item.id}`}
              style={[styles.row, { backgroundColor: group ? c.primary : c.card, borderColor: group ? c.primary : c.border }]} accessibilityRole="button">
              {group ? (
                <View style={[styles.groupIcon, { backgroundColor: c.accent }]}><Feather name="users" size={22} color={c.accentForeground} /></View>
              ) : <Avatar member={member} size={50} />}
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 19, color: group ? c.primaryForeground : c.foreground, flexShrink: 1 }} numberOfLines={1}>
                    {group ? profile?.circleName ?? 'Family' : member?.name}
                  </Text>
                  {member?.sample ? <SampleTag /> : null}
                </View>
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: group ? c.goldSoft : c.mutedForeground }} numberOfLines={1}>
                  {group ? 'Family group · ' : member ? `${roleLabel[member.role]} · ` : ''}{preview}
                </Text>
              </View>
              {last ? <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: group ? c.goldSoft : c.mutedForeground }}>{timeAgo(last.createdAt)}</Text> : null}
            </PressScale>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, borderWidth: 1 },
  groupIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
});
