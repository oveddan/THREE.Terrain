
import { BufferGeometry, Material, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';

import { Optimization, TerrainOptions } from './basicTypes';
import { Linear } from './core';
import { applyTerrainClamp, applyTerrainSmooth, applyTerrainStep, applyTurbulenceTurbulence } from './filters';
import { DiamondSquare } from './generators';
import { fromHeightmap } from './images';

export const TerrainOptionsDefault: TerrainOptions = {
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
  widthSegments: 63,
  width: 1024,
  heightSegments: 63,
  height: 1024,
  mesh: null
};

/**
 * The terrain class
 */
export class Terrain extends Object3D {
  private widthSegments: number;
  private heightSegments: number;
  private width: number;
  private height: number;

  private mesh: Mesh;
  private material: Material;

  constructor(options: TerrainOptions = TerrainOptionsDefault) {
    super();

    this.widthSegments = options.widthSegments || 31;
    this.heightSegments = options.heightSegments || 31;

    this.width = options.width || 64;
    this.height = options.height || 64;

    this.material = options.material || new MeshBasicMaterial({ color: 0xee6633 });

    this.mesh = options.mesh || new Mesh();

    let geometry: PlaneGeometry;
    if (this.mesh.geometry && this.mesh.geometry.type === "PlaneGeometry") {
      geometry = this.mesh.geometry as PlaneGeometry;  
    }

    if (
      geometry &&
      geometry.parameters.widthSegments === options.widthSegments &&
      geometry.parameters.heightSegments === options.heightSegments
    ) {
      for (let vert of geometry.vertices) {
        vert.z = 0;
      }
    } else {
      geometry = new PlaneGeometry(
        options.width,
        options.height,
        options.widthSegments,
        options.heightSegments
      );
      this.mesh.geometry = geometry;
    }
    this.mesh.material = this.material;

    //perform height mapping
    if ( typeof(options.heightmap) === "object") {
      fromHeightmap(geometry.vertices, options);
    } else if ( typeof(options.heightmap) === "function") {
      options.heightmap(geometry.vertices, options);
    }
    normalizeTerrain(geometry, options);

    if (options.useBufferGeometry) {
      this.mesh.geometry = (new BufferGeometry()).fromGeometry(geometry);
    }

    this.add(this.mesh);
  }
  getWidth(): number {
    return this.width;
  }
  getHeight(): number {
    return this.height;
  }
  setMaterial(material: Material): this {
    this.material = material;
    this.mesh.material = material;
    return this;
  }
  getMaterial(): Material {
    return this.material;
  }
  getMesh (): Mesh {
    return this.mesh;
  }
}

/**
 * Normalize the terrain after applying a heightmap or filter.
 *
 * This applies turbulence, steps, and height clamping; calls the `after`
 * callback; updates normals and the bounding sphere; and marks vertices as
 * dirty.
 *
 * @param mesh the terrain mesh.
 * @param options
 * A map of settings that control how the terrain is constructed and
 * displayed
 */
export function normalizeTerrain(geometry: PlaneGeometry, options: TerrainOptions) {
  let verticies = geometry.vertices;

  if (options.turbulent) {
    applyTurbulenceTurbulence(verticies, options);
  }
  if (options.steps && options.steps > 1) {
    applyTerrainStep(verticies, options.steps);
    applyTerrainSmooth(verticies, options);
  }
  // Keep the terrain within the allotted height range if necessary, and do easing.
  applyTerrainClamp(verticies, options);
  // Call the "after" callback
  if (typeof options.after === 'function') {
    options.after(verticies, options);
  }
  
  // Mark the geometry as having changed and needing updates.
  geometry.verticesNeedUpdate = true;
  geometry.normalsNeedUpdate = true;
  geometry.computeBoundingSphere();
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();
};
