import type { CSSProperties, HTMLAttributes } from 'react';

export interface GalaxyProps extends HTMLAttributes<HTMLDivElement> {
  density?: number;
  glowIntensity?: number;
  flareIntensity?: number;
  starSpeed?: number;
  mouseRepulsion?: boolean;
  clickWarp?: boolean;
  disableAnimation?: boolean;
  mouseInteraction?: boolean;
  transparent?: boolean;
  style?: CSSProperties;
}

export default function Galaxy(props: GalaxyProps): import('react').ReactElement;
