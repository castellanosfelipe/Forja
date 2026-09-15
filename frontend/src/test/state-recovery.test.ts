import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const offline = vi.hoisted(() => new Map<string, unknown>());
const apiMocks = vi.hoisted(() => ({get: vi.fn(), replace: vi.fn()}));
const storageControl = vi.hoisted(() => ({fail: false}));
vi.mock('../pwa/offline-db', () => ({
  readOfflineValue: vi.fn(async (key: string) => structuredClone(offline.get(key) ?? null)),
  changeOfflineValues: vi.fn(async (entries: ReadonlyArray<readonly [string, unknown]>, deletes: readonly string[] = []) => {
    if (storageControl.fail) throw new Error('QuotaExceededError');
    for (const [key, value] of entries) offline.set(key, structuredClone(value));
    for (const key of deletes) offline.delete(key);
  }),
  writeOfflineValue: vi.fn(async (key: string, value: unknown) => {
    if (storageControl.fail) throw new Error('QuotaExceededError');
    offline.set(key, structuredClone(value));
  }),
  deleteOfflineValue: vi.fn(async (key: string) => {offline.delete(key);}),
}));
vi.mock('../api/state.api', () => ({stateApi: apiMocks}));
import {useStateStore} from '../stores/state.store';
import {useAuthStore} from '../stores/auth.store';
import {authApi} from '../api/auth.api';
import {ApiError} from '../api/client';
import { changeOfflineValues, readOfflineValue } from '../pwa/offline-db';

const user = {id:'qa-user', username:'qa-user', displayName:'QA isolated', passkeys:[], passwordEnabled:true, createdAt:'2026-09-09T00:00:00Z'};
function fixture(revision = 1) {
  return {schemaVersion:1, revision, owner:{userId:user.id, stateFileKey:user.id, createdAt:user.createdAt,updatedAt:user.createdAt},
    preferences:{locale:'es',restTimer:{},guidedWorkout:{}}, bodyWeight:{goal:null,entries:[]},
    bodyMetrics:{profile:{sex:null,ageYears:null,heightCm:null,activityLevel:'moderate',goal:'maintain'},entries:[]},
    bodyMeasurementReminder:{enabled:true,intervalMonths:1,nextDueAt:'2026-10-09T00:00:00Z',lastNotifiedAt:null},
    onboarding:{completedAt:null,trainingGoal:'hypertrophy',experience:'beginner',trainingDaysPerWeek:3,sessionMinutes:60,equipment:'full-gym',priorityMuscles:[],limitations:[],generatedAt:null,methodologyVersion:'forja-safe-v1'},
    exerciseLibrary:[],weeklyPlan:{id:'plan',name:'Plan',effectiveFrom:'2026-09-09',days:[]},scheduleOverrides:[],workoutSessions:[],progression:{exerciseRules:[]},pushSubscriptions:[],restTimers:[]};
}
beforeEach(() => {
  offline.clear(); storageControl.fail=false; apiMocks.get.mockReset();apiMocks.replace.mockReset();
  Object.defineProperty(navigator,'onLine',{configurable:true,value:true});
  useAuthStore.setState({user,status:'authenticated'});
  useStateStore.setState({state:null,status:'idle',error:null,hasPendingChanges:false});
});
afterEach(() => {vi.restoreAllMocks();localStorage.clear();});

it('PWA-001 online load caches server state', async () => {
  apiMocks.get.mockResolvedValue(fixture());
  await useStateStore.getState().load();
  expect(useStateStore.getState().state).toEqual(fixture());
  expect(offline.get('server-state:qa-user')).toEqual(fixture());
});
it('PWA-002 offline mutation survives flush after reconnect', async () => {
  const initial=fixture();useStateStore.setState({state:initial as any});
  offline.set('server-state:qa-user',initial);
  Object.defineProperty(navigator,'onLine',{configurable:true,value:false});
  await useStateStore.getState().update(s=>{s.preferences.locale='en';});
  expect(useStateStore.getState().hasPendingChanges).toBe(true);
  Object.defineProperty(navigator,'onLine',{configurable:true,value:true});
  apiMocks.replace.mockImplementation(async s=>({...s,revision:2}));
  await useStateStore.getState().flush();
  expect(useStateStore.getState().state?.preferences.locale).toBe('en');
  expect(offline.has('pending-state:qa-user')).toBe(false);
});
it('PWA-003 reload must preserve conflict base instead of overwriting remote preferences', async () => {
  const base=fixture();const pending=fixture();const remote=fixture(2);
  pending.preferences.locale='en';remote.preferences.locale='pt';
  offline.set('server-state:qa-user',base);offline.set('cached-state:qa-user',pending);offline.set('pending-state:qa-user',pending);
  apiMocks.get.mockResolvedValue(remote);
  apiMocks.replace.mockRejectedValueOnce(new ApiError(409,'CONFLICT','Conflict')).mockImplementation(async s=>({...s,revision:3}));
  await useStateStore.getState().load();
  expect(useStateStore.getState().status).toBe('conflict');
  expect(apiMocks.replace).toHaveBeenCalledTimes(1);
});
it('PWA-004 offline reload must preserve pending flag for logout warning', async () => {
  const pending=fixture();pending.preferences.locale='en';
  offline.set('cached-state:qa-user',pending);offline.set('pending-state:qa-user',pending);offline.set('server-state:qa-user',fixture());
  Object.defineProperty(navigator,'onLine',{configurable:true,value:false});
  apiMocks.get.mockRejectedValue(new TypeError('Failed to fetch'));
  await useStateStore.getState().load();
  expect(useStateStore.getState().hasPendingChanges).toBe(true);
});
it('PWA-005 storage quota failure must expose recoverable error instead of stuck syncing', async () => {
  useStateStore.setState({state:fixture() as any});storageControl.fail=true;
  await useStateStore.getState().update(s=>{s.preferences.locale='en';}).catch(()=>undefined);
  expect(useStateStore.getState().status).toBe('error');
  expect(useStateStore.getState().error).not.toBeNull();
});
it('PWA-006 failed logout must not silently reauthenticate on reload', async () => {
  useAuthStore.getState().setUser(user);
  vi.spyOn(authApi,'logout').mockRejectedValue(new TypeError('Failed to fetch'));
  vi.spyOn(authApi,'session').mockResolvedValue({authenticated:true,user});
  await useAuthStore.getState().logout().catch(()=>undefined);
  expect(useAuthStore.getState().status).toBe('anonymous');
  await useAuthStore.getState().initialize();
  expect(useAuthStore.getState().status).toBe('anonymous');
});
it('PWA-007 logout during inflight load must not repopulate cleared data', async () => {
  let resolveRemote:(value:unknown)=>void=()=>{};
  apiMocks.get.mockImplementation(()=>new Promise(resolve=>{resolveRemote=resolve;}));
  const loading=useStateStore.getState().load();
  await vi.waitFor(()=>expect(apiMocks.get).toHaveBeenCalled());
  useStateStore.getState().reset();useAuthStore.setState({user:null,status:'anonymous'});
  resolveRemote(fixture());await loading;
  expect(useStateStore.getState().state).toBeNull();
  expect(offline.has('cached-state:qa-user')).toBe(false);
});

