import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShowcaseSpace } from './ShowcaseSpace';

/** The existing website stays an interactive DOM iframe on a CSS3D surface. */
export function ShowcaseLiveFrame({ url, title }: { url: string; title: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState<ShowcaseSpace | null>(null);
  useLayoutEffect(() => {
    if (!host.current) return;
    const element = host.current;
    // Keep native iframe hit-testing in its original local coordinate space.
    const next = new ShowcaseSpace(element, 1, false, null);
    next.elements[0].style.overflow = 'hidden';
    const resize = () => {
      next.resize(element.clientWidth, element.clientHeight / 2, element.clientHeight);
      next.render(0, true);
    };
    resize();
    setSpace(next);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => { observer.disconnect(); next.dispose(); };
  }, []);
  return <div className="screening-live-viewport" ref={host}>
    {space && createPortal(<iframe src={url} title={title} allow="fullscreen" />, space.elements[0])}
  </div>;
}
