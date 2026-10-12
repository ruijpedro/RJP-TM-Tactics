import './style.css';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { demoPlayers } from './demo.js';
import { FORMATIONS,POSITIONS,LABELS,OUT_SKILLS,GK_SKILLS,normalizePlayer,normalizeRoster,compareFormations,analyzeFormation,rankByPosition,styleAdvice,preferredMentality,suitability,comparePlayersForPosition,suggestPositions,teamPositionSuggestions,POSITION_NAMES,parsePositions,combinedFormations,validateCustomFormation,positionsByLine,foreignStatus } from './analysis.js';
import { importText,downloadRoster } from './import.js';
import { LEVELS,trainingPlan,recruitmentProfile,marketShortlist } from './development.js';
import { emptyOpponent,normalizeOpponentGame,normalizeOpponent,scoutNextMatch,OPPONENT_STYLES,OPPONENT_MENTALITIES,ATTACK_DIRECTIONS } from './opponent.js';
import { parsePreviewCapture } from './preview.js';
import {predictRival,compareWithRival,rivalGamePlan} from './rival.js';
import {playerSnapshot,mergeSnapshot,snapshotsFor,progressionReport,sanitizeHistory} from './progression.js';
const STORAGE='rjp_tm_tactics_v1';
const TMBridge=registerPlugin('TMBridge');
let db;
try{db=JSON.parse(localStorage.getItem(STORAGE)||'null');}catch{}
if(!db||!Array.isArray(db.players))db={players:demoPlayers,demo:true,updated:null,club:'',formations:[]};
if(!Array.isArray(db.formations))db.formations=[];
if(!('clubCountry' in db))db.clubCountry='';
if(!('maxForeigners' in db))db.maxForeigners=5;
if(!('quotaScope' in db))db.quotaScope='convocados';
if(!db.opponent||typeof db.opponent!=='object'||!Array.isArray(db.opponent.matches))db.opponent=emptyOpponent();
if(!db.preview||typeof db.preview!=='object')db.preview=null;
if(!Array.isArray(db.rivalRoster))db.rivalRoster=[];
if(typeof db.rivalCountry!=='string')db.rivalCountry='';
if(!Array.isArray(db.progressHistory))db.progressHistory=[];
db.progressHistory=sanitizeHistory(db.progressHistory,new Set(db.players.map(p=>p.id)));
const state={rivalCandidate:null,tab:'analise',formation:'auto',position:'DC',detail:null,edit:null,sort:'score',compareA:null,compareB:null,tacticDraft:null,tacticOrigin:null,devView:'treino',devPlayer:'',devRole:'auto',devPosition:'DC',devLevel:'competitivo'};
const $=id=>document.getElementById(id);
const isNative=Capacitor.isNativePlatform();
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n||0).toFixed(1).replace('.',',');
const capScore=n=>n>=75?'excellent':n>=60?'good':n>=45?'medium':'bad';
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(db));}catch(e){notify('Sem espaço para gravar o plantel. Exporta um backup.',true);}}
function notify(message,error=false){const t=$('toast');if(!t)return;t.textContent=message;t.className='toast '+(error?'error':'');clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.className='toast hidden',4800);}
function render(){
 const quotaOptions={maxForeigners:db.maxForeigners,clubCountry:db.clubCountry};
 const result=compareFormations(db.players,db.formations,quotaOptions);let selection=result[0]||null;
 if(state.formation!=='auto')selection=result.find(r=>r.name===state.formation)||selection;
 $('app').innerHTML=`
 <header class="topbar"><div class="brand"><img src="./icons/icon.svg" alt=""/><div><strong>RJP TM <em>TACTICS</em></strong><small>ASSISTENTE DE TREINADOR · V1.8.0</small></div></div><button class="top-action" data-action="openTM" title="Abrir Trophy Manager">↗ <span>Jogar TM</span></button></header>
 <main class="main">
  <section class="topnote ${db.demo?'demo':'real'}"><span class="dot"></span>${db.demo?'MODO DEMONSTRAÇÃO — 23 jogadores fictícios':safe(db.club||'PLANTEL IMPORTADO')+' · '+db.players.length+' jogadores'}<span class="small">${db.demo?'Importa o teu plantel real para obter recomendações úteis.':db.updated?'Atualizado '+new Date(db.updated).toLocaleString('pt-PT'):''}</span></section>
  ${state.tab==='analise'?renderAnalysis(selection,result):state.tab==='plantel'?renderSquad():state.tab==='comparar'?renderCompare():state.tab==='taticas'?renderTactics():state.tab==='desenvolver'?renderDevelopment():state.tab==='adversario'?renderOpponent(result):state.tab==='importar'?renderImport():renderSettings()}
 </main>
 <nav class="bottom-nav" aria-label="Menu"><button class="${state.tab==='analise'?'active':''}" data-tab="analise"><b>▦</b>Análise</button><button class="${state.tab==='plantel'?'active':''}" data-tab="plantel"><b>♟</b>Plantel</button><button class="${state.tab==='comparar'?'active':''}" data-tab="comparar"><b>⇄</b>Comparar</button><button class="${state.tab==='taticas'?'active':''}" data-tab="taticas"><b>▤</b>Táticas</button><button class="${state.tab==='desenvolver'?'active':''}" data-tab="desenvolver"><b>↗</b>Treino +</button><button class="${state.tab==='adversario'?'active':''}" data-tab="adversario"><b>◉</b>Adversário</button><button class="${state.tab==='importar'?'active':''}" data-tab="importar"><b>⇩</b>Importar</button><button class="${state.tab==='definicoes'?'active':''}" data-tab="definicoes"><b>⚙</b>Opções</button></nav>
 <div id="toast" class="toast hidden" role="status"></div>
 ${state.detail?renderDetails():''}
 ${state.edit?renderEdit():''}
 `;
 bindInputFile();
 bindOpponentFile();
}
function badge(n){return `<span class="value ${capScore(n)}">${num(n)}</span>`;}
function renderAnalysis(selected,all){
 if(!selected)return `<section class="panel"><h1>Não foi possível formar onze elegível</h1><p>Para calcular o melhor onze precisas de, pelo menos, 11 jogadores disponíveis, incluindo um guarda-redes e posições compatíveis.</p><button class="btn primary" data-tab="importar">Importar plantel</button><button class="btn" data-tab="plantel">Rever jogadores</button><button class="btn primary" data-action="newTactic">Criar tática personalizada</button></section>`;
 const bench=selected.bench||[];
 const unknown=db.players.filter(p=>foreignStatus(p,db.clubCountry)===null).length;
 const advice=styleAdvice(selected);
 return `
 ${unknown?`<section class="panel quota-alert"><b>⚠ Nacionalidades por confirmar: ${unknown}</b><p>As recomendações são provisórias até completares a nacionalidade ou a classificação de cada jogador no separador Plantel. Não consideramos os desconhecidos como estrangeiros nesta simulação.</p><button class="btn" data-tab="plantel">Classificar jogadores →</button></section>`:''}
 <section class="hero"><div class="eyebrow">MOTOR DE DECISÃO · NÃO OFICIAL TM</div><h1>O teu melhor <span>onze</span></h1><p>Comparação de ${all.length} formações, com atribuição global dos jogadores a cada posição.</p><div class="hero-stats"><div><small>Formação recomendada</small><strong>${safe(all[0].name)}</strong></div><div><small>Índice da formação</small><strong>${num(all[0].average)} <sup>/100</sup></strong></div><div><small>Disponíveis</small><strong>${db.players.filter(p=>!p.excluded&&!p.inj&&(!p.ban||p.ban==='g')).length}</strong></div></div></section>
 <section class="panel"><div class="section-head"><div><h2>Onze ideal</h2><p>Otimização por qualidade, adaptação, rotina, condição e limite de estrangeiros</p></div></div>
  <label class="form-label" for="formationChoice">Formação a analisar</label><select id="formationChoice" class="select"><option value="auto" ${state.formation==='auto'?'selected':''}>✨ Melhor formação automática</option>${all.map(a=>`<option value="${safe(a.name)}" ${state.formation===a.name?'selected':''}>${safe(a.name)} · ${num(a.average)}</option>`).join('')}</select><div class="row-buttons tactics-cta"><button class="btn primary" data-action="newTactic">＋ Criar tática livre</button><button class="btn" data-tab="taticas">Gerir táticas guardadas</button></div>
  <div class="field"><div class="field-lines"><i></i><i></i><i></i></div>${renderPitch(selected.starters)}</div>
  <div class="scoreline"><span>Rendimento estimado: ${badge(selected.average)}</span><span>${selected.gaps.length?'⚠ '+selected.gaps.length+' posições a melhorar':'✓ Cobertura equilibrada'}</span></div>
  <p class="quota-counter">🌍 ${selected.foreignCount} / ${db.maxForeigners} estrangeiros nos ${selected.starters.length+selected.bench.length} convocados${selected.unknownCount?' · '+selected.unknownCount+' por classificar':''}. <small>Regra de equipa configurável nas Opções.</small></p>
  <div class="tiny">A posição indicada é a da formação, não necessariamente a posição favorita do jogador. Os valores são estimativas próprias, não ratings oficiais.</div>
 </section>
 <section class="gridpanels"><section class="panel"><div class="section-head"><h2>Melhores formações</h2></div><div class="formation-list">${all.slice(0,6).map((r,i)=>`<button data-form="${safe(r.name)}" class="formation-row ${selected.name===r.name?'chosen':''}"><span class="place">${i+1}º</span><strong>${safe(r.name)}</strong><div class="progress"><i style="width:${r.average}%"></i></div>${badge(r.average)}</button>`).join('')}</div></section>
 <section class="panel"><div class="section-head"><h2>Estilo sugerido</h2></div><p class="muted">Adequação ao perfil dos titulares (não é uma previsão do motor TM).</p><div class="styles-list">${advice.map((a,i)=>`<div class="style-row"><div><strong>${i===0?'★ ':''}${safe(a.name)}</strong><small>${safe(a.detail)}</small></div>${badge(a.score)}</div>`).join('')}</div><p class="tip">Mentalidade inicial: <b>${safe(preferredMentality(selected))}</b>. Confirma com a força e estilo do adversário.</p></section></section>
 <section class="panel"><div class="section-head"><h2>Decisões do treinador</h2></div>
  ${selected.gaps.length?`<p>Posições com maior margem de melhoria:</p><div class="issue-list">${selected.gaps.map(s=>`<div class="issue"><span>⚠ ${safe(s.position)}</span><div><strong>${safe(s.player.name)}</strong><small>Índice ${num(s.score)} · adequação ${Math.round(suitability(s.player,s.position)*100)}%</small></div></div>`).join('')}</div>`:'<p>Não se destacam posições abaixo do limiar indicativo de 55 pontos com esta formação.</p>'}
  <h3>Possíveis mudanças de posição</h3>
  ${renderChangeSummary()}
  <button class="btn" data-tab="comparar">Comparar jogadores e posições →</button><button class="btn primary" data-tab="adversario">◉ Analisar próximo adversário →</button>
  <h3>Banco proposto (até 5 jogadores)</h3><div class="bench">${bench.map(s=>`<button class="mini-player" data-player="${safe(s.player.id)}"><span>${safe(s.player.name)}</span><small>${safe(s.position)} · ${foreignStatus(s.player,db.clubCountry)===true?"Estrangeiro":"Nacional / por confirmar"}</small></button>`).join('')||'<span>Sem suplentes disponíveis.</span>'}</div>
 </section>`;
}
/** Editor completo de 10 posições de campo; alterações são locais até Guardar. */
function newDraft(f=null){return {name:f?.name||'Minha 3-2-3-1-1',positions:f?[...f.positions]:[...FORMATIONS['3-2-3-1-1']]};}
function tacticSummary(positions){const t=positionsByLine(positions);return `${t.D} defesas · ${t.DM} médios defensivos · ${t.M} médios · ${t.OM} médios ofensivos · ${t.F} avançados`;}
function renderDraftPitch(positions){
 const s=positions.map((position,i)=>({position,player:{id:`_draft_${i}`,name:`Jogador ${i}`},score:0}));
 return `<div class="field tactic-pitch"><div class="field-lines"><i></i><i></i><i></i></div>${s.map((slot,i)=>{
  const pt=pitchCoordinates(s)[i];return `<span class="pitch-player draft-slot" style="left:${pt.x}%;top:${pt.y}%"><strong>${i===0?'GR':String(i).padStart(2,'0')}</strong><span class="pitch-pos">${safe(slot.position)}</span></span>`;
 }).join('')}</div>`;
}
function renderTactics(){
 const defs=combinedFormations(db.formations),custom=db.formations;
 const draft=state.tacticDraft;
 return `<section class="panel"><div class="section-head"><div><h1>Táticas personalizadas</h1><p>Cria e guarda qualquer esquema com 1 GR + 10 jogadores de campo.</p></div><button class="btn primary" data-action="newTactic">＋ Nova</button></div>
 <div class="tactic-shortcut"><strong>O teu exemplo: 3-2-3-1-1</strong><small>3 defesas + 2 médios defensivos + 3 médios + 1 médio ofensivo + 1 avançado (e guarda-redes).</small><div class="row-buttons"><button class="btn" data-action="useExample">Usar esta formação</button><button class="btn" data-action="copyExample">Personalizar o exemplo</button></div></div>
 <h2>As minhas táticas <span class="muted">(${custom.length})</span></h2>
 ${custom.length?`<div class="saved-tactics">${custom.map(f=>`<div class="saved-tactic"><div><strong>${safe(f.name)}</strong><small>${safe(tacticSummary(f.positions))}</small></div><div class="row-buttons"><button class="btn tinybtn" data-action="useTactic" data-name="${safe(f.name)}">Analisar</button><button class="btn tinybtn" data-action="editTactic" data-name="${safe(f.name)}">Editar</button><button class="btn tinybtn danger" data-action="deleteTactic" data-name="${safe(f.name)}">Apagar</button></div></div>`).join('')}</div>`:'<p class="muted">Ainda não criaste nenhuma tática. Começa pelo exemplo ou cria a tua.</p>'}
 <div class="row-buttons"><button class="btn" data-action="exportTactics">Exportar táticas (backup)</button><label class="btn upload">Importar táticas <input id="tacticsImportFile" type="file" accept=".json,application/json" hidden /></label></div>
 </section>
 ${draft?`<section class="panel"><div class="section-head"><h2>${state.tacticOrigin?'Editar':'Criar'} tática</h2><button class="btn tinybtn" data-action="cancelTactic">Cancelar</button></div>
 <label class="form-label" for="tacticName">Nome da tática</label><input type="text" id="tacticName" maxlength="45" value="${safe(draft.name)}" placeholder="Ex.: 3-2-3-1-1 ofensivo" />
 <p class="info">O guarda-redes é fixo. Podes escolher livremente as outras 10 posições, incluindo repetições, desde que o esquema faça sentido no TM. Nenhuma alteração é enviada ao jogo.</p>
 <div class="tactic-editor-grid"><div><h3>Distribuição dos 10 jogadores</h3><div class="slot-list">${draft.positions.slice(1).map((pos,i)=>`<label class="slot-row"><span><strong>${i+1}</strong><small>${safe(POSITION_NAMES[pos]||pos)}</small></span><select data-tactic-slot="${i+1}" aria-label="Posição do jogador ${i+1}">${POSITIONS.filter(p=>p!=='GK').map(p=>`<option value="${p}" ${p===pos?'selected':''}>${p} — ${safe(POSITION_NAMES[p])}</option>`).join('')}</select></label>`).join('')}</div></div>
 <div><h3>Pré-visualização</h3>${renderDraftPitch(draft.positions)}<p class="tactic-summary">${safe(tacticSummary(draft.positions))}</p><p class="tiny">O campo apresenta a disposição por linhas. Podes misturar centrais, laterais e alas, incluindo posições repetidas.</p></div></div>
 <div class="row-buttons"><button class="btn primary" data-action="saveTactic">Guardar formação</button><button class="btn" data-action="testDraft">Analisar sem guardar</button></div></section>`:''}
 <section class="panel"><h2>Formações de origem</h2><div class="formation-list">${Object.keys(FORMATIONS).map(n=>`<button class="formation-row" data-action="copyBuiltIn" data-name="${safe(n)}"><strong>${safe(n)}</strong><span class="muted">${safe(tacticSummary(defs[n]))}</span><span>Personalizar →</span></button>`).join('')}</div></section>`;
}

