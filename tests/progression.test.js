import test from 'node:test';
import assert from 'node:assert/strict';
import {recStars,nextRecMilestone,nextWholeStarMilestone,skillStar,playerSnapshot,mergeSnapshot,snapshotsFor,paceEstimate,progressionReport,sanitizeHistory} from '../src/progression.js';
import {demoPlayers} from '../src/demo.js';
const p={...demoPlayers[2],id:'player-1',rec:7.2,mar:18,tac:19,pos:20};
test('REC comunitário: estrelas em meios pontos e próximo limiar',()=>{
 assert.equal(recStars(7.2),3.5);assert.equal(nextRecMilestone(7.2).rec,7.5);assert.equal(nextRecMilestone(7.2).stars,4);
 assert.equal(nextWholeStarMilestone(6.2).stars,4);assert.equal(nextWholeStarMilestone(6.2).rec,7.5);assert.equal(recStars(7.5),4);assert.equal(nextRecMilestone(9.6),null);assert.equal(recStars(0),null);
});
test('skill 19 é estrela prata, 20 é ouro, 18 não é estrela',()=>{
 assert.equal(skillStar(18),'sem estrela');assert.equal(skillStar(19),'prata');assert.equal(skillStar(20),'ouro');
});
test('observações mantêm dados e substituem a mesma data',()=>{
 let h=mergeSnapshot([],playerSnapshot(p,'2026-10-06'));
 h=mergeSnapshot(h,playerSnapshot({...p,rec:7.3},'2026-10-06'));
 h=mergeSnapshot(h,playerSnapshot({...p,rec:7.7},'2026-10-13'));
 assert.equal(h.length,2);assert.equal(snapshotsFor(h,'player-1')[0].rec,7.3);
 assert.equal(snapshotsFor(h,'outro').length,0);
});
test('não gera prazo quando existe apenas uma observação',()=>{
 const h=[playerSnapshot(p,'2026-10-06')];
 assert.equal(paceEstimate(h,p.id,'rec',7.5).status,'insufficient');
 assert.equal(paceEstimate(h,p.id,'mar',19).status,'insufficient');
});
test('histórico sem evolução não promete semanas',()=>{
 const h=[playerSnapshot(p,'2026-10-06'),playerSnapshot(p,'2026-10-13')];
 assert.equal(paceEstimate(h,p.id,'rec',7.5).status,'flat');
 assert.equal(paceEstimate(h,p.id,'mar',19).status,'flat');
});
test('mostra apenas janela indicativa com crescimento documentado',()=>{
 const h=[playerSnapshot({...p,rec:6.8,mar:17},'2026-09-29'),playerSnapshot(p,'2026-10-13')];
 const a=paceEstimate(h,p.id,'rec',7.5);
 assert.equal(a.status,'estimated');assert.ok(a.minWeeks>=1);assert.ok(a.maxWeeks>a.minWeeks);
 const b=paceEstimate(h,p.id,'mar',19);assert.equal(b.status,'estimated');
});
test('relatório distingue estrela geral e atributo individual',()=>{
 const report=progressionReport(p,[],'DC');
 assert.equal(report.overall,3.5);assert.equal(report.milestone.stars,4);assert.equal(report.wholeMilestone.stars,4);
 assert.equal(report.skills.find(s=>s.key==='tac').level,'prata');
 assert.equal(report.skills.find(s=>s.key==='pos').level,'ouro');
});
test('limpa observações inválidas sem inventar progressos',()=>{
 const clean=sanitizeHistory([{playerId:'player-1',date:'2026-10-06',rec:7,skills:{mar:18,other:99}}, {playerId:'p0',date:'bad',rec:8}],['player-1']);
 assert.equal(clean.length,1);assert.deepEqual(clean[0].skills,{mar:18});
});
