export const ACCRETION_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Kerr-Schild null geodesics, G=c=1, M=.5, a/M=.6 (the film's visual spin).
// Reference: James, von Tunzelmann, Franklin & Thorne, arXiv:1502.03808.
// The orbital gas is an advected procedural material, not a GRMHD simulation.
const BLACK_HOLE_COMMON = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uExit;
uniform float uElevation;
uniform float uAzimuth;
uniform vec2 uResolution;
uniform float uSampleResolution;
uniform sampler2D uNoise;
const float MASS = .5;
const float SPIN = .3;
const float HORIZON = .9;
const float DISK_INNER = 1.18;
const float DISK_OUTER = 10.5;
const float ROLL = .10;

float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  // RG stores adjacent Z slices of a periodic value-noise volume. Hardware
  // interpolates XY; interpolate Z here. Avoid expanding hundreds of hash
  // operations into the shader compiler for every octave/disk encounter.
  vec2 uv = i.xy + vec2(37.0, 17.0) * i.z + f.xy;
  vec2 slices = texture2D(uNoise, (uv + .5) / 256.0).rg;
  return mix(slices.r, slices.g, f.z);
}

float turbulence(vec3 p, float footprint) {
  float sum = 0.0, amplitude = .5, frequency = 1.0;
  for (int i = 0; i < 6; i++) {
    float antialias = 1.0 - smoothstep(.22, .68, frequency * footprint);
    sum += amplitude * mix(.5, noise(p), antialias);
    p = p * 2.03 + vec3(17.1, 8.7, 13.2);
    frequency *= 2.03;
    amplitude *= .5;
  }
  return sum;
}

vec3 thermalColor(float temperature) {
  vec3 copper = vec3(1.0, .105, .025);
  vec3 amber = vec3(1.0, .35, .105);
  vec3 cream = vec3(1.0, .70, .42);
  vec3 white = vec3(1.0, .94, .82);
  vec3 color = mix(copper, amber, smoothstep(.16, .46, temperature));
  color = mix(color, cream, smoothstep(.40, .83, temperature));
  return mix(color, white, smoothstep(.72, 1.16, temperature));
}
`;

const KERR_METRIC = /* glsl */ `
float kerrRadius(vec3 x) {
  float a2 = SPIN * SPIN;
  float s = dot(x, x) - a2;
  return sqrt(.5 * (s + sqrt(s * s + 4.0 * a2 * x.y * x.y)));
}

void metric(vec3 x, out float h, out vec3 k) {
  float r = kerrRadius(x), r2 = r * r;
  h = MASS * r * r2 / (r2 * r2 + SPIN * SPIN * x.y * x.y);
  k = vec3((r * x.x - SPIN * x.z) / (r2 + SPIN * SPIN), x.y / r, (r * x.z + SPIN * x.x) / (r2 + SPIN * SPIN));
}

