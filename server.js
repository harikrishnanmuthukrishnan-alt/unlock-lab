/** UNLOCK Lab Platform API. Real email login, scoped Supabase RLS and atomic SQL actions.
 * Never uses the service-role key; PostgREST receives only a user-scoped JWT.
 */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import {isEmail,checkPassword,parseSlot,validateAction,securityHeaders} from './validate.js';
import {askNvidia,aiConfigured,aiRateLimit,validateQuestion} from './ai.js';
const basedir=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(basedir,'public');
const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.SUPABASE_PUBLISHABLE_KEY||'';
const configured=!!(url.startsWith('https://') && key.length>12);
const publicUrl=process.env.PUBLIC_URL||`http://localhost:${process.env.PORT||3000}`;
const googleEnabled=process.env.GOOGLE_AUTH_ENABLED==='true';
const authAttempts=new Map();
function authRate(req){const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();const now=Date.now();const hits=(authAttempts.get(ip)||[]).filter(t=>now-t<900000);hits.push(now);authAttempts.set(ip,hits);if(authAttempts.size>5000){for(const [k,a] of authAttempts)if(a.at(-1)<now-900000)authAttempts.delete(k);}return hits.length<=20;}
const port=Number(process.env.PORT||3000);
const secure=process.env.COOKIE_SECURE==='true'||process.env.NODE_ENV==='production';
const sameOrigin=(req)=>{
 const origin=req.headers.origin;if(!origin)return true;
 try{return new URL(origin).host===req.headers.host && new URL(origin).protocol===(secure?'https:':'http:');}catch{return false;}
};
function reply(res,status,body,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...securityHeaders,...headers});res.end(JSON.stringify(body));}
function cookieValues(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(v=>v.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));}
function setSession(res,session){
 const opts=`HttpOnly; SameSite=Lax; Path=/; ${secure?'Secure; ':''}`;
 res.setHeader('Set-Cookie',[
 `ul_access=${encodeURIComponent(session.access_token)}; Max-Age=${Math.max(60,Math.min(3600,session.expires_in||3600))}; ${opts}`,
 `ul_refresh=${encodeURIComponent(session.refresh_token)}; Max-Age=${30*86400}; ${opts}`]);
}
function clearSession(res){res.setHeader('Set-Cookie',['ul_access=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax','ul_refresh=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax']);}
function authTempCookie(name,value,age=600){return `${name}=${value}; Max-Age=${age}; HttpOnly; SameSite=Lax; Path=/auth/google; ${secure?'Secure; ':''}`;}
function clearAuthTemp(res){res.setHeader('Set-Cookie',[authTempCookie('ul_oauth_state','',0),authTempCookie('ul_oauth_verifier','',0)]);}
function redirect(res,where,headers={}){res.writeHead(303,{'Location':where,'Cache-Control':'no-store',...securityHeaders,...headers});res.end();}
function oauthCallbackUrl(state){const u=new URL('/auth/google/callback',publicUrl);u.searchParams.set('state',state);return u.toString();}
function safeOAuthCookieEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length||a.length<20)return false;return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
async function body(req,max=16000){let size=0;const chunks=[];for await (const b of req){size+=b.length;if(size>max)throw Object.assign(new Error('Request too large'),{status:413});chunks.push(b);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}catch{throw Object.assign(new Error('Invalid JSON'),{status:400})}}
async function upstream(route,method='GET',token='',payload,extraHeaders={}){
 const headers={'apikey':key,'Accept':'application/json',...(token?{'Authorization':`Bearer ${token}`}:{}),...extraHeaders};
 let requestBody=payload;
 if(payload!==undefined && !(payload instanceof Uint8Array) && !Buffer.isBuffer(payload)){headers['Content-Type']='application/json';requestBody=JSON.stringify(payload)}
 const r=await fetch(url+route,{method,headers,body:requestBody,signal:AbortSignal.timeout(14000)});
 const txt=await r.text();let parsed;try{parsed=JSON.parse(txt)}catch{parsed=txt}
 if(!r.ok){let e=new Error(typeof parsed==='object'?(parsed?.msg||parsed?.message||parsed?.error_description||parsed?.error||'Request rejected'):'Request rejected');e.status=r.status;throw e;}
 return parsed;
}
async function identify(req,res){
 let {ul_access:token,ul_refresh:refresh}=cookieValues(req);
 if(!token)return null;
 try{const user=await upstream('/auth/v1/user','GET',token);return {user,token}}catch(e){
  if(!refresh)return null;
  try{const renewed=await upstream('/auth/v1/token?grant_type=refresh_token','POST','',{refresh_token:refresh});setSession(res,renewed);const user=await upstream('/auth/v1/user','GET',renewed.access_token);return {user,token:renewed.access_token};}catch{return null;}
 }
}
function safeError(res,e){reply(res,e.status>=400&&e.status<500?e.status:500,{error:e.status>=500?'Service temporarily unavailable':e.message})}
const q=(s)=>encodeURIComponent(s);
function assertLogin(identity){if(!identity||!identity.user?.email_confirmed_at)throw Object.assign(new Error('Sign in and verify your email first'),{status:401});}
function preventAbuse(req,res){if(!sameOrigin(req)||req.headers['x-unlock-client']!=='platform'||!['application/json','image/jpeg','image/png','image/webp'].some(t=>(req.headers['content-type']||'').startsWith(t))){reply(res,403,{error:'Request origin or content type denied'});return false;}return true;}
async function bootstrap(identity){const token=identity.token;
 const get=async(table,filter='')=>upstream(`/rest/v1/${table}?select=*${filter}`,'GET',token);
 const [profile,organizations,resources,bookings,certifications,training_requests,incidents,events,notifications,photos]=await Promise.all([
  get('profiles',`&id=eq.${q(identity.user.id)}`),get('organizations','&order=created_at.desc&limit=100'),get('resources','&order=created_at.desc&limit=200'),get('bookings','&order=created_at.desc&limit=200'),get('certifications','&limit=200'),get('training_requests','&order=created_at.desc&limit=200'),get('incidents','&order=created_at.desc&limit=100'),get('audit_events','&order=created_at.desc&limit=100'),get('notifications','&order=created_at.desc&limit=60'),get('booking_photos','&limit=100')]);
 return {user:{id:identity.user.id,email:identity.user.email,profile:profile[0]||null},organizations,resources,bookings,certifications,training_requests,incidents,events,notifications,photos,production:true};}
