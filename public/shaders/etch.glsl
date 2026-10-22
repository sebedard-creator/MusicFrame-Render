// Scan-row collapse, tone-controlled triangle and line-spacing carrier adapted
// from Fosfora etch_sim.wgsl, MIT, Copyright 2025–2026 Kevin Raymond.
// Luminous photo colouring, audio mapping and stateless fragment rendering: MusicFrame Render.
uniform sampler2D inputTexture;
uniform vec2 resolution;
uniform float rows,swing,weight,photoColor,background,reaction,phase,bass,mid,high,impact;
varying vec2 vUv;
void main(){
  vec3 result=texture2D(inputTexture,vUv).rgb*background;
  float rowHeight=1./rows;
  float row=floor(vUv.y*rows);
  // Bounded displacement stays within the five rows considered below.
  for(int j=-2;j<=2;j++){
    float id=row+float(j);
    if(id<0.||id>=rows)continue;
    float y=(id+.5)*rowHeight;
    vec3 source=texture2D(inputTexture,vec2(vUv.x,y)).rgb;
    float lum=dot(source,vec3(.299,.587,.114));
    float carrier=vUv.x*rows*1.1+phase+id*.075;
    float triangle=abs(fract(carrier)*2.-1.)*2.-1.;
    float drive=clamp(bass*.8+mid*.3+impact*.5,0.,1.5)*reaction;
    float amplitude=lum*swing*rowHeight*(.16+drive*.8);
    float rattle=sin(vUv.x*22.+id*.22)*impact*reaction*rowHeight*.35;
    float lineY=y+triangle*amplitude+rattle;
    float thickness=rowHeight*.1*weight*(.25+lum*1.4)*(1.+high*reaction*.5);
    float aa=max(fwidth(vUv.y-lineY)*.65,.65/resolution.y);
    float stroke=1.-smoothstep(thickness,thickness+aa,abs(vUv.y-lineY));
    vec3 color=mix(vec3(.28,1.,.82)*lum,source,photoColor);
    result+=color*stroke*(.8+lum*.65+high*reaction*.25);
  }
  gl_FragColor=vec4(result,1.);
}