void geodesic(vec3 x, vec3 p, out vec3 velocity, out vec3 force) {
  float a2 = SPIN * SPIN, s = dot(x, x) - a2;
  float discriminant = sqrt(s * s + 4.0 * a2 * x.y * x.y);
  float r = sqrt(.5 * (s + discriminant)), r2 = r * r;
  vec3 axis = vec3(0, 1, 0);
  vec3 dr = ((1.0 + s / discriminant) * x + 2.0 * a2 * x.y / discriminant * axis) / (2.0 * r);
  float denominator = r2 * r2 + a2 * x.y * x.y;
  float h = MASS * r * r2 / denominator;
  vec3 dh = h * (3.0 * dr / r - (4.0 * r * r2 * dr + 2.0 * a2 * x.y * axis) / denominator);
  float d = r2 + a2;
  vec3 k = vec3((r * x.x - SPIN * x.z) / d, x.y / r, (r * x.z + SPIN * x.x) / d);
  vec3 dkx = (x.x * dr + vec3(r, 0, -SPIN) - k.x * 2.0 * r * dr) / d;
  vec3 dky = axis / r - x.y * dr / r2;
  vec3 dkz = (x.z * dr + vec3(SPIN, 0, r) - k.z * 2.0 * r * dr) / d;
  // Use the time-reversed outgoing Kerr-Schild branch. Its inward rays
  // have bounded momenta at the capture boundary, avoiding a coordinate pole.
  float q = dot(k, p) + 1.0;
  velocity = p - 2.0 * h * k * q;
  force = dh * q * q + 2.0 * h * q * (p.x * dkx + p.y * dky + p.z * dkz);
}
`;

const DISK_MATERIAL = /* glsl */ `
float gasDensity(vec3 hit, float age, float seed, vec2 cone) {
  float r = length(hit.xz);
  // Prograde Kerr angular velocity; pre-wound spiral phase ensures outer
  // disk regions shear into smooth Keplerian streams rather than round blobs.
  float denominator = pow(r, 1.5) + SPIN * sqrt(MASS);
  float omega = sqrt(MASS) / denominator;
  float omegaDerivative = -1.5 * sqrt(MASS * r) / (denominator * denominator);
  float woundAge = age + 3.6;
  float logR = log(max(r, .1));
  float phase = atan(hit.z, hit.x) - woundAge * omega * 1.7 - logR * 2.4;
  vec2 orbit = vec2(cos(phase), sin(phase));
  float radialScale = pow(r, .45);
  float radialPixel = cone.x;
  float angularPixel = cone.y + radialPixel * r * abs(woundAge * 1.7 * omegaDerivative);
  vec3 seedOffset = vec3(seed * 17.3, seed * 8.1, seed * 13.7);
  vec3 flow = vec3(orbit * radialScale * 3.2, logR * 5.2) + seedOffset;
  float flowPixel = max(max(radialPixel, angularPixel) * radialScale * 3.2, radialPixel * 5.2);
  float eddy = turbulence(vec3(orbit * radialScale * .65, logR * 1.4) + seedOffset, max(max(radialPixel, angularPixel) * radialScale * .65, radialPixel * 1.4));
  flow.z += (eddy - .5) * 2.4;
  float body = turbulence(flow, flowPixel);
  float threads = turbulence(vec3(logR * 14.0 + eddy * 3.2, orbit * 12.0) + seedOffset, max(radialPixel * 14.0, angularPixel * 12.0));
  float finePixel = flowPixel * 4.5;
  float fine = mix(.5, noise(flow * vec3(3.2, 2.5, 2.5) + threads * 1.6), 1.0 - smoothstep(.22, .68, finePixel));
  float density = pow(smoothstep(.18, .76, body * .64 + threads * .36), 1.45);
  density *= .52 + 1.05 * threads;
  density *= .82 + .36 * fine;
  density *= .48 + 1.25 * pow(smoothstep(.18, .78, eddy), 1.35);
  float filaments = pow(smoothstep(.40, .74, threads), 2.2);
  return .045 + density * 2.65 + filaments * .15;
}

vec4 gasAt(vec4 encounter, float time, float footprint, float layerFilter) {
  vec3 hit = vec3(encounter.x, 0.0, encounter.y);
  float r = length(hit.xz);
  vec2 rawCone = vec2(fwidth(log(max(r, .1))), length(fwidth(encounter.xy / max(r, .1))));
  vec2 cone = min(rawCone, vec2(.18, .24));
  // Normalize filter footprint against a 640p reference so stationary high-res
  // frames preserve the silky volumetric plasma appearance without harsh grit.
  float resScale = max(1.0, uResolution.x / 640.0);
  cone *= resScale * layerFilter;
  cone = max(cone, vec2(footprint * layerFilter / max(r, .25) * .075));
  if (r <= DISK_INNER || r >= DISK_OUTER) return vec4(0.0);
  const float lifetime = 2.8;
  float cycle = floor(time / lifetime), age = time - cycle * lifetime;
  float previous = gasDensity(hit, age + lifetime, cycle - 1.0, cone);
  float current = gasDensity(hit, age, cycle, cone);
  float density = mix(previous, current, smoothstep(0.0, lifetime, age));
  float edge = smoothstep(DISK_INNER, 2.05, r) * (1.0 - smoothstep(6.8, DISK_OUTER, r));
  float heat = pow(2.75 / max(r, 1.35), .78);
  float orbitalSpeed = min(.65, sqrt(MASS / max(.75, r - .85)));
  float doppler = sqrt(1.0 - orbitalSpeed * orbitalSpeed) / (1.0 + orbitalSpeed * encounter.z);
  float shift = mix(1.0, clamp(doppler, .55, 1.6), .24);
  float intensity = 2.4 * pow(min(1.25, heat), 2.5) * density * shift * shift;
  vec3 color = thermalColor(heat * .82 * shift);
  // Slant optical depth prevents background lensed photon rings from ghosting
  // through the foreground accretion disk.
  float slant = 1.0 / max(.18, abs(encounter.w));
  float opticalDepth = edge * (.95 + .85 * density) * min(2.8, slant * .55);
  float opacity = clamp(1.0 - exp(-opticalDepth * 2.2), 0.0, .995);
  return vec4(color * intensity * edge, opacity);
}
`;

// Ray paths depend on the view, not the gas clock. Cache the first three disk
// encounters and their delays once; animate the gas without tracing 480 steps
// for every pixel on every frame.
export const GEODESIC_FRAGMENT = BLACK_HOLE_COMMON + KERR_METRIC + /* glsl */ `
layout(location = 0) out vec4 firstEncounter;
layout(location = 1) out vec4 secondEncounter;
layout(location = 2) out vec4 thirdEncounter;
layout(location = 3) out vec4 rayMeta;

