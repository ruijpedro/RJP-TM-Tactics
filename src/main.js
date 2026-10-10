import './style.css';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { demoPlayers } from './demo.js';
import { FORMATIONS,POSITIONS,LABELS,OUT_SKILLS,GK_SKILLS,normalizePlayer,normalizeRoster,compareFormations,analyzeFormation,rankByPosition,styleAdvice,preferredMentality,suitability } from './analysis.js';
import { importText,downloadRoster } from './import.js';
const STORAGE='rjp_tm_tactics_v1';
const TMBridge=registerPlugin('TMBridge');
let db;
try{db=JSON.parse(localStorage.getItem(STORAGE)||'null');}catch{}
if(!db||!Array.isArray(db.players))db={players:demoPlayers,demo:true,updated:null,club:''};
const state={tab:'analise',formation:'auto',position:'DC',detail:null,edit:null,sort:'score'};
const $=id=>document.getElementById(id);
const isNative=Capacitor.isNativePlatform();
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n||0).toFixed(1).replace('.',',');
const capScore=n=>n>=75?'excellent':n>=60?'good':n>=45?'medium':'bad';
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(db));}catch(e){notify('Sem espaço para gravar o plantel. Exporta um backup.',true);}}
function notify(message,error=false){const t=$('toast');if(!t)return;t.textContent=message;t.className='toast '+(error?'error':'');clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.className='toast hidden',4800);}
function render(){
 const result=compareFormations(db.players);let selection=result[0]||null;
 if(state.formation!=='auto')selection=result.find(r=>r.name===state.formation)||selection;
 $('app').innerHTML=`
 <header class="topbar"><div class="brand"><img src="./icons/icon.svg" alt=""/><div><strong>RJP TM <em>TACTICS</em></strong><small>ASSISTENTE DE TREINADOR · V1.0.1</small></div></div><button class="top-action" data-action="openTM" title="Abrir Trophy Manager">↗ <span>Jogar TM</span></button></header>
 <main class="main">
  <section class="topnote ${db.demo?'demo':'real'}"><span class="dot"></span>${db.demo?'MODO DEMONSTRAÇÃO — 23 jogadores fictícios':safe(db.club||'PLANTEL IMPORTADO')+' · '+db.players.length+' jogadores'}<span class="small">${db.demo?'Importa o teu plantel real para obter recomendações úteis.':db.updated?'Atualizado '+new Date(db.updated).toLocaleString('pt-PT'):''}</span></section>
  ${state.tab==='analise'?renderAnalysis(selection,result):state.tab==='plantel'?renderSquad():state.tab==='importar'?renderImport():renderSettings()}
 </main>
 <nav class="bottom-nav" aria-label="Menu"><button class="${state.tab==='analise'?'active':''}" data-tab="analise"><b>▦</b>Análise</button><button class="${state.tab==='plantel'?'active':''}" data-tab="plantel"><b>♟</b>Plantel</button><button class="${state.tab==='importar'?'active':''}" data-tab="importar"><b>⇩</b>Importar</button><button class="${state.tab==='definicoes'?'active':''}" data-tab="definicoes"><b>⚙</b>Opções</button></nav>
 <div id="toast" class="toast hidden" role="status"></div>
 ${state.detail?renderDetails():''}
 ${state.edit?renderEdit():''}
 `;
 bindInputFile();
}
function badge(n){return `<span class="value ${capScore(n)}">${num(n)}</span>`;}
function renderAnalysis(selected,all){
 if(!selected)return `<section class="panel"><h1>Faltam jogadores disponíveis</h1><p>Para calcular o melhor onze precisas de, pelo menos, 11 jogadores disponíveis, incluindo um guarda-redes e posições compatíveis.</p><button class="btn primary" data-tab="importar">Importar plantel</button><button class="btn" data-tab="plantel">Rever jogadores</button></section>`;
 const bench=db.players.filter(p=>!selected.starters.some(s=>s.player.id===p.id));
 const advice=styleAdvice(selected);
 return `
 <section class="hero"><div class="eyebrow">MOTOR DE DECISÃO · NÃO OFICIAL TM</div><h1>O teu melhor <span>onze</span></h1><p>Comparação de ${all.length} formações, com atribuição global dos jogadores a cada posição.</p><div class="hero-stats"><div><small>Formação recomendada</small><strong>${safe(all[0].name)}</strong></div><div><small>Índice da formação</small><strong>${num(all[0].average)} <sup>/100</sup></strong></div><div><small>Disponíveis</small><strong>${db.players.filter(p=>!p.excluded&&!p.inj&&(!p.ban||p.ban==='g')).length}</strong></div></div></section>
 <section class="panel"><div class="section-head"><div><h2>Onze ideal</h2><p>Otimização por qualidade, adaptação, rotina e condição</p></div></div>
  <label class="form-label" for="formationChoice">Formação a analisar</label><select id="formationChoice" class="select"><option value="auto" ${state.formation==='auto'?'selected':''}>✨ Melhor formação automática</option>${all.map(a=>`<option value="${safe(a.name)}" ${state.formation===a.name?'selected':''}>${safe(a.name)} · ${num(a.average)}</option>`).join('')}</select>
  <div class="field"><div class="field-lines"><i></i><i></i><i></i></div>${renderPitch(selected.starters)}</div>
  <div class="scoreline"><span>Rendimento estimado: ${badge(selected.average)}</span><span>${selected.gaps.length?'⚠ '+selected.gaps.length+' posições a melhorar':'✓ Cobertura equilibrada'}</span></div>
  <div class="tiny">A posição indicada é a da formação, não necessariamente a posição favorita do jogador. Os valores são estimativas próprias, não ratings oficiais.</div>
 </section>
 <section class="gridpanels"><section class="panel"><div class="section-head"><h2>Melhores formações</h2></div><div class="formation-list">${all.slice(0,6).map((r,i)=>`<button data-form="${safe(r.name)}" class="formation-row ${selected.name===r.name?'chosen':''}"><span class="place">${i+1}º</span><strong>${safe(r.name)}</strong><div class="progress"><i style="width:${r.average}%"></i></div>${badge(r.average)}</button>`).join('')}</div></section>
 <section class="panel"><div class="section-head"><h2>Estilo sugerido</h2></div><p class="muted">Adequação ao perfil dos titulares (não é uma previsão do motor TM).</p><div class="styles-list">${advice.map((a,i)=>`<div class="style-row"><div><strong>${i===0?'★ ':''}${safe(a.name)}</strong><small>${safe(a.detail)}</small></div>${badge(a.score)}</div>`).join('')}</div><p class="tip">Mentalidade inicial: <b>${safe(preferredMentality(selected))}</b>. Confirma com a força e estilo do adversário.</p></section></section>
 <section class="panel"><div class="section-head"><h2>Decisões do treinador</h2></div>
  ${selected.gaps.length?`<p>Posições com maior margem de melhoria:</p><div class="issue-list">${selected.gaps.map(s=>`<div class="issue"><span>⚠ ${safe(s.position)}</span><div><strong>${safe(s.player.name)}</strong><small>Índice ${num(s.score)} · adequação ${Math.round(suitability(s.player,s.position)*100)}%</small></div></div>`).join('')}</div>`:'<p>Não se destacam posições abaixo do limiar indicativo de 55 pontos com esta formação.</p>'}
  <h3>Banco / alternativas</h3><div class="bench">${bench.slice(0,10).map(p=>`<button class="mini-player" data-player="${safe(p.id)}"><span>${safe(p.name)}</span><small>${safe(p.fp)}</small></button>`).join('')||'<span>Sem suplentes disponíveis.</span>'}</div>
 </section>`;
}
function renderPitch(starters){
 const indexes=new Map();const rows={};
 starters.forEach((s,i)=>{const k=s.position==='GK'?'GK':s.position==='F'?'F':s.position.startsWith('OM')?'OM':s.position.startsWith('DM')?'DM':s.position.startsWith('M')?'M':'D';(rows[k]||=[]).push({s,i});});
 Object.entries(rows).forEach(([k,arr])=>arr.forEach(({i},n)=>indexes.set(i,{x:(n+1)*100/(arr.length+1),y:{GK:87,D:71,DM:55,M:42,OM:29,F:12}[k]})));
 return starters.map((s,i)=>{const c=indexes.get(i),n=s.player.name.split(/\s+/);const short=(n.length>1?n[0][0]+'. '+n[n.length-1]:n[0]);return `<button class="pitch-player ${capScore(s.score)}" style="left:${c.x}%;top:${c.y}%" data-player="${safe(s.player.id)}" title="${safe(s.player.name)}"><span class="pitch-score">${Math.round(s.score)}</span><span class="pitch-name">${safe(short)}</span><span class="pitch-pos">${safe(s.position)}</span></button>`;}).join('');
}
function renderSquad(){
 const rank=rankByPosition(db.players,state.position);
 return `<section class="panel"><div class="section-head"><div><h1>Plantel</h1><p>${db.players.length} jogadores · ordenação por posição</p></div><button class="btn tinybtn" data-action="add">+ Jogador</button></div><label for="roleChoice" class="form-label">Comparar jogadores para:</label><select class="select" id="roleChoice">${POSITIONS.map(p=>`<option value="${p}" ${state.position===p?'selected':''}>${p}</option>`).join('')}</select><div class="player-list">${rank.map((x,i)=>`<button class="player-row" data-player="${safe(x.player.id)}"><span class="row-num">${i+1}</span><div class="player-col"><b>${safe(x.player.name)}</b><small>${safe(x.player.fp)} · ${x.player.age||'?'} anos · rotina ${x.player.routine}${x.player.inj?' · lesionado':''}</small></div><div class="player-score">${badge(x.score)}<small>adequação ${Math.round(x.adapt*100)}%</small></div></button>`).join('')}</div></section>`;
}
function renderImport(){return `<section class="panel"><h1>Importar plantel</h1><p>Na <b>APK Android</b>, podes abrir o TM dentro da aplicação e recolher os jogadores da página <b>Plantel → Jogadores</b>, mediante toque no botão de importação.</p><button class="btn primary full" data-action="openTM">↗ Abrir Trophy Manager ${isNative?'na APP':'no navegador'}</button><p class="info">${isNative?'No navegador integrado fazes login no TM uma vez. A sessão é independente do Edge. Na página do plantel toca em “Importar plantel”.':'Na versão Web, usa um ficheiro JSON/CSV exportado ou introduz os jogadores manualmente. Não é possível ler a sessão privada do Edge a partir desta página.'}</p></section>
 <section class="panel"><h2>Ficheiro JSON ou CSV</h2><p>Aceita campos TM como <code>id,name,fp,age,asi,rec,routine,str,sta,pac,mar,tac,...</code> (guarda-redes: <code>han,one,ref,ari,jum,com,kic,thr</code>).</p><label class="btn secondary full upload">⇩ Selecionar ficheiro <input type="file" id="importFile" accept=".json,.csv,application/json,text/csv" hidden /></label><label class="form-label" for="jsonInput">Ou cola aqui JSON com <code>players_ar</code> ou um array de jogadores</label><textarea id="jsonInput" rows="5" placeholder='{"players":[{"name":"Exemplo","fp":"M C","pas":14,"tec":15,"wor":13}]}'></textarea><button class="btn" data-action="pasteImport">Analisar texto colado</button></section>
 <section class="panel"><h2>Outras opções</h2><div class="row-buttons"><button class="btn" data-action="add">+ Introduzir jogador</button><button class="btn" data-action="empty">Novo plantel vazio</button><button class="btn" data-action="export">⇧ Guardar backup</button></div><p class="tiny">Dados tratados e guardados no dispositivo. Sem servidor próprio, automações de jogo ou recolha de palavras-passe.</p></section>`;}
