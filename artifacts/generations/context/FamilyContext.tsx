import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAllAppMedia } from '@/lib/media';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type Role = 'grandparent' | 'parent' | 'grandchild';
export type ContentKind = 'text' | 'photo' | 'audio';
export type ReactionKey = 'love' | 'proud' | 'laugh';

export interface Member { id: string; name: string; role: Role; sample: boolean }
export interface Reply { id: string; authorId: string; text: string; createdAt: number }
export interface Post {
  id: string; authorId: string; kind: ContentKind; text?: string; uri?: string; durationMs?: number;
  createdAt: number; reactions: Record<ReactionKey, string[]>; replies: Reply[]; sample: boolean;
}
export interface Message {
  id: string; threadId: string; authorId: string; kind: ContentKind; text?: string; uri?: string;
  durationMs?: number; createdAt: number; sample: boolean;
}
export interface Thread { id: string; kind: 'group' | 'direct'; memberId?: string }
export interface Profile { name: string; role: Role; circleName: string; createdAt: number }

interface FamilyState { profile: Profile | null; members: Member[]; posts: Post[]; messages: Message[] }

export type NewContent = { kind: ContentKind; text?: string; uri?: string; durationMs?: number };

interface Ctx extends FamilyState {
  ready: boolean;
  loadError: string | null;
  saveError: string | null;
  me: Member | null;
  threads: Thread[];
  memberById: (id: string) => Member | undefined;
  completeOnboarding: (p: { name: string; role: Role; circleName: string; withSamples: boolean }) => void;
  updateProfile: (p: Partial<Pick<Profile, 'name' | 'role' | 'circleName'>>) => void;
  addPost: (c: NewContent) => void;
  deletePost: (id: string) => void;
  toggleReaction: (postId: string, key: ReactionKey) => void;
  addReply: (postId: string, text: string) => void;
  deleteReply: (postId: string, replyId: string) => void;
  sendMessage: (threadId: string, c: NewContent) => void;
  deleteMessage: (id: string) => void;
  removeSamples: () => void;
  resetAll: () => Promise<void>;
  retryLoad: () => void;
}

const KEY = 'generations:state:v1';
export const ME = 'me';
export const GROUP_THREAD = 'group';
const empty: FamilyState = { profile: null, members: [], posts: [], messages: [] };

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const noReactions = (): Record<ReactionKey, string[]> => ({ love: [], proud: [], laugh: [] });

function buildSamples(role: Role): Pick<FamilyState, 'members' | 'posts' | 'messages'> {
  const all: Member[] = [
    { id: 's-ruth', name: 'Grandma Ruth', role: 'grandparent', sample: true },
    { id: 's-dana', name: 'Dana', role: 'parent', sample: true },
    { id: 's-milo', name: 'Milo', role: 'grandchild', sample: true },
  ];
  const members = all.filter((m) => m.role !== role).concat(all.filter((m) => m.role === role).slice(0, 0));
  const h = 3600_000;
  const now = Date.now();
  const posts: Post[] = ([
    { id: uid(), authorId: 's-milo', kind: 'text', text: 'Made the junior soccer team. Coach says I have the fastest feet on the left side.', createdAt: now - 2 * h, reactions: { love: ['s-ruth'], proud: ['s-dana'], laugh: [] }, replies: [{ id: uid(), authorId: 's-ruth', text: 'So proud of you', createdAt: now - h }], sample: true },
    { id: uid(), authorId: 's-ruth', kind: 'text', text: 'The tomatoes finally came in. Saving the biggest ones for Sunday lunch.', createdAt: now - 20 * h, reactions: noReactions(), replies: [], sample: true },
    { id: uid(), authorId: 's-dana', kind: 'text', text: 'Sunday lunch is at Grandma\'s, 12:30. Milo is bringing his medal.', createdAt: now - 30 * h, reactions: { love: [], proud: [], laugh: ['s-milo'] }, replies: [], sample: true },
  ] as Post[]).filter((p) => members.some((m) => m.id === p.authorId)).map((p) => ({ ...p, replies: p.replies.filter((r) => members.some((m) => m.id === r.authorId)) }));
  const messages: Message[] = ([
    { id: uid(), threadId: GROUP_THREAD, authorId: 's-dana', kind: 'text', text: 'Who is bringing dessert on Sunday?', createdAt: now - 5 * h, sample: true },
    { id: uid(), threadId: GROUP_THREAD, authorId: 's-milo', kind: 'text', text: 'Not me, I am bringing the medal.', createdAt: now - 4.6 * h, sample: true },
    { id: uid(), threadId: 's-ruth', authorId: 's-ruth', kind: 'text', text: 'Call me when you get a minute, dear.', createdAt: now - 26 * h, sample: true },
  ] as Message[]).filter((m) => members.some((x) => x.id === m.authorId));
  return { members, posts, messages };
}

