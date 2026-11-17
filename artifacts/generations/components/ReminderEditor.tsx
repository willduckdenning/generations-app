import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { canUsePlanFeature } from '@/constants/planTiers';
import { fonts } from '@/constants/colors';
import { FamilyReminder, ME, Member, NewFamilyReminder, ReminderKind, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { CARE_CATEGORIES, isValidLocalDate, localDateInput, localTimeInput, parseReminderTimes, REMINDER_DAYS } from '@/lib/reminders';
import { haptic } from '@/lib/media';
import { PressScale } from '@/components/ui';

export function ReminderEditor({
  kind,
  initial,
  onCancel,
  onSaved,
}: {
  kind: ReminderKind;
  initial?: FamilyReminder;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const c = useColors();
  const { planTier, members, careSpace, addReminder, updateReminder, me } = useFamily();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.scheduledDate ?? localDateInput(new Date()));
  const [times, setTimes] = useState(initial?.times.join(', ') ?? localTimeInput(new Date()));
  const [repeatDays, setRepeatDays] = useState<number[]>(initial?.repeatDays ?? []);
  const [recipientMode, setRecipientMode] = useState<'all' | 'selected'>(initial ? 'selected' : 'all');
  const [recipientIds, setRecipientIds] = useState<string[]>(initial?.recipientIds ?? [ME]);
  const [guestIds, setGuestIds] = useState<string[]>(initial?.guestIds ?? []);
  const [duoMemberId, setDuoMemberId] = useState(initial?.duoMemberId ?? members[0]?.id ?? '');
  const [category, setCategory] = useState<(typeof CARE_CATEGORIES)[number]>(initial?.category ?? 'Medicine');
  const [customCategory, setCustomCategory] = useState(initial?.customCategory ?? '');
  const [showCategories, setShowCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customTimesAllowed = canUsePlanFeature(planTier, 'custom-reminders');

  const people: Member[] = me ? [me, ...members] : members;
  const allIds = people.map((person) => person.id);
  const toggleId = (list: string[], id: string, setList: (next: string[]) => void) => {
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  };
  const toggleDay = (day: number) => {
    setRepeatDays((selected) => selected.includes(day) ? selected.filter((value) => value !== day) : [...selected, day].sort());
  };
  const recipients = kind === 'duo'
    ? [ME, duoMemberId]
    : kind === 'care'
      ? [ME, ...(careSpace?.memberIds ?? [])]
      : recipientMode === 'all' ? allIds : recipientIds;

  const save = () => {
    setError(null);
    const parsedTimes = parseReminderTimes(times);
    if (!title.trim()) { setError('Add a short title for this reminder.'); return; }
    if (!isValidLocalDate(date)) { setError('Enter a real date in YYYY-MM-DD format.'); return; }
    if (!parsedTimes) { setError('Enter one or more times like 09:00, 18:30.'); return; }
    if (!customTimesAllowed && parsedTimes.length > 1) { setError('Connect includes one fixed reminder time. Choose Family or Care for multiple custom times.'); return; }
    if (kind === 'duo' && (!duoMemberId || !members.some((member) => member.id === duoMemberId))) { setError('Choose a family member for this Duo call.'); return; }
    if (kind === 'care' && !careSpace) { setError('Create a private caregiver space before adding a care reminder.'); return; }
    if (kind === 'care' && category === 'Custom' && !customCategory.trim()) { setError('Name your custom care reminder category.'); return; }
    if (!recipients.filter(Boolean).length) { setError('Choose at least one person for this reminder.'); return; }

    const data: NewFamilyReminder = {
      title: title.trim(),
      note: note.trim() || undefined,
      kind,
      category: kind === 'care' ? category : undefined,
      customCategory: kind === 'care' && category === 'Custom' ? customCategory.trim() : undefined,
      scheduledDate: date.trim(),
      times: parsedTimes,
      repeatDays,
      recipientIds: [...new Set(recipients.filter(Boolean))],
      guestIds: kind === 'general' ? [...new Set(guestIds.filter((id) => !recipients.includes(id)))] : [],
      duoMemberId: kind === 'duo' ? duoMemberId : undefined,
    };
    const saved = initial
      ? updateReminder({ ...data, id: initial.id, createdAt: initial.createdAt })
      : addReminder(data);
    if (!saved) {
      setError('This reminder is not available on your selected plan or for this role.');
      return;
    }
    haptic.success();
    onSaved();
  };

  const sectionTitle = kind === 'duo' ? 'Duo call reminder' : kind === 'care' ? 'Care reminder' : 'Family reminder';

  return (
    <View style={[styles.form, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.formHeader}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.formTitle, { color: c.foreground }]}>{initial ? 'Edit reminder' : sectionTitle}</Text>
          <Text style={[styles.helper, { color: c.mutedForeground }]}>Saved on this device. It will not notify other phones.</Text>
        </View>
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Close reminder form" testID="reminder-close" hitSlop={8}>
          <Feather name="x-circle" size={24} color={c.mutedForeground} />
        </Pressable>
      </View>

      {kind === 'care' ? (
        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: c.foreground }]}>Care category</Text>
          <PressScale onPress={() => setShowCategories((open) => !open)} style={[styles.selectButton, { backgroundColor: c.background, borderColor: c.border }]} accessibilityRole="button" accessibilityLabel={`Care category, ${category}`}>
            <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: c.foreground }}>{category}</Text>
            <Feather name={showCategories ? 'chevron-up' : 'chevron-down'} size={19} color={c.primary} />
          </PressScale>
          {showCategories ? (
            <View style={[styles.dropdown, { backgroundColor: c.background, borderColor: c.border }]}>
              {CARE_CATEGORIES.map((item) => (
                <Pressable key={item} onPress={() => { setCategory(item); setShowCategories(false); }} accessibilityRole="radio" accessibilityState={{ selected: item === category }} testID={`care-category-${item.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                  style={[styles.dropdownRow, { backgroundColor: item === category ? c.greenSoft : 'transparent' }]}>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: c.foreground }}>{item}</Text>
                  {item === category ? <Feather name="check" size={17} color={c.primary} /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
          {category === 'Custom' ? (
            <TextInput value={customCategory} onChangeText={setCustomCategory} placeholder="Name your category" placeholderTextColor={c.mutedForeground} maxLength={40}
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]} accessibilityLabel="Custom care category" testID="custom-care-category" />
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: c.foreground }]}>{kind === 'care' ? 'What needs to happen?' : 'Reminder title'}</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder={kind === 'duo' ? 'e.g. Call Grandma after dinner' : kind === 'care' ? 'e.g. Pick up the prescription' : 'e.g. Family dinner'}
          placeholderTextColor={c.mutedForeground} maxLength={80} returnKeyType="next"
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]} accessibilityLabel="Reminder title" testID="reminder-title" />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: c.foreground }]}>Date and time</Text>
        <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={c.mutedForeground} keyboardType="numbers-and-punctuation" maxLength={10} returnKeyType="next"
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]} accessibilityLabel="Reminder date, year month day" testID="reminder-date" />
        <TextInput value={times} onChangeText={setTimes} placeholder="09:00 or 09:00, 18:00" placeholderTextColor={c.mutedForeground} keyboardType="numbers-and-punctuation" maxLength={40} returnKeyType="done"
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]} accessibilityLabel="Reminder time or times" testID="reminder-times" />
        <Text style={[styles.helper, { color: c.mutedForeground }]}>
          {customTimesAllowed ? 'Use 24-hour time. Add multiple times separated by commas.' : 'Connect uses one fixed time. Family and Care plans can add custom times.'}
        </Text>
      </View>

      <View style={{ gap: 9 }}>
        <View>
          <Text style={[styles.label, { color: c.foreground }]}>Repeat on</Text>
          <Text style={[styles.helper, { color: c.mutedForeground }]}>Leave days unselected for a one-time reminder.</Text>
        </View>
        <View style={styles.dayRow}>
          {REMINDER_DAYS.map((day) => {
            const selected = repeatDays.includes(day.value);
            return (
              <PressScale key={day.value} onPress={() => toggleDay(day.value)} accessibilityRole="checkbox" accessibilityLabel={day.full} accessibilityState={{ checked: selected }} testID={`repeat-day-${day.value}`}
                style={[styles.dayChip, { backgroundColor: selected ? c.primary : c.background, borderColor: selected ? c.primary : c.border }]}>
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 12, color: selected ? c.primaryForeground : c.foreground }}>{day.short}</Text>
              </PressScale>
            );
          })}
        </View>
      </View>

      {kind === 'duo' ? (
        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: c.foreground }]}>Call with</Text>
          {members.length ? members.map((member) => {
            const selected = duoMemberId === member.id;
            return (
              <PressScale key={member.id} onPress={() => setDuoMemberId(member.id)} accessibilityRole="radio" accessibilityState={{ selected }} testID={`duo-member-${member.id}`}
                style={[styles.personRow, { backgroundColor: selected ? c.greenSoft : c.background, borderColor: selected ? c.primary : c.border }]}>
                <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: c.foreground }}>{member.name}</Text>
                <Feather name={selected ? 'check-circle' : 'circle'} size={19} color={selected ? c.primary : c.mutedForeground} />
              </PressScale>
            );
          }) : <Text style={[styles.helper, { color: c.mutedForeground }]}>Add or join a family room before scheduling a Duo call.</Text>}
          <Text style={[styles.helper, { color: c.mutedForeground }]}>This makes a paired call prompt in this demo only. It does not call or alert the other person.</Text>
        </View>
      ) : null}

      {kind === 'general' ? (
        <>
          <View style={{ gap: 8 }}>
            <Text style={[styles.label, { color: c.foreground }]}>Notify</Text>
            <View style={styles.choiceRow}>
              {(['all', 'selected'] as const).map((mode) => {
                const selected = recipientMode === mode;
                return (
                  <PressScale key={mode} onPress={() => setRecipientMode(mode)} accessibilityRole="radio" accessibilityState={{ selected }} testID={`recipients-${mode}`}
                    style={[styles.choiceChip, { backgroundColor: selected ? c.primary : c.background, borderColor: selected ? c.primary : c.border }]}>
                    <Text style={{ fontFamily: fonts.bodyBold, color: selected ? c.primaryForeground : c.foreground }}>{mode === 'all' ? 'Everyone' : 'Choose people'}</Text>
                  </PressScale>
                );
              })}
            </View>
            {recipientMode === 'selected' ? (
              <View style={{ gap: 7 }}>
                {people.map((person) => {
                  const selected = recipientIds.includes(person.id);
                  return (
                    <PressScale key={person.id} onPress={() => toggleId(recipientIds, person.id, setRecipientIds)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} testID={`recipient-${person.id}`}
                      style={[styles.personRow, { backgroundColor: selected ? c.greenSoft : c.background, borderColor: selected ? c.primary : c.border }]}>
                      <Text style={{ flex: 1, fontFamily: fonts.bodySemi, color: c.foreground }}>{person.id === ME ? 'You' : person.name}</Text>
                      <Feather name={selected ? 'check-square' : 'square'} size={18} color={selected ? c.primary : c.mutedForeground} />
                    </PressScale>
                  );
                })}
              </View>
            ) : null}
          </View>

          {members.length ? (
            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: c.foreground }]}>Guests (optional)</Text>
              <View style={{ gap: 7 }}>
                {members.map((person) => {
                  const selected = guestIds.includes(person.id);
                  return (
                    <PressScale key={person.id} onPress={() => toggleId(guestIds, person.id, setGuestIds)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} testID={`guest-${person.id}`}
                      style={[styles.personRow, { backgroundColor: selected ? c.goldSoft : c.background, borderColor: selected ? c.accent : c.border }]}>
                      <Text style={{ flex: 1, fontFamily: fonts.bodySemi, color: c.foreground }}>{person.name}</Text>
                      <Feather name={selected ? 'check-square' : 'square'} size={18} color={selected ? c.secondaryForeground : c.mutedForeground} />
                    </PressScale>
                  );
                })}
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      {kind === 'general' || kind === 'duo' ? (
        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: c.foreground }]}>Details (optional)</Text>
          <TextInput value={note} onChangeText={setNote} placeholder="Add a note" placeholderTextColor={c.mutedForeground} multiline maxLength={240}
            style={[styles.input, styles.noteInput, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]} accessibilityLabel="Reminder details" testID="reminder-note" />
        </View>
      ) : null}

      {error ? <Text style={[styles.error, { color: c.destructive }]} accessibilityRole="alert">{error}</Text> : null}
      <View style={styles.actionRow}>
        <PressScale onPress={onCancel} style={[styles.actionButton, { backgroundColor: c.muted }]} testID="reminder-cancel">
          <Text style={{ fontFamily: fonts.bodyBlack, color: c.foreground }}>Cancel</Text>
        </PressScale>
        <PressScale onPress={save} style={[styles.actionButton, { backgroundColor: c.primary }]} accessibilityRole="button" testID="reminder-save">
          <Text style={{ fontFamily: fonts.bodyBlack, color: c.primaryForeground }}>{initial ? 'Save changes' : 'Save reminder'}</Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 16 },
  formHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  formTitle: { fontFamily: fonts.display, fontSize: 22 },
  label: { fontFamily: fonts.bodyBlack, fontSize: 15 },
  helper: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  input: { borderWidth: 1.5, borderRadius: 15, paddingHorizontal: 14, minHeight: 52, fontFamily: fonts.bodySemi, fontSize: 16 },
  noteInput: { minHeight: 76, textAlignVertical: 'top', paddingTop: 12 },
  selectButton: { minHeight: 52, borderWidth: 1.5, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  dropdown: { borderWidth: 1, borderRadius: 15, overflow: 'hidden' },
  dropdownRow: { minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  dayChip: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choiceChip: { minHeight: 44, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  personRow: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, minHeight: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18 },
});
