/** RJP TM Tactics – registo e previsões indicativas de evolução.
 * REC/2 → estrelas gerais é uma convenção comunitária, NÃO um cálculo oficial TM.
 * Skills 19/20 são estrelas prata/ouro no TM; valores inteiros ocultam progresso fracionário.
 * Não estimar datas com dados insuficientes, nem inferir skills por ASI isoladamente.
 */
import {OUT_SKILLS,GK_SKILLS,POSITION_WEIGHTS,POSITIONS,parsePositions,rating,suitability,LABELS} from './analysis.js';
export const ALL_SKILLS=[...new Set([...OUT_SKILLS,...GK_SKILLS])];
const DAY=86_400_000;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const validDate=d=>typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d+'T12:00:00Z')) && new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
function dateMillis(d){return Date.parse(d+'T12:00:00Z');}
export function playerSnapshot(player,date){
 if(!player || !player.id || !validDate(date))throw new Error('Indica um jogador e uma data válida.');
 const skills={};
 for(const key of ALL_SKILLS){const v=Number(player[key]);if(v>=1 && v<=20)skills[key]=clamp(v,1,20);}
 const rec=Number(player.rec);
 return {playerId:String(player.id),date,rec:Number.isFinite(rec)&&rec>0&&rec<=10?rec:null,
  asi:Number(player.asi)>0?Number(player.asi):null,skills};
}
export function mergeSnapshot(history,snapshot){
 if(!Array.isArray(history))history=[];
 if(!snapshot || !snapshot.playerId || !validDate(snapshot.date))throw new Error('Observação inválida.');
 const keep=history.filter(s=>!(s.playerId===snapshot.playerId && s.date===snapshot.date));
 keep.push(snapshot);
 // No máximo 52 observações semanais por jogador, uma por data.
 const perPlayer=new Map();
 for(const s of keep){if(!s||!s.playerId||!validDate(s.date))continue;
  const key=String(s.playerId);if(!perPlayer.has(key))perPlayer.set(key,[]);
  perPlayer.get(key).push(s);
 }
 return [...perPlayer.values()].flatMap(arr=>arr.sort((a,b)=>a.date.localeCompare(b.date)).slice(-52));
}
export function snapshotsFor(history,playerId){return (history||[]).filter(s=>s.playerId===String(playerId)&&validDate(s.date)).sort((a,b)=>a.date.localeCompare(b.date));}
export function recStars(rec){
 const v=Number(rec);
 if(!Number.isFinite(v)||v<=0||v>10)return null;
 return clamp(Math.round(v)/2,.5,5);
}
export function nextRecMilestone(rec){
 const shown=recStars(rec);if(shown==null||shown>=5)return null;
 // REC em 0–10; os degraus de meia estrela surgem a REC x.5
 const threshold=Math.floor(Number(rec)+.5)+.5;
 return {rec:Math.min(9.5,threshold),stars:shown+.5};
}
export function nextWholeStarMilestone(rec){
 const shown=recStars(rec);if(shown==null||shown>=5)return null;
 const stars=Math.floor(shown)+1;return {rec:Math.min(9.5,2*stars-.5),stars};
}
export function skillStar(value){const n=Number(value);return n>=20?'ouro':n>=19?'prata':'sem estrela';}
export function bestRole(player){
 const isGK=parsePositions(player?.fp||'').includes('GK');
 const allowed=POSITIONS.filter(p=>(p==='GK')===isGK && suitability(player,p)>=.70);
 const ranked=allowed.map(pos=>({pos,score:rating(player,pos)})).sort((a,b)=>b.score-a.score);
 return ranked[0]?.pos||(isGK?'GK':'MC');
}
/** Inferência aproximada, apenas com observações em datas diferentes.
 * skill: a mudança 18→19 fornece somente um ritmo médio de degraus visíveis,
 * sem informação do progresso escondido. Intervalos são exploratórios.
 */
