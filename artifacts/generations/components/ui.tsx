import { Feather } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withRepeat, withTiming } from 'react-native-reanimated';
import { fonts } from '@/constants/colors';
import { ME, Member, Post, ReactionKey, Role, roleLabel, useFamily } from '@/context/FamilyContext';
import { useColors } from '@/hooks/useColors';
import { fmtDuration, haptic, openSettings, persistMedia, timeAgo } from '@/lib/media';

export const webTop = Platform.OS === 'web' ? 67 : 0;
export const webBottom = Platform.OS === 'web' ? 34 : 0;

/* ---------- Press feedback ---------- */
export function PressScale({ style, children, onPress, scaleTo = 0.96, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; children: React.ReactNode }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      {...rest}
      onPressIn={() => { s.value = withSpring(scaleTo, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { s.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
      onPress={(e) => { haptic.tap(); onPress?.(e); }}
    >
      <Animated.View style={[style, a, rest.disabled ? { opacity: 0.45 } : null]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ---------- Avatar ---------- */
const roleTint = (c: ReturnType<typeof useColors>, role: Role) =>
  role === 'grandparent' ? { bg: c.goldSoft, fg: c.secondaryForeground } : role === 'parent' ? { bg: c.greenSoft, fg: c.primary } : { bg: c.terracottaSoft, fg: c.terracotta };

export function Avatar({ member, size = 40 }: { member?: Member; size?: number }) {
  const c = useColors();
  const t = roleTint(c, member?.role ?? 'parent');
  const initials = (member?.name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.display, color: t.fg, fontSize: size * 0.4 }}>{initials}</Text>
    </View>
  );
}

/* ---------- Badges ---------- */
export function OnDevicePill({ large }: { large?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.pill, { backgroundColor: c.muted }]} accessibilityLabel="Everything is stored on this device only">
      <Feather name="smartphone" size={large ? 15 : 12} color={c.mutedForeground} />
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: large ? 15 : 12, color: c.mutedForeground }}>On this device</Text>
    </View>
  );
}

export function SampleTag() {
  const c = useColors();
  return (
    <View style={[styles.tag, { borderColor: c.border }]}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, color: c.mutedForeground }}>SAMPLE</Text>
    </View>
  );
}

/* ---------- Empty / notices ---------- */
export function EmptyState({ icon, title, body, action }: { icon: keyof typeof Feather.glyphMap; title: string; body: string; action?: React.ReactNode }) {
  const c = useColors();
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.goldSoft }]}>
        <Feather name={icon} size={30} color={c.secondaryForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.foreground }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: c.mutedForeground }]}>{body}</Text>
      {action}
    </Animated.View>
  );
}

export function Notice({ tone = 'warn', text, actionLabel, onAction, onClose }: { tone?: 'warn' | 'info'; text: string; actionLabel?: string; onAction?: () => void; onClose?: () => void }) {
  const c = useColors();
  return (
    <Animated.View entering={FadeInDown} style={[styles.notice, { backgroundColor: tone === 'warn' ? c.terracottaSoft : c.greenSoft }]}>
      <Feather name={tone === 'warn' ? 'alert-circle' : 'info'} size={18} color={tone === 'warn' ? c.terracotta : c.primary} />
      <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: c.foreground }}>{text}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}><Text style={{ fontFamily: fonts.bodyBlack, color: c.primary }}>{actionLabel}</Text></Pressable>
      ) : null}
      {onClose ? <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Dismiss"><Feather name="x" size={18} color={c.mutedForeground} /></Pressable> : null}
    </Animated.View>
  );
}

export function PermissionNotice({ what, canAskAgain, onClose }: { what: string; canAskAgain: boolean; onClose: () => void }) {
  return (
    <Notice
      text={canAskAgain ? `Generations needs ${what} access for this. You can try again any time.` : `${what[0].toUpperCase()}${what.slice(1)} access is turned off. Turn it on in Settings to use this.`}
      actionLabel={!canAskAgain && Platform.OS !== 'web' ? 'Open Settings' : undefined}
      onAction={openSettings}
      onClose={onClose}
    />
  );
}

