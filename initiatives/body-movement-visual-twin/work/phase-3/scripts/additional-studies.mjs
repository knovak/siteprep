// Original display keyframes. Sources identify themes/postures, not these angles.
export const armsDown = { 'scapula-left': [0, 0, 90], 'scapula-right': [0, 0, -90] };
export const seated = { ...armsDown, 'hip-left': [-90, 0, 0], 'hip-right': [-90, 0, 0], 'femur-left': [90, 0, 0], 'femur-right': [90, 0, 0] };
const staff = { ...armsDown, 'hip-left': [-90, 0, 0], 'hip-right': [-90, 0, 0] };
const supine = { ...armsDown, root: [-90, 0, 0] };
const bentSupine = { ...supine, 'hip-left': [-55, 0, 0], 'hip-right': [-55, 0, 0], 'femur-left': [110, 0, 0], 'femur-right': [110, 0, 0] };
const overhead = { 'scapula-left': [0, 0, -80], 'scapula-right': [0, 0, 80] };
const staffPosition = { root: [0, -750, 0] };
const supinePosition = { root: [0, 120, 900] };
const study = (tradition, id, title, summary, base, poses, actions, details = {}) => ({ tradition, id, title, summary, base, poses, actions, ...details });
const f = (...args) => study('feldenkrais', ...args);
const y = (...args) => study('yoga', ...args);

// Specify arm directions in torso space, then express each segment in its
// parent's frame. This keeps folded arms in front of or behind the chest as
// intended instead of guessing elbow Euler angles in the standing T-pose.
function arm(side, ...directions) {
  let basis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const result = {};
  for (const [index, direction] of directions.entries()) {
    const sign = side === 'left' ? -1 : 1;
    const local = [0, 1, 2].map((column) => direction.reduce((sum, value, row) => sum + value * basis[row][column], 0) * sign);
    const yaw = Math.atan2(-local[2], Math.hypot(local[0], local[1]));
    const roll = Math.atan2(local[1], local[0]);
    result[`${['scapula', 'humerus', 'forearm'][index]}-${side}`] = [0, yaw * 180 / Math.PI, roll * 180 / Math.PI];
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cz = Math.cos(roll), sz = Math.sin(roll);
    const rotation = [[cz * cy, -sz, cz * sy], [sz * cy, cz, sz * sy], [-sy, 0, cy]];
    basis = basis.map((row) => [0, 1, 2].map((column) => row.reduce((sum, value, k) => sum + value * rotation[k][column], 0)));
  }
  return result;
}
const eagleArms = { ...arm('left', [.3, -.8, 1], [.15, 1, .1], [0, 1, 0]), ...arm('right', [-.5, -.8, 1.2], [-.1, 1, -.1], [0, 1, 0]) };
const cowFaceArms = { ...arm('left', [-.2, 1, 0], [.1, -1, -.45], [0, -1, 0]), ...arm('right', [.2, -1, 0], [-.1, 1, -.45], [0, 1, 0]) };
const prayerArms = { ...arm('left', [-.5, -1, .4], [.8, 1, .4], [.3, 1, 0]), ...arm('right', [.5, -1, .4], [-.8, 1, .4], [-.3, 1, 0]) };

