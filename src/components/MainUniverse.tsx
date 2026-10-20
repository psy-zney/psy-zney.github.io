import { Component, useEffect, useMemo, useRef, useState, Suspense, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

type SkyResource = { geometry: THREE.BufferGeometry; map: THREE.Texture };
let loaded: Promise<SkyResource> | null = null;
function loadMainUniverse() {
  if (!loaded) loaded = new GLTFLoader().loadAsync('./model/universe-only.glb').then(gltf => {
    const mesh = gltf.scene.getObjectByName('MainUniverseSky') as THREE.Mesh | undefined;
    if (!mesh?.isMesh) throw new Error('Universe sky mesh is missing');
    const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    const map = material.emissiveMap ?? material.map;
    if (!map) throw new Error('Universe sky map is missing');
    mesh.updateWorldMatrix(true,false);
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    geometry.computeBoundingSphere();
    const sphere = geometry.boundingSphere!;
    geometry.translate(-sphere.center.x,-sphere.center.y,-sphere.center.z);
    geometry.scale(1 / sphere.radius,1 / sphere.radius,1 / sphere.radius);
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter;
    return { geometry, map };
  }).catch(error => { loaded = null; throw error; });
  return loaded;
}

/** Same owner-authored sky in every scene, always viewed from its centre. */
export function MainUniverseSky({ opacity = 1, animated = true, brightness, rotation = [0,0,0] }: { opacity?: number; animated?: boolean; brightness?: () => number; rotation?: [number,number,number] }) {
  const [resource,setResource] = useState<SkyResource | null>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const { invalidate, gl } = useThree();
  const material = useMemo(() => new THREE.MeshBasicMaterial({side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false,color:new THREE.Color().setScalar(1.65)}),[]);
  const foreground = useMemo(() => {
    const geometry=new THREE.BufferGeometry(),positions=[],sizes=[];
    const random=(n:number)=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};
    for(let i=0;i<1200;i++) {
      const y=random(i*3)*2-1,a=random(i*3+1)*Math.PI*2,r=Math.sqrt(1-y*y)*.7;
      positions.push(Math.cos(a)*r,y*.7,Math.sin(a)*r);sizes.push(.75+Math.pow(random(i*3+2),4)*2.7);
    }
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('starSize',new THREE.Float32BufferAttribute(sizes,1));
    const stars=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,toneMapped:false,
      uniforms:{clock:{value:0},pixelRatio:{value:1},opacity:{value:1}},
      vertexShader:'attribute float starSize;uniform float pixelRatio;varying float phase;void main(){phase=position.x*137.+position.z*73.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=starSize*pixelRatio;}',
      fragmentShader:'uniform float clock;uniform float opacity;varying float phase;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float core=exp(-r*r*7.);float twinkle=.87+.13*sin(clock*.6+phase);gl_FragColor=vec4(mix(vec3(.72,.85,1.),vec3(1.,.91,.74),.5+.5*sin(phase)),core*twinkle*opacity);}',
    });
    return {geometry,material:stars};
  },[]);
  useEffect(()=>()=>{foreground.geometry.dispose();foreground.material.dispose();},[foreground]);
  useEffect(() => () => material.dispose(),[material]);
  useEffect(() => {
    material.map=resource?.map??null;material.needsUpdate=true;invalidate();
  },[material,resource,invalidate]);
  material.transparent=opacity<1;material.opacity=opacity;
  useEffect(() => {
    let active = true;
    void loadMainUniverse().then(result => { if(active){setResource(result);invalidate();} }).catch(() => {
      const page = gl.domElement.closest<HTMLElement>('.virgo-page'); if(page)page.dataset.universeSky='fallback';
      const intro = gl.domElement.closest<HTMLElement>('.universe-intro');if(intro)intro.dataset.skyError='true';
    });
    return () => { active = false; };
  },[invalidate,gl]);
  useFrame(({camera},delta) => {
    if (!mesh.current) return;
    mesh.current.position.copy(camera.position);
    const exposure = brightness?.() ?? 1.65;
    material.color.setScalar(exposure);
    if(animated)foreground.material.uniforms.clock.value+=Math.min(delta,.05);
    foreground.material.uniforms.pixelRatio.value=gl.getPixelRatio();foreground.material.uniforms.opacity.value=opacity*Math.min(1,exposure/1.65);
    const page = gl.domElement.closest<HTMLElement>('.virgo-page');if(page)page.dataset.universeSky='main.glb';
  });
  return resource ? <mesh ref={mesh} geometry={resource.geometry} material={material} rotation={rotation} scale={1800} renderOrder={-1100} frustumCulled={false} dispose={null}>
    <points geometry={foreground.geometry} material={foreground.material} renderOrder={-1099} frustumCulled={false}/>
  </mesh> : null;
}

export type UniverseView = { yaw: number; pitch: number };
class UniverseSkyBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return{failed:true};}
  render(){return this.state.failed?<div className="main-universe-backdrop" aria-hidden="true"/>:this.props.children;}
}
function UniverseCamera({ view, reduced }: { view: MutableRefObject<UniverseView>; reduced: boolean }) {
  const { gl,invalidate }=useThree();
  useEffect(()=>{
    const page=gl.domElement.closest('.universe-intro');
    const update=()=>invalidate();page?.addEventListener('universe-view-change',update);
    return()=>page?.removeEventListener('universe-view-change',update);
  },[gl,invalidate]);
  useFrame(({camera}) => {
    camera.position.set(0,0,0);
    camera.rotation.set(view.current.pitch,view.current.yaw,0,'YXZ');
  });
  return <MainUniverseSky animated={!reduced}/>;
}
export function IntroUniverseBackdrop({ view, reduced, hidden }: { view: MutableRefObject<UniverseView>; reduced: boolean; hidden: boolean }) {
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  if(!mounted)return <div className="main-universe-backdrop" aria-hidden="true"/>;
  return <UniverseSkyBoundary><Canvas className="main-universe-backdrop" frameloop={hidden?'never':reduced?'demand':'always'} camera={{position:[0,0,0],fov:60,near:.1,far:2200}} dpr={[1,1.5]} gl={{antialias:false,alpha:false,powerPreference:'low-power'}}>
    <color attach="background" args={['#010205']}/><Suspense fallback={null}><UniverseCamera view={view} reduced={reduced}/></Suspense>
  </Canvas></UniverseSkyBoundary>;
}
