import { Group, MathUtils, PerspectiveCamera, Scene, Vector3 } from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { cylinderRevealSample, SOLAR_PASSAGE } from '../data/solarShowcaseMotion';

/** DOM surfaces share one camera and one cylinder in world coordinates. */
export class ShowcaseSpace {
  readonly elements: HTMLDivElement[];
  private readonly renderer = new CSS3DRenderer();
  private readonly scene = new Scene();
  private readonly ring = new Group();
  private readonly camera = new PerspectiveCamera(45, 1, .1, 10000);
  private readonly objects: CSS3DObject[];
  private readonly projected = new Vector3();
  private width = 1;
  private height = 1;
  private screenWidth = 1;
  private readonly step = .78;
  private arrivalStart = performance.now();

  get arrivalComplete() { return !this.coreArrival || (performance.now() - this.arrivalStart) >= 1400; }

  constructor(private readonly host: HTMLElement, count: number, private coreArrival = false,
    private readonly destinationZ: number | null = SOLAR_PASSAGE.destinationZ) {
    this.renderer.domElement.className = 'screening-css3d';
    this.renderer.domElement.style.pointerEvents = 'none';
    host.appendChild(this.renderer.domElement);
    this.elements = Array.from({ length: count }, () => {
      const element = document.createElement('div');
      element.className = 'screening-surface';
      element.style.pointerEvents = 'auto';
      return element;
    });
    this.objects = this.elements.map(element => {
      const object = new CSS3DObject(element);
      this.ring.add(object);
      return object;
    });
    this.scene.add(this.ring);
    // Attach every portal target once, including screens skipped by instant
    // navigation. Subsequent renders hide them without replacing their DOM.
    this.camera.position.z = 1200;
    this.renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
    this.renderer.render(this.scene, this.camera);
  }

  startArrival() {
    if (this.coreArrival) return;
    this.coreArrival = true;
    this.arrivalStart = performance.now();
  }

  resize(screenWidth: number, center: number, screenHeight = screenWidth * 9 / 16) {
    this.width = this.host.clientWidth;
    this.height = this.host.clientHeight;
    this.screenWidth = screenWidth;
    // Tangent panels meet on one cylinder; the viewer sits at its centre.
    const focalDistance = screenWidth / (2 * Math.tan(this.step / 2)) * 1.025;
    this.camera.fov = MathUtils.radToDeg(2 * Math.atan(this.height / (2 * focalDistance)));
    this.camera.aspect = this.width / this.height;
    this.camera.position.set(0, 0, this.destinationZ ?? focalDistance);
    this.camera.setViewOffset(this.width, this.height, 0, this.height / 2 - center, this.width, this.height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.elements.forEach(element => {
      element.style.width = `${screenWidth}px`;
      element.style.height = `${screenHeight}px`;
    });
  }

  render(slot: number, reduced: boolean) {
    const radius = this.screenWidth / (2 * Math.tan(this.step / 2)) * 1.025;
    const arrival = cylinderRevealSample(this.coreArrival ? (performance.now() - this.arrivalStart) / 1000 : 1.4, reduced);
    const destination = this.destinationZ ?? radius;
    this.camera.position.set(0, 0, reduced ? radius : arrival.cameraZ + destination - SOLAR_PASSAGE.destinationZ);
    this.ring.position.set(0, reduced ? 0 : arrival.y, reduced ? 0 : destination);
    this.ring.rotation.set(arrival.tilt, reduced ? 0 : slot * this.step + arrival.fan, 0);
    this.objects.forEach((object, i) => {
      const distance = i - slot, angle = i * this.step;
      object.visible = Math.abs(distance) < 1.7;
      object.position.set(reduced ? distance * this.screenWidth * 1.08 : Math.sin(angle) * radius, 0,
        reduced ? 0 : -Math.cos(angle) * radius);
      object.rotation.y = reduced ? 0 : -angle;
      object.element.style.filter = `brightness(${Math.max(.35, 1 - Math.abs(distance) * .32)})`;
    });
    this.renderer.render(this.scene, this.camera);
    const root = this.destinationZ === null ? null : this.host.closest<HTMLElement>('.screening-room');
    root?.setAttribute('data-cylinder-time', [Number(this.coreArrival), this.arrivalStart, performance.now()].join(','));
    root?.setAttribute('data-cylinder-pose', [arrival.cameraZ, arrival.y, arrival.tilt, arrival.fan].join(','));
    root?.style.setProperty('--core-flash', String(arrival.flash));
    const closest = Math.max(0, Math.min(this.objects.length - 1, Math.round(slot)));
    this.objects.forEach(object => {
      object.getWorldPosition(this.projected);
      object.element.dataset.spacePose = [...this.projected.toArray(), object.rotation.y + this.ring.rotation.y].join(',');
    });
    this.objects[closest].getWorldPosition(this.projected).project(this.camera);
    return this.projected.x * this.width / 2;
  }

  dispose() {
    this.renderer.domElement.remove();
    this.scene.clear();
  }
}
