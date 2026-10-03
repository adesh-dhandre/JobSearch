import { getStore } from '@netlify/blobs';
import { manualHandler } from '../../lib/manual.mjs';
export default manualHandler({
 storeFactory:()=>getStore({name:'pune-job-radar',consistency:'strong'}),
 dispatch:async(origin,secret)=>{
  const r=await fetch(`${origin}/.netlify/functions/scan-background`,{method:'POST',headers:{'x-cron-secret':secret},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error('Dispatch failed');
 }
});
