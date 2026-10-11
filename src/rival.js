/** Previsão independente e PROVISÓRIA. Só usa atributos e titulares observados fornecidos
 * pelo utilizador ou capturados explicitamente de uma página do TM que os disponibilize. */
import {FORMATIONS, combinedFormations, rating, maximumAssignment, quotaAssignment, foreignStatus} from './analysis.js';

const trimName=v=>String(v??'').trim().replace(/\s+/g,' ').slice(0,95);
const key=v=>trimName(v).toLocaleLowerCase('pt-PT').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function normalizeStarters(value){
 const source=Array.isArray(value)?value:String(value||'').split(/[\n;,]+/);
 return [...new Set(source.map(p=>trimName(typeof p==='object'?p?.name:p)).filter(Boolean).map(s=>s))].slice(0,16);
}
export function historicalStarters(games=[]){
 const gamesWithLineups=(games||[]).filter(g=>Array.isArray(g.starters)&&g.starters.length);
 const rows=new Map();const dates=[...gamesWithLineups].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 for(const [idx,g] of dates.entries()){
  const seen=new Set();for(const name of g.starters){const k=key(name);if(!k||seen.has(k))continue;seen.add(k);
   const item=rows.get(k)||{name,count:0,weight:0};item.count++;item.weight+=(1+Math.max(0,5-idx)*.12);rows.set(k,item);
  }
 }
 return {games:gamesWithLineups.length,players:[...rows.values()].sort((a,b)=>b.count-a.count||b.weight-a.weight||a.name.localeCompare(b.name))};
}
function lineOf(p){if(p==='GK')return 'GK';if(['DL','DC','DR'].includes(p))return 'DEF';if(['DMC','DML','DMR'].includes(p))return 'DMC';if(['MC','ML','MR'].includes(p))return 'MID';return 'ATT';}
function groupScores(starters){
 const m={};for(const s of starters){const k=lineOf(s.position);(m[k]||=[]).push(s.score);}
 return Object.entries(m).map(([line,values])=>({line,count:values.length,score:values.reduce((a,b)=>a+b,0)/values.length}));
}
function tacticalWeaknesses(starters){
 if(!starters?.length)return [];
 const lines=groupScores(starters);
 const result=[];
 const base=lines.filter(x=>x.line!=='GK').sort((a,b)=>a.score-b.score);
 if(base.length>1&&base[1].score-base[0].score>=5)result.push({type:'setor',label:`Setor comparativamente mais fraco: ${base[0].line}`,evidence:`Índice ${base[0].score.toFixed(1)} face a ${base[1].score.toFixed(1)} no setor seguinte.`,line:base[0].line});
 const flank=starters.filter(s=>['DL','DR','DML','DMR','ML','MR','OML','OMR'].includes(s.position));
 const defense=starters.filter(s=>['DC','DL','DR'].includes(s.position));
 if(defense.length>=3&&!defense.some(s=>['DL','DR'].includes(s.position))&&!flank.some(s=>['DML','DMR'].includes(s.position)))result.push({type:'alas',label:'Possível vulnerabilidade nos corredores',evidence:'A distribuição estimada não inclui laterais nem alas defensivos explícitos.',line:'DEF'});
 for(const s of starters.filter(x=>x.position!=='GK')){
  if(s.score<50){result.push({type:'jogador',label:`${s.player.name} (${s.position})`,evidence:`Índice posicional ${s.score.toFixed(1)}/100. É uma comparação de atributos conhecidos, não uma fraqueza garantida.`,line:lineOf(s.position)});}
 }
 return result.slice(0,5);
}
/** Otimiza a distribuição do adversário. A hipótese provável dá bónus limitado a titulares
 * realmente observados; não inventa ausências, nomes nem capacidades técnicas desconhecidas. */
