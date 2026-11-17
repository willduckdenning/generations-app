import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar, Notice, OnDevicePill, PressScale } from '@/components/ui';
import { PlanSelector } from '@/components/PlanSelector';
import { fonts } from '@/constants/colors';
import { GROUP_THREAD, ME, homeRouteFor, Role, roleLabel, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { confirmAction } from '@/lib/confirm';
import { deleteMedia, haptic } from '@/lib/media';

function EditableField({ label, value, onSave, testID }: { label: string; value: string; onSave: (v: string) => void; testID: string }) {
  const c = useColors();
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const ok = draft.trim().length > 0;
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: c.mutedForeground }]}>{label}</Text>
      {editing ? (
        <View style={{ gap: 10 }}>
          <TextInput value={draft} onChangeText={setDraft} autoFocus maxLength={40} accessibilityLabel={label} testID={`${testID}-input`}
            style={[styles.input, { borderColor: ok ? c.primary : c.destructive, color: c.foreground, backgroundColor: c.background }]} />
          {!ok ? <Text style={{ fontFamily: fonts.bodySemi, color: c.destructive, fontSize: 13 }}>This cannot be empty.</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressScale onPress={() => { setDraft(value); setEditing(false); }} style={[styles.smallBtn, { backgroundColor: c.muted }]}>
              <Text style={{ fontFamily: fonts.bodyBlack, color: c.foreground }}>Cancel</Text>
            </PressScale>
            <PressScale disabled={!ok} onPress={() => { onSave(draft.trim()); setEditing(false); haptic.success(); }} style={[styles.smallBtn, { backgroundColor: c.primary }]} testID={`${testID}-save`}>
              <Text style={{ fontFamily: fonts.bodyBlack, color: c.primaryForeground }}>Save</Text>
            </PressScale>
          </View>
        </View>
      ) : (
        <PressScale onPress={() => { setDraft(value); setEditing(true); }} style={[styles.fieldRow, { backgroundColor: c.background }]} accessibilityLabel={`Edit ${label}`} testID={`${testID}-edit`}>
          <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 18, color: c.foreground }}>{value}</Text>
          <Feather name="edit-2" size={18} color={c.primary} />
        </PressScale>
      )}
    </View>
  );
}

