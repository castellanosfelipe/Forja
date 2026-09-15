import { createServer, type Server } from 'node:http';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { createApplication, type Application } from '../../backend/src/app.ts';
import { SignedTokenService } from '../../backend/src/services/signed-token.service.ts';
import type { AppConfig } from '../../backend/src/config/env.ts';
import { redactBackendEvidence } from './redact-backend-evidence.mjs';

// An isolated audit harness. It generates evidence only, never edits production code/data.
const root = resolve(import.meta.dirname, '../..');
const reportDir = resolve(root, process.env.QA_OUTPUT_DIR ?? 'work/remediation/backend');
const dataDir = join(root, 'work/remediation/backend', `run-${Date.now()}`);
await mkdir(reportDir, { recursive: true });
await mkdir(dataDir, { recursive: true });
const origin = 'http://localhost:3101';
const secret = 'isolated-qa-test-secret-not-used-by-forja-production';
const config: AppConfig = { nodeEnv: 'production', port: 0, dataDir, rpId: 'localhost', rpName: 'FORJA QA', expectedOrigins: [origin], sessionSecret: secret, sessionTtlSeconds: 3600, authFlowTtlSeconds: 300, secureCookies: false, vapid: {subject:null,publicKey:null,privateKey:null} };
const logs: string[] = [];
const originalInfo = console.info;
const originalError = console.error;
console.info = (...args) => logs.push(args.map(String).join(' '));
console.error = (...args) => logs.push(args.map(String).join(' '));
const cases: any[] = [];
let seq = 0;
let application: Application;
let server: Server;
let base: string;
async function start() {
  application = createApplication(config);
  await application.initialize();
  server = createServer(application.handler);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
}
async function stop() {
  await application.close();
  await new Promise<void>((r, reject) => server.close(e => e ? reject(e) : r()));
}
type Result = { status:number; body:any; headers:Record<string,string>; cookies:string[]; elapsedMs:number };
async function request(method:string, path:string, body?:unknown, cookie?:string, extra:Record<string,string> = {}, raw=false):Promise<Result> {
  const headers:Record<string,string> = {origin, ...extra};
  if (body !== undefined && !headers['content-type']) headers['content-type']='application/json';
  if (cookie) headers.cookie=cookie;
  if (headers.origin === '__omit__') delete headers.origin;
  const started = performance.now();
  const response = await fetch(base+path, {method, headers, ...(body===undefined?{}:{body:raw ? String(body) : JSON.stringify(body)})});
  const text = await response.text();
  let parsed:any; try {parsed=JSON.parse(text)} catch {parsed=text}
  return {status:response.status,body:parsed,headers:Object.fromEntries(response.headers),cookies:response.headers.getSetCookie(),elapsedMs:+(performance.now()-started).toFixed(2)};
}
function concise(r:Result) {
  return { status:r.status, body: r.body?.exerciseLibrary ? {revision:r.body.revision,owner:r.body.owner,bodyWeight:r.body.bodyWeight,workoutSessions:r.body.workoutSessions,exerciseLibraryCount:r.body.exerciseLibrary.length} : r.body, headers:Object.fromEntries(Object.entries(r.headers).filter(([k])=>['cache-control','etag','content-type','x-content-type-options','x-frame-options','referrer-policy'].includes(k))), cookieAttributes:r.cookies.map(c=>c.replace(/=[^;]*/, '=<redacted>')), elapsedMs:r.elapsedMs };
}
function record(module:string, scenario:string, expected:string, observed:unknown, pass:boolean, evidence:unknown, defect?:string) {
  const id=`API-${String(++seq).padStart(3,'0')}`;
  cases.push({id,module,scenario,status:pass?'PASS':'FAIL',expected,observed,evidence,...(defect?{defect}:{})});
  originalInfo(`${id} ${pass?'PASS':'FAIL'} ${scenario}`);
}
function check(module:string,scenario:string,r:Result,status:number,extra?:boolean,defect?:string) {
  record(module,scenario,`HTTP ${status}${extra===undefined?'':' y contrato esperado'}`,concise(r),r.status===status&&(extra??true),{request:scenario,response:concise(r)},defect);
}
const sessionCookie = (r:Result)=>r.cookies.find(c=>c.startsWith('og_session='))!.split(';')[0]!;
const flowCookie = (r:Result)=>r.cookies.find(c=>c.startsWith('og_auth_flow='))!.split(';')[0]!;
const clone = <T>(x:T):T=>structuredClone(x);
const completeSet = {setNumber:1,loadKg:60,repetitions:8,durationSeconds:null,side:null,rpe:8,rir:2,completedAt:new Date().toISOString()};
function cbor(value:any):Buffer {
  function head(major:number,n:number) { if(n<24)return Buffer.from([(major<<5)|n]); if(n<256)return Buffer.from([(major<<5)|24,n]); const b=Buffer.alloc(3);b[0]=(major<<5)|25;b.writeUInt16BE(n,1);return b; }
  if(Buffer.isBuffer(value)) return Buffer.concat([head(2,value.length),value]);
  if(typeof value==='number')return value<0?head(1,-1-value):head(0,value);
  if(typeof value==='string'){const b=Buffer.from(value);return Buffer.concat([head(3,b.length),b]);}
  const entries=value instanceof Map?[...value]:Object.entries(value);
  return Buffer.concat([head(5,entries.length),...entries.flatMap(([k,v])=>[cbor(k),cbor(v)])]);
}
const hash=(x:any)=>createHash('sha256').update(x).digest();
const b64=(x:Buffer)=>x.toString('base64url');
function authenticator() {
  const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const jwk=pair.publicKey.export({format:'jwk'});
  const id=randomBytes(24);
  const cose=cbor(new Map<any,any>([[1,2],[3,-7],[-1,1],[-2,Buffer.from(jwk.x!,'base64url')],[-3,Buffer.from(jwk.y!,'base64url')]]));
  return {
    id:b64(id),
    registration(challenge:string, suppliedOrigin=origin) {
      const client=Buffer.from(JSON.stringify({type:'webauthn.create',challenge,origin:suppliedOrigin}));
      const len=Buffer.alloc(2);len.writeUInt16BE(id.length);
      const authData=Buffer.concat([hash('localhost'),Buffer.from([0x45]),Buffer.alloc(4),Buffer.alloc(16),len,id,cose]);
      return {id:b64(id),rawId:b64(id),type:'public-key',response:{clientDataJSON:b64(client),attestationObject:b64(cbor({fmt:'none',authData,attStmt:{}})),transports:['internal']},clientExtensionResults:{}};
    },
    assertion(challenge:string, suppliedOrigin=origin, counter=0) {
      const client=Buffer.from(JSON.stringify({type:'webauthn.get',challenge,origin:suppliedOrigin}));
      const count=Buffer.alloc(4);count.writeUInt32BE(counter);
      const authData=Buffer.concat([hash('localhost'),Buffer.from([0x05]),count]);
      return {id:b64(id),rawId:b64(id),type:'public-key',response:{clientDataJSON:b64(client),authenticatorData:b64(authData),signature:b64(sign('sha256',Buffer.concat([authData,hash(client)]),pair.privateKey)),userHandle:null},clientExtensionResults:{}};
    }
  };
}

