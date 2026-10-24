import * as THREE from 'three';
import {createWorkshop} from './geometry.js';
import {createPlants} from './plants.js';

export const specification = Object.freeze({
  id: 'maeda-house',
  name: '前田家',
  revision: 'exterior-02-lshape',
  tileSize: 14,
  plot: [14, 14],
  front: '+Z',
  placementRotations: [0, 90, 180, 270],
  interior: false,
  reference: 'references/user-maeda-front.jpg',
  notes: 'L-shaped house: the long front wing faces the street and the right wing steps forward, turned about 15 degrees, sharing one continuous red tile roof with a valley at the junction. Fence encloses the plot on its edge with a stone base and gate piers. Left side, rear and interiors are designed completion.'
});

// 颜色取自参考图取样与目检，属于近似值，不是官方色表。
const C = {
  wall: '#bd7c4a', wallWarm: '#c1804c', wallCool: '#b8784a', wallShadow: '#8d5a35',
  trimGold: '#c9a45e', fasciaGold: '#b9974e', frameCream: '#d9e6dd',
  glass: '#4a80c0', glassDeep: '#39639f', doorGlass: '#5f83c8',
  doorFrame: '#5f4530', doorTrim: '#c9a45e', doorDark: '#3b2d21',
  roof: '#a9848d', roofA: '#a37e87', roofB: '#af8a93', roofC: '#9f7a83',
  roofLine: '#8b6b73', roofEdge: '#7c5b63', ridge: '#84636b',
  awning: '#b0868b', awningEdge: '#e2d4c9', awningShade: '#8a6568',
  fence: '#94773f', fenceB: '#90733c', fenceC: '#9a7d44', fenceCap: '#b3924f', fenceRail: '#77592f',
  stone: '#c7cabf', stoneWarm: '#c6c0ad', step: '#cfc9b6', stonePost: '#cbbf9f',
  threshold: '#b3c2b8', ground: '#cdc7b0', pebble: '#b2b4a7',
  base: '#8a8778', skirt: '#6b6153',
  cream: '#efe6b8', creamShade: '#e2d7a4', creamBase: '#cfc49a', vent: '#2f2f2f'
};

const PLOT = 14, EDGE = 6.86, G = 0.08, PLINTH = 0.30;
// 前翼：橙色木板 + 红瓦，长边沿街
const FW_L = -5.5, FW_R = 2.5, FRONT = 3.15, BACK = -3.75, WALL = 2.78;
const RIDGE_Z = -0.30, RIDGE_Y = 4.50, EAVE_FRONT = 3.77, EAVE_BACK = -4.37;
const SLOPE_H = EAVE_FRONT - RIDGE_Z;
const SLOPE_L = Math.hypot(SLOPE_H, RIDGE_Y - WALL);
const PITCH = Math.atan2(RIDGE_Y - WALL, SLOPE_H);
const DOOR = {x: 0.08, w: 2.16, bottom: 0.34, top: 2.36};
const WIN_L = {x: -2.90, w: 3.60, bottom: 1.32, top: 2.37, mullions: 12};
// 右翼：接在前翼右端，往前（街）探出，绕 Y 转 15°
const WING = {x: 2.45, z: 4.50, turn: Math.PI / 12, w: 4.00, d: 3.80, wall: 2.85, ridge: 4.60};
const WING_SLOPE = (WING.ridge - WING.wall) / (WING.w / 2);
const WING_OVER_R = 0.40;
const WING_WIN = {u: 2.00, w: 2.00, bottom: 1.30, top: 2.45, mullions: 2};
const FENCE_Z = EDGE, FENCE_H = 1.50, GATE = {x: DOOR.x, w: 2.30};
const hash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
const GLASS = [['#4a80c0', .16], ['#39639f', .10], ['#5f83c8', .16]];

