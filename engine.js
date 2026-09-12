(function(root){
  'use strict';
  const SIZE=6;
  function cells(p){return Array.from({length:p.len},(_,n)=>[p.x+(p.axis==='h'?n:0),p.y+(p.axis==='v'?n:0)]);}
  function validate(state){
    if(!Array.isArray(state)||!state.length) return false;
    const occupied=new Set(),ids=new Set();
    for(const p of state){
      if(!p||!['h','v'].includes(p.axis)||![2,3].includes(p.len)||!Number.isInteger(p.x)||!Number.isInteger(p.y)||ids.has(p.id))return false;
      ids.add(p.id);
      for(const [x,y] of cells(p)){const key=x+','+y;if(x<0||x>=SIZE||y<0||y>=SIZE||occupied.has(key))return false;occupied.add(key);}
    }
    return state[0].id==='S'&&state[0].axis==='h'&&state[0].len===2&&state[0].y===2;
  }
  function bounds(state,index){
    const p=state[index],occ=new Set();state.forEach((q,i)=>{if(i!==index)cells(q).forEach(([x,y])=>occ.add(x+','+y));});
    const coord=p.axis==='h'?p.x:p.y;let min=0,max=0;
    for(let d=1;coord-d>=0;d++){const x=p.x-(p.axis==='h'?d:0),y=p.y-(p.axis==='v'?d:0);if(occ.has(x+','+y))break;min=-d;}
    for(let d=1;coord+p.len-1+d<SIZE;d++){const x=p.x+(p.axis==='h'?p.len-1+d:0),y=p.y+(p.axis==='v'?p.len-1+d:0);if(occ.has(x+','+y))break;max=d;}
    return {min,max};
  }
  function move(state,index,delta){if(!Number.isInteger(delta)||delta===0||!state[index])return null;const b=bounds(state,index);if(delta<b.min||delta>b.max)return null;return state.map((p,i)=>i===index?{...p,[p.axis==='h'?'x':'y']:p[p.axis==='h'?'x':'y']+delta}:{...p});}
  function solved(state){return state[0].x===4;}
  function stars(moves,par){return moves<=par?3:moves<=par+Math.max(2,Math.ceil(par*.5))?2:1;}
  function solve(initial,limit=150000){
    const first=initial.map(p=>p.axis==='h'?p.x:p.y).join(''),queue=[first],parents=[-1],moves=[null],seen=new Set([first]),grid=new Int8Array(36);let cursor=0;
    while(cursor<queue.length&&cursor<limit){const key=queue[cursor];if(key[0]==='4'){const path=[];let k=cursor;while(parents[k]!==-1){path.push(moves[k]);k=parents[k];}return path.reverse();}
      grid.fill(-1);initial.forEach((p,i)=>{const pos=Number(key[i]),x=p.axis==='h'?pos:p.x,y=p.axis==='v'?pos:p.y;for(let j=0;j<p.len;j++)grid[(y+(p.axis==='v'?j:0))*6+x+(p.axis==='h'?j:0)]=i;});
      initial.forEach((p,i)=>{const pos=Number(key[i]),fixed=p.axis==='h'?p.y:p.x;for(const sign of [-1,1]){for(let d=1;d<6;d++){const edge=pos+(sign<0?-d:p.len-1+d);if(edge<0||edge>=6)break;const cell=p.axis==='h'?fixed*6+edge:edge*6+fixed;if(grid[cell]!==-1)break;const next=key.slice(0,i)+(pos+sign*d)+key.slice(i+1);if(seen.has(next))continue;seen.add(next);queue.push(next);parents.push(cursor);moves.push([i,sign*d]);}}});cursor++;
    }return null;
  }
  const api={SIZE,cells,validate,bounds,move,solved,stars,solve};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.EscapeEngine=api;
})(typeof window!=='undefined'?window:globalThis);
