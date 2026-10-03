import { timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { runScan } from '../../lib/scan.mjs';
export default async request => {
  const expected=process.env.CRON_SECRET;const received=request.headers.get('x-cron-secret')||'';
  if(request.method!=='POST'||!expected||Buffer.byteLength(expected)!==Buffer.byteLength(received)||!timingSafeEqual(Buffer.from(expected),Buffer.from(received)))return;
  const store=getStore({name:'pune-job-radar',consistency:'strong'});
  try{await runScan(store,process.env.URL);}catch(error){console.error('Job scan failed:',error.message);throw error;}
};
export const config={background:true};
