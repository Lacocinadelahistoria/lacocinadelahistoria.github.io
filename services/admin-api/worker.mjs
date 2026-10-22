import '../../assets/js/media.js';
import '../../assets/js/text-fields.js';
const REPO = 'Lacocinadelahistoria/lacocinadelahistoria.github.io';
const CONTENT = `https://api.github.com/repos/${REPO}/contents/data/contenido.json`;
const enc = new TextEncoder();
const bytes64 = bytes => btoa(Array.from(bytes, x => String.fromCharCode(x)).join(''));
const decode64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const b64url = bytes => bytes64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromurl = value => decode64(value.replace(/-/g, '+').replace(/_/g, '/'));
export async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt:decode64(salt), iterations:100000}, key, 256));
}
async function signingKey(secret) { return crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign','verify']); }
async function issue(username, env) {
  const payload = b64url(enc.encode(JSON.stringify({sub:username, exp:Math.floor(Date.now()/1000)+3600})));
  return payload+'.'+b64url(new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(env.SESSION_SECRET), enc.encode(payload))));
}
async function session(request, env, users) {
  try {
    const [payload,sig,extra] = (request.headers.get('Authorization') || '').replace(/^Bearer /,'').split('.');
    if (!payload || !sig || extra || !await crypto.subtle.verify('HMAC', await signingKey(env.SESSION_SECRET), fromurl(sig), enc.encode(payload))) return '';
    const claims = JSON.parse(new TextDecoder().decode(fromurl(payload)));
    return claims.exp > Date.now()/1000 && users[claims.sub] ? claims.sub : '';
  } catch { return ''; }
}
export function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Contenido no válido.';
  const limits={historias:1000,mapas:100,recorridos:100,cronologia:500,patrimonio:100};
  for(const [key,max]of Object.entries(limits))if(!Array.isArray(data[key])||data[key].length>max)return 'Lista no válida: '+key;
  for(const key of ['proyecto','portada','participacion','textos'])if(!data[key]||Array.isArray(data[key])||typeof data[key]!=='object')return 'Sección no válida: '+key;
  const fields={historias:['id','titulo','categoria','bajada','texto'],mapas:['titulo','enlace'],recorridos:['titulo','descripcion','enlace'],cronologia:['fecha','titulo','texto'],patrimonio:['titulo','texto'],participacion:['titulo','texto','cita'],proyecto:['titulo','texto','creditos'],portada:['titulo','destacado','presentacion','bienvenidaTitulo','bienvenidaTexto','facebook']};
  const allowed={historias:[...fields.historias,'autor','fecha','imagen','imagenAlt','archivo','fuente','publicado','icono'],mapas:[...fields.mapas,'descripcion','publicado'],recorridos:[...fields.recorridos,'localidades','duracion','distancia','paradas','publicado'],cronologia:fields.cronologia,patrimonio:[...fields.patrimonio,'icono'],participacion:fields.participacion,proyecto:fields.proyecto,portada:[...fields.portada,'notaHistorias','mostrarMapaUbicacion','imagenLogo','imagenPortada']};
  fields.textos=[];allowed.textos=CocinaTextFields.map(x=>x[0]);
  if(Object.keys(data).some(k=>!allowed[k]))return 'Sección desconocida.';
  const ids=new Set();
  for(const [section,required]of Object.entries(fields))for(const item of Array.isArray(data[section])?data[section]:[data[section]]){
    if(!item||typeof item!=='object'||Array.isArray(item))return 'Elemento no válido.';
    for(const [key,value]of Object.entries(item)){
      if(!allowed[section].includes(key))return 'Campo desconocido: '+key;
      if(['publicado','mostrarMapaUbicacion'].includes(key)){if(typeof value!=='boolean')return 'Estado no válido.';}
      else if(typeof value!=='string'||value.length>(key==='texto'?100000:10000))return 'Campo no válido: '+key;
    }
    for(const key of required)if(typeof item[key]!=='string'||!item[key].trim())return 'Falta completar '+key;
    if(section==='historias'){
      if(!/^[\w-]{1,100}$/.test(item.id)||ids.has(item.id))return 'Identificador repetido o no válido.';ids.add(item.id);
      if(item.imagen&&!CocinaMedia.image(item.imagen))return 'Imagen no válida.';
    }
    for(const key of ['archivo','fuente','facebook','enlace'])if(item[key]&&!CocinaMedia.url(item[key]))return 'El enlace debe usar HTTPS.';
    for(const key of ['imagenLogo','imagenPortada'])if(item[key]&&!CocinaMedia.image(item[key]))return 'Enlace de imagen no válido.';
    if(['mapas','recorridos'].includes(section)&&!CocinaMedia.map(item.enlace))return 'Usá un enlace completo de Google My Maps.';
  }
  return '';
}
async function github(env, options={}) {
  return fetch(CONTENT+(options.method?'':'?ref=main'),{...options,headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'La-Cocina-Admin','Content-Type':'application/json'}});
}
export default { async fetch(request, env) {
  const origin=env.SITE_ORIGIN || 'https://lacocinadelahistoria.github.io';
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.headers.get('Origin')!==origin)return reply({error:'Origen no permitido.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!env.GITHUB_TOKEN||!env.SESSION_SECRET||env.SESSION_SECRET.length<32||!env.USERS_JSON||!env.LOGIN_LIMITER)return reply({error:'El servicio de administración todavía no está configurado.'},503);
  try {
    const users=JSON.parse(env.USERS_JSON), route=new URL(request.url).pathname;
    if(route==='/login'&&request.method==='POST'){
      if(!(await env.LOGIN_LIMITER.limit({key:'login:'+request.headers.get('CF-Connecting-IP')})).success)return reply({error:'Demasiados intentos. Esperá un minuto y volvé a intentar.'},429);
      const raw=await request.text();if(raw.length>2000)return reply({error:'Solicitud demasiado grande.'},413);
      const body=JSON.parse(raw), username=typeof body.username==='string'?body.username.toLowerCase():'';
      if(typeof body.password!=='string'||body.password.length>256)return reply({error:'Usuario o contraseña incorrectos.'},401);
      const record=users[username];
      const hash=await passwordHash(body.password,record?.salt||'AAAAAAAAAAAAAAAAAAAAAA==');
      const expected=record?decode64(record.hash):new Uint8Array(32);let diff=hash.length^expected.length;
      for(let i=0;i<hash.length;i++)diff|=hash[i]^(expected[i]||0);
      if(!record||diff)return reply({error:'Usuario o contraseña incorrectos.'},401);
      return reply({token:await issue(username,env),username});
    }
    const username=await session(request,env,users);
    if(!username)return reply({error:'La sesión terminó. Volvé a ingresar; tus cambios siguen en el formulario.'},401);
    if(route!=='/content')return reply({error:'Ruta no disponible.'},404);
    if(request.method==='GET'){
      const r=await github(env);if(!r.ok)return reply({error:'No se pudo leer el contenido del repositorio.'},502);
      const file=await r.json();return reply({sha:file.sha,data:JSON.parse(new TextDecoder().decode(decode64(file.content.replace(/\s/g,''))))});
    }
    if(request.method==='PUT'){
      if(!(await env.LOGIN_LIMITER.limit({key:'save:'+username})).success)return reply({error:'Esperá un minuto antes de volver a guardar.'},429);
      const raw=await request.text();if(enc.encode(raw).length>700000)return reply({error:'El contenido supera el tamaño admitido.'},413);
      const body=JSON.parse(raw);if(!/^[a-f0-9]{40}$/.test(body.sha||''))return reply({error:'Falta la versión del contenido.'},400);
      const error=validate(body.data);if(error)return reply({error},400);
      const content=bytes64(enc.encode(JSON.stringify(body.data,null,2)+'\n'));
      const r=await github(env,{method:'PUT',body:JSON.stringify({message:'Actualizar contenidos desde el panel ('+username+')',content,sha:body.sha,branch:'main'})});
      if(r.status===409||r.status===422)return reply({error:'Otra persona actualizó los contenidos. Conservá tus textos y recargá el panel antes de volver a guardar.'},409);
      if(!r.ok)return reply({error:'No se pudo guardar. Tus cambios siguen en el formulario; intentá nuevamente.'},502);
      const result=await r.json();return reply({sha:result.content.sha,commit:result.commit.sha});
    }
    return reply({error:'Método no permitido.'},405);
  }catch{return reply({error:'No se pudo procesar la solicitud. Verificá los datos o intentá nuevamente.'},400);}
}};
