(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.EscapeProgress=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const HINT_LIMIT=3;
  function restore(levels,saved){
    const progress={unlocked:0,current:0,best:{},hintsUsed:{}};
    if(!saved||typeof saved!=='object')return progress;
    const last=levels.length-1;
    progress.unlocked=Math.max(0,Math.min(last,Number.isInteger(saved.unlocked)?saved.unlocked:0));
    for(let i=0;i<levels.length;i++){
      const value=saved.best&&saved.best[i];
      if(Number.isInteger(value)&&value>=levels[i].par&&value<100000)progress.best[i]=value;
      const used=saved.hintsUsed&&saved.hintsUsed[i];
      if(Number.isInteger(used)&&used>0)progress.hintsUsed[i]=Math.min(HINT_LIMIT,used);
    }
    // Finishing the old final level also unlocks the new continuation.
    const previouslyUnlocked=progress.unlocked;
    while(progress.unlocked<last&&progress.best[progress.unlocked]!==undefined)progress.unlocked++;
    progress.current=Math.max(0,Math.min(progress.unlocked,Number.isInteger(saved.current)?saved.current:0));
    if(progress.unlocked>previouslyUnlocked&&progress.current===previouslyUnlocked)progress.current=progress.unlocked;
    return progress;
  }
  function hintsRemaining(progress,index){return Math.max(0,HINT_LIMIT-((progress.hintsUsed&&progress.hintsUsed[index])||0));}
  function useHint(progress,index){
    if(hintsRemaining(progress,index)===0)return false;
    if(!progress.hintsUsed)progress.hintsUsed={};
    progress.hintsUsed[index]=(progress.hintsUsed[index]||0)+1;
    return true;
  }
  return {restore,hintsRemaining,useHint,HINT_LIMIT};
});