const FamilyContext = createContext<Ctx | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FamilyState>(empty);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadTick, setLoadTick] = useState(0);
  const hydrated = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!alive) return;
        if (raw) setState({ ...empty, ...JSON.parse(raw) });
        setLoadError(null);
        hydrated.current = true;
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Could not read saved data on this device.');
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, [loadTick]);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state))
      .then(() => setSaveError(null))
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Could not save on this device.'));
  }, [state]);

  const memberById = useCallback((id: string) => {
    if (id === ME && state.profile) return { id: ME, name: state.profile.name, role: state.profile.role, sample: false };
    return state.members.find((m) => m.id === id);
  }, [state.members, state.profile]);

  const value = useMemo<Ctx>(() => {
    const me: Member | null = state.profile ? { id: ME, name: state.profile.name, role: state.profile.role, sample: false } : null;
    const threads: Thread[] = [{ id: GROUP_THREAD, kind: 'group' }, ...state.members.map((m) => ({ id: m.id, kind: 'direct' as const, memberId: m.id }))];
    return {
      ...state, ready, loadError, saveError, me, threads, memberById,
      completeOnboarding: ({ name, role, circleName, withSamples }) => {
        hydrated.current = true;
        const s = withSamples ? buildSamples(role) : { members: [], posts: [], messages: [] };
        setState({ profile: { name, role, circleName, createdAt: Date.now() }, ...s });
      },
      updateProfile: (p) => setState((s) => (s.profile ? { ...s, profile: { ...s.profile, ...p } } : s)),
      addPost: (c) => setState((s) => ({ ...s, posts: [{ id: uid(), authorId: ME, ...c, createdAt: Date.now(), reactions: noReactions(), replies: [], sample: false }, ...s.posts] })),
      deletePost: (id) => setState((s) => ({ ...s, posts: s.posts.filter((p) => !(p.id === id && p.authorId === ME)) })),
      toggleReaction: (postId, key) => setState((s) => ({
        ...s,
        posts: s.posts.map((p) => {
          if (p.id !== postId) return p;
          const list = p.reactions[key] ?? [];
          return { ...p, reactions: { ...p.reactions, [key]: list.includes(ME) ? list.filter((x) => x !== ME) : [...list, ME] } };
        }),
      })),
      addReply: (postId, text) => setState((s) => ({ ...s, posts: s.posts.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, { id: uid(), authorId: ME, text, createdAt: Date.now() }] } : p)) })),
      deleteReply: (postId, replyId) => setState((s) => ({ ...s, posts: s.posts.map((p) => (p.id === postId ? { ...p, replies: p.replies.filter((r) => !(r.id === replyId && r.authorId === ME)) } : p)) })),
      sendMessage: (threadId, c) => setState((s) => ({ ...s, messages: [...s.messages, { id: uid(), threadId, authorId: ME, ...c, createdAt: Date.now(), sample: false }] })),
      deleteMessage: (id) => setState((s) => ({ ...s, messages: s.messages.filter((m) => !(m.id === id && m.authorId === ME)) })),
      removeSamples: () => setState((s) => ({
        ...s,
        members: [],
        posts: s.posts.filter((p) => !p.sample).map((p) => ({ ...p, replies: p.replies.filter((r) => r.authorId === ME), reactions: { love: p.reactions.love.filter((x) => x === ME), proud: p.reactions.proud.filter((x) => x === ME), laugh: p.reactions.laugh.filter((x) => x === ME) } })),
        messages: s.messages.filter((m) => !m.sample && (m.threadId === GROUP_THREAD)),
      })),
      resetAll: async () => {
        await AsyncStorage.removeItem(KEY);
        setState(empty);
        const failed = deleteAllAppMedia();
        if (failed) throw new Error(`Your data was erased, but ${failed} media file(s) could not be deleted.`);
      },
      retryLoad: () => { setReady(false); setLoadTick((t) => t + 1); },
    };
  }, [state, ready, loadError, saveError, memberById]);

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider');
  return ctx;
}

export const roleLabel: Record<Role, string> = { grandparent: 'Grandparent', parent: 'Parent', grandchild: 'Grandchild' };
export const homeRouteFor = (role: Role) => (role === 'grandparent' ? '/simple' : '/(tabs)');
