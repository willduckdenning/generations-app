import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, EmptyState, Notice, PressScale, webBottom, webTop } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { canUsePlanFeature } from '@/constants/planTiers';
import { ME, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { haptic } from '@/lib/media';

export default function CareSpaceScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const {
    profile, planTier, members, careSpace, createCareSpace, updateCareSpaceMembers,
    sendCareMessage, deleteCareMessage,
  } = useFamily();
  const canOpen = profile?.role === 'parent' && canUsePlanFeature(planTier, 'care-chat');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingParticipants, setEditingParticipants] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const selectedMembers = useMemo(() => careSpace?.memberIds.map((id) => members.find((member) => member.id === id)).filter(Boolean) ?? [], [careSpace, members]);

  const toggle = (id: string, values: string[], update: (next: string[]) => void) => {
    update(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  };
  const createSpace = () => {
    setError(null);
    if (!selectedIds.length) { setError('Choose at least one family member for this private space.'); return; }
    if (!createCareSpace(selectedIds)) { setError('The private care space could not be created. Check your plan and selected family members.'); return; }
    haptic.success();
  };
  const beginEditParticipants = () => {
    setDraftIds(careSpace?.memberIds ?? []);
    setEditingParticipants(true);
  };
  const saveParticipants = () => {
    if (!draftIds.length) { setError('Keep at least one family member in this private space.'); return; }
    updateCareSpaceMembers(draftIds);
    setEditingParticipants(false);
    setError(null);
    haptic.success();
  };
  const send = () => {
    if (!text.trim()) return;
    if (!sendCareMessage(text)) { setError('Your message could not be saved in the private demo.'); return; }
    setText('');
    setError(null);
    haptic.tap();
  };

  return (
    <View style={[styles.page, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + webTop + 8 }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/reminders')} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Feather name="chevron-left" size={28} color={c.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: c.terracotta, letterSpacing: 0.7 }}>CARE CIRCLE</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 26, color: c.foreground }}>Private caregiver space</Text>
        </View>
        <Avatar member={profile ? { id: ME, name: profile.name, role: profile.role, sample: false } : undefined} size={42} />
      </View>

      {!canOpen ? (
        <View style={styles.locked}>
          <View style={[styles.lockedIcon, { backgroundColor: c.goldSoft }]}><Feather name="lock" size={28} color={c.secondaryForeground} /></View>
          <Text style={[styles.heading, { color: c.foreground }]}>Care plan preview</Text>
          <Text style={[styles.body, { color: c.mutedForeground }]}>
            The private caregiver space is a Care-plan demo for the adult who creates it.
          </Text>
          <PressScale onPress={() => router.push('/settings')} style={[styles.cta, { backgroundColor: c.primary }]} testID="care-upgrade">
            <Text style={{ fontFamily: fonts.bodyBlack, color: c.primaryForeground }}>View plans in Settings</Text>
            <Feather name="arrow-right" size={18} color={c.primaryForeground} />
          </PressScale>
        </View>
      ) : !careSpace ? (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + webBottom + 32, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.intro, { backgroundColor: c.terracottaSoft }]}>
            <Feather name="lock" size={24} color={c.terracotta} />
            <Text style={[styles.body, { color: c.foreground }]}>
              Create a private space for you and only the family members you select. Messages stay on this device in the demo.
            </Text>
          </View>
          <View style={[styles.memberPicker, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.heading, { color: c.foreground }]}>Choose who can join</Text>
            <Text style={[styles.body, { color: c.mutedForeground }]}>You are the adult creator. Select at least one relative.</Text>
            {members.length ? members.map((member) => {
              const selected = selectedIds.includes(member.id);
              return (
                <PressScale key={member.id} onPress={() => toggle(member.id, selectedIds, setSelectedIds)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} testID={`care-select-${member.id}`}
                  style={[styles.memberRow, { backgroundColor: selected ? c.greenSoft : c.background, borderColor: selected ? c.primary : c.border }]}>
                  <Avatar member={member} size={42} />
                  <Text style={{ flex: 1, fontFamily: fonts.bodyBlack, color: c.foreground }}>{member.name}</Text>
                  <Feather name={selected ? 'check-square' : 'square'} size={20} color={selected ? c.primary : c.mutedForeground} />
                </PressScale>
              );
            }) : (
              <View style={{ gap: 10 }}>
                <EmptyState icon="users" title="No relatives on this device" body="Create a family room with sample relatives first, then choose who joins this private space." />
                <PressScale onPress={() => router.push('/family')} style={[styles.cta, { backgroundColor: c.primary }]} testID="care-add-family">
                  <Text style={{ fontFamily: fonts.bodyBlack, color: c.primaryForeground }}>Open family rooms</Text>
                  <Feather name="arrow-right" size={18} color={c.primaryForeground} />
                </PressScale>
              </View>
            )}
            {error ? <Text style={[styles.error, { color: c.destructive }]} accessibilityRole="alert">{error}</Text> : null}
            {members.length ? (
              <PressScale onPress={createSpace} style={[styles.cta, { backgroundColor: c.primary }]} accessibilityRole="button" testID="create-care-space">
                <Text style={{ fontFamily: fonts.bodyBlack, color: c.primaryForeground }}>Create private space</Text>
                <Feather name="arrow-right" size={18} color={c.primaryForeground} />
              </PressScale>
            ) : null}
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
            <View style={[styles.privacyBanner, { backgroundColor: c.goldSoft }]}>
              <Feather name="lock" size={17} color={c.secondaryForeground} />
              <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: c.foreground }}>
                Private on this device · {profile?.name} and selected members only
              </Text>
            </View>
            <View style={styles.participantHeading}>
              <Text style={[styles.participantLabel, { color: c.mutedForeground }]}>
                {selectedMembers.map((member) => member?.name).filter(Boolean).join(' · ') || 'No selected relatives'}
              </Text>
              <Pressable onPress={beginEditParticipants} accessibilityRole="button" accessibilityLabel="Choose private space members" testID="edit-care-members" hitSlop={8}>
                <Feather name="edit-2" size={17} color={c.primary} />
              </Pressable>
            </View>
            <PressScale onPress={() => router.push({ pathname: '/(tabs)/reminders', params: { kind: 'care' } })} style={[styles.careReminderButton, { backgroundColor: c.terracottaSoft }]} accessibilityRole="button" testID="care-reminder-link">
              <Feather name="calendar" size={18} color={c.terracotta} />
              <Text style={{ flex: 1, fontFamily: fonts.bodyBlack, color: c.foreground }}>Add a care reminder</Text>
              <Feather name="arrow-right" size={17} color={c.terracotta} />
            </PressScale>
          </View>

          {editingParticipants ? (
            <View style={[styles.editParticipants, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.heading, { color: c.foreground }]}>Private members</Text>
              {members.map((member) => {
                const selected = draftIds.includes(member.id);
                return (
                  <PressScale key={member.id} onPress={() => toggle(member.id, draftIds, setDraftIds)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} testID={`care-edit-${member.id}`}
                    style={[styles.memberRow, { backgroundColor: selected ? c.greenSoft : c.background, borderColor: selected ? c.primary : c.border }]}>
                    <Text style={{ flex: 1, fontFamily: fonts.bodySemi, color: c.foreground }}>{member.name}</Text>
                    <Feather name={selected ? 'check-square' : 'square'} size={19} color={selected ? c.primary : c.mutedForeground} />
                  </PressScale>
                );
              })}
              {error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <PressScale onPress={() => { setEditingParticipants(false); setError(null); }} style={[styles.smallButton, { backgroundColor: c.muted }]}>
                  <Text style={{ fontFamily: fonts.bodyBlack, color: c.foreground }}>Cancel</Text>
                </PressScale>
                <PressScale onPress={saveParticipants} style={[styles.smallButton, { backgroundColor: c.primary }]} testID="save-care-members">
                  <Text style={{ fontFamily: fonts.bodyBlack, color: c.primaryForeground }}>Save</Text>
                </PressScale>
              </View>
            </View>
          ) : null}

          {error && !editingParticipants ? <Notice text={error} /> : null}
          <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={{ flex: 1 }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10, flexGrow: 1 }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
            >
              {careSpace.messages.length ? careSpace.messages.map((message) => {
                const mine = message.authorId === ME;
                return (
                  <View key={message.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                    <View style={[styles.chatBubble, { backgroundColor: mine ? c.primary : c.card, borderColor: c.border }]}>
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22, color: mine ? c.primaryForeground : c.foreground }}>{message.text}</Text>
                    </View>
                    <View style={styles.messageMeta}>
                      <Text style={{ fontFamily: fonts.body, fontSize: 11, color: c.mutedForeground }}>{mine ? 'You · local demo' : 'Family member'} · {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                      {mine ? <Pressable onPress={() => deleteCareMessage(message.id)} accessibilityRole="button" accessibilityLabel="Delete private message" testID={`delete-care-message-${message.id}`} hitSlop={8}><Feather name="trash-2" size={13} color={c.mutedForeground} /></Pressable> : null}
                    </View>
                  </View>
                );
              }) : (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <EmptyState icon="message-circle" title="Start a private check-in" body="Only you and the selected family members appear in this local care chat." />
                </View>
              )}
            </ScrollView>
            <View style={[styles.composer, { borderTopColor: c.border, backgroundColor: c.background, paddingBottom: insets.bottom + webBottom + 10 }]}>
              <TextInput value={text} onChangeText={setText} placeholder="Message your private care group" placeholderTextColor={c.mutedForeground} multiline maxLength={1000}
                style={[styles.messageInput, { backgroundColor: c.card, borderColor: c.border, color: c.foreground }]} accessibilityLabel="Private caregiver message" testID="care-message-input" />
              <Pressable onPress={send} disabled={!text.trim()} style={[styles.sendButton, { backgroundColor: text.trim() ? c.primary : c.muted }]} accessibilityRole="button" accessibilityLabel="Send private message" testID="care-message-send">
                <Feather name="arrow-up" size={21} color={text.trim() ? c.primaryForeground : c.mutedForeground} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  locked: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 14 },
  lockedIcon: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: fonts.display, fontSize: 23 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  cta: { alignSelf: 'stretch', minHeight: 54, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  intro: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 16, borderRadius: 18 },
  memberPicker: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 12 },
  memberRow: { minHeight: 52, borderWidth: 1, borderRadius: 15, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18 },
  privacyBanner: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  participantHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  participantLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13 },
  careReminderButton: { minHeight: 48, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  editParticipants: { margin: 16, marginBottom: 0, borderWidth: 1, borderRadius: 20, padding: 14, gap: 9 },
  smallButton: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  chatBubble: { maxWidth: '84%', borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  messageMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 5, marginTop: 3 },
  composer: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageInput: { flex: 1, minHeight: 46, maxHeight: 120, borderWidth: 1, borderRadius: 22, paddingHorizontal: 15, paddingTop: 11, paddingBottom: 11, fontFamily: fonts.bodySemi, fontSize: 15 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
