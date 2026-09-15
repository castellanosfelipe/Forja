import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('docs/qa/2026-09-09');
const names = ['backend', 'business', 'pwa', 'ui'];
const documents = await Promise.all(names.map(async name => ({ name, data: JSON.parse(await readFile(resolve(directory, `${name}-cases.json`), 'utf8')) })));
const cases = documents.flatMap(({ name, data }) => data.cases.map(c => ({ ...c, source: name })));
const allowed = ['PASS', 'FAIL', 'BLOCKED', 'NOT TESTED', 'NOT APPLICABLE'];
if (new Set(cases.map(c => c.id)).size !== cases.length) throw new Error('Duplicate case ID');
if (cases.some(c => !allowed.includes(c.status))) throw new Error('Unknown status');
const executed = c => c.status === 'PASS' || c.status === 'FAIL';
const counts = rows => Object.fromEntries(allowed.map(status => [status, rows.filter(c => c.status === status).length]));
const tally = counts(cases);
const inventory = JSON.parse(await readFile(resolve(directory, 'inventory.json'), 'utf8')).features;
const byId = new Map(cases.map(c => [c.id, c]));
for (const f of inventory) for (const id of f.caseIds) if (!byId.has(id)) throw new Error(`Missing ${id} for ${f.id}`);
const functionsTested = inventory.filter(f => f.caseIds.some(id => executed(byId.get(id)))).length;
const stats = { baseline: 'acda8d39f379a8f1c60956b3be14022eeb692770', identifiedFunctions: inventory.length, functionsWithAtLeastOneExecution: functionsTested, minimumFunctionalCoveragePercent: Number((100 * functionsTested / inventory.length).toFixed(2)), identifiedCases: cases.length, executedCases: cases.filter(executed).length, counts: tally, passRatePercent: Number((100 * tally.PASS / (tally.PASS + tally.FAIL)).toFixed(2)), applicableScenarioExecutionPercent: Number((100 * (tally.PASS + tally.FAIL) / (cases.length - tally['NOT APPLICABLE'])).toFixed(2)), existingTests: { frontend: 84, backend: 18, total: 102, status: 'PASS', separateFromAdditionalCases: true } };
const escape = value => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const out = ['# Matriz consolidada de regresión', '', 'Base `acda8d3`. Generada desde los cuatro JSON de casos, sin convertir BLOCKED o NOT TESTED en PASS. Los tests existentes se reportan aparte en baseline.md.', '', '## Resumen por frente', '', '| Frente | Identificados | Ejecutados | PASS | FAIL | BLOCKED | NOT TESTED | N/A | Aprobación |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
for (const { name, data } of documents) { const c=counts(data.cases); const n=c.PASS+c.FAIL; out.push(`| ${name} | ${data.cases.length} | ${n} | ${c.PASS} | ${c.FAIL} | ${c.BLOCKED} | ${c['NOT TESTED']} | ${c['NOT APPLICABLE']} | ${(100*c.PASS/n).toFixed(2)}% |`); }
out.push('', '## Inventario funcional y cobertura mínima', '', 'Una función probada tiene al menos un caso PASS o FAIL; puede seguir teniendo escenarios bloqueados o pendientes. Esto NO representa cobertura de líneas/ramas ni agotamiento de combinaciones. Las filas comparten algunos casos; el total único de casos se calcula por ID.', '', '| ID | Módulo / funcionalidad | Casos definidos | Ejecutados | PASS | FAIL | BLOCKED | NOT TESTED | Cobertura de casos |', '|---|---|---:|---:|---:|---:|---:|---:|---:|');
for (const f of inventory) { const related=f.caseIds.map(id=>byId.get(id)); const c=counts(related); const n=c.PASS+c.FAIL; out.push(`| ${f.id} | ${escape(f.module+' / '+f.functionality)} | ${related.length} | ${n} | ${c.PASS} | ${c.FAIL} | ${c.BLOCKED} | ${c['NOT TESTED']} | ${(100*n/related.length).toFixed(1)}% |`); }
out.push('', '## Todos los escenarios', '', '| ID | Frente / módulo | Escenario | Estado | Detalle |', '|---|---|---|---|---|');
for (const c of cases) out.push(`| ${c.id} | ${escape(c.source+' / '+(c.module??'Negocio'))} | ${escape(c.scenario??c.name)} | ${c.status} | [Esperado, observado y evidencia](${c.source}-cases.json) |`);
out.push('', `Funciones identificadas: ${stats.identifiedFunctions}; ejercitadas al menos una vez: ${functionsTested}; cobertura funcional mínima: ${stats.minimumFunctionalCoveragePercent}%.`, '', `Casos únicos: ${cases.length}; ejecutados: ${stats.executedCases}; aprobación: ${stats.passRatePercent}%. Ejecución de escenarios aplicables: ${stats.applicableScenarioExecutionPercent}%.`, '');
await writeFile(resolve(directory, 'regression-matrix.md'), out.join('\n'));
await writeFile(resolve(directory, 'summary.json'), JSON.stringify(stats,null,2)+'\n');
const invLines=['# Inventario funcional', '', 'Observación inicial: las funciones existentes aún no estaban validadas. No se inventaron módulos administrativos ni roles ausentes. El operador de Docker es una responsabilidad de infraestructura, no un rol en la aplicación.', '', '| ID | Módulo | Componente | Funcionalidad | Rol | Dependencias | Estado inicial | Casos |', '|---|---|---|---|---|---|---|---|'];
for (const f of inventory) invLines.push('| '+[f.id,f.module,f.component,f.functionality,f.role,f.dependencies,f.initialState,f.caseIds.join(', ')].map(escape).join(' | ')+' |');
invLines.push('', 'Frontend: acceso público y seis rutas privadas `/`, `/metrics`, `/plan`, `/library`, `/workout`, `/profile`, más fallback de ruta desconocida. Backend: 26 combinaciones de método/ruta inventariadas en backend-security.md, todas recibieron alguna petición. No equivale a todas las combinaciones de cada endpoint.', '', 'Ausentes: panel administrador, roles empresariales, pagos, email transaccional, recuperación/cambio de contraseña, importación completa de una cuenta y pipeline CI versionado. Se distinguen del comportamiento implementado que falla; no se calificaron como PASS.', '');
await writeFile(resolve(directory, 'inventory.md'),invLines.join('\n'));
console.log(JSON.stringify(stats,null,2));
