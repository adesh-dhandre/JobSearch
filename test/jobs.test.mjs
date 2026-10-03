import test from 'node:test';import assert from 'node:assert/strict';
import {parseJob,rankJobs,salary,experience,digestChunks} from '../lib/jobs.mjs';import {runScan,discover,queries} from '../lib/scan.mjs';
const base={company_name:'Example',title:'Technical Support Engineer',location:'Bengaluru, India',description:'Experience: 1-3 years. Work with SQL, API, logs, incident management. Salary 8-12 LPA.',apply_options:[{title:'Example Careers',link:'https://example.com/jobs/1'}]};
test('experience ranges preserve lower bounds and senior minimum excludes job',()=>{
 assert.equal(experience('1-3 years of experience').minYears,1);
 assert.equal(parseJob({...base,description:'Experience: 3-5 years. SQL API.'},'support'),null);
 assert.equal(parseJob({...base,description:'SQL API logs. 1-3 years of experience'},'support').minYears,1);
 assert.equal(parseJob({...base,location:'Austin, Texas'},'support'),null);
 assert.equal(parseJob({...base,apply_options:[{link:'javascript:alert(1)'}]},'support'),null);
});
test('salary priority requires explicit annual minimum and retains other jobs',()=>{
 assert.equal(salary('Salary 8-12 LPA').salaryPriority,2);assert.equal(salary('Salary 6-10 LPA').salaryPriority,1);
 assert.equal(salary('Salary up to 10 LPA').salaryPriority,1);assert.equal(salary('Estimated salary 10 LPA').salaryPriority,0);
 assert.equal(salary('Salary $100,000 annually').salaryMinLpa,null);
 const high=parseJob(base,'support');const low=parseJob({...base,company_name:'Low',description:'1-2 years of experience. SQL API logs. Salary 5 LPA.'},'support');const unknown=parseJob({...base,company_name:'Unknown',description:'1 year of experience. SQL API logs.'},'support');
 const ranked=rankJobs([low,unknown,high,high]);assert.equal(ranked.length,3);assert.equal(ranked[0].company,'Example');
});
test('Java and AI are separate categories and summaries reflect mentioned skills',()=>{
 assert.equal(parseJob({...base,title:'Java Developer',description:'Experience: 1-2 years. Java Spring Boot SQL.'},'java').category,'java');
 assert.equal(parseJob({...base,title:'AI Developer',description:'Experience: 1-2 years. Python LLM RAG.'},'ai').category,'ai');
 assert.equal(parseJob({...base,title:'Java Developer'},'ai'),null);
});
test('Discord digest stays within limits and neutralizes mentions',()=>{
 const j=parseJob(base,'support');const chunks=digestChunks({date:'2026-10-03',jobs:Array.from({length:24},()=>({...j,company:'@everyone'}))},'https://example.netlify.app');assert.ok(chunks.length>1);assert.ok(chunks.every(x=>x.length<=2000&&!x.includes('@everyone')));
});
function mockStore(){const map=new Map();return {map,async set(k,v,o){if(o?.onlyIfNew&&map.has(k))return {modified:false};map.set(k,v);return {modified:true};},async setJSON(k,v){map.set(k,structuredClone(v));},async get(k){return structuredClone(map.get(k)??null);},async delete(k){map.delete(k);}};}
test('notification retry reuses saved report; daily lock prevents repeat search',async()=>{
 process.env.SERPAPI_API_KEY='test';process.env.DISCORD_WEBHOOK_URL='test';let searches=0,sends=0;const store=mockStore();let fail=true;
 const deps={discover:async()=>{searches++;return [parseJob(base,'support')];},sendDiscord:async()=>{sends++;if(fail)throw new Error('Delivery failed');}};
 await assert.rejects(runScan(store,'https://example.netlify.app',deps));fail=false;await runScan(store,'https://example.netlify.app',deps);assert.equal(searches,1);assert.equal(store.map.get('latest').notification,'sent');assert.deepEqual(await runScan(store,'https://example.netlify.app',deps),{skipped:true});assert.equal(sends,2);
});
test('six cached searches consume no extra quota on retry; budget guard blocks calls',async()=>{
 const store=mockStore();const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({jobs_results:[base]});};
 try{await discover('2026-10-03',store);assert.equal(calls,6);assert.equal(queries.length,6);await discover('2026-10-03',store);assert.equal(calls,6);assert.equal(store.map.get('usage/2026-10').requests,6);await store.setJSON('usage/2026-10',{requests:240});await assert.rejects(discover('2026-10-04',store),/budget/);assert.equal(calls,6);}finally{globalThis.fetch=original;}
});