it('PWA-036 quota recovery retries the in-memory draft without losing its change', async () => {
  const base = fixture();
  useStateStore.setState({ state: base as any });
  offline.set('server-state:qa-user', base);
  storageControl.fail = true;
  await useStateStore.getState().update((draft) => { draft.preferences.locale = 'en'; });
  expect(useStateStore.getState().state?.preferences.locale).toBe('en');
  expect(apiMocks.replace).not.toHaveBeenCalled();
  storageControl.fail = false;
  apiMocks.replace.mockImplementation(async (draft) => ({ ...draft, revision: 2 }));
  await useStateStore.getState().flush();
  expect(useStateStore.getState().status).toBe('idle');
  expect(useStateStore.getState().state?.preferences.locale).toBe('en');
  expect(offline.has('pending-state:qa-user')).toBe(false);
});

it('PWA-037 unreadable draft storage cannot be overwritten by a remote load', async () => {
  const pending = fixture();
  pending.preferences.locale = 'en';
  offline.set('pending-state:qa-user', pending);
  vi.mocked(readOfflineValue).mockRejectedValueOnce(new Error('Read failed'));
  apiMocks.get.mockResolvedValue(fixture(2));
  await useStateStore.getState().load();
  expect(useStateStore.getState().status).toBe('error');
  expect(apiMocks.get).not.toHaveBeenCalled();
  expect(offline.get('pending-state:qa-user')).toEqual(pending);
});

it('PWA-038 a previous account response cannot replace a new account state', async () => {
  let resolveRemote: (value: unknown) => void = () => {};
  apiMocks.get.mockImplementation(() => new Promise((resolve) => { resolveRemote = resolve; }));
  const loading = useStateStore.getState().load();
  await vi.waitFor(() => expect(apiMocks.get).toHaveBeenCalled());
  useAuthStore.setState({ user: { ...user, id: 'second-user' } });
  resolveRemote(fixture());
  await loading;
  expect(useStateStore.getState().state).toBeNull();
  expect(offline.has('cached-state:qa-user')).toBe(false);
});

it('PWA-039 reset waits for started writes before deleting all private snapshots', async () => {
  let releaseWrite: () => void = () => {};
  useStateStore.setState({ state: fixture() as any });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  vi.mocked(changeOfflineValues).mockImplementationOnce(async (entries) => {
    await new Promise<void>((resolve) => { releaseWrite = resolve; });
    for (const [key, value] of entries) offline.set(key, value);
  });
  const updating = useStateStore.getState().update((draft) => { draft.preferences.locale = 'en'; });
  await vi.waitFor(() => expect(useStateStore.getState().hasPendingChanges).toBe(true));
  const resetting = useStateStore.getState().reset();
  releaseWrite();
  await Promise.all([updating, resetting]);
  expect(offline.size).toBe(0);
  expect(useStateStore.getState().state).toBeNull();
});

it('PWA-040 local commit failure after server acknowledgement stays recoverable', async () => {
  const base = fixture();
  useStateStore.setState({ state: base as any });
  offline.set('server-state:qa-user', base);
  apiMocks.replace.mockImplementation(async (draft) => { storageControl.fail = true; return { ...draft, revision: 2 }; });
  await useStateStore.getState().update((draft) => { draft.preferences.locale = 'en'; });
  expect(useStateStore.getState().status).toBe('error');
  expect(useStateStore.getState().hasPendingChanges).toBe(true);
  expect((offline.get('server-state:qa-user') as any).preferences.locale).toBe('es');
  expect((offline.get('pending-state:qa-user') as any).preferences.locale).toBe('en');
});
