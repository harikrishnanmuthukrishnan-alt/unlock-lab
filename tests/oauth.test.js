import test from 'node:test';
import assert from 'node:assert/strict';
const prior={...process.env};
process.env.NODE_ENV='test';
process.env.COOKIE_SECURE='true';
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
process.env.GOOGLE_AUTH_ENABLED='true';
process.env.PUBLIC_URL='https://unlock-lab-platform.onrender.com';
const {server}=await import('../server.js?oauth-test');
Object.assign(process.env,prior);
for(const key of ['GOOGLE_AUTH_ENABLED','SUPABASE_URL','PUBLIC_URL','SUPABASE_PUBLISHABLE_KEY'])if(!(key in prior))delete process.env[key];
async function withServer(fn){await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await fn(`http://127.0.0.1:${server.address().port}`)}finally{await new Promise(r=>server.close(r))}}
test('OAuth initiation sets private, secure PKCE cookies and restrictive redirect',async()=>withServer(async base=>{
 const r=await fetch(base+'/auth/google/start',{redirect:'manual'});
 assert.equal(r.status,303);const to=new URL(r.headers.get('location'));assert.equal(to.origin,'https://example.supabase.co');assert.equal(to.pathname,'/auth/v1/authorize');assert.equal(to.searchParams.get('provider'),'google');assert.equal(to.searchParams.get('code_challenge_method'),'s256');
 assert.equal(to.searchParams.get('code_challenge').length,43);const callback=new URL(to.searchParams.get('redirect_to'));assert.equal(callback.origin,'https://unlock-lab-platform.onrender.com');assert.equal(callback.pathname,'/auth/google/callback');
 const cookies=r.headers.getSetCookie().join(' ');assert.match(cookies,/HttpOnly/);assert.match(cookies,/Secure/);assert.match(cookies,/SameSite=Lax/);assert.doesNotMatch(cookies,/access_token/);
}));
test('Forged OAuth callbacks do not create sessions',async()=>withServer(async base=>{
 const r=await fetch(base+'/auth/google/callback?code=fake-code&state=fake-state',{redirect:'manual'});
 assert.equal(r.status,303);assert.match(r.headers.get('location'),/auth_error=google/);assert.doesNotMatch(r.headers.getSetCookie().join(' '),/ul_access=/);
}));
