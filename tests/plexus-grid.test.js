import test from 'node:test';
import assert from 'node:assert/strict';
import { plexusGrid } from '../public/plexus-grid.js';

test('plexus graph has bounded local edges with reciprocal endpoints and covers every node',()=>{
  const graph=plexusGrid(80),nodes=new Set();
  for(let i=0;i<graph.points.length;i+=3)nodes.add(`${graph.points[i]},${graph.points[i+1]}`);
  assert.equal(nodes.size,80*45);assert.equal(graph.edgeCount,3*80*45-2*80-2*45+1);
  assert.equal(graph.lines.length,graph.edgeCount*6);assert.equal(graph.neighbors.length,graph.edgeCount*4);
  const seen=new Set();
  for(let i=0,n=0;i<graph.lines.length;i+=6,n+=4){
    const a=`${graph.lines[i]},${graph.lines[i+1]}`,b=`${graph.lines[i+3]},${graph.lines[i+4]}`;
    assert.ok(nodes.has(a)&&nodes.has(b));assert.notEqual(a,b);
    assert.deepEqual([...graph.neighbors.slice(n,n+4)],[graph.lines[i+3],graph.lines[i+4],graph.lines[i],graph.lines[i+1]]);
    const key=[a,b].sort().join('|');assert.ok(!seen.has(key));seen.add(key);
  }
  for(const value of [0,79,220.5,481,NaN])assert.throws(()=>plexusGrid(value));
  const max=plexusGrid(480);assert.equal(max.points.length/3,129600);assert.ok(max.lines.length/3<780000);
});
