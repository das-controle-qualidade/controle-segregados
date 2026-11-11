<script>
'use strict';
/* ================= UTILIDADES ================= */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const pad=n=>String(n).padStart(2,'0');
const toISO=d=>d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());
const parseISO=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))};
const todayISO=()=>{const n=new Date();return n.getFullYear()+'-'+pad(n.getMonth()+1)+'-'+pad(n.getDate())};
const addDays=(d,n)=>{const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round2=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const sum=(a,k)=>a.reduce((s,o)=>s+(Number(o[k])||0),0);
const RTL=['ar'];
const RESP=['tbd','client','company','supplier'];
const RESP_KEY={tbd:'respTbd',client:'respClient',company:'respCompany',supplier:'respSupplier'};
const CURRENCIES=['BRL','USD','EUR','GBP','CNY','JPY','KRW','INR','MXN','ARS','CLP','TRY'];
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const ss={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}},del(k){try{sessionStorage.removeItem(k)}catch(e){}}};

let LANG='pt-BR';
function t(k,vars){let s=(I18N[LANG]&&I18N[LANG][k])??I18N.en[k]??I18N['pt-BR'][k]??k;if(vars)for(const v in vars)s=s.replace('{'+v+'}',vars[v]);return s}
const fmtNum=v=>new Intl.NumberFormat(LANG).format(v||0);
function fmtMoney(v){try{return new Intl.NumberFormat(LANG,{style:'currency',currency:state.settings.currency||'BRL'}).format(v||0)}catch(e){return (state.settings.currency||'')+' '+round2(v).toFixed(2)}}
function fmtMoneyShort(v){try{return new Intl.NumberFormat(LANG,{style:'currency',currency:state.settings.currency||'BRL',notation:'compact',maximumFractionDigits:1}).format(v||0)}catch(e){return fmtMoney(v)}}
const fmtDate=iso=>iso?new Intl.DateTimeFormat(LANG,{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'}).format(parseISO(iso)):'';
const fmtDT=(d,o)=>new Intl.DateTimeFormat(LANG,Object.assign({timeZone:'UTC'},o)).format(d);

/* ================= ARMAZENAMENTO LOCAL (IndexedDB) ================= */
const Store={db:null,
  open(){return new Promise((res,rej)=>{try{if(!window.indexedDB)return rej(new Error('no idb'));const r=indexedDB.open('segregados-prototipo-offline',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>{this.db=r.result;res()};r.onerror=()=>rej(r.error)}catch(e){rej(e)}})},
  get(k){return new Promise((res,rej)=>{const tx=this.db.transaction('kv','readonly').objectStore('kv').get(k);tx.onsuccess=()=>res(tx.result);tx.onerror=()=>rej(tx.error)})},
  set(k,v){return new Promise((res,rej)=>{const tx=this.db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
};
let storageOK=true;
async function persist(){if(ONLINE)return cloudPersist();if(!storageOK)return;try{await Store.set('state',state)}catch(e){storageOK=false;toast(t('storageError'),true)}}

/* ================= DADOS DE DEMONSTRAÇÃO (FICTÍCIOS) =================
   Substitua por dados reais: Administração > "Remover somente dados DEMO"
   e cadastre/importe os dados reais (ou restaure um backup JSON).            */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let x=Math.imul(seed^seed>>>15,1|seed);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296}}
function demoPhoto(kind,label,hue){
  const defect=kind==='defect';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},18%,30%)"/><stop offset="1" stop-color="hsl(${hue},20%,14%)"/></linearGradient><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d0d6"/><stop offset="1" stop-color="#7d868f"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><path d="M150 330 L230 150 L470 150 L520 330 Z" fill="url(#m)" stroke="#3a4148" stroke-width="6"/><rect x="250" y="200" width="160" height="70" rx="10" fill="#5e676f"/><circle cx="200" cy="300" r="16" fill="#3a4148"/><circle cx="470" cy="300" r="16" fill="#3a4148"/>${defect?'<circle cx="430" cy="215" r="58" fill="none" stroke="#ff3b30" stroke-width="10"/><path d="M405 200 l20 12 -14 10 22 14" fill="none" stroke="#ff3b30" stroke-width="6"/>':''}${kind==='scale'?'<rect x="150" y="340" width="340" height="40" rx="6" fill="#2b3138"/><rect x="240" y="390" width="160" height="44" rx="6" fill="#0d1a12"/><text x="320" y="422" text-anchor="middle" font-family="monospace" font-size="28" fill="#5cff8a">'+(10+label.length%30)+',4 kg</text>':''}<rect x="0" y="0" width="640" height="54" fill="rgba(242,169,0,.92)"/><text x="20" y="36" font-family="Arial" font-size="26" font-weight="700" fill="#1c1400">FOTO DEMO · ${kind==='scale'?'BALANÇA':defect?'DEFEITO':'PRODUTO'}</text><text x="20" y="455" font-family="Arial" font-size="22" fill="#fff">${esc(label)}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
function buildDemoState(){
  const r=rng(20261026);const pick=a=>a[Math.floor(r()*a.length)];
  const wpick=(a,w)=>{let x=r()*w.reduce((s,v)=>s+v,0);for(let i=0;i<a.length;i++){x-=w[i];if(x<=0)return a[i]}return a[a.length-1]};
  const base={};
  const products=[['DEMO-1001','Suporte lateral LH (demo)',12.5,1.8],['DEMO-1002','Suporte lateral RH (demo)',12.5,1.8],['DEMO-2001','Travessa dianteira (demo)',38.9,4.2],['DEMO-2002','Travessa traseira (demo)',41.3,4.6],['DEMO-3001','Base do assento (demo)',57,6.1],['DEMO-3002','Encosto 60% (demo)',64.8,5.4],['DEMO-3003','Encosto 40% (demo)',49.2,4],['DEMO-4001','Reforço de solda (demo)',8.75,.6]]
    .map(([code,model,c,weight])=>{base[code]=c;return {id:uid()+code,code,model,weight,active:true,demo:true}});
  const clients=[['Cliente Alfa (demo)','client'],['Cliente Beta (demo)','client'],['Cliente Gama (demo)','client'],['Cliente Delta (demo)','client'],['Setor Solda (demo)','internal'],['Setor Montagem (demo)','internal'],['Inspeção Final (demo)','internal']].map(([name,type])=>({id:uid()+name.length,name,type,demo:true}));
  const problems=['Solda fora de posição','Peça invertida','Fora do dimensional','Trinca na solda','Lado LH montado no RH','Amassado / deformação','Furo ausente'];
  const operators=['Operador A (demo)','Operador B (demo)','Operador C (demo)','Operador D (demo)','Operador E (demo)'];
  const descs=['Cliente informou peças sem encaixe na linha de montagem (texto demo).','Peças identificadas na inspeção de recebimento do cliente (texto demo).','Cliente devolveu lote com defeito visual (texto demo).','Reclamação registrada pelo cliente após auditoria (texto demo).'];
  const today=parseISO(todayISO());const start=addDays(today,-430);
  /* custos demo: uma carga inicial e uma planilha do RH só em janeiro do ano atual; os outros meses ficam zerados até importar */
  const costs=[],costImports=[];
  const load=(from,file,sheet,f)=>{const at=from+'T12:00:00.000Z',imp={id:uid(),at,user:'RH (demo)',file,sheet,hash:'demo-'+from,from,rows:products.length,inserted:products.length,updated:0,same:0,ignored:0,filled:0,recalc:0,demo:true};
    costImports.unshift(imp);products.forEach(p=>{base[p.code]=round2(base[p.code]*f());costs.push({id:uid(),code:p.code,model:p.model,cost:base[p.code],from,importId:imp.id,at,demo:true})})};
  const y0=start.getUTCFullYear()+'-01-01',jan=today.getUTCFullYear()+'-01-01';
  load(y0,'carga-inicial-demo.xlsx','Carga inicial (demo)',()=>1);
  if(jan>y0)load(jan,'custos-rh-janeiro-demo.xlsx','Janeiro',()=>1+(r()*.06-.02));
  const occ=[];
  for(let d=new Date(start);d<=today;d=addDays(d,1)){
    const wd=d.getUTCDay();let n=0;const p=wd===0?.08:wd===6?.2:.55;
    if(r()<p)n=1;if(r()<p*.35)n++;if(toISO(d)===toISO(today))n=2;
    for(let i=0;i<n;i++){
      const prod=wpick(products,[5,4,3,3,2,2,2,6]);const cli=wpick(clients,[5,3,2,1,4,3,2]);
      const qty=Math.max(1,Math.round(Math.pow(r(),1.8)*45)+1);const date=toISO(d);
      const resp=wpick(RESP,[35,25,30,10]);const photos=[],hue=(prod.code.charCodeAt(5)*37)%360,lab=prod.code+' · '+prod.model;
      if(r()<.6)photos.push({id:uid(),kind:'product',name:'demo-produto.svg',data:demoPhoto('product',lab,hue)});
      if(r()<.6)photos.push({id:uid(),kind:'defect',name:'demo-defeito.svg',data:demoPhoto('defect',lab,hue)});
      if(r()<.5)photos.push({id:uid(),kind:'scale',name:'demo-balanca.svg',data:demoPhoto('scale',lab,hue)});
      const c=costAt(prod.code,date,costs);
      occ.push({id:uid(),seq:0,date,originType:cli.type,client:cli.name,code:prod.code,model:prod.model,problem:pick(problems),operator:wpick(operators,[5,4,3,2,1]),clientDesc:cli.type==='client'?pick(descs):'',qty,unitCost:c.cost,costId:c.id,costFrom:c.from,totalCost:round2(qty*c.cost),destination:'Sucata',costResp:resp,photos,notes:'',createdBy:'Administrador (demo)',createdAt:new Date().toISOString(),demo:true});
    }
  }
  occ.sort((a,b)=>a.date.localeCompare(b.date)).forEach((o,i)=>o.seq=i+1);
  return {app:'segregados-prototipo',version:3,settings:{company:'Empresa Demonstração Ltda.',currency:'BRL',requireScalePhoto:false,authPassword:DEMO_PASS},
    users:[{id:'u1',username:'admin',password:'admin123',name:'Administrador (demo)',role:'admin'},{id:'u2',username:'operador',password:'operador123',name:'Inspetor (demo)',role:'operator'},{id:'u3',username:'lider',password:'lider123',name:'Líder / Analista (demo)',role:'viewer'}],
    clients,problems,destinations:['Sucata'],products,occurrences:occ,costs,costImports,costLog:[],closures:{},closureLog:[],weekDone:{},reopenCodes:[],authLog:[]};
}
function emptyState(keepUsers){return {app:'segregados-prototipo',version:3,settings:Object.assign({company:'',currency:'BRL',requireScalePhoto:false,authPassword:DEMO_PASS},state?state.settings:{}),users:keepUsers&&state?state.users:buildDemoState().users,clients:[],problems:[],destinations:['Sucata'],products:[],occurrences:[],costs:[],costImports:[],costLog:[],closures:{},closureLog:[],weekDone:{},reopenCodes:[],authLog:[]}}
/* completa dados salvos por versões anteriores; o custo do cadastro antigo vira o primeiro preço do histórico */
function migrate(s){
  ['costs','costImports','costLog','closureLog','clients','problems','destinations','products','occurrences','photoLib'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=[]});
  if(!s.closures||typeof s.closures!=='object')s.closures={};
  if(!s.weekDone||typeof s.weekDone!=='object')s.weekDone={};if(!Array.isArray(s.reopenCodes))s.reopenCodes=[];
  if(Array.isArray(s.users)&&!s.users.some(u=>u.role==='viewer')&&s.users.some(u=>u.username==='admin'&&u.password==='admin123'))s.users.push({id:'u3',username:'lider',password:'lider123',name:'Líder / Analista (demo)',role:'viewer'});
  s.settings=Object.assign({company:'',currency:'BRL',requireScalePhoto:false,authPassword:DEMO_PASS},s.settings);if(!Array.isArray(s.authLog))s.authLog=[];s.settings.requireScalePhoto=false;
  if((s.version||1)<2){
    if(s.occurrences.every(o=>o.demo)&&s.products.every(p=>p.demo)){const d=buildDemoState();d.users=s.users&&s.users.length?s.users:d.users;d.settings=Object.assign(d.settings,s.settings);return d}
    const at=new Date().toISOString(),imp={id:uid(),at,user:'Sistema',file:'Migração do cadastro de produtos',sheet:'',hash:'migracao',from:'',rows:0,inserted:0,updated:0,same:0,ignored:0,filled:0,recalc:0};
    s.products.forEach(p=>{const k=String(p.code||'').trim().toUpperCase();if(+p.unitCost>0&&!s.costs.some(c=>c.code===k)){const first=s.occurrences.filter(o=>String(o.code||'').trim().toUpperCase()===k).map(o=>o.date).sort()[0]||todayISO();s.costs.push({id:uid(),code:k,model:p.model,cost:+p.unitCost,from:first,importId:imp.id,at,demo:!!p.demo});imp.inserted++}});
    if(imp.inserted){imp.rows=imp.inserted;s.costImports.unshift(imp)}
    s.occurrences.forEach(o=>{if(!('costFrom' in o)){o.costFrom=null;o.costId=null}if(!Array.isArray(o.photos))o.photos=[]});
    s.version=2}
  if(s.version<3){if(s.occurrences.length&&s.occurrences.every(o=>o.demo)&&s.products.every(p=>p.demo)){const d=buildDemoState();d.users=s.users&&s.users.length?s.users:d.users;d.settings=Object.assign(d.settings,s.settings);return d}
    s.version=3}
  return s}

/* ================= ESTADO ================= */
let state=null,currentUser=null;
const ui={period:'month',ref:todayISO(),origin:'all',evo:'ng',hist:{q:'',from:'',to:'',origin:'all',client:'',problem:'',resp:'',page:1,year:0,ym:'',wk:0},prodQ:'',formPhotos:[],editingId:null,draft:null};

/* ================= I18N APLICAÇÃO ================= */
function fillLangSelect(sel){sel.innerHTML=LANGS.map(([c,n])=>`<option value="${c}" ${c===LANG?'selected':''}>${c.toUpperCase()} · ${n}</option>`).join('')}
function applyLang(code){
  LANG=I18N[code]?code:'pt-BR';ls.set('seg_lang',LANG);
  document.documentElement.lang=LANG;document.documentElement.dir=RTL.includes(LANG)?'rtl':'ltr';
  $$('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  $('#lu').placeholder=t(ONLINE?'cloudEmail':'username');if(ONLINE&&$('label[for=lu]'))$('label[for=lu]').textContent=t('cloudEmail');fillLangSelect($('#loginLang'));fillLangSelect($('#appLang'));
  $('#loginLang').setAttribute('aria-label',t('language'));$('#appLang').setAttribute('aria-label',t('language'));
  document.title='DAS — '+t('appName');
  if(currentUser)renderShell();
}

/* ================= TOAST / MODAL ================= */
function toast(msg,err){const d=document.createElement('div');d.className='toast'+(err?' err':'');d.textContent=msg;$('#toast').appendChild(d);setTimeout(()=>d.remove(),3200)}
function openModal(html,wide){const m=$('#modal');m.innerHTML=`<div class="modal-card ${wide?'wide':''}" role="dialog" aria-modal="true">${html}</div>`;m.hidden=false;document.body.style.overflow='hidden';
  $$('[data-close]',m).forEach(b=>b.onclick=closeModal)}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML='';document.body.style.overflow='';document.body.classList.remove('print-modal')}
$('#modal').addEventListener('mousedown',e=>{if(e.target.id==='modal')closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#lightbox').hidden)$('#lightbox').hidden=true;else if(!$('#modal').hidden)closeModal()}});
function askBox(msg,input){return new Promise(res=>{const d=document.createElement('div');d.className='ask-ov';
  d.innerHTML=`<form class="modal-card" role="alertdialog" aria-modal="true"><div class="modal-body" style="white-space:pre-line">${esc(msg)}${input?'<textarea name="v" rows="3" maxlength="300" style="width:100%;margin-top:10px"></textarea>':''}</div><div class="modal-foot"><span style="flex:1"></span><button type="button" class="btn" data-n>${esc(t('cancel'))}</button><button class="btn btn-primary">OK</button></div></form>`;
  document.body.appendChild(d);const f=$('form',d),end=v=>{d.remove();document.removeEventListener('keydown',esc2,true);res(v)},esc2=e=>{if(e.key==='Escape'){e.stopPropagation();end(input?null:false)}};
  document.addEventListener('keydown',esc2,true);$('[data-n]',d).onclick=()=>end(input?null:false);f.onsubmit=e=>{e.preventDefault();end(input?f.v.value:true)};(input?f.v:$('.btn-primary',d)).focus()})}
const askYes=msg=>askBox(msg,false),askText=msg=>askBox(msg,true);
function lightbox(src){const lb=$('#lightbox');$('img',lb).src=src;lb.hidden=false}
$('#lightbox').onclick=()=>$('#lightbox').hidden=true;

/* ================= LOGIN ================= */
$('#loginForm').addEventListener('submit',e=>{e.preventDefault();
  const u=$('#lu').value.trim().toLowerCase(),p=$('#lp').value;
  if(ONLINE){cloudLogin(u,p);return}
  const user=state.users.find(x=>x.username.toLowerCase()===u&&x.password===p);
  if(!user){$('#loginErr').textContent=t('loginError');return}
  $('#loginErr').textContent='';currentUser=user;ss.set('seg_user',user.id);$('#lp').value='';enterApp();backupReminder()});
$$('[data-fill]').forEach(c=>c.onclick=()=>{const u=c.dataset.fill;$('#lu').value=u;$('#lp').value=u+'123'});
$('#loginLang').onchange=e=>applyLang(e.target.value);
$('#appLang').onchange=e=>applyLang(e.target.value);
$('#logoutBtn').onclick=()=>{if(ONLINE)cloudLogout();currentUser=null;ss.del('seg_user');$('#app').hidden=true;$('#login').hidden=false;location.hash=''};
function enterApp(){$('#login').hidden=true;$('#app').hidden=false;if(!location.hash||location.hash==='#')location.hash='#/dashboard';else renderShell()}
window.addEventListener('hashchange',()=>{if(currentUser)renderShell()});

/* ================= SHELL / NAVEGAÇÃO ================= */
const ICONS={
 dashboard:'<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
 new:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
 history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/>',
 products:'<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M14.5 9.8c-.4-.8-1.3-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.7s1.1 1.4 2.5 1.7 2.5.7 2.5 1.7-1.1 1.7-2.5 1.7c-1.2 0-2.1-.5-2.5-1.2M12 7.6v8.8M5.5 12h.01M18.5 12h.01"/>',
 costs:'<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.6-3-1.5M12 6v2M12 16v2"/>',
 photos:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
 data:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
 admin:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'};
const ROUTES={dashboard:['navDashboard',renderDashboard],new:['navNew',renderForm],history:['navHistory',renderHistory],photos:['navPhotos',renderPhotos],products:['navProducts',renderProducts],costs:['navCosts',renderCosts],data:['navData',renderData],admin:['navAdmin',renderAdmin]};
function route(){const h=location.hash.replace(/^#\/?/,'').split('/');return {name:ROUTES[h[0]]?h[0]:'dashboard',arg:h[1]}}
document.addEventListener('click',e=>{if(e.target.closest('[data-kgo]'))location.hash='#/history'});
/* cor de cada indicador: ocorrências azul, peças NG vermelho, custo laranja, sem custo rosa, novos verde, demais roxo */
const KC={kpiOcc:'k1',kLines:'k1',kCodes:'k1',kSame:'k1',kpiNg:'k2',kConflict:'k2',kInvalid:'k2',totalCost:'k3',kpiCost:'k3',kUpdate:'k3',kNoCost:'k6',kInsert:'k5',kFilled:'k5'};
const kc=l=>KC[l]||'k4';
function renderShell(){
  const r=route();
  $('#nav').innerHTML=Object.keys(ROUTES).filter(k=>(k!=='admin'||currentUser.role==='admin')&&(k!=='new'||canEdit())).map(k=>`<a href="#/${k}" class="${r.name===k?'active':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>${esc(t(ROUTES[k][0]))}</a>`).join('');
  $('#whoName').textContent=currentUser.name;$('#whoRole').textContent=roleLabel(currentUser.role);
  $('#brandCompany').textContent=state.settings.company||'';
  $('#bannerText').textContent=ONLINE?t('onlineBanner'):t('offlineBanner')+(storageOK?'':' — '+t('storageError'));
  $('#viewTitle').textContent=(r.name==='products'?'💵 ':'')+(r.name==='new'&&r.arg?t('formEdit'):t(ROUTES[r.name][0]));
  ROUTES[r.name][1](r.arg);
}
const demoBadge=o=>o&&o.demo?` <span class="badge" title="${esc(t('demoDataNote'))}">${esc(t('demoBadge'))}</span>`:'';
const respLabel=k=>t(RESP_KEY[k]||'respTbd');
const originLabel=k=>t(k==='internal'?'originInternal':'originClient');

/* ================= PERÍODOS ================= */
function periodRange(type,ref){if(type==='range')return {s:ui.rde,e:ui.rate};const d=parseISO(ref);let s,e;
  if(type==='day'){s=e=d}
  else if(type==='week'){s=addDays(d,-((d.getUTCDay()+6)%7));e=addDays(s,6)}
  else if(type==='month'){s=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));e=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0))}
  else{s=new Date(Date.UTC(d.getUTCFullYear(),0,1));e=new Date(Date.UTC(d.getUTCFullYear(),11,31))}
  return {s:toISO(s),e:toISO(e)}}
const rangeDays=()=>Math.round((parseISO(ui.rate)-parseISO(ui.rde))/864e5)+1;
function shiftedRef(dir){const d=parseISO(ui.ref);
  if(ui.period==='day')return toISO(addDays(d,dir));
  if(ui.period==='week')return toISO(addDays(d,7*dir));
  if(ui.period==='month')return toISO(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+dir,1)));
  return toISO(new Date(Date.UTC(d.getUTCFullYear()+dir,0,1)))}
function shiftRef(dir){if(ui.period==='range'){const n=rangeDays()*dir;ui.rde=toISO(addDays(parseISO(ui.rde),n));ui.rate=toISO(addDays(parseISO(ui.rate),n))}else ui.ref=shiftedRef(dir)}
function prevRange(){if(ui.period==='range'){const n=rangeDays();return {s:toISO(addDays(parseISO(ui.rde),-n)),e:toISO(addDays(parseISO(ui.rde),-1))}}return periodRange(ui.period,shiftedRef(-1))}
function periodLabel(){const r=periodRange(ui.period,ui.ref),d=parseISO(ui.ref);
  if(ui.period==='range')return fmtDate(r.s)+' – '+fmtDate(r.e);
  if(ui.period==='day')return fmtDT(d,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  if(ui.period==='week')return t('periodWeek')+': '+fmtDate(r.s)+' – '+fmtDate(r.e);
  if(ui.period==='month')return fmtDT(d,{month:'long',year:'numeric'});
  return String(d.getUTCFullYear())}
function evoBuckets(){const d=parseISO(ui.ref),b=[];
  if(ui.period==='range'){if(rangeDays()<=62){for(let x=parseISO(ui.rde);toISO(x)<=ui.rate;x=addDays(x,1))b.push({s:toISO(x),e:toISO(x),label:fmtDT(x,{day:'2-digit',month:'2-digit'}),full:fmtDate(toISO(x))})}
    else{let x=parseISO(ui.rde.slice(0,8)+'01');while(toISO(x)<=ui.rate){const e=new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0)),s=toISO(x)<ui.rde?ui.rde:toISO(x),ee=toISO(e)>ui.rate?ui.rate:toISO(e);b.push({s,e:ee,label:fmtDT(x,{month:'short',year:'2-digit'}),full:fmtDT(x,{month:'long',year:'numeric'})});x=addDays(e,1)}}}
  else if(ui.period==='day'){for(let i=13;i>=0;i--){const x=addDays(d,-i);b.push({s:toISO(x),e:toISO(x),label:fmtDT(x,{day:'2-digit',month:'2-digit'}),full:fmtDate(toISO(x)),hl:i===0})}}
  else if(ui.period==='week'){const r=periodRange('week',ui.ref);for(let i=0;i<7;i++){const x=addDays(parseISO(r.s),i);b.push({s:toISO(x),e:toISO(x),label:fmtDT(x,{weekday:'short'}),full:fmtDate(toISO(x))})}}
  else if(ui.period==='month'){const r=periodRange('month',ui.ref);for(let x=parseISO(r.s);toISO(x)<=r.e;x=addDays(x,1))b.push({s:toISO(x),e:toISO(x),label:String(x.getUTCDate()),full:fmtDate(toISO(x))})}
  else{for(let m=0;m<12;m++){const s=new Date(Date.UTC(d.getUTCFullYear(),m,1)),e=new Date(Date.UTC(d.getUTCFullYear(),m+1,0));b.push({s:toISO(s),e:toISO(e),label:fmtDT(s,{month:'short'}),full:fmtDT(s,{month:'long',year:'numeric'})})}}
  return b}

/* ================= GRÁFICOS (HTML/CSS, offline) ================= */
function niceMax(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v)));const n=v/p;return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p}
function vbars(items,fmt,fmtAxis,color,lbl){lbl=lbl||fmt;const max=niceMax(Math.max(0,...items.map(i=>i.value)));const step=Math.ceil(items.length/16);
  let grid='';for(let i=0;i<=4;i++){const v=max*i/4;grid+=`<div style="bottom:${i*25}%"><span>${esc(fmtAxis(v))}</span></div>`}
  return `<div class="vchart ${items.length>18?'dense':''}" style="${color?'--vb:'+color:''}"><div class="vgrid">${grid}</div><div class="vbars">${items.map((it,i)=>`<div class="vb ${it.hl?'hl':''}" data-vi="${i}" title="${esc(it.full+': '+fmt(it.value))}">${it.value?`<span class="vb-v">${esc(lbl(it.value))}</span>`:''}<div class="vb-bar" style="height:${(it.value/max*100).toFixed(2)}%"></div><span class="vb-x">${i%step===0?esc(it.label):''}</span></div>`).join('')}</div></div>`}
function hbars(items,fmt,sub,alt){if(!items.length)return `<div class="empty">${esc(t('noData'))}</div>`;const max=Math.max(...items.map(i=>i.value))||1;
  return `<div class="hbars">${items.map(it=>`<div class="hb ${alt?'alt':''}"><div class="hb-label" title="${esc(it.label)}">${esc(it.label)}</div><div class="hb-track"><div class="hb-fill" style="width:${(it.value/max*100).toFixed(1)}%"></div></div><div class="hb-val">${esc(fmt(it.value))}${sub?`<small>${esc(sub(it))}</small>`:''}</div></div>`).join('')}</div>`}
function groupBy(list,keyFn){const m=new Map();for(const o of list){const k=keyFn(o);const g=m.get(k)||{key:k,occ:0,ng:0,cost:0};g.occ++;g.ng+=o.qty;g.cost+=+o.totalCost||0;m.set(k,g)}return [...m.values()]}
/* Sequência de erros: dias de produção seguidos (dias com alguma ocorrência no período)
   em que o mesmo operador teve ocorrência. Dias sem nenhuma ocorrência não quebram a sequência. */
function streaks(list){const days=[...new Set(list.map(o=>o.date))].sort(),ix={},by={};days.forEach((d,i)=>ix[d]=i);
  list.forEach(o=>{const v=String(o.operator||'').trim();if(!v)return;const k=v.toLowerCase(),p=by[k]||(by[k]={name:v,days:{}}),x=p.days[o.date]||(p.days[o.date]={n:0,q:0});x.n++;x.q+=o.qty});
  return Object.values(by).map(p=>{let best=null,cur=null;Object.keys(p.days).sort().forEach(d=>{const x=p.days[d];if(cur&&ix[d]===ix[cur.e]+1){cur.e=d;cur.len++;cur.n+=x.n;cur.q+=x.q}else cur={s:d,e:d,len:1,n:x.n,q:x.q};if(!best||cur.len>best.len||(cur.len===best.len&&cur.n>best.n))best=Object.assign({},cur)});return Object.assign(best,{name:p.name,total:Object.keys(p.days).length})}).sort((a,b)=>b.len-a.len||b.n-a.n||a.name.localeCompare(b.name))}

