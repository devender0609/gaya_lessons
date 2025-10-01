const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];

// New storage namespace so fresh visitors see 0%
const K_DONE='bl42.done', K_RESULTS='bl42.results';

const COURSES=JSON.parse($('#COURSE_DATA').textContent);

// Storage helpers
const get=(k,def='{}')=>{ try{return JSON.parse(localStorage.getItem(k)||def)}catch{return JSON.parse(def)} };
const set=(k,v)=>localStorage.setItem(k, JSON.stringify(v));
const del=(k)=>localStorage.removeItem(k);

// UI helpers
function setRing(el,pct){ if(!el) return; const C=parseFloat(el.getAttribute('stroke-dasharray'))||0; el.style.strokeDashoffset=(C*(1-pct/100)).toFixed(2); }
function showSection(name){ $$('[data-section]').forEach(s=>s.hidden=s.dataset.section!==name); $$('.tab').forEach(t=>t.classList.toggle('active', t.dataset.nav===name)); history.replaceState(null,'','#'+name); }

document.addEventListener('click',(e)=>{
  const nav=e.target.closest('[data-nav]'); if(nav){ e.preventDefault(); showSection(nav.dataset.nav); }
  const close=e.target.closest('[data-close]'); if(close){ close.closest('dialog')?.close(); }
});

// Render courses & featured
function renderCourses(){
  $('#statLessons').textContent=COURSES.length;
  $('#statTotal').textContent=COURSES.length;
  const grid=$('#courseGrid'); grid.innerHTML='';
  const featured=$('#featuredGrid'); featured.innerHTML='';
  COURSES.forEach((c, i)=>{
    const card=buildCard(c);
    grid.appendChild(card.cloneNode(true));
    if(i<3) featured.appendChild(buildCard(c));
  });
  function buildCard(c){
    const card=document.createElement('article'); card.className='course-card';
    const count=c.quiz.length;
    card.innerHTML=`
      <div>
        <div class="badges">
          <span class="badge">${c.level}</span>
          <span class="badge">${c.time}</span>
          <span class="badge">${count} Q</span>
        </div>
        <div class="title">${c.title}</div>
        <p class="summary">${c.summary}</p>
      </div>
      <div class="row">
        <button class="btn primary" data-quiz="${c.id}">Start Quiz</button>
        <button class="btn" data-preview="${c.id}">Preview</button>
      </div>`;
    return card;
  }
}

// Progress + Insights
function renderProgress(){
  const done=get(K_DONE), total=COURSES.length;
  const completed=Object.keys(done).filter(k=>done[k]).length;
  const pct=Math.round((completed/total)*100)||0;

  // Home stats
  $('#statCompleted').textContent=completed;
  $('#statPercent').textContent=pct+'%';
  setRing($('#ringOverall'), pct);
  $('#ringOverallText').textContent=pct+'%';
  // Progress page stats
  setRing($('#ringOverall2'), pct);
  $('#ringOverallText2').textContent=pct+'%';
  $('#doneCount').textContent=completed; $('#totalCount').textContent=total;

  // Completed list
  const ul=$('#completedList'); ul.innerHTML='';
  COURSES.forEach(c=>{ if(done[c.id]){ const li=document.createElement('li'); li.textContent=c.title; ul.appendChild(li);} });

  // Insights
  const results=get(K_RESULTS, '{}');
  $('#synopsisText').textContent = buildSynopsis(results);
  renderNextSteps(results);
}

// Synopsis: strengths & focus areas (no scores here)
function buildSynopsis(results){
  const misses={}, corrects={};
  COURSES.forEach(c=>{
    const r=results[c.id];
    if(!r) return;
    c.quiz.forEach((q,i)=>{
      const ok = r.answers && r.answers[i]===q.answerIndex;
      const dict = ok ? corrects : misses;
      dict[q.tag]=(dict[q.tag]||0)+1;
    });
  });
  const tagNames={
    leadership_basics:"leadership fundamentals",
    conflict_resolution:"conflict resolution",
    teamwork_trust:"team trust & collaboration",
    feedback:"giving actionable feedback",
    customer_focus:"customer discovery & needs",
    value_prop:"value proposition clarity",
    cta:"clear calls‑to‑action",
    personas:"audience personas",
    profit:"profit basics",
    cashflow:"cash flow",
    runway:"runway planning",
    receivables:"speeding receivables"
  };
  const strengths = Object.entries(corrects).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>tagNames[k]||k);
  const gaps = Object.entries(misses).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>tagNames[k]||k);
  if(!Object.keys(results).length){
    return "Complete the courses to see personalized takeaways here.";
  }
  let lines = [];
  if(strengths.length) lines.push("Strengths: " + strengths.join(", ") + ".");
  if(gaps.length) lines.push("Focus next on: " + gaps.join(", ") + ".");
  if(!lines.length) lines.push("Nice work—no clear gaps detected. Try advanced topics next.");
  return lines.join("\n\n");
}

