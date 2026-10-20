import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { smooth } from '../data/virgoFlight';
import { ACCRETION_VERTEX } from './blackHoleShader';

function backgroundTexture(width: number, height: number) {
  const texture = new THREE.FramebufferTexture(width, height);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  return texture;
}

/** Refract the already-rendered background; the disk and its shadow draw afterwards. */
export function BlackHoleLensing({ flight }: { flight: { position: number; exit: number } }) {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({
    uBackground: { value: backgroundTexture(1, 1) },
    uResolution: { value: new THREE.Vector2(1, 1) }, uPresence: { value: 0 },
  }), []);
  useEffect(() => () => uniforms.uBackground.value.dispose(), [uniforms]);
  useFrame(({ gl }) => {
    const amount = smooth(5.30, 5.45, flight.position) * (1 - flight.exit);
    uniforms.uPresence.value = amount;
    if (mesh.current) mesh.current.visible = amount > .001;
    const page = gl.domElement.closest<HTMLElement>('.virgo-page');
    if (page) page.dataset.blackHoleLensing = String(amount > .001);
  });
  return <mesh ref={mesh} position={[0, 0, -3.3]} renderOrder={1} userData={{ preserveOpacity: true }}
    onBeforeRender={renderer => {
      const size = renderer.getDrawingBufferSize(uniforms.uResolution.value);
      const previous = uniforms.uBackground.value;
      if (previous.image.width !== size.x || previous.image.height !== size.y) {
        previous.dispose(); uniforms.uBackground.value = backgroundTexture(size.x, size.y);
      }
      renderer.copyFramebufferToTexture(uniforms.uBackground.value);
      const page = renderer.domElement.closest<HTMLElement>('.virgo-page');
      if (page) page.dataset.blackHoleLensResolution = `${size.x},${size.y}`;
    }}>
    <planeGeometry args={[190, 190]}/>
    <shaderMaterial uniforms={uniforms} vertexShader={ACCRETION_VERTEX} transparent depthTest={false} depthWrite={false} toneMapped={false}
      fragmentShader={`precision highp float;varying vec2 vUv;uniform sampler2D uBackground;uniform vec2 uResolution;uniform float uPresence;
        void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
          float ring=exp(-pow((r-.5)/.32,2.))*(1.-smoothstep(.82,.99,r))*smoothstep(.13,.26,r);
          vec2 uv=gl_FragCoord.xy/uResolution;
          vec2 bend=normalize(p+vec2(.0001))*vec2(uResolution.y/uResolution.x,1.)*ring*.032*uPresence;
          vec2 q=clamp(uv-bend,vec2(.001),vec2(.999));
          vec3 glass=vec3(texture2D(uBackground,q+bend*.012).r,texture2D(uBackground,q).g,texture2D(uBackground,q-bend*.012).b);
          gl_FragColor=vec4(glass,smoothstep(.005,.07,ring)*uPresence);
        }`}/>
  </mesh>;
}
