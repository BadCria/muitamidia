const $ = (s, el=document) => el.querySelector(s);
const app = $('#app');
let ME = null;

const api = async (url, data) => {
  const opt = data ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)} : {};
  const r = await fetch(url, opt);
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error || 'Erro');
  return j;
};
const esc = s => String(s||'').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const path = () => location.pathname.replace(/^\//,'').replace(/\/$/,'');
function go(url){ history.pushState(null,'',url); route(); }
document.addEventListener('click', e=>{ const a=e.target.closest('[data-link]'); if(a){ e.preventDefault(); go(a.getAttribute('href')); }});
window.addEventListener('popstate', route);

function particles(n=34){
  const box = $('#particles'); box.innerHTML='';
  for(let i=0;i<n;i++){
    const p=document.createElement('i'); p.className='particle';
    p.style.setProperty('--x', Math.random()*100+'vw');
    p.style.setProperty('--mx', (Math.random()*120-60)+'px');
    p.style.setProperty('--d', (8+Math.random()*12)+'s');
    p.style.animationDelay = (-Math.random()*14)+'s'; box.appendChild(p);
  }
}
particles();

function profileCard(u, preview=false){
  const links = (u.links||[]).map(l=>`<a class="plink" target="_blank" href="${esc(l.url||'#')}"><span>${esc(l.label||'Link')}</span><span>↗</span></a>`).join('') || `<a class="plink" href="#"><span>Nenhum link ainda</span><span>+</span></a>`;
  return `<div class="profile-card">
    <img class="banner" src="${esc(u.banner||'/assets/mtm-banner-red.png')}" onerror="this.src='/assets/mtm-banner-red.png'">
    <div class="avatar-wrap"><img class="avatar" src="${esc(u.avatar||'/assets/mtm-logo.png')}" onerror="this.src='/assets/mtm-logo.png'">${u.ownerBadge?'<div class="owner-badge" title="Dono">👑</div>':''}</div>
    <div class="profile-body"><div class="username">${esc(u.displayName||u.username)}</div>
    <div class="tagline">${esc(u.bio||'Nova bio na Muita Midia.')}</div>
    <div class="stats"><span>👁 ${u.views||0}</span><span>${u.verified?'✓ Verificado':'MTM'}</span></div>
    <div class="linklist">${links}</div></div>
    ${u.music?`<audio autoplay loop controls src="${esc(u.music)}" style="width:calc(100% - 48px);margin:20px 24px 0"></audio>`:''}
  </div>`;
}

function home(){
  app.innerHTML = `<section class="hero container">
    <div><span class="eyebrow"><i class="dot"></i>Bios premium para sua identidade</span>
    <h1>Crie sua bio <span class="grad">Muita Midia</span> com estilo.</h1>
    <p class="lead">Uma plataforma completa para criar perfis personalizados com avatar, banner, música, links, views, explore e badge/coroa controlada pelo admin.</p>
    <div class="actions"><a data-link class="btn" href="/register">Criar minha bio</a><a data-link class="btn ghost" href="/explore">Ver explore</a></div></div>
    <div class="mock"><div class="phone">${profileCard({displayName:'BadCria',username:'badcria',bio:'Dono da Muita Midia. Perfil premium com coroa acima da foto.',avatar:'/assets/mtm-logo.png',banner:'/assets/mtm-banner-red.png',ownerBadge:true,verified:true,views:999,links:[{label:'Discord',url:'#'},{label:'Instagram',url:'#'},{label:'TikTok',url:'#'}]})}</div></div>
  </section>
  <section class="section container"><h2>Feito pra parecer plataforma de verdade</h2><div class="grid">
    <div class="feature"><b>Cadastro com email</b><p>Usuário cria conta, faz login e edita o próprio perfil pelo dashboard.</p></div>
    <div class="feature"><b>Dashboard completo</b><p>Avatar, banner, bio, localização, música, links sociais e partículas.</p></div>
    <div class="feature"><b>Admin e coroa</b><p>Você consegue ativar coroa, verificado e destaque em qualquer usuário.</p></div>
  </div></section><footer class="footer">Muita Midia.gg • Plataforma de bios premium</footer>`;
}

async function explore(){
  app.innerHTML = `<div class="container explore-head"><h1 style="font-size:58px">Explore</h1><input class="input search" placeholder="Pesquisar usuário..." oninput="filterCards(this.value)"></div><div class="container cards" id="cards"></div>`;
  const {users}= await api('/api/users');
  $('#cards').innerHTML = users.map(u=>`<a class="mini-card" data-user="${esc((u.displayName||u.username).toLowerCase())}" data-link href="/${u.username}">
    <img class="banner" src="${esc(u.banner)}"><div class="avatar-wrap"><img class="avatar" src="${esc(u.avatar)}">${u.ownerBadge?'<div class="owner-badge">👑</div>':''}</div>
    <div class="mini-info"><h3>${esc(u.displayName||u.username)}</h3><p>${esc(u.bio)}</p><span class="small">👁 ${u.views||0} views ${u.featured?' • destaque':''}</span></div></a>`).join('');
}
window.filterCards = q => document.querySelectorAll('.mini-card').forEach(c=>c.style.display=c.dataset.user.includes(q.toLowerCase())?'block':'none');

function auth(mode){
  const isReg = mode==='register';
  app.innerHTML = `<div class="authwrap container"><div class="authbox"><h2>${isReg?'Criar conta':'Entrar'}</h2><p class="small">${isReg?'Escolha seu username, email e senha.':'Entre com username ou email.'}</p><div class="form">
    ${isReg?'<input class="input" id="username" placeholder="username ex: badcria">':''}
    <input class="input" id="login" placeholder="${isReg?'email':'username ou email'}">
    <input class="input" id="password" type="password" placeholder="senha">
    <button class="btn" onclick="submitAuth('${mode}')">${isReg?'Criar bio':'Entrar'}</button><div id="msg"></div>
    <p class="small">${isReg?'Já tem conta? <a data-link href="/login">Entrar</a>':'Não tem conta? <a data-link href="/register">Criar conta</a>'}</p></div></div></div>`;
}
window.submitAuth = async mode => {
  try{
    const payload = mode==='register' ? {username:$('#username').value, email:$('#login').value, password:$('#password').value} : {login:$('#login').value, password:$('#password').value};
    await api('/api/'+mode, payload); await loadMe(); go('/dashboard');
  }catch(e){ $('#msg').innerHTML = `<span class="error">${esc(e.message)}</span>`; }
};

async function dashboard(){
  if(!ME){ go('/login'); return; }
  app.innerHTML = `<div class="container dashboard"><aside class="panel side"><a class="active">Editar perfil</a>${ME.role==='admin'?'<a data-link href="/admin">Admin / Coroas</a>':''}<a data-link href="/'+ME.username+'">Ver minha bio</a><button onclick="logout()">Sair</button><p class="small">Seu link: /${ME.username}</p></aside><section class="dash-grid">
    <div class="dash-card full"><h2>Dashboard</h2><p class="small">Cole URLs de imagem/música. No Render grátis, isso é mais confiável que upload local.</p></div>
    <div class="dash-card"><label>Nome</label><input class="input" id="displayName" value="${esc(ME.displayName)}"><label>Bio</label><textarea id="bio">${esc(ME.bio)}</textarea><label>Localização</label><input class="input" id="location" value="${esc(ME.location)}"><label><input class="toggle" type="checkbox" id="particlesToggle" ${ME.particles?'checked':''}> Partículas no perfil</label></div>
    <div class="dash-card"><label>Avatar URL</label><input class="input" id="avatar" value="${esc(ME.avatar)}"><label>Banner URL</label><input class="input" id="banner" value="${esc(ME.banner)}"><label>Música URL .mp3</label><input class="input" id="music" value="${esc(ME.music)}"><button class="btn" onclick="saveProfile()">Salvar perfil</button><div id="saveMsg"></div></div>
    <div class="dash-card full"><h3>Links</h3><div id="linksForm"></div><button class="btn ghost" onclick="addLink()">+ Adicionar link</button></div>
    <div class="dash-card full"><h3>Preview</h3><div class="phone" style="max-width:440px">${profileCard(ME,true)}</div></div>
  </section></div>`;
  renderLinks(ME.links||[]);
}
function renderLinks(links){ $('#linksForm').innerHTML = links.map((l,i)=>`<div style="display:grid;grid-template-columns:1fr 2fr auto;gap:10px;margin:10px 0"><input class="input link-label" value="${esc(l.label)}" placeholder="Nome"><input class="input link-url" value="${esc(l.url)}" placeholder="URL"><button class="btn ghost" onclick="this.parentElement.remove()">x</button></div>`).join(''); }
window.addLink=()=> $('#linksForm').insertAdjacentHTML('beforeend',`<div style="display:grid;grid-template-columns:1fr 2fr auto;gap:10px;margin:10px 0"><input class="input link-label" placeholder="Nome"><input class="input link-url" placeholder="URL"><button class="btn ghost" onclick="this.parentElement.remove()">x</button></div>`);
window.saveProfile = async()=>{
  const links=[...document.querySelectorAll('#linksForm>div')].map(row=>({label:$('.link-label',row).value,url:$('.link-url',row).value}));
  try{ const j=await api('/api/profile',{displayName:$('#displayName').value,bio:$('#bio').value,location:$('#location').value,avatar:$('#avatar').value,banner:$('#banner').value,music:$('#music').value,particles:$('#particlesToggle').checked,links}); ME=j.user; $('#saveMsg').innerHTML='<span class="success">Salvo!</span>'; setTimeout(dashboard,500);}catch(e){$('#saveMsg').innerHTML='<span class="error">'+esc(e.message)+'</span>'}
};
window.logout=async()=>{await api('/api/logout',{}); ME=null; go('/');};

async function admin(){
  if(!ME || ME.role!=='admin'){ go('/login'); return; }
  const {users}=await api('/api/users');
  app.innerHTML=`<div class="container section"><h1 style="font-size:58px">Admin</h1><p class="lead">Ative coroa em cima da foto, verificado e destaque em qualquer usuário.</p><div class="panel">${users.map(u=>`<div class="admin-row"><b>${esc(u.displayName||u.username)} <span class="small">/${u.username}</span></b><label>👑 <input class="toggle" type="checkbox" ${u.ownerBadge?'checked':''} onchange="adminToggle('${u.username}','ownerBadge',this.checked)"></label><label>✓ <input class="toggle" type="checkbox" ${u.verified?'checked':''} onchange="adminToggle('${u.username}','verified',this.checked)"></label><label>Destaque <input class="toggle" type="checkbox" ${u.featured?'checked':''} onchange="adminToggle('${u.username}','featured',this.checked)"></label></div>`).join('')}</div></div>`;
}
window.adminToggle=async(username,key,val)=>{ await api('/api/admin/user/'+username,{[key]:val}); };

async function publicProfile(username){
  app.innerHTML = `<div class="authwrap container"><div class="panel">Carregando perfil...</div></div>`;
  try{ const {user}=await api('/api/user/'+username); document.title=(user.displayName||user.username)+' — Muita Midia'; app.innerHTML=`<div class="authwrap container"><div class="phone">${profileCard(user)}</div></div>`; if(!user.particles) $('#particles').innerHTML=''; else particles(); }
  catch(e){ app.innerHTML=`<div class="authwrap container"><div class="authbox"><h2>Perfil não encontrado</h2><p class="small">Esse usuário ainda não existe.</p><a data-link class="btn" href="/register">Criar conta</a></div></div>`; }
}
async function loadMe(){ const j=await api('/api/me'); ME=j.user; $('#loginLink').classList.toggle('hidden',!!ME); $('#registerLink').classList.toggle('hidden',!!ME); $('#dashLink').classList.toggle('hidden',!ME); }
async function route(){ await loadMe().catch(()=>{}); particles(); document.title='Muita Midia — Bios Premium'; const p=path(); if(!p) return home(); if(p==='explore') return explore(); if(p==='login') return auth('login'); if(p==='register') return auth('register'); if(p==='dashboard') return dashboard(); if(p==='admin') return admin(); return publicProfile(p); }
route();
