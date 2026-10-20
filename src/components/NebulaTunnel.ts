import * as THREE from 'three';
import { liquidTextureData } from './liquidSurface';
import { nebulaCenter, nebulaWallRadius } from '../data/universeTransition';

/** An open, finite 3D volume: folded walls occlude each other and the exit opens by perspective. */
export class NebulaTunnel {
  private renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(76, 1, .08, 210);
  private geometry: THREE.CylinderGeometry;
  private material: THREE.ShaderMaterial;
  private noise = new THREE.DataTexture(liquidTextureData(), 128, 128);
  private atlas: THREE.Texture;
  private disposed = false;
  constructor(compact: boolean) {
    this.renderer.setClearColor(0, 0); this.renderer.setPixelRatio(1);
    this.geometry = new THREE.CylinderGeometry(6, 6, 150, compact ? 64 : 96, compact ? 160 : 240, true);
    this.geometry.rotateX(Math.PI / 2); this.geometry.translate(0, 0, -71);
    const vertices = this.geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const a = Math.atan2(vertices.getY(i), vertices.getX(i)), z = vertices.getZ(i), r = nebulaWallRadius(a, z);
      const center = nebulaCenter(-z);
      vertices.setXYZ(i, center.x + Math.cos(a) * r, center.y + Math.sin(a) * r, z);
    }
    this.geometry.computeVertexNormals();
    this.noise.wrapS = this.noise.wrapT = THREE.RepeatWrapping;
    this.noise.minFilter = this.noise.magFilter = THREE.LinearFilter; this.noise.needsUpdate = true;
    this.material = new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: true, toneMapped: false,
      uniforms: { noiseField: { value: this.noise }, nebulaMap: { value: null }, atlasReady: { value: 0 }, clock: { value: 0 } },
      vertexShader: `uniform float clock;varying vec3 wall;varying vec3 viewDirection;varying vec3 wallNormal;
        void main(){wall=position;vec3 p=position;
          p.xy*=1.+.018*sin(p.z*.22+clock*.9+atan(p.y,p.x)*3.);
          vec4 v=modelViewMatrix*vec4(p,1.);viewDirection=-v.xyz;wallNormal=normalMatrix*normal;
          gl_Position=projectionMatrix*v;}`,
      fragmentShader: `precision highp float;uniform sampler2D noiseField,nebulaMap;uniform float atlasReady,clock;
        varying vec3 wall;varying vec3 viewDirection;varying vec3 wallNormal;
        vec3 tile(vec2 uv){vec2 q=fract(uv);vec2 w=smoothstep(vec2(0.),vec2(.12),q)*(1.-smoothstep(vec2(.88),vec2(1.),q));
          return mix(mix(texture2D(nebulaMap,fract(q+.5)).rgb,texture2D(nebulaMap,fract(q+vec2(0.,.5))).rgb,w.x),
            mix(texture2D(nebulaMap,fract(q+vec2(.5,0.))).rgb,texture2D(nebulaMap,q).rgb,w.x),w.y);}
        void main(){
          vec2 uv=wall.xy*.052+vec2(wall.z*.019,wall.z*.013);
          vec3 broad=texture2D(noiseField,uv+vec2(clock*.013,-clock*.009)).rgb;
          vec2 flow=uv+(broad.rg-.5)*.27;
          vec3 detail=texture2D(noiseField,flow*2.8+vec2(-clock*.014,clock*.018)).rgb;
          vec3 fine=texture2D(noiseField,flow*7.2).rgb;
          float cloud=smoothstep(.26,.73,broad.r*.42+detail.g*.4+fine.b*.18);
          float filaments=pow(1.-abs(detail.r-detail.g),14.);
          vec3 atlas=atlasReady>.5?tile(flow*1.4):vec3(.1,.25,.6)*detail.b;
          float facing=abs(dot(normalize(wallNormal),normalize(viewDirection)));
          float rim=pow(1.-facing,3.);
          float fold=.5+.5*sin(atan(wall.y,wall.x)*3.+wall.z*.12+broad.g*4.+detail.b*1.4);
          float light=pow(cloud,1.4)*(.3+fold*.7);
          vec3 gas=mix(vec3(.015,.018,.075),vec3(.025,.20,.65),cloud);
          gas+=vec3(.12,.62,1.8)*light*3.3;
          gas+=vec3(.7,.9,1.)*pow(light,2.4)*5.2;
          gas+=vec3(.20,.08,.5)*filaments*.48+atlas*(.35+rim*.7);
          gas*=.4+rim*.8;gas*=exp(-length(viewDirection)*.018);
          vec3 radiance=1.-exp(-gas*2.15);
          float edge=smoothstep(0.,1.2,4.-wall.z)*smoothstep(0.,2.,wall.z+146.);
          gl_FragColor=vec4(radiance,edge);
        }`,
    });
    this.atlas = new THREE.TextureLoader().load('./img/fx/wormhole-nebula-v1.webp', texture => {
      if (this.disposed) { texture.dispose(); return; } this.material.uniforms.atlasReady.value = 1;
    }, undefined, () => { /* Noise fields retain the illuminated gas if the optional atlas fails. */ });
    this.atlas.colorSpace = THREE.SRGBColorSpace;
    this.atlas.wrapS = this.atlas.wrapT = THREE.RepeatWrapping;
    this.material.uniforms.nebulaMap.value = this.atlas;
    this.scene.add(new THREE.Mesh(this.geometry, this.material));
  }
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, travel: number, clock: number) {
    const w = Math.round(Math.min(width < 600 ? 720 : 1600, width * Math.min(devicePixelRatio, 1.5)));
    const h = Math.max(1, Math.round(w * height / width));
    if (this.renderer.domElement.width !== w || this.renderer.domElement.height !== h) this.renderer.setSize(w, h, false);
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    const center = nebulaCenter(travel), ahead = nebulaCenter(travel + 9);
    this.camera.position.set(center.x, center.y, -travel);
    this.camera.lookAt(ahead.x, ahead.y, -travel - 9);
    this.material.uniforms.clock.value = clock;
    this.renderer.render(this.scene, this.camera); ctx.drawImage(this.renderer.domElement, 0, 0, width, height);
  }
  dispose() {
    this.disposed = true; this.atlas.dispose(); this.noise.dispose(); this.geometry.dispose();
    this.material.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss();
  }
}
