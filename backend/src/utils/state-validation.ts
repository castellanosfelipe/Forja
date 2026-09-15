import type { UserState } from '../domain/models.js';
import { GYM_EXERCISE_CATALOG } from '../domain/exercise-catalog.js';
import { HttpError, badRequest } from '../http/errors.js';
import { isoDate, isoDateTime } from './validation.js';
import { validatePushSubscription } from './push-validation.js';

type Obj = Record<string, unknown>;
function fail(path: string, reason: string): never { throw badRequest(`${path}: ${reason}`); }
export function record(value: unknown, path: string): Obj {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
  return value as Obj;
}
function list(value: unknown, path: string, max = 20_000): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(path, `must be an array of at most ${max} items`);
  return value;
}
function text(value: unknown, path: string, max = 128, min = 1): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) fail(path, 'invalid text');
  return value;
}
function num(value: unknown, path: string, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(path, `must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}`);
  return value;
}
function bool(value: unknown, path: string): void { if (typeof value !== 'boolean') fail(path, 'must be a boolean'); }
function oneOf(value: unknown, values: readonly unknown[], path: string): void { if (!values.includes(value)) fail(path, 'unsupported value'); }
function date(value: unknown, path: string): void { isoDate(text(value, path, 10), path); }
function instant(value: unknown, path: string): void { isoDateTime(text(value, path, 40), path); }
function nullable(value: unknown, path: string, validate: (value: unknown, path: string) => unknown): void { if (value !== null) validate(value, path); }
function optional(value: unknown, path: string, validate: (value: unknown, path: string) => unknown): void { if (value !== undefined) validate(value, path); }
function strings(value: unknown, path: string, max = 32): void { unique(list(value, path, max).map((item, i) => text(item, `${path}[${i}]`)), path); }
function unique(values: unknown[], path: string): void { if (new Set(values).size !== values.length) fail(path, 'duplicate identifiers'); }
function objects(value: unknown, path: string, validate: (item: Obj, path: string) => void, max = 20_000): Obj[] {
  const values = list(value, path, max).map((item, i) => record(item, `${path}[${i}]`));
  values.forEach((item, i) => validate(item, `${path}[${i}]`));
  return values;
}
function identified(value: unknown, path: string, validate: (item: Obj, path: string) => void, max = 20_000): Obj[] {
  const values = objects(value, path, (item, p) => { text(item.id, `${p}.id`); validate(item, p); }, max);
  unique(values.map((item) => item.id), path);
  return values;
}
function range(value: unknown, path: string): void {
  const item = record(value, path);
  const min = num(item.min, `${path}.min`, 1, 1000, true);
  num(item.max, `${path}.max`, min, 1000, true);
}
export function validatePrescription(value: unknown, path: string): void {
  const item = record(value, path);
  num(item.sets, `${path}.sets`, 1, 100, true);
  optional(item.repetitions, `${path}.repetitions`, range);
  optional(item.durationSeconds, `${path}.durationSeconds`, (v,p) => num(v,p,1,86_400,true));
  if (item.repetitions === undefined && item.durationSeconds === undefined) fail(path, 'repetitions or durationSeconds is required');
  num(item.restSeconds, `${path}.restSeconds`, 0, 86_400, true);
  optional(item.targetRpe, `${path}.targetRpe`, (v,p) => num(v,p,1,10));
  optional(item.coachingNote, `${path}.coachingNote`, (v,p) => text(v,p,1000,0));
  if (item.tempo !== undefined) {
    const tempo = record(item.tempo, `${path}.tempo`);
    for (const key of ['eccentricSeconds','pauseSeconds','concentricSeconds']) num(tempo[key],`${path}.tempo.${key}`,0,120);
  }
}
export function validateBlockMetadata(value: unknown, path: string): void {
  const item = record(value, path);
  text(item.id, `${path}.id`);
  oneOf(item.type, ['standard','superset'], `${path}.type`);
  optional(item.rounds, `${path}.rounds`, (v,p) => num(v,p,1,100,true));
  optional(item.restAfterRoundSeconds, `${path}.restAfterRoundSeconds`, (v,p) => num(v,p,0,86_400,true));
}

