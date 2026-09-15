import { lookup } from 'node:dns/promises';
import { Agent } from 'node:https';
import { isIP } from 'node:net';
import { ECDH } from 'node:crypto';
import type { PushSubscription } from 'web-push';
import { badRequest } from '../http/errors.js';

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a,b,c] = address.split('.').map(Number) as [number,number,number,number];
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a===100 && b>=64 && b<=127) || (a===169 && b===254) || (a===172 && b>=16 && b<=31) ||
      (a===192 && (b===168 || b===0 || (b===88 && c===99))) || (a===198 && (b===18 || b===19 || (b===51 && c===100))) ||
      (a===203 && b===0 && c===113));
  }
  if (family === 6) {
    const normalized=address.toLowerCase();
    // Restrict to global unicast; mapped, loopback, ULA, multicast, link-local and
    // translation prefixes cannot reach the transport via an IPv6 spelling.
    const first=parseInt(normalized.split(':')[0]!,16);
    if(!Number.isInteger(first)||first<0x2000||first>0x3fff||normalized.startsWith('2002:'))return false;
    if(normalized.startsWith('2001:')) {
      const second=parseInt(normalized.split(':')[1]||'0',16);
      if(second<0x200||second===0xdb8)return false;
    }
    return true;
  }
  return false;
}

export function validatePushEndpoint(endpoint: unknown): URL {
  if(typeof endpoint!=='string'||endpoint.length>2048)throw badRequest('Invalid Push endpoint');
  let url: URL;try{url=new URL(endpoint);}catch{throw badRequest('Invalid Push endpoint');}
  const host=url.hostname.replace(/^\[|\]$/g,'');
  if(url.protocol!=='https:'||url.username||url.password||url.hash||(url.port&&url.port!=='443')||
    !host||host.endsWith('.')||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||
    (isIP(host)?!isPublicAddress(host):!host.includes('.')))throw badRequest('Push endpoint must use a public HTTPS destination');
  return url;
}

function decodeKey(value: unknown, bytes: number, name: string): Buffer {
  if(typeof value!=='string'||!/^[A-Za-z0-9_-]+={0,2}$/.test(value))throw badRequest(`Invalid Push ${name}`);
  const key=Buffer.from(value,'base64url');
  if(key.length!==bytes||key.toString('base64url')!==value.replace(/=+$/,''))throw badRequest(`Invalid Push ${name}`);
  return key;
}

export function validatePushSubscription(value: unknown): asserts value is PushSubscription {
  if(!value||typeof value!=='object'||Array.isArray(value))throw badRequest('Invalid PushSubscription');
  const input=value as Partial<PushSubscription>;
  validatePushEndpoint(input.endpoint);
  if(!input.keys||typeof input.keys!=='object')throw badRequest('Invalid PushSubscription keys');
  const publicKey=decodeKey(input.keys.p256dh,65,'p256dh');
  decodeKey(input.keys.auth,16,'auth');
  try {ECDH.convertKey(publicKey,'prime256v1');} catch {throw badRequest('Invalid Push p256dh point');}
  if(input.expirationTime!==undefined&&input.expirationTime!==null&&(!Number.isFinite(input.expirationTime)||input.expirationTime<0))throw badRequest('Invalid Push expirationTime');
}

export async function assertPublicPushDestination(endpoint: string): Promise<void> {
  const url=validatePushEndpoint(endpoint);
  const host=url.hostname.replace(/^\[|\]$/g,'');
  if(isIP(host))return;
  let addresses;try{addresses=await lookup(host,{all:true,verbatim:true});}catch{throw badRequest('Push destination could not be resolved');}
  if(!addresses.length||addresses.some(({address})=>!isPublicAddress(address)))throw badRequest('Push destination resolves to a restricted network');
}

// The connection uses the very addresses that were checked, closing the gap
// between subscription-time DNS validation and actual network connection.
export const publicPushAgent=new Agent({
  keepAlive:false,
  lookup(hostname,options,callback) {
    void lookup(hostname,{all:true,verbatim:true}).then(addresses=>{
      if(!addresses.length||addresses.some(({address})=>!isPublicAddress(address)))throw new Error('Blocked restricted Push destination');
      if(options.all)callback(null,addresses);
      else callback(null,addresses[0]!.address,addresses[0]!.family);
    }).catch((error:Error)=>callback(error,'',4));
  },
});
