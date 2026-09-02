import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeHorseshoeCrab, makeHorseshoeCrabIcon } from './models/horseshoe-crab.js';
import { makeSyringe, makeSyringeIcon } from './models/syringe.js';
import { makeBloodJar } from './models/blood-jar.js';

/* ------------------------------------------------------------------ *
 *  Beach Walk — an endless, eerie shoreline at night.
 *
 *  You walk DOWN the beach along -Z toward the low moon. Ocean to your
 *  left (-X); the dry beach (+X) ends in an eroded SAND CLIFF you can't
 *  climb — and beyond it, the light-polluted glow and rooftops of a
 *  city just out of reach. Far down the shore a lighthouse turns;
 *  reaching it ends the game.
 * ------------------------------------------------------------------ */

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 3.4;
const RUN_SPEED = 4.7;                    // only a little faster than a walk
const RUN_SECONDS = 5;                    // how long you can sprint
const STAM_REGEN = 9;                     // seconds to recover a full bar
const JUMP_V = 4.3;
const P_GRAV = 15;
const MOON_DIR = new THREE.Vector3(-0.28, 0.12, -1).normalize();
const HALF_PI = Math.PI / 2 - 0.01;

const WADE_X = -2.4;
const CLIFF_X = 16;
const CLIFF_H = 3.2;
const CLIFF_PERIOD = 40;
const CLIFF_BLOCK_X = CLIFF_X - 1.8;
const REACH = 3.2;

const LH_X = 2;
const LH_Z = -1200;
const END_Z = LH_Z + 55;

// The tower you can walk into. Every figure here is measured off the scanned
// shell in assets/lighthouse.bwmesh so the built parts actually meet it:
// it stands 31.9 m, the base flares to r4.96 with the +Z face at r4.57, the
// shaft tapers r3.9 → r2.4, the clear bore runs r2.8 at the bottom down to
// r2.06 near the top, and above y≈26.5 the scan is just a thin mast — which
// we cut off and replace with a proper gallery and lantern room.
const LH_OUTER = 4.35;             // outer face of the wall, matching the model
const LH_INNER = 2.55;             // clear inside radius down at the floor
// the headland the tower stands on: how far back it runs, how high the
// crest is, and how wide the spine is before it drops to the sea
const HL_RUN = 74;
const HL_CREST = 7.2;
const HL_HALF = 13;
const LH_TOP = 26.2;               // gallery deck = lantern-room floor
const LH_CUT_Y = 26.45;            // scan is discarded above this
const LH_RISE = 4.4;               // metres gained per full turn of the stair
const LH_STAIR_R = 1.42;           // radius of the tread centres
const LH_PER_TURN = 20;            // treads per full turn
const LH_STEP = LH_RISE / LH_PER_TURN;   // one riser, 0.22 m
const LH_TREAD_T = 0.13;           // tread thickness
// Where the stair meets the gallery, in the game's angle convention. The
// treads are laid out so height and angle are locked together, so this is
// derived rather than eyeballed — the hatch in the deck has to be here, and
// the last attempt at a hatch drifted because it was placed by hand.
const LH_ARRIVE = ((-(LH_TOP / LH_RISE) * Math.PI * 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
const LH_DOOR_W = 0.72;            // half-width of the doorway
const LH_DOOR_H = 2.15;
// the bore narrows as it climbs — keeps the stair and the player off the wall
function lhBoreAt(y) {
  if (y < 5) return 2.55;
  if (y < 17) return THREE.MathUtils.lerp(2.55, 2.45, (y - 5) / 12);
  return THREE.MathUtils.lerp(2.45, 1.90, THREE.MathUtils.clamp((y - 17) / 9, 0, 1));
}

// Outer face of the wall: a splayed base course, then a slightly concave
// taper up to the gallery. Paired with the bore above it, the masonry is
// 1.9 m thick at the foot and 0.55 m under the lantern, which is what makes
// the doorway read as a tunnel through stone rather than a hole in a shell.
function lhOuterAt(y) {
  if (y < 1.1) return 4.62 - 0.27 * (y / 1.1);
  const t = THREE.MathUtils.clamp((y - 1.1) / (LH_TOP - 1.1), 0, 1);
  return THREE.MathUtils.lerp(4.35, 2.45, Math.pow(t, 0.82));
}

const DIG_DUR = 0.8;

// ------------------------------------------------------------------
// Settings
// ------------------------------------------------------------------
const DEFAULT_SETTINGS = { fov: 107, sensitivity: 1, brightness: 1.16, volume: 0.5, musicVolume: 0.32, waveVolume: 0.46, sfxVolume: 0.6, walkSpeed: 1.4, invertY: false };
let settings = { ...DEFAULT_SETTINGS };
try { settings = { ...settings, ...JSON.parse(localStorage.getItem('beachwalk.settings') || '{}') }; } catch (e) {}
function saveSettings() { try { localStorage.setItem('beachwalk.settings', JSON.stringify(settings)); } catch (e) {} }

let audioStarted = false, audioCtx = null, masterGain = null;
let musicEl = null, musicEnvGain = null, musicVolGain = null, musicStarted = false;
let waveBusGain = null;   // sub-mix for surf ambience + water-step splashes
let sfxBusGain = null;    // sub-mix for every one-shot effect
// every sfx routes here instead of straight at the speakers
const sfxOut = () => sfxBusGain || (audioCtx && audioCtx.destination);
let lhEl = null, lhGain = null, lhStarted = false;
const LH_TRACK_LEVEL = 0.55;   // the lighthouse track sits under everything else

// ------------------------------------------------------------------
// Renderer / scene / camera
// ------------------------------------------------------------------
// Low-poly / PS1 horror look: render at a fraction of the screen resolution
// and let CSS blow it up with nearest-neighbour, so everything gets chunky
// pixels and crawling edges instead of a clean modern image.
const RETRO_SCALE = 0.42;
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(RETRO_SCALE);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x05070f);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// Give every canvas texture the era-correct filtering: no smoothing, no
// anisotropy, mip-jump instead of a smooth blend.
function retroTex(t, { repeatWrap = true } = {}) {
  if (repeatWrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapNearestFilter;
  t.generateMipmaps = true;
  t.anisotropy = 1;
  t.needsUpdate = true;
  return t;
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b1626, 0.014);   // thinned so the swell reads further out to sea

const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(8, EYE_HEIGHT, 0);

// ------------------------------------------------------------------
// Lighting
// ------------------------------------------------------------------
const moonLight = new THREE.DirectionalLight(0x9fb6dc, 0.62);
moonLight.position.copy(MOON_DIR).multiplyScalar(200);
scene.add(moonLight);
const rakeLight = new THREE.DirectionalLight(0x546888, 0.3);
rakeLight.position.set(-70, 8, 40);
scene.add(rakeLight);
const cliffFill = new THREE.DirectionalLight(0x3d4f6e, 0.22);
cliffFill.position.set(-40, 6, -10);
scene.add(cliffFill);
scene.add(new THREE.AmbientLight(0x1d2740, 0.95));
scene.add(new THREE.HemisphereLight(0x3a4e6b, 0x0c1119, 0.7));

// ------------------------------------------------------------------
// Sky dome — gradient, moon, and a strong city light-pollution glow
// ------------------------------------------------------------------
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(3400, 48, 32),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(0x04060d) }, uHorizon: { value: new THREE.Color(0x1a2a45) }, uMoonDir: { value: MOON_DIR } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uMoonDir;
      void main() {
        float h = clamp(vDir.y * 1.6 + 0.15, 0.0, 1.0);
        vec3 col = mix(uHorizon, uTop, h);
        float d = clamp(dot(normalize(vDir), normalize(uMoonDir)), 0.0, 1.0);
        col += vec3(0.34, 0.42, 0.62) * pow(d, 6.0) * 0.38;
        col += vec3(0.95, 0.97, 1.0) * smoothstep(0.9991, 0.9997, d);
        // a faint sodium wash off the city, low on the +X horizon
        float cx = smoothstep(0.15, 0.9, vDir.x);
        float band = smoothstep(0.20, -0.03, vDir.y) * smoothstep(-0.10, 0.04, vDir.y);
        float dome = smoothstep(0.30, -0.04, vDir.y) * cx;
        col += vec3(0.50, 0.33, 0.18) * cx * band * 0.13;
        col += vec3(0.30, 0.20, 0.11) * dome * 0.06;
        col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
);
sky.frustumCulled = false;
scene.add(sky);

// ------------------------------------------------------------------
// Stars
// ------------------------------------------------------------------
{
  const count = 1600;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3().randomDirection();
    if (v.y < 0.02) v.y = 0.02 + Math.random() * 0.4;
    v.multiplyScalar(2400);
    positions.set([v.x, v.y, v.z], i * 3);
    sizes[i] = Math.random() < 0.08 ? 2.6 : 1.3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const stars = new THREE.Points(geo, new THREE.ShaderMaterial({
    fog: false, transparent: true, depthWrite: false,
    uniforms: { uPixelRatio: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float aSize; varying float vT; uniform float uPixelRatio;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = aSize*uPixelRatio;
      vT = fract(sin(dot(position.xy, vec2(12.9898,78.233)))*43758.5453); }`,
    fragmentShader: `varying float vT; void main(){ vec2 c = gl_PointCoord-0.5; float a = smoothstep(0.5,0.0,length(c));
      gl_FragColor = vec4(vec3(0.75,0.82,0.98), a*(0.5+0.5*vT)); }`,
  }));
  stars.frustumCulled = false;
  scene.add(stars);
}

// ------------------------------------------------------------------
// Shared GLSL
// ------------------------------------------------------------------
const noiseGLSL = `
  float bwHash(float n){ return fract(sin(n) * 43758.5453123); }
  float bwNoise(float x){ float i = floor(x); float f = fract(x); return mix(bwHash(i), bwHash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
`;
const shoreGLSL = `
  float shoreLine(float z, float t){
    float tide = sin(t * 0.045) * 3.0;
    float swash = 2.4 * sin(t * 0.6) + 1.2 * sin(t * 0.97 + 1.7);
    float wobble = (bwNoise(z * 0.12 + t * 0.05) - 0.5) * 4.0;
    return tide + swash + wobble;
  }
`;

// JS mirror of shoreLine() so gameplay code (footprints, digging, splashes)
// can tell dry sand from surf. Keep in lockstep with shoreGLSL above.
const bwFract = (x) => x - Math.floor(x);
const bwHashJS = (n) => bwFract(Math.sin(n) * 43758.5453123);
function bwNoiseJS(x) {
  const i = Math.floor(x), f = bwFract(x), u = f * f * (3 - 2 * f);
  return bwHashJS(i) * (1 - u) + bwHashJS(i + 1) * u;
}
function shoreLineJS(z, t) {
  const tide = Math.sin(t * 0.045) * 3.0;
  const swash = 2.4 * Math.sin(t * 0.6) + 1.2 * Math.sin(t * 0.97 + 1.7);
  const wobble = (bwNoiseJS(z * 0.12 + t * 0.05) - 0.5) * 4.0;
  return tide + swash + wobble;
}
// true when (x,z) is seaward of the waterline — i.e. standing in / over water
function inWater(x, z) {
  if (onHeadland(x, z)) return false;           // the ridge stands clear of it
  // The trodden lane up to the lighthouse door is dry ground, even at the
  // mouth where it meets the sand and a high swash can wash across x = LH_X.
  // Kept as a plain box here so it needs nothing that's declared further down.
  const pz = z - LH_Z;
  if (pz > -3 && pz < 34 && Math.abs(x - LH_X) < 4.6) return false;
  return x < shoreLineJS(z, oceanUniforms.uTime.value) + 0.25;
}

/* JS mirror of oceanWave() plus the mesh's own offset, so gameplay can ask
 * how high the water actually is at a point. Anything sitting on the sand
 * inside the waterline gets sunk to this, otherwise it stands on top of the
 * sea like a table. Keep in lockstep with waveGLSL. */
const OCEAN_Y = -0.34;
// GLSL semantics: works when e0 > e1, which THREE.MathUtils.smoothstep does not
const gsmooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
function waveHeightJS(x, z, t) {
  let w = 0;
  w += Math.sin(x * 0.045 + z * 0.028 - t * 0.55) * 0.70;
  w += Math.sin(x * 0.032 - z * 0.041 + t * 0.42) * 0.50;
  w += Math.sin(x * 0.20 + z * 0.13 + t * 1.10) * 0.48;
  w += Math.sin(x * 0.16 - z * 0.19 + t * 0.90) * 0.40;
  w += Math.sin(z * 0.24 - x * 0.11 + t * 1.30) * 0.34;
  w += Math.sin(x * 0.33 + z * 0.28 + t * 1.70) * 0.26;
  w += Math.sin(z * 0.44 + x * 0.20 - t * 2.10) * 0.19;
  w += Math.sin(x * 0.61 - z * 0.35 + t * 2.60) * 0.13;
  const build = gsmooth(-120.0, 4.0, x);
  w += Math.sin(x * 0.50 - t * 2.30) * 0.16 * build;
  w *= gsmooth(0.5, -22.0, x);
  const nearBand = gsmooth(-55.0, -2.0, x);
  w += Math.sin(x * 0.62 + z * 0.44 - t * 3.0) * 0.12 * nearBand;
  w += Math.sin(z * 0.78 - x * 0.36 + t * 2.5) * 0.09 * nearBand;
  return OCEAN_Y + w;
}
// Ring buffer of surface disturbances, fed to the ocean shader. Anything
// that moves through or lands in the water drops one.
let rippleIdx = 0;
function addRipple(x, z, strength = 1) {
  if (!inWater(x, z)) return;
  const r = oceanUniforms.uRipples.value[rippleIdx];
  r.set(x, z, oceanUniforms.uTime.value, strength);
  rippleIdx = (rippleIdx + 1) % oceanUniforms.uRipples.value.length;
}

// the surface right now
function waterSurfaceAt(x, z) { return waveHeightJS(x, z, oceanUniforms.uTime.value); }

/* How submerged a point is, 0 (dry sand) to 1 (fully under), ramped over the
 * first SUBMERGE_RUN metres past the waterline so things wade in rather than
 * popping. The sea surface sits below the sand plane, so anything resting at
 * y=0 in the water zone would otherwise stand proud of the sea like a table. */
const SUBMERGE_RUN = 1.6;
function submersionAt(x, z) {
  const into = shoreLineJS(z, oceanUniforms.uTime.value) - x;   // >0 is seaward
  return THREE.MathUtils.clamp(into / SUBMERGE_RUN, 0, 1);
}
// the y an object of this height should rest at, given where it stands
function restYInWater(x, z, sink) {
  const sub = submersionAt(x, z);
  if (sub <= 0) return 0;
  return (waterSurfaceAt(x, z) - sink) * sub;
}

// Ocean shader uniforms — declared up here because the sand shader and the
// gameplay water checks both reach for uTime before the Ocean section runs.
const oceanUniforms = THREE.UniformsUtils.merge([
  THREE.UniformsLib.fog,
  { uTime: { value: 0 }, uOffset: { value: new THREE.Vector2() }, uCamPos: { value: new THREE.Vector3() },
    uMoonDir: { value: MOON_DIR },
    uDeep: { value: new THREE.Color(0x123f66) },
    uShallow: { value: new THREE.Color(0x2f8ec2) },
    uCrest: { value: new THREE.Color(0xaad9ec) },
    uRipples: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, -999, 0)) },
    uSky: { value: new THREE.Color(0x1d3856) } },
]);

// ------------------------------------------------------------------
// Sand texture
// ------------------------------------------------------------------
function wrapDraw(g, size, fn) {
  for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { g.save(); g.translate(ox * size, oy * size); fn(); g.restore(); }
}
function makeSandTextures() {
  const S = 256;                       // deliberately low-res, PS1 texture budget
  const K = S / 1024;                  // scale the pattern down with it
  const albedo = document.createElement('canvas'); const bump = document.createElement('canvas');
  albedo.width = albedo.height = bump.width = bump.height = S;
  const a = albedo.getContext('2d'); const b = bump.getContext('2d');
  a.imageSmoothingEnabled = false; b.imageSmoothingEnabled = false;
  a.fillStyle = '#5a6478'; a.fillRect(0, 0, S, S);
  b.fillStyle = '#808080'; b.fillRect(0, 0, S, S);
  const rnd = (n) => Math.random() * n;
  for (let i = 0; i < 90; i++) {
    const x = rnd(S), y = rnd(S), r = (55 + rnd(280)) * K;
    const col = Math.random() < 0.55 ? '16,20,30' : '128,140,164';
    wrapDraw(a, S, () => {
      const grad = a.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${col},${0.06 + Math.random() * 0.22})`); grad.addColorStop(1, `rgba(${col},0)`);
      a.fillStyle = grad; a.beginPath(); a.arc(x, y, r, 0, Math.PI * 2); a.fill();
    });
  }
  // single-texel grit, drawn on the pixel grid so it stays crunchy
  for (let i = 0; i < 7000; i++) {
    const x = rnd(S) | 0, y = rnd(S) | 0, v = 45 + rnd(120);
    a.fillStyle = `rgba(${v | 0},${(v + 8) | 0},${(v + 20) | 0},0.6)`; a.fillRect(x, y, 1, 1);
    const bv = 128 + (Math.random() - 0.5) * 130; b.fillStyle = `rgb(${bv | 0},${bv | 0},${bv | 0})`; b.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 40; i++) {
    const y0 = rnd(S), amp = (8 + rnd(26)) * K;
    const draw = (ctx, stroke, w) => wrapDraw(ctx, S, () => {
      ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(-10, y0);
      for (let x = -10; x <= S + 10; x += 6) ctx.lineTo(x, y0 + Math.sin(x * 0.12 + i) * amp + (Math.random() - 0.5));
      ctx.stroke();
    });
    draw(a, `rgba(186,200,224,${0.08 + Math.random() * 0.12})`, 1);
    draw(a, 'rgba(6,8,14,0.18)', 1);
    draw(b, 'rgba(220,220,220,0.5)', 1);
    draw(b, 'rgba(30,30,30,0.5)', 1);
  }
  for (let i = 0; i < 70; i++) {
    const x = rnd(S), y = rnd(S), r = (1.5 + rnd(5)) * 0.6;
    const shell = Math.random() < 0.3;
    wrapDraw(a, S, () => {
      a.fillStyle = 'rgba(4,6,10,0.5)'; a.fillRect(x + r * 0.5, y + r * 0.5, r * 1.6, r * 1.3);
      a.fillStyle = shell ? `rgba(${190 + rnd(50)},${185 + rnd(50)},${180 + rnd(40)},0.9)` : `rgba(${70 + rnd(60)},${78 + rnd(60)},${92 + rnd(60)},0.95)`;
      a.fillRect(x, y, r * 1.6, r * 1.3);
    });
    wrapDraw(b, S, () => { b.fillStyle = 'rgba(235,235,235,0.9)'; b.fillRect(x, y, r * 1.6, r * 1.3); });
  }
  for (let i = 0; i < 14; i++) {
    const x = rnd(S), y = rnd(S);
    wrapDraw(a, S, () => {
      a.fillStyle = `rgba(10,14,10,${0.12 + Math.random() * 0.2})`; a.beginPath();
      for (let k = 0; k < 7; k++) { const ang = (k / 7) * Math.PI * 2, rr = (10 + rnd(38)) * K; a[k ? 'lineTo' : 'moveTo'](x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.5); }
      a.closePath(); a.fill();
    });
  }
  // quantise the albedo to a coarse palette — PS1-era colour depth
  const img = a.getImageData(0, 0, S, S);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    px[i] = (px[i] >> 4) << 4;
    px[i + 1] = (px[i + 1] >> 4) << 4;
    px[i + 2] = (px[i + 2] >> 4) << 4;
  }
  a.putImageData(img, 0, 0);

  const map = retroTex(new THREE.CanvasTexture(albedo));
  const bumpMap = retroTex(new THREE.CanvasTexture(bump));
  return { map, bumpMap };
}
const SAND_SIZE = 1600, SAND_TILE = 9;    // ~28 texels/m — period-correct density
const { map: sandTex, bumpMap: sandBump } = makeSandTextures();
{ const rep = SAND_SIZE / SAND_TILE; sandTex.repeat.set(rep, rep); sandBump.repeat.set(rep, rep); }

const sandGeo = new THREE.PlaneGeometry(SAND_SIZE, SAND_SIZE, 1, 1);
sandGeo.rotateX(-Math.PI / 2);
const sandMat = new THREE.MeshStandardMaterial({
  map: sandTex, bumpMap: sandBump, bumpScale: 1.4,
  color: 0x6d7d99, roughness: 0.95, metalness: 0.0, emissive: 0x27324a, emissiveMap: sandTex,
});
sandMat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = oceanUniforms.uTime;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;\nuniform float uTime;\nfloat wetMask;\n' + noiseGLSL + shoreGLSL)
    .replace('#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
       float bwShore = shoreLine(vWorldPos.z, uTime);
       if (vWorldPos.x < bwShore - 1.0) discard;`)
    .replace('#include <map_fragment>',
      `#include <map_fragment>
       float fromShore = vWorldPos.x - bwShore;
       wetMask = smoothstep(16.0, -1.0, fromShore);
       diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.78, 0.9), wetMask);
       vec2 fcell = floor(vWorldPos.xz * 20.0);
       float spk = fract(sin(dot(fcell, vec2(12.9898, 78.233))) * 43758.5453);
       diffuseColor.rgb += vec3(0.30, 0.36, 0.42) * step(0.992, spk) * wetMask * 0.5;
       float sheen = smoothstep(2.6, 0.0, abs(fromShore - 0.4));
       diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.60, 0.68, 0.85), sheen * 0.45);`)
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.30, max(wetMask, 0.0));')
    .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.22, max(wetMask, 0.0));');
};
const sand = new THREE.Mesh(sandGeo, sandMat);
scene.add(sand);

// ------------------------------------------------------------------
// Sand cliff
// ------------------------------------------------------------------
function makeCliff() {
  const CLIFF_LEN = 520;
  const g = new THREE.PlaneGeometry(CLIFF_LEN, 1, 260, 22);
  const pos = g.attributes.position;
  const k = (2 * Math.PI) / CLIFF_PERIOD;
  const ph = [0.0, 1.7, 3.9, 5.1, 2.3];
  const runnel = (z) => 0.50 * Math.sin(z * k + ph[0]) + 0.28 * Math.sin(z * k * 3 + ph[1]) + 0.16 * Math.sin(z * k * 5 + ph[2]) + 0.09 * Math.sin(z * k * 7 + ph[3]);
  const lump = (z) => 0.6 * Math.sin(z * k * 2 + ph[4]) + 0.3 * Math.sin(z * k + 1.1);
  const L = THREE.MathUtils.lerp, cl = THREE.MathUtils.clamp;
  for (let i = 0; i < pos.count; i++) {
    const zAlong = pos.getX(i);
    const u = pos.getY(i) + 0.5;
    let cx, cy;
    if (u < 0.22) { const t = u / 0.22; cx = L(CLIFF_X - 3.0, CLIFF_X - 0.25, t); cy = L(0.0, 0.55, t * t); }
    else if (u < 0.62) { const t = (u - 0.22) / 0.40; cx = L(CLIFF_X - 0.25, CLIFF_X - 0.55, t); cy = L(0.55, CLIFF_H, t); }
    else { const t = (u - 0.62) / 0.38; cx = L(CLIFF_X - 0.55, CLIFF_X + 30.0, t * t); cy = L(CLIFF_H, CLIFF_H + 0.9, t); }
    const faceMask = cl((u - 0.15) / 0.2, 0, 1) * cl((0.68 - u) / 0.15, 0, 1);
    const gr = runnel(zAlong);
    cx += (gr * 0.85 + Math.abs(gr) * 0.45) * faceMask;
    cx += lump(zAlong) * 0.45 * (u > 0.2 ? 1 : u / 0.2);
    cy += Math.sin(zAlong * k * 2 + 0.6) * 0.16 * faceMask;
    cy -= gr * 0.12 * faceMask;
    pos.setXYZ(i, cx, cy, zAlong);
  }
  g.computeVertexNormals();
  const tex = sandTex.clone(); tex.needsUpdate = true; tex.repeat.set(CLIFF_LEN / 7, 4);
  const bmp = sandBump.clone(); bmp.needsUpdate = true; bmp.repeat.set(CLIFF_LEN / 7, 4);
  const mat = new THREE.MeshStandardMaterial({
    map: tex, bumpMap: bmp, bumpScale: 2.2,
    color: 0x64697c, roughness: 1, metalness: 0, emissive: 0x2f3648, emissiveMap: tex, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  return mesh;
}
const cliff = makeCliff();
scene.add(cliff);

// ------------------------------------------------------------------
// The city beyond the cliff — layered silhouettes, rooftop clutter,
// window-grid lights, and a warm glow that lifts over the ridge.
// ------------------------------------------------------------------
const CITY_TILE = 160;
const city = new THREE.Group();
scene.add(city);
{
  const gridZ = 7, per = 11;
  const facadeMat = new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 1, metalness: 0, emissive: 0x10131f });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x090c14, roughness: 1, emissive: 0x0b0d16 });

  // count parts up front
  const towers = Array.from({ length: per }, () => {
    const tall = Math.random() < 0.3;
    const h = tall ? 26 + Math.random() * 22 : 8 + Math.random() * 14;
    return {
      // pushed well back so fog eats most of it — you should barely make it out
      x: 210 + Math.random() * 190,
      z: Math.random() * CITY_TILE - CITY_TILE / 2,
      w: 9 + Math.random() * 17, d: 9 + Math.random() * 17, h,
      setbacks: tall ? 1 + (Math.random() * 2 | 0) : (Math.random() < 0.4 ? 1 : 0),
      tank: Math.random() < 0.45, antenna: tall && Math.random() < 0.7,
    };
  });
  let nMain = 0, nSet = 0, nRoof = 0;
  for (const t of towers) { nMain++; nSet += t.setbacks; nRoof += (t.tank ? 1 : 0) + (t.antenna ? 1 : 0); }

  const mains = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), facadeMat, nMain * gridZ);
  const sets = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), facadeMat, Math.max(1, nSet * gridZ));
  const roofs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8), trimMat, Math.max(1, nRoof * gridZ));
  for (const im of [mains, sets, roofs]) im.frustumCulled = false;

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qx = new THREE.Quaternion();
  const lightPts = [];
  let iM = 0, iS = 0, iR = 0;
  for (let gz = -(gridZ >> 1); gz <= (gridZ >> 1); gz++) {
    for (const t of towers) {
      const z = t.z + gz * CITY_TILE;
      m.compose(new THREE.Vector3(t.x, t.h / 2, z), q, new THREE.Vector3(t.w, t.h, t.d));
      mains.setMatrixAt(iM++, m);
      // window grid on the sea-facing (-X) face — only a scattering are lit
      const cols = Math.max(2, Math.round(t.w / 3.4));
      const rows = Math.max(2, Math.round(t.h / 4.6));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.16) continue;
        lightPts.push(
          t.x - t.w / 2 - 0.15,
          2 + (r + 0.5) / rows * (t.h - 3),
          z - t.d / 2 + (c + 0.5) / cols * t.d
        );
      }
      // setbacks
      let sy = t.h, sw = t.w, sd = t.d;
      for (let s = 0; s < t.setbacks; s++) {
        sw *= 0.62 + Math.random() * 0.18; sd *= 0.62 + Math.random() * 0.18;
        const sh = t.h * (0.14 + Math.random() * 0.12);
        m.compose(new THREE.Vector3(t.x + (Math.random() - 0.5) * (t.w - sw) * 0.5, sy + sh / 2, z + (Math.random() - 0.5) * (t.d - sd) * 0.5), q, new THREE.Vector3(sw, sh, sd));
        sets.setMatrixAt(iS++, m);
        sy += sh;
        for (let w = 0; w < 3; w++) lightPts.push(t.x - sw / 2 - 0.1, sy - sh * Math.random(), z - sd / 2 + Math.random() * sd);
      }
      // rooftop water tank
      if (t.tank) {
        const tr = 0.8 + Math.random() * 0.8, th = 1.6 + Math.random() * 1.4;
        m.compose(new THREE.Vector3(t.x + (Math.random() - 0.5) * t.w * 0.4, sy + th / 2, z + (Math.random() - 0.5) * t.d * 0.4), q, new THREE.Vector3(tr, th, tr));
        roofs.setMatrixAt(iR++, m);
      }
      // antenna mast + a red aircraft light
      if (t.antenna) {
        const ah = 6 + Math.random() * 10;
        m.compose(new THREE.Vector3(t.x, sy + ah / 2, z), q, new THREE.Vector3(0.18, ah, 0.18));
        roofs.setMatrixAt(iR++, m);
        lightPts.push(t.x, sy + ah, z);   // tip light (recoloured below via a 2nd points cloud would be nicer; kept simple)
      }
    }
  }
  const hideM = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = iS; i < sets.count; i++) sets.setMatrixAt(i, hideM);
  for (let i = iR; i < roofs.count; i++) roofs.setMatrixAt(i, hideM);
  for (const im of [mains, sets, roofs]) im.instanceMatrix.needsUpdate = true;
  city.add(mains, sets, roofs);

  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lightPts, 3));
  const lights = new THREE.Points(lg, new THREE.PointsMaterial({
    color: 0xd9a066, size: 1.5, sizeAttenuation: true, transparent: true, opacity: 0.34, depthWrite: false, fog: false,
  }));
  lights.frustumCulled = false;
  city.add(lights);
  city.userData.lights = lights;

  // the glow itself — a broad warm haze behind the buildings that the
  // cliff ridge silhouettes against
  const gc = document.createElement('canvas');
  gc.width = 16; gc.height = 128;
  const gg = gc.getContext('2d');
  const grad = gg.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0.0, 'rgba(214,150,92,0.26)');
  grad.addColorStop(0.35, 'rgba(196,128,78,0.10)');
  grad.addColorStop(0.75, 'rgba(180,112,70,0.025)');
  grad.addColorStop(1.0, 'rgba(180,112,70,0)');
  gg.fillStyle = grad; gg.fillRect(0, 0, 16, 128);
  const glowTexCity = new THREE.CanvasTexture(gc);
  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 44),
    new THREE.MeshBasicMaterial({ map: glowTexCity, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide })
  );
  glowPlane.rotation.y = Math.PI / 2;      // face -X (toward the player)
  glowPlane.position.set(200, 12, 0);
  glowPlane.frustumCulled = false;
  glowPlane.renderOrder = -1;
  city.add(glowPlane);
}

// ------------------------------------------------------------------
// Lighthouse
// ------------------------------------------------------------------
function makeGlowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,244,224,0.7)');
  grad.addColorStop(0.6, 'rgba(255,236,205,0.18)');
  grad.addColorStop(1, 'rgba(255,236,205,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const glowTex = makeGlowTexture();

// ------------------------------------------------------------------
// Pickup shine — the beach is very dark and a chitin-brown crab lying in
// the wrack is easy to walk straight past. Each takeable thing gets a soft
// additive glint hovering over it and a gentle lift in its own emissive, so
// it separates from the sand without turning into a video-game waypoint.
// ------------------------------------------------------------------
const shinies = [];
function addItemShine(root, { size = 0.55, height = 0.12, strength = 1 } = {}) {
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xbcd6ff, transparent: true, opacity: 0.0,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
  }));
  glint.position.y = height;
  glint.scale.setScalar(size);
  glint.raycast = () => {};        // decoration only — never a hover target
  root.add(glint);

  // brighten the object's own surfaces a touch, and remember the base so the
  // pulse rides on top of whatever the model author chose
  const mats = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.material || o.name === 'hitProxy') return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (!m.emissive || mats.some((e) => e.m === m)) continue;
      mats.push({ m, base: m.emissive.clone() });
    }
  });
  shinies.push({ root, glint, mats, strength, phase: Math.random() * 6.28 });
}
function updateShines(t) {
  for (const s of shinies) {
    if (!s.root.parent) { s.glint.material.opacity = 0; continue; }
    // slow breath, never fully off — a wet-shell highlight catching the moon
    const k = 0.5 + 0.5 * Math.sin(t * 1.5 + s.phase);
    s.glint.material.opacity = (0.10 + 0.13 * k) * s.strength;
    for (const { m, base } of s.mats) {
      m.emissive.setRGB(
        base.r + (0.055 + 0.045 * k) * s.strength,
        base.g + (0.065 + 0.050 * k) * s.strength,
        base.b + (0.085 + 0.065 * k) * s.strength
      );
    }
  }
}


// ------------------------------------------------------------------
// Baked mesh blobs (see tools/objconv.py). Positions and indices, nothing
// else — normals are recomputed here because the whole game is flat shaded,
// which keeps the file about a sixth the size of the OBJ it came from.
// ------------------------------------------------------------------
function loadMesh(url) {
  return fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
    .then((buf) => {
      const magic = String.fromCharCode(...new Uint8Array(buf, 0, 8));
      if (magic !== 'BWMESH01') throw new Error('bad mesh header');
      const dv = new DataView(buf);
      const nV = dv.getUint32(8, true), nF = dv.getUint32(12, true);
      const qs = [dv.getFloat32(16, true), dv.getFloat32(20, true), dv.getFloat32(24, true)];
      const off = [dv.getFloat32(28, true), dv.getFloat32(32, true), dv.getFloat32(36, true)];
      let p = 40;
      const q = new Int16Array(buf, p, nV * 3); p += nV * 6;
      const pos = new Float32Array(nV * 3);
      for (let i = 0; i < nV; i++) for (let k = 0; k < 3; k++) {
        pos[i * 3 + k] = (q[i * 3 + k] + 32767) * qs[k] + off[k];
      }
      const wide = nV > 65535;
      const idx = wide ? new Uint32Array(buf.slice(p, p + nF * 12))
                       : new Uint16Array(buf.slice(p, p + nF * 6));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeVertexNormals();
      return geo;
    });
}
const lhParts = {};
const lighthouse = new THREE.Group();
lighthouse.position.set(LH_X, HL_CREST, LH_Z);
let lampCore, beamPivot, lanternGlass = null;
const lhWindows = [];          // {y, ang} — cut through the scan, framed below
{
  const DOOR_HALF = Math.atan2(LH_DOOR_W + 0.15, LH_OUTER);
  lighthouse.userData.doorHalf = DOOR_HALF;

  const stone = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 1, metalness: 0, emissive: 0x14171f, side: THREE.DoubleSide });
  const iron  = new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.55, metalness: 0.6, flatShading: true, emissive: 0x0b0d10 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x6b5a32, roughness: 0.45, metalness: 0.7, flatShading: true, emissive: 0x171204 });

  // ---- the shaft ---------------------------------------------------
  // Built here rather than imported. The scan this replaces was a coarse
  // closed post — no opening, no lantern room, and a taper that agreed with
  // nothing — so the door, the windows and the gallery all had to be guessed
  // against it and none of them quite landed. Generating it means every one
  // of those meets the wall exactly where it should, by construction.
  const stairAngleAt = (y) => (y / LH_RISE) * Math.PI * 2 + Math.PI / 2;
  for (const y of [5.4, 11.0, 16.6, 22.0]) {
    lhWindows.push({ y, ang: stairAngleAt(y) - 0.55, w: 0.42, h: 1.15 });
  }

  // Openings, in the angle convention updateTower() measures the player in
  // (from +Z). The door faces +Z, which is where the path arrives.
  const OPENINGS = [{ ang: 0, halfW: LH_DOOR_W + 0.16, y0: -0.6, y1: LH_DOOR_H, door: true }];
  for (const w of lhWindows) {
    OPENINGS.push({ ang: Math.PI / 2 - w.ang, halfW: w.w + 0.05, y0: w.y - w.h, y1: w.y + w.h });
  }

  // Holes are cut by dropping the triangles whose centroid falls inside one.
  const carve = (geo) => {
    const idx = geo.getIndex().array, pos = geo.attributes.position;
    const keep = [];
    for (let t = 0; t < idx.length; t += 3) {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 3; k++) {
        const v = idx[t + k];
        cx += pos.getX(v); cy += pos.getY(v); cz += pos.getZ(v);
      }
      cx /= 3; cy /= 3; cz /= 3;
      const a = Math.atan2(cx, cz), r = Math.hypot(cx, cz);
      let cut = false;
      for (const o of OPENINGS) {
        if (cy < o.y0 || cy > o.y1) continue;
        let da = a - o.ang;
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) * r < o.halfW) { cut = true; break; }
      }
      if (!cut) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    }
    geo.setIndex(keep);
  };

  // Damp and dark at the foot, salt-bleached higher up, with vertical
  // streaking — the same weathering the rest of the walk gets.
  const weather = (geo) => {
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      let t = 0.44 + 0.48 * Math.pow(THREE.MathUtils.clamp(y / LH_TOP, 0, 1), 0.65);
      t *= 0.86 + 0.14 * (0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 9));
      t *= 0.9 + 0.2 * ((((Math.sin(x * 7.3 + y * 5.1 + z * 6.7) * 43758.5453) % 1) + 1) % 1);
      t = THREE.MathUtils.clamp(t, 0.18, 1);
      col[i * 3] = t * 0.95; col[i * 3 + 1] = t * 0.98; col[i * 3 + 2] = t;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  };

  // Rings sit on every opening edge as well as up the taper, so the cuts
  // come out square instead of ragged.
  const ringYs = [];
  for (let y = 0; y <= LH_TOP; y += 0.55) ringYs.push(y);
  for (const o of OPENINGS) ringYs.push(Math.max(0, o.y0), o.y1, (o.y0 + o.y1) / 2);
  ringYs.push(LH_TOP);
  const ys = [...new Set(ringYs.filter((y) => y >= 0 && y <= LH_TOP))].sort((a, b) => a - b);

  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0x646b78, vertexColors: true, roughness: 1, metalness: 0,
    emissive: 0x14171d, flatShading: true, side: THREE.DoubleSide });
  const lathe = (radiusAt) => {
    const g = new THREE.LatheGeometry(ys.map((y) => new THREE.Vector2(radiusAt(y), y)), 30);
    carve(g); weather(g); g.computeVertexNormals();
    return g;
  };
  const shaftOut = new THREE.Mesh(lathe(lhOuterAt), shaftMat);
  const shaftIn = new THREE.Mesh(lathe(lhBoreAt), shaftMat);
  shaftOut.frustumCulled = shaftIn.frustumCulled = false;
  lighthouse.add(shaftOut, shaftIn);
  lhParts.outer = shaftOut; lhParts.inner = shaftIn;
  lighthouse.userData.shell = [];

  // String courses: three shallow bands round the taper. They cost almost
  // nothing and they're what stops the silhouette reading as a bare post.
  for (const by of [7.0, 14.0, 20.5]) {
    const r = lhOuterAt(by) + 0.09;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.05, r, 0.34, 30), stone);
    band.position.y = by;
    lighthouse.add(band);
  }

  // The doorway is a tunnel through nearly two metres of masonry, so it
  // needs its jambs and soffit lined or you see the cut edge from inside.
  {
    const ym = LH_DOOR_H / 2, rI = lhBoreAt(ym), th = lhOuterAt(ym) - rI;
    const g = new THREE.Group();
    for (const sgn of [-1, 1]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.08, LH_DOOR_H + 0.1, th), stone);
      jamb.position.set(sgn * (LH_DOOR_W + 0.16), ym, rI + th / 2);
      g.add(jamb);
    }
    const soffit = new THREE.Mesh(new THREE.BoxGeometry((LH_DOOR_W + 0.16) * 2 + 0.16, 0.08, th), stone);
    soffit.position.set(0, LH_DOOR_H, rI + th / 2);
    g.add(soffit);
    const thresh = new THREE.Mesh(new THREE.BoxGeometry((LH_DOOR_W + 0.16) * 2 + 0.16, 0.1, th), stone);
    thresh.position.set(0, 0.05, rI + th / 2);
    g.add(thresh);
    lighthouse.add(g);
  }

  // ---- ground floor ----------------------------------------------
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(LH_INNER + 0.2, LH_INNER + 0.2, 0.25, 24),
    new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 1, emissive: 0x0e1014 }));
  floor.position.y = 0.02;
  lighthouse.add(floor);

  // ---- the helical stair ------------------------------------------
  // Treads cantilever off a central newel, the way they do in a real
  // tower, and stop at a landing under the gallery hatch.
  const treadMat = new THREE.MeshStandardMaterial({ color: 0x3d4450, roughness: 1, flatShading: true, emissive: 0x191d23 });
  const stairs = new THREE.Group();
  {
    const stepGeo = new THREE.BoxGeometry(1.30, LH_TREAD_T, 0.58);
    // up to and including the deck, so there's no gap at the last step
    const nSteps = Math.round(LH_TOP / LH_STEP);
    for (let i = 1; i <= nSteps; i++) {
      const y = i * LH_STEP;
      const a = stairAngleAt(y);
      const st = new THREE.Mesh(stepGeo, treadMat);
      st.position.set(Math.cos(a) * LH_STAIR_R, y, Math.sin(a) * LH_STAIR_R);
      st.rotation.y = -a;
      stairs.add(st);
      // a rail post every few treads, with the handrail riding on top
      if (i % 4 === 0) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.95, 5), iron);
        post.position.set(Math.cos(a) * (LH_STAIR_R + 0.42), y + 0.48, Math.sin(a) * (LH_STAIR_R + 0.42));
        stairs.add(post);
      }
    }
    // the newel the treads spring from
    const newel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, LH_TOP, 12), stone);
    newel.position.y = LH_TOP / 2;
    stairs.add(newel);

    // handrail: a helix of short chords following the tread noses
    const railGeo = [];
    for (let y = 0.9; y < LH_TOP - 0.3; y += 0.35) railGeo.push(y);
    for (let i = 0; i < railGeo.length - 1; i++) {
      const y0 = railGeo[i], y1 = railGeo[i + 1];
      const a0 = stairAngleAt(y0 - 0.9), a1 = stairAngleAt(y1 - 0.9);
      const R = LH_STAIR_R + 0.42;
      const p0 = new THREE.Vector3(Math.cos(a0) * R, y0, Math.sin(a0) * R);
      const p1 = new THREE.Vector3(Math.cos(a1) * R, y1, Math.sin(a1) * R);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, p0.distanceTo(p1) * 1.06, 5), iron);
      seg.position.copy(p0).lerp(p1, 0.5);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
      stairs.add(seg);
    }

    // oil lamps up the shaft — nothing else lights the inside
    for (let y = 2.2; y < LH_TOP - 1.5; y += LH_RISE * 0.5) {
      const a = stairAngleAt(y) + Math.PI;            // on the wall opposite the treads
      const lr = lhBoreAt(y) - 0.35;
      const px = Math.cos(a) * lr, pz = Math.sin(a) * lr;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffcf94, fog: false }));
      bulb.position.set(px, y + 1.4, pz);
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.28), iron);
      bracket.position.set(px * 1.07, y + 1.4, pz * 1.07);
      bracket.lookAt(0, y + 1.4, 0);
      const lamp = new THREE.PointLight(0xffb070, 6.0, 6.5, 1.6);
      lamp.position.set(px * 0.84, y + 1.4, pz * 0.84);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffd39a, transparent: true, opacity: 0.32,
        depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      }));
      halo.position.copy(bulb.position);
      halo.scale.setScalar(1.4);
      stairs.add(bulb, bracket, lamp, halo);
    }
  }
  lighthouse.add(stairs);

  // ---- windows up the shaft ---------------------------------------
  // Each is a hole cut clean through the scan (see the loader), lined with
  // a reveal and glazed, set beside the stair so you pass them climbing.
  for (const w of lhWindows) {
    const g = new THREE.Group();
    g.position.set(Math.cos(w.ang) * 0.1, w.y, Math.sin(w.ang) * 0.1);
    g.rotation.y = Math.atan2(Math.cos(w.ang), Math.sin(w.ang));   // face outward
    // reveal: jambs, sill and head lining the cut, so the wall reads thick
    const rIn = lhBoreAt(w.y) - 0.05, depth = Math.max(0.4, lhOuterAt(w.y) - rIn);
    for (const s of [-1, 1]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.07, w.h * 2 + 0.12, depth), stone);
      jamb.position.set(s * (w.w + 0.03), 0, rIn + depth / 2);
      g.add(jamb);
    }
    for (const s of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w.w * 2 + 0.2, 0.07, depth), stone);
      cap.position.set(0, s * (w.h + 0.03), rIn + depth / 2);
      g.add(cap);
    }
    // glazing: one pane and a pair of bars
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w.w * 2, w.h * 2),
      new THREE.MeshStandardMaterial({
        color: 0x8fb4d8, roughness: 0.08, metalness: 0.1,
        transparent: true, opacity: 0.16, side: THREE.DoubleSide, emissive: 0x16202c,
      }));
    glass.position.set(0, 0, rIn + depth - 0.12);
    g.add(glass);
    for (const yy of [-w.h * 0.34, w.h * 0.34]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w.w * 2, 0.045, 0.05), iron);
      bar.position.set(0, yy, rIn + depth - 0.12);
      g.add(bar);
    }
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.045, w.h * 2, 0.05), iron);
    mull.position.set(0, 0, rIn + depth - 0.12);
    g.add(mull);
    lighthouse.add(g);
  }

  // ---- gallery deck + railing --------------------------------------
  // The masonry stops here; a deck rings the tower with the lantern
  // sitting inside it, exactly like the real thing.
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 1, side: THREE.DoubleSide, emissive: 0x101319 });
  // Both of these are rings. They used to be solid cylinders, which capped
  // the shaft as effectively as a lid: you climbed the whole stair and
  // arrived under a stone floor with nothing to come up through. The bore
  // stays open the whole way now, so the stairwell runs into the lantern.
  // The deck is floor almost all the way in — you need something to stand on
  // when you step off the last tread — with a hatch cut where the stair comes
  // up through it. Cutting the hatch at LH_ARRIVE rather than placing it by
  // eye is the whole point: the previous one was a hand-placed wedge and it
  // sat a quarter-turn away from where you actually surfaced.
  const LH_HATCH = 0.55;
  const cutWedge = (geo, a0, a1) => {
    const idx = geo.getIndex().array, pos = geo.attributes.position, keep = [];
    for (let t = 0; t < idx.length; t += 3) {
      let cx = 0, cz = 0;
      for (let k = 0; k < 3; k++) { const v = idx[t + k]; cx += pos.getX(v); cz += pos.getZ(v); }
      let a = Math.atan2(cx / 3, cz / 3) - a0;
      a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (a >= a1 - a0) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    }
    geo.setIndex(keep);
  };
  const HATCH_A0 = LH_ARRIVE - 0.35, HATCH_A1 = LH_ARRIVE + 0.75;
  const ringBand = (pts) => new THREE.LatheGeometry(
    [...pts, pts[0]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
  const deck = new THREE.Mesh(ringBand([
    [LH_HATCH, LH_TOP - 0.22], [3.15, LH_TOP - 0.22], [3.35, LH_TOP], [LH_HATCH, LH_TOP],
  ]), stone);
  const corbel = new THREE.Mesh(ringBand([
    [LH_HATCH, LH_TOP - 0.70], [2.45, LH_TOP - 0.70], [3.15, LH_TOP - 0.20], [LH_HATCH, LH_TOP - 0.20],
  ]), stone);
  for (const m of [deck, corbel]) cutWedge(m.geometry, HATCH_A0, HATCH_A1);
  lighthouse.add(deck, corbel);

  // The scan's cap was cut away with the mast, so the top of the shaft has
  // to be closed here or you'd see straight up to the sky from the floor.
  // Outside the lantern it's the walkway; inside it's the lantern floor,
  // with a wedge left open where the stair comes up.
  // rotation baked in so the hatch can be cut in the same frame as the deck's
  const walkGeo = new THREE.RingGeometry(LH_HATCH, 3.35, 28, 1);
  walkGeo.rotateX(-Math.PI / 2);
  cutWedge(walkGeo, HATCH_A0, HATCH_A1);
  const walk = new THREE.Mesh(walkGeo, deckMat);
  walk.position.y = LH_TOP + 0.005;
  lighthouse.add(walk);

  // No inner floor over the stairwell. It used to be a ring with a wedge cut
  // where the stair arrives, but the wedge is positioned from the geometry's
  // angle convention while the climb is tracked in another, so the two drifted
  // apart and the stair delivered you into solid floor. The shaft is simply
  // open now — you come up through it into the lantern, and the walkway ring
  // outside is what you stand on.

  // railing round the gallery
  {
    const N = 24, R = 3.2;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.05, 5), iron);
      post.position.set(Math.cos(a) * R, LH_TOP + 0.52, Math.sin(a) * R);
      lighthouse.add(post);
    }
    for (const [ry, rr] of [[LH_TOP + 1.02, 0.05], [LH_TOP + 0.55, 0.032]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R, rr, 6, 32), iron);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = ry;
      lighthouse.add(ring);
    }
  }

  // ---- lantern room -------------------------------------------------
  const LR_R = 1.95, LR_Y0 = LH_TOP + 0.1, LR_H = 3.3;
  // Low plinth the glazing stands on — a ring, carrying the same hatch as the
  // deck below it. As a solid disc it was a second lid over the stairwell,
  // sitting 0.45 m above the one we'd just opened.
  const plinthGeo = ringBand([
    [LH_HATCH, LR_Y0], [LR_R + 0.08, LR_Y0],
    [LR_R + 0.08, LR_Y0 + 0.35], [LH_HATCH, LR_Y0 + 0.35],
  ]);
  cutWedge(plinthGeo, HATCH_A0, HATCH_A1);
  const plinth = new THREE.Mesh(plinthGeo, iron);
  lighthouse.add(plinth);
  // the glass itself
  lanternGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(LR_R, LR_R, LR_H - 0.35, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xa8c6e0, roughness: 0.05, metalness: 0.15,
      transparent: true, opacity: 0.17, side: THREE.DoubleSide, emissive: 0x1d2733,
    }));
  lanternGlass.position.y = LR_Y0 + 0.35 + (LR_H - 0.35) / 2;
  lighthouse.add(lanternGlass);
  // astragals — the vertical glazing bars, and two horizontal rings
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, LR_H - 0.35, 0.07), iron);
    bar.position.set(Math.cos(a) * LR_R, LR_Y0 + 0.35 + (LR_H - 0.35) / 2, Math.sin(a) * LR_R);
    bar.rotation.y = -a;
    lighthouse.add(bar);
  }
  for (const yy of [LR_Y0 + 1.25, LR_Y0 + 2.45]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(LR_R, 0.035, 6, 24), iron);
    ring.rotation.x = Math.PI / 2; ring.position.y = yy;
    lighthouse.add(ring);
  }
  // the roof: a shallow cone with a ventilator ball and a finial
  const roofMat = iron.clone(); roofMat.side = THREE.DoubleSide;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(LR_R + 0.35, 1.5, 16), roofMat);
  roof.position.y = LR_Y0 + LR_H + 0.75;
  const vent = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), iron);
  vent.position.y = LR_Y0 + LR_H + 1.6;
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 5), iron);
  finial.position.y = LR_Y0 + LR_H + 2.05;
  lighthouse.add(roof, vent, finial);

  // ---- the optic ----------------------------------------------------
  const LAMP_Y = LR_Y0 + 1.6;
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.7, 12), brass);
  pedestal.position.y = LR_Y0 + 0.7;
  lighthouse.add(pedestal);
  lampCore = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe9c2, fog: false }));
  lampCore.position.y = LAMP_Y;
  // fresnel rings round the lamp
  for (const [ry, rr] of [[LAMP_Y - 0.5, 0.85], [LAMP_Y, 0.95], [LAMP_Y + 0.5, 0.85]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.05, 6, 20), brass);
    ring.rotation.x = Math.PI / 2; ring.position.y = ry;
    lighthouse.add(ring);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe6bf, transparent: true, opacity: 0.85, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  glow.position.y = LAMP_Y; glow.scale.setScalar(6);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffdca6, transparent: true, opacity: 0.16, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  halo.position.y = LAMP_Y; halo.scale.setScalar(22);
  lighthouse.userData.glow = glow; lighthouse.userData.halo = halo;
  const lampLight = new THREE.PointLight(0xffd9a0, 14, 14, 1.5);
  lampLight.position.y = LAMP_Y;
  lighthouse.add(lampCore, glow, halo, lampLight);

  beamPivot = new THREE.Group(); beamPivot.position.y = LAMP_Y;
  const beamGeo = new THREE.ConeGeometry(6, 260, 22, 1, true);
  beamGeo.translate(0, 130, 0); beamGeo.rotateX(-Math.PI / 2);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff0d6, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
  beamPivot.add(beam); beamPivot.userData.beam = beam;
  lighthouse.add(beamPivot);
}
scene.add(lighthouse);

// ------------------------------------------------------------------
// The headland the lighthouse stands on — boulders and tall grass, so the
// end of the walk looks like somewhere rather than more beach. All of it
// sits in a band around LH_Z and is skipped by the recentring tiles.
// ------------------------------------------------------------------
const lhGround = new THREE.Group();
lighthouse.add(lhGround);

// A trodden path runs from the beach up to the door. The doorway sits at
// local +Z (three measures cylinder theta from +Z), which is the side you
// arrive from, so the lane just runs straight out along +Z. Everything
// scattered on the headland asks `onPath()` first and steps aside.
const PATH_LEN = 30;                    // how far out from the tower it reaches
const PATH_HALF = 1.9;                  // half-width at the door…
const PATH_HALF_FAR = 3.1;              // …flaring as it meets the sand
function pathHalfAt(z) {
  const t = THREE.MathUtils.clamp(z / PATH_LEN, 0, 1);
  return PATH_HALF + (PATH_HALF_FAR - PATH_HALF) * t * t;
}
// wander the centre line a little so it doesn't read as a runway
// How far the lane wanders off the straight at a given distance from the door.
// The wander is faded out over the last stretch: it has to arrive square on
// the doorway, and without the fade it ran past a metre and a half to one
// side, which is what made the door look like it wasn't on the path at all.
const pathBend = (z) => (Math.sin(z * 0.21) * 0.9 + Math.sin(z * 0.07 + 1.3) * 0.6)
  * THREE.MathUtils.smoothstep(z, 2, 16);
function onPath(x, z, margin = 0) {
  if (z < -1.5 || z > PATH_LEN + 3) return false;
  return Math.abs(x - pathBend(z)) < pathHalfAt(z) + margin;
}

/* The headland. The tower stands on a ridge that climbs out of the beach,
 * with the sea falling away on both sides — the approach reads as a walk out
 * along a spine rather than across flat sand. Heights are in world space,
 * relative to the lighthouse origin.
 *
 *   HL_RUN    how far back down the beach the ridge starts
 *   HL_CREST  height at the tower
 *   HL_HALF   how wide the spine is before it drops away
 */
function headlandAt(wx, wz) {
  const z = wz - LH_Z;                      // +Z is back toward the beach
  if (z < -26 || z > HL_RUN) return 0;
  // along the spine: flat top over the tower, easing down to the sand
  const t = THREE.MathUtils.clamp(1 - Math.max(0, z) / HL_RUN, 0, 1);
  const along = t * t * (3 - 2 * t);        // smoothstep, so it eases in
  // across the spine: a crown that falls off to nothing at the flanks
  const x = wx - LH_X - pathBend(Math.max(0, z)) * 0.5;
  const across = Math.max(0, 1 - Math.pow(Math.abs(x) / HL_HALF, 1.7));
  let h = HL_CREST * along * across;
  // a little roll along its length so it isn't an extruded ramp
  h += Math.sin(z * 0.09) * 0.5 * along * across;
  h += Math.sin(z * 0.31 + x * 0.2) * 0.16 * along * across;
  return Math.max(0, h);
}
// true anywhere the ridge is high enough to be dry land
function onHeadland(wx, wz) { return headlandAt(wx, wz) > 0.35; }

// ---- the ridge itself ----------------------------------------------
{
  const NX = 96, NZ = 120, SPAN = 42;
  const g = new THREE.PlaneGeometry(SPAN, HL_RUN + 30, NX, NZ);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i), lz = pos.getZ(i);
    // plane is centred on the group; shift so it runs from the tower outward
    const wz = LH_Z + lz + (HL_RUN - 30) / 2 + 15;
    const wx = LH_X + lx;
    pos.setY(i, headlandAt(wx, wz) - HL_CREST);
    pos.setZ(i, lz + (HL_RUN - 30) / 2 + 15);
  }
  g.computeVertexNormals();
  const gTex = sandTex.clone(); gTex.needsUpdate = true; gTex.repeat.set(SPAN / 6, (HL_RUN + 30) / 6);
  const ridge = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    map: gTex, color: 0x5f6552, roughness: 1, metalness: 0,
    emissive: 0x1c2016, emissiveMap: gTex, flatShading: false,
  }));
  ridge.frustumCulled = false;
  lhGround.add(ridge);
}

{
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4b5260, roughness: 1, flatShading: true, emissive: 0x171b23 });
  const rockDk = new THREE.MeshStandardMaterial({ color: 0x373d49, roughness: 1, flatShading: true, emissive: 0x101319 });
  const ROCKS = 46;
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rockMat, ROCKS);
  const rocksDk = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), rockDk, ROCKS);
  rocks.frustumCulled = rocksDk.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();
  // re-roll a spot until it's off the path (bounded, so it can't spin)
  const offPath = (pick, margin) => {
    for (let tries = 0; tries < 24; tries++) {
      const p = pick();
      if (!onPath(p.x, p.z, margin)) return p;
    }
    return null;
  };
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < ROCKS; i++) {
    // ring them round the tower, thickest out to the sides
    const s = 0.5 + Math.random() * 1.9;
    const spot = offPath(() => {
      const a = Math.random() * Math.PI * 2, rr = 5.5 + Math.random() * 13;
      return { x: Math.cos(a) * rr, z: Math.sin(a) * rr };
    }, s * 0.9);
    if (!spot) rocks.setMatrixAt(i, hidden);
    else {
      e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      q.setFromEuler(e);
      m.compose(v.set(spot.x, s * 0.28, spot.z), q, new THREE.Vector3(s, s * 0.72, s * 1.1));
      rocks.setMatrixAt(i, m);
    }
    const s2 = 0.3 + Math.random() * 1.1;
    const spot2 = offPath(() => {
      const a = Math.random() * Math.PI * 2, rr = 4.5 + Math.random() * 16;
      return { x: Math.cos(a) * rr, z: Math.sin(a) * rr };
    }, s2 * 0.9);
    if (!spot2) rocksDk.setMatrixAt(i, hidden);
    else {
      e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      q.setFromEuler(e);
      m.compose(v.set(spot2.x, s2 * 0.3, spot2.z), q, new THREE.Vector3(s2, s2 * 0.8, s2));
      rocksDk.setMatrixAt(i, m);
    }
  }
  rocks.instanceMatrix.needsUpdate = rocksDk.instanceMatrix.needsUpdate = true;
  lhGround.add(rocks, rocksDk);

  // Grass on the headland: the real clumps from the pack, alpha-cut and
  // swaying in the vertex shader. The old version was solid blade planes,
  // which read as green sticks.
  loadGeoPack('assets/grass.json').then((geos) => {
    const keys = Object.keys(geos);
    const map = texLoader.load('assets/tex/grass.png');
    map.colorSpace = THREE.SRGBColorSpace;
    const grassMat = new THREE.MeshStandardMaterial({
      map, color: 0x8a9470, roughness: 1, metalness: 0, emissive: 0x1b2116,
      side: THREE.DoubleSide, transparent: true, alphaTest: 0.42,
    });
    grassMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = oceanUniforms.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 iw = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float sway = sin(uTime * 1.5 + iw.x * 0.7 + iw.z * 0.5) * 0.5
                     + sin(uTime * 2.6 + iw.z) * 0.2;
          transformed.x += sway * 0.16 * max(position.y, 0.0);
          transformed.z += sway * 0.10 * max(position.y, 0.0);`);
    };
    const PER = 160;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const e = new THREE.Euler(), v = new THREE.Vector3();
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    keys.forEach((k) => {
      const inst = new THREE.InstancedMesh(geos[k], grassMat, PER);
      inst.frustumCulled = false;
      for (let i = 0; i < PER; i++) {
        const cz = -14 + Math.random() * (HL_RUN + 20);
        const side = Math.random() < 0.5 ? -1 : 1;
        const cx = pathBend(Math.max(0, cz)) + side * (pathHalfAt(Math.max(0, cz)) + Math.random() * 9);
        const bx = cx + (Math.random() - 0.5) * 2.2, bz = cz + (Math.random() - 0.5) * 2.2;
        const gy = headlandAt(LH_X + bx, LH_Z + bz) - HL_CREST;
        // nothing grows on the trodden path, or off the end of the ridge
        // never off the end of the ridge, never on the trodden path, and
        // bedded a touch so no clump floats over a slope
        if (gy + HL_CREST < 0.5 || onPath(bx, bz, -0.2)) { inst.setMatrixAt(i, hidden); continue; }
        const h = 0.34 + Math.random() * 0.42;   // knee height, not waist
        e.set(0, Math.random() * Math.PI * 2, 0);
        q.setFromEuler(e);
        m.compose(v.set(bx, gy - h * 0.08, bz), q, new THREE.Vector3(h, h, h));
        inst.setMatrixAt(i, m);
      }
      inst.instanceMatrix.needsUpdate = true;
      lhGround.add(inst);
    });
  }).catch(() => {});

  // ---- the path surface itself -------------------------------------
  // A ribbon of packed, paler ground following the same bend, laid just
  // above the sand. Built as a strip so it can bend and flare.
  {
    const SEG = 34;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= SEG; i++) {
      const z = (i / SEG) * (PATH_LEN + 2) - 1.0;
      const cx = pathBend(z), hw = pathHalfAt(z);
      // ragged edges — trodden ground doesn't have a clean border
      const wobL = Math.sin(z * 1.7) * 0.16 + Math.sin(z * 0.9 + 2.1) * 0.12;
      const wobR = Math.sin(z * 1.5 + 1.1) * 0.16 + Math.sin(z * 0.8) * 0.12;
      const yL = headlandAt(LH_X + cx - hw + wobL, LH_Z + z) - HL_CREST;
      const yR = headlandAt(LH_X + cx + hw + wobR, LH_Z + z) - HL_CREST;
      pos.push(cx - hw + wobL, yL, z,  cx + hw + wobR, yR, z);
      uv.push(0, z * 0.25,  1, z * 0.25);
      if (i < SEG) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1,  a + 1, a + 2, a + 3);
      }
    }
    const pathGeo = new THREE.BufferGeometry();
    pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    pathGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    pathGeo.setIndex(idx);
    pathGeo.computeVertexNormals();
    const pathTex = sandTex.clone(); pathTex.needsUpdate = true; pathTex.repeat.set(1.4, 1);
    const pathMesh = new THREE.Mesh(pathGeo, new THREE.MeshStandardMaterial({
      map: pathTex, color: 0x8d8067, roughness: 1, metalness: 0,
      emissive: 0x2a2519, emissiveMap: pathTex,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    pathMesh.position.y = 0.03;
    pathMesh.frustumCulled = false;
    lhGround.add(pathMesh);

    // ---- fence line ------------------------------------------------
    // Weathered posts down both shoulders with wire strung between them,
    // the way a coast path is kept off the drop.
    {
      const postMat = new THREE.MeshStandardMaterial({
        color: 0x9a8f7c, roughness: 1, metalness: 0, flatShading: true, emissive: 0x2b271f,
      });
      const wireMat = new THREE.LineBasicMaterial({ color: 0x6a6a64, transparent: true, opacity: 0.55 });
      for (const side of [-1, 1]) {
        const tops = [[], []];                 // two strands of wire
        let z = -0.5;
        while (z < PATH_LEN + 2) {
          const cx = pathBend(z) + side * (pathHalfAt(z) + 0.55);
          const gy = headlandAt(LH_X + cx, LH_Z + z) - HL_CREST;
          const h = 1.02 + Math.random() * 0.16;
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, h, 6), postMat);
          post.position.set(cx, gy + h / 2 - 0.06, z);
          post.rotation.set((Math.random() - 0.5) * 0.09, Math.random(), (Math.random() - 0.5) * 0.11);
          lhGround.add(post);
          tops[0].push(new THREE.Vector3(cx, gy + h - 0.16, z));
          tops[1].push(new THREE.Vector3(cx, gy + h - 0.52, z));
          z += 2.3 + Math.random() * 0.9;
        }
        for (const strand of tops) {
          if (strand.length < 2) continue;
          // let the wire sag between posts
          const sag = [];
          for (let i = 0; i < strand.length - 1; i++) {
            const a = strand[i], b = strand[i + 1];
            for (let k = 0; k <= 4; k++) {
              const t = k / 4;
              const p2 = a.clone().lerp(b, t);
              p2.y -= Math.sin(t * Math.PI) * 0.07;
              sag.push(p2);
            }
          }
          const lg = new THREE.BufferGeometry().setFromPoints(sag);
          const line = new THREE.Line(lg, wireMat);
          line.frustumCulled = false;
          lhGround.add(line);
        }
      }
    }


    // stones kicked to the sides over years of walking it
    const EDGE = 60;
    const edging = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rockMat, EDGE);
    edging.frustumCulled = false;
    for (let i = 0; i < EDGE; i++) {
      const z = -0.5 + Math.random() * (PATH_LEN + 1.5);
      const side = i % 2 ? 1 : -1;
      const s = 0.13 + Math.random() * 0.26;
      const x = pathBend(z) + side * (pathHalfAt(z) + 0.05 + Math.random() * 0.4);
      e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      q.setFromEuler(e);
      const ey = headlandAt(LH_X + x, LH_Z + z) - HL_CREST;
      m.compose(v.set(x, ey + s * 0.34, z), q, new THREE.Vector3(s, s * 0.7, s * 1.15));
      edging.setMatrixAt(i, m);
    }
    edging.instanceMatrix.needsUpdate = true;
    lhGround.add(edging);

    // a few flat slabs set into the last stretch up to the threshold
    const SLABS = 9;
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x656b78, roughness: 1, flatShading: true, emissive: 0x1e222b });
    const slabs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.08, 6), slabMat, SLABS);
    slabs.frustumCulled = false;
    for (let i = 0; i < SLABS; i++) {
      const z = 3.9 + i * 1.15;
      const s = 0.45 + Math.random() * 0.2;
      e.set(0, Math.random() * Math.PI, 0);
      q.setFromEuler(e);
      const sx = pathBend(z) + (Math.random() - 0.5) * 0.35;
      const sy = headlandAt(LH_X + sx, LH_Z + z) - HL_CREST;
      m.compose(v.set(sx, sy + 0.05, z), q, new THREE.Vector3(s, 1, s * 0.85));
      slabs.setMatrixAt(i, m);
    }
    slabs.instanceMatrix.needsUpdate = true;
    lhGround.add(slabs);
  }
}