void main() {
  firstEncounter = vec4(0.0);
  secondEncounter = vec4(0.0);
  thirdEncounter = vec4(0.0);
  rayMeta = vec4(0.0);
  vec2 pixel = vUv * 2.0 - 1.0;
  if (length(pixel) > .97) return;
  vec2 p = vec2(cos(ROLL) * pixel.x + sin(ROLL) * pixel.y, -sin(ROLL) * pixel.x + cos(ROLL) * pixel.y);
  float elevation = abs(uElevation) < .006 ? (uElevation < 0.0 ? -.006 : .006) : uElevation;
  vec3 eye = 120.0 * vec3(sin(uAzimuth) * cos(elevation), sin(elevation), cos(uAzimuth) * cos(elevation));
  vec3 forward = -normalize(eye), right = vec3(cos(uAzimuth), 0.0, -sin(uAzimuth));
  vec3 up = cross(right, forward);
  vec3 direction = normalize(forward + (p.x * right + p.y * up) * .117);

  float h;
  vec3 k;
  metric(eye, h, k);
  float kd = dot(k, direction), a = 1.0 - 2.0 * h * kd * kd, b = 2.0 * h * kd;
  vec3 momentum = direction * (b + sqrt(b * b + a * (1.0 + 2.0 * h))) / a;
  vec3 position = eye;
  float traveled = 0.0;
  int encounters = 0;

  for (int i = 0; i < 480; i++) {
    float r = kerrRadius(position);
    if (r < HORIZON + .025) { rayMeta.x = 1.0; break; }
    // Resolve near-critical rays more finely to keep the photon edge stable.
    float dt = min(6.0, mix(.022, .054, smoothstep(2.4, 8.0, r)) * r + .0038);
    vec3 velocity, force;
    geodesic(position, momentum, velocity, force);
    vec3 mid = position + velocity * dt * .5;
    vec3 midMomentum = momentum + force * dt * .5;
    vec3 midVelocity, midForce;
    geodesic(mid, midMomentum, midVelocity, midForce);
    vec3 next = position + midVelocity * dt;

    if (position.y * next.y < 0.0) {
      vec3 hit = mix(position, next, position.y / (position.y - next.y));
      float diskRadius = length(hit.xz);
      // Record equatorial crossings in strict order outside the horizon so
      // encounter textures never swap slots or create fwidth seams at disk edges.
      if (diskRadius > HORIZON && encounters < 3) {
        vec3 ray = normalize(midVelocity);
        vec3 tangent = normalize(vec3(-hit.z, 0.0, hit.x));
        vec4 encounter = vec4(hit.xz, dot(tangent, ray), ray.y);
        if (encounters == 0) {
          firstEncounter = encounter;
          rayMeta.y = traveled * .006;
        } else if (encounters == 1) {
          secondEncounter = encounter;
          rayMeta.z = traveled * .006;
        } else {
          thirdEncounter = encounter;
          rayMeta.w = traveled * .006;
        }
        encounters++;
      }
    }
    traveled += length(next - position);
    position = next;
    momentum += midForce * dt;
    if (r > 124.0 && dot(position, midVelocity) > 0.0) break;
  }
}
`;

export const ACCRETION_FRAGMENT = BLACK_HOLE_COMMON + DISK_MATERIAL + /* glsl */ `
uniform sampler2D uFirstEncounter;
uniform sampler2D uSecondEncounter;
uniform sampler2D uThirdEncounter;
uniform sampler2D uRayMeta;