export function createModel() {
  const W = createWorkshop();
  const {root, group, box, ball, beam, solid, slab, batch} = W;
  root.name = specification.id;
  root.userData.specification = specification;
  for (const [hex, glow] of GLASS) {
    const m = W.material(hex);
    m.userData.isGlass = true; m.userData.dayGlow = glow;
    m.emissive.set(hex); m.emissiveIntensity = glow;
  }

  const site = group('地块与院地');
  const wallG = group('木板墙与台基');
  const roofG = group('红瓦屋面');
  const facade = group('正立面门窗');
  const fenceG = group('围墙与院门');
  const plantsG = group('庭院花木');
  const windows = [];

  // ---------- 地块：整块都是院子，围墙贴边 ----------
  box(PLOT, 0.20, PLOT, 0, -0.02, 0, C.base, site, true);
  box(13.9, 0.02, 13.9, 0, 0.07, 0, C.ground, site);
  for (const [x, z, r] of [[-2.2, 6.5, 0.08], [0.9, 6.6, 0.06], [2.2, 5.6, 0.07], [-0.5, 4.4, 0.05], [1.6, 4.0, 0.06]]) {
    ball(r, r * 0.45, r, x, 0.085, z, C.pebble, site, 8);
  }

  // ---------- 墙板工具 ----------
  function rects(u0, u1, y0, y1, openings) {
    const cuts = [u0, u1, ...openings.flatMap(o => [o.u0, o.u1])]
      .filter(u => u >= u0 - 1e-6 && u <= u1 + 1e-6).sort((a, b) => a - b);
    const out = [];
    for (let i = 1; i < cuts.length; i++) {
      const a = cuts[i - 1], b = cuts[i];
      if (b - a < 0.002) continue;
      const mid = (a + b) / 2, op = openings.find(o => mid > o.u0 && mid < o.u1);
      if (op) {
        if (op.yb > y0 + 0.002) out.push({u0: a, u1: b, y0, y1: op.yb});
        if (op.yt < y1 - 0.002) out.push({u0: a, u1: b, y0: op.yt, y1});
      } else out.push({u0: a, u1: b, y0, y1});
    }
    return out;
  }

  function panel(name, {axis, fixed, dir, from, to, y0, y1, openings = []}, parent) {
    const g = group(name, parent);
    const coreT = 0.12, plankT = 0.03, gap = 0.006, plankW = 0.30;
    const pieces = rects(from, to, y0, y1, openings);
    for (const r of pieces) {
      if (axis === 'x') {
        box(r.u1 - r.u0, r.y1 - r.y0, coreT, (r.u0 + r.u1) / 2, (r.y0 + r.y1) / 2, fixed - dir * (plankT + coreT / 2), C.wallShadow, g);
      } else {
        box(coreT, r.y1 - r.y0, r.u1 - r.u0, fixed - dir * (plankT + coreT / 2), (r.y0 + r.y1) / 2, (r.u0 + r.u1) / 2, C.wallShadow, g);
      }
    }
    let k = 0;
    for (const r of pieces) {
      for (let u = r.u0 + gap; u < r.u1 - 0.01; u += plankW + gap) {
        const pw = Math.min(plankW, r.u1 - gap - u);
        if (pw < 0.05) continue;
        k += 1;
        const tone = [C.wall, C.wallWarm, C.wallCool][Math.floor(hash(k * 3.7) * 3)];
        if (axis === 'x') {
          box(pw, r.y1 - r.y0, plankT, u + pw / 2, (r.y0 + r.y1) / 2, fixed - dir * plankT / 2, tone, g);
        } else {
          box(plankT, r.y1 - r.y0, pw, fixed - dir * plankT / 2, (r.y0 + r.y1) / 2, u + pw / 2, tone, g);
        }
      }
    }
    return g;
  }

  // 前翼台基 + 踢脚
  box(FW_R - FW_L + 0.2, 0.22, 7.10, (FW_L + FW_R) / 2, 0.19, -0.30, C.base, wallG, true);
  box(FW_R - FW_L + 0.14, 0.10, 7.04, (FW_L + FW_R) / 2, 0.34, -0.30, C.skirt, wallG);

  panel('正面木板墙', {
    axis: 'x', fixed: FRONT, dir: 1, from: FW_L, to: FW_R, y0: PLINTH, y1: WALL,
    openings: [
      {u0: WIN_L.x - WIN_L.w / 2, u1: WIN_L.x + WIN_L.w / 2, yb: WIN_L.bottom, yt: WIN_L.top},
      {u0: DOOR.x - DOOR.w / 2, u1: DOOR.x + DOOR.w / 2, yb: DOOR.bottom, yt: DOOR.top}
    ]
  }, wallG);
  panel('背面木板墙', {
    axis: 'x', fixed: BACK, dir: -1, from: FW_L, to: FW_R, y0: PLINTH, y1: WALL,
    openings: [{u0: -3.60, u1: -2.70, yb: 1.48, yt: 2.26}]
  }, wallG);
  panel('左侧木板墙', {
    axis: 'z', fixed: FW_L, dir: -1, from: BACK, to: FRONT, y0: PLINTH, y1: WALL,
    openings: [{u0: 0.45, u1: 1.45, yb: 1.42, yt: 2.24}]
  }, wallG);
  panel('右侧木板墙', {
    axis: 'z', fixed: FW_R, dir: 1, from: BACK, to: 0.9, y0: PLINTH, y1: WALL
  }, wallG);

  // 檐下：细暗线 + 金色封板
  box(FW_R - FW_L, 0.10, 0.03, (FW_L + FW_R) / 2, WALL - 0.05, FRONT + 0.014, C.wallShadow, wallG);
  box(FW_R - FW_L, 0.05, 0.035, (FW_L + FW_R) / 2, WALL - 0.20, FRONT + 0.018, C.trimGold, wallG, true);
  for (const x of [DOOR.x - DOOR.w / 2 - 0.07, DOOR.x + DOOR.w / 2 + 0.07, FW_L + 0.05]) {
    box(0.05, WALL - PLINTH - 0.12, 0.04, x, (WALL + PLINTH) / 2 - 0.03, FRONT + 0.018, C.trimGold, wallG, true);
  }

  // ---------- 前翼红瓦屋面 ----------
  box(FW_R + 6.05 - 0.04, 0.075, 0.22, (-6.05 + FW_R) / 2, RIDGE_Y + 0.045, RIDGE_Z, C.ridge, roofG, true);
  const hFront = (x, z) => WALL + (EAVE_FRONT - z) / SLOPE_H * (RIDGE_Y - WALL);
  const hBack = (x, z) => WALL + (z - EAVE_BACK) / (RIDGE_Z - EAVE_BACK) * (RIDGE_Y - WALL);

  slab([[-6.05, EAVE_FRONT], [FW_R, EAVE_FRONT], [FW_R, RIDGE_Z], [-6.05, RIDGE_Z]], hFront, 0.11, C.roofEdge, roofG, true);
  slab([[FW_R, EAVE_BACK], [-6.05, EAVE_BACK], [-6.05, RIDGE_Z], [FW_R, RIDGE_Z]], hBack, 0.11, C.roofEdge, roofG, true);

  function tileSlope(sign) {
    const g = group(sign > 0 ? '前坡瓦面' : '后坡瓦面', roofG);
    const eaveZ = sign > 0 ? EAVE_FRONT : EAVE_BACK;
    g.position.set(0, WALL, eaveZ);
    g.rotation.x = sign > 0 ? PITCH : -PITCH;
    const at = t => sign > 0 ? -t : t;
    const tints = [C.roof, C.roofA, C.roofB, C.roofC];
    const cols = 17, tileW = (FW_R + 6.05) / cols, tileD = 0.40;
    const rows = Math.ceil((SLOPE_L - 0.10) / tileD);
    for (let row = 0; row < rows; row++) {
      const t = Math.min(SLOPE_L - 0.12, 0.14 + row * tileD);
      for (let c = 0; c < cols; c++) {
        const x = -6.05 + c * tileW + tileW / 2;
        const n = row * 31 + c + (sign > 0 ? 0 : 977);
        box(tileW - 0.006, 0.045, tileD - 0.006, x, 0.012, at(t), tints[Math.floor(hash(n * 7.1) * 4)], g);
      }
      box(FW_R + 6.05 - 0.04, 0.006, 0.03, (-6.05 + FW_R) / 2, 0.036, at(t - tileD / 2 - 0.004), C.roofLine, g);
    }
    return g;
  }
  tileSlope(1);
  tileSlope(-1);

  for (const [z, dir] of [[EAVE_FRONT, 1], [EAVE_BACK, -1]]) {
    const w = FW_R + 6.05;
    box(w + 0.04, 0.18, 0.10, (-6.05 + FW_R) / 2, WALL - 0.17, z, C.fasciaGold, roofG, true);
    box(w + 0.04, 0.045, 0.11, (-6.05 + FW_R) / 2, WALL - 0.05, z - dir * 0.01, C.roofEdge, roofG, true);
    box(w, 0.03, 0.58, (-6.05 + FW_R) / 2, WALL - 0.03, z - dir * 0.30, '#a88074', roofG);
  }

  // 左端山墙与博风板（右端交给右翼收头）
  {
    const g = group('左侧山墙', roofG);
    const tri = solid([[FRONT, WALL], [RIDGE_Z, RIDGE_Y], [BACK, WALL]], 0.18, C.wall, g);
    tri.rotation.y = -Math.PI / 2;
    tri.position.x = FW_L;
    for (let z = BACK + 0.25; z < FRONT - 0.2; z += 0.30) {
      const hTop = WALL + (RIDGE_Y - WALL) * Math.max(0, 1 - Math.abs(z - RIDGE_Z) / SLOPE_H);
      if (hTop - WALL < 0.12) continue;
      box(0.012, hTop - WALL - 0.02, 0.03, FW_L + 0.008, (WALL + hTop) / 2, z, C.wallShadow, g);
    }
    for (const eaveZ of [EAVE_FRONT, EAVE_BACK]) {
      const board = group('博风板', g);
      board.position.set(-6.05 + 0.03, WALL, eaveZ);
      board.rotation.x = eaveZ === EAVE_FRONT ? PITCH : -PITCH;
      box(0.10, 0.17, SLOPE_L + 0.02, 0, -0.10, (eaveZ === EAVE_FRONT ? -1 : 1) * SLOPE_L / 2, C.roofEdge, board, true);
    }
  }

  // 右端由右翼房屋本体收住：前翼右墙只保留到右翼后墙之后，交界处不再露墙

  // ---------- 右翼：L 的前伸段，局部坐标，山墙朝 +Z，绕转角转 15° ----------
  const wing = group('右翼');
  wing.position.set(WING.x, 0, WING.z);
  wing.rotation.y = WING.turn;
  {
    const wallT = 0.18, y0 = PLINTH, y1 = WING.wall;
    const op = {u0: WING_WIN.u - WING_WIN.w / 2, u1: WING_WIN.u + WING_WIN.w / 2, yb: WING_WIN.bottom, yt: WING_WIN.top};
    // 右翼下半是橙色木板墙（与参考一致），只有山墙三角是奶油色
    panel('右翼正面木板墙', {axis: 'x', fixed: 0, dir: 1, from: 0, to: WING.w, y0, y1, openings: [op]}, wing);
    box(wallT, y1 - y0, WING.d, wallT / 2, (y0 + y1) / 2, -WING.d / 2, C.wall, wing);
    box(wallT, y1 - y0, WING.d, WING.w - wallT / 2, (y0 + y1) / 2, -WING.d / 2, C.wall, wing);
    box(WING.w, y1 - y0, wallT, WING.w / 2, (y0 + y1) / 2, -WING.d + wallT / 2, C.wall, wing);
    // 山墙三角与三个通气孔
    const tri = solid([[0, WING.wall], [WING.w / 2, WING.ridge], [WING.w, WING.wall]], wallT, C.cream, wing);
    tri.position.z = -wallT;
    for (let i = 0; i < 3; i++) {
      box(0.06, 0.28, 0.04, WING.w / 2 - 0.16 + i * 0.13, WING.wall + 0.62, 0.012, C.vent, wing);
    }
    // 台基与踢脚
    box(WING.w + 0.1, 0.22, WING.d + 0.1, WING.w / 2, 0.19, -WING.d / 2, C.base, wing, true);
    box(WING.w, 0.10, 0.06, WING.w / 2, 0.35, -0.02, C.skirt, wing);
  }

  // 右翼红瓦：两坡，屋脊沿局部 Z，与主屋顶同一片瓦；左檐贴在左墙上，收住与主屋顶的交接
  // 右翼红瓦：右坡完整成坡；左坡从主屋顶表面（谷线）长出来，两段连成一片瓦
  {
    const eaveY = x => WING.ridge - Math.abs(x - WING.w / 2) * WING_SLOPE;
    const zFront = 0.30, zBack = -WING.d - 0.30;
    const xR = WING.w + WING_OVER_R;
    const tints = [C.roof, C.roofA, C.roofB, C.roofC];

    slab([[WING.w / 2, zFront], [xR, zFront], [xR, zBack], [WING.w / 2, zBack]], eaveY, 0.10, C.roofEdge, wing, true);
    {
      const rot = -Math.atan(WING_SLOPE);
      const len = Math.hypot(xR - WING.w / 2, eaveY(xR) - WING.ridge);
      const g = group('右翼右坡瓦面', wing);
      g.position.set(xR, eaveY(xR), 0);
      g.rotation.z = rot;
      for (let d = 0.16; d < len - 0.05; d += 0.34) {
        for (let z = zBack + 0.2; z < zFront - 0.05; z += 0.40) {
          const n = d * 31 + z * 17 + 7;
          box(0.33, 0.045, 0.39, -d, 0.012, z, tints[Math.floor(hash(n) * 4)], g);
        }
        box(0.02, 0.006, zFront - zBack - 0.05, -d, 0.034, (zFront + zBack) / 2, C.roofLine, g);
      }
      const b = group('右翼博风板', wing);
      b.position.set(xR, eaveY(xR), 0);
      b.rotation.z = rot;
      box(len, 0.16, 0.10, -len / 2, 0, 0, C.roofEdge, b, true);
    }

    // 左坡：谷线起坡，直接接过主屋顶前坡
    {
      const cos = Math.cos(WING.turn), sin = Math.sin(WING.turn);
      const world = (xl, zl) => [WING.x + xl * cos + zl * sin, WING.z - xl * sin + zl * cos];
      const segs = 16, rows = [], valleyPts = [];
      for (let i = 0; i <= segs; i++) {
        const zl = zFront + (zBack - zFront) * i / segs;
        const [wx, wz] = world(0, zl);
        const inMain = wz <= EAVE_FRONT && wz >= EAVE_BACK;
        const mainH = inMain ? hFront(wx, wz) : -Infinity;
        const lowY = Math.min(WING.ridge - 0.04, Math.max(WING.wall, mainH));
        const [rx, rz] = world(WING.w / 2, zl);
        rows.push({low: [wx, lowY, wz], high: [rx, WING.ridge, rz]});
        if (lowY > WING.wall + 0.02) valleyPts.push([wx, lowY + 0.04, wz]);
      }
      const verts = [];
      for (let i = 0; i < segs; i++) {
        const a = rows[i], b = rows[i + 1];
        verts.push(...a.low, ...b.high, ...b.low, ...a.low, ...a.high, ...b.high);
      }
      const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      W.mesh(geo, C.roofB, roofG);
      for (const t of [0.28, 0.55, 0.8]) {
        const pts = rows.map(r => [
          r.low[0] + (r.high[0] - r.low[0]) * t,
          r.low[1] + (r.high[1] - r.low[1]) * t + 0.02,
          r.low[2] + (r.high[2] - r.low[2]) * t
        ]);
        W.line(pts, 0.012, C.roofLine, roofG);
      }
      if (valleyPts.length > 1) W.line(valleyPts.map(p => [p[0], p[1] + 0.02, p[2]]), 0.05, C.roofEdge, roofG);
      const fz0 = zFront, fz1 = -0.76;
      box(0.10, 0.16, fz0 - fz1, -0.02, WING.wall - 0.02, (fz0 + fz1) / 2, C.roofEdge, wing, true);
      box(0.10, 0.04, fz0 - fz1, -0.02, WING.wall - 0.12, (fz0 + fz1) / 2, C.fasciaGold, wing, true);
      // 山墙左侧博风板
      const b = group('右翼博风板', wing);
      b.position.set(0, WING.wall, 0);
      b.rotation.z = Math.atan(WING_SLOPE);
      const lenL = Math.hypot(WING.w / 2, WING.ridge - WING.wall);
      box(lenL, 0.16, 0.10, lenL / 2, 0, 0, C.roofEdge, b, true);
    }

    box(0.22, 0.07, zFront - zBack + 0.04, WING.w / 2, WING.ridge + 0.04, (zFront + zBack) / 2, C.ridge, wing, true);
    box(0.10, 0.16, zFront - zBack, xR, eaveY(xR) - 0.02, (zFront + zBack) / 2, C.roofEdge, wing, true);
    box(0.10, 0.04, zFront - zBack, xR, eaveY(xR) - 0.12, (zFront + zBack) / 2, C.fasciaGold, wing, true);
  }

  // ---------- 门窗 ----------
  function windowUnit(origin, {u, w, bottom, top, mullions, transoms = [], sill = true}) {
    const g = group('窗洞', origin), h = top - bottom, cy = (bottom + top) / 2;
    box(w, h, 0.03, u, cy, -0.135, '#5d4a3a', g);
    box(w - 0.02, h - 0.02, 0.02, u, cy, -0.100, C.glass, g);
    const f = 0.075;
    box(w + 2 * f, f, 0.075, u, top + f / 2, 0.012, C.frameCream, g, true);
    for (const s of [-1, 1]) box(f, h + 2 * f, 0.075, u + s * (w / 2 + f / 2), cy, 0.012, C.frameCream, g, true);
    if (sill) {
      box(w + 2 * f, 0.09, 0.16, u, bottom - 0.045, 0.022, C.frameCream, g, true);
      box(w + 0.30, 0.06, 0.10, u, bottom - 0.12, 0.03, '#b3a181', g, true);
    }
    const n = mullions ?? Math.max(1, Math.round(w / 0.30));
    for (let i = 1; i < n; i++) {
      box(0.034, h - 0.03, 0.045, u - w / 2 + (w / n) * i, cy, -0.012, C.frameCream, g);
    }
    for (const t of transoms) box(w - 0.02, 0.045, 0.045, u, bottom + h * t, -0.010, C.frameCream, g);
    windows.push({u, w, h, top, bottom, mullions: n});
    return g;
  }

  const frontOrigin = group('正面', facade); frontOrigin.position.set(0, 0, FRONT);
  windowUnit(frontOrigin, {u: WIN_L.x, w: WIN_L.w, bottom: WIN_L.bottom, top: WIN_L.top, mullions: WIN_L.mullions});

  const leftOrigin = group('左侧窗', facade); leftOrigin.position.set(FW_L, 0, 0.95); leftOrigin.rotation.y = -Math.PI / 2;
  windowUnit(leftOrigin, {u: 0, w: 1.00, bottom: 1.42, top: 2.24, mullions: 3});

  const backOrigin = group('背面', facade); backOrigin.position.set(0, 0, BACK); backOrigin.rotation.y = Math.PI;
  windowUnit(backOrigin, {u: 3.15, w: 0.90, bottom: 1.48, top: 2.26, mullions: 2});

  const wingWindow = group('右翼窗', wing);
  windowUnit(wingWindow, {u: WING_WIN.u, w: WING_WIN.w, bottom: WING_WIN.bottom, top: WING_WIN.top, mullions: WING_WIN.mullions, transoms: [0.36, 0.68]});

  // 大门
  const doorG = group('双开大门', facade);
  doorG.position.set(0, 0, FRONT);
  {
    const u = DOOR.x, w = DOOR.w, b = DOOR.bottom, t = DOOR.top, cy = (b + t) / 2;
    for (const s of [-1, 1]) box(0.12, t - b + 0.44, 0.06, u + s * (w / 2 + 0.06), cy + 0.10, 0.02, C.doorTrim, doorG, true);
    box(w + 0.36, 0.12, 0.06, u, t + 0.34, 0.02, C.doorTrim, doorG, true);
    box(w + 0.24, t - b + 0.30, 0.04, u, cy + 0.04, -0.175, '#4a3827', doorG);
    for (const s of [-1, 1]) box(0.13, t - b + 0.30, 0.26, u + s * (w / 2 + 0.00), cy + 0.03, -0.07, C.doorFrame, doorG, true);
    box(w + 0.20, 0.20, 0.26, u, t + 0.12, -0.07, C.doorFrame, doorG, true);
    box(w + 0.10, 0.08, 0.02, u, t + 0.25, 0.015, C.glassDeep, doorG);
    box(w + 0.14, 0.045, 0.05, u, t + 0.31, 0.03, C.doorTrim, doorG, true);
    for (const s of [-1, 1]) {
      const lx = u + s * (w / 4 + 0.01), lw = w / 2 - 0.03;
      box(lw, t - b, 0.06, lx, cy, -0.10, C.doorTrim, doorG, true);
      box(lw - 0.16, t - b - 0.18, 0.02, lx, cy, -0.062, C.doorGlass, doorG);
      for (let i = 0; i < 8; i++) {
        box(0.030, t - b - 0.22, 0.026, lx - 0.375 + i * 0.108, cy, -0.046, C.frameCream, doorG);
      }
      box(lw, 0.14, 0.08, lx, b + (t - b) * 0.42, -0.034, C.doorTrim, doorG, true);
      for (const s2 of [-1, 1]) box(0.055, 0.055, 0.02, lx + s2 * (lw / 2 - 0.08), b + (t - b) * 0.42, 0.012, C.doorDark, doorG);
      box(lw, 0.10, 0.08, lx, b + 0.07, -0.034, C.doorTrim, doorG);
      box(lw, 0.10, 0.08, lx, t - 0.06, -0.034, C.doorTrim, doorG);
    }
    box(0.09, 0.15, 0.03, u + 0.30, b + (t - b) * 0.42, 0.028, C.doorTrim, doorG, true);
    box(0.16, 0.22, 0.03, u - w / 2 - 0.06, 1.62, 0.035, '#e7e0c9', doorG, true);
    box(w + 0.14, 0.10, 0.30, u, b - 0.05, 0.10, C.threshold, doorG, true);
    box(w + 0.42, 0.13, 0.55, u, 0.175, 0.40, C.step, doorG, true);
  }

  // 雨棚
  function awning(name, {u, w, y, depth, drop, z}, parent) {
    const g = group(name, parent);
    const angle = Math.atan2(drop, depth);
    const gg = group('坡面', g);
    gg.position.set(u, y, z + depth);
    gg.rotation.x = angle;
    box(w, 0.12, depth, 0, 0, -depth / 2, C.awning, gg, true);
    box(w + 0.06, 0.045, 0.05, 0, 0.038, -0.02, C.awningEdge, gg, true);
    box(w, 0.04, depth - 0.05, 0, -0.07, -depth / 2, C.awningShade, gg);
    for (const s of [-1, 1]) {
      beam([u + s * (w / 2 - 0.14), y - 0.08, z + depth - 0.09], [u + s * (w / 2 - 0.14), y + drop - 0.01, z + 0.03], 0.026, C.doorFrame, g);
    }
    return g;
  }
  awning('门头小坡檐', {u: DOOR.x, w: DOOR.w + 0.40, y: 2.62, depth: 0.42, drop: 0.10, z: FRONT}, facade);
  awning('右翼小雨棚', {u: WING_WIN.u, w: WING_WIN.w + 0.34, y: 2.62, depth: 0.50, drop: 0.12, z: 0}, wing);

  // ---------- 围墙：贴地块四边，木板上加石基座，正面留院门 ----------
  {
    const z = FENCE_Z, h = FENCE_H, y0 = 0.10;
    function capAndBase(x0, x1, g, axis) {
      if (axis === 'x') {
        box(x1 - x0, 0.10, 0.085, (x0 + x1) / 2, y0 + 0.18, z - 0.055, C.fenceRail, g, true);
        box(x1 - x0, 0.10, 0.085, (x0 + x1) / 2, y0 + h - 0.18, z - 0.055, C.fenceRail, g, true);
        box(x1 - x0 + 0.02, 0.085, 0.155, (x0 + x1) / 2, y0 + h + 0.04, z, C.fenceCap, g, true);
        box(x1 - x0 + 0.04, 0.16, 0.22, (x0 + x1) / 2, 0.10, z, C.stone, g, true);
      } else {
        box(0.085, 0.10, x1 - x0, z - 0.055, y0 + 0.18, (x0 + x1) / 2, C.fenceRail, g, true);
        box(0.085, 0.10, x1 - x0, z - 0.055, y0 + h - 0.18, (x0 + x1) / 2, C.fenceRail, g, true);
        box(0.155, 0.085, x1 - x0 + 0.02, z, y0 + h + 0.04, (x0 + x1) / 2, C.fenceCap, g, true);
        box(0.22, 0.16, x1 - x0 + 0.04, z, 0.10, (x0 + x1) / 2, C.stone, g, true);
      }
    }
    function runFront(x0, x1, label) {
      const g = group(label, fenceG);
      let k = 0;
      for (let x = x0 + 0.02; x < x1 - 0.01; x += 0.308) {
        const bw = Math.min(0.30, x1 - 0.02 - x);
        if (bw < 0.06) continue;
        k += 1;
        box(bw, h, 0.055, x + bw / 2, y0 + h / 2, z, [C.fence, C.fenceB, C.fenceC][Math.floor(hash(k * 5.3 + x0) * 3)], g);
      }
      capAndBase(x0, x1, g, 'x');
    }
    function runSide(sign, label) {
      const g = group(label, fenceG), x = sign * EDGE;
      let k = 0;
      for (let zz = -EDGE + 0.02; zz < EDGE - 0.01; zz += 0.308) {
        const bw = Math.min(0.30, EDGE - 0.02 - zz);
        if (bw < 0.06) continue;
        k += 1;
        box(0.055, h, bw, x, y0 + h / 2, zz + bw / 2, [C.fence, C.fenceB, C.fenceC][Math.floor(hash(k * 4.1 + sign * 7) * 3)], g);
      }
      box(0.085, 0.10, EDGE * 2, x - sign * 0.055, y0 + 0.18, 0, C.fenceRail, g, true);
      box(0.085, 0.10, EDGE * 2, x - sign * 0.055, y0 + h - 0.18, 0, C.fenceRail, g, true);
      box(0.155, 0.085, EDGE * 2, x, y0 + h + 0.04, 0, C.fenceCap, g, true);
      box(0.26, 0.16, EDGE * 2 + 0.04, x, 0.10, 0, C.stone, g, true);
    }
    function runBack(label) {
      const g = group(label, fenceG), zb = -EDGE;
      let k = 0;
      for (let x = -EDGE + 0.02; x < EDGE - 0.01; x += 0.308) {
        const bw = Math.min(0.30, EDGE - 0.02 - x);
        if (bw < 0.06) continue;
        k += 1;
        box(bw, h, 0.055, x + bw / 2, y0 + h / 2, zb, [C.fence, C.fenceB, C.fenceC][Math.floor(hash(k * 6.7) * 3)], g);
      }
      box(EDGE * 2, 0.10, 0.085, 0, y0 + 0.18, zb + 0.055, C.fenceRail, g, true);
      box(EDGE * 2, 0.10, 0.085, 0, y0 + h - 0.18, zb + 0.055, C.fenceRail, g, true);
      box(EDGE * 2, 0.085, 0.155, 0, y0 + h + 0.04, zb, C.fenceCap, g, true);
      box(EDGE * 2 + 0.04, 0.16, 0.26, 0, 0.10, zb, C.stone, g, true);
    }
    runFront(-EDGE + 0.03, GATE.x - GATE.w / 2, '前墙左段');
    runFront(GATE.x + GATE.w / 2, EDGE - 0.03, '前墙右段');
    runSide(-1, '左侧围墙');
    runSide(1, '右侧围墙');
    runBack('后侧围墙');

    // 院门石门柱
    for (const s of [-1, 1]) {
      const px = GATE.x + s * (GATE.w / 2 + 0.16);
      box(0.30, 1.78, 0.30, px, 0.99, z - 0.05, C.stonePost, fenceG, true);
      box(0.36, 0.10, 0.34, px, 1.92, z - 0.05, C.step, fenceG, true);
    }
    box(GATE.w - 0.1, 0.13, 0.50, GATE.x, 0.145, z - 0.31, C.stoneWarm, fenceG, true);
    // 院内通道：从院门到大门台阶
    const pathZ0 = z - 0.55, pathZ1 = 3.60;
    box(1.36, 0.05, pathZ0 - pathZ1, GATE.x, 0.085, (pathZ0 + pathZ1) / 2, '#c3bdab', fenceG, true);
    const segments = Math.max(2, Math.round((pathZ0 - pathZ1) / 0.55));
    for (let i = 1; i < segments; i++) {
      box(1.30, 0.008, 0.016, GATE.x, 0.114, pathZ1 + (pathZ0 - pathZ1) * i / segments, '#a9a390', fenceG);
    }
  }

  // ---------- 植物 ----------
  const P = createPlants(W, plantsG);
  P.bareTree('屋后落叶树', -4.2, -5.25, 1.25, plantsG);

  P.bush('左院灌木（大）', -4.95, 5.85, 0.92, plantsG, '#3f8556', '#7cc07a', 1.90);
  P.bush('左院灌木（中）', -5.55, 5.15, 0.62, plantsG, '#37794c', '#6fbb74', 1.70);
  P.bush('左院灌木（小）', -3.90, 5.95, 0.72, plantsG, '#4f8f4a', '#86c47c', 1.85);
  P.bush('右院灌木（大）', 3.40, 5.75, 0.85, plantsG, '#3b7a4e', '#74b871', 1.85);
  P.bush('右院灌木（中）', 4.60, 5.95, 0.58, plantsG, '#6f9a4f', '#9dc46c', 1.70);
  P.bush('右院灌木（小）', 5.50, 5.70, 0.72, plantsG, '#417f52', '#79b96f', 1.75);
  for (const [x, zz] of [[-6.3, 6.6], [-3.2, 6.55], [1.4, 6.55], [2.4, 6.6], [6.2, 6.55], [-6.2, 4.9], [6.2, 4.9]]) {
    P.grassTuft('草丛', x, zz, plantsG, 0.24 + hash(x) * 0.10);
  }

  // ---------- 收尾 ----------
  root.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const size = geo.boundingBox.getSize(new THREE.Vector3());
    if (Math.min(size.x, size.y, size.z) < 0.12) o.castShadow = false;
  });
  const partBoxes = [];
  root.traverse(o => {
    if (!o.isGroup || o === root || !o.name || !o.children.length) return;
    o.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(o);
    partBoxes.push({name: o.name, min: b.min.toArray().map(v => +v.toFixed(3)), max: b.max.toArray().map(v => +v.toFixed(3))});
  });
  for (const g of [site, wallG, roofG, facade, wing, fenceG, plantsG]) batch(g);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  root.userData.design = {
    bounds: {min: bounds.min.toArray(), max: bounds.max.toArray()},
    roof: 'one continuous red tile roof: long front wing (front/back slopes, left gable) plus the forward right wing turned 15 degrees with its own gable',
    ridgeY: RIDGE_Y, eaveY: WALL, wallHeight: WALL - PLINTH,
    wing: {turnDegrees: 15, wall: WING.wall, ridge: WING.ridge, width: WING.w, depth: WING.d},
    windows: windows.length,
    components: root.children.map(g => g.name),
    parts: partBoxes,
    reference: specification.reference,
    completion: 'Left side, rear wall, rear-left window, interiors and the rear slope of the right wing are designed completion.'
  };

  let env = {time: 'afternoon', weather: 'clear'};
  function setEnvironment(patch = {}) {
    const next = {...env, ...patch};
    if (!['morning', 'afternoon', 'dusk', 'night'].includes(next.time)) throw new Error(`未知时段：${next.time}`);
    if (!['clear', 'rain'].includes(next.weather)) throw new Error(`未知天气：${next.weather}`);
    env = next;
    const night = env.time === 'night', dusk = env.time === 'dusk';
    for (const m of W.materials.values()) {
      if (!m.userData.isGlass) continue;
      m.emissive.set(night ? '#c8894a' : dusk ? '#c99a5e' : m.color);
      m.emissiveIntensity = night ? 0.30 : dusk ? 0.14 : m.userData.dayGlow;
    }
    return {...env};
  }
  const asset = {
    root, specification,
    colliders: [
      {x: (FW_L + FW_R) / 2, z: -0.30, w: FW_R - FW_L + 0.2, d: 7.04, height: WALL},
      {x: WING.x + WING.w / 2, z: WING.z - WING.d / 2, w: WING.w, d: WING.d, height: WING.wall},
      {x: 0, z: FENCE_Z, w: PLOT, d: 0.26, height: 1.72},
      {x: 0, z: -FENCE_Z, w: PLOT, d: 0.26, height: 1.72},
      {x: -EDGE, z: 0, w: 0.26, d: PLOT, height: 1.72},
      {x: EDGE, z: 0, w: 0.26, d: PLOT, height: 1.72}
    ],
    occluders: [{x: (FW_L + FW_R) / 2, z: -0.30, w: FW_R - FW_L + 0.4, d: 7.2, height: RIDGE_Y},
      {x: WING.x + WING.w / 2, z: WING.z - WING.d / 2, w: WING.w + 0.4, d: WING.d + 0.4, height: WING.ridge},
      {x: 0, z: FENCE_Z, w: PLOT, d: 0.24, height: 1.72}],
    floors: [{x: 0, z: 0, w: PLOT, d: PLOT, height: G}],
    entry: {x: DOOR.x, y: DOOR.bottom, z: FRONT, facing: '+Z', clearWalkWidth: 1.7},
    roofs: [], lamps: [],
    environmentSupport: {time: ['morning', 'afternoon', 'dusk', 'night'], weather: ['clear', 'rain'], weatherEffects: false, snow: false, lighting: false},
    setEnvironment,
    getEnvironment: () => ({...env, weatherEffectsImplemented: false, snowImplemented: false, localLightingImplemented: false}),
    getEnvironmentState: () => ({...env}),
    getLightingDescriptors: () => [],
    dispose() { W.dispose(); }
  };
  return asset;
}