function renderSettings(){return `<section class="panel"><h1>Opções e transparência</h1><div class="option-row"><div><b>Plantel atual</b><small>${db.players.length} jogadores · ${db.demo?'demonstração':'dados importados'}</small></div><button class="btn" data-action="export">Exportar</button></div><div class="option-row"><div><b>Exemplo de demonstração</b><small>Substitui temporariamente o plantel pelos jogadores fictícios</small></div><button class="btn" data-action="demo">Usar</button></div><div class="option-row"><div><b>Eliminar dados locais</b><small>Apaga a importação e regressa à demonstração</small></div><button class="btn danger" data-action="clear">Limpar</button></div></section>
 <section class="panel"><h2>Como são escolhidos os jogadores?</h2><p>O motor soma os atributos mais importantes para cada posição (escala normalizada 0–100), e ajusta a adequação posicional, rotina e condição quando disponível. Testa dez esquemas com um algoritmo de atribuição global, sem repetir jogadores.</p><p class="warning">Os pesos e os índices são <b>heurísticos e não oficiais</b>. Não equivalem aos valores internos do TM nem às pontuações R5/R6/REC. Sem informações do adversário, nenhuma tática pode ser garantida como superior num jogo concreto.</p><p>O navegador TM integrado é exclusivo da APK, e o acesso à sessão não é partilhado com o Edge. A importação exige ação explícita tua.</p></section>
 <section class="panel"><h2>Créditos / fontes</h2><p>Projeto independente RJP TM Tactics. Inspiração funcional em ferramentas públicas da comunidade e na organização de atributos do Trophy Manager.</p><p><a href="https://greasyfork.org/en/scripts/515818-tm-compare-players-r6" target="_blank" rel="noopener noreferrer">TM Compare Players R6</a> · <a href="https://greasyfork.org/en/scripts/591412-trophy-manager-player-position-analysis-ranking" target="_blank" rel="noopener noreferrer">Position Analysis & Ranking</a></p><p class="tiny">Sem relação oficial com o Trophy Manager ou com o Tactics Pro de Saber Nasr. Não incorporamos o código nem o serviço de licenças deste último.</p></section>`;}
