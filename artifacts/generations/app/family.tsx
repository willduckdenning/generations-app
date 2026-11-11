import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Notice, OnDevicePill, PressScale, webBottom, webTop } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { FamilyRoom, homeRouteFor, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { haptic } from '@/lib/media';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FamilyScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { profile, familyRooms, activeFamily, createFamily, joinFamily, setActiveFamily } = useFamily();
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const openFamily = (room: FamilyRoom) => {
    setActiveFamily(room.id);
    haptic.success();
    router.replace(homeRouteFor(profile?.role ?? 'parent'));
  };

  const create = () => {
    const name = newName.trim();
    if (!name) { setError('Add a name for your family room.'); return; }
    const room = createFamily(name, true);
    setNewName('');
    setError('');
    setNotice(`Your room is ready. Share code ${room.code} with your family.`);
    haptic.success();
  };

  const join = () => {
    const result = joinFamily(joinCode);
    if (!result.ok) { setError(result.reason); setNotice(''); return; }
    setJoinCode('');
    setError('');
    setNotice(`Joined ${result.family.name}. This is a local demo room.`);
    haptic.success();
  };

  const shareCode = async (room: FamilyRoom) => {
    try {
      await Share.share({ message: `Join my Generations demo family “${room.name}” with room code ${room.code}. This prototype does not connect family members across devices yet.` });
    } catch {
      setError('Could not open the share sheet. The room code is still shown above.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title: 'Family circles' }} />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + webTop + 20, paddingBottom: insets.bottom + webBottom + 40, gap: 18 }}
        keyboardShouldPersistTaps="handled" bottomOffset={24}
      >
        <View style={{ gap: 8 }}>
          <OnDevicePill />
          <Text style={[styles.title, { color: c.foreground }]}>Your family rooms</Text>
          <Text style={[styles.body, { color: c.mutedForeground }]}>Create a room or join a demo room with its code. Rooms, messages and members are saved only on this device.</Text>
        </View>

        {notice ? <Notice text={notice} onClose={() => setNotice('')} /> : null}
        {error ? <Notice text={error} onClose={() => setError('')} /> : null}

        {familyRooms.map((room) => {
          const active = room.id === activeFamily?.id;
          return (
            <View key={room.id} style={[styles.room, { backgroundColor: c.card, borderColor: active ? c.primary : c.border }]}>
              <View style={styles.roomHeading}>
                <View style={[styles.roomIcon, { backgroundColor: c.greenSoft }]}><Feather name="users" size={20} color={c.primary} /></View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 20, color: c.foreground }}>{room.name}</Text>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: c.mutedForeground }}>{room.members.length + 1} demo members · code {room.code}</Text>
                </View>
                {active ? <Feather name="check-circle" size={22} color={c.primary} /> : null}
              </View>
              <View style={styles.row}>
                {!active ? (
                  <PressScale onPress={() => openFamily(room)} style={[styles.action, { backgroundColor: c.primary }]} testID={`open-${room.id}`}>
                    <Text style={{ color: c.primaryForeground, fontFamily: fonts.bodyBlack }}>Open room</Text>
                  </PressScale>
                ) : (
                  <PressScale onPress={() => router.replace(homeRouteFor(profile?.role ?? 'parent'))} style={[styles.action, { backgroundColor: c.primary }]} testID="go-to-family-home">
                    <Text style={{ color: c.primaryForeground, fontFamily: fonts.bodyBlack }}>Open family</Text>
                  </PressScale>
                )}
                <PressScale onPress={() => shareCode(room)} style={[styles.iconAction, { backgroundColor: c.goldSoft }]} accessibilityRole="button" accessibilityLabel={`Share room code ${room.code}`} testID={`share-${room.id}`}>
                  <Feather name="share" size={18} color={c.secondaryForeground} />
                </PressScale>
              </View>
            </View>
          );
        })}

        <View style={[styles.panel, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.heading}>
            <Feather name="plus-circle" size={22} color={c.primary} />
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Create a family room</Text>
          </View>
          <TextInput value={newName} onChangeText={setNewName} placeholder="Family room name" placeholderTextColor={c.mutedForeground} maxLength={40}
            style={[styles.input, { color: c.foreground, backgroundColor: c.background, borderColor: c.border }]} accessibilityLabel="New family room name" testID="new-family-name" />
          <Text style={[styles.hint, { color: c.mutedForeground }]}>Creates a local demo room with labeled sample relatives and a shareable code.</Text>
          <PressScale onPress={create} style={[styles.action, { backgroundColor: c.primary }]} testID="create-family">
            <Text style={{ color: c.primaryForeground, fontFamily: fonts.bodyBlack }}>Create room</Text>
          </PressScale>
        </View>

        <View style={[styles.panel, { backgroundColor: c.goldSoft, borderColor: c.border }]}>
          <View style={styles.heading}>
            <Feather name="log-in" size={22} color={c.primary} />
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Join with a room code</Text>
          </View>
          <TextInput value={joinCode} onChangeText={setJoinCode} placeholder="Enter a room code" placeholderTextColor={c.mutedForeground} autoCapitalize="characters" maxLength={20}
            style={[styles.input, { color: c.foreground, backgroundColor: c.background, borderColor: c.border }]} accessibilityLabel="Family room code" testID="family-code" />
          <Text style={[styles.hint, { color: c.foreground }]}>For a preview, try the shared sample code GEN-DEMO. Other codes work only if that room was created on this device.</Text>
          <PressScale onPress={join} style={[styles.action, { backgroundColor: c.primary }]} testID="join-family">
            <Text style={{ color: c.primaryForeground, fontFamily: fonts.bodyBlack }}>Join room</Text>
          </PressScale>
        </View>

        <View style={[styles.note, { backgroundColor: c.terracottaSoft }]}>
          <Feather name="info" size={18} color={c.terracotta} />
          <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: c.foreground }}>
            Room codes are a prototype only. They are not registered with a server, so sharing a code cannot add someone on another phone yet.
          </Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  room: { borderWidth: 1.5, borderRadius: 22, padding: 16, gap: 14 },
  roomHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomIcon: { height: 44, width: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panel: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 20, flex: 1 },
  input: { minHeight: 52, borderWidth: 1.5, borderRadius: 15, paddingHorizontal: 14, fontFamily: fonts.bodySemi, fontSize: 17 },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  action: { minHeight: 48, borderRadius: 999, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  iconAction: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 18 },
});
