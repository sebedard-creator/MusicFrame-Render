import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProductionSequence} from '../server/production-sequence.js';
import {SequenceRenderer} from '../public/sequence-renderer.js';

test('production saves a complete image permutation without changing the imported project',()=>{
  for(const count of [1,2,58,300]){
    const project={audio:{duration:7200},images:Array.from({length:count},(_,i)=>({file:`${i}.png`}))};
    const before=structuredClone(project),sequence=buildProductionSequence(project);
    assert.deepEqual([...sequence.imageOrder].sort((a,b)=>a-b),Array.from({length:count},(_,i)=>i));
    assert.deepEqual(project,before);
    assert.deepEqual(JSON.parse(JSON.stringify(sequence)).imageOrder,sequence.imageOrder);
  }
});

function harness(sequence,count){
  const draws=[],passes=[];
  const engine={width:16,height:16,project:{images:Array.from({length:count})},
    setConfig(){},async draw(time,options){draws.push({time,...options});},pass(){passes.push(true);}};
  return {renderer:new SequenceRenderer(engine,sequence),draws,passes};
}

test('shuffled images stay consistent across dissolves, effect loops, image loops and seeks',async()=>{
  const sequence={repeat:true,segmentSeconds:8,transitionSeconds:3,imageOrder:[3,0,4,1,2],
    segments:Array.from({length:20},()=>({config:{}}))};
  const {renderer,draws,passes}=harness(JSON.parse(JSON.stringify(sequence)),5);
  try{
    for(const ordinal of [0,1,4,5,19,20,899,0]){
      draws.length=0;
      await renderer.draw(ordinal*8);
      assert.deepEqual(draws.map(d=>d.imageIndex),[sequence.imageOrder[ordinal%5]]);
      draws.length=0;
      const time=ordinal*8+6.5;
      await renderer.draw(time);
      assert.deepEqual(draws.map(d=>d.imageIndex),[sequence.imageOrder[ordinal%5],sequence.imageOrder[(ordinal+1)%5]]);
      assert.ok(draws.every(d=>d.time===time));
    }
    assert.equal(passes.length,8);
  }finally{renderer.dispose();}
});

test('historical repeating recipes and explicit image indexes retain their original ordering',async()=>{
  for(const repeat of [true,false]){
    const sequence={repeat,segmentSeconds:8,transitionSeconds:3,segments:[{config:{},imageIndex:4},{config:{},imageIndex:2}]};
    const {renderer,draws}=harness(sequence,5);
    try{
      await renderer.draw(6.5);
      assert.deepEqual(draws.map(d=>d.imageIndex),repeat?[0,1]:[4,2]);
    }finally{renderer.dispose();}
  }
});
