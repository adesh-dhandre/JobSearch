import { parseJob, rankJobs, digestChunks } from './jobs.mjs';
export async function sendDiscord(content) {
  const url=new URL(process.env.DISCORD_WEBHOOK_URL);
  if(url.protocol!=='https:'||url.hostname!=='discord.com'||!/^\/api\/webhooks\/\d+\/[^/]+$/.test(url.pathname))throw new Error('Invalid Discord webhook configuration');
  url.searchParams.set('wait','true');
  for(let attempt=0;attempt<3;attempt++){
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content,allowed_mentions:{parse:[]}}),signal:AbortSignal.timeout(15000)});
    if(r.ok)return;
    if(r.status===429){const d=await r.json();await new Promise(resolve=>setTimeout(resolve,Math.min(30000,Math.max(1000,Number(d.retry_after)*1000))));continue;}
    throw new Error(`Discord delivery error ${r.status}`);
  }
  throw new Error('Discord rate limit exceeded');
}
export async function runScan(store, siteUrl, deps={discover,sendDiscord}) {
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const lockKey=`locks/${date}`;
  const lock=await store.set(lockKey,new Date().toISOString(),{onlyIfNew:true});
  if(!lock.modified)return {skipped:true};
  try{
    if(!process.env.SERPAPI_API_KEY||!process.env.DISCORD_WEBHOOK_URL)throw new Error('Add SERPAPI_API_KEY and DISCORD_WEBHOOK_URL to Netlify environment variables');
    await store.setJSON('status',{state:'running',startedAt:new Date().toISOString()});
    let report=await store.get(`reports/${date}`,{type:'json'});
    if(!report){
      const jobs=await deps.discover(date,store);
      const seen=await store.get('seen',{type:'json'})||[];
      const seenSet=new Set(seen);
      report={date,updatedAt:new Date().toISOString(),jobs:jobs.map(j=>({...j,isNew:!seenSet.has(j.id)})),notification:'pending',sentChunks:0,provider:'SerpApi Google Jobs'};
      await store.setJSON(`reports/${date}`,report);
      await store.setJSON('seen',[...new Set([...seen,...jobs.map(j=>j.id)])].slice(-5000));
    }
    await store.setJSON('latest',report);
    const chunks=digestChunks(report,siteUrl);
    for(let i=report.sentChunks||0;i<chunks.length;i++){
      await deps.sendDiscord(chunks[i]);report.sentChunks=i+1;
      await store.setJSON(`reports/${date}`,report);
    }
    report.notification='sent';await store.setJSON(`reports/${date}`,report);await store.setJSON('latest',report);
    await store.setJSON('status',{state:'complete',completedAt:new Date().toISOString(),notification:'sent'});
    return {count:report.jobs.length};
  }catch(error){
    // Do not log provider responses or webhook URLs, which may contain secrets.
    await store.setJSON('status',{state:'error',failedAt:new Date().toISOString(),message:'Daily scan or Discord delivery failed. Check Netlify Functions logs and configuration.'});
    await store.delete(lockKey);throw error;
  }
}

export const queries=[
 {category:'java',q:'Java developer 1 to 3 years India'},
 {category:'java',q:'Java backend developer junior India Spring Boot'},
 {category:'ai',q:'AI developer 1 to 3 years India'},
 {category:'ai',q:'Generative AI engineer junior India Python'},
 {category:'support',q:'technical support engineer SQL API India 1 year'},
 {category:'support',q:'application production support engineer India SQL 8 LPA'}
];
export async function discover(date,store){
 const all=[];
 for(let index=0;index<queries.length;index++){
  const key=`queries/${date}/${index}`;let data=await store.get(key,{type:'json'});
  if(!data){
   const monthKey=`usage/${date.slice(0,7)}`;const usage=await store.get(monthKey,{type:'json'})||{requests:0};
   if(usage.requests>=240)throw new Error('Monthly search budget reached');
   // Count attempts conservatively, including failed calls. Day lock serializes this worker.
   await store.setJSON(monthKey,{requests:usage.requests+1});
   const url=new URL('https://serpapi.com/search.json');
   for(const [k,v] of Object.entries({engine:'google_jobs',q:queries[index].q,location:'India',gl:'in',hl:'en',api_key:process.env.SERPAPI_API_KEY}))url.searchParams.set(k,v);
   let r;try{r=await fetch(url,{signal:AbortSignal.timeout(45000)});}catch{throw new Error('Search request timed out or failed');}
   if(!r.ok)throw new Error(`Search provider error ${r.status}`);
   data=await r.json();
   if(data.error&&!/no results|hasn.t returned any results/i.test(data.error))throw new Error('Search provider rejected the query; check key/quota');
   if(!Array.isArray(data.jobs_results)&&!data.error)throw new Error('Unexpected search result format');
   await store.setJSON(key,{jobs_results:data.jobs_results||[]});
  }
  all.push(...(data.jobs_results||[]).map(j=>parseJob(j,queries[index].category)).filter(Boolean));
 }
 return rankJobs(all);
}
