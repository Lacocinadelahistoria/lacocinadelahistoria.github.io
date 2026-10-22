import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker, {validate,passwordHash} from './worker.mjs';
const content=JSON.parse(await readFile(new URL('../../data/contenido.json',import.meta.url),'utf8'));
assert.equal(validate(content),'');
assert.equal(CocinaMedia.image('javascript:alert(1)'),'');
assert.equal(CocinaMedia.image('https://drive.google.com/drive/folders/abcdefghijk'),'');
assert.equal(CocinaMedia.map('https://evil.example/maps/d/embed?mid=abcdefghijkl'),'');
assert.equal(CocinaMedia.map('https://www.google.com/maps/d/u/0/edit?mid=abcdefghijkl'),'https://www.google.com/maps/d/embed?mid=abcdefghijkl');
assert.equal(CocinaMedia.preview('https://drive.google.com/file/d/abcdefghijk/view'),'https://drive.google.com/file/d/abcdefghijk/preview');
let bad=structuredClone(content);bad.historias[0].archivo='javascript:alert(1)';assert.notEqual(validate(bad),'');
bad=structuredClone(content);bad.historias[1].id=bad.historias[0].id;assert.notEqual(validate(bad),'');
const salt=btoa('1234567890123456');
const hash=btoa(String.fromCharCode(...await passwordHash('test-password-only',salt)));
const env={GITHUB_TOKEN:'test-only',SESSION_SECRET:'test-only-secret-at-least-thirty-two-characters',USERS_JSON:JSON.stringify({tester:{salt,hash}}),LOGIN_LIMITER:{limit:async()=>({success:true})}};
function req(route,method,body,bearer,origin='https://lacocinadelahistoria.github.io'){
  return new Request('https://admin.test'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},...(body?{body:JSON.stringify(body)}:{})});
}
assert.equal((await worker.fetch(req('/content','GET'),env)).status,401);
assert.equal((await worker.fetch(req('/content','GET',null,null,'https://evil.example'),env)).status,403);
assert.equal((await worker.fetch(req('/login','POST',{username:'tester',password:'wrong'}),env)).status,401);
const login=await worker.fetch(req('/login','POST',{username:'tester',password:'test-password-only'}),env);
assert.equal(login.status,200);const auth=await login.json();
const originalFetch=globalThis.fetch;let savedPayload;
try{
  globalThis.fetch=async(u,opt)=>{
    if(opt.method==='PUT'){
      savedPayload=JSON.parse(opt.body);
      return Response.json({content:{sha:'b'.repeat(40)},commit:{sha:'c'.repeat(40)}});
    }
    return Response.json({sha:'a'.repeat(40),content:Buffer.from(JSON.stringify(content)).toString('base64')});
  };
  const read=await worker.fetch(req('/content','GET',null,auth.token),env);
  assert.equal(read.status,200);assert.equal((await read.json()).data.historias.length,4);
  const saved=await worker.fetch(req('/content','PUT',{data:content,sha:'a'.repeat(40)},auth.token),env);
  assert.equal(saved.status,200);assert.equal(savedPayload.branch,'main');assert.ok(savedPayload.message.includes('tester'));
  globalThis.fetch=async()=>new Response('{}',{status:409});
  assert.equal((await worker.fetch(req('/content','PUT',{data:content,sha:'a'.repeat(40)},auth.token),env)).status,409);
  assert.equal((await worker.fetch(req('/content','GET',null,auth.token+'tampered'),env)).status,401);
  assert.equal((await worker.fetch(req('/login','POST',{username:'tester',password:'test-password-only'}),{...env,LOGIN_LIMITER:{limit:async()=>({success:false})}})).status,429);
}finally{globalThis.fetch=originalFetch;}
console.log('PASS: media, schema, login, origin, signatures, authenticated read/write, conflicts and rate limit');
