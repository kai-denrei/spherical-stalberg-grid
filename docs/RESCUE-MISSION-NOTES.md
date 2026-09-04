# Rescue mission — notes

Two things live here: what the astronaut asset can and cannot do, and the
open questions the mode's first play should answer. The mode's design is in
`docs/superpowers/specs/2026-09-05-rescue-mission.md`; the rules are
`src/rescue.js`.

## 1. The astronaut rig — can a Mixamo clip be retargeted onto it?

**Yes, by renaming tracks. No re-binding, no bone surgery.** Measured
2026-09-05 by reading `assets/models/astronaut.glb`'s JSON chunk directly.

What is in the file:

```
nodes 34 · skins 1 · animations 1
clip "Armature|Armature|walking_man|baselayer", 68 channels, 24 bones animated
skin joints 25
source FBX name: T_Pose_Astronaut_biped_Animation_Walking_withSkin.fbx
```

The hierarchy:

```
_rootJoint
  Hips_00
    LeftUpLeg_01 → LeftLeg_02 → LeftFoot_03 → LeftToeBase_04
    RightUpLeg_05 → RightLeg_06 → RightFoot_07 → RightToeBase_08
    Spine02_09 → Spine01_010 → Spine_011
      LeftShoulder_012 → LeftArm_013 → LeftForeArm_014 → LeftHand_015
      RightShoulder_016 → RightArm_017 → RightForeArm_018 → RightHand_019
      neck_020 → Head_021 → head_end_022, headfront_023
```

That is **a Mixamo skeleton with a rename applied**. Same bones, same
parenting, same T-pose rest — the `T_Pose_…` in the source filename is
Mixamo's own rest pose, which is the part that decides whether a clip can be
dropped on at all. So retargeting is a *string map over the animation
tracks*, not a retarget in the hard sense.

**The map.** Every name is `mixamorig:X` → `X_NN` with the index suffix
added — with **one trap**:

> The spine triple is REVERSED. The bone closest to the hips is called
> `Spine02`, and the one carrying the shoulders is called `Spine`. Mixamo
> names them the other way round. Map them by POSITION, not by name.

```js
const MIXAMO_TO_ASTRO = {
  Hips: 'Hips_00',
  LeftUpLeg: 'LeftUpLeg_01', LeftLeg: 'LeftLeg_02',
  LeftFoot: 'LeftFoot_03', LeftToeBase: 'LeftToeBase_04',
  RightUpLeg: 'RightUpLeg_05', RightLeg: 'RightLeg_06',
  RightFoot: 'RightFoot_07', RightToeBase: 'RightToeBase_08',
  Spine: 'Spine02_09',        // ← inverted, on purpose
  Spine1: 'Spine01_010',      // ←
  Spine2: 'Spine_011',        // ←
  LeftShoulder: 'LeftShoulder_012', LeftArm: 'LeftArm_013',
  LeftForeArm: 'LeftForeArm_014', LeftHand: 'LeftHand_015',
  RightShoulder: 'RightShoulder_016', RightArm: 'RightArm_017',
  RightForeArm: 'RightForeArm_018', RightHand: 'RightHand_019',
  Neck: 'neck_020',           // lowercase in this file
  Head: 'Head_021', HeadTop_End: 'head_end_022',
};

// three.js: a clip's tracks are named "<node>.<property>"
function retarget(clip) {
  const out = [];
  for (const tr of clip.tracks) {
    const [node, prop] = [tr.name.slice(0, tr.name.indexOf('.')),
      tr.name.slice(tr.name.indexOf('.'))];
    const to = MIXAMO_TO_ASTRO[node.replace(/^mixamorig:?/, '')];
    if (!to) continue;              // fingers, twist bones: dropped, at rest
    const c = tr.clone(); c.name = to + prop; out.push(c);
  }
  return new THREE.AnimationClip(clip.name, clip.duration, out);
}
```

Two more measured facts:

- **No fingers, no face.** 25 joints total; Mixamo's hand chains have no
  counterpart here and their tracks drop harmlessly. A clip that *reads*
  through the hands (a beckon with an open palm) will read worse than one
  that reads through the arm.
- **`headfront_023` is not a Mixamo bone.** Nothing maps to it; leave it at
  rest. It is a helper, and per the standing rule a helper is dropped at the
  merge, never merely hidden — worth doing if this rig is ever cast into a
  game piece.

**What is still unknown.** Whether a *downloaded* Mixamo clip scales
correctly against this file's units. The GLB's own skin is authored in
centimetres (the astro tab normalises a 170-unit height down to
`PERSON_M`), and Mixamo exports in metres by default. Rotation tracks — the
only tracks that matter for a rig this size — are unit-free, so the risk is
confined to the Hips POSITION track: expect to scale it by the same factor
the tab already computes, or strip it and drive the root yourself. Not
tested; nothing has been downloaded.

**What the mission actually needs, and what it does not.** The board does
NOT need this. Six skinned meshes with 25 bones each, at a scale where a
person is a third of a cell wide, is 3.7 MB and a phone-tier disaster for
something that occupies twenty pixels — so the stranded are `personPts()`
dot-cloud figures with a beacon (`creatures.js` / `makeSurvivor`), which is
what actually reads from an orbital view. The GLB is the **cinematic and
study** asset, and an idle plus a beckon are what it wants: `#astro` shows
the walk, and a rescue's establishing shot is somebody standing still,
waving at a tank on the horizon.

## 2. Open questions for the first play

These are numbers, and they are all in `RESCUE_TUNE` (`src/rescue.js`), so
overruling any of them is one line.

- **`lasers: false`** — the single most consequential ruling. Off, the
  mission is "ram the soft, spend one of your fourteen shells-and-mines on
  each hard one". On, it is a driving exercise. `?lasers=1` refits them.
- **8 shells / 6 mines / 3 hulls.** Fourteen answers for the hard tier
  across the whole mission. Probably tight. Tight is the point, but only
  play says by how much.
- **`grabSecs: 1.5`.** The window to kill a grabber. Long enough to matter,
  short enough to hurt.
- **`boardSecs: 1.0` under a third throttle.** The stop clause. If it feels
  fussy, it is `boardThrottle` that is wrong, not `boardSecs` — a tank
  coasting should probably count as stopped.
- **`lockCells: 2.0`.** How far an enemy peels off the lane for a survivor.
  At wave 1 (8 phage) an unattended beacon went down inside fifteen seconds
  on the auto-pilot, which may be right and may be brutal.
- **Six survivors on sector 1.** The board is 84 open cells; the placer had
  to relax its spacing from 3 cells to 2 to fit them. Fewer, or a bigger
  board, are both legitimate answers.
- **The mission has no timer** — the wave curve is the clock. Deliberate.
