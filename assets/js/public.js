'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs = s => String(s || '').split(/\n\s*\n/).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
let historias = [], filtro = 'Todas';
function imgTag(x) {
  const src = CocinaMedia.image(x.imagen || x.image || '');
  return src ? `<img class="card-image" src="${esc(src)}" alt="${esc(x.imagenAlt || '')}" loading="lazy" referrerpolicy="no-referrer">` : `<div class="card-image illustrated"><span>${esc(x.icono || '✦')}</span><small>LA COCINA DE LA HISTORIA</small></div>`;
}
function render() {
  const categorias = ['Todas', ...new Set(historias.map(x => x.categoria))];
  $('#filters').innerHTML = categorias.map(c => `<button class="filter ${filtro === c ? 'selected' : ''}" data-category="${esc(c)}" aria-pressed="${filtro === c}">${esc(c)}</button>`).join('');
  $('#stories').innerHTML = historias.filter(x => filtro === 'Todas' || x.categoria === filtro).map(x => `<article class="story-card">${imgTag(x)}<div class="card-body"><span class="tag">${esc(x.categoria)}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.bajada)}</p><button class="read" data-id="${esc(x.id)}">Leer historia →</button></div></article>`).join('') || '<p>Todavía no hay publicaciones en esta categoría.</p>';
}
function openStory(id) {
  const x = historias.find(a => a.id === id); if (!x) return;
  const file = CocinaMedia.url(x.archivo), preview = CocinaMedia.preview(x.archivo), source = CocinaMedia.url(x.fuente);
  $('#dialogContent').innerHTML = `<span class="eyebrow dark">${esc(x.categoria)} · ${esc(x.fecha)}</span><h2>${esc(x.titulo)}</h2>${x.autor ? '<p>Por ' + esc(x.autor) + '</p>' : ''}${CocinaMedia.image(x.imagen || x.image || '') ? imgTag(x) : ''}<p class="lead">${esc(x.bajada)}</p>${paragraphs(x.texto)}${preview ? `<iframe class="document-frame" title="Documento adjunto: ${esc(x.titulo)}" src="${esc(preview)}" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups" referrerpolicy="no-referrer"></iframe>` : ''}${file ? `<p><a class="btn primary" href="${esc(file)}" target="_blank" rel="noopener noreferrer">Abrir archivo ↗</a></p>` : ''}${source ? `<p><a href="${esc(source)}" target="_blank" rel="noopener noreferrer">Consultar fuente ↗</a></p>` : ''}`;
  $('#storyDialog').showModal();
}
function search() {
  const q = $('#search').value.toLocaleLowerCase('es').trim();
  if (!q) { $('#searchResults').innerHTML = ''; return; }
  const matches = historias.filter(x => [x.titulo, x.bajada, x.texto, x.categoria, x.autor].join(' ').toLocaleLowerCase('es').includes(q));
  $('#searchResults').innerHTML = `<p>${matches.length} resultado(s)</p>` + matches.map(x => `<button class="result" data-id="${esc(x.id)}">${esc(x.titulo)} →</button>`).join('');
}
function renderData(data) {
  if(data.textos) for(const [key,,selector,attribute]of CocinaTextFields) if(typeof data.textos[key]==='string')document.querySelectorAll(selector).forEach(element=>{if(attribute)element.setAttribute(attribute,data.textos[key]);else element.textContent=data.textos[key];});
  historias = (data.historias || []).filter(x => x.publicado === true);
  render(); search();
  $('#timeline').innerHTML = (data.cronologia || []).map(x => `<article class="time-item"><strong>${esc(x.fecha)}</strong><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></article>`).join('');
  const project = data.proyecto;
  if (project) { $('#quienes-somos-titulo').textContent = project.titulo; $('#projectText').innerHTML = paragraphs(project.texto); $('#projectCredits').textContent = project.creditos; }
  const front = data.portada;
  if (front) {
    $('#heroTitle').innerHTML = esc(front.titulo) + ' <em>' + esc(front.destacado) + '</em>';
    $('#heroText').textContent = front.presentacion; $('#welcomeTitle').textContent = front.bienvenidaTitulo; $('#welcomeText').textContent = front.bienvenidaTexto; $('#storiesNote').textContent = front.notaHistorias;
    const facebook = CocinaMedia.url(front.facebook); if (facebook) document.querySelectorAll('[data-facebook]').forEach(a => a.href = facebook);
    $('#locationMap').hidden=front.mostrarMapaUbicacion===false;
    if(CocinaMedia.image(front.imagenLogo||''))$('.brand img').src=CocinaMedia.image(front.imagenLogo);
    if(CocinaMedia.image(front.imagenPortada||''))$('.art-circle img').src=CocinaMedia.image(front.imagenPortada);
  }
  if(data.patrimonio) $('#heritageItems').innerHTML = data.patrimonio.map(x => `<article><span class="big-icon">${esc(x.icono || '✦')}</span><h3>${esc(x.titulo)}</h3>${paragraphs(x.texto)}</article>`).join('');
  if(data.participacion) { $('#participateTitle').textContent=data.participacion.titulo; $('#participateText').textContent=data.participacion.texto; $('#participateQuote').textContent=data.participacion.cita; }
  const maps = (data.mapas || []).filter(x => x.publicado === true && CocinaMedia.map(x.enlace));
  $('#managedMaps').innerHTML = maps.map(x => `<article class="managed-map"><h3>${esc(x.titulo)}</h3>${paragraphs(x.descripcion)}<iframe class="map-frame" title="${esc(x.titulo)}" src="${esc(CocinaMedia.map(x.enlace))}" loading="lazy" referrerpolicy="no-referrer"></iframe><p><a class="btn primary" href="${esc(CocinaMedia.url(x.enlace))}" target="_blank" rel="noopener noreferrer">Ampliar mapa ↗</a></p></article>`).join('');
  $('#mapsPlaceholder').hidden = maps.length > 0;
  const routes=(data.recorridos||[]).filter(x=>x.publicado===true && CocinaMedia.map(x.enlace));
  $('#managedRoutes').innerHTML=routes.map(x=>`<article class="managed-map route-card"><h3>${esc(x.titulo)}</h3>${x.localidades?'<p class="tag">'+esc(x.localidades)+'</p>':''}${paragraphs(x.descripcion)}${x.duracion||x.distancia?'<p>'+[x.duracion&&'Duración orientativa: '+esc(x.duracion),x.distancia&&'Distancia orientativa: '+esc(x.distancia)].filter(Boolean).join(' · ')+'</p>':''}${x.paradas?'<h4>Paradas del recorrido</h4><ol>'+x.paradas.split(/\n/).filter(p=>p.trim()).map(p=>'<li>'+esc(p)+'</li>').join('')+'</ol>':''}<iframe class="map-frame" title="Recorrido: ${esc(x.titulo)}" src="${esc(CocinaMedia.map(x.enlace))}" loading="lazy" referrerpolicy="no-referrer"></iframe><p><a class="btn primary" href="${esc(CocinaMedia.url(x.enlace))}" target="_blank" rel="noopener noreferrer">Abrir recorrido en My Maps ↗</a></p></article>`).join('');
  $('#routesPlaceholder').hidden=routes.length>0;
}
document.addEventListener('click', e => {
  const f = e.target.closest('[data-category]'); if (f) { filtro = f.dataset.category; render(); }
  const r = e.target.closest('[data-id]'); if (r) openStory(r.dataset.id);
});
document.addEventListener('error', e => { if (e.target.matches?.('img.card-image')) { const note = document.createElement('p'); note.className = 'note'; note.textContent = 'No se pudo cargar la imagen. Si está en Drive, verificá que el archivo permita acceso público.'; e.target.replaceWith(note); } }, true);
$('#closeDialog').onclick = () => $('#storyDialog').close();
$('#storyDialog').onclick = e => { if (e.target.id === 'storyDialog') e.target.close(); };
$('#menuToggle').onclick = () => { const open = $('#menu').classList.toggle('open'); $('#menuToggle').setAttribute('aria-expanded', open); };
document.querySelectorAll('#menu a').forEach(a => a.onclick = () => { $('#menu').classList.remove('open'); $('#menuToggle').setAttribute('aria-expanded', 'false'); });
$('#search').addEventListener('input', search); $('#searchBtn').onclick = search;
$('#year').textContent = new Date().getFullYear();
fetch('data/contenido.json', {cache:'no-cache'}).then(r => { if (!r.ok) throw Error('content'); return r.json(); }).then(renderData).catch(() => {
  renderData({historias:HISTORIAS.map(x => ({...x, publicado:true})), cronologia:CRONOLOGIA});
  const note = document.createElement('p'); note.className = 'note'; note.textContent = 'No se pudo actualizar el archivo. Se muestran los contenidos iniciales; intentá recargar la página.'; $('#stories').before(note);
});
