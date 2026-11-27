/** Compatibilidade para evolução Mercado: não altera a posição favorita TM. */
import {investmentCandidate} from './investment.js';
import {rating,rawScore,suitability} from './analysis.js';
export function candidateSquadImpact(candidate,roster=[],formation='3-2-3-1-1'){
 const c=investmentCandidate(candidate);
 const formations={
  '3-2-3-1-1':['GK','DC','DC','DC','DMC','DMC','MC','MC','MC','OMC','F'],
  '4-2-3-1':['GK','DL','DC','DC','DR','DMC','DMC','OML','OMC','OMR','F']
 };
 const slots=formations[formation]||formations['3-2-3-1-1'];
 const roles=[...new Set(slots)].map(pos=>{
  const candidateScore=rating(c,pos);
  const actual=(Array.isArray(roster)?roster:[]).filter(p=>p&&String(p.id)!==String(c.id))
   .map(p=>({name:String(p.name||'Jogador'),score:rating(p,pos)}))
   .filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  const places=slots.filter(x=>x===pos).length;
  const benchmark=actual[places-1]||null;
  const improvement=benchmark?Math.round((candidateScore-benchmark.score)*10)/10:null;
  return {pos,places,candidateScore:Math.round(candidateScore*10)/10,
   technical:Math.round(rawScore(c,pos)*10)/10,benchmark,improvement,
   fit:Math.round(suitability(c,pos)*100),
   status:improvement===null?'Sem comparação':improvement>=3?'Melhora o onze':
      improvement>=0?'Disputa titularidade':'Alternativa / não melhora'};
 }).sort((a,b)=>(b.improvement??-999)-(a.improvement??-999));
 const available=roles.filter(x=>x.improvement!==null&&x.candidateScore>0);
 return {formation,roles,bestUpgrade:available[0]||null,
  canUpgrade:available.some(x=>x.improvement>=3),
  caveat:'Índice orientativo por posição; não substitui simulação global do onze e não garante alteração da posição favorita TM.'};
}
