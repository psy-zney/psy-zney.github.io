import { Group, MathUtils, PerspectiveCamera, Scene, Vector3 } from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { ShowcaseTunnel } from './ShowcaseTunnel';
import { portalPreviewPresence, tunnelCrossing, tunnelPortal, tunnelStation, tunnelVisibility } from '../data/showcaseTunnel';
import { showcaseProducts } from '../data/productShowcase';
import { cylinderRevealSample, SOLAR_PASSAGE, showcaseRingTurn, SHOWCASE_TURN } from '../data/solarShowcaseMotion';

/** Each native website occupies one world inside a shared three-dimensional tube. */
export class ShowcaseSpace {
  portalCrossing = 0;
  readonly elements: HTMLDivElement[];
  private readonly renderer = new CSS3DRenderer();
  private readonly scene = new Scene();
  private readonly worlds = new Group();
  private readonly camera = new PerspectiveCamera(45, 1, .1, 100000);
  private readonly objects: CSS3DObject[];
  private readonly point = new Vector3();
  private tunnel: ShowcaseTunnel | null = null;
  private width = 1;
  private height = 1;
  private screenWidth = 1;
  private focal = 1;
  private arrivalStart = performance.now();
  private departureStart: number | null = null;
  private departureDirection = 1;
  private lastFrame = performance.now();
  private lastSlot: number | null = null;
  private passageActivity = 0;
  get passageMoving() { return this.passageActivity > .001; }
  private view = { yaw: 0, pitch: 0, roll: 0 };
  private viewTarget = { yaw: 0, pitch: 0, roll: 0 };
  private offset = { x: 0, y: 0, z: 0 };
  private offsetTarget = { x: 0, y: 0, z: 0 };

  get arrivalComplete() { return !this.coreArrival || performance.now() - this.arrivalStart >= SHOWCASE_TURN.enter * 1000; }
  get departureComplete() { return this.departureStart !== null && performance.now() - this.departureStart >= SHOWCASE_TURN.exit * 1000; }
  get viewMoving() { return Object.keys(this.view).some(key => Math.abs(this.view[key as keyof typeof this.view] - this.viewTarget[key as keyof typeof this.viewTarget]) > .0001) ||
    (['x', 'y', 'z'] as const).some(key => Math.abs(this.offset[key] - this.offsetTarget[key]) > .01); }

  constructor(private readonly host: HTMLElement, count: number, private coreArrival = false,
    private readonly destinationZ: number | null = SOLAR_PASSAGE.destinationZ) {
    this.renderer.domElement.className = 'screening-css3d';
    this.renderer.domElement.style.pointerEvents = 'none'; host.appendChild(this.renderer.domElement);
    this.elements = Array.from({ length: count }, () => {
      const element = document.createElement('div'); element.className = 'screening-surface';
      element.style.transformStyle = 'preserve-3d';
      element.style.pointerEvents = 'auto'; return element;
    });
    this.objects = this.elements.map(element => { const object = new CSS3DObject(element); this.worlds.add(object); return object; });
    this.scene.add(this.worlds); this.camera.position.z = 1200;
    this.renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
    this.renderer.render(this.scene, this.camera);
    if (destinationZ !== null) {
      try { this.tunnel = new ShowcaseTunnel(host, count); }
      catch { host.closest<HTMLElement>('.screening-room')?.setAttribute('data-tunnel-fallback', 'true'); }
    }
  }

