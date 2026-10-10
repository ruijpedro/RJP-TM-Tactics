/** RJP TM Tactics v1 — índices HEURÍSTICOS e NÃO OFICIAIS. Sem copiar código do Tactics Pro. */
export const OUT_SKILLS = ['str','sta','pac','mar','tac','wor','pos','pas','cro','tec','hea','fin','lon','set'];
export const GK_SKILLS = ['str','sta','pac','han','one','ref','ari','jum','com','kic','thr'];
export const LABELS = {str:'Força',sta:'Resistência',pac:'Velocidade',mar:'Marcação',tac:'Desarme',wor:'Trabalho',pos:'Posicionamento',pas:'Passe',cro:'Cruzamentos',tec:'Técnica',hea:'Cabeceamento',fin:'Finalização',lon:'Remate longe',set:'Bolas paradas',han:'Mãos',one:'1 contra 1',ref:'Reflexos',ari:'Jogo aéreo',jum:'Salto',com:'Comunicação',kic:'Pontapé',thr:'Lançamento'};

// Pesos próprios, orientativos. Combinam aptidão por posição e características descritas publicamente pela comunidade TM.
const SHAPE = {
 GK:{han:4,ref:4,one:3,ari:2,jum:1.7,com:1.4,str:1, pac:.9, kic:.5, thr:.5,sta:.4},
 DC:{mar:4,tac:4,pos:2.5,str:2.3,hea:2,pac:1.8,wor:1.2},
 DL:{mar:3.2,tac:3.0,pac:3,pos:2.1,str:1.3,cro:1.7,wor:1.5,hea:.7},
 DR:{mar:3.2,tac:3.0,pac:3,pos:2.1,str:1.3,cro:1.7,wor:1.5,hea:.7},
 DMC:{tac:3.2,mar:2.4,pos:2.4, pas:2.7,wor:2.4,str:1.8,pac:1.7,tec:1.2},
 DML:{tac:2.3,mar:2,pos:2,pas:2,cro:2,pac:3,wor:2.2,tec:1.7},
 DMR:{tac:2.3,mar:2,pos:2,pas:2,cro:2,pac:3,wor:2.2,tec:1.7},
 MC:{pas:3.7,tec:3.3,wor:2.8,pos:2.6,fin:1.5,pac:1.4,mar:1,sta:1.2},
 ML:{pac:3.6,cro:3.6,tec:2.6,pas:2,wor:2,pos:1.7,fin:1.5},
 MR:{pac:3.6,cro:3.6,tec:2.6,pas:2,wor:2,pos:1.7,fin:1.5},
 OMC:{pas:3.5,tec:3.7,fin:2.8,wor:2.2,pos:1.8,lon:1.8,pac:1.7},
 OML:{pac:3.9,cro:3.0,tec:3.2,fin:2.8,pas:1.8,wor:1.6},
 OMR:{pac:3.9,cro:3.0,tec:3.2,fin:2.8,pas:1.8,wor:1.6},
 F:{fin:4.5,hea:3.2,tec:2.7,lon:2.8,pos:2,pac:2,str:1.7}
};
export const POSITIONS = Object.keys(SHAPE);
export const FORMATIONS = {
 '4-3-3':['GK','DL','DC','DC','DR','DMC','MC','MC','OML','OMR','F'],
 '4-2-3-1':['GK','DL','DC','DC','DR','DMC','DMC','OML','OMC','OMR','F'],
 '4-4-2':['GK','DL','DC','DC','DR','ML','MC','MC','MR','F','F'],
 '4-1-4-1':['GK','DL','DC','DC','DR','DMC','ML','MC','MC','MR','F'],
 '4-3-1-2':['GK','DL','DC','DC','DR','DMC','MC','MC','OMC','F','F'],
 '4-4-1-1':['GK','DL','DC','DC','DR','ML','MC','MC','MR','OMC','F'],
 '3-5-2':['GK','DC','DC','DC','DML','DMR','MC','MC','OMC','F','F'],
 '3-4-3':['GK','DC','DC','DC','ML','MC','MC','MR','OML','OMR','F'],
 '5-3-2':['GK','DL','DC','DC','DC','DR','DMC','MC','MC','F','F'],
 '4-2-2-2':['GK','DL','DC','DC','DR','DMC','DMC','OML','OMR','F','F']
};
const clamp = (n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function parsePositions(fp) {
 const out=new Set();
 for(const entry of String(fp||'').toUpperCase().split(',')) {
  const [p,s='']=entry.trim().split(/\s+/);
  if(!p)continue;
  for(const role of p.split('/')) {
   if(role==='GK'||role==='F') out.add(role);
   else if(['D','DM','M','OM'].includes(role)) {
    const prefix={D:'D',DM:'DM',M:'M',OM:'OM'}[role];
    for(const side of (s?s.split(''):['C'])) if('LCR'.includes(side)) out.add(prefix+side);
   } else if(POSITIONS.includes(role))out.add(role);
  }
 }
 return [...out];
}
export function normalizePlayer(raw,idx=0){
 if(!raw||typeof raw!=='object')return null;
 const name=String(raw.name||raw.nome||raw.player_name||'Jogador '+(idx+1)).replace(/<[^>]*>/g,'').trim().slice(0,95);
 const fp=String(raw.fp||raw.position||raw.posicao||raw.pos||'').trim().slice(0,60);
 const p={id:String(raw.id||raw.player_id||'rjp-'+idx),name,fp,age:Number(raw.age||raw.idade)||0,asi:Number(String(raw.asi??raw.si??'').replace(/[.,\s]/g,''))||0,rec:Number(raw.rec)||0,routine:Number(raw.routine??raw.rou??raw.rotina)||0,condition:raw.condition===undefined&&raw.cond===undefined?null:clamp(Number(raw.condition??raw.cond)||0,0,100),inj:raw.inj||raw.injury||'',ban:raw.ban||'',excluded:!!raw.excluded};
 for(const k of [...new Set([...OUT_SKILLS,...GK_SKILLS])]) {
  const value=raw[k]??raw.skills?.[k];p[k]=clamp(Number(value)||0,0,20);
 }
 // Verificação evita importar cartões HTML ou objetos sem os atributos efetivos.
 const gk=parsePositions(fp).includes('GK');
 const keys=gk?GK_SKILLS:OUT_SKILLS;
 if(!fp||!keys.some(k=>p[k]>0))return null;
 return p;
}
export function normalizeRoster(value){
 let arr=Array.isArray(value)?value : Array.isArray(value?.players)?value.players : Array.isArray(value?.players_ar)?value.players_ar : null;
 if(!arr)throw new Error('Formato inválido. Importa um array de jogadores ou um JSON com campo players / players_ar.');
 const output=arr.slice(0,160).map(normalizePlayer).filter(Boolean);
 if(!output.length)throw new Error('Não encontrei jogadores com posição (fp) e atributos numéricos.');
 return output;
}
export function rawScore(p,position){
 const w=SHAPE[position]; if(!w)return 0;
 const values=Object.entries(w);const sum=values.reduce((n,[sk,weight])=>n+Number(p[sk]||0)*weight,0);
 const max=values.reduce((n,[,weight])=>n+20*weight,0);
 return 100*sum/max;
}
function loc(pos){
 if(pos==='GK')return [0,0]; if(pos==='F')return [5,0];
 const m=/^(D|DM|M|OM)(L|C|R)$/.exec(pos);
 if(!m)return [3,0];
 return [{D:1,DM:2,M:3,OM:4}[m[1]],{L:-1,C:0,R:1}[m[2]]];
}
export function suitability(p,position){
 const positions=parsePositions(p.fp);
 if(position==='GK')return positions.includes('GK')?1:0;
 if(positions.includes('GK'))return 0;
 if(positions.includes(position))return 1;
 if(!positions.length)return .6;
 const [line,side]=loc(position);
 return clamp(Math.max(...positions.map(s=>{
  const [l,b]=loc(s);
  return 1-(Math.abs(l-line)*.14+Math.abs(b-side)*.13);
 })),.35,.94);
}
export function rating(p,position){
 if(!p||p.excluded||String(p.inj||'')!==''&&String(p.inj)!=='0'||(String(p.ban||'')!==''&&!['0','g'].includes(String(p.ban))))return 0;
 const fit=suitability(p,position);if(!fit)return 0;
 const routineBonus=.7*3*(1-Math.exp(-.035*Number(p.routine||0)));
 const conditioning=p.condition==null?1:0.60+0.40*(p.condition/100);
 return clamp((rawScore(p,position)+routineBonus)*fit*conditioning,0,100);
}
// Hungarian em matriz retangular: otimização global, 11 posições distintas sem jogadores repetidos.
export function maximumAssignment(scores){
 const n=scores.length,m=scores[0]?.length||0;
 if(!n||m<n)return null;
 const u=Array(n+1).fill(0),v=Array(m+1).fill(0),p=Array(m+1).fill(0),way=Array(m+1).fill(0);
 for(let i=1;i<=n;i++){
  p[0]=i;let j0=0;const minv=Array(m+1).fill(Infinity),used=Array(m+1).fill(false);
  do{used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;
   for(let j=1;j<=m;j++)if(!used[j]){
    const cur=-scores[i0-1][j-1]-u[i0]-v[j];
    if(cur<minv[j]){minv[j]=cur;way[j]=j0;}
    if(minv[j]<delta){delta=minv[j];j1=j;}
   }
   for(let j=0;j<=m;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else minv[j]-=delta;
   j0=j1;
  }while(p[j0]!==0);
  do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
 }
 const ids=Array(n).fill(-1);for(let j=1;j<=m;j++)if(p[j])ids[p[j]-1]=j-1;
 return ids;
}
export function analyzeFormation(roster,name){
 const positions=FORMATIONS[name];if(!positions)return null;
 const candidates=roster.filter(p=>!p.excluded&&!(p.inj&&String(p.inj)!=='0')&&(!p.ban||p.ban==='0'||p.ban==='g'));
 if(candidates.length<11)return null;
 const mat=positions.map(pos=>candidates.map(p=>rating(p,pos)));
 const assignment=maximumAssignment(mat);if(!assignment)return null;
 const starters=assignment.map((i,j)=>({position:positions[j],player:candidates[i],score:mat[j][i]}));
 if(starters.some(s=>s.score<=0))return null;
 const sum=starters.reduce((acc,s)=>acc+s.score,0);
 const average=sum/11;
 const gaps=starters.filter(s=>s.score<55||suitability(s.player,s.position)<.7);
 return {name,starters,average,total:sum,gaps};
}
export function compareFormations(roster){return Object.keys(FORMATIONS).map(f=>analyzeFormation(roster,f)).filter(Boolean).sort((a,b)=>b.average-a.average);}
export function rankByPosition(roster,position){return roster.map(player=>({player,score:rating(player,position),base:rawScore(player,position),adapt:suitability(player,position)})).sort((a,b)=>b.score-a.score);}
function avg(rows,skills){let sum=0,n=0;for(const p of rows)for(const k of skills){sum+=p[k]||0;n++;}return n?sum/n/20*100:0;}
export function styleAdvice(lineup){
 if(!lineup)return [];
 const picked=lineup.starters;const atk=picked.filter(s=>['F','OMC','OML','OMR','ML','MR'].includes(s.position)).map(s=>s.player);
 const mid=picked.filter(s=>['MC','DMC','OMC','ML','MR'].includes(s.position)).map(s=>s.player);
 const all=picked.map(s=>s.player),strikers=picked.filter(s=>s.position==='F').map(s=>s.player);
 const wings=picked.filter(s=>['ML','MR','OML','OMR','DL','DR'].includes(s.position)).map(s=>s.player);
 const results=[
  {name:'Pelas alas',score:.56*avg(wings,['pac','cro','tec'])+.44*avg(strikers,['hea','fin']),detail:'Extremos/laterais rápidos, cruzamentos e jogo aéreo no ataque.'},
  {name:'Passe curto',score:.72*avg(mid,['pas','tec','wor','pos'])+.28*avg(atk,['tec','pas']),detail:'Qualidade de passe, técnica e ligação entre setores.'},
  {name:'Jogo direto',score:.55*avg(strikers,['str','hea','pos','fin'])+.45*avg(all,['pas','pac']),detail:'Referência ofensiva, força, bola aérea e progressão rápida.'},
  {name:'Remate exterior',score:.65*avg(mid,['lon','tec','pas'])+.35*avg(atk,['lon','fin']),detail:'Médios com remate de longe e capacidade de criar espaço.'},
  {name:'Transições rápidas',score:.57*avg(atk,['pac','fin','tec'])+.43*avg(mid,['tac','pas','wor']),detail:'Recuperação, velocidade e eficácia nas transições.'}
 ];
 return results.map(r=>({...r,score:Math.round(r.score*10)/10})).sort((a,b)=>b.score-a.score);
}
export function preferredMentality(lineup){
 if(!lineup)return 'Equilibrada';
 const starters=lineup.starters;
 const defense=starters.filter(s=>['DC','DL','DR','DMC'].includes(s.position)).map(s=>s.score);
 const attack=starters.filter(s=>['F','OMC','OML','OMR'].includes(s.position)).map(s=>s.score);
 if(!defense.length||!attack.length)return 'Equilibrada';
 const avgA=attack.reduce((a,b)=>a+b,0)/attack.length,avgD=defense.reduce((a,b)=>a+b,0)/defense.length;
 if(avgA-avgD>10)return 'Tendência ofensiva (a validar com adversário)';
 if(avgD-avgA>10)return 'Tendência prudente (a validar com adversário)';
 return 'Equilibrada';
}
