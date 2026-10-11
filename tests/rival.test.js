import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalStarters,predictRival,compareWithRival,rivalGamePlan} from '../src/rival.js';
import {normalizeOpponentGame} from '../src/opponent.js';
import {demoPlayers} from '../src/demo.js';
import {compareFormations} from '../src/analysis.js';

test('aceita lista de titulares do jogo observado por linhas',()=>{
 const g=normalizeOpponentGame({formation:'4-3-3',starters:'Jogador Um\nJogador Dois\nJogador Três'});
 assert.deepEqual(g.starters,['Jogador Um','Jogador Dois','Jogador Três']);
});
test('histórico conta frequência dos jogadores sem repetir na mesma partida',()=>{
 const h=historicalStarters([{date:'2026-10-01',starters:['João Silva','João Silva','Pedro']},{date:'2026-10-04',starters:['João Silva','Rui']}]);
 assert.equal(h.games,2);assert.equal(h.players[0].name,'João Silva');assert.equal(h.players[0].count,2);
});
test('sem jogadores rivais não inventa onze',()=>{
 const r=predictRival([], [{formation:'4-3-3',starters:['A','B']}]);
 assert.equal(r.probable,null);assert.equal(r.theoretical,null);assert.equal(r.history.games,1);
});
test('plantel importado produz onze único e projeção diferenciada',()=>{
 const r=predictRival(demoPlayers, [{formation:'3-2-3-1-1',starters:demoPlayers.slice(0,11).map(p=>p.name)},{formation:'3-2-3-1-1',starters:demoPlayers.slice(0,11).map(p=>p.name)}]);
 assert.ok(r.probable);assert.equal(r.probable.starters.length,11);
 assert.equal(new Set(r.probable.starters.map(x=>x.player.id)).size,11);
 assert.ok(r.theoretical);
});
test('comparação nunca cria uma vantagem sem ambos os onzes',()=>{
 assert.deepEqual(compareWithRival(null,{probable:null}),[]);
 const ours=compareFormations(demoPlayers)[0],r=predictRival(demoPlayers,[]);
 assert.ok(Array.isArray(compareWithRival(ours,r)));
});

test('plano tático devolve apenas propostas e não modifica as equipas',()=>{
 const ours=compareFormations(demoPlayers)[0],r=predictRival(demoPlayers,[]);
 const before=JSON.stringify(r.probable.starters);
 const advice=rivalGamePlan(ours,r,{n:5,wingShare:0.8,wingGames:4});
 assert.ok(advice.length>=1);assert.equal(JSON.stringify(r.probable.starters),before);
});
