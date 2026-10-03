let jobs=[],category='all',query='';
const $=id=>document.getElementById(id);
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function safeLink(raw){try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function render(){
  const container=$('jobs');container.replaceChildren();
  const filtered=jobs.filter(j=>(category==='all'||j.category===category)&&[j.company,j.role,...j.skills].join(' ').toLowerCase().includes(query.toLowerCase()));
  $('all-count').textContent=jobs.length;$('java-count').textContent=jobs.filter(j=>j.category==='java').length;$('support-count').textContent=jobs.filter(j=>j.category==='support').length;$('ai-count').textContent=jobs.filter(j=>j.category==='ai').length;
  if(!filtered.length){const box=el('div',undefined,'empty');box.append(el('h3',jobs.length?'No matching roles':'No openings to show yet'),el('p',jobs.length?'Try another company, skill or category.':'The daily search will add matching listings here.'));container.append(box);return;}
  for(const j of filtered){
    const card=el('article',undefined,'job'),top=el('div',undefined,'card-top'),company=el('div',j.company,'company');
    if(j.isNew)company.append(el('span','NEW','new'));
    top.append(company,el('span',j.category==='ai'?'AI DEVELOPER':j.category==='java'?'JAVA':'SUPPORT',`type ${j.category==='ai'?'ai':''}`));
    card.append(top,el('h3',j.role),el('div',`${j.location} · ${j.workMode}`,'meta'),el('div',`Experience: ${j.experience}`,'meta'));
    if(j.category==='ai'&&j.aiExperience&&j.aiExperience!=='Not applicable')card.append(el('div',`AI experience: ${j.aiExperience}`,'meta'));
    card.append(el('div',`Salary: ${j.salary||'Not disclosed'}`,'meta'));if(j.category==='support'&&j.salaryPriority===2)card.append(el('div','₹8 LPA+ · salary priority','new'));const tags=el('div',undefined,'tags');for(const skill of j.skills)tags.append(el('span',skill,'tag'));card.append(tags);
    const fit=el('ul',undefined,'fit');for(const reason of j.fitReasons)fit.append(el('li',reason));card.append(fit);
    const bottom=el('div',undefined,'card-bottom');bottom.append(el('small',j.verification||'Check current availability on the application page.'));
    const href=safeLink(j.url);if(href){const a=el('a','Apply','apply');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',`Apply for ${j.role} at ${j.company}`);bottom.append(a);}card.append(bottom);container.append(card);
  }
}
async function load(){
  $('refresh').disabled=true;
  try{
    const r=await fetch('/.netlify/functions/jobs',{cache:'no-store'});if(!r.ok)throw new Error('feed unavailable');
    const data=await r.json();if(data.report){jobs=data.report.jobs;$('updated').textContent=`Last updated ${new Date(data.report.updatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})} IST`;
      $('notice').textContent=data.status?.state==='error'?data.status.message:data.status?.state==='running'?'Today’s search is running. The last completed shortlist is shown.':data.report.notification==='sent'?'Latest digest delivered to the connected Discord channel.':'Latest shortlist saved. Discord delivery is pending.';
    }else{await seed(data.configured?'Waiting for the first daily search. Initial support examples below.':'Automation setup pending. Initial support examples below; configure the search and Discord connection on Netlify.');}
  }catch{await seed('Live feed is unavailable in this preview. Showing the initial support examples, checked 3 October 2026.');}
  finally{$('refresh').disabled=false;render();}
}
async function seed(message){try{const r=await fetch('/seed.json');if(!r.ok)throw new Error();const data=await r.json();jobs=data.jobs;$('updated').textContent='Initial Pune support examples · checked 3 October 2026';$('notice').textContent=message;}catch{jobs=[];$('updated').textContent='Feed unavailable';$('notice').textContent='Unable to load openings. Please try refreshing.';}}
for(const button of document.querySelectorAll('[data-category]'))button.addEventListener('click',()=>{category=button.dataset.category;for(const b of document.querySelectorAll('[data-category]')){const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}render();});
$('search').addEventListener('input',e=>{query=e.target.value;render();});$('refresh').addEventListener('click',load);load();