void main() {
  vec2 pixel = vUv * 2.0 - 1.0;
  vec4 meta = texture2D(uRayMeta, vUv);
  vec2 texel = 1.0 / max(uResolution, vec2(1.0));
  float shadowMask = .4 * meta.x
    + .15 * texture2D(uRayMeta, vUv + vec2(texel.x, 0.0)).x
    + .15 * texture2D(uRayMeta, vUv - vec2(texel.x, 0.0)).x
    + .15 * texture2D(uRayMeta, vUv + vec2(0.0, texel.y)).x
    + .15 * texture2D(uRayMeta, vUv - vec2(0.0, texel.y)).x;
  float time = uTime + uExit * 3.0;
  float footprint = 28.08 / min(uResolution.x, min(uSampleResolution, 680.0));
  vec4 gas = gasAt(texture2D(uFirstEncounter, vUv), time - meta.y, footprint, 1.0);
  vec3 radiance = gas.rgb;
  float transmission = pow(1.0 - gas.a, 2.6);
  gas = gasAt(texture2D(uSecondEncounter, vUv), time - meta.z, footprint, 2.0);
  radiance += transmission * gas.rgb;
  transmission *= pow(1.0 - gas.a, 2.2);
  gas = gasAt(texture2D(uThirdEncounter, vUv), time - meta.w, footprint, 3.2);
  radiance += transmission * gas.rgb * .6;
  float emissionAlpha = smoothstep(.001, .018, max(radiance.r, max(radiance.g, radiance.b)));
  // The foreground disk can cross the shadow: only rays captured after their
  // emission encounters are dark. No screen-space circle paints over the gas.
  float edge = 1.0 - smoothstep(.87, .97, length(pixel));
  gl_FragColor = vec4(radiance * edge, max(shadowMask, emissionAlpha) * edge);
}
`;

export const BLOOM_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uDirection;
uniform float uThreshold;

void main() {
  vec3 color = texture2D(uSource, vUv).rgb * .227027;
  color += texture2D(uSource, vUv + uDirection * 1.384615).rgb * .316216;
  color += texture2D(uSource, vUv - uDirection * 1.384615).rgb * .316216;
  color += texture2D(uSource, vUv + uDirection * 3.230769).rgb * .070270;
  color += texture2D(uSource, vUv - uDirection * 3.230769).rgb * .070270;
  if (uThreshold > 0.0) color *= smoothstep(.75, 2.1, max(color.r, max(color.g, color.b)));
  gl_FragColor = vec4(color, 1.0);
}
`;

export const DISPLAY_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uRadiance;
uniform sampler2D uBloomNear;
uniform sampler2D uBloomMedium;
uniform sampler2D uBloomWide;
uniform float uPresence;

vec3 filmic(vec3 x) {
  return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0.0, 1.0);
}

void main() {
  vec4 source = texture2D(uRadiance, vUv);
  vec3 glow = texture2D(uBloomNear, vUv).rgb * .095
    + texture2D(uBloomMedium, vUv).rgb * .055
    + texture2D(uBloomWide, vUv).rgb * .022;
  float sourcePeak = max(source.r, max(source.g, source.b));
  float blackShadow = smoothstep(.75, .98, source.a) * (1.0 - smoothstep(.001, .035, sourcePeak));
  glow *= 1.0 - blackShadow * .992;
  vec3 hdr = source.rgb + glow;
  vec3 color = pow(filmic(hdr * .62), vec3(1.0 / 2.2));
  float light = max(glow.r, max(glow.g, glow.b));
  float alpha = max(source.a, smoothstep(.002, .04, light)) * uPresence;
  gl_FragColor = vec4(color, alpha);
}
`;
