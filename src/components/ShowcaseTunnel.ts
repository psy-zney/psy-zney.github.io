import { AdditiveBlending, BackSide, BufferGeometry, Color, CylinderGeometry, DataTexture, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, LinearFilter, Mesh, PerspectiveCamera, Points, RepeatWrapping, Scene, ShaderMaterial, Vector3, WebGLRenderer } from 'three';
import { showcaseProducts } from '../data/productShowcase';
import { ShowcasePortals } from './ShowcasePortals';
import { showcaseScreenPoint } from '../data/showcaseScreen';
import { portalPreviewPresence, tunnelStation, tunnelVisibility, tunnelWorldBlend } from '../data/showcaseTunnel';
import { liquidSurfaceGLSL, liquidTextureData } from './liquidSurface';

/** Shared camera, curved mounts and slow ambient detail around native web windows. */
export class ShowcaseTunnel {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly shell: Mesh<CylinderGeometry, ShaderMaterial>;
  private readonly portals: ShowcasePortals;
  private readonly mounts = new Group();
  private readonly filaments = new Group();
  private readonly rimGeometry = new BufferGeometry();
  private readonly connectionGeometry = new BufferGeometry();
  private readonly dustGeometry = new BufferGeometry();
  private readonly noiseField: DataTexture;
  private readonly rimMaterials: LineBasicMaterial[] = [];
  private readonly flowMaterial: ShaderMaterial;
  private readonly dustMaterial: ShaderMaterial;
  private readonly tint = new Color('#a8c8ff');
  private readonly nextTint = new Color();
  private readonly root: HTMLElement | null;
  private camera: PerspectiveCamera | null = null;
  private active = false;
  private frame = 0;
  private time = 0;
  private last = 0;
  private lastDraw = 0;
  private readonly fps: number;
  private state = { focal: 1, slot: 0, spin: 0, depth: 0, crossing: 0 };

