import { globalMatrices, transformPoint } from './rig-math.mjs';

// Authored illustration geometry in reference millimetres. These surfaces follow
// the existing pose; they are not scanned anatomy or additional motion claims.
export const AXIAL_COUNTS = Object.freeze({ cervical: 7, thoracic: 12, lumbar: 5, sacral: 5, coccygeal: 4, ribPairs: 12 });
const mix = (a, b, t) => {
  const p = a.map((v, i) => v + (b[i] - v) * t);
  if (a.skin && b.skin) p.skin = [...a.skin.map((v) => ({ ...v, weight: v.weight * (1 - t) })), ...b.skin.map((v) => ({ ...v, weight: v.weight * t }))].filter((v) => v.weight > 0);
  return p;
};
const add = (a, b) => a.map((v, i) => v + b[i]);
const scale = (a, n) => a.map((v) => v * n);
const clamp = (t) => Math.max(0, Math.min(1, t));
const average = (points) => scale(points.reduce(add, [0, 0, 0]), 1 / points.length);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const subtract = (a, b) => a.map((v, i) => v - b[i]);

// The historical head control is at the head centre. Re-anchor its rotation at
// the atlanto-occipital articulation without changing the shared motion rig.
function anatomyMatrices(rig, matrices) {
  const factor = rig.reference_stature_mm / 1700;
  const pivot = [0, 1548, -15];
  const rest = globalMatrices(rig, { rotations_deg: {} });
  const local = (node) => subtract(scale(pivot, factor), transformPoint(rest.get(node), [0, 0, 0]));
  const delta = subtract(transformPoint(matrices.get('neck-base'), local('neck-base')), transformPoint(matrices.get('head'), local('head')));
  const head = [...matrices.get('head')];
  for (let i = 0; i < 3; i += 1) head[i * 4 + 3] += delta[i];
  return new Map([...matrices, ['head', head]]);
}
const spline = (points, index, t) => {
  const a = points[Math.max(0, index - 1)];
  const b = points[index];
  const c = points[index + 1];
  const d = points[Math.min(points.length - 1, index + 2)];
  return b.map((v, i) => .5 * (2 * v + (-a[i] + c[i]) * t
    + (2 * a[i] - 5 * v + 4 * c[i] - d[i]) * t * t
    + (-a[i] + 3 * v - 3 * c[i] + d[i]) * t * t * t));
};

function makeBinding(rig, matrices, capture = false) {
  matrices = anatomyMatrices(rig, matrices);
  const stature = rig.reference_stature_mm / 1700;
  const rest = globalMatrices(rig, { rotations_deg: {} });
  const at = (node, point) => {
    const origin = transformPoint(rest.get(node), [0, 0, 0]);
    const local = point.map((v, i) => v * stature - origin[i]);
    const p = transformPoint(matrices.get(node), local);
    if (capture) p.skin = [{ node, local, weight: 1 }];
    return p;
  };
  const blend = (a, b, t, p) => mix(at(a, p), at(b, p), clamp(t));
  const spine = [['pelvis', 956], ['lumbar-spine', 1087], ['thoracic-lower', 1255], ['thoracic-upper', 1417], ['neck-base', 1540]];
  const torso = (p) => {
    for (let i = 1; i < spine.length; i += 1) {
      if (p[1] <= spine[i][1]) return blend(spine[i - 1][0], spine[i][0], (p[1] - spine[i - 1][1]) / (spine[i][1] - spine[i - 1][1]), p);
    }
    return at('neck-base', p);
  };
  const clavicle = (side, p) => mix(at(`clavicle-${side}`, p), at(`scapula-${side}`, p), clamp((Math.abs(p[0]) - 18) / 121));
  return { at, blend, torso, clavicle };
}

