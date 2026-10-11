import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePreviewCapture} from '../src/preview.js';
test('identifica rival e casa na antevisão com clube conhecido',()=>{
 const x=parsePreviewCapture({title:'Antevisão',text:'Next match\n10/10/2027\nMeu Clube vs FC Adversário\nFormação provável 4-3-3',url:'https://trophymanager.com/home/',club:'Meu Clube'});
 assert.equal(x.opponent,'FC Adversário');assert.equal(x.venue,'casa');assert.equal(x.date,'2027-10-10');
});
test('identifica rival fora pelo confronto conhecido',()=>{
 const x=parsePreviewCapture({text:'Match preview\nRival FC vs Meu Clube\n2027-11-12',club:'Meu Clube'});
 assert.equal(x.opponent,'Rival FC');assert.equal(x.venue,'fora');
});
test('não escolhe clube arbitrário num calendário com vários jogos',()=>{
 const x=parsePreviewCapture({title:'Calendário',text:'FC Um vs FC Dois\nFC Três vs FC Quatro\n19/11/2027',club:'Meu Clube'});
 assert.equal(x.opponent,'');assert.equal(x.confidence,'não identificado');
});
test('não aceita páginas de outros sites',()=>assert.throws(()=>parsePreviewCapture({url:'https://attacker.example/',text:'Olá'}),/Trophy Manager/));
test('permite texto manual sem URL mas exige conteúdo',()=>{
 assert.equal(parsePreviewCapture({text:'Próximo adversário: Clube A\nDetalhes do próximo jogo'}).opponent,'Clube A');
 assert.throws(()=>parsePreviewCapture({text:''}),/não contém texto/);
});