// ------------------------------------------------------------------
// Wrack line
// ------------------------------------------------------------------
const DEBRIS_TILE = 46;
const debris = new THREE.Group();
scene.add(debris);
/* Everything scattered on the sand gets clipped at the waterline the same way
 * the beach itself is, so the tide covers it instead of it poking through the
 * sea. Doing it in the shader means no per-frame instance updates. */
function clipAtShore(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = oceanUniforms.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSeaPos;')
      .replace('#include <project_vertex>',
        '#include <project_vertex>\nvSeaPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSeaPos;\nuniform float uTime;\n' + noiseGLSL + shoreGLSL)
      .replace('#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\n if (vSeaPos.x < shoreLine(vSeaPos.z, uTime) - 0.05) discard;');
  };
  mat.customProgramCacheKey = () => 'clipAtShore';
  return mat;
}

function scatter(geo, mat, perTile, place) {
  clipAtShore(mat);
  const grid = 7, half = grid >> 1;
  const mesh = new THREE.InstancedMesh(geo, mat, perTile * grid);
  mesh.frustumCulled = false;
  const items = Array.from({ length: perTile }, (_, i) => place(i));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  let idx = 0;
  for (let gz = -half; gz <= half; gz++) for (const it of items) {
    q.setFromEuler(it.rot);
    m.compose(new THREE.Vector3(it.x, it.y, it.z + gz * DEBRIS_TILE), q, it.scale);
    if (it.color) mesh.setColorAt(idx, it.color);
    mesh.setMatrixAt(idx++, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  debris.add(mesh);
  return mesh;
}
const zSpan = () => Math.random() * DEBRIS_TILE - DEBRIS_TILE / 2;
const wrackX = () => 1.4 + Math.random() * 3.4;      // the high-tide band

// (bladder-wrack and kelp removed — the wrack scatter looked bad)
// scallop / clam shells, pale against the dark sand
scatter(
  new THREE.ConeGeometry(0.5, 0.22, 7),
  new THREE.MeshStandardMaterial({ color: 0xa9aca4, roughness: 1, flatShading: true, emissive: 0x33352f }),
  3,
  () => { const s = 0.07 + Math.random() * 0.11; return {
    x: 0.8 + Math.random() * 4.4, z: zSpan(), y: 0.012,
    rot: new THREE.Euler(Math.PI * (Math.random() < 0.5 ? 1 : 0.06), Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.5),
    scale: new THREE.Vector3(s, s * 0.5, s),
  }; }
);
// spiral snail shells
scatter(
  new THREE.ConeGeometry(0.4, 1.0, 6),
  new THREE.MeshStandardMaterial({ color: 0x8d8578, roughness: 1, flatShading: true, emissive: 0x2b2823 }),
  1,
  () => { const s = 0.055 + Math.random() * 0.06; return {
    x: 0.9 + Math.random() * 4.0, z: zSpan(), y: 0.02,
    rot: new THREE.Euler(Math.PI / 2 + (Math.random() - 0.5) * 0.6, Math.random() * Math.PI * 2, 0),
    scale: new THREE.Vector3(s, s * 1.6, s),
  }; }
);
// driftwood — planks and gnarled branches
scatter(
  new THREE.BoxGeometry(1, 0.12, 0.12),
  new THREE.MeshStandardMaterial({ color: 0x4b4236, roughness: 1, flatShading: true, emissive: 0x120f0b }),
  1,
  () => ({
    x: wrackX(), z: zSpan(), y: 0.06,
    rot: new THREE.Euler(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.2),
    scale: new THREE.Vector3(1.0 + Math.random() * 2.2, 0.7 + Math.random() * 0.8, 0.7 + Math.random() * 0.8),
  })
);
scatter(
  new THREE.CylinderGeometry(0.05, 0.03, 1, 5),
  new THREE.MeshStandardMaterial({ color: 0x574a3b, roughness: 1, flatShading: true, emissive: 0x151109 }),
  1,
  () => ({
    x: wrackX(), z: zSpan(), y: 0.05,
    rot: new THREE.Euler(Math.PI / 2 + (Math.random() - 0.5) * 0.3, Math.random() * Math.PI, 0),
    scale: new THREE.Vector3(0.5 + Math.random() * 0.7, 0.5 + Math.random() * 1.3, 0.5 + Math.random() * 0.7),
  })
);
// bleached foam / plastic scraps
scatter(
  new THREE.BoxGeometry(0.1, 0.02, 0.08),
  new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 1, flatShading: true, emissive: 0x2e3235 }),
  1,
  () => ({
    x: wrackX(), z: zSpan(), y: 0.015,
    rot: new THREE.Euler((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4),
    scale: new THREE.Vector3(0.6 + Math.random() * 1.2, 1, 0.6 + Math.random() * 1.2),
  })
);

// ------------------------------------------------------------------
// Seashells. Two builds — a ribbed fan and a spiral cone — grown from a
// lathe/parametric sweep so they read as shells rather than lumps.
// ------------------------------------------------------------------
function makeFanShell() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xd8c9b4, roughness: 0.82, metalness: 0.02,
    flatShading: true, emissive: 0x3a3025, side: THREE.DoubleSide,
  });
  // a ribbed scallop: wedges fanning out from the hinge, each tilted a little
  const RIBS = 11, SPAN = Math.PI * 0.92, R = 0.085;
  const pos = [];
  for (let i = 0; i < RIBS; i++) {
    const a0 = -SPAN / 2 + (i / RIBS) * SPAN;
    const a1 = -SPAN / 2 + ((i + 1) / RIBS) * SPAN;
    const bulge = 1 + 0.14 * Math.sin((i / RIBS) * Math.PI);   // fatter mid-fan
    const r = R * bulge;
    // hinge point, then the two outer corners of this rib
    const y0 = 0.012 * Math.sin((i / RIBS) * Math.PI);
    pos.push(0, 0, 0);
    pos.push(Math.cos(a0) * r, y0, Math.sin(a0) * r);
    pos.push(Math.cos(a1) * r, y0, Math.sin(a1) * r);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const shell = new THREE.Mesh(geo, mat);
  shell.rotation.x = -0.22;
  g.add(shell);
  return g;
}
function makeSpiralShell() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xc9b79c, roughness: 0.78, metalness: 0.02,
    flatShading: true, emissive: 0x342a1e,
  });
  // a cone wound round its own axis — a whelk, roughly
  const TURNS = 3.1, SEGS = 46, SIDES = 7;
  const pts = [], idx = [];
  for (let i = 0; i <= SEGS; i++) {
    const t = i / SEGS;
    const a = t * TURNS * Math.PI * 2;
    const rad = 0.052 * (1 - t) + 0.004;        // tapering tube
    const coil = 0.062 * (1 - t * 0.75);        // winding in as it climbs
    const cx = Math.cos(a) * coil, cz = Math.sin(a) * coil, cy = t * 0.115;
    for (let k = 0; k < SIDES; k++) {
      const b = (k / SIDES) * Math.PI * 2;
      pts.push(cx + Math.cos(b) * rad * 0.8, cy + Math.sin(b) * rad, cz + Math.cos(b + a) * rad * 0.35);
    }
  }
  for (let i = 0; i < SEGS; i++) for (let k = 0; k < SIDES; k++) {
    const a0 = i * SIDES + k, a1 = i * SIDES + ((k + 1) % SIDES);
    const b0 = a0 + SIDES, b1 = a1 + SIDES;
    idx.push(a0, b0, a1, a1, b0, b1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, mat));
  return g;
}

