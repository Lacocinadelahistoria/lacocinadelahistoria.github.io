(function (root) {
  'use strict';
  function url(value) {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u : null; } catch { return null; }
  }
  function driveId(value) {
    const u = url(value);
    if (!u || !['drive.google.com', 'docs.google.com'].includes(u.hostname)) return '';
    const id = u.pathname.match(/\/d\/([\w-]+)/)?.[1] || u.searchParams.get('id') || '';
    return /^[\w-]{10,}$/.test(id) ? id : '';
  }
  function image(value) {
    const id = driveId(value);
    if (id) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1600';
    const u = url(value);
    if (u && !['drive.google.com', 'docs.google.com'].includes(u.hostname)) return u.href;
    return /^\/?assets\/[\w./-]+$/.test(value || '') && !value.includes('..') ? value : '';
  }
  function preview(value) { const id = driveId(value); return id ? 'https://drive.google.com/file/d/' + id + '/preview' : ''; }
  function map(value) {
    const u = url(value);
    if (!u || !['www.google.com', 'google.com'].includes(u.hostname)) return '';
    if (!/^\/maps\/d\/(?:u\/\d+\/)?(?:edit|viewer|embed)\/?$/.test(u.pathname)) return '';
    const mid = u.searchParams.get('mid');
    return mid && /^[\w-]{10,}$/.test(mid) ? 'https://www.google.com/maps/d/embed?mid=' + encodeURIComponent(mid) : '';
  }
  root.CocinaMedia = { url: value => url(value)?.href || '', driveId, image, preview, map };
})(globalThis);
