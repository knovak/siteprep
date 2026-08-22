const DEG_TO_RAD = Math.PI / 180;

export function identityMatrix() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

export function multiplyMatrices(a, b) {
  const result = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      for (let index = 0; index < 4; index += 1) {
        result[row * 4 + column] += a[row * 4 + index] * b[index * 4 + column];
      }
    }
  }
  return result;
}

function translationMatrix([x, y, z]) {
  return [
    1, 0, 0, x,
    0, 1, 0, y,
    0, 0, 1, z,
    0, 0, 0, 1
  ];
}

function rotationXMatrix(degrees) {
  const radians = degrees * DEG_TO_RAD;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    1, 0, 0, 0,
    0, cosine, -sine, 0,
    0, sine, cosine, 0,
    0, 0, 0, 1
  ];
}

function rotationYMatrix(degrees) {
  const radians = degrees * DEG_TO_RAD;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    cosine, 0, sine, 0,
    0, 1, 0, 0,
    -sine, 0, cosine, 0,
    0, 0, 0, 1
  ];
}

function rotationZMatrix(degrees) {
  const radians = degrees * DEG_TO_RAD;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    cosine, -sine, 0, 0,
    sine, cosine, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

function localMatrix(node, frame) {
  const [x = 0, y = 0, z = 0] = frame.rotations_deg[node.id] || [];
  const translationDelta = frame.translations_mm?.[node.id] || [0, 0, 0];
  const translation = node.translation_mm.map((value, index) => value + (translationDelta[index] || 0));
  const rotation = multiplyMatrices(
    multiplyMatrices(rotationZMatrix(z), rotationYMatrix(y)),
    rotationXMatrix(x)
  );
  return multiplyMatrices(translationMatrix(translation), rotation);
}

export function transformPoint(matrix, [x, y, z]) {
  return [
    matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[3],
    matrix[4] * x + matrix[5] * y + matrix[6] * z + matrix[7],
    matrix[8] * x + matrix[9] * y + matrix[10] * z + matrix[11]
  ];
}

export function distanceBetween(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function globalMatrices(rig, frame) {
  const nodes = new Map(rig.nodes.map((node) => [node.id, node]));
  const matrices = new Map();

  const calculate = (id, visiting = new Set()) => {
    if (matrices.has(id)) return matrices.get(id);
    if (visiting.has(id)) throw new Error(`cycle in rig hierarchy at ${id}`);

    const node = nodes.get(id);
    if (!node) throw new Error(`unknown rig node ${id}`);

    const nextVisiting = new Set(visiting).add(id);
    const local = localMatrix(node, frame);
    const global = node.parent
      ? multiplyMatrices(calculate(node.parent, nextVisiting), local)
      : local;
    matrices.set(id, global);
    return global;
  };

  for (const node of rig.nodes) calculate(node.id);
  return matrices;
}

export function nodeWorldPoint(rig, frame, nodeId, localPoint = [0, 0, 0]) {
  const matrix = globalMatrices(rig, frame).get(nodeId);
  if (!matrix) throw new Error(`unknown rig node ${nodeId}`);
  return transformPoint(matrix, localPoint);
}

export function registrationSamples(rig) {
  const samples = [];
  for (const frame of rig.clip.frames) {
    const matrices = globalMatrices(rig, frame);
    for (const attachment of rig.attachments) {
      const matrix = matrices.get(attachment.bone_id);
      if (!matrix) throw new Error(`unknown attachment bone ${attachment.bone_id}`);
      const bonePoint = transformPoint(matrix, attachment.bone_landmark_local_mm);
      const geometryPoint = transformPoint(matrix, attachment.geometry_landmark_local_mm);
      samples.push({
        frame: frame.id,
        muscle: attachment.muscle_id,
        endpoint: attachment.endpoint,
        distance_mm: distanceBetween(bonePoint, geometryPoint),
        bone_point_mm: bonePoint,
        geometry_point_mm: geometryPoint
      });
    }
  }
  return samples;
}

export function muscleWorldPaths(rig, frame) {
  const matrices = globalMatrices(rig, frame);
  const grouped = new Map();
  for (const attachment of rig.attachments) {
    const matrix = matrices.get(attachment.bone_id);
    const point = transformPoint(matrix, attachment.geometry_landmark_local_mm);
    const points = grouped.get(attachment.muscle_id) || [];
    points.push({ endpoint: attachment.endpoint, point });
    grouped.set(attachment.muscle_id, points);
  }
  return grouped;
}