// ------------------------------------------------------------------
// Rocks. Generated rather than modelled: start from a subdivided solid,
// shove every vertex around with layered noise, then weld nothing and let
// flat shading find the facets. Same idea as a low-poly rock generator,
// and it costs a few lines instead of a dependency.
// ------------------------------------------------------------------
/* Rock and grass geometry from the packs credited in the README, pulled out
 * by tools/gltfgeo.py as bare positions/UVs/indices. Both were already only a
 * few hundred triangles, so the value is the silhouettes and the UVs — no rig,
 * no loader needed. */
const texLoader = new THREE.TextureLoader();
function loadGeoPack(url) {
  return fetch(url).then((r) => r.json()).then((j) => {
    const out = {};
    for (const [k, v] of Object.entries(j)) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(v.p, 3));
      if (v.u) g.setAttribute('uv', new THREE.Float32BufferAttribute(v.u, 2));
      g.setIndex(v.i);
      g.computeVertexNormals();
      out[k] = g;
    }
    return out;
  });
}

function makeRockGeo(seed = 1, detail = 1, lumpiness = 0.34) {
  const g = new THREE.IcosahedronGeometry(0.5, detail);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  // cheap deterministic hash so a given seed always makes the same rock
  const h = (a, b, c) => {
    const n = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + seed * 43.123) * 43758.5453;
    return n - Math.floor(n) - 0.5;
  };
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const d = v.clone().normalize();
    // three octaves: broad lopsidedness, then chunkier faces, then grit
    let k = 1;
    k += h(d.x * 1.7, d.y * 1.7, d.z * 1.7) * lumpiness;
    k += h(d.x * 4.3, d.y * 4.3, d.z * 4.3) * lumpiness * 0.5;
    k += h(d.x * 9.1, d.y * 9.1, d.z * 9.1) * lumpiness * 0.22;
    v.multiplyScalar(k);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  // squash so they sit like rocks rather than float like asteroids
  g.scale(1, 0.72, 0.92);
  g.computeVertexNormals();
  return g;
}
// The scattered rocks are the real models now — the procedural ones read as
// lumps. Four builds, each with its own albedo, instanced through the same
// tiling scatter() so they run the length of the beach.
// ------------------------------------------------------------------
// Beach rocks — irregular eroded formations
// ------------------------------------------------------------------
/* The reference is a limestone shelf worn into pits, lips and overhangs, and
 * it comes in GROUPS — a formation with sand running between the masses —
 * never a lone lump. So a formation is 3-7 masses sharing a centre, and each
 * mass is an icosphere pushed about by four things: broad lopsidedness so no
 * two read alike, horizontal strata, erosion pits gouged in from random
 * directions, and a flattened base so it sits ON the sand rather than over it.
 *
 * These are fixed world objects, deliberately NOT part of the recentring
 * `debris` tile and NOT clipped at the shoreline: they're landmarks you can
 * climb, they carry collision, and a real rock stays visible when the tide
 * runs over it.
 */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeErodedRock(seed, detail = 3) {
  const rnd = mulberry32(seed);
  const g = new THREE.IcosahedronGeometry(0.5, detail);
  const pos = g.attributes.position;
  const v = new THREE.Vector3(), d = new THREE.Vector3();

  // broad lobes give the silhouette its lopsidedness
  const lobes = Array.from({ length: 3 + Math.floor(rnd() * 2) }, () => ({
    dir: new THREE.Vector3(rnd() * 2 - 1, rnd() * 0.8 - 0.2, rnd() * 2 - 1).normalize(),
    amp: 0.20 + rnd() * 0.34,
    tight: 1.0 + rnd() * 1.6,
  }));
  /* Erosion. This is the whole character of the reference: solution pits and
   * hollows bitten deep into the stone, leaving lips and overhangs between
   * them. Shallow noise gives you a crumpled ball, so the pits are cut hard —
   * a lot of them, deep, with a tight falloff so each one has an edge. */
  const pits = Array.from({ length: 10 + Math.floor(rnd() * 7) }, () => ({
    dir: new THREE.Vector3(rnd() * 2 - 1, rnd() * 1.6 - 0.35, rnd() * 2 - 1).normalize(),
    amp: 0.16 + rnd() * 0.30,
    tight: 7 + rnd() * 20,
  }));
  const strataPhase = rnd() * 6.28, strataFreq = 6 + rnd() * 10;
  const squash = 0.52 + rnd() * 0.34;          // beach rock is wider than tall
  // a wave-cut face: one side sheared off flat, the way a shelf breaks
  const shear = new THREE.Vector3(rnd() * 2 - 1, 0.15 + rnd() * 0.3, rnd() * 2 - 1).normalize();
  const shearAt = 0.34 + rnd() * 0.20;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    d.copy(v).normalize();
    let r = 1;
    for (const l of lobes) r += l.amp * Math.pow(Math.max(0, d.dot(l.dir)), l.tight);
    for (const p of pits) r -= p.amp * Math.pow(Math.max(0, d.dot(p.dir)), p.tight);
    r *= 1 + 0.075 * Math.sin(v.y * strataFreq + strataPhase);   // bedding planes
    // sharp ridge noise — abs() of a sine leaves creases, not swells
    r *= 0.90 + 0.13 * Math.abs(Math.sin(d.x * 7.1 + d.z * 5.9 + seed));
    r *= 0.94 + 0.10 * Math.abs(Math.sin(d.y * 11.3 + d.x * 9.7 - seed * 2));
    v.multiplyScalar(Math.max(0.30, r));
    v.y *= squash;
    // shear the exposed face flat
    const sd = v.dot(shear);
    if (sd > shearAt) v.addScaledVector(shear, -(sd - shearAt));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  // sit it flat: everything below the cut is pressed onto one plane, so the
  // rock meets the sand along an edge instead of balancing on a curve
  const cut = -0.5 * squash * 0.42;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < cut) pos.setY(i, cut);
  }
  g.computeVertexNormals();
  g.computeBoundingBox();
  const bb = g.boundingBox;
  // translate so the flattened base is exactly y = 0
  g.translate(0, -bb.min.y, 0);
  g.computeBoundingBox();

  // weathering in vertex colours: dark and damp in the crevices, bleached on
  // the up-faces where the moon catches, plus a mottle so it isn't uniform
  const nrm = g.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const h = Math.max(0.001, g.boundingBox.max.y);
  for (let i = 0; i < pos.count; i++) {
    const up = Math.max(0, nrm.getY(i));
    const yy = pos.getY(i) / h;
    let t = 0.36 + 0.42 * Math.pow(up, 0.8) + 0.20 * yy;
    t *= 0.86 + 0.20 * Math.abs(Math.sin(pos.getX(i) * 9.1 + pos.getZ(i) * 7.7 + seed));
    t = THREE.MathUtils.clamp(t, 0.16, 1);
    col[i * 3] = t * 0.99; col[i * 3 + 1] = t * 0.98; col[i * 3 + 2] = t;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const rockMatBeach = new THREE.MeshStandardMaterial({
  color: 0x7c8496, vertexColors: true, roughness: 1, metalness: 0,
  emissive: 0x161a22, flatShading: true,
});

/* Collision. The game has no mesh collision, so each mass registers a
 * cylinder: stand on it when your feet clear the top, and get pushed out of
 * it when they don't. Cheap, and for rounded boulders it's honest enough. */
const rockColliders = [];
const rockGroup = new THREE.Group();
scene.add(rockGroup);

function placeRockMass(seed, wx, wz, scale, tilt) {
  const geo = makeErodedRock(seed, scale > 1.4 ? 3 : 2);
  const m = new THREE.Mesh(geo, rockMatBeach);
  const sy = scale * (0.82 + mulberry32(seed * 7 + 3)() * 0.4);
  m.scale.set(scale, sy, scale);
  m.position.set(wx, -0.10, wz);              // bedded, so the base edge is buried
  m.rotation.set(tilt.x, tilt.y, tilt.z);
  m.frustumCulled = false;
  rockGroup.add(m);
  const bb = geo.boundingBox;
  const rad = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.5 * scale;
  rockColliders.push({
    x: wx, z: wz,
    r: rad * 0.86,                            // inside the silhouette, so you
    top: -0.10 + bb.max.y * sy,               // never stand on thin air
  });
  return m;
}

/* Formations, laid down the length of the walk. Rare on purpose — the beach
 * was carpeted once and that is not worth repeating — so they're 90-170 m
 * apart and each one is a landmark rather than scenery. */
{
  const rnd = mulberry32(20260901);
  let z = -30, seed = 1;
  while (z > -1120) {
    // the formation's own centre, and how spread out its masses are
    const cx = 0.6 + rnd() * 8.0;
    const spread = 2.4 + rnd() * 4.0;
    const n = 4 + Math.floor(rnd() * 4);
    const big = 2.2 + rnd() * 2.9;            // the formation's dominant mass
    for (let i = 0; i < n; i++) {
      // the first mass is the big one; the rest shed around it, smaller
      const t = i === 0 ? 0 : 0.35 + rnd() * 0.65;
      const a = rnd() * Math.PI * 2;
      const dd = i === 0 ? 0 : Math.pow(rnd(), 0.6) * spread;
      const mx = THREE.MathUtils.clamp(cx + Math.cos(a) * dd, WADE_X + 0.6, CLIFF_BLOCK_X - 0.8);
      const mz = z + Math.sin(a) * dd;
      if (headlandAt(mx, mz) > 0.15) continue;      // never on the ridge
      const sc = big * (i === 0 ? 1 : 0.26 + t * 0.46);
      placeRockMass(seed++, mx, mz, sc, {
        x: (rnd() - 0.5) * 0.13,
        y: rnd() * Math.PI * 2,
        z: (rnd() - 0.5) * 0.13,
      });
    }
    z -= 90 + rnd() * 80;
  }
}

/* Standing on them. Called after updateTower() has set groundY from the sand
 * or the headland; a rock under your feet simply wins. */
const ROCK_STEP = 0.42;                 // how high a lip you can walk straight up
function rockGroundAt(x, z, feetY) {
  let best = null;
  for (const c of rockColliders) {
    const dx = x - c.x, dz = z - c.z;
    if (dx * dx + dz * dz > c.r * c.r) continue;
    if (feetY >= c.top - ROCK_STEP && (!best || c.top > best.top)) best = c;
  }
  return best;
}
function pushOutOfRocks(feetY) {
  for (const c of rockColliders) {
    if (feetY >= c.top - 0.06) continue;        // above it: that's a floor, not a wall
    const dx = camera.position.x - c.x, dz = camera.position.z - c.z;
    const rr = c.r + PLAYER_R * 0.6;
    const d2 = dx * dx + dz * dz;
    if (d2 >= rr * rr || d2 < 1e-6) continue;
    const d = Math.sqrt(d2);
    camera.position.x = c.x + (dx / d) * rr;
    camera.position.z = c.z + (dz / d) * rr;
  }
}

// ------------------------------------------------------------------
// Ground decals — footprints + dig holes (instanced pools)
// ------------------------------------------------------------------
function makeFootTexture() {
  // A pressed barefoot print in soft sand: heel, a narrowed arch, the ball,
  // and five toe pads — drawn as a shallow pit (dark, soft-edged) with a
  // moon-lit lip of pushed-up sand along the lower-right and a shadow along
  // the upper-left. The print points up the canvas; stampFoot() spins it to
  // the heading and mirrors it left/right per step.
  const S = 128;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');

  const sole = new Path2D();
  sole.moveTo(52, 110);
  sole.bezierCurveTo(33, 106, 28, 86, 35, 70);
  sole.bezierCurveTo(39, 57, 41, 45, 52, 34);
  sole.bezierCurveTo(59, 26, 77, 26, 84, 37);
  sole.bezierCurveTo(90, 48, 85, 61, 81, 74);
  sole.bezierCurveTo(79, 88, 75, 105, 62, 110);
  sole.closePath();

  const pit = (px, py, r, a) => {
    const rg = g.createRadialGradient(px, py, 0, px, py, r);
    rg.addColorStop(0, `rgba(0,1,3,${a})`);
    rg.addColorStop(0.65, `rgba(3,5,10,${a * 0.5})`);
    rg.addColorStop(1, 'rgba(3,5,10,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
  };

  g.save();
  g.clip(sole);
  g.fillStyle = 'rgba(2,4,9,0.5)'; g.fillRect(0, 0, S, S);
  pit(57, 92, 27, 0.92);          // heel, deepest
  pit(64, 44, 25, 0.82);          // ball
  pit(50, 66, 14, 0.4);           // shallow arch
  g.restore();

  // pushed-up sunlit lip, offset down-right toward the moon
  g.save(); g.translate(2.6, 3.2);
  g.strokeStyle = 'rgba(208,220,240,0.4)'; g.lineWidth = 3.4;
  g.lineJoin = 'round'; g.stroke(sole);
  g.restore();
  // the shaded far rim
  g.save(); g.translate(-1.6, -2.2);
  g.strokeStyle = 'rgba(0,1,4,0.4)'; g.lineWidth = 2.4;
  g.lineJoin = 'round'; g.stroke(sole);
  g.restore();

  // toes: big to little, arcing off the ball
  const toes = [[60, 17, 6.6], [72, 18, 5.3], [81, 22, 4.5], [88, 28, 3.7], [93, 35, 3.0]];
  for (const [tx, ty, tr] of toes) {
    pit(tx, ty, tr + 2.5, 0.85);
    g.beginPath(); g.arc(tx, ty, tr, 0, 7);
    g.fillStyle = 'rgba(2,3,8,0.55)'; g.fill();
    g.save(); g.translate(1.4, 2);
    g.strokeStyle = 'rgba(202,214,234,0.28)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(tx, ty, tr, 0, 7); g.stroke();
    g.restore();
  }

  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function makeCraterTexture() {
  const S = 128;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const cx = 64, cy = 66;

  // ragged outline of the pit — a wobbly polygon
  const N = 22, base = 30, wob = [];
  for (let i = 0; i < N; i++) wob.push(base + (Math.random() - 0.5) * 9);
  const ring = (rScale, path) => {
    path.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2, r = wob[i % N] * rScale;
      path[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7);
    }
    path.closePath();
  };

  // outer disturbed sand, faint
  ring(1.9, g); g.fillStyle = 'rgba(150,160,182,0.05)'; g.fill();
  // thrown spoil — a bright crescent on the near (bottom) side
  g.save();
  ring(1.55, g); g.clip();
  const sp = g.createLinearGradient(0, cy, 0, S);
  sp.addColorStop(0, 'rgba(0,0,0,0)');
  sp.addColorStop(1, 'rgba(176,186,206,0.32)');
  g.fillStyle = sp; g.fillRect(0, 0, S, S);
  g.restore();

  // the pit itself: pushed-up lit rim, then a steep dark bowl
  ring(1.12, g); g.fillStyle = 'rgba(198,208,228,0.22)'; g.fill();          // rim highlight
  ring(1.0, g);
  const bowl = g.createRadialGradient(cx, cy - 5, 2, cx, cy, base);
  bowl.addColorStop(0, 'rgba(0,0,1,0.95)');
  bowl.addColorStop(0.55, 'rgba(2,4,9,0.86)');
  bowl.addColorStop(0.85, 'rgba(8,12,20,0.5)');
  bowl.addColorStop(1, 'rgba(10,14,22,0.12)');
  g.fillStyle = bowl; g.fill();
  // undercut shadow on the far rim
  g.save(); ring(1.0, g); g.clip();
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.beginPath(); g.ellipse(cx, cy - 10, base * 0.9, base * 0.5, 0, 0, Math.PI * 2); g.fill();
  g.restore();

  // radial gouge marks left by the shovel blade
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2, r0 = 4 + Math.random() * 6, r1 = base * (0.7 + Math.random() * 0.35);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7);
    g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.7);
    g.stroke();
  }
  g.strokeStyle = 'rgba(190,202,224,0.07)'; g.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2, r0 = 6 + Math.random() * 8, r1 = base * (0.75 + Math.random() * 0.25);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7);
    g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.7); g.stroke();
  }

  // scattered clods flung around the pit
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, r = base * (1.1 + Math.random() * 0.8);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.7;
    const s = 1 + Math.random() * 2.5;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(150,160,182,0.35)' : 'rgba(6,8,14,0.4)';
    g.fillRect(x - s / 2, y - s / 2, s, s);
  }

  // colour-quantise for the PS1 look
  const img = g.getImageData(0, 0, S, S), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  return t;
}

const FOOT_POOL = 96;
const footGeo = new THREE.PlaneGeometry(0.26, 0.44); footGeo.rotateX(-Math.PI / 2);
const foot = new THREE.InstancedMesh(footGeo, new THREE.MeshBasicMaterial({ map: makeFootTexture(), transparent: true, depthWrite: false, opacity: 0.95 }), FOOT_POOL);
foot.frustumCulled = false; foot.renderOrder = 2; foot.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(foot);

const DIG_POOL = 20;
const _sandMat = new THREE.MeshStandardMaterial({ color: 0x6b7690, roughness: 1, flatShading: true, emissive: 0x232c3f });
// flat scrape/gouge decal on the surface
const digGeo = new THREE.PlaneGeometry(1.0, 1.0); digGeo.rotateX(-Math.PI / 2);
const digHoles = new THREE.InstancedMesh(digGeo, new THREE.MeshBasicMaterial({ map: makeCraterTexture(), transparent: true, depthWrite: false, opacity: 1 }), DIG_POOL);
digHoles.frustumCulled = false; digHoles.renderOrder = 3; digHoles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(digHoles);
// the actual 3D pit — an inverted low-poly cone sunk into the sand
const pitGeo = new THREE.ConeGeometry(0.34, 0.26, 7, 1, true);
pitGeo.rotateX(Math.PI);                 // point downward
pitGeo.translate(0, -0.06, 0);
const digPits = new THREE.InstancedMesh(pitGeo, new THREE.MeshStandardMaterial({
  color: 0x2b3446, roughness: 1, flatShading: true, emissive: 0x0a0e16, side: THREE.DoubleSide,
}), DIG_POOL);
digPits.frustumCulled = false; digPits.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(digPits);
// the spoil pile kicked out beside it
const moundGeo = new THREE.ConeGeometry(0.3, 0.16, 6);
const digMounds = new THREE.InstancedMesh(moundGeo, _sandMat, DIG_POOL);
digMounds.frustumCulled = false; digMounds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(digMounds);

{ const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < FOOT_POOL; i++) foot.setMatrixAt(i, hide);
  for (let i = 0; i < DIG_POOL; i++) { digHoles.setMatrixAt(i, hide); digPits.setMatrixAt(i, hide); digMounds.setMatrixAt(i, hide); } }

// A print stamped on dry sand can be reached by the tide a few seconds later.
// inWater() only gates the stamp; this discards any decal fragment currently
// seaward of the live shoreline, so the surf washes prints and holes away as
// it comes up and they're back when it draws down. Same clip the ocean and
// the beached debris use.
for (const dm of [foot, digHoles, digPits]) clipAtShore(dm.material);
digMounds.material = digMounds.material.clone();   // shared with nothing else, but be sure
clipAtShore(digMounds.material);

const _fm = new THREE.Matrix4(), _fq = new THREE.Quaternion(), _fe = new THREE.Euler(), _fs = new THREE.Vector3();
let footIdx = 0, footSide = 1, digIdx = 0;
const lastFootPos = new THREE.Vector3();
function stampFoot(x, z, fwdX, fwdZ, side) {
  if (inWater(x, z)) return;                 // prints don't hold on water
  _fe.set(0, Math.atan2(fwdX, fwdZ) + Math.PI, 0);
  _fq.setFromEuler(_fe);
  const off = 0.14 * side;
  // negative x-scale mirrors the texture, so one foot is the other's reflection
  _fs.set((0.92 + Math.random() * 0.16) * side, 1, 1.0 + Math.random() * 0.2);
  _fm.compose(new THREE.Vector3(x + (-fwdZ) * off, 0.03, z + fwdX * off), _fq, _fs);
  foot.setMatrixAt(footIdx, _fm);
  footIdx = (footIdx + 1) % FOOT_POOL;
  foot.instanceMatrix.needsUpdate = true;
}
function stampDigHole(x, z, fwdX = 0, fwdZ = -1) {
  if (inWater(x, z)) return;                 // no crater on the water — digImpact() splashes instead
  const yaw = Math.random() * Math.PI;
  const sc = 0.9 + Math.random() * 0.4;
  _fe.set(0, yaw, 0); _fq.setFromEuler(_fe);
  // surface scrape decal
  _fs.set(sc * (0.95 + Math.random() * 0.2), 1, sc * (0.95 + Math.random() * 0.2));
  _fm.compose(new THREE.Vector3(x, 0.03, z), _fq, _fs);
  digHoles.setMatrixAt(digIdx, _fm);
  // 3D pit sunk in
  _fe.set(0, yaw, 0); _fq.setFromEuler(_fe);
  _fs.set(sc, 0.8 + Math.random() * 0.5, sc);
  _fm.compose(new THREE.Vector3(x, 0.02, z), _fq, _fs);
  digPits.setMatrixAt(digIdx, _fm);
  // spoil mound flung a little past the pit, away from the digger
  const mx = x + fwdX * (0.42 + Math.random() * 0.15) + (Math.random() - 0.5) * 0.15;
  const mz = z + fwdZ * (0.42 + Math.random() * 0.15) + (Math.random() - 0.5) * 0.15;
  _fe.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
  _fq.setFromEuler(_fe);
  _fs.set(0.7 + Math.random() * 0.6, 0.6 + Math.random() * 0.6, 0.7 + Math.random() * 0.6);
  _fm.compose(new THREE.Vector3(mx, 0.02, mz), _fq, _fs);
  digMounds.setMatrixAt(digIdx, _fm);

  digIdx = (digIdx + 1) % DIG_POOL;
  digHoles.instanceMatrix.needsUpdate = true;
  digPits.instanceMatrix.needsUpdate = true;
  digMounds.instanceMatrix.needsUpdate = true;
}
{
  let side = 1;
  for (let i = 22; i >= 1; i--) { stampFoot(camera.position.x + Math.sin(i * 0.5) * 0.3, camera.position.z + i * 0.8, 0, -1, side); side = -side; }
  lastFootPos.set(camera.position.x, 0, camera.position.z);
}

// sand thrown up by the shovel — chunks (tumbling low-poly bits) + a fine haze
const PUFF_POOL = 120;
const puffGeo = new THREE.TetrahedronGeometry(1, 0);   // unit; scaled per instance
const puff = new THREE.InstancedMesh(
  puffGeo,
  new THREE.MeshStandardMaterial({ color: 0x94a0b6, roughness: 1, flatShading: true, emissive: 0x3c4658 }),
  PUFF_POOL
);
puff.frustumCulled = false; puff.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
puff.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PUFF_POOL * 3).fill(1), 3);
scene.add(puff);
const _pc = new THREE.Color();
const puffs = Array.from({ length: PUFF_POOL }, () => ({
  life: 0, ttl: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
  spin: new THREE.Vector3(), rot: new THREE.Euler(), sz: 1, settled: false,
}));
{ const hide = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < PUFF_POOL; i++) puff.setMatrixAt(i, hide); }
let puffIdx = 0;
function spawnPuffs(x, z, n, dirX = 0, dirZ = -1, y = 0.06, tint = null) {
  for (let i = 0; i < n; i++) {
    const idx = puffIdx;
    const p = puffs[idx];
    puffIdx = (puffIdx + 1) % PUFF_POOL;
    const fine = i % 3 === 0;
    p.ttl = p.life = fine ? 1.1 + Math.random() * 0.7 : 0.7 + Math.random() * 0.55;
    p.settled = false;
    p.sz = fine ? 0.7 + Math.random() * 0.7 : 2.2 + Math.random() * 2.6;
    p.pos.set(x + (Math.random() - 0.5) * 0.25, y, z + (Math.random() - 0.5) * 0.25);
    const spread = fine ? 2.2 : 3.4;
    const up = fine ? 4.5 + Math.random() * 3.5 : 4.0 + Math.random() * 4.5;
    p.vel.set(
      dirX * (1.4 + Math.random() * 2.4) + (Math.random() - 0.5) * spread,
      up,
      dirZ * (1.4 + Math.random() * 2.4) + (Math.random() - 0.5) * spread
    );
    p.spin.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18);
    p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    const shade = 0.55 + Math.random() * 0.5;          // some darker clods, some pale
    if (tint) _pc.setRGB(tint[0] * shade, tint[1] * shade, tint[2] * shade);
    else _pc.setRGB(shade, shade, shade * 1.05);
    puff.setColorAt(idx, _pc);
  }
  puff.instanceColor.needsUpdate = true;
}
const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _ps = new THREE.Vector3();
function updatePuffs(dt) {
  let any = false;
  for (let i = 0; i < PUFF_POOL; i++) {
    const p = puffs[i];
    if (p.life <= 0) continue;
    any = true;
    p.life -= dt;
    if (!p.settled) {
      p.vel.y -= 13 * dt;
      p.vel.x *= (1 - Math.min(1, 0.5 * dt));            // light air drag on the horizontal
      p.vel.z *= (1 - Math.min(1, 0.5 * dt));
      p.pos.addScaledVector(p.vel, dt);
      p.rot.x += p.spin.x * dt; p.rot.y += p.spin.y * dt; p.rot.z += p.spin.z * dt;
      if (p.pos.y <= 0.03) {
        p.pos.y = 0.03; p.settled = true;
        p.vel.set(0, 0, 0); p.spin.set(0, 0, 0);
        p.life = Math.min(p.life, 0.28);
      }
    }
    const k = p.life / p.ttl;
    const grow = p.settled ? Math.max(0.001, k * 3) : (0.5 + 0.5 * Math.min(1, k * 4));
    const sc = p.sz * 0.055 * grow;        // ~0.03–0.25 m clods
    _pq.setFromEuler(p.rot);
    _pm.compose(p.pos, _pq, _ps.set(sc, sc, sc));
    puff.setMatrixAt(i, _pm);
    if (p.life <= 0) puff.setMatrixAt(i, _pm.makeScale(0, 0, 0));
  }
  if (any) puff.instanceMatrix.needsUpdate = true;
}

// water kicked up by wading / digging in the surf — pale droplets that
// arc up and fall back. Same pooled-instances pattern as the sand puffs.
const SPLASH_POOL = 110;
const splashGeo = new THREE.IcosahedronGeometry(1, 0);
const splash = new THREE.InstancedMesh(
  splashGeo,
  new THREE.MeshStandardMaterial({
    color: 0xd6e6f0, roughness: 0.35, metalness: 0, emissive: 0x4c728c,
    transparent: true, opacity: 0.92, flatShading: true,
  }),
  SPLASH_POOL
);
splash.frustumCulled = false; splash.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(splash);
const splashes = Array.from({ length: SPLASH_POOL }, () => ({
  life: 0, ttl: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), sz: 1, rot: new THREE.Euler(),
}));
{ const hide = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < SPLASH_POOL; i++) splash.setMatrixAt(i, hide); }
let splashIdx = 0;
function spawnSplash(x, z, n, dirX = 0, dirZ = 0, power = 1) {
  addRipple(x, z, Math.min(1.4, 0.5 + power * 0.7));
  for (let i = 0; i < n; i++) {
    const p = splashes[splashIdx];
    splashIdx = (splashIdx + 1) % SPLASH_POOL;
    p.ttl = p.life = 0.34 + Math.random() * 0.42;
    p.sz = (0.45 + Math.random() * 0.95) * (0.6 + power * 0.6);
    p.pos.set(x + (Math.random() - 0.5) * 0.35, 0.02 + Math.random() * 0.05, z + (Math.random() - 0.5) * 0.35);
    const out = 1.0 + Math.random() * 2.4;
    p.vel.set(
      dirX * 1.6 * power + (Math.random() - 0.5) * out,
      (2.4 + Math.random() * 3.4) * (0.55 + power * 0.55),
      dirZ * 1.6 * power + (Math.random() - 0.5) * out
    );
    p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
  }
}
const _spm = new THREE.Matrix4(), _spq = new THREE.Quaternion(), _sps = new THREE.Vector3();
function updateSplashes(dt) {
  let any = false;
  for (let i = 0; i < SPLASH_POOL; i++) {
    const p = splashes[i];
    if (p.life <= 0) continue;
    any = true;
    p.life -= dt;
    p.vel.y -= 16 * dt;
    p.pos.addScaledVector(p.vel, dt);
    p.rot.x += p.vel.x * dt * 3; p.rot.z += p.vel.z * dt * 3;
    if (p.pos.y <= 0.02) p.life = 0;
    const k = Math.max(0, p.life / p.ttl);
    const sc = p.sz * 0.055 * (0.35 + 0.65 * k);
    _spq.setFromEuler(p.rot);
    _spm.compose(p.pos, _spq, _sps.set(sc, sc * 1.7, sc));
    splash.setMatrixAt(i, _spm);
    if (p.life <= 0) splash.setMatrixAt(i, _spm.makeScale(0, 0, 0));
  }
  if (any) splash.instanceMatrix.needsUpdate = true;
}

