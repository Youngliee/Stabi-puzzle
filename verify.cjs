const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const E=require('./engine.js');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('levels.js','utf8'),ctx);const levels=ctx.window.ESCAPE_LEVELS;assert.equal(levels.length,15);
const source=fs.readFileSync('game.js','utf8'),html=fs.readFileSync('play.html','utf8');
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));for(const m of source.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(m[1]),'Missing element '+m[1]);
for(const page of [html,fs.readFileSync('index.html','utf8')])for(const m of page.matchAll(/(?:src|href)="([^"]+)"/g)){if(!m[1].startsWith('http')&&!m[1].startsWith('#'))assert.ok(fs.existsSync(''+m[1]),'Missing file '+m[1]);}
let checks=0;
levels.forEach((level,n)=>{assert.ok(E.validate(level.pieces),'Invalid start '+n);assert.ok(!E.solved(level.pieces));const path=E.solve(level.pieces);assert.ok(path,'No solution '+n);assert.equal(path.length,level.par,'Wrong par '+n);let state=level.pieces;
  for(const [i,d] of path){const previous=JSON.stringify(state),b=E.bounds(state,i);assert.equal(E.move(state,i,b.min-1),null);assert.equal(E.move(state,i,b.max+1),null);assert.equal(E.move(state,i,.5),null);const next=E.move(state,i,d);assert.ok(E.validate(next));assert.equal(JSON.stringify(state),previous,'Move mutated state');assert.equal(JSON.stringify(E.move(next,i,-d)),previous,'Undo is not reversible');state=next;checks+=6;}
  assert.ok(E.solved(state));assert.equal(E.stars(level.par,level.par),3);assert.equal(E.stars(level.par+1,level.par),2);assert.equal(E.stars(level.par+20,level.par),1);console.log('PASS level '+(n+1)+' — '+path.length+' moves, '+state.length+' blocks');
});
assert.equal(E.validate([{id:'S',x:0,y:2,axis:'h',len:2},{id:'A',x:0,y:2,axis:'v',len:2}]),false);
console.log('PASS '+checks+' movement assertions; all HTML references and UI element IDs resolve.');
const P=require('./progress.js'),R=require('./results.js');
const oldBest=Object.fromEntries(levels.slice(0,10).map((level,i)=>[i,level.par]));
const oldSave={unlocked:9,current:9,best:oldBest};
const restored=P.restore(levels,oldSave);
assert.equal(restored.unlocked,10);assert.equal(restored.current,10);assert.deepEqual(restored.best,oldBest);
assert.equal(oldSave.unlocked,9,'Restore must not mutate the saved object');
assert.equal(R.summarize(levels,restored.best,E.stars).stars,30);
assert.equal(R.summarize(levels,restored.best,E.stars).maxStars,45);
assert.equal(R.summarize(levels,restored.best,E.stars).allComplete,false);
assert.equal(P.restore(levels,{...oldSave,current:2}).current,2,'Preserve an intentional replay');
assert.equal(P.restore(levels,{unlocked:9,current:9,best:{0:2}}).unlocked,9,'Do not unlock unfinished levels');
assert.deepEqual(P.restore(levels,null),{unlocked:0,current:0,best:{},hintsUsed:{}});
assert.deepEqual(P.restore(levels,{unlocked:100,current:100,best:{0:-1,1:'3',14:100000}}),{unlocked:14,current:14,best:{},hintsUsed:{}});
const hinted=P.restore(levels,oldSave);
for(let i=0;i<3;i++){assert.equal(P.hintsRemaining(hinted,10),3-i);assert.equal(P.useHint(hinted,10),true);}
assert.equal(P.hintsRemaining(hinted,10),0);assert.equal(P.useHint(hinted,10),false);
assert.equal(P.hintsRemaining(hinted,11),3,'Each level has its own hint budget');
const reloaded=P.restore(levels,JSON.parse(JSON.stringify(hinted)));
assert.equal(P.hintsRemaining(reloaded,10),0,'Refreshing must preserve used hints');
assert.deepEqual(reloaded.best,oldBest,'Hints must not change best moves or stars');
assert.deepEqual(P.restore(levels,{hintsUsed:{0:99,1:-2,2:'3'}}).hintsUsed,{0:3});
const allBest=Object.fromEntries(levels.map((level,i)=>[i,level.par]));
const completed=R.summarize(levels,allBest,E.stars);
assert.equal(completed.stars,45);assert.equal(completed.allComplete,true);assert.ok(R.shareText(completed).includes('15/15'));
let response;
const worker={EscapeEngine:E,importScripts:path=>assert.equal(path,'engine.js'),self:{postMessage:value=>{response=value;}}};
vm.createContext(worker);vm.runInContext(fs.readFileSync('hint-worker.js','utf8'),worker);
for(let i=0;i<levels.length;i++){
  const level=levels[i],path=E.solve(level.pieces);
  worker.self.onmessage({data:{id:i,state:level.pieces}});
  assert.equal(response.id,i);assert.deepEqual(response.move,path[0]);
  const next=E.move(level.pieces,...response.move);
  assert.ok(next);assert.equal(E.solve(next).length,level.par-1);
}
worker.self.onmessage({data:{id:99,state:[]}});assert.equal(response.move,null);
console.log('PASS: old progress continues at Level 11; 45-star totals; legal one-move hints for every level.');
