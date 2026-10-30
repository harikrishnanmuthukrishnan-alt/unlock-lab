import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../server.js';
async function withServer(fn){await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await fn(`http://127.0.0.1:${server.address().port}`)}finally{await new Promise(r=>server.close(r))}}
test('serves real platform, avoids demo login and fails closed without DB configuration',async()=>withServer(async base=>{
 let r=await fetch(base+'/');assert.equal(r.status,200);const html=await r.text();assert.match(html,/UNLOCK Lab/);
 r=await fetch(base+'/app.js');assert.equal(r.status,200);assert.match(await r.text(),/Sign up|Sign in/);
 r=await fetch(base+'/healthz');assert.equal(r.status,200);let health=await r.json();assert.equal(health.mode,'production');assert.equal(health.configured,false);
 r=await fetch(base+'/api/bootstrap');assert.equal(r.status,503);
 r=await fetch(base+'/api/demo-login',{method:'POST',headers:{'Content-Type':'application/json','x-unlock-client':'platform'},body:'{}'});assert.equal(r.status,503);
 r=await fetch(base+'/../../package.json');assert.equal(r.status,404);
}));
