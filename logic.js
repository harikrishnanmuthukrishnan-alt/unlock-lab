import crypto from 'node:crypto';
const id=()=>crypto.randomUUID().slice(0,10);
const day=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10)};
const at=(date,time)=>new Date(`${date}T${time}:00Z`).getTime();
const hours=(b)=>(at(b.date,b.end)-at(b.date,b.start))/3600000;
const clean=(v,n=240)=>String(v??'').trim().slice(0,n);
const validDate=(s)=>/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const validTime=(s)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export const overlaps=(a,b)=>a.resourceId===b.resourceId&&a.date===b.date&&a.start<b.end&&b.start<a.end;
export const campusDueAt=(booking,offset='+05:30')=>Date.parse(`${booking.date}T${booking.end}:00${offset}`);
const busy=(s)=>['approved','active','return_pending'].includes(s);
export function createSeed(){
const users=[
{id:'student1',name:'Aarav Mehta',role:'student',avatar:'AM',department:'Product Design · Year 3',verified:true,skills:['3d-print','camera','workspace'],color:'#afff86'},
{id:'student2',name:'Diya Nair',role:'student',avatar:'DN',department:'Mechanical Engineering · Year 2',verified:true,skills:['3d-print','workspace'],color:'#ffbf89'},
{id:'student3',name:'Ishaan Rao',role:'student',avatar:'IR',department:'First-year Explorer',verified:true,skills:['workspace'],color:'#adabff'},
{id:'owner1',name:'Mira Kapoor',role:'owner',avatar:'MK',department:'Makerspace Lab Coordinator',verified:true,skills:['3d-print','camera','laser-safety','workspace'],color:'#c5afff'},
{id:'manager1',name:'Dr. Kiran Shah',role:'manager',avatar:'KS',department:'Campus Facilities Manager',verified:true,skills:['3d-print','camera','laser-safety','workspace'],color:'#9fe6fb'}];
const resources=[
{id:'r1',name:'Prusa MK4 3D Printer',category:'Fabrication',tag:'Most requested',location:'Innovation Hub · Lab 02',description:'Precision 3D printing for rapid prototypes, enclosures and design validation.',requirements:['3d-print'],conditions:'Closed-toe shoes required. PLA and PETG only. No unattended prints. Staff must sign off before first use.',availability:'09:00–19:00',opens:'09:00',closes:'19:00',limit:3,code:'MK4-2048',ownerId:'owner1',featured:true,accent:'lime',icon:'printer',approved:true},
{id:'r2',name:'Sony A7 IV Creator Kit',category:'Media',tag:'Creator favorite',location:'Media Center · Studio B',description:'Full-frame camera, 24–70mm lens, tripod and lighting accessories.',requirements:['camera'],conditions:'Use wrist strap. No outdoor shoots without written approval. Inspect lens and body at handover.',availability:'08:00–20:00',opens:'08:00',closes:'20:00',limit:4,code:'SONY-7712',ownerId:'owner1',featured:true,accent:'lavender',icon:'camera',approved:true},
{id:'r3',name:'Collaborative Design Studio',category:'Spaces',tag:'Walk-in friendly',location:'Design Block · Room 214',description:'Sunlit creative workspace for up to 12 people, with boards, screen and prototyping tables.',requirements:[],conditions:'Leave the room clean. No food near workstations. Maximum occupancy: 12.',availability:'08:00–22:00',opens:'08:00',closes:'22:00',limit:4,code:'ROOM-214',ownerId:'owner1',featured:false,accent:'peach',icon:'room',approved:true},
{id:'r4',name:'Epilog Fusion Laser Cutter',category:'Fabrication',tag:'Training required',location:'FabLab · Safety Zone',description:'High-precision laser cutter for wood and acrylic prototyping under staff oversight.',requirements:['laser-safety'],conditions:'Staff supervision is mandatory. Approved materials only. No PVC or unidentified plastics.',availability:'10:00–17:00',opens:'10:00',closes:'17:00',limit:2,code:'LASER-881',ownerId:'owner1',featured:false,accent:'blue',icon:'laser',approved:true},
{id:'r5',name:'Podcast Recording Suite',category:'Media',tag:'Instant discovery',location:'Media Center · Room 3',description:'Sound-treated studio featuring two broadcast microphones and a mixer.',requirements:[],conditions:'Keep food and drinks outside. Record only with consent of participants.',availability:'09:00–20:00',opens:'09:00',closes:'20:00',limit:3,code:'POD-3382',ownerId:'owner1',featured:false,accent:'mint',icon:'mic',approved:true},
{id:'r6',name:'GPU Compute Workstation',category:'Technology',tag:'Research ready',location:'AI Lab · Bay 5',description:'NVIDIA-powered workstation for machine learning and 3D rendering coursework.',requirements:['workspace'],conditions:'No cryptocurrency mining. Save work to personal storage. Sign out on departure.',availability:'07:00–23:00',opens:'07:00',closes:'23:00',limit:4,code:'GPU-1945',ownerId:'owner1',featured:false,accent:'pink',icon:'cpu',approved:true}];
const bookings=[
{id:'b-history1',resourceId:'r1',userId:'student1',date:day(-7),start:'10:00',end:'12:00',purpose:'Prototype enclosure for design challenge',status:'returned',createdAt:new Date(Date.now()-8*86400000).toISOString(),initialCondition:'Excellent',finalCondition:'Excellent',initialNote:'Clean and ready',finalNote:'Returned on time',decidedBy:'owner1',reason:'Training verified'},
{id:'b-history2',resourceId:'r2',userId:'student2',date:day(-4),start:'14:00',end:'16:00',purpose:'Document robotics team experiments',status:'returned',createdAt:new Date(Date.now()-6*86400000).toISOString(),initialCondition:'Good',finalCondition:'Good',initialNote:'Checked',finalNote:'All components present',decidedBy:'owner1',reason:'Approved by coordinator'},
{id:'b-upcoming',resourceId:'r2',userId:'student2',date:day(3),start:'14:00',end:'16:00',purpose:'Student team video documentation',status:'approved',createdAt:new Date().toISOString(),decidedBy:'owner1',reason:'Media training verified'}];
const events=[{id:id(),at:new Date().toISOString(),actor:'Mira Kapoor',type:'system',message:'Demo workspace initialized with verified campus resources',bookingId:null}];
return {users,resources,bookings,incidents:[],trainingRequests:[],notifications:[],events};
}
export function calculateEligibility(user,r){
 const missing=r.requirements.filter(x=>!user.skills.includes(x));
 return {eligible:user.verified&&missing.length===0,missing,verified:user.verified,description:!user.verified?'Profile verification required':missing.length?`Training needed: ${missing.map(x=>x.replace(/-/g,' ')).join(', ')}`:'You meet all current access requirements'};
}
export function fairnessScore(db,userId,resourceId){
 const now=Date.now(),since=now-30*86400000;
 const related=db.bookings.filter(b=>b.userId===userId&&b.resourceId===resourceId&&['returned','active','approved'].includes(b.status)&&Date.parse(`${b.date}T00:00:00Z`)>=since);
 const usedHours=related.reduce((sum,b)=>sum+hours(b),0);
 const allHours=db.bookings.filter(b=>b.userId===userId&&['returned','active','approved'].includes(b.status)&&Date.parse(`${b.date}T00:00:00Z`)>=since).reduce((sum,b)=>sum+hours(b),0);
 return {usedHours,allHours,score:Math.round(100-usedHours*12-allHours*2),explanation:`${usedHours.toFixed(1)}h on this resource in 30 days · lower usage gets higher priority`};
}
const activity=(db,user,type,message,bookingId=null)=>db.events.push({id:id(),at:new Date().toISOString(),actor:user.name,actorId:user.id,type,message,bookingId});
const notify=(db,userId,title,body)=>db.notifications.push({id:id(),userId,at:new Date().toISOString(),title,body});
const err=(error,status=400)=>({error,status});
const ownerCan=(db,user,booking)=>user.role==='manager'||user.role==='admin'||(user.role==='owner'&&db.resources.find(r=>r.id===booking.resourceId)?.ownerId===user.id);
const promote=(db,removed)=>{
 const queued=db.bookings.filter(b=>b.status==='waitlisted'&&overlaps(b,removed)).sort((a,b)=>fairnessScore(db,b.userId,b.resourceId).score-fairnessScore(db,a.userId,a.resourceId).score||a.createdAt.localeCompare(b.createdAt));
 for(const b of queued){if(!db.bookings.some(x=>busy(x.status)&&overlaps(x,b))){b.status='pending';b.reason='Slot opened — awaiting manager review';notify(db,b.userId,'Waitlist update',`A slot opened for ${db.resources.find(r=>r.id===b.resourceId)?.name}. Your request now awaits approval.`);activity(db,{id:'system',name:'FairQueue'},'waitlist',`Moved waitlisted request to pending review`,b.id);break;}}
};
export function sweepOverdue(db,now=Date.now(),offset='+05:30'){
 let changed=0;
 for(const booking of db.bookings){
  if(booking.status!=='active'||booking.overdueNotified||campusDueAt(booking,offset)>now)continue;
  booking.overdueNotified=new Date(now).toISOString();
  const resource=db.resources.find(r=>r.id===booking.resourceId);
  const user=db.users.find(u=>u.id===booking.userId);
  activity(db,{id:'system',name:'Overdue monitor'},'overdue',`Overdue: ${resource?.name||'Resource'} has not been returned by ${user?.name||'borrower'}`,booking.id);
  notify(db,booking.userId,'Return overdue',`${resource?.name||'Resource'} is overdue. Submit a return or contact the owner.`);
  if(resource)notify(db,resource.ownerId,'Resource overdue',`${user?.name||'Borrower'} has not returned ${resource.name}; please follow up.`);
  changed++;
 }
 return changed;
}
export function executeAction(db,user,input){
 if(!input||typeof input!=='object')return err('Invalid action request.');
 db.trainingRequests ||= [];
 const action=clean(input.action,50),now=new Date().toISOString();
 if(action==='reset'){
  if(user.role!=='manager'&&user.role!=='admin')return err('Only the demo manager can reset the workspace.',403);
  const seed=createSeed();Object.assign(db,seed);return {message:'Demo reset to its original state.'};
 }
 if(action==='requestTraining'){
  if(user.role!=='student')return err('Only students may request training validation.',403);
  const skill=clean(input.skill,32),evidence=clean(input.evidence,400);
  if(!['3d-print','camera','workspace','laser-safety'].includes(skill))return err('Unknown training badge.');
  if(user.skills.includes(skill))return err('This qualification is already in your Skill Passport.');
  if(evidence.length<12)return err('Explain your completed training or supervised assessment in at least 12 characters.');
  if(db.trainingRequests.some(t=>t.userId===user.id&&t.skill===skill&&t.status==='pending'))return err('Your training verification is already awaiting review.');
  const t={id:id(),userId:user.id,skill,evidence,status:'pending',requestedAt:now};db.trainingRequests.push(t);
  activity(db,user,'training_request',`Requested verification for ${skill}; awaiting staff review`);
  db.users.filter(x=>['manager','admin'].includes(x.role)).forEach(x=>notify(db,x.id,'Training verification',`${user.name} requested ${skill} qualification review.`));
  return {message:'Skill Passport verification requested. A manager must verify the evidence.',trainingId:t.id};
 }
 if(action==='reviewTraining'){
  if(!['manager','admin'].includes(user.role))return err('Only an authorised institution manager may verify training.',403);
  const t=db.trainingRequests.find(x=>x.id===input.trainingId);
  if(!t)return err('Training request not found.',404);
  if(t.status!=='pending')return err('This training request has already been reviewed.');
  if(!['approve','reject'].includes(input.decision))return err('Choose approve or reject.');
  const note=clean(input.note,400);
  if(note.length<10)return err('Document the evidence review and reason (at least 10 characters).');
  const student=db.users.find(x=>x.id===t.userId);
  if(!student)return err('Student record not found.',404);
  t.status=input.decision==='approve'?'approved':'rejected';t.reviewedAt=now;t.reviewedBy=user.id;t.reason=note;
  if(t.status==='approved'&&!student.skills.includes(t.skill))student.skills.push(t.skill);
  activity(db,user,'training_decision',`${user.name} ${t.status} ${t.skill} qualification for ${student.name}: ${note}`);
  notify(db,student.id,'Skill Passport '+t.status,`${t.skill}: ${note}`);
  return {message:'Training decision recorded. Skill Passport updated if approved.'};
 }
 if(action==='addResource'){
  if(!['owner','manager','admin'].includes(user.role))return err('Only authorised resource owners can publish listings.',403);
  const name=clean(input.name,90),location=clean(input.location,110),description=clean(input.description,320),conditions=clean(input.conditions,420);
  if(name.length<4||location.length<4||conditions.length<8)return err('Provide a resource name, location and clear usage conditions.');
  const category=['Fabrication','Media','Spaces','Technology'].includes(input.category)?input.category:'Technology';
  const requirements=['3d-print','camera','workspace','laser-safety'].filter(x=>(input.requirements||[]).includes(x));
  const res={id:id(),name,location,description,conditions,category,requirements,opens:'09:00',closes:'18:00',availability:'09:00–18:00',limit:3,code:`LAB-${Math.floor(Math.random()*9000+1000)}`,ownerId:user.role==='owner'?user.id:'owner1',featured:false,accent:['mint','pink','blue'][Math.floor(Math.random()*3)],icon:category==='Media'?'camera':category==='Spaces'?'room':category==='Fabrication'?'printer':'cpu',tag:'New arrival',approved:true};
  db.resources.unshift(res);activity(db,user,'listing',`Listed ${res.name}`);return {message:`${res.name} is now available.`,resourceId:res.id};
 }
 const resource=db.resources.find(r=>r.id===input.resourceId);
 if(action==='request'){
  if(user.role!=='student')return err('Switch to a student account to request a resource.',403);
  if(!resource)return err('Resource not found.',404);
  const eligibility=calculateEligibility(user,resource);if(!eligibility.eligible)return err(eligibility.description,403);
  const date=clean(input.date,10),start=clean(input.start,5),end=clean(input.end,5),purpose=clean(input.purpose,320);
  if(!validDate(date)||!validTime(start)||!validTime(end)||start>=end)return err('Enter a valid date and start/end times.');
  if(date<day(0))return err('Bookings must be scheduled for today or later.');
  if(start<resource.opens||end>resource.closes)return err(`Resource is available from ${resource.availability}.`);
  const duration=(at(date,end)-at(date,start))/3600000;
  if(duration>resource.limit||duration<0.5)return err(`Please choose a session between 30 minutes and ${resource.limit} hours.`);
  if(purpose.length<8)return err('Describe your intended use in at least 8 characters.');
  const ownActive=db.bookings.filter(b=>b.userId===user.id&&b.resourceId===resource.id&&['pending','waitlisted','approved','active','return_pending'].includes(b.status));
  if(ownActive.length>=2)return err('Fair-use limit: maximum 2 outstanding requests per resource.');
  const weekStart=Date.parse(`${date}T00:00:00Z`)-7*86400000;
  const weekHours=db.bookings.filter(b=>b.userId===user.id&&b.resourceId===resource.id&&['approved','active','returned','return_pending'].includes(b.status)&&at(b.date,b.start)>=weekStart&&b.date<=date).reduce((x,b)=>x+hours(b),0);
  if(weekHours+duration>6)return err('Fair-use policy: maximum 6 booked hours per resource in a rolling week.');
  const test={resourceId:resource.id,date,start,end};
  if(ownActive.some(b=>overlaps(b,test)))return err('You already have a request for an overlapping time.');
  const conflict=db.bookings.find(b=>busy(b.status)&&overlaps(b,test));
  const b={id:id(),userId:user.id,resourceId:resource.id,date,start,end,purpose,status:conflict?'waitlisted':'pending',createdAt:now,reason:conflict?'Overlapping approved reservation — fair waitlist':'Eligibility verified — awaiting owner approval',requestedBy:user.name};
  db.bookings.push(b);activity(db,user,'request',`${user.name} requested ${resource.name} for ${date} ${start}–${end} (${b.status})`,b.id);
  notify(db,resource.ownerId,'New booking request',`${user.name} requested ${resource.name}.`);
  return {message:conflict?'Added to a transparent waiting list.':'Request submitted for owner review.',bookingId:b.id};
 }
 const b=db.bookings.find(x=>x.id===input.bookingId);
 if(!b)return err('Booking not found.',404);
 const r=db.resources.find(x=>x.id===b.resourceId);
 if(action==='review'){
  if(!ownerCan(db,user,b))return err('Only the resource owner or authorised manager may review.',403);
  if(!['pending','waitlisted'].includes(b.status))return err('Only pending or waitlisted bookings can be reviewed.');
  const decision=input.decision;
  if(!['approve','reject','waitlist'].includes(decision))return err('Unknown decision.');
  const note=clean(input.note,280);
  if(decision==='reject'&&!note)return err('Provide a rejection reason for transparency.');
  if(decision==='approve'){
   const eligibility=calculateEligibility(db.users.find(u=>u.id===b.userId),r);if(!eligibility.eligible)return err('The requester no longer meets access conditions.');
   if(db.bookings.some(x=>x.id!==b.id&&busy(x.status)&&overlaps(x,b)))return err('Cannot approve: slot overlaps an existing approved booking. Keep on waiting list.');
   const competitors=db.bookings.filter(x=>x.id!==b.id&&x.status==='pending'&&overlaps(x,b));
   const ahead=competitors.find(x=>fairnessScore(db,x.userId,x.resourceId).score>fairnessScore(db,b.userId,b.resourceId).score);
   if(ahead&&!note.toLowerCase().includes('override'))return err('FairQueue: another eligible requester has higher priority. Add a written note containing “override” to approve exceptionally.');
   b.status='approved';b.reason=note||'Verified eligibility and fair allocation';b.decidedBy=user.id;
   for(const c of competitors){c.status='waitlisted';c.reason='A competing booking was approved — moved to fair waitlist';notify(db,c.userId,'Moved to waiting list',`A booking for ${r.name} was approved. Your place is retained.`);}
  }else if(decision==='reject'){b.status='rejected';b.reason=note;b.decidedBy=user.id;}
  else {b.status='waitlisted';b.reason=note||'Placed on fair waiting list by owner';b.decidedBy=user.id;}
  activity(db,user,'decision',`${user.name} marked ${b.id} ${b.status}: ${b.reason}`,b.id);
  notify(db,b.userId,'Booking '+b.status,`${r.name}: ${b.reason}`);
  return {message:`Booking ${b.status}. Decision recorded.`};
 }
 if(action==='requestExtension'){
  if(user.id!==b.userId)return err('Only the borrower may request an extension.',403);
  if(!['approved','active'].includes(b.status))return err('Only approved or active reservations can be extended.');
  const newEnd=clean(input.newEnd,5),reason=clean(input.reason,300);
  if(!validTime(newEnd)||newEnd<=b.end||newEnd>r.closes)return err(`Extension must end after ${b.end} and before ${r.closes}.`);
  if(reason.length<10)return err('Explain the extension request in at least 10 characters.');
  if(b.extension?.status==='pending')return err('An extension request is already pending.');
  if((at(b.date,newEnd)-at(b.date,b.start))/3600000>r.limit)return err(`Sessions cannot exceed ${r.limit} hours.`);
  b.extension={status:'pending',newEnd,reason,requestedAt:now};
  activity(db,user,'extension_request',`Requested extension of ${r.name} from ${b.end} to ${newEnd}: ${reason}`,b.id);
  notify(db,r.ownerId,'Extension approval needed',`${user.name} requests ${newEnd} for ${r.name}.`);
  return {message:'Extension sent to the owner for approval; the original end time remains in effect.'};
 }
 if(action==='reviewExtension'){
  if(!ownerCan(db,user,b))return err('Only an authorised resource owner can decide extensions.',403);
  if(!b.extension||b.extension.status!=='pending')return err('No pending extension to review.');
  if(!['approve','reject'].includes(input.decision))return err('Choose approve or reject.');
  const note=clean(input.note,300);
  if(note.length<8)return err('Document your extension decision (at least 8 characters).');
  if(input.decision==='approve'){
   const candidate={...b,end:b.extension.newEnd};
   if(db.bookings.some(x=>x.id!==b.id&&busy(x.status)&&overlaps(x,candidate)))return err('Cannot extend into another confirmed reservation.');
   const extra=(at(b.date,b.extension.newEnd)-at(b.date,b.end))/3600000;
   const weekStart=Date.parse(`${b.date}T00:00:00Z`)-7*86400000;
   const usage=db.bookings.filter(x=>x.userId===b.userId&&x.resourceId===b.resourceId&&['approved','active','returned','return_pending'].includes(x.status)&&at(x.date,x.start)>=weekStart&&x.date<=b.date).reduce((n,x)=>n+hours(x),0);
   if(usage+extra>6)return err('The extension exceeds the 6-hour fair-use limit.');
   b.end=b.extension.newEnd;b.extension.status='approved';
  }else b.extension.status='rejected';
  b.extension.reviewedAt=now;b.extension.reviewedBy=user.id;b.extension.note=note;
  activity(db,user,'extension_decision',`Extension ${b.extension.status} for ${r.name}: ${note}`,b.id);
  notify(db,b.userId,'Extension '+b.extension.status,`${r.name}: ${note}`);
  return {message:`Extension ${b.extension.status}; decision recorded.`};
 }
 if(action==='cancel'){
  if(b.userId!==user.id&&!ownerCan(db,user,b))return err('You cannot cancel this booking.',403);
  if(!['pending','approved','waitlisted'].includes(b.status))return err('This booking can no longer be cancelled.');
  const wasApproved=b.status==='approved';b.status='cancelled';b.reason=clean(input.note,200)||'Cancelled by '+user.name;
  activity(db,user,'cancel',`Cancelled ${r.name}: ${b.reason}`,b.id);notify(db,b.userId,'Booking cancelled',b.reason);if(wasApproved)promote(db,b);return {message:'Booking cancelled; waitlist updated if applicable.'};
 }
 if(action==='checkin'){
  if(b.userId!==user.id)return err('Only the requesting student can check in.',403);
  if(b.status!=='approved')return err('Booking must be approved before check-in.');
  if(clean(input.code,30).toUpperCase()!==r.code.toUpperCase())return err('Incorrect resource handover code. Check the resource QR label.');
  const condition=clean(input.condition,30);if(!['Excellent','Good','Worn','Damaged'].includes(condition))return err('Record the initial condition.');
  b.status='active';b.checkedInAt=now;b.initialCondition=condition;b.initialNote=clean(input.note,350);b.initialPhoto=clean(input.photo,800000);
  activity(db,user,'checkin',`Checked in to ${r.name}; initial condition: ${condition}`,b.id);notify(db,r.ownerId,'Resource checked out',`${user.name} checked into ${r.name}.`);
  return {message:'Check-in complete. Custody record created.'};
 }
 if(action==='checkout'){
  if(b.userId!==user.id)return err('Only the borrower can submit the return.',403);
  if(b.status!=='active')return err('You must check in before submitting a return.');
  const condition=clean(input.condition,30);if(!['Excellent','Good','Worn','Damaged'].includes(condition))return err('Select the final condition.');
  b.status='return_pending';b.checkedOutAt=now;b.finalCondition=condition;b.finalNote=clean(input.note,350);b.finalPhoto=clean(input.photo,800000);
  activity(db,user,'checkout',`Submitted ${r.name} for return verification; final condition: ${condition}`,b.id);
  notify(db,r.ownerId,'Return needs verification',`${r.name} has been returned by ${user.name}. Please confirm its condition.`);
  if(condition==='Damaged'){
   const incident={id:id(),bookingId:b.id,resourceId:r.id,reporterId:user.id,description:b.finalNote||'Borrower reported damage at return.',status:'open',createdAt:now};db.incidents.push(incident);
   activity(db,user,'incident',`Flagged damage on ${r.name} for human review`,b.id);
  }
  return {message:'Return submitted. Owner confirmation is required.'};
 }
 if(action==='confirmReturn'){
  if(!ownerCan(db,user,b))return err('Only a manager or owner may confirm the return.',403);
  if(b.status!=='return_pending')return err('Return is not awaiting confirmation.');
  b.status='returned';b.confirmedAt=now;b.confirmedBy=user.id;b.ownerNote=clean(input.note,250)||'Item received and custody closed';
  activity(db,user,'return',`Confirmed return of ${r.name}. ${b.ownerNote}`,b.id);notify(db,b.userId,'Return confirmed',`${r.name}: handover completed and logged.`);
  return {message:'Return confirmed. Full lifecycle complete.'};
 }
 if(action==='incident'){
  if(b.userId!==user.id&&!ownerCan(db,user,b))return err('Only a transaction participant can report an incident.',403);
  const description=clean(input.description,600);if(description.length<10)return err('Describe what happened in at least 10 characters.');
  const incident={id:id(),bookingId:b.id,resourceId:r.id,reporterId:user.id,description,status:'open',createdAt:now};db.incidents.push(incident);
  activity(db,user,'incident',`Reported incident on ${r.name}: ${description}`,b.id);notify(db,r.ownerId,'Incident requires review',`Report on ${r.name} awaits a manager decision.`);
  return {message:'Incident documented for human investigation.'};
 }
 if(action==='resolveIncident'){
  const incident=db.incidents.find(i=>i.id===input.incidentId);if(!incident)return err('Incident not found.');
  if(!ownerCan(db,user,b)||incident.bookingId!==b.id)return err('Not authorised to resolve this incident.',403);
  const resolution=clean(input.resolution,400);if(resolution.length<8)return err('Enter a meaningful human review outcome.');
  incident.status='resolved';incident.resolution=resolution;incident.resolvedBy=user.id;incident.resolvedAt=now;
  activity(db,user,'resolution',`Resolved incident: ${resolution}`,b.id);notify(db,b.userId,'Incident reviewed',resolution);
  return {message:'Resolution logged in the audit history.'};
 }
 return err('Unknown operation.',400);
}