/* ================= DASHBOARD ================= */
/* Carregar por período (só online). d = data mais antiga que a tela precisa; '' = todo o histórico */
const loadedFrom=()=>ONLINE&&!CLOUD.all?CLOUD.from:'';
const needLoad=d=>ONLINE&&!CLOUD.all&&(!d||d<CLOUD.from);
async function ensureFrom(d){while(needLoad(d))await cloudEnsureFrom(d)}
const lpBox=()=>`<div class="card empty">⏳ ${esc(t('lpLoading'))}</div>`;
function lazy(d,again){if(!needLoad(d))return false;cloudEnsureFrom(d).then(again,e=>{console.warn(e);toast(t('cloudLoadErr'),true)});return true}
function guardFrom(d,again){if(!needLoad(d))return false;$('#view').innerHTML=lpBox();lazy(d,again);return true}
const lpNote=()=>loadedFrom()?`<span class="note">📅 ${esc(t('lpSince',{d:fmtDate(loadedFrom())}))}</span> <button class="btn btn-sm" data-lpall>${esc(t('lpAllBtn'))}</button>`:'';
document.addEventListener('click',e=>{if(e.target.closest('[data-lpall]')){const v=$('#view');if(v)v.innerHTML=lpBox();ensureFrom('').then(()=>{toast(t('lpAllDone'));renderShell()},er=>{console.warn(er);toast(t('cloudLoadErr'),true)})}});
function renderDashboard(){
  if(ui.period==='range'&&(!ui.rde||!ui.rate||ui.rde>ui.rate)){ui.rate=todayISO();ui.rde=toISO(addDays(parseISO(ui.rate),-29))}
  const r=periodRange(ui.period,ui.ref),pr=prevRange(),bk0=evoBuckets()[0];
  if(guardFrom([r.s,pr.s,bk0?bk0.s:r.s].sort()[0],renderDashboard))return;
  const fit=o=>(ui.origin==='all'||o.originType===ui.origin)&&(!ui.fcode||normCode(o.code)===ui.fcode)&&(!ui.fmodel||o.model===ui.fmodel);
  const all=state.occurrences.filter(fit);
  const list=all.filter(o=>o.date>=r.s&&o.date<=r.e),plist=all.filter(o=>o.date>=pr.s&&o.date<=pr.e);
  const nOcc=list.length,nNg=sum(list,'qty'),cost=round2(sum(list,'totalCost')),noCost=list.filter(o=>!hasCost(o)).length;
  const buckets=evoBuckets().map(b=>{const l=all.filter(o=>o.date>=b.s&&o.date<=b.e);return Object.assign(b,{value:ui.evo==='ng'?sum(l,'qty'):ui.evo==='occ'?l.length:round2(sum(l,'totalCost'))})});
  const evoFmt=ui.evo==='cost'?fmtMoney:fmtNum,evoAxis=ui.evo==='cost'?fmtMoneyShort:fmtNum;
  const clients=groupBy(list,o=>o.client).sort((a,b)=>b.ng-a.ng).slice(0,8);
  const defects=groupBy(list,o=>o.problem).sort((a,b)=>b.occ-a.occ||b.ng-a.ng).slice(0,8);
  const prods=groupBy(list,o=>o.code).sort((a,b)=>b.ng-a.ng);
  const prevM={};groupBy(plist,o=>o.model).forEach(g=>prevM[g.key]=g);
  const models=groupBy(list,o=>o.model).sort((a,b)=>b.ng-a.ng).slice(0,10);
  const modelsOcc=groupBy(list,o=>o.model).sort((a,b)=>b.occ-a.occ||b.ng-a.ng).slice(0,10);
  const st=streaks(list).slice(0,10);
  const resp=RESP.map(k=>{const l=list.filter(o=>o.costResp===k);return {label:respLabel(k),value:round2(sum(l,'totalCost')),ng:sum(l,'qty'),occ:l.length}}).filter(x=>x.occ>0).sort((a,b)=>b.value-a.value);
  const modelOf=c=>{const p=state.products.find(p=>p.code===c);if(p)return p.model;const o=list.find(o=>o.code===c);return o?o.model:''};
  const hasDemo=state.occurrences.some(o=>o.demo);
  const codesAll=[...new Set(state.occurrences.map(o=>normCode(o.code)))].sort(),modelsAll=[...new Set(state.occurrences.map(o=>o.model).filter(Boolean))].sort();
  const lastD=nOcc?'':all.map(o=>o.date).filter(d=>d<r.s).sort().pop()||'';
  const pctOf=(a,b)=>b?(a>=b?'+':'')+fmtNum(round2((a-b)/b*100))+'%':'—';
  $('#view').innerHTML=`
  ${hasDemo?`<div class="note no-print" style="margin-bottom:12px"><span class="badge">${esc(t('demoBadge'))}</span> ${esc(t('demoDataNote'))}</div>`:''}
  <div class="toolbar">
    <div class="seg" role="group">${['day','week','month','year','range'].map(p=>`<button data-period="${p}" class="${ui.period===p?'on':''}">${esc(t('period'+p[0].toUpperCase()+p.slice(1)))}</button>`).join('')}</div>
    <button class="btn" id="prevP" title="${esc(t('previous'))}" aria-label="${esc(t('previous'))}">${document.dir==='rtl'?'›':'‹'}</button>
    ${ui.period==='range'?`<input type="date" id="rDe" value="${ui.rde}" aria-label="${esc(t('from'))}"><input type="date" id="rAte" value="${ui.rate}" aria-label="${esc(t('to'))}">`:`<input type="date" id="refDate" value="${ui.ref}" aria-label="${esc(t('refDate'))}" title="${esc(t('refDate'))}">`}
    <button class="btn" id="nextP" title="${esc(t('next'))}" aria-label="${esc(t('next'))}">${document.dir==='rtl'?'‹':'›'}</button>
    <button class="btn" id="todayP">${esc(t('today'))}</button>
    <select id="originF" aria-label="${esc(t('originType'))}"><option value="all">${esc(t('originType'))}: ${esc(t('all'))}</option><option value="client" ${ui.origin==='client'?'selected':''}>${esc(t('originClient'))}</option><option value="internal" ${ui.origin==='internal'?'selected':''}>${esc(t('originInternal'))}</option></select>
    <select id="codeF" aria-label="${esc(t('code'))}"><option value="">${esc(t('code'))}: ${esc(t('all'))}</option>${codesAll.map(c=>`<option ${c===ui.fcode?'selected':''}>${esc(c)}</option>`).join('')}</select>
    <select id="modelF" aria-label="${esc(t('model'))}"><option value="">${esc(t('model'))}: ${esc(t('all'))}</option>${modelsAll.map(c=>`<option ${c===ui.fmodel?'selected':''}>${esc(c)}</option>`).join('')}</select>
    <span class="sp"></span><span class="period-label">${esc(periodLabel())}</span>
  </div>
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card kpi vivid k1" data-kgo><div class="lbl">${esc(t('kpiOcc'))}</div><div class="val">${fmtNum(nOcc)}</div><div class="sub">${esc(t('kpiOccSub'))}</div></div>
    <div class="card kpi vivid k2" data-kgo><div class="lbl">${esc(t('kpiNg'))}</div><div class="val">${fmtNum(nNg)}</div><div class="sub">${esc(t('kpiNgSub'))}</div></div>
    <div class="card kpi vivid k3" data-kgo><div class="lbl">${esc(t('kpiCost'))}</div><div class="val">${fmtMoney(cost)}</div><div class="sub">${esc(noCost?t('kpiNoCostSub',{n:fmtNum(noCost)}):t('kpiCostSub'))}</div></div>
    <div class="card kpi vivid k4" data-kgo><div class="lbl">${esc(t('kpiAvg'))}</div><div class="val">${fmtMoney(nOcc?cost/nOcc:0)}</div><div class="sub">${esc(t('kpiAvgSub'))}</div></div>
  </div>
  ${lastD?`<div class="card no-print" style="margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">📭 ${esc(t('dbEmpty',{d:fmtDate(lastD)}))}<button class="btn btn-sm btn-primary" data-golast="${lastD}">${esc(t('dbGoLast'))}</button></div>`:''}<p class="note no-print" style="margin:-6px 0 10px">🖱 ${esc(t('dbHint'))}</p>
  <div class="card" style="margin-bottom:16px" data-dbl="day"><h3>${esc(t('chEvolution'))}<span class="sp"></span>
    <span class="seg">${[['ng','metricNg'],['occ','metricOcc'],['cost','metricCost']].map(([k,l])=>`<button data-evo="${k}" class="${ui.evo===k?'on':''}">${esc(t(l))}</button>`).join('')}</span></h3>
    ${vbars(buckets,evoFmt,evoAxis,{ng:'#dc2626',occ:'#2563eb',cost:'#ea580c'}[ui.evo],ui.evo==='cost'?evoAxis:evoFmt)}</div>
  <div class="grid g2" style="margin-bottom:16px">
    <div class="card" data-dbl="model"><h3>${esc(t('ch1'))}</h3>${hbars(models.map(c=>({label:c.key||'—',value:c.ng,p:prevM[c.key]?prevM[c.key].ng:0})),v=>fmtNum(v)+' '+t('pieces'),i=>t('prevPeriodShort')+': '+fmtNum(i.p)+' ('+pctOf(i.value,i.p)+')')}<p class="hint">${esc(t('ch1Hint',{a:fmtDate(pr.s),b:fmtDate(pr.e)}))}</p></div>
    <div class="card" data-dbl="model"><h3>${esc(t('ch2'))}</h3>${hbars(modelsOcc.map(c=>({label:c.key||'—',value:c.occ,ng:c.ng})),v=>fmtNum(v)+' '+t('occurrencesLower'),i=>fmtNum(i.ng)+' '+t('pieces'),true)}<p class="hint">${esc(t('ch2Hint'))}</p></div>
  </div>
  <div class="card" style="margin-bottom:16px"><h3>${esc(t('ch3'))}</h3>${st.length?`<div class="table-wrap"><table><thead><tr><th>#</th><th>${esc(t('operator'))}</th><th class="num">${esc(t('stDays'))}</th><th class="num">${esc(t('stOcc'))}</th><th class="num">${esc(t('kpiNg'))}</th><th>${esc(t('stPeriod'))}</th><th class="num">${esc(t('stTotal'))}</th></tr></thead><tbody>${st.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td class="num"><b>${fmtNum(x.len)}</b></td><td class="num">${fmtNum(x.n)}</td><td class="num">${fmtNum(x.q)}</td><td>${fmtDate(x.s)}${x.e!==x.s?' – '+fmtDate(x.e):''}</td><td class="num">${fmtNum(x.total)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${esc(t('stNone'))}</div>`}<p class="hint">${esc(t('ch3Hint'))}</p></div>
  <div class="grid g2" style="margin-bottom:16px">
    <div class="card" data-dbl="client"><h3>${esc(t('chClients'))}</h3>${hbars(clients.map(c=>({label:c.key,value:c.ng,occ:c.occ,cost:c.cost})),v=>fmtNum(v)+' '+t('pieces'),i=>fmtNum(i.occ)+' '+t('occurrencesLower'))}</div>
    <div class="card" data-dbl="problem"><h3>${esc(t('chDefects'))}</h3>${hbars(defects.map(c=>({label:c.key,value:c.occ,ng:c.ng})),v=>fmtNum(v)+' '+t('occurrencesLower'),i=>fmtNum(i.ng)+' '+t('pieces'),true)}</div>
  </div>
  <div class="grid g2" style="margin-bottom:16px">
    <div class="card"><h3>${esc(t('chResp'))}</h3>${hbars(resp,fmtMoney,i=>fmtNum(i.ng)+' '+t('pieces')+' · '+fmtNum(i.occ)+' '+t('occurrencesLower'),true)}<p class="hint">${esc(t('respHint'))}</p></div>
    <div class="card" data-dbl="model"><h3>${esc(t('topLoss'))}</h3>${hbars(groupBy(list.filter(hasCost),o=>o.model).sort((a,b)=>b.cost-a.cost).slice(0,8).map(c=>({label:c.key||'—',value:round2(c.cost),ng:c.ng})),fmtMoney,i=>fmtNum(i.ng)+' '+t('pieces'))}</div>
  </div>
  <div class="card"><h3>${esc(t('chTable'))}</h3>
   ${prods.length?`<div class="table-wrap"><table><thead><tr><th>${esc(t('code'))}</th><th>${esc(t('model'))}</th><th class="num">${esc(t('kpiOcc'))}</th><th class="num">${esc(t('qtyNg'))}</th><th class="num">${esc(t('totalCost'))}</th></tr></thead>
   <tbody>${prods.map(p=>`<tr><td>${esc(p.key)}</td><td>${esc(modelOf(p.key))}</td><td class="num">${fmtNum(p.occ)}</td><td class="num">${fmtNum(p.ng)}</td><td class="num">${fmtMoney(p.cost)}</td></tr>`).join('')}</tbody>
   <tfoot><tr><td colspan="2">${esc(t('total'))}</td><td class="num">${fmtNum(nOcc)}</td><td class="num">${fmtNum(nNg)}</td><td class="num">${fmtMoney(cost)}</td></tr></tfoot></table></div>`:`<div class="empty">${esc(t('noData'))}</div>`}
  </div>`;
  $$('[data-period]').forEach(b=>b.onclick=()=>{ui.period=b.dataset.period;renderDashboard()});
  $$('[data-evo]').forEach(b=>b.onclick=()=>{ui.evo=b.dataset.evo;renderDashboard()});
  $$('[data-golast]').forEach(b=>b.onclick=()=>{if(ui.period==='range')ui.period='month';ui.ref=b.dataset.golast;renderDashboard()});
  ui.dash={all,list,buckets,r};
  $$('[data-dbl]').forEach(card=>card.addEventListener('dblclick',e=>{const fld=card.dataset.dbl,D=ui.dash;let occ,lib,title;
    if(fld==='day'){const b=e.target.closest('[data-vi]');if(!b)return;const k=D.buckets[+b.dataset.vi];occ=D.all.filter(o=>o.date>=k.s&&o.date<=k.e);lib=libList().filter(o=>o.date>=k.s&&o.date<=k.e);title=k.full}
    else{const hb=e.target.closest('.hb');if(!hb)return;const key=hb.querySelector('.hb-label').getAttribute('title'),val=o=>key==='—'?!o[fld]:o[fld]===key;occ=D.list.filter(val);lib=fld==='client'?[]:libList().filter(o=>val(o)&&o.date>=D.r.s&&o.date<=D.r.e);title=key}
    photosModal(title,occ,lib)}));
  $('#prevP').onclick=()=>{shiftRef(-1);renderDashboard()};$('#nextP').onclick=()=>{shiftRef(1);renderDashboard()};
  $('#todayP').onclick=()=>{ui.ref=todayISO();if(ui.period==='range'){const n=rangeDays();ui.rate=todayISO();ui.rde=toISO(addDays(parseISO(ui.rate),1-n))}renderDashboard()};
  if($('#refDate'))$('#refDate').onchange=e=>{if(e.target.value){ui.ref=e.target.value;renderDashboard()}};
  if($('#rDe')){$('#rDe').onchange=e=>{if(e.target.value){ui.rde=e.target.value;renderDashboard()}};$('#rAte').onchange=e=>{if(e.target.value){ui.rate=e.target.value;renderDashboard()}}}
  $('#originF').onchange=e=>{ui.origin=e.target.value;renderDashboard()};
  $('#codeF').onchange=e=>{ui.fcode=e.target.value;renderDashboard()};
  $('#modelF').onchange=e=>{ui.fmodel=e.target.value;renderDashboard()};
}

/* ================= CADASTRO DE OCORRÊNCIA ================= */
function readImage(file,max=1280){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const s=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.78))};img.onerror=rej;img.src=fr.result};fr.onerror=rej;fr.readAsDataURL(file)})}
function renderForm(editId){
  if(!canEdit()){$('#view').innerHTML=viewerCard();return}
  const editing=editId?state.occurrences.find(o=>o.id===editId):null;
  if(editId&&!editing){location.hash='#/new';return}
  if(ui.editingId!==(editId||null)||!ui.draft){ui.editingId=editId||null;ui.formPhotos=editing?editing.photos.map(p=>Object.assign({},p)):[];
    ui.draft=editing?Object.assign({},editing,{ucTouched:!!editing.costManual,unitCostIn:editing.costManual?editing.unitCost:''}):{date:ui.newDate||todayISO(),originType:'client',client:'',code:'',model:'',problem:'',operator:'',clientDesc:'',qty:'',destination:state.destinations[0]||'Sucata',costResp:'tbd',notes:''};ui.newDate=null}
  const d=ui.draft,lockR=editing&&isLocked(editing.date)?lockedReason(editing.date):'';
  /* campos de escolher ou digitar: a lista sugere o que já existe e aceita valores novos */
  const dl=(id,vals)=>`<datalist id="${id}">${[...new Set(vals.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b))).map(v=>`<option value="${esc(v)}">`).join('')}</datalist>`;
  const prodL=state.products.filter(p=>p.active!==false);
  const destOpts=state.destinations.map(p=>`<option ${p===d.destination?'selected':''}>${esc(p)}</option>`).join('')+(d.destination&&!state.destinations.includes(d.destination)?`<option selected>${esc(d.destination)}</option>`:'');
  const thumbs=kind=>ui.formPhotos.filter(p=>p.kind===kind).map(p=>`<div class="thumb" data-zoom="${esc(p.id)}"><img src="${esc(p.data)}" alt=""><button type="button" data-rmphoto="${esc(p.id)}" aria-label="${esc(t('remove'))}">×</button></div>`).join('');
  const req=state.settings.requireScalePhoto,wk=d.date?weekOfMonth(d.date):0;
  $('#view').innerHTML=`<form id="occForm" class="card form-grid" novalidate autocomplete="off">
   <h2 class="span3" style="font-size:17px">${esc(editing?t('formEdit')+' #'+editing.seq:t('formNew'))}${demoBadge(editing)}</h2>${lockR?`<div class="banner span3" style="display:block;border-radius:8px;border:1px solid #f0dc9c">${esc(lockR==='month'?t('lockedMonthBanner',{m:ymLabel(editing.date.slice(0,7))}):t('lockedWeekBanner',{w:t('weekOfMonth',{n:weekOfMonth(editing.date)})}))}</div>`:''}
   <div class="field"><label>${esc(t('date'))} <span class="req">*</span></label><input type="date" name="date" value="${esc(d.date)}" required><div class="hint" id="wkHint">${wk?esc(t('weekOfMonth',{n:wk})+' · '+fmtDT(parseISO(d.date),{month:'long',year:'numeric'})):''}</div></div>
   <div class="field"><label>${esc(t('originType'))} <span class="req">*</span></label><div class="seg-inline"><label><input type="radio" name="originType" value="client" ${d.originType==='client'?'checked':''}>${esc(t('originClient'))}</label><label><input type="radio" name="originType" value="internal" ${d.originType==='internal'?'checked':''}>${esc(t('originInternal'))}</label></div></div>
   <div class="field"><label>${esc(t('clientOrigin'))} <span class="req">*</span></label><input type="text" name="client" list="dlCli" maxlength="120" value="${esc(d.client)}" placeholder="${esc(t('typeOrPick'))}" required>${dl('dlCli',state.clients.filter(c=>c.type===d.originType).map(c=>c.name))}</div>
   <div class="field"><label>${esc(t('code'))} <span class="req">*</span></label><input type="text" name="code" list="dlCode" maxlength="60" value="${esc(d.code)}" placeholder="${esc(t('typeOrPick'))}" required>${dl('dlCode',prodL.map(p=>p.code))}<div class="hint" id="codeHint"></div></div>
   <div class="field"><label>${esc(t('model'))} <span class="req">*</span></label><input type="text" name="model" list="dlModel" maxlength="120" value="${esc(d.model)}" placeholder="${esc(t('typeOrPick'))}">${dl('dlModel',prodL.map(p=>p.model).concat(state.occurrences.map(o=>o.model)))}</div>
   <div class="field"><label>${esc(t('problem'))} <span class="req">*</span></label><input type="text" name="problem" list="dlProb" maxlength="160" value="${esc(d.problem)}" placeholder="${esc(t('typeOrPick'))}" required>${dl('dlProb',state.problems)}</div>
   <div class="field"><label>${esc(t('operator'))}</label><input type="text" name="operator" list="dlOps" maxlength="80" value="${esc(d.operator||'')}" placeholder="${esc(t('typeOrPick'))}">${dl('dlOps',state.occurrences.map(o=>o.operator))}<div class="hint">${esc(t('operatorHint'))}</div></div>
   <div class="field span2"><label>${esc(t('clientDesc'))}</label><textarea name="clientDesc" rows="3">${esc(d.clientDesc)}</textarea></div>
   <div class="hint span3">${esc(t('typeHint'))}</div>
   <div class="section-title">${esc(t('qtyNg'))} · ${esc(t('totalCost'))}</div>
   <div class="field"><label>${esc(t('qtyNg'))} <span class="req">*</span></label><input type="number" name="qty" min="1" step="1" inputmode="numeric" value="${esc(d.qty)}" required></div>
   <div class="field"><label>${esc(t('unitCost'))} (${esc(state.settings.currency)})</label><div style="display:flex;gap:6px"><input type="number" name="unitCostIn" id="unitIn" min="0" step="0.01" inputmode="decimal" value="${esc(d.ucTouched?d.unitCostIn:'')}" placeholder="—" style="flex:1"><button type="button" class="btn btn-sm" id="ucReset" title="${esc(t('usePlanCost'))}" ${d.ucTouched?'':'hidden'}>↺</button></div><div class="hint" id="unitHint"></div></div>
   <div class="field"><label>${esc(t('totalCost'))}</label><div class="calc" id="totalOut">—</div><div class="hint">${esc(t('totalHint'))}</div></div>
   <div class="field"><label>${esc(t('destination'))} <span class="req">*</span></label><select name="destination" required>${destOpts}</select><div class="hint">${esc(t('destHint'))}</div></div>
   <div class="field span2"><label>${esc(t('costResp'))} <span class="req">*</span></label><select name="costResp" required>${RESP.map(k=>`<option value="${k}" ${d.costResp===k?'selected':''}>${esc(respLabel(k))}</option>`).join('')}</select><div class="hint">${esc(t('respHint'))}</div></div>
   <div class="section-title">${esc(t('evidence'))}</div>
   <div class="field span3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">
     ${['product','defect'].map(k=>`<div class="photo-drop"><label style="font-weight:600;font-size:12.5px">${esc(t(k==='product'?'photosProduct':'photosDefect'))}</label><div style="margin-top:8px"><label class="btn btn-sm"><input type="file" accept="image/*" multiple data-photo="${k}" hidden>＋ ${esc(t('addPhotos'))}</label></div><div class="thumbs">${thumbs(k)}</div></div>`).join('')}
     <div class="photo-drop"><label style="font-weight:600;font-size:12.5px">${esc(t('photosScale'))}${req?' <span class="req">*</span>':''}</label><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><label class="btn btn-sm"><input type="file" accept="image/*" capture="environment" data-photo="scale" hidden>📷 ${esc(t('takePhoto'))}</label><label class="btn btn-sm"><input type="file" accept="image/*" multiple data-photo="scale" hidden>＋ ${esc(t('addPhotos'))}</label></div><div class="thumbs">${thumbs('scale')}</div><div class="hint">${esc(t(req?'scaleReqHint':'scaleHint'))}</div></div>
     <div class="hint" style="grid-column:1/-1">${esc(t('photoHint'))}</div>
   </div>
   <div class="field span3"><label>${esc(t('notes'))}</label><textarea name="notes" rows="2">${esc(d.notes)}</textarea></div>
   <div class="form-actions"><button type="button" class="btn" id="fCancel">${esc(editing?t('cancel'):t('clearForm'))}</button><button type="submit" class="btn btn-primary">${esc(t('save'))}</button></div>
  </form>`;
  const f=$('#occForm');
  const prodOf=c=>state.products.find(p=>normCode(p.code)===normCode(c));
  /* custo vigente na data do descarte (ou o custo já gravado, se código e data não mudaram) */
  /* custo: vem sozinho da planilha (vigência na data); pode ser digitado e fica marcado como manual */
  const preview=()=>{const qty=+d.qty||0,ed=editing&&!editing.costManual?editing:null,keep=ed&&hasCost(ed)&&normCode(ed.code)===normCode(d.code)&&ed.date===d.date,c=keep?null:costAt(d.code,d.date),auto=keep?+ed.unitCost:c?c.cost:null,inp=$('#unitIn');
    if(!d.ucTouched)inp.value=auto==null?'':auto;
    const typed=d.ucTouched&&String(inp.value).trim()!==''?+inp.value:null,uc=typed!=null?typed:auto,manual=typed!=null&&typed!==auto;
    $('#totalOut').textContent=uc==null?'—':fmtMoney(round2(qty*uc));$('#ucReset').hidden=!d.ucTouched;
    const hint=$('#unitHint');hint.style.color=manual?'#b7791f':uc==null&&d.code?'var(--danger)':'';
    hint.textContent=manual?(auto==null?t('costManualNew'):t('costManualHint',{v:fmtMoney(auto)})):!d.code?t('costPick'):keep?t('costKept')+(ed.costFrom?' · '+t('since')+' '+fmtDate(ed.costFrom):''):c?t('costFound',{d:fmtDate(c.from)})+' '+t('costTypeHint'):t('costNotFound',{d:fmtDate(d.date)})+' '+t('costTypeNew');
    $('#codeHint').textContent=d.code&&!prodOf(d.code)?t('newCodeHint'):'';
    const w=d.date?weekOfMonth(d.date):0;$('#wkHint').textContent=w?t('weekOfMonth',{n:w})+' · '+fmtDT(parseISO(d.date),{month:'long',year:'numeric'}):''};
  const sync=()=>{const fd=new FormData(f);for(const [k,v] of fd.entries())if(typeof v==='string')d[k]=v;preview()};
  f.addEventListener('input',sync);f.addEventListener('change',sync);preview();
  $$('input[list]',f).forEach(i=>i.addEventListener('click',()=>{try{i.showPicker()}catch(e){}}));
  if(lockR){$$('input,select,textarea,button',f).forEach(x=>{if(x.id!=='fCancel')x.disabled=true});$$('label.btn,[data-rmphoto]',f).forEach(x=>x.style.display='none')}
  $$('input[name=originType]',f).forEach(r=>r.onchange=()=>{sync();renderForm(editId)});
  /* ao escolher ou digitar um código cadastrado, o modelo vem do cadastro (pode ser alterado) */
  f.code.addEventListener('input',()=>{const p=prodOf(f.code.value);if(p&&(!d.model||d.modelAuto||d.model===d._lastModel)){f.model.value=p.model;d.model=p.model;d._lastModel=p.model;d.modelAuto=true}preview()});
  f.model.addEventListener('input',()=>{d.modelAuto=false});
  $('#unitIn').addEventListener('input',()=>{d.ucTouched=true});
  $('#ucReset').onclick=()=>{d.ucTouched=false;d.unitCostIn='';preview()};
  $$('[data-photo]',f).forEach(inp=>inp.onchange=async()=>{sync();for(const file of inp.files){try{ui.formPhotos.push({id:uid(),kind:inp.dataset.photo,name:file.name,data:await readImage(file,inp.dataset.photo==='scale'?2000:1280)})}catch(e){toast(file.name+' ✕',true)}}renderForm(editId)});
  $$('[data-rmphoto]',f).forEach(b=>b.onclick=e=>{e.stopPropagation();sync();ui.formPhotos=ui.formPhotos.filter(p=>p.id!==b.dataset.rmphoto);renderForm(editId)});
  $$('[data-zoom]',f).forEach(b=>b.onclick=()=>{const p=ui.formPhotos.find(p=>p.id===b.dataset.zoom);if(p)lightbox(p.data)});
  $('#fCancel').onclick=()=>{ui.draft=null;if(editing)location.hash='#/history';else renderForm()};
  f.onsubmit=async e=>{e.preventDefault();sync();
    const client=String(d.client||'').trim(),code=normCode(d.code),model=String(d.model||'').trim(),problem=String(d.problem||'').trim();
    if(!d.date||!client||!code||!model||!problem||!d.destination||d.qty===''){toast(t('requiredMsg'),true);return}
    const qty=Number(d.qty);
    if(!Number.isInteger(qty)||qty<=0){toast(t('qtyInvalid'),true);return}
    if(isLocked(d.date)||(editing&&isLocked(editing.date))){toast(t('lockedSave'),true);return}
    const audit=!!(lockedReason(d.date)||(editing&&lockedReason(editing.date)));
    if(state.settings.requireScalePhoto&&!ui.formPhotos.some(p=>p.kind==='scale')){toast(t('scaleRequired'),true);return}
    const rec={date:d.date,originType:d.originType,client,code,model,problem,operator:String(d.operator||'').trim(),clientDesc:d.clientDesc.trim(),qty,destination:d.destination,costResp:d.costResp,photos:ui.formPhotos,notes:d.notes.trim(),updatedAt:new Date().toISOString()};
    applyCost(rec,editing&&!editing.costManual?editing:null);
    const auto=hasCost(rec)?rec.unitCost:null,typed=d.ucTouched&&String(d.unitCostIn??'').trim()!==''?round2(+String(d.unitCostIn).replace(',','.')):null;
    if(typed!=null&&!(typed>=0)){toast(t('costInvalid'),true);return}
    rec.costManual=false;rec.planCost=null;
    if(typed!=null&&typed!==auto){rec.planCost=auto;rec.unitCost=typed;rec.costId=null;rec.costFrom=null;rec.costManual=true;rec.totalCost=round2(qty*typed)}
    if(!hasCost(rec)&&!await askYes(t('saveNoCost')))return;
    /* o que foi digitado e ainda não existe entra no cadastro para as próximas vezes */
    const added=[];
    if(!prodOf(code)){state.products.push({id:uid(),code,model,weight:null,active:true,demo:false});added.push(t('code')+' '+code)}
    if(!state.clients.some(c=>c.name.toLowerCase()===client.toLowerCase()&&c.type===d.originType)){state.clients.push({id:uid(),name:client,type:d.originType,demo:false});added.push(client)}
    if(!state.problems.some(p=>p.toLowerCase()===problem.toLowerCase())){state.problems.push(problem);added.push(problem)}
    const chg=audit&&editing?occDiff(editing,rec):[];
    if(editing)Object.assign(editing,rec);
    else state.occurrences.push(Object.assign(rec,{id:uid(),seq:(ONLINE?CLOUD.maxSeq=Math.max(CLOUD.maxSeq,state.occurrences.reduce((m,o)=>Math.max(m,o.seq||0),0))+1:state.occurrences.reduce((m,o)=>Math.max(m,o.seq||0),0)+1),createdBy:currentUser.name,createdAt:rec.updatedAt,demo:false}));
    if(audit){const o=editing||state.occurrences[state.occurrences.length-1];authLogAdd({act:editing?'edit':'new',per:AUTH?AUTH.per:o.date.slice(0,7),seq:o.seq,changes:chg})}
    await persist();ui.draft=null;ui.formPhotos=[];toast(t('savedMsg')+(added.length?' '+t('addedToLists',{v:added.join(', ')}):''));location.hash='#/history';
  };
}

/* ================= HISTÓRICO ================= */
/* Semanas de lançamento do mês: 1ª (1–7), 2ª (8–14), 3ª (15–21), 4ª (22 até o fim do mês) */
const weekOfMonth=d=>Math.min(4,Math.ceil(+String(d).slice(8,10)/7));
function weekRange(y,m,w){const last=new Date(Date.UTC(y,m,0)).getUTCDate(),a=(w-1)*7+1,b=w===4?last:w*7;return {s:`${y}-${pad(m)}-${pad(a)}`,e:`${y}-${pad(m)}-${pad(b)}`}}
function histFiltered(){const h=ui.hist,q=h.q.trim().toLowerCase();
  return state.occurrences.filter(o=>(!h.from||o.date>=h.from)&&(!h.to||o.date<=h.to)&&(h.origin==='all'||o.originType===h.origin)&&(!h.client||o.client===h.client)&&(!h.problem||o.problem===h.problem)&&(!h.resp||o.costResp===h.resp)
    &&(!q||[o.seq,o.code,o.model,o.client,o.problem,o.operator,o.clientDesc,o.notes,o.destination,o.createdBy,respLabel(o.costResp)].join(' ').toLowerCase().includes(q)))
   .sort((a,b)=>b.date.localeCompare(a.date)||b.seq-a.seq)}
function histPeriodLabel(){const h=ui.hist;if(h.ym){const [y,m]=h.ym.split('-').map(Number),ml=fmtDT(new Date(Date.UTC(y,m-1,1)),{month:'long',year:'numeric'});return h.wk?t('weekOfMonth',{n:h.wk})+' · '+ml+' ('+fmtDate(h.from)+' – '+fmtDate(h.to)+')':ml}
  if(h.from||h.to)return (h.from?fmtDate(h.from):'…')+' – '+(h.to?fmtDate(h.to):'…');return loadedFrom()?t('lpSince',{d:fmtDate(loadedFrom())}):t('allPeriods')}
function renderHistory(){
  const h=ui.hist;if(!h.year)h.year=+todayISO().slice(0,4);
  if(guardFrom(h.all?'':[h.year+'-01-01',h.from||'9999'].sort()[0],renderHistory))return;
  const list=histFiltered(),per=25,pages=Math.max(1,Math.ceil(list.length/per));if(h.page>pages)h.page=pages;
  const rows=list.slice((h.page-1)*per,h.page*per);
  const clients=[...new Set(state.occurrences.map(o=>o.client))].sort(),problems=[...new Set(state.occurrences.map(o=>o.problem))].sort();
  const yearOcc=state.occurrences.filter(o=>+o.date.slice(0,4)===h.year),selM=h.ym&&+h.ym.slice(0,4)===h.year?+h.ym.slice(5,7):0;
  const months=Array.from({length:12},(_,i)=>{const k=`${h.year}-${pad(i+1)}`,l=yearOcc.filter(o=>o.date.slice(0,7)===k);return {i:i+1,k,n:l.length,ng:sum(l,'qty')}});
  let weeks='';
  if(selM){const ml=state.occurrences.filter(o=>o.date.slice(0,7)===h.ym);
    weeks=`<div class="weekbar" style="margin-top:12px"><button class="wk ${!h.wk?'on':''}" data-wk="0"><b>${esc(t('wholeMonth'))}</b><small>${fmtNum(ml.length)} ${esc(t('occurrencesLower'))} · ${fmtMoney(round2(sum(ml,'totalCost')))}</small></button>${[1,2,3,4].map(w=>{const r=weekRange(h.year,selM,w),l=ml.filter(o=>o.date>=r.s&&o.date<=r.e);
      const wd=state.weekDone[weekKey(h.year,selM,w)],mc=monthClosed(r.s),lk=mc||!!(wd&&wd.locked),au=authActive(r.s);
      return `<div class="wk ${h.wk===w?'on':''} ${weekLaunched(h.year,selM,w)?'st-full':''} ${lk?'locked':''}" data-wk="${w}" role="button" tabindex="0"><b>${lk?'🔒 ':''}${esc(t('weekOfMonth',{n:w}))}${weekLaunched(h.year,selM,w)?' ✓':''}</b><small>${fmtDate(r.s)} – ${fmtDate(r.e)}</small><small>${fmtNum(l.length)} ${esc(t('occurrencesLower'))} · ${fmtNum(sum(l,'qty'))} ${esc(t('pieces'))} · ${fmtMoney(round2(sum(l,'totalCost')))}</small>${lk?`<small class="lockmsg">${esc(mc?t('mClosed'):t('weekLocked')+' · '+wd.by)}</small>${!mc&&wd.note?`<small title="${esc(wd.note)}">“${esc(wd.note)}”</small>`:''}`:weekHasOcc(h.year,selM,w)?`<small>${esc(t('weekAuto'))}</small>`:''}${canEdit()&&(!lk||au)?`<span class="btn btn-sm btn-accent" data-launch="${r.s}|${r.e}">＋ ${esc(t('launchWeek'))}</span>`:''}${!canEdit()||mc?'':lk?`<span class="btn btn-sm" data-wundo="${w}">🔑 ${esc(t('weekReopenBtn'))}</span>`:`<span class="btn btn-sm" data-wdone="${w}">🔒 ${esc(t('weekDoneBtn'))}</span>`}</div>`}).join('')}</div>`+authPanel(h.ym)}
  $('#view').innerHTML=`<div class="card" style="margin-bottom:16px"><div class="toolbar" style="margin:0 0 10px"><button class="btn btn-sm" id="yPrev">‹</button><b style="font-size:16px">${h.year}</b><button class="btn btn-sm" id="yNext">›</button><span class="note">${esc(t('histHelp'))}</span><span class="sp"></span><button class="btn btn-sm ${!h.ym?'btn-primary':''}" id="mAll">${esc(t('allPeriods'))}</button></div>
    ${monthLegend()}<div class="monthbar">${months.map(m=>`<button class="${selM===m.i?'on':''} ${monthStatus(h.year,m.i)}" data-month="${m.k}"><b>${esc(fmtDT(new Date(Date.UTC(2000,m.i-1,1)),{month:'short'}))}${lockIcon(h.year,m.i)}</b><small>${fmtNum(m.n)} · ${fmtNum(m.ng)} ${esc(t('pieces'))}</small></button>`).join('')}</div>${weeks}</div>
  <div class="card" style="margin-bottom:16px"><div class="toolbar" style="margin:0">
    <input type="search" id="hq" placeholder="${esc(t('search'))}" value="${esc(h.q)}" style="flex:2 1 260px">
    <label class="note">${esc(t('from'))} <input type="date" id="hfrom" value="${h.from}"></label>
    <label class="note">${esc(t('to'))} <input type="date" id="hto" value="${h.to}"></label>
    <select id="horigin"><option value="all">${esc(t('originType'))}: ${esc(t('all'))}</option><option value="client" ${h.origin==='client'?'selected':''}>${esc(t('originClient'))}</option><option value="internal" ${h.origin==='internal'?'selected':''}>${esc(t('originInternal'))}</option></select>
    <select id="hclient"><option value="">${esc(t('clientOrigin'))}: ${esc(t('all'))}</option>${clients.map(c=>`<option ${c===h.client?'selected':''}>${esc(c)}</option>`).join('')}</select>
    <select id="hproblem"><option value="">${esc(t('problem'))}: ${esc(t('all'))}</option>${problems.map(c=>`<option ${c===h.problem?'selected':''}>${esc(c)}</option>`).join('')}</select>
    <select id="hresp"><option value="">${esc(t('costResp'))}: ${esc(t('all'))}</option>${RESP.map(k=>`<option value="${k}" ${k===h.resp?'selected':''}>${esc(respLabel(k))}</option>`).join('')}</select>
  </div></div>
  <div class="card"><h3>${esc(t('resultsCount',{n:fmtNum(list.length)}))} <small>· ${esc(histPeriodLabel())}</small><span class="sp"></span><button class="btn btn-sm btn-primary no-print" id="hrep" ${list.length?'':'disabled'}>📄 ${esc(t('repHistBtn'))}</button><button class="btn btn-sm no-print" id="hcsv">${esc(t('exportCsv'))}</button></h3>
  ${list.length?`<div class="table-wrap"><table><thead><tr><th>${esc(t('idNo'))}</th><th>${esc(t('date'))}</th><th>${esc(t('clientOrigin'))}</th><th>${esc(t('code'))}</th><th>${esc(t('model'))}</th><th>${esc(t('problem'))}</th><th class="num">${esc(t('qtyNg'))}</th><th class="num">${esc(t('totalCost'))}</th><th>${esc(t('costResp'))}</th><th class="num">${esc(t('photos'))}</th><th class="no-print"></th></tr></thead>
  <tbody>${rows.map(o=>`<tr><td>${esc(o.seq)}${demoBadge(o)}</td><td style="white-space:nowrap">${fmtDate(o.date)}</td><td class="clip" title="${esc(o.client)}">${esc(o.client)} <small>· ${esc(originLabel(o.originType))}</small></td><td>${esc(o.code)}</td><td class="clip" title="${esc(o.model)}">${esc(o.model)}</td><td class="clip" title="${esc(o.problem)}">${esc(o.problem)}</td><td class="num">${fmtNum(o.qty)}</td><td class="num">${hasCost(o)?fmtMoney(o.totalCost)+(o.costManual?` <span class="badge" title="${esc(t('costManualFlag'))}">${esc(t('manualBadge'))}</span>`:''):`<span class="badge gray">${esc(t('noCostShort'))}</span>`}</td><td><span class="badge ${o.costResp==='tbd'?'gray':o.costResp==='company'?'blue':'green'}">${esc(respLabel(o.costResp))}</span></td><td class="num">${o.photos.length||'–'}</td>
  <td class="no-print"><div class="row-actions"><button class="btn btn-sm" data-view="${esc(o.id)}">${esc(t('view'))}</button>${!canEdit()?'':isLocked(o.date)?`<span class="btn btn-sm" style="opacity:.65;cursor:not-allowed" title="${esc(t(lockedReason(o.date)==='month'?'mClosed':'weekLocked'))}">🔒</span>`:`<a class="btn btn-sm" href="#/new/${esc(o.id)}">${esc(t('edit'))}</a>`}</div></td></tr>`).join('')}</tbody>
  <tfoot><tr><td colspan="6">${esc(t('total'))} (${fmtNum(list.length)})</td><td class="num">${fmtNum(sum(list,'qty'))}</td><td class="num">${fmtMoney(round2(sum(list,'totalCost')))}</td><td colspan="3"></td></tr></tfoot></table></div>
  ${pages>1?`<div class="pager"><button class="btn btn-sm" id="pp" ${h.page<=1?'disabled':''}>‹</button><span class="note">${h.page} / ${pages}</span><button class="btn btn-sm" id="pn" ${h.page>=pages?'disabled':''}>›</button></div>`:''}`
  :`<div class="empty">${esc(t('noRecords'))}</div>`}</div>`;
  const upd=(k,v)=>{h[k]=v;h.page=1;renderHistory()};
  const setRange=(ym,wk)=>{h.ym=ym;h.wk=wk;h.page=1;if(!ym){h.from='';h.to=''}else{const [y,m]=ym.split('-').map(Number),r=wk?weekRange(y,m,wk):{s:ym+'-01',e:toISO(new Date(Date.UTC(y,m,0)))};h.from=r.s;h.to=r.e}renderHistory()};
  $('#yPrev').onclick=()=>{h.year--;renderHistory()};$('#yNext').onclick=()=>{h.year++;renderHistory()};$('#mAll').onclick=()=>{h.all=true;setRange('',0)};
  $$('[data-wdone]').forEach(b=>b.onclick=()=>setWeekDone(h.year,+h.ym.slice(5,7),+b.dataset.wdone,true));$$('[data-wundo]').forEach(b=>b.onclick=()=>setWeekDone(h.year,+h.ym.slice(5,7),+b.dataset.wundo,false));
  $$('[data-month]').forEach(b=>b.onclick=()=>setRange(b.dataset.month,0));if(h.ym)bindAuthPanel(h.ym);
  $$('[data-wk]').forEach(b=>b.onclick=e=>{if(e.target.closest('[data-launch],[data-wdone],[data-wundo]'))return;setRange(h.ym,+b.dataset.wk)});
  $$('[data-launch]').forEach(b=>b.onclick=()=>{const [s,e]=b.dataset.launch.split('|'),td=todayISO();ui.newDate=td>=s&&td<=e?td:s;ui.draft=null;ui.editingId=null;location.hash='#/new'});
  let tm;$('#hq').oninput=e=>{clearTimeout(tm);tm=setTimeout(()=>{upd('q',e.target.value);const i=$('#hq');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)};
  $('#hfrom').onchange=e=>{h.ym='';h.wk=0;upd('from',e.target.value)};$('#hto').onchange=e=>{h.ym='';h.wk=0;upd('to',e.target.value)};
  $('#horigin').onchange=e=>upd('origin',e.target.value);$('#hclient').onchange=e=>upd('client',e.target.value);
  $('#hproblem').onchange=e=>upd('problem',e.target.value);$('#hresp').onchange=e=>upd('resp',e.target.value);
  $$('[data-view]').forEach(b=>b.onclick=()=>showDetail(b.dataset.view));
  if($('#pp')){$('#pp').onclick=()=>{h.page--;renderHistory()};$('#pn').onclick=()=>{h.page++;renderHistory()}}
  $('#hcsv').onclick=()=>exportCsv(list);$('#hrep').onclick=()=>historyReport(list);
}
/* ================= FOTOS DOS PROBLEMAS =================
   Junta as fotos das ocorrências e as da biblioteca (importadas em lote, já reduzidas para o tamanho padrão).
   As da biblioteca guardam data, código, modelo e problema, mas não contam como peças NG nem custo. */
const libList=()=>state.photoLib||(state.photoLib=[]);
function photoItems(f){const q=(f.q||'').trim().toLowerCase(),wr=f.ym&&f.wk?weekRange(+f.ym.slice(0,4),+f.ym.slice(5,7),f.wk):null;
  const ok=o=>(!f.ym||o.date.slice(0,7)===f.ym)&&(!wr||(o.date>=wr.s&&o.date<=wr.e))&&(!f.code||normCode(o.code)===f.code)&&(!f.model||o.model===f.model)&&(!f.problem||o.problem===f.problem)&&(!q||[o.seq,o.code,o.model,o.problem,o.client].join(' ').toLowerCase().includes(q));
  const occ=f.src==='lib'?[]:state.occurrences.filter(ok),lib=f.src==='occ'?[]:libList().filter(ok),items=[];
  occ.forEach(o=>(o.photos||[]).forEach(p=>{if(!f.kind||p.kind===f.kind)items.push({o,p,lib:false})}));if(!f.kind)lib.forEach(o=>(o.photos||[]).forEach(p=>items.push({o,p,lib:true})));
  items.sort((a,b)=>b.o.date.localeCompare(a.o.date)||(b.o.seq||0)-(a.o.seq||0));return {occ,lib,items}}
function renderPhotos(){const f=ui.ph||(ui.ph={q:'',ym:'',wk:0,code:'',model:'',problem:'',kind:'',src:'',view:'grid',page:1}),per=48;
  if(f.ym&&guardFrom(f.ym+'-01',renderPhotos))return;
  const {occ,items}=photoItems(f),withP=[...new Set(items.filter(x=>!x.lib).map(x=>x.o))],pages=Math.max(1,Math.ceil(items.length/per));if(f.page>pages)f.page=pages;const rows=items.slice((f.page-1)*per,f.page*per);
  const all=state.occurrences.concat(libList()),opts=(vals,cur)=>[...new Set(vals.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b))).map(v=>`<option value="${esc(v)}" ${v===cur?'selected':''}>${esc(v)}</option>`).join('');
  const box=(l,v,s,c)=>`<div class="card kpi vivid ${c}"><div class="lbl">${esc(l)}</div><div class="val">${esc(v)}</div><div class="sub">${esc(s||'')}</div></div>`;
  const kinds={product:'photosProduct',defect:'photosDefect',scale:'photosScale'},fld=(l,h)=>`<div class="field" style="margin:0"><label>${esc(l)}</label>${h}</div>`;
  const nLib=items.filter(x=>x.lib).length,badge=x=>x.lib?`<span class="badge blue">${esc(t('phLib'))}</span>`:`<span class="badge" style="background:#dc2626;color:#fff">${fmtNum(x.o.qty)} NG</span>`;
  const act=(x,i)=>x.lib?(canEdit()?`<button class="btn btn-sm btn-danger" data-phdel="${esc(x.o.id)}">${esc(t('del'))}</button>`:''):`<button class="btn btn-sm" data-phv="${esc(x.o.id)}">${esc(t('phOpen'))}</button>`;
  $('#view').innerHTML=`<div class="toolbar"><span class="note">${esc(t('phHelp'))} ${f.ym?'':lpNote()}</span><span class="sp"></span>${canEdit()?`<button class="btn btn-primary" id="phImp">📥 ${esc(t('phImport'))}</button>`:''}</div>
  <div class="grid g5" style="margin-bottom:16px">${box(t('phTotal'),fmtNum(items.length),nLib?t('phLib')+': '+fmtNum(nLib):'','k1')}${box(t('kpiNg'),fmtNum(sum(withP,'qty')),t('phNgSub'),'k2')}${box(t('phOcc'),fmtNum(withP.length),'','k4')}${box(t('phCodes'),fmtNum(new Set(items.map(x=>normCode(x.o.code)).filter(Boolean)).size),'','k5')}${box(t('phNoPhoto'),fmtNum(occ.filter(o=>!(o.photos||[]).length).length),'','k3')}</div>
  <div class="card" style="margin-bottom:16px"><h3>${esc(t('phFilter'))}<span class="sp"></span><span class="seg"><button data-phview="grid" class="${f.view!=='table'?'on':''}">▦ ${esc(t('phGrid'))}</button><button data-phview="table" class="${f.view==='table'?'on':''}">☰ ${esc(t('phTable'))}</button></span><button class="btn btn-sm" id="phClear">${esc(t('phClear'))}</button></h3><div class="ph-filters" style="grid-template-columns:2fr repeat(7,minmax(0,1fr))">
   ${fld(t('search'),`<input type="search" id="phQ" value="${esc(f.q)}" placeholder="${esc(t('phSearch'))}">`)}
   ${fld(t('periodMonth'),`<input type="month" data-ph="ym" value="${esc(f.ym)}">`)}
   ${fld(t('periodWeek'),`<select data-ph="wk" ${f.ym?'':'disabled'}><option value="0">${esc(t('all'))}</option>${[1,2,3,4].map(w=>`<option value="${w}" ${f.wk===w?'selected':''}>${esc(t('weekOfMonth',{n:w}))}</option>`).join('')}</select>`)}
   ${fld(t('code'),`<select data-ph="code"><option value="">${esc(t('all'))}</option>${opts(all.map(o=>normCode(o.code)),f.code)}</select>`)}
   ${fld(t('model'),`<select data-ph="model"><option value="">${esc(t('all'))}</option>${opts(all.map(o=>o.model),f.model)}</select>`)}
   ${fld(t('problem'),`<select data-ph="problem"><option value="">${esc(t('all'))}</option>${opts(all.map(o=>o.problem),f.problem)}</select>`)}
   ${fld(t('phKind'),`<select data-ph="kind"><option value="">${esc(t('all'))}</option>${Object.keys(kinds).map(k=>`<option value="${k}" ${f.kind===k?'selected':''}>${esc(t(kinds[k]))}</option>`).join('')}</select>`)}
   ${fld(t('phSrc'),`<select data-ph="src"><option value="">${esc(t('all'))}</option><option value="occ" ${f.src==='occ'?'selected':''}>${esc(t('phSrcOcc'))}</option><option value="lib" ${f.src==='lib'?'selected':''}>${esc(t('phLib'))}</option></select>`)}
  </div></div>
  ${!rows.length?`<div class="card empty">${esc(t('phNone'))}</div>`:f.view==='table'?`<div class="card"><div class="table-wrap"><table><thead><tr><th>${esc(t('phFoto'))}</th><th>${esc(t('date'))}</th><th>${esc(t('periodWeek'))}</th><th>${esc(t('code'))}</th><th>${esc(t('model'))}</th><th>${esc(t('problem'))}</th><th class="num">${esc(t('qtyNg'))}</th><th>${esc(t('phSrc'))}</th><th></th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td><img src="${esc(x.p.data||'')}" alt="" loading="lazy" data-phz="${i}" style="width:72px;height:54px;object-fit:cover;border-radius:6px;cursor:zoom-in;display:block"></td><td style="white-space:nowrap">${fmtDate(x.o.date)}</td><td style="white-space:nowrap">${esc(t('weekOfMonth',{n:weekOfMonth(x.o.date)}))}</td><td><b>${esc(x.o.code||'')}</b></td><td class="clip" title="${esc(x.o.model||'')}">${esc(x.o.model||'')}</td><td class="clip" title="${esc(x.o.problem||'')}">${esc(x.o.problem||'')}</td><td class="num">${x.lib?'—':fmtNum(x.o.qty)}</td><td>${badge(x)}</td><td>${act(x,i)}</td></tr>`).join('')}</tbody></table></div></div>`
  :`<div class="ph-grid">${rows.map((x,i)=>`<div class="card ph-card"><img src="${esc(x.p.data||'')}" alt="${esc(x.o.code||'')}" loading="lazy" data-phz="${i}"><div class="ph-info"><b>${esc(x.o.code||'—')}</b>${badge(x)}<div class="clip" title="${esc(x.o.model||'')}">${esc(x.o.model||'')}</div><div class="clip note" title="${esc(x.o.problem||'')}">${esc(x.o.problem||'')}</div><small class="note">${fmtDate(x.o.date)} · ${esc(t('weekOfMonth',{n:weekOfMonth(x.o.date)}))}</small>${act(x,i)}</div></div>`).join('')}</div>`}
  ${pages>1?`<div class="pager"><button class="btn btn-sm" id="phP" ${f.page<=1?'disabled':''}>‹</button><span class="note">${f.page} / ${pages}</span><button class="btn btn-sm" id="phN" ${f.page>=pages?'disabled':''}>›</button></div>`:''}`;
  const set=(k,v)=>{f[k]=v;f.page=1;if(k==='ym'&&!v)f.wk=0;renderPhotos()};
  $$('[data-ph]').forEach(s=>s.onchange=()=>set(s.dataset.ph,s.dataset.ph==='wk'?+s.value:s.value));
  $$('[data-phview]').forEach(b=>b.onclick=()=>{f.view=b.dataset.phview;renderPhotos()});
  let tm;$('#phQ').oninput=e=>{clearTimeout(tm);tm=setTimeout(()=>{set('q',e.target.value);const i=$('#phQ');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)};
  $('#phClear').onclick=()=>{const v=f.view;ui.ph=null;renderPhotos();ui.ph.view=v};
  if($('#phImp'))$('#phImp').onclick=photoImport;
  $$('[data-phz]').forEach(m=>m.onclick=()=>lightbox(rows[+m.dataset.phz].p.data));$$('[data-phv]').forEach(b=>b.onclick=()=>showDetail(b.dataset.phv));
  $$('[data-phdel]').forEach(b=>b.onclick=async()=>{if(!await askYes(t('phDelAsk')))return;state.photoLib=libList().filter(x=>x.id!==b.dataset.phdel);await persist();toast(t('deletedMsg'));renderPhotos()});
  if($('#phP')){$('#phP').onclick=()=>{f.page--;renderPhotos()};$('#phN').onclick=()=>{f.page++;renderPhotos()}}}
