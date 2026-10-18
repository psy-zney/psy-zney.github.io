import { useEffect, useRef, type RefObject } from 'react';
import { Camera, Color, DataTexture, LinearFilter, Matrix3, Mesh, PlaneGeometry, RepeatWrapping, Scene, ShaderMaterial, Vector2, Vector4, WebGLRenderer } from 'three';
import { liquidTextureData } from './liquidSurface';
import { PERIPHERAL_OPTICS_GLSL } from '../data/portalOptics';
import { WORLD_FIELD_FOCAL } from '../data/worldsConstellation';

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 resolution;
  uniform sampler2D noiseField;
  uniform float time, travel;
  uniform vec4 portals[9];
  uniform mat3 portalMaps[9];
  uniform vec3 colors[9];
  uniform float visibility[9];
  ${PERIPHERAL_OPTICS_GLSL}
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  vec3 stars(vec2 uv){
    vec3 result=vec3(0.);
    for(int i=0;i<3;i++){
      float layer=float(i)+1.;vec2 grid=uv*vec2(340.,210.)/layer;
      vec2 cell=floor(grid),point=fract(grid)-.5;
      float seed=hash(cell+layer*7.);
      float star=exp(-dot(point,point)*(190.+layer*35.))*step(.988,seed);
      result+=mix(vec3(.20,.30,.55),vec3(.70,.77,.9),seed)*star/(layer*.7);
    }return result;
  }
  vec3 rim(vec2 pixel,vec4 portal,mat3 plane,vec3 tint){
    if(portal.z<1.)return vec3(0.);
    if(any(greaterThan(abs(pixel-portal.xy),portal.zw*1.5)))return vec3(0.);
    // Inverse plane projection matches CSS perspective, yaw, pitch and roll.
    vec3 local=plane*vec3(pixel,1.);
    vec2 q=local.xy/local.z;
    float r=length(q),a=atan(q.y,q.x);
    vec2 orbit=vec2(cos(a),sin(a));
    vec3 noise=texture2D(noiseField,orbit*.7+vec2(time*.027,-time*.021)).rgb;
    float edge=.82+.008*sin(a*11.+time*.8)+.008*sin(a*27.-time*.6)+.012*(noise.r-.5);
    float d=r-edge;
    float lip=exp(-abs(d)/max(.004,fwidth(r)*.65))*(.6+noise.g*.8);
    float halo=exp(-abs(d)*24.)*.24;
    float arcs=exp(-abs(d-.025*sin(a*9.-time*.9))*160.)*pow(.5+.5*sin(a*7.+noise.r*8.+time),3.);
    float fibers=pow(.5+.5*sin(a*113.+noise.g*18.-time*1.8+d*75.),14.)*exp(-abs(d)*22.)*.5;
    float outer=smoothstep(.73,.79,r)*(1.-smoothstep(1.02,1.22,r));
    vec3 emission=(tint*(lip*4.+halo+arcs*.9+fibers)+vec3(.7,.81,1.)*lip*.65)*outer;
    // Light scatters outside the portal; its clear DOM aperture is composited later.
    emission+=tint*exp(-abs(d)*7.)*.025;
    return emission;
  }
  vec3 connection(vec2 pixel,vec4 left,vec4 right,vec3 ca,vec3 cb,float index){
    if(left.z<1.||right.z<1.)return vec3(0.);
    vec2 delta=right.xy-left.xy;
    float distance=length(delta);if(distance<1.)return vec3(0.);
    vec2 axis=delta/distance,normal=vec2(-axis.y,axis.x);
    float ra=1./length(axis/left.zw),rb=1./length(axis/right.zw);
    vec2 start=left.xy+axis*ra*.83,end=right.xy-axis*rb*.83;
    vec2 line=end-start;float span=dot(line,line);
    if(span<4.||distance<ra+rb)return vec3(0.);
    float t=dot(pixel-start,line)/span;
    if(t<0.||t>1.)return vec3(0.);
    float bend=min(60.,distance*.15)*sin(index*2.3+1.);
    float wave=sin(t*21.-time*2.3+index)*1.2+sin(t*43.+time)*.4;
    vec2 curve=mix(start,end,t)+normal*sin(t*3.14159)*(bend+wave);
    float d=length(pixel-curve);
    float envelope=smoothstep(0.,.06,t)*(1.-smoothstep(.94,1.,t));
    float pulse=.45+.55*pow(.5+.5*sin(t*17.-time*3.+index),5.);
    return mix(ca,cb,t)*(exp(-d*d/1.3)+exp(-d*d/60.)*.12)*envelope*pulse;
  }
  void main(){
    vec2 pixel=vec2(vUv.x,1.-vUv.y)*resolution;
    vec2 aspect=vec2(resolution.x/resolution.y,1.);
    vec2 p=(vUv-.5)*aspect;
    vec2 warp=p;
    float edge=peripheralMask(vUv,resolution);
    warp+=normalize(p+vec2(.0001))*edge*travel*.035*sin(length(p)*16.-time*2.);
    vec2 uv=warp/aspect+.5;
    vec3 n=texture2D(noiseField,uv*.65+vec2(.1,.04)).rgb;
    vec3 fine=texture2D(noiseField,uv*1.7+n.rg*.2).rgb;
    float cloud=pow(n.g*fine.r,2.);
    vec3 sky=vec3(.002,.004,.012)+mix(vec3(.012,.024,.07),vec3(.055,.018,.085),n.b)*cloud*.8;
    sky+=stars(uv)*.65;
    float arc=p.y-.04+p.x*p.x*.13;
    sky+=vec3(.015,.029,.05)*exp(-pow(arc*7.,2.))*(.3+fine.g);
    for(int i=0;i<9;i++){
      sky+=rim(pixel,portals[i],portalMaps[i],colors[i])*visibility[i];
      int next=i==8?0:i+1;
      sky+=connection(pixel,portals[i],portals[next],colors[i],colors[next],float(i))
        *sqrt(visibility[i]*visibility[next])*.65;
    }
    sky+=opticalCone(vUv,resolution,1.+travel*.16,time)*sin(travel*3.14159)*2.;
    gl_FragColor=vec4(pow(1.-exp(-sky),vec3(1./2.2)),1.);
  }
