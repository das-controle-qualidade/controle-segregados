<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js"></script>
<script>
'use strict';
/* ================= NUVEM (Supabase, mesmo projeto do QC) =================
   Cada item do sistema é uma linha em seg_docs. A cada gravação, compara o estado com a última
   cópia sincronizada e envia só o que mudou. Fotos ficam no Storage "fotos", pasta seg/.
   A chave publicável pode ficar no site: os dados são protegidos pelas regras (RLS) do banco. */
const ONLINE=true;
const SB_URL='https://bkbtgbygrvbyjfzdrlxi.supabase.co',SB_KEY='sb_publishable_OEzNjc6AryDINoRad9dtxA_bjlkl2NW';
const sb=window.supabase.createClient(SB_URL,SB_KEY);
const CLOUD={snap:new Map(),hasPass:false,people:[],session:Math.random().toString(36).slice(2),ch:null,queue:[],timer:null,ready:false,from:'',all:false,maxSeq:0,loading:null};
/* Carregar por período: ao entrar vêm as ocorrências de 1º de janeiro do ano passado em diante; as mais antigas são buscadas quando alguma tela precisar */
const LP_START=()=>(new Date().getFullYear()-1)+'-01-01';
const C_ARR=['occurrences','products','clients','costs','costImports','costLog','closureLog','authLog'],C_MAP=['closures','weekDone'],C_LIST=['problems','destinations'];
const C_NEWEST=['costImports','costLog','closureLog','authLog'];
const FOTO_SEG=7*24*3600;
const sbOk=r=>{if(r&&r.error)throw r.error;return r};
/* no banco a foto guarda só o caminho; o link temporário (assinado) existe apenas na memória */
const occDoc=o=>Object.assign({},o,{photos:(o.photos||[]).map(p=>p.path?{id:p.id,kind:p.kind,name:p.name,path:p.path,size:p.size}:p)});
function docOf(col,item){return col==='occurrences'?occDoc(item):item}
function toDocs(s){const m=new Map(),put=(col,id,dados)=>m.set(col+'|'+id,{col,id:String(id),dados,j:JSON.stringify(dados)});
  C_ARR.forEach(c=>(s[c]||[]).forEach(x=>{if(!x.id)x.id=uid();put(c,x.id,docOf(c,x))}));
  C_MAP.forEach(c=>Object.keys(s[c]||{}).forEach(k=>put(c,k,s[c][k])));
  C_LIST.forEach(c=>(s[c]||[]).forEach(v=>put(c,v,{v})));
  const st=Object.assign({},s.settings);delete st.authPassword;put('settings','settings',st);return m}
function sortNewest(s){C_NEWEST.forEach(c=>s[c].sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))))}
function fromDocs(rows){const s={app:'segregados-prototipo',version:3,settings:{},users:[],reopenCodes:[]};C_ARR.forEach(c=>s[c]=[]);C_MAP.forEach(c=>s[c]={});C_LIST.forEach(c=>s[c]=[]);
  rows.forEach(r=>{if(C_ARR.includes(r.col))s[r.col].push(r.dados);else if(C_MAP.includes(r.col))s[r.col][r.id]=r.dados;else if(C_LIST.includes(r.col))s[r.col].push(r.dados.v);else if(r.col==='settings')s.settings=r.dados});
  sortNewest(s);return s}
async function signPhotos(list){const ps=[];list.forEach(o=>(o.photos||[]).forEach(p=>{if(p.path)ps.push(p.path)}));const urls={};
  for(let i=0;i<ps.length;i+=500){const r=sbOk(await sb.storage.from('fotos').createSignedUrls(ps.slice(i,i+500),FOTO_SEG));(r.data||[]).forEach(x=>{if(x.signedUrl)urls[x.path]=x.signedUrl})}
  list.forEach(o=>(o.photos||[]).forEach(p=>{if(p.path)p.data=urls[p.path]||''}))}
async function pageAll(mk){const rows=[];for(let f=0;;f+=1000){const r=sbOk(await mk().order('id').range(f,f+999));rows.push(...(r.data||[]));if((r.data||[]).length<1000)return rows}}
async function fetchDocs(){CLOUD.from=LP_START();CLOUD.all=false;
  const [other,occ,top]=await Promise.all([pageAll(()=>sb.from('seg_docs').select('col,id,dados').neq('col','occurrences')),pageAll(()=>sb.from('seg_docs').select('col,id,dados').eq('col','occurrences').gte('dados->>date',CLOUD.from)),
    sb.from('seg_docs').select('dados').eq('col','occurrences').order('dados->seq',{ascending:false,nullsFirst:false}).limit(1).then(sbOk)]);
  CLOUD.maxSeq=+((top.data||[])[0]||{dados:{}}).dados.seq||0;return other.concat(occ)}
