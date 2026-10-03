export default async () => {
  if(!process.env.CRON_SECRET) throw new Error('CRON_SECRET is missing');
  const origin=process.env.URL;
  if(!origin)throw new Error('Netlify site URL is missing');
  const r=await fetch(`${origin}/.netlify/functions/scan-background`,{method:'POST',headers:{'x-cron-secret':process.env.CRON_SECRET},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error(`Scan dispatch failed: ${r.status}`);
};
// Netlify schedules use UTC. 15:30 UTC = 21:00 Asia/Kolkata.
export const config={schedule:'30 15 * * *'};
