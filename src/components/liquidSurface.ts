/** Smooth, periodic flow fields shared by the canvas and WebGL tunnel materials. */
const fade = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export function liquidNoise(x: number, y: number, period = 16) {
  const ix = Math.floor(x), iy = Math.floor(y), u = fade(x - ix), v = fade(y - iy);
  const h = (a: number, b: number) => hash((a % period + period) % period, (b % period + period) % period);
  return (h(ix, iy) * (1 - u) + h(ix + 1, iy) * u) * (1 - v)
    + (h(ix, iy + 1) * (1 - u) + h(ix + 1, iy + 1) * u) * v;
}
export function liquidTextureData(size = 128) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, u = x / size, v = y / size;
    data[i] = liquidNoise(u * 4, v * 4, 4) * 255;
    data[i + 1] = liquidNoise(u * 8 + 3, v * 8 + 7, 8) * 255;
    data[i + 2] = liquidNoise(u * 16 + 5, v * 16 + 2) * 255;
    data[i + 3] = 255;
  }
  return data;
}

// Broad moving folds, narrow wet highlights, and an indigo/violet nebula palette.
// No UV lattice or high-frequency wire pattern. The cached field supplies detail.
export const liquidSurfaceGLSL = `
  uniform sampler2D noiseField;
  vec3 liquidSurface(vec2 p,float t,out float gleam){
    float a=p.x*6.2831853;
    vec2 drift=vec2(cos(a),sin(a))*.32+vec2(p.y*.13-t*.018,p.y*.19+t*.024);
    vec2 bend=texture2D(noiseField,drift*.22).rg-.5;
    vec2 q=drift+bend*.58;
    q+=vec2(sin(q.y*5.+t*.16),sin(q.x*6.-t*.12))*.105;
    vec3 n=texture2D(noiseField,q*.65).rgb;
    vec3 detail=texture2D(noiseField,q*2.3+vec2(t*.006,-t*.004)).rgb;
    float phase=a*3.+p.y*5.+n.r*7.+n.g*2.+(detail.r-.5)*1.8;
    float fold=.5+.5*sin(phase);
    float caustic=exp(-abs(sin(phase+n.g*.9))*mix(5.,13.,n.b));
    float small=exp(-abs(sin(phase*2.+n.b*3.))*22.)*.24;
    float water=exp(-abs(detail.r*.6+detail.g*.4-.53)*36.);
    gleam=(caustic*.65+small+water*.36)*(.25+n.r*.75);
    float heat=smoothstep(.58,.89,.5+.5*sin(a*2.-p.y*2.+bend.y*5.));
    vec3 body=mix(vec3(.018,.022,.055),vec3(.085,.052,.12),heat);
    vec3 shine=mix(vec3(.39,.48,.68),vec3(.66,.55,.77),heat);
    shine=mix(shine,vec3(.50,.65,.70),smoothstep(.64,.86,n.g)*(1.-heat)*.75);
    return body*(.14+n.r*.32+fold*.30+detail.b*.16)+shine*gleam*.95
      +vec3(.91,.87,.81)*pow(gleam,3.)*.48;
  }
`;

/** Canvas recovery palette for cached stamps; all coordinates remain continuous. */
export function liquidPigment(x: number, y: number) {
  const bx = liquidNoise(x * .4, y * .4) - .5, by = liquidNoise(x * .4 + 7, y * .4 + 3) - .5;
  const qx = x + bx * 1.7 + Math.sin(y * 1.4) * .28;
  const qy = y + by * 1.7 + Math.sin(x * 1.3) * .28;
  const n = liquidNoise(qx, qy), fine = liquidNoise(qx * 2.7, qy * 2.7);
  const phase = qx * 4.2 + qy * 1.6 + n * 5;
  const fold = .5 + .5 * Math.sin(phase);
  const gleam = Math.exp(-Math.abs(Math.sin(phase + fine * .8)) * (9 + fine * 14)) * (.3 + n * .7);
  const heat = fade(Math.max(0, Math.min(1, ((.5 + .5 * Math.sin(qx * .9 - qy * .6 + by * 3)) - .43) / .42)));
  const body = .22 + n * .36 + fold * .4;
  return { r: (9 + heat * 42) * body + (66 + heat * 125) * gleam,
    g: (6 + heat * 6) * body + (110 - heat * 23) * gleam,
    b: (49 + heat * 28) * body + 255 * gleam, light: .3 + n * .4 + gleam * .3 };
}
