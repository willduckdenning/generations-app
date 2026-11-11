import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnDevicePill, webTop } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';

export function ScreenHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + webTop + 12 }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {eyebrow ? <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 13, letterSpacing: 0.6, color: c.terracotta }} numberOfLines={1}>{eyebrow.toUpperCase()}</Text> : null}
          <OnDevicePill />
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: 32, letterSpacing: -0.6, color: c.foreground }} numberOfLines={1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
});