export function createSkullGeometry(rig, matrices) {
  const { at } = makeBinding(rig, matrices);
  const bones = [];
  const face = (id, points, material = 'bone') => bones.push({ id, node: 'head', material, points: points.map((p) => at('head', p)) });
  const vertex = (latitude, longitude) => [74 * Math.cos(latitude) * Math.cos(longitude), 1640 + 91 * Math.sin(latitude), -8 + 80 * Math.cos(latitude) * Math.sin(longitude)];
  for (let row = 0; row < 10; row += 1) for (let col = 0; col < 20; col += 1) {
    const a = -Math.PI / 2 + row * Math.PI / 10;
    const b = a + Math.PI / 10;
    const c = col * Math.PI / 10;
    const d = c + Math.PI / 10;
    const occiput = row < 5 && col >= 10;
    face(`${occiput ? 'occiput' : 'cranium'}-${row}-${col}`, [vertex(a,c), vertex(a,d), vertex(b,d), vertex(b,c)], occiput ? 'bone-shade' : 'bone-light');
  }
  face('nasal-bridge', [[-10,1659,64],[10,1659,64],[12,1621,99],[-12,1621,99]]);
  face('maxilla', [[-38,1627,62],[38,1627,62],[31,1589,69],[-31,1589,69]]);
  face('mandible-front', [[-33,1587,70],[33,1587,70],[27,1562,62],[-27,1562,62]]);
  for (const s of [-1, 1]) {
    face(`mandible-ramus-${s}`, [[s*55,1620,12],[s*60,1602,7],[s*27,1562,62],[s*33,1587,70]]);
    face(`orbit-${s}`, [[s*13,1643,69],[s*47,1645,54],[s*46,1629,59],[s*15,1627,77]], 'cavity');
    face(`occipital-condyle-${s}`, [[s*8,1554,-25],[s*21,1554,-25],[s*21,1545,-8],[s*8,1545,-8]], 'bone-light');
  }
  return { bones, pivot: at('head', [0,1548,-15]), center: at('head', [0,1640,-8]) };
}

