import { normalizeRoster } from './analysis.js';
export function parseCsv(text){
 const rows=[];let row=[],cell='',q=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'&&q&&text[i+1]==='"'){cell+='"';i++;}
  else if(c==='"')q=!q;
  else if(c===','&&!q){row.push(cell);cell='';}
  else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(s=>s.trim()))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(q)throw new Error('CSV com aspas por fechar.');
 row.push(cell);if(row.some(s=>s.trim()))rows.push(row);
 if(rows.length<2)throw new Error('CSV sem jogadores (precisa de cabeçalho e linhas).');
 const cols=rows.shift().map(x=>x.replace(/^\uFEFF/,'').trim().toLowerCase());
 return rows.map(cells=>Object.fromEntries(cols.map((k,i)=>[k,(cells[i]||'').trim()])));
}
export function importText(text,filename=''){
 if(text.length>10_000_000)throw new Error('Ficheiro demasiado grande (máximo 10 MB).');
 let data;
 if(filename.toLowerCase().endsWith('.csv')||(!text.trimStart().startsWith('[')&&!text.trimStart().startsWith('{')))data=parseCsv(text);
 else{try{data=JSON.parse(text);}catch(e){throw new Error('JSON inválido. Confirma que o ficheiro contém jogadores.');}}
 return normalizeRoster(data);
}
export function downloadRoster(players){
 const blob=new Blob([JSON.stringify({schema:'rjp-tm-tactics-v1',updatedAt:new Date().toISOString(),players},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='RJP_TM_Plantel_'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
}
