// Stable, centrally concentrated volume samples. Best-candidate spacing keeps
// individual documents selectable without turning the cloud into a lattice.
// 可选 options.links / options.groups：采样点集合不变（轮廓不变），只重新分配座位，
// 让互相引用、同一分类的文档靠近，引用线变短成束，不再交织成网。
export function starCluster(ids, radius, depth = 1, options = {}) {
  if (ids.length < 2) return new Float32Array(ids.length * 3);
  const points = new Map(), placed = [];
  for (const id of [...ids].sort()) {
    let state = 2166136261;
    for (const c of id) state = Math.imul(state ^ c.charCodeAt(0), 16777619);
    const random = () => {
      state += 0x6D2B79F5;
      let t = Math.imul(state ^ state >>> 15, 1 | state);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    const r = radius * Math.pow(random(), .65);
    let best, distance = -1;
    for (let attempt = 0; attempt < 16; attempt++) {
      const z = random() * 2 - 1, angle = random() * Math.PI * 2;
      const xy = Math.sqrt(1 - z * z);
      const point = [r * xy * Math.cos(angle), r * xy * Math.sin(angle), r * z * depth];
      const nearest = placed.reduce((min, p) => Math.min(min, point.reduce((sum, v, a) => sum + (v - p[a]) ** 2, 0)), Infinity);
      if (nearest > distance) {best = point; distance = nearest;}
    }
    points.set(id, best); placed.push(best);
  }
  if (options.links?.length) arrangeSeats(ids, points, radius, options);
  return new Float32Array(ids.flatMap(id => points.get(id)));
}

// 先按分类给每组一个球面方向，组内文档优先占据该方向附近的座位；
// 再用确定性的两两交换缩短引用总长度。只交换座位，不移动或新增采样点。
function arrangeSeats(ids, points, radius, {links, groups = new Map()}) {
  const order = [...ids].sort(), index = new Map(order.map((id, i) => [id, i]));
  const seats = order.map(id => points.get(id));
  const group = order.map(id => groups.get(id) ?? '');
  const names = [...new Set(group)].sort();
  const anchors = new Map(names.map((name, i) => {
    const y = 1 - (i + .5) / names.length * 2, r = Math.sqrt(1 - y * y), angle = i * 2.399963;
    return [name, [r * Math.cos(angle), y, r * Math.sin(angle)]];
  }));
  const direction = p => { const l = Math.hypot(...p) || 1; return p.map(v => v / l); };
  // 分组轮流挑座位：每组选与自身方向最一致的空位，组大小决定挑选次数。
  const members = new Map(names.map(name => [name, order.map((_, i) => i).filter(i => group[i] === name)]));
  const free = new Set(seats.map((_, i) => i)), seat = new Array(order.length);
  const queues = names.map(name => ({name, left: [...members.get(name)], taken: 0, size: members.get(name).length}));
  while (free.size) {
    const next = queues.filter(q => q.left.length).sort((a, b) => a.taken / a.size - b.taken / b.size || a.name.localeCompare(b.name))[0];
    const anchor = anchors.get(next.name);
    let best = -1, score = -Infinity;
    for (const s of free) {
      const d = direction(seats[s]), value = d[0] * anchor[0] + d[1] * anchor[1] + d[2] * anchor[2];
      if (value > score) {score = value; best = s;}
    }
    seat[next.left.shift()] = best; free.delete(best); next.taken++;
  }
  const neighbours = order.map(() => []);
  for (const link of links) {
    const a = index.get(link.source), b = index.get(link.target);
    if (a === undefined || b === undefined || a === b) continue;
    neighbours[a].push(b); neighbours[b].push(a);
  }
  const length = (i, s, j = -1, t = -1) => neighbours[i].reduce((sum, n) => {
    const p = seats[s], q = seats[n === j ? t : seat[n]];
    return sum + Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  }, 0);
  let state = 0x9e3779b9;
  const random = () => {
    state = Math.imul(state ^ state >>> 13, 0x5bd1e995) >>> 0;
    return ((state ^ state >>> 15) >>> 0) / 4294967296;
  };
  const occupant = new Array(seats.length);
  seat.forEach((s, i) => { occupant[s] = i; });
  const linked = order.map((_, i) => i).filter(i => neighbours[i].length);
  for (let step = 0; step < order.length * 160 && linked.length; step++) {
    const i = linked[Math.floor(random() * linked.length)];
    // 在某个邻居附近抽几个座位，取最近的一个作为交换对象。
    const target = seats[seat[neighbours[i][Math.floor(random() * neighbours[i].length)]]];
    let candidate = -1, nearest = Infinity;
    for (let k = 0; k < 8; k++) {
      const s = Math.floor(random() * seats.length), q = seats[s];
      const d = (target[0] - q[0]) ** 2 + (target[1] - q[1]) ** 2 + (target[2] - q[2]) ** 2;
      if (s !== seat[i] && d < nearest) {nearest = d; candidate = s;}
    }
    const j = occupant[candidate];
    if (candidate < 0 || j === i) continue;
    const before = length(i, seat[i]) + length(j, seat[j]);
    const after = length(i, seat[j], j, seat[i]) + length(j, seat[i], i, seat[j]);
    if (after < before - radius * 1e-4) {
      [seat[i], seat[j]] = [seat[j], seat[i]];
      occupant[seat[i]] = i; occupant[seat[j]] = j;
    }
  }
  order.forEach((id, i) => points.set(id, seats[seat[i]]));
}

