/** RJP TM Tactics — scouting e compra para valorização. Estimativas RJP, NÃO valores oficiais do TM. */
import {trainingPlan} from './development.js';
import {OUT_SKILLS,GK_SKILLS,POSITIONS,POSITION_NAMES,parsePositions,suitability,rawScore,rating} from './analysis.js';

const ALL_SKILLS=[...new Set([...OUT_SKILLS,...GK_SKILLS])];
const finite=(v,min=0,max=1e12)=>{
 const s=String(v??'').replace(/\s/g,'').replace(',','.');
 const n=Number(s);
 return s!==''&&Number.isFinite(n)&&n>=min&&n<=max?n:0;
};
const string=(s,max=100)=>String(s??'').replace(/<[^>]*>/g,'').trim().slice(0,max);
export function investmentCandidate(input={}){
 if(!input||typeof input!=='object')throw new Error('Ficha de candidato inválida.');
 const name=string(input.name||input.nome||'',95),fp=string(input.fp||input.position||input.posicao||'',60);
 if(!name||!fp||!parsePositions(fp).length)throw new Error('Indica nome e posição favorita válida (ex.: M C, D L, F).');
 const c={id:string(input.id||`olheiro-${Date.now()}`,90),name,fp,
 age:finite(input.age,0,50),rec:finite(input.rec,0,10),asi:finite(input.asi,0,1e8),routine:finite(input.routine,0,200),
 condition:100,inj:'',ban:'',excluded:false,foreign:null,
 buy:finite(input.buy??input.price,0,1e12),comparablePrice:finite(input.comparablePrice,0,1e12),wage:finite(input.wage,0,1e12),weeks:Math.max(1,Math.min(520,Math.round(finite(input.weeks==null||input.weeks===''?12:input.weeks,0,520)))),
 feePct:finite(input.feePct,0,100),otherCosts:finite(input.otherCosts,0,1e12),
 saleLow:finite(input.saleLow,0,1e12),saleMid:finite(input.saleMid,0,1e12),saleHigh:finite(input.saleHigh,0,1e12),
 targetPosition:POSITIONS.includes(input.targetPosition)?input.targetPosition:'',
 url:string(input.url,500),notes:string(input.notes,600),createdAt:string(input.createdAt||new Date().toISOString().slice(0,10),16)};
 for(const k of ALL_SKILLS)c[k]=finite(input[k]??input.skills?.[k],0,20);
 // Não inferimos estrelas de potencial nem preço futuro com base no R5.
 return c;
}
export function sanitizeInvestmentList(input){
 if(!Array.isArray(input))return [];
 return input.slice(0,100).flatMap(x=>{try{return [investmentCandidate(x)];}catch{return [];}});
}
export function investmentPositions(player){
 const natural=parsePositions(player.fp),isGK=natural.includes('GK');
 const hasStats=(isGK?GK_SKILLS:OUT_SKILLS).some(k=>Number(player[k])>0);
 if(!hasStats)return [];
 return POSITIONS.filter(p=>isGK?p==='GK':p!=='GK').map(pos=>({
  pos,label:POSITION_NAMES[pos],natural:natural.includes(pos),fit:suitability(player,pos),
  technical:Math.round(rawScore(player,pos)*10)/10,
  effective:Math.round(rating(player,pos)*10)/10
 })).sort((a,b)=>b.effective-a.effective);
}
/** Converte custo semanal e comissão configurável em um limiar de equilíbrio.
 * Não assume tabela de taxas oficial. Todos os valores são na moeda usada no jogo. */
export function resaleScenario(candidate){
 const c=investmentCandidate(candidate);const rate=c.feePct/100;
 const holding=c.wage*c.weeks;
 const invested=c.buy+holding+c.otherCosts;
 const breakEven=rate>=1?null:Math.ceil(invested/(1-rate));
 const calc=sale=>sale>0?{
  sale,net:Math.round((sale*(1-rate)-invested)*100)/100,
  roi:invested>0?Math.round((sale*(1-rate)-invested)/invested*1000)/10:null
 }:null;
 return {invested,holding,breakEven,low:calc(c.saleLow),mid:calc(c.saleMid),high:calc(c.saleHigh),rate,
  hasPrices:!!(c.saleLow||c.saleMid||c.saleHigh)};
}
export function investmentAnalysis(candidate){
 const c=investmentCandidate(candidate),positions=investmentPositions(c);
 const fav=positions.filter(p=>p.natural).sort((a,b)=>b.effective-a.effective)[0]||null;
 const best=positions[0]||null;
 const compatible=positions.filter(p=>!p.natural&&p.fit>=.70).slice(0,3);
 const technical=positions.filter(p=>!p.natural).sort((a,b)=>b.technical-a.technical)[0]||null;
 const economy=resaleScenario(c);
 const discount=c.comparablePrice>0&&c.buy>0?Math.round((c.comparablePrice-c.buy)/c.comparablePrice*1000)/10:null;
 const target=POSITIONS.includes(c.targetPosition)?positions.find(p=>p.pos===c.targetPosition):null;
 const training=positions.length?trainingPlan(c,target?.pos||best?.pos||null):null;
 const notes=[];
 if(!positions.length)notes.push('Atributos insuficientes para classificar a posição. Importa a ficha completa do TM.');
 if(best&&fav&&best.pos!==fav.pos)notes.push(`Melhor índice imediato em ${best.pos}; verifica a penalização de adaptação (${Math.round(best.fit*100)}%).`);
 if(technical&&technical.fit<.7)notes.push(`Potencial técnico em ${technical.pos}, mas sem compatibilidade posicional confirmada; não assumir reconversão no TM.`);
 if(target&&!target.natural)notes.push(`A posição-alvo ${target.pos} tem adaptação estimada ${Math.round(target.fit*100)}%; confirmar se é viável no TM antes de investir.`);
 if(discount!=null&&discount>0)notes.push(`Preço de compra ${discount}% abaixo da referência introduzida pelo utilizador (não validada pelo TM).`);
 if(!economy.hasPrices)notes.push('Sem preços de venda comparáveis: não é possível prever lucro ou recomendação financeira.');
 if(c.age>=29)notes.push('Idade elevada: testa cenários de desvalorização e crescimento limitado.');
 if(!c.wage)notes.push('Salário não informado: margem financeira provisória.');
 if(!c.feePct)notes.push('Comissão a 0% por omissão; introduz custos efetivos caso existam.');
 const score=best?.effective??null;
 const decision=!economy.hasPrices||!positions.length?'Dados insuficientes':economy.low?.net<0&&economy.mid?.net<0&&economy.high?.net<0?'Risco elevado':economy.mid?.net>0?'Potencial de valorização (condicional)':'Comparar alternativas';
 return {candidate:c,positions,favourite:fav,best,compatible,technical,economy,notes,score,decision,discount,target,training};
}
