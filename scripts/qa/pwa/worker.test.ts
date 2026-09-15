import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const worker=readFileSync('frontend/public/service-worker.js','utf8');
function runtime(source = worker){
  const handlers=new Map<string,(event:any)=>void>();
  const cacheMaps=new Map<string,Map<string,Response>>();
  const keyOf=(key:any)=>new URL(typeof key==='string'?key:key.url,'https://qa.local').href;
  const fetcher=vi.fn(async (key:any)=>new Response(keyOf(key).endsWith('/')?'<html><script src="/assets/app-123.js"></script></html>':'asset-v1'));
  const caches={
    async open(name:string){
      if(!cacheMaps.has(name))cacheMaps.set(name,new Map());const values=cacheMaps.get(name)!;
      return {async match(key:any){return values.get(keyOf(key))?.clone();},async put(key:any,response:Response){values.set(keyOf(key),response.clone());},async addAll(keys:string[]){await Promise.all(keys.map(async key=>{values.set(keyOf(key),await fetcher(key));}));}};
    },
    async match(key:any){for(const values of cacheMaps.values()){const found=values.get(keyOf(key));if(found)return found.clone();}},
    async keys(){return [...cacheMaps.keys()];},async delete(name:string){return cacheMaps.delete(name);},
  };
  runInNewContext(source,{URL,caches,fetch:fetcher,self:{location:{origin:'https://qa.local'},addEventListener:(name:string,handler:any)=>handlers.set(name,handler),skipWaiting:vi.fn(),clients:{claim:vi.fn()},registration:{showNotification:vi.fn()}}});
  async function event(name:string,request?:any){let promise:Promise<any>|undefined;handlers.get(name)!({request,waitUntil:(p:Promise<any>)=>promise=p,respondWith:(p:Promise<any>)=>promise=p});return promise?await promise:undefined;}
  return {caches,fetcher,event,cacheMaps};
}
it('PWA-013 first installation must cache executable shell for first offline revisit',async()=>{
  const builtWorker = readFileSync('frontend/dist/service-worker.js', 'utf8');
  const r=runtime(builtWorker);await r.event('install');await r.event('activate');
  const urls = [...r.cacheMaps.values()].flatMap(m=>[...m.keys()]);
  console.info('PWA-013 observation',JSON.stringify(urls));
  expect(urls.filter(url => /\/assets\/.*\.js$/.test(url)).length).toBeGreaterThan(6);
  expect(urls.some(url => /\/assets\/.*\.css$/.test(url))).toBe(true);
  r.fetcher.mockRejectedValue(new TypeError('offline'));
  const executable = urls.find(url => /\/assets\/.*\.js$/.test(url))!;
  const response = await r.event('fetch', { url: executable, method: 'GET', mode: 'cors', destination: 'script' });
  expect(response.status).toBe(200);
});
it('PWA-014 failed navigation must not poison last usable offline shell',async()=>{
  const r=runtime();await r.event('install');
  r.fetcher.mockResolvedValueOnce(new Response('upstream failed',{status:502}));
  const request={url:'https://qa.local/metrics',method:'GET',mode:'navigate'};
  await r.event('fetch',request);await Promise.resolve();
  r.fetcher.mockRejectedValueOnce(new TypeError('offline'));
  const offline=await r.event('fetch',request);
  console.info('PWA-014 observation',JSON.stringify({status:offline.status,body:await offline.clone().text()}));
  expect(offline.status).toBe(200);
  expect(await offline.text()).toContain('script');
});
it('PWA-015 cached media must eventually receive corrected source content online',async()=>{
  const r=runtime();const request={url:'https://qa.local/exercise-media/forja/chest-dip.jpg',method:'GET',mode:'cors',destination:'image'};
  await r.event('fetch',request);
  r.fetcher.mockResolvedValue(new Response('asset-v2-corrected'));
  // Same cache version and stable URL are shipped on subsequent deployment.
  await r.event('activate');
  const response=await r.event('fetch',request);
  console.info('PWA-015 observation',JSON.stringify({body:await response.clone().text(),fetchCalls:r.fetcher.mock.calls.length}));
  expect(await response.text()).toBe('asset-v2-corrected');
});
it('PWA-016 API traffic bypasses worker caches',async()=>{
  const r=runtime();const response=await r.event('fetch',{url:'https://qa.local/api/state',method:'GET',mode:'cors'});
  expect(response).toBeUndefined();expect(r.fetcher).not.toHaveBeenCalled();expect(r.cacheMaps.size).toBe(0);
});
it('PWA-017 requested media works offline after successful caching',async()=>{
  const r=runtime();const request={url:'https://qa.local/exercise-media/test.webp',method:'GET',mode:'cors',destination:'image'};
  await r.event('fetch',request);r.fetcher.mockRejectedValue(new TypeError('offline'));
  expect(await (await r.event('fetch',request)).text()).toBe('asset-v1');expect(r.fetcher).toHaveBeenCalledTimes(2);
});
