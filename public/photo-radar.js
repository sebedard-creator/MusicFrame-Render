import { PhotoSpectrum } from './photo-spectrum.js';

// Original photo radar. Reuses only the studio's FFT texture uploader.
// Polar grain centers are calculated directly: no particle simulation/history.
export class PhotoRadar extends PhotoSpectrum {
  constructor(){
    super();
    this.material.fragmentShader=`
uniform sampler2D inputTexture,spectrum;
uniform float columns,fill,travel,glow,background,reaction,strength,impact;
uniform float phase;
varying vec2 vUv;
const float tau=6.28318530718;
void main(){
 vec3 original=texture2D(inputTexture,vUv).rgb;
 vec2 aspect=vec2(1.77777778,1.);
 vec2 p=(vUv-.5)*aspect;
 float radius=length(p),pitch=1.02/columns;
 float ring=floor(radius/pitch),homeRadius=(ring+.5)*pitch;
 float segments=max(8.,floor(tau*(ring+.5)));
 float angle=fract(atan(p.y,p.x)/tau+1.);
 float sector=floor(angle*segments);
 float homeAngle=(sector+.5)/segments;
 vec2 home=vec2(cos(homeAngle*tau),sin(homeAngle*tau))*homeRadius;
 vec2 uv=clamp(home/aspect+.5,0.,1.);
 vec3 photo=texture2D(inputTexture,uv).rgb;
 float energy=texture2D(spectrum,vec2(clamp(homeRadius/1.02,0.,1.),.5)).r*1.5*reaction;
 float activity=energy+impact*.35;
 float age=fract(phase-homeAngle+1.);
 float sweep=exp(-age/(.018+glow*.24))*travel*activity*2.4;
 float size=pitch*(.12+fill*.28)*clamp(.85+activity*.4,.6,1.3);
 float distance=length(p-home);
 float aa=max(length(fwidth(p))*.35,.00001);
 float grain=1.-smoothstep(size-aa,size+aa,distance);
 vec3 result=original*background+photo*grain*(.8+energy*.5+sweep);
 gl_FragColor=vec4(mix(original,result,strength),1.);
}`;
    this.material.uniforms.phase={value:0};
  }
  configure(config,time,analysis,onset){
    const material=super.configure({...config,
      specColumns:config.radarDensity??240,specFill:config.radarSize??.7,
      specTravel:config.radarSweep??.85,specGlow:config.radarTrail??.35,
      specBackground:config.radarBackground??.1,specReaction:config.radarReaction??1,
    },time,analysis,onset);
    material.uniforms.phase.value=(time*config.speed*.35)%1;
    return material;
  }
}
