import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReminderEditor } from '@/components/ReminderEditor';
import { ScreenHeader } from '@/components/ScreenHeader';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { BackButton } from '@/components/BackButton';
import { EmptyState, Notice, PressScale, webBottom } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { canUsePlanFeature } from '@/constants/planTiers';
import { FamilyReminder, ME, ReminderKind, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { confirmAction } from '@/lib/confirm';
import { nextReminderOccurrence, reminderScheduleLabel } from '@/lib/reminders';

export function RemindersView({ grandparent = false }: { grandparent?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string }>();
  const {
    profile, planTier, members, reminders, memberById, deleteReminder, saveError,
  } = useFamily();
  const [now, setNow] = useState(() => new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<ReminderKind>('general');
  const [editing, setEditing] = useState<FamilyReminder | undefined>(undefined);
  const canDuo = canUsePlanFeature(planTier, 'duo-call');
  const canCustomTimes = canUsePlanFeature(planTier, 'custom-reminders');
  const canCare = profile?.role === 'parent' && canUsePlanFeature(planTier, 'care-chat');
  const ordered = useMemo(() => reminders
    .map((reminder) => ({ reminder, next: nextReminderOccurrence(reminder, now) }))
    .sort((a, b) => {
      if (!a.next && !b.next) return b.reminder.createdAt - a.reminder.createdAt;
      if (!a.next) return 1;
      if (!b.next) return -1;
      return a.next.getTime() - b.next.getTime();
    }), [reminders, now]);
  const dueCount = ordered.filter(({ next }) => next && next.getTime() <= now.getTime()).length;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (params.kind === 'care' && canCare) {
      setFormKind('care');
      setEditing(undefined);
      setFormOpen(true);
    }
  }, [params.kind, canCare]);

  const openForm = (kind: ReminderKind) => {
    setFormKind(kind);
    setEditing(undefined);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(undefined);
  };
  const editReminder = (reminder: FamilyReminder) => {
    setFormKind(reminder.kind);
    setEditing(reminder);
    setFormOpen(true);
  };
  const removeReminder = (reminder: FamilyReminder) => confirmAction(
    'Delete reminder?',
    'It will be removed from this device.',
    'Delete',
    () => deleteReminder(reminder.id),
  );
  const recipientsLabel = (reminder: FamilyReminder) => {
    if (reminder.recipientIds.length >= members.length + 1) return 'Everyone in this family';
    const labels = reminder.recipientIds.map((id) => id === ME ? 'You' : memberById(id)?.name).filter(Boolean);
    return labels.length ? labels.join(', ') : 'No recipients selected';
  };
  const formatOccurrence = (date: Date) => date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader
        eyebrow={grandparent ? 'For you' : profile?.circleName}
        title={grandparent ? 'Family reminders' : 'Reminders'}
        left={grandparent ? (
          <BackButton
            onPress={() => router.canGoBack() ? router.back() : router.replace('/simple')}
            testID="grandparent-reminders-back"
          />
        ) : undefined}
        right={canCare ? (
          <Pressable onPress={() => router.push('/care')} accessibilityRole="button" accessibilityLabel="Open private caregiver space" testID="open-care-space"
            style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: c.terracottaSoft }}>
            <Feather name="users" size={21} color={c.terracotta} />
          </Pressable>
        ) : undefined}
      />

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: grandparent ? 18 : 16,
          paddingBottom: insets.bottom + webBottom + (grandparent ? 36 : 112),
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        {saveError ? <Notice text={`Changes may not be saved: ${saveError}`} /> : null}

        {grandparent ? (
          <View style={[styles.spotlight, { backgroundColor: c.accent }]}>
            <View style={[styles.spotlightIcon, { backgroundColor: c.primary }]}>
              <Feather name="bell" size={25} color={c.primaryForeground} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.spotlightTitle, { color: c.accentForeground }]}>
                {dueCount ? `${dueCount} reminder${dueCount === 1 ? '' : 's'} ready` : 'A little plan for today'}
              </Text>
              <Text style={[styles.spotlightBody, { color: c.accentForeground }]}>
                {reminders.length ? 'Your family reminders are saved here.' : 'Add a family reminder to see it here.'}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.notice, { backgroundColor: c.goldSoft, borderColor: c.border }]}>
          <Feather name="smartphone" size={18} color={c.secondaryForeground} />
          <Text style={[styles.noticeText, { color: c.foreground }]}>
            Local demo only. Reminders appear in this app; no push alert is sent to another phone.
          </Text>
        </View>

        {!formOpen ? (
          <View style={{ gap: 10 }}>
            <PressScale onPress={() => openForm('general')} style={[styles.primaryAction, { backgroundColor: c.primary }]} accessibilityRole="button" testID="new-general-reminder">
              <Feather name="plus" size={19} color={c.primaryForeground} />
              <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 16, color: c.primaryForeground }}>New family reminder</Text>
            </PressScale>
            {canDuo ? (
              <PressScale onPress={() => openForm('duo')} style={[styles.secondaryAction, { backgroundColor: c.greenSoft, borderColor: c.border }]} accessibilityRole="button" testID="new-duo-reminder">
                <Feather name="phone" size={18} color={c.primary} />
                <Text style={{ fontFamily: fonts.bodyBlack, color: c.foreground }}>Schedule a Duo call</Text>
              </PressScale>
            ) : (
              <PressScale onPress={() => router.push('/settings')} style={[styles.lockedAction, { backgroundColor: c.card, borderColor: c.border }]} accessibilityRole="button" testID="locked-duo-reminder">
                <Feather name="lock" size={17} color={c.terracotta} />
                <Text style={{ flex: 1, fontFamily: fonts.bodyBold, color: c.foreground }}>Duo call reminders are in Family and Care</Text>
                <Feather name="arrow-right" size={17} color={c.primary} />
              </PressScale>
            )}
            {profile?.role === 'parent' ? canCare ? (
              <PressScale onPress={() => router.push('/care')} style={[styles.secondaryAction, { backgroundColor: c.terracottaSoft, borderColor: c.border }]} accessibilityRole="button" testID="care-space-action">
                <Feather name="heart" size={18} color={c.terracotta} />
                <Text style={{ fontFamily: fonts.bodyBlack, color: c.foreground }}>Private caregiver space</Text>
              </PressScale>
            ) : (
              <PressScale onPress={() => router.push('/settings')} style={[styles.lockedAction, { backgroundColor: c.card, borderColor: c.border }]} accessibilityRole="button" testID="locked-care-space">
                <Feather name="lock" size={17} color={c.terracotta} />
                <Text style={{ flex: 1, fontFamily: fonts.bodyBold, color: c.foreground }}>Caregiver tools are in the Care plan</Text>
                <Feather name="arrow-right" size={17} color={c.primary} />
              </PressScale>
            ) : null}
            {!canCustomTimes ? (
              <Text style={[styles.smallNote, { color: c.mutedForeground }]}>
                Connect reminders use one fixed time. Custom multiple times are available in Family and Care.
              </Text>
            ) : null}
          </View>
        ) : null}

        {formOpen ? (
          <ReminderEditor
            kind={formKind}
            initial={editing}
            onCancel={closeForm}
            onSaved={closeForm}
          />
        ) : null}

        <View style={{ gap: 10 }}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>{grandparent ? 'Your reminders' : 'Upcoming'}</Text>
          {!ordered.length ? (
            <EmptyState icon="calendar" title="Nothing scheduled yet" body="Create a reminder for this family. It will stay on this device in the demo." />
          ) : ordered.map(({ reminder, next }) => {
            const isDue = !!next && next.getTime() <= now.getTime();
            const isPast = !next;
            const canManage = (reminder.kind !== 'duo' || canDuo)
              && (reminder.kind !== 'care' || canCare)
              && (reminder.times.length <= 1 || canCustomTimes);
            const memberName = reminder.duoMemberId ? memberById(reminder.duoMemberId)?.name : undefined;
            const categoryName = reminder.category === 'Custom' ? reminder.customCategory || 'Custom care' : reminder.category;
            return (
              <View key={reminder.id} style={[styles.reminderCard, { backgroundColor: isDue ? c.goldSoft : c.card, borderColor: isDue ? c.accent : c.border }]}>
                <View style={styles.reminderHeading}>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={styles.badgeRow}>
                      <Text style={[styles.kindBadge, { backgroundColor: reminder.kind === 'duo' ? c.greenSoft : reminder.kind === 'care' ? c.terracottaSoft : c.muted, color: reminder.kind === 'care' ? c.terracotta : c.primary }]}>
                        {reminder.kind === 'duo' ? 'DUO CALL' : reminder.kind === 'care' ? 'CARE' : 'FAMILY'}
                      </Text>
                      {categoryName ? <Text style={[styles.kindBadge, { backgroundColor: c.muted, color: c.foreground }]}>{categoryName.toUpperCase()}</Text> : null}
                    </View>
                    <Text style={[styles.reminderTitle, { color: c.foreground }]}>{reminder.title}</Text>
                  </View>
                  {canManage ? (
                    <>
                      <Pressable onPress={() => editReminder(reminder)} accessibilityRole="button" accessibilityLabel={`Edit ${reminder.title}`} testID={`edit-reminder-${reminder.id}`} hitSlop={8}>
                        <Feather name="edit-2" size={18} color={c.primary} />
                      </Pressable>
                      <Pressable onPress={() => removeReminder(reminder)} accessibilityRole="button" accessibilityLabel={`Delete ${reminder.title}`} testID={`delete-reminder-${reminder.id}`} hitSlop={8}>
                        <Feather name="trash-2" size={18} color={c.terracotta} />
                      </Pressable>
                    </>
                  ) : (
                    <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="See plan options" testID={`locked-reminder-${reminder.id}`} hitSlop={8}>
                      <Feather name="lock" size={18} color={c.terracotta} />
                    </Pressable>
                  )}
                </View>
                <Text style={[styles.detail, { color: c.foreground }]}>{reminderScheduleLabel(reminder)}</Text>
                <Text style={[styles.smallNote, { color: c.mutedForeground }]}>
                  For: {recipientsLabel(reminder)}{reminder.guestIds.length ? ` · Guests: ${reminder.guestIds.map((id) => memberById(id)?.name).filter(Boolean).join(', ')}` : ''}
                </Text>
                {reminder.note ? <Text style={[styles.smallNote, { color: c.mutedForeground }]}>{reminder.note}</Text> : null}
                {isDue ? (
                  <View style={[styles.dueBanner, { backgroundColor: c.primary }]}>
                    <Feather name="bell" size={16} color={c.primaryForeground} />
                    <Text style={{ flex: 1, fontFamily: fonts.bodyBlack, color: c.primaryForeground }}>
                      {reminder.kind === 'duo' && canDuo ? `Paired call prompt ready${memberName ? ` for you and ${memberName}` : ''}` : 'Reminder due now'}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.smallNote, { color: isPast ? c.terracotta : c.primary }]}>
                    {isPast ? 'Past reminder' : `Next: ${formatOccurrence(next!)}`}
                  </Text>
                )}
                {reminder.kind === 'duo' && reminder.duoMemberId && canDuo ? (
                  <PressScale onPress={() => router.push({ pathname: '/call/[id]', params: { id: reminder.duoMemberId! } })} style={[styles.tryCall, { backgroundColor: c.primary }]} accessibilityRole="button" testID={`try-duo-call-${reminder.id}`}>
                    <Feather name="phone" size={16} color={c.primaryForeground} />
                    <Text style={{ fontFamily: fonts.bodyBlack, color: c.primaryForeground }}>{isDue ? 'Open paired call demo' : 'Try the call demo now'}</Text>
                  </PressScale>
                ) : null}
                {reminder.kind === 'duo' && !canDuo ? (
                  <PressScale onPress={() => router.push('/settings')} style={[styles.tryCall, { backgroundColor: c.muted }]} accessibilityRole="button">
                    <Feather name="lock" size={16} color={c.foreground} />
                    <Text style={{ fontFamily: fonts.bodyBlack, color: c.foreground }}>View Duo plan options</Text>
                  </PressScale>
                ) : null}
                {reminder.kind === 'duo' && !isDue ? (
                  <Text style={[styles.smallNote, { color: c.mutedForeground }]}>The call prompt is visual only; the other person is not contacted.</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  spotlight: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderRadius: 22 },
  spotlightIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  spotlightTitle: { fontFamily: fonts.bodyBlack, fontSize: 20 },
  spotlightBody: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 12 },
  noticeText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },
  primaryAction: { minHeight: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryAction: { minHeight: 50, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  lockedAction: { minHeight: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  smallNote: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 23, marginTop: 4 },
  reminderCard: { borderWidth: 1.5, borderRadius: 20, padding: 14, gap: 9 },
  reminderHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kindBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontFamily: fonts.bodyBlack, fontSize: 10, overflow: 'hidden' },
  reminderTitle: { fontFamily: fonts.bodyBlack, fontSize: 18, lineHeight: 23 },
  detail: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20 },
  dueBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 14 },
  tryCall: { minHeight: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
