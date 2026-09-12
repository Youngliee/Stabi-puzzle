'use strict';
importScripts('engine.js');
self.onmessage=function(event){
  const {id,state}=event.data;
  try{
    if(!EscapeEngine.validate(state))throw new Error('Invalid board');
    const path=EscapeEngine.solve(state);
    self.postMessage({id,move:path&&path.length?path[0]:null});
  }catch(_){self.postMessage({id,move:null});}
};