/* ---------- Audio ---------- */
export function AudioNote({ uri, durationMs, large, onDark }: { uri: string; durationMs?: number; large?: boolean; onDark?: boolean }) {
  const c = useColors();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (status.didJustFinish) { player.pause(); player.seekTo(0).catch(() => {}); }
  }, [status.didJustFinish, player]);
  const fg = onDark ? c.primaryForeground : c.primary;
  const total = durationMs ?? (status.duration ? status.duration * 1000 : 0);
  const progress = total ? Math.min(1, (status.currentTime * 1000) / total) : 0;
  const toggle = async () => {
    try {
      if (status.playing) player.pause();
      else {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
        player.play();
      }
      setErr(false);
    } catch { setErr(true); }
  };
  const size = large ? 56 : 40;
  return (
    <View style={styles.audioRow}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: onDark ? 'rgba(255,249,238,0.2)' : c.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={status.playing ? 'pause' : 'play'} size={large ? 26 : 18} color={fg} />
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: onDark ? 'rgba(255,249,238,0.25)' : c.muted, overflow: 'hidden' }}>
          <View style={{ width: `${progress * 100}%`, height: 6, backgroundColor: onDark ? c.accent : c.primary }} />
        </View>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: large ? 16 : 12, color: onDark ? c.primaryForeground : c.mutedForeground }}>
          {err ? 'Could not play this note' : `Voice note  ${fmtDuration(status.playing ? status.currentTime * 1000 : total)}`}
        </Text>
      </View>
    </View>
  );
}

export type RecorderState = 'idle' | 'recording' | 'denied' | 'blocked' | 'error';

export function useVoiceRecorder(onDone: (uri: string, durationMs: number) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const start = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) { setState(perm.canAskAgain ? 'denied' : 'blocked'); haptic.warn(); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      started.current = Date.now();
      setElapsed(0);
      timer.current = setInterval(() => setElapsed(Date.now() - started.current), 250);
      setState('recording');
      haptic.firm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recording could not start.');
      setState('error');
    }
  };
  const stop = async (keep = true) => {
    if (timer.current) clearInterval(timer.current);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      const dur = Date.now() - started.current;
      setState('idle');
      if (keep && recorder.uri && dur > 600) { haptic.success(); doneRef.current(await persistMedia(recorder.uri, Platform.OS === 'web' ? 'webm' : 'm4a'), dur); }
      else if (keep) { setError('That was too short. Hold on a little longer.'); setState('error'); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recording could not be saved.');
      setState('error');
    }
  };
  const clear = () => { setState('idle'); setError(null); };
  return { state, elapsed, error, start, stop, clear };
}

export function RecordingBar({ elapsed, onStop, onCancel }: { elapsed: number; onStop: () => void; onCancel: () => void }) {
  const c = useColors();
  const pulse = useSharedValue(1);
  useEffect(() => { pulse.value = withRepeat(withTiming(0.35, { duration: 700 }), -1, true); }, [pulse]);
  const dot = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={[styles.recBar, { backgroundColor: c.terracottaSoft }]}>
      <Animated.View style={[{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.terracotta }, dot]} />
      <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: c.foreground }}>Recording  {fmtDuration(elapsed)}</Text>
      <Pressable onPress={onCancel} hitSlop={8} accessibilityLabel="Discard recording" testID="rec-cancel"><Text style={{ fontFamily: fonts.bodyBold, color: c.mutedForeground }}>Discard</Text></Pressable>
      <Pressable onPress={onStop} style={[styles.recStop, { backgroundColor: c.terracotta }]} accessibilityLabel="Stop and keep recording" testID="rec-stop">
        <Feather name="square" size={14} color={c.primaryForeground} />
        <Text style={{ fontFamily: fonts.bodyBlack, color: c.primaryForeground }}>Done</Text>
      </Pressable>
    </View>
  );
}

/* ---------- Post card ---------- */
const reactionDefs: { key: ReactionKey; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { key: 'love', icon: 'heart', label: 'Love' },
  { key: 'proud', icon: 'award', label: 'Proud' },
  { key: 'laugh', icon: 'smile', label: 'Ha' },
];
export const quickReplies = ['Love it', 'So proud of you', 'Call me soon'];

