import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeHorseshoeCrab, makeHorseshoeCrabIcon } from './models/horseshoe-crab.js';
import { makeSyringe, makeSyringeIcon } from './models/syringe.js';
import { makeBloodJar } from './models/blood-jar.js';
import { makeDrainageTunnelHome } from './models/drainage-tunnel-home.js';
import { makeWaterBottle, makeWaterBottleIcon } from './models/water-bottle.js';
import { makeShipwreck } from './models/shipwreck.js';
import { makeRing, makeRingIcon } from './models/ring.js';
import { makeCdCase, makeCdCaseIcon } from './models/cd-case.js';

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
const LH_POLE_R = 0.075;           // the steel newel pole the treads wrap round
const LH_TREAD_R = 1.42;           // how far out from the pole a tread reaches
// INSIDE the tread's edge, not outside it. At 1.50 the balusters stood 8 cm
// off the end of every step, so the whole rail floated in the air beside the
// stair — which is exactly what it looked like.
const LH_RAIL_R = 1.36;            // the outer handrail
// Where the stair meets the gallery, in the game's angle convention. The
// treads are laid out so height and angle are locked together, so this is
// derived rather than eyeballed — the hatch in the deck has to be here, and
// the last attempt at a hatch drifted because it was placed by hand.
const LH_ARRIVE = ((-(LH_TOP / LH_RISE) * Math.PI * 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
const LH_DOOR_W = 0.72;            // half-width of the doorway
const LH_DOOR_H = 2.15;
// the bore narrows as it climbs — keeps the stair and the player off the wall
/* Brick, drawn the way the sand is — 256², a coarse palette, nearest — for
 * the inside of the shaft. Courses of stretcher bond with a pale mortar line,
 * every brick its own shade so it never tiles as a grid. Cooled well off red:
 * the lamps in there are warm and will bring the colour back; a warm brick
 * under a warm lamp goes orange. */
function makeBrickTexture() {
  const S = 256;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const rnd = mulberry32(4417);
  g.fillStyle = '#6a6a72'; g.fillRect(0, 0, S, S);              // mortar
  const rows = 8, bh = S / rows, bw = S / 4;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw / 2 : 0;
    for (let k = -1; k < 5; k++) {
      const x = k * bw + off, y = r * bh;
      const t = rnd();
      const R = 112 + Math.floor(t * 40), G = 62 + Math.floor(t * 22), B = 58 + Math.floor(rnd() * 18);
      g.fillStyle = `rgb(${R},${G},${B})`;
      g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      // a darker face here and there, the way a fired batch varies
      if (rnd() < 0.22) { g.fillStyle = 'rgba(30,18,18,0.35)'; g.fillRect(x + 2, y + 2, bw - 4, bh - 4); }
      // spalling and soot: a few dark flecks per brick
      for (let f = 0; f < 3; f++) {
        g.fillStyle = `rgba(20,14,14,${0.25 + rnd() * 0.35})`;
        g.fillRect(x + 3 + rnd() * (bw - 8), y + 3 + rnd() * (bh - 8), 1 + rnd() * 3, 1 + rnd() * 2);
      }
    }
  }
  const img = g.getImageData(0, 0, S, S), d = img.data, step = 255 / 7;
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / step) * step;
  g.putImageData(img, 0, 0);
  const t = retroTex(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/* Cast iron for the treads: the raised-diamond anti-slip pattern that every
 * lighthouse stair in the world has, four diamonds to the tile. It reads at
 * a glance as "iron plate", which a flat red box never did. */
function makeTreadTexture() {
  const S = 128;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#8c8c94'; g.fillRect(0, 0, S, S);
  const n = 4, cell = S / n;
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
    const cx = i * cell + cell / 2, cy = k * cell + cell / 2, h = cell * 0.36;
    // the diamond, lit from the top-left: a bright upper face, a dark lower one
    g.fillStyle = '#c4c4cc';
    g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx + h, cy); g.lineTo(cx, cy); g.lineTo(cx - h, cy); g.closePath(); g.fill();
    g.fillStyle = '#55555c';
    g.beginPath(); g.moveTo(cx - h, cy); g.lineTo(cx, cy); g.lineTo(cx + h, cy); g.lineTo(cx, cy + h); g.closePath(); g.fill();
  }
  const t = retroTex(new THREE.CanvasTexture(c));
  t.repeat.set(4, 4);                                            // 6 cm diamonds
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
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
const DEFAULT_SETTINGS = { fov: 107, sensitivity: 1, brightness: 1.16, volume: 0.5, musicVolume: 0.32, waveVolume: 0.46, sfxVolume: 0.6, walkSpeed: 1.4, invertY: false, devMode: false };
let settings = { ...DEFAULT_SETTINGS };
try { settings = { ...settings, ...JSON.parse(localStorage.getItem('beachwalk.settings') || '{}') }; } catch (e) {}
// walk speed is never remembered: every game starts at the default 1.4×, and
// the slider is for the session you are in
settings.walkSpeed = DEFAULT_SETTINGS.walkSpeed;
function saveSettings() { try { localStorage.setItem('beachwalk.settings', JSON.stringify(settings)); } catch (e) {} }

let audioStarted = false, audioCtx = null, masterGain = null;
let titleSurfGain = null;               // the sea under the title, pulled down on begin
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
const spawnPos = camera.position.clone(), spawnQuat = camera.quaternion.clone();
renderer.domElement.classList.add('title-grade');   // the menu's grade; lifted on begin

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
/* THE SEA HIDES WHAT IT COVERS. Debris, blood and thrown sand all used to
 * go on drawing where the water had closed over them — bright specks lying
 * on the seabed with a wave running across the top of them. Anything that
 * settles asks this before it draws. */
function coveredByWater(x, y, z) {
  const sub = submersionAt(x, z);
  if (sub <= 0.15) return false;
  /* The seabed is the SAND PLANE, at y = 0, and out here the drawn water
   * sits BELOW it (the ocean mesh is at -0.34 and the sand is discarded
   * seaward of the shoreline). So a clod at rest on the bottom is really
   * a third of a metre above the surface you can see, and comparing it
   * straight to the wave height hid nothing at all. The margin is what
   * makes "lying on the bottom" count as under the sea, while a gib still
   * in the air over the surf goes on drawing. */
  return y < waterSurfaceAt(x, z) + 0.5 * sub;
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
  /* The toe is where the cliff and the beach meet, and it used to meet badly:
   * a hard line of a different grey, at a different grain size, sitting on
   * the sand. `aU` is the loft parameter (0 at the toe, 1 at the top), and
   * the shader uses it to run the bottom band back to the beach's own colour
   * and then dissolve the last of it on a hash — so the cliff comes out of
   * the sand instead of being placed on it. The along-shore density is the
   * beach's own (one tile per SAND_TILE) so the grain rate agrees where they
   * touch; up the face it stays finer, because a vertical wall at 9 m a tile
   * is a smear. */
  const uAttr = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) uAttr[i] = g.attributes.uv.getY(i) + 0.5;
  g.setAttribute('aU', new THREE.BufferAttribute(uAttr, 1));
  const tex = sandTex.clone(); tex.needsUpdate = true; tex.repeat.set(CLIFF_LEN / SAND_TILE, 4);
  const bmp = sandBump.clone(); bmp.needsUpdate = true; bmp.repeat.set(CLIFF_LEN / SAND_TILE, 4);
  const mat = new THREE.MeshStandardMaterial({
    map: tex, bumpMap: bmp, bumpScale: 2.2,
    color: 0x64697c, roughness: 1, metalness: 0, emissive: 0x2f3648, emissiveMap: tex, side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aU;\nvarying float vU;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vU = aU;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vU;
        float bwH2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (vU < bwH2(floor(gl_FragCoord.xy)) * 0.075) discard;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        // the toe carries the beach's colour, so there is nothing to see at
        // the join; the face is the cliff's own further up
        float bwT = smoothstep(0.06, 0.30, vU);
        diffuseColor.rgb *= mix(vec3(1.072, 1.199, 1.529), vec3(1.0), bwT);`);
  };
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
  if (shinies.some((s) => s.root === root)) return;   // never twice on one thing
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xbcd6ff, transparent: true, opacity: 0.0,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
  }));
  glint.raycast = () => {};            // a glint is not a thing you can aim at
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
    s.glint.material.opacity = (0.055 + 0.075 * k) * s.strength;
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

  /* Two skins, because the reference is two buildings. From the beach it is
   * a WHITE tower with a black lantern — whitewashed render that takes the
   * moon and is the brightest thing on the headland, which is what a
   * lighthouse is for. Inside it is BRICK: a round shaft of it, running up
   * into the dark, with the red iron stair wound round it. The old single
   * grey material was neither, and read as a concrete post from both sides.
   *
   * LatheGeometry hands out u round the shaft and v up it, so the brick
   * courses come straight off texture.repeat: ~14.5 m round at the foot and
   * 26 m up, at 0.4 m per repeat, is 36 × 64. */
  const brickTex = makeBrickTexture();
  brickTex.repeat.set(36, 64);
  const shaftOutMat = new THREE.MeshStandardMaterial({
    color: 0xb2bac8, vertexColors: true, roughness: 0.95, metalness: 0,
    emissive: 0x2a3140, flatShading: true, side: THREE.DoubleSide });
  const shaftInMat = new THREE.MeshStandardMaterial({
    // tinted COOL on purpose: the lamps are warm, and a warm brick under a
    // warm lamp is orange — the first pass was a red tube with red stairs in it
    map: brickTex, color: 0x8892a4, vertexColors: true, roughness: 1, metalness: 0,
    emissive: 0x141821, emissiveMap: brickTex, side: THREE.DoubleSide });
  const render = new THREE.MeshStandardMaterial({
    color: 0xa9b1bf, roughness: 0.95, metalness: 0, emissive: 0x262d3a, flatShading: true });
  /* The shaft is generated as a grid, not lathed and carved. The old way
   * dropped whole lathe triangles whose centroid fell in an opening, and with
   * 30 segments a triangle spans 12° — nearly a metre on the outer face — so
   * every door and window edge was a sawtooth of half-triangles: the "spikes"
   * round the doorway. Here the angle samples INCLUDE each opening's edge
   * angles on the surface being built (as ringYs already include its top and
   * bottom), so the quads inside an opening are dropped along vertex lines
   * and the cut is square by construction.
   *
   * Openings are parallel-sided in world space (a doorway has parallel
   * jambs), so an edge sits at a different angle on the bore than on the
   * outer face; each surface gets its own edge angles, taken at the
   * opening's mid-height. Convention throughout is the game's: a = atan2(x,z),
   * x = r sin a, z = r cos a — the same one updateTower() measures you in. */
  const ANG_N = 72;
  const edgeAng = (o, radiusAt) => Math.asin(Math.min(0.99, o.halfW / radiusAt((Math.max(0, o.y0) + o.y1) / 2)));
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const buildShaft = (radiusAt, inward) => {
    const angs = new Set();
    for (let k = 0; k < ANG_N; k++) angs.add(wrapA((k / ANG_N) * Math.PI * 2));
    for (const o of OPENINGS) { const e = edgeAng(o, radiusAt); angs.add(wrapA(o.ang - e)); angs.add(wrapA(o.ang + e)); }
    const A = [...angs].sort((p, q) => p - q);
    const pos = [], uv = [], idx = [];
    const col = (a, y) => { const r = radiusAt(y); pos.push(r * Math.sin(a), y, r * Math.cos(a)); uv.push((a + Math.PI) / (Math.PI * 2), y / LH_TOP); };
    // vertices: one column per angle (plus a duplicate of the first at +2π for the seam), one row per y
    const NA = A.length + 1, NY = ys.length;
    for (let yi = 0; yi < NY; yi++) for (let ai = 0; ai < NA; ai++) col(ai < A.length ? A[ai] : A[0] + Math.PI * 2, ys[yi]);
    const inside = (ac, yc) => {
      const r = radiusAt(yc);
      for (const o of OPENINGS) {
        if (yc < o.y0 || yc > o.y1) continue;
        if (Math.abs(wrapA(ac - o.ang)) * r < o.halfW) return true;
      }
      return false;
    };
    for (let yi = 0; yi < NY - 1; yi++) for (let ai = 0; ai < NA - 1; ai++) {
      const a0 = ai < A.length ? A[ai] : A[0] + Math.PI * 2, a1 = ai + 1 < A.length ? A[ai + 1] : A[0] + Math.PI * 2;
      if (inside((a0 + a1) / 2, (ys[yi] + ys[yi + 1]) / 2)) continue;
      const v00 = yi * NA + ai, v01 = v00 + 1, v10 = v00 + NA, v11 = v10 + 1;
      if (inward) idx.push(v00, v01, v10, v01, v11, v10); else idx.push(v00, v10, v01, v01, v10, v11);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    weather(g); g.computeVertexNormals();
    return g;
  };
  const shaftOut = new THREE.Mesh(buildShaft(lhOuterAt, false), shaftOutMat);
  const shaftIn = new THREE.Mesh(buildShaft(lhBoreAt, true), shaftInMat);
  shaftOut.frustumCulled = shaftIn.frustumCulled = false;
  lighthouse.add(shaftOut, shaftIn);
  lhParts.outer = shaftOut; lhParts.inner = shaftIn;
  lhParts.render = render;         // the footing below is built after headlandAt()

  /* Reveals — the jambs, soffits and sills that line every opening through
   * the thick wall — generated off the SAME edge angles as the cuts, so they
   * meet the wall exactly. Each jamb runs from the bore edge to the outer
   * edge; each soffit/sill sweeps between the two jamb lines with its inner
   * and outer edges on the bore arc and the outer arc, so there is no sliver
   * where a straight chord would have left the arc bulging past it. */
  {
    const pos = [], idx = [];
    const P = (a, r, y) => { pos.push(r * Math.sin(a), y, r * Math.cos(a)); return pos.length / 3 - 1; };
    const quad = (a, b, c, d) => idx.push(a, b, c, a, c, d);
    for (const o of OPENINGS) {
      const eb = edgeAng(o, lhBoreAt), eo = edgeAng(o, lhOuterAt);
      const yLo = Math.max(0, o.y0), yHi = o.y1;
      const rows = ys.filter((y) => y >= yLo - 1e-6 && y <= yHi + 1e-6);
      for (const sgn of [-1, 1]) {                            // the two jambs
        for (let k = 0; k < rows.length - 1; k++) {
          const y0 = rows[k], y1 = rows[k + 1];
          quad(P(o.ang + sgn * eb, lhBoreAt(y0), y0), P(o.ang + sgn * eo, lhOuterAt(y0), y0),
               P(o.ang + sgn * eo, lhOuterAt(y1), y1), P(o.ang + sgn * eb, lhBoreAt(y1), y1));
        }
      }
      const N = 8;                                            // soffit, and a sill where there is one
      for (const [y, has] of [[yHi, true], [yLo, o.y0 >= 0]]) {
        if (!has) continue;
        for (let k = 0; k < N; k++) {
          const t0 = k / N, t1 = (k + 1) / N;
          const ab0 = o.ang + (-eb + 2 * eb * t0), ab1 = o.ang + (-eb + 2 * eb * t1);
          const ao0 = o.ang + (-eo + 2 * eo * t0), ao1 = o.ang + (-eo + 2 * eo * t1);
          quad(P(ab0, lhBoreAt(y), y), P(ab1, lhBoreAt(y), y), P(ao1, lhOuterAt(y), y), P(ao0, lhOuterAt(y), y));
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const reveals = new THREE.Mesh(g, stone);                 // stone dressings on a white tower
    reveals.frustumCulled = false;
    lighthouse.add(reveals);
  }
  lighthouse.userData.shell = [];

  // String courses: three shallow bands round the taper. They cost almost
  // nothing and they're what stops the silhouette reading as a bare post.
  for (const by of [7.0, 14.0, 20.5]) {
    const r = lhOuterAt(by) + 0.09;
    // openEnded, or the caps are two solid discs right through the shaft — a
    // floor across the bore at 7, 14 and 20.5 m that you climbed up into
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.05, r, 0.34, 30, 1, true), render);
    band.position.y = by;
    lighthouse.add(band);
  }

  // The doorway is a tunnel through nearly two metres of masonry, so it
  // needs its jambs and soffit lined or you see the cut edge from inside.
  {
    const ym = LH_DOOR_H / 2, rI = lhBoreAt(ym), th = lhOuterAt(ym) - rI;
    const g = new THREE.Group();
    // jambs and soffit are generated with the wall now (see the reveals above)
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
  /* Built to the photograph: a slim red cast-iron stair wound round a
   * central STEEL POLE, standing free of the brick with a gap of open air to
   * the wall, the handrail on the OUTSIDE edge on slender balusters, thin
   * open treads you can see between. The wall-to-well version before this
   * was a spiral of red paddles the width of the room — the reference stair
   * is small, light, and the brick shows all round it.
   *
   * The pole is what makes it read: one dark vertical line the whole height
   * of the shaft that every tread is pinned to. Collision in updateTower():
   * the pole on the inside, the rail on the outside. */
  const treadTex = makeTreadTexture();
  const treadMat = new THREE.MeshStandardMaterial({
    map: treadTex, color: 0xc4392f, roughness: 0.58, metalness: 0.3,
    emissive: 0x4a100c, emissiveMap: treadTex, flatShading: true });
  const redIron = new THREE.MeshStandardMaterial({
    color: 0xc4392f, roughness: 0.48, metalness: 0.4, emissive: 0x4a100c, flatShading: true });
  const steel = new THREE.MeshStandardMaterial({
    color: 0x5a6069, roughness: 0.4, metalness: 0.75, emissive: 0x14161a, flatShading: true });
  const stairs = new THREE.Group();
  {
    // the pole, with a collar where each turn's treads pin to it
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(LH_POLE_R, LH_POLE_R, LH_TOP + 0.4, 12), steel);
    pole.position.y = LH_TOP / 2;
    stairs.add(pole);
    for (let y = LH_RISE; y < LH_TOP; y += LH_RISE) {
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(LH_POLE_R + 0.03, LH_POLE_R + 0.03, 0.12, 12), steel);
      collar.position.y = y;
      stairs.add(collar);
    }
    const nSteps = Math.round(LH_TOP / LH_STEP);
    const half = (Math.PI * 2 / LH_PER_TURN) * 0.5;
    const rIn = LH_POLE_R + 0.02, rOut = LH_TREAD_R;
    // one wedge geometry, shared: the stair does not taper with the shaft
    const sh = new THREE.Shape();
    const N = 4;
    for (let k = 0; k <= N; k++) {
      const t = -half + (2 * half) * (k / N);
      const px = Math.cos(t) * rOut, pz = Math.sin(t) * rOut;
      if (k === 0) sh.moveTo(px, -pz); else sh.lineTo(px, -pz);
    }
    for (let k = N; k >= 0; k--) {
      const t = -half + (2 * half) * (k / N);
      sh.lineTo(Math.cos(t) * rIn, -Math.sin(t) * rIn);
    }
    sh.closePath();
    const TREAD_PLATE = 0.035;                                    // a plate, not a slab
    const wedge = new THREE.ExtrudeGeometry(sh, { depth: TREAD_PLATE, bevelEnabled: false });
    wedge.rotateX(Math.PI / 2);                                   // extrusion -> down, shape.y -> +z
    const noseGeo = new THREE.BoxGeometry(rOut - rIn, 0.07, 0.035);
    const balGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.9, 5);
    for (let i = 1; i <= nSteps; i++) {
      const y = i * LH_STEP;
      const a = stairAngleAt(y);
      const st = new THREE.Mesh(wedge, treadMat);
      st.rotation.y = -a;                                         // wedge was drawn at angle 0
      st.position.y = y + LH_TREAD_T / 2;                         // top face at the stepped height
      stairs.add(st);
      // the nose: a deeper red lip under the leading edge — the line the eye
      // follows up a spiral, and what stops a thin plate reading as paper
      const an = a + half, rm = (rOut + rIn) / 2;
      const nose = new THREE.Mesh(noseGeo, redIron);
      nose.position.set(Math.cos(an) * rm, y + LH_TREAD_T / 2 - 0.045, Math.sin(an) * rm);
      nose.rotation.y = -an;
      stairs.add(nose);
      // a baluster on every tread, out at the rail
      const bal = new THREE.Mesh(balGeo, redIron);
      bal.position.set(Math.cos(a) * LH_RAIL_R, y + LH_TREAD_T / 2 + 0.45, Math.sin(a) * LH_RAIL_R);
      stairs.add(bal);
    }
    // the handrail: one unbroken red tube on the outside of the spiral
    {
      const pts = [];
      for (let y = LH_STEP * 0.5; y <= LH_TOP + 0.01; y += 0.22) {
        const a = stairAngleAt(y);
        pts.push(new THREE.Vector3(Math.cos(a) * LH_RAIL_R, y + LH_TREAD_T / 2 + 0.9, Math.sin(a) * LH_RAIL_R));
      }
      const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.026, 7, false), redIron);
      stairs.add(rail);
    }
    /* Light. A brick tube is black without it. Lamps on the wall every half
     * turn, near-white so the brick stays brick; moonlight standing in every
     * window; and a cold wash down the shaft from the lantern, so the top is
     * a pale disc you climb toward. */
    for (let y = 2.0; y < LH_TOP - 1.5; y += LH_RISE * 0.5) {
      const a = stairAngleAt(y) + Math.PI;
      const lr = lhBoreAt(y) - 0.35;
      const px = Math.cos(a) * lr, pz = Math.sin(a) * lr;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe2bd, fog: false }));
      bulb.position.set(px, y + 1.4, pz);
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.28), iron);
      bracket.position.set(px * 1.07, y + 1.4, pz * 1.07);
      bracket.lookAt(0, y + 1.4, 0);
      const lamp = new THREE.PointLight(0xffe0bc, 13, 11, 1.4);
      lamp.position.set(px * 0.84, y + 1.4, pz * 0.84);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffd39a, transparent: true, opacity: 0.32,
        depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      }));
      halo.position.copy(bulb.position);
      halo.scale.setScalar(1.4);
      stairs.add(bulb, bracket, lamp, halo);
    }
    for (const w of lhWindows) {
      const ml = new THREE.PointLight(0x9db4dc, 5, 7, 1.3);
      ml.position.set(Math.cos(w.ang) * (lhBoreAt(w.y) - 0.3), w.y, Math.sin(w.ang) * (lhBoreAt(w.y) - 0.3));
      stairs.add(ml);
    }
    const moonWash = new THREE.PointLight(0x8aa2cc, 6, 36, 1.2);
    moonWash.position.set(0, LH_TOP + 0.6, 0);
    stairs.add(moonWash);
  }
  lighthouse.add(stairs);

  // ---- windows up the shaft ---------------------------------------
  // Each is a hole cut clean through the scan (see the loader), lined with
  // a reveal and glazed, set beside the stair so you pass them climbing.
  for (const w of lhWindows) {
    const g = new THREE.Group();
    g.position.set(Math.cos(w.ang) * 0.1, w.y, Math.sin(w.ang) * 0.1);
    g.rotation.y = Math.atan2(Math.cos(w.ang), Math.sin(w.ang));   // face outward
    // the reveal is generated with the wall; only the glazing is placed here
    const rIn = lhBoreAt(w.y) - 0.05, depth = Math.max(0.4, lhOuterAt(w.y) - rIn);
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
  // No corbel under it: a second ring a half-metre below the deck read as
  // another floor from the stair, and there is one floor up here, the top.
  cutWedge(deck.geometry, HATCH_A0, HATCH_A1);
  lighthouse.add(deck);

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
  /* Built to the photograph of a real lantern: heavy black astragals, a
   * rusted sill ring where the glazing meets the deck, a segmented black
   * roof with a ventilator cowl on it, and — the thing the eye actually goes
   * to — a DRUM LENS on a steel column rather than a bare bulb. The old one
   * was a glowing sphere inside three brass hoops and read as a light bulb in
   * a greenhouse. */
  const LR_R = 1.95, LR_Y0 = LH_TOP + 0.1, LR_H = 3.3;
  const GLASS_Y0 = LR_Y0 + 0.35, GLASS_H = LR_H - 0.35;
  const rust = new THREE.MeshStandardMaterial({
    color: 0x6b4634, roughness: 0.92, metalness: 0.25, flatShading: true, emissive: 0x1a0e08 });
  const steelGrey = new THREE.MeshStandardMaterial({
    color: 0x767c85, roughness: 0.42, metalness: 0.7, flatShading: true, emissive: 0x14171b });

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
  // the rusted sill the glazing is bedded in — every lantern has one, and it
  // is the only warm colour up here
  const sill = new THREE.Mesh(new THREE.CylinderGeometry(LR_R + 0.13, LR_R + 0.13, 0.16, 24, 1, true), rust);
  sill.position.y = GLASS_Y0 + 0.02;
  lighthouse.add(sill);

  // the glass itself
  lanternGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(LR_R, LR_R, GLASS_H, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xa8c6e0, roughness: 0.05, metalness: 0.15,
      transparent: true, opacity: 0.14, side: THREE.DoubleSide, emissive: 0x1d2733,
    }));
  lanternGlass.position.y = GLASS_Y0 + GLASS_H / 2;
  lighthouse.add(lanternGlass);
  /* Astragals. Twelve, not sixteen, and nearly twice as thick: in the
   * photograph they are structural columns carrying the roof, not glazing
   * beads, and each one has a foot casting where it meets the sill. */
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.13, GLASS_H, 0.11), iron);
    bar.position.set(Math.cos(a) * LR_R, GLASS_Y0 + GLASS_H / 2, Math.sin(a) * LR_R);
    bar.rotation.y = -a;
    lighthouse.add(bar);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.17), iron);
    foot.position.set(Math.cos(a) * LR_R, GLASS_Y0 + 0.11, Math.sin(a) * LR_R);
    foot.rotation.y = -a;
    lighthouse.add(foot);
  }
  for (const yy of [GLASS_Y0 + GLASS_H * 0.42, GLASS_Y0 + GLASS_H * 0.84]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(LR_R, 0.045, 6, 24), iron);
    ring.rotation.x = Math.PI / 2; ring.position.y = yy;
    lighthouse.add(ring);
  }

  /* The roof: a black cone with the ribs showing, a cornice where it lands on
   * the astragals, and a VENTILATOR — the cowl and ball that carried the
   * lamp's fumes out. A bare cone with a sphere on it reads as a party hat;
   * the ribs and the cowl are what make it ironwork. */
  const roofMat = iron.clone(); roofMat.side = THREE.DoubleSide;
  const ROOF_Y = GLASS_Y0 + GLASS_H;
  const cornice = new THREE.Mesh(new THREE.CylinderGeometry(LR_R + 0.22, LR_R + 0.16, 0.18, 24), iron);
  cornice.position.y = ROOF_Y + 0.09;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(LR_R + 0.24, 1.35, 24), roofMat);
  roof.position.y = ROOF_Y + 0.86;
  lighthouse.add(cornice, roof);
  for (let i = 0; i < 12; i++) {                       // the ribs down the roof
    const a = (i / 12) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.38, 0.05), iron);
    rib.position.set(Math.cos(a) * (LR_R + 0.24) * 0.5, ROOF_Y + 0.86, Math.sin(a) * (LR_R + 0.24) * 0.5);
    rib.rotation.set(Math.sin(a) * 0.55, -a, -Math.cos(a) * 0.55);
    lighthouse.add(rib);
  }
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.36, 0.5, 12), iron);
  cowl.position.y = ROOF_Y + 1.70;
  const cowlCap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), iron);
  cowlCap.position.y = ROOF_Y + 1.94;
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.7, 6), iron);
  finial.position.y = ROOF_Y + 2.35;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), iron);
  ball.position.y = ROOF_Y + 2.72;
  lighthouse.add(cowl, cowlCap, finial, ball);

  // ---- the optic ----------------------------------------------------
  /* A drum lens on a steel column, which is what is actually up there: a
   * glass cylinder banded with the horizontal prism rings that bend the light
   * into a sheet, vertical astragals holding the panels, a brass crown, and
   * the burner inside it. */
  const COL_Y = GLASS_Y0, LENS_H = 1.30, LENS_R = 0.56;
  const LENS_Y0 = COL_Y + 0.95;
  const LAMP_Y = LENS_Y0 + LENS_H / 2;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.16, 14), steelGrey);
  base.position.y = COL_Y + 0.08;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.185, 0.88, 12), steelGrey);
  column.position.y = COL_Y + 0.56;
  const table = new THREE.Mesh(new THREE.CylinderGeometry(LENS_R + 0.06, 0.30, 0.14, 16), brass);
  table.position.y = LENS_Y0 - 0.02;
  lighthouse.add(base, column, table);
  // the glass drum
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(LENS_R, LENS_R, LENS_H, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xffe6bd, roughness: 0.08, metalness: 0.05, transparent: true,
      opacity: 0.34, side: THREE.DoubleSide, emissive: 0x6a4a1c,
    }));
  drum.position.y = LAMP_Y;
  lighthouse.add(drum);
  // the prism rings — the horizontal steps that make it a Fresnel
  for (let k = 0; k < 9; k++) {
    const t = (k + 0.5) / 9;
    const ry = LENS_Y0 + t * LENS_H;
    // fattest in the middle, where the belt of the lens throws the beam
    const rr = LENS_R + 0.035 * Math.sin(t * Math.PI);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.032, 5, 20), brass);
    ring.rotation.x = Math.PI / 2; ring.position.y = ry;
    lighthouse.add(ring);
  }
  for (let i = 0; i < 8; i++) {                        // the panel astragals
    const a = (i / 8) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, LENS_H, 0.035), brass);
    bar.position.set(Math.cos(a) * LENS_R, LAMP_Y, Math.sin(a) * LENS_R);
    bar.rotation.y = -a;
    lighthouse.add(bar);
  }
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, LENS_R + 0.05, 0.30, 16), brass);
  crown.position.y = LENS_Y0 + LENS_H + 0.13;
  const crownCap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass);
  crownCap.position.y = LENS_Y0 + LENS_H + 0.27;
  lighthouse.add(crown, crownCap);

  // the burner: small, inside the drum, and still what `updateTower()` flashes
  lampCore = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe9c2, fog: false }));
  lampCore.position.y = LAMP_Y;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe6bf, transparent: true, opacity: 0.85, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  glow.position.y = LAMP_Y; glow.scale.setScalar(6);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffdca6, transparent: true, opacity: 0.16, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  halo.position.y = LAMP_Y; halo.scale.setScalar(22);
  lighthouse.userData.glow = glow; lighthouse.userData.halo = halo;
  const lampLight = new THREE.PointLight(0xffd9a0, 14, 14, 1.5);
  lampLight.position.y = LAMP_Y;
  /* The crosshair cannot hit a 0.19 m burner through a glass drum, so the
   * light carries its own proxy — sized to the whole optic, so anywhere on
   * the lens counts. It is registered as an interactable much further down
   * the file, because `addInteractable` does not exist yet up here. */
  const lampProxy = new THREE.Mesh(new THREE.CylinderGeometry(LENS_R + 0.18, LENS_R + 0.18, LENS_H + 0.5, 10),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  lampProxy.name = 'hitProxy';
  lampProxy.position.y = LAMP_Y;
  lighthouse.add(lampProxy);
  lhParts.lampProxy = lampProxy;
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
const farProps = [];        // {obj, z, d}: things switched off beyond d metres; see updateFarProps()
const lhGround = new THREE.Group();
lighthouse.add(lhGround);
/* The DRESSING — stone and grass — lives in its own group so it can be
 * switched off past 320 m without taking the ridge, the lane and the fences
 * with it. It is all InstancedMesh with frustumCulled off (three culls an
 * InstancedMesh by its BASE geometry's bounds, which is wrong for a scatter),
 * so without the far cull a few hundred thousand triangles of grass would
 * draw from the spawn, a kilometre away. */
const lhDress = new THREE.Group();
lhGround.add(lhDress);
farProps.push({ obj: lhDress, z: LH_Z, d: 320 });

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

  /* Making the ridge meet the beach without a seam takes three things, and
   * the old build had none of them:
   *
   *   1. WORLD UVs at the beach's own density. The ridge's uv ran 0..1 across
   *      its own plane, so the grain changed size and phase at the join. The
   *      sand plane is 1600 m at 177.8 repeats — one tile per SAND_TILE (9 m)
   *      — and it recentres by whole multiples of SAND_TILE, so the phase is
   *      preserved and (wx + 800) / 9 lines the two up exactly.
   *   2. COLOUR that starts as sand. The crown is grassy headland and the toe
   *      is beach; mixing between them by height means there is no line to
   *      see, because the two materials are the same colour where they meet.
   *   3. A DISSOLVED edge. Even matched, two coplanar surfaces at y = 0 fight
   *      for the depth buffer. The rim is dropped below the sand and the last
   *      strip is discarded against a hash, so the ridge ends in a ragged
   *      scatter of sand-coloured pixels instead of a circle.
   */
  const uv = g.attributes.uv, hAttr = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const wx = LH_X + pos.getX(i);
    const wz = LH_Z + pos.getZ(i);
    uv.setXY(i, (wx + 800) / SAND_TILE, (800 - wz) / SAND_TILE);
    const h = pos.getY(i) + HL_CREST;                 // height above the beach
    hAttr[i] = h;
    /* The rim SINKS rather than dissolving. A hash dither keyed to height was
     * tried and is wrong here: the ridge climbs slowly, so even a 0.4 m band
     * of height is metres of ground and, seen along the slope, half the
     * headland turned to speckle. Sinking the last third of a metre below
     * y = 0 lets the beach plane — which is opaque and right there — cover
     * the join, so the ridge simply comes up out of the sand. It also ends
     * the z-fighting the two had while they were coplanar at the toe. */
    if (h < 0.35) pos.setY(i, pos.getY(i) - (0.35 - h) * 1.7);
  }
  g.setAttribute('aH', new THREE.BufferAttribute(hAttr, 1));
  g.computeVertexNormals();
  const gTex = sandTex.clone(); gTex.needsUpdate = true; gTex.repeat.set(1, 1);
  const gBump = sandBump.clone(); gBump.needsUpdate = true; gBump.repeat.set(1, 1);
  const ridgeMat = new THREE.MeshStandardMaterial({
    map: gTex, bumpMap: gBump, bumpScale: 1.2,
    color: 0xffffff, roughness: 1, metalness: 0,
    emissive: 0xffffff, emissiveMap: gTex, flatShading: false,
  });
  ridgeMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = oceanUniforms.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aH;\nvarying float vH;\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vH = aH;\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH;\nvarying vec3 vWP;\nuniform float uTime;\nfloat bwWet;\n' + noiseGLSL + shoreGLSL)
      .replace('#include <map_fragment>', `#include <map_fragment>
        // sand at the toe, headland grass on the crown, and nothing in
        // between that draws a line
        float bwG = smoothstep(0.25, 2.6, vH);
        diffuseColor.rgb *= mix(vec3(0.427, 0.490, 0.600), vec3(0.439, 0.471, 0.384), bwG);
        /* And the toe has to take the beach's WET TINT too. sandMat darkens
         * itself for sixteen metres landward of the waterline, and the ridge
         * meets the beach right inside that band — so matching only the base
         * colour still left the ridge a pale oval sitting on darker sand.
         * Weighted by (1 - grass) so the dry crown never sees it. */
        bwWet = smoothstep(16.0, -1.0, vWP.x - shoreLine(vWP.z, uTime)) * (1.0 - bwG);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.78, 0.9), bwWet);`)
      /* And the wet beach is not just darker, it is SMOOTH and slightly
       * METALLIC — which under one directional light at night is most of why
       * it reads dark at all. Matching only the albedo left the ridge a pale
       * oval on dark sand; these two lines are what actually close the gap. */
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.30, bwWet);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = mix(metalnessFactor, 0.22, bwWet);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance *= mix(vec3(0.153, 0.196, 0.290), vec3(0.188, 0.220, 0.165),
                                     smoothstep(0.25, 2.6, vH));`);
  };
  const ridge = new THREE.Mesh(g, ridgeMat);
  ridge.frustumCulled = false;
  lhGround.add(ridge);

  /* The footing, and it has to be built HERE. `lhOuterAt(0)` is 4.62 and the
   * ridge falls away from the tower's axis — at that radius `headlandAt()`
   * has already dropped about 1.2 m — so the base course hung in the air on
   * every downhill side and you could see under the building. This is the
   * splayed plinth that beds it in: a skirt swept round the tower from its
   * own face out to 6.6 m, every outer vertex dropped to the GROUND at that
   * point and a little under it, so it meets the headland all the way round
   * however the ridge falls there.
   *
   * It cannot live up in the shaft block with the rest of the masonry:
   * `headlandAt()` reads `pathBend`, which is declared further down the file,
   * and calling it during module evaluation is a temporal dead zone crash
   * that takes the whole page with it. That is the trap CLAUDE.md warns
   * about, and it caught this on the first try. */
  {
    const SEG = 60, R_IN = lhOuterAt(0.0) - 0.05, R_OUT = 6.6;
    const fpos = [], fidx = [];
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const cx = Math.cos(a), cz = Math.sin(a);
      fpos.push(cx * R_IN, 0.42, cz * R_IN);                    // on the tower's face
      const gy = headlandAt(LH_X + cx * R_OUT, LH_Z + cz * R_OUT) - HL_CREST;
      fpos.push(cx * R_OUT, gy - 0.45, cz * R_OUT);             // sunk into the ridge
    }
    for (let i = 0; i < SEG; i++) {
      const a = i * 2, b2 = a + 2;
      fidx.push(a, b2, b2 + 1, a, b2 + 1, a + 1);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
    fg.setIndex(fidx);
    fg.computeVertexNormals();
    const footing = new THREE.Mesh(fg, lhParts.render);
    footing.frustumCulled = false;
    lhGround.add(footing);
  }
}

{
  /* The headland is dressed from three scan packs, placed on the ridge by
   * headlandAt() and kept off the lane by onPath() — the same two rules the
   * old dodecahedra and the grass.json clumps followed, with real stone and
   * real grass instead. The approach to the door is the last thing the walk
   * shows you, so this is where the beach spends its detail budget.
   *
   *   assets/stones.glb        shtran's rocks & stones: ten scanned rocks
   *   assets/grass-clumps.glb  3dhdscan's grass chunks: four alpha-card clumps
   *   assets/grass-patch.glb   Pasha's realistic grass: one dense blade patch
   *
   * Everything is bedded INTO the ridge — a fraction of its own height under
   * the surface — because the ridge is a smooth heightfield and anything set
   * on it at exactly y = 0 floats on every slope. */
  const rnd = mulberry32(19770);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  // re-roll a spot until it's off the path (bounded, so it can't spin)
  const offPath = (pick, margin) => {
    for (let tries = 0; tries < 24; tries++) {
      const p = pick();
      if (!onPath(p.x, p.z, margin)) return p;
    }
    return null;
  };
  const ridgeY = (x, z) => headlandAt(LH_X + x, LH_Z + z) - HL_CREST;   // local y on the ridge
  const onRidge = (x, z) => headlandAt(LH_X + x, LH_Z + z) > 1.4       // the crown, not the fall-off
    // ...and never on the building or its stone apron. The footing skirt runs
    // out to 6.6 m, so anything inside that is either growing through the
    // masonry or standing on it — which is how grass ended up in the doorway.
    && Math.hypot(x, z) > 7.0;

  // the same night treatment the beach rocks get: the scans were lit for
  // day, and a cool tint keeps them the colour of everything else out here
  const nightStone = (mat) => {
    // a fraction of the lift the beach formation gets: these are small, many
    // and IN the moon, and at the formation's emissive they glowed like lamps
    mat.color.setHex(0x6f7a8c); mat.emissive.setHex(0x1e2531); mat.emissiveMap = mat.map;
    mat.roughness = 1; mat.metalness = 0;
    if (mat.normalScale) mat.normalScale.set(1.2, 1.2);
    reexpose(mat, 0.68);
  };
  const nightGrass = (mat) => {
    mat.color.setHex(0xb2c0aa); mat.emissive.setHex(0x2c3a2e); mat.emissiveMap = mat.map;
    mat.roughness = 1; mat.metalness = 0;
    mat.side = THREE.DoubleSide; mat.transparent = false; mat.alphaTest = 0.42; mat.depthWrite = true;
    // the same sway the old clumps had, so the headland moves in the wind
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = oceanUniforms.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 iw = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float sway = sin(uTime * 1.5 + iw.x * 0.7 + iw.z * 0.5) * 0.5
                     + sin(uTime * 2.6 + iw.z) * 0.2;
          transformed.x += sway * 0.14 * max(position.y, 0.0);
          transformed.z += sway * 0.09 * max(position.y, 0.0);`);
    };
    mat.needsUpdate = true;
  };
  // bake a loaded mesh's node transform, recentre on its footprint, base at 0
  const bakeKind = (o) => {
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
    geo.computeBoundingBox();
    const b = geo.boundingBox;
    geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    const size = geo.boundingBox.getSize(new THREE.Vector3());
    return { geo, mat: o.material, name: o.name, foot: Math.max(size.x, size.z), h: size.y, size };
  };

  // ---- stone --------------------------------------------------------
  new GLTFLoader().load('assets/stones.glb', (gltf) => {
    gltf.scene.updateMatrixWorld(true);
    const kinds = [];
    gltf.scene.traverse((o) => { if (o.isMesh) kinds.push(bakeKind(o)); });
    kinds.sort((a, b) => (a.name < b.name ? -1 : 1));
    kinds.forEach((k) => nightStone(k.mat));
    const pick = () => kinds[Math.floor(rnd() * kinds.length)];
    /* Three populations, one pool per kind:
     *   - a field of stone round the tower, thickest out to the flanks,
     *   - a few real boulders on the fall-off, solid to walk into,
     *   - and the kicked-aside stones lining the lane, which the feet of a
     *     century put there. */
    const per = new Map(kinds.map((k) => [k, []]));
    const slopeAt = (x, z) => Math.hypot(ridgeY(x + 0.5, z) - ridgeY(x - 0.5, z), ridgeY(x, z + 0.5) - ridgeY(x, z - 0.5));
    const place = (k, x, z, width, bury, tilt = 0.25) => {
      const s = width / k.foot, sy = s * (0.78 + rnd() * 0.3);
      // steeper ground, deeper bedding — plus half the drop across the
      // footprint, so the downhill edge meets the surface too
      const drop = slopeAt(x, z) * width * 0.8;
      const y = ridgeY(x, z) - k.h * sy * bury - drop;
      e.set((rnd() - 0.5) * tilt, rnd() * Math.PI * 2, (rnd() - 0.5) * tilt);
      q.setFromEuler(e);
      m.compose(v.set(x, y, z), q, sc.set(s, sy, s));
      per.get(k).push(m.clone());
      return { top: y + k.h * sy, r: width * 0.5 * 0.8 };
    };
    for (let i = 0; i < 110; i++) {                                    // the field
      const w = 0.22 + Math.pow(rnd(), 1.6) * 1.3;
      const spot = offPath(() => {
        const a = rnd() * Math.PI * 2, rr = 4.5 + Math.pow(rnd(), 0.7) * 15;
        return { x: Math.cos(a) * rr, z: Math.max(-12, Math.sin(a) * rr) };
      }, w * 0.6 + 0.3);
      if (!spot || !onRidge(spot.x, spot.z)) continue;
      place(pick(), spot.x, spot.z, w, 0.18 + rnd() * 0.16);
    }
    for (let i = 0; i < 4; i++) {                                      // the boulders
      const w = 1.2 + rnd() * 0.8;
      const side = i % 2 ? 1 : -1;
      const spot = offPath(() => ({ x: side * (6 + rnd() * 4), z: -4 + rnd() * 18 }), w * 0.6 + 0.4);
      if (!spot || headlandAt(LH_X + spot.x, LH_Z + spot.z) < 2.5 || slopeAt(spot.x, spot.z) > 0.5) continue;
      const c = place(pick(), spot.x, spot.z, w, 0.22 + rnd() * 0.12, 0.14);
      rockColliders.push({ x: LH_X + spot.x, z: LH_Z + spot.z, r: c.r, top: HL_CREST + c.top });
    }
    for (let i = 0; i < 70; i++) {                                     // the lane's edging
      const z = -0.5 + rnd() * (PATH_LEN + 1.5);
      const side = i % 2 ? 1 : -1;
      const w = 0.12 + rnd() * 0.24;
      const x = pathBend(z) + side * (pathHalfAt(z) + 0.05 + rnd() * 0.5);
      if (!onRidge(x, z)) continue;
      place(pick(), x, z, w, 0.55 + rnd() * 0.25, 0.5);       // kicked here and trodden in
    }
    for (const [k, mats] of per) {
      if (!mats.length) continue;
      const inst = new THREE.InstancedMesh(k.geo, k.mat, mats.length);
      mats.forEach((mm, idx) => inst.setMatrixAt(idx, mm));
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      lhDress.add(inst);
    }
  });

  // ---- grass --------------------------------------------------------
  // the clumps: knee-high tufts, everywhere the ridge is dry and the lane isn't
  new GLTFLoader().load('assets/grass-clumps.glb', (gltf) => {
    gltf.scene.updateMatrixWorld(true);
    const kinds = [];
    gltf.scene.traverse((o) => { if (o.isMesh) kinds.push(bakeKind(o)); });
    const seen = new Set();
    kinds.forEach((k) => { if (!seen.has(k.mat)) { seen.add(k.mat); nightGrass(k.mat); } });
    const PER = 260;
    for (const k of kinds) {
      const inst = new THREE.InstancedMesh(k.geo, k.mat, PER);
      inst.frustumCulled = false;
      for (let i = 0; i < PER; i++) {
        const cz = -14 + rnd() * (HL_RUN + 20);
        const side = rnd() < 0.5 ? -1 : 1;
        const cx = pathBend(Math.max(0, cz)) + side * (pathHalfAt(Math.max(0, cz)) + rnd() * 10);
        const bx = cx + (rnd() - 0.5) * 2.4, bz = cz + (rnd() - 0.5) * 2.4;
        if (!onRidge(bx, bz) || onPath(bx, bz, -0.15)) { inst.setMatrixAt(i, hidden); continue; }
        const h = (0.9 + rnd() * 0.7);                  // the clumps are ~0.5 m tall as shipped
        e.set(0, rnd() * Math.PI * 2, 0); q.setFromEuler(e);
        m.compose(v.set(bx, ridgeY(bx, bz) - 0.03, bz), q, sc.set(h, h, h));
        inst.setMatrixAt(i, m);
      }
      inst.instanceMatrix.needsUpdate = true;
      lhDress.add(inst);
    }
  });
  // the dense patch: lush ground cover along the lane's edges up to the door,
  // where you are close enough to see individual blades
  new GLTFLoader().load('assets/grass-patch.glb', (gltf) => {
    gltf.scene.updateMatrixWorld(true);
    let kind = null;
    gltf.scene.traverse((o) => { if (o.isMesh && !kind) kind = bakeKind(o); });
    if (!kind) return;
    nightGrass(kind.mat);
    const N = 12;                        // 30k triangles each — this is the budget
    const inst = new THREE.InstancedMesh(kind.geo, kind.mat, N);
    inst.frustumCulled = false;
    // as shipped it is a ~1 m square of 5 cm blades; stretched to 2.2 m
    // squares of 0.24 m blades it is the grass you walk past, not a lawn
    const sw = 2.2 / kind.foot, sy = 0.24 / Math.max(0.01, kind.h);
    for (let i = 0; i < N; i++) {
      const z = 0.5 + rnd() * 20;
      const side = i % 2 ? 1 : -1;
      const x = pathBend(z) + side * (pathHalfAt(z) + 1.0 + rnd() * 2.2);
      if (!onRidge(x, z) || onPath(x, z, 0.9)) { inst.setMatrixAt(i, hidden); continue; }
      e.set(0, rnd() * Math.PI * 2, 0); q.setFromEuler(e);
      m.compose(v.set(x, ridgeY(x, z) - 0.02, z), q, sc.set(sw, sy, sw));
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    lhDress.add(inst);
  });

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
          /* Never inside the building. The lane starts at the threshold, so
           * its first shoulder posts were landing within the tower's own
           * footprint — one of them stood on the stair. */
          if (Math.hypot(cx, z) < LH_OUTER + 1.1) { z += 2.3; continue; }
          const gy = headlandAt(LH_X + cx, LH_Z + z) - HL_CREST;
          const h = 1.02 + Math.random() * 0.16;
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, h, 6), postMat);
          post.position.set(cx, gy + h / 2 - 0.06, z);
          post.rotation.set((Math.random() - 0.5) * 0.09, Math.random(), (Math.random() - 0.5) * 0.11);
          lhGround.add(post);
          tops[0].push(new THREE.Vector3(cx, gy + h - 0.16, z));
          tops[1].push(new THREE.Vector3(cx, gy + h - 0.52, z));
          // and the wire is strung between the posts that exist, so it does
          // not simply fly through the wall where one was skipped
          if (tops[0].length && Math.hypot(cx, z) < LH_OUTER + 1.1) { tops[0].length = 0; tops[1].length = 0; }
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


    // the stones kicked to the sides of the lane are placed with the field above
    // a few flat slabs set into the last stretch up to the threshold
    const SLABS = 9;
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x4a515e, roughness: 1, flatShading: true, emissive: 0x12161d });
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
/* Re-exposing a scanned prop. Both of the scans on this beach were baked
 * under a midday sun and come out as black cut-outs under a quarter moon —
 * the rocks average 0.05 linear, the body bag 0.002, which is not a texture
 * at all, it is a hole. So the albedo goes through a gamma lift before the
 * lighting sees it: same map, same detail, carried up to where the sand
 * already sits. `rim` adds a cold Fresnel edge on top, and for something as
 * dark as the bag that rim is the only thing that gives it a shape you can
 * read rather than a silhouette you can't. Done in the shader, deliberately,
 * so the files on disk stay the textures that shipped with the models.
 *
 * `normal` and `vViewPosition` are both in scope by <emissivemap_fragment>:
 * it sits after <normal_fragment_maps>, so the rim follows the normal map's
 * creases instead of the smooth geometry underneath. */
function reexpose(mat, gamma, rim) {
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>',
      '#include <map_fragment>\n  diffuseColor.rgb = pow(diffuseColor.rgb, vec3('
      + gamma.toFixed(3) + '));');
    if (!rim) return;
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n'
      + '  float bwRim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.6);\n'
      + '  totalEmissiveRadiance += vec3(' + rim.map((v) => v.toFixed(3)).join(', ') + ') * bwRim;');
  };
  mat.needsUpdate = true;
}

// ------------------------------------------------------------------
// Beach rocks — the scanned granite formations
// ------------------------------------------------------------------
/* Six scanned boulders out of assets/rocks.glb — Domenico Bianco's "(FREE)
 * Realistic Rocks - Asset LowPoly", repacked by tools/gltfpack.py. Geometry,
 * UVs and the baked albedo + normal come through exactly as modelled — the
 * scan IS the look, which is why these keep their maps when the rest of the
 * beach is flat shaded and untextured. Only the exposure moves, and only in
 * the shader: see reexpose() above.
 *
 * They go down as FORMATIONS, never as lone lumps, because that is what the
 * reference photograph is: a granite heap on open sand. One dominant mass,
 * smaller ones leaning in against it, a skirt of half-buried chunks around
 * that, and sand drifted up the sides of the whole pile — that last part is
 * the `apron`, and it is what makes them sit IN the beach rather than on it.
 *
 * Fixed world objects: deliberately outside the recentring `debris` tile and
 * outside clipAtShore(). They're landmarks you can climb, and a real rock
 * stays visible when the tide runs over it.
 */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Collision. The game has no mesh collision, so each mass registers a
 * cylinder: stand on it when your feet clear the top, and get pushed out of
 * it when they don't. Cheap, and for rounded boulders it's honest enough. */
const rockColliders = [];
const rockGroup = new THREE.Group();
scene.add(rockGroup);

/* The apron. A plane bent into a low dome and then let fall away past the
 * rim, so the apron's own edge is buried under the beach instead of drawing
 * a circle across it. Built per formation because the uv has to carry the
 * world texel density: sandTex repeats every SAND_TILE metres, so a dome of
 * radius R spans 2R/SAND_TILE of a tile — not the whole 0..1 a plane ships
 * with, which would put 177 tiles inside six metres and mip down to mud. */
/* Every heaped bank in one group, so the crosshair can be raycast at them
 * when something is set down. */
const driftGroup = new THREE.Group();
scene.add(driftGroup);
function makeApron(R) {
  const g = new THREE.PlaneGeometry(2, 2, 18, 18);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  const k = R / (SAND_TILE * sandTex.repeat.x);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const d = Math.min(1, Math.hypot(x, z));
    p.setY(i, Math.cos(d * Math.PI * 0.5) - (d > 0.84 ? (d - 0.84) * 3.4 : 0));
    uv.setXY(i, 0.5 + x * k, 0.5 + z * k);
  }
  g.computeVertexNormals();
  return g;
}

/* Keep-outs. Only the headland and the trodden lane to the lighthouse door
 * matter now that there is one formation and it stands near Bradly. */
function rockSpotClear(x, z) {
  if (headlandAt(x, z) > 0.15) return false;                 // never on the ridge
  if (onPath(x - LH_X, z - LH_Z, 0.5)) return false;         // nor across the lane to the door
  if (Math.hypot(x - LH_X, z - LH_Z) < 7.0) return false;    // nor through the tower or its apron
  return true;
}

new GLTFLoader().load('assets/rocks.glb', (gltf) => {
  gltf.scene.updateMatrixWorld(true);

  // ---- the six rocks, baked flat and stood on their own base -------------
  const kinds = [];
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    // Bake the node transform in — the download hangs the rocks off an FBX
    // root at 0.01 scale, rotated Y-up, and spread across a 13 m layout grid.
    // After this each geometry is upright, in metres, centred on its own
    // footprint with its base exactly at y = 0.
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
    geo.computeBoundingBox();
    const b = geo.boundingBox;
    geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    const s = geo.boundingBox.getSize(new THREE.Vector3());

    const mat = o.material;                 // the model's own maps, kept
    mat.color.setHex(0x93a1bb);             // granite in moonlight, not in sun
    // You walk INTO the moon, so every rock ahead of you is backlit and the
    // moon contributes nothing to the face you are looking at. The emissive
    // is what carries the stone on that side — without it a formation is a
    // black cut-out until you have walked past it.
    mat.emissive.setHex(0x6d7d9c);
    mat.emissiveMap = mat.map;              // so the lift follows the stone
    mat.roughness = 1;
    mat.metalness = 0;
    if (mat.normalScale) mat.normalScale.set(1.4, 1.4);
    reexpose(mat, 0.54);

    kinds.push({ geo, mat, name: o.name, foot: Math.max(s.x, s.z), h: s.y });
  });
  if (!kinds.length) return;
  kinds.sort((a, b) => (a.name < b.name ? -1 : 1));   // scatter must be stable
  // blocky ones carry a formation; flat ones are the slabs it sheds
  const tall = kinds.filter((k) => k.h / k.foot > 0.8);
  const stock = tall.length ? tall : kinds;

  /* One mass. `width` is what it should measure across the sand, `bury` how
   * much of its own height goes under. The scans are open-bottomed, so the
   * ragged rim has to end up below the beach — and these are bedded a good
   * way past that, because a boulder that has sat on a beach for a century
   * is half in it. `lift` rides one up onto the pile. Returns its crown. */
  function placeMass(kind, wx, wz, width, bury, lift, rnd) {
    const sc = width / kind.foot;
    const sy = sc * (0.72 + rnd() * 0.26);       // squat, and never twice alike
    const sunk = kind.h * sy * bury;
    const m = new THREE.Mesh(kind.geo, kind.mat);
    m.scale.set(sc, sy, sc);
    m.position.set(wx, lift - sunk, wz);
    m.rotation.set((rnd() - 0.5) * 0.2, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.2);
    rockGroup.add(m);
    const top = lift + kind.h * sy - sunk;
    // A half-buried chunk is scenery, not terrain: giving it a collider would
    // only shove you off a 20 cm nub you should be walking straight over.
    if (top > 0.42) {
      // the full half-width, not 82 % of it: at 0.82 the outer faces of the
      // big masses stood clear of their own collider and you walked into stone
      rockColliders.push({ x: wx, z: wz, r: width * 0.5, top });
    }
    return top;
  }
  const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

  /* ONE formation, on the sand below Bradly. It is a landmark, not scenery —
   * scattering stone the length of the walk was tried and made the beach
   * read as a quarry, so this is the only rock on it.
   *
   * The distances are all fractions of `big`, the dominant mass, and they are
   * deliberately SHORT: the huddle sits *inside* its radius so the masses
   * interpenetrate and the pile reads as one rock with faces. Spaced politely
   * apart you get five boulders standing about on a beach. */
  const rnd = mulberry32(20260901);
  const cx = 6.4, z = bradly.position.z + 3.0;
  const big = 3.4;
  const crown = placeMass(pick(stock, rnd), cx, z, big, 0.26, 0, rnd);

  // the huddle, leaning in against the core — the first two ride up on the
  // pile, and that stacking is what stops it reading as a ring
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rnd() * 0.9;
    const d = big * (0.26 + rnd() * 0.32);
    const mx = cx + Math.cos(a) * d, mz = z + Math.sin(a) * d;
    if (!rockSpotClear(mx, mz)) continue;
    placeMass(pick(kinds, rnd), mx, mz, big * (0.44 + rnd() * 0.42),
      0.24 + rnd() * 0.12, i < 2 ? crown * (0.1 + rnd() * 0.22) : 0, rnd);
  }
  // masses shed off the side of the pile, still touching it
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2;
    const d = big * (0.66 + rnd() * 0.46);
    const mx = cx + Math.cos(a) * d, mz = z + Math.sin(a) * d;
    if (!rockSpotClear(mx, mz)) continue;
    placeMass(pick(kinds, rnd), mx, mz, big * (0.22 + rnd() * 0.3),
      0.34 + rnd() * 0.18, 0, rnd);
  }
  // the skirt: chunks all but swallowed by the sand out around the pile
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2;
    const d = big * (1.0 + rnd() * 1.0);
    const mx = cx + Math.cos(a) * d, mz = z + Math.sin(a) * d;
    if (!rockSpotClear(mx, mz)) continue;
    placeMass(pick(kinds, rnd), mx, mz, 0.26 + rnd() * 0.6,
      0.55 + rnd() * 0.26, 0, rnd);
  }
  /* And the sand heaped against the lot of it. Two aprons rather than one:
   * a broad shallow one that takes the beach up to the pile, and a tighter,
   * taller one banked against the masses themselves. That inner bank is what
   * actually blends them — a rock meeting flat sand along a hard line reads
   * as dropped on the beach however deep it is bedded. */
  for (const [k, h] of [[2.35, 0.34], [1.28, 0.72]]) {
    const R = big * k;
    const apron = new THREE.Mesh(makeApron(R), sandMat);
    apron.scale.set(R, h, R);
    apron.position.set(cx, -0.12, z);
    apron.rotation.y = rnd() * Math.PI * 2;
    apron.renderOrder = -1;                    // under the footprint decals
    rockGroup.add(apron);      // stays here so it is far-culled with the rocks
  }
});

/* Drawing them. Fog swallows the beach past about 180 m, but the camera's far
 * plane is 5000 and the walk is a kilometre long, so frustum culling alone
 * leaves every rock on the beach submitted every frame — 175 draw calls of
 * pure fog. One pass over the list per frame costs nothing and takes them
 * back off. `farProps` is the same treatment for anything else too big to
 * draw at a distance it cannot be seen from; the body bag's ropes are 235k
 * triangles and stop being legible about 40 m out. */
const ROCK_DRAW = 210;
// `farProps` itself is declared up by lhGround — the headland registers into
// it at module load, long before this section runs
function updateFarProps() {
  const cz = camera.position.z;
  for (const m of rockGroup.children) m.visible = Math.abs(m.position.z - cz) < ROCK_DRAW;
  for (const f of farProps) f.obj.visible = Math.abs(f.z - cz) < f.d;
}

/* SOLIDS. `rockColliders` is the game's one list of things you cannot walk
 * through, and it is shared: the player is pushed out of them and stands on
 * them, and so is anything you throw. Two shapes, because a boulder is a
 * circle and a boat is not — a circle round a 5 m hull leaves you standing
 * on open air a metre off its side, which is exactly what the boat did:
 *
 *   { x, z, r, top }              a cylinder
 *   { x0, z0, x1, z1, top }       an axis-aligned box
 *
 * Every entry also carries `mat` — 'rock' by default, or 'wood' — which is
 * what a thrown bottle and a shovel blade both read to decide what they just
 * hit and what it should sound like. */
const ROCK_STEP = 0.42;                 // how high a lip you can walk straight up
// how far (x,z) is inside a solid; <= 0 is outside. Cheap, and the same test
// serves the floor lookup, the push-out and the props.
function solidDepth(c, x, z, grow = 0) {
  if (c.r !== undefined) {
    const dx = x - c.x, dz = z - c.z, rr = c.r + grow;
    const d2 = dx * dx + dz * dz;
    return d2 >= rr * rr ? 0 : rr - Math.sqrt(d2);
  }
  const px = Math.min(x - (c.x0 - grow), (c.x1 + grow) - x);
  const pz = Math.min(z - (c.z0 - grow), (c.z1 + grow) - z);
  return (px <= 0 || pz <= 0) ? 0 : Math.min(px, pz);
}
function rockGroundAt(x, z, feetY) {
  let best = null;
  for (const c of rockColliders) {
    if (solidDepth(c, x, z) <= 0) continue;
    if (feetY >= c.top - ROCK_STEP && (!best || c.top > best.top)) best = c;
  }
  return best;
}
// shove a point out of every solid it is inside, along the shallowest face,
// and report the last thing it was pushed out of
function pushOutOfSolids(pos, feetY, grow, headY = Infinity) {
  let hit = null;
  for (const c of rockColliders) {
    /* Anything whose top is within a STEP of your feet is a floor, not a
     * wall — `rockGroundAt()` lifts you onto it in the same frame. The two
     * used to disagree (0.06 here against ROCK_STEP there), so a stair tread
     * you were meant to walk up shoved you back off it instead. */
    if (feetY >= c.top - ROCK_STEP) continue;
    if (c.floorY !== undefined && headY < c.floorY) continue;   // you are under it
    if (solidDepth(c, pos.x, pos.z, grow) <= 0) continue;
    if (c.r !== undefined) {
      const dx = pos.x - c.x, dz = pos.z - c.z, rr = c.r + grow;
      const d = Math.hypot(dx, dz) || 1e-6;
      pos.x = c.x + (dx / d) * rr;
      pos.z = c.z + (dz / d) * rr;
    } else {
      const push = [(c.x0 - grow) - pos.x, (c.x1 + grow) - pos.x,
                    (c.z0 - grow) - pos.z, (c.z1 + grow) - pos.z];
      let k = 0;
      for (let i = 1; i < 4; i++) if (Math.abs(push[i]) < Math.abs(push[k])) k = i;
      if (k < 2) pos.x += push[k]; else pos.z += push[k];
    }
    hit = c;
  }
  return hit;
}
function pushOutOfRocks(feetY) {
  // your head, so a crouch takes you under the pier's deck
  pushOutOfSolids(camera.position, feetY, PLAYER_R * 0.85, feetY + playerHeight());
}

// ------------------------------------------------------------------
// Ground decals — footprints + dig holes (instanced pools)
// ------------------------------------------------------------------
function makeFootTexture() {
  /* A barefoot print pressed into wet sand, built the way the real thing is
   * shaped rather than as one blob: a HEEL pit, a BALL pit, a narrow arch
   * bridging them, and five toes as SEPARATE pits clear of the ball. The
   * previous one filled a single bezier outline with flat dark and read as a
   * smear.
   *
   * Three things carry it, in this order of importance:
   *   - the RIM. Sand displaced by a foot piles up all round the print and
   *     catches the light; that pale lip is what makes a photograph of a
   *     footprint read as a footprint. It is drawn as its own ring, brighter
   *     on the moon side, not as an outline stroke of the sole.
   *   - the toes being SEPARATE. Joined to the ball they read as a paw.
   *   - GRAIN inside. A smooth gradient reads as a painted shadow; sand
   *     inside a print is coarser than the sand around it, because the
   *     pressure brings the wet grit up.
   * The print points up the canvas; stampFoot() spins it to the heading and
   * mirrors it left/right per step. */
  const S = 256;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const rnd = (n) => Math.random() * n;

  // the parts, in canvas space: [cx, cy, rx, ry, rot, depth]
  const HEEL = [124, 196, 30, 34, 0, 1.0];
  const BALL = [130, 92, 37, 27, -0.06, 0.92];
  const ARCH = [131, 146, 20, 34, 0.03, 0.34];
  const TOES = [                                   // big toe to little
    [104, 46, 13.5, 11.5, -0.30, 0.86],
    [130, 38, 10.0, 8.6, -0.10, 0.80],
    [151, 41, 8.6, 7.4, 0.10, 0.74],
    [168, 49, 7.4, 6.4, 0.28, 0.68],
    [182, 60, 6.2, 5.6, 0.46, 0.60],
  ];
  const PARTS = [HEEL, BALL, ARCH, ...TOES];
  const ell = (p, grow = 0) => {
    g.beginPath();
    g.ellipse(p[0], p[1], p[2] + grow, p[3] + grow, p[4], 0, Math.PI * 2);
  };

  /* 1. the rim, and it has to be a RING. A radial gradient whose inner stop
   * sits inside the part fills the part pale, and since a night beach is
   * nearly black the pale wins and the whole print reads as a white ghost —
   * which is exactly what the first build did. Strokes, offset toward the
   * moon and stacked wide-then-narrow for softness, leave the middle alone. */
  const rim = (dx, dy, passes) => {
    g.save(); g.translate(dx, dy); g.lineJoin = 'round';
    for (const [w, col] of passes) {
      g.lineWidth = w; g.strokeStyle = col;
      for (const p of PARTS) { ell(p, 2.5); g.stroke(); }
    }
    g.restore();
  };
  rim(2.6, 3.2, [[7, 'rgba(196,210,236,0.15)'], [4, 'rgba(214,226,246,0.24)'], [2, 'rgba(226,236,252,0.32)']]);
  rim(-2.2, -2.8, [[6, 'rgba(0,1,4,0.20)'], [3, 'rgba(0,1,4,0.26)']]);

  // 2. the pits themselves — deepest at the middle of each part
  g.globalCompositeOperation = 'source-over';
  for (const p of PARTS) {
    const d = p[5];
    const rg = g.createRadialGradient(p[0], p[1] + 2, 0, p[0], p[1], p[2] + 3);
    rg.addColorStop(0, `rgba(1,2,6,${0.90 * d})`);
    rg.addColorStop(0.62, `rgba(3,6,12,${0.66 * d})`);
    rg.addColorStop(0.92, `rgba(6,9,16,${0.16 * d})`);
    rg.addColorStop(1, 'rgba(6,9,16,0)');
    g.fillStyle = rg; ell(p, 3); g.fill();
  }

  /* 3. grain. Clipped to the print so it only roughens the inside: dark
   * grit and a few wet-bright grains, plus a scatter of coarser flecks the
   * pressure has brought up. */
  g.save();
  g.beginPath();
  for (const p of PARTS) { g.ellipse(p[0], p[1], p[2], p[3], p[4], 0, Math.PI * 2); }
  g.clip();
  for (let k = 0; k < 2600; k++) {
    const x = rnd(S), y = rnd(S);
    const bright = Math.random() < 0.3;
    g.fillStyle = bright
      ? `rgba(${150 + rnd(70) | 0},${162 + rnd(70) | 0},${184 + rnd(60) | 0},${0.10 + rnd(0.22)})`
      : `rgba(0,1,5,${0.10 + rnd(0.3)})`;
    const r = bright ? 1 + rnd(1.6) : 1 + rnd(2.2);
    g.fillRect(x, y, r, r);
  }
  g.restore();

  // 4. the wall of each pit on the light side: a thin bright crescent just
  // inside the rim, which is what gives the print depth at a glance
  for (const p of PARTS) {
    g.save();
    g.beginPath(); g.ellipse(p[0], p[1], p[2], p[3], p[4], 0, Math.PI * 2); g.clip();
    g.translate(-2.2, -2.6);
    g.strokeStyle = `rgba(196,210,236,${0.22 * p[5]})`;
    g.lineWidth = 3.2;
    g.beginPath(); g.ellipse(p[0], p[1], p[2], p[3], p[4], 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
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
// spoil thrown out of a hole is dry sand from under the surface, not the
// wet blue flat it came out of — the same family as a buried cache
const _sandMat = new THREE.MeshStandardMaterial({ color: 0x9d8d68, roughness: 1, flatShading: true, emissive: 0x322c1b });
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
    // instances cannot be hidden one at a time, so a drowned clod is scaled away
    const sc = coveredByWater(p.pos.x, p.pos.y, p.pos.z) ? 0 : p.sz * 0.055 * grow;
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
let packCut = false;            // the three coming in: the player watches
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
  // DEV MODE: a hit still lands — flash, knock, sound — but it never finishes you
  if (settings.devMode) hp = Math.max(hp, 1);
  hurtFlash = 1;
  sfxHurt();
  addTrauma(0.7);
  hitstop = 0.05;       // ~3 frames
  // shoved back off whatever hit you
  const hitter = nearestCrab(camera.position);
  if (hitter) {
    const kx = camera.position.x - hitter.g.position.x, kz = camera.position.z - hitter.g.position.z;
    const kd = Math.hypot(kx, kz) || 1;
    knockback.set((kx / kd) * 5.5, 0, (kz / kd) * 5.5);
  }
  if (hp <= 0) playerDied();
}
function playerDied() {
  if (dying) return;
  if (settings.devMode) { hp = Math.max(hp, 1); return; }
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

function frozen() { return noteOpen || menuOpen || dialogOpen || invOpen || inspecting || peeking || packCut || dying || ended || !introDone; }
function refreshUI() {
  const playing = started && !menuOpen && !noteOpen && !dialogOpen && !invOpen && !inspecting && !dying && !ended;
  hotbarEl.classList.toggle('hidden', !playing || inventory.length === 0);
  ringsEl.classList.toggle('hidden', !playing || !ringsFound);
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
/* KEEP TRYING. This used to give up after six goes and leave you to click,
 * and Safari makes that a regular event: its "press Esc to reveal the
 * pointer" banner eats a keypress, it drops the lock on its own now and
 * then, and its cooldown after an exit runs longer than the six retries
 * did. So while the game wants the lock — started, not frozen, not in the
 * drag fallback — it asks every 600 ms until it has it. A request that
 * fails is free. */
function scheduleLockRetry() {
  if (locked || fallbackLook || frozen()) return;
  if (!everLocked) { enterFallback(); return; }
  clearTimeout(lockTimer);
  lockTimer = setTimeout(() => { if (!locked && !frozen()) requestLock(); }, 600);
}
// and whenever the tab comes back, ask again at once
for (const ev of ['focus', 'visibilitychange']) {
  window.addEventListener(ev, () => {
    if (document.visibilityState === 'hidden') return;
    if (started && !locked && !fallbackLook && !frozen()) setTimeout(requestLock, 120);
  });
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
    if (!menuOpen && !noteOpen && !dialogOpen && !invOpen && !inspecting && !peeking && !packCut && !dying) openMenu();
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
const INTRO_LINES = [
  'You are alone on the shore.\nIt is well past midnight.',
  'The tide keeps its own counsel.',
];
let introStarted = false;

// coming back from a death: straight into the walk, no opening card
let skipIntro = false;
try {
  skipIntro = sessionStorage.getItem('beachwalk.skipIntro') === '1';
  if (skipIntro) sessionStorage.removeItem('beachwalk.skipIntro');
} catch (e) {}

/* THE TITLE CAMERA. The menu is not a picture of the beach, it is the
 * beach: while the title is up the player camera is borrowed for a slow low
 * drift down the sand toward the moon, and handed back to the spawn point
 * on begin. Safe because update() returns before introDone and nothing
 * else moves the camera until then. */
let titleT = 0;
const _tcLook = new THREE.Vector3();
function titleCam(dt) {
  titleT += dt;
  const t = titleT;
  // camBaseY too: the head-height code writes camera.position.y from it
  camBaseY = 0.82 + Math.sin(t * 0.21) * 0.035;
  camera.position.set(5.2 + Math.sin(t * 0.11) * 0.4, camBaseY, 4 - t * 0.10);
  _tcLook.set(2.4 + Math.sin(t * 0.06) * 1.6, 1.0 + Math.sin(t * 0.13) * 0.2, camera.position.z - 40);
  camera.lookAt(_tcLook);
}
/* Under the black card: a drone you feel in the chest and a heartbeat that
 * is a little too slow, gone the moment the beach comes up. */
let introDrone = null;
function startIntroAudio() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(sfxOut());
  g.gain.exponentialRampToValueAtTime(0.2, t + 3.2);     // felt, not heard
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 41;
  const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 61.7;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 150;
  const dg = ctx.createGain(); dg.gain.value = 0.55;
  const trem = ctx.createOscillator(); trem.frequency.value = 0.31;
  const tg = ctx.createGain(); tg.gain.value = 0.3;
  trem.connect(tg).connect(dg.gain);
  o.connect(f); o2.connect(f); f.connect(dg).connect(g);
  o.start(t); o2.start(t); trem.start(t);
  const beat = (at) => {
    for (const [d, a] of [[0, 0.22], [0.17, 0.13]]) {
      const k = ctx.createOscillator(); k.type = 'sine';
      k.frequency.setValueAtTime(72, at + d);
      k.frequency.exponentialRampToValueAtTime(36, at + d + 0.13);
      const kg = ctx.createGain();
      kg.gain.setValueAtTime(0.0001, at + d);
      kg.gain.exponentialRampToValueAtTime(a, at + d + 0.012);
      kg.gain.exponentialRampToValueAtTime(0.0001, at + d + 0.24);
      k.connect(kg).connect(g); k.start(at + d); k.stop(at + d + 0.27);
    }
  };
  for (let i = 0; i < 9; i++) beat(t + 1.4 + i * 1.18);      // ~51 bpm
  introDrone = { g, o, o2, trem };
}
function endIntroAudio() {
  if (!introDrone || !audioCtx) return;
  const d = introDrone; introDrone = null;
  d.g.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.3);
  setTimeout(() => { try { d.o.stop(); d.o2.stop(); d.trem.stop(); } catch (e) {} }, 1800);
}
function leaveTitle() {
  camera.position.copy(spawnPos);
  camera.quaternion.copy(spawnQuat);
  camBaseY = EYE_HEIGHT;
  renderer.domElement.classList.remove('title-grade');
  if (titleSurfGain && audioCtx) titleSurfGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 1.0);
}
function beginGame() {
  if (introStarted) return;
  introStarted = true;
  startAmbientAudio();      // usually already running from the title card
  startMusic();                                    // swell it in from the moment you spawn
  requestLock();                                   // must fire on the click gesture
  overlay.classList.add('hidden');
  leaveTitle();

  if (skipIntro) {
    introDone = true;
    for (const k in keys) keys[k] = false;
    clock.getDelta();
    if (!locked && !fallbackLook) enterFallback();
    return;
  }

  // Snap to black on the same frame the title leaves, so the world is never
  // glimpsed underneath — the card only *fades* on the way back out.
  introTextEl.innerHTML = `<span class="l1">${INTRO_LINES[0]}</span><span class="l2">${INTRO_LINES[1]}</span>`;
  introEl.style.transition = 'none';
  introEl.classList.add('show');
  void introEl.offsetWidth;                        // commit before re-arming
  startIntroAudio();
  /* ALL OF IT AT ONCE. It used to land in two beats nearly four seconds
   * apart, which made the card outstay the line — the second half is a
   * closing thought, not a reveal, so it comes up with the rest and the
   * whole thing is over in half the time. */
  setTimeout(() => introEl.classList.add('beat1', 'beat2'), 900);
  setTimeout(() => introEl.classList.remove('beat1', 'beat2'), 5400);
  const revealAt = 7300;
  setTimeout(() => {
    endIntroAudio();
    introEl.style.transition = 'opacity 2.4s ease';
    introEl.classList.remove('show');              // world fades up
    introDone = true;
    for (const k in keys) keys[k] = false;
    clock.getDelta();                              // drop the big first-frame dt
    if (!locked && !fallbackLook) enterFallback();
  }, revealAt);
}
/* Two phases. The first press of anything is PRESS ANY KEY: it is the
 * gesture that lets the sea come up (primeMenuAudio) and it shows the list.
 * Nothing begins until BEGIN — the old click-anywhere started the game on
 * the same press that was meant to unmute it. */
/* The press that reveals the menu must not also press the menu. pointerdown
 * shows the list, the list is clickable at once, and the click from that
 * same press then lands on whatever button is now under the cursor — near
 * the centre of the screen that was CONTROLS, so the sheet appeared on the
 * first click, and lower down it would have started the game. The buttons
 * are armed only once the list has finished coming up. */
let menuArmedAt = Infinity;
function showTitleMenu() {
  if (introStarted || overlay.classList.contains('menu')) return;
  overlay.classList.add('menu');
  menuArmedAt = performance.now() + 500;
}
const menuArmed = () => performance.now() >= menuArmedAt;
window.addEventListener('pointerdown', () => { if (!overlay.classList.contains('menu')) showTitleMenu(); }, { passive: true });
window.addEventListener('keydown', (e) => {
  if (introStarted) return;
  if (!overlay.classList.contains('menu')) { showTitleMenu(); return; }
  if ((e.code === 'Enter' || e.code === 'Space') && menuArmed()) beginGame();
});
overlay.querySelector('.begin').addEventListener('click', (e) => { e.stopPropagation(); if (menuArmed()) beginGame(); });
overlay.querySelector('.ctl').addEventListener('click', (e) => { e.stopPropagation(); if (menuArmed()) overlay.classList.toggle('controls-open'); });
/* Surf under the title card. Browsers won't let an AudioContext start
 * without a gesture, so we arm it on the first move or key the player makes
 * over the menu and let the sea come up behind the title. */
/* THE FADE HAS TO BE SCHEDULED AFTER THE RESUME. A context created inside
 * a gesture can still come up SUSPENDED, and while it is suspended its
 * `currentTime` does not move — so the four-second ramp `startAmbientAudio()`
 * schedules is measured from a clock that is not running, and by the time
 * the context actually starts the ramp is already in the past. The whole
 * bed arrives at full level on the first block of samples, which is the
 * click you hear on the press that opens the menu. Re-arming it from the
 * live clock is the fix. */
function fadeInMaster(seconds = 2.2) {
  if (!masterGain || !audioCtx) return;
  const t = audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(t);
  masterGain.gain.setValueAtTime(0.0001, t);
  masterGain.gain.linearRampToValueAtTime(settings.volume, t + seconds);
}
function primeMenuAudio() {
  if (audioStarted) { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().then(() => fadeInMaster(0.6)); return; }
  startAmbientAudio();
  // Safari in particular starts the context suspended even when it was
  // created inside the gesture, so it has to be resumed explicitly.
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().then(() => fadeInMaster());
  else fadeInMaster();
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
    if (ended || dying) return;
    if (inspecting) { closeInspect(); return; }   // Tab is a way out of it too
    if (invOpen) closePack();
    else if (!menuOpen && !noteOpen && !dialogOpen) openPack();
    return;
  }
  if (e.code === 'Escape') {
    if (ended) return;
    if (inspecting) closeInspect();
    else if (invOpen) closePack();
    else if (peeking) endPeek();
    else if (dialogOpen) endDialog();
    else if (noteOpen) closeNote();
    else if (menuOpen) closeMenu();
    else if (fallbackLook) openMenu();
  } else if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
    // standing up is refused while there is something over your head — you
    // used to stand under the pier and get teleported out from under it
    if (!frozen() && (!crouching || headroomClear())) crouching = !crouching;
  } else if (e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Enter' || e.code === 'NumpadEnter') {
    // Enter is an alias for E throughout: people reach for it on a prompt
    if (inspecting) { if (inspectEquip) inspectEquip(); return; }
    primaryAction();
  }
  else if (e.code === 'KeyG') { if (held) dropHeld(); else if (equipped) dropEquipped(); }
  else if (e.code === 'KeyQ') { if (inspecting) closeInspect(); else if (equipped) toggleEquip(equipped); }
  else if (/^Digit[1-6]$/.test(e.code)) { useSlot(+e.code.slice(5) - 1); }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

let downPos = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  downPos = [e.clientX, e.clientY];
  if (fallbackLook) dragging = true;
  /* Any press on the world while unlocked takes the lock back — on the
   * press, not the click, because a click may never arrive if the browser
   * has just swallowed the gesture for its own banner. And if the drag
   * fallback has somehow latched on after a real lock once worked, this is
   * the way back out of it. */
  if (started && !locked && !frozen()) {
    if (fallbackLook && everLocked) { fallbackLook = false; dragging = false; }
    if (!fallbackLook) requestLock();
  }
  /* The LEFT button does both: a click is a light swing, and holding it
   * hauls the shovel back for a heavy. Right is deliberately left free.
   * The wind-up only starts once you have held past WIND_TAP, so a quick
   * click never flickers into the haul pose on its way out. */
  if (e.button === 0 && started && !frozen() && !blocking && equipped && equipped.onDig && digT <= 0) {
    windLatch = setTimeout(() => { windLatch = null; startWind(); }, WIND_TAP * 1000);
  }
  if (e.button === 2 && started && !frozen() && equipped && equipped.onDig) {
    /* Kill the wind-up EVERY time, latched or live. Only a live wind was
     * cancelled before, so a left button held under WIND_TAP when the right
     * came down left its latch pending — it fired startWind() under the
     * guard, and letting go of the left button landed a heavy out of a
     * block. Right click is the guard and nothing else. */
    clearTimeout(windLatch); windLatch = null;
    if (winding) { winding = false; windT = 0; windFull = false; }
    // nothing to hold it up with. The breath you let out IS the refusal.
    if (exhausted || stamina <= 0.001) { if (!blockGasped) gaspOut(); return; }
    blocking = true;
    // a window only if the last one has had time to close
    blockStart = parryCool > 0 ? -1e9 : performance.now();
    sfxGuardUp();
  }
});
window.addEventListener('pointerup', (e) => {
  dragging = false;
  if (e.button === 2) { blocking = false; return; }
  if (e.button !== 0) return;
  if (windLatch) { clearTimeout(windLatch); windLatch = null; return; }  // a tap: the click handler swings
  if (winding) { releaseWind(); swungAt = performance.now(); }
});
// losing the window mid-wind shouldn't leave the shovel stuck over your head
window.addEventListener('blur', () => { if (winding) releaseWind(); blocking = false; });
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
renderer.domElement.addEventListener('click', (e) => {
  const d = downPos ? Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) : 0;
  if (d >= 6) return;
  // if we lost the lock (browser cooldown, stray Esc), a click takes it back
  if (started && !locked && !fallbackLook && !frozen()) { lockRetry = 0; requestLock(); return; }
  /* A click that arrives right on the back of a held release is that
   * release's own click — the heavy already swung, so it must not also fire
   * a light one. A timestamp rather than a flag: a flag survives a release
   * that produces no click at all and then eats the NEXT swing you ask for. */
  if (performance.now() - swungAt < 250) return;
  if (e.button !== 0 || blocking) return;   // only the left button swings, and never from a guard
  attackAction();
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
const S_DEV = document.getElementById('s-dev');
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
  S_DEV.checked = settings.devMode;
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
S_DEV.addEventListener('change', () => { settings.devMode = S_DEV.checked; saveSettings(); });
document.getElementById('m-resume').addEventListener('click', closeMenu);
/* Restart: a new game. Everything the walk changed — the crab, the crate,
 * the bottle, the pack, the rings, where you are — goes back to how it was,
 * and the only honest way to do that in a file this size is to load it
 * again. The opening card is skipped, the way it is after a death; the title
 * click stays, because the pointer lock needs a gesture and nothing can give
 * it one for you. */
function respawn() {
  try { sessionStorage.setItem('beachwalk.skipIntro', '1'); } catch (e) {}
  location.reload();
}
document.getElementById('m-restart').addEventListener('click', respawn);
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
/* `equipLabel` / `onEquip` turn the examine screen into the place a thing is
 * put ON. Deliberately bound to E and not to the click: click already means
 * "put it away" in here, and a screen where the same button both wears the
 * item and pockets it is a screen you cannot use twice in a row. */
let inspectEquip = null;
function openInspect(model, { rotX = -0.55, rotY = 0.7, equipLabel = null, onEquip = null, name = '' } = {}) {
  if (inspecting) return;
  inspecting = true;
  inspectEquip = equipLabel ? onEquip : null;
  inspectEl.querySelector('.hint').innerHTML =
    inspectEquip ? kbd('E') + equipLabel + '  ·  ' + INSPECT_HINT : INSPECT_HINT;
  const nameEl = inspectEl.querySelector('.iname');
  if (nameEl) { nameEl.textContent = name; nameEl.style.display = name ? '' : 'none'; }
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
  inspectEquip = null;
  inspectEl.classList.remove('show');
  inspectEl.querySelector('.hint').innerHTML = INSPECT_HINT;
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
/* ONE RULE FOR EVERY TAKEABLE ON THE GROUND. A syringe is 14 cm and a CD
 * case is 12; on a dark beach, at head height, those are a few pixels and
 * you walk past them. Rather than hand-tuning a scale per item — which is
 * how the ring got a glint and the syringe did not — anything you can pick
 * up is measured when it goes down and lifted until its longest side
 * reaches `ITEM_MIN_SIZE`, and given the same shine. Something already big
 * enough (the shovel, the bottle) is left alone: the rule is a FLOOR, not a
 * multiplier, so nothing that already reads gets inflated.
 *
 * The measurement skips `hitProxy`, which is an invisible sphere of at
 * least 0.4 m — include it and every item measures the same and nothing
 * ever scales. */
const ITEM_MIN_SIZE = 0.42;      // the smallest a takeable may look on the sand
const ITEM_MAX_BOOST = 3.2;      // and the most it may be lifted to get there
const _itemBox = new THREE.Box3(), _itemV = new THREE.Vector3();
function visualSize(root) {
  _itemBox.makeEmpty();
  let any = false;
  root.traverse((o) => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    if (o.name === 'hitProxy' || !o.geometry) return;
    o.updateWorldMatrix(true, false);
    o.geometry.computeBoundingBox();
    _itemBox.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
    any = true;
  });
  if (!any) return 0;
  _itemBox.getSize(_itemV);
  return Math.max(_itemV.x, _itemV.y, _itemV.z);
}
function makeNoticeable(root, tries = 0) {
  root.updateMatrixWorld(true);
  const size = visualSize(root);
  if (size <= 0) {
    // a scan that has not landed yet — the group is empty, so come back
    if (tries < 6) setTimeout(() => makeNoticeable(root, tries + 1), 900);
    return;
  }
  const k = THREE.MathUtils.clamp(ITEM_MIN_SIZE / size, 1, ITEM_MAX_BOOST);
  if (k > 1.001) root.scale.multiplyScalar(k);
  // the glint says "this is a thing", it does not light the beach
  addItemShine(root, { size: Math.max(0.55, size * k * 1.9), height: size * k * 0.55 + 0.06, strength: 0.75 });
}
function addInteractable(root, label, kind, data) {
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  interactables.push({ root, label, kind, meshes, ...data });
  // everything you can put in the pack gets the same floor and the same glint
  if (kind === 'inventory' && !(data && data.bare)) makeNoticeable(root);
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
  if (peeking) { hovered = null; return; }       // the peek owns the prompt
  if (frozen() || (!locked && !fallbackLook)) {
    hovered = null; crosshair.className = ''; setPrompt(''); return;
  }
  if (held) {
    hovered = null; crosshair.className = 'holding';
    setPrompt(kbd('LMB') + 'Throw &nbsp;&nbsp; ' + kbd('E') + 'Put down');
    return;
  }
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  let best = null, bestD = Infinity;
  for (const it of interactables) {
    if (!it.root.parent) continue;
    if (it.prop && it.prop.held) continue;
    // `when` gates a thing on the world, not on where you are looking: the
    // hover raycast only tests an interactable's OWN meshes, so nothing is
    // occluded by walls and the fisherman was hailable through a shut door
    if (it.when && !it.when()) continue;
    const hits = raycaster.intersectObjects(it.meshes, false);
    if (hits.length && hits[0].distance < bestD) { bestD = hits[0].distance; best = it; }
  }
  hovered = best;
  if (best) {
    crosshair.className = 'active';
    setPrompt(best.bare ? best.label : kbd('E') + best.label);
  } else if (equipped && equipped.onListen && !listening) {
    crosshair.className = 'active';
    setPrompt(kbd('LMB') + 'Hold it to your ear');
  } else if (equipped && equipped.onDig && digT <= 0
             && crosshairGroundPoint(winding ? DIG_REACH + DIG_HEAVY_REACH : DIG_REACH)) {
    const onMound = !inWater(_digHit.x, _digHit.z) && moundAt(_digHit.x, _digHit.z);
    crosshair.className = 'active';
    /* The prompt said RMB winds up, which stopped being true when the right
     * button became the guard and nothing else — you wind by HOLDING the
     * left one, and holding sprint with it turns the swing overhead. */
    setPrompt(kbd('LMB') + (onMound ? 'Dig up the mound' : 'Dig here')
      + ' &nbsp;&nbsp; ' + kbd('Hold LMB') + 'Heavy'
      + ' &nbsp;&nbsp; ' + kbd('Shift') + '+ hold: overhead'
      + ' &nbsp;&nbsp; ' + kbd('G') + 'Drop');
  } else if (equipped) {
    crosshair.className = '';
    setPrompt(kbd('G') + 'Drop ' + equipped.name.toLowerCase());
  } else {
    crosshair.className = '';
    setPrompt('');
  }
}
/* Two verbs, two inputs. E is INTERACT: take, grab, talk, look inside, and
 * put down what you're carrying. The mouse is ATTACK: throw what you're
 * carrying, swing what you're holding. They used to share one function, so
 * with the shovel out a click on a glass float picked the float up instead
 * of hitting it — the pickup winning over the swing every time, because the
 * hover check came first. Now a click never picks anything up while a tool
 * is in your hand. With nothing equipped and nothing held it still falls
 * through to interact, so a bare-handed player who clicks on a thing is not
 * left clicking at nothing. */
function primaryAction() {                       // E / F
  if (peeking) { endPeek(); return; }
  if (frozen()) return;
  if (held) { dropHeld(); return; }
  if (hovered) {
    if (hovered.kind === 'physics') grab(hovered.prop);
    else if (hovered.onActivate) hovered.onActivate();
    return;
  }
  if (equipped && equipped.onListen) listenToShell();
}
function attackAction() {                        // left mouse
  if (peeking) { endPeek(); return; }
  if (frozen()) return;
  if (held) { throwHeld(); return; }
  if (equipped && equipped.onDig) { if (digT <= 0) startDig(); return; }
  if (equipped && equipped.onListen) { listenToShell(); return; }
  primaryAction();                               // bare hands: a click still interacts
}

// ------------------------------------------------------------------
// Mini physics
// ------------------------------------------------------------------
const GRAV = 11;
const physProps = [];
let held = null;
const _pv = new THREE.Vector3(), _pt = new THREE.Vector3(), _pf = new THREE.Vector3();
const _pp = new THREE.Vector3();          // props: where a push-out would put it
const _preMove = new THREE.Vector3();     // the player, before this frame's movement
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
    this.splashed = false;
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
    let struck = false, surface = 'sand';
    /* What is under it. A body used to know one ground — the sand — so a
     * bottle set down on the pier fell straight through the boards to the
     * beach two metres below, and one thrown at a rock went through it. It
     * asks the same solids the player does now, and the deck as well. */
    const sub = submersionAt(p.x, p.z);
    let rest = this.restH + restYInWater(p.x, p.z, this.radius * 0.6);
    if (sub > 0.15) surface = 'water';
    const deck = dockDeckAt(p.x, p.z);
    if (deck !== null && deck + this.restH > rest && p.y >= deck - 0.35) { rest = deck + this.restH; surface = 'wood'; }
    /* THE CASTLE IS SAND, AND IT IS NOT A FLOOR. It used to be brought down
     * by a proximity guess — within 1.5 m, `abs(p.y) < 1.4`, and moving —
     * but its collider stands 1.65 m tall, so anything that arrived over the
     * top of it landed ABOVE that gate: the body rested on the cylinder and
     * hung there in mid-air, which is the floating. The two solid helpers
     * already report WHICH collider they hit, so ask them. Whatever reaches
     * it brings it down, from any height and at any speed, and the collider
     * is gone by the next line so it can never be the thing you land on. */
    const sc = rockGroundAt(p.x, p.z, p.y);
    if (sc && sc.top + this.restH > rest) {
      /* CONTACT, not proximity. `rockGroundAt` answers "what would this land
       * on", which is true of anything merely flying over the castle — so
       * the height test is what makes it a hit. And it must not become the
       * floor: its collider stands 1.65 m tall, and the old proximity guess
       * (`abs(p.y) < 1.4`) missed everything that arrived over the top, so
       * the body rested on the cylinder and hung there in mid-air. */
      if (sc.castle && p.y <= sc.top + this.restH) breakCastle(p.x - this.vel.x, p.z - this.vel.z);
      else { rest = sc.top + this.restH; surface = sc.mat || 'rock'; }
    }
    if (p.y <= rest) {
      p.y = rest;
      const wet = surface === 'water' ? sub : 0;
      if (this.vel.y < 0) this.vel.y = -this.vel.y * (this.bounce * (1 - wet * 0.9));
      if (Math.abs(this.vel.y) < 0.7) this.vel.y = 0;
      const fr = this.friction * (1 - wet * 0.45);       // water drags on it
      this.vel.x *= fr; this.vel.z *= fr;
      this.angVel.multiplyScalar(0.86 - wet * 0.26);
      struck = true;
    }
    // and the sides of anything solid
    _pp.copy(p);
    let side = pushOutOfSolids(_pp, p.y, this.radius);
    if (side && side.castle) {
      // straight through the side of it, rather than bouncing off a wall
      breakCastle(p.x - this.vel.x, p.z - this.vel.z);
      _pp.copy(p);
      side = pushOutOfSolids(_pp, p.y, this.radius);
    }
    if (side) {
      const nx = _pp.x - p.x, nz = _pp.z - p.z;
      p.x = _pp.x; p.z = _pp.z;
      if (nx * this.vel.x + nz * this.vel.z < 0) {       // only if it was going in
        if (Math.abs(nx) > Math.abs(nz)) this.vel.x = -this.vel.x * this.bounce;
        else this.vel.z = -this.vel.z * this.bounce;
      }
      struck = true; surface = side.mat || 'rock';
    }
    const lo = WADE_X + this.radius, hi = CLIFF_BLOCK_X - this.radius;
    if (!onPier(p.x, p.z)) {
      if (p.x < lo) { p.x = lo; this.vel.x = Math.abs(this.vel.x) * this.bounce; struck = true; }
      if (p.x > hi) { p.x = hi; this.vel.x = -Math.abs(this.vel.x) * this.bounce; struck = true; }
    }
    // going into the sea: a splash you can see and hear, once
    /* ...and only if it ARRIVED. A body resting near the waterline goes in
     * and out of `sub` every few seconds as the tide and swash move over it,
     * and without a speed test each of those was a fresh splash — which is
     * the splashing you could hear from anywhere on the beach. */
    if (sub > 0.25 && incoming > 2.0 && !this.splashed && p.y <= rest + 0.25) {
      this.splashed = true;
      spawnSplash(p.x, p.z, 10 + Math.min(20, incoming * 2), this.vel.x, this.vel.z, 1 + incoming * 0.08);
      sfxSplash(Math.min(1.5, 0.45 + incoming * 0.09));
      addRipple(p.x, p.z, 1);
    } else if (sub < 0.1) this.splashed = false;
    /* And anything moving fast enough kills the crab — ONCE. This fired every
     * frame the body was inside the radius: hitConnect() refreshes hitstop
     * to at least 0.03 s each call, and under hitstop the body moves at 8 %
     * speed, so it sat inside the 0.75 m for hundreds of frames, each one
     * re-freezing the world and building a fresh sfxConnect graph. Four
     * seconds of near-frozen time and a few hundred sounds: the "lag" when
     * a throw hit the crab. Gated on `struck` now, the same gate killCrab()
     * has, and the body loses most of its speed in the shell. */
    if (incoming > 5) {
      for (const u of crabs) {
        if (!u.st.alive || u.st.struck) continue;
        if (p.distanceTo(u.g.position) >= 0.75) continue;
        hitConnect(0.4, 1); hurtCrab(u, 1);
        this.vel.multiplyScalar(0.3);
        break;
      }
    }
    if (struck && incoming > 1.1) sfxPropHit(surface, incoming);
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
  const hasMesh = (g) => { let any = false; g.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) any = true; }); return any; };
  if (item.worldFactory) {
    m = item.worldFactory();
  } else if (item.inspectModel && hasMesh(item.inspectModel)) {
    /* THE MODEL, NOT THE VIEW MODEL. A view model is built for the hand and
     * scaled to it — the shovel's is 0.48, and everything `holdable()` makes
     * carries whatever scale it was given — so cloning that put a half-size
     * shovel on the sand, and a thing you set down came back smaller than
     * the thing you picked up. `inspectModel` is the object at the size it
     * was authored, and `inspectSetModel()` guarantees its own transform is
     * identity (it scales the wrapper, never the model), so it clones clean. */
    m = item.inspectModel.clone(true);
    m.traverse((o) => { o.visible = true; });
    m.position.set(0, 0, 0);
    m.rotation.set(0, 0, 0);
    m.scale.setScalar(item.dropScale || 1);
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
  /* IT GOES WHERE YOU WERE LOOKING, AND ON TOP OF WHAT IS THERE. It used to
   * be set down at a flat y = 0.04 — the sand plane — a metre in front of
   * you whatever you were standing on. On the pier that put it UNDER the
   * boards and on the drift it put it inside the mound, and either way it
   * was gone. The crosshair is raycast at the boards, the banks and the
   * beach; anything it misses falls back to the ground under the point. */
  const dp = dropPoint();
  m.position.copy(dp);
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
/* Where a dropped thing should come to rest: the first surface the
 * crosshair meets within arm's reach, else the ground in front of you. */
const _dropRay = new THREE.Raycaster();
const _dropPt = new THREE.Vector3();
function groundUnder(x, z) {
  let y = driftAt(x, z);                       // the banks are terrain
  const deck = dockDeckAt(x, z);
  if (deck !== null && deck > y) y = deck;     // and the boards are a floor
  const rk = rockGroundAt(x, z, y + 0.6);
  if (rk && rk.top > y) y = rk.top;
  return y;
}
function dropPoint() {
  _dropRay.setFromCamera({ x: 0, y: 0 }, camera);
  _dropRay.far = 3.0;
  const hits = _dropRay.intersectObjects([sand, dock, DOCK_STEPS, driftGroup, rockGroup], true)
    .filter((h) => h.object.name !== 'hitProxy' && h.object.visible);
  if (hits.length) {
    _dropPt.copy(hits[0].point);
  } else {
    camera.getWorldDirection(_dropDir); _dropDir.y = 0;
    if (_dropDir.lengthSq() < 1e-4) _dropDir.set(0, 0, -1); else _dropDir.normalize();
    _dropPt.set(camera.position.x + _dropDir.x * 1.1, 0, camera.position.z + _dropDir.z * 1.1);
  }
  _dropPt.x = THREE.MathUtils.clamp(_dropPt.x, WADE_X + 0.4, CLIFF_BLOCK_X - 0.4);
  _dropPt.y = Math.max(_dropPt.y, groundUnder(_dropPt.x, _dropPt.z)) + 0.04;
  return _dropPt;
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
/* Breaking glass. Shared by the floats and by anything else thin enough to
 * go: kill the body, drop the prop out of the world and out of `interactables`
 * (leaving it in there is how you end up hovering "Pick up glass float" over
 * a cloud of shards), then throw shards that are real gibs so they bounce and
 * settle like everything else rather than being a puff of sprites. */
const SHARD_MAT = new THREE.MeshStandardMaterial({
  color: 0x2f6f5c, roughness: 0.2, metalness: 0.05, flatShading: true,
  transparent: true, opacity: 0.72, emissive: 0x0c2b22, side: THREE.DoubleSide,
});
/* Hitting glass with the shovel. Anything with an onImpact is breakable, so
 * the swing raycasts at each one still standing and, on a hit, feeds it a
 * speed well past its threshold — the same code path a hard throw takes, so
 * a float or the bottle breaks the same way whichever way you broke it. */
function glassStrike() {
  aimRay(digPower);
  for (const p of physProps) {
    if (!p.onImpact || p.dead || p.held || !p.mesh.parent) continue;
    if (!digRay.intersectObject(p.mesh, true).length) continue;
    hitConnect(digPower, 0.7);
    p.onImpact(12);
    vmImpulse(-0.9);
    return true;
  }
  return false;
}
function shatterGlass(prop, mesh, speed, radius, threshold = 4.6) {
  if (prop.dead || speed < threshold) return;        // a gentle knock just clinks
  prop.dead = true;
  const p = mesh.position.clone();
  scene.remove(mesh);
  removeInteractable(mesh);
  if (hovered && hovered.root === mesh) hovered = null;
  sfxGlassBreak();
  addTrauma(0.12);
  const mat = SHARD_MAT.clone();
  if (mesh.material && mesh.material.color) {
    mat.color.copy(mesh.material.color);
    if (mesh.material.emissive) mat.emissive.copy(mesh.material.emissive);
  }
  for (let i = 0; i < 14; i++) {
    // curved slivers, not cubes — a broken float leaves shell, and a flat
    // tetrahedron scaled thin reads as a shard from any angle
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(radius * (0.22 + Math.random() * 0.3), 0), mat);
    m.scale.set(1, 0.35 + Math.random() * 0.5, 1);
    m.position.set(p.x + (Math.random() - 0.5) * radius, Math.max(0.04, p.y), p.z + (Math.random() - 0.5) * radius);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    scene.add(m);
    const a = Math.random() * Math.PI * 2, out = 0.8 + Math.random() * 2.2;
    gibs.push({
      m,
      vel: new THREE.Vector3(Math.cos(a) * out, 1.6 + Math.random() * 2.4, Math.sin(a) * out),
      spin: new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20),
      rest: 0.015 + Math.random() * 0.03,
      life: 30, bleed: false,
    });
  }
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

  /* The glass floats. Three of them, and they break — a net float is thin
   * blown glass and the one thing in the game you can already throw hard.
   * They shatter above 4.6 m/s, which a throw clears easily and a drop off
   * your own hand does not, so breaking one is always something you chose. */
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x2f6f5c, roughness: 0.25, transparent: true, opacity: 0.7, emissive: 0x0c2b22,
  });
  const glassMatBlue = glassMat.clone();
  glassMatBlue.color.setHex(0x2b5a74); glassMatBlue.emissive.setHex(0x0a2130);
  for (const [x, z, r, mat] of [[6.5, -22, 0.24, glassMat],
                                [2.6, -63, 0.19, glassMatBlue],
                                [10.4, -101, 0.27, glassMat]]) {
    const float = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
    float.position.set(x, r, z);
    const p = makeProp(float, 'glass float', { radius: r, restH: r, bounce: 0.5 });
    p.onImpact = (speed) => shatterGlass(p, float, speed, r);
  }

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
    if (item) icon = iconHTML(item);
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
/* Rings. A second, separate place things live: two slots under the hotbar,
 * and a ring in one of them is *worn*, not carried — it has left the pack.
 * Kept as its own array rather than a flag on the item so the two slots are
 * a real limit, and so the order you put them on is the order they show.
 *
 * The section stays hidden until the first ring is in your hands. Two empty
 * circles on the HUD from the opening minute would be a puzzle prompt for
 * something you have no reason to think about yet. */
const RING_SLOTS = 2;
const rings = [];
let ringsFound = false;
const ringsEl = document.getElementById('rings');
const ringSlotsEl = ringsEl.querySelector('.rslots');
function renderRings() {
  ringSlotsEl.innerHTML = '';
  for (let i = 0; i < RING_SLOTS; i++) {
    const item = rings[i];
    const slot = document.createElement('div');
    slot.className = 'rslot' + (item ? ' worn' : ' empty');
    if (item) {
      slot.innerHTML = iconHTML(item);
      const lab = document.createElement('span');
      lab.className = 'label';
      lab.textContent = item.name + ' — take off';
      slot.appendChild(lab);
      slot.addEventListener('click', (e) => { e.stopPropagation(); takeOffRing(i); });
    }
    ringSlotsEl.appendChild(slot);
  }
  refreshUI();
}
function wearRing(item) {
  // already on a finger: putting it on again would push a second copy into
  // `rings` and leave you wearing one ring twice
  if (rings.includes(item) || rings.length >= RING_SLOTS) return false;
  removeFromInventory(item);
  rings.push(item);
  renderRings();
  sfxRingOn();
  return true;
}
function takeOffRing(i) {
  const item = rings[i];
  if (!item || inventory.length >= INV_MAX) return;
  rings.splice(i, 1);
  addToInventory(item);
  renderRings();
  sfxRingOff();
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
/* INVENTORY ICONS ARE RENDERS, not drawings. Every icon used to be a few
 * strokes on a 48 px canvas, which reads as clip art next to the rest of the
 * game — the reference for this is the survival-horror inventory, where each
 * slot holds a little photograph of the object itself, lit and grounded.
 *
 * So each one is the item's OWN model, rendered once through the game's own
 * renderer into an offscreen target, then composited onto a dark tile with a
 * floor shadow under it. Rendered at pickup, cached on the item, and never
 * touched again — this costs one frame each, once.
 *
 * The model is CLONED for the render. The originals are live: `ring` sits
 * inside `ringWorld` out on the sand and the examine screen re-parents
 * whatever it is handed, so borrowing one would tear it out of the world. */
const ICON_PX = 256;
let iconRT = null, iconScene = null, iconCam = null, iconFit = null;
function initIconRig() {
  if (iconScene) return;
  /* Multisampled, and in sRGB. A render target does not get the canvas's
   * output transform: unless its texture says sRGB the shader writes LINEAR
   * values, and read back as bytes those are the dark, flat, greyed icons
   * the first version had — every colour a stop and a half too dark. */
  iconRT = new THREE.WebGLRenderTarget(ICON_PX, ICON_PX, { depthBuffer: true, samples: 4 });
  iconRT.texture.colorSpace = THREE.SRGBColorSpace;
  iconScene = new THREE.Scene();
  iconCam = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
  iconCam.position.set(0, 0, 5.4);
  iconFit = new THREE.Group();
  iconScene.add(iconFit);
  // lit like the examine screen, a shade warmer so metal and glass read
  iconScene.add(new THREE.AmbientLight(0x9fb0cc, 1.15));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.2); key.position.set(-0.8, 1.1, 1.2);
  const fill = new THREE.DirectionalLight(0x8aa2d6, 0.7); fill.position.set(1.3, -0.3, 0.8);
  // a hard cold rim from behind: the edge light is what separates a dark
  // object from a dark tile, and it is most of what reads as "detail"
  const rim = new THREE.DirectionalLight(0xe4eeff, 2.4); rim.position.set(0.4, 0.6, -1.4);
  const under = new THREE.DirectionalLight(0x6f86b8, 0.6); under.position.set(0, -1, 0.3);
  iconScene.add(key, fill, rim, under, new THREE.HemisphereLight(0x54688c, 0x141820, 0.6));
}
function renderItemIcon(model, { rotX = -0.5, rotY = 0.7 } = {}) {
  if (!model) return null;
  initIconRig();
  const m = model.clone(true);
  m.traverse((o) => { o.visible = true; });
  m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.setScalar(1);
  iconFit.clear();
  iconFit.position.set(0, 0, 0); iconFit.scale.setScalar(1); iconFit.rotation.set(rotX, rotY, 0);
  iconFit.add(m);
  iconFit.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(m);
  const size = box.getSize(new THREE.Vector3());
  const big = Math.max(size.x, size.y, size.z) || 1;
  const k = 1.9 / big;
  m.scale.setScalar(k);
  m.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-k);

  // put the renderer back exactly as it was: it is the game's own, mid-frame
  const prevTarget = renderer.getRenderTarget();
  const prevClear = renderer.getClearColor(new THREE.Color());
  const prevAlpha = renderer.getClearAlpha();
  const prevAutoClear = renderer.autoClear;
  renderer.setRenderTarget(iconRT);
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = true;
  renderer.render(iconScene, iconCam);
  const buf = new Uint8Array(ICON_PX * ICON_PX * 4);
  renderer.readRenderTargetPixels(iconRT, 0, 0, ICON_PX, ICON_PX, buf);
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevClear, prevAlpha);
  renderer.autoClear = prevAutoClear;
  iconFit.clear();

  const c = document.createElement('canvas');
  c.width = c.height = ICON_PX;
  const g = c.getContext('2d');
  // a plain near-black tile — the UI is black and white, and the object is
  // the only thing on it — with a faint lift behind the object and a pool
  // of shadow under it so it sits rather than floats
  g.fillStyle = '#07080b'; g.fillRect(0, 0, ICON_PX, ICON_PX);
  const bg = g.createRadialGradient(ICON_PX * 0.5, ICON_PX * 0.46, 0, ICON_PX * 0.5, ICON_PX * 0.46, ICON_PX * 0.5);
  bg.addColorStop(0, 'rgba(255,255,255,0.075)');
  bg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = bg; g.fillRect(0, 0, ICON_PX, ICON_PX);
  const sh = g.createRadialGradient(ICON_PX * 0.5, ICON_PX * 0.78, 0, ICON_PX * 0.5, ICON_PX * 0.78, ICON_PX * 0.36);
  sh.addColorStop(0, 'rgba(0,0,0,0.75)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh;
  g.save(); g.translate(0, ICON_PX * 0.05); g.scale(1, 0.30);
  g.fillRect(0, 0, ICON_PX, ICON_PX * 2.4); g.restore();
  // the render, flipped: GL reads bottom-up
  const id = g.createImageData(ICON_PX, ICON_PX);
  for (let y = 0; y < ICON_PX; y++) {
    const src = (ICON_PX - 1 - y) * ICON_PX * 4, dst = y * ICON_PX * 4;
    for (let x = 0; x < ICON_PX * 4; x++) id.data[dst + x] = buf[src + x];
  }
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = ICON_PX;
  tmp.getContext('2d').putImageData(id, 0, 0);
  g.drawImage(tmp, 0, 0);
  return c.toDataURL();
}
/* The icon an item shows. Rendered on first ask and kept — items whose model
 * arrives over the network simply keep the drawn one until it lands. */
function itemIcon(item) {
  if (item._icon) return item._icon;
  const model = item.iconModel || item.inspectModel;
  if (model) {
    let empty = true;
    model.traverse((o) => { if (o.isMesh) empty = false; });
    if (!empty) {
      const url = renderItemIcon(model, item.iconRot || {});
      if (url) { item._icon = url; return url; }
    }
  }
  return item.icon;
}
const iconHTML = (item) => {
  const src = itemIcon(item);
  return src.startsWith('data:') ? `<img src="${src}" alt="">` : src;
};
/* The wheel walks the hotbar. Scroll down is the next thing in the strip,
 * up is the previous, wrapping — and it EQUIPS, because everything can be
 * held now; a slot you scroll onto is a thing in your hands. Only while
 * you are actually in the game: the examine screen's wheel is its zoom. */
function scrollHotbar(dir) {
  const slots = [];
  for (let i = 0; i < HOTBAR_SLOTS; i++) if (inventory[i] && inventory[i].viewmodel) slots.push(i);
  if (!slots.length) return;
  const cur = equipped ? slots.indexOf(inventory.indexOf(equipped)) : -1;
  const next = cur < 0 ? (dir > 0 ? 0 : slots.length - 1) : (cur + dir + slots.length) % slots.length;
  const item = inventory[slots[next]];
  if (item !== equipped) toggleEquip(item);
}
let wheelAcc = 0;
window.addEventListener('wheel', (e) => {
  if (!started || !introDone || inspecting || invOpen || menuOpen || dialogOpen || noteOpen || ended || dying) return;
  wheelAcc += e.deltaY;
  if (Math.abs(wheelAcc) < 40) return;      // a trackpad flick, not a notch
  scrollHotbar(wheelAcc > 0 ? 1 : -1);
  wheelAcc = 0;
}, { passive: true });
function useSlot(i) {
  const item = inventory[i];
  if (!item || menuOpen || ended) return;
  if (noteOpen) { closeNote(); return; }
  item.use();
}
function toggleEquip(item) {
  if (listening) stopListening();               // whatever leaves your hand goes quiet
  equipped = (equipped === item) ? null : item;
  viewmodel.visible = !!equipped;
  toolMount.children.forEach((c) => { c.visible = false; });
  if (equipped && equipped.viewmodel) {
    const vm = equipped.viewmodel;
    if (vm.userData.build) { vm.userData.build(); vm.userData.build = null; }
    vm.visible = true;
  }
  digT = 0;
  renderHotbar();
  renderPack();
}
renderHotbar();
renderRings();

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
/* The pack has a SELECTION. Click a slot and the item comes up in the pane
 * beside the grid — its icon large, its name, and the two things you can do
 * with it as real buttons: INSPECT and HOLD (or USE). The old pack hid
 * "Inspect" in a corner of the slot until you hovered it, which nobody
 * found; the pane makes both verbs the biggest things on the screen.
 * Dragging still works exactly as it did — reorder, or drop one item on
 * another to combine — a drag just has to MOVE first (a still click
 * selects), so the two never fight. */
const invDetailEl = document.getElementById('inv-detail');
let packSel = -1;
function inspectFromPack(item) {
  const model = item.inspectModel;
  if (!model) return;
  const opts = item.inspectOpts ? item.inspectOpts() : {};
  /* Clear the return-lock FIRST. closePack() re-requests pointer lock
   * asynchronously, and that lock lands a frame or two later — on top of
   * the examine screen, where it eats every click, drag and scroll.
   * Turning, zooming and clicking out were all dead for exactly this
   * reason. Same trap the combine recipes hit. */
  packReturnLock = false;
  closePack();
  openInspect(model, { ...opts, name: item.name });
}
function renderPackDetail() {
  if (!invDetailEl) return;
  const item = inventory[packSel];
  if (!item) {
    invDetailEl.className = 'detail empty';
    invDetailEl.innerHTML = inventory.length
      ? '<div class="hint">Select an item</div>'
      : '<div class="hint">Nothing in it yet</div>';
    return;
  }
  invDetailEl.className = 'detail';
  const verb = item.viewmodel ? (item === equipped ? 'Holster' : 'Hold') : 'Use';
  invDetailEl.innerHTML = `<div class="big">${iconHTML(item)}</div>
    <div class="name">${item.name}</div>
    <button type="button" class="act insp">Inspect</button>
    <button type="button" class="act hold">${verb}</button>
    <div class="hint">Drag onto another item to combine</div>`;
  const canInspect = !!item.inspectModel;
  const bI = invDetailEl.querySelector('.insp'), bH = invDetailEl.querySelector('.hold');
  bI.disabled = !canInspect;
  bI.addEventListener('click', (e) => { e.stopPropagation(); inspectFromPack(item); });
  bH.addEventListener('click', (e) => {
    e.stopPropagation();
    const i = inventory.indexOf(item);
    if (i < 0) return;
    closePack();
    useSlot(i);
  });
}
function selectPackSlot(i) {
  packSel = inventory[i] ? i : -1;
  for (const s of invGridEl.querySelectorAll('.islot')) s.classList.toggle('sel', +s.dataset.index === packSel);
  renderPackDetail();
}
function renderPack() {
  if (!invGridEl) return;
  invGridEl.innerHTML = '';
  if (!inventory[packSel]) packSel = inventory.length ? 0 : -1;
  for (let i = 0; i < INV_MAX; i++) {
    const item = inventory[i];
    const slot = document.createElement('div');
    slot.className = 'islot' + (item ? ' filled' : '') + (i === packSel ? ' sel' : '') + (item && item === equipped ? ' held' : '');
    slot.dataset.index = String(i);
    slot.innerHTML = `<span class="num">${i + 1}</span>` + (item ? iconHTML(item) : '');
    if (item) {
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = item.name;
      slot.appendChild(nm);
      // double-click goes straight to the examine screen
      slot.addEventListener('dblclick', (e) => { e.stopPropagation(); inspectFromPack(item); });
    }
    invGridEl.appendChild(slot);
  }
  renderPackDetail();
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
  dragArm = null; dragItem = null; dragFrom = -1;
  invGhostEl.classList.remove('show');
  clearDropHints();
}
// a press arms a drag; it only becomes one once the pointer has moved
let dragArm = null;                     // {item, from, x, y, slot}
invGridEl.addEventListener('pointerdown', (e) => {
  const slot = e.target.closest('.islot');
  if (!slot) return;
  const i = +slot.dataset.index;
  const item = inventory[i];
  selectPackSlot(i);
  if (!item) return;
  e.preventDefault();
  dragArm = { item, from: i, x: e.clientX, y: e.clientY, slot };
});
function beginDrag(e) {
  const { item, from, slot } = dragArm;
  dragArm = null;
  dragItem = item; dragFrom = from;
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
}
window.addEventListener('pointermove', (e) => {
  if (dragArm && Math.hypot(e.clientX - dragArm.x, e.clientY - dragArm.y) > 6) beginDrag(e);
  if (!dragItem) return;
  invGhostEl.style.left = e.clientX + 'px';
  invGhostEl.style.top = e.clientY + 'px';
});
window.addEventListener('pointerup', (e) => {
  dragArm = null;
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
  packSel = inventory.indexOf(item);
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
  /* A plastic beach shovel built to a photograph of one: a triangular loop
   * handle with finger scallops along the grip, a round shaft that swells
   * into a socket, and a scoop that is a real TROUGH — a curved sheet with
   * a rolled rim, a back wall where the shaft comes in, and a rib down the
   * back. The old one was five boxes and a torus, and five boxes read as
   * five boxes from any distance. Smooth-shaded: it is a hero prop, in your
   * hands for the whole game. Same footprint as before — shaft 0 → 0.6,
   * grip at 0.66, blade 0.02 → -0.21, ±0.1 wide, scoop facing -Z — so the
   * view-model pose, the trail markers and the world placement all hold. */
  const g = new THREE.Group();
  /* Moulded plastic: a little clearcoat gives it the one thing plastic has
   * that painted wood does not, a tight highlight sitting on a soft one. */
  const red = new THREE.MeshPhysicalMaterial({
    color: 0xd8271d, roughness: 0.46, metalness: 0.0, emissive: 0x2c0806,
    clearcoat: 0.55, clearcoatRoughness: 0.28, side: THREE.DoubleSide,
  });

  // --- the scoop: a parametric sheet ---------------------------------
  const NU = 20, NV = 28;
  const halfW = (v) => 0.060 + 0.040 * Math.sin(Math.min(1, v / 0.78) * Math.PI / 2) - 0.010 * Math.max(0, (v - 0.78) / 0.22);
  const curl = (v) => 0.030 - 0.010 * v;               // the rims roll up more near the neck
  const sheet = (u, v) => {
    const y = 0.02 - 0.23 * v;
    let z = -curl(v) * Math.pow(Math.abs(u), 2.4);        // trough: rims toward -Z (the open face)
    const bw = Math.max(0, 1 - v / 0.26);                 // the back wall at the neck
    z += -0.050 * bw * bw * (1 - 0.5 * Math.abs(u));
    z += 0.006 * Math.sin(v * Math.PI);                   // a shallow bow along the length
    return new THREE.Vector3(u * halfW(v), y, z);
  };
  const pos = [], uvs = [], idx = [];
  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      const p = sheet((i / NU) * 2 - 1, j / NV);
      pos.push(p.x, p.y, p.z); uvs.push(i / NU, j / NV);
    }
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  /* ONE SOLID. The sheet is thickened into a closed shell — outer face,
   * inner face and a strip round the edge, all one indexed geometry, so the
   * smoothed normals run over the rim and it reads as a moulded lip rather
   * than a skin with a tube glued round it. The first build was the sheet
   * drawn twice with a separate rim tube and the seam showed at every angle. */
  const sheetGeo = new THREE.BufferGeometry();
  sheetGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sheetGeo.setIndex(idx);
  sheetGeo.computeVertexNormals();
  const nrm = sheetGeo.attributes.normal.array;
  const T = 0.0055, n1 = (NU + 1) * (NV + 1);
  const spos = [], sidx = [];
  for (let k = 0; k < n1; k++) spos.push(pos[k * 3] + nrm[k * 3] * T * 0.5, pos[k * 3 + 1] + nrm[k * 3 + 1] * T * 0.5, pos[k * 3 + 2] + nrm[k * 3 + 2] * T * 0.5);
  for (let k = 0; k < n1; k++) spos.push(pos[k * 3] - nrm[k * 3] * T * 0.5, pos[k * 3 + 1] - nrm[k * 3 + 1] * T * 0.5, pos[k * 3 + 2] - nrm[k * 3 + 2] * T * 0.5);
  for (let k = 0; k < idx.length; k += 3) {
    sidx.push(idx[k], idx[k + 1], idx[k + 2]);                       // outer
    sidx.push(idx[k] + n1, idx[k + 2] + n1, idx[k + 1] + n1);        // inner, reversed
  }
  // the strip round the edge: left side, the tip, right side, the neck
  const ring = [];
  for (let j = 0; j <= NV; j++) ring.push(j * (NU + 1));
  for (let i = 1; i <= NU; i++) ring.push(NV * (NU + 1) + i);
  for (let j = NV - 1; j >= 0; j--) ring.push(j * (NU + 1) + NU);
  for (let i = NU - 1; i > 0; i--) ring.push(i);
  for (let k = 0; k < ring.length; k++) {
    const a = ring[k], b = ring[(k + 1) % ring.length];
    sidx.push(a, b, b + n1, a, b + n1, a + n1);
  }
  const scoopGeo = new THREE.BufferGeometry();
  scoopGeo.setAttribute('position', new THREE.Float32BufferAttribute(spos, 3));
  scoopGeo.setIndex(sidx);
  scoopGeo.computeVertexNormals();
  g.add(new THREE.Mesh(scoopGeo, red));

  /* The shaft is on the BACK. The scoop's open face is -Z; the socket, the
   * rib and everything above them sit at +Z, behind the back wall, so from
   * the front you see the trough and the wall and not a shaft lying in the
   * bowl — which is how the first build came out, and which is exactly the
   * shovel you cannot dig with. */
  const BK = 0.014;
  const rib = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), red);
  rib.scale.set(0.014, 0.085, 0.009); rib.position.set(0, -0.045, BK - 0.002);
  g.add(rib);
  const socket = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.0, -0.012), new THREE.Vector2(0.024, -0.010), new THREE.Vector2(0.026, 0.0), new THREE.Vector2(0.022, 0.03),
    new THREE.Vector2(0.016, 0.06), new THREE.Vector2(0.0135, 0.09),
  ], 18), red);
  socket.position.set(0, 0.0, BK);
  g.add(socket);

  // --- the shaft: round, a hair thicker at the bottom ----------------
  const shaft = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.0135, 0.08), new THREE.Vector2(0.0125, 0.30), new THREE.Vector2(0.0115, 0.585),
    new THREE.Vector2(0.0, 0.585),
  ], 18), red);
  shaft.position.z = BK;
  g.add(shaft);

  // --- the handle: a triangular loop, scalloped along the grip -------
  const loopPts = [
    new THREE.Vector3(0, 0.575, 0), new THREE.Vector3(-0.026, 0.612, 0), new THREE.Vector3(-0.048, 0.648, 0),
    new THREE.Vector3(-0.044, 0.672, 0), new THREE.Vector3(-0.022, 0.683, 0), new THREE.Vector3(0, 0.686, 0),
    new THREE.Vector3(0.022, 0.683, 0), new THREE.Vector3(0.044, 0.672, 0), new THREE.Vector3(0.048, 0.648, 0),
    new THREE.Vector3(0.026, 0.612, 0),
  ];
  const loop = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loopPts, true, 'catmullrom', 0.6), 80, 0.0085, 9, true), red);
  loop.position.z = BK;
  g.add(loop);
  // finger scallops: the grip swells between each groove
  for (let i = 0; i < 4; i++) {
    const x = -0.030 + i * 0.020;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 10, 8), red);
    knob.position.set(x, 0.681 - Math.abs(x) * 0.18, BK);
    knob.scale.set(1, 0.9, 1);
    g.add(knob);
  }
  // the web where the arms meet the shaft
  const web = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), red);
  web.position.set(0, 0.585, BK); web.scale.set(1.1, 0.8, 0.8);
  g.add(web);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
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
/* The tool's own rest orientation, and the one it takes for an overhead.
 * A dig bites with the OPEN face; an overhead is a smash, and a smash lands
 * on the flat BACK of the scoop with the blade square to the ground and the
 * open side up. That is a different grip, not a different arm angle, so it
 * is the tool that turns — rolled right over and squared up, blended in
 * across the wind so you see the hands change their hold. */
const VM_REST_ROT = [0.70, 0.35, 0.32];
const VM_OVERHEAD_ROT = [-0.62, 0.0, Math.PI];
shovelVM.rotation.set(VM_REST_ROT[0], VM_REST_ROT[1], VM_REST_ROT[2]);
let ohBlend = 0;
shovelVM.visible = false;
toolMount.add(shovelVM);

/* The swing trail. Follow-through and arc, and the cheapest thing there is
 * for making a swing read as a swing rather than as a model changing angle:
 * a ribbon strung between the blade's edge and its root, sampled every frame
 * through the strike and left to fade after it. Two markers ride the shovel
 * and the strip is rebuilt from a ring buffer of where they have been.
 *
 * It lives in vmScene, NOT under the arm — the whole point is that it stays
 * where the blade was while the blade moves on.
 *
 * Brightness scales with digPower, so a wound-up swing tears a streak across
 * the screen and a tap leaves almost nothing. That difference is doing real
 * work: it is the clearest read the player has on how hard they just hit. */
/* The two markers sit at the ENDS OF THE BLADE'S LIP, not along the shaft.
 * Strung tip-to-root down the tool the ribbon is 0.3 local units wide and,
 * swept through four radians, it fills a quarter of the screen with a solid
 * white fan. Strung across the cutting edge it is exactly as wide as the
 * blade, and what it draws is the path the edge actually took. Ten samples,
 * not eighteen: a trail is a smear behind the blade, not a diagram of the
 * whole swing. */
const TRAIL_N = 10;
const trailTip = new THREE.Object3D();  trailTip.position.set(-0.095, -0.21, -0.05);
const trailRoot = new THREE.Object3D(); trailRoot.position.set(0.095, -0.21, -0.05);
shovelVM.add(trailTip, trailRoot);
const trailPos = new Float32Array(TRAIL_N * 2 * 3);
const trailCol = new Float32Array(TRAIL_N * 2 * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
{
  const idx = [];
  for (let i = 0; i < TRAIL_N - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  trailGeo.setIndex(idx);
}
const trailMesh = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({
  vertexColors: true, transparent: true, depthWrite: false, fog: false,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
}));
trailMesh.frustumCulled = false;        // it is rebuilt in place every frame
trailMesh.visible = false;
vmScene.add(trailMesh);
let trailLen = 0, trailFade = 0, trailPower = 0;
const _tv = new THREE.Vector3();

function trailSample() {
  // shuffle every sample one slot older, then write the newest into slot 0
  trailPos.copyWithin(6, 0, (TRAIL_N - 1) * 6);
  trailTip.getWorldPosition(_tv);
  trailPos[0] = _tv.x; trailPos[1] = _tv.y; trailPos[2] = _tv.z;
  trailRoot.getWorldPosition(_tv);
  trailPos[3] = _tv.x; trailPos[4] = _tv.y; trailPos[5] = _tv.z;
  trailLen = Math.min(TRAIL_N, trailLen + 1);
}
function updateTrail(dt, recording) {
  if (recording) { trailSample(); trailFade = 1; }
  else if (trailFade > 0) trailFade = Math.max(0, trailFade - dt / 0.16);
  if (trailFade <= 0) {
    if (trailMesh.visible) { trailMesh.visible = false; trailLen = 0; }
    return;
  }
  trailMesh.visible = true;
  /* Slots past what has actually been recorded keep whatever was in them, so
   * they are zeroed in COLOUR rather than moved — the blend is additive, and
   * black adds nothing. Cheaper than fixing up positions every frame. */
  for (let i = 0; i < TRAIL_N; i++) {
    const age = i / (TRAIL_N - 1);
    const a = (i < trailLen ? Math.pow(1 - age, 1.7) : 0)
      * trailFade * (0.020 + trailPower * 0.062);
    /* Low, because the quads OVERLAP as the arc tightens and additive
     * blending accumulates every one of them — a per-quad alpha that looks
     * faint on its own stacks into solid white where the smear doubles back. */
    for (let k = 0; k < 2; k++) {
      const o = (i * 2 + k) * 3;
      const w = k === 0 ? 1 : 0.85;      // barely tapered: both ends are the edge
      trailCol[o] = a * w * 0.70; trailCol[o + 1] = a * w * 0.80; trailCol[o + 2] = a * w;
    }
  }
  trailGeo.attributes.position.needsUpdate = true;
  trailGeo.attributes.color.needsUpdate = true;
}

// ------------------------------------------------------------------
// Sand castle with the shovel stuck in it — the first item you find
// ------------------------------------------------------------------
const CASTLE_Z = -10;
/* Up the DRY beach. It stood at x = 4.6, which is inside the swash: the
 * waterline reaches 8.6, so for part of every tide the surf was drawn over
 * the sand under it and it sat in the sea like a dropped toy — which is
 * most of why it looked so out of place. Same number the mounds and the
 * body bag use. */
const CASTLE_X = 10.4;
const CASTLE_H = 1.65;              // how tall it stands on the sand
/* The castle is assetfactory's "Low poly sand castle" (assets/sandcastle.glb,
 * 13k triangles, its own baked colour map), lifted for the night the way the
 * rocks and the shell are. The two meshes are welded into ONE geometry in
 * metres with the base on y = 0, because that is what the fracture below
 * needs: it cuts the castle up by walking its triangles, and it wants one
 * list of them in world scale. The built-up bucket towers this replaced
 * were the one thing on the beach that still read as programmer art. */
const castle = new THREE.Group();
castle.position.set(CASTLE_X, -0.05, CASTLE_Z);     // its base a little INTO the sand
scene.add(castle);
/* And bedded in: a low apron of the beach's own sand banked round its foot,
 * the way the rocks are. A thing set down ON a flat plane meets it along a
 * hard line and reads as placed; a thing the sand has drifted up against
 * reads as having been there. */
{
  const apron = new THREE.Mesh(makeApron(2.4), sandMat);
  apron.scale.set(2.4, 0.13, 2.4);
  apron.position.set(CASTLE_X, 0, CASTLE_Z);
  driftGroup.add(apron);
}
let castleGeo = null, castleMat = null;
new GLTFLoader().load('assets/sandcastle.glb', (gltf) => {
  gltf.scene.updateMatrixWorld(true);
  const parts = [];
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    parts.push(g);
    castleMat = castleMat || o.material;
  });
  if (!parts.length) return;
  // weld: every part carries position / normal / uv, non-indexed, so this
  // is a straight concatenation
  const cat = (name, n) => {
    const total = parts.reduce((a, g) => a + g.attributes[name].count, 0);
    const out = new Float32Array(total * n);
    let off = 0;
    for (const g of parts) { out.set(g.attributes[name].array, off); off += g.attributes[name].count * n; }
    return new THREE.Float32BufferAttribute(out, n);
  };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', cat('position', 3));
  geo.setAttribute('normal', cat('normal', 3));
  geo.setAttribute('uv', cat('uv', 2));
  geo.computeBoundingBox();
  const b = geo.boundingBox, size = b.getSize(new THREE.Vector3());
  const k = CASTLE_H / size.y;
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  geo.scale(k, k, k);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  castleGeo = geo;
  // a daylight-baked sand colour, taken into the night like the rocks
  castleMat.flatShading = true;
  // the beach's own tint, not a warmer or paler one: `sandMat` is
  // 0x6d7d99 lit by 0x27324a, and anything on it that is not in that family
  // is a different material however good its texture
  castleMat.color.setHex(0x8290aa);
  castleMat.emissive.setHex(0x323d56);
  castleMat.emissiveMap = castleMat.map;
  castleMat.roughness = 1; castleMat.metalness = 0;
  reexpose(castleMat, 0.6);
  castleMat.needsUpdate = true;
  const m = new THREE.Mesh(geo, castleMat);
  castle.add(m);
  // solid, on its real footprint
  const fs = geo.boundingBox.getSize(new THREE.Vector3());
  rockColliders.push({ x: castle.position.x, z: castle.position.z, r: Math.max(fs.x, fs.z) * 0.36, top: CASTLE_H, castle: true });
});
/* IT FALLS DOWN. A sandcastle that stops you dead is a wall pretending to be
 * sand — so walk into it and it collapses, or put something through it. The
 * shovel stuck in the keep is a separate interactable and survives either
 * way: take it out and leave the castle standing, or wreck the castle and
 * pick the shovel up off the heap. Both are fine; that is the point.
 *
 * The pieces are real gibs, so they bounce and settle like everything else
 * on this beach rather than fading out where they stand. */
/* WHAT IT BREAKS INTO HAS TO BE WHAT IT WAS. The chunks took `castleMat`,
 * which is right in principle and wrong in practice: that material carries
 * the scan's own baked map, and a rounded lump's uv samples wherever it
 * happens to land on that atlas — mostly the dark parts — so the pile came
 * out much darker than the castle it fell off. The chunks get the beach's
 * own grain instead, lifted (the map MULTIPLIES) to the tone the castle
 * actually renders at, so the heap matches the thing that made it and
 * settles into the sand around it. */
const castleChunkTex = sandTex.clone(); castleChunkTex.needsUpdate = true; castleChunkTex.repeat.set(3.2, 3.2);
const castleChunkBump = sandBump.clone(); castleChunkBump.needsUpdate = true; castleChunkBump.repeat.set(3.2, 3.2);
const castleChunkMat = new THREE.MeshStandardMaterial({
  map: castleChunkTex, bumpMap: castleChunkBump, bumpScale: 1.4,
  color: 0xa7b1c6, roughness: 1, metalness: 0, flatShading: true,
  emissive: 0x2f3850, emissiveMap: castleChunkTex,
});
let castleBroken = false;
function breakCastle(fromX, fromZ) {
  if (castleBroken) return;
  castleBroken = true;
  const ci = rockColliders.findIndex((c) => c.castle);
  if (ci >= 0) rockColliders.splice(ci, 1);
  const cx = castle.position.x, cz = castle.position.z;
  sfxCastleBreak();
  spawnPuffs(cx, cz, 9, 0, -1, 0.25);
  addTrauma(0.22);
  // away from whatever knocked it down
  let ax = cx - (fromX ?? cx - 1), az = cz - (fromZ ?? cz);
  const ad = Math.hypot(ax, az) || 1; ax /= ad; az /= ad;
  /* THE FRACTURE. The castle is one mesh, so it is cut into pieces by its
   * triangles: each one goes into the grid cell its centroid falls in, and
   * every occupied cell becomes a chunk with its own body. Nothing is sliced
   * — at this triangle count a chunk's ragged edge reads as a break, not as
   * a cut — and because the cells are stacked, the top of the keep comes
   * down as lumps of tower and the base as a low ring of wall, which is how
   * a sandcastle actually goes: the tall parts first, then the rest slumps.
   * Higher chunks are thrown further; the base barely moves. */
  if (castleGeo) {
    /* THE FRACTURE, as a slump. The first version threw every chunk up and
     * out at once, which is an explosion, and sand does not explode — it
     * gives way from the top. So the pieces are cut by walking the
     * triangles into 0.22 m cells, sorted into LAYERS by height, and let go
     * a layer at a time from the top down, seventy milliseconds apart:
     * the towers come off first, then the walls, then the base sags. Each
     * piece barely lifts, tumbles slowly, and comes to rest part-buried in
     * the beach (its rest height is under its own half-height), because a
     * lump of sand that lands ON the sand and sits proud of it is a block. */
    const CELL = 0.22;
    const pos = castleGeo.attributes.position, nor = castleGeo.attributes.normal, uv = castleGeo.attributes.uv;
    const cells = new Map();
    for (let t = 0; t < pos.count; t += 3) {
      const mx = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3;
      const my = (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3;
      const mz = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3;
      const iy = Math.floor(my / CELL);
      const key = Math.floor(mx / CELL) + ',' + iy + ',' + Math.floor(mz / CELL);
      let c = cells.get(key);
      if (!c) cells.set(key, c = { p: [], n: [], u: [], cx: 0, cy: 0, cz: 0, k: 0, iy, ylo: 1e9, yhi: -1e9 });
      for (let v = t; v < t + 3; v++) {
        const vy = pos.getY(v);
        c.p.push(pos.getX(v), vy, pos.getZ(v));
        c.n.push(nor.getX(v), nor.getY(v), nor.getZ(v));
        c.u.push(uv.getX(v), uv.getY(v));
        if (vy < c.ylo) c.ylo = vy; if (vy > c.yhi) c.yhi = vy;
      }
      c.cx += mx; c.cy += my; c.cz += mz; c.k++;
    }
    const layers = [...cells.values()].sort((a, b) => b.iy - a.iy);
    const topLayer = layers.length ? layers[0].iy : 0;
    for (const c of layers) {
      const ccx = c.cx / c.k, ccy = c.cy / c.k, ccz = c.cz / c.k;
      const halfH = Math.max(0.04, (c.yhi - c.ylo) / 2);
      /* A CHUNK IS A LUMP, NOT ITS TRIANGLES. Cutting the mesh by cell and
       * keeping the raw triangles gave each piece a scatter of long thin
       * slivers — at this triangle count a cell is a handful of big faces,
       * and the leftovers stuck out like spines. Sand does not break into
       * spikes. The cell still decides WHERE a piece is and how big, but
       * the piece itself is a rounded lump knocked out of round, which is
       * what a handful of wet sand actually looks like when it lets go. */
      const r = THREE.MathUtils.clamp(Math.max(halfH, 0.055) * 1.15, 0.05, CELL * 0.85);
      const g = new THREE.IcosahedronGeometry(r, 0);
      const lp = g.attributes.position;
      for (let i = 0; i < lp.count; i++) {
        const k = 0.72 + Math.random() * 0.5;
        lp.setXYZ(i, lp.getX(i) * k, lp.getY(i) * k * 0.82, lp.getZ(i) * k);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, castleChunkMat);
      m.position.set(cx + ccx, castle.position.y + ccy, cz + ccz);
      const h = ccy / CASTLE_H;                       // 0 at the base, 1 at the top
      const wait = (topLayer - c.iy) * 70;             // the top goes first
      setTimeout(() => {
        if (!m.parent) scene.add(m);
        // radially out from the middle, more so at the top, and a little
        // away from whatever hit it — sand slides, it is not thrown
        const rr = Math.hypot(ccx, ccz) || 1;
        const out = 0.25 + h * 0.9;
        gibs.push({
          m,
          vel: new THREE.Vector3((ccx / rr) * out + ax * 0.5 * h + (Math.random() - 0.5) * 0.3,
                                 0.15 + h * 1.1 + Math.random() * 0.35,
                                 (ccz / rr) * out + az * 0.5 * h + (Math.random() - 0.5) * 0.3),
          spin: new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.6),
          rest: halfH * 0.45, life: 45, bleed: false,
        });
        if (Math.random() < 0.18) spawnPuffs(cx + ccx * 0.6, cz + ccz * 0.6, 2, ax, az, 0.1);
      }, wait);
    }
  }
  scene.remove(castle);
  // the shovel is left standing in the heap where the keep was
  if (shovelWorld.parent) {
    shovelWorld.position.y = 0.14;
    shovelWorld.rotation.set(1.15, 0.4, -0.2);
  }
}
/* Walking through it. Checked before the push-out gets a chance to stop you,
 * so you go THROUGH the thing you just knocked over instead of bouncing off
 * the collider of a castle that is already in pieces. */
function updateCastle() {
  if (castleBroken) return;
  const c = rockColliders.find((k) => k.castle);
  if (!c) return;
  // touching it is enough. There is no speed to reach first: it is sand, and
  // the collider would otherwise stop you at exactly this distance.
  const dx = camera.position.x - c.x, dz = camera.position.z - c.z;
  const r = c.r + PLAYER_R * 0.9;
  if (dx * dx + dz * dz < r * r) breakCastle(camera.position.x, camera.position.z);
}

const shovelWorld = makeShovel();
shovelWorld.position.set(CASTLE_X + 0.16, 0.98, CASTLE_Z + 0.12);   // stuck in the keep's flank
shovelWorld.rotation.set(0.55, 0.4, -0.4);
addItemShine(shovelWorld, { size: 0.7, height: 0.45, strength: 0.8 });
{
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  proxy.position.y = 0.3; proxy.name = 'hitProxy';
  shovelWorld.add(proxy);
}
scene.add(shovelWorld);

let digT = 0, digImpacted = false;
/* Holding the shell to your ear. `listenT` eases up while `listening` and
 * back down after, and the arm blends from wherever it is to `EAR_AT` — up,
 * in, and close enough to the camera that the shell fills the right edge of
 * the frame with its mouth turned to the side of your head. The look-lag is
 * mostly switched off on the way there: a hand at your ear does not trail
 * your turns the way a tool held out in front does. */
let listenT = 0;
// across you and high, close to the camera: the blade fills the middle of
// the frame, which is the whole readable difference between guarding and not
// z matters more than it looks: the arm rests at -0.62 and vmCamera's near
// plane is 0.01, so pulling the guard in to -0.22 put half the shovel behind
// the near plane and it vanished entirely rather than reading as close.
// held ACROSS the view, horizontal, blade to your right and high — the
// reference is a sword block in a first-person game: the weapon is a bar
// across the top third of the frame, and there is no mistaking it for a
// rest pose
const BLOCK_AT = new THREE.Vector3(-0.10, 0.02, -0.52);
// the shaft comes up ACROSS the view, blade high on your leading side: at a
// shallower roll it read as holding the tool out rather than guarding with it
const BLOCK_POSE = [0.35, 0.0, 0.95, -1.62, 0.06];
// x and y are FRACTIONS of the frame's half-extents at the ear's depth, like
// layoutViewmodel(): an absolute offset that sat at the edge of a landscape
// window was clean off the side of a portrait one
const EAR_AT = new THREE.Vector3(0.88, 0.02, -0.25);   // straddling the right edge, at ear height
const EAR_POSE = [0.35, 0, 1.25, 0.55, 0];        // [pitch, lift, yaw, roll, push]
/* EVERYTHING CAN BE HELD. Half the items used to have no model in the hand
 * at all: picking one up put an icon in the hotbar and using it threw you
 * straight into the examine screen, so the ring, the key, the bottle and the
 * crab were things you owned but never carried. `holdable()` gives an item a
 * view model cloned from the same object the examine screen shows, so what
 * you hold and what you turn over are the one object.
 *
 * The clone is LAZY. Two of these models — the ring and the key — are scans
 * that arrive over the network some seconds after the item exists, and a
 * clone taken at declaration time would be an empty Group forever. It is
 * built the first time you equip, by which point the loader has long since
 * run. */
function holdable(item, model, { scale = 1, pos = [0, -0.02, 0], rot = [0, 0, 0] } = {}) {
  const vm = new THREE.Group();
  vm.visible = false;
  vm.userData.build = () => {
    const m = model.clone(true);
    m.traverse((o) => { o.visible = true; });
    m.scale.setScalar(scale);
    m.position.set(pos[0], pos[1], pos[2]);
    m.rotation.set(rot[0], rot[1], rot[2]);
    vm.add(m);
  };
  toolMount.add(vm);
  item.viewmodel = vm;
  item.inspectModel = model;          // what the pack's Inspect button shows
  return item;
}
const shovelItem = {
  name: 'Sand shovel', icon: makeShovelIcon(), onDig: true, viewmodel: shovelVM,
  // its own instance, because inspectSetModel() re-parents and rescales what
  // it is handed — pass the view model and the tool leaves your hand
  inspectModel: makeShovel(),
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
 * wind-up: slower, wider, reaches further, and hits a good deal harder.
 *
 * THE RELEASE USED TO LAG, and the reason is worth writing down. A charged
 * swing went through startDig() like any other, and startDig() starts the
 * animation at p = 0 — which is *anticipation*, the part that hauls the tool
 * up from rest. So letting go snapped the shovel out of the pose you had just
 * spent a second winding into, dropped it back to rest, and then spent another
 * 0.4 s winding it up again before it fell. Two artefacts, one cause.
 *
 * A charged swing is already wound. It starts at DIG_WINDUP — the doorstep of
 * the strike — from the exact pose the hands were left in, captured off the
 * last rendered frame so there is nothing to snap between. Release to blade
 * moving is one frame. */
const WIND_FULL = 1.0;                  // seconds of holding to reach full power
const WIND_TAP = 0.16;                  // held longer than this and you meant a heavy
let windLatch = null, swungAt = -1;      // when a held release last landed a heavy
/* THE GUARD. Hold right and the shovel comes up across you. It is a real
 * guard, not a damage modifier: a strike that lands on it does nothing at
 * all. What makes it worth learning is the first fifth of a second — raise
 * it INTO the blow and you parry, which stuns the thing that swung and
 * leaves it standing there for you.
 *
 * `blockStart` is when the guard went up, so the window is measured from the
 * press and not from whether the animation has finished. Committing to the
 * timing is the skill; waiting for a pose to settle is not. */
const PARRY_WINDOW = 0.20;               // seconds after the guard goes up
/* And a cooldown, which is the thing that makes the window mean anything.
 * Without it the window opens on every press, so mashing right click parries
 * everything and the timing you are supposed to be learning is worth nothing
 * — mashing must never beat reading. Blocking is unaffected: the guard still
 * stops the blow, you simply do not get the stun.
 *
 * A successful parry clears it at once. Landing one should let you act on
 * what you just earned, not stand there waiting. */
const PARRY_COOLDOWN = 0.55;
/* A BLOCK COSTS WIND; A PARRY DOES NOT. Holding a shovel across a blow that
 * hard takes something out of you, and the bar it takes it out of is the one
 * you run on — so a fight you spend blocking is a fight you cannot back out
 * of. Timing it instead costs nothing, which is the whole argument for
 * learning the tell. When the bar goes, so does the guard, and you hear
 * yourself run out. */
const BLOCK_COST = 0.34;                 // of a full bar, per blow stopped
let blockGasped = false;
let blocking = false, blockT = 0, blockStart = -1, parryCool = 0;
let parryGlow = 0;                       // the white flash on a successful parry
let winding = false, windT = 0, digPower = 0, digCharged = false, windFull = false;
/* THE OVERHEAD. Hold sprint while you wind and the shovel goes up over your
 * head in both hands instead of back over your shoulder, and comes down the
 * middle — the one swing in the game that is a smash rather than a dig. It
 * is a POSE SET, not a second animation system: the same three lerps run,
 * they just run between different poses, so the landing, the trail and the
 * blade-on-the-crosshair correction all work exactly as they already do. */
let digOverhead = false, windOverhead = false;
const overheadHeld = () => !!(keys['ShiftLeft'] || keys['ShiftRight']);

/* Poses are [pitch, lift, yaw, roll, push] and the swing is lerps between
 * them, rather than five hand-written curves per segment. That is what lets
 * the charged release start from an arbitrary pose instead of a fixed one. */
const REST_POSE = [0, 0, 0, 0, 0];
const _poseA = [0, 0, 0, 0, 0];         // where the strike starts
const _poseB = [0, 0, 0, 0, 0];         // where it lands
const _pose = [0, 0, 0, 0, 0];          // this frame, and what release captures
function poseMix(out, a, b, t) {
  for (let i = 0; i < 5; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}
// the top of an ordinary left-click swing
function haulPose(out, P) {
  if (digOverhead) {
    // both hands above the head, brought in to the centre line
    out[0] = -(1.95 + P * 0.35); out[1] = 0.34 + P * 0.16;
    out[2] = 0.44; out[3] = 0.02; out[4] = 0.12;
    return out;
  }
  out[0] = -(1.25 + P * 0.70); out[1] = 0.17 + P * 0.13;
  out[2] = -(0.34 + P * 0.26); out[3] = -(0.20 + P * 0.16); out[4] = 0.05;
  return out;
}
/* Where the blade lands. `push` is the arm's z, and the vm camera looks down
 * -Z, so a more negative push is the tool thrust further out in front of you —
 * this is the visible half of a heavy's longer reach, the other half being the
 * raycast in digImpact(). At full charge the arm goes from 0.62 m out to 1.06,
 * which reads as a real lunge rather than a tuning nudge. */
function impactPose(out, P) {
  if (digOverhead) {
    /* Straight down the middle and driven forward — no yaw across the body,
     * because the whole read of an overhead is that it does not swing, it
     * FALLS. Further through than a side swing, and further out. */
    out[0] = 2.30 + P * 0.55; out[1] = -(0.40 + P * 0.08);
    out[2] = 0.42; out[3] = -0.03; out[4] = -(0.26 + P * 0.34);
    return out;
  }
  /* `lift` used to take the hand to -0.69 at full charge, which is below the
   * bottom of the frame — the blade left the screen on the frame it landed,
   * so the one pose that most needs to read was the one you could not see.
   * The chop is carried by `pitch` instead, which is what was doing the work
   * anyway; the hand now stops just inside the edge. */
  out[0] = 1.72 + P * 0.80; out[1] = -(0.30 + P * 0.06);
  out[2] = 0.16 + P * 0.14; out[3] = 0.14 + P * 0.10; out[4] = -(0.12 + P * 0.26);
  return out;
}

/* Where the swing is going is decided when you COMMIT it — the click, or the
 * release — not on the frame the blade lands 150–200 ms later. Reading the
 * camera at impact meant a swing landed wherever you had drifted to looking
 * by then, which is the whole "it doesn't hit what I aimed at" feel. */
const _aimO = new THREE.Vector3(), _aimD = new THREE.Vector3();
/* Where the blade lands. The DIRECTION is locked at the moment you commit —
 * the blade arrives 150–200 ms after the click and by then you have looked
 * somewhere else — but the ORIGIN is wherever you are standing now. It used
 * to lock both, so at a run you had moved a couple of metres past the point
 * by the time the blade fell and the crater opened up at your heels. */
function aimRay(P) {
  camera.getWorldPosition(_aimO);
  digRay.set(_aimO, _aimD);
  digRay.far = DIG_REACH + P * DIG_HEAVY_REACH;
  return digRay;
}
/* WHERE THE BLADE LANDS ON SCREEN. The poses put the blade at a fixed spot
 * in the lower right whatever you were aiming at, so a swing at the crab or
 * at a crater four metres out ended with the shovel a hand's width from it
 * and the hit happening somewhere else. The crosshair is fixed, so anything
 * the swing meets is at the centre of the screen — and the blade has to be
 * there too. `aimLand()` finds what the ray will meet when you commit, the
 * same things digImpact() tests in the same order, and updateViewmodel()
 * slides the whole arm each frame so the lip of the blade sits on that
 * point's screen position through the strike, holds there a beat, and lets
 * go through the recovery. It is a translation of the rig, not a re-solve
 * of the pose: the swing keeps its shape, it just finishes on the mark. */
const _landP = new THREE.Vector3(), _landNdc = new THREE.Vector3();
let landDist = -1;                        // -1: nothing in reach, scuff at the feet
function aimLand(P) {
  aimRay(P);
  let d = Infinity;
  const near = (h) => { if (h && h.distance < d) d = h.distance; };
  if (!castleBroken && castleGeo) near(digRay.intersectObject(castle, true)[0]);
  for (const c of crates) if (!c.broken) near(digRay.intersectObject(c.group, true)[0]);
  for (const u of crabs) {
    if (!u.st.alive) continue;
    _hitC.copy(u.g.position); _hitC.y += 0.28;
    const t = THREE.MathUtils.clamp(_hitC.clone().sub(_aimO).dot(_aimD), 0, digRay.far);
    if (_hitC.distanceTo(_aimO.clone().addScaledVector(_aimD, t)) < 0.62 + P * 0.25) d = Math.min(d, t);
  }
  near(nearestSolidHit());
  near(digRay.intersectObject(sand, false)[0]);
  landDist = isFinite(d) ? d : -1;
}
// the landing point this frame: the locked direction from where you stand now
function landPoint() {
  camera.getWorldPosition(_landP);
  if (landDist >= 0) return _landP.addScaledVector(_aimD, landDist);
  _pf.copy(_aimD); _pf.y = 0; _pf.normalize();
  const d = 1.5 + digPower * 1.1;
  _landP.x += _pf.x * d; _landP.z += _pf.z * d; _landP.y -= playerEye();
  return _landP;
}
function startDig(power = 0, fromPose = null) {
  if (digT > 0 || !equipped || !equipped.onDig || frozen()) return;
  camera.getWorldDirection(_aimD);            // the angle; aimRay() takes the position
  digPower = THREE.MathUtils.clamp(power, 0, 1);
  // a charged release keeps whatever it was wound as; a plain click never is
  digOverhead = !!fromPose && windOverhead;
  aimLand(digPower);
  digImpacted = false;
  digCharged = !!fromPose;
  if (fromPose) {
    for (let i = 0; i < 5; i++) _poseA[i] = fromPose[i];
    digT = DIG_WINDUP;                  // already wound: straight into the strike
  } else {
    haulPose(_poseA, digPower);
    digT = 0.0001;
  }
  impactPose(_poseB, digPower);
  sfxDig(digPower);
}
function startWind() {
  if (blocking) return;                  // no swing comes out of a guard
  if (digT > 0 || winding || !equipped || !equipped.onDig || frozen()) return;
  winding = true; windT = 0; windFull = false; windOverhead = false;
}
function releaseWind() {
  if (!winding) return;
  winding = false;
  // even a tap off the right button carries a bit more than a plain dig
  startDig(0.3 + 0.7 * Math.min(1, windT / WIND_FULL), _pose);
  windT = 0;
}
/* How far in front of you the blade can land. A wound-up swing reaches
 * DIG_REACH + DIG_HEAVY_REACH, half again as far as a left click — you can
 * see it too, because the crater and the sand it throws land out there. */
const DIG_REACH = 4.2, DIG_HEAVY_REACH = 2.4;
// where on the sand the crosshair is pointing (null if you're looking at
// the sky or somewhere out of reach)
const digRay = new THREE.Raycaster();
const _digHit = new THREE.Vector3();
function crosshairGroundPoint(maxDist = DIG_REACH) {
  digRay.far = maxDist;
  digRay.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = digRay.intersectObject(sand, false);
  if (!hits.length) return null;
  _digHit.copy(hits[0].point);
  if (_digHit.x < WADE_X + 0.2 || _digHit.x > CLIFF_BLOCK_X + 1.5) return null;
  return _digHit;
}
const _hitC = new THREE.Vector3();
function digImpact() {
  _pf.copy(_aimD); _pf.y = 0; _pf.normalize();
  const P = digPower;
  if (castleStrike(P)) return;            // the blade went through the castle
  if (crateStrike(P)) return;             // the blade is on the crate, not the sand
  if (glassStrike()) return;              // or on something that shatters
  // the crab: the AIM LINE has to pass close to the body. It used to be any
  // impact point within 1.5 m of it (3.2 on a heavy) — you could kill it
  // looking at the sand beside it, which is not a hit anyone feels they made.
  {
    aimRay(P);
    let best = null, bestT = Infinity;
    for (const u of crabs) {
      if (!u.st.alive) continue;
      _hitC.copy(u.g.position); _hitC.y += 0.28;
      const t = THREE.MathUtils.clamp(_hitC.clone().sub(_aimO).dot(_aimD), 0, digRay.far);
      const miss = _hitC.distanceTo(_aimO.clone().addScaledVector(_aimD, t));
      if (miss < 0.62 + P * 0.25 && t < bestT) { bestT = t; best = u; }
    }
    if (best) {
      const heavy = P >= CRAB_HEAVY;
      hitConnect(P, heavy ? 1.25 : 0.85);
      /* An overhead that lands charged is the heaviest thing in the game and
       * it gets its own report — a hard concrete crack, under the shell hit
       * rather than instead of it, so the swing still sounds like a swing. */
      if (heavy && digOverhead) playSample('smash', 1.0, 0.05);
      hurtCrab(best, heavy ? CRAB_HP : 1, P);
      return;
    }
  }
  /* Something solid in front of the sand. The blade used to raycast the sand
   * and nothing else, so a swing at the pier went straight through the boards
   * and cratered the beach two metres underneath — you dug UNDER the dock.
   * The dock, the rocks and the wreck are tested first, and if one of them is
   * nearer than the sand the blade stops there: a wood or stone hit, its own
   * sound, its own chips, a scar left on the surface, and no hole. */
  aimRay(P);
  {
    const solidHit = nearestSolidHit();
    const sandHit = digRay.intersectObject(sand, false)[0];
    if (solidHit && (!sandHit || solidHit.distance < sandHit.distance)) {
      const surface = solidHit.surface;
      hitConnect(P, surface === 'rock' ? 0.85 : 0.7);
      sfxPropHit(surface, 7 + P * 6);
      sfxDigImpact(P * 0.4);
      const pt = solidHit.point;
      // chips the colour of what you hit, thrown back along the normal
      const tint = surface === 'wood' ? [0.30, 0.24, 0.17] : [0.42, 0.44, 0.48];
      spawnPuffs(pt.x, pt.z, 9 + Math.round(P * 8), -_pf.x, -_pf.z, pt.y, tint);
      stampScar(solidHit, surface);
      return;
    }
  }
  const hits = digRay.intersectObject(sand, false);
  let x, z;
  if (hits.length && hits[0].point.x > WADE_X + 0.2 && hits[0].point.x < CLIFF_BLOCK_X + 1.5) {
    x = hits[0].point.x; z = hits[0].point.z;
  } else {
    // looking at the sky — scuff the sand just in front of your feet instead
    const d = 1.5 + P * 1.1;
    x = THREE.MathUtils.clamp(_aimO.x + _pf.x * d, WADE_X + 0.3, CLIFF_BLOCK_X - 0.3);
    z = _aimO.z + _pf.z * d;
  }
  if (inWater(x, z)) {
    // blade hits water, not sand — throw a splash, leave no crater
    spawnSplash(x, z, 24 + P * 22, _pf.x, _pf.z, 1.7 + P * 0.9);
    sfxSplash(1.1 + P * 0.5);
    addTrauma(0.10 + P * 0.22);
    return;
  }
  addTrauma(0.18 + P * 0.42);
  stampDigHole(x, z, _pf.x, _pf.z);
  spawnPuffs(x, z, 22 + Math.round(P * 20), _pf.x, _pf.z);
  sfxDigImpact(P);
  revealMoundNear(x, z, _pf.x, _pf.z);
}

/* What the blade would meet before the sand: the pier, the beach rocks, the
 * wreck. Returns the nearest with the material tag its scar and its sound
 * are chosen from. */
function nearestSolidHit() {
  let best = null;
  const test = (obj, surface) => {
    if (!obj) return;
    const h = digRay.intersectObject(obj, true)
      .find((x) => x.object.name !== 'hitProxy' && x.object.visible);
    if (h && (!best || h.distance < best.distance)) { best = h; best.surface = surface; }
  };
  test(dock, 'wood');
  test(rockGroup, 'rock');
  test(shipwreck, 'rock');
  return best;
}
/* The mark it leaves. A small dark scar laid flat on the face you struck,
 * offset a hair along its normal so it never z-fights, and pooled like the
 * dig holes so a long session cannot grow the scene without bound. A hit
 * that leaves nothing behind reads as a hit that did not land. */
const SCAR_POOL = 24;
const scars = [];
let scarIdx = 0;
const scarTex = (() => {
  const S = 64;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(0,0,0,0.85)');
  gr.addColorStop(0.55, 'rgba(0,0,0,0.42)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  // a few gouges through it, so it reads as a blade rather than a smudge
  g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    g.lineWidth = 1 + Math.random() * 2.5;
    const a = Math.random() * Math.PI, r = 10 + Math.random() * 16;
    g.beginPath();
    g.moveTo(S / 2 - Math.cos(a) * r, S / 2 - Math.sin(a) * r);
    g.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r);
    g.stroke();
  }
  return retroTex(new THREE.CanvasTexture(c), { repeatWrap: false });
})();
const _scarN = new THREE.Vector3();
function stampScar(hit, surface) {
  let m = scars[scarIdx];
  if (!m) {
    m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: scarTex, transparent: true, depthWrite: false, opacity: 0.75, fog: true,
    }));
    scene.add(m);
    scars[scarIdx] = m;
  }
  scarIdx = (scarIdx + 1) % SCAR_POOL;
  const n = hit.face
    ? _scarN.copy(hit.face.normal).transformDirection(hit.object.matrixWorld)
    : _scarN.set(0, 1, 0);
  m.position.copy(hit.point).addScaledVector(n, 0.012);
  m.lookAt(m.position.clone().add(n));
  m.scale.setScalar(0.22 + Math.random() * 0.14);
  m.rotation.z = Math.random() * Math.PI * 2;
  m.material.opacity = surface === 'wood' ? 0.7 : 0.5;
  m.visible = true;
}

/* Connecting. The difference between "the animation played" and "I hit
 * that": the view punches in a few degrees and eases back, the camera takes
 * a real knock, the blade jars, and the thing you struck goes white for the
 * frozen frames. Sand gets none of this; sand is not a hit. */
let fovKick = 0;
function hitConnect(P, k) {
  fovKick = Math.max(fovKick, (3.2 + P * 3.4) * k);
  addTrauma((0.18 + P * 0.24) * k);
  vmImpulse(-(0.9 + P * 0.6) * k);
  hitstop = Math.max(hitstop, 0.03 * k);
  sfxConnect(P, k);
}
const _flashing = [];
function flashMats(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.emissive) return;
    const m = o.material;
    if (_flashing.some((f) => f.m === m)) return;
    _flashing.push({ m, hex: m.emissive.getHex(), t: 0.075 });
    m.emissive.setHex(0xdde4f0);
  });
}
function updateFlashes(dt) {
  for (let i = _flashing.length - 1; i >= 0; i--) {
    const f = _flashing[i];
    f.t -= dt;
    if (f.t <= 0) { f.m.emissive.setHex(f.hex); _flashing.splice(i, 1); }
  }
  fovKick = Math.max(0, fovKick - dt * 26);
}

let vmSway = 0;
// Easing. Nothing the player looks at should move on a straight line —
// the swing was linear on every segment before, which is exactly what makes
// an animation read as placeholder.
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

/* The dig, cut to attack frame data at 60 fps over DIG_DUR (~48 frames):
 *   anticipation  0.00–0.34   16f   hauls up and hangs at the top
 *   strike        0.34–0.46    6f   drops fast, accelerating in
 *   impact        0.46
 *   recovery      0.46–1.00   26f   eases back, overshooting once
 * A charged swing enters at 0.34 and plays only the last two — anticipation
 * is the wind-up, and it has already happened in your hands.
 *
 * The blade swings through an arc rather than pitching on the spot, and the
 * poses are pushed past what the geometry strictly needs so they still read
 * at a glance. */
const DIG_WINDUP = 0.34, DIG_STRIKE = 0.46;
let vmLagX = 0, vmLagY = 0, vmPrevYaw = 0, vmPrevPitch = 0;
let vmSpringY = 0, vmSpringV = 0;
const _vmEuler = new THREE.Euler(0, 0, 0, 'YXZ');
function vmImpulse(v) { vmSpringV += v; }          // landings, jumps, impacts

/* Put the lip of the blade on the landing point. The rig is posed first, the
 * lip's position read back, and the arm translated by the gap between it
 * and where the point projects at the lip's own depth — so the correction
 * is measured off the uncorrected pose every frame and never feeds back.
 * The weight follows the strike's own easing in, so the blade sweeps onto
 * the mark rather than snapping to it, holds through the impact and the
 * hitstop, and eases off in the recovery. It is clamped to the frame: a
 * point below your feet takes the blade to the bottom edge, not off it. */
const LAND_HOLD = 0.18, LAND_RELEASE = 0.26;
const _lipA = new THREE.Vector3(), _lipB = new THREE.Vector3(), _landV = new THREE.Vector3();
let landK = 0;
function landBlade() {
  landK = 0;
  if (digT <= 0 || !shovelVM.visible) return;
  const p = digT;
  if (p < DIG_WINDUP) return;
  if (p < DIG_STRIKE) landK = easeInCubic((p - DIG_WINDUP) / (DIG_STRIKE - DIG_WINDUP));
  else if (p < DIG_STRIKE + LAND_HOLD) landK = 1;
  else landK = 1 - easeInOutCubic(Math.min(1, (p - DIG_STRIKE - LAND_HOLD) / LAND_RELEASE));
  if (landK <= 0) return;
  _landNdc.copy(landPoint()).project(camera);
  if (_landNdc.z > 1) return;             // behind you: leave the pose alone
  _landNdc.x = THREE.MathUtils.clamp(_landNdc.x, -0.90, 0.95);
  _landNdc.y = THREE.MathUtils.clamp(_landNdc.y, -0.78, 0.72);
  armRig.updateMatrixWorld(true);
  trailTip.getWorldPosition(_lipA); trailRoot.getWorldPosition(_lipB);
  _lipA.lerp(_lipB, 0.5);                 // the middle of the cutting edge
  const depth = Math.min(_lipA.z, -0.30);
  _landV.set(_landNdc.x, _landNdc.y, 0.5).unproject(vmCamera);
  _landV.multiplyScalar(depth / _landV.z);  // the point's ray at the lip's depth
  _landV.sub(_lipA);
  if (_landV.length() > 1.2) _landV.setLength(1.2);
  armRig.position.addScaledVector(_landV, landK);
}

function updateViewmodel(dt) {
  // your hands are out of it while someone is talking to you, or while you
  // are turning something over — both are close-up shots of something else
  const show = !!equipped && !held && !dialogOpen && !inspecting;
  viewmodel.visible = show;
  if (!show) { winding = false; windT = 0; updateTrail(dt, false); return; }
  if (winding) {
    if (frozen()) { winding = false; windT = 0; }
    else {
      windT = Math.min(WIND_FULL * 1.35, windT + dt);
      /* A charge with no full mark is a charge you hold too long every time.
       * One cue at the top — a creak of strain, and the tremble that was
       * already there gets a good deal harder — and after that you know the
       * shape of it by feel. */
      if (!windFull && windT >= WIND_FULL) { windFull = true; sfxWindFull(); }
    }
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

  if (winding) {
    /* The haul-back. Rises fast and then creeps, so a full charge still feels
     * like it's straining rather than sitting at a pose, and the shoulders
     * shake a little once it's wound past full. */
    const e = easeOutCubic(windCharge);
    const strain = windFull ? Math.sin(windT * 38) * 0.026 : 0;
    /* LATCHED, not sampled at the release. Which swing this is gets decided
     * while you wind it — that is when you can see it — and reading the key
     * again on the way out meant letting go of sprint a frame early turned
     * an overhead back into a side swing. */
    if (overheadHeld()) windOverhead = true;
    if (windOverhead) {
      // hauled up over the head, and shaking harder the longer it is held
      _pose[0] = -(0.70 + 1.60 * e) + strain * 1.6;
      _pose[1] = 0.10 + 0.30 * e;
      _pose[2] = -0.06 + 0.50 * e;
      _pose[3] = -0.06 + 0.08 * e + strain;
      _pose[4] = 0.05 + 0.10 * e;
    } else {
      _pose[0] = -(0.62 + 1.42 * e) + strain;
      _pose[1] = 0.11 + 0.22 * e;
      _pose[2] = -(0.24 + 0.48 * e);
      _pose[3] = -(0.16 + 0.30 * e) + strain;
      _pose[4] = 0.05 + 0.12 * e;
    }
  } else if (digT > 0) {
    const P = digPower;
    /* A heavy is slower through the whole move, and slower still to recover —
     * the commitment after the blade lands is most of what makes it read as
     * weight rather than as a faster shovel. */
    /* A click is quick: the whole light swing is 0.44 s and the blade is
     * down 200 ms after the press. A heavy is nearly three times that. */
    digT += dt / (DIG_DUR * (0.55 + P));
    const p = digT;
    if (p < DIG_WINDUP) {
      // anticipation: quick out of rest, hanging at the top of the haul
      poseMix(_pose, REST_POSE, _poseA, easeOutCubic(p / DIG_WINDUP));
    } else if (p < DIG_STRIKE) {
      /* The strike. easeInCubic starts almost stationary and ends at full
       * speed, so the blade hangs for a beat and then falls — and because
       * _poseA is wherever the swing actually began, a charged release picks
       * up from the wound pose with nothing to snap through. */
      poseMix(_pose, _poseA, _poseB, easeInCubic((p - DIG_WINDUP) / (DIG_STRIKE - DIG_WINDUP)));
    } else {
      // recovery: eases back to rest, overshooting once on the way
      poseMix(_pose, _poseB, REST_POSE, easeOutBack(Math.min(1, (p - DIG_STRIKE) / (1 - DIG_STRIKE))));
    }
    if (!digImpacted && p >= DIG_STRIKE) {
      digImpacted = true;
      digImpact();
      /* The jar in your hands. This used to be -1.7 to -3.6, which slammed
       * the spring into its own ±0.14 clamp on the very next frame — a hard
       * step, and it read as the animation stuttering on the hit rather than
       * as an impact. The spring's peak is roughly v0/sqrt(stiffness), so
       * anything under ~1.5 stays inside the clamp and stays a curve. */
      vmImpulse(-0.95 - P * 0.5 - (digOverhead ? 0.35 : 0));
      // the whole body goes into an overhead, so it kicks back harder
      if (digOverhead) { addTrauma(0.16 + P * 0.2); fovKick = Math.max(fovKick, 4 + P * 3); }
    }
    if (p >= 1) { digT = 0; digPower = 0; digCharged = false; digOverhead = false; }
  } else {
    for (let i = 0; i < 5; i++) _pose[i] = 0;
  }

  // the guard goes up fast and comes down slower — you commit to raising it
  blockT = THREE.MathUtils.clamp(blockT + (blocking ? dt / 0.10 : -dt / 0.22), 0, 1);
  const blk = easeOutCubic(blockT);
  listenT = THREE.MathUtils.clamp(listenT + (listening ? dt / 0.55 : -dt / 0.45), 0, 1);
  const ear = easeOutCubic(listenT), lagK = 1 - ear * 0.85;
  const earH = Math.tan((vmCamera.fov * Math.PI) / 360) * -EAR_AT.z;
  const earX = earH * vmCamera.aspect * EAR_AT.x, earY = earH * EAR_AT.y;
  // a parry rings the tool: a short hard shudder that decays out
  const ring = parryGlow > 0 ? Math.sin(parryGlow * 62) * parryGlow * 0.10 : 0;
  const bH = Math.tan((vmCamera.fov * Math.PI) / 360) * -BLOCK_AT.z;
  const blkX = bH * vmCamera.aspect * BLOCK_AT.x, blkY = bH * BLOCK_AT.y;
  armRig.rotation.x = ARM_ROT_X + _pose[0] + vmLagX * lagK + ear * EAR_POSE[0] + blk * BLOCK_POSE[0] + ring;
  armRig.rotation.y = -0.45 + _pose[2] + vmLagY * lagK + ear * EAR_POSE[2] + blk * BLOCK_POSE[2];
  armRig.rotation.z = 0.10 + _pose[3] + vmLagY * 0.45 * lagK + ear * EAR_POSE[3] + blk * BLOCK_POSE[3] - ring;
  armRig.position.set(
    ARM_BASE.x + bx + vmLagY * 0.16 + ear * (earX - ARM_BASE.x) + blk * (blkX - ARM_BASE.x),
    ARM_BASE.y + by + _pose[1] + vmSpringY + ear * (earY - ARM_BASE.y) + blk * (blkY - ARM_BASE.y),
    ARM_BASE.z + _pose[4] + ear * (EAR_AT.z - ARM_BASE.z) + blk * (BLOCK_AT.z - ARM_BASE.z)
  );
  landBlade();

  /* Turn the tool over for an overhead, and back afterwards. Blended rather
   * than snapped, so the change of grip happens while the shovel is going up
   * and is finished by the time it comes down. */
  const wantOh = (winding && windOverhead) || (digT > 0 && digOverhead) ? 1 : 0;
  ohBlend += (wantOh - ohBlend) * Math.min(1, dt * 9);
  if (ohBlend > 0.001 || wantOh) {
    shovelVM.rotation.set(
      VM_REST_ROT[0] + (VM_OVERHEAD_ROT[0] - VM_REST_ROT[0]) * ohBlend,
      VM_REST_ROT[1] + (VM_OVERHEAD_ROT[1] - VM_REST_ROT[1]) * ohBlend,
      VM_REST_ROT[2] + (VM_OVERHEAD_ROT[2] - VM_REST_ROT[2]) * ohBlend);
  }

  // Only the strike and a beat past it leave a trail; a trail on the wind-up
  // would say the tool was moving fast when it is deliberately barely moving.
  trailPower = digPower;
  updateTrail(dt, shovelVM.visible && digT >= DIG_WINDUP - 0.02 && digT < DIG_STRIKE + 0.13);
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
    else toggleEquip(crabItem);
  },
};
holdable(crabItem, hcrab, { scale: 0.5, pos: [0, -0.06, 0.02], rot: [0.5, 0.6, 0.1] });
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
    else toggleEquip(syringeItem);
  },
};
holdable(syringeItem, syringe, { scale: 1.25, pos: [0, -0.03, 0], rot: [0.2, 0.5, 0.9] });
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
  const jarName = inspectEl.querySelector('.iname');
  if (jarName) { jarName.textContent = 'Jar of blue blood'; jarName.style.display = ''; }
  inspectEl.querySelector('.hint').textContent =
    'Hold right-click to turn it · click to put it away';
}

// ------------------------------------------------------------------
// Buried caches — rare little sand mounds along the walk. Dig one open
// with the shovel and it turns up a (placeholder) buried object.
// ------------------------------------------------------------------
/* A CACHE HAS TO LOOK LIKE SOMETHING YOU WOULD PUT A SHOVEL INTO. It was
 * `0x74809a` — the beach's own cold blue-grey — so a mound read as one more
 * grey lump on a grey beach and nobody dug it. Dry heaped sand is warmer
 * than the flat it stands on: tan, matte, with a little lift so it catches
 * the moon and separates from the wet blue around it. The pebbles pressed
 * into it go warm with it, or they read as gravel. */
/* SPOIL, NOT A BUMP. A cache used to be a smooth half-sphere in one flat
 * colour, and at 0xb2a079 it was a bright tan pebble sitting on a blue
 * beach — the "horrible" of it was that it read as painted-on plastic. A
 * real molehill is loose CLODS: damp earth turned up out of the hole in
 * lumps, dark and matte, crumbling out to a scatter of smaller lumps at
 * the foot, with no clean edge anywhere. So the dome is displaced per
 * vertex into lumps and flat-shaded (every facet catches the moon
 * differently, which is most of what makes it read as loose), the colour
 * is earth rather than sand, and the rim is broken by clods lying round
 * it rather than by a circle drawn on the beach. */
/* It wears THE BEACH'S OWN GRAIN. Flat colour on a lumpy dome read as
 * moulded plastic however the tint was chosen — the thing that ties it to
 * the sand it came out of is the same texture the sand has, cloned so it
 * can carry its own repeat (the beach's is set to tile over eight hundred
 * metres, which on a one-metre heap is a smear). Warmer and lighter than
 * the flat around it, because it is dry sand turned up from under the wet. */
const moundTex = sandTex.clone(); moundTex.needsUpdate = true; moundTex.repeat.set(2.6, 2.6);
const moundBump = sandBump.clone(); moundBump.needsUpdate = true; moundBump.repeat.set(2.6, 2.6);
const moundMat = new THREE.MeshStandardMaterial({
  map: moundTex, bumpMap: moundBump, bumpScale: 2.2,
  // the map MULTIPLIES, and the beach's grain is dark, so the body has to
  // be lifted well past the tint you actually want or it comes out olive
  color: 0xdfc79b, roughness: 1, metalness: 0, flatShading: true,
  emissive: 0x4a4029, emissiveMap: moundTex,
});
const clodMat = new THREE.MeshStandardMaterial({
  map: moundTex, bumpMap: moundBump, bumpScale: 1.6,
  color: 0xcbb489, roughness: 1, flatShading: true, emissive: 0x3d3422, emissiveMap: moundTex,
});
const clodMatDk = new THREE.MeshStandardMaterial({
  map: moundTex, bumpMap: moundBump, bumpScale: 1.6,
  color: 0xb09b75, roughness: 1, flatShading: true, emissive: 0x2e281a, emissiveMap: moundTex,
});
function lumpyDome(r, hy, seed) {
  const g = new THREE.SphereGeometry(r, 11, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
  g.scale(1, hy, 1);
  const p = g.attributes.position;
  let n = seed;
  const rnd = () => (n = (n * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = Math.hypot(x, z) / r;
    if (y < 0.004) continue;                       // leave the rim on the sand
    const k = 1 + (rnd() - 0.5) * 0.34 * (1 - d * 0.4);
    p.setXYZ(i, x * k, y * (1 + (rnd() - 0.5) * 0.5), z * k);
  }
  g.computeVertexNormals();
  return g;
}
function makeMound() {
  const g = new THREE.Group();
  // two heaps of different size, overlapping — one dome is a bump, two is a pile
  const dome = new THREE.Mesh(lumpyDome(0.5, 0.34, 1 + ((Math.random() * 1e6) | 0)), moundMat);
  dome.rotation.y = Math.random() * Math.PI;
  g.add(dome);
  const lobe = new THREE.Mesh(lumpyDome(0.3, 0.38, 1 + ((Math.random() * 1e6) | 0)), moundMat);
  lobe.position.set((Math.random() - 0.5) * 0.34, 0, (Math.random() - 0.5) * 0.34);
  lobe.rotation.y = Math.random() * Math.PI;
  g.add(lobe);
  /* The clods. They are what stops the heap having an edge: a dozen lumps
   * of the same earth lying where they rolled, thinning outward, so the
   * pile crumbles into the beach instead of ending on a line. */
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.28 + Math.pow(Math.random(), 1.6) * 0.42;
    const sz = 0.018 + Math.random() * 0.042 * (1 - (r - 0.28) / 0.42);
    const cl = new THREE.Mesh(new THREE.DodecahedronGeometry(sz, 0),
      Math.random() < 0.4 ? clodMatDk : clodMat);
    cl.position.set(Math.cos(a) * r, sz * 0.45, Math.sin(a) * r);
    cl.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    cl.scale.y = 0.6 + Math.random() * 0.3;
    g.add(cl);
  }
  return g;
}
function makeBuriedObject() {
  // PLACEHOLDER — used for the 2nd buried cache onward, swap later
  const g = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0x9c7b3f, roughness: 0.6, metalness: 0.35, flatShading: true, emissive: 0x2c2110 });
  const wrap = new THREE.MeshStandardMaterial({ color: 0x6f6552, roughness: 1, flatShading: true, emissive: 0x1c1a14 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.18, 0.20), brass);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.285, 0.195, 0.05), wrap);
  g.add(box, band);
  return g;
}

// The glowstick — first thing you dig up. A short cracked light-stick
// burning a cold teal, throwing a small glow pool on the sand.
const GLOWSTICK_COLOR = 0x2fe9cf;   // cold teal, matched to the reference
const GLOWSTICK_LEN = 0.24;         // big enough to read on the sand
const GLOWSTICK_RADIUS = 0.022;
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
const HELD_GLOW_MAX = 17;             // dimmer in the hand: it lights your way, it is not a torch
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
  inspectModel: makeGlowstick(),
  use: () => toggleEquip(glowstickItem),
};

const mounds = [];
{
  // spread them thinly from just past the spawn down to near the lighthouse
  let z = -28;
  while (z > END_Z + 40) {
    /* Well up the dry beach. shoreLine() can reach x = 8.6 and the sand
     * plane discards a further metre seaward of it, so anything below ~9.6
     * spends part of the tide with the surf drawn over it — a mound you
     * cannot see is a mound you never dig. Same number the body bag uses. */
    const x = 9.8 + Math.random() * (CLIFF_BLOCK_X - 11.4);
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

  const first = m === mounds[0];               // THE first mound, not the first you happen to dig
  const second = m === mounds[1];              // and the second one has the CD in it
  const relic = first ? makeGlowstick() : (second ? makeCdCase() : makeBuriedObject());
  relic.position.set(m.x, first ? 0.055 : (second ? 0.052 : 0.09), m.z);
  /* The CD is STOOD UP in the sand, not laid flat. Face up it is a
   * hand-sized rectangle seen edge-on from standing height and it read as a
   * sliver; leaning back out of the hole the cover faces you and catches
   * the moon. */
  relic.rotation.set(
    first ? 0 : (second ? -0.62 : (Math.random() - 0.5) * 0.5),
    second ? Math.PI * 0.12 : Math.random() * Math.PI * 2,
    first ? 0 : (second ? -0.16 : (Math.random() - 0.5) * 0.4));
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  proxy.name = 'hitProxy'; relic.add(proxy);
  scene.add(relic);
  /* AND YOU HAVE TO SEE IT COME OUT. The glowstick lights itself, so it was
   * obvious; everything else was a dark object dropped on a dark beach at
   * the moment the screen was full of flying sand, and it went straight
   * past people. Everything a mound gives up now carries the same shine
   * every other takeable does, at a good size, so there is something
   * standing where you dug once the sand settles. */
  if (!first) addItemShine(relic, { size: 0.85, height: 0.16, strength: 1.5 });
  if (first) { relic.updateMatrixWorld(true); placeGroundGlow(relic); }
  addInteractable(relic, first ? 'Take the glowstick' : (second ? 'Take the CD' : 'Take the buried object'), 'inventory', {
    onActivate: () => {
      if (first) sfxGlassPick(); else sfxThud(0.04);
      scene.remove(relic);
      if (first) placeGroundGlow(null);       // the held light takes over
      hovered = null;
      if (first) { addToInventory(glowstickItem); toggleEquip(glowstickItem); }
      else if (second) { addToInventory(cdItem); }
      else {
        const buried = { name: 'Buried object', icon: '📦' };
        buried.use = () => toggleEquip(buried);
        holdable(buried, makeBuriedObject(), { scale: 0.9, pos: [0, -0.03, 0], rot: [0.3, 0.6, 0.2] });
        addToInventory(buried);
      }
    },
  });
}

/* "New Cd" — what the second mound has been keeping. The case is modelled
 * to the real thing; the sleeve is painted in models/cd-case.js rather than
 * copied off the album, which is somebody else's drawing. */
const cdItem = { name: 'New Cd', icon: makeCdCaseIcon() };
cdItem.use = () => toggleEquip(cdItem);
holdable(cdItem, makeCdCase(), { scale: 1.15, pos: [0.02, -0.05, 0.02], rot: [0.22, -0.5, 0.12] });

// ------------------------------------------------------------------
// Shells you can pick up. Hold one to your ear and there's something
// under the sea-roar that isn't the sea.
// ------------------------------------------------------------------
function makeShellIcon() {
  // a conch, in the scan's own colours: the spire, the body whorl, the lip
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#d9c5a8';
  g.beginPath(); g.ellipse(26, 28, 15, 11, -0.55, 0, Math.PI * 2); g.fill();     // body whorl
  g.beginPath(); g.moveTo(14, 20); g.lineTo(9, 7); g.lineTo(24, 16); g.closePath(); g.fill();  // spire
  g.fillStyle = '#b9987a';
  g.beginPath(); g.ellipse(30, 32, 9, 5.5, -0.55, 0, Math.PI * 2); g.fill();      // the mouth
  g.fillStyle = '#5c4636';
  g.beginPath(); g.ellipse(31, 33, 5, 2.6, -0.55, 0, Math.PI * 2); g.fill();      // and the dark inside it
  g.strokeStyle = '#a88a6c'; g.lineWidth = 1.1;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(13 + i * 4, 18 - i * 3); g.lineTo(24 + i * 3, 24 - i * 2); g.stroke(); }
  return c.toDataURL();
}
const SHELL_ICON = makeShellIcon();
const shells = [];
/* The shells are a scan — blenderboom's "Sea shell", assets/shell.glb: 13k
 * triangles with its own colour, roughness and normal maps, and 11 cm long
 * at true size. On this renderer that is a smudge, so they lie on the wrack
 * line at two to three times life — big conches, pale on the dark sand — and
 * the same geometry goes into your hand. The scan loads async, so the whole
 * placement, interactables included, runs in the callback; everything it
 * needs is declared by the time a network round trip has happened. */
let shellKind = null;                        // { geo, mat } once the scan lands
new GLTFLoader().load('assets/shell.glb', (gltf) => {
  gltf.scene.updateMatrixWorld(true);
  let geo = null, mat = null;
  gltf.scene.traverse((o) => {
    if (o.isMesh && !geo) { geo = o.geometry.clone().applyMatrix4(o.matrixWorld); mat = o.material; }
  });
  if (!geo) return;
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);    // base on y = 0
  geo.computeBoundingSphere();
  // daylight-baked albedo, lifted for a night beach the way the rocks are
  mat.emissive.setHex(0x5a5c64);
  mat.emissiveMap = mat.map;
  mat.metalness = 0;
  reexpose(mat, 0.6);
  shellKind = { geo, mat };

  const rnd = mulberry32(742);
  let z = -12;
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, mat));
    const sc = 2.0 + rnd() * 0.9;                                           // 22–32 cm
    g.scale.setScalar(sc);
    // on the dry beach, clear of the highest swash: below x ~9.6 the surf
    // draws over the sand under them and they read as shells under water
    g.position.set(9.7 + rnd() * 3.0, 0.004, z);
    g.rotation.set((rnd() - 0.5) * 0.2, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.25);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.name = 'hitProxy'; hit.position.y = 0.025; g.add(hit);
    scene.add(g);
    shells.push(g);
    addInteractable(g, 'Take the shell', 'inventory', {
      onActivate: () => {
        sfxThud(0.02);
        scene.remove(g);
        hovered = null;
        const vm = new THREE.Mesh(geo, mat);
        vm.scale.setScalar(2.4);
        vm.position.set(0, -0.03, 0.0);
        vm.rotation.set(0.5, 0.6, 0.2);
        vm.visible = false;
        toolMount.add(vm);
        const item = {
          id: 'shell', name: 'Sea shell', icon: SHELL_ICON,
          viewmodel: vm,
          inspectModel: new THREE.Mesh(geo, mat),
          inspectOpts: () => ({ rotX: 0.3, rotY: 0.7 }),
          onListen: true,                       // click while holding it
          use: () => toggleEquip(item),
        };
        addToInventory(item);
        toggleEquip(item);                      // it goes straight into your hand
      },
    });
    z -= 22 + rnd() * 46;
  }
});

/* Holding it to your ear. The roar is synthesised — noise through a pair of
 * tight resonant peaks, which is physically what a shell does to room noise —
 * and a voice bed sits underneath it, filtered down until it's only ever
 * almost words. */
let shellVoice = null, listening = false, shellAudio = null;
/* Everything the shell is doing stops HERE, at once, and `toggleEquip()`
 * calls it — put the shell down, switch to the shovel, open the pack, and
 * the roar and the voice are gone on the same frame. It used to run its
 * nine seconds out whatever you did with your hands. */
function stopListening() {
  if (!listening) return;
  listening = false;
  if (shellAudio) {
    try { if (shellAudio.src) shellAudio.src.stop(); } catch (e) {}
    try { shellAudio.out.gain.cancelScheduledValues(0); shellAudio.out.gain.value = 0; shellAudio.out.disconnect(); } catch (e) {}
    clearTimeout(shellAudio.timer);
    shellAudio = null;
  }
  if (shellVoice) { shellVoice.pause(); shellVoice = null; }
  if (promptHTML.includes('ear')) setPrompt('');
}
function listenToShell() {
  const ctx = audioCtx;
  if (!ctx || listening) return;
  listening = true;
  const t = ctx.currentTime, DUR = 11;
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.linearRampToValueAtTime(1, t + 1.4);
  out.gain.setValueAtTime(1, t + DUR - 2.4);
  out.gain.linearRampToValueAtTime(0, t + DUR);
  out.connect(sfxOut());
  const noise = () => { const n = noiseBurst(DUR, () => 1); n.loop = true; n.start(t); n.stop(t + DUR); return n; };

  /* IT HAS TO BE LOUD ENOUGH TO LEAN INTO. The first version was two
   * bandpasses at Q 7.5 and a whisper bed at 0.055 — a filter that narrow
   * throws away nearly all the energy, so holding the shell to your ear got
   * you silence. Wider peaks, four layers, and the whispers up where you can
   * almost make them out. */
  // the cavity: two broad resonances that wander
  for (const [f, g0] of [[430, 0.5], [1020, 0.34]]) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 2.2;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11 + Math.random() * 0.09;
    const lg = ctx.createGain(); lg.gain.value = f * 0.10;
    lfo.connect(lg).connect(bp.frequency); lfo.start(t); lfo.stop(t + DUR);
    const g = ctx.createGain(); g.gain.value = g0;
    noise().connect(bp).connect(g).connect(out);
  }
  // something far down and much bigger than the shell, breathing in and out
  {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 130; lp.Q.value = 0.9;
    const g = ctx.createGain(); g.gain.value = 0.34;
    const br = ctx.createOscillator(); br.frequency.value = 0.13;   // ~8 s a breath
    const brg = ctx.createGain(); brg.gain.value = 0.3;
    br.connect(brg).connect(g.gain); br.start(t); br.stop(t + DUR);
    noise().connect(lp).connect(g).connect(out);
  }
  // and a thin hiss over the top of it all, the shell's own air
  {
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4200;
    const g = ctx.createGain(); g.gain.value = 0.1;
    noise().connect(hp).connect(g).connect(out);
  }
  // a couple of slow swells that rise out of the roar and fall back
  for (let i = 0; i < 3; i++) {
    const at = t + 1.8 + i * 2.9 + Math.random();
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(58 + Math.random() * 26, at);
    o.frequency.linearRampToValueAtTime(38, at + 1.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.16, at + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.9);
    o.connect(g).connect(out); o.start(at); o.stop(at + 2);
  }

  setPrompt('You hold it to your ear&hellip;');
  /* And the thing under it. Not a voice saying a word — filtered down until
   * it is only ever almost words — but loud enough now that you are certain
   * something is down there, and never certain what it said.
   *
   * A fresh Audio element every time, so createMediaElementSource() is only
   * ever called once per element — the trap the gate's whispers hit. */
  shellVoice = new Audio(Math.random() < 0.5 ? 'assets/whisper1.m4a' : 'assets/whisper2.m4a');
  shellVoice.loop = true;
  shellVoice.volume = 1;
  try {
    const vs = ctx.createMediaElementSource(shellVoice);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 190;
    const vg = ctx.createGain(); vg.gain.value = 0.85;      // almost words, not silence
    vs.connect(lp).connect(hp).connect(vg).connect(out);
    shellVoice.play().catch(() => {});
  } catch (e) {}

  shellAudio = { src: null, out, timer: setTimeout(stopListening, DUR * 1000) };
}

// ------------------------------------------------------------------
// The crab — comes out of the surf at you partway down the beach. Small,
// fast, and it takes three nips to put you down. A shovel swing kills it.
// ------------------------------------------------------------------
const CRAB_Z = -20;                    // where it's waiting, well before Bradly
const CRAB_WAKE = 17;                  // it notices you at this range
const CRAB_SPEED = 2.35;
const CRAB_REACH = 1.45;               // how close it gets before it nips
/* Attack frame data, at 60 fps. The nip used to land the same frame the crab
 * came into reach, with the lunge pose playing *after* the damage — nothing
 * to read and nothing to do about it. Now it telegraphs: startup you can see
 * and react to, a short active window, and a long recovery that is your
 * opening to swing back. Being in reach when it starts is not enough — the
 * distance is re-tested on the active frame, so backing off actually works. */
const CRAB_WIND = 0.30;                // 18f startup — rears, claws wide, gaping
const CRAB_STRIKE = 0.10;              //  6f active  — damage on the first frame
const CRAB_RECOVER = 0.34;             // 20f recovery — committed, and punishable
const CRAB_COOLDOWN = 0.85;            // seconds between attacks, after recovery
const CRAB_HIT_STOP = 0.08;            // ~5f of frozen time when the shovel lands
/* IT TAKES TWO. A light swing is a hit, not a kill — the shell holds and it
 * comes back at you — and only a swing wound all the way up puts one down in
 * one. That is the whole reason to hold the button: a heavy is not a faster
 * shovel, it is the difference between two exchanges and none. */
const CRAB_HP = 2;
const CRAB_HEAVY = 0.85;               // charge at or past this and it kills
const CRAB_RECOIL = 0.34;              // how long a survived hit throws it
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

/* The enemy's body is TwilightFox's "Animated Crab rigged FREE" (Sketchfab
 * Standard licence). The procedural rig stays in the file but is switched off
 * once the model lands — all the AI, the submersion and the death still drive
 * the same `crab` group, so only the visual changes.
 *
 * The file ships one 0.48 s clip and no others, so there's no separate idle
 * or attack: the clip's rate is scaled by how fast it's actually moving, and
 * the rear-up and lunge stay as transforms on the group.
 */
/* THE CRABS ARE A LIST. There used to be exactly one, and every part of it
 * was a global — the group, the state, the mixer, the clip map. Three of
 * them come out of the water together before the dock, so all of that moved
 * onto a UNIT and the loner became `crabs[0]`. `crab` / `crabState` still
 * name that first one, because the shovel, the blood counter and the
 * harness all reach for them.
 *
 * Each unit parses its OWN copy of the .glb. A skinned mesh cannot be
 * `clone()`d — the clone shares the skeleton and every copy then walks in
 * lockstep — and SkeletonUtils is not vendored here, so the file is fetched
 * once and `GLTFLoader.parse()` is run per crab off the same buffer. */
const crabs = [];
let crabGlbBuf = null, crabGlbWait = null;
/* One clip per state, and the ATTACK one is driven by the combat clock
 * rather than left to run on its own — see `crabAnim()`. */
function crabPlay(u, name, loop) {
  const a = u.clips[name];
  if (!a || u.cur === a) return a;
  for (const k in u.clips) if (u.clips[k] !== a) u.clips[k].fadeOut(0.12);
  a.reset();
  a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  a.clampWhenFinished = !loop;
  a.fadeIn(0.12).play();
  u.cur = a;
  return a;
}
function dressCrab(u, gltf) {
  const crabModel = u.model = gltf.scene;
  crabModel.traverse((o) => {
    if (!(o.isMesh || o.isSkinnedMesh)) return;
    o.frustumCulled = false;             // a skinned bound box is the bind pose
    const m = o.material;
    if (!m) return;
    /* The scan is lit for daylight and this is a quarter moon, so it goes
     * through the same gamma lift the rocks and the body bag do, with a cold
     * rim so the shell reads against the sand. METALNESS IS A TRAP here —
     * there is no environment map, and a metal has no diffuse term. */
    m.metalness = 0;
    m.emissive = new THREE.Color(0x3a1a0e);
    m.emissiveMap = m.map;
    m.emissiveIntensity = 0.68;
    reexpose(m, 0.52, [0.058, 0.078, 0.115]);   // a cold edge off the shell
    m.needsUpdate = true;
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
  u.ud.rig.visible = false;                   // retire the built one
  u.g.add(crabModel);
  if (gltf.animations && gltf.animations.length) {
    u.mixer = new THREE.AnimationMixer(crabModel);
    for (const clip of gltf.animations) u.clips[clip.name] = u.mixer.clipAction(clip);
    crabPlay(u, 'idle', true);
  }
}
function loadCrabModel(u) {
  const loader = new GLTFLoader();
  if (!crabGlbWait) crabGlbWait = fetch('assets/crab.glb').then((r) => r.arrayBuffer());
  crabGlbWait
    .then((buf) => new Promise((res, rej) => loader.parse(buf.slice(0), '', res, rej)))
    .then((gltf) => dressCrab(u, gltf))
    .catch(() => {});
}

/* WHICH CLIP, AND WHEN. The attack is not left to play at its own rate: its
 * time is written straight from `crabState.atk`, the same clock the damage
 * and the parry window are measured on. That is the whole point — the claw
 * going up IS the tell, and it cannot drift out of step with the frame the
 * blow actually lands on. The stun likewise runs off the stun timer, so a
 * parry leaves it reeling for exactly as long as it is helpless. */
function crabAnim(u, dt, closing, moving) {
  if (!u.mixer) return;
  if (!u.st.alive) {
    crabPlay(u, 'die', false);
  } else if (u.st.stun > 0) {
    const a = crabPlay(u, 'stun', false);
    if (a) { a.paused = true; a.time = clampTime(a, CRAB_STUN - u.st.stun); }
  } else if (u.st.atk >= 0) {
    const a = crabPlay(u, 'attack', false);
    if (a) { a.paused = true; a.time = clampTime(a, u.st.atk); }
  } else if (closing) {
    const a = crabPlay(u, 'walk', true);
    if (a) { a.paused = false; a.timeScale = 0.85 + moving * 0.75; }
  } else {
    const a = crabPlay(u, 'idle', true);
    if (a) { a.paused = false; a.timeScale = 1; }
  }
  u.mixer.update(dt);
}
const clampTime = (a, t) =>
  THREE.MathUtils.clamp(t, 0, a.getClip().duration - 1e-4);

function makeCrabUnit(x, z, opts = {}) {
  const g = makeCrab();
  g.position.set(x, 0, z);
  g.scale.setScalar(opts.scale ?? 1.55);       // big enough to be a real threat
  scene.add(g);
  const u = {
    g, ud: g.userData, model: null, mixer: null, clips: {}, cur: null,
    st: { alive: true, awake: false, atk: -1, cool: 0, scuttle: 0, deadT: 0,
          rear: 0, lunge: 0, struck: false, stun: 0, wakeRipple: 0,
          hp: CRAB_HP, recoil: 0 },
    base: opts.scale ?? 1.55,
    // the throw-back off a blade is per crab: a shared temp put every struck
    // crab on the same spot
    hitFrom: new THREE.Vector3(), hitDir: new THREE.Vector3(), dir: new THREE.Vector3(),
    wake: opts.wake ?? CRAB_WAKE,
    pack: !!opts.pack,
  };
  crabs.push(u);
  loadCrabModel(u);
  return u;
}
const crabUnit = makeCrabUnit(-7.5, CRAB_Z);   // the loner, well out and under
const crab = crabUnit.g, crabState = crabUnit.st;
const _crabDir = new THREE.Vector3();
// the nearest crab that is still alive — what the shovel, a thrown thing and
// the knockback all actually want
function nearestCrab(pos, maxD = Infinity) {
  let best = null, bd = maxD;
  for (const u of crabs) {
    if (!u.st.alive || !u.g.visible) continue;
    const d = Math.hypot(pos.x - u.g.position.x, pos.z - u.g.position.z);
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}

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

function burstCrab(u = crabs[0]) {
  const p = u.g.position, S = u.g.scale.x;
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
    /* WHAT IT LANDS ON IS ASKED EVERY FRAME, not fixed when it was thrown.
     * A crate gib carried `rest = crate.y`, so the deck crate's boards kept
     * deck height wherever they flew — the ones that cleared the edge hung
     * in the air beside the pier. The boards under it are a lookup. */
    const deck = dockDeckAt(g.m.position.x, g.m.position.z);
    /* Half its own thickness, so it lies ON the sand. A board is a flat box
     * up to 0.36 long tumbling on all three axes, and resting its CENTRE on
     * the ground buried a corner of it every time — which is the plank
     * sunk into the beach. Measured once, off the geometry. */
    if (g.half === undefined) {
      g.m.geometry.computeBoundingBox();
      const bb = g.m.geometry.boundingBox;
      g.half = (bb.max.y - bb.min.y) * 0.5 * g.m.scale.y;
    }
    const rest = (deck !== null ? deck + 0.02 : g.rest) + g.half;
    g.m.visible = !coveredByWater(g.m.position.x, g.m.position.y, g.m.position.z);
    if (g.settled) continue;
    g.vel.y -= 15 * dt;
    g.m.position.addScaledVector(g.vel, dt);
    g.m.rotation.x += g.spin.x * dt; g.m.rotation.y += g.spin.y * dt; g.m.rotation.z += g.spin.z * dt;
    if (g.m.position.y <= rest) {
      g.m.position.y = rest;
      if (Math.abs(g.vel.y) > 1.1) {
        g.vel.y = -g.vel.y * 0.28;               // one or two small bounces
        g.vel.x *= 0.6; g.vel.z *= 0.6;
        g.spin.multiplyScalar(0.5);
      } else {
        g.settled = true;
        g.vel.set(0, 0, 0);
        // and it comes to rest FLAT, the way a dropped board does
        g.m.rotation.x = 0; g.m.rotation.z = 0;
        g.m.position.y = rest;
        // only meat bleeds — glass and wood ride this same system and were
        // leaving blood splats under the shards and the splinters
        // and nothing stains water
        if (g.bleed !== false && Math.random() < 0.5 && submersionAt(g.m.position.x, g.m.position.z) < 0.12)
          stampBlood(g.m.position.x, g.m.position.z, 0.3 + Math.random() * 0.35);
      }
    }
  }
  for (let i = bloodDrops.length - 1; i >= 0; i--) {
    const b = bloodDrops[i];
    b.life -= dt;
    b.vel.y -= 17 * dt;
    b.m.position.addScaledVector(b.vel, dt);
    b.m.visible = !coveredByWater(b.m.position.x, b.m.position.y, b.m.position.z);
    if (b.m.position.y <= 0.02 || b.life <= 0) {
      // it lands and soaks in — into sand. Water takes it without a mark.
      if (b.m.position.y <= 0.02 && submersionAt(b.m.position.x, b.m.position.z) < 0.12)
        stampBlood(b.m.position.x, b.m.position.z, 0.16 + Math.random() * 0.3);
      scene.remove(b.m); b.m.geometry.dispose(); bloodDrops.splice(i, 1);
    }
  }
}

/* The killing blow, in two beats. It used to be one: the crab vanished and
 * the gibs appeared on the same frame, which gives the player nothing to
 * connect the swing to. Now the blade lands, time stops for five frames, and
 * for exactly those five frames the crab is still there — folded up under the
 * shovel in a hard squash, thrown back along the swing. THEN it comes apart.
 * The freeze and the squash are the same beat, which is why `struck` ends on
 * `hitstop` rather than on a timer of its own. */
/* A parry is the loudest thing in the game that is not a death: the world
 * stops for a tenth of a second, the tool rings, the crab goes white and
 * folds up, and it stays folded long enough that you cannot possibly miss
 * the opening. Everything here is about making the timing feel worth it. */
const CRAB_STUN = 1.7;
function parryCrab(u = crabs[0]) {
  parryCool = 0;                         // landing one costs you nothing
  u.st.atk = -1;
  u.st.cool = CRAB_COOLDOWN;
  u.st.stun = CRAB_STUN;
  parryGlow = 0.42;
  flashMats(u.g);
  sfxParry();
  playSample('poise', 0.95);             // and the sound of its poise going
  addTrauma(0.5);
  fovKick = Math.max(fovKick, 7);
  vmImpulse(-1.35);
  hitstop = Math.max(hitstop, 0.11);
  // it is thrown back off your blade
  const kx = u.g.position.x - camera.position.x, kz = u.g.position.z - camera.position.z;
  const kd = Math.hypot(kx, kz) || 1;
  u.g.position.x += (kx / kd) * 0.34;
  u.g.position.z += (kz / kd) * 0.34;
  setPrompt('<b>PARRY</b>');
  setTimeout(() => { if (promptHTML.includes('PARRY')) setPrompt(''); }, 700);
}
/* Out of wind: the guard drops and you hear it go. Once per emptying — a
 * gasp on every press while the bar is flat would be a stutter, not a body. */
function gaspOut() {
  blockGasped = true;
  blocking = false;
  sfxGasp();
  setPrompt('<b>OUT OF BREATH</b>');
  setTimeout(() => { if (promptHTML.includes('BREATH')) setPrompt(''); }, 800);
}
function blockCrab(u = crabs[0]) {
  sfxBlock();
  stamina = Math.max(0, stamina - BLOCK_COST);
  if (stamina <= 0.001) { exhausted = true; gaspOut(); }
  flashMats(shovelVM);                   // the tool goes white for the frozen frames
  parryGlow = Math.max(parryGlow, 0.22); // and shudders in your hands
  fovKick = Math.max(fovKick, 3.5);
  addTrauma(0.42);
  vmImpulse(-1.25);
  hitstop = Math.max(hitstop, 0.07);
  setPrompt('<b>BLOCKED</b>');
  setTimeout(() => { if (promptHTML.includes('BLOCKED')) setPrompt(''); }, 520);
  // shoved back, but not hurt
  const kx = camera.position.x - crab.position.x, kz = camera.position.z - crab.position.z;
  const kd = Math.hypot(kx, kz) || 1;
  knockback.set((kx / kd) * 3.0, 0, (kz / kd) * 3.0);
}
const _crabHitFrom = new THREE.Vector3();
function killCrab(u = crabs[0]) {
  if (!u.st.alive || u.st.struck) return;
  u.st.struck = true;
  u.st.atk = -1;
  camera.getWorldDirection(u.hitDir); u.hitDir.y = 0; u.hitDir.normalize();
  u.hitFrom.copy(u.g.position);
  flashMats(u.g);
  sfxCrabHit();
  addTrauma(0.55);
  hitstop = CRAB_HIT_STOP;
}
/* A blow that lands but does not finish it. The shell holds, the attack is
 * broken, and it is thrown back off the blade white — so a light hit still
 * reads as a hit, and still buys you the room a hit should buy. */
function hurtCrab(u, dmg, P = 0) {
  if (!u.st.alive || u.st.struck) return false;
  u.st.hp -= dmg;
  if (u.st.hp <= 0) { killCrab(u); return true; }
  u.st.atk = -1;
  u.st.cool = Math.max(u.st.cool, 0.55);
  u.st.recoil = CRAB_RECOIL;
  camera.getWorldDirection(u.hitDir); u.hitDir.y = 0; u.hitDir.normalize();
  u.hitFrom.copy(u.g.position);
  flashMats(u.g);
  sfxCrabHit();
  addTrauma(0.28 + P * 0.18);
  return false;
}
function finishCrab(u = crabs[0]) {
  u.st.alive = false;
  u.st.struck = false;
  u.st.deadT = 0;
  u.g.visible = false;                         // it comes apart instead
  burstCrab(u);
  sfxCrabDie(false);
  addTrauma(0.45);                             // the second half of the hit
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

/* One crab's frame. Everything in here used to read the globals; it takes a
 * unit now so the pack can run the same brain three times over. */
function updateCrabUnit(u, dt) {
  const ud = u.ud;
  if (!u.st.alive) { if (u.mixer) u.mixer.update(0); return; }
  /* Impact frames. Held for the length of the hitstop and no longer, so the
   * squash you are looking at is the reason the world has stopped. It is
   * driven off `hitstop` and not off dt, because dt is what hitstop scales. */
  if (u.st.struck) {
    const e = 1 - THREE.MathUtils.clamp(hitstop / CRAB_HIT_STOP, 0, 1);
    ud.rig.scale.set(1 + 0.34 * (1 - e), 1 - 0.42 * (1 - e), 1 + 0.34 * (1 - e));
    ud.rig.rotation.x = 0.55 * (1 - e);
    ud.rig.rotation.z = 0.22 * (1 - e);
    // thrown off the blade. Placed from the hold's own progress, not moved by
    // dt — dt is 8 % of real time in here and it went eight millimetres.
    u.g.position.copy(u.hitFrom).addScaledVector(u.hitDir, 0.34 * e);
    if (hitstop <= 0) finishCrab(u);
    return;
  }
  if (frozen()) return;

  const dx = camera.position.x - u.g.position.x;
  const dz = camera.position.z - u.g.position.z;
  const dist = Math.hypot(dx, dz);
  if (!u.st.awake) {
    // stays under until it comes for you
    u.g.visible = submersionAt(u.g.position.x, u.g.position.z) < 0.92;
    if (dist > u.wake) return;
    u.st.awake = true;
    u.st.rear = 1;                       // it rears up as it notices you
    sfxCrabWake();
  }

  u.st.rear = Math.max(0, (u.st.rear || 0) - dt * 1.2);
  /* Stunned. It stops dead — no attack, no advance — and hangs there low and
   * splayed with its claws down, shuddering. The pose has to read as OPEN
   * from across the beach, because the whole point of a parry is the window
   * it buys you. */
  if (u.st.stun > 0) {
    u.st.stun -= dt;
    const q = u.st.stun;
    const shake = Math.sin(q * 47) * Math.min(0.05, q * 0.06);
    ud.rig.rotation.set(0.34, shake * 2.2, shake);
    ud.rig.position.y = -0.05;
    ud.rig.scale.set(1.08, 0.86, 1.08);
    for (const c of ud.claws) {
      c.shoulder.rotation.set(0.55, c.side * 0.5, 0);
      c.fore.rotation.x = 0.6;
      c.jaw.rotation.x = -0.05;
    }
    for (let i = 0; i < ud.eyes.length; i++) { ud.eyes[i].rotation.x = 0.45; ud.eyes[i].rotation.z = 0; }
    u.st.scuttle += dt * 0.6;
    crabAnim(u, dt, false, 0);              // the reel, run off the stun timer
    if (u.st.stun <= 0) { u.st.stun = 0; u.st.cool = 0.35; }
    return;
  }
  /* Reeling from a hit it survived. It does not advance and it does not
   * swing; the squash goes on the GROUP, because `ud.rig` is switched off
   * the moment the model lands and nothing posed on it can be seen. */
  if (u.st.recoil > 0) {
    u.st.recoil = Math.max(0, u.st.recoil - dt);
    const k = u.st.recoil / CRAB_RECOIL;
    u.g.position.copy(u.hitFrom).addScaledVector(u.hitDir, 0.5 * (1 - k));
    u.g.position.y = restYInWater(u.g.position.x, u.g.position.z, 1.15);
    u.g.scale.set(u.base * (1 + 0.18 * k), u.base * (1 - 0.22 * k), u.base * (1 + 0.18 * k));
    u.st.scuttle += dt * 1.4;
    crabAnim(u, dt, false, 0);
    if (u.st.recoil <= 0) u.g.scale.setScalar(u.base);
    return;
  }
  const closing = dist > CRAB_REACH;

  // ---- the attack cycle -------------------------------------------
  let atkRear = 0, atkLunge = 0, atkSquash = 0, atkTwist = 0, atkSweep = 0;
  if (u.st.atk >= 0) {
    const was = u.st.atk;
    u.st.atk += dt;
    const t = u.st.atk;
    if (was < CRAB_WIND && t >= CRAB_WIND) {
      sfxCrabSnip();
      /* Re-tested here, not when the wind-up began: the tell is only fair if
       * getting out of the way is a thing that works. Three outcomes now —
       * you were not guarding and it hurts; the guard was already up and it
       * does nothing; or the guard went up INTO it and the thing that swung
       * is left standing there stunned. */
      if (dist < CRAB_REACH + 0.4) {
        if (blocking) {
          const dtp = (performance.now() - blockStart) / 1000;
          if (dtp <= PARRY_WINDOW && parryCool <= 0) parryCrab(u);
          else blockCrab(u);
        } else damagePlayer(1);
      }
    }
    /* It is a SWING now, not a shove. The old attack rose and lunged
     * straight down the line at you, which from the front is a shape barely
     * changing size — there is nothing to read and nothing to time against.
     * Now the whole body cocks away from the blow first, one claw drawn back
     * across itself, and then everything comes through together on an arc:
     * anticipation opposite the action, which is the only thing that makes a
     * strike legible early enough to answer. `atkTwist` is that rotation and
     * `atkSweep` is where the lead claw is through it. */
    if (t < CRAB_WIND) {
      const e = easeOutCubic(t / CRAB_WIND);
      atkRear = e; atkSquash = e;
      atkTwist = -e;                      // cocked away, winding up
      atkSweep = -e;
    } else if (t < CRAB_WIND + CRAB_STRIKE) {
      // through the blow, fast, and past it: the follow-through overshoots
      const e = easeOutCubic((t - CRAB_WIND) / CRAB_STRIKE);
      atkRear = 1 - e; atkLunge = e; atkSquash = -0.4 * e;
      atkTwist = -1 + e * 2.15;
      atkSweep = -1 + e * 2.3;
    } else {
      // recovery: it has to haul itself back round, and it is open for all
      // of it — this is the punish window a swing owes you
      const e = easeInOutCubic((t - CRAB_WIND - CRAB_STRIKE) / CRAB_RECOVER);
      atkLunge = 1 - e; atkSquash = -0.4 * (1 - e);
      atkTwist = 1.15 * (1 - e);
      atkSweep = 1.3 * (1 - e);
    }
    if (t >= CRAB_WIND + CRAB_STRIKE + CRAB_RECOVER) {
      u.st.atk = -1;
      u.st.cool = CRAB_COOLDOWN;
    }
  } else {
    u.st.cool = Math.max(0, (u.st.cool || 0) - dt);
    if (!closing && u.st.cool <= 0) { u.st.atk = 0; sfxCrabTell(); }
  }
  u.st.lunge = atkLunge;
  // it is sand, and the crab is a wall of shell coming through at a run
  if (!castleBroken) {
    const cc = rockColliders.find((k) => k.castle);
    if (cc && Math.hypot(u.g.position.x - cc.x, u.g.position.z - cc.z) < cc.r + 0.35) {
      breakCastle(u.g.position.x, u.g.position.z);
    }
  }
  if (closing) {
    u.dir.set(dx / dist, 0, dz / dist);
    // it slows as it comes into range rather than sliding to a dead stop
    const speed = CRAB_SPEED * THREE.MathUtils.clamp((dist - CRAB_REACH) / 1.2, 0.35, 1);
    u.g.position.addScaledVector(u.dir, speed * dt);
    u.st.scuttle += dt * speed * 5.2;
    // it comes at you head on now, claws first: the model's front is -Z
    u.g.rotation.y = Math.atan2(u.dir.x, u.dir.z) + Math.PI;
    if (inWater(u.g.position.x, u.g.position.z) && Math.random() < dt * 4) {
      spawnSplash(u.g.position.x, u.g.position.z, 2, u.dir.x, u.dir.z, 0.4);
      // ...and only when it is close enough for you to hear it. sfxSplash is
      // not positional, so a crab wading a couple of hundred metres back up
      // the beach was audible at full volume for the whole walk.
      if (Math.random() < 0.25 && u.g.position.distanceTo(camera.position) < 14) sfxSplash(0.35);
      addRipple(u.g.position.x, u.g.position.z, 0.55);
    }
  } else {
    u.st.scuttle += dt * 2.2;            // shifting its weight, waiting
  }

  // ---- gait -------------------------------------------------------
  const reach = closing ? 1 : 0.25;
  crabAnim(u, dt, closing, closing ? 1 : 0);
  const cyc = u.st.scuttle / (Math.PI * 2);
  for (const leg of ud.legs) {
    // half a cycle between the two sets, then a visible ripple along each set
    poseLeg(leg, (cyc + leg.group * 0.5 + leg.idx * 0.11) % 1, reach);
  }
  // the body rocks with the tripod and rides a little higher when roused
  const rear = Math.max(u.st.rear, atkRear);
  const lunge = u.st.lunge;
  /* Squash and stretch, roughly holding volume: it compresses and spreads as
   * it winds, and draws up tall and narrow as it throws itself at you. This
   * is most of why the strike reads as force rather than as a rotation. */
  ud.rig.scale.set(1 + atkSquash * 0.11, 1 - atkSquash * 0.17, 1 + atkSquash * 0.11);
  // While it's still in the surf the water covers it — it only comes fully
  // clear once it's crawled out onto the sand.
  const bob = Math.abs(Math.sin(u.st.scuttle)) * 0.018 * reach;
  // Sunk well clear of the surface: the ocean mesh only has vertices every
  // ~6 m, so the drawn surface can sit a long way below the analytic height
  // at any given point. Deep enough that the interpolation can't expose it.
  const sub = submersionAt(u.g.position.x, u.g.position.z);
  u.g.position.y = restYInWater(u.g.position.x, u.g.position.z, 1.15) + bob;
  // hidden entirely while it's still under — you get the wake, not the crab
  u.g.visible = sub < 0.92;
  if (sub > 0.25 && u.st.awake) {
    u.st.wakeRipple = (u.st.wakeRipple || 0) - dt;
    if (u.st.wakeRipple <= 0) {
      addRipple(u.g.position.x, u.g.position.z, 0.5 + sub * 0.6);
      u.st.wakeRipple = 0.22;
    }
  }
  ud.rig.rotation.z = Math.sin(u.st.scuttle) * 0.09 * reach - atkTwist * 0.16;
  ud.rig.rotation.x = -rear * 0.30 - lunge * 0.38 + Math.sin(u.st.scuttle * 2) * 0.035 * reach;
  ud.rig.rotation.y = atkTwist * 0.42;          // the body goes through the swing
  ud.rig.position.y = rear * 0.06 + lunge * 0.05;

  // claws: weave while it advances, thrown wide when it rears, snapped
  // shut through the lunge
  for (const c of ud.claws) {
    const weave = Math.sin(u.st.scuttle * 0.8 + (c.side > 0 ? 1.7 : 0)) * 0.16 * reach;
    // one claw leads and the other trails: a two-armed swing reads as a hug
    const lead = c.side > 0 ? 1 : 0.32;
    c.shoulder.rotation.y = c.side * (-0.15 - rear * 0.55) + weave + atkSweep * 0.95 * lead;
    c.shoulder.rotation.x = -rear * 0.5 - lunge * 0.15 + weave * 0.4 - atkSweep * 0.22 * lead;
    c.shoulder.rotation.z = atkSweep * 0.3 * lead;
    c.fore.rotation.x = -0.1 - rear * 0.35 + lunge * 0.5;
    c.fore.rotation.y = -atkSweep * 0.5 * lead;    // the forearm trails the shoulder
    // gapes through the wind-up and snaps shut the instant it comes through
    const gape = lunge > 0.5 ? 0 : (0.32 + rear * 0.45) * (1 - lunge);
    c.jaw.rotation.x = -gape;
  }
  // eye stalks lean toward you
  for (let i = 0; i < ud.eyes.length; i++) {
    ud.eyes[i].rotation.x = -0.12 - rear * 0.25;
    ud.eyes[i].rotation.z = (i ? -1 : 1) * (0.1 + rear * 0.2);
  }

}


/* Every crab, every frame. The loner and the three that come out of the
 * water before the dock all run the same brain. */
function updateCrab(dt) {
  for (const u of crabs) updateCrabUnit(u, dt);
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
// Bradley Beach — a guy up on the sand cliff, a little further down the
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

/* The look every photo cut-out in this game gets: knocked down to a low
 * pixel count, posterised to a handful of levels per channel, and graded
 * cold so it sits in the night palette rather than looking like a photo
 * pasted on the beach. Blink is a fake eyelid — a thin band of forehead from
 * just above the eyes, painted down over them — because there is only ever
 * one still image. Both frames are baked once and the texture swapped.
 *
 * Shared by Bradly and the fisherman: it was written for the one and the
 * second would have been sixty lines of the same thing. */
/* `padBottom` adds transparent canvas UNDER the photograph, as a fraction of
 * its height, for `paint` to build into. The fisherman needs it: his boot
 * runs to the very last row of the crop, so there is nowhere to put a sole. */
function bakeCutout(img, eyes, { pix = 260, levels = 6, grain = 20, sat = 0.55, paint = null, padBottom = 0 } = {}) {
  const mk = (shut) => {
    // 1. full-res pass, with the eyelid painted in for the shut frame
    const full = document.createElement('canvas');
    full.width = img.width; full.height = Math.round(img.height * (1 + padBottom));
    const fg = full.getContext('2d');
    fg.drawImage(img, 0, 0);
    /* Anything painted on goes here — BEFORE the downsample, the posterise
     * and the grade — so it is put through everything the photograph is and
     * comes out the same material. Paint it after and it sits on top of the
     * picture looking like paint. */
    if (paint) paint(fg, img.width, img.height, full.height);
    if (shut) {
      const ex = eyes.x * img.width, ew = eyes.w * img.width;
      const ey = eyes.y * img.height, eh = Math.max(2, eyes.h * img.height);
      // stretch the strip above the eyes down across them
      fg.drawImage(full, ex, ey - eh * 1.25, ew, eh, ex, ey, ew, eh);
    }

    // 2. knock it down to sprite resolution
    const hh = pix;
    const ww = Math.max(1, Math.round(full.width * (hh / full.height)));
    const c = document.createElement('canvas');
    c.width = ww; c.height = hh;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(full, 0, 0, ww, hh);

    // 3. hard alpha, posterise, grade
    const id = g.getImageData(0, 0, ww, hh);
    const px = id.data;
    const step = 255 / (levels - 1);
    for (let i = 0; i < px.length; i += 4) {
      // the segmentation leaves a soft, bright fringe — cut it away cleanly
      if (px[i + 3] < 150) { px[i + 3] = 0; continue; }
      px[i + 3] = 255;

      let r = px[i], gg = px[i + 1], b = px[i + 2];
      // contrast around mid grey, then desaturate toward luma
      const lum = 0.299 * r + 0.587 * gg + 0.114 * b;
      const CON = 1.34, SAT = sat;
      r = lum + (r - lum) * SAT; gg = lum + (gg - lum) * SAT; b = lum + (b - lum) * SAT;
      r = (r - 128) * CON + 116; gg = (gg - 128) * CON + 122; b = (b - 128) * CON + 112;
      // sickly green-cyan cast; sprites aren't lit, so this is his final
      // brightness — keep him readable against the night sky
      r *= 0.86; gg *= 1.02; b *= 0.92;
      // a little grain before quantising so the bands break up
      const n = (Math.random() - 0.5) * grain;
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
  return { open: mk(false), shut: mk(true) };
}
function bakeBradlyFrames(img) {
  bradlySrcImg = img;
  const f = bakeCutout(img, BRADLY_EYES, { pix: BRADLY_PIX, levels: BRADLY_LEVELS });
  bradlyOpenTex = f.open; bradlyShutTex = f.shut;
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

/* The end of the walk. You climb the tower, you stand in the lantern, and you
 * put your hand on the light — a thing you choose, at the one place the whole
 * kilometre has been pointing at. */
if (lhParts.lampProxy) {
  addInteractable(lhParts.lampProxy, 'Put your hand on the light', 'action', {
    onActivate: () => { if (!ended) showEnd(); },
  });
}

// ------------------------------------------------------------------
// The crate below Bradly — and the ring in it
// ------------------------------------------------------------------
/* A shipping crate washed up against the cliff under where Bradly stands.
 * It is the game's one lock, and the key is the swing you already have: a
 * left click thuds off the boards and does nothing, and only a wound-up
 * heavy (`CRATE_POWER`, which needs about two-thirds of a full charge) puts
 * the blade through the lid. That is the whole reason it exists — the heavy
 * swing is otherwise just a better version of the light one, and this is the
 * one place the game asks for it by name.
 *
 * It is solid while it stands: a cylinder in `rockColliders`, dropped again
 * when the boards come apart.
 */
// a metre and a half off the cliff foot, where the moon actually reaches — at
// x = 12.8 it stood in the cliff's own shadow and read as a dark box at best
const CRATE_X = 11.4, CRATE_R = 0.52, CRATE_H = 0.72;
const CRATE_POWER = 0.75;              // ~0.64 s of charge — a real haul-back
const crateZ = bradly.position.z - 2.5;
/* There is more than one now — the dock has its own — so the crate is a
 * factory: `buildCrate(x, y, z, yaw, onBreak)` builds the boards, stands a
 * collider under them, and registers in `crates[]`, which `crateStrike()`
 * walks. `crate` / `crates[0].broken` / `breakCrate()` still name the first one,
 * because the harness and the ring flow do. */
const crates = [];
/* Salt-bleached boards. Drawn the way the sand texture is — 256², a coarse
 * palette, nearest-filtered — so it sits in the same world as everything
 * else instead of looking like a prop from a different game: a flat brown
 * box did exactly that. Grain runs along the plank, a knot or two, and the
 * gaps between boards are dark. Cool greys, because everything on this
 * beach is lit by the moon and nothing on it is warm. */
function makePlankTexture() {
  const S = 256;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const rnd = mulberry32(7331);
  const PLANKS = 4, ph = S / PLANKS;
  for (let i = 0; i < PLANKS; i++) {
    const y0 = i * ph;
    const base = 128 + Math.floor(rnd() * 26) - 13;          // each board its own grey
    g.fillStyle = `rgb(${base - 6},${base},${base + 12})`;
    g.fillRect(0, y0, S, ph);
    // grain: long faint streaks that wander a little across the board
    for (let k = 0; k < 26; k++) {
      const yy = y0 + 3 + rnd() * (ph - 6);
      const d = Math.floor(rnd() * 22) - 11;
      g.strokeStyle = `rgba(${base - 26 + d},${base - 20 + d},${base - 8 + d},0.55)`;
      g.lineWidth = 0.6 + rnd() * 1.2;
      g.beginPath();
      g.moveTo(0, yy);
      for (let x = 0; x <= S; x += 32) g.lineTo(x, yy + Math.sin(x * 0.02 + k) * 1.6 + (rnd() - 0.5) * 1.2);
      g.stroke();
    }
    // a knot
    if (rnd() < 0.7) {
      const kx = 30 + rnd() * (S - 60), ky = y0 + ph * (0.3 + rnd() * 0.4);
      const kr = 4 + rnd() * 5;
      g.fillStyle = `rgba(${base - 44},${base - 40},${base - 30},0.9)`;
      g.beginPath(); g.ellipse(kx, ky, kr * 1.4, kr, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = `rgba(${base - 30},${base - 26},${base - 18},0.6)`; g.lineWidth = 1;
      g.beginPath(); g.ellipse(kx, ky, kr * 2.1, kr * 1.5, 0, 0, Math.PI * 2); g.stroke();
    }
    // the gap to the next board, and a bevel catching the light above it
    g.fillStyle = 'rgba(14,16,22,0.95)'; g.fillRect(0, y0 + ph - 3, S, 3);
    g.fillStyle = `rgba(${base + 26},${base + 30},${base + 40},0.6)`; g.fillRect(0, y0, S, 2);
  }
  // quantise to the beach's coarse palette
  const img = g.getImageData(0, 0, S, S), d = img.data, step = 255 / 7;
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / step) * step;
  g.putImageData(img, 0, 0);
  const t = retroTex(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const plankTex = makePlankTexture();
function buildCrate(x, y, z, yaw, onBreak) {
  const crate = new THREE.Group();
  crate.position.set(x, y, z);
  crate.rotation.y = yaw;
  const boardMat = new THREE.MeshStandardMaterial({
    map: plankTex, color: 0x8390a4, roughness: 1, flatShading: true,
    emissive: 0x2a3446, emissiveMap: plankTex,
  });
  const battenMat = new THREE.MeshStandardMaterial({
    map: plankTex, color: 0x5c6675, roughness: 1, flatShading: true,
    emissive: 0x1c2432, emissiveMap: plankTex,
  });
  const W = CRATE_R * 2 * 0.72;        // the box is a little inside its collider
  // four sides of slats with gaps, so it reads as boards and not as a box
  for (const [ry, dx, dz] of [[0, 0, W / 2], [Math.PI, 0, -W / 2],
                              [Math.PI / 2, W / 2, 0], [-Math.PI / 2, -W / 2, 0]]) {
    const face = new THREE.Group();
    face.position.set(dx, 0, dz);
    face.rotation.y = ry;
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(W, CRATE_H / 4.6, 0.035), boardMat);
      b.position.y = CRATE_H * (0.11 + i * 0.26);
      b.rotation.z = (Math.random() - 0.5) * 0.02;   // nothing here is square
      face.add(b);
    }
    crate.add(face);
  }
  // lid
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(W, 0.032, W / 4.3), boardMat);
    b.position.set(0, CRATE_H, -W / 2 + W / 8 + i * (W / 4));
    crate.add(b);
  }
  // corner battens, which are what stop it looking like slats floating in a ring
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.055, CRATE_H + 0.03, 0.055), battenMat);
    p.position.set(sx * W / 2, CRATE_H / 2, sz * W / 2);
    crate.add(p);
  }
  // a strap round the middle, rusted through in one place
  const strap = new THREE.Mesh(new THREE.BoxGeometry(W + 0.09, 0.028, W + 0.09), battenMat);
  strap.position.y = CRATE_H * 0.52;
  crate.add(strap);
  scene.add(crate);
  const collider = { x, z, r: CRATE_R, top: y + CRATE_H };
  rockColliders.push(collider);
  addItemShine(crate, { size: 0.9, height: 0.5, strength: 0.5 });
  const entry = { group: crate, x, y, z, collider, onBreak, broken: false };
  crates.push(entry);
  return entry;
}
const crateEntry = buildCrate(CRATE_X, 0, crateZ, -0.32, () => dropRing());
const crate = crateEntry.group;

/* The castle under the blade. Any swing takes it — it is sand — and the
 * swing still connects, because putting a shovel through a sandcastle is a
 * thing you feel in the handle. */
function castleStrike(P) {
  if (castleBroken || !castleGeo) return false;
  aimRay(P);
  if (!digRay.intersectObject(castle, true).length) return false;
  hitConnect(P, 0.55);
  breakCastle(camera.position.x, camera.position.z);
  return true;
}
/* Hitting it. Raycast the crosshair straight at the crate rather than reading
 * the sand under it — aim at the lid and the ground point lands a metre past
 * the far side, which is exactly the kind of near-miss that reads as the game
 * being broken. */
function crateStrike(P) {
  aimRay(P);
  for (const c of crates) {
    if (c.broken) continue;
    if (!digRay.intersectObject(c.group, true).length) continue;
    if (P >= CRATE_POWER) { hitConnect(P, 1); flashMats(c.group); breakCrate(c); return true; }
    hitConnect(P, 0.45); flashMats(c.group);
    // it holds. The blade jars back at you, and a puff of dust off the boards
    // says you connected — a swing that hits and does nothing must not feel
    // the same as a swing that hit nothing at all.
    sfxCrateThud();
    addTrauma(0.17);
    vmImpulse(-1.15);
    spawnPuffs(c.x, c.z, 5, _pf.x, _pf.z, c.y + CRATE_H * 0.7, [0.52, 0.42, 0.30]);
    return true;
  }
  return false;
}

function breakCrate(c = crates[0]) {
  if (!c || c.broken) return;
  c.broken = true;
  scene.remove(c.group);
  const ci = rockColliders.indexOf(c.collider);
  if (ci >= 0) rockColliders.splice(ci, 1);
  sfxCrateBreak();
  addTrauma(0.5);
  hitstop = 0.06;
  spawnPuffs(c.x, c.z, 18, _pf.x, _pf.z, c.y + CRATE_H * 0.6, [0.52, 0.42, 0.30]);

  // the boards, as real gibs so they bounce and settle with everything else
  const splint = new THREE.MeshStandardMaterial({
    map: plankTex, color: 0x8390a4, roughness: 1, flatShading: true,
    emissive: 0x2a3446, emissiveMap: plankTex,
  });
  for (let i = 0; i < 18; i++) {
    const L = 0.10 + Math.random() * 0.26;
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.028, 0.05 + Math.random() * 0.05), splint);
    m.position.set(c.x + (Math.random() - 0.5) * 0.5,
      c.y + 0.1 + Math.random() * CRATE_H, c.z + (Math.random() - 0.5) * 0.5);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    scene.add(m);
    const a = Math.random() * Math.PI * 2, out = 0.9 + Math.random() * 2.0;
    gibs.push({
      m,
      vel: new THREE.Vector3(Math.cos(a) * out, 1.9 + Math.random() * 2.4, Math.sin(a) * out),
      spin: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14),
      rest: 0.02, life: 40, bleed: false,   // the deck, if any, is found per frame
    });
  }
  if (c.onBreak) c.onBreak(c);
}

/* What was in it. The ring goes down on the sand where the crate stood, with
 * the same shine every other takeable thing carries — at 20 mm across it is
 * the smallest object in the game, and without the glint you would walk over
 * it in the dark. */
/* The ring is a scan — Thunk3D's "Octopus Ring" — not the built signet that
 * was here before. `assets/octopus-ring.glb` is the lowest of the seven LODs
 * the download ships (7k triangles, which is plenty at 20 mm), packed with
 * `--nodes`; it carries no maps at all, being a raw STL scan, so the metal is
 * all in the material. It loads async, so `ring` is a Group that stays empty
 * until it lands and everything downstream — the world drop, the inspect
 * view, the hotbar icon — works off the Group either way. */
const ring = new THREE.Group();
const ringWorld = new THREE.Group();
ringWorld.add(ring);
new GLTFLoader().load('assets/octopus-ring.glb', (gltf) => {
  gltf.scene.updateMatrixWorld(true);
  /* RUSTED IRON, and the texture is projected, not mapped. The scan has no
   * UVs — it is a raw STL, and an STL cannot carry them — so Poly Haven's
   * "Rusty Metal 02" (assets/rust-diff.jpg, rust-rough.jpg, cut to 512 and
   * 256) goes on TRIPLANAR: sampled three times in the ring's own object
   * space, along each axis, and blended by the face normal. No seams, no
   * unwrap, and it follows every pit in the scan. `uTri` is the tiling — the
   * geometry is ~28 units across, so 0.062 puts about two repeats round it,
   * which is the scale at which the rust reads as rust and not as noise.
   *
   * DoubleSide because a raw STL's winding cannot be relied on, and low
   * metalness because there is no environment map here and a true metal
   * has no diffuse — at 0.6 the ring is a scatter of lit specks on black.
   * The emissive is multiplied by the same sample, so the lift that keeps it
   * visible on dark sand follows the rust instead of flattening it.
   *
   * The blend normal comes from screen derivatives of the object-space
   * position, NOT from the normal attribute: the decimated pack carries only
   * positions and indices, so `normal` reads as zero, the three weights sum
   * to nothing, and every sample is black — the ring rendered as a cut-out.
   * Flat shading never noticed, because three derives its lighting normal
   * the same way; the projection has to as well. */
  const rustDiff = retroTex(new THREE.TextureLoader().load('assets/rust-diff.jpg'));
  rustDiff.colorSpace = THREE.SRGBColorSpace;
  const rustRough = retroTex(new THREE.TextureLoader().load('assets/rust-rough.jpg'));
  const iron = new THREE.MeshStandardMaterial({
    color: 0xe0d6c8, map: rustDiff, roughnessMap: rustRough, roughness: 1.0, metalness: 0.14,
    emissive: 0x9a6a3c, side: THREE.DoubleSide, flatShading: true,
  });
  iron.onBeforeCompile = (sh) => {
    sh.uniforms.uTri = { value: 0.062 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTri; varying vec3 vTriP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTriP = position * uTri;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vTriP;
vec4 triSample(sampler2D t, vec3 p, vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-4);
  return texture2D(t, p.yz) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z;
}`)
      .replace('#include <map_fragment>',
        'vec3 triN = normalize(cross(dFdx(vTriP), dFdy(vTriP)));\n  vec4 triCol = triSample(map, vTriP, triN);\n  diffuseColor *= triCol;')
      .replace('#include <roughnessmap_fragment>',
        'float roughnessFactor = roughness * triSample(roughnessMap, vTriP, triN).g;')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= triCol.rgb * 1.8;');
  };
  let geo = null;
  gltf.scene.traverse((o) => { if (o.isMesh && !geo) geo = o.geometry.clone().applyMatrix4(o.matrixWorld); });
  if (!geo) return;
  // the scan arrives ~30 units across and centred on nothing in particular:
  // recentre it and fit it to a ring you could actually wear
  geo.computeBoundingBox();
  const bb = geo.boundingBox, size = bb.getSize(new THREE.Vector3()), mid = bb.getCenter(new THREE.Vector3());
  geo.translate(-mid.x, -mid.y, -mid.z);
  // USE_MAP wants a uv attribute even though the projection never reads it
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  const m = new THREE.Mesh(geo, iron);
  m.scale.setScalar(0.055 / Math.max(size.x, size.y, size.z));   // big enough to spot on dark sand
  ring.add(m);
});
const ringItem = {
  id: 'ring', name: 'The Octopus Ring', icon: makeRingIcon(), ring: true,
  use: () => toggleEquip(ringItem),
  // Putting it ON still happens in the examine screen — which you now reach
  // from the pack — because that is where you can see what you are wearing.
  inspectOpts: () => ({
    rotX: 1.1, rotY: 0.35,
    equipLabel: (inventory.includes(ringItem) && rings.length < RING_SLOTS) ? 'Put it on' : null,
    onEquip: () => { if (wearRing(ringItem)) closeInspect(); },
  }),
};
holdable(ringItem, ring, { scale: 2.2, pos: [0, -0.02, 0], rot: [1.1, 0.3, 0.2] });
/* It comes OUT. Set down quietly on the sand where the crate stood, a 20 mm
 * ring is the easiest thing in the game to walk away from; so it is thrown
 * up out of the boards on a real body, toward you, rings off the sand when
 * it lands, and sits under a glint twice the size a takeable normally gets.
 * The arc is the point: your eye follows a thing that moves. */
/* What the dock's crate holds. A brass key, and for now it opens nothing:
 * it is a placeholder for whatever the pier turns out to be about — a thing
 * to find and turn over so the crate is worth breaking. It is NOT thrown on
 * a body like the ring: PhysProp knows one ground, the sand, and a key
 * bouncing off a deck two metres up would fall straight through the boards
 * to the beach underneath. It is set down where the crate stood. */
/* The key is Sousinho's "Medieval key (copper version)" — assets/key.glb,
 * 7k triangles with its own colour, roughness and normal maps, packed by
 * tools/gltfpack.py. It arrives ~4 units long and six units off its origin,
 * so it is recentred and fitted to 12 cm; the daylight-baked albedo gets
 * the same lift the shell does. It loads async: `keyModel` is a Group that
 * fills when the scan lands, and the drop, the inspect view and the hotbar
 * all work off the Group either way. */
function makeKeyIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  g.strokeStyle = '#8a5a30'; g.fillStyle = '#8a5a30'; g.lineCap = 'round';
  g.lineWidth = 4;
  g.beginPath(); g.arc(13, 24, 7, 0, Math.PI * 2); g.stroke();             // the bow
  g.beginPath(); g.moveTo(20, 24); g.lineTo(41, 24); g.stroke();            // the shaft
  g.fillRect(34, 24, 4, 8); g.fillRect(27, 24, 3, 6);                        // the bits
  return c.toDataURL();
}
const keyModel = new THREE.Group();
const keyWorld = new THREE.Group();
keyWorld.add(keyModel);
new GLTFLoader().load('assets/key.glb', (gltf) => {
  gltf.scene.updateMatrixWorld(true);
  let geo = null, mat = null;
  gltf.scene.traverse((o) => {
    if (o.isMesh && !geo) { geo = o.geometry.clone().applyMatrix4(o.matrixWorld); mat = o.material; }
  });
  if (!geo) return;
  geo.computeBoundingBox();
  const bb = geo.boundingBox, size = bb.getSize(new THREE.Vector3()), mid = bb.getCenter(new THREE.Vector3());
  geo.translate(-mid.x, -mid.y, -mid.z);
  geo.computeBoundingSphere();
  mat.emissive.setHex(0x4a3a2a);
  mat.emissiveMap = mat.map;
  mat.metalness = Math.min(mat.metalness, 0.25);      // no environment map: a true metal goes black
  reexpose(mat, 0.62);
  const m = new THREE.Mesh(geo, mat);
  m.scale.setScalar(0.20 / Math.max(size.x, size.y, size.z));    // a key you can see from standing
  keyModel.add(m);
});
const keyItem = {
  id: 'key', name: 'A Rusted Key', icon: makeKeyIcon(),
  use: () => toggleEquip(keyItem),
};
holdable(keyItem, keyModel, { scale: 1.1, pos: [0, -0.02, 0], rot: [0.5, 0.3, 0.7] });
function dropKey(c) {
  keyModel.rotation.set(Math.PI / 2, 0, 0.6);           // lying flat on the boards
  keyWorld.position.set(c.x + 0.12, c.y + 0.006, c.z - 0.08);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy'; hit.position.y = 0.05; keyWorld.add(hit);
  scene.add(keyWorld);
  addItemShine(keyWorld, { size: 1.1, height: 0.45, strength: 2.6 });
  addInteractable(keyWorld, 'Take the key', 'inventory', {
    onActivate: () => {
      scene.remove(keyWorld);
      removeInteractable(keyWorld);
      hovered = null;
      addToInventory(keyItem);
      sfxThud(0.03);
    },
  });
}

let ringProp = null;
function dropRing() {
  ring.position.set(0, 0.012, 0);
  ring.rotation.set(Math.PI / 2 - 0.35, 0.4, 0);      // flat, tipped a little
  ringWorld.position.set(CRATE_X, CRATE_H * 0.55, crateZ);
  scene.add(ringWorld);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy';
  hit.position.y = 0.06;
  ringWorld.add(hit);
  // a body of its own, but NOT makeProp(): that would register it as a
  // grab-and-throw physics prop, and a ring is a thing you take
  ringProp = new PhysProp(ringWorld, { radius: 0.05, restH: 0.012, bounce: 0.38, friction: 0.55 });
  const tx = camera.position.x - CRATE_X, tz = camera.position.z - crateZ;
  const td = Math.hypot(tx, tz) || 1;
  ringProp.vel.set((tx / td) * 1.6 + (Math.random() - 0.5) * 0.4, 3.4, (tz / td) * 1.6 + (Math.random() - 0.5) * 0.4);
  ringProp.angVel.set(6, 9, 4);
  let rang = false;
  ringProp.onImpact = (speed) => { if (!rang && speed > 1.2) { rang = true; sfxRingLand(); } };
  // the glint sits well up off the sand: at height 0.12 a 1.5 m sprite had
  // its lower half under the beach and drew a hard line where the sand cut it
  addItemShine(ringWorld, { size: 1.2, height: 0.5, strength: 3.2 });
  // and the metal itself catches the moon while it lies out here — a 20 mm
  // ring with the inspect view's emissive is invisible on night sand
  ring.traverse((o) => { if (o.isMesh && o.material.emissive) o.material.emissive.setHex(0xe0a868); });
  addInteractable(ringWorld, 'Take the ring', 'inventory', {
    onActivate: () => {
      ringProp.dead = true;
      ring.traverse((o) => { if (o.isMesh && o.material.emissive) o.material.emissive.setHex(0x9a6a3c); });
      scene.remove(ringWorld);
      removeInteractable(ringWorld);
      hovered = null;
      ringsFound = true;
      addToInventory(ringItem);
      renderRings();
      sfxThud(0.03);
    },
  });
}

// The tunnel in the sand wall and the room at the end of it were removed
// at the project's request. The drainage tunnel home further up the beach
// is the one that stays — see makeDrainageTunnelHome() below.

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
let typeFull = null;                   // the line being typed, and what ends it
function typeLine(text, onDone) {
  clearInterval(typeTimer);
  dialogTextEl.textContent = '';
  dialogEl.classList.add('typing');
  let i = 0;
  const done = () => {
    clearInterval(typeTimer); typeTimer = null; typeFull = null;
    dialogTextEl.textContent = text;
    dialogEl.classList.remove('typing');
    onDone();
  };
  typeFull = done;
  typeTimer = setInterval(() => {
    dialogTextEl.textContent = text.slice(0, ++i);
    if (i >= text.length) done();
  }, 28);
}
/* A click while a line is still typing puts the whole line up at once —
 * the choices arrive with it — and that click does nothing else. Reading
 * faster than the typewriter is the normal case, not the exception. */
function finishTyping() {
  if (!typeFull) return false;
  typeFull();
  return true;
}
let dialogScript = BRADLY_SCRIPT;
const dialogUsed = new Set();      // lines you have already put to someone, by label
function showDialogNode(id) {
  const node = dialogScript[id];
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
      if (ch.when && !ch.when()) continue;      // e.g. only if you have the key
      const b = document.createElement('button');
      // a line you have already put to him greys out. It is the only thing
      // in here that is not full white, so the grey means exactly one thing.
      const fresh = !dialogUsed.has(ch.label);
      b.className = 'choice' + (fresh ? '' : ' used');
      // a line you can only say because of something you are carrying, and
      // have not said yet, gets a star — otherwise you would never know it
      // had appeared
      if (ch.when && fresh) {
        const st = document.createElement('span');
        st.className = 'star';
        st.textContent = '\u2605';
        b.appendChild(st);
      }
      b.appendChild(document.createTextNode(ch.label));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        dialogUsed.add(ch.label);
        showDialogNode(ch.to);
      });
      dialogChoicesEl.appendChild(b);
    }
  });
}
/* Anyone can talk now, not just Bradly. `npc` carries the name shown on the
 * card, the script to walk and the sprite the camera pushes in on; leaving
 * it out is still Bradly, because everything that called this already
 * assumed him. */
function startDialog(id, npc = null) {
  if (dialogOpen || ended || !introDone) return;
  dialogOpen = true;
  bradlyMet = true;
  dialogScript = npc ? npc.script : BRADLY_SCRIPT;
  dialogTarget = (npc ? npc.sprite : bradlySprite).getWorldPosition(new THREE.Vector3());
  // his head, not the middle of him: a sprite's origin is its centre, which
  // on a seated man is his chest
  if (npc && npc.headY) dialogTarget.y += npc.headY;
  dialogSpeakerEl.textContent = npc ? npc.name : 'Bradley Beach';
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
  clearTimeout(dialogEndTimer); clearInterval(typeTimer); typeTimer = null; typeFull = null;
  dialogOpen = false;
  dialogCanDismiss = false;
  dialogTarget = null;
  dialogEl.classList.remove('show');
  dialogEl.classList.remove('typing');
  refreshUI();
  if (dialogReturnLock && !fallbackLook) requestLock();
}
dialogEl.addEventListener('click', () => {
  if (finishTyping()) return;
  if (dialogCanDismiss) endDialog();
});
document.getElementById('dialog-leave').addEventListener('click', (e) => { e.stopPropagation(); endDialog(); });

// Push in on whoever's talking: ease the FOV down and swing the view onto
// them, then let it back out when the conversation drops.
const DIALOG_FOV = 42;
const _lookM = new THREE.Matrix4(), _lookQ = new THREE.Quaternion();
function updateDialogCam(dt) {
  // The peek's squeeze is the zoom — and it is also what crops the lit room
  // out of frame, so there is nothing left to look at but the bore.
  const wantFov = (peeking && !peekLeaving ? PEEK_FOV
    : dialogOpen ? Math.min(settings.fov, DIALOG_FOV) : settings.fov) + fovKick;
  const rate = peeking ? 2.6 : 3.5;
  if (Math.abs(camera.fov - wantFov) > 0.01) {
    camera.fov += (wantFov - camera.fov) * Math.min(1, dt * rate);
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
  /* THE SEA UNDER THE TITLE. The walk's surf is a bed you stop hearing; the
   * menu wants waves you cannot not hear — a lower, slower swell that rolls
   * in and draws back every ~13 s, with a rumble under it. It only exists
   * while the title is up; leaveTitle() pulls it down. */
  const tsurf = ctx.createBiquadFilter(); tsurf.type = 'bandpass'; tsurf.frequency.value = 170; tsurf.Q.value = 0.45;
  const trum = ctx.createBiquadFilter(); trum.type = 'lowpass'; trum.frequency.value = 95;
  const swell = ctx.createGain(); swell.gain.value = 0.5;
  const swLfo = ctx.createOscillator(); swLfo.frequency.value = 0.077;
  const swLfoG = ctx.createGain(); swLfoG.gain.value = 0.48;
  swLfo.connect(swLfoG).connect(swell.gain);
  titleSurfGain = ctx.createGain(); titleSurfGain.gain.value = 0.0001;
  noise.connect(tsurf).connect(swell);
  noise.connect(trum).connect(swell);
  swell.connect(titleSurfGain).connect(waveBusGain);
  if (!introStarted) titleSurfGain.gain.exponentialRampToValueAtTime(1.6, ctx.currentTime + 3.5);
  masterGain.connect(ctx.destination);
  noise.start(); lfo.start(); lfo2.start(); swLfo.start();
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
  poise: ['assets/poise-broken.m4a'],      // the parry landing: its guard is gone
  smash: ['assets/overhead-hit.m4a'],      // a charged overhead going through shell
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
/* A step on the pier: a hollow knock, not a crush. Boards over air ring —
 * a short low resonance with a bright transient off the heel, and none of
 * the sand's grit. Alternates weight like the sand step does. */
/* What a thrown thing sounds like when it lands, by what it lands on. The
 * same four surfaces the shovel reads: a bottle off a rock is not a bottle
 * in the sand, and before this everything anywhere made one dull thud. */
function sfxPropHit(surface, speed) {
  const ctx = audioCtx; if (!ctx) return;
  if (surface === 'water') return;               // the splash already covers it
  const t = ctx.currentTime;
  const v = Math.min(1, speed / 11);
  const out = ctx.createGain();
  out.gain.value = 0.28 + v * 0.5;
  out.connect(sfxOut());
  if (surface === 'wood') {
    // a hollow board knock, pitched by how hard it came in
    const osc = ctx.createOscillator(); osc.type = 'sine';
    const f = 150 + Math.random() * 60;
    osc.frequency.setValueAtTime(f * 1.8, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14 + v * 0.08);
    osc.connect(g).connect(out); osc.start(t); osc.stop(t + 0.24);
    const tap = noiseBurst(0.035, (x) => Math.pow(1 - x, 4));
    const tf = ctx.createBiquadFilter(); tf.type = 'bandpass'; tf.frequency.value = 1100; tf.Q.value = 1.2;
    const tg = ctx.createGain(); tg.gain.value = 0.22;
    tap.connect(tf).connect(tg).connect(out); tap.start(t); tap.stop(t + 0.035);
  } else if (surface === 'rock') {
    // stone: a hard bright crack with almost no body behind it
    const crack = noiseBurst(0.05, (x) => Math.pow(1 - x, 5.5));
    const cf = ctx.createBiquadFilter(); cf.type = 'bandpass';
    cf.frequency.value = 2400 + Math.random() * 1400; cf.Q.value = 0.8;
    const cg = ctx.createGain(); cg.gain.value = 0.5;
    crack.connect(cf).connect(cg).connect(out); crack.start(t); crack.stop(t + 0.05);
    const ring = ctx.createOscillator(); ring.type = 'triangle';
    ring.frequency.value = 620 + Math.random() * 380;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t);
    rg.gain.exponentialRampToValueAtTime(0.16, t + 0.004);
    rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    ring.connect(rg).connect(out); ring.start(t); ring.stop(t + 0.12);
  } else {
    // sand: a dead thump, no ring at all
    const th = noiseBurst(0.1, (x) => Math.pow(1 - x, 3));
    const lf = ctx.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 210;
    const lg = ctx.createGain(); lg.gain.value = 0.55;
    th.connect(lf).connect(lg).connect(out); th.start(t); th.stop(t + 0.1);
  }
}
function sfxStepWood() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  stepAlt ^= 1;
  const out = ctx.createGain();
  out.gain.value = 0.55 * (stepAlt ? 1 : 0.8) * (0.85 + Math.random() * 0.3);
  out.connect(sfxOut());
  // the knock: a damped low tone, the plank ringing over the void beneath
  const knock = ctx.createOscillator(); knock.type = 'sine';
  const f0 = 118 + Math.random() * 40;
  knock.frequency.setValueAtTime(f0 * 1.6, t);
  knock.frequency.exponentialRampToValueAtTime(f0, t + 0.035);
  const kg = ctx.createGain();
  kg.gain.setValueAtTime(0.0001, t);
  kg.gain.exponentialRampToValueAtTime(0.5, t + 0.006);
  kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16 + Math.random() * 0.05);
  knock.connect(kg).connect(out);
  knock.start(t); knock.stop(t + 0.24);
  // the heel: a short bright transient, the sole hitting the board
  const heel = noiseBurst(0.04, (x) => Math.pow(1 - x, 4));
  const hf = ctx.createBiquadFilter(); hf.type = 'bandpass';
  hf.frequency.value = 900 + Math.random() * 500; hf.Q.value = 1.1;
  const hg = ctx.createGain(); hg.gain.value = 0.22;
  heel.connect(hf).connect(hg).connect(out);
  heel.start(t); heel.stop(t + 0.04);
  // and the board's body under it — a soft thud, lower than the sand's
  const body = noiseBurst(0.07, (x) => Math.pow(1 - x, 3));
  const bf = ctx.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 260; bf.Q.value = 1.6;
  const bg = ctx.createGain(); bg.gain.value = 0.3;
  body.connect(bf).connect(bg).connect(out);
  body.start(t); body.stop(t + 0.07);
}
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
/* Putting a ring on. Two notes a semitone apart and a breath of cloth: the
 * metal touching, and the finger going through. Short - an equip sound you
 * hear twice a minute has to be over before you notice it is a sound. */
function sfxRingOn() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  for (const [f, d, g0] of [[2380, 0.0, 0.05], [2530, 0.012, 0.035]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(g0, t + d + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16);
    o.connect(g).connect(sfxOut());
    o.start(t + d); o.stop(t + d + 0.18);
  }
  const cloth = noiseBurst(0.12, (x) => Math.sin(Math.PI * x) * 0.7);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  const cg = ctx.createGain(); cg.gain.value = 0.035;
  cloth.connect(lp).connect(cg).connect(sfxOut());
  cloth.start(t); cloth.stop(t + 0.12);
}
// a ring landing on sand: a bright ting that rings on a moment, then stops
// dead as the sand takes it
function sfxRingLand() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  for (const [f, g0, dur] of [[3120, 0.06, 0.34], [4660, 0.03, 0.22], [1980, 0.02, 0.4]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(g0, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxOut());
    o.start(t); o.stop(t + dur + 0.02);
  }
}
// taking it off - the same tick, lower, and without the cloth
function sfxRingOff() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 1780;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.038, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  o.connect(g).connect(sfxOut());
  o.start(t); o.stop(t + 0.15);
}
// the blade bouncing off boards that hold
function sfxCrateThud() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const body = noiseBurst(0.14, (x) => Math.pow(1 - x, 2.4));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 190; bp.Q.value = 1.6;
  const g = ctx.createGain(); g.gain.value = 0.4;
  body.connect(bp).connect(g).connect(sfxOut());
  body.start(t); body.stop(t + 0.14);
  const knock = ctx.createOscillator(); knock.type = 'triangle';
  knock.frequency.setValueAtTime(150, t);
  knock.frequency.exponentialRampToValueAtTime(78, t + 0.09);
  const kg = ctx.createGain();
  kg.gain.setValueAtTime(0.075, t); kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  knock.connect(kg).connect(sfxOut());
  knock.start(t); knock.stop(t + 0.12);
}
// and the boards giving: a crack, then the pieces going everywhere
function sfxCrateBreak() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const crack = noiseBurst(0.22, (x) => Math.pow(1 - x, 1.1) * (0.3 + 0.7 * Math.random()));
  const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.Q.value = 0.9;
  cf.frequency.setValueAtTime(1500, t);
  cf.frequency.exponentialRampToValueAtTime(420, t + 0.2);
  const cg = ctx.createGain(); cg.gain.value = 0.4;
  crack.connect(cf).connect(cg).connect(sfxOut());
  crack.start(t); crack.stop(t + 0.22);
  // the clatter afterwards, a handful of little wooden knocks
  for (let i = 0; i < 7; i++) {
    const d = 0.05 + Math.random() * 0.42;
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(190 + Math.random() * 220, t + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.03 + Math.random() * 0.02, t + d + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.07);
    o.connect(g).connect(sfxOut());
    o.start(t + d); o.stop(t + d + 0.09);
  }
}
/* Sand coming down. Not a crack and not a clatter — a castle is damp sand,
 * so it gives with a soft low collapse, one of the recorded sand impacts
 * pitched down under it, a second of granular crumble as the layers let go
 * (timed to the slump, which drops a layer every 70 ms), a few dull lumps
 * landing, and a fine hiss of dry grains sifting off the heap at the end. */
function sfxCastleBreak() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain(); out.gain.value = 0.9; out.connect(sfxOut());
  playSample('sandHit', 0.42, 0.04, 0.78);
  // the give — a low soft body, no attack to speak of
  const body = noiseBurst(0.42, (x) => Math.pow(Math.sin(Math.min(1, x * 3) * Math.PI / 2), 1.5) * Math.pow(1 - x, 1.8));
  const bf = ctx.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 150; bf.Q.value = 0.7;
  const bg = ctx.createGain(); bg.gain.value = 0.55;
  body.connect(bf).connect(bg).connect(out);
  body.start(t); body.stop(t + 0.42);
  // the crumble — granular, closing down as the pile settles
  const crumble = noiseBurst(1.15, (x) => (Math.random() < 0.45 ? 0.2 + 0.8 * Math.random() : 0.12) * Math.pow(1 - x, 1.4));
  const cf = ctx.createBiquadFilter(); cf.type = 'lowpass'; cf.Q.value = 0.9;
  cf.frequency.setValueAtTime(1500, t + 0.03);
  cf.frequency.exponentialRampToValueAtTime(260, t + 1.1);
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.0001, t);
  cg.gain.exponentialRampToValueAtTime(0.26, t + 0.06);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
  crumble.connect(cf).connect(cg).connect(out);
  crumble.start(t); crumble.stop(t + 1.16);
  // lumps landing, a beat apart, each duller than the last
  for (let i = 0; i < 6; i++) {
    const d = 0.12 + i * 0.13 + Math.random() * 0.06;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(95 - i * 5, t + d);
    o.frequency.exponentialRampToValueAtTime(48, t + d + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.06 - i * 0.006, t + d + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.14);
    o.connect(g).connect(out);
    o.start(t + d); o.stop(t + d + 0.16);
  }
  // dry grains sifting off the heap
  const sift = noiseBurst(1.0, (x) => Math.pow(1 - x, 2.2) * (0.6 + 0.4 * Math.random()));
  const sf = ctx.createBiquadFilter(); sf.type = 'highpass'; sf.frequency.value = 3200;
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, t + 0.3);
  sg.gain.exponentialRampToValueAtTime(0.05, t + 0.45);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
  sift.connect(sf).connect(sg).connect(out);
  sift.start(t + 0.3); sift.stop(t + 1.3);
}
/* Running out. A breath pushed out through the teeth: a band of noise that
 * opens and closes over a third of a second, with a little voice under it —
 * you hear the body, not a UI sound. */
function sfxGasp() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain(); out.gain.value = 0.9; out.connect(sfxOut());
  const air = noiseBurst(0.55, (x) => Math.sin(Math.min(1, x * 2.4) * Math.PI) * Math.pow(1 - x, 0.7));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(900, t);
  bp.frequency.exponentialRampToValueAtTime(340, t + 0.5);
  const ag = ctx.createGain(); ag.gain.value = 0.5;
  air.connect(bp).connect(ag).connect(out);
  air.start(t); air.stop(t + 0.55);
  // the voice under it, barely pitched
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(132, t);
  o.frequency.exponentialRampToValueAtTime(88, t + 0.4);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 620;
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.10, t + 0.07);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  o.connect(lp).connect(og).connect(out);
  o.start(t); o.stop(t + 0.5);
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
// the wheel: a dry seized groan with a detent knock at the end of the turn
function sfxWheelTurn() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.55);
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const env = Math.sin((i / len) * Math.PI);
    lp = lp * 0.86 + (Math.random() * 2 - 1) * 0.14;
    // a slow rasp on top of the noise, so it grinds rather than hisses
    d[i] = lp * env * (0.55 + 0.45 * Math.sin(i * 0.06)) * 0.5;
  }
  const src = ctx.createBufferSource(); src.buffer = b;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.setValueAtTime(320, t);
  bp.frequency.exponentialRampToValueAtTime(760, t + 0.5);
  bp.Q.value = 2.2;
  const g = ctx.createGain(); g.gain.value = 0.5;
  src.connect(bp).connect(g).connect(sfxOut());
  src.start(t); src.stop(t + 0.56);
  // the detent it drops into
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(180, t + 0.5);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.62);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t + 0.5);
  og.gain.exponentialRampToValueAtTime(0.26, t + 0.515);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.66);
  o.connect(og).connect(sfxOut());
  o.start(t + 0.5); o.stop(t + 0.68);
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
/* Reaching full charge. Not a ping — a short wooden creak, the shaft taking
 * all the load it is going to take, so it reads as the tool straining rather
 * than as a UI noise in a game that has no UI noises. */
function sfxWindFull() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const creak = noiseBurst(0.20, (x) => Math.pow(1 - x, 1.4) * (0.4 + 0.6 * Math.random()));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6.5;
  bp.frequency.setValueAtTime(430, t);
  bp.frequency.exponentialRampToValueAtTime(760, t + 0.2);
  const g = ctx.createGain(); g.gain.value = 0.075;
  creak.connect(bp).connect(g).connect(sfxOut());
  creak.start(t); creak.stop(t + 0.2);
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(196, t + 0.16);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.045, t + 0.03);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(og).connect(sfxOut());
  o.start(t); o.stop(t + 0.22);
}
// the blade meeting something solid: a hard, short transient on top of
// whatever the thing itself sounds like. This is the "click" of a hit.
function sfxConnect(P = 0, k = 1) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const s = noiseBurst(0.045, (x) => Math.pow(1 - x, 1.2));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900 - P * 500; bp.Q.value = 1.4;
  const g = ctx.createGain(); g.gain.value = (0.16 + P * 0.1) * k;
  s.connect(bp).connect(g).connect(sfxOut());
  s.start(t); s.stop(t + 0.045);
  const o = ctx.createOscillator(); o.type = 'square';
  o.frequency.setValueAtTime(260 - P * 70, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.06);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.055 * k, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(og).connect(sfxOut());
  o.start(t); o.stop(t + 0.08);
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
/* The tell. Whatever else is on screen, this is the thing that has to say
 * "it is winding up" — so it is a rising rasp, not a click: legs scraping
 * shell as it gathers, pitched UP over the eighteen frames of the startup so
 * the sound itself is the countdown. Deliberately unlike sfxCrabSnip(), which
 * is the strike; you should never confuse the two. */
/* The guard going up: a short scrape of the haft against your glove. Quiet —
 * it happens every time you press, and anything with body to it would wear
 * out in the first minute. */
function sfxGuardUp() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain(); out.gain.value = 0.2; out.connect(sfxOut());
  const n = noiseBurst(0.09, (x) => Math.pow(1 - x, 2.4) * (0.4 + 0.6 * Math.random()));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.8;
  n.connect(bp).connect(out); n.start(t); n.stop(t + 0.09);
}
/* A blow stopped on the blade: a dull wooden knock with a little metal in
 * it, and no ring. The ring is what a parry gets, and the two must never be
 * mistaken for one another — that difference is the whole mechanic. */
function sfxBlock() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain(); out.gain.value = 1.6; out.connect(sfxOut());
  /* HEAVY. It used to be a knock; it is a shovel taking the whole weight of
   * the swing now. Under everything a sub thump you feel more than hear,
   * a slab of low body that hangs for a quarter second, a mid crack driven
   * into a waveshaper so it bites, and the dead steel clank on top — kept,
   * because that is what keeps it unmistakable from the parry's ring. */
  const sub = ctx.createOscillator(); sub.type = 'sine';
  sub.frequency.setValueAtTime(95, t);
  sub.frequency.exponentialRampToValueAtTime(36, t + 0.22);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, t);
  sg.gain.exponentialRampToValueAtTime(0.95, t + 0.006);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
  sub.connect(sg).connect(out); sub.start(t); sub.stop(t + 0.32);
  const body = noiseBurst(0.28, (x) => Math.pow(1 - x, 2.0));
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 210; lp.Q.value = 1.6;
  const bg = ctx.createGain(); bg.gain.value = 1.1;
  body.connect(lp).connect(bg).connect(out); body.start(t); body.stop(t + 0.28);
  // the crack: mid noise through a hard curve, so it has an edge
  const crack = noiseBurst(0.09, (x) => Math.pow(1 - x, 3.2));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 780; bp.Q.value = 0.8;
  const shaper = ctx.createWaveShaper();
  { const n = 256, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * 3.2); } shaper.curve = c; }
  const cg = ctx.createGain(); cg.gain.value = 0.55;
  crack.connect(bp).connect(shaper).connect(cg).connect(out); crack.start(t); crack.stop(t + 0.09);
  const clank = ctx.createOscillator(); clank.type = 'square';
  clank.frequency.setValueAtTime(380, t);
  clank.frequency.exponentialRampToValueAtTime(170, t + 0.045);
  const kg = ctx.createGain();
  kg.gain.setValueAtTime(0.0001, t);
  kg.gain.exponentialRampToValueAtTime(0.30, t + 0.004);
  kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
  clank.connect(kg).connect(out); clank.start(t); clank.stop(t + 0.09);
}
/* And the parry: a bright struck-steel ring, two partials a fifth apart so
 * it reads as a bell rather than a beep, over a hard transient. This is the
 * sound the player is trying to make happen. */
function sfxParry() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain(); out.gain.value = 0.9; out.connect(sfxOut());
  const hit = noiseBurst(0.05, (x) => Math.pow(1 - x, 6));
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600;
  const hg = ctx.createGain(); hg.gain.value = 0.55;
  hit.connect(hp).connect(hg).connect(out); hit.start(t); hit.stop(t + 0.05);
  for (const [f, g0, dur] of [[1180, 0.30, 0.62], [1770, 0.17, 0.44], [3140, 0.09, 0.3]]) {
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(f * 1.02, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(g0, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
}
function sfxCrabTell() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const rasp = noiseBurst(CRAB_WIND, (x) => (0.35 + 0.65 * Math.random()) * Math.min(1, x * 3.5) * (1 - x * 0.25));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.2;
  bp.frequency.setValueAtTime(700, t);
  bp.frequency.exponentialRampToValueAtTime(2400, t + CRAB_WIND);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.15, t + CRAB_WIND * 0.8);
  g.gain.exponentialRampToValueAtTime(0.02, t + CRAB_WIND);
  rasp.connect(bp).connect(g).connect(sfxOut());
  rasp.start(t); rasp.stop(t + CRAB_WIND);
  // and a low swell under it, so it carries when the surf is loud
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(48, t);
  o.frequency.exponentialRampToValueAtTime(96, t + CRAB_WIND);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.075, t + CRAB_WIND * 0.85);
  og.gain.exponentialRampToValueAtTime(0.0001, t + CRAB_WIND + 0.05);
  o.connect(lp).connect(og).connect(sfxOut());
  o.start(t); o.stop(t + CRAB_WIND + 0.06);
}
/* The blade landing on shell — the first half of the kill, played under the
 * hitstop while the crab is still there. sfxCrabDie() is the second half, and
 * fires when it actually comes apart. Splitting them is what stops the kill
 * being one undifferentiated crunch. */
function sfxCrabHit() {
  const ctx = audioCtx; if (!ctx) return;
  if (playSample('fleshHit', 0.5, 0.07, 0.86)) return;
  const t = ctx.currentTime;
  const body = noiseBurst(0.13, (x) => Math.pow(1 - x, 2.0));
  const bf = ctx.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 340;
  const bg = ctx.createGain(); bg.gain.value = 0.5;
  body.connect(bf).connect(bg).connect(sfxOut());
  body.start(t); body.stop(t + 0.13);
  const crack = noiseBurst(0.09, (x) => Math.pow(1 - x, 1.2) * Math.random());
  const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 1500; cf.Q.value = 1.1;
  const cg = ctx.createGain(); cg.gain.value = 0.3;
  crack.connect(cf).connect(cg).connect(sfxOut());
  crack.start(t); crack.stop(t + 0.09);
}
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
function sfxCrabDie(withSample = true) {
  const ctx = audioCtx; if (!ctx) return;
  // the recorded wet impact; the synth shell-crack still layers under it.
  // Skipped when it follows sfxCrabHit() — the sample 80 ms after itself is
  // not two beats, it is one beat with a stutter in it.
  if (withSample) playSample('fleshHit', 1.0, 0.07);
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
/* Crouch. A toggle on Ctrl, not a hold — you crawl under the pier for as
 * long as it takes to come out the other side, and holding a key for that
 * is worse than pressing one twice. The eye drops to CROUCH_EYE and the
 * body with it, which is what lets you under the boards; `playerHeight()`
 * is the standing clearance every overhead test asks for. */
const CROUCH_EYE = 0.85;
let crouching = false, crouchT = 0;              // 0 stood up, 1 fully down
const playerEye = () => EYE_HEIGHT + (CROUCH_EYE - EYE_HEIGHT) * crouchT;
const playerHeight = () => playerEye() + 0.18;   // eye to the top of the head
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
// The drainage tunnel home — the storm-drain outfall up the beach behind
// you, and the chamber somebody lives in at the end of it. Separate from
// the sand wall. The bore here is a plain circular pipe, so the collision
// is a radial clamp about its axis; the chamber is a box clamp. Runs
// *after* updateTower so it gets the last word on groundY.
// ------------------------------------------------------------------
const DRAIN_X = CLIFF_BLOCK_X;      // the mouth sits exactly on the cliff clamp
const DRAIN_Z = 34;                 // behind you: the walk goes -Z
const drainTunnel = makeDrainageTunnelHome({
  // the scour outside is heaped beach sand, so it uses the beach's own
  // material — a bespoke colour reads as pale slabs dropped on the sand
  sandMat,
  wetSandMat: (() => {
    const m = sandMat.clone();
    m.color = new THREE.Color(0x66718b); m.emissive = new THREE.Color(0x232c42);
    m.roughness = 0.72; m.metalness = 0.06; m.side = THREE.DoubleSide;
    return m;
  })(),
});
drainTunnel.position.set(DRAIN_X, 0, DRAIN_Z);
scene.add(drainTunnel);
const DN = drainTunnel.userData.nav;

// ------------------------------------------------------------------
// The stuck gate at the back of the drain
// ------------------------------------------------------------------
/* The outlet in the chamber's back wall is barred and the bars do not move.
 * What you *can* do is get your face against them and look, and that is the
 * whole of this: press E, the camera leans in over the last half metre and
 * the FOV squeezes from 107 down to 19 — which is the zoom, and it is also
 * what shuts the room out of frame so there is nothing to look at but the
 * bore. Five metres of ribbed pipe run back into the hill behind the grille.
 *
 * Nothing is down there. Then, about a second and a half after you settle,
 * there is: two eyes, small and pale and a long way in, fading up out of the
 * black rather than switching on. They blink at their own pace, drift a
 * little, and once in a while tilt. There is no reveal past that, no monster
 * and no jump — the thing that works is that it is *far away*, it is looking
 * back, and you have to decide to keep looking at it.
 *
 * The audio does most of the rest. A cave drone, a slow tail of dripping,
 * and the whisper track already in the assets folder run through a heavy
 * lowpass and a delay so it reads as somebody muttering to himself round a
 * bend, too far off to make out and never quite still.
 *
 * The camera is driven as an absolute override at the tail of update(), so
 * the physics that ran earlier in the frame is simply overwritten; the exact
 * position and orientation you leaned from are stored and restored on exit,
 * and `_shakePrev` is cleared each frame so the trauma shake can't leave a
 * stale offset behind when you come back out.
 */
const PEEK_FOV = 15;
const PEEK_IN = 0.9, PEEK_OUT = 0.45;      // seconds to lean in / back out
let peeking = false, peekLeaving = false, peekT = 0, peekHeld = 0;
let gateEyes = null, eyesSeen = false;   // seen once, never again this game
// How far down the throat they are. Further than they were: at 3.6 m they
// were close enough to be a face looking back, and the whole point is that
// you are not sure there is anything there at all.
const EYES_Z = -5.4;
const _peekFrom = new THREE.Vector3(), _peekTo = new THREE.Vector3();
const _peekFromQ = new THREE.Quaternion(), _peekToQ = new THREE.Quaternion();
const _peekHome = new THREE.Vector3(), _peekHomeQ = new THREE.Quaternion();
const _pk = new THREE.Vector3(), _pk2 = new THREE.Vector3();

/* The eyes are a drawing — Ethan's, a pair of eyes in ink on white — knocked
 * out to alpha by tools/knockout.py into assets/eyes.png and put on a plane
 * down the pipe. Not a model, not lit: a MeshBasicMaterial, tinted down so
 * white paper reads as pale skin in a black drain, with the darkness of the
 * ink doing the rest. They are the size of a real pair of eyes, 2.6 m off,
 * fade up 1.5 s after you settle, blink, drift, tilt, creep half a metre
 * closer, and then are gone between one frame and the next. */
const EYES_W = 0.19;                      // the drawing, edge to edge, in metres
let gateEyesTex = null;
function makeGateEyes(F) {
  const G = new THREE.Group();
  G.position.set(0, -0.02, EYES_Z);
  G.userData = { eyes: [], mats: [], blink: 0, blinkIn: 2.2, baseY: -0.02,
                 ready: false, gone: false, stay: 0, stayFor: 3 };
  texLoader.load('assets/eyes.png', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    gateEyesTex = tex;
    const ar = tex.image.height / tex.image.width;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false, fog: false,
      // the tint IS the brightness: white paper at 0x6e7686 is the grey of a
      // face that has been in the dark a long time
      color: 0x4e5562, side: THREE.DoubleSide,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(EYES_W, EYES_W * ar), mat);
    quad.position.z = 0.001;
    G.userData.eyes.push(quad); G.userData.mats.push(mat);
    G.add(quad);
    G.userData.ready = true;
  }, undefined, () => { /* no file yet: the gate simply shows nothing */ });
  /* Something for them to be set in. Almost black, so you never actually see
   * a head — but it occludes the ribs behind it, and that missing ring is
   * what tells you the eyes are attached to a body rather than floating. */
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x05070b, fog: false }));
  head.scale.set(1.0, 1.35, 0.8);
  head.position.set(0, -0.02, -0.09);
  G.add(head);
  G.visible = false;
  F.add(G);
  return G;
}

// ---- the sound down the pipe ---------------------------------------
let peekAudio = null, peekVoiceEl = null, peekVoiceNode = null;
function startPeekAudio() {
  const ctx = audioCtx; if (!ctx) return;
  /* Built once and kept. createMediaElementSource() can only be called once
   * per element, and re-running the graph would stack a second filter chain
   * off the same source every time you looked in — the whispers getting
   * louder on each peek. Later peeks just ramp the gain and hit play again. */
  if (peekAudio) {
    peekAudio.gain.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
    peekAudio.dripIn = 1.4;
    if (peekVoiceEl) peekVoiceEl.play().catch(() => {});
    return;
  }
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(sfxOut());
  // the cave: brown noise under a low resonance, breathing very slowly
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < d.length; i++) { lp = lp * 0.9975 + (Math.random() * 2 - 1) * 0.003; d[i] = lp * 9; }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 210;
  const res = ctx.createBiquadFilter(); res.type = 'bandpass'; res.frequency.value = 58; res.Q.value = 5.5;
  const resG = ctx.createGain(); resG.gain.value = 0.9;
  const breath = ctx.createOscillator(); breath.frequency.value = 0.055;
  const breathG = ctx.createGain(); breathG.gain.value = 0.45;
  breath.connect(breathG).connect(resG.gain);
  const room = ctx.createGain(); room.gain.value = 0.55;
  src.connect(low).connect(room).connect(gain);
  src.connect(res).connect(resG).connect(gain);
  src.start(); breath.start();

  /* Him. The whisper recordings the shell already uses, but pushed a long
   * way down the pipe: most of the top end gone, and a pair of delays with
   * feedback so every phrase comes back off the walls a beat later. That
   * doubling is what makes it read as one person talking to himself in a
   * space, rather than as a sound effect. */
  const voice = ctx.createGain(); voice.gain.value = 0.115;
  voice.connect(gain);
  try {
    if (!peekVoiceEl) peekVoiceEl = new Audio('assets/whisper1.m4a');
    peekVoiceEl.loop = true;
    peekVoiceEl.currentTime = 0;
    if (!peekVoiceNode) peekVoiceNode = ctx.createMediaElementSource(peekVoiceEl);
    const lpv = ctx.createBiquadFilter(); lpv.type = 'lowpass'; lpv.frequency.value = 620;
    const hpv = ctx.createBiquadFilter(); hpv.type = 'highpass'; hpv.frequency.value = 190;
    const dl = ctx.createDelay(1.5); dl.delayTime.value = 0.29;
    const fb = ctx.createGain(); fb.gain.value = 0.42;
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    dl.connect(fb).connect(dl);
    peekVoiceNode.connect(lpv).connect(hpv);
    hpv.connect(voice);
    hpv.connect(dl).connect(wet).connect(voice);
    peekVoiceEl.play().catch(() => {});
  } catch (e) {}
  gain.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
  peekAudio = { gain, dripIn: 1.4 };
}
function stopPeekAudio() {
  if (!peekAudio || !audioCtx) return;
  peekAudio.gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.22);
  if (peekVoiceEl) { try { peekVoiceEl.pause(); } catch (e) {} }
}

// ---- leaning in ------------------------------------------------------
function startPeek() {
  const F = drainTunnel.userData.outlet;
  if (peeking || !F || frozen()) return;
  if (!gateEyes) gateEyes = makeGateEyes(F);
  peeking = true; peekLeaving = false; peekT = 0; peekHeld = 0;
  // visible at zero opacity from the first frame of the lean: the draw is
  // free and it gets the material compiled while you are still moving
  gateEyes.visible = true;
  for (const m of gateEyes.userData.mats) m.opacity = 0;
  const u = gateEyes.userData;
  /* Once. The first time you look in, they are there; every time after,
   * nothing is — and you know it was there. A second showing would make it a
   * feature of the gate. The first made it a thing that happened to you. */
  u.gone = eyesSeen; u.stay = 0; u.stayFor = 2.4 + Math.random() * 1.6;
  if (eyesSeen) gateEyes.visible = false;
  gateEyes.position.z = EYES_Z;
  gateEyes.userData.blink = 0;
  gateEyes.userData.blinkIn = 2.2;
  _peekHome.copy(camera.position); _peekHomeQ.copy(camera.quaternion);
  _peekFrom.copy(camera.position); _peekFromQ.copy(camera.quaternion);
  /* Where to stop. Closer than this and the crop threads clean between the
   * middle two bars and you are simply in the pipe — the grille has to stay
   * in frame, because looking THROUGH something you cannot open is the whole
   * point. At 0.78 m back, FOV 24 puts the bars and the concrete round the
   * bore just inside the edges. The axis is local +Z out of the grille. */
  F.localToWorld(_peekTo.set(0, 0, 0.78));
  F.localToWorld(_pk.set(0, 0, -5.0));
  _lookM.lookAt(_peekTo, _pk, camera.up);
  _peekToQ.setFromRotationMatrix(_lookM);
  /* The lock stays. Dropping it here fired pointerlockchange, which treats
   * any exit it didn't cause as "the user hit Esc" and opened the settings
   * menu on top of the peek — every time you pressed E on the gate. Mouse
   * look is already gated by frozen(), which includes peeking, so holding the
   * lock costs nothing and the camera stays where the lean puts it. */
  if (held) dropHeld();
  hovered = null;
  crosshair.className = '';
  crosshair.style.display = 'none';      // nothing to aim at down there
  setPrompt(kbd('E') + 'Back away');
  startPeekAudio();
}
function endPeek() {
  if (!peeking || peekLeaving) return;
  peekLeaving = true;
  setPrompt('');
  stopPeekAudio();
}
function updatePeek(dt) {
  if (!peeking) return;
  peekT = THREE.MathUtils.clamp(peekT + (peekLeaving ? -dt / PEEK_OUT : dt / PEEK_IN), 0, 1);
  const e = easeInOutCubic(peekT);
  camera.position.lerpVectors(_peekFrom, _peekTo, e);
  camera.quaternion.slerpQuaternions(_peekFromQ, _peekToQ, e);
  _shakePrev.set(0, 0, 0);       // nothing to unwind next frame

  if (!peekLeaving && peekT >= 1) peekHeld += dt;
  updateGateEyes(dt);

  // a drip a long way down the pipe, every so often
  if (peekAudio && !peekLeaving) {
    peekAudio.dripIn -= dt;
    if (peekAudio.dripIn <= 0) {
      peekAudio.dripIn = 2.4 + Math.random() * 4.5;
      sfxDrip(0.20 + Math.random() * 0.16, (Math.random() - 0.5) * 0.5);
    }
  }
  if (peekLeaving && peekT <= 0) {
    peeking = false; peekLeaving = false; peekHeld = 0;
    crosshair.style.display = '';
    camera.position.copy(_peekHome);
    camera.quaternion.copy(_peekHomeQ);
    if (gateEyes) gateEyes.visible = false;
  }
}
function updateGateEyes(dt) {
  const G = gateEyes; if (!G || !G.userData.ready) return;
  const u = G.userData;
  if (u.gone) return;
  // they do not greet you: nothing is there, and then something is
  const fade = THREE.MathUtils.clamp((peekHeld - 1.5) / 2.6, 0, 1);
  if (fade > 0.35) eyesSeen = true;                  // that counts as seen
  if (fade >= 1) u.stay += dt;
  if (u.stay >= u.stayFor) {
    // and then nothing is, again. Between one frame and the next.
    u.gone = true;
    G.visible = false;
    return;
  }
  for (const m of u.mats) m.opacity = fade * 0.55;    // never more than half there

  u.blinkIn -= dt;
  if (u.blinkIn <= 0) { u.blink = 1; u.blinkIn = 1.5 + Math.random() * 4.2; }
  if (u.blink > 0) u.blink = Math.max(0, u.blink - dt / 0.13);
  // blink starts and ends open and shuts through the middle of its window
  const open = u.blink > 0 ? 1 - Math.sin(u.blink * Math.PI) : 1;
  for (const e of u.eyes) e.scale.y = Math.max(0.05, open);

  const t = peekHeld;
  // he is not still: a slow sway, a slower shift of weight, and after a
  // while the head goes over to one side and stays there
  G.position.x = Math.sin(t * 0.41) * 0.014 + Math.sin(t * 0.17 + 1.1) * 0.020;
  G.position.y = u.baseY + Math.sin(t * 0.29 + 2.2) * 0.008;
  G.rotation.z = THREE.MathUtils.clamp((t - 7) / 6, 0, 1) * 0.30;
  // and over the time he is there, he comes a metre up the pipe toward you
  G.position.z = -3.6 + 0.45 * THREE.MathUtils.clamp(u.stay / u.stayFor, 0, 1);
}

if (drainTunnel.userData.outlet) {
  addInteractable(drainTunnel.userData.outlet, 'Look inside', 'default', {
    onActivate: () => startPeek(),
  });
  // Built now, not on the first peek: a lazy build compiled two new shaders
  // and uploaded the geometry on the frame the eyes appeared, which is the
  // one frame in the game that must not hitch.
  gateEyes = makeGateEyes(drainTunnel.userData.outlet);
}

// ---- a full bottle of water, left by the bed in the chamber ----------
const waterBottle = makeWaterBottle();
const waterBottleWorld = new THREE.Group();
waterBottleWorld.add(waterBottle);
{
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.20, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy';
  waterBottleWorld.add(hit);
}
// keyed off the room, not a fixed offset — a longer bore used to leave
// the bottle buried in the pipe wall
waterBottleWorld.position.set(DRAIN_X + DN.ROOM_X1 - 2.6, DN.FLOOR_Y, DRAIN_Z - DN.ROOM_HZ + 1.55);
waterBottleWorld.rotation.set(0, 0.7, 0);
scene.add(waterBottleWorld);
addItemShine(waterBottleWorld, { size: 0.5, height: 0.10 });
let waterBottleTaken = false;
const waterBottleItem = {
  id: 'waterbottle', name: 'Bottle of water', icon: makeWaterBottleIcon(),
  use: () => toggleEquip(waterBottleItem),
};
holdable(waterBottleItem, waterBottle, { scale: 0.85, pos: [0, -0.05, 0], rot: [0.1, 0.5, 0.15] });
addInteractable(waterBottleWorld, 'Take the bottle of water', 'inventory', {
  onActivate: () => {
    if (waterBottleTaken) return;
    waterBottleTaken = true;
    sfxThud(0.03);
    scene.remove(waterBottleWorld);
    hovered = null;
    addToInventory(waterBottleItem);
  },
});


// Punch the cliff open at the mouth. World-space, like shoreLine(z,t) — the
// cliff is snapped back onto the player in Z every frame, and a discard in
// local space would slide along with it.
// CHAINED, not assigned. onBeforeCompile is a single slot: assigning to it
// silently throws away anything already installed on this material, which is
// exactly how the other tunnel's window got wiped out once. Call whatever is
// there first, then add this one — distinct varying names, and both append
// after <clipping_planes_fragment>, so every discard survives.
const prevCliffCompile = cliff.material.onBeforeCompile;
cliff.material.onBeforeCompile = function (sh, rndr) {
  if (prevCliffCompile) prevCliffCompile.call(this, sh, rndr);
  sh.uniforms.uDrainZ = { value: DRAIN_Z };
  sh.vertexShader = 'varying vec3 vDrainW;\n' + sh.vertexShader.replace(
    '#include <fog_vertex>',
    '#include <fog_vertex>\n  vDrainW = (modelMatrix * vec4(transformed, 1.0)).xyz;'
  );
  sh.fragmentShader = 'varying vec3 vDrainW;\nuniform float uDrainZ;\n' + sh.fragmentShader.replace(
    '#include <clipping_planes_fragment>',
    '#include <clipping_planes_fragment>\n  if (abs(vDrainW.z - uDrainZ) < 2.6 && vDrainW.y < 3.3) discard;'
  );
};
cliff.material.needsUpdate = true;

// The structure is frustum-culled until you turn round, and the frame it
// first becomes visible pays for compiling every one of its shader programs
// *and* uploading ~400 geometries — that was the quarter-second hitch.
// compile() only does the programs, so warmDrain() renders it once into a
// tiny offscreen target to force the buffer uploads too. Runs on the first
// animate frame, while the title card is still covering the screen.
let drainWarmed = false, drainWarmError = null;
function warmDrain() {
  if (drainWarmed) return;
  drainWarmed = true;
  const restore = [];
  try {
    // Frustum culling is the trap here: a warm-up render only uploads what
    // the warm camera can actually see, so anything culled still costs you
    // the first time you really look at it. Switch culling off for the pass
    // and every mesh is drawn — and therefore uploaded — exactly once.
    drainTunnel.traverse((o) => {
      if (o.isMesh) { restore.push([o, o.frustumCulled]); o.frustumCulled = false; }
    });
    const rt = new THREE.WebGLRenderTarget(8, 8);
    const cam = new THREE.PerspectiveCamera(75, 1, 0.1, 400);
    cam.position.set(DRAIN_X - 12, 3.0, DRAIN_Z);
    cam.lookAt(DRAIN_X + 20, 1.4, DRAIN_Z);
    cam.updateMatrixWorld(true);
    renderer.compile(scene, cam);
    const prevTarget = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = true;
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    // and again from inside, so the chamber's own lighting variant is built
    cam.position.set(DRAIN_X + DN.ROOM_X0 + 1, 1.7, DRAIN_Z);
    cam.lookAt(DRAIN_X + DN.ROOM_X1, 1.6, DRAIN_Z);
    cam.updateMatrixWorld(true);
    renderer.render(scene, cam);
    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;
    rt.dispose();
  } catch (e) {
    drainWarmError = e;                   // surfaced on __bw, not swallowed
  } finally {
    for (const [o, v] of restore) o.frustumCulled = v;
  }
}

let insideDrain = false, drainMix = 0, mouthNear = 0;

// ---- visible drips: a drop falls, and the sound fires when it lands ----
const dripMat = new THREE.MeshBasicMaterial({ color: 0x9dc2d6, transparent: true, opacity: 0.66, fog: false });
const dripGeo = new THREE.SphereGeometry(0.017, 5, 4);
const drainDrips = drainTunnel.userData.drips.map(([lx, ly, lz]) => {
  const mesh = new THREE.Mesh(dripGeo, dripMat);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, x: DRAIN_X + lx, y0: ly, z: DRAIN_Z + lz, y: ly, v: 0,
           wait: 1 + Math.random() * 5, falling: false };
});
const _dripV = new THREE.Vector3(), _dripR = new THREE.Vector3();
function updateDrainDrips(dt) {
  const live = drainMix > 0.04;
  for (const d of drainDrips) {
    if (!d.falling) {
      if (!live) { d.mesh.visible = false; continue; }
      d.wait -= dt;
      if (d.wait <= 0) { d.falling = true; d.y = d.y0; d.v = 0; d.mesh.visible = true; }
      continue;
    }
    d.v += 9.81 * dt;
    d.y -= d.v * dt;
    d.mesh.position.set(d.x, d.y, d.z);
    d.mesh.scale.set(1, 1 + Math.min(3.5, d.v * 0.55), 1);   // stretches as it falls
    if (d.y <= DN.FLOOR_Y + 0.01) {
      d.falling = false;
      d.mesh.visible = false;
      d.wait = 1.4 + Math.random() * 5.5;
      // pan it by where the drop is relative to where you're looking
      _dripV.set(d.x - camera.position.x, 0, d.z - camera.position.z);
      const dist = _dripV.length() || 1;
      camera.getWorldDirection(_dripR); _dripR.y = 0; _dripR.normalize();
      _dripR.cross(camera.up);
      const pan = THREE.MathUtils.clamp(_dripV.dot(_dripR) / dist, -1, 1);
      sfxDrip(drainMix * (0.85 - Math.min(0.6, dist * 0.045)), pan);
    }
  }
}

// ---- the lamps are old: let them stutter ------------------------------
const drainLamps = [];
drainTunnel.traverse(o => { if (o.isPointLight) drainLamps.push({ l: o, base: o.intensity, seed: Math.random() * 100 }); });
let flickerT = 0;
function updateDrainFlicker(dt) {
  flickerT += dt;
  for (const f of drainLamps) {
    const t = flickerT + f.seed;
    // a slow sag with an occasional hard stutter
    let k = 0.90 + 0.10 * Math.sin(t * 2.3) * Math.sin(t * 0.71);
    const s = Math.sin(t * 13.7) * Math.sin(t * 5.1);
    if (s > 0.95) k *= 0.58;          // a stutter, not a blackout — you still have to walk it
    f.l.intensity = f.base * k;
  }
}
let beaconT = 0;
function updateDrain(dt) {
  // the beacon blinks whether or not you're anywhere near — it's the thing
  // that tells you the structure is down there at all, so it runs before
  // any of the distance early-outs below
  const bc = drainTunnel.userData.beacon;
  if (bc) {
    beaconT += dt;
    const on = (beaconT % 2.2) < 0.95;
    const k = on ? 1 : 0.045;
    bc.bulb.material.color.setRGB(k, k * 0.12, k * 0.07);
    bc.halo.visible = on;
  }
  const lx = camera.position.x - DRAIN_X;
  const lz = camera.position.z - DRAIN_Z;
  mouthNear = drainMouthProximity();
  updateDrainDrips(dt);
  if (drainMix > 0.02) updateDrainFlicker(dt);

  // far enough away that none of this applies
  if (lx < -3 || lx > DN.ROOM_X1 + 3 || Math.abs(lz) > 9) {
    insideDrain = false;
    drainMix = Math.max(0, drainMix - dt * 1.2);
    updateDrainAudio(dt);
    return;
  }

  // lined up with the hole? that's the only way through the headwall
  const lined = Math.abs(lz) < DN.BORE_R - PLAYER_R - 0.1;

  if (lx > -0.5 && !lined && !insideDrain) {
    camera.position.x = DRAIN_X - 0.5;      // walked into the concrete face
    drainMix = Math.max(0, drainMix - dt * 1.2);
    updateDrainAudio(dt);
    return;
  }

  if (lx > -0.2) {
    insideDrain = true;
    // the back of the chamber. Clamp it here, *not* by falling out of the
    // inside-branch — dropping insideDrain hands you straight back to the
    // cliff clamp, which teleports you to the mouth.
    if (lx > DN.ROOM_X1 - PLAYER_R) {
      camera.position.x = DRAIN_X + DN.ROOM_X1 - PLAYER_R;
    }
    if (lx < DN.DOOR_X - 0.1) {
      // in the pipe: clamp off the curving wall, funnelling in to the
      // doorway over the last couple of metres so it never jerks you sideways
      const wide = DN.BORE_R * 0.76 - PLAYER_R * 0.5;
      const narrow = DN.doorHalfZ - PLAYER_R;
      const f = THREE.MathUtils.clamp((lx - (DN.DOOR_X - 2.6)) / 2.5, 0, 1);
      const lim = THREE.MathUtils.lerp(wide, narrow, f);
      camera.position.z = DRAIN_Z + THREE.MathUtils.clamp(lz, -lim, lim);
    } else if (lx < DN.ROOM_X0 + PLAYER_R) {
      // squeezing through the doorway
      const lim = DN.doorHalfZ - PLAYER_R;
      camera.position.z = DRAIN_Z + THREE.MathUtils.clamp(lz, -lim, lim);
    } else {
      const lim = DN.ROOM_HZ - PLAYER_R;
      camera.position.z = DRAIN_Z + THREE.MathUtils.clamp(lz, -lim, lim);
    }
    pushOutOfDrainProps();
    groundY = DN.FLOOR_Y;
    drainMix = Math.min(1, drainMix + dt * 0.9);
  } else {
    insideDrain = false;                       // back out on the sand
    drainMix = Math.max(0, drainMix - dt * 1.2);
  }
  // how far in you are drives the mix, not just whether you're in
  const depth = THREE.MathUtils.clamp(lx / 4, 0, 1);
  if (insideDrain) drainMix = Math.max(drainMix, depth);
  updateDrainAudio(dt);
}

// the furniture is solid: shove the player out along whichever face is nearest
function pushOutOfDrainProps() {
  const props = DN.props;
  if (!props) return;
  const lx = camera.position.x - DRAIN_X, lz = camera.position.z - DRAIN_Z;
  for (const [x0, z0, x1, z1] of props) {
    const ax0 = x0 - PLAYER_R, ax1 = x1 + PLAYER_R;
    const az0 = z0 - PLAYER_R, az1 = z1 + PLAYER_R;
    if (lx <= ax0 || lx >= ax1 || lz <= az0 || lz >= az1) continue;
    // inside — leave by the shallowest of the four faces
    const dl = lx - ax0, dr = ax1 - lx, db = lz - az0, df = az1 - lz;
    const m = Math.min(dl, dr, db, df);
    if (m === dl) camera.position.x = DRAIN_X + ax0;
    else if (m === dr) camera.position.x = DRAIN_X + ax1;
    else if (m === db) camera.position.z = DRAIN_Z + az0;
    else camera.position.z = DRAIN_Z + az1;
    return;
  }
}

// how close you are to the mouth, inside or out — drives the water trickle
function drainMouthProximity() {
  const dx = camera.position.x - DRAIN_X, dz = camera.position.z - DRAIN_Z;
  const d = Math.hypot(dx * 0.7, dz);
  return THREE.MathUtils.clamp(1 - (d - 3) / 9, 0, 1);
}

// ---- sewer ambience: a resonant pipe drone plus drips with a slapback ----
let drainAudio = null, dripNext = 2;
function startDrainAudio() {
  if (drainAudio || !audioCtx) return;
  const ctx = audioCtx;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(sfxOut());
  // brown-ish noise, then a narrow resonance — the note a big pipe sings
  const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < d.length; i++) { lp = lp * 0.996 + (Math.random() * 2 - 1) * 0.004; d[i] = lp * 7; }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 104; bp.Q.value = 3.4;
  const air = ctx.createBiquadFilter(); air.type = 'bandpass'; air.frequency.value = 620; air.Q.value = 1.1;
  const airG = ctx.createGain(); airG.gain.value = 0.28;
  // a slow breath through it
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.1;
  lfo.connect(lfoG).connect(airG.gain);
  src.connect(bp).connect(gain);
  src.connect(air).connect(airG).connect(gain);
  // separate layer: running water at the mouth, on its own gain
  const trickle = ctx.createGain(); trickle.gain.value = 0;
  trickle.connect(sfxOut());
  const tf = ctx.createBiquadFilter(); tf.type = 'bandpass'; tf.frequency.value = 1750; tf.Q.value = 0.8;
  const th = ctx.createBiquadFilter(); th.type = 'highpass'; th.frequency.value = 700;
  const tw = ctx.createOscillator(); tw.frequency.value = 0.23;      // it burbles
  const twg = ctx.createGain(); twg.gain.value = 320;
  tw.connect(twg).connect(tf.frequency);
  const tsrc = ctx.createBufferSource(); tsrc.buffer = buf; tsrc.loop = true;
  tsrc.connect(th).connect(tf).connect(trickle);
  tsrc.start(); tw.start();
  src.start(); lfo.start();
  drainAudio = { gain, trickle };
}
function sfxDrip(vol = 1, pan = 0) {
  const ctx = audioCtx; if (!ctx || !drainAudio) return;
  // exponentialRampToValueAtTime throws on a zero target, and vol can reach
  // zero when the mix decays while a drop is still falling
  vol = Math.min(1, vol);
  if (!(vol > 0.004)) return;
  const t = ctx.currentTime;
  let out = drainAudio.gain;
  if (ctx.createStereoPanner) {
    const sp = ctx.createStereoPanner();
    sp.pan.value = THREE.MathUtils.clamp(pan, -1, 1);
    sp.connect(drainAudio.gain);
    out = sp;
    setTimeout(() => { try { sp.disconnect(); } catch (e) {} }, 2800);
  }
  // a drip is a pitch that *rises* as the cavity closes — sweep it up
  const f = 480 + Math.random() * 760;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(f * 0.5, t);
  o.frequency.exponentialRampToValueAtTime(f * 1.95, t + 0.038);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5 * vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
  // slapback off the pipe walls
  const dl = ctx.createDelay(1); dl.delayTime.value = 0.11 + Math.random() * 0.07;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const wet = ctx.createGain(); wet.gain.value = 0.55;
  dl.connect(fb).connect(dl);
  o.connect(g);
  g.connect(out);
  g.connect(dl).connect(wet).connect(out);
  o.start(t); o.stop(t + 0.45);
  setTimeout(() => { try { wet.disconnect(); fb.disconnect(); dl.disconnect(); } catch (e) {} }, 2600);
}
let drainAudioSettled = true;
function updateDrainAudio(dt) {
  if (!audioCtx || !started) return;
  // don't build the drone, or fight the volume sliders, until you're near it
  if (drainMix <= 0.0001) {
    if (drainAudioSettled) return;
    drainAudioSettled = true;
  } else drainAudioSettled = false;
  startDrainAudio();
  if (!drainAudio) return;
  const ctx = audioCtx;
  drainAudio.gain.gain.setTargetAtTime(drainMix * settings.sfxVolume * 0.8, ctx.currentTime, 0.5);
  // duck the surf the further in you get — the sea should fall away behind you
  if (waveBusGain) waveBusGain.gain.setTargetAtTime(settings.waveVolume * (1 - 0.8 * drainMix), ctx.currentTime, 0.6);
  // the trickle of the outfall, loudest where the water leaves the pipe
  if (drainAudio.trickle)
    drainAudio.trickle.gain.setTargetAtTime(mouthNear * settings.sfxVolume * 0.5, ctx.currentTime, 0.4);
}

// ------------------------------------------------------------------
// The wreck — a coaster lying across the beach, blocking the walk. You
// get past it by going through it: in at the breach in the near side,
// up the stair out of the hold, across the deck, and down the ramp of
// torn plate on the far side.
//
// Collision is a floor lookup, not a solid: shipFloorAt() returns the
// highest walkable surface at or just below your feet, so the hold floor
// and the deck can sit above one another at the same (x, z) without the
// two fighting. Anywhere inside the hull with no floor is solid, and you
// get pushed back out the way you came.
// ------------------------------------------------------------------
const SHIP_X = 6, SHIP_Z = -155;
/* THE SECOND CACHE IS PLACED, not rolled. `mounds[1]` is the one with the CD
 * in it, and where a thing is found is half of what it means — so it sits
 * halfway between the wreck and Bradley rather than wherever the spacing
 * happened to drop it. It has to be done HERE and not where the mounds are
 * built: `SHIP_Z` is declared further down the file, and reaching for it up
 * there is a temporal dead zone that takes the whole page with it. Bradley
 * stands ten metres past `mounds[0]`, which is why that is the number. */
if (mounds.length > 1) {
  const bradleyZ = mounds[0].z - 10;
  const m = mounds[1];
  m.z = (SHIP_Z + bradleyZ) / 2;
  m.x = 9.8 + Math.random() * (CLIFF_BLOCK_X - 11.4);
  m.root.position.set(m.x, 0, m.z);
}
const shipwreck = makeShipwreck({ sandMat });
shipwreck.position.set(SHIP_X, 0, SHIP_Z);
scene.add(shipwreck);
const SN = shipwreck.userData.nav;

let onShip = false, inBridge = false;

// ---- the ship's wheel: three detents, port / midships / starboard -------
// Nothing reads it yet; it's here for the puzzle. shipWheel.position is the
// state (-1, 0, 1) and __bw.shipWheel exposes it.
const shipWheel = {
  positions: ['hard to port', 'midships', 'hard to starboard'],
  index: 1,                                   // 0 | 1 | 2, starts midships
  get position() { return this.index - 1; },  // -1 | 0 | 1
  get label() { return this.positions[this.index]; },
};
{
  const w = shipwreck.userData.wheel;
  const WHEEL_STEP = Math.PI * 0.62;          // how far a detent turns it
  let wheelTarget = 0, wheelSpin = 0;
  const setWheel = (i) => {
    shipWheel.index = THREE.MathUtils.clamp(i, 0, 2);
    wheelTarget = (shipWheel.index - 1) * WHEEL_STEP;
  };
  shipWheel.set = setWheel;
  // the wheel is turned about its own axis, which after the group's
  // rotation.y is its local Z
  shipWheel._tick = (dt) => {
    wheelSpin += (wheelTarget - wheelSpin) * Math.min(1, dt * 6);
    w.rotation.z = wheelSpin;
  };
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy';
  w.add(hit);
  // The hover label carries the state — no new UI needed, and you can read
  // where the wheel is standing without touching it.
  const relabel = () => { if (shipWheel._it) shipWheel._it.label = 'Turn the wheel \u2014 ' + shipWheel.label; };
  addInteractable(w, 'Turn the wheel \u2014 midships', 'default', {
    onActivate: () => {
      setWheel(shipWheel.index >= 2 ? 0 : shipWheel.index + 1);
      relabel();
      sfxWheelTurn();
    },
  });
  shipWheel._it = interactables[interactables.length - 1];
  shipWheel.relabel = relabel;
}


const _lxc = (lx) => THREE.MathUtils.clamp(lx, -SN.HALF, SN.HALF);
const deckHalfAt = (lx) => SN.beamAt(_lxc(lx)) * SN.sectionK(1) * SN.flareAt(_lxc(lx), 1) * 0.98;
// she has sheer, so the deck is not one height — the walkable surface has to
// track the plating or you end up floating over the bow and sunk at midships
const deckYAt = (lx) => SN.DECK_Y + SN.sheerAt(_lxc(lx));

function shipFloorAt(lx, lz, feet) {
  const tol = feet + 0.45;
  let best = null;
  const take = (y) => { if (y <= tol && (best === null || y > best)) best = y; };

  // hold floor, and the mouth of the breach outside it
  const inHold = lx > SN.HOLD_X0 && lx < SN.HOLD_X1 && Math.abs(lz) < SN.HOLD_HZ;
  const inBreach = lx > SN.BREACH_X0 && lx < SN.BREACH_X1 && lz >= SN.HOLD_HZ && lz < SN.HOLD_HZ + 1.8;
  if (inHold || inBreach) take(SN.HOLD_Y);

  // the stair out of the hold
  if (lx > SN.STAIR_X0 && lx < SN.STAIR_X1 && lz > SN.STAIR_Z0 && lz < SN.STAIR_Z1) {
    const t = (lx - SN.STAIR_X0) / (SN.STAIR_X1 - SN.STAIR_X0);
    take(SN.HOLD_Y + t * (deckYAt(SN.STAIR_X1) - SN.HOLD_Y));
  }

  // the deck, minus the open hatch and the stair well
  if (Math.abs(lx) < SN.HALF && Math.abs(lz) < deckHalfAt(lx)) {
    const inHatch = lx > SN.HATCH_X0 && lx < SN.HATCH_X1 && Math.abs(lz) < SN.HATCH_HZ;
    const inWell = lx > SN.STAIR_X0 && lx < SN.STAIR_X1 && lz > SN.STAIR_Z0 && lz < SN.STAIR_Z1;
    if (!inHatch && !inWell) take(deckYAt(lx));
  }

  // the ramp down the far side
  if (lx > SN.RAMP_X0 && lx < SN.RAMP_X1 && lz > SN.RAMP_Z0 && lz < SN.RAMP_Z1) {
    const t = (lz - SN.RAMP_Z0) / (SN.RAMP_Z1 - SN.RAMP_Z0);
    take(t * deckYAt((SN.RAMP_X0 + SN.RAMP_X1) / 2));
  }
  return best;
}

function updateShip(dt) {
  shipWheel._tick(dt);
  const lx = camera.position.x - SHIP_X;
  const lz = camera.position.z - SHIP_Z;
  const reach = SN.HALF + 1.0;
  if (Math.abs(lx) > reach || Math.abs(lz) > 9) { onShip = false; inBridge = false; return; }

  const feet = camBaseY - playerEye();
  const floor = shipFloorAt(lx, lz, feet);
  if (floor !== null) {
    onShip = true;
    groundY = floor;
    // Which clamp applies is decided by *where you are*, not by how high the
    // floor is. Keying it off height alone made the hold's walls apply to the
    // exit ramp too, and they shoved you back up it every time.
    const onRamp = lx > SN.RAMP_X0 && lx < SN.RAMP_X1
      && lz > SN.RAMP_Z0 && lz < SN.RAMP_Z1;
    const inHold = !onRamp && lx > SN.HOLD_X0 - 0.6 && lx < SN.HOLD_X1 + 0.6
      && lz > -SN.HOLD_HZ - 0.6 && lz < SN.HOLD_HZ + 2.0
      && floor < deckYAt(lx) - 0.5;

    if (onRamp) {
      // stay on the plating; it's a narrow way down
      const rl = (SN.RAMP_X1 - SN.RAMP_X0) / 2 - PLAYER_R * 0.5;
      const rc = SHIP_X + (SN.RAMP_X0 + SN.RAMP_X1) / 2;
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, rc - rl, rc + rl);
    } else if (inHold) {
      const hz = SN.HOLD_HZ - PLAYER_R;
      const inBreach = lx > SN.BREACH_X0 && lx < SN.BREACH_X1;
      if (lz > hz && !inBreach) camera.position.z = SHIP_Z + hz;
      if (lz < -hz) camera.position.z = SHIP_Z - hz;
      camera.position.x = THREE.MathUtils.clamp(camera.position.x,
        SHIP_X + SN.HOLD_X0 + PLAYER_R, SHIP_X + SN.HOLD_X1 - PLAYER_R);
    } else if (floor > deckYAt(lx) - 0.35) {
      // on deck: the bulwark keeps you aboard, except where the ramp leaves
      const lim = deckHalfAt(lx) - PLAYER_R;
      const atRamp = lx > SN.RAMP_X0 - 0.2 && lx < SN.RAMP_X1 + 0.2;
      if (lz > lim) camera.position.z = SHIP_Z + lim;
      else if (lz < -lim && !atRamp) camera.position.z = SHIP_Z - lim;

      // The bridge is a room, not a decal: its walls are solid and the
      // doorway in the forward face is the only way in or out. Tracked with
      // a flag because a box test alone can't tell "coming in" from "going
      // out" once you're standing in the opening.
      const atDoor = Math.abs(lz) < 0.5;
      const bz = SN.BR_HZ - PLAYER_R;
      if (!inBridge) {
        if (lx > SN.BR_X0 - PLAYER_R && lx < SN.BR_X1 && Math.abs(lz) < SN.BR_HZ) {
          if (atDoor) inBridge = true;
          else camera.position.x = SHIP_X + SN.BR_X0 - PLAYER_R;
        }
      } else {
        camera.position.x = Math.min(camera.position.x, SHIP_X + SN.BR_X1 - PLAYER_R);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, SHIP_Z - bz, SHIP_Z + bz);
        if (lx < SN.BR_X0) {
          if (atDoor) inBridge = false;
          else camera.position.x = SHIP_X + SN.BR_X0 + PLAYER_R * 0.5;
        }
      }
    } else {
      inBridge = false;
    }
    return;
  }

  // no floor here: if you're inside the hull, it's solid — push back out
  onShip = false;
  const hullHalf = deckHalfAt(lx) + 0.25;
  if (Math.abs(lx) < SN.HALF + 0.25 && Math.abs(lz) < hullHalf && feet < deckYAt(lx) - 0.2) {
    camera.position.z = SHIP_Z + (lz >= 0 ? hullHalf : -hullHalf);
  }
}

// ------------------------------------------------------------------
// The body bag
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// The dock house. voyoo's "Dock House – Stylized Wooden Pier"
// (assets/dock.glb, every one of its 25 materials with its own three maps,
// cut to 512), sixty metres past the wreck: a pier on piles standing out
// from the cliff foot into the surf, a shed on the boards with a lamp on
// its wall, a boat tied up at the sea end under the lamp post.
//
// The model is built at about 1:2.8 — its door is 65 cm tall — so it is
// scaled up to a door you can walk through, and turned so the shed end is
// landward. It is a FIXED world object like the wreck. You get up onto it
// by the drift: the beach heaped against the land end of the pier, which
// sand does to anything that stands in its way for long enough, and which
// puts the deck at the top of a dune instead of two metres in the air.
// ------------------------------------------------------------------
const DOCK_X = 4, DOCK_Z = -215, DOCK_S = 2.8;
const DOCK_DECK = 0.62 * DOCK_S;                        // top of the boards
const DK = { X0: -2.77, X1: 0.50, Z0: -3.17, Z1: 2.80 };  // the deck, model space
// the shed's walls as thin slabs round its floor, model space, with the
// doorway left out of the seaward face
const DOCK_WALLS = [
  [-2.35, -2.49, -0.47, -2.39],     // back
  [-2.35, -2.49, -2.25, -0.90],     // left
  [-0.57, -2.49, -0.47, -0.90],     // right
  [-2.35, -1.00, -1.14, -0.90],     // front, to the door
  [-0.73, -1.00, -0.47, -0.90],     // front, past the door
];
const DOCK_DRIFT_R = 8.4, DOCK_DRIFT_H = 1.12;   // a bank the pier sits in, not a ramp over it
const DOCK_DRIFT_X = DOCK_X + 3.35 * DOCK_S;
const DOCK_DRIFT_Z = DOCK_Z + ((DK.X0 + DK.X1) / 2) * DOCK_S;
const dock = new THREE.Group();
dock.position.set(DOCK_X, 0, DOCK_Z);
dock.rotation.y = -Math.PI / 2;            // model -z (the shed end) → world +X, the land
dock.scale.setScalar(DOCK_S);
scene.add(dock);
{
  const drift = new THREE.Mesh(makeApron(DOCK_DRIFT_R), sandMat);
  drift.scale.set(DOCK_DRIFT_R, DOCK_DRIFT_H, DOCK_DRIFT_R);
  drift.position.set(DOCK_DRIFT_X, 0, DOCK_DRIFT_Z);
  driftGroup.add(drift);
}
/* The deck as a floor for anything that is not the player: the boards' top
 * at (x, z), or null off the pier. `onPier` is the footprint alone, and it
 * is what stops the surf clamp from dragging a bottle dropped at the sea end
 * back up the beach. */
function dockLocal(wx, wz) {
  return { lx: (wz - DOCK_Z) / DOCK_S, lz: -(wx - DOCK_X) / DOCK_S };
}
/* WHERE THE BOARDS ACTUALLY ARE. This asked whether you stood inside the
 * deck's bounding rectangle, and the pier is not a rectangle — it is an L,
 * narrow along the jetty and wide at the shed. So there was deck underfoot
 * out over open water where you could see there was none: you walked off the
 * end at plank height with the boards knocking under you.
 *
 * The footprint is sampled off the floor mesh ONCE at load, by raycasting
 * down onto it over a grid, and every later question is a lookup. A raycast
 * per frame per prop would be far too much; a 0.35 m grid is 40 x 30 rays
 * paid once. Until the model lands the old rectangle stands in, because
 * `updateDock()` runs from the first frame. */
const DECK_CELL = 0.35;
let deckGrid = null, deckGX0 = 0, deckGZ0 = 0, deckGW = 0, deckGH = 0;
function buildDeckGrid(floorMeshes) {
  const bb = new THREE.Box3();
  for (const m of floorMeshes) bb.expandByObject(m);
  if (!isFinite(bb.min.x)) return;
  deckGX0 = bb.min.x - DECK_CELL; deckGZ0 = bb.min.z - DECK_CELL;
  deckGW = Math.ceil((bb.max.x - deckGX0) / DECK_CELL) + 2;
  deckGH = Math.ceil((bb.max.z - deckGZ0) / DECK_CELL) + 2;
  const grid = new Float32Array(deckGW * deckGH);
  const ray = new THREE.Raycaster();
  ray.far = (bb.max.y - bb.min.y) + 2;
  const down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3();
  for (let ix = 0; ix < deckGW; ix++) {
    for (let iz = 0; iz < deckGH; iz++) {
      from.set(deckGX0 + (ix + 0.5) * DECK_CELL, bb.max.y + 1, deckGZ0 + (iz + 0.5) * DECK_CELL);
      ray.set(from, down);
      const h = ray.intersectObjects(floorMeshes, true)[0];
      if (h) grid[iz * deckGW + ix] = h.point.y;
    }
  }
  deckGrid = grid;
}
function deckHeightAt(wx, wz) {
  if (!deckGrid) {                       // before the model lands
    const { lx, lz } = dockLocal(wx, wz);
    return (lx > DK.X0 && lx < DK.X1 && lz > DK.Z0 && lz < DK.Z1) ? DOCK_DECK : null;
  }
  const ix = Math.floor((wx - deckGX0) / DECK_CELL);
  const iz = Math.floor((wz - deckGZ0) / DECK_CELL);
  if (ix < 0 || iz < 0 || ix >= deckGW || iz >= deckGH) return null;
  const y = deckGrid[iz * deckGW + ix];
  return y > 0 ? y : null;
}
function onPier(wx, wz) { return deckHeightAt(wx, wz) !== null; }
function dockDeckAt(wx, wz) { return deckHeightAt(wx, wz); }
/* Getting up onto it. The drift alone was a dune you scrambled: it stood
 * higher than the deck, so you walked up loose sand and were snapped onto
 * the boards somewhere near the top. It is lower now — a bank the pier sits
 * in rather than a ramp over it — and a short flight of timber steps does
 * the last two thirds of a metre. Each tread is a real collider with a rise
 * of 0.18, well inside ROCK_STEP, so you walk up them rather than climb. */
/* THE THREE. Halfway from the wreck to the dock, three of them come out of
 * the water at once — which is the point: one crab is a fight you have
 * learned, three is a fight you have to move through. They are spread wide
 * enough that you cannot hold them all in view, and close enough that they
 * arrive together.
 *
 * They wait a long way out with `wake: 0`, so they never notice you on their
 * own; the trigger is the player's own z, and what wakes them is the end of
 * the cutscene. Submerged that far out `updateCrabUnit` keeps them invisible,
 * so all you get on the way in is the wake — which is the whole idea. */
/* Close to the dock, not halfway to it: the shed and its two lamps are the
 * thing you are walking toward, so the fight reads as the last stretch
 * before you get there rather than an empty patch of beach. */
/* In front of the shed, and nowhere near the wreck. At `DOCK_Z + 34` with a
 * 22 m lead the cutscene fired at z = -159 — four metres past the wreck at
 * -155 — so it went off the moment you were clear of it rather than on the
 * last stretch to the dock. The trigger is the player's z ALONE: it does not
 * care whether you are walking the waterline or the foot of the cliff. */
const PACK_Z = DOCK_Z + 18;
const PACK_TRIGGER = 20;                      // how far short of them it starts
const PACK_START_X = -34;                     // out where the water is black
const PACK_SWIM = 3.4, PACK_HOLD = 0.75;      // the swim in, then a beat on them
/* They come ashore at the WATERLINE, not out in the deep. `updateCrabUnit`
 * hides anything with a submersion over 0.92, so arriving at x = -6 the
 * whole cutscene ended on three wakes and nothing standing in them. Here
 * they break the surface as the camera lets go. */
/* Ten to twenty metres ahead of where the cutscene fires, which is close
 * enough to watch them break the surface and far enough that all three are
 * in shot at once. */
const PACK_SPOTS = [[3.4, PACK_Z + 11.5], [1.9, PACK_Z + 5.0], [3.8, PACK_Z - 1.5]];
const packCrabs = PACK_SPOTS.map(([, z]) => makeCrabUnit(PACK_START_X, z, { pack: true, wake: 0 }));
let packPhase = 0;                            // 0 waiting · 1 coming in · 2 loose
let packT = 0;
const _packMid = new THREE.Vector3(), _packQ = new THREE.Quaternion(), _packM = new THREE.Matrix4();

// something to throw at them, put where the fight happens
{
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0),
    new THREE.MeshStandardMaterial({ color: 0x59606f, roughness: 1, flatShading: true, emissive: 0x14171f }));
  stone.position.set(8.6, 0.28, PACK_Z + 4.2);
  makeProp(stone, 'stone', { radius: 0.3, restH: 0.28, bounce: 0.12, friction: 0.6 });

  const glass = new THREE.MeshStandardMaterial({
    color: 0x2f6f5c, roughness: 0.25, transparent: true, opacity: 0.7, emissive: 0x0c2b22,
  });
  const r = 0.25;
  const float = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), glass);
  float.position.set(6.9, r, PACK_Z - 3.4);
  const fp = makeProp(float, 'glass float', { radius: r, restH: r, bounce: 0.5 });
  fp.onImpact = (speed) => shatterGlass(fp, float, speed, r);
}

// ------------------------------------------------------------------
// The campsite — someone was here, and walked into the sea
// ------------------------------------------------------------------
/* Past the dock, on the dry sand, a towel laid down facing the water with
 * everything a person brings for an evening on a beach still on it: a
 * Discman with the headphones trailing off it, a drink, goggles, a bag,
 * sandals kicked off at the seaward end. And from that end, a line of BARE
 * footprints straight down the beach and into the water, with nothing
 * coming back. The float and the stone at the last print are the game's
 * usual invitation to throw something at the dark.
 *
 * Everything but the towel, the bag and the sandals is a `makeProp()` body,
 * so it can be picked up and thrown like the rest of the beach's loose
 * things. The footprints are their OWN instanced mesh: the player's prints
 * live in a 96-slot pool that recycles, and a trail meant to still be there
 * when you come back cannot share it. They borrow `foot.material`, which is
 * already clipped at the shore, so the prints in the swash come and go with
 * the water — which is exactly what a trail into the sea should do.
 *
 * `CAMP_X` obeys the same hard number as the body bag: the waterline can
 * reach x = 8.6, and the towel's seaward end is at 10.7. */
const CAMP_X = 11.6, CAMP_Z = DOCK_Z - 55;
const camp = new THREE.Group();
{
  const rnd = (a, b) => a + Math.random() * (b - a);
  const quant = (v, n = 6) => Math.round(v / (255 / n)) * (255 / n);

  // --- the towel: a bold print, cream stripes, colour-quantised ------------
  const towelTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 144;
    const g = c.getContext('2d');
    g.fillStyle = '#e8e2d2'; g.fillRect(0, 0, 256, 144);
    // wide teal bands with a thin plum stripe on each edge
    for (let i = 0; i < 4; i++) {
      const y = 8 + i * 36;
      g.fillStyle = '#3f8f8a'; g.fillRect(0, y, 256, 22);
      g.fillStyle = '#6b3f7a'; g.fillRect(0, y - 3, 256, 3); g.fillRect(0, y + 22, 256, 3);
    }
    // a scatter of big flat flowers over the bands
    for (let i = 0; i < 26; i++) {
      const x = rnd(0, 256), y = rnd(0, 144), r = rnd(7, 13);
      g.fillStyle = ['#d9d3e8', '#b74c7b', '#f0c26a', '#c9e5df'][i % 4];
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2;
        g.beginPath(); g.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, 0, 7); g.fill();
      }
      g.fillStyle = '#2d2a3a'; g.beginPath(); g.arc(x, y, r * 0.22, 0, 7); g.fill();
    }
    // fringe at both short ends
    g.fillStyle = '#d8d0bc';
    for (let y = 0; y < 144; y += 4) { g.fillRect(0, y, 6, 2); g.fillRect(250, y, 6, 2); }
    const img = g.getImageData(0, 0, 256, 144), d = img.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = quant(d[i]); d[i + 1] = quant(d[i + 1]); d[i + 2] = quant(d[i + 2]); }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return retroTex(t, { repeatWrap: false });
  })();
  // 1.8 m long, laid with its length toward the water (along X)
  const towelGeo = new THREE.PlaneGeometry(1.8, 1.0, 22, 12); towelGeo.rotateX(-Math.PI / 2);
  {
    const p = towelGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      // wrinkles, a body's worth of hollow in the middle, and one corner turned up
      let y = 0.012 + 0.014 * Math.sin(x * 9.1 + 1.3) * Math.sin(z * 11.7) + 0.008 * bwNoiseJS(x * 5 + z * 7);
      const corner = Math.max(0, (x - 0.55) / 0.35) * Math.max(0, (-z - 0.28) / 0.22);
      y += corner * corner * 0.075;
      p.setY(i, y);
    }
    towelGeo.computeVertexNormals();
  }
  const towelMat = new THREE.MeshStandardMaterial({
    map: towelTex, roughness: 1, metalness: 0, side: THREE.DoubleSide,
    emissive: 0x2a2d3a, emissiveMap: towelTex, emissiveIntensity: 0.55,
  });
  const towel = new THREE.Mesh(towelGeo, towelMat);
  towel.position.set(CAMP_X, 0, CAMP_Z);
  towel.rotation.y = 0.06;                       // not quite square to the sea
  towel.renderOrder = 2;
  camp.add(towel);

  // --- the bag, soft-sided, slumped at the landward end --------------------
  {
    const bagGeo = new THREE.BoxGeometry(0.34, 0.30, 0.20, 3, 3, 2);
    const p = bagGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), k = 1 + (0.15 - y) * 0.35;   // bellies out toward the bottom
      p.setX(i, p.getX(i) * k + rnd(-0.008, 0.008)); p.setZ(i, p.getZ(i) * k + rnd(-0.008, 0.008));
      if (y > 0.1) p.setY(i, y - 0.05 * Math.abs(p.getX(i)) / 0.17);   // sags at the mouth
    }
    bagGeo.computeVertexNormals();
    const bag = new THREE.Mesh(bagGeo, new THREE.MeshStandardMaterial({
      color: 0x7f8ea8, roughness: 1, flatShading: true, emissive: 0x161c28 }));
    bag.position.set(CAMP_X + 1.05, 0.15, CAMP_Z + 0.62);
    bag.rotation.set(0.06, 0.7, -0.1);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 6, 14, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1, flatShading: true }));
    handle.position.set(0, 0.16, 0.06); handle.rotation.z = 0.35;
    bag.add(handle);
    camp.add(bag);
    rockColliders.push({ x: bag.position.x, z: bag.position.z, r: 0.2, top: 0.3, mat: 'wood' });
  }

  // --- sandals, kicked off at the seaward end, one on its side -----------
  {
    const soleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 1, flatShading: true, emissive: 0x0c0e14 });
    const strapMat = new THREE.MeshStandardMaterial({ color: 0xd9663c, roughness: 0.9, flatShading: true, emissive: 0x2a1108 });
    for (const [dx, dz, yaw, tipped] of [[-0.98, 0.22, 0.4, false], [-1.12, -0.06, -1.1, true]]) {
      const sandal = new THREE.Group();
      const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.018, 10), soleMat);
      sole.scale.set(1, 1, 2.3);
      sandal.add(sole);
      const post = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 5, 8, Math.PI), strapMat);
      post.position.set(0, 0.012, 0.04); post.rotation.y = Math.PI / 2;
      sandal.add(post);
      sandal.scale.setScalar(1.35);
      sandal.position.set(CAMP_X + dx, tipped ? 0.075 : 0.012, CAMP_Z + dz);
      sandal.rotation.set(tipped ? Math.PI / 2.3 : 0, yaw, 0);
      camp.add(sandal);
    }
  }

  // --- the Discman, lid shut, headphones trailing off it onto the towel --
  {
    const cd = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0xb8bec9, roughness: 0.45, metalness: 0.25, emissive: 0x20242c });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6, emissive: 0x05060a });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.026, 0.15), body);
    cd.add(base);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.007, 20), body);
    lid.position.set(0, 0.0165, -0.004);
    cd.add(lid);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.0025, 6, 24), dark);
    ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.0205, -0.004);
    cd.add(ring);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.014),
      new THREE.MeshStandardMaterial({ color: 0x6f8a5a, emissive: 0x2c4a22, roughness: 0.8 }));
    screen.position.set(-0.03, 0.0145, 0.062);
    cd.add(screen);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.01), dark);
      b.position.set(0.012 + i * 0.016, 0.015, 0.064);
      cd.add(b);
    }
    // the cable, out of the jack and across to the headphones
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x0f1014, roughness: 0.9 });
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.072, -0.004, 0.02), new THREE.Vector3(0.14, -0.01, 0.10),
      new THREE.Vector3(0.20, -0.012, 0.20), new THREE.Vector3(0.30, -0.012, 0.24),
      new THREE.Vector3(0.36, 0.0, 0.20),
    ]);
    cd.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.003, 5), cableMat));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.006, 6, 20, Math.PI * 1.15), dark);
    band.position.set(0.40, 0.0, 0.18); band.rotation.set(Math.PI / 2, 0, 0.9);
    cd.add(band);
    for (const sg of [1, -1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.02, 12), dark);
      const a = 0.9 + sg * Math.PI * 0.575;
      cup.position.set(0.40 + Math.cos(a) * 0.075, 0.0, 0.18 + Math.sin(a) * 0.075);
      cup.rotation.set(0, -a, Math.PI / 2);
      cd.add(cup);
    }
    /* Real size, these are specks: a Discman is 14 cm and from head height
     * on a night beach that is a few pixels. The camp's loose things are
     * laid down at 1.7x, the same reason the shells are laid at 2-3x, and
     * carry the same glint every takeable does. */
    cd.scale.setScalar(1.7);
    cd.position.set(CAMP_X + 0.32, 0.05, CAMP_Z - 0.18);
    cd.rotation.y = 2.4;
    makeProp(cd, 'CD player', { radius: 0.19, restH: 0.05, bounce: 0.2, friction: 0.7 });
    addItemShine(cd, { size: 0.7, height: 0.16, strength: 0.6 });
  }

  // --- the soda: one open and upright, one drunk and on its side ---------
  {
    const labelTex = (() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#b8202a'; g.fillRect(0, 0, 128, 64);
      g.fillStyle = '#f2ece2'; g.beginPath();
      g.moveTo(0, 42); g.quadraticCurveTo(64, 12, 128, 40); g.lineTo(128, 48); g.quadraticCurveTo(64, 22, 0, 50); g.fill();
      g.fillStyle = '#f2ece2'; g.fillRect(28, 20, 34, 9); g.fillRect(68, 20, 26, 9);
      g.fillStyle = '#c9cdd4'; g.fillRect(0, 0, 128, 5); g.fillRect(0, 59, 128, 5);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      return retroTex(t, { repeatWrap: false });
    })();
    const canMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.4, metalness: 0.35, emissive: 0x2a0c0e, emissiveMap: labelTex, emissiveIntensity: 0.5 });
    const alu = new THREE.MeshStandardMaterial({ color: 0xc6cad2, roughness: 0.35, metalness: 0.5, emissive: 0x22252c });
    const makeCan = () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.031, 0.118, 14, 1, true), canMat));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.033, 0.006, 14), alu);
      top.position.y = 0.062; g.add(top);
      const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.026, 0.006, 14), alu);
      bottom.position.y = -0.062; g.add(bottom);
      const tab = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.002, 0.008), alu);
      tab.position.set(0, 0.066, 0.008); g.add(tab);
      return g;
    };
    const up = makeCan();
    up.scale.setScalar(1.6);
    up.position.set(CAMP_X + 0.62, 0.1, CAMP_Z + 0.22);
    makeProp(up, 'soda can', { radius: 0.08, restH: 0.1, bounce: 0.35, friction: 0.7 });
    addItemShine(up, { size: 0.6, height: 0.2, strength: 0.6 });
    const down = makeCan();
    down.scale.setScalar(1.6);
    down.position.set(CAMP_X + 0.15, 0.053, CAMP_Z + 0.68);
    down.rotation.set(Math.PI / 2, 0, 1.9);
    makeProp(down, 'empty can', { radius: 0.08, restH: 0.053, bounce: 0.4, friction: 0.7 });
  }

  // --- swim goggles, strap and all, set down on the towel -----------------
  {
    const gg = new THREE.Group();
    const frame = new THREE.MeshStandardMaterial({ color: 0xe0793a, roughness: 0.6, emissive: 0x3a1a08 });
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x3a6fa8, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.8, emissive: 0x0e2340 });
    for (const sg of [1, -1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 6, 14), frame);
      rim.position.set(sg * 0.033, 0.012, 0); rim.rotation.x = Math.PI / 2;
      gg.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 14), lensMat);
      lens.position.set(sg * 0.033, 0.013, 0); lens.rotation.x = -Math.PI / 2;
      gg.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.006, 0.008), frame);
    bridge.position.set(0, 0.012, 0);      // Object3D.position is a getter: never Object.assign it
    gg.add(bridge);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.004, 5, 20, Math.PI * 1.3),
      new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.9 }));
    strap.position.set(0, 0.006, -0.06); strap.rotation.set(Math.PI / 2, 0, Math.PI * 0.85);
    gg.add(strap);
    gg.scale.setScalar(1.8);
    gg.position.set(CAMP_X - 0.45, 0.02, CAMP_Z + 0.3);
    gg.rotation.y = -0.6;
    makeProp(gg, 'swim goggles', { radius: 0.14, restH: 0.02, bounce: 0.25, friction: 0.75 });
    addItemShine(gg, { size: 0.6, height: 0.14, strength: 0.6 });
  }

  // --- bare feet, straight down into the water, and nothing back ----------
  const CAMP_PRINTS = 18;
  const campFoot = new THREE.InstancedMesh(footGeo, foot.material, CAMP_PRINTS);
  campFoot.frustumCulled = false; campFoot.renderOrder = 2;
  {
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < CAMP_PRINTS; i++) campFoot.setMatrixAt(i, hide);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
    const fwdX = -1, fwdZ = 0;                     // toward the sea
    e.set(0, Math.atan2(fwdX, fwdZ) + Math.PI, 0); q.setFromEuler(e);
    let side = 1, i = 0;
    // the first pair is right at the towel's edge, where they stood up
    for (let x = CAMP_X - 1.02; x > 1.6 && i < CAMP_PRINTS; x -= 0.58 + Math.random() * 0.08, side = -side, i++) {
      // left and right feet either side of the line, as stampFoot() does it
      const off = 0.14 * side;
      const z = CAMP_Z + 0.02 + (Math.random() - 0.5) * 0.06;
      sc.set((0.92 + Math.random() * 0.16) * side, 1, 1.0 + Math.random() * 0.2);
      m.compose(new THREE.Vector3(x + (-fwdZ) * off, 0.03, z + fwdX * off), q, sc);
      campFoot.setMatrixAt(i, m);
    }
    campFoot.instanceMatrix.needsUpdate = true;
  }
  camp.add(campFoot);

  // --- and by the last print, the usual two things to throw ---------------
  {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0),
      new THREE.MeshStandardMaterial({ color: 0x59606f, roughness: 1, flatShading: true, emissive: 0x14171f }));
    stone.position.set(4.1, 0.26, CAMP_Z - 0.75);
    makeProp(stone, 'stone', { radius: 0.28, restH: 0.26, bounce: 0.12, friction: 0.6 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x2b5a74, roughness: 0.25, transparent: true, opacity: 0.7, emissive: 0x0a2130 });
    const r = 0.23;
    const float = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), glass);
    float.position.set(4.7, r, CAMP_Z + 0.95);
    const fp = makeProp(float, 'glass float', { radius: r, restH: r, bounce: 0.5 });
    fp.onImpact = (speed) => shatterGlass(fp, float, speed, r);
  }

  scene.add(camp);
  farProps.push({ obj: camp, z: CAMP_Z, d: 260 });
}

/* The trails. Each one leaves a widening V of ripples behind it and throws a
 * little water as it comes, so from the beach there are three wakes running
 * at you out of the dark before there is anything to see. */
function packWake(u) {
  const p = u.g.position;
  addRipple(p.x, p.z, 1.0 + Math.random() * 0.5);
  // the V behind it, widening as it goes
  for (const sg of [1, -1]) {
    if (Math.random() < 0.7) addRipple(p.x - 1.4 - Math.random() * 1.6, p.z + sg * (0.8 + Math.random() * 1.5), 0.5 + Math.random() * 0.5);
  }
  if (Math.random() < 0.5) spawnSplash(p.x, p.z, 4, 1, 0, 0.6);
}
function updatePack(dt) {
  if (packPhase === 2 || !introDone || dying || ended) return;
  if (packPhase === 0) {
    // you walk down the beach along -Z, so you reach them from above
    if (camera.position.z > PACK_Z + PACK_TRIGGER) return;
    if (settings.devMode) {
      // DEV MODE: skip the camera. They are simply ashore and awake, so the
      // fight can be tested without sitting through the swim every time.
      for (let i = 0; i < packCrabs.length; i++) {
        const u = packCrabs[i], [tx, tz] = PACK_SPOTS[i];
        u.g.position.set(tx, restYInWater(tx, tz, 1.15), tz);
        u.g.rotation.y = Math.PI * 1.5; u.g.visible = true;
        u.st.awake = true; u.st.rear = 1; u.wake = 1e6;
      }
      packPhase = 2; packCut = false;
      return;
    }
    packPhase = 1; packT = 0; packCut = true;
    if (held) dropHeld();
    hovered = null; setPrompt('');
    sfxCrabWake();
    return;
  }
  packT += dt;
  for (let i = 0; i < packCrabs.length; i++) {
    const u = packCrabs[i];
    const [tx, tz] = PACK_SPOTS[i];
    // staggered, so they arrive as a group rather than a rank
    const e = THREE.MathUtils.clamp((packT - i * 0.22) / PACK_SWIM, 0, 1);
    const k = e * e * (3 - 2 * e);
    u.g.position.x = PACK_START_X + (tx - PACK_START_X) * k;
    u.g.position.z = tz;
    u.g.position.y = restYInWater(u.g.position.x, u.g.position.z, 1.15);
    u.g.rotation.y = Math.PI * 1.5;             // facing the shore, claws first
    u.g.visible = submersionAt(u.g.position.x, u.g.position.z) < 0.92;
    if (e > 0 && e < 1) packWake(u);
  }
  /* The camera is turned, not moved. Nothing about where you are standing
   * changes, so every clamp below still agrees with it, and when it lets go
   * you are exactly where you were. */
  _packMid.set(0, 0, 0);
  for (const u of packCrabs) _packMid.add(u.g.position);
  _packMid.multiplyScalar(1 / packCrabs.length);
  _packMid.y = 0.5;
  _packM.lookAt(camera.position, _packMid, camera.up);
  _packQ.setFromRotationMatrix(_packM);
  camera.quaternion.slerp(_packQ, Math.min(1, dt * 2.6));
  if (packT >= PACK_SWIM + PACK_HOLD) {
    packPhase = 2; packCut = false;
    for (const u of packCrabs) { u.st.awake = true; u.st.rear = 1; u.wake = 1e6; }
    sfxCrabTell();
  }
}

const DOCK_STEPS = new THREE.Group();
scene.add(DOCK_STEPS);
function buildDockSteps(deckMat) {
  /* The pier's own timber, not a colour that nearly matches it: the material
   * is taken from the deck the steps run up to, so they are the same boards.
   * Each tread ABUTS the one above with no gap — the first is set back into
   * the deck's lip by an overlap — and every riser runs all the way down to
   * the sand, so nothing floats however the drift falls away beneath. */
  const EDGE = DOCK_X - DK.Z0 * DOCK_S;          // the deck's landward lip
  const HALF_W = 1.55, TREAD = 0.46, RISE = 0.18, LAP = 0.05;
  const cz = DOCK_Z + ((DK.X0 + DK.X1) / 2) * DOCK_S;
  for (let i = 0; i < 3; i++) {
    const top = DOCK_DECK - (i + 1) * RISE;      // 1.556, 1.376, 1.196
    const x0 = EDGE - LAP + i * TREAD;
    const x1 = x0 + TREAD + LAP;
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, top + 0.6, HALF_W * 2), deckMat);
    m.position.set((x0 + x1) / 2, top - (top + 0.6) / 2, cz);
    DOCK_STEPS.add(m);
    // a stringer down each side, so the flight reads as built and not stacked
    for (const sg of [-1, 1]) {
      const sr = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, top + 0.5, 0.14), deckMat);
      sr.position.set((x0 + x1) / 2, top - (top + 0.5) / 2 + 0.06, cz + sg * (HALF_W + 0.05));
      DOCK_STEPS.add(sr);
    }
    rockColliders.push({ x0, x1, z0: cz - HALF_W, z1: cz + HALF_W, top, mat: 'wood' });
  }
  farProps.push({ obj: DOCK_STEPS, z: DOCK_Z, d: 300 });
}
function driftAt(wx, wz) {
  const d = Math.hypot(wx - DOCK_DRIFT_X, wz - DOCK_DRIFT_Z) / DOCK_DRIFT_R;
  if (d >= 1) return 0;
  return Math.max(0, DOCK_DRIFT_H * (Math.cos(d * Math.PI * 0.5) - (d > 0.84 ? (d - 0.84) * 3.4 : 0)));
}
new GLTFLoader().load('assets/dock.glb', (gltf) => {
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (/^Lamp/.test(m.name)) {
      // the two lamps are lit: they are the whole reason you notice it
      m.emissive.setHex(0xffb35a); m.emissiveMap = m.map; m.emissiveIntensity = 1.8;
      return;
    }
    // stylised daylight wood, lifted for the night the way everything else is
    m.emissive.setHex(0x2c3242); m.emissiveMap = m.map;
    m.metalness = 0;
    reexpose(m, 0.68);
  });
  /* The door opens. The model's Door mesh is re-hung on a pivot at its hinge
   * edge (model space, hinge at x = -1.14 on the shed's seaward face) with
   * `attach()`, which keeps its world transform, and the pivot swings in
   * `updateDock()`. Its doorway slab is solid only while it is shut. */
  let doorMesh = null, boxMesh = null;
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material.name === 'Door') doorMesh = o;
    if (o.material.name === 'BoxCrate') boxMesh = o;
  });
  gltf.scene.updateMatrixWorld(true);
  if (doorMesh) {
    const pivot = new THREE.Group();
    // the hinge is at x = -0.73: the knob is on the -1.14 edge, and a door
    // hung on its knob side opened backwards
    pivot.position.set(-0.73, 0, -0.945);
    gltf.scene.add(pivot);
    pivot.updateMatrixWorld(true);
    pivot.attach(doorMesh);
    dockDoor = pivot;
    addInteractable(pivot, 'Open the door', 'action', {
      onActivate: () => {
        dockDoorOpen = !dockDoorOpen;
        dockDoorEntry.label = dockDoorOpen ? 'Close the door' : 'Open the door';
        sfxDoor(dockDoorOpen);
        /* He is sitting right there and he has been waiting. Opening the
         * door on him starts it — you do not walk in and choose to say
         * hello to a man who is already looking at you. Once only; after
         * that he is an interactable like anyone else. */
        if (dockDoorOpen && !fishermanMet) setTimeout(talkToFisherman, 620);
      },
    });
    dockDoorEntry = interactables[interactables.length - 1];
  }
  // the model's own crate is stood down for one you can break open
  if (boxMesh) boxMesh.visible = false;
  dock.add(gltf.scene);
  dock.updateMatrixWorld(true);
  {
    let deckMat = null;
    const floors = [];
    dock.traverse((o) => {
      if (!o.isMesh) return;
      if (o.material.name === 'floor') { deckMat = o.material; floors.push(o); }
      else if (o.material.name === 'FloorFrames') floors.push(o);
    });
    if (floors.length) buildDeckGrid(floors);
    buildDockSteps(deckMat || new THREE.MeshStandardMaterial({ color: 0x6b5942, roughness: 1, flatShading: true, emissive: 0x231c14 }));
  }
  {
    const at = dock.localToWorld(new THREE.Vector3(-0.31, 0.62, 2.10));
    buildCrate(at.x, DOCK_DECK, at.z, 0.4, dropKey);
  }
  // the lamps light the boards: the post at the sea end, the one by the door
  const post = dock.localToWorld(new THREE.Vector3(0.17, 1.28, 2.5));
  const door = dock.localToWorld(new THREE.Vector3(-1.94, 1.03, -0.93));
  const l1 = new THREE.PointLight(0xffb478, 11, 14, 1.6); l1.position.copy(post); scene.add(l1);
  const l2 = new THREE.PointLight(0xffb478, 7, 9, 1.7); l2.position.copy(door); scene.add(l2);
  farProps.push({ obj: dock, z: DOCK_Z, d: 300 });
  farProps.push({ obj: l1, z: DOCK_Z, d: 300 });
  farProps.push({ obj: l2, z: DOCK_Z, d: 300 });
  /* Everything on the pier you can walk into, taken from the model itself
   * rather than guessed — and each shaped like the thing you can SEE. Three
   * shapes, because one does not fit all of them:
   *
   * `columnsOf`  the piles and the light post. All the piles are a SINGLE
   *              mesh whose bounding box is the whole pier, so they are
   *              found by bucketing vertices on a coarse grid: one cylinder
   *              per bucket.
   * `slicesOf`   the boat. Its bounding box is a rectangle with a metre of
   *              open air at each corner where the hull tapers — the
   *              invisible ledge you could stand on off its side. Slicing
   *              along its length and taking the beam of each slice follows
   *              the hull in and out. A per-vertex occupancy grid was tried
   *              first and was worse: vertices are sparse in the middle of
   *              big flat faces, so the boat's own floor came out full of
   *              holes, and the deck sprouted invisible steps.
   * `boxOf`      the table, chair, ladder, crate. These really are boxes.
   */
  const columnsOf = (mesh, cell, mat) => {
    mesh.updateWorldMatrix(true, false);
    const pos = mesh.geometry.attributes.position, v = new THREE.Vector3();
    const cells = new Map();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      const key = Math.round(v.x / cell) + ',' + Math.round(v.z / cell);
      let c = cells.get(key);
      if (!c) cells.set(key, c = { x0: v.x, x1: v.x, z0: v.z, z1: v.z, top: v.y, lo: v.y });
      c.x0 = Math.min(c.x0, v.x); c.x1 = Math.max(c.x1, v.x);
      c.z0 = Math.min(c.z0, v.z); c.z1 = Math.max(c.z1, v.z);
      c.top = Math.max(c.top, v.y); c.lo = Math.min(c.lo, v.y);
    }
    for (const c of cells.values()) {
      const r = Math.max(c.x1 - c.x0, c.z1 - c.z0) / 2;
      if (r < 0.06 || c.top - c.lo < 0.5) continue;      // a rail, not an upright
      rockColliders.push({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2, r: Math.min(r, 0.45), top: c.top, mat });
    }
  };
  const slicesOf = (mesh, n, mat) => {
    mesh.updateWorldMatrix(true, false);
    const pos = mesh.geometry.attributes.position, v = new THREE.Vector3();
    const pts = [];
    for (let i = 0; i < pos.count; i++) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).clone());
    const bb = new THREE.Box3().setFromPoints(pts);
    const size = bb.getSize(new THREE.Vector3());
    const long = size.x >= size.z ? 'x' : 'z', cross = long === 'x' ? 'z' : 'x';
    const lo = bb.min[long], span = size[long];
    const slice = [];
    for (const p of pts) {
      const k = Math.min(n - 1, Math.max(0, Math.floor(((p[long] - lo) / span) * n)));
      let sl = slice[k];
      if (!sl) slice[k] = sl = { c0: p[cross], c1: p[cross], top: p.y };
      sl.c0 = Math.min(sl.c0, p[cross]); sl.c1 = Math.max(sl.c1, p[cross]);
      sl.top = Math.max(sl.top, p.y);
    }
    for (let k = 0; k < n; k++) {
      const sl = slice[k];
      if (!sl || sl.c1 - sl.c0 < 0.12) continue;
      const a0 = lo + (k / n) * span, a1 = lo + ((k + 1) / n) * span;
      rockColliders.push(long === 'x'
        ? { x0: a0, x1: a1, z0: sl.c0, z1: sl.c1, top: sl.top, mat }
        : { x0: sl.c0, x1: sl.c1, z0: a0, z1: a1, top: sl.top, mat });
    }
  };
  const boxOf = (mesh, mat) => {
    mesh.updateWorldMatrix(true, false);
    const bb = new THREE.Box3().setFromObject(mesh);
    if (bb.max.y - bb.min.y < 0.2) return;
    rockColliders.push({ x0: bb.min.x, x1: bb.max.x, z0: bb.min.z, z1: bb.max.z, top: bb.max.y, mat });
  };
  dock.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const n = o.material.name;
    if (n === 'WoodenPillars') columnsOf(o, 1.2, 'wood');
    else if (n === 'LightPost') columnsOf(o, 2.0, 'wood');
    else if (n === 'Boat') slicesOf(o, 9, 'wood');
    else if (n === 'Table' || n === 'Chair' || n === 'Ladder' || n === 'BoxCrate') boxOf(o, 'wood');
  });
});
/* Standing on it. The drift is terrain and always applies; the boards only
 * when your feet are already within a step of them, so walking under the
 * pier keeps you on the sand. The shed's walls are pushed out of along the
 * shallowest face, and only at deck height — under the boards they are not
 * there. Model space for all of it: the pier is turned -90°, so model x runs
 * down world z and model z runs back up world x. */
/* The pier is SOLID from below and EDGED from above, and which of those you
 * get is a matter of where you came from, not of how high the floor is.
 *
 * The first version let the boards count as a floor whenever your feet were
 * within a step of them — and the drift runs on under the deck, so walking
 * in beneath the pier carried you up the sand until your feet were close
 * enough, and then the deck took you: you popped up through the boards. And
 * at the sea end, stepping off dropped `onDock`, the WADE_X clamp came back
 * on, and it threw you a metre and a half up the beach. Both were the same
 * bug: a floor test that did not know whether you were on the thing.
 *
 * So `onDock` is STICKY. You get on only at the buried land end, where the
 * sand is level with the boards; once on, you stay on until you walk off
 * that same end, and the other three edges simply stop you — you do not
 * step off a pier into the surf by accident. Not on it, the whole footprint
 * is a wall: pushed out along the shallowest face, never toward the buried
 * end, and never toward a face that would put you past WADE_X where the
 * surf clamp would only throw you straight back. */
let onDock = false, dockDoorOpen = false, dockDoorSwing = 0, dockDoor = null, dockDoorEntry = null;
const DOCK_DOOR_SLAB = [-1.14, -1.00, -0.73, -0.90];      // the doorway, solid while shut
function updateDock(dt) {
  if (dockDoor) {
    const target = dockDoorOpen ? 1 : 0;
    dockDoorSwing += THREE.MathUtils.clamp(target - dockDoorSwing, -1, 1) * Math.min(1, dt * 3.2);
    if (Math.abs(target - dockDoorSwing) < 0.004) dockDoorSwing = target;
    dockDoor.rotation.y = -dockDoorSwing * 1.5;          // swings in, off the deck
  }
  const dx = camera.position.x - DOCK_X, dz = camera.position.z - DOCK_Z;
  if (Math.abs(dx) > 24 || Math.abs(dz) > 16) { onDock = false; return; }
  const feet = camBaseY - playerEye();
  const g = driftAt(camera.position.x, camera.position.z);
  if (g > groundY) groundY = g;
  let lx = dz / DOCK_S, lz = -dx / DOCK_S;
  const pr = PLAYER_R / DOCK_S;
  const boards = deckHeightAt(camera.position.x, camera.position.z);
  const inFoot = boards !== null;
  const wasOn = onDock;
  onDock = false;
  if (inFoot) {
    /* On it while there are boards under your feet — and NOT sticky any
     * more. It used to keep you at plank height until you left by the land
     * end, so walking off the side or the sea end carried you out over
     * nothing at deck height with the boards still knocking underfoot.
     * Step off wherever the boards stop, onto the boat or onto the sand. */
    const entering = feet >= boards - 0.42;
    if (entering) {
      onDock = true;
      if (boards > groundY) groundY = boards;
      /* Which edges hold you: the sea end always, and the two sides only
       * where the water is under them — past WADE_X, the last stretch of
       * the pier. Over the beach the sides are open, so you can step off
       * onto the sand and carry on down the walk; a bulwark the whole way
       * round turned the pier into a dead end you had to walk back off. */
      lz = Math.min(lz, DK.Z1 - pr);
      const overWater = DOCK_X - lz * DOCK_S < WADE_X + 0.4;
      if (overWater) lx = THREE.MathUtils.clamp(lx, DK.X0 + pr, DK.X1 - pr);
      const walls = dockDoorOpen ? DOCK_WALLS : DOCK_WALLS.concat([DOCK_DOOR_SLAB]);
      for (const [x0, z0, x1, z1] of walls) {
        if (lx <= x0 - pr || lx >= x1 + pr || lz <= z0 - pr || lz >= z1 + pr) continue;
        const push = [x0 - pr - lx, x1 + pr - lx, z0 - pr - lz, z1 + pr - lz];
        let k = 0;
        for (let i = 1; i < 4; i++) if (Math.abs(push[i]) < Math.abs(push[k])) k = i;
        if (k < 2) lx += push[k]; else lz += push[k];
      }
    } else if (feet + playerHeight() > boards) {
      /* Not on it, and too tall to pass beneath, so the deck stops you —
       * it STOPS you, it does not move you. This used to push out along the
       * nearest face, and walking into the pier from seaward left the sea
       * end as the only legal face, so you were shoved five metres sideways
       * across the whole width of the pier: the teleport.
       *
       * Undoing the frame's movement is the honest answer to "you cannot go
       * there". If the position you came from was itself inside the deck
       * (you stood up under the boards), fall back to the old push so you
       * are never sealed in.
       *
       * Crouch and this branch does not run at all, so you crawl in under
       * the deck — the piles stay solid, because those are real colliders. */
      if (!onPier(_preMove.x, _preMove.z)) {
        camera.position.x = _preMove.x;
        camera.position.z = _preMove.z;
        return;
      }
      /* You are already under it and there is nowhere legal to send you —
       * at the sea end the WADE_X clamp pins you at x = -2.4, which is
       * INSIDE the footprint, so no push has an honest destination and the
       * old one flung you the width of the pier. Duck instead. It is what a
       * person does under a low beam, `headroomClear()` already refuses to
       * let you back up until you are clear, and nothing teleports. */
      crouching = true;
    }
  }
  camera.position.x = DOCK_X - lz * DOCK_S;
  camera.position.z = DOCK_Z + lx * DOCK_S;
}

// ------------------------------------------------------------------
// The Very Old Fisherman — sitting on a blue tub in the dock house, by
// the table. The only other person on the walk, and the first thing he
// says is that you should not be in here.
// ------------------------------------------------------------------
const FISH_H = 1.80;                      // sole of his boot to the top of his cap, seated
const FISH_X = 9.9, FISH_Z = -217.75;     // beside the table, on the shed floor
const FISH_TUB_H = 0.58;
/* He opens with a threat and then lets you pick how to take it. Backing out
 * ends it; the other two answer and leave the remaining ones open, so you
 * can hear him out without the conversation looping forever. */
const FISHERMAN_SCRIPT = {
  start: {
    text: 'I should kill you for snooping around my property like that.',
    choices: [
      { label: 'Sorry, I was just leaving', to: 'leaving' },
      { label: 'Is that a threat?', to: 'threat' },
      { label: 'Who are you?', to: 'who' },
      // only if it is on you — he is not going to answer a question about a
      // key you have not found
      { label: 'Do you know about this rusted key?', to: 'key',
        when: () => inventory.includes(keyItem) },
    ],
  },
  key: {
    text: '\u2026',                 // his answer to the key, for you to write
    choices: [{ label: 'Sorry, I was just leaving', to: 'leaving' }],
  },
  leaving: {
    text: 'Aye. You were.',
    choices: [],
  },
  threat: {
    text: "Call it what you like. The water's taken quieter men than you.",
    choices: [
      { label: 'Who are you?', to: 'who2' },
      { label: 'Do you know about this rusted key?', to: 'key', when: () => inventory.includes(keyItem) },
      { label: 'Sorry, I was just leaving', to: 'leaving' },
    ],
  },
  who: {
    text: "I've fished this water sixty years. Long enough to know what walks it after dark.",
    choices: [
      { label: 'Is that a threat?', to: 'threat2' },
      { label: 'Do you know about this rusted key?', to: 'key', when: () => inventory.includes(keyItem) },
      { label: 'Sorry, I was just leaving', to: 'leaving' },
    ],
  },
  who2: {
    text: "I've fished this water sixty years. You're not the strangest thing I've found on my boards.",
    choices: [{ label: 'Sorry, I was just leaving', to: 'leaving' }],
  },
  threat2: {
    text: "It's a warning. You'll know the difference if you keep walking that way.",
    choices: [{ label: 'Sorry, I was just leaving', to: 'leaving' }],
  },
};
const fisherman = new THREE.Group();
/* A hair off the boards, with a contact shadow under him. A Sprite is
 * screen-aligned, so when you look DOWN at one the floor in front of it is
 * nearer the camera than its base and clips it — which is what was cutting
 * his boots off, not the photograph. Lifting him clear and painting the
 * shadow back in is the standard answer. */
fisherman.position.set(FISH_X, DOCK_DECK + 0.035, FISH_Z);
scene.add(fisherman);
{
  /* What he sits on: the blue plastic fish tub from the photograph, upended.
   * Tapered, ribbed round the foot, and drilled with the little holes those
   * things always have. It is his seat, so it is solid. */
  const blue = new THREE.MeshStandardMaterial({
    color: 0x2f5f9c, roughness: 0.62, metalness: 0.05, flatShading: true, emissive: 0x0d2038,
  });
  /* Set BACK from him, not under him. He is a billboard and the tub is a
   * solid cylinder at the same spot, so the sprite plane cut straight
   * through it and the tub's front half ate his legs and boots — the
   * "clipping through his seat". Pushed deeper into the shed it sits behind
   * him from the doorway, which is the only way anyone sees him. */
  // 0.44 back, not 0.30: at 0.30 the tub's front rim still met the sprite
  // plane at his knee and the peg's cuff went into it
  const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.36, FISH_TUB_H, 14), blue);
  tub.position.set(0.44, FISH_TUB_H / 2, 0);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.028, 6, 16), blue);
  rim.position.set(0.44, FISH_TUB_H, 0); rim.rotation.x = Math.PI / 2;
  fisherman.add(tub, rim);
  /* The gutting box. It is here to do a job: the photograph ends at his
   * boots and that hard horizontal edge is the one thing that gives the
   * cut-out away, so something has to stand in front of it. A fish crate he
   * is working over is what a man sitting on a tub in a shed would have —
   * so it earns its place twice.
   *
   * It goes on the DOOR side of him, because that is the only direction
   * anyone sees him from and a billboard is only occluded by what is
   * actually nearer the camera. */
  const boxW = 0.84, boxD = 0.46, boxH = 0.30;
  // warm timber, not the beach crate's cold grey — at that colour it read as
  // a black mass in here and he looked to be sitting astride it
  const crateWood = new THREE.MeshStandardMaterial({
    map: plankTex, color: 0xa08256, roughness: 1, flatShading: true,
    emissive: 0x3a2c1a, emissiveMap: plankTex,
  });
  const gut = new THREE.Group();
  gut.position.set(-0.66, 0, 0.05);
  gut.rotation.y = 0.22;
  // four slatted sides and a base, so it reads as a fish crate and not a block
  for (const [w, d, x, z] of [[boxW, 0.04, 0, boxD / 2], [boxW, 0.04, 0, -boxD / 2],
                              [0.04, boxD, boxW / 2, 0], [0.04, boxD, -boxW / 2, 0]]) {
    for (let i = 0; i < 3; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(w, boxH / 3.6, d), crateWood);
      slat.position.set(x, boxH * (0.14 + i * 0.33), z);
      gut.add(slat);
    }
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(boxW, 0.05, boxD), crateWood);
  base.position.y = boxH - 0.025;
  gut.add(base);
  // and what is in it: two fish, pale side up, and the knife across the rim
  const fishMatt = new THREE.MeshStandardMaterial({
    color: 0x8d9aa6, roughness: 0.55, metalness: 0.12, flatShading: true, emissive: 0x27303a });
  for (const [fx, fz, fr] of [[-0.13, 0.05, 0.35], [0.12, -0.06, -0.5]]) {
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), fishMatt);
    body.scale.set(1.7, 0.40, 0.68);
    body.position.set(fx, boxH + 0.03, fz);
    body.rotation.y = fr;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.1, 4), fishMatt);
    tail.position.set(fx - Math.cos(fr) * 0.21, boxH + 0.03, fz + Math.sin(fr) * 0.21);
    tail.rotation.set(Math.PI / 2, 0, -fr);
    tail.scale.set(1, 1, 0.4);
    gut.add(body, tail);
  }
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa4b0, roughness: 0.4, metalness: 0.5, flatShading: true, emissive: 0x191d22 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.008, 0.028), steel);
  blade.position.set(0.16, boxH + 0.03, 0.16); blade.rotation.y = -0.5;
  const haft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.026),
    new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1, flatShading: true, emissive: 0x120d08 }));
  haft.position.set(0.03, boxH + 0.033, 0.23); haft.rotation.y = -0.5;
  gut.add(blade, haft);
  fisherman.add(gut);
  // the contact shadow that puts him back on the floor
  {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), new THREE.MeshBasicMaterial({
      map: glowTex, color: 0x000000, transparent: true, opacity: 0.6,
      depthWrite: false, blending: THREE.NormalBlending,
    }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(-0.12, -0.03, 0.02);
    fisherman.add(sh);
  }
  rockColliders.push({ x: FISH_X - 0.66, z: FISH_Z + 0.05, r: 0.46, top: DOCK_DECK + boxH, mat: 'wood' });
  rockColliders.push({ x: FISH_X + 0.44, z: FISH_Z, r: 0.40, top: DOCK_DECK + FISH_TUB_H, mat: 'wood' });
}
// Stand-in until assets/fisherman.png exists — a seated silhouette, so he is
// there and talking with the cut-out still to come.
function makeFishermanPlaceholder() {
  const c = document.createElement('canvas'); c.width = 160; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(9, 13, 19, 0.94)';
  g.beginPath(); g.arc(80, 30, 20, 0, Math.PI * 2); g.fill();      // head
  g.fillRect(56, 50, 48, 60);                                      // body
  g.fillRect(38, 58, 16, 46); g.fillRect(106, 58, 16, 46);         // arms
  g.fillRect(52, 108, 56, 22);                                     // thighs, seated
  g.fillRect(56, 128, 18, 30); g.fillRect(88, 128, 18, 30);        // shins
  return new THREE.CanvasTexture(c);
}
const fishMat = new THREE.SpriteMaterial({
  map: makeFishermanPlaceholder(), transparent: true, alphaTest: 0.35,
});
const fishSprite = new THREE.Sprite(fishMat);
fishSprite.scale.set(FISH_H, FISH_H, 1);
// his boots are on the deck in the photograph and his legs come down in
// front of the tub, so the cut-out stands ON the boards and the tub shows
// behind and either side of him
fishSprite.position.y = FISH_H / 2;
fisherman.add(fishSprite);
/* HIS LEFT LEG IS A PEG. The photograph's leg ends where the photograph
 * ends, and a hard horizontal cut at the shin is the thing that gives a
 * cut-out away — so that leg is taken off below the knee and a peg is put
 * on it. Painted INTO the texture rather than modelled: he is a billboard,
 * and a 3-D peg would only line up from the one angle it was aimed at.
 *
 * The numbers are measured off assets/fisherman.png (494 x 892) by walking
 * its alpha: from y = 596 down there are two legs, his right at x 163-294
 * and his left at x 361-433, closing to x 350-388 by y = 821. */
const FISH_PAD = 0.05;             // transparent canvas under him, for the sole
function paintFisherman(g, W, H, FH) {
  const X = (v) => (v / 494) * W, Y = (v) => (v / 892) * H;
  // 1. take the leg off. Two bands, because below y = 810 his OTHER boot
  //    reaches across to x = 346 and must not be cut away with it.
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  g.beginPath();
  g.moveTo(X(318), Y(612)); g.lineTo(X(494), Y(612));
  g.lineTo(X(494), Y(892)); g.lineTo(X(348), Y(892));
  g.lineTo(X(348), Y(808)); g.lineTo(X(318), Y(808));
  g.closePath(); g.fill();
  g.restore();

  // 2. the peg. A tapered shaft from under the knee to the boards, a leather
  //    cuff strapped over the stump, and an iron ferrule at the tip.
  const kx = X(392), ky = Y(606), tx = X(360), ty = Y(884);
  const kw = X(30), tw = X(13);
  const shaft = g.createLinearGradient(kx - kw, 0, kx + kw, 0);
  // pale, sun-bleached wood. At a mid brown it graded down to a black stick
  // against a dark shed and you could not tell it was there at all.
  shaft.addColorStop(0, '#7d6444');
  shaft.addColorStop(0.30, '#d8bb8a');
  shaft.addColorStop(0.60, '#b9976a');
  shaft.addColorStop(1, '#6a533a');
  g.fillStyle = shaft;
  g.beginPath();
  g.moveTo(kx - kw, ky); g.lineTo(kx + kw, ky);
  g.lineTo(tx + tw, ty); g.lineTo(tx - tw, ty);
  g.closePath(); g.fill();

  // grain, deterministic so both blink frames are identical
  g.save();
  g.beginPath();
  g.moveTo(kx - kw, ky); g.lineTo(kx + kw, ky); g.lineTo(tx + tw, ty); g.lineTo(tx - tw, ty);
  g.closePath(); g.clip();
  g.strokeStyle = 'rgba(70,52,32,0.30)';
  for (let i = 0; i < 9; i++) {
    const f = (i + 0.5) / 9;
    g.lineWidth = X(1 + (i % 3));
    g.beginPath();
    g.moveTo(kx - kw + kw * 2 * f, ky);
    g.lineTo(tx - tw + tw * 2 * f + X((i % 2 ? 3 : -3)), ty);
    g.stroke();
  }
  g.restore();

  // the cuff: a leather cup over the stump, with two straps round it
  const cuff = g.createLinearGradient(kx - kw * 1.3, 0, kx + kw * 1.3, 0);
  cuff.addColorStop(0, '#3d2a1a');
  cuff.addColorStop(0.4, '#8a5f38');
  cuff.addColorStop(1, '#332315');
  g.fillStyle = cuff;
  g.beginPath();
  g.moveTo(kx - kw * 1.35, ky - Y(26));
  g.lineTo(kx + kw * 1.35, ky - Y(26));
  g.lineTo(kx + kw * 1.06, ky + Y(30));
  g.lineTo(kx - kw * 1.06, ky + Y(30));
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(38,26,16,0.85)';
  g.fillRect(kx - kw * 1.3, ky - Y(14), kw * 2.6, Y(7));
  g.fillRect(kx - kw * 1.2, ky + Y(8), kw * 2.4, Y(7));

  // and the iron shoe on the end
  g.fillStyle = '#767b84';
  g.beginPath();
  g.moveTo(tx - tw * 1.25, ty - Y(26));
  g.lineTo(tx + tw * 1.25, ty - Y(26));
  g.lineTo(tx + tw * 1.35, ty); g.lineTo(tx - tw * 1.35, ty);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(180,190,200,0.30)';
  g.fillRect(tx - tw * 1.1, ty - Y(24), tw * 0.5, Y(22));

  /* 3. and his right boot. The photograph's crop runs out at its toe — the
   * sole tapers to nothing at y = 886 and the image ends at 892 — so it
   * reads as a foot that stops rather than a boot standing on a floor. The
   * padding under the picture is where the rest of it goes: a sole, a welt
   * and a toe cap, drawn to meet the leather that is already there.
   *
   * The boot is around x 203-302 at y = 862, closing to 259-266 at y = 886. */
  const bx0 = X(198), bx1 = X(312), by = Y(858), sole = FH - Y(8);
  const leather = g.createLinearGradient(0, by, 0, sole);
  leather.addColorStop(0, '#5a4632');
  leather.addColorStop(1, '#2e2419');
  g.fillStyle = leather;
  g.beginPath();
  g.moveTo(bx0 + X(6), by);
  g.bezierCurveTo(bx0 - X(4), by + Y(26), bx0 + X(2), sole - Y(6), bx0 + X(16), sole);
  g.lineTo(bx1 - X(14), sole);
  g.bezierCurveTo(bx1 + X(2), sole - Y(10), bx1 + X(4), by + Y(22), bx1 - X(8), by);
  g.closePath(); g.fill();
  // the welt, and the sole under it
  g.fillStyle = '#241c14';
  g.beginPath();
  g.moveTo(bx0 + X(10), sole - Y(13));
  g.lineTo(bx1 - X(8), sole - Y(13));
  g.lineTo(bx1 - X(6), sole); g.lineTo(bx0 + X(12), sole);
  g.closePath(); g.fill();
  // a lit edge along the top of the toe cap so it is not a flat shape
  g.strokeStyle = 'rgba(190,170,140,0.30)'; g.lineWidth = X(3);
  g.beginPath();
  g.moveTo(bx0 + X(14), by + Y(16));
  g.quadraticCurveTo((bx0 + bx1) / 2, by + Y(4), bx1 - X(16), by + Y(14));
  g.stroke();
}

// measured off the photograph: his cap brim is dark, the eyes sit just under it
const FISH_EYES = { x: 0.32, y: 0.104, w: 0.24, h: 0.022 };
let fishOpenTex = null, fishShutTex = null;
let fishBlinkT = 1.5 + Math.random() * 3, fishBlinking = false;
new THREE.TextureLoader().load('assets/fisherman.png', (tex) => {
  const img = tex.image;
  if (!img || !img.width) return;
  fishSprite.scale.set(FISH_H * (img.width / (img.height * (1 + FISH_PAD))), FISH_H, 1);
  /* He is the one cut-out you stand close to and look at while he talks, so
   * he gets more of everything than Bradly does across a beach: twice the
   * pixels, more posterisation steps, and less grain and desaturation, which
   * are what were eating the detail in his face. */
  const f = bakeCutout(img, FISH_EYES, { pix: 620, levels: 9, grain: 9, sat: 0.72, paint: paintFisherman, padBottom: FISH_PAD });
  fishOpenTex = f.open; fishShutTex = f.shut;
  fishMat.map = fishOpenTex;
  fishMat.needsUpdate = true;
}, undefined, () => {});
/* Alive, the way Bradly is: he blinks, and he breathes. The sway is tiny and
 * slow — an old man sitting still, not an idle animation. */
let fishSway = 0;
function updateFisherman(dt) {
  if (fishOpenTex) {
    fishBlinkT -= dt;
    if (fishBlinkT <= 0) {
      fishBlinking = !fishBlinking;
      fishMat.map = fishBlinking ? fishShutTex : fishOpenTex;
      fishMat.needsUpdate = true;
      fishBlinkT = fishBlinking ? 0.12 : (Math.random() < 0.2 ? 0.18 : 2.6 + Math.random() * 3.6);
    }
  }
  fishSway += dt;
  fishSprite.position.y = FISH_H / 2 + Math.sin(fishSway * 0.9) * 0.012;
  fishSprite.material.rotation = Math.sin(fishSway * 0.55) * 0.012;
}
{
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, FISH_H + FISH_TUB_H, 0.9),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.y = (FISH_H + FISH_TUB_H) / 2; hit.name = 'hitProxy';
  fisherman.add(hit);
}
function talkToFisherman() {
  fishermanMet = true;
  startDialog('start', {
    name: 'Very Old Fisherman', script: FISHERMAN_SCRIPT, sprite: fishSprite,
    headY: FISH_H * 0.36,
  });
}
let fishermanMet = false;
addInteractable(fisherman, 'Talk to him', 'npc', {
  // not through a shut door. He is inside the shed, and until it is open
  // you can neither see him nor should you be able to hail him.
  when: () => dockDoorOpen,
  onActivate: () => {
    if (!dockDoorOpen) return;
    talkToFisherman();
  },
});
farProps.push({ obj: fisherman, z: FISH_Z, d: 300 });

/* Thirty metres short of the wreck, on the wet sand. You pick it up as a
 * black bar a long way down the beach — you are walking INTO the moon
 * (MOON_DIR), so everything ahead of you is a silhouette, and a sealed black
 * bag on lit sand is the strongest silhouette on the walk. Then the hull
 * comes up out of the fog behind it and the two read as one story.
 *
 * Placed to make sense rather than to be dropped: it lies on the high-water
 * line, skewed off the shore with the head end nearest you, tipped over onto
 * one side and settled into a low drift of the beach's own sand.
 *
 * It has to be clear of the water, and that is a hard number, not a guess.
 * shoreLine() = tide(±3) + swash(±3.6) + wobble(±2), so the waterline can
 * reach x = 8.6 at the top of everything, and the sand plane discards a
 * further metre seaward of it. Anything below that gets the surf drawn over
 * the sand under it and the bag left sitting on top of the water like a raft.
 * At CORPSE_X = 9.6 the body spans 8.9 to 10.3 and is never wet.
 *
 * The model is Dennis Hafemann's "Corpse in a black body bag with ropes",
 * repacked into assets/corpse.glb by tools/gltfpack.py. Geometry untouched; the materials
 * are rewritten from KHR_materials_pbrSpecularGlossiness to plain
 * metallic-roughness, because three r160 dropped that extension and without
 * the rewrite the bag loads as a blank white slug with no maps at all.
 */
const CORPSE_X = 9.6, CORPSE_Z = -126, CORPSE_YAW = 1.15;
const CORPSE_SINK = 0.05;               // how far the bag is bedded into the sand
const corpse = new THREE.Group();
corpse.position.set(CORPSE_X, -CORPSE_SINK, CORPSE_Z);
corpse.rotation.set(0.03, CORPSE_YAW, 0.055);
scene.add(corpse);

// the sand it has settled into — same trick as the rock aprons, but only
// yawed, never tipped, because drifted sand lies flat however the bag lies
{
  const drift = new THREE.Mesh(makeApron(1.1), sandMat);
  // low, or its own shaded flank draws a dark halo round the bag
  drift.scale.set(1.75, 0.085, 0.86);
  drift.position.set(CORPSE_X, -0.035, CORPSE_Z);
  drift.rotation.y = CORPSE_YAW;
  drift.renderOrder = -1;
  driftGroup.add(drift);
}

new GLTFLoader().load('assets/corpse.glb', (gltf) => {
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (/rope/i.test(m.name || '')) {
      m.color.setHex(0xc8bda4);           // wet hemp, still the model's map
      m.roughness = 0.85;
      m.metalness = 0;
      reexpose(m, 0.8);
    } else {
      /* Wet black PVC — and the map really is black: it averages 2/255 and
       * peaks at 28. In the download that was fine, because the material was
       * spec-gloss and everything you saw came off a studio HDRI. There is no
       * environment map here, so left alone the bag renders as a void.
       *
       * The fix is deliberately NOT to make it grey: a black bag has to stay
       * black or it reads as a tarp. So the gamma lift is gentle, the
       * roughness goes down until the moon lays a wet streak along the
       * sheeting, and the rim does the rest of the shape. */
      m.color.setHex(0xffffff);
      m.roughness = 0.3;
      m.metalness = 0;
      reexpose(m, 0.55, [0.115, 0.138, 0.185]);
    }
  });
  corpse.add(gltf.scene);
  // The bag carries the silhouette from a long way off; the ropes are a
  // detail you only ever read stood over it, and they cost 235k triangles.
  farProps.push({ obj: corpse, z: CORPSE_Z, d: 150 });
  gltf.scene.traverse((o) => {
    if (o.isMesh && /rope/i.test(o.material.name || '')) {
      farProps.push({ obj: o, z: CORPSE_Z, d: 45 });
    }
  });

  /* Hover text. The ropes are 235k triangles between them — raycasting that
   * every frame is not on, so the crosshair gets a plain invisible box the
   * size of the bag instead. `bare` prints the line with no [E]: there is
   * nothing to do here, which is rather the point. */
  const proxy = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.42, 0.7),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  proxy.position.y = 0.18;
  proxy.name = 'hitProxy';
  corpse.add(proxy);
  addInteractable(proxy, 'Someone tied it shut.', 'default', { bare: true });
});

/* Solid, like the rocks — you walk round a body, you don't walk through one.
 * Four cylinders down its length approximate the capsule; each one is low
 * enough that you can still jump up and stand on it. */
{
  const ax = Math.cos(CORPSE_YAW), az = -Math.sin(CORPSE_YAW);
  for (let i = 0; i < 4; i++) {
    const t = (i / 3 - 0.5) * 1.42;
    rockColliders.push({
      x: CORPSE_X + ax * t, z: CORPSE_Z + az * t, r: 0.30,
      top: 0.33 - CORPSE_SINK,
    });
  }
}
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
    // On the stair the RAIL is the outer limit, not the brick — the stair
    // stands free of the wall with air between. Your centre may go a little
    // past the rail line; the body overlaps it and that reads as leaning on it.
    const onStair = climb > 0.6;
    const inner = (atLanternTop ? 3.15
                 : onStair ? Math.min(lhBoreAt(climb), LH_RAIL_R + 0.25)
                 : lhBoreAt(climb)) - PLAYER_R;
    const outer = LH_OUTER + PLAYER_R;
    let clamped = null;
    if (insideTower && d > inner) clamped = inner;
    else if (!insideTower && d < outer) clamped = outer;
    // and the pole in the middle
    if (clamped === null && insideTower && !atLanternTop && d < LH_POLE_R + PLAYER_R * 0.7) {
      clamped = LH_POLE_R + PLAYER_R * 0.7;
    }
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
    if (d > 0.3) {
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
    /* Reaching the top does not end it, and neither does stepping out onto
     * the gallery any more — a walk this long should not finish by accident
     * because you drifted two metres. You arrive, and then you put your hand
     * on the light: see the lamp's interactable further down. */
    atLanternTop = stairTurns * LH_RISE >= LH_TOP - 0.4;
  } else {
    lastStairA = ang;
    stairTurns = 0;
    stairY = null;
    atLanternTop = false;
    groundY = headlandAt(camera.position.x, camera.position.z);
  }
}
/* Is there room to stand up where you are? The pier's deck is the only
 * ceiling in the game, so that is what this asks about — plus anything
 * solid whose top is over your head. Standing up under the boards used to
 * put your head through them and hand you back out on top. */
const _upRay = new THREE.Raycaster();
const _upDir = new THREE.Vector3(0, 1, 0);
function headroomClear() {
  const feet = camBaseY - playerEye();
  const stand = feet + EYE_HEIGHT + 0.18;
  /* Look UP and see. This used to ask whether you were inside the pier's
   * plan rectangle, which is a much bigger thing than the pier's roof: the
   * boat is moored inside that rectangle with nothing at all above it, so
   * standing up beside the boat — in open air, under open sky — was refused.
   * A ray knows the difference. */
  _upRay.set(_pv.set(camera.position.x, feet + 0.2, camera.position.z), _upDir);
  _upRay.far = Math.max(0.05, stand - feet - 0.2);
  if (_upRay.intersectObject(dock, true).some((h) => h.object.name !== 'hitProxy' && h.object.visible)) return false;
  /* A narrower body than the push-out uses. At the full radius, standing
   * beside one of the pier's bollards counted as something over your head
   * and locked you in a crouch on open deck. */
  for (const c of rockColliders) {
    if (c.top <= feet + 0.25 || c.top >= stand) continue;
    if (solidDepth(c, camera.position.x, camera.position.z, PLAYER_R * 0.3) > 0) return false;
  }
  return true;
}
const snap = (v, s) => Math.round(v / s) * s;

function update(dt, rawDt = dt) {
  /* The lean is a camera move, not a player move. Putting the player back
   * where they were standing before the physics runs means every clamp below
   * — the cliff, the drain's walls, the floor — sees a position it agrees
   * with, and updatePeek() at the bottom of this function writes the leaned
   * camera back for the render. Without this the clamps get a frame's worth
   * of a body half inside a wall, and hand it back to you when you stand up.
   */
  if (peeking) camera.position.copy(_peekHome);
  const canMove = (locked || fallbackLook) && !frozen();
  const mx = canMove ? (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0) : 0;
  const mz = canMove ? (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0) : 0;
  const move = new THREE.Vector2(mx, mz);
  const moving = move.lengthSq() > 0;
  if (moving) move.normalize();

  const wantRun = canMove && (keys['ShiftLeft'] || keys['ShiftRight']);
  const running = wantRun && moving && stamina > 0 && !exhausted && onGround;
  if (running) { stamina = Math.max(0, stamina - dt / RUN_SECONDS); if (stamina <= 0) exhausted = true; }
  else {
    stamina = Math.min(1, stamina + dt / STAM_REGEN);
    if (exhausted && stamina > 0.35) exhausted = false;
    if (stamina > 0.35) blockGasped = false;    // you can hold it up again
  }
  // and a guard already up drops the moment the bar is empty
  if (blocking && (exhausted || stamina <= 0.001)) gaspOut();
  crouchT += ((crouching ? 1 : 0) - crouchT) * Math.min(1, dt * 11);
  if (crouchT < 0.001) crouchT = 0;
  if (crouchT > 0.999) crouchT = 1;
  const spd = (running ? RUN_SPEED : WALK_SPEED) * settings.walkSpeed * (1 - crouchT * 0.55);

  camera.getWorldDirection(forward);
  forward.y = 0; forward.normalize();
  right.crossVectors(forward, camera.up).normalize();
  const target = new THREE.Vector3().addScaledVector(forward, move.y).addScaledVector(right, move.x).multiplyScalar(spd);
  velocity.lerp(target, 1 - Math.pow(0.0016, dt));
  camera.position.sub(_shakePrev);            // undo last frame's shake first
  _shakePrev.set(0, 0, 0);
  // where you stood before this frame moved you — what a blocked move undoes to
  _preMove.set(camera.position.x, 0, camera.position.z);
  camera.position.addScaledVector(velocity, dt);
  // being nipped shoves you back a little
  if (knockback.lengthSq() > 0.0001) {
    camera.position.addScaledVector(knockback, dt);
    knockback.multiplyScalar(1 - Math.min(1, 7 * dt));
  }
  // The drainage tunnel home is the only way through the sand wall.
  if (!insideTower && !insideDrain && !onDock) {    // the pier's sea end is past WADE_X
    camera.position.x = Math.min(camera.position.x, CLIFF_BLOCK_X);
    camera.position.x = Math.max(camera.position.x, WADE_X);
  }
  updateCastle();           // before the push-out, so you walk through what you just flattened
  updateTower(dt);
  updateFarProps();
  // Rocks are solid: walk into one and you're pushed out, clear its lip and
  // you stand on it. Done after updateTower() so a rock simply beats the sand.
  // Skipped inside the drainage tunnel home — there are no beach rocks in
  // there, and pushOutOfRocks would shove you about inside the pipe.
  if (!insideTower && !insideDrain) {
    const feet = camBaseY - playerEye();
    pushOutOfRocks(feet);
    const rc = rockGroundAt(camera.position.x, camera.position.z, feet);
    if (rc && rc.top > groundY) groundY = rc.top;
  }
  updateDrain(dt);          // last, so it wins on groundY inside the home
  updateShip(dt);           // and the wreck overrides the sand where you're on it
  updateDock(dt);           // the pier's drift, boards and shed walls
  updateFisherman(rawDt);   // he blinks and breathes, like Bradly
  /* ...and then out of anything solid again. updateDock() clamps you to the
   * deck's footprint, and that clamp used to run AFTER the push-out and put
   * you straight back inside a pile — which is how you ended up standing in
   * one. Whatever moves you last, this gets the final word. */
  if (!insideTower && !insideDrain) {
    const feet2 = camBaseY - playerEye();
    pushOutOfSolids(camera.position, feet2, PLAYER_R * 0.85, feet2 + playerHeight());
    const rc2 = rockGroundAt(camera.position.x, camera.position.z, feet2);
    if (rc2 && rc2.top > groundY) groundY = rc2.top;
  }

  // coyote time and a buffered press, so a jump you meant to make happens
  coyote = onGround ? COYOTE_TIME : Math.max(0, coyote - dt);
  if (canMove && keys['Space'] && !jumpLatch) { jumpBuf = JUMP_BUFFER; jumpLatch = true; }
  if (!keys['Space']) jumpLatch = false;
  jumpBuf = Math.max(0, jumpBuf - dt);
  // jumping out of a crouch stands you up first, if there is room to
  if (jumpBuf > 0 && coyote > 0 && canMove && crouching && headroomClear()) crouching = false;
  if (jumpBuf > 0 && coyote > 0 && canMove && !crouching) {
    vy = JUMP_V; onGround = false; coyote = 0; jumpBuf = 0;
    vmImpulse(1.5);                     // the tool hangs back as you leave the ground
  }
  vy -= P_GRAV * dt;
  camBaseY += vy * dt;
  const floorLimit = playerEye() + groundY;
  if (camBaseY <= floorLimit) {
    if (!onGround && vy < -3.5) {
      // land with some weight behind it — the tool keeps going after you stop
      const force = Math.min(1, -vy / 12);
      landDip = Math.max(landDip, 0.06 + force * 0.16);
      addTrauma(force * 0.25);
      vmImpulse(-1.1 - force * 2.4);
      if (!onDock && !onShip && groundY < 0.35 && inWater(camera.position.x, camera.position.z)) sfxSplash(0.9);
      else if (onDock) sfxStepWood();
      else sfxStep();
    }
    camBaseY = floorLimit; vy = 0; onGround = true;
  }
  landDip *= Math.max(0, 1 - 7.5 * dt);
  parryGlow = Math.max(0, parryGlow - dt * 1.6);
  // the window burns down whether or not anything came at you
  if (blocking && blockStart > 0 && parryCool <= 0
      && (performance.now() - blockStart) / 1000 > PARRY_WINDOW) parryCool = PARRY_COOLDOWN;
  parryCool = Math.max(0, parryCool - dt);

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

  /* Splashing is for walking THROUGH water, never over it. On the pier's
   * boards, on the wreck's deck or on a rock you are above the sea, and the
   * surf noise underfoot was the loudest thing wrong with the pier. */
  const wading = !onDock && !onShip && inWater(camera.position.x, camera.position.z)
    && camBaseY - playerEye() < 0.35;
  if (moving && onGround && speed > 0.6) {
    const dx = camera.position.x - lastFootPos.x, dz = camera.position.z - lastFootPos.z;
    const gate = running ? 1.0 : 0.8;
    if (dx * dx + dz * dz > gate * gate) {
      moveDir.copy(velocity).setY(0).normalize();
      if (wading) {
        // no footprint on water — kick up a splash instead
        spawnSplash(camera.position.x, camera.position.z, 9, moveDir.x, moveDir.z, 1);
        sfxSplash(0.85);
      } else if (onDock) {
        sfxStepWood();                     // boards: a knock, and no print
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

  updateViewmodel(rawDt);       // real time: a swing must not stall in hitstop
  updateFlashes(rawDt);
  updateHeldGlow(dt);
  updateDialogCam(dt);
  updatePack(dt);
  updateCrab(dt);
  updateGibs(dt);
  updateBradlyBlink(dt);
  updateHurt(dt);
  updateShines(oceanUniforms.uTime.value);
  updateDoor(dt);

  // Last word on the camera: the lean overwrites whatever the physics above
  // put in camera.position, and restores it exactly when you back out.
  updatePeek(dt);

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
  if (!drainWarmed) warmDrain();
  let dt = Math.min(clock.getDelta(), 0.05);
  // a beat of near-frozen time on a solid hit, drained in real seconds
  /* Hitstop stalls the WORLD, not your hands. Killing the crab sets 0.075 s
   * of near-frozen time, and running the view model on that scaled dt froze
   * the shovel mid-arc — which reads as the animation stuttering on the hit
   * rather than as the hit landing. The swing gets real seconds. */
  const rawDt = dt;
  if (hitstop > 0) { hitstop = Math.max(0, hitstop - dt); dt *= 0.08; }
  oceanUniforms.uTime.value += dt;
  if (!introStarted) titleCam(rawDt);
  update(dt, rawDt);
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
  settings, get hp() { return hp; },
  // aim the camera from the harness: writes the look state itself, so nothing
  // overwrites it on the next frame the way a bare camera.lookAt() gets undone
  look: (yaw, pitch = 0) => { lookEuler.set(pitch, yaw, 0, lookEuler.order); camera.quaternion.setFromEuler(lookEuler); camera.updateMatrixWorld(true); },
  lookAt: (x, y, z) => { const d = new THREE.Vector3(x, y, z).sub(camera.position); window.__bw.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))); },
  lipNdc: () => { armRig.updateMatrixWorld(true); trailTip.getWorldPosition(_lipA); trailRoot.getWorldPosition(_lipB); return _lipA.lerp(_lipB, 0.5).project(vmCamera); },
  landK: () => landK, landDist: () => landDist,
  aimO: () => _aimO.clone(), aimD: () => _aimD.clone(),
  addToInventory, openPack, closePack, selectPackSlot, sfxCastleBreak, digImpacted: () => digImpacted,
  finishTyping, dialogTextEl, get hitstop() { return hitstop; },
  hurtCrab, get digOverhead() { return digOverhead; }, get windOverhead() { return windOverhead; },
  keys, overheadHeld,
  CRAB_HP, CRAB_HEAVY,
  gibs, bloodDrops, coveredByWater, submersionAt, waterSurfaceAt, listenToShell, stopListening,
  get audioCtx() { return audioCtx; }, sfxOut,
  dropEquipped, dropPoint, groundUnder, driftGroup, driftAt, updateGibs, updatePuffs,
  mounds, moundMat, moundAt, revealMoundNear, makeMound, makeCdCase,
  get cdItem() { return cdItem; },
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
  drainTunnel, DRAIN_X, DRAIN_Z, updateDrain, sfxDrip,
  shipwreck, SHIP_X, SHIP_Z, shipFloorAt, shipWheel, get onShip() { return onShip; }, get inBridge() { return inBridge; },
  get drainWarmed() { return drainWarmed; }, get drainWarmError() { return drainWarmError; },
  waterBottle, waterBottleWorld, get waterBottleItem() { return waterBottleItem; },
  get insideDrain() { return insideDrain; }, get drainMix() { return drainMix; },
  waterSurfaceAt, submersionAt, restYInWater, groundGlow, addRipple,
  shells, listenToShell, makeRockGeo, dock, ring, driftAt, updateDock,
  listen: (v) => { listening = v; }, stopListening, keyItem, keyWorld,   // the ear pose without the audio, for the preview harness
  get dockDoorOpen() { return dockDoorOpen; }, set dockDoorOpen(v) { dockDoorOpen = v; }, get onDock() { return onDock; },
  crabs, makeCrabUnit, nearestCrab, crabPlay, updateCrabUnit,
  packCrabs, updatePack, get packPhase() { return packPhase; }, PACK_Z,
  lhDoor, shinies, onPath, pathBend, pathHalfAt, lhWindows, lanternGlass,
  get doorOpen() { return doorOpen; }, set doorOpen(v) { doorOpen = v; doorSwing = v ? 1 : 0; lhDoor.rotation.y = -doorSwing * 1.95; },
  get insideTower() { return insideTower; },
  rockColliders, rockGroundAt, pushOutOfRocks, rockGroup, headroomClear, solidDepth,
  parryCrab, blockCrab, breakCastle, get blocking() { return blocking; }, set blocking(v) { blocking = v; blockStart = performance.now(); },
  get parryCool() { return parryCool; }, get blockStart() { return blockStart; },
  onPier, deckHeightAt, fisherman, FISHERMAN_SCRIPT,
  get crouching() { return crouching; }, set crouching(v) { crouching = v; },
  startPeek, endPeek, respawn, get peeking() { return peeking; }, get gateEyes() { return gateEyes; },
  get ringProp() { return ringProp; },
  armRig, shovelItem, startWind, releaseWind,
  crate, ringItem, ringWorld, rings, breakCrate, wearRing,
  get crateBroken() { return crates[0].broken; }, crates, get ringsFound() { return ringsFound; },
  get digT() { return digT; }, get digPower() { return digPower; }, get winding() { return winding; },
  corpse, CORPSE_X, CORPSE_Z,
  get lhParts() { return lhParts; },
  get insideTower() { return insideTower; },
  get groundY() { return groundY; }, set groundY(v) { groundY = v; },
  get camBaseY() { return camBaseY; }, set camBaseY(v) { camBaseY = v; },   // floor tests in the harness
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