function findPlayer(id){return db.players.find(p=>p.id===id);}
function renderDetails(){
 const p=findPlayer(state.detail);if(!p)return '';
 const keys=p.fp.toUpperCase().includes('GK')?GK_SKILLS:OUT_SKILLS;
 const top=POSITIONS.map(pos=>({pos,score:rankByPosition([p],pos)[0]?.score||0})).sort((a,b)=>b.score-a.score).slice(0,5);
 return `<div class="modal-overlay" data-action="closeModal"><div class="modal" role="dialog" aria-modal="true" aria-label="Detalhes do jogador"><div class="section-head"><h2>${safe(p.name)}</h2><button class="close" data-action="closeModal" aria-label="Fechar">×</button></div><p>${safe(p.fp)} · ${p.age||'?'} anos · rotina ${p.routine} · condição ${p.condition==null?'não indicada':p.condition+'%'}</p>${p.inj?'<p class="warning">Lesionado: indisponível para recomendações.</p>':''}<h3>Melhores posições estimadas</h3><div class="rating-bars">${top.map(r=>`<div><b>${r.pos}</b><div class="progress"><i style="width:${r.score}%"></i></div>${badge(r.score)}</div>`).join('')}</div><h3>Atributos</h3><div class="skills-grid">${keys.map(k=>`<div><span>${safe(LABELS[k])}</span><b>${p[k]??'—'}</b></div>`).join('')}</div><div class="row-buttons"><button class="btn primary" data-action="edit">Editar</button><button class="btn danger" data-action="delete">Apagar</button></div></div></div>`;
}
function renderEdit(){const p=state.edit==='new'?{id:'',name:'',fp:'M C',age:22,routine:0,condition:100,inj:'',ban:''}:findPlayer(state.edit);if(!p)return '';
 const keys=[...new Set([...OUT_SKILLS,...GK_SKILLS])];
 return `<div class="modal-overlay" data-action="closeEdit"><form class="modal" id="playerForm"><div class="section-head"><h2>${state.edit==='new'?'Adicionar jogador':'Editar jogador'}</h2><button type="button" class="close" data-action="closeEdit">×</button></div><div class="form-grid"><label>Nome<input name="name" value="${safe(p.name)}" maxlength="80" required /></label><label>Posição (ex.: M C, D LR)<input name="fp" value="${safe(p.fp)}" required /></label><label>Idade<input type="number" name="age" min="16" max="50" value="${p.age}" /></label><label>Rotina<input type="number" name="routine" min="0" max="200" value="${p.routine}" /></label><label>Condição %<input type="number" name="condition" min="0" max="100" value="${p.condition??100}" /></label><label>Indisponibilidade<select name="inj"><option value="" ${!p.inj?'selected':''}>Disponível</option><option value="1" ${p.inj?'selected':''}>Lesionado / indisponível</option></select></label></div><h3>Atributos (0–20)</h3><div class="skill-input-grid">${keys.map(k=>`<label>${safe(LABELS[k])}<input name="${k}" type="number" min="0" max="20" value="${p[k]??0}" /></label>`).join('')}</div><button type="submit" class="btn primary full">Guardar jogador</button></form></div>`;
}
function bindInputFile(){const file=$('importFile');if(!file)return;file.addEventListener('change',async e=>{
 const f=e.target.files?.[0];if(!f)return;
 try{const r=importText(await f.text(),f.name);acceptImport(r);}
 catch(err){notify(err.message,true);}finally{e.target.value='';}
});}
function acceptImport(players,club=''){db={players,demo:false,updated:new Date().toISOString(),club:club||db.club||''};state.tab='analise';state.formation='auto';state.detail=null;persist();render();notify('✓ '+players.length+' jogadores importados. Análise atualizada.');}
async function consumeNativeImport(){if(!isNative)return;
 try{const r=await TMBridge.consumeImport();if(r?.json){const payload=JSON.parse(r.json);acceptImport(normalizeRoster(payload.players||payload),payload.club||'');}}catch(e){notify('Não foi possível importar: '+e.message,true);}}