/* Importar várias fotos: todas ficam no tamanho padrão (1280 px, JPEG) com data, código, modelo e problema */
function photoImport(){const L=[],dl=(id,vals)=>`<datalist id="${id}">${[...new Set(vals.filter(Boolean))].sort().map(v=>`<option value="${esc(v)}">`).join('')}</datalist>`;
  const prods=state.products.filter(p=>p.active!==false),guess=file=>{const m=/(20\d{2})[-_]?(\d{2})[-_]?(\d{2})/.exec(file.name);if(m&&+m[2]>=1&&+m[2]<=12&&+m[3]>=1&&+m[3]<=31)return `${m[1]}-${m[2]}-${m[3]}`;const d=new Date(file.lastModified||Date.now());return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
  openModal(`<div class="modal-head"><h2>📥 ${esc(t('phImport'))}</h2><button class="btn btn-sm btn-ghost" data-close>✕</button></div><div class="modal-body"><p class="hint" style="margin-top:0">${esc(t('phImpHelp'))}</p>
   <label class="btn btn-primary"><input type="file" id="piFiles" accept="image/*" multiple hidden>📂 ${esc(t('phImpPick'))}</label>
   <div id="piAll" class="ph-filters" style="grid-template-columns:repeat(4,minmax(0,1fr));margin:12px 0;display:none"><div class="field" style="margin:0"><label>${esc(t('date'))}</label><input type="date" id="piD"></div><div class="field" style="margin:0"><label>${esc(t('code'))}</label><input id="piC" list="piDlC"></div><div class="field" style="margin:0"><label>${esc(t('model'))}</label><input id="piM" list="piDlM"></div><div class="field" style="margin:0"><label>${esc(t('problem'))}</label><input id="piP" list="piDlP"></div><div style="grid-column:1/-1"><button class="btn btn-sm" id="piApply">⤵ ${esc(t('phImpApply'))}</button></div></div>
   ${dl('piDlC',prods.map(p=>p.code))}${dl('piDlM',prods.map(p=>p.model))}${dl('piDlP',state.problems)}<div id="piList"></div></div>
   <div class="modal-foot"><span style="flex:1"></span><button class="btn" data-close>${esc(t('cancel'))}</button><button class="btn btn-primary" id="piSave" disabled>${esc(t('phImpSave',{n:0}))}</button></div>`,true);
  const draw=()=>{$('#piAll').style.display=L.length?'grid':'none';$('#piSave').disabled=!L.length;$('#piSave').textContent=t('phImpSave',{n:L.length});
    $('#piList').innerHTML=L.length?`<div class="table-wrap"><table><thead><tr><th>${esc(t('phFoto'))}</th><th>${esc(t('date'))} *</th><th>${esc(t('code'))}</th><th>${esc(t('model'))}</th><th>${esc(t('problem'))} *</th><th></th></tr></thead><tbody>${L.map((x,i)=>`<tr><td><img src="${esc(x.data)}" alt="" style="width:72px;height:54px;object-fit:cover;border-radius:6px;display:block"><small class="note">${esc(x.name)}</small></td><td><input type="date" data-pi="date" data-i="${i}" value="${esc(x.date)}"></td><td><input data-pi="code" data-i="${i}" list="piDlC" value="${esc(x.code)}" style="width:130px"></td><td><input data-pi="model" data-i="${i}" list="piDlM" value="${esc(x.model)}" style="width:160px"></td><td><input data-pi="problem" data-i="${i}" list="piDlP" value="${esc(x.problem)}" style="width:170px"></td><td><button class="btn btn-sm btn-ghost" data-pirm="${i}">✕</button></td></tr>`).join('')}</tbody></table></div>`:'';
    $$('[data-pi]').forEach(inp=>inp.oninput=()=>{const x=L[+inp.dataset.i];x[inp.dataset.pi]=inp.value;if(inp.dataset.pi==='code'){const p=prods.find(p=>normCode(p.code)===normCode(inp.value));if(p&&!x.model){x.model=p.model;const m=$(`[data-pi="model"][data-i="${inp.dataset.i}"]`);if(m)m.value=p.model}}});
    $$('[data-pirm]').forEach(b=>b.onclick=()=>{L.splice(+b.dataset.pirm,1);draw()})};
  $('#piFiles').onchange=async e=>{const fs=[...e.target.files];if(!fs.length)return;toast(t('phImpReading'));for(const file of fs){try{L.push({name:file.name,data:await readImage(file,1280),date:guess(file),code:'',model:'',problem:''})}catch(err){toast(file.name+' ✕',true)}}e.target.value='';draw()};
  $('#piC').oninput=()=>{const p=prods.find(p=>normCode(p.code)===normCode($('#piC').value));if(p)$('#piM').value=p.model};
  $('#piApply').onclick=()=>{const v={date:$('#piD').value,code:$('#piC').value.trim(),model:$('#piM').value.trim(),problem:$('#piP').value.trim()};L.forEach(x=>{for(const k in v)if(v[k])x[k]=v[k]});draw()};
  $('#piSave').onclick=async()=>{if(L.some(x=>!x.date||!String(x.problem).trim())){toast(t('phImpNeed'),true);return}const btn=$('#piSave');btn.disabled=true;const at=new Date().toISOString();
    L.forEach(x=>libList().push({id:uid(),date:x.date,code:normCode(x.code),model:String(x.model).trim(),problem:String(x.problem).trim(),at,by:currentUser.name,photos:[{id:uid(),kind:'lib',name:x.name,data:x.data}]}));
    const pr=[...new Set(L.map(x=>String(x.problem).trim()))].filter(p=>p&&!state.problems.includes(p));state.problems.push(...pr);
    await persist();closeModal();toast(t('phImpDone',{n:L.length}));const f=ui.ph||{};f.src='lib';f.page=1;ui.ph=Object.assign({q:'',ym:'',wk:0,code:'',model:'',problem:'',kind:'',view:'grid'},f);renderPhotos()}}
/* Dashboard: dois cliques numa barra mostram as fotos daquele item no período */
function photosModal(title,occs,libs){const items=[];occs.forEach(o=>(o.photos||[]).forEach(p=>items.push({o,p,lib:false})));(libs||[]).forEach(o=>(o.photos||[]).forEach(p=>items.push({o,p,lib:true})));items.sort((a,b)=>b.o.date.localeCompare(a.o.date));
  openModal(`<div class="modal-head"><h2>📷 ${esc(t('dbPhotos',{k:title}))}</h2><button class="btn btn-sm btn-ghost" data-close>✕</button></div><div class="modal-body">${items.length?`<div class="ph-grid">${items.slice(0,120).map((x,i)=>`<div class="card ph-card"><img src="${esc(x.p.data||'')}" alt="" loading="lazy" data-dbz="${i}"><div class="ph-info"><b>${esc(x.o.code||'—')}</b>${x.lib?`<span class="badge blue">${esc(t('phLib'))}</span>`:`<span class="badge" style="background:#dc2626;color:#fff">${fmtNum(x.o.qty)} NG</span>`}<div class="clip note">${esc(x.o.problem||'')}</div><small class="note">${fmtDate(x.o.date)}</small>${x.lib?'':`<button class="btn btn-sm" data-dbv="${esc(x.o.id)}">${esc(t('phOpen'))}</button>`}</div></div>`).join('')}</div>`:`<div class="empty">${esc(t('dbNoPhotos'))}</div>`}</div>`,true);
  $$('[data-dbz]').forEach(m=>m.onclick=()=>lightbox(items[+m.dataset.dbz].p.data));$$('[data-dbv]').forEach(b=>b.onclick=()=>{closeModal();showDetail(b.dataset.dbv)})}
/* Relatório do resultado pesquisado, pronto para imprimir ou salvar em PDF */
function historyReport(list){const h=ui.hist,l=list.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.seq-b.seq),a=agg(l),now=new Date();
  const filt=[h.origin!=='all'?t('originType')+': '+originLabel(h.origin):'',h.client?t('clientOrigin')+': '+h.client:'',h.problem?t('problem')+': '+h.problem:'',h.resp?t('costResp')+': '+respLabel(h.resp):'',h.q?t('searchTerm')+': "'+h.q+'"':''].filter(Boolean);
  const byResp=RESP.map(k=>{const x=l.filter(o=>o.costResp===k);return {k,n:x.length,ng:sum(x,'qty'),c:round2(sum(x,'totalCost'))}}).filter(x=>x.n);
  const byCli={};l.forEach(o=>{const g=byCli[o.client]||(byCli[o.client]={n:0,ng:0,c:0});g.n++;g.ng+=o.qty;g.c+=+o.totalCost||0});
  openModal(`<div class="modal-head no-print"><h2>${esc(t('repHistBtn'))}</h2><button class="btn btn-sm btn-ghost" data-close>✕</button></div>
  <div class="modal-body"><div class="rpt">
   <div class="rpt-head"><div><img class="rpt-logo" src="${DAS_LOGO}" alt="DAS"><div class="rpt-co">${esc(state.settings.company||t('appName'))}</div><h1>${esc(t('repHistTitle'))}</h1><div>${esc(t('appName'))} · ${esc(t('repSub'))}</div></div>
    <div class="rpt-meta"><div><b>${esc(t('period'))}:</b> ${esc(histPeriodLabel())}</div><div><b>${esc(t('repIssued'))}:</b> ${esc(now.toLocaleString(LANG))}</div><div><b>${esc(t('repBy'))}:</b> ${esc(currentUser.name)}</div>${filt.length?`<div><b>${esc(t('repFilters'))}:</b> ${esc(filt.join(' · '))}</div>`:''}</div></div>
   <div class="rpt-kpis"><div><span>${esc(t('kpiOcc'))}</span><b>${fmtNum(a.n)}</b></div><div><span>${esc(t('kpiNg'))}</span><b>${fmtNum(a.ng)}</b></div><div><span>${esc(t('kpiCost'))}</span><b>${fmtMoney(a.cost)}</b></div><div><span>${esc(t('kNoCost'))}</span><b>${fmtNum(a.noCost)}</b></div></div>
   <div class="rpt-two"><div><h4>${esc(t('repByResp'))}</h4><table><thead><tr><th>${esc(t('costResp'))}</th><th class="num">${esc(t('kpiOcc'))}</th><th class="num">${esc(t('kpiNg'))}</th><th class="num">${esc(t('totalCost'))}</th><th class="num">%</th></tr></thead><tbody>${byResp.map(x=>`<tr><td>${esc(respLabel(x.k))}</td><td class="num">${fmtNum(x.n)}</td><td class="num">${fmtNum(x.ng)}</td><td class="num">${fmtMoney(x.c)}</td><td class="num">${a.cost?fmtNum(round2(x.c/a.cost*100)):0}%</td></tr>`).join('')}</tbody></table></div>
    <div><h4>${esc(t('repByClient'))}</h4><table><thead><tr><th>${esc(t('clientOrigin'))}</th><th class="num">${esc(t('kpiOcc'))}</th><th class="num">${esc(t('kpiNg'))}</th><th class="num">${esc(t('totalCost'))}</th></tr></thead><tbody>${Object.entries(byCli).sort((x,y)=>y[1].c-x[1].c).map(([k,g])=>`<tr><td>${esc(k)}</td><td class="num">${fmtNum(g.n)}</td><td class="num">${fmtNum(g.ng)}</td><td class="num">${fmtMoney(round2(g.c))}</td></tr>`).join('')}</tbody></table></div></div>
   <h4>${esc(t('repDetail'))}</h4>
   <table class="rpt-main"><thead><tr><th>${esc(t('idNo'))}</th><th>${esc(t('date'))}</th><th>${esc(t('clientOrigin'))}</th><th>${esc(t('code'))}</th><th>${esc(t('model'))}</th><th>${esc(t('problem'))}</th><th class="num">${esc(t('qtyNg'))}</th><th class="num">${esc(t('unitCost'))}</th><th class="num">${esc(t('totalCost'))}</th><th>${esc(t('costResp'))}</th></tr></thead>
   <tbody>${l.map(o=>`<tr><td>${esc(o.seq)}</td><td>${fmtDate(o.date)}</td><td>${esc(o.client)}</td><td>${esc(o.code)}</td><td>${esc(o.model)}</td><td>${esc(o.problem)}</td><td class="num">${fmtNum(o.qty)}</td><td class="num">${hasCost(o)?fmtMoney(o.unitCost)+(o.costManual?'*':''):'—'}</td><td class="num">${hasCost(o)?fmtMoney(o.totalCost):esc(t('noCostShort'))}</td><td>${esc(respLabel(o.costResp))}</td></tr>`).join('')}</tbody>
   <tfoot><tr><td colspan="6">${esc(t('total'))} (${fmtNum(a.n)})</td><td class="num">${fmtNum(a.ng)}</td><td></td><td class="num">${fmtMoney(a.cost)}</td><td></td></tr></tfoot></table>
   <p class="rpt-note">${esc(t('repNote'))}${l.some(o=>o.costManual)?' * '+esc(t('costManualFlag'))+'.':''}${a.noCost?' '+esc(t('noCostWarn',{n:a.noCost,q:a.ngNoCost})):''}</p>
   <div class="rpt-sign"><div>${esc(t('signInspector'))}</div><div>${esc(t('signLeader'))}</div><div>${esc(t('signSupervisor'))}</div><div>${esc(t('signManager'))}</div></div>
   <div class="rpt-foot">${esc(t('appName'))} · ${esc(t('repFoot'))}</div>
  </div></div>
  <div class="modal-foot no-print"><button class="btn" data-close>${esc(t('close'))}</button><button class="btn btn-primary" id="rPrint">🖨 ${esc(t('repPrint'))}</button></div>`,true);
  $('#rPrint').onclick=()=>{document.body.classList.add('print-modal','print-rpt');window.print();setTimeout(()=>document.body.classList.remove('print-modal','print-rpt'),400)}}