export function validateWorkoutExercises(value: unknown, path: string, exerciseIds?: Set<string>): void {
  const exercises = objects(value, path, (item,p) => {
    const id = text(item.exerciseId, `${p}.exerciseId`);
    if (exerciseIds && !exerciseIds.has(id)) fail(`${p}.exerciseId`, 'exercise does not exist in your library');
    const sets = objects(item.sets, `${p}.sets`, (set,s) => {
      num(set.setNumber, `${s}.setNumber`,1,100,true);
      nullable(set.loadKg,`${s}.loadKg`,(v,p)=>num(v,p,0,2000));
      nullable(set.repetitions,`${s}.repetitions`,(v,p)=>num(v,p,0,1000,true));
      nullable(set.durationSeconds,`${s}.durationSeconds`,(v,p)=>num(v,p,0,86_400,true));
      oneOf(set.side,[null,'left','right'],`${s}.side`);
      nullable(set.rpe,`${s}.rpe`,(v,p)=>num(v,p,1,10));
      nullable(set.rir,`${s}.rir`,(v,p)=>num(v,p,0,10));
      nullable(set.completedAt,`${s}.completedAt`,instant);
      if (set.completedAt !== null && !(Number(set.repetitions) > 0 || Number(set.durationSeconds) > 0)) fail(s,'completed set requires positive repetitions or duration');
    },100);
    unique(sets.map((set)=>`${set.setNumber}:${set.side ?? 'both'}`),`${p}.sets`);
    nullable(item.estimatedOneRepMaxKg,`${p}.estimatedOneRepMaxKg`,(v,p)=>num(v,p,0,100_000));
    nullable(item.notes,`${p}.notes`,(v,p)=>text(v,p,1000,0));
    optional(item.prescription,`${p}.prescription`,validatePrescription);
    optional(item.block,`${p}.block`,validateBlockMetadata);
  },100);
  unique(exercises.map((item)=>item.exerciseId),path);
}

function guideSize(value: unknown, path: string): number {
  const item = record(value,path);
  oneOf(item.kind,['image'],`${path}.kind`);
  text(item.alt,`${path}.alt`,180);
  const data = text(item.dataUrl,`${path}.dataUrl`,360_000);
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) fail(path,'only PNG, JPEG and WebP data images are allowed');
  const bytes = Buffer.from(match[2]!, 'base64');
  if (bytes.length < 24 || bytes.length > 256 * 1024 || bytes.toString('base64') !== match[2]) fail(path,'invalid image encoding or image exceeds 256 KiB');
  const kind = match[1];
  const valid = kind === 'png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.subarray(12,16).toString() === 'IHDR'
    : kind === 'jpeg' ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255 && bytes.at(-2)===255 && bytes.at(-1)===217
    : bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WEBP' && bytes.readUInt32LE(4)===bytes.length-8;
  if (!valid) fail(path,'image contents do not match its format');
  return bytes.length;
}

