import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateSquadImpact} from '../src/scouting.js';

const player=(name,extra={})=>({id:name,name,fp:'D C',age:25,routine:20,condition:100,mar:10,tac:10,pos:10,str:10,hea:10,pac:10,wor:10,...extra});
test('candidato superior melhora referência de DC',()=>{
 const team=[player('Defesa A'),player('Defesa B'),player('Defesa C')];
 const c=player('Novo Central',{mar:19,tac:19,pos:18,hea:18,str:18});
 const result=candidateSquadImpact(c,team);
 const dc=result.roles.find(p=>p.pos==='DC');
 assert.ok(dc.improvement>3);
 assert.equal(dc.status,'Melhora o onze');
 assert.equal(result.canUpgrade,true);
});
test('sem plantel não inventa comparação',()=>{
 const report=candidateSquadImpact(player('Novo Central'),[]);
 assert.equal(report.roles.find(x=>x.pos==='DC').benchmark,null);
 assert.equal(report.canUpgrade,false);
});
test('compatibilidade de posições não transforma posição favorita',()=>{
 const c=player('Novo Central',{fp:'DM C',mar:19,tac:19});
 const report=candidateSquadImpact(c,[player('Defesa A'),player('Defesa B'),player('Defesa C')]);
 assert.equal(report.roles.find(x=>x.pos==='DC').fit<100,true);
 assert.equal(c.fp,'DM C');
});