/* ---------- planilha padrão de custos (.xlsx gerado offline) ---------- */
function crc32(b){let t=crc32.t;if(!t){t=crc32.t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}}let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=t[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function zipStore(files){const enc=new TextEncoder(),parts=[],cd=[];let off=0;
  files.forEach(([name,txt])=>{const nm=enc.encode(name),d=typeof txt==='string'?enc.encode(txt):txt,c=crc32(d),hd=new Uint8Array(30+nm.length),v=new DataView(hd.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint32(14,c,true);v.setUint32(18,d.length,true);v.setUint32(22,d.length,true);v.setUint16(26,nm.length,true);hd.set(nm,30);parts.push(hd,d);
    const ch=new Uint8Array(46+nm.length),w=new DataView(ch.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x0800,true);w.setUint32(16,c,true);w.setUint32(20,d.length,true);w.setUint32(24,d.length,true);w.setUint16(28,nm.length,true);w.setUint32(42,off,true);ch.set(nm,46);cd.push(ch);off+=hd.length+d.length});
  const size=cd.reduce((s,x)=>s+x.length,0),e=new Uint8Array(22),ev=new DataView(e.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,size,true);ev.setUint32(16,off,true);
  return new Blob([...parts,...cd,e],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
/* sheets: [{name, widths:[], rows:[[valor|{v,s}]]}]; estilos: 1 cabeçalho, 2 data, 3 R$, 4 título, 5 texto */
function xlsxBlob(sheets){const x=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const col=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s};
  const sheetXml=sh=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+(sh.freeze?'<sheetViews><sheetView workbookViewId="0"><pane ySplit="'+sh.freeze+'" topLeftCell="A'+(sh.freeze+1)+'" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>':'')
    +'<cols>'+sh.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')+'</cols><sheetData>'
    +sh.rows.map((r,i)=>`<row r="${i+1}">`+r.map((c,j)=>{const o=c&&typeof c==='object'?c:{v:c},ref=col(j)+(i+1),st=o.s?` s="${o.s}"`:'';if(o.v==null||o.v==='')return o.s?`<c r="${ref}"${st}/>`:'';
      if(typeof o.v==='number')return `<c r="${ref}"${st}><v>${o.v}</v></c>`;if(o.d){const n=Math.round(Date.parse(o.v+'T00:00:00Z')/864e5)+25569;return `<c r="${ref}"${st}><v>${n}</v></c>`}
      return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${x(o.v)}</t></is></c>`}).join('')+'</row>').join('')+'</sheetData></worksheet>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="&quot;R$&quot; #,##0.00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F5A8F"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="6"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="165" applyNumberFormat="1"/><xf fontId="2" applyFont="1"/><xf><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  const files=[['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>'],
    ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>`<sheet name="${x(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml',styles]].concat(sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,sheetXml(s)]));
  return zipStore(files)}
/* Modelo para o RH: uma linha por código, custo em R$ já convertido pelo dólar do mês e a data de vigência */
function downloadTemplate(){const today=todayISO(),codes=new Map();
  state.products.filter(p=>p.active!==false).forEach(p=>codes.set(normCode(p.code),p.model));state.costs.forEach(c=>{if(!codes.has(c.code))codes.set(c.code,c.model)});
  /* títulos fixos: o importador reconhece as colunas por estes nomes, em qualquer idioma da tela */
  const rows=[[{v:'Código',s:1},{v:'Modelo',s:1},{v:'Custo unitário (R$)',s:1},{v:'Vigência',s:1},{v:'Cotação do dólar (R$)',s:1}]];
  [...codes.keys()].sort().forEach(k=>{const c=costAt(k,today);rows.push([k,codes.get(k)||'',{v:c?c.cost:'',s:3},{v:'',s:2},{v:'',s:3}])});
  if(rows.length===1)rows.push(['ABC123','Modelo exemplo',{v:15,s:3},{v:'',s:2}]);
  const info=[[{v:t('tplTitle'),s:4}],[],...['tplI1','tplI2','tplI3','tplI4','tplI7','tplI5','tplI6'].map(k=>[{v:t(k),s:5}])];
  download(xlsxBlob([{name:t('tplSheet').slice(0,31),widths:[18,40,20,16,22],freeze:1,rows},{name:t('tplInfo').slice(0,31),widths:[110],rows:info}]),'modelo-importacao-custos-'+today+'.xlsx')}

function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function exportCsv(list){
  const cols=[['idNo',o=>o.seq],['date',o=>o.date],['originType',o=>originLabel(o.originType)],['clientOrigin',o=>o.client],['code',o=>o.code],['model',o=>o.model],['problem',o=>o.problem],['clientDesc',o=>o.clientDesc],['qtyNg',o=>o.qty],['operator',o=>o.operator||''],['unitCost',o=>dec2(o.unitCost)],['totalCost',o=>dec2(o.totalCost)],['vigFrom',o=>o.costFrom||''],['destination',o=>o.destination],['costResp',o=>respLabel(o.costResp)],['photos',o=>o.photos.length],['notes',o=>o.notes],['createdBy',o=>o.createdBy],['demoBadge',o=>o.demo?'DEMO':'']];
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const csv='﻿'+cols.map(c=>q(t(c[0]))).join(';')+'\r\n'+list.map(o=>cols.map(c=>q(c[1](o))).join(';')).join('\r\n');
  download(new Blob([csv],{type:'text/csv;charset=utf-8'}),'segregados-historico-'+todayISO()+'.csv')}
function showDetail(id){
  const o=state.occurrences.find(x=>x.id===id);if(!o)return;
  const fig=kind=>{const ph=o.photos.filter(p=>p.kind===kind);return ph.length?`<div class="photo-grid">${ph.map(p=>`<figure data-big="${esc(p.id)}"><img src="${esc(p.data)}" alt="${esc(p.name)}"><figcaption>${esc(p.name||'')}</figcaption></figure>`).join('')}</div>`:`<div class="note">${esc(t('noPhotos'))}</div>`};
  const it=(k,v,full)=>`<div class="${full?'full':''}"><dt>${esc(t(k))}</dt><dd>${v}</dd></div>`;
  openModal(`<div class="modal-head"><h2>${esc(t('details'))} #${esc(o.seq)}${demoBadge(o)}</h2><button class="btn btn-sm btn-ghost" data-close aria-label="${esc(t('close'))}">✕</button></div>
  <div class="modal-body"><dl class="dl" style="margin:0">
   ${it('date',esc(fmtDate(o.date)))}${it('originType',esc(originLabel(o.originType)))}${it('clientOrigin',esc(o.client))}
   ${it('code',esc(o.code))}${it('model',esc(o.model))}${it('problem',esc(o.problem))}${it('operator',esc(o.operator||'–'))}
   ${it('clientDesc',esc(o.clientDesc||'–'),true)}
   ${it('qtyNg',fmtNum(o.qty))}${it('unitCost',hasCost(o)?fmtMoney(o.unitCost)+'<br><small>'+esc(o.costManual?t('costManualFlag')+(o.planCost!=null?' · '+t('costManualHint',{v:fmtMoney(o.planCost)}):''):o.costFrom?t('costFound',{d:fmtDate(o.costFrom)}):t('costLegacy'))+'</small>':'<span style="color:var(--danger)">'+esc(t('costNotFound',{d:fmtDate(o.date)}))+'</span>')}${it('totalCost',hasCost(o)?'<span style="font-size:18px">'+fmtMoney(o.totalCost)+'</span> <small>('+fmtNum(o.qty)+' × '+fmtMoney(o.unitCost)+')</small>':'—')}
   ${it('destination',esc(o.destination))}${it('costResp',esc(respLabel(o.costResp)))}${it('createdBy',esc(o.createdBy||'–'))}
   ${o.notes?it('notes',esc(o.notes),true):''}
  </dl>
  <h3 style="margin:22px 0 10px;font-size:15px">${esc(t('evidence'))}</h3>
  <div class="note" style="font-weight:600;margin-bottom:6px">${esc(t('photosProduct'))}</div>${fig('product')}
  <div class="note" style="font-weight:600;margin:14px 0 6px">${esc(t('photosDefect'))}</div>${fig('defect')}
  <div class="note" style="font-weight:600;margin:14px 0 6px">${esc(t('photosScale'))}</div>${fig('scale')}</div>
  <div class="modal-foot">${currentUser.role==='admin'?`<button class="btn btn-danger" id="dDel">${esc(t('del'))}</button>`:''}<span style="flex:1"></span><button class="btn" id="dPrint">${esc(t('print'))}</button><a class="btn" href="#/new/${esc(o.id)}" id="dEdit" ${canEdit()&&!isLocked(o.date)?'':'hidden'}>${esc(t('edit'))}</a><button class="btn btn-primary" data-close>${esc(t('close'))}</button></div>`,true);
  $$('[data-big]').forEach(f=>f.onclick=()=>{const p=o.photos.find(p=>p.id===f.dataset.big);if(p)lightbox(p.data)});
  $('#dEdit').onclick=()=>closeModal();
  $('#dPrint').onclick=()=>{document.body.classList.add('print-modal');window.print();setTimeout(()=>document.body.classList.remove('print-modal'),300)};
  if($('#dDel'))$('#dDel').onclick=async()=>{if(isLocked(o.date)){toast(t('lockedSave'),true);return}if(!await askYes(t('confirmDelete')))return;if(lockedReason(o.date))authLogAdd({act:'del',per:o.date.slice(0,7),seq:o.seq,changes:[]});state.occurrences=state.occurrences.filter(x=>x.id!==o.id);await persist();closeModal();toast(t('deletedMsg'));renderShell()};
}

/* Produtos: atualizações de custo por mês (planilhas do RH com a cotação do dólar informada) */
async function removeMonthCosts(k){if(!isAdmin())return;const from=k+'-01',end=toISO(new Date(Date.UTC(+k.slice(0,4),+k.slice(5,7),0)));await ensureFrom(from);
  const rm=state.costs.filter(c=>c.from>=from&&c.from<=end);if(!rm.length)return;const ids=new Set(rm.map(c=>c.id)),impIds=new Set(rm.map(c=>c.importId));
  const occ=state.occurrences.filter(o=>ids.has(o.costId)),lk=occ.filter(o=>occLocked(o.date));
  if(lk.length){toast(t('rmLocked',{n:lk.length}),true);return}
  if(!await askYes(t('rmAsk',{m:ymLabel(k),n:rm.length,o:occ.length})))return;
  state.costs=state.costs.filter(c=>!ids.has(c.id));state.costs.forEach(c=>{if(c.superseded&&impIds.has(c.superseded.by))delete c.superseded});
  state.costImports=state.costImports.filter(i=>!(impIds.has(i.id)&&!state.costs.some(c=>c.importId===i.id))&&!(i.kind==='dollar'&&i.from===from));
  occ.forEach(o=>{const c=costAt(o.code,o.date);if(c)applyPrice(c,[o]);else{o.unitCost=null;o.costId=null;o.costFrom=null;o.totalCost=null;o.updatedAt=new Date().toISOString()}});
  logCost({type:'removed',code:'*',from,count:occ.length,reason:t('rmReason',{m:ymLabel(k),n:rm.length})});
  await persist();toast(t('rmDone',{n:rm.length,o:occ.length}));renderProducts()}
function monthImportBar(k){if(!isAdmin())return '';const has=state.costs.some(c=>c.from&&c.from.slice(0,7)===k);
  return `<div class="card" style="margin:10px 0;border-inline-start:4px solid #1f6feb"><h3>📂 ${esc(t('importThisMonth'))} — ${esc(ymLabel(k))}</h3><div class="toolbar" style="margin:0"><label class="btn btn-primary"><input type="file" data-pimpm="${k}" accept=".xlsx,.csv" hidden>📂 ${esc(t('importThisMonth'))}</label><button class="btn" data-ptpl>⬇ ${esc(t('tplBtn'))}</button>${has?`<span class="sp"></span><button class="btn btn-danger" data-prm="${k}">🗑 ${esc(t('rmBtn',{m:ymLabel(k)}))}</button>`:''}</div><p class="hint" style="margin-top:6px">${esc(t('importMonthHint'))}</p></div>`}
function prodMonths(){const y=ui.pyear||(ui.pyear=+todayISO().slice(0,4)),sel=ui.pmonth||0,imps={};state.costImports.forEach(i=>imps[i.id]=i);
  const inY=state.costs.filter(c=>c.from&&+c.from.slice(0,4)===y);
  const months=Array.from({length:12},(_,i)=>{const k=`${y}-${pad(i+1)}`,l=inY.filter(c=>c.from.slice(0,7)===k);return {i:i+1,n:l.length,sheets:new Set(l.map(c=>c.importId||'-')).size,dol:[...new Set(l.map(c=>(imps[c.importId]||{}).dollar).filter(Boolean))]}});
  let h=`<div class="card" style="margin-bottom:16px"><h3>${esc(t('prodMonths'))}<span class="sp"></span><button class="btn btn-sm" data-py="-1">‹</button><b>${y}</b><button class="btn btn-sm" data-py="1">›</button></h3><p class="hint" style="margin:-4px 0 10px">${esc(t('prodMonthHelp'))}</p>
   <div class="monthbar">${months.map(m=>`<button class="${sel===m.i?'on':''} ${m.n?'st-full':''}" data-pmon="${m.i}"><b>${esc(fmtDT(new Date(Date.UTC(2000,m.i-1,1)),{month:'short'}))}</b><small>${m.n?fmtNum(m.sheets)+' '+esc(t('sheetsShort')):'—'}</small><small>${m.dol.length?esc(t('dollarShort'))+' '+m.dol.map(v=>fmtMoney(v)).join(' / '):'&nbsp;'}</small></button>`).join('')}</div>`;
  if(sel){const k=`${y}-${pad(sel)}`;h+=monthImportBar(k)+dollarPanel(y,sel);const l=inY.filter(c=>c.from.slice(0,7)===k),g={};l.forEach(c=>{const id=c.importId||'-';(g[id]=g[id]||[]).push(c)});
    const prev=c=>{let b=null;for(const x of state.costs)if(x.code===c.code&&!x.superseded&&x.from<c.from&&(!b||x.from>b.from))b=x;return b};
    h+=`<h3 style="margin-top:14px">${esc((x=>x.charAt(0).toUpperCase()+x.slice(1))(ymLabel(k)))}</h3>`;
    if(!l.length)h+=`<div class="empty">${esc(t('noSheetsMonth'))}</div>`;
    Object.entries(g).sort((a,b)=>a[1][0].from<b[1][0].from?-1:1).forEach(([id,cs])=>{const im=imps[id];
      h+=`<div class="card" style="margin:10px 0;background:var(--surface2)"><div class="toolbar" style="margin:0 0 8px"><b>${esc(t('sheetOf'))}: ${esc(im?im.file+(im.sheet?' · '+im.sheet:''):t('manualEntry'))}</b><span class="badge blue">${esc(t('vigFrom'))} ${fmtDate(cs[0].from)}</span><span class="badge">${esc(t('dollarShort'))}: ${im&&im.dollar?'US$ 1 = '+fmtMoney(im.dollar):'—'}</span>${im?`<span class="note">${esc(im.user)} · ${esc(new Date(im.at).toLocaleString(LANG))}</span>`:''}</div>
       <div class="table-wrap"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('code'))}</th><th>${esc(t('model'))}</th><th class="num">${esc(t('usdCost'))}</th><th class="num">${esc(t('dollarShort'))}</th><th class="num">${esc(t('unitCost'))}</th><th class="num">${esc(t('prevCost'))}</th><th class="num">${esc(t('hVar'))}</th></tr></thead><tbody>${cs.slice().sort((a,b)=>a.code.localeCompare(b.code)).map(c=>{const p=prev(c),v=p?(c.cost-p.cost)/p.cost*100:null;return `<tr><td>${fmtDate(c.from)}</td><td><b>${esc(c.code)}</b></td><td class="clip">${esc(c.model)}</td><td class="num">${c.usd?'US$ '+fmtNum(c.usd):'—'}</td><td class="num">${c.rate?fmtMoney(c.rate):im&&im.dollar?fmtMoney(im.dollar):'—'}</td><td class="num" style="${c.superseded?'text-decoration:line-through;opacity:.6':''}">${fmtMoney(c.cost)}${c.superseded?` <span class="badge gray">${esc(t('supersededBadge'))}</span>`:''}</td><td class="num">${p?fmtMoney(p.cost)+' <small>('+fmtDate(p.from)+')</small>':'—'}</td><td class="num" style="color:${v>0?'var(--danger)':v<0?'var(--ok)':''}">${v==null?'—':(v>0?'+':'')+fmtNum(round2(v))+'%'}</td></tr>`}).join('')}</tbody></table></div></div>`})}
  return h+'</div>'}

/* ================= PERFIS, SEMANAS, REABERTURA E DÓLAR DO MÊS ================= */
/* Perfis: admin (tudo), operator = Inspetor (lança, conclui semanas e fecha o mês), viewer = Líder/Analista (só consulta) */
const roleLabel=r=>t(r==='admin'?'roleAdmin':r==='viewer'?'roleViewer':r==='blocked'?'uBlocked':'roleInspector');
const canEdit=()=>!!currentUser&&currentUser.role!=='viewer';
const viewerCard=()=>`<div class="card empty">${esc(t('viewerOnly'))}</div>`;
/* Semana lançada: tem ocorrência ou o inspetor clicou em "Concluir semana" */
const weekKey=(y,m,w)=>`${y}-${pad(m)}-${w}`;
function weekHasOcc(y,m,w){const r=weekRange(y,m,w);return state.occurrences.some(o=>o.date>=r.s&&o.date<=r.e)}
const weekLaunched=(y,m,w)=>!!state.weekDone[weekKey(y,m,w)]||weekHasOcc(y,m,w);
function monthStatus(y,m){const n=[1,2,3,4].filter(w=>weekLaunched(y,m,w)).length;return n===4?'st-full':n?'st-part':''}
const lockIcon=(y,m)=>monthClosed(`${y}-${pad(m)}-01`)?' 🔒':'';
const monthLegend=()=>`<div class="legend-row"><span><i class="lg st-full"></i>${esc(t('legendFull'))}</span><span><i class="lg st-part"></i>${esc(t('legendPart'))}</span><span><i class="lg"></i>${esc(t('legendNone'))}</span><span>🔒 ${esc(t('monthLocked'))}</span></div>`;
/* Travas: mês fechado trava o mês inteiro; semana concluída (com descrição) trava a semana.
   Correção pedida pelo gestor: senha do administrador + motivo liberam o mês por 15 minutos, para quem digitou, com registro de tudo */
const DEMO_PASS='Ítalo2025';
function weekLock(date){const y=+String(date).slice(0,4),m=+String(date).slice(5,7),x=state.weekDone[weekKey(y,m,weekOfMonth(date))];return x&&x.locked?x:null}
function lockedReason(date){if(!date)return '';if(monthClosed(date))return 'month';if(weekLock(date))return 'week';return ''}
let AUTH=null; /* liberação vale só nesta sessão do navegador */
function authActive(date){return !!(AUTH&&currentUser&&AUTH.per===String(date).slice(0,7)&&AUTH.user===currentUser.id&&Date.now()<AUTH.until)}
const isLocked=d=>!!lockedReason(d)&&!authActive(d);
/* recálculos em lote (planilha, dólar, preencher) nunca mexem em semana/mês travado */
const occLocked=d=>!!lockedReason(d);
const authPass=()=>ONLINE?(CLOUD.hasPass?'*':''):String((state.settings||{}).authPassword||'');
const normPass=p=>String(p||'').normalize('NFC').trim();
const checkPass=async p=>ONLINE?!!(await sb.rpc('seg_senha_conferir',{p:normPass(p)})).data:!!authPass()&&normPass(p)===normPass(authPass());
function authLogAdd(e){state.authLog.unshift(Object.assign({id:uid(),at:new Date().toISOString(),user:currentUser.name},e))}
/* janela com senha (opcional) e texto obrigatório; devolve {txt} ou null */
function askModal(o){return new Promise(res=>{
  openModal(`<form id="akF"><div class="modal-head"><h2>${esc(o.title)}</h2><button type="button" class="btn btn-sm btn-ghost" data-close>✕</button></div>
   <div class="modal-body">${o.warn?`<div class="banner" style="display:block;margin-bottom:12px;border-radius:8px;border:1px solid #f0dc9c">🔒 ${esc(o.warn)}</div>`:''}
   ${o.pass?`<div class="field" style="margin-bottom:10px"><label>${esc(t('authPass'))} <span class="req">*</span></label><input type="password" name="pass" autocomplete="off" required></div>`:''}
   <div class="field"><label>${esc(o.label)} <span class="req">*</span></label><textarea name="txt" rows="3" maxlength="300" required></textarea></div></div>
   <div class="modal-foot"><span style="flex:1"></span><button type="button" class="btn" data-close>${esc(t('cancel'))}</button><button class="btn btn-primary">${esc(o.ok)}</button></div></form>`);
  const f=$('#akF');$$('[data-close]',f).forEach(b=>b.addEventListener('click',()=>res(null)));(f.pass||f.txt).focus();
  f.onsubmit=async e=>{e.preventDefault();const txt=f.txt.value.trim();
    if(o.pass&&!await checkPass(f.pass.value)){toast(t(authPass()?'authWrong':'authNoPass'),true);f.pass.value='';f.pass.focus();return}
    if(!txt){toast(t('reasonReq'),true);return}const pw=o.pass?f.pass.value:'';closeModal();res({txt,pass:pw})}})}
async function setWeekDone(y,m,w,on){const per=`${y}-${pad(m)}`,k=weekKey(y,m,w),wl=t('weekOfMonth',{n:w});
  if(monthClosed(per+'-01')){toast(t('monthClosedMsg',{m:ymLabel(per)}),true);return}
  if(on){const r=await askModal({title:t('weekCloseTitle')+' — '+wl+' · '+ymLabel(per),warn:t('weekCloseWarn'),label:t('weekCloseLabel'),ok:t('weekCloseOk')});if(!r)return;
    state.weekDone[k]={by:currentUser.name,at:new Date().toISOString(),note:r.txt,locked:true};authLogAdd({act:'weekClose',per,w,note:r.txt})}
  else{const r=await askModal({title:t('weekOpenTitle')+' — '+wl+' · '+ymLabel(per),warn:t('weekOpenWarn'),pass:true,label:t('authReason'),ok:t('weekReopenBtn')});if(!r)return;
    if(ONLINE){const x=await sb.rpc('seg_reabrir_semana',{p_chave:k,p_senha:normPass(r.pass),p_motivo:r.txt});if(x.error){toast(/SENHA/.test(x.error.message)?t('authWrong'):t('cloudSaveErr'),true);return}
      delete state.weekDone[k];CLOUD.snap.delete('weekDone|'+k);cloudAddLog(x.data);toast(t('savedOk'));renderShell();return}
    delete state.weekDone[k];authLogAdd({act:'weekOpen',per,w,note:r.txt})}
  await persist();toast(t('savedOk'));renderShell()}
/* aba do Histórico: liberar correção num mês travado */
const FLD={date:'date',client:'clientOrigin',code:'code',model:'model',problem:'problem',operator:'operator',qty:'qtyNg',unitCost:'unitCost',totalCost:'totalCost',costResp:'costResp',destination:'destination',notes:'notes',clientDesc:'clientDesc',photos:'photos'};
function occDiff(a,b){const ch=Object.keys(FLD).filter(k=>k!=='photos'&&String(a[k]??'')!==String(b[k]??'')).map(k=>({f:k,a:a[k],b:b[k]}));
  if((a.photos||[]).length!==(b.photos||[]).length)ch.push({f:'photos',a:(a.photos||[]).length,b:(b.photos||[]).length});return ch}
const diffVal=(f,v)=>f==='costResp'?respLabel(v):f==='date'?fmtDate(v):(f==='unitCost'||f==='totalCost')&&v!=null&&v!==''?fmtMoney(v):String(v??'–');
function authLogText(e){const wl=e.w?t('weekOfMonth',{n:e.w}):'';
  return {grant:t('authGrantLog'),end:t('authEndLog'),edit:t('authEditLog',{n:e.seq}),new:t('authNewLog',{n:e.seq}),del:t('authDelLog',{n:e.seq}),weekClose:t('weekLockLog',{w:wl}),weekOpen:t('weekOpenLog',{w:wl})}[e.act]||e.act}
function authPanel(ym){const y=+ym.slice(0,4),m=+ym.slice(5,7),mc=monthClosed(ym+'-01'),wks=[1,2,3,4].filter(w=>{const x=state.weekDone[weekKey(y,m,w)];return x&&x.locked});
  const log=state.authLog.filter(e=>e.per===ym);if(!mc&&!wks.length&&!log.length)return '';
  const act=authActive(ym+'-01'),locked=mc||wks.length;
  return `<div class="card" style="margin-top:12px;border-inline-start:4px solid #b7791f"><h3>🔑 ${esc(t('authTitle'))} — ${esc(ymLabel(ym))}</h3>
   ${locked?`<p class="note" style="margin:-4px 0 8px"><b>🔒 ${esc(mc?t('mClosed'):wks.map(w=>t('weekOfMonth',{n:w})).join(', ')+' · '+t('weekLocked'))}</b></p>`:''}
   ${!locked||!canEdit()?'':act?`<div class="toolbar" style="margin:0;background:#e7f6ec;border:1px solid #9fd8b0;color:#14532d;border-radius:8px;padding:8px 10px"><b>✓ ${esc(t('authActiveTxt',{u:AUTH.userName,t:new Date(AUTH.until).toLocaleTimeString(LANG,{hour:'2-digit',minute:'2-digit'})}))}</b><span class="sp"></span><button class="btn btn-sm" id="authEnd">${esc(t('authEnd'))}</button></div>`
    :`<p class="hint" style="margin:0 0 8px">${esc(t('authHelp'))}</p><div class="inline-add"><input type="password" id="authPw" placeholder="${esc(t('authPass'))}" autocomplete="off" style="max-width:200px"><input type="text" id="authWhy" maxlength="300" placeholder="${esc(t('authReason'))}" style="flex:2 1 260px"><button class="btn btn-primary" id="authGo">🔓 ${esc(t('authBtn'))}</button></div>`}
   ${log.length?`<details style="margin-top:10px" ${act?'open':''}><summary class="note" style="cursor:pointer;font-weight:600">${esc(t('authLog'))} (${log.length})</summary><div class="table-wrap" style="margin-top:8px"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('authWho'))}</th><th>${esc(t('authWhat'))}</th><th>${esc(t('authDetail'))}</th></tr></thead><tbody>${log.slice(0,60).map(e=>`<tr><td style="white-space:nowrap">${esc(new Date(e.at).toLocaleString(LANG))}</td><td>${esc(e.user)}</td><td>${esc(authLogText(e))}</td><td>${e.note?esc(e.note):''}${(e.changes||[]).map(c=>`<div><small><b>${esc(t(FLD[c.f]||c.f))}</b>: ${esc(diffVal(c.f,c.a))} → ${esc(diffVal(c.f,c.b))}</small></div>`).join('')}</td></tr>`).join('')}</tbody></table></div></details>`:''}</div>`}
function bindAuthPanel(ym){
  if($('#authGo'))$('#authGo').onclick=async()=>{const pw=$('#authPw').value,why=$('#authWhy').value.trim();
    if(!why){toast(t('reasonReq'),true);$('#authWhy').focus();return}
    if(ONLINE){if(!authPass()){toast(t('authNoPass'),true);return}const x=await sb.rpc('seg_autorizar',{p_per:ym,p_senha:normPass(pw),p_motivo:why});if(x.error){toast(/SENHA/.test(x.error.message)?t('authWrong'):t('cloudSaveErr'),true);$('#authPw').value='';return}cloudAddLog(x.data)}
    else{if(!await checkPass(pw)){toast(t(authPass()?'authWrong':'authNoPass'),true);$('#authPw').value='';return}authLogAdd({act:'grant',per:ym,note:why})}
    AUTH={id:uid(),per:ym,user:currentUser.id,userName:currentUser.name,until:Date.now()+15*60e3};await persist();toast(t('authActiveTxt',{u:AUTH.userName,t:new Date(AUTH.until).toLocaleTimeString(LANG,{hour:'2-digit',minute:'2-digit'})}));renderHistory()};
  if($('#authEnd'))$('#authEnd').onclick=async()=>{authLogAdd({act:'end',per:ym});AUTH=null;await persist();renderHistory()}}
/* Administração: senha de autorização (substitui o código de reabertura) */
function passCard(){const p=authPass();
  return `<div class="card" style="margin-bottom:16px"><h3>🔑 ${esc(t('passTitle'))}</h3><p class="hint" style="margin:-4px 0 10px">${esc(t(ONLINE?'cloudPassHelp':'passHelp'))}</p>
   <div class="inline-add"><input type="password" id="apNew" placeholder="${esc(t('passNew'))}" autocomplete="new-password"><button class="btn btn-primary" id="apSave">${esc(t('save'))}</button></div>
   <p class="note" style="margin-top:6px">${esc(p?t('passIsSet'):t('passNotSet'))}${p===DEMO_PASS?' '+esc(t('passDemo',{p:DEMO_PASS})):''}</p></div>`}
function bindPassCard(){const b=$('#apSave');if(b)b.onclick=async()=>{const v=normPass($('#apNew').value);if(v.length<4){toast(t('passShort'),true);return}
  if(ONLINE){const r=await sb.rpc('seg_senha_definir',{p:v});if(r.error){toast(t('cloudSaveErr'),true);return}CLOUD.hasPass=true}else state.settings.authPassword=v;authLogAdd({act:'pass',per:''});await persist();toast(t('passSaved'));renderAdmin()}}

/* Dólar do mês: preço do mês = custo base em US$ × dólar; vale a partir do dia 1 do mês */
const round4=n=>Math.round((+n+Number.EPSILON)*10000)/10000;
function usdCalcCard(){const miss=state.products.filter(p=>p.active!==false&&!(+p.usd>0));if(!isAdmin()||!state.products.length)return '';
  return `<div class="card" style="margin-bottom:16px"><h3>${esc(t('usdCalcTitle'))}</h3><p class="hint" style="margin:-4px 0 10px">${esc(t('usdCalcHelp'))}</p>
   <div class="inline-add"><input type="number" id="usdRate" step="0.0001" min="0" placeholder="${esc(t('dollarShort'))} (ex.: 5,50)"><button class="btn btn-primary" id="usdCalc" ${miss.length?'':'disabled'}>${esc(t('usdCalcBtn'))}</button></div><p class="note" style="margin-top:6px">${esc(miss.length?t('usdMissing',{n:miss.length}):t('usdAllSet'))}</p></div>`}
async function usdCalc(){const r=+String(($('#usdRate')||{}).value||'').replace(',','.');if(!(r>0)){toast(t('costInvalid'),true);return}let n=0;
  state.products.filter(p=>p.active!==false&&!(+p.usd>0)).forEach(p=>{const c=costAt(p.code,todayISO());if(c){p.usd=round4(c.cost/r);p.usdFrom={rate:r,at:new Date().toISOString(),by:currentUser.name};n++}});
  await persist();toast(t('usdDone',{n}));renderProducts()}
function dollarPanel(y,m){if(!isAdmin())return '';const k=`${y}-${pad(m)}`,cur=state.costImports.find(i=>i.kind==='dollar'&&i.from===k+'-01');
  return `<div class="card" style="margin:10px 0;border-inline-start:4px solid var(--accent)"><h3>${esc(t('dollarMonth'))} — ${esc(ymLabel(k))}</h3><div class="inline-add"><input type="number" id="dolRate" step="0.0001" min="0" value="${cur?cur.dollar:''}" placeholder="ex.: 5,80"><button class="btn btn-primary" id="dolApply" data-ym="${k}">${esc(t('dollarApply'))}</button></div><p class="hint" style="margin-top:6px">${esc(t('usdHint'))} ${esc(t('dollarOnlyMonth'))}</p></div>`}
function dollarPreview(k){if(needLoad(k+'-01')){ensureFrom(k+'-01').then(()=>dollarPreview(k));return}const r=+String(($('#dolRate')||{}).value||'').replace(',','.');if(!(r>0)){toast(t('costInvalid'),true);return}
  const from=k+'-01',end=toISO(new Date(Date.UTC(+k.slice(0,4),+k.slice(5,7),0))),act=state.products.filter(p=>p.active!==false),withU=act.filter(p=>+p.usd>0),without=act.filter(p=>!(+p.usd>0));
  const items=withU.map(p=>{const code=normCode(p.code);return {p,code,cost:round2(p.usd*r),cur:costAt(code,from)}});
  const byCode={};items.forEach(i=>byCode[i.code]=i);
  const occ=state.occurrences.filter(o=>o.date>=from&&o.date<=end&&byCode[normCode(o.code)]&&!o.costManual&&!occLocked(o.date)&&+o.unitCost!==byCode[normCode(o.code)].cost);
  const closedMonth=monthClosed(from),mids=state.costs.filter(c=>!c.superseded&&c.from>from&&c.from<=end&&byCode[c.code]);
  openModal(`<div class="modal-head"><h2>${esc(t('dollarPreviewTitle',{m:ymLabel(k)}))}</h2><button class="btn btn-sm btn-ghost" data-close>✕</button></div><div class="modal-body">
   <p class="note">${esc(t('dollarPreviewTxt',{d:fmtDate(from)}))} · US$ 1 = <b>${fmtMoney(r)}</b></p>
   <div class="table-wrap" style="max-height:260px;margin:8px 0"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('code'))}</th><th>${esc(t('model'))}</th><th class="num">${esc(t('usdCost'))}</th><th class="num">${esc(t('prevCost'))}</th><th class="num">${esc(t('newPrice'))}</th></tr></thead><tbody>${items.map(i=>`<tr><td>${fmtDate(from)}</td><td><b>${esc(i.code)}</b></td><td class="clip">${esc(i.p.model)}</td><td class="num">US$ ${fmtNum(i.p.usd)}</td><td class="num">${i.cur?fmtMoney(i.cur.cost):'—'}</td><td class="num"><b>${fmtMoney(i.cost)}</b></td></tr>`).join('')}</tbody></table></div>
   ${without.length?`<div class="banner" style="margin-bottom:8px">${esc(t('dollarSkipped',{v:without.map(p=>p.code).join(', ')}))}</div>`:''}
   ${mids.length?`<div class="banner" style="margin-bottom:8px;display:block"><b>${esc(t('dollarMidMonth',{n:mids.length}))}</b><br>${mids.slice(0,40).map(c=>esc(c.code+' · '+fmtDate(c.from)+' · '+fmtMoney(c.cost))).join('<br>')}${mids.length>40?'<br>…':''}</div>`:''}${closedMonth?`<div class="banner">${esc(t('monthClosedMsg',{m:ymLabel(k)}))}</div>`:occ.length?`<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="dolRec" checked> ${esc(t('dollarRecalc',{n:occ.length,m:ymLabel(k)}))}</label>${affTable(occ.map(o=>({o,v:byCode[normCode(o.code)].cost})))}`:''}
  </div><div class="modal-foot"><button class="btn" data-close>${esc(t('cancel'))}</button><button class="btn btn-primary" id="dolOk" ${items.length?'':'disabled'}>${esc(t('dollarApply'))}</button></div>`,true);
  $('#dolOk').onclick=async()=>{const rec=!!($('#dolRec')&&$('#dolRec').checked),at=new Date().toISOString();
    const imp={id:uid(),kind:'dollar',at,user:currentUser.name,file:t('dollarAuto'),sheet:ymLabel(k),hash:'dolar-'+k+'-'+at,from,dollar:r,rows:items.length,inserted:0,updated:0,same:0,ignored:without.length,filled:0,recalc:0,demo:false};
    items.forEach(i=>{let c=state.costs.find(x=>x.code===i.code&&x.from===from);
      if(!c){c={id:uid(),code:i.code,model:i.p.model,cost:i.cost,from,importId:imp.id,at,usd:i.p.usd,rate:r,demo:false};state.costs.push(c);imp.inserted++}
      else if(c.cost!==i.cost){logCost({type:'correction',code:i.code,from,old:c.cost,new:i.cost,count:0,reason:t('tDollar')+' (US$ 1 = '+fmtMoney(r)+')',importId:imp.id});c.prev=(c.prev||[]).concat([{cost:c.cost,at:c.at,importId:c.importId}]);Object.assign(c,{cost:i.cost,importId:imp.id,at,usd:i.p.usd,rate:r});imp.updated++}
      else{c.importId=imp.id;c.usd=i.p.usd;c.rate=r;imp.same++}});
    mids.forEach(c=>{c.superseded={by:imp.id,at,user:currentUser.name};logCost({type:'superseded',code:c.code,from:c.from,old:c.cost,new:byCode[c.code].cost,count:0,reason:t('tDollar')+' (US$ 1 = '+fmtMoney(r)+')',importId:imp.id})});imp.superseded=mids.length;
    if(rec&&!closedMonth){const before=[];occ.forEach(o=>{const c=costAt(o.code,o.date);if(c&&c.importId===imp.id&&+o.unitCost!==c.cost){before.push({id:o.id,seq:o.seq,old:o.unitCost,oldTotal:o.totalCost});applyPrice(c,[o])}});
      imp.recalc=before.length;if(before.length)logCost({type:'recalc',code:'*',from,new:null,count:before.length,reason:t('tDollar')+' (US$ 1 = '+fmtMoney(r)+')',importId:imp.id,items:before})}
    state.costImports.unshift(imp);await persist();closeModal();toast(t('dollarDone',{n:imp.inserted+imp.updated+imp.same,r:imp.recalc}));renderProducts()}}

/* ================= PRODUTOS ================= */
function renderProducts(){
  const q=ui.prodQ.trim().toLowerCase();
  const list=state.products.filter(p=>!q||(p.code+' '+p.model).toLowerCase().includes(q)).sort((a,b)=>a.code.localeCompare(b.code));
  const count=c=>state.occurrences.filter(o=>o.code===c).length;
  $('#view').innerHTML=usdCalcCard()+prodMonths()+`<div class="card"><div class="toolbar"><input type="search" id="pq" placeholder="${esc(t('code'))} / ${esc(t('model'))}" value="${esc(ui.prodQ)}" style="flex:1 1 240px"><span class="sp"></span>${isAdmin()?`<button class="btn" id="pTpl">⬇ ${esc(t('tplBtn'))}</button><label class="btn"><input type="file" id="pImp" accept=".xlsx,.csv" hidden>📂 ${esc(t('prodImport'))}</label>`:''}<button class="btn btn-primary" id="pNew" ${canEdit()?'':'hidden'}>＋ ${esc(t('newProduct'))}</button></div><p class="hint" style="margin:-6px 0 12px">${esc(t('prodImportHint'))}</p>
  ${list.length?`<div class="table-wrap"><table><thead><tr><th>${esc(t('code'))}</th><th>${esc(t('model'))}</th><th class="num">${esc(t('costToday'))}</th><th class="num">${esc(t('weightKg'))}</th><th>${esc(t('status'))}</th><th class="num">${esc(t('kpiOcc'))}</th><th></th></tr></thead><tbody>
  ${list.map(p=>`<tr><td><b>${esc(p.code)}</b>${demoBadge(p)}</td><td>${esc(p.model)}</td><td class="num">${(c=>c?fmtMoney(c.cost)+'<br><small>'+esc(t('since'))+' '+fmtDate(c.from)+'</small>':`<span class="badge gray">${esc(t('noCostShort'))}</span>`)(costAt(p.code,todayISO()))}</td><td class="num">${p.weight===''||p.weight==null?'–':fmtNum(p.weight)}</td><td><span class="badge ${p.active?'green':'gray'}">${esc(t(p.active?'active':'inactive'))}</span></td><td class="num">${fmtNum(count(p.code))}</td><td><div class="row-actions"><button class="btn btn-sm" data-pedit="${esc(p.id)}" ${canEdit()?'':'hidden'}>${esc(t('edit'))}</button><button class="btn btn-sm btn-danger" data-pdel="${esc(p.id)}" ${canEdit()?'':'hidden'}>${esc(t('del'))}</button></div></td></tr>`).join('')}
  </tbody></table></div>`:`<div class="empty">${esc(t('noProducts'))}</div>`}<p class="hint">${esc(t('weightKg'))}: ${esc(t('weightNote'))}</p><p class="hint">${esc(t('costFromHistory'))}</p></div>`;
  let tm;$('#pq').oninput=e=>{clearTimeout(tm);tm=setTimeout(()=>{ui.prodQ=e.target.value;renderProducts();const i=$('#pq');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)};
  $('#pNew').onclick=()=>productModal();
  $$('[data-py]').forEach(b=>b.onclick=()=>{ui.pyear+=+b.dataset.py;ui.pmonth=0;renderProducts()});
  if($('#usdCalc'))$('#usdCalc').onclick=usdCalc;if($('#dolApply'))$('#dolApply').onclick=()=>dollarPreview($('#dolApply').dataset.ym);
  $$('[data-pmon]').forEach(b=>b.onclick=()=>{ui.pmonth=ui.pmonth===+b.dataset.pmon?0:+b.dataset.pmon;renderProducts()});
  $$('[data-pimpm]').forEach(i=>i.onchange=e=>{const f=e.target.files[0];if(f)loadCostFile(f,i.dataset.pimpm)});$$('[data-ptpl]').forEach(b=>b.onclick=downloadTemplate);$$('[data-prm]').forEach(b=>b.onclick=()=>removeMonthCosts(b.dataset.prm));
  if($('#pTpl')){$('#pTpl').onclick=downloadTemplate;$('#pImp').onchange=e=>{const f=e.target.files[0];if(f)loadCostFile(f)}}
  $$('[data-pedit]').forEach(b=>b.onclick=()=>productModal(state.products.find(p=>p.id===b.dataset.pedit)));
  $$('[data-pdel]').forEach(b=>b.onclick=async()=>{const p=state.products.find(p=>p.id===b.dataset.pdel);if(!p||!await askYes(t('removeConfirm')))return;await ensureFrom('');
    if(count(p.code)){p.active=false;toast(t('productInUse'))}else state.products=state.products.filter(x=>x!==p);await persist();renderProducts()});
}
function productModal(p){
  openModal(`<form id="pForm"><div class="modal-head"><h2>${esc(p?t('edit'):t('newProduct'))}${demoBadge(p)}</h2><button type="button" class="btn btn-sm btn-ghost" data-close>✕</button></div>
  <div class="modal-body form-grid" style="grid-template-columns:1fr 1fr">
   <div class="field"><label>${esc(t('code'))} <span class="req">*</span></label><input type="text" name="code" value="${esc(p?p.code:'')}" required></div>
   <div class="field"><label>${esc(t('status'))}</label><select name="active"><option value="1">${esc(t('active'))}</option><option value="0" ${p&&!p.active?'selected':''}>${esc(t('inactive'))}</option></select></div>
   <div class="field span3"><label>${esc(t('model'))} <span class="req">*</span></label><input type="text" name="model" value="${esc(p?p.model:'')}" required></div>
   <div class="field"><label>${esc(t('costToday'))}</label><div class="calc">${p&&costAt(p.code,todayISO())?fmtMoney(costAt(p.code,todayISO()).cost):'—'}</div><div class="hint">${esc(t('costFromHistory'))}</div></div>
   <div class="field"><label>${esc(t('usdCost'))}</label><input type="number" name="usd" min="0" step="0.0001" value="${p&&p.usd!=null?p.usd:''}"><div class="hint">${esc(t('usdHint'))}</div></div>
   <div class="field"><label>${esc(t('weightKg'))}</label><input type="number" name="weight" min="0" step="0.001" value="${p&&p.weight!=null?p.weight:''}"><div class="hint">${esc(t('weightNote'))}</div></div>
  </div><div class="modal-foot"><button type="button" class="btn" data-close>${esc(t('cancel'))}</button><button class="btn btn-primary">${esc(t('save'))}</button></div></form>`);
  $('#pForm').onsubmit=async e=>{e.preventDefault();const f=e.target;const code=f.code.value.trim(),model=f.model.value.trim();
    if(!code||!model){toast(t('requiredMsg'),true);return}
    if(state.products.some(x=>x!==p&&x.code.toLowerCase()===code.toLowerCase())){toast(t('dupCode'),true);return}
    const data={code,model,usd:f.usd.value===''?null:round4(+f.usd.value),weight:f.weight.value===''?null:+f.weight.value,active:f.active.value==='1'};
    if(p&&p.code!==code)await ensureFrom('');
    if(p){if(p.code!==code)state.occurrences.forEach(o=>{if(o.code===p.code)o.code=code});Object.assign(p,data)}else state.products.push(Object.assign({id:uid(),demo:false},data));
    await persist();closeModal();toast(t('savedOk'));renderProducts()};
}

/* ================= ADMINISTRAÇÃO (DEMONSTRATIVA) ================= */
function renderAdmin(){
  if(currentUser.role!=='admin'){$('#view').innerHTML=`<div class="card empty">${esc(t('adminOnly'))}</div>`;return}
  const chips=(arr,key)=>`<div class="chip-list">${arr.map((v,i)=>`<span class="chip">${esc(v)}<button data-rm="${key}" data-i="${i}" aria-label="${esc(t('remove'))}">×</button></span>`).join('')}</div>`;
  $('#view').innerHTML=`
  ${passCard()}${ONLINE?'':`<div class="card limits" style="margin-bottom:16px"><h3>${esc(t('limitsTitle'))}</h3><ul class="note">${[1,2,3,4,5].map(i=>`<li>${esc(t('limit'+i))}</li>`).join('')}</ul></div>`}
  <div class="grid g2" style="margin-bottom:16px">
   ${ONLINE?peopleCard():`<div class="card"><h3>${esc(t('users'))}</h3>
    <div class="table-wrap" style="margin-bottom:12px"><table><thead><tr><th>${esc(t('username'))}</th><th>${esc(t('name'))}</th><th>${esc(t('role'))}</th><th></th></tr></thead><tbody>
    ${state.users.map(u=>`<tr><td>${esc(u.username)}</td><td>${esc(u.name)}</td><td>${esc(roleLabel(u.role))}</td><td><div class="row-actions"><button class="btn btn-sm" data-upw="${esc(u.id)}">🔑 ${esc(t('uPass'))}</button><button class="btn btn-sm btn-danger" data-urm="${esc(u.id)}">${esc(t('remove'))}</button></div></td></tr>`).join('')}</tbody></table></div>
    <form class="inline-add" id="uAdd"><input name="username" placeholder="${esc(t('username'))}" required><input name="name" placeholder="${esc(t('name'))}" required><input name="password" type="password" placeholder="${esc(t('password'))}" required autocomplete="new-password"><select name="role"><option value="operator">${esc(t('roleInspector'))}</option><option value="viewer">${esc(t('roleViewer'))}</option><option value="admin">${esc(t('roleAdmin'))}</option></select><button class="btn btn-primary">${esc(t('addUser'))}</button></form>
    <p class="hint">${esc(t('usersNote'))}</p></div>`}
   <div class="card"><h3>${esc(t('settings'))}</h3>
    <form id="sForm" class="form-grid" style="grid-template-columns:1fr">
     <div class="field"><label>${esc(t('companyName'))}</label><input type="text" name="company" value="${esc(state.settings.company)}"></div>
     <div class="field"><label>${esc(t('currency'))}</label><select name="currency">${CURRENCIES.map(c=>`<option ${c===state.settings.currency?'selected':''}>${c}</option>`).join('')}</select><div class="hint">${esc(t('currencyNote'))}</div></div>
     <div><button class="btn btn-primary">${esc(t('save'))}</button></div></form></div>
  </div>
  <div class="card" style="margin-bottom:16px"><h3>${esc(t('lists'))}</h3>
   <div class="grid g2">
    <div><div class="note" style="font-weight:600;margin-bottom:8px">${esc(t('clientsList'))}</div>
     <div class="chip-list">${state.clients.map(c=>`<span class="chip">${esc(c.name)} <small>· ${esc(originLabel(c.type))}</small>${c.demo?' <span class="badge">'+esc(t('demoBadge'))+'</span>':''}<button data-crm="${esc(c.id)}" aria-label="${esc(t('remove'))}">×</button></span>`).join('')}</div>
     <form class="inline-add" id="cAdd"><input name="name" placeholder="${esc(t('name'))}" required><select name="type"><option value="client">${esc(t('originClient'))}</option><option value="internal">${esc(t('originInternal'))}</option></select><button class="btn">${esc(t('add'))}</button></form></div>
    <div><div class="note" style="font-weight:600;margin-bottom:8px">${esc(t('problemsList'))}</div>${chips(state.problems,'problems')}
     <form class="inline-add" data-add="problems"><input name="v" required><button class="btn">${esc(t('add'))}</button></form>
     <div class="note" style="font-weight:600;margin:16px 0 8px">${esc(t('destinationsList'))}</div>${chips(state.destinations,'destinations')}
     <form class="inline-add" data-add="destinations"><input name="v" required><button class="btn">${esc(t('add'))}</button></form><p class="hint">${esc(t('destHint'))}</p></div>
   </div></div>
  <div class="card"><h3>${esc(t('dataMaint'))}</h3>
   <div class="toolbar" style="margin:0"><a class="btn btn-primary" href="#/data">💾 ${esc(t('navData'))}</a><span class="sp"></span><button class="btn" id="bRmDemo">${esc(t('removeDemo'))}</button><button class="btn" id="bDemo">${esc(t('resetDemo'))}</button><button class="btn btn-danger" id="bClear">${esc(t('clearAll'))}</button></div></div>`;
  const save=async()=>{await persist();toast(t('savedOk'));renderShell()};
  bindPassCard();
  if(ONLINE)bindPeople();else $('#uAdd').onsubmit=e=>{e.preventDefault();const f=e.target,u=f.username.value.trim();if(state.users.some(x=>x.username.toLowerCase()===u.toLowerCase())){toast(t('dupUser'),true);return}
    state.users.push({id:uid(),username:u,name:f.name.value.trim(),password:f.password.value,role:f.role.value});save()};
  $$('[data-upw]').forEach(b=>b.onclick=()=>{const u=state.users.find(x=>x.id===b.dataset.upw);passModal(u.name,'',async v=>{u.password=v;await persist();toast(t('uPassOk'))})});
  $$('[data-urm]').forEach(b=>b.onclick=async()=>{const u=state.users.find(x=>x.id===b.dataset.urm);if(u.role==='admin'&&state.users.filter(x=>x.role==='admin').length<=1){toast(t('lastAdmin'),true);return}
    if(!await askYes(t('removeConfirm')))return;state.users=state.users.filter(x=>x!==u);if(u.id===currentUser.id){save();$('#logoutBtn').click();return}save()});
  $('#sForm').onsubmit=e=>{e.preventDefault();state.settings.company=e.target.company.value.trim();state.settings.currency=e.target.currency.value;save()};
  $('#cAdd').onsubmit=e=>{e.preventDefault();const n=e.target.name.value.trim();if(!n)return;state.clients.push({id:uid(),name:n,type:e.target.type.value,demo:false});save()};
  $$('[data-crm]').forEach(b=>b.onclick=async()=>{if(!await askYes(t('removeConfirm')))return;state.clients=state.clients.filter(c=>c.id!==b.dataset.crm);save()});
  $$('[data-add]').forEach(f=>f.onsubmit=e=>{e.preventDefault();const v=f.v.value.trim(),k=f.dataset.add;if(v&&!state[k].includes(v)){state[k].push(v);save()}});
  $$('[data-rm]').forEach(b=>b.onclick=async()=>{if(!await askYes(t('removeConfirm')))return;state[b.dataset.rm].splice(+b.dataset.i,1);save()});
  $('#bRmDemo').onclick=async()=>{if(!await askYes(t('removeDemoConfirm')))return;await ensureFrom('');const demoProblems=buildDemoProblems();
    state.occurrences=state.occurrences.filter(o=>!o.demo);state.products=state.products.filter(p=>!p.demo);state.clients=state.clients.filter(c=>!c.demo);
    state.problems=state.problems.filter(p=>!demoProblems.includes(p)||state.occurrences.some(o=>o.problem===p));state.costs=state.costs.filter(c=>!c.demo);state.costImports=state.costImports.filter(i=>!i.demo);save()};
  $('#bDemo').onclick=async()=>{if(!await askYes(t('resetConfirm')))return;await ensureFrom('');const users=state.users,settings=state.settings;state=buildDemoState();state.users=users;state.settings=settings;save()};
  $('#bClear').onclick=async()=>{if(!await askYes(t('clearConfirm')))return;await ensureFrom('');state=emptyState(true);save()};
}
/* ================= DADOS & BACKUP =================
   Online: limites do plano grátis do Supabase (500 MB de banco, 1 GB de fotos), divididos com o QC.
   Offline: o limite é o espaço que o navegador libera neste computador. */
const fmtB=b=>{b=+b||0;return b>=1073741824?(b/1073741824).toFixed(2)+' GB':b>=1048576?(b/1048576).toFixed(1)+' MB':Math.round(b/1024)+' KB'};
const DB_LIM=524288000,PH_LIM=1073741824,PH_DEFAULT=150*1024,REC_DEFAULT=2048,WARN_AT=.8;
async function dataUsage(){const refs={product:0,defect:0,scale:0},inl={n:0,b:0},demo={n:0,b:0};let refN=0,recPh=0;
  state.occurrences.forEach(o=>{(o.photos||[]).forEach(p=>{refN++;refs[p.kind]=(refs[p.kind]||0)+1;if(!p.path){const b=Math.round((p.data||'').length*.75);inl.n++;inl.b+=b;if(/^demo-/.test(p.name||'')){demo.n++;demo.b+=b}}});if((o.photos||[]).length)recPh++});
  const u={recs:state.occurrences.length,refN,refs,recPh,demo,em:new Date()};
  if(ONLINE){const r=await sb.rpc('seg_uso');if(r.error)throw r.error;const d=r.data;
    u.recs=+d.ocorrencias;Object.assign(u,{docs:+d.docs,dbUsed:+d.banco_bytes,dbLim:DB_LIM,segBytes:+d.seg_bytes,phSent:+d.fotos_seg_n+inl.n,phBytes:+d.fotos_seg_bytes+inl.b,phUsed:+d.storage_bytes+inl.b,phLim:PH_LIM})}
  else{let q=0,used=0;try{const e=await navigator.storage.estimate();q=e.quota||0;used=e.usage||0}catch(e){}
    const txt=new Blob([JSON.stringify(state)]).size,seg=Math.max(0,txt-inl.b);
    Object.assign(u,{docs:u.recs+state.products.length+state.costs.length,dbUsed:Math.max(used,txt),dbLim:q||DB_LIM,segBytes:seg,phSent:inl.n,phBytes:inl.b,phUsed:Math.max(used,txt),phLim:q||PH_LIM})}
  return u}
function renderData(){const v=$('#view');if(!ui.usage||(ui.usage.em&&Date.now()-ui.usage.em>6e4)){ui.usage={loading:true};dataUsage().then(u=>{ui.usage=u}).catch(e=>{console.warn(e);ui.usage={err:true}}).then(()=>{if(route().name==='data')renderData()})}
  if(ui.usage.loading){v.innerHTML=`<div class="card empty">${esc(t('dataCalc'))}</div>`;return}
  const u=ui.usage;if(u.err){v.innerHTML=`<div class="card empty">${esc(t('dataErr'))}<div style="margin-top:10px"><button class="btn" id="dRef">${esc(t('dataRefresh'))}</button></div></div>`;$('#dRef').onclick=()=>{ui.usage=null;renderData()};return}
  const realN=u.phSent-u.demo.n,avgPh=realN>0?(u.phBytes-u.demo.b)/realN:PH_DEFAULT,avgRec=u.recs?Math.max(256,u.segBytes/u.recs):REC_DEFAULT,perRec=u.recs?u.refN/u.recs:3;
  const dbFree=Math.max(0,u.dbLim-u.dbUsed),phFree=Math.max(0,u.phLim-u.phUsed),fitPh=Math.floor(phFree/avgPh),fitRecDb=Math.floor(dbFree/avgRec),fitRecPh=perRec>0?Math.floor(fitPh/perRec):fitRecDb,fitRec=Math.min(fitRecDb,fitRecPh);
  const toFree=Math.max(0,u.dbUsed-u.dbLim*WARN_AT)+(ONLINE?Math.max(0,u.phUsed-u.phLim*WARN_AT):0);
  const from=addDays(parseISO(todayISO()),-90),last=state.occurrences.filter(o=>o.date>=toISO(from)).length,perMonth=last/3,months=perMonth>0?Math.floor(fitRec/perMonth):null;
  const box=(l,val,sub,c)=>`<div class="card kpi vivid ${c}"><div class="lbl">${esc(l)}</div><div class="val">${esc(val)}</div><div class="sub">${esc(sub||'')}</div></div>`;
  const bar=(l,used,lim)=>{const p=lim?used/lim*100:0,c=p<70?'#10b981':p<90?'#f59e0b':'#ef4444';return `<div style="display:flex;justify-content:space-between;font-size:13px;margin:12px 0 6px"><span>${esc(l)}: <b>${fmtB(used)}</b> / ${fmtB(lim)}</span><span class="note">${(p<.1?p.toFixed(2):p.toFixed(1)).replace('.',',')}%</span></div><div style="height:10px;border-radius:5px;background:var(--surface2);border:1px solid var(--border);overflow:hidden"><div style="width:${Math.min(100,p).toFixed(2)}%;min-width:4px;height:100%;background:${c}"></div></div>`};
  const b=state.settings.ultimoBackup,days=b&&b.em?Math.floor((Date.now()-new Date(b.em).getTime())/864e5):null,late=days===null||days>60;
  v.innerHTML=`<div class="toolbar"><span class="note">${esc(t(ONLINE?'dataOnlineHelp':'dataOfflineHelp'))}</span>${lpNote()}<span class="sp"></span><button class="btn btn-sm" id="dRef">↻ ${esc(t('dataRefresh'))}</button></div>
  <div class="card" style="margin-bottom:16px"><h3>🗄 ${esc(t('dataDb'))}</h3><div class="grid g4">${box(t('dataRecs'),fmtNum(u.recs),t('dataDocs',{n:fmtNum(u.docs)}),'k1')}${box(t('dataUsed'),fmtB(u.dbUsed),ONLINE?t('dataSegShare',{v:fmtB(u.segBytes)}):'','k3')}${box(t('dataFree'),fmtB(dbFree),t('dataOf',{v:fmtB(u.dbLim)}),'k5')}${box(t('dataToFree'),toFree?fmtB(toFree):t('dataNone'),t('dataToFreeSub'),toFree?'k2':'k4')}</div>${bar(t('dataDb'),u.dbUsed,u.dbLim)}</div>
  <div class="card" style="margin-bottom:16px"><h3>📷 ${esc(t('dataPhotos'))}</h3><div class="grid g4">${box(t('dataSent'),fmtNum(u.phSent),fmtB(u.phBytes),'k1')}${box(t('dataInRecs'),fmtNum(u.refN),t('dataRecsWith',{n:fmtNum(u.recPh)}),'k4')}${box(t('dataAvg'),fmtB(avgPh),t('dataStd',{v:fmtB(PH_DEFAULT)}),'k3')}${box(t('dataPhFit'),fmtNum(fitPh),t('dataFree')+': '+fmtB(phFree),'k5')}</div>
   <div class="stat-row" style="margin-top:12px"><div><small>${esc(t('photosProduct'))}</small><b>${fmtNum(u.refs.product)}</b></div><div><small>${esc(t('photosDefect'))}</small><b>${fmtNum(u.refs.defect)}</b></div><div><small>${esc(t('photosScale'))}</small><b>${fmtNum(u.refs.scale)}</b></div></div>${bar(t('dataPhotos'),u.phUsed,u.phLim)}${ONLINE?`<p class="hint">${esc(t('dataShared'))}</p>`:''}</div>
  <div class="card" style="margin-bottom:16px"><h3>📈 ${esc(t('dataCap'))}</h3><div class="grid g4">${box(t('dataRecFit'),fmtNum(fitRec),t('dataRecFitSub'),'k5')}${box(t('dataRecNoPh'),fmtNum(fitRecDb),t('dataRecNoPhSub'),'k1')}${box(t('dataAvgRec'),fmtB(avgRec),t('dataPerRec',{n:perRec.toFixed(1).replace('.',',')}),'k4')}${box(t('dataPace'),fmtNum(Math.round(perMonth)),months==null?'':t('dataMonths',{n:fmtNum(months)}),'k3')}</div><p class="hint" style="margin-top:10px">${esc(t('dataEstimate'))}</p></div>
  <div class="card" style="margin-bottom:16px"><h3>📥 ${esc(t('exTitle'))}</h3><p class="hint" style="margin:-4px 0 12px">${esc(t('exHelp'))}</p><div class="grid g2">${[['xlsx','📊','exExcel','exExcelSub'],['csv','🧾','exCsv','exCsvSub'],['pdf','📄','exPdf','exPdfSub'],['dash','🖨','exDash','exDashSub'],['pack','📦','exPack','exPackSub']].map(([k,i,a,b])=>`<button class="btn" data-exp="${k}" style="justify-content:flex-start;text-align:start;white-space:normal;padding:12px;height:auto;display:block"><b>${i} ${esc(t(a))}</b><br><small class="note">${esc(t(b))}</small></button>`).join('')}</div></div>
  <div class="card" style="border-color:${late?'var(--danger)':'var(--border)'}"><h3>💾 ${esc(t('backup'))}</h3><p class="note">${b&&b.em?esc(t('dataLastBk',{d:new Date(b.em).toLocaleString(LANG),u:b.por||'',n:days})):esc(t('dataNoBk'))} ${late?`<b style="color:var(--danger)">${esc(t('dataBkLate'))}</b>`:''}</p>
   <div class="toolbar" style="margin:10px 0 0">${canEdit()?`<button class="btn btn-primary" id="bExp">⬇ ${esc(t('exportJson'))}</button>`:''}${isAdmin()?`<label class="btn">⬆ ${esc(t('importJson'))}<input type="file" id="bImp" accept="application/json,.json" hidden></label>`:''}</div></div>`;
  $('#dRef').onclick=()=>{ui.usage=null;renderData()};
  $$('[data-exp]').forEach(b=>b.onclick=()=>exportAs(b.dataset.exp));
  if($('#bExp'))$('#bExp').onclick=exportBackup;if($('#bImp'))$('#bImp').onchange=importBackup}
/* Janela para digitar a nova senha de um usuário */
function passModal(who,warn,save){openModal(`<form id="pwF"><div class="modal-head"><h2>🔑 ${esc(t('uPass'))} — ${esc(who)}</h2><button type="button" class="btn btn-sm btn-ghost" data-close>✕</button></div><div class="modal-body">${warn?`<div class="banner" style="display:block;margin-bottom:12px;border-radius:8px;border:1px solid #f0dc9c">${esc(warn)}</div>`:''}<div class="field"><label>${esc(t('passNew'))} <span class="req">*</span></label><input type="password" name="p" minlength="8" required autocomplete="new-password"><div class="hint">${esc(t('uPassShort'))}</div></div></div><div class="modal-foot"><span style="flex:1"></span><button type="button" class="btn" data-close>${esc(t('cancel'))}</button><button class="btn btn-primary">${esc(t('save'))}</button></div></form>`);
  const f=$('#pwF');f.p.focus();f.onsubmit=async e=>{e.preventDefault();if(f.p.value.length<8){toast(t('uPassShort'),true);return}try{await save(f.p.value);closeModal()}catch(err){toast(err.message||t('cloudSaveErr'),true)}}}
/* Salvar em outros formatos: as mesmas tabelas viram planilha Excel, arquivos CSV e pacote completo */
function exportTables(photoName){const O=state.occurrences.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.seq-b.seq),D='d',M='m',N='n',wk=d=>t('weekOfMonth',{n:weekOfMonth(d)});
  const T=[];const add=(name,cols,rows)=>T.push({name,cols,rows});
  add(t('kpiOcc'),[[t('idNo'),N,8],[t('date'),D,12],[t('periodWeek'),0,12],[t('originType'),0,12],[t('clientOrigin'),0,26],[t('code'),0,18],[t('model'),0,30],[t('problem'),0,30],[t('operator'),0,20],[t('clientDesc'),0,40],[t('qtyNg'),N,10],[t('unitCost'),M,13],[t('totalCost'),M,13],[t('destination'),0,14],[t('costResp'),0,20],[t('notes'),0,30],[t('createdBy'),0,20],[t('photos'),N,8],[t('photos')+' ('+t('exFiles')+')',0,40]],
    O.map(o=>[o.seq,o.date,wk(o.date),originLabel(o.originType),o.client,o.code,o.model,o.problem,o.operator||'',o.clientDesc||'',o.qty,hasCost(o)?+o.unitCost:'',hasCost(o)?+o.totalCost:'',o.destination,respLabel(o.costResp),o.notes||'',o.createdBy||'',(o.photos||[]).length,photoName?(o.photos||[]).map(p=>photoName(o,p)).join(' | '):'']));
  add(t('navProducts'),[[t('code'),0,18],[t('model'),0,34],[t('costToday'),M,14],[t('usdCost'),N,12],[t('weightKg'),N,10],[t('status'),0,10]],state.products.slice().sort((a,b)=>a.code.localeCompare(b.code)).map(p=>{const c=costAt(p.code,todayISO());return [p.code,p.model,c?c.cost:'',p.usd==null?'':+p.usd,p.weight==null||p.weight===''?'':+p.weight,t(p.active?'active':'inactive')]}));
  add(t('exCosts'),[[t('vigFrom'),D,12],[t('code'),0,18],[t('model'),0,34],[t('unitCost'),M,14],[t('usdCost'),N,12],[t('dollarShort'),N,10],[t('supersededBadge'),0,12]],state.costs.slice().sort((a,b)=>a.from.localeCompare(b.from)||a.code.localeCompare(b.code)).map(c=>[c.from,c.code,c.model||'',+c.cost,c.usd?+c.usd:'',c.rate?+c.rate:'',c.superseded?t('supersededBadge'):'']));
  add(t('clientsList'),[[t('clientOrigin'),0,34],[t('originType'),0,14]],state.clients.map(c=>[c.name,originLabel(c.type)]));
  add(t('problemsList'),[[t('problem'),0,44]],state.problems.slice().sort().map(p=>[p]));
  const ms=[...new Set(O.map(o=>o.date.slice(0,7)))].sort();
  add(t('exMonths'),[[t('periodMonth'),0,14],[t('kpiOcc'),N,12],[t('kpiNg'),N,12],[t('totalCost'),M,14],[t('kNoCost'),N,12],[t('status'),0,14]],ms.map(k=>{const l=O.filter(o=>o.date.slice(0,7)===k);return [k,l.length,sum(l,'qty'),round2(sum(l,'totalCost')),l.filter(o=>!hasCost(o)).length,monthClosed(k+'-01')?t('mClosed'):t('mOpen')]}));
  const rank=(name,head,fn)=>add(name,[[head,0,34],[t('kpiOcc'),N,12],[t('kpiNg'),N,12],[t('totalCost'),M,14]],groupBy(O,fn).sort((a,b)=>b.ng-a.ng).map(g=>[g.key||'—',g.occ,g.ng,round2(g.cost)]));
  rank(t('exByModel'),t('model'),o=>o.model);rank(t('exByClient'),t('clientOrigin'),o=>o.client);rank(t('exByProblem'),t('problem'),o=>o.problem);rank(t('exByResp'),t('costResp'),o=>respLabel(o.costResp));
  add(t('exLib'),[[t('date'),D,12],[t('code'),0,18],[t('model'),0,30],[t('problem'),0,30],[t('createdBy'),0,20],[t('photos')+' ('+t('exFiles')+')',0,40]],libList().slice().sort((a,b)=>a.date.localeCompare(b.date)).map(o=>[o.date,o.code||'',o.model||'',o.problem||'',o.by||'',photoName?(o.photos||[]).map(p=>'fotos/biblioteca/'+o.date+'-'+p.id+'.'+photoExt(p)).join(' | '):'']));
  add(t('authLog'),[[t('date'),0,20],[t('authWho'),0,22],[t('authWhat'),0,28],[t('periodMonth'),0,12],[t('authDetail'),0,50]],state.authLog.map(e=>[new Date(e.at).toLocaleString(LANG),e.user,authLogText(e),e.per||'',[e.note||''].concat((e.changes||[]).map(c=>t(FLD[c.f]||c.f)+': '+diffVal(c.f,c.a)+' → '+diffVal(c.f,c.b))).filter(Boolean).join(' | ')]));
  return T}
function tablesXlsx(T){const names=new Set(),clean=n=>{let b=String(n).replace(/[:\\\/?*\[\]]/g,' ').slice(0,28).trim(),x=b,i=2;while(names.has(x.toLowerCase()))x=b+' '+i++;names.add(x.toLowerCase());return x};
  const O=state.occurrences,a=[[{v:t('appName'),s:4}],[state.settings.company||''],[t('exGenerated')+': '+new Date().toLocaleString(LANG)],[],[{v:t('kpiOcc'),s:1},{v:t('kpiNg'),s:1},{v:t('totalCost'),s:1},{v:t('kNoCost'),s:1}],[O.length,sum(O,'qty'),{v:round2(sum(O,'totalCost')),s:3},O.filter(o=>!hasCost(o)).length]];
  return xlsxBlob([{name:clean(t('exSummary')),widths:[18,14,16,14],rows:a}].concat(T.map(x=>({name:clean(x.name),widths:x.cols.map(c=>c[2]),freeze:1,rows:[x.cols.map(c=>({v:c[0],s:1}))].concat(x.rows.map(r=>r.map((v,i)=>{const k=x.cols[i][1];return v===''?'':k==='d'?{v,d:1,s:2}:k==='m'?{v:+v,s:3}:k==='n'?+v:v})))}))))}
const fileSafe=n=>String(n).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase();
const csvOf=x=>{const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return '﻿'+[x.cols.map(c=>q(c[0])).join(';')].concat(x.rows.map(r=>r.map(v=>typeof v==='number'?String(v).replace('.',','):q(v)).join(';'))).join('\r\n')};
async function photoBytes(p){const b=await (await fetch(p.data)).arrayBuffer();return new Uint8Array(b)}
const photoExt=p=>/^data:image\/svg/.test(p.data||'')?'svg':/\.png$/i.test(p.name||'')?'png':'jpg';
async function exportAs(k){const stamp=todayISO();if(k!=='dash'&&needLoad('')){toast(t('lpLoading'));await ensureFrom('')}
  if(k==='dash'){location.hash='#/dashboard';setTimeout(()=>window.print(),700);return}
  if(k==='pdf'){const keep=ui.hist;ui.hist={q:'',from:'',to:'',origin:'all',client:'',problem:'',resp:'',page:1,year:0,ym:'',wk:0};try{historyReport(state.occurrences.slice())}finally{ui.hist=keep}return}
  toast(t('dataBkWait'));try{
    if(k==='xlsx'){download(tablesXlsx(exportTables()),'segregados-'+stamp+'.xlsx');return}
    if(k==='csv'){const T=exportTables();download(new Blob([zipStore(T.map(x=>[fileSafe(x.name)+'.csv',csvOf(x)]))],{type:'application/zip'}),'segregados-csv-'+stamp+'.zip');return}
    const nm=(o,p)=>'fotos/'+o.seq+'-'+p.kind+'-'+p.id+'.'+photoExt(p),T=exportTables(nm),files=[['segregados.xlsx',new Uint8Array(await tablesXlsx(T).arrayBuffer())]];
    T.forEach(x=>files.push(['csv/'+fileSafe(x.name)+'.csv',csvOf(x)]));
    const s=ONLINE?await cloudBackupState():state;files.push(['backup/segregados-backup.json',JSON.stringify({app:'segregados-prototipo',exportedAt:new Date().toISOString(),state:s},null,1)]);
    let fail=0;for(const o of state.occurrences)for(const p of o.photos||[]){try{files.push([nm(o,p),await photoBytes(p)])}catch(e){fail++}}
    for(const o of libList())for(const p of o.photos||[]){try{files.push(['fotos/biblioteca/'+o.date+'-'+p.id+'.'+photoExt(p),await photoBytes(p)])}catch(e){fail++}}
    files.push(['LEIA-ME.txt',t('exReadme')]);download(new Blob([zipStore(files)],{type:'application/zip'}),'segregados-completo-'+stamp+'.zip');if(fail)toast(t('exPhotoFail',{n:fail}),true)
  }catch(e){console.warn(e);toast(t('importErr'),true)}}
async function exportBackup(){const btn=$('#bExp');if(btn)btn.disabled=true;toast(t('dataBkWait'));try{await ensureFrom('')}catch(e){toast(t('cloudLoadErr'),true);if(btn)btn.disabled=false;return}
  try{const s=ONLINE?await cloudBackupState():state;download(new Blob([JSON.stringify({app:'segregados-prototipo',exportedAt:new Date().toISOString(),state:s},null,1)],{type:'application/json'}),'segregados-backup-'+todayISO()+'.json');
    if(!ONLINE||isAdmin()){state.settings.ultimoBackup={em:new Date().toISOString(),por:currentUser.name};await persist()}if(btn)btn.disabled=false;renderShell()}catch(e){console.warn(e);toast(t('importErr'),true);if(btn)btn.disabled=false}}
async function importBackup(e){const file=e.target.files[0];if(!file)return;try{await ensureFrom('');const j=JSON.parse(await file.text());const s=j.state||j;
    if(!s||!Array.isArray(s.occurrences)||!Array.isArray(s.products)||!Array.isArray(s.users)||!s.users.length)throw 0;
    if(!await askYes(t('importConfirm')))return;
    state=Object.assign(emptyState(true),s,{settings:Object.assign({company:'',currency:'BRL'},s.settings)});
    ['clients','problems','destinations'].forEach(k=>{if(!Array.isArray(state[k]))state[k]=[]});
    state.occurrences.forEach(o=>{if(!Array.isArray(o.photos))o.photos=[]});state=migrate(state);
    if(!ONLINE)currentUser=state.users.find(u=>u.id===currentUser.id)||state.users.find(u=>u.role==='admin')||state.users[0];
    await persist();ui.usage=null;toast(t('importOk'));renderShell()}catch(err){toast(t('importErr'),true)}e.target.value=''}
function backupReminder(){if(!isAdmin())return;const b=state.settings.ultimoBackup,d=b&&b.em?Math.floor((Date.now()-new Date(b.em).getTime())/864e5):null;if(d===null||d>60)setTimeout(()=>toast(t('dataBkLate')),1500)}
const buildDemoProblems=()=>['Solda fora de posição','Peça invertida','Fora do dimensional','Trinca na solda','Lado LH montado no RH','Amassado / deformação','Furo ausente'];

/* ================= GESTÃO DE CUSTOS =================
   Histórico de custos por código com data de vigência (planilha do RH).
   Cada ocorrência grava o custo aplicado (unitCost, costId, costFrom) e o custo total = qtd NG × custo.
   Uma importação nova não altera ocorrências já gravadas sem autorização explícita, que fica registrada. */
const normCode=c=>String(c??'').trim().toUpperCase();
const isAdmin=()=>!!currentUser&&currentUser.role==='admin';
const hasCost=o=>!!o&&o.unitCost!=null&&o.unitCost!==''&&!isNaN(+o.unitCost);
const monthClosed=d=>{const c=d&&state.closures[String(d).slice(0,7)];return !!(c&&c.status==='closed')};
const moneyOr=v=>v==null||v===''?'—':fmtMoney(v);
const ymLabel=k=>fmtDT(parseISO(k+'-01'),{month:'long',year:'numeric'});
/* custo vigente: o preço do código com a maior vigência anterior ou igual à data */
function costAt(code,date,list){const k=normCode(code);let b=null;if(!k||!date)return null;for(const c of (list||state.costs))if(c.code===k&&!c.superseded&&c.from<=date&&(!b||c.from>b.from))b=c;return b}
function nextFrom(code,from){let n=null;for(const x of state.costs)if(x.code===code&&!x.superseded&&x.from>from&&(!n||x.from<n))n=x.from;return n}
/* ocorrências do código dentro da vigência que começa em "from" */
function inScope(code,from){const end=nextFrom(code,from);return state.occurrences.filter(o=>normCode(o.code)===code&&o.date>=from&&(!end||o.date<end))}
function applyCost(rec,old){const keep=hasCost(old)&&normCode(old.code)===normCode(rec.code)&&old.date===rec.date;
  if(keep){rec.unitCost=+old.unitCost;rec.costId=old.costId??null;rec.costFrom=old.costFrom??null}
  else{const c=costAt(rec.code,rec.date);rec.unitCost=c?c.cost:null;rec.costId=c?c.id:null;rec.costFrom=c?c.from:null}
  rec.totalCost=hasCost(rec)?round2(rec.qty*rec.unitCost):null;return rec}
function applyPrice(c,list){const at=new Date().toISOString();list.forEach(o=>{o.unitCost=c.cost;o.costId=c.id;o.costFrom=c.from;o.totalCost=round2(o.qty*c.cost);o.updatedAt=at})}
function logCost(e){state.costLog.unshift(Object.assign({id:uid(),at:new Date().toISOString(),user:currentUser.name},e))}
function agg(l){const a={n:l.length,ng:0,cost:0,noCost:0,ngNoCost:0};l.forEach(o=>{a.ng+=o.qty;if(hasCost(o))a.cost+=+o.totalCost||0;else{a.noCost++;a.ngNoCost+=o.qty}});a.cost=round2(a.cost);return a}
/* semanas de segunda a domingo; se a semana atravessa dois meses, cada parte fica no seu mês */
function segments(s,e,gran){const out=[],wn={},multi=s.slice(0,7)!==e.slice(0,7);let cur=null;
  for(let d=parseISO(s);toISO(d)<=e;d=addDays(d,1)){const iso=toISO(d),mk=iso.slice(0,7),isNew=gran==='day'||!cur||cur.mk!==mk||(gran==='week'&&(d.getUTCDay()+6)%7===0);
    if(isNew){cur={s:iso,e:iso,mk};if(gran==='week'){wn[mk]=(wn[mk]||0)+1;cur.n=wn[mk]}out.push(cur)}cur.e=iso}
  out.forEach(x=>x.label=gran==='day'?fmtDate(x.s):gran==='month'?ymLabel(x.mk):t('weekN',{n:x.n})+(multi?' · '+fmtDT(parseISO(x.mk+'-01'),{month:'short',year:'2-digit'}):''));return out}
const pctTxt=(a,b)=>{if(b==null)return '';if(!b)return a?` <small>(${esc(t('before'))}: 0)</small>`:'';const p=(a-b)/b*100;return ` <small style="color:${p>0?'var(--danger)':'var(--ok)'}">${p>0?'▲ +':'▼ '}${fmtNum(round2(p))}%</small>`};
function csvDownload(name,rows){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';download(new Blob(['﻿'+rows.map(r=>r.map(q).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),name)}
const dec2=v=>v==null||v===''?'':String(v).replace('.',',');

/* ---------- leitor .xlsx/.csv offline ---------- */
async function readSheets(buf){const b=new Uint8Array(buf);
  if(!(b[0]===0x50&&b[1]===0x4b)){const txt=new TextDecoder().decode(b).replace(/^﻿/,''),first=txt.split(/\r?\n/)[0]||'',sep=[';',',','\t'].sort((x,y)=>first.split(y).length-first.split(x).length)[0];
    return [{name:'CSV',rows:txt.split(/\r?\n/).map(l=>{const r=[];let cur='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"')q=true;else if(ch===sep){r.push(cur);cur=''}else cur+=ch}r.push(cur);return r.map(x=>x===''?null:x)})}]}
  const u16=o=>b[o]|b[o+1]<<8,u32=o=>(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0,dec=new TextDecoder(),files={};let e=-1;
  for(let i=b.length-22;i>=Math.max(0,b.length-70000);i--)if(u32(i)===0x06054b50){e=i;break}
  if(e<0)throw new Error('xlsx');
  for(let k=0,p=u32(e+16),n=u16(e+10);k<n&&u32(p)===0x02014b50;k++){const nl=u16(p+28),lo=u32(p+42),ds=lo+30+u16(lo+26)+u16(lo+28);files[dec.decode(b.subarray(p+46,p+46+nl))]={m:u16(p+10),d:b.subarray(ds,ds+u32(p+20))};p+=46+nl+u16(p+30)+u16(p+32)}
  const get=async nm=>{const f=files[nm];if(!f)return null;return dec.decode(f.m===0?f.d:new Uint8Array(await new Response(new Blob([f.d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()))};
  const X=s=>new DOMParser().parseFromString(s,'text/xml'),T=(n,tg)=>Array.from(n.getElementsByTagNameNS('*',tg));
  const ss=[],sx=await get('xl/sharedStrings.xml');if(sx)T(X(sx),'si').forEach(si=>{let s='';T(si,'t').forEach(x=>{const pn=x.parentNode.localName;if(pn==='si'||pn==='r')s+=x.textContent});ss.push(s)});
  const codes={},xfs=[],st=await get('xl/styles.xml');if(st){const sd=X(st);T(sd,'numFmt').forEach(n=>codes[+n.getAttribute('numFmtId')]=n.getAttribute('formatCode'));const cx=T(sd,'cellXfs')[0];if(cx)Array.from(cx.childNodes).forEach(x=>{if(x.localName==='xf')xfs.push(+x.getAttribute('numFmtId')||0)})}
  const isDate=id=>(id>=14&&id<=22)||(id>=45&&id<=47)||(!!codes[id]&&!/^general$/i.test(codes[id])&&/[dmy]/i.test(codes[id].replace(/"[^"]*"|\[[^\]]*\]|\\./g,'')));
  const rels={};T(X(await get('xl/_rels/workbook.xml.rels')),'Relationship').forEach(r=>{const tg=r.getAttribute('Target');rels[r.getAttribute('Id')]=tg[0]==='/'?tg.slice(1):'xl/'+tg});
  const out=[];
  for(const s of T(X(await get('xl/workbook.xml')),'sheet')){const rid=s.getAttribute('r:id')||s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'),sh=await get(rels[rid]);if(!sh)continue;const rows=[];
    T(X(sh),'row').forEach((r,ri)=>{const rn=r.getAttribute('r')?+r.getAttribute('r')-1:ri,arr=rows[rn]=[];
      T(r,'c').forEach((c,ci)=>{const ref=c.getAttribute('r');let col=ci;if(ref){col=0;for(const ch of /^[A-Z]+/.exec(ref)[0])col=col*26+ch.charCodeAt(0)-64;col--}
        const ty=c.getAttribute('t'),vn=T(c,'v')[0];let v=null;
        if(ty==='inlineStr')v=T(c,'t').map(x=>x.textContent).join('');
        else if(vn){const raw=vn.textContent;if(ty==='s')v=ss[+raw];else if(ty==='str')v=raw;else if(ty==='b')v=raw==='1';else if(ty!=='e'){v=parseFloat(raw);if(isNaN(v))v=null;else if(isDate(xfs[+c.getAttribute('s')||0]))v=toISO(new Date(Math.round((v-25569)*864e5)))}}
        arr[col]=v})});
    for(let i=0;i<rows.length;i++)if(!rows[i])rows[i]=[];out.push({name:s.getAttribute('name'),rows})}
  return out}
async function fileHash(buf){try{if(crypto&&crypto.subtle){const h=await crypto.subtle.digest('SHA-256',buf);return Array.from(new Uint8Array(h),x=>x.toString(16).padStart(2,'0')).join('')}}catch(e){}
  let h=0x811c9dc5;const b=new Uint8Array(buf);for(let i=0;i<b.length;i++){h^=b[i];h=Math.imul(h,16777619)>>>0}return 'fnv-'+h.toString(16)+'-'+b.length}
const plain=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
function parseAnyDate(v){if(v==null||v==='')return null;const s=String(v).trim();let m;if((m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s)))return m[1]+'-'+m[2]+'-'+m[3];if((m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)))return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');return null}
function parseCost(v){if(typeof v==='number')return isFinite(v)?v:NaN;let s=String(v??'').replace(/R\$|US\$|\$|\s/g,'');if(!s)return NaN;if(/,\d{1,4}$/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'');return /^-?\d+(\.\d+)?$/.test(s)?parseFloat(s):NaN}
function detectSheet(name,rows){const a={name,ok:false,lines:[],title:'',vigFile:'',cols:''};
  for(let i=0;i<Math.min(rows.length,20);i++){const hs=Array.from(rows[i]||[],x=>plain(x)),c=hs.findIndex(x=>/^(codigo|cod\.?|code)$/.test(x));let v=-1,m=-1,vg=-1;
    ['custo unitario','valor unitario','preco unitario','unit cost','custo','valor','preco','cost','value'].some(k=>(v=hs.findIndex(x=>x===k||x.startsWith(k+' ')))>=0);
    if(c<0||v<0)continue;
    hs.some((x,j)=>/^(modelo|descricao|discricao|model)/.test(x)&&(m=j,true));hs.some((x,j)=>/vigencia|effective/.test(x)&&(vg=j,true));
    for(let k=0;k<i;k++){const tv=(rows[k]||[]).find(x=>x!=null&&String(x).trim()!=='');if(tv!=null){a.title=String(tv).trim();break}}
    a.ok=true;const dc=hs.findIndex(x=>/cotacao|dolar|dollar/.test(x));a.cols=[c,m,v,vg,dc].filter(j=>j>=0).map(j=>String(rows[i][j]).trim()).join(', ');const vigs={},dols={};
    for(let k=i+1;k<rows.length;k++){const r=rows[k]||[];if(r.every(x=>x==null||String(x).trim()===''))continue;const vd=vg>=0?parseAnyDate(r[vg]):null;if(vd)vigs[vd]=1;if(dc>=0){const dv=parseCost(r[dc]);if(dv>0)dols[dv]=1}a.lines.push({line:k+1,code:r[c],model:m>=0?r[m]:'',value:r[v]})}
    const dk=Object.keys(dols);if(dk.length===1)a.dollarFile=+dk[0];const vk=Object.keys(vigs).sort();if(vk.length===1)a.vigFile=vk[0];else if(vk.length>1)a.vigMulti=vk;break}
  return a}

/* ---------- página ---------- */
function renderCosts(){
  const tabs=[['imp','cImport'],['hist','cHistory'],['close','cClosing'],['rep','cReports']];ui.ctab=ui.ctab||'imp';
  let h=`<div class="toolbar no-print"><div class="seg">${tabs.map(([k,l])=>`<button data-ctab="${k}" class="${ui.ctab===k?'on':''}">${esc(t(l))}</button>`).join('')}</div></div>`;
  if(!isAdmin())h+=`<div class="note" style="margin-bottom:12px">${esc(t('cReadOnly'))}</div>`;
  h+=ui.ctab==='hist'?costHistory():ui.ctab==='close'?costClosing():ui.ctab==='rep'?costReports():costImport();
  $('#view').innerHTML=h;
  $$('[data-cmon]').forEach(b=>b.onclick=()=>{ui.cf.cm=b.dataset.cmon;renderCosts()});
  $$('[data-ctab]').forEach(b=>b.onclick=()=>{ui.ctab=b.dataset.ctab;renderCosts()});
  $$('[data-c]').forEach(el=>el.addEventListener(el.type==='text'||el.type==='search'?'input':'change',()=>costChange(el)));
  $$('[data-cact]').forEach(b=>b.onclick=()=>costAct(b.dataset.cact,b.dataset.arg));
}
function costChange(el){const k=el.dataset.c,ci=ui.ci;
  if(k==='sheet'){ci.sheet=+el.value;ci.choice={};const s=ci.sheets[ci.sheet];ci.vig=s&&s.vigFile||'';ci.dollar=s&&s.dollarFile||'';renderCosts()}
  else if(k==='vig'){ci.vig=el.value;renderCosts()}
  else if(k==='dollar')ci.dollar=el.value;
  else if(k==='choice'){ci.choice[el.dataset.code]=el.value;renderCosts()}
  else if(k==='fill')ci.fill=el.checked;
  else if(k==='newProducts')ci.newProducts=el.checked;
  else if(k==='recalc'){ci.recalc=el.checked;renderCosts()}
  else if(k==='reason')ci.reason=el.value;
  else if(k==='reqScale'){state.settings.requireScalePhoto=el.checked;persist().then(()=>toast(t('savedOk')))}
  else if(k==='hq'){clearTimeout(ui.hqT);ui.hqT=setTimeout(()=>{ui.hq=el.value;renderCosts();const i=$('[data-c="hq"]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},300)}
  else if(k==='cy'||k==='cm'){ui.cf[k]=el.value;renderCosts()}
  else if(k==='rcode'||k==='rmodel'){clearTimeout(ui.rT);ui.rT=setTimeout(()=>{ui.cr[k]=el.value;renderCosts();const i=$(`[data-c="${k}"]`);if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},300)}
  else if(k.charAt(0)==='r'){ui.cr[k]=el.value;renderCosts()}}

/* ---------- importação ---------- */
function analyseImport(ci){const sh=ci.sheets[ci.sheet],inval=[],by={};let spaces=0;
  sh.lines.forEach(l=>{const raw=l.code==null?'':String(l.code),code=normCode(raw),val=parseCost(l.value);let model=String(l.model??'').trim();if(/^#/.test(model))model='';
    if(!code)return inval.push({line:l.line,code:'',why:t('ivNoCode')});
    if(raw!==raw.trim())spaces++;
    if(isNaN(val))return inval.push({line:l.line,code,why:t('ivBadValue')+' ('+(l.value==null||l.value===''?'—':String(l.value))+')'});
    if(val<=0)return inval.push({line:l.line,code,why:t('ivZero')});
    const o=by[code]||(by[code]={lines:[],vals:{},models:{}});o.lines.push(l.line);o.vals[val]=(o.vals[val]||0)+1;if(model)o.models[model]=1});
  const known=new Set(state.products.map(p=>normCode(p.code)).concat(state.costs.map(c=>c.code),state.occurrences.map(o=>normCode(o.code))));
  const items=Object.keys(by).sort().map(code=>{const o=by[code],vals=Object.keys(o.vals).map(Number).sort((a,b)=>a-b),models=Object.keys(o.models),ex=state.costs.find(c=>c.code===code&&c.from===ci.vig)||null,cur=costAt(code,ci.vig),nx=nextFrom(code,ci.vig);
    const it={code,lines:o.lines,vals,cnt:o.vals,model:models[0]||'',ex,cur,known:known.has(code),warn:[]};
    it.value=vals.length===1?vals[0]:(ci.choice[code]?+ci.choice[code]:null);
    it.action=it.value==null?'conflict':ex?(ex.cost===it.value?'same':'update'):'insert';
    if(vals.length>1)it.warn.push(t('wDupValues',{n:o.lines.length}));else if(o.lines.length>1)it.warn.push(t('wDupSame',{n:o.lines.length}));
    if(models.length>1)it.warn.push(t('wModels')+': '+models.join(' / '));
    const prod=state.products.find(p=>normCode(p.code)===code),cad=prod?prod.model:(cur?cur.model:'');if(cad&&it.model&&plain(cad)!==plain(it.model))it.warn.push(t('wModelDiff',{m:cad}));
    if(!it.known)it.warn.push(t('wUnknown'));
    if(nx)it.warn.push(t('wNext',{d:fmtDate(nx)}));
    if(it.value!=null){const sc=inScope(code,ci.vig);it.empty=sc.filter(x=>!hasCost(x)&&!occLocked(x.date));it.change=sc.filter(x=>hasCost(x)&&!x.costManual&&!occLocked(x.date)&&(!ex||x.costId!==ex.id||+x.unitCost!==it.value)&&+x.unitCost!==it.value);it.closed=sc.filter(x=>occLocked(x.date))}
    return it});
  const dupSame=state.costImports.filter(i=>i.hash===ci.hash&&i.sheet===sh.name&&i.from===ci.vig),dupOther=state.costImports.filter(i=>i.hash===ci.hash&&i.sheet===sh.name&&i.from!==ci.vig);
  return {items,inval,spaces,dupSame,dupOther,total:sh.lines.length}}
function costImport(){const ci=ui.ci;let h='';
  if(isAdmin()){
    h+=`<div class="card" style="margin-bottom:16px"><h3>1. ${esc(t('impStep1'))}</h3><p class="note">${esc(t('impHelp'))}</p><div class="toolbar" style="margin:10px 0 0"><label class="btn btn-primary"><input type="file" id="costFile" accept=".xlsx,.csv" hidden>📂 ${esc(t('impPick'))}</label><button class="btn" data-cact="tpl">⬇ ${esc(t('tplBtn'))}</button>${ci?`<span class="note">${esc(t('impFile'))}: <b>${esc(ci.name)}</b> · ${fmtNum(ci.sheets.length)} ${esc(t('impSheets'))}</span><button class="btn btn-sm" data-cact="impCancel">${esc(t('cancel'))}</button>`:''}</div></div>`;
    if(ci)h+=importStep2(ci);
  }else h+=`<div class="card" style="margin-bottom:16px"><h3>${esc(t('cImport'))}</h3><p class="note">${esc(t('adminOnlyCosts'))}</p></div>`;
  if(0)h+=`<div class="card" style="margin-bottom:16px"><h3>${esc(t('ruleScale'))}</h3>${isAdmin()?`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-c="reqScale" ${state.settings.requireScalePhoto?'checked':''}> ${esc(t('ruleScaleTxt'))}</label>`:`<p class="note">${esc(t(state.settings.requireScalePhoto?'ruleScaleOn':'ruleScaleOff'))}</p>`}<p class="hint">${esc(t('ruleScaleNote'))}</p></div>`;
  const l=state.costImports;
  h+=`<div class="card"><h3>${esc(t('impDone'))}</h3>${l.length?`<div class="table-wrap"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('username'))}</th><th>${esc(t('impFile'))}</th><th>${esc(t('impSheet'))}</th><th>${esc(t('vigFrom'))}</th><th class="num">${esc(t('dollarShort'))}</th><th class="num">${esc(t('kInsert'))}</th><th class="num">${esc(t('kUpdate'))}</th><th class="num">${esc(t('kSame'))}</th><th class="num">${esc(t('kIgnored'))}</th><th class="num">${esc(t('kFilled'))}</th><th class="num">${esc(t('kRecalc'))}</th></tr></thead><tbody>${l.slice(0,300).map(i=>`<tr><td>${esc(new Date(i.at).toLocaleString(LANG))}${demoBadge(i)}</td><td>${esc(i.user)}</td><td class="clip">${esc(i.file)}</td><td class="clip">${esc(i.sheet)}</td><td>${i.from?fmtDate(i.from):'—'}</td><td class="num">${i.dollar?fmtMoney(i.dollar):'—'}</td><td class="num">${fmtNum(i.inserted)}</td><td class="num">${fmtNum(i.updated)}</td><td class="num">${fmtNum(i.same)}</td><td class="num">${fmtNum(i.ignored)}</td><td class="num">${fmtNum(i.filled)}</td><td class="num">${fmtNum(i.recalc)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${esc(t('noRecords'))}</div>`}</div>`;
  setTimeout(()=>{const f=$('#costFile');if(f)f.onchange=()=>{const file=f.files[0];if(file)loadCostFile(file)}},0);
  return h}
async function loadCostFile(file,ym){try{const buf=await file.arrayBuffer(),[hash,sheets]=await Promise.all([fileHash(buf),readSheets(buf)]),s=sheets.map(x=>detectSheet(x.name,x.rows)),first=Math.max(0,s.findIndex(x=>x.ok));
  ui.ci={name:file.name,hash,sheets:s,sheet:first,vig:ym?(s[first]&&s[first].vigFile&&s[first].vigFile.slice(0,7)===ym?s[first].vigFile:ym+'-01'):(s[first]&&s[first].vigFile||''),choice:{},fill:true,recalc:false,reason:'',newProducts:true,dollar:s[first]&&s[first].dollarFile||''};location.hash='#/costs';ui.ctab='imp';renderShell()}catch(e){toast(t('impReadErr'),true)}}
function importStep2(ci){const sh=ci.sheets[ci.sheet];
  let h=`<div class="card" style="margin-bottom:16px"><h3>2. ${esc(t('impStep2'))}</h3><div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="field"><label>${esc(t('impSheet'))}</label><select data-c="sheet">${ci.sheets.map((s,i)=>`<option value="${i}" ${i===ci.sheet?'selected':''}>${esc(s.name)}${s.ok?` (${fmtNum(s.lines.length)})`:' — '+esc(t('impNoCols'))}</option>`).join('')}</select></div><div class="field"><label>${esc(t('vigRH'))} <span class="req">*</span></label><input type="date" data-c="vig" value="${esc(ci.vig)}"></div><div class="field"><label>${esc(t('dollarRate'))}</label><input type="number" step="0.0001" min="0" data-c="dollar" value="${esc(ci.dollar)}" placeholder="5,40"><div class="hint">${esc(t('dollarHint'))}</div></div></div>`;
  if(!sh||!sh.ok)return h+`<div class="banner" style="margin-top:10px">${esc(t('impNoCols'))}</div></div>`;
  h+=`<p class="note" style="margin-top:8px">${esc(t('impCols'))}: ${esc(sh.cols)}${sh.title?' · '+esc(t('impTitle'))+': <b>'+esc(sh.title)+'</b>':''}. ${esc(t(sh.vigFile?'impVigFile':'impVigAsk',{d:sh.vigFile?fmtDate(sh.vigFile):''}))}</p>`;
  if(sh.vigMulti)return h+`<div class="banner">${esc(t('impVigMulti'))}: ${sh.vigMulti.map(fmtDate).join(', ')}</div></div>`;
  if(!ci.vig)return h+'</div>';
  if(lazy(ci.vig,renderCosts))return h+lpBox()+'</div>';
  const an=analyseImport(ci),c={insert:0,update:0,same:0,conflict:0,unk:0,empty:0,change:0,closed:0};
  an.items.forEach(it=>{c[it.action]++;if(!it.known)c.unk++;if(it.value!=null){c.empty+=it.empty.length;c.change+=it.change.length;c.closed+=it.closed.length}});
  const valid=c.insert+c.update+c.same,retroDate=ci.vig<toISO(addDays(parseISO(todayISO()),-((parseISO(todayISO()).getUTCDay()+6)%7)));ci.an=an;
  const k=(l,v,cls)=>`<div class="card kpi vivid ${kc(l)}"><div class="lbl">${esc(t(l))}</div><div class="val">${fmtNum(v)}</div></div>`;
  const AC={insert:`<span class="badge green">${esc(t('aInsert'))}</span>`,update:`<span class="badge">${esc(t('aUpdate'))}</span>`,same:`<span class="badge gray">${esc(t('aSame'))}</span>`,conflict:`<span class="badge" style="background:#f8d3cf;color:#7a1b12">${esc(t('aConflict'))}</span>`};
  h+=`</div><div class="card" style="margin-bottom:16px"><h3>3. ${esc(t('impStep3'))}</h3><div class="grid g4" style="margin-bottom:12px">${k('kLines',an.total)}${k('kCodes',an.items.length,'k2')}${k('kInsert',c.insert,'k3')}${k('kUpdate',c.update,'k4')}${k('kSame',c.same)}${k('kConflict',c.conflict,'k2')}${k('kInvalid',an.inval.length,'k4')}${k('kUnknown',c.unk,'k3')}</div>`;
  if(an.dupSame.length)h+=`<div class="banner" style="margin-bottom:8px"><b>${esc(t('impDup'))}</b> ${esc(t('impDupTxt',{d:new Date(an.dupSame[0].at).toLocaleString(LANG),u:an.dupSame[0].user}))}</div>`;
  if(an.dupOther.length)h+=`<div class="banner" style="margin-bottom:8px">${esc(t('impDupOther'))}: ${an.dupOther.map(i=>fmtDate(i.from)).join(', ')}</div>`;
  if(retroDate)h+=`<div class="banner" style="margin-bottom:8px"><b>${esc(t('impRetro'))}</b> ${esc(t('impRetroTxt',{d:fmtDate(ci.vig)}))}</div>`;
  if(an.spaces)h+=`<p class="note">${esc(t('impSpaces',{n:an.spaces}))}</p>`;
  h+=`<div class="table-wrap"><table><thead><tr><th>${esc(t('code'))}</th><th>${esc(t('model'))}</th><th class="num">${esc(t('kLines'))}</th><th>${esc(t('impValue'))}</th><th>${esc(t('impCurrent',{d:fmtDate(ci.vig)}))}</th><th>${esc(t('actions'))}</th><th>${esc(t('impAlerts'))}</th></tr></thead><tbody>${an.items.map(it=>`<tr><td><b>${esc(it.code)}</b></td><td class="clip" title="${esc(it.model)}">${esc(it.model)}</td><td class="num">${fmtNum(it.lines.length)}</td><td>${it.vals.length===1?fmtMoney(it.vals[0]):`<select data-c="choice" data-code="${esc(it.code)}"><option value="">${esc(t('impSkip'))}</option>${it.vals.map(v=>`<option value="${v}" ${it.value===v?'selected':''}>${fmtMoney(v)} (${fmtNum(it.cnt[v])})</option>`).join('')}</select>`}</td><td>${it.ex?fmtMoney(it.ex.cost)+' <small>('+esc(t('impSameVig'))+')</small>':it.cur?fmtMoney(it.cur.cost)+' <small>'+esc(t('since'))+' '+fmtDate(it.cur.from)+'</small>':'<small>'+esc(t('noCost'))+'</small>'}</td><td>${AC[it.action]}</td><td style="white-space:normal;min-width:220px">${it.warn.length?esc(it.warn.join(' · ')):'—'}</td></tr>`).join('')}</tbody></table></div>`;
  if(an.inval.length)h+=`<h3 style="margin-top:14px">${esc(t('impInvalid'))}</h3><div class="table-wrap" style="max-height:220px"><table><thead><tr><th class="num">${esc(t('impLine'))}</th><th>${esc(t('code'))}</th><th>${esc(t('impWhy'))}</th></tr></thead><tbody>${an.inval.slice(0,300).map(x=>`<tr><td class="num">${x.line}</td><td>${esc(x.code)}</td><td>${esc(x.why)}</td></tr>`).join('')}</tbody></table></div>`;
  const chg=an.items.filter(it=>it.value!=null).flatMap(it=>it.change.map(o=>({o,v:it.value})));
  h+=`</div><div class="card" style="margin-bottom:16px"><h3>4. ${esc(t('impStep4'))}</h3><label style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="checkbox" data-c="fill" ${ci.fill?'checked':''}> ${esc(t('impFill',{n:c.empty}))}</label><label style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="checkbox" data-c="newProducts" ${ci.newProducts?'checked':''}> ${esc(t('impNewProducts',{n:an.items.filter(it=>it.value!=null&&!state.products.some(p=>normCode(p.code)===it.code)).length}))}</label><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-c="recalc" ${ci.recalc?'checked':''} ${c.change?'':'disabled'}> ${esc(t('impRecalc',{n:c.change}))}</label>`;
  if(ci.recalc&&chg.length)h+=`<div class="field" style="margin-top:10px"><label>${esc(t('reasonRetro'))} <span class="req">*</span></label><input type="text" data-c="reason" maxlength="300" value="${esc(ci.reason)}"></div><h3 style="margin-top:12px">${esc(t('affected'))}</h3>${affTable(chg)}`;
  h+=`<p class="note" style="margin-top:8px">${esc(t('impKeep'))}${c.closed?' '+esc(t('impClosed',{n:c.closed})):''}</p>${c.conflict?`<div class="banner">${esc(t('impConflicts',{n:c.conflict}))}</div>`:''}<div class="form-actions" style="margin-top:12px"><button class="btn btn-primary" data-cact="impConfirm" ${an.dupSame.length||!valid?'disabled':''}>${esc(t('impConfirm',{n:valid}))}</button></div></div>`;
  return h}
function affTable(rows){return `<div class="table-wrap" style="max-height:260px"><table><thead><tr><th>${esc(t('idNo'))}</th><th>${esc(t('date'))}</th><th>${esc(t('code'))}</th><th class="num">${esc(t('qtyNg'))}</th><th class="num">${esc(t('oldCost'))}</th><th class="num">${esc(t('newCost'))}</th><th class="num">${esc(t('oldTotal'))}</th><th class="num">${esc(t('newTotal'))}</th></tr></thead><tbody>${rows.slice(0,300).map(({o,v})=>`<tr><td>${esc(o.seq)}</td><td>${fmtDate(o.date)}</td><td>${esc(o.code)}</td><td class="num">${fmtNum(o.qty)}</td><td class="num">${moneyOr(o.unitCost)}</td><td class="num">${fmtMoney(v)}</td><td class="num">${moneyOr(o.totalCost)}</td><td class="num">${fmtMoney(round2(o.qty*v))}</td></tr>`).join('')}</tbody></table></div>${rows.length>300?`<p class="note">${esc(t('showingN',{n:300,m:rows.length}))}</p>`:''}`}
async function confirmImport(){if(ui.ci&&ui.ci.vig&&needLoad(ui.ci.vig)){await ensureFrom(ui.ci.vig);ui.ci.an=analyseImport(ui.ci)}const ci=ui.ci,an=ci&&ci.an,sh=ci&&ci.sheets[ci.sheet];if(!an||!isAdmin())return;
  const items=an.items.filter(it=>it.value!=null),ignored=an.inval.length+an.items.length-items.length;
  if(!items.length){toast(t('impNone'),true);return}
  if(an.dupSame.length){toast(t('impDup'),true);return}
  if(ci.recalc&&!ci.reason.trim()){toast(t('reasonReq'),true);return}
  if(!await askYes(t('impAsk',{n:items.length,d:fmtDate(ci.vig)})+(ci.recalc?'\n\n'+t('impAskRetro'):'')))return;
  const at=new Date().toISOString(),imp={id:uid(),at,user:currentUser.name,file:ci.name,sheet:sh.name,hash:ci.hash,from:ci.vig,rows:an.total,dollar:+String(ci.dollar).replace(',','.')>0?Math.round(+String(ci.dollar).replace(',','.')*10000)/10000:null,inserted:0,updated:0,same:0,ignored,filled:0,recalc:0,invalid:an.inval.slice(0,300),choices:Object.assign({},ci.choice),demo:false};
  if(ci.newProducts)an.items.forEach(it=>{if(!state.products.some(p=>normCode(p.code)===it.code)){state.products.push({id:uid(),code:it.code,model:it.model||it.code,weight:null,active:true,demo:false});imp.newProducts=(imp.newProducts||0)+1}});
  items.forEach(it=>{let c=it.ex;
    if(!c){c={id:uid(),code:it.code,model:it.model,cost:it.value,from:ci.vig,importId:imp.id,at,demo:false};state.costs.push(c);imp.inserted++}
    else if(c.cost!==it.value){logCost({type:'correction',code:it.code,from:ci.vig,old:c.cost,new:it.value,count:0,reason:ci.reason||t('reasonSameVig'),importId:imp.id});c.prev=(c.prev||[]).concat([{cost:c.cost,at:c.at,importId:c.importId}]);c.cost=it.value;c.importId=imp.id;c.at=at;if(it.model)c.model=it.model;imp.updated++}
    else imp.same++;
    const sc=inScope(it.code,ci.vig).filter(o=>!occLocked(o.date));
    if(ci.fill){const l=sc.filter(o=>!hasCost(o));applyPrice(c,l);if(l.length){imp.filled+=l.length;logCost({type:'fill',code:it.code,from:ci.vig,new:c.cost,count:l.length,reason:t('reasonFill'),importId:imp.id})}}
    if(ci.recalc){const l=sc.filter(o=>hasCost(o)&&!o.costManual&&+o.unitCost!==c.cost),before=l.map(o=>({id:o.id,seq:o.seq,old:o.unitCost,oldTotal:o.totalCost}));applyPrice(c,l);if(l.length){imp.recalc+=l.length;logCost({type:'recalc',code:it.code,from:ci.vig,new:c.cost,count:l.length,reason:ci.reason,importId:imp.id,items:before})}}});
  state.costImports.unshift(imp);await persist();ui.ci=null;renderCosts();
  openModal(`<div class="modal-head"><h2>${esc(t('impOk'))}</h2><button class="btn btn-sm btn-ghost" data-close>✕</button></div><div class="modal-body"><div class="grid g4">${[['kInsert',imp.inserted],['kUpdate',imp.updated],['kSame',imp.same],['kIgnored',imp.ignored],['kFilled',imp.filled],['kRecalc',imp.recalc]].map(([l,v])=>`<div class="card kpi vivid ${kc(l)}"><div class="lbl">${esc(t(l))}</div><div class="val">${fmtNum(v)}</div></div>`).join('')}</div><p class="note" style="margin-top:12px">${esc(t('impOkTxt',{f:imp.file,s:imp.sheet,d:fmtDate(imp.from),u:imp.user,w:new Date(at).toLocaleString(LANG)}))}</p></div><div class="modal-foot"><button class="btn btn-primary" data-close>${esc(t('close'))}</button></div>`)}

/* ---------- histórico de preços ---------- */
function costHistory(){const q=plain(ui.hq||''),by={},today=todayISO(),imps={};state.costs.forEach(c=>(by[c.code]=by[c.code]||[]).push(c));state.costImports.forEach(i=>imps[i.id]=i);
  const codes=Object.keys(by).sort().filter(k=>!q||plain(k+' '+by[k].map(c=>c.model).join(' ')).includes(q)),alerts=[];
  Object.keys(by).forEach(k=>{const ms=new Set(by[k].map(c=>plain(c.model)).filter(Boolean));if(ms.size>1)alerts.push(t('hModels',{c:k}));const fut=by[k].filter(c=>c.from>today);if(fut.length)alerts.push(t('hFuture',{c:k,d:fut.map(c=>fmtDate(c.from)).join(', ')}))});
  const miss=[...new Set(state.occurrences.filter(o=>!hasCost(o)).map(o=>normCode(o.code)))].sort();if(miss.length)alerts.push(t('hMissing')+': '+miss.join(', '));
  let h=`<div class="card" style="margin-bottom:16px"><div class="toolbar" style="margin:0"><input type="search" data-c="hq" placeholder="${esc(t('code'))} / ${esc(t('model'))}" value="${esc(ui.hq||'')}" style="flex:1 1 240px"><span class="note">${esc(t('hCount',{c:Object.keys(by).length,p:state.costs.length}))}</span></div>${alerts.length?`<div class="banner" style="margin-top:10px;display:block">${alerts.map(esc).join('<br>')}</div>`:`<p class="note" style="margin-top:8px">${esc(t('hNoConflict'))}</p>`}</div>`;
  if(!codes.length)h+=`<div class="card empty">${esc(t(state.costs.length?'noRecords':'hEmpty'))}</div>`;
  const show=codes.slice(0,ui.hall?9999:30);
  show.forEach(k=>{const l=by[k].slice().sort((a,b)=>a.from<b.from?-1:1);
    h+=`<div class="card" style="margin-bottom:12px"><h3>${esc(k)} · ${esc(l[l.length-1].model||'')}${demoBadge(l[0])}</h3><div class="table-wrap"><table><thead><tr><th>${esc(t('vigFrom'))}</th><th>${esc(t('vigTo'))}</th><th class="num">${esc(t('unitCost'))}</th><th class="num">${esc(t('hVar'))}</th><th>${esc(t('hOrigin'))}</th>${isAdmin()?'<th></th>':''}</tr></thead><tbody>${l.map((c,i)=>{const nx=l[i+1],pv=l[i-1],cur=c.from<=today&&(!nx||nx.from>today),im=imps[c.importId];
      return `<tr style="${cur?'font-weight:650':''}"><td>${fmtDate(c.from)} ${cur?`<span class="badge green">${esc(t('hCurrent'))}</span>`:c.from>today?`<span class="badge">${esc(t('hFutureB'))}</span>`:''}</td><td>${nx?fmtDate(toISO(addDays(parseISO(nx.from),-1))):esc(t('hOpen'))}</td><td class="num" style="${c.superseded?'text-decoration:line-through;opacity:.6':''}">${fmtMoney(c.cost)}${c.superseded?` <span class="badge gray">${esc(t('supersededBadge'))}</span>`:''}${c.prev&&c.prev.length?` <small title="${esc(c.prev.map(p=>fmtMoney(p.cost)).join(' → '))}">(${esc(t('hCorrected'))})</small>`:''}</td><td class="num">${pv?(c.cost>=pv.cost?'+':'')+fmtNum(round2((c.cost-pv.cost)/pv.cost*100))+'%':'—'}</td><td class="clip">${im?esc(im.file+' · '+im.sheet+' ('+im.user+')'):'—'}</td>${isAdmin()?`<td><button class="btn btn-sm" data-cact="fix" data-arg="${esc(c.id)}">${esc(t('hFix'))}</button></td>`:''}</tr>`}).reverse().join('')}</tbody></table></div></div>`});
  if(codes.length>show.length)h+=`<div class="toolbar"><button class="btn" data-cact="hAll">${esc(t('showAll',{n:codes.length}))}</button></div>`;
  const TP={correction:'tCorrection',recalc:'tRecalc',fill:'tFill',migration:'tMigration',superseded:'tSuperseded',removed:'tRemoved'};
  h+=`<div class="card"><h3>${esc(t('hLog'))}</h3>${state.costLog.length?`<div class="table-wrap"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('username'))}</th><th>${esc(t('code'))}</th><th>${esc(t('vigFrom'))}</th><th>${esc(t('type'))}</th><th class="num">${esc(t('oldCost'))}</th><th class="num">${esc(t('newCost'))}</th><th class="num">${esc(t('records'))}</th><th>${esc(t('reason'))}</th></tr></thead><tbody>${state.costLog.slice(0,500).map(x=>`<tr><td>${esc(new Date(x.at).toLocaleString(LANG))}</td><td>${esc(x.user)}</td><td>${esc(x.code)}</td><td>${x.from?fmtDate(x.from):'—'}</td><td>${esc(t(TP[x.type]||'type'))}</td><td class="num">${moneyOr(x.old)}</td><td class="num">${moneyOr(x.new)}</td><td class="num">${fmtNum(x.count||0)}</td><td style="white-space:normal">${esc(x.reason||'—')}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${esc(t('noRecords'))}</div>`}</div>`;
  return h}
function fixModal(id){const c=state.costs.find(x=>x.id===id);if(!c)return;if(needLoad(c.from)){ensureFrom(c.from).then(()=>fixModal(id));return}const end=nextFrom(c.code,c.from),same=state.occurrences.filter(o=>o.costId===c.id),inV=same.filter(o=>o.date>=c.from&&(!end||o.date<end)),open=inV.filter(o=>!occLocked(o.date));
  openModal(`<div class="modal-head"><h2>${esc(t('hFix'))}: ${esc(c.code)}</h2><button class="btn btn-sm btn-ghost" data-close>✕</button></div><div class="modal-body"><p>${esc(c.model)} · ${esc(t('vigFrom'))} ${fmtDate(c.from)} · ${esc(t('unitCost'))} <b>${fmtMoney(c.cost)}</b></p>
   <div class="form-grid" style="grid-template-columns:1fr 2fr"><div class="field"><label>${esc(t('newCost'))} <span class="req">*</span></label><input type="number" id="fxVal" min="0" step="0.0001"></div><div class="field"><label>${esc(t('reason'))} <span class="req">*</span></label><input type="text" id="fxWhy" maxlength="300"></div></div>
   <p class="note" style="margin-top:10px">${esc(t('fixCount',{n:open.length}))}${inV.length-open.length?' '+esc(t('impClosed',{n:inV.length-open.length})):''}${same.length-inV.length?' '+esc(t('fixOutside',{n:same.length-inV.length})):''}</p>
   ${open.length?`<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="fxRec"> ${esc(t('fixAuth'))}</label><div id="fxPrev"></div>`:''}</div>
   <div class="modal-foot"><button class="btn" data-close>${esc(t('cancel'))}</button><button class="btn btn-primary" id="fxOk">${esc(t('save'))}</button></div>`);
  const prev=()=>{const v=+$('#fxVal').value,b=$('#fxPrev');if(b)b.innerHTML=v>0&&$('#fxRec')&&$('#fxRec').checked?affTable(open.map(o=>({o,v}))):''};$('#fxVal').oninput=prev;if($('#fxRec'))$('#fxRec').onchange=prev;
  $('#fxOk').onclick=async()=>{const v=+$('#fxVal').value,why=$('#fxWhy').value.trim(),rec=!!($('#fxRec')&&$('#fxRec').checked);
    if(!(v>0)){toast(t('costInvalid'),true);return}if(!why){toast(t('reasonReq'),true);return}if(v===c.cost){toast(t('fixSame'),true);return}
    logCost({type:'correction',code:c.code,from:c.from,old:c.cost,new:v,count:0,reason:why});c.prev=(c.prev||[]).concat([{cost:c.cost,at:c.at,importId:c.importId}]);c.cost=v;c.at=new Date().toISOString();
    if(rec&&open.length){const before=open.map(o=>({id:o.id,seq:o.seq,old:o.unitCost,oldTotal:o.totalCost}));applyPrice(c,open);logCost({type:'recalc',code:c.code,from:c.from,old:before[0].old,new:v,count:open.length,reason:why,items:before})}
    await persist();closeModal();toast(t('savedOk'));renderCosts()}}

/* ---------- fechamento ---------- */
function costClosing(){const y=+todayISO().slice(0,4),cf=ui.cf||(ui.cf={cy:String(y),cm:String(+todayISO().slice(5,7))}),yr=+cf.cy,mo=+cf.cm||0,years=[];
  if(lazy((yr-1)+'-01-01',renderCosts))return lpBox();
  const ys=new Set(state.occurrences.map(o=>+o.date.slice(0,4)));for(let i=y-3;i<=y;i++)ys.add(i);[...ys].sort().forEach(v=>years.push(v));
  let h=`<div class="card no-print" style="margin-bottom:16px"><div class="toolbar" style="margin:0"><label class="note">${esc(t('periodYear'))} <select data-c="cy">${years.map(v=>`<option ${v===yr?'selected':''}>${v}</option>`).join('')}</select></label><button class="btn btn-sm ${mo?'':'btn-primary'}" data-cmon="0">${esc(t('wholeYear'))}</button></div>${monthLegend()}<div class="monthbar" style="margin-top:8px">${Array.from({length:12},(_,i)=>`<button class="${mo===i+1?'on':''} ${monthStatus(yr,i+1)}" data-cmon="${i+1}"><b>${esc(fmtDT(new Date(Date.UTC(2000,i,1)),{month:'short'}))}${lockIcon(yr,i+1)}</b><small>${[1,2,3,4].filter(w=>weekLaunched(yr,i+1,w)).length}/4</small></button>`).join('')}</div><p class="hint">${esc(t('closeHelp'))}</p></div>`;
  const s=mo?`${yr}-${pad(mo)}-01`:`${yr}-01-01`,e=mo?toISO(new Date(Date.UTC(yr,mo,0))):`${yr}-12-31`,list=state.occurrences.filter(o=>o.date>=s&&o.date<=e),a=agg(list);
  if(mo){const per=s.slice(0,7),c=state.closures[per],closed=c&&c.status==='closed';
    h+=`<div class="card" style="margin-bottom:16px"><div class="toolbar" style="margin:0"><b>${esc(ymLabel(per))}</b>${closed?`<span class="badge blue">${esc(t('mClosed'))}</span><span class="note">${esc(t('byAt',{u:c.by,d:new Date(c.at).toLocaleString(LANG)}))}</span>`:`<span class="badge gray">${esc(t('mOpen'))}</span>`}<span class="sp"></span>${closed?(isAdmin()?`<button class="btn" data-cact="reopen" data-arg="${per}">${esc(t('mReopen'))}</button>`:''):canEdit()?`<button class="btn btn-primary" data-cact="closeM" data-arg="${per}">${esc(t('mClose'))}</button>`:''}</div>`;
    if(closed&&c.totals){const x=c.totals,diff=x.ng!==a.ng||Math.abs(x.cost-a.cost)>.005||x.n!==a.n;h+=diff?`<div class="banner" style="margin-top:10px">${esc(t('mDiff',{a:fmtNum(x.n)+' · '+fmtNum(x.ng)+' · '+fmtMoney(x.cost),b:fmtNum(a.n)+' · '+fmtNum(a.ng)+' · '+fmtMoney(a.cost)}))}</div>`:`<p class="note" style="margin-top:8px">${esc(t('mSame'))}</p>`}
    h+=`<p class="hint" style="margin-top:6px">${esc(t('mClosedRule'))}</p></div>`;
    const prev=[];for(let i=1;i<=6;i++){const d=new Date(Date.UTC(yr,mo-1-i,1)),ps=toISO(d),pe=toISO(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)));prev.push({k:ps.slice(0,7),a:agg(state.occurrences.filter(o=>o.date>=ps&&o.date<=pe))})}
    h+=reportBody(list,{s,e,gran:'week',title:t('closeTitle',{m:ymLabel(per)}),segTitle:t('perWeek'),totTxt:t('monthTotal'),prev:prev[0].a,prevTxt:t('prevMonth')});
    h+=`<div class="card" style="margin-bottom:16px"><h3>${esc(t('cmpMonths'))}</h3><div class="table-wrap"><table><thead><tr><th>${esc(t('periodMonth'))}</th><th class="num">${esc(t('kpiNg'))}</th><th class="num">${esc(t('totalCost'))}</th><th class="num">${esc(t('kpiOcc'))}</th><th class="num">${esc(t('vsCurrent'))}</th></tr></thead><tbody>${[{k:per,a}].concat(prev).map((x,i)=>`<tr style="${i?'':'font-weight:650'}"><td>${esc(ymLabel(x.k))}${monthClosed(x.k+'-01')?` <span class="badge blue">${esc(t('mClosed'))}</span>`:''}</td><td class="num">${fmtNum(x.a.ng)}</td><td class="num">${fmtMoney(x.a.cost)}</td><td class="num">${fmtNum(x.a.n)}</td><td class="num">${i?pctTxt(a.cost,x.a.cost):'—'}</td></tr>`).join('')}</tbody></table></div></div>`}
  else{const pa=agg(state.occurrences.filter(o=>o.date>=`${yr-1}-01-01`&&o.date<=`${yr-1}-12-31`));h+=reportBody(list,{s,e,gran:'month',title:t('closeYear',{y:yr}),segTitle:t('perMonth'),totTxt:t('yearTotal'),prev:pa,prevTxt:t('prevYear')})}
  const lg=state.closureLog.filter(x=>!mo||x.per===s.slice(0,7));
  if(lg.length)h+=`<div class="card"><h3>${esc(t('closeLog'))}</h3><div class="table-wrap"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('periodMonth'))}</th><th>${esc(t('actions'))}</th><th>${esc(t('username'))}</th><th>${esc(t('reason'))}</th></tr></thead><tbody>${lg.map(x=>`<tr><td>${esc(new Date(x.at).toLocaleString(LANG))}</td><td>${esc(ymLabel(x.per))}</td><td>${esc(t(x.act==='close'?'mClose':'mReopen'))}</td><td>${esc(x.user)}</td><td style="white-space:normal">${esc(x.reason||'—')}</td></tr>`).join('')}</tbody></table></div></div>`;
  return h}
/* corpo comum de fechamento e relatório: indicadores, períodos, por código e por modelo */
function reportBody(list,o){const a=agg(list),p=o.prev||null,segs=segments(o.s,o.e,o.gran).map(sg=>({sg,a:agg(list.filter(x=>x.date>=sg.s&&x.date<=sg.e))}));
  const grp=key=>{const m={};list.forEach(x=>{const k=key(x)||'—',g=m[k]||(m[k]={k,ng:0,cost:0,n:0,noCost:0});g.n++;g.ng+=x.qty;if(hasCost(x))g.cost+=+x.totalCost||0;else g.noCost+=x.qty});return Object.values(m).map(g=>(g.cost=round2(g.cost),g)).sort((x,y)=>y.cost-x.cost||y.ng-x.ng)};
  const byCode=grp(x=>normCode(x.code)),byModel=grp(x=>x.model);ui.lastRep={title:o.title,s:o.s,e:o.e,a,p,segs,byCode,byModel,list};
  const k=(l,v,pv,cls,money)=>`<div class="card kpi vivid ${kc(l)}"><div class="lbl">${esc(t(l))}</div><div class="val">${money?fmtMoney(v):fmtNum(v)}</div><div class="sub">${pv!=null?esc(o.prevTxt)+': '+(money?fmtMoney(pv):fmtNum(pv))+pctTxt(v,pv):'&nbsp;'}</div></div>`;
  const tb=(cols,rows,foot)=>`<div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th class="${c[1]?'num':''}">${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody>${foot?`<tfoot><tr>${foot}</tr></tfoot>`:''}</table></div>`;
  const ver=(s,e,f,v)=>`<button class="btn btn-sm" data-cact="see" data-arg="${esc([s,e,f||'',v||''].join('|'))}">${esc(t('view'))}</button>`;
  let h=`<div class="grid g4" style="margin-bottom:12px">${k('kpiNg',a.ng,p&&p.ng,'k2')}${k('totalCost',a.cost,p&&p.cost,'k3',true)}${k('kpiOcc',a.n,p&&p.n)}${k('kNoCost',a.noCost,null,'k4')}</div>`;
  if(a.noCost)h+=`<div class="banner" style="margin-bottom:12px">${esc(t('noCostWarn',{n:a.noCost,q:a.ngNoCost}))}${isAdmin()?` <button class="btn btn-sm" data-cact="fillRange" data-arg="${o.s}|${o.e}">${esc(t('fillBtn'))}</button>`:''}</div>`;
  h+=`<div class="card" style="margin-bottom:16px"><h3>${esc(o.segTitle)}</h3>${tb([[t('period')],[t('date')],[t('kpiNg'),1],[t('totalCost'),1],[t('kpiOcc'),1],[t('kNoCost'),1],['']],segs.map(x=>`<tr><td>${esc(x.sg.label)}${o.gran==='month'&&monthClosed(x.sg.s)?` <span class="badge blue">${esc(t('mClosed'))}</span>`:''}</td><td>${fmtDate(x.sg.s)}${x.sg.e!==x.sg.s?' – '+fmtDate(x.sg.e):''}</td><td class="num">${fmtNum(x.a.ng)}</td><td class="num">${fmtMoney(x.a.cost)}</td><td class="num">${fmtNum(x.a.n)}</td><td class="num">${x.a.noCost?fmtNum(x.a.noCost):'—'}</td><td>${x.a.n?ver(x.sg.s,x.sg.e):''}</td></tr>`),`<td colspan="2">${esc(o.totTxt)}</td><td class="num">${fmtNum(a.ng)}</td><td class="num">${fmtMoney(a.cost)}</td><td class="num">${fmtNum(a.n)}</td><td class="num">${a.noCost?fmtNum(a.noCost):'—'}</td><td>${a.n?ver(o.s,o.e):''}</td>`)}</div>`;
  const gt=(rows,f)=>rows.length?tb([[t(f==='code'?'code':'model')],[t('kpiNg'),1],[t('totalCost'),1],[t('kpiOcc'),1],['']],rows.map(x=>`<tr><td class="clip" title="${esc(x.k)}">${esc(x.k)}</td><td class="num">${fmtNum(x.ng)}</td><td class="num">${fmtMoney(x.cost)}${x.noCost?` <span class="badge gray" title="${esc(t('kNoCost'))}">${fmtNum(x.noCost)} ${esc(t('pieces'))} ${esc(t('noCostShort'))}</span>`:''}</td><td class="num">${fmtNum(x.n)}</td><td>${ver(o.s,o.e,f,x.k)}</td></tr>`)):`<div class="empty">${esc(t('noData'))}</div>`;
  h+=`<div class="grid g2" style="margin-bottom:16px"><div class="card"><h3>${esc(t('byCode'))}</h3>${gt(byCode,'code')}</div><div class="card"><h3>${esc(t('byModel'))}</h3>${gt(byModel,'model')}</div></div>`;
  return h+`<div class="toolbar no-print"><button class="btn" data-cact="exp">${esc(t('exportCsv'))}</button><button class="btn" data-cact="print">${esc(t('print'))}</button></div>`}
function seeRecords(arg){const [s,e,f,v]=arg.split('|'),R=ui.lastRep;if(!R)return;const l=R.list.filter(o=>o.date>=s&&o.date<=e&&(!f||(f==='code'?normCode(o.code)===v:(o.model||'—')===v))).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.seq-b.seq),a=agg(l);
  const byC={};l.forEach(o=>{const k=normCode(o.code)+' · '+o.model,g=byC[k]||(byC[k]={k,ng:0,cost:0});g.ng+=o.qty;if(hasCost(o))g.cost+=+o.totalCost});
  openModal(`<div class="modal-head"><h2>${fmtDate(s)}${e!==s?' – '+fmtDate(e):''}${f?' · '+esc(v):''}</h2><button class="btn btn-sm btn-ghost" data-close>✕</button></div><div class="modal-body"><p class="note">${esc(t('seeSum',{n:fmtNum(a.n),q:fmtNum(a.ng),c:fmtMoney(a.cost)}))}${a.noCost?' · '+esc(t('kNoCost'))+': '+fmtNum(a.noCost):''}</p>
   ${f?'':`<h3 style="font-size:14px;margin:10px 0">${esc(t('byCode'))} / ${esc(t('model'))}</h3><div class="table-wrap" style="margin-bottom:12px"><table><tbody>${Object.values(byC).sort((x,y)=>y.cost-x.cost).map(g=>`<tr><td>${esc(g.k)}</td><td class="num">${fmtNum(g.ng)} ${esc(t('pieces'))}</td><td class="num">${fmtMoney(round2(g.cost))}</td></tr>`).join('')}</tbody></table></div>`}
   <div class="table-wrap"><table><thead><tr><th>${esc(t('idNo'))}</th><th>${esc(t('date'))}</th><th>${esc(t('clientOrigin'))}</th><th>${esc(t('code'))}</th><th>${esc(t('model'))}</th><th class="num">${esc(t('qtyNg'))}</th><th class="num">${esc(t('unitCost'))}</th><th class="num">${esc(t('totalCost'))}</th><th></th></tr></thead><tbody>${l.slice(0,1000).map(o=>`<tr><td>${esc(o.seq)}${demoBadge(o)}</td><td>${fmtDate(o.date)}</td><td class="clip">${esc(o.client)}</td><td>${esc(o.code)}</td><td class="clip">${esc(o.model)}</td><td class="num">${fmtNum(o.qty)}</td><td class="num">${hasCost(o)?fmtMoney(o.unitCost):`<span class="badge gray">${esc(t('noCostShort'))}</span>`}</td><td class="num">${moneyOr(o.totalCost)}</td><td><button class="btn btn-sm" data-seeocc="${esc(o.id)}">${esc(t('view'))}</button></td></tr>`).join('')}</tbody></table></div></div><div class="modal-foot"><button class="btn btn-primary" data-close>${esc(t('close'))}</button></div>`,true);
  $$('[data-seeocc]').forEach(b=>b.onclick=()=>showDetail(b.dataset.seeocc))}
function exportReport(){const R=ui.lastRep;if(!R)return;const a=R.a,rows=[[R.title],[t('date'),fmtDate(R.s)+' – '+fmtDate(R.e)],[t('kpiNg'),a.ng],[t('totalCost'),dec2(a.cost)],[t('kpiOcc'),a.n],[t('kNoCost'),a.noCost],[],[t('period'),t('date'),t('kpiNg'),t('totalCost'),t('kpiOcc'),t('kNoCost')]];
  R.segs.forEach(x=>rows.push([x.sg.label,fmtDate(x.sg.s)+' – '+fmtDate(x.sg.e),x.a.ng,dec2(x.a.cost),x.a.n,x.a.noCost]));
  rows.push([],[t('byCode'),t('kpiNg'),t('totalCost'),t('kpiOcc')]);R.byCode.forEach(x=>rows.push([x.k,x.ng,dec2(x.cost),x.n]));
  rows.push([],[t('byModel'),t('kpiNg'),t('totalCost'),t('kpiOcc')]);R.byModel.forEach(x=>rows.push([x.k,x.ng,dec2(x.cost),x.n]));
  rows.push([],[t('idNo'),t('date'),t('clientOrigin'),t('code'),t('model'),t('qtyNg'),t('unitCost'),t('totalCost'),t('vigFrom')]);R.list.slice().sort((x,y)=>x.date<y.date?-1:1).forEach(o=>rows.push([o.seq,o.date,o.client,o.code,o.model,o.qty,dec2(o.unitCost),dec2(o.totalCost),o.costFrom||'']));
  csvDownload('segregados-custos-'+R.s+'-'+R.e+'.csv',rows)}

/* ---------- relatórios ---------- */
function costReports(){const cr=ui.cr||(ui.cr={rtype:'month',rref:todayISO(),rde:'',rate:'',rcode:'',rmodel:''}),ty=cr.rtype,ref=cr.rref||todayISO();
  const codes=[...new Set(state.costs.map(c=>c.code).concat(state.occurrences.map(o=>normCode(o.code))))].sort(),models=[...new Set(state.occurrences.map(o=>o.model).filter(Boolean))].sort();
  let h=`<div class="card no-print" style="margin-bottom:16px"><div class="toolbar" style="margin:0"><select data-c="rtype">${[['week','periodWeek'],['month','periodMonth'],['year','periodYear'],['range','periodRange']].map(([v,l])=>`<option value="${v}" ${ty===v?'selected':''}>${esc(t(l))}</option>`).join('')}</select>${ty==='range'?`<label class="note">${esc(t('from'))} <input type="date" data-c="rde" value="${esc(cr.rde)}"></label><label class="note">${esc(t('to'))} <input type="date" data-c="rate" value="${esc(cr.rate)}"></label>`:`<label class="note">${esc(t('refDate'))} <input type="date" data-c="rref" value="${esc(ref)}"></label>`}<input type="text" data-c="rcode" list="dlCodes" placeholder="${esc(t('code'))}: ${esc(t('all'))}" value="${esc(cr.rcode)}"><input type="text" data-c="rmodel" list="dlModels" placeholder="${esc(t('model'))}: ${esc(t('all'))}" value="${esc(cr.rmodel)}"></div><datalist id="dlCodes">${codes.map(c=>`<option value="${esc(c)}">`).join('')}</datalist><datalist id="dlModels">${models.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>`;
  let s,e,ps=null,pe=null,gran,prevTxt;const r0=parseISO(ref);
  if(ty==='week'){const m=addDays(r0,-((r0.getUTCDay()+6)%7));s=toISO(m);e=toISO(addDays(m,6));ps=toISO(addDays(m,-7));pe=toISO(addDays(m,-1));gran='day';prevTxt=t('prevWeek')}
  else if(ty==='year'){s=ref.slice(0,4)+'-01-01';e=ref.slice(0,4)+'-12-31';ps=(+ref.slice(0,4)-1)+'-01-01';pe=(+ref.slice(0,4)-1)+'-12-31';gran='month';prevTxt=t('prevYear')}
  else if(ty==='range'){if(!cr.rde||!cr.rate||cr.rde>cr.rate)return h+`<div class="card empty">${esc(t('rangeAsk'))}</div>`;s=cr.rde;e=cr.rate;const n=Math.round((parseISO(e)-parseISO(s))/864e5)+1;pe=toISO(addDays(parseISO(s),-1));ps=toISO(addDays(parseISO(s),-n));gran=n<=31?'day':n<=120?'week':'month';prevTxt=t('prevRange')+' ('+fmtDate(ps)+' – '+fmtDate(pe)+')'}
  else{s=ref.slice(0,8)+'01';e=toISO(new Date(Date.UTC(+ref.slice(0,4),+ref.slice(5,7),0)));const pm=new Date(Date.UTC(+ref.slice(0,4),+ref.slice(5,7)-2,1));ps=toISO(pm);pe=toISO(addDays(parseISO(s),-1));gran='week';prevTxt=t('prevMonth')}
  if(lazy(ps&&ps<s?ps:s,renderCosts))return h+lpBox();
  const fc=normCode(cr.rcode),fm=plain(cr.rmodel),flt=l=>l.filter(o=>(!fc||normCode(o.code)===fc)&&(!fm||plain(o.model).includes(fm))),cur=flt(state.occurrences.filter(o=>o.date>=s&&o.date<=e)),prev=flt(state.occurrences.filter(o=>o.date>=ps&&o.date<=pe));
  h+=`<p class="note" style="margin-bottom:10px">${esc(t('repRange',{a:fmtDate(s),b:fmtDate(e)}))}${fc?' · '+esc(t('code'))+' '+esc(fc):''}${fm?' · '+esc(t('model'))+' "'+esc(cr.rmodel)+'"':''}</p>`;
  h+=reportBody(cur,{s,e,gran,title:t('repTitle',{a:fmtDate(s),b:fmtDate(e)}),segTitle:t({day:'perDay',week:'perWeek',month:'perMonth'}[gran]),totTxt:t('periodTotal'),prev:agg(prev),prevTxt});
  const top=reportTop(cur);return h+top}
function reportTop(list){const m={};list.forEach(o=>{if(!hasCost(o))return;const k=o.model||'—';m[k]=(m[k]||0)+(+o.totalCost||0)});const rows=Object.entries(m).map(([label,value])=>({label,value:round2(value)})).sort((a,b)=>b.value-a.value).slice(0,10);
  return `<div class="card" style="margin-bottom:16px"><h3>${esc(t('topLoss'))}</h3>${hbars(rows,fmtMoney,null,true)}</div>`}
async function costAct(a,arg){
  if(a==='impCancel'){ui.ci=null;renderCosts()}
  else if(a==='impConfirm')confirmImport();
  else if(a==='tpl')downloadTemplate();
  else if(a==='fix')fixModal(arg);
  else if(a==='hAll'){ui.hall=true;renderCosts()}
  else if(a==='see')seeRecords(arg);
  else if(a==='exp')exportReport();
  else if(a==='print')window.print();
  else if(a==='closeM'){const R=ui.lastRep;if(!R||!canEdit())return;const yy=+arg.slice(0,4),mm=+arg.slice(5,7),miss=[1,2,3,4].filter(w=>!weekLaunched(yy,mm,w));if(miss.length&&!await askYes(t('weeksMissing',{w:miss.map(w=>t('weekOfMonth',{n:w})).join(', ')})))return;if(!await askYes(t('mCloseAsk',{m:ymLabel(arg),n:fmtNum(R.a.n),q:fmtNum(R.a.ng),c:fmtMoney(R.a.cost)})+(R.a.noCost?'\n\n'+t('noCostWarn',{n:R.a.noCost,q:R.a.ngNoCost}):'')))return;
    const at=new Date().toISOString(),tot={n:R.a.n,ng:R.a.ng,cost:R.a.cost,noCost:R.a.noCost};state.closures[arg]={status:'closed',totals:tot,by:currentUser.name,at};state.closureLog.unshift({id:uid(),per:arg,act:'close',user:currentUser.name,at,totals:tot});await persist();toast(t('savedOk'));renderCosts()}
  else if(a==='reopen'){if(!isAdmin())return;const why=await askText(t('reopenAsk'));if(why===null)return;if(!why.trim()){toast(t('reasonReq'),true);return}const at=new Date().toISOString();Object.assign(state.closures[arg],{status:'open',by:currentUser.name,at});state.closureLog.unshift({id:uid(),per:arg,act:'reopen',user:currentUser.name,at,reason:why.trim()});await persist();toast(t('savedOk'));renderCosts()}
  else if(a==='fillRange'){const [s,e]=arg.split('|');await ensureFrom(s);const l=state.occurrences.filter(o=>o.date>=s&&o.date<=e&&!hasCost(o)&&!occLocked(o.date));let n=0;
    if(!await askYes(t('fillAsk',{a:fmtDate(s),b:fmtDate(e)})))return;
    l.forEach(o=>{const c=costAt(o.code,o.date);if(c){applyPrice(c,[o]);n++}});if(n)logCost({type:'fill',code:'*',from:s,count:n,reason:t('reasonFill')});await persist();toast(t('fillDone',{n}));renderCosts()}}

/* ================= INICIALIZAÇÃO ================= */
(async function init(){
  LANG=I18N[ls.get('seg_lang')]?ls.get('seg_lang'):'pt-BR';
  if(ONLINE){applyLang(LANG);await cloudInit();return}
  try{await Store.open();state=await Store.get('state')}catch(e){storageOK=false}
  if(!state||!Array.isArray(state.occurrences)){state=buildDemoState();await persist()}
  else if((state.version||1)<3||!Array.isArray(state.costs)||!state.weekDone){state=migrate(state);await persist()}
  if(state.settings)state.settings.requireScalePhoto=false;
  applyLang(LANG);
  if(!storageOK){$('#loginErr').textContent=t('storageError')}
  const sid=ss.get('seg_user');const u=sid&&state.users.find(x=>x.id===sid);
  if(u){currentUser=u;enterApp()}
})();
</script>
</body>
</html>
