const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DB_PATH = path.join(ROOT, 'data', 'db.json');
const sessions = new Map();

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(express.static(PUBLIC, { maxAge: '1h' }));

function readDb(){
  if(!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({users:{}}, null, 2));
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function writeDb(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }
function cleanUsername(v){ return String(v||'').toLowerCase().replace(/[^a-z0-9_.-]/g,'').slice(0,24); }
function publicUser(u){
  if(!u) return null;
  const { passwordHash, email, ...rest } = u;
  return rest;
}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')){
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored){
  if(!stored) return String(password) === 'mtm123';
  const [salt, hash] = stored.split(':');
  if(!salt || !hash) return false;
  const test = hashPassword(password, salt).split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(test));
}
function initAdmin(){
  const db = readDb();
  const admin = db.users.badcria;
  if(admin && !admin.passwordHash){
    admin.passwordHash = hashPassword('mtm123');
    writeDb(db);
  }
}
initAdmin();
function currentUser(req){
  const token = req.cookies.mtm_session;
  if(!token || !sessions.has(token)) return null;
  const username = sessions.get(token);
  const db = readDb();
  return db.users[username] || null;
}
function requireAuth(req,res,next){ const u = currentUser(req); if(!u) return res.status(401).json({error:'Não logado'}); req.user = u; next(); }
function requireAdmin(req,res,next){ const u = currentUser(req); if(!u || u.role !== 'admin') return res.status(403).json({error:'Sem permissão'}); req.user = u; next(); }

app.get('/api/me', (req,res)=> res.json({ user: publicUser(currentUser(req)) }));
app.post('/api/register', (req,res)=>{
  const db = readDb();
  const username = cleanUsername(req.body.username);
  const email = String(req.body.email||'').trim().toLowerCase().slice(0,120);
  const password = String(req.body.password||'');
  if(username.length < 3) return res.status(400).json({error:'Username precisa ter pelo menos 3 caracteres'});
  if(!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({error:'Email inválido'});
  if(password.length < 6) return res.status(400).json({error:'Senha precisa ter pelo menos 6 caracteres'});
  if(db.users[username]) return res.status(409).json({error:'Username já existe'});
  if(Object.values(db.users).some(u => u.email === email)) return res.status(409).json({error:'Email já cadastrado'});
  db.users[username] = {
    username, email, displayName: username, passwordHash: hashPassword(password), role:'member', ownerBadge:false, featured:false, verified:false,
    bio:'Nova bio na Muita Midia.', location:'', avatar:'/assets/mtm-logo.png', banner:'/assets/mtm-banner-red.png', music:'', theme:'red', particles:true, views:0, links:[], createdAt:new Date().toISOString()
  };
  writeDb(db);
  const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, username);
  res.cookie('mtm_session', token, { httpOnly:true, sameSite:'lax', maxAge: 1000*60*60*24*30 });
  res.json({ok:true, user: publicUser(db.users[username])});
});
app.post('/api/login', (req,res)=>{
  const usernameOrEmail = String(req.body.login||'').trim().toLowerCase();
  const password = String(req.body.password||'');
  const db = readDb();
  const user = db.users[cleanUsername(usernameOrEmail)] || Object.values(db.users).find(u => u.email === usernameOrEmail);
  if(!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({error:'Login ou senha incorretos'});
  const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, user.username);
  res.cookie('mtm_session', token, { httpOnly:true, sameSite:'lax', maxAge: 1000*60*60*24*30 });
  res.json({ok:true, user: publicUser(user)});
});
app.post('/api/logout', (req,res)=>{ const token = req.cookies.mtm_session; if(token) sessions.delete(token); res.clearCookie('mtm_session'); res.json({ok:true}); });
app.get('/api/users', (req,res)=>{
  const db = readDb();
  const users = Object.values(db.users).map(publicUser).sort((a,b)=>(b.featured-a.featured)||(b.views-a.views));
  res.json({users});
});
app.get('/api/user/:username', (req,res)=>{
  const db = readDb();
  const username = cleanUsername(req.params.username);
  const user = db.users[username];
  if(!user) return res.status(404).json({error:'Perfil não encontrado'});
  user.views = (user.views||0)+1; writeDb(db);
  res.json({user: publicUser(user)});
});
app.post('/api/profile', requireAuth, (req,res)=>{
  const db = readDb();
  const u = db.users[req.user.username];
  const allowed = ['displayName','bio','location','avatar','banner','music','theme'];
  allowed.forEach(k=>{ if(typeof req.body[k] === 'string') u[k] = req.body[k].slice(0, k==='bio'?260:900); });
  if(typeof req.body.particles === 'boolean') u.particles = req.body.particles;
  if(Array.isArray(req.body.links)){
    u.links = req.body.links.slice(0,8).map(x=>({label:String(x.label||'Link').slice(0,24), url:String(x.url||'#').slice(0,250)}));
  }
  writeDb(db);
  res.json({ok:true, user: publicUser(u)});
});
app.post('/api/admin/user/:username', requireAdmin, (req,res)=>{
  const db = readDb();
  const target = db.users[cleanUsername(req.params.username)];
  if(!target) return res.status(404).json({error:'Usuário não encontrado'});
  ['ownerBadge','featured','verified'].forEach(k=>{ if(typeof req.body[k] === 'boolean') target[k] = req.body[k]; });
  if(req.body.role === 'admin' || req.body.role === 'member') target.role = req.body.role;
  writeDb(db);
  res.json({ok:true, user: publicUser(target)});
});

app.get('*', (req,res)=> res.sendFile(path.join(PUBLIC, 'index.html')));
app.listen(PORT, ()=> console.log(`Muita Midia online na porta ${PORT}`));