// ------------------------------------------------------------------
// Ocean
// ------------------------------------------------------------------
const waveGLSL = `
  float oceanWave(vec2 p, float t){
    float w = 0.0;
    // long travelling swell — the motion you read far out to sea
    w += sin(p.x * 0.045 + p.y * 0.028 - t * 0.55) * 0.70;
    w += sin(p.x * 0.032 - p.y * 0.041 + t * 0.42) * 0.50;
    // steep mid waves — short wavelength + real amplitude so each triangle
    // tilts, which is what gives the faceted low-poly water its shape
    w += sin(p.x * 0.20 + p.y * 0.13 + t * 1.10) * 0.48;
    w += sin(p.x * 0.16 - p.y * 0.19 + t * 0.90) * 0.40;
    w += sin(p.y * 0.24 - p.x * 0.11 + t * 1.30) * 0.34;
    w += sin(p.x * 0.33 + p.y * 0.28 + t * 1.70) * 0.26;
    w += sin(p.y * 0.44 + p.x * 0.20 - t * 2.10) * 0.19;
    w += sin(p.x * 0.61 - p.y * 0.35 + t * 2.60) * 0.13;
    // a steeper set that stacks up as it nears the shore
    float build = smoothstep(-120.0, 4.0, p.x);
    w += sin(p.x * 0.50 - t * 2.30) * 0.16 * build;
    // ease down to the waterline so it meets the sand without a wall of water
    w *= smoothstep(0.5, -22.0, p.x);
    // short, sharp chop that lives right in the near band so the facets you
    // actually walk past have real relief (kept off the far water)
    float nearBand = smoothstep(-55.0, -2.0, p.x);
    w += sin(p.x * 0.62 + p.y * 0.44 - t * 3.0) * 0.12 * nearBand;
    w += sin(p.y * 0.78 - p.x * 0.36 + t * 2.5) * 0.09 * nearBand;
    return w;
  }
`;
const oceanGeo = new THREE.PlaneGeometry(2200, 2200, 240, 240);   // ~9 m facets
oceanGeo.rotateX(-Math.PI / 2);
const ocean = new THREE.Mesh(oceanGeo, new THREE.ShaderMaterial({
  fog: true, uniforms: oceanUniforms,
  extensions: { derivatives: true },        // dFdx/dFdy for the flat facet normal (WebGL1)
  vertexShader: `
    #include <fog_pars_vertex>
    uniform float uTime; uniform vec2 uOffset; varying vec3 vWorld;
    ${waveGLSL}
    void main() {
      vec3 p = position;
      vec2 wp = vec2(p.x, p.z) + uOffset;
      p.y += oceanWave(wp, uTime);
      vec4 world = modelMatrix * vec4(p, 1.0);
      vWorld = world.xyz;
      vec4 mvPosition = viewMatrix * world;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `,
  fragmentShader: `
    #include <fog_pars_fragment>
    uniform float uTime; uniform vec3 uCamPos; uniform vec3 uMoonDir;
    uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uCrest; uniform vec3 uSky;
    uniform vec4 uRipples[8];          // xz = origin, z = start time, w = strength
    varying vec3 vWorld;

    /* Rings spreading from anything that disturbed the surface. Done per
     * fragment rather than by displacing vertices: the ocean mesh has ~6 m
     * facets, so a 1 m ripple would fall straight through the tessellation
     * and never be drawn. Returns a crest factor to lift the colour with. */
    float rippleField(vec2 p, float t) {
      float total = 0.0;
      for (int i = 0; i < 8; i++) {
        vec4 r = uRipples[i];
        float age = t - r.z;
        if (age < 0.0 || age > 4.5 || r.w <= 0.0) continue;
        float d = distance(p, r.xy);
        float front = age * 1.9;                       // how far the ring has run
        float band = d - front;
        // a couple of trailing crests behind the leading edge
        float wave = sin(band * 4.2) * exp(-abs(band) * 0.85);
        float fade = exp(-age * 1.15) * exp(-d * 0.16);
        total += wave * fade * r.w;
      }
      return total;
    }
    ${noiseGLSL}
    ${shoreGLSL}
    ${waveGLSL}
    void main() {
      float shore = shoreLine(vWorld.z, uTime);
      if (vWorld.x > shore) discard;

      // one flat normal per rendered triangle — the low-poly water facet look
      vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
      if (n.y < 0.0) n = -n;

      vec3 viewDir = normalize(uCamPos - vWorld);
      float dist = shore - vWorld.x;                 // metres out from the waterline

      // shallow near the beach -> deep blue further out -> sky tint at the horizon
      float deepen = smoothstep(0.0, 190.0, dist);
      vec3 col = mix(uShallow, uDeep, deepen);
      col = mix(col, uSky, smoothstep(140.0, 520.0, dist));

      // facets catch the moon at different angles; fade the shading out at
      // distance, where the triangles go sub-pixel and would just sparkle
      float ndl = max(dot(n, normalize(uMoonDir)), 0.0);
      float facet = mix(1.0, 0.5 + 1.05 * ndl, smoothstep(340.0, 12.0, dist));
      col *= facet;

      // steep facets pick up a pale sky tint at grazing angles
      float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
      col += uSky * fres * 0.5;

      // tilted facets catch a pale edge — reads as low-poly wave faces
      float steep = clamp((1.0 - n.y) * 3.0, 0.0, 1.0);
      steep *= smoothstep(300.0, 8.0, dist);
      col = mix(col, uCrest, steep * 0.22);

      // crest highlight on the up-facing tops of the swell
      float wh = oceanWave(vec2(vWorld.x, vWorld.z), uTime);
      float crest = smoothstep(0.30, 0.80, wh) * smoothstep(0.55, 0.95, n.y);
      col = mix(col, uCrest, crest * 0.5);

      // moon glitter road
      vec3 hv = normalize(uMoonDir + viewDir);
      float spec = pow(max(dot(n, hv), 0.0), 60.0);
      vec3 moonFlat = normalize(vec3(uMoonDir.x, 0.0, uMoonDir.z));
      vec3 viewFlat = normalize(vec3(-viewDir.x, 0.0, -viewDir.z));
      float road = pow(max(dot(viewFlat, moonFlat), 0.0), 8.0);
      col += vec3(0.90, 0.94, 1.0) * spec * (0.15 + road * 1.4);
      col += vec3(0.26, 0.34, 0.50) * road * 0.14;

      // rings from anything moving through the water. Skipped beyond ~55 m:
      // they can't be read at that range and the loop is per-pixel over a
      // very large plane, which is what made the sea expensive.
      float camDist = distance(uCamPos.xz, vWorld.xz);
      float rip = camDist < 55.0 ? rippleField(vec2(vWorld.x, vWorld.z), uTime) : 0.0;
      col = mix(col, uCrest, clamp(rip * 0.30, 0.0, 0.26));
      col += vec3(0.05, 0.07, 0.09) * max(rip, 0.0);
      // the moon just catches the leading edge
      col += vec3(0.34, 0.40, 0.48) * pow(max(rip, 0.0), 3.0) * 0.16;

      // shoreline foam / swash lace
      float band = smoothstep(3.5, 0.0, dist) * smoothstep(-1.8, 0.5, dist);
      float fizz = 0.5 + 0.5 * sin(vWorld.z * 3.1 + uTime * 9.0) * sin(vWorld.z * 1.3 - uTime * 5.0);
      col = mix(col, vec3(0.78, 0.85, 0.92), clamp(band * fizz, 0.0, 0.85));
      float lace = smoothstep(0.0, 1.5, dist) * smoothstep(5.0, 1.5, dist);
      col += vec3(0.16) * lace * (0.35 + 0.65 * bwNoise(vWorld.z * 2.0 + uTime * 1.5));

      gl_FragColor = vec4(col, 1.0);
      #include <fog_fragment>
    }
  `,
}));
ocean.position.y = OCEAN_Y;
ocean.frustumCulled = false;
scene.add(ocean);

// ------------------------------------------------------------------
// DOM refs + state
// ------------------------------------------------------------------
const overlay = document.getElementById('overlay');
const crosshair = document.getElementById('crosshair');
const promptEl = document.getElementById('prompt');
const noteEl = document.getElementById('note');
const noteText = document.getElementById('note-text');
const hotbarEl = document.getElementById('hotbar');
const menuEl = document.getElementById('menu');
const endEl = document.getElementById('end');
const staminaEl = document.getElementById('stamina');
const staminaFill = document.getElementById('stamina-fill');
const dialogEl = document.getElementById('dialog');
const dialogSpeakerEl = document.getElementById('dialog-speaker');
const dialogTextEl = document.getElementById('dialog-text');
const dialogChoicesEl = document.getElementById('dialog-choices');
const hurtEl = document.getElementById('hurt');
const deathEl = document.getElementById('death');
const bloodEl = document.getElementById('blood');
const bloodAmtEl = document.getElementById('blood-amt');
const bloodJarEl = document.getElementById('blood-jar');

// blue blood you've drawn. The HUD stays hidden until the first extraction.
const BLOOD_PER_CRAB = 120;        // mL out of one horseshoe crab
const BLOOD_JAR_CAP = 140;         // mL the jar gauge reads full at
let bloodAmount = 0, bloodSeen = false;

let started = false, locked = false, fallbackLook = false, dragging = false;
let noteOpen = false, menuOpen = false, ended = false, introDone = false;
let dialogOpen = false, invOpen = false, inspecting = false;
let menuReturnLock = false, noteReturnLock = false, packReturnLock = false, inspectReturnLock = false;
const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');

// ------------------------------------------------------------------
// Player health — three hits and the walk starts over
// ------------------------------------------------------------------
const MAX_HP = 3;
const HURT_FADE = 1.1;                 // seconds for the red to bleed off
let hp = MAX_HP, hurtFlash = 0, dying = false;
function damagePlayer(n = 1) {
  if (dying || ended || !introDone) return;
  hp -= n;
  hurtFlash = 1;
  sfxHurt();
  addTrauma(0.7);
  hitstop = 0.05;       // ~3 frames
  // shoved back off whatever hit you
  if (crabState && crabState.alive) {
    const kx = camera.position.x - crab.position.x, kz = camera.position.z - crab.position.z;
    const kd = Math.hypot(kx, kz) || 1;
    knockback.set((kx / kd) * 5.5, 0, (kz / kd) * 5.5);
  }
  if (hp <= 0) playerDied();
}
function playerDied() {
  if (dying) return;
  dying = true;
  if (locked) document.exitPointerLock();
  if (held) dropHeld();
  endDialog();
  deathEl.classList.add('show');
  refreshUI();
  // come back at the title, but don't sit through the opening card again
  setTimeout(() => {
    try { sessionStorage.setItem('beachwalk.skipIntro', '1'); } catch (e) {}
    location.reload();
  }, 1600);
}
function updateHurt(dt) {
  if (hurtFlash <= 0) return;
  hurtFlash = Math.max(0, hurtFlash - dt / HURT_FADE);
  // ease out so the spike is sharp and the tail is soft
  hurtEl.style.opacity = String(hurtFlash * hurtFlash);
}

function frozen() { return noteOpen || menuOpen || dialogOpen || invOpen || inspecting || dying || ended || !introDone; }
function refreshUI() {
  const playing = started && !menuOpen && !noteOpen && !dialogOpen && !invOpen && !inspecting && !dying && !ended;
  hotbarEl.classList.toggle('hidden', !playing || inventory.length === 0);
  bloodEl.classList.toggle('show', bloodSeen && playing);
}

// ------------------------------------------------------------------
// Pointer lock
// ------------------------------------------------------------------
// Browsers impose a ~1.25 s cooldown before pointer lock can be re-acquired
// after an exit. Re-locking after closing the note used to fail inside that
// window and drop us into drag-to-look (mouse "stops working"). So: only fall
// back to drag-look if we have NEVER locked, and otherwise retry patiently.
let everLocked = false;
let lockRetry = 0;
let lockTimer = null;
function requestLock() {
  if (locked || fallbackLook) return;
  clearTimeout(lockTimer);
  const p = renderer.domElement.requestPointerLock && renderer.domElement.requestPointerLock();
  if (p && p.catch) p.catch(() => scheduleLockRetry());
  lockTimer = setTimeout(() => {
    if (locked) return;
    if (everLocked) scheduleLockRetry();
    else enterFallback();
  }, 400);
}
function scheduleLockRetry() {
  if (locked || fallbackLook || frozen()) return;
  if (!everLocked) { enterFallback(); return; }
  if (lockRetry++ > 6) return;              // give up quietly; a click re-locks
  clearTimeout(lockTimer);
  lockTimer = setTimeout(() => { lockRetry = 0; requestLock(); }, 550);
}
document.addEventListener('pointerlockerror', () => {
  if (everLocked) scheduleLockRetry(); else enterFallback();
});
function enterFallback() {
  if (fallbackLook || locked) return;
  fallbackLook = true; started = true;
  lookEuler.setFromQuaternion(camera.quaternion);
  overlay.classList.add('hidden');
  refreshUI();
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  if (locked) {
    everLocked = true; lockRetry = 0; clearTimeout(lockTimer);
    started = true; overlay.classList.add('hidden'); refreshUI();
  } else {
    if (fallbackLook || ended) return;
    if (!started) { overlay.classList.remove('hidden'); return; }
    // an intentional exit (note / menu / dialogue / death) is handled by
    // those; a stray exit while still playing means the user hit Esc → menu
    if (!menuOpen && !noteOpen && !dialogOpen && !invOpen && !inspecting && !dying) openMenu();
  }
});
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && String(e.reason.name || '').includes('Document')) { enterFallback(); e.preventDefault(); }
});
function applyLook(dx, dy) {
  const s = 0.0022 * settings.sensitivity;
  lookEuler.setFromQuaternion(camera.quaternion);
  lookEuler.y -= dx * s;
  lookEuler.x -= dy * s * (settings.invertY ? -1 : 1);
  lookEuler.x = Math.max(-HALF_PI, Math.min(HALF_PI, lookEuler.x));
  camera.quaternion.setFromEuler(lookEuler);
}
document.addEventListener('mousemove', (e) => { if (locked && !frozen()) applyLook(e.movementX, e.movementY); });
window.addEventListener('pointermove', (e) => { if (fallbackLook && dragging && !frozen()) applyLook(e.movementX, e.movementY); });

// ------------------------------------------------------------------
// Opening sequence — black card, the line fades in and out, then the
// world fades up and the music swells for a while
// ------------------------------------------------------------------
const introEl = document.getElementById('intro');
const introTextEl = document.getElementById('intro-text');
const INTRO_LINE = 'You are alone on the shore.\nIt is well past midnight.\nThe tide keeps its own counsel.';
let introStarted = false;

// coming back from a death: straight into the walk, no opening card
let skipIntro = false;
try {
  skipIntro = sessionStorage.getItem('beachwalk.skipIntro') === '1';
  if (skipIntro) sessionStorage.removeItem('beachwalk.skipIntro');
} catch (e) {}

function beginGame() {
  if (introStarted) return;
  introStarted = true;
  startAmbientAudio();      // usually already running from the title card
  startMusic();                                    // swell it in from the moment you spawn
  requestLock();                                   // must fire on the click gesture
  overlay.classList.add('hidden');

  if (skipIntro) {
    introDone = true;
    for (const k in keys) keys[k] = false;
    clock.getDelta();
    if (!locked && !fallbackLook) enterFallback();
    return;
  }

  // Snap to black on the same frame the title leaves, so the world is never
  // glimpsed underneath — the card only *fades* on the way back out.
  introTextEl.textContent = INTRO_LINE;
  introEl.style.transition = 'none';
  introEl.classList.add('show');
  void introEl.offsetWidth;                        // commit before re-arming
  setTimeout(() => introEl.classList.add('text-in'), 600);    // line fades in
  setTimeout(() => introEl.classList.remove('text-in'), 600 + 2200 + 3200); // holds, fades out
  const revealAt = 600 + 2200 + 3200 + 2200;
  setTimeout(() => {
    introEl.style.transition = 'opacity 2.4s ease';
    introEl.classList.remove('show');              // world fades up
    introDone = true;
    for (const k in keys) keys[k] = false;
    clock.getDelta();                              // drop the big first-frame dt
    if (!locked && !fallbackLook) enterFallback();
  }, revealAt);
}
overlay.addEventListener('click', beginGame);
/* Surf under the title card. Browsers won't let an AudioContext start
 * without a gesture, so we arm it on the first move or key the player makes
 * over the menu and let the sea come up behind the title. */
function primeMenuAudio() {
  if (audioStarted) { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); return; }
  startAmbientAudio();
  // Safari in particular starts the context suspended even when it was
  // created inside the gesture, so it has to be resumed explicitly.
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
// pointermove is NOT a user gesture, so it can't unlock audio — only a real
// press or key can. That's why the surf never came up under the title.
for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
  window.addEventListener(ev, primeMenuAudio, { passive: true });
}

const keys = Object.create(null);
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Tab') e.preventDefault();   // never let focus walk the page
  if (!introDone) return;
  if (e.code === 'Tab') {
    if (ended || dying || inspecting) return;
    if (invOpen) closePack();
    else if (!menuOpen && !noteOpen && !dialogOpen) openPack();
    return;
  }
  if (e.code === 'Escape') {
    if (ended) return;
    if (inspecting) closeInspect();
    else if (invOpen) closePack();
    else if (dialogOpen) endDialog();
    else if (noteOpen) closeNote();
    else if (menuOpen) closeMenu();
    else if (fallbackLook) openMenu();
  } else if (e.code === 'KeyE' || e.code === 'KeyF') { primaryAction(); }
  else if (e.code === 'KeyG') { if (held) dropHeld(); else if (equipped) dropEquipped(); }
  else if (e.code === 'KeyQ') { if (inspecting) closeInspect(); else if (equipped) toggleEquip(equipped); }
  else if (/^Digit[1-6]$/.test(e.code)) { useSlot(+e.code.slice(5) - 1); }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

let downPos = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  downPos = [e.clientX, e.clientY];
  if (fallbackLook) dragging = true;
  // right button hauls the shovel back; it swings when you let go
  if (e.button === 2 && started && !frozen()) startWind();
});
window.addEventListener('pointerup', (e) => {
  dragging = false;
  if (e.button === 2) releaseWind();
});
// losing the window mid-wind shouldn't leave the shovel stuck over your head
window.addEventListener('blur', () => { if (winding) releaseWind(); });
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
renderer.domElement.addEventListener('click', (e) => {
  const d = downPos ? Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) : 0;
  if (d >= 6) return;
  // if we lost the lock (browser cooldown, stray Esc), a click takes it back
  if (started && !locked && !fallbackLook && !frozen()) { lockRetry = 0; requestLock(); return; }
  primaryAction();
});

// ------------------------------------------------------------------
// Settings menu
// ------------------------------------------------------------------
const S_FOV = document.getElementById('s-fov');
const S_SENS = document.getElementById('s-sens');
const S_BRIGHT = document.getElementById('s-bright');
const S_VOL = document.getElementById('s-vol');
const S_WAVE = document.getElementById('s-wave');
const S_SFX = document.getElementById('s-sfx');
const S_MUSIC = document.getElementById('s-music');
const S_SPEED = document.getElementById('s-speed');
const S_INVERT = document.getElementById('s-invert');
function applySettings() {
  camera.fov = settings.fov;
  camera.updateProjectionMatrix();
  renderer.toneMappingExposure = settings.brightness;
  if (masterGain && audioCtx) masterGain.gain.setTargetAtTime(settings.volume, audioCtx.currentTime, 0.05);
  if (musicVolGain && audioCtx) musicVolGain.gain.setTargetAtTime(settings.volume * settings.musicVolume, audioCtx.currentTime, 0.05);
  if (lhGain && audioCtx) lhGain.gain.setTargetAtTime(settings.volume * settings.musicVolume * LH_TRACK_LEVEL, audioCtx.currentTime, 0.05);
  if (waveBusGain && audioCtx) waveBusGain.gain.setTargetAtTime(settings.waveVolume, audioCtx.currentTime, 0.05);
  if (sfxBusGain && audioCtx) sfxBusGain.gain.setTargetAtTime(settings.sfxVolume, audioCtx.currentTime, 0.05);
  document.getElementById('v-fov').textContent = settings.fov;
  document.getElementById('v-sens').textContent = settings.sensitivity.toFixed(2);
  document.getElementById('v-bright').textContent = settings.brightness.toFixed(2);
  document.getElementById('v-vol').textContent = Math.round(settings.volume * 100) + '%';
  document.getElementById('v-music').textContent = Math.round(settings.musicVolume * 100) + '%';
  document.getElementById('v-wave').textContent = Math.round(settings.waveVolume * 100) + '%';
  document.getElementById('v-sfx').textContent = Math.round(settings.sfxVolume * 100) + '%';
  document.getElementById('v-speed').textContent = settings.walkSpeed.toFixed(1) + '×';
}
function syncMenuInputs() {
  S_FOV.value = settings.fov; S_SENS.value = settings.sensitivity;
  S_BRIGHT.value = settings.brightness; S_VOL.value = settings.volume;
  S_MUSIC.value = settings.musicVolume;
  S_WAVE.value = settings.waveVolume; S_SFX.value = settings.sfxVolume; S_SPEED.value = settings.walkSpeed;
  S_INVERT.checked = settings.invertY;
}
S_FOV.addEventListener('input', () => { settings.fov = +S_FOV.value; applySettings(); saveSettings(); });
S_SENS.addEventListener('input', () => { settings.sensitivity = +S_SENS.value; applySettings(); saveSettings(); });
S_BRIGHT.addEventListener('input', () => { settings.brightness = +S_BRIGHT.value; applySettings(); saveSettings(); });
S_VOL.addEventListener('input', () => { settings.volume = +S_VOL.value; applySettings(); saveSettings(); });
S_WAVE.addEventListener('input', () => { settings.waveVolume = +S_WAVE.value; applySettings(); saveSettings(); });
S_SFX.addEventListener('input', () => { settings.sfxVolume = +S_SFX.value; applySettings(); saveSettings(); });
S_MUSIC.addEventListener('input', () => { settings.musicVolume = +S_MUSIC.value; applySettings(); saveSettings(); });
S_SPEED.addEventListener('input', () => { settings.walkSpeed = +S_SPEED.value; applySettings(); saveSettings(); });
S_INVERT.addEventListener('change', () => { settings.invertY = S_INVERT.checked; saveSettings(); });
document.getElementById('m-resume').addEventListener('click', closeMenu);
applySettings();
syncMenuInputs();

function openMenu() {
  if (ended || menuOpen) return;
  menuOpen = true;
  menuReturnLock = !fallbackLook && started;
  if (locked) document.exitPointerLock();
  if (held) dropHeld();
  syncMenuInputs();
  menuEl.classList.add('show');
  refreshUI();
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  menuEl.classList.remove('show');
  refreshUI();
  if (menuReturnLock) requestLock();
}

// ------------------------------------------------------------------
// Note
// ------------------------------------------------------------------
function openNote(text) {
  noteOpen = true;
  noteText.textContent = text;
  noteEl.classList.add('show');
  promptEl.classList.remove('show');
  crosshair.className = '';
  noteReturnLock = locked;
  if (locked) document.exitPointerLock();
  refreshUI();
}
function closeNote() {
  noteOpen = false;
  noteEl.classList.remove('show');
  refreshUI();
  if (noteReturnLock && !fallbackLook) requestLock();
}
noteEl.addEventListener('click', closeNote);

// ------------------------------------------------------------------
// Item inspect view — a held object floating in the dark that you
// drag to turn over (to look at its underside). Rendered as its own
// little scene on top of everything, like the first-person hand.
// ------------------------------------------------------------------
const inspectEl = document.getElementById('inspect');
const INSPECT_HINT = 'Hold right-click to turn it over  ·  scroll to zoom  ·  click to put it away';
const inspectScene = new THREE.Scene();
inspectScene.background = new THREE.Color(0x05070e);
const inspectCamera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
inspectCamera.position.set(0, 0, 3.3);
inspectScene.add(new THREE.AmbientLight(0x9fb0cc, 1.05));
{
  const key = new THREE.DirectionalLight(0xfff0d8, 2.1); key.position.set(-0.7, 1.2, 1.0); inspectScene.add(key);
  const fill = new THREE.DirectionalLight(0x8aa2d6, 0.9); fill.position.set(1.2, -0.4, 0.7); inspectScene.add(fill);
  const rim = new THREE.DirectionalLight(0xc6d6f2, 1.1); rim.position.set(0.2, -1.0, -1.1); inspectScene.add(rim);
  inspectScene.add(new THREE.HemisphereLight(0x4a5e80, 0x141820, 0.6));
}
const inspectPivot = new THREE.Group();      // spun by the drag
inspectScene.add(inspectPivot);
const inspectFit = new THREE.Group();        // holds the model, centred + scaled to frame
inspectPivot.add(inspectFit);

let inspectModel = null, inspectRotX = 0, inspectRotY = 0, inspectDist = 3.3, inspectAuto = 0;

function inspectSetModel(model) {
  if (inspectModel === model) return;
  if (inspectModel) inspectFit.remove(inspectModel);
  inspectModel = model;
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.setScalar(1);
  inspectPivot.rotation.set(0, 0, 0);
  inspectFit.position.set(0, 0, 0);
  inspectFit.scale.setScalar(1);
  inspectFit.add(model);
  inspectFit.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const k = 1.7 / (Math.max(size.x, size.y, size.z) || 1);
  inspectFit.scale.setScalar(k);
  inspectFit.position.copy(centre).multiplyScalar(-k);
}
function openInspect(model, { rotX = -0.55, rotY = 0.7 } = {}) {
  if (inspecting) return;
  inspecting = true;
  inspectSetModel(model);
  inspectRotX = rotX; inspectRotY = rotY; inspectDist = 3.3; inspectAuto = 0;
  inspectCamera.aspect = window.innerWidth / window.innerHeight;
  inspectCamera.updateProjectionMatrix();
  inspectEl.classList.add('show');
  promptEl.classList.remove('show');
  crosshair.className = '';
  crosshair.style.display = 'none';
  inspectReturnLock = locked;
  if (locked) document.exitPointerLock();
  refreshUI();
}
function closeInspect() {
  if (!inspecting || extracting) return;             // can't bail mid-draw
  inspecting = false;
  inspectEl.classList.remove('show');
  inspectEl.querySelector('.hint').textContent = 'Drag to turn it over  ·  scroll to zoom  ·  Esc to put it away';
  crosshair.style.display = '';
  refreshUI();
  if (inspectReturnLock && !fallbackLook) requestLock();
}
// Hold the RIGHT button to turn the object over; the LEFT button puts it
// away. Keeping the two on separate buttons means you can never spin the
// thing by accident while trying to leave, or leave while trying to spin.
{
  let idrag = false, lastX = 0, lastY = 0;
  inspectEl.addEventListener('contextmenu', (e) => e.preventDefault());
  inspectEl.addEventListener('pointerdown', (e) => {
    if (e.button === 2) {
      e.preventDefault();
      idrag = true; lastX = e.clientX; lastY = e.clientY; inspectAuto = 0;
      inspectEl.classList.add('dragging');
      inspectEl.setPointerCapture(e.pointerId);
    }
  });
  inspectEl.addEventListener('pointermove', (e) => {
    if (!idrag) return;
    inspectRotY += (e.clientX - lastX) * 0.01;
    inspectRotX += (e.clientY - lastY) * 0.01;
    inspectRotX = Math.max(-Math.PI, Math.min(Math.PI, inspectRotX));
    lastX = e.clientX; lastY = e.clientY;
  });
  const endDrag = (e) => {
    if (!idrag) return;
    idrag = false;
    inspectEl.classList.remove('dragging');
    if (e.pointerId != null && inspectEl.hasPointerCapture(e.pointerId)) inspectEl.releasePointerCapture(e.pointerId);
  };
  inspectEl.addEventListener('pointerup', (e) => {
    if (e.button === 2) { endDrag(e); return; }
    if (e.button === 0 && !idrag) closeInspect();          // left click = put it away
  });
  inspectEl.addEventListener('pointercancel', endDrag);
  inspectEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    inspectDist = Math.max(2.0, Math.min(7, inspectDist + e.deltaY * 0.003));
  }, { passive: false });
}
function updateInspect(dt) {
  if (!inspecting) return;
  if (extracting) {
    extractT = Math.min(1, extractT + dt / 3.4);
    driveExtraction(extractT);
    if (extractT >= 1) finishExtraction();
  }
  inspectAuto += dt;
  const idle = inspectAuto > 1.2 ? (inspectAuto - 1.2) * 0.2 : 0;   // a slow drift once you let go
  inspectPivot.rotation.set(inspectRotX, inspectRotY + idle, 0);
  inspectCamera.position.z = inspectDist;
  inspectCamera.lookAt(0, 0, 0);
}

// ------------------------------------------------------------------
// Interaction
// ------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
raycaster.far = REACH;
const interactables = [];
let hovered = null;
function addInteractable(root, label, kind, data) {
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  interactables.push({ root, label, kind, meshes, ...data });
}
function removeInteractable(root) {
  const i = interactables.findIndex((it) => it.root === root);
  if (i >= 0) interactables.splice(i, 1);
}
const kbd = (k) => `<span class="key">${k}</span>`;
let promptHTML = '';
function setPrompt(html) {
  if (html === promptHTML) return;
  promptHTML = html;
  promptEl.innerHTML = html;
  promptEl.classList.toggle('show', !!html);
}
function updateHover() {
  if (frozen() || (!locked && !fallbackLook)) {
    hovered = null; crosshair.className = ''; setPrompt(''); return;
  }
  if (held) {
    hovered = null; crosshair.className = 'holding';
    setPrompt(kbd('LMB') + 'Throw &nbsp;&nbsp; ' + kbd('G') + 'Drop');
    return;
  }
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  let best = null, bestD = Infinity;
  for (const it of interactables) {
    if (!it.root.parent) continue;
    if (it.prop && it.prop.held) continue;
    const hits = raycaster.intersectObjects(it.meshes, false);
    if (hits.length && hits[0].distance < bestD) { bestD = hits[0].distance; best = it; }
  }
  hovered = best;
  if (best) {
    crosshair.className = 'active';
    setPrompt(kbd('E') + best.label);
  } else if (equipped && equipped.onListen && !listening) {
    crosshair.className = 'active';
    setPrompt(kbd('LMB') + 'Hold it to your ear');
  } else if (equipped && equipped.onDig && digT <= 0 && crosshairGroundPoint()) {
    const onMound = !inWater(_digHit.x, _digHit.z) && moundAt(_digHit.x, _digHit.z);
    crosshair.className = 'active';
    setPrompt(kbd('LMB') + (onMound ? 'Dig up the mound' : 'Dig here')
      + ' &nbsp;&nbsp; ' + kbd('RMB') + 'Hold to wind up'
      + ' &nbsp;&nbsp; ' + kbd('G') + 'Drop');
  } else if (equipped) {
    crosshair.className = '';
    setPrompt(kbd('G') + 'Drop ' + equipped.name.toLowerCase());
  } else {
    crosshair.className = '';
    setPrompt('');
  }
}
function primaryAction() {
  if (frozen()) return;
  if (held) { throwHeld(); return; }
  if (hovered) {
    if (hovered.kind === 'physics') grab(hovered.prop);
    else if (hovered.onActivate) hovered.onActivate();
    return;
  }
  if (equipped && equipped.onListen) { listenToShell(); return; }
  if (equipped && equipped.onDig && digT <= 0) startDig();
}

// ------------------------------------------------------------------
// Mini physics
// ------------------------------------------------------------------
const GRAV = 11;
const physProps = [];
let held = null;
const _pv = new THREE.Vector3(), _pt = new THREE.Vector3(), _pf = new THREE.Vector3();
class PhysProp {
  constructor(mesh, opts = {}) {
    this.mesh = mesh;
    this.vel = new THREE.Vector3();
    this.angVel = new THREE.Vector3();
    this.radius = opts.radius ?? 0.3;
    this.restH = opts.restH ?? this.radius;
    this.bounce = opts.bounce ?? 0.32;
    this.friction = opts.friction ?? 0.78;
    this.holdDist = opts.holdDist ?? Math.max(1.15, this.radius + 0.9);
    this.held = false;
    physProps.push(this);
  }
  step(dt) {
    if (this.dead) return;
    const p = this.mesh.position;
    if (this.held) {
      camera.getWorldPosition(_pv);
      camera.getWorldDirection(_pf);
      _pt.copy(_pv).addScaledVector(_pf, this.holdDist);
      _pt.x = THREE.MathUtils.clamp(_pt.x, WADE_X + this.radius, CLIFF_BLOCK_X - this.radius);
      _pt.y = Math.max(_pt.y, this.restH);
      this.vel.subVectors(_pt, p).multiplyScalar(13);
      if (this.vel.length() > 24) this.vel.setLength(24);
      p.addScaledVector(this.vel, dt);
      this.angVel.multiplyScalar(1 - Math.min(1, 8 * dt));
      return;
    }
    this.vel.y -= GRAV * dt;
    p.addScaledVector(this.vel, dt);
    const incoming = this.vel.length();          // speed going into any contact
    let struck = false;
    // things dropped in the sea settle under the surface, not on it
    const sub = submersionAt(p.x, p.z);
    const rest = this.restH + restYInWater(p.x, p.z, this.radius * 0.6);
    if (p.y <= rest) {
      p.y = rest;
      if (this.vel.y < 0) this.vel.y = -this.vel.y * (this.bounce * (1 - sub * 0.9));
      if (Math.abs(this.vel.y) < 0.7) this.vel.y = 0;
      const fr = this.friction * (1 - sub * 0.45);       // water drags on it
      this.vel.x *= fr; this.vel.z *= fr;
      this.angVel.multiplyScalar(0.86 - sub * 0.26);
      struck = true;
    }
    const lo = WADE_X + this.radius, hi = CLIFF_BLOCK_X - this.radius;
    if (p.x < lo) { p.x = lo; this.vel.x = Math.abs(this.vel.x) * this.bounce; struck = true; }
    if (p.x > hi) { p.x = hi; this.vel.x = -Math.abs(this.vel.x) * this.bounce; struck = true; }
    if (struck && this.onImpact) this.onImpact(incoming);
    if (this.dead) return;
    this.mesh.rotation.x += this.angVel.x * dt;
    this.mesh.rotation.y += this.angVel.y * dt;
    this.mesh.rotation.z += this.angVel.z * dt;
    this.angVel.multiplyScalar(1 - Math.min(1, 0.35 * dt));
  }
}
function grab(prop) {
  if (held) dropHeld();
  held = prop; prop.held = true; hovered = null;
  sfxThud(0.03);
}
function dropHeld() {
  if (!held) return;
  held.held = false; held.vel.multiplyScalar(0.3); held = null;
}
// Drop the equipped inventory item onto the sand in front of you. It builds
// a world model from the item's own factory (worldFactory) or, failing that,
// a clone of its viewmodel, registers a fresh 'take it back' interactable,
// and pulls the item out of the pack. Picking it up re-adds and re-equips.
const _dropDir = new THREE.Vector3();
function dropEquipped() {
  const item = equipped;
  if (!item) return;
  let m = null;
  if (item.worldFactory) {
    m = item.worldFactory();
  } else if (item.viewmodel) {
    m = item.viewmodel.clone(true);
    m.traverse((o) => { o.visible = true; });
    m.scale.multiplyScalar(item.dropScale || 1);
  } else {
    // a use-item with no world model (note, jar, buried thing) — drop it as a
    // small wrapped parcel so it still leaves the pack and can be picked back up
    m = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.11, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x6a6256, roughness: 1, flatShading: true, emissive: 0x1c1a15 }));
    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.12, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x2e2a22, roughness: 1, flatShading: true, emissive: 0x0c0b08 }));
    box.castShadow = false; m.add(box, tie);
  }
  if (!m) return;
  camera.getWorldDirection(_dropDir); _dropDir.y = 0;
  if (_dropDir.lengthSq() < 1e-4) _dropDir.set(0, 0, -1); else _dropDir.normalize();
  const dx = THREE.MathUtils.clamp(camera.position.x + _dropDir.x * 1.1, WADE_X + 0.4, CLIFF_BLOCK_X - 0.4);
  const dz = camera.position.z + _dropDir.z * 1.1;
  m.position.set(dx, 0.04, dz);
  m.rotation.y = Math.random() * Math.PI * 2;
  scene.add(m);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy'; m.add(hit);
  removeFromInventory(item);
  addInteractable(m, 'Take the ' + item.name.toLowerCase(), 'inventory', {
    onActivate: () => {
      scene.remove(m); removeInteractable(m); hovered = null;
      sfxThud(0.02);
      addToInventory(item);
      if (item.viewmodel) toggleEquip(item);
    },
  });
  sfxThud(0.03);
}
function throwHeld() {
  if (!held) return;
  camera.getWorldDirection(_pf);
  held.held = false;
  held.vel.copy(_pf).multiplyScalar(12).add(new THREE.Vector3(0, 1.6, 0));
  held.angVel.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
  held = null;
  sfxThud(0.05);
}
function makeProp(mesh, name, opts) {
  mesh.frustumCulled = false;
  scene.add(mesh);
  const prop = new PhysProp(mesh, opts);
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.4, prop.radius * 1.25), 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  proxy.name = 'hitProxy';
  mesh.add(proxy);
  addInteractable(mesh, 'Pick up ' + name, 'physics', { prop });
  return prop;
}
{
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4c3a, roughness: 1, flatShading: true, emissive: 0x120e08 });
  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.3), woodMat);
  plank.position.set(5.5, 0.09, -4); plank.rotation.y = 0.7;
  makeProp(plank, 'driftwood', { radius: 0.4, restH: 0.09, bounce: 0.2 });

  const pail = new THREE.Group();
  const rust = new THREE.MeshStandardMaterial({ color: 0x6b5a4a, roughness: 0.9, metalness: 0.25, flatShading: true, emissive: 0x140f0a });
  pail.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.32, 14, 1, true), rust));
  const btm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 14), rust); btm.position.y = -0.145; pail.add(btm);
  pail.position.set(3, 0.17, -16);
  makeProp(pail, 'pail', { radius: 0.22, restH: 0.17 });

  const float = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0x2f6f5c, roughness: 0.25, transparent: true, opacity: 0.7, emissive: 0x0c2b22 }));
  float.position.set(6.5, 0.24, -22);
  makeProp(float, 'glass float', { radius: 0.24, restH: 0.24, bounce: 0.5 });

  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0),
    new THREE.MeshStandardMaterial({ color: 0x59606f, roughness: 1, flatShading: true, emissive: 0x14171f }));
  rock.position.set(9.5, 0.3, -2);
  makeProp(rock, 'stone', { radius: 0.32, restH: 0.3, bounce: 0.12, friction: 0.6 });

  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 12),
    new THREE.MeshStandardMaterial({ color: 0x7a7266, roughness: 0.7, metalness: 0.3, flatShading: true, emissive: 0x121010 }));
  can.position.set(4.2, 0.11, -28); can.rotation.z = Math.PI / 2;
  makeProp(can, 'rusted can', { radius: 0.12, restH: 0.11, bounce: 0.4 });
}