export const additionalStudies = [
  f('ankle-flexion-study', 'Ankle flexion and extension study',
    'One ankle alternates between lifting the forefoot and pointing it, with the shin held steady.', seated,
    [{ 'tibia-left': [-18, 0, 0] }, { 'tibia-left': [22, 0, 0] }],
    [['tibia-left', 'dorsiflexion'], ['tibia-left', 'plantar flexion']],
    { family: 'handsFeet', focus: 'Observe the angle between the shin and the foot rather than copying its range.' }),
  f('ankle-circle-study', 'Ankle circle study',
    'The left foot follows a small loop combining forefoot lift, tilt, and return.', seated,
    [{ 'tibia-left': [-14, 0, -9] }, { 'tibia-left': [14, 0, 9] }],
    [['tibia-left', 'combined dorsiflexion and inversion'], ['tibia-left', 'combined plantar flexion and eversion']],
    { family: 'handsFeet', middle: { 'tibia-left': [0, 0, -12] }, focus: 'Compare the changing foot plane with the still lower leg.' }),
  f('foot-edge-tilt-study', 'Inner and outer foot-edge study',
    'A small ankle tilt turns the sole inward and outward while the knee keeps its direction.', seated,
    [{ 'tibia-left': [0, 0, -15] }, { 'tibia-left': [0, 0, 15] }],
    [['tibia-left', 'inversion'], ['tibia-left', 'eversion']],
    { family: 'handsFeet', focus: 'Observe the ankle and forefoot relationship from the front view.' }),
  f('wrist-flexion-study', 'Wrist flexion and extension study',
    'With the elbow bent, one hand changes its angle relative to the forearm.',
    { ...seated, 'humerus-left': [0, 85, 0] },
    [{ 'forearm-left': [0, 0, -25] }, { 'forearm-left': [0, 0, 25] }],
    [['forearm-left', 'wrist flexion'], ['forearm-left', 'wrist extension']],
    { family: 'handsFeet', focus: 'The wrist pivot is the end of the forearm; the hand moves beyond it.' }),
  f('wrist-clock-study', 'Wrist clock study',
    'A supported-arm reference combines two small wrist angles into a hand loop.',
    { ...seated, 'humerus-left': [0, 85, 0] },
    [{ 'forearm-left': [0, -12, -18] }, { 'forearm-left': [0, 12, 18] }],
    [['forearm-left', 'flexion with deviation'], ['forearm-left', 'extension with opposite deviation']],
    { family: 'handsFeet', middle: { 'forearm-left': [0, -16, 0] }, focus: 'Follow the hand tip around the wrist without moving the elbow.' }),
  f('elbow-fold-study', 'Elbow folding study',
    'The left forearm folds toward the upper arm and opens again while the shoulder stays quiet.', seated,
    [{ 'humerus-left': [0, 100, 0] }, { 'humerus-left': [0, 30, 0] }],
    [['humerus-left', 'elbow flexion'], ['humerus-left', 'elbow extension']],
    { family: 'handsFeet', focus: 'Compare elbow motion with the stationary shoulder and ribs.' }),
  f('shoulder-glide-study', 'Two-shoulder glide study',
    'Both shoulder blades travel forward and back with a small collarbone response.', seated,
    [{ 'scapula-left': [0, 6, 90], 'scapula-right': [0, -6, -90] }, { 'scapula-left': [0, -5, 90], 'scapula-right': [0, 5, -90] }],
    [['scapula-left', 'bilateral protraction'], ['scapula-right', 'bilateral retraction']],
    { family: 'sample', translations: [{ 'scapula-left': [0, 0, 20], 'scapula-right': [0, 0, 20] }, { 'scapula-left': [0, 0, -15], 'scapula-right': [0, 0, -15] }], focus: 'Track both shoulder blades against the ribs in the back view.' }),
  f('forward-arm-reach-study', 'Forward reach and chest-response study',
    'One arm reaches forward, then the upper chest contributes a small following turn.', seated,
    [{ 'scapula-left': [0, 75, 90], 'humerus-left': [0, 10, 0] }, { 'scapula-left': [0, 85, 90], 'thoracic-upper': [0, -8, 0] }],
    [['scapula-left', 'shoulder flexion'], ['thoracic-upper', 'following axial rotation']],
    { family: 'handsFeet', focus: 'Compare reaching from the arm with the added movement of the chest.' }),
  f('head-nod-study', 'Small head-nod study',
    'The skull nods and returns around its articulation with the upper neck.', seated,
    [{ head: [10, 0, 0] }, { head: [-7, 0, 0] }],
    [['head', 'small nod'], ['head', 'returning extension']],
    { family: 'sitting', focus: 'Watch the base of the skull while the chest and pelvis remain quiet.' }),
  f('head-sidebend-study', 'Head side-bending study',
    'The head and upper neck incline toward each shoulder in a small alternating arc.', seated,
    [{ head: [0, 0, 6], 'neck-base': [0, 0, 5] }, { head: [0, 0, -6], 'neck-base': [0, 0, -5] }],
    [['neck-base', 'left lateral flexion'], ['neck-base', 'right lateral flexion']],
    { family: 'sitting', focus: 'Compare the two neck sides without raising either shoulder.' }),
  f('spinal-round-arch-study', 'Spinal rounding and arching study',
    'The seated spine rounds and lengthens through the lumbar, thoracic, and neck regions.', seated,
    [{ 'lumbar-spine': [8, 0, 0], 'thoracic-lower': [9, 0, 0], 'thoracic-upper': [6, 0, 0], head: [5, 0, 0] }, { 'lumbar-spine': [-5, 0, 0], 'thoracic-lower': [-6, 0, 0], 'thoracic-upper': [-4, 0, 0], head: [-3, 0, 0] }],
    [['lumbar-spine', 'flexion with thoracic rounding'], ['thoracic-lower', 'extension with lumbar response']],
    { family: 'sitting', focus: 'Follow the changing curves from the pelvis toward the head.' }),
  f('supine-knee-tilt-study', 'Back-lying knee-tilt study',
    'With both knees bent, the thighs incline together toward one side and then the other.', bentSupine,
    [{ 'hip-left': [-55, 0, -12], 'hip-right': [-55, 0, -12] }, { 'hip-left': [-55, 0, 12], 'hip-right': [-55, 0, 12] }],
    [['hip-left', 'paired lateral knee tilt'], ['hip-right', 'opposite lateral knee tilt']],
    { family: 'sample', position: supinePosition, focus: 'Watch how the thigh directions change relative to the pelvis.' }),
  f('heel-slide-study', 'Back-lying heel-slide study',
    'One bent leg lengthens toward a straight position, then folds back toward its starting shape.', bentSupine,
    [{ 'hip-left': [-25, 0, 0], 'femur-left': [50, 0, 0] }, { 'hip-left': [-8, 0, 0], 'femur-left': [16, 0, 0] }],
    [['hip-left', 'extension with knee opening'], ['femur-left', 'further knee extension']],
    { family: 'sample', position: supinePosition, focus: 'Compare the lengthening leg with the other leg and the pelvis.' }),
  f('diagonal-lengthening-study', 'Back-lying diagonal-lengthening study',
    'A long leg and the opposite arm move away from the torso, then soften toward the starting position.', supine,
    [{ 'scapula-left': [0, 0, -65], 'hip-right': [0, 0, 10] }, { 'scapula-left': [0, 0, -80], 'hip-right': [0, 0, 14], 'thoracic-upper': [0, 0, -4] }],
    [['scapula-left', 'arm elevation opposite the right leg'], ['thoracic-upper', 'small lateral response']],
    { family: 'sample', position: supinePosition, focus: 'Follow the diagonal connection from hand through trunk to the opposite foot.' }),
  f('seated-knee-extension-study', 'Knee opening and foot-direction study',
    'One shin swings forward as the knee opens; the ankle adjusts to keep the toes facing forward.', seated,
    [{ 'femur-left': [55, 0, 0], 'tibia-left': [35, 0, 0] }, { 'femur-left': [25, 0, 0], 'tibia-left': [65, 0, 0] }],
    [['femur-left', 'knee extension'], ['tibia-left', 'ankle compensation during further knee extension']],
    { family: 'knees', focus: 'Compare the shin arc with the foot direction in the side view.' }),

  y('tree-pose-study', 'Vrksasana · Tree anatomy',
    'One leg bends and opens outward while the other remains long beneath the upright trunk.', armsDown,
    [{ 'hip-left': [-30, -55, -12], 'femur-left': [100, 0, 0] }, { 'hip-left': [-40, -65, -12], 'femur-left': [120, 0, 0], ...overhead }],
    [['hip-left', 'flexion and external rotation'], ['femur-left', 'knee flexion with arm elevation']],
    { posture: 'An upright tree reference with one bent, outward-facing knee and the opposite leg extended.', props: ['wall'], modification: 'A wall and a lower raised-foot position offer a supported reference.' }),
  y('warrior-one-study', 'Virabhadrasana I · Warrior I anatomy',
    'A split stance combines front-leg flexion, back-leg extension, and an overhead arm line.', armsDown,
    [{ 'hip-left': [-42, 0, 0], 'femur-left': [52, 0, 0], 'tibia-left': [-10, 0, 0], 'hip-right': [22, 0, 0], 'tibia-right': [-22, 0, 0] }, { 'hip-left': [-48, 0, 0], 'femur-left': [65, 0, 0], 'tibia-left': [-17, 0, 0], 'hip-right': [25, 0, 0], 'tibia-right': [-25, 0, 0], ...overhead }],
    [['hip-left', 'front hip and knee flexion'], ['scapula-left', 'bilateral arm elevation']],
    { posture: 'The front knee bends, the back leg extends, and the trunk faces the front of the split stance.', props: ['wall', 'chair'], modification: 'A shorter stance and chair support reduce the illustrated range.' }),
  y('extended-side-angle-study', 'Utthita Parsvakonasana · Side-angle anatomy',
    'A wide stance and one bent knee support an inclined trunk with the upper arm extending overhead.', armsDown,
    [{ 'hip-left': [-40, -90, 0], 'hip-right': [0, 0, 28], 'femur-left': [65, 0, 0], 'tibia-left': [-25, 0, 0], 'scapula-left': [0, 0, 0], 'scapula-right': [0, 0, 0] }, { 'hip-left': [-45, -90, 0], 'hip-right': [0, 0, 28], 'femur-left': [70, 0, 0], 'tibia-left': [-25, 0, 0], 'lumbar-spine': [0, 0, 18], 'thoracic-lower': [0, 0, 12], 'scapula-left': [0, 0, 45], 'scapula-right': [0, 0, 70] }],
    [['hip-left', 'wide stance with one flexed knee'], ['thoracic-lower', 'lateral inclination with overhead reach']],
    { posture: 'The trunk inclines toward the bent-knee side and the opposite arm extends beyond the head.', props: ['block', 'chair'], modification: 'Support under the lower hand permits a higher trunk angle.' }),
  y('wide-standing-fold-study', 'Prasarita Padottanasana · Wide fold anatomy',
    'Both hips hinge with the legs spread apart and the arms descending toward the floor.', armsDown,
    [{ 'hip-left': [0, 0, -22], 'hip-right': [0, 0, 22] }, { pelvis: [60, 0, 0], 'hip-left': [-60, 0, -22], 'hip-right': [-60, 0, 22], 'lumbar-spine': [15, 0, 0] }],
    [['hip-left', 'bilateral abduction'], ['pelvis', 'forward hinge between the spread legs']],
    { posture: 'A wide-foot standing fold with a long-leg reference and relaxed arms.', props: ['chair', 'blocks'], modification: 'A chair supports a shallower fold with a higher trunk position.' }),
  y('pyramid-pose-study', 'Parsvottanasana · Pyramid anatomy',
    'The trunk inclines over the front leg in a short split stance with both knees long.', armsDown,
    [{ 'hip-left': [-18, 0, 0], 'hip-right': [18, 0, 0], 'tibia-left': [18, 0, 0], 'tibia-right': [-18, 0, 0] }, { pelvis: [55, 0, 0], 'hip-left': [-73, 0, 0], 'hip-right': [-37, 0, 0], 'tibia-left': [18, 0, 0], 'tibia-right': [-18, 0, 0], 'lumbar-spine': [8, 0, 0] }],
    [['hip-left', 'split stance with long knees'], ['pelvis', 'forward hinge over the front leg']],
    { posture: 'A short split-stance fold with the arms hanging rather than bound behind the back.', props: ['blocks', 'chair'], modification: 'Hands on a chair allow a smaller forward hinge.' }),
  y('half-moon-study', 'Ardha Chandrasana · Half-moon anatomy',
    'The pelvis turns sideways as one leg stays beneath it and the other extends outward.', armsDown,
    [{ pelvis: [0, 0, 40], 'hip-left': [0, 0, -40], 'hip-right': [0, 0, 30], 'scapula-left': [0, 0, 0], 'scapula-right': [0, 0, 0] }, { pelvis: [0, 0, 75], 'hip-left': [0, 0, -75], 'hip-right': [0, 0, 15], 'scapula-left': [0, 0, 15], 'scapula-right': [0, 0, 15] }],
    [['pelvis', 'lateral inclination over the support leg'], ['hip-right', 'extension of the raised leg line']],
    { posture: 'A supported half-moon reference with a long standing leg, lateral torso, and one raised leg.', props: ['wall', 'block'], modification: 'A wall and high block provide the support context; balance is not simulated.' }),
  y('eagle-arms-study', 'Garudasana · Eagle arms anatomy',
    'Bent arms move forward and across the chest to show the shoulder and elbow arrangement.', armsDown,
    [prayerArms, eagleArms],
    [['scapula-left', 'bilateral shoulder flexion and cross-body approach'], ['humerus-left', 'bilateral elbow flexion']],
    { posture: 'An arms-only eagle study; individual finger wrapping is outside the reference rig.', props: ['strap'], modification: 'Separate hands or a strap keep the shoulder relationship visible without a hand bind.' }),
  y('cow-face-arms-study', 'Gomukhasana · Cow-face arms anatomy',
    'One elbow points upward while the opposite arm turns behind the trunk.', armsDown,
    [{ 'scapula-left': [0, 0, -75], 'scapula-right': [0, 0, -95] }, cowFaceArms],
    [['scapula-left', 'overhead shoulder position'], ['humerus-right', 'opposite elbow folding behind the trunk']],
    { posture: 'An arms-only cow-face reference with an upper and lower elbow approach behind the back.', props: ['strap'], modification: 'A strap spans the hands; the model does not require a clasp.' }),
  y('prayer-position-study', 'Namaskarasana · Prayer-position anatomy',
    'Both elbows bend as the forearms approach the front of the chest.', armsDown,
    [{ ...arm('left', [-.5, -1, .4], [.5, 1, .4], [0, 1, 0]), ...arm('right', [.5, -1, .4], [-.5, 1, .4], [0, 1, 0]) }, prayerArms],
    [['humerus-left', 'bilateral elbow flexion'], ['scapula-right', 'forearm approach toward the chest']],
    { posture: 'An upright prayer-position study emphasizing arms and shoulders; palm contact is approximate.', props: ['optional chair'], modification: 'Keeping the hands apart preserves the arm arrangement with less wrist demand.' }),
  y('upward-prayer-study', 'Urdhva Namaskarasana · Upward-prayer anatomy',
    'Both arms elevate and approach one another above the head.', armsDown,
    [{ 'scapula-left': [0, 0, -40], 'scapula-right': [0, 0, 40] }, { 'scapula-left': [0, 0, -100], 'scapula-right': [0, 0, 100], 'clavicle-left': [0, 0, -10], 'clavicle-right': [0, 0, 10] }],
    [['scapula-left', 'bilateral arm elevation'], ['scapula-right', 'overhead arm approach']],
    { posture: 'An overhead prayer study with an upright trunk and long elbows.', props: ['wall'], modification: 'Wider arms or a lower elevation provide an alternative reference.' }),
  y('chair-twist-study', 'Bharadvajasana · Chair-twist anatomy',
    'The chest and head turn relative to the pelvis while the seated legs stay forward.', seated,
    [{ 'lumbar-spine': [0, 5, 0], 'thoracic-lower': [0, 12, 0] }, { 'lumbar-spine': [0, 7, 0], 'thoracic-lower': [0, 15, 0], 'thoracic-upper': [0, 12, 0], 'neck-base': [0, 8, 0], 'humerus-left': [0, 65, 0] }],
    [['thoracic-lower', 'axial rotation above a quiet pelvis'], ['neck-base', 'following turn with arm support context']],
    { posture: 'A chair-seated twist with the pelvis facing forward and rotation distributed above it.', props: ['chair'], modification: 'A smaller trunk turn and supported hands reduce the displayed range.' }),
  y('staff-pose-study', 'Dandasana · Staff anatomy',
    'A long sitting reference moves from slightly bent knees toward two extended legs.', staff,
    [{ 'femur-left': [18, 0, 0], 'femur-right': [18, 0, 0] }, { 'femur-left': [0, 0, 0], 'femur-right': [0, 0, 0], 'thoracic-lower': [-3, 0, 0] }],
    [['femur-left', 'small bilateral knee flexion'], ['femur-right', 'bilateral knee extension']],
    { position: staffPosition, posture: 'Long sitting with the legs in front, the trunk upright, and the toes directed upward.', props: ['blanket'], modification: 'A folded blanket under the pelvis supports a higher sitting reference.' }),
  y('seated-forward-fold-study', 'Paschimottanasana · Seated fold anatomy',
    'From long sitting, the pelvis and spine incline toward the extended legs.', staff,
    [{ pelvis: [20, 0, 0], 'hip-left': [-110, 0, 0], 'hip-right': [-110, 0, 0], 'scapula-left': [0, 65, 90], 'scapula-right': [0, -65, -90] }, { pelvis: [35, 0, 0], 'hip-left': [-125, 0, 0], 'hip-right': [-125, 0, 0], 'lumbar-spine': [10, 0, 0], 'thoracic-lower': [8, 0, 0], 'scapula-left': [0, 45, 90], 'scapula-right': [0, -45, -90] }],
    [['pelvis', 'forward hinge from long sitting'], ['lumbar-spine', 'flexion with thoracic response']],
    { position: staffPosition, posture: 'A long sitting forward fold with both legs extended and arms reaching along them.', props: ['blanket', 'strap'], modification: 'A raised seat and smaller forward incline retain the same landmarks.' }),
  y('wide-seated-angle-study', 'Upavistha Konasana · Seated wide-angle anatomy',
    'Both legs open from long sitting and the torso makes a small forward incline between them.', staff,
    [{ 'hip-left': [-90, -28, 0], 'hip-right': [-90, 28, 0] }, { pelvis: [20, 0, 0], 'hip-left': [-110, -32, 0], 'hip-right': [-110, 32, 0], 'lumbar-spine': [6, 0, 0] }],
    [['hip-left', 'bilateral hip abduction in long sitting'], ['pelvis', 'small forward incline']],
    { position: staffPosition, posture: 'A wide-leg sitting reference with long knees and an optional small forward hinge.', props: ['blanket'], modification: 'A narrower leg angle and raised seat give a reduced-range reference.' }),
  y('legs-up-wall-study', 'Viparita Karani · Legs-up-wall anatomy',
    'A back-lying reference raises both legs while the head and trunk remain horizontal.', supine,
    [{ 'hip-left': [-45, 0, 0], 'hip-right': [-45, 0, 0] }, { 'hip-left': [-90, 0, 0], 'hip-right': [-90, 0, 0] }],
    [['hip-left', 'bilateral hip flexion'], ['hip-right', 'legs approaching vertical']],
    { position: supinePosition, posture: 'A supine legs-up-wall arrangement; wall and bolster support are described but not rendered.', props: ['wall', 'bolster'], modification: 'Bent knees and lower leg elevation form a smaller-range alternative.' })
];
