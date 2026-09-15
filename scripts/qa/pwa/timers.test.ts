import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,renderHook} from '@testing-library/react';
import {useRestTimer} from '../../../frontend/src/hooks/useRestTimer';
import {useWakeLock} from '../../../frontend/src/hooks/useWakeLock';
import {pushApi} from '../../../frontend/src/pwa/push';
beforeEach(()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));
  Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted'}});
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();});
it('PWA-008 rest timer extension updates remote notification deadline',async()=>{
  const schedule=vi.spyOn(pushApi,'scheduleTimer').mockResolvedValue({id:'qa-timer'} as any);
  vi.spyOn(pushApi,'cancelTimer').mockResolvedValue(undefined);
  const {result}=renderHook(()=>useRestTimer(true));
  await act(async()=>{await result.current.start(60);});
  await act(async()=>{result.current.add(30);});
  console.info('PWA-008 observation',JSON.stringify({remaining:result.current.remaining,scheduledSeconds:schedule.mock.calls.map(args=>args[0])}));
  expect(result.current.remaining).toBe(90);
  expect(schedule).toHaveBeenLastCalledWith(90);
});
it('PWA-009 skip while remote scheduling pending cancels resulting notification',async()=>{
  let resolveTimer:(value:unknown)=>void=()=>{};
  vi.spyOn(pushApi,'scheduleTimer').mockImplementation(()=>new Promise(resolve=>{resolveTimer=resolve;}) as any);
  const cancel=vi.spyOn(pushApi,'cancelTimer').mockResolvedValue(undefined);
  const {result}=renderHook(()=>useRestTimer(true));
  let starting:Promise<void>=Promise.resolve();act(()=>{starting=result.current.start(60);});
  await act(async()=>{await result.current.cancel();});
  await act(async()=>{resolveTimer({id:'qa-late'});await starting;});
  console.info('PWA-009 observation',JSON.stringify({running:result.current.running,cancelCalls:cancel.mock.calls.length}));
  expect(cancel).toHaveBeenCalledWith('qa-late');
});
it('PWA-010 timer uses elapsed wall time after suspended tab',async()=>{
  const {result}=renderHook(()=>useRestTimer(false));
  await act(async()=>{await result.current.start(60);});
  await act(async()=>{vi.setSystemTime(new Date('2026-09-09T00:01:01Z'));await vi.advanceTimersByTimeAsync(250);});
  expect(result.current.remaining).toBe(0);expect(result.current.running).toBe(false);
});
it('PWA-011 wake lock released if acquisition resolves after unmount',async()=>{
  let resolveLock:(value:unknown)=>void=()=>{};
  const release=vi.fn(async()=>{});
  Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:vi.fn(()=>new Promise(resolve=>{resolveLock=resolve;}))}});
  const {unmount}=renderHook(()=>useWakeLock(true));unmount();
  await act(async()=>{resolveLock({released:false,release,addEventListener:vi.fn()});await Promise.resolve();});
  expect(release).toHaveBeenCalledOnce();
});
it('PWA-012 wake lock denial degrades without exception',async()=>{
  Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:vi.fn().mockRejectedValue(new Error('NotAllowedError'))}});
  const {result}=renderHook(()=>useWakeLock(true));
  await act(async()=>{await Promise.resolve();});
  expect(result.current.active).toBe(false);expect(result.current.supported).toBe(true);
});
