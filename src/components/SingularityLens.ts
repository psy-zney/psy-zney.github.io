import { Camera, CanvasTexture, DataTexture, Mesh, PlaneGeometry, RepeatWrapping, Scene, ShaderMaterial, Vector2, WebGLRenderer, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { liquidTextureData } from './liquidSurface';
import { PERIPHERAL_OPTICS_GLSL } from '../data/portalOptics';
import { NEBULA_TUNNEL_GLSL } from './singularityNebula';
import { WHITE_HOLE_EXIT_GLSL } from './whiteHoleExit';

/** Smooth screen-space deflection of the live WebGL scene; no annular image seams. */
export class SingularityLens {
  private renderer = new WebGLRenderer({alpha:true, antialias:false, powerPreference:'low-power'});
  private texture: CanvasTexture;
  private scene = new Scene();
  private camera = new Camera();
  private geometry = new PlaneGeometry(2,2);
  private material: ShaderMaterial;
  private noise = new DataTexture(liquidTextureData(),128,128);
  private nebula: Texture;
  private disposed = false;
  constructor(source: HTMLCanvasElement) {
    this.texture = new CanvasTexture(source); this.texture.minFilter = this.texture.magFilter = LinearFilter;
    this.noise.wrapS=this.noise.wrapT=RepeatWrapping;this.noise.minFilter=this.noise.magFilter=LinearFilter;this.noise.needsUpdate=true;
    this.material = new ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,
      uniforms:{sceneImage:{value:this.texture},noiseField:{value:this.noise},nebulaMap:{value:null},nebulaReady:{value:0},resolution:{value:new Vector2(1,1)},strength:{value:0},mode:{value:0},progress:{value:0},clock:{value:0}},
      vertexShader:'varying vec2 uvPoint;void main(){uvPoint=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`precision highp float;varying vec2 uvPoint;uniform sampler2D sceneImage,noiseField;uniform vec2 resolution;uniform float strength,mode,progress,clock;
        ${PERIPHERAL_OPTICS_GLSL}
        ${NEBULA_TUNNEL_GLSL}
        ${WHITE_HOLE_EXIT_GLSL}
        void main(){
          vec2 aspect=vec2(resolution.x/resolution.y,1.);
          vec2 p=(uvPoint-.5)*aspect;float r=length(p);
          float peripheral=peripheralMask(uvPoint,resolution);
          if(mode>2.5){gl_FragColor=whiteHoleExit(uvPoint,resolution,progress,clock);return;}
          if(mode>1.5){
            vec3 wake=opticalCone(uvPoint,resolution,1.16,clock)*strength;
            gl_FragColor=vec4(vec3(.12,.39,1.),min(.16,length(wake)*8.));return;
          }
          if(mode>.5){
            vec3 color=nebulaTunnel(uvPoint,resolution,progress,clock);
            color+=opticalCone(uvPoint,resolution,1.16,clock)*sin(progress*3.14159)*.15;
            gl_FragColor=vec4(color,1.);return;
          }
          // Every displacement and spectral offset is multiplied by the same exact-zero central mask.
          float field=strength*exp(-pow((r-.40)/.24,2.))*peripheral;
          float angle=field*.24,c=cos(angle),s=sin(angle);
          vec2 bent=mat2(c,-s,s,c)*p*(1.-field*.18);
          vec2 uv=.5+bent/aspect;
          vec2 ca=normalize(p+vec2(.00001))*field*.003/aspect;
          uv=clamp(uv,vec2(.002),vec2(.998));
          vec3 color=vec3(texture2D(sceneImage,clamp(uv+ca,vec2(.002),vec2(.998))).r,
            texture2D(sceneImage,uv).g,texture2D(sceneImage,clamp(uv-ca,vec2(.002),vec2(.998))).b);
          gl_FragColor=vec4(color,smoothstep(.001,.025,field));
        }`});
    this.nebula=new TextureLoader().load('./img/fx/wormhole-nebula-v1.webp',texture=>{
      if(this.disposed){texture.dispose();return;}
      this.material.uniforms.nebulaReady.value=1;
    },undefined,()=>{ /* Procedural walls remain available offline or on asset failure. */ });
    this.nebula.wrapS=this.nebula.wrapT=RepeatWrapping;
    this.nebula.colorSpace=SRGBColorSpace;this.nebula.minFilter=LinearMipmapLinearFilter;
    this.nebula.magFilter=LinearFilter;this.nebula.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());
    this.material.uniforms.nebulaMap.value=this.nebula;
    this.renderer.setClearColor(0,0);this.renderer.setPixelRatio(1);
    this.scene.add(new Mesh(this.geometry,this.material));
  }
  draw(ctx: CanvasRenderingContext2D, width:number, height:number, strength:number) {
    this.material.uniforms.mode.value=0;
    const w=Math.min(1440,width),h=Math.round(w*height/width);
    const canvas=this.renderer.domElement;
    if(canvas.width!==w||canvas.height!==h)this.renderer.setSize(w,h,false);
    this.texture.needsUpdate=true;
    this.material.uniforms.resolution.value.set(width,height);this.material.uniforms.strength.value=strength;
    this.renderer.render(this.scene,this.camera);ctx.drawImage(canvas,0,0,width,height);
  }
  drawTunnel(ctx:CanvasRenderingContext2D,width:number,height:number,progress:number,time:number){
    this.material.uniforms.mode.value=1;this.material.uniforms.progress.value=progress;this.material.uniforms.clock.value=time;
    const w=Math.min(1440,width),h=Math.round(w*height/width);
    if(this.renderer.domElement.width!==w||this.renderer.domElement.height!==h)this.renderer.setSize(w,h,false);
    this.material.uniforms.resolution.value.set(width,height);
    ctx.canvas.dataset.tunnelSurface='layered-nebula-v1';
    ctx.canvas.dataset.nebulaReady=String(this.material.uniforms.nebulaReady.value===1);
    this.renderer.render(this.scene,this.camera);ctx.drawImage(this.renderer.domElement,0,0,width,height);
  }
  drawWake(ctx:CanvasRenderingContext2D,width:number,height:number,time:number,amplitude:number){
    const w=Math.min(1440,width),h=Math.round(w*height/width);
    if(this.renderer.domElement.width!==w||this.renderer.domElement.height!==h)this.renderer.setSize(w,h,false);
    this.material.uniforms.mode.value=2;this.material.uniforms.clock.value=time;this.material.uniforms.strength.value=amplitude;
    this.material.uniforms.resolution.value.set(width,height);
    this.renderer.render(this.scene,this.camera);ctx.drawImage(this.renderer.domElement,0,0,width,height);
  }
  drawExit(ctx:CanvasRenderingContext2D,width:number,height:number,progress:number,time:number){
    const w=Math.min(1440,width),h=Math.round(w*height/width);
    if(this.renderer.domElement.width!==w||this.renderer.domElement.height!==h)this.renderer.setSize(w,h,false);
    this.material.uniforms.mode.value=3;this.material.uniforms.progress.value=progress;this.material.uniforms.clock.value=time;
    this.material.uniforms.resolution.value.set(width,height);
    ctx.canvas.dataset.exitSurface='finite-white-throat';
    ctx.canvas.dataset.exitCameraZ=(-3.6+5.4*progress).toFixed(3);
    this.renderer.render(this.scene,this.camera);ctx.drawImage(this.renderer.domElement,0,0,width,height);
  }
  dispose(){this.disposed=true;this.texture.dispose();this.noise.dispose();this.nebula.dispose();this.geometry.dispose();this.material.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}
}