// ------------------------------------------------------------------
// Inventory + equip
// ------------------------------------------------------------------
const inventory = [];
const INV_MAX = 10;                 // the pack (Tab)
const HOTBAR_SLOTS = 6;             // the quick strip on the left, keys 1–6
let equipped = null;
function renderHotbar() {
  hotbarEl.innerHTML = '';
  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    const item = inventory[i];
    const slot = document.createElement('div');
    slot.className = 'slot' + (item ? '' : ' empty') + (item && item === equipped ? ' equipped' : '');
    let icon = '';
    if (item) icon = item.icon.startsWith('data:') ? `<img src="${item.icon}" alt="">` : item.icon;
    slot.innerHTML = `<span class="num">${i + 1}</span>` + icon;
    if (item) {
      const lab = document.createElement('span');
      lab.className = 'label';
      lab.textContent = item.name + (item.viewmodel ? (item === equipped ? ' — holster' : ' — equip') : ' — use');
      slot.appendChild(lab);
      slot.addEventListener('click', (e) => { e.stopPropagation(); useSlot(i); });
    }
    hotbarEl.appendChild(slot);
  }
}
function addToInventory(item) {
  if (inventory.length >= INV_MAX) return false;
  inventory.push(item);
  renderHotbar();
  renderPack();
  refreshUI();
  return true;
}
function removeFromInventory(item) {
  const i = inventory.indexOf(item);
  if (i < 0) return;
  if (equipped === item) toggleEquip(item);
  inventory.splice(i, 1);
  renderHotbar();
  renderPack();
  refreshUI();
}
const iconHTML = (item) =>
  item.icon.startsWith('data:') ? `<img src="${item.icon}" alt="">` : item.icon;
function useSlot(i) {
  const item = inventory[i];
  if (!item || menuOpen || ended) return;
  if (noteOpen) { closeNote(); return; }
  item.use();
}
function toggleEquip(item) {
  equipped = (equipped === item) ? null : item;
  viewmodel.visible = !!equipped;
  toolMount.children.forEach((c) => { c.visible = false; });
  if (equipped && equipped.viewmodel) equipped.viewmodel.visible = true;
  digT = 0;
  renderHotbar();
  renderPack();
}
renderHotbar();

// ------------------------------------------------------------------
// The pack (Tab) — ten slots, drag one item onto another to combine.
// Recipes are keyed on the two item ids, in either order.
// ------------------------------------------------------------------
const invPanelEl = document.getElementById('invpanel');
const invGridEl = document.getElementById('inv-grid');
const invGhostEl = document.getElementById('invghost');
const RECIPES = [
  // dropping one onto the other runs the scripted 3D extraction
  // packReturnLock is cleared first: closePack() re-requests pointer lock
  // asynchronously, and the lock would otherwise land *after* startExtraction()
  // has already released it, trapping you in the examine view with Escape
  // being eaten by the browser's own exit-pointer-lock handling.
  { a: 'syringe', b: 'horseshoe', run: () => { packReturnLock = false; closePack(); startExtraction(); } },
];
function findRecipe(x, y) {
  if (!x || !y || x === y) return null;
  for (const r of RECIPES) {
    if (x.id === r.a && y.id === r.b) return () => r.run(x, y);
    if (x.id === r.b && y.id === r.a) return () => r.run(y, x);
  }
  return null;
}
function renderPack() {
  if (!invGridEl) return;
  invGridEl.innerHTML = '';
  for (let i = 0; i < INV_MAX; i++) {
    const item = inventory[i];
    const slot = document.createElement('div');
    slot.className = 'islot' + (item ? ' filled' : '');
    slot.dataset.index = String(i);
    slot.innerHTML = `<span class="num">${i + 1}</span>` + (item ? iconHTML(item) : '');
    if (item) {
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = item.name;
      slot.appendChild(nm);
    }
    invGridEl.appendChild(slot);
  }
}
renderPack();

// --- drag & drop ----------------------------------------------------
let dragItem = null, dragFrom = -1;
function slotFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  return el ? el.closest('.islot') : null;
}
function clearDropHints() {
  for (const s of invGridEl.querySelectorAll('.islot')) s.classList.remove('combines', 'dragging');
}
function endDrag() {
  dragItem = null; dragFrom = -1;
  invGhostEl.classList.remove('show');
  clearDropHints();
}
invGridEl.addEventListener('pointerdown', (e) => {
  const slot = e.target.closest('.islot');
  if (!slot) return;
  const i = +slot.dataset.index;
  const item = inventory[i];
  if (!item) return;
  e.preventDefault();
  dragItem = item; dragFrom = i;
  invGhostEl.innerHTML = iconHTML(item);
  invGhostEl.style.left = e.clientX + 'px';
  invGhostEl.style.top = e.clientY + 'px';
  invGhostEl.classList.add('show');
  slot.classList.add('dragging');
  // light up anything this can actually combine with
  for (const s of invGridEl.querySelectorAll('.islot')) {
    const other = inventory[+s.dataset.index];
    if (other && findRecipe(item, other)) s.classList.add('combines');
  }
});
window.addEventListener('pointermove', (e) => {
  if (!dragItem) return;
  invGhostEl.style.left = e.clientX + 'px';
  invGhostEl.style.top = e.clientY + 'px';
});
window.addEventListener('pointerup', (e) => {
  if (!dragItem) return;
  const slot = slotFromPoint(e.clientX, e.clientY);
  const item = dragItem, from = dragFrom;
  endDrag();
  if (!slot) return;
  const to = +slot.dataset.index;
  if (to === from) return;
  const target = inventory[to];
  const recipe = findRecipe(item, target);
  if (recipe) { recipe(); return; }
  // no recipe — just reorder / swap the two slots
  if (target) { inventory[to] = item; inventory[from] = target; }
  else { inventory.splice(from, 1); inventory.splice(Math.min(to, inventory.length), 0, item); }
  renderHotbar(); renderPack();
});

function openPack() {
  if (invOpen || ended || dying || !introDone) return;
  invOpen = true;
  packReturnLock = locked;
  if (locked) document.exitPointerLock();
  if (held) dropHeld();
  renderPack();
  invPanelEl.classList.add('show');
  setPrompt('');
  crosshair.className = '';
  refreshUI();
}
function closePack() {
  if (!invOpen) return;
  invOpen = false;
  endDrag();
  invPanelEl.classList.remove('show');
  refreshUI();
  if (packReturnLock && !fallbackLook) requestLock();
}

// ------------------------------------------------------------------
// First-person view model (rendered in its own overlay scene)
// ------------------------------------------------------------------
const vmScene = new THREE.Scene();
const vmCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 12);
vmScene.add(new THREE.AmbientLight(0x9fb0cc, 0.9));
{
  const k = new THREE.DirectionalLight(0xffe6c8, 1.15); k.position.set(-0.5, 1, 0.9); vmScene.add(k);
  const r = new THREE.DirectionalLight(0x6f8ec8, 0.55); r.position.set(1, 0.3, -0.6); vmScene.add(r);
}

const viewmodel = new THREE.Group();
viewmodel.visible = false;
vmScene.add(viewmodel);

/* No hand — the equipped item just floats in the lower-right of the view
 * as if an invisible hand were holding it. `armRig` is kept purely as the
 * transform that `updateViewmodel()` sways and swings; `toolMount` at its
 * origin is where tool models parent. */
const ARM_BASE = new THREE.Vector3(0.16, -0.20, -0.62);
const ARM_ROT_X = 0.10;
const armRig = new THREE.Group();
armRig.position.copy(ARM_BASE);
armRig.rotation.set(ARM_ROT_X, -0.45, 0.10);
viewmodel.add(armRig);

// Keep the floating item at the same spot in the frame whatever the window
// shape: derive its X/Y from the view's half-extents at the item's depth —
// tucked into the lower-right corner like a held tool.
function layoutViewmodel() {
  const d = Math.abs(ARM_BASE.z);
  const halfH = Math.tan((vmCamera.fov * Math.PI) / 360) * d;
  const halfW = halfH * vmCamera.aspect;
  ARM_BASE.x = halfW * 0.58;
  ARM_BASE.y = -halfH * 0.66;
}

// the tool parents here — sits where the fist used to be
const toolMount = new THREE.Group();
armRig.add(toolMount);

// ------------------------------------------------------------------
// The red sand shovel — a factory used for both the world prop and the
// held view model
// ------------------------------------------------------------------
function makeShovel() {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xd42a22, roughness: 0.4, metalness: 0.05, emissive: 0x2a0705, flatShading: true });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 10), red); shaft.position.y = 0.31;
  const grip = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 16), red); grip.position.y = 0.63; grip.rotation.x = Math.PI / 2;
  const gripBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.15, 8), red); gripBar.position.y = 0.63; gripBar.rotation.z = Math.PI / 2;
  // scoop/lip on the -Z face so the concave side leads into the sand on the dig
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.24, 0.03), red); blade.position.set(0, -0.08, -0.02);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.02, 0.06), red); lip.position.set(0, -0.2, -0.045);
  g.add(shaft, grip, gripBar, blade, lip);
  return g;
}
function makeShovelIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#e23b2f';
  g.beginPath(); g.moveTo(14, 30); g.lineTo(34, 30); g.lineTo(32, 45); g.lineTo(16, 45); g.closePath(); g.fill();
  g.fillRect(22, 9, 4, 21);
  g.lineWidth = 4; g.strokeStyle = '#e23b2f';
  g.beginPath(); g.arc(24, 9, 7, Math.PI, 0); g.stroke();
  return c.toDataURL();
}

// held out ahead, D-handle back toward the camera and the blade angled
// down-and-forward — the scoop faces the ground so the dig swing bites in
const shovelVM = makeShovel();
shovelVM.scale.setScalar(0.48);
shovelVM.position.set(-0.04, -0.02, 0.0);
shovelVM.rotation.set(0.70, 0.35, 0.32);
shovelVM.visible = false;
toolMount.add(shovelVM);

// ------------------------------------------------------------------
// Sand castle with the shovel stuck in it — the first item you find
// ------------------------------------------------------------------
const CASTLE_Z = -10;
const castle = new THREE.Group();
castle.position.set(4.6, 0, CASTLE_Z);
{
  castle.scale.setScalar(0.85);
  const moldMat = new THREE.MeshStandardMaterial({ color: 0x5c6679, roughness: 1, flatShading: true, emissive: 0x212938 });
  const wetMat = new THREE.MeshStandardMaterial({ color: 0x454e60, roughness: 1, flatShading: true, emissive: 0x161c28 });
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xb9bcb4, roughness: 1, flatShading: true, emissive: 0x3a3c38 });

  // bucket-molded towers: a stack of tapered drums, each a bucket-load
  function tower(x, z, h, r, tilt) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.z = tilt;
    const drums = Math.max(2, Math.round(h / 0.3));
    let y = 0;
    for (let i = 0; i < drums; i++) {
      const t = i / drums;
      const rr = r * (1 - t * 0.42);
      const dh = h / drums;
      const d = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.9, rr, dh * 1.04, 8), i === 0 ? wetMat : moldMat);
      d.position.y = y + dh / 2;
      d.rotation.y = i * 0.31;                       // each bucket set down askew
      g.add(d);
      y += dh;
    }
    // crenellated top
    const top = r * 0.62;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const mer = new THREE.Mesh(new THREE.BoxGeometry(top * 0.42, 0.13, top * 0.42), moldMat);
      mer.position.set(Math.cos(a) * top, y + 0.05, Math.sin(a) * top);
      mer.rotation.y = a;
      g.add(mer);
    }
    return g;
  }

  const keep = tower(0, 0, 0.95, 0.42, 0.03);
  const t2 = tower(-0.62, 0.5, 0.62, 0.29, -0.06);
  const t3 = tower(0.58, 0.46, 0.5, 0.26, 0.07);
  const t4 = tower(0.1, -0.72, 0.44, 0.24, -0.04);
  castle.add(keep, t2, t3, t4);

  // curtain wall between the towers, with a gap where it's collapsed
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    if (a > 3.5 && a < 4.5) continue;                 // slumped section
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2 + Math.random() * 0.1, 0.14), moldMat);
    seg.position.set(Math.cos(a) * 0.95, 0.1, Math.sin(a) * 0.95);
    seg.rotation.y = -a;
    castle.add(seg);
  }
  // rubble where the wall gave way
  for (let i = 0; i < 5; i++) {
    const a = 3.5 + Math.random();
    const lump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07 + Math.random() * 0.06, 0), wetMat);
    lump.position.set(Math.cos(a) * (0.95 + Math.random() * 0.35), 0.03, Math.sin(a) * (0.95 + Math.random() * 0.35));
    lump.rotation.set(Math.random(), Math.random(), Math.random());
    castle.add(lump);
  }

  // packed base / moat berm
  const berm = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.62, 0.12, 12), wetMat);
  berm.position.y = 0.06;
  castle.add(berm);

  // drip-castle blobs melted down the keep's flank
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2, up = 0.15 + Math.random() * 0.6;
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05 + Math.random() * 0.05, 0), moldMat);
    blob.position.set(Math.cos(a) * 0.44, up, Math.sin(a) * 0.44);
    blob.scale.y = 1.7;
    castle.add(blob);
  }

  // shells pressed into the walls as decoration
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2;
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.03, 7), shellMat);
    sh.position.set(Math.cos(a) * 0.98, 0.13 + Math.random() * 0.1, Math.sin(a) * 0.98);
    sh.rotation.set(Math.PI / 2, 0, -a);
    castle.add(sh);
  }

  // a moat scratched around it, and the spoil pile from digging it
  const moat = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.1, 16), new THREE.MeshBasicMaterial({
    map: makeCraterTexture(), transparent: true, depthWrite: false, opacity: 0.3,
  }));
  moat.rotation.x = -Math.PI / 2; moat.position.y = 0.02;
  castle.add(moat);
  const spoil = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.22, 7), wetMat);
  spoil.position.set(1.35, 0.09, 0.7); spoil.scale.set(1.5, 1, 1.2);
  castle.add(spoil);
}
scene.add(castle);

const shovelWorld = makeShovel();
shovelWorld.position.set(4.72, 0.72, CASTLE_Z + 0.08);
shovelWorld.rotation.set(0.55, 0.4, -0.4);
addItemShine(shovelWorld, { size: 0.7, height: 0.45, strength: 0.8 });
{
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  proxy.position.y = 0.3; proxy.name = 'hitProxy';
  shovelWorld.add(proxy);
}
scene.add(shovelWorld);

let digT = 0, digImpacted = false;
const shovelItem = {
  name: 'Sand shovel', icon: makeShovelIcon(), onDig: true, viewmodel: shovelVM,
  use: () => toggleEquip(shovelItem),
};
addInteractable(shovelWorld, "Take the sand shovel", 'inventory', {
  onActivate: () => {
    sfxThud(0.04);
    scene.remove(shovelWorld);
    hovered = null;
    addToInventory(shovelItem);
    toggleEquip(shovelItem);
  },
});

/* The charged swing. Hold the right button and the shovel hauls back; the
 * longer it's held the further it winds, and letting go drops it with that
 * much more behind it. digPower 0 is the ordinary left-click dig, 1 is a full
 * wind-up: slower, wider, and it hits a good deal harder. The pose is driven
 * from windCharge so what you see in your hands is the strength you've built. */
const WIND_FULL = 1.15;                 // seconds of holding to reach full power
let winding = false, windT = 0, digPower = 0;
function startDig(power = 0) {
  if (digT > 0 || !equipped || !equipped.onDig || frozen()) return;
  digPower = THREE.MathUtils.clamp(power, 0, 1);
  digT = 0.0001;
  digImpacted = false;
  sfxDig(digPower);
}
function startWind() {
  if (digT > 0 || winding || !equipped || !equipped.onDig || frozen()) return;
  winding = true; windT = 0;
}
function releaseWind() {
  if (!winding) return;
  winding = false;
  // even a tap off the right button carries a bit more than a plain dig
  startDig(0.25 + 0.75 * Math.min(1, windT / WIND_FULL));
  windT = 0;
}
// where on the sand the crosshair is pointing (null if you're looking at
// the sky or somewhere out of reach)
const digRay = new THREE.Raycaster();
const _digHit = new THREE.Vector3();
function crosshairGroundPoint(maxDist = 4.5) {
  digRay.far = maxDist;
  digRay.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = digRay.intersectObject(sand, false);
  if (!hits.length) return null;
  _digHit.copy(hits[0].point);
  if (_digHit.x < WADE_X + 0.2 || _digHit.x > CLIFF_BLOCK_X + 1.5) return null;
  return _digHit;
}
function digImpact() {
  camera.getWorldDirection(_pf); _pf.y = 0; _pf.normalize();
  const p = crosshairGroundPoint();
  let x, z;
  if (p) { x = p.x; z = p.z; }
  else {
    // looking at the sky — scuff the sand just in front of your feet instead
    x = THREE.MathUtils.clamp(camera.position.x + _pf.x * 1.5, WADE_X + 0.3, CLIFF_BLOCK_X - 0.3);
    z = camera.position.z + _pf.z * 1.5;
  }
  // a swing that lands near the crab kills it, sand or surf — a wound-up one
  // reaches further, so a charged swing is the reliable way to land it
  const P = digPower;
  if (crabState.alive) {
    const reach = CRAB_KILL_RADIUS * (1 + P * 0.55);
    const cdx = x - crab.position.x, cdz = z - crab.position.z;
    if (cdx * cdx + cdz * cdz < reach * reach) killCrab();
  }
  if (inWater(x, z)) {
    // blade hits water, not sand — throw a splash, leave no crater
    spawnSplash(x, z, 24 + P * 22, _pf.x, _pf.z, 1.7 + P * 0.9);
    sfxSplash(1.1 + P * 0.5);
    addTrauma(0.10 + P * 0.22);
    return;
  }
  addTrauma(0.22 + P * 0.30);
  stampDigHole(x, z, _pf.x, _pf.z);
  spawnPuffs(x, z, 22 + Math.round(P * 20), _pf.x, _pf.z);
  sfxDigImpact(P);
  revealMoundNear(x, z, _pf.x, _pf.z);
}

let vmSway = 0;
// Easing. Nothing the player looks at should move on a straight line —
// the swing was linear on every segment before, which is exactly what makes
// an animation read as placeholder.
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

/* The dig, re-cut to attack frame data at 60 fps over DIG_DUR (~48 frames):
 *   anticipation  0.00–0.34   16f   hauls up and hangs at the top
 *   strike        0.34–0.46    6f   drops fast, accelerating in
 *   impact        0.46
 *   recovery      0.46–1.00   26f   eases back, overshooting once
 * The blade also swings through an arc rather than pitching on the spot,
 * and the poses are pushed past what the geometry strictly needs so they
 * still read at a glance. */
const DIG_WINDUP = 0.34, DIG_STRIKE = 0.46;
let vmLagX = 0, vmLagY = 0, vmPrevYaw = 0, vmPrevPitch = 0;
let vmSpringY = 0, vmSpringV = 0;
const _vmEuler = new THREE.Euler(0, 0, 0, 'YXZ');
function vmImpulse(v) { vmSpringV += v; }          // landings, jumps, impacts

function updateViewmodel(dt) {
  const show = !!equipped && !held;
  viewmodel.visible = show;
  if (!show) { winding = false; windT = 0; return; }
  if (winding) {
    if (frozen()) { winding = false; windT = 0; }
    else windT = Math.min(WIND_FULL * 1.35, windT + dt);
  }
  const windCharge = winding ? Math.min(1, windT / WIND_FULL) : 0;
  const sp = velocity.length();
  vmSway += dt * (2.2 + sp * 1.7);
  const moveAmt = Math.min(1, sp / WALK_SPEED);
  const bx = Math.sin(vmSway) * 0.010 * moveAmt;
  const by = Math.abs(Math.sin(vmSway)) * -0.014 * moveAmt;

  // --- follow through: the tool trails the turn, then catches up ------
  _vmEuler.setFromQuaternion(camera.quaternion);
  let dYaw = _vmEuler.y - vmPrevYaw, dPitch = _vmEuler.x - vmPrevPitch;
  if (dYaw > Math.PI) dYaw -= Math.PI * 2;
  if (dYaw < -Math.PI) dYaw += Math.PI * 2;
  vmPrevYaw = _vmEuler.y; vmPrevPitch = _vmEuler.x;
  if (frozen()) { vmLagX = vmLagY = 0; }           // don't trail scripted camera moves
  else { vmLagY += dYaw * 1.15; vmLagX += dPitch * 1.15; }
  const settle = Math.min(1, 11 * dt);
  vmLagY -= vmLagY * settle; vmLagX -= vmLagX * settle;
  vmLagY = THREE.MathUtils.clamp(vmLagY, -0.30, 0.30);
  vmLagX = THREE.MathUtils.clamp(vmLagX, -0.24, 0.24);

  // --- overlapping action: a damped spring carries landings and jumps --
  vmSpringV += (-150 * vmSpringY - 16 * vmSpringV) * dt;
  vmSpringY += vmSpringV * dt;
  vmSpringY = THREE.MathUtils.clamp(vmSpringY, -0.14, 0.14);

  let pitch = 0, lift = 0, swingYaw = 0, roll = 0, push = 0;
  if (winding) {
    // The haul-back. Rises fast and then creeps, so a full charge still feels
    // like it's straining rather than sitting at a pose, and the shoulders
    // shake a little once it's wound past full.
    const e = easeOutCubic(windCharge);
    const strain = windT > WIND_FULL ? Math.sin(windT * 34) * 0.012 : 0;
    pitch = -(0.55 + 1.35 * e) + strain;
    lift = 0.10 + 0.20 * e;
    swingYaw = -(0.22 + 0.42 * e);
    roll = -(0.14 + 0.26 * e) + strain;
    push = 0.04 + 0.10 * e;
  } else if (digT > 0) {
    // a heavier swing takes longer to come round
    digT += dt / (DIG_DUR * (1 + digPower * 0.45));
    const p = digT;
    const P = digPower;
    if (p < DIG_WINDUP) {
      // anticipation: quick out of rest, hanging at the top of the haul
      const t = easeOutCubic(p / DIG_WINDUP);
      pitch = -(1.25 + P * 0.70) * t; lift = (0.17 + P * 0.13) * t;
      swingYaw = -(0.34 + P * 0.26) * t; roll = -(0.20 + P * 0.16) * t; push = 0.05 * t;
    } else if (p < DIG_STRIKE) {
      // the strike: accelerates into the sand, arcing across as it drops
      const t = easeInCubic((p - DIG_WINDUP) / (DIG_STRIKE - DIG_WINDUP));
      pitch = -(1.25 + P * 0.70) + (2.85 + P * 1.30) * t;
      lift = (0.17 + P * 0.13) - (0.62 + P * 0.22) * t;
      swingYaw = -(0.34 + P * 0.26) + (0.50 + P * 0.34) * t;
      roll = -(0.20 + P * 0.16) + (0.34 + P * 0.24) * t;
      push = 0.05 - (0.17 + P * 0.10) * t;
    } else {
      // recovery: eases back to rest and overshoots once on the way
      const t = Math.min(1, (p - DIG_STRIKE) / (1 - DIG_STRIKE));
      const e = easeOutBack(t);
      pitch = (1.60 + P * 0.6) * (1 - e); lift = -(0.45 + P * 0.2) * (1 - e);
      swingYaw = 0.16 * (1 - e); roll = 0.14 * (1 - e); push = -0.12 * (1 - e);
    }
    if (!digImpacted && p >= DIG_STRIKE) {
      digImpacted = true;
      digImpact();
      vmImpulse(-1.7 - digPower * 1.9);            // the blade jars in your hands
    }
    if (p >= 1) { digT = 0; digPower = 0; }
  }

  armRig.rotation.x = ARM_ROT_X + pitch + vmLagX;
  armRig.rotation.y = -0.45 + swingYaw + vmLagY;
  armRig.rotation.z = 0.10 + roll + vmLagY * 0.45;
  armRig.position.set(
    ARM_BASE.x + bx + vmLagY * 0.16,
    ARM_BASE.y + by + lift + vmSpringY,
    ARM_BASE.z + push
  );
}

// ------------------------------------------------------------------
// The bottle — an inventory pickup with a note inside (further down)
// ------------------------------------------------------------------
const NOTE_TEXT = 'deez nuts';
const bottle = new THREE.Group();
{
  const glass = new THREE.MeshStandardMaterial({ color: 0x3f8050, roughness: 0.1, transparent: true, opacity: 0.6, emissive: 0x143a22 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.052, 0.24, 9), glass);
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.05, 0.055, 9), glass); shoulder.position.y = 0.147;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.024, 0.06, 9), glass); neck.position.y = 0.2;
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.018, 0.04, 8), new THREE.MeshStandardMaterial({ color: 0x6b5030, roughness: 1, flatShading: true })); cork.position.y = 0.242;
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6), new THREE.MeshStandardMaterial({ color: 0xd8c9a2, roughness: 1, emissive: 0x2b2416 })); paper.rotation.z = 0.35; paper.position.y = 0.01;
  bottle.add(body, shoulder, neck, cork, paper);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.position.y = 0.08; hit.name = 'hitProxy';
  bottle.add(hit);
}
bottle.scale.setScalar(1.35);
bottle.position.set(3.6, 0.11, -42);
bottle.rotation.set(0, 1.1, Math.PI / 2 * 0.96);
// A physics prop rather than a straight pickup: grab it with E, click to
// throw. Land it hard enough and it shatters, which is the only way to get
// at the note rolled up inside.
const bottleProp = makeProp(bottle, 'message in a bottle', {
  radius: 0.14, restH: 0.11, bounce: 0.28, friction: 0.7,
});
let bottleBroken = false;
bottleProp.onImpact = (speed) => {
  if (bottleBroken || speed < 5.2) return;      // a gentle drop just clinks
  bottleBroken = true;
  bottleProp.dead = true;
  const p = bottle.position.clone();
  scene.remove(bottle);
  const i = interactables.findIndex((it) => it.root === bottle);
  if (i >= 0) interactables.splice(i, 1);
  if (hovered && hovered.root === bottle) hovered = null;
  sfxGlassBreak();
  spawnPuffs(p.x, p.z, 26, 0, 0, Math.max(0.08, p.y), [0.42, 0.85, 0.55]);

  // the note it was carrying, now loose on the sand
  const note = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.17, 7),
    new THREE.MeshStandardMaterial({ color: 0xd8c9a2, roughness: 1, flatShading: true, emissive: 0x2b2416 }));
  paper.rotation.z = Math.PI / 2;
  note.add(paper);
  const nhit = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  nhit.name = 'hitProxy'; note.add(nhit);
  note.position.set(p.x, 0.03, p.z);
  note.rotation.y = Math.random() * Math.PI;
  scene.add(note);
  addInteractable(note, 'Take the note', 'inventory', {
    onActivate: () => {
      scene.remove(note);
      hovered = null;
      addToInventory({ name: 'Sea-worn note', icon: '📜', use: () => openNote(NOTE_TEXT) });
    },
  });
};

// ------------------------------------------------------------------
// The lighthouse door — a heavy planked door hung in the opening at the
// end of the path. It's shut when you arrive and the wall won't let you
// past until you open it, so getting in is a deliberate act.
// ------------------------------------------------------------------
let doorOpen = false, doorSwing = 0;          // swing eases 0 → 1
const lhDoor = new THREE.Group();
let lhDoorEntry = null;
{
  const DW = LH_DOOR_W;                       // half-width of the opening
  const DH = LH_DOOR_H;
  const PORTAL_Z = 4.86;                      // face of the surround
  const R = PORTAL_Z - 0.18;                  // door hangs just inside it

  // The wall leans in as it climbs — lhOuterAt() reads 4.62 at the foot of
  // the door and 4.21 at its head — so a flat surround set at one radius
  // will be swallowed by the wall at the bottom or hang off it at the top,
  // which is exactly how it looked. The face sits clear of the widest point
  // and every piece runs back to BACK_Z, well inside the masonry at every
  // height it passes, so the frame is buried into the curve all the way up
  // instead of resting against it.
  const surround = new THREE.MeshStandardMaterial({
    color: 0x3a3f4b, roughness: 1, metalness: 0, flatShading: true, emissive: 0x171a21,
  });
  {
    const BACK_Z = 3.25;                     // buried, at every door height
    const depth = PORTAL_Z - BACK_Z, zc = (PORTAL_Z + BACK_Z) / 2;
    for (const sgn of [-1, 1]) {                       // jambs
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.5, DH + 0.5, depth), surround);
      jamb.position.set(sgn * (DW + 0.25), (DH + 0.5) / 2, zc);
      lighthouse.add(jamb);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(DW * 2 + 1.0, 0.34, depth), surround);
    lintel.position.set(0, DH + 0.17, zc);
    // a shallow hood over the lintel to throw the rain off
    const hood = new THREE.Mesh(new THREE.BoxGeometry(DW * 2 + 1.24, 0.16, depth), surround);
    hood.position.set(0, DH + 0.44, zc);
    hood.rotation.x = -0.18;
    // threshold slab, jutting out to meet the last of the stepping stones
    const sill = new THREE.Mesh(new THREE.BoxGeometry(DW * 2 + 1.05, 0.16, depth + 0.35), surround);
    sill.position.set(0, 0.07, zc + 0.18);
    lighthouse.add(lintel, hood, sill);
    // soffit, so you don't see daylight through the top of the reveal
    const soffit = new THREE.Mesh(new THREE.BoxGeometry(DW * 2, 0.1, depth), surround);
    soffit.position.set(0, DH + 0.02, zc);
    lighthouse.add(soffit);
  }

  // hinge down the left edge as you face it from outside
  lhDoor.position.set(-DW, 0, R);
  lighthouse.add(lhDoor);

  const plankMat = new THREE.MeshStandardMaterial({
    color: 0x4a3b2b, roughness: 0.95, metalness: 0.02,
    flatShading: true, emissive: 0x1a130c,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x2a2c31, roughness: 0.6, metalness: 0.55, flatShading: true, emissive: 0x0d0e11,
  });

  // vertical boards, each slightly different so it reads as timber
  const nP = 7, pw = (DW * 2) / nP;
  for (let i = 0; i < nP; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(pw * 0.94, DH - 0.06, 0.09 + Math.random() * 0.02), plankMat);
    p.position.set(pw * (i + 0.5), DH / 2, 0);
    lhDoor.add(p);
  }
  // iron straps across, with bolt heads
  for (const y of [DH * 0.22, DH * 0.78]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(DW * 2 - 0.05, 0.11, 0.045), ironMat);
    strap.position.set(DW, y, 0.06);
    lhDoor.add(strap);
    for (let i = 0; i < nP; i++) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 6), ironMat);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(pw * (i + 0.5), y, 0.09);
      lhDoor.add(bolt);
    }
  }
  // hinges on the pivot edge
  for (const y of [DH * 0.18, DH * 0.82]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.05), ironMat);
    h.position.set(0.22, y, 0.07);
    lhDoor.add(h);
  }
  // ring handle on the free edge
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.022, 6, 14), ironMat);
  ring.position.set(DW * 2 - 0.24, DH * 0.5, 0.10);
  lhDoor.add(ring);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8), ironMat);
  plate.rotation.x = Math.PI / 2;
  plate.position.set(DW * 2 - 0.24, DH * 0.5 + 0.11, 0.09);
  lhDoor.add(plate);

  // a fat invisible slab so it's easy to aim at
  const hit = new THREE.Mesh(new THREE.BoxGeometry(DW * 2, DH, 0.5),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.set(DW, DH / 2, 0);
  hit.name = 'hitProxy';
  lhDoor.add(hit);

  // A lamp over the threshold. Without it the doorway is a black hole in a
  // black tower and you'd never find it — this also gives the end of the
  // path something to aim at from a long way off.
  const lampY = DH + 0.78, lampZ = PORTAL_Z - 0.12;
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.22, 8), ironMat);
  hood.position.set(0, lampY + 0.16, lampZ);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffdca8, fog: false }));
  bulb.position.set(0, lampY, lampZ);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.34), ironMat);
  arm.position.set(0, lampY + 0.2, lampZ - 0.18);
  const doorLamp = new THREE.PointLight(0xffb478, 9, 11, 1.7);
  doorLamp.position.set(0, lampY - 0.05, lampZ + 0.15);
  const lampHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffd9a4, transparent: true, opacity: 0.42,
    depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
  }));
  lampHalo.position.copy(bulb.position);
  lampHalo.scale.setScalar(2.6);
  lighthouse.add(hood, bulb, arm, doorLamp, lampHalo);
  lighthouse.userData.doorLamp = { light: doorLamp, halo: lampHalo, bulb };

  addInteractable(lhDoor, 'Open the door', 'action', {
    onActivate: () => {
      doorOpen = !doorOpen;
      lhDoorEntry.label = doorOpen ? 'Close the door' : 'Open the door';
      sfxDoor(doorOpen);
    },
  });
  lhDoorEntry = interactables[interactables.length - 1];
}
function updateDoor(dt) {
  const target = doorOpen ? 1 : 0;
  if (doorSwing === target) return;
  // heavy: quick to get moving, slow to settle
  doorSwing += THREE.MathUtils.clamp(target - doorSwing, -1, 1) * Math.min(1, dt * 2.6);
  if (Math.abs(target - doorSwing) < 0.004) doorSwing = target;
  lhDoor.rotation.y = -doorSwing * 1.95;      // swings outward, toward the path
}