const rpcActions={
 createOrganization:'create_organization',approveOrganization:'approve_organization',createResource:'create_resource',requestTraining:'request_training',reviewTraining:'review_training',createBooking:'create_booking',decideBooking:'decide_booking',cancelBooking:'cancel_booking',checkin:'checkin_booking',checkout:'checkout_booking',confirmReturn:'confirm_return',reportIncident:'report_incident',resolveIncident:'resolve_incident',rotatePin:'rotate_resource_pin',attachPhoto:'attach_booking_photo'
};
async function handler(req,res){
 const incoming=new URL(req.url,'http://localhost');
 const pathname=incoming.pathname;
 if(pathname==='/healthz')return reply(res,200,{ok:true,configured,mode:'production',database:'Supabase'});
 if(pathname==='/api/config'&&req.method==='GET')return reply(res,200,{googleEnabled:configured&&googleEnabled,aiEnabled:configured&&aiConfigured()});
 if(pathname==='/auth/google/start'&&req.method==='GET'){
  if(!configured||!googleEnabled)return redirect(res,'/?auth_error=google_not_ready');
  const state=crypto.randomBytes(24).toString('base64url');const verifier=crypto.randomBytes(48).toString('base64url');
  const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
  const authUrl=new URL(url+'/auth/v1/authorize');authUrl.searchParams.set('provider','google');
  authUrl.searchParams.set('redirect_to',oauthCallbackUrl(state));authUrl.searchParams.set('code_challenge',challenge);authUrl.searchParams.set('code_challenge_method','s256');
  res.setHeader('Set-Cookie',[authTempCookie('ul_oauth_state',state),authTempCookie('ul_oauth_verifier',verifier)]);return redirect(res,authUrl.toString());
 }
 if(pathname==='/auth/google/callback'&&req.method==='GET'){
  const cookies=cookieValues(req);const state=incoming.searchParams.get('state'),code=incoming.searchParams.get('code');
  if(!googleEnabled||!safeOAuthCookieEqual(state,cookies.ul_oauth_state)||!cookies.ul_oauth_verifier||!code||code.length>2048){clearAuthTemp(res);return redirect(res,'/?auth_error=google');}
  try{const session=await upstream('/auth/v1/token?grant_type=pkce','POST','',{auth_code:code,code_verifier:cookies.ul_oauth_verifier});
   if(!session.access_token||!session.refresh_token)throw Error('No session');
   const user=await upstream('/auth/v1/user','GET',session.access_token);if(!user?.email_confirmed_at)throw Error('Email not confirmed');
   setSession(res,session);const sessionCookies=res.getHeader('Set-Cookie');res.setHeader('Set-Cookie',[...sessionCookies,authTempCookie('ul_oauth_state','',0),authTempCookie('ul_oauth_verifier','',0)]);return redirect(res,'/?google=ok');
  }catch{clearAuthTemp(res);return redirect(res,'/?auth_error=google');}
 }
 if(pathname.startsWith('/api/')){
  if(!configured)return reply(res,503,{error:'Production database has not been configured yet. This is not the public demo.'});
  if(req.method==='POST' && !preventAbuse(req,res))return;
  try{
   if(pathname==='/api/catalog'&&req.method==='GET'){const [resources,organizations]=await Promise.all([upstream('/rest/v1/resources?select=*&status=eq.active&order=created_at.desc&limit=100'),upstream('/rest/v1/organizations?select=*&status=eq.active&limit=100')]);return reply(res,200,{resources,organizations});}
   if(['/api/signup','/api/login','/api/reset-password'].includes(pathname)&&req.method==='POST'&&!authRate(req))return reply(res,429,{error:'Too many authentication attempts. Try again later.'});
   if(pathname==='/api/signup'&&req.method==='POST'){
    const v=await body(req);if(!isEmail(v.email)||!checkPassword(v.password)||String(v.name||'').trim().length<2)return reply(res,400,{error:'Use a valid email, a 12+ character password, and your full name.'});
    await upstream('/auth/v1/signup','POST','',{email:v.email.trim().toLowerCase(),password:v.password,data:{full_name:String(v.name).trim().slice(0,80)}});
    return reply(res,200,{message:'Registration submitted. Verify your email using the message from UNLOCK Lab, then sign in.'});
   }
   if(pathname==='/api/login'&&req.method==='POST'){
    const v=await body(req);if(!isEmail(v.email)||typeof v.password!=='string')return reply(res,400,{error:'Invalid email or password'});
    const s=await upstream('/auth/v1/token?grant_type=password','POST','',{email:v.email.trim().toLowerCase(),password:v.password});if(!s.access_token)return reply(res,403,{error:'Complete email verification before signing in.'});setSession(res,s);return reply(res,200,{message:'Welcome to UNLOCK Lab.'});
   }
   if(pathname==='/api/logout'&&req.method==='POST'){const {ul_access}=cookieValues(req);if(ul_access)await upstream('/auth/v1/logout','POST',ul_access).catch(()=>{});clearSession(res);return reply(res,200,{message:'Signed out'});}
   if(pathname==='/api/finish-recovery'&&req.method==='POST'){const v=await body(req);if(!checkPassword(v.password)||typeof v.recoveryToken!=='string'||v.recoveryToken.length<30)return reply(res,400,{error:'Invalid recovery request'});await upstream('/auth/v1/user','PUT',v.recoveryToken,{password:v.password});return reply(res,200,{message:'Password updated. Please sign in.'});}
   if(pathname==='/api/reset-password'&&req.method==='POST'){
    const v=await body(req);if(!isEmail(v.email))return reply(res,400,{error:'Enter a valid email'});
    await upstream('/auth/v1/recover','POST','',{email:v.email.trim().toLowerCase()});return reply(res,200,{message:'If this account exists, a recovery email has been sent.'});
   }
   const identity=await identify(req,res);assertLogin(identity);
   if(pathname==='/api/bootstrap'&&req.method==='GET')return reply(res,200,await bootstrap(identity));
   if(pathname==='/api/ai/chat'&&req.method==='POST'){
    if(!aiConfigured())return reply(res,503,{error:'LabMate AI will be available after the NVIDIA API key is configured.'});
    const input=await body(req,14000);if(!validateQuestion(input.question))return reply(res,400,{error:'Ask a question between 2 and 1800 characters'});
    if(!aiRateLimit(identity.user.id))return reply(res,429,{error:'You have reached the chat limit. Please try later.'});
    const [resources,organizations]=await Promise.all([
     upstream('/rest/v1/resources?select=id,name,category,organization_id,location,conditions,requirements&status=eq.active&order=created_at.desc&limit=25','GET',identity.token),
     upstream('/rest/v1/organizations?select=id,name&status=eq.active&limit=60','GET',identity.token)]);
    return reply(res,200,await askNvidia({question:input.question,history:input.history,resources,organizations}));
   }
   if(pathname==='/api/action'&&req.method==='POST'){
    const input=await body(req);const action=validateAction(input);if(!rpcActions[action])return reply(res,400,{error:'Unknown action'});
    if(action==='createBooking'){const times=parseSlot(input.start,input.end);if(!times.ok)return reply(res,400,{error:times.error});}
    const params={p_input:{...input,action:undefined}};const result=await upstream(`/rest/v1/rpc/${rpcActions[action]}`,'POST',identity.token,params);
    return reply(res,200,{message:typeof result==='string'?result:'Request completed',result});
   }
   if(pathname==='/api/upload'&&req.method==='POST'){
    const u=new URL(req.url,'http://localhost');const bookingId=u.searchParams.get('bookingId'),stage=u.searchParams.get('stage');
    if(!/^[0-9a-f-]{36}$/i.test(bookingId||'')||!['before','after'].includes(stage))return reply(res,400,{error:'Invalid booking upload target'});
    const type=String(req.headers['content-type']||'');const ext=type==='image/png'?'png':type==='image/webp'?'webp':type==='image/jpeg'?'jpg':null;
    if(!ext)return reply(res,415,{error:'Only JPEG, PNG and WebP are supported'});
    const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>3*1024*1024)return reply(res,413,{error:'Photo must be smaller than 3 MB'});chunks.push(c)}
    const buffer=Buffer.concat(chunks);const isImage=(ext==='jpg'&&buffer.subarray(0,3).equals(Buffer.from([255,216,255])))||(ext==='png'&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(ext==='webp'&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP');
    if(!isImage)return reply(res,415,{error:'The uploaded file does not match the image format'});
    const file=`${bookingId}/${identity.user.id}/${stage}-${crypto.randomUUID()}.${ext}`;
    await upstream(`/storage/v1/object/condition-evidence/${file}`,'POST',identity.token,buffer,{'Content-Type':type,'x-upsert':'false'});
    await upstream('/rest/v1/rpc/attach_booking_photo','POST',identity.token,{p_input:{bookingId,stage,path:file}});
    return reply(res,200,{message:'Private evidence photo saved'});
   }
   if(pathname.startsWith('/api/photo-url/')&&req.method==='GET'){
    const id=pathname.split('/').at(-1);if(!/^[0-9a-f-]{36}$/i.test(id))return reply(res,400,{error:'Invalid photo'});
    const found=await upstream(`/rest/v1/booking_photos?select=storage_path&id=eq.${q(id)}`,'GET',identity.token);
    if(!found[0])return reply(res,404,{error:'Photo unavailable'});
    const signed=await upstream(`/storage/v1/object/sign/condition-evidence/${found[0].storage_path}`,'POST',identity.token,{expiresIn:90});
    return reply(res,200,{url:url+'/storage/v1'+signed.signedURL});
   }
   return reply(res,404,{error:'Unknown endpoint'});
  }catch(e){return safeError(res,e)}
 }
 if(req.method!=='GET')return reply(res,405,{error:'Method not allowed'});
 const files={'/':'index.html','/app.js':'app.js','/styles.css':'styles.css','/favicon.svg':'favicon.svg'};
 if(!files[pathname])return reply(res,404,{error:'Not found'});
 try{const p=path.join(root,files[pathname]),content=await readFile(p);const mime=p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.js')?'text/javascript; charset=utf-8':p.endsWith('.css')?'text/css; charset=utf-8':'image/svg+xml';res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache',...securityHeaders});res.end(content)}catch{reply(res,404,{error:'Not found'})}
}
const server=http.createServer((req,res)=>handler(req,res).catch(e=>safeError(res,e)));
if(process.env.NODE_ENV!=='test'&&!process.env.NODE_TEST_CONTEXT)server.listen(port,'0.0.0.0',()=>console.log(`UNLOCK Lab production platform: http://localhost:${port} configured=${configured}`));
export {server,handler};