export function SettingsView() {
  const c = useColors();
  const { profile, me, members, messages, activeFamily, familyRooms, planTier, billingCycle, setPlanTier, setBillingCycle, updateProfile, removeSamples, resetAll, saveError } = useFamily();
  const [resetError, setResetError] = useState<string | null>(null);
  if (!profile) return null;

  const switchRole = (r: Role) => {
    if (r === profile.role) return;
    haptic.success();
    updateProfile({ role: r });
    if (router.canDismiss()) router.dismissAll();
    router.replace(homeRouteFor(r));
  };

  return (
    <View style={{ gap: 18 }}>
      <View style={[styles.hero, { backgroundColor: c.primary }]}>
        <Avatar member={me ?? undefined} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 26, color: c.primaryForeground }}>{profile.name}</Text>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: c.goldSoft }}>{roleLabel[profile.role]} · {profile.phone || 'Demo profile'}</Text>
        </View>
        <Image source={require('@/assets/images/icon.png')} style={{ width: 44, height: 44, borderRadius: 12 }} />
      </View>

      {saveError ? <Notice text={`Changes may not be saved: ${saveError}`} /> : null}

      <PlanSelector
        selectedTier={planTier}
        billingCycle={billingCycle}
        onSelectTier={setPlanTier}
        onSelectBillingCycle={setBillingCycle}
      />

      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <EditableField label="Your first name" value={profile.name} onSave={(v) => updateProfile({ name: v })} testID="name" />
        <EditableField label="Family circle name" value={profile.circleName} onSave={(v) => updateProfile({ circleName: v })} testID="circle" />
      </View>

      <View style={[styles.section, { backgroundColor: c.greenSoft, borderColor: c.border }]}>
        <Text style={[styles.h, { color: c.foreground }]}>Family rooms</Text>
        <Text style={[styles.p, { color: c.foreground }]}>
          {familyRooms.length} room{familyRooms.length === 1 ? '' : 's'} on this device{activeFamily ? ` · Active: ${activeFamily.name} · ${activeFamily.code}` : ''}.
        </Text>
        <PressScale onPress={() => router.push('/family')} style={[styles.smallBtn, { backgroundColor: c.primary, alignSelf: 'flex-start' }]} testID="manage-family">
          <Text style={{ fontFamily: fonts.bodyBlack, color: c.primaryForeground }}>Create or join family</Text>
        </PressScale>
      </View>

      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.h, { color: c.foreground }]}>Your role</Text>
        <Text style={[styles.p, { color: c.mutedForeground }]}>Switch to see how Generations feels for each person in the family.</Text>
        {(['grandparent', 'parent', 'grandchild'] as Role[]).map((r) => {
          const on = profile.role === r;
          return (
            <PressScale key={r} onPress={() => switchRole(r)} accessibilityRole="radio" accessibilityState={{ selected: on }} testID={`switch-${r}`}
              style={[styles.roleRow, { backgroundColor: on ? c.greenSoft : c.background, borderColor: on ? c.primary : c.border }]}>
              <Text style={{ flex: 1, fontFamily: fonts.bodyBlack, fontSize: 18, color: on ? c.primary : c.foreground }}>{roleLabel[r]}</Text>
              {on ? <Feather name="check" size={20} color={c.primary} /> : null}
            </PressScale>
          );
        })}
      </View>

      <View style={[styles.section, { backgroundColor: c.goldSoft, borderColor: c.border }]}>
        <OnDevicePill />
        <Text style={[styles.h, { color: c.foreground }]}>Where your family room lives</Text>
        <Text style={[styles.p, { color: c.foreground }]}>
          Your phone-number account, room codes, posts and messages are demo-only and saved on this device. No SMS verification, real calls or cross-device message delivery is connected. Use test numbers only.
        </Text>
        {members.length ? (
          <>
            <Text style={[styles.p, { color: c.foreground }]}>The relatives {members.map((m) => m.name).join(', ')} are a sample family for demonstration only.</Text>
            <PressScale onPress={() => confirmAction('Remove sample family?', 'Sample relatives, their posts and messages, and your private conversations with them (including messages you sent there) will be removed. Your own feed posts and family group messages stay.', 'Remove', () => {
              messages.filter((m) => m.threadId !== GROUP_THREAD && m.authorId === ME).forEach((m) => deleteMedia(m.uri));
              removeSamples(); haptic.success();
            })}
              style={[styles.smallBtn, { backgroundColor: c.card, alignSelf: 'flex-start' }]} testID="remove-samples">
              <Text style={{ fontFamily: fonts.bodyBlack, color: c.foreground }}>Remove sample family</Text>
            </PressScale>
          </>
        ) : null}
      </View>

      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.h, { color: c.foreground }]}>Start over</Text>
        <Text style={[styles.p, { color: c.mutedForeground }]}>Erase everything saved on this device and return to setup.</Text>
        {resetError ? <Notice text={resetError} /> : null}
        <PressScale
          onPress={() => confirmAction('Erase this device?', 'All posts, photos, voice notes and messages on this device will be permanently removed.', 'Erase', async () => {
            try { await resetAll(); router.replace('/onboarding'); } catch (e) { setResetError(e instanceof Error ? e.message : 'Could not erase data.'); if (e instanceof Error && e.message.startsWith('Your data was erased')) router.replace('/onboarding'); }
          })}
          style={[styles.smallBtn, { backgroundColor: c.terracottaSoft, alignSelf: 'flex-start' }]} testID="reset">
          <Text style={{ fontFamily: fonts.bodyBlack, color: c.destructive }}>Erase and start over</Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 26 },
  section: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 12 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.4 },
  h: { fontFamily: fonts.display, fontSize: 20 },
  p: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, fontFamily: fonts.bodyBold, fontSize: 18 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, minHeight: 52 },
  smallBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  roleRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, minHeight: 56 },
});
