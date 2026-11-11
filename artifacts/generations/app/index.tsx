import { Redirect } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SkeletonFeed } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { homeRouteFor, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';

export default function Gate() {
  const { ready, profile, loadError, retryLoad } = useFamily();
  const c = useColors();
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.background, paddingTop: 80 }}><SkeletonFeed /></View>;
  if (loadError) {
    return (
      <View style={[styles.wrap, { backgroundColor: c.background }]}>
        <Text style={[styles.title, { color: c.foreground }]}>We could not open your family room</Text>
        <Text style={[styles.body, { color: c.mutedForeground }]}>{loadError}</Text>
        <Pressable onPress={retryLoad} style={[styles.btn, { backgroundColor: c.primary }]} accessibilityRole="button">
          <Text style={{ fontFamily: fonts.bodyBlack, color: c.primaryForeground, fontSize: 16 }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
  if (!profile) return <Redirect href="/onboarding" />;
  return <Redirect href={homeRouteFor(profile.role)} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 24, textAlign: 'center' },
  body: { fontFamily: fonts.body, fontSize: 15, textAlign: 'center' },
  btn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999, marginTop: 8 },
});
