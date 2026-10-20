import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { smooth } from '../data/virgoFlight';
import { MainUniverseSky } from './MainUniverse';

type DepthFlight = { position: number; time: number; reduced: boolean; mobile: boolean };
const seeded = (n: number) => { const v = Math.sin(n * 127.1 + 91.7) * 43758.5453; return v - Math.floor(v); };

/** A distant sky and world-space motes: neither one moves the journey camera. */
export function VirgoDepth({ flight, glow }: { flight: DepthFlight; glow: THREE.Texture }) {
  const dust = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const count = flight.mobile ? 180 : 450;
    const positions = new Float32Array(count * 3), phases = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions.set([(seeded(i * 7) - .5) * 210, (seeded(i * 7 + 1) - .5) * 160, 430 - seeded(i * 7 + 2) * 2300], i * 3);
      phases.set([seeded(i * 7 + 3) * Math.PI * 2, .07 + seeded(i * 7 + 4) * .12, seeded(i * 7 + 5)], i * 3);
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    result.setAttribute('phase', new THREE.BufferAttribute(phases, 3));
    return result;
  }, [flight.mobile]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, appearance: { value: 0 }, glow: { value: glow } },
    vertexShader: `attribute vec3 phase; uniform float time; varying float warmth; varying float alpha;
      void main(){
        vec3 p=position;
        p.x+=sin(time*phase.y+phase.x)*3.5;
        p.y+=cos(time*phase.y*.61+phase.x)*2.0;
        p.z+=sin(time*phase.y*.37+phase.x)*5.0;
        vec4 view=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*view;
        gl_PointSize=clamp((.6+phase.z)*220./max(1.,-view.z),.45,4.);
        warmth=phase.z;
        alpha=smoothstep(4.,24.,-view.z)*(1.-smoothstep(220.,420.,-view.z));
      }`,
    fragmentShader: `uniform sampler2D glow; uniform float appearance; varying float warmth; varying float alpha;
      void main(){vec3 tint=mix(vec3(.43,.62,.85),vec3(1.,.77,.48),warmth);
        gl_FragColor=vec4(tint,texture2D(glow,gl_PointCoord).a*alpha*appearance*.55);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }), [glow]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    const appearance = smooth(.95, 1.92, flight.position);
    if (dust.current) dust.current.visible = appearance > .001;
    material.uniforms.time.value = flight.reduced ? 0 : flight.time;
    material.uniforms.appearance.value = appearance;
  });
  return <>
    <MainUniverseSky rotation={[2.43817,-.54534,1.30230]} animated={!flight.reduced} brightness={() => 1.65 - 1.10 * smooth(.95, 1.92, flight.position) * (1 - smooth(2.05, 2.65, flight.position))}/>
    <points ref={dust} geometry={geometry} material={material} frustumCulled={false} />
  </>;
}
