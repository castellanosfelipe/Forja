import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createECDH,randomBytes} from 'node:crypto';
const webPushMocks=vi.hoisted(()=>({setVapidDetails:vi.fn(),sendNotification:vi.fn()}));
vi.mock('../../../backend/node_modules/web-push/src/index.js',()=>({default:webPushMocks}));
vi.mock('node:dns/promises',()=>{
  const lookup=vi.fn(async()=>[{address:'8.8.8.8',family:4}]);
  return {lookup,default:{lookup}};
});
import {PushService} from '../../../backend/src/services/push.service';
const user={id:'qa-scheduler',stateFileKey:'qa-scheduler'} as any;
let service:PushService;
let state:any;
beforeEach(()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));
  webPushMocks.sendNotification.mockReset().mockResolvedValue({statusCode:201});
  state={revision:1,bodyMeasurementReminder:{enabled:false,intervalMonths:1,nextDueAt:'2026-09-09T00:00:01Z',lastNotifiedAt:null},
    pushSubscriptions:[{id:'qa-sub',endpoint:'https://push.example.invalid/qa',expirationTime:null,keys:{p256dh:createECDH('prime256v1').generateKeys().toString('base64url'),auth:randomBytes(16).toString('base64url')}}],restTimers:[]};
  const states={getOrCreate:vi.fn(async()=>structuredClone(state)),mutate:vi.fn(async(_user:any,mutate:any)=>{mutate(state);state.revision++;return structuredClone(state);})};
  service=new PushService({vapid:{subject:'mailto:qa@example.invalid',publicKey:'isolated',privateKey:'isolated'}} as any,states as any);
});
afterEach(()=>{service.shutdown();vi.useRealTimers();vi.restoreAllMocks();});
it('PWA-018 restores scheduled rest timer and persists sent outcome',async()=>{
  state.restTimers=[{id:'qa-timer',dueAt:'2026-09-09T00:00:01Z',status:'scheduled',title:'QA',body:'QA'}];
  await service.restore([user]);await vi.advanceTimersByTimeAsync(1100);
  expect(webPushMocks.sendNotification).toHaveBeenCalledOnce();expect(state.restTimers[0].status).toBe('sent');
});
it('PWA-019 cancelled rest timer does not deliver',async()=>{
  const timer=await service.scheduleRestTimer(user,1,'QA','QA');await service.cancelRestTimer(user,timer.id);await vi.advanceTimersByTimeAsync(1100);
  expect(webPushMocks.sendNotification).not.toHaveBeenCalled();expect(state.restTimers[0].status).toBe('cancelled');
});
it('PWA-020 expired Push subscriptions are removed after delivery failure',async()=>{
  webPushMocks.sendNotification.mockRejectedValue({statusCode:410});
  await service.scheduleRestTimer(user,1,'QA','QA');await vi.advanceTimersByTimeAsync(1100);
  expect(state.pushSubscriptions).toHaveLength(0);expect(state.restTimers[0].status).toBe('failed');
});
it('PWA-021 monthly reminder advances one month after successful notification',async()=>{
  state.bodyMeasurementReminder.enabled=true;await service.restore([user]);await vi.advanceTimersByTimeAsync(1100);
  expect(webPushMocks.sendNotification).toHaveBeenCalledOnce();expect(state.bodyMeasurementReminder.nextDueAt).toBe('2026-10-09T00:00:01.000Z');
});
it('PWA-022 monthly reminder retries after six hours when provider unavailable',async()=>{
  webPushMocks.sendNotification.mockRejectedValue({statusCode:503});state.bodyMeasurementReminder.enabled=true;
  await service.restore([user]);await vi.advanceTimersByTimeAsync(1100);
  expect(state.bodyMeasurementReminder.nextDueAt).toBe('2026-09-09T06:00:01.000Z');
  expect(state.pushSubscriptions).toHaveLength(1);
});
it('PWA-023 offline snooze synchronized through state must rearm later reminder',async()=>{
  state.bodyMeasurementReminder.enabled=true;await service.restore([user]);
  // PUT /api/state reconciles the persisted schedule after its atomic replacement.
  state.bodyMeasurementReminder.nextDueAt='2026-09-09T00:00:05Z';
  service.reconcile(user,state);
  await vi.advanceTimersByTimeAsync(6000);
  console.info('PWA-023 observation',JSON.stringify({dueAt:state.bodyMeasurementReminder.nextDueAt,now:new Date().toISOString(),sent:webPushMocks.sendNotification.mock.calls.length,pendingHandles:vi.getTimerCount()}));
  expect(webPushMocks.sendNotification).toHaveBeenCalledOnce();
});
