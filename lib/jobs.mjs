import { createHash } from 'node:crypto';
export function canonical(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.href.length>700)return null;u.hash='';for(const k of [...u.searchParams.keys()])if(/^(utm_|trk|source|ref$)/i.test(k))u.searchParams.delete(k);return u.href;}catch{return null;}}
export function experience(text){
 const ranges=[...text.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|technical\s+|software\s+|development\s+|work\s+)?experience/gi)];
 const singles=[...text.matchAll(/\b(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:relevant\s+|professional\s+|hands[- ]on\s+|work\s+|software\s+|development\s+)?experience/gi)];
 const prefixed=[...text.matchAll(/(?:experience|required experience)\s*[:\-]\s*(\d+(?:\.\d+)?)\s*(?:(?:-|–|to)\s*\d+(?:\.\d+)?)?\s*\+?\s*(?:years?|yrs?)/gi)];
 const all=[...ranges,...singles.filter(m=>!ranges.some(r=>m.index>=r.index&&m.index<r.index+r[0].length)),...prefixed].filter(m=>!/(?:preferred|desirable|nice to have)/i.test(text.slice(Math.max(0,m.index-25),m.index)));
 if(!all.length)return {minYears:null,experience:'Not specified — check listing'};
 const chosen=all.sort((a,b)=>Number(b[1])-Number(a[1]))[0];return {minYears:Number(chosen[1]),experience:chosen[0]};
}
export function salary(text){
 // Only explicit INR/lakh annual expressions. No company salary estimates or currency conversion.
 const matches=[...text.matchAll(/(?:₹|INR|Rs\.?\s*)?\s*(\d+(?:\.\d+)?)\s*(?:(?:-|–|to)\s*(?:₹|INR|Rs\.?)?\s*(\d+(?:\.\d+)?)\s*)?(?:LPA|lakhs?\s*(?:per\s*annum|\/\s*(?:year|annum)|annually|p\.?a\.?)|lacs?\s*(?:per\s*annum|\/\s*year|p\.?a\.?))/gi)];
 if(!matches.length)return {salary:'Not disclosed / not parsed',salaryMinLpa:null,salaryPriority:0};
 const m=matches[0],minimum=Number(m[1]),maximum=Number(m[2]||m[1]);
 const estimated=/estimate|estimated|average|typical/i.test(text.slice(Math.max(0,m.index-60),m.index+ m[0].length+35));
 const upTo=/up to|upto|maximum|as high as/i.test(text.slice(Math.max(0,m.index-20),m.index));
 const minimumKnown=!estimated&&!upTo;
 return {salary:`${m[0].trim()}${estimated?' (estimate; not confirmed)':upTo?' (upper limit)':''}`,salaryMinLpa:minimumKnown?minimum:null,salaryPriority:minimumKnown&&minimum>=8?2:!estimated&&maximum>=8?1:0};
}
const skills={SQL:/\bSQL\b/i,'Incident handling':/\bincident(?:s| management)?\b/i,RCA:/\bRCA\b|root[- ]cause/i,'Log analysis':/\blogs?\b|Splunk|Kibana/i,APIs:/\bAPIs?\b|REST|Postman/i,'Production support':/production support|application support/i,Java:/\bJava\b/i,'Spring Boot':/spring\s*boot/i,Microservices:/microservices/i,Python:/\bPython\b/i,LLMs:/\bLLMs?\b|large language model/i,RAG:/\bRAG\b|retrieval[- ]augmented/i,LangChain:/langchain/i,'Machine learning':/machine learning|\bML\b/i,'Deep learning':/deep learning|PyTorch|TensorFlow/i,Docker:/Docker/i,Git:/\bGit\b/i};
export function parseJob(j,category){
 const role=j.title||'',text=[j.description,...(j.job_highlights||[]).flatMap(h=>h.items||[])].filter(Boolean).join('\n');
 if(!j.company_name||!text||/\bintern(?:ship)?\b|\blead\b|\bprincipal\b|\barchitect\b|\bmanager\b/i.test(role))return null;
 if(category==='java'&&!/\bjava\b/i.test(role))return null;
 if(category==='ai'&&!/\bAI\b|artificial intelligence|machine learning|\bML\b|generative|\bLLM\b/i.test(role))return null;
 if(category==='support'&&!/support/i.test(role))return null;
 if(/no longer accepting|position (?:is )?(?:closed|filled)|job (?:has )?expired/i.test(text))return null;
 const loc=j.location||'';
 const indian=/\bindia\b|pune|bengaluru|bangalore|hyderabad|mumbai|chennai|delhi|noida|gurugram|gurgaon|kolkata|ahmedabad|indore|jaipur|kochi|coimbatore|chandigarh|thiruvananthapuram|nagpur|bhubaneswar|vadodara|mysore|mysuru|surat|lucknow|mohali|navi mumbai/i.test(loc);
 if(!indian&&(!/anywhere|remote/i.test(loc)||!/\bindia\b/i.test(text)))return null;
 const exp=experience(text);if(exp.minYears!==null&&exp.minYears>=3)return null;
 if(/\bsenior\b|\bsr\.?\b/i.test(role)&&!(/associate/i.test(role)))return null;
 const options=(j.apply_options||[]).filter(o=>canonical(o.link));if(!options.length)return null;
 options.sort((a,b)=>Number(/linkedin|indeed|naukri|foundit|glassdoor|ziprecruiter|job/i.test(a.title))-Number(/linkedin|indeed|naukri|foundit|glassdoor|ziprecruiter|job/i.test(b.title)));
 const url=canonical(options[0].link),matched=Object.entries(skills).filter(([,r])=>r.test(text)).map(([name])=>name);
 const focus=category==='support'?['SQL','Incident handling','RCA','Log analysis','APIs','Production support']:category==='java'?['Java','Spring Boot','Microservices','SQL','APIs']:['Python','LLMs','RAG','LangChain','Machine learning','Deep learning'];
 const relevant=matched.filter(s=>focus.includes(s));if(relevant.length<2)return null;
 const identity=`${j.company_name}|${role}|${loc}`.toLowerCase().replace(/[^a-z0-9|]/g,'');
 const aiEvidence=text.split(/[\n.!]/).find(line=>/experience/i.test(line)&&/\bAI\b|\bML\b|LLM|machine learning/i.test(line));
 return {id:createHash('sha256').update(identity).digest('hex').slice(0,16),company:j.company_name,role,category,location:indian?loc:`${loc} — India mentioned; confirm eligibility`,workMode:j.detected_extensions?.work_from_home?'Remote':/hybrid/i.test(text)?'Hybrid':'Not specified',...exp,...salary(text+'\n'+(j.extensions||[]).join('\n')),skills:matched.slice(0,10),fitReasons:[`Listing mentions ${relevant.join(', ')}.`,exp.minYears===null?'Experience not parsed; review the requirements.':`Experience evidence: ${exp.experience}.`],aiExperience:category==='ai'?(aiEvidence?.trim().slice(0,180)||'AI-specific experience not separately parsed'):'Not applicable',url,postedAt:j.detected_extensions?.posted_at||'Not specified',verification:`Google Jobs via ${j.via||options[0].title}; availability not independently verified`,fitScore:relevant.length*10+(exp.minYears===1?15:exp.minYears!==null?8:0)};
}
export function rankJobs(jobs){const unique=[...new Map(jobs.filter(Boolean).map(j=>[j.id,j])).values()];const out=[];for(const cat of ['java','ai','support'])out.push(...unique.filter(j=>j.category===cat).sort((a,b)=>(cat==='support'?b.salaryPriority-a.salaryPriority:0)||b.fitScore-a.fitScore).slice(0,8));return out;}
export function digestChunks(report,siteUrl){
 const esc=s=>String(s).replace(/[\\*_`~|<>]/g,' ').replace(/@/g,'＠');let chunk=`**India Job Radar · ${report.date}**\nJava + AI + Support · 1+ years\nSupport priority: ₹8 LPA or more\n${siteUrl}\n`;const chunks=[];
 for(const j of report.jobs){const row=`\n**${j.isNew?'NEW · ':''}${esc(j.company)} — ${esc(j.role).slice(0,140)}**\n${esc(j.location).slice(0,120)} | ${esc(j.experience).slice(0,130)}\nSalary: ${esc(j.salary).slice(0,120)}${j.category==='support'&&j.salaryPriority===2?' · PRIORITY':''}\nSkills mentioned: ${esc(j.skills.join(', ')).slice(0,200)}\n${j.url}\n`;if((chunk+row).length>1900){chunks.push(chunk);chunk='**India Job Radar · continued**\n';}chunk+=row;}
 if(!report.jobs.length)chunk+='\nNo matching listings found today.';chunks.push(chunk);return chunks;
}
