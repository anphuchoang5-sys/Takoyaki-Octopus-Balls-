// 本建筑私有植物：落叶树、圆灌木、草簇。全部为真实几何，不使用贴图。
export function createPlants(W, root) {
  const {THREE,group,box,ball,cylinder,beam} = W;
  const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const shade = (hex, dl) => '#' + new THREE.Color(hex).offsetHSL(0, 0, dl).getHexString();

  function leafPlates(x, y, z, rx, ry, rz, count, color, parent, seed) {
    for (let i = 0; i < count; i++) {
      const a = rnd(seed + i * 2.7) * Math.PI * 2, b = (rnd(seed + i * 5.3) - .3) * 1.5;
      const px = x + Math.cos(a) * Math.cos(b) * rx * .94;
      const py = y + Math.sin(b) * ry * .94;
      const pz = z + Math.sin(a) * Math.cos(b) * rz * .94;
      const leaf = ball(.09 + rnd(seed + i) * .045, .035, .115 + rnd(seed + i * 3) * .04, px, py, pz, color, parent, 6);
      leaf.rotation.set(rnd(i) * .8, a, .2 + rnd(i + 4) * .6);
    }
  }

  function bush(name, x, z, radius, parent, tint = '#3f8556', tick = '#7cc07a', stretch = 1.30) {
    const g = group(name, parent);
    const deep = shade(tint, -.055), pale = shade(tint, .05);
    const S = stretch; // 竖向拉伸：前院灌木要高矮不一并高过围墙
    ball(radius, radius * .74 * S, radius, x, radius * .70 * S, z, tint, g, 16);
    ball(radius * .66, radius * .52 * S, radius * .66, x - radius * .58, radius * .55 * S, z + radius * .12, deep, g, 14);
    ball(radius * .62, radius * .50 * S, radius * .62, x + radius * .56, radius * .58 * S, z - radius * .14, deep, g, 14);
    ball(radius * .46, radius * .38 * S, radius * .46, x + radius * .06, radius * 1.02 * S, z + radius * .06, tint, g, 12);
    ball(radius * .34, radius * .30 * S, radius * .34, x - radius * .30, radius * .92 * S, z - radius * .22, pale, g, 10);
    ball(radius * .30, radius * .26 * S, radius * .30, x + radius * .36, radius * .88 * S, z + radius * .24, pale, g, 10);
    leafPlates(x, radius * .72 * S, z, radius, radius * .78 * S, radius, 14, tick, g, x * 3.1 + z * 7.7);
    return g;
  }

  function bareTree(name, x, z, scale, parent) {
    const g = group(name, parent);
    const bark = '#35504c', barkLight = '#3f5f58';
    let seed = 0;
    const R = () => { seed += 1; return rnd(seed * 7.13 + x * 3.7 + z * 2.3); };

    function branch(start, dir, len, rad, depth, endColor) {
      const end = [start[0] + dir[0] * len, start[1] + dir[1] * len, start[2] + dir[2] * len];
      beam(start, end, rad, endColor, g, rad * .72);
      if (depth <= 0) return;
      const count = 2 + (R() > .62 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const jitter = [(R() - .5) * .95, .30 + (R() - .5) * .30, (R() - .5) * .70];
        let nd = [dir[0] + jitter[0], dir[1] + jitter[1], dir[2] + jitter[2]];
        if (nd[1] < .32) nd[1] = .32 + Math.abs(nd[1]) * .25;
        const l = Math.hypot(...nd) || 1;
        nd = [nd[0] / l, nd[1] / l, nd[2] / l];
        branch(end, nd, len * (.60 + R() * .18), rad * .62, depth - 1, bark);
      }
    }

    // 三根主干从低处分叉，向上收细；枝条递归分叉，末端自然变细。
    const stems = [[-.44, .20], [-.08, -.05], [.30, .12]];
    stems.forEach(([dx, dz], i) => {
      const base = [x, .12, z];
      const knee = [x + dx * .62 * scale, .82 * scale, z + dz * .45 * scale];
      beam(base, knee, .125 * scale, i === 1 ? barkLight : bark, g, .10 * scale);
      const dir = [dx * .72, .95, dz * .40], l = Math.hypot(...dir);
      branch(knee, [dir[0] / l, dir[1] / l, dir[2] / l], 1.40 * scale, .078 * scale, 4, barkLight);
    });
    return g;
  }

  function grassTuft(name, x, z, parent, height = .30) {
    const g = group(name, parent);
    for (let i = 0; i < 5; i++) {
      const a = rnd(i * 2.7 + x * 3.1 + z) * Math.PI * 2;
      const blade = box(.028, height * (.6 + rnd(i + x) * .6), .05, x + Math.cos(a) * .09, .08 + height * .3, z + Math.sin(a) * .09, i % 2 ? '#4f7f45' : '#6a9a52', g);
      blade.rotation.set(.18 * Math.cos(a), a, .18 * Math.sin(a));
    }
    return g;
  }

  return {bush, bareTree, grassTuft};
}