// Next steps from missed tags
function renderNextSteps(results){
  const steps=$('#nextSteps'); steps.innerHTML='';
  const missCounts={};
  COURSES.forEach(c=>{
    const r=results[c.id]; if(!r) return;
    c.quiz.forEach((q,i)=>{ if(!(r.answers && r.answers[i]===q.answerIndex)){ missCounts[q.tag]=(missCounts[q.tag]||0)+1; } });
  });
  const advice={
    leadership_basics:"Write a one‑paragraph leadership philosophy and share it with your team.",
    conflict_resolution:"Try the 'Listen–Label–Lead' script in your next disagreement.",
    teamwork_trust:"Run a 15‑minute weekly retrospective to build trust and clarity.",
    feedback:"Use SBI (Situation–Behavior–Impact) for your next feedback convo.",
    customer_focus:"Interview 3 customers and document their top 3 pains.",
    value_prop:"Rewrite your value prop: 'For [who], we help [do] so they can [result].'",
    cta:"Place a single clear CTA above the fold on your homepage.",
    personas:"Draft 2 lightweight personas including jobs‑to‑be‑done.",
    profit:"List top 5 costs and 3 quick ways to reduce each by 10%.",
    cashflow:"Send invoices same‑day; offer 1–2% discount for early payment.",
    runway:"Calculate runway = cash / monthly burn; set a target buffer.",
    receivables:"Introduce payment links on invoices to speed collection."
  };
  const top = Object.entries(missCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(!top.length){
    const li=document.createElement('li'); li.textContent="Great job! No gaps detected. Explore more advanced modules next."; steps.appendChild(li); return;
  }
  top.forEach(([k])=>{ const li=document.createElement('li'); li.textContent=advice[k]||('Study: '+k); steps.appendChild(li); });
}

// Quiz runtime
function startQuiz(course){
  const dlg=$('#quizModal'); const body=$('#quizBody'); let idx=0; const total=course.quiz.length; const answers=[];
  function updateRing(){ const pct=Math.round((idx/total)*100); setRing($('#ringFill'), pct); $('#ringPct').textContent=pct+'%'; }
  function renderQuestion(){
    const q=course.quiz[idx];
    body.innerHTML=`<h3 class="question">${idx+1}. ${q.q}</h3>
    <ul class="options">${q.options.map((o,i)=>`<li class="option" data-pick="${i}"><span>◎</span><span>${o}</span></li>`).join('')}</ul>`;
    $('#prevBtn').disabled=idx===0; updateRing();
  }
  body.onclick=(e)=>{
    const li=e.target.closest('.option'); if(!li) return;
    const pick=+li.dataset.pick; answers[idx]=pick;
    if(idx<total-1){ idx++; renderQuestion(); }
    else {
      let correct=0, missed=[]; course.quiz.forEach((q,i)=>{ if(answers[i]===q.answerIndex) correct++; else missed.push(i); });
      const res=get(K_RESULTS); res[course.id]={correct,total,answers,missed}; set(K_RESULTS,res);
      const d=get(K_DONE); d[course.id]=true; set(K_DONE,d);
      dlg.close();
      renderProgress();
      showSection('progress');
    }
  };
  $('#prevBtn').onclick=()=>{ if(idx>0){ idx--; renderQuestion(); } };
  dlg.showModal(); renderQuestion();
}

// Reset progress
function resetAll(){ del(K_DONE); del(K_RESULTS); renderProgress(); alert('Progress reset.'); }

// Events
document.addEventListener('click',(e)=>{
  const open=e.target.closest('[data-quiz]'); if(open){
    const id=open.dataset.quiz; const course=COURSES.find(c=>c.id===id); if(course) startQuiz(course);
  }
  const preview=e.target.closest('[data-preview]'); if(preview){
    const id=preview.dataset.preview; const course=COURSES.find(c=>c.id===id);
    if(course){ alert(`${course.title}\n\n${course.summary}\n\nLevel: ${course.level} • Time: ${course.time} • ${course.quiz.length} questions`); }
  }
  if(e.target.id==='resetAll'){ resetAll(); }
});

document.addEventListener('DOMContentLoaded',()=>{
  showSection((location.hash||'#home').slice(1)||'home');
  renderCourses(); renderProgress();
});