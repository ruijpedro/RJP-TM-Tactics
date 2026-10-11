import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {demoPlayers} from '../src/demo.js';
import {quotaAssignment,analyzeFormation,compareFormations,foreignStatus,normalizePlayer,FORMATIONS} from '../src/analysis.js';

test('normalização preserva país do TM e classifica o estrangeiro com país do clube',()=>{
 const p=normalizePlayer({...demoPlayers[2],country:'BR',foreign:null});
 assert.equal(p.country,'br');
 assert.equal(foreignStatus(p,'PT'),true);
 assert.equal(foreignStatus(p,'br'),false);
 assert.equal(foreignStatus({...p,country:'',foreign:null},'pt'),null);
 assert.equal(foreignStatus({...p,country:'br',foreign:false},'pt'),false);
});

test('atribuição exata com quota nunca ultrapassa o número de estrangeiros',()=>{
 const m=[[98,95,40],[97,94,40]];
 const flags=[true,true,false];
 const idx=quotaAssignment(m,flags,1);
 assert.deepEqual(new Set(idx).size,2);
 assert.equal(idx.filter(i=>flags[i]).length,1);
 assert.equal(idx.reduce((s,j,i)=>s+m[i][j],0),138);
 assert.equal(quotaAssignment([[80,70],[85,75]],[true,true],0),null);
});

test('com 9 estrangeiros, melhor onze + suplentes totalizam no máximo 5',()=>{
 const roster=demoPlayers.map((p,i)=>({...p,country:i<9?'br':'pt',foreign:null}));
 const models=compareFormations(roster,[],{maxForeigners:5,clubCountry:'pt'});
 assert.ok(models.length>0);
 for(const m of models){
  const all=[...m.starters.map(s=>s.player),...m.bench.map(s=>s.player)];
  assert.ok(all.length<=16);
  assert.equal(new Set(all.map(p=>p.id)).size,all.length);
  assert.ok(all.filter(p=>foreignStatus(p,'pt')===true).length<=5);
  assert.equal(m.foreignCount,all.filter(p=>p.country==='br').length);
  assert.equal(m.unknownCount,0);
 }
});

test('quota 0 recusa todos os estrangeiros, sem trocar nacionalidades',()=>{
 const roster=demoPlayers.map((p,i)=>({...p,country:i>=12&&i<16?'br':'pt',foreign:null}));
 const r=analyzeFormation(roster,'4-3-3',[],{maxForeigners:0,clubCountry:'pt'});
 assert.ok(r);assert.equal(r.foreignCount,0);
 assert.ok(r.starters.every(x=>x.player.country==='pt'));
});

test('jogadores sem nacionalidade exigem aviso de escolha provisória',()=>{
 const roster=demoPlayers.map((p,i)=>({...p,foreign:null,country:i<15?'':'pt'}));
 const a=analyzeFormation(roster,'3-2-3-1-1',[],{maxForeigners:5,clubCountry:'pt'});
 assert.ok(a);assert.ok(a.unknownCount>0);
});

test('workflow Android usa chave persistente quando válida e permite APK de teste sem chave',()=>{
 const workflow=fs.readFileSync(new URL('../.github/workflows/android-apk.yml',import.meta.url),'utf8');
 assert.match(workflow,/secrets\.RJP_ANDROID_DEBUG_KEYSTORE_BASE64/);
 assert.match(workflow,/if \[ -n "\$DEBUG_KEYSTORE_BASE64" \]/);
 assert.match(workflow,/base64 --decode/);
 assert.match(workflow,/keytool -list/);
 assert.match(workflow,/RJP_SIGN_MODE=chave-temporaria/);
 assert.match(workflow,/rm -f "\$KEY"/);
 assert.match(workflow,/setup-android@v4/);
 assert.doesNotMatch(workflow,/::error::Assinatura não configurada/);
});

test('navegador TM importa país do clube e estatuto nacionalidade',()=>{
 const file=fs.readFileSync(new URL('../android-custom/pt/rjp/tmtactics/TmBrowserActivity.java',import.meta.url),'utf8');
 assert.match(file,/clubCountry:s\.country/);
 assert.match(file,/players:a/);
});