export function predictRival(roster=[],matches=[],custom=[],opts={}){
 const names=historicalStarters(matches);
 const filtered=(Array.isArray(roster)?roster:[]).filter(p=>p&&p.fp&&!p.excluded&&(!p.inj||String(p.inj)==='0')&&(!p.ban||['0','g'].includes(String(p.ban))));
 const preferred=(matches||[]).filter(g=>g.formation&&combinedFormations(custom)[g.formation]).map(g=>g.formation);
 const tally=new Map();for(const f of preferred)tally.set(f,(tally.get(f)||0)+1);
 const fav=[...tally].sort((a,b)=>b[1]-a[1])[0]?.[0]||opts.preferredFormation||'3-2-3-1-1';
 const formations=combinedFormations(custom);
 if(filtered.length<11){return {formation:fav,probable:null,theoretical:null,weaknesses:[],history:names,confidence:'sem dados suficientes',notes:[filtered.length?'Há menos de 11 jogadores do adversário com atributos importados.':'Importa o plantel visível do adversário para calcular o seu melhor onze teórico.',names.games?'Existe histórico de titulares; a frequência não substitui atributos que não estejam disponíveis.':'Regista nomes dos titulares nos jogos anteriores para melhorar a previsão.']};}
 const seen=new Map(names.players.map(x=>[key(x.name),x]));
 function assign(formation,observed){
  const positions=formations[formation];if(!positions)return null;
  const mat=positions.map(pos=>filtered.map(p=>{
   const base=rating(p,pos);if(base<=0)return 0;
   const used=seen.get(key(p.name));const bonus=observed&&used&&names.games?Math.min(8,used.count/names.games*8):0;
   return Math.min(100,base+bonus);
  }));
  const flags=filtered.map(p=>foreignStatus(p,opts.clubCountry||''));
  const max=Number.isFinite(opts.maxForeigners)?opts.maxForeigners:Infinity;
  const ids=Number.isFinite(max)?quotaAssignment(mat,flags,max):maximumAssignment(mat);
  if(!ids||ids.some((i,j)=>i<0||mat[j][i]<=0))return null;
  const starters=ids.map((i,j)=>({position:positions[j],player:filtered[i],score:rating(filtered[i],positions[j]),observedGames:seen.get(key(filtered[i].name))?.count||0}));
  return {formation,starters,average:starters.reduce((s,x)=>s+x.score,0)/11};
 }
 const evaluated=Object.keys(formations).map(f=>assign(f,false)).filter(Boolean).sort((a,b)=>b.average-a.average);
 const theoretical=evaluated[0]||null;
 // O histórico de formação prevalece apenas quando há no mínimo dois registos.
 const formation=preferred.length>=2&&tally.get(fav)>=2?fav:(theoretical?.formation||fav);
 const probable=assign(formation,true)||theoretical;
 const weakness=tacticalWeaknesses(probable?.starters||[]);
 const notes=[];
 if(names.games<3)notes.push('Titulares anteriores insuficientes para prever escolhas com confiança; o onze provável aproxima-se do melhor onze estimado.');
 if(preferred.length<2)notes.push('Sem histórico consistente de formações; a tática prevista é uma hipótese técnica.');
 if(filtered.some(p=>p.condition==null))notes.push('Condição de parte do plantel desconhecida; a classificação não consegue avaliar fadiga real.');
 return {formation,probable,theoretical,weaknesses:weakness,history:names,confidence:names.games>=5&&preferred.length>=3?'moderada':names.games>=2?'limitada':'muito limitada',notes};
}
export function compareWithRival(own,rival){
 if(!own?.starters?.length||!rival?.probable?.starters?.length)return [];
 const ours=groupScores(own.starters),theirs=groupScores(rival.probable.starters);
 const result=[];
 for(const a of ours){const b=theirs.find(x=>x.line===a.line);if(!b)continue;
  const delta=a.score-b.score;
  if(Math.abs(delta)>=7)result.push({line:a.line,delta,reason:delta>0?'Setor nosso teoricamente superior':'Setor adversário teoricamente superior'});
 }
 return result.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
}

/** Propostas específicas para o próximo jogo, sempre condicionais.
 * Não afirma que um corredor será explorável apenas por não existir um lateral nominal. */
export function rivalGamePlan(own,rival,trends){
 if(!own?.starters?.length||!rival?.probable?.starters?.length)return [];
 const ownPositions=own.starters.map(s=>s.position);
 const oursWings=ownPositions.filter(p=>['DL','DR','DML','DMR','ML','MR','OML','OMR'].includes(p)).length;
 const theirs=rival.probable.starters;
 const suggestions=[];
 const flanks=rival.weaknesses.find(w=>w.type==='alas');
 if(flanks){
  suggestions.push({priority:oursWings>=2?'ponderar':'verificar',title:'Ataque pelos corredores',
   text:oursWings>=2?'A disposição adversária pode deixar espaço nos corredores; testa a tua alternativa com cobertura/velocidade nas alas antes de mudares o 3-2-3-1-1.':'O rival pode expor corredores, mas a tua formação também tem pouca largura: só recomenda atacar pelas alas se houver jogadores adequados.',
   evidence:flanks.evidence});
 }
 const comp=compareWithRival(own,rival);
 for(const c of comp.slice(0,2)){
  if(c.line==='DEF'&&c.delta<0)suggestions.push({priority:'prudência',title:'Proteger a saída de bola',text:'A nossa defesa aparece menos forte na comparação; pondera conservar os 2 médios defensivos e reduzir exposições desnecessárias.',evidence:`Diferença por setor: ${c.delta.toFixed(1)} pontos do índice RJP.`});
  if(c.line==='MID'&&c.delta>0)suggestions.push({priority:'ponderar',title:'Disputar o meio-campo',text:'O nosso meio-campo está melhor classificado neste confronto de índices; pondera privilegiar construção pelo centro se a tua equipa tiver jogadores adequados.',evidence:`Diferença por setor: +${c.delta.toFixed(1)}.`});
  if(c.line==='ATT'&&c.delta<0)suggestions.push({priority:'prudência',title:'Evitar um duelo de ataque aberto',text:'Os atacantes adversários têm índice superior; considera equilíbrio ou uma postura inicial mais prudente.',evidence:`Diferença por setor: ${c.delta.toFixed(1)}.`});
 }
 if(trends?.wingShare>=0.5&&oursWings<2)suggestions.push({priority:'ponderar',title:'Melhorar cobertura lateral',text:'O adversário usou ataques pelas alas em vários jogos e a tua distribuição atual tem pouca cobertura dos corredores. Compara a tua tática com uma variante que tenha alas/laterais.',evidence:`Jogos com ataques laterais: ${trends.wingGames}/${trends.n}.`});
 if(!suggestions.length)suggestions.push({priority:'manter',title:'Manter o plano habitual',text:'Sem vantagem suficientemente fundamentada para alterar o teu 3-2-3-1-1. Confirma as observações mais recentes.',evidence:'Índices táticos não garantem resultados do motor TM.'});
 return suggestions.slice(0,5);
}
