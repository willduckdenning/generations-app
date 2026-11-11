import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingsView } from '@/components/SettingsView';
import { webBottom } from '@/components/ui';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + webBottom + 40 }} keyboardShouldPersistTaps="handled">
      <SettingsView />
    </ScrollView>
  );
}
