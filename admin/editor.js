'use strict';
const $ = s => document.querySelector(s);
const labels = {historias:'Publicaciones', mapas:'Mapas', recorridos:'Recorridos', cronologia:'Cronología', patrimonio:'Patrimonio', participacion:'Participación', proyecto:'Quiénes somos', portada:'Portada', textos:'Textos y menús'};
const schemas = {
  historias:[['titulo','Título','text',true],['categoria','Categoría','text',true],['bajada','Presentación breve','textarea',true],['texto','Texto de la publicación','textarea',true],['autor','Autoría','text'],['fecha','Fecha o referencia temporal','text'],['imagen','Enlace de la imagen en Drive o URL de imagen','url'],['imagenAlt','Descripción de la imagen','text'],['archivo','Enlace del PDF o documento en Drive','url'],['fuente','Enlace de la fuente','url'],['publicado','Mostrar en la web','checkbox']],
  mapas:[['titulo','Título del mapa','text',true],['descripcion','Descripción','textarea'],['enlace','Enlace completo de Google My Maps','url',true],['publicado','Mostrar en la web','checkbox']],
  recorridos:[['titulo','Nombre del recorrido','text',true],['descripcion','Presentación del recorrido','textarea',true],['localidades','Localidades o zona del distrito','text'],['duracion','Duración orientativa','text'],['distancia','Distancia orientativa','text'],['paradas','Paradas y sitios históricos, en orden','textarea'],['enlace','Enlace completo del recorrido en Google My Maps','url',true],['publicado','Mostrar en la web','checkbox']],
  cronologia:[['fecha','Fecha o período','text',true],['titulo','Título','text',true],['texto','Descripción','textarea',true]],
  patrimonio:[['titulo','Título','text',true],['texto','Descripción','textarea',true],['icono','Símbolo o ícono','text']],
  participacion:[['titulo','Título','text',true],['texto','Invitación a participar','textarea',true],['cita','Frase destacada','textarea',true]],
  proyecto:[['titulo','Título de la sección','text',true],['texto','Presentación del proyecto','textarea',true],['creditos','Créditos del pie de página','text',true]],
  portada:[['titulo','Título principal','text',true],['destacado','Frase destacada','text',true],['presentacion','Presentación','textarea',true],['bienvenidaTitulo','Título de bienvenida','text',true],['bienvenidaTexto','Texto de bienvenida','textarea',true],['notaHistorias','Nota debajo de las publicaciones','textarea'],['facebook','Enlace de Facebook','url',true],['imagenLogo','Enlace de imagen para el logo (opcional)','url'],['imagenPortada','Enlace de imagen de portada (opcional)','url'],['mostrarMapaUbicacion','Mostrar el mapa de ubicación de Baradero','checkbox']],
  textos:CocinaTextFields.map(([key,label])=>[key,label,'textarea'])
};
let data, sha='', api='', token='', active='historias', selected=0, dirty=false, busy=false, textGroup='Menús', pendingRemoval=null;
function group(label,key) { return key.startsWith('menu')?'Menús':label.includes(':')?label.split(':')[0]:'Identidad y buscadores'; }
function status(message) { $('#status').textContent=message; }
function current() { return Array.isArray(data[active]) ? data[active][selected] : data[active]; }
function controls() { const enabled=!!token && !busy; $('#fields').disabled=!enabled; $('#add').disabled=!enabled; $('#remove').disabled=!enabled || !current(); $('#save').disabled=!enabled || !dirty; }
function changed() { dirty=true; controls(); $('#session').textContent='Cambios sin guardar'; }
function render() {
  $('#sectionTitle').textContent=labels[active];
  $('#textGroupLabel').hidden=active!=='textos';
  if(active==='textos'){
    $('#textGroup').replaceChildren();
    for(const name of new Set(schemas.textos.map(([key,label])=>group(label,key)))){const option=document.createElement('option');option.value=name;option.textContent=name;$('#textGroup').append(option);}
    $('#textGroup').value=textGroup;
  }
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===active));
  const list=Array.isArray(data[active]); $('#add').hidden=!list; $('#remove').hidden=!list; $('#add').textContent=active==='recorridos'?'Agregar recorrido':active==='mapas'?'Agregar mapa':active==='cronologia'?'Agregar acontecimiento':active==='patrimonio'?'Agregar elemento':'Agregar publicación';
  $('#sectionHelp').textContent=active==='recorridos'?'Creá una ruta histórica con sus paradas. Pegá el enlace de My Maps donde trazaste el recorrido y verificá que permita acceso público.':active==='historias'?'Escribí el artículo y pegá los enlaces de Drive. Revisá los permisos de los archivos antes de publicarlos.':active==='mapas'?'Pegá un mapa de Google My Maps. Las pinchetas, imágenes y textos se administran en My Maps.':'Editá los campos y luego guardá los cambios.';
  $('#items').replaceChildren(); $('#fields').replaceChildren();
  if(list) data[active].forEach((x,i)=>{const b=document.createElement('button'); b.type='button'; b.textContent=x.titulo||'Sin título'; b.setAttribute('aria-pressed',i===selected); b.onclick=()=>{selected=i;render();};$('#items').append(b);});
  $('#items').hidden=!list;
  const item=current() || (!token ? {} : null); if(!item){const p=document.createElement('p');p.textContent='Todavía no hay elementos. Usá el botón Agregar para crear uno.';p.className='empty';$('#fields').append(p);controls();return;}
  for(const [key,label,type,required] of schemas[active]) {
    if(active==='textos'&&group(label,key)!==textGroup)continue;
    const wrap=document.createElement('label'); wrap.textContent=label;
    const input=document.createElement(type==='textarea'?'textarea':'input'); if(type!=='textarea')input.type=type;
    input.id='field-'+key; input.name=key; input.required=!!required; input.maxLength=type==='textarea'?100000:2000;
    if(type==='checkbox')input.checked=item[key]===true; else input.value=item[key]||'';
    input.addEventListener('input',()=>{item[key]=type==='checkbox'?input.checked:input.value;if(key==='titulo'&&Array.isArray(data[active]))$('#items').children[selected].textContent=input.value||'Sin título';changed();});
    wrap.append(input);
    if(['imagen','archivo','enlace'].includes(key)) { const hint=document.createElement('small');hint.textContent=key==='enlace'?'Usá el enlace de My Maps, no el código HTML ni un enlace corto.':'El archivo debe permitir acceso público. No es necesario subirlo a GitHub.';wrap.append(hint); }
    $('#fields').append(wrap);
  }
  if(item.imagen && CocinaMedia.image(item.imagen)){const img=document.createElement('img');img.src=CocinaMedia.image(item.imagen);img.alt=item.imagenAlt||'Vista de la imagen';img.className='media-preview';img.referrerPolicy='no-referrer';$('#fields').append(img);}
  for(const value of [item.archivo,item.enlace]) if(CocinaMedia.url(value)){const a=document.createElement('a');a.href=value;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Comprobar archivo o mapa ↗';a.className='preview-link';$('#fields').append(a);}
  controls();
}
async function request(route,options={}) {
  const r=await fetch(api+route,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...options.headers}});
  const body=await r.json().catch(()=>({error:'Respuesta no válida del servicio.'}));
  if(!r.ok){if(r.status===401){token='';$('#loginArea').hidden=false;$('#logout').hidden=true;controls();}throw Error(body.error||'No se pudo completar la operación.');}return body;
}
function validateAll() {
  for(const [section,fields] of Object.entries(schemas))for(const item of Array.isArray(data[section])?data[section]:[data[section]]){
    for(const [key,label,type,required] of fields){const value=item[key];if(required&&!String(value||'').trim())throw Error(labels[section]+': completá '+label+'.');if(type==='url'&&value&&!CocinaMedia.url(value))throw Error(labels[section]+': '+label+' debe ser un enlace HTTPS completo.');}
    if(['mapas','recorridos'].includes(section)&&!CocinaMedia.map(item.enlace))throw Error('El mapa o recorrido necesita un enlace completo de Google My Maps con su identificador mid.');
    if(section==='historias'&&item.imagen&&!CocinaMedia.image(item.imagen))throw Error('El enlace de imagen no es válido.');
  }
}
$('#tabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(b){active=b.dataset.tab;selected=0;render();}};
$('#textGroup').onchange=()=>{textGroup=$('#textGroup').value;render();};
$('#add').onclick=()=>{const item={};for(const [key,,type]of schemas[active])item[key]=type==='checkbox'?false:'';if(active==='historias')item.id=crypto.randomUUID();data[active].push(item);selected=data[active].length-1;changed();render();};
$('#editor').onsubmit=e=>e.preventDefault();
$('#remove').onclick=()=>{const item=current();if(!Array.isArray(data[active])||!item)return;pendingRemoval={section:active,index:selected};$('#deleteTitle').textContent='¿Eliminar “'+(item.titulo||'Sin título')+'”?';$('#deleteDialog').showModal();};
$('#cancelDelete').onclick=()=>{$('#deleteDialog').close();pendingRemoval=null;};
$('#confirmDelete').onclick=()=>{if(!pendingRemoval)return;const {section,index}=pendingRemoval;data[section].splice(index,1);selected=Math.max(0,index-1);pendingRemoval=null;$('#deleteDialog').close();changed();render();status('Elemento eliminado del formulario. Guardá los cambios para quitarlo de la web.');};
$('#loginForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{
  const auth=await request('/login',{method:'POST',body:JSON.stringify({username:$('#username').value.trim(),password:$('#password').value})});token=auth.token;$('#password').value='';
  if(!dirty){const content=await request('/content');data=content.data;sha=content.sha;}
  $('#loginArea').hidden=true;$('#logout').hidden=false;$('#session').textContent=dirty?'Cambios sin guardar · '+auth.username:'Sesión de '+auth.username;status(dirty?'Sesión restablecida. Se conservaron los cambios que estabas editando.':'Sesión iniciada. Podés editar y publicar.');render();
}catch(error){token='';controls();status(error.message);}finally{button.disabled=false;}};
$('#logout').onclick=()=>{if(dirty&&!confirm('Hay cambios sin guardar. ¿Querés cerrar sesión y descartarlos?'))return;token='';dirty=false;location.reload();};
$('#save').onclick=async()=>{try{
  validateAll();busy=true;controls();status('Guardando los contenidos…');
  const result=await request('/content',{method:'PUT',body:JSON.stringify({data,sha})});sha=result.sha;dirty=false;$('#session').textContent='Cambios guardados';status('Cambios guardados. GitHub Pages está actualizando la web; puede tardar unos minutos.');
}catch(error){status(error.message);}finally{busy=false;controls();}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
Promise.all([fetch('config.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('config');return r.json();}),fetch('../data/contenido.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('data');return r.json();})]).then(([config,content])=>{
  data=content;let endpoint=CocinaMedia.url(config.apiBase);
  if(!endpoint && ['localhost','127.0.0.1'].includes(location.hostname)) { try { const local=new URL(config.apiBase); if(local.origin===location.origin)endpoint=local.href; } catch {} }
  api=endpoint?endpoint.replace(/\/$/,''):'';
  if(api){$('#loginArea').hidden=false;status('Ingresá con tu usuario para editar. Los contenidos se muestran en modo consulta hasta iniciar sesión.');}else{status('Panel preparado · acceso pendiente de activación. Podés consultar los contenidos y los campos. El ingreso y la publicación se habilitarán al conectar el servicio de administración.');}
  render();
}).catch(()=>status('No se pudo cargar el panel. Intentá recargar la página.'));