function pitchCoordinates(starters){
 const indexes=new Map();const rows={};
 starters.forEach((s,i)=>{const k=s.position==='GK'?'GK':s.position==='F'?'F':s.position.startsWith('OM')?'OM':s.position.startsWith('DM')?'DM':s.position.startsWith('M')?'M':'D';(rows[k]||=[]).push(i);});
 Object.entries(rows).forEach(([k,arr])=>arr.forEach((i,n)=>indexes.set(i,{x:(n+1)*100/(arr.length+1),y:{GK:87,D:71,DM:55,M:42,OM:29,F:12}[k]})));
 return starters.map((_,i)=>indexes.get(i));
}
function renderPitch(starters){
 const coords=pitchCoordinates(starters);
 return starters.map((s,i)=>{const c=coords[i],n=s.player.name.split(/\s+/);const short=(n.length>1?n[0][0]+'. '+n[n.length-1]:n[0]);return `<button class="pitch-player ${capScore(s.score)}" style="left:${c.x}%;top:${c.y}%" data-player="${safe(s.player.id)}" title="${safe(s.player.name)}"><span class="pitch-score">${Math.round(s.score)}</span><span class="pitch-name">${safe(short)}</span><span class="pitch-pos">${safe(s.position)}</span></button>`;}).join('');
}
function renderSquad(){
 const rank=rankByPosition(db.players,state.position);
 return `<section class="panel"><div class="section-head"><div><h1>Plantel</h1><p>${db.players.length} jogadores · ordenação por posição</p></div><button class="btn tinybtn" data-action="add">+ Jogador</button></div><label for="roleChoice" class="form-label">Classificar jogadores para:</label><select class="select" id="roleChoice">${POSITIONS.map(p=>`<option value="${p}" ${state.position===p?'selected':''}>${p}</option>`).join('')}</select><div class="player-list">${rank.map((x,i)=>`<button class="player-row" data-player="${safe(x.player.id)}"><span class="row-num">${i+1}</span><div class="player-col"><b>${safe(x.player.name)}</b><small>${safe(x.player.fp)} · ${x.player.age||'?'} anos · ${foreignStatus(x.player,db.clubCountry)===true?"🌍 Estrangeiro":foreignStatus(x.player,db.clubCountry)===false?"Nacional":"⚠ País por confirmar"} · rotina ${x.player.routine}${x.player.inj?' · lesionado':''}</small></div><div class="player-score">${badge(x.score)}<small>adequação ${Math.round(x.adapt*100)}%</small></div></button>`).join('')}</div></section>`;
}
function renderChangeSummary(){
 const proposals=teamPositionSuggestions(db.players,{max:4});
 if(!proposals.length)return '<p class="tiny">Não foram identificadas alternativas posicionais com adequação suficiente.</p>';
 return `<div class="suggestion-list">${proposals.map(s=>`<button class="suggestion-row" data-action="inspectSuggestion" data-playerid="${safe(s.player.id)}"><div><b>${safe(s.player.name)}</b><small>${safe(s.from)} → ${safe(s.pos)} · ${safe(POSITION_NAMES[s.pos])}</small></div><span class="change-pill ${s.type==='mudanca'?'improve':'fallback'}">${s.type==='mudanca'?'+':''}${num(s.gain)}</span></button>`).join('')}</div><p class="tiny">Pontuações estimadas no modelo RJP. Valores negativos representam perda esperada face à melhor posição habitual, não uma melhoria.</p>`;
}
function renderCompare(){
 const options=POSITIONS.map(p=>`<option value="${p}" ${state.position===p?'selected':''}>${p} · ${safe(POSITION_NAMES[p])}</option>`).join('');
 const rank=rankByPosition(db.players,state.position).filter(x=>x.score>0);
 const eligible=rank.map(x=>x.player);
 let a=eligible.find(x=>x.id===state.compareA),b=eligible.find(x=>x.id===state.compareB);
 if(!a)a=eligible[0]||null;
 if(!b||a?.id===b.id)b=eligible.find(x=>x.id!==a?.id)||null;
 if(a)state.compareA=a.id;
 if(b)state.compareB=b.id;
 const selectPlayer=(id,control)=>`<label class="form-label" for="${control}">${control==='compareA'?'Jogador A':'Jogador B'}</label><select class="select" id="${control}">${eligible.map(p=>`<option value="${safe(p.id)}" ${p.id===id?'selected':''}>${safe(p.name)} · ${safe(p.fp)}</option>`).join('')}</select>`;
 const result=a&&b?comparePlayersForPosition(a,b,state.position):null;
 const proposals=teamPositionSuggestions(db.players,{max:12});
 return `<section class="panel"><h1>Comparar jogadores</h1><p>Escolhe a posição e dois jogadores. Os índices incluem atributos, adequação posicional, rotina e condição.</p>
 <label class="form-label" for="roleChoice">Posição a comparar</label><select class="select" id="roleChoice">${options}</select>
 ${eligible.length<2?'<p class="warning">São necessários pelo menos dois jogadores aptos nesta posição.</p>':`<div class="compare-pickers"><div>${selectPlayer(a.id,'compareA')}</div><div>${selectPlayer(b.id,'compareB')}</div></div>`}
 ${result?renderHeadToHead(result):''}</section>
 <section class="panel"><div class="section-head"><div><h2>Melhores para ${safe(state.position)}</h2><p>Ranking neste momento</p></div></div>
 <div class="player-list">${rank.slice(0,7).map((x,i)=>`<button class="player-row" data-player="${safe(x.player.id)}"><span class="row-num">${i+1}º</span><div class="player-col"><b>${safe(x.player.name)}</b><small>${safe(x.player.fp)} · adequação ${Math.round(x.adapt*100)}%</small></div>${badge(x.score)}</button>`).join('')||'<p>Sem jogadores disponíveis.</p>'}</div></section>
 <section class="panel"><div class="section-head"><h2>Propostas de mudança de posição</h2></div>
 <p>Alternativas calculadas por perfil técnico e distância à posição habitual. <b>“Melhoria”</b> significa índice superior; <b>“Alternativa”</b> pode reduzir o rendimento mas acrescentar flexibilidade.</p>
 ${proposals.length?`<div class="suggestion-list">${proposals.map(s=>`<button class="suggestion-row" data-action="inspectSuggestion" data-playerid="${safe(s.player.id)}"><div><b>${safe(s.player.name)}</b><small>${safe(s.from)} (${num(s.fromScore)}) → ${safe(s.pos)} (${num(s.score)}) · adequação ${Math.round(s.fit*100)}%</small><span class="reason">${safe(s.reason)}</span></div><span class="change-pill ${s.type==='mudanca'?'improve':'fallback'}">${s.gain>0?'+':''}${num(s.gain)}</span></button>`).join('')}</div>`:'<p>Não há alternativas suficientemente adequadas nos jogadores disponíveis.</p>'}
 <p class="tiny">Estas sugestões não modificam a ficha do TM nem substituem os resultados reais de jogos. Uma posição tática diferente pode não ser aceite com igual eficácia pelo motor do jogo.</p></section>`;
}
function renderHeadToHead(result){
 const {a,b,aScore,bScore,delta,skills}=result;
 const winner=result.winner;
 return `<div class="compare-summary"><div class="compare-person ${winner?.id===a.id?'compare-winner':''}"><small>Jogador A</small><b>${safe(a.name)}</b>${badge(aScore)}<small>Adaptação ${Math.round(result.aFit*100)}% · base ${num(result.aBase)}</small></div><div class="versus">VS</div><div class="compare-person ${winner?.id===b.id?'compare-winner':''}"><small>Jogador B</small><b>${safe(b.name)}</b>${badge(bScore)}<small>Adaptação ${Math.round(result.bFit*100)}% · base ${num(result.bBase)}</small></div></div>
 <p class="comparison-verdict">${winner?`<b>${safe(winner.name)}</b> tem vantagem estimada de <b>${num(Math.abs(delta))} pontos</b> para ${safe(POSITION_NAMES[result.position])}.`:'Os dois apresentam exatamente o mesmo índice nesta posição.'}</p>
 <h3>Atributos mais relevantes nesta posição</h3><div class="skill-compare-head"><span>${safe(a.name)}</span><span>Atributo</span><span>${safe(b.name)}</span></div><div class="skill-comparison">${skills.slice(0,9).map(sk=>`<div class="skill-comparison-row"><b class="${sk.delta>0?'stat-lead':''}">${sk.a}</b><span>${safe(sk.label)}</span><b class="${sk.delta<0?'stat-lead':''}">${sk.b}</b></div>`).join('')}</div><p class="tiny">A vantagem global inclui posição, rotina e condição. Os atributos estão na escala original 0–20.</p>`;
}
function renderImport(){return `<section class="panel"><h1>Importar plantel</h1><p>Na <b>APK Android</b>, podes abrir o TM dentro da aplicação e recolher os jogadores da página <b>Plantel → Jogadores</b>, mediante toque no botão de importação.</p><button class="btn primary full" data-action="openTM">↗ Abrir Trophy Manager ${isNative?'na APP':'no navegador'}</button><p class="info">${isNative?'No navegador integrado fazes login no TM uma vez. A sessão é independente do Edge. Na página do plantel toca em “Importar plantel”.':'Na versão Web, usa um ficheiro JSON/CSV exportado ou introduz os jogadores manualmente. Não é possível ler a sessão privada do Edge a partir desta página.'}</p></section>
 <section class="panel"><h2>Ficheiro JSON ou CSV</h2><p>Aceita campos TM como <code>id,name,fp,age,asi,rec,routine,str,sta,pac,mar,tac,...</code> (guarda-redes: <code>han,one,ref,ari,jum,com,kic,thr</code>).</p><label class="btn secondary full upload">⇩ Selecionar ficheiro <input type="file" id="importFile" accept=".json,.csv,application/json,text/csv" hidden /></label><label class="form-label" for="jsonInput">Ou cola aqui JSON com <code>players_ar</code> ou um array de jogadores</label><textarea id="jsonInput" rows="5" placeholder='{"players":[{"name":"Exemplo","fp":"M C","pas":14,"tec":15,"wor":13}]}'></textarea><button class="btn" data-action="pasteImport">Analisar texto colado</button></section>
 <section class="panel"><h2>Outras opções</h2><div class="row-buttons"><button class="btn" data-action="add">+ Introduzir jogador</button><button class="btn" data-action="empty">Novo plantel vazio</button><button class="btn" data-action="export">⇧ Guardar backup</button></div><p class="tiny">Dados tratados e guardados no dispositivo. Sem servidor próprio, automações de jogo ou recolha de palavras-passe.</p></section>`;}
