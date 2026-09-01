import * as THREE from 'three';
import { makeHorseshoeCrab, makeHorseshoeCrabIcon } from './models/horseshoe-crab.js';
import { makeSyringe, makeSyringeIcon } from './models/syringe.js';
import { makeBloodJar, makeBloodJarIcon } from './models/blood-jar.js';

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

const DIG_DUR = 0.8;

// ------------------------------------------------------------------
// Settings
// ------------------------------------------------------------------
const DEFAULT_SETTINGS = { fov: 75, sensitivity: 1, brightness: 1.16, volume: 0.9, invertY: false };
let settings = { ...DEFAULT_SETTINGS };
try { settings = { ...settings, ...JSON.parse(localStorage.getItem('beachwalk.settings') || '{}') }; } catch (e) {}
function saveSettings() { try { localStorage.setItem('beachwalk.settings', JSON.stringify(settings)); } catch (e) {} }

let audioStarted = false, audioCtx = null, masterGain = null;
let musicEl = null, musicEnvGain = null, musicVolGain = null, musicStarted = false;

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
scene.fog = new THREE.FogExp2(0x0a1220, 0.020);

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
const lighthouse = new THREE.Group();
lighthouse.position.set(LH_X, 0, LH_Z);
let lampCore, beamPivot;
{
  const stone = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 1, metalness: 0, emissive: 0x14171f });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 3.6, 30, 18), stone); tower.position.y = 15;
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 1.4, 18), new THREE.MeshStandardMaterial({ color: 0x14171e, roughness: 1 })); gallery.position.y = 30.4;
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 3.4, 14), new THREE.MeshStandardMaterial({ color: 0x0c0e13, roughness: 0.6, metalness: 0.3 })); lampRoom.position.y = 32.6;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 2.6, 14), new THREE.MeshStandardMaterial({ color: 0x191b22, roughness: 1 })); roof.position.y = 35.6;
  lampCore = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe9c2, fog: false })); lampCore.position.y = 32.7;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe6bf, transparent: true, opacity: 0.85, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  glow.position.y = 32.7; glow.scale.setScalar(7);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffdca6, transparent: true, opacity: 0.16, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  halo.position.y = 32.7; halo.scale.setScalar(26);
  lighthouse.userData.glow = glow; lighthouse.userData.halo = halo;
  beamPivot = new THREE.Group(); beamPivot.position.y = 32.7;
  const beamGeo = new THREE.ConeGeometry(6, 260, 22, 1, true);
  beamGeo.translate(0, 130, 0); beamGeo.rotateX(-Math.PI / 2);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff0d6, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
  beamPivot.add(beam); beamPivot.userData.beam = beam;
  lighthouse.add(tower, gallery, lampRoom, roof, lampCore, glow, halo, beamPivot);
}
scene.add(lighthouse);