  startArrival() { if (!this.coreArrival) { this.coreArrival = true; this.arrivalStart = performance.now(); } }
  startDeparture(direction: number) { this.departureStart = performance.now(); this.departureDirection = Math.sign(direction) || 1; }
  look(dx: number, dy: number, roll = 0) {
    this.viewTarget.yaw -= dx * .0035;
    this.viewTarget.pitch = Math.max(-1.05, Math.min(1.05, this.viewTarget.pitch - dy * .0035));
    this.viewTarget.roll += roll;
  }
  travel(x: number, y: number, z: number) {
    const direction = new Vector3(x, y, z).applyEuler(this.camera.rotation).multiplyScalar(this.focal * .12);
    for (const key of ['x', 'y', 'z'] as const) this.offsetTarget[key] = MathUtils.clamp(this.offsetTarget[key] + direction[key], -this.focal * .25, this.focal * .25);
  }
  resetView() { this.viewTarget = { yaw: 0, pitch: 0, roll: 0 }; this.offsetTarget = { x: 0, y: 0, z: 0 }; }
  setAmbient(active: boolean) { this.tunnel?.setActive(active); }
  clearPassage() { this.lastSlot = null; this.passageActivity = 0; this.portalCrossing = 0; }

  resize(screenWidth: number, center: number, screenHeight = screenWidth * 9 / 16) {
    this.width = this.host.clientWidth; this.height = this.host.clientHeight; this.screenWidth = screenWidth;
    this.focal = screenWidth / (2 * Math.tan(Math.PI / 9)) * 1.025;
    this.camera.fov = MathUtils.radToDeg(2 * Math.atan(this.height / (2 * this.focal)));
    this.camera.aspect = this.width / this.height;
    this.camera.setViewOffset(this.width, this.height, 0, this.height / 2 - center, this.width, this.height);
    this.camera.updateProjectionMatrix(); this.renderer.setSize(this.width, this.height);
    this.tunnel?.resize(this.width, this.height);
    this.elements.forEach(element => { element.style.width = `${screenWidth}px`; element.style.height = `${screenHeight}px`; });
  }

