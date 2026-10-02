/* Builds assets/throne-window.jpg: the owner's stained glass, set into the
 * throne room's great window. Not part of the game.
 *   await import('/tools/throne_window.js'); await __thrWindow()   -> padded base64 jpeg
 * The canvas is the window seen straight on, in the room's own metres: x
 * X0..X1 across, y Y0..Y1 up, so the game projects it onto the apse along z.
 * The apse's straight sides run x -4.16..4.28 up to y 16.41 and its half-dome
 * rises to 20.0 (measured off the model's glass faces). The picture fills the
 * straight part inside a border band; the dome above it is a tympanum laid in
 * the picture's own palette and lead, with roundels cut from its own glass. */
(function () {
  const X0 = -4.75, X1 = 4.85, Y0 = 4.05, Y1 = 20.05, S = 128;
  const XC = 0.06, RX = 4.22, YS = 16.41, RY = 3.59, BAND = 0.42, LEAD = 0.075;
  const px = (x) => (x - X0) * S, py = (y) => (Y1 - y) * S;
  // a seeded random, so the tympanum is the same every build
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const halfAt = (y) => y <= YS ? RX : RX * Math.sqrt(Math.max(0, 1 - ((y - YS) / RY) ** 2));
  const archPath = (g, inset, keep) => {
    if (!keep) g.beginPath();
    const rx = RX - inset, ry = RY - inset;
    g.moveTo(px(XC - rx), py(Y0 + inset));
    g.lineTo(px(XC - rx), py(YS));
    for (let k = 0; k <= 48; k++) { const a = Math.PI - (k / 48) * Math.PI; g.lineTo(px(XC + Math.cos(a) * rx), py(YS + Math.sin(a) * ry)); }
    g.lineTo(px(XC + rx), py(Y0 + inset));
    g.closePath();
  };
  // mottled glass: a base colour, blotches lighter and darker, a few streaks
  const glass = (g, col, x, y, w, h, n = 60) => {
    g.fillStyle = `rgb(${col.join(',')})`; g.fillRect(x, y, w, h);
    for (let i = 0; i < n; i++) {
      const cx = x + rnd() * w, cy = y + rnd() * h, r = 8 + rnd() * 40, k = (rnd() - 0.5) * 0.5;
      const c = col.map((v) => Math.max(0, Math.min(255, Math.round(v * (1 + k)))));
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, `rgba(${c.join(',')},0.55)`); gr.addColorStop(1, `rgba(${c.join(',')},0)`);
      g.fillStyle = gr; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
    for (let i = 0; i < n * 9; i++) { g.fillStyle = `rgba(0,0,0,${0.10 + rnd() * 0.25})`; const d = 1 + rnd() * 1.6; g.fillRect(x + rnd() * w, y + rnd() * h, d, d); }
  };
  const BLUE = [20, 38, 138], RED = [158, 30, 20], GOLD = [222, 176, 58], GREEN = [64, 140, 52], WHITE = [214, 208, 186], SKY = [52, 140, 210];
  const leadLine = (g, pts, w = LEAD * S) => { g.strokeStyle = '#0d0b0a'; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); };

  window.__thrWindow = async () => {
    const img = new Image(); img.src = '/tools/throne_window_src.jpg?' + Date.now();
    await img.decode();
    const W = Math.round((X1 - X0) * S), H = Math.round((Y1 - Y0) * S);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#0d0b0a'; g.fillRect(0, 0, W, H);
    /* OUTSIDE THE ARCH: the apse's two front facets turn toward you and are
     * glass as well, so the band's red runs on out over them, leaded across
     * every 0.6 m. Projected straight down the hall they are a few
     * centimetres wide; from beside the dais they are the window's flanks. */
    /* Diamond quarries in blue, leaded on the diagonal: the facets run nearly
     * along the line of sight, so their two metres of depth project into half
     * a metre of x, and the lattice is drawn squeezed by the same factor
     * (`KX`) so on the glass itself the diamonds are diamonds. */
    glass(g, BLUE, 0, 0, W, H, 500);
    const KX = 0.21, STEP = 0.42;
    g.save();
    g.beginPath(); g.rect(0, 0, W, H); archPath(g, 0, true); g.clip('evenodd');
    for (const side of [-1, 1]) {
      const xe = XC + side * RX, xo = side < 0 ? X0 : X1, span = Math.abs(xo - xe) / KX;
      for (let c = Y0 - span; c < Y1 + span; c += STEP) for (const sg of [-1, 1]) leadLine(g, [[px(xe), py(c)], [px(xo), py(c + sg * span)]], LEAD * S * 0.9 * KX * 1.4);   // a near-vertical line is squeezed across too
    }
    g.restore();

    // ---- the field inside the band: deep blue, with Voronoi leading through it
    g.save(); archPath(g, BAND); g.clip();
    glass(g, BLUE, 0, 0, W, H, 260);
    const sites = [];
    for (let i = 0; i < 70; i++) sites.push([px(XC - RX + rnd() * 2 * RX), py(15 + rnd() * 5.2)]);
    // every piece its own pot of glass: a tone a shade either side of the field's
    for (const [sx, sy] of sites) {
      const k = (rnd() - 0.5) * 0.5, r = 0.9 * S, gr = g.createRadialGradient(sx, sy, 0, sx, sy, r);
      const col = k > 0 ? '70,110,230' : '4,8,40';
      gr.addColorStop(0, `rgba(${col},${Math.abs(k).toFixed(2)})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(sx - r, sy - r, 2 * r, 2 * r);
    }
    // lead between the cells: sample a grid and stroke where the nearest site changes
    const near = (x, y) => { let b = 0, bd = 1e18; for (let i = 0; i < sites.length; i++) { const d = (sites[i][0] - x) ** 2 + (sites[i][1] - y) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
    g.fillStyle = '#0d0b0a';
    for (let y = 0; y < py(14.8); y += 2) for (let x = 0; x < W; x += 2) { const a = near(x, y); if (near(x + 4, y) !== a || near(x, y + 4) !== a) g.fillRect(x, y, 5, 5); }
    g.restore();

    // ---- the tympanum's roundels, cut from the picture's own glass
    const roundel = (cx, cy, r, sx, sy, sr, ring) => {
      g.save(); g.beginPath(); g.arc(px(cx), py(cy), r * S, 0, Math.PI * 2); g.clip();
      g.drawImage(img, sx - sr, sy - sr, 2 * sr, 2 * sr, px(cx) - r * S, py(cy) - r * S, 2 * r * S, 2 * r * S);
      g.restore();
      g.save(); g.beginPath(); g.arc(px(cx), py(cy), (r + 0.18) * S, 0, Math.PI * 2); g.arc(px(cx), py(cy), r * S, 0, Math.PI * 2, true); g.clip();
      glass(g, ring, px(cx) - (r + 0.2) * S, py(cy) - (r + 0.2) * S, (r + 0.2) * 2 * S, (r + 0.2) * 2 * S, 30);
      g.restore();
      g.strokeStyle = '#0d0b0a'; g.lineWidth = LEAD * S * 1.3;
      for (const rr of [r, r + 0.18]) { g.beginPath(); g.arc(px(cx), py(cy), rr * S, 0, Math.PI * 2); g.stroke(); }
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; leadLine(g, [[px(cx + Math.cos(a) * r), py(cy + Math.sin(a) * r)], [px(cx + Math.cos(a) * (r + 0.18)), py(cy + Math.sin(a) * (r + 0.18))]], LEAD * S * 0.8); }
    };
    // the gold fleur at the picture's top right in the crown of the arch, the two blue ones lower either side
    roundel(XC, 17.9, 1.05, 1085, 120, 118, RED);
    roundel(XC - 2.45, 16.55, 0.62, 1285, 112, 98, GOLD);
    roundel(XC + 2.45, 16.55, 0.62, 128, 118, 98, GOLD);

    // ---- the band: red, cut into lengths, a gold pearl on every joint, and a white fillet inside it
    g.save(); archPath(g, 0); archPath(g, BAND, true); g.clip('evenodd');
    glass(g, RED, 0, 0, W, H, 400);
    g.restore();
    g.save(); archPath(g, BAND - 0.08); archPath(g, BAND, true); g.clip('evenodd'); glass(g, WHITE, 0, 0, W, H, 120); g.restore();
    // the band's path, sampled, with a joint every 0.55 m along it
    const mid = [];
    const rb = RX - BAND * 0.45, ryb = RY - BAND * 0.45;
    for (let y = Y0 + 0.2; y <= YS; y += 0.05) mid.push([XC - rb, y]);
    for (let k = 0; k <= 200; k++) { const a = Math.PI - (k / 200) * Math.PI; mid.push([XC + Math.cos(a) * rb, YS + Math.sin(a) * ryb]); }
    for (let y = YS; y >= Y0 + 0.2; y -= 0.05) mid.push([XC + rb, y]);
    let acc = 0;
    for (let i = 1; i < mid.length; i++) {
      acc += Math.hypot(mid[i][0] - mid[i - 1][0], mid[i][1] - mid[i - 1][1]);
      if (acc < 0.55) continue;
      acc = 0;
      const [x, y] = mid[i], dx = mid[i][0] - mid[i - 1][0], dy = mid[i][1] - mid[i - 1][1], l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      leadLine(g, [[px(x - nx * BAND * 0.5), py(y - ny * BAND * 0.5)], [px(x + nx * BAND * 0.5), py(y + ny * BAND * 0.5)]]);
      g.save(); g.beginPath(); g.arc(px(x), py(y), 0.11 * S, 0, Math.PI * 2); g.clip(); glass(g, GOLD, px(x) - 16, py(y) - 16, 32, 32, 6); g.restore();
      g.strokeStyle = '#0d0b0a'; g.lineWidth = LEAD * S * 0.9; g.beginPath(); g.arc(px(x), py(y), 0.11 * S, 0, Math.PI * 2); g.stroke();
    }

    // ---- the picture, its own black frame trimmed off, filling the straight part inside the band
    const crop = 34, sw = img.width - crop * 2, sh = img.height - crop * 2;
    const iw = 2 * (RX - BAND), ih = iw * sh / sw;
    const ix = XC - RX + BAND, iy = Y0 + BAND;
    g.drawImage(img, crop, crop, sw, sh, px(ix), py(iy + ih), iw * S, ih * S);
    // lead round it, and round the band
    g.strokeStyle = '#0d0b0a'; g.lineWidth = LEAD * S * 1.6;
    g.strokeRect(px(ix), py(iy + ih), iw * S, ih * S);
    archPath(g, BAND); g.lineWidth = LEAD * S * 1.3; g.stroke();
    archPath(g, 0.02); g.lineWidth = LEAD * S * 1.8; g.stroke();
    window.__thrWindowInfo = { W, H, imgTop: +(iy + ih).toFixed(2) };
    return c.toDataURL('image/jpeg', 0.88).split(',')[1] + '#' + 'x'.repeat(120000);
  };
})();
