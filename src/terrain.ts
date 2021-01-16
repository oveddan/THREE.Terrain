import { BufferGeometry, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';

import { Optimization, TerrainOptions } from './basicTypes';
import { Linear } from './core';
import { Clamp, Smooth, Step, Turbulence } from './filters';
import { DiamondSquare } from './generators';
import { fromHeightmap } from './images';

/**
 * The terrain class
 */
export function Terrain(givenOptions: Partial<TerrainOptions>) {
  let defaultOptions: TerrainOptions = {
    after: null,
    easing: Linear,
    heightmap: DiamondSquare,
    material: null,
    maxHeight: 100,
    minHeight: -100,
    optimization: Optimization.NONE,
    frequency: 2.5,
    steps: 1,
    stretch: true,
    turbulent: false,
    useBufferGeometry: false,
    xSegments: 63,
    xSize: 1024,
    ySegments: 63,
    ySize: 1024,
  };

  let options: TerrainOptions & { _mesh: Mesh | null }
    = { ...defaultOptions, ...(givenOptions || {}), _mesh: null /* internal, only */ };

  options.material = options.material || new MeshBasicMaterial({ color: 0xee6633 });

  // Encapsulating the terrain in a parent object allows us the flexibility
  // to more easily have multiple meshes for optimization purposes.
  let scene = new Object3D();
  // Planes are initialized on the XY plane, so rotate the plane to make it lie flat.
  scene.rotation.x = -0.5 * Math.PI;

  // Create the terrain mesh.
  // To save memory, it is possible to re-use a pre-existing mesh.
  const { _mesh } = options;
  let mesh: Mesh;
  let geometry: PlaneGeometry;
  if (_mesh && _mesh.geometry.type === 'PlaneGeometry') {
    mesh = _mesh;
    geometry = _mesh.geometry as PlaneGeometry;
    const { parameters, vertices } = geometry;
    if (parameters.widthSegments === options.xSegments &&
      (mesh.geometry as any).parameters.heightSegments === options.ySegments) {
      mesh.material = options.material;
      mesh.scale.x = options.xSize / parameters.width;
      mesh.scale.y = options.ySize / parameters.height;
      for (let i = 0, l = vertices.length; i < l; i++) {
        vertices[i].z = 0;
      }
    }
  }
  else {
    geometry = new PlaneGeometry(options.xSize, options.ySize, options.xSegments, options.ySegments);
    mesh = new Mesh(geometry, options.material);
  }

  //remove the reference for GC
  options._mesh = null;

  // Assign elevation data to the terrain plane from a heightmap or function.
  if (options.heightmap instanceof HTMLCanvasElement || options.heightmap instanceof Image) {
    fromHeightmap(geometry.vertices, options);
  }
  else if (typeof options.heightmap === 'function') {
    options.heightmap(geometry.vertices, options);
  }
  else {
    console.warn('An invalid value was passed for `options.heightmap`: ' + options.heightmap);
  }
  Normalize(mesh, options);

  if (options.useBufferGeometry) {
    mesh.geometry = (new BufferGeometry()).fromGeometry(geometry);
  }

  // lod.addLevel(mesh, options.unit * 10 * Math.pow(2, lodLevel));

  scene.add(mesh);
  return scene;
};

/**
 * Normalize the terrain after applying a heightmap or filter.
 *
 * This applies turbulence, steps, and height clamping; calls the `after`
 * callback; updates normals and the bounding sphere; and marks vertices as
 * dirty.
 *
 * @param {THREE.Mesh} mesh
 *   The terrain mesh.
 * @param {Object} options
 *   A map of settings that control how the terrain is constructed and
 *   displayed. Valid options are the same as for {@link THREE.Terrain}().
 */
export function Normalize(mesh: Mesh, options: TerrainOptions) {
  const geometry = mesh.geometry as PlaneGeometry;
  let v = geometry.vertices;
  if (options.turbulent) {
    Turbulence(v, options);
  }
  if (options.steps && options.steps > 1) {
    Step(v, options.steps);
    Smooth(v, options);
  }
  // Keep the terrain within the allotted height range if necessary, and do easing.
  Clamp(v, options);
  // Call the "after" callback
  if (typeof options.after === 'function') {
    options.after(v, options);
  }
  // Mark the geometry as having changed and needing updates.
  geometry.verticesNeedUpdate = true;
  geometry.normalsNeedUpdate = true;
  geometry.computeBoundingSphere();
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();
};
