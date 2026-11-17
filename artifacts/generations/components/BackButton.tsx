import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fonts } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { PressScale } from '@/components/ui';

export function BackButton({
  onPress,
  label = 'Back',
  variant = 'light',
  testID = 'back-button',
}: {
  onPress: () => void;
  label?: string;
  variant?: 'light' | 'onDark';
  testID?: string;
}) {
  const c = useColors();
  const onDark = variant === 'onDark';
  const foreground = onDark ? c.secondaryForeground : c.primary;
  return (
    <PressScale
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: onDark ? c.goldSoft : c.card,
          borderColor: onDark ? c.goldSoft : c.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label} to the previous page`}
      testID={testID}
    >
      <Feather name="arrow-left" size={19} color={foreground} />
      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 15, color: foreground }}>{label}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 999,
  },
});
