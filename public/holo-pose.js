// Rigid photo planes only: no per-pixel geometric warping.
export function holoPose(config,time,bands,impact=0){
  const reaction=(config.holoReaction??1)*(config.intensity??1);
  const bass=bands[1]*reaction,mid=bands[2]*reaction,high=bands[3]*reaction,hit=impact*reaction;
  const phase=time*(config.speed??1),orbit=config.holoOrbit??.65;
  return {
    depth:(config.holoDepth??.6)*220*(1+bass*.7+hit*.5),
    rotationY:orbit*(.48+Math.sin(phase*.5)*mid*.12+hit*.10),
    rotationX:orbit*(-.12+Math.cos(phase*.37)*bass*.06),
    stagger:mid*9+hit*14,
    glow:1+high*.6+hit*.5,
    scanDrive:Math.min(1,bass*.35+mid*.3+high*.35),
    push:(config.zoom??.2)*(config.intensity??1)*bands[1]*30,
    phase,
  };
}