export function PostCard({ post, simple, index = 0, onDelete, onOpenPhoto }: { post: Post; simple?: boolean; index?: number; onDelete: (p: Post) => void; onOpenPhoto?: (uri: string) => void }) {
  const c = useColors();
  const { memberById, toggleReaction, addReply, deleteReply } = useFamily();
  const author = memberById(post.authorId);
  const mine = post.authorId === ME;
  const big = simple ? 1.3 : 1;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 60).duration(380)} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.cardHead}>
        <Avatar member={author} size={simple ? 52 : 40} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 16 * big, color: c.foreground }} numberOfLines={1}>{mine ? 'You' : author?.name ?? 'Someone'}</Text>
            {post.sample ? <SampleTag /> : null}
          </View>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12 * big, color: c.mutedForeground }}>
            {author ? roleLabel[author.role] : ''} · {timeAgo(post.createdAt)}
          </Text>
        </View>
        {mine ? (
          <Pressable onPress={() => onDelete(post)} hitSlop={10} accessibilityLabel="Delete post" testID={`delete-${post.id}`} style={styles.iconBtn}>
            <Feather name="trash-2" size={simple ? 22 : 18} color={c.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {post.kind === 'photo' && post.uri ? (
        <Pressable onPress={() => onOpenPhoto?.(post.uri!)} accessibilityLabel="Open photo">
          <Image source={{ uri: post.uri }} style={[styles.photo, { backgroundColor: c.muted }]} contentFit="cover" transition={250} />
        </Pressable>
      ) : null}
      {post.kind === 'audio' && post.uri ? <View style={{ marginTop: 12 }}><AudioNote uri={post.uri} durationMs={post.durationMs} large={simple} /></View> : null}
      {post.text ? <Text style={{ fontFamily: fonts.body, fontSize: 17 * big, lineHeight: 25 * big, color: c.foreground, marginTop: 12 }}>{post.text}</Text> : null}

      {simple ? (
        <View style={{ gap: 10, marginTop: 16 }}>
          {quickReplies.map((q) => {
            const sent = post.replies.some((r) => r.authorId === ME && r.text === q);
            return (
              <PressScale key={q} onPress={() => (sent ? undefined : (haptic.success(), addReply(post.id, q)))} accessibilityRole="button" accessibilityLabel={sent ? `${q}, already replied` : `Reply ${q}`}
                style={[styles.bigReply, { backgroundColor: sent ? c.greenSoft : c.goldSoft }]}>
                <Feather name={sent ? 'check' : 'message-circle'} size={22} color={sent ? c.primary : c.secondaryForeground} />
                <Text style={{ fontFamily: fonts.bodyBlack, fontSize: 20, color: sent ? c.primary : c.secondaryForeground }}>{q}</Text>
              </PressScale>
            );
          })}
        </View>
      ) : (
        <View style={styles.reactRow}>
          {reactionDefs.map((r) => {
            const list = post.reactions[r.key] ?? [];
            const on = list.includes(ME);
            return (
              <PressScale key={r.key} onPress={() => toggleReaction(post.id, r.key)} accessibilityLabel={`${r.label}, ${list.length}`} testID={`react-${r.key}-${post.id}`}
                style={[styles.react, { backgroundColor: on ? c.primary : c.muted }]}>
                <Feather name={r.icon} size={15} color={on ? c.primaryForeground : c.mutedForeground} />
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: on ? c.primaryForeground : c.mutedForeground }}>{r.label}{list.length ? ` ${list.length}` : ''}</Text>
              </PressScale>
            );
          })}
        </View>
      )}

      {post.replies.length ? (
        <View style={[styles.replies, { borderTopColor: c.border }]}>
          {post.replies.map((r) => {
            const a = memberById(r.authorId);
            return (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14 * big, color: c.foreground }}>
                  <Text style={{ fontFamily: fonts.bodyBlack }}>{r.authorId === ME ? 'You' : a?.name ?? 'Someone'} </Text>{r.text}
                </Text>
                {r.authorId === ME ? (
                  <Pressable onPress={() => deleteReply(post.id, r.id)} hitSlop={8} accessibilityLabel="Remove reply"><Feather name="x" size={14} color={c.mutedForeground} /></Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </Animated.View>
  );
}

export function SkeletonFeed() {
  const c = useColors();
  const o = useSharedValue(0.5);
  useEffect(() => { o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true); }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <View style={{ padding: 20, gap: 14 }}>
      {[0, 1, 2].map((i) => <Animated.View key={i} style={[{ height: 140, borderRadius: 22, backgroundColor: c.muted }, a]} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  tag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, textAlign: 'center' },
  emptyBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 180 },
  recBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  recStop: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  card: { borderRadius: 24, borderWidth: 1, padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 6 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, marginTop: 12 },
  reactRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  react: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  bigReply: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, minHeight: 60, borderRadius: 18 },
  replies: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, gap: 8 },
});
