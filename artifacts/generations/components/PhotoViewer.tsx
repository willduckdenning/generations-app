import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { webBottom, webTop } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';

export function PhotoViewer({ uri, caption, onClose, onDelete }: { uri: string | null; caption?: string; onClose: () => void; onDelete?: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.wrap, { backgroundColor: 'rgba(22,32,20,0.96)', paddingTop: insets.top + webTop + 8, paddingBottom: insets.bottom + webBottom + 16 }]}>
        <View style={styles.bar}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close photo" style={styles.btn} testID="viewer-close">
            <Feather name="x" size={26} color={c.primaryForeground} />
          </Pressable>
          {onDelete ? (
            <Pressable onPress={onDelete} hitSlop={10} accessibilityLabel="Delete photo" style={styles.btn} testID="viewer-delete">
              <Feather name="trash-2" size={22} color={c.primaryForeground} />
            </Pressable>
          ) : null}
        </View>
        {uri ? <Image source={{ uri }} style={{ flex: 1 }} contentFit="contain" transition={200} /> : null}
        {caption ? <Text style={{ fontFamily: fonts.bodySemi, color: c.primaryForeground, fontSize: 16, padding: 20 }}>{caption}</Text> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
  btn: { padding: 10 },
});