export function createAxialGeometry(rig, matrices) {
  const { torso, at, clavicle } = makeBinding(rig, matrices);
  const bones = [];
  const cartilage = [];
  const vertebrae = [];
  const ribs = [];
  const polygon = (id, points, node, material = 'bone') => bones.push({ id, points: points.map(torso), node, material });
  const tube = (id, points, node, width = 5, material = 'bone') => bones.push({ id, points: points.map(torso), node, width, material, line: true });
  const vertebra = (id, y, radius, height, z, region, node) => {
    const center = [0, y, z];
    const body = [];
    const ring = (dy, rx = radius, rz = radius * .7, dz = 0) => Array.from({ length: 12 }, (_, i) => {
      const angle = i * Math.PI / 6;
      return [Math.cos(angle) * rx, y + dy, z + dz + Math.sin(angle) * rz];
    });
    if (id === 'C1') {
      tube(id, [...ring(0, 23, 22, -8), ring(0, 23, 22, -8)[0]], node, 7);
    } else {
      const top = ring(height / 2);
      const bottom = ring(-height / 2);
      polygon(`${id}-top`, top, node, 'bone-light');
      for (let i = 0; i < 12; i += 1) {
        const j = (i + 1) % 12;
        const face = [bottom[i], bottom[j], top[j], top[i]];
        polygon(`${id}-body-${i}`, face, node, i < 6 ? 'bone' : 'bone-shade');
        body.push(face);
      }
      tube(`${id}-disc`, [...ring(-height / 2 - 2), ring(-height / 2 - 2)[0]], node, 3, 'disc');
    }
    const rear = z - radius * .7;
    if (id !== 'C1') {
    for (const s of [-1, 1]) {
      tube(`${id}-arch-${s}`, [[s * radius * .6, y, rear], [s * radius * .85, y, rear - 18], [0, y - 3, rear - 26]], node, 5);
      tube(`${id}-transverse-${s}`, [[s * radius * .8, y, rear - 10], [s * (radius + 18), y - 2, rear - 13]], node, 5);
    }
    tube(`${id}-spinous`, [[0, y - 3, rear - 26], [0, y - (region === 'thoracic' ? 15 : 5), rear - 43]], node, 5);
    } else {
      for (const s of [-1, 1]) tube(`C1-transverse-${s}`, [[s*21,y,z-8],[s*34,y,z-8]], node, 5);
    }
    if (id === 'C2') tube('C2-dens', [[0, y + height / 2, z], [0, y + height / 2 + 15, z]], node, 9);
    vertebrae.push({ id, region, center: torso(center), node, body });
  };
  for (let i = 0; i < 7; i += 1) vertebra(`C${i + 1}`, 1540 - i * 18, 15 + i * .6, 12, -15 + Math.sin(i / 6 * Math.PI) * 9, 'cervical', 'neck-base');
  for (let i = 0; i < 12; i += 1) vertebra(`T${i + 1}`, 1417 - i * 27, 19 + i * .55, 19, -32 - Math.sin(i / 11 * Math.PI) * 17, 'thoracic', i < 6 ? 'thoracic-upper' : 'thoracic-lower');
  for (let i = 0; i < 5; i += 1) vertebra(`L${i + 1}`, 1087 - i * 29, 27 + i * 1.1, 21, -25 + Math.sin(i / 4 * Math.PI) * 12, 'lumbar', 'lumbar-spine');

  // Five sacral segments form one continuous tapered sacrum. The four coccygeal
  // segments are a typical depiction, not an assertion of universal count.
  polygon('sacrum', [[-55, 956, -13], [55, 956, -13], [39, 905, -37], [12, 853, -43], [-12, 853, -43], [-39, 905, -37]], 'pelvis');
  for (let i = 0; i < 5; i += 1) {
    const y = 945 - i * 19;
    const w = 44 - i * 7;
    tube(`S${i + 1}-fused-ridge`, [[-w, y, -20 - i * 6], [0, y - 3, -20 - i * 6], [w, y, -20 - i * 6]], 'pelvis', 3, 'bone-shade');
    vertebrae.push({ id: `S${i + 1}`, region: 'sacral', fused: true, center: torso([0, y, -20 - i * 6]), node: 'pelvis' });
  }
  for (let i = 0; i < 4; i += 1) {
    const y = 846 - i * 11;
    const w = 10 - i * 1.8;
    polygon(`Co${i + 1}`, [[-w, y, -40 + i * 3], [w, y, -40 + i * 3], [w * .65, y - 9, -37 + i * 3], [-w * .65, y - 9, -37 + i * 3]], 'pelvis');
    vertebrae.push({ id: `Co${i + 1}`, region: 'coccygeal', fused: true, center: torso([0, y, -40 + i * 3]), node: 'pelvis' });
  }

  const widths = [74, 99, 119, 135, 145, 151, 152, 148, 138, 123, 99, 75];
  for (const side of [-1, 1]) {
    let previousCartilage;
    for (let i = 0; i < 12; i += 1) {
      const number = i + 1;
      const v = vertebrae.find((entry) => entry.id === `T${number}`);
      const y = 1417 - i * 27;
      const z = -32 - Math.sin(i / 11 * Math.PI) * 17;
      const floating = number > 10;
      const endAngle = floating ? (number === 11 ? 2.03 : 1.68) : Math.PI * .86;
      const points = Array.from({ length: 25 }, (_, n) => {
        const t = n / 24;
        const angle = t * endAngle;
        return [side * (Math.sin(angle) * widths[i] + 21 * (1 - t)), y - Math.sin(angle / 2) * (27 + i * 2.8), z + (1 - Math.cos(angle)) * (number < 3 ? 58 : 73)];
      });
      const id = `rib-${number}-${side < 0 ? 'left' : 'right'}`;
      tube(id, points, v.node, number < 3 ? 5 : 6);
      let connection = null;
      if (!floating) {
        const tip = points.at(-1);
        connection = number <= 7 ? [side * 12, tip[1] + (number < 3 ? 2 : 9), tip[2] + 5] : mix(previousCartilage[0], previousCartilage[1], .4);
        const route = [tip, mix(tip, connection, .5), connection];
        cartilage.push({ id: `${id}-cartilage`, points: route.map(torso), node: v.node, line: true, width: 5, material: 'cartilage' });
        previousCartilage = [tip, connection];
      }
      ribs.push({ id, number, side, vertebra: v.id, points: points.map(torso), connection: connection && torso(connection), floating });
    }
  }
  polygon('sternum-manubrium', [[-18, 1430, 86], [18, 1430, 86], [13, 1390, 91], [-13, 1390, 91]], 'thoracic-upper');
  polygon('sternum-body', [[-12, 1390, 91], [12, 1390, 91], [10, 1229, 110], [-10, 1229, 110]], 'thoracic-upper');
  polygon('sternum-xiphoid', [[-10, 1229, 110], [10, 1229, 110], [0, 1208, 109]], 'thoracic-lower');
  // Scapular blades are attached to their moving scapula nodes.
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'left' : 'right';
    const node = `scapula-${side}`;
    bones.push({ id: node, node, material: 'bone', points: [[s * 58, 1420, -72], [s * 139, 1430, -45], [s * 92, 1275, -88]].map((p) => at(node, p)) });
    bones.push({ id: `clavicle-${side}`, node: `clavicle-${side}`, material: 'bone-light', line: true, width: 9,
      points: [[s*18,1430,86],[s*48,1442,87],[s*85,1445,60],[s*116,1440,4],[s*139,1430,-45]].map((p) => clavicle(side, p)) });
  }
  const skull = createSkullGeometry(rig, matrices);
  return { bones: [...bones, ...cartilage, ...skull.bones], vertebrae, ribs, skull };
}

