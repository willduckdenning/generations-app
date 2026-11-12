import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { OnDevicePill, PressScale, webBottom, webTop } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { Role, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { haptic } from '@/lib/media';

const roles: { key: Role; title: string; line: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'grandparent', title: 'Grandparent', line: 'Big text and one-tap replies', icon: 'sun' },
  { key: 'parent', title: 'Parent', line: 'Keep everyone connected', icon: 'home' },
  { key: 'grandchild', title: 'Grandchild', line: 'Streaks, snaps and fun', icon: 'zap' },
];

export default function Onboarding() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useFamily();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [circle, setCircle] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [samples, setSamples] = useState(true);
  const [touched, setTouched] = useState(false);

  const nameOk = name.trim().length > 0;
  const circleOk = circle.trim().length > 0;
  const phoneDigits = phone.replace(/\D/g, '');
  const phoneOk = /^\+?[0-9 ()-]{7,20}$/.test(phone.trim()) && phoneDigits.length >= 7 && phoneDigits.length <= 15;

  const finish = () => {
    setTouched(true);
    if (!nameOk || !circleOk || !phoneOk || !role) { haptic.warn(); return; }
    haptic.success();
    completeOnboarding({ name: name.trim(), circleName: circle.trim(), phone: phone.trim(), role, withSamples: samples });
    router.replace('/family');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View pointerEvents="none" style={[styles.sun, { backgroundColor: c.goldSoft }]} />
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + webTop + 24, paddingBottom: insets.bottom + webBottom + 40, paddingHorizontal: 24, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bottomOffset={24}
      >
        {step === 0 ? (
          <Animated.View key="welcome" entering={FadeIn.duration(500)} exiting={FadeOut.duration(200)} style={{ flex: 1, justifyContent: 'space-between', gap: 32 }}>
            <View style={{ gap: 20, marginTop: 20 }}>
              <Animated.View entering={FadeInDown.delay(100).springify()}>
                <Image source={require('@/assets/images/icon.png')} style={styles.icon} contentFit="cover" accessibilityLabel="Generations giraffe mascot" />
              </Animated.View>
              <Animated.Text entering={FadeInDown.delay(220)} style={[styles.brand, { color: c.primary }]}>generations</Animated.Text>
              <Animated.Text entering={FadeInDown.delay(320)} style={[styles.hero, { color: c.foreground }]}>
                Your family living room, in your pocket.
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(420)} style={[styles.sub, { color: c.mutedForeground }]}>
                Grandparents, parents and grandchildren, sharing little moments without the noise of social media.
              </Animated.Text>
            </View>
            <Animated.View entering={FadeInDown.delay(560)} style={[styles.deviceCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <OnDevicePill />
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: c.foreground }}>
                Try the account flow with a demo phone number. No verification text will be sent, and your account and family activity stay on this device.
              </Text>
            </Animated.View>
            <PressScale onPress={() => setStep(1)} style={[styles.cta, { backgroundColor: c.primary }]} accessibilityRole="button" testID="start">
              <Text style={[styles.ctaText, { color: c.primaryForeground }]}>Set up this device</Text>
              <Feather name="arrow-right" size={22} color={c.primaryForeground} />
            </PressScale>
          </Animated.View>
        ) : (
          <Animated.View key="form" entering={FadeIn.duration(400)} style={{ gap: 22 }}>
            <Pressable onPress={() => setStep(0)} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityRole="button">
              <Feather name="chevron-left" size={20} color={c.primary} />
              <Text style={{ fontFamily: fonts.bodyBold, color: c.primary, fontSize: 15 }}>Back</Text>
            </Pressable>
            <Text style={[styles.title, { color: c.foreground }]}>Create your place in the family.</Text>

            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: c.foreground }]}>Phone number</Text>
              <TextInput value={phone} onChangeText={setPhone} placeholder="Use a test number" placeholderTextColor={c.mutedForeground} keyboardType="phone-pad" returnKeyType="next" maxLength={20}
                style={[styles.input, { backgroundColor: c.card, borderColor: touched && !phoneOk ? c.destructive : c.border, color: c.foreground }]} testID="phone-input" accessibilityLabel="Demo phone number" />
              <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: c.mutedForeground }}>Demo only: no SMS is sent, and this number is saved on this device. Use a test number, not your real number.</Text>
              {touched && !phoneOk ? <Text style={[styles.err, { color: c.destructive }]}>Enter a valid demo number with at least 7 digits.</Text> : null}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: c.foreground }]}>Your first name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="e.g. Rosa" placeholderTextColor={c.mutedForeground} autoCapitalize="words" returnKeyType="next" maxLength={30}
                style={[styles.input, { backgroundColor: c.card, borderColor: touched && !nameOk ? c.destructive : c.border, color: c.foreground }]} testID="name-input" accessibilityLabel="Your first name" />
              {touched && !nameOk ? <Text style={[styles.err, { color: c.destructive }]}>Please add your first name.</Text> : null}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: c.foreground }]}>Family circle name</Text>
              <TextInput value={circle} onChangeText={setCircle} placeholder="e.g. The Okafor Family" placeholderTextColor={c.mutedForeground} autoCapitalize="words" returnKeyType="done" maxLength={40}
                style={[styles.input, { backgroundColor: c.card, borderColor: touched && !circleOk ? c.destructive : c.border, color: c.foreground }]} testID="circle-input" accessibilityLabel="Family circle name" />
              {touched && !circleOk ? <Text style={[styles.err, { color: c.destructive }]}>Give your circle a name. You can change it later.</Text> : null}
            </View>

            <View style={{ gap: 10 }}>
              <Text style={[styles.label, { color: c.foreground }]}>I am a...</Text>
              {roles.map((r) => {
                const on = role === r.key;
                return (
                  <PressScale key={r.key} onPress={() => setRole(r.key)} accessibilityRole="radio" accessibilityState={{ selected: on }} testID={`role-${r.key}`}
                    style={[styles.role, { backgroundColor: on ? c.primary : c.card, borderColor: on ? c.primary : touched && !role ? c.destructive : c.border }]}>
                    <View style={[styles.roleIcon, { backgroundColor: on ? 'rgba(255,249,238,0.18)' : c.goldSoft }]}>
                      <Feather name={r.icon} size={22} color={on ? c.accent : c.secondaryForeground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.display, fontSize: 20, color: on ? c.primaryForeground : c.foreground }}>{r.title}</Text>
                      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: on ? c.primaryForeground : c.mutedForeground }}>{r.line}</Text>
                    </View>
                    <Feather name={on ? 'check-circle' : 'circle'} size={22} color={on ? c.accent : c.border} />
                  </PressScale>
                );
              })}
              {touched && !role ? <Text style={[styles.err, { color: c.destructive }]}>Choose a role so we can shape the app for you.</Text> : null}
            </View>

            <View style={[styles.sampleRow, { backgroundColor: c.muted }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: c.foreground }}>Show a sample family</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: c.mutedForeground }}>Demo relatives and posts, clearly labeled. Remove them any time in Settings.</Text>
              </View>
              <Switch value={samples} onValueChange={setSamples} trackColor={{ true: c.primary, false: c.border }} thumbColor={c.card} accessibilityLabel="Show sample family" />
            </View>

            <PressScale onPress={finish} style={[styles.cta, { backgroundColor: c.primary }]} accessibilityRole="button" testID="finish">
              <Text style={[styles.ctaText, { color: c.primaryForeground }]}>Create demo account</Text>
              <Feather name="arrow-right" size={22} color={c.primaryForeground} />
            </PressScale>
          </Animated.View>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  sun: { position: 'absolute', width: 420, height: 420, borderRadius: 210, top: -180, right: -160 },
  icon: { width: 104, height: 104, borderRadius: 28 },
  brand: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.3 },
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, letterSpacing: -1 },
  sub: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25 },
  deviceCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 60, borderRadius: 999 },
  ctaText: { fontFamily: fonts.bodyBlack, fontSize: 18 },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  label: { fontFamily: fonts.bodyBlack, fontSize: 15 },
  input: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, minHeight: 56, fontFamily: fonts.bodySemi, fontSize: 18 },
  err: { fontFamily: fonts.bodySemi, fontSize: 13 },
  role: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, borderWidth: 1.5 },
  roleIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sampleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18 },
});
