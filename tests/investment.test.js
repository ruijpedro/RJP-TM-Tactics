import test from 'node:test';
import assert from 'node:assert/strict';
import {demoPlayers} from '../src/demo.js';
import {investmentCandidate,investmentPositions,resaleScenario,investmentAnalysis,sanitizeInvestmentList} from '../src/investment.js';
const player={...demoPlayers[9],id:'tm-123',buy:100000,wage:1000,weeks:10,feePct:5,otherCosts:5000,saleLow:100000,saleMid:160000,saleHigh:200000};
test('mercado conserva perfil TM e permite reconversão apenas como sugestão',()=>{
 const p=investmentCandidate(player);assert.equal(p.name,player.name);const x=investmentAnalysis(p);
 assert.ok(x.positions.length>4);assert.ok(x.favourite.natural);
 assert.ok(x.compatible.every(r=>!r.natural&&r.fit>=.7));
 assert.equal(x.candidate.targetPosition,'');
 assert.equal(player.buy,100000);
});
test('custo total, ponto de equilíbrio, lucro e ROI incluem tempo e comissões',()=>{
 const r=resaleScenario(player);
 assert.equal(r.holding,10000);assert.equal(r.invested,115000);
 assert.equal(r.breakEven,121053);assert.equal(r.mid.net,37000);
 assert.equal(r.mid.roi,32.2);
 assert.equal(r.low.net,-20000);
});
test('não inventa previsão ou lucro quando falta valor de venda',()=>{
 const r=investmentAnalysis({...player,saleLow:0,saleMid:0,saleHigh:0});
 assert.equal(r.economy.mid,null);assert.equal(r.decision,'Dados insuficientes');
});
test('não assume que posição tecnicamente forte é posição favorita',()=>{
 const p=investmentCandidate({...player,fp:'M C'});
 const r=investmentPositions(p);
 assert.ok(r.some(x=>!x.natural));assert.ok(r.some(x=>x.natural));
 assert.ok(r.every(x=>x.pos!=='GK'));
});
test('jogador com ficha incompleta mantém-se na lista mas não recebe pontuação inventada',()=>{
 const p=investmentCandidate({name:'Candidato sem dados',fp:'D C',buy:4000});
 const r=investmentAnalysis(p);assert.equal(r.positions.length,0);assert.equal(r.decision,'Dados insuficientes');
});
test('recusa posição inválida e valores financeiros negativos',()=>{
 assert.throws(()=>investmentCandidate({name:'Teste',fp:'XYZ'}));
 const p=investmentCandidate({...player,buy:-12,feePct:110,wage:-2});
 assert.equal(p.buy,0);assert.equal(p.feePct,0);assert.equal(p.wage,0);
});
test('lista importada saneada tem limite e rejeita registos inválidos',()=>{
 const r=sanitizeInvestmentList([{name:'',fp:'D C'},player]);assert.equal(r.length,1);
 assert.equal(r[0].id,'tm-123');
});

test('compara preços observados, mas não altera o valor de venda',()=>{
 const r=investmentAnalysis({...player,comparablePrice:150000,targetPosition:'OMC'});
 assert.equal(r.discount,33.3);assert.equal(r.target.pos,'OMC');
 assert.ok(r.training);assert.equal(r.candidate.saleMid,160000);
});