// A surface is a set of curved cross sections. Fibres follow its surface in 3D
// rather than being screen-space hatching; orbit and motion share the same skin.
function muscleSheet({ id, claimId = id, node, depth = 'superficial', facing = 'front', sections, bind, pennate = false, oblique = false, tendon = .1, small = false, attachmentBones, attachmentPoints }) {
  const rows = small ? 6 : 14;
  const columns = small ? 5 : 14;
  const left = sections.map((section) => section[0]);
  const right = sections.map((section) => section[1]);
  const sample = (t, u) => {
    const index = Math.min(sections.length - 2, Math.floor(t * (sections.length - 1)));
    const f = t * (sections.length - 1) - index;
    const a = spline(left, index, f);
    const b = spline(right, index, f);
    const point = mix(a, b, u);
    const bulge = Math.sin(u * Math.PI) * Math.sin(t * Math.PI) * (facing === 'back' ? -9 : 9);
    point[2] += bulge;
    return bind(point);
  };
  const strips = [];
  for (let column = 0; column < columns; column += 1) {
    const u = column / columns;
    const points = Array.from({ length: rows + 1 }, (_, row) => sample(row / rows, u));
    points.push(...Array.from({ length: rows + 1 }, (_, row) => sample(1 - row / rows, u + 1 / columns)));
    strips.push({ points, shade: Math.sin((u + .12) * Math.PI), tendon: false });
  }
  const contour = [...Array.from({ length: rows + 1 }, (_, i) => sample(i / rows, 0)), ...Array.from({ length: rows + 1 }, (_, i) => sample(1 - i / rows, 1))];
  const fibers = [];
  const fiberCount = small ? 9 : 25;
  for (let i = 1; i < fiberCount; i += 1) {
    const u = i / fiberCount;
    if (pennate) {
      for (const side of [0, 1]) fibers.push(Array.from({ length: 12 }, (_, j) => sample(clamp(u * .81 + j / 11 * .17), side + (.5 - side) * j / 11)));
    } else {
      fibers.push(Array.from({ length: 15 }, (_, j) => {
        const t = j / 14;
        return oblique ? sample(clamp(u * .77 + (1 - t) * .22), t) : sample(t, u);
      }));
    }
  }
  const tendons = [0, 1].map((end) => {
    const t = end === 0 ? tendon : 1 - tendon;
    return [...Array.from({ length: 13 }, (_, i) => sample(end, i / 12)), ...Array.from({ length: 13 }, (_, i) => sample(t, 1 - i / 12))];
  });
  const attachments = attachmentBones?.map((bone, i) => ({ bone, point: bind(attachmentPoints?.[i] || average(i === 0 ? sections[0] : sections.at(-1))) }));
  return { id, claimId, node, depth, facing, contour, strips, fibers, tendons, attachments, center: average(contour) };
}