/** Treino individual e checklist de mercado: apenas recomendações. */
function renderDevelopment(){
 const view=state.devView;
 const levels=Object.entries(LEVELS).map(([key,value])=>`<option value="${key}" ${state.devLevel===key?'selected':''}>${key==='base'?'Base':key==='competitivo'?'Competitivo':'Elevado'} · alvo ${value}/20</option>`).join('');
 const common=`<section class="panel"><div class="section-head"><div><h1>Desenvolvimento e contratações</h1><p>Recomendações específicas para o teu plantel e para o mercado TM.</p></div></div><div class="dev-tabs"><button class="btn ${view==='treino'?'primary':''}" data-action="devTraining">Treino por jogador</button><button class="btn ${view==='mercado'?'primary':''}" data-action="devMarket">Perfil de contratação</button><button class="btn ${view==='estrelas'?'primary':''}" data-action="devStars">★ Evolução de estrelas</button></div>${view==='estrelas'?'<p class="tiny">Estrelas gerais: referência REC; estrelas individuais: 19 (prata) e 20 (ouro).</p>':`<label class="form-label" for="devLevel">Nível de referência (não oficial)</label><select id="devLevel" class="select">${levels}</select><p class="tiny">Valores de referência à tua escolha, não requisitos ou limites definidos pelo Trophy Manager. Os atributos do TM são de 1 a 20.</p>`}</section>`;
 return common+(view==='treino'?renderTrainingView():view==='estrelas'?renderProgressionView():renderMarketView());
}
function renderTrainingView(){
 if(!db.players.length)return '<section class="panel"><p>Importa primeiro o teu plantel para obter recomendações de treino.</p><button class="btn primary" data-tab="importar">Importar</button></section>';
 let player=db.players.find(p=>p.id===state.devPlayer)||db.players[0];
 if(!state.devPlayer)state.devPlayer=player.id;
 const choices=db.players.map(p=>`<option value="${safe(p.id)}" ${player.id===p.id?'selected':''}>${safe(p.name)} — ${safe(p.fp)}</option>`).join('');
 const provisional=trainingPlan(player);
 const role=state.devRole==='auto'?provisional.bestNatural:state.devRole;
 const plan=trainingPlan(player,role,state.devLevel);
 const posOptions=`<option value="auto" ${state.devRole==='auto'?'selected':''}>Automática: melhor posição estimada (${safe(provisional.bestNatural)})</option>`+POSITIONS.filter(r=>r==='GK' ? player.fp==='GK' : player.fp!=='GK').map(r=>`<option value="${r}" ${state.devRole===r?'selected':''}>${r} · ${safe(POSITION_NAMES[r])}</option>`).join('');
 const row=p=>`<div class="dev-skill-row"><div class="dev-skill-top"><b>${safe(p.label)}</b><span>${p.value===null?'sem dados':`${p.value} / 20`}${p.value!==null?` · alvo ${p.target}`:''}</span></div><div class="dev-meter"><span style="width:${p.value===null?0:p.value*5}%"></span><i style="left:${p.target*5}%"></i></div><small>${safe(p.category)} · ${p.value===null?'não foi recebido este atributo':p.gap?'faltam '+p.gap+' pontos para a meta de referência':'meta atingida'}</small></div>`;
 const proposals=plan.priorities.map((p,i)=>`<div class="dev-priority"><b>${i+1}. ${safe(p.label)}</b><span class="dev-weak">${p.value}/20 → ${p.target}/20</span><small>${safe(p.category)} · peso posicional ${Math.round(p.relativeImportance*100)}%</small></div>`).join('');
 return `<section class="panel"><h2>Plano de treino individual</h2><label class="form-label" for="devPlayer">Jogador</label><select class="select" id="devPlayer">${choices}</select><label class="form-label" for="devRole">Posição a preparar</label><select class="select" id="devRole">${posOptions}</select>
 <div class="dev-overview"><div><small>Posição analisada</small><strong>${safe(plan.positionName)} (${safe(plan.position)})</strong></div><div><small>Índice estimado</small><strong>${num(plan.score)} / 100</strong></div></div>
 ${plan.priorities.length?`<h3>O que treinar primeiro?</h3><div class="dev-priorities">${proposals}</div>`:`<p class="info">Não foram encontrados défices prioritários face à meta escolhida ${plan.missingSkills.length?'nos atributos disponíveis':''}.</p>`}
 ${plan.groups.length?`<p class="tip"><b>Áreas de treino mais úteis:</b> ${plan.groups.slice(0,3).map(g=>safe(g.name)).join(' → ')}. Confirma no TM quais os grupos de treino que trabalham cada atributo.</p>`:''}
 ${plan.missingSkills.length?`<p class="warning">Há ${plan.missingSkills.length} atributos sem dados. Valores zero ou ausentes não são tratados como fraqueza: importa a ficha completa para os avaliar.</p>`:''}
 <h3>Todos os atributos relevantes para ${safe(plan.position)}</h3><div class="dev-skill-grid">${plan.skills.map(row).join('')}</div><p class="tiny">${safe(plan.ageNote)} O ranking de prioridades combina a importância de cada atributo com a diferença para a meta escolhida. Não existe alteração automática de treino no TM.</p>
 <div class="row-buttons"><button class="btn" data-action="viewPlayerDevelopment" data-playerid="${safe(player.id)}">Ficha do jogador</button><button class="btn" data-action="devMarket" data-pos="${safe(plan.position)}">Procurar reforço nesta posição →</button></div></section>`;
}
/** Estimativas só com observações datadas do próprio jogador; sem regressão sobre valores inventados. */
function renderProgressionView(){
 if(!db.players.length)return '<section class="panel"><p>Importa o plantel para começar a guardar a evolução semanal.</p><button class="btn primary" data-tab="importar">Importar plantel</button></section>';
 const player=db.players.find(p=>p.id===state.devPlayer)||db.players[0];
 if(!state.devPlayer)state.devPlayer=player.id;
 const choices=db.players.map(p=>`<option value="${safe(p.id)}" ${player.id===p.id?'selected':''}>${safe(p.name)} — ${safe(p.fp)}</option>`).join('');
 const report=progressionReport(player,db.progressHistory);
 const samples=report.observations;
 const last=samples.at(-1);
 const fmtRec=v=>v==null?'Não disponível':num(v)+' / 10';
 const forecast=f=>f?.status==='estimated'?`<b>${safe(f.text)}</b> <small>Confiança ${safe(f.confidence)} · apenas referência, não data garantida.</small>`:`<span class="muted">${safe(f?.text||'Sem próximo patamar.')}</span>`;
 const overall=report.overall==null?'<p>REC não disponível no plantel importado. Ainda não é possível calcular estrelas gerais.</p>':`<div class="star-overall"><span class="star-giant">★ ${num(report.overall)} / 5</span><small>REC atual ${fmtRec(report.rec)} · conversão comunitária (REC ÷ 2, arredondado de 0,5 em 0,5).</small></div>${report.milestone?`<div class="star-next"><b>Próximo patamar: ${num(report.milestone.stars)} ★</b><small>Limiar estimado de REC: ${num(report.milestone.rec)} / 10</small><p>${forecast(report.overallForecast)}</p>${report.wholeMilestone&&report.wholeMilestone.stars!==report.milestone.stars?`<p class="star-full-note"><b>Próxima estrela inteira: ${num(report.wholeMilestone.stars)} ★</b><br> Limiar REC ${num(report.wholeMilestone.rec)} · ${forecast(report.wholeForecast)}</p>`:''}</div>`:'<p class="tip">Classificação máxima na escala de referência.</p>'}`;
 const skillRows=report.skills.map(s=>`<div class="star-skill"><div class="star-skill-title"><b>${safe(s.label)}</b><span>${s.value==null?'?':s.value}/20</span></div><div class="star-skill-footer"><span class="skill-medal ${s.level==='ouro'?'gold':s.level==='prata'?'silver':''}">${s.level==='ouro'?'★ Ouro (20)':s.level==='prata'?'☆ Prata (19)':'Sem estrela individual'}</span>${s.target?`<small>Próximo objetivo: ${s.target===19?'19 · prata':'20 · ouro'}</small>`:''}</div>${s.forecast?.status==='estimated'?`<small class="star-forecast">${safe(s.forecast.text)} · confiança ${safe(s.forecast.confidence)}</small>`:s.target?`<small class="muted">${safe(s.forecast?.text||'Sem histórico suficiente.')}</small>`:''}</div>`).join('');
 const historyRows=samples.slice(-12).reverse().map(s=>`<div class="star-history-row"><span>${safe(s.date)}</span><span>REC ${fmtRec(s.rec)}</span><span>ASI ${s.asi==null?'—':Number(s.asi).toLocaleString('pt-PT')}</span></div>`).join('');
 const today=new Date().toISOString().slice(0,10);
 return `<section class="panel"><h2>★ Evolução de estrelas</h2><p>Esta área acompanha a <b>classificação geral</b> e os atributos com <b>estrela prateada (19)</b> ou <b>dourada (20)</b>. Os critérios de classificação são referências comunitárias, não fórmulas oficiais do jogo.</p>
 <label class="form-label" for="devPlayer">Jogador a acompanhar</label><select id="devPlayer" class="select">${choices}</select>
 <div class="star-overview"><div><small>Posição mais forte estimada</small><b>${safe(report.role)}</b></div><div><small>Registos guardados</small><b>${samples.length}</b></div></div>
 <h3>1. Estrelas gerais (REC)</h3>${overall}
 <h3>2. Estrelas nos atributos</h3><p class="tiny">Os atributos mais relevantes aparecem primeiro, mas são acompanhados todos os atributos da posição. O progresso fracionário é invisível, por isso uma subida de 18 para 19, ou de 19 para 20, não tem data exata previsível.</p>
 <div class="star-skills">${skillRows}</div>
 <h3>3. Histórico semanal</h3><p>Reimporta o plantel depois dos treinos: a APP guarda automaticamente uma observação por dia. Também podes registar uma observação manual a partir dos atributos atualmente carregados.</p>
 <div class="row-buttons"><label class="form-label">Data da observação<input type="date" id="progressDate" value="${today}" max="${today}" /></label><button class="btn primary" data-action="saveProgress">Guardar observação</button></div>
 ${historyRows?`<div class="star-history">${historyRows}</div>`:'<p class="info">Ainda não há histórico. Guarda a primeira observação e volta a importar os dados após a próxima sessão de treino.</p>'}
 <div class="row-buttons"><button class="btn" data-action="backupFull">⇧ Backup completo com histórico</button><button class="btn" data-tab="importar">⇩ Reimportar plantel</button></div>
 <p class="tiny">Previsões apenas indicativas, com janelas largas, quando há crescimento registado em semanas diferentes. Idade, bloom, potencial, escolha de treino, treinadores e instalações podem alterar o ritmo. Não existe ligação automática aos treinos no TM.</p></section>`;
}
function renderMarketView(){
 const position=POSITIONS.includes(state.devPosition)?state.devPosition:'DC';
 const r=recruitmentProfile(db.players,position,state.devLevel);
 const options=POSITIONS.map(p=>`<option value="${p}" ${p===position?'selected':''}>${p} · ${safe(POSITION_NAMES[p])}</option>`).join('');
 const skills=(list)=>list.map((sk,i)=>`<div class="market-skill"><span><b>${safe(sk.label)}</b><small>Prioridade ${i+1}</small></span><span class="target-num">≥ ${sk.min}/20</span></div>`).join('');
 const shortlist=marketShortlist(db.players,position,state.devLevel);
 return `<section class="panel"><h2>O que procurar ao comprar?</h2><label class="form-label" for="devPosition">Posição pretendida</label><select class="select" id="devPosition">${options}</select><p>Perfil recomendado de <b>${safe(r.positionName)}</b>. Os mínimos abaixo são exemplos de filtro para o mercado baseados no nível de referência escolhido. Podes preferir um jogador com alguns atributos abaixo da meta mas com maior qualidade global.</p>
 <div class="market-two"><div><h3>Atributos indispensáveis</h3><div class="market-list">${skills(r.mandatory)}</div></div><div><h3>Atributos de apoio</h3><div class="market-list">${skills(r.secondary)}</div></div></div>
 <h3>Verificações antes de contratar</h3><div class="dev-checks">${r.notes.map((n,i)=>`<label><input type="checkbox" />${safe(n)}</label>`).join('')}</div>
 <p class="tiny">As caixas são uma lista de verificação visual e não guardam decisões de compra. A aplicação não faz licitações nem altera a equipa no TM.</p></section>
 <section class="panel"><h2>Comparar com os jogadores que já tens</h2>${r.best.length?`<p>Os teus melhores nesta posição são uma referência mais útil do que olhar só para o ASI de um jogador à venda.</p><div class="market-list">${r.best.map((b,i)=>`<div class="market-skill"><span><b>${i+1}º ${safe(b.name)}</b><small>${safe(b.fp)}</small></span>${badge(b.score)}</div>`).join('')}</div>`:'<p>Sem jogadores comparáveis no plantel. Importa ou introduz jogadores para obteres referências.</p>'}
 ${shortlist.length?`<h3>Áreas a melhorar nos atuais jogadores</h3>${shortlist.slice(0,3).map(x=>`<div class="market-skill"><span><b>${safe(x.player.name)}</b><small>${x.importantBelow.length?safe(x.importantBelow.slice(0,4).join(', ')):'Principais atributos dentro dos valores de referência'}</small></span>${badge(x.score)}</div>`).join('')}`:''}
 <button class="btn" data-action="devTraining" >Analisar treino dos jogadores →</button></section>`;
}
/** Observador: apenas dados fornecidos pelo treinador, sem recolha automática de perfis privados. */
function optionsHtml(values,current){return values.map(v=>`<option value="${safe(v)}" ${v===current?'selected':''}>${safe(v)}</option>`).join('');}
function renderPreviewPanel(){
 const p=db.preview;
 return `<section class="panel"><h2>📅 Calendário / Preview do próximo jogo</h2>
 <p>Abre o calendário do TM no navegador integrado, entra na antevisão do próximo jogo e toca em <b>⇩ Ler antevisão</b>. Não é necessário copiar dados manualmente quando a página permite a leitura.</p>
 <button class="btn primary full" data-action="openTMCalendar">↗ Abrir TM para consultar Calendário e Preview</button>
 <p class="tiny">${isNative?'A captura exige um toque teu no navegador integrado. O texto é analisado localmente; confirma sempre o adversário antes de gravar.':'Na WebApp, não podemos ler o Edge. Abre o preview no Edge, copia o texto e cola-o abaixo.'}</p>
 <label class="form-label" for="previewPaste">Importação alternativa: colar o texto da antevisão ou do calendário</label>
 <textarea id="previewPaste" rows="3" placeholder="Cola o texto visível do Preview do Trophy Manager..."></textarea>
 <button class="btn" data-action="parsePreviewText">Analisar texto colado</button>
 ${p?`<div class="preview-read"><h3>Informação capturada — por confirmar</h3>
 <p><b>Origem:</b> ${safe(p.title||'Página TM')} · <b>Identificação:</b> ${safe(p.confidence)}</p>
 ${p.indicators?.length?`<p><b>Referências encontradas:</b> ${p.indicators.map(x=>safe(x)).join(' • ')}</p>`:''}
 <form id="previewConfirmForm"><div class="form-grid"><label>Adversário<input name="name" maxlength="110" required value="${safe(p.opponent)}" placeholder="Confirma o nome no TM" /></label>
 <label>Data do jogo<input name="date" type="date" value="${safe(p.date)}" /></label>
 <label>Local<select name="venue">${optionsHtml(['desconhecido','casa','fora'],p.venue||'desconhecido')}</select></label></div>
 <label class="form-label">Observação do preview (facultativa)<input name="notes" maxlength="350" placeholder="Acrescenta apenas informações confirmadas" /></label>
 <button class="btn primary full" type="submit">✓ Confirmar adversário e preparar jogo</button>
 </form><details><summary>Ver trecho da página importada</summary><pre class="preview-raw">${safe(p.excerpt)}</pre></details>
 <p class="tiny">A captura não constitui prova das táticas recentes. Para propostas táticas com maior fundamento, importa também os últimos jogos do adversário.</p></div>`:''}
 </section>`;
}
function renderOpponent(formations){
 const op=db.opponent;
 const scout=scoutNextMatch(op,formations,'3-2-3-1-1');
 const t=scout.trends;
 const strongest=scout.choices[0];
 const recommend=scout.recommendation;
 const positions=(recommend?.formation.starters||[]).filter(s=>s.position!=='GK');
 const dangerous=op.notes.trim();
 const rival=predictRival(db.rivalRoster,op.matches,db.formations,{maxForeigners:db.maxForeigners,clubCountry:db.rivalCountry,preferredFormation:t.formations[0]?.name});
 const strengths=compareWithRival(recommend?.formation||formations[0],rival);
 const rivalPlan=rivalGamePlan(recommend?.formation||formations[0],rival,t);
 return `${renderPreviewPanel()}<section class="panel"><div class="section-head"><div><h1>◉ Observador de adversários</h1><p>Prepara o próximo jogo sem alterar nada no Trophy Manager.</p></div></div>
 <div class="opponent-summary"><div><small>Próximo adversário</small><strong>${safe(op.name)||'Ainda por definir'}</strong></div><div><small>Jogos analisados</small><strong>${t.n} / 15</strong></div><div><small>Confiança</small><strong>${safe(t.confidence)}</strong></div></div>
 <div class="form-grid"><label>Nome do adversário<input id="opponentName" maxlength="110" value="${safe(op.name)}" placeholder="Clube adversário" /></label><label>Data do próximo jogo<input id="opponentDate" type="date" value="${safe(op.date)}" /></label><label>O próximo jogo é<select id="opponentVenue">${optionsHtml(['casa','fora'],op.venue)}</select></label></div>
 <label class="form-label">Observações adicionais (ex.: jogador perigoso, ausências, ponto fraco)<textarea id="opponentNotes" rows="2" maxlength="350">${safe(op.notes)}</textarea></label>
 <p class="tiny">O preview pode identificar o próximo adversário; os últimos jogos continuam a exigir registos ou JSON. A APP nunca altera o TM automaticamente.</p>
 </section>
 <section class="panel"><h2>🔎 Previsão do onze adversário</h2>
 <p>Entra no clube adversário pelo navegador TM integrado e procura a página do plantel. Toca em <b>⇩ Plantel rival</b> para tentar importar os atributos públicos que essa página disponibilize. Caso não estejam acessíveis, podes importar um ficheiro JSON com os jogadores.</p>
 <button class="btn primary full" data-action="openTMRival">↗ Abrir TM e procurar o clube adversário</button>
 <div class="row-buttons"><label class="btn upload">⇩ Importar jogadores rivais JSON<input id="rivalImportFile" type="file" accept=".json,application/json" hidden /></label><button class="btn danger" data-action="clearRival">Limpar plantel rival</button></div>
 <label class="form-label">País do clube adversário (código TM, facultativo)<input id="rivalCountry" maxlength="12" value="${safe(db.rivalCountry)}" placeholder="pt" /></label>
 <p class="tiny">${db.rivalRoster.length} jogadores rivais importados · ${rival.history.games} jogos com nomes de titulares. A leitura de uma página pública depende do que o TM efetivamente mostra. Não acede a dados ocultos nem à sessão do Edge.</p>
 ${state.rivalCandidate?`<div class="preview-read"><h3>Confirmar plantel capturado</h3><p>Fonte: ${safe(state.rivalCandidate.url||'TM')} · ${state.rivalCandidate.players.length} jogadores. Confirma que estes jogadores pertencem a <b>${safe(op.name||'o clube adversário')}</b> e não ao teu clube.</p><div class="row-buttons"><button class="btn primary" data-action="acceptRival">Confirmar plantel rival</button><button class="btn" data-action="cancelRival">Cancelar</button></div></div>`:''}
 ${rival.probable?`<div class="opponent-result"><small>FORMAÇÃO PROVÁVEL · CONFIANÇA ${safe(rival.confidence)}</small><h2>${safe(rival.probable.formation)}</h2><p>Onze previsto: ${safe(rival.probable.starters.map(s=>s.player.name).join(' · '))}</p><p>Índice médio estimado: ${num(rival.probable.average)}/100. ${rival.theoretical?`Melhor formação teórica do plantel: ${safe(rival.theoretical.formation)} (${num(rival.theoretical.average)}/100).`:''}</p></div>
 <h3>Possíveis fragilidades</h3>${rival.weaknesses.length?rival.weaknesses.map(w=>`<div class="market-skill"><span><b>${safe(w.label)}</b><small>${safe(w.evidence)}</small></span></div>`).join(''):'<p>Sem diferenças suficientemente evidentes entre setores para destacar fraquezas.</p>'}
 ${strengths.length?`<h3>Comparação com o nosso onze</h3>${strengths.map(x=>`<p>• ${safe(x.line)}: ${safe(x.reason)} (diferença indicativa ${x.delta>0?'+':''}${num(x.delta)} pontos).</p>`).join('')}`:''}`:
 `<p><b>Ainda não é possível prever os nomes com atributos reais.</b> Importa pelo menos 11 jogadores adversários com posições e atributos, ou regista os titulares dos últimos jogos para obter uma lista de frequência.</p>`}
 ${rival.history.players.length?`<h3>Jogadores mais utilizados na amostra</h3><div class="market-list">${rival.history.players.slice(0,15).map(x=>`<div class="market-skill"><span><b>${safe(x.name)}</b></span><span>${x.count}/${rival.history.games} jogos</span></div>`).join('')}</div>`:''}
 ${rivalPlan.length?`<h3>Propostas para o nosso jogo</h3><div class="opponent-plan">${rivalPlan.map((plan,i)=>`<div><b>${i+1}. ${safe(plan.title)}</b><p>${safe(plan.text)}</p><small>${safe(plan.evidence)}</small></div>`).join('')}</div>`:''}
 ${rival.notes.length?`<div class="opponent-notes">${rival.notes.map(note=>`<p>• ${safe(note)}</p>`).join('')}</div>`:''}
 <p class="tiny">Se o país do rival ou a nacionalidade dos jogadores forem desconhecidos, a regra dos estrangeiros é apenas provisória. O onze e os pontos fracos são estimativas, nunca informação confirmada sobre as escolhas futuras do treinador. Todas as alterações são propostas e não são enviadas ao TM.</p></section>
 ${op.previewEvidence?.indicators?.length?`<section class="panel"><h2>Elementos do Preview importado</h2><p class="muted">Informações textuais capturadas da antevisão. Não significam necessariamente que o adversário usará essa tática.</p><div class="opponent-notes">${op.previewEvidence.indicators.map(x=>`<p>• ${safe(x)}</p>`).join('')}</div><p class="tiny">Confirma a que equipa pertencem estas informações. A decisão tática depende de outros dados observados.</p></section>`:''}
 <section class="panel"><h2>Relatório pré-jogo</h2>
 ${t.n?`<div class="opponent-summary"><div><small>Golos marcados</small><strong>${t.gf}</strong></div><div><small>Golos sofridos</small><strong>${t.ga}</strong></div><div><small>Ataques pelas alas</small><strong>${t.wingGames} / ${t.n}</strong></div></div>
 <div class="opponent-tendencies"><div><small>Formação frequente</small><strong>${safe(t.formations[0]?.name||'Não informada')}</strong></div><div><small>Estilo frequente</small><strong>${safe(t.styles[0]?.name||'Não informado')}</strong></div><div><small>Direção habitual</small><strong>${safe(t.directions[0]?.name||'Não informada')}</strong></div><div><small>Mentalidade habitual</small><strong>${safe(t.mentalities[0]?.name||'Não informada')}</strong></div></div>
 ${recommend?`<div class="opponent-result"><small>${scout.change?'MUDANÇA SUGERIDA':'PLANO A · MANTER COMO REFERÊNCIA'}</small><h2>${safe(recommend.formation.name)}</h2><p>${scout.change?`Em comparação com o teu 3-2-3-1-1, a alternativa apresenta vantagem heurística de ${num(scout.gain)} pontos para o adversário observado.`:'Não existem dados suficientes ou vantagem clara para justificar trocar o teu 3-2-3-1-1. Mantém o esquema habitual como referência.'}</p>
 <div class="row-buttons"><button class="btn primary" data-action="viewOpponentLineup" data-name="${safe(recommend.formation.name)}">Ver onze proposto</button><button class="btn" data-tab="taticas">Editar táticas</button></div></div>
 <div class="opponent-plan"><div><b>Plano A</b><p>${scout.change?'Considerar a formação alternativa indicada para melhorar a cobertura.':'Começar com o teu esquema habitual e acompanhar os primeiros minutos.'} ${scout.style?`Estilo compatível com o nosso plantel: ${safe(scout.style.name)}.`:''}</p></div><div><b>Plano B</b><p>${strongest&&strongest.formation.name!==recommend.formation.name?`Alternativa: ${safe(strongest.formation.name)}. `:''}Se estiveres a perder, reavalia a capacidade ofensiva antes de trocar jogadores; se estiveres a ganhar, protege as zonas mais pressionadas.</p></div></div>`:''}
 <h3>Observações e limites da análise</h3><div class="opponent-notes">${scout.notes.map(x=>`<p>• ${safe(x)}</p>`).join('')}</div>${dangerous?`<p><b>Nota do treinador:</b> ${safe(dangerous)}</p>`:''}
 <p class="tiny">As variações indicativas (máximo ±4 pontos) são ajustamentos próprios e NÃO representam probabilidades de vitória nem estatísticas oficiais TM. O limite de ${db.maxForeigners} estrangeiros é respeitado pela escolha de onze existente.</p>`:
 `<p><b>Proposta inicial:</b> mantém o 3-2-3-1-1 como referência, com o melhor onze disponível e o limite de cinco estrangeiros. O Preview confirma o próximo adversário, mas não demonstra por si só como jogou nos últimos encontros. Para recomendar mudar de sistema, regista ou importa os jogos anteriores.</p>`}
 </section>
 <section class="panel"><h2>Adicionar jogo observado</h2><form id="opponentGameForm"><div class="form-grid">
 <label>Data<input name="date" type="date" /></label><label>Formação do adversário<input name="formation" placeholder="4-3-3" maxlength="25" /></label>
 <label>Estilo de jogo<select name="style">${optionsHtml(OPPONENT_STYLES,'Desconhecido')}</select></label>
 <label>Mentalidade<select name="mentality">${optionsHtml(OPPONENT_MENTALITIES,'Desconhecida')}</select></label>
 <label>Direção do ataque<select name="direction">${optionsHtml(ATTACK_DIRECTIONS,'Desconhecida')}</select></label>
 <label>Jogou<select name="venue">${optionsHtml(['desconhecido','casa','fora'],'desconhecido')}</select></label>
 <label>Golos marcados<input type="number" name="gf" min="0" max="50" value="0" required /></label>
 <label>Golos sofridos<input type="number" name="ga" min="0" max="50" value="0" required /></label></div>
 <label class="form-label">Titulares observados (um nome por linha, facultativo)<textarea name="starters" rows="3" placeholder="Copia os 11 nomes do onze utilizado nesse jogo"></textarea></label>
 <label class="form-label">Notas do jogo<input name="notes" maxlength="300" placeholder="Jogador-chave, oportunidades, pontos fracos…" /></label>
 <button class="btn primary full" type="submit" ${t.n>=15?'disabled':''}>＋ Guardar jogo e atualizar relatório</button></form>
 <div class="row-buttons"><label class="btn upload">⇩ Importar adversário JSON<input type="file" accept=".json,application/json" id="opponentImportFile" hidden /></label><button class="btn" data-action="exportOpponent">Exportar relatório JSON</button><button class="btn danger" data-action="clearOpponent">Limpar observações</button></div>
 <h3>Jogos registados</h3><div class="opponent-games">${t.n?op.matches.map((g,i)=>`<div class="opponent-game"><div><strong>${safe(g.date||`Jogo ${i+1}`)} · ${safe(g.formation||'Formação ?')}</strong><small>${safe(g.style)} · ${safe(g.direction)} · ${safe(g.mentality)} · ${g.gf}-${g.ga}${g.starters?.length?` · ${g.starters.length} titulares identificados`:``}</small></div><button class="btn danger" data-action="removeOpponentGame" data-id="${safe(g.id)}">Apagar</button></div>`).join(''):'<p class="muted">Ainda não há jogos registados.</p>'}</div>
 </section>`;
}
function bindOpponentFile(){const rivalFile=$('rivalImportFile');if(rivalFile)rivalFile.addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{if(file.size>1000000)throw new Error('Máximo 1 MB para o plantel rival.');
  const data=JSON.parse(await file.text());const players=normalizeRoster(data.players||data.players_ar||data.roster||data);
  if(!db.opponent.name)throw new Error('Confirma primeiro o nome do adversário.');
  state.rivalCandidate={players,url:'ficheiro local'};render();notify('Plantel rival lido. Confirma a equipa antes de guardar.');
 }catch(err){notify('Erro no plantel rival: '+err.message,true);}finally{event.target.value='';}
 });const element=$('opponentImportFile');if(!element)return;element.addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{if(file.size>200000)throw new Error('Ficheiro demasiado grande (200 KB).');
 const data=JSON.parse(await file.text());const imported=normalizeOpponent(data.opponent||data);const sameClub=imported.name&&db.opponent.name&&imported.name.toLocaleLowerCase('pt-PT')===db.opponent.name.toLocaleLowerCase('pt-PT');db.opponent=imported;db.rivalRoster=Array.isArray(data.rivalRoster)&&data.rivalRoster.length?normalizeRoster(data.rivalRoster):(sameClub?db.rivalRoster:[]);db.rivalCountry=String(data.rivalCountry||(sameClub?db.rivalCountry:'')).trim().toLowerCase().slice(0,12);
 persist();render();notify('Adversário importado e relatório atualizado.');
 }catch(error){notify(`Erro a importar adversário: ${error.message}`,true);}finally{event.target.value='';}
});}
function renderSettings(){return `<section class="panel"><h1>Opções e transparência</h1><h2>Regra de estrangeiros</h2><p>Máximo de estrangeiros nos 16 convocados (11 titulares + até 5 suplentes). Guia histórico do TM; confirma a regra da tua competição.</p><label class="form-label">País do clube (código TM: pt, br, es, ...)<input id="clubCountry" class="select" value="${safe(db.clubCountry||'')}" placeholder="pt" maxlength="12" /></label><label class="form-label">Máximo de estrangeiros<select id="foreignLimit" class="select">${[0,1,2,3,4,5,6,7,8,9,10,11].map(n=>`<option value="${n}" ${db.maxForeigners===n?'selected':''}>${n}</option>`).join('')}</select></label><p class="tiny">A nacionalidade é comparada com a do clube; também podes assinalar Nacional/Estrangeiro no editor do jogador. Estes dados nunca são enviados ao TM.</p><h2>Plantel e backups</h2><div class="option-row"><div><b>Backup completo</b><small>Guarda plantel, táticas, adversário e histórico de estrelas antes de reinstalar.</small></div><button class="btn primary" data-action="backupFull">Exportar tudo</button></div><label class="btn upload full">⇩ Restaurar backup completo<input type="file" id="fullBackupFile" accept=".json,application/json" hidden /></label><div class="option-row"><div><b>Plantel atual</b><small>${db.players.length} jogadores · ${db.demo?'demonstração':'dados importados'}</small></div><button class="btn" data-action="export">Exportar</button></div><div class="option-row"><div><b>Exemplo de demonstração</b><small>Substitui temporariamente o plantel pelos jogadores fictícios</small></div><button class="btn" data-action="demo">Usar</button></div><div class="option-row"><div><b>Eliminar dados locais</b><small>Apaga a importação e regressa à demonstração</small></div><button class="btn danger" data-action="clear">Limpar</button></div></section>
 <section class="panel"><h2>Como são escolhidos os jogadores?</h2><p>O motor soma os atributos mais importantes para cada posição (escala normalizada 0–100), e ajusta a adequação posicional, rotina e condição quando disponível. Testa formações de origem e personalizadas com um algoritmo de atribuição global, sem repetir jogadores.</p><p class="warning">Os pesos e os índices são <b>heurísticos e não oficiais</b>. Não equivalem aos valores internos do TM nem às pontuações R5/R6/REC. Sem informações do adversário, nenhuma tática pode ser garantida como superior num jogo concreto.</p><p>O navegador TM integrado é exclusivo da APK, e o acesso à sessão não é partilhado com o Edge. A importação exige ação explícita tua.</p></section>
 <section class="panel"><h2>Créditos / fontes</h2><p>Projeto independente RJP TM Tactics. Inspiração funcional em ferramentas públicas da comunidade e na organização de atributos do Trophy Manager.</p><p><a href="https://greasyfork.org/en/scripts/515818-tm-compare-players-r6" target="_blank" rel="noopener noreferrer">TM Compare Players R6</a> · <a href="https://greasyfork.org/en/scripts/591412-trophy-manager-player-position-analysis-ranking" target="_blank" rel="noopener noreferrer">Position Analysis & Ranking</a></p><p class="tiny">Sem relação oficial com o Trophy Manager ou com o Tactics Pro de Saber Nasr. Não incorporamos o código nem o serviço de licenças deste último.</p></section>`;}
