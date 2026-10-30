import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {isEmail,checkPassword,parseSlot,validateAction,securityHeaders} from '../validate.js';
const dir=path.dirname(fileURLToPath(import.meta.url));
const sql=await readFile(path.join(dir,'../sql/001_platform.sql'),'utf8');
test('input validator rejects weak and malformed identities',()=>{
 assert.equal(isEmail('not-an-email'),false);assert.equal(isEmail('member@example.org'),true);
 assert.equal(checkPassword('password'),false);assert.equal(checkPassword('really-long-secret-password'),true);
 assert.equal(validateAction({action:'createBooking'}),'createBooking');assert.equal(validateAction([]),null);
});
test('booking slot validation rejects illegal or conflicting time ranges',()=>{
 const t=Date.now()+86400000;assert.equal(parseSlot(new Date(t).toISOString(),new Date(t+3600000).toISOString()).ok,true);
 assert.equal(parseSlot(new Date(t).toISOString(),new Date(t+30000).toISOString()).ok,false);
 assert.equal(parseSlot('bad','bad').ok,false);
 assert.equal(parseSlot(new Date(t).toISOString(),new Date(t+7*3600000).toISOString()).ok,false);
});
test('database has immutable auditable data, human controls, and overlap exclusion',()=>{
 for(const text of ['no_confirmed_resource_overlap','enable row level security','private.is_email_verified','training_requests','booking_photos','incident_resolved','incident_reported','private.is_admin','FairQueue','booking_cancelled','organizationId','condition-evidence'])assert.ok(sql.includes(text),text);
 assert.match(sql,/revoke all on public.%I from anon,authenticated/);
 assert.match(sql,/security invoker/);
 assert.doesNotMatch(sql,/service_role/);
});
test('strict content security policy and no browser-side secrets',async()=>{
 assert.match(securityHeaders['Content-Security-Policy'],/frame-ancestors 'none'/);
 const js=await readFile(path.join(dir,'../public/app.js'),'utf8');
 assert.doesNotMatch(js,/SUPABASE_PUBLISHABLE_KEY|OPENAI_API_KEY|service_role/);
 assert.doesNotMatch(js,/\/api\/demo-login/);
});
