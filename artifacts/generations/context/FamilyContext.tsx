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
export interface Profile { name: string; role: Role; circleName: string; phone: string; createdAt: number }
export interface FamilyRoom {
  id: string; name: string; code: string; createdAt: number;
  members: Member[]; posts: Post[]; messages: Message[];
}

interface FamilyState { profile: Profile | null; familyRooms: FamilyRoom[]; activeFamilyId: string }

export type NewContent = { kind: ContentKind; text?: string; uri?: string; durationMs?: number };

interface Ctx extends FamilyState {
  ready: boolean;
  loadError: string | null;
  saveError: string | null;
  me: Member | null;
  activeFamily: FamilyRoom | null;
  threads: Thread[];
  familyRooms: FamilyRoom[];
  memberById: (id: string) => Member | undefined;
  completeOnboarding: (p: { name: string; role: Role; circleName: string; phone: string; withSamples: boolean }) => void;
  createFamily: (name: string, withSamples: boolean) => FamilyRoom;
  joinFamily: (code: string) => { ok: true; family: FamilyRoom } | { ok: false; reason: string };
  setActiveFamily: (id: string) => void;
  updateProfile: (p: Partial<Pick<Profile, 'name' | 'role' | 'circleName' | 'phone'>>) => void;
  members: Member[];
  posts: Post[];
  messages: Message[];
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
const empty: FamilyState = { profile: null, familyRooms: [], activeFamilyId: '' };

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const createRoomCode = () => `GEN-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const noReactions = (): Record<ReactionKey, string[]> => ({ love: [], proud: [], laugh: [] });

type FamilyContent = Pick<FamilyRoom, 'members' | 'posts' | 'messages'>;

function buildSamples(role: Role): FamilyContent {
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
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<FamilyState> & {
            members?: Member[]; posts?: Post[]; messages?: Message[];
          };
          if (parsed.profile && !parsed.familyRooms) {
            const legacyId = uid();
            const legacyRoom: FamilyRoom = {
              id: legacyId, name: parsed.profile.circleName || 'My Family', code: 'GEN-DEMO',
              createdAt: parsed.profile.createdAt || Date.now(),
              members: (parsed.members ?? []).map((m) => ({ ...m })),
              posts: (parsed.posts ?? []).map((p) => ({ ...p })),
              messages: (parsed.messages ?? []).map((m) => ({ ...m })),
            };
            setState({ profile: { ...parsed.profile, phone: parsed.profile.phone ?? '' }, familyRooms: [legacyRoom], activeFamilyId: legacyId });
          } else {
            setState({
              ...empty, ...parsed,
              profile: parsed.profile ? { ...parsed.profile, phone: parsed.profile.phone ?? '' } : null,
              familyRooms: parsed.familyRooms ?? [],
            });
          }
        }
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

  const activeFamily = state.familyRooms.find((room) => room.id === state.activeFamilyId) ?? null;
  const members = activeFamily?.members ?? [];
  const posts = activeFamily?.posts ?? [];
  const messages = activeFamily?.messages ?? [];

  const memberById = useCallback((id: string) => {
    if (id === ME && state.profile) return { id: ME, name: state.profile.name, role: state.profile.role, sample: false };
    return activeFamily?.members.find((m) => m.id === id);
  }, [activeFamily, state.profile]);

  const value = useMemo<Ctx>(() => {
    const me: Member | null = state.profile ? { id: ME, name: state.profile.name, role: state.profile.role, sample: false } : null;
    const threads: Thread[] = [{ id: GROUP_THREAD, kind: 'group' }, ...members.map((m) => ({ id: m.id, kind: 'direct' as const, memberId: m.id }))];
    return {
      ...state, ready, loadError, saveError, me, activeFamily, members, posts, messages, threads, memberById,
      familyRooms: state.familyRooms,
      completeOnboarding: ({ name, role, circleName, phone, withSamples }) => {
        hydrated.current = true;
        const sampleData = withSamples ? buildSamples(role) : { members: [], posts: [], messages: [] };
        const room: FamilyRoom = {
          id: uid(), name: circleName, code: createRoomCode(), createdAt: Date.now(),
          members: sampleData.members, posts: sampleData.posts, messages: sampleData.messages,
        };
        setState({ profile: { name, role, circleName, phone, createdAt: Date.now() }, familyRooms: [room], activeFamilyId: room.id });
      },
      createFamily: (name, withSamples) => {
        const room: FamilyRoom = { id: uid(), name, code: createRoomCode(), createdAt: Date.now(), ...(withSamples ? buildSamples(state.profile?.role ?? 'parent') : { members: [], posts: [], messages: [] }) };
        setState((s) => ({ ...s, familyRooms: [...s.familyRooms, room], activeFamilyId: room.id, profile: s.profile ? { ...s.profile, circleName: name } : null }));
        return room;
      },
      joinFamily: (input) => {
        const code = input.trim().toUpperCase();
        const found = state.familyRooms.find((room) => room.code.toUpperCase() === code);
        if (found) {
          setState((s) => ({ ...s, activeFamilyId: found.id, profile: s.profile ? { ...s.profile, circleName: found.name } : null }));
          return { ok: true as const, family: found };
        }
        if (code === 'GEN-DEMO') {
          const sampleData = buildSamples(state.profile?.role ?? 'parent');
          const room: FamilyRoom = { id: uid(), name: 'The Demo Family', code, createdAt: Date.now(), ...sampleData };
          setState((s) => ({ ...s, familyRooms: [...s.familyRooms, room], activeFamilyId: room.id, profile: s.profile ? { ...s.profile, circleName: room.name } : null }));
          return { ok: true as const, family: room };
        }
        return { ok: false as const, reason: 'That room code is not saved on this device. Cross-device room joining is not connected yet. Try the demo code GEN-DEMO.' };
      },
      setActiveFamily: (id) => setState((s) => {
        const room = s.familyRooms.find((f) => f.id === id);
        return room ? { ...s, activeFamilyId: id, profile: s.profile ? { ...s.profile, circleName: room.name } : null } : s;
      }),
      updateProfile: (p) => setState((s) => {
        if (!s.profile) return s;
        const familyRooms = p.circleName
          ? s.familyRooms.map((room) => room.id === s.activeFamilyId ? { ...room, name: p.circleName! } : room)
          : s.familyRooms;
        return { ...s, familyRooms, profile: { ...s.profile, ...p } };
      }),
      addPost: (c) => setState((s) => ({ ...s, familyRooms: s.familyRooms.map((r) => r.id === s.activeFamilyId ? { ...r, posts: [{ id: uid(), authorId: ME, ...c, createdAt: Date.now(), reactions: noReactions(), replies: [], sample: false }, ...r.posts] } : r) })),
      deletePost: (id) => setState((s) => ({ ...s, familyRooms: s.familyRooms.map((r) => r.id === s.activeFamilyId ? { ...r, posts: r.posts.filter((p) => !(p.id === id && p.authorId === ME)) } : r) })),
      toggleReaction: (postId, key) => setState((s) => ({
        ...s,
        familyRooms: s.familyRooms.map((r) => r.id !== s.activeFamilyId ? r : ({ ...r, posts: r.posts.map((p) => {
          if (p.id !== postId) return p;
          const list = p.reactions[key] ?? [];
          return { ...p, reactions: { ...p.reactions, [key]: list.includes(ME) ? list.filter((x) => x !== ME) : [...list, ME] } };
        }) })),
      })),
      addReply: (postId, text) => setState((s) => ({ ...s, familyRooms: s.familyRooms.map((r) => r.id !== s.activeFamilyId ? r : ({ ...r, posts: r.posts.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, { id: uid(), authorId: ME, text, createdAt: Date.now() }] } : p)) })) })),
      deleteReply: (postId, replyId) => setState((s) => ({ ...s, familyRooms: s.familyRooms.map((r) => r.id !== s.activeFamilyId ? r : ({ ...r, posts: r.posts.map((p) => (p.id === postId ? { ...p, replies: p.replies.filter((reply) => !(reply.id === replyId && reply.authorId === ME)) } : p)) })) })),
      sendMessage: (threadId, c) => setState((s) => ({ ...s, familyRooms: s.familyRooms.map((r) => r.id === s.activeFamilyId ? { ...r, messages: [...r.messages, { id: uid(), threadId, authorId: ME, ...c, createdAt: Date.now(), sample: false }] } : r) })),
      deleteMessage: (id) => setState((s) => ({ ...s, familyRooms: s.familyRooms.map((r) => r.id === s.activeFamilyId ? { ...r, messages: r.messages.filter((m) => !(m.id === id && m.authorId === ME)) } : r) })),
      removeSamples: () => setState((s) => ({ ...s, familyRooms: s.familyRooms.map((r) => r.id !== s.activeFamilyId ? r : ({ ...r,
        members: [], posts: r.posts.filter((p) => !p.sample).map((p) => ({ ...p, replies: p.replies.filter((reply) => reply.authorId === ME), reactions: { love: p.reactions.love.filter((x) => x === ME), proud: p.reactions.proud.filter((x) => x === ME), laugh: p.reactions.laugh.filter((x) => x === ME) } })),
        messages: r.messages.filter((m) => !m.sample && m.threadId === GROUP_THREAD),
      })) })),
      resetAll: async () => {
        await AsyncStorage.removeItem(KEY);
        setState(empty);
        const failed = deleteAllAppMedia();
        if (failed) throw new Error(`Your data was erased, but ${failed} media file(s) could not be deleted.`);
      },
      retryLoad: () => { setReady(false); setLoadTick((t) => t + 1); },
    };
  }, [state, ready, loadError, saveError, memberById, activeFamily, members, posts, messages]);

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider');
  return ctx;
}

export const roleLabel: Record<Role, string> = { grandparent: 'Grandparent', parent: 'Parent', grandchild: 'Grandchild' };
export const homeRouteFor = (role: Role) => (role === 'grandparent' ? '/simple' : '/(tabs)');
