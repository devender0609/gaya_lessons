const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const K_DONE='bl460.done', K_RESULTS='bl460.results';
const COURSES=JSON.parse($('#COURSE_DATA').textContent);
const get=(k,def='{}')=>{ try{return JSON.parse(localStorage.getItem(k)||def)}catch{return JSON.parse(def)} };
const set=(k,v)=>localStorage.setItem(k, JSON.stringify(v));
const del=(k)=>localStorage.removeItem(k);
const uniq = arr => [...new Set(arr)];
const nice = s => (s || '').replace(/_/g, ' ');
function setRing(el,pct){ if(!el) return; const C=parseFloat(el.getAttribute('stroke-dasharray'))||0; el.style.strokeDashoffset=(C*(1-pct/100)).toFixed(2); }

function route(){
  const hash=(location.hash||'#home').slice(1);
  const [page, arg] = hash.split('/');
  $$('[data-route]').forEach(s=>s.hidden = s.dataset.route !== (page==='quiz'?'quiz':page));
  $$('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===page));
  if(page==='home'){ renderProgress(); }
  if(page==='courses'){ renderFeatured(); renderProgress(); }
  if(page==='progress'){ renderProgress(); }
  if(page==='quiz'){ const course=COURSES.find(c=>c.id===arg); if(course) startQuiz(course); else location.hash='#courses'; }
}
window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', ()=>{
  $('#search')?.addEventListener('input', renderFeatured);
  $('#level')?.addEventListener('change', renderFeatured);
  $('#resetAll')?.addEventListener('click', ()=>{ del(K_DONE); del(K_RESULTS); renderProgress(); alert('Progress reset.'); });
  route();
});

function buildCourseCard(c, idx){
  const card=document.createElement('article'); card.className='course-card accent-' + (idx % 5);
  const count=c.quiz.length;
  card.innerHTML=`
    <div>
      <div class="title">${c.title}</div>
      <p class="summary">${c.summary}</p>
      <div class="meta">
        <span class="pill">${c.level}</span>
        <span class="pill">${c.time}</span>
        <span class="pill">${count} Q</span>
      </div>
    </div>
    <div class="row">
      <a class="btn primary" href="#quiz/${c.id}" aria-label="Start ${c.title} quiz">Start Quiz</a>
      <a class="btn soft" href="#courses" title="Overview">Overview</a>
    </div>`;
  return card;
}
function renderFeatured(){
  const feat=$('#featuredGrid'); if(!feat) return;
  feat.innerHTML='';
  let list=[...COURSES];
  const q=$('#search')?.value?.toLowerCase().trim();
  const lvl=$('#level')?.value?.trim();
  if(q){ list=list.filter(c=>c.title.toLowerCase().includes(q)||c.summary.toLowerCase().includes(q)); }
  if(lvl){ list=list.filter(c=>c.level===lvl); }
  list.forEach((c,i)=>feat.appendChild(buildCourseCard(c,i)));
}

function buildSynopsis(results){
  const misses={}, corrects={};
  COURSES.forEach(c=>{
    const r=results[c.id]; if(!r) return;
    c.quiz.forEach((q,i)=>{
      const ok=r.answers && r.answers[i]===q.answerIndex;
      (ok?corrects:misses)[q.tag]=((ok?corrects:misses)[q.tag]||0)+1;
    });
  });
  const rank=(obj)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>nice(k));
  const strengths=rank(corrects), gaps=rank(misses);
  if(!Object.keys(results).length) return "Take the courses to see your personalized insights here.";
  let lines=[];
  if(strengths.length) lines.push("You're strong in " + strengths.join(", ") + ".");
  if(gaps.length) lines.push("Focus next on " + gaps.join(", ") + ".");
  if(!lines.length) lines.push("Great job—no obvious gaps detected. Explore more advanced topics next.");
  return lines.join("\n\n");
}
function buildCourseFindings(results){
  let out = [];
  COURSES.forEach(c => {
    const r = results[c.id];
    if(!r) return;
    const good = [], miss = [];
    c.quiz.forEach((q,i)=>{
      (r.answers && r.answers[i] === q.answerIndex ? good : miss).push(nice(q.tag));
    });
    if (good.length || miss.length){
      let line = `• ${c.title}: `;
      const g = uniq(good).slice(0,3);
      const m = uniq(miss).slice(0,3);
      if (g.length) line += `strong in ${g.join(', ')}. `;
      if (m.length) line += `focus on ${m.join(', ')}.`;
      out.push(line.trim());
    }
  });
  return out.length ? out.join('\n') : 'Take the courses to see course-by-course insights here.';
}

function renderProgress(){
  const done=get(K_DONE), total=COURSES.length;
  const completed=Object.keys(done).filter(k=>done[k]).length;
  const pct=Math.round((completed/total)*100)||0;
  $('#statLessons').textContent=total;
  $('#statTotal').textContent=total;
  $('#statCompleted').textContent=completed;
  $('#statPercent').textContent=pct+'%';
  setRing($('#ringOverall'), pct); $('#ringOverallText').textContent=pct+'%';
  setRing($('#ringOverall2'), pct); $('#ringOverallText2').textContent=pct+'%';
  $('#doneCount').textContent=completed; $('#totalCount').textContent=total;
  const results=get(K_RESULTS, '{}');
  $('#synopsisHome').textContent = buildSynopsis(results);
  $('#synopsisText').textContent = buildSynopsis(results);
  const cf = $('#courseFindings'); if (cf) cf.textContent = buildCourseFindings(results);
}

function startQuiz(course){
  const body=$('#quizBody'); let idx=0; const total=course.quiz.length; const answers=[];
  function setPct(){ const pct=Math.round((idx/total)*100); setRing($('#ringFill'), pct); $('#ringPct').textContent=pct+'%'; }
  function renderQ(){
    const q=course.quiz[idx];
    body.innerHTML=`<h2 class="question">${course.title}</h2>
      <h3 class="question">${idx+1}. ${q.q}</h3>
      <ul class="options">${q.options.map((o,i)=>`<li class="option" data-pick="${i}"><span class="dot"></span><span>${o}</span></li>`).join('')}</ul>`;
    $('#prevBtn').disabled=idx===0; setPct();
  }
  body.onclick=(e)=>{
    const li=e.target.closest('.option'); if(!li) return;
    const pick=+li.dataset.pick; answers[idx]=pick; li.classList.add('picked');
    setTimeout(()=>{
      if(idx<total-1){ idx++; renderQ(); }
      else {
        let missed=[]; course.quiz.forEach((q,i)=>{ if(answers[i]!==q.answerIndex) missed.push(i); });
        const res=get(K_RESULTS); res[course.id]={answers,missed}; set(K_RESULTS,res);
        const d=get(K_DONE); d[course.id]=true; set(K_DONE,d);
        location.hash='#progress';
      }
    },140);
  };
  $('#prevBtn').onclick=()=>{ if(idx>0){ idx--; renderQ(); } };
  renderQ();
}