/* busca as ocorrências de d (ou todas, se d vazio) até o início do que já está carregado */
async function cloudEnsureFrom(d){if(CLOUD.all||(d&&d>=CLOUD.from))return;if(CLOUD.loading)return CLOUD.loading;
  CLOUD.loading=(async()=>{await cloudChain;const before=CLOUD.from,rows=await pageAll(()=>{let q=sb.from('seg_docs').select('col,id,dados').eq('col','occurrences').lt('dados->>date',before);return d?q.gte('dados->>date',d):q});
    const have=new Set(state.occurrences.map(o=>String(o.id))),add=rows.filter(r=>!have.has(String(r.id))).map(r=>r.dados);await signPhotos(add);
    add.forEach(o=>{state.occurrences.push(o);const dd=docOf('occurrences',o);CLOUD.snap.set('occurrences|'+o.id,{col:'occurrences',id:String(o.id),dados:dd,j:JSON.stringify(dd)})});
    if(d)CLOUD.from=d;else CLOUD.all=true;ui.usage=null})();
  try{await CLOUD.loading}finally{CLOUD.loading=null}}
function dataBlob(d){const i=d.indexOf(','),mime=(/^data:([^;,]+)/.exec(d)||[])[1]||'image/jpeg',b=atob(d.slice(i+1)),a=new Uint8Array(b.length);for(let k=0;k<b.length;k++)a[k]=b.charCodeAt(k);return new Blob([a],{type:mime})}
async function uploadPhotos(){for(const o of state.occurrences)for(const p of o.photos||[])if(!p.path&&/^data:image\/[^;]+;base64,/.test(p.data||'')){const bl=dataBlob(p.data),path='seg/'+o.id+'-'+p.id+'.jpg';
    sbOk(await sb.storage.from('fotos').upload(path,bl,{upsert:true,contentType:bl.type}));p.path=path;p.size=bl.size}}
const pathsOf=m=>{const out=new Set();m.forEach(d=>{if(d.col==='occurrences')(d.dados.photos||[]).forEach(p=>{if(p.path)out.add(p.path)})});return out};
async function cloudFlush(){await uploadPhotos();const docs=toDocs(state),up=[],del={};
  docs.forEach((d,k)=>{const old=CLOUD.snap.get(k);if(!old||old.j!==d.j)up.push({col:d.col,id:d.id,dados:d.dados,origem:CLOUD.session})});
  CLOUD.snap.forEach((d,k)=>{if(!docs.has(k))(del[d.col]=del[d.col]||[]).push(d.id)});
  for(let i=0;i<up.length;i+=200)sbOk(await sb.from('seg_docs').upsert(up.slice(i,i+200)));
  for(const c in del)for(let i=0;i<del[c].length;i+=100)sbOk(await sb.from('seg_docs').delete().eq('col',c).in('id',del[c].slice(i,i+100)));
  const now=pathsOf(docs),gone=[...pathsOf(CLOUD.snap)].filter(p=>!now.has(p));CLOUD.snap=docs;
  if(gone.length)await sb.storage.from('fotos').remove(gone).catch(()=>{})}
let cloudChain=Promise.resolve();
function cloudPersist(){cloudChain=cloudChain.then(cloudFlush).catch(e=>{console.warn(e);toast(t('cloudSaveErr'),true)});return cloudChain}
/* mudanças feitas por outras pessoas chegam em tempo real */
function cloudApply(ev){const row=ev.new&&ev.new.col?ev.new:ev.old,col=row.col,id=row.id,del=ev.eventType==='DELETE',k=col+'|'+id;
  if(C_ARR.includes(col)){const a=state[col],i=a.findIndex(x=>String(x.id)===id);if(del){if(i>=0)a.splice(i,1)}else if(i>=0)a[i]=row.dados;else a.push(row.dados)}
  else if(C_MAP.includes(col)){if(del)delete state[col][id];else state[col][id]=row.dados}
  else if(C_LIST.includes(col)){const i=state[col].indexOf(id);if(del){if(i>=0)state[col].splice(i,1)}else if(i<0)state[col].push(id)}
  else if(col==='settings'&&!del)state.settings=Object.assign({},row.dados,{requireScalePhoto:false});
  if(del)CLOUD.snap.delete(k);else{const dados=col==='settings'?(()=>{const x=Object.assign({},state.settings);delete x.authPassword;return x})():C_ARR.includes(col)?docOf(col,state[col].find(x=>String(x.id)===id)):row.dados;CLOUD.snap.set(k,{col,id,dados,j:JSON.stringify(dados)})}}
