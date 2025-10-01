const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];

// Storage keys
const K_DONE='bl4.done', K_RESULTS='bl4.results';

// Read course data
const COURSES=JSON.parse($('#COURSE_DATA').textContent);

// Utility
const get=(k,def='{}')=>{ try{return JSON.parse(localStorage.getItem(k)||def)}catch{return JSON.parse(def)} };
const set=(k,v)=>localStorage.setItem(k, JSON.stringify(v));
function setRing(el,pct){ if(!el) return; const C=parseFloat(el.getAttribute('stroke-dasharray'))||0; el.style.strokeDashoffset=(C*(1-pct/100)).toFixed(2); }
function showSection(name){ $$('[data-section]').forEach(s=>s.hidden=s.dataset.section!==name); $$('.tab').forEach(t=>t.classList.toggle('active', t.dataset.nav===name)); history.replaceState(null,'','#'+name); }

document.addEventListener('click',(e)=>{
  const nav=e.target.closest('[data-nav]'); if(nav){ e.preventDefault(); showSection(nav.dataset.nav); }
  const close=e.target.closest('[data-close]'); if(close){ close.closest('dialog')?.close(); }
});

// Render Courses grid
function renderCourses(){
  const grid=$('#courseGrid'); grid.innerHTML='';
  const done=get(K_DONE); $('#statLessons').textContent=COURSES.length;
  COURSES.forEach(c=>{
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
    grid.appendChild(card);
  });
}

// Global progress
function renderGlobal(){
  const done=get(K_DONE), total=COURSES.length;
  const completed=Object.keys(done).filter(k=>done[k]).length;
  const pct=Math.round((completed/total)*100)||0;
  $('#statCompleted').textContent=completed; $('#statPercent').textContent=pct+'%';
  setRing($('#ringOverall'), pct); setRing($('#ringOverall2'), pct);
  const t1=$('#ringOverallText'), t2=$('#ringOverallText2');
  if(t1) t1.textContent=pct+'%'; if(t2) t2.textContent=pct+'%';
  $('#doneCount').textContent=completed; $('#totalCount').textContent=total;
  const ul=$('#completedList'); ul.innerHTML='';
  COURSES.forEach(c=>{ if(done[c.id]){ const li=document.createElement('li'); li.textContent=c.title; ul.appendChild(li);} });
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
      dlg.close(); renderGlobal();
      const doneCount=Object.keys(get(K_DONE)).filter(k=>get(K_DONE)[k]).length;
      if(doneCount===COURSES.length){ downloadSummary(); showSection('progress'); }
    }
  };
  $('#prevBtn').onclick=()=>{ if(idx>0){ idx--; renderQuestion(); } };
  dlg.showModal(); renderQuestion();
}

// Download HTML summary
function downloadSummary(){
  const results=get(K_RESULTS, '{}');
  let html=`<!doctype html><meta charset="utf-8"><title>BizLearn Summary</title>
  <style>body{font-family:Inter,Arial,sans-serif;padding:20px}h1{margin:0 0 10px}table{border-collapse:collapse}td,th{border:1px solid #dde3ee;padding:8px 10px}</style>
  <h1>BizLearn — Summary</h1><table><tr><th>Course</th><th>Score</th></tr>`;
  COURSES.forEach(c=>{
    const r=results[c.id]; const line=r?`${r.correct}/${r.total}`:'—';
    html+=`<tr><td>${c.title}</td><td>${line}</td></tr>`;
  });
  html+='</table>';
  const blob=new Blob([html],{type:'text/html'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='bizlearn-summary.html'; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

// Event delegation for course buttons
document.addEventListener('click',(e)=>{
  const open=e.target.closest('[data-quiz]'); if(open){
    const id=open.dataset.quiz; const course=COURSES.find(c=>c.id===id); if(course) startQuiz(course);
  }
  const preview=e.target.closest('[data-preview]'); if(preview){
    const id=preview.dataset.preview; const course=COURSES.find(c=>c.id===id);
    if(course){ alert(`${course.title}\n\n${course.summary}\n\nLevel: ${course.level} • Time: ${course.time} • ${course.quiz.length} questions`); }
  }
  const dl=e.target.closest('#downloadReport'); if(dl){ downloadSummary(); }
});

document.addEventListener('DOMContentLoaded',()=>{
  showSection((location.hash||'#home').slice(1)||'home');
  renderCourses(); renderGlobal();
});