import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed,executeAction,sweepOverdue,campusDueAt} from '../logic.js';

const tomorrow=()=>{const d=new Date();d.setUTCDate(d.getUTCDate()+2);return d.toISOString().slice(0,10)};
const fixture=()=>{const db=createSeed();return {db,student:db.users.find(x=>x.id==='student3'),student1:db.users.find(x=>x.id==='student1'),manager:db.users.find(x=>x.id==='manager1'),owner:db.users.find(x=>x.id==='owner1')}};

test('Skill Passport requires a documented human decision',()=>{
 const {db,student,student1,manager,owner}=fixture();
 assert.equal(student.skills.includes('3d-print'),false);
 const req=executeAction(db,student,{action:'requestTraining',skill:'3d-print',evidence:'Completed campus training with lab coordinator on 2026-10-30'});
 assert.ok(req.trainingId,req.error);
 assert.equal(executeAction(db,student1,{action:'reviewTraining',trainingId:req.trainingId,decision:'approve',note:'Override'}).status,403);
 assert.equal(executeAction(db,owner,{action:'reviewTraining',trainingId:req.trainingId,decision:'approve',note:'Inspected training documents'}).status,403);
 const approved=executeAction(db,manager,{action:'reviewTraining',trainingId:req.trainingId,decision:'approve',note:'Practical training documents verified by supervising technician'});
 assert.ok(!approved.error,approved.error);
 assert.ok(student.skills.includes('3d-print'));
 const request=executeAction(db,student,{action:'request',resourceId:'r1',date:tomorrow(),start:'12:00',end:'13:00',purpose:'Print a model for course project'});
 assert.ok(request.bookingId,request.error);
 assert.ok(db.events.some(e=>e.type==='training_decision'));
});

test('Skill Passport rejects duplicates and requires evidence',()=>{
 const {db,student}=fixture();
 assert.match(executeAction(db,student,{action:'requestTraining',skill:'laser-safety',evidence:'hi'}).error,/at least 12/);
 const x=executeAction(db,student,{action:'requestTraining',skill:'laser-safety',evidence:'Completed practical training safely'});
 assert.ok(x.trainingId);
 assert.match(executeAction(db,student,{action:'requestTraining',skill:'laser-safety',evidence:'Completed practical training safely'}).error,/already awaiting review/);
});

test('Owner reviews extensions with documented reasons, limits and conflict checks',()=>{
 const {db,student1,manager}=fixture();const date=tomorrow();
 const requested=executeAction(db,student1,{action:'request',resourceId:'r1',date,start:'10:00',end:'11:00',purpose:'Print an experimental prototype'});
 assert.ok(requested.bookingId,requested.error);
 assert.ok(!executeAction(db,manager,{action:'review',bookingId:requested.bookingId,decision:'approve',note:'Training cleared'}).error);
 const extension=executeAction(db,student1,{action:'requestExtension',bookingId:requested.bookingId,newEnd:'12:00',reason:'Need longer for print finishing'});
 assert.ok(!extension.error,extension.error);
 let b=db.bookings.find(x=>x.id===requested.bookingId);
 assert.equal(b.end,'11:00');assert.equal(b.extension.status,'pending');
 const approved=executeAction(db,manager,{action:'reviewExtension',bookingId:b.id,decision:'approve',note:'Equipment and staff available for the extension'});
 assert.ok(!approved.error,approved.error);assert.equal(b.end,'12:00');
 assert.ok(db.events.some(e=>e.type==='extension_decision'&&e.bookingId===b.id));
 const second=executeAction(db,student1,{action:'requestExtension',bookingId:b.id,newEnd:'13:00',reason:'Additional research required'});
 assert.ok(!second.error,second.error);
 const rejected=executeAction(db,manager,{action:'reviewExtension',bookingId:b.id,decision:'reject',note:'Capacity reserved for another team'});
 assert.ok(!rejected.error,rejected.error);assert.equal(b.end,'12:00');
});

test('Extension approval fails if it would overlap a confirmed reservation',()=>{
 const {db,student1,manager}=fixture();const date=tomorrow();
 const a=executeAction(db,student1,{action:'request',resourceId:'r1',date,start:'11:00',end:'12:00',purpose:'Research print A'});
 const b=executeAction(db,student1,{action:'request',resourceId:'r1',date,start:'12:00',end:'13:00',purpose:'Research print B'});
 assert.ok(!executeAction(db,manager,{action:'review',bookingId:a.bookingId,decision:'approve',note:'Required training verified'}).error);
 assert.ok(!executeAction(db,manager,{action:'review',bookingId:b.bookingId,decision:'approve',note:'Required training verified'}).error);
 assert.ok(!executeAction(db,student1,{action:'requestExtension',bookingId:a.bookingId,newEnd:'13:00',reason:'Need more time to finish printing'}).error);
 assert.match(executeAction(db,manager,{action:'reviewExtension',bookingId:a.bookingId,decision:'approve',note:'Reviewed allocation and time slots'}).error,/another confirmed reservation/);
});

test('Overdue monitor notifies both parties exactly once, without penalty',()=>{
 const {db,student1,owner}=fixture();
 const old={id:'test-old',resourceId:'r1',userId:student1.id,date:'2026-10-25',start:'10:00',end:'11:00',status:'active',createdAt:'2026-10-25T04:00:00Z'};
 db.bookings.push(old);
 assert.equal(campusDueAt(old),Date.parse('2026-10-25T11:00:00+05:30'));
 assert.equal(sweepOverdue(db,Date.parse('2026-10-26T00:00:00Z')),1);
 assert.equal(sweepOverdue(db,Date.parse('2026-10-27T00:00:00Z')),0);
 assert.ok(db.notifications.some(x=>x.userId===student1.id&&x.title==='Return overdue'));
 assert.ok(db.notifications.some(x=>x.userId===owner.id&&x.title==='Resource overdue'));
 assert.equal(old.status,'active');
 assert.equal(db.events.filter(x=>x.type==='overdue').length,1);
});
