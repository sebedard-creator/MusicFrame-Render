import test from 'node:test';
import assert from 'node:assert/strict';
import { sequencePosition, sequenceDuration, defaultSequenceTiming } from '../public/effect-sequence.js';

test('current and historical comparisons change every seven seconds at 60 fps', () => {
 for (const count of [4, 17, 21]) {
  const sequence = { segmentSeconds: 7, segments: Array.from({ length: count }, (_, i) => ({ name: String(i) })) };
  for (let frame = 0; frame < count * 7 * 60; frame++) {
    const result = sequencePosition(sequence, frame / 60);
    assert.equal(result.index, Math.floor(frame / 420));
    assert.equal(result.segment, sequence.segments[result.index]);
  }
  assert.equal(sequencePosition(sequence, count * 7).index, count - 1);
  assert.equal(sequencePosition({ ...sequence, startTime: 30 }, 37).index, 1);
 }
});

test('twenty effects retain five solo seconds between two-second crossfades at 60 fps',()=>{
 const sequence={segmentSeconds:7,transitionSeconds:2,segments:Array.from({length:20},(_,i)=>({name:String(i)}))};
 assert.equal(sequenceDuration(sequence),138);
 for(let frame=0;frame<138*60;frame++){
  const p=sequencePosition(sequence,frame/60),localFrame=frame%420;
  assert.equal(p.index,Math.floor(frame/420));
  const expected=p.index===19?0:Math.max(0,(localFrame-300)/120);
  assert.ok(Math.abs(p.mix-expected)<1e-12);
  assert.equal(p.next,p.index===19?null:sequence.segments[p.index+1]);
 }
 assert.equal(sequencePosition(sequence,5).mix,0);
 assert.equal(sequencePosition(sequence,6).mix,.5);
 assert.equal(sequencePosition(sequence,7).index,1);
 assert.equal(sequencePosition({...sequence,startTime:30},36).mix,.5);
 assert.equal(sequenceDuration({...sequence,transitionSeconds:0}),140);
});

test('approved default keeps five solo seconds and uses 180-frame dissolves',()=>{
 const {holdSeconds,transitionSeconds}=defaultSequenceTiming;
 assert.equal(holdSeconds,5);assert.equal(transitionSeconds,3);
 const sequence={segmentSeconds:holdSeconds+transitionSeconds,transitionSeconds,segments:Array.from({length:20},(_,i)=>({name:String(i)}))};
 assert.equal(sequenceDuration(sequence),157);
 for(let frame=0;frame<157*60;frame++){
  const position=sequencePosition(sequence,frame/60),slotFrame=frame%480;
  assert.equal(position.index,Math.floor(frame/480));
  const mix=position.index===19?0:Math.max(0,(slotFrame-300)/180);
  assert.ok(Math.abs(position.mix-mix)<1e-12);
 }
 assert.equal(sequencePosition(sequence,5).mix,0);
 assert.equal(sequencePosition(sequence,6.5).mix,.5);
 assert.equal(sequencePosition(sequence,8).index,1);
 assert.equal(sequencePosition(sequence,13).mix,0);
 assert.equal(sequencePosition(sequence,14.5).mix,.5);
 assert.equal(sequencePosition(sequence,16).index,2);
 assert.equal(sequencePosition(sequence,156.99).next,null);
});

test('production loops all twenty effects and continues the image ordinal across cycles',()=>{
 const sequence={segmentSeconds:8,transitionSeconds:3,repeat:true,durationSeconds:587.2,segments:Array.from({length:20},(_,i)=>({name:String(i)}))};
 assert.equal(sequenceDuration(sequence),587.2);
 for(let frame=0;frame<587.2*60;frame++){
  const p=sequencePosition(sequence,frame/60),ordinal=Math.floor(frame/480);
  assert.equal(p.ordinal,ordinal);assert.equal(p.index,ordinal%20);assert.equal(p.next,sequence.segments[(p.index+1)%20]);
  assert.ok(Math.abs(p.mix-Math.max(0,((frame%480)-300)/180))<1e-12);
 }
 assert.equal(sequencePosition(sequence,158.5).mix,.5);assert.equal(sequencePosition(sequence,160).index,0);assert.equal(sequencePosition(sequence,160).ordinal,20);
});