async function cloudDrain(){const q=CLOUD.queue;CLOUD.queue=[];CLOUD.timer=null;await cloudChain;q.forEach(cloudApply);sortNewest(state);
  await signPhotos(q.filter(e=>e.new&&e.new.col==='occurrences').map(e=>state.occurrences.find(o=>o.id===e.new.id)).filter(Boolean)).catch(()=>{});
  const typing=route().name==='new'||!$('#modal').hidden||/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'');if(currentUser&&!typing)renderShell()}
function cloudListen(){CLOUD.ch=sb.channel('seg_docs').on('postgres_changes',{event:'*',schema:'public',table:'seg_docs'},ev=>{if(ev.new&&ev.new.origem===CLOUD.session)return;CLOUD.queue.push(ev);if(!CLOUD.timer)CLOUD.timer=setTimeout(cloudDrain,700)}).subscribe()}
async function cloudProfile(u){const [pf,pp]=await Promise.all([sb.from('perfis').select('nome,papel').eq('id',u.id).maybeSingle().then(sbOk),sb.from('seg_papeis').select('papel').eq('id',u.id).maybeSingle().then(sbOk)]);
  const admin=pf.data&&pf.data.papel==='admin',papel=pp.data&&pp.data.papel;return {id:u.id,username:u.email,name:(pf.data&&pf.data.nome)||u.email,role:papel==='blocked'?'blocked':admin?'admin':papel||'viewer'}}
async function cloudEnter(u){$('#loginErr').textContent=t('cloudLoading');currentUser=null;const me=await cloudProfile(u);if(me.role==='blocked'){await sb.auth.signOut();$('#loginErr').textContent=t('cloudBlocked');return}const rows=await fetchDocs();CLOUD.hasPass=!!sbOk(await sb.rpc('seg_senha_definida')).data;
  if(!rows.length&&me.role==='admin'){state=buildDemoState();state.users=[];delete state.settings.authPassword;currentUser=me;CLOUD.snap=new Map();await uploadPhotos();await cloudFlush()}
  else if(!rows.length){state=null;state=emptyState(false);state.users=[];delete state.settings.authPassword;CLOUD.snap=toDocs(state)}
  else{state=migrate(fromDocs(rows));state.settings.requireScalePhoto=false;delete state.settings.authPassword;await signPhotos(state.occurrences);CLOUD.snap=toDocs(state)}
  currentUser=me;CLOUD.ready=true;if(!CLOUD.ch)cloudListen();$('#loginErr').textContent='';$('#lp').value='';enterApp();backupReminder()}
async function cloudLogin(email,pass){$('#loginErr').textContent=t('cloudLoading');const r=await sb.auth.signInWithPassword({email,password:pass});if(r.error){$('#loginErr').textContent=t('loginError');return}
  try{await cloudEnter(r.data.user)}catch(e){console.warn(e);$('#loginErr').textContent=t('cloudLoadErr')}}
async function cloudLogout(){if(CLOUD.ch){await sb.removeChannel(CLOUD.ch);CLOUD.ch=null}await sb.auth.signOut();state=null;CLOUD.snap=new Map()}
async function cloudInit(){$('#lu').type='email';$('#lu').autocomplete='email';$('.demo-box').hidden=true;$('.demo-box').style.display='none';
  const labels=$('label[for=lu]');if(labels)labels.textContent=t('cloudEmail');$('#lu').placeholder=t('cloudEmail');
  const {data}=await sb.auth.getSession();if(data&&data.session){try{await cloudEnter(data.session.user)}catch(e){console.warn(e);$('#loginErr').textContent=t('cloudLoadErr')}}}
/* backup com as fotos dentro do arquivo */
async function cloudBackupState(){const s=JSON.parse(JSON.stringify(state));delete s.settings.authPassword;s.users=[{id:'u1',username:'admin',password:'',name:'Administrador',role:'admin'}];
  for(const o of s.occurrences)for(const p of o.photos||[])if(p.path&&p.data){try{const b=await (await fetch(p.data)).blob();p.data=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(b)});delete p.path;delete p.size}catch(e){}}
  return s}
/* Administração: as contas são as mesmas do QC. Remover tira o acesso só deste sistema. */
async function peopleLoad(){const [a,b]=await Promise.all([sb.from('perfis').select('id,email,nome,papel').order('nome').then(sbOk),sb.from('seg_papeis').select('id,papel').then(sbOk)]);const m={};(b.data||[]).forEach(x=>m[x.id]=x.papel);
  CLOUD.people=(a.data||[]).map(p=>({id:p.id,email:p.email,nome:p.nome,qcAdmin:p.papel==='admin',role:m[p.id]==='blocked'?'blocked':p.papel==='admin'?'admin':m[p.id]||'viewer'}))}