export function validateStateDocument(candidate: unknown): asserts candidate is UserState {
  if (Buffer.byteLength(JSON.stringify(candidate)) > 4_000_000) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'State exceeds the 4 MB account limit');
  }
  const s = record(candidate,'state');
  oneOf(s.schemaVersion,[1],'schemaVersion');
  num(s.revision,'revision',1,Number.MAX_SAFE_INTEGER,true);
  const owner=record(s.owner,'owner');text(owner.userId,'owner.userId');text(owner.stateFileKey,'owner.stateFileKey');instant(owner.createdAt,'owner.createdAt');instant(owner.updatedAt,'owner.updatedAt');
  const prefs=record(s.preferences,'preferences');
  optional(prefs.locale,'preferences.locale',(v,p)=>text(v,p,40));
  optional(prefs.timeZone,'preferences.timeZone',(v,p)=>{const zone=text(v,p,80);try {new Intl.DateTimeFormat('en',{timeZone:zone});}catch {fail(p,'invalid time zone');}});
  optional(prefs.units,'preferences.units',(v,p)=>oneOf(v,['metric','imperial'],p));
  optional(prefs.weekStartsOn,'preferences.weekStartsOn',(v,p)=>num(v,p,0,6,true));
  for (const key of ['restTimer','guidedWorkout']) if(prefs[key]!==undefined){const x=record(prefs[key],`preferences.${key}`);for(const [k,v]of Object.entries(x)){if(k==='defaultSeconds')num(v,`preferences.${key}.${k}`,0,86_400,true);else bool(v,`preferences.${key}.${k}`);}}
  let imageBytes=0;
  const library=identified(s.exerciseLibrary,'exerciseLibrary',(ex,p)=>{
    text(ex.name,`${p}.name`,160);text(ex.category,`${p}.category`,80);strings(ex.equipment,`${p}.equipment`);
    oneOf(ex.measurement,['repetitions','duration'],`${p}.measurement`);bool(ex.isBodyweight,`${p}.isBodyweight`);bool(ex.isPerSide,`${p}.isPerSide`);
    const muscles=record(ex.muscles,`${p}.muscles`);strings(muscles.primary,`${p}.muscles.primary`);strings(muscles.secondary,`${p}.muscles.secondary`);
    if(ex.guideMedia!==undefined)imageBytes+=guideSize(ex.guideMedia,`${p}.guideMedia`);
  },2000);
  if(imageBytes>2*1024*1024)fail('exerciseLibrary','custom images exceed 2 MiB in total');
  const exerciseIds=new Set([...GYM_EXERCISE_CATALOG.map(ex=>ex.id),...library.map(ex=>String(ex.id))]);
  const weight=record(s.bodyWeight,'bodyWeight');
  nullable(weight.goal,'bodyWeight.goal',(v,p)=>{const goal=record(v,p);num(goal.targetKg,`${p}.targetKg`,20,500);nullable(goal.targetDate,`${p}.targetDate`,date);});
  identified(weight.entries,'bodyWeight.entries',(e,p)=>{instant(e.measuredAt,`${p}.measuredAt`);num(e.weightKg,`${p}.weightKg`,20,500);nullable(e.note,`${p}.note`,(v,p)=>text(v,p,500,0));});
  const metrics=record(s.bodyMetrics,'bodyMetrics');const profile=record(metrics.profile,'bodyMetrics.profile');
  oneOf(profile.sex,[null,'male','female'],'bodyMetrics.profile.sex');nullable(profile.ageYears,'bodyMetrics.profile.ageYears',(v,p)=>num(v,p,18,100,true));nullable(profile.heightCm,'bodyMetrics.profile.heightCm',(v,p)=>num(v,p,100,250));
  oneOf(profile.activityLevel,['sedentary','light','moderate','active','very-active'],'bodyMetrics.profile.activityLevel');oneOf(profile.goal,['lose','maintain','gain'],'bodyMetrics.profile.goal');
  identified(metrics.entries,'bodyMetrics.entries',(e,p)=>{
    instant(e.measuredAt,`${p}.measuredAt`);num(e.weightKg,`${p}.weightKg`,20,500);nullable(e.neckCm,`${p}.neckCm`,(v,p)=>num(v,p,20,80));
    for(const k of ['waistCm','hipCm'])nullable(e[k],`${p}.${k}`,(v,p)=>num(v,p,40,250));
    num(e.bmi,`${p}.bmi`,0,500);nullable(e.bodyFatPercent,`${p}.bodyFatPercent`,(v,p)=>num(v,p,0,100));nullable(e.leanMassKg,`${p}.leanMassKg`,(v,p)=>num(v,p,0,500));nullable(e.ffmi,`${p}.ffmi`,(v,p)=>num(v,p,0,500));
    for(const k of ['basalMetabolicRateKcal','totalDailyEnergyExpenditureKcal','targetCaloriesKcal'])num(e[k],`${p}.${k}`,0,30_000);
    const macros=record(e.macros,`${p}.macros`);for(const k of ['proteinGrams','fatGrams','carbohydrateGrams'])num(macros[k],`${p}.macros.${k}`,0,10_000);for(const k of ['proteinPercent','fatPercent','carbohydratePercent'])num(macros[k],`${p}.macros.${k}`,0,100);
    nullable(e.note,`${p}.note`,(v,p)=>text(v,p,500,0));
  });
  const reminder=record(s.bodyMeasurementReminder,'bodyMeasurementReminder');bool(reminder.enabled,'bodyMeasurementReminder.enabled');oneOf(reminder.intervalMonths,[1],'bodyMeasurementReminder.intervalMonths');instant(reminder.nextDueAt,'bodyMeasurementReminder.nextDueAt');nullable(reminder.lastNotifiedAt,'bodyMeasurementReminder.lastNotifiedAt',instant);
  const on=record(s.onboarding,'onboarding');nullable(on.completedAt,'onboarding.completedAt',instant);nullable(on.generatedAt,'onboarding.generatedAt',instant);
  oneOf(on.trainingGoal,['hypertrophy','strength','recomposition','general-fitness'],'onboarding.trainingGoal');oneOf(on.experience,['beginner','intermediate','advanced'],'onboarding.experience');oneOf(on.trainingDaysPerWeek,[2,3,4,5,6],'onboarding.trainingDaysPerWeek');oneOf(on.sessionMinutes,[30,45,60,75,90],'onboarding.sessionMinutes');oneOf(on.equipment,['full-gym','free-weights','bodyweight'],'onboarding.equipment');
  strings(on.priorityMuscles,'onboarding.priorityMuscles');list(on.priorityMuscles,'onboarding.priorityMuscles').forEach(v=>oneOf(v,['chest','back','shoulders','arms','quadriceps','hamstrings-glutes','core'],'onboarding.priorityMuscles'));
  strings(on.limitations,'onboarding.limitations');list(on.limitations,'onboarding.limitations').forEach(v=>oneOf(v,['shoulder','lower-back','knee','elbow-wrist'],'onboarding.limitations'));oneOf(on.methodologyVersion,['forja-safe-v1'],'onboarding.methodologyVersion');
  const plan=record(s.weeklyPlan,'weeklyPlan');text(plan.id,'weeklyPlan.id');text(plan.name,'weeklyPlan.name',160);date(plan.effectiveFrom,'weeklyPlan.effectiveFrom');
  const days=identified(plan.days,'weeklyPlan.days',(day,p)=>{
    num(day.weekday,`${p}.weekday`,0,6,true);text(day.name,`${p}.name`,160);
    const blocks=identified(day.blocks,`${p}.blocks`,(block,b)=>{validateBlockMetadata(block,b);objects(block.exercises,`${b}.exercises`,(prescription,q)=>{validatePrescription(prescription,q);if(!exerciseIds.has(text(prescription.exerciseId,`${q}.exerciseId`)))fail(q,'unknown exercise');},100);},100);
    unique(blocks.flatMap(b=>(b.exercises as Obj[]).map(e=>e.exerciseId)),`${p}.exercises`);
  },7);unique(days.map(d=>d.weekday),'weeklyPlan.days.weekday');
  const dayIds=new Set(days.map(d=>d.id));
  const overrides=identified(s.scheduleOverrides,'scheduleOverrides',(e,p)=>{text(e.baseDayId,`${p}.baseDayId`);date(e.originalDate,`${p}.originalDate`);date(e.scheduledDate,`${p}.scheduledDate`);text(e.reason,`${p}.reason`,500,0);instant(e.createdAt,`${p}.createdAt`);});
  unique(overrides.map(e=>`${e.baseDayId}:${e.originalDate}`),'scheduleOverrides');
  // Historical overrides/session plan IDs remain valid when a later plan is generated.
  void dayIds;
  const sessions=identified(s.workoutSessions,'workoutSessions',(session,p)=>{
    nullable(session.planDayId,`${p}.planDayId`,text);date(session.scheduledDate,`${p}.scheduledDate`);instant(session.startedAt,`${p}.startedAt`);nullable(session.completedAt,`${p}.completedAt`,instant);oneOf(session.status,['active','completed','cancelled'],`${p}.status`);nullable(session.notes,`${p}.notes`,(v,p)=>text(v,p,2000,0));
    validateWorkoutExercises(session.exercises,`${p}.exercises`,exerciseIds);
    if(session.status==='active'&&session.completedAt!==null)fail(p,'active session cannot have completedAt');
    if(session.status!=='active'&&session.completedAt===null)fail(p,'finished session requires completedAt');
    if(session.status==='completed'&&(!(session.exercises as Obj[]).length||(session.exercises as Obj[]).some(e=>!(e.sets as Obj[]).length||(e.sets as Obj[]).some(set=>set.completedAt===null))))fail(p,'complete all workout sets first');
  });
  if(sessions.filter(s=>s.status==='active').length>1)fail('workoutSessions','only one active session is allowed');
  const progression=record(s.progression,'progression');
  const rules=objects(progression.exerciseRules,'progression.exerciseRules',(rule,p)=>{
    if(!exerciseIds.has(text(rule.exerciseId,`${p}.exerciseId`)))fail(p,'unknown exercise');oneOf(rule.strategy,['greyskull-lp','linear-progression','double-progression'],`${p}.strategy`);
    const c=record(rule.config,`${p}.config`);num(c.incrementKg,`${p}.config.incrementKg`,0.01,100);num(c.deloadAfterFailures,`${p}.config.deloadAfterFailures`,1,100,true);num(c.deloadPercent,`${p}.config.deloadPercent`,0,100);
    optional(c.sets,`${p}.config.sets`,(v,p)=>num(v,p,1,100,true));optional(c.targetReps,`${p}.config.targetReps`,(v,p)=>num(v,p,1,1000,true));optional(c.amrapSetNumber,`${p}.config.amrapSetNumber`,(v,p)=>num(v,p,1,100,true));optional(c.repRange,`${p}.config.repRange`,range);
    const state=record(rule.state,`${p}.state`);num(state.nextLoadKg,`${p}.state.nextLoadKg`,0,2000);num(state.consecutiveFailures,`${p}.state.consecutiveFailures`,0,100_000,true);num(state.deloadCount,`${p}.state.deloadCount`,0,100_000,true);nullable(state.lastEvaluatedSessionId,`${p}.state.lastEvaluatedSessionId`,text);
  },2000);unique(rules.map(r=>r.exerciseId),'progression.exerciseRules');
  identified(s.pushSubscriptions,'pushSubscriptions',(sub,p)=>{validatePushSubscription(sub);instant(sub.createdAt,`${p}.createdAt`);instant(sub.updatedAt,`${p}.updatedAt`);},100);
  identified(s.restTimers,'restTimers',(timer,p)=>{instant(timer.dueAt,`${p}.dueAt`);instant(timer.createdAt,`${p}.createdAt`);nullable(timer.completedAt,`${p}.completedAt`,instant);text(timer.title,`${p}.title`,100);text(timer.body,`${p}.body`,240);oneOf(timer.status,['scheduled','sent','failed','cancelled'],`${p}.status`);},5000);
}
