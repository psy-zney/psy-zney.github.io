import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RenderCadence, renderPixelRatio, requestedPixelRatio, type RenderTier } from '../data/renderQuality';

/** Resolution can change without remounting the scene or resetting its camera. */
export function AdaptiveResolution({ tier, adaptive, active, supersample=false }: { tier: RenderTier; adaptive: boolean; active: boolean; supersample?:boolean }) {
  const { gl, size, setDpr, invalidate } = useThree();
  const cadence = useRef(new RenderCadence());
  const native = useRef(0);
  const update = () => {
    native.current = window.devicePixelRatio || 1;
    const context = gl.getContext();
    if (context.isContextLost()) return;
    const maximum = Math.min(gl.capabilities.maxTextureSize, context.getParameter(context.MAX_RENDERBUFFER_SIZE));
    const dpr = renderPixelRatio(size.width, size.height, requestedPixelRatio(native.current,supersample), tier, adaptive ? cadence.current.scale : 1, maximum);
    if (Math.abs(gl.getPixelRatio() - dpr) > .001) { setDpr(dpr); invalidate(); }
    gl.domElement.dataset.renderDpr = dpr.toFixed(3);
  };
  useEffect(() => {
    cadence.current = new RenderCadence();
    let media: MediaQueryList;
    const changed = () => {
      media?.removeEventListener('change', changed);
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      media.addEventListener('change', changed);
      if (!document.hidden) update();
    };
    changed();
    window.addEventListener('resize', changed);
    document.addEventListener('visibilitychange', changed);
    gl.domElement.addEventListener('webglcontextrestored', changed);
    // Some display/emulation changes update devicePixelRatio without a resize or
    // media event. A quiet fallback also covers demand-rendered/reduced scenes.
    const densityCheck = window.setInterval(() => {
      if (!document.hidden && native.current !== (window.devicePixelRatio || 1)) changed();
    }, 1000);
    return () => {
      window.clearInterval(densityCheck);
      media.removeEventListener('change', changed);
      window.removeEventListener('resize', changed);
      document.removeEventListener('visibilitychange', changed);
      gl.domElement.removeEventListener('webglcontextrestored', changed);
    };
  }, [gl, size.width, size.height, tier, adaptive, supersample, setDpr, invalidate]);
  useFrame(() => {
    const changed = cadence.current.sample(performance.now(), adaptive && active && !document.hidden);
    if (changed || native.current !== (window.devicePixelRatio || 1)) update();
  });
  return null;
}
