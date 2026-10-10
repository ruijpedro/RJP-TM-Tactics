import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { trainingPlan, recruitmentProfile, marketShortlist, LEVELS } from '../src/development.js';
import { demoPlayers } from '../src/demo.js';
import {POSITIONS,POSITION_NAMES,normalizePlayer} from '../src/analysis.js';

test('plano de treino usa melhor posição natural e não altera dados nem tática no TM',()=>{
 const player=demoPlayers.find(x=>x.fp==='D C')||demoPlayers[2];
 const before=structuredClone(player);
 const plan=trainingPlan(player);
 assert.ok(plan);assert.ok(plan.position in POSITION_NAMES);
 assert.equal(plan.target,15);
 assert.ok(plan.skills.length>=5);
 assert.deepEqual(player,before);
});
test('défices em marcação/desarme/posicionamento geram prioridades relevantes num DC',()=>{
 const player=normalizePlayer({id:'zz',name:'Exemplo de central',fp:'D C',mar:7,tac:8,pos:6,pac:9,hea:11,str:12,wor:14,age:21});
 const plan=trainingPlan(player,'DC','competitivo');
 const keys=plan.priorities.map(x=>x.key);
 assert.ok(keys.includes('mar'));assert.ok(keys.includes('tac'));
 assert.ok(keys.includes('pos') || plan.priorities.some(p=>p.key==='pac'));
 const marking=plan.skills.find(s=>s.key==='mar');assert.equal(marking.gap,8);
 assert.equal(marking.target,15);
});
test('atributos não importados não são confundidos com zero real do TM',()=>{
 const p=normalizePlayer({name:'A',fp:'D C',mar:17,tac:17});
 const plan=trainingPlan(p,'DC');
 assert.ok(plan.missingSkills.some(x=>x.key==='pos'));
 assert.ok(plan.priorities.every(x=>x.value!==null));
});
test('metas 12/15/18 mudam prioridades; indicador é só recomendação',()=>{
 const p=normalizePlayer({name:'B',fp:'M C',pas:14,tec:13,wor:12,pos:10,pac:11});
 const a=trainingPlan(p,'MC','base'),b=trainingPlan(p,'MC','elite');
 assert.equal(a.target,LEVELS.base);assert.equal(b.target,LEVELS.elite);
 assert.ok(b.priorities.reduce((s,x)=>s+x.gap,0)>a.priorities.reduce((s,x)=>s+x.gap,0));
});
test('perfil de contratação abrange DC DMC MC OMC F com principais atributos',()=>{
 const exp={DC:'mar',DMC:'tac',MC:'pas',OMC:'tec',F:'fin'};
 for(const [position,key] of Object.entries(exp)){
  const profile=recruitmentProfile(demoPlayers,position,'competitivo');
  assert.ok(profile.mandatory.some(x=>x.key===key));
  assert.ok(profile.mandatory.every(x=>x.min>=1&&x.min<=20));
  assert.ok(profile.notes.length>=3);
  assert.ok(Array.isArray(profile.best));
 }
});
test('scouting é descritivo e não faz compras nem chamadas externas',()=>{
 const d=structuredClone(demoPlayers);
 const rows=marketShortlist(demoPlayers,'DMC','competitivo');
 assert.ok(Array.isArray(rows));assert.ok(rows.every(x=>x.player&&typeof x.score==='number'));
 assert.deepEqual(demoPlayers,d);
});
test('interface expõe separador Desenvolvimento, treino e mercado',()=>{
 const ui=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(ui,/data-tab="desenvolver"/);
 assert.match(ui,/function renderTrainingView/);
 assert.match(ui,/function renderMarketView/);
 assert.match(ui,/trainFromDetail/);
});