// ------------------------------------------------------------------
// Wrack line
// ------------------------------------------------------------------
const DEBRIS_TILE = 46;
const debris = new THREE.Group();
scene.add(debris);
function scatter(geo, mat, perTile, place) {
  const grid = 7, half = grid >> 1;
  const mesh = new THREE.InstancedMesh(geo, mat, perTile * grid);
  mesh.frustumCulled = false;
  const items = Array.from({ length: perTile }, (_, i) => place(i));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  let idx = 0;
  for (let gz = -half; gz <= half; gz++) for (const it of items) {
    q.setFromEuler(it.rot);
    m.compose(new THREE.Vector3(it.x, it.y, it.z + gz * DEBRIS_TILE), q, it.scale);
    mesh.setMatrixAt(idx++, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  debris.add(mesh);
  return mesh;
}
const zSpan = () => Math.random() * DEBRIS_TILE - DEBRIS_TILE / 2;
const wrackX = () => 1.4 + Math.random() * 3.4;      // the high-tide band

// clumped bladder-wrack — the bulk of the line
scatter(
  new THREE.IcosahedronGeometry(0.5, 0),
  new THREE.MeshStandardMaterial({ color: 0x2b3226, roughness: 1, flatShading: true, emissive: 0x0a0d08 }),
  6,
  () => { const s = 0.35 + Math.random() * 0.75; return {
    x: wrackX(), z: zSpan(), y: 0.03,
    rot: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
    scale: new THREE.Vector3(s * (1 + Math.random()), s * 0.15, s * (0.6 + Math.random())),
  }; }
);
// long kelp ribbons trailing along the line
scatter(
  new THREE.BoxGeometry(1, 0.03, 0.11),
  new THREE.MeshStandardMaterial({ color: 0x22301f, roughness: 1, flatShading: true, emissive: 0x080c07 }),
  5,
  () => ({
    x: wrackX(), z: zSpan(), y: 0.018,
    rot: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
    scale: new THREE.Vector3(0.7 + Math.random() * 1.9, 1, 0.6 + Math.random() * 1.6),
  })
);
// scallop / clam shells, pale against the dark sand
scatter(
  new THREE.ConeGeometry(0.5, 0.22, 7),
  new THREE.MeshStandardMaterial({ color: 0xa9aca4, roughness: 1, flatShading: true, emissive: 0x33352f }),
  7,
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
  3,
  () => { const s = 0.055 + Math.random() * 0.06; return {
    x: 0.9 + Math.random() * 4.0, z: zSpan(), y: 0.02,
    rot: new THREE.Euler(Math.PI / 2 + (Math.random() - 0.5) * 0.6, Math.random() * Math.PI * 2, 0),
    scale: new THREE.Vector3(s, s * 1.6, s),
  }; }
);
// water-worn pebbles
scatter(
  new THREE.DodecahedronGeometry(0.5, 0),
  new THREE.MeshStandardMaterial({ color: 0x4c5464, roughness: 1, flatShading: true, emissive: 0x161b25 }),
  9,
  () => { const s = 0.05 + Math.random() * 0.11; return {
    x: 0.6 + Math.random() * 4.8, z: zSpan(), y: s * 0.45,
    rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
    scale: new THREE.Vector3(s, s * 0.7, s * (0.8 + Math.random() * 0.5)),
  }; }
);
// driftwood — planks and gnarled branches
scatter(
  new THREE.BoxGeometry(1, 0.12, 0.12),
  new THREE.MeshStandardMaterial({ color: 0x4b4236, roughness: 1, flatShading: true, emissive: 0x120f0b }),
  2,
  () => ({
    x: wrackX(), z: zSpan(), y: 0.06,
    rot: new THREE.Euler(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.2),
    scale: new THREE.Vector3(1.0 + Math.random() * 2.2, 0.7 + Math.random() * 0.8, 0.7 + Math.random() * 0.8),
  })
);
scatter(
  new THREE.CylinderGeometry(0.05, 0.03, 1, 5),
  new THREE.MeshStandardMaterial({ color: 0x574a3b, roughness: 1, flatShading: true, emissive: 0x151109 }),
  3,
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
  3,
  () => ({
    x: wrackX(), z: zSpan(), y: 0.015,
    rot: new THREE.Euler((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4),
    scale: new THREE.Vector3(0.6 + Math.random() * 1.2, 1, 0.6 + Math.random() * 1.2),
  })
);

// ------------------------------------------------------------------
// Ground decals — footprints + dig holes (instanced pools)
// ------------------------------------------------------------------
function makeFootTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const dk = (cx, cy, rx, ry, a0) => {
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, `rgba(0,1,3,${a0})`); grad.addColorStop(0.6, `rgba(2,4,8,${a0 * 0.55})`); grad.addColorStop(1, 'rgba(2,4,8,0)');
    g.fillStyle = grad; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
  };
  dk(64, 46, 30, 34, 0.7); dk(64, 50, 22, 26, 0.95); dk(64, 96, 17, 19, 0.9); dk(64, 74, 12, 22, 0.7);
  const rim = g.createLinearGradient(0, 6, 0, 46);
  rim.addColorStop(0, 'rgba(200,214,236,0.42)'); rim.addColorStop(1, 'rgba(200,214,236,0)');
  g.strokeStyle = rim; g.lineWidth = 4;
  g.beginPath(); g.ellipse(64, 48, 27, 31, 0, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
  return new THREE.CanvasTexture(c);
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

const _fm = new THREE.Matrix4(), _fq = new THREE.Quaternion(), _fe = new THREE.Euler(), _fs = new THREE.Vector3();
let footIdx = 0, footSide = 1, digIdx = 0;
const lastFootPos = new THREE.Vector3();
function stampFoot(x, z, fwdX, fwdZ, side) {
  _fe.set(0, Math.atan2(fwdX, fwdZ) + Math.PI, 0);
  _fq.setFromEuler(_fe);
  const off = 0.14 * side;
  _fs.set(0.92 + Math.random() * 0.16, 1, 1.0 + Math.random() * 0.2);
  _fm.compose(new THREE.Vector3(x + (-fwdZ) * off, 0.03, z + fwdX * off), _fq, _fs);
  foot.setMatrixAt(footIdx, _fm);
  footIdx = (footIdx + 1) % FOOT_POOL;
  foot.instanceMatrix.needsUpdate = true;
}
function stampDigHole(x, z, fwdX = 0, fwdZ = -1) {
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
function spawnPuffs(x, z, n, dirX = 0, dirZ = -1) {
  for (let i = 0; i < n; i++) {
    const idx = puffIdx;
    const p = puffs[idx];
    puffIdx = (puffIdx + 1) % PUFF_POOL;
    const fine = i % 3 === 0;
    p.ttl = p.life = fine ? 1.1 + Math.random() * 0.7 : 0.7 + Math.random() * 0.55;
    p.settled = false;
    p.sz = fine ? 0.7 + Math.random() * 0.7 : 2.2 + Math.random() * 2.6;
    p.pos.set(x + (Math.random() - 0.5) * 0.25, 0.06, z + (Math.random() - 0.5) * 0.25);
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
    _pc.setRGB(shade, shade, shade * 1.05);
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

// ------------------------------------------------------------------
// Ocean
// ------------------------------------------------------------------
const waveGLSL = `
  float oceanWave(vec2 p, float t){
    float w = 0.0;
    w += sin(p.x * 0.13 + p.y * 0.02 + t * 1.05) * 0.34;
    w += sin(p.x * 0.09 - p.y * 0.05 + t * 0.83) * 0.28;
    w += sin(p.x * 0.21 + p.y * 0.10 + t * 1.55) * 0.15;
    w += sin(p.y * 0.33 - p.x * 0.06 + t * 2.10) * 0.10;
    w += sin(p.y * 0.60 + p.x * 0.15 + t * 2.90) * 0.05;
    w += sin(p.x * 1.10 + t * 4.10) * 0.028;
    w += sin(p.y * 1.35 - t * 3.70) * 0.022;
    float build = smoothstep(-90.0, 3.0, p.x);
    w += sin(p.x * 0.5 - t * 2.6) * 0.16 * build;
    w *= smoothstep(8.0, -24.0, p.x);
    return w;
  }
`;
const oceanUniforms = THREE.UniformsUtils.merge([
  THREE.UniformsLib.fog,
  { uTime: { value: 0 }, uOffset: { value: new THREE.Vector2() }, uCamPos: { value: new THREE.Vector3() },
    uMoonDir: { value: MOON_DIR }, uDeep: { value: new THREE.Color(0x081726) }, uShallow: { value: new THREE.Color(0x1b3a55) } },
]);
const oceanGeo = new THREE.PlaneGeometry(3000, 3000, 300, 300);
oceanGeo.rotateX(-Math.PI / 2);
const ocean = new THREE.Mesh(oceanGeo, new THREE.ShaderMaterial({
  fog: true, uniforms: oceanUniforms,
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
    uniform float uTime; uniform vec3 uCamPos; uniform vec3 uMoonDir; uniform vec3 uDeep; uniform vec3 uShallow;
    varying vec3 vWorld;
    ${noiseGLSL}
    ${shoreGLSL}
    ${waveGLSL}
    void main() {
      float shore = shoreLine(vWorld.z, uTime);
      if (vWorld.x > shore) discard;
      vec2 wp = vec2(vWorld.x, vWorld.z);
      float e = 0.55;
      float hL = oceanWave(wp - vec2(e, 0.0), uTime);
      float hR = oceanWave(wp + vec2(e, 0.0), uTime);
      float hD = oceanWave(wp - vec2(0.0, e), uTime);
      float hU = oceanWave(wp + vec2(0.0, e), uTime);
      vec3 n = normalize(vec3(hL - hR, 2.0 * e, hD - hU));
      n.xz += 0.12 * vec2(sin(wp.x * 2.7 + wp.y * 0.6 + uTime * 5.0), sin(wp.y * 2.4 - wp.x * 0.5 - uTime * 4.3));
      n.xz += 0.05 * vec2(sin(wp.x * 6.1 - uTime * 8.0), sin(wp.y * 5.3 + uTime * 7.0));
      n = normalize(n);
      vec3 viewDir = normalize(uCamPos - vWorld);
      float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
      float dist = shore - vWorld.x;
      float depth = smoothstep(0.0, 70.0, dist);
      vec3 col = mix(uShallow, uDeep, depth);
      col += vec3(0.05, 0.08, 0.13) * fres;
      vec3 hv = normalize(uMoonDir + viewDir);
      float spec = pow(max(dot(n, hv), 0.0), 90.0);
      vec3 moonFlat = normalize(vec3(uMoonDir.x, 0.0, uMoonDir.z));
      vec3 viewFlat = normalize(vec3(-viewDir.x, 0.0, -viewDir.z));
      float road = pow(max(dot(viewFlat, moonFlat), 0.0), 8.0);
      col += vec3(0.85, 0.90, 1.0) * spec * (0.10 + road * 1.3);
      col += vec3(0.26, 0.34, 0.50) * road * 0.12;
      float wh = oceanWave(wp, uTime);
      float caps = smoothstep(0.15, 0.30, wh) * (0.5 + 0.5 * sin(wp.x * 2.0 - uTime * 6.0));
      col = mix(col, vec3(0.60, 0.68, 0.78), caps * 0.30 * depth);
      float band = smoothstep(3.5, 0.0, dist) * smoothstep(-1.8, 0.5, dist);
      float fizz = 0.5 + 0.5 * sin(vWorld.z * 3.1 + uTime * 9.0) * sin(vWorld.z * 1.3 - uTime * 5.0);
      col = mix(col, vec3(0.74, 0.81, 0.88), clamp(band * fizz, 0.0, 0.85));
      float lace = smoothstep(0.0, 1.5, dist) * smoothstep(5.0, 1.5, dist);
      col += vec3(0.16) * lace * (0.35 + 0.65 * bwNoise(vWorld.z * 2.0 + uTime * 1.5));
      gl_FragColor = vec4(col, 1.0);
      #include <fog_fragment>
    }
  `,
}));
ocean.position.y = -0.32;
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

let started = false, locked = false, fallbackLook = false, dragging = false;
let noteOpen = false, menuOpen = false, ended = false, introDone = false;
let inspecting = false;
let menuReturnLock = false, noteReturnLock = false, inspectReturnLock = false;
const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');

function frozen() { return noteOpen || menuOpen || ended || inspecting || !introDone; }
function refreshUI() {
  const playing = started && !menuOpen && !noteOpen && !inspecting && !ended;
  hotbarEl.classList.toggle('hidden', !playing || inventory.length === 0);
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
    // an intentional exit (note / menu) is handled by those; a stray exit
    // while still playing means the user hit Esc → show the menu
    if (!menuOpen && !noteOpen) openMenu();
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

function beginGame() {
  if (introStarted) return;
  introStarted = true;
  startAmbientAudio();
  requestLock();                                   // must fire on the click gesture
  overlay.classList.add('hidden');

  introTextEl.textContent = INTRO_LINE;
  introEl.style.transition = 'opacity 1.2s ease';
  introEl.classList.add('show');                   // fade to black
  setTimeout(() => introEl.classList.add('text-in'), 1400);   // line fades in
  setTimeout(() => introEl.classList.remove('text-in'), 1400 + 2200 + 3200); // holds, fades out
  const revealAt = 1400 + 2200 + 3200 + 2200;
  setTimeout(() => {
    introEl.style.transition = 'opacity 2.4s ease';
    introEl.classList.remove('show');              // world fades up
    introDone = true;
    for (const k in keys) keys[k] = false;
    clock.getDelta();                              // drop the big first-frame dt
    if (!locked && !fallbackLook) enterFallback();
    startMusic();
  }, revealAt);
}
overlay.addEventListener('click', beginGame);
const keys = Object.create(null);
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (!introDone) return;
  if (e.code === 'Escape') {
    if (ended) return;
    if (inspecting) closeInspect();
    else if (noteOpen) closeNote();
    else if (menuOpen) closeMenu();
    else if (fallbackLook) openMenu();
  } else if (e.code === 'KeyE' || e.code === 'KeyF') { primaryAction(); }
  else if (e.code === 'KeyG') { if (held) dropHeld(); }
  else if (e.code === 'KeyQ') { if (inspecting) closeInspect(); else if (equipped) toggleEquip(equipped); }
  else if (/^Digit[1-6]$/.test(e.code)) { useSlot(+e.code.slice(5) - 1); }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

let downPos = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  downPos = [e.clientX, e.clientY];
  if (fallbackLook) dragging = true;
});
window.addEventListener('pointerup', () => { dragging = false; });
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
const S_INVERT = document.getElementById('s-invert');
function applySettings() {
  camera.fov = settings.fov;
  camera.updateProjectionMatrix();
  renderer.toneMappingExposure = settings.brightness;
  if (masterGain && audioCtx) masterGain.gain.setTargetAtTime(settings.volume, audioCtx.currentTime, 0.05);
  if (musicVolGain && audioCtx) musicVolGain.gain.setTargetAtTime(settings.volume, audioCtx.currentTime, 0.05);
  document.getElementById('v-fov').textContent = settings.fov;
  document.getElementById('v-sens').textContent = settings.sensitivity.toFixed(2);
  document.getElementById('v-bright').textContent = settings.brightness.toFixed(2);
  document.getElementById('v-vol').textContent = Math.round(settings.volume * 100) + '%';
}
function syncMenuInputs() {
  S_FOV.value = settings.fov; S_SENS.value = settings.sensitivity;
  S_BRIGHT.value = settings.brightness; S_VOL.value = settings.volume; S_INVERT.checked = settings.invertY;
}
S_FOV.addEventListener('input', () => { settings.fov = +S_FOV.value; applySettings(); saveSettings(); });
S_SENS.addEventListener('input', () => { settings.sensitivity = +S_SENS.value; applySettings(); saveSettings(); });
S_BRIGHT.addEventListener('input', () => { settings.brightness = +S_BRIGHT.value; applySettings(); saveSettings(); });
S_VOL.addEventListener('input', () => { settings.volume = +S_VOL.value; applySettings(); saveSettings(); });
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
{
  let idrag = false, lastX = 0, lastY = 0;
  inspectEl.addEventListener('pointerdown', (e) => {
    idrag = true; lastX = e.clientX; lastY = e.clientY; inspectAuto = 0;
    inspectEl.classList.add('dragging');
    inspectEl.setPointerCapture(e.pointerId);
  });
  inspectEl.addEventListener('pointermove', (e) => {
    if (!idrag) return;
    inspectRotY += (e.clientX - lastX) * 0.01;
    inspectRotX += (e.clientY - lastY) * 0.01;
    inspectRotX = Math.max(-Math.PI, Math.min(Math.PI, inspectRotX));
    lastX = e.clientX; lastY = e.clientY;
  });
  const endDrag = (e) => {
    idrag = false;
    inspectEl.classList.remove('dragging');
    if (e.pointerId != null && inspectEl.hasPointerCapture(e.pointerId)) inspectEl.releasePointerCapture(e.pointerId);
  };
  inspectEl.addEventListener('pointerup', endDrag);
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
  } else if (equipped && equipped.onDig && digT <= 0 && crosshairGroundPoint()) {
    crosshair.className = 'active';
    setPrompt(kbd('LMB') + 'Dig here');
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
    if (p.y <= this.restH) {
      p.y = this.restH;
      if (this.vel.y < 0) this.vel.y = -this.vel.y * this.bounce;
      if (Math.abs(this.vel.y) < 0.7) this.vel.y = 0;
      this.vel.x *= this.friction; this.vel.z *= this.friction;
      this.angVel.multiplyScalar(0.86);
    }
    const lo = WADE_X + this.radius, hi = CLIFF_BLOCK_X - this.radius;
    if (p.x < lo) { p.x = lo; this.vel.x = Math.abs(this.vel.x) * this.bounce; }
    if (p.x > hi) { p.x = hi; this.vel.x = -Math.abs(this.vel.x) * this.bounce; }
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
const INV_MAX = 6;
let equipped = null;
function renderHotbar() {
  hotbarEl.innerHTML = '';
  for (let i = 0; i < INV_MAX; i++) {
    const item = inventory[i];
    const slot = document.createElement('div');
    slot.className = 'slot' + (item ? '' : ' empty') + (item && item === equipped ? ' equipped' : '');
    let icon = '';
    if (item) icon = item.icon.startsWith('data:') ? `<img src="${item.icon}" alt="">` : item.icon;
    slot.innerHTML = `<span class="num">${i + 1}</span>` + icon;
    if (item) {
      const lab = document.createElement('span');
      lab.className = 'label';
      lab.textContent = item.name + (item.onDig ? (item === equipped ? ' — holster' : ' — equip') : ' — use');
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
  refreshUI();
  return true;
}
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
}
renderHotbar();

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

/* A bare hand and forearm coming up from the lower right, fist closed
 * around the shovel's shaft. The rig's origin sits at the centre of the
 * fist, so the tool just parents to `toolMount` at 0,0,0 and the fingers
 * wrap it. Low-poly on purpose: blocky segments, flat shading. */
const ARM_BASE = new THREE.Vector3(0.24, -0.30, -0.78);
const ARM_ROT_X = 0.30;
const armRig = new THREE.Group();
armRig.position.copy(ARM_BASE);
armRig.rotation.set(ARM_ROT_X, -0.34, 0.20);
viewmodel.add(armRig);

// Keep the hand at the same spot in the frame whatever the window shape:
// derive its X from the view's half-width at the arm's depth.
function layoutViewmodel() {
  const d = Math.abs(ARM_BASE.z);
  const halfH = Math.tan((vmCamera.fov * Math.PI) / 360) * d;
  const halfW = halfH * vmCamera.aspect;
  ARM_BASE.x = halfW * 0.52;
  ARM_BASE.y = -halfH * 0.72;
}
{
  const skin = new THREE.MeshStandardMaterial({ color: 0xb98a68, roughness: 0.85, metalness: 0, emissive: 0x2a1a11, flatShading: true });
  const skinDark = new THREE.MeshStandardMaterial({ color: 0xa2745a, roughness: 0.9, metalness: 0, emissive: 0x22140d, flatShading: true });

  // forearm tapering into the wrist, running down out of frame
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.085, 0.62, 7), skin);
  forearm.position.set(0.015, -0.36, -0.02);
  forearm.rotation.z = -0.06;
  const wrist = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.09, 0.075), skin);
  wrist.position.set(0, -0.085, 0);

  // palm — the shaft passes through it vertically
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.135, 0.085), skin);
  palm.position.set(0, 0, 0.001);
  // heel of the thumb
  const thenar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.085, 0.06), skin);
  thenar.position.set(-0.05, -0.028, 0.012);

  armRig.add(forearm, wrist, palm, thenar);

  // four curled fingers closing over the front of the shaft
  for (let i = 0; i < 4; i++) {
    const y = 0.052 - i * 0.036;
    const len = i === 0 ? 0.085 : i === 3 ? 0.068 : 0.082;
    const prox = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.03, len), i % 2 ? skin : skinDark);
    prox.position.set(0.028, y, 0.058);
    prox.rotation.x = -0.15;
    // the tip curls back toward the palm, closing the grip
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.032, 0.05), i % 2 ? skinDark : skin);
    tip.position.set(0.028, y - 0.012, 0.098);
    tip.rotation.x = -1.15;
    armRig.add(prox, tip);
  }
  // thumb crossing over the fingers
  const thumb1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.065), skin);
  thumb1.position.set(-0.042, 0.026, 0.042);
  thumb1.rotation.set(-0.35, 0.55, 0);
  const thumb2 = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.036, 0.055), skinDark);
  thumb2.position.set(-0.012, 0.036, 0.078);
  thumb2.rotation.set(-0.2, 1.15, 0);
  armRig.add(thumb1, thumb2);
}
// the tool sits in the middle of the fist
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
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.24, 0.03), red); blade.position.set(0, -0.08, 0.02);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.02, 0.06), red); lip.position.set(0, -0.2, 0.035);
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

// scaled + slid so the shaft runs straight through the closed fist, with
// the D-handle just above the thumb and the blade hanging below frame
const shovelVM = makeShovel();
shovelVM.scale.setScalar(0.44);
shovelVM.position.set(0.004, -0.13, 0.022);
shovelVM.rotation.set(0.16, 0.1, 0.03);
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

function startDig() {
  if (digT > 0 || !equipped || !equipped.onDig || frozen()) return;
  digT = 0.0001;
  digImpacted = false;
  sfxDig();
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
  stampDigHole(x, z, _pf.x, _pf.z);
  spawnPuffs(x, z, 22, _pf.x, _pf.z);
  sfxDigImpact();
}

let vmSway = 0;
function updateViewmodel(dt) {
  const show = !!equipped && !held;
  viewmodel.visible = show;
  if (!show) return;
  const sp = velocity.length();
  vmSway += dt * (2.2 + sp * 1.7);
  const moveAmt = Math.min(1, sp / WALK_SPEED);
  const bx = Math.sin(vmSway) * 0.010 * moveAmt;
  const by = Math.abs(Math.sin(vmSway)) * -0.014 * moveAmt;
  let pitch = 0, lift = 0;
  if (digT > 0) {
    digT += dt / DIG_DUR;
    const p = digT;
    if (p < 0.28) { const t = p / 0.28; pitch = -1.05 * t; lift = 0.14 * t; }
    else if (p < 0.55) { const t = (p - 0.28) / 0.27; pitch = -1.05 + 2.4 * t; lift = 0.14 - 0.52 * t; }
    else { const t = Math.min(1, (p - 0.55) / 0.45); pitch = 1.35 - 1.35 * t; lift = -0.38 + 0.38 * t; }
    if (!digImpacted && p >= 0.5) { digImpacted = true; digImpact(); }
    if (p >= 1) digT = 0;
  }
  armRig.rotation.x = ARM_ROT_X + pitch;
  armRig.position.set(ARM_BASE.x + bx, ARM_BASE.y + by + lift, ARM_BASE.z);
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
bottle.position.set(3.6, 0.075, -42);
bottle.rotation.set(0, 1.1, Math.PI / 2 * 0.96);
scene.add(bottle);
addInteractable(bottle, 'Take the bottle', 'inventory', {
  onActivate: () => {
    sfxGlassPick();
    scene.remove(bottle);
    hovered = null;
    addToInventory({ name: 'Message in a bottle', icon: '🍾', use: () => openNote(NOTE_TEXT) });
  },
});

// ------------------------------------------------------------------
// Horseshoe crab — stranded in the wrack line. Take it, then "use" it
// to turn it over and look at the underside. Model lives in
// models/horseshoe-crab.js.
// ------------------------------------------------------------------
const crab = makeHorseshoeCrab();
const crabWorld = new THREE.Group();
crabWorld.add(crab);
{
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.30, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.name = 'hitProxy';
  crabWorld.add(hit);
}
crabWorld.position.set(2.7, 0.03, -58);
crabWorld.rotation.set(0.05, -0.7, -0.03);
scene.add(crabWorld);
let crabTaken = false;
const crabItem = {
  name: 'Horseshoe crab', icon: makeHorseshoeCrabIcon(),
  use: () => {
    if (!crabBled && inventory.includes(syringeItem)) startExtraction();
    else openInspect(crab, { rotX: 0.5, rotY: 0.5 });
  },
};
addInteractable(crabWorld, 'Take the horseshoe crab', 'inventory', {
  onActivate: () => {
    if (crabTaken) return;
    crabTaken = true;
    sfxThud(0.04);
    scene.remove(crabWorld);
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
scene.add(syringeWorld);

let syringeTaken = false, crabBled = false;
const bloodJar = makeBloodJar();
const jarItem = { name: 'Jar of blue blood', icon: makeBloodJarIcon(), use: () => openInspect(bloodJar, { rotX: 0.18, rotY: 0.6 }) };
const syringeItem = {
  name: 'Bleeding syringe', icon: makeSyringeIcon(),
  use: () => {
    if (!crabBled && inventory.includes(crabItem)) startExtraction();
    else openInspect(syringe, { rotX: 0.15, rotY: 0.8 });
  },
};
addInteractable(syringeWorld, 'Take the syringe', 'inventory', {
  onActivate: () => {
    if (syringeTaken) return;
    syringeTaken = true;
    sfxThud(0.03);
    scene.remove(syringeWorld);
    hovered = null;
    syringe.scale.setScalar(1);
    addToInventory(syringeItem);
  },
});

// ---- the extraction: crab + syringe combine ----------------------
let extracting = false, extractT = 0;
const extractRig = new THREE.Group();
const _hinge = new THREE.Vector3(0, 0.036, -0.116);          // where the needle bites
function startExtraction() {
  if (inspecting) return;
  inspecting = true; extracting = true; extractT = 0;

  const SS = 1.4;
  extractRig.clear();
  crab.position.set(0, 0, 0); crab.rotation.set(0, 0, 0); crab.scale.setScalar(1);
  syringe.position.set(0, 0, 0); syringe.rotation.set(0.95, 0.5, 0); syringe.scale.setScalar(SS);
  syringe.userData.setFill(0);
  syringe.userData.parts.cap.visible = true;
  const tip = new THREE.Vector3(0, 0, syringe.userData.parts.tipZ * SS).applyEuler(syringe.rotation);
  syringe.position.copy(_hinge).sub(tip).add(new THREE.Vector3(0, 0.05, 0));   // start lifted clear
  syringe.userData.startY = syringe.position.y;
  extractRig.add(crab, syringe);

  inspectSetModel(extractRig);
  // frame on the crab, not the crab+syringe pair
  extractRig.updateMatrixWorld(true);
  const cb = new THREE.Box3().setFromObject(crab).getCenter(new THREE.Vector3());
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
  if (!inventory.includes(jarItem)) addToInventory(jarItem);
  renderHotbar();
  // show the jar as the payoff
  inspectSetModel(bloodJar);
  inspectRotX = 0.12; inspectRotY = 0.45; inspectDist = 3.7; inspectAuto = 0;
  inspectEl.querySelector('.hint').textContent = 'A jar of blue blood · drag to look · Esc to put it away';
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
  noise.connect(wind).connect(windGain).connect(masterGain);
  noise.connect(surf).connect(surfGain).connect(masterGain);
  masterGain.connect(ctx.destination);
  noise.start(); lfo.start(); lfo2.start();
  document.addEventListener('visibilitychange', () => {
    masterGain.gain.setTargetAtTime(document.hidden ? 0 : settings.volume, ctx.currentTime, 0.4);
  });
}
// the provided track: swells in over a few seconds, plays a while, fades out
const MUSIC_TARGET = 0.6;   // relative to the master volume
const MUSIC_FADE_IN = 7;
const MUSIC_HOLD = 18;
const MUSIC_FADE_OUT = 7;
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
  musicVolGain.gain.value = settings.volume;
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

function sfxGlassPick() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  [880, 1245, 1660].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t + i * 0.045);
    g.gain.setValueAtTime(0.0001, t + i * 0.045);
    g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.045 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.045 + 0.28);
    o.connect(g).connect(ctx.destination);
    o.start(t + i * 0.045); o.stop(t + i * 0.045 + 0.3);
  });
}
function sfxStep() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.13);
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  const s = ctx.createBufferSource(); s.buffer = b;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 850 + Math.random() * 350;
  const g = ctx.createGain(); g.gain.value = 0.08;
  s.connect(f).connect(g).connect(ctx.destination);
  s.start(t); s.stop(t + 0.13);
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
  s.connect(f).connect(g).connect(ctx.destination);
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
function sfxDig() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const s = noiseBurst(0.34, (x) => Math.sin(Math.PI * Math.min(1, x * 1.2)) * (1 - x * 0.3));
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(1600, t + 0.22);
  f.frequency.exponentialRampToValueAtTime(600, t + 0.34);
  const g = ctx.createGain(); g.gain.value = 0.04;
  s.connect(f).connect(g).connect(ctx.destination);
  s.start(t); s.stop(t + 0.34);
}
// the blade biting into damp sand: a soft body thud + a granular crunch +
// a short bright spray of grains
function sfxDigImpact() {
  const ctx = audioCtx; if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);

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
  const spd = running ? RUN_SPEED : WALK_SPEED;

  camera.getWorldDirection(forward);
  forward.y = 0; forward.normalize();
  right.crossVectors(forward, camera.up).normalize();
  const target = new THREE.Vector3().addScaledVector(forward, move.y).addScaledVector(right, move.x).multiplyScalar(spd);
  velocity.lerp(target, 1 - Math.pow(0.0016, dt));
  camera.position.addScaledVector(velocity, dt);
  camera.position.x = Math.min(camera.position.x, CLIFF_BLOCK_X);
  camera.position.x = Math.max(camera.position.x, WADE_X);

  if (onGround && canMove && keys['Space'] && !jumpLatch) { vy = JUMP_V; onGround = false; jumpLatch = true; }
  if (!keys['Space']) jumpLatch = false;
  vy -= P_GRAV * dt;
  camBaseY += vy * dt;
  if (camBaseY <= EYE_HEIGHT) { camBaseY = EYE_HEIGHT; vy = 0; onGround = true; }

  const speed = velocity.length();
  bobPhase += dt * speed * 2.1;
  const bob = (moving && onGround) ? Math.sin(bobPhase) * 0.045 * Math.min(speed / WALK_SPEED, 1) : 0;
  camera.position.y = camBaseY + bob;

  staminaEl.classList.toggle('show', stamina < 0.999);
  staminaFill.style.transform = `scaleX(${Math.max(0, stamina)})`;
  staminaFill.classList.toggle('low', exhausted);

  if (moving && onGround && speed > 0.6) {
    const dx = camera.position.x - lastFootPos.x, dz = camera.position.z - lastFootPos.z;
    const gate = running ? 1.0 : 0.8;
    if (dx * dx + dz * dz > gate * gate) {
      moveDir.copy(velocity).setY(0).normalize();
      stampFoot(camera.position.x, camera.position.z, moveDir.x, moveDir.z, footSide);
      footSide = -footSide;
      lastFootPos.set(camera.position.x, 0, camera.position.z);
      sfxStep();
    }
  }

  for (const p of physProps) p.step(dt);
  updatePuffs(dt);

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

  if (started && !ended && camera.position.z < END_Z) showEnd();
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  oceanUniforms.uTime.value += dt;
  update(dt);
  updateHover();
  if (inspecting) {
    updateInspect(dt);
    renderer.render(inspectScene, inspectCamera);
    return;
  }
  renderer.render(scene, camera);
  if (viewmodel.visible) {
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(vmScene, vmCamera);
    renderer.autoClear = true;
  }
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
  castle, shovelWorld, viewmodel, crab, crabWorld, syringe, syringeWorld, bloodJar,
  renderer, inspectScene, inspectCamera,
  openMenu, closeMenu, showEnd, stampFoot, startDig, toggleEquip, spawnPuffs, stampDigHole, beginGame,
  openInspect, closeInspect, startExtraction,
  get shovelItem() { return shovelItem; }, get crabItem() { return crabItem; }, get syringeItem() { return syringeItem; }, get jarItem() { return jarItem; },
  state: () => ({ started, locked, fallbackLook, introDone, noteOpen, menuOpen, inspecting, extracting, crabBled, ended, onGround, stamina: +stamina.toFixed(2), exhausted, digT: +digT.toFixed(2), equipped: equipped && equipped.name, held: held && held.mesh.name, hovered: hovered && hovered.label, inv: inventory.map(i => i.name) }),
  music: () => (musicEl ? { paused: musicEl.paused, t: +musicEl.currentTime.toFixed(1), env: musicEnvGain ? +musicEnvGain.gain.value.toFixed(3) : null, vol: musicVolGain ? +musicVolGain.gain.value.toFixed(2) : null } : { musicEl: null }),
};
