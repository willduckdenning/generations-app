import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BillingCycle, PlanTier, planCatalog } from '@/constants/planTiers';
import { fonts } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { haptic } from '@/lib/media';
import { PressScale } from '@/components/ui';

const tierOrder: PlanTier[] = ['connect', 'family', 'care'];

export function PlanSelector({
  selectedTier,
  billingCycle,
  onSelectTier,
  onSelectBillingCycle,
}: {
  selectedTier: PlanTier;
  billingCycle: BillingCycle;
  onSelectTier: (tier: PlanTier) => void;
  onSelectBillingCycle: (cycle: BillingCycle) => void;
}) {
  const c = useColors();

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={{ gap: 5 }}>
        <Text style={[styles.heading, { color: c.foreground }]}>Choose your plan</Text>
        <Text style={[styles.body, { color: c.mutedForeground }]}>
          Switch plans to preview the features. This demo will not charge you.
        </Text>
      </View>

      <View style={[styles.cycleSwitch, { backgroundColor: c.muted }]} accessibilityRole="radiogroup">
        {([
          { id: 'monthly', label: 'Monthly' },
          { id: 'yearly', label: 'Yearly' },
        ] as const).map((cycle) => {
          const active = billingCycle === cycle.id;
          return (
            <PressScale
              key={cycle.id}
              onPress={() => { onSelectBillingCycle(cycle.id); haptic.tap(); }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              testID={`billing-${cycle.id}`}
              style={[styles.cycleOption, { backgroundColor: active ? c.primary : 'transparent' }]}
            >
              <Text style={{ fontFamily: fonts.bodyBlack, color: active ? c.primaryForeground : c.mutedForeground }}>
                {cycle.label}
              </Text>
            </PressScale>
          );
        })}
      </View>

      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {tierOrder.map((tier) => {
          const plan = planCatalog[tier];
          const selected = selectedTier === tier;
          return (
            <PressScale
              key={plan.id}
              onPress={() => {
                if (!selected) { onSelectTier(plan.id); haptic.success(); }
              }}
              accessibilityRole="radio"
              accessibilityLabel={`${plan.name}, ${plan.price[billingCycle]}, ${plan.memberLimit}`}
              accessibilityState={{ selected }}
              testID={`plan-${plan.id}`}
              style={[
                styles.planCard,
                {
                  backgroundColor: selected ? c.greenSoft : c.background,
                  borderColor: selected ? c.primary : c.border,
                },
              ]}
            >
              <View style={styles.planHeader}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.planName, { color: c.foreground }]}>{plan.name}</Text>
                  <Text style={[styles.body, { color: c.mutedForeground }]}>{plan.audience}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.price, { color: c.primary }]}>{plan.price[billingCycle]}</Text>
                  {selected ? (
                    <View style={[styles.selectedBadge, { backgroundColor: c.primary }]}>
                      <Feather name="check" size={12} color={c.primaryForeground} />
                      <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 11, color: c.primaryForeground }}>Selected</Text>
                    </View>
                  ) : (
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: c.mutedForeground }}>Tap to preview</Text>
                  )}
                </View>
              </View>

              <Text style={[styles.memberLimit, { color: c.foreground }]}>{plan.memberLimit}</Text>
              <Text style={[styles.body, { color: c.mutedForeground }]}>{plan.summary}</Text>

              <View style={[styles.featureDivider, { borderTopColor: c.border }]} />
              <Text style={[styles.featureHeading, { color: c.foreground }]}>Plan features</Text>
              {plan.features.map((feature) => (
                <View key={`${plan.id}-${feature.name}`} style={styles.featureRow}>
                  <Feather
                    name={feature.status === 'demo' ? 'check-circle' : 'clock'}
                    size={16}
                    color={feature.status === 'demo' ? c.primary : c.terracotta}
                  />
                  <Text style={[styles.featureText, { color: c.foreground }]}>{feature.name}</Text>
                  <Text style={[styles.status, { color: feature.status === 'demo' ? c.primary : c.terracotta }]}>
                    {feature.status === 'demo' ? 'In demo' : 'Preview'}
                  </Text>
                </View>
              ))}
            </PressScale>
          );
        })}
      </View>

      <Text style={[styles.disclaimer, { color: c.mutedForeground }]}>
        Plan selection is stored on this device for demonstration only. No subscription or payment is started.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 14 },
  heading: { fontFamily: fonts.display, fontSize: 22 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  cycleSwitch: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4 },
  cycleOption: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  planCard: { alignSelf: 'stretch', borderWidth: 1.5, borderRadius: 20, padding: 14, gap: 10 },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  planName: { fontFamily: fonts.display, fontSize: 22 },
  price: { fontFamily: fonts.bodyBlack, fontSize: 15, textAlign: 'right' },
  selectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  memberLimit: { fontFamily: fonts.bodyBlack, fontSize: 14 },
  featureDivider: { borderTopWidth: 1, marginTop: 2 },
  featureHeading: { fontFamily: fonts.bodyBlack, fontSize: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },
  status: { fontFamily: fonts.bodyBlack, fontSize: 10, paddingTop: 2 },
  disclaimer: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
});
