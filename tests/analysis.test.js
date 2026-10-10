import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePositions,normalizePlayer,normalizeRoster,maximumAssignment,compareFormations,analyzeFormation,rankByPosition,rating,styleAdvice,FORMATIONS} from '../src/analysis.js';
import {demoPlayers} from '../src/demo.js';
import {parseCsv,importText} from '../src/import.js';

test('TM interpreta posições favoritas compostas e laterais',()=>{
 assert.deepEqual(parsePositions('D LR, DM C').sort(),['DL','DR','DMC'].sort());
 assert.deepEqual(parsePositions('OM C, F').sort(),['OMC','F'].sort());
 assert.deepEqual(parsePositions('GK'),['GK']);
});
test('matriz da escolha global não repete jogadores e supera escolha gananciosa',()=>{
 const matrix=[[100,99,10],[100,1,1]];
 const a=maximumAssignment(matrix);assert.equal(new Set(a).size,2);
 assert.equal(a.reduce((s,j,i)=>s+matrix[i][j],0),199);
});
test('demo permite analisar 10 formações e escolher 11 jogadores únicos',()=>{
 const list=compareFormations(demoPlayers);assert.ok(list.length>=5);
 assert.ok(list[0].average>0);
 for(const f of list){assert.equal(f.starters.length,11);assert.equal(new Set(f.starters.map(s=>s.player.id)).size,11);assert.ok(f.average>=0&&f.average<=100);}
 assert.ok(FORMATIONS[list[0].name]);
});
test('sem jogadores suficientes não devolve um onze falso',()=>{
 assert.equal(analyzeFormation(demoPlayers.slice(0,10),'4-3-3'),null);
});
test('goleiro nunca joga fora da baliza; lesionado e suspenso excluídos',()=>{
 const gk=demoPlayers[0];assert.equal(rating(gk,'DC'),0);
 assert.equal(rating({...demoPlayers[5],inj:'2'},'DR'),0);
 assert.equal(rating({...demoPlayers[5],ban:'2'},'DR'),0);
 assert.ok(rating({...demoPlayers[5],ban:'g'},'DR')>0);
});
test('ranking por posição e métricas de estilo',()=>{
 const l=rankByPosition(demoPlayers,'F');assert.ok(l[0].score>=l.at(-1).score);
 const styles=styleAdvice(compareFormations(demoPlayers)[0]);assert.equal(styles.length,5);assert.ok(styles.every(s=>s.score<=100));
});
test('importador valida players_ar e recusa dados sem atributos',()=>{
 const p=normalizeRoster({players_ar:demoPlayers});assert.equal(p.length,demoPlayers.length);
 assert.throws(()=>normalizeRoster({something:3}));
 assert.equal(normalizePlayer({name:'A',fp:'M C',pas:0}),null);
});
test('CSV suporta vírgulas em campos entre aspas e importação',()=>{
 const raw='name,fp,pas,tec,wor\n"Silva, João","M C",16,17,15\n';
 assert.equal(parseCsv(raw)[0].name,'Silva, João');
 assert.equal(importText(raw,'plantel.csv').length,1);
});
