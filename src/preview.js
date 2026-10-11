/** Captura local de texto da página TM, sem contacto de rede nem execução de ações no jogo.
 * A identificação do adversário é PROVISÓRIA e exige confirmação humana. */
const clampText=(v,n)=>String(v??'').replace(/\r/g,'').replace(/\u0000/g,'').slice(0,n);
const same=(a,b)=>String(a||'').trim().toLocaleLowerCase('pt-PT')===String(b||'').trim().toLocaleLowerCase('pt-PT');
const tidy=s=>String(s||'').replace(/^[\s:–-]+|[\s:–-]+$/g,'').replace(/\s+/g,' ').slice(0,110);
export function parsePreviewCapture(source,club=''){
 if(!source||typeof source!=='object')throw new Error('A página importada é inválida.');
 const url=clampText(source.url,500);
 if(url && !/^https:\/\/(www\.)?trophymanager\.com(?:\/|$)/i.test(url))throw new Error('Apenas são aceites capturas do Trophy Manager.');
 const title=clampText(source.title,200),text=clampText(source.text,25000);
 if(!text.trim() && !title.trim())throw new Error('Esta página não contém texto legível. Abre a antevisão do jogo no TM.');
 const lines=[title,...text.split('\n')].map(s=>s.trim()).filter(Boolean);
 const yours=String(source.club||club||'').trim();
 let opponent='',confidence='não identificado',reason='';
 // Só usar padrões específicos. Um calendário com vários jogos não permite inferir de forma fiável um único adversário.
 for(const line of lines.slice(0,90)){
  if(line.length>150)continue;
  const m=line.match(/^(.{2,70}?)\s+(?:vs\.?|versus|×|\bX\b)\s+(.{2,70}?)(?:\s*[|—–]\s*.*)?$/i);
  if(!m)continue;
  const left=tidy(m[1]),right=tidy(m[2]);
  if(yours && same(left,yours)){opponent=right;confidence='provável';reason='Encontrado confronto com o teu clube.';break;}
  if(yours && same(right,yours)){opponent=left;confidence='provável';reason='Encontrado confronto com o teu clube.';break;}
 }
 if(!opponent){
  const m=text.match(/(?:próximo\s+(?:adversário|oponente)|next\s+opponent)\s*[:\-–]?\s*([^\n]{3,90})/i);
  if(m){opponent=tidy(m[1]);confidence='a confirmar';reason='Texto identificado perto de «próximo adversário».';}
 }
 let date='';
 const calendarLines=lines.filter(s=>/(?:próximo\s+jogo|next\s+match|preview|antevisão|match\s+preview)/i.test(s)).slice(0,7);
 const candidates=[...calendarLines,...lines.slice(0,18)].join(' ');
 const dateIso=candidates.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
 const dateEu=candidates.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/);
 if(dateIso)date=`${dateIso[1]}-${dateIso[2]}-${dateIso[3]}`;
 else if(dateEu)date=`${dateEu[3]}-${dateEu[2].padStart(2,'0')}-${dateEu[1].padStart(2,'0')}`;
 if(date && !Number.isFinite(Date.parse(date+'T12:00:00Z')))date='';
 let venue='';
 if(opponent&&yours){
  const m=lines.slice(0,90).map(s=>s.match(/^(.{2,70}?)\s+(?:vs\.?|versus|×|\bX\b)\s+(.{2,70}?)(?:\s*[|—–].*)?$/i)).find(m=>m&&(same(tidy(m[1]),yours)||same(tidy(m[2]),yours)));
  if(m)venue=same(tidy(m[1]),yours)?'casa':'fora';
 }
 const indicators=[];
 for(const line of lines){
  if(indicators.length>=6)break;
  if(line.length>=15&&line.length<=170&&/\b(formação|formation|mentalidade|mentality|estilo|style|lesionad|injur|suspens|desfalqu|preview|antevisão)\b/i.test(line)){
   if(!indicators.includes(line))indicators.push(line);
  }
 }
 return {title,url,club:yours,opponent,date,venue,confidence,reason,indicators,excerpt:lines.slice(0,28).join('\n').slice(0,3500),capturedAt:new Date().toISOString()};
}
