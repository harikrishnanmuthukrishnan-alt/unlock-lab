export const securityHeaders={
 'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
 'Permissions-Policy':'geolocation=(), microphone=(), camera=()',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};
export const isEmail=v=>typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const checkPassword=v=>typeof v==='string'&&v.length>=12&&v.length<=128;
export function parseSlot(start,end){
 const a=Date.parse(start),b=Date.parse(end);
 if(!Number.isFinite(a)||!Number.isFinite(b))return {ok:false,error:'Invalid date or time'};
 if(a<Date.now()-60_000||b-a<30*60_000||b-a>6*3600_000||a>Date.now()+60*86400_000)return {ok:false,error:'Choose a future slot of 30 minutes to 6 hours within 60 days'};
 return {ok:true,start:a,end:b};
}
export function validateAction(input){if(!input||typeof input!=='object'||Array.isArray(input))return null;return typeof input.action==='string'&&input.action.length<50?input.action:null;}
