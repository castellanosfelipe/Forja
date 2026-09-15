import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, isAbsolute } from 'node:path';
const dir=resolve('docs/qa/2026-09-09');
const missing=[];
for(const name of await readdir(dir)) {
  if(!name.endsWith('.md')) continue;
  const file=resolve(dir,name), body=await readFile(file,'utf8');
  for(const match of body.matchAll(/\]\(([^)]+)\)/g)) {
    const target=match[1].split('#')[0];
    if(!target||/^[a-z]+:\/\//i.test(target))continue;
    const path=isAbsolute(target)?target:resolve(dirname(file),target);
    if(!await stat(path).catch(()=>null))missing.push({file:name,target});
  }
}
const body=await readFile(resolve(dir,'README.md'),'utf8');
const entries=Array.from(body.matchAll(/^\| ((?:API-D\d{3}|BUS-F\d{2}|PWA-F\d{2}|UI-F\d{2})) \| (P[0-4]) \|/gm));
const priorities=Object.fromEntries(['P0','P1','P2','P3','P4'].map(p=>[p,entries.filter(e=>e[2]===p).length]));
if(new Set(entries.map(e=>e[1])).size!==34||entries.length!==34)throw new Error('Defect registry count mismatch');
if(missing.length)throw new Error(JSON.stringify(missing));
const summary=JSON.parse(await readFile(resolve(dir,'summary.json'),'utf8'));
if(summary.identifiedCases!==256||summary.executedCases!==233||summary.counts.FAIL!==48)throw new Error('Unexpected matrix statistics');
console.log(JSON.stringify({localMarkdownLinks:'PASS',defects:entries.length,priorities,uniqueCases:summary.identifiedCases,executed:summary.executedCases},null,2));
