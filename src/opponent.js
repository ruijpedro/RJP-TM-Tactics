/** Observador RJP v1.5: regras transparentes, com base EXCLUSIVA nos dados introduzidos pelo utilizador.
 * Não reproduz o motor TM, nem prevê resultados, nem contacta o site do jogo. */
import {positionsByLine,styleAdvice} from './analysis.js';

export const OPPONENT_STYLES=['Desconhecido','Equilibrado','Passe curto','Jogo direto','Bolas longas','Pelas alas','Passes em profundidade'];
export const OPPONENT_MENTALITIES=['Desconhecida','Muito defensiva','Defensiva','Equilibrada','Ofensiva','Muito ofensiva'];
export const ATTACK_DIRECTIONS=['Desconhecida','Esquerda','Centro','Direita','Ambas as alas'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clean=(v,n=90)=>String(v??'').trim().slice(0,n);
const VALID_FORMATION=/^[1-5](?:-[0-9]){1,6}$/;
const finiteInt=(v,min,max)=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max||!Number.isInteger(n))throw new Error('Número de golos inválido.');return n;};
export function normalizeOpponentGame(value){
 if(!value||typeof value!=='object')throw new Error('Registo de jogo inválido.');
 const formation=clean(value.formation,25);
 if(formation && !VALID_FORMATION.test(formation))throw new Error('Formação inválida. Exemplo: 4-2-3-1.');
 const style=clean(value.style||'Desconhecido',50), mentality=clean(value.mentality||'Desconhecida',50),direction=clean(value.direction||'Desconhecida',50);
 if(!OPPONENT_STYLES.includes(style)||!OPPONENT_MENTALITIES.includes(mentality)||!ATTACK_DIRECTIONS.includes(direction))throw new Error('Estilo, mentalidade ou direção inválidos.');
 return {
  id:clean(value.id||`j-${Date.now()}`,60),date:clean(value.date,10),formation,
  style,mentality,direction,
  gf:finiteInt(value.gf??0,0,50),ga:finiteInt(value.ga??0,0,50),
  venue:['casa','fora','desconhecido'].includes(value.venue)?value.venue:'desconhecido',
  notes:clean(value.notes,300),starters:(Array.isArray(value.starters)?value.starters:String(value.starters||'').split(/[\n;,]+/)).map(x=>String(typeof x==='object'?x.name||'':x).trim().slice(0,95)).filter(Boolean).slice(0,16)
 };
}
export function normalizeOpponent(value){
 if(!value||typeof value!=='object')throw new Error('Ficheiro de adversário inválido.');
 const matches=value.matches||value.games;
 if(!Array.isArray(matches)||matches.length>25)throw new Error('O adversário deve ter uma lista de, no máximo, 25 jogos.');
 return {name:clean(value.name,110),date:clean(value.date,10),venue:value.venue==='fora'?'fora':'casa',notes:clean(value.notes,350),matches:matches.map(normalizeOpponentGame).slice(0,15)};
}
export function emptyOpponent(){return {name:'',date:'',venue:'casa',notes:'',matches:[]};}
function leading(items,empty){
 const counts=new Map();for(const x of items){if(x!==empty&&x)counts.set(x,(counts.get(x)||0)+1);}
 return [...counts].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))).map(([name,count])=>({name,count}));
}
export function opponentTrends(opponent){
 const matches=opponent?.matches||[];const n=matches.length;
 const styles=leading(matches.map(g=>g.style),'Desconhecido');
 const formations=leading(matches.map(g=>g.formation),'');
 const directions=leading(matches.map(g=>g.direction),'Desconhecida');
 const mentalities=leading(matches.map(g=>g.mentality),'Desconhecida');
 const wingGames=matches.filter(g=>g.style==='Pelas alas'||['Esquerda','Direita','Ambas as alas'].includes(g.direction)).length;
 const centerGames=matches.filter(g=>g.direction==='Centro'||g.style==='Passe curto').length;
 const gf=matches.reduce((s,g)=>s+g.gf,0),ga=matches.reduce((s,g)=>s+g.ga,0);
 return {n,gf,ga,wingGames,centerGames,wingShare:n?wingGames/n:0,centerShare:n?centerGames/n:0,
  styles,formations,directions,mentalities,confidence:n===0?'sem dados':n<3?'muito limitada':n<5?'limitada':'moderada'};
}
/** Bónus/penalizações pequenos (máx. 4 pontos), para nunca sobrepor um plantel superior
 * a partir de observações frágeis. Formação sem laterais sofre risco contra ataque pelas alas. */