function findPlayer(id){return db.players.find(p=>p.id===id);}
function renderDetails(){
 const p=findPlayer(state.detail);if(!p)return '';
 const keys=parsePositions(p.fp).includes('GK')?GK_SKILLS:OUT_SKILLS;
 const scored=POSITIONS.map(pos=>({pos,score:rankByPosition([p],pos)[0]?.score||0,fit:suitability(p,pos)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5);
 const rec=suggestPositions(p), changes=rec.suggestions;
 return `<div class="modal-overlay" data-action="closeModal"><div class="modal" role="dialog" aria-modal="true" aria-label="Detalhes do jogador"><div class="section-head"><h2>${safe(p.name)}</h2><button class="close" data-action="closeModal" aria-label="Fechar">×</button></div><p>${safe(p.fp)} · ${p.age||'?'} anos · ${foreignStatus(p,db.clubCountry)===true?'🌍 Estrangeiro':foreignStatus(p,db.clubCountry)===false?'Nacional':'⚠ Nacionalidade por confirmar'} · rotina ${p.routine} · condição ${p.condition==null?'não indicada':p.condition+'%'}</p>${p.inj?'<p class="warning">Lesionado: indisponível para recomendações enquanto durar a lesão.</p>':''}<h3>Melhores posições estimadas</h3><div class="rating-bars">${scored.map(r=>`<div><b>${r.pos}</b><div class="progress"><i style="width:${r.score}%"></i></div>${badge(r.score)}</div>`).join('')}</div>
 <h3>Alteração de posição sugerida</h3>${changes.length?`<div class="suggestion-list">${changes.map(c=>`<button class="suggestion-row" data-action="compareFromDetail" data-pos="${safe(c.pos)}" data-playerid="${safe(p.id)}"><div><b>${safe(rec.current.pos)} → ${safe(c.pos)} (${safe(POSITION_NAMES[c.pos])})</b><small>${safe(c.reason)}</small></div><span class="change-pill ${c.type==='mudanca'?'improve':'fallback'}">${c.gain>0?'+':''}${num(c.gain)}</span></button>`).join('')}</div>`:'<p class="muted">Os índices atuais não indicam uma mudança vantajosa ou uma alternativa de eficácia próxima para este jogador.</p>'}
 <p class="tiny">A mudança é uma sugestão de utilização no onze, não uma alteração automática na conta TM.</p>
 <button class="btn primary" data-action="trainFromDetail" data-playerid="${safe(p.id)}">Plano de treino deste jogador →</button><h3>Atributos</h3><div class="skills-grid">${keys.map(k=>`<div><span>${safe(LABELS[k])}</span><b>${p[k]??'—'}</b></div>`).join('')}</div><div class="row-buttons"><button class="btn primary" data-action="edit">Editar</button><button class="btn" data-action="compareFromDetail" data-pos="${safe(scored[0]?.pos||'DC')}" data-playerid="${safe(p.id)}">Comparar nesta posição</button><button class="btn danger" data-action="delete">Apagar</button></div></div></div>`;
}
function renderEdit(){const p=state.edit==='new'?{id:'',name:'',fp:'M C',age:22,routine:0,condition:100,inj:'',ban:''}:findPlayer(state.edit);if(!p)return '';
 const keys=[...new Set([...OUT_SKILLS,...GK_SKILLS])];
 return `<div class="modal-overlay" data-action="closeEdit"><form class="modal" id="playerForm"><div class="section-head"><h2>${state.edit==='new'?'Adicionar jogador':'Editar jogador'}</h2><button type="button" class="close" data-action="closeEdit">×</button></div><div class="form-grid"><label>Nome<input name="name" value="${safe(p.name)}" maxlength="80" required /></label><label>Posição (ex.: M C, D LR)<input name="fp" value="${safe(p.fp)}" required /></label><label>Idade<input type="number" name="age" min="16" max="50" value="${p.age}" /></label><label>País do jogador (código, ex.: pt, br)<input name="country" value="${safe(p.country||'')}" maxlength="12" placeholder="pt" /></label><label>Classificação<select name="foreign"><option value="" ${p.foreign==null?'selected':''}>Automática pelo país</option><option value="false" ${p.foreign===false?'selected':''}>Nacional</option><option value="true" ${p.foreign===true?'selected':''}>Estrangeiro</option></select></label><label>Rotina<input type="number" name="routine" min="0" max="200" value="${p.routine}" /></label><label>REC (0–10)<input type="number" name="rec" min="0" max="10" step="0.01" value="${p.rec??0}" /></label><label>ASI<input type="number" name="asi" min="0" max="10000000" value="${p.asi??0}" /></label><label>Condição %<input type="number" name="condition" min="0" max="100" value="${p.condition??100}" /></label><label>Indisponibilidade<select name="inj"><option value="" ${!p.inj?'selected':''}>Disponível</option><option value="1" ${p.inj?'selected':''}>Lesionado / indisponível</option></select></label></div><h3>Atributos (0–20)</h3><div class="skill-input-grid">${keys.map(k=>`<label>${safe(LABELS[k])}<input name="${k}" type="number" min="0" max="20" value="${p[k]??0}" /></label>`).join('')}</div><button type="submit" class="btn primary full">Guardar jogador</button></form></div>`;
}
function bindInputFile(){
 const backup=$('fullBackupFile');if(backup)backup.addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
   if(file.size>3000000)throw new Error('Backup demasiado grande (máximo 3 MB).');
   const parsed=JSON.parse(await file.text());
   if(parsed?.schema!=='rjp-tm-full-backup-v1'||!parsed.data||!Array.isArray(parsed.data.players))throw new Error('Não é um backup completo da RJP TM Tactics.');
   const d=parsed.data;const players=normalizeRoster(d.players);
   if(!confirm(`Restaurar ${players.length} jogadores e o histórico? Substituirá os dados atuais desta instalação.`))return;
   db={...d,players,formations:Array.isArray(d.formations)?d.formations.map(x=>{try{return validateCustomFormation(x);}catch{return null;}}).filter(Boolean).slice(0,30):[],
    progressHistory:sanitizeHistory(d.progressHistory,new Set(players.map(p=>p.id))),demo:!!d.demo,maxForeigners:Number.isInteger(d.maxForeigners)&&d.maxForeigners>=0&&d.maxForeigners<=11?d.maxForeigners:5};
   if(!db.opponent||!Array.isArray(db.opponent.matches))db.opponent=emptyOpponent();
   if(!Array.isArray(db.rivalRoster))db.rivalRoster=[];
   state.tab='analise';state.formation='auto';state.devPlayer='';state.detail=null;state.edit=null;persist();render();notify('Backup completo restaurado.');
  }catch(error){notify('Erro no backup: '+error.message,true);}finally{e.target.value='';}
 });
 const tf=$('tacticsImportFile');if(tf)tf.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;
  try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed.formations))throw new Error('O ficheiro não contém formations.');
   const incoming=parsed.formations.map(validateCustomFormation);let added=0;
   for(const f of incoming){if(db.formations.length>=30)break;
    if(Object.keys(combinedFormations(db.formations)).some(n=>n.toLocaleLowerCase('pt-PT')===f.name.toLocaleLowerCase('pt-PT')))continue;
    db.formations.push(f);added++;
   }
   persist();render();notify(`${added} táticas importadas.`);
  }catch(err){notify(`Falha a importar táticas: ${err.message}`,true);}finally{e.target.value='';}
 });
 const file=$('importFile');if(!file)return;file.addEventListener('change',async e=>{
 const f=e.target.files?.[0];if(!f)return;
 try{const r=importText(await f.text(),f.name);acceptImport(r);}
 catch(err){notify(err.message,true);}finally{e.target.value='';}
});}
function acceptImport(players,club='',clubCountry=''){const previous=new Map(db.players.map(p=>[String(p.id),p]));players=players.map(p=>{const old=previous.get(String(p.id));return old?{...p,foreign:p.foreign??old.foreign,country:p.country||old.country||''}:p;});const date=new Date().toISOString().slice(0,10);let history=db.progressHistory;for(const p of players)history=mergeSnapshot(history,playerSnapshot(p,date));db={...db,players,progressHistory:history,demo:false,clubCountry:String(clubCountry||db.clubCountry||'').toLowerCase(),updated:new Date().toISOString(),club:club||db.club||''};state.tab='analise';state.formation='auto';state.detail=null;state.compareA=null;state.compareB=null;persist();render();notify('✓ '+players.length+' jogadores importados. Histórico de treino guardado.');}
async function consumeNativeImport(){if(!isNative)return;
 try{const r=await TMBridge.consumeImport();if(r?.json){const payload=JSON.parse(r.json);acceptImport(normalizeRoster(payload.players||payload),payload.club||'',payload.clubCountry||'');}}catch(e){notify('Não foi possível importar: '+e.message,true);}
 try{const result=await TMBridge.consumeRival();if(result?.json){const data=JSON.parse(result.json);const players=normalizeRoster(data.players);state.rivalCandidate={players,url:data.url||''};state.tab='adversario';render();notify('Jogadores encontrados. Confirma o clube antes de guardar.');}}catch(e){notify('Falha na leitura do plantel rival: '+e.message,true);}
 try{const result=await TMBridge.consumePreview();if(result?.json){db.preview=parsePreviewCapture(JSON.parse(result.json),db.club);state.tab='adversario';persist();render();notify('Preview importado. Confirma o adversário antes de prosseguir.');}}catch(e){notify('Falha na leitura do preview: '+e.message,true);}
}
async function openTM(page='players'){if(!isNative){window.open(page==='home'?'https://trophymanager.com/home/':'https://trophymanager.com/players/','_blank','noopener,noreferrer');return;}
 try{await TMBridge.openBrowser({page});}catch(e){notify('Navegador não disponível nesta compilação. '+e.message,true);}}
