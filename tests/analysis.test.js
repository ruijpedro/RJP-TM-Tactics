import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePositions,normalizePlayer,normalizeRoster,maximumAssignment,compareFormations,analyzeFormation,rankByPosition,rating,styleAdvice,comparePlayersForPosition,suggestPositions,teamPositionSuggestions,FORMATIONS} from '../src/analysis.js';
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

test('comparação por posição indica a vantagem e atributos sem alterar o plantel',()=>{
 const a=demoPlayers[2],b=demoPlayers[3],snapshot=[a.fp,b.fp];
 const r=comparePlayersForPosition(a,b,'DC');
 assert.ok(r);assert.ok(Number.isFinite(r.aScore));assert.ok(Number.isFinite(r.bScore));
 assert.ok(r.skills.length>3);assert.equal(r.skills[0].key,'mar');
 assert.equal(r.delta,r.aScore-r.bScore);
 assert.deepEqual([a.fp,b.fp],snapshot);
 assert.equal(comparePlayersForPosition(a,a,'DC'),null);
});
test('mudança de posição é só proposta; não altera fp nem dados TM',()=>{
 const player=demoPlayers.find(p=>p.fp==='M C');
 assert.ok(player);
 const old=structuredClone(player);
 const r=suggestPositions(player);
 assert.ok(r.current);assert.ok(Array.isArray(r.suggestions));
 assert.ok(r.suggestions.every(s=>s.fit>=0.70));
 assert.deepEqual(player,old);
 const all=teamPositionSuggestions(demoPlayers);
 assert.ok(all.length>0);assert.ok(all.every(s=>s.player&&s.pos));
});
test('pipeline Android usa SDK sem pedir pacote legado tools',()=>{
 const wf=fs.readFileSync(new URL('../.github/workflows/android-apk.yml',import.meta.url),'utf8');
 assert.match(wf,/setup-android@v4/);
 assert.match(wf,/packages: 'platform-tools'/);
 assert.doesNotMatch(wf,/setup-android@v3/);
});


import {validateCustomFormation,combinedFormations,positionsByLine} from '../src/analysis.js';
test('a tática do utilizador 3-2-3-1-1 tem onze incluindo guarda-redes',()=>{
 const pos=FORMATIONS['3-2-3-1-1'];assert.equal(pos.length,11);
 assert.deepEqual(positionsByLine(pos),{D:3,DM:2,M:3,OM:1,F:1});
 const r=analyzeFormation(demoPlayers,'3-2-3-1-1');assert.ok(r);assert.equal(r.starters.length,11);
});
test('táticas livres com posições repetidas entram no melhor onze e no ranking',()=>{
 const original=structuredClone(demoPlayers);
 const f=validateCustomFormation({name:'Minha disposição',positions:['GK','DC','DC','DC','DMC','DMC','MC','MC','MC','OMC','F']});
 assert.equal(f.positions.length,11);
 const defs=combinedFormations([f]);assert.ok(defs[f.name]);
 const chosen=analyzeFormation(demoPlayers,f.name,[f]);assert.ok(chosen);
 assert.equal(new Set(chosen.starters.map(s=>s.player.id)).size,11);
 assert.ok(compareFormations(demoPlayers,[f]).some(x=>x.name===f.name));
 assert.deepEqual(demoPlayers,original);
});
test('recusa táticas sem GR ou com número incorreto e nomes duplicados não substituem originais',()=>{
 assert.throws(()=>validateCustomFormation({name:'Falha',positions:Array(11).fill('F')}));
 assert.throws(()=>validateCustomFormation({name:'Falha',positions:['GK',...Array(9).fill('DC')]}));
 assert.throws(()=>validateCustomFormation({name:'Falha',positions:['GK',...Array(9).fill('MC'),'GK']}));
 const same=combinedFormations([{name:'4-3-3',positions:['GK',...Array(10).fill('F')]}]);
 assert.deepEqual(same['4-3-3'],FORMATIONS['4-3-3']);
});
test('importação do novo plantel não deve apagar as táticas guardadas (código interface)',()=>{
 const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(source,/db=\{\.\.\.db,players,progressHistory:history,demo:false/);
 assert.match(source,/progressHistory:history/);
 assert.match(source,/data-action=\"saveTactic\"/);
});
