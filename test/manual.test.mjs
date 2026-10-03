import test from 'node:test';import assert from 'node:assert/strict';import {manualHandler} from '../lib/manual.mjs';
const env={CRON_SECRET:'private-test-code',SERPAPI_API_KEY:'test',DISCORD_WEBHOOK_URL:'test',URL:'https://jobs.netlify.app'};
const request=(key='private-test-code',method='POST',origin='https://jobs.netlify.app')=>new Request('https://jobs.netlify.app/.netlify/functions/manual-scan',{method,headers:{Authorization:`Bearer ${key}`,Origin:origin}});
test('manual endpoint rejects wrong code, cross-origin calls and wrong methods without dispatching',async()=>{
 let calls=0;const handler=manualHandler({env,storeFactory:()=>({get:async()=>null}),dispatch:async()=>{calls++;}});
 assert.equal((await handler(request('bad'))).status,401);assert.equal((await handler(request('private-test-code','GET'))).status,405);assert.equal((await handler(request('private-test-code','POST','https://other.example'))).status,403);assert.equal(calls,0);
});
test('authorized scan queues worker without revealing credentials',async()=>{
 let args;const handler=manualHandler({env,storeFactory:()=>({get:async()=>null}),dispatch:async(...a)=>{args=a;}});const response=await handler(request());assert.equal(response.status,202);const body=await response.text();assert.ok(!body.includes(env.CRON_SECRET));assert.deepEqual(args,[env.URL,env.CRON_SECRET]);
});
test('completed daily scan returns success without another search or digest',async()=>{
 let calls=0;const handler=manualHandler({env,storeFactory:()=>({get:async k=>k.startsWith('locks/')?'locked':{notification:'sent'}}),dispatch:async()=>{calls++;}});const response=await handler(request());assert.equal((await response.json()).state,'complete');assert.equal(calls,0);
});
