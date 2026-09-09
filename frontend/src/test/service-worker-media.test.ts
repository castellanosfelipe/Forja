/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('exercise media offline cache', () => {
  it('keeps exercise images separate from the application shell', () => {
    const worker = readFileSync('public/service-worker.js', 'utf8');

    expect(worker).toContain("const SHELL_CACHE = 'forja-shell-v3'");
    expect(worker).toContain("const MEDIA_CACHE = 'forja-exercise-media-v1'");
    expect(worker).toContain("url.pathname.startsWith('/exercise-media/')");
    expect(worker).toContain('caches.open(MEDIA_CACHE)');
    expect(worker).toContain('!ACTIVE_CACHES.has(key)');
  });
});