`;

/** One renderer for the cosmic field, all portal rims and their connecting energy. */
export function CosmicPortalField({ host, reduced, entering, selected }: { host:RefObject<HTMLDivElement>; reduced:boolean; entering:boolean; selected:number }) {
  const surface=useRef<HTMLDivElement>(null),config=useRef({entering,selected});config.current={entering,selected};
  useEffect(()=>{
    const node=surface.current;if(!node)return;
    let renderer:WebGLRenderer;
    // Own a fresh canvas per effect lifetime, including React's development replay.
    // Reusing a canvas after forceContextLoss can leave its next renderer permanently lost.
    try{renderer=new WebGLRenderer({alpha:false,antialias:false,powerPreference:'low-power'});}catch(error){node.dataset.recovery=String(error);return;}
    const canvas=renderer.domElement;node.appendChild(canvas);delete node.dataset.recovery;
    const noise=new DataTexture(liquidTextureData(),128,128);noise.wrapS=noise.wrapT=RepeatWrapping;noise.minFilter=noise.magFilter=LinearFilter;noise.needsUpdate=true;
    const uniforms={resolution:{value:new Vector2()},noiseField:{value:noise},time:{value:0},travel:{value:0},
      portals:{value:Array.from({length:9},()=>new Vector4())},portalMaps:{value:Array.from({length:9},()=>new Matrix3())},
      colors:{value:Array.from({length:9},()=>new Color())},visibility:{value:new Float32Array(9)}};
    const material=new ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:fragment,depthTest:false,depthWrite:false,toneMapped:false});
    const geometry=new PlaneGeometry(2,2),scene=new Scene(),camera=new Camera();scene.add(new Mesh(geometry,material));
    let raf=0,time=0,last=performance.now(),painted=-Infinity,travel=0,lastSelected=-1,movingUntil=0;
    const draw=(now:number)=>{
      const dt=Math.min(.05,(now-last)/1000);last=now;
      if(!document.hidden){
        if(!reduced)time+=dt;
        travel=config.current.entering?Math.min(1,travel+dt/.68):0;
        if(lastSelected!==config.current.selected){lastSelected=config.current.selected;movingUntil=now+1100;}
        if(now-painted>=1000/(now<movingUntil||config.current.entering?60:24)){
          painted=now;const width=node.clientWidth,height=node.clientHeight,dpr=Math.min(devicePixelRatio,1.5);
          if(width&&height){
            if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);}
            uniforms.resolution.value.set(width,height);uniforms.time.value=time;uniforms.travel.value=travel;
            const gates=Array.from(host.current?.querySelectorAll<HTMLElement>('.worlds-gate')??[]);
            const stage=host.current?.querySelector<HTMLElement>('.worlds-orbits'),stageBox=stage?.getBoundingClientRect();
            for(let i=0;i<9;i++){
              const gate=gates[i];if(!gate||!stageBox){uniforms.portals.value[i].set(0,0,0,0);continue;}
              const style=getComputedStyle(gate),box=gate.getBoundingClientRect(),m=new DOMMatrixReadOnly(style.transform);
              const sx=gate.offsetWidth/2,sy=gate.offsetHeight/2;
              const ox=stageBox.left+stageBox.width*.5,oy=stageBox.top+stageBox.height*.44;
              const cx=stageBox.left+gate.offsetLeft+sx,cy=stageBox.top+gate.offsetTop+sy;
              const g=-m.m13*sx/WORLD_FIELD_FOCAL,h=-m.m23*sy/WORLD_FIELD_FOCAL,k=1-m.m43/WORLD_FIELD_FOCAL;
              uniforms.portalMaps.value[i].set(m.m11*sx+ox*g,m.m21*sy+ox*h,ox*k+cx-ox+m.m41,
                m.m12*sx+oy*g,m.m22*sy+oy*h,oy*k+cy-oy+m.m42,g,h,k).invert();
              uniforms.portals.value[i].set(box.x+box.width/2,box.y+box.height/2,box.width/2,box.height/2);
              uniforms.colors.value[i].set(style.getPropertyValue('--accent').trim());
              uniforms.visibility.value[i]=Number(style.opacity)**1.6;
            }
            renderer.render(scene,camera);node.dataset.portals=String(gates.length);node.dataset.centerProtected='true';
          }
        }
      }raf=requestAnimationFrame(draw);
    };raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);noise.dispose();geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();};
  },[host,reduced]);
  return <div ref={surface} className="cosmic-portal-field" aria-hidden="true"/>;
}
