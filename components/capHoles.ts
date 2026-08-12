import * as THREE from 'three';

// The hologram GLB is an XPS rip whose meshes are not watertight: several
// surfaces stop at an open rim instead of closing over. Most of those rims are
// buried where two body parts interpenetrate (the torso's armhole, the elbow
// sockets the gauntlet slides into) and never show, but two per hand sit on the
// underside of the gauntlet where the palm should be, and the shoulder/forearm
// rims poke out during the idle animation. Because the materials are
// DoubleSide, an open rim doesn't read as a silhouette gap — you see the unlit
// inner wall of the part through it, which looks like a solid black void.
//
// Rather than re-authoring the asset, close every open rim at load time. Each
// boundary loop is triangulated with the existing rim vertices (ear clipping on
// the loop's best-fit plane), so no new vertices are invented and every cap
// vertex keeps a UV, normal, tangent and skin binding that the source mesh
// already had. Caps therefore texture like the rim around them and deform with
// the same bones instead of tearing loose when the skeleton moves.

const QUANT = 1e4;

/** Maps every vertex to the lowest index sharing its position (UV seams split otherwise-shared vertices). */
function buildWeldMap(pos: THREE.BufferAttribute): Int32Array {
  const rep = new Int32Array(pos.count);
  const seen = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * QUANT)},${Math.round(pos.getY(i) * QUANT)},${Math.round(pos.getZ(i) * QUANT)}`;
    const first = seen.get(key);
    if (first === undefined) {
      seen.set(key, i);
      rep[i] = i;
    } else {
      rep[i] = first;
    }
  }
  return rep;
}

/**
 * Finds each open rim and returns it as an ordered ring of original (un-welded)
 * vertex indices. The ring is walked against the direction the owning triangle
 * used, which is the direction a cap must run to end up wound like the rest of
 * the surface.
 */
function findBoundaryLoops(index: THREE.BufferAttribute, rep: Int32Array): number[][] {
  const edgeKey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);

  const useCount = new Map<string, number>();
  for (let t = 0; t < index.count; t += 3) {
    const w = [rep[index.getX(t)], rep[index.getX(t + 1)], rep[index.getX(t + 2)]];
    for (let e = 0; e < 3; e++) {
      const key = edgeKey(w[e], w[(e + 1) % 3]);
      useCount.set(key, (useCount.get(key) ?? 0) + 1);
    }
  }

  // An edge used by a single triangle is a rim. Store it reversed, keyed by the
  // welded vertex the cap enters from, along with the original index to emit.
  // A vertex can sit on several rims at once (the mesh pinches there), so keep
  // every half-edge and consume them one at a time rather than keying by vertex.
  const outgoing = new Map<number, { to: number; emit: number; used: boolean }[]>();
  for (let t = 0; t < index.count; t += 3) {
    const orig = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    const w = orig.map((i) => rep[i]);
    for (let e = 0; e < 3; e++) {
      const a = w[e];
      const b = w[(e + 1) % 3];
      if (useCount.get(edgeKey(a, b)) === 1) {
        const list = outgoing.get(b) ?? [];
        list.push({ to: a, emit: orig[(e + 1) % 3], used: false });
        outgoing.set(b, list);
      }
    }
  }

  const takeUnused = (from: number) => outgoing.get(from)?.find((e) => !e.used);

  const loops: number[][] = [];
  for (const [start, edges] of outgoing) {
    for (let i = 0; i < edges.length; i++) {
      if (edges[i].used) continue;
      const loop: number[] = [];
      let step: typeof edges[number] | undefined = edges[i];
      let cur = start;
      while (step && !step.used) {
        step.used = true;
        loop.push(step.emit);
        cur = step.to;
        if (cur === start) break;
        step = takeUnused(cur);
      }
      // Only closed rings can be capped; a broken walk means a torn rim.
      if (loop.length >= 3 && cur === start) loops.push(loop);
    }
  }
  return loops;
}

/** Triangulates one rim, returning triples of original vertex indices. */
function triangulateLoop(loop: number[], pos: THREE.BufferAttribute): number[][] {
  const fan = () => {
    const out: number[][] = [];
    for (let i = 1; i < loop.length - 1; i++) out.push([loop[0], loop[i], loop[i + 1]]);
    return out;
  };
  if (loop.length === 3) return [[loop[0], loop[1], loop[2]]];

  // Newell's method gives a stable normal for the (possibly non-planar) rim.
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < loop.length; i++) {
    p.fromBufferAttribute(pos, loop[i]);
    q.fromBufferAttribute(pos, loop[(i + 1) % loop.length]);
    n.x += (p.y - q.y) * (p.z + q.z);
    n.y += (p.z - q.z) * (p.x + q.x);
    n.z += (p.x - q.x) * (p.y + q.y);
  }
  if (n.lengthSq() < 1e-20) return fan();
  n.normalize();

  // Basis with u x v == n, so counter-clockwise in (u,v) means facing +n and
  // the 3D winding of a triangle follows its 2D winding.
  const u = new THREE.Vector3(1, 0, 0);
  if (Math.abs(n.x) > 0.9) u.set(0, 1, 0);
  u.crossVectors(u, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u);

  const contour = loop.map((vi) => {
    p.fromBufferAttribute(pos, vi);
    return new THREE.Vector2(p.dot(u), p.dot(v));
  });

  const signedArea = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2) =>
    (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);

  let loopArea = 0;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i];
    const b = contour[(i + 1) % contour.length];
    loopArea += a.x * b.y - b.x * a.y;
  }
  if (Math.abs(loopArea) < 1e-12) return fan();

  let faces: number[][];
  try {
    faces = THREE.ShapeUtils.triangulateShape(contour, []);
  } catch {
    return fan();
  }
  if (!faces.length) return fan();

  // triangulateShape normalises winding, so restore each triangle to the
  // contour's own orientation before mapping back to 3D.
  return faces.map(([i, j, k]) => {
    const flip = Math.sign(signedArea(contour[i], contour[j], contour[k])) !== Math.sign(loopArea);
    return flip ? [loop[i], loop[k], loop[j]] : [loop[i], loop[j], loop[k]];
  });
}

/**
 * Closes every open rim in the geometry in place. Returns the number of
 * triangles added. Safe to call twice — the second call is a no-op.
 */
export function capBoundaryHoles(geometry: THREE.BufferGeometry): number {
  if (geometry.userData.holesCapped) return 0;
  geometry.userData.holesCapped = true;

  const index = geometry.getIndex();
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!index || !pos) return 0;

  const loops = findBoundaryLoops(index as THREE.BufferAttribute, buildWeldMap(pos));
  if (!loops.length) return 0;

  const added: number[] = [];
  for (const loop of loops) {
    // A rim this long is a mesh-wide seam rather than a hole; a flat cap across
    // it would be more conspicuous than leaving it be.
    if (loop.length > 64) continue;
    for (const tri of triangulateLoop(loop, pos)) added.push(tri[0], tri[1], tri[2]);
  }
  if (!added.length) return 0;

  const merged = new Uint32Array(index.count + added.length);
  for (let i = 0; i < index.count; i++) merged[i] = index.getX(i);
  merged.set(added, index.count);
  geometry.setIndex(new THREE.BufferAttribute(merged, 1));
  geometry.computeBoundingSphere();

  return added.length / 3;
}
