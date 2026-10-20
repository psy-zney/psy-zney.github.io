import * as THREE from 'three';

/** One small UV displacement of the actual scene. No tunnel, camera roll or zoom. */
export class PageLens {
  private renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: 'low-power' });
  private texture: THREE.CanvasTexture;
  private material: THREE.ShaderMaterial;
  private scene = new THREE.Scene();
  private geometry = new THREE.PlaneGeometry(2, 2);
  private camera = new THREE.Camera();
  constructor(private source: HTMLCanvasElement) {
    this.texture = new THREE.CanvasTexture(source);
    this.material = new THREE.ShaderMaterial({
      uniforms: { sceneImage: { value: this.texture }, bend: { value: 0 }, aspect: { value: 1 } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: `uniform sampler2D sceneImage;uniform float bend;uniform float aspect;varying vec2 vUv;
        void main(){vec2 d=vUv-vec2(.5);vec2 p=d*vec2(aspect,1.);
          float mask=1.-smoothstep(.08,.38,length(p));
          vec2 uv=clamp(vUv+d*bend*mask*exp(-dot(p,p)*7.),vec2(.001),vec2(.999));
          gl_FragColor=texture2D(sceneImage,uv);}`,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    this.scene.add(new THREE.Mesh(this.geometry, this.material));
  }
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, bend: number) {
    if (this.renderer.domElement.width !== this.source.width || this.renderer.domElement.height !== this.source.height) this.renderer.setSize(this.source.width, this.source.height, false);
    this.texture.needsUpdate = true;
    this.material.uniforms.bend.value = bend; this.material.uniforms.aspect.value = width / height;
    this.renderer.render(this.scene, this.camera); ctx.drawImage(this.renderer.domElement, 0, 0, width, height);
  }
  dispose() { this.texture.dispose(); this.geometry.dispose(); this.material.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); }
}
