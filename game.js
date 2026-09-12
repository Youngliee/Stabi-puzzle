(function(){
  'use strict';
  const E=window.EscapeEngine,levels=window.ESCAPE_LEVELS,$=id=>document.getElementById(id),board=$('board');
  const S=window.EscapeSound||{available:false,enabled:false,stop(){},slide(){},victory(){},toggle(){}};
  const R=window.EscapeResults;
  const SVG_NS='http://www.w3.org/2000/svg';
  // Display the supplied artwork through a tight viewport; the source PNGs stay unchanged.
  const BLOCK_ART={
    stabi:{src:'assets/block-stabi.png',viewBox:'91 115 1593 657'},
    mev:{src:'assets/block-mev.png',viewBox:'80 138 1608 593',clip:'M228 138H1546Q1688 138 1688 280V584Q1688 731 1540 731H229Q80 731 80 586V283Q80 138 228 138Z'},
    slippage:{src:'assets/block-slippage.png',viewBox:'94 112 1591 623',clip:'M221 156H480C515 120 554 109 585 127C608 138 618 149 620 156H1550Q1685 156 1685 290V608Q1685 735 1550 735H225Q94 735 94 604V290Q94 156 221 156Z'}
  };
  let scoreReturn=null,scoreJob=0,scoreURL=null,scoreFile=null,scoreSnapshot=null,avatarPromise=null,sharing=false;
  let hintWorker=null,hintTimer=null,hintJob=0,hintIndex=-1;
  const STORE='stabi-escape-v1';let storageOK=true,progress={unlocked:0,current:0,best:{},hintsUsed:{}},state=[],history=[],count=0,current=0,selected=0,drag=null,won=false,timer=null,elements=[],returnFocus=null;
  try{progress=window.EscapeProgress.restore(levels,JSON.parse(localStorage.getItem(STORE)||'null'));}catch(_){storageOK=false;}
  function save(){try{localStorage.setItem(STORE,JSON.stringify(progress));}catch(_){storageOK=false;$('notice').textContent='Progress cannot be saved in this browser.';}}
  function setNotice(text){$('notice').textContent=text;}
  function unit(){return board.clientWidth/6;}
  function pieceName(p){return p.id==='S'?'Stabi':p.axis==='v'?'MEV':'Slippage';}
  function renderHintButton(){
    const remaining=window.EscapeProgress.hintsRemaining(progress,current),button=$('hint-button');
    button.disabled=won||remaining===0;
    $('hint-label').textContent='Hint · '+remaining+'/3';
    button.setAttribute('aria-label','Hint, '+remaining+' of 3 remaining for this level');
    button.title=remaining?'Show one suggested move':'All 3 hints used for this level';
  }
  function clearHint(){
    hintJob++;clearTimeout(hintTimer);hintTimer=null;
    if(hintWorker){hintWorker.terminate();hintWorker=null;}
    if(elements[hintIndex])elements[hintIndex].classList.remove('hinted');
    hintIndex=-1;$('hint-panel').hidden=true;$('hint-text').textContent='';
    $('hint-button').setAttribute('aria-expanded','false');renderHintButton();
  }
  function requestHint(){
    if(won||modalIsOpen()||drag||window.EscapeProgress.hintsRemaining(progress,current)===0)return;
    clearHint();
    const job=hintJob;let settled=false;
    $('hint-panel').hidden=false;$('hint-button').disabled=true;
    $('hint-button').setAttribute('aria-expanded','true');$('hint-label').textContent='Finding…';
    $('hint-text').textContent='Finding one move from your current position…';
    function complete(move){
      if(job!==hintJob||settled)return;
      settled=true;
      clearTimeout(hintTimer);hintTimer=null;
      if(hintWorker){hintWorker.terminate();hintWorker=null;}
      if(!move||!E.move(state,move[0],move[1])){
        renderHintButton();
        $('hint-text').textContent='No hint was used. Try again, or make room above or below the MEV blocking Stabi.';
        return;
      }
      if(!window.EscapeProgress.useHint(progress,current)){clearHint();return;}
      save();renderHintButton();
      const [index,delta]=move,p=state[index],direction=p.axis==='h'?(delta<0?'left':'right'):(delta<0?'up':'down');
      hintIndex=index;select(index);elements[index].classList.add('hinted');
      $('hint-text').textContent='Move the highlighted '+pieceName(p)+' at column '+(p.x+1)+', row '+(p.y+1)+', '+Math.abs(delta)+' '+(Math.abs(delta)===1?'space':'spaces')+' '+direction+'.';
    }
    try{
      hintWorker=new Worker('hint-worker.js');
      hintWorker.onmessage=event=>{if(event.data.id===job)complete(event.data.move);};
      hintWorker.onerror=()=>complete(null);
      hintWorker.postMessage({id:job,state:state.map(p=>({...p}))});
      hintTimer=setTimeout(()=>complete(null),10000);
    }catch(_){complete(null);}
  }
  function addPieceArt(el,p,index){
    const art=BLOCK_ART[p.id==='S'?'stabi':p.axis==='v'?'mev':'slippage'];
    const label=document.createElement('span');
    label.className='block-fallback';label.textContent=pieceName(p)+(p.id==='S'?' →':'');label.setAttribute('aria-hidden','true');el.append(label);
    const svg=document.createElementNS(SVG_NS,'svg');
    svg.setAttribute('class','piece-art');svg.setAttribute('viewBox',art.viewBox);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    const img=document.createElementNS(SVG_NS,'image');
    img.setAttribute('width','1774');img.setAttribute('height','887');
    if(art.clip){
      const defs=document.createElementNS(SVG_NS,'defs'),clip=document.createElementNS(SVG_NS,'clipPath'),path=document.createElementNS(SVG_NS,'path'),id='block-clip-'+index;
      clip.setAttribute('id',id);clip.setAttribute('clipPathUnits','userSpaceOnUse');path.setAttribute('d',art.clip);path.setAttribute('fill','#fff');clip.append(path);defs.append(clip);svg.append(defs);img.setAttribute('clip-path','url(#'+id+')');
    }
    img.addEventListener('load',()=>el.classList.add('art-ready'),{once:true});
    img.addEventListener('error',()=>{svg.remove();el.classList.remove('art-ready');},{once:true});
    svg.append(img);el.append(svg);img.setAttribute('href',art.src);
  }
  function renderPiece(i,delta=0){
    const p=state[i],el=elements[i],u=unit(),pad=Math.max(3,u*.065),w=(p.axis==='h'?p.len:1)*u-pad*2,h=(p.axis==='v'?p.len:1)*u-pad*2;
    el.style.left=(p.x*u+pad+(p.axis==='h'?delta:0))+'px';el.style.top=(p.y*u+pad+(p.axis==='v'?delta:0))+'px';el.style.width=w+'px';el.style.height=h+'px';
    el.style.setProperty('--art-width',(p.axis==='v'?h:w)+'px');el.style.setProperty('--art-height',(p.axis==='v'?w:h)+'px');
    el.classList.toggle('selected',i===selected);el.setAttribute('aria-pressed',i===selected?'true':'false');el.setAttribute('aria-label',pieceName(p)+', '+(p.axis==='h'?'horizontal':'vertical')+', column '+(p.x+1)+', row '+(p.y+1));
  }
  function render(){state.forEach((_,i)=>renderPiece(i));$('moves').textContent=count;$('target').textContent=levels[current].par+' moves';$('best').textContent=progress.best[current]===undefined?'—':progress.best[current];$('undo').disabled=!history.length||won;const p=state[selected],b=E.bounds(state,selected);$('move-back').textContent=p.axis==='h'?'←':'↑';$('move-forward').textContent=p.axis==='h'?'→':'↓';$('move-back').setAttribute('aria-label','Move '+pieceName(p)+' '+(p.axis==='h'?'left':'up'));$('move-forward').setAttribute('aria-label','Move '+pieceName(p)+' '+(p.axis==='h'?'right':'down'));$('move-back').disabled=won||b.min===0;$('move-forward').disabled=won||b.max===0;$('selection-label').textContent=pieceName(p)+' selected · move '+(p.axis==='h'?'left / right':'up / down');const clear=E.bounds(state,0).max===4-state[0].x;board.classList.toggle('ready',clear);$('instruction').textContent=clear?'Path clear! Slide Stabi into the portal on the right.':'Slide Slippage and MEV, then guide Stabi to the exit on the right.';}
  function activeModal(){return ['score-modal','level-modal','win-modal'].find(id=>!$(id).hidden);}
  function modalIsOpen(){return !!activeModal();}
  function totals(){return R.summarize(levels,progress.best,E.stars);}
  function select(i){selected=i;render();}
  function loadLevel(index){
    clearHint();
    cancelDrag();clearTimeout(timer);S.stop();scoreJob++;scoreReturn=null;scoreFile=null;scoreSnapshot=null;$('score-modal').hidden=true;board.parentElement.classList.remove('celebrating');timer=null;current=Math.max(0,Math.min(levels.length-1,index));state=levels[current].pieces.map(p=>({...p}));history=[];count=0;selected=0;won=false;board.replaceChildren();elements=[];
    renderHintButton();
    $('level-modal').hidden=true;$('win-modal').hidden=true;document.body.style.overflow='';$('level-number').textContent='LEVEL '+String(current+1).padStart(2,'0')+' / '+levels.length;$('level-title').textContent=levels[current].name;$('difficulty').textContent=current<2?'Warm-up':current<6?'Think ahead':current<10?'Challenge':current<14?'Expert':'Final';setNotice(storageOK?'': 'Progress cannot be saved in this browser.');
    state.forEach((p,i)=>{const el=document.createElement('button');el.type='button';el.className='piece '+(p.axis==='v'?'vertical':'horizontal')+(p.id==='S'?' stabi':p.axis==='v'?' mev':' slippage');el.dataset.index=i;addPieceArt(el,p,i);el.addEventListener('pointerdown',ev=>pointerDown(ev,i));el.addEventListener('click',()=>{if(!won&&!modalIsOpen())select(i);});board.appendChild(el);elements.push(el);});
    progress.current=current;save();render();
  }
  function commit(i,delta){if(won)return false;const next=E.move(state,i,delta);if(!next){if(delta!==0){elements[i].classList.remove('bump');void elements[i].offsetWidth;elements[i].classList.add('bump');setNotice('That block is blocked. Try moving another one.');}render();return false;}clearHint();history.push(state.map(p=>({...p})));state=next;count++;selected=i;setNotice('');render();S.slide(delta);if(E.solved(state))finish();return true;}
  function finish(){
    won=true;
    clearHint();
    progress.best[current]=Math.min(progress.best[current]===undefined?Infinity:progress.best[current],count);
    progress.unlocked=Math.max(progress.unlocked,Math.min(levels.length-1,current+1));
    progress.current=Math.min(levels.length-1,current+1);
    save();render();S.victory();
    board.parentElement.classList.add('celebrating');
    elements[0].classList.add('escaped');
    setNotice('Stabi reached the portal!');
    const reducedMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer=setTimeout(()=>{
      const stars=E.stars(count,levels[current].par);
      $('win-stars').replaceChildren();
      for(let i=0;i<3;i++){
        const star=document.createElement('span');
        star.className=i<stars?'earned':'empty';
        star.textContent='★';star.style.setProperty('--order',i);star.setAttribute('aria-hidden','true');
        $('win-stars').append(star);
      }
      $('win-stars').setAttribute('aria-label',stars+' stars');
      const summary=totals();
      $('win-total-stars').textContent=summary.stars+' / '+summary.maxStars+' ★';
      $('win-completed').textContent=summary.completed+' / '+summary.totalLevels;
      $('win-title').textContent=summary.allComplete?'All levels cleared!':'Stabi made it!';
      $('win-summary').textContent='Level '+(current+1)+' cleared in '+count+' moves. Your best: '+progress.best[current]+'.';
      $('next-level').innerHTML=current===levels.length-1?'Choose level <span>▦</span>':'Next level <span>→</span>';
      openModal('win-modal');
    },reducedMotion?120:850);
  }
  function getAvatar(){
    const existing=document.querySelector('.winner-stabi');
    if(existing&&existing.complete&&existing.naturalWidth)return Promise.resolve(existing);
    if(!avatarPromise)avatarPromise=new Promise(resolve=>{
      const img=new Image();let done=false;
      const finish=image=>{if(done)return;done=true;clearTimeout(timeout);resolve(image);};
      const timeout=setTimeout(()=>finish(null),5000);
      img.onload=()=>finish(img);img.onerror=()=>finish(null);img.src='assets/block-stabi.png';
    });
    return avatarPromise;
  }
  async function prepareCard(summary,job){
    try{
      const mascot=await getAvatar();
      if(job!==scoreJob||$('score-modal').hidden)return;
      const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
      if(!context)throw new Error('Canvas unavailable');
      R.drawCard(context,summary,mascot);
      const blob=await new Promise((resolve,reject)=>{
        if(!canvas.toBlob){reject(new Error('PNG unavailable'));return;}
        canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG empty')),'image/png');
      });
      if(job!==scoreJob||$('score-modal').hidden)return;
      if(scoreURL)URL.revokeObjectURL(scoreURL);
      scoreURL=URL.createObjectURL(blob);
      const filename='stabi-escape-'+summary.stars+'-of-'+summary.maxStars+'-stars.png';
      $('score-preview').src=scoreURL;
      $('score-preview').alt='Stabi Escape scorecard: '+summary.stars+' of '+summary.maxStars+' stars, '+summary.completed+' of '+summary.totalLevels+' levels cleared.';
      $('score-preview').hidden=false;$('score-card-status').hidden=true;
      $('download-score').href=scoreURL;$('download-score').download=filename;$('download-score').hidden=false;
      try{
        scoreFile=new File([blob],filename,{type:'image/png'});
        $('share-image').hidden=!(navigator.share&&navigator.canShare&&navigator.canShare({files:[scoreFile]}));
      }catch(_){scoreFile=null;$('share-image').hidden=true;}
      $('score-card-frame').setAttribute('aria-busy','false');
    }catch(_){
      if(job!==scoreJob||$('score-modal').hidden)return;
      $('score-card-status').textContent='The card could not be created in this browser. You can still share your score text on X.';
      $('score-card-frame').setAttribute('aria-busy','false');
    }
  }
  function showScore(){
    if(!$('score-modal').hidden)return;
    cancelDrag();S.stop();
    scoreReturn={modal:activeModal(),focus:document.activeElement,previousFocus:returnFocus};
    if(scoreReturn.modal)$(scoreReturn.modal).hidden=true;
    const summary=totals();scoreSnapshot=summary;scoreFile=null;const job=++scoreJob;
    $('score-title').textContent=summary.allComplete?'All levels cleared!':'Stabi Escape score';
    $('score-intro').textContent='Your total uses the best star rating from each level.';
    $('score-total-stars').textContent=summary.stars+' / '+summary.maxStars+' ★';
    $('score-completed').textContent=summary.completed+' / '+summary.totalLevels;
    $('score-preview').hidden=true;$('score-preview').removeAttribute('src');
    $('score-card-status').hidden=false;$('share-status').textContent='';
    $('download-score').hidden=true;$('download-score').removeAttribute('href');
    $('share-image').hidden=true;$('share-image').disabled=false;
    $('score-actions').hidden=summary.completed===0;
    $('share-x').href='https://twitter.com/intent/tweet?text='+encodeURIComponent(R.shareText(summary));
    $('score-card-frame').setAttribute('aria-busy',summary.completed?'true':'false');
    $('score-card-status').textContent=summary.completed?'Preparing your scorecard…':'Clear one level to create your scorecard.';
    openModal('score-modal');
    if(summary.completed)prepareCard(summary,job);
  }
  function closeScore(){
    scoreJob++;$('score-modal').hidden=true;
    const back=scoreReturn;scoreReturn=null;
    if(back&&back.modal){
      $(back.modal).hidden=false;document.body.style.overflow='hidden';returnFocus=back.previousFocus;
      if(back.focus&&document.contains(back.focus))back.focus.focus();
    }else{
      document.body.style.overflow='';if(returnFocus&&document.contains(returnFocus))returnFocus.focus();
    }
  }
  async function shareImage(){
    if(!scoreFile||!scoreSnapshot||sharing)return;
    sharing=true;$('share-image').disabled=true;$('share-status').textContent='';
    const job=scoreJob;
    try{
      await navigator.share({files:[scoreFile],title:'Stabi Escape',text:R.shareText(scoreSnapshot)});
    }catch(error){
      if(job===scoreJob&&error.name!=='AbortError')$('share-status').textContent='Download the PNG, then attach it in your chosen app.';
    }finally{
      sharing=false;if(job===scoreJob)$('share-image').disabled=false;
    }
  }
  function pointerDown(ev,i){if(won||modalIsOpen()||drag||ev.button>0)return;ev.preventDefault();if(hintWorker)clearHint();select(i);const el=elements[i],axis=state[i].axis;drag={i,id:ev.pointerId,start:axis==='h'?ev.clientX:ev.clientY,delta:0,unit:unit(),bounds:E.bounds(state,i)};el.classList.add('dragging');try{el.setPointerCapture(ev.pointerId);}catch(_){}el.addEventListener('pointermove',pointerMove);el.addEventListener('pointerup',pointerUp);el.addEventListener('pointercancel',pointerCancel);el.addEventListener('lostpointercapture',pointerCancel);}
  function pointerMove(ev){if(!drag||ev.pointerId!==drag.id)return;ev.preventDefault();const axis=state[drag.i].axis,raw=(axis==='h'?ev.clientX:ev.clientY)-drag.start;drag.delta=Math.max(drag.bounds.min*drag.unit,Math.min(drag.bounds.max*drag.unit,raw));renderPiece(drag.i,drag.delta);}
  function cleanupDrag(){if(!drag)return null;const d=drag;drag=null;const el=elements[d.i];el.classList.remove('dragging');el.removeEventListener('pointermove',pointerMove);el.removeEventListener('pointerup',pointerUp);el.removeEventListener('pointercancel',pointerCancel);el.removeEventListener('lostpointercapture',pointerCancel);try{if(el.hasPointerCapture(d.id))el.releasePointerCapture(d.id);}catch(_){}return d;}
  function pointerUp(ev){if(!drag||ev.pointerId!==drag.id)return;pointerMove(ev);const d=cleanupDrag();commit(d.i,Math.round(d.delta/d.unit));}
  function pointerCancel(ev){if(drag&&ev.pointerId===drag.id){cleanupDrag();render();}}
  function cancelDrag(){if(drag){cleanupDrag();render();}}
  function openModal(id){cancelDrag();clearHint();returnFocus=document.activeElement;$(id).hidden=false;document.body.style.overflow='hidden';const focus=$(id).querySelector('button:not(:disabled)');if(focus)focus.focus();}
  function closeLevels(){$('level-modal').hidden=true;document.body.style.overflow='';if(returnFocus&&document.contains(returnFocus))returnFocus.focus();}
  function showLevels(){clearTimeout(timer);S.stop();$('win-modal').hidden=true;const summary=totals();$('level-total-stars').textContent=summary.stars+' / '+summary.maxStars+' ★';$('level-completed').textContent=summary.completed+' / '+summary.totalLevels+' levels cleared';const grid=$('level-grid');grid.replaceChildren();levels.forEach((lv,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='level-option'+(i===current?' active':'');btn.disabled=i>progress.unlocked;btn.setAttribute('aria-label','Level '+(i+1)+', '+lv.name+(btn.disabled?', locked':''));btn.textContent=i>progress.unlocked?'🔒':i+1;const star=document.createElement('span');star.textContent=progress.best[i]!==undefined?'★'.repeat(E.stars(progress.best[i],lv.par)):'—';btn.appendChild(star);btn.addEventListener('click',()=>loadLevel(i));grid.appendChild(btn);});openModal('level-modal');}
  $('undo').addEventListener('click',()=>{cancelDrag();if(!history.length||won)return;clearHint();state=history.pop();count=Math.max(0,count-1);setNotice('Last move undone.');render();S.slide(1);});
  $('hint-button').addEventListener('click',requestHint);
  $('close-hint').addEventListener('click',()=>{clearHint();$('hint-button').focus();});
  function renderSound(){const on=S.enabled,button=$('sound-toggle');button.disabled=!S.available;button.dataset.muted=String(!on);button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',S.available?(on?'Mute sound':'Enable sound'):'Sound is unavailable in this browser');button.title=button.getAttribute('aria-label');$('sound-label').textContent=on?'Sound':'Muted';}
  $('sound-toggle').addEventListener('click',()=>{S.toggle();renderSound();});
  renderSound();
  $('win-score').addEventListener('click',showScore);$('level-score').addEventListener('click',showScore);$('close-score').addEventListener('click',closeScore);$('share-image').addEventListener('click',shareImage);$('score-modal').addEventListener('click',ev=>{if(ev.target===$('score-modal'))closeScore();});
  $('restart').addEventListener('click',()=>loadLevel(current));$('replay').addEventListener('click',()=>loadLevel(current));$('next-level').addEventListener('click',()=>current===levels.length-1?showLevels():loadLevel(current+1));$('levels-button').addEventListener('click',showLevels);$('win-levels').addEventListener('click',showLevels);$('close-levels').addEventListener('click',closeLevels);$('move-back').addEventListener('click',()=>commit(selected,-1));$('move-forward').addEventListener('click',()=>commit(selected,1));$('level-modal').addEventListener('click',ev=>{if(ev.target===$('level-modal'))closeLevels();});
  document.addEventListener('keydown',ev=>{
    const modalId=activeModal();
    if(modalId){
      if(ev.key==='Escape'){
        if(modalId==='score-modal')closeScore();else if(modalId==='level-modal')closeLevels();
        ev.preventDefault();
      }
      if(ev.key==='Tab'){
        const f=Array.from($(modalId).querySelectorAll('button:not(:disabled),a[href]')).filter(el=>!el.closest('[hidden]'));
        if(f.length&&ev.shiftKey&&document.activeElement===f[0]){f[f.length-1].focus();ev.preventDefault();}
        else if(f.length&&!ev.shiftKey&&document.activeElement===f[f.length-1]){f[0].focus();ev.preventDefault();}
      }
      return;
    }
    const keys=state[selected].axis==='h'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];
    if(keys.includes(ev.key)){ev.preventDefault();commit(selected,ev.key===keys[0]?-1:1);}
    if(ev.key.toLowerCase()==='z'&&!ev.ctrlKey&&!ev.metaKey)$('undo').click();
  });
  window.addEventListener('resize',()=>{cancelDrag();render();});window.addEventListener('blur',cancelDrag);
  if(!levels.every(lv=>E.validate(lv.pieces))){$('instruction').textContent='Levels could not be loaded. Please refresh the page.';return;}
  loadLevel(progress.current);
})();
