import { isCompanyApplication } from '../../lib/jobs.mjs';
import { getStore } from '@netlify/blobs';
export default async request => {
  if(request.method!=='GET')return new Response('Method not allowed',{status:405});
  try{
    const store=getStore({name:'pune-job-radar',consistency:'strong'});
    const [report,status]=await Promise.all([store.get('latest',{type:'json'}),store.get('status',{type:'json'})]);
    if(report)report.jobs=report.jobs.filter(j=>isCompanyApplication(j.url,j.company));
    return Response.json({report,status,configured:!!(process.env.SERPAPI_API_KEY&&process.env.DISCORD_WEBHOOK_URL&&process.env.CRON_SECRET)},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Job feed is unavailable. Try again later.'},{status:503});}
};
