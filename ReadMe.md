# THREE.Terrain

This branch modifies a [pull-request](https://github.com/mattes3/THREE.Terrain) by [mattes3@github](https://github.com/mattes3)

for my own use case, though it should be applicable to anyone using:

three.js imported by npm, javascript/typescript

This is a procedural terrain generation lib for [three.js](https://github.com/mrdoob/three.js)

[Live demo](https://repcomm.github.io/THREE.Terrain)

## Usage
Depends on [three.js](https://github.com/mrdoob/three.js)

`npm install @repcomm/three.terrain`

```javascript
import { Mesh, MeshBasicMaterial, Scene, CylinderGeometry } from "three";
import { Terrain, generateBlendedMaterial, scatterMeshes } from "@repcomm/three.terrain";

let intervals = 63;

const terrain = new Terrain({
  material: new MeshStandardMaterial({
    color: 0x44dd66,
  }),
  easing: EaseInWeak,
  heightmap: DiamondSquare,
  maxHeight: 250,
  minHeight: -100,
  steps: 0,
  useBufferGeometry: false,
  widthSegments: intervals,
  width: 1024,
  heightSegments: intervals,
  height: 1024
});

const scene = new Scene();

scene.add(terrain);

let decorations = scatterMeshes (
  terrain.children[0].geometry, {
    mesh: new Mesh(new CylinderGeometry(2, 2, 12, 6)),
    w: xS,
    h: yS,
    spread: 0.02,
    randomness: Math.random,
});
terrain.add(decorations);
```

### Dynamic Terrain Materials
```javascript
const material = generateBlendedMaterial([
  // The first texture is the base; other textures are blended in on top.
  {texture: t1},
  // Start blending in at height -80; opaque between -35 and 20; blend out by 50
  {texture: t2, levels: [-80, -35, 20, 50]},
  {texture: t3, levels: [20, 50, 60, 85]},
  // How quickly this texture is blended in depends on its x-position.
  {texture: t4, glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)'},
  // Use this texture if the slope is between 27 and 45 degrees
  {texture: t3, glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2'},
]);
```
