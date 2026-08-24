import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWakeLock } from '../hooks/useWakeLock';

const wakeLockDescriptor = Object.getOwnPropertyDescriptor(navigator, 'wakeLock');
const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

afterEach(() => {
  if (wakeLockDescriptor) Object.defineProperty(navigator, 'wakeLock', wakeLockDescriptor);
  else Reflect.deleteProperty(navigator, 'wakeLock');
  if (visibilityDescriptor) Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
  vi.restoreAllMocks();
});

describe('useWakeLock', () => {
  it('clears a released sentinel and reacquires it when the page becomes visible', async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    const first = sentinel();
    const second = sentinel();
    const request = vi.fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    render(<WakeLockHarness />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('activo'));
    expect(request).toHaveBeenCalledTimes(1);

    first.dispatchEvent(new Event('release'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('pausado'));
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('activo'));
  });
});

function WakeLockHarness() {
  const wakeLock = useWakeLock(true);
  return <span role="status">{wakeLock.active ? 'activo' : 'pausado'}</span>;
}

function sentinel(): WakeLockSentinel {
  const target = new EventTarget() as WakeLockSentinel & { released: boolean };
  Object.defineProperty(target, 'released', { configurable: true, writable: true, value: false });
  Object.defineProperty(target, 'type', { configurable: true, value: 'screen' });
  target.release = vi.fn(async () => {
    target.released = true;
    target.dispatchEvent(new Event('release'));
  });
  return target;
}
