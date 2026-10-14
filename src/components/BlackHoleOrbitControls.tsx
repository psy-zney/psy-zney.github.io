import { useEffect, useRef, type PointerEvent, type RefObject } from "react";

export interface BlackHoleOrbitState {
  azimuth: number;
  elevation: number;
  invalidate: (() => void) | null;
}

export const createBlackHoleOrbit = (): BlackHoleOrbitState => ({ azimuth: 0, elevation: .13, invalidate: null });

export function BlackHoleOrbitControls({ controlRef, orbit, enabled, label, resetOnDisable = true }: {
  controlRef: RefObject<HTMLDivElement>;
  orbit: RefObject<BlackHoleOrbitState>;
  enabled: boolean;
  label: string;
  resetOnDisable?: boolean;
}) {
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const update = (azimuth: number, elevation: number) => {
    if (!orbit.current) return;
    orbit.current.azimuth = azimuth;
    orbit.current.elevation = Math.max(-.55, Math.min(.55, elevation));
    if (controlRef.current) {
      controlRef.current.dataset.azimuth = String(orbit.current.azimuth);
      controlRef.current.dataset.elevation = String(orbit.current.elevation);
    }
    orbit.current.invalidate?.();
  };
  const finish = () => {
    const control = controlRef.current;
    const pointer = drag.current;
    drag.current = null;
    if (control) {
      delete control.dataset.dragging;
      if (pointer && control.hasPointerCapture(pointer.id)) control.releasePointerCapture(pointer.id);
    }
  };
  const reset = () => { finish(); update(0, .13); };
  useEffect(() => {
    if (!enabled) { finish(); if (resetOnDisable) reset(); }
    return finish;
  }, [enabled, resetOnDisable]);

  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.button !== 0 || !event.isPrimary || event.pointerType === "touch") return;
    event.preventDefault();
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.dataset.dragging = "true";
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const pointer = drag.current, view = orbit.current;
    if (!pointer || !view || pointer.id !== event.pointerId) return;
    const sensitivity = Math.PI * 2 / Math.max(480, window.innerWidth);
    update(view.azimuth - (event.clientX - pointer.x) * sensitivity,
      view.elevation + (event.clientY - pointer.y) * .004);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };
  return <div ref={controlRef} className="virgo-black-hole-orbit" role="group" aria-label={label}
    aria-hidden={!enabled} tabIndex={enabled ? 0 : -1} data-azimuth="0" data-elevation="0.13"
    onPointerDown={down} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}
    onLostPointerCapture={finish} onBlur={finish} onDoubleClick={reset}
    onKeyDown={event => {
      const view = orbit.current;
      if (!view || !enabled) return;
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-.18, 0], ArrowRight: [.18, 0], ArrowUp: [0, .07], ArrowDown: [0, -.07] };
      if (event.key === "Home") { event.preventDefault(); event.stopPropagation(); reset(); }
      else if (arrows[event.key]) {
        event.preventDefault(); event.stopPropagation();
        const [yaw, pitch] = arrows[event.key];
        update(view.azimuth + yaw, view.elevation + pitch);
      }
    }} />;
}
