export type PlanTier = 'connect' | 'family' | 'care';
export type BillingCycle = 'monthly' | 'yearly';

export type PlanFeature =
  | 'fixed-reminders'
  | 'custom-reminders'
  | 'duo-call'
  | 'care-chat'
  | 'medication-tracking'
  | 'auto-family-calls'
  | 'memory-reminders'
  | 'shared-calendar'
  | 'care-log'
  | 'scheduled-messages'
  | 'family-tasks'
  | 'automatic-media'
  | 'caregiver-call-reminders'
  | 'printed-photos';

export interface PlanFeatureInfo {
  name: string;
  feature?: PlanFeature;
  status: 'demo' | 'preview';
}

export interface PlanInfo {
  id: PlanTier;
  name: string;
  price: { monthly: string; yearly: string };
  audience: string;
  memberLimit: string;
  summary: string;
  features: PlanFeatureInfo[];
}

const connectFeatures: PlanFeatureInfo[] = [
  { name: 'Photo and message sharing (saved on this device)', status: 'demo' },
  { name: 'Birthday and anniversary reminders', status: 'preview' },
  { name: 'Fixed reminder schedule', feature: 'fixed-reminders', status: 'preview' },
];

const familyFeatures: PlanFeatureInfo[] = [
  { name: 'Custom reminder times (morning/evening)', feature: 'custom-reminders', status: 'preview' },
  { name: 'Duo call feature', feature: 'duo-call', status: 'preview' },
];

export const planCatalog: Record<PlanTier, PlanInfo> = {
  connect: {
    id: 'connect',
    name: 'Connect',
    price: { monthly: 'Free', yearly: 'Free' },
    audience: 'Families trying it out',
    memberLimit: 'Up to 3 family members',
    summary: 'A simple way to share family moments.',
    features: connectFeatures,
  },
  family: {
    id: 'family',
    name: 'Family',
    price: { monthly: '$9.99 / month', yearly: '$99 / year' },
    audience: 'Busy adults who want to stay in touch',
    memberLimit: 'Up to 8 family members',
    summary: 'More ways to keep everyone connected.',
    features: [...connectFeatures, ...familyFeatures],
  },
  care: {
    id: 'care',
    name: 'Care',
    price: { monthly: '$19.99 / month', yearly: '$249 / year' },
    audience: 'Primary caregivers managing a parent’s needs',
    memberLimit: 'Unlimited family members',
    summary: 'Extra support for coordinating care.',
    features: [
      ...connectFeatures,
      ...familyFeatures,
      { name: 'Medication and appointment tracking', feature: 'medication-tracking', status: 'preview' },
      { name: 'Auto-scheduled family calls', feature: 'auto-family-calls', status: 'preview' },
      { name: 'Memory-loss reminders with sound and visuals', feature: 'memory-reminders', status: 'preview' },
      { name: 'Shared calendar with double-booking warnings', feature: 'shared-calendar', status: 'preview' },
      { name: 'Care log for calls and check-ins', feature: 'care-log', status: 'preview' },
      { name: 'Pre-recorded messages sent automatically', feature: 'scheduled-messages', status: 'preview' },
      { name: 'Assign tasks to siblings', feature: 'family-tasks', status: 'preview' },
      { name: 'Photos and voice messages appear automatically on a senior’s phone', feature: 'automatic-media', status: 'preview' },
      { name: 'Phone-call reminders for caregivers away from their phones', feature: 'caregiver-call-reminders', status: 'preview' },
      { name: 'Monthly printed photos mailed to a senior', feature: 'printed-photos', status: 'preview' },
      { name: 'Private caregiver chat with chosen family members', feature: 'care-chat', status: 'preview' },
    ],
  },
};

const tierFeatures: Record<PlanTier, PlanFeature[]> = {
  connect: ['fixed-reminders'],
  family: ['fixed-reminders', 'custom-reminders', 'duo-call'],
  care: [
    'fixed-reminders',
    'custom-reminders',
    'duo-call',
    'care-chat',
    'medication-tracking',
    'auto-family-calls',
    'memory-reminders',
    'shared-calendar',
    'care-log',
    'scheduled-messages',
    'family-tasks',
    'automatic-media',
    'caregiver-call-reminders',
    'printed-photos',
  ],
};

export function canUsePlanFeature(tier: PlanTier, feature: PlanFeature) {
  return tierFeatures[tier].includes(feature);
}

export function isPlanTier(value: unknown): value is PlanTier {
  return value === 'connect' || value === 'family' || value === 'care';
}

export function isBillingCycle(value: unknown): value is BillingCycle {
  return value === 'monthly' || value === 'yearly';
}
