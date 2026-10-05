import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type PermissionOrientation = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
export function deviceQuaternion(alpha: number, beta: number, gamma: number, screenAngle: number) {
  const radians = Math.PI / 180;
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(beta * radians, alpha * radians, -gamma * radians, 'YXZ'))
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2))
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenAngle * radians));
}
export function orientationSample(alpha: number | null, beta: number | null, gamma: number | null, screenAngle: number) {
  if (alpha === null || beta === null || gamma === null || ![alpha,beta,gamma,screenAngle].every(Number.isFinite)) return null;
  return deviceQuaternion(alpha,beta,gamma,screenAngle);
}
export function useDeviceLook(reduced: boolean) {
  const [enabled, setEnabled] = useState(false), [notice, setNotice] = useState('');
  const offset = useRef({ yaw: 0, pitch: 0 }), neutral = useRef<THREE.Quaternion | null>(null);
  const current = useRef<THREE.Quaternion | null>(null), received = useRef(false), generation = useRef(0);
  const recenter = useCallback(() => { neutral.current = current.current?.clone() ?? null; offset.current = { yaw: 0, pitch: 0 }; }, []);
  const toggle = async () => {
    if (enabled) { generation.current++; setEnabled(false); recenter(); return; }
    if (reduced) { setNotice('Tilt is disabled by your reduced motion preference. Drag to explore.'); return; }
    const request = ++generation.current;
    if (!window.isSecureContext || typeof DeviceOrientationEvent === 'undefined') { setNotice('Tilt is unavailable here. Drag to explore.'); return; }
    try {
      const api = DeviceOrientationEvent as PermissionOrientation;
      if (api.requestPermission && await api.requestPermission() !== 'granted') { setNotice('Tilt permission was not granted. Drag to explore.'); return; }
      if (generation.current !== request) return;
      received.current = false; neutral.current = null; setNotice('Move your phone gently.'); setEnabled(true);
    } catch { setNotice('Tilt is unavailable here. Drag to explore.'); }
  };
  useEffect(() => {
    if (!enabled || reduced) { offset.current = { yaw: 0, pitch: 0 }; return; }
    let previousAt = 0;
    const sample = (event: DeviceOrientationEvent) => {
      if (document.hidden) return;
      const angle = screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0;
      const q = orientationSample(event.alpha,event.beta,event.gamma,angle); if (!q) return;
      if (!neutral.current || performance.now() - previousAt > 500 || current.current && current.current.angleTo(q) > Math.PI / 6) neutral.current = q.clone();
      current.current = q; previousAt = performance.now(); received.current = true;
      const relative = neutral.current.clone().invert().multiply(q);
      const euler = new THREE.Euler().setFromQuaternion(relative, 'YXZ');
      const deadZone = (value: number) => Math.abs(value) < .5 * Math.PI / 180 ? 0 : value;
      offset.current = { yaw: THREE.MathUtils.clamp(deadZone(euler.y) * .55, -.20944, .20944), pitch: THREE.MathUtils.clamp(deadZone(euler.x) * .55, -.13963, .13963) };
    };
    const rotate = () => { neutral.current = null; offset.current = { yaw: 0, pitch: 0 }; };
    const timeout = window.setTimeout(() => { if (!received.current) { setEnabled(false); setNotice('No tilt data received. Drag to explore.'); } else setNotice('Tilt enabled. Drag to change your base view.'); }, 1500);
    window.addEventListener('deviceorientation', sample); window.addEventListener('orientationchange', rotate); screen.orientation?.addEventListener('change', rotate);
    return () => { generation.current++; clearTimeout(timeout); window.removeEventListener('deviceorientation', sample); window.removeEventListener('orientationchange', rotate); screen.orientation?.removeEventListener('change', rotate); };
  }, [enabled, reduced]);
  return { enabled: enabled && !reduced, toggle, recenter, notice, offset };
}
