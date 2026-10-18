/** Original nebula atlas + periodic cylindrical projection; all flow is a function of t. */
export const NEBULA_TUNNEL_GLSL = /* glsl */ `
  uniform sampler2D nebulaMap;
  uniform float nebulaReady;

  // Crossfade at the tile's joins; atan's wrap cannot reveal a straight seam.
  vec3 nebulaTile(vec2 uv) {
    vec2 q=fract(uv);
    vec2 w=smoothstep(vec2(0.),vec2(.10),q)*(1.-smoothstep(vec2(.90),vec2(1.),q));
    vec3 a=texture2D(nebulaMap,q).rgb;
    vec3 b=texture2D(nebulaMap,fract(q+vec2(.5,0.))).rgb;
    vec3 c=texture2D(nebulaMap,fract(q+vec2(0.,.5))).rgb;
    vec3 d=texture2D(nebulaMap,fract(q+vec2(.5))).rgb;
    return mix(mix(d,c,w.x),mix(b,a,w.x),w.y);
  }

  vec3 nebulaTunnel(vec2 uv,vec2 resolution,float progress,float time) {
    vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);
    vec2 center=vec2(sin(progress*3.14159)*.035,sin(progress*6.28318)*.018);
    vec2 ray=p-center;
    float radius=length(ray),depth=-log(radius+.012),a=atan(ray.y,ray.x);
    vec3 radiance=vec3(.0015,.003,.012);
    for(int i=0;i<3;i++) {
      float layer=float(i),phase=a+depth*(1.35+layer*.12)-time*.20;
      vec2 orbit=vec2(cos(phase),sin(phase));
      vec3 warp=texture2D(noiseField,orbit*.35+vec2(depth*.11+layer*.3,time*.025)).rgb;
      // Periodic angular modulation gives the wall its folded spiral silhouette.
      vec2 wallUv=vec2(a/6.2831853+depth*.21-time*.065+layer*.29,
        depth*(.32+layer*.035)+time*.22+layer*.37+.10*sin(phase*3.+warp.r*.7));
      wallUv+=(warp.rg-.5)*.055;
      vec3 gas;
      if(nebulaReady>.5)gas=nebulaTile(wallUv);
      else {
        vec3 n=texture2D(noiseField,wallUv+orbit*.3).rgb;
        float ribbon=pow(.5+.5*sin(phase*3.+n.r*5.),7.);
        gas=mix(vec3(.004,.008,.025),vec3(.09,.18,.42),n.g*n.r)+vec3(.14,.08,.32)*ribbon;
      }
      float folds=smoothstep(.12,.86,.5+.5*sin(phase*3.+warp.g*.8));
      float weight=i==0?.95:i==1?.17:.065;
      radiance+=pow(gas,vec3(1.22))*weight*mix(.10,1.12,folds);
      // Thin, broken caustics complement the photographic filaments, never a wire grid.
      float ridge=exp(-abs(sin(phase*3.+warp.g*2.))*48.);
      radiance+=mix(vec3(.055,.17,.32),vec3(.20,.08,.29),warp.b)*ridge*warp.r*.08/(1.+layer);
    }
    // Dark channels and a small vanishing point retain the sense of depth.
    radiance*=smoothstep(.004,.030,radius)*(.70+.30*smoothstep(.04,.40,radius));
    // Neutral steel/charcoal walls; retain texture structure without the atlas's purple wash.
    float luminance=dot(radiance,vec3(.2126,.7152,.0722));
    radiance=mix(vec3(luminance)*vec3(.86,.93,1.),radiance,.10);
    vec3 color=pow(1.-exp(-radiance*.68),vec3(1./2.2));
    return color*smoothstep(0.,.12,progress);
  }
`;
