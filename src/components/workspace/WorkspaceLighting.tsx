import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PMREMGenerator } from 'three';

/** Local reflection lighting; no external HDR request or additional scene render per frame. */
export function WorkspaceLighting() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const room = new RoomEnvironment(), generator = new PMREMGenerator(gl);
    const map = generator.fromScene(room, .04, .1, 100, { size: 128 });
    const previous = scene.environment, intensity = scene.environmentIntensity;
    scene.environment = map.texture; scene.environmentIntensity = .4;
    room.dispose(); generator.dispose(); invalidate();
    return () => { scene.environment = previous; scene.environmentIntensity = intensity; map.dispose(); };
  }, [gl, scene, invalidate]);
  return null;
}