async function openTM(){if(!isNative){window.open('https://trophymanager.com/players/','_blank','noopener,noreferrer');return;}
 try{await TMBridge.openBrowser();}catch(e){notify('Navegador não disponível nesta compilação. '+e.message,true);}}
function onClick(e){const el=e.target.closest('[data-action],[data-tab],[data-form],[data-player]');if(!el)return;
 const action=el.dataset.action;if(action==='closeModal'){if(e.target.closest('.modal')&&!e.target.classList.contains('close'))return;state.detail=null;render();return;}
 if(action==='closeEdit'){if(e.target.closest('form')&& !e.target.classList.contains('close'))return;state.edit=null;render();return;}
 if(el.dataset.tab){state.tab=el.dataset.tab;state.detail=null;state.edit=null;render();window.scrollTo(0,0);return;}
 if(el.dataset.form){state.formation=el.dataset.form;state.tab='analise';render();return;}
 if(el.dataset.player){state.detail=el.dataset.player;render();return;}
 if(action==='openTM'){openTM();return;}
 if(action==='add'){state.edit='new';render();return;}
 if(action==='edit'){state.edit=state.detail;state.detail=null;render();return;}
 if(action==='delete'){if(confirm('Apagar este jogador?')){db.players=db.players.filter(p=>p.id!==state.detail);persist();state.detail=null;render();notify('Jogador removido.');}return;}
 if(action==='export'){downloadRoster(db.players);return;}
 if(action==='pasteImport'){try{acceptImport(importText($('jsonInput').value,'dados.json'));}catch(err){notify(err.message,true);}return;}
 if(action==='empty'){if(!confirm('Começar um plantel vazio? Exporta os dados atuais antes.'))return;db={players:[],demo:false,updated:null,club:''};state.tab='plantel';state.formation='auto';persist();render();notify('Plantel vazio criado. Adiciona os teus jogadores.');return;}
 if(action==='demo'||action==='clear'){if(!confirm('Substituir o plantel atual pelos jogadores de demonstração? Exporta antes os dados que pretendes conservar.'))return;db={players:demoPlayers,demo:true,updated:null,club:''};state.tab='analise';state.formation='auto';persist();render();return;}
}
function onChange(e){if(e.target.id==='formationChoice'){state.formation=e.target.value;render();}if(e.target.id==='roleChoice'){state.position=e.target.value;render();}}
function onSubmit(e){if(e.target.id!=='playerForm')return;e.preventDefault();const raw=Object.fromEntries(new FormData(e.target).entries());raw.id=state.edit==='new'?'user-'+Date.now():state.edit;const p=normalizePlayer(raw);
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