await start();
try {
  check('HTTP','GET /api/health público',await request('GET','/api/health'),200);
  check('Auth','GET /api/auth/session anónimo',await request('GET','/api/auth/session'),200);
  for(const [method,path,body] of [['GET','/api/state',undefined],['PUT','/api/state',{}],['POST','/api/body-weight',{weightKg:80}],['DELETE','/api/body-weight/unknown',undefined],['GET','/api/workouts/previous/back-squat',undefined],['POST','/api/workouts',{}],['PATCH','/api/workouts/unknown',{}],['POST','/api/workouts/unknown/complete',{}],['POST','/api/workouts/unknown/cancel',{}],['GET','/api/auth/passkeys',undefined],['DELETE','/api/auth/passkeys/unknown',undefined],['GET','/api/push/vapid-public-key',undefined],['POST','/api/push/subscriptions',{}],['DELETE','/api/push/subscriptions/unknown',undefined],['POST','/api/push/rest-timers',{}],['DELETE','/api/push/rest-timers/unknown',undefined],['POST','/api/push/body-measurement-reminder/sync',{}]] as const) {
    check('Authorization',`${method} ${path} sin sesión`,await request(method,path,body),401);
  }
  check('HTTP','POST login con text/plain',await request('POST','/api/auth/password/login','{}',undefined,{'content-type':'text/plain'},true),415);
  check('HTTP','POST login JSON inválido',await request('POST','/api/auth/password/login','{',undefined,{},true),400);
  for(const input of [null,[],{}, {username:123,password:'valid-password-123'},{username:'qa-user',password:12},{username:'../user',password:'valid-password-123'},{username:'ñandú',password:'valid-password-123'},{username:'qa-user',password:'short'},{username:'a'.repeat(65),password:'valid-password-123'},{username:'qa-user',password:'a'.repeat(129)}]) {
    check('Validation',`Registro inválido ${JSON.stringify(input)}`,await request('POST','/api/auth/password/register',input),400);
  }
  check('CSRF','POST origin ajeno',await request('POST','/api/auth/password/register',{username:'cross-origin',password:'valid-password-123'},undefined,{origin:'https://attacker.invalid'}),403);
  check('CSRF','POST producción sin Origin',await request('POST','/api/auth/password/register',{username:'without-origin',password:'valid-password-123'},undefined,{origin:'__omit__'}),403);
  const password='QA-password-2026-only';
  const a=await request('POST','/api/auth/password/register',{username:'qa-alice',password});
  check('Auth','Registro con usuario y contraseña',a,201,a.body.user.passwordEnabled===true&&a.body.user.passkeys.length===0);
  const ac=sessionCookie(a);
  record('Auth','Cookie de sesión HttpOnly/SameSite/Max-Age','HttpOnly; SameSite=Strict; Max-Age=3600',a.cookies.map(c=>c.replace(/=[^;]*/,'=<redacted>')),a.cookies.some(c=>c.includes('HttpOnly')&&c.includes('SameSite=Strict')&&c.includes('Max-Age=3600')),{});
  const persisted=JSON.parse(await readFile(join(dataDir,'db.json'),'utf8'));
  record('Persistence','Contraseña no persistida en claro','scrypt con sal individual; no password original',persisted.users.map((u:any)=>({username:u.username,algorithm:u.passwordCredential?.algorithm,keyLength:u.passwordCredential?.keyLength})),!JSON.stringify(persisted).includes(password)&&persisted.users[0].passwordCredential.algorithm==='scrypt',{path:'<isolated DATA_DIR>/db.json'});
  check('Auth','Registro duplicado ignorando mayúsculas',await request('POST','/api/auth/password/register',{username:'QA-ALICE',password}),409);
  check('Auth','Registrar otra cuenta con sesión activa',await request('POST','/api/auth/password/register',{username:'qa-other',password},ac),409);
  check('Auth','Login contraseña errónea',await request('POST','/api/auth/password/login',{username:'qa-alice',password:'incorrect-password'}),401);
  check('Auth','Login usuario inexistente',await request('POST','/api/auth/password/login',{username:'qa-unknown',password}),401);
  check('Auth','Login normaliza mayúsculas y espacios de usuario',await request('POST','/api/auth/password/login',{username:'  QA-ALICE  ',password}),200);
  check('Auth','Sesión firmada alterada',await request('GET','/api/state',undefined,ac+'x'),401);
  const tokens=new SignedTokenService(secret);
  check('Auth','Sesión firmada expirada',await request('GET','/api/state',undefined,`og_session=${tokens.issue({kind:'session',sub:a.body.user.id,iat:1,exp:2})}`),401);
  check('Auth','Sesión firmada usuario inexistente',await request('GET','/api/state',undefined,`og_session=${tokens.issue({kind:'session',sub:'not-real',iat:1,exp:Math.floor(Date.now()/1000)+100})}`),401);
  const malformedCookie = await request('GET','/api/auth/session',undefined,'og_session=%ZZ');
  check('HTTP','Cookie mal codificada %ZZ se ignora sin autenticar',malformedCookie,200,malformedCookie.body.authenticated === false,'API-D004');
  check('HTTP','Parámetro URL mal codificado %ZZ',await request('GET','/api/workouts/previous/%ZZ',undefined,ac),400,undefined,'API-D004');
  const b=await request('POST','/api/auth/password/register',{username:'qa-bob',password});
  const bc=sessionCookie(b);
  const sa=await request('GET','/api/state',undefined,ac);
  const sb=await request('GET','/api/state',undefined,bc);
  record('Authorization','Dos usuarios reciben estados independientes','owner y stateFileKey diferentes; 195 ejercicios iniciales',{a:sa.body.owner,b:sb.body.owner,catalog:sa.body.exerciseLibrary.length},sa.status===200&&sb.status===200&&sa.body.owner.userId!==sb.body.owner.userId&&sa.body.owner.stateFileKey!==sb.body.owner.stateFileKey&&sa.body.exerciseLibrary.length===195,{});
  check('Authorization','Alice intenta PUT estado de Bob',await request('PUT','/api/state',sb.body,ac),400);
  check('Authorization','Query userId de Bob no cambia el usuario autenticado',await request('GET',`/api/state?userId=${b.body.user.id}`,undefined,ac),200);
  const weight=await request('POST','/api/body-weight',{weightKg:80.5,measuredAt:'2026-09-09T12:00:00Z',note:'ñ y tildes: sesión'},ac);
  check('BodyWeight','Crear peso decimal con Unicode',weight,201,weight.body.note==='ñ y tildes: sesión');
  check('Authorization','Bob no puede borrar peso de Alice',await request('DELETE',`/api/body-weight/${weight.body.id}`,undefined,bc),404);
  check('BodyWeight','Eliminar peso propio',await request('DELETE',`/api/body-weight/${weight.body.id}`,undefined,ac),204);
  check('BodyWeight','Eliminar peso otra vez',await request('DELETE',`/api/body-weight/${weight.body.id}`,undefined,ac),404);
  for(const input of [{},{weightKg:null},{weightKg:'80'},{weightKg:19.99},{weightKg:500.01},{weightKg:80,measuredAt:'not-date'},{weightKg:80,note:'x'.repeat(501)}]) check('BodyWeight',`Peso inválido ${JSON.stringify(input)}`,await request('POST','/api/body-weight',input,ac),400);
  for(const weightKg of [20,500]) check('BodyWeight',`Peso límite ${weightKg}`,await request('POST','/api/body-weight',{weightKg},ac),201);
  const invalidDate=await request('POST','/api/body-weight',{weightKg:80,measuredAt:'2026-02-30T00:00:00Z'},ac);
  check('Validation','Fecha imposible 2026-02-30T00:00:00Z',invalidDate,400,undefined,'API-D005');
  const snapshot=(await request('GET','/api/state',undefined,ac)).body;
  check('State','PUT estado válido If-Match',await request('PUT','/api/state',snapshot,ac,{'if-match':`"${snapshot.revision}"`}),200);
  check('State','PUT revisión obsoleta',await request('PUT','/api/state',snapshot,ac,{'if-match':`"${snapshot.revision}"`}),409);
  check('State','PUT If-Match inválido',await request('PUT','/api/state',snapshot,ac,{'if-match':'not-number'}),400);
  check('State','PUT documento vacío',await request('PUT','/api/state',{},ac),400);
  const current=(await request('GET','/api/state',undefined,ac)).body;
  const parallel=await Promise.all(Array.from({length:10},()=>request('PUT','/api/state',current,ac,{'if-match':`"${current.revision}"`})));
  record('Concurrency','10 reemplazos con misma revisión','1 éxito y 9 conflictos',parallel.map(r=>r.status),parallel.filter(r=>r.status===200).length===1&&parallel.filter(r=>r.status===409).length===9,{});
  const weightsBefore=(await request('GET','/api/state',undefined,ac)).body.bodyWeight.entries.length;
  const concurrentWeights=await Promise.all(Array.from({length:20},(_,i)=>request('POST','/api/body-weight',{weightKg:70+i/10},ac)));
  const weightsAfter=(await request('GET','/api/state',undefined,ac)).body.bodyWeight.entries;
  record('Concurrency','20 altas de peso concurrentes','20 HTTP201, 20 registros adicionales, IDs únicos',{statuses:concurrentWeights.map(r=>r.status),before:weightsBefore,after:weightsAfter.length},concurrentWeights.every(r=>r.status===201)&&weightsAfter.length===weightsBefore+20&&new Set(weightsAfter.map((x:any)=>x.id)).size===weightsAfter.length,{});
  const registrations=await Promise.all(Array.from({length:8},()=>request('POST','/api/auth/password/register',{username:'qa-race',password})));
  record('Concurrency','8 registros del mismo usuario concurrentes','1 creado y 7 HTTP409',registrations.map(r=>r.status),registrations.filter(r=>r.status===201).length===1&&registrations.filter(r=>r.status===409).length===7,{});
  const bursts=await Promise.all(Array.from({length:12},()=>request('POST','/api/auth/password/login',{username:'qa-race',password:'wrong-password'})));
  record('Security','12 contraseñas erróneas simultáneas con límite de 5','Máximo 5 verificaciones; resto HTTP429',bursts.map(r=>r.status),bursts.filter(r=>r.status===401).length<=5,{subsequent:concise(await request('POST','/api/auth/password/login',{username:'qa-race',password}))},'API-D006');
  check('Security','Bloqueo tras 5 fallos secuenciales',await request('POST','/api/auth/password/login',{username:'qa-race',password}),429);
  for(const [label,mutate] of [
    ['weightKg negativo vía estado',(s:any)=>{s.bodyWeight.entries=[{id:'bad',weightKg:-400,measuredAt:'bad-date',note:null}]}],
    ['perfil con edad negativa y sexo arbitrario',(s:any)=>{s.bodyMetrics.profile={sex:'arbitrary',ageYears:-10,heightCm:0,activityLevel:'unknown',goal:'unknown'}}],
    ['plan, preferencias y recordatorio nulos',(s:any)=>{s.weeklyPlan=null;s.preferences=null;s.bodyMeasurementReminder=null}],
    ['sesión nula en colección',(s:any)=>{s.workoutSessions=[null]}],
    ['IDs duplicados de ejercicios',(s:any)=>{s.exerciseLibrary.push(clone(s.exerciseLibrary[0]))}],
    ['progresión con configuración nula',(s:any)=>{s.progression.exerciseRules=[{exerciseId:'back-squat',strategy:'linear-progression',config:null,state:null}]}],
  ] as const) {
    const baseline=(await request('GET','/api/state',undefined,bc)).body;
    const bad=clone(baseline);mutate(bad);
    const r=await request('PUT','/api/state',bad,bc);
    let secondary:any;
    if(label==='sesión nula en colección')secondary=concise(await request('GET','/api/workouts/previous/back-squat',undefined,bc));
    record('StateValidation',label,'HTTP400, estado previo conservado',{put:concise(r),...(secondary?{followup:secondary}:{})},r.status===400,{mutation:label},'API-D003');
    await request('PUT','/api/state',baseline,bc);
  }
  const nullLib=clone((await request('GET','/api/state',undefined,bc)).body);nullLib.exerciseLibrary=[null];
  check('StateValidation','exerciseLibrary contiene null',await request('PUT','/api/state',nullLib,bc),400,undefined,'API-D003');
  const workout=await request('POST','/api/workouts',{exercises:[{exerciseId:'back-squat',sets:[completeSet]}]},ac);
  check('Workout','Crear sesión con serie válida',workout,201);
  const wid=workout.body.id;
  check('Workout','Segundo entrenamiento activo bloqueado',await request('POST','/api/workouts',{},ac),409);
  check('Authorization','Bob no puede editar sesión de Alice',await request('PATCH',`/api/workouts/${wid}`,{notes:'foreign'},bc),404);
  check('Workout','Editar notas de sesión activa',await request('PATCH',`/api/workouts/${wid}`,{notes:'Ejecución QA ñ'},ac),200);
  check('Workout','RPE fuera de límites',await request('PATCH',`/api/workouts/${wid}`,{exercises:[{exerciseId:'back-squat',sets:[{...completeSet,rpe:11}]}]},ac),400);
  check('Workout','Completar sesión',await request('POST',`/api/workouts/${wid}/complete`,{},ac),200);
  const prev=await request('GET','/api/workouts/previous/back-squat',undefined,ac);
  check('Workout','Recuperar serie previa y 1RM 76kg',prev,200,prev.body.exercise?.estimatedOneRepMaxKg===76);
  check('Workout','Completar dos veces es idempotente',await request('POST',`/api/workouts/${wid}/complete`,{},ac),200);
  check('Workout','Editar completado rechazado',await request('PATCH',`/api/workouts/${wid}`,{notes:'after'},ac),409);
  check('Workout','Cancelar completado rechazado',await request('POST',`/api/workouts/${wid}/cancel`,{},ac),409);
  check('Workout','Completar inexistente',await request('POST','/api/workouts/missing/complete',{},ac),404);
  const empty=await request('POST','/api/workouts',{},ac);
  check('Workout','Completar sin ejercicios rechazado',await request('POST',`/api/workouts/${empty.body.id}/complete`,{},ac),409);
  check('Workout','Cancelar activo',await request('POST',`/api/workouts/${empty.body.id}/cancel`,{},ac),200);
  check('Workout','Completar cancelado rechazado',await request('POST',`/api/workouts/${empty.body.id}/complete`,{},ac),409);
  const orphan=await request('POST','/api/workouts',{scheduledDate:'2026-02-30',exercises:[{exerciseId:'does-not-exist',sets:[completeSet,{...completeSet}]}]},ac);
  record('Workout','Ejercicio inexistente, setNumber repetido y fecha imposible','HTTP400; referencias y fecha válidas',concise(orphan),orphan.status===400,{payload:{scheduledDate:'2026-02-30',exerciseId:'does-not-exist',setNumbers:[1,1]}},'API-D007');
  if(orphan.status===201) {
    const done=await request('POST',`/api/workouts/${orphan.body.id}/complete`,{},ac);
    record('Workout','No completar sesión con ejercicio ajeno al catálogo','Rechazo por integridad referencial',concise(done),done.status===400||done.status===409,{},'API-D007');
  }
  check('Push','VAPID sin configurar informa 503',await request('GET','/api/push/vapid-public-key',undefined,ac),503);
  check('Push','Suscripción sin VAPID informa 503',await request('POST','/api/push/subscriptions',{},ac),503);
  check('Push','Temporizador sin VAPID informa 503',await request('POST','/api/push/rest-timers',{durationSeconds:10},ac),503);
  check('Push','Temporizador inválido informa 400',await request('POST','/api/push/rest-timers',{durationSeconds:-1},ac),400);
  check('Push','Eliminar suscripción inexistente',await request('DELETE','/api/push/subscriptions/missing',undefined,ac),404);
  check('Push','Eliminar temporizador inexistente',await request('DELETE','/api/push/rest-timers/missing',undefined,ac),404);
  check('Push','Sincronizar recordatorio mensual',await request('POST','/api/push/body-measurement-reminder/sync',{},ac),200);
  const auth=authenticator();
  const opts=await request('POST','/api/auth/register/options',{username:'qa-passkey',displayName:'QA Passkey'});
  check('WebAuthn','Opciones RP localhost y UV/residentKey requeridos',opts,200,opts.body.rp.id==='localhost'&&opts.body.authenticatorSelection.userVerification==='required'&&opts.body.authenticatorSelection.residentKey==='required');
  const reg=await request('POST','/api/auth/register/verify',auth.registration(opts.body.challenge),flowCookie(opts));
  check('WebAuthn','Registro real con clave ECDSA y attestation none local',reg,201);
  if(reg.status===201) {
    const pc=sessionCookie(reg);
    const listed=await request('GET','/api/auth/passkeys',undefined,pc);
    check('WebAuthn','Listar passkey sin exponer clave privada ni pública',listed,200,listed.body.passkeys[0].id===auth.id&&!JSON.stringify(listed.body).includes('publicKey'));
    check('Authorization','Alice no elimina passkey de otro usuario',await request('DELETE',`/api/auth/passkeys/${auth.id}`,undefined,ac),404);
    check('WebAuthn','No eliminar único método de acceso',await request('DELETE',`/api/auth/passkeys/${auth.id}`,undefined,pc),409);
    const loginOpts=await request('POST','/api/auth/login/options',{username:'qa-passkey'});
    check('WebAuthn','Opciones de login restringidas a usuario',loginOpts,200,loginOpts.body.allowCredentials[0].id===auth.id);
    const assertion=auth.assertion(loginOpts.body.challenge);
    const flow=flowCookie(loginOpts);
    check('WebAuthn','Verificación ECDSA válida contador cero',await request('POST','/api/auth/login/verify',assertion,flow),200);
    check('WebAuthn','Replay idéntico de assertion y cookie de ceremonia',await request('POST','/api/auth/login/verify',assertion,flow),401,undefined,'API-D002');
    const wrongOpts=await request('POST','/api/auth/login/options',{username:'qa-passkey'});
    check('WebAuthn','Challenge incorrecto rechazado',await request('POST','/api/auth/login/verify',auth.assertion('wrong-challenge'),flowCookie(wrongOpts)),401);
    const wrongOriginOpts=await request('POST','/api/auth/login/options',{username:'qa-passkey'});
    check('WebAuthn','Origen incorrecto criptográficamente firmado rechazado',await request('POST','/api/auth/login/verify',auth.assertion(wrongOriginOpts.body.challenge,'https://attacker.invalid'),flowCookie(wrongOriginOpts)),401);
    const foreign=await request('POST','/api/auth/login/options',{username:'qa-alice'});
    check('WebAuthn','Assertion válida de otra cuenta rechazada',await request('POST','/api/auth/login/verify',auth.assertion(foreign.body.challenge),flowCookie(foreign)),401);
    const addOpts=await request('POST','/api/auth/register/options',{},ac);
    const second=authenticator();
    const added=await request('POST','/api/auth/register/verify',second.registration(addOpts.body.challenge),`${ac}; ${flowCookie(addOpts)}`);
    check('WebAuthn','Añadir passkey a cuenta con contraseña',added,201);
    check('WebAuthn','Eliminar passkey conservando contraseña',await request('DELETE',`/api/auth/passkeys/${second.id}`,undefined,ac),204);
  }
  check('WebAuthn','Verificación sin ceremonia',await request('POST','/api/auth/login/verify',{}),401);
  check('WebAuthn','Opciones cuenta inexistente',await request('POST','/api/auth/login/options',{username:'qa-not-registered'}),401);
  check('WebAuthn','Opciones login descubrible sin usuario',await request('POST','/api/auth/login/options',{}),200);
  const beforeRestart=(await request('GET','/api/state',undefined,ac)).body;
  await stop();await start();
  const afterRestart=(await request('GET','/api/state',undefined,ac)).body;
  record('Persistence','Datos sobreviven reinicio del servidor','Estado idéntico después del reinicio',{revisionBefore:beforeRestart.revision,revisionAfter:afterRestart.revision,weightCount:afterRestart.bodyWeight.entries.length},JSON.stringify(beforeRestart)===JSON.stringify(afterRestart),{path:'<isolated DATA_DIR>/state-<id>.json'});
  const webPush=createRequire(join(root,'backend/package.json'))('web-push');
  const originalSend=webPush.sendNotification;
  const calls:any[]=[];
  webPush.sendNotification=async (subscription:any,payload:string)=>{calls.push({endpoint:subscription.endpoint,payload:JSON.parse(payload)});return {statusCode:201,headers:{},body:''};};
  try {
    await stop();
    const vapid=webPush.generateVAPIDKeys();
    config.vapid={subject:'mailto:qa@example.invalid',publicKey:vapid.publicKey,privateKey:vapid.privateKey};
    await start();
    const endpoints=['https://127.0.0.1:9443/internal','https://169.254.169.254/metadata','https://10.0.0.1/admin'];
    const subscriptions=[];
    for(const endpoint of endpoints)subscriptions.push(await request('POST','/api/push/subscriptions',{endpoint,keys:{p256dh:'controlled-fake-key',auth:'controlled-fake-auth'}},ac));
    const timer=await request('POST','/api/push/rest-timers',{durationSeconds:1},ac);
    await new Promise(r=>setTimeout(r,1400));
    record('PushSecurity','Destinos Push loopback, link-local y privado llegan a transporte','Rechazo antes de persistir/enviar destinos internos',{subscriptions:subscriptions.map(r=>({status:r.status,endpoint:r.body.endpoint})),timerStatus:timer.status,stubCalls:calls},subscriptions.every(r=>r.status===400)&&calls.length===0,{transport:'web-push.sendNotification sustituido temporalmente por stub en memoria; cero conexiones de red',endpoints},'API-D008');
    const invalidSub=await request('POST','/api/push/subscriptions',{endpoint:'http://localhost',keys:{p256dh:'x',auth:'x'}},ac);
    check('Push','Suscripción sin HTTPS rechazada con VAPID activo',invalidSub,400);
    for(const subscription of subscriptions)if(subscription.status===201)await request('DELETE',`/api/push/subscriptions/${subscription.body.id}`,undefined,ac);
  } finally {
    await stop();webPush.sendNotification=originalSend;config.vapid={subject:null,publicKey:null,privateKey:null};await start();
  }
  check('Auth','Logout borra cookie del navegador',await request('POST','/api/auth/logout',{},ac),204);
  check('Auth','Acceso sin cookie después de logout',await request('GET','/api/state'),401);
  check('Auth','Reutilizar cookie capturada antes de logout',await request('GET','/api/state',undefined,ac),401,undefined,'API-D001');
  const perf=await Promise.all(Array.from({length:25},()=>request('GET','/api/state',undefined,bc)));
  const times=perf.map(r=>r.elapsedMs).sort((a,b)=>a-b);
  record('Performance','25 lecturas concurrentes de estado pequeño','Todos HTTP200, p95 < 500ms',{p50:times[12],p95:times[23],max:times[24],statuses:[...new Set(perf.map(r=>r.status))]},perf.every(r=>r.status===200)&&times[23]<500,{environment:'Loopback Windows, dataset QA; no extrapolar a carga producción'});
  const disk=await readdir(dataDir);
  record('Persistence','Escrituras atómicas no dejan temporales','db.json y state-*.json; ningún .tmp',disk,disk.every(n=>n.endsWith('.json')),{path:'<isolated DATA_DIR>'});
  for(const [scenario,status,why] of [
    ['Passkey hardware/biometría/navegadores reales','BLOCKED','Esta prueba usa autenticador criptográfico local; no demuestra interacción biométrica real.'],
    ['Entrega Web Push a proveedor externo','BLOCKED','VAPID desactivado deliberadamente; no enviar notificaciones a terceros durante auditoría.'],
    ['HTTPS y cookie Secure extremo a extremo','BLOCKED','Servidor loopback HTTP; requiere despliegue TLS.'],
    ['Recuperar/cambiar contraseña o deshabilitar usuario','NOT APPLICABLE','No hay estos endpoints ni requisito confirmado de recuperación.'],
    ['Múltiples procesos compartiendo DATA_DIR','NOT TESTED','Docker ejecuta una réplica; mutex es por proceso. Riesgo si se escala sin almacenamiento transaccional.'],
    ['Corte de energía/durabilidad completa ante fallo de disco','NOT TESTED','Se añade flush de contenido antes de rename; no se simula corte de energía ni se certifica la durabilidad del directorio o del almacenamiento físico.'],
    ['Conectividad/explotación SSRF vía Push','NOT TESTED','Restricción de destinos validada con transporte stub y pruebas DNS; no se emiten solicitudes reales a destinos internos/externos.'],
  ]) cases.push({id:`API-${String(++seq).padStart(3,'0')}`,module:'Limits',scenario,status,expected:'Verificación específica',observed:why,evidence:{source:'Delimitación de alcance'}});
} catch(error) {
  cases.push({id:`API-${String(++seq).padStart(3,'0')}`,module:'Harness',scenario:'Ejecución completa',status:'BLOCKED',expected:'Finalizar harness',observed:String(error),evidence:{stack:(error as Error).stack}});
  originalError(error);
} finally {
  await stop();
  console.info=originalInfo; console.error=originalError;
  const counts=Object.fromEntries(['PASS','FAIL','BLOCKED','NOT TESTED','NOT APPLICABLE'].map(s=>[s,cases.filter(c=>c.status===s).length]));
  await writeFile(join(reportDir,'backend-cases.json'),JSON.stringify(redactBackendEvidence({executedAt:new Date().toISOString(),baselineCommit:'acda8d39f379a8f1c60956b3be14022eeb692770',environment:{node:process.version,dataDir,transport:'HTTP loopback, production origin enforcement',vapid:false,authenticator:'local ECDSA P-256, attestation none'},counts,cases}),null,2)+'\n');
  await writeFile(join(reportDir,'backend-server.ndjson'),logs.join('\n')+'\n');
  originalInfo(JSON.stringify({counts,evidence:reportDir,dataDir}));
  if (counts.FAIL || cases.some((item) => item.module === 'Harness' && item.status === 'BLOCKED')) process.exitCode = 1;
}