function buildMuscleTemplate(rig, matrices) {
  const { torso, at, blend, clavicle } = makeBinding(rig, matrices, true);
  const patches = [];
  const sheet = (options) => patches.push(muscleSheet({ bind: torso, ...options }));
  const factor = rig.reference_stature_mm / 1700;
  const referenceRig = { ...rig, reference_stature_mm: 1700, nodes: rig.nodes.map((n) => ({ ...n, translation_mm: scale(n.translation_mm, 1 / factor) })) };
  const axial = createAxialGeometry(referenceRig, globalMatrices(referenceRig, { rotations_deg: {} }));
  const connecting = (a, b, from = torso, to = torso) => {
    const direction = subtract(b, a);
    return (p) => mix(from(p), to(p), clamp(dot(subtract(p, a), direction) / dot(direction, direction)));
  };
  const strap = (id, node, a, b, width, attachmentBones, from = torso, to = torso, facing = 'back') => {
    const edge = (p, w) => [add(p, [-w,0,0]), add(p, [w,0,0])];
    sheet({ id, claimId: null, node, depth: 'deep', facing, small: true, attachmentBones,
      bind: connecting(a, b, from, to), sections: [edge(a,width*.45), edge(mix(a,b,.5),width), edge(b,width*.6)] });
  };
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'left' : 'right';
    const pair = (x1, y1, z1, x2, y2, z2) => [[s * x1, y1, z1], [s * x2, y2, z2]];
    const node = `scapula-${side}`;
    const skullBind = (p) => at('head', p);
    const clavicleBind = (p) => clavicle(side, p);
    const shoulderBind = (p) => at(node, p);
    const upperArm = (p) => blend(node, `humerus-${side}`, (Math.abs(p[0]) - 105) / 215, p);
    const forearm = (p) => blend(`humerus-${side}`, `forearm-${side}`, (Math.abs(p[0]) - 320) / 235, p);
    const thigh = (p) => blend(`hip-${side}`, `femur-${side}`, (865 - p[1]) / 395, p);
    const shin = (p) => blend(`femur-${side}`, `tibia-${side}`, (470 - p[1]) / 390, p);
    const chestBind = (p) => mix(torso(p), at(node, p), clamp((Math.abs(p[0]) - 65) / 125));
    sheet({ id: `pectoralis-major-${side}`, node, bind: chestBind, tendon: .045,
      sections: [pair(7,1430,89, 8,1280,111), pair(72,1440,96, 83,1282,105), pair(136,1433,68, 140,1314,82), pair(174,1403,43, 178,1380,44)] });
    sheet({ id: `deltoid-${side}`, node, bind: upperArm, pennate: true,
      sections: [pair(110,1455,5,110,1415,57), pair(153,1470,9,153,1383,64), pair(197,1448,7,197,1383,43), pair(243,1409,8,243,1401,16)] });
    sheet({ id: `deltoid-posterior-${side}`, claimId: `deltoid-${side}`, node, bind: upperArm, facing: 'back', pennate: true,
      sections: [pair(110,1455,-6,110,1415,-50), pair(153,1470,-10,153,1383,-56), pair(197,1448,-8,197,1383,-39), pair(243,1409,-8,243,1401,-16)] });
    sheet({ id: `biceps-brachii-${side}`, node, bind: upperArm,
      sections: [pair(157,1412,25,157,1400,36), pair(207,1438,37,207,1385,40), pair(267,1440,35,267,1386,40), pair(322,1415,19,322,1406,22)] });
    sheet({ id: `triceps-brachii-${side}`, node, bind: upperArm, facing: 'back', pennate: true,
      sections: [pair(152,1435,-27,152,1400,-40), pair(214,1451,-40,214,1386,-43), pair(272,1438,-29,272,1391,-38), pair(324,1415,-18,324,1405,-23)] });
    for (let i = 0; i < 3; i += 1) {
      sheet({ id: `forearm-flexor-bundle-${i}-${side}`, claimId: null, node: `humerus-${side}`, bind: forearm, tendon: .23,
        sections: [pair(324,1430-i*15,21,324,1417-i*15,27), pair(383,1443-i*19,33,383,1424-i*19,39), pair(453,1430-i*14,24,453,1417-i*14,29), pair(548,1419-i*7,16,548,1415-i*7,20)] });
      sheet({ id: `forearm-extensor-bundle-${i}-${side}`, claimId: null, node: `humerus-${side}`, bind: forearm, facing: 'back', tendon: .23,
        sections: [pair(324,1432-i*15,-20,324,1419-i*15,-27), pair(385,1442-i*19,-33,385,1426-i*19,-39), pair(456,1433-i*14,-24,456,1421-i*14,-29), pair(548,1419-i*7,-16,548,1415-i*7,-20)] });
    }
    // Separate abdominal blocks share the rectus claim; the pale gaps are
    // tendinous intersections, with an uninterrupted midline between the sides.
    for (let i = 0; i < 4; i += 1) {
      const y = 1256 - i * 61;
      const width = 39 - i * 2;
      sheet({ id: `rectus-abdominis-${side}-${i}`, claimId: `rectus-abdominis-${side}`, node: 'lumbar-spine', tendon: .075,
        sections: [pair(5,y,100,width,y+3,94), pair(5,y-22,103,width+5,y-21,97), pair(6,y-51,97,width,y-50,90)] });
    }
    sheet({ id: `rectus-abdominis-lower-${side}`, claimId: `rectus-abdominis-${side}`, node: 'pelvis', tendon: .17,
      sections: [pair(6,1008,88,32,1008,85), pair(6,967,86,26,966,84), pair(5,917,61,14,917,60)] });
    sheet({ id: `external-oblique-${side}`, node: 'lumbar-spine', tendon: .025, oblique: true,
      sections: [pair(54,1236,91,128,1272,46), pair(47,1140,88,112,1206,58), pair(35,1033,82,98,1106,58), pair(26,945,66,100,970,40)] });
    for (const [part, endpoint, bone, endBind] of [
      ['sternal', [s*12,1430,86], 'sternum-manubrium', torso],
      ['clavicular', [s*48,1442,87], `clavicle-${side}`, clavicleBind]
    ]) {
      const origin = [s*53,1595,5];
      sheet({ id: `sternocleidomastoid-${part}-${side}`, claimId: null, node: 'neck-base', tendon: .12,
        bind: connecting(origin, endpoint, skullBind, endBind), attachmentBones: ['skull-mastoid', bone],
        sections: [[add(origin,[-5,0,0]),add(origin,[5,0,0])],pair(25,1507,42,43,1507,37),[add(endpoint,[-5,0,0]),add(endpoint,[5,0,0])]] });
    }
    strap(`splenius-capitis-${side}`, 'neck-base', [s*12,1432,-70], [s*45,1592,-51], 10, ['C7','occiput'], torso, skullBind);
    strap(`semispinalis-capitis-${side}`, 'neck-base', [s*25,1363,-78], [s*19,1598,-63], 8, ['T3','occiput'], torso, skullBind);
    strap(`rectus-capitis-posterior-major-${side}`, 'neck-base', [s*5,1517,-67], [s*27,1573,-64], 5, ['C2','occiput'], torso, skullBind);
    strap(`rectus-capitis-posterior-minor-${side}`, 'neck-base', [s*4,1540,-45], [s*12,1560,-42], 3, ['C1','occiput'], torso, skullBind);
    strap(`obliquus-capitis-superior-${side}`, 'neck-base', [s*34,1540,-23], [s*42,1578,-44], 5, ['C1','occiput'], torso, skullBind);
    strap(`obliquus-capitis-inferior-${side}`, 'neck-base', [s*5,1517,-67], [s*34,1540,-23], 4, ['C2','C1']);
    for (const [name, level, ribNumber, sample] of [['anterior',4,1,12],['middle',3,1,10],['posterior',6,2,10]]) {
      const v = axial.vertebrae.find((v) => v.id === `C${level}`);
      const rib = axial.ribs.find((r) => r.side === s && r.number === ribNumber);
      strap(`scalene-${name}-${side}`, 'neck-base', add(v.center,[s*32,0,-15]), rib.points[sample], 5, [v.id,rib.id], torso, torso, 'side');
    }
    strap(`levator-scapulae-${side}`, node, [s*32,1504,-32], [s*58,1420,-72], 8, ['C3',node], torso, shoulderBind);
    const firstRib = axial.ribs.find((r) => r.side === s && r.number === 1);
    strap(`subclavius-${side}`, `clavicle-${side}`, firstRib.points.at(-1), [s*85,1445,60], 5, [firstRib.id,`clavicle-${side}`], torso, clavicleBind, 'front');
    strap(`pectoralis-minor-${side}`, node, [s*78,1313,88], [s*120,1420,8], 13, [`rib-4-${side}`,node], torso, shoulderBind, 'front');
    for (let i = 0; i < 11; i += 1) {
      const upper = axial.ribs.find((r) => r.side === s && r.number === i+1);
      const lower = axial.ribs.find((r) => r.side === s && r.number === i+2);
      sheet({ id: `external-intercostal-${i+1}-${side}`, claimId: null, node: i < 6 ? 'thoracic-upper' : 'thoracic-lower',
        depth: 'deep', facing: 'side', small: true, oblique: true, tendon: .025,
        attachmentBones: [upper.id,lower.id], attachmentPoints: [upper.points[10],lower.points[10]], sections: [6,10,14,18].map((n) => [upper.points[n],lower.points[n]]) });
    }
    const mobile = axial.vertebrae.filter((v) => !v.fused);
    for (let i = 0; i < mobile.length-1; i += 1) {
      const a = mobile[i];
      const b = mobile[i+1];
      const transverse = (v) => add(v.center,[s*(v.region === 'cervical' ? 33 : 43),-2,-22]);
      strap(`intertransversarii-${a.id}-${b.id}-${side}`, a.node, transverse(a), transverse(b), 3, [a.id,b.id]);
    }
    for (let i = 0; i < 6; i += 1) {
      const y = 1334 - i * 24;
      sheet({ id: `serratus-anterior-${side}-${i}`, claimId: `serratus-anterior-${side}`, depth: 'deep', node: 'thoracic-lower', tendon: .04,
        sections: [pair(96,y,70,112,y+10,65), pair(135,y-12,38,146,y,31), pair(118,y-35,-35,126,y-26,-43)] });
    }
    sheet({ id: `trapezius-superior-${side}`, node, facing: 'back', tendon: .07, bind: connecting([s*12,1576,-28],[s*138,1427,-41],skullBind,clavicleBind),
      sections: [pair(4,1578,-27,20,1574,-30), pair(4,1487,-40,52,1480,-42), pair(5,1408,-81,138,1427,-41)] });
    sheet({ id: `trapezius-middle-${side}`, node, facing: 'back', tendon: .06, bind: chestBind,
      sections: [pair(6,1410,-87,6,1341,-98), pair(67,1414,-91,67,1356,-91), pair(131,1427,-47,138,1401,-48)] });
    sheet({ id: `trapezius-inferior-${side}`, node, facing: 'back', tendon: .08, bind: chestBind,
      sections: [pair(5,1169,-77,14,1173,-80), pair(5,1280,-97,55,1287,-92), pair(6,1340,-98,107,1393,-67)] });
    sheet({ id: `latissimus-dorsi-${side}`, node: 'thoracic-lower', facing: 'back', tendon: .1, bind: chestBind,
      sections: [pair(13,980,-61,102,989,-52), pair(19,1127,-87,128,1125,-60), pair(42,1269,-100,150,1295,-49), pair(175,1390,-25,188,1394,-22)] });
    sheet({ id: `erector-spinae-${side}`, node: 'lumbar-spine', facing: 'back', tendon: .13,
      sections: [pair(10,927,-59,24,927,-58), pair(13,1090,-70,37,1090,-72), pair(14,1270,-97,38,1270,-95), pair(13,1435,-58,24,1435,-56)] });
    sheet({ id: `multifidus-${side}`, node: 'lumbar-spine', depth: 'deep', facing: 'back', pennate: true,
      sections: [pair(5,940,-44,18,940,-45), pair(7,1080,-54,30,1080,-58), pair(9,1220,-81,31,1220,-86), pair(8,1380,-62,22,1380,-66)] });
    sheet({ id: `rhomboids-${side}`, node, depth: 'deep', facing: 'back', tendon: .05, bind: chestBind,
      sections: [pair(8,1410,-71,8,1314,-87), pair(49,1387,-73,48,1292,-87), pair(86,1360,-65,86,1279,-70)] });
    sheet({ id: `gluteus-maximus-${side}`, node: 'pelvis', facing: 'back', bind: (p) => blend('pelvis', `hip-${side}`, .35, p), tendon: .04,
      sections: [pair(12,961,-64,86,975,-51), pair(8,902,-113,138,920,-76), pair(25,839,-104,134,850,-65), pair(64,806,-66,111,817,-43)] });
    sheet({ id: `gluteus-medius-${side}`, node: 'pelvis', depth: 'deep', facing: 'back', tendon: .1, bind: (p) => at('pelvis', p),
      sections: [pair(38,980,-40,123,973,-35), pair(75,929,-58,140,927,-42), pair(102,866,-29,115,866,-28)] });
    sheet({ id: `iliopsoas-${side}`, node: 'pelvis', depth: 'deep', tendon: .12,
      sections: [pair(18,1122,3,32,1122,9), pair(26,1020,21,61,1020,29), pair(41,937,24,103,950,27), pair(95,838,13,108,838,15)] });
    const thighShapes = [
      [pair(70,857,48,99,857,48),pair(62,747,66,113,747,64),pair(70,595,55,106,595,53),pair(82,480,29,96,480,29)],
      [pair(103,848,28,129,848,19),pair(118,728,48,163,740,23),pair(108,571,43,146,575,27),pair(97,481,26,108,493,21)],
      [pair(47,766,27,66,784,48),pair(32,657,33,62,657,54),pair(41,538,38,79,535,53),pair(69,482,22,82,481,31)]
    ];
    sheet({ id: `adductor-group-${side}`, claimId: null, node: `hip-${side}`, bind: thigh, tendon: .09,
      sections: [pair(20,917,34,48,929,37), pair(25,837,45,85,849,55), pair(39,729,42,77,745,49), pair(58,568,27,71,581,31)] });
    thighShapes.forEach((sections, i) => sheet({ id: `quadriceps-bundle-${i}-${side}`, claimId: `quadriceps-${side}`, node: `hip-${side}`, bind: thigh, pennate: true, sections, tendon: .12 }));
    for (let i = 0; i < 2; i += 1) sheet({ id: `hamstrings-bundle-${i}-${side}`, claimId: `hamstrings-${side}`, node: `hip-${side}`, bind: thigh, facing: 'back', tendon: .17,
      sections: [pair(65+i*27,840,-42,77+i*27,840,-45),pair(46+i*48,711,-55,85+i*44,711,-64),pair(53+i*44,550,-43,79+i*44,550,-49),pair(58+i*51,467,-20,66+i*51,467,-23)] });
    for (let i = 0; i < 2; i += 1) sheet({ id: `gastrocnemius-head-${i}-${side}`, claimId: `gastrocnemius-${side}`, node: `femur-${side}`, bind: shin, facing: 'back', tendon: .22,
      sections: [pair(62+i*30,451,-21,80+i*28,451,-23),pair(45+i*47,361,-46,86+i*40,360,-49),pair(62+i*25,260,-34,91+i*22,258,-35),pair(84,105,-26,96,105,-26)] });
    sheet({ id: `tibialis-anterior-${side}`, claimId: null, node: `femur-${side}`, bind: shin, pennate: true, tendon: .24,
      sections: [pair(97,452,20,119,452,17),pair(97,361,43,138,367,25),pair(92,211,31,115,224,23),pair(82,84,22,93,84,22)] });
  }
  return patches;
}

