import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed,calculateEligibility,executeAction,fairnessScore,overlaps} from '../logic.js';
const seed=()=>{const db=createSeed();return {db,s:db.users.find(u=>u.id==='student1'),d:db.users.find(u=>u.id==='student2'),m:db.users.find(u=>u.id==='manager1'),o:db.users.find(u=>u.id==='owner1'),n:db.users.find(u=>u.id==='student3')}};
const date=()=>{let d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)};
const request=(db,u,resourceId='r1',d=date(),start='10:00',end='12:00')=>executeAction(db,u,{action:'request',resourceId,date:d,start,end,purpose:'Building a prototype for the campus exhibition'});
test('complete judge journey: request → approve → check-in → return → verification → audit',()=>{
 const {db,s,m}=seed();
 const req=request(db,s);assert.ok(req.bookingId,req.error);
 let b=db.bookings.find(x=>x.id===req.bookingId);assert.equal(b.status,'pending');
 let approved=executeAction(db,m,{action:'review',bookingId:b.id,decision:'approve',note:'Training verified'});assert.ok(!approved.error,approved.error);assert.equal(b.status,'approved');
 let checked=executeAction(db,s,{action:'checkin',bookingId:b.id,code:'MK4-2048',condition:'Excellent',note:'Fully functional'});assert.ok(!checked.error,checked.error);assert.equal(b.status,'active');
 let checkout=executeAction(db,s,{action:'checkout',bookingId:b.id,condition:'Good',note:'Printed successfully, no damage'});assert.ok(!checkout.error,checkout.error);assert.equal(b.status,'return_pending');
 let returned=executeAction(db,m,{action:'confirmReturn',bookingId:b.id,note:'Everything safely returned'});assert.ok(!returned.error,returned.error);assert.equal(b.status,'returned');
 for(const kind of ['request','decision','checkin','checkout','return'])assert.ok(db.events.find(e=>e.bookingId===b.id&&e.type===kind),kind);
 assert.ok(db.notifications.filter(n=>n.userId===s.id).length>=2);
});
test('untrained users cannot access restricted equipment, but can access rooms',()=>{
 const {db,n}=seed();assert.equal(calculateEligibility(n,db.resources[0]).eligible,false);
 assert.match(request(db,n).error,/Training needed/);
 assert.equal(calculateEligibility(n,db.resources[2]).eligible,true);
 assert.ok(request(db,n,'r3').bookingId);
});
test('approved conflict goes to waitlist and cancellation promotes for human review',()=>{
 const {db,s,d,m}=seed();const first=request(db,d);assert.ok(first.bookingId);
 assert.ok(!executeAction(db,m,{action:'review',bookingId:first.bookingId,decision:'approve'}).error);
 const other=request(db,s);const b=db.bookings.find(b=>b.id===other.bookingId);assert.equal(b.status,'waitlisted');
 const conflictingApprove=executeAction(db,m,{action:'review',bookingId:b.id,decision:'approve'});assert.match(conflictingApprove.error,/overlaps/);
 executeAction(db,d,{action:'cancel',bookingId:first.bookingId});assert.equal(b.status,'pending');
});
test('FairQueue blocks an arbitrary priority reversal unless a manager writes an override',()=>{
 const {db,s,d,m}=seed();const a=request(db,s),b=request(db,d);
 assert.ok(fairnessScore(db,d.id,'r1').score>fairnessScore(db,s.id,'r1').score);
 assert.match(executeAction(db,m,{action:'review',bookingId:a.bookingId,decision:'approve'}).error,/FairQueue/);
 assert.ok(!executeAction(db,m,{action:'review',bookingId:a.bookingId,decision:'approve',note:'override: accessibility accommodation confirmed by staff'}).error);
 assert.equal(db.bookings.find(x=>x.id===b.bookingId).status,'waitlisted');
});
test('owner and student permissions stop unauthorised actions',()=>{
 const {db,s,d}=seed();const b=request(db,s);assert.match(executeAction(db,d,{action:'review',bookingId:b.bookingId,decision:'approve'}).error,/Only the resource owner/);
 assert.match(executeAction(db,d,{action:'checkin',bookingId:b.bookingId,code:'MK4-2048',condition:'Good'}).error,/Only the requesting student/);
 assert.match(executeAction(db,s,{action:'checkin',bookingId:b.bookingId,code:'MK4-2048',condition:'Good'}).error,/must be approved/);
});
test('damage creates a reviewable incident without automatic penalties',()=>{
 const {db,s,m}=seed();const b=request(db,s);executeAction(db,m,{action:'review',bookingId:b.bookingId,decision:'approve'});
 executeAction(db,s,{action:'checkin',bookingId:b.bookingId,code:'MK4-2048',condition:'Good'});
 executeAction(db,s,{action:'checkout',bookingId:b.bookingId,condition:'Damaged',note:'Small cosmetic scratch noticed after use'});
 assert.equal(db.incidents.length,1);assert.equal(db.incidents[0].status,'open');
 const result=executeAction(db,m,{action:'resolveIncident',bookingId:b.bookingId,incidentId:db.incidents[0].id,resolution:'Inspected by technician; no penalty until independent review'});
 assert.ok(!result.error);assert.equal(db.incidents[0].status,'resolved');
});
test('resource creation and limits are enforced at API logic layer',()=>{
 const {db,s,o}=seed();let res=executeAction(db,o,{action:'addResource',name:'Arduino Kit',location:'Room M14',conditions:'Return all cables and batteries',category:'Technology',requirements:[]});assert.ok(res.resourceId);
 assert.match(request(db,s,'r1',date(),'07:00','08:00').error,/available from/);
 assert.match(request(db,s,'r1',date(),'10:00','16:00').error,/between 30 minutes/);
 assert.equal(overlaps({resourceId:'a',date:'2026-11-01',start:'10:00',end:'12:00'},{resourceId:'a',date:'2026-11-01',start:'12:00',end:'13:00'}),false);
});