function adminUsers(body){return sb.functions.invoke('admin-usuarios',{body}).then(async r=>{if(!r.error)return r.data;const c=r.error.context,j=c&&c.json?await c.json().catch(()=>({})):{};throw new Error(j.error||r.error.message)})}
const setPapel=(id,papel)=>sb.from('seg_papeis').upsert({id,papel}).then(sbOk);
function peopleCard(){if(!CLOUD.peopleLoaded){CLOUD.peopleLoaded=true;peopleLoad().then(()=>{if(route().name==='admin')renderAdmin()}).catch(e=>{console.warn(e);toast(t('cloudLoadErr'),true)})}
  const opt=(p,v)=>`<option value="${v}" ${p.role===v?'selected':''}>${esc(roleLabel(v))}</option>`;
  const row=p=>`<tr style="${p.role==='blocked'?'opacity:.65':''}"><td>${esc(p.email)}</td><td>${esc(p.nome)}</td><td>${p.role==='admin'?esc(roleLabel('admin')):`<select data-prole="${p.id}">${opt(p,'operator')}${opt(p,'viewer')}${opt(p,'blocked')}</select>`}</td><td><div class="row-actions"><button class="btn btn-sm" data-ppw="${p.id}">🔑 ${esc(t('uPass'))}</button>${p.id===currentUser.id||p.role==='blocked'?'':`<button class="btn btn-sm btn-danger" data-prm="${p.id}">${esc(t('remove'))}</button>`}</div></td></tr>`,head=`<thead><tr><th>${esc(t('cloudEmail'))}</th><th>${esc(t('name'))}</th><th>${esc(t('role'))}</th><th></th></tr></thead>`,off=CLOUD.people.filter(p=>p.role==='blocked');
  return `<div class="card" style="grid-column:1/-1"><h3>${esc(t('users'))}</h3><div class="table-wrap" style="margin-bottom:12px"><table>${head}<tbody>${CLOUD.people.filter(p=>p.role!=='blocked').map(row).join('')}</tbody></table></div>
   ${off.length?`<details open style="margin-bottom:12px"><summary class="note" style="cursor:pointer;font-weight:600">${esc(t('uBlocked'))} (${off.length})</summary><div class="table-wrap" style="margin-top:8px"><table>${head}<tbody>${off.map(row).join('')}</tbody></table></div></details>`:''}
   <form class="inline-add" id="pAdd"><input name="nome" placeholder="${esc(t('name'))}" required><input name="email" type="email" placeholder="${esc(t('cloudEmail'))}" required autocomplete="off"><input name="senha" type="password" minlength="8" placeholder="${esc(t('password'))}" required autocomplete="new-password"><select name="papel"><option value="operator">${esc(roleLabel('operator'))}</option><option value="viewer">${esc(roleLabel('viewer'))}</option></select><button class="btn btn-primary">${esc(t('addUser'))}</button></form>
   <p class="hint">${esc(t('cloudUsersNote'))}</p></div>`}
function bindPeople(){const reload=async()=>{await peopleLoad();renderAdmin()};
  $$('[data-prole]').forEach(s=>s.onchange=async()=>{try{await setPapel(s.dataset.prole,s.value);await reload();toast(t('savedOk'))}catch(e){console.warn(e);toast(t('cloudSaveErr'),true)}});
  $$('#view [data-prm]').forEach(b=>b.onclick=async()=>{const p=CLOUD.people.find(x=>x.id===b.dataset.prm);if(!p||!await askYes(t('uRemoveAsk',{u:p.nome||p.email})))return;try{await setPapel(p.id,'blocked');await reload();toast(t('uRemoved'))}catch(e){console.warn(e);toast(t('cloudSaveErr'),true)}});
  $$('[data-ppw]').forEach(b=>b.onclick=()=>{const p=CLOUD.people.find(x=>x.id===b.dataset.ppw);if(p)passModal(p.nome||p.email,t('uPassQc'),async v=>{await adminUsers({acao:'senha',id:p.id,senha:v});toast(t('uPassOk'))})});
  const f=$('#pAdd');if(f)f.onsubmit=async e=>{e.preventDefault();const btn=$('button',f),email=f.email.value.trim().toLowerCase(),senha=f.senha.value,papel=f.papel.value,nome=f.nome.value.trim();btn.disabled=true;
    try{await peopleLoad();const p=CLOUD.people.find(x=>String(x.email).toLowerCase()===email);
      if(p&&p.role!=='blocked'){toast(t('uAlready',{u:p.nome||p.email}),true);btn.disabled=false;return}
      if(p){if(!await askYes(t('uRestoreAsk',{u:p.nome||p.email}))){btn.disabled=false;return}await adminUsers({acao:'senha',id:p.id,senha});await setPapel(p.id,papel);await reload();toast(t('uRestored'));return}
      const r=await adminUsers({acao:'criar',email,senha,nome,papel:'user'});await setPapel(r.id,papel);await reload();toast(t('uAdded'))}catch(err){toast(err.message||t('cloudSaveErr'),true);btn.disabled=false}}}
</script>
