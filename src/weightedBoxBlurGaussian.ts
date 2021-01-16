import { TerrainOptions } from "./basicTypes";
import { Vector3 } from "three";
import { fromArray1D, toArray1D } from "./core";

/**
 * Perform Gaussian smoothing on terrain vertices.
 *
 * @param g
 *   The vertex array for plane geometry to modify with heightmap data. This
 *   method sets the `z` property of each vertex.
 * @param options
 *   A map of settings that control how the terrain is constructed and
 *   displayed. Valid values are the same as those for the `options` parameter
 *   of THREE.Terrain
 */
export function GaussianBoxBlur(g: Vector3[], options: TerrainOptions, s: number = 1, n: number = 3) {
  fromArray1D(g, gaussianBoxBlur(
    toArray1D(g),
    options.xSegments + 1,
    options.ySegments + 1,
    s,
    n
  ));
};

/**
 * Approximate a Gaussian blur by performing several weighted box blurs.
 *
 * After this function runs, `tcl` will contain the blurred source channel.
 * This operation also modifies `scl`.
 *
 * Lightly modified from http://blog.ivank.net/fastest-gaussian-blur.html
 * under the MIT license: http://opensource.org/licenses/MIT
 *
 * Other than style cleanup, the main significant change is that the original
 * version was used for manipulating RGBA channels in an image, so it assumed
 * that input and output were integers [0, 255]. This version does not make
 * such assumptions about the input or output values.
 *
 * @param src the source channel.
 * @param w the image width.
 * @param h the image height.
 * @param radius the standard deviation (how much to blur).
 * @param boxCount box blurs to approximate
 * @param target
 *   The target channel. Should be different than the source channel. If not
 *   passed, one is created. This is also the return value.
 *
 * @return An array representing the blurred channel.
 */
function gaussianBoxBlur(src: Float64Array, w: number, h: number, radius: number = 1, boxCount: number = 3, target?: Float64Array) {
  if (typeof target === 'undefined') target = new Float64Array(src.length);
  let boxes = boxesForGauss(radius, boxCount);
  for (let i = 0; i < boxCount; i++) {
    boxBlur(src, target, w, h, (boxes[i] - 1) / 2);
  }
  return target;
}

/**
 * Calculate size of boxes needed to approximate a Gaussian blur
 * 
 * The appropriate box sizes depend on the number of box blur passes required
 * @param sigma standard deviation / blur radius
 * @param boxCount
 */
function boxesForGauss(sigma: number, boxCount: number) {
  // Calculate how far out we need to go to capture the bulk of the distribution.
  let wIdeal = Math.sqrt(12 * sigma * sigma / boxCount + 1); // Ideal averaging filter width
  let wl = Math.floor(wIdeal); // Lower odd integer bound on the width
  if (wl % 2 === 0) wl--;
  let wu = wl + 2; // Upper odd integer bound on the width

  let mIdeal = (12 * sigma * sigma - boxCount * wl * wl - 4 * boxCount * wl - 3 * boxCount) / (-4 * wl - 4);
  let m = Math.round(mIdeal);
  // let sigmaActual = Math.sqrt( (m*wl*wl + (n-m)*wu*wu - n)/12 );

  let sizes = new Int16Array(boxCount);
  for (let i = 0; i < boxCount; i++) { sizes[i] = i < m ? wl : wu; }
  return sizes;
}

/**
 * Uses separable blur methods for efficiency
 *
 * Uses the same parameters as gaussblur().
 */
function boxBlur(scl: Float64Array, tcl: Float64Array, w: number, h: number, r: number) {
  for (let i = 0, l = scl.length; i < l; i++) { tcl[i] = scl[i]; }
  boxBlurH(tcl, scl, w, h, r);
  boxBlurV(scl, tcl, w, h, r);
}

/**
 * Perform a horizontal box blur.
 *
 * Uses the same parameters as gaussblur().
 */
function boxBlurH(scl: Float64Array, tcl: Float64Array, w: number, h: number, r: number) {
  let iarr = 1 / (r + r + 1); // averaging adjustment parameter
  for (let i = 0; i < h; i++) {
    let ti = i * w, // current target index
      li = ti, // current left side of the examined range
      ri = ti + r, // current right side of the examined range
      fv = scl[ti], // first value in the row
      lv = scl[ti + w - 1], // last value in the row
      val = (r + 1) * fv, // target value, accumulated over examined points
      j;
    // Sum the source values in the box
    for (j = 0; j < r; j++) { val += scl[ti + j]; }
    // Compute the target value by taking the average of the surrounding
    // values. This is done by adding the deviations so far and adjusting,
    // accounting for the edges by extending the first and last values.
    for (j = 0; j <= r; j++) { val += scl[ri++] - fv; tcl[ti++] = val * iarr; }
    for (j = r + 1; j < w - r; j++) { val += scl[ri++] - scl[li++]; tcl[ti++] = val * iarr; }
    for (j = w - r; j < w; j++) { val += lv - scl[li++]; tcl[ti++] = val * iarr; }
  }
}

/**
 * Perform a vertical box blur.
 *
 * Uses the same parameters as gaussblur().
 */
function boxBlurV(scl: Float64Array, tcl: Float64Array, w: number, h: number, r: number) {
  let iarr = 1 / (r + r + 1); // averaging adjustment parameter
  for (let i = 0; i < w; i++) {
    let ti = i, // current target index
      li = ti, // current top of the examined range
      ri = ti + r * w, // current bottom of the examined range
      fv = scl[ti], // first value in the column
      lv = scl[ti + w * (h - 1)], // last value in the column
      val = (r + 1) * fv, // target value, accumulated over examined points
      j;
    // Sum the source values in the box
    for (j = 0; j < r; j++) { val += scl[ti + j * w]; }
    // Compute the target value by taking the average of the surrounding
    // values. This is done by adding the deviations so far and adjusting,
    // accounting for the edges by extending the first and last values.
    for (j = 0; j <= r; j++) { val += scl[ri] - fv; tcl[ti] = val * iarr; ri += w; ti += w; }
    for (j = r + 1; j < h - r; j++) { val += scl[ri] - scl[li]; tcl[ti] = val * iarr; li += w; ri += w; ti += w; }
    for (j = h - r; j < h; j++) { val += lv - scl[li]; tcl[ti] = val * iarr; li += w; ti += w; }
  }
}
