import { Camera, DataTexture, LinearFilter, Mesh, PlaneGeometry, RepeatWrapping, Scene, ShaderMaterial, Vector2, WebGLRenderer } from 'three';
import { introFrame, introPortalFormation, introTunnelView, introVortexAngle, INTRO_DURATION } from '../data/virgoIntro';
import { liquidSurfaceGLSL, liquidTextureData } from './liquidSurface';
import { quantumEdgeGLSL } from './introQuantumPortal';
import { renderPixelRatio } from '../data/renderQuality';
import { PERIPHERAL_OPTICS_GLSL } from '../data/portalOptics';

/** Ray projection uses the same fixed camera, wall radius and bend as projectTunnelWall. */
class IntroLiquidSurface {
  readonly renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
  private readonly scene = new Scene();
  private readonly camera = new Camera();
  private readonly field = new DataTexture(liquidTextureData(), 128, 128);
  private readonly geometry = new PlaneGeometry(2, 2);
  private readonly material = new ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false,
    uniforms: { noiseField: { value: this.field }, time: { value: 0 }, travelProgress:{value:0}, flowPhase: { value: 0 }, cameraZ: { value: 1000 }, mode: { value: 0 },
      quantum: { value: 0 }, resolution: { value: new Vector2() }, origin: { value: new Vector2() }, radius: { value: 1 }, openingAspect: { value: 1 }, focal: { value: 1 }, wallRadius: { value: 1 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform vec2 resolution,origin;
      uniform float time,travelProgress,flowPhase,cameraZ,mode,radius,openingAspect,focal,wallRadius,quantum;${liquidSurfaceGLSL}${quantumEdgeGLSL}${PERIPHERAL_OPTICS_GLSL}
      vec3 wallColor(vec2 pixel){float gleam;
        vec2 ray=(pixel-resolution*.5)/focal;
        float depth=wallRadius/max(.001,length(ray));vec2 wall=ray*depth;
        for(int i=0;i<5;i++){
          float z=cameraZ-depth;float bend=smoothstep(0.,7200.,1200.-z);
          vec2 center=wallRadius*vec2(.48,.18)*bend;
          // Solve the ray/cylinder intersection while retaining the existing gentle wall bend.
          float b=dot(ray,center),rr=dot(ray,ray);
          float disc=b*b-rr*(dot(center,center)-wallRadius*wallRadius);
          depth=(b+sqrt(max(0.,disc)))/max(.000001,rr);
          wall=ray*depth-center;
        }
        float z=cameraZ-depth;
        float a=atan(wall.y,wall.x)-.42*sin(z/1800.);
        vec2 p=vec2((a-flowPhase)/6.2831853+z/6500.,z/1350.);
        vec3 color=liquidSurface(p,time,gleam);
        float fog=exp(-depth/6800.);
        vec2 uv=vec2(pixel.x/resolution.x,1.-pixel.y/resolution.y);
        vec3 wake=opticalCone(uv,resolution,1.16,travelProgress*6.)*sin(travelProgress*3.14159)*.8;
        return vec3(.006,.007,.015)+color*fog*1.12+wake;
      }
      void main(){vec2 pixel=vec2(vUv.x,1.-vUv.y)*resolution;float gleam;
        if(mode>.5){
          vec2 local=(pixel-origin)/vec2(openingAspect,.9);float r=length(local)/radius;
          float a=atan(local.y,local.x);
          if(quantum>.5){
            float edge=quantumEdge(a),d=r-edge;
            if(d<-.006||r>.92)discard;
            vec2 polar=vec2(cos(a-flowPhase),sin(a-flowPhase));
            vec3 n=texture2D(noiseField,polar*.64+vec2(d*1.9-time*.045,d*.9+time*.035)).rgb;
            vec3 fine=texture2D(noiseField,polar*(2.7+d*4.)+n.rg*.45+vec2(d*3.-time*.11,d*2.+time*.07)).rgb;
            float tendril=pow(.5+.5*sin(a*79.+n.g*38.+fine.r*12.+d*68.-time*1.6),8.);
            float reach=.08+.28*pow(n.r,2.);
            float vapor=exp(-max(0.,d)/reach*2.7)*(.3+n.b*.85);
            float fibers=tendril*exp(-max(0.,d)/reach*1.6)*smoothstep(.003,.015,d)*(.3+fine.b);
            float lip=exp(-abs(d)*190.)*(.3+n.g*n.g*2.1);
            float halo=exp(-abs(d)*42.);
            vec3 color=vec3(.24,.07,.46)*vapor+vec3(.50,.25,.80)*fibers*1.3
              +vec3(.42,.34,.58)*halo*.45+vec3(.95,.89,1.)*lip*1.5;
            color+=vec3(.24,.48,1.)*pow(fine.g,3.)*vapor*1.8;
            float alpha=clamp(vapor+fibers+halo*.6+lip,0.,1.)*smoothstep(-.006,.002,d);
            gl_FragColor=vec4(color,alpha);return;
          }
          if(r<.335||r>1.)discard;
          vec3 color=liquidSurface(vec2((a-flowPhase)/6.2831853+log(r)*.65,-log(r)*1.7),time,gleam)*1.7;
          // Match the actual wall at the inner lip, using the same camera and phase.
          color=mix(wallColor(pixel),color,smoothstep(.335,.48,r));
          float edge=smoothstep(.335,.35,r)*(1.-smoothstep(.83,1.,r));
          gl_FragColor=vec4(color,edge);return;
        }
        gl_FragColor=vec4(wallColor(pixel),1.);
      }` });
  private width = 0;
  private height = 0;

  constructor() {
    this.renderer.setClearColor(0, 0); this.renderer.setPixelRatio(1);
    this.field.wrapS = this.field.wrapT = RepeatWrapping;
    this.field.minFilter = this.field.magFilter = LinearFilter; this.field.needsUpdate = true;
    this.scene.add(new Mesh(this.geometry, this.material));
  }
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number, time: number,
    vortex?: { x: number; y: number; radius: number; quantum?: boolean }) {
    // Keep ray coordinates in CSS pixels, but shade every pixel of the composition.
    const density = renderPixelRatio(width, height, ctx.getTransform().a, 'high', 1, this.renderer.capabilities.maxTextureSize);
    const pixelWidth = Math.round(width * density), pixelHeight = Math.round(height * density);
    if (this.width !== pixelWidth || this.height !== pixelHeight) {
      this.width = pixelWidth; this.height = pixelHeight;
      this.renderer.setSize(pixelWidth, pixelHeight, false);
    }
    ctx.canvas.dataset.liquidResolution = `${pixelWidth},${pixelHeight}`;
    const view = introTunnelView(width, height), u = this.material.uniforms;
    u.resolution.value.set(width, height); u.time.value = time; u.cameraZ.value = introFrame(seconds).z;
    u.flowPhase.value = introVortexAngle(1, time);
    u.travelProgress.value=Math.max(0,Math.min(1,(seconds-2.75)/(INTRO_DURATION-2.75)));
    u.openingAspect.value = introPortalFormation(seconds).aspect;
    u.focal.value = view.focal; u.wallRadius.value = view.radius; u.mode.value = vortex ? 1 : 0;
    u.quantum.value = vortex?.quantum ? 1 : 0;
    if (vortex) { u.origin.value.set(vortex.x, vortex.y); u.radius.value = vortex.radius; }
    this.renderer.render(this.scene, this.camera);
    ctx.drawImage(this.renderer.domElement, 0, 0, width, height);
  }
  dispose() { this.geometry.dispose(); this.material.dispose(); this.field.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); }
}

let surface: IntroLiquidSurface | null | undefined;
export function drawIntroLiquid(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number, time: number,
  vortex?: { x: number; y: number; radius: number; quantum?: boolean }) {
  if (surface === undefined) { try { surface = new IntroLiquidSurface(); } catch { surface = null; } }
  if (!surface || surface.renderer.getContext().isContextLost()) return false;
  surface.draw(ctx, width, height, seconds, time, vortex); return true;
}
export function disposeIntroLiquid() { surface?.dispose(); surface = undefined; }