export function opponentMatchupAdjustment(formation, trends){
 if(!formation?.starters?.length||!trends?.n)return {delta:0,reason:'Sem jogos registados'};
 const lines=positionsByLine(formation.starters.map(s=>s.position));
 const backs=formation.starters.filter(s=>['DL','DR','DML','DMR','ML','MR','OML','OMR'].includes(s.position)).length;
 let delta=0;const reasons=[];
 if(trends.wingShare>=0.5){
  const penalty=backs===0?-4:backs===1?-2.5:backs===2?-1:1;
  delta+=penalty;reasons.push(backs>=3?'Tem cobertura dos corredores perante ataques pelas alas':'É importante reforçar a cobertura das alas');
 }
 if(trends.centerShare>=0.5){
  const bonus=lines.DM>=2?1.5:lines.DM===1?.5:-1;
  delta+=bonus;reasons.push('Importância de proteger a zona central');
 }
 const factor=clamp(trends.n/5,0.2,1);
 return {delta:Math.round(clamp(delta*factor,-4,4)*10)/10,reason:reasons.join('; ')||'Dados táticos ainda pouco conclusivos'};
}
/** Primeiro calcula o melhor onze com as regras existentes. Só depois aplica correções modestas. */
export function scoutNextMatch(opponent,formResults,preferred='3-2-3-1-1'){
 const trends=opponentTrends(opponent);
 if(!trends.n)return {trends,choices:[],recommendation:null,base:null,change:false,notes:['Regista os jogos anteriores do adversário para obter propostas fundamentadas.']};
 const choices=(formResults||[]).map(f=>{
  const adjustment=opponentMatchupAdjustment(f,trends);
  return {formation:f,adjustment,score:Math.round((f.average+adjustment.delta)*10)/10};
 }).sort((a,b)=>b.score-a.score);
 const base=choices.find(c=>c.formation.name===preferred)||choices[0]||null;
 const best=choices[0]||null;
 const gain=base&&best?Math.round((best.score-base.score)*10)/10:0;
 // Diferenças pequenas devem ser apresentadas como alternativas, não como mudança obrigatória.
 const change=!!base&&!!best&&best.formation.name!==base.formation.name&&gain>=3&&trends.n>=3;
 const recommendation=change?best:base;
 const notes=[];
 if(trends.n<3)notes.push('Amostra muito pequena: não se recomenda mudar de formação apenas com estes dados.');
 else if(trends.n<5)notes.push('Confiança limitada; confirma tendências e jogadores antes do jogo.');
 else notes.push('Tendências descritivas; o adversário poderá usar outra tática.');
 if(trends.wingShare>=.5)notes.push(`Ataques pelas alas observados em ${trends.wingGames}/${trends.n} jogos: atenção à cobertura dos corredores.`);
 if(trends.centerShare>=.5)notes.push(`Tendência para jogo central em ${trends.centerGames}/${trends.n} jogos: protege o meio-campo.`);
 if(trends.gf/trends.n>=2)notes.push('Média de golos marcados elevada na amostra: considerar uma abordagem inicial prudente.');
 const style=recommendation?styleAdvice(recommendation.formation)[0]:null;
 return {trends,choices,base,recommendation,change,gain,style,notes};
}