let muscleTemplate;
let muscleTemplateKey;
export function createMuscleGeometry(rig, matrices) {
  const key = `${rig.reference_stature_mm}:${JSON.stringify(rig.nodes)}`;
  if (key !== muscleTemplateKey) {
    muscleTemplate = buildMuscleTemplate(rig, globalMatrices(rig, { rotations_deg: {} }));
    muscleTemplateKey = key;
  }
  matrices = anatomyMatrices(rig, matrices);
  const deform = (point) => {
    const result = [0, 0, 0];
    for (const { node, local: [x, y, z], weight } of point.skin) {
      const m = matrices.get(node);
      result[0] += (m[0] * x + m[1] * y + m[2] * z + m[3]) * weight;
      result[1] += (m[4] * x + m[5] * y + m[6] * z + m[7]) * weight;
      result[2] += (m[8] * x + m[9] * y + m[10] * z + m[11]) * weight;
    }
    return result;
  };
  return muscleTemplate.map((patch) => {
    const contour = patch.contour.map(deform);
    return { ...patch, contour, center: average(contour),
      attachments: patch.attachments?.map((a) => ({ ...a, point: deform(a.point) })),
      strips: patch.strips.map((strip) => ({ ...strip, points: strip.points.map(deform) })),
      fibers: patch.fibers.map((fiber) => fiber.map(deform)),
      tendons: patch.tendons.map((tendon) => tendon.map(deform)) };
  });
}
