import * as THREE from 'three';
import { sequencePosition } from './effect-sequence.js';

// Render both live effects at the same audio time, dissolve their GPU textures,
// then draw the spectrum once above the result. No playback clock or frame history.
export class SequenceRenderer {
  constructor(engine, sequence) {
    this.engine=engine;this.sequence=sequence;
    this.targets=[0,1].map(()=>new THREE.WebGLRenderTarget(engine.width,engine.height,{depthBuffer:false,stencilBuffer:false}));
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,
      uniforms:{outgoing:{value:this.targets[0].texture},incoming:{value:this.targets[1].texture},amount:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:'uniform sampler2D outgoing,incoming;uniform float amount;varying vec2 vUv;void main(){gl_FragColor=mix(texture2D(outgoing,vUv),texture2D(incoming,vUv),amount);}'
    });
  }
  async draw(time) {
    const e=this.engine,s=this.sequence,current=sequencePosition(s,time);
    for(const target of this.targets)if(target.width!==e.width||target.height!==e.height)target.setSize(e.width,e.height);
    const render=async(segment,ordinal,target)=>{
      e.setConfig(segment.config);
      const options={target,overlay:false};
      if(s.repeat||Number.isInteger(segment.imageIndex)){
        options.imageIndex=s.repeat
          ? (s.imageOrder?.length?s.imageOrder[ordinal%s.imageOrder.length]:ordinal%e.project.images.length)
          : segment.imageIndex;
        options.imageTime=Math.max(0,time-(s.startTime||0)-ordinal*s.segmentSeconds);
      }
      await e.draw(time,options);
    };
    if(current.mix===0)await render(current.segment,current.ordinal,null);
    else{
      await render(current.segment,current.ordinal,this.targets[0]);
      await render(current.next,current.ordinal+1,this.targets[1]);
      this.material.uniforms.incoming.value=this.targets[1].texture;
      this.material.uniforms.amount.value=current.mix;e.pass(this.material,null);
    }
    if(s.spectrumConfig)e.spectrumOverlay.draw(e.renderer,e.analysis,time,s.spectrumConfig,e.width,e.height,e.lightweightPreview);
    return current;
  }
  dispose(){this.targets.forEach(t=>t.dispose());this.material.dispose();}
}
