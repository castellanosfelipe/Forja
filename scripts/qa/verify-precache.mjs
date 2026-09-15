import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = resolve(project, 'frontend/dist');
const worker = await readFile(resolve(dist, 'service-worker.js'), 'utf8');
const handlers = new Map();
const cacheStores = new Map();
const origin = 'https://forja-precache.invalid';
let online = true;
let networkRequests = 0;
const urlOf = (request) => new URL(typeof request === 'string' ? request : request.url, origin);
const keyOf = (request) => urlOf(request).href;
const fetchAsset = async (request) => {
  networkRequests += 1;
  assert.ok(online, 'An offline shell resource unexpectedly required the network.');
  const url = urlOf(request);
  assert.equal(url.origin, origin, 'The precache must only include same-origin files.');
  const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  assert.ok(relative && !relative.includes('..'), 'Unsafe precache asset path.');
  const body = await readFile(resolve(dist, relative));
  return new Response(body, { headers: { 'Content-Type': relative.endsWith('.html') ? 'text/html' : 'application/octet-stream' } });
};
const caches = {
  async open(name) {
    if (!cacheStores.has(name)) cacheStores.set(name, new Map());
    const entries = cacheStores.get(name);
    return {
      async match(request) { return entries.get(keyOf(request))?.clone(); },
      async put(request, response) { entries.set(keyOf(request), response.clone()); },
      async addAll(requests) {
        const responses = await Promise.all(requests.map(async (request) => [keyOf(request), await fetchAsset(request)]));
        for (const [key, response] of responses) entries.set(key, response);
      },
    };
  },
  async match(request) {
    for (const entries of cacheStores.values()) {
      const response = entries.get(keyOf(request));
      if (response) return response.clone();
    }
  },
  async keys() { return [...cacheStores.keys()]; },
  async delete(name) { return cacheStores.delete(name); },
};
const self = {
  location: { origin },
  addEventListener(name, handler) { handlers.set(name, handler); },
  clients: { async claim() {} },
  registration: {},
};
runInNewContext(worker, { self, caches, fetch: fetchAsset, URL, Response });
async function dispatch(name, request) {
  let response;
  handlers.get(name)({ request, waitUntil(promise) { response = promise; }, respondWith(promise) { response = promise; } });
  return response;
}

await dispatch('install');
await dispatch('activate');
assert.ok(Array.isArray(self.__FORJA_PRECACHE), 'Run the frontend production build before checking precache.');
const precache = self.__FORJA_PRECACHE;
assert.equal(new Set(precache).size, precache.length, 'Precache includes duplicate files.');
const assets = (await readdir(resolve(dist, 'assets'))).filter((name) => /\.(js|css|woff2?)$/.test(name));
for (const name of assets) assert.ok(precache.includes(`/assets/${name}`), `${name} is missing from precache.`);
assert.ok(assets.filter((name) => name.endsWith('.js')).length > 6, 'Expected lazy route chunks in the build.');
online = false;
const beforeAssets = networkRequests;
for (const path of precache.filter((path) => path !== '/')) {
  const response = await dispatch('fetch', { url: `${origin}${path}`, method: 'GET', mode: 'cors', destination: path.endsWith('.js') ? 'script' : 'style' });
  assert.equal(response.status, 200, `${path} could not be served offline.`);
  assert.ok((await response.arrayBuffer()).byteLength > 0, `${path} is empty.`);
}
assert.equal(networkRequests, beforeAssets, 'An executable asset needed the network after installation.');
const navigation = await dispatch('fetch', { url: `${origin}/workout`, method: 'GET', mode: 'navigate' });
assert.equal(navigation.status, 200);
assert.match(await navigation.text(), /<div id="root"><\/div>/);
assert.equal(await dispatch('fetch', { url: `${origin}/api/state`, method: 'GET', mode: 'cors' }), undefined);
console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  result: 'PASS',
  precacheEntries: precache.length,
  executableAssets: assets.length,
  javascriptChunks: assets.filter((name) => name.endsWith('.js')).length,
  offlineAssetResponses: precache.length - 1,
  offlineNavigation: 'PASS',
  apiBypass: 'PASS',
  cacheNames: await caches.keys(),
  scope: 'Compiled worker and actual dist files in an isolated VM; not a native-browser installation test.',
}, null, 2));