export function paceEstimate(history,playerId,field,target){
 const entries=snapshotsFor(history,playerId).map(s=>({date:s.date,value:field==='rec'?s.rec:s.skills?.[field]}))
  .filter(x=>Number.isFinite(x.value)&&x.value>0);
 if(entries.length<2)return {status:'insufficient',text:'Regista pelo menos duas observações em semanas diferentes.'};
 const first=entries[0],last=entries.at(-1);
 const weeks=(dateMillis(last.date)-dateMillis(first.date))/DAY/7;
 if(weeks<1)return {status:'insufficient',text:'É necessário um intervalo de pelo menos 7 dias.'};
 const gain=last.value-first.value;
 if(gain<=0)return {status:'flat',text:'Sem evolução positiva observada neste intervalo. Ainda não há prazo fiável.'};
 const rate=gain/weeks,remaining=Math.max(0,target-last.value);
 if(!remaining)return {status:'reached',text:'Patamar atingido na última observação.'};
 const midpoint=remaining/rate;
 if(!Number.isFinite(midpoint)||midpoint>104)return {status:'distant',text:'O ritmo observado não permite uma janela útil até dois anos.'};
 // intervalos largos por potencial, bloom, distribuição do treino e valores arredondados.
 const min=clamp(Math.max(1,Math.floor(midpoint*.6)),1,104);
 const max=clamp(Math.max(min+1,Math.ceil(midpoint*2)),2,104);
 return {status:'estimated',minWeeks:min,maxWeeks:max,ratePerWeek:rate,observations:entries.length,
  text:`Intervalo exploratório: ${min}–${max} semanas`,confidence:entries.length>=4&&weeks>=3?'limitada':'baixa'};
}
export function progressionReport(player,history,position){
 if(!player)return null;
 const role=POSITION_WEIGHTS[position]?position:bestRole(player);
 const observations=snapshotsFor(history,player.id);
 const milestone=nextRecMilestone(player.rec);
 const wholeMilestone=nextWholeStarMilestone(player.rec);
 const overall=recStars(player.rec);
 const overallForecast=milestone?paceEstimate(history,player.id,'rec',milestone.rec):null;
 const relevant=(role==='GK'?GK_SKILLS:OUT_SKILLS).map(key=>[key,POSITION_WEIGHTS[role]?.[key]||0]).sort((a,b)=>b[1]-a[1]);
 const skills=relevant.map(([key,weight])=>{
  const value=Number(player[key]);if(!Number.isFinite(value)||value<1||value>20)return {key,label:LABELS[key],value:null,level:'sem dados',target:null,forecast:null,weight};
  const target=value>=20?null:value>=19?20:19;
  return {key,label:LABELS[key],value,level:skillStar(value),target,weight,forecast:target?paceEstimate(history,player.id,key,target):null};
 });
 return {playerId:String(player.id),role,observations,overall,rec:Number(player.rec)>0?Number(player.rec):null,milestone,wholeMilestone,overallForecast,wholeForecast:wholeMilestone?paceEstimate(history,player.id,'rec',wholeMilestone.rec):null,skills};
}
export function sanitizeHistory(history,validPlayerIds=null){
 if(!Array.isArray(history))return [];
 let result=[];
 const ids=validPlayerIds?new Set([...validPlayerIds].map(String)):null;
 for(const raw of history.slice(-10000)){
  if(!raw||!raw.playerId||!validDate(raw.date)||ids&&!ids.has(String(raw.playerId)))continue;
  const rec=Number(raw.rec);const asi=Number(raw.asi);const skills={};
  for(const key of ALL_SKILLS){const val=Number(raw.skills?.[key]);if(val>=1&&val<=20)skills[key]=val;}
  result=mergeSnapshot(result,{playerId:String(raw.playerId),date:raw.date,rec:rec>0&&rec<=10?rec:null,asi:asi>0?asi:null,skills});
 }
 return result;
}
