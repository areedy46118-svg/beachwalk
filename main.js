import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeHorseshoeCrab, makeHorseshoeCrabIcon } from './models/horseshoe-crab.js';
import { makeSyringe, makeSyringeIcon } from './models/syringe.js';
import { makeBloodJar } from './models/blood-jar.js';
import { makeDrainageTunnelHome } from './models/drainage-tunnel-home.js';
import { makeWaterBottle, makeWaterBottleIcon } from './models/water-bottle.js';
import { makeShipwreck } from './models/shipwreck.js';
import { makeMushroomHouse, MUSH } from './models/mushroom-house.js';
import { makeRing, makeRingIcon } from './models/ring.js';
import { makeCdCase, makeCdCaseIcon } from './models/cd-case.js';
import { makeUndergroundBunker } from './models/underground-bunker.js';

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
/* EIGHT IS THE TOP SPEED NOW. At 4.7 a sprint was "only a little faster than
 * a walk", which was right for a kilometre of beach where the pace IS the
 * game and wrong for a control room eleven metres long with a man swinging a
 * crowbar in it: you could not cross it, could not break off, and every
 * disengage was a slow shuffle backwards. It is the Dealer's own dash speed,
 * so a gap you open by running is a gap he has to spend his dash to close. */
/* And it is 8 AT THE OWNER'S OWN SETTING, which is what "make 8 the max
 * walk speed" means: the speed slider multiplies this, and his sits at 1.4,
 * so the constant is the number that comes out as eight in his game rather
 * than eight before the multiplier turns it into eleven. It is written out
 * rather than divided at load — `DEFAULT_SETTINGS` is declared a hundred and
 * forty lines further down, and reading it here is a temporal dead zone
 * crash that takes the whole page, which is the file's oldest trap. */
const RUN_SPEED = 5.71;                   // = 8.0 / the 1.4 speed setting
const RUN_SECONDS = 5;                    // how long you can sprint
/* AND THE BAR COMES BACK QUICKER. Nine seconds for a full bar meant one
 * emptying decided the next third of the fight; six keeps blocking a real
 * cost without making a mistake unrecoverable. */
const STAM_REGEN = 6;                     // seconds to recover a full bar
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
const DEFAULT_SETTINGS = { fov: 107, sensitivity: 1, brightness: 1.16, volume: 0.5, musicVolume: 0.30, waveVolume: 0.18, sfxVolume: 0.57, walkSpeed: 1.4, invertY: false, devMode: false };
let settings = { ...DEFAULT_SETTINGS };
try { settings = { ...settings, ...JSON.parse(localStorage.getItem('beachwalk.settings') || '{}') }; } catch (e) {}
settings.devMode = false;   // NEVER carried over: a game always starts as a game, whatever the last session was
// walk speed is never remembered: every game starts at the default 1.4×, and
// the slider is for the session you are in
settings.walkSpeed = DEFAULT_SETTINGS.walkSpeed;
function saveSettings() { try { localStorage.setItem('beachwalk.settings', JSON.stringify({ ...settings, devMode: false })); } catch (e) {} }
/* The checkpoint lives beside the settings. It is written ONCE a game, when
 * you reach the pavilion, and read only by a death or by the menu — there is
 * deliberately no manual save: the walk is the thing, and a quicksave key
 * turns a walk into a series of attempts. */
const SAVE_KEY = 'beachwalk.save';
function hasCheckpoint() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
let loadMode = 'fresh';
try { loadMode = sessionStorage.getItem('beachwalk.load') || 'fresh'; sessionStorage.removeItem('beachwalk.load'); } catch (e) {}

let audioStarted = false, audioCtx = null, masterGain = null;
let titleSurfGain = null;               // the sea under the title, pulled down on begin
let musicEl = null, musicEnvGain = null, musicVolGain = null, musicStarted = false;
let waveBusGain = null;   // sub-mix for surf ambience + water-step splashes
let windDuck = null;      // the wind's last stage: the bunker pulls it down
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
    /* The wreck, punched out of the sea. The surf runs up to x = 8.6 and
     * she lies from x = -7 to 19, so without this the waves wash straight
     * through her forward half. World-space, like shoreLine(): the ocean
     * is a tile snapped back onto the player every frame, so anything cut
     * in local space would slide along the beach with it. uShipHalf stays
     * 0 until she is built, which disables the test. */
    uShipHalf: { value: 0 },
    uShipC: { value: new THREE.Vector2() },
    uShipHW: { value: Array.from({ length: 17 }, () => 0) },
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
    // the first row sits 12 cm UNDER the beach plane, so the sand covers the
    // edge instead of meeting it on a line (see "Sink a rim, don't dither it")
    // a TALUS, not a step: 5.5 m wide, flat for most of it (t^3 keeps it under
    // 12 cm where you can still walk, at CLIFF_BLOCK_X) and rising only in
    // the last stretch, so the normal turns slowly and there is no crease
    if (u < 0.22) { const t = u / 0.22; cx = L(CLIFF_X - 5.5, CLIFF_X - 0.25, t); cy = -0.12 + 0.67 * Math.pow(t, 3.0); }
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
  /* THE TOE IS THE BEACH. Where the cliff meets the sand it used to meet on
   * a line you could see from the spawn: a hand-guessed tint that was not
   * the beach's, the cliff's own grain at a different density, a bump twice
   * the beach's, and a dithered edge lying ON the sand plane. `aU` is the
   * loft parameter (0 at the toe, 1 at the top) and over the bottom band
   * everything converges on the sand material EXACTLY: the colour and
   * emissive are scaled by the ratio of the two materials' own constants
   * (uniforms, not guesses); the map and emissive map are sampled in WORLD
   * space at the beach's density and phase — (w + 800) / SAND_TILE, the same
   * formula the ridge bakes into its uv — so the grain is continuous across
   * the join; the beach's wet treatment (tint, roughness, metalness off
   * `shoreLine`) runs in the same band; the bump is eased toward the flat
   * geometric normal; and the edge row is sunk under the sand plane, so
   * there is no edge to dither. Up the face it is the cliff's own. */
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
    sh.uniforms.uTime = oceanUniforms.uTime;
    sh.uniforms.uToeCol = { value: new THREE.Vector3(sandMat.color.r / mat.color.r, sandMat.color.g / mat.color.g, sandMat.color.b / mat.color.b) };
    sh.uniforms.uToeEmi = { value: new THREE.Vector3(sandMat.emissive.r / mat.emissive.r, sandMat.emissive.g / mat.emissive.g, sandMat.emissive.b / mat.emissive.b) };
    sh.uniforms.uToeBump = { value: sandMat.bumpScale / mat.bumpScale };
    sh.uniforms.uSandTile = { value: SAND_TILE };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aU;\nvarying float vU;\nvarying vec3 vToeW;\nvarying vec3 vToeN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vU = aU;\n  vToeN = normalize(mat3(modelMatrix) * objectNormal);')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\n  vToeW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vU;
        varying vec3 vToeW, vToeN;
        uniform float uTime, uToeBump, uSandTile;
        uniform vec3 uToeCol, uToeEmi;
        float bwT, bwWet;
        vec4 bwToeTex;
        ` + noiseGLSL + shoreGLSL)
      .replace('#include <map_fragment>', `
        bwT = smoothstep(0.10, 0.48, vU);                 // the beach for the talus and the lower face, the cliff's own above
        // the beach's own grain at the beach's density and phase: laid flat
        // where the surface is flat, and stood up (z, y) where it turns into
        // the wall, so it never streaks down a vertical face
        vec2 bwUvFlat = vec2((vToeW.x + 800.0) / uSandTile, (800.0 - vToeW.z) / uSandTile);
        vec2 bwUvWall = vec2((800.0 - vToeW.z) / uSandTile, vToeW.y / uSandTile);
        float bwUp = smoothstep(0.35, 0.85, abs(vToeN.y));
        vec4 bwBeach = mix(texture2D(map, bwUvWall), texture2D(map, bwUvFlat), bwUp);
        bwToeTex = mix(bwBeach, texture2D(map, vMapUv), bwT);
        diffuseColor *= bwToeTex;
        // the beach's constants, exactly, and its wet treatment
        diffuseColor.rgb *= mix(uToeCol, vec3(1.0), bwT);
        float bwFrom = vToeW.x - shoreLine(vToeW.z, uTime);
        bwWet = smoothstep(16.0, -1.0, bwFrom) * (1.0 - bwT);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.78, 0.9), bwWet);`)
      .replace('#include <emissivemap_fragment>', `
        totalEmissiveRadiance *= bwToeTex.rgb * mix(uToeEmi, vec3(1.0), bwT);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.30, bwWet);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = mix(metalnessFactor, 0.22, bwWet);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // the beach's bump is weaker: ease the perturbation toward it on the apron
        normal = normalize(mix(nonPerturbedNormal, normal, mix(uToeBump, 1.0, bwT)));`);
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
function addItemShine(root, { size = 0.55, height = 0.12, strength = 1, lift = 1 } = {}) {
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
  shinies.push({ root, glint, mats, strength, lift, phase: Math.random() * 6.28 });
}
function updateShines(t) {
  for (const s of shinies) {
    if (!s.root.parent) { s.glint.material.opacity = 0; continue; }
    // slow breath, never fully off — a wet-shell highlight catching the moon
    const k = 0.5 + 0.5 * Math.sin(t * 1.5 + s.phase);
    s.glint.material.opacity = (0.055 + 0.075 * k) * s.strength;
    for (const { m, base } of s.mats) {
      // `lift` scales the glow on the object itself: a dark textured scan
      // is swamped by the stock lift and reads as a flat grey cut-out
      const L = s.strength * s.lift;
      m.emissive.setRGB(
        base.r + (0.055 + 0.045 * k) * L,
        base.g + (0.065 + 0.050 * k) * L,
        base.b + (0.085 + 0.065 * k) * L
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

  /* Built off a photograph of a bare print in wet sand: the whole sole is ONE
   * shallow depression — heel, arch and ball read as a single shape with a
   * continuous outer edge — with the shadow lying INSIDE it along the wall
   * that faces away from the light, a faint lip of pushed-up sand outside
   * the other edge, and the toes as separate, deeper pits. The first version
   * drew a pale ring round every part and read as a cartoon; the second was
   * so faint it read as nothing. The shadow wall is what sells depth. */
  const union = (grow = 0) => { g.beginPath(); for (const p of PARTS) { g.ellipse(p[0], p[1], p[2] + grow, p[3] + grow, p[4], 0, Math.PI * 2); } };

  // 1. the lip: a soft, faint lift of sand outside the lit edge only
  g.save(); g.translate(2.4, 3.0); g.lineJoin = 'round';
  for (const [w, col] of [[9, 'rgba(200,212,236,0.05)'], [5, 'rgba(214,226,246,0.08)'], [2.5, 'rgba(226,236,252,0.11)']]) {
    g.lineWidth = w; g.strokeStyle = col; union(2.5); g.stroke();
  }
  g.restore();

  // 2. the floor: one flat, shallow depression
  g.fillStyle = 'rgba(3,5,11,0.50)'; union(1.5); g.fill();
  // heel and ball sit deeper than the arch
  for (const p of [HEEL, BALL]) {
    const rg = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], p[2] + 2);
    rg.addColorStop(0, 'rgba(1,2,6,0.34)'); rg.addColorStop(1, 'rgba(1,2,6,0)');
    g.fillStyle = rg; ell(p, 2); g.fill();
  }

  // 3. the shadow wall: darken the whole floor, then lift the darkening off
  //    everywhere except a band along the edge that faces away from the moon
  g.save(); union(1.5); g.clip();
  g.fillStyle = 'rgba(1,2,6,0.46)'; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'destination-out';
  g.save(); g.translate(3.4, 4.4); g.fillStyle = 'rgba(0,0,0,0.62)'; union(0.5); g.fill(); g.restore();
  g.globalCompositeOperation = 'source-over';
  g.restore();

  // 4. the toes are small and DEEP — pressed harder, and cut clean
  for (const p of TOES) {
    const rg = g.createRadialGradient(p[0], p[1] + 1, 0, p[0], p[1], p[2] + 1.5);
    rg.addColorStop(0, `rgba(1,2,6,${0.80 * p[5]})`);
    rg.addColorStop(0.7, `rgba(2,4,9,${0.50 * p[5]})`);
    rg.addColorStop(1, 'rgba(2,4,9,0)');
    g.fillStyle = rg; ell(p, 1.5); g.fill();
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
      ? `rgba(${150 + rnd(70) | 0},${162 + rnd(70) | 0},${184 + rnd(60) | 0},${0.04 + rnd(0.10)})`
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

/* ONE GAIT FOR EVERY TRAIL. Measured off a photograph of a walk along a
 * beach: each foot lands `FOOT_SIDE` off the line of travel on its own side
 * (so the two lines are a foot's width apart), a stride `FOOT_STRIDE`
 * apart, toes turned `FOOT_TOE` out. The player's own prints, the trail
 * behind the spawn to the drain, and the trail at the campsite all use
 * these — a trail with a different spacing reads as a different animal. */
const FOOT_SIDE = 0.26, FOOT_STRIDE = 0.66, FOOT_TOE = 0.12;   // a clear zigzag: left well left, right well right
const FOOT_POOL = 96;
const footGeo = new THREE.PlaneGeometry(0.31, 0.44); footGeo.rotateX(-Math.PI / 2);   // a print is wider than it looks
/* DoubleSide, or you only ever leave one track. stampFoot() mirrors the
 * right foot with a negative x scale, and a negative determinant flips the
 * winding — so with the default FrontSide every right-hand print is
 * backface-culled and you walk the beach on one leg. campFoot shares this
 * material, so it takes the fix too. */
const foot = new THREE.InstancedMesh(footGeo, new THREE.MeshBasicMaterial({ map: makeFootTexture(), transparent: true, depthWrite: false, opacity: 0.88, side: THREE.DoubleSide }), FOOT_POOL);
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
  // feet fall either side of the line of travel, toes a little out, never quite the same
  const off = (FOOT_SIDE + (Math.random() - 0.5) * 0.04) * side;
  _fe.y += side * FOOT_TOE + (Math.random() - 0.5) * 0.10;
  _fq.setFromEuler(_fe);
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
  // the walk in from the drain: on the line, the stagger is stampFoot's own
  for (let i = 26; i >= 1; i--) { stampFoot(camera.position.x + (Math.random() - 0.5) * 0.04, camera.position.z + i * FOOT_STRIDE, 0, -1, side); side = -side; }
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
    uniform vec4 uRipples[8];
    uniform float uShipHalf; uniform vec2 uShipC; uniform float uShipHW[17];          // xz = origin, z = start time, w = strength
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

      // and no sea inside the wreck's waterline
      if (uShipHalf > 0.0) {
        float lx = vWorld.x - uShipC.x;
        if (abs(lx) < uShipHalf) {
          float t = (lx + uShipHalf) / (2.0 * uShipHalf) * float(17 - 1);
          int i0 = int(floor(t));
          float f = t - float(i0);
          float a = 0.0, b = 0.0;
          for (int k = 0; k < 17; k++) {
            if (k == i0) a = uShipHW[k];
            if (k == i0 + 1) b = uShipHW[k];
          }
          if (abs(vWorld.z - uShipC.y) < mix(a, b, f)) discard;
        }
      }

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
const MAX_HP = 4;    // the bunker's boss is a long fight; three made it a coin toss
const HURT_FADE = 1.1;                 // seconds for the hit's spike of red to bleed off
/* YOU MEND. A hit used to be forever: two crabs an hour apart were the same
 * fight, and the third exchange of the night was a one-hit death. Twelve
 * seconds without being hurt and a point comes back, then another every
 * eight — slow enough that a fight is still a fight, quick enough that the
 * next one is not decided by the last. And while you are down a point the
 * red does not leave the edges of the screen: it settles to a faint,
 * breathing rim, deeper the worse you are, so you always know. */
const REGEN_DELAY = 12;                // seconds unhurt before you start to mend
const REGEN_EVERY = 8;                 // then a point back every so many seconds
let hp = MAX_HP, hurtFlash = 0, dying = false, sinceHurt = 1e9, regenAcc = 0;
function damagePlayer(n = 1) {
  if (dying || ended || !introDone) return;
  hp -= n;
  sinceHurt = 0; regenAcc = 0;           // the mending starts over from the last blow
  // DEV MODE: a hit still lands — flash, knock, sound — but it never finishes you
  if (settings.devMode) hp = Math.max(hp, 1);
  hurtFlash = 1;
  sfxHurt();
  addTrauma(0.7);
  hitstop = 0.05;       // ~3 frames
  // shoved back off whatever hit you — a crab or the thing past the pavilion,
  // whichever is actually nearer; asking only for a crab knocked you away from
  // one three hundred metres back up the beach
  const hitter = nearestFoe(camera.position);
  if (hitter) {
    const kx = camera.position.x - hitter.position.x, kz = camera.position.z - hitter.position.z;
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
  // come back at the checkpoint if there is one, and never sit through the
  // opening card again
  setTimeout(() => { reloadInto(hasCheckpoint() ? 'checkpoint' : 'fresh'); }, 1600);
}
const healthEl = document.getElementById('health');
let hpShown = -1;
function updateHurt(dt) {
  if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt / HURT_FADE);
  /* THE HEALTH BAR. Three hairline segments in the bottom left, in the HUD's
   * own language — no frame, no number — dim red while you are whole and
   * brighter the more of you is gone, with a flash on the hit. It is the
   * only colour on the screen, which is what makes it read. */
  if (hp !== hpShown) {
    hpShown = hp;
    const segs = healthEl.children;
    for (let i = 0; i < segs.length; i++) segs[i].classList.toggle('off', i >= hp);
  }
  healthEl.style.opacity = (introDone && !ended && !dying) ? (hp < MAX_HP ? 0.95 : 0.42) : 0;
  healthEl.classList.toggle('hurt', hurtFlash > 0.55);
  if (!dying && !ended && introDone && hp < MAX_HP) {
    sinceHurt += dt;
    if (sinceHurt > REGEN_DELAY) {
      regenAcc += dt;
      if (regenAcc >= REGEN_EVERY) { regenAcc = 0; hp = Math.min(MAX_HP, hp + 1); }
    }
  }
  // the hit is a sharp spike with a soft tail; under it, while you are
  // hurt, a faint rim that breathes and deepens with every point you are down
  const wounded = 1 - hp / MAX_HP;
  const rim = wounded > 0 ? (0.14 + 0.24 * wounded) * (0.86 + 0.14 * Math.sin(performance.now() * 0.0022)) : 0;
  hurtEl.style.opacity = String(Math.max(hurtFlash * hurtFlash, rim));
}

function frozen() { return noteOpen || menuOpen || dialogOpen || invOpen || inspecting || peeking || packCut || mutCut || hatchBusy || dying || ended || !introDone; }
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
    fallbackLook = false; dragging = false;          // a real lock ends the drag fallback, however we got here
    started = true; overlay.classList.add('hidden'); refreshUI();
  } else {
    if (fallbackLook || ended) return;
    if (!started) { overlay.classList.remove('hidden'); return; }
    // an intentional exit (note / menu / dialogue / death) is handled by
    // those; a stray exit while still playing means the user hit Esc → menu
    if (!menuOpen && !noteOpen && !dialogOpen && !invOpen && !inspecting && !peeking && !packCut && !mutCut && !dying) openMenu();
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
/* While you hold her wheel the mouse turns the WHEEL and not your head.
 * `dragWheel` was defined and wired to a puzzle and never once called: the
 * look handler took every mousemove, so the wheel could be grabbed and
 * released and never turned, and the head never came off its hook. */
document.addEventListener('mousemove', (e) => {
  if (wheelGrab) { dragWheel(e.movementX); return; }
  if (locked && !frozen()) applyLook(e.movementX, e.movementY);
});
window.addEventListener('pointermove', (e) => {
  if (wheelGrab && fallbackLook && dragging) { dragWheel(e.movementX); return; }
  if (fallbackLook && dragging && !frozen()) applyLook(e.movementX, e.movementY);
});

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
/* AND A CHECKPOINT DOES NOT ASK. Restarting from a checkpoint used to hand
 * you the title card and PRESS ANY KEY — which is the game beginning, and
 * this is the middle of one. It starts itself the moment the file is up: no
 * card, no menu, no opening music, and you are standing at the pavilion
 * before you have finished reading the button you pressed. The one thing a
 * page cannot give itself is a pointer lock, so the look falls back to drag
 * for the instant it takes you to click, and the click takes the lock —
 * which `scheduleLockRetry` and the pointerdown handler already do for the
 * Safari case, so there is nothing new here to go wrong. */
let instantStart = false;

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
  /* THE OPENING MUSIC IS THE OPENING. Coming back to a checkpoint you are
   * mid-walk — three hundred metres down a beach you have already crossed —
   * and the piece that plays you in from the title would start the game over
   * in the one sense that matters. The sea keeps going; nothing else does. */
  if (!instantStart) startMusic();
  requestLock();                                   // fires on the click gesture, when there was one
  overlay.classList.add('hidden');
  leaveTitle();

  if (skipIntro) {
    introDone = true;
    for (const k in keys) keys[k] = false;
    clock.getDelta();
    beginRestore();                                // if you came back to a checkpoint
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
    beginRestore();
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
    /* A CHECKPOINT LOAD HAS NO GESTURE. `beginGame` asks for the lock with
     * nobody's hand on the mouse, the request fails, and `enterFallback`
     * puts the look on drag — which is right for a browser that cannot lock
     * and wrong for one that simply was not asked by a click. The old test
     * only let you back out of the fallback if a lock had ONCE worked, and
     * on a fresh page it never had: the owner came back from a checkpoint
     * and had to drag the camera round for the rest of the game. Any press
     * on the world is a gesture, so it asks outright, and success clears
     * the fallback in `pointerlockchange`. A browser that cannot lock says
     * no and nothing changes. */
    if (fallbackLook) {
      const q = renderer.domElement.requestPointerLock && renderer.domElement.requestPointerLock();
      if (q && q.catch) q.catch(() => {});
    } else requestLock();
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
document.getElementById('m-reset').addEventListener('click', () => {
  settings = { ...DEFAULT_SETTINGS };
  syncMenuInputs(); applySettings(); saveSettings();
});
/* TWO WAYS BACK, AND NO SAVE BUTTON. Everything the walk changed — the crab,
 * the crate, the bottle, the pack, the rings, where you are — goes back by
 * loading the file again, which is the only honest way to reset a world this
 * size; what differs is what is put back afterwards. "Restart game" clears
 * the checkpoint and gives you the beach as it was on the first morning;
 * "restart from last checkpoint" keeps it and hands you the walk exactly as
 * you were carrying it when you reached the pavilion. The opening card is
 * skipped either way; the title click stays, because pointer lock needs a
 * gesture and nothing can give it one for you. */
function reloadInto(mode) {
  try {
    sessionStorage.setItem('beachwalk.skipIntro', '1');
    sessionStorage.setItem('beachwalk.load', mode);
    if (mode === 'fresh') localStorage.removeItem(SAVE_KEY);
  } catch (e) {}
  location.reload();
}
function respawn() { reloadInto('fresh'); }
document.getElementById('m-restart').addEventListener('click', respawn);
const mCheckpointBtn = document.getElementById('m-checkpoint');
mCheckpointBtn.addEventListener('click', () => { if (hasCheckpoint()) reloadInto('checkpoint'); });
applySettings();
syncMenuInputs();

function openMenu() {
  if (ended || menuOpen) return;
  menuOpen = true;
  mCheckpointBtn.disabled = !hasCheckpoint();
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
/* ---- WHAT YOU PICKED UP, BY NAME ------------------------------------
 * The checkpoint does not serialise items — it remembers which PICKUPS you
 * took, and the restore fires those same `onActivate` handlers again. That
 * is the only way to get this right in a file this size: the handler is
 * what removes the thing from the beach, builds its view model, names it and
 * puts it in the pack, and every one of those is different. Re-running it is
 * the game doing the work it already knows how to do. The id is the label
 * plus a count, because the world is built from seeded noise and lays out
 * identically every load — the third shell is the third shell every time. */
const takenPickups = new Set();
const pickupSeen = new Map();
function addInteractable(root, label, kind, data) {
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const it = { root, label, kind, meshes, ...data };
  if (kind === 'inventory' && it.onActivate) {
    const n = (pickupSeen.get(label) || 0) + 1;
    pickupSeen.set(label, n);
    it.save = label + '#' + n;
    const inner = it.onActivate;
    it.onActivate = () => { takenPickups.add(it.save); inner(); };
  }
  interactables.push(it);
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
    raycaster.far = it.far || REACH;           // a man in the water is hailed from the beach
    const hits = raycaster.intersectObjects(it.meshes, false);
    if (hits.length && hits[0].distance < bestD) { bestD = hits[0].distance; best = it; }
  }
  raycaster.far = REACH;                       // the override above must not leak to other raycasts
  hovered = best;
  if (best) {
    crosshair.className = 'active';
    /* label and bare may be functions: a thing whose prompt depends on what
     * you are carrying (the shell door reads differently once you have the
     * key) has to be asked, not read once at registration. */
    const lbl = typeof best.label === 'function' ? best.label() : best.label;
    const br = typeof best.bare === 'function' ? best.bare() : best.bare;
    setPrompt(br ? lbl : kbd('E') + lbl);
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
/* THE FLOOR IN THE BUNKER, ASKED FROM UP HERE. The physics, the gibs and
 * the breaking glass all need to know that there is a steel floor forty
 * metres under the beach — and the room that says so is declared thousands
 * of lines below this, which in one long module of consts is a dead-zone
 * crash. So it is a hook: null until the hatch section fills it in, and it
 * answers with the floor's height only for a body that is actually down
 * there. It cannot be folded into the "highest surface wins" test the other
 * grounds use, because the bunker's floor is forty metres BELOW the sand —
 * anything down there would be lifted to the beach. It replaces. */
let bunkerFloorAt = () => null;
class PhysProp {
  constructor(mesh, opts = {}) {
    this.mesh = mesh;
    this.vel = new THREE.Vector3();
    this.angVel = new THREE.Vector3();
    this.radius = opts.radius ?? 0.3;
    this.restH = opts.restH ?? this.radius;
    /* A SHELF OF ITS OWN. The world's grounds are the sand, the deck, the
     * solids and the bunker's floor — a desk top in a scanned room is none
     * of them, so a bottle set on one fell straight through it and broke on
     * the floor the moment it existed. A body can carry a `floorAt` that
     * answers for its own perch, and stops answering once it has been
     * knocked off it, which is exactly when it should fall. */
    this.floorAt = opts.floorAt || null;
    /* AND A ROOM IT CANNOT LEAVE. Nothing in the physics knows about the
     * bunker's walls, so a bottle thrown hard went straight out through
     * the concrete, broke somewhere over the beach, and left its shards
     * lying on the sand forty metres up. `confine` is a world-space box the
     * body bounces off — the cheapest possible wall, and the only one a
     * sealed room needs. */
    this.confine = opts.confine || null;
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
      // the cliff stops it; the sea does not. Walled at WADE_X, a thing held
      // at the waterline sat pinned at your chest and every throw from there
      // began behind an invisible barrier.
      /* THE FLOOR IT IS HELD ABOVE IS THE ONE UNDER IT. This clamped the
       * hold target to `restH` — an absolute height, a hand's width over the
       * SAND — so picking anything up in the bunker set a target forty
       * metres above the player's head and the spring threw it at the
       * ceiling at 24 m/s. That is "every item I picked up was tossed in the
       * air". The cliff wall is the beach's too, and has no business in a
       * room three hundred metres past it. */
      const hf = bunkerFloorAt(_pt.x, _pt.z, _pv.y);
      if (hf === null) _pt.x = Math.min(_pt.x, CLIFF_BLOCK_X - this.radius);
      _pt.y = Math.max(_pt.y, (hf === null ? 0 : hf) + this.restH);
      this.vel.subVectors(_pt, p).multiplyScalar(13);
      if (this.vel.length() > 24) this.vel.setLength(24);
      p.addScaledVector(this.vel, dt);
      this.angVel.multiplyScalar(1 - Math.min(1, 8 * dt));
      return;
    }
    this.vel.y -= GRAV * dt;
    p.addScaledVector(this.vel, dt);
    if (this.confine) {
      const c = this.confine, r = this.radius * 0.6;
      if (p.x < c.x0 + r) { p.x = c.x0 + r; if (this.vel.x < 0) this.vel.x *= -this.bounce - 0.25; }
      else if (p.x > c.x1 - r) { p.x = c.x1 - r; if (this.vel.x > 0) this.vel.x *= -this.bounce - 0.25; }
      if (p.z < c.z0 + r) { p.z = c.z0 + r; if (this.vel.z < 0) this.vel.z *= -this.bounce - 0.25; }
      else if (p.z > c.z1 - r) { p.z = c.z1 - r; if (this.vel.z > 0) this.vel.z *= -this.bounce - 0.25; }
      if (c.y1 !== undefined && p.y > c.y1 - r) { p.y = c.y1 - r; if (this.vel.y > 0) this.vel.y *= -this.bounce; }
    }
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
    const bf = bunkerFloorAt(p.x, p.z, p.y);
    if (bf !== null) { rest = bf + this.restH; surface = 'metal'; }
    if (this.floorAt) {
      const pf = this.floorAt(p.x, p.z, p.y);
      if (pf !== null && pf !== undefined && pf + this.restH > rest) { rest = pf + this.restH; surface = 'metal'; }
    }
    const sc = bf === null ? rockGroundAt(p.x, p.z, p.y) : null;
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
    /* The cliff is a wall to a thrown thing; the sea is NOT. There used to be
     * a wall at WADE_X too, which is why nothing could be thrown into the
     * water — it hit glass at the waterline and dropped. A body flies as far
     * as its arc takes it now and comes to rest in the water it lands in. */
    const hi = CLIFF_BLOCK_X - this.radius;
    if (!onPier(p.x, p.z)) {
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
      for (const u of mutants) {
        if (!u.st.alive || u.st.struck) continue;
        if (Math.hypot(p.x - u.g.position.x, p.z - u.g.position.z) >= 0.9 || p.y > u.kind.h) continue;
        hitConnect(0.4, 1); hurtMutant(u, 1);
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
  held.thrown = true;                 // the snorkeler answers to a throw, not to a body lying near him
  // strong, and about fifteen metres out: past the snorkeler, not past the horizon
  held.vel.copy(_pf).multiplyScalar(16).add(new THREE.Vector3(0, 2.2, 0));
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
// where the ground is under a point — the sand, or the room under the beach
function floorFor(p) {
  const bf = bunkerFloorAt(p.x, p.z, p.y);
  return bf === null ? 0 : bf;
}
function shatterGlass(prop, mesh, speed, radius, threshold = 4.6) {
  if (prop.dead || speed < threshold) return;        // a gentle knock just clinks
  prop.dead = true;
  const p = mesh.position.clone();
  scene.remove(mesh);
  removeInteractable(mesh);
  if (hovered && hovered.root === mesh) hovered = null;
  sfxGlassBreak();
  /* AND BREAKING SOMETHING DOES NOT SHAKE THE ROOM EITHER. The blow that
   * broke it already put trauma through the camera — `hitConnect` on the
   * shovel, the body's own landing — and adding more per object turned a
   * fight through a bench of glassware into a camera that would not settle.
   * What a bottle going is: the noise and the shards. */
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
    m.position.set(p.x + (Math.random() - 0.5) * radius, Math.max(floorFor(p) + 0.04, p.y), p.z + (Math.random() - 0.5) * radius);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    scene.add(m);
    const a = Math.random() * Math.PI * 2, out = 0.8 + Math.random() * 2.2;
    gibs.push({
      m,
      vel: new THREE.Vector3(Math.cos(a) * out, 1.6 + Math.random() * 2.4, Math.sin(a) * out),
      spin: new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20),
      rest: floorFor(p) + 0.015 + Math.random() * 0.03,
      life: 30, bleed: false,
    });
  }
}

/* SMASHING ELECTRONICS. Glass goes to slivers; a monitor or a set goes to
 * CASE — dark plastic and pressed steel — with its screen going separately,
 * and it arcs. Same shape as `shatterGlass` so the shovel's `glassStrike`
 * and a hard throw both reach it through `onImpact`, and the sparks are
 * real gibs on an emissive material so they bounce off the floor and die
 * rather than being a puff of sprites in the middle of the room. */
const CASE_MAT = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.85, metalness: 0.18, flatShading: true, emissive: 0x0a0c0e });
const SCREEN_MAT = new THREE.MeshStandardMaterial({ color: 0x8fa7b4, roughness: 0.14, metalness: 0.0, flatShading: true, transparent: true, opacity: 0.7, emissive: 0x16242c, side: THREE.DoubleSide });
const SPARK_MAT = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
function smashElectronics(prop, mesh, speed, radius, threshold = 4.0) {
  if (prop.dead || speed < threshold) return;
  prop.dead = true;
  const p = mesh.position.clone();
  scene.remove(mesh);
  removeInteractable(mesh);
  if (hovered && hovered.root === mesh) hovered = null;
  sfxSmashElectronics();
  /* AND IT DOES NOT SHAKE THE ROOM. A monitor coming off a desk is a noise
   * and a shower of parts, not an event the building feels — and with
   * eighteen of them in here, a jolt on each turned a fight through the
   * console bank into a camera that would not hold still. The trauma is
   * the player's own blows and the bodies landing; a breaking set gets the
   * pieces and the sparks and nothing else. */
  const gy = floorFor(p);
  const push = (m, up, out, life, spin) => {
    m.position.set(p.x + (Math.random() - 0.5) * radius, Math.max(gy + 0.04, p.y), p.z + (Math.random() - 0.5) * radius);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    scene.add(m);
    const a = Math.random() * Math.PI * 2;
    gibs.push({
      m, vel: new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out),
      spin: new THREE.Vector3((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin),
      rest: gy + 0.015 + Math.random() * 0.03, life, bleed: false,
    });
  };
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(radius * (0.3 + Math.random() * 0.5), radius * (0.1 + Math.random() * 0.3), radius * (0.3 + Math.random() * 0.4)), CASE_MAT);
    push(m, 1.4 + Math.random() * 2.0, 0.7 + Math.random() * 1.9, 40, 14);
  }
  for (let i = 0; i < 11; i++) {
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(radius * (0.16 + Math.random() * 0.22), 0), SCREEN_MAT);
    m.scale.set(1, 0.3 + Math.random() * 0.4, 1);
    push(m, 1.8 + Math.random() * 2.4, 1.0 + Math.random() * 2.4, 30, 20);
  }
  // it arcs as it goes: a dozen bright specks, gone in a moment
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.016), SPARK_MAT);
    push(m, 2.4 + Math.random() * 3.2, 1.4 + Math.random() * 3.0, 0.55 + Math.random() * 0.5, 30);
  }
}
/* The report: the case giving, the tube letting go, and the arc. Short —
 * this is a thing breaking, not an explosion. */
function sfxSmashElectronics() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut();
  const body = noiseBurst(0.16, (x) => Math.pow(1 - x, 2.2));
  const bf = ctx.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 380;
  const bg = ctx.createGain(); bg.gain.value = 0.55;
  body.connect(bf).connect(bg).connect(out); body.start(t); body.stop(t + 0.16);
  // the tube: a hard implosive pop with a ring on it
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(760, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.09);
  const og = ctx.createGain(); og.gain.setValueAtTime(0.34, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
  o.connect(og).connect(out); o.start(t); o.stop(t + 0.14);
  // glass off the steel floor
  for (let i = 0; i < 7; i++) {
    const at = 0.02 + Math.random() * 0.34;
    const g2 = noiseBurst(0.035, (x) => Math.pow(1 - x, 5));
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 7; f2.frequency.value = 3200 + Math.random() * 3600;
    const gg = ctx.createGain(); gg.gain.value = 0.10 + Math.random() * 0.12;
    g2.connect(f2).connect(gg).connect(out); g2.start(t + at); g2.stop(t + at + 0.035);
  }
  // and the arc
  const arc = noiseBurst(0.22, (x) => Math.pow(1 - x, 1.4) * (Math.random() < 0.35 ? 1 : 0.12));
  const af = ctx.createBiquadFilter(); af.type = 'highpass'; af.frequency.value = 2600;
  const ag = ctx.createGain(); ag.gain.value = 0.16;
  arc.connect(af).connect(ag).connect(out); arc.start(t + 0.03); arc.stop(t + 0.25);
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
    iconsPending = true;      // its scan has not arrived; come back for it
  }
  return item.icon;
}
/* AND THE FALLBACK IS NOT THE FINAL ANSWER. The drawn icon is only there to
 * cover the seconds before a scan lands, and nothing ever asked again — so
 * on a checkpoint load, where the whole pack is rebuilt before any of the
 * network models have arrived, every scanned item kept its drawing for the
 * rest of the game. This asks again while anything is still waiting, on a
 * TIMER rather than a frame, because a pack is not something that should
 * depend on the render loop running. */
let iconsPending = false;
setInterval(() => {
  if (!iconsPending) return;
  let ready = false, stillWaiting = false;
  for (const it of inventory) {
    if (!it || it._icon) continue;
    const m = it.iconModel || it.inspectModel;
    if (!m) continue;
    let empty = true;
    m.traverse((o) => { if (o.isMesh) empty = false; });
    if (empty) stillWaiting = true; else ready = true;
  }
  iconsPending = stillWaiting;
  if (ready) { renderHotbar(); if (invOpen) renderPack(); }
}, 600);
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
    if (equipped.onDig) {
      toolVM = vm;
      const lip = equipped.lip || SAND_LIP;
      toolVM.add(trailTip, trailRoot);           // re-parents: the ribbon rides this blade now
      trailTip.position.set(lip[0][0], lip[0][1], lip[0][2]);
      trailRoot.position.set(lip[1][0], lip[1][1], lip[1][2]);
    }
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
      // no name in the slot: the pane on the right names the selection
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
const ARM_SIDE = 0.58;                   // the hands' resting x, as a fraction of the frame's half-width
const ARM_ROT_X = 0.10;
const armRig = new THREE.Group();
armRig.position.copy(ARM_BASE);
armRig.rotation.set(ARM_ROT_X, -0.45, 0.10);
viewmodel.add(armRig);

// Keep the floating item at the same spot in the frame whatever the window
// shape: derive its X/Y from the view's half-extents at the item's depth —
// tucked into the lower-right corner like a held tool.
let vmHalfW = 0.5;                       // the frame's half-width at the hands' depth: what `side` is a fraction of
function layoutViewmodel() {
  const d = Math.abs(ARM_BASE.z);
  const halfH = Math.tan((vmCamera.fov * Math.PI) / 360) * d;
  const halfW = halfH * vmCamera.aspect;
  vmHalfW = halfW;
  ARM_BASE.x = halfW * ARM_SIDE;
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
/* THE MILITARY SHOVEL IS NOT THE BEACH SHOVEL. Both items declared
 * `icon: makeShovelIcon()` — a bright red plastic spade — as the drawn
 * fallback for before their model has landed. On a normal walk you pick the
 * thing up an hour in and the render has long since replaced it, so nobody
 * saw it; on a CHECKPOINT LOAD the pack is rebuilt seconds after the page
 * starts, before the 1.8 MB scan arrives, and the fallback is what you got:
 * a red beach toy in the slot the Military Shovel was in. */
function makeMilShovelIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#6f7360';                              // olive drab, not red
  g.beginPath();                                        // the dished blade
  g.moveTo(15, 26); g.lineTo(33, 26); g.lineTo(30, 42); g.lineTo(24, 45); g.lineTo(18, 42); g.closePath(); g.fill();
  g.fillStyle = '#565a4c'; g.fillRect(21, 24, 6, 4);    // the collar
  g.fillStyle = '#3f4238'; g.fillRect(22, 8, 4, 17);    // the shaft
  g.strokeStyle = '#3f4238'; g.lineWidth = 3.5;         // the D-handle
  g.beginPath(); g.moveTo(19, 10); g.lineTo(19, 6); g.lineTo(29, 6); g.lineTo(29, 10); g.stroke();
  return c.toDataURL();
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
/* AND IT PIVOTS AT ITS GRIP TOO. The Military Shovel's model is slid down
 * inside its group by `MIL_GRIP_Y` so the D-handle sits on the mount — a
 * sword turns about the hands. The sand shovel was never slid, so with the
 * two now sharing a rest pose and a cut they hung at visibly different
 * heights (measured: 28 cm apart at rest) and, worse, the charged cock was
 * laid out for a tool that turns about its grip — swing this one about its
 * NECK through the same angles and the blade leaves the top of the frame,
 * taking the full-charge glint with it. Same treatment: an outer group takes
 * the pose, the model inside it slides, and the slide comes back out for the
 * guard and the overhead, which were both laid out on the neck pivot. */
const SAND_GRIP_Y = 0.60;
const sandModel = makeShovel();
const shovelVM = new THREE.Group();
shovelVM.add(sandModel);
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
/* THE MILITARY SHOVEL IS SWUNG LIKE A SWORD, AND A SLASH IS A ROLL. The
 * blade has to travel ACROSS the picture, never along its own length: the
 * first diagonal cut had the shaft pointing away from the camera and the arm
 * pitching, so the tip drove forward down its own line — the trail was a
 * straight streak to the impact point, which is a STAB. For the tip to sweep
 * from the top right corner to the bottom left it has to start standing in
 * the picture plane, and the arm has to ROLL it across (rotation.z), with the
 * pitch and yaw only carrying the arc down and out. So the slash grip IS the
 * rest grip — scoop straight up over the fist, shaft (0.11, 0.96, -0.27),
 * found by search — and all of the cut is in the arm. */
const VM_SLASH_ROT = [-3.142, -0.483, 0.483];
/* AND AT REST IT IS A SWORD AT GUARD. The sand shovel hangs blade-down in the
 * dig grip; the Military Shovel is HELD, scoop straight up over the fist and
 * a little forward, the way a blade is carried between cuts. Searched the same
 * way: shaft (0.11, 0.96, -0.27), edge in the screen plane. The slash winds
 * up out of this rather than out of the dig grip, so the blade only ever goes
 * from high to higher to down — it never has to come up off the sand first. */
const VM_MIL_REST_ROT = [-3.142, -0.483, 0.483];
/* ONE GRIP FOR BOTH SHOVELS. They already share the cut, the overhead and
 * the guard; holding them differently at rest was the last thing that made
 * the sand shovel a different tool, and it made the hand jump every time you
 * scrolled between them. `VM_REST_ROT` is not gone — it is the DIG grip, and
 * the dig grip is what the guard turns back into on either tool. */
const restRot = () => VM_MIL_REST_ROT;
shovelVM.rotation.set(VM_MIL_REST_ROT[0], VM_MIL_REST_ROT[1], VM_MIL_REST_ROT[2]);
let ohBlend = 0, slBlend = 0;
shovelVM.visible = false;
toolMount.add(shovelVM);
/* THE SHOVEL IN HAND. The dig, the trail, the overhead roll and the hit
 * flash all used to name `shovelVM` directly; with a second digging tool
 * they name `toolVM`, which toggleEquip() points at whichever dig item is
 * equipped and re-hangs the trail markers on, at that tool's own lip. */
let toolVM = shovelVM;
const SAND_LIP = [[-0.095, -0.21, -0.05], [0.095, -0.21, -0.05]];

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
  trailTip.getWorldPosition(_tv); const tx = _tv.x, ty = _tv.y, tz = _tv.z;
  trailRoot.getWorldPosition(_tv);
  if (trailLen === 0) {
    /* THE FIRST SAMPLE FILLS EVERY SLOT. The strip draws its quad from slot 0
     * to slot 1 as soon as there is one sample, and slot 1 still held the last
     * point of the PREVIOUS swing — on a cut that finishes at the far side of
     * the frame that was a ribbon the width of the screen on the first frame
     * of the next one, pointing at where the last one ended. */
    for (let i = 0; i < TRAIL_N; i++) {
      const o = i * 6;
      trailPos[o] = tx; trailPos[o + 1] = ty; trailPos[o + 2] = tz;
      trailPos[o + 3] = _tv.x; trailPos[o + 4] = _tv.y; trailPos[o + 5] = _tv.z;
    }
  } else {
    // shuffle every sample one slot older, then write the newest into slot 0
    trailPos.copyWithin(6, 0, (TRAIL_N - 1) * 6);
    trailPos[0] = tx; trailPos[1] = ty; trailPos[2] = tz;
    trailPos[3] = _tv.x; trailPos[4] = _tv.y; trailPos[5] = _tv.z;
  }
  trailLen = Math.min(TRAIL_N, trailLen + 1);
}
let trailGain = 1;
/* SPARKS. Steel stopping steel throws light, and light is what tells you the
 * block landed before any sound gets there. They live in the view-model scene
 * so they are always in front of you and always at the blade, they are
 * additive so they read against the dark, and there are eighteen of them
 * reused forever — a pool, like the puffs and the footprints. */
const SPARK_N = 18;
const sparkGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array(SPARK_N * 3), col = new Float32Array(SPARK_N * 3);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
const sparkPts = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
  size: 0.016, vertexColors: true, transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, sizeAttenuation: true,
}));
sparkPts.frustumCulled = false; sparkPts.visible = false;
vmScene.add(sparkPts);
const sparks = [];
for (let i = 0; i < SPARK_N; i++) sparks.push({ ttl: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), hot: 1 });
let sparkIdx = 0;
function spawnSparks(n, power) {
  const at = new THREE.Vector3();
  if (trailTip) trailTip.getWorldPosition(at); else at.set(0, 0, -0.6);
  vmScene.worldToLocal(at);
  for (let i = 0; i < n; i++) {
    const sp = sparks[sparkIdx]; sparkIdx = (sparkIdx + 1) % SPARK_N;
    sp.ttl = 0.16 + Math.random() * 0.22;
    sp.hot = 0.7 + Math.random() * 0.6;
    sp.p.copy(at);
    const a = Math.random() * Math.PI * 2, r = (0.5 + Math.random()) * (0.7 + power);
    sp.v.set(Math.cos(a) * r, Math.abs(Math.sin(a)) * r * 0.9 + 0.3, -(0.2 + Math.random() * 0.8) * r);
  }
}
function updateSparks(dt) {
  let live = 0;
  const pos = sparkGeo.attributes.position.array, col = sparkGeo.attributes.color.array;
  for (let i = 0; i < SPARK_N; i++) {
    const sp = sparks[i];
    if (sp.ttl <= 0) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
    sp.ttl -= dt; live++;
    sp.v.y -= 2.2 * dt;
    sp.p.addScaledVector(sp.v, dt);
    pos[i * 3] = sp.p.x; pos[i * 3 + 1] = sp.p.y; pos[i * 3 + 2] = sp.p.z;
    const k = Math.max(0, sp.ttl / 0.3) * sp.hot;
    col[i * 3] = k; col[i * 3 + 1] = k * 0.78; col[i * 3 + 2] = k * 0.45;   // struck steel is warm
  }
  sparkGeo.attributes.position.needsUpdate = true;
  sparkGeo.attributes.color.needsUpdate = true;
  sparkPts.visible = live > 0;
}

/* FULL CHARGE SHOWS ON THE BLADE. `sfxWindFull` already tells you; this is
 * the same moment made visible — a small point of light at the very tip that
 * flickers while you hold, for every shovel, so you never overhold a heavy
 * wondering if it is there yet. It is a sprite in the view-model scene parked
 * on `trailTip` each frame (so it rides whichever tool is in hand), additive,
 * and it TWINKLES rather than glows: a smoothed random flicker in size and
 * brightness, which is what a highlight on a moving edge does and a lamp
 * does not. */
/* THE GLINT IS A SPARKLE, NOT A LAMP. A hot core, four long tapering rays and
 * four short ones on the diagonal — the shape every hand-drawn highlight on
 * a blade has had since anyone drew one. Drawn as gradient strokes so the
 * rays fade to nothing rather than ending, at 96 px so the taper survives
 * the retro downscale. */
const glintTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d'); const m = 48;
  const r = g.createRadialGradient(m, m, 0, m, m, 22);
  r.addColorStop(0, 'rgba(255,252,240,1)'); r.addColorStop(0.3, 'rgba(255,244,220,0.55)'); r.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = r; g.fillRect(0, 0, 96, 96);
  const ray = (ang, len, w, a) => {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const lg = g.createLinearGradient(m, m, m + dx * len, m + dy * len);
    lg.addColorStop(0, `rgba(255,255,255,${a})`); lg.addColorStop(0.35, `rgba(255,250,235,${a * 0.55})`); lg.addColorStop(1, 'rgba(255,250,235,0)');
    g.strokeStyle = lg; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(m, m); g.lineTo(m + dx * len, m + dy * len); g.stroke();
  };
  for (let i = 0; i < 4; i++) ray(i * Math.PI / 2, 46, 2.6, 0.95);                    // the long rays
  for (let i = 0; i < 4; i++) ray(i * Math.PI / 2 + Math.PI / 4, 22, 1.8, 0.55);      // the short ones between
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const tipGlint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
tipGlint.scale.setScalar(0.04); tipGlint.visible = false; tipGlint.renderOrder = 10;
vmScene.add(tipGlint);
let glintK = 0, glintN = 0, glintT = 0, glintPop = 0, glintPopAt = 0.5, glintWas = 0;
const GLINT_SWEEP = 0.26;                   // the light runs the length of the edge in this
const _glintP = new THREE.Vector3(), _glintR = new THREE.Vector3(), _glintC = new THREE.Vector3(), _glintN = new THREE.Vector3(), _glintS = new THREE.Vector3();
/* AND IT MOVES LIKE ONE. The first version sat on the tip and jittered — a
 * lamp with a loose contact. Now, the moment the charge tops out, the light
 * RUNS the length of the cutting edge from the root to the tip, big and
 * bright, and arrives; then it holds there breathing slowly, turning slowly,
 * and every half second or so it POPS — a sharp brightening and a flick of
 * spin, gone in a tenth of a second — which is what a highlight does when
 * the hand holding the blade trembles. The pops are on an irregular count,
 * because a regular one is a beacon. */
function updateGlint(dt) {
  const want = (winding && windFull) ? 1 : 0;
  if (want && !glintWas) { glintT = 0; glintPop = 0; glintPopAt = 0.35; tipGlint.material.rotation = Math.random() * Math.PI; }
  glintWas = want;
  glintK += (want - glintK) * Math.min(1, dt * (want ? 18 : 10));
  if (glintK < 0.01) { tipGlint.visible = false; return; }
  tipGlint.visible = true;
  glintT += dt;
  /* ON THE EDGE, WHERE YOU CAN SEE IT. The wound pose holds the blade out to
   * the side and the very tip is often past the frame's edge, so a glint on
   * the tip alone was a glint you could not see at the one moment it was for.
   * Walk the cutting edge from tip to root and take the first point that is
   * actually inside the frame; the whole lip is the edge, so any of it is
   * "the tip of the shovel" as far as the eye is concerned. */
  trailTip.getWorldPosition(_glintP); trailRoot.getWorldPosition(_glintR);
  let placed = false;
  for (let k = 0; k <= 4 && !placed; k++) {
    _glintC.lerpVectors(_glintP, _glintR, k / 4);
    _glintN.copy(_glintC).project(vmCamera);
    if (Math.abs(_glintN.x) < 0.94 && Math.abs(_glintN.y) < 0.94) { tipGlint.position.copy(_glintC); placed = true; }
  }
  /* And when the WHOLE edge is out of shot — the sand shovel's full wind holds
   * the blade clear off the right of the frame — walk on down the tool toward
   * the hand and light the first part of it that is in view. It is on the
   * shovel and it is where your eye is; that is the job. */
  if (!placed) {
    toolMount.getWorldPosition(_glintC);
    for (let k = 1; k <= 6 && !placed; k++) {
      _glintN.lerpVectors(_glintR, _glintC, k / 6);
      const q = _glintN.clone().project(vmCamera);
      if (Math.abs(q.x) < 0.94 && Math.abs(q.y) < 0.94) { tipGlint.position.copy(_glintN); placed = true; }
    }
    if (!placed) tipGlint.position.copy(_glintC);
  }
  /* The run along the edge: from the root end (or the hand, when the edge is
   * out of shot) to the point it will hold at, over GLINT_SWEEP. */
  if (glintT < GLINT_SWEEP) {
    _glintS.copy(_glintR).project(vmCamera);
    const rootIn = Math.abs(_glintS.x) < 0.94 && Math.abs(_glintS.y) < 0.94;
    if (!rootIn) toolMount.getWorldPosition(_glintR);
    const u = easeOutCubic(glintT / GLINT_SWEEP);
    tipGlint.position.lerpVectors(_glintR, tipGlint.position, u);
  }
  // the hold: a slow breath, a slow turn, and the irregular pop
  glintPop = Math.max(0, glintPop - dt / 0.11);
  glintPopAt -= dt;
  if (glintPopAt <= 0 && glintT >= GLINT_SWEEP) { glintPop = 1; glintPopAt = 0.38 + Math.random() * 0.55; }
  glintN += ((Math.random() - 0.5) * 2 - glintN) * Math.min(1, dt * 14);   // a little life under it, smoothed
  const breath = 0.5 + 0.5 * Math.sin(glintT * Math.PI * 2 * 1.3);
  const sweep = glintT < GLINT_SWEEP ? 1 - glintT / GLINT_SWEEP : 0;          // big and bright while it runs
  const f = 0.55 + 0.30 * breath + 0.15 * glintN + glintPop * 0.9 + sweep * 0.8;
  tipGlint.material.rotation += dt * (0.8 + glintPop * 9);
  tipGlint.material.opacity = Math.min(1, glintK * (0.45 + 0.55 * f));
  tipGlint.scale.setScalar(glintK * (0.036 + 0.030 * f));
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
      * trailFade * (0.020 + trailPower * 0.062) * trailGain;
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
const _blkQ = new THREE.Quaternion(), _blkE = new THREE.Euler(), _blkV = new THREE.Vector3(), _blkP = new THREE.Vector3();
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
  inspectModel: makeShovel(), lip: SAND_LIP,
  use: () => toggleEquip(shovelItem),
};
// ------------------------------------------------------------------
// The Military Shovel — howittworks' "Survival Shovel" scan, CC-BY-4.0
// ------------------------------------------------------------------
/* A second digging tool, used exactly as the sand shovel is: same swings,
 * same trail, same overhead, same prompts — it is an item with `onDig` and
 * its own `lip`, and toggleEquip() points `toolVM` at it. The scan comes in
 * through tools/gltfpack.py with its base colour at 2048 and its normal and
 * metal-rough maps kept (1.8 MB; the source is 52 MB of PNG), because the
 * point of it is that it looks like the photograph it was scanned from.
 *
 * The model is 95 cm long down its X in centimetres, the wide flat blade at
 * -X and the handle plate at +X, and the glTF root carries a Z-up matrix. It
 * is put into the SAND SHOVEL'S frame — shaft up +Y, blade down to
 * y = -0.21, thin axis on Z — by one rotation matrix and a lift, so every
 * pose, the blade-on-the-crosshair correction and the drop all hold
 * untouched. Three groups because the scan lands over the network: the
 * hand's copy, the examine/drop copy, and the one on the beach. */
/* THE HAND IS ON THE HANDLE. The scan sits in the sand shovel's frame with
 * its neck at the origin, so every turn of the arm turned the tool about its
 * NECK — the handle flailed the other way and a cut read as a baton twirled.
 * The hand's copy is shifted down its own length so the D-grip sits on the
 * mount: a sword turns about the hands. The lip markers move with it. The
 * sand shovel keeps its neck pivot — a spade is held there. */
const MIL_GRIP_Y = 0.68;
const MIL_LIP = [[-0.12, -0.21 - MIL_GRIP_Y, 0], [0.12, -0.21 - MIL_GRIP_Y, 0]];
const milModel = new THREE.Group(), milInspect = new THREE.Group(), militaryWorld = new THREE.Group();
function orientMil(src) {
  /* EACH COPY GETS ITS OWN MATERIALS. clone(true) shares them, and the
   * pickup glint on the beach copy lifts the emissive of every material
   * under it — so the copy in your HAND and the pack icon glowed a flat
   * blue-grey too, which is what "it looks lit up" was: not the maps, not
   * the lights, the glint on a different object. */
  src.traverse((o) => { if (o.isMesh) o.material = o.material.clone(); });
  const w = new THREE.Group();
  /* WHICH END IS THE BLADE. The wide flat thin part at model -X is the
   * D-HANDLE — a loop of steel is flat. The blade is the wide part at +X
   * that sits OFFSET in the thin axis: a dished plate, bent off the shaft
   * line the way an entrenching tool's is. The first build took the flat
   * end for the blade and the tool hung upside down, striking with the
   * grip. Loaded axes: length on X (blade +X), thin on Y (blade plate at
   * -Y), width on Z. Wanted: width on X, length on Y with the blade at -Y,
   * thin on Z. The scoop has to face the DIRT in the hand — the plate on
   * +Z, dish toward the ground — which is half a turn about the shaft from
   * the first guess. Rows: x = +Lz, y = -Lx, z = -Ly. */
  w.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(0, 0, 1, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 1));
  w.scale.setScalar(0.01);
  const g = new THREE.Group();
  g.add(w); w.add(src);
  g.position.y = 0.25;                         // blade tip at -0.21, like the sand shovel's lip
  const out = new THREE.Group(); out.add(g);
  return out;
}
new GLTFLoader().load('assets/military-shovel.glb', (gltf) => {
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.material.side = THREE.DoubleSide;
    /* MATTE, like the photograph. At gamma 0.62 with the scan's own
     * metalness the tool rendered pale grey — a dark olive albedo lifted
     * that hard is chalk, and metal with no environment is pinpoints. A
     * gentle lift, full roughness and little metalness is the painted
     * steel in the picture. */
    /* AS DARK AS THE PHOTOGRAPH. No night lift at all — the paint is olive
     * drab and any gamma lift made it read as highlighted — and the map is
     * multiplied down a little besides, because the hand's lights are set
     * for a red plastic toy. Full roughness, so nothing on it glints. */
    o.material.roughness = 1.0;
    o.material.metalness = 0.10;
    // a touch brighter and greener than the flat cut: the multiplier leans
    // olive, and a faint olive emissive keeps the paint's colour under the
    // cold night light instead of letting it go to grey
    o.material.color.setHex(0xc2cba6);
    o.material.emissive = new THREE.Color(0x0c1006);
  });
  milModel.add(orientMil(gltf.scene));
  milInspect.add(orientMil(gltf.scene.clone(true)));
  militaryWorld.add(orientMil(gltf.scene.clone(true)));
}, undefined, () => {});
const militaryVM = new THREE.Group();
militaryVM.add(milModel);
milModel.position.y = -MIL_GRIP_Y;
militaryVM.scale.setScalar(0.48);
militaryVM.position.set(-0.04, -0.02, 0.0);
militaryVM.rotation.set(VM_MIL_REST_ROT[0], VM_MIL_REST_ROT[1], VM_MIL_REST_ROT[2]);   // scoop up: a sword at guard
militaryVM.visible = false;
toolMount.add(militaryVM);
const militaryItem = {
  name: 'Military Shovel', icon: makeMilShovelIcon(), onDig: true, viewmodel: militaryVM,
  inspectModel: milInspect, lip: MIL_LIP,
  use: () => toggleEquip(militaryItem),
};
// a few steps past the drain (DRAIN_X / DRAIN_Z are declared much further
// down; reading them here is a dead-zone crash), on the sand at the cliff foot
militaryWorld.position.set(CLIFF_BLOCK_X - 2.0, 0.06, 34 + 4.5);
militaryWorld.rotation.set(-Math.PI / 2, 0, 0.45);
{
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  proxy.position.y = 0.25; proxy.name = 'hitProxy';
  militaryWorld.add(proxy);
}
scene.add(militaryWorld);
// its own glint, added first so makeNoticeable() does not add the stock one:
// a scan this dark is swamped by the stock lift
addItemShine(militaryWorld, { size: 0.9, height: 0.3, strength: 0.7, lift: 0.25 });
addInteractable(militaryWorld, 'Take the military shovel', 'inventory', {
  onActivate: () => {
    sfxThud(0.04);
    scene.remove(militaryWorld);
    hovered = null;
    addToInventory(militaryItem);
    toggleEquip(militaryItem);
  },
});

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
/* THE GUARD BOUNCES. A blow stopped on steel used to be a decaying sine on
 * `parryGlow` — a shudder that started at its loudest and got quieter, which
 * is a rattle, not an impact. This is a real spring: the blow drives it, it
 * overshoots, it comes back through and it settles, so the tool is KNOCKED
 * and recovers. Three visible bounces on a parry, one and a half on a block,
 * and it is the same shape the whole game reads impacts with. */
let guardShock = 0, guardShockV = 0;
/* THE WORLD ROLLS WITH THE CUT. A few hundredths of a radian of camera roll
 * on the frame the blade lands, decaying out over a quarter second: the hands
 * stay level (they are in their own scene) and the WORLD tips, which is what
 * force through your shoulders feels like from the inside. Applied around the
 * scene render and removed again, so it never leaks into the look state. */
let hitRoll = 0;
/* THE SLAM DIP. An overhead that lands drops the CAMERA ten centimetres and
 * lets it back up over a third of a second — your knees, not the shovel.
 * Applied around the scene render and removed, like the roll. */
let slamDip = 0;
/* STIFFER, SO IT SNAPS RATHER THAN WALLOWS. At 420 the spring took most of
 * a second to come back through and a stopped blow read as the tool being
 * shoved; a block wants to arrive and be over. Same damping ratio, a third
 * quicker — it still rings three times, it just rings and is done. */
const GUARD_K = 640, GUARD_D = 13.5;     // stiff and only lightly damped: it rings
let winding = false, windT = 0, digPower = 0, digCharged = false, windFull = false;
/* THE OVERHEAD. Hold sprint while you wind and the shovel goes up over your
 * head in both hands instead of back over your shoulder, and comes down the
 * middle — the one swing in the game that is a smash rather than a dig. It
 * is a POSE SET, not a second animation system: the same three lerps run,
 * they just run between different poses, so the landing, the trail and the
 * blade-on-the-crosshair correction all work exactly as they already do. */
let digOverhead = false, windOverhead = false;
const overheadHeld = () => !!(keys['ShiftLeft'] || keys['ShiftRight']);

/* Poses are [pitch, lift, yaw, roll, push, side] and the swing is lerps
 * between them, rather than five hand-written curves per segment. That is
 * what lets the charged release start from an arbitrary pose instead of a
 * fixed one. `side` is the hands' travel ACROSS the frame, as a fraction of
 * its half-width so it is the same picture at any window shape; only the cut
 * uses it — a chop and a smash keep the hands where they are. */
const REST_POSE = [0, 0, 0, 0, 0, 0];
const _poseA = [0, 0, 0, 0, 0, 0];      // where the strike starts
const _poseB = [0, 0, 0, 0, 0, 0];      // where it lands
const _poseC = [0, 0, 0, 0, 0, 0];      // where a cut's follow-through ends
const _pose = [0, 0, 0, 0, 0, 0];       // this frame, and what release captures
function poseMix(out, a, b, t) {
  for (let i = 0; i < 6; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}
/* WHICH SWING THIS IS. The sand shovel chops; the Military Shovel CUTS — a
 * sword stroke, right to left across the whole frame, coming back the other
 * way when a second one follows inside a beat so a combination reads as a
 * combination. It still digs: `digImpact` never asks what the pose was, so
 * the crater, the sand and the crab test are all untouched. An overhead is
 * always an overhead. The side is chosen when the swing is COMMITTED — the
 * click, or the start of a wind-up — so the cocked pose and the cut agree. */
let slashDir = -1, lastSlashAt = -1e9;   // -1 sweeps right to left
/* BOTH SHOVELS CUT. The stroke was the Military Shovel's alone and the sand
 * shovel still chopped, so the two tools played different games; the owner
 * asked for one. Nothing about the cut is the scan's — `VM_SLASH_ROT` is
 * identical to the Military Shovel's own rest grip, which is the comment's
 * "the cut is all arm" made literal — so the poses, the timing, the trail
 * and the whoosh transfer whole, and each tool keeps its own grip through
 * `restRot()`. The overhead was always shared. */
const slashing = () => !!(equipped && equipped.onDig) && !digOverhead;
/* ALWAYS RIGHT TO LEFT. A backhand on the second click was built — the
 * forehand mirrored about the middle of the frame, leaving from the far hip
 * where the first cut finished — and cut on the owner's word: two cuts in
 * two directions inside half a second read as flailing, not as a
 * combination, and the light cut is the swing you make most. One direction,
 * every time, and you know where the blade is going before you click. */
const pickSlashDir = () => -1;
/* THE BACKHAND IS THE FOREHAND IN A MIRROR — about the middle of the frame,
 * not about the hands' rest. `side` is measured from where the hands rest,
 * which is off to the right, so simply negating it sent the backhand's
 * follow-through a whole frame-width further right and out of the picture:
 * the hands must end where the forehand's began, mirrored. */
const mirrorSide = (s, d) => d < 0 ? s : -2 * ARM_SIDE - s;
/* THE CUT, IN THREE POSES: cocked, on the mark, and out the far side. The
 * tool pivots at the GRIP — a sword turns about the hands — and the hands
 * themselves TRAVEL: `side` carries the grip from the cocked shoulder across
 * the frame to the far hip while `roll` swings the blade about it from
 * pointing up on the near side to pointing down on the far side, so the tip
 * comes in off one edge, arcs over the upper middle and goes out low on the
 * other, the whole width of the picture. Pitch is nearly still and yaw only
 * cancels the arm's own turn, so the blade stays IN THE PLANE OF THE SCREEN
 * from cock to follow-through: what you see is the flat of the blade,
 * sweeping. That plane is the entire difference between a cut and a stab. The
 * two versions before this tilted the blade toward the camera as it came
 * down, so the tip drove along its own length and every frame foreshortened
 * — a shovel poked at the ground. (A true flat horizontal cut is a YAW sweep
 * and passes through pointing straight at the target, which is the same
 * stab; a sword swing that READS is a roll.) The heavy cocks higher and
 * further back over the shoulder — it is the held pose, and the blade has to
 * be on screen to twinkle — finishes lower, and drives further out. Laid out
 * numerically: the lip's screen position was probed at every quarter of both
 * lerps and the numbers moved until the tip crossed the middle level and the
 * grip stayed in frame at full charge. `d` is the side, -1 for right to left. */
/* THE CUT IS A STRAIGHT LINE. The first cuts rolled the blade over the top —
 * from pointing up on the near side to pointing down on the far side — and
 * with the pivot at the grip that is an ARC: the tip rose over the upper
 * middle before it came down, and the owner wanted a concise straight line
 * from the top right to the bottom left. The geometry: a roll of Δθ through
 * the strike bulges the tip off the chord by L(1 − cos(Δθ/2)), and L is the
 * whole blade, so a straight line means a SMALL roll — the blade already
 * pointing down the line at the cock and turning only ~0.7 rad through it —
 * while the hands do the travelling. So: the blade points down the diagonal
 * from cocked to through, the lip (which is across the tip) sweeps a broad
 * straight band, and the hands come in from off the right edge to the far
 * hip. Both cuts run the same line; the heavy is corner to corner, the light
 * shorter. The numbers are SOLVED, not guessed: `side` and `lift` were fitted
 * so the lip's middle lands on (0.86, 0.60) → (0, 0) → (-0.60, -0.76) at 16:9
 * for the heavy and (0.64, 0.40) → (0, 0) → (-0.42, -0.52) for the light, and
 * the interpolated path was checked at the quarters: (0.54, 0.40),
 * (0.31, 0.23), (0.13, 0.10) — a line. */
function slashCock(out, P, d) {
  out[0] = -(0.06 + P * 0.04);
  out[1] = 0.322 + P * 0.061;
  out[2] = 0.45;                                // cancels the arm's turn: the blade lies in the picture
  out[3] = -d * (1.45 - P * 0.10);              // pointing down the line already
  out[4] = 0.06;
  out[5] = mirrorSide(0.547 + P * 0.217, d);    // the hands off the near edge, high
  return out;
}
function slashMark(out, P, d) {
  out[0] = 0.04;
  out[1] = 0.355;
  out[2] = 0.45;
  out[3] = -d * 2.05;                           // down the line
  out[4] = -(0.22 + P * 0.12);                  // arms out: the cut ARRIVES
  out[5] = mirrorSide(-0.095, d);
  return out;
}
function slashThrough(out, P, d) {
  out[0] = 0.14 + P * 0.02;
  out[1] = 0.123 - P * 0.135;
  out[2] = 0.45;
  out[3] = -d * (2.30 + P * 0.08);              // a shade further round, into the corner
  out[4] = -(0.10 + P * 0.02);
  out[5] = mirrorSide(-(0.712 + P * 0.295), d); // the hands at the far hip
  return out;
}
// the top of an ordinary left-click swing
function haulPose(out, P) {
  out[5] = 0;
  if (digOverhead) {
    /* BOTH HANDS STRAIGHT UP, and BACK. The tool goes past vertical over the
     * head — you can feel your own arms in it — and the hands come in toward
     * the centre line and draw back toward the chest, so the whole body is
     * loaded behind it. It hangs there. Then it comes down. */
    out[0] = -(2.38 + P * 0.32); out[1] = 0.48 + P * 0.16;
    out[2] = 0.30; out[3] = 0.0; out[4] = 0.24 + P * 0.06;
    return out;
  }
  if (slashing()) return slashCock(out, P, slashDir);
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
  out[5] = 0;
  if (digOverhead) {
    /* Straight down the middle and driven forward — no yaw across the body,
     * because the whole read of an overhead is that it does not swing, it
     * FALLS. Further through than a side swing, and further out. Wound all
     * the way up it goes through nearly a third of a turn more and lands a
     * hand further out: the heaviest thing in the game should look it. */
    out[0] = 2.92 + P * 0.72; out[1] = -(0.64 + P * 0.14);
    out[2] = 0.36; out[3] = -0.04; out[4] = -(0.42 + P * 0.50);
    return out;
  }
  if (slashing()) return slashMark(out, P, slashDir);
  /* `lift` used to take the hand to -0.69 at full charge, which is below the
   * bottom of the frame — the blade left the screen on the frame it landed,
   * so the one pose that most needs to read was the one you could not see.
   * The chop is carried by `pitch` instead, which is what was doing the work
   * anyway; the hand now stops just inside the edge. */
  out[0] = 1.72 + P * 0.80; out[1] = -(0.30 + P * 0.06);
  out[2] = 0.16 + P * 0.14; out[3] = 0.14 + P * 0.10; out[4] = -(0.12 + P * 0.26);
  return out;
}
// where a cut's follow-through ends, before the recovery brings it back
function throughPose(out, P) { return slashThrough(out, P, slashDir); }

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
  for (const u of mutants) {
    if (!u.st.alive) continue;
    _hitC.copy(u.g.position); _hitC.y += u.kind.h * 0.5;       // chest, not feet
    const t = THREE.MathUtils.clamp(_hitC.clone().sub(_aimO).dot(_aimD), 0, digRay.far);
    if (_hitC.distanceTo(_aimO.clone().addScaledVector(_aimD, t)) < 0.85 + P * 0.25) d = Math.min(d, t);
  }
  near(nearestSolidHit());
  near(digRay.intersectObject(sand, false)[0]);
  landDist = isFinite(d) ? d : -1;
}
/* The landing point this frame: the locked direction from where you stand
 * now. THE SWING GOES WHERE YOU LOOK. With nothing in reach it used to land
 * at your feet — "the scuff in front of you" — and that dragged the blade to
 * the bottom of the frame on every swing made looking up, so a cut at the
 * sky went into the sand: the owner looked straight up and still dug. With
 * nothing in reach the point is on the aim line itself, an arm's length out,
 * and the blade passes through the crosshair whatever the pitch. */
const SWING_AIR = 2.2;                    // how far out the blade passes when there is nothing to meet
function landPoint() {
  camera.getWorldPosition(_landP);
  return _landP.addScaledVector(_aimD, landDist >= 0 ? landDist : SWING_AIR + digPower * 0.6);
}
function startDig(power = 0, fromPose = null) {
  if (digT > 0 || !equipped || !equipped.onDig || frozen()) return;
  camera.getWorldDirection(_aimD);            // the angle; aimRay() takes the position
  digPower = THREE.MathUtils.clamp(power, 0, 1);
  // a charged release keeps whatever it was wound as; a plain click never is
  digOverhead = !!fromPose && windOverhead;
  /* RIGHT TO LEFT, always — unless you are already swinging, in which case
   * the second one comes back the other way. A lone cut should look the same
   * every time you make it; a combination should look like a combination. */
  if (slashing()) {
    if (!fromPose) slashDir = pickSlashDir();   // a wind-up chose its side when it began
    lastSlashAt = performance.now();
  }
  aimLand(digPower);
  digImpacted = false;
  digCharged = !!fromPose;
  if (fromPose) {
    for (let i = 0; i < 6; i++) _poseA[i] = fromPose[i];
    digT = windupEnd();                 // already wound: straight into the strike
  } else {
    haulPose(_poseA, digPower);
    digT = 0.0001;
  }
  impactPose(_poseB, digPower);
  if (slashing()) throughPose(_poseC, digPower);
  // a cut's whoosh goes with the blade, not with the click: a light cut cocks first
  sfxDig(digPower, slashing(), fromPose ? 0 : windupEnd() * swingSecs(digPower));
}
function startWind() {
  if (blocking) return;                  // no swing comes out of a guard
  if (digT > 0 || winding || !equipped || !equipped.onDig || frozen()) return;
  winding = true; windT = 0; windFull = false; windOverhead = false;
  if (slashing()) slashDir = pickSlashDir();   // which shoulder it cocks over is decided now, not at the release
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
      // the military shovel's light hit is steel on shell: one of two, at random
      if (equipped === militaryItem && !heavy) playSample('milLight', 1.0, 0.05);
      hurtCrab(best, heavy ? CRAB_HP : 1, P);
      return;
    }
  }
  /* And the same test for the thing past the pavilion, on a body-sized radius
   * up at its chest. A light swing takes one of its five and a charge takes
   * two — the difference between four exchanges and three, which is the whole
   * reason to wind one up in front of something that big. */
  {
    let best = null, bestT = Infinity;
    for (const u of mutants) {
      if (!u.st.alive || u.st.struck) continue;
      _hitC.copy(u.g.position); _hitC.y += u.kind.h * 0.5;
      const t = THREE.MathUtils.clamp(_hitC.clone().sub(_aimO).dot(_aimD), 0, digRay.far);
      const miss = _hitC.distanceTo(_aimO.clone().addScaledVector(_aimD, t));
      if (miss < 0.85 + P * 0.25 && t < bestT) { bestT = t; best = u; }
    }
    if (best) {
      const heavy = P >= MUT_HEAVY;
      hitConnect(P, heavy ? 1.35 : 0.9);
      if (heavy && digOverhead) playSample('smash', 1.0, 0.05);
      if (equipped === militaryItem && !heavy) playSample('milLight', 1.0, 0.05);
      hurtMutant(best, heavy ? 2 : 1, P);
      return;
    }
  }
  // and the dead: the nearest joint of a body on the aim line takes it
  {
    let best = null, bq = null, bestT = Infinity;
    for (const u of mutants) {
      if (u.st.alive || !u.rag) continue;
      for (const q of u.rag.parts) {
        const t = THREE.MathUtils.clamp(_hitC.copy(q.p).sub(_aimO).dot(_aimD), 0, digRay.far);
        const miss = q.p.distanceTo(_hitC.copy(_aimO).addScaledVector(_aimD, t));
        if (miss < 0.42 + P * 0.15 && t < bestT) { bestT = t; best = u; bq = q; }
      }
    }
    if (best) { ragHit(best, bq, P, _pf.x, _pf.z); return; }
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
    /* NOTHING THERE. The blade goes through the air where you aimed it and
     * that is all: no crater, no sand. It used to scuff the beach at your
     * feet instead — a swing made at the sky dug a hole you were not looking
     * at, which is the opposite of aiming. A whiff is its own information. */
    vmImpulse(-0.35 - P * 0.25);
    addTrauma(0.04 + P * 0.10);
    return;
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
  if (equipped === militaryItem && P >= 0.5) playSample('milHeavy', 1.0, 0.04);   // a heavy, on steel
  fovKick = Math.max(fovKick, (3.2 + P * 3.4) * k);
  addTrauma((0.18 + P * 0.24) * k);
  vmImpulse(-(0.9 + P * 0.6) * k);
  hitstop = Math.max(hitstop, 0.03 * k);
  sfxConnect(P, k);
}
/* WHAT A BLOW ON THE BOSS FEELS LIKE. Everything else in the game is a
 * creature you clear out of the way; he is the fight, and the difference
 * has to be in the hands. On top of the ordinary confirm: twice the frozen
 * time, the guard spring driven, sparks off the bar, the lens punched, and
 * the sub under it — the same language the overhead slam speaks, because
 * this is the other end of the same exchange. A stagger (his poise finally
 * breaking) gets the whole of it and a beat longer, so the third light
 * swing lands differently from the first two and you can feel that it did. */
/* A CUTSCENE HANDS YOU BACK A FIGHT, SO IT HANDS YOU BACK A FULL BAR. You
 * cannot block, sprint or breathe through a take, and coming out of one with
 * whatever you happened to be carrying — sometimes nothing, because the run
 * TO the trigger is what emptied it — decided the opening exchange before
 * you had your hands. */
function catchBreath() { stamina = 1; exhausted = false; }
function bossHit(P, broke, flesh) {
  hitstop = Math.max(hitstop, broke ? 0.155 : 0.085);
  addTrauma((broke ? 0.55 : 0.30) + P * 0.30);
  fovKick = Math.max(fovKick, (broke ? 9 : 5.5) + P * 4);
  guardShockV += broke ? 6.2 : 3.8;
  // steel throws sparks; a man does not. A few off the bar's edge on a
  // stagger, none at all on a cut that went into him.
  if (!flesh) spawnSparks(broke ? 16 : 9, 0.9 + P * 0.5);
  else if (broke) spawnSparks(4, 0.5);
  vmImpulse(-(1.25 + P * 0.35));
  sfxSlam(Math.min(1, P + (broke ? 0.35 : 0)));
  if (broke) { slamDip = Math.max(slamDip, 0.07); playSample('poise', 0.85); }
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
const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
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
/* A CUT HAS FOUR BEATS, NOT THREE. It cocks quicker than a chop hauls (the
 * blade only comes up and back, not over the shoulder), takes LONGER from
 * cocked to the mark — the tip crosses the whole frame and has to be seen
 * crossing it; at the chop's timing it was there in two frames and only the
 * trail said it had moved — and then keeps going: a follow-through out past
 * the mark, decelerating, before the recovery brings it back. The impact
 * still fires at DIG_STRIKE, so everything keyed to that beat is untouched. */
const SLASH_WINDUP = 0.22, SLASH_THROUGH = 0.62;
const windupEnd = () => slashing() ? SLASH_WINDUP : DIG_WINDUP;
/* How long this swing takes. A LIGHT CUT IS A CLICK: the same 0.44 s as the
 * sand shovel's — it ran a third quicker and the owner called it too fast;
 * with the blade crossing the whole frame there is more to see than in a
 * chop, and it needs the time. A HEAVY cut stays quick for a heavy (0.69 s
 * against the chop's 1.24): a katana is not a sledgehammer. */
const swingSecs = (P) => slashing() ? DIG_DUR * (0.55 + P * 0.60) / (1 + 0.34 * P) : DIG_DUR * (0.55 + P);
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
  if (digT <= 0 || !toolVM.visible) return;
  const p = digT, W = windupEnd();
  // a cut is let go of almost at once: it has a follow-through to make, and
  // a lip held on the mark through it would pin the whole arm to the centre
  const hold = slashing() ? 0.02 : LAND_HOLD, rel = slashing() ? 0.12 : LAND_RELEASE;
  if (p < W) return;
  if (p < DIG_STRIKE) landK = easeInCubic((p - W) / (DIG_STRIKE - W));
  else if (p < DIG_STRIKE + hold) landK = 1;
  else landK = 1 - easeInOutCubic(Math.min(1, (p - DIG_STRIKE - hold) / rel));
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
      _pose[5] = 0;
      _pose[0] = -(0.70 + 1.60 * e) + strain * 1.6;
      _pose[1] = 0.10 + 0.30 * e;
      _pose[2] = -0.06 + 0.50 * e;
      _pose[3] = -0.06 + 0.08 * e + strain;
      _pose[4] = 0.05 + 0.10 * e;
    } else if (slashing()) {
      /* THE CUT IS COCKED, NOT HAULED. The charge holds the blade where a
       * light cut starts from and takes it higher and further back over the
       * shoulder as it fills — the pose the strike leaves from, so the
       * release has nothing to snap through — and it trembles on the roll. */
      slashCock(_pose, e, slashDir);
      _pose[0] += strain * 0.6; _pose[3] += strain;
    } else {
      _pose[5] = 0;
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
    /* A CUT IS FASTER THAN A DIG. The whole point of the Military Shovel's
     * swing is that it is quick, hard and precise — a spade goes down into
     * sand, a blade goes through something — so the slash runs a third
     * quicker than the chop and its recovery with it. */
    digT += dt / swingSecs(P);
    const p = digT, W = windupEnd(), isCut = slashing();
    if (p < W) {
      // anticipation: quick out of rest, hanging at the top of the haul
      poseMix(_pose, REST_POSE, _poseA, easeOutCubic(p / W));
    } else if (p < DIG_STRIKE) {
      /* The strike. easeInCubic starts almost stationary and ends at full
       * speed, so the blade hangs for a beat and then falls — and because
       * _poseA is wherever the swing actually began, a charged release picks
       * up from the wound pose with nothing to snap through. */
      /* An overhead falls harder than it is swung: quartic in, not cubic, so
       * it hangs at the top for longer and covers the last half of the drop in
       * a fifth of the time. That hang-then-drop is the whole read of a slam. */
      const st = (p - W) / (DIG_STRIKE - W);
      poseMix(_pose, _poseA, _poseB, digOverhead ? st * st * st * st : easeInCubic(st));
    } else if (isCut && p < SLASH_THROUGH) {
      /* THE FOLLOW-THROUGH. A blade does not stop where it lands; it goes on
       * through and out the far side, slowing, and is brought back from
       * there. Without this beat the recovery began at the mark and pulled
       * the tool straight back the way it had come, which is a tap. */
      poseMix(_pose, _poseB, _poseC, easeOutQuad((p - DIG_STRIKE) / (SLASH_THROUGH - DIG_STRIKE)));
    } else {
      // recovery: eases back to rest, overshooting once on the way
      const from = isCut ? _poseC : _poseB, t0 = isCut ? SLASH_THROUGH : DIG_STRIKE;
      poseMix(_pose, from, REST_POSE, easeOutBack(Math.min(1, (p - t0) / (1 - t0))));
    }
    if (!digImpacted && p >= DIG_STRIKE) {
      digImpacted = true;
      digImpact();
      /* The jar in your hands. This used to be -1.7 to -3.6, which slammed
       * the spring into its own ±0.14 clamp on the very next frame — a hard
       * step, and it read as the animation stuttering on the hit rather than
       * as an impact. The spring's peak is roughly v0/sqrt(stiffness), so
       * anything under ~1.5 stays inside the clamp and stays a curve. */
      const cut = slashing();
      vmImpulse(-0.95 - P * 0.5 - (digOverhead ? 0.35 : 0) - (cut ? 0.30 : 0));
      /* AND IT JARS. A hit that stops dead has to shake the hands that made
       * it. The cut lands hardest of the three: it is the fastest thing in
       * the game and it arrives with the whole arm behind it, so it gets the
       * biggest shock through the guard spring, the most sparks, and a beat
       * of frozen time of its own — which is the difference between a swing
       * that connects and a swing that LANDS. */
      if (landDist >= 0) {
        guardShockV += (digOverhead ? 3.2 : cut ? 4.2 : 2.0) * (0.5 + P);
        spawnSparks(digOverhead ? 5 : cut ? 9 : 3, 0.4 + P * 0.6);
        if (cut) {
          hitstop = Math.max(hitstop, 0.05 + P * 0.055);
          addTrauma(0.20 + P * 0.26);
          fovKick = Math.max(fovKick, 3.4 + P * 3.6);
          hitRoll = -slashDir * (0.030 + P * 0.034);
        }
      }
      /* THE SLAM. The whole body goes into an overhead and the whole body
       * takes the stop: a longer freeze than any other swing, the biggest
       * trauma, the lens punched, the CAMERA DROPPED ten centimetres and let
       * back up (`slamDip` — you buckle), the guard spring hammered, sparks,
       * a boom with a floor under it, and a burst of sand off the point of
       * impact whether or not there was anything there to hit. */
      if (digOverhead) {
        hitstop = Math.max(hitstop, 0.075 + P * 0.065);
        addTrauma(0.40 + P * 0.42);
        fovKick = Math.max(fovKick, 6 + P * 5);
        slamDip = 0.10 + P * 0.07;
        guardShockV += 5.5 * (0.5 + P);
        spawnSparks(8, 0.6 + P * 0.6);
        sfxSlam(P);
        const lp = landPoint();
        spawnPuffs(lp.x, lp.z, 14 + Math.round(P * 12), -_pf.x, -_pf.z, Math.max(0.05, lp.y), null);
      }
    }
    if (p >= 1) { digT = 0; digPower = 0; digCharged = false; digOverhead = false; }
  } else {
    for (let i = 0; i < 6; i++) _pose[i] = 0;
  }

  // the guard goes up fast and comes down slower — you commit to raising it
  blockT = THREE.MathUtils.clamp(blockT + (blocking ? dt / 0.10 : -dt / 0.22), 0, 1);
  const blk = easeOutCubic(blockT);
  listenT = THREE.MathUtils.clamp(listenT + (listening ? dt / 0.55 : -dt / 0.45), 0, 1);
  const ear = easeOutCubic(listenT), lagK = 1 - ear * 0.85;
  const earH = Math.tan((vmCamera.fov * Math.PI) / 360) * -EAR_AT.z;
  const earX = earH * vmCamera.aspect * EAR_AT.x, earY = earH * EAR_AT.y;
  hitRoll += (0 - hitRoll) * Math.min(1, dt * 9);
  slamDip += (0 - slamDip) * Math.min(1, dt * 7);
  // a parry rings the tool: the guard spring, driven by the blow that landed
  guardShockV += (-GUARD_K * guardShock - GUARD_D * guardShockV) * dt;
  guardShock += guardShockV * dt;
  if (Math.abs(guardShock) < 1e-4 && Math.abs(guardShockV) < 1e-3) { guardShock = 0; guardShockV = 0; }
  const ring = guardShock;
  const bH = Math.tan((vmCamera.fov * Math.PI) / 360) * -BLOCK_AT.z;
  const blkX = bH * vmCamera.aspect * BLOCK_AT.x, blkY = bH * BLOCK_AT.y;
  armRig.rotation.x = ARM_ROT_X + _pose[0] + vmLagX * lagK + ear * EAR_POSE[0] + blk * BLOCK_POSE[0] + ring;
  armRig.rotation.y = -0.45 + _pose[2] + vmLagY * lagK + ear * EAR_POSE[2] + blk * BLOCK_POSE[2];
  armRig.rotation.z = 0.10 + _pose[3] + vmLagY * 0.45 * lagK + ear * EAR_POSE[3] + blk * BLOCK_POSE[3] - ring;
  armRig.rotation.y += ring * 0.55;      // and it is knocked ACROSS you, not only up
  armRig.position.set(
    ARM_BASE.x + bx + _pose[5] * vmHalfW + vmLagY * 0.16 + ear * (earX - ARM_BASE.x) + blk * (blkX - ARM_BASE.x),
    ARM_BASE.y + by + _pose[1] + vmSpringY + ear * (earY - ARM_BASE.y) + blk * (blkY - ARM_BASE.y),
    ARM_BASE.z + _pose[4] + ear * (EAR_AT.z - ARM_BASE.z) + blk * (BLOCK_AT.z - ARM_BASE.z)
  );
  if (equipped === shovelItem) {
    // the same slide, so both tools hang at the same height and the charged
    // cock swings this blade through the arc it was laid out for
    const gy = -SAND_GRIP_Y * (1 - ohBlend) * (1 - blk);
    sandModel.position.y = gy;
    trailTip.position.y = trailRoot.position.y = -0.21 + gy;
  }
  if (equipped === militaryItem) {
    /* THE PIVOT SLIDES FOR AN OVERHEAD. A cut turns about the D-grip; a slam
     * is two-handed, one hand well up the shaft, and pivots at the NECK like
     * the sand shovel's — which is the pivot its pose set was laid out on, so
     * the slam is exactly the slam it was. The model slides down the mount as
     * the hands change their hold, on the overhead's own grip blend so it is
     * one motion, and the lip markers ride with it. */
    const gy = -MIL_GRIP_Y * (1 - ohBlend);
    milModel.position.y = gy;
    trailTip.position.y = trailRoot.position.y = -0.21 + gy;
  }
  landBlade();

  /* Turn the tool over for an overhead, and back afterwards. Blended rather
   * than snapped, so the change of grip happens while the shovel is going up
   * and is finished by the time it comes down. */
  const wantOh = (winding && windOverhead) || (digT > 0 && digOverhead) ? 1 : 0;
  const wantSl = slashing() && !wantOh
    && ((winding && !windOverhead) || (digT > 0 && !digOverhead)) ? 1 : 0;
  ohBlend += (wantOh - ohBlend) * Math.min(1, dt * 9);
  slBlend += (wantSl - slBlend) * Math.min(1, dt * 11);
  if (ohBlend > 0.001 || slBlend > 0.001 || wantOh || wantSl || blk > 0.001) {
    // the two grips are exclusive; the overhead wins where they overlap. The
    // base is the TOOL'S OWN rest — the Military Shovel's is scoop-up.
    const R = restRot();
    const grip = (i) => R[i]
      + (VM_OVERHEAD_ROT[i] - R[i]) * ohBlend
      + (VM_SLASH_ROT[i] - R[i]) * slBlend * (1 - ohBlend);
    toolVM.rotation.set(grip(0), grip(1), grip(2));
    /* THE GUARD IS THE SAND SHOVEL'S. Held scoop-up, the Military Shovel's
     * block put the bar across the frame upside down and the blade on the
     * wrong side; the guard that reads is the one the sand shovel makes —
     * dig grip, shaft across the top of the view, blade high on the leading
     * side. So the tool turns back into that hold as the guard comes up (a
     * SLERP: an Euler lerp across the flip swung it through the floor on the
     * way) and pivots at the NECK for it, where the sand shovel pivots, so
     * the bar sits exactly where it sits with that tool. */
    if (blk > 0.001) {
      _blkQ.setFromEuler(_blkE.set(VM_REST_ROT[0], VM_REST_ROT[1], VM_REST_ROT[2]));
      toolVM.quaternion.slerp(_blkQ, blk);
      /* Only the SCAN needs shifting for it. The built shovel turns about
       * its own neck already, so the bar lands where it always did; the
       * Military Shovel turns about the grip and has to be slid up. */
      if (equipped === militaryItem) {
        armRig.updateMatrixWorld(true);
        toolVM.localToWorld(_blkV.set(0, milModel.position.y, 0));   // the neck
        toolMount.getWorldPosition(_blkP);                     // the grip, on the mount
        armRig.position.addScaledVector(_blkV.sub(_blkP), -blk);
      }
    }
  }

  // Only the strike and a beat past it leave a trail; a trail on the wind-up
  // would say the tool was moving fast when it is deliberately barely moving.
  trailPower = digPower;
  // a slash draws a broad arc rather than a chop's line, so it carries further
  trailGain = slashing() ? 1.55 : 1;
  updateTrail(dt, toolVM.visible && digT >= windupEnd() - 0.02 && digT < (slashing() ? SLASH_THROUGH + 0.02 : DIG_STRIKE + 0.13));
  updateSparks(dt);
  updateGlint(dt);
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
  for (let i = 0; i < 3; i++) {                                   // three, not seven: a shell is a find, not litter
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
    z -= (22 + rnd() * 46) * 2.3;                      // three shells over the stretch seven used to cover
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
  const SHELL_LEVEL = 0.40;              // subtle: a shell at the ear, not headphones
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.linearRampToValueAtTime(SHELL_LEVEL, t + 1.4);
  out.gain.setValueAtTime(SHELL_LEVEL, t + DUR - 2.4);
  out.gain.linearRampToValueAtTime(0, t + DUR);
  out.connect(sfxOut());
  /* NO STATIC. Two shells' worth of filtered white noise — resonant
   * bandpasses, then "waves" with a crash and a hiss — both came back as
   * static, however they were shaped: at the ear, any broadband hiss is a
   * radio. So there is no white noise in this at all. The sea is BROWN
   * noise under a 140 Hz lowpass — a rumble with nothing above it to hiss —
   * heaving slowly; the shell itself is a hollow tone, two soft sines a
   * fifth apart with a slow waver, the note you hear blowing across a
   * bottle; under both a sub that breathes; and twice, far off, a low call
   * that slides down and is gone. Subtle, and the whispers under it. */
  const brown = () => {
    const len = Math.floor(ctx.sampleRate * DUR), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) { v = (v + (Math.random() * 2 - 1) * 0.02) * 0.998; d[i] = v * 3.5; }
    const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true; n.start(t); n.stop(t + DUR); return n;
  };
  // the sea: a rumble, heaving in and out, nothing above 140 Hz
  {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140; lp.Q.value = 0.5;
    const g = ctx.createGain(); g.gain.value = 0.30;
    const sw = ctx.createOscillator(); sw.frequency.value = 0.12;
    const swg = ctx.createGain(); swg.gain.value = 0.16;
    sw.connect(swg).connect(g.gain); sw.start(t); sw.stop(t + DUR);
    brown().connect(lp).connect(g).connect(out);
  }
  // the shell: a hollow note, two soft sines a fifth apart, wavering
  for (const [f, g0] of [[392, 0.045], [588, 0.022]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const vib = ctx.createOscillator(); vib.frequency.value = 0.27 + Math.random() * 0.1;
    const vg = ctx.createGain(); vg.gain.value = f * 0.012;
    vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t + DUR);
    const g = ctx.createGain(); g.gain.value = g0;
    const am = ctx.createOscillator(); am.frequency.value = 0.07 + Math.random() * 0.05;
    const amg = ctx.createGain(); amg.gain.value = g0 * 0.5;
    am.connect(amg).connect(g.gain); am.start(t); am.stop(t + DUR);
    o.connect(g).connect(out); o.start(t); o.stop(t + DUR);
  }
  // a sub that breathes, eight seconds a breath
  {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 47;
    const g = ctx.createGain(); g.gain.value = 0.07;
    const br = ctx.createOscillator(); br.frequency.value = 0.125;
    const brg = ctx.createGain(); brg.gain.value = 0.05;
    br.connect(brg).connect(g.gain); br.start(t); br.stop(t + DUR);
    o.connect(g).connect(out); o.start(t); o.stop(t + DUR);
  }
  // twice, far off: a low call that slides down and is gone
  for (let i = 0; i < 2; i++) {
    const at = t + 2.5 + i * 4.5 + Math.random() * 0.8;
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(330 + Math.random() * 60, at);
    o.frequency.exponentialRampToValueAtTime(210, at + 1.7);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.03, at + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.8);
    o.connect(lp).connect(g).connect(out); o.start(at); o.stop(at + 1.9);
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
    const vg = ctx.createGain(); vg.gain.value = 1.6;       // almost words, not silence — held up as the rest came down
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
/* EVERYTHING THE MUTANTS TAUGHT, BROUGHT BACK HERE. At 2.35 a crab was a
 * metre a second slower than your walk, so every fight with one was optional:
 * you strolled away from it. It is faster than you now, it walks its own
 * wind-up in, it rejoins at a sprint if it is left behind, and the three of
 * the pack take it in TURNS — one telegraph at a time, or there is nothing
 * to read and a parry is a coin toss. */
const CRAB_SPEED = 3.75;
const CRAB_DASH = 7.4;                 // the closing burst, faster than a sprint
const CRAB_SEP = 1.9;                  // and they do not stand in one another
let crabToken = null;
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
    /* AND NO TWO OF THEM ARE THE SAME SHELL. The three that come out of the
     * water were one model at one size in one colour, which reads as three
     * copies rather than three animals. Each carries its own tint and its own
     * lift — one bleached and pale, one dark and wet, one rust — and the
     * material is CLONED to do it, because `parse` hands every copy the same
     * one and tinting it tinted all of them. */
    const mm = o.material = m.clone();
    mm.metalness = 0;
    mm.emissive = new THREE.Color(u.tint || 0x3a1a0e);
    mm.emissiveMap = mm.map;
    mm.emissiveIntensity = 0.68 * (u.lift || 1);
    if (u.tone) mm.color = new THREE.Color(u.tone);
    reexpose(mm, 0.52, [0.058, 0.078, 0.115]);   // a cold edge off the shell
    mm.needsUpdate = true;
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
    tint: opts.tint, tone: opts.tone, lift: opts.lift,
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

const gy_lerp = (a, b, t) => a + (b - a) * t;
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
    /* IT FLOATS. A piece that lands in the water rides the surface, a third
     * of its thickness under, lying flat, and moves with the swell — it used
     * to be hidden the moment the sea covered it, which for a limb thrown
     * into the surf was a limb that vanished. */
    const gbf = bunkerFloorAt(g.m.position.x, g.m.position.z, g.m.position.y);
    const sub = gbf === null ? submersionAt(g.m.position.x, g.m.position.z) : 0;
    let rest = (gbf !== null ? gbf : deck !== null ? deck + 0.02 : g.rest) + g.half;
    if (sub > 0.15) {
      const ws = waterSurfaceAt(g.m.position.x, g.m.position.z) - g.half * 0.3;
      rest = gy_lerp(rest, ws, Math.min(1, (sub - 0.15) / 0.6));
      if (g.settled || g.m.position.y <= rest + 0.02) {
        g.settled = true; g.vel.set(0, 0, 0);
        g.m.position.y = rest; g.m.rotation.x = 0; g.m.rotation.z = 0; g.m.visible = true;
        continue;
      }
      g.m.visible = true;
    } else g.m.visible = !coveredByWater(g.m.position.x, g.m.position.y, g.m.position.z);
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
  if (equipped === militaryItem) playSample('blockMil', 1.0, 0.04);   // steel meeting the claw, under the ring
  parryCool = 0;                         // landing one costs you nothing
  u.st.atk = -1;
  if (crabToken === u) crabToken = null;
  u.st.cool = CRAB_COOLDOWN;
  u.st.stun = CRAB_STUN;
  parryGlow = 0.42;
  guardShockV += 6.4; spawnSparks(11, 1.0);
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
  // what the blow lands on: plastic rings like a paint can, steel like steel
  if (equipped === militaryItem) playSample('blockMil', 1.0, 0.04);
  else if (equipped === shovelItem) playSample('blockSand', 1.0, 0.04);
  else sfxBlock();
  stamina = Math.max(0, stamina - BLOCK_COST);
  if (stamina <= 0.001) { exhausted = true; gaspOut(); }
  flashMats(toolVM);                     // the tool goes white for the frozen frames
  guardShockV += 3.6; spawnSparks(6, 0.5);
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
  if (crabToken === u) crabToken = null;
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
  // the riposte: a blow on one you have just parried counts double
  if (u.st.stun > 0) {
    dmg *= 2;
    setPrompt('<b>RIPOSTE</b>');
    setTimeout(() => { if (promptHTML.includes('RIPOSTE')) setPrompt(''); }, 700);
    addTrauma(0.3); fovKick = Math.max(fovKick, 5);
  }
  if (crabToken === u) crabToken = null;
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
  // the beach does not reach down the hatch: a crab that followed you to the
  // lid stood on the sand over the roof and bit you through the ceiling
  if (inBunker) { u.st.atk = -1; u.st.landed = false; if (u.mixer) u.mixer.update(dt); return; }
  if (frozen()) return;

  const dx = camera.position.x - u.g.position.x;
  const dz = camera.position.z - u.g.position.z;
  const dist = Math.hypot(dx, dz);
  if (!u.st.awake) {
    // stays under until it comes for you
    u.g.visible = submersionAt(u.g.position.x, u.g.position.z) < 0.92;
    if (dist > u.wake) return;
    if (settings.devMode) return;        // DEV MODE: they stay where they were put
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
    /* IT LUNGES. It closed through its startup at a stroll before, and a
     * player holding S was never there when the claw came down — too easy to
     * kill backing up, the owner said. It comes in through the whole startup
     * at better than its walk now, and through the strike itself at a dash,
     * so the snap follows you; and the bite is tested on every active frame,
     * not only the first, so a crab that arrives a frame late still lands. */
    if (t < CRAB_WIND && dist > CRAB_REACH * 0.8) {
      u.dir.set(dx / dist, 0, dz / dist);
      u.g.position.addScaledVector(u.dir, CRAB_SPEED * 1.05 * dt);
    } else if (t >= CRAB_WIND && t < CRAB_WIND + CRAB_STRIKE && dist > CRAB_REACH * 0.55) {
      u.dir.set(dx / dist, 0, dz / dist);
      u.g.position.addScaledVector(u.dir, CRAB_DASH * 0.9 * dt);
    }
    // and it feints: the claws go up and nothing comes of it
    if (u.st.feint > 0 && t >= CRAB_WIND * u.st.feint) {
      u.st.feint = 0; u.st.atk = -1;
      u.st.cool = 0.16 + Math.random() * 0.18;
      if (crabToken === u) crabToken = null;
      crabAnim(u, dt, false, 0);
      return;
    }
    if (was < CRAB_WIND && t >= CRAB_WIND) { sfxCrabSnip(); u.st.landed = false; }
    if (t >= CRAB_WIND && t < CRAB_WIND + CRAB_STRIKE && !u.st.landed) {
      /* Re-tested here, not when the wind-up began: the tell is only fair if
       * getting out of the way is a thing that works. Three outcomes now —
       * you were not guarding and it hurts; the guard was already up and it
       * does nothing; or the guard went up INTO it and the thing that swung
       * is left standing there stunned. Once per swing. */
      const d2 = Math.hypot(camera.position.x - u.g.position.x, camera.position.z - u.g.position.z);
      if (d2 < CRAB_REACH + 0.4) {
        u.st.landed = true;
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
      if (crabToken === u) crabToken = null;
      u.st.cool = CRAB_COOLDOWN * (0.55 + Math.random() * 0.6);
    }
  } else {
    u.st.cool = Math.max(0, (u.st.cool || 0) - dt);
    u.st.dash = Math.max(0, (u.st.dash || 0) - dt);
    // it holds the turn or it does not swing
    if (!closing && u.st.cool <= 0 && crabToken === u && !settings.devMode) {
      u.st.atk = 0;
      u.st.feint = (Math.random() < 0.14) ? 0.55 + Math.random() * 0.2 : 0;
      sfxCrabTell();
    } else if (closing && u.st.cool <= 0 && crabToken === u && u.st.dash <= 0
               && dist < 10 && dist > CRAB_REACH + 0.7 && Math.random() < dt * 3.0) {
      u.st.dash = 0.35 + Math.random() * 0.35;    // cross the gap you opened — and it does this often
    }
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
    flankDir(u, crabs, crabToken, CRAB_SLOT_ANG, dist, CRAB_REACH + 0.3, u.dir);   // round you, not in a file
    // it slows as it comes into range rather than sliding to a dead stop; it
    // sprints if it has been left behind, and it DASHES to close a real gap
    const rejoin = dist > 7 ? 1.35 : 1;
    const speed = (u.st.dash > 0 ? CRAB_DASH : CRAB_SPEED * rejoin)
      * THREE.MathUtils.clamp((dist - CRAB_REACH) / 1.2, 0.35, 1);
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
    /* SIDEWAYS, WHICH IS WHAT A CRAB DOES. Standing still at reach shifting
     * its weight was the one thing this animal should never do: it scuttles
     * ACROSS you instead, and it changes its mind about which way often
     * enough that you cannot lead it. The one holding the turn crowds in
     * while it circles; the others hold the range and wait. */
    u.st.sideT = (u.st.sideT || 0) - dt;
    if (u.st.sideT <= 0) {
      u.st.side = flankSide(u, crabs, crabToken, CRAB_SLOT_ANG);   // toward its slot, mostly: the circling spreads them
      u.st.sideT = 0.5 + Math.random() * 0.9;        // long enough to see it go round
    }
    const tx = -dz / dist, tz = dx / dist;           // the tangent, to its right
    const want = crabToken === u ? CRAB_REACH - 0.35 : CRAB_REACH + 0.5;
    const rad = THREE.MathUtils.clamp((dist - want) * 2.0, -1.4, 1.4);
    const sw = 3.2 + Math.random() * 0.5;            // and it goes round FAST: side to side is what a crab is
    u.g.position.x += (tx * u.st.side * sw + (dx / dist) * rad) * dt;
    u.g.position.z += (tz * u.st.side * sw + (dz / dist) * rad) * dt;
    u.st.scuttle += dt * 5.4;            // and the legs go with it
  }

  // ---- gait -------------------------------------------------------
  const reach = closing ? 1 : 0.55;
  crabAnim(u, dt, closing || u.st.side !== 0, closing ? 1 : 0.5);
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
/* Whose turn it is, handed out once a frame to whichever is in reach and has
 * gone longest without a swing — the mutants' rule, and for the same reason:
 * three claws going up at once is not three times the fight. */
function crabGiveToken(dt) {
  if (crabToken) {
    const st = crabToken.st;
    const d = Math.hypot(camera.position.x - crabToken.g.position.x, camera.position.z - crabToken.g.position.z);
    if (!st.alive || st.stun > 0 || st.recoil > 0 || (st.atk < 0 && d > CRAB_REACH + 2.5)) crabToken = null;
    else return;
  }
  let best = null, bw = -1;
  for (const u of crabs) {
    const st = u.st;
    if (!st.alive || !st.awake || st.struck || st.stun > 0 || st.recoil > 0) continue;
    st.wait = (st.wait || 0) + dt;
    const d = Math.hypot(camera.position.x - u.g.position.x, camera.position.z - u.g.position.z);
    if (d > CRAB_REACH + 2.0) continue;
    if (st.wait > bw) { bw = st.wait; best = u; }
  }
  if (best) { crabToken = best; best.st.wait = 0; }
}
function crabSeparate(u, dt) {
  for (const o of crabs) {
    if (o === u || !o.st.alive) continue;
    const dx = u.g.position.x - o.g.position.x, dz = u.g.position.z - o.g.position.z;
    const d = Math.hypot(dx, dz);
    if (d > CRAB_SEP || d < 1e-4) continue;
    const push = (CRAB_SEP - d) * dt * 3.4;
    u.g.position.x += (dx / d) * push;
    u.g.position.z += (dz / d) * push;
  }
}
function updateCrab(dt) {
  crabGiveToken(dt);
  for (const u of crabs) { updateCrabUnit(u, dt); if (u.st.alive) crabSeparate(u, dt); }
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
        if (ch.act) ch.act();                 // e.g. hand over the thing you offered
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
  dialogFov = (npc && npc.fov) || DIALOG_FOV;
  dialogHead = (npc && npc.head) || null;
  dialogTarget = (npc ? npc.sprite : bradlySprite).getWorldPosition(new THREE.Vector3());
  // his head, not the middle of him: a sprite's origin is its centre, which
  // on a seated man is his chest
  if (npc && npc.headY) dialogTarget.y += npc.headY;
  dialogLeave = (npc && npc.onLeave) || null;
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
  /* AND SOME PEOPLE DO NOT LET YOU WALK AWAY. Escape closes any
   * conversation, which is right for a man in a shed and wrong for the one
   * standing between you and the ladder: leaving his line unanswered left
   * `dealerFight` false and him rooted to his mark for the rest of the game,
   * so the boss of the game had an exit written into his own dialogue box.
   * An NPC may carry an `onLeave`, and his takes the crowbar off the shelf. */
  const leave = dialogLeave; dialogLeave = null;
  clearTimeout(dialogEndTimer); clearInterval(typeTimer); typeTimer = null; typeFull = null;
  dialogOpen = false;
  dialogCanDismiss = false;
  if (!cineHold) { dialogTarget = null; dialogHead = null; dialogFov = DIALOG_FOV; }
  dialogEl.classList.remove('show');
  dialogEl.classList.remove('typing');
  refreshUI();
  if (dialogReturnLock && !fallbackLook) requestLock();
  if (leave) leave();
}
dialogEl.addEventListener('click', () => {
  if (finishTyping()) return;
  if (dialogCanDismiss) endDialog();
});
document.getElementById('dialog-leave').addEventListener('click', (e) => { e.stopPropagation(); endDialog(); });

// Push in on whoever's talking: ease the FOV down and swing the view onto
// them, then let it back out when the conversation drops.
const DIALOG_FOV = 42;
let dialogFov = DIALOG_FOV, dialogHead = null;   // an NPC may ask for a tighter lens and a bone to hold it on
let dialogLeave = null;                          // ...and may refuse to be walked away from
let cineHold = false;                            // ...and may keep the lens after the talking stops
const _lookM = new THREE.Matrix4(), _lookQ = new THREE.Quaternion();
function updateDialogCam(dt) {
  // The peek's squeeze is the zoom — and it is also what crops the lit room
  // out of frame, so there is nothing left to look at but the bore.
  /* The three coming at you own the lens while they are coming: `mutCutFov`
   * is thrown wide for a beat and then hauled in tight, and it is driven
   * hard so the zoom is a move and not a drift. Dropping it to -1 hands the
   * field of view back and it eases home on its own, which is the frame you
   * get your head back on. */
  const wantFov = (mutCutFov > 0 ? mutCutFov
    : peeking && !peekLeaving ? PEEK_FOV
    : (dialogOpen || cineHold) ? Math.min(settings.fov, dialogFov) : settings.fov) + fovKick;
  const rate = mutCutFov > 0 ? 14 : peeking ? 2.6 : 3.5;
  if (Math.abs(camera.fov - wantFov) > 0.01) {
    camera.fov += (wantFov - camera.fov) * Math.min(1, dt * rate);
    camera.updateProjectionMatrix();
  }
  if ((dialogOpen || cineHold) && dialogTarget) {
    // a bone, if one was named: a man's head moves while he talks and the
    // lens should stay on it, not on the spot he was standing when he began
    if (dialogHead) dialogHead.getWorldPosition(dialogTarget);
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
  windDuck = ctx.createGain(); windDuck.gain.value = 1;
  noise.connect(wind).connect(windGain).connect(windDuck).connect(masterGain);
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
  blockSand: ['assets/block-sand.m4a'],    // a blow stopped on the plastic shovel: a paint can, not steel
  milHeavy: ['assets/military-heavy.m4a'], // the military shovel's heavy landing on something solid
  blockMil: ['assets/block-military.m4a'], // a blow stopped on the military shovel: solid steel
  milLight: ['assets/military-light1.m4a', 'assets/military-light2.m4a'],   // its light swing landing on a crab, one or the other
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
/* Dragging her wheel, and the detent it drops into. Both of these were
 * being CALLED and never defined — dragWheel() and release() would have
 * thrown the moment you actually turned her. It never showed up because
 * every test I ran grabbed and let go without moving it. */
function sfxWheelCreak() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.26);
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const env = Math.pow(1 - i / len, 1.6);
    lp = lp * 0.90 + (Math.random() * 2 - 1) * 0.10;
    // dry timber on a dry shaft: a rasp, not a hiss
    d[i] = lp * env * (0.5 + 0.5 * Math.sin(i * 0.11)) * 0.42;
  }
  const src = ctx.createBufferSource(); src.buffer = b;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.setValueAtTime(240 + Math.random() * 160, t);
  bp.Q.value = 3.0;
  const g = ctx.createGain(); g.gain.value = 0.34;
  src.connect(bp).connect(g).connect(sfxOut());
  src.start(t); src.stop(t + 0.27);
}
function sfxWheelDetent() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const o1 = ctx.createOscillator(); o1.type = 'square';
  o1.frequency.setValueAtTime(180, t);
  o1.frequency.exponentialRampToValueAtTime(70, t + 0.09);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.30, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  o1.connect(lp).connect(g).connect(sfxOut());
  o1.start(t); o1.stop(t + 0.18);
}

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
function sfxDig(power = 0, cut = false, delay = 0) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime + delay;
  // a heavier swing is a longer, lower whoosh — more air moved, more slowly.
  // A CUT is a blade through air, not a spade: shorter and higher, and
  // delayed to the strike — on the click it played over the cock-back and
  // the sound was sixty milliseconds ahead of the picture.
  const len = cut ? 0.20 + power * 0.10 : 0.34 + power * 0.16;
  const s = noiseBurst(len, (x) => Math.sin(Math.PI * Math.min(1, x * 1.2)) * (1 - x * 0.3));
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = (cut ? 1.5 : 0.9) + power * 0.5;
  const lo = cut ? 900 - power * 200 : 400 - power * 130;
  const hi = cut ? 3200 - power * 700 : 1600 - power * 420;
  const end = cut ? 1300 - power * 300 : 600 - power * 200;
  f.frequency.setValueAtTime(lo, t);
  f.frequency.exponentialRampToValueAtTime(hi, t + len * 0.65);
  f.frequency.exponentialRampToValueAtTime(end, t + len);
  const g = ctx.createGain(); g.gain.value = (cut ? 0.028 : 0.022) + power * 0.030;
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
  if (waveBusGain) waveBusGain.gain.setTargetAtTime(settings.waveVolume * (1 - 0.8 * drainMix) * (1 - 0.92 * bunkerMix), ctx.currentTime, 0.6);
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

/* ---- punch her out of the sea ---------------------------------------
 * Sampled off the SAME hull functions the geometry uses, at the height
 * the water actually meets her, so the hole in the ocean is her waterline
 * and not a guessed box. A little margin so the surf does not z-fight
 * against her planking. */
{
  const hw = oceanUniforms.uShipHW.value;
  const n = hw.length;
  for (let i = 0; i < n; i++) {
    const lx = -SN.HALF + (i / (n - 1)) * SN.LEN;
    // widest she is anywhere the swash can reach, not just at y = 0
    let m = 0;
    for (let y = -0.4; y <= 1.0; y += 0.2) m = Math.max(m, SN.halfAtY(lx, y));
    hw[i] = m + 0.22;
  }
  oceanUniforms.uShipC.value.set(SHIP_X, SHIP_Z);
  oceanUniforms.uShipHalf.value = SN.HALF;
}

// onShip / inBridge are declared with the collision block below.

function sfxStarSet() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 2; i++) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(680 + i * 340, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + i * 0.05);
    g.gain.exponentialRampToValueAtTime(0.16, t + i * 0.05 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.05 + 0.7);
    o.connect(g).connect(sfxOut());
    o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.75);
  }
}
function sfxLockerOpen() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 1.1);
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    lp = lp * 0.92 + (Math.random() * 2 - 1) * 0.08;
    d[i] = lp * Math.pow(1 - i / len, 1.4) * (0.6 + 0.4 * Math.sin(i * 0.004));
  }
  const src = ctx.createBufferSource(); src.buffer = b;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.setValueAtTime(240, t);
  bp.frequency.exponentialRampToValueAtTime(620, t + 1.0);
  bp.Q.value = 3.4;
  const g = ctx.createGain(); g.gain.value = 0.55;
  src.connect(bp).connect(g).connect(sfxOut());
  src.start(t); src.stop(t + 1.15);
}

// ---- the one she never landed, in the bottom of her hold ----------------
// The same model and the same item as the one on the beach, so it picks up
// and uses exactly the same way.
{
  const holdCrab = makeHorseshoeCrab();
  const holdCrabWorld = new THREE.Group();
  holdCrabWorld.add(holdCrab);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.30, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy';
  holdCrabWorld.add(hit);
  const [cx, cy, cz] = SN.crabSpot || [SN.HOLD_X0 + 2.6, SN.HOLD_Y + 0.03, -1.3];
  holdCrabWorld.position.set(SHIP_X + cx, cy, SHIP_Z + cz);
  holdCrabWorld.rotation.set(0.04, 2.1, 0.03);
  scene.add(holdCrabWorld);
  addItemShine(holdCrabWorld, { size: 0.8, height: 0.14 });
  let taken = false;
  addInteractable(holdCrabWorld, 'Take the horseshoe crab', 'inventory', {
    onActivate: () => {
      if (taken) return;
      taken = true;
      sfxThud(0.04);
      scene.remove(holdCrabWorld);
      hovered = null;
      if (!inventory.includes(crabItem)) addToInventory(crabItem);
    },
  });
}

// Heights the helm and the hold sit at. Declared HERE because main.js is one
// long top-to-bottom module: the stars below read SHIP_Y_DECK, and a const
// declared after them is in the temporal dead zone when they run.
const SHIP_Y_DECK = SN.DECK_Y;          // she has a flat deck now
const SHIP_Y_FLOOR = SN.HOLD_Y + 0.16;

// ---- the blinking star, and the wheel that answers to it ----------------
/* ONE star, not three, and it is IN THE SKY — a real point of light out over
 * the water that blinks, visible from the beach long before you board her,
 * so the wheelhouse is not where you first learn there is something to look
 * at. The old version was three lamps that only existed while you held the
 * wheel and a sequence to match in order, which is a lock; this is a
 * bearing. Turn her toward the star and hold her there, and the hook lets
 * go. It sits off her PORT bow, framed in the front glass from the helm,
 * a few degrees over the horizon so it lands inside the window band. */
const helmStar = { g: null, core: null, halo: null, lit: 0, solved: false };
{
  const wx = SHIP_X + SN.BR_X0 + 1.30;         // the wheel
  const eye = SHIP_Y_DECK + SN.BR_STEP + 1.72; // your eye at the helm, measured
  const D = 190;                                // out over the sea
  const g = new THREE.Group();
  // seaward is -X; +Z is her port side, which is screen-left from the helm
  g.position.set(wx - D, eye + 21, SHIP_Z + 30);
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.15, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xbfd0f4, fog: false, transparent: true, opacity: 0.9 }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(3.6, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x9fb2d8, fog: false, transparent: true, opacity: 0.12, depthWrite: false }));
  g.add(core, halo);
  scene.add(g);
  helmStar.g = g; helmStar.core = core; helmStar.halo = halo;
}
const HELM_STAR_DETENT = 0;        // hard to port: the side it is on

const starPuzzle = {
  held: -1, holdT: 0, active: false,
  begin() { if (helmStar.solved) return; this.active = true; },
  letGo() { this.active = false; this.held = -1; this.holdT = 0; },
  holding(idx) { if (this.held !== idx) { this.held = idx; this.holdT = 0; } },
  update(dt) {
    const st = helmStar;
    if (!st.g) return;
    /* THE BLINK. Not a sine — a star that swells and fades is a lamp on a
     * dimmer. It is ON, and then for a beat it is not, on an irregular
     * count, the way a light a long way off is when something is between
     * you and it. Once she is turned to it, it holds steady. */
    const now = performance.now() * 0.001;
    let want;
    if (st.solved) want = 1;
    else {
      const k = Math.floor(now / 1.35), ph = now / 1.35 - k;
      const off = 0.22 + bwHashJS(k * 7.1) * 0.18;             // how long it is dark this time
      const on = ph > off;
      const near = this.active && this.held === HELM_STAR_DETENT;   // answering the wheel
      want = on ? (near ? 1 : 0.78) : (near ? 0.55 : 0.06);
    }
    st.lit += (want - st.lit) * Math.min(1, dt * (want > st.lit ? 18 : 9));
    st.core.material.opacity = 0.10 + st.lit * 0.90;
    st.halo.material.opacity = 0.02 + st.lit * 0.20;
    st.g.scale.setScalar(0.8 + st.lit * 0.5);
    if (!this.active || st.solved) return;
    // you have to hold her there, so brushing past the detent does not count
    if (this.held === HELM_STAR_DETENT) {
      this.holdT += dt;
      if (this.holdT > 0.8) {
        st.solved = true;
        shipWheel.solved = true;
        shipWheel.relabel();
        sfxStarSet();
        dropShipHead();
        setPrompt('');
      }
    } else this.holdT = 0;
  },
};

// ---- the captain, on the hook over the hold -----------------------------
// He hangs off the gaff out over the open middle, out of reach and lit the
// way every other takeable thing is, so you can see him from the deck and —
// squarely — through the wheelhouse windows. Working the wheel drops him.
let headFall = -1;                 // -1 hanging, else seconds since he let go
const shipHead = shipwreck.userData.head;
/* HE IS A SCAN NOW. alexrmartinez's "Severed head" (assets/head.glb, cut to
 * 20k triangles in Blender — see tools/head_pack.py for why not gltfpack)
 * replaces the built one: the group the model made is kept as the thing
 * the hook, the examine screen and the inventory all hold, emptied, and
 * the scan lands in it over the network. It is measured and scaled to a
 * head (a third of a metre, stump and all), hung face toward the helm so
 * you see it squarely through the front glass, and lifted the way every
 * scan on this beach is. The key is a second copy of Sousinho's key scan,
 * set between the teeth with the bow out, and it is its own group from the
 * start so the item that names it exists before either model has loaded. */
const HEAD_H = 0.33;
const boatKey = new THREE.Group();
if (shipHead) {
  while (shipHead.children.length) shipHead.remove(shipHead.children[0]);
  shipHead.userData.key = boatKey;
  const g = shipwreck.userData.gaff;
  if (g) {
    g.userData.hook.add(shipHead);
    shipHead.position.set(0, -0.30, 0);
    shipHead.rotation.set(0.10, Math.PI / 2 + 0.25, 0.08);   // the scan faces +Z; the helm is +X
    shipHead.visible = true;
  }
  new GLTFLoader().load('assets/head.glb', (gltf) => {
    const m = gltf.scene;
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const k = HEAD_H / Math.max(0.001, size.y);
    m.scale.setScalar(k);
    m.position.set(-ctr.x * k, -ctr.y * k, -ctr.z * k);
    m.traverse((o) => {
      if (!o.isMesh) return;
      const mat = o.material; if (!mat) return;
      mat.metalness = 0;
      mat.emissive = new THREE.Color(0xffffff); mat.emissiveMap = mat.map; mat.emissiveIntensity = 0.22;
      reexpose(mat, 0.70, [0.05, 0.06, 0.09]);
      mat.needsUpdate = true;
    });
    shipHead.add(m);
    /* The mouth, in metres in the head's own frame, MEASURED off the scan
     * once it was scaled: the centreline profile puts the nose tip at
     * y = -0.01, z = 0.123 and the chin at -0.105, and the lips sit between
     * them at -0.078, 0.10. The key's length is its local X (see the
     * loader below), turned to run out through the teeth along +Z, its
     * centre a hair outside the lips so most of it shows. */
    boatKey.position.set(0, -0.078, 0.112);
    boatKey.rotation.set(0.1, Math.PI / 2, 0);        // bow OUT, bit between the teeth
    shipHead.add(boatKey);
    addItemShine(shipHead, { size: 0.34, height: 0.0, strength: 0.35, lift: 0.3 });
  }, undefined, () => {});
  new GLTFLoader().load('assets/key.glb', (gltf) => {
    gltf.scene.updateMatrixWorld(true);
    let geo = null, mat = null;
    gltf.scene.traverse((o) => { if (o.isMesh && !geo) { geo = o.geometry.clone().applyMatrix4(o.matrixWorld); mat = o.material.clone(); } });
    if (!geo) return;
    geo.computeBoundingBox();
    const bb = geo.boundingBox, size = bb.getSize(new THREE.Vector3()), mid = bb.getCenter(new THREE.Vector3());
    geo.translate(-mid.x, -mid.y, -mid.z); geo.computeBoundingSphere();
    mat.emissive.setHex(0x4a3a2a); mat.emissiveMap = mat.map;
    mat.metalness = Math.min(mat.metalness, 0.25);
    reexpose(mat, 0.62);
    const km = new THREE.Mesh(geo, mat);
    km.scale.setScalar(0.15 / Math.max(size.x, size.y, size.z));   // 15 cm long, along its X
    boatKey.add(km);
  }, undefined, () => {});
}
function makeHeadIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#6e6152';
  g.beginPath(); g.ellipse(24, 22, 12, 14, 0.08, 0, Math.PI * 2); g.fill();   // skull
  g.beginPath(); g.ellipse(25, 33, 8, 6, 0, 0, Math.PI * 2); g.fill();        // jaw
  g.fillStyle = '#2a221a';
  for (let i = 0; i < 9; i++)                                                 // hair
    g.fillRect(14 + i * 2.2, 6 + Math.sin(i) * 2, 2, 6);
  g.fillStyle = '#181410';
  g.beginPath(); g.ellipse(19, 20, 3.2, 3.8, 0, 0, Math.PI * 2); g.fill();    // sockets
  g.beginPath(); g.ellipse(29, 20, 3.2, 3.8, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#4a1c18';
  g.beginPath(); g.ellipse(25, 41, 8, 3.4, 0, 0, Math.PI * 2); g.fill();      // the cut
  g.fillStyle = '#d8cfc0';
  for (let i = 0; i < 5; i++) g.fillRect(20 + i * 2.2, 34, 1.6, 3);           // teeth
  return c.toDataURL();
}
/* ---- the key he was keeping in his mouth -----------------------------
 * You get him off the hook by working the wheel, and the key by turning
 * him over and looking. It opens the shell door low in her -Z side, which
 * is the only way through to the far beach. */
function makeBoatKeyIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 50;
  const g = c.getContext('2d');
  g.strokeStyle = '#d9ab46'; g.lineWidth = 4;
  g.beginPath(); g.arc(17, 16, 7, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(21, 21); g.lineTo(37, 39); g.stroke();
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(31, 33); g.lineTo(25, 38); g.stroke();
  g.beginPath(); g.moveTo(36, 38); g.lineTo(30, 43); g.stroke();
  return c.toDataURL();
}
const boatKeyItem = {
  id: 'boatkey', name: "Wheelhouse key", icon: makeBoatKeyIcon(),
  use: () => openInspect(boatKey, { name: 'Wheelhouse key' }),
};
holdable(boatKeyItem, boatKey, { scale: 3.0, pos: [0, -0.04, 0.02], rot: [0.3, 0.6, 0.2] });
let boatKeyTaken = false;

const headItem = {
  id: 'captain', name: "Captain's head", icon: makeHeadIcon(),
  /* Examining him is where you find it. equipLabel only appears while the
   * key is still in there, so once it is out he is just a head again. */
  use: () => openInspect(shipHead, {
    equipLabel: boatKeyTaken ? null : 'Pull the key out of his mouth',
    onEquip: () => {
      if (boatKeyTaken) return;
      boatKeyTaken = true;
      shipHead.remove(boatKey);
      boatKey.position.set(0, 0, 0); boatKey.rotation.set(0, 0, 0);   // out of the mouth, and its own thing
      sfxThud(0.03);
      addToInventory(boatKeyItem);
      setPrompt('');
      closeInspect();
    },
  }),
};
holdable(headItem, shipHead, { scale: 0.8, pos: [0, -0.12, 0.04], rot: [0.2, 2.4, 0.1] });

/* ---- her deck lantern, off the wheelhouse step ------------------------
 * One of her fittings you can actually take, so the gear on deck is not
 * all scenery. It examines like the crab and the jar do. */
function makeLanternIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 50;
  const g = c.getContext('2d');
  g.fillStyle = '#5a4a34'; g.fillRect(19, 8, 12, 6);
  g.fillStyle = '#8a9aa8'; g.fillRect(17, 14, 16, 22);
  g.fillStyle = '#2c3a44'; g.fillRect(20, 17, 10, 16);
  g.fillStyle = '#c8a24a'; g.fillRect(23, 24, 4, 7);
  g.fillStyle = '#5a4a34'; g.fillRect(16, 36, 18, 6);
  g.strokeStyle = '#6a5a44'; g.lineWidth = 2;
  g.beginPath(); g.arc(25, 8, 5, Math.PI, 0); g.stroke();
  return c.toDataURL();
}
const shipLantern = shipwreck.userData.lantern;
if (shipLantern) {
  const lanternItem = {
    id: 'lantern', name: 'Deck lantern', icon: makeLanternIcon(),
    use: () => openInspect(shipLantern),
  };
  holdable(lanternItem, shipLantern, { scale: 1.0, pos: [0.02, -0.12, 0.03], rot: [0.2, 0.5, 0.1] });
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy'; shipLantern.add(hit);
  addItemShine(shipLantern, { size: 0.34, height: 0.02, strength: 0.4 });
  let lanternTaken = false;
  addInteractable(shipLantern, 'Take the lantern', 'inventory', {
    onActivate: () => {
      if (lanternTaken) return;
      lanternTaken = true;
      sfxThud(0.04);
      shipwreck.remove(shipLantern);
      hovered = null;
      addToInventory(lanternItem);
    },
  });
}

/* ---- the shell door low in her -Z side -------------------------------
 * The way off her. It is locked until you have what was in his mouth, so
 * the wheel, the head and the key are one chain and the boat has an end.
 * The side ladder stays where it is as gear — it is not the route. */
const holdDoor = shipwreck.userData.holdDoor;
let holdDoorOpen = false, holdDoorSwing = 0;
if (holdDoor) {
  const hit = new THREE.Mesh(new THREE.BoxGeometry(SN.DOOR_W, SN.DOOR_H, 0.5),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy'; hit.position.set(-SN.DOOR_W / 2, 0, -0.1);
  holdDoor.add(hit);
  const relabel = () => {
    if (holdDoorOpen) return;
    const has = inventory.includes(boatKeyItem);
    holdDoor.userData.label = has ? 'Unlock the door' : 'The door is locked.';
    holdDoor.userData.bare = !has;
  };
  relabel();
  addInteractable(holdDoor, 'The door is locked.', 'default', {
    label: () => { relabel(); return holdDoor.userData.label; },
    bare: () => { relabel(); return holdDoor.userData.bare; },
    onActivate: () => {
      if (holdDoorOpen) return;
      if (!inventory.includes(boatKeyItem)) { sfxThud(0.02); return; }
      holdDoorOpen = true;
      sfxLockerOpen();
      // it has done its one job: it goes into the lock and stays there
      const ki = inventory.indexOf(boatKeyItem);
      if (ki >= 0) {
        inventory.splice(ki, 1);
        if (equipped === boatKeyItem) toggleEquip(boatKeyItem);
        renderHotbar();
      }
      setPrompt('');
      hovered = null;
    },
  });
}
function updateHoldDoor(dt) {
  if (!holdDoor) return;
  const want = holdDoorOpen ? 1 : 0;
  if (Math.abs(holdDoorSwing - want) < 0.001) return;
  holdDoorSwing += (want - holdDoorSwing) * Math.min(1, dt * 3.2);
  holdDoor.rotation.y = -holdDoorSwing * 2.0;
}

function dropShipHead() {
  if (headFall >= 0 || !shipHead) return;
  headFall = 0;
  // hand him to the world so he falls clear of the swinging hook
  const wp = shipHead.getWorldPosition(new THREE.Vector3());
  shipwreck.userData.gaff.userData.hook.remove(shipHead);
  scene.add(shipHead);
  shipHead.position.copy(wp);
  sfxLockerOpen();
}
/* Her loose gear. Lifting, throwing and dropping all come free from
 * PhysProp; the point is that not everything aboard is welded down. */
for (const L of (shipwreck.userData.loose || [])) {
  L.m.position.set(SHIP_X + L.m.position.x, L.m.position.y, SHIP_Z + L.m.position.z);
  makeProp(L.m, L.name, { radius: L.r, restH: L.r * 0.55, bounce: 0.3, friction: 0.62 });
}

const _headV = new THREE.Vector3();
function updateShipHead(dt) {
  if (headFall < 0 || !shipHead) return;
  headFall += dt;
  if (headFall > 4) return;
  // he falls into the hold and settles on the sand down there
  /* Once he is down he is yours to take. He is only made takeable here —
   * hanging on the hook out of reach he is a thing you can see and not a
   * thing you can have, which is the whole point of the puzzle. */
  if (headFall > 0 && !shipHead.userData.takeable) {
    shipHead.userData.takeable = true;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.name = 'hitProxy'; shipHead.add(hit);
    addInteractable(shipHead, "Take the captain's head", 'inventory', {
      onActivate: () => {
        if (shipHead.userData.taken) return;
        shipHead.userData.taken = true;
        sfxThud(0.05);
        scene.remove(shipHead);
        hovered = null;
        addToInventory(headItem);
      },
    });
  }
  const floorY = SHIP_Y_FLOOR;
  if (shipHead.position.y > floorY) {
    _headV.set(0, -Math.min(6, headFall * 9.8), 0);
    shipHead.position.addScaledVector(_headV, dt);
    shipHead.rotation.x += dt * 2.4;
    shipHead.rotation.z += dt * 1.1;
    if (shipHead.position.y <= floorY) {
      shipHead.position.y = floorY;
      shipHead.rotation.set(0.1, shipHead.rotation.y, 0.05);
      sfxThud(0.06);
      /* No second interactable here. He is already takeable from the
       * moment he comes off the hook, and adding a bare 'The captain.'
       * label on landing shadowed that — you watched him drop and then
       * could only look at him. */
    }
  }
}

// ---- the ship's wheel, and the thing it is for -------------------------
// You take hold of it and drag, Amnesia-style, rather than pressing a button:
// grabbing puts you in position behind it looking out to sea, the mouse turns
// the wheel instead of your head, and letting go settles it into a detent.
//
// One star over the water blinks. Turn her toward it and hold her there and
// the captain comes off his hook.
const shipWheel = {
  positions: ['hard to port', 'midships', 'hard to starboard'],
  index: 1,                                   // 0 | 1 | 2, starts midships
  get position() { return this.index - 1; },  // -1 | 0 | 1
  get label() { return this.positions[this.index]; },
  solved: false,
};
let wheelGrab = false, wheelFree = 0, dragWheel = () => {};
let helmT = 0;                                 // 0 = free, 1 = fully at the helm
const _helmPos = new THREE.Vector3(), _helmQ = new THREE.Quaternion();
const _preHelmPos = new THREE.Vector3(), _preHelmQ = new THREE.Quaternion();
let _preHelmBaseY = 0;
{
  const w = shipwreck.userData.wheel;
  const WHEEL_STEP = Math.PI * 0.62;
  let wheelTarget = 0, wheelSpin = 0, wheelCreak = 0;
  const setWheel = (i) => {
    shipWheel.index = THREE.MathUtils.clamp(i, 0, 2);
    wheelTarget = (shipWheel.index - 1) * WHEEL_STEP;
  };
  shipWheel.set = setWheel;

  // where you stand to steer: just abaft the wheel, looking out over the sea
  const helmStance = () => {
    const wp = w.getWorldPosition(new THREE.Vector3());
    _helmPos.set(wp.x + 0.95, wp.y + 0.42, wp.z);
    const look = new THREE.Vector3(wp.x - 40, wp.y + 4.0, wp.z);  // seaward, and up a little
    const m = new THREE.Matrix4().lookAt(_helmPos, look, camera.up);
    _helmQ.setFromRotationMatrix(m);
  };

  shipWheel._tick = (dt) => {
    wheelSpin += (wheelTarget - wheelSpin) * Math.min(1, dt * (wheelGrab ? 22 : 7));
    w.rotation.z = wheelSpin;
    if (!wheelGrab) wheelFree = wheelSpin;
    // ease into and out of the helm stance rather than snapping there
    const want = wheelGrab ? 1 : 0;
    helmT += (want - helmT) * Math.min(1, dt * 7);
    if (helmT > 0.001) {
      camera.position.lerpVectors(_preHelmPos, _helmPos, helmT);
      camera.quaternion.slerpQuaternions(_preHelmQ, _helmQ, helmT);
      /* camBaseY as well, not just the camera: update() writes
       * camera.position.y from camBaseY every frame after this runs, so
       * setting the position alone left you standing at the helm on the
       * deck's height instead of the wheel's. vy is cleared so gravity
       * doesn't argue with it. */
      camBaseY = THREE.MathUtils.lerp(_preHelmBaseY, _helmPos.y, helmT);
      vy = 0;
    }
  };

  const relabel = () => {
    if (shipWheel._it) {
      shipWheel._it.label = shipWheel.solved
        ? 'The wheel \u2014 ' + shipWheel.label
        : 'Take the wheel \u2014 ' + shipWheel.label;
    }
  };
  shipWheel.relabel = relabel;

  /* Esc lets go of her, and so does a plain click — Esc is also how you
   * open the settings menu, so it cannot be the only way off the wheel. */
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && wheelGrab) { e.stopPropagation(); shipWheel.release(); }
  }, true);
  window.addEventListener('click', (e) => {
    if (!wheelGrab) return;
    // a drag ends in a click too; only a click that did not turn her counts
    if (Math.abs(wheelFree - wheelSpin) > 0.02) return;
    e.stopPropagation(); shipWheel.release();
  }, true);
  shipWheel.grab = () => {
    if (wheelGrab) return;
    wheelGrab = true;
    wheelFree = wheelSpin;
    _preHelmPos.copy(camera.position);
    _preHelmQ.copy(camera.quaternion);
    _preHelmBaseY = camBaseY;
    helmStance();
    setPrompt(shipWheel.solved ? 'Drag to turn her \u00b7 Esc to step away'
      : 'Drag to turn her toward the blinking star \u00b7 hold her there \u00b7 Esc to step away');
    starPuzzle.begin();
  };
  shipWheel.release = () => {
    if (!wheelGrab) return;
    wheelGrab = false;
    const before = shipWheel.index;
    setWheel(Math.round(wheelFree / WHEEL_STEP) + 1);
    relabel();
    if (shipWheel.index !== before) sfxWheelDetent();
    setPrompt('');
    starPuzzle.letGo();
  };
  dragWheel = (dx) => {
    // drag left and she goes to port: the wheel turns the way your hand does
    wheelFree = THREE.MathUtils.clamp(
      wheelFree + dx * 0.0075 * settings.sensitivity, -WHEEL_STEP * 1.2, WHEEL_STEP * 1.2);
    if (Math.abs(wheelFree - wheelCreak) > 0.16) { wheelCreak = wheelFree; sfxWheelCreak(); }
    wheelTarget = wheelFree;
    // while you hold it, the detent it is nearest is what counts
    starPuzzle.holding(Math.round(wheelFree / WHEEL_STEP) + 1);
  };

  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy';
  w.add(hit);
  addInteractable(w, 'Take the wheel \u2014 midships', 'wheel', { onActivate: () => shipWheel.grab() });
  shipWheel._it = interactables[interactables.length - 1];
}



/* Collision, built from the SAME constants the geometry is — SN is the
 * model's own nav block, so there is no second copy of the layout to
 * drift. The deck is flat, so every test below is a plain comparison; no
 * curve to agree with.
 *
 * shipFloorAt() returns the highest walkable surface at or just under
 * your feet. The hold floor and the deck sit above one another at the
 * same (x, z) and picking by height is what stops them fighting. */
const _lxc = (lx) => THREE.MathUtils.clamp(lx, -SN.HALF, SN.HALF);
/* THE DECK EDGE IS WHERE THE PLANKING IS, NOT WHERE THE STATION IS. The
 * deck's own geometry takes its x from hullPt, rake included — forward she
 * rakes the best part of two metres — but the walk was clamped on the raw
 * station: at the bow you stood behind an invisible wall a metre short of
 * planking you could see, and along the bow flanks the deck looked wider
 * than you were allowed to walk. `deckHalfAt(lx)` inverts the rake now: it
 * finds the station whose planking is at lx and answers with that station's
 * half-width. Built once, on first use (PLAYER_R and SN are both below). */
let _rakeX = null, _rakeB = null, DECK_X0 = -SN.HALF, DECK_X1 = SN.HALF;
function buildDeckEdge() {
  if (_rakeX) return;
  const n = 260; _rakeX = new Float32Array(n + 1); _rakeB = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const x = -SN.HALF + (i / n) * SN.LEN;
    // the same point deckGeo lays its edge on
    const v = THREE.MathUtils.clamp((SN.DECK_Y - SN.KEEL_Y) / ((SN.DECK_Y + SN.sheerAt(x) + SN.BULWARK) - SN.KEEL_Y), 0, 1);
    _rakeX[i] = x + SN.rakeAt(x, v);
    _rakeB[i] = SN.halfAtY(x, SN.DECK_Y) * 0.985;
  }
  DECK_X0 = _rakeX[0]; DECK_X1 = _rakeX[n];
}
function deckHalfAt(lx) {
  buildDeckEdge();
  if (lx <= _rakeX[0]) return _rakeB[0];
  const n = _rakeX.length - 1;
  if (lx >= _rakeX[n]) return _rakeB[n];
  let lo = 0, hi = n;                         // rake keeps it monotonic, so bisect
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (_rakeX[m] <= lx) lo = m; else hi = m; }
  const t = (lx - _rakeX[lo]) / Math.max(1e-6, _rakeX[hi] - _rakeX[lo]);
  return _rakeB[lo] + (_rakeB[hi] - _rakeB[lo]) * t;
}

function shipFloorAt(lx, lz, feet) {
  const tol = feet + 0.5;
  let best = null;
  const take = (y) => { if (y <= tol && (best === null || y > best)) best = y; };

  // the hold, and the mouth of the breach outside it
  if (lx > SN.HOLD_X0 && lx < SN.HOLD_X1 && Math.abs(lz) < SN.HOLD_HZ) take(SN.HOLD_Y);

  /* Out through the shell door once it is unlocked. Same shape as the
   * breach apron: a RAMP down to sand level, because a flat patch at
   * HOLD_Y out on open beach is a 25 cm invisible step. */
  if (holdDoorOpen && Math.abs(lx - SN.DOOR_X) < SN.DOOR_W / 2 && lz < 0) {
    const inner = -(SN.HOLD_HZ - 0.25);
    const outer = -(SN.halfAtY(_lxc(lx), SN.HOLD_Y) + 1.2);
    if (lz <= inner && lz > outer)
      take(SN.HOLD_Y * (lz - outer) / (inner - outer));
  }
  /* The apron outside the breach is a RAMP, not a shelf. Her plating
   * tumbles home hard down low, so a flat walkable patch out to a fixed
   * lz stood 0.25 m proud of bare sand well clear of the hull — an
   * invisible step in the open. It runs down to sand level instead. */
  if (lx > SN.BREACH_X0 && lx < SN.BREACH_X1 && lz > 0) {
    const inner = SN.HOLD_HZ - 0.25;
    const outer = Math.max(inner + 0.8, SN.halfAtY(_lxc(lx), SN.HOLD_Y) + 1.1);
    if (lz >= inner && lz < outer)
      take(SN.HOLD_Y * (outer - lz) / (outer - inner));
  }

  // the stair up out of it
  if (lx > SN.STAIR_X0 && lx < SN.STAIR_X1 && lz > SN.STAIR_Z0 && lz < SN.STAIR_Z1) {
    const t = (lx - SN.STAIR_X0) / (SN.STAIR_X1 - SN.STAIR_X0);
    take(SN.HOLD_Y + t * (SN.DECK_Y - SN.HOLD_Y));
  }

  // the deck, less the hatch and the stair well — out to the raked stem
  if (lx > DECK_X0 && lx < DECK_X1 && Math.abs(lz) < deckHalfAt(lx)) {
    const inHatch = lx > SN.HATCH_X0 && lx < SN.HATCH_X1 && Math.abs(lz) < SN.HATCH_HZ;
    const inWell = lx > SN.STAIR_X0 && lx < SN.STAIR_X1 && lz > SN.STAIR_Z0 && lz < SN.STAIR_Z1;
    if (!inHatch && !inWell) take(SN.DECK_Y);
  }

  // the wheelhouse sole, up on its casing
  if (lx > SN.BR_X0 && lx < SN.BR_X1 && Math.abs(lz) < SN.BR_HZ) take(SN.DECK_Y + SN.BR_STEP);

  /* The steps outside its door. The casing lifts the sole 0.9 m off the
   * deck, which is more than a stride, so without these the door is as
   * unreachable as it was when it sat the wrong side of the cliff. */
  if (lx > SN.BR_DOOR_C - SN.BR_DOOR_W / 2 - 0.24
      && lx < SN.BR_DOOR_C + SN.BR_DOOR_W / 2 + 0.24
      && lz >= SN.BR_HZ && lz < SN.BR_HZ + SN.BR_RUN) {
    const t = (SN.BR_HZ + SN.BR_RUN - lz) / SN.BR_RUN;   // 1 at the wall
    take(SN.DECK_Y + t * SN.BR_STEP);
  }

  /* (No side ladder any more. With the shell door as the way through she
   * has one exit, and a ladder up a side you cannot get down to was a
   * route that led nowhere.) */

  return best;
}

let onShip = false, inBridge = false;

/* Where her deck stops being wide enough to stand on. Walked once, not
 * every frame: the deck tapers to nothing at the stem and the transom and
 * the bulwark is cut away where it gets that narrow, so you could walk off
 * the end — and the moment you did, shipFloorAt returned null, onShip
 * dropped, and the beach clamp snapped you several metres sideways. That
 * snap is the teleport at each end. Stopping at the stem is a wall you can
 * see; being thrown back to WADE_X is not. */
/* Worked out on first use, not at module scope: main.js is one long
 * top-to-bottom module and PLAYER_R is declared below this point, so
 * evaluating it here is a temporal dead zone and the whole file dies. */
let SHIP_END_LO = 0, SHIP_END_HI = 0;
function shipEnds() {
  if (SHIP_END_HI) return;
  buildDeckEdge();
  SHIP_END_LO = DECK_X0; SHIP_END_HI = DECK_X1;    // in the planking's frame, rake and all
  while (SHIP_END_LO < 0 && deckHalfAt(SHIP_END_LO) < PLAYER_R + 0.12) SHIP_END_LO += 0.05;
  while (SHIP_END_HI > 0 && deckHalfAt(SHIP_END_HI) < PLAYER_R + 0.12) SHIP_END_HI -= 0.05;
}

/* Her gear is solid wherever it stands, not only on deck. Each box
 * carries the height band it occupies, so a bunk in the hold does not
 * block the deck over it and a barrel on deck does not block the hold
 * under it — which is what a flat 2D footprint did. */
function pushOutOfShipGear(lx, lz, feet) {
  for (const [x0, z0, x1, z1, lo, hi] of (SN.props || [])) {
    if (feet < lo - 0.1 || feet > hi) continue;
    const cx0 = x0 - PLAYER_R, cx1 = x1 + PLAYER_R, cz0 = z0 - PLAYER_R, cz1 = z1 + PLAYER_R;
    if (lx <= cx0 || lx >= cx1 || lz <= cz0 || lz >= cz1) continue;
    const dL = lx - cx0, dR = cx1 - lx, dB = lz - cz0, dF = cz1 - lz;
    const m = Math.min(dL, dR, dB, dF);
    if (m === dL) camera.position.x = SHIP_X + cx0;
    else if (m === dR) camera.position.x = SHIP_X + cx1;
    else if (m === dB) camera.position.z = SHIP_Z + cz0;
    else camera.position.z = SHIP_Z + cz1;
  }
}

function updateShip(dt) {
  shipEnds();
  shipWheel._tick(dt);
  starPuzzle.update(dt);
  updateShipHead(dt);

  if (onShip) camera.position.x = THREE.MathUtils.clamp(
    camera.position.x, SHIP_X + SHIP_END_LO, SHIP_X + SHIP_END_HI);

  const lx = camera.position.x - SHIP_X;
  const lz = camera.position.z - SHIP_Z;
  if (Math.abs(lx) > SN.HALF + 1.5 || Math.abs(lz) > 11) { onShip = false; inBridge = false; return; }

  const feet = camBaseY - playerEye();   // playerEye(), not EYE_HEIGHT: crouching
  const floor = shipFloorAt(lx, lz, feet); // on deck must not read as feet-low

  if (floor === null) {
    // no floor: if you are inside her hull she is solid, so slide back out
    onShip = false; inBridge = false;
    const hh = deckHalfAt(lx) + 0.3;
    if (lx > DECK_X0 - 0.3 && lx < DECK_X1 + 0.3 && Math.abs(lz) < hh && feet < SN.DECK_Y - 0.3)
      camera.position.z = SHIP_Z + (lz >= 0 ? hh : -hh);
    return;
  }

  onShip = true;
  groundY = floor;

  const inHold = floor < SN.DECK_Y - 0.5;
  pushOutOfShipGear(lx, lz, feet);

  if (inHold) {
    const hz = SN.HOLD_HZ - PLAYER_R;
    const atBreach = lx > SN.BREACH_X0 && lx < SN.BREACH_X1;
    const atDoor = holdDoorOpen
      && Math.abs(lx - SN.DOOR_X) < SN.DOOR_W / 2 - PLAYER_R * 0.4;
    if (lz > hz && !atBreach) camera.position.z = SHIP_Z + hz;
    if (lz < -hz && !atDoor) camera.position.z = SHIP_Z - hz;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x,
      SHIP_X + SN.HOLD_X0 + PLAYER_R, SHIP_X + SN.HOLD_X1 - PLAYER_R);
    inBridge = false;
    return;
  }


  /* The bulwark, unbroken. There is no gap to step off through any more:
   * with the shell door as the answer, a place you can simply walk over
   * the side is a way to skip her entirely. */
  const lim = deckHalfAt(lx) - PLAYER_R;
  if (lz > lim) camera.position.z = SHIP_Z + lim;
  else if (lz < -lim) camera.position.z = SHIP_Z - lim;

  /* The hatch has a coaming round it — a real lip you can see — so it is
   * solid, not a hole you fall down. This is the single change that makes
   * her deck walkable: before, the open hold amidships was invisible and
   * you went straight through it. */
  const cx0 = SN.HATCH_X0 - PLAYER_R, cx1 = SN.HATCH_X1 + PLAYER_R;
  const cz = SN.HATCH_HZ + PLAYER_R;
  if (feet < SN.DECK_Y + SN.COAMING - 0.15
      && lx > cx0 && lx < cx1 && Math.abs(lz) < cz) {
    // push out by the shallowest face of the coaming
    const dL = lx - cx0, dR = cx1 - lx, dB = lz + cz, dF = cz - lz;
    const m = Math.min(dL, dR, dB, dF);
    if (m === dL) camera.position.x = SHIP_X + cx0;
    else if (m === dR) camera.position.x = SHIP_X + cx1;
    else if (m === dB) camera.position.z = SHIP_Z - cz;
    else camera.position.z = SHIP_Z + cz;
  }

  /* THE LADDER WELL IS A HOLE YOU COULD WALK INTO SIDEWAYS. Its floor is
   * the ladder, which is a ramp down to the hold, so a step across its side
   * from the deck put the ladder two metres under your feet and dropped you
   * — the "falling off" on a deck with an unbroken bulwark. It has a lip
   * you can see on three sides now (the model has one), and this is that
   * lip: solid from deck height on the two long sides and the low end, open
   * only at its head, where the top tread meets the deck. Anyone already ON
   * the ladder is below deck height and walks through all of it. */
  if (feet > SN.DECK_Y - 0.3) {
    const wx0 = SN.STAIR_X0 - PLAYER_R, wx1 = SN.STAIR_X1 - 0.42;
    const wz0 = SN.STAIR_Z0 - PLAYER_R, wz1 = SN.STAIR_Z1 + PLAYER_R;
    if (lx > wx0 && lx < wx1 && lz > wz0 && lz < wz1) {
      const dL = lx - wx0, dR = wx1 - lx, dB = lz - wz0, dF = wz1 - lz;
      const m = Math.min(dL, dR, dB, dF);
      if (m === dL) camera.position.x = SHIP_X + wx0;
      else if (m === dR) camera.position.x = SHIP_X + wx1;
      else if (m === dB) camera.position.z = SHIP_Z + wz0;
      else camera.position.z = SHIP_Z + wz1;
    }
  }

  /* The wheelhouse: walls solid, the door in the +Z side is the way in.
   * The old version only pushed you out when lz > 0, so from her -Z side
   * you walked through the wall as if it were not there. */
  const atDoor = Math.abs(lx - SN.BR_DOOR_C) < SN.BR_DOOR_W / 2;
  if (!inBridge) {
    if (lx > SN.BR_X0 - PLAYER_R && lx < SN.BR_X1 + PLAYER_R
        && Math.abs(lz) < SN.BR_HZ + PLAYER_R) {
      // up at sole height inside the footprint you ARE in the wheelhouse
      if (feet > SN.DECK_Y + SN.BR_STEP - 0.35 && Math.abs(lz) < SN.BR_HZ) inBridge = true;
      else if (atDoor && lz > 0) inBridge = true;
      else {
        // out by the nearest face, so no wall is one-sided
        const dF = lx - (SN.BR_X0 - PLAYER_R), dA = (SN.BR_X1 + PLAYER_R) - lx;
        const dP = (SN.BR_HZ + PLAYER_R) - lz, dS = lz + SN.BR_HZ + PLAYER_R;
        const m = Math.min(dF, dA, dP, dS);
        if (m === dF) camera.position.x = SHIP_X + SN.BR_X0 - PLAYER_R;
        else if (m === dA) camera.position.x = SHIP_X + SN.BR_X1 + PLAYER_R;
        else if (m === dP) camera.position.z = SHIP_Z + SN.BR_HZ + PLAYER_R;
        else camera.position.z = SHIP_Z - SN.BR_HZ - PLAYER_R;
      }
    }
  } else {
    camera.position.x = THREE.MathUtils.clamp(camera.position.x,
      SHIP_X + SN.BR_X0 + PLAYER_R, SHIP_X + SN.BR_X1 - PLAYER_R);
    if (lz < -SN.BR_HZ + PLAYER_R) camera.position.z = SHIP_Z - SN.BR_HZ + PLAYER_R;
    if (lz > SN.BR_HZ - PLAYER_R) {
      if (!atDoor) camera.position.z = SHIP_Z + SN.BR_HZ - PLAYER_R;
      else if (lz > SN.BR_HZ + PLAYER_R) inBridge = false;
    }
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
/* The three, and not one of them the same as the next: a big bleached one, a
 * small dark wet one, and a rusted one between them. Size does most of the
 * work at a distance and the tint does the rest close up. */
const PACK_LOOK = [
  { scale: 1.86, tint: 0x4a3a24, tone: 0xd8cfbe, lift: 0.9 },   // bleached, and the biggest
  { scale: 1.34, tint: 0x25160c, tone: 0x8a8f92, lift: 1.15 },  // small, dark, still wet
  { scale: 1.62, tint: 0x50200c, tone: 0xc09070, lift: 1.0 },   // rust
];
const packCrabs = PACK_SPOTS.map(([, z], i) =>
  makeCrabUnit(PACK_START_X, z, Object.assign({ pack: true, wake: 0 }, PACK_LOOK[i % PACK_LOOK.length])));
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
    const body = new THREE.MeshStandardMaterial({ color: 0xdde2ec, roughness: 0.4, metalness: 0.2, emissive: 0x3c4352 });
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
      new THREE.MeshStandardMaterial({ color: 0x9fd08a, emissive: 0x63b04a, roughness: 0.8 }));
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
    cd.scale.setScalar(2.3);
    cd.position.set(CAMP_X + 0.32, 0.07, CAMP_Z - 0.18);
    cd.rotation.y = 2.4;
    makeProp(cd, 'CD player', { radius: 0.25, restH: 0.07, bounce: 0.2, friction: 0.7 });
    addItemShine(cd, { size: 1.0, height: 0.22, strength: 1.1 });
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
    const heading = Math.atan2(fwdX, fwdZ) + Math.PI;
    let side = 1, i = 0;
    // the first pair is right at the towel's edge, where they stood up
    for (let x = CAMP_X - 1.36; x > 1.6 && i < CAMP_PRINTS; x -= FOOT_STRIDE + (Math.random() - 0.5) * 0.06, side = -side, i++) {
      // STAGGERED, like a walk: left and right feet a shoulder's width apart
      // either side of the line, toes turned a little out, each a little
      // different — in a row they read as a stamp
      const off = (FOOT_SIDE + (Math.random() - 0.5) * 0.04) * side;
      e.set(0, heading + side * FOOT_TOE + (Math.random() - 0.5) * 0.10, 0); q.setFromEuler(e);
      const z = CAMP_Z + 0.02 + (Math.random() - 0.5) * 0.04;
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
    stone.position.set(7.4, 0.26, CAMP_Z - 7.2);
    makeProp(stone, 'stone', { radius: 0.28, restH: 0.26, bounce: 0.12, friction: 0.6 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x2b5a74, roughness: 0.25, transparent: true, opacity: 0.7, emissive: 0x0a2130 });
    const r = 0.23;
    const float = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), glass);
    float.position.set(5.6, r, CAMP_Z + 8.6);
    const fp = makeProp(float, 'glass float', { radius: r, restH: r, bounce: 0.5 });
    fp.onImpact = (speed) => shatterGlass(fp, float, speed, r);
  }

  scene.add(camp);
  farProps.push({ obj: camp, z: CAMP_Z, d: 260 });
}

// ------------------------------------------------------------------
// The snorkeler — a tube above the water, twenty metres out
// ------------------------------------------------------------------
/* Off the campsite, out past where you can wade, there is a snorkel standing
 * a hand's width out of the water and nothing else — you can barely see it,
 * and it goes under and comes back with the swell. He is a photo cut-out
 * like Bradly and the fisherman (`bakeCutout`, blink and all), a sprite
 * whose lower part is simply BELOW the drawn sea, so the water hides him:
 * `SNORK_PEEK` of the tube shows until something you threw comes down near
 * him, and then he comes up shouting and the dialogue opens on him.
 *
 * The cut-out is `assets/snorkeler.png` (from `tools/cutout.swift`, like the
 * others); until it is there the sprite stays hidden and none of this runs. */
const SNORK_X = -8.5, SNORK_Z = CAMP_Z - 5;  // eleven metres off the waterline, six past where you can wade
const SNORK_H = 0.95;                 // tube tip to waterline; over life-size, like every cut-out read at range
const SNORK_PEEK = 0.23;              // the tube and nothing else: 9 cm was a pixel at twenty metres
const SNORK_EYES = { x: 0.22, y: 0.388, w: 0.56, h: 0.029 };  // both lenses of the mask, measured off the cut-out
const SNORK_WL = 0.69;                // the photo's own waterline, as a fraction of the cut-out's height
const SNORK_SINK = -0.30;             // the photo's waterline rides well ABOVE the drawn sea: neck and chest out of the water, the fade at the bottom meeting it
/* HE IS NOT A FLOATING HEAD. The person segmentation ends at his neck, and
 * a neck ending in a line at the surface is a head on a plate. So the
 * cut-out is rebuilt from the PHOTOGRAPH ITSELF (tools/snorkeler_body.py):
 * the head keeps the segmentation's alpha, and below the neck the picture's
 * own pixels — the suit seen through the water, refracted and dimmed as the
 * camera saw it — are kept under a soft shoulder-shaped mask that fades to
 * nothing toward the bottom of the frame, blurred through the join. Nothing
 * is painted. `SNORK_WL` is where the water met him in the photo, and he
 * rises until that line is `SNORK_SINK` under the drawn sea, so the fade is
 * what shows wherever the swell drops. */
const snorkMat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
const snorkSprite = new THREE.Sprite(snorkMat);
snorkSprite.visible = false;
snorkSprite.position.set(SNORK_X, 0, SNORK_Z);
scene.add(snorkSprite);
/* The valve on top of the tube catches the moon. Without it the tube is a
 * dark fleck a pixel or two across on dark water at the retro scale, and
 * "barely see it" turned out to mean "cannot"; with it there is one warm
 * point out there that is not a star, which is exactly as much as you get. */
const snorkGlint = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTex, color: 0xffb080, transparent: true, opacity: 0.0,
  depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
}));
snorkGlint.raycast = () => {};
snorkGlint.scale.setScalar(0.42);
snorkGlint.visible = false;
scene.add(snorkGlint);
let snorkOpenTex = null, snorkShutTex = null, snorkBlinkT = 2, snorkBlinking = false;
function snorkSetFrames(img) {
  // SNORK_H is tip to waterline; the picture runs on below that into the water
  const T = SNORK_H / SNORK_WL;
  snorkSprite.scale.set(T * img.width / img.height, T, 1);
  // his own colours: the pink and the cyan are the point of him, so no desaturation and a finer posterise
  const f = bakeCutout(img, SNORK_EYES, { pix: 620, levels: 12, grain: 6, sat: 1.0 });
  snorkOpenTex = f.open; snorkShutTex = f.shut;
  snorkMat.map = snorkOpenTex; snorkMat.needsUpdate = true;
  snorkSprite.visible = true;
}
new THREE.TextureLoader().load('assets/snorkeler.png', (tex) => {
  if (tex.image && tex.image.width) snorkSetFrames(tex.image);
}, undefined, () => {});

const SNORK_SCRIPT = {
  start: {
    text: 'HOLY SHIT!! YOU ALMOST CRUSHED MY SKULL WITH THAT THING!!',
    choices: [
      { label: "You shouldn't even be here", to: 'here' },
      { label: "C'monnn, I wasn't actually trying to hit you.", to: 'trying' },
      // only if it is on you — and handing it over is handing it over
      { label: 'Give New CD', to: 'cd',
        when: () => inventory.includes(cdItem), act: () => removeFromInventory(cdItem) },
    ],
  },
  here: { text: 'Says the one making sand castles?', choices: [] },
  trying: { text: "Yeah? Then you've got one hell of an arm for somebody not trying.", choices: [] },
  cd: { text: '…Where did you get this. …No. Never mind. I’ll take it.', choices: [] },
};
const SNORK_NPC = { name: 'Snorkeler', script: SNORK_SCRIPT, sprite: snorkSprite, headY: 0 };
let snorkUp = 0, snorkWant = 0, snorkTalkT = -1, snorkDownT = -1, snorkWasOpen = false, snorkT = 0;
/* ONCE. The first version triggered off any body near him, so the stone
 * that roused him — lying in the water beside his head — roused him again
 * every time he went under, and the dialogue spammed. It takes a THROW now
 * (`thrown` is set by throwHeld() and cleared when the body comes to rest),
 * and only until he has been met: after that he stays up, treading water,
 * and he is an interactable you hail with E like anyone else. */
let snorkMet = false;
const snorkHit = new THREE.Group();
{
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 1.4),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy';
  snorkHit.add(hit);
  snorkHit.position.set(SNORK_X, 0, SNORK_Z);
  scene.add(snorkHit);
}
// declared AFTER snorkHit: this file is one module of consts, and a reference
// above the declaration is a dead-zone crash that takes the whole page
addInteractable(snorkHit, 'Talk to him', 'npc', {
  when: () => snorkMet && !dialogOpen,
  far: 30,                                     // he is eleven metres out; a hail carries
  onActivate: () => startDialog('start', SNORK_NPC),
});
function updateSnorkeler(dt) {
  if (!snorkOpenTex) return;
  snorkT += dt;
  // blink, the way the others do
  snorkBlinkT -= dt;
  if (snorkBlinkT <= 0) {
    snorkBlinking = !snorkBlinking;
    snorkMat.map = snorkBlinking ? snorkShutTex : snorkOpenTex; snorkMat.needsUpdate = true;
    snorkBlinkT = snorkBlinking ? 0.12 : (Math.random() < 0.2 ? 0.18 : 2.6 + Math.random() * 3.6);
  }
  /* The trigger: anything thrown that comes down near him. Not "hits" — a
   * stone in the water a metre off is exactly what would make a man surface
   * swearing, and aiming at a snorkel from the beach is hard enough. */
  if (!snorkMet && snorkWant === 0 && !dialogOpen) {
    for (const p of physProps) {
      if (p.held || p.dead || !p.thrown) continue;
      const q = p.mesh.position;
      // a thrown thing coming down near him, at the water
      if (Math.hypot(q.x - SNORK_X, q.z - SNORK_Z) < 3.2 && q.y < waterSurfaceAt(q.x, q.z) + 1.5) {
        snorkMet = true; snorkWant = 1; snorkTalkT = 0.7; p.thrown = false;
        spawnSplash(SNORK_X, SNORK_Z, 26, 0, 0, 1.6); sfxSplash(1.5);
        break;
      }
    }
  }
  for (const p of physProps) if (p.thrown && !p.held && p.vel.lengthSq() < 0.04) p.thrown = false;   // at rest: no longer a throw
  snorkUp += (snorkWant - snorkUp) * Math.min(1, dt * 2.4);
  if (snorkTalkT > 0) {
    snorkTalkT -= dt;
    if (snorkTalkT <= 0 && !dialogOpen) { startDialog('start', SNORK_NPC); snorkWasOpen = true; }
  }
  if (snorkWasOpen && !dialogOpen) snorkWasOpen = false;   // met, he stays up — treading water, hailable with E
  // he rides the swell; only the tube shows until he comes up
  const e = snorkUp * snorkUp * (3 - 2 * snorkUp);
  const water = waterSurfaceAt(SNORK_X, SNORK_Z);
  // the sprite is taller than the photo now (shoulders under it); place it by its TIP
  const T = SNORK_H / SNORK_WL;
  const tip = water + THREE.MathUtils.lerp(SNORK_PEEK, SNORK_H - SNORK_SINK, e);
  snorkSprite.position.y = tip - T / 2 + Math.sin(snorkT * 0.7) * 0.012;
  snorkMat.rotation = Math.sin(snorkT * 0.5) * 0.02 * e;
  snorkHit.position.y = snorkSprite.position.y + T * 0.15;
  // the valve on the tube, only while he is down
  snorkGlint.visible = snorkSprite.visible;
  snorkGlint.position.set(SNORK_X + 0.22 * snorkSprite.scale.x, snorkSprite.position.y + T / 2 - 0.04, SNORK_Z);
  snorkGlint.material.opacity = (1 - e) * (0.22 + 0.10 * Math.sin(snorkT * 1.7));
}

// ------------------------------------------------------------------
// The tall one — Vertex Mercher's "The smile (Rigged)", CC-BY-4.0
// ------------------------------------------------------------------
/* Past the snorkeler, a tall thin figure stands on the dry sand between you
 * and the moon, and turns to keep facing you as you come. It is a black
 * silhouette with a pale grin — the moon is behind it from where you walk,
 * so the shape is all you get until you are close — and the moment you are
 * near enough to make out what it is (`SMILE_SEE`) it bolts for the sea at
 * a flat sprint and goes under, and does not come back. The bolt is the
 * startle: `sfxSmileBolt()` on the first frame of it.
 *
 * `assets/smile.glb` is built by tools/smile_anim.py: the scan decimated to
 * 24k triangles with its own maps, and two clips authored on its 21 bones
 * (`idle`, `run`). The model's front is -Z, like the crab's, so
 * `atan2(dx, dz) + PI` faces it at you. It is one skinned mesh, so ONE of
 * it — no clone(). */
const SMILE_X = 8.6, SMILE_Z = CAMP_Z - 120;   // far enough past the snorkeler that you cannot see one from the other
const SMILE_H = 2.75;                  // taller than a man by a head and a half
const SMILE_SEE = 9;                   // how close you get before it goes: close enough to see the face
const SMILE_RUN = 8.5;                 // m/s, flat out
const SMILE_STEP = 0.17;               // seconds between its footfalls at that speed
const smile = new THREE.Group();
smile.visible = false;
smile.position.set(SMILE_X, 0, SMILE_Z);
scene.add(smile);
farProps.push({ obj: smile, z: SMILE_Z, d: 260 });
let smileMixer = null, smileClips = {}, smilePhase = 0, smileT = 0, smileCur = null, smileStepT = 0;
new GLTFLoader().load('assets/smile.glb', (gltf) => {
  const m = gltf.scene;
  m.traverse((o) => {
    if (!(o.isMesh || o.isSkinnedMesh)) return;
    o.frustumCulled = false;
    const mat = o.material;
    const face = /003/.test(mat.name);
    /* BLACK, and a face you can see. The body is its flat grey taken
     * nearly to black with no rim at all — a Fresnel rim was tried and read
     * as a white sheen over the whole figure. The face keeps its map, is
     * lifted a little, and carries enough emissive that the grin shows in
     * the dark from where you first make it out. */
    mat.color.multiplyScalar(face ? 1.0 : 0.10);
    mat.roughness = 1; mat.metalness = 0;
    mat.emissive = new THREE.Color(face ? 0x6a6a72 : 0x000000);
    if (face) { mat.emissiveMap = mat.map; reexpose(mat, 0.8, null); }
  });
  /* STAND IT UP, AND MEASURE IT SKINNED. Blender exports this rig lying
   * along -Z (its root joint comes out at -90 degrees about X — the
   * Sketchfab FBX chain under it is not something export_yup untangles),
   * so it gets a wrapper turned +90 about X, which puts the head up and the
   * face toward -Z. And Box3.setFromObject() knows nothing about skinning:
   * it boxes the raw geometry through the node chain and answered 7.9 tall
   * by 11.7 wide for a figure that is 32 tall, so the first build scaled
   * it off the wrong axis. `skinnedBounds()` runs the vertices through the
   * bones, which is the only measurement of a skinned mesh that means
   * anything. */
  const up = new THREE.Group();
  up.rotation.x = Math.PI / 2;
  up.add(m);
  const sb = skinnedBounds(up);
  const k = SMILE_H / Math.max(0.01, sb.size.y);
  up.scale.setScalar(k);
  up.position.y = -sb.min.y * k;
  smile.add(up);
  smileMixer = new THREE.AnimationMixer(m);
  for (const c of gltf.animations) smileClips[c.name] = smileMixer.clipAction(c);
  smilePlay('idle', true);
  smile.visible = true;
}, undefined, () => {});
/* The bounds of a skinned thing are where its bones put it, not where its
 * geometry sits: every seventh vertex through applyBoneTransform(). */
const _sbV = new THREE.Vector3();
function skinnedBounds(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3(); box.makeEmpty();
  root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    o.skeleton.update();
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 7) {
      _sbV.fromBufferAttribute(pos, i); o.applyBoneTransform(i, _sbV); _sbV.applyMatrix4(o.matrixWorld); box.expandByPoint(_sbV);
    }
  });
  return { min: box.min.clone(), max: box.max.clone(), size: box.getSize(new THREE.Vector3()) };
}
function smilePlay(name, loop) {
  const a = smileClips[name];
  if (!a || smileCur === a) return a;
  for (const k in smileClips) if (smileClips[k] !== a) smileClips[k].fadeOut(0.1);
  a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.fadeIn(0.1).play();
  smileCur = a;
  return a;
}
/* ITS FEET ARE THE SOUND. A stinger was tried on the bolt and cut: a
 * musical shriek tells you the game is scaring you. Fast heavy footfalls on
 * sand, falling off with distance, tell you something big is running, and
 * then the splash tells you where it went. Each is a lowpassed slap of
 * noise and a thump under it, the same recipe as a step, only bigger. */
function sfxSmileStep(dist) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut();
  const g0 = 0.9 / (1 + dist / 7);
  const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate); const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const ns = ctx.createBufferSource(); ns.buffer = nb;
  const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 520 + Math.random() * 120;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(g0, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
  ns.connect(nf); nf.connect(ng); ng.connect(out); ns.start(t);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(74, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.1);
  const og = ctx.createGain(); og.gain.setValueAtTime(g0 * 0.8, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.16);
}
const _smileTurn = (cur, want) => { let d = want - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
function updateSmile(dt) {
  if (!smileMixer || smilePhase === 2) return;
  smileMixer.update(dt * (smilePhase === 1 ? 2.0 : 1));
  const p = smile.position;
  if (smilePhase === 0) {
    // it stands, and it turns to keep its face on you — slowly, like it has all night
    const dx = camera.position.x - p.x, dz = camera.position.z - p.z;
    const want = Math.atan2(dx, dz) + Math.PI;
    smile.rotation.y += _smileTurn(smile.rotation.y, want) * Math.min(1, dt * 1.4);
    if (introDone && !dying && !ended && Math.hypot(dx, dz) < SMILE_SEE) {
      smilePhase = 1; smileT = 0; smileStepT = 0;
      smilePlay('run', true);
    }
    return;
  }
  // the bolt: it wheels to the sea and goes, straight down the beach into the water
  smileT += dt;
  const want = Math.atan2(-1, 0) + Math.PI;
  smile.rotation.y += _smileTurn(smile.rotation.y, want) * Math.min(1, dt * 7);
  p.x -= SMILE_RUN * dt;
  const sub = submersionAt(p.x, p.z);
  // its feet, until the water takes the sound
  smileStepT += dt;
  if (smileStepT >= SMILE_STEP && sub < 0.4) { smileStepT = 0; sfxSmileStep(camera.position.distanceTo(p)); }
  if (sub > 0.15 && Math.random() < 0.6) spawnSplash(p.x, p.z, 7, -1, 0, 1.3);
  if (sub > 0.15 && !smile.userData.splashed) { smile.userData.splashed = true; sfxSplash(1.3); }
  /* AND GONE. It used to sink slowly and go invisible far out, and out
   * there the swell drops two metres, so its head and shoulders stood out of
   * a trough for seconds. It goes down fast once it is past the wading
   * line, and it is switched off the frame the top of it is under the drawn
   * sea — measured against the water where it is, not a distance. */
  if (p.x < WADE_X + 1) p.y -= 3.4 * dt;                      // it goes under like a dive, not a wade
  const water = waterSurfaceAt(p.x, p.z);
  if (p.y + SMILE_H < water - 0.25 || p.x < -14) {
    /* REMOVED, not hidden. `visible = false` was undone the next frame by
     * updateFarProps(), which switches every entry in `farProps` on or off
     * by distance — so it stood back up at its last spot, head at the
     * surface, for the rest of the game. Out of the scene and out of the
     * list, it cannot come back. */
    smilePhase = 2;
    scene.remove(smile);
    const fi = farProps.findIndex((f) => f.obj === smile);
    if (fi >= 0) farProps.splice(fi, 1);
  }
}

// ------------------------------------------------------------------
// The mushroom house — the Bell Pavilion, past the tall one
// ------------------------------------------------------------------
/* Built to the photographs (see models/mushroom-house.js): a round concrete
 * room on a single column at the foot of the sand wall, a bunker of curved
 * walls on a platform below it, an iron gate hanging open, and inside the
 * column a spiral stair that winds up an open well into the room. It is a
 * fixed world object like the lighthouse and walks the same way: regions
 * and clamps in `updateMushroom()`, the stair climbed by winding, the room
 * a floor with a window wall and a railed well. Its bunker walls and
 * platform are `rockColliders`, so a thrown thing and the player agree on
 * them. The cliff is cut open behind it in world space, the drain's trick.
 * The cliff clamp lifts while you are in it, so the back of the room — which
 * stands past CLIFF_BLOCK_X — can be walked. */
const MUSH_X = 16.0, MUSH_Z = SMILE_Z - 90;   // the column's axis ON the cliff line: half of it in the wall, the steps dry at x = 9
const mushHouse = makeMushroomHouse();
mushHouse.group.position.set(MUSH_X, 0, MUSH_Z);
scene.add(mushHouse.group);
farProps.push({ obj: mushHouse.group, z: MUSH_Z, d: 320 });
for (const c of mushHouse.colliders) {
  if (c.r !== undefined) rockColliders.push({ x: c.x + MUSH_X, z: c.z + MUSH_Z, r: c.r, top: c.top, mat: c.mat });
  else rockColliders.push({ x0: c.x0 + MUSH_X, x1: c.x1 + MUSH_X, z0: c.z0 + MUSH_Z, z1: c.z1 + MUSH_Z, top: c.top, mat: c.mat });
}
{
  const prev = cliff.material.onBeforeCompile;
  cliff.material.onBeforeCompile = function (sh, rndr) {
    if (prev) prev.call(this, sh, rndr);
    sh.uniforms.uMushX = { value: MUSH_X }; sh.uniforms.uMushZ = { value: MUSH_Z };
    /* THE CUT LIVES INSIDE THE RETAINING WALL. At 5.9 m it reached past the
     * wall's outer face and past the parapet's ends, so the bluff was taken
     * away where nothing stood in front of it and you saw the void behind
     * the sand wall from the beach. 5.62 is inside the wall's inner face
     * (5.55) and well inside its outer (5.95), so the bluff is drawn right
     * up to the back of the concrete and is hidden by it; 3.85 clears the
     * highest the bluff reaches anywhere inside that radius (3.60) and is
     * under the wall's own top, so the cut can never show over it. */
    sh.fragmentShader = 'uniform float uMushX, uMushZ;\n' + sh.fragmentShader.replace(
      'if (abs(vDrainW.z - uDrainZ) < 2.6 && vDrainW.y < 3.3) discard;',
      'if (abs(vDrainW.z - uDrainZ) < 2.6 && vDrainW.y < 3.3) discard;\n  if (length(vDrainW.xz - vec2(uMushX, uMushZ)) < 5.62 && vDrainW.y < 3.85) discard;');
  };
  cliff.material.needsUpdate = true;
}
/* WHERE YOU ARE IS REMEMBERED, NOT INFERRED. The room used to be "feet high
 * enough and far enough out from the axis", and that is true of the top
 * three treads of the stair as well — so one step down off the top tread put
 * the room's floor back under you and its rail back in front of you, and you
 * could not get down again. `mushWhere` is the state and the transitions are
 * the three real ways through: the doorway at the bottom, the top tread, and
 * the gap in the well rail. They have hysteresis — in at the tread line, out
 * at the well line — so standing on the lip cannot flicker between them. */
let mushWhere = 'out';                                  // 'out' | 'stair' | 'floor'
/* AND THE YARD IS PAST THE CLIFF LINE TOO. The column's axis is ON it, so
 * with the cliff clamp running in the bunker you could walk the seaward
 * third of the yard and never get round the back of the column. The walls
 * are real colliders and they are a closed ring but for the gate, so they
 * can hold you instead; the only way out of the ring is seaward, well
 * short of the clamp, so dropping it can never snap you anywhere. */
let mushInYard = false;
let mushTurns = 0, mushLastA = 0, mushStairY = null;
const _angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
function updateMushroom(dt) {
  const M = MUSH;
  const dx = camera.position.x - MUSH_X, dz = camera.position.z - MUSH_Z;
  let d = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  const feet = camBaseY - playerEye();
  const clampTo = (r) => { if (d > 0.001) { camera.position.x = MUSH_X + (dx / d) * r; camera.position.z = MUSH_Z + (dz / d) * r; d = r; } };
  const atGap = Math.abs(_angDiff(ang, M.TOP_ANG)) < 0.45;              // where the stair arrives: the gap in the well rail
  const doorOk = Math.abs(_angDiff(ang, M.DOOR_ANG)) < M.DOOR_HALF * 0.95;
  const inner = M.BORE - PLAYER_R * 0.55, outer = M.R_ROOM - 0.45;
  mushInYard = d < M.WALL_R + 0.6 && feet < M.PLAT_TOP + 2.4;

  if (mushWhere === 'out') {
    /* The wall clamp parks you at EXACTLY COL_R + PLAYER_R, so an entry test
     * of "closer than that" was never true: you could stand in the doorway
     * pushing and never be inside. The door takes you from further out. */
    if (d < M.COL_R + PLAYER_R + 0.3 && doorOk && feet < M.PLAT_TOP + 1.7) {
      /* THE COUNT STARTS AT THE DOOR, or the first frame inside credits you
       * with the angle from wherever it last was to the doorway. */
      mushWhere = 'stair'; mushLastA = ang;
      mushTurns = THREE.MathUtils.clamp(_angDiff(M.A0, ang) / (Math.PI * 2), M.TURN_MIN, M.TURNS);
      mushStairY = null;
    } else {
      if (d < M.COL_R + PLAYER_R) clampTo(M.COL_R + PLAYER_R);
      return;
    }
  }

  if (mushWhere === 'floor') {                            // the round room
    groundY = Math.max(groundY, M.H_ROOM);
    mushLastA = ang;
    if (d > outer) { clampTo(outer); return; }
    if (d >= M.BORE + 0.15) return;
    if (!atGap) { clampTo(M.BORE + 0.15); return; }       // the rail round the well
    if (d > inner) return;                                // on the lip, at the head of the stair
    /* and the count starts at the TREAD YOU STEPPED ONTO, the same rule as
     * the door: TURNS flat would credit you with the angle between the top
     * tread and wherever in the gap you came in — a fifth of a metre. */
    mushWhere = 'stair'; mushStairY = M.H_ROOM;                        // down you go
    mushTurns = THREE.MathUtils.clamp(M.TURNS - _angDiff(ang, M.TOP_ANG) / (Math.PI * 2), M.TURN_MIN, M.TURNS);
  }

  // on the stair. Wind first — it gains RISE per turn, UP as the angle
  // decreases, the lighthouse's convention — then read what that has earned.
  if (d > 0.3) mushTurns = THREE.MathUtils.clamp(mushTurns + _angDiff(mushLastA, ang) / (Math.PI * 2), M.TURN_MIN, M.TURNS);
  mushLastA = ang;
  const atTop = mushTurns >= M.TURNS - 0.09 && atGap;     // the top tread, level with the floor
  const atDoor = mushTurns * M.RISE < 0.6 && doorOk;      // the bottom, level with the platform (the count is negative there)
  if (atTop && d > M.BORE) {                              // stepped off onto the floor ring
    mushWhere = 'floor'; mushStairY = M.H_ROOM;
    groundY = Math.max(groundY, M.H_ROOM);
    if (d > outer) clampTo(outer);
    return;
  }
  if (atDoor && d > M.COL_R + 0.9 && feet < M.PLAT_TOP + 1.2) {   // out through the door
    mushWhere = 'out'; mushTurns = 0; mushStairY = null; return;
  }
  if (!atTop && !atDoor && d > inner) clampTo(inner);
  if (d < 0.5) clampTo(0.5);
  const raw = THREE.MathUtils.clamp(M.PLAT_TOP + mushTurns * M.RISE, M.PLAT_TOP, M.H_ROOM);
  const stepped = Math.min(M.H_ROOM, Math.floor((raw - M.PLAT_TOP) / M.STEP + 1e-4) * M.STEP + M.PLAT_TOP + 0.035);
  mushStairY = mushStairY === null ? stepped : mushStairY + (stepped - mushStairY) * Math.min(1, dt * 18);
  groundY = Math.max(groundY, mushStairY);
}

// ------------------------------------------------------------------
// The mutants — the three waiting on the beach past the pavilion
// ------------------------------------------------------------------
/* cgtrader's "Mutant 01". The asset ARRIVES with its animation — a 70-bone
 * rig and seventeen clip FBXs authored on it — so nothing is posed here;
 * `tools/mutant_anim.py` puts fourteen of those clips onto the one textured
 * mesh and exports them as glTF actions. What is built here is the FIGHT.
 *
 * THREE OF THEM, AND THE PACK SHIPS THREE SKINS. One download, parsed three
 * times — the crab's trick, because a skinned mesh cannot be `clone()`d and
 * SkeletonUtils is not vendored — and two of the copies swap their albedo
 * for the loose JPEGs the build writes out beside the GLB. The sculpt is the
 * same, so one normal and one roughness map serve all three. What makes them
 * read as different animals is not only the skin: `MUT_KINDS` gives each one
 * its own height, speed, health, VOICE and set of swings, and the swing
 * table is scaled per kind rather than restated — the big one winds up
 * slower, reaches further and is open longer for it; the small one is the
 * other way about.
 *
 * ONLY ONE OF THEM MAY SWING AT A TIME (`mutToken`). Three enemies all
 * telegraphing at once is not three times the fight, it is noise: there is
 * no tell to read because there are three, and no answer that is not luck.
 * With the token, whoever is closest and off cooldown takes the swing and
 * the other two circle you — so what you are reading is always one creature,
 * and the pressure comes from where the other two have got to while you
 * dealt with it. It is released the instant that one is parried, hurt,
 * killed or finishes its recovery. */
const MUT_X = 9.8, MUT_Z = MUSH_Z - 130;   // well past the pavilion, and up on the DRY sand:
                                           // the waterline reaches x = 8.6 (the body bag's hard number)
const MUT_HP = 5;
const MUT_SPEED = 4.6;                     // the pale one's; each kind scales off it.
                                           // You WALK at 3.4 and sprint at 4.7: at 4.1 the big
                                           // one made 3.5 and backing up was a dodge for free.
const MUT_DASH = 8.0;                      // the closing burst, faster than you can run
const MUT_STUN = 2.1;                      // what landing a parry buys you
const MUT_RECOIL = 0.32;                   // how long a survived hit rocks it
const MUT_HIT_STOP = 0.09;
const MUT_HEAVY = 0.85;                    // a swing wound past this takes two
const MUT_STRAFE = 1.7;                    // how fast they circle you at reach
const MUT_SEP = 2.6;                       // and how far off each other they stay
/* NOT IN A LINE. Three of them coming straight at you arrive in a file, one
 * behind the other, and fight from there — which the owner saw. Each has a
 * SLOT round you: the one with the turn is AHEAD, and the others take the
 * side of it they are already on, a good half-turn out, and come in toward
 * that point at reach rather than toward you. With no turn given out, the
 * slots hang off the pack's centre. Crabs use the same rule with their own
 * angle. `flankDir` bends an approach toward the slot while there is room
 * to; `flankSide` picks which way to circle so the circling spreads them. */
const MUT_SLOT_ANG = 1.05, CRAB_SLOT_ANG = 1.15;
function slotAngle(u, list, token, slotAng) {
  const cx = camera.position.x, cz = camera.position.z;
  const angU = Math.atan2(u.g.position.x - cx, u.g.position.z - cz);
  let ax, slot;
  if (token && token !== u) {
    ax = Math.atan2(token.g.position.x - cx, token.g.position.z - cz);
    let d = angU - ax; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    slot = d >= 0 ? 1 : -1;
  } else if (token === u) return null;
  else {
    let mx = 0, mz = 0, n = 0;
    for (const o of list) if (o.st.alive && o.st.awake) { mx += o.g.position.x; mz += o.g.position.z; n++; }
    if (n < 2) return null;
    ax = Math.atan2(mx / n - cx, mz / n - cz);
    slot = [0, -1, 1][list.indexOf(u) % 3];
    if (slot === 0) return null;
  }
  return ax + slot * slotAng;
}
function flankDir(u, list, token, slotAng, dist, ring, out) {
  const ta = slotAngle(u, list, token, slotAng);
  if (ta === null) return;
  const tx = camera.position.x + Math.sin(ta) * ring - u.g.position.x;
  const tz = camera.position.z + Math.cos(ta) * ring - u.g.position.z;
  const td = Math.hypot(tx, tz) || 1e-4;
  // toward the slot while there is ground to cover, toward you when close: a slot is a way to arrive, not a place to stand
  const k = THREE.MathUtils.clamp((dist - ring) / 1.2, 0, 1) * Math.min(1, td / 1.5);
  out.x = out.x * (1 - k) + (tx / td) * k; out.z = out.z * (1 - k) + (tz / td) * k;
  const l = Math.hypot(out.x, out.z) || 1e-4; out.x /= l; out.z /= l;
}
function flankSide(u, list, token, slotAng) {
  const ta = slotAngle(u, list, token, slotAng);
  if (ta === null || Math.random() < 0.25) return Math.random() < 0.5 ? -1 : 1;
  const angU = Math.atan2(u.g.position.x - camera.position.x, u.g.position.z - camera.position.z);
  let d = ta - angU; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  return d > 0 ? 1 : -1;                     // +side runs the angle up, measured
}

/* Four swings, and none of them on a fixed clock. Each has its own startup,
 * its own reach and its own contact frame — `hit`, where the hand actually
 * arrives, measured in the build and not guessed — and the two halves of the
 * clip are mapped separately (`mutClipTime`) so retuning a startup never
 * pulls the picture off the damage frame.
 *   attack   the overhand — the long readable one, the one you learn on
 *   attack2  a quick swipe: the punishment for standing in reach guard-down
 *   attack3  THE HELD ONE. It winds all the way up and HANGS there, so a
 *            guard raised on the first count is a block, not a parry
 *   attack4  the lunge: it covers ground through the strike, so backing off
 *            during the startup is not the answer it is to the others */
const MUT_ATTACKS = {
  attack:  { wind: 0.62, strike: 0.12, recover: 0.72, hit: 0.413, reach: 2.45, lunge: 0.0, chain: 'attack2', chainP: 0.30, w: 0.34 },
  attack2: { wind: 0.34, strike: 0.10, recover: 0.46, hit: 0.257, reach: 2.25, lunge: 0.0, chain: 'attack',  chainP: 0.60, w: 0.30 },
  attack3: { wind: 1.05, strike: 0.12, recover: 0.60, hit: 0.700, reach: 2.65, lunge: 0.0, chain: null,      chainP: 0.00, w: 0.20 },
  attack4: { wind: 0.50, strike: 0.14, recover: 1.05, hit: 0.333, reach: 2.55, lunge: 1.4, chain: 'attack2', chainP: 0.35, w: 0.16 },
  /* AND THE OTHER HAND. The pack has four swings; `tools/mutant_anim.py`
   * mirrors each one across the rig so the other arm throws it, and those
   * four join the table with their sources' own timings and contact frames
   * — a swing you have learned to read from the right comes from the left,
   * and a chain can cross hands. Eight tells, not four. */
  attackM:  { wind: 0.62, strike: 0.12, recover: 0.72, hit: 0.413, reach: 2.45, lunge: 0.0, chain: 'attack2M', chainP: 0.30, w: 0.34 },
  attack2M: { wind: 0.34, strike: 0.10, recover: 0.46, hit: 0.257, reach: 2.25, lunge: 0.0, chain: 'attack',   chainP: 0.60, w: 0.30 },
  attack3M: { wind: 1.05, strike: 0.12, recover: 0.60, hit: 0.700, reach: 2.65, lunge: 0.0, chain: null,       chainP: 0.00, w: 0.20 },
  attack4M: { wind: 0.50, strike: 0.14, recover: 1.05, hit: 0.333, reach: 2.55, lunge: 1.4, chain: 'attack2',  chainP: 0.35, w: 0.16 },
  /* AND THE MAN WITH THE CROWBAR. The same table, because the fight is the
   * same fight — the tell, the commit, the punish window, the parry and the
   * riposte are the grammar the beach taught you and the boss is where you
   * are asked to speak it. What is his own is the timing: he is quicker off
   * the mark than anything on the sand and his recoveries are shorter, so
   * the openings are real but narrow. `hit` on each is the frame the bar
   * actually arrives, measured off the swinging hand by `tools/dealer_pack.py`
   * and not guessed — three of the six are mirrored clips and their contact
   * lands at a different fraction from their source's. */
  /* THE STARTUP IS THE SWING YOU SEE. `mutClipTime` squeezes the clip's
   * wind-up into `wind`, and at 0.30 s the side swing's second of clip ran
   * at three times speed — a blur, and then you were hit: "some of his
   * swings don't even look like swings". Every startup here is long enough
   * to run its clip near real time. `reach` is shorter than the pack's too,
   * because his blow is tested on the BAR (`dealerBarHit`) and a man with a
   * crowbar reaches two metres, not two and a half; the lunge and the step
   * in the overhand are what close the rest. */
  dDown:  { wind: 0.72, strike: 0.13, recover: 0.50, hit: 0.370, reach: 1.80, lunge: 0.55, chain: 'dSide',  chainP: 0.48, w: 0.18 },
  dSide:  { wind: 0.62, strike: 0.11, recover: 0.38, hit: 0.421, reach: 1.75, lunge: 0.30, chain: 'dDown',  chainP: 0.52, w: 0.18 },   // hit measured in the game: the hand is furthest out at 0.375, and back behind him by 0.5
  dDownM: { wind: 0.70, strike: 0.13, recover: 0.72, hit: 0.278, reach: 1.80, lunge: 0.55, chain: 'dSideM', chainP: 0.42, w: 0.14 },
  dSideM: { wind: 0.52, strike: 0.11, recover: 0.56, hit: 0.281, reach: 1.75, lunge: 0.30, chain: 'dDown',  chainP: 0.42, w: 0.14 },
  // the held one: a full second over his head, so a guard raised on the
  // first beat is a block and not a parry. It is the swing that teaches you
  // to watch the arm instead of counting.
  // THE ONE THAT TAKES TWO. A boss needs a blow you are afraid of, and the
  // fair one to make it is the one you can see coming from furthest away:
  // a second of bar over his head. Half your health, and telegraphed longer
  // than anything else in the game.
  /* THE ONE YOU HAVE TO BE ABLE TO SEE COMING. `hit` is measured IN THE GAME
   * — the bottom of the bar's arc, clip 0.54 — and not taken from the build,
   * whose detector wants the frame with the most speed in it and finds that
   * in the recovery. And `wind` is what makes it readable: the bar visibly
   * FALLS over a tenth of the clip, so the length of that fall in seconds is
   * a tenth of `wind` divided by `hit`. At 1.08 that was 0.15 s against a
   * parry window of 0.156 — you were not reading it, you were guessing, and
   * the owner said so. At 1.55 the fall is 0.29 s, nearly twice the window.
   * A second and a half of bar over his head is a long tell, and it should
   * be: it is the slowest thing he throws, the most punishable, and the only
   * one that takes two of your four. */
  dHold:  { wind: 1.22, strike: 0.13, recover: 0.62, hit: 0.656, reach: 1.95, lunge: 0.40, chain: null,     chainP: 0.00, w: 0.20, dmg: 2 },
  // and the one that covers the ground you just backed off
  dLunge: { wind: 0.60, strike: 0.15, recover: 0.90, hit: 0.500, reach: 2.40, lunge: 2.1,  chain: 'dSide',  chainP: 0.30, w: 0.18 },
};
/* The three of them. `use` is which swings this one has and how often it
 * reaches for each; `windK` scales its startups AND its recoveries together,
 * so a slow one is slow to commit and slow to recover — the punish window is
 * the price of the reach. `voice` is a pitch and two weights, and every
 * sound it makes goes through it, so you can tell which one is behind you. */
/* AND THEY ARE NOT BUILT ALIKE EITHER. One mesh, one skeleton, three sets of
 * proportions: `bones` scales named bones on each copy after it is parsed and
 * before it is measured, so a bigger head or a longer forearm changes the
 * silhouette and the game still stands the creature on its feet at the right
 * height. It works only because the build strips the scale channels — the FBX
 * bake keys a scale of 1.0 on all seventy bones every frame, and the mixer
 * was stamping this straight back out. `PETALS` is the twelve flaps of the
 * split-open skull, which is the fastest way to make one head not another. */
const PETALS = [];
for (const side of ['L', 'R', 'front', 'Back'])
  for (let i = 1; i <= 3; i++) PETALS.push('Head_pt_' + side + '_0' + i);
const petalScale = (k) => { const o = {}; for (const n of PETALS) o[n] = k; return o; };

const MUT_KINDS = {
  /* the pale one: the fight you learn the language on. Long in the forearm,
   * otherwise the shape the sculpt came in. Run01, nearly upright. */
  pale: { skin: null, h: 2.30, hp: 5, dmg: 1, speedK: 1.00, windK: 1.00, reachK: 1.05, aggr: 1.10,
          use: { attack: 0.20, attackM: 0.14, attack2: 0.16, attack2M: 0.14, attack3: 0.18, attack4: 0.18, attack4M: 0.10 },
          circle: 0.20, step: 0.30, chainMax: 1, feint: 0.10,
          bones: Object.assign({ Character1_LeftForeArm: 1.32, Character1_RightForeArm: 1.32,
                                 Character1_LeftHand: 1.22, Character1_RightHand: 1.22,
                                 Character1_Neck: 1.40, Character1_Head: 0.94 }, petalScale(0.9)),
          anim: { run: 'run', idle: 'idle', roar: 'roar', die: 'die', walk: 'walk', back: 'back',
                  rate: 1.05, lean: 0.10, strafeK: 1.0 },
          voice: { f: 1.00, growl: 1.00, rasp: 1.00, throat: 'wet' } },
  /* the flayed red one: a head a fifth again the size with the skull flaps
   * thrown wide, thick in the arm and the thigh, and it HITS FOR TWO — you
   * have three. Fair only because its startups are the longest thing in the
   * fight and its recovery the most punishable. Run02 at four fifths: a plod. */
  red:  { skin: 'assets/mutant-red.jpg', h: 2.74, hp: 7, dmg: 2, speedK: 0.95, windK: 1.24, reachK: 1.20, aggr: 1.00,
          use: { attack: 0.24, attackM: 0.16, attack3: 0.20, attack3M: 0.16, attack4: 0.28, attack2M: 0.10 },
          circle: 0.10, step: 0.38, chainMax: 1, feint: 0.04,
          bones: Object.assign({ Character1_Head: 1.48, Character1_Spine2: 1.14,
                                 Character1_LeftArm: 1.26, Character1_RightArm: 1.26,
                                 Character1_LeftUpLeg: 1.16, Character1_RightUpLeg: 1.16 }, petalScale(1.55)),
          anim: { run: 'run2', idle: 'idle2', roar: 'roar2', die: 'die2', walk: 'walk2', back: 'back2',
                  rate: 0.80, lean: 0.03, strafeK: 0.7 },
          voice: { f: 0.68, growl: 1.45, rasp: 0.7, throat: 'bellow' } },
  /* the dark one: a small tight head, forearms a third longer than they
   * should be and shins to match — it is all reach and no weight. Four
   * health, chains three swings together, and runs Run02 at nearly twice
   * speed bent right over, which is faster than you can sprint. */
  dark: { skin: 'assets/mutant-dark.jpg', h: 2.02, hp: 4, dmg: 1, speedK: 1.32, windK: 0.72, reachK: 1.00, aggr: 1.60,
          use: { attack2: 0.26, attack2M: 0.24, attack4: 0.18, attack4M: 0.16, attack: 0.12, attackM: 0.10 },
          circle: 0.34, step: 0.22, chainMax: 2, feint: 0.20,
          bones: Object.assign({ Character1_Head: 0.62, Character1_Neck: 1.25,
                                 Character1_LeftArm: 1.10, Character1_RightArm: 1.10,
                                 Character1_LeftForeArm: 1.48, Character1_RightForeArm: 1.48,
                                 Character1_LeftLeg: 1.36, Character1_RightLeg: 1.36 }, petalScale(0.55)),
          anim: { run: 'run2', idle: 'idle2', roar: 'roar', die: 'die', walk: 'walk', back: 'back',
                  rate: 1.95, lean: 0.30, strafeK: 1.45 },
          voice: { f: 1.46, growl: 0.62, rasp: 1.45, throat: 'chitter' } },
  /* THE BLUE BLOOD DEALER. The first boss, and the argument for every rule
   * the beach spent a kilometre teaching. He is a man, so nothing about him
   * is a monster: he does not roar, he does not come apart, he does not
   * throw sand, and he goes down where he stood. What makes him the hardest
   * thing in the game is that he is FAST — startups at nine tenths of the
   * pack's, recoveries shorter still — and that he never stops: `aggr` 1.7
   * is a fifth of a second between swings, he chains two deep, and one in
   * five of his startups is a feint. Twelve health against a light swing's
   * one is a long exchange, and the only way to shorten it is the riposte:
   * parry, wind all the way up, and take four off him at once.
   * `solo` keeps him out of everything the pack shares — the dock cutscene
   * wakes every mutant on the beach, and he is not on the beach. */
  /* BALANCE: he was built at aggr 1.70 and windK 0.90 — a fifth of a second
   * between swings and startups shorter than anything on the beach — on top
   * of an animation bug that meant none of it could be SEEN. With the swings
   * visible that was simply unfair rather than hard: no gap to punish and no
   * tell long enough to read. Startups now run at the pack's own length, he
   * breathes between them, and ten health is five clean exchanges. The
   * pressure is meant to come from his reach and his chains, not from the
   * player being unable to see him wind up. */
  dealer: { glb: 'assets/dealer.glb', human: true, solo: true, noSand: true, skin: null,
          /* HARDER AGAIN, AND THIS TIME IT IS THE BAR THAT DOES IT. The
           * last pass turned every dial that makes a creature busier —
           * aggression, chains, feints — and he was still not frightening,
           * because half his swings went past you and the ones that landed
           * came off a body that would not close the distance. With the bar
           * aimed at your chest his blows connect, so the numbers can come
           * down where they were only compensating and up where they now
           * mean something: he is FASTER on his feet than you are, his
           * recovery is shorter, and his health is the health of a boss. */
          h: 2.05, hp: 24, dmg: 1, speedK: 1.30, windK: 0.92, reachK: 1.00, aggr: 2.05,
          /* AND THE STAGGER IS SHORTER THAN THE BEACH'S. Rocking him is the
           * prize and it still is, but a third of a second of him standing
           * there was two free swings; `recoilK` gives you one. */
          recoilK: 0.72,
          /* NO MIRRORED SWINGS FOR HIM. The pack's mirrors work because a
           * mutant's hands are both empty; his bar is SKINNED TO THE RIGHT
           * HAND, so a mirrored swing had the empty left hand do the swinging
           * while the crowbar hung at his side — six of them in a minute and
           * not one landed, and none of them looked like anything. Four
           * swings: the overhand, the horizontal, the held one, the lunge. */
          use: { dDown: 0.30, dSide: 0.26, dHold: 0.22, dLunge: 0.22 },
          circle: 0.70, step: 0.30, chainMax: 3, feint: 0.30,
          /* POISE, AND A GUARD OF HIS OWN. A light swing used to rock him every
           * time — a boss you can stun-lock with clicks is not a boss — so it
           * takes three (`poise`) to stagger him and only a charge does it at
           * once; and a light swing thrown at him while he is standing ready
           * meets the bar a third of the time (`block`), steel on steel, and
           * does nothing. The parry is untouched: read the tell, take the stun,
           * and the riposte still doubles. That is the fight. And he does not
           * shout between swings (`fidgetK`): a man does not roar at you. */
          poise: 9, poiseBack: 1.9, poiseWait: 1.2, parryK: 0.72,
          block: 0.52, fidgetK: 0.22, fidgetGap: 2.4,
          bones: null,
          anim: { run: 'run', idle: 'ready', roar: 'taunt', die: 'death', walk: 'walk', back: 'walk',
                  rate: 1.0, lean: 0.05, strafeK: 1.2 },
          voice: { f: 1.00, growl: 0.80, rasp: 0.9, throat: 'mask', human: true } },
};
const MUT_VOICE = MUT_KINDS.pale.voice;    // the default for anything unvoiced
const MUT_WIND = MUT_ATTACKS.attack.wind;  // the harness and the docs name the overhand's
const mutants = [];
const mutPlayWarned = new Set();
let mutToken = null;                       // whose turn it is to swing

/* Whatever swing it is in the middle of, as an entry that certainly exists:
 * its own table first, the shared one next, and failing both the first swing
 * its kind owns. Nothing downstream has to test for it. */
function swingOf(u) {
  return (u.atk && u.atk[u.st.swing]) || MUT_ATTACKS[u.st.swing]
    || (u.atk && u.atk[Object.keys(u.kind.use)[0]]) || MUT_ATTACKS.attack;
}
function mutPlay(u, name, loop) {
  const a = u.clips[name];
  if (!a && name && !mutPlayWarned.has(name)) { mutPlayWarned.add(name); console.warn('[mut] no clip named', name, '— the creature will keep playing whatever it was'); }
  if (!a || u.cur === a) return a;
  for (const k in u.clips) if (u.clips[k] !== a) u.clips[k].fadeOut(0.14);
  a.reset();
  a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  a.clampWhenFinished = !loop;
  a.fadeIn(0.14).play();
  u.cur = a;
  return a;
}
/* THE CONTACT FRAME IS NOT HALFWAY. The hand arrives partway through the
 * clip and the startup and recovery it is mapped onto are not the same
 * length, so the two halves are remapped separately: however the timings are
 * tuned, the hand lands on the frame the damage is dealt. */
function mutClipTime(t, dur, A) {
  const hit = dur * A.hit;
  if (t < A.wind) return (t / A.wind) * hit;
  return hit + ((t - A.wind) / (A.strike + A.recover)) * (dur - hit);
}
/* What it is doing with its body between the beats. `u.gait` is the walk,
 * the run and the idle it is using RIGHT NOW, drawn again whenever it comes
 * to rest or sets off, with its own kind's clip favoured. A creature that
 * always ran the same cycle and always stood the same way read as a
 * recording; one that comes at you differently each time reads as alive. */
function drawGait(u) {
  const N = u.kind.anim, r = Math.random;
  u.gait = {
    walk: r() < 0.6 ? N.walk : (N.walk === 'walk' ? 'walk2' : 'walk'),
    run: r() < 0.7 ? N.run : (N.run === 'run' ? 'run2' : 'run'),
    idle: r() < 0.65 ? N.idle : (N.idle === 'idle' ? 'idle2' : 'idle'),
    idleRate: 0.85 + r() * 0.4,
  };
}
function mutAnim(u, dt, moving) {
  if (!u.mixer) return;
  const N = u.kind.anim;
  if (!u.gait) drawGait(u);
  // set off, or stop: draw again
  const movingNow = moving > 0.04;
  if (movingNow !== !!u.wasMoving) { u.wasMoving = movingNow; if (Math.random() < 0.7) drawGait(u); }
  if (u.st.flourish > 0) u.st.flourish -= dt;
  if (!u.st.alive) {
    const a = mutPlay(u, N.die, false);
    if (a) { a.paused = false; a.timeScale = 1; }
  } else if (u.st.stun > 0) {
    // the reel, run off the stun clock, so it is helpless for exactly as long
    // as it looks helpless
    const a = mutPlay(u, 'hit', false);
    if (a) { a.paused = true; a.time = clampTime(a, (1 - u.st.stun / MUT_STUN) * a.getClip().duration); }
  } else if (u.st.atk >= 0) {
    const a = mutPlay(u, u.st.swing, false);
    if (a) { a.paused = true; a.time = clampTime(a, mutClipTime(u.st.atk, a.getClip().duration, u.atk[u.st.swing])); }
  } else if (u.st.block > 0) {
    const a = mutPlay(u, 'block', false);
    if (a) { a.paused = true; a.time = clampTime(a, (1 - u.st.block / DEALER_BLOCK) * a.getClip().duration); }
  } else if (u.st.recoil > 0) {
    const a = mutPlay(u, 'hit', false);
    if (a) { a.paused = true; a.time = clampTime(a, (1 - u.st.recoil / MUT_RECOIL) * a.getClip().duration * 0.55); }
  } else if (u.st.roar > 0) {
    const a = mutPlay(u, N.roar, false);
    if (a) { a.paused = false; a.timeScale = 1.35; }
  } else if (u.st.side !== 0 && moving < 0.5) {
    // circling you at reach, or backing off a step before the lunge
    const a = mutPlay(u, u.st.side < 0 ? 'strafeL' : 'strafeR', true);
    if (a) { a.paused = false; a.timeScale = 1.25 * N.strafeK; }
  } else if (u.st.back > 0) {
    const a = mutPlay(u, N.back, true);
    if (a) { a.paused = false; a.timeScale = 1.2; }
  } else if (u.st.flourish > 0) {
    // a roar thrown in mid-fight — quick, and not the one it opened with
    const a = mutPlay(u, u.st.flourishClip, false);
    if (a) { a.paused = false; a.timeScale = 1.7; }
  } else if (moving > 0.04) {
    /* GAITS THAT CHANGE. The walk clips were never played — everything that
     * moved ran — and each kind ran one clip for ever. A slow advance walks
     * now, a fast one runs, and which walk and which run is drawn afresh
     * every time it sets off (`u.gait`), so the same creature closes
     * differently from one exchange to the next. */
    const slow = moving < 0.5;
    const a = mutPlay(u, slow ? u.gait.walk : u.gait.run, true);
    if (a) { a.paused = false; a.timeScale = slow ? (1.1 + moving * 1.2) * N.rate : (1.5 + moving * 0.55) * N.rate; }
  } else {
    // and it does not stand the same way twice: the idle is drawn too, and its pace
    const a = mutPlay(u, u.gait.idle, true);
    if (a) { a.paused = false; a.timeScale = u.gait.idleRate; }
  }
  /* THE LEAN IS WHAT MAKES ONE CLIP TWO ANIMALS. Two of them run the same
   * authored cycle; the small one plays it at nearly twice the rate bent
   * thirty degrees over its own feet and the big one at four fifths, almost
   * upright. It goes on the model group, so the skeleton is untouched and
   * the heading is untouched, and it eases in with the running so a
   * standing creature is never tipped. */
  if (u.model) {
    const wantLean = (u.st.atk >= 0 || u.st.stun > 0 || u.st.recoil > 0) ? 0 : N.lean * Math.min(1, moving * 2.2);
    u.leanT += (wantLean - u.leanT) * Math.min(1, dt * 5);
    u.model.rotation.x = u.leanT;
  }
  u.mixer.update(dt);
}
let mutSkins = {};
function dressMutant(u, gltf) {
  const m = u.model = gltf.scene;
  m.traverse((o) => {
    if (!(o.isMesh || o.isSkinnedMesh)) return;
    o.frustumCulled = false;                 // a skinned bounding box is the bind pose
    const mat = o.material;
    if (!mat) return;
    /* NO NIGHT LIFT ON THESE. They went out at emissive 0.30 off their own
     * map over a 0.74 gamma re-expose, and the result was three bright grey
     * figures pasted on a dark beach: a lift applied to a whole map raises
     * the dark parts furthest, so it flattens exactly the folds and sockets
     * that make a body read. The Military Shovel taught this. The occlusion
     * is baked into the albedo now and the albedo is brought down at source
     * (`tools/mutant_tex.py`), so what is left to do here is almost nothing
     * — a breath of emissive so they are not holes, and the COLD RIM, which
     * is the one thing that has to stay: it is the edge that separates two
     * metres of dark flesh from a dark beach, and without it they vanish
     * rather than lurk. METALNESS IS A TRAP — there is no environment map.
     * THE SKIN IS SWAPPED PER COPY, and the material has to be cloned to do
     * it: `parse` hands every copy the same one. */
    const mm = o.material = mat.clone();
    /* A MAN UNDER LAMPS IS NOT A MUTANT ON A BEACH. Everything below this is
     * for two metres of dark flesh backlit by the moon: a gamma re-expose to
     * pull it off the sand and a cold Fresnel rim so it has an edge at all.
     * He stands in a lit room, so he needs neither — the rim read as a
     * silver outline traced round him under the ceiling lamps, which is a
     * ghost, not a man. He keeps his own maps, a touch of emissive so the
     * shadowed side of him is not a hole, and nothing else. */
    if (u.kind.human) {
      mm.metalness = /crowbar/i.test(mat.name) ? 0.55 : 0;
      mm.roughness = /crowbar/i.test(mat.name) ? 0.42 : 0.94;
      mm.emissive = new THREE.Color(0xffffff);
      mm.emissiveMap = mm.map;
      mm.emissiveIntensity = 0.045;   // the grime is in the map; a lift only puts it back
      // the albedo carries a real alpha for the mask straps and the lashes;
      // BLEND on a doubleSided body sorts against itself, so it is a cut-out
      if (mm.transparent) { mm.transparent = false; mm.alphaTest = 0.5; mm.depthWrite = true; }
      mm.side = THREE.FrontSide;
      mm.normalScale && mm.normalScale.set(1.1, 1.1);
      mm.needsUpdate = true;
      return;
    }
    if (u.kind.skin) {
      if (!mutSkins[u.kind.skin]) {
        const t = new THREE.TextureLoader().load(u.kind.skin);
        t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
        mutSkins[u.kind.skin] = t;
      }
      mm.map = mutSkins[u.kind.skin];
    }
    mm.metalness = 0;
    mm.roughness = 1;
    mm.emissive = new THREE.Color(0xffffff);
    mm.emissiveMap = mm.map;
    /* 0.20, and it was measured against the beach and not guessed. At 0.30
     * they were three bright grey figures pasted on the sand; at 0.085 the
     * maps went entirely and all three were the same black creature at
     * fighting range, which is worse — you cannot tell which one is on you.
     * Here the albedo carries: the flesh, the split head, the difference
     * between a red one and a dark one, all of it dark enough to lurk. */
    mm.emissiveIntensity = 0.20;
    mm.normalScale && mm.normalScale.set(1.35, 1.35);   // the sculpt is the detail now
    reexpose(mm, 1.0, [0.070, 0.088, 0.125]);
    mm.needsUpdate = true;
  });
  u.g.add(m);
  /* HE DOES NOT HOLD IT YET. The crowbar is its own mesh in the scan,
   * skinned to whichever hand the clip has it in, so hiding it is all it
   * takes to have him standing empty-handed in the dark — and the fight
   * begins on the frame it appears. */
  if (u.kind.human) {
    m.traverse((o) => { if (o.isMesh && /crowbar/i.test(o.name)) { u.weapon = o; o.visible = false; } });
    m.traverse((o) => { if (o.isBone && /Head_/.test(o.name) && !/HeadTop/.test(o.name)) u.head = o; });
    // the ragdoll is written to the mutant's bone names; a Mixamo rig's are
    // 'mixamorig:Hips_00' — the same joints under a prefix and a number
    u.boneAlias = {};
    m.traverse((o) => {
      if (!o.isBone) return;
      const mm = /^mixamorig:?(.+)_\d+$/.exec(o.name);   // the exporter drops the colon: 'mixamorigHips_00'
      if (mm) u.boneAlias['Character1_' + mm[1]] = o.name;
      if (/RightHand_\d+$/.test(o.name)) (u.bones = u.bones || {}).hand = o;
      if (/RightForeArm_\d+$/.test(o.name)) (u.bones = u.bones || {}).fore = o;
      if (/RightArm_\d+$/.test(o.name)) (u.bones = u.bones || {}).arm = o;
      if (/RightShoulder_\d+$/.test(o.name)) (u.bones = u.bones || {}).shoulder = o;
    });
    u.st.poise = u.kind.poise || 1;
    u.st.block = 0;
    /* HE ALREADY FACES +Z, which is what the AI's `atan2(dx, dz)` points at
     * the player — checked by rendering him alone from all four sides
     * rather than by reasoning about the export, because the chain from the
     * FBX through two importers and an exporter flips twice and the answer
     * looked wrong from every angle but that one. Do not add a half turn
     * here; it puts his back to the fight. */
  }
  // its own build: named bones scaled before anything is measured
  if (u.kind.bones) m.traverse((o) => { if (o.isBone && u.kind.bones[o.name]) o.scale.setScalar(u.kind.bones[o.name]); });
  // Box3.setFromObject() knows nothing about skinning and answers the bind
  // pose through the node chain; skinnedBounds() runs the vertices through
  // the bones and is the only measurement of one of these that means anything
  const b = skinnedBounds(m);
  const s = u.kind.h / Math.max(0.001, b.size.y);
  m.scale.setScalar(s);
  /* Stood on its own feet — and the feet are measured in the GROUP's frame,
   * not the world's. `skinnedBounds` runs the vertices through the bones in
   * world space, so for every creature on the beach, whose group sits at
   * y = 0, the two are the same thing and the difference never showed. The
   * one in the bunker stands forty metres down, and `-b.min.y * s` lifted
   * him twenty-six metres into the sand over the roof. */
  m.position.y = -(b.min.y - u.g.position.y) * s;
  u.modelY = m.position.y;
  u.mixer = new THREE.AnimationMixer(m);
  /* NO SCALE TRACKS. The build strips the scale curves out of the actions,
   * but Blender's glTF exporter SAMPLES every channel on export and wrote
   * seventy constant-1.0 scale tracks back into every clip — 1330 of them —
   * so the mixer was stamping 1.0 over `kind.bones` every frame (three
   * identical builds after all), and `stopAllAction` restores every bound
   * property's ORIGINAL value, which put a severed bone's scale back to 1 and
   * grew the limb back on the frame the body fell. Dropped here, at load. */
  for (const c of gltf.animations) {
    c.tracks = c.tracks.filter((t) => !t.name.endsWith('.scale'));
    u.clips[c.name] = u.mixer.clipAction(c);
  }
  /* THE NAMES THE FIGHT ASKS FOR. `mutAnim` reaches for 'hit', 'strafeL',
   * 'strafeR' and the second gait of everything by name, and the pack has
   * clips for all of them where he has six. The rest are aliases onto what
   * he does have: he circles at a walk, and his second idle is the one the
   * scan shipped with. An action can answer to two names — `mutPlay` compares
   * actions, not keys. */
  if (u.kind.human) {
    const alias = { strafeL: 'walk', strafeR: 'walk', walk2: 'walk', run2: 'run', idle2: 'idleSrc',
                    idle: 'ready', roar: 'taunt', roar2: 'taunt',
      /* AND THE SWINGS ANSWER TO THE NAMES THE TABLE CALLS THEM. `MUT_ATTACKS`
       * knows them as dDown/dSide/dHold/dLunge and the GLB ships them as
       * attackDown/attackSide/attackHold/attackLunge — so `mutPlay` looked up
       * a key that was not there, returned without touching anything, and
       * left whatever was already running to run. He fought the entire fight
       * playing his walk cycle: no wind-up, no crowbar coming down, nothing
       * to read and nothing to time. `mutPlay` returning quietly on a missing
       * clip is what hid it — a swing that does not exist should be loud. */
      block: 'block', dDown: 'attackDown', dSide: 'attackSide', dDownM: 'attackDownM',
      dSideM: 'attackSideM', dHold: 'attackHold', dLunge: 'attackLunge' };
    for (const k in alias) if (u.clips[alias[k]]) u.clips[k] = u.clips[alias[k]];
  }
  mutPlay(u, u.kind.human ? 'calm' : u.kind.anim.idle, true);
  /* AT FULL WEIGHT, NOT FADING IN. `mutPlay` crossfades over 0.14 s, and a
   * mixer that is frozen before the fade lands leaves the skeleton at eight
   * per cent of one clip — which is the BIND POSE, and this rig binds in a
   * T. He stood through his own conversation with his arms straight out. */
  if (u.cur) u.cur.setEffectiveWeight(1);
  u.mixer.update(0.4 + Math.random() * 3.6);  // not caught at the top of the loop
}
const mutGlbWait = {};                     // one download per model, parsed per copy
function makeMutant(x, z, kindName, y = 0) {
  const kind = MUT_KINDS[kindName];
  const g = new THREE.Group();
  g.position.set(x, y, z);
  scene.add(g);
  /* Its own swing table, scaled off the shared one. `windK` moves the
   * startup and the recovery together, and a chain into a swing this kind
   * does not have is dropped rather than left dangling. */
  const atk = {};
  for (const k in kind.use) {
    const A = MUT_ATTACKS[k];
    atk[k] = Object.assign({}, A, {
      wind: A.wind * kind.windK,
      recover: A.recover * kind.windK,
      reach: A.reach * kind.reachK,
      lunge: A.lunge * kind.reachK,
      chain: (A.chain && kind.use[A.chain]) ? A.chain : null,
    });
  }
  const u = {
    g, kind, kindName, atk, model: null, mixer: null, clips: {}, cur: null, leanT: 0,
    st: { alive: true, awake: false, roar: 0, atk: -1, flourish: 0, fidget: 0, swing: Object.keys(kind.use)[0],
          cool: 0, stun: 0, recoil: 0, struck: false, hp: kind.hp, step: 0, deadT: 0,
          side: 0, sideT: 0, back: 0, chained: false, chainN: 0, chainAt: -1, swings: 0, wait: 0,
          sprint: 0, dash: 0, feint: 0, sand: 0, threw: 0, hunger: 2 + Math.random() * 5 },
    hitFrom: new THREE.Vector3(), hitDir: new THREE.Vector3(), dir: new THREE.Vector3(),
    gone: {}, rag: null, gibMat: null, modelY: 0,
  };
  mutants.push(u);
  // the one under the beach is drawn with its room, not by how far down the
  // walk it is — a Z cull would hide him at the very moment you are in there
  if (!kind.solo) farProps.push({ obj: g, z, d: 280 });
  // ONE download per model, parsed once per copy: a skinned mesh cannot be cloned
  const src = kind.glb || 'assets/mutant.glb';
  if (!mutGlbWait[src]) mutGlbWait[src] = fetch(src).then((r) => r.arrayBuffer());
  const loader = new GLTFLoader();
  mutGlbWait[src]
    .then((buf) => new Promise((res, rej) => loader.parse(buf.slice(0), '', res, rej)))
    .then((gltf) => dressMutant(u, gltf))
    .catch(() => {});
  return u;
}
/* Where they stand. Spread across the beach so they do not arrive as a rank,
 * and all of them ahead of the trigger, which is the player's Z alone. */
const MUT_SPOTS = [[MUT_X, MUT_Z, 'pale'], [12.8, MUT_Z - 3.0, 'red'], [5.0, MUT_Z - 1.0, 'dark']];
const mutant = makeMutant(...MUT_SPOTS[0]);
for (let i = 1; i < MUT_SPOTS.length; i++) makeMutant(...MUT_SPOTS[i]);

// the nearest live one — what the blade, a thrown thing and the knockback want
function nearestMutant(pos, maxD = Infinity) {
  let best = null, bd = maxD;
  for (const u of mutants) {
    if (!u.st.alive) continue;
    const d = Math.hypot(pos.x - u.g.position.x, pos.z - u.g.position.z);
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}
/* What shoved you: whichever of the two kinds is nearer. `damagePlayer` used
 * to ask `nearestCrab` and nothing else, so a blow from one of these knocked
 * you away from a crab three hundred metres back up the beach. */
function nearestFoe(pos) {
  const c = nearestCrab(pos);
  let best = c ? c.g : null;
  let bd = c ? Math.hypot(pos.x - c.g.position.x, pos.z - c.g.position.z) : Infinity;
  const m = nearestMutant(pos, bd);
  if (m) best = m.g;
  return best;
}
const mutDrop = (u) => { if (mutToken === u) mutToken = null; };

function parryMutant(u) {
  if (equipped === militaryItem) playSample('blockMil', 1.0, 0.04);
  parryCool = 0;                             // landing one costs you nothing
  u.st.atk = -1; u.st.chainAt = -1; u.st.chained = false;
  mutDrop(u);
  u.st.cool = 0.6;
  u.st.stun = MUT_STUN;
  parryGlow = 0.5;
  guardShockV += 7.6 * u.kind.reachK; spawnSparks(14, 1.3);
  flashMats(u.g);
  sfxParry();
  playSample('poise', 1.0);
  addTrauma(0.7);
  fovKick = Math.max(fovKick, 9);
  vmImpulse(-1.45);
  /* THE FREEZE IS THE REWARD. A parry that only made a noise read as a lucky
   * block; a fifth of a second of the world stopping dead, with the sparks
   * hanging in it, is the game telling you that you did that on purpose. */
  hitstop = Math.max(hitstop, 0.19);
  const kx = u.g.position.x - camera.position.x, kz = u.g.position.z - camera.position.z;
  const kd = Math.hypot(kx, kz) || 1;
  u.g.position.x += (kx / kd) * 0.5;
  u.g.position.z += (kz / kd) * 0.5;
  setPrompt('<b>PARRY</b>');
  setTimeout(() => { if (promptHTML.includes('PARRY')) setPrompt(''); }, 700);
}
function blockMutant(u) {
  if (equipped === militaryItem) playSample('blockMil', 1.0, 0.04);
  else if (equipped === shovelItem) playSample('blockSand', 1.0, 0.04);
  else sfxBlock();
  // the big one costs you more to hold off than the small one does
  stamina = Math.max(0, stamina - BLOCK_COST * 1.35 * u.kind.reachK);
  if (stamina <= 0.001) { exhausted = true; gaspOut(); }
  flashMats(toolVM);
  /* SNAP, NOT SHOVE. A tenth of a second of frozen world under a soft spring
   * read as the blow pushing you; what a block should feel like is a bar
   * arriving on steel and stopping — so the freeze is SHORTER and everything
   * around it is harder: the spring driven half again, twice the sparks off
   * the edge, the knee dipping under it, and the word gone off the screen
   * before you have finished reading it. Short and violent beats long and
   * heavy for anything you are meant to do four times in an exchange. */
  guardShockV += 7.4 * u.kind.reachK; spawnSparks(16, 1.1);
  parryGlow = Math.max(parryGlow, 0.34);
  fovKick = Math.max(fovKick, 6.0);
  addTrauma(0.62);
  vmImpulse(-1.48);
  slamDip = Math.max(slamDip, 0.035);
  hitstop = Math.max(hitstop, 0.085);
  setPrompt('<b>BLOCKED</b>');
  setTimeout(() => { if (promptHTML.includes('BLOCKED')) setPrompt(''); }, 380);
  const kx = camera.position.x - u.g.position.x, kz = camera.position.z - u.g.position.z;
  const kd = Math.hypot(kx, kz) || 1;
  knockback.set((kx / kd) * 4.2 * u.kind.reachK, 0, (kz / kd) * 4.2 * u.kind.reachK);
}
function killMutant(u) {
  if (!u.st.alive || u.st.struck) return;
  u.st.struck = true;
  if (u.st.killP === undefined) { u.st.killP = 0; u.st.killOh = false; u.st.hpBefore = u.st.hp; }   // a throw, or the harness
  u.st.atk = -1; u.st.stun = 0; u.st.recoil = 0; u.st.chainAt = -1;
  mutDrop(u);
  camera.getWorldDirection(u.hitDir); u.hitDir.y = 0; u.hitDir.normalize();
  u.hitFrom.copy(u.g.position);
  flashMats(u.g);
  sfxMutHit(u.kind.voice);
  sfxKillThud();
  addTrauma(0.6);
  hitstop = MUT_HIT_STOP + (equipped === militaryItem ? 0.05 : 0);
}
/* The slam's report: a sub that hits and a crack over it — concrete falling
 * on concrete — sized by the charge. Under whatever the blade found. */
function sfxSlam(P = 0) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut();
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(74, t); o.frequency.exponentialRampToValueAtTime(24, t + 0.36);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.48 + P * 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.44);
  const c = noiseBurst(0.09, (x) => Math.pow(1 - x, 1.6));
  const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.Q.value = 0.8; cf.frequency.value = 900 - P * 300;
  const cg = ctx.createGain(); cg.gain.value = 0.34 + P * 0.16;
  c.connect(cf).connect(cg).connect(out); c.start(t); c.stop(t + 0.09);
}
/* The floor under a kill: a sub thump you feel more than hear, under whatever
 * the blade did. It is the same on every kill and that is the point — it is
 * the one sound in the fight that means "that one is finished". */
/* TWO HUNDRED POUNDS AGAINST STEEL. Not the floor thud — that is meat
 * arriving on something that gives. A wall does not give: a hard low knock
 * with the plate ringing over it and a scatter of grit, panned by where it
 * happened relative to your view, so a body thrown past you and into the
 * console bank is heard over there. */
function sfxBodySlam(P = 1, at = null) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  let out = sfxOut();
  if (at) {
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) {
      camera.getWorldDirection(_rg2);
      const rx = -_rg2.z, rz = _rg2.x;                      // the camera's right, on the floor
      const dx = at.x - camera.position.x, dz = at.z - camera.position.z;
      const L = Math.hypot(dx, dz) || 1;
      pan.pan.value = THREE.MathUtils.clamp((dx * rx + dz * rz) / L, -1, 1);
      pan.connect(out); out = pan;
    }
  }
  const g = ctx.createGain(); g.gain.value = 0.5 + P * 0.5; g.connect(out);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(96, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.20);
  const og = ctx.createGain(); og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
  o.connect(og).connect(g); o.start(t); o.stop(t + 0.28);
  // the plate ringing, and the grit off it
  const len = Math.floor(ctx.sampleRate * 0.42);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.4;
  const n = ctx.createBufferSource(); n.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320 + P * 260; bp.Q.value = 2.2;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(0.30 * (0.5 + P), t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
  n.connect(bp).connect(ng).connect(g); n.start(t);
}
function sfxKillThud(k = 1) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut();
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(64 * (0.82 + k * 0.18), t); o.frequency.exponentialRampToValueAtTime(27, t + 0.32);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.42 * k, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.4);
  /* AND A BODY IS NOT A DRUM. Meat arriving on steel or on sand has a slap
   * over the low end — a short band of noise that dies at once — and it is
   * the half of the sound that says a thing with weight landed rather than
   * something under the floor. Only on the hard ones. */
  if (k > 0.9) {
    const n = ctx.createBufferSource(), len = Math.floor(ctx.sampleRate * 0.13);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    n.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 190; bp.Q.value = 0.9;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.34 * k, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    n.connect(bp).connect(ng).connect(out); n.start(t);
  }
}
/* A blow that lands but does not finish it: it is rocked back off the blade
 * white, the swing it was in the middle of is broken, and it comes again. */
const DEALER_BLOCK = 0.46;
const _dbA = new THREE.Vector3(), _dbB = new THREE.Vector3(), _dbC = new THREE.Vector3(), _dbF = new THREE.Vector3();
/* Is the bar in you. Samples along the crowbar — the grip (the right hand)
 * and points out along the forearm's line to the tip — against your torso,
 * a segment from your hips to your head, and asks for any within a bar's
 * width. Plus the cone: he has to be facing you. */
function dealerBarHit(u) {
  const hand = u.bones && u.bones.hand, fore = u.bones && u.bones.fore;
  _dbF.set(Math.sin(u.g.rotation.y), 0, Math.cos(u.g.rotation.y));
  _dbC.subVectors(camera.position, u.g.position).setY(0);
  const dist = _dbC.length() || 0.001;
  if (_dbC.divideScalar(dist).dot(_dbF) < 0.35) return false;        // behind him or wide of him: no
  if (!hand) return dist < 1.9;
  hand.getWorldPosition(_dbA);
  if (fore) { fore.getWorldPosition(_dbB); _dbB.subVectors(_dbA, _dbB).normalize(); } else _dbB.copy(_dbF);
  const top = camera.position.y + 0.15, bot = camera.position.y - 1.15;
  for (let k = 0; k <= 5; k++) {
    _dbC.copy(_dbA).addScaledVector(_dbB, k * 0.17);                 // grip to tip, 0.85 m of bar
    const y = THREE.MathUtils.clamp(_dbC.y, bot, top);
    const dx = _dbC.x - camera.position.x, dz = _dbC.z - camera.position.z, dy = _dbC.y - y;
    if (dx * dx + dz * dz + dy * dy < 0.70 * 0.70) return true;      // a body is wider than a line
  }
  /* OR: the swing is plainly AT you. An authored clip's bar can pass a
   * hand's width wide of a torso the geometry says it should have crossed,
   * and a boss whose blows whiff on a player standing still in front of him
   * is not a boss. If he is facing you, you are inside the swing's own reach,
   * and his hand is out in front of him toward you — the arm extended, not
   * cocked — the blow lands. Behind him, wide of him, or out of reach it
   * still does not, which is the part that makes the hitbox honest. */
  const A = u.atk[u.st.swing];
  if (A && dist <= A.reach * 0.92) {
    _dbC.subVectors(_dbA, u.g.position).setY(0);                     // the hand, out from his root
    const fwd = _dbC.dot(_dbF);
    if (fwd > 0.38) return true;
  }
  return false;
}
/* Steel on steel: your light swing met the bar. Nothing happens to him and
 * something happens to you — the tool jars, a beat of freeze, the guard
 * spring rings — and he holds the block a moment before he comes on. */
function dealerBlock(u) {
  u.st.block = DEALER_BLOCK;
  /* AND THE BLOCK IS HIS TURN. Steel stopped your swing, which means your
   * swing is somewhere it cannot come back from — he comes off the block
   * into a strike rather than standing there. It is the exchange the whole
   * fight is meant to be made of. */
  u.st.cool = 0.10;
  mutToken = u;
  if (u.weapon) flashMats(u.weapon);
  playSample('blockMil', 0.9, 0.04) || sfxBlock();
  guardShockV += 6.0; spawnSparks(14, 1.05);
  vmImpulse(-1.42);
  addTrauma(0.34);
  fovKick = Math.max(fovKick, 5.0);
  hitstop = Math.max(hitstop, 0.075);
}
function hurtMutant(u, dmg, P = 0) {
  if (!u.st.alive || u.st.struck) return false;
  let poiseBroke = false;
  if (u.kind.human && u.st.stun <= 0) {
    const light = P < MUT_HEAVY && dmg < 2 && !digOverhead;
    _dbF.set(Math.sin(u.g.rotation.y), 0, Math.cos(u.g.rotation.y));
    _dbC.subVectors(camera.position, u.g.position).setY(0).normalize();
    const facing = _dbC.dot(_dbF) > 0.45;
    const ready = u.st.atk < 0 && u.st.recoil <= 0 && u.st.block <= 0;
    if (light && facing && ready && Math.random() < (u.kind.block || 0)) { dealerBlock(u); return false; }
    /* POISE IS A POOL, AND IT REFILLS. It used to be a COUNT of light
     * swings — three and he rocked — and a charge skipped it outright and
     * rocked him every single time. So the answer to a boss was to hold the
     * button: every heavy was a free stagger and every third click was
     * another, and a man you can rock at will is a man you are not fighting.
     * Now every blow SPENDS from one pool, a heavy spending three times what
     * a click does, and what is left grows back (`poiseBack`) once you have
     * left him alone for a moment (`poiseWait`). Eight points is three
     * charges landed in a row, or eight clicks, or a mix — pressure kept up,
     * not one lucky swing. Trading blows breaks him; poking at him does not.
     * THE PARRY IS THE EXCEPTION AND ALWAYS WAS: a stunned man is past this
     * whole branch, so reading the tell is the one thing that opens him up
     * on demand, which is exactly what a parry should be worth. */
    u.st.poiseT = 0;
    u.st.poise = (u.st.poise ?? u.kind.poise) - (light ? 1 : 3);
    if (u.st.poise > 0) {
      u.st.hp -= dmg;
      if (u.st.hp <= 0) { u.st.killP = P; u.st.killOh = digOverhead; u.st.hpBefore = u.st.hp + dmg; killMutant(u); return true; }
      /* AND A BLOW THAT DRAWS BLOOD SHOULD LOOK LIKE ONE. Six drops and a
       * short spray were lost inside `bossHit`'s shower of sparks — the
       * owner saw sparks and nothing else and read the hit as steel on
       * steel. Sparks are for the BAR (a block, a parry); flesh gets four
       * times the blood, thrown from the height the blade landed and along
       * the swing, and a stain under him where it falls. */
      flashMats(u.g); sfxMutHit(u.kind.voice);
      bleedMutant(u, 22 + Math.round(P * 14), 0.55 + P * 0.35);
      bossHit(P, light ? false : true, true);
      camera.getWorldDirection(_hitC);
      const _by = u.g.position.y + u.kind.h * (0.45 + Math.random() * 0.3);
      sprayBlood(u.g.position.x, _by, u.g.position.z, _hitC.x, _hitC.z, 24 + Math.round(P * 16), 1.1 + P * 0.6);
      stampBlood(u.g.position.x + _hitC.x * 0.45, u.g.position.z + _hitC.z * 0.45, 0.34 + Math.random() * 0.3);
      return false;
    }
    u.st.poise = u.kind.poise;
    poiseBroke = true;
    bossHit(P, true);                      // the one that finally moves him
  }
  /* THE RIPOSTE. A blow landed on one you have just parried counts DOUBLE.
   * The parry was already an opening; this makes it the point of the fight —
   * read the tell, take the stun, wind all the way up, and take half of a
   * seven-health creature off in one swing. Without it a parry only bought
   * you time, and time is not a reward. */
  const riposte = u.st.stun > 0;
  if (riposte) {
    dmg *= 2;
    setPrompt('<b>RIPOSTE</b>');
    setTimeout(() => { if (promptHTML.includes('RIPOSTE')) setPrompt(''); }, 700);
    addTrauma(0.3); fovKick = Math.max(fovKick, 5);
  }
  const before = u.st.hp;
  u.st.hp -= dmg;
  if (u.st.hp <= 0) {
    // what the finishing blow was, for the fall and for what comes off
    u.st.killP = P; u.st.killOh = digOverhead; u.st.hpBefore = before;
    killMutant(u); return true;
  }
  /* POISE. A light swing into the last part of a committed startup takes
   * its point of health and does NOT stop the blow: it flashes, it bleeds,
   * and the hand comes down anyway. Trading with it is a choice, and the
   * choice has a cost. A charged swing, a parry and a throw all still
   * break it — only the plain click is shrugged off, and only late. */
  const A = swingOf(u);
  const committed = u.st.atk >= 0 && u.st.atk > A.wind * 0.55 && u.st.atk < A.wind + A.strike;
  if (!poiseBroke && committed && P < MUT_HEAVY && dmg < 2) {
    flashMats(u.g); sfxMutHit(u.kind.voice); bleedMutant(u, 5, 0.3); addTrauma(0.22);
    camera.getWorldDirection(_hitC); sprayBlood(u.g.position.x, u.g.position.y + u.kind.h * 0.55, u.g.position.z, _hitC.x, _hitC.z, 8, 0.8);
    return false;
  }
  u.st.atk = -1; u.st.chainAt = -1; u.st.chained = false; u.st.chainN = 0;
  u.st.stun = 0;
  u.st.side = 0; u.st.back = 0;
  mutDrop(u);
  u.st.cool = Math.max(u.st.cool, 0.45);
  u.st.recoil = MUT_RECOIL * (u.kind.recoilK || 1);
  camera.getWorldDirection(u.hitDir); u.hitDir.y = 0; u.hitDir.normalize();
  u.hitFrom.copy(u.g.position);
  flashMats(u.g);
  sfxMutHit(u.kind.voice);
  bleedMutant(u, 8, 0.35);
  sprayBlood(u.g.position.x, u.g.position.y + u.kind.h * 0.55, u.g.position.z, u.hitDir.x, u.hitDir.z, 12 + Math.round(P * 10), 0.9 + P * 0.6);
  stampBlood(u.g.position.x + u.hitDir.x * 0.5, u.g.position.z + u.hitDir.z * 0.5, 0.45 + Math.random() * 0.35);
  addTrauma(0.3 + P * 0.2);
  return false;
}
/* IT DOES NOT COME APART. A crab is shell and the shovel takes it to pieces;
 * this is a body, and a body goes down and stays down — the `die` clip runs
 * out and it lies on the sand for the rest of the walk. */
function finishMutant(u) {
  u.st.alive = false;
  u.st.struck = false;
  u.st.deadT = 0;
  mutDrop(u);
  /* A MAN DOES NOT COME APART. Everything below takes a limb, bursts a head
   * or throws the body into a Verlet ragdoll, and all of it is written to
   * the mutant's own bone names besides. He falls on his own animation and
   * he stays there — which is also the only ending a boss should get: you
   * want to walk up to what you killed, not sweep up after it. */
  if (u.kind.human) {
    /* HE COMES APART TOO, NOW. The rule was that a man goes down whole and
     * you walk up to what you killed — but the beach spent a kilometre
     * teaching that a heavy takes something with it, and the boss being the
     * one thing in the game exempt from its own grammar read as a different,
     * softer game. It is the mutant's machinery unchanged, and it works on
     * him because every part of it goes through `boneAlias`: the same
     * chance, the same overkill rule, the same bake of the limb itself.
     * The crowbar comes out of a hand that may be about to leave. */
    if (u.weapon) u.weapon.visible = true;
    sfxKillThud();
    const hx = u.hitDir.x, hz = u.hitDir.z;
    const hP = u.st.killP || 0, hOh = !!u.st.killOh;
    /* RARER ON HIM THAN ON THE PACK. A creature you meet three of at once
     * can come apart half the time and still read as a thing that happened;
     * the one man in the game, killed once, cannot — a head that bursts most
     * times you finish him is a gore setting, which is the line the beach
     * already drew. Measured at the first rates: thirteen of fourteen took
     * something and eleven were the head. */
    const over = u.st.hpBefore <= 1 && (hP >= MUT_HEAVY || hOh);
    let burst = false;
    if (over && Math.random() < 0.28) burst = burstHead(u, hx, hz);
    if (!burst && Math.random() < (hP >= MUT_HEAVY || hOh ? 0.30 : 0.12)) {
      const pick = MUT_LIMBS[Math.floor(Math.random() * MUT_LIMBS.length)];
      mutSever(u, pick, hx, hz, 1.0);
    }
    mutRagdoll(u, hx, hz, 0.6 + hP * 0.6);
    bleedMutant(u, 26, 1.0);
    sprayBlood(u.g.position.x, u.g.position.y + u.kind.h * 0.5, u.g.position.z, hx, hz, 26 + Math.round(hP * 14), 1.3 + hP * 0.5);
    stampBlood(u.g.position.x, u.g.position.z, 1.3 + Math.random() * 0.5);
    return;
  }
  /* WHAT THE LAST BLOW TOOK WITH IT. A charged cut can go through the waist;
   * anything else takes a limb about half the time, and sometimes nothing at
   * all — because a kill that ALWAYS dismembers is a gore setting, and a kill
   * that sometimes does is a thing that happened. */
  const dx = u.hitDir.x, dz = u.hitDir.z;
  const P = u.st.killP || 0, oh = !!u.st.killOh;
  /* OVERKILL. A heavy — a charged cut or the overhead — landing on a
   * creature with one point left is far more blow than there was creature,
   * and about half the time the head goes. Only then: a head that bursts on
   * every heavy is a gore setting; one that bursts when you brought a slam
   * down on something already finished is a thing that happened. */
  const overkill = u.st.hpBefore <= 1 && (P >= MUT_HEAVY || oh);
  let burst = false;
  if (overkill && Math.random() < 0.55) burst = burstHead(u, dx, dz);
  if (!burst) {
    if (P >= MUT_HEAVY && !oh && Math.random() < 0.42) mutSever(u, MUT_BISECT, dx, dz, 1.4);
    else if (Math.random() < 0.55) {
      const pick = MUT_LIMBS[Math.floor(Math.random() * MUT_LIMBS.length)];
      mutSever(u, pick, dx, dz, 1.0);
    }
  }
  // the overhead throws it further — a little, so the hit reads harder, not so far it flies
  mutRagdoll(u, dx, dz, 0.7 + P * 0.7 + (oh ? 0.55 : 0));
  bleedMutant(u, 26, 1.0);
  sprayBlood(u.g.position.x, u.g.position.y + u.kind.h * 0.5, u.g.position.z, dx, dz, 26 + Math.round(P * 14), 1.3 + P * 0.5);
  stampBlood(u.g.position.x, u.g.position.z, 1.3 + Math.random() * 0.5);
  sfxMutDie(u.kind.voice);
  addTrauma(0.5);
  /* AND THE OTHERS LAUGH. You kill one of them and the ones still standing
   * find it funny — which is the single cheapest thing in this whole fight
   * and the one that most makes them a pack rather than three enemies. */
  for (const o of mutants) {
    if (o === u || !o.st.alive) continue;
    const d = Math.hypot(camera.position.x - o.g.position.x, camera.position.z - o.g.position.z);
    setTimeout(() => { if (o.st.alive) sfxMutLaugh(d, o.kind.voice); }, 260 + Math.random() * 420);
  }
}
/* BLOOD GOES WHERE THE BLADE WENT. `bleedMutant` is a radial burst from the
 * chest; this is the spray a cut throws — most of it along the swing, a
 * little to the sides, and from the height the blade landed at. */
function sprayBlood(x, y, z, dirX, dirZ, n, force) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.028 * (0.5 + Math.random()), 0), BLOOD_MAT);
    m.position.set(x + (Math.random() - 0.5) * 0.2, y + (Math.random() - 0.5) * 0.25, z + (Math.random() - 0.5) * 0.2);
    scene.add(m);
    const a = Math.random() * Math.PI * 2, side = (0.4 + Math.random() * 1.4) * force, along = (1.6 + Math.random() * 2.6) * force;
    bloodDrops.push({ m, vel: new THREE.Vector3(dirX * along + Math.cos(a) * side, 0.8 + Math.random() * 2.2 * force, dirZ * along + Math.sin(a) * side), life: 4 });
  }
}
function bleedMutant(u, n, force) {
  const p = u.g.position;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.030 * (0.5 + Math.random()), 0), BLOOD_MAT);
    m.position.set(p.x + (Math.random() - 0.5) * 0.35, 0.85 + Math.random() * 0.7, p.z + (Math.random() - 0.5) * 0.35);
    scene.add(m);
    const a = Math.random() * Math.PI * 2, out = (0.9 + Math.random() * 2.2) * force;
    bloodDrops.push({
      m,
      vel: new THREE.Vector3(Math.cos(a) * out, 1.4 + Math.random() * 2.6 * force, Math.sin(a) * out),
      life: 4,
    });
  }
}

/* Their voices. None of it is a stinger — the same rule the tall one taught:
 * a musical shriek tells you the game is scaring you. This is breath, throat
 * and weight. Every one of these takes the kind's voice — a pitch and two
 * weights — so the big one is a half-octave under the pale one and the small
 * one is a fifth over it, and you can tell from across the sand which of the
 * three is winding up behind you. The TELL is the one that has to carry: it
 * runs for exactly this swing's startup, so the sound is the countdown to
 * the frame you have to answer. */
function sfxMutTell(dist = 0, W = MUT_WIND, V = MUT_VOICE) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut(), g0 = 1 / (1 + dist / 12);
  const rise = Math.min(W, 0.62);
  const rasp = noiseBurst(W, (x) => (0.4 + 0.6 * Math.random()) * Math.min(1, x * (W / rise) * 2.5) * (1 - x * 0.2));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.4;
  bp.frequency.setValueAtTime(230 * V.f, t);
  bp.frequency.exponentialRampToValueAtTime(880 * V.f, t + rise);
  const rg = ctx.createGain();
  rg.gain.setValueAtTime(0.0001, t);
  rg.gain.exponentialRampToValueAtTime(0.16 * g0 * V.rasp, t + rise * 0.85);
  rg.gain.setValueAtTime(0.16 * g0 * V.rasp, t + Math.max(rise * 0.85, W - 0.08));
  rg.gain.exponentialRampToValueAtTime(0.02 * g0, t + W);
  rasp.connect(bp).connect(rg).connect(out);
  rasp.start(t); rasp.stop(t + W);
  // the throat under it, hauling up — and it is THIS one's throat
  mutTone(t, W + 0.06, V, 41, 104, 0.11 * g0, out);
}
function sfxMutSwing(V = MUT_VOICE) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const w = noiseBurst(0.26, (x) => Math.sin(Math.min(1, x * 1.6) * Math.PI) * (1 - x * 0.3));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(1500 * V.f, t);
  bp.frequency.exponentialRampToValueAtTime(240 * V.f, t + 0.24);
  const g = ctx.createGain(); g.gain.value = 0.3;
  w.connect(bp).connect(g).connect(sfxOut());
  w.start(t); w.stop(t + 0.26);
}
function sfxMutRoar(dist = 0, V = MUT_VOICE) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut(), g0 = 1.1 / (1 + dist / 16), D = 1.5;
  for (const [f0, f1, gn] of [[58, 96, 0.16], [87, 143, 0.09], [29, 47, 0.13]])
    mutTone(t, D, V, f0, f1, gn * g0, out);
  // the tear of it, over the top
  const r = noiseBurst(D, (x) => (0.3 + 0.7 * Math.random()) * Math.sin(Math.min(1, x * 1.3) * Math.PI));
  const rf = ctx.createBiquadFilter(); rf.type = 'bandpass'; rf.Q.value = 1.6; rf.frequency.value = 620 * V.f;
  const rg = ctx.createGain(); rg.gain.value = 0.085 * g0 * V.rasp;
  r.connect(rf).connect(rg).connect(out); r.start(t); r.stop(t + D);
}
function sfxMutStep(dist = 0, V = MUT_VOICE) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut(), g0 = 0.85 / (1 + dist / 8);
  // a boot on a steel floor, not a wet foot on sand: the room is the reason
  // you can hear him coming without turning round
  if (V.human) {
    const h = noiseBurst(0.05, (x) => Math.pow(1 - x, 4));
    const hf = ctx.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 1250 + Math.random() * 700; hf.Q.value = 1.3;
    const hg = ctx.createGain(); hg.gain.value = g0 * 0.5;
    h.connect(hf).connect(hg).connect(out); h.start(t); h.stop(t + 0.05);
    const f0 = 240 + Math.random() * 70;
    for (const [mlt, gg, dd] of [[1, 0.30, 0.16], [2.6, 0.09, 0.11]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * mlt;
      const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(g0 * gg, t + 0.005); og.gain.exponentialRampToValueAtTime(0.0001, t + dd);
      o.connect(og).connect(out); o.start(t); o.stop(t + dd + 0.02);
    }
    return;
  }
  const n = noiseBurst(0.14, (x) => Math.pow(1 - x, 2.6));
  const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = (430 + Math.random() * 140) * V.f;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(g0 * 0.9, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  n.connect(nf).connect(ng).connect(out); n.start(t); n.stop(t + 0.15);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(66 * V.f, t); o.frequency.exponentialRampToValueAtTime(31 * V.f, t + 0.11);
  const og = ctx.createGain(); og.gain.setValueAtTime(g0 * 0.9 * V.growl, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(og).connect(out); o.start(t); o.stop(t + 0.18);
}
function sfxMutHit(V = MUT_VOICE) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut();
  playSample('fleshHit', 0.75, 0.06, 0.72 * V.f);   // the owner's own, pitched to the voice
  const body = noiseBurst(0.17, (x) => Math.pow(1 - x, 1.8));
  const bf = ctx.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 260 * V.f;
  const bg = ctx.createGain(); bg.gain.value = 0.42;
  body.connect(bf).connect(bg).connect(out); body.start(t); body.stop(t + 0.17);
}
function sfxMutDie(V = MUT_VOICE) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut(), D = 1.9;
  // it goes out of it: the throat drops away and the breath runs out wet
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(78 * V.f, t);
  o.frequency.exponentialRampToValueAtTime(23 * V.f, t + D);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(700 * V.f, t); lp.frequency.exponentialRampToValueAtTime(180 * V.f, t + D);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.14 * V.growl, t + 0.09);
  g.gain.exponentialRampToValueAtTime(0.0001, t + D);
  o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + D + 0.05);
  const wet = noiseBurst(D * 0.8, (x) => (0.2 + 0.8 * Math.random()) * Math.pow(1 - x, 1.4));
  const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.Q.value = 1.2;
  wf.frequency.setValueAtTime(520 * V.f, t); wf.frequency.exponentialRampToValueAtTime(160 * V.f, t + D * 0.8);
  const wg = ctx.createGain(); wg.gain.value = 0.075 * V.rasp;
  wet.connect(wf).connect(wg).connect(out); wet.start(t); wet.stop(t + D * 0.8);
}
/* WHAT IT SOUNDS LIKE TO BE HUNGRY. Three creatures that only ever growl are
 * one creature growling three times, so each throat is a different INSTRUMENT
 * and not the same one transposed:
 *   bellow  (the red one) a sawtooth stack with a slow swell and a sub under
 *           it — a thing too big to hurry, and it arrives before it does
 *   chitter (the dark one) a fast tremolo on a square through a high formant,
 *           clicking: teeth and appetite, not lungs
 *   wet     (the pale one) the original rasp, breath through a broken face
 * Every voiced sound picks its shape off `V.throat`, so a tell, a laugh and a
 * hunger call from the same creature are all recognisably it. */
function mutTone(t, D, V, f0, f1, gain, out) {
  const ctx = audioCtx;
  const th = V.throat || 'wet';
  /* THE MASK IS THE VOICE. Everything he says comes through a filter drum
   * and a rubber face: a narrow band with the top gone, so it is a man in
   * there and you can hear that it is a man, and you can hear that you
   * cannot see his face. */
  if (th === 'mask') {
    const n = noiseBurst(D, (x) => Math.sin(Math.PI * Math.min(1, x * 1.1)) * (0.7 + 0.3 * Math.sin(x * 30)));
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.4;
    bp.frequency.setValueAtTime(f0 * 2.2 * V.f, t);
    bp.frequency.exponentialRampToValueAtTime(f1 * 2.4 * V.f, t + D * 0.7);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * V.growl * 0.9, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + D);
    n.connect(bp).connect(lp).connect(g).connect(out); n.start(t); n.stop(t + D);
    const o2 = ctx.createOscillator(); o2.type = 'triangle';
    o2.frequency.setValueAtTime(f0 * 0.55 * V.f, t);
    o2.frequency.exponentialRampToValueAtTime(f1 * 0.55 * V.f, t + D * 0.8);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(gain * 0.5, t + 0.04);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + D);
    o2.connect(g2).connect(out); o2.start(t); o2.stop(t + D + 0.02);
    return;
  }
  const o = ctx.createOscillator();
  o.type = th === 'bellow' ? 'sawtooth' : th === 'chitter' ? 'square' : 'sawtooth';
  o.frequency.setValueAtTime(f0 * V.f, t);
  o.frequency.exponentialRampToValueAtTime(f1 * V.f, t + D * 0.8);
  const lp = ctx.createBiquadFilter();
  lp.type = th === 'chitter' ? 'bandpass' : 'lowpass';
  lp.frequency.setValueAtTime((th === 'chitter' ? 1500 : 340) * V.f, t);
  lp.frequency.exponentialRampToValueAtTime((th === 'chitter' ? 3200 : 700) * V.f, t + D * 0.5);
  if (th === 'chitter') lp.Q.value = 3.2;
  const g = ctx.createGain();
  const atk = th === 'bellow' ? D * 0.34 : 0.02;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * V.growl, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + D);
  o.connect(lp).connect(g).connect(out);
  // the chitter is BITTEN: a fast tremolo, so it reads as teeth and not a note
  if (th === 'chitter') {
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 26 + Math.random() * 14;
    const lg = ctx.createGain(); lg.gain.value = gain * 0.55;
    lfo.connect(lg).connect(g.gain); lfo.start(t); lfo.stop(t + D);
  }
  // and the bellow has a sub under it you feel before you hear
  if (th === 'bellow') {
    const sub = ctx.createOscillator(); sub.type = 'sine';
    sub.frequency.setValueAtTime(f0 * V.f * 0.5, t);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.exponentialRampToValueAtTime(gain * 0.9, t + atk);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + D * 1.1);
    sub.connect(sg).connect(out); sub.start(t); sub.stop(t + D * 1.15);
  }
  o.start(t); o.stop(t + D + 0.05);
}
/* THE LAUGH. Not a joke — a thing enjoying this. Five or six bursts on a
 * falling contour, each one shorter than the last, wet at the end. It comes
 * when one of them lands a blow on you and when one of them DIES, which is
 * the worst of the two: you kill one and the others find it funny. */
function sfxMutLaugh(dist = 0, V = MUT_VOICE) {
  const ctx = audioCtx; if (!ctx) return;
  const t0 = ctx.currentTime, out = sfxOut(), g0 = 1.0 / (1 + dist / 14);
  const n = 5 + Math.floor(Math.random() * 3);
  let t = t0;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const D = 0.13 - k * 0.05 + Math.random() * 0.03;
    const f = (150 - k * 55) * (0.9 + Math.random() * 0.2);
    mutTone(t, D, V, f, f * 0.72, 0.11 * g0 * (1 - k * 0.3), out);
    // the breath behind each one
    const h = noiseBurst(D, (x) => Math.pow(1 - x, 1.6) * (0.3 + 0.7 * Math.random()));
    const hf = ctx.createBiquadFilter(); hf.type = 'bandpass'; hf.Q.value = 1.6;
    hf.frequency.value = (620 - k * 160) * V.f;
    const hg = ctx.createGain(); hg.gain.value = 0.055 * g0 * V.rasp;
    h.connect(hf).connect(hg).connect(out); h.start(t); h.stop(t + D);
    t += D + 0.055 - k * 0.02 + Math.random() * 0.02;
  }
}
/* And what it does between swings: breathing, and swallowing, and a click at
 * the back of the throat. Quiet, close, and constant enough that you always
 * know one of them is behind you. */
function sfxMutHunger(dist = 0, V = MUT_VOICE) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut(), g0 = 0.9 / (1 + dist / 9);
  const D = 0.5 + Math.random() * 0.5;
  const br = noiseBurst(D, (x) => Math.sin(x * Math.PI) * (0.4 + 0.6 * Math.random()));
  const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.Q.value = 1.1;
  bf.frequency.setValueAtTime(300 * V.f, t);
  bf.frequency.exponentialRampToValueAtTime(720 * V.f, t + D * 0.6);
  bf.frequency.exponentialRampToValueAtTime(240 * V.f, t + D);
  const bg = ctx.createGain(); bg.gain.value = 0.075 * g0 * V.rasp;
  br.connect(bf).connect(bg).connect(out); br.start(t); br.stop(t + D);
  mutTone(t + D * 0.25, D * 0.5, V, 62, 44, 0.035 * g0, out);
}

/* The three of them at once, under the cutscene: a sub that swells for the
 * whole of it and does not resolve. It is not a sting — it is the floor of
 * the sound going out from under you while three things you have not met
 * come across the sand. */
function sfxMutHorde(D = 4.4) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut();
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(23, t);
  o.frequency.exponentialRampToValueAtTime(41, t + D * 0.85);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.24, t + D * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + D + 0.5);
  o.connect(g).connect(out); o.start(t); o.stop(t + D + 0.6);
  // and the air moving over it, rising with them
  const air = noiseBurst(D, (x) => (0.2 + 0.8 * Math.random()) * Math.pow(x, 1.6));
  const af = ctx.createBiquadFilter(); af.type = 'lowpass';
  af.frequency.setValueAtTime(120, t);
  af.frequency.exponentialRampToValueAtTime(900, t + D);
  const ag = ctx.createGain(); ag.gain.value = 0.07;
  air.connect(af).connect(ag).connect(out); air.start(t); air.stop(t + D);
}

/* ---- the cutscene ----------------------------------------------------
 * The three of them are the only thing on this stretch of beach and you
 * should not meet them one at a time by walking into a wake radius. The
 * trigger is the player's Z ALONE — the pack's rule, so it does not care
 * whether you are on the waterline or at the foot of the cliff — and what
 * it starts is not a pose: they roar where they stand, and then all three
 * come at you flat out, and the camera stays on them the whole way in.
 *
 * THE CAMERA IS TURNED, NEVER MOVED. Every clamp below still agrees with
 * where you are standing, and when it lets go you are exactly there. The
 * zoom is the drama: the field of view is thrown WIDE for a beat — the
 * flinch — and then hauled in tight over three quarters of a second, so
 * they are running at a lens that is closing on them, and by the time it
 * ends they fill the frame. It ends by DROPPING the take while they are
 * still running, not by parking them: `mutCut` goes false, `updateDialogCam`
 * eases the field of view back on its own, and the frame you get your head
 * back on is the frame they are ten metres out and still coming. */
const MUT_TRIGGER = 30;              // how far short of them it starts
const MUT_CUT_END = 9.0;             // and how close they get before you get your head back
const MUT_CUT_SPRINT = 0.85;         // how much faster they come while the take is running
const MUT_CUT_FOV = 24;
let mutCut = false, mutCutT = 0, mutPhase = 0, mutCutFov = -1, mutCutOut = 0;
const _mutMid = new THREE.Vector3(), _mutM = new THREE.Matrix4(), _mutQ = new THREE.Quaternion();
function updateMutantCut(dt) {
  if (mutPhase === 2 || !introDone || dying || ended) return false;
  if (mutPhase === 0) {
    // you walk down the beach along -Z, so you reach them from above
    if (camera.position.z > MUT_Z + MUT_TRIGGER) return false;
    if (settings.devMode) { mutPhase = 2; return false; }   // DEV MODE: no cutscene
    mutPhase = 1; mutCutT = 0; mutCut = true;
    mutCutFov = settings.fov;
    if (held) dropHeld();
    hovered = null; setPrompt('');
    for (const u of mutants) { if (u.kind.solo) continue; u.st.awake = true; u.st.roar = 1.2; u.st.step = 0; }
    sfxMutHorde();
    return true;
  }
  mutCutT += dt;
  let near = Infinity;
  for (let i = 0; i < mutants.length; i++) {
    const u = mutants[i];
    const p = u.g.position;
    const dx = camera.position.x - p.x, dz = camera.position.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    near = Math.min(near, d);
    u.g.rotation.y = Math.atan2(dx / d, dz / d);            // its front is +Z
    // a beat of the roar first, staggered, and then it comes
    const go = mutCutT - (0.22 + i * 0.11);
    u.st.roar = Math.max(0, -go);
    if (go > 0 && d > 2.6) {
      // FLAT OUT. They cross thirty metres in three seconds, and they keep
      // most of it when the take is dropped (`st.sprint`, which decays).
      const sp = MUT_SPEED * u.kind.speedK * (1 + MUT_CUT_SPRINT) * Math.min(1, go * 5);
      p.x += (dx / d) * sp * dt;
      p.z += (dz / d) * sp * dt;
      p.x = THREE.MathUtils.clamp(p.x, WADE_X - 1.5, CLIFF_BLOCK_X + 0.5);
      u.st.step -= dt;
      if (u.st.step <= 0) {
        u.st.step = u.kind.step * 0.72;
        sfxMutStep(d, u.kind.voice);
        if (inWater(p.x, p.z)) { spawnSplash(p.x, p.z, 2, dx / d, dz / d, 0.5); addRipple(p.x, p.z, 0.7); }
      }
    }
    if (Math.abs(go) < 0.02) sfxMutRoar(d, u.kind.voice);
    mutAnim(u, dt, go > 0 ? 1 : 0);
    mutSeparate(u, dt);
  }
  // the camera goes with them, and the lens closes
  _mutMid.set(0, 0, 0);
  let nMid = 0;
  for (const u of mutants) { if (u.kind.solo) continue; _mutMid.add(u.g.position); nMid++; }
  /* AND THE AVERAGE IS OVER WHAT WAS ACTUALLY SUMMED. The Dealer is a
   * `mutants` entry like the other three and is skipped here, correctly —
   * but the divide was by the length of the whole list, so the midpoint of
   * three creatures six hundred metres down the beach was pulled a quarter
   * of the way back toward the world origin and the take looked at open
   * sand. It has always been wrong; a checkpoint load is simply the only
   * way anybody reaches this stretch often enough to see it. */
  _mutMid.multiplyScalar(1 / Math.max(1, nMid));
  _mutMid.y = 1.25;
  _mutM.lookAt(camera.position, _mutMid, camera.up);
  _mutQ.setFromRotationMatrix(_mutM);
  camera.quaternion.slerp(_mutQ, Math.min(1, dt * (mutCutT < 0.45 ? 13 : 5)));
  /* IN FAST, THEN OPEN AS THEY ARRIVE. The first pass threw the lens wide
   * for a beat before punching in, and at 118 degrees three creatures thirty
   * metres off are specks — half a second of nothing at the front of a
   * five-second shot. It goes straight in instead, tight by the time the
   * first of them roars, and then opens back up over the last nine metres so
   * that they burst the frame AND so the field of view is nearly home when
   * the take is dropped: what would otherwise be a visible zoom-out over the
   * opening of the fight. */
  const ez = (x) => x * x * (3 - 2 * x);
  const z = THREE.MathUtils.clamp((mutCutT - 0.03) / 0.38, 0, 1);
  const tight = THREE.MathUtils.lerp(settings.fov, MUT_CUT_FOV, ez(z));
  /* IT STAYS TIGHT. Opening the lens as they closed made them SHRINK — the
   * field of view widened faster than the distance fell, which is the
   * opposite of the shot. It holds at 24 until they are inside fifteen
   * metres and only then gives a little back, so the last two seconds are
   * three things growing to fill the frame. The rest of the way home is
   * `mutCutOut`, after the take is dropped: four tenths of a second of the
   * world rushing back while you already have your hands. */
  const open = ez(THREE.MathUtils.clamp((15 - near) / 4.5, 0, 1)) * 0.22;
  mutCutFov = THREE.MathUtils.lerp(tight, settings.fov, open);
  addTrauma(dt * (0.6 + Math.pow(1 - THREE.MathUtils.clamp(near / 30, 0, 1), 2) * 4.0));
  if (near < MUT_CUT_END || mutCutT > 9) {
    /* Dropped mid-stride. They keep the run they are in, the token is free,
     * and the first swing goes to whichever of them reaches you first. */
    mutPhase = 2; mutCut = false; mutCutOut = 0.4;
    catchBreath();
    for (const u of mutants) { if (u.kind.solo) continue; u.st.roar = 0; u.st.cool = 0.05 + Math.random() * 0.15; u.st.sprint = MUT_CUT_SPRINT; }
  }
  return true;
}

/* They do not stand in one another. Without this the three of them converge
 * on the same point in front of you and become one silhouette with six arms;
 * a light push off each other keeps them a body apart and — because it runs
 * while they circle as well — is most of what makes them read as three
 * things surrounding you rather than a crowd. */
function mutSeparate(u, dt) {
  for (const o of mutants) {
    if (o === u || !o.st.alive) continue;
    const dx = u.g.position.x - o.g.position.x, dz = u.g.position.z - o.g.position.z;
    const d = Math.hypot(dx, dz);
    if (d > MUT_SEP || d < 1e-4) continue;
    const push = (MUT_SEP - d) * dt * 5.0;
    u.g.position.x += (dx / d) * push;
    u.g.position.z += (dz / d) * push;
  }
}

/* ---- THE ONE AT THE BACK THROWS SAND -------------------------------
 * You could always leave. Three creatures that only hurt you inside two and a
 * half metres are three creatures you walk away from, and walking away from a
 * fight is the least interesting thing this beach can offer. So whichever of
 * them is furthest back and has nothing else to do scoops up a handful and
 * throws it, and it costs you WIND rather than health: the bar you block and
 * sprint on. Backing off to breathe is exactly what it takes away, so the
 * pressure to close is real without a ranged attack that can kill you.
 *
 * It leads its throw, and it misses if you move. That is the whole fairness
 * of it — it is a reason to stop retreating, not a punishment for having. */
const MUT_SAND_FAR = 8.5;          // beyond this, somebody starts throwing
const MUT_SAND_COOL = 2.6;
const MUT_SAND_SPEED = 15;
const mutSand = [];
let mutNearest = 999;
const _sandV = new THREE.Vector3();
function throwSand(u, dist) {
  u.st.sand = MUT_SAND_COOL * (0.75 + Math.random() * 0.6);
  u.st.threw = 0.55;                                   // how long the motion runs
  // lead it: where you will be if you keep doing what you are doing
  const lead = Math.min(0.55, dist / MUT_SAND_SPEED);
  const tx = camera.position.x + velocity.x * lead;
  const tz = camera.position.z + velocity.z * lead;
  const from = new THREE.Vector3(u.g.position.x, u.kind.h * 0.72, u.g.position.z);
  const dx = tx - from.x, dz = tz - from.z;
  const d = Math.hypot(dx, dz) || 1;
  const flight = d / MUT_SAND_SPEED;
  mutSand.push({
    pos: from,
    vel: new THREE.Vector3(dx / flight, 0.5 * 9.8 * flight + (playerEye() - from.y) / flight, dz / flight),
    t: 0, life: flight + 0.4, voice: u.kind.voice,
  });
  sfxMutSandThrow(dist, u.kind.voice);
}
function updateMutSand(dt) {
  for (let i = mutSand.length - 1; i >= 0; i--) {
    const c = mutSand[i];
    c.t += dt;
    c.vel.y -= 9.8 * dt;
    c.pos.addScaledVector(c.vel, dt);
    // it is a handful of beach, so it comes apart on the way
    if (Math.random() < dt * 40) spawnPuffs(c.pos.x, c.pos.z, 1, c.vel.x * 0.1, c.vel.z * 0.1, c.pos.y, [0.42, 0.44, 0.50]);
    _sandV.set(camera.position.x - c.pos.x, (camera.position.y - 0.2) - c.pos.y, camera.position.z - c.pos.z);
    if (_sandV.length() < 0.85) {
      /* In your eyes. It takes the bar, shakes the frame and shoves you, and
       * it does not take health: a ranged attack that can kill you turns a
       * fight into a race, and this is here to stop you leaving, not to end
       * you from across the sand. */
      stamina = Math.max(0, stamina - 0.42);
      if (stamina <= 0.001) { exhausted = true; if (!blockGasped) gaspOut(); }
      addTrauma(0.75);
      fovKick = Math.max(fovKick, 5);
      hurtFlash = Math.max(hurtFlash, 0.35);
      spawnPuffs(camera.position.x, camera.position.z, 10, 0, 0, camera.position.y - 0.25, [0.46, 0.47, 0.52]);
      sfxMutSandHit();
      const kx = camera.position.x - c.pos.x, kz = camera.position.z - c.pos.z;
      const kd = Math.hypot(kx, kz) || 1;
      knockback.set((kx / kd) * 2.4, 0, (kz / kd) * 2.4);
      setPrompt('<b>SAND</b>');
      setTimeout(() => { if (promptHTML.includes('SAND')) setPrompt(''); }, 620);
      mutSand.splice(i, 1); continue;
    }
    if (c.t > c.life || c.pos.y < 0.02) {
      spawnPuffs(c.pos.x, c.pos.z, 5, 0, 0, 0.08, [0.42, 0.44, 0.50]);
      mutSand.splice(i, 1);
    }
  }
}
function sfxMutSandThrow(dist = 0, V = MUT_VOICE) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, g0 = 0.8 / (1 + dist / 10);
  const w = noiseBurst(0.3, (x) => Math.sin(Math.min(1, x * 2.2) * Math.PI) * (1 - x * 0.4));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(700 * V.f, t);
  bp.frequency.exponentialRampToValueAtTime(1800 * V.f, t + 0.28);
  const g = ctx.createGain(); g.gain.value = 0.16 * g0;
  w.connect(bp).connect(g).connect(sfxOut());
  w.start(t); w.stop(t + 0.3);
}
function sfxMutSandHit() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const n = noiseBurst(0.42, (x) => Math.pow(1 - x, 1.5) * (0.4 + 0.6 * Math.random()));
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.34, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
  n.connect(hp).connect(g).connect(sfxOut());
  n.start(t); n.stop(t + 0.42);
}

/* ---- RAGDOLLS, AND WHAT COMES OFF -----------------------------------
 * An authored death clip plays the same way every time, and the third time
 * you see it the creature stops being a body and becomes a cutscene. This is
 * not a physics ragdoll — there are no constraints and no solver — but it is
 * the part of one that reads: the mixer stops dead ON THE POSE IT WAS IN, so
 * the death starts from whatever it was doing when you killed it, and then
 * every bone gets an angular kick and a damped pull toward hanging, while the
 * whole body topples in the direction of the blow and drops onto the sand.
 * No two are the same because no two poses are the same.
 *
 * AND SOMETIMES A PIECE OF IT LEAVES. A skinned mesh cannot be cut, but a
 * bone scaled to nothing takes its whole subtree with it — collapse the arm
 * bone and the arm is gone from the shoulder down, cleanly, along the seam
 * the skinning already defines. Put a piece of flesh in the air on the same
 * frame with blood behind it and the eye reads a limb coming off, which is
 * all it has to do. A charged cut can take the whole thing at the waist. */
/* EVERY BONE LOOKUP GOES THROUGH THE ALIAS. The severing, the head burst
 * and the limb bake were all written for the mutant and name its bones
 * literally — `Character1_LeftForeArm` — and the Dealer's rig answers to
 * `mixamorigLeftForeArm_NN` instead. The ragdoll learned this once and
 * routes everything through `byName`; these three did not, so on him they
 * simply found nothing and returned false, which is why he was the one
 * creature in the game that never lost so much as a hand. */
function ragBone(u, name) { return (u.boneAlias && u.boneAlias[name]) || name; }
const MUT_LIMBS = [
  { bone: 'Character1_Head', name: 'head', y: 0.86, r: 0.16, len: 1.1, w: 1.6 },
  { bone: 'Character1_LeftArm', name: 'arm', y: 0.72, r: 0.11, len: 2.6, w: 1.0 },
  { bone: 'Character1_RightArm', name: 'arm', y: 0.72, r: 0.11, len: 2.6, w: 1.0 },
  { bone: 'Character1_LeftForeArm', name: 'forearm', y: 0.62, r: 0.09, len: 2.2, w: 0.7 },
  { bone: 'Character1_RightForeArm', name: 'forearm', y: 0.62, r: 0.09, len: 2.2, w: 0.7 },
  { bone: 'Character1_LeftLeg', name: 'leg', y: 0.30, r: 0.12, len: 2.4, w: 1.0 },
  { bone: 'Character1_RightLeg', name: 'leg', y: 0.30, r: 0.12, len: 2.4, w: 1.0 },
];
const MUT_BISECT = { bone: 'Character1_Spine1', name: 'torso', y: 0.60, r: 0.20, len: 1.9, w: 2.0 };
const _limbV = new THREE.Vector3();
function mutGibMat(u) {
  return u.gibMat || (u.gibMat = (() => {
    const m = GIB_MAT.clone();
    m.color = new THREE.Color(u.kindName === 'red' ? 0x6a2418 : u.kindName === 'dark' ? 0x3a3428 : 0x8a7f72);
    m.emissive = new THREE.Color(0x140a08);
    m.flatShading = true;              // a torn piece has facets, not a sheen
    m.needsUpdate = true;
    return m;
  })());
}
/* THE HEAD GOES. Not a piece thrown, like a limb: the skull bone collapses
 * and in its place a dozen fragments leave at once — pale bone among the
 * meat — with a burst of blood from where it was rather than from the chest,
 * and the neck is a stump the ragdoll simulates like any other. */
const SKULL_MAT = new THREE.MeshStandardMaterial({ color: 0xb4a894, roughness: 0.85, metalness: 0.0, flatShading: true, emissive: 0x2a2620 });
function burstHead(u, dirX, dirZ) {
  if (!u.model || u.gone['Character1_Head']) return false;
  let head = null;
  const _hn = ragBone(u, 'Character1_Head');
  u.model.traverse((o) => { if (o.isBone && o.name === _hn) head = o; });
  if (!head) return false;
  u.model.updateMatrixWorld(true);
  const hp = head.getWorldPosition(new THREE.Vector3());
  hp.y += 0.09 * (u.kind.h / 2.3);           // the bone sits at the neck end of the skull
  u.gone['Character1_Head'] = 1;
  head.scale.setScalar(0.0001);
  const meat = mutGibMat(u);
  for (let i = 0; i < 14; i++) {
    const bone = i % 3 === 0;
    const r = (bone ? 0.055 : 0.038) * (0.6 + Math.random() * 0.8) * (u.kind.h / 2.3);
    const g = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), bone ? SKULL_MAT : (i % 2 ? meat : GIB_MAT_WET));
    g.scale.set(1 + Math.random() * 0.8, 0.5 + Math.random() * 0.6, 1 + Math.random() * 0.5);
    g.position.set(hp.x + (Math.random() - 0.5) * 0.16, hp.y + (Math.random() - 0.5) * 0.16, hp.z + (Math.random() - 0.5) * 0.16);
    g.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    scene.add(g);
    const a = Math.random() * Math.PI * 2, out = 1.4 + Math.random() * 3.4;
    gibs.push({
      m: g,
      vel: new THREE.Vector3(Math.cos(a) * out + dirX * 3.0, 1.4 + Math.random() * 3.6, Math.sin(a) * out + dirZ * 3.0),
      spin: new THREE.Vector3((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 22),
      rest: r * 0.5, life: 30,
    });
  }
  // the blood comes from where the head was, not from the chest
  for (let i = 0; i < 36; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.030 * (0.5 + Math.random()), 0), BLOOD_MAT);
    m.position.set(hp.x + (Math.random() - 0.5) * 0.2, hp.y + (Math.random() - 0.5) * 0.2, hp.z + (Math.random() - 0.5) * 0.2);
    scene.add(m);
    const a = Math.random() * Math.PI * 2, out = 1.0 + Math.random() * 3.6;
    bloodDrops.push({ m, vel: new THREE.Vector3(Math.cos(a) * out + dirX * 2.0, 0.6 + Math.random() * 3.4, Math.sin(a) * out + dirZ * 2.0), life: 4 });
  }
  stampBlood(hp.x, hp.z, 1.2 + Math.random() * 0.5);
  sfxMutSever();
  playSample('fleshHit', 1.0, 0.03, 0.5);        // and a second, lower, under it: something heavier than a limb
  addTrauma(0.35); fovKick = Math.max(fovKick, 3);
  return true;
}
/* THE PIECE IS THE PIECE. A severed limb used to be a generic lump thrown
 * from the body; you saw something leave and nothing on the ground that was
 * an arm. Now the limb itself comes off: every triangle of the skin whose
 * corners are mostly weighted to the cut bone's subtree is baked, in the pose
 * it is in at that instant, into a static mesh with the creature's own
 * material, laid along X so it lands lying down, and thrown as a gib. The
 * seam is the skinning's own and it is ragged, as a tear is. It has to be
 * baked BEFORE the bone collapses, or there is nothing to bake. A torso cut
 * bakes the whole upper body — head, arms and all — and it lies there. */
const _bkV = new THREE.Vector3();
function bakeLimb(u, boneName) {
  let root = null; const meshes = [];
  const _bn = ragBone(u, boneName);
  u.model.traverse((o) => { if (o.isBone && o.name === _bn) root = o; if (o.isSkinnedMesh) meshes.push(o); });
  if (!root || !meshes.length) return null;
  u.model.updateMatrixWorld(true);
  const rootP = root.getWorldPosition(new THREE.Vector3());
  // the piece's long axis: from the cut to the farthest joint below it
  const far = rootP.clone(); let farD = 0;
  root.traverse((b) => { if (!b.isBone) return; b.getWorldPosition(_bkV); const d = _bkV.distanceTo(rootP); if (d > farD) { farD = d; far.copy(_bkV); } });
  const axis = far.sub(rootP); if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0); axis.normalize();
  const turn = new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(1, 0, 0));
  const pos = [], uv = [];
  for (const m of meshes) {
    const bones = m.skeleton.bones, inSet = new Uint8Array(bones.length);
    bones.forEach((b, i) => { for (let q = b; q; q = q.parent) { if (q === root) { inSet[i] = 1; break; } if (!q.isBone) break; } });
    const g = m.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, UV = g.attributes.uv, idx = g.index;
    if (!SI || !SW) continue;
    const dom = (v) => { let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = SW.getComponent(v, k); if (w > bw) { bw = w; best = SI.getComponent(v, k); } } return inSet[best]; };
    const n = idx ? idx.count : P.count, at = (i) => (idx ? idx.getX(i) : i);
    for (let t = 0; t < n; t += 3) {
      const a = at(t), b = at(t + 1), c = at(t + 2);
      if (dom(a) + dom(b) + dom(c) < 2) continue;
      for (const v of [a, b, c]) {
        _bkV.fromBufferAttribute(P, v); m.applyBoneTransform(v, _bkV); _bkV.applyMatrix4(m.matrixWorld);
        _bkV.sub(rootP).applyQuaternion(turn);
        pos.push(_bkV.x, _bkV.y, _bkV.z);
        uv.push(UV ? UV.getX(v) : 0, UV ? UV.getY(v) : 0);
      }
    }
  }
  if (pos.length < 9) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  const c = geo.boundingBox.getCenter(new THREE.Vector3());
  geo.translate(-c.x, -c.y, -c.z);              // about its own middle, so it tumbles and rests on its own thickness
  const mesh = new THREE.Mesh(geo, meshes[0].material);
  const back = turn.clone().invert();
  mesh.quaternion.copy(back);                    // starts exactly where the limb was, and tumbles from there
  mesh.position.copy(c.applyQuaternion(back).add(rootP));
  return mesh;
}
function mutSever(u, part, dirX, dirZ, force) {
  if (!u.model || u.gone[part.bone]) return false;
  let target = null;
  const _pn = ragBone(u, part.bone);
  u.model.traverse((o) => { if (o.isBone && o.name === _pn) target = o; });
  if (!target) return false;
  const piece = bakeLimb(u, part.bone);        // before the collapse, or there is nothing to bake
  u.gone[part.bone] = 1;
  target.scale.setScalar(0.0001);              // the seam is the skinning's own
  const p = u.g.position;
  const out = 1.6 + Math.random() * 2.2;
  if (piece) {
    scene.add(piece);
    gibs.push({
      m: piece,
      vel: new THREE.Vector3(dirX * out * force + (Math.random() - 0.5), 2.0 + Math.random() * 2.2, dirZ * out * force + (Math.random() - 0.5)),
      spin: new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9),
      rest: 0, life: 240,
    });
  }
  // and a couple of small pieces of the wound itself
  const mat = mutGibMat(u);
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Mesh(new THREE.IcosahedronGeometry(part.r * u.kind.h * 0.12 * (0.6 + Math.random() * 0.8), 0), i ? mat : GIB_MAT_WET);
    g.position.set(p.x + (Math.random() - 0.5) * 0.2, part.y * u.kind.h, p.z + (Math.random() - 0.5) * 0.2);
    scene.add(g);
    gibs.push({
      m: g,
      vel: new THREE.Vector3(dirX * out * force * 0.7 + (Math.random() - 0.5) * 1.5, 2.0 + Math.random() * 2.5, dirZ * out * force * 0.7 + (Math.random() - 0.5) * 1.5),
      spin: new THREE.Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18),
      rest: 0, life: 40,
    });
  }
  bleedMutant(u, 14, 1.2);
  sprayBlood(p.x, part.y * u.kind.h, p.z, dirX, dirZ, 14, 1.2);
  stampBlood(p.x, p.z, 0.7 + Math.random() * 0.5);
  sfxMutSever();
  return true;
}
function sfxMutSever() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, out = sfxOut();
  playSample('fleshHit', 0.9, 0.05, 0.62);
  // the wet part: a short tearing burst that opens and closes
  const n = noiseBurst(0.34, (x) => Math.sin(Math.min(1, x * 3) * Math.PI) * (0.3 + 0.7 * Math.random()));
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(240, t); bp.frequency.exponentialRampToValueAtTime(900, t + 0.3);
  const g = ctx.createGain(); g.gain.value = 0.3;
  n.connect(bp).connect(g).connect(out); n.start(t); n.stop(t + 0.34);
}
/* ---- THE RAGDOLL, FOR REAL ---------------------------------------------
 * The first version was a flop: the pose froze, every bone got a random
 * spin, and the whole model was tipped over on a timer. It read as a mannequin
 * being knocked off a table. This is what Source does, cut down to what a
 * beach at night needs: the JOINTS are particles, the BONES are distance
 * constraints between them, and the body is simulated — gravity, Verlet
 * integration, a handful of constraint iterations, and a ground plane with
 * friction and a little restitution. Nothing here knows what an arm is. The
 * feet are on the sand when it dies, so they catch and the body topples over
 * them; a hit to the chest carries the torso and the head goes last; a limb
 * hits the ground before the body and bounces once; and it settles into
 * whatever heap those particular constraints and that particular blow make,
 * which is never the same heap twice.
 *
 * Two things make it read as a body and not a chain of beads. STIFFENERS —
 * extra constraints across the torso (hips to shoulders, shoulder to
 * shoulder, hip to hip) so the trunk is a box that tumbles and not a rope
 * that folds. And BEND LIMITS: a minimum distance across every three-joint
 * chain (hip–knee–foot, shoulder–elbow–hand, chest–neck–head, hips–spine–
 * chest), which is the cheapest joint limit there is and stops the one thing
 * that gives a Verlet ragdoll away, a knee folding flat the wrong way.
 *
 * The skeleton is then DRIVEN from the particles, parent first: each bone is
 * turned by the smallest rotation that takes where it currently points its
 * child to where the child's particle is. Smallest-rotation, not look-at,
 * because this rig's bone axes do not run along the bones (the forearm sits
 * diagonally off the upper arm) and a look-at would twist every limb; the
 * minimal rotation preserves whatever roll the pose had. The root's position
 * comes from the hips particle. All of it is in WORLD space, so the scan's
 * scale and Z-up root matrix never enter into it. */
const RAG_CHAIN = [
  // [joint, parent joint, primary child joint (what the bone points at), ground radius]
  ['Character1_Hips', null, 'Character1_Spine', 0.17],
  ['Character1_Spine', 'Character1_Hips', 'Character1_Spine1', 0.14],
  ['Character1_Spine1', 'Character1_Spine', 'Character1_Spine2', 0.14],
  ['Character1_Spine2', 'Character1_Spine1', 'Character1_Neck', 0.15],
  ['Character1_Neck', 'Character1_Spine2', 'Character1_Head', 0.07],
  ['Character1_Head', 'Character1_Neck', null, 0.13],
  ['Character1_LeftShoulder', 'Character1_Spine2', 'Character1_LeftArm', 0.08],
  ['Character1_LeftArm', 'Character1_LeftShoulder', 'Character1_LeftForeArm', 0.07],
  ['Character1_LeftForeArm', 'Character1_LeftArm', 'Character1_LeftHand', 0.06],
  ['Character1_LeftHand', 'Character1_LeftForeArm', null, 0.05],
  ['Character1_RightShoulder', 'Character1_Spine2', 'Character1_RightArm', 0.08],
  ['Character1_RightArm', 'Character1_RightShoulder', 'Character1_RightForeArm', 0.07],
  ['Character1_RightForeArm', 'Character1_RightArm', 'Character1_RightHand', 0.06],
  ['Character1_RightHand', 'Character1_RightForeArm', null, 0.05],
  ['Character1_LeftUpLeg', 'Character1_Hips', 'Character1_LeftLeg', 0.10],
  ['Character1_LeftLeg', 'Character1_LeftUpLeg', 'Character1_LeftFoot', 0.07],
  ['Character1_LeftFoot', 'Character1_LeftLeg', 'Character1_LeftToeBase', 0.06],
  ['Character1_LeftToeBase', 'Character1_LeftFoot', null, 0.05],
  ['Character1_RightUpLeg', 'Character1_Hips', 'Character1_RightLeg', 0.10],
  ['Character1_RightLeg', 'Character1_RightUpLeg', 'Character1_RightFoot', 0.07],
  ['Character1_RightFoot', 'Character1_RightLeg', 'Character1_RightToeBase', 0.06],
  ['Character1_RightToeBase', 'Character1_RightFoot', null, 0.05],
];
/* THE TRUNK IS A SOLID, NOT A SACK. Seven braces at a third to nine tenths
 * stiffness held a torso together at the old forces; at half again the
 * gravity and twice the kick they stretched, and a chest that stretches is
 * a body that arrives on the floor looking like it has had the air let out
 * of it — the owner's "deflated balloons". Every pair among the six trunk
 * joints is braced at FULL stiffness now, which is a tetrahedral truss: a
 * shape with no way to fold. The diagonals are what matter — hips to the
 * opposite shoulder, shoulder to the opposite hip — because a box with only
 * its edges is a hinge. The shoulders and the head are tied in too, so the
 * neck cannot telescope and the arms hang off something rigid. */
const RAG_STIFF = [
  ['Character1_Hips', 'Character1_Spine', 1.0],
  ['Character1_Hips', 'Character1_Spine1', 1.0],
  ['Character1_Hips', 'Character1_Spine2', 1.0],
  ['Character1_Spine', 'Character1_Spine2', 1.0],
  ['Character1_LeftShoulder', 'Character1_RightShoulder', 1.0],
  ['Character1_LeftUpLeg', 'Character1_RightUpLeg', 1.0],
  ['Character1_Hips', 'Character1_LeftShoulder', 1.0],
  ['Character1_Hips', 'Character1_RightShoulder', 1.0],
  ['Character1_Spine2', 'Character1_LeftUpLeg', 1.0],
  ['Character1_Spine2', 'Character1_RightUpLeg', 1.0],
  ['Character1_Spine', 'Character1_LeftShoulder', 1.0],
  ['Character1_Spine', 'Character1_RightShoulder', 1.0],
  ['Character1_LeftShoulder', 'Character1_RightUpLeg', 0.9],
  ['Character1_RightShoulder', 'Character1_LeftUpLeg', 0.9],
  ['Character1_Neck', 'Character1_LeftShoulder', 0.9],
  ['Character1_Neck', 'Character1_RightShoulder', 0.9],
  ['Character1_Spine1', 'Character1_LeftShoulder', 0.8],
  ['Character1_Spine1', 'Character1_RightShoulder', 0.8],
];
// joints that must not fold flat: [a, b, c, fraction of (ab + bc) they may close to]
const RAG_BEND = [
  ['Character1_LeftUpLeg', 'Character1_LeftLeg', 'Character1_LeftFoot', 0.55],
  ['Character1_RightUpLeg', 'Character1_RightLeg', 'Character1_RightFoot', 0.55],
  ['Character1_LeftArm', 'Character1_LeftForeArm', 'Character1_LeftHand', 0.45],
  ['Character1_RightArm', 'Character1_RightForeArm', 'Character1_RightHand', 0.45],
  ['Character1_Spine2', 'Character1_Neck', 'Character1_Head', 0.72],
  ['Character1_Hips', 'Character1_Spine1', 'Character1_Spine2', 0.90],
  ['Character1_Hips', 'Character1_LeftUpLeg', 'Character1_LeftLeg', 0.60],
  ['Character1_Hips', 'Character1_RightUpLeg', 'Character1_RightLeg', 0.60],
];
/* AND THE SOLVER HAS TO KEEP UP WITH THE FORCES. Seven iterations over two
 * substeps converged on the old kick; against a blow twice as hard under
 * gravity half again as strong it did not, and an unconverged distance
 * constraint IS a stretched limb. Twelve over three costs nothing at the one
 * or two bodies this game ever has in the air at once. */
const RAG_ITER = 12, RAG_SUB = 3, RAG_DAMP = 0.990, RAG_FRICTION = 0.55, RAG_BOUNCE = 0.28;
/* AND A BODY IS NOT ALLOWED INSIDE ITSELF. Distance constraints hold the
 * skeleton's lengths and nothing at all holds its VOLUME, so an arm folded
 * through the chest, a thigh through the belly, and the whole thing settled
 * into a puddle with a man's proportions only on paper. Every pair of parts
 * that is not joined and is not braced pushes apart at the sum of their
 * radii — the cheapest thickness there is, and the difference between a
 * ragdoll and a bag. The pairs are worked out ONCE per body, and any pair
 * whose rest distance is already inside that sum is dropped, because a
 * collision that fights the skeleton is a body that shakes itself apart. */
const RAG_SELF = 0.82;                   // how much of the summed radii it enforces
/* A BODY FALLS HARDER THAN IT FLIES. Under the beach's own 9.8 a corpse
 * thrown hard enough to travel FLOATED on the way down — a long soft
 * parabola that reads as weightless however far it goes, which is the
 * opposite of what a killing blow should look like. The throw and the fall
 * are separate knobs and they were being turned together: the kick is
 * bigger, so it goes further, and gravity under a ragdoll is half again the
 * world's, so it comes down fast and HITS. Less drag with it, so what leaves
 * keeps going instead of being eaten by the air. */
const RAG_G = 15.6;
const _rg1 = new THREE.Vector3(), _rg2 = new THREE.Vector3(), _rg3 = new THREE.Vector3(), _rgQ = new THREE.Quaternion(), _rgQ2 = new THREE.Quaternion();
const _rgM = new THREE.Matrix4();

/* WHAT A FALLING BODY BREAKS. The room is full of glass set out to be
 * thrown, and a corpse flung across it went straight through every bottle on
 * the desk — the shovel broke them, a thrown jar broke them, and the two
 * hundred pounds of man landing on them did nothing at all. Every particle
 * that is moving is a hammer: anything with an `onImpact` inside its reach
 * gets the blow, once, at the speed the body was doing. It is called from
 * the landing and from any fast contact, so a body that skids into a shelf
 * takes the shelf with it. */
function ragSmash(r, speed) {
  for (const pr of physProps) {
    if (!pr.onImpact || pr.dead || pr.held || !pr.mesh.parent) continue;
    const m = pr.mesh.position, rr = (pr.radius || 0.3) + 0.30;
    for (const q of r.parts) {
      const dx = q.p.x - m.x, dy = q.p.y - m.y, dz = q.p.z - m.z;
      if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
      pr.onImpact(speed);
      break;
    }
  }
}
function mutRagdoll(u, dirX, dirZ, power) {
  if (u.rag || !u.model) return;
  /* IT DIES FROM THE POSE IT WAS IN — so the mixer is simply never updated
   * again. `stopAllAction()` was called here first, and that RESTORES every
   * bound property to the value it had when the clip was first played: the
   * body snapped to its bind pose on the frame it fell, and the particles
   * were seeded from a T-pose rather than from the swing that killed it. */
  u.model.updateMatrixWorld(true);
  const bones = {};
  u.model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  if (u.boneAlias) for (const k in u.boneAlias) if (bones[u.boneAlias[k]]) bones[k] = bones[u.boneAlias[k]];
  /* A SEVERED LIMB LEAVES A STUMP, AND THE STUMP IS SIMULATED. Everything
   * below a cut bone is gone and gets no particle — but the cut joint itself
   * is the END of the segment above it, and without a particle there that
   * segment (the thigh above a taken knee, the upper arm above a taken
   * forearm) had nothing to be driven toward and kept whatever angle the
   * death pose left it at: an arm standing straight up out of a body lying
   * flat, which is the picture the owner sent. The first cut joint in a
   * chain is a particle like any other; only what hangs off it is left out. */
  const belowCut = (bn) => { for (let b = bn.parent; b; b = b.parent) { if (u.gone[b.name]) return true; if (!b.isBone) break; } return false; };
  const parts = [], byName = {};
  for (const [name, parentName, childName, r] of RAG_CHAIN) {
    const bn = bones[name]; if (!bn || belowCut(bn)) continue;
    const p = bn.getWorldPosition(new THREE.Vector3());
    // the blow's momentum, most of it up top: the chest goes, the feet stay planted and the body goes over them
    const h = THREE.MathUtils.clamp((p.y - u.g.position.y) / Math.max(0.5, u.kind.h), 0, 1);
    /* HARDER AGAIN. The owner asked twice: a killing blow has to throw the
     * body. Most of the kick goes into the top of it and it is lifted as it
     * goes, so it leaves its feet and tumbles rather than sliding off. */
    const kick = (3.1 + power * 6.2) * (0.15 + h * 0.85);
    const v = new THREE.Vector3(dirX * kick + (Math.random() - 0.5) * 0.7, 1.6 + h * 1.8 + Math.random() * 0.5, dirZ * kick + (Math.random() - 0.5) * 0.7);
    const part = { name, bone: bn, parent: parentName, child: childName, r, p, pp: p.clone().addScaledVector(v, -1 / 60), w: name.includes('Hips') ? 0.5 : name.includes('Head') ? 0.8 : 1 };
    parts.push(part); byName[name] = part;
  }
  const cons = [], bends = [];
  for (const part of parts) {
    if (part.parent && byName[part.parent]) cons.push({ a: byName[part.parent], b: part, d: byName[part.parent].p.distanceTo(part.p), k: 1 });
  }
  for (const [a, b2, k] of RAG_STIFF) if (byName[a] && byName[b2]) cons.push({ a: byName[a], b: byName[b2], d: byName[a].p.distanceTo(byName[b2].p), k });
  for (const [a, b2, c, f] of RAG_BEND) if (byName[a] && byName[b2] && byName[c])
    bends.push({ a: byName[a], c: byName[c], min: (byName[a].p.distanceTo(byName[b2].p) + byName[b2].p.distanceTo(byName[c].p)) * f });
  /* The pairs that must never occupy the same space. Anything already joined
   * by a bone or a brace is excluded — those have a length of their own and
   * a collision would fight it — and so is any pair standing closer at rest
   * than its own thickness, which is most of the trunk. What is left is what
   * you would expect: an arm against the ribs, a wrist against a thigh, the
   * knees against each other, the head against a shoulder. */
  const joined = new Set();
  for (const c of cons) joined.add(c.a.name + '|' + c.b.name).add(c.b.name + '|' + c.a.name);
  const hits = [];
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const A = parts[i], B = parts[j];
    if (joined.has(A.name + '|' + B.name)) continue;
    const d = (A.r + B.r) * RAG_SELF;
    if (A.p.distanceTo(B.p) < d) continue;          // already inside itself at rest: not our business
    hits.push({ a: A, b: B, d });
  }
  /* The room it is in, if it is in one — looked up once, because a body
   * does not change buildings while it falls. */
  const rec = inBunker || bunkers.find((bk) => {
    const B = bk.group.userData.bunker, nv = B && B.nav; if (!nv) return false;
    const lx = u.g.position.x - bk.group.position.x, lz = u.g.position.z - bk.group.position.z;
    return lx > nv.room.x0 && lx < nv.room.x1 && lz > nv.room.z0 && lz < nv.room.z1
      && Math.abs(u.g.position.y - bk.group.position.y) < nv.room.h;
  });
  const rb = rec && rec.group.userData.bunker;
  u.rag = { parts, byName, cons, bends, hits, t: 0, asleep: false,
            room: rb && rb.nav ? rb.nav.room : null, bunker: rb || null,
            roomG: rec ? rec.group : null, wallHit: 0, wallAt: new THREE.Vector3() };
  u.g.rotation.set(0, u.g.rotation.y, 0);           // the body's tilt is the particles' now, not the group's
  /* And the aim's yaw dies with him. It lives on the MODEL, and a man killed
   * halfway through a swing would otherwise lie there wearing the last
   * correction — the particles own the body from here. */
  if (u.model) { u.model.rotation.y = 0; u.aimW = 0; }
}

/* A BODY ON THE SAND TAKES THE BLOW TOO. The blade used to pass straight
 * through a corpse to the sand under it. Now the swing finds the nearest
 * joint on the aim line, kicks everything near it along the swing — the
 * ragdoll wakes and takes it like any other blow — sprays from the point it
 * landed, and a hard enough cut takes the piece it landed on: the limb whose
 * joint it was comes off (`limbFor`), the ragdoll forgets everything below
 * the cut (`ragCut`) and keeps the stump, and the piece lies where it fell. */
const RAG_LIMB_OF = {
  LeftHand: 'LeftForeArm', LeftForeArm: 'LeftForeArm', LeftArm: 'LeftArm', LeftShoulder: 'LeftArm',
  RightHand: 'RightForeArm', RightForeArm: 'RightForeArm', RightArm: 'RightArm', RightShoulder: 'RightArm',
  LeftToeBase: 'LeftLeg', LeftFoot: 'LeftLeg', LeftLeg: 'LeftLeg', LeftUpLeg: 'LeftLeg',
  RightToeBase: 'RightLeg', RightFoot: 'RightLeg', RightLeg: 'RightLeg', RightUpLeg: 'RightLeg',
  Head: 'Head', Neck: 'Head', Spine1: 'torso', Spine2: 'torso', Spine: 'torso',
};
function limbFor(partName, P) {
  const key = RAG_LIMB_OF[partName.replace('Character1_', '')];
  if (!key) return null;
  if (key === 'torso') return P >= MUT_HEAVY ? MUT_BISECT : null;
  return MUT_LIMBS.find((l) => l.bone === 'Character1_' + key) || null;
}
function ragCut(u, boneName) {
  const r = u.rag; if (!r || !r.byName[boneName]) return;
  const below = (bn) => { for (let b = bn.parent; b; b = b.parent) { if (b.name === boneName) return true; if (!b.isBone) break; } return false; };
  const gone = new Set(r.parts.filter((q) => below(q.bone)));
  if (!gone.size) return;
  r.parts = r.parts.filter((q) => !gone.has(q));
  for (const q of gone) delete r.byName[q.name];
  r.cons = r.cons.filter((c) => !gone.has(c.a) && !gone.has(c.b));
  r.bends = r.bends.filter((b) => !gone.has(b.a) && !gone.has(b.c));
}
function ragHit(u, q, P, dirX, dirZ) {
  const r = u.rag; r.asleep = false;
  const kick = 2.6 + P * 4.4;
  for (const o of r.parts) {
    const d = o.p.distanceTo(q.p);
    if (d > 0.75) continue;
    const w = 1 / (1 + d * 3);
    o.pp.x -= (dirX * kick + (Math.random() - 0.5) * 0.6) * w / 90;
    o.pp.y -= (1.6 + P * 1.4) * w / 90;
    o.pp.z -= (dirZ * kick + (Math.random() - 0.5) * 0.6) * w / 90;
  }
  hitConnect(P, 0.55);
  playSample('fleshHit', 0.9, 0.05, 0.9 - P * 0.2);
  sprayBlood(q.p.x, q.p.y, q.p.z, dirX, dirZ, 10 + Math.round(P * 12), 0.8 + P * 0.6);
  stampBlood(q.p.x, q.p.z, 0.5 + Math.random() * 0.4);
  const part = limbFor(q.name, P);
  if (part && !u.gone[part.bone] && (P >= MUT_HEAVY || Math.random() < 0.38)) {
    if (mutSever(u, part, dirX, dirZ, 0.9 + P * 0.6)) ragCut(u, part.bone);
  }
}
function updateMutRagdoll(u, dt) {
  const r = u.rag; if (!r) return;
  r.t += dt;
  const bf = bunkerFloorAt(u.g.position.x, u.g.position.z, u.g.position.y + 0.5);
  const gy = (bf === null ? 0 : bf) + 0.07;           // the floor under it, plus the flesh around a joint: the mesh rests ON it, not in it
  /* IT FLOATS. The seabed is the sand plane and the drawn sea sits BELOW it,
   * so a body that came to rest on the sand in the surf lay on top of the
   * water like a raft — the owner's "they sit on top". In the water each
   * joint's floor is the wave surface, a hand under it, and the surface moves,
   * so the body rides the swell; the sand floor is gone with the sand. It
   * blends in over the first stretch past the waterline, the way everything
   * else wades in, and a corpse the tide reaches later is WOKEN by it. */
  let wet = false;
  const hip0 = r.byName['Character1_Hips'] || r.parts[0];
  if (r.asleep && hip0 && bf === null && submersionAt(hip0.p.x, hip0.p.z) > 0.15) r.asleep = false;
  if (!r.asleep) {
    const h = Math.min(dt, 1 / 30) / RAG_SUB;
    let motion = 0;
    for (const q of r.parts) {
      const sub = bf === null ? submersionAt(q.p.x, q.p.z) : 0;
      const k = THREE.MathUtils.clamp((sub - 0.15) / 0.6, 0, 1);
      q.wet = k;
      q.floor = k > 0 ? gy + (waterSurfaceAt(q.p.x, q.p.z) - 0.10 - gy) * k : gy;
      if (k > 0) wet = true;
    }
    for (let s = 0; s < RAG_SUB; s++) {
      // integrate
      for (const q of r.parts) {
        _rg1.subVectors(q.p, q.pp).multiplyScalar(q.wet > 0 ? RAG_DAMP - 0.10 * q.wet : RAG_DAMP);   // water is thick
        q.pp.copy(q.p);
        q.p.add(_rg1); q.p.y -= RAG_G * h * h;
        motion += _rg1.lengthSq();
      }
      // constraints
      for (let it = 0; it < RAG_ITER; it++) {
        for (const c of r.cons) {
          _rg1.subVectors(c.b.p, c.a.p); const d = _rg1.length() || 1e-6;
          const diff = (d - c.d) / d * c.k, wa = c.a.w, wb = c.b.w, ws = wa + wb;
          c.a.p.addScaledVector(_rg1, diff * (wa / ws)); c.b.p.addScaledVector(_rg1, -diff * (wb / ws));
        }
        for (const bd of r.bends) {
          _rg1.subVectors(bd.c.p, bd.a.p); const d = _rg1.length() || 1e-6;
          if (d < bd.min) { const diff = (d - bd.min) / d * 0.5; bd.a.p.addScaledVector(_rg1, diff); bd.c.p.addScaledVector(_rg1, -diff); }
        }
        /* AND IT IS NOT ALLOWED INSIDE ITSELF. Once per iteration, because
         * a thickness that is only applied at the end is a thickness the
         * next constraint pass immediately undoes. */
        for (const c of r.hits) {
          _rg1.subVectors(c.b.p, c.a.p); const d = _rg1.length() || 1e-6;
          if (d >= c.d) continue;
          const push = (d - c.d) / d * 0.5, wa = c.a.w, wb = c.b.w, ws = wa + wb;
          c.a.p.addScaledVector(_rg1, push * (wa / ws) * 2);
          c.b.p.addScaledVector(_rg1, -push * (wb / ws) * 2);
        }
        // the ground, with friction: what touches the sand stops sliding
        for (const q of r.parts) {
          if (q.p.y < q.floor + q.r) {
            q.p.y = q.floor + q.r;
            q.pp.x = q.p.x - (q.p.x - q.pp.x) * (1 - RAG_FRICTION);
            q.pp.z = q.p.z - (q.p.z - q.pp.z) * (1 - RAG_FRICTION);
            if (q.pp.y < q.p.y) q.pp.y = q.p.y + (q.p.y - q.pp.y) * (q.wet > 0 ? 0 : RAG_BOUNCE);   // and bounces, a little — not in water
          }
          q.p.x = THREE.MathUtils.clamp(q.p.x, WADE_X - 6, CLIFF_BLOCK_X + 0.6);
          /* AND THE ROOM IS SOLID. A body thrown across the bunker went out
           * through the concrete and came to rest in the sand over its roof:
           * the only wall the ragdoll knew was the beach's cliff, three
           * hundred metres away. Inside the room every particle is held to
           * the walls and to the ceiling, and to the FURNITURE too — the
           * same 0.1 m grid the player and the Dealer walk — so a corpse
           * flung at the console bank piles up against it instead of
           * sliding through the desks. Each hit is recorded, loudest wins,
           * and the frame the body has finished settling it is played. */
          if (r.room) {
            const R = r.room, B = r.bunker, g = r.roomG;
            const lx = q.p.x - g.position.x, lz = q.p.z - g.position.z;
            let hx = 0, hz = 0, hy = 0;
            const cx = THREE.MathUtils.clamp(lx, R.x0 + q.r, R.x1 - q.r);
            const cz = THREE.MathUtils.clamp(lz, R.z0 + q.r, R.z1 - q.r);
            if (cx !== lx) { hx = 1; q.p.x = g.position.x + cx; }
            if (cz !== lz) { hz = 1; q.p.z = g.position.z + cz; }
            const top = g.position.y + R.h - q.r;
            if (q.p.y > top) { hy = 1; q.p.y = top; }
            if (B && B.blocked(cx, cz, q.r * 0.9)) {
              _rg3.set(cx, 0, cz); B.pushOut(_rg3, q.r * 0.9, 3);
              q.p.x = g.position.x + _rg3.x; q.p.z = g.position.z + _rg3.z; hx = 1;
            }
            if (hx || hz || hy) {
              // how hard it arrived, and it loses most of it to the wall
              const vx = q.p.x - q.pp.x, vy = q.p.y - q.pp.y, vz = q.p.z - q.pp.z;
              const sp = Math.hypot(vx, vy, vz) / Math.max(1e-4, h);
              if (sp > r.wallHit) { r.wallHit = sp; r.wallAt.copy(q.p); }
              if (hx) q.pp.x = q.p.x + (q.p.x - q.pp.x) * 0.35;
              if (hz) q.pp.z = q.p.z + (q.p.z - q.pp.z) * 0.35;
              if (hy) q.pp.y = q.p.y + (q.p.y - q.pp.y) * 0.35;
            }
          }
        }
      }
    }
    /* AND IT ARRIVES. A body thrown across a room used to land in silence:
     * the particles stopped and that was the whole event. The FIRST heavy
     * contact — the frame the fastest part of it meets the floor — is a
     * beat of its own: a thud pitched by how hard it came down, a shove of
     * trauma through the camera, a puff of what it landed in, and the world
     * hitching for a moment the way it does on any other real impact. Once,
     * on the way down, never on the settling bounces after — `r.landed` is
     * what keeps it from firing on every scrape for the rest of the night. */
    if (!r.landed) {
      let worst = 0, wx = 0, wy = 0, wz = 0;
      for (const q of r.parts) {
        if (q.p.y > q.floor + q.r + 0.05) continue;
        const fall = (q.pp.y - q.p.y) / Math.max(1e-4, h);
        if (fall > worst) { worst = fall; wx = q.p.x; wy = q.p.y; wz = q.p.z; }
      }
      if (worst > 3.2) {
        r.landed = true;
        const P = THREE.MathUtils.clamp((worst - 3.2) / 7, 0, 1);
        /* IT LANDS, IT DOES NOT PUNCH YOU. A body arriving is a noise, a
         * puff of what it hit and whatever it broke on the way — the camera
         * is the PLAYER's, and it should move for what the player does and
         * for what is done to him, not for something happening across the
         * room. In a steel box with the sound bouncing off the walls a jolt
         * on every landing read as the building shifting. */
        sfxKillThud(0.7 + P * 0.8);
        // sand throws up; a steel floor does not
        if (bunkerFloorAt(wx, wz, wy) === null) spawnPuffs(wx, wz, 4 + Math.round(P * 7), 0, -1, wy + 0.06);
        ragSmash(r, 3.0 + P * 5);
      }
    }
    /* AND WHAT IT HIT ON THE WAY. The loudest contact of the frame is played
     * once, at the end of it, rather than one sound per particle per
     * substep — a body meeting a wall is ONE noise, and thirty of them at
     * once is a burst of static. Under a threshold it is a scrape and gets
     * nothing; over it, steel and concrete, with the room's own reverb
     * already on the bus. */
    if (r.wallHit > 2.6) {
      const P = THREE.MathUtils.clamp((r.wallHit - 2.6) / 8, 0, 1);
      sfxBodySlam(P, r.wallAt);       // heard, not felt
      ragSmash(r, 4 + P * 6);
    }
    r.wallHit = 0;
    // still travelling fast? then it is still a hammer, and a body that
    // skids into a shelf of bottles takes the shelf with it
    if (motion > 4e-4) ragSmash(r, 6.5);
    if (r.t > 1.5 && motion < 1e-7 && !wet) r.asleep = true;     // it has come to rest — on sand; water never lets it
  }
  // drive the skeleton from the particles, parent first
  const hips = r.byName['Character1_Hips'];
  if (hips) {
    hips.bone.parent.updateWorldMatrix(true, false);
    hips.bone.position.copy(hips.bone.parent.worldToLocal(_rg1.copy(hips.p)));
  }
  for (const q of r.parts) {
    if (!q.child || !r.byName[q.child]) continue;
    const kid = r.byName[q.child];
    q.bone.updateWorldMatrix(true, false);
    kid.bone.updateWorldMatrix(true, false);
    q.bone.getWorldPosition(_rg1);
    kid.bone.getWorldPosition(_rg2);
    /* Two scratch vectors, not one. The first build built `want` in the same
     * vector it had just built `cur` in, so the two were one object, the
     * rotation between them was the identity, and not a bone ever turned —
     * the hips particle sank to the sand and dragged a RIGID body a metre
     * through the floor. */
    const cur = _rg2.sub(_rg1); if (cur.lengthSq() < 1e-8) continue; cur.normalize();
    const want = _rg3.copy(kid.p).sub(_rg1); if (want.lengthSq() < 1e-8) continue; want.normalize();
    _rgQ.setFromUnitVectors(cur, want);                // the smallest turn: keeps the pose's roll
    q.bone.getWorldQuaternion(_rgQ2);
    _rgQ2.premultiply(_rgQ);
    if (q.bone.parent) { q.bone.parent.getWorldQuaternion(_rgQ); _rgQ2.premultiply(_rgQ.invert()); }
    q.bone.quaternion.copy(_rgQ2);
  }
}

function updateMutantUnit(u, dt) {
  if (!u.mixer) return;
  const p = u.g.position;
  if (!u.st.alive) {
    u.st.deadT += dt;
    if (u.rag) updateMutRagdoll(u, dt); else mutAnim(u, dt, 0);
    return;
  }
  /* Impact frames, held for exactly the length of the hitstop, so what you are
   * looking at is the reason the world has stopped. Driven off `hitstop` and
   * not off dt, because dt is what hitstop scales. */
  if (u.st.struck) {
    const e = 1 - THREE.MathUtils.clamp(hitstop / MUT_HIT_STOP, 0, 1);
    p.copy(u.hitFrom).addScaledVector(u.hitDir, 0.30 * e);
    u.mixer.update(0);
    if (hitstop <= 0) finishMutant(u);
    return;
  }
  /* HE BREATHES WHILE HE TALKS. `frozen()` is right for the pack — the
   * dock's cutscene owns them and nothing else may move — but the boss
   * opens with a conversation, and a man standing perfectly still through
   * his own line is a photograph. He keeps his idle through a dialogue,
   * and only a dialogue; the menu still stops him dead. */
  if (frozen()) {
    if (u.kind.human && dialogOpen && !menuOpen && !inspecting && !u.holdAnim) mutAnim(u, dt, 0);
    return;
  }

  const dx = camera.position.x - p.x, dz = camera.position.z - p.z;
  const dist = Math.hypot(dx, dz) || 0.001;
  const face = Math.atan2(dx / dist, dz / dist);      // the model's front is +Z
  const turn = (rate) => { u.g.rotation.y += _smileTurn(u.g.rotation.y, face) * Math.min(1, dt * rate); };

  if (!u.st.awake) {
    if (!u.holdAnim) mutAnim(u, dt, 0);        // something else is driving the clip (his reach for the bar)
    return;                                    // the cutscene is what wakes them
  }
  /* THE BEACH DOES NOT REACH DOWN THE HATCH. Every distance in here is x and
   * z, so a creature that had followed you to the lid stood on the sand over
   * the roof and fought you through forty metres of earth — the crabs bit
   * through the ceiling. Anything that is not the one who lives down there
   * stands off while you are in the bunker. */
  if (inBunker && !u.kind.solo) { mutDrop(u); mutAnim(u, dt, 0); return; }
  /* What is left of his poise grows back once you stop hitting him, which is
   * the half of a pool that makes it one: a stagger has to be paid for in a
   * flurry, and a flurry has to be survived. */
  if (u.kind.human && u.st.alive) {
    u.st.poiseT = (u.st.poiseT || 0) + dt;
    if (u.st.poiseT > (u.kind.poiseWait || 1.4) && u.st.poise < u.kind.poise)
      u.st.poise = Math.min(u.kind.poise, u.st.poise + (u.kind.poiseBack || 1.6) * dt);
  }
  // the roar: it does not move through it, which is the beat that says what
  // the rest of this is going to be
  if (u.st.roar > 0) {
    u.st.roar -= dt;
    turn(4);
    mutAnim(u, dt, 0);
    return;
  }
  // parried: stopped dead, wide open, for exactly as long as the clip says
  if (u.st.stun > 0) {
    u.st.stun -= dt;
    mutAnim(u, dt, 0);
    if (u.st.stun <= 0) { u.st.stun = 0; u.st.cool = 0.3; }
    return;
  }
  /* HE READS YOUR WIND-UP. Hold a charge in his face and he answers it —
   * he steps out of the arc, or the bar comes up. This is the one thing
   * that turns him from a creature that swings on its own clock into
   * somebody FIGHTING you: the heavy that used to be free now has to be
   * bought with a feint, a step, or the moment after his own recovery.
   * On a cooldown of its own, so it is an answer and not a wall. */
  if (u.kind.human) {
    u.st.react = Math.max(0, (u.st.react || 0) - dt);
    if (u.st.evade > 0) {
      u.st.evade -= dt;
      u.dir.set(-dx / dist, 0, -dz / dist);
      p.addScaledVector(u.dir, 5.4 * dt);
      turn(7);
      /* A STEP BACK IS THE WALK RUN BACKWARDS. Playing the walk forward
       * while he travels the other way is a moonwalk; the clip at a
       * negative rate puts his feet where they are going. He keeps facing
       * you the whole way, which is what makes it read as a step and not
       * as running away. */
      const a = mutPlay(u, 'walk', true);
      if (a) { a.paused = false; a.timeScale = -1.5; }
      if (u.model) { u.leanT += (-0.06 - u.leanT) * Math.min(1, dt * 6); u.model.rotation.x = u.leanT; }
      u.mixer.update(dt);
      return;
    }
    /* AND HE MAY THINK BETTER OF A SWING HE HAS STARTED. Measured: he is
     * mid-attack 78 % of the time, so a read that only fired while he stood
     * idle almost never fired at all. He can break out of the FIRST HALF of
     * his own startup — before the commit — which is the exchange this
     * fight wanted: charge as he winds and he backs out of it and answers;
     * charge late and he is committed, so you trade. The commit is what
     * keeps his tells honest, and it is untouched. */
    const A0 = u.atk[u.st.swing] || MUT_ATTACKS[u.st.swing];
    const canBreak = u.st.atk < 0 || (!u.st.chained && u.st.atk < A0.wind * 0.55);
    if (canBreak && u.st.stun <= 0 && u.st.recoil <= 0 && u.st.block <= 0
        && u.st.react <= 0 && winding && windT > WIND_FULL * 0.30
        && dist < A0.reach + 1.6 && Math.random() < dt * 9.0) {
      u.st.react = 1.4 + Math.random() * 1.0;
      if (u.st.atk >= 0) { u.st.atk = -1; u.st.chainAt = -1; u.st.landed = false; mutDrop(u); }
      if (Math.random() < 0.55) { u.st.evade = 0.30; u.st.cool = Math.max(u.st.cool, 0.18); }
      else { u.st.block = DEALER_BLOCK; u.st.cool = 0.14; }     // guard, then straight back at you
    }
  }
  // the bar across a blow of yours: he holds it a beat, then comes on
  if (u.st.block > 0) {
    u.st.block = Math.max(0, u.st.block - dt);
    turn(6);
    mutAnim(u, dt, 0);
    return;
  }
  // rocked by a hit it survived: it neither advances nor swings
  if (u.st.recoil > 0) {
    u.st.recoil = Math.max(0, u.st.recoil - dt);
    const k = u.st.recoil / MUT_RECOIL;
    p.copy(u.hitFrom).addScaledVector(u.hitDir, 0.45 * (1 - k));
    mutAnim(u, dt, 0);
    return;
  }

  if (u.st.sprint > 0) u.st.sprint = Math.max(0, u.st.sprint - dt * 0.62);
  /* Breathing, swallowing, a click at the back of the throat — often enough
   * that you always know one of them is behind you, and quiet enough that it
   * never becomes the noise the fight is made of. */
  u.st.hunger -= dt;
  if (u.st.hunger <= 0) {
    u.st.hunger = 2.6 + Math.random() * 5.5;
    if (dist < 16) sfxMutHunger(dist, u.kind.voice);
  }
  let moving = 0;
  /* A SWING THAT IS NOT IN THE TABLE MUST NOT TAKE THE FRAME DOWN. This
   * lookup returned `undefined` for a unit whose `st.swing` had not been set
   * yet or named a clip its kind does not own, and the next line read
   * `A.wind` off it — an uncaught TypeError inside `animate`, which is the
   * whole game, once per frame for as long as the state lasted. Whatever it
   * is holding, it falls back to one it definitely has. */
  const A = swingOf(u);
  if (u.st.atk >= 0) {
    const was = u.st.atk;
    u.st.atk += dt;
    const t = u.st.atk;
    /* It tracks you through the startup and COMMITS for the last fifth of
     * it: stepping round it early is worth nothing, stepping round it late
     * is worth everything, which is the timing a sidestep should have. */
    if (t < A.wind * 0.8) turn(3.4);
    /* AND IT WALKS THE WIND-UP IN. This is the whole answer to "I back up and
     * never get hit": a startup that stands still is a startup you outrun by
     * holding S. It closes through its own wind-up at two thirds of its run,
     * so retreating buys you distance the swing simply eats, and the answers
     * left are the ones that should be — step round it, guard it, or parry.
     * It stops closing for the last fifth, which is the commit. */
    if (t < A.wind * 0.8 && dist > A.reach * 0.75) {
      u.dir.set(dx / dist, 0, dz / dist);
      p.addScaledVector(u.dir, MUT_SPEED * u.kind.speedK * 0.66 * dt);
    }
    /* A FEINT. It throws the startup, gets most of the way through it and
     * does not swing — then comes straight back with a real one. There is no
     * way to read this but to watch the arm, which is the point: a tell you
     * can answer on a stopwatch is not a tell. Rare, and never twice. */
    if (u.st.feint > 0 && t >= A.wind * u.st.feint) {
      u.st.feint = 0; u.st.atk = -1; u.st.chainAt = -1;
      u.st.cool = 0.12 + Math.random() * 0.14;
      mutAnim(u, dt, 0);
      return;
    }
    // the lunge covers ground through its strike
    if (A.lunge > 0 && t >= A.wind && t < A.wind + A.strike + 0.12 && dist > 1.3) {
      u.dir.set(dx / dist, 0, dz / dist);
      p.addScaledVector(u.dir, (A.lunge / (A.strike + 0.12)) * dt);
    }
    // a chained swing STEPS IN through its startup: the first blow's own
    // knockback put you out of reach, and a follow-up that stands still is
    // a follow-up that never lands
    if (u.st.chained && t < A.wind && dist > A.reach - 0.3) {
      u.dir.set(dx / dist, 0, dz / dist);
      p.addScaledVector(u.dir, 2.4 * dt);
    }
    if (was < A.wind && t >= A.wind) {
      sfxMutSwing(u.kind.voice);
      u.st.landed = false;
    }
    /* THE BLOW IS WHERE THE WEAPON IS. The pack lands a hit on a distance
     * from its feet to yours at the first active frame, with no direction in
     * it — fine for a thing with two-metre arms and a swing you learn by
     * count, wrong for a man with a bar you are meant to WATCH: he could
     * face the wall and still hit you, and a swing whose bar passed a metre
     * wide still landed. His blow is tested across the whole active window
     * on the bar itself (`dealerBarHit`): the bar has to pass through you.
     * The pack keeps the old test. */
    if (t >= A.wind && t < A.wind + A.strike + (u.kind.human ? 0.04 : 0) && !u.st.landed) {
      const hits = u.kind.human ? dealerBarHit(u) : (was < A.wind && dist < A.reach + 0.7);
      if (hits) {
        u.st.landed = true;
        if (blocking) {
          /* AND HIS IS A TIGHTER WINDOW. `parryK` scales it per creature —
           * the pack keeps the full fifth of a second, he gives you a little
           * over three quarters of it. The tell is still the whole of the
           * read; it just has to be answered on the beat rather than near
           * it, which is the difference between a boss and the beach. */
          const dtp = (performance.now() - blockStart) / 1000;
          if (dtp <= PARRY_WINDOW * (u.kind.parryK || 1) && parryCool <= 0) parryMutant(u);
          else blockMutant(u);
        } else {
          damagePlayer(A.dmg || u.kind.dmg);
          if (Math.random() < 0.5) sfxMutLaugh(dist, u.kind.voice);   // it is enjoying this
        }
      }
    }
    if (was < A.wind && t >= A.wind) {
      /* THE CHAIN IS DECIDED ON THE STRIKE, not at the end of the recovery:
       * by then the blow's own knockback had you out of range every time and
       * it never fired once. Once — never three in a row, never off a swing
       * that was itself chained — so a combo is two and you can count on it.
       * The second swing comes out of the first's recovery at the halfway
       * mark, which is what makes it a combo and not two attacks. */
      u.st.chainAt = (A.chain && u.st.chainN < u.kind.chainMax && Math.random() < A.chainP && dist < A.reach + 2.2)
        ? A.wind + A.strike + A.recover * 0.42 : -1;
    }
    if (u.st.chainAt > 0 && t >= u.st.chainAt) {
      u.st.swings++;
      u.st.swing = A.chain; u.st.atk = 0; u.st.chained = true; u.st.chainN++; u.st.chainAt = -1;
      sfxMutTell(dist, u.atk[A.chain].wind, u.kind.voice);
    } else if (t >= A.wind + A.strike + A.recover) {
      u.st.atk = -1;
      u.st.swings++;
      u.st.chained = false; u.st.chainN = 0;
      mutDrop(u);                    // its turn is over; the next one is open
      // AGGRESSION IS THE COOLDOWN. They stood about between swings; now the
      // next turn is a fifth of a second away and the small one is quicker.
      u.st.cool = (0.06 + Math.random() * 0.32) * u.kind.windK / u.kind.aggr;   // shorter than it was: the slots and the fidgets took a swing a minute off the rate, and this gives it back
    }
  } else {
    u.st.cool = Math.max(0, u.st.cool - dt);
    u.st.sand = Math.max(0, u.st.sand - dt);
    turn(6);
    /* The one at the back, when you have got away from all of them. It does
     * not hold the turn to do it, so somebody can still be swinging at you
     * while somebody else throws — which is exactly the situation that makes
     * standing off pointless. */
    if (u.st.threw > 0) {
      u.st.threw -= dt;
      const a = mutPlay(u, 'attack2', false);
      if (a) { a.paused = true; a.time = clampTime(a, (1 - u.st.threw / 0.55) * a.getClip().duration * 0.5); }
      u.mixer.update(dt);
      return;
    }
    /* Either you have got away from all of them, or THIS one is the one at
     * the back — the straggler with nothing to do while somebody faster is on
     * you. Both are the same idea: nobody out there is idle. */
    if (!u.kind.noSand && (mutNearest > MUT_SAND_FAR || dist > 13) && u.st.sand <= 0 && mutToken !== u
        && dist > MUT_SAND_FAR * 0.8 && dist < 34 && !settings.devMode) {
      throwSand(u, dist);
      return;
    }
    const near = dist <= A.reach;
    /* WHOSE TURN IT IS. One of them swings and the others circle: three
     * tells at once is not three times the fight, it is no fight at all,
     * because there is nothing to read. Whoever is nearest and ready takes
     * the token; a creature that cannot have it holds its range instead. */
    const maySwing = mutToken === u;
    if (u.st.side !== 0) {
      /* Circling: sidelong at reach, keeping the range. It stops when its
       * time runs out or you close in, and what it does next is drawn
       * again — so its rhythm is not a rhythm. */
      u.st.sideT -= dt;
      const tx = -dz / dist, tz = dx / dist;           // tangent, to its right
      /* And it CIRCLES IN. Holding a polite ring at reach let you back off
       * from all three at once; the ones without the turn close to just
       * inside their own reach while they wait, so backing away is a thing
       * you do into somebody. */
      const r = THREE.MathUtils.clamp((dist - (A.reach - 0.9)) * 1.6, -1, 1);
      const sw = MUT_STRAFE * u.kind.anim.strafeK;
      p.x += (tx * u.st.side * sw + (dx / dist) * r * 1.5) * dt;
      p.z += (tz * u.st.side * sw + (dz / dist) * r * 1.5) * dt;
      p.x = THREE.MathUtils.clamp(p.x, WADE_X - 1.5, CLIFF_BLOCK_X + 0.5);
      moving = 0.2;
      /* AND CIRCLING IS NOT CHASING. It closes at a metre and a half a second
       * while it circles and you retreat at three and a half, so a creature
       * that kept orbiting while you walked away lost ground every time it
       * did — which is how two of them ended up thirty metres behind a player
       * who only ever held S. Break off and run the moment the range is gone. */
      if (dist > A.reach + 1.5) u.st.side = 0;
      if (u.st.sideT <= 0 || dist < 1.4) { u.st.side = 0; u.st.cool = Math.max(u.st.cool, 0.15); }
    } else if (u.st.back > 0) {
      // a step back, and then the lunge out of it
      u.st.back -= dt;
      u.dir.set(dx / dist, 0, dz / dist);
      p.addScaledVector(u.dir, -1.3 * dt);
      moving = 0.2;
      // and out of the step back: the lunge, mostly — the overhand often
      // enough that a step back is not a promise
      if (u.st.back <= 0) {
        u.st.back = 0;
        // only if it still has the turn — a step back is not a way round the token
        if (mutToken === u) {
          const pick = (u.kind.use.attack4 && Math.random() < 0.7) ? 'attack4' : 'attack';
          u.st.swing = u.kind.use[pick] ? pick : Object.keys(u.kind.use)[0];
          u.st.atk = 0; u.st.chained = false; u.st.chainN = 0; u.st.wait = 0;
          sfxMutTell(dist, u.atk[u.st.swing].wind, u.kind.voice);
        } else { u.st.side = flankSide(u, mutants, mutToken, MUT_SLOT_ANG); u.st.sideT = 0.5; }
      }
    } else if (u.st.dash > 0) {
      /* THE CLOSING DASH. At eight metres a second it is faster than you can
       * sprint, and it ends in a swing — so a gap you open by running is a
       * gap that buys you one exchange, not an exit. */
      u.st.dash -= dt;
      u.dir.set(dx / dist, 0, dz / dist);
      p.addScaledVector(u.dir, MUT_DASH * u.kind.speedK * dt);
      p.x = THREE.MathUtils.clamp(p.x, WADE_X - 1.5, CLIFF_BLOCK_X + 0.5);
      moving = 1;
      u.st.step -= dt;
      if (u.st.step <= 0) { u.st.step = u.kind.step * 0.6; sfxMutStep(dist, u.kind.voice); }
      if (u.st.dash <= 0 || dist < A.reach * 0.95) {
        u.st.dash = 0;
        if (mutToken === u) {
          const pick = u.kind.use.attack4 ? 'attack4' : Object.keys(u.kind.use)[0];
          u.st.swing = pick; u.st.atk = 0; u.st.chained = false; u.st.chainN = 0; u.st.wait = 0;
          sfxMutTell(dist, u.atk[pick].wind, u.kind.voice);
        }
      }
    } else if (!near && !u.path) {
      /* AND NOT WHILE HE IS ON A ROUTE. The chase and the route were both
       * moving him every frame in opposite directions — the chase straight
       * at you and into the table, the route round it — and the tug of war
       * is why he was still getting caught on it after the pathfinder went
       * in. Whoever is steering, steers.
       *
       * THE SPRINT DOES NOT STOP WHEN THE TAKE DOES. They come in at nearly
       * twice speed through the cutscene, so handing back at their walking
       * chase speed was a visible gear change at the exact moment you got
       * your hands — the one frame that had to look like nothing happened.
       * It decays instead, over a second and a bit, while they are already
       * on you. */
      /* AND A CATCH-UP. Its top speed beats your walk by a metre a second, but
       * every swing it throws costs it ground — it advances at two thirds
       * through the startup and stands still through the recovery — so
       * against a player who only ever holds S the slow one drifted forty
       * metres out of the fight and stayed there. Past eight metres it is no
       * longer fighting, it is rejoining, and it rejoins at a sprint. */
      const rejoin = dist > 8 ? 1.4 : 1;
      const sp = MUT_SPEED * u.kind.speedK * (1 + u.st.sprint) * rejoin
        * THREE.MathUtils.clamp((dist - A.reach) / 1.8, 0.3, 1);
      u.dir.set(dx / dist, 0, dz / dist);
      flankDir(u, mutants, mutToken, MUT_SLOT_ANG, dist, A.reach - 0.3, u.dir);   // round you, not in a file
      p.addScaledVector(u.dir, sp * dt);
      p.x = THREE.MathUtils.clamp(p.x, WADE_X - 1.5, CLIFF_BLOCK_X + 0.5);
      moving = sp / (MUT_SPEED * u.kind.speedK);
      // hold the turn and a gap it can cross in one go? it crosses it
      if (mutToken === u && u.st.cool <= 0 && dist < 9 && dist > A.reach + 0.8 && Math.random() < dt * 2.2) {
        u.st.dash = 0.28 + Math.random() * 0.42;
      }
      u.st.step -= dt;
      if (u.st.step <= 0) {
        u.st.step = u.kind.step / Math.max(0.35, moving);
        sfxMutStep(dist, u.kind.voice);
        if (inWater(p.x, p.z)) {
          spawnSplash(p.x, p.z, 2, u.dir.x, u.dir.z, 0.5);
          addRipple(p.x, p.z, 0.7);
        }
      }
    } else if (u.st.cool <= 0 && !settings.devMode) {
      /* At reach with its breath back: a swing, drawn by weight, or it
       * circles, or it takes a step back and comes in with the lunge. The
       * first swing of a fight is always the overhand if it has one — you
       * get to learn the language before it starts using all of it. And if
       * another of them holds the token, it circles instead. */
      const roll = Math.random();
      const wantSwing = u.st.swings === 0 || roll < 0.62;
      if (wantSwing && maySwing) {
        let pick = u.kind.use.attack ? 'attack' : Object.keys(u.kind.use)[0];
        if (u.st.swings > 0) {
          const tot = Object.values(u.kind.use).reduce((a, w) => a + w, 0);
          let r = Math.random() * tot;
          for (const k in u.kind.use) { r -= u.kind.use[k]; if (r <= 0) { pick = k; break; } }
        }
        u.st.swing = pick; u.st.atk = 0; u.st.chained = false; u.st.chainN = 0; u.st.wait = 0;
        u.st.feint = (u.st.swings > 1 && Math.random() < u.kind.feint) ? 0.55 + Math.random() * 0.2 : 0;
        sfxMutTell(dist, u.atk[pick].wind, u.kind.voice);
      } else if (!wantSwing && maySwing && u.kind.use.attack4 && Math.random() > u.kind.circle) {
        u.st.back = 0.42;                     // it keeps the turn through the step
      } else {
        u.st.side = flankSide(u, mutants, mutToken, MUT_SLOT_ANG);   // and the circling spreads them
        u.st.sideT = 0.5 + Math.random() * 0.8;
      }
    }
  }
  /* AND IT DOES THINGS WHILE IT WAITS. Standing at reach without the turn it
   * used to stand. Now and then it throws a roar — the OTHER rage clip, at
   * speed, so it is a bark and not the opening — or a twitch of a side-step,
   * on an irregular count. None of it is a tell; a tell is only ever the
   * swing. It is a body that will not keep still. */
  u.st.fidget = (u.st.fidget || 0) - dt;              // the count runs whatever it is doing
  if (u.st.fidget <= 0 && dist <= A.reach + 1.5 && mutToken !== u && u.st.atk < 0 && u.st.flourish <= 0 && u.st.side === 0 && u.st.back <= 0 && u.st.dash <= 0) {
    u.st.fidget = (1.2 + Math.random() * 2.0) * (u.kind.fidgetGap || 1);
    const roll = Math.random() / (u.kind.fidgetK || 1);
    if (roll < 0.45) { u.st.flourish = 0.6; u.st.flourishClip = u.kind.anim.roar === 'roar' ? 'roar2' : 'roar'; }
    else if (roll < 0.75) { u.st.side = Math.random() < 0.5 ? -1 : 1; u.st.sideT = 0.18 + Math.random() * 0.18; }
  }
  /* AND THE ONES WAITING SLIDE OUT TO THEIR SLOTS. Without the turn a creature
   * at reach stood where it had arrived — behind the one swinging, in a file
   * — for as long as it waited. It drifts round you toward its slot now, at a
   * walk, and holds its range while it does, so the two without the turn end
   * up either side of the one with it. Measured standing still: the three
   * spanned 47 degrees round you before this, and a fight in a file is a
   * fight with one thing in it. */
  if (dist <= A.reach + 0.6 && mutToken !== u && u.st.atk < 0 && u.st.side === 0 && u.st.back <= 0 && u.st.dash <= 0 && u.st.recoil <= 0) {
    const ta = slotAngle(u, mutants, mutToken, MUT_SLOT_ANG);
    if (ta !== null) {
      const angU = Math.atan2(-dx, -dz);
      let d = ta - angU; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      const tx = -dz / dist, tz = dx / dist;
      const sw = Math.sign(d) * Math.min(1.5, Math.abs(d) * 2.5) * u.kind.anim.strafeK;
      const r = THREE.MathUtils.clamp((dist - (A.reach - 0.6)) * 1.4, -1, 1);
      p.x += (tx * sw + (dx / dist) * r * 1.2) * dt;
      p.z += (tz * sw + (dz / dist) * r * 1.2) * dt;
      p.x = THREE.MathUtils.clamp(p.x, WADE_X - 1.5, CLIFF_BLOCK_X + 0.5);
      if (Math.abs(d) > 0.12) moving = Math.max(moving, 0.3);
    }
  }
  mutSeparate(u, dt);
  /* and you do not walk through two hundred kilos of it — but it does not
   * get to press you into the furniture either. `shovePlayer` refuses the
   * push when the room has to correct it, so a man backed against a desk
   * stays where he is and the creature comes round instead of pinning him. */
  if (dist < 0.9) shovePlayer(p.x + (dx / dist) * 0.9, p.z + (dz / dist) * 0.9);
  mutAnim(u, dt, moving);
  aimBar(u, dt, dist);
}
/* THE BAR GOES WHERE HE IS SWINGING IT. An authored swing is a swing at the
 * air in front of him: it lands wherever his arm happens to put it, and
 * whether that is anywhere near YOU depends on how far away you were
 * standing, which way he was facing and which of six clips came up. So half
 * his blows passed a foot wide, the guard was never met by anything, and the
 * whole fight felt like it was happening beside you rather than to you.
 *
 * This is the same idea as `landBlade`, which puts the player's own blade on
 * the crosshair: the animation says WHEN and the correction says WHERE. The
 * shoulder is turned by the smallest rotation that takes the bar's line onto
 * your chest — smallest rotation and not a look-at, because the arm's roll
 * is the clip's and must survive — eased in through the startup, full over
 * the active window, and gone by the end of the recovery so nothing about
 * the recovery or the idle is touched. It is CLAMPED: past `AIM_MAX` he is
 * simply out of position and the blow misses, which is what keeps backing
 * away worth doing. A swing that always connects is not a fight either. */
/* AND THE ARM ALONE CANNOT DO IT. Measured with him squared up at 1.3 m,
 * the side swing's own contact frame leaves the bar 1.74 m from your chest —
 * the arc simply ends beside him — and closing that with the shoulder alone
 * would need most of a right angle of arm, which is a different swing, not
 * an aimed one. A fighter turns INTO a blow with his whole body. So the
 * correction is two things: a yaw on the MODEL (never on `u.g`, which is the
 * AI's own heading and must stay the AI's) that swings his frame round to
 * put the bar on your bearing, and then the shoulder for what is left, which
 * is mostly the height. Both are clamped and both are weighted by the same
 * ease, so a swing thrown from too far out or too far round still misses. */
const PATH_EVERY = 0.45;                   // how often he may re-ask the room the way
const AIM_YAW = 0.70;                      // how far his body may turn into it
const AIM_MAX = 0.80;                      // and how far the shoulder may bend it
const _abA = new THREE.Vector3(), _abB = new THREE.Vector3(), _abC = new THREE.Vector3();
const _abQ = new THREE.Quaternion(), _abP = new THREE.Quaternion(), _abInv = new THREE.Quaternion(), _abM = new THREE.Matrix4();
function aimBar(u, dt, dist) {
  if (!u.kind.human || !u.bones || !u.bones.arm || !u.bones.hand || !u.bones.fore) return;
  const A = swingOf(u);
  let w = 0;
  if (u.st.atk >= 0 && A) {
    const t = u.st.atk;
    // nothing during the wind-up you are meant to read; all of it on the way in
    if (t > A.wind * 0.55) w = THREE.MathUtils.clamp((t - A.wind * 0.55) / (A.wind * 0.45), 0, 1);
    if (t > A.wind + A.strike) w *= Math.max(0, 1 - (t - A.wind - A.strike) / (A.recover * 0.6));
  }
  u.aimW = (u.aimW || 0) + (w - (u.aimW || 0)) * Math.min(1, dt * 18);
  if (u.aimW < 0.004) { if (u.model) u.model.rotation.y = 0; return; }
  const arm = u.bones.arm;
  /* THE BODY TURNS FIRST, and it turns the MODEL, not `u.g`: the group's
   * heading belongs to the AI and to every distance test in the fight, and
   * a correction written into it would accumulate frame on frame. The bar's
   * own hitbox reads bone world positions, so it follows this for free —
   * the picture and the blow cannot come apart. */
  if (u.model) {
    u.model.rotation.y = 0;
    u.model.updateMatrixWorld(true);
    u.bones.hand.getWorldPosition(_abA);
    u.bones.fore.getWorldPosition(_abB);
    _abC.copy(_abA).addScaledVector(_abB.sub(_abA).normalize(), -0.62);   // the tip
    const rx = u.g.position.x, rz = u.g.position.z;
    let dy = Math.atan2(camera.position.x - rx, camera.position.z - rz)
           - Math.atan2(_abC.x - rx, _abC.z - rz);
    while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    u.model.rotation.y = THREE.MathUtils.clamp(dy, -AIM_YAW, AIM_YAW) * u.aimW;
    u.model.updateMatrixWorld(true);
  }
  arm.updateWorldMatrix(true, false);
  u.bones.hand.updateWorldMatrix(true, false);
  u.bones.fore.updateWorldMatrix(true, false);
  arm.getWorldPosition(_abA);                         // the shoulder: what turns
  u.bones.hand.getWorldPosition(_abB);
  u.bones.fore.getWorldPosition(_abC);
  // the bar runs on out past the fist along the forearm's line
  _abB.addScaledVector(_abC.sub(_abB).normalize(), -0.62);
  _abB.sub(_abA);                                     // shoulder to bar tip
  // where it should be: your chest, and never further than the arm can reach
  _abC.copy(camera.position); _abC.y -= 0.45;
  _abC.sub(_abA);
  const L = _abB.length() || 1e-6;
  _abC.normalize().multiplyScalar(L);
  _abB.normalize(); _abC.normalize();
  let ang = Math.acos(THREE.MathUtils.clamp(_abB.dot(_abC), -1, 1));
  if (!(ang > 1e-4)) return;
  const use = Math.min(ang, AIM_MAX) * u.aimW;
  _abQ.setFromUnitVectors(_abB, _abC);
  // only part of the way there: identity is "no correction", the full
  // rotation is "the bar on your chest", and `use / ang` is how far he gets
  if (use < ang) { _abP.identity(); _abQ.slerp(_abP, 1 - use / ang); }
  /* The turn is in WORLD space and the bone wants it in its parent's, which
   * is `Wp⁻¹ · Q · Wp`. It must come from `getWorldQuaternion` and NOT from
   * inverting `matrixWorld` and reading the rotation off that: the model is
   * scaled to the creature's height, and `setFromRotationMatrix` on a matrix
   * with scale in it is not a rotation at all — the arm flew a hundred
   * kilometres and the measurement read 244468 metres. */
  arm.parent.updateWorldMatrix(true, false);
  arm.parent.getWorldQuaternion(_abP);                // Wp
  _abInv.copy(_abP).invert();                         // Wp⁻¹
  _abQ.premultiply(_abInv).multiply(_abP);            // Wp⁻¹ · Q · Wp
  arm.quaternion.premultiply(_abQ);
  arm.updateMatrixWorld(true);
}
/* WHOSE TURN IT IS. The token used to be grabbed by whoever's cooldown came
 * up first, and a cooldown scales with `windK` — so the small fast one took
 * nearly every turn and the big slow one swung twice in a minute, which is
 * not a fight with three things in it, it is a fight with one and two
 * spectators. It is HANDED OUT now, once a frame, to whichever of them is in
 * range and has gone longest without a swing. Anything that cannot use it —
 * stunned, rocked, dead, or wandered out of reach — gives it straight back. */
function mutGiveToken(dt) {
  if (mutToken) {
    const st = mutToken.st;
    const d = Math.hypot(camera.position.x - mutToken.g.position.x, camera.position.z - mutToken.g.position.z);
    const A = mutToken.atk[st.swing] || MUT_ATTACKS[st.swing];
    if (!st.alive || st.stun > 0 || st.recoil > 0 || (st.atk < 0 && d > A.reach + 2.2)) mutToken = null;
    else return;
  }
  let best = null, bw = -1;
  for (const u of mutants) {
    const st = u.st;
    if (!st.alive || !st.awake || st.struck || st.stun > 0 || st.recoil > 0 || st.roar > 0) continue;
    st.wait += dt;
    const d = Math.hypot(camera.position.x - u.g.position.x, camera.position.z - u.g.position.z);
    const A = u.atk[st.swing] || MUT_ATTACKS[st.swing];
    if (d > A.reach + 1.6) continue;
    if (st.wait > bw) { bw = st.wait; best = u; }
  }
  if (best) mutToken = best;
}
function updateMutant(dt) {
  // the lens comes home after the take is dropped, not before it
  if (mutCutOut > 0) {
    mutCutOut = Math.max(0, mutCutOut - dt);
    mutCutFov = mutCutOut > 0 ? THREE.MathUtils.lerp(settings.fov, mutCutFov, mutCutOut / 0.4) : -1;
  }
  if (updateMutantCut(dt)) return;             // the cutscene drives them itself
  mutGiveToken(dt);
  mutNearest = 999;
  for (const u of mutants) {
    if (!u.st.alive || !u.st.awake) continue;
    mutNearest = Math.min(mutNearest, Math.hypot(camera.position.x - u.g.position.x, camera.position.z - u.g.position.z));
  }
  for (const u of mutants) updateMutantUnit(u, dt);
  updateMutSand(dt);
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
      // DEV MODE: no cutscene and no fight. They stay out where they wait.
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
    catchBreath();
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
  addInteractable(proxy, 'Who was this?', 'default', { bare: true });
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
// The underground bunker — PREPPED, NOT PLACED. Bohdan Lvov's scan of a
// control room (`models/underground-bunker.js`, `assets/bunker.glb` out of
// `tools/bunker_pack.py`), an exact replica of the room at human scale:
// steel floor, two vault doors, a ladder to a hatch, a wall of CRTs. Where
// it goes on the walk is not decided yet, so nothing here calls
// `spawnBunker()` — the harness does (`__bw.spawnBunker(x, y, z, yaw)`) to
// stand it anywhere for a look. When it is placed, that is the one call.
//
// It sits with its floor at the group's y and the room centred on it; the
// walk is done in the room's OWN frame (the inverse of its matrix) so it can
// stand at any heading: walls clamp, the ceiling caps a jump, and the
// furniture is a grid rasterised off the geometry at pack time, resolved by
// undoing the frame's move an axis at a time so you slide along a desk
// rather than stop dead against it. While you are in one the beach's
// clamps and colliders leave you alone, the drain's rule.
// ------------------------------------------------------------------
const bunkers = [];
let inBunker = null;
const _bkL = new THREE.Vector3(), _bkP = new THREE.Vector3();
function spawnBunker(x, y, z, yaw = 0, opts) {
  const g = makeUndergroundBunker(opts);
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  scene.add(g);
  g.updateMatrixWorld(true);
  const b = { group: g, inv: g.matrixWorld.clone().invert(), hidden: !!(opts && opts.hidden) };
  bunkers.push(b);
  if (!b.hidden) farProps.push({ obj: g, z, d: 260 });
  return b;
}
/* THE ROOM'S CLAMP, ON ITS OWN. `updateBunkers` runs early in the frame and
 * anything that moves the player AFTER it — a creature shouldering you out
 * of itself, a blow's knockback — lands you inside the furniture with no
 * correction until the next frame. That is not a rare edge: he presses you
 * into a desk, the push puts you in it, the clamp takes you out, he presses
 * again, and between the two you do not move at all. This is the whole of
 * "I keep getting stuck in a block in combat", and the answer is that
 * whatever displaces you calls this immediately afterwards. */
const _cpL = new THREE.Vector3();
function clampPlayerToRoom() {
  const b = inBunker; if (!b) return;
  const B = b.group.userData.bunker, nav = B.nav; if (!nav) return;
  const g = b.group, R = nav.room, pr = PLAYER_R * 0.75, r = 0.22;
  _cpL.copy(camera.position).applyMatrix4(b.inv);
  _cpL.x = THREE.MathUtils.clamp(_cpL.x, R.x0 + pr, R.x1 - pr);
  _cpL.z = THREE.MathUtils.clamp(_cpL.z, R.z0 + pr, R.z1 - pr);
  if (B.blocked(_cpL.x, _cpL.z, r)) {
    B.pushOut(_cpL, r, 5);
    if (B.blocked(_cpL.x, _cpL.z, r)) B.escape(_cpL, r, 3.2);
    if (B.blocked(_cpL.x, _cpL.z, r) && B.mainRegion) {
      const m = B.mainRegion(_cpL.x, _cpL.z);
      if (m) { _cpL.x = m.x; _cpL.z = m.z; }
    }
  }
  _cpL.applyMatrix4(g.matrixWorld);
  camera.position.x = _cpL.x; camera.position.z = _cpL.z;
}
/* And a body shouldering you aside must not shoulder you INTO something. It
 * pushes you off itself, the room takes the result, and if the room had to
 * move you the creature gives up rather than grinding you against a desk —
 * there is nowhere for you to go, so it goes round you instead. */
function shovePlayer(x, z) {
  const bx = camera.position.x, bz = camera.position.z;
  camera.position.x = x; camera.position.z = z;
  clampPlayerToRoom();
  const moved = Math.hypot(camera.position.x - x, camera.position.z - z);
  if (moved > 0.02) { camera.position.x = bx; camera.position.z = bz; return false; }
  return true;
}
function updateBunkers(dt) {
  const wasIn = inBunker;
  inBunker = null;
  for (const b of bunkers) {
    const g = b.group, B = g.userData.bunker;
    const dx = camera.position.x - g.position.x, dz = camera.position.z - g.position.z;
    /* The home under the beach is drawn only while you are in it or on the
     * way: forty metres under the sand it is out of every frustum but the
     * one looking straight down, and four hundred draw calls behind an
     * opaque beach is a price for nothing. */
    if (b.hidden) g.visible = wasIn === b || hatchBusy;
    if (Math.abs(dx) > 40 || Math.abs(dz) > 40) continue;
    if (g.visible) B.update(dt);        // the screens and the reels run while you can see them
    const nav = B.nav;
    if (!nav) continue;
    _bkL.copy(camera.position).applyMatrix4(b.inv);
    const R = nav.room, pr = PLAYER_R * 0.75;
    const feet = camBaseY - playerEye() - g.position.y;          // the room's floor is its y = 0
    if (_bkL.x <= R.x0 || _bkL.x >= R.x1 || _bkL.z <= R.z0 || _bkL.z >= R.z1) continue;
    if (feet < -0.6 || feet > R.h) continue;
    inBunker = b;
    groundY = g.position.y;             // the room's floor IS the floor: forty metres under the beach, "higher" is not the test
    // the walls
    _bkL.x = THREE.MathUtils.clamp(_bkL.x, R.x0 + pr, R.x1 - pr);
    _bkL.z = THREE.MathUtils.clamp(_bkL.z, R.z0 + pr, R.z1 - pr);
    /* THE FURNITURE PUSHES YOU OUT; IT DOES NOT STOP YOU. The first walk
     * undid a blocked move an axis at a time, and against anything that was
     * not a flat wall — the round trash can, a desk corner, a chair leg —
     * both axes read blocked and the whole move was thrown away: you stood
     * against a bin unable to step round it. This is a disc against the
     * grid's cells the way the player is a disc against the beach's rocks:
     * every blocked cell inside the disc pushes it out along the line from
     * the cell's nearest point, a few rounds until nothing overlaps. Round
     * a corner that comes out as sliding, which is what a body does. */
    _bkP.copy(_preMove).applyMatrix4(b.inv);
    const r = 0.22;                       // a hand narrower than the beach's body: the aisles are tight
    if (B.blocked(_bkL.x, _bkL.z, r)) {
      /* Push out along the resultant first — that is the slide, and it is
       * what carries you round a bin or along a desk front. But a resultant
       * CANCELS inside anything that surrounds you: between the legs of the
       * swivel chair every cell pushes the opposite way to another one, the
       * sum is nothing, and the old code then reverted the move, which is
       * standing still — the owner stuck on a chair mid-fight. So if the
       * push cannot free you, take the nearest clear spot outright. Only if
       * even that fails is the move refused, and there is nowhere in this
       * room where it can. */
      B.pushOut(_bkL, r, 5);
      if (B.blocked(_bkL.x, _bkL.z, r)) B.escape(_bkL, r, 3.2);
      /* AND IF EVEN THAT FAILS, THE ROOM SAYS WHERE THE FLOOR IS. Reverting
       * the frame is standing still, and standing still is the bug: a blow's
       * knockback can put you a metre inside the console bank in one frame,
       * which is deeper than `escape` looks, and from in there every move is
       * refused for ever. `mainRegion` is the largest connected piece of
       * walkable floor, worked out once, and it is never far — so the last
       * word is always somewhere you can stand rather than nowhere. */
      if (B.blocked(_bkL.x, _bkL.z, r) && B.mainRegion) {
        const m = B.mainRegion(_bkL.x, _bkL.z);
        if (m) { _bkL.x = m.x; _bkL.z = m.z; }
      }
      if (B.blocked(_bkL.x, _bkL.z, r)) { _bkL.x = _bkP.x; _bkL.z = _bkP.z; }
    }
    // the ceiling
    const top = g.position.y + R.h - 0.12;
    if (camBaseY > top) { camBaseY = top; if (vy > 0) vy = 0; }
    _bkL.applyMatrix4(g.matrixWorld);
    camera.position.x = _bkL.x; camera.position.z = _bkL.z;
  }
}
// ------------------------------------------------------------------
// The hatch. A steel lid in a concrete collar set flush in the dry sand
// between the snorkeler and the tall one, and the ONLY way into the bunker:
// the room itself stands forty metres under the beach (`BUNKER_Y`), sealed,
// where nothing on the walk can reach it. E on the lid and you are in the
// room at the foot of its ladder; E on the ladder and you are back on the
// sand beside the lid — each a cut of a second and a quarter under black,
// with the lid seen to open before it and heard to shut after it, because
// a climb you cannot see is a climb you can hear. The room is drawn only
// while you are in it or on the way.
// ------------------------------------------------------------------
const HATCH_X = 10.2, HATCH_Z = SNORK_Z - 58;    // dry sand, x past the highest swash, halfway to the tall one
const BUNKER_Y = -40;
const HATCH_DUR = 1.25, HATCH_BLACK = 0.44, HATCH_HOLD = 0.32;   // fade out by 0.44, black to 0.76, in by 1.25
let hatchBusy = false, hatchDir = 0, hatchT = 0, hatchCut = false, hatchClank = false;
let bunkerMix = 0, bunkerAudio = null;
const hatchReturn = { x: HATCH_X, z: HATCH_Z - 1.6, yaw: 0, set: false };
const blackoutEl = document.getElementById('blackout');
const hatch = new THREE.Group();
hatch.position.set(HATCH_X, 0, HATCH_Z);
hatch.rotation.y = 0.32;                         // a little off the beach's grain, like everything dropped on it
scene.add(hatch);
const hatchConcrete = new THREE.MeshStandardMaterial({ color: 0x737981, roughness: 1, metalness: 0, flatShading: true, emissive: 0x151920 });
const hatchSteel = new THREE.MeshStandardMaterial({ color: 0x4d545d, roughness: 0.66, metalness: 0.18, flatShading: true, emissive: 0x0b0d12 });
const hatchDark = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 1, flatShading: true });
let hatchLid = null, hatchBeacon = null;
{
  // the collar: a concrete kerb sunk in the sand, its well dark
  const collar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.34, 1.7), hatchConcrete);
  collar.position.y = 0.14 - 0.17; hatch.add(collar);
  const well = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.03, 1.18), hatchDark);
  well.position.y = 0.135; hatch.add(well);
  // the lid, hung on a bar along the landward edge
  hatchLid = new THREE.Group(); hatchLid.position.set(0.57, 0.15, 0); hatch.add(hatchLid);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.22, 8), hatchSteel);
  bar.rotation.x = Math.PI / 2; hatchLid.add(bar);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.07, 1.12), hatchSteel);
  plate.position.set(-0.56, 0.035, 0); hatchLid.add(plate);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 1.0), hatchSteel);
  rim.position.set(-0.56, 0.085, 0); hatchLid.add(rim);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.032, 0.84), hatchDark);
  inner.position.set(-0.56, 0.086, 0); hatchLid.add(inner);
  // the wheel
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.024, 8, 22), hatchSteel);
  wheel.rotation.x = Math.PI / 2; wheel.position.set(-0.56, 0.15, 0); hatchLid.add(wheel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), hatchSteel);
  hub.position.set(-0.56, 0.14, 0); hatchLid.add(hub);
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.025), hatchSteel);
    sp.position.set(-0.56, 0.15, 0); sp.rotation.y = i * Math.PI / 3; hatchLid.add(sp);
  }
  // rivets round the rim
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const rv = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 6), hatchSteel);
    rv.position.set(-0.56 + Math.cos(a) * 0.5, 0.075, Math.sin(a) * 0.5); hatchLid.add(rv);
  }
  // a marker lamp on a stub beside it — the one red thing on a blue beach,
  // so you find it from the waterline
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.62, 6), hatchSteel);
  post.position.set(0.72, 0.31, 0.62); hatch.add(post);
  const bc = document.createElement('canvas'); bc.width = bc.height = 32;
  const g2 = bc.getContext('2d');
  const gr = g2.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,90,60,1)'); gr.addColorStop(0.35, 'rgba(255,50,30,0.55)'); gr.addColorStop(1, 'rgba(255,40,20,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 32, 32);
  hatchBeacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  hatchBeacon.scale.setScalar(0.22); hatchBeacon.position.set(0.72, 0.66, 0.62); hatchBeacon.raycast = () => {}; hatch.add(hatchBeacon);
  // the crosshair finds the lid, open or shut
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy'; hit.position.y = 0.35; hatch.add(hit);
  // bedded in a low drift of the beach's own sand, and the collar a step you stand on
  const drift = new THREE.Mesh(makeApron(3.2), sandMat);
  drift.scale.set(3.2, 0.11, 3.2); drift.position.set(HATCH_X, 0, HATCH_Z); driftGroup.add(drift);
  rockColliders.push({ x: HATCH_X, z: HATCH_Z, r: 0.9, top: 0.14, mat: 'rock' });
  farProps.push({ obj: hatch, z: HATCH_Z, d: 260 });
}
// the room, under the sand with its ladder under the lid; drawn only while you are in it
let bunkerLadderProxy = null;
const bunkerHome = spawnBunker(HATCH_X + 1.05, BUNKER_Y, HATCH_Z + 3.3, 0, {
  hidden: true,
  onLoad: (S, g) => {
    const L = S.nav && S.nav.ladder;
    if (!L) return;
    // the way out: the ladder and the shaft above it, as one thing to aim at
    /* YOU LEAVE BY LOOKING AT THE HATCH. It used to be the ladder, and the
     * ladder is gone — but it was the wrong thing to aim at anyway: the way
     * out of this room is the steel lid you came in through, and it is
     * directly overhead. The proxy is a wide slab at the ceiling over where
     * the ladder stood, so looking up anywhere near it offers the way out. */
    const box = new THREE.BoxGeometry(L.x1 - L.x0 + 1.6, 0.5, L.z1 - L.z0 + 1.6);
    bunkerLadderProxy = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    bunkerLadderProxy.name = 'hitProxy';
    // just UNDER the ceiling, not the ladder's own top — that stood 43 cm
    // through the roof, which put the thing you aim at outside the room
    bunkerLadderProxy.position.set((L.x0 + L.x1) / 2, S.nav.room.h - 0.30, (L.z0 + L.z1) / 2);
    /* Warmed here and not only at the top of `animate`, because the frame
     * loop is exactly the thing that cannot be relied on — the preview pane
     * never runs one, and a tab in the background does not either. A tick
     * later, so the parse frame is not made longer than it already is. */
    setTimeout(() => warmBunker(g), 0);
    g.add(bunkerLadderProxy);
    bunkerLadderProxy.updateMatrixWorld(true);       // the room is hidden until you enter, and a hover raycast wants a fresh matrix
    addInteractable(bunkerLadderProxy, 'To Leave Bunker', 'action', { onActivate: leaveBunker, when: () => !!inBunker && !hatchBusy });
  },
});
bunkerHome.group.visible = false;
addInteractable(hatch, 'To Enter Bunker', 'action', { onActivate: enterBunker, when: () => !inBunker && !hatchBusy });

// ------------------------------------------------------------------
// The Blue Blood Dealer. He is already down there, standing at the far end
// with his hands empty, and he has been for a while. The first thing that
// happens when you come down the ladder is that he asks you a question you
// have no answer to; the only thing you can say back is nothing, and the
// crowbar comes up on the frame you say it.
//
// He is a MUT_KINDS entry, so every rule the beach spent a kilometre
// teaching is his too — the tell, the commit, the poise, the parry window,
// the riposte, the chain, the feint, the closing dash. What is different is
// that he is a man: he does not roar, does not throw sand, does not come
// apart, and goes down where he stood. And he is the first thing in the
// game that is faster than you.
// ------------------------------------------------------------------
/* The hook the physics asked for, filled in now that the room exists. It
 * answers only for a body actually down there — inside the walls and within
 * a couple of metres of the floor — because everything else in the game
 * takes the HIGHEST surface under it, and the highest surface under a
 * bottle in the bunker would be the beach forty metres over its head. */
bunkerFloorAt = (x, z, y) => {
  const B = bunkerHome.group.userData.bunker, nav = B.nav;
  if (!nav || y > BUNKER_Y + nav.room.h || y < BUNKER_Y - 2.5) return null;
  const g = bunkerHome.group, lx = x - g.position.x, lz = z - g.position.z, R = nav.room;
  if (lx < R.x0 || lx > R.x1 || lz < R.z0 || lz > R.z1) return null;
  return BUNKER_Y;
};
const DEALER_X = HATCH_X + 1.40, DEALER_Z = HATCH_Z + 7.30;  // by the console shelf, facing the ladder
const CROWBAR_SPOT = [HATCH_X + 2.30, HATCH_Z + 7.06];       // where the solved reach puts his hand: measured, on the shelf
let dealerMet = false, dealerFight = false, dealerWon = false;
/* THE BAR IS ON THE SHELF UNTIL HE WANTS IT. He is unarmed for the whole
 * conversation and the crowbar is lying an arm's length away on the console,
 * in plain view — so when the talking stops and he turns and takes it, you
 * have already seen what he is reaching for. `pickup` is its own clip; the
 * bar changes hands (shelf to fist) on the frame it closes, and the fight
 * begins when he comes up out of it. */
let dealerPick = -1, crowbarOnTable = null;
const PICK_DUR = 1.05, PICK_GRAB = 0.42;   // he snatches it; a slow reach read as a lag
const dealer = makeMutant(DEALER_X, DEALER_Z, 'dealer', BUNKER_Y);
dealer.g.visible = false;
dealer.g.rotation.y = Math.PI;                 // looking down the room at the ladder
/* AND HE HOLDS IT UNTIL THE FIGHT. He is a `mutants` entry, and everything
 * that walks that list — the room's push-out, the separation, the clamp that
 * ejects a body from furniture — can nudge a man who is supposed to be
 * standing still waiting for you. Come back from a checkpoint and he had
 * drifted off his mark and turned round, so the one line of dialogue in the
 * game was delivered by the back of his head. Where he stands and which way
 * he faces are WRITTEN DOWN, and until `dealerFight` he is put back on them
 * every frame. Nothing before the fight may move him, and once it starts
 * nothing puts him back. */
const DEALER_POST = { x: dealer.g.position.x, z: dealer.g.position.z, yaw: Math.PI };
const DEALER_SCRIPT = {
  start: {
    text: 'How did you get down here?',
    // there is nothing to say to that, and saying nothing is what starts it
    choices: [{ label: '…', act: () => startDealerPickup() }],
  },
};
// close on the mask: a tighter lens than anyone else gets, held on the head
// bone rather than on the spot he was standing when he started talking
const DEALER_NPC = { name: 'Blue Blood Dealer', script: DEALER_SCRIPT, sprite: dealer.g, headY: 1.80, fov: 13,
  // say nothing and he takes the bar; walk out on him and he takes it anyway
  onLeave: () => startDealerPickup() };
/* Take the bar off the shelf and put it in his hand. */
function dealerTakeBar() {
  if (crowbarOnTable) crowbarOnTable.visible = false;
  if (dealer.weapon) dealer.weapon.visible = true;
  sfxThud(0.05);
}
function startDealerPickup() {
  if (dealerPick >= 0 || dealerFight || !dealer.st.alive) return;
  dealerPick = 0;
  /* AND YOU WATCH HIM TAKE IT. The push-in used to be handed back the
   * instant the line was dismissed, so the one beat the whole scene is
   * built around — him turning to the shelf and picking the thing up —
   * happened as a two-inch figure at the far end of the room. The lens is
   * held through the reach and let go as he comes at you, which is also
   * the moment you want it back. */
  cineHold = true;
  dialogHead = dealer.head || null;
  dialogFov = 20;
  if (!dialogTarget) dialogTarget = new THREE.Vector3();
  dealer.g.getWorldPosition(dialogTarget); dialogTarget.y += 1.55;
}
function startDealerFight() {
  if (dealerFight || !dealer.st.alive) return;
  dealerFight = true;
  /* THE CROWBAR IS THE STARTING GUN. He is unarmed for the whole of the
   * conversation — it is its own mesh in the scan and simply switched off —
   * and it appears on the frame the taunt begins, which is the frame the
   * fight begins. Nothing else announces it. */
  dealerTakeBar();
  dealer.st.awake = true;
  dealer.st.roar = 0.45;                       // a beat to square up, and then he comes
  dealer.st.step = 0;
  dealer.st.cool = 0.25;
  setTimeout(() => sfxMutRoar(2, dealer.kind.voice), 120);
}
/* He stays in the room, and the room is the one he is standing in — the
 * fight AI works in world space and knows nothing about walls, so without
 * this he would walk out through the console bank and off down the beach
 * forty metres over his head. Same nav grid the player is held by. */
/* HE IS NEVER STUCK. The fight AI walks straight at you and knows nothing
 * about the room, so against a tripod, a chair or the corner of a desk he
 * simply pressed into it for as long as you stood behind it — and a boss you
 * can hide from behind a bin is not a boss. Two things, in this order:
 *
 * STEER, so he does not walk into it in the first place. The move the AI
 * made this frame is a direction; if the way along it is not clear for the
 * next stride, the same stride is spent on the nearest heading that IS
 * clear — fanned out in both directions, nearer first, so he rounds a desk
 * the short way and keeps his speed. That reads as walking round something.
 *
 * SLIDE, for whatever the steering did not catch. A blocked position is
 * pushed out along the resultant of the cells it overlaps (the same call the
 * player uses), never reverted — reverting is what standing still IS.
 */
const DEALER_PROBE = 0.62;                   // how far ahead he looks
const _dsA = new THREE.Vector3();
function steerDealer(prevX, prevZ) {
  const B = bunkerHome.group.userData.bunker;
  if (!B.nav || !B.clearAhead) return;
  const g = bunkerHome.group, p = dealer.g.position;
  let dx = p.x - prevX, dz = p.z - prevZ;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) return;
  const lx = prevX - g.position.x, lz = prevZ - g.position.z;
  let ux = dx / len, uz = dz / len;
  if (B.clearAhead(lx, lz, ux, uz, DEALER_PROBE, 0.32)) {
    dealer.wedge = 0;
    return;
  }
  /* Fan out — now the WHOLE way round. It used to stop at ±115°, which is
   * enough to round a bin and not enough to leave a table: the table's long
   * side and the wall make a pocket, every heading within two thirds of a
   * turn of the player is blocked, and he stood in it grinding against the
   * legs. Past ±115° the only headings left are backwards, and backwards out
   * of a pocket is exactly what a man does. Nearest first, so he still
   * prefers to keep coming. */
  for (let a = 0.35; a <= Math.PI + 0.01; a += 0.35) {
    for (const sgn of (dealer.turnBias > 0 ? [1, -1] : [-1, 1])) {
      const c = Math.cos(a * sgn), sn = Math.sin(a * sgn);
      const cx = ux * c - uz * sn, cz = ux * sn + uz * c;
      if (B.clearAhead(lx, lz, cx, cz, DEALER_PROBE, 0.32)) {
        p.x = prevX + cx * len; p.z = prevZ + cz * len;
        /* And the further round he had to look, the longer he commits to
         * going that way. A 20-degree nudge is a slide along a desk front
         * and can be reconsidered next frame; a 90-degree turn is a DECISION
         * to go round something, and re-deciding it every frame at a corner
         * is how he ground to a halt against the table in the first place. */
        dealer.turnBias = sgn;
        dealer.turnHold = 0.7 + a * 0.55;
        dealer.wedge = 0;
        return;
      }
    }
  }
  /* NOTHING IS CLEAR AT ALL. He is inside something; `clampDealer` ejects
   * him and this only has to stop him walking straight back in. */
  dealer.wedge = (dealer.wedge || 0) + 1;
  if (dealer.wedge > 6) {
    p.x = prevX - ux * len; p.z = prevZ - uz * len;
    dealer.turnBias = -(dealer.turnBias || 1); dealer.turnHold = 1.1;
    dealer.wedge = 0;
  }
}
/* AND FINDING A HEADING IS NOT THE SAME AS GETTING ANYWHERE. This is what
 * actually had him on the table, and no amount of widening the fan would
 * have fixed it: in a pocket between the furniture and the wall the NEAREST
 * clear heading points further into the pocket, he takes it, the push-out
 * cancels the step, and next frame the same heading is nearest again. He is
 * not stuck and not blocked — every frame he "found a way" — he simply never
 * moves. Traced: the same 140-degree turn chosen for four seconds while his
 * position changed by two centimetres.
 *
 * So the test is PROGRESS, not clearance. If he has barely moved for most of
 * a second while he is trying to reach you, the fan's opinion is worthless
 * and he picks the heading with the most ROOM down it instead — probed three
 * times as far — and commits to it long enough to actually leave. That is
 * what a person does on the wrong side of a table: stop shouldering it and
 * walk the long way round. */
function unstickDealer(dt, dist) {
  const B = bunkerHome.group.userData.bunker;
  if (!B.nav || !B.route || !dealer.st.awake) { dealer.grind = 0; dealer.path = null; return; }
  /* AND HE ROUTES TO YOU WHENEVER THE DIRECT WAY IS SHUT, not only once he
   * has already ground to a halt. Standing behind the table was enough: the
   * fan would take him at it, the push-out would hold him off it, and he
   * would work along its edge for a second before the grind noticed. If the
   * straight line between him and you crosses furniture and he is not
   * already on a route, he asks the room for one — every `PATH_EVERY`, so it
   * is a handful of searches in a fight and not one a frame. */
  const g0 = bunkerHome.group;
  dealer.pathAge = (dealer.pathAge || 0) + dt;
  /* AND HE MAY ASK FROM CLOSE UP. The old gate was two and a half metres,
   * which is exactly the range at which a table between you is the whole
   * problem: he could see you, he was nearly on you, and he was never
   * allowed to ask the way round. Anything past his own reach counts. */
  if (!dealer.path && dealer.pathAge > PATH_EVERY && dist > 1.3) {
    dealer.pathAge = 0;
    const alx = dealer.g.position.x - g0.position.x, alz = dealer.g.position.z - g0.position.z;
    const px = camera.position.x - g0.position.x, pz = camera.position.z - g0.position.z;
    const dx0 = px - alx, dz0 = pz - alz, L0 = Math.hypot(dx0, dz0) || 1;
    if (B.clearAhead && !B.clearAhead(alx, alz, dx0 / L0, dz0 / L0, Math.min(L0, 3.0), 0.34)) {
      const r0 = B.route(alx, alz, px, pz, 0.32);
      if (r0 && r0.length > 1) { dealer.path = r0; dealer.pathI = 0; }
    }
  }
  /* AND HE CAN BE STUCK MID-SWING. This used to give up the moment `st.atk`
   * went positive, which is most of the time — he is attacking, chaining or
   * recovering for the better part of a fight — so a body wedged into the
   * console bank between two swings never once asked for a way out. A swing
   * does not move him much by itself, so the grind is simply slower to
   * trigger while he is in one rather than switched off. */
  const swinging = dealer.st.atk >= 0;
  const g = bunkerHome.group, p = dealer.g.position;
  const q = dealer.lastAt || (dealer.lastAt = { x: p.x, z: p.z });
  const moved = Math.hypot(p.x - q.x, p.z - q.z);
  q.x = p.x; q.z = p.z;
  // grinding: trying to close, and not closing
  dealer.grind = (moved < 0.035 && dist > 2.2) ? (dealer.grind || 0) + dt : 0;
  if (dealer.grind < (swinging ? 2.2 : 0.7)) return;
  dealer.grind = 0;
  /* ASK THE ROOM. The greedy fan has just proved it cannot get out of
   * wherever he is, so stop asking it: a breadth-first search over the free
   * cells returns the actual way round the table, and he walks it. Recomputed
   * only when he grinds, which is rarely, and thinned to corners so following
   * it is three or four waypoints and not four hundred. */
  const lx = p.x - g.position.x, lz = p.z - g.position.z;
  const tx = camera.position.x - g.position.x, tz = camera.position.z - g.position.z;
  const path = B.route(lx, lz, tx, tz, 0.32);
  /* AND IF THE ROUTE STOPS A LONG WAY SHORT, he is not on the same piece of
   * floor as you — one of the two pockets behind the furniture, which
   * nothing his size walks out of. He steps back into the main room rather
   * than standing in a gap for the rest of the fight. */
  const endsAt = path && path.length ? path[path.length - 1] : null;
  if (!endsAt || Math.hypot(endsAt.x - tx, endsAt.z - tz) > 2.6) {
    const m = B.mainRegion && B.mainRegion(lx, lz);
    if (m && m.d > 0.05) {
      p.x = g.position.x + m.x; p.z = g.position.z + m.z;
      dealer.path = null; dealer.lastAt = { x: p.x, z: p.z };
      return;
    }
  }
  dealer.path = (path && path.length) ? path : null;
  dealer.pathI = 0;
}
/* Walk the route he was given, corner to corner, until it runs out or he can
 * see his way again. It is dropped the moment the plain approach is working,
 * because a path is a way out of a corner and not a way of getting about. */
function followPath(dt) {
  if (!dealer.path) return false;
  const g = bunkerHome.group, p = dealer.g.position;
  /* A route is a way ROUND something. The moment the direct line is open he
   * drops it and comes straight at you, or he would walk his corners while
   * you stood in front of him. */
  const B0 = g.userData.bunker;
  const alx = p.x - g.position.x, alz = p.z - g.position.z;
  const px = camera.position.x - g.position.x, pz = camera.position.z - g.position.z;
  const ddx = px - alx, ddz = pz - alz, dL = Math.hypot(ddx, ddz) || 1;
  if (B0.clearAhead && B0.clearAhead(alx, alz, ddx / dL, ddz / dL, Math.min(dL, 3.0), 0.34)) {
    dealer.path = null; return false;
  }
  const wp = dealer.path[dealer.pathI];
  if (!wp) { dealer.path = null; return false; }
  const tx = g.position.x + wp.x, tz = g.position.z + wp.z;
  const dx = tx - p.x, dz = tz - p.z, L = Math.hypot(dx, dz);
  if (L < 0.34) {
    dealer.pathI++;
    if (dealer.pathI >= dealer.path.length) { dealer.path = null; }
    return true;
  }
  const sp = MUT_SPEED * dealer.kind.speedK * 0.92 * dt;
  p.x += (dx / L) * sp; p.z += (dz / L) * sp;
  dealer.g.rotation.y = Math.atan2(-dx / L, -dz / L) + Math.PI;   // he faces where he is going
  return true;
}
function clampDealer(dt) {
  const B = bunkerHome.group.userData.bunker, nav = B.nav;
  if (!nav) return;
  const g = bunkerHome.group, p = dealer.g.position;
  dealer.turnHold = Math.max(0, (dealer.turnHold || 0) - dt);
  if (dealer.turnHold <= 0) dealer.turnBias = 0;
  const R = nav.room, m = 0.42;
  _dsA.set(THREE.MathUtils.clamp(p.x - g.position.x, R.x0 + m, R.x1 - m), 0,
           THREE.MathUtils.clamp(p.z - g.position.z, R.z0 + m, R.z1 - m));
  if (B.blocked(_dsA.x, _dsA.z, 0.32)) {
    B.pushOut(_dsA, 0.32, 5);
    _dsA.x = THREE.MathUtils.clamp(_dsA.x, R.x0 + m, R.x1 - m);
    _dsA.z = THREE.MathUtils.clamp(_dsA.z, R.z0 + m, R.z1 - m);
    // and if the push could not free him — wedged in a corner of the desk —
    // the last spot he stood clear in is better than standing in furniture
    if (B.blocked(_dsA.x, _dsA.z, 0.32)) B.escape(_dsA, 0.32);
    if (B.blocked(_dsA.x, _dsA.z, 0.32) && dealer.lastGood) {
      _dsA.x = dealer.lastGood.x; _dsA.z = dealer.lastGood.z;
    }
  }
  if (!B.blocked(_dsA.x, _dsA.z, 0.32)) dealer.lastGood = { x: _dsA.x, z: _dsA.z };
  p.x = g.position.x + _dsA.x; p.z = g.position.z + _dsA.z;
  p.y = BUNKER_Y;
}
/* WHAT IS LYING ABOUT DOWN THERE, AND WHAT HAPPENS TO IT. The room came
 * with four hundred meshes and not one of them could be touched. These six
 * can: they are `PhysProp` bodies like everything on the beach, so you pick
 * one up with E, throw it with a click, and it breaks — on the wall, on the
 * floor, on him — and the shovel breaks them too, because `glassStrike`
 * walks every prop with an `onImpact` and the swing already raycasts them.
 *
 * They are PLACED BY RAYCAST, not by guessed heights: a ray down the room's
 * own meshes from ceiling height finds the desk, the console shelf, the
 * cupboard or the floor, whichever is actually under that spot. Guessing
 * would have put half of them inside a desk and the other half floating.
 */
const bunkerProps = [];
function makeBunkerGlass(kind) {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({
    color: kind === 'jar' ? 0x9fb4a6 : 0x8fa9b8, roughness: 0.16, metalness: 0,
    transparent: true, opacity: 0.55, emissive: 0x141c22, flatShading: true, side: THREE.DoubleSide });
  const cap = new THREE.MeshStandardMaterial({ color: 0x6d6555, roughness: 0.8, metalness: 0.3, flatShading: true, emissive: 0x0b0a08 });
  if (kind === 'jar') {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.15, 10), glass));
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.03, 10), cap);
    lid.position.y = 0.088; g.add(lid);
  } else {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.20, 9), glass);
    g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.038, 0.075, 8), glass);
    neck.position.y = 0.135; g.add(neck);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.022, 8), cap);
    lid.position.y = 0.182; g.add(lid);
    // what is in it: the blue that the man downstairs deals in
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.052, 0.12, 9),
      new THREE.MeshStandardMaterial({ color: 0x2a6fa8, roughness: 0.3, transparent: true, opacity: 0.85, emissive: 0x0d3350, emissiveIntensity: 1.6, flatShading: true }));
    fill.position.y = -0.04; g.add(fill);
  }
  return g;
}
function makeBunkerElectronic(kind) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: kind === 'radio' ? 0x4a4335 : 0x33383c, roughness: 0.82, metalness: 0.16, flatShading: true, emissive: 0x0a0b0c });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15181a, roughness: 0.9, flatShading: true });
  if (kind === 'valve') {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.11, 10),
      new THREE.MeshStandardMaterial({ color: 0xb9c4c9, roughness: 0.1, transparent: true, opacity: 0.42, emissive: 0x2a1c0a, emissiveIntensity: 1.4, flatShading: true })));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xb9c4c9, roughness: 0.1, transparent: true, opacity: 0.42, flatShading: true }));
    dome.position.y = 0.055; g.add(dome);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.03, 10), dark);
    base.position.y = -0.068; g.add(base);
    const fil = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.06, 0.006),
      new THREE.MeshBasicMaterial({ color: 0xff9a4a }));
    g.add(fil);
    return g;
  }
  const w = kind === 'radio' ? 0.30 : 0.26, h = kind === 'radio' ? 0.17 : 0.22, d = kind === 'radio' ? 0.17 : 0.24;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shell));
  const face = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, h * 0.66, 0.012),
    new THREE.MeshStandardMaterial({ color: kind === 'radio' ? 0x2b2a24 : 0x1b2830, roughness: 0.24,
      emissive: kind === 'radio' ? 0x241a06 : 0x123040, emissiveIntensity: 1.5, flatShading: true }));
  face.position.z = d / 2 + 0.004; g.add(face);
  for (let i = 0; i < (kind === 'radio' ? 2 : 3); i++) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.02, 8), dark);
    k.rotation.x = Math.PI / 2;
    k.position.set(-w / 2 + 0.05 + i * 0.055, -h / 2 + 0.035, d / 2 + 0.012); g.add(k);
  }
  return g;
}
/* THE ROOM IS MOSTLY ELECTRICAL, SO MOST OF WHAT BREAKS SHOULD BE. Eight
 * props with two screens between them made a control room you could barely
 * damage; there are eighteen now and eleven of them are sets, monitors and
 * gauges, laid along the console bank and the desks where a man thrown
 * across the room actually lands. Every one takes a blow from the shovel, a
 * thrown bottle, or two hundred pounds of body arriving at speed, and every
 * one goes the same way: the case in pieces, the tube in shards, and a
 * fistful of sparks off the break. */
const BUNKER_PROP_SPOTS = [
  [-2.15, -3.30, 'bottle'], [-1.55, 1.05, 'jar'],   [2.05, -0.60, 'bottle'],
  [1.35, 4.15, 'monitor'],  [-1.75, 4.35, 'radio'], [0.95, -4.60, 'valve'],
  [-2.25, 2.60, 'valve'],   [2.15, 2.35, 'jar'],
  [-0.35, 4.45, 'monitor'], [0.55, 4.40, 'radio'],  [2.05, 3.60, 'monitor'],
  [-2.20, 3.75, 'monitor'], [1.95, -2.40, 'radio'], [-2.10, -1.35, 'monitor'],
  [2.10, 0.85, 'radio'],    [-2.30, -4.55, 'monitor'], [0.15, -4.70, 'radio'],
  [-0.95, -3.55, 'valve'],
];
/* THE COAT STAND. Everything else breakable in here sits ON something and
 * waits to be hit; this one stands in the room at head height and goes if
 * ANYBODY walks into it — you, him, or a body arriving at speed. It is the
 * one piece of furniture that is part of the fight rather than scenery the
 * fight happens near: back off through it and it comes down, shove him into
 * it and it comes down, and either way there is suddenly a pile of dowel
 * across the floor where a second ago there was a thing to walk round.
 *
 * It is NOT in the nav grid. A thing that breaks when you touch it must not
 * also be a wall — walking into it IS the interaction, and a body that
 * stopped at it would never get to knock it over. */
const COAT_MAT = new THREE.MeshStandardMaterial({ color: 0x6b573d, roughness: 0.95, flatShading: true, emissive: 0x140f08 });
let coatStand = null, coatBroken = false;
function makeCoatStand() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.72, 8), COAT_MAT);
  post.position.y = 0.86; g.add(post);
  // three splayed feet
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.44, 6), COAT_MAT);
    leg.position.set(Math.sin(a) * 0.15, 0.12, Math.cos(a) * 0.15);
    leg.rotation.set(Math.cos(a) * 0.55, 0, -Math.sin(a) * 0.55);
    g.add(leg);
  }
  // and four hooks near the top, turned up at the ends
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.20, 6), COAT_MAT);
    arm.position.set(Math.sin(a) * 0.09, 1.60, Math.cos(a) * 0.09);
    arm.rotation.set(Math.cos(a) * 1.15, 0, -Math.sin(a) * 1.15);
    g.add(arm);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), COAT_MAT);
    tip.position.set(Math.sin(a) * 0.18, 1.66, Math.cos(a) * 0.18);
    g.add(tip);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), COAT_MAT);
  knob.position.y = 1.74; g.add(knob);
  return g;
}
/* IT COMES APART INTO WHAT IT WAS MADE OF. The first version deleted the
 * stand and threw fourteen identical dowels, and a shower of dowel where a
 * coat stand was is not a coat stand breaking — it is a coat stand being
 * replaced by dowel. Every piece it is BUILT from leaves instead: the three
 * feet, the four hooks, their four tips, the knob, and the post itself SPLIT
 * into three lengths at a break the impact chooses. Each one leaves from
 * where it actually stood, carrying the rotation it was drawn with, and the
 * long post pieces tumble end over end while the little parts spin. The
 * lengths are then splintered — the split ends are cut on a slant, so a
 * broken post reads as broken and not as sawn. */
function smashCoatStand(speed, atY) {
  if (coatBroken || !coatStand) return;
  coatBroken = true;
  coatStand.updateMatrixWorld(true);
  const p = coatStand.position.clone();
  const gy = floorFor(p);
  const kick = Math.min(2.6, 0.7 + speed * 0.18);
  const hitY = (atY === undefined ? gy + 1.0 : atY) - p.y;
  const _wp = new THREE.Vector3(), _wq = new THREE.Quaternion(), _ws = new THREE.Vector3();
  const fling = (m, wy, heavy) => {
    scene.add(m);
    // out from the post, and hardest where it was struck
    const a = Math.atan2(m.position.x - p.x, m.position.z - p.z) + (Math.random() - 0.5) * 1.1;
    const near = 1 - Math.min(1, Math.abs(wy - (p.y + hitY)) / 1.2);
    const out = (0.5 + Math.random() * kick) * (0.45 + near);
    const spin = heavy ? 7 : 16;
    gibs.push({
      m, vel: new THREE.Vector3(Math.sin(a) * out, 0.9 + Math.random() * 1.5 + near * 0.9, Math.cos(a) * out),
      spin: new THREE.Vector3((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin),
      rest: gy + (heavy ? 0.03 : 0.02) + Math.random() * 0.02, life: 150, bleed: false,
    });
  };
  // the parts, each from where it stood
  for (const c of [...coatStand.children]) {
    c.updateMatrixWorld(true);
    c.matrixWorld.decompose(_wp, _wq, _ws);
    const isPost = c.geometry.parameters && c.geometry.parameters.height > 1.0;
    if (!isPost) {
      const m = new THREE.Mesh(c.geometry, COAT_MAT);
      m.position.copy(_wp); m.quaternion.copy(_wq);
      fling(m, _wp.y, false);
      continue;
    }
    /* THE POST SPLITS. Three lengths, cut at the height it was hit and once
     * more at random, with the broken faces slanted — a cylinder capped
     * square at both ends is a dowel, and a dowel is not a broken post. */
    const H = c.geometry.parameters.height;
    // the first break is AT the height it was struck — `hitY` is already
    // measured from the stand's foot, so it wants no offset on top
    const cuts = [0, THREE.MathUtils.clamp(hitY / H, 0.20, 0.74), 0, 1].slice(0);
    cuts[2] = THREE.MathUtils.clamp(cuts[1] + 0.18 + Math.random() * 0.3, cuts[1] + 0.12, 0.94);
    cuts.sort((x, y) => x - y);
    for (let i = 0; i < cuts.length - 1; i++) {
      const len = (cuts[i + 1] - cuts[i]) * H;
      if (len < 0.05) continue;
      const g2 = new THREE.CylinderGeometry(0.033, 0.043, len, 8, 1);
      // slant the two broken faces, and only those
      const pos = g2.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const y = pos.getY(v);
        if (i > 0 && y < -len / 2 + 1e-3) pos.setY(v, y + pos.getX(v) * 0.35 + 0.012);
        if (i < cuts.length - 2 && y > len / 2 - 1e-3) pos.setY(v, y + pos.getZ(v) * 0.32 - 0.012);
      }
      pos.needsUpdate = true; g2.computeVertexNormals();
      const m = new THREE.Mesh(g2, COAT_MAT);
      const mid = (cuts[i] + cuts[i + 1]) / 2;
      m.position.set(_wp.x, p.y + (mid * H), _wp.z);
      m.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * 6, (Math.random() - 0.5) * 0.3);
      fling(m, m.position.y, true);
    }
  }
  scene.remove(coatStand);
  sfxCrateBreak();
  hitstop = Math.max(hitstop, 0.03);
}
/* Anybody who walks into it brings it down — and a body sliding through it
 * counts, which is what `ragSmash` is already doing to the glassware. */
function updateCoatStand() {
  if (coatBroken || !coatStand || !inBunker) return;
  const p = coatStand.position, R = 0.34;
  const near = (x, z, r) => (x - p.x) * (x - p.x) + (z - p.z) * (z - p.z) < (R + r) * (R + r);
  if (near(camera.position.x, camera.position.z, 0.22)) { smashCoatStand(6, camBaseY - playerEye() + 1.1); return; }
  if (dealer.st.alive && dealer.g.visible && near(dealer.g.position.x, dealer.g.position.z, 0.32)) { smashCoatStand(7, p.y + 1.1); return; }
  for (const u of mutants) {
    if (!u.rag || u.rag.asleep) continue;
    for (const q of u.rag.parts) if (near(q.p.x, q.p.z, q.r) && q.p.y < p.y + 1.9) { smashCoatStand(9, q.p.y); return; }
  }
}
function buildBunkerProps() {
  const g = bunkerHome.group, S = g.userData.bunker;
  if (!S.ready || bunkerProps.length) return;
  const R = S.nav.room;
  const room = { x0: g.position.x + R.x0, x1: g.position.x + R.x1,
                 z0: g.position.z + R.z0, z1: g.position.z + R.z1, y1: g.position.y + R.h };
  const meshes = [];
  S.root.traverse((o) => { if (o.isMesh && o.name !== 'hitProxy') meshes.push(o); });
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  for (const [lx, lz, kind] of BUNKER_PROP_SPOTS) {
    // whatever is actually under that spot: a desk, the console shelf, the floor
    const from = new THREE.Vector3(g.position.x + lx, g.position.y + 2.9, g.position.z + lz);
    ray.set(from, down); ray.far = 3.4;
    const hit = ray.intersectObjects(meshes, false);
    const top = hit.length ? hit[0].point.y : g.position.y;
    const glass = kind === 'bottle' || kind === 'jar' || kind === 'valve';
    const mesh = glass && kind !== 'valve' ? makeBunkerGlass(kind) : makeBunkerElectronic(kind);
    mesh.position.set(from.x, top + (kind === 'monitor' || kind === 'radio' ? 0.12 : 0.10), from.z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    const name = kind === 'bottle' ? 'bottle' : kind === 'jar' ? 'jar' : kind === 'valve' ? 'valve'
      : kind === 'radio' ? 'set' : 'monitor';
    const radius = kind === 'monitor' || kind === 'radio' ? 0.15 : 0.08;
    /* It sits on whatever the ray found, and only while it is still there:
     * a hand's width off the spot and the shelf stops answering, so knocking
     * one off a desk drops it to the steel — which is usually the end of it. */
    const shelfY = top, sx = from.x, sz = from.z;
    const prop = makeProp(mesh, name, {
      radius, restH: radius * 0.7, mass: glass ? 0.5 : 1.4, bounce: 0.14, friction: 0.72,
      floorAt: (px, pz) => (Math.abs(px - sx) < 0.30 && Math.abs(pz - sz) < 0.30 ? shelfY : null),
      confine: room,
    });
    /* Anything with an `onImpact` is breakable, and both doors into it —
     * a hard throw and the shovel — come through here. Glass goes at a
     * knock; a set takes rather more. */
    prop.onImpact = (speed) => {
      if (kind === 'monitor' || kind === 'radio') smashElectronics(prop, mesh, speed, 0.18, 4.0);
      else if (kind === 'valve') smashElectronics(prop, mesh, speed, 0.07, 2.6);
      else shatterGlass(prop, mesh, speed, 0.09, 3.0);
    };
    bunkerProps.push(prop);
  }
  /* And the coat stand, in the open by the -x wall where the aisle is
   * widest — somewhere you will back into rather than somewhere you must
   * deliberately go. Its spot is checked against the walk grid so it never
   * starts inside a desk. */
  if (!coatStand) {
    coatStand = makeCoatStand();
    /* IN A CORNER, WHERE A COAT STAND GOES. It stood out on the open floor
     * first and read as something dropped in the middle of a room; against
     * the wall at the far end it is furniture, and backing into that corner
     * away from him is a thing you do rather than a thing you have to aim
     * for. The spot is measured against the walk grid — the very first one
     * was inside a desk. */
    coatStand.position.set(g.position.x + 2.45, g.position.y, g.position.z + 5.21);
    coatStand.frustumCulled = false;
    scene.add(coatStand);
  }
}
function buildCrowbarOnTable() {
  if (crowbarOnTable || !dealer.weapon || !bunkerHome.group.userData.bunker.ready) return;
  const g = bunkerHome.group;
  const meshes = [];
  g.userData.bunker.root.traverse((o) => { if (o.isMesh && o.name !== 'hitProxy') meshes.push(o); });
  const ray = new THREE.Raycaster();
  ray.set(new THREE.Vector3(CROWBAR_SPOT[0], g.position.y + 2.9, CROWBAR_SPOT[1]), new THREE.Vector3(0, -1, 0));
  ray.far = 3.4;
  const hit = ray.intersectObjects(meshes, false);
  const top = hit.length ? hit[0].point.y : g.position.y + 0.9;
  /* His own crowbar, laid down: the skinned mesh's geometry is the bind
   * pose, which puts it out at the end of a T-posed arm, so it is centred on
   * its own bounds first. Same mesh, same map — it has to be recognisably
   * the thing he is about to be holding. */
  const geo = dealer.weapon.geometry;
  geo.computeBoundingBox();
  const c = geo.boundingBox.getCenter(new THREE.Vector3());
  const bar = new THREE.Mesh(geo, dealer.weapon.material);
  bar.position.set(-c.x, -c.y, -c.z);
  bar.frustumCulled = false;
  const holder = new THREE.Group();
  holder.add(bar);
  holder.scale.setScalar(dealer.model ? dealer.model.scale.x : 1);
  holder.position.set(CROWBAR_SPOT[0], top + 0.035, CROWBAR_SPOT[1]);
  holder.rotation.set(0, 0.6, Math.PI / 2);      // lying on its side across the shelf
  scene.add(holder);
  crowbarOnTable = holder;
}
function updateDealer(dt) {
  const inRoom = inBunker === bunkerHome;
  buildBunkerProps();
  buildCrowbarOnTable();
  if (crowbarOnTable) crowbarOnTable.visible = bunkerHome.group.visible && !dealerFight && dealerPick < PICK_GRAB * PICK_DUR;
  // the reach: driven off its own clock so the grab lands on the right frame
  if (dealerPick >= 0 && !dealerFight) {
    const was = dealerPick;
    dealerPick += dt;
    dealer.holdAnim = true;                    // mutAnim would fade this straight back out for the idle
    const a = mutPlay(dealer, 'pickup', false);
    if (a) { a.paused = true; a.time = Math.min(a.getClip().duration - 0.001, (dealerPick / PICK_DUR) * a.getClip().duration); }
    if (dealer.mixer) dealer.mixer.update(dt);
    if (was < PICK_GRAB * PICK_DUR && dealerPick >= PICK_GRAB * PICK_DUR) dealerTakeBar();
    if (dealerPick >= PICK_DUR) {
      dealerPick = -1; dealer.holdAnim = false;
      cineHold = false; dialogTarget = null; dialogHead = null; dialogFov = DIALOG_FOV;
      startDealerFight();
    }
    return;
  }
  dealer.g.visible = bunkerHome.group.visible && !!dealer.model;
  /* His mark. Through the wait, the dialogue and the reach for the bar he is
   * exactly where he was put and facing the ladder, whatever the frame did. */
  if (!dealerFight && dealer.st.alive) {
    dealer.g.position.set(DEALER_POST.x, BUNKER_Y, DEALER_POST.z);
    dealer.g.rotation.y = DEALER_POST.yaw;
    dealer.prevPos = { x: DEALER_POST.x, z: DEALER_POST.z };
  }
  /* He does not fight the ceiling. Leave by the ladder mid-exchange and he
   * stops where he is rather than pacing the room after a player who is
   * forty metres above him; come back down and he picks it straight up. */
  if (dealer.st.alive) dealer.st.awake = dealerFight && inRoom && !hatchBusy;
  /* Before the crowbar comes out he stands like a man waiting, not like a
   * man on guard — the fighting stance with nothing in his hands reads as
   * a mime. `drawGait` picks the idle for him from his kind, so the idle is
   * simply held to `calm` until the fight starts. */
  if (!dealerFight && dealer.st.alive) dealer.gait = { walk: 'walk', run: 'run', idle: 'calm', idleRate: 1 };
  if (dealer.model) {
    // a route out of a corner, if he was given one, comes before the fan
    const onPath = followPath(dt);
    if (dealer.prevPos && !onPath) steerDealer(dealer.prevPos.x, dealer.prevPos.z);
    clampDealer(dt);
    unstickDealer(dt, Math.hypot(dealer.g.position.x - camera.position.x, dealer.g.position.z - camera.position.z));
    dealer.prevPos = { x: dealer.g.position.x, z: dealer.g.position.z };
  }
  if (!dealerWon && !dealer.st.alive && dealer.st.deadT > 0.5) dealerWon = true;
}

/* THE FIRST LOOK MUST NOT COST A SECOND. Four hundred meshes and seventeen
 * megabytes of texture upload and compile on the first frame they are drawn,
 * and setting `visible` at the press put all of it in the frame you pressed
 * E — a hard freeze exactly where the transition had to be seamless, with
 * the fade and the sound running on behind it. So the room is warmed once,
 * early, the way the drain is.
 *
 * AND IT MUST BE WARMED ON THE CANVAS, NOT INTO A RENDER TARGET. The drain's
 * warm-up renders into an 8x8 target, and doing the same here bought
 * nothing: a target has its own output colour space, so three compiles a
 * DIFFERENT program for every material and the canvas pays the whole bill
 * again the first time you really look. Measured: warmed into a target the
 * first real frame still cost 116 ms; warmed through the canvas it is 27,
 * and that one lands while the screen is black. A four-pixel scissor keeps
 * the fill at nothing and keeps the clear inside the box, so the frame the
 * player is looking at is untouched. */
let bunkerWarmed = false;
function warmBunker(group) {
  const g = group || (bunkerHome && bunkerHome.group);
  if (bunkerWarmed || !g || !g.userData.bunker.ready) return;
  bunkerWarmed = true;
  const wasVisible = g.visible;
  const restore = [];
  const pos = camera.position.clone(), quat = camera.quaternion.clone();
  try {
    g.visible = true;
    // culling would leave whatever the warm camera cannot see to be paid for later
    g.traverse((o) => { if (o.isMesh) { restore.push([o, o.frustumCulled]); o.frustumCulled = false; } });
    camera.position.set(g.position.x, g.position.y + 1.7, g.position.z - 3);
    camera.lookAt(g.position.x, g.position.y + 1.4, g.position.z + 5);
    camera.updateMatrixWorld(true);
    const size = renderer.getSize(new THREE.Vector2());
    const prevAutoClear = renderer.autoClear;
    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, 4, 4);
    renderer.setViewport(0, 0, 4, 4);
    renderer.autoClear = true;
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.x, size.y);
    renderer.autoClear = prevAutoClear;
    // the mixer binds its 114 tracks by name on the first update, not at play()
    g.userData.bunker.update(0.016);
  } catch (e) { /* a warm-up is never worth a crash */ }
  for (const [o, f] of restore) o.frustumCulled = f;
  g.visible = wasVisible;
  camera.position.copy(pos); camera.quaternion.copy(quat); camera.updateMatrixWorld(true);
}
function enterBunker() {
  if (hatchBusy || inBunker) return;
  hatchBusy = true; hatchDir = 1; hatchT = 0; hatchCut = false; hatchClank = false;
  hatchReturn.x = camera.position.x; hatchReturn.z = camera.position.z; hatchReturn.yaw = lookEuler.y; hatchReturn.set = true;
  warmBunker();                                // paid at load, not here; this is only the fallback
  bunkerHome.group.visible = true;
  sfxHatch(true);
}
function leaveBunker() {
  if (hatchBusy || !inBunker) return;
  hatchBusy = true; hatchDir = -1; hatchT = 0; hatchCut = false; hatchClank = false;
  const S = bunkerHome.group.userData.bunker;
  /* The cover swings before the black comes down. The clip's first eight
   * seconds are the gate's cogs turning and the cover does not move until
   * 8.5 s, so it is started past the preamble and run fast. */
  if (S.hatch) { S.openHatch(); S.hatch.time = 7.9; S.hatch.timeScale = 3.2; }
  sfxHatch(true);
}
/* The cut. Into the room: at the foot of the ladder, facing down the room —
 * the walk to the consoles is the payoff, not the ladder you came down.
 * Out: exactly where you stood when you went in, looking the way you looked. */
function placeInBunker() {
  const g = bunkerHome.group;
  const p = g.localToWorld(new THREE.Vector3(-0.2, 0, -3.3));
  camera.position.set(p.x, BUNKER_Y + playerEye(), p.z);
  camBaseY = camera.position.y; vy = 0; onGround = true; groundY = BUNKER_Y;
  inBunker = bunkerHome;
  lookEuler.set(0.02, Math.PI + g.rotation.y, 0, lookEuler.order);
  camera.quaternion.setFromEuler(lookEuler);
  velocity.set(0, 0, 0); knockback.set(0, 0, 0);
  bunkerMix = Math.max(bunkerMix, 0.35);
}
function placeOnBeach() {
  const S = bunkerHome.group.userData.bunker;
  if (S.hatch) { S.hatch.timeScale = 1; S.hatch.stop(); }    // the cover is shut again behind you
  camera.position.set(hatchReturn.x, playerEye(), hatchReturn.z);
  const rc = rockGroundAt(hatchReturn.x, hatchReturn.z, 0);
  groundY = rc ? rc.top : 0;
  camera.position.y = playerEye() + groundY;
  camBaseY = camera.position.y; vy = 0; onGround = true;
  inBunker = null;
  lookEuler.set(0.02, hatchReturn.yaw, 0, lookEuler.order);
  camera.quaternion.setFromEuler(lookEuler);
  velocity.set(0, 0, 0); knockback.set(0, 0, 0);
}
const smooth01 = (a, b, t) => { const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
function updateHatch(dt) {
  // the marker lamp: a slow irregular blink, never a beacon's steady sweep
  if (hatchBeacon) {
    const tt = performance.now() * 0.001;
    const on = (Math.sin(tt * 1.7) + Math.sin(tt * 0.61 + 1.3)) > 0.9 ? 1 : 0.18;
    hatchBeacon.material.opacity = on * (0.65 + 0.35 * Math.sin(tt * 9.1));
  }
  if (hatchBusy) {
    hatchT += dt;
    const t = hatchT;
    let lidOpen;
    if (hatchDir > 0) lidOpen = smooth01(0.02, 0.46, t);                       // going in: it comes up ahead of you
    else lidOpen = t < 0.58 ? 1 : 1 - smooth01(0.58, 0.86, t);                 // coming out: it stands open, then falls
    hatchLid.rotation.z = -lidOpen * 1.78;
    const black = t < HATCH_BLACK ? smooth01(0.06, HATCH_BLACK, t)
      : t < HATCH_BLACK + HATCH_HOLD ? 1 : 1 - smooth01(HATCH_BLACK + HATCH_HOLD, HATCH_DUR, t);
    blackoutEl.style.opacity = black.toFixed(3);
    if (!hatchCut && t >= HATCH_BLACK + 0.04) { hatchCut = true; if (hatchDir > 0) placeInBunker(); else placeOnBeach(); }
    const clankAt = hatchDir > 0 ? HATCH_BLACK + 0.18 : 0.84;
    if (!hatchClank && t >= clankAt) { hatchClank = true; sfxHatch(false); }
    if (t >= HATCH_DUR) {
      hatchBusy = false; hatchLid.rotation.z = 0; blackoutEl.style.opacity = '0';
      /* AND HE IS ALREADY TALKING. The question lands on the frame the black
       * lifts, not after a beat of looking round — you are supposed to have
       * been caught, and being given time to take the room in first would
       * make it your entrance rather than his. */
      if (hatchDir > 0 && !dealerMet && dealer.st.alive && dealer.model) {
            dealerMet = true;
        DEALER_NPC.head = dealer.head || null;
        startDialog('start', DEALER_NPC);
      }
    }
  }
  updateDealer(dt);
  updateCoatStand();
  // the room's air: the sea and the wind go, a hum and a fan come
  const want = inBunker ? 1 : 0;
  const prev = bunkerMix;
  bunkerMix += (want - bunkerMix) * Math.min(1, dt * 2.6);
  if (Math.abs(bunkerMix - want) < 0.002) bunkerMix = want;
  if (audioCtx && (bunkerMix > 0 || prev > 0)) {
    const ctx = audioCtx;
    if (bunkerMix > 0 && !bunkerAudio) startBunkerAudio();
    if (bunkerAudio) bunkerAudio.gain.gain.setTargetAtTime(bunkerMix * settings.sfxVolume * 0.75, ctx.currentTime, 0.25);
    if (waveBusGain && drainMix <= 0.0001) waveBusGain.gain.setTargetAtTime(settings.waveVolume * (1 - 0.92 * bunkerMix), ctx.currentTime, 0.3);
    if (windDuck) windDuck.gain.setTargetAtTime(1 - 0.9 * bunkerMix, ctx.currentTime, 0.3);
  }
}
/* A steel lid a hand thick. Opening: the dogs let go (a clack), the hinge
 * groans as the weight comes up, and it lands on its stop with a ring.
 * Closing: the swing, then the slam — a low body, three partials of the
 * plate ringing, and the dogs going home. Both are heavy and both are short;
 * the whole cut is a second and a quarter. */
function sfxHatch(opening) {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain(); out.gain.value = 0.62; out.connect(sfxOut());
  const clack = (at, f, g, len = 0.05) => {
    const n = noiseBurst(len, (x) => Math.pow(1 - x, 5));
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6;
    const gg = ctx.createGain(); gg.gain.value = g;
    n.connect(bp).connect(gg).connect(out); n.start(t + at); n.stop(t + at + len);
  };
  const ring = (at, f, g, dur) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t + at);
    og.gain.exponentialRampToValueAtTime(g, t + at + 0.006); og.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
    o.connect(og).connect(out); o.start(t + at); o.stop(t + at + dur + 0.02);
  };
  const thud = (at, f, g, len) => {
    const n = noiseBurst(len, (x) => Math.pow(1 - x, 2.2));
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f;
    const gg = ctx.createGain(); gg.gain.value = g;
    n.connect(lp).connect(gg).connect(out); n.start(t + at); n.stop(t + at + len);
  };
  if (opening) {
    clack(0.0, 1900, 0.5); clack(0.05, 1300, 0.35, 0.04);
    // the hinge: noise through a narrow band that climbs as the leaf comes up, trembling
    const groan = noiseBurst(0.62, (x) => Math.sin(Math.PI * Math.min(1, x * 1.08)) * (0.55 + 0.45 * Math.sin(x * 41)));
    const gf = ctx.createBiquadFilter(); gf.type = 'bandpass'; gf.Q.value = 9;
    gf.frequency.setValueAtTime(190, t + 0.08); gf.frequency.exponentialRampToValueAtTime(430, t + 0.6);
    const gg = ctx.createGain(); gg.gain.value = 0.42;
    groan.connect(gf).connect(gg).connect(out); groan.start(t + 0.08); groan.stop(t + 0.72);
    // it meets its stop
    thud(0.56, 140, 0.55, 0.22); ring(0.56, 610, 0.09, 0.5); ring(0.565, 1130, 0.05, 0.36);
  } else {
    // the swing: air and hinge, falling
    const sw = noiseBurst(0.3, (x) => Math.sin(Math.PI * x));
    const sf = ctx.createBiquadFilter(); sf.type = 'bandpass'; sf.Q.value = 2.2;
    sf.frequency.setValueAtTime(520, t); sf.frequency.exponentialRampToValueAtTime(160, t + 0.3);
    const sg = ctx.createGain(); sg.gain.value = 0.3;
    sw.connect(sf).connect(sg).connect(out); sw.start(t); sw.stop(t + 0.3);
    // the slam
    thud(0.3, 95, 1.0, 0.34); thud(0.3, 420, 0.5, 0.08);
    ring(0.3, 470, 0.11, 0.9); ring(0.302, 790, 0.07, 0.7); ring(0.305, 1240, 0.045, 0.5);
    // the dogs going home
    clack(0.46, 1500, 0.4); clack(0.53, 1150, 0.3, 0.04);
  }
}
// steel plate underfoot: a clank with a little ring in it, and no print
function sfxStepMetal() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  stepAlt ^= 1;
  const out = ctx.createGain();
  out.gain.value = 0.42 * (stepAlt ? 1 : 0.82) * (0.85 + Math.random() * 0.3);
  out.connect(sfxOut());
  const heel = noiseBurst(0.035, (x) => Math.pow(1 - x, 4));
  const hf = ctx.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 1400 + Math.random() * 900; hf.Q.value = 1.4;
  const hg = ctx.createGain(); hg.gain.value = 0.3;
  heel.connect(hf).connect(hg).connect(out); heel.start(t); heel.stop(t + 0.035);
  const f0 = 260 + Math.random() * 90;
  for (const [m, g, d] of [[1, 0.28, 0.14], [2.7, 0.08, 0.1], [4.1, 0.04, 0.07]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * m;
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(g, t + 0.004); og.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(og).connect(out); o.start(t); o.stop(t + d + 0.02);
  }
  const body = noiseBurst(0.06, (x) => Math.pow(1 - x, 3));
  const bf = ctx.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 220;
  const bg = ctx.createGain(); bg.gain.value = 0.25;
  body.connect(bf).connect(bg).connect(out); body.start(t); body.stop(t + 0.06);
}
/* The room's air, on `bunkerMix`: mains hum with its second harmonic and a
 * ventilation rumble that breathes. Quiet, and all of it low — the sea it
 * replaces was low too, and a room forty metres down should feel like
 * pressure, not like a noise. */
function startBunkerAudio() {
  if (bunkerAudio || !audioCtx) return;
  const ctx = audioCtx;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(sfxOut());
  const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 50;
  const hum2 = ctx.createOscillator(); hum2.type = 'sine'; hum2.frequency.value = 100.3;
  const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 240;
  const hg = ctx.createGain(); hg.gain.value = 0.045;
  const h2g = ctx.createGain(); h2g.gain.value = 0.03;
  hum.connect(hf).connect(hg).connect(gain); hum2.connect(h2g).connect(gain);
  const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const d = buf.getChannelData(0); let lp = 0;
  for (let i = 0; i < d.length; i++) { lp = lp * 0.995 + (Math.random() * 2 - 1) * 0.005; d[i] = lp * 6; }
  const vent = ctx.createBufferSource(); vent.buffer = buf; vent.loop = true;
  const vf = ctx.createBiquadFilter(); vf.type = 'lowpass'; vf.frequency.value = 190;
  const vg = ctx.createGain(); vg.gain.value = 0.34;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
  const lg = ctx.createGain(); lg.gain.value = 0.1;
  lfo.connect(lg).connect(vg.gain);
  vent.connect(vf).connect(vg).connect(gain);
  /* NO WHINE. A CRT's flyback was in here at 7840 Hz and it read as
   * tinnitus: a pure high sine has no envelope, no beating and nowhere to
   * hide, so the ear locks onto it and cannot let go — and headphones make
   * it worse. The room is all body now: hum, fan, and the air in a concrete
   * box. Nothing above 240 Hz belongs in a bed you stand in for minutes. */
  hum.start(); hum2.start(); lfo.start(); vent.start();
  bunkerAudio = { gain };
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
  updateCheckpoint();
  if (restore) updateRestore(dt);
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
    clampPlayerToRoom();          // a blow must not put you inside a desk either
    knockback.multiplyScalar(1 - Math.min(1, 7 * dt));
  }
  // The drainage tunnel home is the only way through the sand wall.
  /* onShip joins onDock and the rest for the same reason. The walkable
   * beach is only 16.6 m wide and the wreck is 26 long, so with the clamp
   * applied you hit an invisible wall 4.6 m short of her bow while
   * standing on her own deck. Her bulwark keeps you aboard. */
  if (!insideTower && !insideDrain && !inBunker && !onDock && !onShip && mushWhere === 'out' && !mushInYard) {    // the pier's sea end is past WADE_X; the pavilion's yard and back room stand past the cliff line
    camera.position.x = Math.min(camera.position.x, CLIFF_BLOCK_X);
    camera.position.x = Math.max(camera.position.x, WADE_X);
  }
  updateCastle();           // before the push-out, so you walk through what you just flattened
  updateTower(dt);
  updateMushroom(dt);
  updateFarProps();
  // Rocks are solid: walk into one and you're pushed out, clear its lip and
  // you stand on it. Done after updateTower() so a rock simply beats the sand.
  // Skipped inside the drainage tunnel home — there are no beach rocks in
  // there, and pushOutOfRocks would shove you about inside the pipe.
  if (!insideTower && !insideDrain && !inBunker) {
    const feet = camBaseY - playerEye();
    pushOutOfRocks(feet);
    const rc = rockGroundAt(camera.position.x, camera.position.z, feet);
    if (rc && rc.top > groundY) groundY = rc.top;
  }
  updateDrain(dt);          // last, so it wins on groundY inside the home
  updateShip(dt);
  updateHoldDoor(dt);           // and the wreck overrides the sand where you're on it
  updateDock(dt);           // the pier's drift, boards and shed walls
  updateBunkers(dt);        // the room's own frame: walls, furniture, ceiling
  updateFisherman(rawDt);   // he blinks and breathes, like Bradly
  /* ...and then out of anything solid again. updateDock() clamps you to the
   * deck's footprint, and that clamp used to run AFTER the push-out and put
   * you straight back inside a pile — which is how you ended up standing in
   * one. Whatever moves you last, this gets the final word. */
  if (!insideTower && !insideDrain && !inBunker) {
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
      else if (inBunker) sfxStepMetal();
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
    const gate = running ? FOOT_STRIDE * 1.3 : FOOT_STRIDE;
    if (dx * dx + dz * dz > gate * gate) {
      moveDir.copy(velocity).setY(0).normalize();
      if (wading) {
        // no footprint on water — kick up a splash instead
        spawnSplash(camera.position.x, camera.position.z, 9, moveDir.x, moveDir.z, 1);
        sfxSplash(0.85);
      } else if (onDock) {
        sfxStepWood();                     // boards: a knock, and no print
      } else if (inBunker) {
        sfxStepMetal();                    // steel plate: a clank, and no print
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
  updateSnorkeler(dt);
  updateSmile(dt);
  updateCrab(dt);
  updateMutant(dt);
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
/* ---- THE CHECKPOINT --------------------------------------------------
 * One autosave, at the pavilion, on the last stretch before the three come
 * out of the dark — the walk to there is an hour of finding things and the
 * fight past it can take you in twenty seconds, and losing the first to the
 * second is the one thing that would make nobody play it twice.
 *
 * What is saved is not the world: it is WHERE YOU STOOD and WHAT YOU HAD.
 * The world rebuilds itself identically on a reload (every placement runs off
 * seeded noise), so the restore only has to put you back and give you back —
 * and it gives you back by RE-RUNNING THE PICKUPS you made, each one firing
 * the same handler that ran when you took it, which is what takes the thing
 * off the beach as well as putting it in your pack. Two of those handlers do
 * not exist until something else has happened (the captain's head is not
 * takeable until the wheel is turned and he has fallen), so the replay is a
 * pass that runs every frame for eight seconds and stops when it has found
 * everything it is looking for. */
const _saveV = new THREE.Vector3();
function saveCheckpoint() {
  const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
  const data = {
    v: 3,
    at: Date.now(),
    pos: [+camera.position.x.toFixed(3), +camera.position.y.toFixed(3), +camera.position.z.toFixed(3)],
    look: [+e.y.toFixed(4), +e.x.toFixed(4)],
    hp,
    took: [...takenPickups],
    // the pack, in the order you carried it, and what was in your hand
    pack: inventory.map((i) => i.name),
    worn: rings.map((i) => i.name),
    held: equipped ? equipped.name : null,
    // the mounds you dug, so the beach is as pitted as you left it
    mounds: mounds.map((m, i) => (m.taken ? i : -1)).filter((i) => i >= 0),
    // and the handful of things the walk latches on
    flags: {
      castleBroken, crabBled, hcrabTaken, ringsFound, eyesSeen, snorkMet,
      blood: bloodAmount, bloodSeen,
      star: !!(helmStar && helmStar.solved),
      headTaken: !!(shipHead && shipHead.userData.taken),
      boatKey: boatKeyTaken,
      dockDoor: dockDoorOpen,
    },
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (err) { return; }
  showAutosave();
}
const autosaveEl = document.getElementById('autosave');
let autosaveT = null;
function showAutosave() {
  autosaveEl.classList.remove('show');
  /* The ring has to be able to run its fill again, so the class has to come
   * OFF for a beat first — and on a timer rather than a frame, because the
   * frame loop is not something this can depend on. */
  clearTimeout(autosaveT);
  autosaveT = setTimeout(() => {
    autosaveEl.classList.add('show');
    autosaveT = setTimeout(() => autosaveEl.classList.remove('show'), 2600);
  }, 40);
}
/* The pavilion is the line. It fires on Z alone, the way the pack's trigger
 * does — it does not care whether you came down the waterline or the cliff —
 * and a little short of the house, so you are saved as you walk up to it and
 * not after you have climbed it. Once a game. */
const SAVE_Z = MUSH_Z + 26;
let checkpointDone = false;
function updateCheckpoint() {
  if (checkpointDone || !introDone || dying || ended || settings.devMode) return;
  if (camera.position.z > SAVE_Z) return;
  checkpointDone = true;
  saveCheckpoint();
}
/* Putting it back. The pack, the rings and the world's flags land at once;
 * the pickups are replayed over the next few seconds because some of the
 * things they take are still coming over the network. */
let restore = null, restoreT = 0;
function beginRestore() {
  if (loadMode !== 'checkpoint' || !hasCheckpoint()) return;
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return; }
  if (!d || d.v !== 3) return;
  checkpointDone = true;                       // you are past the line already
  camera.position.set(d.pos[0], d.pos[1], d.pos[2]);
  // the heading is the camera's own quaternion — the look handler reads it
  // back off the camera every frame, so writing it here is all it takes
  if (d.look) { lookEuler.set(d.look[1], d.look[0], 0, lookEuler.order); camera.quaternion.setFromEuler(lookEuler); camera.updateMatrixWorld(true); }
  hp = Math.max(1, Math.min(MAX_HP, d.hp || MAX_HP));
  const f = d.flags || {};
  if (f.castleBroken && !castleBroken) breakCastle(CASTLE_X, CASTLE_Z);
  crabBled = !!f.crabBled; hcrabTaken = !!f.hcrabTaken;
  eyesSeen = !!f.eyesSeen; snorkMet = !!f.snorkMet;
  dockDoorOpen = !!f.dockDoor;
  bloodAmount = f.blood || 0; bloodSeen = !!f.bloodSeen;
  if (bloodSeen) { hudJar.userData.setFill(Math.min(1, bloodAmount / BLOOD_JAR_CAP)); updateBloodReadout(); }
  for (const i of d.mounds || []) if (mounds[i] && !mounds[i].taken) revealMoundNear(mounds[i].x, mounds[i].z);
  /* THE THREE AT THE DOCK ARE BEHIND YOU. Their cutscene fires on your Z
   * alone, and the pavilion is three hundred metres past it — so a restore
   * would have played the whole swim-in the moment you loaded, at a place
   * where there is no water and no crabs. It is marked done, and they are
   * left asleep where they wait: what the beach behind you actually looks
   * like once you have walked it. */
  if (camera.position.z < PACK_Z + PACK_TRIGGER) { packPhase = 2; packCut = false; }
  restore = d; restoreT = 0;
  refreshUI();
}
function updateRestore(dt) {
  if (!restore) return;
  restoreT += dt;
  const f = restore.flags || {};
  // the wheel, if it was turned: he has to fall before he can be taken
  if (f.star && helmStar && helmStar.g && !helmStar.solved) { helmStar.solved = true; dropShipHead(); }
  // the pickups, as they arrive
  let missing = 0;
  for (const id of restore.took) {
    if (takenPickups.has(id)) continue;
    const it = interactables.find((q) => q.save === id);
    if (it && it.onActivate) it.onActivate(); else missing++;
  }
  // the key out of his mouth: its own gate, not a pickup off the beach
  if (f.boatKey && !boatKeyTaken && inventory.includes(headItem)) {
    boatKeyTaken = true;
    shipHead.remove(boatKey);
    boatKey.position.set(0, 0, 0); boatKey.rotation.set(0, 0, 0);
    addToInventory(boatKeyItem);
  }
  if (missing && restoreT < 8) return;
  finishRestore();
}
function finishRestore() {
  const d = restore; restore = null;
  if (!d) return;
  /* THE PACK COMES BACK IN ORDER. Replaying pickups puts things in whatever
   * order they landed, and the hotbar is muscle memory — 3 was the shovel all
   * game. Sort what you actually have by the order you were carrying it. */
  const want = d.pack || [];
  inventory.sort((a, b) => {
    const ia = want.indexOf(a.name), ib = want.indexOf(b.name);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  for (const name of d.worn || []) {
    const it = inventory.find((i) => i.name === name);
    if (it) wearRing(it);
  }
  if (d.flags && d.flags.ringsFound) ringsFound = true;
  if (d.held) {
    const it = inventory.find((i) => i.name === d.held);
    if (it && it !== equipped && (it.viewmodel || it.onDig)) toggleEquip(it);
  }
  renderHotbar(); renderPack(); renderRings(); refreshUI();
}
function animate() {
  requestAnimationFrame(animate);
  if (!drainWarmed) warmDrain();
  else if (!bunkerWarmed) warmBunker();
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
  update(dt, rawDt); updateHatch(rawDt);
  updateHover();
  if (inspecting) {
    updateInspect(dt);
    renderer.render(inspectScene, inspectCamera);
    return;
  }
  if (hitRoll) camera.rotateZ(hitRoll);
  if (slamDip) camera.position.y -= slamDip;
  renderer.render(scene, camera);
  if (slamDip) camera.position.y += slamDip;
  if (hitRoll) camera.rotateZ(-hitRoll);
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
  /* One whole game tick, for a harness whose rAF is stalled. It has to drain
   * HITSTOP and scale dt exactly as animate() does, or nothing that hangs on
   * the freeze ever ends: a killed crab or mutant sits in its impact frames
   * for ever, because the frame that finishes it is the frame hitstop
   * reaches zero, and update() is not where hitstop is counted down. */
  heal: () => { hp = MAX_HP; hurtFlash = 0; sinceHurt = 0; },   // the harness player has to survive a forty-second sample
  step: (dt) => {
    const rawDt = dt;
    if (hitstop > 0) { hitstop = Math.max(0, hitstop - dt); dt *= 0.08; }
    oceanUniforms.uTime.value += dt;
    update(dt, rawDt); updateHatch(rawDt);
  },
  MUSH_X, MUSH_Z, MUSH, mushHouse, updateMushroom, mushState: () => ({ where: mushWhere, turns: mushTurns, stairY: mushStairY }),
  smile, updateSmile, smileState: () => ({ phase: smilePhase, t: smileT, loaded: !!smileMixer, clips: Object.keys(smileClips) }), sfxSmileStep,
  updateHurt, hurtEl,
  militaryItem, militaryWorld, milModel, get toolVM() { return toolVM; }, vmScene, vmCamera, toolMount,
  get settings() { return settings; }, get hp() { return hp; },
  snorkSprite, updateSnorkeler, snork: () => ({ up: snorkUp, want: snorkWant, talkT: snorkTalkT, hasTex: !!snorkOpenTex }),
  snorkFake: () => { const c = document.createElement('canvas'); c.width = 80; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#e0407a'; g.fillRect(10, 30, 60, 98); g.fillStyle = '#ff7030'; g.fillRect(58, 0, 10, 60); snorkSetFrames(c); },
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
  get pose() { return _pose; }, get slashDir() { return slashDir; }, get blockT() { return blockT; }, get hp() { return hp; }, get hurtFlash() { return hurtFlash; },
  saveCheckpoint, beginRestore, hasCheckpoint, SAVE_KEY, takenPickups, get checkpointDone() { return checkpointDone; }, set checkpointDone(v) { checkpointDone = v; },
  get loadMode() { return loadMode; }, set loadMode(v) { loadMode = v; }, get restoring() { return !!restore; }, SAVE_Z, updateRestore,
  SLASH_WINDUP, SLASH_THROUGH, MIL_GRIP_Y,
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
  helmStar, starPuzzle, shipHead, boatKey, boatKeyItem, headItem, holdDoor, get holdDoorOpen() { return holdDoorOpen; },
  get headFall() { return headFall; }, dropShipHead, deckHalfAt, get wheelGrab() { return wheelGrab; }, dragWheel: (dx) => dragWheel(dx),
  holdDoor, boatKeyItem, headItem, dropShipHead, shipLantern,
  get holdDoorOpen() { return holdDoorOpen; }, set holdDoorOpen(v) { holdDoorOpen = v; },
  get boatKeyTaken() { return boatKeyTaken; },
  tp: (x, y, z) => { camera.position.set(x, y, z); camBaseY = y; vy = 0; },  // preview harness: camBaseY is what update() writes y from
  get drainWarmed() { return drainWarmed; }, get drainWarmError() { return drainWarmError; },
  waterBottle, waterBottleWorld, get waterBottleItem() { return waterBottleItem; },
  get insideDrain() { return insideDrain; }, get drainMix() { return drainMix; },
  spawnBunker, get bunkers() { return bunkers; }, get inBunker() { return inBunker; },
  get windT() { return windT; }, get windFull() { return windFull; }, WIND_FULL,
  enterBunker, leaveBunker, startDealerFight, startDealerPickup, get dealer() { return dealer; }, aimBar,
  get crowbarOnTable() { return crowbarOnTable; }, get dealerPick() { return dealerPick; }, get bunkerProps() { return bunkerProps; },
  get dealerFight() { return dealerFight; }, get dealerMet() { return dealerMet; }, DEALER_X, DEALER_Z,
  get hatchBusy() { return hatchBusy; }, get bunkerMix() { return bunkerMix; }, get bunkerHome() { return bunkerHome; }, HATCH_X, HATCH_Z, BUNKER_Y, hatch,
  waterSurfaceAt, submersionAt, restYInWater, groundGlow, addRipple,
  shells, listenToShell, makeRockGeo, dock, ring, driftAt, updateDock,
  listen: (v) => { listening = v; }, stopListening, keyItem, keyWorld,   // the ear pose without the audio, for the preview harness
  get dockDoorOpen() { return dockDoorOpen; }, set dockDoorOpen(v) { dockDoorOpen = v; }, get onDock() { return onDock; },
  crabs, makeCrabUnit, nearestCrab, crabPlay, updateCrabUnit, get crabToken() { return crabToken; },
  mutants, mutant, updateMutant, hurtMutant, killMutant, parryMutant, blockMutant, nearestMutant,
  sfxMutLaugh, sfxMutHunger, sfxMutTell, sfxMutRoar, spawnSparks, tipGlint, get windFull() { return windFull; },
  MUT_X, MUT_Z, MUT_HP, MUT_WIND, MUT_STUN, MUT_ATTACKS, MUT_KINDS, MUT_TRIGGER, mutSand, throwSand,
  get mutToken() { return mutToken; }, get mutCut() { return mutCut; }, get mutPhase() { return mutPhase; },
  mutState: () => mutants.map((u) => ({ kind: u.kindName, ...u.st, x: +u.g.position.x.toFixed(2), z: +u.g.position.z.toFixed(2), clip: u.cur && u.cur.getClip().name })),
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
  get groundY() { return groundY; }, set groundY(v) { groundY = v; }, get camBaseY() { return camBaseY; }, set camBaseY(v) { camBaseY = v; },
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

/* STRAIGHT IN. This is at the bottom of the file on purpose: `beginGame`
 * runs the restore, and the restore names the mounds, the wreck's star and
 * the pack — all declared thousands of lines below where the title code
 * lives, and reading them any earlier is a dead-zone crash. */
if (loadMode === 'checkpoint' && hasCheckpoint()) {
  instantStart = true;
  skipIntro = true;
  beginGame();
}

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
