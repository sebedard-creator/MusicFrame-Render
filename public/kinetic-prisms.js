// Deterministic triangular photo-cell layout; independent of frame/seek history.
export function kineticLayout(columns){
  if(!Number.isInteger(columns)||columns<12||columns>144)throw new Error('Finesse des prismes invalide.');
  const rows=Math.max(2,Math.round(columns*9/16)),count=columns*rows*2;
  const cells=new Float32Array(count*2),faces=new Float32Array(count),seeds=new Float32Array(count);
  for(let y=0,i=0;y<rows;y++)for(let x=0;x<columns;x++)for(let face=0;face<2;face++,i++){
    cells[i*2]=x;cells[i*2+1]=y;faces[i]=face;
    let hash=i+1;hash=Math.imul(hash^hash>>>16,0x7feb352d);hash=Math.imul(hash^hash>>>15,0x846ca68b);
    seeds[i]=((hash^hash>>>16)>>>0)/4294967296;
  }
  return {columns,rows,count,cells,faces,seeds};
}

export function kineticPose(config,time,bands,impact=0){
  const reaction=(config.kinReaction??1)*(config.intensity??1);
  return {bass:bands[1]*reaction,mid:bands[2]*reaction,high:bands[3]*reaction,impact:impact*reaction,phase:time*(config.speed??1),zoom:1+(config.zoom??.2)*(config.intensity??1)*bands[1]*.06};
}
