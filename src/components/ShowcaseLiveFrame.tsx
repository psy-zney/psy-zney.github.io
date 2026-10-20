import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShowcaseSpace } from './ShowcaseSpace';

/** A native iframe shares the flat CSS3D viewing plane without inheriting its transforms. */
export function ShowcaseLiveFrame({ url, title, loadingLabel = 'Loading live preview...' }: { url: string; title: string; loadingLabel?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState<ShowcaseSpace | null>(null);
  const [ready, setReady] = useState(false);
  const paint = useRef(0);
  const loaded = () => {
    // Let the embedded document's compositor surface join the top-layer
    // dialog before exposing its first pointer/keyboard interaction.
    cancelAnimationFrame(paint.current);
    paint.current = requestAnimationFrame(() => {
      paint.current = requestAnimationFrame(() => { paint.current = 0; setReady(true); });
    });
  };
  useLayoutEffect(() => {
    if (!host.current) return;
    const element = host.current;
    // Keep native iframe hit-testing in its original local coordinate space.
    const next = new ShowcaseSpace(element, 1, false, null);
    next.elements[0].style.overflow = 'hidden';
    const resize = () => {
      next.resize(element.clientWidth, element.clientHeight / 2, element.clientHeight);
      next.render(0, true);
      next.elements[0].style.pointerEvents = 'none';
    };
    resize();
    setSpace(next);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => { cancelAnimationFrame(paint.current); observer.disconnect(); next.dispose(); };
  }, []);
  return <div className="screening-live-viewport" ref={host} aria-busy={!ready}>
    {space && <>
      {createPortal(<div className="screening-live-plane" aria-hidden="true"/>, space.elements[0])}
      <div className="screening-live-native" data-ready={ready}><iframe src={url} title={title} allow="fullscreen" onLoad={loaded} tabIndex={ready ? 0 : -1} /></div>
    </>}
    {!ready && <div className="screening-live-loading" role="status">{loadingLabel}</div>}
  </div>;
}
