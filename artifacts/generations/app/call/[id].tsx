import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, OnDevicePill, PressScale, webBottom, webTop } from '@/components/ui';
import { BackButton } from '@/components/BackButton';
import { fonts } from '@/constants/colors';
import { GROUP_THREAD, homeRouteFor, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { haptic } from '@/lib/media';

export default function DemoCallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { activeFamily, memberById, profile } = useFamily();
  const groupCall = id === GROUP_THREAD;
  const member = !groupCall && id ? memberById(id) : undefined;
  const title = groupCall ? activeFamily?.name ?? 'Family' : member?.name ?? 'Family member';
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(homeRouteFor(profile?.role ?? 'parent'));
  };
  const finish = () => { haptic.warn(); goBack(); };
  const elapsed = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  return (
    <View style={[styles.container, { backgroundColor: c.primary, paddingTop: Math.max(insets.top, webTop, 24) + 28, paddingBottom: Math.max(insets.bottom, webBottom, 16) + 28 }]}>
      <View style={[styles.glow, { backgroundColor: c.primaryForeground }]} />
      <View style={styles.topRow}>
        <BackButton onPress={goBack} variant="onDark" testID="call-back" />
      </View>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <OnDevicePill />
        {groupCall ? (
          <View style={[styles.groupAvatar, { backgroundColor: c.goldSoft }]}><Feather name="users" size={42} color={c.primary} /></View>
        ) : (
          <Avatar member={member} size={108} />
        )}
        <Text style={[styles.name, { color: c.primaryForeground }]}>{title}</Text>
        <Text style={[styles.status, { color: c.goldSoft }]}>Call demo · {elapsed}</Text>
        <Text style={[styles.disclaimer, { color: c.primaryForeground }]}>
          This is a visual prototype only. No call is connected, and no audio is being sent.
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={() => setMuted((value) => !value)} accessibilityRole="button" accessibilityLabel={muted ? 'Unmute demo call' : 'Mute demo call'} testID="call-mute"
          style={[styles.control, { backgroundColor: muted ? c.goldSoft : 'rgba(255,255,255,0.18)' }]}>
          <Feather name={muted ? 'mic-off' : 'mic'} size={24} color={muted ? c.primary : c.primaryForeground} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: muted ? c.primary : c.primaryForeground }}>{muted ? 'Muted' : 'Mute'}</Text>
        </Pressable>
        <Pressable onPress={() => setSpeaker((value) => !value)} accessibilityRole="button" accessibilityLabel={speaker ? 'Turn speaker off' : 'Turn speaker on'} testID="call-speaker"
          style={[styles.control, { backgroundColor: speaker ? c.goldSoft : 'rgba(255,255,255,0.18)' }]}>
          <Feather name="volume-2" size={24} color={speaker ? c.primary : c.primaryForeground} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: speaker ? c.primary : c.primaryForeground }}>Speaker</Text>
        </Pressable>
      </View>

      <PressScale onPress={finish} style={[styles.hangup, { backgroundColor: c.destructive }]} testID="call-end" accessibilityRole="button">
        <Feather name="phone-off" size={22} color={c.destructiveForeground} />
        <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 17, color: c.destructiveForeground }}>End demo call</Text>
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, overflow: 'hidden' },
  glow: { position: 'absolute', width: 360, height: 360, borderRadius: 180, opacity: 0.06, top: 110, alignSelf: 'center' },
  groupAvatar: { width: 108, height: 108, borderRadius: 54, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.display, fontSize: 30, textAlign: 'center' },
  status: { fontFamily: fonts.bodyBold, fontSize: 16 },
  disclaimer: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: 'center', opacity: 0.85, maxWidth: 290, marginTop: 8 },
  controls: { flexDirection: 'row', gap: 24, alignItems: 'center' },
  topRow: { alignSelf: 'stretch', minHeight: 46, flexDirection: 'row', alignItems: 'center' },
  control: { minWidth: 78, minHeight: 78, paddingHorizontal: 12, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 6 },
  hangup: { minHeight: 62, borderRadius: 999, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, alignSelf: 'stretch' },
});
