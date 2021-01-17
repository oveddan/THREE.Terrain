import { Vector3 } from "three";
import { TerrainOptions } from "./basicTypes";

/**
 * Convert an image-based heightmap into vertex-based height data.
 * @param verts
 * The vertex array for plane geometry to modify with heightmap data. This
 * method sets the `z` property of each vertex.
 * @param options
 * A map of settings that control how the terrain is constructed and
 * displayed
 */
export function fromHeightmap(verts: Vector3[], options: TerrainOptions) {
  const renderer = new OffscreenCanvas(
    options.widthSegments,
    options.heightSegments
  );

  const ctx = renderer.getContext("2d");

  const spread = options.maxHeight - options.minHeight;

  ctx.drawImage(
    options.heightmap as CanvasImageSource,
    0, 0,
    renderer.width, renderer.height
  );

  let imgdata = ctx.getImageData(0, 0, renderer.width, renderer.height);
  let data = imgdata.data;

  let vertIndex = 0;
  let pixelIndex = 0;

  let vert: Vector3;

  for (let x = 0; x < imgdata.width; x++) {
    for (let y = 0; y < imgdata.height; y++) {
      vertIndex = x * imgdata.height + y;
      pixelIndex = vertIndex * 4;
      
      vert = verts[vertIndex];

      //first implementation, doesn't make full use of bit depth
      // vert.z = (
      //   data[pixelIndex] +
      //   data[pixelIndex + 1] +
      //   data[pixelIndex + 2]
      // ) / 765 * spread + options.minHeight;

      //repcomm implementation, takes full advantage of bit depth
      //bit shifts the channels, essentially reading a 3 byte integer
      //note: alpha channel is left unused.. maybe use this for something in the future
      vert.z = (
        (data[pixelIndex + 0] << 16) +
        (data[pixelIndex + 1] <<  8) +
        (data[pixelIndex + 2]      )
      ) / 0xffffff * spread + options.minHeight;
    }
  }
};

/**
 * Convert a terrain plane into an image-based heightmap.
 *
 * Parameters are the same as for {@link THREE.Terrain.fromHeightmap} except
 * that if `options.heightmap` is a canvas element then the image will be
 * painted onto that canvas; otherwise a new canvas will be created.
 *
 * NOTE: this method performs an operation on an array of vertices, which
 * aren't available when using `BufferGeometry`. So, if you want to use this
 * method, make sure to set the `useBufferGeometry` option to `false` when
 * generating your terrain.
 *
 * @return {HTMLCanvasElement}
 *   A canvas with the relevant heightmap painted on it.
 */
export function toHeightmap(g: Vector3[], options: TerrainOptions) {
  let hasMax = typeof options.maxHeight !== 'undefined',
    hasMin = typeof options.minHeight !== 'undefined',
    max = hasMax ? options.maxHeight : -Infinity,
    min = hasMin ? options.minHeight : Infinity;
  if (!hasMax || !hasMin) {
    let max2 = max,
      min2 = min;
    for (let k = 0, l = g.length; k < l; k++) {
      if (g[k].z > max2) max2 = g[k].z;
      if (g[k].z < min2) min2 = g[k].z;
    }
    if (!hasMax) max = max2;
    if (!hasMin) min = min2;
  }
  let canvas = options.heightmap instanceof HTMLCanvasElement ? options.heightmap : document.createElement('canvas'),
    context = canvas.getContext('2d'),
    rows = options.heightSegments + 1,
    cols = options.widthSegments + 1,
    spread = max - min;
  canvas.width = cols;
  canvas.height = rows;
  let d = context!.createImageData(canvas.width, canvas.height),
    data = d.data;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let i = row * cols + col,
        idx = i * 4;
      data[idx] = data[idx + 1] = data[idx + 2] = Math.round(((g[i].z - min) / spread) * 255);
      data[idx + 3] = 255;
    }
  }
  context!.putImageData(d, 0, 0);
  return canvas;
};