  render(slot: number, reduced: boolean) {
    const now = performance.now(), dt = Math.min(.05, Math.max(.001, (now - this.lastFrame) / 1000)); this.lastFrame = now;
    const blend = reduced ? 1 : 1 - Math.exp(-dt * 14);
    for (const key of ['yaw', 'pitch', 'roll'] as const) {
      this.view[key] += (this.viewTarget[key] - this.view[key]) * blend;
      if (Math.abs(this.view[key] - this.viewTarget[key]) < .0001) this.view[key] = this.viewTarget[key];
    }
    for (const key of ['x', 'y', 'z'] as const) {
      this.offset[key] += (this.offsetTarget[key] - this.offset[key]) * blend;
      if (Math.abs(this.offset[key] - this.offsetTarget[key]) < .01) this.offset[key] = this.offsetTarget[key];
    }
    // The full interactive reader retains a single native, flat HTML plane.
    if (this.destinationZ === null) {
      this.camera.position.set(0, 0, this.focal); this.camera.rotation.set(0, 0, 0);
      this.worlds.position.set(0, 0, 0); this.worlds.rotation.set(0, 0, 0);
      this.objects[0].position.set(0, 0, 0); this.objects[0].rotation.set(0, 0, 0);
      this.renderer.render(this.scene, this.camera); return 0;
    }
    const arrival = cylinderRevealSample(this.coreArrival ? (now - this.arrivalStart) / 1000 : SHOWCASE_TURN.enter, reduced);
    const departing = this.departureStart !== null;
    const turn = showcaseRingTurn(departing ? (now - this.departureStart!) / 1000 :
      this.coreArrival ? (now - this.arrivalStart) / 1000 : SHOWCASE_TURN.enter,
      departing, departing ? this.departureDirection : -1, reduced);
    const radius = this.focal * .72, station = tunnelStation(slot, radius, this.focal);
    const moving = reduced || this.lastSlot === null ? 0 : Math.min(1, Math.abs(slot - this.lastSlot) / dt / .32);
    this.lastSlot = slot;
    this.passageActivity += (moving - this.passageActivity) * (1 - Math.exp(-dt * (moving > this.passageActivity ? 20 : 7)));
    if (reduced || this.passageActivity < .001) this.passageActivity = 0;
    this.portalCrossing = tunnelCrossing(slot, reduced) * this.passageActivity;
    const presence = portalPreviewPresence(this.portalCrossing);
    this.camera.position.set(reduced ? 0 : station.x + this.offset.x, reduced ? 0 : station.y + this.offset.y,
      reduced ? this.focal : station.z + this.offset.z + (arrival.cameraZ - SOLAR_PASSAGE.destinationZ) * .4);
    this.camera.rotation.set(reduced ? 0 : this.view.pitch, reduced ? 0 : this.view.yaw, reduced ? 0 : this.view.roll, 'YXZ');
    this.worlds.position.set(0, 0, reduced ? 0 : -turn.depth * this.focal);
    this.worlds.rotation.set(0, 0, reduced ? 0 : turn.yaw + turn.roll);
    const lookingBack = Math.cos(this.view.yaw) < .2;
    const closest = Math.max(0, Math.min(this.objects.length - 1, Math.round(slot)));
    this.objects.forEach((object, i) => {
      const distance = i - slot, world = tunnelStation(i, radius, this.focal);
      const opacity = reduced ? Number(Math.abs(distance) < 1.6) : tunnelVisibility(distance, lookingBack);
      object.visible = opacity > .01;
      object.position.set(reduced ? distance * this.screenWidth * 1.08 : world.x,
        reduced ? 0 : world.y, reduced ? 0 : world.z - this.focal * 1.35);
      if (reduced) object.rotation.set(0, 0, 0);
      else {
        // Windows are mounted toward the tube's interior, rather than billboards.
        this.point.set(0, 0, world.z - this.focal * .45);
        object.lookAt(this.point);
      }
      // Keep the focused curve in 3D. Distant windows fade as one composited
      // surface to avoid translucent strip seams where the images overlap.
      object.element.style.opacity = String((i === closest ? 1 : opacity) * presence);
      object.element.style.setProperty('--surface-opacity', '1');
      object.element.style.setProperty('--surface-brightness', String(Math.max(.4, 1 - Math.abs(distance) * .2)));
      object.element.style.pointerEvents = i === closest ? 'auto' : 'none';
      object.getWorldPosition(this.point);
      object.element.dataset.spacePose = [...this.point.toArray(), object.rotation.y].join(',');
    });
    if (!reduced) this.tunnel?.render(this.camera, radius, this.focal, slot, turn.yaw + turn.roll, showcaseProducts[closest]?.color || '#a8c8ff', turn.depth, this.portalCrossing);
    const canvas = this.host.querySelector<HTMLElement>('.screening-tunnel-canvas');
    if (canvas) canvas.hidden = reduced;
    this.renderer.render(this.scene, this.camera);
    const root = this.host.closest<HTMLElement>('.screening-room');
    root?.setAttribute('data-cylinder-time', [Number(this.coreArrival), this.arrivalStart, now].join(','));
    root?.setAttribute('data-cylinder-pose', [arrival.cameraZ, arrival.y, arrival.tilt, arrival.fan].join(','));
    root?.setAttribute('data-showcase-turn', [turn.yaw, turn.roll, turn.depth].join(','));
    root?.setAttribute('data-tunnel-pose', [...this.camera.position.toArray(), this.view.yaw, this.view.pitch, this.view.roll].join(','));
    root?.setAttribute('data-world-depth', String(slot));
    root?.setAttribute('data-portal-crossing', this.portalCrossing.toFixed(3));
    root?.setAttribute('data-portal-plane', [Math.floor(slot), (this.camera.position.z - tunnelPortal(Math.floor(slot), this.focal).z) / this.focal].join(','));
    root?.style.setProperty('--portal-crossing', String(this.portalCrossing));
    root?.style.setProperty('--portal-presence', String(presence));
    root?.style.setProperty('--core-flash', String(arrival.flash));
    return 0;
  }

  dispose() { this.tunnel?.dispose(); this.renderer.domElement.remove(); this.scene.clear(); }
}
