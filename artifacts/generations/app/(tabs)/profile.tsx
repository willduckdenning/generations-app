import React from 'react';
import { ScrollView, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsView } from '@/components/SettingsView';
import { webBottom } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

export default function ProfileScreen() {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader eyebrow="Profile and settings" title="Me" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 + webBottom }} keyboardShouldPersistTaps="handled">
        <SettingsView />
      </ScrollView>
    </View>
  );
}
