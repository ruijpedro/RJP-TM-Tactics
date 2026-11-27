import test from 'node:test';
import assert from 'node:assert/strict';
import {bidLimits,marketReference} from '../src/investment.js';
const player={name:'Teste',fp:'D C',saleLow:480000,otherCosts:100000,targetRoi:20};
test('limite de 300k e teto de equilíbrio',()=>{
 const b=bidLimits({...player,buy:300000});
 assert.equal(b.maximum,300000);
 assert.equal(b.breakEven,380000);
 assert.equal(b.ideal,242857);
 assert.equal(b.status,'Dentro do limite (condicional)');
});
test('não aumentar acima do teto',()=>assert.equal(bidLimits({...player,buy:300001}).status,'Não aumentar a licitação'));
test('referência comparável com desconto',()=>{
 const p={name:'Teste',fp:'D C',comparablePrice:600000,otherCosts:100000};
 assert.equal(marketReference(p).sale,480000);
 assert.equal(bidLimits(p).maximum,300000);
 assert.equal(bidLimits(p).confidence,'Baixa');
});
test('sem referência não inventar preço',()=>assert.equal(bidLimits({name:'Teste',fp:'D C'}).maximum,null));
test('custos superiores à revenda',()=>assert.equal(bidLimits({...player,otherCosts:500000}).maximum,0));
test('comissão e salários descontados',()=>assert.equal(bidLimits({...player,feePct:10,wage:5000,weeks:12}).maximum,200000));
test('comissão integral inviabiliza cálculo',()=>assert.equal(bidLimits({...player,feePct:100}).maximum,null));
