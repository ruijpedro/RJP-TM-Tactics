/** RJP TM Tactics – treino e scouting: critérios próprios, indicativos, sem integração de escrita no TM. */
import {LABELS,POSITION_NAMES,POSITIONS,parsePositions,rating,rawScore,rankByPosition,POSITION_WEIGHTS,suitability} from './analysis.js';

// Valores de referência assumidos pelo utilizador: não são limites do Trophy Manager.
export const LEVELS = Object.freeze({base:12,competitivo:15,elite:18});
const CATEGORIES = {
 mar:'Defesa',tac:'Defesa',str:'Físico',sta:'Físico',pac:'Alas / velocidade',
 hea:'Cabeceamento',wor:'Cabeceamento / trabalho',pos:'Cabeceamento / posicionamento',
 pas:'Técnico',tec:'Técnico',cro:'Alas / cruzamentos',
 fin:'Ataque',lon:'Ataque / remate',set:'Bolas paradas',
 han:'Guarda-redes',one:'Guarda-redes',ref:'Guarda-redes',ari:'Guarda-redes',jum:'Guarda-redes',
 com:'Guarda-redes',kic:'Distribuição GR',thr:'Distribuição GR'
};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const TRAINING_CATEGORIES=CATEGORIES;

/** Prioridades ponderadas pelos atributos relevantes e respetiva falta em relação à meta escolhida.
 * Atributo zero é tratado como desconhecido (no TM as capacidades típicas são 1..20). */
export function trainingPlan(player,role=null,level='competitivo'){
 if(!player)return null;
 const natural=parsePositions(player.fp).filter(p=>POSITIONS.includes(p));
 const allowed=POSITIONS.filter(pos=>suitability(player,pos)>=.70);
 const best=allowed.map(pos=>({pos,score:rating(player,pos)})).sort((a,b)=>b.score-a.score)[0];
 const position=POSITION_WEIGHTS[role]?role:(best?.pos||'MC');
 const target=LEVELS[level]||LEVELS.competitivo;
 const weights=POSITION_WEIGHTS[position];
 const topWeight=Math.max(...Object.values(weights));
 const skills=Object.entries(weights).map(([key,weight])=>{
  const value=Number(player[key]);const missing=!(value>=1&&value<=20);
  const gap=missing?0:Math.max(0,target-value);
  const relativeImportance=weight/topWeight;
  return {key,label:LABELS[key],category:CATEGORIES[key]||'Geral',value:missing?null:value,
   weight,relativeImportance,gap,target,priority:missing?0:Math.round(gap*relativeImportance*100)/100,
   status:missing?'Sem dados':gap===0?'Atingido':gap>=5?'Défice elevado':'A melhorar'};
 }).sort((a,b)=>b.priority-a.priority||b.weight-a.weight);
 const actionable=skills.filter(s=>s.value!==null&&s.gap>0&&s.relativeImportance>=.30);
 const missingSkills=skills.filter(s=>s.value===null);
 const priorities=actionable.slice(0,5);
 const groups=[];
 for(const s of actionable){let g=groups.find(x=>x.name===s.category);if(!g){g={name:s.category,priority:0,skills:[]};groups.push(g);}g.priority+=s.priority;g.skills.push(s.label);}
 groups.sort((a,b)=>b.priority-a.priority);
 const age=Number(player.age)||0;
 const ageNote=age>=29?'Jogador mais experiente: confirma a evolução real antes de investires muito tempo de treino.':age>0&&age<=23?'Jogador jovem: acompanha o relatório semanal e a eficácia do treinador; a evolução depende de potencial e fase de desenvolvimento.':'A evolução efetiva depende do potencial, da fase de desenvolvimento, do treinador e das instalações.';
 return {player,position,positionName:POSITION_NAMES[position],natural,bestNatural:best?.pos||position,
  level,target,score:rating(player,position),base:rawScore(player,position),skills,priorities,groups,
  missingSkills,achieved:skills.filter(s=>s.value!==null&&s.gap===0),ageNote,
  complete:priorities.length===0&&missingSkills.length===0};
}

/** Checklist de compra por função. Apenas skills importantes – evita comprar com base no ASI isolado. */
export function recruitmentProfile(roster=[],position='DC',level='competitivo'){
 if(!POSITION_WEIGHTS[position])throw new Error('Posição não reconhecida.');
 const target=LEVELS[level]||LEVELS.competitivo;
 const weights=POSITION_WEIGHTS[position];
 const entries=Object.entries(weights).sort((a,b)=>b[1]-a[1]);
 const maxWeight=entries[0][1];
 const mandatory=entries.filter(([,weight])=>weight>=maxWeight*.60);
 const secondary=entries.filter(([,weight])=>weight<maxWeight*.60&&weight>=maxWeight*.32);
 const threshold=(k,weight)=>({key:k,label:LABELS[k],weight,min:clamp(Math.round(target*(.74+.26*weight/maxWeight)),1,20)});
 const ranking=rankByPosition(roster,position).filter(x=>x.score>0);
 const best=ranking.slice(0,3).map(r=>({name:r.player.name,score:r.score,fp:r.player.fp}));
 const topScore=best.length?best[0].score:null;
 const notes=[
  'Confirmar a posição favorita e o lado preferido antes de licitar.',
  'Comparar as competências-chave com os titulares atuais; não escolher apenas pelo ASI.',
  'Analisar idade, rotina, desenvolvimento, scout, salário e preço pedido.'
 ];
 if(['DMC','MC','OMC'].includes(position))notes.push('Confirmar o equilíbrio entre criação, recuperação de bola e mobilidade conforme a função.');
 if(position==='F')notes.push('Verificar finalização, cabeceamento e remate de longe, sem ignorar posicionamento e técnica.');
 if(position==='DC')notes.push('Priorizar marcação e desarme sem descurar força, velocidade, cabeceamento e posicionamento.');
 return {position,positionName:POSITION_NAMES[position],target,level,mandatory:mandatory.map(([k,w])=>threshold(k,w)),
  secondary:secondary.map(([k,w])=>threshold(k,w)),best,topScore,notes,roleCount:ranking.filter(x=>x.adapt>=.85).length};
}

export function marketShortlist(roster,position='DC',level='competitivo'){
 const profile=recruitmentProfile(roster,position,level);
 return rankByPosition(roster,position).filter(x=>x.score>0).slice(0,5).map(x=>({player:x.player,score:x.score,
  importantBelow:profile.mandatory.filter(s=>Number(x.player[s.key])>0&&Number(x.player[s.key])<s.min).map(s=>s.label)}));
}