  constructor(host: HTMLElement, private readonly count: number) {
    const mobile = host.clientWidth < 700;
    this.fps = mobile ? 18 : 24;
    this.root = host.closest<HTMLElement>('.screening-room');
    this.renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
    this.renderer.setClearColor('#03050b', 1);
    this.renderer.domElement.className = 'screening-tunnel-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    host.prepend(this.renderer.domElement);
    // Cached 64 KiB smooth, seamless field; surface advection stays on the GPU.
    this.noiseField = new DataTexture(liquidTextureData(), 128, 128);
    this.noiseField.wrapS = this.noiseField.wrapT = RepeatWrapping;
    this.noiseField.minFilter = this.noiseField.magFilter = LinearFilter;
    this.noiseField.needsUpdate = true;
    this.portals = new ShowcasePortals(this.noiseField, count);
    const geometry = new CylinderGeometry(1, 1, 1, 72, 32, true);
    geometry.rotateX(Math.PI / 2);
    const material = new ShaderMaterial({ side: BackSide, uniforms: {
      tint: { value: this.tint }, phase: { value: 0 }, time: { value: 0 }, focal: { value: 1 }, crossing: { value: 0 }, noiseField: { value: this.noiseField },
    }, vertexShader: `varying vec2 tubeUv; varying vec3 tubeWorld;
      void main(){ tubeUv=uv; vec4 w=modelMatrix*vec4(position,1.); tubeWorld=w.xyz;
        gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec2 tubeUv; varying vec3 tubeWorld;
      uniform vec3 tint; uniform float phase,time,focal,crossing;
      ${liquidSurfaceGLSL}
      void main(){
        float z=tubeWorld.z/focal;
        vec2 p=vec2(tubeUv.x+sin(z*.6+time*.12)*.07,z*.16);
        float gleam;vec3 liquid=liquidSurface(p,time,gleam);
        liquid=mix(liquid,liquid*(tint*.6+.65),.15);
        float fog=exp(-length(tubeWorld-cameraPosition)/focal*.13);
        gl_FragColor=vec4(vec3(.006,.010,.020)+liquid*fog*(.32+crossing*.68),1.);
      }` });
    this.shell = new Mesh(geometry, material);
    this.scene.add(this.shell, this.mounts, this.filaments, this.portals.group);

    this.flowMaterial = new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { tint: { value: this.tint }, time: { value: 0 }, slot: { value: 0 }, focal: { value: 1 }, presence: { value: 1 } },
      vertexShader: `attribute float progress,station; varying float vProgress,vStation,vDistance;
        void main(){vProgress=progress;vStation=station;vec4 w=modelMatrix*vec4(position,1.);
          vDistance=length(w.xyz-cameraPosition);gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader: `uniform vec3 tint;uniform float time,slot,focal,presence;varying float vProgress,vStation,vDistance;
        void main(){float focus=vStation<0.?.3:max(0.,1.-abs(vStation-slot)*.5);
          float pulse=pow(.5+.5*cos(vProgress*13.-time*.65+vStation),4.);
          float visible=vStation<0.?1.:focus*presence;
          float alpha=(.025+focus*.10+pulse*.12)*visible*exp(-vDistance/focal*.18);
          gl_FragColor=vec4(mix(tint,vec3(.5,.72,1.),.25),alpha);}` });
    const links: number[] = [], linkProgress: number[] = [], linkStations: number[] = [];
    const width = 2 * Math.tan(Math.PI / 9) / 1.025, height = width * 9 / 16;
    const rim: number[] = [];
    const point = (u: number, y: number) => { const p = showcaseScreenPoint(u); return new Vector3(p.x * width, y * height, p.z * width); };
    for (const y of [-.5, .5]) for (let s = 0; s < 48; s++) rim.push(...point(s / 48, y).toArray(), ...point((s + 1) / 48, y).toArray());
    for (const u of [0, 1]) rim.push(...point(u, -.5).toArray(), ...point(u, .5).toArray());
    this.rimGeometry.setAttribute('position', new Float32BufferAttribute(rim, 3));
    for (let i = 0; i < count; i++) {
      const station = tunnelStation(i, .72, 1), mount = new Group();
      mount.position.set(station.x, station.y, station.z - 1.35);
      mount.lookAt(new Vector3(0, 0, station.z - .45));
      const rimMaterial = new LineBasicMaterial({ color: showcaseProducts[i]?.color || '#a8c8ff', transparent: true, opacity: .5, depthWrite: false });
      this.rimMaterials.push(rimMaterial); mount.add(new LineSegments(this.rimGeometry, rimMaterial));
      this.mounts.add(mount); mount.updateMatrixWorld(true);
      // Two curved optical links dock each display to the nearest tube wall.
      for (const side of [0, 1]) {
        const start = mount.localToWorld(point(side, 0));
        const angle = Math.atan2(start.y, start.x) + (side ? -.12 : .12);
        const end = new Vector3(Math.cos(angle) * .71, Math.sin(angle) * .71, station.z - 1.65);
        for (let j = 0; j < 24; j++) for (const t of [j / 24, (j + 1) / 24]) {
          const p = start.clone().lerp(end, t); p.z -= Math.sin(t * Math.PI) * .07;
          links.push(...p.toArray()); linkProgress.push(t); linkStations.push(i);
        }
      }
    }
    this.connectionGeometry.setAttribute('position', new Float32BufferAttribute(links, 3));
    this.connectionGeometry.setAttribute('progress', new Float32BufferAttribute(linkProgress, 1));
    this.connectionGeometry.setAttribute('station', new Float32BufferAttribute(linkStations, 1));
    // Flow belongs to the liquid shader; only the optical display connections remain lines.
    this.mounts.add(new LineSegments(this.connectionGeometry, this.flowMaterial));

    const dust: number[] = [], seeds: number[] = [];
    const random = (i: number) => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
    for (let i = 0; i < (mobile ? 140 : 280); i++) {
      const a = random(i * 3) * Math.PI * 2, r = .72 * (.55 + random(i * 3 + 1) * .42);
      dust.push(Math.cos(a) * r, Math.sin(a) * r, 3 - random(i * 3 + 2) * (count + 9) * .9); seeds.push(random(i + 987));
    }
    this.dustGeometry.setAttribute('position', new Float32BufferAttribute(dust, 3));
    this.dustGeometry.setAttribute('seed', new Float32BufferAttribute(seeds, 1));
    this.dustMaterial = new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { tint: { value: this.tint }, time: { value: 0 }, focal: { value: 1 } },
      vertexShader: `attribute float seed;uniform float time,focal;varying float vLight;
        void main(){vec3 p=position;p.xy+=vec2(sin(time*.09+seed*19.),cos(time*.07+seed*27.))*.003;
          vec4 w=modelMatrix*vec4(p,1.);vLight=(.25+.18*sin(time*.3+seed*31.))*exp(-length(w.xyz-cameraPosition)/focal*.12);
          gl_PointSize=1.1+seed*1.8;gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader: `uniform vec3 tint;varying float vLight;void main(){float r=length(gl_PointCoord-.5)*2.;
        gl_FragColor=vec4(mix(tint,vec3(.65,.79,1.),.4),pow(max(0.,1.-r),2.)*vLight);}` });
    this.filaments.add(new Points(this.dustGeometry, this.dustMaterial));
    this.root?.setAttribute('data-tunnel-detail', 'liquid,caustics,nebula,dust,curved-mounts');
    this.root?.setAttribute('data-tunnel-connections', String(count * 2));
    this.root?.setAttribute('data-portal-count', String(count));
    this.root?.setAttribute('data-portal-effects', 'vortex,waves,lightning,world-crossing');
    document.addEventListener('visibilitychange', this.visibility);
  }

  resize(width: number, height: number) { this.renderer.setSize(width, height); }
  private visibility = () => this.syncAnimation();
  setActive(active: boolean) { this.active = active; this.syncAnimation(); }
  private syncAnimation() {
    cancelAnimationFrame(this.frame); this.frame = 0;
    const running = this.active && !document.hidden;
    this.root?.setAttribute('data-tunnel-ambient', running ? 'running' : 'paused');
    if (!running) return;
    this.last = this.lastDraw = performance.now();
    const tick = (now: number) => {
      this.time += Math.min(.1, Math.max(0, (now - this.last) / 1000)); this.last = now;
      if (now - this.lastDraw >= 1000 / this.fps) { this.lastDraw = now; this.draw(); }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  private draw() {
    if (!this.camera) return;
    this.lastDraw = performance.now();
    for (const material of [this.shell.material, this.flowMaterial, this.dustMaterial]) material.uniforms.time.value = this.time;
    const { focal, slot, spin, depth, crossing } = this.state;
    const portal = this.portals.update(this.time, this.camera, focal, slot, spin, depth, crossing);
    this.root?.setAttribute('data-portal-palette', portal.palette);
    this.root?.setAttribute('data-portal-lightning', portal.lightning.toFixed(3));
    this.renderer.render(this.scene, this.camera);
    this.root?.setAttribute('data-tunnel-time', this.time.toFixed(3));
  }

  render(camera: PerspectiveCamera, radius: number, focal: number, slot: number, spin: number, color: string, depth = 0, crossing = 0) {
    this.camera = camera;
    this.state.focal = focal; this.state.slot = slot; this.state.spin = spin; this.state.depth = depth;
    this.state.crossing = crossing;
    const world = tunnelWorldBlend(slot, this.count);
    this.tint.set(showcaseProducts[world.from]?.color || color);
    this.nextTint.set(showcaseProducts[world.to]?.color || color); this.tint.lerp(this.nextTint, world.blend);
    const length = (this.count + 9) * focal * .9;
    this.shell.scale.set(radius, radius, length); this.shell.position.z = -(this.count - 1) * focal * .45; this.shell.rotation.z = spin;
    this.shell.material.uniforms.phase.value = slot;
    this.shell.material.uniforms.crossing.value = crossing;
    this.flowMaterial.uniforms.slot.value = slot;
    this.flowMaterial.uniforms.presence.value = portalPreviewPresence(crossing);
    for (const material of [this.shell.material, this.flowMaterial, this.dustMaterial]) material.uniforms.focal.value = focal;
    this.mounts.scale.setScalar(focal); this.mounts.rotation.z = spin; this.mounts.position.z = -depth * focal;
    this.filaments.scale.setScalar(focal); this.filaments.rotation.z = spin;
    this.rimMaterials.forEach((material, i) => { material.opacity = tunnelVisibility(i - slot, Math.cos(camera.rotation.y) < .2) * (Math.abs(i - slot) < .5 ? .7 : .2) * portalPreviewPresence(crossing); });
    this.draw();
  }

  dispose() {
    this.active = false; cancelAnimationFrame(this.frame); document.removeEventListener('visibilitychange', this.visibility);
    this.shell.geometry.dispose(); this.shell.material.dispose();
    for (const geometry of [this.rimGeometry, this.connectionGeometry, this.dustGeometry]) geometry.dispose();
    this.rimMaterials.forEach(material => material.dispose()); this.portals.dispose();
    this.flowMaterial.dispose(); this.dustMaterial.dispose(); this.noiseField.dispose(); this.scene.clear();
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