function onClick(e){const el=e.target.closest('[data-action],[data-tab],[data-form],[data-player]');if(!el)return;
 const action=el.dataset.action;if(action==='closeModal'){if(e.target.closest('.modal')&&!e.target.classList.contains('close'))return;state.detail=null;render();return;}
 if(action==='closeEdit'){if(e.target.closest('form')&& !e.target.classList.contains('close'))return;state.edit=null;render();return;}
 if(el.dataset.tab){state.tab=el.dataset.tab;state.detail=null;state.edit=null;render();window.scrollTo(0,0);return;}
 if(el.dataset.form){state.formation=el.dataset.form;state.tab='analise';render();return;}
 if(el.dataset.player){state.detail=el.dataset.player;render();return;}
 if(action==='newTactic'||action==='copyExample'||action==='copyBuiltIn'){
  const preset=action==='copyBuiltIn'?FORMATIONS[el.dataset.name]:FORMATIONS['3-2-3-1-1'];
  if(!preset)return;
  state.tacticDraft=newDraft({name:action==='copyBuiltIn'?`Minha ${el.dataset.name}`:'Minha 3-2-3-1-1',positions:preset});state.tacticOrigin=null;
  state.tab='taticas';render();return;
 }
 if(action==='cancelTactic'){state.tacticDraft=null;state.tacticOrigin=null;render();return;}
 if(action==='editTactic'){const f=db.formations.find(f=>f.name===el.dataset.name);if(!f)return;
  state.tacticOrigin=f.name;state.tacticDraft=newDraft(f);state.tab='taticas';render();return;}
 if(action==='deleteTactic'){const name=el.dataset.name;if(!confirm(`Apagar a tática "${name}"?`))return;
  db.formations=db.formations.filter(f=>f.name!==name);if(state.formation===name)state.formation='auto';
  if(state.tacticOrigin===name){state.tacticDraft=null;state.tacticOrigin=null;}
  persist();render();notify('Tática apagada.');return;}
 if(action==='useTactic'||action==='useExample'){
  state.formation=action==='useExample'?'3-2-3-1-1':el.dataset.name;state.tab='analise';render();return;
 }
 if(action==='saveTactic'||action==='testDraft'){
  if(!state.tacticDraft)return;state.tacticDraft.name=$('tacticName')?.value||'';
  try{const f=validateCustomFormation(state.tacticDraft),collisions=Object.keys(combinedFormations(db.formations.filter(x=>x.name!==state.tacticOrigin)));
   if(collisions.some(x=>x.toLocaleLowerCase('pt-PT')===f.name.toLocaleLowerCase('pt-PT')))throw new Error('Já existe uma tática com esse nome.');
   if(action==='testDraft'){
    const candidate=analyzeFormation(db.players,f.name,[f],{maxForeigners:db.maxForeigners,clubCountry:db.clubCountry});if(!candidate){notify('São necessários 11 jogadores disponíveis para simular esta tática.',true);return;}
    notify(`Simulação: ${f.name} · índice ${num(candidate.average)}/100. Guarda para a comparar com as outras.`);return;
   }
   if(!state.tacticOrigin&&db.formations.length>=30)throw new Error('Limite de 30 táticas guardadas.');
   db.formations=db.formations.filter(x=>x.name!==state.tacticOrigin);db.formations.push(f);
   state.formation=f.name;state.tacticOrigin=null;state.tacticDraft=null;state.tab='analise';persist();render();notify(`Tática «${f.name}» guardada e selecionada.`);return;
  }catch(err){notify(err.message,true);return;}
 }
 if(action==='exportTactics'){
  const payload={app:'RJP TM Tactics',version:'1.8.0',formations:db.formations};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='rjp-tm-taticas.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
 }
 if(action==='devTraining'||action==='devMarket'||action==='devStars'){state.devView=action==='devTraining'?'treino':action==='devStars'?'estrelas':'mercado';if(el.dataset.pos)state.devPosition=el.dataset.pos;state.tab='desenvolver';state.detail=null;render();return;}
 if(action==='saveProgress'){
  const player=findPlayer(state.devPlayer);if(!player)return;
  const day=$('progressDate')?.value||new Date().toISOString().slice(0,10);
  if(day>new Date().toISOString().slice(0,10)){notify('A observação não pode ter uma data futura.',true);return;}
  try{db.progressHistory=mergeSnapshot(db.progressHistory,playerSnapshot(player,day));persist();render();notify('Observação guardada; a previsão será recalculada após novo treino.');}
  catch(error){notify(error.message,true);}return;
 }
 if(action==='backupFull'){
  const payload={schema:'rjp-tm-full-backup-v1',version:'1.8.0',savedAt:new Date().toISOString(),data:db};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='RJP_TM_Tactics_Backup_Completo.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);notify('Backup completo exportado. Guarda-o antes de desinstalares a APP.');return;
 }
 if(action==='viewPlayerDevelopment'){state.detail=el.dataset.playerid;render();return;}
 if(action==='trainFromDetail'){state.devView='treino';state.devPlayer=el.dataset.playerid;state.devRole='auto';state.tab='desenvolver';state.detail=null;render();return;}
 if(action==='viewOpponentLineup'){
  state.formation=el.dataset.name;state.tab='analise';render();return;
 }
 if(action==='removeOpponentGame'){
  db.opponent.matches=db.opponent.matches.filter(g=>g.id!==el.dataset.id);persist();render();return;
 }
 if(action==='clearOpponent'){
  if(!confirm('Eliminar as observações do adversário?'))return;db.opponent=emptyOpponent();db.rivalRoster=[];db.rivalCountry='';persist();render();return;
 }
 if(action==='exportOpponent'){
  const blob=new Blob([JSON.stringify({schema:'rjp-tm-opponent-v2',opponent:db.opponent,rivalRoster:db.rivalRoster,rivalCountry:db.rivalCountry},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='RJP_TM_Adversario.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);return;
 }
 if(action==='openTM'){openTM();return;}
 if(action==='openTMCalendar'){openTM('home');return;}
 if(action==='openTMRival'){openTM('home');return;}
 if(action==='cancelRival'){state.rivalCandidate=null;render();return;}
 if(action==='acceptRival'){
  if(!db.opponent.name){notify('Confirma primeiro o nome do clube adversário.',true);return;}
  if(!state.rivalCandidate?.players?.length)return;
  if(!confirm(`Confirma que estes ${state.rivalCandidate.players.length} jogadores pertencem ao clube ${db.opponent.name}?`))return;
  db.rivalRoster=state.rivalCandidate.players;state.rivalCandidate=null;persist();render();notify('Plantel rival guardado. Previsão atualizada.');return;
 }
 if(action==='clearRival'){if(!confirm('Apagar jogadores do adversário guardados localmente?'))return;db.rivalRoster=[];persist();render();return;}
 if(action==='parsePreviewText'){
  try{db.preview=parsePreviewCapture({title:'Texto copiado do TM',text:$('previewPaste')?.value||''},db.club);persist();render();notify('Texto analisado. Confirma o próximo adversário.');}
  catch(err){notify(err.message,true);}return;
 }
 if(action==='inspectSuggestion'||action==='compareFromDetail'){
  const p=el.dataset.playerid;
  if(!findPlayer(p))return;
  if(action==='inspectSuggestion'){state.detail=p;render();return;}
  state.compareA=p;state.position=POSITIONS.includes(el.dataset.pos)?el.dataset.pos:'DC';
  state.compareB=null;state.detail=null;state.tab='comparar';render();return;
 }
 if(action==='add'){state.edit='new';render();return;}
 if(action==='edit'){state.edit=state.detail;state.detail=null;render();return;}
 if(action==='delete'){if(confirm('Apagar este jogador?')){db.players=db.players.filter(p=>p.id!==state.detail);persist();state.detail=null;render();notify('Jogador removido.');}return;}
 if(action==='export'){downloadRoster(db.players);return;}
 if(action==='pasteImport'){try{acceptImport(importText($('jsonInput').value,'dados.json'));}catch(err){notify(err.message,true);}return;}
 if(action==='empty'){if(!confirm('Começar um plantel vazio? Exporta os dados atuais antes.'))return;db={...db,players:[],demo:false,updated:null,club:''};state.tab='plantel';state.formation='auto';persist();render();notify('Plantel vazio criado. Adiciona os teus jogadores.');return;}
 if(action==='demo'||action==='clear'){if(!confirm('Substituir o plantel atual pelos jogadores de demonstração? Exporta antes os dados que pretendes conservar.'))return;db={...db,players:demoPlayers,demo:true,updated:null,club:''};state.tab='analise';state.formation='auto';persist();render();return;}
}
function onChange(e){
 if(['opponentName','opponentDate','opponentVenue','opponentNotes'].includes(e.target.id)){
  const key={opponentName:'name',opponentDate:'date',opponentVenue:'venue',opponentNotes:'notes'}[e.target.id];
  db.opponent[key]=e.target.value.trim().slice(0,key==='notes'?350:110);persist();render();return;
 }
 if(e.target.id==='rivalCountry'){db.rivalCountry=e.target.value.trim().toLowerCase().slice(0,12);persist();render();return;}
 if(e.target.id==='clubCountry'){db.clubCountry=e.target.value.trim().toLowerCase();persist();render();return;}
 if(e.target.id==='foreignLimit'){db.maxForeigners=Number(e.target.value);persist();render();return;}
 if(e.target.hasAttribute('data-tactic-slot')&&state.tacticDraft){
  state.tacticDraft.name=$('tacticName')?.value??state.tacticDraft.name;
  const i=Number(e.target.dataset.tacticSlot);if(i>=1&&i<=10&&POSITIONS.includes(e.target.value)&&e.target.value!=='GK'){
   state.tacticDraft.positions[i]=e.target.value;render();
  }return;
 }
 if(e.target.id==='devLevel'){state.devLevel=e.target.value;render();return;}
 if(e.target.id==='devPlayer'){state.devPlayer=e.target.value;state.devRole='auto';render();return;}
 if(e.target.id==='devRole'){state.devRole=e.target.value;render();return;}
 if(e.target.id==='devPosition'){state.devPosition=e.target.value;render();return;}
 if(e.target.id==='formationChoice'){state.formation=e.target.value;render();}if(e.target.id==='roleChoice'){state.position=e.target.value;state.compareA=null;state.compareB=null;render();}if(e.target.id==='compareA'||e.target.id==='compareB'){state[e.target.id]=e.target.value;render();}}
function onSubmit(e){
 if(e.target.id==='previewConfirmForm'){
  e.preventDefault();
  const v=Object.fromEntries(new FormData(e.target).entries());
  const name=String(v.name||'').trim().slice(0,110);
  if(!['casa','fora'].includes(v.venue)){notify('Confirma se jogas em casa ou fora.',true);return;}
  if(name.length<3){notify('Confirma o nome do adversário.',true);return;}
  if(db.opponent.matches.length&&(!db.opponent.name||db.opponent.name.toLocaleLowerCase('pt-PT')!==name.toLocaleLowerCase('pt-PT'))){
   if(!confirm('Este é outro adversário. Limpar os jogos anteriores registados para não misturar equipas?'))return;
   db.opponent.matches=[];db.rivalRoster=[];db.rivalCountry='';
  }
  db.opponent.name=name;db.opponent.date=String(v.date||'').slice(0,10);
  db.opponent.venue=v.venue==='fora'?'fora':'casa';
  const note=String(v.notes||'').trim();if(note)db.opponent.notes=note.slice(0,350);
  db.opponent.previewEvidence={title:db.preview?.title||'',indicators:(db.preview?.indicators||[]).slice(0,6),capturedAt:db.preview?.capturedAt||'',source:db.preview?.url||''};
  db.preview=null;persist();render();notify('Próximo adversário confirmado. Plano pré-jogo atualizado.');return;
 }
 if(e.target.id==='opponentGameForm'){
  e.preventDefault();try{
   if(db.opponent.matches.length>=15)throw new Error('Máximo de 15 jogos por adversário.');
   const value=Object.fromEntries(new FormData(e.target).entries());
   value.id=`op-${Date.now()}-${db.opponent.matches.length}`;
   db.opponent.matches.unshift(normalizeOpponentGame(value));persist();render();notify('Jogo registado e relatório atualizado.');
  }catch(error){notify(error.message,true);}return;
 }
 if(e.target.id!=='playerForm')return;e.preventDefault();const raw=Object.fromEntries(new FormData(e.target).entries());raw.id=state.edit==='new'?'user-'+Date.now():state.edit;const p=normalizePlayer(raw);
 if(!p){notify('Confirma a posição e preenche pelo menos um atributo.',true);return;}
 if(state.edit==='new'){db.players.push(p);}else{const i=db.players.findIndex(x=>x.id===state.edit);if(i>=0)db.players[i]=p;}
 db.updated=new Date().toISOString();state.edit=null;persist();render();notify('Jogador guardado.');}
document.addEventListener('click',onClick);
document.addEventListener('change',onChange);
document.addEventListener('submit',onSubmit);
document.addEventListener('resume',()=>{setTimeout(consumeNativeImport,100);});
window.addEventListener('focus',()=>{if(isNative)consumeNativeImport();});
if(isNative){document.addEventListener('visibilitychange',()=>{if(!document.hidden)consumeNativeImport();});setInterval(()=>{if(!document.hidden)consumeNativeImport();},5000);setTimeout(consumeNativeImport,250);}
if(!isNative&&'serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
render();