// ------------------------------------------------------------------
// Horseshoe crab — stranded in the wrack line. Take it, then "use" it
// to turn it over and look at the underside. Model lives in
// models/horseshoe-crab.js.
// ------------------------------------------------------------------
// (renamed hcrab* to avoid the enemy `crab` added on main)
const hcrab = makeHorseshoeCrab();
const hcrabWorld = new THREE.Group();
hcrabWorld.add(hcrab);
{
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.30, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy';
  hcrabWorld.add(hit);
}
hcrabWorld.position.set(2.7, 0.03, -58);
hcrabWorld.rotation.set(0.05, -0.7, -0.03);
scene.add(hcrabWorld);
addItemShine(hcrabWorld, { size: 0.8, height: 0.14 });
let hcrabTaken = false, crabBled = false;
const crabItem = {
  id: 'horseshoe', name: 'Horseshoe crab', icon: makeHorseshoeCrabIcon(),
  use: () => {
    if (!crabBled && inventory.includes(syringeItem)) startExtraction();
    else openInspect(hcrab, { rotX: 0.5, rotY: 0.5 });
  },
};
addInteractable(hcrabWorld, 'Take the horseshoe crab', 'inventory', {
  onActivate: () => {
    if (hcrabTaken) return;
    hcrabTaken = true;
    sfxThud(0.04);
    scene.remove(hcrabWorld);
    hovered = null;
    addToInventory(crabItem);
  },
});

// ------------------------------------------------------------------
// Bleeding syringe — a big glass hypodermic further down the beach.
// Take it, then "use" it while carrying the crab to draw the pale
// blue haemolymph: the needle goes into the hinge and the plunger
// pulls back, filling the barrel. Model in models/syringe.js.
// ------------------------------------------------------------------
const syringe = makeSyringe();
const syringeWorld = new THREE.Group();
syringeWorld.add(syringe);
{
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy';
  syringeWorld.add(hit);
}
syringe.scale.setScalar(1.6);
syringeWorld.position.set(3.6, 0.06, -96);
syringeWorld.rotation.set(0.1, 1.1, 0.5);
// not in the world any more — you start the walk with it (see below)

let syringeTaken = false;
const bloodJar = makeBloodJar();
// The jar is never carried — it only exists as the model shown at the end
// of an extraction, and as the running tally in the corner of the screen.
const jarItem = null;
const syringeItem = {
  id: 'syringe', name: 'Bleeding syringe', icon: makeSyringeIcon(),
  use: () => {
    if (!crabBled && inventory.includes(crabItem)) startExtraction();
    else openInspect(syringe, { rotX: 0.15, rotY: 0.8 });
  },
};
// you set out with the syringe already on you, empty
syringeTaken = true;
syringe.scale.setScalar(1);
addToInventory(syringeItem);

// ---- the extraction: crab + syringe combine ----------------------
let extracting = false, extractT = 0;
const extractRig = new THREE.Group();
const _hinge = new THREE.Vector3(0, 0.036, -0.116);          // where the needle bites
function startExtraction() {
  if (inspecting) return;
  inspecting = true; extracting = true; extractT = 0;

  const SS = 1.4;
  extractRig.clear();
  hcrab.position.set(0, 0, 0); hcrab.rotation.set(0, 0, 0); hcrab.scale.setScalar(1);
  syringe.position.set(0, 0, 0); syringe.rotation.set(0.95, 0.5, 0); syringe.scale.setScalar(SS);
  syringe.userData.setFill(0);
  syringe.userData.parts.cap.visible = true;
  const tip = new THREE.Vector3(0, 0, syringe.userData.parts.tipZ * SS).applyEuler(syringe.rotation);
  syringe.position.copy(_hinge).sub(tip).add(new THREE.Vector3(0, 0.05, 0));   // start lifted clear
  syringe.userData.startY = syringe.position.y;
  extractRig.add(hcrab, syringe);

  inspectSetModel(extractRig);
  // frame on the crab, not the crab+syringe pair
  extractRig.updateMatrixWorld(true);
  const cb = new THREE.Box3().setFromObject(hcrab).getCenter(new THREE.Vector3());
  inspectFit.position.copy(cb).multiplyScalar(-inspectFit.scale.x);
  inspectRotX = 0.62; inspectRotY = 0.55; inspectDist = 4.2; inspectAuto = 999;   // no idle drift
  inspectCamera.aspect = window.innerWidth / window.innerHeight;
  inspectCamera.updateProjectionMatrix();
  inspectEl.classList.add('show');
  inspectEl.querySelector('.hint').textContent = 'Drawing haemolymph…';
  promptEl.classList.remove('show');
  crosshair.className = ''; crosshair.style.display = 'none';
  inspectReturnLock = locked;
  if (locked) document.exitPointerLock();
  sfxDraw();
  refreshUI();
}
function driveExtraction(t) {
  const ease = (a, b) => THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  // 0.00–0.14  cap flicks off
  const c = ease(0, 0.14);
  syringe.userData.parts.cap.position.z = -c * 0.08;
  syringe.userData.parts.cap.visible = c < 1;
  // 0.14–0.32  needle dips into the hinge ... 0.86–1.0 lifts back out
  const dip = ease(0.14, 0.32) - ease(0.86, 1.0);
  syringe.position.y = syringe.userData.startY - dip * 0.05;
  // 0.32–0.9  plunger draws, barrel fills (with a faint pulse)
  const f = ease(0.32, 0.9);
  syringe.userData.setFill(f * (0.97 + 0.03 * Math.sin(t * 60)));
}
function finishExtraction() {
  extracting = false;
  crabBled = true;
  // the syringe is emptied into a jar and re-capped
  syringe.userData.setFill(0);
  syringe.userData.parts.cap.visible = true;
  syringe.userData.parts.cap.position.z = 0;
  bloodJar.userData.setFill(0.86);
  // The crab is spent — it goes back to the sea, not into your pack. And
  // the blood itself never becomes an item: it just runs into the tally in
  // the corner, which is the only place it's ever shown.
  removeFromInventory(crabItem);
  renderHotbar();
  bloodAmount += BLOOD_PER_CRAB;
  bloodSeen = true;
  bloodPulse = 1;
  hudJar.userData.setFill(Math.min(1, bloodAmount / BLOOD_JAR_CAP));
  updateBloodReadout();
  sfxBloodGained();
  // show the jar as the payoff, then it's gone
  inspectSetModel(bloodJar);
  inspectRotX = 0.12; inspectRotY = 0.45; inspectDist = 3.7; inspectAuto = 0;
  inspectEl.querySelector('.hint').textContent = 'A jar of blue blood · hold right-click to turn it · click to put it away';
}

// ------------------------------------------------------------------
// Buried caches — rare little sand mounds along the walk. Dig one open
// with the shovel and it turns up a (placeholder) buried object.
// ------------------------------------------------------------------
const moundMat = new THREE.MeshStandardMaterial({ color: 0x74809a, roughness: 1, flatShading: true, emissive: 0x272f42 });
const moundDomeGeo = new THREE.SphereGeometry(0.55, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
moundDomeGeo.scale(1, 0.36, 1);             // a low, flat dome
function makeMound() {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(moundDomeGeo, moundMat);
  dome.rotation.y = Math.random() * Math.PI;
  g.add(dome);
  // a couple of pressed-in pebbles so it reads as disturbed sand, not a bump
  for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.2 + Math.random() * 0.28;
    const pb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.03 + Math.random() * 0.03, 0),
      new THREE.MeshStandardMaterial({ color: 0x525b6d, roughness: 1, flatShading: true, emissive: 0x161b25 }));
    pb.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
    g.add(pb);
  }
  return g;
}
function makeBuriedObject() {
  // PLACEHOLDER — used for the 2nd buried cache onward, swap later
  const g = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0x9c7b3f, roughness: 0.6, metalness: 0.35, flatShading: true, emissive: 0x2c2110 });
  const wrap = new THREE.MeshStandardMaterial({ color: 0x6f6552, roughness: 1, flatShading: true, emissive: 0x1c1a14 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.13), brass);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.13, 0.035), wrap);
  g.add(box, band);
  return g;
}

// The glowstick — first thing you dig up. A short cracked light-stick
// burning a cold teal, throwing a small glow pool on the sand.
const GLOWSTICK_COLOR = 0x2fe9cf;   // cold teal, matched to the reference
const GLOWSTICK_LEN = 0.15;         // ~6 in
const GLOWSTICK_RADIUS = 0.014;
const GLOWSTICK_GLOW = 2.0;         // metres — the light's reach on the ground
function makeGlowstick() {
  const g = new THREE.Group();
  // translucent casing + a lit inner core
  const casing = new THREE.Mesh(
    new THREE.CylinderGeometry(GLOWSTICK_RADIUS, GLOWSTICK_RADIUS, GLOWSTICK_LEN, 10),
    new THREE.MeshBasicMaterial({ color: 0x74e6d4, transparent: true, opacity: 0.42, fog: false })
  );
  casing.rotation.z = Math.PI / 2;                    // lie flat, along X
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(GLOWSTICK_RADIUS * 0.5, GLOWSTICK_RADIUS * 0.5, GLOWSTICK_LEN + 0.006, 8),
    new THREE.MeshBasicMaterial({ color: 0x5fd0c0, fog: false })
  );
  core.rotation.z = Math.PI / 2;
  const capMat = new THREE.MeshStandardMaterial({ color: 0x172523, roughness: 1, flatShading: true });
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(GLOWSTICK_RADIUS * 1.15, GLOWSTICK_RADIUS * 1.15, 0.012, 10), capMat);
    cap.rotation.z = Math.PI / 2; cap.position.x = s * (GLOWSTICK_LEN / 2 + 0.004);
    g.add(cap);
  }
  g.add(casing, core);
  // the glow it throws on the ground — a soft, even teal pool (low decay so
  // it doesn't clip to white at the centre under the film tonemap)
  // NB: no light in here on purpose. Adding a light to the scene at runtime
  // changes the lighting state, which forces every material in the game to
  // recompile — measured at ~940 ms of hard freeze on the first frame after.
  // The glow comes from `groundGlow` below, which exists from startup.
  // faint additive halo so the stick itself blooms a little
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: GLOWSTICK_COLOR, transparent: true, opacity: 0.16,
    depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
  }));
  halo.scale.setScalar(0.4);
  g.add(halo);
  return g;
}
function makeGlowstickIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.strokeStyle = '#3af0d8'; g.lineWidth = 10;
  g.beginPath(); g.moveTo(12, 36); g.lineTo(36, 12); g.stroke();
  g.strokeStyle = '#dcfff8'; g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(12, 36); g.lineTo(36, 12); g.stroke();
  return c.toDataURL();
}

// Held in the right hand when equipped. The view model lives in the overlay
// scene (which can't light the world), so the actual lamp is a separate
// PointLight in the main scene that rides just off the camera — see
// updateHeldGlow(). Held up on end, the way you'd carry a cracked stick.
const glowstickVM = makeGlowstick();
glowstickVM.scale.setScalar(1.5);
glowstickVM.position.set(0.01, 0.0, 0.01);
glowstickVM.rotation.set(0, 0, 1.15);
glowstickVM.visible = false;
toolMount.add(glowstickVM);

// Intensity has to be this high to read against the scene's ambient +
// hemisphere fill; anything under ~20 gets swallowed on the sand.
// The glow for a glowstick lying on the sand. Created up front and parked at
// zero intensity so the scene's light count never changes while you play.
const groundGlow = new THREE.PointLight(GLOWSTICK_COLOR, 0, GLOWSTICK_GLOW, 1.0);
// Stays visible for the whole run at zero intensity. three skips invisible
// objects when it builds the lighting state, so toggling `visible` would
// change the light count and trigger the same full recompile we're avoiding.
groundGlow.visible = true;
scene.add(groundGlow);
function placeGroundGlow(obj) {
  if (!obj) { groundGlow.intensity = 0; return; }
  obj.getWorldPosition(groundGlow.position);
  groundGlow.position.y += 0.04;
  groundGlow.intensity = 0.9;
}

const HELD_GLOW_RANGE = 11;           // metres of usable light around you
const HELD_GLOW_MAX = 28;
const heldGlow = new THREE.PointLight(GLOWSTICK_COLOR, 0, HELD_GLOW_RANGE, 1.35);
heldGlow.visible = true;      // never toggled, for the same reason as groundGlow
scene.add(heldGlow);
const _glowRight = new THREE.Vector3(), _glowFwd = new THREE.Vector3();
function updateHeldGlow(dt) {
  const on = equipped === glowstickItem && !held;
  const want = on ? HELD_GLOW_MAX : 0;
  heldGlow.intensity += (want - heldGlow.intensity) * Math.min(1, dt * 7);
  if (heldGlow.intensity <= 0.05) return;
  // sit it out to the right and a little below eye line, where the hand is
  camera.getWorldDirection(_glowFwd);
  _glowRight.crossVectors(_glowFwd, camera.up).normalize();
  heldGlow.position.copy(camera.position)
    .addScaledVector(_glowFwd, 0.45)
    .addScaledVector(_glowRight, 0.34);
  heldGlow.position.y = camera.position.y - 0.5;
}

const glowstickItem = {
  name: 'Glowstick', icon: makeGlowstickIcon(), viewmodel: glowstickVM,
  use: () => toggleEquip(glowstickItem),
};

const mounds = [];
{
  // spread them thinly from just past the spawn down to near the lighthouse
  let z = -28;
  while (z > END_Z + 40) {
    const x = 3.0 + Math.random() * (CLIFF_BLOCK_X - 5.0);
    const m = makeMound();
    m.position.set(x, 0, z);
    scene.add(m);
    mounds.push({ root: m, x, z, taken: false });
    z -= 60 + Math.random() * 90;           // "fairly rare" — ~60–150 m apart
  }
}
function moundAt(x, z) {
  for (const m of mounds) {
    if (m.taken) continue;
    const dx = x - m.x, dz = z - m.z;
    if (dx * dx + dz * dz < 1.6 * 1.6) return m;
  }
  return null;
}
let moundFinds = 0;
function revealMoundNear(x, z, fwdX = 0, fwdZ = -1) {
  const m = moundAt(x, z);
  if (!m) return;
  m.taken = true;
  scene.remove(m.root);
  spawnPuffs(m.x, m.z, 14, fwdX, fwdZ);
  sfxDigImpact();
  moundFinds++;

  const first = moundFinds === 1;              // the first cache always holds the glowstick
  const relic = first ? makeGlowstick() : makeBuriedObject();
  relic.position.set(m.x, first ? 0.055 : 0.09, m.z);
  relic.rotation.set(first ? 0 : (Math.random() - 0.5) * 0.5, Math.random() * Math.PI * 2, first ? 0 : (Math.random() - 0.5) * 0.4);
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  proxy.name = 'hitProxy'; relic.add(proxy);
  scene.add(relic);
  if (first) { relic.updateMatrixWorld(true); placeGroundGlow(relic); }
  addInteractable(relic, first ? 'Take the glowstick' : 'Take the buried object', 'inventory', {
    onActivate: () => {
      if (first) sfxGlassPick(); else sfxThud(0.04);
      scene.remove(relic);
      if (first) placeGroundGlow(null);       // the held light takes over
      hovered = null;
      if (first) { addToInventory(glowstickItem); toggleEquip(glowstickItem); }
      else addToInventory({ name: 'Buried object', icon: '📦', use: () => openNote('A small buried object.\n\n(placeholder — what it is comes later.)') });
    },
  });
}

// ------------------------------------------------------------------
// Shells you can pick up. Hold one to your ear and there's something
// under the sea-roar that isn't the sea.
// ------------------------------------------------------------------
function makeShellIcon(spiral) {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#d8c9b4';
  if (spiral) {
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, a = t * Math.PI * 5.2, r = 19 * (1 - t) + 2;
      const x = 24 + Math.cos(a) * r * 0.75, y = 26 - t * 16 + Math.sin(a) * r * 0.5;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = '#d8c9b4'; g.lineWidth = 5; g.lineCap = 'round'; g.stroke();
  } else {
    g.beginPath(); g.moveTo(24, 40);
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI;
      g.lineTo(24 + Math.cos(a) * 19, 40 + Math.sin(a) * 19 * 0.92);
    }
    g.closePath(); g.fill();
    g.strokeStyle = '#a8977e'; g.lineWidth = 1.2;
    for (let i = 1; i < 6; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      g.beginPath(); g.moveTo(24, 40); g.lineTo(24 + Math.cos(a) * 18, 40 + Math.sin(a) * 17); g.stroke();
    }
  }
  return c.toDataURL();
}
const SHELL_ICONS = [makeShellIcon(false), makeShellIcon(true)];
const shells = [];
{
  // a handful along the wrack line, spread the length of the walk
  let z = -12;
  for (let i = 0; i < 7; i++) {
    const spiral = i % 2 === 1;
    const m = spiral ? makeSpiralShell() : makeFanShell();
    const sc = 1.25 + Math.random() * 0.8;
    m.scale.setScalar(sc);
    m.position.set(1.6 + Math.random() * 3.6, 0.012, z);
    m.rotation.set(spiral ? Math.PI / 2 : (Math.random() - 0.5) * 0.3, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.4);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.name = 'hitProxy'; m.add(hit);
    scene.add(m);
    shells.push(m);
    const icon = SHELL_ICONS[spiral ? 1 : 0];
    addInteractable(m, 'Take the shell', 'inventory', {
      onActivate: () => {
        sfxThud(0.02);
        scene.remove(m);
        hovered = null;
        const vm = spiral ? makeSpiralShell() : makeFanShell();
        vm.scale.setScalar(spiral ? 1.5 : 1.9);
        vm.position.set(0, -0.02, 0.01);
        vm.rotation.set(spiral ? 1.1 : 0.5, 0.6, spiral ? 0.4 : 0.2);
        vm.visible = false;
        toolMount.add(vm);
        const item = {
          id: 'shell', name: spiral ? 'Spiral shell' : 'Fan shell', icon,
          viewmodel: vm,
          onListen: true,                       // click while holding it
          use: () => toggleEquip(item),
        };
        addToInventory(item);
        toggleEquip(item);                      // it goes straight into your hand
      },
    });
    z -= 22 + Math.random() * 46;
  }
}

/* Holding it to your ear. The roar is synthesised — noise through a pair of
 * tight resonant peaks, which is physically what a shell does to room noise —
 * and a voice bed sits underneath it, filtered down until it's only ever
 * almost words. */
let shellVoice = null, listening = false;
function listenToShell() {
  const ctx = audioCtx;
  if (!ctx || listening) return;
  listening = true;
  const t = ctx.currentTime, DUR = 9;
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.linearRampToValueAtTime(1, t + 1.2);
  out.gain.setValueAtTime(1, t + DUR - 2.2);
  out.gain.linearRampToValueAtTime(0, t + DUR);
  out.connect(ctx.destination);

  // the roar: noise through two resonant peaks, like a cavity
  const src = noiseBurst(DUR, () => 1);
  src.loop = true;
  const peaks = [520, 1180];
  for (const f of peaks) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 7.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13 + Math.random() * 0.1;
    const lg = ctx.createGain(); lg.gain.value = f * 0.06;
    lfo.connect(lg).connect(bp.frequency);
    lfo.start(t); lfo.stop(t + DUR);
    const g = ctx.createGain(); g.gain.value = 0.16;
    src.connect(bp).connect(g).connect(out);
  }
  src.start(t); src.stop(t + DUR);

  // and the thing under it
  shellVoice = new Audio(Math.random() < 0.5 ? 'assets/whisper1.m4a' : 'assets/whisper2.m4a');
  shellVoice.loop = true;
  try {
    const vs = ctx.createMediaElementSource(shellVoice);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 260;
    const vg = ctx.createGain(); vg.gain.value = 0.055;     // barely there on purpose
    vs.connect(lp).connect(hp).connect(vg).connect(out);
    shellVoice.play().catch(() => {});
  } catch (e) {}

  setPrompt('You hold it to your ear&hellip;');
  setTimeout(() => {
    listening = false;
    if (shellVoice) { shellVoice.pause(); shellVoice = null; }
    if (promptHTML.includes('ear')) setPrompt('');
  }, DUR * 1000);
}

// ------------------------------------------------------------------
// The crab — comes out of the surf at you partway down the beach. Small,
// fast, and it takes three nips to put you down. A shovel swing kills it.
// ------------------------------------------------------------------
const CRAB_Z = -20;                    // where it's waiting, well before Bradly
const CRAB_WAKE = 17;                  // it notices you at this range
const CRAB_SPEED = 2.35;
const CRAB_REACH = 1.45;               // how close it gets before it nips
const CRAB_COOLDOWN = 1.5;             // seconds between nips
const CRAB_KILL_RADIUS = 1.5;          // how near a shovel strike has to land
// Built around a `rig` group so the whole animal can be pitched, rolled and
// bounced by the gait without disturbing its heading. Each leg is a two-bone
// chain hung off a hip, so it can actually reach forward, plant, and drag
// back rather than just waggling on the spot.
function makeCrab() {
  const g = new THREE.Group();
  const rig = new THREE.Group();
  g.add(rig);

  const shell = new THREE.MeshStandardMaterial({ color: 0x8e3a29, roughness: 0.72, metalness: 0.05, flatShading: true, emissive: 0x35120b });
  const dark = new THREE.MeshStandardMaterial({ color: 0x5e2418, roughness: 1, flatShading: true, emissive: 0x1d0906 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xb08163, roughness: 0.85, flatShading: true, emissive: 0x2a1a12 });

  const BODY_Y = 0.20;
  const carapace = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), shell);
  carapace.scale.set(1.75, 0.42, 1.05);
  carapace.position.y = BODY_Y;
  // a paler underside so it reads when it rears up
  const belly = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 0), pale);
  belly.scale.set(1.6, 0.22, 0.95);
  belly.position.y = BODY_Y - 0.05;
  // a ridged brow over the eyes
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 0.07), shell);
  brow.position.set(0, BODY_Y + 0.06, -0.15);
  rig.add(carapace, belly, brow);

  // eye stalks — kept so they can swivel toward you
  const eyes = [];
  for (const s of [-1, 1]) {
    const stalk = new THREE.Group();
    stalk.position.set(s * 0.075, BODY_Y + 0.05, -0.15);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.10, 5), dark);
    rod.position.y = 0.05;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.25, metalness: 0.1, emissive: 0x140505 }));
    ball.position.y = 0.105;
    stalk.add(rod, ball);
    rig.add(stalk);
    eyes.push(stalk);
  }

  // claws: shoulder → forearm → the pincer itself, so it can open and close
  const claws = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.24, BODY_Y - 0.02, -0.10);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.075), shell);
    upper.position.set(s * 0.04, 0, -0.04);
    shoulder.add(upper);

    const fore = new THREE.Group();
    fore.position.set(s * 0.07, 0, -0.08);
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.06, 0.10), shell);
    forearm.position.z = -0.05;
    fore.add(forearm);

    // the pincer — a fixed lower jaw and a hinged upper one
    const pincer = new THREE.Group();
    pincer.position.z = -0.10;
    const lower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), shell);
    lower.scale.set(0.75, 0.4, 1.25);
    lower.position.set(0, -0.022, -0.05);
    const upperJaw = new THREE.Group();
    const uj = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), shell);
    uj.scale.set(0.72, 0.38, 1.2);
    uj.position.set(0, 0.02, -0.05);
    upperJaw.add(uj);
    pincer.add(lower, upperJaw);
    fore.add(pincer);
    shoulder.add(fore);
    rig.add(shoulder);
    claws.push({ shoulder, fore, jaw: upperJaw, side: s });
  }

  // eight walking legs, four a side, each a hip + femur + tibia chain
  const legMat = new THREE.MeshStandardMaterial({ color: 0x7a3a29, roughness: 0.8, flatShading: true, emissive: 0x2a0f09 });
  const legs = [];
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const hip = new THREE.Group();
    const z0 = -0.10 + i * 0.085;
    hip.position.set(s * 0.17, BODY_Y - 0.03, z0);
    // a stubby coxa buried in the body, then the long femur
    const coxa = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.055), legMat);
    coxa.position.x = s * 0.03;
    const femur = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.048), legMat);
    femur.position.x = s * 0.115;
    hip.add(coxa, femur);

    const knee = new THREE.Group();
    knee.position.x = s * 0.20;
    const tibia = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.17, 0.042), legMat);
    tibia.position.y = -0.085;
    const foot = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 4), dark);
    foot.position.y = -0.19;
    foot.rotation.x = Math.PI;
    knee.add(tibia, foot);
    hip.add(knee);
    rig.add(hip);
    // Two interleaved sets step together (an alternating tripod), and within
    // a set the legs run a wave down the body — front foot first.
    legs.push({ hip, knee, side: s, idx: i, group: (i + (s > 0 ? 1 : 0)) % 2 });
  }

  g.userData = { rig, claws, legs, eyes, bodyY: BODY_Y };
  return g;
}

const crab = makeCrab();
crab.position.set(-7.5, 0, CRAB_Z);          // well out, submerged from the start
crab.scale.setScalar(1.55);                  // big enough to be a real threat
crab.visible = true;
scene.add(crab);
/* The enemy's body is TwilightFox's "Animated Crab rigged FREE" (Sketchfab
 * Standard licence). The procedural rig stays in the file but is switched off
 * once the model lands — all the AI, the submersion and the death still drive
 * the same `crab` group, so only the visual changes.
 *
 * The file ships one 0.48 s clip and no others, so there's no separate idle
 * or attack: the clip's rate is scaled by how fast it's actually moving, and
 * the rear-up and lunge stay as transforms on the group.
 */
let crabMixer = null, crabAction = null, crabModel = null;
new GLTFLoader().load('assets/crab.glb', (gltf) => {
  crabModel = gltf.scene;
  const orange = new THREE.MeshStandardMaterial({
    color: 0xc4531f, roughness: 0.72, metalness: 0.04,
    emissive: 0x3a1206, flatShading: true,
  });
  crabModel.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) {
      o.material = orange;
      o.frustumCulled = false;
    }
  });
  // Fit from the raw geometry bounds. Box3.setFromObject() on a skinned
  // hierarchy reports the bind pose through the bone transforms and comes
  // back wrong — it produced a 16x blow-up before this.
  let gmin = null, gmax = null;
  crabModel.traverse((o) => {
    if (!o.geometry) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox;
    gmin = gmin ? gmin.min(b.min) : b.min.clone();
    gmax = gmax ? gmax.max(b.max) : b.max.clone();
  });
  if (gmin) {
    const size = gmax.clone().sub(gmin);
    const k = 0.62 / Math.max(1e-6, Math.max(size.x, size.z));
    crabModel.scale.setScalar(k);
    crabModel.position.y = -gmin.y * k;
  }
  crab.userData.rig.visible = false;          // retire the built one
  crab.add(crabModel);
  if (gltf.animations && gltf.animations.length) {
    crabMixer = new THREE.AnimationMixer(crabModel);
    crabAction = crabMixer.clipAction(gltf.animations[0]);
    crabAction.play();
  }
}, undefined, () => {});

const crabState = { alive: true, awake: false, atkT: 0, scuttle: 0, deadT: 0, rear: 0, lunge: 0 };
const _crabDir = new THREE.Vector3();

// ---- gibs + blood ---------------------------------------------------
// The crab doesn't slump over any more — the shovel takes it apart. Chunks
// of shell tumble off with their own little rigid body, blood arcs out and
// lands, and what's left soaks into the sand.
const gibs = [];
const bloodDrops = [];
const GIB_MAT = new THREE.MeshStandardMaterial({ color: 0x8e3a29, roughness: 0.72, metalness: 0.05, flatShading: true, emissive: 0x35120b });
const GIB_MAT_DK = new THREE.MeshStandardMaterial({ color: 0x5e2418, roughness: 1, flatShading: true, emissive: 0x1d0906 });
const GIB_MAT_WET = new THREE.MeshStandardMaterial({ color: 0x6d1410, roughness: 0.45, metalness: 0.1, flatShading: true, emissive: 0x2a0604 });
const BLOOD_MAT = new THREE.MeshStandardMaterial({ color: 0x400807, roughness: 0.4, metalness: 0.05, flatShading: true, emissive: 0x120202 });

