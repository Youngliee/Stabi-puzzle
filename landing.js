(function(){
  'use strict';
  const levels=window.ESCAPE_LEVELS,label=document.getElementById('play-label'),note=document.getElementById('resume-note');
  function refreshProgress(){
    label.textContent='BEGIN ESCAPE';note.hidden=true;note.textContent='';
    try{
      const saved=window.EscapeProgress.restore(levels,JSON.parse(localStorage.getItem('stabi-escape-v1')||'null'));
      const current=saved.current;
      const summary=window.EscapeResults.summarize(levels,saved.best,window.EscapeEngine.stars);
      if(summary.allComplete)label.textContent='PLAY AGAIN';
      else if(summary.completed||current>0)label.textContent='CONTINUE LVL '+(current+1);
      if(summary.completed){
        note.textContent=summary.completed+' / '+summary.totalLevels+' levels cleared · '+summary.stars+' / '+summary.maxStars+' ★';
        note.hidden=false;
      }
    }catch(_){/* The play link works normally when browser storage is unavailable. */}
  }
  refreshProgress();
  window.addEventListener('pageshow',refreshProgress);
  const notes=document.getElementById('fieldModal'),openNotes=document.getElementById('fieldBtn'),closeNotes=document.getElementById('closeField');
  let previousOverflow='';
  openNotes.addEventListener('click',()=>{
    if(typeof notes.showModal!=='function'){window.location.hash='guide';return;}
    if(notes.open)return;
    previousOverflow=document.body.style.overflow;notes.showModal();document.body.style.overflow='hidden';
  });
  closeNotes.addEventListener('click',()=>notes.close());
  notes.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;openNotes.focus();});
  notes.addEventListener('click',event=>{
    if(event.target!==notes)return;
    const rect=notes.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)notes.close();
  });
})();
