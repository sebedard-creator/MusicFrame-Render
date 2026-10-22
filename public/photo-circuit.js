import * as THREE from 'three';

// Original MusicFrame Render photo shader. Three.js supplies the MIT renderer.
// Shared endpoints connect each row's orthogonal traces; there is no simulation.
export class PhotoCircuit {
  constructor() {
    this.material = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      uniforms: {
        inputTexture: { value: null }, columns: { value: 240 }, width: { value: .22 },
        glow: { value: .5 }, tint: { value: .4 }, background: { value: .08 },
        drive: { value: 0 }, impact: { value: 0 }, phase: { value: 0 }, strength: { value: 1 },
      },
      fragmentShader: `
uniform sampler2D inputTexture;
uniform float columns,width,glow,tint,background,drive,impact,phase,strength;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float segment(vec2 p,vec2 a,vec2 b){
 vec2 delta=b-a;float t=clamp(dot(p-a,delta)/max(dot(delta,delta),.00001),0.,1.);
 return length(p-a-delta*t);
}
void main(){
 vec3 original=texture2D(inputTexture,vUv).rgb;
 vec2 grid=vec2(columns,max(12.,floor(columns*.5625)));
 vec2 cell=floor(vUv*grid),local=fract(vUv*grid);
 float seed=hash(cell);
 float left=.2+floor(hash(cell+19.3)*3.)*.3;
 float right=.2+floor(hash(cell+vec2(1.,0.)+19.3)*3.)*.3;
 float activity=clamp(drive+impact*.8,0.,1.5);
 float bend=clamp(.28+hash(cell+47.1)*.44+sin(seed*21.)*activity*.16,.15,.85);
 vec2 a=vec2(0.,left),b=vec2(bend,left),c=vec2(bend,right),d=vec2(1.,right);
 float dist=min(segment(local,a,b),min(segment(local,b,c),segment(local,c,d)));
 float radius=.025+width*.14+activity*.035;
 float aa=max(fwidth(dist),.012);
 float trace=1.-smoothstep(radius-aa,radius+aa,dist);
 float via=step(.73,hash(cell+6.7));
 float ring=abs(length(local-b)-(.11+activity*.025));
 float node=(1.-smoothstep(.018,.018+aa,ring))*via;
 vec3 sampleColor=texture2D(inputTexture,(cell+.5)/grid).rgb;
 float lum=dot(sampleColor,vec3(.2126,.7152,.0722));
 vec3 color=mix(sampleColor,vec3(.22,.9,1.)*lum,tint);
 float packet=exp(-pow((fract((cell.x+local.x)/12.+hash(vec2(cell.y,3.7))-phase)-.5)*9.,2.));
 float current=activity*(.35+packet*2.8);
 float halo=exp(-dist*dist/.016)*glow*(.1+current*.3);
 vec3 result=original*background+color*(trace*(1.2+current)+node*(.8+impact*2.)+halo);
 gl_FragColor=vec4(mix(original,result,strength),1.);
}`,
    });
  }
  configure(config, time, bands, onset) {
    const u=this.material.uniforms, reaction=config.circuitReaction??1;
    u.columns.value=config.circuitColumns??240;u.width.value=config.circuitWidth??.22;
    u.glow.value=config.circuitGlow??.5;u.tint.value=config.circuitTint??.4;
    u.background.value=config.circuitBackground??.08;
    u.drive.value=(bands[1]*.6+bands[2]*.2+bands[3]*.1)*reaction;
    u.impact.value=onset.impact*reaction;u.phase.value=time*config.speed*.8;
    u.strength.value=config.intensity;return this.material;
  }
  dispose(){this.material.dispose();}
}
