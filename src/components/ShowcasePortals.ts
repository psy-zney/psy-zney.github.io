import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, LineSegments, Mesh, PerspectiveCamera, RingGeometry, ShaderMaterial, Texture, TorusGeometry } from 'three';
import { showcaseProducts } from '../data/productShowcase';
import { portalLightning, tunnelPortal, tunnelWorldBlend } from '../data/showcaseTunnel';
import { liquidSurfaceGLSL } from './liquidSurface';

/** Physical apertures between URL worlds; the camera crosses their Z planes. */
export class ShowcasePortals {
  readonly group = new Group();
  private readonly gates: { root: Group; material: ShaderMaterial; halo: ShaderMaterial; electricity: ShaderMaterial }[] = [];
  private readonly torus = new TorusGeometry(.60, .085, 24, 128);
  private readonly aperture = new RingGeometry(.46, .86, 128, 16);
  private readonly waveGeometry = new TorusGeometry(.69, .025, 12, 128);
  private readonly bolts = new BufferGeometry();
  private readonly waves: Mesh<TorusGeometry, ShaderMaterial>[] = [];
  private readonly paletteA = new Color();
  private readonly paletteB = new Color();
  private readonly cool = new Color('#8ecbff');

  constructor(noise: Texture, private readonly count: number) {
    const positions: number[] = [], travel: number[] = [];
    // Jagged branches follow the rim and wall; none crosses the reading aperture.
    for (let bolt = 0; bolt < 5; bolt++) {
      const start = bolt * Math.PI * 2 / 5 + .18;
      for (let i = 0; i < 30; i++) for (const t of [i / 30, (i + 1) / 30]) {
        const a = start + t * .68, r = .60 + Math.sin(t * 65 + bolt * 17) * .015 + t * .07;
        positions.push(Math.cos(a) * r, Math.sin(a) * r, Math.sin(t * 43 + bolt) * .016);
        travel.push(t);
      }
      for (let i = 0; i < 10; i++) for (const t of [i / 10, (i + 1) / 10]) {
        const a = start + .37 - t * .18, r = .65 + t * .07 + Math.sin(t * 44 + bolt) * .009;
        positions.push(Math.cos(a) * r, Math.sin(a) * r, -.015 - t * .16); travel.push(t);
      }
    }
    this.bolts.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.bolts.setAttribute('travel', new Float32BufferAttribute(travel, 1));
    const vertex = `varying vec2 vUv;varying vec3 vLocal;uniform float time,seed;
      void main(){vUv=uv;vec3 p=position;float a=atan(p.y,p.x);
        p.xy*=1.+sin(a*3.+time*.24+seed)*.055+sin(a*5.-time*.15)*.022;
        p.z+=sin(a*4.-time*.17+seed)*.045;
        vLocal=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
    for (let i = 0; i < count; i++) {
      const root = new Group(), p = tunnelPortal(i);
      root.position.set(p.x, p.y, p.z);
      const uniforms = () => ({ time: { value: 0 }, seed: { value: i * 1.37 }, noiseField: { value: noise },
        tint: { value: new Color(showcaseProducts[Math.min(i + 1, count - 1)]?.color || '#9ecbff') }, gain: { value: 1 } });
      const material = new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending,
        uniforms: uniforms(), vertexShader: vertex,
        fragmentShader: `varying vec2 vUv;varying vec3 vLocal;uniform vec3 tint;uniform float time,seed,gain;
          ${liquidSurfaceGLSL}
          void main(){float gleam;vec3 color=liquidSurface(vec2(vUv.x+seed,vUv.y*.34),time,gleam);
            float wet=.4+.6*pow(.5+.5*cos(vUv.y*6.283+sin(vUv.x*18.85-time*.24)*.65),3.);
            color=mix(color,color*(tint*.5+.7),.16);
            float edge=pow(max(0.,sin(vUv.y*6.283)),.65);
            gl_FragColor=vec4(color*(.8+wet*.6),(.32+gleam*.45)*gain*edge);}` });
      const halo = new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
        uniforms: uniforms(), vertexShader: vertex,
        fragmentShader: `varying vec3 vLocal;uniform vec3 tint;uniform float time,seed,gain;
          ${liquidSurfaceGLSL}
          void main(){float r=length(vLocal.xy),a=atan(vLocal.y,vLocal.x);
            vec2 p=vec2(a/6.283+log(max(.01,r))*.65+seed,r*1.7);
            float gleam;vec3 color=liquidSurface(p,time,gleam);
            float envelope=smoothstep(.46,.56,r)*(1.-smoothstep(.64,.86,r));
            gl_FragColor=vec4(color,envelope*(.38+gleam*.3)*gain);}` });
      const electricity = new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending,
        uniforms: { time: { value: 0 }, gain: { value: 0 }, seed: { value: i } },
        vertexShader: `attribute float travel;varying float vTravel;uniform float time,seed;
          void main(){vTravel=travel;vec3 p=position;p.xy*=1.+sin(travel*45.+time*7.+seed)*.004;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
        fragmentShader: `varying float vTravel;uniform float gain;void main(){
          gl_FragColor=vec4(.48,.78,1.,gain*(.55+.45*sin(vTravel*3.1416)));}` });
      const body = new Mesh(this.torus, material), glow = new Mesh(this.aperture, halo);
      glow.position.z = -.025;
      root.add(glow, body, new LineSegments(this.bolts, electricity));
      this.group.add(root); this.gates.push({ root, material, halo, electricity });
    }
    for (let i = 0; i < 2; i++) {
      const material = new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
        uniforms: { time: { value: 0 }, seed: { value: i * 3 }, gain: { value: .3 }, tint: { value: new Color('#9acfff') }, noiseField: { value: noise } }, vertexShader: vertex,
        fragmentShader: `varying vec2 vUv;uniform float time,gain;${liquidSurfaceGLSL}
          void main(){float gleam;vec3 color=liquidSurface(vec2(vUv.x,vUv.y*.2),time,gleam);
            float edge=pow(.5+.5*cos(vUv.y*6.283),2.);gl_FragColor=vec4(color,gain*edge*.45);}` });
      const wave = new Mesh(this.waveGeometry, material); this.waves.push(wave); this.group.add(wave);
    }
  }

  update(time: number, camera: PerspectiveCamera, focal: number, slot: number, spin: number, depth: number, crossing: number) {
    this.group.scale.setScalar(focal); this.group.rotation.z = spin; this.group.position.z = -depth * focal;
    const lookBack = Math.cos(camera.rotation.y) < .2;
    let lightning = 0;
    this.gates.forEach((gate, i) => {
      const distance = (camera.position.z - (gate.root.position.z * focal - depth * focal)) / focal;
      gate.root.visible = Math.abs(distance) < 3.8 && (lookBack || distance > -.12) && Math.abs(distance) > .035;
      const close = Math.max(0, Math.min(1, (Math.abs(distance) - .25) / .65));
      // Grow out of the wall mist before the camera approaches; no hard pop
      // at the visibility boundary and no overlapping bright rings at rest.
      const reveal = Math.max(0, Math.min(1, (3.8 - Math.abs(distance)) / 2.4));
      const mist = reveal * reveal * (3 - 2 * reveal);
      const gain = close * close * (3 - 2 * close) * (.28 + crossing * .52) * mist;
      const discharge = portalLightning(time, i) * (.7 + crossing * .3);
      lightning = Math.max(lightning, gate.root.visible ? discharge : 0);
      gate.material.uniforms.time.value = gate.halo.uniforms.time.value = gate.electricity.uniforms.time.value = time;
      gate.material.uniforms.gain.value = gain * (1 + discharge * .35);
      gate.halo.uniforms.gain.value = gain * (1 + discharge * .12);
      gate.electricity.uniforms.gain.value = discharge * gain * .55;
    });
    const world = tunnelWorldBlend(slot, this.count);
    this.paletteA.set(showcaseProducts[world.from].color); this.paletteB.set(showcaseProducts[world.to].color);
    this.waves.forEach((wave, i) => {
      const phase = ((time * .17 * (i ? -1 : 1) + i * 1.8) % 3.6 + 3.6) % 3.6;
      const p = tunnelPortal(Math.floor(slot) - 1 + phase);
      wave.position.set(p.x * .35, p.y * .35, p.z);
      wave.material.uniforms.time.value = time;
      wave.material.uniforms.tint.value.copy(this.paletteA).lerp(this.paletteB, world.blend).lerp(this.cool, .3);
      wave.material.uniforms.gain.value = .2 + crossing * .25;
    });
    return { lightning, palette: `${world.from},${world.to},${world.blend.toFixed(3)}` };
  }

  dispose() {
    for (const gate of this.gates) { gate.material.dispose(); gate.halo.dispose(); gate.electricity.dispose(); }
    this.waves.forEach(wave => wave.material.dispose());
    this.torus.dispose(); this.aperture.dispose(); this.waveGeometry.dispose(); this.bolts.dispose(); this.group.clear();
  }
}
