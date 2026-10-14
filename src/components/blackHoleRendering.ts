import * as THREE from 'three';
import { ACCRETION_FRAGMENT, BLOOM_FRAGMENT, FULLSCREEN_VERTEX, GEODESIC_FRAGMENT } from './blackHoleShader';

type RayUniforms = Record<string, THREE.IUniform>;

const BLOOM_SIZES = [192, 96, 48] as const;

/** A local HDR pipeline: only the black hole is rendered and bloomed here. */
export class BlackHoleRenderPipeline {
  readonly radiance = this.target(1);
  private readonly paths = new THREE.WebGLRenderTarget(1, 1, {
    count: 4,
    type: THREE.HalfFloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
  readonly stats = { traces: 0, shades: 0 };
  readonly bloom = BLOOM_SIZES.map(size => ({ ping: this.target(size), output: this.target(size) }));
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly geometry = new THREE.PlaneGeometry(2, 2);
  private readonly rayMaterial: THREE.ShaderMaterial;
  private readonly gasMaterial: THREE.ShaderMaterial;
  private traced = { azimuth: NaN, elevation: NaN, resolution: 0 };
  private readonly blur = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: BLOOM_FRAGMENT,
    uniforms: { uSource: { value: null }, uDirection: { value: new THREE.Vector2() }, uThreshold: { value: 0 } },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly quad: THREE.Mesh;
  private readonly clearColor = new THREE.Color();
  private readonly viewport = new THREE.Vector4();
  private readonly scissor = new THREE.Vector4();
  private resolution = 0;
  private preparation: Promise<void> | null = null;
  private readonly noise = this.noiseTexture();
  private users = 0;
  private disposalVersion = 0;

  constructor(uniforms: RayUniforms) {
    uniforms.uNoise = { value: this.noise };
    // The distant disk is strongly minified. Average radiance before tone mapping.
    this.radiance.texture.generateMipmaps = true;
    this.radiance.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.rayMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: GEODESIC_FRAGMENT,
      uniforms,
      glslVersion: THREE.GLSL3,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.gasMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: ACCRETION_FRAGMENT,
      uniforms: {
        ...uniforms,
        uFirstEncounter: { value: this.paths.textures[0] },
        uSecondEncounter: { value: this.paths.textures[1] },
        uThirdEncounter: { value: this.paths.textures[2] },
        uRayMeta: { value: this.paths.textures[3] },
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.quad = new THREE.Mesh(this.geometry, this.rayMaterial);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  invalidatePaths() {
    this.traced.azimuth = NaN;
  }

  retain() {
    this.users++;
    this.disposalVersion++;
  }

  private noiseTexture() {
    const size = 256,
      values = new Uint8Array(size * size),
      pixels = new Uint8Array(size * size * 4);
    let seed = 0x6d2b79f5;
    for (let i = 0; i < values.length; i++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      values[i] = seed >>> 24;
    }
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const offset = (y * size + x) * 4;
        pixels[offset] = values[y * size + x];
        pixels[offset + 1] = values[((y + 17) % size) * size + ((x + 37) % size)];
        pixels[offset + 3] = 255;
      }
    const texture = new THREE.DataTexture(pixels, size, size);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  prepare(renderer: THREE.WebGLRenderer) {
    if (this.preparation) return this.preparation;
    const previousTarget = renderer.getRenderTarget();
    const jobs: Promise<unknown>[] = [];
    try {
      for (const [material, target] of [
        [this.rayMaterial, this.paths],
        [this.gasMaterial, this.radiance],
        [this.blur, this.bloom[0].ping],
      ] as const) {
        const scene = new THREE.Scene();
        scene.add(new THREE.Mesh(this.geometry, material));
        renderer.setRenderTarget(target);
        jobs.push(renderer.compileAsync(scene, this.camera));
      }
    } finally {
      renderer.setRenderTarget(previousTarget);
    }
    this.preparation = Promise.all(jobs).then(() => undefined);
    return this.preparation;
  }

  private target(size: number) {
    return new THREE.WebGLRenderTarget(size, size, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
  }

  render(renderer: THREE.WebGLRenderer, resolution: number, rayResolution = resolution) {
    this.radiance.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (resolution !== this.resolution) {
      this.resolution = resolution;
      this.radiance.setSize(resolution, resolution);
      this.rayMaterial.uniforms.uResolution.value.set(resolution, resolution);
    }
    const target = renderer.getRenderTarget(),
      autoClear = renderer.autoClear;
    const clearAlpha = renderer.getClearAlpha(),
      scissorTest = renderer.getScissorTest();
    renderer.getClearColor(this.clearColor);
    renderer.getViewport(this.viewport);
    renderer.getScissor(this.scissor);
    try {
      renderer.autoClear = true;
      renderer.setScissorTest(false);
      renderer.setClearColor(0x000000, 0);
      const azimuth = this.rayMaterial.uniforms.uAzimuth.value;
      const elevation = this.rayMaterial.uniforms.uElevation.value;
      if (
        this.traced.azimuth !== azimuth ||
        this.traced.elevation !== elevation ||
        this.traced.resolution !== rayResolution
      ) {
        if (this.traced.resolution !== rayResolution) this.paths.setSize(rayResolution, rayResolution);
        this.quad.material = this.rayMaterial;
        renderer.setRenderTarget(this.paths);
        renderer.render(this.scene, this.camera);
        Object.assign(this.traced, { azimuth, elevation, resolution: rayResolution });
        this.stats.traces++;
      }
      this.quad.material = this.gasMaterial;
      renderer.setRenderTarget(this.radiance);
      renderer.render(this.scene, this.camera);
      this.stats.shades++;
      this.quad.material = this.blur;
      let source = this.radiance.texture;
      this.bloom.forEach((level, index) => {
        this.blur.uniforms.uSource.value = source;
        this.blur.uniforms.uThreshold.value = index === 0 ? 1 : 0;
        this.blur.uniforms.uDirection.value.set(1 / level.ping.width, 0);
        renderer.setRenderTarget(level.ping);
        renderer.render(this.scene, this.camera);
        this.blur.uniforms.uSource.value = level.ping.texture;
        this.blur.uniforms.uThreshold.value = 0;
        this.blur.uniforms.uDirection.value.set(0, 1 / level.output.height);
        renderer.setRenderTarget(level.output);
        renderer.render(this.scene, this.camera);
        source = level.output.texture;
      });
    } finally {
      renderer.setRenderTarget(target);
      renderer.setClearColor(this.clearColor, clearAlpha);
      renderer.setViewport(this.viewport);
      renderer.setScissor(this.scissor);
      renderer.setScissorTest(scissorTest);
      renderer.autoClear = autoClear;
    }
  }

  dispose() {
    this.users = Math.max(0, this.users - 1);
    if (this.users) return;
    const version = ++this.disposalVersion;
    const release = () => {
      if (!this.users && version === this.disposalVersion) this.release();
    };
    void Promise.resolve(this.preparation).then(release, release);
  }

  private release() {
    this.noise.dispose();
    this.radiance.dispose();
    this.paths.dispose();
    this.bloom.forEach(level => {
      level.ping.dispose();
      level.output.dispose();
    });
    this.rayMaterial.dispose();
    this.gasMaterial.dispose();
    this.blur.dispose();
    this.geometry.dispose();
  }
}