// a splat decal that soaks in and stays
function makeBloodTexture() {
  const S = 128;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const blob = (x, y, r, a) => {
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(72,10,9,${a})`);
    grd.addColorStop(0.62, `rgba(50,7,6,${a * 0.72})`);
    grd.addColorStop(1, 'rgba(42,6,6,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  blob(64, 64, 34, 0.95);
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, d = 14 + Math.random() * 42;
    blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 3 + Math.random() * 11, 0.6 + Math.random() * 0.35);
  }
  const img = g.getImageData(0, 0, S, S), px = img.data;
  for (let i = 0; i < px.length; i += 4) { px[i] &= 0xF0; px[i + 1] &= 0xF0; px[i + 2] &= 0xF0; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  return t;
}
const BLOOD_POOL = 10;
const bloodGeo = new THREE.PlaneGeometry(1, 1); bloodGeo.rotateX(-Math.PI / 2);
const bloodDecals = new THREE.InstancedMesh(bloodGeo,
  new THREE.MeshBasicMaterial({ map: makeBloodTexture(), transparent: true, depthWrite: false }), BLOOD_POOL);
bloodDecals.frustumCulled = false; bloodDecals.renderOrder = 3;
bloodDecals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
{ const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < BLOOD_POOL; i++) bloodDecals.setMatrixAt(i, hide); }
scene.add(bloodDecals);
let bloodIdx = 0;
const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _be = new THREE.Euler(), _bs = new THREE.Vector3();
function stampBlood(x, z, size) {
  if (inWater(x, z)) return;                 // washes straight off the wet sand
  _be.set(0, Math.random() * Math.PI * 2, 0); _bq.setFromEuler(_be);
  _bs.set(size, 1, size * (0.85 + Math.random() * 0.3));
  _bm.compose(new THREE.Vector3(x, 0.035, z), _bq, _bs);
  bloodDecals.setMatrixAt(bloodIdx, _bm);
  bloodIdx = (bloodIdx + 1) % BLOOD_POOL;
  bloodDecals.instanceMatrix.needsUpdate = true;
}

function burstCrab() {
  const p = crab.position, S = crab.scale.x;
  // pieces of shell, claw and leg
  const shapes = [
    () => new THREE.IcosahedronGeometry(0.11, 0),
    () => new THREE.TetrahedronGeometry(0.13, 0),
    () => new THREE.BoxGeometry(0.16, 0.05, 0.09),
    () => new THREE.DodecahedronGeometry(0.08, 0),
  ];
  for (let i = 0; i < 16; i++) {
    const mat = i % 5 === 0 ? GIB_MAT_WET : (i % 2 ? GIB_MAT : GIB_MAT_DK);
    const m = new THREE.Mesh(shapes[i % shapes.length](), mat);
    const sc = (0.5 + Math.random() * 0.9) * S;
    m.scale.set(sc, sc * (0.5 + Math.random() * 0.6), sc * (0.7 + Math.random() * 0.6));
    m.position.set(p.x + (Math.random() - 0.5) * 0.3, 0.22 * S + Math.random() * 0.2, p.z + (Math.random() - 0.5) * 0.3);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    scene.add(m);
    const a = Math.random() * Math.PI * 2, out = 0.7 + Math.random() * 1.7;
    gibs.push({
      m,
      vel: new THREE.Vector3(Math.cos(a) * out, 2.1 + Math.random() * 2.3, Math.sin(a) * out),
      spin: new THREE.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16),
      rest: 0.03 + Math.random() * 0.05,
      life: 26,
    });
  }
  // blood, thrown out with the pieces
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.032 * (0.5 + Math.random()), 0), BLOOD_MAT);
    m.position.set(p.x + (Math.random() - 0.5) * 0.2, 0.25 * S, p.z + (Math.random() - 0.5) * 0.2);
    scene.add(m);
    const a = Math.random() * Math.PI * 2, out = 1.1 + Math.random() * 2.6;
    bloodDrops.push({
      m,
      vel: new THREE.Vector3(Math.cos(a) * out, 2.0 + Math.random() * 3.0, Math.sin(a) * out),
      life: 4,
    });
  }
  stampBlood(p.x, p.z, 1.1 + Math.random() * 0.5);
  spawnPuffs(p.x, p.z, 12, 0, -1, 0.14);
}

function updateGibs(dt) {
  for (let i = gibs.length - 1; i >= 0; i--) {
    const g = gibs[i];
    g.life -= dt;
    if (g.life <= 0) { scene.remove(g.m); g.m.geometry.dispose(); gibs.splice(i, 1); continue; }
    if (g.settled) continue;
    g.vel.y -= 15 * dt;
    g.m.position.addScaledVector(g.vel, dt);
    g.m.rotation.x += g.spin.x * dt; g.m.rotation.y += g.spin.y * dt; g.m.rotation.z += g.spin.z * dt;
    if (g.m.position.y <= g.rest) {
      g.m.position.y = g.rest;
      if (Math.abs(g.vel.y) > 1.1) {
        g.vel.y = -g.vel.y * 0.28;               // one or two small bounces
        g.vel.x *= 0.6; g.vel.z *= 0.6;
        g.spin.multiplyScalar(0.5);
      } else {
        g.settled = true;
        g.vel.set(0, 0, 0);
        if (Math.random() < 0.5) stampBlood(g.m.position.x, g.m.position.z, 0.3 + Math.random() * 0.35);
      }
    }
  }
  for (let i = bloodDrops.length - 1; i >= 0; i--) {
    const b = bloodDrops[i];
    b.life -= dt;
    b.vel.y -= 17 * dt;
    b.m.position.addScaledVector(b.vel, dt);
    if (b.m.position.y <= 0.02 || b.life <= 0) {
      // it lands and soaks in
      if (b.m.position.y <= 0.02) stampBlood(b.m.position.x, b.m.position.z, 0.16 + Math.random() * 0.3);
      scene.remove(b.m); b.m.geometry.dispose(); bloodDrops.splice(i, 1);
    }
  }
}

function killCrab() {
  if (!crabState.alive) return;
  crabState.alive = false;
  crabState.deadT = 0;
  crab.visible = false;                        // it comes apart instead
  burstCrab();
  sfxCrabDie();
  addTrauma(0.85);                             // the hit lands
  hitstop = 0.075;      // ~4.5 frames at 60fps
}

// pose one leg: `ph` is its phase through the step cycle (0..1)
function poseLeg(leg, ph, reach) {
  // stance for most of the cycle, a quick lifted swing for the rest
  const swinging = ph > 0.62;
  const t = swinging ? (ph - 0.62) / 0.38 : ph / 0.62;
  // fore/aft travel: drags back while planted, whips forward while lifted
  const drive = swinging ? -1 + 2 * t : 1 - 2 * t;
  leg.hip.rotation.y = drive * 0.62 * reach * leg.side;
  // lift only during the swing, eased so the foot doesn't pop
  const lift = swinging ? Math.sin(t * Math.PI) : 0;
  leg.hip.rotation.z = leg.side * (-0.30 - lift * 0.75 * reach);
  // the knee straightens as the leg extends, folds as it comes under the body
  leg.knee.rotation.z = leg.side * (0.55 + lift * 0.35 + drive * 0.12);
}

function updateCrab(dt) {
  const ud = crab.userData;
  if (!crabState.alive) { if (crabMixer) crabMixer.update(0); return; }
  if (frozen()) return;

  const dx = camera.position.x - crab.position.x;
  const dz = camera.position.z - crab.position.z;
  const dist = Math.hypot(dx, dz);
  if (!crabState.awake) {
    // stays under until it comes for you
    crab.visible = submersionAt(crab.position.x, crab.position.z) < 0.92;
    if (dist > CRAB_WAKE) return;
    crabState.awake = true;
    crabState.rear = 1;                       // it rears up as it notices you
    sfxCrabWake();
  }

  crabState.atkT = Math.max(0, crabState.atkT - dt);
  crabState.lunge = Math.max(0, (crabState.lunge || 0) - dt * 3.4);
  crabState.rear = Math.max(0, (crabState.rear || 0) - dt * 1.2);

  const closing = dist > CRAB_REACH;
  if (closing) {
    _crabDir.set(dx / dist, 0, dz / dist);
    // it slows as it comes into range rather than sliding to a dead stop
    const speed = CRAB_SPEED * THREE.MathUtils.clamp((dist - CRAB_REACH) / 1.2, 0.35, 1);
    crab.position.addScaledVector(_crabDir, speed * dt);
    crabState.scuttle += dt * speed * 5.2;
    // it goes sideways, the way crabs do, but keeps its eyes on you
    crab.rotation.y = Math.atan2(_crabDir.x, _crabDir.z) + Math.PI / 2;
    if (inWater(crab.position.x, crab.position.z) && Math.random() < dt * 4) {
      spawnSplash(crab.position.x, crab.position.z, 2, _crabDir.x, _crabDir.z, 0.4);
      if (Math.random() < 0.25) sfxSplash(0.35);   // sloshing as it comes in
      addRipple(crab.position.x, crab.position.z, 0.55);
    }
  } else {
    crabState.scuttle += dt * 2.2;            // shifting its weight, waiting
  }

  // ---- gait -------------------------------------------------------
  const reach = closing ? 1 : 0.25;
  if (crabMixer) {
    // one clip for everything, so the rate carries the difference between
    // shifting its weight and running at you
    if (crabAction) crabAction.timeScale = closing ? 1.35 : 0.32;
    crabMixer.update(dt);
  }
  const cyc = crabState.scuttle / (Math.PI * 2);
  for (const leg of ud.legs) {
    // half a cycle between the two sets, then a visible ripple along each set
    poseLeg(leg, (cyc + leg.group * 0.5 + leg.idx * 0.11) % 1, reach);
  }
  // the body rocks with the tripod and rides a little higher when roused
  const rear = crabState.rear;
  const lunge = crabState.lunge;
  // While it's still in the surf the water covers it — it only comes fully
  // clear once it's crawled out onto the sand.
  const bob = Math.abs(Math.sin(crabState.scuttle)) * 0.018 * reach;
  // Sunk well clear of the surface: the ocean mesh only has vertices every
  // ~6 m, so the drawn surface can sit a long way below the analytic height
  // at any given point. Deep enough that the interpolation can't expose it.
  const sub = submersionAt(crab.position.x, crab.position.z);
  crab.position.y = restYInWater(crab.position.x, crab.position.z, 1.15) + bob;
  // hidden entirely while it's still under — you get the wake, not the crab
  crab.visible = sub < 0.92;
  if (sub > 0.25 && crabState.awake) {
    crabState.wakeRipple = (crabState.wakeRipple || 0) - dt;
    if (crabState.wakeRipple <= 0) {
      addRipple(crab.position.x, crab.position.z, 0.5 + sub * 0.6);
      crabState.wakeRipple = 0.22;
    }
  }
  ud.rig.rotation.z = Math.sin(crabState.scuttle) * 0.09 * reach;
  ud.rig.rotation.x = -rear * 0.30 - lunge * 0.38 + Math.sin(crabState.scuttle * 2) * 0.035 * reach;
  ud.rig.position.y = rear * 0.06 + lunge * 0.05;

  // claws: weave while it advances, thrown wide when it rears, snapped
  // shut through the lunge
  for (const c of ud.claws) {
    const weave = Math.sin(crabState.scuttle * 0.8 + (c.side > 0 ? 1.7 : 0)) * 0.16 * reach;
    c.shoulder.rotation.y = c.side * (-0.15 - rear * 0.55) + weave;
    c.shoulder.rotation.x = -rear * 0.5 - lunge * 0.15 + weave * 0.4;
    c.fore.rotation.x = -0.1 - rear * 0.35 + lunge * 0.5;
    // the pincer gapes, then bites
    const gape = lunge > 0.55 ? 0 : (0.32 + rear * 0.35) * (1 - lunge);
    c.jaw.rotation.x = -gape;
  }
  // eye stalks lean toward you
  for (let i = 0; i < ud.eyes.length; i++) {
    ud.eyes[i].rotation.x = -0.12 - rear * 0.25;
    ud.eyes[i].rotation.z = (i ? -1 : 1) * (0.1 + rear * 0.2);
  }

  if (!closing && crabState.atkT <= 0) {
    crabState.atkT = CRAB_COOLDOWN;
    crabState.lunge = 1;                       // drives the strike pose above
    sfxCrabSnip();
    damagePlayer(1);
  }
}

// ------------------------------------------------------------------
// Blue-blood readout — the actual jar model, shrunk down and turning on
// the spot in the top-left corner, with the amount beside it. Rendered as
// a scissored corner viewport over the main scene each frame.
// ------------------------------------------------------------------
const HUD_JAR_PX = 52;                      // on-screen size of the corner view
const hudScene = new THREE.Scene();
const hudCamera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
hudCamera.position.set(0, 0, 1);
hudScene.add(new THREE.AmbientLight(0xcfe0ee, 3.2));
{
  const k = new THREE.DirectionalLight(0xffffff, 4.5); k.position.set(0.6, 1, 0.8); hudScene.add(k);
  const r = new THREE.DirectionalLight(0x9fd4f0, 2.2); r.position.set(-0.8, 0.2, -0.5); hudScene.add(r);
  const b = new THREE.DirectionalLight(0xffffff, 1.6); b.position.set(0, -0.6, 1); hudScene.add(b);
}
const hudJarPivot = new THREE.Group();
hudScene.add(hudJarPivot);
const hudJar = makeBloodJar();
hudJarPivot.add(hudJar);
{
  // centre it on the pivot and frame it in the little viewport
  const box = new THREE.Box3().setFromObject(hudJar);
  const size = box.getSize(new THREE.Vector3());
  const mid = box.getCenter(new THREE.Vector3());
  const k = 0.60 / Math.max(size.x, size.y, size.z);
  hudJar.scale.setScalar(k);
  hudJar.position.copy(mid).multiplyScalar(-k);
  hudJar.userData.setFill(0);
}
let jarSpin = 0, bloodPulse = 0;
function updateBloodReadout() { bloodAmtEl.textContent = String(bloodAmount); }
function renderBloodJar(dt) {
  if (!bloodSeen || !bloodEl.classList.contains('show')) return;
  jarSpin += dt * 1.1;
  bloodPulse = Math.max(0, bloodPulse - dt * 1.4);
  hudJarPivot.rotation.y = jarSpin;
  hudJarPivot.rotation.x = 0.16 + Math.sin(jarSpin * 0.5) * 0.04;
  hudJarPivot.scale.setScalar(1 + bloodPulse * 0.18);

  // the DOM element tells us where to put the corner viewport
  const r = bloodEl.getBoundingClientRect();
  const x = r.left, y = window.innerHeight - r.top - HUD_JAR_PX - 2;
  renderer.setScissorTest(true);
  renderer.setViewport(x, y, HUD_JAR_PX, HUD_JAR_PX);
  renderer.setScissor(x, y, HUD_JAR_PX, HUD_JAR_PX);
  renderer.clearDepth();
  renderer.render(hudScene, hudCamera);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
}

// ------------------------------------------------------------------
// Bradly Beach — a guy up on the sand cliff, a little further down the
// beach from where the glowstick turns up. Cut-out sprite, always facing
// you. Getting close (or pressing E) starts a scripted exchange and the
// camera pushes in on him for the duration.
// ------------------------------------------------------------------
const BRADLY_H = 1.86;                     // his height in metres
// Stand-in until assets/bradly.png exists — a flat dark silhouette, so the
// encounter is playable and correctly placed before the real cut-out lands.
function makeBradlyPlaceholder() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(9, 13, 19, 0.94)';
  g.beginPath(); g.arc(64, 32, 19, 0, Math.PI * 2); g.fill();
  g.fillRect(41, 52, 46, 86);
  g.fillRect(25, 58, 13, 78); g.fillRect(90, 58, 13, 78);
  g.fillRect(45, 138, 16, 106); g.fillRect(67, 138, 16, 106);
  return new THREE.CanvasTexture(c);
}
const bradly = new THREE.Group();
const bradlyMat = new THREE.SpriteMaterial({
  map: makeBradlyPlaceholder(), transparent: true, alphaTest: 0.35,
});
const bradlySprite = new THREE.Sprite(bradlyMat);
bradlySprite.scale.set(BRADLY_H * 0.55, BRADLY_H, 1);
bradlySprite.position.y = BRADLY_H / 2;
bradly.add(bradlySprite);
/* Bradly is a photo cut-out (assets/bradly.png, made by tools/cutout.swift),
 * pushed through the same treatment the rest of the game gets: knocked down
 * to a low pixel count, posterised to a handful of levels per channel, and
 * graded cold and sickly so he sits in the night palette instead of looking
 * like a photo pasted on the beach.
 *
 * Blink. With one still image the trick is a fake eyelid: copy a thin band
 * of forehead from just above the eyes and paint it down over them. Both
 * frames are baked once at load and we just swap the texture. BRADLY_EYES is
 * in fractions of the source image from the top-left — tune it live with
 * __bw.setEyes({ y: 0.07 }). */
// measured off the cut-out: forehead peaks bright around y=0.05, the eyes are
// the dark band at y=0.072–0.092
const BRADLY_EYES = { x: 0.41, y: 0.072, w: 0.21, h: 0.022 };
const BRADLY_PIX = 260;             // texture height in pixels — the chunkiness
const BRADLY_LEVELS = 6;            // posterisation steps per channel
let bradlyOpenTex = null, bradlyShutTex = null, bradlySrcImg = null;
let blinkT = 2 + Math.random() * 3, blinking = false;

function bakeBradlyFrames(img) {
  bradlySrcImg = img;
  const mk = (shut) => {
    // 1. full-res pass, with the eyelid painted in for the shut frame
    const full = document.createElement('canvas');
    full.width = img.width; full.height = img.height;
    const fg = full.getContext('2d');
    fg.drawImage(img, 0, 0);
    if (shut) {
      const ex = BRADLY_EYES.x * img.width, ew = BRADLY_EYES.w * img.width;
      const ey = BRADLY_EYES.y * img.height, eh = Math.max(2, BRADLY_EYES.h * img.height);
      // stretch the strip above the eyes down across them
      fg.drawImage(full, ex, ey - eh * 1.25, ew, eh, ex, ey, ew, eh);
    }

    // 2. knock it down to sprite resolution
    const hh = BRADLY_PIX;
    const ww = Math.max(1, Math.round(img.width * (hh / img.height)));
    const c = document.createElement('canvas');
    c.width = ww; c.height = hh;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(full, 0, 0, ww, hh);

    // 3. hard alpha, posterise, grade
    const id = g.getImageData(0, 0, ww, hh);
    const px = id.data;
    const step = 255 / (BRADLY_LEVELS - 1);
    for (let i = 0; i < px.length; i += 4) {
      // the segmentation leaves a soft, bright fringe — cut it away cleanly
      if (px[i + 3] < 150) { px[i + 3] = 0; continue; }
      px[i + 3] = 255;

      let r = px[i], gg = px[i + 1], b = px[i + 2];
      // contrast around mid grey, then desaturate toward luma
      const lum = 0.299 * r + 0.587 * gg + 0.114 * b;
      const CON = 1.34, SAT = 0.55;
      r = lum + (r - lum) * SAT; gg = lum + (gg - lum) * SAT; b = lum + (b - lum) * SAT;
      r = (r - 128) * CON + 116; gg = (gg - 128) * CON + 122; b = (b - 128) * CON + 112;
      // sickly green-cyan cast; sprites aren't lit, so this is his final
      // brightness — keep him readable against the night sky
      r *= 0.86; gg *= 1.02; b *= 0.92;
      // a little grain before quantising so the bands break up
      const n = (Math.random() - 0.5) * 20;
      r += n; gg += n; b += n;
      // posterise
      px[i]     = Math.max(0, Math.min(255, Math.round(r / step) * step));
      px[i + 1] = Math.max(0, Math.min(255, Math.round(gg / step) * step));
      px[i + 2] = Math.max(0, Math.min(255, Math.round(b / step) * step));
    }
    g.putImageData(id, 0, 0);

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return retroTex(t, { repeatWrap: false });     // nearest filtering, stays chunky
  };
  bradlyOpenTex = mk(false);
  bradlyShutTex = mk(true);
  bradlyMat.map = bradlyOpenTex;
  bradlyMat.needsUpdate = true;
}
function updateBradlyBlink(dt) {
  if (!bradlyOpenTex) return;
  blinkT -= dt;
  if (blinkT > 0) return;
  blinking = !blinking;
  bradlyMat.map = blinking ? bradlyShutTex : bradlyOpenTex;
  bradlyMat.needsUpdate = true;
  // eyes shut for a beat, open for a few seconds — occasionally a double blink
  blinkT = blinking ? 0.11 : (Math.random() < 0.18 ? 0.16 : 2.4 + Math.random() * 3.4);
}
// swap in the real cut-out the moment it's available (silent if it isn't)
new THREE.TextureLoader().load('assets/bradly.png', (tex) => {
  const img = tex.image;
  if (!img || !img.width) return;
  bradlySprite.scale.set(BRADLY_H * (img.width / img.height), BRADLY_H, 1);
  bakeBradlyFrames(img);
}, undefined, () => {});
{
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.1, BRADLY_H, 0.8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.y = BRADLY_H / 2; hit.name = 'hitProxy';
  bradly.add(hit);
  // on the cliff top, ~10 m past the first buried cache. Feet sunk a touch
  // below the lip so the runnels in the cliff face don't leave him floating,
  // and kept near enough the edge to stay inside REACH for the E prompt.
  const gz = mounds.length ? mounds[0].z : -28;
  bradly.position.set(CLIFF_X - 0.45, CLIFF_H - 0.22, gz - 10);
}
scene.add(bradly);
addInteractable(bradly, 'Talk to him', 'npc', { onActivate: () => startDialog('start') });

// ------------------------------------------------------------------
// The tunnel in the sand wall, and the room at the end of it
// ------------------------------------------------------------------
/* A mouth bitten out of the cliff a few metres past Bradly, a long dark bore
 * running back into the headland, and a room at the far end.
 *
 * The cliff itself can't be holed: it's one long mesh that snaps back onto
 * the player every CLIFF_PERIOD, so a hole cut at one z would repeat every
 * 40 m down the beach. Instead the mouth is its own structure standing proud
 * of the wall — a rock surround with a black throat behind it — which reads
 * as an opening and stays put because it's a fixed world object.
 *
 * Movement in here is region-clamped rather than collided: the corridor is a
 * box in z, the room is a bigger box, and the beach's own CLIFF_BLOCK_X wall
 * is lifted only across the mouth. Simple, and it can't wedge you in a corner.
 */
const TUN_Z = bradly.position.z - 4.6;          // ~15 ft further along the walk
const TUN_HALF = 1.25;                          // corridor half-width
const TUN_H = 2.7;
const TUN_MOUTH_X = CLIFF_BLOCK_X - 0.6;        // where the beach wall opens
const TUN_BORE_X = CLIFF_X - 5.0;               // the bore's lip, proud of the dune
const TUN_END_X = CLIFF_X + 25;                 // corridor runs this far back
const ROOM_HALF = 4.2, ROOM_LEN = 8.6, ROOM_H = 3.3;
const ROOM_END_X = TUN_END_X + ROOM_LEN;

const tunnel = new THREE.Group();
scene.add(tunnel);

const caveMat = new THREE.MeshStandardMaterial({
  color: 0x4a4234, roughness: 1, metalness: 0,
  emissive: 0x0a0906, flatShading: true, side: THREE.DoubleSide,
});
const caveDark = new THREE.MeshStandardMaterial({
  color: 0x2a2620, roughness: 1, metalness: 0,
  emissive: 0x050403, flatShading: true, side: THREE.DoubleSide,
});

/* The bore. A tube along +X whose wall is pushed about per-ring so it narrows
 * and widens as you go — a straight pipe reads as a corridor, and this is
 * meant to read as something dug. */
{
  const LEN = TUN_END_X - TUN_BORE_X;
  const RINGS = 60, SIDES = 11;
  const g = new THREE.CylinderGeometry(1, 1, LEN, SIDES, RINGS, true);
  g.rotateZ(Math.PI / 2);                        // lay the axis along X
  const pos = g.attributes.position;
  const rnd = mulberry32(4711);
  const wob = Array.from({ length: 24 }, () => rnd());
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, y);
    const t = (x + LEN / 2) / LEN;               // 0 at the mouth, 1 at the room
    // squeeze in and out along its length, and roughen around the ring
    let r = 1.0
      + 0.16 * Math.sin(t * 11 + wob[0] * 6)
      + 0.10 * Math.sin(t * 23 + wob[1] * 6)
      + 0.13 * Math.sin(a * 3 + t * 9 + wob[2] * 6)
      + 0.08 * Math.sin(a * 7 - t * 14 + wob[3] * 6);
    const ny = y * r, nz = z * r;
    // wider than tall, and flat-bottomed so there's a floor to walk on
    pos.setXYZ(i, x, Math.max(-0.62, ny * (TUN_H / 2)), nz * TUN_HALF * 1.18);
  }
  g.computeVertexNormals();
  const bore = new THREE.Mesh(g, caveMat);
  bore.position.set(TUN_BORE_X + LEN / 2, 1.05, TUN_Z);
  bore.frustumCulled = false;
  tunnel.add(bore);

  // floor — sand run in from the beach, going darker the deeper you get
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(LEN, TUN_HALF * 2.5, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x5c5748, roughness: 1, emissive: 0x121009 }));
  fl.rotation.x = -Math.PI / 2;
  fl.position.set(TUN_BORE_X + LEN / 2, 0.005, TUN_Z);
  tunnel.add(fl);
}

/* The mouth. A ring of eroded rock standing proud of the cliff face, with a
 * black throat behind it so the opening reads as depth rather than a decal. */
{
  // No black quad here: a flat panel reads as a rectangle stuck on the wall.
  // The bore's own mouth stands proud of the dune toe, so what you look into
  // is the actual tube, and the boulders below dress its lip.

  // boulders crowding the opening, from the same generator as the beach rocks
  const rnd = mulberry32(9002);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + rnd() * 0.3;
    const rz = Math.cos(a) * (TUN_HALF + 0.55 + rnd() * 0.35);
    const ry = Math.sin(a) * (TUN_H * 0.52 + rnd() * 0.3) + TUN_H / 2 - 0.15;
    if (ry < 0.15) continue;                     // nothing floating at the sill
    const sc = 0.7 + rnd() * 1.0;
    const m = new THREE.Mesh(makeErodedRock(500 + i, 2), rockMatBeach);
    m.scale.set(sc, sc * (0.7 + rnd() * 0.5), sc);
    m.position.set(TUN_BORE_X + 0.15 + rnd() * 0.5, ry - sc * 0.3, TUN_Z + rz);
    m.rotation.set(rnd() * 3, rnd() * 6, rnd() * 3);
    m.frustumCulled = false;
    tunnel.add(m);
  }
  // spoil heaped either side of the sill, so it reads as dug out, not moulded
  for (let i = 0; i < 5; i++) {
    const sc = 0.8 + rnd() * 0.9;
    const m = new THREE.Mesh(makeErodedRock(560 + i, 2), rockMatBeach);
    m.scale.set(sc, sc * 0.45, sc);
    m.position.set(TUN_BORE_X - 0.7 - rnd() * 1.4, -0.08,
      TUN_Z + (rnd() < 0.5 ? -1 : 1) * (TUN_HALF + 0.5 + rnd() * 1.1));
    m.rotation.y = rnd() * 6;
    m.frustumCulled = false;
    tunnel.add(m);
  }
}

/* The room. Not the model from the reference folder — that hasn't reached me,
 * so this is a stand-in built to the same idea: a bare concrete cell at the
 * end of the bore, lit by one bulb, with something already in it. */
const theRoom = new THREE.Group();
theRoom.position.set(TUN_END_X + ROOM_LEN / 2, 0, TUN_Z);
tunnel.add(theRoom);
{
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x555049, roughness: 1, metalness: 0, emissive: 0x0b0a09,
    flatShading: true, side: THREE.BackSide,
  });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(ROOM_LEN, ROOM_H, ROOM_HALF * 2), wallMat);
  shell.position.y = ROOM_H / 2;
  shell.frustumCulled = false;
  theRoom.add(shell);

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x3e3a35, roughness: 1, emissive: 0x0a0908, flatShading: true });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_LEN, ROOM_HALF * 2), floorMat);
  fl.rotation.x = -Math.PI / 2; fl.position.y = 0.01;
  theRoom.add(fl);

  // the bulb — the only thing lighting it
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe3ad, fog: false }));
  bulb.position.set(0, ROOM_H - 0.55, 0);
  const flex = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x1a1815, roughness: 1 }));
  flex.position.set(0, ROOM_H - 0.28, 0);
  const roomLight = new THREE.PointLight(0xffd9a0, 5.2, 9, 1.7);
  roomLight.position.copy(bulb.position);
  theRoom.add(bulb, flex, roomLight);

  // a table and a chair, so it reads as somewhere someone was
  const wood = new THREE.MeshStandardMaterial({
    color: 0x4a3f30, roughness: 1, flatShading: true, emissive: 0x0e0b07 });
  const table = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.85), wood);
  top.position.y = 0.74; table.add(top);
  for (const [lx, lz] of [[-0.66, -0.34], [0.66, -0.34], [-0.66, 0.34], [0.66, 0.34]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.74, 0.07), wood);
    leg.position.set(lx, 0.37, lz); table.add(leg);
  }
  table.position.set(1.1, 0, -0.4);
  table.rotation.y = 0.22;
  theRoom.add(table);

  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.45), wood);
  seat.position.y = 0.45; chair.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.05), wood);
  back.position.set(0, 0.72, -0.2); chair.add(back);
  for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), wood);
    leg.position.set(lx, 0.225, lz); chair.add(leg);
  }
  chair.position.set(-0.4, 0, 0.5);
  chair.rotation.y = -0.8;
  theRoom.add(chair);
}

/* Two dim lamps down the bore. Created once and never toggled — revealing a
 * light later changes the lighting state and recompiles every material in the
 * scene, which is what caused the a-second-long freeze when digging a mound. */
for (const t of [0.22, 0.62]) {
  const lx = TUN_BORE_X + (TUN_END_X - TUN_BORE_X) * t;
  const lamp = new THREE.PointLight(0xffb070, 2.6, 7.5, 1.8);
  lamp.position.set(lx, 1.9, TUN_Z + TUN_HALF * 0.5);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xffcf94, fog: false }));
  glow.position.copy(lamp.position);
  tunnel.add(lamp, glow);
}
// a little light spilling out of the mouth, so you can find it from the beach
{
  const spill = new THREE.PointLight(0xffc08a, 1.5, 6, 2);
  spill.position.set(TUN_BORE_X + 0.4, 1.5, TUN_Z);
  tunnel.add(spill);
}

/* The cliff is one continuous surface and the bore runs straight through it,
 * so without this you'd see the sand wall slicing across the tunnel from the
 * inside. Same per-fragment discard the ocean and the sand already use, tested
 * in WORLD space because the cliff mesh recentres itself on the player. */
{
  const zc = TUN_Z.toFixed(3), zh = (TUN_HALF * 1.5).toFixed(3), yh = (TUN_H + 0.2).toFixed(3);
  cliff.material.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTunP;')
      .replace('#include <project_vertex>',
        '#include <project_vertex>\nvTunP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTunP;')
      .replace('#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\n if (abs(vTunP.z - ' + zc + ') < ' + zh +
        ' && vTunP.y < ' + yh + ') discard;');
  };
  cliff.material.customProgramCacheKey = () => 'clipTunnel';
  cliff.material.needsUpdate = true;
}

/* Where you're allowed to be. The corridor and the room are boxes; the beach's
 * cliff wall opens only across the mouth, and only down low, so you can't
 * stroll into the headland anywhere else. */
let insideTunnel = false;
function inTunnelMouth(z, feetY) {
  return Math.abs(z - TUN_Z) < TUN_HALF && feetY < TUN_H - 0.6;
}
function updateTunnelBounds() {
  const p = camera.position;
  // generous slack on the far side: the test has to be impossible to outrun,
  // or a big enough step would land past it and let you out the back wall
  insideTunnel = p.x > TUN_MOUTH_X - 0.4 && p.x < ROOM_END_X + 8
    && Math.abs(p.z - TUN_Z) < ROOM_HALF + 4;
  if (!insideTunnel) return;
  if (p.x < TUN_END_X) {
    // in the bore
    p.z = THREE.MathUtils.clamp(p.z, TUN_Z - TUN_HALF + PLAYER_R, TUN_Z + TUN_HALF - PLAYER_R);
    p.x = Math.min(p.x, TUN_END_X + 0.2);
  } else {
    // in the room
    p.z = THREE.MathUtils.clamp(p.z, TUN_Z - ROOM_HALF + PLAYER_R, TUN_Z + ROOM_HALF - PLAYER_R);
    p.x = Math.min(p.x, ROOM_END_X - PLAYER_R);
  }
}


// The script. Saying yes or no lands you in the same place — he was never
// really asking.
const BRADLY_SCRIPT = {
  start: {
    text: 'You working out down here?',
    choices: [{ label: 'Yes', to: 'tell' }, { label: 'No', to: 'tell' }],
  },
  tell: {
    text: "I can tell you aren't. Look at you.",
    choices: [{ label: 'Alright', to: 'water' }],
  },
  water: {
    text: "You don't even have a water on you, pussy.",
    choices: [],                            // he's done with you
  },
};

let dialogReturnLock = false, bradlyMet = false;
let dialogTarget = null, dialogCanDismiss = false;
let typeTimer = null, dialogEndTimer = null;
function typeLine(text, onDone) {
  clearInterval(typeTimer);
  dialogTextEl.textContent = '';
  dialogEl.classList.add('typing');
  let i = 0;
  typeTimer = setInterval(() => {
    dialogTextEl.textContent = text.slice(0, ++i);
    if (i >= text.length) {
      clearInterval(typeTimer);
      dialogEl.classList.remove('typing');
      onDone();
    }
  }, 28);
}
function showDialogNode(id) {
  const node = BRADLY_SCRIPT[id];
  if (!node) { endDialog(); return; }
  clearTimeout(dialogEndTimer);
  dialogChoicesEl.innerHTML = '';
  dialogCanDismiss = false;
  typeLine(node.text, () => {
    if (!node.choices.length) {
      // last word — it ends on its own, or on a click
      dialogCanDismiss = true;
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = 'he turns away';
      dialogChoicesEl.appendChild(hint);
      dialogEndTimer = setTimeout(endDialog, 2800);
      return;
    }
    for (const ch of node.choices) {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = ch.label;
      b.addEventListener('click', (e) => { e.stopPropagation(); showDialogNode(ch.to); });
      dialogChoicesEl.appendChild(b);
    }
  });
}
function startDialog(id) {
  if (dialogOpen || ended || !introDone) return;
  dialogOpen = true;
  bradlyMet = true;
  dialogTarget = bradlySprite.getWorldPosition(new THREE.Vector3());
  dialogSpeakerEl.textContent = 'Bradly Beach';
  dialogEl.classList.add('show');
  setPrompt('');
  crosshair.className = '';
  if (held) dropHeld();
  dialogReturnLock = locked;
  if (locked) document.exitPointerLock();
  refreshUI();
  showDialogNode(id);
}
function endDialog() {
  if (!dialogOpen) return;
  clearTimeout(dialogEndTimer); clearInterval(typeTimer);
  dialogOpen = false;
  dialogCanDismiss = false;
  dialogTarget = null;
  dialogEl.classList.remove('show');
  dialogEl.classList.remove('typing');
  refreshUI();
  if (dialogReturnLock && !fallbackLook) requestLock();
}
dialogEl.addEventListener('click', () => { if (dialogCanDismiss) endDialog(); });
document.getElementById('dialog-leave').addEventListener('click', (e) => { e.stopPropagation(); endDialog(); });

// Push in on whoever's talking: ease the FOV down and swing the view onto
// them, then let it back out when the conversation drops.
const DIALOG_FOV = 42;
const _lookM = new THREE.Matrix4(), _lookQ = new THREE.Quaternion();
function updateDialogCam(dt) {
  const wantFov = dialogOpen ? Math.min(settings.fov, DIALOG_FOV) : settings.fov;
  if (Math.abs(camera.fov - wantFov) > 0.01) {
    camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 3.5);
    camera.updateProjectionMatrix();
  }
  if (dialogOpen && dialogTarget) {
    _lookM.lookAt(camera.position, dialogTarget, camera.up);
    _lookQ.setFromRotationMatrix(_lookM);
    camera.quaternion.slerp(_lookQ, Math.min(1, dt * 3.2));
  }
}

// ------------------------------------------------------------------
// Ambient audio
// ------------------------------------------------------------------
function startAmbientAudio() {
  if (audioStarted) return;
  audioStarted = true;
  const ctx = audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.0990460;
    b1 = 0.96300 * b1 + white * 0.2965164;
    b2 = 0.57000 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.15;
  }
  const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
  const wind = ctx.createBiquadFilter(); wind.type = 'lowpass'; wind.frequency.value = 480;
  const windGain = ctx.createGain(); windGain.gain.value = 0.05;
  const surf = ctx.createBiquadFilter(); surf.type = 'bandpass'; surf.frequency.value = 300; surf.Q.value = 0.6;
  const surfGain = ctx.createGain(); surfGain.gain.value = 0.12;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.14;
  lfo.connect(lfoGain).connect(surfGain.gain);
  const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.6;
  const lfo2Gain = ctx.createGain(); lfo2Gain.gain.value = 0.07;
  lfo2.connect(lfo2Gain).connect(surfGain.gain);
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.0;
  masterGain.gain.linearRampToValueAtTime(settings.volume, ctx.currentTime + 4);
  // dedicated sub-mix for everything "waves": the surf loop and the
  // water-step splashes both pass through here so the Wave volume slider
  // can pull them down together, under the master volume.
  waveBusGain = ctx.createGain();
  waveBusGain.gain.value = settings.waveVolume;
  waveBusGain.connect(masterGain);
  // every one-shot effect (dig, steps, crab, glass…) goes through here, so
  // the SFX slider governs them and none of them can out-shout the mix.
  sfxBusGain = ctx.createGain();
  sfxBusGain.gain.value = settings.sfxVolume;
  sfxBusGain.connect(masterGain);
  noise.connect(wind).connect(windGain).connect(masterGain);
  noise.connect(surf).connect(surfGain).connect(waveBusGain);
  masterGain.connect(ctx.destination);
  noise.start(); lfo.start(); lfo2.start();
  loadSamples();
  document.addEventListener('visibilitychange', () => {
    masterGain.gain.setTargetAtTime(document.hidden ? 0 : settings.volume, ctx.currentTime, 0.4);
  });
}
// the provided track: swells in over a few seconds, plays a while, fades out
const MUSIC_TARGET = 0.6;   // relative to the master volume
const MUSIC_FADE_IN = 2.5;  // up quickly — it should already be there as you spawn
const MUSIC_HOLD = 34;
const MUSIC_FADE_OUT = 10;
function startMusic() {
  if (musicStarted || !audioCtx) return;
  musicStarted = true;
  musicEl = new Audio('assets/backrooms.m4a');
  musicEl.crossOrigin = 'anonymous';
  musicEl.loop = false;
  const src = audioCtx.createMediaElementSource(musicEl);
  musicEnvGain = audioCtx.createGain();
  musicVolGain = audioCtx.createGain();
  musicEnvGain.gain.value = 0.0001;
  musicVolGain.gain.value = settings.volume * settings.musicVolume;
  src.connect(musicEnvGain).connect(musicVolGain).connect(audioCtx.destination);

  const play = () => {
    const t = audioCtx.currentTime;
    const g = musicEnvGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(MUSIC_TARGET, t + MUSIC_FADE_IN);
    g.setValueAtTime(MUSIC_TARGET, t + MUSIC_FADE_IN + MUSIC_HOLD);
    g.exponentialRampToValueAtTime(0.0001, t + MUSIC_FADE_IN + MUSIC_HOLD + MUSIC_FADE_OUT);
    setTimeout(() => { if (musicEl) { musicEl.pause(); } }, (MUSIC_FADE_IN + MUSIC_HOLD + MUSIC_FADE_OUT + 1) * 1000);
  };
  musicEl.play().then(play).catch(() => { musicStarted = false; });
  document.addEventListener('visibilitychange', () => {
    if (!musicEl) return;
    if (document.hidden) musicEl.pause(); else if (musicStarted) musicEl.play().catch(() => {});
  });
}

// ---- recorded one-shots -------------------------------------------
// Everything else in here is synthesised, but these are real recordings.
// Decoded once when the audio context comes up; every play is a fresh
// BufferSource so they can overlap.
const SAMPLES = {
  sandHit: ['assets/sand-hit1.m4a', 'assets/sand-hit2.m4a', 'assets/sand-hit3.m4a', 'assets/sand-hit4.m4a'],
  glassBreak: ['assets/glass-break.m4a'],
  fleshHit: ['assets/flesh-hit.m4a'],
  doorOpen: ['assets/door-open.m4a'],
  doorClose: ['assets/door-close.m4a'],
  wade: ['assets/wade1.m4a', 'assets/wade2.m4a', 'assets/wade3.m4a', 'assets/wade4.m4a'],
  slosh: ['assets/slosh1.m4a', 'assets/slosh2.m4a', 'assets/slosh3.m4a', 'assets/slosh4.m4a'],
  splash: ['assets/water-splash1.m4a', 'assets/water-splash2.m4a', 'assets/water-splash3.m4a'],
};
const sampleBanks = {};
function loadSamples() {
  if (!audioCtx) return;
  for (const [name, urls] of Object.entries(SAMPLES)) {
    sampleBanks[name] = [];
    urls.forEach((url, i) => {
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((b) => audioCtx.decodeAudioData(b))
        .then((buf) => { sampleBanks[name][i] = buf; })
        .catch(() => {});                       // silent — the synth fallback covers it
    });
  }
}
// plays a random one from the bank; returns false if nothing has loaded yet
function playSample(name, gain = 1, rateJitter = 0, rate = 1) {
  const ctx = audioCtx; if (!ctx) return false;
  const bank = (sampleBanks[name] || []).filter(Boolean);
  if (!bank.length) return false;
  const src = ctx.createBufferSource();
  src.buffer = bank[(Math.random() * bank.length) | 0];
  src.playbackRate.value = rate;
  if (rateJitter) src.playbackRate.value = rate + (Math.random() - 0.5) * 2 * rateJitter;
  const g = ctx.createGain(); g.gain.value = gain;
  src.connect(g).connect(sfxOut());
  src.start();
  return true;
}

// bottle shattering — the recording, with a synthesised burst behind it
function sfxGlassBreak() {
  const ctx = audioCtx; if (!ctx) return;
  if (playSample('glassBreak', 0.42, 0.06)) return;
  const t = ctx.currentTime;
  const s = noiseBurst(0.5, (x) => Math.pow(1 - x, 2.2) * (0.3 + 0.7 * Math.random()));
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.3, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  s.connect(hp).connect(g).connect(sfxOut());
  s.start(t); s.stop(t + 0.5);
}

// The track that cues as you reach the lighthouse door. Streamed through an
// <audio> element like the opening music, on its own gain so the music slider
// governs it too.
function startLighthouseTrack() {
  if (lhStarted || !audioCtx) return;
  lhStarted = true;
  // duck the opening music out of the way if it's somehow still going
  if (musicEnvGain) musicEnvGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 1.2);
  lhEl = new Audio('assets/lighthouse.m4a');
  lhEl.crossOrigin = 'anonymous';
  lhEl.loop = false;
  const src = audioCtx.createMediaElementSource(lhEl);
  lhGain = audioCtx.createGain();
  lhGain.gain.value = 0.0001;
  src.connect(lhGain).connect(audioCtx.destination);
  lhEl.play().then(() => {
    const t = audioCtx.currentTime;
    lhGain.gain.setValueAtTime(0.0001, t);
    lhGain.gain.exponentialRampToValueAtTime(settings.volume * settings.musicVolume * LH_TRACK_LEVEL, t + 2.0);
  }).catch(() => { lhStarted = false; });
  document.addEventListener('visibilitychange', () => {
    if (!lhEl) return;
    if (document.hidden) lhEl.pause(); else if (lhStarted) lhEl.play().catch(() => {});
  });
}

function sfxGlassPick() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  [880, 1245, 1660].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t + i * 0.045);
    g.gain.setValueAtTime(0.0001, t + i * 0.045);
    g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.045 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.045 + 0.28);
    o.connect(g).connect(sfxOut());
    o.start(t + i * 0.045); o.stop(t + i * 0.045 + 0.3);
  });
}
// A foot going into dry sand: a short low compression as the weight lands,
// and a brighter granular crunch of grains shifting over it. Randomised per
// step and alternating slightly left/right so a walk doesn't tick like a
// metronome.
let stepAlt = 0;
function sfxStep() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  stepAlt ^= 1;
  const out = ctx.createGain();
  out.gain.value = 0.6 * (stepAlt ? 1 : 0.8) * (0.85 + Math.random() * 0.3);
  out.connect(sfxOut());

  // 1. the thud — bodyweight dropping onto packed sand, gone almost at once
  const thump = noiseBurst(0.09, (x) => Math.pow(1 - x, 3.4));
  const tf = ctx.createBiquadFilter(); tf.type = 'lowpass';
  tf.frequency.value = 140 + Math.random() * 55; tf.Q.value = 1.3;
  const tg = ctx.createGain(); tg.gain.value = 0.4;
  thump.connect(tf).connect(tg).connect(out);
  thump.start(t); thump.stop(t + 0.09);

  // 2. the compression — damp sand packing down under the heel, a soft crush
  const comp = noiseBurst(0.14, (x) => Math.pow(1 - x, 2.1) * (0.55 + 0.45 * Math.random()));
  const cf = ctx.createBiquadFilter(); cf.type = 'lowpass';
  cf.frequency.setValueAtTime(560 + Math.random() * 170, t);
  cf.frequency.exponentialRampToValueAtTime(210, t + 0.13);
  const cg = ctx.createGain(); cg.gain.value = 0.32;
  comp.connect(cf).connect(cg).connect(out);
  comp.start(t); comp.stop(t + 0.14);

  // 3. loose grains scattering off the print — granular, bright, quick
  const grit = noiseBurst(0.16, (x) => {
    const env = Math.pow(1 - x, 1.7);
    return env * (0.3 + 0.7 * Math.abs(Math.sin(x * 85 + Math.random() * 6)));
  });
  const gf = ctx.createBiquadFilter(); gf.type = 'bandpass';
  gf.frequency.setValueAtTime(2000 + Math.random() * 850, t);
  gf.frequency.exponentialRampToValueAtTime(820, t + 0.14);
  gf.Q.value = 0.7;
  const gg = ctx.createGain();
  gg.gain.setValueAtTime(0.0001, t);
  gg.gain.exponentialRampToValueAtTime(0.19 + Math.random() * 0.07, t + 0.01);
  gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  grit.connect(gf).connect(gg).connect(out);
  grit.start(t); grit.stop(t + 0.16);

  // 4. the odd shell chip ticking — sparse, so a walk never sounds looped
  if (Math.random() < 0.28) {
    const tick = noiseBurst(0.03, (x) => Math.pow(1 - x, 5));
    const kf = ctx.createBiquadFilter(); kf.type = 'highpass'; kf.frequency.value = 3600;
    const kg = ctx.createGain(); kg.gain.value = 0.04 + Math.random() * 0.05;
    tick.connect(kf).connect(kg).connect(out);
    tick.start(t + 0.006); tick.stop(t + 0.036);
  }
}
function sfxThud(gain) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.1);
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const s = ctx.createBufferSource(); s.buffer = b;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
  const g = ctx.createGain(); g.gain.value = gain ?? 0.05;
  s.connect(f).connect(g).connect(sfxOut());
  s.start(t); s.stop(t + 0.1);
}
// the extraction — a soft wet suction that rises as the barrel fills
function sfxDraw() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const src = noiseBurst(2.6, (x) => (0.15 + 0.5 * x) * (0.6 + 0.4 * Math.sin(x * 40)));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
  bp.frequency.setValueAtTime(180, t);
  bp.frequency.linearRampToValueAtTime(520, t + 2.4);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  src.connect(bp).connect(g).connect(masterGain || ctx.destination);
  src.start(t); src.stop(t + 2.6);
}
// a chunk of shaped noise, `env(i01)` returns 0..1 amplitude over its length
function noiseBurst(seconds, env) {
  const ctx = audioCtx;
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * env(i / len);
  const s = ctx.createBufferSource(); s.buffer = b;
  return s;
}
// the swing — a short airy whoosh as the blade arcs down
function sfxDig(power = 0) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  // a heavier swing is a longer, lower whoosh — more air moved, more slowly
  const len = 0.34 + power * 0.16;
  const s = noiseBurst(len, (x) => Math.sin(Math.PI * Math.min(1, x * 1.2)) * (1 - x * 0.3));
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9 + power * 0.5;
  f.frequency.setValueAtTime(400 - power * 130, t);
  f.frequency.exponentialRampToValueAtTime(1600 - power * 420, t + len * 0.65);
  f.frequency.exponentialRampToValueAtTime(600 - power * 200, t + len);
  const g = ctx.createGain(); g.gain.value = 0.022 + power * 0.030;
  s.connect(f).connect(g).connect(sfxOut());
  s.start(t); s.stop(t + len);
}
// the blade biting into damp sand: a soft body thud + a granular crunch +
// a short bright spray of grains
function sfxDigImpact(power = 0) {
  const ctx = audioCtx; if (!ctx) return;
  // one of the four recorded sand impacts, picked at random. A charged swing
  // plays it louder and pitched down, which is most of what makes it read as
  // heavier without needing a second recording.
  if (playSample('sandHit', 0.30 + power * 0.26, 0.09, 1 - power * 0.16)) return;
  const t = ctx.currentTime;
  const out = ctx.createGain(); out.gain.value = 0.34; out.connect(sfxOut());

  // low body — the blade landing
  const body = noiseBurst(0.16, (x) => Math.pow(1 - x, 2.5));
  const bf = ctx.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 220;
  const bg = ctx.createGain(); bg.gain.value = 0.5;
  body.connect(bf).connect(bg).connect(out);
  body.start(t); body.stop(t + 0.16);

  // the crunch — mid noise pushed through a fast-closing lowpass
  const crunch = noiseBurst(0.3, (x) => (0.35 + 0.65 * Math.random()) * Math.pow(1 - x, 1.6));
  const cf = ctx.createBiquadFilter(); cf.type = 'lowpass'; cf.Q.value = 1.0;
  cf.frequency.setValueAtTime(2600, t);
  cf.frequency.exponentialRampToValueAtTime(360, t + 0.26);
  const cg = ctx.createGain(); cg.gain.value = 0.32;
  crunch.connect(cf).connect(cg).connect(out);
  crunch.start(t); crunch.stop(t + 0.3);

  // grain spray — high, gritty, decaying to nothing
  const spray = noiseBurst(0.42, (x) => Math.pow(1 - x, 3) * (0.6 + 0.4 * Math.sin(x * 90)));
  const sf = ctx.createBiquadFilter(); sf.type = 'highpass'; sf.frequency.value = 2400;
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, t);
  sg.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  spray.connect(sf).connect(sg).connect(out);
  spray.start(t + 0.01); spray.stop(t + 0.43);

  out.gain.setTargetAtTime(0.0001, t + 0.45, 0.1);
}
// a foot breaking the surface of the surf — layered so it reads as real
// water: a wet "sploosh" front, a low displaced-water gloop, and a fine
// spray tail of droplets falling back. Randomised so repeated steps differ.
function sfxSplash(power = 1) {
  const ctx = audioCtx; if (!ctx) return;
  // recorded water. A hard entry gets a proper splash, a footfall in the
  // shallows gets the wading step, and light movement just sloshes.
  const bank = power > 1.0 ? 'splash' : (power > 0.55 ? 'wade' : 'slosh');
  if (playSample(bank, Math.min(1, 0.42 + power * 0.42), 0.09)) return;
  const t = ctx.currentTime;
  const dest = waveBusGain || ctx.destination;
  const out = ctx.createGain();
  out.gain.value = 0.9 * (0.7 + 0.5 * power);
  out.connect(dest);
  const rnd = (a, b) => a + Math.random() * (b - a);

  // 1) the sploosh — broadband noise through a lowpass that drops fast
  const body = noiseBurst(0.22, (x) => Math.pow(1 - x, 1.4) * (0.6 + 0.4 * Math.random()));
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
  lp.frequency.setValueAtTime(rnd(1400, 2000), t);
  lp.frequency.exponentialRampToValueAtTime(rnd(280, 420), t + 0.14);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.0001, t);
  bg.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  body.connect(lp).connect(bg).connect(out);
  body.start(t); body.stop(t + 0.24);

  // 2) low gloop — displaced water; a short sine that bends downward
  const o = ctx.createOscillator(); o.type = 'sine';
  const f0 = rnd(150, 210);
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.13);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.16, t + 0.015);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(og).connect(out);
  o.start(t); o.stop(t + 0.18);

  // 3) spray tail — fine droplets pattering back down
  const spray = noiseBurst(0.4, (x) => Math.pow(1 - x, 2.6) * (0.5 + 0.5 * Math.sin(x * rnd(70, 120))));
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = rnd(2200, 3000);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, t + 0.02);
  sg.gain.exponentialRampToValueAtTime(0.09, t + 0.06);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  spray.connect(hp).connect(sg).connect(out);
  spray.start(t + 0.02); spray.stop(t + 0.44);

  out.gain.setTargetAtTime(0.0001, t + 0.42, 0.12);
}

// a dry chitinous rattle as the thing wakes up and starts moving
// the tower door — a long timber groan on the hinges, then the latch
function sfxDoor(opening) {
  const ctx = audioCtx; if (!ctx) return;
  if (playSample(opening ? 'doorOpen' : 'doorClose', 0.85, 0.05)) return;
  const t = ctx.currentTime;
  const out = ctx.createGain(); out.gain.value = 0.5; out.connect(sfxOut());

  // the creak: filtered noise wobbling in pitch as the hinge binds
  const creak = noiseBurst(1.1, (x) => Math.sin(Math.PI * Math.min(1, x * 1.15)) * (0.5 + 0.5 * Math.sin(x * 26)));
  const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.Q.value = 7;
  cf.frequency.setValueAtTime(opening ? 320 : 520, t);
  cf.frequency.exponentialRampToValueAtTime(opening ? 640 : 260, t + 0.95);
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.0001, t);
  cg.gain.exponentialRampToValueAtTime(0.28, t + 0.12);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  creak.connect(cf).connect(cg).connect(out);
  creak.start(t); creak.stop(t + 1.1);

  // the heavy body of it — a low thump as the leaf takes up
  const body = noiseBurst(0.3, (x) => Math.pow(1 - x, 2.4));
  const bf = ctx.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 170;
  const bg = ctx.createGain(); bg.gain.value = 0.5;
  body.connect(bf).connect(bg).connect(out);
  body.start(t + (opening ? 0.0 : 0.85)); body.stop(t + 1.2);
}
function sfxCrabWake() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const s = noiseBurst(0.5, (x) => Math.pow(1 - x, 1.2) * (Math.random() < 0.4 ? 1 : 0.15));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 3;
  const g = ctx.createGain(); g.gain.value = 0.05;
  s.connect(bp).connect(g).connect(sfxOut());
  s.start(t); s.stop(t + 0.5);
}
// the nip — a hard click plus a short scrape
function sfxCrabSnip() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const click = noiseBurst(0.05, (x) => Math.pow(1 - x, 0.8));
  const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 2600; cf.Q.value = 2.2;
  const cg = ctx.createGain(); cg.gain.value = 0.16;
  click.connect(cf).connect(cg).connect(sfxOut());
  click.start(t); click.stop(t + 0.05);
  const o = ctx.createOscillator(); o.type = 'square';
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.06, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(og).connect(sfxOut());
  o.start(t); o.stop(t + 0.1);
}
// shell giving way under the blade
function sfxCrabDie() {
  const ctx = audioCtx; if (!ctx) return;
  // the recorded wet impact; the synth shell-crack still layers under it
  playSample('fleshHit', 1.0, 0.07);
  const t = ctx.currentTime;
  const s = noiseBurst(0.26, (x) => Math.pow(1 - x, 1.8) * (0.4 + 0.6 * Math.random()));
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(3400, t);
  lp.frequency.exponentialRampToValueAtTime(400, t + 0.2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
  s.connect(lp).connect(g).connect(sfxOut());
  s.start(t); s.stop(t + 0.26);
}
// taking a hit — a dull thump with a low sting under it
function sfxHurt() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const s = noiseBurst(0.24, (x) => Math.pow(1 - x, 2.2));
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
  const g = ctx.createGain(); g.gain.value = 0.18;
  s.connect(lp).connect(g).connect(sfxOut());
  s.start(t); s.stop(t + 0.24);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.35);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.16, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(og).connect(sfxOut());
  o.start(t); o.stop(t + 0.42);
}

// the little chime when it lands in the jar
function sfxBloodGained() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  [523.25, 784, 1046.5].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const at = t + i * 0.06;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.07, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
    o.connect(g).connect(sfxOut());
    o.start(at); o.stop(at + 0.42);
  });
}

// ------------------------------------------------------------------
// End of the walk
// ------------------------------------------------------------------
function showEnd() {
  if (ended) return;
  ended = true;
  if (held) dropHeld();
  if (locked) document.exitPointerLock();
  menuEl.classList.remove('show');
  noteEl.classList.remove('show');
  refreshUI();
  endEl.classList.add('show');
}
document.getElementById('end-restart').addEventListener('click', () => location.reload());

// ------------------------------------------------------------------
// Movement + recentring + loop
// ------------------------------------------------------------------
const velocity = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const moveDir = new THREE.Vector3();
let bobPhase = 0;
let camBaseY = EYE_HEIGHT, vy = 0, onGround = true, jumpLatch = false;
let stamina = 1, exhausted = false;
let splashTimer = 0, rippleTimer = 0;

// ------------------------------------------------------------------
// Game feel. Small stuff, but it's the difference between the shovel
// connecting and the shovel passing through: a frame of hitstop, a shove
// of camera trauma, weight on the landings, and enough forgiveness around
// a jump that missing one feels like your fault.
// ------------------------------------------------------------------
let trauma = 0;                     // 0..1, decays; shake is trauma squared
let hitstop = 0;                    // seconds of near-frozen time after a hit
let landDip = 0;                    // camera sink on landing, eased back out
let coyote = 0, jumpBuf = 0;        // late-jump grace / early-press memory
const COYOTE_TIME = 0.12, JUMP_BUFFER = 0.14;
const _shakePrev = new THREE.Vector3();
const knockback = new THREE.Vector3();
function addTrauma(v) { trauma = Math.min(1, trauma + v); }

// ------------------------------------------------------------------
// The tower: walls you can't walk through, a doorway you can, and a
// helical stair whose height comes from how far round you've walked.
// ------------------------------------------------------------------
const PLAYER_R = 0.4;
let insideTower = false, groundY = 0, stairY = null;
let stairTurns = 0, lastStairA = 0, doorHeard = false, atLanternTop = false;
const _towerV = new THREE.Vector2();
function updateTower(dt) {
  const dx = camera.position.x - LH_X, dz = camera.position.z - LH_Z;
  let d = Math.hypot(dx, dz);
  // three's cylinder measures theta from +Z, and so does the doorway
  const ang = Math.atan2(dx, dz);
  const doorHalf = lighthouse.userData.doorHalf;

  // the track cues once, as you come up on the door
  if (!doorHeard && started && introDone && d < 11 && Math.abs(ang) < 1.1) {
    doorHeard = true;
    startLighthouseTrack();
  }

  // you can only pass through the wall at the doorway, and only down low
  // the door height is measured from the crest the tower stands on, not from
  // sea level — the player is already ~HL_CREST up by the time they get here
  const throughDoor = doorSwing > 0.55 && Math.abs(ang) < doorHalf * 0.92 &&
                      camBaseY < HL_CREST + EYE_HEIGHT + LH_DOOR_H - 0.5;
  if (!throughDoor && d > 0.001) {
    const climb = Math.max(0, groundY - HL_CREST);
    // Once you're on the stair the treads, not the wall, are what you can
    // stand on — they reach r2.07, while the bore down low is r2.55, so the
    // wall alone would let you walk off the outer edge into thin air.
    const onStair = climb > 0.6;
    const inner = (atLanternTop ? 3.15
                 : onStair ? Math.min(lhBoreAt(climb), 2.02)
                 : lhBoreAt(climb)) - PLAYER_R;
    const outer = LH_OUTER + PLAYER_R;
    let clamped = null;
    if (insideTower && d > inner) clamped = inner;
    else if (!insideTower && d < outer) clamped = outer;
    if (clamped !== null) {
      camera.position.x = LH_X + (dx / d) * clamped;
      camera.position.z = LH_Z + (dz / d) * clamped;
      d = clamped;
    }
  } else if (throughDoor) {
    insideTower = d < LH_OUTER - 0.6;
  }
  if (d > LH_OUTER + 2) insideTower = false;      // well clear of it

  // climbing: the stair gains LH_RISE for every full turn you walk round it
  if (insideTower) {
    if (d > 0.9) {
      let da = lastStairA - ang;                  // winding this way is "up"
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      stairTurns = THREE.MathUtils.clamp(stairTurns + da / (Math.PI * 2), 0, LH_TOP / LH_RISE);
    }
    lastStairA = ang;
    // Stand on the tread, not on the helix the treads were generated from.
    // The climb is continuous while the treads are discrete, so the raw
    // spiral height left your feet up to a full riser out from the step you
    // were looking at — sunk into it low down, hanging over it higher up.
    // Snap to the tread top, then ease onto it so the risers don't jolt.
    const raw = Math.min(LH_TOP, stairTurns * LH_RISE);
    const stepped = Math.min(LH_TOP,
      Math.floor(raw / LH_STEP + 1e-4) * LH_STEP + LH_TREAD_T / 2);
    stairY = stairY === null ? stepped
           : stairY + (stepped - stairY) * Math.min(1, dt * 18);
    groundY = HL_CREST + stairY;
    // Reaching the top no longer ends it — you arrive, and the walk ends
    // when you step out of the lantern onto the gallery.
    atLanternTop = stairTurns * LH_RISE >= LH_TOP - 0.4;
    if (atLanternTop && d > 1.95 && started && !ended) showEnd();
  } else {
    lastStairA = ang;
    stairTurns = 0;
    stairY = null;
    atLanternTop = false;
    groundY = headlandAt(camera.position.x, camera.position.z);
  }
}
const snap = (v, s) => Math.round(v / s) * s;

function update(dt) {
  const canMove = (locked || fallbackLook) && !frozen();
  const mx = canMove ? (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0) : 0;
  const mz = canMove ? (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0) : 0;
  const move = new THREE.Vector2(mx, mz);
  const moving = move.lengthSq() > 0;
  if (moving) move.normalize();

  const wantRun = canMove && (keys['ShiftLeft'] || keys['ShiftRight']);
  const running = wantRun && moving && stamina > 0 && !exhausted && onGround;
  if (running) { stamina = Math.max(0, stamina - dt / RUN_SECONDS); if (stamina <= 0) exhausted = true; }
  else { stamina = Math.min(1, stamina + dt / STAM_REGEN); if (exhausted && stamina > 0.35) exhausted = false; }
  const spd = (running ? RUN_SPEED : WALK_SPEED) * settings.walkSpeed;

  camera.getWorldDirection(forward);
  forward.y = 0; forward.normalize();
  right.crossVectors(forward, camera.up).normalize();
  const target = new THREE.Vector3().addScaledVector(forward, move.y).addScaledVector(right, move.x).multiplyScalar(spd);
  velocity.lerp(target, 1 - Math.pow(0.0016, dt));
  camera.position.sub(_shakePrev);            // undo last frame's shake first
  _shakePrev.set(0, 0, 0);
  camera.position.addScaledVector(velocity, dt);
  // being nipped shoves you back a little
  if (knockback.lengthSq() > 0.0001) {
    camera.position.addScaledVector(knockback, dt);
    knockback.multiplyScalar(1 - Math.min(1, 7 * dt));
  }
  if (!insideTower) {
    // the cliff holds you back everywhere except across the tunnel mouth
    const feet = camBaseY - EYE_HEIGHT;
    if (!inTunnelMouth(camera.position.z, feet)) {
      camera.position.x = Math.min(camera.position.x, CLIFF_BLOCK_X);
    }
    camera.position.x = Math.max(camera.position.x, WADE_X);
  }
  updateTunnelBounds();
  updateTower(dt);
  // Rocks are solid: walk into one and you're pushed out, clear its lip and
  // you stand on it. Done after updateTower() so a rock simply beats the sand.
  if (insideTunnel) {
    groundY = 0;                       // the bore and the room are flat floor
  } else if (!insideTower) {
    const feet = camBaseY - EYE_HEIGHT;
    pushOutOfRocks(feet);
    const rc = rockGroundAt(camera.position.x, camera.position.z, feet);
    if (rc && rc.top > groundY) groundY = rc.top;
  }

  // coyote time and a buffered press, so a jump you meant to make happens
  coyote = onGround ? COYOTE_TIME : Math.max(0, coyote - dt);
  if (canMove && keys['Space'] && !jumpLatch) { jumpBuf = JUMP_BUFFER; jumpLatch = true; }
  if (!keys['Space']) jumpLatch = false;
  jumpBuf = Math.max(0, jumpBuf - dt);
  if (jumpBuf > 0 && coyote > 0 && canMove) {
    vy = JUMP_V; onGround = false; coyote = 0; jumpBuf = 0;
    vmImpulse(1.5);                     // the tool hangs back as you leave the ground
  }
  vy -= P_GRAV * dt;
  camBaseY += vy * dt;
  const floorLimit = EYE_HEIGHT + groundY;
  if (camBaseY <= floorLimit) {
    if (!onGround && vy < -3.5) {
      // land with some weight behind it — the tool keeps going after you stop
      const force = Math.min(1, -vy / 12);
      landDip = Math.max(landDip, 0.06 + force * 0.16);
      addTrauma(force * 0.25);
      vmImpulse(-1.1 - force * 2.4);
      if (inWater(camera.position.x, camera.position.z)) sfxSplash(0.9); else sfxStep();
    }
    camBaseY = floorLimit; vy = 0; onGround = true;
  }
  landDip *= Math.max(0, 1 - 7.5 * dt);

  const speed = velocity.length();
  bobPhase += dt * speed * 2.1;
  const bob = (moving && onGround) ? Math.sin(bobPhase) * 0.045 * Math.min(speed / WALK_SPEED, 1) : 0;
  camera.position.y = camBaseY + bob - landDip;

  // camera trauma — shoved, not jittered, so it reads as impact
  trauma = Math.max(0, trauma - dt * 1.7);
  if (trauma > 0.001) {
    const k = trauma * trauma * 0.22;
    _shakePrev.set(
      (Math.random() * 2 - 1) * k,
      (Math.random() * 2 - 1) * k * 0.8,
      (Math.random() * 2 - 1) * k
    );
    camera.position.add(_shakePrev);
  }

  staminaEl.classList.toggle('show', stamina < 0.999);
  staminaFill.style.transform = `scaleX(${Math.max(0, stamina)})`;
  staminaFill.classList.toggle('low', exhausted);

  const wading = inWater(camera.position.x, camera.position.z);
  if (moving && onGround && speed > 0.6) {
    const dx = camera.position.x - lastFootPos.x, dz = camera.position.z - lastFootPos.z;
    const gate = running ? 1.0 : 0.8;
    if (dx * dx + dz * dz > gate * gate) {
      moveDir.copy(velocity).setY(0).normalize();
      if (wading) {
        // no footprint on water — kick up a splash instead
        spawnSplash(camera.position.x, camera.position.z, 9, moveDir.x, moveDir.z, 1);
        sfxSplash(0.85);
      } else {
        stampFoot(camera.position.x, camera.position.z, moveDir.x, moveDir.z, footSide);
        sfxStep();
      }
      footSide = -footSide;
      lastFootPos.set(camera.position.x, 0, camera.position.z);
    }
  }
  // fine spray trailing off your legs the whole time you're moving through surf
  if (wading && onGround) {
    // a continuous wake, so standing still in the surf still ripples
    rippleTimer -= dt;
    if (rippleTimer <= 0) {
      addRipple(camera.position.x, camera.position.z, moving ? 0.85 : 0.4);
      rippleTimer = moving ? 0.16 : 0.5;
    }
  }
  if (wading && moving && onGround && speed > 0.5) {
    splashTimer -= dt;
    if (splashTimer <= 0) {
      moveDir.copy(velocity).setY(0).normalize();
      spawnSplash(
        camera.position.x - moveDir.x * 0.3 + (Math.random() - 0.5) * 0.3,
        camera.position.z - moveDir.z * 0.3 + (Math.random() - 0.5) * 0.3,
        2, moveDir.x, moveDir.z, 0.32
      );
      splashTimer = 0.05 + Math.random() * 0.05;
    }
  } else splashTimer = 0;

  for (const p of physProps) p.step(dt);
  updatePuffs(dt);
  updateSplashes(dt);

  const px = camera.position.x, pz = camera.position.z;
  sand.position.set(snap(px, SAND_TILE), 0, snap(pz, SAND_TILE));
  ocean.position.x = snap(px, 8);
  ocean.position.z = snap(pz, 8);
  oceanUniforms.uOffset.value.set(ocean.position.x, ocean.position.z);
  oceanUniforms.uCamPos.value.copy(camera.getWorldPosition(new THREE.Vector3()));
  debris.position.z = snap(pz, DEBRIS_TILE);
  cliff.position.z = snap(pz, CLIFF_PERIOD);
  city.position.z = snap(pz, CITY_TILE);
  sky.position.set(px, 0, pz);

  beamPivot.rotation.y += dt * 0.55;
  _pf.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), beamPivot.rotation.y);
  _pt.copy(camera.position).sub(lighthouse.position); _pt.y = 0; _pt.normalize();
  const flash = Math.pow(Math.max(0, _pf.dot(_pt)), 5);
  lampCore.scale.setScalar(1 + flash * 2.2);
  lighthouse.userData.glow.material.opacity = 0.45 + flash * 0.5;
  lighthouse.userData.halo.material.opacity = 0.10 + flash * 0.22;
  beamPivot.userData.beam.material.opacity = 0.04 + flash * 0.16;
  const cll = city.userData.lights;
  if (cll) cll.material.opacity = 0.30 + 0.05 * Math.sin(oceanUniforms.uTime.value * 2.3);

  updateViewmodel(dt);
  updateHeldGlow(dt);
  updateDialogCam(dt);
  updateCrab(dt);
  updateGibs(dt);
  updateBradlyBlink(dt);
  updateHurt(dt);
  updateShines(oceanUniforms.uTime.value);
  updateDoor(dt);

  // walking up on Bradly starts the exchange the first time, so you can't
  // miss him; after that he's a normal E-to-talk interactable
  if (!bradlyMet && started && !frozen()) {
    const bx = camera.position.x - bradly.position.x, bz = camera.position.z - bradly.position.z;
    if (bx * bx + bz * bz < 7.5 * 7.5) startDialog('start');
  }

}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  let dt = Math.min(clock.getDelta(), 0.05);
  // a beat of near-frozen time on a solid hit, drained in real seconds
  if (hitstop > 0) { hitstop = Math.max(0, hitstop - dt); dt *= 0.08; }
  oceanUniforms.uTime.value += dt;
  update(dt);
  updateHover();
  if (inspecting) {
    updateInspect(dt);
    renderer.render(inspectScene, inspectCamera);
    return;
  }
  renderer.render(scene, camera);
  renderer.autoClear = false;
  if (viewmodel.visible) {
    renderer.clearDepth();
    renderer.render(vmScene, vmCamera);
  }
  renderBloodJar(dt);          // corner viewport, drawn over the world
  renderer.autoClear = true;
}
animate();

window.addEventListener('resize', () => {
  const a = window.innerWidth / window.innerHeight;
  camera.aspect = a; camera.updateProjectionMatrix();
  vmCamera.aspect = a; vmCamera.updateProjectionMatrix();
  inspectCamera.aspect = a; inspectCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  layoutViewmodel();
});
layoutViewmodel();

// dev hook
window.__bw = {
  THREE, scene, camera, player: camera,
  interactables, physProps, inventory, bottle, cliff, foot, lighthouse, city,
  castle, shovelWorld, viewmodel,
  hcrab, hcrabWorld, syringe, syringeWorld, bloodJar,
  renderer, inspectScene, inspectCamera,
  mounds, moundAt, revealMoundNear, makeGlowstick, inWater, shoreLineJS,
  sfxSplash, bradly, startDialog, endDialog, heldGlow,
  crab, crabState, killCrab, damagePlayer, playerDied, burstCrab, addTrauma, updateGibs,
  get gibCount() { return gibs.length; },
  get bloodCount() { return bloodDrops.length; },
  get trauma() { return trauma; }, updateCrab, poseLeg,
  set introDone(v) { introDone = v; },
  openPack, closePack, startExtraction, driveExtraction, finishExtraction, hudJar,
  get audioCtx() { return audioCtx; }, get audioStarted() { return audioStarted; },
  lighthouse, startLighthouseTrack, bottleProp, playSample, updateTower,
  waterSurfaceAt, submersionAt, restYInWater, groundGlow, addRipple,
  shells, listenToShell, makeRockGeo,
  get crabModel() { return crabModel; }, get crabMixer() { return crabMixer; },
  lhDoor, shinies, onPath, pathBend, pathHalfAt, lhWindows, lanternGlass,
  get doorOpen() { return doorOpen; }, set doorOpen(v) { doorOpen = v; doorSwing = v ? 1 : 0; lhDoor.rotation.y = -doorSwing * 1.95; },
  get insideTower() { return insideTower; },
  get insideTunnel() { return insideTunnel; },
  tunnel, theRoom, updateTunnelBounds, inTunnelMouth,
  get tunnelZ() { return TUN_Z; },
  rockColliders, rockGroundAt,
  get lhParts() { return lhParts; },
  get insideTower() { return insideTower; },
  get groundY() { return groundY; },
  get stairTurns() { return stairTurns; },
  get bottleBroken() { return bottleBroken; },
  get hp() { return hp; },
  get blood() { return bloodAmount; },
  get bloodSeen() { return bloodSeen; },
  get syringeItem() { return syringeItem; },
  // live-tune the fake eyelid once the real cut-out is in:
  //   __bw.setEyes({ y: 0.06, h: 0.022 })
  eyes: BRADLY_EYES,
  setEyes: (o) => {
    Object.assign(BRADLY_EYES, o);
    if (bradlySrcImg) bakeBradlyFrames(bradlySrcImg);
    return { ...BRADLY_EYES };
  },
  blinkNow: () => { blinkT = 0; },
  get glowstickItem() { return glowstickItem; },
  openMenu, closeMenu, showEnd, stampFoot, startDig, toggleEquip, spawnPuffs, spawnSplash, stampDigHole, beginGame,
  openInspect, closeInspect, startExtraction,
  get shovelItem() { return shovelItem; }, get crabItem() { return crabItem; }, get syringeItem() { return syringeItem; }, get jarItem() { return jarItem; },
  state: () => ({ started, locked, fallbackLook, introDone, noteOpen, menuOpen, dialogOpen, inspecting, extracting, crabBled, dying, ended, onGround, stamina: +stamina.toFixed(2), exhausted, digT: +digT.toFixed(2), equipped: equipped && equipped.name, held: held && held.mesh.name, hovered: hovered && hovered.label, inv: inventory.map(i => i.name) }),
  music: () => (musicEl ? { paused: musicEl.paused, t: +musicEl.currentTime.toFixed(1), env: musicEnvGain ? +musicEnvGain.gain.value.toFixed(3) : null, vol: musicVolGain ? +musicVolGain.gain.value.toFixed(2) : null } : { musicEl: null }),
};

// ------------------------------------------------------------------
// The surf should already be running while you're sat on the title card.
// Browsers won't let an AudioContext make noise before the page has been
// interacted with, so: build it and try immediately (which works whenever
// the browser already trusts this page), and otherwise resume on the very
// first thing the player does — moving onto the page, a key, a click.
(function primeAmbience() {
  startAmbientAudio();
  if (!audioCtx) return;
  const wake = () => {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    if (audioCtx.state === 'running') {
      for (const ev of ['pointerdown', 'pointermove', 'keydown', 'touchstart']) {
        window.removeEventListener(ev, wake);
      }
    }
  };
  wake();
  for (const ev of ['pointerdown', 'pointermove', 'keydown', 'touchstart']) {
    window.addEventListener(ev, wake, { passive: true });
  }
})();
