import { timingSafeEqual } from 'node:crypto';
export function authorized(request,secret){const supplied=request.headers.get('authorization')||'';const expected=`Bearer ${secret}`;return !!secret&&Buffer.byteLength(supplied)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(supplied),Buffer.from(expected));}
export function manualHandler({storeFactory,dispatch,env=process.env}){
 return async request=>{
  const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
  if(request.method!=='POST')return reply({message:'Use POST to start a scan.'},405);
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({message:'Request origin is not allowed.'},403);
  if(!authorized(request,env.CRON_SECRET))return reply({message:'Incorrect owner access code.'},401);
  if(!env.SERPAPI_API_KEY||!env.DISCORD_WEBHOOK_URL||!env.URL)return reply({message:'Search or Discord configuration is missing on Netlify.'},503);
  try{
   const store=storeFactory();const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const lock=await store.get(`locks/${date}`);
   if(lock){const report=await store.get(`reports/${date}`,{type:'json'});return reply({message:report?.notification==='sent'?'Today’s search is complete and the Discord digest has been sent.':'A scan is already running or queued today. Refresh the feed shortly.',state:report?.notification==='sent'?'complete':'running'});}
   await dispatch(env.URL,env.CRON_SECRET);
   return reply({message:'Search started. Your shortlist and Discord digest will update in a few minutes.',state:'queued'},202);
  }catch{return reply({message:'Could not start the scan. Check Netlify function logs and try again.'},502);}
 };
}
